import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return n.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtSigned(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  const body = fmtNum(Math.abs(n), digits);
  return n > 0 ? `+${body}` : n < 0 ? `−${body}` : body;
}

export function fmtUsd(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : n > 0 ? "+" : "";
  return `${sign}$${fmtNum(Math.abs(n), digits)}`;
}

export function fmtPct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return `${fmtSigned(n * 100, digits)}%`;
}

export function clamp(x: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function shortHash(input: string, len = 8): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, len);
}
