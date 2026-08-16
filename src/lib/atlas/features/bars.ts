import type { PitSnapshot, StoredEvent } from "../events/types.ts";

export interface SessionBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  availability_time: string;
  ingest_time: string;
  listed: boolean;
}

export function barsFromSnapshot(snapshot: PitSnapshot, instrumentId = "inst_spy"): SessionBar[] {
  const rows: SessionBar[] = [];
  for (const ev of snapshot.events) {
    if (ev.event_type !== "bar.close") continue;
    if (ev.instrument_id && ev.instrument_id !== instrumentId) continue;
    const p = ev.payload as Record<string, unknown>;
    const close = num(p.close ?? p.px);
    if (close == null) continue;
    rows.push({
      date: ev.event_time.slice(0, 10),
      open: num(p.open) ?? close,
      high: num(p.high) ?? close,
      low: num(p.low) ?? close,
      close,
      volume: num(p.volume) ?? 0,
      availability_time: ev.availability_time,
      ingest_time: ev.ingest_time,
      listed: p.listed === false ? false : true,
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

export function surfaceIv(snapshot: PitSnapshot): number | null {
  const ev = lastOfType(snapshot.events, "surface.atm_iv");
  const v = ev ? num((ev.payload as Record<string, unknown>).iv) : null;
  return v;
}

export function nextCatalystDays(snapshot: PitSnapshot, asOf: string): number | null {
  let best: number | null = null;
  const t0 = Date.parse(asOf.slice(0, 10) + "T00:00:00.000Z");
  for (const ev of snapshot.events) {
    if (ev.event_type !== "catalyst.scheduled") continue;
    const t1 = Date.parse(ev.event_time.slice(0, 10) + "T00:00:00.000Z");
    const days = Math.round((t1 - t0) / 86400000);
    if (days < 0) continue;
    if (best == null || days < best) best = days;
  }
  return best;
}

function lastOfType(events: readonly StoredEvent[], type: string): StoredEvent | null {
  let last: StoredEvent | null = null;
  for (const ev of events) {
    if (ev.event_type === type) last = ev;
  }
  return last;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
