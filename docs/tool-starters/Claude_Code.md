
# Claude Code — copy/paste kickoff

Replace <KIT_PATH> with the actual extracted kit path and select the actual app repository before running.

Read the actual repository's instructions and current changes first. Locate the Pairband options-v2 build kit at <KIT_PATH>; this is a documentation pack, not an application repository. Do not build the old payment-flow/spot-FX product. Import its MASTER_CONTEXT.md, reference/, fixtures/ and prompts/ under docs/ in the intended app repository, preserving existing work and merging guidance.

Execute O00 only for the first turn. Build the required local artifacts, run the checks you can actually perform, and record unresolved dependencies. Use docs/MASTER_CONTEXT.md and docs/reference/protocol.md as the shared economic source of truth. One whole 6-decimal option covers100 EURC; backing and LP liquidity are separate; exercise is manual in a fixed interval; mainnet configuration remains null until verified.

After O00, use prompt-index.json to select the next stage whose prerequisites have evidence. For later turns: "Execute stage Oxx from docs/prompts, using the existing repository and build-session state. Complete its acceptance criteria and update evidence; do not restart completed work." Optional O24/O25/O32 are disabled unless justified. Finish each stage with changed paths, actual checks/results, blockers and next step. Do not run the entire book as one unchecked mega-task or create a fake live integration to bypass a blocker.

Prepare external transactions/publication as reviewable artifacts and execute only within applicable existing authorization. No secrets in source/logs/browser, no central user-wallet signer, no fabricated tests/receipts/audits. If the context becomes short, preserve build-session and use R01 to resume instead of inventing prior state.

## Tool-specific setup

Merge templates/CLAUDE.md with the repository's existing guidance and read shared AGENTS.md where present. Read the applicable Arc/Uniswap skills and current sources for the stage, but verify generic examples against the pinned contracts. Maintain the shared build-session so Cursor or Codex can continue the same work.


---
