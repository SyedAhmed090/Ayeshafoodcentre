// Pure SQL dump helpers, shared by the backup job and tests. No database here.

/** One value as a MySQL literal. Dates are stored as UTC, so they're written as UTC. */
export function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (v instanceof Date) return `'${v.toISOString().slice(0, 23).replace("T", " ")}'`;
  if (Buffer.isBuffer(v)) return `X'${v.toString("hex")}'`;
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\0/g, "\\0").replace(/\x1a/g, "\\Z")}'`;
}

export const ident = (name: string) => `\`${name.replace(/`/g, "``")}\``;

/** INSERT statements for a table's rows, batched so no single statement gets huge. */
export function insertStatements(table: string, rows: Record<string, unknown>[], batch = 200): string[] {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const head = `INSERT INTO ${ident(table)} (${cols.map(ident).join(", ")}) VALUES\n`;
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += batch) {
    const values = rows.slice(i, i + batch).map((r) => `(${cols.map((c) => sqlValue(r[c])).join(", ")})`);
    out.push(head + values.join(",\n") + ";");
  }
  return out;
}
