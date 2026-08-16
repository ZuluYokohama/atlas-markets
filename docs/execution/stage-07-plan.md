# Stage 7 plan (written before implementation)

**Authorization:** Stage 6 PASS. “Continue as best fit on mission” → `ADVANCE STAGE 7`.

## Objective

Gate E0: implement connection operators correctly. Passing E0 is `CERTIFIED_OPERATOR_IMPLEMENTATION`. It is **not** compression, prediction, or alpha.

## Acceptance tests

1. Procrustes transports are orthogonal; `U_ji = U_ijᵀ`.
2. Connection Laplacian is symmetric and PSD (λ_min ≥ −1e-8).
3. Path graph with identity transports: kernel dimension r, λ_min ≈ 0.
4. Random vertex gauges leave the spectrum unchanged (max |Δλ| < 1e-6).
5. Planted SO(2) cycle holonomy is recovered (angle error < 1e-6). det does not detect it.
6. Same inputs → same Laplacian hash.
7. Similarity edges do not use future outcomes.

## Out of scope

E1 subgates, holonomy-as-alpha (E2/E4), opening confirmation, UI predictive language.
