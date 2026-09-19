import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Cpu,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Network,
  Plus,
  Power,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unplug,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const navs = [
  ["overview", "工作台", LayoutDashboard],
  ["bots", "机器人管理", Bot],
  ["messages", "消息中心", MessageSquare],
  ["model", "AI 模型配置", Sparkles],
  ["deployment", "部署与接入", Server],
  ["audit", "操作日志", Activity],
];
const statusNames = {
  disabled: "已停用",
  connecting: "连接中",
  connected: "已连接",
  reconnecting: "重连中",
  auth_error: "认证失败",
  displaced: "连接被替代",
  verified: "验证通过",
  unverified: "待验证",
  pending: "待回复",
  replied: "已回复",
  received: "已接收",
  expired: "已过期",
  unknown: "结果未确认",
  sending: "发送中",
};
const fmt = (v) =>
  v
    ? new Date(v).toLocaleString("zh-CN", {
        hour12: false,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
async function api(path, body) {
  const r = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await r.json();
  if (!r.ok) {
    const e = new Error(data.error || "请求失败");
    e.status = r.status;
    throw e;
  }
  return data;
}
function Brand() {
  return (
    <a className="brand" href="#/">
      <span className="brand-symbol">
        <Network size={23} />
      </span>
      <span>
        企微桥<small>WECOM BRIDGE</small>
      </span>
    </a>
  );
}
function Badge({ status }) {
  return (
    <span
      className={
        "badge " +
        (["connected", "verified", "replied"].includes(status)
          ? "green"
          : ["auth_error", "unknown", "displaced"].includes(status)
            ? "red"
            : [
                  "pending",
                  "unverified",
                  "connecting",
                  "reconnecting",
                  "sending",
                ].includes(status)
              ? "amber"
              : "gray")
      }
    >
      <i />
      {statusNames[status] || status}
    </span>
  );
}
function Button({ children, secondary = false, className = "", ...props }) {
  return (
    <button
      className={"button " + (secondary ? "secondary " : "") + className}
      {...props}
    >
      {children}
    </button>
  );
}
function Empty({ icon: Icon = MessageSquare, title, detail, children }) {
  return (
    <div className="empty">
      <span>
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {children}
    </div>
  );
}
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/"),
    [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [toast, setToast] = useState("");
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(1) || "/");
    window.addEventListener("hashchange", change);
    api("/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setChecking(false));
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (e) => setToast(typeof e === "string" ? e : e.message);
  return (
    <>
      {route === "/" ? (
        <Landing />
      ) : checking ? (
        <div className="full-loading">
          <Loader2 className="spin" /> 正在载入工作空间
        </div>
      ) : !user ? (
        <Login onLogin={setUser} />
      ) : (
        <Console
          route={route}
          notify={notify}
          onLogout={async () => {
            try {
              await api("/logout", {});
              setUser(null);
            } catch (e) {
              notify(e);
            }
          }}
        />
      )}
      <div role="status" className={"toast " + (toast ? "show" : "")}>
        {toast && (
          <>
            <Bell size={17} />
            {toast}
          </>
        )}
      </div>
    </>
  );
}
function Landing() {
  return (
    <div className="landing">
      <header className="site-header">
        <Brand />
        <nav>
          <a href="#/">产品首页</a>
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("features")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            接入能力
          </a>
          <a
            href="https://developer.work.weixin.qq.com/document/path/101138"
            target="_blank"
            rel="noreferrer"
          >
            开发文档 <ArrowUpRight size={14} />
          </a>
        </nav>
        <a className="button" href="#/overview">
          进入控制台 <ArrowRight size={16} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dot" /> 企业微信智能机器人 · 双模式接入
            </span>
            <h1>
              让每一条消息，
              <br />
              连接更多<span>可能。</span>
            </h1>
            <p>
              从企业微信到你的 AI 服务。统一管理 URL 回调与长连接，
              <br className="desktop" />
              让接入、回复和日常运维，在一个工作空间里完成。
            </p>
            <div className="hero-actions">
              <a className="button" href="#/overview">
                开始连接 <ArrowRight size={18} />
              </a>
              <a className="text-link" href="#/deployment">
                查看部署方案 <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="hero-notes">
              <span>
                <Check size={15} /> 私有化部署
              </span>
              <span>
                <Check size={15} /> 密钥加密存储
              </span>
              <span>
                <Check size={15} /> OpenAI 兼容接口
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-grid" />
            <div className="art-label">
              <span className="dot" /> YOUR MESSAGES, CONNECTED.
            </div>
            <div className="flow-node from">
              <span className="wecom-icon">
                <MessageSquare />
              </span>
              <div>
                <b>企业微信</b>
                <small>消息与协作的起点</small>
              </div>
              <span className="node-tag">WE COM</span>
            </div>
            <div className="flow-wire">
              <span>URL 回调</span>
              <i />
              <span>WebSocket</span>
            </div>
            <div className="flow-node bridge">
              <Network size={32} />
              <div>
                <b>企微桥</b>
                <small>统一接入 · 安全处理 · 消息追踪</small>
              </div>
              <ShieldCheck size={24} />
            </div>
            <div className="flow-wire short">
              <i />
            </div>
            <div className="flow-node ai">
              <span className="ai-icon">
                <Sparkles />
              </span>
              <div>
                <b>你的 AI 服务</b>
                <small>OpenAI-compatible API</small>
              </div>
              <ArrowUpRight size={20} />
            </div>
            <div className="art-caption">
              <span>01 RECEIVE</span>
              <span>02 CONNECT</span>
              <span>03 RESPOND</span>
            </div>
          </div>
        </section>
        <section id="features" className="features">
          <div className="section-intro">
            <span className="eyebrow">BUILT FOR YOUR WORKFLOW</span>
            <h2>两种连接方式，一个管理入口。</h2>
            <p>按机器人的使用场景选择接入方式，消息处理保持一致。</p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-icon">
                <Webhook />
              </span>
              <span className="overline">PUBLIC ENDPOINT</span>
              <h3>URL 回调模式</h3>
              <p>
                通过公网 HTTPS 地址接收消息，完成签名校验与消息解密，再异步生成
                AI 回复。
              </p>
              <div className="feature-foot">
                适合已有域名与公网服务 <ArrowUpRight size={17} />
              </div>
            </article>
            <article>
              <span className="feature-icon violet">
                <Zap />
              </span>
              <span className="overline">PERSISTENT CONNECTION</span>
              <h3>WebSocket 长连接</h3>
              <p>
                主动连接企业微信，自动心跳与断线重连，无需向公网暴露机器人回调接口。
              </p>
              <div className="feature-foot">
                适合快速接入与实时交互 <ArrowUpRight size={17} />
              </div>
            </article>
            <article>
              <span className="feature-icon sand">
                <Sparkles />
              </span>
              <span className="overline">YOUR MODEL, YOUR CHOICE</span>
              <h3>接入你的 AI 模型</h3>
              <p>
                配置兼容 OpenAI
                的接口与提示词，自动回复文本消息，异常时可在消息中心人工接管。
              </p>
              <div className="feature-foot">
                模型自由选择，数据自主掌握 <ArrowUpRight size={17} />
              </div>
            </article>
          </div>
        </section>
        <section className="landing-bottom">
          <div>
            <span className="eyebrow">SMALL SERVER. BIG CONNECTIONS.</span>
            <h2>一台轻量服务器，就能开始。</h2>
            <p>面向 2 核 2GB 云服务器设计，与宝塔 Nginx 配合部署。</p>
          </div>
          <a className="button secondary" href="#/deployment">
            探索部署方式 <ArrowRight size={17} />
          </a>
        </section>
      </main>
      <footer>
        <Brand />
        <span>连接消息，连接工作。© {new Date().getFullYear()} 企微桥</span>
        <span>独立接入工具 · 非企业微信官方产品</span>
      </footer>
    </div>
  );
}
function Login({ onLogin }) {
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="login-page">
      <div className="login-top">
        <Brand />
        <a href="#/">
          返回首页 <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="login-grid">
        <div className="login-copy">
          <span className="eyebrow">A BRIDGE TO BETTER WORK.</span>
          <h1>
            所有连接，
            <br />
            尽在掌握。
          </h1>
          <p>
            为你的企业微信机器人，
            <br />
            打造一个安静、高效的工作空间。
          </p>
          <Network size={160} strokeWidth={0.65} />
        </div>
        <form
          className="login-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/login", { password });
              onLogin(await api("/me"));
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="feature-icon">
            <ShieldCheck />
          </span>
          <h2>欢迎回到企微桥</h2>
          <p>登录管理员工作空间</p>
          <label>
            管理员密码
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理员密码"
              required
            />
          </label>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <Button disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <>
                登录控制台 <ArrowRight size={17} />
              </>
            )}
          </Button>
          <div className="login-help">
            <ShieldCheck size={16} /> 安全会话 · 8 小时后自动过期
          </div>
        </form>
      </div>
    </div>
  );
}
function Console({ route, notify, onLogout }) {
  const section = navs.some((n) => "/" + n[0] === route)
    ? route.slice(1)
    : "overview";
  const [overview, setOverview] = useState(null),
    [error, setError] = useState(""),
    [mobile, setMobile] = useState(false),
    [dialog, setDialog] = useState(null);
  const refresh = async () => {
    try {
      setOverview(await api("/overview"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);
  const create = () => setDialog({});
  return (
    <div className="console">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Brand />
        <div className="workspace">
          <span className="workspace-avatar">W</span>
          <div>
            <b>我的工作空间</b>
            <small>管理员 · 私有部署</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="nav-label">工作空间</span>
        <nav>
          {navs.map(([key, label, Icon]) => (
            <a
              key={key}
              href={"#/" + key}
              onClick={() => setMobile(false)}
              className={section === key ? "active" : ""}
            >
              <Icon size={19} />
              {label}
              {key === "messages" && overview?.totals.pending > 0 && (
                <span className="nav-count">{overview.totals.pending}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <Link2 size={18} />
            </span>
            <b>连接，从这里开始</b>
            <p>
              了解两种模式的接入步骤
              <br />
              搭建你的机器人工作流
            </p>
            <a href="#/deployment">
              查看接入指南 <ArrowUpRight size={14} />
            </a>
          </div>
          <a
            className="help-link"
            href="https://developer.work.weixin.qq.com/document/path/101463"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={17} /> 企业微信开发文档 <ExternalLink size={13} />
          </a>
          <button className="user-block" onClick={onLogout}>
            <span className="avatar">管</span>
            <span>
              <b>管理员</b>
              <small>退出当前登录</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="console-main">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="展开菜单"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span>工作空间</span>
            <ChevronRight size={13} />
            <b>{navs.find((n) => n[0] === section)[1]}</b>
          </div>
          <div>
            <span className="environment">
              <span className="dot" /> 私有部署
            </span>
            <span className="topbar-divider" />
            <a className="icon-button" title="查看部署帮助" href="#/deployment">
              <CircleHelp size={19} />
            </a>
            <span className="avatar small">管</span>
          </div>
        </header>
        <main className="dashboard">
          {error && (
            <div className="error">
              {error} <button onClick={refresh}>重新加载</button>
            </div>
          )}
          {section === "overview" && (
            <Overview data={overview} create={create} refresh={refresh} />
          )}
          {section === "bots" && (
            <Bots
              bots={overview?.bots || []}
              create={create}
              edit={setDialog}
              notify={notify}
              refresh={refresh}
            />
          )}
          {section === "messages" && (
            <Messages
              bots={overview?.bots || []}
              notify={notify}
              refreshOverview={refresh}
            />
          )}
          {section === "model" && <ModelSettings notify={notify} />}
          {section === "deployment" && (
            <Deployment data={overview?.deployment} notify={notify} />
          )}
          {section === "audit" && <Audit />}
          <div className="dashboard-footer">
            <span>
              企微桥 <i /> 让消息与服务自由连接
            </span>
            <span>
              v0.1.0 <i /> 单实例部署
            </span>
          </div>
        </main>
      </div>
      {dialog && (
        <BotDialog
          bot={dialog}
          close={() => setDialog(null)}
          notify={notify}
          saved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
function PageHead({ eyebrow, title, description, children }) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="head-actions">{children}</div>
    </div>
  );
}
function Overview({ data, create, refresh }) {
  const bots = data?.bots || [],
    active = bots.filter((b) =>
      ["connected", "verified"].includes(b.status),
    ).length,
    total = data?.totals || {},
    trend = data?.trend || [];
  return (
    <>
      <PageHead
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title="工作台概览"
        description="每一次连接，每一条消息，都在这里。"
      >
        <button
          className="icon-button bordered"
          onClick={refresh}
          title="刷新工作台"
        >
          <RefreshCw size={17} />
        </button>
        <Button onClick={create}>
          <Plus size={18} /> 接入机器人
        </Button>
      </PageHead>
      <section className="welcome-banner">
        <div className="welcome-spark">
          <Sparkles size={25} />
        </div>
        <div>
          <span className="overline">LET’S BUILD YOUR FIRST CONNECTION</span>
          <h2>
            {bots.length
              ? "让机器人，成为你的工作伙伴。"
              : "你好，欢迎来到企微桥。"}
          </h2>
          <p>接入企业微信，连接 AI 模型。把重复的问题，交给机器人。</p>
        </div>
        <a href="#/deployment">
          接入指南 <ArrowRight size={17} />
        </a>
        <div className="banner-lines">
          <Network size={170} strokeWidth={0.6} />
        </div>
      </section>
      <div className="stats-grid">
        {[
          [Bot, "已接入机器人", bots.length, "个", `${active} 个已连接 / 验证`],
          [
            MessageSquare,
            "今日接收消息",
            total.total || 0,
            "条",
            "来自所有接入机器人",
          ],
          [
            CheckCircle2,
            "今日已回复",
            total.replied || 0,
            "条",
            "以企业微信成功确认为准",
          ],
          [
            Activity,
            "今日待回复",
            total.pending || 0,
            "条",
            "仅统计仍在有效期内的消息",
          ],
        ].map(([Icon, label, count, unit, desc], i) => (
          <article className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>
              {data ? count : "—"}
              <small>{unit}</small>
            </strong>
            <p>
              <span className={"stat-dot dot-" + i} />
              {desc}
            </p>
          </article>
        ))}
      </div>
      <div className="overview-columns">
        <section className="panel trend-panel">
          <div className="panel-head">
            <div>
              <h3>消息趋势</h3>
              <p>最近 7 天接收的消息</p>
            </div>
            <span className="subtle-chip">
              近 7 天 <Activity size={13} />
            </span>
          </div>
          <div className="chart-legend">
            <span className="dot" /> 接收消息{" "}
            <b>{trend.reduce((s, t) => s + t.count, 0)}</b>
          </div>
          <div className="chart">
            <div className="chart-y">
              {[4, 3, 2, 1, 0].map((n) => (
                <span key={n}>
                  {Math.round(
                    (n * Math.max(4, ...trend.map((t) => t.count))) / 4,
                  )}
                </span>
              ))}
            </div>
            <div className="plot">
              <div className="gridlines">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} />
                ))}
              </div>
              <svg
                viewBox="0 0 600 160"
                preserveAspectRatio="none"
                aria-label="最近七天消息数量"
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#439a7e" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#439a7e" stopOpacity=".02" />
                  </linearGradient>
                </defs>
                {trend.length > 0 && (
                  <>
                    <path
                      d={`M 0 157 ${trend.map((t, i) => `L ${i * 100} ${157 - (t.count / Math.max(4, ...trend.map((t) => t.count))) * 145}`).join(" ")} L 600 157 Z`}
                      fill="url(#chartFill)"
                    />
                    <polyline
                      points={trend
                        .map(
                          (t, i) =>
                            `${i * 100},${157 - (t.count / Math.max(4, ...trend.map((t) => t.count))) * 145}`,
                        )
                        .join(" ")}
                      stroke="#368c72"
                      strokeWidth="2.5"
                      fill="none"
                    />
                  </>
                )}
              </svg>
              {!trend.some((t) => t.count) && (
                <span className="chart-empty">
                  第一条消息到达后，趋势将在这里呈现
                </span>
              )}
              <div className="chart-x">
                {trend.map((t) => (
                  <span key={t.date}>{t.date}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="panel quickstart">
          <div className="panel-head">
            <div>
              <h3>开始使用</h3>
              <p>三步，连接你的工作流</p>
            </div>
            <span className="subtle-chip">接入清单</span>
          </div>
          <a onClick={create}>
            <span className={"step " + (bots.length ? "done" : "")}>
              {bots.length ? <Check size={15} /> : 1}
            </span>
            <div>
              <b>添加第一个机器人</b>
              <p>选择 URL 回调或长连接</p>
            </div>
            <ChevronRight size={16} />
          </a>
          <a href="#/model">
            <span className="step">2</span>
            <div>
              <b>连接你的 AI 模型</b>
              <p>配置 API、模型与回复提示词</p>
            </div>
            <ChevronRight size={16} />
          </a>
          <a href="#/messages">
            <span className="step">3</span>
            <div>
              <b>发送一条测试消息</b>
              <p>在企业微信中开始对话</p>
            </div>
            <ChevronRight size={16} />
          </a>
          <div className="quick-note">
            <ShieldCheck size={15} /> 机器人凭证仅在服务端加密保存
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div className="inline-heading">
            <h3>我的机器人</h3>
            <span className="count">{bots.length}</span>
          </div>
          <a className="text-link" href="#/bots">
            管理全部 <ArrowRight size={15} />
          </a>
        </div>
        {bots.length ? (
          <div className="mini-bots">
            {bots.slice(0, 4).map((b) => (
              <div key={b.id}>
                <span
                  className={
                    "bot-avatar " + (b.mode === "websocket" ? "purple" : "")
                  }
                >
                  <Bot size={21} />
                </span>
                <div>
                  <b>{b.name}</b>
                  <small>
                    {b.mode === "url" ? "URL 回调" : "WebSocket 长连接"}
                  </small>
                </div>
                <Badge status={b.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="start-empty">
            <div className="empty-bot">
              <Bot size={29} />
            </div>
            <div>
              <h3>你的第一个机器人，正在等待连接</h3>
              <p>从企业微信获取凭证，即可开始配置。</p>
            </div>
            <Button secondary onClick={create}>
              <Plus size={16} /> 添加机器人
            </Button>
          </div>
        )}
      </section>
      <div className="mode-notice">
        <CircleHelp size={16} />
        <span>一个机器人，一种接入方式。URL 回调与长连接不能同时启用。</span>
        <a href="#/deployment">
          了解区别 <ArrowUpRight size={14} />
        </a>
      </div>
    </>
  );
}
function Bots({ bots, create, edit, notify, refresh }) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(""),
    [page, setPage] = useState(1),
    [data, setData] = useState(null);
  const load = () =>
    api(
      `/bots?page=${page}&search=${encodeURIComponent(search)}&mode=${filter === "all" ? "" : filter}`,
    )
      .then(setData)
      .catch(notify);
  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [page, search, filter, bots]);
  const filtered = data?.rows || [];
  return (
    <>
      <PageHead
        eyebrow="CONNECTIONS"
        title="机器人管理"
        description="统一管理接入配置，随时掌握机器人的连接状态。"
      >
        <Button onClick={create}>
          <Plus size={17} /> 接入机器人
        </Button>
      </PageHead>
      <div className="toolbar">
        <div className="tabs">
          {[
            ["all", "全部机器人"],
            ["url", "URL 回调"],
            ["websocket", "长连接"],
          ].map(([k, v]) => (
            <button
              key={k}
              className={filter === k ? "selected" : ""}
              onClick={() => {
                setFilter(k);
                setPage(1);
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索名称或 BotID"
          />
        </div>
      </div>
      {filtered.length ? (
        <div className="bot-grid">
          {filtered.map((b) => (
            <article className="panel bot-card" key={b.id}>
              <div className="bot-card-top">
                <span
                  className={
                    "bot-avatar " + (b.mode === "websocket" ? "purple" : "")
                  }
                >
                  <Bot size={26} />
                </span>
                <Badge status={b.status} />
              </div>
              <h3>{b.name}</h3>
              <p className="mono truncate">
                {b.mode === "url" ? "URL 回调" : b.bot_id}
              </p>
              <div className="bot-mode">
                {b.mode === "url" ? <Webhook size={15} /> : <Zap size={15} />}{" "}
                {b.mode === "url" ? "URL 回调模式" : "WebSocket 长连接"}
              </div>
              {b.mode === "url" && (
                <button
                  className="copy-url"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(b.callbackUrl);
                      notify("回调地址已复制");
                    } catch {
                      notify("复制失败，请在配置窗口中手动复制");
                    }
                  }}
                >
                  <span className="truncate">{b.callbackUrl}</span>
                  <Copy size={14} />
                </button>
              )}
              <div className="bot-card-footer">
                <button
                  disabled={b.enabled}
                  title={b.enabled ? "请先停用再编辑" : ""}
                  onClick={() => edit(b)}
                >
                  <Settings2 size={15} /> 编辑配置
                </button>
                <button
                  disabled={busy === b.id}
                  className={b.enabled ? "danger-text" : "green-text"}
                  onClick={async () => {
                    setBusy(b.id);
                    try {
                      await api("/bots/toggle", {
                        id: b.id,
                        enabled: !b.enabled,
                      });
                      refresh();
                      notify(b.enabled ? "机器人已停用" : "机器人已启用");
                    } catch (e) {
                      notify(e);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  <Power size={15} />
                  {b.enabled ? "停用" : "启用"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            icon={Bot}
            title={bots.length ? "没有匹配的机器人" : "还没有接入机器人"}
            detail="连接企业微信，让机器人开始为你工作。"
          >
            <Button secondary onClick={create}>
              <Plus size={16} /> 接入机器人
            </Button>
          </Empty>
        </section>
      )}
      <Pagination data={data} page={page} setPage={setPage} />
    </>
  );
}
function BotDialog({ bot, close, saved, notify }) {
  const [v, setV] = useState({
      name: bot.name || "",
      mode: bot.mode || "url",
      botId: bot.bot_id || "",
      token: "",
      aesKey: "",
      secret: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (k, value) => setV({ ...v, [k]: value });
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-dialog-title"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">NEW CONNECTION</span>
            <h2 id="bot-dialog-title">
              {bot.id ? "编辑机器人" : "接入机器人"}
            </h2>
          </div>
          <button className="icon-button" aria-label="关闭" onClick={close}>
            <X />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/bots/save", {
                ...v,
                ...(bot.id ? { id: bot.id } : {}),
              });
              notify("配置已保存，请启用机器人完成接入");
              saved();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            机器人名称
            <input
              autoFocus
              value={v.name}
              maxLength={50}
              required
              onChange={(e) => change("name", e.target.value)}
              placeholder="例如：团队知识助手"
            />
          </label>
          <label>接入方式</label>
          <div className="mode-picker">
            {[
              ["url", Webhook, "URL 回调", "通过公网地址接收消息"],
              ["websocket", Zap, "长连接", "主动连接企业微信"],
            ].map(([k, Icon, title, desc]) => (
              <button
                type="button"
                className={v.mode === k ? "selected" : ""}
                onClick={() => change("mode", k)}
                key={k}
              >
                <Icon size={21} />
                <b>{title}</b>
                <small>{desc}</small>
                {v.mode === k && <CheckCircle2 size={16} />}
              </button>
            ))}
          </div>
          {v.mode === "websocket" && (
            <label>
              BotID
              <input
                value={v.botId}
                required
                onChange={(e) => change("botId", e.target.value)}
                placeholder="企业微信智能机器人的 BotID"
              />
            </label>
          )}
          {v.mode === "url" ? (
            <>
              <label>
                Token
                <input
                  type="password"
                  autoComplete="new-password"
                  value={v.token}
                  onChange={(e) => change("token", e.target.value)}
                  placeholder={
                    bot.id ? "留空保留原 Token" : "3–32 位字母或数字"
                  }
                  required={!bot.id || bot.mode !== v.mode}
                />
              </label>
              <label>
                EncodingAESKey
                <input
                  type="password"
                  autoComplete="new-password"
                  value={v.aesKey}
                  onChange={(e) => change("aesKey", e.target.value)}
                  placeholder={
                    bot.id ? "留空保留原密钥" : "43 位消息加解密密钥"
                  }
                  required={!bot.id || bot.mode !== v.mode}
                />
              </label>
              {bot.callbackUrl && (
                <label>
                  回调地址
                  <input
                    value={bot.callbackUrl}
                    readOnly
                    onFocus={(e) => e.target.select()}
                  />
                </label>
              )}
            </>
          ) : (
            <label>
              Secret
              <input
                type="password"
                autoComplete="new-password"
                value={v.secret}
                onChange={(e) => change("secret", e.target.value)}
                placeholder={bot.id ? "留空保留原 Secret" : "长连接专用 Secret"}
                required={!bot.id || bot.mode !== v.mode}
              />
            </label>
          )}
          <div className="form-note">
            <ShieldCheck size={17} />
            <p>
              请与企业微信后台选择相同的接入方式。凭证加密保存，保存后不会向浏览器返回。
            </p>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <Button type="button" secondary onClick={close}>
              取消
            </Button>
            <Button disabled={busy}>
              {busy ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <Check size={17} />
              )}{" "}
              保存配置
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
function Pagination({ data, page, setPage }) {
  return (
    <div className="pagination">
      <span>共 {data?.total || 0} 条记录</span>
      <div>
        <button
          className="icon-button bordered"
          aria-label="上一页"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil((data?.total || 0) / 15))}
        </span>
        <button
          className="icon-button bordered"
          aria-label="下一页"
          disabled={page * 15 >= (data?.total || 0)}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
function Messages({ bots, notify, refreshOverview }) {
  const [data, setData] = useState(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [bot, setBot] = useState(""),
    [selected, setSelected] = useState(null),
    [content, setContent] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async () => {
    try {
      const d = await api(
        `/messages?page=${page}&search=${encodeURIComponent(search)}&bot=${bot}`,
      );
      setData(d);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    const t = setTimeout(load, 200);
    const i = setInterval(load, 7000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [page, search, bot]);
  return (
    <>
      <PageHead
        eyebrow="MESSAGE INBOX"
        title="消息中心"
        description="查看接收记录、AI 处理结果，并在需要时人工回复。"
      >
        <Button secondary onClick={load}>
          <RefreshCw size={16} /> 刷新消息
        </Button>
      </PageHead>
      <div className="toolbar">
        <div className="search wide">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索消息内容或发送者"
          />
        </div>
        <select
          aria-label="筛选机器人"
          value={bot}
          onChange={(e) => {
            setBot(e.target.value);
            setPage(1);
          }}
        >
          <option value="">全部机器人</option>
          {bots.map((b) => (
            <option value={b.id} key={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="panel">
        {data?.rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>消息内容</th>
                  <th>机器人</th>
                  <th>接收时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="message-cell">
                        <span className="message-icon">
                          <MessageSquare size={17} />
                        </span>
                        <div>
                          <b className="truncate">{m.content}</b>
                          <small>
                            {m.sender || "系统事件"} · {m.kind}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {m.bot_name}
                      <small className="cell-small">
                        {m.mode === "url" ? "URL 回调" : "长连接"}
                      </small>
                    </td>
                    <td className="muted">{fmt(m.created_at)}</td>
                    <td>
                      <Badge status={m.status} />
                      {m.ai_status && (
                        <small className="cell-small">
                          AI ·{" "}
                          {
                            {
                              queued: "排队中",
                              running: "生成中",
                              done: "已完成",
                              failed: "处理失败",
                            }[m.ai_status]
                          }
                        </small>
                      )}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelected(m);
                          setContent("");
                        }}
                      >
                        {m.status === "pending" ? "查看 / 回复" : "查看详情"}{" "}
                        <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="还没有消息记录"
            detail="启用机器人后，在企业微信中发送一条消息，记录会自动出现在这里。"
          />
        )}
        <Pagination data={data} page={page} setPage={setPage} />
      </section>
      <div className="mode-notice">
        <CircleHelp size={16} />
        <span>
          URL 回复凭证有效期 1 小时，且只能使用一次；长连接普通消息可在 24
          小时内回复。
        </span>
      </div>
      {selected && (
        <div className="modal-backdrop">
          <section
            className="modal message-modal"
            role="dialog"
            aria-modal="true"
            aria-label="消息详情"
          >
            <div className="modal-head">
              <div>
                <h2>消息详情</h2>
                <p>
                  {selected.bot_name} · {fmt(selected.created_at)}
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="关闭"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <div className="message-meta">
              <Badge status={selected.status} />
              <span>
                {selected.chat_type === "group" ? "群聊" : "单聊"} ·{" "}
                {selected.sender || "系统"}
              </span>
            </div>
            <div className="message-content">{selected.content}</div>
            {selected.ai_error && (
              <div className="error">AI：{selected.ai_error}</div>
            )}
            {selected.reply && (
              <>
                <label>回复内容</label>
                <div className="message-content reply-content">
                  {selected.reply}
                </div>
              </>
            )}
            {selected.status === "pending" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await api("/messages/reply", { id: selected.id, content });
                    notify("企业微信已确认回复成功");
                    setSelected(null);
                    load();
                    refreshOverview();
                  } catch (e) {
                    notify(e);
                    load();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  人工回复
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="输入回复，支持 Markdown…"
                    rows={5}
                    required
                  />
                </label>
                <p className="form-hint">
                  有效期至 {fmt(selected.expires_at)}。人工回复与 AI
                  回复只会有一方提交。
                </p>
                <div className="modal-actions">
                  <Button disabled={busy}>
                    <Send size={16} />
                    {busy ? "发送中…" : "发送回复"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function ModelSettings({ notify }) {
  const [v, setV] = useState(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [test, setTest] = useState("");
  useEffect(() => {
    api("/model")
      .then((d) => setV({ ...d, apiKey: "" }))
      .catch((e) => setError(e.message));
  }, []);
  const change = (key, value) => setV({ ...v, [key]: value });
  return (
    <>
      <PageHead
        eyebrow="INTELLIGENCE, YOUR WAY"
        title="AI 模型配置"
        description="连接兼容 OpenAI 的模型服务，让机器人自动回答文本消息。"
      />
      {error && <div className="error">{error}</div>}
      {v ? (
        <div className="settings-grid">
          <form
            className="panel settings-panel"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy("save");
              try {
                await api("/model/save", v);
                setV({ ...v, apiKey: "", hasKey: true });
                notify("模型配置已保存");
              } catch (e) {
                notify(e);
              } finally {
                setBusy("");
              }
            }}
          >
            <div className="panel-head">
              <div>
                <h3>模型服务</h3>
                <p>使用服务商提供的 API 凭证</p>
              </div>
              <Sparkles size={22} />
            </div>
            <div className="settings-body">
              <div className="switch-row">
                <div>
                  <b>AI 自动回复</b>
                  <p>仅处理启用后新收到的文本消息</p>
                </div>
                <button
                  type="button"
                  className={"switch " + (v.enabled ? "on" : "")}
                  role="switch"
                  aria-checked={v.enabled}
                  aria-label="AI 自动回复"
                  onClick={() => change("enabled", !v.enabled)}
                >
                  <span />
                </button>
              </div>
              <label>
                API 基础地址
                <input
                  type="url"
                  value={v.baseUrl}
                  onChange={(e) => change("baseUrl", e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  required
                />
                <small>
                  填写服务商基础地址，系统自动追加 /chat/completions。
                </small>
              </label>
              <label>
                API Key
                <input
                  type="password"
                  autoComplete="new-password"
                  value={v.apiKey}
                  onChange={(e) => change("apiKey", e.target.value)}
                  placeholder={
                    v.hasKey ? "已配置 · 留空保留原密钥" : "输入你的 API Key"
                  }
                  required={!v.hasKey}
                />
              </label>
              <label>
                模型名称
                <input
                  value={v.model}
                  onChange={(e) => change("model", e.target.value)}
                  placeholder="填写服务商实际支持的模型 ID"
                  required
                />
              </label>
              <label>
                系统提示词
                <textarea
                  value={v.prompt}
                  onChange={(e) => change("prompt", e.target.value)}
                  rows={5}
                  required
                  maxLength={10000}
                />
              </label>
              {test && (
                <div className="test-result">
                  <CheckCircle2 size={17} />
                  {test}
                </div>
              )}
              <div className="settings-actions">
                <Button
                  type="button"
                  secondary
                  disabled={Boolean(busy) || !v.hasKey}
                  onClick={async () => {
                    setBusy("test");
                    setTest("");
                    try {
                      const r = await api("/model/test", {});
                      setTest(r.reply);
                    } catch (e) {
                      notify(e);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === "test" ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Zap size={16} />
                  )}{" "}
                  测试已保存配置
                </Button>
                <Button disabled={Boolean(busy)}>
                  {busy === "save" ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  保存配置
                </Button>
              </div>
            </div>
          </form>
          <aside className="settings-aside">
            <div className="panel">
              <span className="feature-icon">
                <ShieldCheck />
              </span>
              <h3>你的模型，你的掌控</h3>
              <p>API Key 采用 AES-256-GCM 加密存储，不会通过查询接口返回。</p>
              <hr />
              <h4>为轻量服务器设计</h4>
              <p>
                最多同时处理 2 个 AI
                请求。消息先持久化，再排队生成，避免阻塞回调。
              </p>
              <h4>清楚知道回复结果</h4>
              <p>
                模型失败可人工接管。发送结果未知时不自动重发，避免一次性凭证重复使用。
              </p>
              <h4>当前支持范围</h4>
              <p>
                单轮文本问答，不含历史上下文、知识库、工具调用和多媒体理解。模型响应等待上限为
                60 秒。
              </p>
            </div>
            <div className="form-note">
              <CircleHelp size={18} />
              <p>
                测试会调用模型接口，可能产生服务商费用。请先保存配置再测试。
              </p>
            </div>
          </aside>
        </div>
      ) : (
        !error && (
          <div className="full-loading">
            <Loader2 className="spin" />
          </div>
        )
      )}
    </>
  );
}
function Deployment({ data, notify }) {
  const [tab, setTab] = useState("url");
  return (
    <>
      <PageHead
        eyebrow="DEPLOY & CONNECT"
        title="部署与接入"
        description="为腾讯云 2 核 2GB · OpenCloudOS 9 · 宝塔面板设计。"
      >
        <a
          className="button secondary"
          href="https://developer.work.weixin.qq.com/document/path/101463"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={16} /> 官方文档 <ExternalLink size={14} />
        </a>
      </PageHead>
      <section className="deployment-hero">
        <div>
          <span className="eyebrow">RECOMMENDED FOR YOUR SERVER</span>
          <h2>一台服务器，一个应用实例。</h2>
          <p>宝塔负责域名与 HTTPS，企微桥负责消息、AI 和机器人连接。</p>
          <div className="deploy-tags">
            <span>
              <Cpu size={14} /> 2 vCPU / 2 GB
            </span>
            <span>
              <ShieldCheck size={14} /> Nginx + TLS
            </span>
            <span>
              <Server size={14} /> Node.js 22 + SQLite
            </span>
          </div>
        </div>
        <Server size={72} strokeWidth={1} />
      </section>
      <section className="panel architecture">
        <div className="panel-head">
          <h3>推荐部署拓扑</h3>
          <span className="subtle-chip">宝塔托管 · 单实例</span>
        </div>
        <div className="architecture-flow">
          <div>
            <Globe2 />
            <b>企业微信 / 浏览器</b>
            <small>HTTPS · 443</small>
          </div>
          <ArrowRight />
          <div>
            <ShieldCheck />
            <b>宝塔 Nginx</b>
            <small>域名 · 证书 · 反向代理</small>
          </div>
          <ArrowRight />
          <div className="highlight">
            <Network />
            <b>企微桥应用</b>
            <small>127.0.0.1:3100</small>
          </div>
          <ArrowRight />
          <div>
            <Sparkles />
            <b>AI 模型服务</b>
            <small>HTTPS 出站请求</small>
          </div>
        </div>
        <div className="architecture-foot">
          <span>
            <Server size={15} /> 本地 SQLite 持久化
          </span>
          <span>
            <Zap size={15} /> 向企业微信主动建立 WSS 连接
          </span>
          <span>
            <Unplug size={15} /> 不公开应用端口
          </span>
        </div>
      </section>
      <div className="deployment-columns">
        <section className="panel guide">
          <div className="panel-head">
            <h3>机器人接入步骤</h3>
            <div className="tabs compact">
              <button
                className={tab === "url" ? "selected" : ""}
                onClick={() => setTab("url")}
              >
                URL 回调
              </button>
              <button
                className={tab === "websocket" ? "selected" : ""}
                onClick={() => setTab("websocket")}
              >
                长连接
              </button>
            </div>
          </div>
          {(tab === "url"
            ? [
                [
                  "绑定域名并启用 HTTPS",
                  "在宝塔添加站点与证书，将请求反向代理至 127.0.0.1:3100。",
                ],
                [
                  "创建并启用机器人",
                  "填写 Token、EncodingAESKey，保存后复制完整回调地址。",
                ],
                [
                  "在企业微信验证回调",
                  "选择设置接收消息 URL，填入复制的地址和相同密钥，点击保存验证。",
                ],
                [
                  "配置 AI 并发送消息",
                  "开启 AI 自动回复，在企业微信中给机器人发送文本消息。",
                ],
              ]
            : [
                [
                  "获取长连接凭证",
                  "在企业微信智能机器人 API 模式中选择长连接，获取 BotID 与 Secret。",
                ],
                [
                  "创建并启用机器人",
                  "选择长连接模式，保存凭证后启用，等待状态变为已连接。",
                ],
                [
                  "保持唯一连接实例",
                  "不要在其他服务同时运行相同机器人；新连接会踢掉旧连接。",
                ],
                [
                  "配置 AI 并发送消息",
                  "保存模型配置并开启自动回复，在企业微信中测试一轮对话。",
                ],
              ]
          ).map(([title, desc], i) => (
            <div className="guide-step" key={title}>
              <span className="step">{i + 1}</span>
              <div>
                <b>{title}</b>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </section>
        <section className="panel runtime">
          <div className="panel-head">
            <h3>当前运行环境</h3>
            <span className="dot" />
          </div>
          {[
            ["应用版本", data?.version || "—"],
            ["部署模式", data?.mode || "—"],
            ["数据库", data?.database || "—"],
            ["运行时长", data ? `${Math.floor(data.uptime / 60)} 分钟` : "—"],
            ["访问地址", data?.publicUrl || "—"],
          ].map(([k, v]) => (
            <div className="runtime-row" key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
          <div className="form-note">
            <CircleHelp size={16} />
            <p>
              本版不支持多进程或多副本。后续扩容需要共享数据库与机器人连接租约，不能直接增加实例数。
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
function Audit() {
  const [page, setPage] = useState(1),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  const load = () =>
    api(`/audit?page=${page}`)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [page]);
  return (
    <>
      <PageHead
        eyebrow="ACTIVITY LOG"
        title="操作日志"
        description="记录配置变更、连接事件和消息发送结果，不记录密钥。"
      >
        <Button secondary onClick={load}>
          <RefreshCw size={16} /> 刷新日志
        </Button>
      </PageHead>
      {error && <div className="error">{error}</div>}
      <section className="panel">
        {data?.rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>操作事件</th>
                  <th>对象 / 说明</th>
                  <th>发生时间</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="audit-action">
                        <Activity size={16} />
                        {a.action}
                      </span>
                    </td>
                    <td>{a.detail}</td>
                    <td className="muted">{fmt(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Activity}
            title="暂无操作记录"
            detail="机器人配置和连接事件会显示在这里。"
          />
        )}
        <Pagination data={data} page={page} setPage={setPage} />
      </section>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
