import type { DbClient } from "../index.js";
import { addressToBytes, normalizeEmail, randomToken, sha256 } from "../index.js";

export async function upsertReminderPreference(
  db: DbClient,
  input: {
    account: string;
    seriesIdHex: string;
    enabled: boolean;
    email: string;
    scheduleCodes: string[];
    consentVersion: string;
  },
): Promise<{ status: "pending_verification" | "saved"; verificationToken?: string }> {
  const account = addressToBytes(input.account);
  const seriesId = Buffer.from(
    input.seriesIdHex.startsWith("0x") ? input.seriesIdHex.slice(2) : input.seriesIdHex,
    "hex",
  );
  if (seriesId.length !== 32) throw new Error("INVALID_SERIES_ID");
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");

  const token = randomToken(24);
  const challengeHash = sha256(token);
  const challengeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const emailRow = await db.query<{ id: string; status: string }>(
    `INSERT INTO verified_emails (account, normalized_email, status, challenge_hash, challenge_expires_at)
     VALUES ($1, $2, 'pending', $3, $4)
     ON CONFLICT (account, normalized_email) DO UPDATE
       SET challenge_hash = EXCLUDED.challenge_hash,
           challenge_expires_at = EXCLUDED.challenge_expires_at,
           status = CASE
             WHEN verified_emails.status = 'verified' THEN verified_emails.status
             ELSE 'pending'
           END
     RETURNING id::text AS id, status`,
    [account, email, challengeHash, challengeExpires],
  );
  const verifiedEmailId = emailRow.rows[0]!.id;
  const emailStatus = emailRow.rows[0]!.status;

  await db.query(
    `INSERT INTO notification_preferences (
       account, series_id, channel, enabled, verified_email_id, schedule_codes, consent_version, status
     ) VALUES ($1, $2, 'email', $3, $4::bigint, $5, $6, 'active')
     ON CONFLICT (account, series_id, channel) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       verified_email_id = EXCLUDED.verified_email_id,
       schedule_codes = EXCLUDED.schedule_codes,
       consent_version = EXCLUDED.consent_version,
       updated_at = now()`,
    [account, seriesId, input.enabled, verifiedEmailId, input.scheduleCodes, input.consentVersion],
  );

  if (emailStatus === "verified") {
    return { status: "saved" };
  }
  // Provider disabled: token returned only in test/local capture paths, never logged by API.
  return { status: "pending_verification", verificationToken: token };
}

export async function verifyEmailToken(
  db: DbClient,
  token: string,
): Promise<{ ok: true; account: Buffer } | { ok: false; code: string }> {
  const challengeHash = sha256(token);
  const res = await db.query<{ id: string; account: Buffer; challenge_expires_at: Date | null }>(
    `SELECT id::text AS id, account, challenge_expires_at
     FROM verified_emails
     WHERE challenge_hash = $1 AND status = 'pending'
     FOR UPDATE`,
    [challengeHash],
  );
  const row = res.rows[0];
  if (!row) return { ok: false, code: "TOKEN_UNKNOWN" };
  if (!row.challenge_expires_at || row.challenge_expires_at.getTime() <= Date.now()) {
    return { ok: false, code: "TOKEN_EXPIRED" };
  }
  await db.query(
    `UPDATE verified_emails
     SET status = 'verified', verified_at = now(), challenge_hash = NULL, challenge_expires_at = NULL
     WHERE id = $1::bigint`,
    [row.id],
  );
  return { ok: true, account: row.account };
}

export async function getRemindersForAccount(db: DbClient, account: string) {
  const res = await db.query<{
    series_id: Buffer;
    enabled: boolean;
    schedule_codes: string[];
    consent_version: string;
    email_status: string | null;
    normalized_email: string | null;
  }>(
    `SELECT np.series_id, np.enabled, np.schedule_codes, np.consent_version,
            ve.status AS email_status, ve.normalized_email
     FROM notification_preferences np
     LEFT JOIN verified_emails ve ON ve.id = np.verified_email_id
     WHERE np.account = $1 AND np.channel = 'email'`,
    [addressToBytes(account)],
  );
  return res.rows.map((r) => ({
    seriesId: `0x${r.series_id.toString("hex")}`,
    enabled: r.enabled,
    scheduleCodes: r.schedule_codes,
    consentVersion: r.consent_version,
    emailVerificationStatus: r.email_status ?? "none",
    // Never expose full email to other accounts; only to session owner (caller enforces).
    email: r.normalized_email,
  }));
}
