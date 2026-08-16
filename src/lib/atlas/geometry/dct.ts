/** Orthonormal DCT-II / IDCT-II. */

export function dctII(x: number[]): number[] {
  const n = x.length;
  const y = new Array(n).fill(0);
  const s0 = Math.sqrt(1 / n);
  const s = Math.sqrt(2 / n);
  for (let k = 0; k < n; k++) {
    let acc = 0;
    for (let i = 0; i < n; i++) acc += x[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    y[k] = (k === 0 ? s0 : s) * acc;
  }
  return y;
}

export function idctII(y: number[]): number[] {
  const n = y.length;
  const x = new Array(n).fill(0);
  const s0 = Math.sqrt(1 / n);
  const s = Math.sqrt(2 / n);
  for (let i = 0; i < n; i++) {
    let acc = s0 * y[0];
    for (let k = 1; k < n; k++) acc += s * y[k] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    x[i] = acc;
  }
  return x;
}

export function dctMse(x: number[], k: number): number {
  const y = dctII(x);
  const z = y.map((v, i) => (i < k ? v : 0));
  const rec = idctII(z);
  return mse(x, rec);
}

export function mse(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s / a.length;
}

export function reconstruct(basis: number[][], x: number[], k: number): number[] {
  const n = x.length;
  const kk = Math.min(k, basis[0].length);
  const coef = new Array(kk).fill(0);
  for (let j = 0; j < kk; j++) {
    for (let i = 0; i < n; i++) coef[j] += basis[i][j] * x[i];
  }
  const y = new Array(n).fill(0);
  for (let j = 0; j < kk; j++) {
    for (let i = 0; i < n; i++) y[i] += basis[i][j] * coef[j];
  }
  return y;
}

export function reconMse(basis: number[][], x: number[], k: number): number {
  return mse(x, reconstruct(basis, x, k));
}
