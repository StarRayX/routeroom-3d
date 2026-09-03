"use client";

import { usePlanner } from "@/lib/planner-context";
import { getLandmark } from "@/lib/route-engine";
import { formatTime } from "@/lib/format";

export function TripStrip() {
  const city = usePlanner((s) => s.city);
  const trip = usePlanner((s) => s.trip);
  const ranked = usePlanner((s) => s.ranked);
  const findRouteOptions = usePlanner((s) => s.findRouteOptions);

  const origin = getLandmark(city, trip.originId);
  const destination = getLandmark(city, trip.destinationId);
  const bufferMinutes = ranked[0]?.arrival.bufferMinutesTypical;

  return (
    <section className="trip-strip">
      <div className="trip-point">
        <span className="trip-icon origin-icon" aria-hidden="true">
          ●
        </span>
        <div>
          <span className="field-label">FROM</span>
          <strong>{origin?.name ?? trip.originId}</strong>
        </div>
      </div>

      <span className="trip-arrow" aria-hidden="true">
        →
      </span>

      <div className="trip-point">
        <span className="trip-icon destination-icon" aria-hidden="true">
          ◆
        </span>
        <div>
          <span className="field-label">TO</span>
          <strong>{destination?.name ?? trip.destinationId}</strong>
        </div>
      </div>

      <div className="trip-deadline">
        <span className="field-label">DEPART</span>
        <strong>{formatTime(trip.departAt, city)}</strong>
      </div>

      <div className="trip-deadline">
        <span className="field-label">ARRIVE BY</span>
        <strong>{formatTime(trip.arrivalDeadline, city)}</strong>
        <span>{typeof bufferMinutes === "number" ? `${bufferMinutes >= 0 ? "+" : ""}${bufferMinutes} min buffer on top route` : "No ranked routes yet"}</span>
      </div>

      <button type="button" className="primary-button" onClick={() => findRouteOptions({}, "human")}>
        Find routes <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}
