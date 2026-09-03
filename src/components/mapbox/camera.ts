/**
 * Pure camera math for the Mapbox route scene. No mapbox-gl import, no
 * React: this module only computes what MapboxRouteScene.tsx hands to
 * `map.fitBounds` / `map.easeTo`. Exercised directly by
 * tests/mapbox-camera.test.ts.
 */

import { boundsOf, midpoint, withinRadius } from "@/lib/geo";
import type { CityPack, Landmark, LandmarkKind, LngLat, RouteOption, RouteReport, Trip } from "@/lib/types";

export type CameraPreset = "overview" | "route" | "arrival" | "feature";

export type CameraInput = {
  city: CityPack;
  /** Every route in the city pack (or at least enough to resolve routeId/focusedSegmentId against). */
  routes: RouteOption[];
  /** Trip supplying the destination landmark for "overview" and "arrival". Defaults to the city pack's default trip. */
  trip?: Trip;
  /** "route" preset: which route to frame. */
  routeId?: string;
  /** "feature" preset: a segment to fit bounds to. Takes priority over landmarkId and report. */
  focusedSegmentId?: string;
  /** "feature" preset: a landmark to center on. Used when focusedSegmentId is not set. */
  landmarkId?: string;
  /** "feature" preset: a report to center on (via its segment's midpoint). Used last. */
  report?: RouteReport;
};

export type CameraResult = {
  /** [[west, south], [east, north]]. Set for bounds-fitting presets. */
  bounds?: [LngLat, LngLat];
  /** Set for point-centering presets (landmark, report, or a fallback). */
  center?: LngLat;
  /** Set together with `center`. */
  zoom?: number;
  pitch: number;
  bearing: number;
  /** Uniform padding in pixels, applied on every side. */
  padding: number;
};

const DEST_RADIUS_METERS = 1200;
const OVERVIEW_KINDS: ReadonlySet<LandmarkKind> = new Set(["station", "stop", "entrance", "venue"]);
const ARRIVAL_KINDS: ReadonlySet<LandmarkKind> = new Set(["station", "stop", "entrance"]);
const FEATURE_POINT_ZOOM = 16.5;

function resolveTrip(city: CityPack, trip: Trip | undefined): Trip | undefined {
  return trip ?? city.trips.find((candidate) => candidate.id === city.defaultTripId);
}

function destinationLandmark(city: CityPack, trip: Trip | undefined): Landmark | undefined {
  const resolvedTrip = resolveTrip(city, trip);
  if (!resolvedTrip) return undefined;
  return city.landmarks.find((landmark) => landmark.id === resolvedTrip.destinationId);
}

/** Landmarks of `kinds` within DEST_RADIUS_METERS of the trip's destination, plus the destination itself. */
function destinationSideLandmarks(city: CityPack, trip: Trip | undefined, kinds: ReadonlySet<LandmarkKind>): Landmark[] {
  const destination = destinationLandmark(city, trip);
  if (!destination) return [];
  const near = city.landmarks.filter(
    (landmark) => kinds.has(landmark.kind) && withinRadius(landmark.position, destination.position, DEST_RADIUS_METERS),
  );
  return [destination, ...near];
}

function boundsFromPoints(points: LngLat[]): [LngLat, LngLat] | undefined {
  if (points.length === 0) return undefined;
  const b = boundsOf(points);
  if (!Number.isFinite(b.west) || !Number.isFinite(b.south) || !Number.isFinite(b.east) || !Number.isFinite(b.north)) {
    return undefined;
  }
  return [
    [b.west, b.south],
    [b.east, b.north],
  ];
}

function findSegmentPath(routes: RouteOption[], segmentId: string): LngLat[] | undefined {
  for (const route of routes) {
    const segment = route.segments.find((candidate) => candidate.id === segmentId);
    if (segment) return segment.path;
  }
  return undefined;
}

function routePathPoints(route: RouteOption): LngLat[] {
  const points: LngLat[] = [];
  for (const segment of route.segments) points.push(...segment.path);
  return points;
}

function overviewCamera(input: CameraInput): CameraResult {
  const landmarks = destinationSideLandmarks(input.city, input.trip, OVERVIEW_KINDS);
  const points = landmarks.length > 0 ? landmarks.map((l) => l.position) : [input.city.geometry.center];
  return {
    bounds: boundsFromPoints(points) ?? boundsFromPoints([input.city.geometry.center, input.city.geometry.center]),
    pitch: 55,
    bearing: -20,
    padding: 72,
  };
}

function routeCamera(input: CameraInput): CameraResult {
  const route = input.routes.find((candidate) => candidate.id === input.routeId);
  const points = route ? routePathPoints(route) : [];
  return {
    bounds: boundsFromPoints(points) ?? boundsFromPoints([input.city.geometry.center, input.city.geometry.center]),
    pitch: 45,
    bearing: 0,
    padding: 64,
  };
}

function arrivalCamera(input: CameraInput): CameraResult {
  const landmarks = destinationSideLandmarks(input.city, input.trip, ARRIVAL_KINDS);
  const points = landmarks.length > 0 ? landmarks.map((l) => l.position) : [input.city.geometry.center];
  return {
    bounds: boundsFromPoints(points) ?? boundsFromPoints([input.city.geometry.center, input.city.geometry.center]),
    pitch: 60,
    bearing: 0,
    padding: 56,
  };
}

function featureCamera(input: CameraInput): CameraResult {
  const base = { pitch: 60, bearing: 0, padding: 48 };

  if (input.focusedSegmentId) {
    const path = findSegmentPath(input.routes, input.focusedSegmentId);
    const bounds = path ? boundsFromPoints(path) : undefined;
    if (bounds) return { ...base, bounds };
  }

  if (input.landmarkId) {
    const landmark = input.city.landmarks.find((candidate) => candidate.id === input.landmarkId);
    if (landmark) return { ...base, center: landmark.position, zoom: FEATURE_POINT_ZOOM };
  }

  if (input.report) {
    const path = findSegmentPath(input.routes, input.report.segmentId);
    if (path && path.length > 0) {
      return { ...base, center: midpoint(path), zoom: FEATURE_POINT_ZOOM };
    }
  }

  // Nothing resolvable: fall back to the pack center as a point.
  return { ...base, center: input.city.geometry.center, zoom: FEATURE_POINT_ZOOM };
}

/** Pure camera computation for a preset. Never touches a map instance. */
export function computeCamera(preset: CameraPreset, input: CameraInput): CameraResult {
  switch (preset) {
    case "overview":
      return overviewCamera(input);
    case "route":
      return routeCamera(input);
    case "arrival":
      return arrivalCamera(input);
    case "feature":
      return featureCamera(input);
  }
}

const EPSILON = 1e-6;

function numberEquals(a: number | undefined, b: number | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return Math.abs(a - b) < EPSILON;
}

function pointEquals(a: LngLat | undefined, b: LngLat | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return numberEquals(a[0], b[0]) && numberEquals(a[1], b[1]);
}

function boundsEquals(a: [LngLat, LngLat] | undefined, b: [LngLat, LngLat] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return pointEquals(a[0], b[0]) && pointEquals(a[1], b[1]);
}

/** Structural, epsilon-tolerant equality so identical camera moves are not re-fired. */
export function cameraEquals(a: CameraResult, b: CameraResult): boolean {
  return (
    numberEquals(a.pitch, b.pitch) &&
    numberEquals(a.bearing, b.bearing) &&
    numberEquals(a.padding, b.padding) &&
    numberEquals(a.zoom, b.zoom) &&
    pointEquals(a.center, b.center) &&
    boundsEquals(a.bounds, b.bounds)
  );
}
