# Repository audit

**Stage:** 0 — reconnaissance  
**Date:** 2026-08-16  
**Workspace:** app-builder template + pre-existing PCT-SFT prototype  
**Git:** **not a repository** at inspection time (initialized after this audit solely to pin Stage 0 artifacts)

## 1. What this repository is

This is **not** a greenfield `atlas-markets/` monorepo. It is a **Grok App Builder** workspace:

- Node 22, Vite 8, TanStack Start, React 19, Tailwind v4
- Preview contract: process must listen on `0.0.0.0:8080` (internal; not a user instruction)
- `node_modules/` preinstalled (254 top-level packages)
- Auth (Better Auth + PGLite), PWA, and host-bridge scaffolding from the template
- A prior session already wrote a Position Terrain workstation under `src/lib/pct/` and `src/routes/`

There is **no** `README`, `CONTRIBUTING`, `LICENSE`, or scientific test tree.

## 2. Install / run status

| Check | Result |
|---|---|
| `package.json` present | Yes (`app-builder-workspace`, private) |
| `node_modules` present | Yes |
| `npm run dev` bind | `vite dev --host 0.0.0.0 --port 8080` |
| `startup.sh` | Present, idempotent curl-then-start |
| Dev server at audit | HTTP 200 |
| `npm run test` | Template only: `scripts/**/*.test.mjs` (PWA/brand) |
| Scientific tests | **None** |
| `npm run typecheck` / `build` | Not re-run in Stage 0 (no implementation change) |
| Python numerical service | **Absent** |
| Sparse eigensolver / TDA library | **Absent** (dense Jacobi in TS; PH sketch) |

**Installation blockers:** none for the existing TypeScript app. Blockers for the *specified* architecture: no Python worker, no event store, no market-data adapter, no pinned LFM, no git history at start.

## 3. File tree (application-relevant)

```
/workspace
  AGENTS.md                 app-builder operating rules
  package.json
  vite.config.ts            TanStack Start + nitro(vercel) on build only
  startup.sh
  tsconfig.json
  eslint.config.mjs
  migrations/0001_auth.sql  Better Auth tables only
  attachments/              S5 PDF only
  .grok/skills/             including position-terrain
  scripts/                  browser-smoke, PWA, migrate
  server/middleware/        PWA
  public/                   favicon, PWA assets
  src/
    lib/pct/                scientific kernel (prototype)
    lib/auth/               template identity
    lib/db.ts               PGLite
    lib/multiplayer/        template P2P — unused by PCT
    components/workbench/lab.tsx
    components/app-shell.tsx
    routes/                 / /geometry /strategy /gates /evidence /login
    store/workbench.ts
  docs/                     created in this stage
```

Absent relative to S6 target layout: `apps/`, `services/`, `packages/core-schemas`, `event-store`, `position-engine`, `feature-engine`, `evaluation`, `evidence-ledger`, `plugins/`, `experiments/`, `tests/scientific/`.

**Stage 0 action:** do **not** create that tree yet. Later stages introduce packages when their object model exists.

## 4. Existing PCT kernel (line counts)

| File | Lines | Apparent responsibility |
|---|---:|---|
| `src/lib/pct/core.ts` | 455 | Seeded RNG, BS, dense LA, DCT, Jacobi, Procrustes |
| `src/lib/pct/market.ts` | 445 | Synthetic 520-day SPY, chains, causal-ish encode |
| `src/lib/pct/position.ts` | 442 | Templates, quote, transport, path PnL |
| `src/lib/pct/geometry.ts` | 411 | Connection graph, E1-A, E2 demo, PH sketch |
| `src/lib/pct/terrain.ts` | 284 | Position-conditioned kNN terrain |
| `src/lib/pct/types.ts` | 251 | Shared types |
| `src/lib/pct/strategy.ts` | 246 | Automaton + `compilePrompt` |
| `src/lib/pct/evidence.ts` | 159 | Static gates/claims/trials |
| `src/lib/pct/universe.ts` | 28 | Lazy singletons |
| `src/components/workbench/lab.tsx` | 773 | Main instrument |
| Other UI routes | ~640 | Inspectors |

**Total PCT+UI ≈ 4.4k lines.** No unit tests.

## 5. Point-in-time and split semantics (as implemented)

From `market.ts`:

- Calendar: weekdays from 2024-01-02, 520 sessions, seed `0x51f7a01d`
- Splits: `development` \(i<252\), `quarantine` \(252\le i<315\), `confirmation` \(i\ge 315\)
- Events have `knownAheadDays`; there is **no** event log and **no** `availability_time` / `ingest_time` / `revision_time`
- `encodeState` uses `upcomingEvents` gated by `knownAheadDays` — a partial PIT rule
- `opex` flag is `i % 21 < 2` (synthetic calendar, not an exchange calendar)

From `terrain.ts`:

- Analog loop: `u < query - 6`, skip `split === "quarantine"` only
- **Does not skip `confirmation`**
- Default query index is **402** (`universe.ts`), which is **inside confirmation**
- Therefore the running demo **opens the confirmation block** as both query and analog source

