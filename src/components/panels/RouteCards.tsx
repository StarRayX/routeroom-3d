"use client";

import { usePlanner } from "@/lib/planner-context";
import { formatFareRange, formatMeters, formatMinutesRange } from "@/lib/format";
import type { DeadlineStatus } from "@/lib/types";
import { ArrowRight, Check, Clock, Money, Route, Walk } from "reicon-react";

const DEADLINE_LABEL: Record<DeadlineStatus, string> = {
  comfortable: "Comfortable",
  tight: "Tight",
  at_risk: "At risk",
  misses: "Misses deadline",
};

type RouteCardsProps = {
  onOpenReasoning?: () => void;
};

export function RouteCards({ onOpenReasoning }: RouteCardsProps) {
  const city = usePlanner((s) => s.city);
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
          <article key={route.id} data-route-id={route.id} className={`route-card ${stateClass}`}>
            <div className="route-card-head">
              <span className="rank-badge">
                {entry.rank}
              </span>
              <div className="route-card-title">
                <strong>{route.name}</strong>
                <span>{route.summary}</span>
              </div>
              <div className="route-state-labels">
                {isPrimary && <span className="route-state primary"><Check size={13} weight="Outline" />Primary</span>}
                {isBackup && <span className="route-state backup">Backup</span>}
              </div>
              {entry.activeReports.length > 0 && <span className="route-report-count">{entry.activeReports.length} report{entry.activeReports.length === 1 ? "" : "s"}</span>}
            </div>

            <div className="route-metrics" aria-label={`${route.name} summary`}>
              <span><Clock size={14} weight="Outline" />{formatMinutesRange(route.durationMin, route.durationMax)}</span>
              <span><Money size={14} weight="Outline" />{formatFareRange(route.fareMin, route.fareMax, city.currency, city.locale)}</span>
              <span><Walk size={14} weight="Outline" />{formatMeters(route.walkingMeters)}</span>
              <span><Route size={14} weight="Outline" />{route.transfers} transfer{route.transfers === 1 ? "" : "s"}</span>
            </div>

            <div className="route-card-meta">
              <span className={`route-arrival route-arrival-${entry.arrival.deadlineStatus}`}>
                {DEADLINE_LABEL[entry.arrival.deadlineStatus]} · {entry.arrival.bufferMinutesTypical >= 0 ? "+" : ""}
                {entry.arrival.bufferMinutesTypical} min
              </span>
              {isPrimary && <span className="route-card-confidence">{Math.round(route.confidence * 100)}% confidence</span>}
            </div>

            {hasViolations && (
              <ul className="violation-list">
                {entry.constraints.violations.map((violation) => (
                  <li key={violation.constraint}>{violation.message}</li>
                ))}
              </ul>
            )}

            <div className="route-card-actions">
              {!isPrimary && (
                <button type="button" className="secondary-button" onClick={() => showRoute(route.id, {}, "human")}>
                  <ArrowRight size={15} weight="Outline" aria-hidden="true" /> Show route
                </button>
              )}
              <button type="button" className="secondary-button" onClick={() => selectBackup(isBackup ? undefined : route.id, "human")}>
                {isBackup ? "Remove as backup" : "Set as backup"}
              </button>
              {isPrimary && (
                <button type="button" className="text-button" onClick={() => { critiqueRoute(route.id, "human"); onOpenReasoning?.(); }}>
                  Why this route?
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
