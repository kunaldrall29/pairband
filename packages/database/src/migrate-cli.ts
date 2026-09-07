#!/usr/bin/env node
import { createPool, migrateDown, migrateUp, listMigrationIds } from "./index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const cmd = process.argv[2] ?? "up";
const pool = createPool(databaseUrl);

try {
  if (cmd === "up") {
    const applied = await migrateUp(pool);
    console.log(JSON.stringify({ ok: true, applied, known: listMigrationIds() }));
  } else if (cmd === "down") {
    const id = process.argv[3] ?? listMigrationIds().at(-1);
    if (!id) {
      console.error("No migration id");
      process.exit(1);
    }
    await migrateDown(pool, id);
    console.log(JSON.stringify({ ok: true, rolledBack: id }));
  } else {
    console.error("Usage: migrate [up|down] [id]");
    process.exit(1);
  }
} finally {
  await pool.end();
}
