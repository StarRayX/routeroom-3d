/**
 * Shared colour constants for the 3D scene (SceneContent) and the 2D SVG
 * fallback (RouteMap2D), so both renderers read as the same product.
 *
 * Civic model-table palette: near-white ground, mineral buildings, quiet
 * geographic color, and one high-signal route accent.
 */

import type { LandmarkKind } from "@/lib/types";

export const PALETTE = {
  background: "#f3f1eb",
  fog: "#f3f1eb",

  ground: "#eeece5",
  groundEdge: "#d7d5ce",

  water: "#dce9eb",
  waterDeep: "#c5dade",

  park: "#dde6da",
  parkTrunk: "#9a8e79",
  parkFoliage: "#b8cab4",

  road: "#d4d3ce",
  roadLine: "#f8f7f3",

  plaza: "#e8e6df",

  buildingDefault: "#d8d6cf",
  roofDefault: "#c4c1b8",

  primaryRoute: "#e75a3c",
  backupRoute: "#354345",
  candidateRoute: "#8f9796",
  focusHalo: "#fff0e8",
  reportMarker: "#e75a3c",
  disruption: "#b27622",
  transferMarker: "#354345",
  stairsMarker: "#b27622",

  /** Neutral ink used for the legend's generic route-style swatches. */
  legendInk: "#192426",
} as const;

export const LANDMARK_ACCENTS: Record<LandmarkKind, string> = {
  origin: "#3d765f",
  venue: "#e75a3c",
  station: "#51686c",
  entrance: "#b27622",
  crossing: "#7b8586",
  park: "#89a184",
  building: "#aaa79f",
};

export function landmarkAccent(kind: LandmarkKind): string {
  return LANDMARK_ACCENTS[kind] ?? PALETTE.buildingDefault;
}
