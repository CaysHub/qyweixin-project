import { test } from "node:test";
import assert from "node:assert/strict";
import { WebSocketServer } from "ws";
import { Connections } from "../server/connections.js";
import { setTimeout as delay } from "node:timers/promises";
test("长连接订阅、消息接收、关联 ACK、被踢后不抢占重连", async (t) => {
  const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise((r) => wss.once("listening", r));
  let peer, received, subscription;
  wss.on("connection", (ws) => {
    peer = ws;
    ws.on("message", (raw) => {
      const f = JSON.parse(raw);
      if (f.cmd === "aibot_subscribe") subscription = f;
      ws.send(
        JSON.stringify({
          headers: f.headers,
          errcode: f.cmd === "bad" ? 400 : 0,
        }),
      );
    });
  });
  const c = new Connections({
    socketUrl: `ws://127.0.0.1:${wss.address().port}`,
    credentials: () => ({ secret: "test-only" }),
    receive: (_b, body) => {
      received = body;
    },
    log: () => {},
  });
  t.after(() => {
    c.close();
    for (const client of wss.clients) client.terminate();
    wss.close();
  });
  c.start({ id: "internal", bot_id: "bot", name: "测试" });
  for (let i = 0; i < 100 && c.status("internal") !== "connected"; i++)
    await delay(10);
  assert.equal(c.status("internal"), "connected");
  assert.equal(subscription.body.bot_id, "bot");
  const reply = await c.request(
    "internal",
    "aibot_respond_msg",
    { msgtype: "markdown", markdown: { content: "test" } },
    "original-id",
  );
  assert.equal(reply.headers.req_id, "original-id");
  await assert.rejects(c.request("internal", "bad"), /400/);
  peer.send(
    JSON.stringify({
      cmd: "aibot_msg_callback",
      headers: { req_id: "m" },
      body: { msgid: "1" },
    }),
  );
  await delay(30);
  assert.equal(received.msgid, "1");
  peer.send(
    JSON.stringify({
      cmd: "aibot_event_callback",
      body: { event: { eventtype: "disconnected_event" } },
    }),
  );
  await delay(50);
  assert.equal(c.status("internal"), "displaced");
  await assert.rejects(c.request("internal", "ping"), /未就绪/);
});
