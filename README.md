# RouteRoom 3D

RouteRoom 3D helps people plan difficult city trips by letting an agent compare routes, reason about uncertainty, and update an explorable 3D city scene while the human adjusts priorities and approves the final plan.

## What RouteRoom 3D does

RouteRoom is a shared commute decision room, not a map with a chat bubble bolted on. The product itself is city-agnostic: a city pack is data, never product identity. The demo pack is a real district, Amsterdam Centraal Station to the RAI convention centre (pack id `amsterdam_centrum_rai`). The visual map is Mapbox GL JS v3 with the Mapbox Standard style, showing the real city in 3D; RouteRoom draws its own route overlays on top from committed GeoJSON derived from the city pack (see [ADR 0007](./docs/adr/0007-mapbox-standard-visual-provider.md)). RouteRoom compares a trip's curated route options; it does not route between arbitrary places, and its data is labelled a curated snapshot, not live directions, everywhere it appears.

A human picks a trip from the active city pack and states priorities like walking distance, luggage, cost, and reliability. An agent then does the legwork: it lists the trips a city pack ships with, retrieves a trip's curated route options, inspects individual segments, checks them against the stated constraints, compares them criterion by criterion, and simulates what happens if something is delayed. Every one of those steps runs through the same deterministic route engine the human's own UI uses, and every result shows up live on the 3D map, not just as text.

The human stays in charge of anything that matters outside the browser tab. Priorities, comparisons, and draft plans can move freely between human and agent. Saving a plan, sharing a link to it, or publishing a service report to other users all require an explicit human click on a confirmation sheet that shows the exact side effect first. An agent can propose all day; it cannot commit anything on its own.

## Why this is better with WebMCP

A route is not one number. It is a bundle of tradeoffs: arrival buffer, fare, walking distance, transfers, accessibility, weather exposure, and how fresh the evidence behind each estimate is. Reasoning about that bundle across several candidates, then re-reasoning after the human changes their mind, then stress-testing the pick against a delay, is a multi-step, stateful task. It needs the agent operating on the same live state the human sees, not a one-shot answer.

That is exactly what WebMCP is for. RouteRoom registers 22 typed tools on the top-level planner page, imperatively, with `document.modelContext.registerTool`. Those tools call into `src/lib/planner-store.ts`, the identical store that powers every button and form in the UI. When the agent calls `find_route_options` or `show_route_on_scene`, the human sees the same 3D scene, the same route cards, and the same activity log update that a person clicking through the UI would produce. There is no second, weaker agent backend and no scraping of rendered HTML.

Contrast that with a chat bubble floating over a static map: the assistant would have to describe changes in prose, the human would have no way to verify the assistant actually queried anything real, and there would be no shared, inspectable state to hand off between human and agent turns. RouteRoom's tools return stable IDs (`route_id`, `segment_id`, `draft_id`) precisely so an agent, or a person reading the activity log, can verify that a claimed change actually happened. And because saving, sharing, and publishing are gated behind a human-confirmation sheet that states the exact side effect, the agent gets real capability without getting a blank check.

## A human-agent interaction transcript

This transcript is a run against the Amsterdam Centrum to RAI demo pack (`amsterdam_centrum_rai`; see `docs/DEMO_SCRIPT.md` for the video version of this same flow). Under the default preferences, Metro 52 plus the walk from Europaplein already wins: it is the fastest option and it is step-free, even though its last leg is a 380 m outdoor walk. All three curated route options run on GVB and share the same one-hour fare, so this is not a "cheap route turns out risky" story. It's that the human explicitly says walking distance matters more right now, because they have luggage, and only then does the agent's own scoring move off the default pick.

> **Human:** Find a route from Centraal Station to the RAI. I need to arrive by 9.

