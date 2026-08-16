# Stage 11 plan (written before implementation)

**Authorization:** Stage 10 PASS. “Continue as best fit on mission” → `ADVANCE STAGE 11`.

## Frozen protocol (E4-v0)

Same as F0-v0. No retune.

- Metric: mean pinball {0.1,0.5,0.9} on 5-session long ATM 21-DTE call PnL after costs
- Windows: W1 80–160, W2 170–240, development only
- Confirmation 315–519 **closed**
- Kill: miss 3% relative reduction vs better of B1/B2 on either window
- Neuroevolution: **not started**

## Ladder (one rung at a time, all recorded)

1. unconditional  
2. regime oracle  
3. kNN  
4. kernel  
5. ridge  
6. tree  
7. kNN + connection Nyström (E1-G)  

No TCN/RNN/MoE search. No confirmation peek.

## Pass interpretation

A null is a successful execution and an **UNSUPPORTED** predictive claim. It does not delete the lab.
