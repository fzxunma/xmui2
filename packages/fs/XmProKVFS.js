let _instance = null;
let _kv = null;

export async function getKVFS(dbPathOrKv = undefined) {
  if (_instance) return _instance;

  if (typeof dbPathOrKv === "string" || dbPathOrKv === undefined) {
    _kv = await Deno.openKv(dbPathOrKv);
  } else if (dbPathOrKv?.atomic) {
    _kv = dbPathOrKv;
  } else {
    throw new Error("Invalid dbPathOrKv must be string or Deno.Kv");
  }

  _instance = new XmProKVFS(_kv);
  return _instance;
}

class XmProKVFS {
  constructor(kv) {
    this.kv = kv;
    this.watchers = new Set();           // 存放磁盘监听器
    this.autoSavePaths = new Set();      // 需要自动写回磁盘的虚拟路径
  }

  // ==================== 原始核心方法（略，保持不变） ====================
  normalize(path) {
    if (path === "/") return "";
    const parts = path.split("/").filter(p => p && p !== ".");
    const stack = [];
    for (const part of parts) {
      if (part === "..") stack.pop();
      else stack.push(part);
    }
    return "/" + stack.join("/");
  }

  pathToKey(vfsPath) {
    // 强制规范化 + 保证以 / 开头
    const normalized = this.normalize(vfsPath);
    if (normalized === "") return ["kvfs"];

    // 关键：确保不会产生多余的空字符串
    const parts = normalized.split("/").filter(Boolean);
    return ["kvfs", ...parts];
  }

  dirPrefix(path) {
    return this.pathToKey(path);
  }

  async mkdir(path, { recursive = true } = {}) { /* 同之前实现 */
    path = this.normalize(path);
    if (path === "/") return;
    const parts = path.split("/").filter(Boolean);
    const ops = [];
    for (let i = 1; i <= parts.length; i++) {
      const sub = "/" + parts.slice(0, i).join("/");
      const key = this.pathToKey(sub);
      const e = await this.kv.get(key);
      if (e.value?.type === "directory") continue;
      if (e.value) throw new Error(`EEXIST: not directory ${sub} ${JSON.stringify(e)}`);
      ops.push({ type: "set", key, value: { type: "directory", created: Date.now(), modified: Date.now(), size: 0 } });
    }
    if (ops.length) {
      const a = this.kv.atomic();
      ops.forEach(op => a.check({ key: op.key, versionstamp: null }).set(op.key, op.value));
      await a.commit();
    }
  }


  async readFile(path) {
    const key = this.pathToKey(path);
    const meta = await this.kv.get(key);
    if (!meta.value || meta.value.type !== "file") throw new Error(`ENOENT: ${path}`);
    const c = await this.kv.get([...key, "content"]);
    if (!c.value) throw new Error(`Corrupted: ${path}`);
    return c.value;
  }

  async readTextFile(vfsPath) {
    const contentEntry = await this.kv.get([...this.pathToKey(vfsPath), "content"]);
    if (!contentEntry.value) throw new Error(`ENOENT: ${vfsPath}`);

    const value = contentEntry.value;
    return typeof value === "string" ? value : new TextDecoder().decode(value);
  }

  // ==================== 修复1：writeFile 必须更新 meta + content，同时写回磁盘 ===//
  async writeFile(vfsPath, data) {
    const content = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const dir = vfsPath.slice(0, vfsPath.lastIndexOf("/")) || "/";
    await this.mkdir(dir, { recursive: true });

    const key = this.pathToKey(vfsPath);
    const old = await this.kv.get(key);
    const created = old.value?.created || Date.now();

    // 关键：必须用 atomic 2 次 set，否则 versionstamp 不一致！
    await this.kv.atomic()
      .set(key, { type: "file", created, modified: Date.now(), size: content.byteLength })
      .set([...key, "content"], content)
      .commit();

    // 自动写回磁盘
    if (this.autoSavePaths.has(vfsPath) || [...this.autoSavePaths].some(p => vfsPath.startsWith(p + "/") || vfsPath === p)) {
      await this._saveSingleFileToDisk(vfsPath);
    }
  }


  // ==================== 新增：磁盘同步功能 ====================