```
get_trip_context({})
// { "trip_id": "trip_centraal_rai", "origin": { "landmark_id": "centraal_station", "label": "Amsterdam Centraal Station" },
//   "destination": { "landmark_id": "rai_convention_centre", "label": "RAI Convention Centre" },
//   "arrival_deadline": "2026-09-04T09:00:00+02:00",
//   "preferences": { "walking_priority": "medium", "max_walking_meters": 1200, "avoid_stairs": false } }

list_trips({})
// { "trips": [{ "trip_id": "trip_centraal_rai", "label": "Centraal Station to RAI",
//                "origin_label": "Amsterdam Centraal Station", "destination_label": "RAI Convention Centre" }],
//   "active_trip_id": "trip_centraal_rai" }

find_route_options({})
// { "routes": [
//     { "route_id": "route_metro_52", "label": "Metro 52 + walk from Europaplein", "rank": 1, "score": 0.81, "walking_meters": 380, "transfers": 1, "step_free": true },
//     { "route_id": "route_metro_51", "label": "Metro 51 to Station RAI", "rank": 2, "score": 0.77, "walking_meters": 150, "transfers": 1, "step_free": true },
//     { "route_id": "route_tram_4", "label": "Tram 4 to the door", "rank": 3, "score": 0.74, "walking_meters": 40, "transfers": 0, "step_free": true }
//   ],
//   "recommended_route_id": "route_metro_52",
//   "fare_note": "All three options use the same GVB one-hour fare.",
//   "snapshot": { "source_date": "2026-08-20", "confidence": "medium" } }
```

> **Agent:** I found three curated options for this trip. Metro 52 plus a short walk from Europaplein ranks first: fastest, one transfer, step-free, but the last leg is a 380-meter outdoor walk to the RAI entrance. Metro 51 is close behind with a much shorter walk. Tram 4 goes almost to the door but takes the longest. All three cost the same, one GVB hour fare, so this isn't about price.

> **Human:** Metro 52 looks fastest. Why is there so much walking at the end?

```
inspect_route_segment({ route_id: "route_metro_52", segment_id: "seg_metro_52_europaplein_rai_walk" })
// { "segment": { "label": "Walk from Europaplein to the RAI entrance", "mode": "walk", "distance_meters": 380,
//                 "has_stairs": false, "surface": "outdoor", "accessibility": "step_free" },
//   "active_reports": [] }

check_route_constraints({ route_id: "route_metro_52" })
// { "satisfied": true, "violations": [],
//   "critique": { "headline": "Fastest option, but the walk from Europaplein station is 380 m outdoors.",
//                  "points": ["No stairs, no active reports on this segment.", "Longest single walking leg of the three options."] } }
```

> **Agent:** There's nothing wrong with that walk, it's step-free with no open reports. It's just the longest stretch of walking of the three options: 380 meters outdoors from the Europaplein platform to the entrance.

> **Human:** I've got a suitcase. Keep me under 250 meters of walking.

```
set_route_preferences({ walking_priority: "high", max_walking_meters: 250 })
// { "updated_fields": ["walking_priority", "max_walking_meters"],
//   "routes": [
//     { "route_id": "route_tram_4", "rank": 1, "score": 0.80 },
//     { "route_id": "route_metro_51", "rank": 2, "score": 0.78 },
//     { "route_id": "route_metro_52", "rank": 3, "score": 0.41 }
//   ],
//   "recommended_route_id": "route_tram_4", "previous_recommended_route_id": "route_metro_52" }

compare_route_options({ route_ids: ["route_tram_4", "route_metro_51", "route_metro_52"], criteria: ["walking", "reliability", "step_free_access"] })
// { "comparison": [
//     { "route_id": "route_tram_4", "walking_meters": 40, "reliability": "traffic-sensitive", "step_free": true },
//     { "route_id": "route_metro_51", "walking_meters": 150, "reliability": "high", "step_free": true },
//     { "route_id": "route_metro_52", "walking_meters": 380, "reliability": "high", "step_free": true }
//   ],
//   "flags": [{ "route_id": "route_tram_4", "type": "delay_report",
//                "message": "Active peak-hour delay report on Tram 4 through the city center.",
//                "confidence": "medium", "observed_at": "2026-08-29T08:10:00+02:00" }] }

show_route_on_scene({ route_id: "route_tram_4", display_mode: "primary" })
// { "status": "displayed", "displayed_route_id": "route_tram_4",
//   "segment_ids": ["seg_tram_4_centraal_boarding", "seg_tram_4_center_crossing", "seg_tram_4_rai_door"] }
```

> **Agent:** With walking capped under 250 meters, Tram 4 to the door now ranks first, it has almost no walking at all. But there's an active delay report for peak hours on that line through the city center. Metro 51 is a close second with a short, partly covered walk and no open reports, if you'd rather avoid that risk.

> **Human:** What happens if Tram 4 is delayed 15 minutes?

