/**
 * Mapbox layer definitions as data, plus the two imperative helpers that
 * apply them to a live map: `addRouteRoomLayers` (once, on style.load) and
 * `setRouteRoomData` (on every props change). Colours and widths here are
 * the single source of truth; tests/mapbox-style.test.ts checks them.
 */

import type {
  AnyLayer,
  CircleLayerSpecification,
  ExpressionSpecification,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  LineLayerSpecification,
  Map as MapboxMap,
  SymbolLayerSpecification,
} from "mapbox-gl";
import type {
  PointFeatureCollection,
  ReportFeatureCollection,
  RouteFeatureCollection,
  TransferFeatureCollection,
} from "./geojson";

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

export const SOURCE_IDS = {
  routes: "rr-routes",
  points: "rr-points",
  reports: "rr-reports",
  transfers: "rr-transfers",
} as const;

export type RouteRoomSourceId = (typeof SOURCE_IDS)[keyof typeof SOURCE_IDS];

export const LAYER_IDS = {
  routeFocus: "rr-route-focus",
  routeCasing: "rr-route-casing",
  routeTransit: "rr-route-transit",
  routeWalk: "rr-route-walk",
  routeDisrupted: "rr-route-disrupted",
  transfers: "rr-transfers",
  hazards: "rr-hazards",
  points: "rr-points",
  reports: "rr-reports",
} as const;

export type RouteRoomLayerId = (typeof LAYER_IDS)[keyof typeof LAYER_IDS];

// ---------------------------------------------------------------------------
// Colours (also checked by tests/mapbox-style.test.ts)
// ---------------------------------------------------------------------------

export const COLORS = {
  casing: "#ffffff",
  primary: "#d9603b",
  backup: "#3b4a56",
  candidate: "#9a9a96",
  focus: "#ffffff",
  disrupted: "#d9a441",
  transferFill: "#ffffff",
  transferStroke: "#2b3136",
  hazardFill: "#d9a441",
  hazardStroke: "#ffffff",
  pointFill: "#2b3136",
  pointPrimaryFill: "#d9603b",
  textColor: "#2b3136",
  textHalo: "#f4f2ed",
  reportFill: "#d9a441",
  reportStroke: "#2b3136",
} as const;

// ---------------------------------------------------------------------------
// Empty sources
// ---------------------------------------------------------------------------

const EMPTY_ROUTE_FC: RouteFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_POINT_FC: PointFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_REPORT_FC: ReportFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_TRANSFER_FC: TransferFeatureCollection = { type: "FeatureCollection", features: [] };

// ---------------------------------------------------------------------------
// Shared expressions
// ---------------------------------------------------------------------------

const displayModeMatch = (primary: number, backup: number, candidate: number, fallback: number): ExpressionSpecification => [
  "match",
  ["get", "display_mode"],
  "primary",
  primary,
  "backup",
  backup,
  "candidate",
  candidate,
  fallback,
];

const routeColorExpression: ExpressionSpecification = [
  "match",
  ["get", "display_mode"],
  "primary",
  COLORS.primary,
  "backup",
  COLORS.backup,
  "candidate",
  COLORS.candidate,
  COLORS.candidate,
];

// ---------------------------------------------------------------------------
// Line layers (slot "middle")
// ---------------------------------------------------------------------------

const routeFocusLayer: LineLayerSpecification = {
  id: LAYER_IDS.routeFocus,
  type: "line",
  source: SOURCE_IDS.routes,
  slot: "middle",
  filter: ["==", ["get", "focused"], true],
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": COLORS.focus,
    "line-width": 12,
    "line-opacity": 0.55,
    "line-blur": 2,
  },
};

const routeCasingLayer: LineLayerSpecification = {
  id: LAYER_IDS.routeCasing,
  type: "line",
  source: SOURCE_IDS.routes,
  slot: "middle",
  layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "sort_key"] },
  paint: {
    "line-color": COLORS.casing,
    "line-width": displayModeMatch(9, 5, 4, 4),
    "line-opacity": ["match", ["get", "display_mode"], "primary", 0.9, 0.6],
  },
};

