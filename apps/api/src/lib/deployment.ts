import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Env } from "@pairband/config";

export type PublicDeployment = {
  mode: string;
  verified: boolean;
  chainId: number | null;
  financialActionsAllowed: boolean;
  contracts: Record<string, string | null>;
  tokens: unknown;
  note: string;
  gitCommit: string | null;
};

export function loadPublicDeployment(env: Env): PublicDeployment {
  try {
    const path = resolve(process.cwd(), env.DEPLOYMENT_MANIFEST_PATH);
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      mode?: string;
      verified?: boolean;
      chainId?: number | null;
      contracts?: Record<string, string | null>;
      tokens?: unknown;
      gitCommit?: string | null;
      deploymentProvenance?: string;
    };
    return {
      mode: env.PAIRBAND_MODE,
      verified: Boolean(raw.verified),
      chainId: raw.chainId ?? null,
      financialActionsAllowed: false,
      contracts: raw.contracts ?? {},
      tokens: raw.tokens ?? null,
      note: raw.deploymentProvenance ?? "Deployment manifest loaded; indexer not yet authoritative",
      gitCommit: raw.gitCommit ?? null,
    };
  } catch {
    return {
      mode: env.PAIRBAND_MODE,
      verified: false,
      chainId: null,
      financialActionsAllowed: false,
      contracts: {},
      tokens: null,
      note: "Manifest unavailable or unverified — preview defaults",
      gitCommit: null,
    };
  }
}
