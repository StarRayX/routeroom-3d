"use client";

import { useMemo } from "react";
import type { Landmark, Point3, RouteOption, RouteSegment, SceneDisplayMode, SceneFeature } from "@/lib/types";
import type { RouteSceneProps } from "./types";
import { PALETTE, landmarkAccent } from "./palette";

/**
 * Top-down SVG fallback for the 3D route scene. Used when WebGL is
 * unavailable, and for low-power devices or a user preference toward a
 * simpler view. Pure SVG, no three.js.
 *
 * Coordinate mapping: scene x -> svg x, scene z -> svg y. The viewBox covers
 * x in [-7, 7] and svg-y in [-6, 6], matching the district's scene scale.
 */

function toSvg(point: Point3): [number, number] {
  return [point[0], point[2]];
}

function polylineAttr(points: Point3[]): string {
  return points
    .map((point) => {
      const [x, y] = toSvg(point);
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    })
    .join(" ");
}

function polylineMidpoint(points: Point3[]): Point3 {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1) return points[0];
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1, z1] = points[i - 1];
    const [x2, y2, z2] = points[i];
    total += Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    cumulative.push(total);
  }
  const half = total / 2;
  for (let i = 1; i < cumulative.length; i += 1) {
    if (cumulative[i] >= half) {
      const segStart = cumulative[i - 1];
      const segEnd = cumulative[i];
      const t = segEnd === segStart ? 0 : (half - segStart) / (segEnd - segStart);
      const [x1, y1, z1] = points[i - 1];
      const [x2, y2, z2] = points[i];
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, z1 + (z2 - z1) * t];
    }
  }
  return points[points.length - 1];
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

function modeStyle2D(mode: SceneDisplayMode) {
  if (mode === "primary") return { color: PALETTE.primaryRoute, width: 0.16, opacity: 1 };
  if (mode === "backup") return { color: PALETTE.backupRoute, width: 0.11, opacity: 0.72 };
  return { color: PALETTE.candidateRoute, width: 0.06, opacity: 0.3 };
}

function FeatureShape({ feature }: { feature: SceneFeature }) {
  const [sx, sy] = toSvg(feature.position);
  const [w, , d] = feature.size;
  const rotation = feature.rotationY ? (feature.rotationY * 180) / Math.PI : 0;

  switch (feature.kind) {
    case "building":
      return (
        <rect
          x={sx - w / 2}
          y={sy - d / 2}
          width={w}
          height={d}
          rx={0.08}
          fill={PALETTE.buildingDefault}
          stroke={PALETTE.roofDefault}
          strokeWidth={0.03}
          filter="url(#rs-drop-shadow)"
          transform={rotation ? `rotate(${rotation} ${sx} ${sy})` : undefined}
        />
      );
    case "water":
      return (
        <rect
          x={sx - w / 2}
          y={sy - d / 2}
          width={w}
          height={d}
          rx={0.15}
          fill={PALETTE.water}
          opacity={0.92}
        />
      );
    case "park":
      return (
        <rect x={sx - w / 2} y={sy - d / 2} width={w} height={d} rx={0.12} fill={PALETTE.park} />
      );
    case "road": {
      const horizontal = w >= d;
      return (
        <g>
          <rect x={sx - w / 2} y={sy - d / 2} width={w} height={d} fill={PALETTE.road} />
          {horizontal ? (
            <line
              x1={sx - w * 0.43}
              y1={sy}
              x2={sx + w * 0.43}
              y2={sy}
              stroke={PALETTE.roadLine}
              strokeWidth={0.025}
              strokeDasharray="0.12 0.08"
            />
          ) : (
            <line
              x1={sx}
              y1={sy - d * 0.43}
              x2={sx}
              y2={sy + d * 0.43}
              stroke={PALETTE.roadLine}
              strokeWidth={0.025}
              strokeDasharray="0.12 0.08"
            />
          )}
        </g>
      );
    }
    case "plaza":
      return (
        <rect x={sx - w / 2} y={sy - d / 2} width={w} height={d} rx={0.06} fill={PALETTE.plaza} />
      );
    default:
      return null;
  }
}

function LandmarkDot({ landmark, onSelect }: { landmark: Landmark; onSelect?: (id: string) => void }) {
  const [sx, sy] = toSvg(landmark.position);
  const accent = landmarkAccent(landmark.kind);
  const showLabel = landmark.kind === "origin" || landmark.kind === "station" || landmark.kind === "entrance";
  const placeLabelLeft = sx > 3.5;
  return (
    <g onClick={() => onSelect?.(landmark.id)} style={{ cursor: onSelect ? "pointer" : "default" }}>
      <circle cx={sx} cy={sy} r={0.16} fill={accent} stroke="#fffaf0" strokeWidth={0.03} />
      {showLabel && (
        <text x={sx + (placeLabelLeft ? -0.24 : 0.24)} y={sy + 0.08} textAnchor={placeLabelLeft ? "end" : "start"} fontSize={0.3} className="rs-map2d-label">
          {landmark.name}
        </text>
      )}
    </g>
  );
}

