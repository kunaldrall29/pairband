import { z } from 'zod';

export const PairbandModeSchema = z.enum(['preview', 'testnet', 'mainnet']);
export type PairbandMode = z.infer<typeof PairbandModeSchema>;

const boolFromEnv = (fallback = false) =>
  z.preprocess((v) => {
    if (v === undefined || v === '') return fallback;
    if (typeof v === 'boolean') return v;
    return v === 'true' || v === '1';
  }, z.boolean());

export const EnvSchema = z.object({
  PAIRBAND_MODE: PairbandModeSchema.default('preview'),
  ARC_TESTNET_RPC_URL: z.string().url().default('https://rpc.testnet.arc.io'),
  ARC_RPC_SECONDARY_URL: z.string().optional().default(''),
  DEPLOYMENT_MANIFEST_PATH: z.string().default('./deployments/arc-testnet.json'),
  DATABASE_URL: z.string().optional().default(''),
  SESSION_SECRET: z.string().optional().default(''),
  PUBLIC_SITE_ORIGIN: z.string().url().default('http://localhost:3000'),
  PUBLIC_APP_ORIGIN: z.string().url().default('http://localhost:3000'),
  API_ORIGIN: z.string().url().default('http://localhost:3001'),
  EMAIL_PROVIDER: z.enum(['disabled', 'resend', 'other']).default('disabled'),
  GRAPH_ENABLED: boolFromEnv(false),
  CIRCLE_FUNDING_ENABLED: boolFromEnv(false),
  UNISWAP_TRADING_API_ENABLED: boolFromEnv(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Financial actions require verified deployment; preview never enables them. */
export function financialActionsAllowed(mode: PairbandMode, deploymentVerified: boolean): boolean {
  if (mode === 'preview') return false;
  if (mode === 'mainnet' && !deploymentVerified) return false;
  return deploymentVerified;
}

export const ARC_TESTNET = {
  chainId: 5042002,
  rpcUrl: 'https://rpc.testnet.arc.io',
  explorerUrl: 'https://testnet.arcscan.app',
  usdc: '0x3600000000000000000000000000000000000000',
  eurc: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
} as const;