const routeTransitLayer: LineLayerSpecification = {
  id: LAYER_IDS.routeTransit,
  type: "line",
  source: SOURCE_IDS.routes,
  slot: "middle",
  filter: ["==", ["get", "is_walk"], false],
  layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "sort_key"] },
  paint: {
    "line-color": routeColorExpression,
    "line-width": displayModeMatch(5, 2.5, 2, 2),
    "line-opacity": ["match", ["get", "display_mode"], "candidate", 0.7, 1],
  },
};

const routeWalkLayer: LineLayerSpecification = {
  id: LAYER_IDS.routeWalk,
  type: "line",
  source: SOURCE_IDS.routes,
  slot: "middle",
  filter: ["==", ["get", "is_walk"], true],
  layout: {
    "line-cap": "round",
    "line-join": "round",
    "line-sort-key": ["get", "sort_key"],
  },
  paint: {
    "line-color": routeColorExpression,
    "line-width": displayModeMatch(4, 2.5, 2, 2),
    "line-dasharray": ["match", ["get", "display_mode"], "candidate", ["literal", [1, 1.5]], ["literal", [0.2, 1.6]]],
    "line-opacity": ["match", ["get", "display_mode"], "candidate", 0.7, 1],
  },
};

const routeDisruptedLayer: LineLayerSpecification = {
  id: LAYER_IDS.routeDisrupted,
  type: "line",
  source: SOURCE_IDS.routes,
  slot: "middle",
  filter: ["==", ["get", "disrupted"], true],
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": COLORS.disrupted,
    "line-width": 6,
    "line-dasharray": ["literal", [0.8, 0.8]],
    "line-opacity": 0.95,
  },
};

// ---------------------------------------------------------------------------
// Circle / symbol layers (slot "top")
// ---------------------------------------------------------------------------

const transfersLayer: CircleLayerSpecification = {
  id: LAYER_IDS.transfers,
  type: "circle",
  source: SOURCE_IDS.transfers,
  slot: "top",
  filter: ["==", ["get", "kind"], "transfer"],
  paint: {
    "circle-radius": 5,
    "circle-color": COLORS.transferFill,
    "circle-stroke-color": COLORS.transferStroke,
    "circle-stroke-width": 2,
  },
};

const hazardsLayer: CircleLayerSpecification = {
  id: LAYER_IDS.hazards,
  type: "circle",
  source: SOURCE_IDS.transfers,
  slot: "top",
  filter: ["==", ["get", "kind"], "hazard"],
  paint: {
    "circle-radius": 5,
    "circle-color": COLORS.hazardFill,
    "circle-stroke-color": COLORS.hazardStroke,
    "circle-stroke-width": 2,
  },
};

const pointsLayer: SymbolLayerSpecification = {
  id: LAYER_IDS.points,
  type: "symbol",
  source: SOURCE_IDS.points,
  slot: "top",
  layout: {
    "text-field": ["get", "name"],
    "text-size": 11,
    "text-offset": [0, 1.1],
    "text-optional": true,
  },
  paint: {
    "text-color": COLORS.textColor,
    "text-halo-color": COLORS.textHalo,
    "text-halo-width": 1.2,
  },
};

/** A separate circle layer under rr-points draws the dot; symbol layers cannot paint a circle themselves. */
const pointDotsLayer: CircleLayerSpecification = {
  id: `${LAYER_IDS.points}-dot`,
  type: "circle",
  source: SOURCE_IDS.points,
  slot: "top",
  paint: {
    "circle-radius": 4,
    "circle-color": ["case", ["all", ["get", "on_primary"], ["in", ["get", "kind"], ["literal", ["entrance", "venue"]]]], COLORS.pointPrimaryFill, COLORS.pointFill],
  },
};

