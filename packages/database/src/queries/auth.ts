import type { DbClient } from "../index.js";
import { addressToBytes, bytesToAddress, randomToken, sha256 } from "../index.js";

export type AuthNonceRow = {
  address: `0x${string}`;
  domain: string;
  uri: string;
  chainId: number;
  nonce: string;
  expiresAt: Date;
};

export async function createAuthNonce(
  db: DbClient,
  input: { address: string; domain: string; uri: string; chainId: number; ttlSeconds?: number },
): Promise<AuthNonceRow> {
  const nonce = randomToken(24);
  const nonceHash = sha256(nonce);
  const ttl = input.ttlSeconds ?? 300;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const address = addressToBytes(input.address);
  await db.query(
    `INSERT INTO auth_nonces (nonce_hash, address, domain, uri, chain_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [nonceHash, address, input.domain, input.uri, input.chainId, expiresAt],
  );
  return {
    address: bytesToAddress(address),
    domain: input.domain,
    uri: input.uri,
    chainId: input.chainId,
    nonce,
    expiresAt,
  };
}

export async function consumeAuthNonce(
  db: DbClient,
  nonce: string,
  expected: { address: string; domain: string; uri: string; chainId: number },
): Promise<{ ok: true } | { ok: false; code: string }> {
  const nonceHash = sha256(nonce);
  const address = addressToBytes(expected.address);
  const res = await db.query<{
    address: Buffer;
    domain: string;
    uri: string;
    chain_id: number;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT address, domain, uri, chain_id, expires_at, used_at
     FROM auth_nonces WHERE nonce_hash = $1 FOR UPDATE`,
    [nonceHash],
  );
  const row = res.rows[0];
  if (!row) return { ok: false, code: "NONCE_UNKNOWN" };
  if (row.used_at) return { ok: false, code: "NONCE_REPLAY" };
  if (row.expires_at.getTime() <= Date.now()) return { ok: false, code: "NONCE_EXPIRED" };
  if (!row.address.equals(address)) return { ok: false, code: "NONCE_ADDRESS_MISMATCH" };
  if (row.chain_id !== expected.chainId) return { ok: false, code: "WRONG_CHAIN" };
  if (row.domain !== expected.domain || row.uri !== expected.uri) {
    return { ok: false, code: "WRONG_DOMAIN" };
  }

  const upd = await db.query(
    `UPDATE auth_nonces SET used_at = now() WHERE nonce_hash = $1 AND used_at IS NULL`,
    [nonceHash],
  );
  if (upd.rowCount !== 1) return { ok: false, code: "NONCE_REPLAY" };
  return { ok: true };
}

export async function createSession(
  db: DbClient,
  address: string,
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await db.query(
    `INSERT INTO sessions (token_hash, address, expires_at) VALUES ($1, $2, $3)`,
    [tokenHash, addressToBytes(address), expiresAt],
  );
  return { token, expiresAt };
}

export async function lookupSession(
  db: DbClient,
  token: string,
): Promise<{ address: `0x${string}`; expiresAt: Date } | null> {
  const tokenHash = sha256(token);
  const res = await db.query<{ address: Buffer; expires_at: Date; revoked_at: Date | null }>(
    `SELECT address, expires_at, revoked_at FROM sessions WHERE token_hash = $1`,
    [tokenHash],
  );
  const row = res.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at.getTime() <= Date.now()) return null;
  return { address: bytesToAddress(row.address), expiresAt: row.expires_at };
}

export async function revokeSession(db: DbClient, token: string): Promise<boolean> {
  const tokenHash = sha256(token);
  const res = await db.query(
    `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
  return (res.rowCount ?? 0) > 0;
}
