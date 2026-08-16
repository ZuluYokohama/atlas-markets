import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRANSPORTS,
  applySplit,
  blackScholes,
  compilePosition,
  contractId,
  emptyChain,
  encodePosition,
  markPosition,
  payoffAtSpot,
  positionHash,
  putCallParityGap,
  putQuote,
  transportPosition,
  vectorsClose,
  type CompiledLeg,
  type ListedQuote,
} from "../../src/lib/atlas/index.ts";

const AS_OF = "2024-06-03";
const EXP = "2024-06-21";
const SPOT = 100;
const VOL = 0.2;
const TAU = 18 / 365;

function quote(partial: Omit<ListedQuote, "mid" | "asOf"> & { mid?: number }): ListedQuote {
  return {
    ...partial,
    mid: partial.mid ?? 0.5 * (partial.bid + partial.ask),
    asOf: AS_OF,
  };
}

function modelQuote(right: "call" | "put", strike: number, expiration = EXP): ListedQuote {
  const tau = (Date.parse(expiration) - Date.parse(AS_OF)) / (365 * 24 * 3600 * 1000);
  const bs = blackScholes({ spot: SPOT, strike, tau, vol: VOL, rate: 0, div: 0, right });
  const cid = contractId({ underlying: "SPY", expiration, right, strike });
  return quote({
    contractId: cid,
    underlying: "SPY",
    right,
    strike,
    expiration,
    bid: bs.price - 0.05,
    ask: bs.price + 0.05,
    mid: bs.price,
    iv: VOL,
    delta: bs.delta,
    quality: "ok",
  });
}

function chainWith(...qs: ListedQuote[]) {
  const c = emptyChain(AS_OF, SPOT, 0, 0);
  for (const q of qs) putQuote(c, q);
  return c;
}

