
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (c) => c.html('<h1>web H5</h1>'));
app.get("/ping", (c) => c.json({ service: "web", ok: true }));
Deno.serve({
    port: 8002,
    hostname: "0.0.0.0", // 允许外网访问
    onListen({ port, hostname }) {
        console.log(`Server running on http://${hostname}:${port}`);
    }
}, app.fetch);