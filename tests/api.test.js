import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fixture } from "./helpers/fixture.js";

test("真实 HTTP：认证、配置、回调验证、重复消息排重、分页和密钥脱敏", async (t) => {
  const probe = createServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const dir = mkdtempSync(join(tmpdir(), "bridge-test-")),
    origin = `http://127.0.0.1:${port}`,
    pass = randomBytes(24).toString("hex");
  const child = spawn(
    process.execPath,
    ["--import", "./tests/helpers/mock-provider.js", "server/index.js"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
        PUBLIC_URL: origin,
        NODE_ENV: "test",
        ADMIN_PASSWORD: pass,
        ENCRYPTION_KEY: randomBytes(32).toString("hex"),
        DATA_DIR: dir,
      },
      stdio: "ignore",
    },
  );
  t.after(async () => {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
    rmSync(dir, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(30);
  }
  assert.equal(ready, true);
  let cookie = "";
  const req = async (path, body) => {
    const r = await fetch(origin + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json(), headers: r.headers };
  };
  assert.equal((await req("/api/bots")).status, 401);
  assert.equal((await req("/api/login", { password: "wrong" })).status, 401);
  const login = await req("/api/login", { password: pass });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  const f = fixture("verification");
  const created = await req("/api/bots/save", {
    name: "测试机器人",
    mode: "url",
    botId: "test-bot",
    ...f.credentials,
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.credentials, undefined);
  const id = created.body.id;
  assert.equal(
    (
      await req("/api/bots/save", {
        name: "重复",
        mode: "url",
        botId: "test-bot",
        ...f.credentials,
      })
    ).status,
    409,
  );
  assert.equal(
    (await req("/api/bots/toggle", { id, enabled: true })).status,
    200,
  );
  const verify = new URLSearchParams({
    bot: id,
    ...f.query,
    echostr: f.encrypted,
  });
  const verified = await fetch(origin + "/callbacks/wecom?" + verify);
  assert.equal(await verified.text(), "verification");
  assert.equal((await req("/api/bots")).body.rows[0].status, "verified");
  const message = {
    msgid: "message-1",
    aibotid: "test-bot",
    msgtype: "text",
    text: { content: "你好，测试" },
    from: { userid: "alice" },
    response_url:
      "https://qyapi.weixin.qq.com/cgi-bin/aibot/response?response_code=private-code",
  };
  const enc = fixture(
    JSON.stringify(message),
    f.credentials.token,
    Buffer.from(f.credentials.aesKey + "=", "base64"),
  );
  const query = new URLSearchParams({ bot: id, ...enc.query });
  for (let i = 0; i < 2; i++) {
    const response = await fetch(origin + "/callbacks/wecom?" + query, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encrypt: enc.encrypted }),
    });
    assert.equal(response.status, 200);
  }
  const messages = await req("/api/messages");
  assert.equal(messages.body.total, 1);
  assert.equal(messages.body.rows[0].content, "你好，测试");
  assert.equal(messages.body.rows[0].response_url, undefined);
  assert.equal((await req("/api/messages?search=不存在")).body.total, 0);
  const blocked = await fetch(origin + "/api/bots/toggle", {
    method: "POST",
    headers: {
      Origin: "https://evil.example",
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, enabled: false }),
  });
  assert.equal(blocked.status, 403);
  const model = await req("/api/model/save", {
    enabled: false,
    baseUrl: "https://api.example.com/v1",
    model: "test",
    apiKey: "never-return-this-key",
    prompt: "中文回复",
  });
  assert.equal(model.status, 200);
  const config = await req("/api/model");
  assert.equal(config.body.hasKey, true);
  assert.equal(config.body.apiKey, undefined);
  assert.equal(
    (
      await req("/api/model/save", {
        enabled: false,
        baseUrl: "http://127.0.0.1",
        model: "x",
        prompt: "x",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req("/api/messages/reply", {
        id: messages.body.rows[0].id,
        content: "中".repeat(7000),
      })
    ).status,
    400,
  );
  await req("/api/bots/toggle", { id, enabled: false });
  assert.equal(
    (
      await req("/api/messages/reply", {
        id: messages.body.rows[0].id,
        content: "不会发出",
      })
    ).status,
    409,
  );
  assert.equal((await req("/api/audit")).body.total > 0, true);
  await req("/api/bots/toggle", { id, enabled: true });
  await req("/api/model/save", {
    enabled: true,
    baseUrl: "https://model.example.test/v1",
    model: "test",
    apiKey: "never-return-this-key",
    prompt: "中文回复",
  });
  const callback = async (msgid, code) => {
    const x = fixture(
      JSON.stringify({
        ...message,
        msgid,
        response_url:
          "https://qyapi.weixin.qq.com/cgi-bin/aibot/response?response_code=" +
          code,
      }),
      f.credentials.token,
      Buffer.from(f.credentials.aesKey + "=", "base64"),
    );
    return fetch(
      origin +
        "/callbacks/wecom?" +
        new URLSearchParams({ bot: id, ...x.query }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypt: x.encrypted }),
      },
    );
  };
  await callback("ai-success", "success");
  await callback("ai-success", "success");
  let aiMessage;
  for (let i = 0; i < 80; i++) {
    const list = (await req("/api/messages")).body.rows;
    aiMessage = list.find((m) => m.ai_status === "done");
    if (aiMessage) break;
    await delay(50);
  }
  assert.equal(aiMessage?.status, "replied");
  assert.match(aiMessage.reply, /模拟模型回复/);
  assert.equal(
    readFileSync(join(dir, "mock-deliveries.txt"), "utf8").trim().split("\n")
      .length,
    1,
  );
  assert.equal(
    (
      await req("/api/messages/reply", {
        id: aiMessage.id,
        content: "重复回复",
      })
    ).status,
    409,
  );
  await callback("ai-unknown", "unknown");
  let unknown;
  for (let i = 0; i < 80; i++) {
    unknown = (await req("/api/messages")).body.rows.find(
      (m) => m.status === "unknown",
    );
    if (unknown) break;
    await delay(50);
  }
  assert.ok(unknown);
  assert.equal(
    (await req("/api/messages/reply", { id: unknown.id, content: "不应重试" }))
      .status,
    409,
  );
  assert.equal(
    readFileSync(join(dir, "mock-deliveries.txt"), "utf8").trim().split("\n")
      .length,
    2,
  );
  await req("/api/model/save", {
    enabled: false,
    baseUrl: "https://model.example.test/v1",
    model: "test",
    prompt: "中文回复",
  });
  const files = [join(dir, "bridge.sqlite"), join(dir, "bridge.sqlite-wal")];
  for (const file of files)
    assert.equal(
      readFileSync(file).includes(Buffer.from("never-return-this-key")),
      false,
    );
  await req("/api/logout", {});
  assert.equal((await req("/api/me")).status, 401);
});
