/**
 * Small date-only formatter used by the curated-snapshot and attribution UI.
 * Lives outside src/lib because those files are owned by the route-engine /
 * city-pack work; this is presentation-only and never touches domain logic.
 */
export function formatDateOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toISOString().slice(0, 10);
}
