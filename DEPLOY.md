# Deploying to Hostinger

One Node.js app (Next.js + Socket.IO in `server.mjs`) plus one MySQL database on the same Hostinger account.

## 1. Database

hPanel → Databases → MySQL Databases: create a database and user, then note host, name, user and password.

## 2. Node.js app

hPanel → Websites → Node.js app (or "Add website → Node.js"):

| Setting | Value |
|---|---|
| Node version | 22 or newer (needs ≥ 20.19) |
| Install command | `npm install` |
| Build command | `npm run build` (runs `prisma generate && next build --webpack`; Turbopack crashes on Hostinger) |
| Entry file / start | `server.mjs` (start command `npm start`) |

**The entry must be `server.mjs`, not `next start`.** `next start` runs without Socket.IO, so nothing would update live.

Environment variables (see `.env.example`):
- `DATABASE_URL` = `mysql://USER:PASSWORD@HOST:3306/DATABASE`
- `UPLOAD_DIR` = an **absolute** folder outside `public_html`, e.g. `/home/<user>/ayesha-uploads`. Hostinger starts the server from a different working folder, so relative paths break.
- `PORT` is set by Hostinger; leave it unset there.
- `SEED_COUNTER_PIN` = the counter tablet's 4-digit PIN for the first seed.

## 3. First deploy

Over SSH in the app folder:
```
npx prisma migrate deploy
npm run db:seed
```
Then restart the app from hPanel.

## 4. WebSocket check (brief: confirm in Phase 0)

Open `https://<domain>/realtime-test`, tap **Send ping from server**.
- `connected (websocket)` and a "Received …" line → live sockets work. Done.
- `connected (polling)` and a "Received …" line → Hostinger's proxy blocks WebSockets, and Socket.IO has already fallen back to HTTP long polling. Orders still arrive live, just with a bit more delay and load. This covers the brief's "SSE + polling" fallback with no extra code, as long as the app runs as **one** process (polling needs every request to reach the same process).
- `not connected` → the app isn't running through `server.mjs`. Check the entry file.

Delete `src/app/realtime-test` and `src/app/api/realtime-test` once the Phase 2 board uses live updates.

## Gotchas already known from other projects on this host

- **Fonts are self-hosted** (`src/app/fonts/`). `next/font/google` fetches at build time and fails on Hostinger.
- **`/public` is served by the web server directly**, bypassing `next.config` headers. Keep uploads out of `/public`; serve them through a route from `UPLOAD_DIR`.
- **Migration table-name case:** the local Windows MariaDB lowercases table names in migrations that `prisma migrate dev` generates for `ALTER TABLE`. Hostinger's Linux MySQL is case-sensitive. After every `migrate dev`, check `migration.sql` uses model case (`Order`, `MenuItem`) and fix it before deploying.
- Shared hosting caps MySQL connections, so the Prisma pool is kept at 5 (`src/lib/db.ts`).

## Backups (Phase 5)

Daily database backups are part of Phase 5 (launch).
