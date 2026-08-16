# Scientific boundaries

**Stage:** 0  
**Status of this document:** process law for Atlas Markets / PCT-SFT  
**Authority:** S6 (execution prompt) + S5 (architecture). Missing S0–S4 do not expand these boundaries.

## 1. What the product is allowed to be

A local-first, evidence-aware **research and simulation** instrument that answers:

> For this exact position, under this point-in-time market condition, activity state, strategy state, data availability, execution model, and outcome horizon, what happened historically in comparable states—and what evidence exists that any observed relationship generalizes?

It is **not**:

- an automated money machine
- a brokerage or order-routing interface
- a promise of financial performance
- a claim that topology, sheaves, holonomy, or TDA “find alpha”

## 2. Distributional prediction

The primary inferential object is

\[
\widehat{\mathcal L}\big(Y_{t,h}(P)\mid X_t,\,P_t,\,S_t^\pi,\,R_t\big).
\]

Allowed outputs: distribution, quantiles, calibrated probability, uncertainty interval, or **abstention**.

Forbidden outputs (as product claims): guaranteed direction, guaranteed edge, “pass/alpha” coloring of a descriptive pattern.

A visually separated terrain is **not** a predictive result.

## 3. Evidence states (canonical)

Use only:

| State | Meaning |
|---|---|
| `EXACT` | Mathematical consequence of declared definitions |
| `CERTIFIED` | Numerical invariant or implementation identity passed |
| `DESCRIPTIVE` | Observed in current data |
| `VALIDATED` | Survived frozen holdout / matched-null design |
| `UNSUPPORTED` | Declared positive claim failed its test |
| `INCONCLUSIVE` | Insufficient discrimination or power |
| `FAILED_CHECK` | Numerical / software integrity gate failed |
| `SPECULATIVE` | Interpretation not yet tested |
| `OUT_OF_SCOPE` | Outside current protocol |

Prototype aliases `PENDING` and `NOT_TESTED` are **not** canonical. Map `NOT_TESTED` → `OUT_OF_SCOPE` (or omit). Do not invent “pass” language for `DESCRIPTIVE` results. Do not use green-as-success for unvalidated patterns (S6 Stage 6).

## 4. Point-in-time correctness

No feature, graph, transport, label, normalization statistic, option-chain field, catalyst classification, or regime assignment may use information unavailable at the decision timestamp.

Every computed object must eventually carry:

`event_time`, `availability_time`, `ingest_time`, `revision_time`, `source`, `quality_flags`

**Current prototype gap:** bars are generated as a closed array; there is no event log; scalers and kNN graphs see the full sample; default query sits in the confirmation block. These are **known violations**, not accepted behavior.

Live and replay must share one pipeline and differ only by clock. Any live/replay divergence is a **hard stop** for downstream modeling (Stage 2).

## 5. Synthetic data boundary

Synthetic paths **may** be used for: software tests, robustness, pricing, hedging, execution experiments, null calibration, planted-signal power analysis.

Synthetic paths **may not** be presented as genuine directional information absent from historical evidence.

The current 520-day SPY path is synthetic. Regime labels are planted by `REGIME_PLAN`. Using those labels as if they were independently estimated regimes is circular unless the protocol says so.

## 6. Geometry is a candidate representation

A geometric, topological, sheaf, connection, persistence, or holonomy object is **not** automatically predictive.

Inclusion rule: predeclared incremental test against simpler baselines, frozen before looking at confirmation.

Three transports are distinct maps:

1. **Position transport** \(U_{t\to u}:F_t\to F_u\) — economic comparability of option legs across chain fibers  
2. **Connection transport** \(U_{ij}\in O(r)\) — frame alignment of market-state vertices  
3. **Strategy evolution** — deterministic automaton on policy state  

Do not conflate them in types, UI, or papers.

**Graph connection \(\neq\) validated higher cellular sheaf.** Pairwise transports do not prove compatible restriction maps on higher cells.

Holonomy is **discrete connection inconsistency**. It is not physical market curvature and is not a trading signal unless it later passes E4 against simpler path-dependence / regime features.

## 7. Gate ladder (what a pass authorizes)

| Gate | Question | A pass authorizes | A pass does **not** authorize |
|---|---|---|---|
| E0 | Is the operator correct? | `CERTIFIED` implementation | Compression, prediction, structure, alpha |
| E1 | Does the basis earn complexity? | E1-A: `CERTIFIED_SYNTHETIC_ORACLE`; only E1-G can feed models | Market compression from E1-A |
| E2 | Detectable holonomy vs calibrated null? | Detectability of cycle inconsistency | Profitable cycles |
| E3 | Point-in-time identifiability? | Representation reconstructible from data ≤ t | Predictive utility |
| E4 | Frozen incremental utility? | `VALIDATED` for **exact** target/dataset/horizon/protocol/cost/revision | Universal alpha |
| E5 | Shadow robustness? | Operational parity | Order routing |

