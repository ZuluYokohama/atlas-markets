import type { Universe } from "./market";
import type { CompiledIntent, HorizonId, StrategyState } from "./types";

export const AUTOMATON: StrategyState[] = [
  "UNSEEN",
  "SCANNED",
  "QUALIFIED",
  "FORMING",
  "ELIGIBLE",
  "TRIGGERED",
  "MANAGED",
  "EXITED",
  "INVALIDATED",
];

export interface Predicate {
  id: string;
  from: StrategyState;
  to: StrategyState;
  label: string;
  fields: string[];
  test: (uni: Universe, i: number) => { ok: boolean; value: string };
}

export const PREDICATES: Predicate[] = [
  {
    id: "universe",
    from: "UNSEEN",
    to: "SCANNED",
    label: "Underlying is the declared liquid ETF",
    fields: ["symbol"],
    test: () => ({ ok: true, value: "SPY" }),
  },
  {
    id: "qualify",
    from: "SCANNED",
    to: "QUALIFIED",
    label: "IV rank ≥ 55 and spread < 8 bps",
    fields: ["ivRank", "spreadBps"],
    test: (uni, i) => {
      const d = uni.days[i];
      return {
        ok: d.ivRank >= 0.55 && d.spreadBps < 8,
        value: `IVr ${d.ivRank.toFixed(2)} / spr ${d.spreadBps.toFixed(1)}`,
      };
    },
  },
  {
    id: "setup",
    from: "QUALIFIED",
    to: "FORMING",
    label: "IV − RV > 3 vol points and RSI between 35–70",
    fields: ["ivAtm", "rv20", "rsi"],
    test: (uni, i) => {
      const d = uni.days[i];
      const gap = (d.ivAtm - d.rv20) * 100;
      return {
        ok: gap > 3 && d.rsi > 35 && d.rsi < 70,
        value: `IV−RV ${gap.toFixed(1)} / RSI ${d.rsi.toFixed(0)}`,
      };
    },
  },
  {
    id: "invalidate-form",
    from: "FORMING",
    to: "INVALIDATED",
    label: "FOMC inside 3 sessions (known-ahead only)",
    fields: ["events.knownAhead"],
    test: (uni, i) => {
      const hit = uni.events.some(
        (e) =>
          e.kind === "fomc" &&
          e.dayIndex > i &&
          e.dayIndex - i <= 3 &&
          e.dayIndex - i <= e.knownAheadDays,
      );
      return { ok: hit, value: hit ? "FOMC ≤ 3d" : "clear" };
    },
  },
  {
    id: "eligible",
    from: "FORMING",
    to: "ELIGIBLE",
    label: "Relative volume < 1.6 and no shock flag",
    fields: ["relVol"],
    test: (uni, i) => {
      const d = uni.days[i];
      return { ok: d.relVol < 1.6, value: `relVol ${d.relVol.toFixed(2)}` };
    },
  },
  {
    id: "trigger",
    from: "ELIGIBLE",
    to: "TRIGGERED",
    label: "First session close with IV rank still ≥ 55",
    fields: ["ivRank"],
    test: (uni, i) => {
      const d = uni.days[i];
      return { ok: d.ivRank >= 0.55, value: `IVr ${d.ivRank.toFixed(2)}` };
    },
  },
  {
    id: "manage",
    from: "TRIGGERED",
    to: "MANAGED",
    label: "Fills accepted by execution model",
    fields: ["execution"],
    test: () => ({ ok: true, value: "mid ± half-spread" }),
  },
  {
    id: "exit-target",
    from: "MANAGED",
    to: "EXITED",
    label: "50% of credit captured or 5 sessions elapsed",
    fields: ["pnl", "age"],
    test: () => ({ ok: false, value: "path-dependent" }),
  },
];

