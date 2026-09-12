/**
 * MCP tool surface for Pairband agent runtimes.
 * Ticks always come from suggestBand — explain_proposal may use an LLM for copy only.
 */
import { suggestBand, type Band } from "./suggestBand.js";

export type McpToolName =
  | "list_pairs"
  | "get_pair"
  | "suggest_band"
  | "simulate_rebalance"
  | "propose_rebalance"
  | "explain_proposal";

export const MCP_TOOLS: { name: McpToolName; description: string }[] = [
  { name: "list_pairs", description: "List Pairband vaults from deployments.json for a chain" },
  { name: "get_pair", description: "Read band, policy, proposal, TVL for a vault" },
  { name: "suggest_band", description: "Deterministic tick band from suggestBand() — no LLM ticks" },
  { name: "simulate_rebalance", description: "eth_call executeRebalance / preview inventory" },
  { name: "propose_rebalance", description: "Submit proposeRebalance with agent key (operator machine only)" },
  { name: "explain_proposal", description: "Natural-language copy for a proposal; ticks still from suggestBand" },
];

export function toolSuggestBand(args: {
  tick: number;
  spacing: number;
  maxWidth: number;
  maxShift: number;
  currentBand: Band;
}): Band {
  return suggestBand(args);
}

export function toolExplainProposal(args: { band: Band; current: Band; tick: number }): string {
  // Copy only — never invent ticks.
  const dir =
    args.band.tickLower > args.current.tickLower
      ? "up"
      : args.band.tickLower < args.current.tickLower
        ? "down"
        : "in place";
  return `Proposal shifts the band ${dir} to [${args.band.tickLower}, ${args.band.tickUpper}) around tick ${args.tick}. Curator must execute; agent cannot move liquidity.`;
}
