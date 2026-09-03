import { describe, expect, it } from "vitest";
import { createPlannerStore } from "@/lib/planner-store";
import { defaultCityPack } from "@/lib/city-packs";
import { buildRouteRoomTools } from "@/lib/webmcp/buildTools";
import { toolMeta } from "@/lib/webmcp/toolDescriptions";
import { TOOL_NAMES, toolSchemas, validate, type ToolName } from "@/lib/webmcp/toolSchemas";
import type { ToolDefinition } from "@/lib/webmcp/types";

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

describe("tool schema and metadata contracts", () => {
  it("every tool name has a schema and metadata entry", () => {
    for (const name of TOOL_NAMES) {
      expect(toolSchemas[name], `missing schema for ${name}`).toBeDefined();
      expect(toolSchemas[name].zod).toBeDefined();
      expect(toolSchemas[name].json).toBeDefined();
      expect(toolMeta[name], `missing meta for ${name}`).toBeDefined();
    }
  });

  it("tool names are unique and snake_case", () => {
    const seen = new Set<string>();
    for (const name of TOOL_NAMES) {
      expect(SNAKE_CASE.test(name), `${name} is not snake_case`).toBe(true);
      expect(seen.has(name), `${name} is duplicated`).toBe(false);
      seen.add(name);
    }
    expect(seen.size).toBe(TOOL_NAMES.length);
  });

  it("read-only tools are annotated readOnlyHint: true", () => {
    for (const name of TOOL_NAMES) {
      const meta = toolMeta[name];
      if (meta.trust === "read_only") {
        expect(meta.annotations.readOnlyHint, `${name} should be readOnlyHint: true`).toBe(true);
      }
    }
  });

  it("reversible and confirmation-gated tools are annotated readOnlyHint: false", () => {
    for (const name of TOOL_NAMES) {
      const meta = toolMeta[name];
      if (meta.trust === "reversible" || meta.trust === "confirmation_gated") {
        expect(meta.annotations.readOnlyHint, `${name} should be readOnlyHint: false`).toBe(false);
      }
    }
  });

  it("confirmation-gated tools are destructiveHint: true and mention confirmation in their description", () => {
    const gated: ToolName[] = ["save_route_plan", "share_route_plan", "publish_service_report"];
    for (const name of gated) {
      const meta = toolMeta[name];
      expect(meta.trust).toBe("confirmation_gated");
      expect(meta.annotations.destructiveHint, `${name} should be destructiveHint: true`).toBe(true);
      expect(meta.description.toLowerCase()).toContain("confirm");
    }
  });

  it("find_place_options no longer exists as a tool", () => {
    expect(TOOL_NAMES).not.toContain("find_place_options");
    expect((toolSchemas as Record<string, unknown>).find_place_options).toBeUndefined();
    expect((toolMeta as Record<string, unknown>).find_place_options).toBeUndefined();
  });

  it("list_trips and select_trip exist with the correct trust and annotations", () => {
    expect(TOOL_NAMES).toContain("list_trips");
    expect(TOOL_NAMES).toContain("select_trip");
    expect(toolMeta.list_trips.trust).toBe("read_only");
    expect(toolMeta.list_trips.annotations.readOnlyHint).toBe(true);
    expect(toolMeta.select_trip.trust).toBe("reversible");
    expect(toolMeta.select_trip.annotations.readOnlyHint).toBe(false);
  });

  it("validate rejects additional properties on get_trip_context", () => {
    const result = validate(toolSchemas.get_trip_context.zod, { extra: "nope" });
    expect(result.ok).toBe(false);
  });

  it("validate rejects delay_minutes 999 for simulate_route_disruption", () => {
    const result = validate(toolSchemas.simulate_route_disruption.zod, { route_id: "route_tram_4", delay_minutes: 999 });
    expect(result.ok).toBe(false);
  });

  it("validate accepts a partial constraint patch for find_route_options", () => {
    const result = validate(toolSchemas.find_route_options.zod, { max_fare: 8, avoid_stairs: true });
    expect(result.ok).toBe(true);
  });

  it("validate rejects origin_id, destination_id, and depart_at for find_route_options", () => {
    expect(validate(toolSchemas.find_route_options.zod, { origin_id: "central_station" }).ok).toBe(false);
    expect(validate(toolSchemas.find_route_options.zod, { destination_id: "riverside_center" }).ok).toBe(false);
    expect(validate(toolSchemas.find_route_options.zod, { depart_at: "2026-09-04T07:00:00+02:00" }).ok).toBe(false);
  });

  it("validate accepts a trip_id for select_trip and rejects a missing one", () => {
    expect(validate(toolSchemas.select_trip.zod, { trip_id: "trip_centraal_to_rai" }).ok).toBe(true);
    expect(validate(toolSchemas.select_trip.zod, {}).ok).toBe(false);
  });
});

