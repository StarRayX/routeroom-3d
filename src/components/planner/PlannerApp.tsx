"use client";

import { PlannerProvider } from "@/lib/planner-context";
import { defaultCityPack } from "@/lib/city-packs";
import { PlannerWorkspace } from "./PlannerWorkspace";

/**
 * Owns the planner store for the whole page. Everything below this reads and
 * writes the same live state, whether the actor is the human or an agent
 * calling a WebMCP tool.
 */
export function PlannerApp() {
  return (
    <PlannerProvider city={defaultCityPack}>
      <PlannerWorkspace />
    </PlannerProvider>
  );
}
