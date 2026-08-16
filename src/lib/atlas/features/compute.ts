import { contentHash } from "../hash.ts";
import { FeatureObservationSchema, type FeatureObservation } from "../schemas.ts";
import type { PitSnapshot } from "../events/types.ts";
import { FEATURE_CATALOG } from "./catalog.ts";
import { barsFromSnapshot, nextCatalystDays, surfaceIv, type SessionBar } from "./bars.ts";

export interface FeatureContext {
  datasetVersionId: string;
  instrumentId?: string;
  netDelta?: number | null;
  strategyAge?: number | null;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
}

function rsi(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null;
  let up = 0;
  let dn = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) up += ch;
    else dn -= ch;
  }
  if (dn === 0) return 100;
  const rs = up / dn;
  return 100 - 100 / (1 + rs);
}

function atr(bars: SessionBar[], n: number): number | null {
  if (bars.length < n + 1) return null;
  const trs: number[] = [];
  for (let i = bars.length - n; i < bars.length; i++) {
    const prev = bars[i - 1].close;
    const b = bars[i];
    trs.push(Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev)));
  }
  return mean(trs);
}

function lastFridayIndex(bars: SessionBar[]): number {
  for (let i = bars.length - 1; i >= 0; i--) {
    const dow = new Date(bars[i].date + "T00:00:00.000Z").getUTCDay();
    if (dow === 5) return i;
  }
  return -1;
}

function scalar(
  name: string,
  bars: SessionBar[],
  snapshot: PitSnapshot,
  ctx: FeatureContext,
): number | null {
  const closes = bars.filter((b) => b.listed).map((b) => b.close);
  switch (name) {
    case "ret_1d":
      return closes.length >= 2 ? (closes.at(-1)! - closes.at(-2)!) / closes.at(-2)! : null;
    case "log_close":
      return closes.length ? Math.log(closes.at(-1)!) : null;
    case "sma_20":
    case "sma_20_alias":
      return closes.length >= 20 ? mean(closes.slice(-20)) : null;
    case "rsi_14":
      return rsi(closes, 14);
    case "atr_14":
      return atr(bars.filter((b) => b.listed), 14);
    case "rv_20": {
      if (closes.length < 21) return null;
      const lr: number[] = [];
      const w = closes.slice(-21);
      for (let i = 1; i < w.length; i++) lr.push(Math.log(w[i] / w[i - 1]));
      return std(lr) * Math.sqrt(252);
    }
    case "vol_z_20": {
      const vols = bars.filter((b) => b.listed).map((b) => b.volume);
      if (vols.length < 20) return null;
      const w = vols.slice(-20);
      const s = std(w);
      return s === 0 ? 0 : (w.at(-1)! - mean(w)) / s;
    }
    case "hl_range": {
      const b = bars.at(-1);
      return b && b.close ? (b.high - b.low) / b.close : null;
    }
    case "atm_iv":
      return surfaceIv(snapshot);
    case "net_delta":
      return ctx.netDelta ?? null;
    case "days_to_catalyst":
      return nextCatalystDays(snapshot, snapshot.cutoff.time);
    case "dow": {
      const b = bars.at(-1);
      if (!b) return null;
      const d = new Date(b.date + "T00:00:00.000Z").getUTCDay();
      return d === 0 ? 7 : d;
    }
    case "weekly_ret": {
      const lastBar = bars.at(-1);
      if (!lastBar) return null;
      if (new Date(lastBar.date + "T00:00:00.000Z").getUTCDay() !== 5) return null;
      const fri = lastFridayIndex(bars);
      if (fri < 0) return null;
      let prev = -1;
      for (let i = fri - 1; i >= 0; i--) {
        if (new Date(bars[i].date + "T00:00:00.000Z").getUTCDay() === 5) {
          prev = i;
          break;
        }
      }
      if (prev < 0) return null;
      return (bars[fri].close - bars[prev].close) / bars[prev].close;
    }
    case "strategy_age":
      return ctx.strategyAge ?? null;
    default:
      return null;
  }
}

export function computeFeatureFrame(
  snapshot: PitSnapshot,
  ctx: FeatureContext,
): FeatureObservation[] {
  const bars = barsFromSnapshot(snapshot, ctx.instrumentId ?? "inst_spy");
  const last = bars.at(-1);
  const t = last
    ? {
        event_time: last.availability_time,
        availability_time: last.availability_time,
        ingest_time: last.ingest_time,
        revision_time: last.ingest_time,
      }
    : {
        event_time: snapshot.cutoff.time,
        availability_time: snapshot.cutoff.time,
        ingest_time: snapshot.cutoff.time,
        revision_time: snapshot.cutoff.time,
      };
  return FEATURE_CATALOG.map((feat) => {
    const value = scalar(feat.name, bars, snapshot, ctx);
    const qualityFlags = value == null ? (["missing"] as const) : (["ok"] as const);
    const body = {
      featureDefinitionId: feat.id,
      datasetVersionId: ctx.datasetVersionId,
      value,
      qualityFlags: [...qualityFlags],
      ...t,
    };
    return FeatureObservationSchema.parse({
      ...body,
      id: `fo_${contentHash(body).slice(0, 20)}`,
      contentHash: contentHash(body),
    });
  });
}

export function frameHash(obs: FeatureObservation[]): string {
  return contentHash(obs.map((o) => ({ id: o.featureDefinitionId, v: o.value })));
}
