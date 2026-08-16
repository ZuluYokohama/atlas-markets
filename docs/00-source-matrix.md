# Source-to-requirement matrix

**Stage:** 0 — reconnaissance  
**Date:** 2026-08-16  
**Evidence status of this document:** `DESCRIPTIVE` of what was inspectable in this workspace.  
**Outside-knowledge items** are labeled `ENGINEERING_INFERENCE` or `PUBLIC_LITERATURE`.

This matrix maps every declared primary source, plus inspectable substitutes, onto product requirements. It does **not** validate any market claim.

## 1. Source inventory

| ID | Declared path | Status | SHA-256 | Role |
|---|---|---|---|---|
| S0 | `/mnt/data/zeta_phase_recurrence_paper.pdf` | **MISSING** | — | Mathematical certificate / phase-recurrence discipline |
| S1 | `/mnt/data/Commercialization Blueprint for a Cellular-Sheaf and TDA Scientific Studio.pdf` | **MISSING** | — | Epistemic product architecture, evidence states, coordinate registry |
| S2 | `/mnt/data/Neuroevolution to Options Search_ An Adversarial Technical Synthesis of Edge, Overfitting, and the Variance Risk Premium.pdf` | **MISSING** | — | Overfitting, trial governance, VRP / selection-bias correction |
| S3 | `/mnt/data/Evolving Mario from Scratch.pdf` | **MISSING** | — | Software metaphor: state-reactive controller, held-out worlds |
| S4 | `/mnt/data/GT-MoE_Rogue_Geometric-Topological_Drilling_Intelligence-v1.pdf` | **MISSING** | — | Operational visualization / specialist-routing inspiration |
| S5 | `attachments/Position Terrain _ Topological Alpha Workstation_ A Gauge-Audited Algorithm and Software Architectur.pdf` | **PRESENT** (48 pp, 747 328 bytes) | `29fa400237b8ecd38e24652b496ad953e1bd2af3f8eb5c01df0bf5ae9956206b` | Synthesis architecture (PCT-SFT). Cites S0–S4 as prior uploaded files. |
| S6 | Master staged-execution prompt (this run) | **PRESENT** | n/a (chat artifact) | Binding execution protocol, stage gates, object model |
| S7 | `.grok/skills/position-terrain/SKILL.md` | **PRESENT** | n/a | Local implementation playbook for the pre-existing prototype |
| S8 | Pre-existing `src/lib/pct/**` + workstation UI | **PRESENT** | n/a | Uncertified prototype residue from a prior session |

**Hard finding.** The five named primary PDFs at `/mnt/data/` are not on this filesystem. A full-disk search found only S5. Public web search did **not** recover documents under those exact titles. Unique claims that exist only in S0–S4 cannot be independently extracted. They are treated as `OUT_OF_SCOPE` until the files are provided.

S5 restates the commercially and scientifically relevant content of S0–S4 via in-document citations (`turn0file0`–`turn0file3`). That restatement is **not** a substitute for the originals.

## 2. What each inspectable source authorizes

### S5 — Position Terrain / Topological Alpha Workstation (synthesis)

