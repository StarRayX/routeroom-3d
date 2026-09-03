"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { Chart, ChatRoundDots, CloseCircle, Path, Warning } from "reicon-react";
import { ScoreBreakdown } from "@/components/panels/ScoreBreakdown";
import { ComparisonTable } from "@/components/panels/ComparisonTable";
import { CritiquePanel } from "@/components/panels/CritiquePanel";
import { SegmentInspector } from "@/components/panels/SegmentInspector";
import { DisruptionPanel } from "@/components/panels/DisruptionPanel";
import { ReportsPanel } from "@/components/panels/ReportsPanel";

export type InsightTab = "why" | "segments" | "stress" | "reports";

type InsightDrawerProps = {
  activeTab: InsightTab;
  open: boolean;
  reportPrefillSegmentId?: string;
  onTabChange: (tab: InsightTab) => void;
  onClose: () => void;
  onReportSegment: (segmentId: string) => void;
};

const TABS: { id: InsightTab; label: string; icon: typeof Chart }[] = [
  { id: "why", label: "Why", icon: Chart },
  { id: "segments", label: "Segments", icon: Path },
  { id: "stress", label: "Stress test", icon: Warning },
  { id: "reports", label: "Reports", icon: ChatRoundDots },
];

export function InsightDrawer({ activeTab, open, reportPrefillSegmentId, onTabChange, onClose, onReportSegment }: InsightDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drawer = drawerRef.current;
    if (!drawer || reduced) return;

    gsap.fromTo(
      drawer,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.22, ease: "power2.out", clearProps: "transform,opacity" },
    );
  }, [open]);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const content = contentRef.current;
    if (!content || reduced) return;

    gsap.fromTo(
      content,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.22, ease: "power3.out", clearProps: "transform,opacity" },
    );
  }, [activeTab]);

  if (!open) return null;

  return (
    <section ref={drawerRef} className="insight-drawer" aria-labelledby="insight-drawer-title">
      <header className="insight-drawer-header">
        <div>
          <h2 id="insight-drawer-title">Inspect route</h2>
        </div>

        <nav className="insight-tabs" aria-label="Route inspection views">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={activeTab === id ? "is-active" : ""} aria-pressed={activeTab === id} onClick={() => onTabChange(id)}>
              <Icon size={16} weight="Outline" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <button type="button" className="icon-button" onClick={onClose} aria-label="Close route inspection">
          <CloseCircle size={19} weight="Outline" aria-hidden="true" />
        </button>
      </header>

      <div ref={contentRef} className="insight-drawer-content">
        {activeTab === "why" && (
          <div className="insight-reasoning-grid">
            <CritiquePanel />
            <ScoreBreakdown />
            <ComparisonTable />
          </div>
        )}
        {activeTab === "segments" && <SegmentInspector onReportSegment={onReportSegment} />}
        {activeTab === "stress" && <DisruptionPanel />}
        {activeTab === "reports" && <ReportsPanel prefillSegmentId={reportPrefillSegmentId} />}
      </div>
    </section>
  );
}
