# ADR 0002 — Canonical scientific object model

**Status:** accepted for Stage 1  
**Date:** 2026-08-16

## Context

Stage 0 required a scientific object model before analytics. The pre-existing `src/lib/pct/types.ts` is a UI/demo type bag. It includes non-canonical statuses (`PENDING`, `NOT_TESTED`) and cannot enforce provenance.

## Decision

1. Canonical schemas live in `src/lib/atlas/` (adapted in-place; not a separate npm workspace).
2. Zod is the single parser. An `AnalysisResult` cannot be constructed without dataset version, code version, configuration, seed, coordinate-axis IDs, evidence status, and source attribution.
3. Evidence states are the nine S6 states. Transitions are a conservative graph (ENGINEERING_INFERENCE — S5/S6 list states, not edges). `UNSUPPORTED → VALIDATED`, `SPECULATIVE → VALIDATED`, `INCONCLUSIVE → VALIDATED`, and `DESCRIPTIVE → EXACT` are prohibited.
4. Run IDs are SHA-256 of the canonical `(dataVersion, codeVersion, config, seed, protocol)` tuple.
5. Coordinate axes carry a role; documented confusions (event vs availability time, tenor vs horizon, moneyness vs strike, filtration vs time) fail parse.
6. The existing workstation types are **not** replaced in this stage. They remain uncertified prototype residue.

## Consequences

Stage 2+ must persist these objects. The demo UI must not mint `VALIDATED` claims. New analysis code imports `@/lib/atlas`, not ad-hoc literals.