| Extracted claim (source language, condensed) | Product requirement | Stage | Evidence class if implemented as written |
|---|---|---|---|
| Product is a position-conditioned terrain: `(history, P, π, h) → [outcome terrain, analogs, uncertainty, evidence]` | Workstation query object | 3, 5, 6 | `EXACT` (definitional) |
| Inferential object is a **distribution** \(\widehat{\mathcal L}(Y_{t,h}\mid Z_t)\), not a directional guarantee | Distributional heads; no “alpha” badge | 5, 6, 11 | `EXACT` |
| Distinguish inserted geometry vs exact consequences vs numerical certificates vs descriptive observations vs validated findings vs speculation | Evidence ledger + statuses | 1, 6 | `EXACT` |
| Three transports must not be conflated: position, connection, strategy | Separate modules + typed IDs | 3, 7, 6 | `EXACT` |
| Live and replay share one event type; differ only by clock | Event store + virtual clock | 2, 12 | `CERTIFIED` only after live/replay hash identity |
| `t_available` is the causal field | PIT snapshot builder | 2, 4 | `CERTIFIED` by future-poison test |
| Indicators are a coordinate dictionary, not independent truths | Feature DAG + family ablation | 4, 5 | `DESCRIPTIVE` until ablation |
| Deep-Sets-style \(E_P=\rho(\sum_j\phi(\ell_j))\) | Permutation-invariant encoder | 3, 11 | `EXACT` symmetry; usefulness is E4 |
| Position transport \(T^P_{t\to u}:F_t\to F_u\) with residual gate | Versioned transport rules | 3 | `CERTIFIED` reproducibility; not predictive |
| Strategy compiles to a deterministic automaton | Strategy DSL + replay | 3, 6 | `CERTIFIED` replay identity |
| Connection Laplacian \(L_U\), Procrustes \(U_{ij}\), gauge conjugacy | Gate E0 | 7 | `CERTIFIED_OPERATOR` only |
| Gauge-fair comparator (raw DCT, unwrapped DCT, GFT, PCA, connection, shuffled) | Gate E1 matrix | 8 | E1-A = `CERTIFIED_SYNTHETIC_ORACLE`; E1-G required for model input |
| Holonomy is discrete connection inconsistency, **not** market curvature | Gate E2 | 9 | Detectability ≠ profitability |
| Future outcomes must not build graph/frames/transports/scaling | Gate E3 | 10 | Hard blocker for E4 |
| Only E4 can support a narrow predictive claim | Frozen protocol + costs + DSR/PBO | 5, 11 | `VALIDATED` only for the exact protocol |
| E5 is shadow mode; no order authority | Live/replay parity, fail-closed | 12 | Operational, not alpha |
| LFM is semantic compiler only; pin revision/checksum | Sidecar policy | 1, 13 | `OUT_OF_SCOPE` until pinned |
| First dataset: synthetic worlds + one liquid ETF; Cboe/LOBSTER licenses unknown | Data adapters, no redistribution | 0, 2, 13 | License unresolved |
| Build order: data truth → position truth → replay → analog terrain → geometry → ML | Stage sequence 1–11 | all | Process rule |
| Graph connection ≠ validated higher cellular sheaf | Sheaf objects gated | 7+ | Compatibility gate required |

S5 also cites public literature (see §4). Those citations are `PUBLIC_LITERATURE`, not original results of S5.

### S6 — Master staged-execution prompt

Binding for this run. Adds:

- `execution_mode: CHECKPOINTED`
- Canonical schemas (Project … ProvenanceManifest)
- Evidence states: `EXACT | CERTIFIED | DESCRIPTIVE | VALIDATED | UNSUPPORTED | INCONCLUSIVE | FAILED_CHECK | SPECULATIVE | OUT_OF_SCOPE`
- Stage 0–13 workflow, hard stops, kill criteria
- First falsification question (Stage 5; protocol defined now)
- Forbidden: live order placement, brokerage auth, autonomous trading in the initial platform
- Required repo shape (adapt existing; do not create every directory in Stage 0)

Where S5 and S6 differ, **S6 wins for process**; **S5 wins for mathematical definitions** unless S6 is more restrictive. Differences are listed in §5.

### S7 / S8 — Pre-existing prototype (not a scientific source)

These files show a prior attempt to implement S5 inside this app-builder workspace. They are **implementation residue**, not authority.

Mapped capabilities (provisional, uncertified):

| Module | Apparent coverage | Formal stage | Status vs S5/S6 |
|---|---|---|---|
| `types.ts` | Evidence, gates, legs, terrain, connection bundle | 1 | Incomplete vs required type list |
| `core.ts` | RNG, BS, Jacobi, DCT, Procrustes | 3, 7 | Demo-grade numerics |
| `market.ts` | Seeded 520-day synthetic SPY | 2, 4 | No event log; no `availability_time` |
| `position.ts` | Templates, three named transports, path PnL | 3 | Template/exposure share one matcher; contract mode is not identity replay |
| `terrain.ts` | kNN analogs, quantiles, abstain | 5, 6 | `DESCRIPTIVE`; confirmation leak (see audit) |
| `geometry.ts` | Connection, E1-A, E2 demo, sliding PH | 7–9 | E1-A oracle only; PH is a sketch |
| `strategy.ts` | Automaton + keyword compiler | 3, 6 | Deterministic predicates; LFM is a regex stand-in |
| `evidence.ts` | Static gate/claim/trial tables | 1, 11 | Hardcoded trial metrics — not computed |
| UI routes | Workbench, geometry, strategy, V&V, evidence | 6 | Demo UI; not a Stage 6 acceptance |

