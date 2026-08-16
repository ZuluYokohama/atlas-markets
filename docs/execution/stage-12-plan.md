# Stage 12 plan (written before implementation)

**Authorization:** Stage 11 PASS. “Continue as best fit on mission” → `ADVANCE STAGE 12`.

## Objective

Shadow-mode robustness. Same engine as replay. No order authority. Fail closed.

## Acceptance

1. Live/replay hashes match.
2. `placeOrder` / send paths throw and never log a send.
3. Kill switch freezes ingest and decisions.
4. Clock skew, feed gap, missing payload, late revision, schema drift → fail-closed (ABSTAIN).
5. OOD detector abstains; in-distribution does not.
6. Shadow log is append-only and contains no order fields.

## Out of scope

Brokerage, live orders, upgrading E4, opening confirmation.
