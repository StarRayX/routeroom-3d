"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { CatmullRomCurve3, MathUtils, Vector3 } from "three";
import type { Line2, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type {
  CityPack,
  Landmark,
  Point3,
  RouteOption,
  RouteSegment,
  SceneDisplayMode,
  SceneFeature,
} from "@/lib/types";
import type { RouteSceneProps } from "./types";
import { PALETTE, landmarkAccent } from "./palette";

export type SceneContentProps = RouteSceneProps & {
  /** Incrementing this value snaps the camera back to the default overview. */
  resetSignal: number;
};

const DEFAULT_TARGET_TUPLE: Point3 = [0, 0, 0];
const DEFAULT_CAMERA_POSITION: Point3 = [10.5, 11.5, 13];
const DEFAULT_DISTANCE = Math.hypot(...DEFAULT_CAMERA_POSITION);
const FOCUSED_DISTANCE = 11;
const GROUND_SIZE: [number, number] = [17, 14];

type ThreeMesh = import("three").Mesh;
type ThreeGroup = import("three").Group;

// ---------------------------------------------------------------------------
// Small deterministic helpers (kept local so this file has no side imports).
// ---------------------------------------------------------------------------

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointsClose(a: Point3, b: Point3): boolean {
  return Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4 && Math.abs(a[2] - b[2]) < 1e-4;
}

function concatSegmentPoints(segments: RouteSegment[]): Point3[] {
  const points: Point3[] = [];
  for (const segment of segments) {
    for (const point of segment.points) {
      const last = points[points.length - 1];
      if (last && pointsClose(last, point)) continue;
      points.push(point);
    }
  }
  return points;
}

function liftPoints(points: Point3[], liftY: number): Point3[] {
  return points.map(([x, y, z]) => [x, y + liftY, z] as Point3);
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

// ---------------------------------------------------------------------------
// Ground features
// ---------------------------------------------------------------------------

function Building({ feature }: { feature: SceneFeature }) {
  const [width, height, depth] = feature.size;
  const [x, , z] = feature.position;
  const rotationY = feature.rotationY ?? 0;
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={PALETTE.buildingDefault} roughness={0.94} flatShading />
      </mesh>
      {feature.roofColor && (
        <mesh position={[0, height + 0.07, 0]} castShadow>
          <boxGeometry args={[width * 0.92, 0.14, depth * 0.92]} />
          <meshStandardMaterial color={PALETTE.roofDefault} roughness={0.9} flatShading />
        </mesh>
      )}
    </group>
  );
}

function Park({ feature }: { feature: SceneFeature }) {
  const [width, , depth] = feature.size;
  const trees = useMemo(() => {
    const rand = mulberry32(hashSeed(feature.id));
    const count = 3 + Math.floor(rand() * 3);
    return Array.from({ length: count }, (_, i) => ({
      key: `${feature.id}-tree-${i}`,
      x: (rand() - 0.5) * width * 0.7,
      z: (rand() - 0.5) * depth * 0.7,
      scale: 0.75 + rand() * 0.5,
    }));
  }, [feature.id, width, depth]);

  return (
    <group position={feature.position} rotation={[0, feature.rotationY ?? 0, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={feature.size} />
        <meshStandardMaterial color={feature.color || PALETTE.park} roughness={1} />
      </mesh>
      {trees.map((tree) => (
        <group key={tree.key} position={[tree.x, feature.size[1] / 2, tree.z]} scale={tree.scale}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.05, 0.28, 5]} />
            <meshStandardMaterial color={PALETTE.parkTrunk} roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 0.42, 0]} castShadow>
            <coneGeometry args={[0.22, 0.5, 6]} />
            <meshStandardMaterial color={PALETTE.parkFoliage} roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Water({ feature, reducedMotion }: { feature: SceneFeature; reducedMotion: boolean }) {
  const ref = useRef<ThreeMesh>(null);
  const baseY = feature.position[1];
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    ref.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.6 + feature.position[0]) * 0.02;
  });
  return (
    <mesh ref={ref} position={feature.position} rotation={[0, feature.rotationY ?? 0, 0]} receiveShadow>
      <boxGeometry args={feature.size} />
      <meshStandardMaterial color={feature.color || PALETTE.water} roughness={0.25} metalness={0.15} />
    </mesh>
  );
}

function Road({ feature }: { feature: SceneFeature }) {
  const [width, height, depth] = feature.size;
  const horizontal = width >= depth;
  return (
    <group position={feature.position} rotation={[0, feature.rotationY ?? 0, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={feature.color || PALETTE.road} roughness={1} />
      </mesh>
      <mesh position={[0, height / 2 + 0.006, 0]}>
        <boxGeometry
          args={
            horizontal
              ? [width * 0.86, 0.012, Math.min(depth * 0.16, 0.05)]
              : [Math.min(width * 0.16, 0.05), 0.012, depth * 0.86]
          }
        />
        <meshStandardMaterial color={PALETTE.roadLine} roughness={1} />
      </mesh>
    </group>
  );
}

function Slab({ feature, color }: { feature: SceneFeature; color: string }) {
  return (
    <mesh position={feature.position} rotation={[0, feature.rotationY ?? 0, 0]} receiveShadow>
      <boxGeometry args={feature.size} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function FeatureMesh({ feature, reducedMotion }: { feature: SceneFeature; reducedMotion: boolean }) {
  switch (feature.kind) {
    case "building":
      return <Building feature={feature} />;
    case "park":
      return <Park feature={feature} />;
    case "water":
      return <Water feature={feature} reducedMotion={reducedMotion} />;
    case "road":
      return <Road feature={feature} />;
    case "plaza":
      return <Slab feature={feature} color={feature.color || PALETTE.plaza} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

function LandmarkMarker({
  landmark,
  onSelect,
}: {
  landmark: Landmark;
  onSelect?: (id: string) => void;
}) {
  const accent = landmarkAccent(landmark.kind);
  const showLabel = landmark.kind === "origin" || landmark.kind === "station" || landmark.kind === "entrance";
  return (
    <group
      position={landmark.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(landmark.id);
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.16, 0.23, 20]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.1, 0.34, 6]} />
        <meshStandardMaterial color={accent} roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0, 0.44, 0]} castShadow>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color={accent} roughness={0.6} flatShading emissive={accent} emissiveIntensity={0.15} />
      </mesh>
      {showLabel && (
        <Html position={[0, 0.72, 0]} center distanceFactor={10} pointerEvents="none">
          <span className="rs-label">
            <span className="rs-label-dot" style={{ backgroundColor: accent }} />
            {landmark.name}
          </span>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

function modeStyle(mode: SceneDisplayMode) {
  if (mode === "primary") return { color: PALETTE.primaryRoute, lineWidth: 6, opacity: 1 };
  if (mode === "backup") return { color: PALETTE.backupRoute, lineWidth: 4, opacity: 0.72 };
  return { color: PALETTE.candidateRoute, lineWidth: 2.5, opacity: 0.3 };
}

function RouteRibbon({
  route,
  mode,
  liftY,
  dimmed,
  onSelectRoute,
}: {
  route: RouteOption;
  mode: SceneDisplayMode;
  liftY: number;
  dimmed: boolean;
  onSelectRoute: (id: string) => void;
}) {
  const points = useMemo(
    () => liftPoints(concatSegmentPoints(route.segments), liftY),
    [route.segments, liftY],
  );
  const style = modeStyle(mode);
  const opacity = dimmed ? Math.min(style.opacity, 0.15) : style.opacity;
  const isBackup = mode === "backup";

  return (
    <Line
      points={points}
      color={style.color}
      lineWidth={style.lineWidth}
      transparent
      opacity={opacity}
      dashed={isBackup}
      dashSize={isBackup ? 0.25 : undefined}
      gapSize={isBackup ? 0.12 : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSelectRoute(route.id);
      }}
    />
  );
}

function AnimatedDots({
  curve,
  color,
  reducedMotion,
  count = 4,
}: {
  curve: CatmullRomCurve3;
  color: string;
  reducedMotion: boolean;
  count?: number;
}) {
  const groupRef = useRef<ThreeGroup>(null);
  const scratch = useRef(new Vector3()).current;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t0 = reducedMotion ? 0 : (state.clock.elapsedTime * 0.08) % 1;
    for (let i = 0; i < count; i += 1) {
      const dot = group.children[i];
      if (!dot) continue;
      const t = (t0 + i / count) % 1;
      curve.getPointAt(t, scratch);
      dot.position.copy(scratch);
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function AnimatedDotsForRoute({
  route,
  liftY,
  reducedMotion,
}: {
  route: RouteOption;
  liftY: number;
  reducedMotion: boolean;
}) {
  const points = useMemo(
    () => liftPoints(concatSegmentPoints(route.segments), liftY + 0.01),
    [route.segments, liftY],
  );
  const curve = useMemo(() => {
    if (points.length < 2) return null;
    return new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, "catmullrom", 0.05);
  }, [points]);
  if (!curve) return null;
  return <AnimatedDots curve={curve} color={PALETTE.primaryRoute} reducedMotion={reducedMotion} />;
}

function TransferMarker({ position }: { position: Point3 }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.1, 0.15, 16]} />
        <meshBasicMaterial color={PALETTE.transferMarker} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.18, 6]} />
        <meshStandardMaterial color={PALETTE.transferMarker} roughness={0.7} flatShading />
      </mesh>
    </group>
  );
}

function StairsMarker({ position }: { position: Point3 }) {
  return (
    <mesh position={[position[0], position[1] + 0.1, position[2]]} castShadow>
      <coneGeometry args={[0.09, 0.2, 4]} />
      <meshStandardMaterial color={PALETTE.stairsMarker} roughness={0.7} flatShading />
    </mesh>
  );
}

function SegmentOverlay({
  route,
  liftY,
  onSelectSegment,
}: {
  route: RouteOption;
  liftY: number;
  onSelectSegment?: (routeId: string, segmentId: string) => void;
}) {
  const segments = route.segments;
  return (
    <group>
      {segments.map((segment) => (
        <Line
          key={`${route.id}-hit-${segment.id}`}
          points={liftPoints(segment.points, liftY)}
          color={PALETTE.candidateRoute}
          lineWidth={14}
          transparent
          opacity={0.001}
          onClick={(event) => {
            event.stopPropagation();
            onSelectSegment?.(route.id, segment.id);
          }}
        />
      ))}
      {segments.map((segment, i) => {
        if (i === 0) return null;
        const previous = segments[i - 1];
        if (previous.mode === segment.mode) return null;
        const [boundary] = liftPoints([segment.points[0]], liftY);
        return <TransferMarker key={`${route.id}-transfer-${segment.id}`} position={boundary} />;
      })}
      {segments.map((segment) => {
        if (!segment.hasStairs && segment.accessibility !== "caution") return null;
        const [mid] = liftPoints([polylineMidpoint(segment.points)], liftY);
        return <StairsMarker key={`${route.id}-stairs-${segment.id}`} position={mid} />;
      })}
    </group>
  );
}

function PulsingHalo({
  points,
  color,
  lineWidth,
  baseOpacity,
  pulseAmount,
  pulseSpeed,
  reducedMotion,
}: {
  points: Point3[];
  color: string;
  lineWidth: number;
  baseOpacity: number;
  pulseAmount: number;
  pulseSpeed: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<Line2>(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    ref.current.material.opacity = baseOpacity + Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseAmount;
  });
  return (
    <Line
      ref={ref}
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={baseOpacity}
      depthTest={false}
    />
  );
}

function ReportMarker({
  position,
  onClick,
}: {
  position: Point3;
  onClick?: () => void;
}) {
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.32, 6]} />
        <meshStandardMaterial color={PALETTE.reportMarker} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <octahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial
          color={PALETTE.reportMarker}
          emissive={PALETTE.reportMarker}
          emissiveIntensity={0.35}
          roughness={0.6}
          flatShading
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Camera rig
// ---------------------------------------------------------------------------

function CameraRig({
  city,
  routes,
  cameraTarget,
  focusedSegmentId,
  resetSignal,
  reducedMotion,
}: {
  city: CityPack;
  routes: RouteOption[];
  cameraTarget?: string;
  focusedSegmentId?: string;
  resetSignal: number;
  reducedMotion: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const desiredTarget = useRef(new Vector3(0, 0, 0));
  const desiredDistance = useRef(DEFAULT_DISTANCE);
  const scratchOffset = useRef(new Vector3());
  const skipFirstReset = useRef(true);

  useEffect(() => {
    let nextTarget = new Vector3(0, 0, 0);
    let nextDistance = DEFAULT_DISTANCE;

    if (focusedSegmentId) {
      const found = findSegment(routes, focusedSegmentId);
      if (found) {
        const mid = polylineMidpoint(found.segment.points);
        nextTarget = new Vector3(mid[0], mid[1], mid[2]);
        nextDistance = FOCUSED_DISTANCE;
      }
    } else if (cameraTarget) {
      const landmark = city.landmarks.find((candidate) => candidate.id === cameraTarget);
      if (landmark) {
        nextTarget = new Vector3(landmark.position[0], landmark.position[1], landmark.position[2]);
        nextDistance = FOCUSED_DISTANCE;
      }
    }

    desiredTarget.current.copy(nextTarget);
    desiredDistance.current = nextDistance;

    if (reducedMotion && controlsRef.current) {
      controlsRef.current.target.copy(nextTarget);
      scratchOffset.current.copy(camera.position).sub(controlsRef.current.target).setLength(nextDistance);
      camera.position.copy(controlsRef.current.target).add(scratchOffset.current);
      controlsRef.current.update();
    }
  }, [cameraTarget, focusedSegmentId, routes, city.landmarks, reducedMotion, camera]);

  useEffect(() => {
    if (skipFirstReset.current) {
      skipFirstReset.current = false;
      return;
    }
    desiredTarget.current.set(0, 0, 0);
    desiredDistance.current = DEFAULT_DISTANCE;
    if (reducedMotion && controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      camera.position.set(...DEFAULT_CAMERA_POSITION);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || reducedMotion) return;
    const t = 1 - Math.pow(0.0007, Math.min(delta, 0.1));
    controls.target.lerp(desiredTarget.current, t);
    scratchOffset.current.copy(camera.position).sub(controls.target);
    const currentDistance = scratchOffset.current.length() || 0.0001;
    const nextDistance = MathUtils.lerp(currentDistance, desiredDistance.current, t);
    scratchOffset.current.setLength(nextDistance);
    camera.position.copy(controls.target).add(scratchOffset.current);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={6}
      maxDistance={28}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={Math.PI / 6}
      target={DEFAULT_TARGET_TUPLE}
      makeDefault
    />
  );
}

// ---------------------------------------------------------------------------
// Scene content
// ---------------------------------------------------------------------------

export function SceneContent({
  city,
  routes,
  visibleRouteIds,
  displayModes,
  focusedSegmentId,
  cameraTarget,
  activeReports,
  disruptedSegmentIds,
  onSelectRoute,
  onSelectSegment,
  onSelectLandmark,
  reducedMotion = false,
  resetSignal,
}: SceneContentProps) {
  const visibleRoutes = useMemo(
    () => routes.filter((route) => visibleRouteIds.includes(route.id)),
    [routes, visibleRouteIds],
  );

  const disruptedSet = useMemo(() => new Set(disruptedSegmentIds ?? []), [disruptedSegmentIds]);
  const focused = focusedSegmentId ? findSegment(routes, focusedSegmentId) : undefined;
  const anyFocus = Boolean(focusedSegmentId);

  return (
    <>
      <color attach="background" args={[PALETTE.background]} />
      <fog attach="fog" args={[PALETTE.fog, 14, 30]} />
      <ambientLight intensity={1.1} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.9}
        color="#fffaf2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-6, 5, -5]} intensity={0.48} color="#dce9eb" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={GROUND_SIZE} />
        <meshStandardMaterial color={PALETTE.groundEdge} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.079, 0]}>
        <planeGeometry args={[GROUND_SIZE[0] * 0.97, GROUND_SIZE[1] * 0.97]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>

      {city.sceneFeatures.map((feature) => (
        <FeatureMesh key={feature.id} feature={feature} reducedMotion={reducedMotion} />
      ))}

      {city.landmarks.map((landmark) => (
        <LandmarkMarker key={landmark.id} landmark={landmark} onSelect={onSelectLandmark} />
      ))}

      {visibleRoutes.map((route, index) => {
        const mode = displayModes[route.id] ?? "candidate";
        const liftY = index * 0.015;
        const dimmed = anyFocus && mode === "candidate";
        return (
          <Fragment key={route.id}>
            <RouteRibbon route={route} mode={mode} liftY={liftY} dimmed={dimmed} onSelectRoute={onSelectRoute} />
            {mode === "primary" && (
              <AnimatedDotsForRoute route={route} liftY={liftY} reducedMotion={reducedMotion} />
            )}
            {(mode === "primary" || mode === "backup") && (
              <SegmentOverlay route={route} liftY={liftY} onSelectSegment={onSelectSegment} />
            )}
            {(mode === "primary" || mode === "backup") &&
              route.segments
                .filter((segment) => disruptedSet.has(segment.id))
                .map((segment) => (
                  <PulsingHalo
                    key={`disruption-${route.id}-${segment.id}`}
                    points={liftPoints(segment.points, liftY + 0.02)}
                    color={PALETTE.disruption}
                    lineWidth={8}
                    baseOpacity={0.7}
                    pulseAmount={0.2}
                    pulseSpeed={4}
                    reducedMotion={reducedMotion}
                  />
                ))}
          </Fragment>
        );
      })}

      {focused && (
        <PulsingHalo
          points={liftPoints(focused.segment.points, 0.03)}
          color={PALETTE.focusHalo}
          lineWidth={10}
          baseOpacity={0.55}
          pulseAmount={0.15}
          pulseSpeed={3}
          reducedMotion={reducedMotion}
        />
      )}

      {activeReports.map((report) => {
        const found = findSegment(routes, report.segmentId);
        if (!found) return null;
        const mid = polylineMidpoint(found.segment.points);
        return (
          <ReportMarker
            key={report.id}
            position={mid}
            onClick={() => onSelectSegment?.(found.route.id, found.segment.id)}
          />
        );
      })}

      <CameraRig
        city={city}
        routes={routes}
        cameraTarget={cameraTarget}
        focusedSegmentId={focusedSegmentId}
        resetSignal={resetSignal}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
