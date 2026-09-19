import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export function seal(value, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}
export function unseal(value, key) {
  const b = Buffer.from(value, "base64"),
    cipher = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12));
  cipher.setAuthTag(b.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([cipher.update(b.subarray(28)), cipher.final()]).toString(
      "utf8",
    ),
  );
}
export function signature(token, timestamp, nonce, encrypted) {
  return createHash("sha1")
    .update([token, timestamp, nonce, encrypted].sort().join(""))
    .digest("hex");
}
export function decryptCallback({ token, aesKey }, query, encrypted) {
  if (
    typeof encrypted !== "string" ||
    typeof query.timestamp !== "string" ||
    typeof query.nonce !== "string" ||
    !/^[a-f0-9]{40}$/.test(query.msg_signature || "")
  )
    throw new Error("回调签名无效");
  if (
    Math.abs(Date.now() / 1000 - Number(query.timestamp)) > 600 ||
    !Number.isFinite(Number(query.timestamp))
  )
    throw new Error("回调时间戳无效");
  const expected = signature(token, query.timestamp, query.nonce, encrypted);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(query.msg_signature)))
    throw new Error("回调签名无效");
  const key = Buffer.from(aesKey + "=", "base64");
  const cipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  const raw = Buffer.concat([
    cipher.update(Buffer.from(encrypted, "base64")),
    cipher.final(),
  ]);
  const pad = raw[raw.length - 1];
  if (
    !pad ||
    pad > 32 ||
    raw.length < pad + 20 ||
    !raw.subarray(-pad).every((b) => b === pad)
  )
    throw new Error("回调填充无效");
  const body = raw.subarray(0, -pad),
    len = body.readUInt32BE(16);
  // 企业内部智能机器人的 ReceiveId 必须为空。
  if (20 + len !== body.length) throw new Error("回调接收者或消息长度无效");
  return body.subarray(20, 20 + len).toString("utf8");
}
export function validateResponseUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "qyapi.weixin.qq.com" ||
    u.port ||
    u.username ||
    u.password ||
    u.pathname !== "/cgi-bin/aibot/response" ||
    !u.searchParams.get("response_code")
  )
    throw new Error("主动回复地址不合法");
  return u.href;
}
