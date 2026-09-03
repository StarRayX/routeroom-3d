/**
 * Mapbox access token handling.
 *
 * RouteRoom accepts only a public browser token ("pk."). A secret token
 * ("sk.") must never reach the client, so it is rejected explicitly rather
 * than silently accepted. The raw token value is never included in a log
 * line, an error message, or a returned value for a missing/invalid result:
 * only the string "ok" | "missing" | "invalid" and, for "invalid", a reason
 * code ever leave this module.
 */

export type MapboxTokenResolution =
  | { status: "ok"; token: string }
  | { status: "missing" }
  | { status: "invalid"; reason: "secret_token" | "malformed" };

/** Pure: resolves a raw token string (or undefined) to a typed result. Never logs. */
export function resolveMapboxToken(raw: string | undefined): MapboxTokenResolution {
  const trimmed = raw?.trim();
  if (!trimmed) return { status: "missing" };
  if (trimmed.startsWith("pk.")) return { status: "ok", token: trimmed };
  if (trimmed.startsWith("sk.")) return { status: "invalid", reason: "secret_token" };
  return { status: "invalid", reason: "malformed" };
}

/**
 * The one place this module reads `process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
 * Next.js inlines `NEXT_PUBLIC_*` variables at build time, so this is safe to
 * call from client components.
 */
export function getMapboxTokenFromEnv(): MapboxTokenResolution {
  return resolveMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
}
