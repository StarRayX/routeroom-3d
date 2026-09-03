"use client";

import { usePlanner } from "@/lib/planner-context";
import { formatMeters, formatMinutesRange, formatTime } from "@/lib/format";

type SegmentInspectorProps = {
  onReportSegment: (segmentId: string) => void;
};

export function SegmentInspector({ onReportSegment }: SegmentInspectorProps) {
  const city = usePlanner((s) => s.city);
  const now = usePlanner((s) => s.now);
  const lastInspection = usePlanner((s) => s.lastInspection);
  const primaryRouteId = usePlanner((s) => s.primaryRouteId);
  const ranked = usePlanner((s) => s.ranked);
  const focusSegment = usePlanner((s) => s.focusSegment);
  const inspect = usePlanner((s) => s.inspect);

  const primaryRoute = ranked.find((entry) => entry.route.id === primaryRouteId)?.route;

  if (!lastInspection) {
    return (
      <div className="drawer-tab-panel">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">SEGMENT INSPECTOR</p>
            <h2>{primaryRoute ? primaryRoute.name : "No route selected"}</h2>
          </div>
        </div>
        {!primaryRoute && <p className="empty-note">No primary route to inspect yet.</p>}
        {primaryRoute && (
          <ol className="segment-stepper">
            {primaryRoute.segments.map((segment, index) => (
              <li key={segment.id}>
                <button
                  type="button"
                  onClick={() => {
                    focusSegment(primaryRoute.id, segment.id, "human");
                    inspect(primaryRoute.id, segment.id, "human");
                  }}
                >
                  <span className="segment-step-index">{index + 1}</span>
                  <span>{segment.label}</span>
                  <span className="segment-step-mode">{segment.mode}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  const { segment, fromLandmark, toLandmark, activeReports, evidenceUpdatedAt, isTransfer } = lastInspection;

  return (
    <div className="drawer-tab-panel">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">SEGMENT INSPECTOR</p>
          <h2>{segment.label}</h2>
        </div>
        <span className="chip">{segment.mode}</span>
      </div>

      <div className="chip-row">
        <span className="chip">{fromLandmark?.name ?? segment.fromLandmarkId} → {toLandmark?.name ?? segment.toLandmarkId}</span>
        <span className="chip">{formatMinutesRange(segment.durationMin, segment.durationMax)}</span>
        <span className="chip">{formatMeters(segment.distanceMeters)}</span>
        <span className="chip">{segment.accessibility} access</span>
        <span className="chip">{segment.rainExposure} rain exposure</span>
        {segment.hasStairs && <span className="chip chip-warn">Stairs</span>}
        {segment.covered && <span className="chip">Covered</span>}
        {isTransfer && <span className="chip">Transfer</span>}
      </div>

      {segment.lineName && <p className="segment-line-name">Line: {segment.lineName}</p>}

      {segment.notes.length > 0 && (
        <ul className="segment-notes">
          {segment.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {activeReports.length > 0 && (
        <div className="report-blocks">
          {activeReports.map((report) => (
            <blockquote key={report.id} className="report-block">
              <p>{report.text}</p>
              {report.source === "user" && <span className="badge badge-amber">User-submitted, treat as unverified</span>}
              <span className="route-card-freshness">
                Observed {formatTime(report.observedAt, city)} · Expires {formatTime(report.expiresAt, city)}
              </span>
            </blockquote>
          ))}
        </div>
      )}

      <p className="route-card-freshness">Evidence as of {formatTime(evidenceUpdatedAt, city)} · now {formatTime(now, city)}</p>

      <div className="panel-footer">
        <button type="button" className="secondary-button" onClick={() => focusSegment(lastInspection.routeId, segment.id, "human")}>
          Focus in scene
        </button>
        <button type="button" className="secondary-button" onClick={() => onReportSegment(segment.id)}>
          Report an issue here
        </button>
      </div>
    </div>
  );
}
