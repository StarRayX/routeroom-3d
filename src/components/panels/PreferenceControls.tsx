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

export function PreferenceControls() {
  const city = usePlanner((s) => s.city);
  const preferences = usePlanner((s) => s.trip.preferences);
  const topRouteName = usePlanner((s) => s.ranked[0]?.route.name);
  const setPreferences = usePlanner((s) => s.setPreferences);

  return (
    <section className="card panel" aria-labelledby="preferences-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">YOUR PRIORITIES</p>
          <h2 id="preferences-heading">Shape the recommendation</h2>
        </div>
        <span className="human-tag">Human controlled</span>
      </div>

      <div className="preference-grid">
        <label>
          <span>Max fare</span>
          <select value={preferences.maxFare} onChange={(event) => setPreferences({ maxFare: Number(event.target.value) }, "human")}>
            {FARE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} {city.currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Max transfers</span>
          <select value={preferences.maxTransfers} onChange={(event) => setPreferences({ maxTransfers: Number(event.target.value) }, "human")}>
            {TRANSFER_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Max walking</span>
          <select value={preferences.maxWalkingMeters} onChange={(event) => setPreferences({ maxWalkingMeters: Number(event.target.value) }, "human")}>
            {WALKING_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} m
              </option>
            ))}
          </select>
        </label>

        <div className="preference-segmented">
          <span>Reliability priority</span>
          <div className="segmented" role="group" aria-label="Reliability priority">
            {PRIORITY_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={preferences.reliabilityPriority === option.value ? "is-active" : ""} aria-pressed={preferences.reliabilityPriority === option.value} onClick={() => setPreferences({ reliabilityPriority: option.value }, "human")}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="preference-segmented">
          <span>Walking priority</span>
          <div className="segmented" role="group" aria-label="Walking priority">
            {PRIORITY_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={preferences.walkingPriority === option.value ? "is-active" : ""} aria-pressed={preferences.walkingPriority === option.value} onClick={() => setPreferences({ walkingPriority: option.value }, "human")}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="preference-segmented">
          <span>Fare priority</span>
          <div className="segmented" role="group" aria-label="Fare priority">
            {PRIORITY_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={preferences.farePriority === option.value ? "is-active" : ""} aria-pressed={preferences.farePriority === option.value} onClick={() => setPreferences({ farePriority: option.value }, "human")}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="toggle-label">
          <span>Avoid stairs</span>
          <button type="button" className={`toggle ${preferences.avoidStairs ? "is-on" : ""}`} aria-pressed={preferences.avoidStairs} onClick={() => setPreferences({ avoidStairs: !preferences.avoidStairs }, "human")}>
            <span />
          </button>
        </label>

        <label className="toggle-label">
          <span>Minimize rain exposure</span>
          <button type="button" className={`toggle ${preferences.minimizeRainExposure ? "is-on" : ""}`} aria-pressed={preferences.minimizeRainExposure} onClick={() => setPreferences({ minimizeRainExposure: !preferences.minimizeRainExposure }, "human")}>
            <span />
          </button>
        </label>
      </div>

      <p className="recommendation-line">Recommendation: {topRouteName ?? "no route ranked yet"}</p>
    </section>
  );
}
