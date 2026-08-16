# F0 — First falsification experiment (registered, not executed)

**Protocol ID:** `F0-position-state-vs-baselines-v0`  
**Registered:** Stage 0 / 2026-08-16  
**Status:** `OUT_OF_SCOPE` until Stage 5  
**Confirmation block:** **CLOSED**

This is the smallest experiment that can falsify the claim that a point-in-time position-conditioned state representation contains measurable information **before** graph/sheaf development is treated as predictive.

## Question (S6, verbatim intent)

Does a point-in-time position-conditioned state representation improve a predeclared distributional metric over unconditional and simple regime-conditioned baselines on at least two disjoint historical windows?

## Frozen choices (v0)

These may be versioned later as `F0-…-v1` **before** looking at confirmation. They may not be tuned after opening confirmation.

| Item | Frozen value |
|---|---|
| Dataset | Synthetic SPY universe, `SEED = 0x51f7a01d`, `N_DAYS = 520`, **or** a later user-supplied PIT dataset with the same split policy |
| Instruments | One underlying (`SPY` synthetic) |
| Positions | Long ATM 21-DTE call; 25–40Δ bull call vertical; 21-DTE straddle; iron condor (declared templates only) |
| Horizons | 1 session, 5 sessions |
| Outcome vector \(Y\) | Net position PnL after declared costs; MAE; MFE; \(1\{\mathrm{PnL}>0\}\) |
| Costs | Half-spread + 0.50/contract commission (synthetic); no borrow |
| Feature families (candidate) | price/returns + surface (IV, IV−RV, skew) + calendar known-ahead flags. **No** SFT, TDA, connection coordinates |
| Position encoding | Deterministic Greeks + Deep-Sets sum of normalized legs (classical set baseline) |
| Baselines | (B1) unconditional \(Y\) by position family × horizon; (B2) regime-conditioned unconditional, where regime is the **planted** `REGIME_PLAN` label and is therefore an **oracle** baseline, labeled as such |
| Candidate | kNN analog / local kernel on the declared feature vector, purge 6 sessions, embargo overlapping horizons |
| Primary metric | Mean pinball loss at \(\tau\in\{0.1,0.5,0.9\}\) on net PnL |
| Secondary | CRPS proxy on the five-quantile cone; Brier on \(1\{\mathrm{PnL}>0\}\); interval coverage of \([q_{0.1},q_{0.9}]\) |
| Minimum meaningful effect | \(\Delta\) pinball \(\ge 0.03\) relative reduction vs the better of B1/B2, on **each** of two disjoint windows |
| Splits | development: indices \(0..251\); quarantine: \(252..314\) **never used for selection**; confirmation: \(315..519\) **unopened for F0** |
| Windows for the “two disjoint” test | W1 = sessions \(80..160\) inside development; W2 = sessions \(170..240\) inside development. Quarantine and confirmation unused. |
| Kill | Fail if either window misses the effect; fail if gain vanishes after costs; fail if \(N_{\mathrm{eff}}<8\) on >40% of queries; fail if confirmation is touched |
| Seeds | dataset `0x51f7a01d`; any model RNG recorded in the run manifest |

## What a result means

| Result | Evidence status | Product consequence |
|---|---|---|
| Candidate beats B1 and B2 on W1 and W2 after costs | `VALIDATED` **for F0-v0 only** | State/position formulation may proceed as a predictive candidate; geometry still unearned |
| Mixed / underpowered | `INCONCLUSIVE` | Workstation continues as an analysis product; no predictive language |
| No improvement | `UNSUPPORTED` (predictive claim) | Same: analysis product lives; geometry cannot be sold as alpha |

A null does **not** delete analog terrain as a **descriptive** tool.

## Explicit non-goals

- No connection Laplacian, holonomy, sheaf, or TDA features in F0
- No neuroevolution
- No live data
- No claim about real SPY
- No use of the current UI’s confirmation query (day 402) as an F0 result

## Execution rights

Stage 5 owns execution. Stage 0 only registers the protocol so later work cannot pretend the test was unspecified.
