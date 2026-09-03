import type { CityPack } from "./types";

/** "08:24" in the city pack timezone. */
export function formatTime(iso: string, city: Pick<CityPack, "timezone" | "locale">): string {
  try {
    return new Intl.DateTimeFormat(city.locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: city.timezone }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** "08:12–08:24" */
export function formatTimeRange(fromIso: string, toIso: string, city: Pick<CityPack, "timezone" | "locale">): string {
  return `${formatTime(fromIso, city)}–${formatTime(toIso, city)}`;
}

/** "€3.80–€5.00" or "3.80–5.00 EUR" depending on locale support. */
export function formatFareRange(min: number, max: number, currency: string, locale = "en"): string {
  try {
    const formatter = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(min - max) < 0.005) return formatter.format(min);
    return `${formatter.format(min)}–${formatter.format(max)}`;
  } catch {
    return `${min.toFixed(2)}–${max.toFixed(2)} ${currency}`;
  }
}

export function formatMinutesRange(min: number, max: number): string {
  return min === max ? `${min} min` : `${min}–${max} min`;
}

export function formatMeters(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** "18 min ago", "1 hr ago", "yesterday" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let text: string;
  if (minutes < 1) text = "just now";
  else if (minutes < 60) text = `${minutes} min`;
  else if (hours < 24) text = `${hours} hr`;
  else if (days === 1) return future ? "tomorrow" : "yesterday";
  else text = `${days} days`;
  if (text === "just now") return text;
  return future ? `in ${text}` : `${text} ago`;
}

/** Stable-ish id for drafts and events. Not cryptographic. */
export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
