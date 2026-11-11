# Ayesha Food Centre — ordering system

**Status (2026-11-11): Phase 5 (shop testing + launch) started.** Phases 0–4 done; the user moved on to Phase 5 without answering the Phase 3–4 points below (treat as accepted unless they say otherwise). Code-side launch prep is done (nightly backups, DEPLOY.md launch checklist). The rest is blocked on the user: Hostinger access + domain, and the shop's real menu, photos, riders and merchant number.

## Resume here

1. `git fetch` and check you're up to date with `origin/main` (last commit: `phase-5: nightly backups and launch checklist`).
2. Re-read the live brief doc in case it changed since `docs/BRIEF.md` was copied.
3. Phase 5 = DEPLOY.md "Launch checklist". Ask the user for what's still missing (Hostinger access, domain, shop data) before doing anything on the server. Deploying is outward-facing: confirm each step with the user.
4. Start the database and `npm run dev` (see "Run it locally"). Stopping a background `npm run dev` leaves `node server.mjs --dev` running (it holds `.next/dev/lock`, whose `pid` is the process to kill), or the next start fails with "Another next dev server is already running".

### Open points for the user to approve (raised, not yet answered)

- Phase 4 has no design: normal admin UI in Look B tokens (top tabs Report · Wallet · Menu · Riders · Settings). Review the layout on the owner's phone.
- Report: "Orders" = everything not cancelled; Sales/Cash/Wallet count only finished orders (delivered or handed over), unfinished ones are listed as "not finished yet". Cash to hand over = counter (walk-ins) + each rider's delivered cash orders, adding up to Total cash.
- Owner login lasts 30 days per device; changing the password logs out the owner's other devices. The first password comes from `SEED_OWNER_PASSWORD` via the seed.
- Changing a rider's PIN, or unticking "Working here", logs that rider's phone out. Changing the counter PIN does not log the tablet out.
- Nothing is ever deleted from the menu or riders: they are hidden ("Shown" / "Working here"), so old orders and reports keep their names.
- Picking an item as "Today's deal" unpicks the previous one (the menu shows one deal card).
- Not tried on real devices yet (user: "testing later"): rider push in the background, vibration, wake lock, PWA install, counter chime; admin on the owner's phone.
- Phase 3 points (no answer yet, assumed fine when the user moved on): rider login / Free screen / rider Undo bar had no design; paid wallet orders show "Paid" instead of an amount; Map searches address + ", Karachi"; rider PIN limits 5 per phone / 10 per rider / 30 total.
- Hukam (separate project) is still on Next 16.4.0, which has critical advisories; offered to upgrade it (no answer yet).

### Phase 5 (shop testing + launch): what's next

From the brief: load the real menu, photos, riders and merchant number (through the admin); test with the real counter person and riders on the real devices and fix anything they hesitate over; deploy to Hostinger with the domain, HTTPS and daily database backups (DEPLOY.md). Then do the Hostinger WebSocket check and remove `/realtime-test`.

## Run it locally

1. Start the local database (portable MariaDB 11.4 shared with hukam, port 3307):
   `~/.local/mariadb-11.4.5-winx64/bin/mariadbd.exe --defaults-file=~/.local/hukam-db/my.ini --console`
2. `.env` is not in git: copy `.env.example` (local `DATABASE_URL="mysql://ayesha:ayesha-dev@127.0.0.1:3307/ayesha"`, absolute `UPLOAD_DIR`).
3. `npm install && npx prisma migrate deploy && npm run db:seed`
4. `npm run dev` (runs `server.mjs --dev`, NOT `next dev`, otherwise no Socket.IO) → http://localhost:3000
5. Counter: http://localhost:3000/counter → PIN `1234` once, then "Tap to start". Rider: http://localhost:3000/rider in another browser profile (each profile is one device) → tap a rider, PIN, "Tap to start". Web Push only works with VAPID keys in `.env` (see `.env.example`); without them the open app still rings.
6. `npm test` runs the unit tests.

Seed logins: counter PIN `1234`, riders 1/2/3 PINs `1111`/`2222`/`3333`, owner `/admin` password = `SEED_OWNER_PASSWORD` in `.env` (local: `owner-dev-123`).

