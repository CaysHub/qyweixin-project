# 企微桥 · WeCom Bridge

面向企业微信智能机器人的轻量接入管理平台。包含公开介绍首页、管理员控制台、URL 回调与 WebSocket 接入、OpenAI 兼容模型自动回复、人工回复、消息记录和操作日志。适合腾讯云 **2 核 2GB / OpenCloudOS 9 / 宝塔面板**。

## 本地启动

需要 Node.js **22.16+（建议最新 Node.js 22 LTS）**。使用 React + Vite 构建前端，Node.js + Express 提供接口，SQLite 保存配置、消息与任务队列。

安装依赖：

```bash
npm ci
```

生成本地配置与随机管理员密码：

```bash
npm run setup
```

启动开发服务：

```bash
npm run dev
```

- 首页：http://localhost:5173
- 控制台：http://localhost:5173/#/overview
- `.env` 中的 `ADMIN_PASSWORD` 为自动生成的管理员密码，在本机编辑器查看。
- `ENCRYPTION_KEY` 是持久化数据的加密主密钥。必须备份，丢失后无法解密机器人凭证和模型 API Key。
- 开发前端运行在 5173，后端监听 127.0.0.1:3100。请使用 localhost 访问前端，与 `.env` 中的 `PUBLIC_URL` 保持一致。

运行自动化测试：

```bash
npm test
```

构建生产前端：

```bash
npm run build
```

生产构建后由 Node 服务同时提供静态网页和 API。直接运行 `npm start` 时，如果要在 3100 访问并登录，需要把 `.env` 的 `PUBLIC_URL` 改为 `http://localhost:3100`。

## 已实现

| 模块 | 内容 |
| --- | --- |
| 网站首页 | 产品介绍、双模式说明、控制台入口、移动端布局 |
| 管理工作台 | 真实统计、近七天消息趋势、机器人状态、接入清单 |
| 机器人 | 创建、停用后编辑、启停、回调地址复制；BotID 全局唯一 |
| URL 接入 | GET 验证、SHA-1 签名校验、AES-256-CBC 解密、消息排重、空包快速响应 |
| 长连接 | 订阅、30 秒心跳、ACK 关联、指数退避重连；收到被替代事件后停止重连 |
| AI 回复 | 可配置基础地址、模型、密钥、系统提示词；SQLite 持久队列、最多 2 路并发 |
| 消息中心 | 分页、搜索、机器人筛选、AI 状态、人工 Markdown 回复 |
| 审计 | 分页查看登录、配置、连接、回复结果；不记录凭证或完整回调报文 |
| 部署 | 宝塔 Nginx 配置、单进程 PM2 配置、可选 Docker Compose、SQLite 在线备份 |

## 服务器部署

推荐腾讯云 OpenCloudOS 9 / 2 核 2GB，使用 **Nginx + 一个 Node.js 进程 + SQLite**。AI 请求调用外部模型服务，不在服务器上运行大模型。无需额外部署 MySQL 或 Redis。

```text
浏览器 / 企业微信 URL 回调
             │ HTTPS
           Nginx
             │ 127.0.0.1:3100
        企微桥 Node.js
             ├── dist 前端静态资源与管理 API
             ├── SQLite 消息、配置和持久化队列
             ├── 外部兼容 OpenAI 的模型接口
             └── 企业微信 WebSocket 长连接
```

### 安装与配置

先安装 Node.js 22.16 以上版本并确认 `node -v`、`npm -v` 正常。生产服务器建议使用最新 Node.js 22 补丁版本。

上传项目到独立目录，例如 `/www/wwwroot/wecom-bridge`，所有应用命令均在项目根目录执行。部署包包含 `dist` 时，服务器只需安装运行依赖：

```bash
npm ci --omit=dev
```

如果是完整源码且没有 `dist`，先在本地或 CI 执行 `npm ci` 和 `npm run build`，再上传构建产物。仅有 README 的仓库不能启动应用，需要完整源码或完整部署包。

初始化配置：

```bash
npm run setup
```

限制配置文件权限：

```bash
chmod 600 .env
```

编辑 `.env` 时保留自动生成的 `ADMIN_PASSWORD` 和 `ENCRYPTION_KEY`，其余运行参数按实际环境填写：

| 参数 | 生产配置 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | 使用生产安全设置 |
| `HOST` | `127.0.0.1` | 仅允许本机反向代理访问 |
| `PORT` | `3100` | 应用监听端口 |
| `PUBLIC_URL` | `https://bot.example.com` | 替换为浏览器真实访问的协议、域名或 IP、端口 |
| `DATA_DIR` | `./data` | 相对项目工作目录保存数据 |
| `TZ` | `Asia/Shanghai` | 统计日期使用中国时区 |
| `NODE_OPTIONS` | `--max-old-space-size=384` | 限制 V8 堆大小，不等同于整个进程内存上限 |

`PUBLIC_URL` 同时用于生成回调地址与管理接口来源校验。切换域名/IP 后需要修改该值并重启应用，否则登录和保存请求可能返回“请求来源不合法”。

### 单实例进程托管

可以选择宝塔 Node 项目管理，或使用 PM2；不要同时启动两份应用。PM2 安装命令：

```bash
npm install -g pm2
```

若已有 `npm start` 前台进程，先停止它，然后使用项目提供的单实例配置启动：

```bash
pm2 start deploy/ecosystem.config.cjs
```

保存进程列表：

```bash
pm2 save
```

配置开机自启，并按 PM2 输出完成对应运行用户的服务设置：

```bash
pm2 startup systemd
```

检查状态：

```bash
pm2 status
```

验证应用：

```bash
curl -fsS http://127.0.0.1:3100/api/health
```

