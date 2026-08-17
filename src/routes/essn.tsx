import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { runStageA } from "@/lib/atlas/essn/stageA";

export const Route = createFileRoute("/essn")({
  loader: () => ({ report: runStageA() }),
  component: EssnPage,
});

function EssnPage() {
  const { report } = Route.useLoaderData();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-xs uppercase tracking-widest text-muted">ESSN seed</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Topology first. Weights second.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-clay">
          Stage A only — synthetic planted recoverability. Market-path evolution
          is off. Confirmation closed. Not E4. Not alpha.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={report.claim === "CERTIFIED_SYNTHETIC_LEARNABILITY" ? "paper" : "clay"}>
            {report.claim}
          </Badge>
          <Badge tone="mute">vol-on beats vol-off: {String(report.volOnBeatsVolOff)}</Badge>
        </div>
        <p className="mt-6 text-sm text-muted">
          Best genome pinball {report.best.pinball.toFixed(4)} · params {report.best.params} ·
          vol {report.best.volEnabled ? "on" : "off"}
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg bg-surface shadow-border">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Gen</th>
                <th className="px-3 py-2 font-medium">Vol</th>
                <th className="px-3 py-2 font-medium">Pinball</th>
                <th className="px-3 py-2 font-medium">Params</th>
              </tr>
            </thead>
            <tbody>
              {report.trials.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-3 py-2">{t.generation}</td>
                  <td className="px-3 py-2">{t.volEnabled ? "on" : "off"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.pinball.toFixed(4)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.params}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-muted">
          <Link to="/runtime" className="text-ink underline-offset-2 hover:underline">
            Sealed runtime
          </Link>{" "}
          still judges. ESSN does not score itself.
        </p>
      </div>
    </AppShell>
  );
}
