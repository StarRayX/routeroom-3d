/**
 * Planner store: the single live state shared by the human UI and the WebMCP
 * tool layer. Buttons and tools call the SAME actions; every action takes an
 * `actor` so the activity log can distinguish human, agent, and system.
 *
 * Confirmation gate rule: saving, sharing, and publishing only happen through
 * `approveConfirmation`, which is wired to a human-clicked button in the UI.
 * WebMCP tools must NEVER call `approveConfirmation`. Tools call
 * `savePlan` / `sharePlan` / `publishServiceReport`, which return
 * `confirmation_required` and open the confirmation panel when the human has
 * not yet approved that exact draft.
 */

import { create } from "zustand";
import {
  ALL_CRITERIA,
  buildPlanSummary,
  compareRoutes,
  critiqueRoute,
  findRouteById,
  findSegment,
  getActiveReports,
  getLandmark,
  inspectSegment,
  rankRoutes,
  sanitizeReportText,
  simulateDisruption,
} from "./route-engine";
import { makeId } from "./format";
import type {
  ActivityEvent,
  ActivityKind,
  Actor,
  CityPack,
  ComparisonCriterion,
  ConfirmationKind,
  ConfirmationRequest,
  Critique,
  DisruptionSimulation,
  Preferences,
  RankedRoute,
  ReportCategory,
  RouteComparison,
  RoutePlanDraft,
  RouteReport,
  SavedPlan,
  SceneDisplayMode,
  SegmentInspection,
  ServiceReportDraft,
  Trip,
  TripContext,
  ViewMode,
  WebMcpStatus,
} from "./types";

export const MAX_ACTIVITY = 40;

export type ToolResultStatus =
  | "ok"
  | "not_found"
  | "invalid_input"
  | "confirmation_required"
  | "already_done";

export type PlannerData = {
  city: CityPack;
  trip: TripContext;
  /** Simulated clock used for evidence freshness. ISO. */
  now: string;
  ranked: RankedRoute[];
  comparison: RouteComparison;
  critique?: Critique;
  primaryRouteId?: string;
  backupRouteId?: string;
  visibleRouteIds: string[];
  displayModes: Record<string, SceneDisplayMode>;
  focusedSegmentId?: string;
  /** Landmark id the camera should frame. */
  cameraTarget?: string;
  lastInspection?: SegmentInspection;
  lastSimulation?: DisruptionSimulation;
  activity: ActivityEvent[];
  drafts: Record<string, RoutePlanDraft>;
  activeDraftId?: string;
  savedPlans: SavedPlan[];
  reportDrafts: Record<string, ServiceReportDraft>;
  userReports: RouteReport[];
  pendingConfirmation?: ConfirmationRequest;
  viewMode: ViewMode;
  webmcpStatus: WebMcpStatus;
  toolCallCount: number;
};

/**
 * RouteRoom compares the curated route options of the active trip. Origin,
 * destination, and departure come from the trip; only the deadline and the
 * preferences can be adjusted (CONTEXT.md: Trip).
 */
export type FindRoutesInput = Partial<Preferences> & {
  arrivalDeadline?: string;
};

export type ShowRouteInput = {
  displayMode?: SceneDisplayMode;
  segmentId?: string;
  cameraTarget?: string;
  /** When true, other routes stay visible but faded. Default true. */
  keepOthersVisible?: boolean;
};

export type CreateDraftInput = {
  primaryRouteId: string;
  backupRouteId?: string;
  rationale?: string;
  backupTrigger?: string;
};

export type DraftReportInput = {
  segmentId: string;
  category: ReportCategory;
  text: string;
  observedAt?: string;
  landmarkId?: string;
  expiresAt?: string;
};

export type ActionResult<T> = { status: "ok"; data: T } | { status: Exclude<ToolResultStatus, "ok">; message: string; data?: Partial<T> };

