// 仅由自动化测试显式 preload，生产启动不引用此文件。
import https from "node:https";
import dns from "node:dns/promises";
import { syncBuiltinESMExports } from "node:module";
import { EventEmitter } from "node:events";
import { appendFileSync } from "node:fs";
if (process.env.NODE_ENV !== "test")
  throw new Error("Mock provider is test-only");
const realLookup = dns.lookup;
dns.lookup = async (host, options) =>
  host === "model.example.test"
    ? [{ address: "93.184.216.34", family: 4 }]
    : realLookup(host, options);
const realRequest = https.request;
https.request = (url, options, callback) => {
  if (url.hostname !== "model.example.test")
    return realRequest(url, options, callback);
  const request = new EventEmitter();
  request.destroy = () => request.emit("error", new Error("mock aborted"));
  request.end = (data) => {
    const payload = JSON.parse(data);
    setTimeout(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      callback(response);
      response.emit(
        "data",
        Buffer.from(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "模拟模型回复：" + payload.messages[1].content,
                },
              },
            ],
          }),
        ),
      );
      response.emit("end");
      request.emit("close");
    }, 30);
  };
  return request;
};
syncBuiltinESMExports();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (new URL(url).hostname !== "qyapi.weixin.qq.com")
    return realFetch(url, options);
  appendFileSync(process.env.DATA_DIR + "/mock-deliveries.txt", "sent\n");
  if (String(url).includes("unknown")) throw new Error("模拟已发出但响应丢失");
  return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
