"use client";

import { useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { findRouteById } from "@/lib/route-engine";
import type { SavedPlan } from "@/lib/types";

/** Mirrors the store's commitShare payload shape: c city, t trip, p primary, b backup, d deadline, r backup trigger. */
function buildShareUrl(cityId: string, plan: SavedPlan): string {
  if (typeof window === "undefined") return "";
  const payload = { c: cityId, t: plan.tripId, p: plan.primaryRouteId, b: plan.backupRouteId ?? null, d: plan.arrivalDeadline, r: plan.backupTrigger };
  const encoded = window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `${window.location.origin}/planner?plan=${encoded}`;
}

export function PlanDock() {
  const city = usePlanner((s) => s.city);
  const primaryRouteId = usePlanner((s) => s.primaryRouteId);
  const backupRouteId = usePlanner((s) => s.backupRouteId);
  const drafts = usePlanner((s) => s.drafts);
  const activeDraftId = usePlanner((s) => s.activeDraftId);
  const savedPlans = usePlanner((s) => s.savedPlans);
  const createDraftPlan = usePlanner((s) => s.createDraftPlan);
  const savePlan = usePlanner((s) => s.savePlan);
  const sharePlan = usePlanner((s) => s.sharePlan);
  const discardDraft = usePlanner((s) => s.discardDraft);
  const [copiedId, setCopiedId] = useState<string | undefined>(undefined);

  const primaryName = primaryRouteId ? findRouteById(city, primaryRouteId)?.name ?? primaryRouteId : "none";
  const backupName = backupRouteId ? findRouteById(city, backupRouteId)?.name ?? backupRouteId : "none";
  const activeDraft = activeDraftId ? drafts[activeDraftId] : undefined;

  const handleCopy = async (plan: SavedPlan) => {
    const url = buildShareUrl(city.id, plan);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(plan.id);
      window.setTimeout(() => setCopiedId((current) => (current === plan.id ? undefined : current)), 3000);
    } catch {
      // Clipboard access can fail silently; the URL is still shown on screen.
    }
  };

  return (
    <section className="card panel panel-full plan-dock" aria-labelledby="plan-dock-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">ROUTE PLAN</p>
          <h2 id="plan-dock-heading">Primary: {primaryName} · Backup: {backupName}</h2>
        </div>
        {!activeDraft && (
          <button type="button" className="primary-button" disabled={!primaryRouteId} onClick={() => primaryRouteId && createDraftPlan({ primaryRouteId, backupRouteId }, "human")}>
            Create draft
          </button>
        )}
      </div>

      {activeDraft && (
        <div className="active-draft">
          <div className="active-draft-head">
            <span className={`badge badge-status-${activeDraft.status}`}>{activeDraft.status}</span>
            <p>{activeDraft.summary}</p>
          </div>
          <div className="panel-footer">
            {activeDraft.status === "draft" && (
              <>
                <button type="button" className="primary-button" onClick={() => savePlan(activeDraft.id, "human")}>
                  Save plan
                </button>
                <button type="button" className="text-button" onClick={() => discardDraft(activeDraft.id, "human")}>
                  Discard draft
                </button>
              </>
            )}
            {activeDraft.status !== "draft" && (
              <button type="button" className="secondary-button" onClick={() => sharePlan(activeDraft.id, "human")}>
                Share link
              </button>
            )}
          </div>
        </div>
      )}

      {savedPlans.length > 0 && (
        <div className="saved-plans">
          <p className="eyebrow">SAVED PLANS</p>
          <ul>
            {savedPlans.map((plan) => (
              <li key={plan.id} className="saved-plan-item">
                <div>
                  <span className={`badge badge-status-${plan.status}`}>{plan.status}</span>
                  <p>{plan.summary}</p>
                </div>
                {plan.status === "shared" && (
                  <div className="saved-plan-share">
                    <input type="text" readOnly value={buildShareUrl(city.id, plan)} aria-label={`Share link for ${plan.summary}`} />
                    <button type="button" className="secondary-button" onClick={() => handleCopy(plan)}>
                      {copiedId === plan.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
