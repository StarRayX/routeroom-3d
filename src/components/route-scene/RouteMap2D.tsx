"use client";

import { useMemo } from "react";
import { createProjector, type Projector } from "@/lib/geo";
import type {
  GeometryFeature,
  Landmark,
  LandmarkKind,
  LngLat,
  RouteOption,
  RouteSegment,
  SceneDisplayMode,
  TransportMode,
} from "@/lib/types";
import type { RouteSceneProps } from "./types";
import { CANDIDATE_DIMMED_OPACITY, CANDIDATE_OPACITY, PALETTE, landmarkAccent } from "./palette";

/**
 * Top-down SVG fallback for the 3D route scene: used when the Mapbox map is
 * unavailable (no token, invalid token, or no WebGL), and as the explicit
 * "list" view. Pure SVG, no map library dependency.
 */

type ScenePoint2 = { x: number; z: number };

/** Project a polygon ring or polyline (lng/lat) onto the flat x/z plane. */
function projectRing(projector: Projector, coordinates: LngLat[]): ScenePoint2[] {
  return coordinates.map((point) => {
    const [x, , z] = projector.toScene(point);
    return { x, z };
  });
}

type CorridorBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
};

/** Bounds of every route's projected segment path, used to frame the map view on the corridor. */
function computeCorridorBounds(projector: Projector, routes: RouteOption[]): CorridorBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const route of routes) {
    for (const segment of route.segments) {
      for (const point of segment.path) {
        const [x, , z] = projector.toScene(point);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }
  }
  if (!Number.isFinite(minX)) {
    minX = maxX = minZ = maxZ = 0;
  }
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

const LABELED_LANDMARK_KINDS: ReadonlySet<LandmarkKind> = new Set(["origin", "venue", "entrance", "station", "stop"]);

/**
 * Landmarks that should carry a label: an origin/venue/entrance/station/stop
 * that is an endpoint of some segment on a visible route, plus whichever
 * landmark is the current camera target.
 */
function computeLabeledLandmarkIds(landmarks: Landmark[], visibleRoutes: RouteOption[], cameraTarget?: string): Set<string> {
  const routeLandmarkIds = new Set<string>();
  for (const route of visibleRoutes) {
    for (const segment of route.segments) {
      routeLandmarkIds.add(segment.fromLandmarkId);
      routeLandmarkIds.add(segment.toLandmarkId);
    }
  }
  const labeled = new Set<string>();
  for (const landmark of landmarks) {
    if (LABELED_LANDMARK_KINDS.has(landmark.kind) && routeLandmarkIds.has(landmark.id)) {
      labeled.add(landmark.id);
    }
  }
  if (cameraTarget) labeled.add(cameraTarget);
  return labeled;
}

function ringAttr(ring: ScenePoint2[]): string {
  return ring.map((point) => `${point.x.toFixed(3)},${point.z.toFixed(3)}`).join(" ");
}

function pathAttr(projector: Projector, path: LngLat[]): string {
  return ringAttr(projectRing(projector, path));
}

function findSegment(
  routes: RouteOption[],
  segmentId: string,
): { route: RouteOption; segment: RouteSegment } | undefined {
  for (const route of routes) {
    const segment = route.segments.find((candidate) => candidate.id === segmentId);
    if (segment) return { route, segment };
  }
  return undefined;
}

function polylineMidpoint2D(points: ScenePoint2[]): ScenePoint2 {
  if (points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return points[0];
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    cumulative.push(total);
  }
  const half = total / 2;
  for (let i = 1; i < cumulative.length; i += 1) {
    if (cumulative[i] >= half) {
      const segStart = cumulative[i - 1];
      const segEnd = cumulative[i];
      const t = segEnd === segStart ? 0 : (half - segStart) / (segEnd - segStart);
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        z: points[i - 1].z + (points[i].z - points[i - 1].z) * t,
      };
    }
  }
  return points[points.length - 1];
}

function segmentStyle2D(mode: SceneDisplayMode, transportMode: TransportMode, dimmed: boolean) {
  const base =
    mode === "primary"
      ? { color: PALETTE.routeAccent, width: 0.16, opacity: 1 }
      : mode === "backup"
        ? { color: PALETTE.routeBackup, width: 0.11, opacity: 0.9 }
        : {
            color: PALETTE.routeCandidate,
            width: 0.07,
            opacity: dimmed ? CANDIDATE_DIMMED_OPACITY : CANDIDATE_OPACITY,
          };
  const isWalking = transportMode === "walk";
  const dashed = mode !== "primary" || isWalking;
  return {
    ...base,
    dashArray: dashed ? (isWalking ? "0.05 0.07" : "0.22 0.12") : undefined,
  };
}

