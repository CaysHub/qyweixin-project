import { test } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import {
  decryptCallback,
  signature,
  seal,
  unseal,
  validateResponseUrl,
} from "../server/crypto.js";
import { fixture } from "./helpers/fixture.js";
test("企业微信格式：验证字符串和中文 JSON 正确解密", () => {
  for (const content of [
    "echostr-check",
    JSON.stringify({ text: { content: "你好，企微桥 👋" } }),
  ]) {
    const f = fixture(content);
    assert.equal(decryptCallback(f.credentials, f.query, f.encrypted), content);
  }
});
test("拒绝伪造签名、过期时间戳和非法接收者", () => {
  const f = fixture("hello");
  assert.throws(() =>
    decryptCallback(
      f.credentials,
      { ...f.query, msg_signature: "0".repeat(40) },
      f.encrypted,
    ),
  );
  assert.throws(() =>
    decryptCallback(f.credentials, { ...f.query, timestamp: "0" }, f.encrypted),
  );
  assert.throws(() =>
    decryptCallback(
      f.credentials,
      { ...f.query, timestamp: "NaN" },
      f.encrypted,
    ),
  );
});
test("密钥加密可还原，密文篡改被拒绝", () => {
  const key = randomBytes(32),
    encrypted = seal({ secret: "private-value" }, key);
  assert.deepEqual(unseal(encrypted, key), { secret: "private-value" });
  const b = Buffer.from(encrypted, "base64");
  b[30] ^= 1;
  assert.throws(() => unseal(b.toString("base64"), key));
});
test("主动回复只允许企业微信固定 HTTPS 路径", () => {
  assert.equal(
    validateResponseUrl(
      "https://qyapi.weixin.qq.com/cgi-bin/aibot/response?response_code=x",
    ),
    "https://qyapi.weixin.qq.com/cgi-bin/aibot/response?response_code=x",
  );
  for (const u of [
    "http://qyapi.weixin.qq.com/cgi-bin/aibot/response?response_code=x",
    "https://127.0.0.1/",
    "https://qyapi.weixin.qq.com.evil.com/cgi-bin/aibot/response?response_code=x",
    "https://qyapi.weixin.qq.com/cgi-bin/aibot/response",
    "https://admin@qyapi.weixin.qq.com/cgi-bin/aibot/response?response_code=x",
  ])
    assert.throws(() => validateResponseUrl(u));
});
