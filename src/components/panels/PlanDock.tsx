"use client";

import { useState } from "react";
import { usePlanner } from "@/lib/planner-context";
import { findRouteById } from "@/lib/route-engine";
import type { SavedPlan } from "@/lib/types";
import { Check, Copy, Route, Save, Share, Xmark } from "reicon-react";

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
    <section className="plan-dock" aria-labelledby="plan-dock-heading">
      <div className="panel-heading compact">
        <div className="plan-dock-title">
          <Route size={20} weight="Outline" aria-hidden="true" />
          <div>
            <h2 id="plan-dock-heading">{primaryName}</h2>
            <p>Backup: {backupName}</p>
          </div>
        </div>
        {!activeDraft && (
          <button type="button" className="primary-button" disabled={!primaryRouteId} onClick={() => primaryRouteId && createDraftPlan({ primaryRouteId, backupRouteId }, "human")}>
            <Save size={16} weight="Outline" aria-hidden="true" /> Create draft
          </button>
        )}
      </div>

      {activeDraft && (
        <div className="active-draft">
          <div className="active-draft-head">
            <span className="draft-status">{activeDraft.status === "draft" ? "Draft ready" : activeDraft.status}</span>
            <p>{activeDraft.summary}</p>
          </div>
          <div className="panel-footer">
            {activeDraft.status === "draft" && (
              <>
                <button type="button" className="primary-button" onClick={() => savePlan(activeDraft.id, "human")}>
                  <Check size={16} weight="Outline" aria-hidden="true" /> Save plan
                </button>
                <button type="button" className="text-button" onClick={() => discardDraft(activeDraft.id, "human")}>
                  <Xmark size={15} weight="Outline" aria-hidden="true" /> Discard
                </button>
              </>
            )}
            {activeDraft.status !== "draft" && (
              <button type="button" className="secondary-button" onClick={() => sharePlan(activeDraft.id, "human")}>
                <Share size={16} weight="Outline" aria-hidden="true" /> Share link
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
                      <Copy size={15} weight="Outline" aria-hidden="true" /> {copiedId === plan.id ? "Copied" : "Copy"}
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
