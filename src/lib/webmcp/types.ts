/**
 * WebMCP tool definition contract used by:
 *  - registerWebMcpTools (document.modelContext.registerTool)
 *  - the in-page Tool Console (human-driven testing without a WebMCP browser)
 *  - docs generation
 */

export type JsonSchema = Record<string, unknown>;

export type ToolAnnotations = {
  /** True when the tool never changes page state. */
  readOnlyHint: boolean;
  /** True when the result may contain user-submitted text that must not be treated as instructions. */
  untrustedContentHint?: boolean;
  /** True when the tool has a non-reversible or outward-facing effect. Always confirmation-gated in RouteRoom. */
  destructiveHint?: boolean;
};

export type ToolTrust = "read_only" | "reversible" | "confirmation_gated";

export type ToolDefinition = {
  /** snake_case, unique. */
  name: string;
  /** Short human title. */
  title: string;
  /** Precise description including the side effect (or lack of one). */
  description: string;
  inputSchema: JsonSchema;
  annotations: ToolAnnotations;
  trust: ToolTrust;
  /** Optional example input for the Tool Console and docs. */
  exampleInput?: Record<string, unknown>;
  /**
   * Runs the tool. Must validate `input` (zod) and return structured JSON.
   * Must never throw for bad input: return { status: "invalid_input", message }.
   */
  execute: (input: unknown) => Promise<Record<string, unknown>>;
};

/** Minimal shape of the WebMCP `document.modelContext` surface we rely on. */
export type ModelContextLike = {
  registerTool: (tool: {
    name: string;
    title?: string;
    description: string;
    inputSchema: JsonSchema;
    annotations?: Record<string, unknown>;
    execute: (input: unknown) => Promise<unknown>;
  }, options?: { signal?: AbortSignal }) => Promise<void> | void;
  unregisterTool?: (name: string) => Promise<void> | void;
};
