"use client";

import { useState } from "react";
import { usePlanner } from "@/lib/planner-context";

function extractShareUrl(data: unknown): string | undefined {
  if (data && typeof data === "object" && "shareUrl" in data) {
    const value = (data as { shareUrl?: unknown }).shareUrl;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export function ConfirmationPanel() {
  const pending = usePlanner((s) => s.pendingConfirmation);
  const approveConfirmation = usePlanner((s) => s.approveConfirmation);
  const dismissConfirmation = usePlanner((s) => s.dismissConfirmation);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);

  if (!pending) return null;

  const handleConfirm = () => {
    const result = approveConfirmation(pending.id);
    if (result.status === "ok") {
      const shareUrl = extractShareUrl(result.data);
      setSuccessMessage(shareUrl ? `Done. Share link: ${shareUrl}` : "Done.");
      window.setTimeout(() => setSuccessMessage(undefined), 5000);
    }
  };

  return (
    <div className="confirmation-sheet" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <div className="confirmation-sheet-inner">
        <div className="confirmation-sheet-head">
          <span className="confirm-symbol" aria-hidden="true">
            !
          </span>
          <div>
            <h2 id="confirmation-title">{pending.title}</h2>
            <span className="route-card-freshness">Requested by: {pending.requestedBy}</span>
          </div>
        </div>

        <p className="confirmation-side-effect">{pending.sideEffect}</p>

        <ul className="confirmation-details">
          {pending.details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {successMessage && <p className="confirmation-success">{successMessage}</p>}

        <div className="confirmation-actions">
          <button type="button" className="primary-button" onClick={handleConfirm}>
            Confirm
          </button>
          <button type="button" className="secondary-button" autoFocus onClick={() => dismissConfirmation("human")}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