  /**
   * 从真实磁盘目录加载文件到 KVFS（支持多目录）
   * @param {Array<{vfsPath: string, diskPath: string, autoSave?: boolean}>} dirs
   *        vfsPath: 虚拟路径（如 "/public"）
   *        diskPath: 真实磁盘路径（如 "./public"）
   *        autoSave: true = KVFS 中修改后自动写回磁盘（默认 false）
   */
  async syncFromDisk(dirs) {
    for (const { vfsPath, diskPath, autoSave = false } of dirs) {
      const vfsPathNormalize = this.normalize(vfsPath);
      if (!vfsPathNormalize || vfsPathNormalize === "/") throw new Error("vfsPath cannot be root");

      if (autoSave) {
        this.autoSavePaths.add(vfsPathNormalize);
      }

      console.log(`[KVFS] Loading ${diskPath} → ${vfsPathNormalize}`);

      try {
        for await (const entry of Deno.readDir(diskPath)) {
          const realPath = `${diskPath}/${entry.name}`;
          const virtualPath = `${vfsPathNormalize}/${entry.name}`;

          if (entry.isDirectory) {
            await this.syncFromDisk([{ vfsPath: virtualPath, diskPath: realPath, autoSave }]);
          } else if (entry.isFile) {
            const data = await Deno.readFile(realPath);
            await this.writeFile(virtualPath, data);
            console.log(`  ✓ ${virtualPath}`);
          }
        }
      } catch (e) {
        if (e.name !== "NotFound") throw e;
      }

      // 可选：监听真实磁盘变化 → 自动同步到 KVFS（热更新）
      this._watchDiskDir(diskPath, vfsPath);
    }
  }

  /** 手动把整个 KVFS（或指定路径）保存回磁盘 */
  async saveToDisk(vfsPath = "/") {
    vfsPath = this.normalize(vfsPath);
    const prefix = this.dirPrefix(vfsPath);

    for await (const entry of this.kv.list({ prefix })) {
      if (entry.key.length <= prefix.length) continue;

      const relPath = entry.key.slice(prefix.length);
      const fullVfsPath = vfsPath + "/" + relPath.filter(Boolean).join("/");

      if (relPath[relPath.length - 1] === "content") {
        const fileVfsPath = "/" + relPath.slice(0, -1).filter(Boolean).join("/");
        const diskPath = this._vfsToDiskPath(fileVfsPath);
        if (!diskPath) continue;

        await Deno.mkdir(new URL(diskPath, import.meta.url).pathname, { recursive: true }).catch(() => { });
        await Deno.writeFile(new URL(diskPath, import.meta.url).pathname, entry.value);
        console.log(`Saved: ${fileVfsPath} → ${diskPath}`);
      }
    }
  }

  // 内部：虚拟路径 → 真实磁盘路径（根据 syncFromDisk 时注册的映射）
  _diskMap = new Map(); // vfsPath → diskPath（前缀映射）

  _registerDiskMapping(vfsPath, diskPath) {
    this._diskMap.set(this.normalize(vfsPath), diskPath.replace(/\/+$/, ""));
  }

  _vfsToDiskPath(vfsPath) {
    vfsPath = this.normalize(vfsPath);
    for (const [vfs, disk] of this._diskMap) {
      if (vfsPath === vfs || vfsPath.startsWith(vfs + "/")) {
        return disk + vfsPath.slice(vfs.length);
      }
    }
    return null;
  }

  // 当 KVFS 中文件变化且配置了 autoSave 时，自动写回磁盘
  async _saveSingleFileToDisk(vfsPath) {
    const diskPath = this._vfsToDiskPath(vfsPath);
    if (!diskPath) return;

    try {
      const data = await this.readFile(vfsPath);
      const fullDiskPath = new URL(diskPath, import.meta.url).pathname;
      await Deno.mkdir(new URL(".", fullDiskPath).pathname, { recursive: true });
      await Deno.writeFile(fullDiskPath, data);
      console.log(`Auto saved: ${vfsPath} → ${diskPath}`);
    } catch (e) {
      console.error("Auto save failed:", vfsPath, e);
    }
  }

