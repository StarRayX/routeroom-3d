"use client";

import { useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { formatRelative } from "@/lib/format";

type Filter = "all" | "agent" | "human";

export function ActivityLog() {
  const activity = usePlanner((s) => s.activity);
  const toolCallCount = usePlanner((s) => s.toolCallCount);
  const [filter, setFilter] = useState<Filter>("all");

  const events = filter === "all" ? activity : activity.filter((event) => event.actor === filter);

  return (
    <section className="card panel activity-panel" aria-label="Human and agent activity">
      <div className="activity-meta">{toolCallCount} agent call{toolCallCount === 1 ? "" : "s"}</div>
      <div className="activity-body">
        <div className="filter-chips" role="group" aria-label="Filter activity">
          {(["all", "agent", "human"] as Filter[]).map((value) => (
            <button key={value} type="button" className={`filter-chip ${filter === value ? "is-active" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === "all" ? "All" : value === "agent" ? "Agent" : "Human"}
            </button>
          ))}
        </div>

        <div className="activity-list">
          {events.length === 0 && <p className="empty-note">No activity yet.</p>}
          {events.map((event) => (
            <div className="activity-item" key={event.id}>
              <span className={`activity-dot activity-dot-${event.actor}`} aria-hidden="true" />
              <div>
                <div className="activity-item-head">
                  <strong>{event.label}</strong>
                  <span className="activity-kind">{event.kind}</span>
                </div>
                <p>{event.detail}</p>
                {event.toolName && <span className="mono">{event.toolName}</span>}
              </div>
              <time>{formatRelative(event.timestamp, new Date())}</time>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
