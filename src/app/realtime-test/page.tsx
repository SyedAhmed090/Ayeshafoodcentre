"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Phase 0 check: a route handler emits through the custom server and this page receives it live.
export default function RealtimeTest() {
  const [transport, setTransport] = useState<string | null>(null);
  const [pings, setPings] = useState<string[]>([]);

  useEffect(() => {
    const socket = io();
    // "websocket" = live sockets work on this host; "polling" = Socket.IO fell back to long polling.
    socket.on("connect", () => {
      setTransport(socket.io.engine.transport.name);
      socket.io.engine.on("upgrade", (t) => setTransport(t.name));
    });
    socket.on("disconnect", () => setTransport(null));
    socket.on("ping", (d: { at: string }) => setPings((p) => [d.at, ...p]));
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-bold">Realtime test</h1>
      <p className={transport ? "text-ready-ink" : "text-accent-ink"}>
        Socket: {transport ? `connected (${transport})` : "not connected"}
      </p>
      <button
        className="h-14 rounded-2xl bg-accent font-semibold text-white"
        onClick={() => fetch("/api/realtime-test", { method: "POST" })}
      >
        Send ping from server
      </button>
      <ul className="text-muted">
        {pings.map((p) => (
          <li key={p}>Received {p}</li>
        ))}
      </ul>
    </main>
  );
}
