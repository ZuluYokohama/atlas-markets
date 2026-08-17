import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { runStageA } from "@/lib/atlas/essn/stageA";
import { DEFAULT_TRAIN_PATH } from "@/lib/atlas/essn/trainPath";

export const Route = createFileRoute("/essn")({
  loader: () => ({ report: runStageA() }),
  component: EssnPage,
});

function EssnPage() {
  const { report } = Route.useLoaderData();
  const [dataset, setDataset] = useState(DEFAULT_TRAIN_PATH.dataset);
  const [epochs, setEpochs] = useState(DEFAULT_TRAIN_PATH.epochs);
  const [lr, setLr] = useState(DEFAULT_TRAIN_PATH.lr);
  const [batch, setBatch] = useState(DEFAULT_TRAIN_PATH.batchSize);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [job, setJob] = useState<Record<string, unknown> | null>(null);

  const isValid =
    Number.isFinite(epochs) &&
    epochs > 0 &&
    Number.isFinite(lr) &&
    lr > 0 &&
    Number.isFinite(batch) &&
    batch > 0;

  async function runTrain() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/essn/train", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dataset,
          epochs,
          lr,
          batchSize: batch,
          confirmationOpened: false,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error ?? res.status));
      setJob(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "train failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <p className="text-xs uppercase tracking-widest text-muted">ESSN seed</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Topology first. Weights second.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-clay">
          Local CPU training only. Confirmation closed. This writes weights, not
          a VALIDATED edge. CLI: node --experimental-strip-types scripts/essn-train.mts
        </p>

        <section className="mt-6 rounded-lg bg-surface p-4 shadow-border">
          <h2 className="font-display text-xl tracking-tight">Train path</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">Dataset</span>
              <select
                className="mt-1 h-11 w-full rounded-sm bg-elevated px-2"
                value={dataset}
                onChange={(e) => setDataset(e.target.value as typeof dataset)}
              >
                <option value="synthetic_planted">synthetic planted (T1)</option>
                <option value="development_f0">development F0 (no confirm)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Epochs</span>
              <input
                className="mt-1 h-11 w-full rounded-sm bg-elevated px-2"
                type="number"
                min={1}
                max={200}
                value={epochs}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (e.target.value !== "" && Number.isFinite(v)) setEpochs(v);
                }}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Learning rate</span>
              <input
                className="mt-1 h-11 w-full rounded-sm bg-elevated px-2"
                type="number"
                step="0.001"
                min={0.0001}
                max={1}
                value={lr}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (e.target.value !== "" && Number.isFinite(v)) setLr(v);
                }}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Batch</span>
              <input
                className="mt-1 h-11 w-full rounded-sm bg-elevated px-2"
                type="number"
                min={1}
                max={128}
                value={batch}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (e.target.value !== "" && Number.isFinite(v)) setBatch(v);
                }}
              />
            </label>
          </div>
          <Button className="mt-4 h-11" disabled={busy || !isValid} onClick={() => void runTrain()}>
            {busy ? "Training…" : "Train locally"}
          </Button>
          {err ? <p className="mt-2 text-sm text-clay">{err}</p> : null}
          {job ? (
            <dl className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
              {[
                ["claim", String(job.claim)],
                ["epochs", String(job.epochsRan)],
                ["val pinball", Number(job.valPinball).toFixed(4)],
                ["params", String(job.params)],
                ["hash", String(job.weightHash).slice(0, 16)],
                ["artifact", String(job.artifact)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-t border-line py-1">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-mono text-xs">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          <Badge tone={report.claim === "CERTIFIED_SYNTHETIC_LEARNABILITY" ? "paper" : "clay"}>
            {report.claim}
          </Badge>
          <Badge tone="mute">Stage A topology</Badge>
        </div>
        <p className="mt-3 text-sm text-muted">
          Best genome pinball {report.best.pinball.toFixed(4)} · params {report.best.params}
        </p>
        <p className="mt-6 text-sm text-muted">
          <Link to="/runtime" className="text-ink underline-offset-2 hover:underline">
            Sealed runtime
          </Link>{" "}
          still judges.
        </p>
      </div>
    </AppShell>
  );
}
