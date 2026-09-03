"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanner, usePlannerStoreApi } from "../planner-context";
import type { WebMcpStatus } from "../types";
import { buildRouteRoomTools } from "./buildTools";
import { registerWebMcpTools } from "./registerWebMcpTools";
import type { ToolDefinition } from "./types";

export type UseWebMcpToolsResult = {
  status: WebMcpStatus;
  tools: ToolDefinition[];
  registered: string[];
};

/**
 * Builds the WebMCP tool list from the live planner store and registers it
 * on mount. Registration is robust to React StrictMode's double-invoke of
 * effects in development: a `cancelled` flag makes a stale registration
 * clean itself up immediately instead of leaking a second live registration.
 */
export function useWebMcpTools(): UseWebMcpToolsResult {
  const store = usePlannerStoreApi();
  const status = usePlanner((state) => state.webmcpStatus);
  const [registered, setRegistered] = useState<string[]>([]);

  const tools = useMemo(() => buildRouteRoomTools(store), [store]);

  useEffect(() => {
    let cancelled = false;
    let cleanupFn: (() => void) | undefined;

    registerWebMcpTools(tools).then((result) => {
      if (cancelled) {
        result.cleanup();
        return;
      }
      cleanupFn = result.cleanup;
      store.getState().setWebmcpStatus(result.status);
      setRegistered(result.registered);
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [tools, store]);

  return { status, tools, registered };
}
