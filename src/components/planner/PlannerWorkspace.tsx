"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, Chart, ChatRoundDots, Layers, Path, RotateLeft, Warning } from "reicon-react";
import { usePlanner } from "@/lib/planner-context";
import { useWebMcpTools } from "@/lib/webmcp/useWebMcpTools";
import { RouteScene, RouteMap2D } from "@/components/route-scene";
import { getLandmark } from "@/lib/route-engine";
import { useShareParam } from "./useShareParam";
import { TopBar } from "@/components/panels/TopBar";
import { TripStrip } from "@/components/panels/TripStrip";
import { RouteCards } from "@/components/panels/RouteCards";
import { PreferenceControls } from "@/components/panels/PreferenceControls";
import { ActivityLog } from "@/components/panels/ActivityLog";
import { PlanDock } from "@/components/panels/PlanDock";
import { ConfirmationPanel } from "@/components/panels/ConfirmationPanel";
import { ToolConsole } from "@/components/panels/ToolConsole";
import type { RouteReport } from "@/lib/types";
import { InsightDrawer, type InsightTab } from "./InsightDrawer";

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
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightTab, setInsightTab] = useState<InsightTab>("why");
  const [sidebarMode, setSidebarMode] = useState<"routes" | "preferences" | "activity" | "insight">("routes");
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [mapboxRequested, setMapboxRequested] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugEnabled(params.get("debug") === "1");
    setMapboxRequested(params.get("auto3d") === "1");
  }, []);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !primaryRouteId || !stageRef.current) return;

    const selected = stageRef.current.querySelector(`[data-route-id="${primaryRouteId}"]`);
    const scene = stageRef.current.querySelector(".scene-column");
    const context = gsap.context(() => {
      if (selected) {
        gsap.fromTo(selected, { opacity: 0.7 }, { opacity: 1, duration: 0.18, ease: "power3.out" });
      }
      if (scene) {
        gsap.fromTo(scene, { opacity: 0.92 }, { opacity: 1, duration: 0.28, ease: "power3.out", clearProps: "opacity" });
      }
    }, stageRef);

    return () => context.revert();
  }, [primaryRouteId]);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !sidebarContentRef.current) return;
    gsap.fromTo(sidebarContentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power2.out" });
  }, [sidebarMode, insightTab]);

  const openInsight = (tab: InsightTab) => {
    setInsightTab(tab);
    setInsightOpen(true);
    setSidebarMode("insight");
  };

  const resetMapView = () => {
    window.dispatchEvent(new CustomEvent("routeroom:reset-view"));
  };

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
      openInsight("segments");
    },
    onSelectLandmark: (landmarkId: string) => {
      const landmark = getLandmark(city, landmarkId);
      logActivity("human", "info", "Landmark selected", landmark?.name ?? landmarkId);
    },
    onWebGlUnavailable: () => setViewMode("list"),
  };

  return (
    <main className="app-shell">
      <TopBar
        status={status}
        registeredCount={registered.length}
        onOpenPreferences={() => setSidebarMode("preferences")}
        onOpenActivity={() => setSidebarMode("activity")}
      />

      <section ref={stageRef} className="planner-frame">
        <aside className={`route-sidebar route-sidebar-${sidebarMode}`} aria-label="Route planning controls">
          {sidebarMode === "routes" && <TripStrip />}

          <div ref={sidebarContentRef} className="route-sidebar-content">
            {sidebarMode === "routes" && (
              <>
                <div className="sidebar-heading">
                  <h1>Routes</h1>
                  <span>{routes.length} options</span>
                </div>
                <div className="route-cards-column">
                  <RouteCards onOpenReasoning={() => openInsight("why")} />
                </div>
                <PlanDock />
              </>
            )}

            {sidebarMode === "preferences" && (
              <div className="sidebar-pane">
                <div className="sidebar-pane-header">
                  <button type="button" className="back-button" onClick={() => setSidebarMode("routes")}>
                    <ArrowLeft size={17} weight="Outline" aria-hidden="true" /> Back
                  </button>
                  <h1>Preferences</h1>
                </div>
                <PreferenceControls />
              </div>
            )}

            {sidebarMode === "activity" && (
              <div className="sidebar-pane">
                <div className="sidebar-pane-header">
                  <button type="button" className="back-button" onClick={() => setSidebarMode("routes")}>
                    <ArrowLeft size={17} weight="Outline" aria-hidden="true" /> Back
                  </button>
                  <h1>Activity</h1>
                </div>
                <ActivityLog />
              </div>
            )}

            {sidebarMode === "insight" && insightOpen && (
              <InsightDrawer
                activeTab={insightTab}
                open={insightOpen}
                reportPrefillSegmentId={reportPrefillSegmentId}
                onTabChange={setInsightTab}
                onClose={() => {
                  setInsightOpen(false);
                  setSidebarMode("routes");
                }}
                onReportSegment={(segmentId) => {
                  setReportPrefillSegmentId(segmentId);
                  openInsight("reports");
                }}
              />
            )}
          </div>
        </aside>

        <section className="map-workspace" aria-label="Route map">
          <div className="scene-column">
            <div className={`scene-layer ${viewMode === "3d" ? "is-active" : ""}`} aria-hidden={viewMode !== "3d"}>
              {mapboxRequested ? (
                <RouteScene {...sceneProps} />
              ) : (
                <div className="mapbox-gate-shell">
                  <RouteMap2D {...sceneProps} />
                  <div className="mapbox-gate">
                    <button type="button" onClick={() => setMapboxRequested(true)}>
                      <Layers size={16} weight="Outline" aria-hidden="true" /> Open 3D map
                    </button>
                    <span>Starts one Mapbox map load</span>
                  </div>
                </div>
              )}
            </div>
            <div className={`scene-layer ${viewMode === "list" ? "is-active" : ""}`} aria-hidden={viewMode !== "list"}>
              <RouteMap2D {...sceneProps} />
            </div>
          </div>
          <div className="inspection-launcher" aria-label="Route inspection tools">
            <button type="button" onClick={resetMapView} title="Reset map view"><RotateLeft size={17} weight="Outline" /><span>Reset</span></button>
            <button type="button" onClick={() => openInsight("why")}><Chart size={17} weight="Outline" /><span>Why</span></button>
            <button type="button" onClick={() => openInsight("segments")}><Path size={17} weight="Outline" /><span>Segments</span></button>
            <button type="button" onClick={() => openInsight("stress")}><Warning size={17} weight="Outline" /><span>Test</span></button>
            <button type="button" onClick={() => openInsight("reports")}><ChatRoundDots size={17} weight="Outline" /><span>Reports</span></button>
          </div>
        </section>
      </section>

      {debugEnabled && (
        <section className="debug-region">
          <ToolConsole tools={tools} status={status} />
        </section>
      )}
      <ConfirmationPanel />
    </main>
  );
}
