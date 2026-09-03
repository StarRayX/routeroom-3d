# Contributing

RouteRoom 3D keeps one rule above everything else: **buttons, forms, and
WebMCP tools call the same store actions.** There is no separate, weaker
agent-only path. Read `src/lib/planner-store.ts`'s top comment before
changing anything here.

## Adding a city pack

1. Create `src/lib/city-packs/<your-city>.ts` exporting a `CityPack`
   (shape defined in `src/lib/types.ts`): `id`, `name`, `district`,
   `timezone`, `currency`, `locale`, `description`, `attribution`,
   `landmarks`, `sceneFeatures`, `routeOptions`, `reports`, and
   `defaultTrip`.
2. Use synthetic or properly attributed data only. Do not hardcode a real
   home address; use landmarks and approximate areas. If you import real
   map data, list its license and source in `attribution`.
3. Give every route at least one walking segment, a stable
   `id`/`segment.id` scheme (prefix segment ids with the route id, e.g.
   `seg_<route>_<from>_<to>`), and realistic `durationMin/Typical/Max` and
   `fareMin/fareMax` ranges (min <= typical <= max).
4. Set `defaultTrip.originId`/`destinationId` to landmarks that exist in
   your `landmarks` array, and make sure every route's first segment starts
   at `defaultTrip.originId` and every route's last segment ends at either
   `defaultTrip.destinationId` or a landmark of kind `"entrance"`.
5. Register the pack in `src/lib/city-packs/index.ts`, adding it to the
   `cityPacks` array.
6. Run `validateCityPack(yourCityPack)` (also exported from
   `src/lib/city-packs/index.ts`) and fix every problem it reports before
   opening a PR. It checks duplicate IDs, dangling landmark references,
   fare/duration ordering, walking-distance consistency, transfer counts,
   report references, and default-trip timestamp ordering.
7. Add a test in `tests/` that loads your pack through
   `createPlannerStore` and asserts it ranks at least three routes with a
   defined primary and backup, mirroring
   `tests/planner-store.test.ts`.

The route-engine API (`src/lib/route-engine.ts`) must not need to change
for a new city pack. If you find yourself adding an `if (city.id === ...)`
branch there, the pack's data model is missing a field. Add the field to
`CityPack`/`RouteOption`/`RouteSegment` in `src/lib/types.ts` instead.

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
