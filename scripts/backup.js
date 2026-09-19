import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
const dir = process.env.DATA_DIR || "./data";
const target = process.argv[2];
if (!target)
  throw new Error("用法：node --env-file=.env scripts/backup.js /安全备份目录");
mkdirSync(target, { recursive: true, mode: 0o700 });
const destination = join(
  target,
  `bridge-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
const db = new DatabaseSync(join(dir, "bridge.sqlite"), { readOnly: true });
await backup(db, destination);
db.close();
chmodSync(destination, 0o600);
console.log("SQLite 在线备份已完成：" + destination);
