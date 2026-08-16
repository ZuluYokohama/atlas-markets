# ADR 0004 — Position compiler and valuation

**Status:** accepted for Stage 3  
**Date:** 2026-08-16

## Decision

1. Typed DSL (`long|short|+/− qty SYM strike C|P YYYY-MM-DD`).
2. Contract identity is OCC-shaped and exact. Position hash sorts canonical leg keys (permutation-invariant).
3. Two marks: **market** (listed quote only) and **model** (declared Black–Scholes). Market mark is null if any contract is missing. No synthetic quotes.
4. Three versioned transports (`contract_v1`, `template_v1`, `exposure_v1`). Residual above threshold → refuse.
5. Encoder is a Deep Sets sum (`ρ(∑ φ(ℓ))`).
6. Splits adjust strike and quantity; payoff identity is tested.

## Negative result preserved

The first CDF treated the erf polynomial as Φ(x). Finite-difference gamma failed (~0 vs 0.04). Fixed to `Φ(x) = ½(1+erf(x/√2))`. That failure is why the FD certificate exists.
