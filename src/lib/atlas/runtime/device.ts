export interface DeviceInfo {
  kind: "cpu";
  cuda: false;
  reason: string;
}

export function detectDevice(): DeviceInfo {
  return {
    kind: "cpu",
    cuda: false,
    reason: "no NVIDIA device in this runtime; CPU Float64 path is the certified reference",
  };
}

export type Lane =
  | "copy"
  | "feature"
  | "pricing"
  | "rt_inference"
  | "geometry"
  | "background";

export const LANE_PRIORITY: Record<Lane, number> = {
  rt_inference: 0,
  copy: 1,
  feature: 2,
  pricing: 3,
  geometry: 4,
  background: 5,
};

/** Work-conserving scheduler: skip background when the RT queue is busy. */
export class LaneScheduler {
  rtQueue = 0;
  lastLane: Lane | null = null;

  begin(lane: Lane): boolean {
    if (lane === "background" && this.rtQueue > 0) return false;
    if (lane === "rt_inference") this.rtQueue += 1;
    this.lastLane = lane;
    return true;
  }

  end(lane: Lane): void {
    if (lane === "rt_inference") this.rtQueue = Math.max(0, this.rtQueue - 1);
  }
}
