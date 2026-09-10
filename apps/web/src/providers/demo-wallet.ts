/**
 * Demo-only wallet connector: Anvil #0 private key → Arc testnet.
 * Enabled only when NEXT_PUBLIC_DEMO_WALLET=1. Do not ship to production.
 */
import {
  createWalletClient,
  http,
  type Address,
  type EIP1193Provider,
  type Hex,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createConnector } from "wagmi";
import { ACTIVE_CHAIN } from "@pairband/config";

const DEMO_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

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

export function demoWalletConnector() {
  const account = privateKeyToAccount(DEMO_PK);
  let wallet: WalletClient | undefined;
  let connected = false;

  function getWallet(): WalletClient {
    if (!wallet) {
      wallet = createWalletClient({
        account,
        chain: arcChain,
        transport: http(ACTIVE_CHAIN.rpcUrl, {
          fetchOptions: { headers: { "User-Agent": "Pairband/1.0" } },
        }),
      });
    }
    return wallet;
  }

  const provider = {
    request: async ({ method, params }: { method: string; params?: unknown }) => {
      const args = (params ?? []) as unknown[];
      switch (method) {
        case "eth_requestAccounts":
          connected = true;
          return [account.address];
        case "eth_accounts":
          return connected ? [account.address] : [];
        case "eth_chainId":
          return `0x${ACTIVE_CHAIN.chainId.toString(16)}`;
        case "net_version":
          return String(ACTIVE_CHAIN.chainId);
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
          return getWallet().signMessage({ account, message });
        }
        case "eth_sign": {
          const [, data] = args as [Address, Hex];
          return getWallet().signMessage({ account, message: { raw: data } });
        }
        case "eth_sendTransaction": {
          const [tx] = args as [
            {
              to?: Address;
              data?: Hex;
              value?: Hex;
              gas?: Hex;
            },
          ];
          return getWallet().sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
            chain: arcChain,
            account,
          });
        }
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        default:
          throw new Error(`demo wallet unsupported method: ${method}`);
      }
    },
    on() {},
    removeListener() {},
  } as EIP1193Provider;

  return createConnector((config) => ({
    id: "pairbandDemo",
    name: "Demo wallet",
    type: "mock" as const,
    async setup() {},
    async connect() {
      connected = true;
      const chainId = ACTIVE_CHAIN.chainId;
      config.emitter.emit("change", { accounts: [account.address], chainId });
      return { accounts: [account.address] as const, chainId };
    },
    async disconnect() {
      connected = false;
      config.emitter.emit("disconnect");
    },
    async getAccounts() {
      return connected ? ([account.address] as Address[]) : [];
    },
    async getChainId() {
      return ACTIVE_CHAIN.chainId;
    },
    async isAuthorized() {
      return connected;
    },
    async getProvider() {
      return provider;
    },
    async switchChain({ chainId }) {
      if (chainId !== ACTIVE_CHAIN.chainId) {
        throw new Error("demo wallet is Arc testnet only");
      }
      config.emitter.emit("change", { chainId });
      return arcChain;
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {
      connected = false;
    },
  }));
}
