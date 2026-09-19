import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export function openStore(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dir, "bridge.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS bots (id TEXT PRIMARY KEY, name TEXT NOT NULL, mode TEXT NOT NULL, bot_id TEXT NOT NULL UNIQUE, credentials TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0, verified_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bots(id), external_id TEXT NOT NULL, req_id TEXT, kind TEXT NOT NULL, sender TEXT, chat_id TEXT, chat_type TEXT, content TEXT, response_url TEXT, expires_at TEXT, status TEXT NOT NULL, reply TEXT, created_at TEXT NOT NULL, UNIQUE(bot_id, external_id));
    CREATE INDEX IF NOT EXISTS messages_time ON messages(created_at);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (message_id TEXT PRIMARY KEY REFERENCES messages(id), status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, chat_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS deliveries_lookup ON deliveries(bot_id, chat_id, created_at);
  `);
  db.prepare(
    "UPDATE messages SET status='unknown' WHERE status='sending'",
  ).run();
  db.prepare("UPDATE jobs SET status='queued' WHERE status='running'").run();
  return db;
}
export function audit(db, action, detail) {
  db.prepare("INSERT INTO audit VALUES (?,?,?,?)").run(
    randomUUID(),
    action,
    detail,
    new Date().toISOString(),
  );
}
