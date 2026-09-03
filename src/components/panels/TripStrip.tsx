"use client";

import { usePlanner } from "@/lib/planner-context";
import { getLandmark } from "@/lib/route-engine";
import { formatTime } from "@/lib/format";
import { Clock, Location, Route, Sparkle, Target } from "reicon-react";

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
      <div className="trip-path">
        <div className="trip-point">
          <span className="trip-icon origin-icon" aria-hidden="true">
            <Location size={17} weight="Filled" />
          </span>
          <div>
            <span className="field-label">From</span>
            <strong>{origin?.name ?? trip.originId}</strong>
          </div>
        </div>

        <div className="trip-point">
          <span className="trip-icon destination-icon" aria-hidden="true">
            <Target size={17} weight="Outline" />
          </span>
          <div>
            <span className="field-label">To</span>
            <strong>{destination?.name ?? trip.destinationId}</strong>
          </div>
        </div>
      </div>

      <div className="trip-times">
        <div className="trip-deadline">
          <Clock size={15} weight="Outline" aria-hidden="true" />
          <span className="field-label">Depart</span>
          <strong>{formatTime(trip.departAt, city)}</strong>
        </div>

        <div className="trip-deadline">
          <Route size={15} weight="Outline" aria-hidden="true" />
          <span className="field-label">Arrive by</span>
          <strong>{formatTime(trip.arrivalDeadline, city)}</strong>
          <span>{typeof bufferMinutes === "number" ? `${bufferMinutes >= 0 ? "+" : ""}${bufferMinutes} min buffer` : "No routes yet"}</span>
        </div>
      </div>

      <button type="button" className="primary-button" onClick={() => findRouteOptions({}, "human")}>
        <Sparkle size={16} weight="Outline" aria-hidden="true" /> Refresh routes
      </button>
    </section>
  );
}
