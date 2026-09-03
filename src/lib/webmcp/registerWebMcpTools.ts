/**
 * Imperative WebMCP registration on the top-level planner page.
 *
 * Per the plan (section 6): register on initial load, top-level page only
 * (no iframes), using `document.modelContext.registerTool`. Declarative
 * tools and iframe-hosted tools are not relied on for the primary workflow.
 */

import type { ToolDefinition } from "./types";

export type RegisterResult = {
  status: "available" | "unavailable";
  registered: string[];
  cleanup: () => void;
};

export async function registerWebMcpTools(tools: ToolDefinition[]): Promise<RegisterResult> {
  // Testing aid: always expose the built tool list on window, regardless of
  // whether a WebMCP-compatible browser is present. This lets the in-page
  // Tool Console (and manual/automated browser testing) call tools by name
  // without needing WebMCP support. It has no bearing on real registration.
  if (typeof window !== "undefined") {
    window.__routeroomTools = tools;
  }

  const noop = () => undefined;

  const hasModelContext =
    typeof document !== "undefined" && typeof document.modelContext?.registerTool === "function";
  const isTopLevel = typeof window !== "undefined" && window.top === window;

  if (!hasModelContext || !isTopLevel) {
    return { status: "unavailable", registered: [], cleanup: noop };
  }

  const modelContext = document.modelContext!;
  const controller = new AbortController();
  const registered: string[] = [];

  for (const tool of tools) {
    const wrapped = async (input: unknown) => {
      try {
        return await tool.execute(input);
      } catch {
        return { status: "error", message: "Tool failed. Check the input and try again." };
      }
    };

    try {
      await modelContext.registerTool(
        {
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
          execute: wrapped,
        },
        { signal: controller.signal },
      );
      registered.push(tool.name);
    } catch {
      // One tool failing to register should not block the rest.
    }
  }

  const cleanup = () => {
    controller.abort();
    for (const name of registered) {
      try {
        modelContext.unregisterTool?.(name);
      } catch {
        // Best effort; the AbortController already signals teardown to a
        // spec-compliant host.
      }
    }
  };

  return { status: registered.length > 0 ? "available" : "unavailable", registered, cleanup };
}