const reportsLayer: CircleLayerSpecification = {
  id: LAYER_IDS.reports,
  type: "circle",
  source: SOURCE_IDS.reports,
  slot: "top",
  paint: {
    "circle-radius": 6,
    "circle-color": COLORS.reportFill,
    "circle-stroke-color": COLORS.reportStroke,
    "circle-stroke-width": 1.5,
  },
};

// ---------------------------------------------------------------------------
// Layer list (exported for tests; also drives addRouteRoomLayers so the two
// never drift apart). Order matters: focus halo first so route lines draw
// over it; disrupted last so its overlay draws over the transit/walk lines.
// ---------------------------------------------------------------------------

export const ROUTE_ROOM_LAYERS: readonly AnyLayer[] = [
  routeFocusLayer,
  routeCasingLayer,
  routeTransitLayer,
  routeWalkLayer,
  routeDisruptedLayer,
  transfersLayer,
  hazardsLayer,
  pointDotsLayer,
  pointsLayer,
  reportsLayer,
];

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

function ensureGeoJsonSource(
  map: MapboxMap,
  id: RouteRoomSourceId,
  data: RouteFeatureCollection | PointFeatureCollection | ReportFeatureCollection | TransferFeatureCollection,
  promoteId?: string,
): void {
  if (map.getSource(id)) return;
  const spec: GeoJSONSourceSpecification = { type: "geojson", data, ...(promoteId ? { promoteId } : {}) };
  map.addSource(id, spec);
}

function ensureLayer(map: MapboxMap, layer: AnyLayer): void {
  if (map.getLayer(layer.id)) return;
  map.addLayer(layer);
}

/**
 * Adds the four RouteRoom sources (empty FeatureCollections) and every
 * RouteRoom layer, once. Safe to call more than once: existing sources and
 * layers are left untouched. Call this from the map's "style.load" handler,
 * since `mapbox://styles/mapbox/standard` is not ready before then.
 */
export function addRouteRoomLayers(map: MapboxMap): void {
  ensureGeoJsonSource(map, SOURCE_IDS.routes, EMPTY_ROUTE_FC, "segment_id");
  ensureGeoJsonSource(map, SOURCE_IDS.points, EMPTY_POINT_FC);
  ensureGeoJsonSource(map, SOURCE_IDS.reports, EMPTY_REPORT_FC);
  ensureGeoJsonSource(map, SOURCE_IDS.transfers, EMPTY_TRANSFER_FC);

  for (const layer of ROUTE_ROOM_LAYERS) ensureLayer(map, layer);
}

/** Pushes a new FeatureCollection to one of the four RouteRoom sources. No-op if the source is not yet added. */
export function setRouteRoomData(
  map: MapboxMap,
  sourceId: RouteRoomSourceId,
  data: RouteFeatureCollection | PointFeatureCollection | ReportFeatureCollection | TransferFeatureCollection,
): void {
  const source = map.getSource<GeoJSONSource>(sourceId);
  if (!source) return;
  source.setData(data);
}

// ---------------------------------------------------------------------------
// Mapbox Standard config properties (basemap fragment)
// ---------------------------------------------------------------------------

export const STANDARD_BASEMAP_CONFIG: ReadonlyArray<readonly [string, unknown]> = [
  ["lightPreset", "day"],
  ["theme", "faded"],
  ["showPointOfInterestLabels", false],
  ["showTransitLabels", true],
  ["showPlaceLabels", true],
  ["showRoadLabels", false],
  ["show3dObjects", true],
];

/**
 * Applies the Standard style's basemap configuration properties. Each call
 * is wrapped individually in try/catch: `setConfigProperty` exists on the
 * installed mapbox-gl 3.30.0 typings, but which config keys a given style
 * version actually understands varies, and an unknown key should not break
 * the rest of the scene.
 */
export function applyStandardConfig(map: MapboxMap): void {
  for (const [key, value] of STANDARD_BASEMAP_CONFIG) {
    try {
      map.setConfigProperty("basemap", key, value);
    } catch {
      // Config key unsupported by this style version; skip it.
    }
  }
}
