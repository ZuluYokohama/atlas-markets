import { clamp, mean, norm2, weightedQuantile } from "./core";
import {
  encodeState,
  featureNames,
  flattenState,
  type Universe,
} from "./market";
import {
  HORIZON_DAYS,
  exposureWeights,
  markValue,
  pathPnL,
  summarize,
  transportPosition,
} from "./position";
import type {
  AnalogRecord,
  HorizonId,
  QuotedLeg,
  TerrainResult,
  TransportMode,
  ViabilityReport,
} from "./types";

const FAMILY_W = {
  price: 1,
  technical: 0.7,
  micro: 0.55,
  surface: 1,
  calendar: 0.45,
  semantic: 0.5,
};

export function positionDistance(
  uni: Universe,
  a: number,
  b: number,
  legs: QuotedLeg[],
  useGeometry: boolean,
  geomA?: number[],
  geomB?: number[],
): { d: number; attribution: { name: string; share: number }[] } {
  const sa = flattenState(encodeState(uni.days, uni.events, a));
  const sb = flattenState(encodeState(uni.days, uni.events, b));
  const g = summarize(legs);
  const wExp = exposureWeights(g);
  const names = featureNames();
  const weights = names.map((_, i) => {
    if (i < 4) return FAMILY_W.price * (0.6 + wExp.price);
    if (i < 8) return FAMILY_W.technical * (0.5 + wExp.technical);
    if (i < 12) return FAMILY_W.micro * (0.4 + wExp.micro);
    if (i < 17) return FAMILY_W.surface * (0.5 + wExp.surface);
    if (i < 21) return FAMILY_W.calendar;
    return FAMILY_W.semantic;
  });
  let acc = 0;
  const parts: { name: string; share: number }[] = [];
  for (let i = 0; i < sa.length; i++) {
    const term = weights[i] * (sa[i] - sb[i]) ** 2;
    acc += term;
    parts.push({ name: names[i], share: term });
  }
  if (useGeometry && geomA && geomB) {
    const gd = norm2(geomA.map((v, i) => v - (geomB[i] ?? 0)));
    acc += 0.35 * gd * gd;
    parts.push({ name: "SFT coords", share: 0.35 * gd * gd });
  }
  const tot = acc || 1;
  parts.sort((x, y) => y.share - x.share);
  return {
    d: Math.sqrt(acc),
    attribution: parts.slice(0, 5).map((p) => ({
      name: p.name,
      share: p.share / tot,
    })),
  };
}

export function estimateTerrain(
  uni: Universe,
  query: number,
  legs: QuotedLeg[],
  horizon: HorizonId,
  mode: TransportMode,
  opts?: {
    k?: number;
    useGeometry?: boolean;
    geom?: number[][];
    stopMult?: number;
    targetFrac?: number;
  },
): TerrainResult {
  const k = opts?.k ?? 18;
  const H = HORIZON_DAYS[horizon];
  const stopMult = opts?.stopMult ?? 1.6;
  const targetFrac = opts?.targetFrac ?? 0.5;
  const greeks = summarize(legs);
  const entryCredit = Math.max(greeks.credit - greeks.debit, 0);
  const entryDebit = Math.max(greeks.debit - greeks.credit, 0);
  const riskUnit = entryCredit > 0 ? entryCredit : Math.max(entryDebit, 80);

  const cands: Omit<AnalogRecord, "weight">[] = [];
  for (let u = 30; u < query - 6; u++) {
    if (u + H >= uni.days.length) continue;
    if (uni.days[u].split === "quarantine") continue;
    const tr = transportPosition(legs, uni.days[u], uni.chains[u], mode, 0.38);
    if (!tr.valid) continue;
    const { d, attribution } = positionDistance(
      uni,
      query,
      u,
      legs,
      Boolean(opts?.useGeometry),
      opts?.geom?.[query],
      opts?.geom?.[u],
    );
    const path = pathPnL(uni, tr.legs, u, H, mode);
    const last = path.pnl[path.pnl.length - 1] ?? 0;
    const hitStop = path.mae <= -stopMult * riskUnit;
    const hitTarget =
      entryCredit > 0
        ? last >= targetFrac * entryCredit
        : last >= targetFrac * riskUnit;
    cands.push({
      dayIndex: u,
      date: uni.days[u].date,
      regime: uni.days[u].regime,
      split: uni.days[u].split,
      distance: d,
      transportResidual: tr.residual,
      transportMode: mode,
      pnl: last,
      mfe: path.mfe,
      mae: path.mae,
      drawdown: path.drawdown,
      hitStop,
      hitTarget,
      path: path.pnl,
      attribution,
    });
  }

  cands.sort((a, b) => a.distance - b.distance);
  const picked = cands.slice(0, k);
  const bandwidth = Math.max(picked[Math.min(4, picked.length - 1)]?.distance ?? 0.4, 0.12);
  const rawW = picked.map((p) => Math.exp(-0.5 * (p.distance / bandwidth) ** 2));
  const wsum = rawW.reduce((s, w) => s + w, 0) || 1;
  const weights = rawW.map((w) => w / wsum);
  const analogs: AnalogRecord[] = picked.map((p, i) => ({ ...p, weight: weights[i] }));

  const pnls = analogs.map((a) => a.pnl);
  const nEff = 1 / weights.reduce((s, w) => s + w * w, 0);
  const medDist = analogs[Math.floor(analogs.length / 2)]?.distance ?? 9;
  const ood = clamp(medDist / 2.4, 0, 1);

  const regimeCounts = new Map<string, number>();
  const yearCounts = new Map<string, number>();
  for (const a of analogs) {
    regimeCounts.set(a.regime, (regimeCounts.get(a.regime) ?? 0) + a.weight);
    yearCounts.set(a.date.slice(0, 4), (yearCounts.get(a.date.slice(0, 4)) ?? 0) + a.weight);
  }
  const regimeConcentration = Math.max(0, ...regimeCounts.values());
  const calendarConcentration = Math.max(0, ...yearCounts.values());

  const abstain = analogs.length < 6 || nEff < 4.2 || ood > 0.88;
  let abstainReason: string | null = null;
  if (analogs.length < 6) abstainReason = "Too few valid transported analogs.";
  else if (nEff < 4.2) abstainReason = "Effective sample size too low.";
  else if (ood > 0.88) abstainReason = "Query is out of historical support.";

  return {
    queryIndex: query,
    horizon,
    horizonDays: H,
    k: analogs.length,
    nEff,
    ood,
    regimeConcentration,
    calendarConcentration,
    meanTransportResidual: mean(analogs.map((a) => a.transportResidual)),
    quantiles: {
      q05: weightedQuantile(pnls, weights, 0.05),
      q25: weightedQuantile(pnls, weights, 0.25),
      q50: weightedQuantile(pnls, weights, 0.5),
      q75: weightedQuantile(pnls, weights, 0.75),
      q95: weightedQuantile(pnls, weights, 0.95),
    },
    prProfit: analogs.reduce((s, a) => s + (a.pnl > 0 ? a.weight : 0), 0),
    prStop: analogs.reduce((s, a) => s + (a.hitStop ? a.weight : 0), 0),
    prTarget: analogs.reduce((s, a) => s + (a.hitTarget ? a.weight : 0), 0),
    meanMfe: analogs.reduce((s, a) => s + a.weight * a.mfe, 0),
    meanMae: analogs.reduce((s, a) => s + a.weight * a.mae, 0),
    meanDrawdown: analogs.reduce((s, a) => s + a.weight * a.drawdown, 0),
    analogs,
    abstain,
    abstainReason,
    evidence: abstain ? "INCONCLUSIVE" : "DESCRIPTIVE",
    featureFamily: opts?.useGeometry ? "raw+SFT" : "raw analog",
  };
}

