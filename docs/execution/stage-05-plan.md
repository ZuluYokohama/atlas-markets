# Stage 5 plan (written before execution)

**Authorization:** Stage 4 PASS. Master-spec resubmission treated as `ADVANCE STAGE 5`.

## Objective

Run **F0-position-state-vs-baselines-v0** exactly as registered. Confirmation **closed**. Record whatever the metric does, including a null.

## Frozen (from docs/scientific/F0-first-falsification.md)

- Dataset: synthetic SPY, seed `0x51f7a01d`, 520 sessions, same split policy
- W1 = 80..160, W2 = 170..240 (development only)
- Confirmation 315..519 never read
- Primary: mean pinball at 0.1/0.5/0.9 on 5-session net PnL of a long ATM 21-DTE call after costs
- Candidate: kNN on PIT features + position encoder
- Effect: ≥ 3% relative pinball cut vs better of B1/B2 on **each** window

## Acceptance tests (software)

1. Confirmation index access throws.
2. Outcome families compute (PnL, MAE, MFE, forward return, hit).
3. All six baselines produce quantile forecasts.
4. F0 runner writes a versioned report with pinball on W1 and W2.
5. Result status is VALIDATED | INCONCLUSIVE | UNSUPPORTED per the protocol table — not overwritten.

## Out of scope

Geometry, UI panels, opening confirmation, real SPY claims.
