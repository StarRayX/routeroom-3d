"use client";

import { useEffect, useRef, useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { SegmentInspector } from "./SegmentInspector";
import { DisruptionPanel } from "./DisruptionPanel";
import { ReportsPanel } from "./ReportsPanel";

type DrawerTab = "segment" | "disruption" | "observations";

const TAB_LABEL: Record<DrawerTab, string> = {
  segment: "Segment",
  disruption: "Disruption",
  observations: "Observations",
};

/**
 * Right-side (bottom sheet under 680px) panel with three tabs. It is closed
 * by default and opens itself whenever the shared state it explains changes:
 * a new segment inspection, a new disruption simulation, or a freshly
 * created report draft. It also opens when the human clicks "Inspect" on a
 * route card (which calls `inspect`, itself one of the watched triggers) or
 * "Report an issue here" inside the Segment tab.
 */
export function InspectDrawer() {
  const lastInspection = usePlanner((s) => s.lastInspection);
  const lastSimulation = usePlanner((s) => s.lastSimulation);
  const reportDrafts = usePlanner((s) => s.reportDrafts);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>("segment");
  const [reportPrefillSegmentId, setReportPrefillSegmentId] = useState<string | undefined>(undefined);

  const previousInspection = useRef(lastInspection);
  const previousSimulation = useRef(lastSimulation);
  const previousDraftCount = useRef(Object.keys(reportDrafts).length);

  useEffect(() => {
    if (lastInspection && lastInspection !== previousInspection.current) {
      previousInspection.current = lastInspection;
      setIsOpen(true);
      setActiveTab("segment");
    }
  }, [lastInspection]);

  useEffect(() => {
    if (lastSimulation && lastSimulation !== previousSimulation.current) {
      previousSimulation.current = lastSimulation;
      setIsOpen(true);
      setActiveTab("disruption");
    }
  }, [lastSimulation]);

  useEffect(() => {
    const count = Object.keys(reportDrafts).length;
    if (count > previousDraftCount.current) {
      setIsOpen(true);
      setActiveTab("observations");
    }
    previousDraftCount.current = count;
  }, [reportDrafts]);

  const handleReportSegment = (segmentId: string) => {
    setReportPrefillSegmentId(segmentId);
    setActiveTab("observations");
  };

  if (!isOpen) {
    return (
      <button type="button" className="inspect-drawer-reopen" onClick={() => setIsOpen(true)} aria-label="Open inspect panel">
        Inspect
      </button>
    );
  }

  return (
    <>
      <div className="inspect-drawer-backdrop" onClick={() => setIsOpen(false)} aria-hidden="true" />
      <aside className="inspect-drawer" aria-label="Inspect panel">
        <div className="inspect-drawer-head">
          <div className="inspect-drawer-tabs" role="tablist" aria-label="Inspect panel tabs">
            {(Object.keys(TAB_LABEL) as DrawerTab[]).map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`inspect-drawer-tab ${activeTab === tab ? "is-active" : ""}`} onClick={() => setActiveTab(tab)}>
                {TAB_LABEL[tab]}
              </button>
            ))}
          </div>
          <button type="button" className="inspect-drawer-close" onClick={() => setIsOpen(false)} aria-label="Close inspect panel">
            ×
          </button>
        </div>

        <div className="inspect-drawer-body">
          {activeTab === "segment" && <SegmentInspector onReportSegment={handleReportSegment} />}
          {activeTab === "disruption" && <DisruptionPanel />}
          {activeTab === "observations" && <ReportsPanel prefillSegmentId={reportPrefillSegmentId} />}
        </div>
      </aside>
    </>
  );
}
