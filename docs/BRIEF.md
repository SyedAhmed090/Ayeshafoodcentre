# Ayesha Food Centre — Build Brief for Claude Code

## How to use this brief

Build the Ayesha Food Centre ordering system in the phases listed below, one phase at a time. Stop at the end of every phase and wait for review before starting the next.

Rules for Claude Code:
- Read this whole brief and the screen designs before writing any code. Then propose a folder structure and confirm it before Phase 0 starts.
- Treat the screen designs as the source of truth for layout, sizes, colours and wording. Do not invent new screens, features or copy that this brief does not ask for. Ask instead.
- Keep the staff screens exactly as simple as designed. Never add text, menus, settings or extra steps to the front desk or rider screens.
- Menu items, prices, rider names and the merchant number in the designs are placeholders. Load them from the database (seed data), never hard-code them.
- At the end of each phase, write a short summary: what was built, how to run it, what to test by hand, and any open questions.
- Commit at the end of each phase with a clear message (for example `phase-1: customer ordering site`).

## Project overview

Ayesha Food Centre is a single-branch fast food shop in North Karachi. It needs online ordering with home delivery, a counter screen for online and walk-in orders, and a screen for its delivery riders. The front desk staff and riders cannot read well, so the staff screens run on colours, icons, big numbers and big buttons.

| Part | Who uses it | Device | Look |
|---|---|---|---|
| Customer website | Customers | Their phones (desktop later) | Polished and animated |
| Front desk dashboard | Counter person | One tablet at the counter | Very simple, large targets |
| Rider app | Delivery riders | Their own Android phones | Very simple, one order at a time |
| Owner admin | Shop owner / CloudXbloom | Phone or laptop | Normal admin UI |

All four parts are one application with one database. The staff parts are installable web apps (PWA), not Play Store apps.

## Design principles (non-negotiable)

Staff must never need to read a sentence or type anything. Every rule below applies to the front desk and rider screens.
- **One action per tap.** Each button moves an order exactly one step forward.
- **Colour + icon + one or two words** for every state, never words alone. The same colour means the same state everywhere.
- **Big targets:** at least 56 px tall on the tablet and 60 px on the rider phone. Amounts in very large numbers.
- **Sound for anything new:** a loud repeating chime for a new order until it is tapped, and sound plus vibration on the rider phone.
- **No typing for staff.** Walk-ins are built by tapping food photos and +/− buttons. Riders log in by tapping their photo and entering a 4-digit PIN.
- **Mistakes are recoverable.** Every status change can be undone for 10 seconds with an undo button.
- **All staff-facing words live in one language file** (`en` now), so Urdu can be added later without touching components.
- **Animation goes on the customer website only.** Staff screens get quick, functional motion only (a card sliding to its new column, a flash for a new order).
- **Fast on cheap phones and weak mobile data.** Compressed images, no heavy libraries on the customer site.

## Tech stack and hosting

One Node.js app deployed on Hostinger's Node.js hosting, with a MySQL database on the same account.

| Area | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One codebase for all four parts |
| Real-time | Socket.IO on a custom Node server | Orders appear on the counter and rider phones instantly |
| Database | MySQL via Prisma | Available on Hostinger |
| Styling | Tailwind CSS with the Look B tokens below | Matches the designs exactly |
| Animation | Framer Motion, customer site only | Smooth transitions without heavy code |
| Images | Stored in an `uploads/` folder, resized with `sharp` | Menu photos, rider photos, payment screenshots |
| Staff apps | PWA (manifest + service worker) | Installable on the tablet and rider phones |
| Rider alerts | Web Push via the service worker | Rings the rider's phone even when the app is in the background |

Practical notes:
- Confirm that Hostinger's plan allows a custom server with WebSockets before Phase 0 ends. If it does not, fall back to Server-Sent Events plus polling and say so.
- Browsers block sound until the user taps once. The counter and rider screens need a one-time "Tap to start" screen at the start of each shift, then keep the screen awake with the Wake Lock API.
- Keep all secrets in environment variables. Provide a `.env.example`.

## Data model and order states

The order status is the backbone of the whole system: every screen is a view of orders in certain states. Order numbers are short (`#48`) and restart every day.

