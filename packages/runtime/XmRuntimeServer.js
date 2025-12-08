// 使用 Deno 的 npm 生态
import {
    parse,
    compileScript,
    compileTemplate,
    compileStyle
} from "@vue/compiler-sfc";

let _instance = null;

export class XmRuntimeServer {
    constructor(kvfs) {
        if (_instance) return _instance;
        this.kvfs = kvfs;
        this.cache = new Map();
        this.watcher = null;
        _instance = this;
    }

    async start() {
        const paths = ["/components", "/pages", "/store"];
        try {
            this.watcher = this.kvfs.fallbackToFsWatch(paths, this.cache);
            console.log("KV watch started:", paths);
        } catch (err) {
            console.warn("KV watch failed:", err.message);
        }
    }

    // 编译 .vue 文件
    async compile(vuePath) {
        const contentKey = [...this.kvfs.pathToKey(vuePath), "content"];
        const contentRes = await this.kvfs.kv.get(contentKey);
        if (!contentRes.value) throw new Error(`ENOENT: ${vuePath}`);

        // const cached = this.cache.get(vuePath);
        // if (cached && cached.versionstamp === contentRes.versionstamp) {
        //     return cached; // 只有内容变化才重新编译
        // }


        const source = await this.kvfs.readTextFile(vuePath);
        const filename = vuePath.split("/").pop();
        const { descriptor } = parse(source);

        const id = `data-v-${btoa(vuePath).replace(/=/g, "")}`;
        let code = "";
        let css = "";

        // Script (支持 <script setup>)
        const script = compileScript(descriptor, {
            id,
            inlineTemplate: false,
            reactivityTransform: true,
            propsDestructure: true
        });

        code = script.content.replace("export default", "const component =");
        code = code.replace("Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })", "")
        // Template
        if (descriptor.template) {
            const t = compileTemplate({
                id,
                filename,
                source: descriptor.template.content,
                scoped: descriptor.styles.some(s => s.scoped),
            });

            code += `\n${t.code.replace(
                "export function render",
                "component.render = function render"
            )}`;
        }

        // Styles
        for (const style of descriptor.styles) {
            const styleResult = compileStyle({
                source: style.content,
                id,
                scoped: style.scoped,
            });

            css += styleResult.code;
        }

        if (css) {
            code += `
(function(){
    const s=document.createElement('style');
    s.textContent=\`${css}\`;
    document.head.appendChild(s);
})();
`;
        }

        code += `\ncomponent.__file="${vuePath}";`;
        code += `\nexport default component;`;

        const result = {
            code,
            css,
            versionstamp: contentRes.versionstamp
        };

        this.cache.set(vuePath, result);
        return result.code;
    }

    // 超级简洁终极版 middleware（强烈推荐！）
    middleware() {
        return async (c, next) => {
            let path = c.req.path;
            if (!path.includes(".")) {
                path = path + ".js";
            }
            console.log(path)
            // 1. .vue 文件 → 实时编译
            if (path.endsWith(".vue")) {
                try {
                    const code = await this.compile(path);
                    return c.text(code, 200, {
                        "content-type": "application/javascript",
                        "cache-control": "no-cache",
                    });
                } catch (err) {
                    console.error("[XmRuntime] 编译失败", path, err);
                    return c.text(`/* Vue Compile Error: ${err.message} */`, 500);
                }
            } else {
                // 2. .js / .css / .json 等静态资源 → 直接从 KVFS 读（已缓存 + 热更新）
                try {
                    const file = await this.kvfs.readFile(path);
                    const mime = {
                        ".js": "application/javascript",
                        ".css": "text/css",
                        ".json": "application/json",
                        ".png": "image/png",
                        ".jpg": "image/jpeg",
                        ".svg": "image/svg+xml",
                    }[path.slice(path.lastIndexOf("."))] || "application/octet-stream";

                    return c.body(file, 200, {
                        "content-type": mime,
                        "cache-control": "public, max-age=31536000, immutable",
                    });
                } catch {
                    // 没找到就交给下一个中间件（比如 serveStatic 处理 html）
                    return next();
                }
            }
        };
    }
}
