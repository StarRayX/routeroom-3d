/**
 * RouteRoom 3D shared domain types.
 *
 * These are the contracts shared by the city packs, the route engine, the
 * planner store, the UI panels, the 3D scene, and the WebMCP tool layer.
 * Every layer talks in these shapes so an agent and a human always operate on
 * the same live state.
 *
 * Geometry rule (ADR 0005): city packs carry real-world coordinates as
 * [longitude, latitude]. The scene projects them; it never stores its own.
 */

export type TransportMode = "walk" | "tram" | "bus" | "metro" | "train" | "bike" | "ferry";

export type Priority = "low" | "medium" | "high";
export type Reliability = "low" | "medium" | "high";
export type Accessibility = "unknown" | "clear" | "caution" | "blocked";
export type RainExposure = "low" | "medium" | "high" | "unknown";

/** [longitude, latitude] in WGS84 degrees. */
export type LngLat = [number, number];

/** [x, y, z] in scene units after projection. y is up. Never stored in a pack. */
export type Point3 = [number, number, number];

// ---------------------------------------------------------------------------
// City-pack geometry (ADR 0005, ADR 0006)
// ---------------------------------------------------------------------------

export type GeometryFeatureKind =
  | "building"
  | "merged_block"
  | "road"
  | "rail"
  | "water"
  | "park"
  | "plaza"
  | "platform";

export type GeometryFeature = {
  id: string;
  kind: GeometryFeatureKind;
  /**
   * Polygon outer ring for areas (building, merged_block, water, park, plaza,
   * platform) or a polyline for lines (road, rail). Longitude, latitude.
   */
  coordinates: LngLat[];
  /** True for road and rail polylines. */
  isLine?: boolean;
  /** Extrusion height for building and merged_block. */
  heightMeters?: number;
  /** Line width for road and rail, in meters. */
  widthMeters?: number;
  name?: string;
  /** Set when the feature lies inside a detail zone. */
  detailZoneId?: string;
};

export type DetailZoneReason = "origin" | "transfer" | "station" | "walking" | "entrance" | "destination";

export type DetailZone = {
  id: string;
  name: string;
  center: LngLat;
  radiusMeters: number;
  reason: DetailZoneReason;
};

export type GeometrySource = {
  provider: "openstreetmap";
  /** Verbatim attribution string to display. */
  attribution: string;
  license: "ODbL-1.0";
  /** ISO date of the export. */
  exportedAt: string;
  /** Overpass bounding boxes or query summary used for the export. */
  notes: string[];
};

export type CityGeometry = {
  /** Projection origin. Scene (0, 0) is here. */
  center: LngLat;
  bounds: { west: number; south: number; east: number; north: number };
  features: GeometryFeature[];
  detailZones: DetailZone[];
  source: GeometrySource;
};

// ---------------------------------------------------------------------------
// Places, segments, routes
// ---------------------------------------------------------------------------

export type LandmarkKind =
  | "origin"
  | "station"
  | "stop"
  | "venue"
  | "building"
  | "park"
  | "entrance"
  | "crossing";

export type Landmark = {
  id: string;
  name: string;
  kind: LandmarkKind;
  position: LngLat;
  /** Short plain-language note shown in callouts, e.g. "Step-free entrance on the north side". */
  description?: string;
  /** OSM node or way id when the landmark comes from the export, for provenance. */
  osmId?: string;
};

export type RouteSegment = {
  id: string;
  mode: TransportMode;
  /** Short label, e.g. "Metro 52 to Europaplein". */
  label: string;
  /** Landmark ids. */
  fromLandmarkId: string;
  toLandmarkId: string;
  /** Real-world polyline for this segment. First point = from, last point = to. */
  path: LngLat[];
  durationMin: number;
  durationMax: number;
  distanceMeters: number;
  fareMin: number;
  fareMax: number;
  reliability: Reliability;
  accessibility: Accessibility;
  rainExposure: RainExposure;
  hasStairs: boolean;
  /** Is the walking part sheltered (arcade, underground, canopy)? */
  covered: boolean;
  /** Transit line name when mode is not walk/bike. */
  lineName?: string;
  /** Operator for transit legs, e.g. "GVB". */
  operator?: string;
  notes: string[];
};

