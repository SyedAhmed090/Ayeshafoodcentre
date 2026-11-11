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
- `SEED_OWNER_PASSWORD` = the owner's first `/admin` password (8+ characters). The seed only sets it while none is set; the owner then changes it in admin Settings, and you remove it from the environment.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` = rider push keys, made once with `npx web-push generate-vapid-keys` (a new pair makes every rider phone tap Start again to re-subscribe). `VAPID_SUBJECT` = `mailto:` the shop's email. Without them riders only get alerts while the app is open. Push needs HTTPS, so test it on the real domain, not by IP.
- `BACKUP_DIR` = an **absolute** folder outside `public_html` for the nightly backups, e.g. `/home/<user>/ayesha-backups`.
- `CRON_SECRET` = a random string, 16+ characters (`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`). The cron job below sends it.

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

## 5. Nightly backups

hPanel → Advanced → Cron Jobs, daily at 03:00:
```
curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/backup > /dev/null
```
If the panel won't take a header, use `https://<domain>/api/cron/backup?key=<CRON_SECRET>`.

Check it once by opening that `?key=` URL in a browser: it answers `{"ok":true,"file":"ayesha-….sql.gz",…}` and the file appears in `BACKUP_DIR`. The last 14 are kept. Also download one now and then (File Manager) or keep Hostinger's own backups on: a copy on the same server doesn't help if the server is lost.

Photos and payment screenshots are files in `UPLOAD_DIR`, not in the database backup. Copy that folder separately if the server itself is lost.

## 6. Restoring a backup

Backups are data-only SQL (`ayesha-YYYY-MM-DD-HH-MM.sql.gz`), including device logins, so the tablet and rider phones stay logged in after a restore.

1. Create an **empty** database (or empty the current one), and point `DATABASE_URL` at it.
2. `npx prisma migrate deploy`. This creates the tables at the current schema.
3. `gunzip -c ayesha-….sql.gz | mysql -h HOST -u USER -p DATABASE`
4. Restart the app.

Tested locally on 2026-11-11: every table's checksum in the restored database matched the original.

## 7. Updates after launch

1. Push to `main`. Hostinger rebuilds (or press Deploy in hPanel).
2. If the update added files in `prisma/migrations/`, run `npx prisma migrate deploy` over SSH, then restart the app.

## 8. Rider APK (Trusted Web Activity)

The APK is a thin Android shell around `https://<domain>/rider`: same screens, same push alerts, but a real app icon and no browser bar. It runs on the phone's Chrome, so Chrome must be installed and up to date. Build it only once the site is live on HTTPS (the domain is built into the APK).

1. Open https://www.pwabuilder.com, enter `https://<domain>/rider`, then **Package for stores → Android → Generate package**. In the options:
   - Package ID `com.ayeshafoodcentre.rider` (never change it later), app name and launcher name `Ayesha Rider`.
   - Start URL `/rider`. **Notification delegation: on** (push alerts show as the app's own).
   - Signing key: **Create new**.
2. The download (zip) holds `…-signed.apk` (what riders install), `signing.keystore` + `signing-key-info.txt` (the key and its passwords) and `assetlinks.json`.
3. **Keep `signing.keystore` and `signing-key-info.txt` in two safe places** (not in git). Without them an updated APK can't replace the installed one; every rider would have to uninstall and reinstall.
4. From that `assetlinks.json`, copy the package name and the `sha256_cert_fingerprints` value into the app's environment as `RIDER_APP_PACKAGE` and `RIDER_APP_SHA256`, restart, and check `https://<domain>/.well-known/assetlinks.json` shows them. (If the APK opens with a browser address bar at the top, this check failed: the fingerprint doesn't match.)
5. On each rider's phone: send the `.apk` over WhatsApp, open it, allow "Install unknown apps" for WhatsApp once, install. Open **Ayesha Rider**, tap your photo, PIN, Tap to start, **Allow** notifications. Then Settings → Apps → Ayesha Rider → Battery → **Unrestricted**, so alerts come through with the screen off.
6. Send a test order with the app closed and the screen locked; it must ring.

Updates: every change to the site reaches the APK at once. Rebuild the APK only to change its name or icon, with the **same** keystore, and send the new file (it installs over the old one).

## Launch checklist (Phase 5)

1. Domain pointed at the plan, SSL on (push alerts and installing the rider app need HTTPS).
2. Database, Node app, environment variables (§1–2), first deploy and seed (§3).
3. WebSocket check (§4), then delete `src/app/realtime-test` and `src/app/api/realtime-test`.
4. Cron backup (§5) and one manual check that a file appears.
5. Owner logs in to `/admin`, changes the password, then remove `SEED_OWNER_PASSWORD` from the environment.
6. In `/admin`: the real menu, prices and photos (hide or rename the placeholder items), riders with photos, phones and PINs (hide the three seed riders), merchant number, shop phone, delivery fee, counter PIN.
7. Counter tablet: open `/counter`, PIN, Tap to start. Check the chime is loud enough and the screen stays on.
8. Each rider's Android phone: install the rider APK (§8), or in Chrome open `/rider` and "Add to Home screen". Log in, Tap to start, allow notifications. Send a test order and check it rings with the app closed and the screen locked. Turn off battery optimisation for Chrome if it doesn't.
9. A full test day with real orders (cash, wallet with a real screenshot, walk-in); compare the admin report with the till and the merchant app.

## Gotchas already known from other projects on this host

- **Fonts are self-hosted** (`src/app/fonts/`). `next/font/google` fetches at build time and fails on Hostinger.
- **`/public` is served by the web server directly**, bypassing `next.config` headers. Keep uploads out of `/public`; serve them through a route from `UPLOAD_DIR`.
- **Migration table-name case:** the local Windows MariaDB lowercases table names in migrations that `prisma migrate dev` generates for `ALTER TABLE`. Hostinger's Linux MySQL is case-sensitive. After every `migrate dev`, check `migration.sql` uses model case (`Order`, `MenuItem`) and fix it before deploying.
- Shared hosting caps MySQL connections, so the Prisma pool is kept at 5 (`src/lib/db.ts`).
