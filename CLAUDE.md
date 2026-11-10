# Ayesha Food Centre — ordering system

**Status (2026-11-10): not started.** No code yet; this repo holds the brief and the screen designs only.
Next step is the "Before Phase 0" list below.

## What this is

Online ordering + delivery for a single-branch fast food shop in North Karachi. One Next.js app, one MySQL DB, four parts:

| Part | Route | Device | Look |
|---|---|---|---|
| Customer site | `/`, `/checkout`, `/order/[token]` | Phone 390px (desktop later) | Polished, Framer Motion |
| Front desk | `/counter`, `/counter/check/[id]`, `/counter/walkin`, `/counter/rider/[id]` | Tablet 1180×820 landscape | Huge buttons, no reading |
| Rider app | `/rider` (alert state + active order) | Rider's Android phone 390px | One order at a time |
| Owner admin | (Phase 4, no design) | Phone/laptop | Normal admin UI |

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

## Things I noticed that the brief leaves open / to raise at Phase 0

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

## Look B tokens (put in Tailwind config, use nothing else)

Ink `#171717` · Ground `#F1F0EC` · Surface `#FFFFFF` · Line `#E4E2DC` · Muted `#5E5E5E` · Accent red `#C8281E`
Check blue `#2456D6` (tint `#E5ECFC`, text `#1B3FA0`) · New tint `#FBE6E3` (text `#8E1A12`)
Cooking amber `#F2B01E` (tint `#FFF1CC`, text `#5F4400`) · Ready green `#1F7A45` (tint `#E1F3E8`, text `#17693A`)
Radius 12–16 buttons, 18–22 cards · Card shadow `0 6px 16px rgba(23,23,23,0.05)` · Space Grotesk headings/numbers, Inter body.
Designs also use a few off-token greys (`#3F3F3F`, `#CFCDC6`, `#8A8780`, `#6B6B6B`, `#A81F16`); decide at Phase 0 whether to add them as tokens or map them.

## Inputs still needed from the shop (none block Phases 0–4)

Full menu + prices, food/deal photos, delivery area + fee, opening hours, JazzCash/Easypaisa merchant number, shop phone, riders (names, photos), logo, domain, Hostinger plan confirmation (Node.js + WebSockets).

## Before Phase 0 (resume here)

1. `git fetch` and check you're up to date with `origin/main`.
2. Re-read the live brief doc in case it changed since this copy.
3. Propose the folder structure → wait for OK → start Phase 0.