export function replayStrategy(
  uni: Universe,
  start: number,
  end: number,
): { index: number; state: StrategyState; note: string }[] {
  const out: { index: number; state: StrategyState; note: string }[] = [];
  let state: StrategyState = "UNSEEN";
  let managedFrom = -1;

  const fire = (from: StrategyState, to: StrategyState, i: number) => {
    const p = PREDICATES.find((x) => x.from === from && x.to === to);
    if (!p) return false;
    const r = p.test(uni, i);
    if (!r.ok) return false;
    state = to;
    out.push({ index: i, state, note: p.label + " — " + r.value });
    return true;
  };

  for (let i = start; i <= end && i < uni.days.length; i++) {
    const handlers: Record<StrategyState, () => void> = {
      UNSEEN: () => {
        fire("UNSEEN", "SCANNED", i);
      },
      SCANNED: () => {
        fire("SCANNED", "QUALIFIED", i);
      },
      QUALIFIED: () => {
        fire("QUALIFIED", "FORMING", i);
      },
      FORMING: () => {
        if (!fire("FORMING", "INVALIDATED", i)) fire("FORMING", "ELIGIBLE", i);
      },
      ELIGIBLE: () => {
        if (fire("ELIGIBLE", "TRIGGERED", i)) {
          fire("TRIGGERED", "MANAGED", i);
          managedFrom = i;
        }
      },
      TRIGGERED: () => {
        fire("TRIGGERED", "MANAGED", i);
      },
      MANAGED: () => {
        if (managedFrom >= 0 && i - managedFrom >= 5) {
          state = "EXITED";
          out.push({
            index: i,
            state,
            note: "Time exit — 5 sessions elapsed (declared horizon).",
          });
        }
      },
      EXITED: () => undefined,
      INVALIDATED: () => undefined,
    };
    handlers[state]();
    if (out[out.length - 1]?.index !== i) {
      out.push({ index: i, state, note: "hold" });
    }
  }
  return out;
}

export function compilePrompt(raw: string): CompiledIntent {
  const s = raw.toLowerCase();
  let positionTemplate = "iron-condor";
  if (s.includes("straddle")) positionTemplate = "straddle";
  else if (s.includes("risk reversal") || s.includes("risk-reversal"))
    positionTemplate = "risk-reversal";
  else if (s.includes("bull put") || s.includes("put credit"))
    positionTemplate = "put-credit";
  else if (s.includes("vertical") || s.includes("call spread") || s.includes("bull call"))
    positionTemplate = "bull-call";
  else if (s.includes("long put")) positionTemplate = "long-put";
  else if (s.includes("long call") || s.includes("call")) positionTemplate = "long-call";
  else if (s.includes("condor")) positionTemplate = "iron-condor";

  let tenorDays = 21;
  const dte = s.match(/(\d+)\s*-?\s*dte/) || s.match(/(\d+)\s*-?\s*day/);
  if (dte) tenorDays = Number(dte[1]);
  if (s.includes("30-dte") || s.includes("30 dte") || s.includes("thirty")) tenorDays = 30;

  let horizon: HorizonId = "5d";
  if (s.includes("session close") || s.includes("1 session") || s.includes("one session"))
    horizon = "1d";
  if (s.includes("21") || s.includes("expiry") || s.includes("expiration")) horizon = "21d";
  if (s.includes("five-session") || s.includes("5 session") || s.includes("five session"))
    horizon = "5d";

  let condition = "unconditional";
  if (s.includes("iv") && (s.includes("rank") || s.includes("quartile") || s.includes("elevated")))
    condition = "iv_rank high";
  if (s.includes("implied") && s.includes("realized")) condition = "iv_minus_rv top quartile";
  if (s.includes("low vol") || s.includes("grind")) condition = "regime grind / low realized";

  const warnings: string[] = [];
  if (s.includes("earnings") && (s.includes("do not") || s.includes("without") || s.includes("no future"))) {
    warnings.push("Future earnings are forbidden by the information policy — only known-ahead flags are used.");
  }
  if (s.match(/will (go|be)|guaranteed|alpha/)) {
    warnings.push("Language model is not numerical authority. No guaranteed outcome is implied.");
  }

  const json = {
    position: {
      template: positionTemplate,
      tenor_target_days: tenorDays,
    },
    condition,
    horizon: { sessions: horizon === "1d" ? 1 : horizon === "21d" ? 21 : 5 },
    information_policy: {
      point_in_time: true,
      future_events: "forbidden",
    },
  };

  return {
    raw,
    positionTemplate,
    tenorDays,
    horizon,
    condition,
    informationPolicy: "point_in_time; future_events forbidden",
    json,
    warnings,
  };
}
