"use client";

import { useEffect } from "react";

export default function PlannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("RouteRoom planner error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="state-screen">
      <div className="state-card">
        <span className="state-kicker">Planner error</span>
        <h1>The route room could not load</h1>
        <p>
          This is a rendering error in the planner, not a lost plan. Nothing is saved, shared, or published without
          your confirmation, and this error does not change that.
        </p>
        <p>If this keeps happening, try the non-3D view or reload the page.</p>
        {error.digest ? <pre>Error digest: {error.digest}</pre> : null}
        <div className="state-actions">
          <button type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
