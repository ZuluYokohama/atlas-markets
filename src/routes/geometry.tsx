import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { runE0Certificates } from "@/lib/atlas/geometry/certificates";
import {
  e2HolonomyDemo,
  getConnection,
  getE1,
  getUniverse,
  randomGauge,
  slidingPersistence,
} from "@/lib/pct";
import { fmtNum } from "@/lib/utils";

export const Route = createFileRoute("/geometry")({
  loader: () => ({
    bundle: getConnection(),
    e1: getE1(),
    e0: runE0Certificates(),
  }),
  component: GeometryPage,
});

function GeometryPage() {
  const { bundle: base, e1, e0 } = Route.useLoaderData();
  const uni = getUniverse();
  const [gauged, setGauged] = useState(false);
  const bundle = useMemo(
    () => (gauged ? randomGauge(base, 19) : base),
    [gauged, base],
  );
  const e2 = e2HolonomyDemo(0.7, 0.08);
  const tda = useMemo(() => {
    const series = uni.days.map((d) => d.ret1);
    return slidingPersistence(series.slice(80, 240), 18);
  }, [uni]);

  const spec = bundle.eigenvalues.map((v: number, i: number) => ({
    i,
    v: Math.max(0, v),
  }));
  const hol = bundle.cycleHolonomy.map((c, i: number) => ({
    i,
    deg: (c.angle * 180) / Math.PI,
    f: c.frobenius,
  }));
  const persist = tda.deaths.map((d, i) => ({
    x: tda.births[i] ?? 0,
    y: d,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Geometry inspector
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Connection operators (E0)
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-clay">
          E0 certifies the operators. It does not certify compression, market
          structure, or alpha. F0 remains UNSUPPORTED. Confirmation is closed.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          {e0.checks.map((c) => (
            <li key={c.name} className="flex flex-wrap justify-between gap-2 border-t border-line py-1.5">
              <span>{c.name}</span>
              <span className={c.passed ? "text-ink" : "text-clay"}>
                {c.passed ? "certified" : "failed"} · {c.detail}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Status: {e0.status}. E1-A is a synthetic oracle. E1-G is UNSUPPORTED.
        </p>
        <h2 className="mt-8 font-display text-2xl tracking-tight">E1 matrix (frozen)</h2>
        <p className="mt-2 max-w-2xl text-sm text-clay">
          CERTIFIED_SYNTHETIC_ORACLE only. Connection coordinates are not model
          inputs. E1-G pinball deltas: W1 −0.0007, W2 −0.0099.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {[
            ["E1-A", "PASS", "oracle recon"],
            ["E1-B", "PASS", "gauge-fair table"],
            ["E1-C", "PASS", "shuffled transports worse"],
            ["E1-D", "PASS", "noise sweep"],
            ["E1-E", "PASS", "equal k ≠ equal bitrate"],
            ["E1-F", "PASS", "held-out sample"],
            ["E1-G", "FAIL", "no incremental pinball"],
            ["E2", "DETECT", "holonomy vs flat+noise null"],
            ["E3", "PIT", "no future in graph/scale"],
          ].map(([id, st, note]) => (
            <li key={id} className="flex justify-between gap-2 border-t border-line py-1.5">
              <span>
                {id} · {note}
              </span>
              <span className={st === "FAIL" ? "text-clay" : "text-ink"}>{st}</span>
            </li>
          ))}
        </ul>
        <h2 className="mt-8 font-display text-2xl tracking-tight">
          Prototype residue
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Pairwise transports are not a cellular sheaf. Cycle holonomy is the
          obstruction that cannot be unwrapped on a spanning tree. Toggle a random
          gauge — conjugacy invariants stay put.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={gauged ? "default" : "secondary"}
            onClick={() => setGauged((v) => !v)}
          >
            {gauged ? "Random gauge on" : "Apply random gauge"}
          </Button>
          <Badge tone="paper">r = {bundle.r}</Badge>
          <Badge tone="mute">{bundle.n} vertices</Badge>
          <Badge tone="mute">{bundle.edges.length} edges</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card title="Low spectrum">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spec}>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                  <XAxis dataKey="i" tick={{ fill: "#5e615b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#5e615b", fontSize: 10 }} />
                  <Bar dataKey="v" fill="#9aa39a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">
              λ_min {fmtNum(bundle.eigenvalues[0] ?? 0, 4)} · energy{" "}
              {fmtNum(bundle.energy, 4)}
            </p>
          </Card>

          <Card title="Cycle holonomy (knn loops)">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hol}>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                  <XAxis dataKey="i" tick={{ fill: "#5e615b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#5e615b", fontSize: 10 }} />
                  <Bar dataKey="deg" fill="#c4a574" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">
              Largest |φ| {fmtNum(hol[0]?.deg ?? 0, 1)}° — discrete connection
              holonomy, not physical curvature.
            </p>
          </Card>

          <Card title="E1 rate-distortion (synthetic world)">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Row k="Connection SFT" v={e1.dConn.toFixed(4)} />
              <Row k="Raw DCT" v={e1.dDct.toFixed(4)} />
              <Row k="Gauge-DCT" v={e1.dGaugeDct.toFixed(4)} />
              <Row k="Scalar GFT" v={e1.dGft.toFixed(4)} />
              <Row k="PCA" v={e1.dPca.toFixed(4)} />
              <Row k="Shuffled U" v={e1.dShuffled.toFixed(4)} />
            </dl>
            <p className="mt-3 text-xs text-sand">{e1.note}</p>
            <p className="mt-1 text-xs text-muted">
              Reduction vs DCT {(e1.reductionVsDct * 100).toFixed(1)}% at k=
              {e1.k}. Fair comparator is gauge-unwrapped DCT, not raw DCT.
            </p>
          </Card>

          <Card title="E2 planted holonomy">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Row k="Planted φ" v={e2.planted.toFixed(3)} />
              <Row k="Recovered" v={e2.recovered.toFixed(3)} />
              <Row k="‖I−H‖_F" v={e2.frobenius.toFixed(3)} />
              <Row k="2 − tr H" v={e2.traceStat.toFixed(3)} />
            </dl>
            <p className="mt-3 text-xs text-muted">
              Null is a noisy integrable connection. A pass here does not establish
              cyclic trading.
            </p>
          </Card>

          <Card title="Sliding-window persistence (returns)">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.04)" />
                  <XAxis
                    dataKey="x"
                    name="birth"
                    tick={{ fill: "#5e615b", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="y"
                    name="death"
                    tick={{ fill: "#5e615b", fontSize: 10 }}
                  />
                  <Scatter data={persist} fill="#8ea186" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">
              H0 merge deaths on an 18-bar window. Trajectory dimension, orbit
              closure, and persistence are not interchangeable.
            </p>
          </Card>

          <Card title="Edge census">
            <ul className="space-y-2 text-sm">
              <li>
                Chronological{" "}
                <span className="font-mono tabular">
                  {bundle.edges.filter((e) => e.kind === "chrono").length}
                </span>
              </li>
              <li>
                Mutual kNN{" "}
                <span className="font-mono tabular">
                  {bundle.edges.filter((e) => e.kind === "knn").length}
                </span>
              </li>
              <li className="text-xs text-muted">
                Similarity edges use only point-in-time features. Construction
                family is allow-listed separately from audit families (E3).
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono tabular">{v}</dd>
    </div>
  );
}
