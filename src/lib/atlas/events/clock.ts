import type { ClockMode } from "./types.ts";

export class VirtualClock {
  readonly mode: ClockMode;
  private nowIso: string;

  constructor(mode: ClockMode, nowIso: string) {
    this.mode = mode;
    this.nowIso = nowIso;
  }

  now(): string {
    return this.nowIso;
  }

  advanceTo(iso: string): void {
    if (iso < this.nowIso) {
      throw new Error(`CLOCK_MONOTONE: cannot move ${this.mode} clock from ${this.nowIso} to ${iso}`);
    }
    this.nowIso = iso;
  }
}
