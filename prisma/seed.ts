// Placeholder data from the screen designs. Real menu, riders and merchant number arrive in Phase 5.
// Safe to re-run: skips the menu and riders if any exist, and only creates Settings once.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const u = new URL(process.env.DATABASE_URL ?? "");
const db = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
  }),
});

type Item = [name: string, price: number, extra?: { description?: string; featured?: boolean }];
const menu: [string, Item[]][] = [
  ["Deals", [["Family Deal", 1450, { description: "2 burgers · 2 fries · 1.5L drink", featured: true }]]],
  [
    "Burgers",
    [
      ["Zinger Burger", 450],
      ["Chicken Burger", 350],
      ["Beef Burger", 400],
      ["Double Zinger", 650],
      ["Fish Burger", 400],
      ["Egg Burger", 250],
      ["Kids Burger", 200],
      ["Burger + Fries", 550],
    ],
  ],
  ["Rolls", [["Chicken Roll", 300]]],
  [
    "Fries",
    [
      ["Fries", 200],
      ["Loaded Fries + Drink", 500],
    ],
  ],
  ["Drinks", [["Drink", 100]]],
];

async function main() {
  if ((await db.category.count()) === 0) {
    for (const [i, [name, items]] of menu.entries()) {
      await db.category.create({
        data: {
          name,
          sortOrder: i,
          items: { create: items.map(([n, price, extra], j) => ({ name: n, price, sortOrder: j, ...extra })) },
        },
      });
    }
    console.log("Menu seeded");
  }

  if ((await db.rider.count()) === 0) {
    for (const [i, pin] of ["1111", "2222", "3333"].entries()) {
      await db.rider.create({ data: { name: `Rider ${i + 1}`, phone: "0300 0000000", pinHash: await bcrypt.hash(pin, 10) } });
    }
    console.log("Riders seeded (PINs 1111, 2222, 3333)");
  }

  const pin = process.env.SEED_COUNTER_PIN;
  if (!pin || !/^\d{4}$/.test(pin)) throw new Error("SEED_COUNTER_PIN must be 4 digits");
  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      deliveryFee: 50,
      merchantNumber: "0300 0000000",
      shopPhone: "0300 0000000",
      counterPinHash: await bcrypt.hash(pin, 10),
    },
  });
  console.log("Settings ready");
}

main().finally(() => db.$disconnect());