  // 监听真实磁盘目录变化 → 自动同步到 KVFS（可选热更新）
  _watchDiskDir(diskPath, vfsPath) {
    try {
      const absDiskPath = Deno.realPathSync(diskPath);

      const watcher = Deno.watchFs(absDiskPath, { recursive: true });
      this.watchers.add(watcher);

      this._diskMap.set(this.normalize(vfsPath), absDiskPath);

      // 正确！这行不会炸
      console.log(`[KVFS] 监听磁盘目录: ${absDiskPath} → ${vfsPath} (autoSave: ${this.autoSavePaths.has(vfsPath)})`);

      (async () => {
        for await (const event of watcher) {
          if (!["create", "modify", "remove"].includes(event.kind)) continue;

          for (const filePath of event.paths) {
            if (!filePath.endsWith(".vue")) continue;

            const relPath = filePath
              .replace(absDiskPath, "")
              .replace(/\\/g, "/")
              .replace(/^\/+/, "");

            if (!relPath) continue;

            const vfsFilePath = (vfsPath + "/" + relPath).replace(/\/+/g, "/");

            // 直接写入 content 节点 + 字符串（最快最稳）
            try {
              if (event.kind === "remove") {
                await this.kv.delete([...this.pathToKey(vfsFilePath), "content"]);
                await this.kv.delete(this.pathToKey(vfsFilePath)); // 同时删 meta
                console.log(`[Hot Update] 删除: ${vfsFilePath}`);
              } else {
                const content = await Deno.readTextFile(filePath);
                const key = this.pathToKey(vfsFilePath);
                await this.kv.atomic()
                  .set(key, { type: "file", created: Date.now(), modified: Date.now(), size: content.length })
                  .set([...key, "content"], content)
                  .commit();
                console.log(`[Hot Update] 同步成功: ${vfsFilePath}`);
              }
            } catch (e) {
              console.error(`[Hot Update] 失败 ${vfsFilePath}:`, e.message);
            }
          }
        }
      })();
    } catch (e) {
      console.warn("[KVFS] 无法监听磁盘目录（权限？）:", diskPath, e.message);
    }
  }


  // 其他方法（readdir、stat、watch...）保持不变，可继续使用
  async readdir(path) { /* 同前 */
    const prefix = this.dirPrefix(this.normalize(path));
    const set = new Set();
    for await (const e of this.kv.list({ prefix })) {
      if (e.key.length > prefix.length) set.add(e.key[prefix.length]);
    }
    return Array.from(set);
  }
  async rm(path, { recursive = false } = {}) {
    path = this.normalize(path);
    if (path === "/") throw new Error("Cannot remove root");

    const key = this.pathToKey(path);
    const meta = await this.kv.get(key);
    if (!meta.value) throw new Error(`ENOENT: ${path}`);

    if (meta.value.type === "directory" && !recursive) {
      for await (const e of this.kv.list({ prefix: key })) {
        if (e.key.length > key.length) {
          throw new Error(`Directory not empty: ${path}`);
        }
      }
    }

    const deletes = [];
    for await (const e of this.kv.list({ prefix: key })) {
      deletes.push({ type: "delete", key: e.key });
    }
    if (deletes.length > 0) {
      await this.kv.atomic().commit(deletes);
    }
  }

  async rename(oldPath, newPath) {
    oldPath = this.normalize(oldPath);
    newPath = this.normalize(newPath);
    if (oldPath === newPath) return;

    const oldKey = this.pathToKey(oldPath);
    const newKey = this.pathToKey(newPath);

    const snapshot = new Map();
    for await (const e of this.kv.list({ prefix: oldKey })) {
      snapshot.set(e.key, e.value);
    }
    if (snapshot.size === 0) throw new Error(`ENOENT: ${oldPath}`);

    const parent = newPath.substring(0, newPath.lastIndexOf("/")) || "/";
    await this.mkdir(parent, { recursive: true });

    const ops = [];
    const now = Date.now();

    for (const [k, v] of snapshot) {
      const rel = k.slice(oldKey.length);
      const target = rel.length === 0 ? newKey : [...newKey, ...rel];
      if (rel.length === 0) {
        ops.push({ type: "set", key: target, value: { ...v, modified: now } });
      } else {
        ops.push({ type: "set", key: target, value: v });
      }
      ops.push({ type: "delete", key: k });
    }

    await this.kv.atomic().commit(ops);
  }

  async readdir(path) {
    path = this.normalize(path);
    const prefix = this.dirPrefix(path);
    const set = new Set();
    for await (const e of this.kv.list({ prefix })) {
      if (e.key.length > prefix.length) {
        set.add(e.key[prefix.length]);
      }
    }
    return Array.from(set);
  }

  async exists(path) {
    return (await this.kv.get(this.pathToKey(this.normalize(path)))).value !== null;
  }

  async stat(path) {
    const meta = await this.kv.get(this.pathToKey(this.normalize(path)));
    if (!meta.value) throw new Error(`ENOENT: ${path}`);
    return {
      isFile: () => meta.value.type === "file",
      isDirectory: () => meta.value.type === "directory",
      size: meta.value.size || 0,
      mtime: meta.value.modified,
      ctime: meta.value.created,
    };
  }

