import "server-only";
import type { Server } from "socket.io";

// Set by server.mjs. Missing under `next dev` without the custom server: emits become no-ops.
function io(): Server | undefined {
  return (globalThis as unknown as { io?: Server }).io;
}

export function emit(room: string | null, event: string, data: unknown) {
  const s = io();
  if (!s) return;
  if (room) s.to(room).emit(event, data);
  else s.emit(event, data);
}
