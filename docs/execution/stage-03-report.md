# STAGE 3: position compiler and valuation

**STATUS:** PASS

## OBJECTIVE

Compile arbitrary multi-leg positions. Identical results from equivalent leg orderings. Never invent missing contracts or quotes.

## TESTS

`tsc --noEmit` pass. Stages 1–3 scientific tests **24/24 pass**.

## CERTIFICATES

Leg-order invariance; expiry payoffs; put-call parity (r=q=0); FD Greeks after CDF fix; 2-for-1 split payoff identity; missing → no market mark; transports refuse above residual.

## FAILED / INCONCLUSIVE

American exercise not implemented. Discrete dividends only via continuous `q`. In-memory chains only. Prototype `src/lib/pct` not bound to this engine.

## NEXT PERMITTED ACTION

ADVANCE STAGE 4