export function scoreViability(
  t: TerrainResult,
  mark: number,
  greeksCreditNet: number,
): ViabilityReport {
  if (t.abstain) {
    return {
      entryScore: 0,
      exitScore: 0,
      entryLabel: "abstain",
      exitLabel: "abstain",
      reasons: [t.abstainReason ?? "Insufficient support."],
      risks: ["Do not interpret a blank terrain as neutrality."],
      evidence: "INCONCLUSIVE",
    };
  }
  const unit = Math.max(80, Math.abs(greeksCreditNet) || Math.abs(mark) || 100);
  const q50 = t.quantiles.q50 / unit;
  const q05 = t.quantiles.q05 / unit;
  const tail = clamp(1 + q05, 0, 1.4);
  const loc = clamp(0.5 + q50, 0, 1.4);
  const support = clamp(t.nEff / 14, 0, 1);
  const oodPen = 1 - t.ood;
  const stopPen = 1 - t.prStop;
  const concPen = 1 - 0.45 * Math.max(0, t.regimeConcentration - 0.62);
  const entry =
    100 *
    clamp(
      0.28 * loc + 0.22 * tail + 0.18 * t.prProfit + 0.14 * support + 0.1 * oodPen + 0.08 * stopPen,
      0,
      1,
    ) *
    concPen;

  const remainingEdge = t.quantiles.q50;
  const leftTail = t.quantiles.q05;
  const hold =
    100 *
    clamp(
      0.34 * clamp(0.5 + remainingEdge / unit, 0, 1.2) +
        0.2 * (1 - t.prStop) +
        0.18 * support +
        0.14 * (1 - t.ood) +
        0.14 * clamp(1 + leftTail / unit, 0, 1),
      0,
      1,
    );

  const reasons: string[] = [];
  const risks: string[] = [];
  if (t.prProfit > 0.58) reasons.push("Majority of analogs finished profitable.");
  if (t.quantiles.q50 > 0) reasons.push("Median analog PnL is positive after costs-as-spread.");
  if (t.nEff >= 10) reasons.push(`Effective analog count N_eff = ${t.nEff.toFixed(1)} is usable.`);
  if (t.prStop > 0.28) risks.push("Stop-touch rate is elevated on the analog set.");
  if (t.ood > 0.55) risks.push("Query sits toward the edge of historical support.");
  if (t.regimeConcentration > 0.7) risks.push("Analogs concentrate in a single regime.");
  if (t.meanTransportResidual > 0.18) risks.push("Average position-transport residual is material.");
  if (!reasons.length) reasons.push("No strong positive analog tilt — treat as a pass.");

  const entryLabel =
    entry >= 68 ? "enter" : entry >= 54 ? "lean-enter" : "pass";
  const exitLabel = hold >= 62 ? "hold" : hold >= 48 ? "trim" : "exit";

  return {
    entryScore: Math.round(entry),
    exitScore: Math.round(hold),
    entryLabel,
    exitLabel,
    reasons,
    risks,
    evidence: "DESCRIPTIVE",
  };
}

export function currentMarkPath(
  uni: Universe,
  legs: QuotedLeg[],
  start: number,
  horizon: number,
  mode: TransportMode,
) {
  return pathPnL(uni, legs, start, horizon, mode);
}
