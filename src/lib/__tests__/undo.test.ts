import { describe, expect, it } from "vitest";
import { MOVES, undoTarget, type UndoFacts } from "@/lib/order-rules";

const t0 = new Date("2026-11-10T12:00:00Z");
const after = (ms: number) => new Date(t0.getTime() + ms);
const base: UndoFacts = {
  status: "NEW",
  type: "DELIVERY",
  hasScreenshot: false,
  createdAt: t0,
  paymentCheckedAt: null,
  cookingAt: null,
  readyAt: null,
  outAt: null,
  deliveredAt: null,
  completedAt: null,
  cancelledAt: null,
};

describe("undoTarget", () => {
  it("steps each status back one", () => {
    expect(undoTarget({ ...base, status: "COOKING", cookingAt: t0 }, after(2000))?.to).toBe("NEW");
    expect(undoTarget({ ...base, status: "READY", readyAt: t0 }, after(2000))?.to).toBe("COOKING");
    expect(undoTarget({ ...base, status: "COMPLETED", type: "WALKIN", completedAt: t0 }, after(2000))?.to).toBe("READY");
    expect(undoTarget({ ...base, status: "OUT_FOR_DELIVERY", outAt: t0 }, after(2000))?.to).toBe("READY");
    expect(undoTarget({ ...base, status: "DELIVERED", deliveredAt: t0 }, after(2000))?.to).toBe("OUT_FOR_DELIVERY");
  });

  it("sends a checked or cancelled wallet order back to Check", () => {
    expect(undoTarget({ ...base, hasScreenshot: true, paymentCheckedAt: t0 }, after(1000))?.to).toBe("CHECK_PAYMENT");
    expect(undoTarget({ ...base, status: "CANCELLED", hasScreenshot: true, cancelledAt: t0 }, after(1000))?.to).toBe("CHECK_PAYMENT");
  });

  it("cancels a walk-in made by mistake", () => {
    expect(undoTarget({ ...base, type: "WALKIN" }, after(1000))?.to).toBe("CANCELLED");
  });

  it("won't undo what the counter didn't do", () => {
    expect(undoTarget(base, after(1000))).toBeNull(); // customer's cash order
    expect(undoTarget({ ...base, status: "CHECK_PAYMENT" }, after(1000))).toBeNull();
    expect(undoTarget({ ...base, status: "CANCELLED" }, after(1000))).toBeNull();
  });

  it("closes after 10 seconds (plus a little for slow connections)", () => {
    const o = { ...base, status: "COOKING" as const, cookingAt: t0 };
    expect(undoTarget(o, after(12_000))).not.toBeNull();
    expect(undoTarget(o, after(14_000))).toBeNull();
  });
});

describe("MOVES", () => {
  it("moves every order exactly one step forward", () => {
    expect(MOVES.startCooking).toEqual({ from: "NEW", to: "COOKING" });
    expect(MOVES.given.walkinOnly).toBe(true);
  });
});
