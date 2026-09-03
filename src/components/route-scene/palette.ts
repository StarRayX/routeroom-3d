/**
 * Shared colour constants for the 2D SVG fallback (RouteMap2D). Restrained
 * neutral palette: warm off-white ground and buildings, a single strong
 * accent for the primary route, a slate backup, and amber reserved strictly
 * for hazards (stairs, delays, reports, disruption). Candidates read as
 * dashed neutral gray rather than a third hue, so the accent stays legible.
 *
 * This mirrors the colours the Mapbox layer definitions use
 * (src/components/mapbox/style.ts), so the 2D fallback and the 3D map read
 * as the same product.
 */

import type { LandmarkKind } from "@/lib/types";

export const PALETTE = {
  ground: "#f7f5f0",

  buildingWall: "#efece5",
  buildingRoof: "#dedbd3",

  mergedBlockWall: "#f0eee9",
  mergedBlockRoof: "#e6e3dc",

  road: "#e7e4dd",
  rail: "#d6d2c9",
  water: "#d7dfe3",
  park: "#dfe6d6",
  plaza: "#ece9e1",

  /** The one strong colour in the scene: the primary route. */
  routeAccent: "#d9603b",
  /** Backup route. */
  routeBackup: "#5c6f80",
  /** Candidate routes: dashed, low-opacity, no competing hue. */
  routeCandidate: "#b9b5ad",

  /** Reserved strictly for hazards: stairs, delays, reports, disruption pulses. */
  hazardAmber: "#d9a441",

  focusHalo: "#ffffff",

  /** Small dark ink used for landmark pins and map labels. */
  landmarkInk: "#2b3136",
} as const;

/** Candidate route opacity when nothing is focused. */
export const CANDIDATE_OPACITY = 0.6;
/** Candidate route opacity once some segment is focused, so it recedes. */
export const CANDIDATE_DIMMED_OPACITY = 0.3;

/**
 * Every landmark kind is neutral ink except venue and entrance, which take
 * the route accent since those are the kinds a routed trip actually ends at.
 */
export const LANDMARK_ACCENTS: Record<LandmarkKind, string> = {
  origin: PALETTE.landmarkInk,
  station: PALETTE.landmarkInk,
  stop: PALETTE.landmarkInk,
  building: PALETTE.landmarkInk,
  park: PALETTE.landmarkInk,
  crossing: PALETTE.landmarkInk,
  venue: PALETTE.routeAccent,
  entrance: PALETTE.routeAccent,
};

export function landmarkAccent(kind: LandmarkKind): string {
  return LANDMARK_ACCENTS[kind] ?? PALETTE.landmarkInk;
}
