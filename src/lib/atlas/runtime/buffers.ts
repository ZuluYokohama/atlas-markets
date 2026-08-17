/** GPU-resident *layout* on CPU Float64. One instrument, one timeframe for v0. */

export class RingBuffer {
  readonly data: Float64Array;
  readonly cols: number;
  readonly cap: number;
  length = 0;
  private head = 0;

  constructor(cap: number, cols: number) {
    this.cap = cap;
    this.cols = cols;
    this.data = new Float64Array(cap * cols);
  }

  push(row: ArrayLike<number>): void {
    if (row.length !== this.cols) throw new Error("RING_COLS");
    const off = this.head * this.cols;
    for (let j = 0; j < this.cols; j++) this.data[off + j] = row[j]!;
    this.head = (this.head + 1) % this.cap;
    if (this.length < this.cap) this.length += 1;
  }

  last(): Float64Array {
    if (this.length === 0) throw new Error("RING_EMPTY");
    const i = (this.head - 1 + this.cap) % this.cap;
    return this.data.subarray(i * this.cols, i * this.cols + this.cols);
  }

  snapshot(): number[][] {
    const out: number[][] = [];
    for (let k = 0; k < this.length; k++) {
      const i = (this.head - this.length + k + this.cap) % this.cap;
      out.push(Array.from(this.data.subarray(i * this.cols, i * this.cols + this.cols)));
    }
    return out;
  }
}

export interface IncrementalState {
  ema: number;
  mu: number;
  v: number;
  initialized: boolean;
}

export function stepEma(prev: number, x: number, alpha: number, init: boolean): number {
  return init ? x : alpha * x + (1 - alpha) * prev;
}

/** Welford-like EW variance. */
export function stepVar(
  state: IncrementalState,
  x: number,
  alpha: number,
): IncrementalState {
  if (!state.initialized) {
    return { ema: x, mu: x, v: 0, initialized: true };
  }
  const mu = state.mu + alpha * (x - state.mu);
  const v = (1 - alpha) * (state.v + alpha * (x - state.mu) ** 2);
  const ema = stepEma(state.ema, x, alpha, false);
  return { ema, mu, v, initialized: true };
}

export function windowMean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

export function windowVar(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = windowMean(xs);
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
}