```
simulate_route_disruption({ route_id: "route_tram_4", segment_id: "seg_tram_4_center_crossing", delay_minutes: 15 })
// { "still_meets_deadline": true, "revised_arrival": { "buffer_minutes_worst": 9 },
//   "suggested_backup_route_id": "route_metro_51",
//   "trigger_condition": "Tram 4 city-center crossing delayed more than 15 min" }
```

> **Agent:** It still makes the 9:00 deadline, but the worst-case buffer drops to 9 minutes. I'd set Metro 51 as a backup in case that delay happens; it's step-free too, with a short walk.

> **Human:** Draft a plan with your top pick as primary and a backup, then save it.

```
create_draft_route_plan({ primary_route_id: "route_tram_4", backup_route_id: "route_metro_51" })
// { "status": "draft_created", "draft_id": "draft_k7q2m9", "saved": false,
//   "summary": "Tram 4 to the door as primary, Metro 51 to Station RAI as backup. Arrive by 09:00, estimated 08:31-08:51." }

save_route_plan({ draft_id: "draft_k7q2m9" })
// { "status": "confirmation_required", "draft_id": "draft_k7q2m9",
//   "message": "The human must confirm the exact plan on the confirmation sheet before it is saved.",
//   "requires_human_confirmation": true }
```

> **RouteRoom (confirmation sheet):** Save this route plan with Tram 4 as primary, Metro 51 as backup, and the displayed arrival estimate of 08:31-08:51? This will store the plan for this session.

> **Human:** *(clicks Confirm)*

```
save_route_plan({ draft_id: "draft_k7q2m9" })
// { "status": "saved", "plan_id": "draft_k7q2m9", "saved_at": "2026-09-04T07:48:03.000Z",
//   "summary": "Tram 4 to the door as primary, Metro 51 to Station RAI as backup. Arrive by 09:00, estimated 08:31-08:51.",
//   "changes_page_state": true, "requires_human_confirmation": true }
```

> **Agent:** Saved. Tram 4 is your primary, Metro 51 is the backup if that city-center crossing runs more than 15 minutes late.

## Screenshots

_Replace the placeholders below with real captures before submitting._

- `docs/screenshots/scene-primary.png`: the 3D scene showing the whole corridor with Metro 52 highlighted as primary.
- `docs/screenshots/scene-comparison.png`: route cards and the comparison table side by side with the 3D scene.
- `docs/screenshots/scene-critique.png`: the side drawer open on Tram 4, showing the delay report and its confidence.
- `docs/screenshots/scene-flip.png`: the scene after `set_route_preferences` flips the primary route to Tram 4.
- `docs/screenshots/confirmation-sheet.png`: the human-confirmation sheet before a plan is saved.

A short GIF or video clip covering the same sequence as `docs/DEMO_SCRIPT.md` is preferred over static screenshots if you have the time to capture one.

## Tool inventory

RouteRoom registers exactly 22 tools. Full input/output detail, including exact field names, is in [`docs/TOOLS.md`](./docs/TOOLS.md).

Every tool that returns route, segment, or report data returns it as a **curated snapshot**: hand-reviewed content with a source date, evidence freshness, and confidence, not live directions. `find_route_options` no longer takes origin, destination, or departure time; it returns the curated route options for whichever trip is currently selected, because RouteRoom compares a trip's route options, it does not route between arbitrary places. `find_place_options` is removed for the same reason. `list_trips` and `select_trip` are new: a city pack ships one or more curated trips, and these are how a human or agent sees what's available and picks one.

### Read-only (`annotations.readOnlyHint: true`)

| Tool | Side effect |
|---|---|
| `get_city_pack` | None. Reads the active city pack's identity, attribution, and reference data. |
| `get_trip_context` | None. Reads the active trip's origin, destination, deadline, preferences, and selected routes. |
| `list_trips` | None. Reads the curated trips this city pack ships with. |
| `inspect_route_segment` | None. Reads full detail on one route segment. |
| `check_route_constraints` | None. Reads a critic pass: constraint violations, warnings, and a plain-language critique. |
| `compare_route_options` | None. Reads a criterion-by-criterion comparison of routes already ranked. |
| `simulate_route_disruption` | None. Computes a what-if delay scenario without changing the trip. |
| `get_recent_route_reports` | None. Reads active, unexpired service reports for a segment or the city. |
| `get_score_breakdown` | None. Reads the exact weighted scoring components behind a route's rank. |
| `list_saved_plans` | None. Reads plans the human has already confirmed and saved this session. |

