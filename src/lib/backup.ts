import "server-only";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { db } from "@/lib/db";
import { ident, insertStatements } from "@/lib/backup-sql";

// Prisma's own table is rebuilt by `migrate deploy`. Device logins are kept, so after a restore
// the counter tablet and rider phones keep working without anyone typing a PIN.
const SKIP = new Set(["_prisma_migrations"]);
const KEEP = 14;

/**
 * A data-only SQL dump of every table. Restore: `npx prisma migrate deploy` on an empty
 * database, then `gunzip -c file.sql.gz | mysql <database>` (DEPLOY.md "Restoring a backup").
 */
export async function dumpDatabase(): Promise<string> {
  const tables = (await db.$queryRawUnsafe<Record<string, string>[]>("SHOW TABLES")).map((r) => Object.values(r)[0]);
  const out = [
    `-- Ayesha Food Centre data backup, ${new Date().toISOString()}`,
    "-- Restore onto a migrated, empty database (npx prisma migrate deploy first).",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "SET time_zone = '+00:00';",
  ];
  for (const t of tables.sort()) {
    if (SKIP.has(t)) continue;
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${ident(t)}`);
    out.push("", `-- ${t}: ${rows.length} rows`, `DELETE FROM ${ident(t)};`, ...insertStatements(t, rows));
  }
  out.push("", "SET FOREIGN_KEY_CHECKS = 1;", "");
  return out.join("\n");
}

function backupDir(): string {
  const dir = process.env.BACKUP_DIR;
  // Must be absolute: on Hostinger the server's working folder is not the project folder.
  if (!dir || !path.isAbsolute(dir)) throw new Error("BACKUP_DIR must be set to an absolute path");
  return dir;
}

/** Nightly job: write a gzipped dump and keep the last 14. */
export async function runBackup() {
  const dir = backupDir();
  await mkdir(dir, { recursive: true });
  const gz = gzipSync(await dumpDatabase());
  const name = `ayesha-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.sql.gz`;
  await writeFile(path.join(dir, name), gz);
  const old = (await readdir(dir)).filter((f) => /^ayesha-.*\.sql\.gz$/.test(f)).sort().slice(0, -KEEP);
  for (const f of old) await unlink(path.join(dir, f));
  return { file: name, bytes: gz.length, removed: old.length };
}
