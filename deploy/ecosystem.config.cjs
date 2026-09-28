// 从项目根目录运行：pm2 start deploy/ecosystem.config.cjs
// 本地试用开发配置：NODE_ENV=development pm2 start deploy/ecosystem.config.cjs
// 注意：必须单实例 fork 运行；cluster 或多副本会导致长连接被互相顶替、SQLite 队列抢占。
const path = require("node:path");
const root = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "wecom-bridge",
      cwd: root,
      script: "server/index.js",
      interpreter: "node",
      // Node 22.9+ 的 --env-file-if-exists 在 .env 缺失时不报错，
      // 应用随后会抛出“请先运行 npm run setup”的明确提示。
      node_args: ["--env-file-if-exists=.env", "--max-old-space-size=384"],
      // 显式传入的 NODE_ENV 优先；未指定时按生产环境运行
      env: { NODE_ENV: process.env.NODE_ENV || "production" },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      // 启动后 30 秒内退出视为异常启动，连续 10 次后停止，避免配置错误时无限重启
      min_uptime: "30s",
      max_restarts: 10,
      exp_backoff_restart_delay: 1000,
      max_memory_restart: "512M",
      // 应用监听 SIGINT/SIGTERM 优雅退出：关闭长连接、HTTP 与 SQLite 后再退出
      kill_signal: "SIGINT",
      kill_timeout: 15000,
      out_file: "logs/wecom-bridge-out.log",
      error_file: "logs/wecom-bridge-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      time: true,
    },
  ],
};
