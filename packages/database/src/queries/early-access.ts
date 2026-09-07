import type { DbClient } from "../index.js";
import { normalizeEmail } from "../index.js";

export const EARLY_ACCESS_ROLES = [
  "eurc_holder",
  "option_writer",
  "market_maker",
  "integrator",
  "researcher",
] as const;

export type EarlyAccessRole = (typeof EARLY_ACCESS_ROLES)[number];

export type EarlyAccessInput = {
  email: string;
  role: EarlyAccessRole;
  intendedUse?: string | undefined;
  exposureBand?: string | undefined;
  privacyAcknowledged: true;
  privacyVersion: string;
  productUpdatesOptIn: boolean;
  clientRequestId?: string | undefined;
};

/** Insert or update privately; callers must always return generic success. */
export async function upsertEarlyAccess(
  db: DbClient,
  input: EarlyAccessInput,
): Promise<{ inserted: boolean }> {
  const normalized = normalizeEmail(input.email);
  if (!normalized || normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("INVALID_EMAIL");
  }
  if (input.intendedUse && input.intendedUse.length > 500) {
    throw new Error("INTENDED_USE_TOO_LONG");
  }
  if (!input.privacyAcknowledged) {
    throw new Error("PRIVACY_REQUIRED");
  }
  if (!EARLY_ACCESS_ROLES.includes(input.role)) {
    throw new Error("INVALID_ROLE");
  }

  const existing = await db.query(`SELECT id FROM early_access_requests WHERE normalized_email = $1`, [
    normalized,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    await db.query(
      `UPDATE early_access_requests
       SET role = $2,
           intended_use = COALESCE($3, intended_use),
           exposure_band = COALESCE($4, exposure_band),
           privacy_version = $5,
           product_updates_opt_in = $6,
           client_request_id = COALESCE($7, client_request_id),
           updated_at = now()
       WHERE normalized_email = $1`,
      [
        normalized,
        input.role,
        input.intendedUse ?? null,
        input.exposureBand ?? null,
        input.privacyVersion,
        input.productUpdatesOptIn,
        input.clientRequestId ?? null,
      ],
    );
    return { inserted: false };
  }

  await db.query(
    `INSERT INTO early_access_requests (
      normalized_email, role, intended_use, exposure_band,
      privacy_acknowledged, privacy_version, product_updates_opt_in, client_request_id
    ) VALUES ($1,$2,$3,$4,true,$5,$6,$7)`,
    [
      normalized,
      input.role,
      input.intendedUse ?? null,
      input.exposureBand ?? null,
      input.privacyVersion,
      input.productUpdatesOptIn,
      input.clientRequestId ?? null,
    ],
  );
  return { inserted: true };
}

export async function countEarlyAccess(db: DbClient): Promise<number> {
  const r = await db.query<{ c: string }>(`SELECT count(*)::text AS c FROM early_access_requests`);
  return Number(r.rows[0]?.c ?? 0);
}
