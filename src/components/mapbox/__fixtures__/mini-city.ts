/**
 * A tiny synthetic city pack for route-scene smoke testing: a 600 m square
 * with 6 individual buildings inside one detail zone, 2 merged blocks
 * outside it, a canal, a park, a road, a rail line, 4 landmarks, 2 route
 * options, and 1 detail zone.
 *
 * Every coordinate is generated from a meter offset (east, north) off the
 * pack's own projection center via the real projector's `fromScene`, so the
 * fixture and the projector agree by construction: projecting a fixture
 * point back through `toScene` reproduces the offset it was built from.
 * That is what tests/route-scene-geometry.test.ts checks.
 */

import { boundsOf, createProjector, pathLengthMeters, SCENE_METERS_PER_UNIT } from "@/lib/geo";
import type { CityPack, GeometryFeature, Landmark, LngLat, RouteOption, RouteSegment } from "@/lib/types";

export const MINI_CITY_CENTER: LngLat = [4.895, 52.37];

const projector = createProjector(MINI_CITY_CENTER);

/** A point `eastMeters`/`northMeters` away from the pack center, as real lng/lat. */
function at(eastMeters: number, northMeters: number): LngLat {
  return projector.fromScene(eastMeters / SCENE_METERS_PER_UNIT, -northMeters / SCENE_METERS_PER_UNIT);
}

/** A square footprint ring, `halfSizeMeters` from its center on each side. */
function square(centerEast: number, centerNorth: number, halfSizeMeters: number): LngLat[] {
  return [
    at(centerEast - halfSizeMeters, centerNorth - halfSizeMeters),
    at(centerEast + halfSizeMeters, centerNorth - halfSizeMeters),
    at(centerEast + halfSizeMeters, centerNorth + halfSizeMeters),
    at(centerEast - halfSizeMeters, centerNorth + halfSizeMeters),
  ];
}

// ---------------------------------------------------------------------------
// Detail zone
// ---------------------------------------------------------------------------

const ZONE_ID = "zone_mini_center";

export const MINI_DETAIL_ZONE = {
  id: ZONE_ID,
  name: "Mini Center",
  center: at(0, 0),
  radiusMeters: 150,
  reason: "origin" as const,
};

// ---------------------------------------------------------------------------
// Buildings (6, all inside the detail zone) and merged blocks (2, outside it)
// ---------------------------------------------------------------------------

const buildingCenters: Array<{ id: string; east: number; north: number; heightMeters: number }> = [
  { id: "bldg_mini_1", east: 40, north: 40, heightMeters: 14 },
  { id: "bldg_mini_2", east: -40, north: 60, heightMeters: 20 },
  { id: "bldg_mini_3", east: 60, north: -30, heightMeters: 16 },
  { id: "bldg_mini_4", east: -60, north: -50, heightMeters: 11 },
  { id: "bldg_mini_5", east: 10, north: -90, heightMeters: 25 },
  { id: "bldg_mini_6", east: -90, north: 10, heightMeters: 13 },
];

export const MINI_BUILDINGS: GeometryFeature[] = buildingCenters.map(({ id, east, north, heightMeters }) => ({
  id,
  kind: "building",
  coordinates: square(east, north, 6),
  heightMeters,
  detailZoneId: ZONE_ID,
}));

export const MINI_MERGED_BLOCKS: GeometryFeature[] = [
  {
    id: "mblock_mini_1",
    kind: "merged_block",
    coordinates: square(-260, -260, 30),
    heightMeters: 15,
  },
  {
    id: "mblock_mini_2",
    kind: "merged_block",
    coordinates: square(260, 260, 30),
    heightMeters: 15,
  },
];

// ---------------------------------------------------------------------------
// Canal, park, road, rail
// ---------------------------------------------------------------------------

export const MINI_WATER: GeometryFeature = {
  id: "water_mini_canal",
  kind: "water",
  name: "Mini Canal",
  coordinates: [at(-300, -20), at(300, -20), at(300, 20), at(-300, 20)],
};

