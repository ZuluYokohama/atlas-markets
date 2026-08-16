# STAGE 0: reconnaissance

**STATUS:** PARTIAL_PASS

## OBJECTIVE

Understand the existing repository, source corpus, software stack, available data, licensing constraints, and scientific claim boundaries before coding. No later-stage implementation.

## CHANGES

Added only Stage 0 documentation and a `.gitignore` (so a provenance commit is possible). Did not modify `src/`, schemas, geometry, or the running prototype.

| Path | Role |
|---|---|
| `docs/00-source-matrix.md` | Source-to-requirement matrix |
| `docs/01-repository-audit.md` | Repository, stack, PIT defects |
| `docs/02-scientific-boundaries.md` | Binding scientific law |
| `docs/03-risk-register.md` | Risks R01–R25 |
| `docs/adr/0001-product-scope.md` | Product scope ADR |
| `docs/scientific/F0-first-falsification.md` | Registered F0 protocol |
| `docs/execution/state.yaml` | Execution state machine |
| `docs/execution/stage-00-report.md` | This report |
| `.gitignore` | Exclude node_modules / build artifacts |

## TESTS EXECUTED

| Command / check | Result |
|---|---|
| `find /mnt/data` and full-disk `*.pdf` search | `/mnt/data` absent; only S5 PDF found |
| `sha256sum` on S5 PDF | `29fa400237b8ecd38e24652b496ad953e1bd2af3f8eb5c01df0bf5ae9956206b` |
| `git status` | `fatal: not a git repository` (at inspection) |
| `ls` / line counts of `src/lib/pct` | 4.4k LOC prototype present |
| Top-level npm license scan | Permissive except `lightningcss` MPL-2.0 |
| `curl` health of existing app | HTTP 200 |
| Grep for brokerage / order routing in PCT | None found |
| Web search for S0–S4 exact titles | Not recovered |

No unit tests were added. No `npm run build` was required for this documentation stage.

## SCIENTIFIC CERTIFICATES

None claimed. Stage 0 produces inventories, not operators.

Identities **observed** (not certified):

- Synthetic generator seed is `0x51f7a01d` (code fact).
- S5 is 48 pages and cites S0–S4 as prior uploads.

## FAILED OR INCONCLUSIVE CHECKS

1. **S0–S4 missing** — cannot extract original text/figures.
2. **No git history** at inspection — no prior `source_commit`.
3. **Prototype confirmation leak** — default query 402 ∈ confirmation; analogs not excluded from confirmation.
4. **Prototype geometry leakage** — full-sample scaler and future PCA neighbors.
5. **Static E0/E1 CERTIFIED labels** — no scientific test suite.
6. **Hardcoded trial metrics** — not computed.
7. **No event store / availability_time** — live/replay identity untestable.
8. **Template ≡ exposure transport** — exposure QP not implemented.
9. **S5 E1 digits** not reproduced in this stage.
10. **Transitive licenses** not fully scanned.
11. **LFM / Cboe / LOBSTER** licenses unresolved (software and data not present).

## EVIDENCE STATUS

| Item | Status |
|---|---|
| S5/S6 product definition | `EXACT` (definitional for this run) |
| Missing-PDF unique claims | `OUT_OF_SCOPE` |
| Running terrain numbers | `DESCRIPTIVE` at best; confirmation-tainted → `INCONCLUSIVE` |
| Prototype gate badges | `SPECULATIVE` |
| Prototype trial table | `FAILED_CHECK` as evidence |
| Tradable alpha | `OUT_OF_SCOPE` |
| F0 | registered, `OUT_OF_SCOPE` until Stage 5 |
| This reconnaissance | `DESCRIPTIVE` |

## ARTIFACTS

See `docs/execution/state.yaml`. Hashes recorded after the Stage 0 commit.

## LIMITATIONS

- Does not implement schemas, event store, or tests.
- Does not accept or reject the pre-existing UI as a product pass.
- Does not obtain market-data rights.
- Does not recover S0–S4.

## GATE RESULT

**PARTIAL_PASS.** Installable repository, mapped inspectable sources, explicit licensing assumptions, no new later-stage code. Failed corpus-completeness and git-history checks prevent a full pass. Hard-stop conditions are **not** met: no licensed data is being redistributed; Stage 1 schemas do not require the missing PDFs.

## NEXT PERMITTED ACTION

ADVANCE STAGE 1