Core tables:
- **Category:** name, sort order, active.
- **MenuItem:** category, name, price (whole rupees), photo, sold-out flag, active, sort order.
- **Customer:** name, phone (unique), last address. No password.
- **Order:** daily number, type (`delivery` or `walkin`), payment method (`cod` or `wallet`), status, customer, address, subtotal, delivery fee, total, rider, screenshot, timestamps for every status change.
- **OrderItem:** order, menu item, name and price copied at the time of order, quantity.
- **PaymentScreenshot:** order, file path, SHA-256 hash (to flag the same screenshot used twice), checked by, result.
- **Rider:** name, photo, 4-digit PIN (hashed), active, current status (`free` or `out`).
- **Device / StaffSession:** which tablet or phone is logged in as counter or which rider.
- **Settings:** shop open/closed, delivery fee, merchant number, shop phone.

Order states and who moves them:

| From | To | Who | Button |
|---|---|---|---|
| (placed, wallet) | `check_payment` | System | — |
| (placed, cash) | `new` | System | — |
| `check_payment` | `new` (paid) | Counter | Money came |
| `check_payment` | `new` (switched to cash) or `cancelled` | Counter | No money → pick one |
| `new` | `cooking` | Counter | Start cooking |
| `cooking` | `ready` | Counter | Food ready |
| `ready` (delivery) | `out_for_delivery` | Counter | Tap a rider's photo |
| `ready` (walk-in) | `completed` | Counter | Given to customer |
| `out_for_delivery` | `delivered` | Rider | Delivered |

A walk-in order is created in `new`, already paid in cash, so it moves across the same board as online orders. A rider becomes `out` when assigned and `free` again when he taps Delivered.

## Key flows

**Online order (customer)**
- Customer browses the menu, adds items, opens the cart.
- Checkout asks for name, phone and address only. The phone and address are remembered on that device for next time.
- Customer picks Cash on delivery or JazzCash / Easypaisa.
- On placing the order, the customer lands on a status page at a private link (random token, not the order number). It updates live: Payment received (wallet only) → Cooking → On the way (with rider name and call button) → Delivered.

**Wallet payment (manual check)**
- Checkout shows the shop's merchant number with a Copy button and the exact total to send.
- The customer pays in their own app and uploads a screenshot. The order cannot be placed without one.
- The order appears in the blue Check column on the counter, with a chime.
- The counter person opens it, sees the screenshot and the amount in very large numbers, checks the shop's merchant app, and taps **Money came** or **No money**.
- No money gives two big choices: switch the order to cash on delivery, or cancel it. Both update the customer's status page and show a Call button for the customer.
- If the same screenshot file (same hash) was already used on another order, show a red warning on the check screen.

**Walk-in order (counter)**
- Tap Walk-in order, tap food photos, adjust with +/−. The total updates live.
- Tap **Cash taken**. The order joins the board in New.
- When ready, tap **Given to customer**.

**Rider assignment and delivery**
- When a delivery order is Ready, the counter taps **Pick rider** and sees every rider's photo, marked Free or Out on delivery.
- Tapping a free rider assigns the order. His phone rings and vibrates and shows a full-screen red New order alert with the amount to collect.
- He taps **Go**, then has three buttons: Call (opens the dialler), Map (opens Google Maps with the address) and **Delivered**.
- Delivered marks him Free again and adds the cash to his total for the day.

## Design system and screens

The approved look is "Look B · Clean Counter": light, minimal, soft shadows, one deep red accent. Put these tokens in the Tailwind config and use nothing else.

| Token | Value | Use |
|---|---|---|
| Ink | `#171717` | Text, dark buttons |
| Ground | `#F1F0EC` | Page background, chips |
| Surface | `#FFFFFF` | Cards |
| Line | `#E4E2DC` | Card borders, dividers |
| Muted text | `#5E5E5E` | Secondary text |
| Accent red | `#C8281E` | Main customer buttons, New state |
| Check blue | `#2456D6` (tint `#E5ECFC`, text `#1B3FA0`) | Payment check state |
| New red tint | `#FBE6E3` (text `#8E1A12`) | New column header |
| Cooking amber | `#F2B01E` (tint `#FFF1CC`, text `#5F4400`) | Cooking state |
| Ready green | `#1F7A45` (tint `#E1F3E8`, text `#17693A`) | Ready, paid, delivered |
| Fonts | Space Grotesk (headings, numbers), Inter (body) | Google Fonts |
| Radius | 12–16 px buttons, 18–22 px cards | — |
| Card shadow | `0 6px 16px rgba(23,23,23,0.05)` | Cards |

