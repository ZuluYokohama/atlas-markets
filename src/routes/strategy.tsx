import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { AUTOMATON, PREDICATES, getUniverse, replayStrategy } from "@/lib/pct";
import { useWorkbench } from "@/store/workbench";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/strategy")({ component: StrategyPage });

function StrategyPage() {
  const uni = getUniverse();
  const dayIndex = useWorkbench((s) => s.dayIndex);
  const start = Math.max(80, dayIndex - 18);
  const end = Math.min(uni.days.length - 1, dayIndex + 8);
  const trace = useMemo(
    () => replayStrategy(uni, start, end),
    [uni, start, end],
  );
  const now = trace.filter((t) => t.index === dayIndex).slice(-1)[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Strategy grammar
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          A policy is an automaton.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Language compiles to typed predicates. The replay engine — not the
          language model — decides whether a transition fired. Click a node to
          inspect the predicate at the current availability time.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
          <div className="flex min-w-[720px] items-center gap-1">
            {AUTOMATON.map((st, i) => (
              <div key={st} className="flex items-center gap-1">
                <div
                  className={cn(
                    "rounded-sm px-2 py-3 text-center text-[10px] uppercase tracking-[0.12em]",
                    now?.state === st
                      ? "bg-accent text-accent-fg"
                      : "bg-elevated text-muted",
                  )}
                >
                  {st}
                </div>
                {i < AUTOMATON.length - 1 && (
                  <span className="text-subtle">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Clock {uni.days[dayIndex]?.date} · state{" "}
            <span className="text-fg">{now?.state ?? "—"}</span> · {now?.note}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {PREDICATES.map((p) => {
            const r = p.test(uni, dayIndex);
            return (
              <article
                key={p.id}
                className="rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="mute">
                    {p.from} → {p.to}
                  </Badge>
                  <Badge tone={r.ok ? "sage" : "mute"}>{r.ok ? "true" : "false"}</Badge>
                </div>
                <h2 className="mt-2 text-sm">{p.label}</h2>
                <p className="mt-1 font-mono text-xs text-ink">{r.value}</p>
                <p className="mt-2 text-[11px] text-subtle">
                  Fields: {p.fields.join(", ")}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-6 rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">
            Replay trace
          </h2>
          <ol className="mt-3 max-h-72 space-y-1 overflow-auto font-mono text-[11px]">
            {trace
              .filter((t) => t.note !== "hold")
              .map((t) => (
                <li key={`${t.index}-${t.state}`} className="flex gap-3">
                  <span className="text-subtle">{uni.days[t.index]?.date}</span>
                  <span>{t.state}</span>
                  <span className="text-muted">{t.note}</span>
                </li>
              ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
