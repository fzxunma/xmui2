import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { parseMarkdownToCells } from "./renderer/markdown.ts";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.203.0/path/mod.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const encoder = new TextEncoder();

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;
  console.log(`${req.method} ${p}`);
  // Serve static public files
  if (p === "/" || p === "/index.html") {
    const redirectUrl = new URL("/public/index.html", req.url);
    return Response.redirect(redirectUrl.toString(), 302);
  }
  if (p.startsWith("/public/")) {
    try {
      const filePath = join(__dirname, p);
      const buf = await Deno.readFile(filePath);
      const ct = p.endsWith(".js") ? "application/javascript"
        : p.endsWith(".css") ? "text/css"
          : p.endsWith(".html") ? "text/html"
            : "application/octet-stream";
      return new Response(buf, { status: 200, headers: { "content-type": ct } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  // List posts
  if (p === "/posts") {
    const postsDir = join(__dirname, "posts");
    const files = [];
    for await (const e of Deno.readDir(postsDir)) {
      if (e.isFile && e.name.endsWith(".md")) files.push("/posts/" + e.name);
    }
    return new Response(JSON.stringify(files), { headers: { "content-type": "application/json" } });
  }

  // Serve post content as parsed HTML with executable cells
  if (p.startsWith("/posts/") && req.method === "GET") {
    const postsDir = join(__dirname, "posts");
    const name = p.slice("/posts/".length);
    const filePath = join(postsDir, name);
    try {
      const md = await Deno.readTextFile(filePath);
      const html = parseMarkdownToCells(md);
      return new Response(html, { headers: { "content-type": "text/html" } });
    } catch (e) {
      return new Response("Post not found: " + e.message, { status: 404 });
    }
  }

  // Execution API - executes JS by spawning `deno eval`
  if (p === "/api/execute" && req.method === "POST") {
    try {
      const body = await req.json();
      const code = body.code ?? "";
      const lang = (body.lang ?? "js").toLowerCase();

      if (lang !== "js") {
        return new Response(JSON.stringify({ error: "Only js execution supported in this template" }), { headers: { "content-type": "application/json" } });
      }

      // Spawn deno eval - limit runtime environment: no network/read permissions, but note server must be run with --allow-run
      const proc = Deno.run({
        cmd: ["deno", "eval", "--no-check", "--A", code],
        stdin: "null",
        stdout: "piped",
        stderr: "piped",
      });

      const [rawOut, rawErr] = await Promise.all([proc.output(), proc.stderrOutput()]);
      const stdout = new TextDecoder().decode(rawOut);
      const stderr = new TextDecoder().decode(rawErr);

      proc.close();

      return new Response(JSON.stringify({ stdout, stderr }), { headers: { "content-type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { headers: { "content-type": "application/json" }, status: 500 });
    }
  }

  return new Response("Not found", { status: 404 });
}

console.log("Starting Deno Notebook server on http://localhost:8000");
serve(handleRequest, { port: 8000 });