describe("Stage 3 position compiler and valuation", () => {
  it("parses DSL and is invariant to leg order", () => {
    const a = compilePosition("long 1 SPY 100 C 2024-06-21\nshort 1 SPY 110 C 2024-06-21");
    const b = compilePosition("short 1 SPY 110 C 2024-06-21 / long 1 SPY 100 C 2024-06-21");
    assert.equal(a.hash, b.hash);
    assert.equal(a.hash, positionHash([...a.legs].reverse()));
    const ch = chainWith(modelQuote("call", 100), modelQuote("call", 110));
    const va = markPosition(a.legs, ch, "model", VOL);
    const vb = markPosition(b.legs, ch, "model", VOL);
    assert.ok(va.value != null && vb.value != null);
    assert.ok(Math.abs(va.value - vb.value) < 1e-10);
    assert.ok(vectorsClose(encodePosition(a.legs, SPOT, VOL, AS_OF), encodePosition(b.legs, SPOT, VOL, AS_OF)));
  });

  it("satisfies expiry payoffs and put-call parity", () => {
    const call = compilePosition("long 1 SPY 100 C 2024-06-21").legs;
    const put = compilePosition("long 1 SPY 100 P 2024-06-21").legs;
    assert.equal(payoffAtSpot(call, 110), 10 * 100);
    assert.equal(payoffAtSpot(call, 90), 0);
    assert.equal(payoffAtSpot(put, 90), 10 * 100);
    assert.equal(payoffAtSpot(put, 110), 0);
    const expired = emptyChain("2024-06-21", 110);
    const m = markPosition(call, expired, "model", VOL);
    assert.equal(m.legs[0].quality, "expired");
    assert.equal(m.value, 10 * 100);

    const c = blackScholes({ spot: SPOT, strike: 100, tau: TAU, vol: VOL, rate: 0, div: 0, right: "call" });
    const p = blackScholes({ spot: SPOT, strike: 100, tau: TAU, vol: VOL, rate: 0, div: 0, right: "put" });
    assert.ok(Math.abs(putCallParityGap(c.price, p.price, SPOT, 100, TAU, 0, 0)) < 1e-6);
  });

  it("matches analytic Greeks with central finite differences", () => {
    const x = { spot: SPOT, strike: 100, tau: 0.25, vol: VOL, rate: 0, div: 0, right: "call" as const };
    const v = blackScholes(x);
    const hS = 0.05;
    const up = blackScholes({ ...x, spot: SPOT + hS }).price;
    const dn = blackScholes({ ...x, spot: SPOT - hS }).price;
    const fdDelta = (up - dn) / (2 * hS);
    const fdGamma = (up - 2 * v.price + dn) / (hS * hS);
    const hV = 1e-4;
    const fdVega = (blackScholes({ ...x, vol: VOL + hV }).price - blackScholes({ ...x, vol: VOL - hV }).price) / (2 * hV);
    assert.ok(Math.abs(v.delta - fdDelta) < 5e-4, `delta ${v.delta} vs ${fdDelta}`);
    assert.ok(Math.abs(v.gamma - fdGamma) < 5e-4, `gamma ${v.gamma} vs ${fdGamma}`);
    assert.ok(Math.abs(v.vega - fdVega) < 5e-3, `vega ${v.vega} vs ${fdVega}`);
  });

  it("applies a 2-for-1 split without changing payoff", () => {
    const legs = compilePosition("long 1 SPY 100 C 2024-06-21").legs;
    const before = payoffAtSpot(legs, 110);
    const after = applySplit(legs, 2);
    assert.equal(after[0].strike, 50);
    assert.equal(after[0].quantity, 2);
    assert.equal(payoffAtSpot(after, 55), before);
  });

  it("does not invent missing or silently trust stale quotes", () => {
    const legs = compilePosition("long 1 SPY 100 C 2024-06-21").legs;
    const empty = emptyChain(AS_OF, SPOT);
    const missing = markPosition(legs, empty, "market");
    assert.equal(missing.value, null);
    assert.deepEqual(missing.missingContracts, [legs[0].contractId]);

    const staleQ = modelQuote("call", 100);
    staleQ.quality = "stale";
    const stale = markPosition(legs, chainWith(staleQ), "market");
    assert.ok(stale.value != null);
    assert.deepEqual(stale.staleContracts, [legs[0].contractId]);
    assert.equal(stale.legs[0].quality, "stale");
  });

  it("transports are versioned, reproducible, and refuse to invent", () => {
    const legs = compilePosition("long 1 SPY 100 C 2024-06-21").legs;
    const listed = chainWith(modelQuote("call", 100), modelQuote("call", 105), modelQuote("put", 100));
    const c1 = transportPosition(legs, listed, "contract_v1");
    const c2 = transportPosition(legs, listed, "contract_v1");
    assert.equal(c1.refused, false);
    assert.equal(c1.legs[0].contractId, c2.legs[0].contractId);
    assert.equal(TRANSPORTS.contract_v1.id, "contract_v1");

    const bare = emptyChain(AS_OF, SPOT);
    assert.equal(transportPosition(legs, bare, "contract_v1").refused, true);

    const far = chainWith(modelQuote("call", 160));
    const refused = transportPosition(legs, far, "template_v1");
    assert.equal(refused.refused, true);

    const near = chainWith(modelQuote("call", 101), modelQuote("call", 110));
    const tpl = transportPosition(legs, near, "template_v1");
    assert.equal(tpl.refused, false);
    assert.equal(tpl.legs[0].strike, 101);
    const tpl2 = transportPosition(legs, near, "template_v1");
    assert.equal(tpl.legs[0].contractId, tpl2.legs[0].contractId);

    const exp = transportPosition(legs, listed, "exposure_v1");
    assert.equal(exp.refused, false);
  });

  it("encoder is permutation invariant for a four-leg condor", () => {
    const text = [
      "long 1 SPY 90 P 2024-06-21",
      "short 1 SPY 95 P 2024-06-21",
      "short 1 SPY 105 C 2024-06-21",
      "long 1 SPY 110 C 2024-06-21",
    ].join("\n");
    const { legs } = compilePosition(text);
    const rev = [...legs].reverse() as CompiledLeg[];
    const mid = [legs[2], legs[0], legs[3], legs[1]];
    assert.ok(vectorsClose(encodePosition(legs, SPOT, VOL, AS_OF), encodePosition(rev, SPOT, VOL, AS_OF)));
    assert.ok(vectorsClose(encodePosition(legs, SPOT, VOL, AS_OF), encodePosition(mid, SPOT, VOL, AS_OF)));
  });
});
