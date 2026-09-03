"use client";

import type { ChangeEvent } from "react";
import { usePlanner } from "@/lib/planner-context";
import type { ViewMode, WebMcpStatus } from "@/lib/types";
import { Activity, Building3, CheckCircle, Layers, List, Tuning, Warning } from "reicon-react";
import { RouteRoomMark } from "@/components/brand/RouteRoomMark";

type TopBarProps = {
  status: WebMcpStatus;
  registeredCount: number;
  onOpenPreferences: () => void;
  onOpenActivity: () => void;
};

function statusText(status: WebMcpStatus): string {
  if (status === "checking") return "Connecting agent";
  if (status === "available") return "Agent connected";
  return "Browser only";
}

export function TopBar({ status, registeredCount, onOpenPreferences, onOpenActivity }: TopBarProps) {
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
        <span className="brand-mark"><RouteRoomMark size={34} /></span>
        <div className="brand-name">RouteRoom</div>
      </div>

      <div className="topbar-controls">
        {hasMultipleTrips ? (
          <label className="field-inline">
            <span className="sr-only">Trip</span>
            <Building3 size={16} weight="Outline" aria-hidden="true" />
            <select value={tripId} onChange={handleTripChange} aria-label="Trip">
              {city.trips.map((trip) => (
                <option key={trip.id} value={trip.id}>{trip.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="city-context" title={activeTrip?.name ?? city.description}>
            <Building3 size={16} weight="Outline" aria-hidden="true" />
            <span>{city.name}</span>
            <small>{city.district}</small>
          </div>
        )}

        <div className={`agent-status agent-status-${status}`} title={status === "available" ? `${registeredCount} WebMCP tools available` : undefined}>
          {status === "available" ? <CheckCircle size={15} weight="Outline" aria-hidden="true" /> : status === "unavailable" ? <Warning size={15} weight="Outline" aria-hidden="true" /> : <span className="pill-dot" aria-hidden="true" />}
          {statusText(status)}
        </div>

        <button type="button" className="toolbar-button" onClick={onOpenPreferences}>
          <Tuning size={16} weight="Outline" aria-hidden="true" /> Preferences
        </button>

        <button type="button" className="toolbar-button icon-only" onClick={onOpenActivity} aria-label="Open activity history">
          <Activity size={17} weight="Outline" aria-hidden="true" />
        </button>

        <div className="segmented" role="group" aria-label="Scene view">
          <button type="button" className={viewMode === "3d" ? "is-active" : ""} aria-pressed={viewMode === "3d"} onClick={() => handleViewMode("3d")}>
            <Layers size={15} weight="Outline" aria-hidden="true" /> 3D
          </button>
          <button type="button" className={viewMode === "list" ? "is-active" : ""} aria-pressed={viewMode === "list"} onClick={() => handleViewMode("list")}>
            <List size={15} weight="Outline" aria-hidden="true" /> 2D
          </button>
        </div>
      </div>
    </header>
  );
}