### Reversible (changes visible page state, nothing saved)

| Tool | Side effect |
|---|---|
| `select_trip` | Sets which of the city pack's curated trips is active and recomputes its route options. |
| `find_route_options` | Recomputes and returns the ranked, curated route options for the active trip. |
| `set_route_preferences` | Updates preferences and recomputes the ranking; may change which route is primary. |
| `show_route_on_scene` | Updates the 3D scene's visible routes, display modes, focused segment, and camera target. |
| `focus_route_segment` | Moves the camera to one segment and adds its route to the visible set if needed. |
| `select_primary_route` | Marks one route as the primary candidate and refreshes the critique. Nothing is saved. |
| `select_backup_route` | Marks one route as the backup candidate, or clears it. Nothing is saved. |
| `create_draft_route_plan` | Creates an in-memory draft plan (not saved), with a primary and optional backup route, and sets it as the active draft. |
| `draft_service_report` | Creates an in-memory, unpublished, sanitised report draft. |

### Confirmation-gated (require an explicit human click)

| Tool | Side effect |
|---|---|
| `save_route_plan` | Returns `confirmation_required` until a human confirms; then saves the plan for this session. |
| `share_route_plan` | Returns `confirmation_required` until a human confirms; then creates a read-only share link. |
| `publish_service_report` | Returns `confirmation_required` until a human confirms; then publishes the report to everyone using the city pack, low-confidence labeled, until it expires. |

## Architecture

```text
app/
  layout.tsx              root layout, metadata, viewport
  page.tsx                redirects to /planner
  not-found.tsx, error.tsx, states.css   app-shell states
  planner/
    page.tsx               the planner route
    loading.tsx, error.tsx page-level states
src/
  components/
    RouteScene.tsx          legacy/reference scene entry
    route-scene/            the scene contract (RouteSceneProps), types/palette, SVG fallback
    mapbox/                 MapboxRouteScene.tsx, the Mapbox GL JS v3 implementation of RouteSceneProps
    planner/                planner page composition (PlannerApp, share-link handling)
    panels/                 route cards, preference controls, activity log, confirmation sheet (ConfirmationPanel.tsx)
  lib/
    types.ts                shared domain types every layer speaks
    route-engine.ts         pure, deterministic scoring/ranking/comparison/simulation functions
    planner-store.ts        the single Zustand store; the one place human UI and WebMCP tools meet
    city-packs/              swappable city data (amsterdam/routes.geojson, points.geojson, ATTRIBUTION.md; index.ts, validateCityPack)
    webmcp/                  tool schemas and document.modelContext.registerTool wiring
    format.ts                locale-aware time/currency/distance formatting
scripts/
  import-osm.mjs             one-time OpenStreetMap export of route relations and landmarks for a city pack's routes.geojson/points.geojson
```

### Map provider

The visual map is Mapbox GL JS v3 with the Mapbox Standard style: it renders the real city in 3D (buildings, lighting, landmarks, terrain). RouteRoom does not ship bulk building geometry any more; Mapbox draws the surrounding city, and RouteRoom draws its own overlays on top from committed GeoJSON. See [ADR 0007](./docs/adr/0007-mapbox-standard-visual-provider.md) for the decision and [ADR 0003](./docs/adr/0003-map-reference-and-provider-boundary.md) for the provider boundary it exercises. ADR 0006, the level-of-detail corridor built on committed building geometry, is superseded by ADR 0007 and no longer describes the shipped scene.

The scene component (`src/components/mapbox/MapboxRouteScene.tsx`, exported as `RouteScene` from `src/components/route-scene`) implements the existing `RouteSceneProps` contract. It reacts to planner state: visible routes, display modes, the focused segment, the camera target, active reports, and disrupted segments. It never owns selection state itself. Human clicks and WebMCP tool calls change the same store, so the map responds identically either way. A `routeroom:reset-view` window `CustomEvent` returns the camera to the overview.

The camera moves between a small set of presets: an overview of the RAI district and its local decision points, a route preset that fits the selected route, an arrival preset (Europaplein, Station RAI, venue entrances), and a feature preset for a focused segment, stop, entrance, or report. Reduced motion is respected; camera easing and animated dots are skipped when the user has that preference set.

