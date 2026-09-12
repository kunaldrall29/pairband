import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://pairband:pairband@127.0.0.1:5432/pairband";
const sql = postgres(url, { max: 1 });

await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

await sql.unsafe(`
CREATE TABLE IF NOT EXISTS early_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL,
  intended_use text,
  privacy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS siwe_nonces (
  nonce text PRIMARY KEY,
  address text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  default_band_bps integer NOT NULL DEFAULT 15,
  treasury_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
  org_id uuid NOT NULL REFERENCES orgs(id),
  user_id uuid NOT NULL REFERENCES users(id),
  address text NOT NULL,
  role text NOT NULL,
  spend_limit_usd bigint,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE TABLE IF NOT EXISTS payees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  address text NOT NULL,
  label text NOT NULL,
  default_token text NOT NULL DEFAULT 'USDC',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quotes_log (
  id text PRIMARY KEY,
  route text NOT NULL,
  amount_out text NOT NULL,
  amount_in text,
  mid text,
  band_bps integer,
  executable boolean NOT NULL,
  reason text,
  address text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  quote_id text,
  payee text NOT NULL,
  payer text,
  org_id uuid,
  memo_id text,
  token_out text NOT NULL,
  token_in text NOT NULL,
  amount_out text NOT NULL,
  amount_in text NOT NULL,
  reference text NOT NULL,
  status text NOT NULL,
  chain_id integer NOT NULL,
  explorer_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`);

console.log("pairband migrations applied");
await sql.end();
