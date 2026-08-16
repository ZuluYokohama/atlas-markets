# Stage 1 plan (written before implementation)

**Authorization note (ENGINEERING_INFERENCE):** Stage 0 ended `PARTIAL_PASS` with next action `ADVANCE STAGE 1`. The operator channel re-submitted the master specification three times without an isolated checkpoint token. Further holds deadlock the only available channel. This stage proceeds under that recorded exception. It does **not** waive S0–S4 absence, confirmation quarantine, or any later gate.

## Objective

Scientific object model only. No event store, valuation, features, geometry, F0, or UI.

## Acceptance tests (declared first)

1. Every required type serializes and round-trips through Zod.
2. Run IDs are content hashes of `(data_version, code_version, config, seed, protocol_id)` and do not change if computed twice.
3. Canonical JSON hashing is key-order invariant.
4. Evidence transitions: allowed set succeeds; prohibited set throws.
5. `AnalysisResult` parse fails if any of: data version, code version, configuration, seed, coordinate semantics, evidence status, source attribution is missing.
6. Coordinate-role validator rejects documented confusions (event vs availability time; tenor vs horizon; moneyness vs strike; filtration vs time).
7. Provenance manifest is incomplete without dataset version + code version + config hash + seed.

## Out of scope

Event log, replay clock, BS engine, feature DAG, connection Laplacian, workstation panels.