Route overlays render in the Mapbox Standard "middle" slot; symbols and markers render in the "top" slot. Colors: primary route vermilion `#d9603b`, backup route dark slate `#3b4a56`, other candidates neutral gray, amber `#d9a441` reserved for warnings, stairs, reports, and disruptions. Walking segments are dotted; transit segments are solid.

Route and landmark geometry lives in `src/lib/city-packs/amsterdam/`: `routes.geojson` (one LineString per route segment, `id` = segment id) and `points.geojson` (landmarks, `id` = landmark id), derived from the city pack and OpenStreetMap route relations via `scripts/import-osm.mjs`, with provenance and export date recorded in `src/lib/city-packs/amsterdam/ATTRIBUTION.md`.

### One store, two actors

`src/lib/planner-store.ts` is the single source of truth for trip state, ranked routes, the 3D scene's display state, drafts, saved plans, and the activity log. Every store action takes an `actor: "human" | "agent" | "system"` parameter purely so the activity log can say who did what. The action itself (`findRouteOptions`, `setPreferences`, `showRoute`, `createDraftPlan`, and so on) is identical no matter which actor calls it. A WebMCP tool's `execute` function is a thin, validated, `snake_case` wrapper around exactly the same store action a button's `onClick` calls.

The one exception is `approveConfirmation`, which is wired only to the human-clicked Confirm button in the UI. No WebMCP tool calls it, ever. `savePlan`, `sharePlan`, and `publishServiceReport` all check whether the human has already approved that exact draft; if not, they open the confirmation sheet and return `confirmation_required` instead of committing anything.

### Deterministic scoring

Every route's score is computed by `scoreRoute` in `src/lib/route-engine.ts`, from the same six weighted components every time, given the same inputs:

```text
route_score =
  reliability_weight * reliability_score
  + arrival_buffer_weight * buffer_score
  + fare_weight * fare_score
  + walking_weight * walking_score
  + accessibility_weight * accessibility_score
  + weather_weight * weather_score
```

Base weights before any adjustment: reliability 0.30, arrival buffer 0.20, fare 0.15, walking 0.15, accessibility 0.10, weather 0.10.

Three adjustments run before the weights are used:

1. **Priority multipliers.** The `reliability_priority`, `fare_priority`, and `walking_priority` preferences (each `"low" | "medium" | "high"`) multiply that component's base weight by 0.5 (low), 1 (medium), or 2 (high).
2. **Toggle multipliers.** The `avoid_stairs` and `minimize_rain_exposure` preferences multiply the accessibility and weather weights, respectively, by 1.5 when the toggle is on and 0.4 when it is off.
3. **Renormalisation.** All six adjusted weights are summed, and each is divided by that sum so the final weights always add up to 1. This is why, for example, turning `avoid_stairs` off doesn't just shrink the accessibility weight in isolation. It also nudges every other component's effective weight up slightly, since they now make up more of the total.

The fare score itself is relative, not absolute: the cheapest route being compared (its max fare, capped at the `max_fare` preference) scores 1, the `max_fare` limit itself scores 0, and every other route's fare score falls linearly in between. A route already over the fare limit can still score above 0 if it's the cheapest option on the table; the multiplicative penalty below is what actually punishes it for exceeding the limit.

After the weighted score is computed, multiplicative penalties are applied for anything that breaks a hard constraint: over the fare limit (×0.5), over the transfer limit (×0.6), over the walking limit (×0.6), stairs present while `avoid_stairs` is on (×0.5), and a blocked segment (×0.05). These stack multiplicatively, so a route that is both over-budget and blocked scores very close to zero without the raw weighted score ever needing to know about penalties.

`get_score_breakdown` returns every component's effective weight, normalised 0-1 score, and weighted contribution, plus every penalty applied, so an agent can explain a recommendation with the actual numbers instead of asserting "this one is better."

## Local setup

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/planner`.

### Mapbox setup

The 3D map needs a Mapbox access token.

1. Create a free account at [mapbox.com](https://www.mapbox.com/).
2. In the Mapbox account dashboard, create a new **public** token (it starts
   with `pk.`). Restrict it by URL to `http://localhost:3000` for local
   development; add your deployed domain(s) later, for production use.
3. Copy `.env.example` to `.env.local` and set
   `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-token`.
4. Restart the dev server (`npm run dev`) so Next.js picks up the new
   environment variable.

