import { runF0, type F0Report } from "./f0.ts";
import type { BaselineName } from "./baselines.ts";
import { MIN_EFFECT } from "./splits.ts";

export interface TrialRecord {
  id: string;
  rung: number;
  name: string;
  abandoned: boolean;
  w1: number | null;
  w2: number | null;
  d1: number | null;
  d2: number | null;
  claim: "VALIDATED" | "UNSUPPORTED" | "INCONCLUSIVE" | "OUT_OF_SCOPE";
  note: string;
}

export interface E4Report {
  protocolId: "E4-frozen-utility-v0";
  confirmationOpened: false;
  neuroevolutionStarted: false;
  bestSimpleW1: number;
  bestSimpleW2: number;
  trials: TrialRecord[];
  claim: "UNSUPPORTED" | "INCONCLUSIVE" | "VALIDATED";
  reason: string;
}

/** Frozen E1-G pinball (Stage 8). Do not retune. */
const E1G = {
  w1: 249.0955874932799,
  w2: 181.57779499240203,
};

function claimOf(d1: number, d2: number): TrialRecord["claim"] {
  if (d1 >= MIN_EFFECT && d2 >= MIN_EFFECT) return "VALIDATED";
  if (d1 > 0 || d2 > 0) return "INCONCLUSIVE";
  return "UNSUPPORTED";
}

export function runE4(f0: F0Report = runF0()): E4Report {
  if (f0.confirmationOpened) throw new Error("CONFIRMATION_OPEN");
  const w1 = f0.windows.find((w) => w.window === "W1")!;
  const w2 = f0.windows.find((w) => w.window === "W2")!;
  const best1 = Math.min(w1.pinball.unconditional, w1.pinball.regime);
  const best2 = Math.min(w2.pinball.unconditional, w2.pinball.regime);

  const rungs: Array<{ id: string; rung: number; key: BaselineName | "conn" }> = [
    { id: "unconditional", rung: 1, key: "unconditional" },
    { id: "regime-oracle", rung: 2, key: "regime" },
    { id: "knn", rung: 3, key: "knn" },
    { id: "kernel", rung: 4, key: "kernel" },
    { id: "ridge", rung: 5, key: "ridge" },
    { id: "tree", rung: 6, key: "tree" },
  ];

  const trials: TrialRecord[] = rungs.map((r) => {
    const a = r.key === "conn" ? E1G.w1 : w1.pinball[r.key];
    const b = r.key === "conn" ? E1G.w2 : w2.pinball[r.key];
    const d1 = (best1 - a) / Math.max(Math.abs(best1), 1e-9);
    const d2 = (best2 - b) / Math.max(Math.abs(best2), 1e-9);
    const isSimple = r.key === "unconditional" || r.key === "regime";
    return {
      id: r.id,
      rung: r.rung,
      name: r.id,
      abandoned: false,
      w1: a,
      w2: b,
      d1,
      d2,
      claim: isSimple ? "UNSUPPORTED" : claimOf(d1, d2),
      note: isSimple ? "reference baseline, not an incremental claim" : "frozen F0 metric",
    };
  });

  const d1c = (best1 - E1G.w1) / Math.max(Math.abs(best1), 1e-9);
  const d2c = (best2 - E1G.w2) / Math.max(Math.abs(best2), 1e-9);
  trials.push({
    id: "knn-connection-nystrom",
    rung: 7,
    name: "knn + connection coords",
    abandoned: false,
    w1: E1G.w1,
    w2: E1G.w2,
    d1: d1c,
    d2: d2c,
    claim: claimOf(d1c, d2c),
    note: "frozen E1-G trial; not retuned",
  });

  trials.push(
    {
      id: "tcn-ssm",
      rung: 8,
      name: "temporal conv / state-space",
      abandoned: true,
      w1: null,
      w2: null,
      d1: null,
      d2: null,
      claim: "OUT_OF_SCOPE",
      note: "not started; simpler rungs did not clear the kill line",
    },
    {
      id: "regime-moe",
      rung: 9,
      name: "regime mixture of experts",
      abandoned: true,
      w1: null,
      w2: null,
      d1: null,
      d2: null,
      claim: "OUT_OF_SCOPE",
      note: "not started; B2 already is the oracle-regime unconditional",
    },
    {
      id: "neuroevolution",
      rung: 10,
      name: "neuroevolution / NAS",
      abandoned: true,
      w1: null,
      w2: null,
      d1: null,
      d2: null,
      claim: "OUT_OF_SCOPE",
      note: "prohibited until simpler rungs pass and confirmation policy allows",
    },
  );

  const incremental = trials.filter((t) => t.rung >= 3 && !t.abandoned);
  const anyValidated = incremental.some((t) => t.claim === "VALIDATED");
  const anyPositive = incremental.some((t) => (t.d1 ?? 0) > 0 || (t.d2 ?? 0) > 0);
  const claim: E4Report["claim"] = anyValidated ? "VALIDATED" : anyPositive ? "INCONCLUSIVE" : "UNSUPPORTED";

  return {
    protocolId: "E4-frozen-utility-v0",
    confirmationOpened: false,
    neuroevolutionStarted: false,
    bestSimpleW1: best1,
    bestSimpleW2: best2,
    trials,
    claim,
    reason: anyValidated
      ? "a rung cleared 3% on both windows"
      : "no rung beat B1/B2 by the predeclared 3% on both development windows",
  };
}
