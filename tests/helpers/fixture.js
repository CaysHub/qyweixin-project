import { createCipheriv, randomBytes } from "node:crypto";
import { signature } from "../../server/crypto.js";
export function fixture(text, token = "testToken123", key = randomBytes(32)) {
  const data = Buffer.from(text),
    length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const plain = Buffer.concat([randomBytes(16), length, data]);
  const pad = 32 - (plain.length % 32);
  const cipher = createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.concat([plain, Buffer.alloc(pad, pad)])),
    cipher.final(),
  ]).toString("base64");
  const query = {
    timestamp: String(Math.floor(Date.now() / 1000)),
    nonce: "nonce123",
  };
  query.msg_signature = signature(
    token,
    query.timestamp,
    query.nonce,
    encrypted,
  );
  return {
    credentials: { token, aesKey: key.toString("base64").slice(0, -1) },
    query,
    encrypted,
  };
}
