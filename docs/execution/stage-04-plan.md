# Stage 4 plan (written before implementation)

**Authorization:** Stage 3 PASS. Master-spec resubmission treated as `ADVANCE STAGE 4`.

## Objective

Point-in-time feature DAG. Indicators are coordinates, not claims. Every feature carries definition metadata. No lookahead.

## Acceptance tests

1. Every catalog feature has definition, parameters, lookback, timeframe, availability rule, units, family, version, source dependencies.
2. Feature vector at watermark T is unchanged after later bars are appended (no lookahead).
3. Weekly feature is unavailable until the week session closes.
4. Bar-close SMA uses only closes with `availability_time <= T`.
5. A revised bar (new ingest) changes the feature only at/after the revision watermark.
6. Duplicate-formula detector flags two defs with the same expression hash.
7. Redundancy audit emits pairwise corr, Spearman, condition number, PCA, and family-block correlations.
8. Missing listed name / insufficient lookback → observation is null with quality `missing`, not a filled guess.

## Out of scope

F0, baselines-as-prediction, geometry, neural models, UI.
