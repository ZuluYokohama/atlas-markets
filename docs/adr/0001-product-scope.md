# ADR 0001 — Product scope

**Status:** accepted for Stages 0–12  
**Date:** 2026-08-16  
**Deciders:** Stage 0 reconnaissance (this execution)  
**Execution mode:** `CHECKPOINTED`

## Context

Five named source PDFs were requested and are missing. A 48-page synthesis (S5) and a binding staged-execution prompt (S6) fully specify a research workstation. A prior sandbox session already shipped an uncertified TypeScript demo.

We need a frozen statement of what Atlas Markets / Topological Alpha Workstation **is** and **is not**, so later stages cannot quietly become a trading product or a topology-marketing site.

## Decision

1. **Product name.** Atlas Markets (internal: Topological Alpha Workstation). Algorithm name: **Evidence-Gated Position-Conditioned State Geometry** (S6), commercially abbreviated **PCT-SFT** (S5).

2. **Product thesis (allowed).** A gauge-audited, position-conditioned market-state laboratory whose advanced representations must earn complexity through frozen validation.

3. **Product thesis (forbidden).** “Topology finds alpha.” “The workstation is a money machine.” Any universal edge claim.

4. **Primary user question.** For this exact position and point-in-time state, what happened in comparable history, and what evidence supports generalization?

5. **Edition for Stages 0–12.** Local Research Edition only. No brokerage authentication, no live order placement, no autonomous trading. E5 is shadow mode.

6. **Data.** Synthetic bundles and, later, **user-supplied** adapters. The repo will not redistribute licensed raw market data. Cboe / LOBSTER / OPRA are out of scope until a contract is on file.

7. **Build order.** data/schema truth → event/replay truth → position truth → feature DAG → F0 baselines → UI hardening → E0–E5. Do not skip F0 to get to sheaves.

8. **Pre-existing demo.** The running UI is an **uncertified prototype**. It may remain available so the instrument is inspectable, but:
   - it does not satisfy any later-stage gate
   - its `CERTIFIED` badges and trial numbers are not scientific results
   - its confirmation block is considered **contaminated for F0** until a new split/protocol is declared
   - Stage 1 will introduce schemas beside it, not by declaring the current types complete

9. **Language / process.** S6 checkpointed workflow. Stop at the end of each stage. Missing S0–S4 files quarantine claims unique to those documents; they do not freeze schema work.

10. **Success.** The platform is complete only when every displayed result can answer: what entered, what was forced, what was certified, what was observed, what survived controls, what failed, when to abstain, and what the user may claim.

## Consequences

- Stage 1 implements the scientific object model and evidence state machine **before** new analytics.
- Geometry, TDA, MoE, and neuroevolution stay candidate layers.
- A null F0 is a successful scientific outcome and a failed predictive claim.
- Commercial editions, authz, and SBOM wait for Stage 13.

## Alternatives rejected

- **Abort** until S0–S4 appear — rejected; S5+S6 specify Stage 1.
- **Treat the current UI as Stage 6 pass** — rejected; no PIT event store, confirmation leak, no tests.
- **Start with connection/sheaf code** — rejected; violates S5/S6 build order and F0.

## Notes

This ADR does not authorize writing Stage 1 code. It only freezes scope.
