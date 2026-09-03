"use client";

import { usePlanner } from "@/lib/planner-context";
import { formatFareRange, formatMeters, formatMinutesRange, formatRelative } from "@/lib/format";
import type { DeadlineStatus } from "@/lib/types";

const DEADLINE_LABEL: Record<DeadlineStatus, string> = {
  comfortable: "Comfortable",
  tight: "Tight",
  at_risk: "At risk",
  misses: "Misses deadline",
};

export function RouteCards() {
  const city = usePlanner((s) => s.city);
  const now = usePlanner((s) => s.now);
  const ranked = usePlanner((s) => s.ranked);
  const primaryRouteId = usePlanner((s) => s.primaryRouteId);
  const backupRouteId = usePlanner((s) => s.backupRouteId);
  const showRoute = usePlanner((s) => s.showRoute);
  const selectBackup = usePlanner((s) => s.selectBackup);
  const critiqueRoute = usePlanner((s) => s.critiqueRoute);

  return (
    <div className="route-cards" aria-label="Ranked route options">
      {ranked.map((entry) => {
        const { route } = entry;
        const isPrimary = route.id === primaryRouteId;
        const isBackup = route.id === backupRouteId;
        const hasViolations = !entry.constraints.satisfied;
        const stateClass = [isPrimary ? "is-primary" : "", isBackup ? "is-backup" : "", hasViolations ? "has-violations" : ""].filter(Boolean).join(" ");

        return (
          <article key={route.id} className={`card route-card ${stateClass}`}>
            <div className="route-card-head">
              <span className="rank-badge" style={{ backgroundColor: route.primaryColor }}>
                {entry.rank}
              </span>
              <div className="route-card-title">
                <strong>{route.name}</strong>
                <span>{route.summary}</span>
              </div>
              {entry.activeReports.length > 0 && <span className="badge badge-amber">{entry.activeReports.length} active report{entry.activeReports.length === 1 ? "" : "s"}</span>}
            </div>

            <div className="chip-row">
              <span className="chip">{formatMinutesRange(route.durationMin, route.durationMax)}</span>
              <span className="chip">{formatFareRange(route.fareMin, route.fareMax, city.currency, city.locale)}</span>
              <span className="chip">{route.transfers} transfer{route.transfers === 1 ? "" : "s"}</span>
              <span className="chip">{formatMeters(route.walkingMeters)} walk</span>
              <span className="chip">{route.reliability} reliability</span>
              <span className="chip">{route.accessibility} access</span>
            </div>

            <div className="route-card-meta">
              <span className={`pill pill-deadline-${entry.arrival.deadlineStatus}`}>
                {DEADLINE_LABEL[entry.arrival.deadlineStatus]} · {entry.arrival.bufferMinutesTypical >= 0 ? "+" : ""}
                {entry.arrival.bufferMinutesTypical} min
              </span>
              <span className="route-card-confidence">{Math.round(route.confidence * 100)}% confidence</span>
              <span className="route-card-freshness">Evidence {formatRelative(route.evidenceUpdatedAt, new Date(now))}</span>
            </div>

            {hasViolations && (
              <ul className="violation-list">
                {entry.constraints.violations.map((violation) => (
                  <li key={violation.constraint}>{violation.message}</li>
                ))}
              </ul>
            )}

            {route.tradeoffs.length > 0 && (
              <ul className="tradeoff-list">
                {route.tradeoffs.map((tradeoff) => (
                  <li key={tradeoff}>{tradeoff}</li>
                ))}
              </ul>
            )}

            <div className="route-card-actions">
              <button type="button" className="secondary-button" onClick={() => showRoute(route.id, {}, "human")} disabled={isPrimary}>
                Show as primary
              </button>
              <button type="button" className="secondary-button" onClick={() => selectBackup(isBackup ? undefined : route.id, "human")}>
                {isBackup ? "Remove as backup" : "Set as backup"}
              </button>
              <button type="button" className="text-button" onClick={() => critiqueRoute(route.id, "human")}>
                Why not?
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