export type PlannerActions = {
  loadCityPack: (city: CityPack) => void;
  setViewMode: (mode: ViewMode) => void;
  setWebmcpStatus: (status: WebMcpStatus) => void;
  noteToolCall: (toolName: string) => void;
  logActivity: (actor: Actor, kind: ActivityKind, label: string, detail: string, toolName?: string) => void;

  /** Switch the active trip of the city pack. Resets ranking, selection, focus, and simulation; keeps drafts and plans. */
  selectTrip: (tripId: string, actor: Actor) => boolean;
  findRouteOptions: (input: FindRoutesInput, actor: Actor) => RankedRoute[];
  setPreferences: (patch: Partial<Preferences>, actor: Actor) => RankedRoute[];
  compare: (routeIds: string[] | undefined, criteria: ComparisonCriterion[] | undefined, actor: Actor) => RouteComparison;
  inspect: (routeId: string, segmentId: string, actor: Actor) => SegmentInspection | undefined;
  critiqueRoute: (routeId: string, actor: Actor) => Critique | undefined;
  simulate: (routeId: string, delayMinutes: number, segmentId: string | undefined, actor: Actor) => DisruptionSimulation | undefined;

  showRoute: (routeId: string, input: ShowRouteInput, actor: Actor) => { displayedRouteId: string; segmentIds: string[]; focusedSegmentId?: string; cameraTarget?: string } | undefined;
  focusSegment: (routeId: string, segmentId: string, actor: Actor) => { routeId: string; segmentId: string; cameraTarget?: string } | undefined;
  clearFocus: () => void;
  selectPrimary: (routeId: string, actor: Actor) => boolean;
  selectBackup: (routeId: string | undefined, actor: Actor) => boolean;

  createDraftPlan: (input: CreateDraftInput, actor: Actor) => ActionResult<RoutePlanDraft>;
  discardDraft: (draftId: string, actor: Actor) => void;
  savePlan: (draftId: string, actor: Actor) => ActionResult<SavedPlan>;
  sharePlan: (planId: string, actor: Actor) => ActionResult<SavedPlan & { shareUrl: string }>;

  draftServiceReport: (input: DraftReportInput, actor: Actor) => ActionResult<ServiceReportDraft>;
  discardReportDraft: (draftId: string, actor: Actor) => void;
  publishServiceReport: (draftId: string, actor: Actor) => ActionResult<RouteReport>;
  getRecentReports: (segmentId?: string) => RouteReport[];

  /** HUMAN ONLY. Wired to the confirm button. Never call from a WebMCP tool. */
  approveConfirmation: (confirmationId: string) => ActionResult<unknown>;
  dismissConfirmation: (actor: Actor) => void;
};

export type PlannerStore = PlannerData & PlannerActions;

const HOUR = 3600 * 1000;

