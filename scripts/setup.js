import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) {
  console.log(".env 已存在，保留原配置。");
  process.exit(0);
}
writeFileSync(
  ".env",
  `NODE_ENV=development\nPORT=3100\nHOST=127.0.0.1\nPUBLIC_URL=http://localhost:5173\nADMIN_PASSWORD=${randomBytes(18).toString("base64url")}\nENCRYPTION_KEY=${randomBytes(32).toString("hex")}\nDATA_DIR=./data\n`,
  { mode: 0o600 },
);
console.log(
  "已生成 .env；管理员密码保存在 ADMIN_PASSWORD。请在本地打开文件查看，不要提交到版本库。",
);
