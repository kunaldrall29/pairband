import { createHash, randomBytes } from "node:crypto";
import {
  type Hex,
  hashMessage,
  recoverAddress,
  verifyMessage,
  getAddress,
  isAddress,
} from "viem";

export const SESSION_COOKIE = "pairband_session";
export const CSRF_COOKIE = "pairband_csrf";

export function buildSignInMessage(input: {
  domain: string;
  uri: string;
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
}): string {
  return [
    `${input.domain} wants you to sign in to Pairband private settings`,
    "",
    `URI: ${input.uri}`,
    `Address: ${getAddress(input.address)}`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join("\n");
}

export async function verifyWalletSignature(input: {
  address: string;
  message: string;
  signature: Hex;
}): Promise<boolean> {
  if (!isAddress(input.address)) return false;
  const expected = getAddress(input.address);
  try {
    const ok = await verifyMessage({
      address: expected,
      message: input.message,
      signature: input.signature,
    });
    if (ok) return true;
  } catch {
    // fall through to recover / contract-wallet path
  }

  try {
    const recovered = await recoverAddress({
      hash: hashMessage(input.message),
      signature: input.signature,
    });
    if (getAddress(recovered) === expected) return true;
  } catch {
    // ignore
  }

  // ERC-1271 / contract-wallet: signature is 65+ bytes with magic; without RPC we cannot
  // claim verification. Callers pass an optional verifier.
  return false;
}

/** Optional contract-wallet verifier hook (tests inject a stub). */
export type ContractWalletVerifier = (args: {
  address: `0x${string}`;
  message: string;
  signature: Hex;
}) => Promise<boolean>;

export async function verifySignInSignature(
  input: {
    address: string;
    message: string;
    signature: Hex;
  },
  contractVerifier?: ContractWalletVerifier,
): Promise<boolean> {
  if (await verifyWalletSignature(input)) return true;
  if (contractVerifier && isAddress(input.address)) {
    return contractVerifier({
      address: getAddress(input.address),
      message: input.message,
      signature: input.signature,
    });
  }
  return false;
}

export function newCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseBearerOrCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq);
    if (k === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}
