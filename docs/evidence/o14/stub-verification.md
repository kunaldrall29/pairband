# O14 stub evidence — Payoff analytics / reference marks

**Status:** partial scaffolding only (prereq O12 indexer not complete)

- `POST /v1/analytics/payoff` reuses `@pairband/domain` `educationalPayoffs`
- Fixture check: 10,000 EURC @ 1.10 strike, 200 USDC premium, spot 1.00 → protected 10,800 USDC
- `GET /v1/reference-marks` returns typed `unavailable` — no licensed FX source configured
- Does **not** claim live portfolio marks, APR/APY, or executable quotes

Next: complete O12, then finish O14 reference adapter + realized trade analytics.
