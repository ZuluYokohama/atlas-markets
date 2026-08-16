---
name: position-terrain
description: >
  Extend the PCT-SFT Position Terrain / Topological Alpha laboratory. Use when
  changing analog terrain, position transport, strategy automaton, connection
  Laplacian, holonomy, E0–E5 gates, evidence ledger, or entry/exit scoring.
  Triggers on terrain, analog, holonomy, gauge, PCT-SFT, options position,
  viability, V&V, sheaf Fourier, evidence status.
metadata:
  short-description: "Gauge-audited options position-terrain lab — keep transports distinct and claims labeled"
user-invocable: false
---

# Position Terrain laboratory

This app is a **scientific instrument**, not a trading dashboard and not a game.
An options position is a time-dependent query against typed market-state geometry.

```
(market history, position, strategy, horizon)
  → [conditional outcome terrain, analogs, uncertainty, evidence]
```

## Non-negotiable separations

Three transports must never be conflated:

1. **Position transport** — economically comparable legs across option-chain fibers (`template` / `exposure` / `contract` in `src/lib/pct/position.ts`).
2. **Connection transport** — local frames between market-state vertices (`src/lib/pct/geometry.ts`).
3. **Strategy automaton** — deterministic policy state machine (`src/lib/pct/strategy.ts`).

The language compiler (`compilePrompt`) may propose typed JSON. It is **never numerical authority**: no invented prices, Greeks, leakage decisions, or evidence statuses.

## Evidence statuses

Use only: `EXACT` | `CERTIFIED` | `DESCRIPTIVE` | `VALIDATED` | `UNSUPPORTED` | `INCONCLUSIVE` | `FAILED_CHECK` | `SPECULATIVE` | `PENDING` | `NOT_TESTED`.

Gate ladder: **E0 operator → E1 representation → E2 holonomy → E3 identifiability → E4 predictive utility → E5 live shadow**.

- Terrain on the workbench is **DESCRIPTIVE** (or **INCONCLUSIVE** if it abstains).
- Only E4 may support a narrow predictive claim, and only after frozen holdout, costs, calibration, trial correction, and regime replication.
- Never label a plot “alpha.” The claim “the workstation finds tradable alpha” stays `NOT_TESTED`.

## File map

| Path | Role |
|---|---|
| `src/lib/pct/core.ts` | Seeded RNG, Jacobi, Black–Scholes, DCT |
| `src/lib/pct/market.ts` | Synthetic 520-day SPY universe, causal features, chains |
| `src/lib/pct/position.ts` | Templates, quotes, three transports, `pathPnL` / `revalueLeg` |
| `src/lib/pct/terrain.ts` | Position-conditioned kNN analogs, viability scores |
| `src/lib/pct/geometry.ts` | Connection Laplacian, gauge, E1, E2, sliding persistence |
| `src/lib/pct/strategy.ts` | Automaton predicates + semantic compiler |
| `src/lib/pct/evidence.ts` | Gate records, claims, trial ledger |
| `src/lib/pct/universe.ts` | Lazy singletons — do **not** Jacobi on every page |
| `src/store/workbench.ts` | Replay clock, template, horizon, transport |
| `src/components/workbench/lab.tsx` | Main instrument |
| `src/routes/{geometry,strategy,gates,evidence}.tsx` | Inspectors |

## How to extend

- **New structure** — add a `PositionTemplate` in `TEMPLATES`. Keep Deep-Sets symmetry (leg order must not matter). Persist transport residual; if residual exceeds the frozen threshold, mark `INVALID_POSITION_TRANSPORT` instead of interpolating.
- **New predicate** — add to `PREDICATES` with explicit `from`/`to`. Replay must stay a `switch` on a **copy** of state (TS CFA will otherwise collapse the union).
- **Path PnL** — hold the transported contracts and `revalueLeg` as tenor decays. Never re-transport each day (that resets the mark ≈ entry and zeros analog PnL).
- **Geometry** — keep Jacobi / `getConnection` / `getE1` off the workbench and app-shell render path. Geometry page loads them after mount.
- **SFT / TDA family** — candidate only. Toggle is labeled. E4 decides whether they earn complexity.
- **Causal rule** — features, edges, and predicates dated at T may use only events with `t_available ≤ T`. Known-ahead calendar flags are allowed; future earnings/FOMC content is not.

## Data

Synthetic SPY only (`SEED = 0x51f7a01d`). Splits: development / quarantine / confirmation. Quarantine days are excluded from analog candidates.

## UI

Dark cartographic lab. Newsreader display + IBM Plex body/mono. Sage / clay / sand. No purple, no emoji icons, no hero gradients. Follow `design-ui`. Auth is optional; the lab is usable as a guest.

## What not to add

- Live order routing or execution authority (P4, separate program).
- MoE / neural heads before the analog baseline is frozen and beaten on a declared E4 task.
- Filling sparse terrain with smooth certainty. Abstain, fade, or crosshatch.
- Calling discrete connection holonomy “market curvature.”
