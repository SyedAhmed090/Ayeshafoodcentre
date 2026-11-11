import { describe, expect, it } from "vitest";
import { AdminError, checkbox, mobile, pin, rupees, text } from "@/lib/admin-rules";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("admin form checks", () => {
  it("reads rupees with commas and refuses anything else", () => {
    expect(rupees(fd({ p: "1,450" }), "p", "Price")).toBe(1450);
    expect(rupees(fd({ p: "0" }), "p", "Price")).toBe(0);
    for (const bad of ["", "-5", "12.5", "abc", "1000001"]) expect(() => rupees(fd({ p: bad }), "p", "Price")).toThrow(AdminError);
  });

  it("wants exactly 4 digits for a PIN, or nothing when optional", () => {
    expect(pin(fd({ p: "0042" }), "p")).toBe("0042");
    expect(pin(fd({ p: "" }), "p", true)).toBeNull();
    for (const bad of ["", "123", "12345", "12a4"]) expect(() => pin(fd({ p: bad }), "p")).toThrow(AdminError);
  });

  it("stores mobiles in one format", () => {
    expect(mobile(fd({ m: "+92 300 1234567" }), "m", "Phone")).toBe("0300 1234567");
    expect(mobile(fd({ m: "" }), "m", "Phone", true)).toBeNull();
    expect(() => mobile(fd({ m: "12345" }), "m", "Phone")).toThrow(AdminError);
  });

  it("trims text and checks length; checkboxes are on or off", () => {
    expect(text(fd({ n: "  Zinger  " }), "n", "Name")).toBe("Zinger");
    expect(() => text(fd({ n: "   " }), "n", "Name")).toThrow("Name is required.");
    expect(checkbox(fd({ c: "on" }), "c")).toBe(true);
    expect(checkbox(fd({}), "c")).toBe(false);
  });
});