Without a token, or with an invalid one, the planner falls back to the SVG
map with a short notice. Everything else keeps working normally: route
ranking, preferences, drafts, saving, sharing, reports, and all 22 WebMCP
tools. The token only affects the visual map.

Before deploying, or any time you want confidence the build is clean:

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` followed by `npm run start` runs the production server locally on `http://localhost:3000` as well, which is worth doing at least once before deploying: dev mode can hide issues that only show up in a production build.

## WebMCP testing

**Honest status as of 2026-09-03: WebMCP has not yet been verified in a WebMCP-capable browser.** Only the in-page tool console and `window.__routeroomTools` have been exercised so far. Nothing in this repository should be read as a claim that tool discovery has been confirmed in Chrome or in ChatGPT's browser; that step is still outstanding. Full step-by-step instructions, mapped to the plan's acceptance criteria, and the current, honest verification status are in [`docs/WEBMCP_TESTING.md`](./docs/WEBMCP_TESTING.md), specifically its "Verification status (honest record)" section. Read that section before claiming this project's WebMCP integration has been validated. Summary of the intended setup:

**Chrome.** Enable the current WebMCP/Model Context flag in `chrome://flags` on a Chrome build that has it (this has shipped behind an experimental flag during the proposal's development; check the [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp) for the current channel and flag name before testing, since this is actively changing). Open the planner at the top level and use Chrome's own tool/agent surface for the page to see the registered tools.

**ChatGPT's browser.** Open the deployed planner URL directly at the top level. Per the plan's official source notes, the current ChatGPT browser does not discover declarative tools or tools registered inside an iframe. RouteRoom registers all 22 tools imperatively on the top-level page for exactly this reason, so this is expected to work without any special setup, but that expectation has not yet been confirmed against an actual ChatGPT browser session. Check the [ChatGPT Learn: Site tools/WebMCP](https://learn.chatgpt.com/docs/webmcp) docs for anything that has changed since this was written.

**No WebMCP browser available.** Every tool is reachable without one. Open the in-page Agent tool console on the planner page, or drive it from DevTools directly:

```js
const tool = await window.__routeroomTools.find(t => t.name === "find_route_options");
await tool.execute({});
```

`window.__routeroomTools` exposes the same 22 tool definitions (same names, same schemas, same `execute` functions) that get registered with `document.modelContext`. The normal on-page UI also works with zero WebMCP support at all; nothing in the primary workflow depends on tool discovery. This tool console is what has actually been exercised to date; it stands in for a WebMCP browser until one is used to verify registration directly.

## City packs

RouteRoom ships one city pack for the demo: **Amsterdam Centrum to RAI** (`amsterdam_centrum_rai`), a real district: Amsterdam Centraal Station to the RAI convention centre. Aurora City and Harbor City, the earlier synthetic packs, have been deleted; a real district makes the "provider adapter" idea concrete instead of demonstrating it against invented geometry (see [ADR 0005](./docs/adr/0005-city-packs-carry-real-geometry.md)). The product itself stays city-agnostic: a city pack is a replaceable bundle of data, never product identity.

The pack's route and landmark geometry, `routes.geojson` (one LineString per route segment) and `points.geojson` (landmarks), comes from a one-time OpenStreetMap export of route relations, run through the importer:

```bash
node scripts/import-osm.mjs
```

This produces the pack's `routes.geojson` and `points.geojson` plus the export date, and it is meant to be run once and committed, not run at build or request time. Re-running it deliberately refreshes the snapshot; the deployed app never makes a live OpenStreetMap request. Mapbox renders the surrounding city itself; RouteRoom does not ship bulk building geometry. Because the route overlay data is OpenStreetMap-derived, every page that shows it must also show the ODbL attribution: "© OpenStreetMap contributors, ODbL" plus the export date, alongside Mapbox's own attribution control. This appears in the product itself, not only in this README (see `docs/DEPLOYMENT.md`).

To add a city pack:

1. Run `node scripts/import-osm.mjs` to get real route relations and landmarks for your district and its export date. There is no building import.
2. Curate the pack's trips and each trip's route options by hand, since RouteRoom compares curated route options, it does not compute routes.
3. Implement the `CityPack` type from `src/lib/types.ts` in a new file under `src/lib/city-packs/`.
4. Commit `routes.geojson`, `points.geojson`, and an `ATTRIBUTION.md` for the pack: the ODbL string, the export date, and the license and source of anything else imported.
5. Register the pack in `src/lib/city-packs/index.ts`'s `cityPacks` array.
6. Run `validateCityPack(yourPack)` (exported from the same file) and fix everything it reports: it checks duplicate IDs, dangling landmark references, fare/duration ordering, walking-distance consistency, transfer counts, report references, default-trip timestamp ordering, and that route and landmark geometry references resolve.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full walkthrough. The route engine (`src/lib/route-engine.ts`) takes a `CityPack` as a plain parameter; it has no Amsterdam-specific branching, which is the whole point of the city-pack architecture.

## Data provenance and limitations

Everything RouteRoom shows about a route, a segment, or a report is a **curated snapshot**: content captured and reviewed at a stated source date, carrying an evidence-freshness label and a confidence label. It is an estimate, not live directions, and the product says so wherever this data appears, in the UI and in every tool result that returns it.

There is no live traffic, no live transit data, and no third-party routing, geocoding, search, or navigation API. Route durations and reliability are hand-authored estimates, not measurements. The basemap itself, streets, buildings, terrain, is rendered live by Mapbox Standard; RouteRoom's route and landmark overlays are a curated, committed GeoJSON snapshot derived from the city pack and OpenStreetMap route relations (see the City packs section above), not computed by Mapbox. Service reports have a `source` of either `"seed"` (hand-authored, matching the confidence label shown) or `"user"` (submitted through `draft_service_report` / `publish_service_report`, always shown at low confidence).

Fares in the Amsterdam demo pack are described as the standard GVB one-hour fare for all three curated routes; this figure has not been independently re-verified against GVB's current published fares as of this writing, so treat it as a demo assumption to confirm before quoting it anywhere outside the demo. The same caution applies to any duration or reliability figure: it reflects the pack's source date, not today.

## Safety and privacy

- Service report text is untrusted, user-submitted content. It is sanitised server-side and client-side (`sanitizeReportText` in `src/lib/route-engine.ts` strips URLs and address-shaped substrings and caps length) before it is ever stored, even as a draft, and it is always escaped when rendered. It is never treated as an instruction by any tool or by the agent.
- RouteRoom deals in landmarks and approximate areas (a station, a venue, a park), never exact home addresses.
- Saving a plan, sharing a plan, and publishing a service report all require an explicit human confirmation that states the exact side effect before anything happens. No WebMCP tool can approve its own confirmation.
- Tool errors are sanitised: `{ status: "not_found" | "invalid_input" | "confirmation_required" | "already_done", message }`, never a raw exception, stack trace, or internal file path.
- The one environment variable RouteRoom uses, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, is a public browser token by design, the kind that starts with `pk.`. A secret token (`sk.`) is rejected by the app rather than used. The app never logs the token and never proxies it through a backend; restrict it by URL in the Mapbox account, and never commit a real value (see `.env.example`). No other credential, API key, or token exists anywhere in this repository or in any tool's input or output schema.

## What was added during the challenge period

Everything in this repository was built during the WebMCP challenge period, starting from `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md` as the design document. There is no pre-existing product this was adapted from; RouteRoom did not exist before this plan. Specifically new for this challenge: the city-pack data model and the Amsterdam Centrum to RAI demo pack (built from a one-time OpenStreetMap export, replacing the earlier synthetic Aurora City and Harbor City packs), the OSM import script, the deterministic route engine and its scoring/comparison/simulation functions, the shared planner store, the 22-tool WebMCP registration layer including the trip-scoped `list_trips`/`select_trip` tools, the Mapbox GL JS v3 scene built on the Mapbox Standard style with committed route and landmark overlays, the route cards / preference controls / activity log / confirmation sheet UI, and this documentation set. WebMCP tool registration itself has been exercised only through the in-page tool console and `window.__routeroomTools` as of 2026-09-03; verification in an actual WebMCP-capable browser is still outstanding (see the WebMCP testing section above).

## License

MIT. See [`LICENSE`](./LICENSE).

---

See [`CLAUDE_WEBMCP_ROUTEROOM_PLAN.md`](./CLAUDE_WEBMCP_ROUTEROOM_PLAN.md) for the full implementation plan, tool contracts, and submission checklist, [`docs/TOOLS.md`](./docs/TOOLS.md) for exact tool schemas, [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md) for the video shot list, [`docs/WEBMCP_TESTING.md`](./docs/WEBMCP_TESTING.md) for the acceptance checklist, and [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for hosting instructions.
