/**
 * Shared colour constants for the 3D scene (SceneContent) and the 2D SVG
 * fallback (RouteMap2D), so both renderers read as the same product.
 *
 * Soft pastel low-poly isometric palette: cream/sand ground, muted greens,
 * dusty blue water, warm gray buildings.
 */

import type { LandmarkKind } from "@/lib/types";

export const PALETTE = {
  background: "#e9e4d8",
  fog: "#e9e4d8",

  ground: "#ddd3ba",
  groundEdge: "#cfc3a1",

  water: "#7fa8b0",
  waterDeep: "#6d97a0",

  park: "#8aab7c",
  parkTrunk: "#7c6a4e",
  parkFoliage: "#6f9a6a",

  road: "#7d766a",
  roadLine: "#d8d0b8",

  plaza: "#e2d8c0",

  buildingDefault: "#b3a68e",
  roofDefault: "#8f7f68",

  candidateRoute: "#9aa39f",
  focusHalo: "#fff5dc",
  reportMarker: "#d9603b",
  disruption: "#e0a23a",
  transferMarker: "#4f5d5a",
  stairsMarker: "#d9a441",

  /** Neutral ink used for the legend's generic route-style swatches. */
  legendInk: "#3f5148",
} as const;

export const LANDMARK_ACCENTS: Record<LandmarkKind, string> = {
  origin: "#3f8f92",
  venue: "#d97757",
  station: "#5c7d99",
  entrance: "#d9a441",
  crossing: "#8a8f8c",
  park: "#6f9a6a",
  building: "#9c8f76",
};

export function landmarkAccent(kind: LandmarkKind): string {
  return LANDMARK_ACCENTS[kind] ?? PALETTE.buildingDefault;
}
