import MarkdownIt from "npm:markdown-it@13.0.1";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export function parseMarkdownToCells(source: string) {
  // simple conversion: code fences become executable cells
  const tokens = md.parse(source, {});
  let out = [];
  out.push(`<html><head><meta charset="utf-8"><title>Notebook</title><link rel="stylesheet" href="/public/style.css"></head><body>`);
  out.push(`<div id="root"><a href="/">← Home</a><div class="post">`);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "fence") {
      const lang = t.info ? t.info.trim() : "text";
      const content = escapeHtml(t.content);
      const cellId = "cell-" + Math.random().toString(36).slice(2,9);
      out.push(`<div class="cell" data-lang="${lang}" data-id="${cellId}">`);
      out.push(`<pre class="code">${content}</pre>`);
      out.push(`<div class="controls"><button class="run">Run</button></div>`);
      out.push(`<pre class="output" data-output-for="${cellId}"></pre>`);
      out.push(`</div>`);
    } else if (t.type === "inline" || t.type === "paragraph_open" || t.type === "paragraph_close" || t.type === "text") {
      // render the token using markdown-it toHtml for simplicity
      const slice = md.renderer.render([t], md.options, {});
      out.push(slice);
    } else {
      // fallback render
      const slice = md.renderer.render([t], md.options, {});
      out.push(slice);
    }
  }
  out.push(`</div></div><script type="module" src="/public/app.js"></script></body></html>`);
  return out.join("");
}

function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}