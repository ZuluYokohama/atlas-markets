# Risk register

**Stage:** 0  
**Date:** 2026-08-16  
**Severity:** `blocker` | `high` | `medium` | `low`  
**Class:** scientific | legal | engineering | product

| ID | Severity | Class | Risk | Current evidence | Mitigation / residual | Blocks |
|---|---|---|---|---|---|---|
| R01 | **high** | scientific | Primary corpus S0–S4 missing from `/mnt/data` | Disk search negative; web titles not found | Proceed on S5 restatements + S6; quarantine unique S0–S4 claims as `OUT_OF_SCOPE` | Independent extraction of S0–S4; not Stage 1 schemas |
| R02 | medium | legal | Title to S5 PDF and prior PCT code undocumented | Files present, no LICENSE/CLA | Treat as user-supplied research inputs; do not redistribute PDFs | Stage 13 publication / OSS release |
| R03 | **high** | legal | No market-data license on file | Zero real quotes in repo | Synthetic-only until a user adapter + contract exist; never ship raw vendor data | Any real-data ingest / redistribution |
| R04 | medium | legal | LFM2.5 license and commercial terms unresolved | Not installed; S5 cites HF GGUF pages | Pin + legal review before any scientific run that uses an LFM | Reproducible semantic channel |
| R05 | **blocker for claims** | scientific | Confirmation block opened in the running demo | `DEFAULT_QUERY=402`, analogs allow `confirmation` | Close confirmation for all protocols; default query to development; add tests in Stage 2/5 | E4 / F0 `VALIDATED` |
| R06 | **blocker for claims** | scientific | Graph/scaler/PCA use full-sample information | `buildConnection` fits \(\mu,\sigma\) on all vertices; local PCA uses future neighbors | E3 redesign; no geometry features in F0 | E3, E4 geometry rungs |
| R07 | high | scientific | E0/E1 labeled `CERTIFIED` without a test suite | `evidence.ts` static records; no `tests/scientific` | Relabel to `SPECULATIVE` when Stage 1 evidence model exists; add certificates in Stage 7 | Any `CERTIFIED` public claim |
| R08 | high | scientific | Trial ledger is fabricated numbers | Literal pinball/CRPS in `TRIALS` | Delete-as-evidence; regenerate only from executed protocols | DSR/PBO, model selection |
| R09 | high | scientific | No live/replay identity | No event store | Stage 2 hard certificate | All downstream modeling |
| R10 | medium | scientific | Template and exposure transports are the same matcher | `position.ts` | Implement QP exposure transport in Stage 3; version rules | Exposure-transport claims |
| R11 | medium | scientific | “Contract replay” is not contract identity | Same | OCC-id / synthetic-id lifetime in Stage 3 | Contract-replay claims |
| R12 | medium | scientific | Valuation is model mark, not actual-market mark | BS mids | Dual mark types in Stage 3 | “Actual-market-mark” claims |
| R13 | medium | engineering | Dense Jacobi / no sparse solver | `core.ts` `jacobiEigh` | Accept for toy \(nr\); replace before large E1 | Large-graph E1/E2 |
| R14 | medium | engineering | No Python numerical service as S5 recommends | TS-only | Defer; schemas stay language-agnostic | Not Stage 1 |
| R15 | low | engineering | `lightningcss` MPL-2.0 | Declared dep | Do not modify its source; document in SBOM at Stage 13 | Unlikely |
| R16 | medium | engineering | No git history at inspection | `fatal: not a git repository` | Init after Stage 0 docs; pin `source_commit` | Provenance of prior prototype |
| R17 | high | product | Prototype looks like a finished lab | Full UI, gate badges | Stage reports + warning panel; no predictive language | User over-claim |
| R18 | medium | scientific | Planted regimes used as if estimated | `REGIME_PLAN` writes `regime` onto bars | F0 uses planted regime only as an **oracle baseline**, labeled as such | Honest regime-conditioned baseline |
| R19 | medium | scientific | Sliding PH is a sketch | `slidingPersistence` | Do not feed TDA to models until a real backend + E4 | TDA features |
| R20 | low | product | Template multiplayer/auth unused | `src/lib/multiplayer`, Better Auth | Leave template code; do not couple to evidence | None |
| R21 | **blocker** | product / legal | Live order routing | None found; S6 forbids through Stage 12 | Keep forbidden; fail-closed | Stage 12 if anyone adds a broker |
| R22 | medium | scientific | S5 prior E1 numbers not reproduced | Cited \(D_{\mathrm{conn}}=0.020817\) | Re-run under a frozen seed in Stage 8; do not quote as current | Citing those digits as this-repo certificates |
| R23 | medium | scientific | CQR exchangeability fails in markets | S5 footnote | Time-aware calibration or no finite-sample claim | Calibration certificates |
| R24 | low | engineering | Transitive npm licenses not fully scanned | Top-level only | Stage 13 SBOM | Enterprise edition |
| R25 | medium | scientific | Missing S0 blocks the “zeta demo” CI certificate | File absent | Implement S5’s quasiperiodic \(\omega_q=\log q\) demo from public math (Perea/Gakhar) if needed; do not claim zeta results | S0-specific figures |

## Hard-stop evaluation (S6 §9)

S6: *Do not proceed if the repository, source ownership, or market-data rights are materially ambiguous.*

| Question | Judgment |
|---|---|
| Repository identity | **Clear enough.** App-builder workspace + PCT prototype. Installable. |
| Source ownership | **Ambiguous for publication**, not for private Stage 1 schemas. S0–S4 missing; S5 present as user attachment. |
| Market-data rights | **Clear for this stage:** no licensed data is present or redistributed. Future real-data use is gated (R03). |

**Decision:** no Stage 0 hard abort. Residual R01/R02/R03 are recorded. Stage 1 (domain schemas) does not require opening licensed data or the missing PDFs.

## Waiver policy

No waiver is requested. No capability is `WAIVED_WITH_LIMITATION`.