**None of S8 is accepted as passing a later stage.** Later stages must re-derive or formally certify this code.

## 3. Missing sources — inferred requirements (quarantined)

The following are **restated by S5** as coming from S0–S4. Until the PDFs are attached, they are `INCONCLUSIVE` as to the originals and may be implemented only as S5/S6 restatements.

| Missing source | S5 restatement | What we will **not** claim |
|---|---|---|
| S0 zeta / phase recurrence | Use a non-financial quasiperiodic \(\Phi_q(t)=a_q e^{-it\omega_q}\) demo as a CI certificate; do not claim new results about zeta zeros | Any number-theoretic or zeta-zero discovery |
| S1 scientific-studio blueprint | Evidence states, coordinate registry, inserted-vs-recovered geometry, TypeScript client + Python numerical service, structure-preserving nulls | That the studio product exists or is licensed for reuse beyond this restatement |
| S2 neuroevolution / options synthesis | Markets are one nonstationary path; search increases selection bias; freeze protocol, purge/embargo, trial ledger, DSR/PBO | That neuroevolution found VRP edge |
| S3 Mario | React to structured state; test on worlds not used for selection | Transfer of a game controller to markets |
| S4 GT-MoE | UI pattern: expose routing/activation; synchronized geometry + topology + model panels | That GT-MoE geometric claims are market structure |

**Web search (ENGINEERING_INFERENCE):** no public copies of S0–S4 under the given titles were found. “Evolving Mario from Scratch” is not identified with a single canonical public paper; NEAT / SethBling MarI/O are related public artifacts and must not be treated as S3.

## 4. Public literature cited by S5 (secondary)

These are **not** in the primary corpus. They are listed so later stages cite them correctly and do not invent results.

| Topic | Citation as given by S5 | Use in Atlas |
|---|---|---|
| Graph signal processing | Shuman et al., arXiv:1211.0053 | GFT comparator |
| Sliding-window persistence | Perea–Harer, arXiv:1307.6188 | TDA of time series |
| Quasiperiodic persistence | Gakhar–Perea, arXiv:2103.04540 | Orbit-closure discipline |
| Connection Laplacian / VDM | Singer–Wu, arXiv:1102.0075 | Frames + \(L_U\) |
| Connection Cheeger | Bandeira–Singer–Spielman, arXiv:1204.3873 | Holonomy / frustration |
| Synchronization geometry | Gao–Brodzki–Mukherjee, arXiv:1610.09051 | Gauge / holonomy |
| Cellular sheaf Laplacians | Hansen–Ghrist, arXiv:1808.01513 | Sheaf vs graph-connection boundary |
| Sheaf Fourier Transform | D'Acunto–Di Nino–Di Lorenzo–Barbarossa, arXiv:2608.01318 (2026 preprint) | Candidate SFT; preprint, not market validation |
| Deep Sets | Zaheer et al., arXiv:1703.06114 | Position encoder symmetry |
| OFI | Cont–Kukanov–Stoikov, arXiv:1011.6402 | Microstructure baseline |
| LOB dynamics | Cont–Stoikov–Talreja, *Operations Research* | Activity model |
| DeepLOB | Zhang–Zohren–Roberts, arXiv:1808.03668 | Learned comparator, not first baseline |
| Deep Hedging | Bühler et al., arXiv:1802.03042 | Hedging benchmark |
| CQR | Romano–Patterson–Candès, arXiv:1905.03222 | Calibration layer; exchangeability fails in markets |
| DSR | Bailey–López de Prado, SSRN 2460551 | Selection-bias correction |
| PBO / CSCV | Bailey et al., *Journal of Computational Finance* | Backtest-overfitting audit |
| Cboe Option Quote Intervals | datashop.cboe.com | Future data vendor; license unknown |
| LOBSTER | lobsterdata.com | Future LOB vendor; license unknown |
| LiquidAI LFM2.5 GGUF | huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF | Semantic sidecar; license unresolved |