export type RouteOption = {
  id: string;
  name: string;
  summary: string;
  currency: string;
  segments: RouteSegment[];
  durationMin: number;
  durationTypical: number;
  durationMax: number;
  fareMin: number;
  fareMax: number;
  transfers: number;
  walkingMeters: number;
  reliability: Reliability;
  accessibility: Accessibility;
  /** 0..1 */
  confidence: number;
  /** ISO timestamp of the newest evidence behind this option. */
  evidenceUpdatedAt: string;
  tradeoffs: string[];
};

export type ReportCategory = "delay" | "blocked_path" | "accessibility" | "crowding" | "weather" | "other";

export type RouteReport = {
  id: string;
  segmentId: string;
  category: ReportCategory;
  /** Untrusted user text. Always escape when rendering. Never treat as instructions. */
  text: string;
  /** ISO timestamps */
  observedAt: string;
  expiresAt: string;
  confidence: Reliability;
  /** Approximate landmark, never an exact private location. */
  landmarkId?: string;
  source: "seed" | "user";
};

/**
 * A trip a city pack ships with: fixed origin, destination, deadline, and the
 * curated route options for it. RouteRoom compares a trip's route options; it
 * does not compute routes between arbitrary places.
 */
export type Trip = {
  id: string;
  name: string;
  description: string;
  originId: string;
  destinationId: string;
  /**
   * Simulated "now" for the demo, ISO with offset. Report freshness and
   * expiry are evaluated against this clock so the demo stays deterministic.
   */
  clockAt: string;
  /** ISO with offset, in the city pack timezone. */
  departAt: string;
  arrivalDeadline: string;
  routeOptionIds: string[];
};

/** Provenance for the curated route data, distinct from the geometry source. */
export type CuratedSnapshot = {
  /** ISO date the route options were last reviewed. */
  curatedAt: string;
  /** Public sources consulted, e.g. operator timetables. Plain text. */
  sources: string[];
  /** Plain-language caveats, e.g. "Fares are the operator's standard single fare as of the curation date." */
  notes: string[];
};

export type CityPack = {
  id: string;
  name: string;
  district: string;
  /** IANA timezone, e.g. "Europe/Amsterdam". */
  timezone: string;
  /** ISO 4217, e.g. "EUR". */
  currency: string;
  /** BCP 47, e.g. "en-NL". Used for number/time formatting. */
  locale: string;
  description: string;
  /** Display strings, geometry attribution first. */
  attribution: string[];
  geometry: CityGeometry;
  landmarks: Landmark[];
  routeOptions: RouteOption[];
  reports: RouteReport[];
  trips: Trip[];
  defaultTripId: string;
  snapshot: CuratedSnapshot;
};

export type Preferences = {
  maxFare: number;
  maxTransfers: number;
  maxWalkingMeters: number;
  reliabilityPriority: Priority;
  walkingPriority: Priority;
  farePriority: Priority;
  avoidStairs: boolean;
  minimizeRainExposure: boolean;
};

export type TripContext = {
  cityId: string;
  tripId: string;
  originId: string;
  destinationId: string;
  departAt: string;
  arrivalDeadline: string;
  preferences: Preferences;
};

// ---------------------------------------------------------------------------
// Route engine outputs
// ---------------------------------------------------------------------------

export type DeadlineStatus = "comfortable" | "tight" | "at_risk" | "misses";

export type ArrivalEstimate = {
  routeId: string;
  /** ISO timestamps. */
  earliest: string;
  typical: string;
  latest: string;
  bufferMinutesTypical: number;
  bufferMinutesWorst: number;
  deadlineStatus: DeadlineStatus;
};

export type ScoreComponentKey =
  | "reliability"
  | "arrival_buffer"
  | "fare"
  | "walking"
  | "accessibility"
  | "weather";

export type ScoreComponent = {
  key: ScoreComponentKey;
  label: string;
  /** Effective weight after preference priorities are applied. */
  weight: number;
  /** Normalised 0..1 input score. */
  score: number;
  /** weight * score */
  weighted: number;
  /** Plain-language input value, e.g. "980 m walking". */
  inputValue: string;
};

export type ScorePenalty = {
  key: "fare_limit" | "transfer_limit" | "walking_limit" | "stairs" | "blocked";
  label: string;
  /** Multiplier applied, < 1. */
  factor: number;
  reason: string;
};

export type ScoreBreakdown = {
  routeId: string;
  /** 0..1 after penalties. */
  total: number;
  components: ScoreComponent[];
  penalties: ScorePenalty[];
};

