# ADR 0015 — Sealed prequential runtime (RT-PREQ-v0)

**Status:** accepted  
**Date:** 2026-08-16

Two loops: real-time inference and asynchronous audit. The predictor commits first. The auditor scores only after the horizon. They share no trainable weights.

This environment has **no CUDA**. The certified path is CPU Float64 with GPU-shaped ring buffers. “Full GPU use” is deferred; the scheduler still refuses background work when the RT queue is busy.

The champion is `stub-recurrent-v0`, not ESSN, not trained. CERTIFIED_SEALED_LOOP ≠ VALIDATED edge. Confirmation remains closed. No orders.

The Atlas E-gate program stays CLOSED. This is a new protocol ID.
