"use client";

import type { ChangeEvent } from "react";
import { usePlanner } from "@/lib/planner-context";
import { cityPacks, getCityPack } from "@/lib/city-packs";
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
  const viewMode = usePlanner((s) => s.viewMode);
  const loadCityPack = usePlanner((s) => s.loadCityPack);
  const setViewMode = usePlanner((s) => s.setViewMode);

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = getCityPack(event.target.value);
    if (next) loadCityPack(next);
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
        <label className="field-inline">
          <span className="sr-only">City pack</span>
          <select value={city.id} onChange={handleCityChange} aria-label="City pack">
            {cityPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name} · {pack.district}
              </option>
            ))}
          </select>
        </label>

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
