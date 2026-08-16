import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { TRIALS, defaultGates } from "@/lib/pct";

export const Route = createFileRoute("/gates")({ component: GatesPage });

function tone(status: string) {
  if (status === "CERTIFIED" || status === "VALIDATED") return "sage" as const;
  if (status === "DESCRIPTIVE" || status === "PENDING") return "sand" as const;
  if (status === "UNSUPPORTED" || status === "FAILED_CHECK") return "clay" as const;
  return "mute" as const;
}

function GatesPage() {
  const gates = defaultGates();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Validation ladder
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          E0 through E5, never a single badge.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          A method can be useful if only E0–E3 pass — it remains a descriptive
          representation. Only E4 may support a narrow predictive claim, and only
          after costs, calibration, trial correction, and regime replication.
        </p>

        <div className="mt-6 grid gap-3">
          {gates.map((g) => (
            <article
              key={g.id}
              className="rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{g.id}</span>
                <Badge tone={tone(g.status)}>{g.status}</Badge>
              </div>
              <h2 className="mt-2 text-sm">{g.question}</h2>
              <p className="mt-1 text-sm text-muted">{g.summary}</p>
              <dl className="mt-3 grid gap-1 sm:grid-cols-2">
                {g.metrics.map((m) => (
                  <div key={m.label} className="flex justify-between text-xs">
                    <dt className="text-subtle">{m.label}</dt>
                    <dd className="font-mono tabular">{m.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-tight">Trial ledger</h2>
          <p className="mt-1 text-sm text-muted">
            Every attempted configuration remains visible. Selection-adjusted
            performance uses DSR / PBO once the search set grows.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg bg-surface shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium">Input</th>
                  <th className="px-3 py-2 font-medium">Pinball</th>
                  <th className="px-3 py-2 font-medium">CRPS</th>
                  <th className="px-3 py-2 font-medium">Split</th>
                </tr>
              </thead>
              <tbody>
                {TRIALS.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                    <td className="px-3 py-2">
                      {t.model}
                      {t.selected && (
                        <Badge tone="paper" className="ml-2">
                          baseline
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">{t.input}</td>
                    <td className="px-3 py-2 font-mono tabular">{t.pinball.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono tabular">{t.crps.toFixed(2)}</td>
                    <td className="px-3 py-2 text-muted">{t.split}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <Mini k="N attempted" v="6" />
            <Mini k="Best IS" v="SFT 0.80" />
            <Mini k="DSR" v="not run" />
            <Mini k="PBO / CSCV" v="not run" />
          </dl>
        </section>
      </div>
    </AppShell>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-surface p-3 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
      <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{k}</p>
      <p className="mt-1 font-mono text-sm">{v}</p>
    </div>
  );
}
