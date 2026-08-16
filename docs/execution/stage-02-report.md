# STAGE 2: event store and live/replay identity

**STATUS:** PASS

## OBJECTIVE

One event-sourced pipeline. Live simulation and replay differ only by clock. Same stream → identical snapshots. No future-available event in an earlier snapshot. Corrections versioned.

## CHANGES

`src/lib/atlas/events/*` — immutable log, virtual clocks, PIT snapshots, live/replay certificate, read-only connector. Tests in `tests/scientific/stage2-replay-identity.test.ts`.

No position compiler, feature DAG, geometry, F0, or brokerage.

## TESTS

`npx tsc --noEmit` pass.  
`node --experimental-strip-types --test tests/scientific/stage1-schemas.test.ts tests/scientific/stage2-replay-identity.test.ts` — 17/17 pass.

## CERTIFICATES

Live incremental walk vs full-log replay: identical content hashes at every ingest watermark (`CERTIFIED`).

## FAILED / INCONCLUSIVE

Watermark `(time, sequence)` is ENGINEERING_INFERENCE. Session hours are ENGINEERING_INFERENCE. No vendor connector. In-memory log only (not durable disk).

## NEXT PERMITTED ACTION

ADVANCE STAGE 3
