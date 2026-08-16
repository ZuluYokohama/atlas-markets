# ADR 0008 — E0 connection operators

**Status:** accepted  
**Date:** 2026-08-16

Connection Laplacian, Procrustes transports, and cycle holonomy are implemented and numerically certified. Evidence status is `CERTIFIED_OPERATOR_IMPLEMENTATION` only. F0 remains `UNSUPPORTED`. These coordinates are not model inputs. Eigensolves on the certified sizes use dense Jacobi, not a sparse production solver.