export const MINI_PARK: GeometryFeature = {
  id: "park_mini",
  kind: "park",
  name: "Mini Park",
  coordinates: [at(140, 180), at(210, 180), at(210, 250), at(140, 250)],
};

export const MINI_ROAD: GeometryFeature = {
  id: "road_mini_main",
  kind: "road",
  name: "Mini Avenue",
  isLine: true,
  widthMeters: 8,
  coordinates: [at(-300, 100), at(0, 100), at(300, 100)],
};

export const MINI_RAIL: GeometryFeature = {
  id: "rail_mini_line",
  kind: "rail",
  name: "Mini Line",
  isLine: true,
  widthMeters: 4,
  coordinates: [at(-300, -110), at(0, -110), at(300, -110)],
};

export const MINI_FEATURES: GeometryFeature[] = [
  ...MINI_BUILDINGS,
  ...MINI_MERGED_BLOCKS,
  MINI_WATER,
  MINI_PARK,
  MINI_ROAD,
  MINI_RAIL,
];

// ---------------------------------------------------------------------------
// Landmarks. `mini_stop` is deliberately not an endpoint of either route
// below, so tests can check that it is excluded from the label set.
// ---------------------------------------------------------------------------

export const MINI_LANDMARKS: Landmark[] = [
  {
    id: "mini_origin",
    name: "Mini Central",
    kind: "origin" as const,
    position: at(-250, -200),
    description: "The corridor's start.",
  },
  {
    id: "mini_venue",
    name: "Mini Arena",
    kind: "venue" as const,
    position: at(220, 180),
    description: "The trip's destination.",
  },
  {
    id: "mini_station",
    name: "Mini Station",
    kind: "station" as const,
    position: at(0, 50),
    description: "Tram platform in the detail zone.",
  },
  {
    id: "mini_stop",
    name: "Mini Local Stop",
    kind: "stop" as const,
    position: at(-50, -180),
    description: "A nearby stop, not used by either curated route.",
  },
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const walkPath: LngLat[] = [at(-250, -200), at(-125, -75), at(0, 50)];
const tramPath: LngLat[] = [at(0, 50), at(110, 115), at(220, 180)];
const directWalkPath: LngLat[] = [at(-250, -200), at(-15, -10), at(220, 180)];

const segMiniAWalk: RouteSegment = {
  id: "seg_mini_a_walk",
  mode: "walk",
  label: "Walk to Mini Station",
  fromLandmarkId: "mini_origin",
  toLandmarkId: "mini_station",
  path: walkPath,
  durationMin: 6,
  durationMax: 9,
  distanceMeters: pathLengthMeters(walkPath),
  fareMin: 0,
  fareMax: 0,
  reliability: "high",
  accessibility: "clear",
  rainExposure: "medium",
  hasStairs: false,
  covered: false,
  notes: [],
};

const segMiniATram: RouteSegment = {
  id: "seg_mini_a_tram",
  mode: "tram",
  label: "Tram to Mini Arena",
  fromLandmarkId: "mini_station",
  toLandmarkId: "mini_venue",
  path: tramPath,
  durationMin: 5,
  durationMax: 8,
  distanceMeters: pathLengthMeters(tramPath),
  fareMin: 1.2,
  fareMax: 1.2,
  reliability: "high",
  accessibility: "clear",
  rainExposure: "low",
  hasStairs: true,
  covered: true,
  lineName: "Tram 4",
  operator: "Mini Transit",
  notes: [],
};

const segMiniBWalk: RouteSegment = {
  id: "seg_mini_b_walk",
  mode: "walk",
  label: "Direct walk to Mini Arena",
  fromLandmarkId: "mini_origin",
  toLandmarkId: "mini_venue",
  path: directWalkPath,
  durationMin: 22,
  durationMax: 28,
  distanceMeters: pathLengthMeters(directWalkPath),
  fareMin: 0,
  fareMax: 0,
  reliability: "medium",
  accessibility: "caution",
  rainExposure: "high",
  hasStairs: false,
  covered: false,
  notes: ["Longer walk along the canal path."],
};

export const MINI_ROUTE_A: RouteOption = {
  id: "route_mini_a",
  name: "Tram via Mini Station",
  summary: "Walk then tram directly to the venue.",
  currency: "EUR",
  segments: [segMiniAWalk, segMiniATram],
  durationMin: 11,
  durationTypical: 14,
  durationMax: 17,
  fareMin: 1.2,
  fareMax: 1.2,
  transfers: 1,
  walkingMeters: segMiniAWalk.distanceMeters,
  reliability: "high",
  accessibility: "clear",
  confidence: 0.9,
  evidenceUpdatedAt: "2026-08-01T09:00:00+02:00",
  tradeoffs: ["One transfer, tram can be crowded at peak."],
};

export const MINI_ROUTE_B: RouteOption = {
  id: "route_mini_b",
  name: "Direct walk",
  summary: "Skip transit and walk the whole way.",
  currency: "EUR",
  segments: [segMiniBWalk],
  durationMin: 22,
  durationTypical: 25,
  durationMax: 28,
  fareMin: 0,
  fareMax: 0,
  transfers: 0,
  walkingMeters: segMiniBWalk.distanceMeters,
  reliability: "medium",
  accessibility: "caution",
  confidence: 0.75,
  evidenceUpdatedAt: "2026-08-01T09:00:00+02:00",
  tradeoffs: ["Long walk, no shelter from rain."],
};

export const MINI_ROUTES: RouteOption[] = [MINI_ROUTE_A, MINI_ROUTE_B];

// ---------------------------------------------------------------------------
// Full city pack
// ---------------------------------------------------------------------------

const squareCorners: LngLat[] = [at(-300, -300), at(300, -300), at(300, 300), at(-300, 300)];

export const miniCity: CityPack = {
  id: "mini-city",
  name: "Mini City",
  district: "Test District",
  timezone: "Europe/Amsterdam",
  currency: "EUR",
  locale: "en-NL",
  description: "A tiny synthetic city pack used only for route-scene tests and smoke checks.",
  attribution: ["© OpenStreetMap contributors, ODbL"],
  geometry: {
    center: MINI_CITY_CENTER,
    bounds: boundsOf(squareCorners),
    features: MINI_FEATURES,
    detailZones: [MINI_DETAIL_ZONE],
    source: {
      provider: "openstreetmap",
      attribution: "© OpenStreetMap contributors, ODbL",
      license: "ODbL-1.0",
      exportedAt: "2026-08-01",
      notes: ["Synthetic fixture, not a real export."],
    },
  },
  landmarks: MINI_LANDMARKS,
  routeOptions: MINI_ROUTES,
  reports: [
    {
      id: "report_mini_1",
      segmentId: "seg_mini_a_tram",
      category: "delay",
      text: "Tram running about five minutes late.",
      observedAt: "2026-08-01T08:50:00+02:00",
      expiresAt: "2026-08-01T09:30:00+02:00",
      confidence: "medium",
      landmarkId: "mini_station",
      source: "seed",
    },
  ],
  trips: [
    {
      id: "trip_mini",
      name: "Mini Central to Mini Arena",
      description: "A short synthetic trip used to exercise the route scene.",
      originId: "mini_origin",
      destinationId: "mini_venue",
      clockAt: "2026-08-01T08:45:00+02:00",
      departAt: "2026-08-01T08:50:00+02:00",
      arrivalDeadline: "2026-08-01T09:15:00+02:00",
      routeOptionIds: ["route_mini_a", "route_mini_b"],
    },
  ],
  defaultTripId: "trip_mini",
  snapshot: {
    curatedAt: "2026-08-01",
    sources: ["Synthetic fixture"],
    notes: ["Not real route data; for tests only."],
  },
};
