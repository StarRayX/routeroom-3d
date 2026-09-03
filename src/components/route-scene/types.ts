import type { CityPack, RouteOption, RouteReport, SceneDisplayMode } from "@/lib/types";

/**
 * Props contract for the 3D scene and its 2D fallback. The planner page maps
 * store state onto these; the scene never reads the store directly so it can
 * be tested and reused in isolation.
 */
export type RouteSceneProps = {
  city: CityPack;
  /** Every route in the city pack, in ranked order. */
  routes: RouteOption[];
  /** Routes to draw. Others are hidden entirely. */
  visibleRouteIds: string[];
  /** primary = bright ribbon + moving dots, backup = dashed/secondary ribbon, candidate = faded. */
  displayModes: Record<string, SceneDisplayMode>;
  primaryRouteId?: string;
  backupRouteId?: string;
  /** Segment to highlight and frame. */
  focusedSegmentId?: string;
  /** Landmark id the camera should ease toward. Undefined = default overview. */
  cameraTarget?: string;
  /** Unexpired reports; draw a marker on the affected segment. */
  activeReports: RouteReport[];
  /** Segment ids with a "delayed" pulse from the last disruption simulation. */
  disruptedSegmentIds?: string[];
  onSelectRoute: (routeId: string) => void;
  onSelectSegment?: (routeId: string, segmentId: string) => void;
  onSelectLandmark?: (landmarkId: string) => void;
  /** Called once if WebGL is unavailable so the page can switch to list view. */
  onWebGlUnavailable?: () => void;
  /** Reduce motion: no animated dots or camera easing. */
  reducedMotion?: boolean;
};
