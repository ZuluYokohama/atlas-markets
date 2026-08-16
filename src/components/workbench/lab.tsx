import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Command } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HORIZON_DAYS,
  TEMPLATES,
  compilePrompt,
  encodeState,
  estimateTerrain,
  expirationPayoff,
  flattenState,
  getUniverse,
  markValue,
  quoteLegs,
  scoreViability,
  summarize,
  templateById,
  transportPosition,
  positionHash,
} from "@/lib/pct";
import { fmtNum, fmtPct, fmtUsd } from "@/lib/utils";
import { useWorkbench } from "@/store/workbench";
import type { HorizonId, TransportMode } from "@/lib/pct/types";

const HORIZONS: { id: HorizonId; label: string }[] = [
  { id: "1d", label: "1 session" },
  { id: "5d", label: "5 sessions" },
  { id: "21d", label: "21 sessions" },
];

const TRANSPORTS: { id: TransportMode; label: string }[] = [
  { id: "template", label: "Template" },
  { id: "exposure", label: "Exposure" },
  { id: "contract", label: "Replay" },
];

function tonePnl(n: number) {
  if (n > 0) return "text-sage";
  if (n < 0) return "text-clay";
  return "text-muted";
}

export function WorkbenchLab() {
  const uni = useMemo(() => getUniverse(), []);
  const {
    dayIndex,
    templateId,
    horizon,
    transport,
    useGeometry,
    selectedAnalog,
    command,
    setDay,
    setTemplate,
    setHorizon,
    setTransport,
    setUseGeometry,
    setSelectedAnalog,
    setCommand,
  } = useWorkbench();

  const [proposalOpen, setProposalOpen] = useState(false);
  const day = uni.days[Math.min(dayIndex, uni.days.length - 22)];
  const tmpl = templateById(templateId);
  const rawLegs = useMemo(
    () => tmpl.build(day.spot, day.ivAtm, day.index),
    [tmpl, day],
  );
  const quoted = useMemo(
    () => quoteLegs(rawLegs, day, uni.chains[day.index]),
    [rawLegs, day, uni],
  );
  const greeks = useMemo(() => summarize(quoted), [quoted]);
  const mark = useMemo(() => markValue(quoted), [quoted]);

  const terrain = useMemo(
    () =>
      estimateTerrain(uni, day.index, quoted, horizon, transport, {
        useGeometry,
      }),
    [uni, day.index, quoted, horizon, transport, useGeometry],
  );
  const viability = useMemo(
    () => scoreViability(terrain, mark, greeks.credit - greeks.debit),
    [terrain, mark, greeks],
  );

  const spots = useMemo(() => {
    const lo = day.spot * 0.88;
    const hi = day.spot * 1.12;
    return Array.from({ length: 25 }, (_, i) => lo + ((hi - lo) * i) / 24);
  }, [day.spot]);
  const payoff = useMemo(
    () =>
      spots.map((s) => ({
        s: Math.round(s),
        exp: expirationPayoff(quoted, [s])[0],
      })),
    [spots, quoted],
  );

  const chartDays = uni.days.slice(Math.max(0, day.index - 90), day.index + 1);
  const priceSeries = chartDays.map((d) => ({
    i: d.index,
    date: d.date.slice(5),
    spot: d.spot,
    iv: d.ivAtm * 100,
    rv: d.rv20 * 100,
  }));

  const analogFan = useMemo(() => {
    const H = HORIZON_DAYS[horizon];
    return Array.from({ length: H + 1 }, (_, h) => {
      const vals = terrain.analogs
        .map((a) => a.path[h])
        .filter((v): v is number => typeof v === "number");
      const sorted = vals.slice().sort((a, b) => a - b);
      const q = (p: number) =>
        sorted.length
          ? sorted[
              Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))
            ]
          : 0;
      return {
        h,
        q05: q(0.05),
        q25: q(0.25),
        q50: q(0.5),
        q75: q(0.75),
        q95: q(0.95),
      };
    });
  }, [terrain, horizon]);

  const selected = terrain.analogs[selectedAnalog ?? -1] ?? null;
  const compiled = command.trim() ? compilePrompt(command) : null;

  const applyCompiled = () => {
    if (!compiled) return;
    setTemplate(compiled.positionTemplate);
    setHorizon(compiled.horizon);
    setProposalOpen(false);
  };

  const knownEvents = uni.events.filter(
    (e) =>
      e.dayIndex >= day.index &&
      e.dayIndex - day.index <= e.knownAheadDays &&
      e.dayIndex - day.index <= 12,
  );

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Position-conditioned terrain
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">
            Entry and exit, for this exposure.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            An options position is a query against typed market-state geometry —
            not a static payoff. Analogs are transported, purged, and labeled.
            Advanced layers stay off until they earn a gate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-mono tabular text-fg">{day.date}</span>
          <span>{day.regime}</span>
          <Badge tone={day.split === "confirmation" ? "sand" : "mute"}>
            {day.split}
          </Badge>
          <span className="font-mono tabular">SPY {fmtNum(day.spot, 2)}</span>
        </div>
      </div>

      <form
        className="mb-4 rounded-lg bg-surface p-2 shadow-[0_0_0_1px_rgb(255_255_255/0.06)] md:p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setProposalOpen(true);
        }}
      >
        <label className="flex items-center gap-2">
          <Command className="size-4 shrink-0 text-muted" />
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='e.g. “30-DTE delta-neutral straddle, five-session terrain when IV−RV is elevated — no future earnings.”'
            className="border-0 bg-transparent shadow-none focus-visible:shadow-none"
          />
          <Button type="submit" size="sm">
            Compile
          </Button>
        </label>
        {proposalOpen && compiled && (
          <div className="mt-3 rounded-md bg-bg-sunken p-3 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                Typed proposal — not numerical authority
              </p>
              <Badge tone="paper">schema</Badge>
            </div>
            <pre className="overflow-x-auto font-mono text-[11px] text-ink">
              {JSON.stringify(compiled.json, null, 2)}
            </pre>
            {compiled.warnings.map((w) => (
              <p key={w} className="mt-2 text-xs text-sand">
                {w}
              </p>
            ))}
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={applyCompiled}>
                Approve and run
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setProposalOpen(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </form>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <ViabilityCard
          title="Entry"
          score={viability.entryScore}
          label={viability.entryLabel}
          hint="Should this structure be opened here?"
        />
        <ViabilityCard
          title="Hold / exit"
          score={viability.exitScore}
          label={viability.exitLabel}
          hint="If already on, remaining analog edge."
        />
        <div className="rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            Support
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="font-display text-3xl tabular tracking-tight">
                {terrain.abstain ? "—" : fmtNum(terrain.nEff, 1)}
              </p>
              <p className="text-xs text-muted">N_eff analogs</p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>OOD {fmtPct(terrain.ood, 0)}</p>
              <p>transport {fmtNum(terrain.meanTransportResidual, 2)}</p>
              <Badge
                tone={terrain.evidence === "INCONCLUSIVE" ? "sand" : "mute"}
                className="mt-1"
              >
                {terrain.evidence}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <section className="space-y-3">
          <Panel title="Position">
            <div className="grid grid-cols-2 gap-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`min-h-11 rounded-sm px-2 py-2 text-left text-xs transition-colors duration-150 ${
                    templateId === t.id
                      ? "bg-accent text-accent-fg"
                      : "bg-elevated text-muted hover:text-fg"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">{tmpl.blurb}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-subtle">
                  <tr>
                    <th className="py-1 font-medium">Leg</th>
                    <th className="py-1 font-medium">K</th>
                    <th className="py-1 font-medium">τ</th>
                    <th className="py-1 font-medium">Mid</th>
                    <th className="py-1 font-medium">Bid</th>
                    <th className="py-1 font-medium">Ask</th>
                    <th className="py-1 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular">
                  {quoted.map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="py-1">
                        {l.side === "buy" ? "+" : "−"}
                        {l.qty} {l.right[0].toUpperCase()}
                      </td>
                      <td>{l.strike}</td>
                      <td>{l.tenorDays}d</td>
                      <td>{fmtNum(l.mid, 2)}</td>
                      <td>{fmtNum(l.bid, 2)}</td>
                      <td>{fmtNum(l.ask, 2)}</td>
                      <td>{fmtNum(l.delta, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat k="Delta" v={fmtNum(greeks.delta, 1)} />
              <Stat k="Gamma" v={fmtNum(greeks.gamma, 2)} />
              <Stat k="Vega" v={fmtNum(greeks.vega, 1)} />
              <Stat k="Theta" v={fmtNum(greeks.theta, 1)} />
              <Stat k="Debit" v={fmtUsd(greeks.debit, 0)} />
              <Stat k="Credit" v={fmtUsd(greeks.credit, 0)} />
              <Stat k="Hash" v={positionHash(quoted).slice(0, 8)} />
              <Stat k="Mark" v={fmtUsd(mark, 0)} />
            </div>
          </Panel>

          <Panel title="Transport">
            <div className="flex flex-wrap gap-1">
              {TRANSPORTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTransport(t.id)}
                  className={`min-h-11 rounded-sm px-2 py-1.5 text-[11px] ${
                    transport === t.id
                      ? "bg-accent text-accent-fg"
                      : "bg-elevated text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {transport === "template" &&
                "Closest historical contract on moneyness, tenor, and delta."}
              {transport === "exposure" &&
                "Match Greeks / scenario exposure. Residual is persisted, never hidden."}
              {transport === "contract" &&
                "Follows identifiers only — no cross-era mapping."}
            </p>
            <TransportNote quoted={quoted} day={day} chain={uni.chains[day.index]} mode={transport} />
          </Panel>

          <Panel title="Expiry payoff">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payoff} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                  <XAxis dataKey="s" tick={{ fill: "#5e615b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#5e615b", fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="rgb(255 255 255 / 0.12)" />
                  <Area
                    type="monotone"
                    dataKey="exp"
                    stroke="#8ea186"
                    fill="rgb(142 161 134 / 0.18)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="space-y-3">
          <Panel
            title="Replay clock"
            right={
              <span className="font-mono text-[11px] text-muted tabular">
                {day.date} · t_available
              </span>
            }
          >
            <input
              type="range"
              min={80}
              max={uni.days.length - 22}
              value={day.index}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHorizon(h.id)}
                  className={`min-h-11 rounded-sm px-2 py-1.5 text-[11px] ${
                    horizon === h.id
                      ? "bg-accent text-accent-fg"
                      : "bg-elevated text-muted"
                  }`}
                >
                  {h.label}
                </button>
              ))}
              <label className="ml-auto flex min-h-11 items-center gap-2 text-[11px] text-muted">
                <input
                  type="checkbox"
                  checked={useGeometry}
                  onChange={(e) => setUseGeometry(e.target.checked)}
                />
                SFT family
                <Badge tone="mute">candidate</Badge>
              </label>
            </div>
            {knownEvents.length > 0 && (
              <p className="mt-2 text-[11px] text-sand">
                Known ahead:{" "}
                {knownEvents
                  .map((e) => `${e.label} ${uni.days[e.dayIndex]?.date}`)
                  .join(" · ")}
              </p>
            )}
          </Panel>

          <Panel title="Market path (causal)">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={priceSeries}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#5e615b", fontSize: 10 }} minTickGap={24} />
                  <YAxis
                    yAxisId="p"
                    tick={{ fill: "#5e615b", fontSize: 10 }}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    yAxisId="v"
                    orientation="right"
                    tick={{ fill: "#5e615b", fontSize: 10 }}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "#181b18",
                      border: "1px solid #262924",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    yAxisId="p"
                    type="monotone"
                    dataKey="spot"
                    stroke="#d5d8cf"
                    dot={false}
                    strokeWidth={1.4}
                  />
                  <Line
                    yAxisId="v"
                    type="monotone"
                    dataKey="iv"
                    stroke="#8ea186"
                    dot={false}
                    strokeWidth={1}
                  />
                  <Line
                    yAxisId="v"
                    type="monotone"
                    dataKey="rv"
                    stroke="#c4a574"
                    dot={false}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Outcome terrain"
            right={
              <span className="text-[11px] text-muted">
                {terrain.featureFamily} · {terrain.horizonDays}d
              </span>
            }
          >
            {terrain.abstain ? (
              <div className="relative grid h-48 place-items-center overflow-hidden rounded-md bg-bg-sunken">
                <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(135deg,transparent,transparent_8px,#262924_8px,#262924_9px)]" />
                <p className="relative max-w-sm px-4 text-center text-sm text-muted">
                  ABSTAIN / UNKNOWN — {terrain.abstainReason}
                </p>
              </div>
            ) : (
              <div
                className="h-48"
                style={{ opacity: 0.45 + 0.55 * Math.min(1, terrain.nEff / 14) }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analogFan}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgb(255 255 255 / 0.04)" vertical={false} />
                    <XAxis dataKey="h" tick={{ fill: "#5e615b", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#5e615b", fontSize: 10 }} />
                    <ReferenceLine y={0} stroke="rgb(255 255 255 / 0.12)" />
                    <Area type="monotone" dataKey="q95" stroke="none" fill="rgb(142 161 134 / 0.12)" />
                    <Area type="monotone" dataKey="q75" stroke="none" fill="rgb(142 161 134 / 0.16)" />
                    <Line type="monotone" dataKey="q50" stroke="#d5d8cf" dot={false} strokeWidth={1.6} />
                    <Area type="monotone" dataKey="q25" stroke="none" fill="rgb(196 137 120 / 0.12)" />
                    <Area type="monotone" dataKey="q05" stroke="none" fill="rgb(196 137 120 / 0.1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
              <Stat k="q05" v={fmtUsd(terrain.quantiles.q05, 0)} neg={terrain.quantiles.q05 < 0} />
              <Stat k="q25" v={fmtUsd(terrain.quantiles.q25, 0)} />
              <Stat k="median" v={fmtUsd(terrain.quantiles.q50, 0)} />
              <Stat k="q95" v={fmtUsd(terrain.quantiles.q95, 0)} />
              <Stat k="Pr(profit)" v={fmtPct(terrain.prProfit, 0)} />
              <Stat k="Pr(stop)" v={fmtPct(terrain.prStop, 0)} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Stat k="MFE" v={fmtUsd(terrain.meanMfe, 0)} />
              <Stat k="MAE" v={fmtUsd(terrain.meanMae, 0)} />
              <Stat k="Drawdown" v={fmtUsd(terrain.meanDrawdown, 0)} />
            </div>
          </Panel>
        </section>

        <section className="space-y-3">
          <Panel title="Why this score">
            <ul className="space-y-1.5 text-sm">
              {viability.reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-sage" />
                  <span>{r}</span>
                </li>
              ))}
              {viability.risks.map((r) => (
                <li key={r} className="flex gap-2">
                  <ArrowDownRight className="mt-0.5 size-3.5 shrink-0 text-clay" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-subtle">
              Status {viability.evidence}. Not an E4 predictive claim. Costs are
              represented as half-spread; no live order authority.
            </p>
          </Panel>

          <Panel title={`Analog explorer · ${terrain.analogs.length}`}>
            <div className="max-h-80 space-y-1 overflow-auto pr-1">
              {terrain.analogs.map((a, i) => (
                <button
                  key={a.dayIndex}
                  type="button"
                  onClick={() => setSelectedAnalog(i)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-sm px-2 py-2 text-left text-xs shadow-[0_0_0_1px_rgb(255_255_255/0.04)] ${
                    selectedAnalog === i ? "bg-elevated" : "bg-bg-sunken/40 hover:bg-elevated/60"
                  }`}
                >

                  <span>
                    <span className="font-mono tabular">{a.date}</span>
                    <span className="ml-2 text-subtle">{a.regime}</span>
                    <span className="ml-2 text-subtle">r {fmtNum(a.transportResidual, 2)}</span>
                  </span>
                  <span className={`font-mono tabular ${tonePnl(a.pnl)}`}>
                    {fmtUsd(a.pnl, 0)}
                  </span>
                </button>
              ))}
              {!terrain.analogs.length && (
                <p className="text-sm text-muted">No valid transported analogs.</p>
              )}
            </div>
            {selected && (
              <div className="mt-3 rounded-md bg-bg-sunken p-3 text-xs">
                <p className="font-medium">
                  {selected.date}{" "}
                  <span className="font-normal text-muted">
                    d={fmtNum(selected.distance, 2)} · residual{" "}
                    {fmtNum(selected.transportResidual, 2)}
                  </span>
                </p>
                <p className="mt-1 text-muted">
                  Weight {fmtPct(selected.weight, 0)} · {selected.split} · stop{" "}
                  {selected.hitStop ? "yes" : "no"} · target{" "}
                  {selected.hitTarget ? "yes" : "no"}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-subtle">
                  Distance attribution
                </p>
                {selected.attribution.map((at) => (
                  <div key={at.name} className="mt-1 flex items-center gap-2">
                    <span className="w-24 truncate text-muted">{at.name}</span>
                    <div className="h-1 flex-1 rounded-full bg-line">
                      <div
                        className="h-1 rounded-full bg-ink"
                        style={{ width: `${Math.round(at.share * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-2 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selected.path.map((v, h) => ({ h, v }))}>
                      <ReferenceLine y={0} stroke="rgb(255 255 255 / 0.12)" />
                      <Line type="monotone" dataKey="v" stroke="#d5d8cf" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="State snapshot">
            <StateBars dayIndex={day.index} />
          </Panel>
        </section>
      </div>
    </div>
  );
}

function TransportNote({
  quoted,
  day,
  chain,
  mode,
}: {
  quoted: ReturnType<typeof quoteLegs>;
  day: ReturnType<typeof getUniverse>["days"][number];
  chain: ReturnType<typeof getUniverse>["chains"][number];
  mode: TransportMode;
}) {
  const tr = transportPosition(quoted, day, chain, mode);
  return (
    <p className="mt-2 text-xs">
      Residual <span className="font-mono tabular">{fmtNum(tr.residual, 3)}</span>
      <span className="text-muted"> — {tr.note}</span>
    </p>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg bg-surface p-3 shadow-[0_0_0_1px_rgb(255_255_255/0.06)] md:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({ k, v, neg }: { k: string; v: string; neg?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{k}</p>
      <p className={`font-mono text-sm tabular ${neg ? "text-clay" : "text-fg"}`}>{v}</p>
    </div>
  );
}

function ViabilityCard({
  title,
  score,
  label,
  hint,
}: {
  title: string;
  score: number;
  label: string;
  hint: string;
}) {
  const tone =
    label === "enter" || label === "hold"
      ? "text-sage"
      : label === "pass" || label === "exit" || label === "abstain"
        ? "text-clay"
        : "text-sand";
  return (
    <div className="rounded-lg bg-surface p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="font-display text-4xl tabular tracking-tight">{score || "—"}</p>
        <p className={`text-sm uppercase tracking-[0.12em] ${tone}`}>{label}</p>
      </div>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}

function StateBars({ dayIndex }: { dayIndex: number }) {
  const uni = getUniverse();
  const s = flattenState(encodeState(uni.days, uni.events, dayIndex));
  const names = [
    "ret",
    "sma20",
    "trend",
    "vwap",
    "rsi",
    "macd",
    "atr",
    "rvol",
    "ofi",
    "spr",
    "depth",
    "vol",
    "iv",
    "ivr",
    "skew",
    "iv-rv",
    "term",
  ];
  return (
    <div className="space-y-1">
      {names.map((n, i) => {
        const v = s[i] ?? 0;
        const w = Math.min(100, Math.abs(v) * 40);
        return (
          <div key={n} className="flex items-center gap-2 text-[10px]">
            <span className="w-10 text-subtle">{n}</span>
            <div className="h-1 flex-1 rounded-full bg-line">
              <div
                className={`h-1 rounded-full ${v >= 0 ? "bg-sage" : "bg-clay"}`}
                style={{ width: `${w}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
