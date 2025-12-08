# Deno Notebook (Minimal Template)

This project is a minimal "Jupyter-Notebook style" blog system using Deno.

**Parts included**
- `main.ts` - Deno HTTP server, Markdown renderer and execution API (/api/execute).
- `renderer/markdown.ts` - Helper to parse Markdown into cells (uses markdown-it).
- `kernel/js-kernel.ts` - Kernel that executes JS using `deno eval` (requires `--allow-run`).
- `public/index.html` - Front-end notebook UI.
- `public/app.js` - Front-end JS for rendering and running cells.
- `public/style.css` - Basic styles.
- example `posts/example.md`.

**Security note**
This template executes arbitrary JavaScript by spawning `deno eval` on the server.
**Do NOT** run this on untrusted networks or with untrusted users without additional sandboxing.
For production, implement a proper V8 isolate (deno_core) or containerized sandbox.

## Run (development)
1. Install Deno (https://deno.land)
2. Run server with permission to spawn subprocesses:
```bash
deno run --allow-net --allow-read --allow-run main.ts
```
3. Open http://localhost:8000 and click the example post. Click Run to execute cells.

## Files overview
- `posts/*.md` are markdown posts. Code blocks (triple backticks) become executable cells.
- `/api/execute` accepts POST JSON `{ code, lang }` and returns `{ stdout, stderr, result, error }`.

Enjoy — this is a starting template. See comments in source for extension ideas.