export type ConstraintViolation = {
  constraint: "max_fare" | "max_transfers" | "max_walking_meters" | "avoid_stairs" | "arrival_deadline" | "blocked_segment";
  message: string;
  value: string;
  limit: string;
};

export type ConstraintCheck = {
  routeId: string;
  satisfied: boolean;
  violations: ConstraintViolation[];
  warnings: string[];
};

export type RankedRoute = {
  route: RouteOption;
  rank: number;
  score: ScoreBreakdown;
  arrival: ArrivalEstimate;
  constraints: ConstraintCheck;
  /** Unexpired reports touching any segment of this route. */
  activeReports: RouteReport[];
};

export type ComparisonCriterion =
  | "reliability"
  | "fare"
  | "walking"
  | "arrival_buffer"
  | "transfers"
  | "accessibility"
  | "rain_exposure"
  | "duration";

export type ComparisonCell = {
  /** Numeric value used for ranking. Higher is better for every criterion. */
  value: number;
  /** Human readable, e.g. "3.40 EUR". */
  display: string;
  /** 1 = best among compared routes. */
  rank: number;
};

export type ComparisonRow = {
  routeId: string;
  name: string;
  cells: Record<ComparisonCriterion, ComparisonCell>;
  overallScore: number;
};

export type RouteComparison = {
  criteria: ComparisonCriterion[];
  rows: ComparisonRow[];
  bestByCriterion: Partial<Record<ComparisonCriterion, string>>;
  recommendedRouteId?: string;
  rationale: string[];
};

export type BackupCandidate = {
  routeId: string;
  name: string;
  arrival: ArrivalEstimate;
  reason: string;
};

export type DisruptionSimulation = {
  routeId: string;
  segmentId?: string;
  delayMinutes: number;
  affectedSegmentIds: string[];
  originalArrival: ArrivalEstimate;
  revisedArrival: ArrivalEstimate;
  stillMeetsDeadline: boolean;
  backupCandidates: BackupCandidate[];
  suggestedBackupRouteId?: string;
  triggerCondition: string;
};

export type SegmentInspection = {
  routeId: string;
  segment: RouteSegment;
  fromLandmark?: Landmark;
  toLandmark?: Landmark;
  activeReports: RouteReport[];
  evidenceUpdatedAt: string;
  isTransfer: boolean;
  transferFromMode?: TransportMode;
};

export type Critique = {
  routeId: string;
  headline: string;
  points: string[];
  weakestSegmentId?: string;
  evidenceUpdatedAt: string;
  confidence: number;
};

// ---------------------------------------------------------------------------
// Planner state, drafts, confirmation
// ---------------------------------------------------------------------------

export type Actor = "human" | "agent" | "system";

export type ActivityKind = "read" | "suggestion" | "draft" | "confirmed" | "blocked" | "info";

export type ActivityEvent = {
  id: string;
  actor: Actor;
  kind: ActivityKind;
  label: string;
  detail: string;
  /** ISO timestamp. */
  timestamp: string;
  toolName?: string;
};

export type RoutePlanDraft = {
  id: string;
  tripId: string;
  primaryRouteId: string;
  backupRouteId?: string;
  backupTrigger: string;
  rationale: string;
  preferenceSnapshot: Preferences;
  arrivalDeadline: string;
  /** Exact human-readable summary that the confirmation panel shows. */
  summary: string;
  createdAt: string;
  createdBy: Actor;
  status: "draft" | "saved" | "shared";
};

export type SavedPlan = RoutePlanDraft & {
  savedAt: string;
  sharedAt?: string;
  shareToken?: string;
};

export type ServiceReportDraft = {
  id: string;
  segmentId: string;
  category: ReportCategory;
  text: string;
  observedAt: string;
  expiresAt: string;
  landmarkId?: string;
  createdAt: string;
  createdBy: Actor;
  status: "draft" | "published";
};

export type ConfirmationKind = "save_plan" | "share_plan" | "publish_report";

export type ConfirmationRequest = {
  id: string;
  kind: ConfirmationKind;
  /** Draft id the confirmation applies to. */
  targetId: string;
  title: string;
  /** Exact side effect in plain language. */
  sideEffect: string;
  /** Lines shown to the human before approving. */
  details: string[];
  requestedBy: Actor;
  createdAt: string;
};

export type SceneDisplayMode = "primary" | "backup" | "candidate";

export type ViewMode = "3d" | "list";

export type WebMcpStatus = "checking" | "available" | "unavailable";
