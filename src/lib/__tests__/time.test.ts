import { describe, expect, it } from "vitest";
import { formatMinute, shopStatus } from "@/lib/time";

// Karachi is UTC+5: 07:00 UTC is 12:00 pm there.
const at = (karachiHHMM: string) => new Date(`2026-11-12T${karachiHHMM}:00+05:00`);
const hours = (open: number | null, close: number | null, shopOpen = true) => ({ shopOpen, openMinute: open, closeMinute: close });

describe("shopStatus", () => {
  it("follows the switch when no hours are set", () => {
    expect(shopStatus(hours(null, null), at("03:00")).open).toBe(true);
    expect(shopStatus(hours(null, null, false), at("13:00"))).toEqual({ open: false, opensAt: null });
  });

  it("opens and closes on the hours within a day", () => {
    const h = hours(12 * 60, 23 * 60);
    expect(shopStatus(h, at("11:59"))).toEqual({ open: false, opensAt: "12:00 pm" });
    expect(shopStatus(h, at("12:00")).open).toBe(true);
    expect(shopStatus(h, at("22:59")).open).toBe(true);
    expect(shopStatus(h, at("23:00")).open).toBe(false);
  });

  it("stays open past midnight when closing is earlier than opening", () => {
    const h = hours(12 * 60, 2 * 60);
    expect(shopStatus(h, at("23:30")).open).toBe(true);
    expect(shopStatus(h, at("01:59")).open).toBe(true);
    expect(shopStatus(h, at("02:00"))).toEqual({ open: false, opensAt: "12:00 pm" });
  });

  it("the switch off closes it even within the hours", () => {
    expect(shopStatus(hours(12 * 60, 23 * 60, false), at("13:00"))).toEqual({ open: false, opensAt: null });
  });
});

describe("formatMinute", () => {
  it("writes 12-hour times", () => {
    expect([0, 30, 12 * 60, 13 * 60 + 5, 23 * 60 + 59].map(formatMinute)).toEqual(["12:00 am", "12:30 am", "12:00 pm", "1:05 pm", "11:59 pm"]);
  });
});
