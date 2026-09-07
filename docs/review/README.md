# Independent review package (O28 prep)

**Not an audit. Not independently reviewed. Not approved for funded pilot.**

This directory is the **review-ready preparation** bundle so an external reviewer can assess Pairband options-v2 from concrete artifacts. Internal Foundry/Slither work is **evidence for reviewers**, not a substitute for Gate4 independent review.

## Index

| Document | Purpose |
| --- | --- |
| [BUNDLE.md](./BUNDLE.md) | Freeze outline, compiler/dependency provenance |
| [architecture-map.md](./architecture-map.md) | Component diagram + trust boundaries |
| [threat-model.md](./threat-model.md) | Threat model (extends O09 register) |
| [source-map.md](./source-map.md) | Privileged paths / source map |
| [known-limitations.md](./known-limitations.md) | Explicit non-claims and gaps |
| [authority-matrix.md](./authority-matrix.md) | Who can pause, list, deploy, recover |
| [legal-facts-memo-draft.md](./legal-facts-memo-draft.md) | Facts for counsel — **not** legal clearance |
| [funded-pilot-outline.md](./funded-pilot-outline.md) | Limited pilot gates (draft) |
| [readiness-ledger.md](./readiness-ledger.md) | Gate0–Gate5 honest status ledger |
| [../evidence/o28/verification.md](../evidence/o28/verification.md) | Stage evidence / blockers |

## Frozen tip for this package

- Bootstrap / protocol tip at package authoring: `fe6fb0f6abff9e17632f7728d873249f18e829e3` (`cursor/options-v2-bootstrap-4c19`)
- Review-prep branch: `cursor/o28-review-prep-4c19` (adds these docs; does not change protocol economics)

Re-freeze to a new commit SHA before engaging an external reviewer.
