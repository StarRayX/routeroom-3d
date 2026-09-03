"use client";

import { useMemo, useState } from "react";
import type { ToolDefinition, ToolTrust } from "@/lib/webmcp/types";
import type { WebMcpStatus } from "@/lib/types";

type ToolConsoleProps = {
  tools: ToolDefinition[];
  status: WebMcpStatus;
};

const TRUST_GROUPS: { key: ToolTrust; label: string }[] = [
  { key: "read_only", label: "Read-only" },
  { key: "reversible", label: "Reversible" },
  { key: "confirmation_gated", label: "Confirmation-gated" },
];

export function ToolConsole({ tools, status }: ToolConsoleProps) {
  const [selectedName, setSelectedName] = useState<string>(tools[0]?.name ?? "");
  const selected = tools.find((tool) => tool.name === selectedName) ?? tools[0];
  const [input, setInput] = useState<string>(() => JSON.stringify(selected?.exampleInput ?? {}, null, 2));
  const [parseError, setParseError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<string | undefined>(undefined);
  const [running, setRunning] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<ToolTrust, ToolDefinition[]> = { read_only: [], reversible: [], confirmation_gated: [] };
    for (const tool of tools) groups[tool.trust].push(tool);
    return groups;
  }, [tools]);

  const handleSelect = (name: string) => {
    setSelectedName(name);
    const tool = tools.find((candidate) => candidate.name === name);
    setInput(JSON.stringify(tool?.exampleInput ?? {}, null, 2));
    setParseError(undefined);
    setResult(undefined);
  };

  const handleRun = async () => {
    if (!selected) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON.");
      return;
    }
    setParseError(undefined);
    setRunning(true);
    try {
      const output = await selected.execute(parsed);
      setResult(JSON.stringify(output, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ status: "error", message: error instanceof Error ? error.message : String(error) }, null, 2));
    } finally {
      setRunning(false);
    }
  };

  return (
    <details className="card panel panel-full tool-console">
      <summary>Agent tool console (for testing without a WebMCP browser)</summary>

      <p className="route-card-freshness">WebMCP status: {status} · {tools.length} tools discoverable</p>

      <div className="tool-console-groups">
        {TRUST_GROUPS.map((group) => (
          <div key={group.key} className="tool-trust-group">
            <span className="eyebrow">{group.label.toUpperCase()}</span>
            <ul>
              {grouped[group.key].map((tool) => (
                <li key={tool.name}>
                  <button type="button" className={`tool-list-item ${selectedName === tool.name ? "is-active" : ""}`} onClick={() => handleSelect(tool.name)}>
                    <span className="mono">{tool.name}</span>
                    <span className="tool-annotation-dots">
                      {tool.annotations.readOnlyHint && <span className="tool-dot tool-dot-read" title="Read-only" />}
                      {tool.annotations.untrustedContentHint && <span className="tool-dot tool-dot-untrusted" title="May contain untrusted content" />}
                      {tool.annotations.destructiveHint && <span className="tool-dot tool-dot-destructive" title="Destructive / commitment action" />}
                    </span>
                  </button>
                </li>
              ))}
              {grouped[group.key].length === 0 && <li className="empty-note">None registered.</li>}
            </ul>
          </div>
        ))}
      </div>

      {selected && (
        <div className="tool-console-run">
          <div>
            <strong>{selected.title}</strong>
            <p>{selected.description}</p>
          </div>

          <label>
            <span>Input JSON</span>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={6} className="mono" />
          </label>
          {parseError && <p className="simulation-fail">{parseError}</p>}

          <button type="button" className="primary-button" onClick={() => void handleRun()} disabled={running}>
            {running ? "Running…" : "Run as agent"}
          </button>

          {result && <pre className="tool-result mono">{result}</pre>}
        </div>
      )}
    </details>
  );
}
