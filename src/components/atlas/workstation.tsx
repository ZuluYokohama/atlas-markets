import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReplayFrame, WorkstationPayload } from "@/lib/atlas/session/types";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function num(n: number | null | undefined, d = 3): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(d);
}

function Panel({
  title,
  status,
  meta,
  children,
  className,
}: {
  title: string;
  status: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tone =
    status === "UNSUPPORTED" || status === "OOD"
      ? "clay"
      : status === "CERTIFIED"
        ? "paper"
        : status === "DESCRIPTIVE"
          ? "sand"
          : "mute";
  return (
    <section className={cn("flex flex-col rounded-lg bg-panel p-3 shadow-border md:p-4", className)}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base leading-tight">{title}</h2>
          {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
        </div>
        <Badge tone={tone}>{status}</Badge>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function AtlasWorkstation({ payload }: { payload: WorkstationPayload }) {
  const start = payload.frames.find((f) => f.index === 120) ?? payload.frames[0];
  const [index, setIndex] = useState(start.index);
  const frame: ReplayFrame = payload.frames.find((f) => f.index === index) ?? payload.frames[0];
  const visible = useMemo(
    () => payload.days.filter((d) => d.index <= frame.index),
    [payload.days, frame.index],
  );
  const chart = visible.map((d) => ({ i: d.index, px: d.spot }));
  const terrain = frame.analogs.map((a) => ({ x: a.distance, y: a.yPnl, fill: "var(--color-sand)" }));
  const weekly = visible.filter((_, i) => i % 5 === 0);
  const chain = [0.96, 0.98, 1, 1.02, 1.04].map((m) => {
    const k = Math.round(frame.spot * m);
    return { k, right: "C", note: "declared-model" };
  });

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 pb-8 pt-3 md:gap-4 md:px-6">
      <aside className="rounded-lg bg-elevated px-3 py-3 shadow-border md:px-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-clay">Scientific warning</p>
        <p className="mt-1 text-sm text-fg">
          F0-v0 claim is <span className="text-clay">UNSUPPORTED</span>. Analog cones are descriptive
          only. Confirmation {payload.f0.confirmationOpened ? "open" : "closed"}. Dataset is synthetic;
          not real SPY. Geometry is not an input.
        </p>
        <p className="mt-1 text-xs text-muted">
          Relative pinball vs simpler baselines: W1 {payload.f0.w1Delta.toFixed(3)}, W2{" "}
          {payload.f0.w2Delta.toFixed(3)}. Protocol {payload.f0.protocolId}.
        </p>
      </aside>

      <div className="flex flex-col gap-3 rounded-lg bg-panel p-3 shadow-border md:flex-row md:items-center md:p-4">
        <div className="min-w-0 flex-1">
          <label className="text-xs uppercase tracking-[0.14em] text-muted" htmlFor="replay">
            Replay clock · development only
          </label>
          <input
            id="replay"
            type="range"
            min={payload.minIndex}
            max={payload.maxIndex}
            value={frame.index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="mt-2 h-11 w-full accent-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2 tabular text-sm">
          <span className="rounded-sm bg-elevated px-2 py-2">{frame.date}</span>
          <span className="rounded-sm bg-elevated px-2 py-2">t={frame.index}</span>
          <span className="rounded-sm bg-elevated px-2 py-2">{frame.split}</span>
          <Button
            type="button"
            variant="secondary"
            className="h-11"
            onClick={() => setIndex((i) => Math.min(payload.maxIndex, i + 1))}
          >
            Step
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Dataset" status="EXACT" meta="synthetic · seed frozen">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">Name</dt>
            <dd>{payload.dataset.name}</dd>
            <dt className="text-muted">Instrument</dt>
            <dd>{payload.dataset.instrument}</dd>
            <dt className="text-muted">Kind</dt>
            <dd>{payload.dataset.kind}</dd>
            <dt className="text-muted">Redistribute</dt>
            <dd>allowed (synthetic)</dd>
          </dl>
        </Panel>

        <Panel
          title="Position"
          status="CERTIFIED"
          meta="template transport · declared-model mark"
        >
          <p className="font-mono text-xs text-ink">{frame.positionDsl}</p>
          <p className="mt-2 text-sm">
            Model debit {money(frame.modelDebit)}
            <span className="text-muted"> × 100 multiplier, half-spread $0.05</span>
          </p>
        </Panel>

        <Panel title="Strategy ribbon" status="DESCRIPTIVE" meta="heuristic, not a policy claim">
          <div className="flex flex-wrap gap-1">
            {["UNSEEN", "SCANNED", "QUALIFIED", "FORMING", "ELIGIBLE"].map((s) => (
              <span
                key={s}
                className={cn(
                  "rounded-sm px-2 py-2 text-[10px] uppercase tracking-[0.12em]",
                  s === frame.strategy ? "bg-elevated text-fg" : "text-subtle",
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          className="md:col-span-2"
          title="Price (visible ≤ T)"
          status="DESCRIPTIVE"
          meta="bar-close · future hidden · 1d"
        >
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="i" tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                  width={40}
                />
                <Area
                  type="monotone"
                  dataKey="px"
                  stroke="var(--color-accent)"
                  fill="var(--color-elevated)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-muted">
            Weekly sample {weekly.length} bars (last Friday-aligned subset of visible days).
          </p>
        </Panel>

        <Panel title="Surface / chain" status="DESCRIPTIVE" meta="declared BS, not a listed market">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="pb-1">K</th>
                <th className="pb-1">Right</th>
                <th className="pb-1">Source</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {chain.map((c) => (
                <tr key={c.k} className="border-t border-line">
                  <td className="py-1.5">{c.k}</td>
                  <td>{c.right}</td>
                  <td className="text-muted">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">IV {num(frame.ivAtm, 3)} · spot {num(frame.spot, 2)}</p>
        </Panel>

        <Panel title="Feature matrix" status="DESCRIPTIVE" meta="PIT coordinates, not claims">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {frame.features.map((f) => (
              <li key={f.name} className="rounded-sm bg-elevated px-2 py-2">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted">{f.name}</div>
                <div className="tabular">{num(f.value, 4)}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="State terrain"
          status={frame.ood ? "OOD" : "DESCRIPTIVE"}
          meta="kNN distances · representation: z-scored features"
        >
          {frame.analogs.length === 0 ? (
            <p className="text-sm text-muted">Unknown — insufficient historical support.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-line)" />
                  <XAxis
                    dataKey="x"
                    name="distance"
                    tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="y"
                    name="analog pnl"
                    tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                    width={40}
                  />
                  <Scatter data={terrain} fill="var(--color-sand)" isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Nearest analogs"
          status="DESCRIPTIVE"
          meta={`metric: z-Euclidean · k≤12 · purge ${6}`}
        >
          <p className="mb-2 text-sm">
            N = <span className="tabular">{frame.cone.n}</span>
            {frame.cone.n < 8 ? <span className="text-clay"> · sparse / unknown</span> : null}
            {frame.ood ? <span className="text-clay"> · outside historical support</span> : null}
          </p>
          <ol className="max-h-40 space-y-1 overflow-auto text-xs">
            {frame.analogs.map((a) => (
              <li key={a.index} className="flex justify-between gap-2 tabular text-muted">
                <span>
                  {a.date} · {a.regime}
                </span>
                <span>
                  d={a.distance.toFixed(2)} · {money(a.yPnl)}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Outcome cone"
          status="UNSUPPORTED"
          meta="5-session net PnL after costs · pinball failed F0"
        >
          {frame.cone.n < 8 ? (
            <p className="text-sm text-muted">Unknown — N_eff below 8. System abstains.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sm bg-elevated px-2 py-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted">q10</div>
                <div className="tabular text-lg">{money(frame.cone.q10)}</div>
              </div>
              <div className="rounded-sm bg-elevated px-2 py-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted">q50</div>
                <div className="tabular text-lg">{money(frame.cone.q50)}</div>
              </div>
              <div className="rounded-sm bg-elevated px-2 py-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted">q90</div>
                <div className="tabular text-lg">{money(frame.cone.q90)}</div>
              </div>
            </dl>
          )}
          <p className="mt-2 text-xs text-muted">
            Uncertainty is the analog spread, not a validated forecast. Do not read this as a pass.
          </p>
        </Panel>

        <Panel title="Regime" status="OUT_OF_SCOPE" meta="planted oracle label · not inferred">
          <p className="font-display text-2xl">{frame.regime}</p>
          <p className="mt-1 text-xs text-muted">
            F0 treated this as an oracle baseline, not a discovered state.
          </p>
        </Panel>

        <Panel title="Evidence ledger" status="UNSUPPORTED" meta="F0-v0 frozen">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-2">
              <span>Predictive claim</span>
              <span className="text-clay">UNSUPPORTED</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Confirmation</span>
              <span>closed</span>
            </li>
            <li className="flex justify-between gap-2 tabular">
              <span>W1 Δ pinball</span>
              <span>{payload.f0.w1Delta.toFixed(3)}</span>
            </li>
            <li className="flex justify-between gap-2 tabular">
              <span>W2 Δ pinball</span>
              <span>{payload.f0.w2Delta.toFixed(3)}</span>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
