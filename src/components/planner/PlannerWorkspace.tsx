"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { useWebMcpTools } from "@/lib/webmcp/useWebMcpTools";
import { RouteScene, RouteMap2D } from "@/components/route-scene";
import { getLandmark } from "@/lib/route-engine";
import { useShareParam } from "./useShareParam";
import { TopBar } from "@/components/panels/TopBar";
import { TripStrip } from "@/components/panels/TripStrip";
import { RouteCards } from "@/components/panels/RouteCards";
import { PreferenceControls } from "@/components/panels/PreferenceControls";
import { PlanDock } from "@/components/panels/PlanDock";
import { ActivityLog } from "@/components/panels/ActivityLog";
import { InspectDrawer } from "@/components/panels/InspectDrawer";
import { ConfirmationPanel } from "@/components/panels/ConfirmationPanel";
import { ToolConsole } from "@/components/panels/ToolConsole";
import { AttributionFooter } from "@/components/panels/AttributionFooter";
import type { RouteReport } from "@/lib/types";

/** Reads `?debug=1` once on mount. Kept as a plain effect (no useSearchParams) so this fully client-rendered page needs no Suspense boundary just to gate the tool console. */
function useDebugFlag(): boolean {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);
  return debug;
}

export function PlannerWorkspace() {
  useShareParam();
  const { status, tools, registered } = useWebMcpTools();
  const debug = useDebugFlag();

  const city = usePlanner((s) => s.city);
  const ranked = usePlanner((s) => s.ranked);
  const visibleRouteIds = usePlanner((s) => s.visibleRouteIds);
  const displayModes = usePlanner((s) => s.displayModes);
  const primaryRouteId = usePlanner((s) => s.primaryRouteId);
  const backupRouteId = usePlanner((s) => s.backupRouteId);
  const focusedSegmentId = usePlanner((s) => s.focusedSegmentId);
  const cameraTarget = usePlanner((s) => s.cameraTarget);
  const lastSimulation = usePlanner((s) => s.lastSimulation);
  const viewMode = usePlanner((s) => s.viewMode);

  const showRoute = usePlanner((s) => s.showRoute);
  const focusSegment = usePlanner((s) => s.focusSegment);
  const inspect = usePlanner((s) => s.inspect);
  const logActivity = usePlanner((s) => s.logActivity);
  const setViewMode = usePlanner((s) => s.setViewMode);

  const routes = useMemo(() => ranked.map((entry) => entry.route), [ranked]);

  const activeReports = useMemo(() => {
    const byId = new Map<string, RouteReport>();
    for (const entry of ranked) {
      for (const report of entry.activeReports) byId.set(report.id, report);
    }
    return Array.from(byId.values());
  }, [ranked]);

  const sceneProps = {
    city,
    routes,
    visibleRouteIds,
    displayModes,
    primaryRouteId,
    backupRouteId,
    focusedSegmentId,
    cameraTarget,
    activeReports,
    disruptedSegmentIds: lastSimulation?.affectedSegmentIds,
    onSelectRoute: (routeId: string) => showRoute(routeId, {}, "human"),
    onSelectSegment: (routeId: string, segmentId: string) => {
      focusSegment(routeId, segmentId, "human");
      inspect(routeId, segmentId, "human");
    },
    onSelectLandmark: (landmarkId: string) => {
      const landmark = getLandmark(city, landmarkId);
      logActivity("human", "info", "Landmark selected", landmark?.name ?? landmarkId);
    },
    onWebGlUnavailable: () => setViewMode("list"),
  };

  return (
    <main className="app-shell">
      <TopBar status={status} registeredCount={registered.length} />
      <TripStrip />

      <section className="scene-row">
        <div className="scene-column">{viewMode === "list" ? <RouteMap2D {...sceneProps} /> : <RouteScene {...sceneProps} />}</div>
        <div className="route-cards-column">
          <RouteCards />
        </div>
      </section>

      <PreferenceControls />

      <PlanDock />
      <ActivityLog />

      {debug && <ToolConsole tools={tools} status={status} />}

      <AttributionFooter />

      <InspectDrawer />
      <ConfirmationPanel />
    </main>
  );
}
