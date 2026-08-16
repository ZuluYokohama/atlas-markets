import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { CLAIMS, STATUS_COPY } from "@/lib/pct";
import { shaLike } from "@/lib/pct/core";

export const Route = createFileRoute("/evidence")({ component: EvidencePage });

function tone(status: string) {
  if (status === "CERTIFIED" || status === "VALIDATED" || status === "EXACT")
    return "sage" as const;
  if (status === "DESCRIPTIVE" || status === "SPECULATIVE") return "sand" as const;
  if (status === "UNSUPPORTED") return "clay" as const;
  return "mute" as const;
}

function EvidencePage() {
  const manifest = {
    artifact: { id: "terrain_live", type: "position_outcome_terrain" },
    dataset: {
      hash: shaLike(["spy-synth", 520, 0x51f7a01d]),
      vendor_contract: "synthetic_internal",
      point_in_time_policy: "availability_time",
    },
    position: {
      transport_version: "template_v1",
    },
    software: {
      numerical_backend: "dense-js-jacobi",
      random_seed_tree: "0x51f7a01d",
    },
    semantic_layer: { numerical_authority: false },
    evidence: {
      E0: "PASS",
      E1: "E1-A",
      E2: "DESCRIPTIVE",
      E3: "PENDING",
      E4: "NOT_RUN",
      E5: "NOT_RUN",
    },
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Evidence ledger
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Every plot has a why.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Exact, certified, descriptive, validated, unsupported — never a vague
          “the model says.” The semantic layer may compile language; it may not
          invent prices, Greeks, or evidence status.
        </p>

        <div className="mt-6 grid gap-3">
          {CLAIMS.map((c) => (
            <article
              key={c.id}
              className="rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tone(c.status)}>{c.status}</Badge>
                <span className="text-[11px] uppercase tracking-[0.12em] text-subtle">
                  {c.gate}
                </span>
              </div>
              <h2 className="mt-2 text-sm">{c.claim}</h2>
              <p className="mt-1 text-xs text-muted">{c.limitations}</p>
            </article>
          ))}
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {Object.entries(STATUS_COPY).map(([k, v]) => (
            <div
              key={k}
              className="rounded-md bg-surface p-3 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]"
            >
              <p className="font-mono text-xs">{k}</p>
              <p className="mt-1 text-xs text-muted">{v}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-tight">Coordinate registry</h2>
          <p className="mt-1 text-sm text-muted">
            Every artifact preserves these semantics. Horizon is not tenor; availability
            is not event time; filtration is not a clock.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg bg-surface shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Coordinate</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Must not confuse with</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Event time", "Physical / exchange", "Ingestion time"],
                  ["Availability time", "Causal information", "Publication stamp"],
                  ["Replay clock", "Simulation", "Physical market time"],
                  ["Forecast horizon h", "Outcome", "Option tenor"],
                  ["Option tenor τ", "Contract", "Forecast horizon"],
                  ["Log-moneyness", "Position", "Raw strike"],
                  ["Delta", "Derived contract", "Contract identity"],
                  ["Filtration ε", "TDA scale", "Time"],
                  ["Diffusion parameter", "Operator scale", "Exchange time"],
                  ["Strategy age", "Policy state", "Contract age"],
                ].map(([c, t, n]) => (
                  <tr key={c} className="border-t border-line">
                    <td className="px-3 py-2">{c}</td>
                    <td className="px-3 py-2 text-muted">{t}</td>
                    <td className="px-3 py-2 text-muted">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">
            Provenance manifest
          </h2>
          <pre className="mt-3 overflow-x-auto font-mono text-[11px] text-ink">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </section>
      </div>
    </AppShell>
  );
}
