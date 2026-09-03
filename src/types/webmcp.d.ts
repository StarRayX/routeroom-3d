/**
 * Ambient WebMCP surface used by RouteRoom 3D.
 *
 * `document.modelContext` is the imperative registration surface exposed by
 * a WebMCP-compatible browser. `window.__routeroomTools` is a testing aid
 * (see registerWebMcpTools.ts) that always holds the built tool list, so the
 * in-page Tool Console and manual browser testing can call tools even in a
 * browser without WebMCP support.
 */
import type { ModelContextLike, ToolDefinition } from "@/lib/webmcp/types";

declare global {
  interface Document {
    modelContext?: ModelContextLike;
  }
  interface Window {
    __routeroomTools?: ToolDefinition[];
  }
}

export {};
