"use client";

import { useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { ALL_CRITERIA } from "@/lib/route-engine";
import type { ComparisonCriterion } from "@/lib/types";

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

export function ComparisonTable() {
  const comparison = usePlanner((s) => s.comparison);
  const compare = usePlanner((s) => s.compare);
  const [selected, setSelected] = useState<ComparisonCriterion[]>(ALL_CRITERIA);

  const toggleCriterion = (criterion: ComparisonCriterion) => {
    const next = selected.includes(criterion) ? selected.filter((value) => value !== criterion) : [...selected, criterion];
    setSelected(next);
    compare(undefined, next.length ? next : ALL_CRITERIA, "human");
  };

  return (
    <section className="card panel panel-full" aria-labelledby="comparison-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">ROUTE COMPARISON</p>
          <h2 id="comparison-heading">Criterion by criterion</h2>
        </div>
      </div>

      <div className="filter-chips" role="group" aria-label="Comparison criteria">
        {ALL_CRITERIA.map((criterion) => (
          <button key={criterion} type="button" className={`filter-chip ${selected.includes(criterion) ? "is-active" : ""}`} aria-pressed={selected.includes(criterion)} onClick={() => toggleCriterion(criterion)}>
            {CRITERION_LABEL[criterion]}
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Route</th>
              {comparison.criteria.map((criterion) => (
                <th scope="col" key={criterion}>
                  {CRITERION_LABEL[criterion]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.routeId} className={row.routeId === comparison.recommendedRouteId ? "is-recommended" : ""}>
                <th scope="row">
                  {row.name}
                  {row.routeId === comparison.recommendedRouteId && <span className="badge badge-teal">Recommended</span>}
                </th>
                {comparison.criteria.map((criterion) => {
                  const cell = row.cells[criterion];
                  return (
                    <td key={criterion} className={cell.rank === 1 ? "is-best-cell" : ""}>
                      <span>{cell.display}</span>
                      <span className="cell-rank">#{cell.rank}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparison.rationale.length > 0 && (
        <ul className="rationale-list">
          {comparison.rationale.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