function toIsoDateFallback(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function makeEvent(actor: Actor, kind: ActivityKind, label: string, detail: string, toolName?: string): ActivityEvent {
  return { id: makeId("evt"), actor, kind, label, detail, timestamp: new Date().toISOString(), toolName };
}

function allReports(city: CityPack, userReports: RouteReport[]): RouteReport[] {
  return [...city.reports, ...userReports];
}

function recompute(
  city: CityPack,
  trip: TripContext,
  userReports: RouteReport[],
  now: string,
  primaryRouteId?: string,
): Pick<PlannerData, "ranked" | "comparison" | "critique"> {
  const ranked = rankRoutes(city, trip, userReports, new Date(now));
  const comparison = compareRoutes(ranked, ranked.map((entry) => entry.route.id), ALL_CRITERIA, city);
  const critiqueTarget = primaryRouteId && ranked.some((entry) => entry.route.id === primaryRouteId) ? primaryRouteId : ranked[0]?.route.id;
  const critique = critiqueTarget ? critiqueRoute(ranked, critiqueTarget, city) : undefined;
  return { ranked, comparison, critique };
}

function resolveTrip(city: CityPack, tripId?: string): Trip {
  const trip = city.trips.find((candidate) => candidate.id === (tripId ?? city.defaultTripId)) ?? city.trips[0];
  if (!trip) throw new Error(`City pack "${city.id}" has no trips.`);
  return trip;
}

function tripContextFor(city: CityPack, trip: Trip, preferences: Preferences): TripContext {
  return {
    cityId: city.id,
    tripId: trip.id,
    originId: trip.originId,
    destinationId: trip.destinationId,
    departAt: trip.departAt,
    arrivalDeadline: trip.arrivalDeadline,
    preferences,
  };
}

function buildInitialData(city: CityPack, preferences: Preferences, tripId?: string): PlannerData {
  const activeTrip = resolveTrip(city, tripId);
  const trip = tripContextFor(city, activeTrip, preferences);
  const now = activeTrip.clockAt;
  const computed = recompute(city, trip, [], now);
  const primary = computed.ranked[0]?.route.id;
  const backup = computed.ranked.find((entry) => entry.route.id !== primary && entry.constraints.satisfied)?.route.id ?? computed.ranked[1]?.route.id;
  const displayModes: Record<string, SceneDisplayMode> = {};
  for (const entry of computed.ranked) displayModes[entry.route.id] = entry.route.id === primary ? "primary" : entry.route.id === backup ? "backup" : "candidate";
  return {
    city,
    trip,
    now,
    ...computed,
    primaryRouteId: primary,
    backupRouteId: backup,
    visibleRouteIds: computed.ranked.map((entry) => entry.route.id),
    displayModes,
    focusedSegmentId: undefined,
    cameraTarget: undefined,
    lastInspection: undefined,
    lastSimulation: undefined,
    activity: [makeEvent("system", "info", "RouteRoom ready", `${city.name} · ${city.district} loaded. Ask your agent to compare routes, or pick one yourself.`)],
    drafts: {},
    activeDraftId: undefined,
    savedPlans: [],
    reportDrafts: {},
    userReports: [],
    pendingConfirmation: undefined,
    viewMode: "3d",
    webmcpStatus: "checking",
    toolCallCount: 0,
  };
}

export const defaultPreferences: Preferences = {
  maxFare: 10,
  maxTransfers: 2,
  maxWalkingMeters: 1200,
  reliabilityPriority: "high",
  walkingPriority: "medium",
  farePriority: "medium",
  avoidStairs: true,
  minimizeRainExposure: true,
};

/**
 * The store is created lazily with a city pack via `loadCityPack`. Until then
 * it holds a placeholder that the page replaces on mount. Keeping creation
 * synchronous avoids SSR/CSR mismatch issues for the client-only planner.
 */
export function createPlannerStore(city: CityPack, preferences: Preferences = defaultPreferences) {
  return create<PlannerStore>()((set, get) => {
    const log = (actor: Actor, kind: ActivityKind, label: string, detail: string, toolName?: string) => {
      set((state) => ({ activity: [makeEvent(actor, kind, label, detail, toolName), ...state.activity].slice(0, MAX_ACTIVITY) }));
    };

    const modesFor = (state: PlannerData, primary?: string, backup?: string) => {
      const modes: Record<string, SceneDisplayMode> = {};
      for (const entry of state.ranked) modes[entry.route.id] = entry.route.id === primary ? "primary" : entry.route.id === backup ? "backup" : "candidate";
      return modes;
    };

    const openConfirmation = (kind: ConfirmationKind, targetId: string, title: string, sideEffect: string, details: string[], actor: Actor) => {
      const request: ConfirmationRequest = { id: makeId("confirm"), kind, targetId, title, sideEffect, details, requestedBy: actor, createdAt: new Date().toISOString() };
      set({ pendingConfirmation: request });
      log("system", "blocked", "Human confirmation required", `${title}. Nothing happens until you confirm in the panel.`);
      return request;
    };

    // ---- internal commits: only reachable through approveConfirmation ----
    const commitSave = (draftId: string): ActionResult<SavedPlan> => {
      const state = get();
      const draft = state.drafts[draftId];
      if (!draft) return { status: "not_found", message: "Draft not found." };
      if (draft.status !== "draft") {
        const existing = state.savedPlans.find((plan) => plan.id === draftId);
        return existing ? { status: "already_done", message: "This plan was already saved.", data: existing } : { status: "not_found", message: "Draft not found." };
      }
      const saved: SavedPlan = { ...draft, status: "saved", savedAt: new Date().toISOString() };
      set({
        drafts: { ...state.drafts, [draftId]: saved },
        savedPlans: [saved, ...state.savedPlans.filter((plan) => plan.id !== draftId)],
        pendingConfirmation: undefined,
      });
      log("human", "confirmed", "Plan saved", `You confirmed: ${draft.summary}`);
      return { status: "ok", data: saved };
    };

    const commitShare = (planId: string): ActionResult<SavedPlan & { shareUrl: string }> => {
      const state = get();
      const plan = state.savedPlans.find((candidate) => candidate.id === planId);
      if (!plan) return { status: "not_found", message: "Saved plan not found. Save the plan before sharing it." };
      const token = plan.shareToken ?? makeId("share").replace("share_", "");
      /** Share payload: c city, t trip, p primary, b backup, d deadline, r backup trigger. No coordinates, no personal data. */
      const payload = { c: state.city.id, t: plan.tripId, p: plan.primaryRouteId, b: plan.backupRouteId ?? null, d: plan.arrivalDeadline, r: plan.backupTrigger };
      const encoded = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) : "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/planner?plan=${encoded}`;
      const shared: SavedPlan = { ...plan, status: "shared", sharedAt: plan.sharedAt ?? new Date().toISOString(), shareToken: token };
      set({
        savedPlans: state.savedPlans.map((candidate) => (candidate.id === planId ? shared : candidate)),
        drafts: { ...state.drafts, [planId]: shared },
        pendingConfirmation: undefined,
      });
      log("human", "confirmed", "Plan shared", "You confirmed sharing a read-only link to this plan.");
      return { status: "ok", data: { ...shared, shareUrl } };
    };

    const commitPublish = (draftId: string): ActionResult<RouteReport> => {
      const state = get();
      const draft = state.reportDrafts[draftId];
      if (!draft) return { status: "not_found", message: "Report draft not found." };
      if (draft.status === "published") {
        const existing = state.userReports.find((report) => report.id === draftId);
        return existing ? { status: "already_done", message: "This report was already published.", data: existing } : { status: "not_found", message: "Report draft not found." };
      }
      const report: RouteReport = {
        id: draft.id,
        segmentId: draft.segmentId,
        category: draft.category,
        text: draft.text,
        observedAt: draft.observedAt,
        expiresAt: draft.expiresAt,
        confidence: "low",
        landmarkId: draft.landmarkId,
        source: "user",
      };
      const userReports = [report, ...state.userReports];
      const computed = recompute(state.city, state.trip, userReports, state.now, state.primaryRouteId);
      set({
        reportDrafts: { ...state.reportDrafts, [draftId]: { ...draft, status: "published" } },
        userReports,
        pendingConfirmation: undefined,
        ...computed,
      });
      log("human", "confirmed", "Report published", `You published a ${draft.category.replace("_", " ")} report on ${draft.segmentId}. It expires ${draft.expiresAt.slice(11, 16)}.`);
      return { status: "ok", data: report };
    };

    return {
      ...buildInitialData(city, preferences),

      loadCityPack: (nextCity) => {
        const state = get();
        set({ ...buildInitialData(nextCity, state.trip.preferences), viewMode: state.viewMode, webmcpStatus: state.webmcpStatus });
      },
      setViewMode: (mode) => set({ viewMode: mode }),
      setWebmcpStatus: (status) => set({ webmcpStatus: status }),
      noteToolCall: (toolName) => { void toolName; set((state) => ({ toolCallCount: state.toolCallCount + 1 })); },
      logActivity: log,

      selectTrip: (tripId, actor) => {
        const state = get();
        const nextTrip = state.city.trips.find((candidate) => candidate.id === tripId);
        if (!nextTrip) return false;
        const trip = tripContextFor(state.city, nextTrip, state.trip.preferences);
        const now = nextTrip.clockAt;
        const computed = recompute(state.city, trip, state.userReports, now);
        const primary = computed.ranked[0]?.route.id;
        const backup = computed.ranked.find((entry) => entry.route.id !== primary && entry.constraints.satisfied)?.route.id ?? computed.ranked[1]?.route.id;
        set({
          trip,
          now,
          ...computed,
          primaryRouteId: primary,
          backupRouteId: backup,
          visibleRouteIds: computed.ranked.map((entry) => entry.route.id),
          displayModes: modesFor({ ...state, ...computed }, primary, backup),
          focusedSegmentId: undefined,
          cameraTarget: undefined,
          lastInspection: undefined,
          lastSimulation: undefined,
          pendingConfirmation: undefined,
        });
        log(actor, "suggestion", "Trip selected", `${nextTrip.name}: ${computed.ranked.length} curated route options. Top: ${computed.ranked[0]?.route.name ?? "none"}.`, "select_trip");
        return true;
      },

      findRouteOptions: (input, actor) => {
        const state = get();
        const { arrivalDeadline, ...prefPatch } = input;
        const cleanPatch = Object.fromEntries(Object.entries(prefPatch).filter(([, value]) => value !== undefined)) as Partial<Preferences>;
        const nextTrip: TripContext = {
          ...state.trip,
          arrivalDeadline: toIsoDateFallback(arrivalDeadline, state.trip.arrivalDeadline),
          preferences: { ...state.trip.preferences, ...cleanPatch },
        };
        const computed = recompute(state.city, nextTrip, state.userReports, state.now, state.primaryRouteId);
        const primary = computed.ranked.some((entry) => entry.route.id === state.primaryRouteId) ? state.primaryRouteId : computed.ranked[0]?.route.id;
        set({ trip: nextTrip, ...computed, primaryRouteId: primary, visibleRouteIds: computed.ranked.map((entry) => entry.route.id), displayModes: modesFor({ ...state, ...computed }, primary, state.backupRouteId) });
        const changed = Object.keys(cleanPatch).length;
        log(actor, "read", "Found route options", `${computed.ranked.length} candidates ranked${changed ? ` with ${changed} updated constraint${changed === 1 ? "" : "s"}` : ""}. Top: ${computed.ranked[0]?.route.name ?? "none"}.`, "find_route_options");
        return computed.ranked;
      },

      setPreferences: (patch, actor) => {
        const state = get();
        const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Preferences>;
        const nextTrip: TripContext = { ...state.trip, preferences: { ...state.trip.preferences, ...cleanPatch } };
        const computed = recompute(state.city, nextTrip, state.userReports, state.now);
        const previousTop = state.ranked[0]?.route.id;
        const primary = computed.ranked[0]?.route.id;
        const backup = state.backupRouteId && state.backupRouteId !== primary ? state.backupRouteId : computed.ranked.find((entry) => entry.route.id !== primary)?.route.id;
        set({ trip: nextTrip, ...computed, primaryRouteId: primary, backupRouteId: backup, displayModes: modesFor({ ...state, ...computed }, primary, backup) });
        const keys = Object.keys(cleanPatch).join(", ") || "nothing";
        log(actor, "suggestion", "Priorities changed", `${keys} updated. ${previousTop !== primary ? `Recommendation moved from ${state.ranked.find((entry) => entry.route.id === previousTop)?.route.name ?? previousTop} to ${computed.ranked[0]?.route.name}.` : `Recommendation unchanged: ${computed.ranked[0]?.route.name}.`}`, "set_route_preferences");
        return computed.ranked;
      },

      compare: (routeIds, criteria, actor) => {
        const state = get();
        const ids = routeIds && routeIds.length ? routeIds.filter((id) => state.ranked.some((entry) => entry.route.id === id)) : state.ranked.map((entry) => entry.route.id);
        const comparison = compareRoutes(state.ranked, ids, criteria && criteria.length ? criteria : ALL_CRITERIA, state.city);
        set({ comparison });
        log(actor, "read", "Compared routes", `${ids.length} routes across ${comparison.criteria.length} criteria. Recommended: ${state.ranked.find((entry) => entry.route.id === comparison.recommendedRouteId)?.route.name ?? "none"}.`, "compare_route_options");
        return comparison;
      },

      inspect: (routeId, segmentId, actor) => {
        const state = get();
        const inspection = inspectSegment(state.city, routeId, segmentId, allReports(state.city, state.userReports), new Date(state.now));
        if (!inspection) return undefined;
        set({ lastInspection: inspection });
        log(actor, "read", "Inspected segment", `${inspection.segment.label} on ${findRouteById(state.city, routeId)?.name ?? routeId}: ${inspection.activeReports.length} active report${inspection.activeReports.length === 1 ? "" : "s"}.`, "inspect_route_segment");
        return inspection;
      },

      critiqueRoute: (routeId, actor) => {
        const state = get();
        const critique = critiqueRoute(state.ranked, routeId, state.city);
        if (!critique) return undefined;
        set({ critique });
        log(actor, "read", "Critic pass", critique.headline, "check_route_constraints");
        return critique;
      },

      simulate: (routeId, delayMinutes, segmentId, actor) => {
        const state = get();
        const simulation = simulateDisruption(state.ranked, state.trip, routeId, delayMinutes, segmentId);
        if (!simulation) return undefined;
        set({ lastSimulation: simulation });
        const name = findRouteById(state.city, routeId)?.name ?? routeId;
        log(actor, "suggestion", "Simulated disruption", `+${delayMinutes} min on ${name}: ${simulation.stillMeetsDeadline ? "still meets the deadline" : "misses the deadline"}. ${simulation.suggestedBackupRouteId ? `Suggested backup: ${findRouteById(state.city, simulation.suggestedBackupRouteId)?.name}.` : "No backup meets the deadline."}`, "simulate_route_disruption");
        return simulation;
      },

      showRoute: (routeId, input, actor) => {
        const state = get();
        const route = findRouteById(state.city, routeId);
        if (!route) return undefined;
        const segmentId = input.segmentId && route.segments.some((segment) => segment.id === input.segmentId) ? input.segmentId : undefined;
        const cameraTarget = input.cameraTarget && getLandmark(state.city, input.cameraTarget) ? input.cameraTarget : segmentId ? route.segments.find((segment) => segment.id === segmentId)?.toLandmarkId : undefined;
        const mode: SceneDisplayMode = input.displayMode ?? "primary";
        let primary = state.primaryRouteId;
        let backup = state.backupRouteId;
        if (mode === "primary") {
          primary = routeId;
          if (backup === routeId) backup = state.ranked.find((entry) => entry.route.id !== routeId)?.route.id;
        } else if (mode === "backup") {
          backup = routeId;
          if (primary === routeId) primary = state.ranked.find((entry) => entry.route.id !== routeId)?.route.id;
        }
        const visibleRouteIds = input.keepOthersVisible === false ? [routeId] : state.ranked.map((entry) => entry.route.id);
        const critique = mode === "primary" ? critiqueRoute(state.ranked, routeId, state.city) : state.critique;
        set({ primaryRouteId: primary, backupRouteId: backup, displayModes: modesFor(state, primary, backup), visibleRouteIds, focusedSegmentId: segmentId, cameraTarget, critique });
        log(actor, "suggestion", "Scene updated", `${route.name} shown as ${mode}${segmentId ? `, focused on ${route.segments.find((segment) => segment.id === segmentId)?.label}` : ""}.`, "show_route_on_scene");
        return { displayedRouteId: routeId, segmentIds: route.segments.map((segment) => segment.id), focusedSegmentId: segmentId, cameraTarget };
      },

      focusSegment: (routeId, segmentId, actor) => {
        const state = get();
        const found = findSegment(state.city, routeId, segmentId);
        if (!found) return undefined;
        const cameraTarget = found.segment.toLandmarkId;
        set({ focusedSegmentId: segmentId, cameraTarget, visibleRouteIds: state.visibleRouteIds.includes(routeId) ? state.visibleRouteIds : [...state.visibleRouteIds, routeId] });
        log(actor, "suggestion", "Focused segment", `Camera moved to ${found.segment.label}.`, "focus_route_segment");
        return { routeId, segmentId, cameraTarget };
      },

      clearFocus: () => set({ focusedSegmentId: undefined, cameraTarget: undefined }),

      selectPrimary: (routeId, actor) => {
        const state = get();
        const route = findRouteById(state.city, routeId);
        if (!route) return false;
        const backup = state.backupRouteId === routeId ? state.ranked.find((entry) => entry.route.id !== routeId)?.route.id : state.backupRouteId;
        set({ primaryRouteId: routeId, backupRouteId: backup, displayModes: modesFor(state, routeId, backup), critique: critiqueRoute(state.ranked, routeId, state.city) });
        log(actor, "suggestion", "Primary route selected", `${route.name} is now the primary candidate.`, "select_primary_route");
        return true;
      },

      selectBackup: (routeId, actor) => {
        const state = get();
        if (routeId && !findRouteById(state.city, routeId)) return false;
        const backup = routeId && routeId !== state.primaryRouteId ? routeId : undefined;
        set({ backupRouteId: backup, displayModes: modesFor(state, state.primaryRouteId, backup) });
        log(actor, "suggestion", "Backup route selected", backup ? `${findRouteById(state.city, backup)?.name} is now the backup.` : "Backup cleared.", "select_backup_route");
        return true;
      },

      createDraftPlan: (input, actor) => {
        const state = get();
        const primary = state.ranked.find((entry) => entry.route.id === input.primaryRouteId);
        if (!primary) return { status: "not_found", message: `Unknown primary route "${input.primaryRouteId}".` };
        const backup = input.backupRouteId ? state.ranked.find((entry) => entry.route.id === input.backupRouteId) : undefined;
        if (input.backupRouteId && !backup) return { status: "not_found", message: `Unknown backup route "${input.backupRouteId}".` };
        if (backup && backup.route.id === primary.route.id) return { status: "invalid_input", message: "Backup route must differ from the primary route." };
        const backupTrigger = sanitizeReportText(input.backupTrigger ?? (backup ? `${primary.route.name} is delayed more than ${Math.max(5, Math.round(primary.arrival.bufferMinutesTypical / 2))} minutes before departure.` : "No backup selected."), 200);
        const rationale = sanitizeReportText(input.rationale ?? primary.score.components.slice().sort((a, b) => b.weighted - a.weighted).slice(0, 2).map((component) => `${component.label}: ${component.inputValue}`).join(". "), 400);
        const draft: RoutePlanDraft = {
          id: makeId("draft"),
          tripId: state.trip.tripId,
          primaryRouteId: primary.route.id,
          backupRouteId: backup?.route.id,
          backupTrigger,
          rationale,
          preferenceSnapshot: { ...state.trip.preferences },
          arrivalDeadline: state.trip.arrivalDeadline,
          summary: buildPlanSummary(state.city, state.trip, primary, backup, backupTrigger),
          createdAt: new Date().toISOString(),
          createdBy: actor,
          status: "draft",
        };
        set({ drafts: { ...state.drafts, [draft.id]: draft }, activeDraftId: draft.id, primaryRouteId: primary.route.id, backupRouteId: backup?.route.id, displayModes: modesFor(state, primary.route.id, backup?.route.id), pendingConfirmation: undefined });
        log(actor, "draft", "Draft plan created", `${draft.summary} Not saved yet.`, "create_draft_route_plan");
        return { status: "ok", data: draft };
      },

      discardDraft: (draftId, actor) => {
        const state = get();
        if (!state.drafts[draftId] || state.drafts[draftId].status !== "draft") return;
        const drafts = { ...state.drafts };
        delete drafts[draftId];
        set({ drafts, activeDraftId: state.activeDraftId === draftId ? undefined : state.activeDraftId, pendingConfirmation: state.pendingConfirmation?.targetId === draftId ? undefined : state.pendingConfirmation });
        log(actor, "info", "Draft discarded", "The draft plan was removed without saving.");
      },

      savePlan: (draftId, actor) => {
        const state = get();
        const draft = state.drafts[draftId];
        if (!draft) return { status: "not_found", message: `Unknown draft "${draftId}".` };
        if (draft.status !== "draft") {
          const saved = state.savedPlans.find((plan) => plan.id === draftId);
          return saved ? { status: "already_done", message: "This plan is already saved.", data: saved } : { status: "not_found", message: "Draft not found." };
        }
        const primaryName = findRouteById(state.city, draft.primaryRouteId)?.name ?? draft.primaryRouteId;
        const backupName = draft.backupRouteId ? findRouteById(state.city, draft.backupRouteId)?.name ?? draft.backupRouteId : "none";
        openConfirmation("save_plan", draftId, "Save this route plan?", "This stores the plan for this browser session. Nothing is shared or published.", [`Primary: ${primaryName}`, `Backup: ${backupName}`, `Backup trigger: ${draft.backupTrigger}`, draft.summary], actor);
        set({ activeDraftId: draftId });
        return { status: "confirmation_required", message: "The human must confirm the exact plan in the page before it is saved. The confirmation panel is now showing.", data: { id: draftId, summary: draft.summary } };
      },

      sharePlan: (planId, actor) => {
        const state = get();
        const plan = state.savedPlans.find((candidate) => candidate.id === planId);
        if (!plan) {
          const draft = state.drafts[planId];
          return draft ? { status: "invalid_input", message: "This plan is still a draft. It must be saved and confirmed before it can be shared." } : { status: "not_found", message: `Unknown plan "${planId}".` };
        }
        const primaryName = findRouteById(state.city, plan.primaryRouteId)?.name ?? plan.primaryRouteId;
        openConfirmation("share_plan", planId, "Share this route plan?", "This creates a read-only link anyone can open. It contains the route names, backup trigger, and deadline. It does not contain your exact location.", [`Primary: ${primaryName}`, plan.summary], actor);
        return { status: "confirmation_required", message: "The human must confirm sharing in the page before a link is created.", data: { id: planId } };
      },

      draftServiceReport: (input, actor) => {
        const state = get();
        const segment = state.city.routeOptions.flatMap((route) => route.segments).find((candidate) => candidate.id === input.segmentId);
        if (!segment) return { status: "not_found", message: `Unknown segment "${input.segmentId}".` };
        const text = sanitizeReportText(input.text);
        if (text.length < 8) return { status: "invalid_input", message: "Observation text must be at least 8 characters after sanitising." };
        const landmarkId = input.landmarkId && getLandmark(state.city, input.landmarkId) ? input.landmarkId : segment.toLandmarkId;
        const observedAt = toIsoDateFallback(input.observedAt, state.now);
        const expiresAt = toIsoDateFallback(input.expiresAt, new Date(new Date(observedAt).getTime() + 3 * HOUR).toISOString());
        const draft: ServiceReportDraft = { id: makeId("report"), segmentId: segment.id, category: input.category, text, observedAt, expiresAt, landmarkId, createdAt: new Date().toISOString(), createdBy: actor, status: "draft" };
        set({ reportDrafts: { ...state.reportDrafts, [draft.id]: draft } });
        log(actor, "draft", "Report drafted", `${draft.category.replace("_", " ")} on ${segment.label}. Not published.`, "draft_service_report");
        return { status: "ok", data: draft };
      },

      discardReportDraft: (draftId, actor) => {
        const state = get();
        if (!state.reportDrafts[draftId] || state.reportDrafts[draftId].status !== "draft") return;
        const reportDrafts = { ...state.reportDrafts };
        delete reportDrafts[draftId];
        set({ reportDrafts, pendingConfirmation: state.pendingConfirmation?.targetId === draftId ? undefined : state.pendingConfirmation });
        log(actor, "info", "Report draft discarded", "The report was removed without publishing.");
      },

      publishServiceReport: (draftId, actor) => {
        const state = get();
        const draft = state.reportDrafts[draftId];
        if (!draft) return { status: "not_found", message: `Unknown report draft "${draftId}".` };
        if (draft.status === "published") {
          const existing = state.userReports.find((report) => report.id === draftId);
          return existing ? { status: "already_done", message: "This report is already published.", data: existing } : { status: "not_found", message: "Report not found." };
        }
        const segment = state.city.routeOptions.flatMap((route) => route.segments).find((candidate) => candidate.id === draft.segmentId);
        openConfirmation("publish_report", draftId, "Publish this service report?", "This makes the report visible to everyone using this city pack until it expires. It is shown with a low-confidence label and can be misleading if wrong.", [`Segment: ${segment?.label ?? draft.segmentId}`, `Category: ${draft.category.replace("_", " ")}`, `Text: "${draft.text}"`, `Near: ${draft.landmarkId ? getLandmark(state.city, draft.landmarkId)?.name ?? draft.landmarkId : "unspecified"}`, `Expires: ${draft.expiresAt}`, "Audience: public, this city pack"], actor);
        return { status: "confirmation_required", message: "The human must review the exact report text and confirm before it is published.", data: { id: draftId } };
      },

      getRecentReports: (segmentId) => {
        const state = get();
        const segmentIds = segmentId ? [segmentId] : state.city.routeOptions.flatMap((route) => route.segments.map((segment) => segment.id));
        return getActiveReports(allReports(state.city, state.userReports), segmentIds, new Date(state.now));
      },

      approveConfirmation: (confirmationId) => {
        const state = get();
        const pending = state.pendingConfirmation;
        if (!pending || pending.id !== confirmationId) return { status: "not_found", message: "No matching confirmation is pending." };
        if (pending.kind === "save_plan") return commitSave(pending.targetId);
        if (pending.kind === "share_plan") return commitShare(pending.targetId);
        return commitPublish(pending.targetId);
      },

      dismissConfirmation: (actor) => {
        const state = get();
        if (!state.pendingConfirmation) return;
        set({ pendingConfirmation: undefined });
        log(actor, "info", "Confirmation dismissed", `${state.pendingConfirmation.title} was declined. Nothing was changed.`);
      },
    };
  });
}

export type PlannerStoreApi = ReturnType<typeof createPlannerStore>;