  // 监听（返回取消函数）
  watch(path = "/", callback) {
    console.log(path)
    const prefix = this.dirPrefix(path).map(k => String(k));
    console.log("watch", prefix, path)
    const watcher = this.kv.watch([{ prefix }]);

    (async () => {
      for await (const changes of watcher) {
        for (const entry of changes) {
          console.log(entry)
          if (!entry) continue;
          const fullPath = "/" + entry.key.slice(2).join("/");
          if (entry.versionstamp === null) {
            callback("remove", fullPath);
          } else {
            callback("modify", fullPath);
          }
        }
      }
    })();

    return () => watcher.close();
  }
  // ==================== 关键修复 2：fallbackToFsWatch 完美路径映射 ====================
  fallbackToFsWatch(paths, cache) {
    const diskToVfsMap = {
      "./packages/components": "/components",
      "./packages/pages": "/pages",
      "./packages/store": "/store",
    };

    const vfsToDiskMap = Object.fromEntries(
      Object.entries(diskToVfsMap).map(([disk, vfs]) => [vfs, disk])
    );

    for (const vfsPrefix of paths) {
      const diskPath = vfsToDiskMap[vfsPrefix];
      if (!diskPath) continue;

      let normalizedDiskPath;
      try {
        normalizedDiskPath = Deno.realPathSync(diskPath).replace(/\\/g, "/"); // ← 定义
      } catch {
        console.warn(`[Hot Update FS] 路径不存在: ${diskPath}`);
        continue;
      }

      console.log(`[Hot Update FS] 监听磁盘目录: ${normalizedDiskPath} → ${vfsPrefix}`);

      const watcher = Deno.watchFs(normalizedDiskPath, { recursive: true });
      const updateSet = new Set();

      (async () => {
        for await (const event of watcher) {
          if (!["create", "modify", "remove"].includes(event.kind)) continue;

          for (const absolutePath of event.paths) {
            if (!absolutePath.endsWith(".vue")) continue;

            if (updateSet.has(absolutePath)) continue;
            updateSet.add(absolutePath);
            setTimeout(() => updateSet.delete(absolutePath), 50);

            const normalizedPath = absolutePath.replace(/\\/g, "/");
            if (!normalizedPath.startsWith(normalizedDiskPath)) continue;

            const relativePath = normalizedPath
              .slice(normalizedDiskPath.length)
              .replace(/^\/+/, "");

            const vfsPath = (diskToVfsMap[normalizedDiskPath] || vfsPrefix) +
              (relativePath ? "/" + relativePath : "");

            cache.delete(vfsPath);
            console.log(`[Hot Update FS] 检测到变化: ${absolutePath} → ${vfsPath}`);

            try {
              if (event.kind === "remove") {
                await this.kv.delete(this.pathToKey(vfsPath));
                console.log(`[Hot Update FS] 从 KV 删除: ${vfsPath}`);
              } else {
                const content = await Deno.readTextFile(absolutePath);
                const key = this.pathToKey(vfsPath);
                await this.kv.set(key, content);
                console.log(`[Hot Update FS] 同步成功: ${vfsPath}`);
              }
            } catch (err) {
              console.error(`[Hot Update FS] 同步失败 ${vfsPath}:`, err.message);
            }
          }
        }
      })();
    }
  }


  // 辅助：磁盘路径 → VFS 路径
  _diskToVfsPath(diskPath, baseDisk) {
    const rel = diskPath.replace(baseDisk, '');
    const map = {
      "./packages/components": "/components",
      "./packages/pages": "/pages",
      "./packages/stores": "/stores",
    };
    const baseVfs = Object.entries(map).find(([d, v]) => baseDisk.startsWith(d))?.[1] || '/';
    return baseVfs + rel;
  }
}

// ==================== 使用示例（一键启动） ====================

// main.js
// import { getKVFS } from "./kvfs-pro.js";

// const kvfs = await getKVFS(); // 单例
// 第一次调用会初始化，后面所有调用都返回同一个实例
// const fs = await getKVFS();                    // 默认本地数据库
// // const fs = await getKVFS(":memory:");       // 内存数据库（重启即丢失）
// // const fs = await getKVFS("./data/myapp.kv"); // 自定义路径

// await fs.mkdir("/uploads/avatar", { recursive: true });
// await fs.writeFile("/uploads/hello.txt", "Hello 单例 KVFS!");
// // 一行代码完成：加载磁盘目录 → KVFS，并开启双向同步！
// await kvfs.syncFromDisk([
//   { vfsPath: "/public",   diskPath: "./public",   autoSave: true  }, // 修改后自动写回
//   { vfsPath: "/uploads",  diskPath: "./uploads",  autoSave: false }, // 只读镜像
//   { vfsPath: "/config",   diskPath: "./config",   autoSave: true  },
// ]);

// console.log(await kvfs.readdir("/public"));

// 现在你可以这样用：
//   http://localhost:8000/public/avatar.jpg  → 直接从 KVFS 读（超快 + 持久化 + 可编辑后自动保存！）

// 手动触发一次全量保存
// setInterval(() => kvfs.saveToDisk(), 60000); // 每分钟保存一次