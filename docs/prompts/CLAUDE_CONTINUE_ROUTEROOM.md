# Claude continuation prompt: RouteRoom 3D

You are continuing implementation of RouteRoom 3D in this repository.

Before changing code, read these files in order:

1. `CONTEXT.md`
2. `docs/adr/0001-global-city-pack-architecture.md`
3. `docs/adr/0002-spatial-explanation-layer.md`
4. `docs/adr/0003-map-reference-and-provider-boundary.md`
5. `docs/adr/0004-agent-assisted-community-observations.md`
6. `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md`
7. The current files under `docs/`, `app/`, and `src/`

## Non-negotiable product direction

- This is a global product, not an IskoRank, UP Manila, or Philippines-specific app.
- Use one concrete demo city/district, but keep the city a replaceable city pack.
- Use real coordinate relationships or a real/open map adapter where practical, with simplified light-gray/off-white block extrusions.
- Treat the 3D view as a visual explanation layer: routes, transfers, entrances, walking, and observations must be legible.
- Do not use 3D as decorative scenery unrelated to the decision.
- Agents may propose and structure local observations, but humans approve publication.
- Do not invent live traffic, safety, accessibility, or reliability claims.
- Do not copy Mapbox code, assets, screenshots, or proprietary data. The Mapbox article is a visual reference only.
- Do not add paid APIs or expose credentials in the browser or repository.

## WebMCP requirements

- Register imperative tools from the top-level page on initial load.
- Keep tools discoverable without a prior click.
- Use narrow schemas and precise `snake_case` descriptions.
- Reuse the same application logic for human controls and agent tools.
- Show tool effects in the route cards, 3D scene, and activity log.
- Keep save, share, and publish actions human-confirmation-gated.

## How to work

1. Inspect the current implementation and identify the highest-risk mismatch with the decisions above.
2. State a small recommendation before making a change.
3. Make one bounded change at a time.
4. Preserve existing work from other contributors.
5. Run the narrowest relevant typecheck, test, or build check.
6. Report changed files, verification, and remaining uncertainty.

Do not expand the scope into a global live navigation product. A small, convincing route decision workflow is the goal.
