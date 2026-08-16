# STAGE 1: domain schemas, evidence model, and provenance

**STATUS:** PASS

Authorization: Stage 0 `PARTIAL_PASS` permitted this stage. The operator channel re-submitted the master specification instead of an isolated `ADVANCE STAGE 1` token. Recorded as a process exception; no later stage was opened.

## OBJECTIVE

Create the scientific object model before analytics. An analysis result cannot exist without data version, code version, configuration, seed, coordinate semantics, evidence status, and source attribution.

## CHANGES

| Path | Role |
|---|---|
| `src/lib/atlas/hash.ts` | Canonical JSON + SHA-256 + immutable run IDs |
| `src/lib/atlas/evidence.ts` | Nine S6 states + conservative transition graph |
| `src/lib/atlas/coordinates.ts` | Role registry + confusion rejects |
| `src/lib/atlas/schemas.ts` | 29 required types + AnalysisResult |
| `src/lib/atlas/analysis.ts` | Provenance / result / evidence-entry builders |
| `src/lib/atlas/index.ts` | Public barrel |
| `tests/scientific/stage1-schemas.test.ts` | Acceptance tests |
| `docs/execution/stage-01-plan.md` | Tests declared before code |
| `docs/adr/0002-canonical-schemas.md` | Schema ADR |
| `package.json` | `test:scientific` script |
| `tsconfig.json` | `allowImportingTsExtensions` |

Did **not** add event store, valuation, feature DAG, geometry, F0 execution, or UI wiring.

## TESTS EXECUTED

```
npx tsc --noEmit                          # pass
node --experimental-strip-types --test tests/scientific/stage1-schemas.test.ts
# tests 9, fail 0
```

## SCIENTIFIC CERTIFICATES

- Run ID identity under key-order permutation of config (`CERTIFIED` software identity).
- Prohibited evidence transitions throw (`CERTIFIED` for the declared graph).
- Coordinate-role confusions throw (`CERTIFIED` for the S5 pair list).
- AnalysisResult parse requires the seven pass-criteria fields (`CERTIFIED`).

## FAILED OR INCONCLUSIVE CHECKS

- Evidence *edges* are ENGINEERING_INFERENCE (sources list states, not a transition table).
- Prototype UI still uses `PENDING` / `NOT_TESTED` and is not bound to these schemas.
- Hashing uses `node:crypto` (Node scientific runtime). Browser hashing not provided.
- No persistence. Objects exist only as types + tests.
- S0–S4 PDFs still missing.

## EVIDENCE STATUS

| Item | Status |
|---|---|
| Schema as the object model | `EXACT` (definitional) |
| Transition graph | `SPECULATIVE` as science; `CERTIFIED` as implemented policy |
| Prototype lab claims | unchanged, not `VALIDATED` |
| F0 | still `OUT_OF_SCOPE` until Stage 5 |

## LIMITATIONS

Does not store events, value positions, compute features, or run F0. Does not make the visible lab scientifically complete.

## GATE RESULT

**PASS.** Stage 2 (event store / live-replay identity) is the next permitted implementation.

## NEXT PERMITTED ACTION

ADVANCE STAGE 2
