import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { runSealedReplay } from "@/lib/atlas/runtime/loop";

export const Route = createFileRoute("/runtime")({
  loader: () => ({ report: runSealedReplay() }),
  component: RuntimePage,
});

function RuntimePage() {
  const { report } = Route.useLoaderData();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-xs uppercase tracking-widest text-muted">Sealed runtime</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Predict. Commit. Reveal. Score.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-clay">
          Protocol {report.protocol}. The predictor is not the judge. This loop is{" "}
          {report.claim}. It is not market alpha. Confirmation closed. No orders.
        </p>

        <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["Device", `${report.device.kind} · CUDA ${String(report.device.cuda)}`],
            ["Champion", report.champion],
            ["Auditor", report.auditor],
            ["Commits", String(report.commits)],
            ["Scored", String(report.scored)],
            ["Mean pinball", report.meanPinball.toFixed(5)],
            ["90% coverage", report.coverage90.toFixed(3)],
            ["Ledger", report.ledgerHash.slice(0, 16)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-t border-line py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>

        <ol className="mt-8 space-y-2 text-sm">
          {["OBSERVE", "PREDICT", "COMMIT", "ADVANCE", "REVEAL", "SCORE", "AUDIT"].map((s, i) => (
            <li key={s} className="flex gap-3 border-t border-line py-2">
              <span className="font-mono text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-sm text-muted">
          Live and replay share this path. Geometry eigensolves and challenger
          training stay off the real-time lane.{" "}
          <Link to="/evidence" className="text-ink underline-offset-2 hover:underline">
            Evidence
          </Link>{" "}
          still governs what you may claim.
        </p>
        <div className="mt-4">
          <Badge tone="paper">{report.claim}</Badge>{" "}
          <Badge tone="clay">not VALIDATED edge</Badge>{" "}
          <Badge tone="mute">no orders</Badge>
        </div>
      </div>
    </AppShell>
  );
}
