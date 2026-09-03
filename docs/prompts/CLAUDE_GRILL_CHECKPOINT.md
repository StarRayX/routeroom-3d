# Claude grilling checkpoint prompt

Use this prompt before making another major product or architecture decision.

Read `CONTEXT.md`, all ADRs, `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md`, and the current implementation. Do not ask about terms already settled in `CONTEXT.md` unless the code contradicts them.

Grill the current plan in one round of no more than three questions. Each question must:

- identify an actual ambiguity or contradiction
- explain why it matters to WebMCP leverage, execution, impact, or creativity
- give a recommended answer
- state what file or ADR will be updated after resolution

Prioritize these unresolved risks:

1. Whether the map is genuinely coordinate-based or only a decorative custom scene.
2. Whether the chosen map provider is compatible with the free/near-free constraint and licensing requirements.
3. Whether agent-assisted observations have provenance, freshness, and human publication control.
4. Whether a judge can discover tools and complete a meaningful workflow from the live page.
5. Whether the 3D view visibly changes when the agent changes a route or preference.

When the user answers, update `CONTEXT.md` term-by-term and create an ADR only if the decision is hard to reverse, surprising without context, and involves a real tradeoff. Keep `CONTEXT.md` as vocabulary only. Put implementation details in the plan or ADRs, not the glossary.