This is a scientific-integrity defect in the prototype. Recorded; not silently “fixed” in Stage 0.

From `geometry.ts` `buildConnection`:

- Feature scaler \(\mu,\sigma\) is fit on **all** sampled vertices
- Local PCA neighborhood is `i-4 … i+5` in vertex order (includes later vertices)
- Similarity kNN is computed on the full sample

These violate the E3 “train-only / no future” rule. Prototype geometry is **not** point-in-time.

## 6. Position engine notes

- Templates: long call/put, verticals, straddle, iron condor, and others in `TEMPLATES`
- Valuation: Black–Scholes with \(r=0.045\), \(q=0.012\); mid/bid/ask are model-derived, not prints
- `contract` transport: re-quotes the same template on the target day; **not** OCC-id lifetime replay
- `template` and `exposure` share the same nearest-contract matcher; exposure QP \(\arg\min \|Aq-e\|_W\) is **not** implemented
- Residual gate exists; invalid transports can be rejected
- Path PnL holds transported contracts and revalues (skill-documented; not independently tested here)

## 7. Geometry / evidence notes

- E1 `runE1` plants signal in the same eigenvectors used to reconstruct → **E1-A oracle only** (S5 already says this)
- UI still labels E0/E1 as `CERTIFIED` without a frozen test harness
- `TRIALS` pinball/CRPS values are **literals**, not measured
- Claim “workstation finds tradable alpha” is correctly `NOT_TESTED` in the prototype (maps to S6 `OUT_OF_SCOPE` / untested)
- Sliding persistence is a hand-rolled sketch, not a PH backend
- No sheaf coboundary, no heterogeneous stalks, no sparse eigensolver

## 8. Auth, data, and unused template surface

- Better Auth + PGLite: identity only (`migrations/0001_auth.sql`)
- Lab is usable as guest (skill)
- `src/lib/multiplayer/` exists from the template and is unused
- No market-data credentials, no brokerage SDK, no order-routing symbols found in PCT modules

## 9. Dependency license scan (declared packages)

Permissive (MIT / Apache-2.0 / ISC): React, TanStack, Vite, Zod, Zustand, Better Auth, PGLite, Radix, Recharts, Playwright, etc.

| Package | License | Risk |
|---|---|---|
| `lightningcss` | **MPL-2.0** | Weak copyleft; bundler/CSS engine. File-level copyleft if source is modified. Low product risk if used unmodified as a build tool. |
| All other declared deps | MIT / Apache-2.0 / ISC | Acceptable for Local Research Edition |

No AGPL/SSPL/proprietary runtime dependency declared. **Transitive** licenses were not exhaustively audited (limitation).

Unresolved **non-npm** licenses (not installed): LiquidAI LFM2.5, Cboe DataShop, LOBSTER, any exchange redistribution.

## 10. Zeta / TDA / market / UI / model code

| Family | Present? | Location | Grade |
|---|---|---|---|
| Zeta / phase recurrence | No | — | Missing S0; S5 specifies a non-financial demo for later CI |
| TDA | Sketch | `geometry.ts` `slidingPersistence` | Not a PH library |
| Market / options | Synthetic only | `market.ts`, `position.ts` | Demo |
| UI workstation | Yes | `lab.tsx` + routes | Stage 6 prototype |
| Model / MoE / neuroevolution | No | hardcoded `TRIALS` | Correctly not built |
| Event store | No | — | Stage 2 |
| Schemas / provenance | Partial types | `types.ts` | Stage 1 |

## 11. Git / provenance

At inspection:

- `fatal: not a git repository`
- `source_commit: null`
- No tags, no signed history, no CODEOWNERS

Stage 0 initializes git **after** writing these documents so later stages can pin `source_commit`. That commit is a workspace snapshot, not an upstream project history.

## 12. Ownership and rights (as knowable here)

| Asset | Ownership status |
|---|---|
| App-builder template | Platform template; not product IP of Atlas |
| S5 PDF in `attachments/` | Provided in this workspace; legal title not documented |
| S0–S4 | Not present; presumed prior user uploads from another session |
| `src/lib/pct/**` | Written in a previous sandbox session; no CLA |
| Public arXiv papers | Cite only; do not vendor PDFs unless licenses allow |
| Market data | None present |

**Material ambiguity:** we cannot independently prove title to S0–S4 or S5. We treat them as **user-supplied research inputs** for this private research instrument. We will not redistribute the PDFs or any licensed market data.

This does **not** block schema design (Stage 1). It **does** block any commercialization claim (Stage 13) and any redistribution of source PDFs.

## 13. First-stage dependency implications

Stage 1 may proceed against S5+S6 object lists. It must **not** treat S8 types as the schema. Pre-existing UI may keep running as an uncertified demo; Stage 1 adds `packages/core-schemas` (or `src/lib/schemas`) beside it without expanding geometry or trading features.
