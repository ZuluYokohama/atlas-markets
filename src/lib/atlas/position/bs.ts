/** Black–Scholes (European). Declared-model valuation only. */

export const SQRT2 = Math.SQRT2;
export const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

export function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function normPdf(x: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * x * x);
}

export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / SQRT2));
}

export interface BsInput {
  spot: number;
  strike: number;
  tau: number;
  vol: number;
  rate: number;
  div: number;
  right: "call" | "put";
}

export interface BsResult {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}

export function d1d2(x: BsInput): { d1: number; d2: number } {
  const sigSqrt = x.vol * Math.sqrt(x.tau);
  const d1 = (Math.log(x.spot / x.strike) + (x.rate - x.div + 0.5 * x.vol * x.vol) * x.tau) / sigSqrt;
  return { d1, d2: d1 - sigSqrt };
}

export function blackScholes(x: BsInput): BsResult {
  if (x.tau <= 0 || x.vol <= 0 || x.spot <= 0) {
    const intrinsic = x.right === "call" ? Math.max(x.spot - x.strike, 0) : Math.max(x.strike - x.spot, 0);
    return { price: intrinsic, delta: Number.NaN, gamma: Number.NaN, vega: Number.NaN, theta: Number.NaN };
  }
  const { d1, d2 } = d1d2(x);
  const dfR = Math.exp(-x.rate * x.tau);
  const dfQ = Math.exp(-x.div * x.tau);
  const nd1 = normCdf(d1);
  const nd2 = normCdf(d2);
  const price =
    x.right === "call"
      ? x.spot * dfQ * nd1 - x.strike * dfR * nd2
      : x.strike * dfR * normCdf(-d2) - x.spot * dfQ * normCdf(-d1);
  const delta = x.right === "call" ? dfQ * nd1 : dfQ * (nd1 - 1);
  const gamma = (dfQ * normPdf(d1)) / (x.spot * x.vol * Math.sqrt(x.tau));
  const vega = x.spot * dfQ * normPdf(d1) * Math.sqrt(x.tau);
  const thetaCall =
    (-x.spot * dfQ * normPdf(d1) * x.vol) / (2 * Math.sqrt(x.tau)) -
    x.rate * x.strike * dfR * nd2 +
    x.div * x.spot * dfQ * nd1;
  const thetaPut =
    (-x.spot * dfQ * normPdf(d1) * x.vol) / (2 * Math.sqrt(x.tau)) +
    x.rate * x.strike * dfR * normCdf(-d2) -
    x.div * x.spot * dfQ * normCdf(-d1);
  return { price, delta, gamma, vega, theta: x.right === "call" ? thetaCall : thetaPut };
}

export function intrinsic(right: "call" | "put", spot: number, strike: number): number {
  return right === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
}

export function putCallParityGap(call: number, put: number, spot: number, strike: number, tau: number, rate: number, div: number): number {
  return call - put - (spot * Math.exp(-div * tau) - strike * Math.exp(-rate * tau));
}