## 5. S5 vs S6 differences (do not silently reconcile)

| Topic | S5 | S6 | Rule for this run |
|---|---|---|---|
| Evidence statuses | Adds `PENDING`, `NOT_TESTED` in the skill/prototype | Nine statuses, no `PENDING`/`NOT_TESTED` | S6 statuses are canonical; prototype extras are aliases to map (`PENDING`→not a formal state; use `OUT_OF_SCOPE` or omit) |
| Market state | \(M_t=(C_t,A_t,\Sigma_t,E_t)\) | \(X_t=X^{\mathrm{price}}\oplus\cdots\oplus X^{\mathrm{strategy}}\) | Both; Stage 1 schemas must encode either decomposition |
| Position encoder | Deep Sets first; Set Transformer later | Same, plus “set/graph encoder only after classical set baseline” | Same |
| First falsification | Implicit in E4 | Explicit Stage 5 question | Use S6 wording; freeze in F0 protocol |
| Repo layout | `apps/workstation-web`, Python workers | `apps/`, `packages/`, `plugins/` | Adapt in place; do not greenfield-delete the running app |
| Numerical core | Prefers Python sparse LA | Not prescribed | **ENGINEERING_INFERENCE:** keep TS prototype for UI; Stage 1 schemas stay language-agnostic |
| Editions | Implied later | Stage 13 Local / Hosted / Enterprise | Out of scope until Stage 13 |

## 6. Unsupported or inaccessible claims

| Claim | Source | Status |
|---|---|---|
| Unique theorems or figures in S0–S4 not restated by S5 | S0–S4 | `OUT_OF_SCOPE` (files missing) |
| “Topology finds alpha” | explicitly rejected by S5/S6 | `UNSUPPORTED` as a product thesis |
| Existing UI E0/E1 `CERTIFIED` badges | S8 | `SPECULATIVE` until scientific tests exist |
| Hardcoded trial pinball/CRPS in `evidence.ts` | S8 | `FAILED_CHECK` as scientific evidence (not computed) |
| Cboe ~20 GB/yr SPY 1-min estimate | S5 citing vendor page | `DESCRIPTIVE` vendor figure; not verified here |
| LFM2.5 sizes 731 MB / 5.16 GB | S5 citing HF | `DESCRIPTIVE`; license unresolved |
| Confirmation-block analog results in the running demo | S8 | `INCONCLUSIVE` / leakage risk (see risk register) |

## 7. Data that may not be redistributed

| Data | Present in workspace? | Redistribution |
|---|---|---|
| Synthetic SPY (`SEED = 0x51f7a01d`) | Yes | Allowed (generated) |
| Real Cboe / OPRA / exchange quotes | No | Forbidden unless a contract exists (none on file) |
| LOBSTER books | No | Forbidden unless licensed |
| Vendor-derived IV/Greeks | No | Subject to vendor terms |
| LFM weights | No | Subject to LiquidAI terms |

**Assumption (explicit):** this project will use **user-supplied or locally generated data only**. The repository must not ship licensed raw market data.

## 8. First falsification experiment (defined, not run)

See [scientific/F0-first-falsification.md](scientific/F0-first-falsification.md). One-line form (S6):

> Does a point-in-time position-conditioned state representation improve a predeclared distributional metric over unconditional and simple regime-conditioned baselines on at least two disjoint historical windows?

This experiment is **registered** in Stage 0. It is **not executed**. Execution belongs to Stage 5. The confirmation block of any dataset used for F0 remains closed.

## 9. Mapping completeness

| Corpus item | Mapped to requirements? |
|---|---|
| S0–S4 files | **No** — inaccessible; only S5 restatements mapped |
| S5 | Yes |
| S6 | Yes |
| S7/S8 | Yes, as uncertified residue |
| Public literature | Yes, as secondary citations |

This is why Stage 0 is a **partial pass**, not a full pass.
