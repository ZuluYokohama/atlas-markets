# Stage 2 plan (written before implementation)

**Authorization:** Stage 1 PASS. Master-spec resubmission treated as `ADVANCE STAGE 2` (same channel exception).

## Objective

One event-sourced pipeline. Live simulation and replay differ only by clock. Same stream → identical snapshots.

## Admission rule (both clocks)

An event is visible at cutoff `T` iff

`availability_time <= T` **and** `ingest_time <= T`.

`event_time` is not an admission field (known-ahead catalysts may have `event_time > T`).

## Acceptance tests

1. Append-only log: mutation / delete / sequence rewrite throws.
2. Stable order: `(availability_time, sequence_number)`.
3. Future-available events (`availability_time > T`) are absent from snapshot `T`.
4. Late ingest (`ingest_time > T`) is absent from snapshot `T`.
5. Correction appends a new revision; original remains; snapshot uses latest visible revision.
6. Live walk and replay snapshots at the same cutoffs have identical content hashes (tolerance: exact).
7. Connector interface has no order/send methods.

## Out of scope

Position compiler, feature DAG, geometry, F0, UI, brokerage.
