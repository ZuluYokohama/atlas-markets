# Stage 3 plan (written before implementation)

**Authorization:** Stage 2 PASS. Master-spec resubmission treated as `ADVANCE STAGE 3`.

## Objective

Compile arbitrary multi-leg positions into deterministic PIT objects. Never invent a missing contract or quote. Leg order must not change value or identity.

## Acceptance tests

1. DSL parses multi-leg text into a hashed position.
2. Permuting legs does not change position hash, model value, or encoder.
3. European call/put payoff identities at expiry.
4. Put-call parity under r, q declared (r=0,q=0 in the fixture).
5. Analytic Greeks match central finite differences within 5e-3.
6. Expired OTM = 0; ITM = intrinsic. No extrapolation past expiry.
7. 2-for-1 split: strike halves, quantity doubles, payoff identity holds.
8. Missing contract → market mark `missing`; engine does not synthesize a quote.
9. Stale quote is usable only as flagged; not silently treated as `ok`.
10. Three versioned transports: `contract` (exact id or fail), `template` (log-moneyness + tenor, residual cap), `exposure` (delta). Same inputs → same output. Residual above threshold → refuse, do not invent.
11. Encoder is permutation-invariant (vector equality).

## Out of scope

Feature DAG, F0, geometry, UI, live brokerage.
