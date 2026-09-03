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
      <section className="card panel" aria-labelledby="inspector-heading">
        <div className="panel-heading compact">
          <h2 id="inspector-heading">{primaryRoute ? primaryRoute.name : "No route selected"}</h2>
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
      </section>
    );
  }

  const { segment, fromLandmark, toLandmark, activeReports, evidenceUpdatedAt, isTransfer } = lastInspection;

  return (
    <section className="card panel" aria-labelledby="inspector-heading">
      <div className="panel-heading compact">
        <h2 id="inspector-heading">{segment.label}</h2>
        <span className="segment-mode">{segment.mode}</span>
      </div>

      <dl className="segment-facts">
        <div><dt>From</dt><dd>{fromLandmark?.name ?? segment.fromLandmarkId}</dd></div>
        <div><dt>To</dt><dd>{toLandmark?.name ?? segment.toLandmarkId}</dd></div>
        <div><dt>Time</dt><dd>{formatMinutesRange(segment.durationMin, segment.durationMax)}</dd></div>
        <div><dt>Distance</dt><dd>{formatMeters(segment.distanceMeters)}</dd></div>
        <div><dt>Access</dt><dd>{segment.accessibility}</dd></div>
        <div><dt>Rain</dt><dd>{segment.rainExposure}</dd></div>
        {(segment.hasStairs || segment.covered || isTransfer) && <div><dt>Notes</dt><dd>{[segment.hasStairs && "Stairs", segment.covered && "Covered", isTransfer && "Transfer"].filter(Boolean).join(" · ")}</dd></div>}
      </dl>

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
              {report.source === "user" && <p className="report-note">User-submitted; treat as unverified.</p>}
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
    </section>
  );
}
