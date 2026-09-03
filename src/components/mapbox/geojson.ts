/**
 * Pure converters from a CityPack + route-scene props into GeoJSON feature
 * collections for the Mapbox sources. No React, no mapbox-gl import: these
 * are exercised directly by tests/mapbox-geojson.test.ts.
 *
 * `@types/geojson` is not installed in this project (mapbox-gl's own d.ts
 * references a global `GeoJSON` namespace that is not actually resolvable
 * here), so this module declares its own minimal, structurally-compatible
 * geometry and feature shapes instead of importing from "geojson". They are
 * assignable everywhere mapbox-gl's typings expect GeoJSON because that
 * expectation resolves to an unconstrained type in this project's setup.
 *
 * Feature ids are always strings and always stable: a segment's id, a
 * landmark's id, or a report's id. Every source is created with
 * `promoteId: "<id property>"` (see style.ts) so Mapbox's feature-state and
 * click handling can address features by that same stable id.
 */

import { midpoint } from "@/lib/geo";
import type {
  CityPack,
  LandmarkKind,
  LngLat,
  ReportCategory,
  Reliability,
  RouteOption,
  RouteReport,
  RouteSegment,
  SceneDisplayMode,
  TransportMode,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Minimal local GeoJSON shapes (see module doc comment for why).
// ---------------------------------------------------------------------------

export type GeoPosition = LngLat;

export type LineStringGeometry = { type: "LineString"; coordinates: GeoPosition[] };
export type PointGeometry = { type: "Point"; coordinates: GeoPosition };

export type GeoFeature<Geometry, Properties> = {
  type: "Feature";
  id: string;
  geometry: Geometry;
  properties: Properties;
};

export type GeoFeatureCollection<Feature> = {
  type: "FeatureCollection";
  features: Feature[];
};

// ---------------------------------------------------------------------------
// rr-routes
// ---------------------------------------------------------------------------

export type RouteFeatureProperties = {
  segment_id: string;
  route_id: string;
  mode: TransportMode;
  is_walk: boolean;
  display_mode: SceneDisplayMode;
  focused: boolean;
  disrupted: boolean;
  /** primary = 3, backup = 2, candidate = 1. Feeds line-sort-key. */
  sort_key: number;
  label: string;
  line_name: string | null;
};

export type RouteFeature = GeoFeature<LineStringGeometry, RouteFeatureProperties>;
export type RouteFeatureCollection = GeoFeatureCollection<RouteFeature>;

const SORT_KEY_BY_DISPLAY_MODE: Record<SceneDisplayMode, number> = {
  primary: 3,
  backup: 2,
  candidate: 1,
};

export const EMPTY_ROUTE_FEATURE_COLLECTION: RouteFeatureCollection = { type: "FeatureCollection", features: [] };

/** One LineString feature per segment of every visible route. */
export function buildRouteFeatures(
  city: CityPack,
  routes: RouteOption[],
  visibleRouteIds: string[],
  displayModes: Record<string, SceneDisplayMode>,
  focusedSegmentId: string | undefined,
  disruptedSegmentIds: string[] | undefined,
): RouteFeatureCollection {
  void city; // geometry comes entirely from the route segments; kept for signature symmetry.
  const visible = new Set(visibleRouteIds);
  const disrupted = new Set(disruptedSegmentIds ?? []);
  const features: RouteFeature[] = [];

  for (const route of routes) {
    if (!visible.has(route.id)) continue;
    const displayMode = displayModes[route.id] ?? "candidate";
    for (const segment of route.segments) {
      features.push({
        type: "Feature",
        id: segment.id,
        geometry: { type: "LineString", coordinates: segment.path },
        properties: {
          segment_id: segment.id,
          route_id: route.id,
          mode: segment.mode,
          is_walk: segment.mode === "walk",
          display_mode: displayMode,
          focused: segment.id === focusedSegmentId,
          disrupted: disrupted.has(segment.id),
          sort_key: SORT_KEY_BY_DISPLAY_MODE[displayMode],
          label: segment.label,
          line_name: segment.lineName ?? null,
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// rr-points
// ---------------------------------------------------------------------------

export type PointFeatureProperties = {
  landmark_id: string;
  name: string;
  kind: LandmarkKind;
  on_primary: boolean;
};

export type PointFeature = GeoFeature<PointGeometry, PointFeatureProperties>;
export type PointFeatureCollection = GeoFeatureCollection<PointFeature>;

const POINT_LANDMARK_KINDS: ReadonlySet<LandmarkKind> = new Set(["station", "stop", "entrance", "venue", "origin"]);

/**
 * Point features for landmarks of kind station/stop/entrance/venue/origin
 * that are an endpoint of some segment on a visible route, or the camera
 * target.
 *
 * `displayModes` is optional and additional to the brief's literal 4-arg
 * signature: without knowing which visible route is primary, `on_primary`
 * cannot be computed correctly (a landmark used only by a backup or
 * candidate route must not read as primary). Every caller in this codebase
 * passes it; omitting it degrades gracefully to `on_primary: false` for
 * every point. This is documented again in mapbox/README.md.
 */
export function buildPointFeatures(
  city: CityPack,
  routes: RouteOption[],
  visibleRouteIds: string[],
  cameraTarget: string | undefined,
  displayModes?: Record<string, SceneDisplayMode>,
): PointFeatureCollection {
  const visible = new Set(visibleRouteIds);
  const relevantIds = new Set<string>();
  const primaryIds = new Set<string>();

  for (const route of routes) {
    if (!visible.has(route.id)) continue;
    const isPrimary = (displayModes?.[route.id] ?? "candidate") === "primary";
    for (const segment of route.segments) {
      relevantIds.add(segment.fromLandmarkId);
      relevantIds.add(segment.toLandmarkId);
      if (isPrimary) {
        primaryIds.add(segment.fromLandmarkId);
        primaryIds.add(segment.toLandmarkId);
      }
    }
  }
  if (cameraTarget) relevantIds.add(cameraTarget);

  const features: PointFeature[] = [];
  for (const landmark of city.landmarks) {
    if (!POINT_LANDMARK_KINDS.has(landmark.kind)) continue;
    if (!relevantIds.has(landmark.id)) continue;
    features.push({
      type: "Feature",
      id: landmark.id,
      geometry: { type: "Point", coordinates: landmark.position },
      properties: {
        landmark_id: landmark.id,
        name: landmark.name,
        kind: landmark.kind,
        on_primary: primaryIds.has(landmark.id),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// rr-reports
// ---------------------------------------------------------------------------

export type ReportFeatureProperties = {
  report_id: string;
  segment_id: string;
  route_id: string;
  category: ReportCategory;
  confidence: Reliability;
  source: RouteReport["source"];
};

export type ReportFeature = GeoFeature<PointGeometry, ReportFeatureProperties>;
export type ReportFeatureCollection = GeoFeatureCollection<ReportFeature>;

function findSegment(routes: RouteOption[], segmentId: string): { route: RouteOption; segment: RouteSegment } | undefined {
  for (const route of routes) {
    const segment = route.segments.find((candidate) => candidate.id === segmentId);
    if (segment) return { route, segment };
  }
  return undefined;
}

/** One Point feature at the midpoint of each reported segment's path. */
export function buildReportFeatures(city: CityPack, routes: RouteOption[], activeReports: RouteReport[]): ReportFeatureCollection {
  void city; // reports resolve their segment through `routes`; kept for signature symmetry.
  const features: ReportFeature[] = [];
  for (const report of activeReports) {
    const found = findSegment(routes, report.segmentId);
    if (!found) continue;
    features.push({
      type: "Feature",
      id: report.id,
      geometry: { type: "Point", coordinates: midpoint(found.segment.path) },
      properties: {
        report_id: report.id,
        segment_id: report.segmentId,
        route_id: found.route.id,
        category: report.category,
        confidence: report.confidence,
        source: report.source,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// rr-transfers (transfer points and hazard points share one source; the
// style layers rr-transfers / rr-hazards split them back apart by `kind`)
// ---------------------------------------------------------------------------

export type TransferFeatureProperties = {
  kind: "transfer";
  route_id: string;
  segment_id: string;
  mode_from: TransportMode;
  mode_to: TransportMode;
};

export type HazardFeatureProperties = {
  kind: "hazard";
  route_id: string;
  segment_id: string;
  hazard: "stairs" | "caution";
};

export type TransferOrHazardFeature = GeoFeature<PointGeometry, TransferFeatureProperties | HazardFeatureProperties>;
export type TransferFeatureCollection = GeoFeatureCollection<TransferOrHazardFeature>;

/**
 * Points where consecutive segments change transport mode, plus hazard
 * points for segments with stairs or "caution" accessibility. Computed only
 * for visible routes displayed as primary or backup, so candidates do not
 * clutter the map with transfer/hazard chrome.
 */
export function buildTransferFeatures(
  routes: RouteOption[],
  visibleRouteIds: string[],
  displayModes: Record<string, SceneDisplayMode>,
): TransferFeatureCollection {
  const visible = new Set(visibleRouteIds);
  const features: TransferOrHazardFeature[] = [];

  for (const route of routes) {
    if (!visible.has(route.id)) continue;
    const displayMode = displayModes[route.id] ?? "candidate";
    if (displayMode !== "primary" && displayMode !== "backup") continue;

    route.segments.forEach((segment, index) => {
      const previous = route.segments[index - 1];
      if (previous && previous.mode !== segment.mode) {
        features.push({
          type: "Feature",
          id: `transfer_${route.id}_${segment.id}`,
          geometry: { type: "Point", coordinates: segment.path[0] },
          properties: {
            kind: "transfer",
            route_id: route.id,
            segment_id: segment.id,
            mode_from: previous.mode,
            mode_to: segment.mode,
          },
        });
      }

      const hazard: "stairs" | "caution" | undefined = segment.hasStairs
        ? "stairs"
        : segment.accessibility === "caution"
          ? "caution"
          : undefined;
      if (hazard) {
        features.push({
          type: "Feature",
          id: `hazard_${route.id}_${segment.id}`,
          geometry: { type: "Point", coordinates: midpoint(segment.path) },
          properties: {
            kind: "hazard",
            route_id: route.id,
            segment_id: segment.id,
            hazard,
          },
        });
      }
    });
  }

  return { type: "FeatureCollection", features };
}
