/**
 * In-page EIP-1193 provider for Arc rehearsal.
 * Shows a connect prompt with the full payer address, then signs/sends
 * with Anvil #0. Enable with NEXT_PUBLIC_BROWSER_WALLET=1 only.
 */
"use client";

import { useLayoutEffect } from "react";
import { createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ACTIVE_CHAIN } from "@pairband/config";

const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

const arcChain = {
  id: ACTIVE_CHAIN.chainId,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  rpcUrls: { default: { http: [ACTIVE_CHAIN.rpcUrl] } },
  blockExplorers: {
    default: { name: "ArcScan", url: ACTIVE_CHAIN.explorerUrl },
  },
} as const;

function hexToUtf8(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

function showConnectPrompt(address: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-pairband-wallet", "connect");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;background:rgba(20,24,20,0.55);display:flex;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif;";
    overlay.innerHTML = `
      <div style="background:#f7f3ea;border:1px solid #cfc6b6;border-radius:16px;padding:1.5rem;max-width:440px;width:calc(100% - 2rem);box-shadow:0 18px 50px rgba(0,0,0,0.25)">
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;color:#5c6b5a;margin-bottom:0.5rem">BROWSER WALLET · ARC TESTNET</div>
        <h2 style="margin:0 0 0.75rem;font-size:1.35rem;color:#1c241c">Connect this wallet?</h2>
        <p style="margin:0 0 0.5rem;color:#4a5548;font-size:0.92rem">Pairband is requesting access to your payer address:</p>
        <code style="display:block;word-break:break-all;background:#fff;border:1px solid #ddd4c4;border-radius:10px;padding:0.75rem 0.85rem;font-size:0.82rem;color:#111">${address}</code>
        <p style="margin:0.85rem 0 0;color:#6a7466;font-size:0.8rem">Chain ID ${ACTIVE_CHAIN.chainId} · funded rehearsal key · not mainnet</p>
        <div style="display:flex;gap:0.6rem;justify-content:flex-end;margin-top:1.25rem">
          <button type="button" data-act="reject" style="padding:0.6rem 1rem;border-radius:999px;border:1px solid #cfc6b6;background:#fff;font-weight:600;cursor:pointer">Reject</button>
          <button type="button" data-act="connect" style="padding:0.6rem 1rem;border-radius:999px;border:0;background:#1c241c;color:#f7f3ea;font-weight:600;cursor:pointer">Connect</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const act = t.getAttribute("data-act");
      if (act === "connect") {
        overlay.remove();
        resolve(true);
      } else if (act === "reject") {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

export function installBrowserWallet(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    ethereum?: unknown;
    __pairbandWalletInstalled?: boolean;
  };
  if (w.__pairbandWalletInstalled) return;
  w.__pairbandWalletInstalled = true;

  const account = privateKeyToAccount(PK);
  let connected = false;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const wallet = createWalletClient({
    account,
    chain: arcChain,
    transport: http(ACTIVE_CHAIN.rpcUrl, {
      fetchOptions: { headers: { "User-Agent": "Pairband/1.0" } },
    }),
  });

  const emit = (event: string, ...args: unknown[]) => {
    for (const fn of listeners.get(event) ?? []) fn(...args);
  };

  const provider = {
    isMetaMask: true,
    isPairbandRehearsalWallet: true,
    request: async ({
      method,
      params,
    }: {
      method: string;
      params?: unknown[];
    }) => {
      const args = params ?? [];
      switch (method) {
        case "eth_requestAccounts": {
          if (!connected) {
            const ok = await showConnectPrompt(account.address);
            if (!ok) {
              throw Object.assign(new Error("User rejected the request"), {
                code: 4001,
              });
            }
            connected = true;
            emit("accountsChanged", [account.address]);
            emit("connect", {
              chainId: `0x${ACTIVE_CHAIN.chainId.toString(16)}`,
            });
          }
          return [account.address];
        }
        case "eth_accounts":
          return connected ? [account.address] : [];
        case "eth_chainId":
          return `0x${ACTIVE_CHAIN.chainId.toString(16)}`;
        case "net_version":
          return String(ACTIVE_CHAIN.chainId);
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "personal_sign": {
          const [data, addr] = args as [Hex | string, Address];
          if (addr && addr.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error("account mismatch");
          }
          let message: string;
          if (typeof data === "string" && data.startsWith("0x")) {
            try {
              message = hexToUtf8(data);
            } catch {
              message = data;
            }
          } else {
            message = String(data);
          }
          return wallet.signMessage({ message });
        }
        case "eth_sendTransaction": {
          const [tx] = args as [
            { to?: Address; data?: Hex; value?: Hex; gas?: Hex },
          ];
          return wallet.sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
            chain: arcChain,
            account,
          });
        }
        default:
          throw new Error(`rehearsal wallet unsupported: ${method}`);
      }
    },
    on(event: string, handler: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return provider;
    },
    removeListener(event: string, handler: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(handler);
      return provider;
    },
  };

  Object.defineProperty(window, "ethereum", {
    value: provider,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("ethereum#initialized"));
}

export function BrowserWalletInstall() {
  useLayoutEffect(() => {
    if (process.env.NEXT_PUBLIC_BROWSER_WALLET === "1") {
      installBrowserWallet();
    }
  }, []);
  return null;
}

export const REHEARSAL_PAYER =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
export const REHEARSAL_PAYEE =
  "0x1111111111111111111111111111111111111111" as const;