E1-A in the prototype (signal planted in the reconstruction eigenspace) is **implementation calibration**, exactly as S5 warns. The numbers \(D_{\mathrm{conn}}=0.020817\) etc. in S5 are a **prior session result**, not reproduced in Stage 0.

## 8. Model-selection objective

Do **not** maximize raw in-sample Sharpe.

General form (weights frozen in the experiment protocol **before** confirmation):

\[
\mathcal J=\mathcal L_{\mathrm{distribution}}+\lambda_{\mathrm{cal}}\mathcal L_{\mathrm{cal}}+\lambda_{\mathrm{tail}}\mathcal L_{\mathrm{tail}}+\lambda_{\mathrm{turn}}\mathcal L_{\mathrm{turn}}+\lambda_{\mathrm{cost}}\mathcal L_{\mathrm{cost}}+\lambda_{\mathrm{complex}}\Omega_{\mathrm{complex}}+\lambda_{\mathrm{frag}}\Omega_{\mathrm{frag}}+\lambda_{\mathrm{trial}}\Omega_{\mathrm{trial}}.
\]

Raw Sharpe may be reported as a secondary descriptive metric.

Trial governance: every evaluated configuration is recorded, including abandoned ones. DSR / PBO / CSCV / plus-one Monte Carlo / purge / embargo apply once search begins.

Neuroevolution and large architecture search are **prohibited** until the trial ledger, effective-trial estimate, DSR/PBO, simpler-model ladder, and unopened confirmation block all exist.

## 9. Local language model boundary

A local LFM2.x may: plan, map schemas, compile Position/Strategy DSL, compose experiments, explain reports.

It may **not** be authority for: valuation, Greeks, features, statistical tests, backtest metrics, evidence status, orders.

Reproducible runs must pin: `repo_id`, `revision`, `tokenizer_revision`, `quantization`, `checksum`, `runtime`.

No floating `latest` on a scientific run.

**This workspace:** no LFM is installed. `compilePrompt` is a deterministic keyword mapper. That is acceptable as a stub and must not be labeled as LFM2.5.

## 10. What the running prototype is justified in claiming

| Displayed object | Justified claim | Status |
|---|---|---|
| BS price / Greeks under declared \((r,q,\sigma)\) | Model identity, not market mark | `EXACT` given the formula |
| Synthetic path with seed `0x51f7a01d` | Reproducible fiction | `EXACT` generation |
| Analog quantile cone | Historical (synthetic) neighbors under the coded metric | `DESCRIPTIVE` |
| Abstain when \(N_{\mathrm{eff}}\) low / OOD | Software policy | `EXACT` policy |
| E0/E1 `CERTIFIED` badges | Not justified | treat as `SPECULATIVE` until tests exist |
| Hardcoded trial table | Not evidence | `FAILED_CHECK` if offered as results |
| “Tradable alpha” | Not claimed | `OUT_OF_SCOPE` |
| Confirmation-block terrain at day 402 | Confirmation opened | `INCONCLUSIVE` |

## 11. First falsification experiment (registered)

Full protocol: [scientific/F0-first-falsification.md](scientific/F0-first-falsification.md).

**Question.** Does a point-in-time position-conditioned state representation improve a predeclared distributional metric over unconditional and regime-conditioned baselines on at least two disjoint historical windows?

**Pass interpretation.**

- A **null** result does **not** block building the workstation as an analysis product.
- A null result **does** block claims that the state representation is predictively useful.
- A positive result is `VALIDATED` only for the frozen F0 protocol, not for geometry or live trading.

F0 is **not run** in Stage 0. The confirmation slice of the synthetic calendar remains **closed** for F0.

## 12. Kill criteria (any later layer)

Demote or stop a layer when:

- it fails to beat a simpler baseline on two disjoint windows
- gain disappears after declared costs
- calibration worsens materially
- result lives in one narrow parameter region
- graph/transport is unstable
- effective sample size is insufficient
- advantage vanishes under a gauge-fair comparator
- result is explained by representation leakage
- independent replication fails
- compute is disproportionate to measured value
- it cannot abstain outside historical support

## 13. Engineering inferences (labeled)

The following are **not** in S5/S6 as commands; they are recorded so they cannot hide:

1. Keeping the existing TypeScript demo running while Stage 1 schemas are written is an operational choice of this sandbox, not a scientific endorsement.
2. A Python numerical worker is recommended by S5; Stage 0 does not add it.
3. Jacobi-dense eigensolves will not scale to production graphs; that is an engineering forecast, not a measured benchmark.
4. MPL-2.0 on `lightningcss` is a build-tool concern, not a scientific one.
