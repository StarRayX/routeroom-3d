"use client";

import { useEffect, useRef, useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { formatRelative } from "@/lib/format";

type Filter = "all" | "agent" | "human";

/**
 * Collapsed by default: a slim bar reading "Activity · N agent tool calls".
 * The first time an activity event with actor "agent" arrives, it expands
 * itself once; after that the human is free to collapse or expand it.
 */
export function ActivityLog() {
  const activity = usePlanner((s) => s.activity);
  const toolCallCount = usePlanner((s) => s.toolCallCount);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const hasAutoExpanded = useRef(false);

  useEffect(() => {
    if (hasAutoExpanded.current) return;
    if (activity.some((event) => event.actor === "agent")) {
      hasAutoExpanded.current = true;
      setExpanded(true);
    }
  }, [activity]);

  const events = filter === "all" ? activity : activity.filter((event) => event.actor === filter);

  return (
    <section className={`activity-bar ${expanded ? "is-expanded" : ""}`} aria-labelledby="activity-heading">
      <button type="button" className="activity-bar-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span id="activity-heading">Activity · {toolCallCount} agent tool call{toolCallCount === 1 ? "" : "s"}</span>
        <span className={`activity-bar-chevron ${expanded ? "is-open" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>

      {expanded && (
        <div className="activity-bar-body">
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
      )}
    </section>
  );
}
