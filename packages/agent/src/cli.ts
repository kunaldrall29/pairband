#!/usr/bin/env node
import { Command } from "commander";
import { createWalletClient, createPublicClient, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { suggestBand } from "./suggestBand.js";

const vaultAbi = parseAbi([
  "function proposeRebalance(int24 tickLower, int24 tickUpper, uint128 amount0Min, uint128 amount1Min)",
  "function band() view returns (int24 tickLower, int24 tickUpper, uint256 positionId, uint48 lastRebalanceAt)",
  "function policy() view returns (address curator, address agent, uint24 maxWidth, uint24 maxShift, uint32 minCooldown, uint16 protocolFeeBps, uint16 performanceFeeBps, uint32 proposalDelay)",
  "function poolKey() view returns (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
]);

const program = new Command();
program.name("pairband").description("Pairband agent CLI — propose only. Curator keeps the keys.");

program
  .command("suggest")
  .requiredOption("--tick <n>")
  .requiredOption("--spacing <n>")
  .requiredOption("--max-width <n>")
  .requiredOption("--max-shift <n>")
  .requiredOption("--lower <n>")
  .requiredOption("--upper <n>")
  .action((opts) => {
    const band = suggestBand({
      tick: Number(opts.tick),
      spacing: Number(opts.spacing),
      maxWidth: Number(opts.maxWidth),
      maxShift: Number(opts.maxShift),
      currentBand: { tickLower: Number(opts.lower), tickUpper: Number(opts.upper) },
    });
    console.log(JSON.stringify(band));
  });

program
  .command("propose")
  .requiredOption("--vault <address>")
  .requiredOption("--rpc <url>")
  .option("--key <hex>", "Private key via env PAIRBAND_AGENT_KEY if omitted")
  .option("--tick <n>", "Current tick (required unless --slot0-from is used)")
  .action(async (opts) => {
    const pk = (opts.key as string | undefined) ?? process.env.PAIRBAND_AGENT_KEY;
    if (!pk) {
      console.error("Set PAIRBAND_AGENT_KEY or pass --key. Never put keys in the browser.");
      process.exit(1);
    }
    const account = privateKeyToAccount(pk as Hex);
    const transport = http(opts.rpc);
    const publicClient = createPublicClient({ transport });
    const walletClient = createWalletClient({ account, transport });

    const vault = opts.vault as Hex;
    const [band, policy, poolKey] = await Promise.all([
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "band" }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "policy" }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "poolKey" }),
    ]);

    const tick = opts.tick != null ? Number(opts.tick) : Math.floor((Number(band[0]) + Number(band[1])) / 2);
    const suggested = suggestBand({
      tick,
      spacing: Number(poolKey[3]),
      maxWidth: Number(policy[2]),
      maxShift: Number(policy[3]),
      currentBand: { tickLower: Number(band[0]), tickUpper: Number(band[1]) },
    });

    const hash = await walletClient.writeContract({
      address: vault,
      abi: vaultAbi,
      functionName: "proposeRebalance",
      args: [suggested.tickLower, suggested.tickUpper, 0n, 0n],
      chain: null,
      account,
    });
    console.log(JSON.stringify({ hash, suggested }));
  });

program.parse();
