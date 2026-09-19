import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const password = env.match(/^ADMIN_PASSWORD=(.*)$/m)[1];
mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_EXECUTABLE
    ? { executablePath: process.env.CHROME_EXECUTABLE }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1040 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173");
await page.screenshot({
  path: "artifacts/home-desktop.png",
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("link", { name: "接入能力" }).click();
if (!page.url().endsWith(":5173/"))
  throw new Error("Feature anchor changed route");
await page.goto("http://localhost:5173/#/overview");
await page.getByLabel("管理员密码").fill(password);
await page.getByRole("button", { name: "登录控制台" }).click();
await page.getByRole("heading", { name: "工作台概览" }).waitFor();
await page.screenshot({
  path: "artifacts/console-desktop.png",
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("button", { name: "接入机器人", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.screenshot({
  path: "artifacts/bot-dialog.png",
  animations: "disabled",
});
await page.getByRole("button", { name: "关闭", exact: true }).click();
await page.getByRole("link", { name: "AI 模型配置", exact: true }).click();
await page.getByLabel("API 基础地址").waitFor();
await page.screenshot({
  path: "artifacts/model-desktop.png",
  fullPage: true,
  animations: "disabled",
});
for (const [link, heading] of [
  ["机器人管理", "机器人管理"],
  ["消息中心", "消息中心"],
  ["部署与接入", "部署与接入"],
  ["操作日志", "操作日志"],
]) {
  await page.getByRole("link", { name: link, exact: true }).click();
  await page.getByRole("heading", { name: heading, exact: true }).waitFor();
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:5173/#/overview");
await page.getByRole("heading", { name: "工作台概览" }).waitFor();
await page.screenshot({
  path: "artifacts/console-mobile.png",
  fullPage: true,
  animations: "disabled",
});
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw new Error("Mobile console overflows");
await page.getByRole("button", { name: "展开菜单" }).click();
await page.getByRole("link", { name: "AI 模型配置", exact: true }).click();
await page.getByLabel("API 基础地址").waitFor();
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw new Error("Mobile settings overflows");
await page.goto("http://localhost:5173");
await page.screenshot({
  path: "artifacts/home-mobile.png",
  fullPage: true,
  animations: "disabled",
});
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw new Error("Mobile home overflows");
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  "UI smoke passed: landing, login, all admin pages, dialog, mobile viewport; no page errors.",
);
