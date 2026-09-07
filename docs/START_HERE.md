
# Start here — Pairband options-v2

This kit contains specifications and detailed build tasks. It does not contain a completed application, audited contracts, deployed liquidity or credentials. It replaces the old Pairband spot-FX/payment-flow build direction.

1. Read reference/landing.md for the public website and reference/app-ui.md for the app; they are deliberately separate.
2. Read MASTER_CONTEXT.md and reference/protocol.md before writing financial code. Use reference/api-contract.md, data-schema.md, architecture.md and release-gates.md as supporting contracts between teams.
3. Open the intended app repository, not this documentation directory. Copy the kit context/reference/fixtures/prompts into docs/ and merge templates thoughtfully. Never overwrite existing AGENTS.md or unrelated work. O00 performs this migration.
4. Paste the appropriate tool-starters/Cursor.md, Codex.md or Claude_Code.md kickoff into your coding agent after setting <KIT_PATH>.
5. Run O00, then the stages in prompt-index.json according to prerequisites. Stage completion requires evidence. R01 resumes, R02 investigates financial mismatches and R03 reviews implementation.
6. Keep O24 Circle funding, O25 Graph analytics and O32 expansion optional. Their credentials/support do not block funded-wallet core use. O28/O29 govern funded/mainnet release; O30 prepares event artifacts without weakening product gates.

Suggested parallel workstreams only if the team chooses to allocate people: protocol O01–O10; service/indexing O11–O15 after the relevant ABIs/domain model; design O16–O17 after shared math; app O18–O23 after API contracts. Follow the dependency graph rather than running everyone against guessed interfaces. This instruction does not require a coding agent to spawn subagents.

## What each deliverable means

Implemented is not audited. Local-tested is not Arc-verified. A prepared deployment is not a broadcast. A draft feedback form is not a submission. A testnet metric is not revenue. A source/skill mention is not confirmed SDK/chain support. Keep these distinctions in BUILD_STATUS and product labels.

The September 30 target is conditional readiness. If independent review, legal/customer eligibility, maker liquidity or official mainnet dependencies are missing, retain testnet and state the blockers. The product demo can still show a genuine complete lifecycle.

## Where to start by role

Founder/product: landing/app specs, release gates, O27/O31. Designer/frontend: O16–O23 with protocol units fixed. Protocol engineer: O01–O10. Backend engineer: API/data references and O11–O15. Reviewer: protocol/threat evidence and R03. No role may silently change the economics in its own artifact.


---