function getTool(tools: ToolDefinition[], name: ToolName): ToolDefinition {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Tool "${name}" was not built.`);
  return tool;
}

describe("buildRouteRoomTools integration", () => {
  it("builds exactly the 22 documented tools", () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    expect(TOOL_NAMES.length).toBe(22);
    expect(tools.map((tool) => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it("get_trip_context reports the current primary route id, active trip id, and curated-snapshot data_kind", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const result = await getTool(tools, "get_trip_context").execute({});
    expect(result.primary_route_id).toBe(store.getState().primaryRouteId);
    expect(result.trip_id).toBe(store.getState().trip.tripId);
    expect(result.data_kind).toBe("curated_snapshot");
    expect(result.changes_page_state).toBe(false);
  });

  it("list_trips reads the active city pack's trips without changing state", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const result = await getTool(tools, "list_trips").execute({});
    expect(Array.isArray(result.trips)).toBe(true);
    expect(result.active_trip_id).toBe(store.getState().trip.tripId);
    expect(result.changes_page_state).toBe(false);
  });

  it("select_trip returns not_found for a bogus trip id and changes nothing", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const before = store.getState().trip.tripId;
    const result = await getTool(tools, "select_trip").execute({ trip_id: "trip_does_not_exist" });
    expect(result.status).toBe("not_found");
    expect(result.changes_page_state).toBe(false);
    expect(store.getState().trip.tripId).toBe(before);
  });

  it("create_draft_route_plan then save_route_plan requires human confirmation, and the agent cannot save without it", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const { primaryRouteId, backupRouteId } = store.getState();

    const draftResult = await getTool(tools, "create_draft_route_plan").execute({
      primary_route_id: primaryRouteId,
      backup_route_id: backupRouteId,
    });
    expect(draftResult.status).toBe("draft_created");
    expect(draftResult.trip_id).toBe(store.getState().trip.tripId);
    const draftId = draftResult.draft_id as string;
    expect(draftId).toBeTruthy();

    const firstSave = await getTool(tools, "save_route_plan").execute({ draft_id: draftId });
    expect(firstSave.status).toBe("confirmation_required");
    expect(firstSave.requires_human_confirmation).toBe(true);
    expect(store.getState().savedPlans).toHaveLength(0);

    const secondSave = await getTool(tools, "save_route_plan").execute({ draft_id: draftId });
    expect(secondSave.status).toBe("confirmation_required");
    expect(store.getState().savedPlans).toHaveLength(0);
  });

  it("save_route_plan rejects an unknown draft id without touching state", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const result = await getTool(tools, "save_route_plan").execute({ draft_id: "draft_does_not_exist" });
    expect(result.status).toBe("not_found");
    expect(store.getState().savedPlans).toHaveLength(0);
  });

  it("inspect_route_segment returns a segment summary without scene coordinates", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const result = await getTool(tools, "inspect_route_segment").execute({
      route_id: "route_metro_52",
      segment_id: "seg_metro52_ride",
    });
    expect(result.status).toBeUndefined();
    const segment = result.segment as Record<string, unknown>;
    expect(segment.segment_id).toBe("seg_metro52_ride");
    expect(segment.points).toBeUndefined();
    expect(segment.path).toBeUndefined();
  });

  it("find_route_options results are labeled as a curated snapshot and never carry segment paths", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const result = await getTool(tools, "find_route_options").execute({ max_fare: 8 });
    expect(result.data_kind).toBe("curated_snapshot");
    expect(result.trip_id).toBe(store.getState().trip.tripId);
    const routes = result.routes as Record<string, unknown>[];
    for (const route of routes) {
      expect(route.data_kind).toBe("curated_snapshot");
      const segments = route.segments as Record<string, unknown>[];
      for (const segment of segments) {
        expect(segment.path).toBeUndefined();
      }
    }
  });

  it("invalid input never reaches the store and is reported as invalid_input", async () => {
    const store = createPlannerStore(defaultCityPack);
    const tools = buildRouteRoomTools(store);
    const before = store.getState().toolCallCount;
    const result = await getTool(tools, "simulate_route_disruption").execute({ route_id: "route_tram_4", delay_minutes: 999 });
    expect(result.status).toBe("invalid_input");
    expect(result.changes_page_state).toBe(false);
    expect(store.getState().toolCallCount).toBe(before);
  });
});
