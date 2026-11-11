import { describe, expect, it } from "vitest";
import { insertStatements, sqlValue } from "@/lib/backup-sql";

describe("sqlValue", () => {
  it("writes each type as a MySQL literal", () => {
    expect(sqlValue(null)).toBe("NULL");
    expect(sqlValue(true)).toBe("1");
    expect(sqlValue(42)).toBe("42");
    expect(sqlValue(new Date("2026-10-13T08:05:09.123Z"))).toBe("'2026-10-13 08:05:09.123'");
    expect(sqlValue([{ text: "doodh" }])).toBe(`'[{"text":"doodh"}]'`);
  });
  it("escapes quotes, backslashes and newlines", () => {
    expect(sqlValue("Ali's\nshop \\ 5C")).toBe("'Ali\\'s\\nshop \\\\ 5C'");
  });
});

describe("insertStatements", () => {
  it("batches rows into multi-row inserts", () => {
    const rows = [{ id: 1, name: "a" }, { id: 2, name: "b" }, { id: 3, name: null }];
    expect(insertStatements("shops", rows, 2)).toEqual([
      "INSERT INTO `shops` (`id`, `name`) VALUES\n(1, 'a'),\n(2, 'b');",
      "INSERT INTO `shops` (`id`, `name`) VALUES\n(3, NULL);",
    ]);
    expect(insertStatements("shops", [])).toEqual([]);
  });
});
