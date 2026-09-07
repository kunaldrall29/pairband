import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export * from "./queries/early-access.js";
export * from "./queries/auth.js";
export * from "./queries/outbox.js";
export * from "./queries/preferences.js";

const { Pool } = pg;

export const DATABASE_SCHEMA_VERSION = 1;

export type DbPool = pg.Pool;
export type DbClient = pg.Pool | pg.PoolClient;

export function createPool(databaseUrl: string): DbPool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a pool");
  }
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export function migrationsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "migrations");
}

export function listMigrationIds(): string[] {
  return readdirSync(migrationsDir())
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .map((f) => f.replace(/\.sql$/, ""))
    .sort();
}

export async function migrateUp(pool: DbClient): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const applied = await pool.query<{ id: string }>(`SELECT id FROM schema_migrations ORDER BY id`);
  const have = new Set(applied.rows.map((r) => r.id));
  const appliedNow: string[] = [];
  for (const id of listMigrationIds()) {
    if (have.has(id)) continue;
    const sql = readFileSync(join(migrationsDir(), `${id}.sql`), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [id]);
      await pool.query("COMMIT");
      appliedNow.push(id);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }
  return appliedNow;
}

export async function migrateDown(pool: DbClient, id: string): Promise<void> {
  const downPath = join(migrationsDir(), `${id}.down.sql`);
  const sql = readFileSync(downPath, "utf8");
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query(`DELETE FROM schema_migrations WHERE id = $1`, [id]);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export function migrationsPending(appliedIds: string[]): boolean {
  const all = listMigrationIds();
  return all.some((id) => !appliedIds.includes(id));
}

export function sha256(input: string | Buffer): Buffer {
  return createHash("sha256").update(input).digest();
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function addressToBytes(address: string): Buffer {
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  if (!/^[0-9a-fA-F]{40}$/.test(hex)) {
    throw new Error("INVALID_ADDRESS");
  }
  return Buffer.from(hex.toLowerCase(), "hex");
}

export function bytesToAddress(buf: Buffer): `0x${string}` {
  return `0x${buf.toString("hex")}` as `0x${string}`;
}

export { pg };
