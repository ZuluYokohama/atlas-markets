export function silu(x: number): number {
  return x / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
}

export function softmax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0) || 1;
  return e.map((v) => v / s);
}

export function topkSoftmax(logits: number[], k: number): number[] {
  const idx = logits.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const keep = new Set(idx.slice(0, Math.max(1, k)).map((p) => p[1]));
  const masked = logits.map((v, i) => (keep.has(i) ? v : -1e9));
  return softmax(masked);
}

export function matvec(W: number[], x: number[], rows: number, cols: number, b?: number[]): number[] {
  const y = new Array(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    let s = b?.[i] ?? 0;
    for (let j = 0; j < cols; j++) s += W[i * cols + j]! * x[j]!;
    y[i] = s;
  }
  return y;
}

export function layerNorm(x: number[], eps = 1e-5): number[] {
  const m = x.reduce((s, v) => s + v, 0) / Math.max(x.length, 1);
  const v = x.reduce((s, a) => s + (a - m) ** 2, 0) / Math.max(x.length, 1);
  const d = Math.sqrt(v + eps);
  return x.map((a) => (a - m) / d);
}

export function gruStep(
  x: number[],
  h: number[],
  Wz: number[],
  Uz: number[],
  Wr: number[],
  Ur: number[],
  Wh: number[],
  Uh: number[],
): number[] {
  const z = sigmoid(add(matvec(Wz, x, h.length, x.length), matvec(Uz, h, h.length, h.length)));
  const r = sigmoid(add(matvec(Wr, x, h.length, x.length), matvec(Ur, h, h.length, h.length)));
  const rh = h.map((v, i) => v * r[i]!);
  const n = tanhVec(add(matvec(Wh, x, h.length, x.length), matvec(Uh, rh, h.length, h.length)));
  return h.map((hv, i) => (1 - z[i]!) * hv + z[i]! * n[i]!);
}

function sigmoid(x: number[]): number[] {
  return x.map((v) => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, v)))));
}
function tanhVec(x: number[]): number[] {
  return x.map((v) => Math.tanh(v));
}
function add(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] ?? 0));
}

export function seedWeights(n: number, seed: number): number[] {
  const out = new Array<number>(n);
  let a = seed >>> 0;
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out[i] = ((((t ^ (t >>> 14)) >>> 0) / 4294967296) - 0.5) * Math.sqrt(2 / Math.max(n, 1));
  }
  return out;
}
