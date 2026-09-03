# Contributing

RouteRoom 3D keeps one rule above everything else: **buttons, forms, and
WebMCP tools call the same store actions.** There is no separate, weaker
agent-only path. Read `src/lib/planner-store.ts`'s top comment before
changing anything here.

## Adding a city pack

A city pack carries real route and landmark geometry, not hand-authored
scene units (see [ADR 0005](./docs/adr/0005-city-packs-carry-real-geometry.md)),
and its trips are curated, not computed. The visual map itself is Mapbox
Standard, not committed building geometry (see
[ADR 0007](./docs/adr/0007-mapbox-standard-visual-provider.md), which
supersedes the level-of-detail corridor of
[ADR 0006](./docs/adr/0006-level-of-detail-corridor.md)). Adding a pack is a
data-and-review job, not just a data file:

1. Run the importer to get real route relations and landmarks for your
   district: `node scripts/import-osm.mjs`. This performs a one-time
   OpenStreetMap export of route relations and landmark points and writes
   `routes.geojson` (one LineString per route segment) and `points.geojson`
   (landmarks) for your pack, plus the export date. Re-run it only when you
   deliberately want a fresh snapshot; the point of committing the output
   is that the pack never makes a live request. There is no building
   import; Mapbox Standard renders the surrounding city.
2. Create `src/lib/city-packs/<your-city>.ts` exporting a `CityPack`
   (shape defined in `src/lib/types.ts`): `id`, `name`, `district`,
   `timezone`, `currency`, `locale`, `description`, `attribution`,
   `landmarks`, `trips`, and `reports`.
3. Curate the pack's trips and their route options by hand. RouteRoom
   compares a trip's curated route options; it does not compute routes
   between arbitrary places, so there is no route-generation step to run.
   For each trip: write at least three route options, give every route at
   least one walking segment, use a stable `id`/`segment.id` scheme (prefix
   segment ids with the route id, e.g. `seg_<route>_<from>_<to>`) that
   matches the segment `id`s in `routes.geojson`, realistic
   `durationMin/Typical/Max` and `fareMin/fareMax` ranges
   (min <= typical <= max), and a source date, evidence freshness, and
   confidence for every estimate, since this data is a curated snapshot,
   not live directions. Use landmarks and approximate areas only; never a
   real home address.
4. Set each trip's `originId`/`destinationId` to landmarks that exist in
   your `landmarks` array and in `points.geojson`, and make sure every
   route's first segment starts at the trip's origin and every route's
   last segment ends at either the trip's destination or a landmark of
   kind `"entrance"`.
5. Commit `routes.geojson`, `points.geojson`, and
   `src/lib/city-packs/<your-city>/ATTRIBUTION.md` (or an `attribution`
   field pointing at it): the "© OpenStreetMap contributors, ODbL" string,
   the export date, and the license and source of anything else you
   imported. This file, or its content, must also be visible on the
   deployed page alongside Mapbox's own attribution control (see
   `docs/DEPLOYMENT.md`), not just in this repo.
6. Register the pack in `src/lib/city-packs/index.ts`, adding it to the
   `cityPacks` array.
7. Run `validateCityPack(yourCityPack)` (also exported from
   `src/lib/city-packs/index.ts`) and fix every problem it reports before
   opening a PR. It checks duplicate IDs, dangling landmark references,
   fare/duration ordering, walking-distance consistency, transfer counts,
   report references, default-trip timestamp ordering, and that every
   route and landmark geometry reference resolves.
8. Add a test in `tests/` that loads your pack through
   `createPlannerStore` and asserts it ranks at least three routes with a
   defined primary and backup, mirroring
   `tests/planner-store.test.ts`.

The route-engine API (`src/lib/route-engine.ts`) must not need to change
for a new city pack. If you find yourself adding an `if (city.id === ...)`
branch there, the pack's data model is missing a field. Add the field to
`CityPack`/`RouteOption`/`RouteSegment` in `src/lib/types.ts` instead.

## Adding a map provider

