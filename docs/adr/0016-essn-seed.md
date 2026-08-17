# ADR 0016 — ESSN seed: evolve topology, train weights

**Status:** accepted  
**Date:** 2026-08-16  
**Protocol:** ESSN-SEED-v0

Evolution may change routing, widths, sheaf rank (including 0), expert count, adapter rank. It may not evolve every scalar weight.

Stage A (synthetic planted recoverability) is authorized. Stage B (architecture search on the historical path) is **not** authorized. Confirmation stays closed. E4 remains UNSUPPORTED.

This environment has daily synthetic bars and ~170 effective points. The seed is thousands of parameters, not 0.5–1.5M. Those maxima live on the genome as a ceiling for later widening.
