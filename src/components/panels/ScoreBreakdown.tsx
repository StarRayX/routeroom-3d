"use client";

import { usePlanner } from "@/lib/planner-context";

export function ScoreBreakdown() {
  const primaryRouteId = usePlanner((s) => s.primaryRouteId);
  const ranked = usePlanner((s) => s.ranked);

  const entry = ranked.find((candidate) => candidate.route.id === primaryRouteId);

  return (
    <section className="card panel" aria-labelledby="score-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">SCORE BREAKDOWN</p>
          <h2 id="score-heading">{entry ? entry.route.name : "No primary route"}</h2>
        </div>
        {entry && <span className="score-total">{Math.round(entry.score.total * 100)}%</span>}
      </div>

      {!entry && <p className="empty-note">Select a primary route to see its score breakdown.</p>}

      {entry && (
        <>
          <div className="bar-rows">
            {entry.score.components.map((component) => (
              <div className="bar-row" key={component.key}>
                <div className="bar-row-label">
                  <span>{component.label}</span>
                  <span className="bar-row-weight">weight {Math.round(component.weight * 100)}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.round(component.score * 100)}%` }} />
                </div>
                <div className="bar-row-meta">
                  <span>{component.inputValue}</span>
                  <span>
                    score {component.score.toFixed(2)} · weighted {component.weighted.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {entry.score.penalties.length > 0 && (
            <div className="penalty-list">
              <p className="eyebrow">PENALTIES</p>
              <ul>
                {entry.score.penalties.map((penalty) => (
                  <li key={penalty.key} className="penalty-item">
                    <strong>{penalty.label}</strong> ×{penalty.factor.toFixed(2)}. {penalty.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="score-total-line">Total score: {entry.score.total.toFixed(3)}</p>
        </>
      )}
    </section>
  );
}
