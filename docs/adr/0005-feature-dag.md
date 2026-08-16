# ADR 0005 — Feature DAG and time semantics

**Status:** accepted for Stage 4  
**Date:** 2026-08-16

## Decision

1. Features are computed only from a `PitSnapshot`. They never see the raw log.
2. Indicators (RSI, SMA, ATR, …) are **coordinates**. Evidence status of a computed value is at most `DESCRIPTIVE`.
3. Higher-timeframe series (`weekly_ret`) are missing until that session closes.
4. Missing lookback / missing surface / missing position mark → `null` + `missing`, never a fill.
5. `sma_20_alias` is an intentional duplicate so the formula-hash collision detector has a positive control.

## Not claimed

No feature is predictive. No geometry. F0 is still closed.
