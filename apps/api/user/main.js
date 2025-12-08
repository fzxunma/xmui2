
import { Hono } from 'hono';

const app = new Hono();
app.get("/ping", (c) => c.json({ service: "user", ok: true }));
app.get("/", (c) => c.json({
  service: "User API",
  status: "running",
  endpoints: ["/ping", "/login", "/profile"],
  time: new Date()
}));
Deno.serve({
    port: 8001,
    hostname: "0.0.0.0", // 允许外网访问
    onListen({ port, hostname }) {
        console.log(`Server running on http://${hostname}:${port}`);
    }
}, app.fetch);