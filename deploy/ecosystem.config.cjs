// 从项目根目录运行：pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "wecom-bridge",
      cwd: require("node:path").resolve(__dirname, ".."),
      script: "server/index.js",
      interpreter: "node",
      node_args: "--env-file=.env --max-old-space-size=384",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      kill_timeout: 15000,
      time: true,
      merge_logs: true,
    },
  ],
};
