# RouteRoom project instructions

Before making substantial changes, read:

1. `CONTEXT.md`
2. `docs/adr/0001-global-city-pack-architecture.md`
3. `docs/adr/0002-spatial-explanation-layer.md`
4. `docs/adr/0003-map-reference-and-provider-boundary.md`
5. `docs/adr/0004-agent-assisted-community-observations.md`
6. `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md`
7. `docs/prompts/CLAUDE_CONTINUE_ROUTEROOM.md`

RouteRoom is a global, city-agnostic human-agent route decision room. Keep one concrete demo city or district, but do not hard-code the product identity to a campus, university, or country.

The 3D view is a restrained spatial explanation layer. Mapbox Standard is the visual provider behind the scene component contract (`RouteSceneProps`), rendering the real city while RouteRoom draws its own route overlays on top; see [ADR 0007](./docs/adr/0007-mapbox-standard-visual-provider.md). It should make route segments, transfers, entrances, walking, and observations easier to understand. Do not spend the hackathon building a full navigation engine or editable 3D world.

WebMCP is core functionality. Register imperative tools from the top-level page on initial load, use narrow schemas and precise `snake_case` descriptions, reuse the same logic as the human UI, and visibly update the route cards, scene, or activity log after tool calls.

Community observations may be drafted and structured by agents, but humans approve publication. Preserve provenance, freshness, confidence, expiry, and privacy boundaries. Never invent live traffic, safety, accessibility, or reliability claims.

Mapbox Standard is the accepted visual provider (ADR 0007), not just a reference. Never copy Mapbox source code, assets, screenshots, or proprietary data. Use only a public `pk.` browser token, restricted by URL, never a secret; never call Mapbox's paid APIs (Directions, Geocoding, Search, Navigation).

When scope is uncertain, prefer a working, deterministic city pack and a convincing human-agent workflow over broader coverage. Before a major product decision, use `docs/prompts/CLAUDE_GRILL_CHECKPOINT.md` and update the glossary or ADRs when the decision qualifies.
