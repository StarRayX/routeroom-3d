"use client";

import type { ChangeEvent } from "react";
import { usePlanner } from "@/lib/planner-context";
import { formatDateOnly } from "./formatDateOnly";
import type { ViewMode, WebMcpStatus } from "@/lib/types";

type TopBarProps = {
  status: WebMcpStatus;
  registeredCount: number;
};

function statusText(status: WebMcpStatus, registeredCount: number): string {
  if (status === "checking") return "Checking site tools";
  if (status === "available") return `WebMCP tools ready · ${registeredCount} registered`;
  return "Human mode · WebMCP not detected";
}

export function TopBar({ status, registeredCount }: TopBarProps) {
  const city = usePlanner((s) => s.city);
  const tripId = usePlanner((s) => s.trip.tripId);
  const viewMode = usePlanner((s) => s.viewMode);
  const selectTrip = usePlanner((s) => s.selectTrip);
  const setViewMode = usePlanner((s) => s.setViewMode);

  const activeTrip = city.trips.find((trip) => trip.id === tripId);
  const hasMultipleTrips = city.trips.length > 1;

  const handleTripChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectTrip(event.target.value, "human");
  };

  const handleViewMode = (mode: ViewMode) => {
    if (mode !== viewMode) setViewMode(mode);
  };

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          ↗
        </span>
        <div>
          <div className="brand-name">RouteRoom</div>
          <div className="brand-subtitle">3D route decisions, together</div>
        </div>
      </div>

      <div className="topbar-controls">
        {hasMultipleTrips ? (
          <label className="field-inline">
            <span className="sr-only">Trip</span>
            <select value={tripId} onChange={handleTripChange} aria-label="Trip">
              {city.trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="trip-name-text">{activeTrip?.name ?? city.name}</span>
        )}

        <div className="pill" title={city.snapshot.sources.join(", ")}>
          Curated snapshot · {formatDateOnly(city.snapshot.curatedAt)}
        </div>

        <div className={`pill pill-status-${status}`}>
          <span className="pill-dot" aria-hidden="true" />
          {statusText(status, registeredCount)}
        </div>

        <div className="segmented" role="group" aria-label="Scene view">
          <button type="button" className={viewMode === "3d" ? "is-active" : ""} aria-pressed={viewMode === "3d"} onClick={() => handleViewMode("3d")}>
            3D
          </button>
          <button type="button" className={viewMode === "list" ? "is-active" : ""} aria-pressed={viewMode === "list"} onClick={() => handleViewMode("list")}>
            List
          </button>
        </div>
      </div>
    </header>
  );
}
