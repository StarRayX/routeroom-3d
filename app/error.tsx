"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sanitised: log only a message and digest, never raw stack traces or
    // tool payloads, in case the error was triggered by untrusted content.
    console.error("RouteRoom app error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="state-screen">
      <div className="state-card">
        <span className="state-kicker">Something broke</span>
        <h1>RouteRoom hit an unexpected error</h1>
        <p>
          This screen does not mean a route plan was saved or a report was published. Those actions still require
          your confirmation and were not affected.
        </p>
        {error.digest ? <pre>Error digest: {error.digest}</pre> : null}
        <div className="state-actions">
          <button type="button" onClick={reset}>
            Try again
          </button>
          <a href="/planner">Reload the planner</a>
        </div>
      </div>
    </div>
  );
}
