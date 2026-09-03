/**
 * Zod validators and hand-written JSON Schemas for every WebMCP tool.
 *
 * Every tool gets both: the zod schema is what buildTools.ts actually runs
 * against the raw `execute(input)` argument (untrusted, could be anything),
 * and the JSON Schema is what gets registered as `inputSchema` so an agent
 * can see the shape before calling the tool. Keep the two in sync by hand;
 * there are only 21 tools and the extra clarity of a literal JSON Schema
 * object is worth the duplication.
 */

import { z, type ZodType, type ZodTypeAny } from "zod";
import type { JsonSchema } from "./types";

// ---------------------------------------------------------------------------
// Tool names
// ---------------------------------------------------------------------------

export const TOOL_NAMES = [
  // read-only
  "get_city_pack",
  "get_trip_context",
  "find_place_options",
  "inspect_route_segment",
  "check_route_constraints",
  "compare_route_options",
  "simulate_route_disruption",
  "get_recent_route_reports",
  "get_score_breakdown",
  "list_saved_plans",
  // reversible
  "find_route_options",
  "set_route_preferences",
  "show_route_on_scene",
  "focus_route_segment",
  "create_draft_route_plan",
  "select_primary_route",
  "select_backup_route",
  "draft_service_report",
  // confirmation-gated
  "save_route_plan",
  "share_route_plan",
  "publish_service_report",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

const ID_PATTERN = /^[a-z0-9_]+$/;
const ID_JSON_PATTERN = "^[a-z0-9_]+$";

const idSchema = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .max(80, `${label} must be 80 characters or fewer.`)
    .regex(ID_PATTERN, `${label} must be a lowercase snake_case id.`);

const idJsonSchema = (description: string): JsonSchema => ({
  type: "string",
  minLength: 1,
  maxLength: 80,
  pattern: ID_JSON_PATTERN,
  description,
});

const querySchema = z
  .string()
  .min(1, "query is required.")
  .max(80, "query must be 80 characters or fewer.");

const priorityValues = ["low", "medium", "high"] as const;
const priorityEnum = z.enum(priorityValues);
const priorityJsonSchema = (description: string): JsonSchema => ({
  type: "string",
  enum: [...priorityValues],
  description,
});

const reportCategoryValues = ["delay", "blocked_path", "accessibility", "crowding", "weather", "other"] as const;
const reportCategoryEnum = z.enum(reportCategoryValues);

const displayModeValues = ["primary", "backup", "candidate"] as const;
const displayModeEnum = z.enum(displayModeValues);

const comparisonCriterionValues = [
  "reliability",
  "fare",
  "walking",
  "arrival_buffer",
  "transfers",
  "accessibility",
  "rain_exposure",
  "duration",
] as const;
const comparisonCriterionEnum = z.enum(comparisonCriterionValues);

/** ISO 8601 timestamp with an explicit offset, e.g. "2026-09-04T07:00:00+02:00". */
const isoDateTime = z
  .string()
  .min(1, "must be an ISO 8601 timestamp.")
  .max(40, "timestamp is too long.")
  .datetime({ offset: true, message: "must be an ISO 8601 timestamp with a UTC offset." });

const isoDateTimeJsonSchema = (description: string): JsonSchema => ({
  type: "string",
  format: "date-time",
  minLength: 1,
  maxLength: 40,
  description,
});

const fareJsonSchema = (description: string): JsonSchema => ({ type: "number", minimum: 0, maximum: 500, description });
const transfersJsonSchema = (description: string): JsonSchema => ({ type: "integer", minimum: 0, maximum: 6, description });
const walkingJsonSchema = (description: string): JsonSchema => ({ type: "number", minimum: 0, maximum: 20000, description });

const emptyZod = z.object({}).strict();
const emptyJsonSchema: JsonSchema = { type: "object", properties: {}, additionalProperties: false };

// ---------------------------------------------------------------------------
// Per-tool zod schemas
// ---------------------------------------------------------------------------

const preferencePatchFields = {
  max_fare: z.number().min(0, "max_fare must be at least 0.").max(500, "max_fare must be 500 or less.").optional(),
  max_transfers: z.number().int("max_transfers must be a whole number.").min(0).max(6).optional(),
  max_walking_meters: z.number().min(0).max(20000).optional(),
  reliability_priority: priorityEnum.optional(),
  walking_priority: priorityEnum.optional(),
  fare_priority: priorityEnum.optional(),
  avoid_stairs: z.boolean().optional(),
  minimize_rain_exposure: z.boolean().optional(),
};

const findRouteOptionsZod = z
  .object({
    origin_id: idSchema("origin_id").optional(),
    destination_id: idSchema("destination_id").optional(),
    depart_at: isoDateTime.optional(),
    arrival_deadline: isoDateTime.optional(),
    ...preferencePatchFields,
  })
  .strict();

const setRoutePreferencesZod = z.object({ ...preferencePatchFields }).strict();

const zodByName = {
  get_city_pack: emptyZod,
  get_trip_context: emptyZod,
  find_place_options: z.object({ query: querySchema }).strict(),
  find_route_options: findRouteOptionsZod,
  inspect_route_segment: z.object({ route_id: idSchema("route_id"), segment_id: idSchema("segment_id") }).strict(),
  check_route_constraints: z.object({ route_id: idSchema("route_id") }).strict(),
  compare_route_options: z
    .object({
      route_ids: z.array(idSchema("route_ids[]")).min(1).max(10).optional(),
      criteria: z.array(comparisonCriterionEnum).min(1).max(8).optional(),
    })
    .strict(),
  simulate_route_disruption: z
    .object({
      route_id: idSchema("route_id"),
      delay_minutes: z.number().int("delay_minutes must be a whole number.").min(1, "delay_minutes must be at least 1.").max(180, "delay_minutes must be 180 or less."),
      segment_id: idSchema("segment_id").optional(),
    })
    .strict(),
  get_recent_route_reports: z.object({ segment_id: idSchema("segment_id").optional() }).strict(),
  get_score_breakdown: z.object({ route_id: idSchema("route_id") }).strict(),
  list_saved_plans: emptyZod,
  set_route_preferences: setRoutePreferencesZod,
  show_route_on_scene: z
    .object({
      route_id: idSchema("route_id"),
      display_mode: displayModeEnum.optional(),
      segment_id: idSchema("segment_id").optional(),
      camera_target: idSchema("camera_target").optional(),
      keep_others_visible: z.boolean().optional(),
    })
    .strict(),
  focus_route_segment: z.object({ route_id: idSchema("route_id"), segment_id: idSchema("segment_id") }).strict(),
  create_draft_route_plan: z
    .object({
      primary_route_id: idSchema("primary_route_id"),
      backup_route_id: idSchema("backup_route_id").optional(),
      rationale: z.string().max(400, "rationale must be 400 characters or fewer.").optional(),
      backup_trigger: z.string().max(200, "backup_trigger must be 200 characters or fewer.").optional(),
    })
    .strict(),
  select_primary_route: z.object({ route_id: idSchema("route_id") }).strict(),
  select_backup_route: z.object({ route_id: idSchema("route_id").nullable() }).strict(),
  draft_service_report: z
    .object({
      segment_id: idSchema("segment_id"),
      category: reportCategoryEnum,
      text: z
        .string()
        .min(8, "text must be at least 8 characters.")
        .max(280, "text must be 280 characters or fewer."),
      observed_at: isoDateTime.optional(),
      landmark_id: idSchema("landmark_id").optional(),
      expires_at: isoDateTime.optional(),
    })
    .strict(),
  save_route_plan: z.object({ draft_id: idSchema("draft_id") }).strict(),
  share_route_plan: z.object({ plan_id: idSchema("plan_id") }).strict(),
  publish_service_report: z.object({ report_draft_id: idSchema("report_draft_id") }).strict(),
} satisfies Record<ToolName, ZodTypeAny>;

// ---------------------------------------------------------------------------
// Per-tool JSON Schemas (hand-written, kept in sync with the zod above)
// ---------------------------------------------------------------------------

const preferencePatchProperties: Record<string, JsonSchema> = {
  max_fare: fareJsonSchema("Maximum fare the traveler will accept, in the city pack's currency."),
  max_transfers: transfersJsonSchema("Maximum number of transit transfers the traveler will accept."),
  max_walking_meters: walkingJsonSchema("Maximum total walking distance in meters."),
  reliability_priority: priorityJsonSchema("How much to weight route reliability when ranking options."),
  walking_priority: priorityJsonSchema("How much to weight minimizing walking distance when ranking options."),
  fare_priority: priorityJsonSchema("How much to weight minimizing fare when ranking options."),
  avoid_stairs: { type: "boolean", description: "Prefer routes with step-free access and penalize routes with stairs." },
  minimize_rain_exposure: { type: "boolean", description: "Prefer routes with less outdoor, uncovered walking." },
};

const jsonByName: Record<ToolName, JsonSchema> = {
  get_city_pack: emptyJsonSchema,
  get_trip_context: emptyJsonSchema,
  find_place_options: {
    type: "object",
    properties: {
      query: { type: "string", minLength: 1, maxLength: 80, description: "Free-text place name or partial name to search for, e.g. \"riverside\"." },
    },
    required: ["query"],
    additionalProperties: false,
  },
  find_route_options: {
    type: "object",
    properties: {
      origin_id: idJsonSchema("Landmark id to start from. Defaults to the current trip origin if omitted."),
      destination_id: idJsonSchema("Landmark id to travel to. Defaults to the current trip destination if omitted."),
      depart_at: isoDateTimeJsonSchema("Departure time as an ISO 8601 timestamp with a UTC offset. Defaults to the current trip's departure time."),
      arrival_deadline: isoDateTimeJsonSchema("Latest acceptable arrival time as an ISO 8601 timestamp with a UTC offset. Defaults to the current trip's deadline."),
      ...preferencePatchProperties,
    },
    additionalProperties: false,
  },
  inspect_route_segment: {
    type: "object",
    properties: {
      route_id: idJsonSchema("Stable route id from find_route_options or compare_route_options."),
      segment_id: idJsonSchema("Stable segment id belonging to that route."),
    },
    required: ["route_id", "segment_id"],
    additionalProperties: false,
  },
  check_route_constraints: {
    type: "object",
    properties: { route_id: idJsonSchema("Stable route id to check against the current preferences and deadline.") },
    required: ["route_id"],
    additionalProperties: false,
  },
  compare_route_options: {
    type: "object",
    properties: {
      route_ids: {
        type: "array",
        items: idJsonSchema("Stable route id to include in the comparison."),
        minItems: 1,
        maxItems: 10,
        description: "Route ids to compare. Defaults to all currently ranked routes if omitted.",
      },
      criteria: {
        type: "array",
        items: { type: "string", enum: [...comparisonCriterionValues], description: "One comparison criterion." },
        minItems: 1,
        maxItems: 8,
        description: "Which criteria to compare on. Defaults to every supported criterion if omitted.",
      },
    },
    additionalProperties: false,
  },
  simulate_route_disruption: {
    type: "object",
    properties: {
      route_id: idJsonSchema("Stable route id to simulate a delay on."),
      delay_minutes: { type: "integer", minimum: 1, maximum: 180, description: "Extra delay to apply, in minutes." },
      segment_id: idJsonSchema("Optional segment id where the delay originates. Defaults to the start of the route."),
    },
    required: ["route_id", "delay_minutes"],
    additionalProperties: false,
  },
  get_recent_route_reports: {
    type: "object",
    properties: { segment_id: idJsonSchema("Limit results to reports on this segment. Omit to get reports for every segment.") },
    additionalProperties: false,
  },
  get_score_breakdown: {
    type: "object",
    properties: { route_id: idJsonSchema("Stable route id to read the score breakdown for.") },
    required: ["route_id"],
    additionalProperties: false,
  },
  list_saved_plans: emptyJsonSchema,
  set_route_preferences: {
    type: "object",
    properties: preferencePatchProperties,
    additionalProperties: false,
  },
  show_route_on_scene: {
    type: "object",
    properties: {
      route_id: idJsonSchema("Stable route id to display in the 3D scene."),
      display_mode: { type: "string", enum: [...displayModeValues], description: "Whether this route becomes the primary, the backup, or is shown only as a candidate." },
      segment_id: idJsonSchema("Optional segment id to focus the camera on."),
      camera_target: idJsonSchema("Optional landmark id to point the camera at. Ignored if segment_id is given."),
      keep_others_visible: { type: "boolean", description: "When true (default), other ranked routes stay visible but faded. When false, only this route is shown." },
    },
    required: ["route_id"],
    additionalProperties: false,
  },
  focus_route_segment: {
    type: "object",
    properties: {
      route_id: idJsonSchema("Stable route id that owns the segment."),
      segment_id: idJsonSchema("Stable segment id to focus the camera on."),
    },
    required: ["route_id", "segment_id"],
    additionalProperties: false,
  },
  create_draft_route_plan: {
    type: "object",
    properties: {
      primary_route_id: idJsonSchema("Route id to propose as the primary route."),
      backup_route_id: idJsonSchema("Optional route id to propose as the backup route."),
      rationale: { type: "string", maxLength: 400, description: "Optional plain-language reason for this pairing. Auto-generated from the score breakdown if omitted." },
      backup_trigger: { type: "string", maxLength: 200, description: "Optional plain-language condition for switching to the backup. Auto-generated if omitted." },
    },
    required: ["primary_route_id"],
    additionalProperties: false,
  },
  select_primary_route: {
    type: "object",
    properties: { route_id: idJsonSchema("Route id to make the primary route.") },
    required: ["route_id"],
    additionalProperties: false,
  },
  select_backup_route: {
    type: "object",
    properties: {
      route_id: {
        anyOf: [idJsonSchema("Route id to make the backup route."), { type: "null", description: "Pass null to clear the backup route." }],
        description: "Route id to make the backup route, or null to clear it.",
      },
    },
    required: ["route_id"],
    additionalProperties: false,
  },
  draft_service_report: {
    type: "object",
    properties: {
      segment_id: idJsonSchema("Stable segment id the report is about."),
      category: { type: "string", enum: [...reportCategoryValues], description: "What kind of observation this is." },
      text: { type: "string", minLength: 8, maxLength: 280, description: "Plain-language observation. Exact addresses and links are stripped before saving." },
      observed_at: isoDateTimeJsonSchema("When this was observed, as an ISO 8601 timestamp with a UTC offset. Defaults to the current simulated time."),
      landmark_id: idJsonSchema("Optional approximate landmark id. Never use an exact private address. Defaults to the segment's destination landmark."),
      expires_at: isoDateTimeJsonSchema("When this report should stop being shown, as an ISO 8601 timestamp with a UTC offset. Defaults to 3 hours after observed_at."),
    },
    required: ["segment_id", "category", "text"],
    additionalProperties: false,
  },
  save_route_plan: {
    type: "object",
    properties: { draft_id: idJsonSchema("Draft id returned by create_draft_route_plan.") },
    required: ["draft_id"],
    additionalProperties: false,
  },
  share_route_plan: {
    type: "object",
    properties: { plan_id: idJsonSchema("Saved plan id returned by save_route_plan after the human confirms.") },
    required: ["plan_id"],
    additionalProperties: false,
  },
  publish_service_report: {
    type: "object",
    properties: { report_draft_id: idJsonSchema("Report draft id returned by draft_service_report.") },
    required: ["report_draft_id"],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export const toolSchemas: Record<ToolName, { zod: ZodTypeAny; json: JsonSchema }> = Object.fromEntries(
  TOOL_NAMES.map((name) => [name, { zod: zodByName[name], json: jsonByName[name] }]),
) as unknown as Record<ToolName, { zod: ZodTypeAny; json: JsonSchema }>;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * Validates `input` against `schema` and returns a short, sanitized error
 * message on failure: the first issue's path and message only. Never echoes
 * back the raw input (it may be large or contain untrusted text) and never
 * leaks a stack trace.
 */
export function validate<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const issue = result.error.issues[0];
  const path = issue.path.length ? issue.path.join(".") : "(root)";
  const message = `${path}: ${issue.message}`.slice(0, 200);
  return { ok: false, message };
}
