/** Same-origin session helpers (cookie-only auth). */
export { API_BASE, fetchActivity, formatUnits, parseUnits, payAuthorize, postReceipt } from "@/lib/api";
export type { ActivityItem, PayAuthorizeResponse } from "@/lib/api";

import { API_BASE } from "@/lib/api";

export type MeResponse = {
  address: string;
  orgs: Array<{
    id: string;
    name: string;
    role: string;
    defaultBandBps: number;
    spendLimitUsd: string | null;
  }>;
};

export async function sessionFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function sessionJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await sessionFetch(path, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `http_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMe(): Promise<MeResponse> {
  return sessionJson<MeResponse>("/v1/me");
}

export async function signOut(): Promise<void> {
  await sessionFetch("/v1/auth/logout", { method: "POST" });
}
