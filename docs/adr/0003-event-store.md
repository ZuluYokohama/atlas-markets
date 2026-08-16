# ADR 0003 — Event store and live/replay identity

**Status:** accepted for Stage 2  
**Date:** 2026-08-16

## Decision

1. One append-only log. Corrections are new rows with the same `logicalId`.
2. Unified admission (live and replay):

   `sequence_number <= watermark.sequence`  
   **and** `availability_time <= watermark.time`  
   **and** `ingest_time <= watermark.time`

3. `event_time` is not an admission field (known-ahead catalysts).
4. Watermark is `(time, sequence)` — ENGINEERING_INFERENCE. Equal ingest timestamps otherwise make incremental live diverge from full-log replay.
5. Connectors are pull-only. `placeOrder` / `sendOrder` / `route` / `broker` are rejected.

## Consequences

Stage 3+ must consume `PitSnapshot`, not raw arrays. A live/replay hash mismatch is a hard stop.