Screens (I will hand these over as exported images; build each one to match):

| Screen | Route | Device size |
|---|---|---|
| Customer · Menu | `/` | Phone 390 px wide |
| Customer · Checkout | `/checkout` | Phone |
| Customer · Order status | `/order/[token]` | Phone |
| Counter · Orders board | `/counter` | Tablet landscape 1180 × 820 |
| Counter · Check payment | `/counter/check/[id]` | Tablet |
| Counter · Walk-in order | `/counter/walkin` | Tablet |
| Counter · Pick a rider | `/counter/rider/[id]` | Tablet |
| Rider · New order | `/rider` (alert state) | Phone 390 px wide |
| Rider · Delivery | `/rider` (active order) | Phone |

The customer site must also work well on desktop; there is no desktop design yet, so propose one in Phase 1 that keeps the same tokens. Gray boxes labelled "Food photo" or "Rider photo" in the designs are where real images go.

## Build phases

Six phases, each ending in a review stop. Do not start a phase until the previous one is approved.

### Phase 0 · Foundations
- Next.js + TypeScript project, custom server with Socket.IO, Prisma + MySQL, Tailwind with the tokens above, fonts loaded.
- Full database schema from this brief, with migrations.
- Seed script with placeholder categories, menu items, 3 riders and settings.
- Language file for all staff-facing words.
- Deployment notes for Hostinger, including the WebSocket check.

**Done when:** the app runs locally, the database seeds, and a test page receives a live Socket.IO message.

### Phase 1 · Customer website
- Menu, checkout and order status screens built to the designs.
- Cart, delivery fee, cash and wallet payment, screenshot upload with hashing.
- Order status page at a private link, updating live.
- Animation with Framer Motion: page transitions, item added to cart, status steps filling in. Respect reduced-motion settings.
- Shop closed state, sold-out items shown greyed out.
- Desktop layout proposal.

**Done when:** an order placed on a phone appears in the database with the right status, and the status page updates when the status is changed by hand.

### Phase 2 · Front desk dashboard
- Orders board with Check, New, Cooking and Ready columns, live updates, chime for new orders until tapped.
- Payment check screen with Money came / No money and the switch-to-cash or cancel choice; duplicate-screenshot warning.
- Walk-in order screen.
- Counter login by device PIN, "Tap to start" screen for sound, screen kept awake.
- 10-second undo on every status change.

**Done when:** a full online order and a walk-in can be taken from New to Ready on the tablet, and the customer's status page follows along.

### Phase 3 · Rider app
- Pick-a-rider screen on the counter, with free/out status.
- Rider login by photo + PIN, new order alert with sound, vibration and Web Push, delivery screen with Call, Map and Delivered.
- PWA install for the rider phones.

**Done when:** an order goes from the counter to a rider's phone (also with the app in the background) and back to Free after delivery.

### Phase 4 · Owner admin
- Password login for the owner.
- Edit categories, items, prices, photos, sold-out flags; edit riders and PINs; settings (open/closed, delivery fee, merchant number).
- Daily report: number of orders, sales total, cash vs wallet, cash each rider should hand over.
- List of wallet orders with their screenshots for checking against the merchant statement.

**Done when:** the owner can change a price and see it on the website, and the day's report matches the orders placed in testing.

### Phase 5 · Shop testing and launch
- Load the real menu, photos, riders and merchant number.
- Test with the real counter person and riders on the real devices; fix anything they hesitate over.
- Deploy to Hostinger with the domain, HTTPS and daily database backups.

**Done when:** the shop runs a full day of real orders on the system.

## Inputs still needed from the shop

Build with placeholders until these arrive; none of them block Phases 0–4.
- Full menu with categories and prices
- Food photos (and deal photos)
- Delivery area and delivery fee
- Shop opening hours
- JazzCash / Easypaisa merchant number
- Shop phone number
- Number of riders, their names and photos
- Logo, if the shop has one
- Domain name
- Confirmation of the Hostinger plan (Node.js + WebSockets)
