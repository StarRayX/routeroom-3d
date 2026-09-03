"use client";

import { ALL_CRITERIA } from "@/lib/route-engine";
import { formatTime } from "@/lib/format";
import type { ComparisonCriterion, ComparisonRow, Critique, RankedRoute, CityPack } from "@/lib/types";

const CRITERION_LABEL: Record<ComparisonCriterion, string> = {
  reliability: "Reliability",
  fare: "Fare",
  walking: "Walking",
  arrival_buffer: "Arrival buffer",
  transfers: "Transfers",
  accessibility: "Accessibility",
  rain_exposure: "Rain exposure",
  duration: "Duration",
};

type RouteWhyProps = {
  city: CityPack;
  entry: RankedRoute;
  comparisonRow?: ComparisonRow;
  critique?: Critique;
};

/**
 * The contents of a route card's "Why" disclosure: this route's score
 * breakdown, its rank on every comparison criterion, and the critic's
 * points when the store's current critique targets this route.
 */
export function RouteWhy({ city, entry, comparisonRow, critique }: RouteWhyProps) {
  const isCritiqueForThisRoute = critique?.routeId === entry.route.id;

  return (
    <div className="route-why-body">
      <div className="route-why-section">
        <p className="eyebrow">SCORE BREAKDOWN</p>
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
      </div>

      {comparisonRow && (
        <div className="route-why-section">
          <p className="eyebrow">COMPARED TO OTHER ROUTES</p>
          <div className="compare-rows">
            {ALL_CRITERIA.map((criterion) => {
              const cell = comparisonRow.cells[criterion];
              return (
                <div className="compare-row" key={criterion}>
                  <span className="compare-row-label">{CRITERION_LABEL[criterion]}</span>
                  <span className="compare-row-value">{cell.display}</span>
                  <span className={`cell-rank ${cell.rank === 1 ? "is-best-rank" : ""}`}>#{cell.rank}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCritiqueForThisRoute && critique && (
        <div className="route-why-section">
          <p className="eyebrow">CRITIC</p>
          <p className="critique-headline">{critique.headline}</p>
          <ul className="critique-points">
            {critique.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <span className="route-card-freshness">Evidence as of {formatTime(critique.evidenceUpdatedAt, city)} · {Math.round(critique.confidence * 100)}% confidence</span>
        </div>
      )}
    </div>
  );
}