/** ISO date string formatted as YYYY-MM-DD. */
function formatExportDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 10);
}

function FeatureShape({ projector, feature }: { projector: Projector; feature: GeometryFeature }) {
  if (feature.coordinates.length < 3 && (feature.kind === "building" || feature.kind === "merged_block")) return null;
  const ring = projectRing(projector, feature.coordinates);

  switch (feature.kind) {
    case "building":
      return <polygon points={ringAttr(ring)} fill={PALETTE.buildingWall} stroke={PALETTE.buildingRoof} strokeWidth={0.02} />;
    case "merged_block":
      return (
        <polygon points={ringAttr(ring)} fill={PALETTE.mergedBlockWall} stroke={PALETTE.mergedBlockRoof} strokeWidth={0.02} />
      );
    case "water":
      return <polygon points={ringAttr(ring)} fill={PALETTE.water} opacity={0.92} />;
    case "park":
      return <polygon points={ringAttr(ring)} fill={PALETTE.park} />;
    case "plaza":
      return <polygon points={ringAttr(ring)} fill={PALETTE.plaza} />;
    case "platform":
      return <polygon points={ringAttr(ring)} fill={PALETTE.plaza} />;
    case "road":
      return (
        <polyline
          points={ringAttr(ring)}
          fill="none"
          stroke={PALETTE.road}
          strokeWidth={(feature.widthMeters ?? 8) / projector.metersPerUnit}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "rail":
      return (
        <polyline
          points={ringAttr(ring)}
          fill="none"
          stroke={PALETTE.rail}
          strokeWidth={(feature.widthMeters ?? 4) / projector.metersPerUnit}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0.12 0.08"
        />
      );
    default:
      return null;
  }
}

function LandmarkDot({
  projector,
  landmark,
  labeled,
  onSelect,
}: {
  projector: Projector;
  landmark: Landmark;
  labeled: boolean;
  onSelect?: (id: string) => void;
}) {
  const [x, , z] = projector.toScene(landmark.position);
  const accent = landmarkAccent(landmark.kind);
  return (
    <g onClick={() => onSelect?.(landmark.id)} style={{ cursor: onSelect ? "pointer" : "default" }}>
      <circle cx={x} cy={z} r={0.16} fill={accent} stroke="#fffaf0" strokeWidth={0.03} />
      {labeled && (
        <text x={x + 0.24} y={z + 0.08} fontSize={0.3} className="rs-map2d-label">
          {landmark.name}
        </text>
      )}
    </g>
  );
}

function RoutePath({
  projector,
  route,
  mode,
  dimmed,
  onSelectRoute,
  onSelectSegment,
}: {
  projector: Projector;
  route: RouteOption;
  mode: SceneDisplayMode;
  dimmed: boolean;
  onSelectRoute: (routeId: string) => void;
  onSelectSegment?: (routeId: string, segmentId: string) => void;
}) {
  return (
    <g>
      {route.segments.map((segment) => {
        const style = segmentStyle2D(mode, segment.mode, dimmed);
        return (
          <polyline
            key={segment.id}
            points={pathAttr(projector, segment.path)}
            fill="none"
            stroke={style.color}
            strokeWidth={style.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={style.opacity}
            strokeDasharray={style.dashArray}
            onClick={() => (onSelectSegment ? onSelectSegment(route.id, segment.id) : onSelectRoute(route.id))}
            style={{ cursor: "pointer" }}
          />
        );
      })}
    </g>
  );
}

export function RouteMap2D(props: RouteSceneProps) {
  const {
    city,
    routes,
    visibleRouteIds,
    displayModes,
    focusedSegmentId,
    cameraTarget,
    activeReports,
    onSelectRoute,
    onSelectSegment,
    onSelectLandmark,
  } = props;

  const projector = useMemo(() => createProjector(city.geometry.center), [city]);
  const corridorBounds = useMemo(() => computeCorridorBounds(projector, routes), [projector, routes]);
  const viewBox = useMemo(() => {
    const marginX = Math.max(corridorBounds.width * 0.15, 2);
    const marginZ = Math.max(corridorBounds.depth * 0.15, 2);
    const minX = corridorBounds.minX - marginX;
    const minZ = corridorBounds.minZ - marginZ;
    const width = Math.max(corridorBounds.width + marginX * 2, 4);
    const depth = Math.max(corridorBounds.depth + marginZ * 2, 4);
    return { minX, minZ, width, depth };
  }, [corridorBounds]);

  const visibleRoutes = useMemo(
    () => routes.filter((route) => visibleRouteIds.includes(route.id)),
    [routes, visibleRouteIds],
  );
  const labeledLandmarkIds = useMemo(
    () => computeLabeledLandmarkIds(city.landmarks, visibleRoutes, cameraTarget),
    [city.landmarks, visibleRoutes, cameraTarget],
  );

  const focused = focusedSegmentId ? findSegment(routes, focusedSegmentId) : undefined;
  const anyFocus = Boolean(focusedSegmentId);

  const attribution = city.geometry.source.attribution;
  const exportedDate = formatExportDate(city.geometry.source.exportedAt);

  return (
    <div className="rs-map2d" aria-label={`${city.name} route map`}>
      <div className="rs-map2d-svg-wrap">
        <svg
          viewBox={`${viewBox.minX} ${viewBox.minZ} ${viewBox.width} ${viewBox.depth}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${city.name}, ${city.district} top-down route map`}
        >
          <defs>
            <marker id="rs-compass-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={PALETTE.landmarkInk} />
            </marker>
          </defs>

          <rect x={viewBox.minX} y={viewBox.minZ} width={viewBox.width} height={viewBox.depth} fill={PALETTE.ground} />

          {city.geometry.features.map((feature) => (
            <FeatureShape key={feature.id} projector={projector} feature={feature} />
          ))}

          {visibleRoutes.map((route) => {
            const mode = displayModes[route.id] ?? "candidate";
            const dimmed = anyFocus && mode === "candidate";
            return (
              <RoutePath
                key={route.id}
                projector={projector}
                route={route}
                mode={mode}
                dimmed={dimmed}
                onSelectRoute={onSelectRoute}
                onSelectSegment={onSelectSegment}
              />
            );
          })}

          {focused && (
            <polyline
              points={pathAttr(projector, focused.segment.path)}
              fill="none"
              stroke={PALETTE.focusHalo}
              strokeWidth={0.26}
              strokeOpacity={0.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {city.landmarks.map((landmark) => (
            <LandmarkDot
              key={landmark.id}
              projector={projector}
              landmark={landmark}
              labeled={labeledLandmarkIds.has(landmark.id)}
              onSelect={onSelectLandmark}
            />
          ))}

          {activeReports.map((report) => {
            const found = findSegment(routes, report.segmentId);
            if (!found) return null;
            const points = projectRing(projector, found.segment.path);
            const mid = polylineMidpoint2D(points);
            return (
              <g
                key={report.id}
                onClick={() => onSelectSegment?.(found.route.id, found.segment.id)}
                style={{ cursor: onSelectSegment ? "pointer" : "default" }}
              >
                <circle cx={mid.x} cy={mid.z} r={0.15} fill={PALETTE.hazardAmber} stroke="#fffaf0" strokeWidth={0.03} />
                <text x={mid.x} y={mid.z - 0.24} textAnchor="middle" fontSize={0.24} className="rs-map2d-label">
                  {report.category.replace(/_/g, " ")}
                </text>
                <title>{report.text}</title>
              </g>
            );
          })}

          <g transform={`translate(${viewBox.minX + viewBox.width * 0.06},${viewBox.minZ + viewBox.depth * 0.08})`}>
            <circle r={viewBox.width * 0.025} fill="oklch(97% 0.015 88 / 0.85)" stroke={PALETTE.landmarkInk} strokeWidth={viewBox.width * 0.0018} />
            <line
              x1={0}
              y1={viewBox.width * 0.016}
              x2={0}
              y2={-viewBox.width * 0.016}
              stroke={PALETTE.landmarkInk}
              strokeWidth={viewBox.width * 0.0025}
              markerEnd="url(#rs-compass-arrow)"
            />
            <text x={0} y={-viewBox.width * 0.02} textAnchor="middle" fontSize={viewBox.width * 0.013} className="rs-compass">
              N
            </text>
          </g>
        </svg>
      </div>

      <div className="rs-map2d-routes">
        {routes.map((route) => {
          const isPrimary = displayModes[route.id] === "primary";
          const isBackup = displayModes[route.id] === "backup";
          const swatchColor = isPrimary ? PALETTE.routeAccent : isBackup ? PALETTE.routeBackup : PALETTE.routeCandidate;
          return (
            <button
              key={route.id}
              type="button"
              className={`rs-map2d-route-btn${isPrimary ? " is-primary" : ""}`}
              onClick={() => onSelectRoute(route.id)}
            >
              <span className="rs-map2d-swatch" style={{ backgroundColor: swatchColor }} />
              {route.name}
            </button>
          );
        })}
      </div>

      <div className="rs-attribution">
        {attribution}. Exported {exportedDate}.
      </div>
    </div>
  );
}
