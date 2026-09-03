"use client";

import { useEffect } from "react";
import { usePlannerStoreApi } from "@/lib/planner-context";

/** Mirrors the store's commitShare payload shape: c city, t trip, p primary, b backup, d deadline, r backup trigger. */
type SharePayload = {
  c?: string;
  t?: string;
  p?: string;
  b?: string | null;
  d?: string;
  r?: string;
};

/**
 * On mount, if the URL carries `?plan=<base64 json>` (from `sharePlan`'s
 * share URL), load its trip, primary, and backup route into the current
 * city pack. Anything malformed, or a plan for a different city pack, is
 * ignored silently -- this is a convenience, not a source of truth.
 */
export function useShareParam(): void {
  const store = usePlannerStoreApi();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("plan");
    if (!raw) return;
    try {
      const json = decodeURIComponent(escape(window.atob(raw)));
      const payload = JSON.parse(json) as SharePayload;
      const state = store.getState();
      if (typeof payload.c !== "string" || payload.c !== state.city.id) return;
      if (typeof payload.t === "string" && payload.t !== state.trip.tripId) state.selectTrip(payload.t, "human");
      if (typeof payload.p === "string") state.selectPrimary(payload.p, "human");
      if (typeof payload.b === "string") state.selectBackup(payload.b, "human");
      state.logActivity("human", "info", "Opened a shared plan", "Loaded the trip, primary, and backup route from a shared link.");
    } catch {
      // Malformed or foreign share links are ignored.
    }
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