The visual map sits behind a provider boundary (see
[ADR 0003](./docs/adr/0003-map-reference-and-provider-boundary.md) and
[ADR 0007](./docs/adr/0007-mapbox-standard-visual-provider.md)). Mapbox
Standard is the current provider, implemented in
`src/components/mapbox/MapboxRouteScene.tsx`. To add or swap a provider:

1. Implement `RouteSceneProps` (`src/components/route-scene/types.ts`) in a
   new component. It must react to the same planner state, visible routes,
   display modes, focused segment, camera target, active reports, and
   disrupted segments, and it must never own selection state itself; human
   clicks and WebMCP tool calls both go through the same store.
2. Switch the export in `src/components/route-scene/index.ts` to point at
   your new component. Nothing in the store, engine, tools, or city packs
   should need to change.
3. Never copy Mapbox source, assets, screenshots, or proprietary tiles into
   the repository, whether you keep Mapbox or replace it. Any public
   client token stays public, URL-restricted, non-secret configuration.
4. If the new provider needs its own environment variable, document it in
   `.env.example` with the same rules: no secret committed, a comment
   explaining what it is and how to restrict it.

## Adding a WebMCP tool

1. Decide the trust category first: read-only (never changes state),
   reversible (changes visible working state, nothing saved), or
   confirmation-gated (commits something durable or outward-facing). A
   confirmation-gated tool almost always means you need a new
   `ConfirmationKind` and a `commit*` function in
   `src/lib/planner-store.ts`, following the existing `save_plan` /
   `share_plan` / `publish_service_report` pattern.
2. Add or extend the store action in `src/lib/planner-store.ts` that does
   the actual work. It must be the same function the UI calls. Do not
   write logic inside the tool's `execute` that isn't reachable from a
   button.
3. Add the tool's name to `TOOL_NAMES` and its zod validator plus
   hand-written JSON Schema in `src/lib/webmcp/toolSchemas.ts`
   (`.strict()`/`additionalProperties: false`, snake_case fields), its
   title/description/trust/annotations/example input in
   `src/lib/webmcp/toolDescriptions.ts`, and its `execute` wrapper in
   `src/lib/webmcp/buildTools.ts`, converting the store's `camelCase`
   fields to `snake_case` for input and output (see the conversions
   already used for `Preferences`, `RouteOption`, and so on). Set the
   description to state the side effect precisely (or explicitly say there
   is none), and set the correct `annotations.readOnlyHint`. Set
   `annotations.untrustedContentHint: true` whenever the output includes
   user-submitted text (report text, in particular). `buildTools.ts` wires
   the result into `registerWebMcpTools.ts`, which does the actual
   `document.modelContext.registerTool` call and also exposes the tool
   list as `window.__routeroomTools`; you shouldn't need to touch that
   file.
4. **Every gated action must go through `approveConfirmation`.** A WebMCP
   tool must never call `approveConfirmation` directly. Only the human's
   click in the confirmation panel does that. A gated tool's `execute`
   should call the store's `save*`/`share*`/`publish*` action, check
   whether it returned `confirmation_required`, and return that status
   as-is. If you're tempted to add a bypass "confirm automatically because
   the agent already asked the user," don't. That defeats the entire
   point of the gate.
5. Never let a tool throw for bad input. Validate with `zod` (already a
   dependency) and return `{ status: "invalid_input", message }` instead.
6. Add the tool to `docs/TOOLS.md` (purpose, input schema summary, output
   shape summary, side effect, trust category, example call) and to the
   tool inventory table in `README.md`.
7. Add it to the in-page Agent tool console and confirm it is reachable
   from `window.__routeroomTools` for testing without a WebMCP browser.
8. If it changes the read-only/reversible/confirmation-gated tool count,
   update the count claims in `README.md` and `docs/WEBMCP_TESTING.md`.

## General

- No em dashes in prose or code comments anywhere in this repo. Use
  periods instead.
- Keep tool descriptions honest: if a tool's description says it doesn't
  change state, it must not change state.
- Run `npm run typecheck`, `npm test`, and `npm run lint` before opening a
  PR.
