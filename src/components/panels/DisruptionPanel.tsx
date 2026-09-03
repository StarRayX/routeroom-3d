"use client";

import { useEffect, useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { formatTimeRange } from "@/lib/format";
import type { DeadlineStatus } from "@/lib/types";

const DEADLINE_LABEL: Record<DeadlineStatus, string> = {
  comfortable: "Comfortable",
  tight: "Tight",
  at_risk: "At risk",
  misses: "Misses deadline",
};

export function DisruptionPanel() {
  const city = usePlanner((s) => s.city);
  const ranked = usePlanner((s) => s.ranked);
  const primaryRouteId = usePlanner((s) => s.primaryRouteId);
  const lastSimulation = usePlanner((s) => s.lastSimulation);
  const simulate = usePlanner((s) => s.simulate);
  const selectBackup = usePlanner((s) => s.selectBackup);

  const [routeId, setRouteId] = useState<string>(primaryRouteId ?? ranked[0]?.route.id ?? "");
  const [segmentId, setSegmentId] = useState<string>("");
  const [delayMinutes, setDelayMinutes] = useState(15);

  useEffect(() => {
    if (primaryRouteId && !routeId) setRouteId(primaryRouteId);
    // Only seed the initial value; don't fight the human's own selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryRouteId]);

  const route = ranked.find((entry) => entry.route.id === routeId)?.route;

  return (
    <section className="card panel panel-full" aria-labelledby="disruption-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">DISRUPTION SIMULATOR</p>
          <h2 id="disruption-heading">Stress-test a route</h2>
        </div>
      </div>

      <div className="disruption-controls">
        <label>
          <span>Route</span>
          <select value={routeId} onChange={(event) => { setRouteId(event.target.value); setSegmentId(""); }}>
            {ranked.map((entry) => (
              <option key={entry.route.id} value={entry.route.id}>
                {entry.route.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Segment (optional)</span>
          <select value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>
            <option value="">Whole route from start</option>
            {route?.segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Delay: {delayMinutes} min</span>
          <input type="range" min={5} max={60} step={5} value={delayMinutes} onChange={(event) => setDelayMinutes(Number(event.target.value))} />
        </label>

        <button type="button" className="primary-button" disabled={!routeId} onClick={() => simulate(routeId, delayMinutes, segmentId || undefined, "human")}>
          Simulate
        </button>
      </div>

      {lastSimulation && (
        <div className="simulation-result">
          <div className="simulation-row">
            <div>
              <span className="eyebrow">ORIGINAL ARRIVAL</span>
              <strong>{formatTimeRange(lastSimulation.originalArrival.earliest, lastSimulation.originalArrival.latest, city)}</strong>
              <span className={`pill pill-deadline-${lastSimulation.originalArrival.deadlineStatus}`}>{DEADLINE_LABEL[lastSimulation.originalArrival.deadlineStatus]}</span>
            </div>
            <span className="simulation-arrow" aria-hidden="true">→</span>
            <div>
              <span className="eyebrow">REVISED ARRIVAL</span>
              <strong>{formatTimeRange(lastSimulation.revisedArrival.earliest, lastSimulation.revisedArrival.latest, city)}</strong>
              <span className={`pill pill-deadline-${lastSimulation.revisedArrival.deadlineStatus}`}>{DEADLINE_LABEL[lastSimulation.revisedArrival.deadlineStatus]}</span>
            </div>
          </div>

          <p className={lastSimulation.stillMeetsDeadline ? "simulation-ok" : "simulation-fail"}>
            {lastSimulation.stillMeetsDeadline ? "Still meets the deadline." : "Misses the deadline with this delay."}
          </p>
          <p className="route-card-freshness">Trigger condition: {lastSimulation.triggerCondition}</p>

          {lastSimulation.backupCandidates.length > 0 && (
            <div className="backup-candidates">
              <p className="eyebrow">BACKUP CANDIDATES</p>
              <ul>
                {lastSimulation.backupCandidates.map((candidate) => (
                  <li key={candidate.routeId} className="backup-candidate">
                    <div>
                      <strong>{candidate.name}</strong>
                      <span>{candidate.reason}</span>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => selectBackup(candidate.routeId, "human")}>
                      Use as backup
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
