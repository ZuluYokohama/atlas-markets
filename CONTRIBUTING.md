# Contributing

This program is **closed**. New scientific work is a **new protocol ID**, not a retune of F0-v0 / E1-G / E4-v0.

## Hard rules

1. Do not open the confirmation block (indices 315–519) for model selection.  
2. Do not add brokerage, `placeOrder` success paths, or live send.  
3. Do not modify existing frozen JSON under `experiments/reports/`. New protocols add new report files only.  
4. Do not label DESCRIPTIVE pictures as VALIDATED.  
5. A null is a successful experiment. Preserve it.

## If you propose a new protocol

1. Write `experiments/protocols/<ID>.md` **before** looking at new numbers.  
2. Freeze metric, splits, kill line, and trial budget.  
3. Add a ledger row even if you abandon the rung.  
4. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md`.

## Code

- Scientific kernel lives in `src/lib/atlas/`.  
- `src/lib/pct/` is residue. Do not extend it as authority.  
- Tests: `npm run test:scientific` and `npm run typecheck`.
