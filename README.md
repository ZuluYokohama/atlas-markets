# Atlas Markets

**Internal name:** Topological Alpha Workstation  
**Edition:** Local Research Edition  
**Program status:** CLOSED (ABORT after Stage 13)  
**Predictive claim (F0-v0 / E1-G / E4-v0):** **UNSUPPORTED**

A gauge-audited, position-conditioned **research and simulation** lab. It is not a brokerage, not an automated trading system, and not a promise of financial performance.

Every displayed result is supposed to answer:

1. What information entered the system?  
2. What was mathematically forced?  
3. What was numerically certified?  
4. What was merely observed?  
5. What survived matched controls and frozen out-of-sample testing?  
6. What failed?  
7. When should the system abstain?  
8. What exactly is the user justified in claiming?

The Evidence page is the product. Charts are not.

## What you may claim

Certified operators (E0), a synthetic-oracle reconstruction (E1-A only), holonomy *detectability* under a flat+noise null (E2), point-in-time assembly (E3), and fail-closed shadow with **no order authority** (E5).

You may **not** claim alpha, market curvature, or a right to trade. Connection coordinates are **not** authorized model inputs (E1-G failed).

## What you may do

- Replay development sessions and inspect analog neighborhoods.  
- Read **ABSTAIN** / **INSPECT** (never enter / exit / buy / sell).  
- Copy a research note. It will restate UNSUPPORTED.  
- Read Evidence and V&V for the frozen ledger.

Confirmation block (indices 315–519) stays **closed**. A later test needs a **new protocol ID**.

## Repository map

| Path | Role |
|---|---|
| `src/lib/atlas/` | Certified scientific kernel (events, position, features, eval, geometry, shadow, ledger) |
| `src/lib/pct/` | Pre-Stage-1 prototype residue — not authority |
| `src/routes/` | Workbench, geometry, strategy, V&V, evidence |
| `docs/adr/` | Architecture decisions |
| `docs/execution/` | Stage plans, reports, `state.yaml`, program close |
| `experiments/reports/` | Frozen F0 / E1 / E2 / E3 / E4 / E5 results |
| `tests/scientific/` | Gate tests (do not retune to make them green) |

## Run

```bash
npm install   # if needed
npm run dev   # 0.0.0.0:8080
npm run typecheck
npm run test:scientific
npm run build
```

Dataset is **synthetic** (520-session SPY-like path). Do not redistribute it as market data.

## Frozen negative results

| Protocol | Claim |
|---|---|
| F0-v0 | UNSUPPORTED |
| E1-G | UNSUPPORTED |
| E4-v0 | UNSUPPORTED |

Do not retune these windows. Do not open confirmation “to check.”

## License

See [LICENSE](LICENSE). Research software. No warranty. No investment advice.

## Documentation index

Start at [docs/README.md](docs/README.md).
