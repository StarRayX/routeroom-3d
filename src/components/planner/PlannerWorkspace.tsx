"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { useWebMcpTools } from "@/lib/webmcp/useWebMcpTools";
import { RouteScene, RouteMap2D } from "@/components/route-scene";
import { getLandmark } from "@/lib/route-engine";
import { useShareParam } from "./useShareParam";
import { TopBar } from "@/components/panels/TopBar";
import { TripStrip } from "@/components/panels/TripStrip";
import { RouteCards } from "@/components/panels/RouteCards";
import { PreferenceControls } from "@/components/panels/PreferenceControls";
import { ScoreBreakdown } from "@/components/panels/ScoreBreakdown";
import { ComparisonTable } from "@/components/panels/ComparisonTable";
import { CritiquePanel } from "@/components/panels/CritiquePanel";
import { SegmentInspector } from "@/components/panels/SegmentInspector";
import { DisruptionPanel } from "@/components/panels/DisruptionPanel";
import { ActivityLog } from "@/components/panels/ActivityLog";
import { ReportsPanel } from "@/components/panels/ReportsPanel";
import { PlanDock } from "@/components/panels/PlanDock";
import { ConfirmationPanel } from "@/components/panels/ConfirmationPanel";
import { ToolConsole } from "@/components/panels/ToolConsole";
import type { RouteReport } from "@/lib/types";

export function PlannerWorkspace() {
  useShareParam();
  const { status, tools, registered } = useWebMcpTools();

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

  const [reportPrefillSegmentId, setReportPrefillSegmentId] = useState<string | undefined>(undefined);

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

      <section className="panel-grid">
        <PreferenceControls />
        <ScoreBreakdown />
        <ComparisonTable />
        <CritiquePanel />
        <SegmentInspector onReportSegment={setReportPrefillSegmentId} />
        <DisruptionPanel />
        <ActivityLog />
        <ReportsPanel prefillSegmentId={reportPrefillSegmentId} />
      </section>

      <PlanDock />
      <ToolConsole tools={tools} status={status} />
      <ConfirmationPanel />
    </main>
  );
}
