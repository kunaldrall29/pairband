import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  bigint,
  primaryKey,
} from "drizzle-orm/pg-core";

export const earlyAccess = pgTable("early_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  intendedUse: text("intended_use"),
  privacyVersion: text("privacy_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  address: text("address").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siweNonces = pgTable("siwe_nonces", {
  nonce: text("nonce").primaryKey(),
  address: text("address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orgs = pgTable("orgs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  defaultBandBps: integer("default_band_bps").notNull().default(15),
  treasuryLabel: text("treasury_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    address: text("address").notNull(),
    role: text("role").notNull(), // admin | payer | viewer
    spendLimitUsd: bigint("spend_limit_usd", { mode: "bigint" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const payees = pgTable("payees", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  address: text("address").notNull(),
  label: text("label").notNull(),
  defaultToken: text("default_token").notNull().default("USDC"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quotesLog = pgTable("quotes_log", {
  id: text("id").primaryKey(),
  route: text("route").notNull(),
  amountOut: text("amount_out").notNull(),
  amountIn: text("amount_in"),
  mid: text("mid"),
  bandBps: integer("band_bps"),
  executable: boolean("executable").notNull(),
  reason: text("reason"),
  address: text("address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  txHash: text("tx_hash").notNull(),
  quoteId: text("quote_id"),
  payee: text("payee").notNull(),
  payer: text("payer"),
  orgId: uuid("org_id"),
  memoId: text("memo_id"),
  tokenOut: text("token_out").notNull(),
  tokenIn: text("token_in").notNull(),
  amountOut: text("amount_out").notNull(),
  amountIn: text("amount_in").notNull(),
  reference: text("reference").notNull(),
  status: text("status").notNull(),
  chainId: integer("chain_id").notNull(),
  explorerUrl: text("explorer_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
