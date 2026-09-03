"use client";

import { usePlanner } from "@/lib/planner-context";
import type { Priority } from "@/lib/types";

const FARE_OPTIONS = [5, 10, 15, 25];
const TRANSFER_OPTIONS = [0, 1, 2, 3];
const WALKING_OPTIONS = [400, 800, 1200, 2000];
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/**
 * The priority bar: every preference control in one compact row. It stays
 * human-controlled -- every change here calls setPreferences with actor
 * "human", same as the WebMCP tool the agent uses.
 */
export function PreferenceControls() {
  const city = usePlanner((s) => s.city);
  const preferences = usePlanner((s) => s.trip.preferences);
  const topRouteName = usePlanner((s) => s.ranked[0]?.route.name);
  const setPreferences = usePlanner((s) => s.setPreferences);

  return (
    <section className="priority-bar card" aria-labelledby="priority-heading">
      <span id="priority-heading" className="priority-bar-label">
        Priorities
      </span>

      <label className="priority-field">
        <span>Max fare</span>
        <select value={preferences.maxFare} onChange={(event) => setPreferences({ maxFare: Number(event.target.value) }, "human")}>
          {FARE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} {city.currency}
            </option>
          ))}
        </select>
      </label>

      <label className="priority-field">
        <span>Transfers</span>
        <select value={preferences.maxTransfers} onChange={(event) => setPreferences({ maxTransfers: Number(event.target.value) }, "human")}>
          {TRANSFER_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="priority-field">
        <span>Max walk</span>
        <select value={preferences.maxWalkingMeters} onChange={(event) => setPreferences({ maxWalkingMeters: Number(event.target.value) }, "human")}>
          {WALKING_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} m
            </option>
          ))}
        </select>
      </label>

      <div className="priority-segmented">
        <span>Reliability</span>
        <div className="segmented" role="group" aria-label="Reliability priority">
          {PRIORITY_OPTIONS.map((option) => (
            <button key={option.value} type="button" className={preferences.reliabilityPriority === option.value ? "is-active" : ""} aria-pressed={preferences.reliabilityPriority === option.value} onClick={() => setPreferences({ reliabilityPriority: option.value }, "human")}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="priority-segmented">
        <span>Walking</span>
        <div className="segmented" role="group" aria-label="Walking priority">
          {PRIORITY_OPTIONS.map((option) => (
            <button key={option.value} type="button" className={preferences.walkingPriority === option.value ? "is-active" : ""} aria-pressed={preferences.walkingPriority === option.value} onClick={() => setPreferences({ walkingPriority: option.value }, "human")}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="priority-segmented">
        <span>Fare</span>
        <div className="segmented" role="group" aria-label="Fare priority">
          {PRIORITY_OPTIONS.map((option) => (
            <button key={option.value} type="button" className={preferences.farePriority === option.value ? "is-active" : ""} aria-pressed={preferences.farePriority === option.value} onClick={() => setPreferences({ farePriority: option.value }, "human")}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="priority-toggle">
        <span>Avoid stairs</span>
        <button type="button" className={`toggle ${preferences.avoidStairs ? "is-on" : ""}`} aria-pressed={preferences.avoidStairs} onClick={() => setPreferences({ avoidStairs: !preferences.avoidStairs }, "human")}>
          <span />
        </button>
      </label>

      <label className="priority-toggle">
        <span>Less rain</span>
        <button type="button" className={`toggle ${preferences.minimizeRainExposure ? "is-on" : ""}`} aria-pressed={preferences.minimizeRainExposure} onClick={() => setPreferences({ minimizeRainExposure: !preferences.minimizeRainExposure }, "human")}>
          <span />
        </button>
      </label>

      <span className="priority-recommendation">Recommendation: {topRouteName ?? "no route ranked yet"}</span>
    </section>
  );
}