function RoutePath({
  route,
  mode,
  dimmed,
  onSelectRoute,
  onSelectSegment,
}: {
  route: RouteOption;
  mode: SceneDisplayMode;
  dimmed: boolean;
  onSelectRoute: (routeId: string) => void;
  onSelectSegment?: (routeId: string, segmentId: string) => void;
}) {
  const style = modeStyle2D(mode);
  const opacity = dimmed ? Math.min(style.opacity, 0.15) : style.opacity;

  if (mode === "primary" || mode === "backup") {
    return (
      <g>
        {route.segments.map((segment) => (
          <polyline
            key={segment.id}
            points={polylineAttr(segment.points)}
            fill="none"
            stroke={style.color}
            strokeWidth={style.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={opacity}
            strokeDasharray={mode === "backup" ? "0.22 0.12" : undefined}
            onClick={() => (onSelectSegment ? onSelectSegment(route.id, segment.id) : onSelectRoute(route.id))}
            style={{ cursor: "pointer" }}
          />
        ))}
      </g>
    );
  }

  const points = route.segments.flatMap((segment) => segment.points);
  return (
    <polyline
      points={polylineAttr(points)}
      fill="none"
      stroke={style.color}
      strokeWidth={style.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={opacity}
      onClick={() => onSelectRoute(route.id)}
      style={{ cursor: "pointer" }}
    />
  );
}

export function RouteMap2D(props: RouteSceneProps) {
  const {
    city,
    routes,
    visibleRouteIds,
    displayModes,
    focusedSegmentId,
    activeReports,
    onSelectRoute,
    onSelectSegment,
    onSelectLandmark,
  } = props;

  const visibleRoutes = useMemo(
    () => routes.filter((route) => visibleRouteIds.includes(route.id)),
    [routes, visibleRouteIds],
  );
  const focused = focusedSegmentId ? findSegment(routes, focusedSegmentId) : undefined;
  const anyFocus = Boolean(focusedSegmentId);

  return (
    <div className="rs-map2d" aria-label={`${city.name} route map`}>
      <div className="rs-map2d-svg-wrap">
        <svg
          viewBox="-7 -6 14 12"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${city.name}, ${city.district} top-down route map`}
        >
          <defs>
            <filter id="rs-drop-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0.05" dy="0.08" stdDeviation="0.05" floodColor="#00000035" />
            </filter>
            <marker id="rs-compass-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#3f5148" />
            </marker>
          </defs>

          <rect x={-7} y={-6} width={14} height={12} fill={PALETTE.ground} />
          <rect x={-6.75} y={-5.75} width={13.5} height={11.5} fill={PALETTE.groundEdge} opacity={0.5} />

          {city.sceneFeatures.map((feature) => (
            <FeatureShape key={feature.id} feature={feature} />
          ))}

          {visibleRoutes.map((route) => {
            const mode = displayModes[route.id] ?? "candidate";
            const dimmed = anyFocus && mode === "candidate";
            return (
              <RoutePath
                key={route.id}
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
              points={polylineAttr(focused.segment.points)}
              fill="none"
              stroke={PALETTE.focusHalo}
              strokeWidth={0.26}
              strokeOpacity={0.55}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {city.landmarks.map((landmark) => (
            <LandmarkDot key={landmark.id} landmark={landmark} onSelect={onSelectLandmark} />
          ))}

          {activeReports.map((report) => {
            const found = findSegment(routes, report.segmentId);
            if (!found) return null;
            const [sx, sy] = toSvg(polylineMidpoint(found.segment.points));
            return (
              <g
                key={report.id}
                onClick={() => onSelectSegment?.(found.route.id, found.segment.id)}
                style={{ cursor: onSelectSegment ? "pointer" : "default" }}
              >
                <circle cx={sx} cy={sy} r={0.15} fill={PALETTE.reportMarker} stroke="#fffaf0" strokeWidth={0.03} />
                <title>{report.text}</title>
              </g>
            );
          })}

          <g transform="translate(-6.3,-5.1)">
            <circle r={0.5} fill="oklch(97% 0.015 88 / 0.85)" stroke="#3f5148" strokeWidth={0.035} />
            <line x1={0} y1={0.32} x2={0} y2={-0.32} stroke="#3f5148" strokeWidth={0.05} markerEnd="url(#rs-compass-arrow)" />
            <text x={0} y={-0.4} textAnchor="middle" fontSize={0.26} className="rs-compass">
              N
            </text>
          </g>
        </svg>
      </div>

      <div className="rs-map2d-routes">
        {routes.map((route) => {
          const isPrimary = displayModes[route.id] === "primary";
          const isBackup = displayModes[route.id] === "backup";
          return (
            <button
              key={route.id}
              type="button"
              className={`rs-map2d-route-btn${isPrimary ? " is-primary" : ""}${isBackup ? " is-backup" : ""}`}
              onClick={() => onSelectRoute(route.id)}
            >
              <span className="rs-map2d-swatch" style={{ backgroundColor: isPrimary ? PALETTE.primaryRoute : isBackup ? PALETTE.backupRoute : PALETTE.candidateRoute }} />
              {route.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
