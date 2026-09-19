import https from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

// 校验并固定本次请求的目标 IP，禁止重定向，避免自定义模型地址访问内网。
export async function complete(config, content) {
  const base = new URL(config.baseUrl);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error("模型接口需要纯 HTTPS 地址");
  const addresses = await lookup(base.hostname, { family: 4, all: true });
  if (
    !addresses.length ||
    addresses.some((a) => ipaddr.parse(a.address).range() !== "unicast")
  )
    throw new Error("模型接口必须解析为公网地址");
  const url = new URL(base.href.replace(/\/$/, "") + "/chat/completions");
  const data = JSON.stringify({
    model: config.model,
    stream: false,
    max_tokens: 1500,
    messages: [
      { role: "system", content: config.prompt },
      { role: "user", content },
    ],
  });
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Length": Buffer.byteLength(data),
        },
        lookup: (_host, options, cb) =>
          options.all
            ? cb(null, [addresses[0]])
            : cb(null, addresses[0].address, 4),
      },
      (response) => {
        let size = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024)
            request.destroy(new Error("模型响应过大"));
          else chunks.push(chunk);
        });
        response.on("error", () => reject(new Error("模型响应中断")));
        response.on("end", () => {
          if (response.statusCode !== 200)
            return reject(
              new Error(`模型服务返回 HTTP ${response.statusCode}`),
            );
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString());
            const text = payload.choices?.[0]?.message?.content;
            if (
              typeof text !== "string" ||
              !text.trim() ||
              Buffer.byteLength(text) > 20480
            )
              throw new Error();
            resolve(text);
          } catch {
            reject(
              new Error("模型返回的回复为空、格式不支持或超过消息字节限制"),
            );
          }
        });
      },
    );
    const timer = setTimeout(
      () => request.destroy(new Error("模型请求超时（60 秒）")),
      60000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", () =>
      reject(new Error("模型连接失败或超时，请检查接口配置")),
    );
    request.end(data);
  });
}