## Where things are

- `server.mjs`: custom server, Next + Socket.IO on one port; sets `globalThis.io`.
- `src/lib/realtime.ts`: `emit(room, event, data)` for route handlers and server actions.
- `src/lib/i18n/en.ts`: every staff-facing word (add `ur.ts` with the same keys later).
- `src/app/globals.css`: Look B tokens in Tailwind 4 `@theme` (the default palette is switched off, so only these colours exist).
- `prisma/schema.prisma` + `prisma/seed.ts`; `DEPLOY.md` for Hostinger.
- Customer site: `src/app/(customer)/` (menu `/`, `/checkout`, `/order/[token]`), views in `src/components/customer/`. `Motion.tsx` sets reduced motion to follow the phone's setting.
- `src/lib/cart.ts`: cart + remembered name/phone/address in this device's localStorage; `useHydrated()` for storage-dependent screens.
- `src/lib/orders.ts`: `placeOrder` (prices from DB, race-safe daily number, customer upsert by phone), `getPublicOrder` (what the status page may see), `announce` (socket push to `order:<token>`, `counter`, and `rider:<id>` when given), plus the counter and rider functions below.
- `src/lib/order-rules.ts`: pure input checks, the move table and undo rules (unit tested in `src/lib/__tests__`).
- `src/lib/uploads.ts`: screenshots hashed (SHA-256 of the file as uploaded), then resized with sharp and stored under `UPLOAD_DIR/screenshots/`.
- API: `POST /api/orders` (multipart), `GET /api/orders/[token]`, `GET /api/counter/board`, `GET /api/counter/screenshot/[id]` (counter and owner), `GET /api/rider/current` (rider phone only), Phase 0 `/realtime-test` (keep until the Hostinger WebSocket check is done).
- Shared icons: `src/components/icons.tsx`. `src/components/Photo.tsx`: a stored photo or the design's grey placeholder box.
- Owner admin: `src/app/admin/` — `login/`, `(panel)/` (report `page.tsx`, `wallet/`, `menu/` + `menu/[id]`, `riders/` + `riders/[id]`, `settings/`; layout requires the owner), `actions.ts` (every action goes through `owner()`, which checks the login, turns `AdminError`/`UploadError` into a form message, and revalidates `/admin` so forms refill with saved values). Form pieces in `src/components/admin/` (`ActionForm` = useActionState wrapper, `ui.tsx`).
- Nightly backup: `src/lib/backup.ts` (data-only SQL dump, gzipped, last 14 kept in `BACKUP_DIR`) + pure `backup-sql.ts` (tested), called by `GET /api/cron/backup` with `CRON_SECRET` (`src/lib/cron.ts`). Ported from hukam. Restore verified locally by table checksums.
- `src/lib/report.ts`: the daily report from a day's orders (pure, unit tested). `src/lib/admin-rules.ts`: admin form reading/checks (pure, unit tested).
- Photos: `uploads.ts` `savePhoto` (square, sharp, `UPLOAD_DIR/menu|riders/<random>.jpg`), served by `src/app/media/[kind]/[file]/route.ts` (public, immutable cache; only our random names). `src/lib/media.ts` `mediaUrl()`. Replaced or removed photos are deleted from disk.
- Animations must never make the server-rendered first view invisible (see `template.tsx`, `StepIcon`): only live changes animate.
- Counter: `src/app/counter/` — `login/` (PIN pad), `(desk)/` (board `page.tsx`, `check/[id]`, `walkin/`; layout requires the counter device), `actions.ts` (every action checks the device). Views in `src/components/staff/`.
- `CounterShell.tsx` (in the counter layout): live board data, chime until a new card is tapped, Tap to start, undo bar. Kept in the layout so they work on every counter screen.
- Shared staff pieces in `src/components/staff/`: `TapToStart` (unlocks audio + wake lock), `UndoBar`, `PinPad`, `RiderPhoto`.
- Counter pick-a-rider: `counter/(desk)/rider/[id]` + `PickRiderView`. `orders.ts` `assignRider` (rider FREE→OUT and order READY→OUT_FOR_DELIVERY in one transaction, both conditional, so a rider can't get two orders) and `markDelivered`. Undo of a pick is the existing `undoOrder`; undo of Delivered refuses if the rider was already sent out again.
- Rider app: `src/app/rider/` (`login/`, `page.tsx`, `actions.ts`), view `RiderApp.tsx` (free → red alert ringing + vibrating until Go → delivery screen → Delivered). Which order this phone tapped Go on is in localStorage.
- Web Push: `src/lib/push.ts` (VAPID from env, sent after the response, dead subscriptions cleared), subscription stored on `Device`, saved on Tap to start. Service worker served by `src/app/sw.js/route.ts` (scope `/rider`, notifications only, no caching); install manifest `src/app/rider.webmanifest/route.ts`; icons in `public/icons/`.
- `src/lib/staff-auth.ts`: a staff device logs in once (PIN) and keeps an httpOnly cookie for a year; only the token's hash is stored (`Device`).
- `src/lib/order-rules.ts` `MOVES` + `undoTarget`: the state machine and undo, pure and unit tested. `orders.ts` `moveOrder`/`undoOrder` apply them with a conditional update (`WHERE status = from`), so double taps and two devices can't move an order twice.
- Socket rooms: `order:<token>` (customer status page, gets the public order), `counter` (gets only `{id}`; the board reloads through `/api/counter/board`, which needs the counter cookie), `rider:<id>` (gets nothing but "changed"; the phone reloads through `/api/rider/current`).
- `server.mjs` routes WebSocket upgrades: `/socket.io/` to Socket.IO, everything else to Next. Without that, Socket.IO kills Next's dev hot-reload socket and pages never hydrate under `npm run dev`.

## What this is

Online ordering + delivery for a single-branch fast food shop in North Karachi. One Next.js app, one MySQL DB, four parts:

| Part | Route | Device | Look |
|---|---|---|---|
| Customer site | `/`, `/checkout`, `/order/[token]` | Phone 390px (desktop later) | Polished, Framer Motion |
| Front desk | `/counter`, `/counter/check/[id]`, `/counter/walkin`, `/counter/rider/[id]` | Tablet 1180×820 landscape | Huge buttons, no reading |
| Rider app | `/rider` (alert state + active order) | Rider's Android phone 390px | One order at a time |
| Owner admin | `/admin` (report, wallet, menu, riders, settings) | Phone/laptop | Normal admin UI |

Staff and riders **can't read well**: colour + icon + 1–2 words per state, no typing, one tap = one step, sound for new things, 10s undo on every status change.

## Sources of truth

- `docs/BRIEF.md` — full build brief (rules, data model, order states, flows, tokens, 6 phases). Read it whole first.
  Live original: https://claude.ai/artifact/G3n6KReyjHok6Vok9n8BBc (Claude Doc, may have been edited since; re-read if in doubt)
- `designs/*.dc.html` — the 12 screens as HTML source (exact sizes, colours, copy in inline styles).
  Live canvas: https://claude.ai/artifact/6VXBVuxfEtvfMUyhkDep52
  These are Design-canvas files (`<x-dc>`, `{{holes}}`, `<sc-for>`, `support.js` not included) — they don't open standalone; read them as spec.
  `designs/canvas.json` maps file → screen title and size.
  - Customer: `Main` (menu), `Checkout`, `Status`
  - Counter: `CounterOrders`, `CounterCheck`, `CounterWalkin`, `CounterRider`
  - Rider: `RiderAlert`, `RiderDelivery`
  - `LookA/B/C` = the three style options. **Look B "Clean Counter" was approved**; A and C are reference only.

## The brief's process rules (follow these)

1. Read the brief + designs, then **propose a folder structure and get it confirmed** before Phase 0.
2. One phase at a time; **stop for review** after each. End each phase with a summary (built / how to run / what to test by hand / open questions) and a commit like `phase-1: customer ordering site`.
3. Don't invent screens, features or copy; ask. Never add stuff to staff screens.
4. Menu items, prices, rider names, merchant number are placeholders → seed data, never hard-coded.

Phases: 0 Foundations → 1 Customer site → 2 Front desk → 3 Rider app → 4 Owner admin → 5 Shop testing + launch.

## Stack (from brief)

Next.js App Router + TS, custom Node server with Socket.IO, Prisma + MySQL, Tailwind (Look B tokens only), Framer Motion (customer site only), `sharp` for uploads into `uploads/`, PWA + Web Push for staff, Wake Lock + "Tap to start" screen for audio unlock.

## Order state machine (core of everything)

```
placed+wallet → check_payment ──Money came──→ new (paid)
                              └─No money──→ new (switched to cash) | cancelled
placed+cash   → new
walk-in       → new (already paid cash)
new → cooking → ready ─┬─ delivery: Pick rider → out_for_delivery → (rider) delivered
                       └─ walk-in: Given to customer → completed
```
Every screen is a view of orders in some states. Store a timestamp per status change. Rider is `out` when assigned, `free` again on Delivered.

## Gaps in the brief noted before Phase 0 (all handled; kept for context)

- **Fonts:** brief says Google Fonts (Space Grotesk + Inter). On Hostinger, `next/font/google` is a known problem with Next 16 builds → self-host the same two fonts (`@fontsource` or local woff2). Same look, not a design change.
- **Hostinger + custom server + WebSockets:** brief wants this confirmed in Phase 0 with SSE+polling fallback. Known Hostinger Next quirks: build with `next build --webpack`, server cwd ≠ project dir (resolve paths from `__dirname`), `/public` bypasses `next.config` headers. `uploads/` must live outside the build output and be served by a route.
- **Prisma migrations on Windows MariaDB lowercase table names** → fix case in `migration.sql` before deploying to Hostinger (Linux MySQL is case-sensitive).
- **Daily order number** (#48, resets daily): reset on Karachi time (PKT, UTC+5), not server UTC. Needs a race-safe counter (e.g. a per-day row with atomic increment).
- **Undo (10s)** must reverse side effects too: rider assignment undo puts the rider back to `free`; wallet "No money → cash" undo restores `check_payment`.
- **Rider's cash for the day** = computed from delivered cash orders, not a stored running total.
- **Counter login "by device PIN"** — brief doesn't say who sets the PIN; assume owner sets it in Settings (Phase 4), seed one for dev. Confirm.
- **Customer status link** uses a random token, not the order number. Customer has no password; phone is unique key.
- **Duplicate screenshot** check = SHA-256 of the uploaded file; same hash on another order → red warning on check screen.
- Customer desktop layout has no design — Phase 1 must *propose* one with the same tokens.
- Brief says designs come "as exported images"; we have the HTML source instead, which is better (exact values).

## Look B tokens (in `src/app/globals.css` `@theme`; nothing else exists)

Ink `#171717` · Ground `#F1F0EC` · Surface `#FFFFFF` · Line `#E4E2DC` · Muted `#5E5E5E` · Accent red `#C8281E`
Check blue `#2456D6` (tint `#E5ECFC`, text `#1B3FA0`) · New tint `#FBE6E3` (text `#8E1A12`)
Cooking amber `#F2B01E` (tint `#FFF1CC`, text `#5F4400`) · Ready green `#1F7A45` (tint `#E1F3E8`, text `#17693A`)
Radius 12–16 buttons, 18–22 cards · Card shadow `0 6px 16px rgba(23,23,23,0.05)` · Space Grotesk headings/numbers, Inter body.
The designs' off-list greys were added as extra tokens (`ink-2`, `line-2`, `accent-ink`, … in `globals.css`) so screens match exactly.

## Inputs still needed from the shop (none block Phases 0–4)

Full menu + prices, food/deal photos, delivery area + fee, opening hours, JazzCash/Easypaisa merchant number, shop phone, riders (names, photos), logo, domain, Hostinger plan confirmation (Node.js + WebSockets).

## Decisions made in Phase 0

- Folder structure approved by the user 2026-11-10.
- Next pinned to 16.4.6: 16.0–16.4.0 has critical advisories (GHSA-2464-fhr4-w9xw and others).
- The server is `server.mjs` (plain JS) rather than `server.ts`, so Hostinger runs it with no compile step.
- Undo needs no event table: each state's previous state follows from the state machine, plus `paymentMethod`/screenshot (a wallet order switched to cash = COD with a screenshot). The 10s window comes from the status timestamp.
- "Paid" is derived (walk-in, or a wallet order past CHECK_PAYMENT), not stored.
- Socket.IO falls back to long polling by itself if WebSockets are blocked, which covers the brief's SSE+polling fallback (see DEPLOY.md §4).

## Decisions made in Phase 1

- Schema additions the designs needed (not in the brief's table): `MenuItem.description` (deal card's "2 burgers · 2 fries · 1.5L drink"), `MenuItem.featured` ("Today's deal" card; owner picks it in Phase 4), `Rider.phone` (status page "Call rider" button).
- The deal card is the whole button: tapping it adds the deal (the design has no + on it).
- Status page wording not in the designs: titles per status, "Starting soon" (NEW), "Waiting for the rider" (READY), "Payment not found / Please pay cash to the rider" (switched to cash), cancelled text. Review with the user.
- Desktop proposal = same tokens, wider container: menu grid 3–4 columns, checkout in two columns, status page centred.
- Shop closed: header says "Closed now", + buttons and Place order disabled, API refuses. Sold out: card greyed, "Sold out" instead of +.
- Prisma migrate dev lowercased `menuitem` and `rider` in two migrations; fixed by hand (see DEPLOY.md gotchas).

## Decisions made in Phase 2

- Counter PIN screen has no design: 4 dots + 88px number pad in Look B tokens. 5 wrong tries per address, and 20 in total across all addresses (the forwarded address can be faked), lock it for 5 minutes. The limiter is in memory (`rate-limit.ts`, marked `shortcut:`).
- "No money" screen has no design: the two big buttons become "Cash on delivery" (dark, bike icon) and "Cancel order" (red outline), and "Call customer" appears in the header.
- New orders flash a red outline (not a fading card, which looked disabled) and the chime repeats every 2.5 s until the card is tapped. Which cards were tapped is remembered on the tablet (localStorage), so a reload doesn't re-ring old orders. Walk-ins made at the counter never ring.
- Undo bar: one slot (the last action), bottom centre, "Undo #48" with a 10 s bar. The server allows 13 s for slow connections. Undoing a walk-in that was just created cancels it.
- Cards slide between columns with Framer Motion layout animation. The brief says Framer is for the customer site only, but it also asks for this slide; this was the least code. Easy to drop if the owner prefers no motion.
- Board order follows the design: newest first in each column.
- "Pick rider" on Ready delivery cards links to `/counter/rider/[id]` (built in Phase 3).

## Decisions made in Phase 3

- Rider assignment isn't in `MOVES`: it needs a rider and a second row (`assignRider` in `orders.ts`). One order at a time is enforced by the rider row's FREE status inside the same transaction.
- The rider phone rings (chime every 2.5 s + vibration) until Go. Push notifications use `requireInteraction` and vibration, with urgency high and a 10-minute TTL.
- Push subscription allowlist: only Chrome/Firefox/Safari/Edge push hosts are accepted, since the server POSTs to that URL.
- Only the rider app is installable (manifest linked from the rider layout). The counter tablet can get the same later if wanted.
- `/api/dev/status` and `applyStatus` were removed: riders can deliver now.

## Decisions made in Phase 4

- Owner login reuses the device cookie (`Device` with role `OWNER`, new enum value + migration `owner_role`; the migration's table name was lowercased by Windows MariaDB and fixed by hand). Expires after 30 days on the server side too. Same rate limits as the counter PIN.
- Server actions accept 9 MB (`next.config.ts`) so phone photos can be uploaded; `uploads.ts` caps a photo at 8 MB.
- Report days are Karachi days (`Order.day`), picked with ‹ › arrows or a date box (plain GET links, no JS needed).
- Wallet page: every order with a screenshot that day, its check result and time, "Switched to cash"/"Cancelled", and a red note when the same screenshot file was used on any other order.
- Quick "Mark sold out" button in the menu list, because sold-out is the change made most during the day.
