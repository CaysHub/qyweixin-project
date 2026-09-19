import WebSocket from "ws";
import { randomUUID } from "node:crypto";

// 一个进程独占所有机器人连接。横向扩容前必须增加分布式租约。
export class Connections {
  constructor({
    receive,
    credentials,
    log,
    socketUrl = "wss://openws.work.weixin.qq.com",
  }) {
    this.socketUrl = socketUrl;
    this.entries = new Map();
    this.receive = receive;
    this.credentials = credentials;
    this.log = log;
  }
  status(id) {
    return this.entries.get(id)?.status || "disabled";
  }
  stop(id) {
    const e = this.entries.get(id);
    if (!e) return;
    e.stopped = true;
    clearTimeout(e.retry);
    clearInterval(e.heartbeat);
    clearTimeout(e.handshake);
    for (const p of e.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("连接已关闭，发送结果可能未知"));
    }
    e.pending.clear();
    e.socket?.terminate();
    this.entries.delete(id);
  }
  start(bot) {
    this.stop(bot.id);
    const e = {
      status: "connecting",
      pending: new Map(),
      attempt: 0,
      stopped: false,
    };
    this.entries.set(bot.id, e);
    const connect = () => {
      if (e.stopped) return;
      e.status = "connecting";
      const ws = new WebSocket(this.socketUrl, {
        handshakeTimeout: 10000,
        maxPayload: 2 * 1024 * 1024,
      });
      e.socket = ws;
      e.handshake = setTimeout(() => ws.terminate(), 15000);
      const subscription = randomUUID();
      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            cmd: "aibot_subscribe",
            headers: { req_id: subscription },
            body: { bot_id: bot.bot_id, secret: this.credentials(bot).secret },
          }),
        );
      });
      ws.on("message", (raw) => {
        try {
          const frame = JSON.parse(raw.toString());
          if (frame.headers?.req_id === subscription) {
            clearTimeout(e.handshake);
            if (frame.errcode !== 0) {
              e.stopped = true;
              e.status = "auth_error";
              ws.close();
              this.log("连接认证失败", bot.name);
              return;
            }
            e.status = "connected";
            e.attempt = 0;
            this.log("长连接已建立", bot.name);
            e.heartbeat = setInterval(() => {
              this.request(bot.id, "ping").catch(() => ws.terminate());
            }, 30000);
            return;
          }
          if (
            frame.cmd === "aibot_event_callback" &&
            frame.body?.event?.eventtype === "disconnected_event"
          ) {
            e.stopped = true;
            e.status = "displaced";
            ws.close();
            this.log("连接被其他实例替代，已停止重连", bot.name);
            return;
          }
          if (
            ["aibot_msg_callback", "aibot_event_callback"].includes(frame.cmd)
          ) {
            this.receive(bot, frame.body, frame.headers?.req_id);
            return;
          }
          const pending = e.pending.get(frame.headers?.req_id);
          if (pending && typeof frame.errcode === "number") {
            clearTimeout(pending.timer);
            e.pending.delete(frame.headers.req_id);
            if (frame.errcode === 0) pending.resolve(frame);
            else
              pending.reject(new Error(`企业微信返回错误码 ${frame.errcode}`));
          }
        } catch {
          this.log("长连接帧处理失败", bot.name);
        }
      });
      ws.on("error", () => {
        this.log("长连接网络异常", bot.name);
      });
      ws.on("close", () => {
        clearInterval(e.heartbeat);
        clearTimeout(e.handshake);
        for (const p of e.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new Error("连接中断，发送结果可能未知"));
        }
        e.pending.clear();
        if (e.stopped) return;
        e.status = "reconnecting";
        e.retry = setTimeout(
          connect,
          Math.min(60000, 2000 * 2 ** Math.min(e.attempt++, 5)) +
            Math.random() * 1000,
        );
      });
    };
    connect();
  }
  request(id, cmd, body, reqId = randomUUID()) {
    const e = this.entries.get(id);
    if (
      !e ||
      e.status !== "connected" ||
      e.socket.readyState !== WebSocket.OPEN
    )
      return Promise.reject(new Error("机器人长连接尚未就绪"));
    if (e.pending.has(reqId))
      return Promise.reject(new Error("同一消息正在发送"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        e.pending.delete(reqId);
        reject(new Error("等待确认超时，发送结果未知"));
      }, 10000);
      e.pending.set(reqId, { resolve, reject, timer });
      e.socket.send(
        JSON.stringify({
          cmd,
          headers: { req_id: reqId },
          ...(body ? { body } : {}),
        }),
        (error) => {
          if (error) {
            clearTimeout(timer);
            e.pending.delete(reqId);
            reject(new Error("连接发送失败"));
          }
        },
      );
    });
  }
  close() {
    for (const id of this.entries.keys()) this.stop(id);
  }
}
