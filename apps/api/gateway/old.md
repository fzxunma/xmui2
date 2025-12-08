
// await kvfs.syncFromDisk([
//     { vfsPath: "/static", diskPath: "./public", autoSave: true },
//     { vfsPath: "/uploads", diskPath: "./uploads", autoSave: true },
//     { vfsPath: "/admin-ui", diskPath: "./apps/admin/dist", autoSave: false },
//     { vfsPath: "/web-ui", diskPath: "./apps/web/dist", autoSave: false },
// ]);
/*
console.log("KVFS 静态资源已就绪（持久化 + 热更新 + 自动保存）");
const serveFromKVFS = (prefix) => {
  return async (c) => {
    let path = c.req.path;
    if (path.startsWith(prefix)) {
      let vfsPath = prefix + path.slice(prefix.length);
      if (vfsPath.endsWith("/")) vfsPath += "index.html";

      try {
        const data = await kvfs.readFile(vfsPath);
        const ext = vfsPath.split(".").pop()?.toLowerCase() || "";
        const mime = {
          js: "application/javascript",
          css: "text/css",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          svg: "image/svg+xml",
          ico: "image/x-icon",
          json: "application/json",
          html: "text/html",
        }[ext] || "application/octet-stream";

        return new Response(data, {
          headers: {
            "content-type": mime,
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        return c.text("Not Found", 404);
      }
    }
  };
};

// ==================== 从 KVFS 提供静态文件 ====================
const mimeMap = {
    html: "text/html", css: "text/css", js: "application/javascript",
    json: "application/json", png: "image/png", jpg: "image/jpeg",
    jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml",
    ico: "image/x-icon", wasm: "application/wasm"
};

app.use("/static/*", async (c) => {
  let path = c.req.path;
  if (path.endsWith("/")) path += "index.html";
  const vfsPath = "/static" + path.replace(/^\/static/, "") || "/index.html";

  try {
    const data = await kvfs.readFile(vfsPath);
    const ext = vfsPath.split(".").pop().toLowerCase();
    return new Response(data, {
      headers: {
        "content-type": mimeMap[ext] || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // SPA fallback
    try {
      const html = await kvfs.readTextFile("/static/index.html");
      return c.html(html);
    } catch {
      return c.text("Not Found", 404);
    }
  }
});

app.use("/uploads/*", async (c) => {
  const vfsPath = "/uploads" + c.req.path.replace(/^\/uploads/, "") || "/";
  try {
    const data = await kvfs.readFile(vfsPath);
    const ext = vfsPath.split(".").pop().toLowerCase();
    return new Response(data, {
      headers: { "content-type": mimeMap[ext] || "application/octet-stream" },
    });
  } catch {
    return c.text("File not found", 404);
  }
});
*/