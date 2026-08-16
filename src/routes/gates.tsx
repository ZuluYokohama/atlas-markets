import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { E4_TRIALS, GATES } from "@/lib/atlas/ledger/product";

export const Route = createFileRoute("/gates")({ component: GatesPage });

function GatesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-xs uppercase tracking-widest text-muted">Validation ladder</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">E0–E5 as executed</h1>
        <p className="mt-2 max-w-2xl text-sm text-clay">
          Prototype V&V copy is retired. These statuses come from frozen stage
          reports. Confirmation is closed. Neuroevolution was not started.
        </p>

        <div className="mt-6 grid gap-3">
          {GATES.map((g) => (
            <article key={g.id} className="rounded-lg bg-surface p-4 shadow-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{g.id}</span>
                <Badge tone={g.status === "FAIL" || g.status === "MIXED" ? "clay" : "paper"}>
                  {g.status}
                </Badge>
              </div>
              <h2 className="mt-2 text-sm">{g.question}</h2>
              <p className="mt-1 text-sm text-muted">{g.summary}</p>
              <p className="mt-2 font-mono text-xs text-subtle">{g.evidence}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-8 font-display text-2xl tracking-tight">E4 trial ledger</h2>
        <p className="mt-1 text-sm text-muted">
          Frozen E4-v0. Claim: UNSUPPORTED. Confirmation opened: false.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg bg-surface shadow-border">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">Rung</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">W1</th>
                <th className="px-3 py-2 font-medium">W2</th>
                <th className="px-3 py-2 font-medium">Claim</th>
              </tr>
            </thead>
            <tbody>
              {E4_TRIALS.map((t) => (
                <tr key={t.rung} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-xs">{t.rung}</td>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.w1 ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.w2 ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{t.claim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
