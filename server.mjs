// Custom server: Next.js and Socket.IO share one HTTP port, so orders reach the counter and rider phones live.
// Plain JS so Hostinger can run it with `node server.mjs`, no build step for the server itself.
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 3000);
// Hostinger starts the app from another folder, so point Next at this file's folder.
const app = next({ dev, dir: import.meta.dirname });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => handle(req, res));
const io = new Server(httpServer);

io.on("connection", (socket) => {
  // A customer's status page joins its own order room; the token is the secret.
  socket.on("join:order", (token) => {
    if (typeof token === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(token)) socket.join(`order:${token}`);
  });
});

// Route handlers and server actions run in this same process and emit through this (src/lib/realtime.ts).
globalThis.io = io;

httpServer.listen(port, () => {
  console.log(`> Ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
});
