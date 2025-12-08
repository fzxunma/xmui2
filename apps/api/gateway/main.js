// apps/api/gateway/main.js
import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { getKVFS } from "@XmProKVFS";
import { XmRuntimeServer } from "@XmRuntimeServer"; // 你的新类

const app = new Hono();
const kvfs = await getKVFS("./xm.db");

// 1. 加载 .vue 源码目录
await kvfs.syncFromDisk([
  { vfsPath: "/components", diskPath: "./packages/components", autoSave: false },
  { vfsPath: "/pages", diskPath: "./packages/pages", autoSave: false },
  { vfsPath: "/store", diskPath: "./packages/store", autoSave: false },
  { vfsPath: "/config", diskPath: "./packages/config", autoSave: false },
  { vfsPath: "/utils", diskPath: "./packages/utils", autoSave: false },
  { vfsPath: "/locales", diskPath: "./packages/locales", autoSave: false },
  { vfsPath: "/color", diskPath: "./packages/color", autoSave: false },
  { vfsPath: "/hooks", diskPath: "./packages/hooks", autoSave: false },
]);

// 2. 创建 Vue 运行时服务器（全局唯一）
const vueServer = new XmRuntimeServer(kvfs);
await vueServer.start(); // 启动热更新监听

// 3. 挂载编译中间件（自动缓存 + 热更新）
app.use("/components/*", vueServer.middleware());
app.use("/pages/*", vueServer.middleware());
app.use("/store/*", vueServer.middleware());
app.use("/config/*", vueServer.middleware());
app.use("/utils/*", vueServer.middleware());
app.use("/locales/*", vueServer.middleware());
app.use("/color/*", vueServer.middleware());
app.use("/hooks/*", vueServer.middleware());
// 4. 其他静态资源（不变）
["vendor", "assets", "js"].forEach(name => {
  app.use(`/${name}/*`, serveStatic({ root: "packages/ui" }));
  app.use(`/${name}`, serveStatic({ root: "packages/ui" }));
});

["mobile", "web", "admin"].forEach(name => {
  app.use(`/${name}/*`, serveStatic({ root: "apps", index: "index.html" }));
  app.use(`/${name}`, serveStatic({ root: "apps", index: "index.html" }));
});

// API 代理（不变）
const proxy = (c, target) => { /* ...你的代码 */ };
app.all("/api/user/*", c => proxy(c, "http://localhost:8001"));
app.all("/api/web/*", c => proxy(c, "http://localhost:8002"));
app.all("/api/admin/*", c => proxy(c, "http://localhost:8003"));

app.get("/health", c => c.json({ ok: true, XmRuntime: "ready", cached: vueServer.cache.size }));

Deno.serve({ port: 8000 }, app.fetch);
console.log("XmRuntimeServer 已启动！");
console.log("   组件 → http://localhost:8000/components/Button.vue");
console.log("   页面 → http://localhost:8000/pages/admin/Dashboard.vue");
console.log("   热更新 + 编译缓存 + scoped CSS 自动注入");