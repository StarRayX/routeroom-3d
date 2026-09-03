"use client";

import { usePlanner } from "@/lib/planner-context";
import { formatTime } from "@/lib/format";

export function CritiquePanel() {
  const city = usePlanner((s) => s.city);
  const critique = usePlanner((s) => s.critique);
  const focusSegment = usePlanner((s) => s.focusSegment);
  const inspect = usePlanner((s) => s.inspect);

  const focusWeakest = () => {
    if (!critique?.weakestSegmentId) return;
    focusSegment(critique.routeId, critique.weakestSegmentId, "human");
    inspect(critique.routeId, critique.weakestSegmentId, "human");
  };

  return (
    <section className="card panel" aria-labelledby="critique-heading">
      <div className="panel-heading compact">
        <h2 id="critique-heading">Weakest point</h2>
        {critique && <span className="score-total">{Math.round(critique.confidence * 100)}% confidence</span>}
      </div>

      {!critique && <p className="empty-note">No critique yet. Select a route or ask the agent for one.</p>}

      {critique && (
        <>
          <p className="critique-headline">{critique.headline}</p>
          <ul className="critique-points">
            {critique.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="panel-footer">
            <span className="route-card-freshness">Evidence as of {formatTime(critique.evidenceUpdatedAt, city)}</span>
            <button type="button" className="secondary-button" onClick={focusWeakest} disabled={!critique.weakestSegmentId}>
              Focus weakest segment
            </button>
          </div>
        </>
      )}
    </section>
  );
}
