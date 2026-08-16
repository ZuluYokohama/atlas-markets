import { blackScholes } from "../position/bs.ts";
import { encodePosition, parsePositionDsl } from "../position/index.ts";
import { HORIZON, LOOKBACK, SPLIT } from "./splits.ts";
import type { SynthDay } from "./synth.ts";

export interface OutcomeRow {
  index: number;
  regime: string;
  yPnl: number;
  yMae: number;
  yMfe: number;
  yHit: number;
  yFwd: number;
  yRv: number;
  features: number[];
}

const HALF_SPREAD = 0.05;
const COMMISSION = 0.5;
const MULT = 100;
const ROUND_TRIP = 2 * (HALF_SPREAD * MULT + COMMISSION);

function markCall(spot: number, strike: number, tenorDays: number, iv: number): number {
  return blackScholes({
    spot,
    strike,
    tau: Math.max(tenorDays, 0) / 365,
    vol: iv,
    rate: 0,
    div: 0,
    right: "call",
  }).price;
}

/** Long ATM 21-DTE call, contract hold, 5-session horizon. */
export function buildRows(days: SynthDay[], horizon = HORIZON): OutcomeRow[] {
  const rows: OutcomeRow[] = [];
  for (let t = LOOKBACK; t + horizon < days.length; t++) {
    if (t >= SPLIT.confirmation.lo || t + horizon >= SPLIT.confirmation.lo) continue;
    const d0 = days[t];
    const dH = days[t + horizon];
    const k = Math.round(d0.spot);
    const px0 = markCall(d0.spot, k, 21, d0.ivAtm);
    const px1 = markCall(dH.spot, k, 21 - horizon, dH.ivAtm);
    const pnl = MULT * (px1 - px0) - ROUND_TRIP;
    let mfe = -Infinity;
    let mae = Infinity;
    let run = 0;
    for (let u = 1; u <= horizon; u++) {
      const px = markCall(days[t + u].spot, k, 21 - u, days[t + u].ivAtm);
      run = MULT * (px - px0) - ROUND_TRIP;
      if (run > mfe) mfe = run;
      if (run < mae) mae = run;
    }
    const fwd = days[t + horizon].spot / d0.spot - 1;
    const rets = days.slice(t + 1, t + 1 + horizon).map((d) => d.ret1);
    const m = rets.reduce((s, x) => s + x, 0) / rets.length;
    const yRv = Math.sqrt(rets.reduce((s, x) => s + (x - m) * (x - m), 0) / rets.length);
    const legs = parsePositionDsl(`long 1 SPY ${k} C ${d0.date.slice(0, 4)}-12-31`);
    const enc = encodePosition(legs, d0.spot, d0.ivAtm, d0.date);
    const features = [d0.ret1, d0.rv20, d0.ivAtm, d0.ivAtm - d0.rv20, d0.skew, ...enc.slice(0, 4)];
    rows.push({
      index: t,
      regime: d0.regime,
      yPnl: pnl,
      yMae: mae,
      yMfe: mfe,
      yHit: pnl > 0 ? 1 : 0,
      yFwd: fwd,
      yRv,
      features,
    });
  }
  return rows;
}
