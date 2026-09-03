"use client";

import { usePlanner } from "@/lib/planner-context";
import { formatDateOnly } from "./formatDateOnly";

/**
 * ODbL requires attribution wherever the map geometry is shown. Always
 * visible at the bottom of the page, never behind a toggle.
 */
export function AttributionFooter() {
  const city = usePlanner((s) => s.city);

  return (
    <footer className="attribution-footer">
      <ul className="attribution-lines">
        {city.attribution.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>{city.geometry.source.attribution} · {city.geometry.source.license} · exported {formatDateOnly(city.geometry.source.exportedAt)}</li>
      </ul>
      {city.snapshot.notes.length > 0 && (
        <ul className="attribution-lines attribution-notes">
          {city.snapshot.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </footer>
  );
}
