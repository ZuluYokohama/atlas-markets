# Protocol ESSN-SEED-v0

**Status:** active (architecture slot)  
**Parent:** RT-PREQ-v0  
**Atlas E-gates:** still CLOSED. E4 remains UNSUPPORTED.

## Design law

Evolve **topology** (routing, widths, sheaf rank, expert count).  
Train **weights** inside modules.  
Do **not** evolve millions of scalars.

## Seed (this environment)

Daily synthetic bars only. No tick/1m/5m tapes. Effective N ≈ 170 after purge.  
Therefore the live seed is **narrow** (thousands of parameters), not 0.5–1.5M.

Supernet maxima are stored on the genome so later widening is a mutation, not a rewrite.

## Frozen

- Stage A: synthetic planted recoverability only  
- Stage B (market walk-forward evolution): **not started**  
- Confirmation: **closed**  
- Sheaf rank may be 0 (must be allowed to lose)  
- Orders: none  

## Claim this protocol may earn

`CERTIFIED_TOPOLOGY_SLOT` and, if Stage A passes, `CERTIFIED_SYNTHETIC_LEARNABILITY`.  
It may not earn VALIDATED market edge.
