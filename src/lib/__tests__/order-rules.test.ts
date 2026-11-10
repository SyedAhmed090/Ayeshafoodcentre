import { describe, expect, it } from "vitest";
import { OrderError, validateOrderInput, type PlaceOrderInput } from "@/lib/order-rules";

const ok: PlaceOrderInput = {
  name: " Ali ",
  phone: "+92 300 1234567",
  address: "House 5, Street 2, Sector 5C",
  payment: "COD",
  lines: [{ id: 1, qty: 2 }],
  screenshot: null,
};

describe("validateOrderInput", () => {
  it("normalises name and phone", () => {
    expect(validateOrderInput(ok)).toEqual({
      name: "Ali",
      phone: "03001234567",
      address: "House 5, Street 2, Sector 5C",
      lines: [{ id: 1, qty: 2 }],
    });
  });

  it("drops zero-quantity lines but rejects an empty cart", () => {
    expect(validateOrderInput({ ...ok, lines: [{ id: 1, qty: 1 }, { id: 2, qty: 0 }] }).lines).toEqual([{ id: 1, qty: 1 }]);
    expect(() => validateOrderInput({ ...ok, lines: [{ id: 1, qty: 0 }] })).toThrow("Your cart is empty.");
  });

  it("needs a screenshot for wallet payments", () => {
    expect(() => validateOrderInput({ ...ok, payment: "WALLET" })).toThrow("screenshot");
    expect(() => validateOrderInput({ ...ok, payment: "WALLET", screenshot: Buffer.from("x") })).not.toThrow();
  });

  it.each([
    ["bad phone", { phone: "12345" }],
    ["short address", { address: "x" }],
    ["no name", { name: " " }],
    ["unknown payment", { payment: "CARD" as "COD" }],
    ["duplicate item", { lines: [{ id: 1, qty: 1 }, { id: 1, qty: 1 }] }],
    ["too many of one item", { lines: [{ id: 1, qty: 21 }] }],
    ["fractional quantity", { lines: [{ id: 1, qty: 1.5 }] }],
    ["negative quantity smuggled with a real line", { lines: [{ id: 1, qty: 1 }, { id: 2, qty: -3 }] }],
  ])("rejects %s", (_, patch) => {
    expect(() => validateOrderInput({ ...ok, ...patch })).toThrow(OrderError);
  });
});
