import { describe, expect, it } from "vitest";
import { createPlannerStore } from "@/lib/planner-store";
import { cityPacks, defaultCityPack } from "@/lib/city-packs";

function freshStore() {
  return createPlannerStore(defaultCityPack);
}

describe("planner store confirmation gates", () => {
  it("ranks routes on creation and picks a primary and backup", () => {
    const store = freshStore();
    const state = store.getState();
    expect(state.ranked.length).toBeGreaterThanOrEqual(3);
    expect(state.primaryRouteId).toBe(state.ranked[0].route.id);
    expect(state.backupRouteId).toBeDefined();
    expect(state.backupRouteId).not.toBe(state.primaryRouteId);
  });

  it("agent cannot save a plan without human confirmation", () => {
    const store = freshStore();
    const { primaryRouteId, backupRouteId } = store.getState();
    const draft = store.getState().createDraftPlan({ primaryRouteId: primaryRouteId!, backupRouteId }, "agent");
    expect(draft.status).toBe("ok");
    if (draft.status !== "ok") return;

    const attempt = store.getState().savePlan(draft.data.id, "agent");
    expect(attempt.status).toBe("confirmation_required");
    expect(store.getState().pendingConfirmation?.kind).toBe("save_plan");
    expect(store.getState().savedPlans).toHaveLength(0);

    const again = store.getState().savePlan(draft.data.id, "agent");
    expect(again.status).toBe("confirmation_required");
    expect(store.getState().savedPlans).toHaveLength(0);
  });

  it("human approval commits the save and the agent then sees it as already saved", () => {
    const store = freshStore();
    const { primaryRouteId, backupRouteId } = store.getState();
    const draft = store.getState().createDraftPlan({ primaryRouteId: primaryRouteId!, backupRouteId }, "agent");
    if (draft.status !== "ok") throw new Error("draft failed");
    store.getState().savePlan(draft.data.id, "agent");
    const pending = store.getState().pendingConfirmation!;
    const result = store.getState().approveConfirmation(pending.id);
    expect(result.status).toBe("ok");
    expect(store.getState().savedPlans).toHaveLength(1);
    expect(store.getState().pendingConfirmation).toBeUndefined();

    const after = store.getState().savePlan(draft.data.id, "agent");
    expect(after.status).toBe("already_done");
    const confirmedEvent = store.getState().activity.find((event) => event.kind === "confirmed");
    expect(confirmedEvent?.actor).toBe("human");
  });

  it("approval with a stale or wrong confirmation id does nothing", () => {
    const store = freshStore();
    const { primaryRouteId } = store.getState();
    const draft = store.getState().createDraftPlan({ primaryRouteId: primaryRouteId! }, "agent");
    if (draft.status !== "ok") throw new Error("draft failed");
    store.getState().savePlan(draft.data.id, "agent");
    const result = store.getState().approveConfirmation("confirm_bogus");
    expect(result.status).toBe("not_found");
    expect(store.getState().savedPlans).toHaveLength(0);
  });

  it("sharing requires a saved plan and then a second confirmation", () => {
    const store = freshStore();
    const { primaryRouteId } = store.getState();
    const draft = store.getState().createDraftPlan({ primaryRouteId: primaryRouteId! }, "agent");
    if (draft.status !== "ok") throw new Error("draft failed");
    expect(store.getState().sharePlan(draft.data.id, "agent").status).toBe("invalid_input");
    store.getState().savePlan(draft.data.id, "agent");
    store.getState().approveConfirmation(store.getState().pendingConfirmation!.id);
    const share = store.getState().sharePlan(draft.data.id, "agent");
    expect(share.status).toBe("confirmation_required");
    const approved = store.getState().approveConfirmation(store.getState().pendingConfirmation!.id);
    expect(approved.status).toBe("ok");
    expect(store.getState().savedPlans[0].status).toBe("shared");
  });

  it("report publishing is gated and sanitised, and published reports affect ranking inputs", () => {
    const store = freshStore();
    const segment = store.getState().city.routeOptions[0].segments[0];
    const draft = store.getState().draftServiceReport({ segmentId: segment.id, category: "delay", text: "Platform closed, trains  running 20 min late near 12 Baker Street" }, "agent");
    expect(draft.status).toBe("ok");
    if (draft.status !== "ok") return;
    expect(draft.data.text).not.toContain("");
    expect(draft.data.text).not.toContain("Baker Street");

    const publish = store.getState().publishServiceReport(draft.data.id, "agent");
    expect(publish.status).toBe("confirmation_required");
    expect(store.getState().userReports).toHaveLength(0);

    store.getState().approveConfirmation(store.getState().pendingConfirmation!.id);
    expect(store.getState().userReports).toHaveLength(1);
    const reports = store.getState().getRecentReports(segment.id);
    expect(reports.some((report) => report.source === "user")).toBe(true);
  });

  it("preference changes recompute the ranking and log the actor", () => {
    const store = freshStore();
    const before = store.getState().ranked.map((entry) => entry.route.id);
    store.getState().setPreferences({ farePriority: "high", reliabilityPriority: "low", minimizeRainExposure: false, avoidStairs: false }, "human");
    const after = store.getState().ranked.map((entry) => entry.route.id);
    expect(after).not.toEqual(before);
    expect(store.getState().activity[0].actor).toBe("human");
  });

  it("show_route_on_scene changes primary and focus without saving anything", () => {
    const store = freshStore();
    const target = store.getState().ranked[2].route;
    const result = store.getState().showRoute(target.id, { segmentId: target.segments[1].id }, "agent");
    expect(result?.displayedRouteId).toBe(target.id);
    expect(store.getState().primaryRouteId).toBe(target.id);
    expect(store.getState().focusedSegmentId).toBe(target.segments[1].id);
    expect(store.getState().savedPlans).toHaveLength(0);
  });

  it("swapping the city pack keeps the engine API working", () => {
    const store = freshStore();
    const firstCity = store.getState().city.id;
    const other = cityPacks.find((pack) => pack.id !== firstCity);
    if (!other) return;
    store.getState().loadCityPack(other);
    expect(store.getState().city.id).toBe(other.id);
    expect(store.getState().ranked.length).toBeGreaterThanOrEqual(2);
    expect(store.getState().comparison.rows.length).toBe(store.getState().ranked.length);
  });
});
