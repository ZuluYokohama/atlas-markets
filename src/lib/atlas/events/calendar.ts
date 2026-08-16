/** Session calendar. Hours are ENGINEERING_INFERENCE (US cash in UTC). */

export function isWeekdayUtc(isoDate: string): boolean {
  const day = new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

export function sessionOpenUtc(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T13:30:00.000Z`;
}

export function sessionCloseUtc(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T20:00:00.000Z`;
}

export function enumerateSessionDays(startIso: string, count: number): string[] {
  const out: string[] = [];
  const start = new Date(`${startIso.slice(0, 10)}T00:00:00.000Z`);
  let guard = 0;
  while (out.length < count && guard < count * 4) {
    const iso = start.toISOString();
    if (isWeekdayUtc(iso)) out.push(iso.slice(0, 10));
    start.setUTCDate(start.getUTCDate() + 1);
    guard++;
  }
  return out;
}
