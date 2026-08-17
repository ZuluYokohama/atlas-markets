# Protocol RT-PREQ-v0

**Status:** active (new program; Atlas E-gate ladder remains CLOSED)  
**Date:** 2026-08-16  
**Device:** CPU-certified. No CUDA in this environment. GPU lanes are interfaces only.

## Frozen

- **Y:** 5-session forward log-return of synthetic spot, \(Y_t=\log S_{t+5}-\log S_t\)
- **Split:** development indices only (`≤ 251`). Confirmation **closed**.
- **Kill / claim:** this protocol does **not** authorize a predictive VALIDATED claim. It certifies the *loop*.
- **Champion:** `stub-recurrent-v0` — seeded recurrent head, **not** ESSN, **not** trained.
- **Judge:** `auditor-v0` — no shared weights with the predictor.
- **Orders:** none.

## Sequence

OBSERVE → PREDICT → COMMIT → ADVANCE → REVEAL → SCORE → AUDIT

The predictor never scores itself. Training (none in v0) may use matured labels only.

## Out of scope

Neuroevolution, supernet, Triton, TensorRT, opening confirmation, brokerage.
