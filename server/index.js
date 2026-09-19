import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { openStore, audit } from "./store.js";
import {
  seal,
  unseal,
  decryptCallback,
  validateResponseUrl,
} from "./crypto.js";
import { Connections } from "./connections.js";
import { complete } from "./model.js";

const production = process.env.NODE_ENV === "production";
const password = process.env.ADMIN_PASSWORD || "";
if (
  password.length < 16 ||
  !/^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY || "")
)
  throw new Error("请先运行 npm run setup，配置管理员密码和加密密钥");
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
const publicUrl = new URL(process.env.PUBLIC_URL || "http://localhost:5173");
if (production && publicUrl.protocol !== "https:")
  throw new Error("生产环境 PUBLIC_URL 必须使用 HTTPS");
const db = openStore(process.env.DATA_DIR || "./data");
const app = express(),
  sessions = new Map();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: production
      ? undefined
      : { directives: { upgradeInsecureRequests: null } },
    strictTransportSecurity: production ? undefined : false,
  }),
);
app.use(express.json({ limit: "1mb" }));
const log = (action, detail) => audit(db, action, detail);
const credentials = (bot) => unseal(bot.credentials, key);
const defaultModel = {
  enabled: false,
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  prompt:
    "你是企业内部的智能助手。请使用简洁、准确的中文回答。对于不确定的信息请明确说明，不要编造。",
};
function modelConfig() {
  const row = db.prepare("SELECT value FROM settings WHERE id='model'").get();
  return row ? unseal(row.value, key) : defaultModel;
}
function receive(bot, body, reqId = "") {
  if (!body || typeof body.msgid !== "string") return;
  if (body.aibotid && body.aibotid !== bot.bot_id)
    throw new Error("机器人身份不匹配");
  const response =
    bot.mode === "url" && body.response_url
      ? validateResponseUrl(body.response_url)
      : null;
  const now = new Date().toISOString();
  const canReply =
    bot.mode === "url"
      ? Boolean(response)
      : body.msgtype !== "event" && Boolean(reqId);
  const content =
    body.text?.content ||
    body.voice?.content ||
    (body.event
      ? `事件：${body.event.eventtype}`
      : `[${body.msgtype || "未知"} 消息]`);
  db.prepare(
    "INSERT OR IGNORE INTO messages (id,bot_id,external_id,req_id,kind,sender,chat_id,chat_type,content,response_url,expires_at,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    randomUUID(),
    bot.id,
    body.msgid,
    reqId,
    body.msgtype || "unknown",
    body.from?.userid || "",
    body.chatid || body.from?.userid || "",
    body.chattype || "single",
    String(content).slice(0, 30000),
    response ? seal(response, key) : null,
    canReply
      ? new Date(
          Date.now() + (bot.mode === "url" ? 3600000 : 86400000),
        ).toISOString()
      : null,
    canReply ? "pending" : "received",
    now,
  );
  if (canReply && body.msgtype === "text" && modelConfig().enabled) {
    const m = db
      .prepare(
        "SELECT id,status FROM messages WHERE bot_id=? AND external_id=?",
      )
      .get(bot.id, body.msgid);
    if (m.status === "pending")
      db.prepare("INSERT OR IGNORE INTO jobs VALUES (?,'queued',NULL,?)").run(
        m.id,
        now,
      );
  }
}
const connections = new Connections({ receive, credentials, log });
const findBot = (id) => db.prepare("SELECT * FROM bots WHERE id=?").get(id);
function botView(bot) {
  const { credentials: secret, ...view } = bot;
  return {
    ...view,
    enabled: Boolean(bot.enabled),
    status: !bot.enabled
      ? "disabled"
      : bot.mode === "url"
        ? bot.verified_at
          ? "verified"
          : "unverified"
        : connections.status(bot.id),
    callbackUrl: `${publicUrl.origin}/callbacks/wecom?bot=${bot.id}`,
  };
}
app.get("/api/health", (_req, res) => res.json({ ok: true }));
const loginLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "登录尝试过多，请稍后重试" },
});
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.method === "POST" && req.headers.origin !== publicUrl.origin)
    return res.status(403).json({ error: "请求来源不合法" });
  next();
});
app.post("/api/login", loginLimit, (req, res) => {
  const supplied = createHash("sha256")
    .update(String(req.body?.password || ""))
    .digest();
  const expected = createHash("sha256").update(password).digest();
  if (!timingSafeEqual(supplied, expected))
    return res.status(401).json({ error: "管理员密码不正确" });
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, Date.now() + 8 * 3600000);
  res.cookie("bridge_session", token, {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    maxAge: 8 * 3600000,
    path: "/",
  });
  log("管理员登录", "控制台");
  res.json({ ok: true });
});
function auth(req, res, next) {
  const token = /(?:^|;\s*)bridge_session=([^;]+)/.exec(
    req.headers.cookie || "",
  )?.[1];
  if (!token || (sessions.get(token) || 0) < Date.now())
    return res.status(401).json({ error: "请先登录控制台" });
  req.sessionToken = token;
  next();
}
app.post("/api/logout", auth, (req, res) => {
  sessions.delete(req.sessionToken);
  res.clearCookie("bridge_session", { path: "/" });
  res.json({ ok: true });
});
app.get("/api/me", auth, (_req, res) => res.json({ name: "管理员" }));
app.get("/api/overview", auth, (_req, res) => {
  const bots = db
    .prepare("SELECT * FROM bots ORDER BY created_at DESC")
    .all()
    .map(botView);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totals = db
    .prepare(
      "SELECT count(*) AS total, sum(status='pending' AND expires_at>?) AS pending, sum(status='replied') AS replied, sum(status='unknown') AS unknown FROM messages WHERE created_at>=?",
    )
    .get(new Date().toISOString(), today.toISOString());
  const trend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    date.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count: db
        .prepare(
          "SELECT count(*) AS n FROM messages WHERE created_at>=? AND created_at<?",
        )
        .get(date.toISOString(), end.toISOString()).n,
    };
  });
  res.json({
    bots,
    totals,
    trend,
    deployment: {
      mode: "单实例",
      database: "SQLite · WAL",
      version: "0.1.0",
      uptime: Math.floor(process.uptime()),
      publicUrl: publicUrl.origin,
    },
  });
});
app.get("/api/model", auth, (_req, res) => {
  const { apiKey, ...c } = modelConfig();
  res.json({ ...c, hasKey: Boolean(apiKey) });
});
const modelSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.url().max(500),
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().max(1000).optional(),
  prompt: z.string().trim().min(1).max(10000),
});
app.post("/api/model/save", auth, (req, res) => {
  const c = modelSchema.parse(req.body),
    previous = modelConfig();
  const u = new URL(c.baseUrl);
  if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash)
    return res
      .status(400)
      .json({
        error: "请填写 HTTPS 模型基础地址，例如 https://api.openai.com/v1",
      });
  c.apiKey = c.apiKey || previous.apiKey;
  if (!c.apiKey) return res.status(400).json({ error: "请填写模型 API Key" });
  db.prepare(
    "INSERT INTO settings VALUES ('model',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
  ).run(seal(c, key));
  log("更新 AI 配置", c.enabled ? "已开启自动回复" : "已关闭自动回复");
  res.json({ ok: true });
});
const modelTestLimit = rateLimit({
  windowMs: 60000,
  limit: 3,
  message: { error: "模型测试过于频繁，请稍后再试" },
});
app.post("/api/model/test", auth, modelTestLimit, async (_req, res) => {
  try {
    const c = modelConfig();
    if (!c.apiKey) return res.status(400).json({ error: "请先保存模型配置" });
    const reply = await complete(c, "请仅回复：连接成功");
    res.json({ reply });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
app.get("/api/bots", auth, (req, res) => {
  const p = pagination(req),
    search = `%${String(req.query.search || "").slice(0, 100)}%`,
    mode = String(req.query.mode || "");
  const where = "WHERE (name LIKE ? OR bot_id LIKE ?) AND (?='' OR mode=?)",
    args = [search, search, mode, mode];
  res.json({
    rows: db
      .prepare(
        `SELECT * FROM bots ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...args, p.size, p.offset)
      .map(botView),
    total: db.prepare(`SELECT count(*) AS n FROM bots ${where}`).get(...args).n,
    page: p.page,
    pageSize: p.size,
  });
});
const botSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(50),
  mode: z.enum(["url", "websocket"]),
  botId: z.string().trim().min(1).max(200),
  token: z.string().max(256).optional(),
  aesKey: z.string().max(43).optional(),
  secret: z.string().max(512).optional(),
});
app.post("/api/bots/save", auth, (req, res) => {
  const v = botSchema.parse(req.body),
    old = v.id ? findBot(v.id) : null;
  if (v.id && !old) return res.status(404).json({ error: "机器人不存在" });
  if (old?.enabled)
    return res.status(409).json({ error: "请先停用机器人再修改配置" });
  const sameMode = old?.mode === v.mode;
  const previous = sameMode ? credentials(old) : {};
  const c =
    v.mode === "url"
      ? {
          token: v.token || previous.token,
          aesKey: v.aesKey || previous.aesKey,
        }
      : { secret: v.secret || previous.secret };
  if (
    v.mode === "url" &&
    (!c.token ||
      !/^[a-zA-Z0-9]{3,32}$/.test(c.token) ||
      !/^[a-zA-Z0-9+/]{43}$/.test(c.aesKey || ""))
  )
    return res
      .status(400)
      .json({
        error:
          "Token 需为 3–32 位字母或数字，EncodingAESKey 需为 43 位 Base64 字符",
      });
  if (v.mode === "websocket" && !c.secret)
    return res.status(400).json({ error: "请填写长连接 Secret" });
  const id = old?.id || randomUUID();
  db.prepare(
    "INSERT INTO bots (id,name,mode,bot_id,credentials,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,mode=excluded.mode,bot_id=excluded.bot_id,credentials=excluded.credentials,verified_at=NULL",
  ).run(id, v.name, v.mode, v.botId, seal(c, key), new Date().toISOString());
  if (old) {
    db.prepare(
      "UPDATE messages SET expires_at=? WHERE bot_id=? AND status='pending'",
    ).run(new Date().toISOString(), id);
    db.prepare(
      "UPDATE jobs SET status='failed',error='机器人配置已变更' WHERE status='queued' AND message_id IN (SELECT id FROM messages WHERE bot_id=?)",
    ).run(id);
  }
  log(old ? "修改机器人" : "创建机器人", v.name);
  res.json(botView(findBot(id)));
});
app.post("/api/bots/toggle", auth, (req, res) => {
  const v = z
      .object({ id: z.string().uuid(), enabled: z.boolean() })
      .parse(req.body),
    bot = findBot(v.id);
  if (!bot) return res.status(404).json({ error: "机器人不存在" });
  if (Boolean(bot.enabled) === v.enabled) return res.json(botView(bot));
  db.prepare("UPDATE bots SET enabled=? WHERE id=?").run(
    v.enabled ? 1 : 0,
    v.id,
  );
  if (v.enabled && bot.mode === "websocket") connections.start(bot);
  else connections.stop(bot.id);
  log(v.enabled ? "启用机器人" : "停用机器人", bot.name);
  res.json(botView(findBot(v.id)));
});
function pagination(req) {
  const page = Math.max(1, Math.min(100000, parseInt(req.query.page) || 1));
  return { page, size: 15, offset: (page - 1) * 15 };
}
app.get("/api/messages", auth, (req, res) => {
  const p = pagination(req),
    search = `%${String(req.query.search || "").slice(0, 100)}%`;
  const bot = String(req.query.bot || "");
  const where =
    "WHERE (m.content LIKE ? OR m.sender LIKE ?) AND (?='' OR m.bot_id=?)";
  const args = [search, search, bot, bot];
  const rows = db
    .prepare(
      `SELECT m.id,m.bot_id,m.kind,m.sender,m.chat_id,m.chat_type,m.content,m.expires_at,m.status,m.reply,m.created_at,(SELECT status FROM jobs WHERE message_id=m.id) AS ai_status,(SELECT error FROM jobs WHERE message_id=m.id) AS ai_error,b.name AS bot_name,b.mode FROM messages m JOIN bots b ON b.id=m.bot_id ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...args, p.size, p.offset);
  res.json({
    rows: rows.map((m) => ({
      ...m,
      status:
        m.status === "pending" && m.expires_at < new Date().toISOString()
          ? "expired"
          : m.status,
    })),
    total: db
      .prepare(`SELECT count(*) AS n FROM messages m ${where}`)
      .get(...args).n,
    page: p.page,
    pageSize: p.size,
  });
});
async function sendReply(v) {
  const m = db.prepare("SELECT * FROM messages WHERE id=?").get(v.id);
  if (!m) throw new Error("消息不存在");
  const bot = findBot(m.bot_id);
  if (!bot.enabled) throw new Error("机器人已停用");
  if (!m.expires_at || m.expires_at <= new Date().toISOString())
    throw new Error("该消息不可回复或已超时");
  if (bot.mode === "websocket" && connections.status(bot.id) !== "connected")
    throw new Error("长连接未就绪");
  if (bot.mode === "websocket") {
    const counts = db
      .prepare(
        "SELECT count(*) AS hour, sum(created_at>=?) AS minute FROM deliveries WHERE bot_id=? AND chat_id=? AND created_at>=?",
      )
      .get(
        new Date(Date.now() - 60000).toISOString(),
        bot.id,
        m.chat_id,
        new Date(Date.now() - 3600000).toISOString(),
      );
    if (counts.hour >= 1000 || counts.minute >= 30)
      throw new Error("已达到会话发送频率限制，请稍后再试");
  }
  const claimed = db
    .prepare(
      "UPDATE messages SET status='sending',reply=? WHERE id=? AND status='pending'",
    )
    .run(v.content, v.id);
  if (!claimed.changes) throw new Error("该消息已回复或正在发送，不能重复提交");
  db.prepare("INSERT INTO deliveries VALUES (?,?,?,?)").run(
    randomUUID(),
    bot.id,
    m.chat_id,
    new Date().toISOString(),
  );
  try {
    const body = { msgtype: "markdown", markdown: { content: v.content } };
    if (bot.mode === "url") {
      const response = await fetch(
        validateResponseUrl(unseal(m.response_url, key)),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        },
      );
      const result = await response.json();
      if (!response.ok || result.errcode !== 0)
        throw new Error("企业微信未确认消息发送成功");
    } else
      await connections.request(bot.id, "aibot_respond_msg", body, m.req_id);
    db.prepare(
      "UPDATE messages SET status='replied',response_url=NULL WHERE id=?",
    ).run(v.id);
    log("回复消息", `${bot.name} · ${v.id}`);
  } catch {
    db.prepare(
      "UPDATE messages SET status='unknown',response_url=NULL WHERE id=?",
    ).run(v.id);
    log("消息发送结果未确认", `${bot.name} · ${v.id}`);
    throw new Error("未收到成功确认，请到企业微信核实；该消息不会自动重试。");
  }
}
app.post("/api/messages/reply", auth, async (req, res) => {
  const v = z
    .object({
      id: z.string().uuid(),
      content: z
        .string()
        .trim()
        .min(1)
        .refine(
          (s) => Buffer.byteLength(s) <= 20480,
          "回复不能超过 20480 字节",
        ),
    })
    .parse(req.body);
  try {
    await sendReply(v);
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});
let activeJobs = 0;
const worker = setInterval(async () => {
  if (activeJobs >= 2 || !modelConfig().enabled) return;
  const candidates = db
    .prepare(
      "SELECT j.message_id,m.content,m.status,m.expires_at,b.enabled,b.mode,b.id AS bot_id FROM jobs j JOIN messages m ON m.id=j.message_id JOIN bots b ON b.id=m.bot_id WHERE j.status='queued' ORDER BY j.created_at LIMIT 100",
    )
    .all();
  const job = candidates.find(
    (j) =>
      j.status !== "pending" ||
      j.expires_at < new Date().toISOString() ||
      !j.enabled ||
      j.mode === "url" ||
      connections.status(j.bot_id) === "connected",
  );
  if (!job) return;
  if (
    job.status !== "pending" ||
    job.expires_at < new Date().toISOString() ||
    !job.enabled
  ) {
    db.prepare(
      "UPDATE jobs SET status='failed',error='消息过期、机器人停用或已人工处理' WHERE message_id=?",
    ).run(job.message_id);
    return;
  }
  if (
    job.mode === "websocket" &&
    connections.status(job.bot_id) !== "connected"
  )
    return;
  if (
    !db
      .prepare(
        "UPDATE jobs SET status='running' WHERE message_id=? AND status='queued'",
      )
      .run(job.message_id).changes
  )
    return;
  activeJobs++;
  try {
    const content = await complete(modelConfig(), job.content);
    if (!modelConfig().enabled) throw new Error("自动回复已关闭");
    await sendReply({ id: job.message_id, content });
    db.prepare("UPDATE jobs SET status='done' WHERE message_id=?").run(
      job.message_id,
    );
  } catch (e) {
    db.prepare(
      "UPDATE jobs SET status='failed',error=? WHERE message_id=?",
    ).run(e.message, job.message_id);
    log("AI 自动回复失败", job.message_id);
  } finally {
    activeJobs--;
  }
}, 1000);
worker.unref();
app.get("/api/audit", auth, (req, res) => {
  const p = pagination(req);
  res.json({
    rows: db
      .prepare("SELECT * FROM audit ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(p.size, p.offset),
    total: db.prepare("SELECT count(*) AS n FROM audit").get().n,
    page: p.page,
    pageSize: p.size,
  });
});
app.all("/callbacks/wecom", (req, res) => {
  try {
    if (!["GET", "POST"].includes(req.method)) return res.sendStatus(405);
    const bot = findBot(String(req.query.bot || ""));
    if (!bot || !bot.enabled || bot.mode !== "url") return res.sendStatus(404);
    const plaintext = decryptCallback(
      credentials(bot),
      req.query,
      req.method === "GET" ? req.query.echostr : req.body?.encrypt,
    );
    if (req.method === "GET") {
      db.prepare("UPDATE bots SET verified_at=? WHERE id=?").run(
        new Date().toISOString(),
        bot.id,
      );
      log("回调 URL 验证成功", bot.name);
      return res.type("text/plain").send(plaintext);
    }
    receive(bot, JSON.parse(plaintext));
    res.status(200).end();
  } catch {
    res.status(400).json({ error: "回调校验失败" });
  }
});
app.use("/api", (_req, res) => res.status(404).json({ error: "接口不存在" }));
if (existsSync(resolve("dist/index.html"))) {
  app.use(express.static("dist"));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
}
app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({ error: err.issues[0]?.message || "输入格式不正确" });
  if (
    err.code?.startsWith("SQLITE_CONSTRAINT") ||
    String(err.message).includes("UNIQUE constraint")
  )
    return res.status(409).json({ error: "该 BotID 已配置，请勿重复添加" });
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large")
    return res.status(400).json({ error: "请求正文格式不正确或过大" });
  res.status(500).json({ error: "操作失败，请检查服务器配置" });
});
const sessionCleanup = setInterval(() => {
  for (const [token, expires] of sessions)
    if (expires < Date.now()) sessions.delete(token);
}, 60000);
sessionCleanup.unref();
const server = app.listen(
  Number(process.env.PORT || 3100),
  process.env.HOST || "127.0.0.1",
  () => {
    for (const bot of db
      .prepare("SELECT * FROM bots WHERE enabled=1 AND mode='websocket'")
      .all())
      connections.start(bot);
    console.log(`企微桥服务已启动，端口 ${process.env.PORT || 3100}`);
  },
);
function shutdown() {
  clearInterval(worker);
  connections.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