正常返回 `{"ok":true}`。修改 `.env` 后使用 `pm2 restart wecom-bridge` 重启。不要使用 PM2 cluster 或多个副本；每个机器人同一时间只允许一条有效长连接。

建议安装 `pm2-logrotate`，设置日志阈值 10MB、保留 7 个历史文件并开启压缩，避免日志占满磁盘。

### Nginx、HTTPS 与临时 IP 访问

主配置的 `http` 块已经加载 `include /etc/nginx/conf.d/*.conf;` 时，可将站点配置单独放入 `/etc/nginx/conf.d/wecom-bridge.conf`，无需改动主配置。使用实际域名或 IP 作为 `server_name`，证书路径以服务器上的实际文件为准。

- 网站页面、静态资源和 `/api` 全部反向代理到 `http://127.0.0.1:3100`；Node.js 负责提供 `dist` 内容。
- 回调路径 `/callbacks/wecom` 单独关闭访问日志，避免验证参数进入日志。
- Nginx 需要传递 `Host`、`X-Real-IP`、`X-Forwarded-For` 和 `X-Forwarded-Proto`，模型测试请求的读取超时建议 75 秒。
- 配置参考 `deploy/nginx-location.conf`，将其中 location 放入站点 HTTPS server 块。
- 不要将包含 `.env`、`data`、源码或部署压缩包的项目根目录直接作为公开静态文件目录。
- 腾讯云安全组和本机防火墙放行 443；使用 HTTP 跳转或 HTTP 证书验证时放行 80。3100 不对公网开放。

检查配置：

```bash
nginx -t
```

检查成功后重新加载：

```bash
nginx -s reload
```

Nginx 已运行时不要再次执行裸 `nginx` 命令，否则新进程会因 443 已占用而启动失败。`systemctl status nginx` 找不到服务，不代表 Nginx 未运行；手动安装或面板管理的 Nginx 可能没有同名 systemd 单元。

临时通过 `https://服务器IP` 访问时，`server_name` 和 `PUBLIC_URL` 都要匹配实际 IP。**域名证书通常不包含 IP，浏览器会报告证书不匹配。** 临时忽略警告只用于人工页面调试，不代表 TLS 验证通过，也不能据此认定企业微信 URL 回调可用。正式回调应使用有效的受信任证书，并满足域名备案等部署要求。

### 数据备份

在项目目录执行一致性在线备份：

```bash
node --env-file=.env scripts/backup.js /www/backup/wecom-bridge
```

另行安全备份 `.env` 中的加密主密钥。运行中的 SQLite 使用 WAL，不要仅复制主数据库文件代替在线备份。数据库含聊天文本，备份目录不应通过网站公开访问。

## 首次接入

1. 登录控制台，在“机器人管理”创建配置并启用，确保接入方式与企业微信后台一致。
2. URL 模式填写 BotID、Token、EncodingAESKey，将生成的完整回调地址填入企业微信并验证；长连接模式填写 BotID 和专用 Secret，等待显示“已连接”。
3. 在“AI 模型配置”填写 HTTPS 基础地址、模型 ID、API Key 与系统提示词，保存并测试已保存配置。测试会调用模型，可能产生服务商费用。
4. 开启 AI 自动回复并保存，在企业微信中发送文本消息，在“消息中心”查看生成和发送结果。

## 当前边界

- 这是**单管理员、单应用实例**版本，不支持多租户和集群。不要使用 PM2 cluster 或启动多个副本。
- AI 自动回复当前只支持**单轮文本问答**，通过外部 `POST /chat/completions` 调用模型，不在 2GB 服务器上部署大模型。不包含历史上下文、RAG、工具执行、多媒体识别与流式输出。
- 新消息默认允许一次人工或 AI 回复；这是平台对长连接模式也采用的保守产品限制，官方长连接协议本身允许更多交互。
- URL 使用 `response_url` 异步回复，**不是无需用户交互的任意主动群发**。每个凭证只能调用一次，1 小时有效。长连接本版实现 `aibot_respond_msg`，未实现无回调的 `aibot_send_msg` 群发入口、模板卡片和素材上传。
- 同一机器人只能选 URL 或长连接；同一机器人仅能维持一个有效长连接。
- 只有企业微信确认 `errcode=0` 才标记回复成功。HTTP/ACK 不确定失败后标记“结果未确认”，不自动重试。AI 生成失败时消息保持可人工回复。
- 服务重启后会恢复未完成的 AI 生成队列；发送中的消息标记结果未知，避免重复发送。登录会话需要重新建立。
- 凭证和 response_url 加密存储；聊天文本为本地数据库明文，需限制备份访问。现阶段没有自动历史清理，需监控磁盘并定期归档。
- 模型地址要求 HTTPS、公开 IPv4 DNS 地址，不允许内网地址或重定向。填写基础地址（包含服务商要求的 `/v1` 等前缀），不要填写完整 `/chat/completions`。

## 文档

- [服务器部署与接入手册](docs/deployment.md)
- [接口契约与实现边界](docs/api.md)
- [企业微信主动回复消息](https://developer.work.weixin.qq.com/document/path/101138)
- [企业微信智能机器人长连接](https://developer.work.weixin.qq.com/document/path/101463)
- [回调和回复的加解密方案](https://developer.work.weixin.qq.com/document/path/101033)

官方页面核对日期：2026-09-18。自动化测试覆盖签名与解密、鉴权、回调排重、模拟模型回复和 WebSocket ACK；真实机器人收发和实际模型供应商仍需使用部署环境及真实凭证联调。自动化测试不向真实企业微信会话发消息。

本项目为独立接入工具，非企业微信官方产品。
