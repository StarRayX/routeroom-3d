"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createPlannerStore, type PlannerStore, type PlannerStoreApi } from "./planner-store";
import type { CityPack } from "./types";

const PlannerContext = createContext<PlannerStoreApi | null>(null);

export function PlannerProvider({ city, children }: { city: CityPack; children: ReactNode }) {
  const storeRef = useRef<PlannerStoreApi | null>(null);
  if (!storeRef.current) storeRef.current = createPlannerStore(city);
  return <PlannerContext.Provider value={storeRef.current}>{children}</PlannerContext.Provider>;
}

/** Select a slice of planner state. Re-renders only when the slice changes. */
export function usePlanner<T>(selector: (state: PlannerStore) => T): T {
  const store = useContext(PlannerContext);
  if (!store) throw new Error("usePlanner must be used inside <PlannerProvider>");
  return useStore(store, selector);
}

/** The raw store api, for effects that need getState()/subscribe (e.g. WebMCP registration). */
export function usePlannerStoreApi(): PlannerStoreApi {
  const store = useContext(PlannerContext);
  if (!store) throw new Error("usePlannerStoreApi must be used inside <PlannerProvider>");
  return store;
}
