# RouteRoom 3D — Global WebMCP Project Design and Implementation Plan

## Handoff instructions for Claude

Build a polished, working WebMCP demo called **RouteRoom 3D**. It is a global, city-agnostic product—not an IskoRank, UP Manila, or Philippines-specific app.

The product thesis is:

> RouteRoom is a shared commute decision room where a human sets priorities and an agent searches, compares, stress-tests, and visually updates routes in a 3D city scene. The human controls final decisions, saved plans, sharing, and public reports.

Do not build a generic map with a chat bubble. WebMCP must be central: the agent should call typed tools that operate on the same live route state the human sees, and the 3D scene must visibly change when those tools run.

Prioritize:

1. Reliable top-level WebMCP registration and discovery.
2. A complete human-agent route-planning workflow.
3. A memorable low-poly 3D map.
4. Transparent route tradeoffs and uncertainty.
5. Human-confirmation gates for saving, sharing, and reporting.
6. A public deployment and a sub-three-minute demo path.

If real-time routing or city-scale 3D data becomes a blocker, use a curated local **city pack**. Keep the architecture global even if the demo dataset covers one city district.

## 1. Product decision

### What changed from the original concept

Remove:

- IskoRank branding
- UP Manila references
- professor/course ranking
- Philippines-only assumptions
- PHP-only fare fields
- campus-only terminology

Replace them with:

- neutral RouteRoom branding
- generic origin, destination, appointment, and arrival deadline
- city packs that can be swapped without changing the app
- locale-aware currency and time zone fields
- transit, walking, cycling, accessibility, rain, and reliability constraints

### One-sentence description

RouteRoom 3D helps people plan difficult city trips by letting an agent compare routes, reason about uncertainty, and update an explorable 3D city scene while the human adjusts priorities and approves the final plan.

### Example user request

> I need to reach the conference center by 8:30 AM. Keep the cost below 10 euros, avoid more than two transfers, minimize outdoor walking, and give me a backup if the main line is delayed.

The exact city, currency, and transport modes should come from the selected city pack. The product must not assume one country’s fare system.

## 2. Why this is a strong WebMCP project

Normal map applications optimize for a single query: origin, destination, and fastest route. RouteRoom handles a collaborative, multi-step decision:

1. The human states an intent and constraints.
2. The agent retrieves structured route and place context.
3. The agent proposes multiple candidates.
4. A critic workflow stress-tests the candidates.
5. The human changes priorities.
6. The agent recomputes the comparison and updates the 3D scene.
7. The human approves a primary and backup plan.
8. The human may submit a disruption or accessibility report after reviewing it.

The final artifact is a route decision record, not just a chat response. It includes the preference snapshot, alternatives considered, evidence freshness, tradeoffs, primary route, backup route, and human decisions.

This is meaningfully better with WebMCP because the agent can use the website’s own route logic, state, visual scene, and confirmation flow without scraping buttons or requiring a separately installed integration.

## 3. Target users and use cases

The initial audience is anyone navigating an unfamiliar or complex city:

- commuters balancing cost and reliability
- travelers arriving for an appointment or event
- people with accessibility or reduced-walking needs
- visitors navigating a large venue or district
- people planning around weather, luggage, or multiple transfers

The first demo should use one concrete city district and one realistic trip. The brand and data model should support many city packs later.

## 4. Product experience

### Required result

For a valid request, show:

- a primary route
- at least two alternatives
- estimated duration range
- estimated fare range in the city pack’s currency
- transfer count
- walking distance
- arrival buffer
- accessibility notes
- outdoor/rain exposure where known
- confidence and evidence freshness
- active disruption observations
- a backup route and its trigger condition
- an explanation of tradeoffs

Use estimates and confidence labels. Do not claim live traffic, exact safety, or guaranteed arrival unless the dataset genuinely supports it.

### Human-agent collaboration loop

1. Human selects a city pack and enters an origin, destination, and deadline.
2. Human states preferences in natural language or controls.
3. Agent calls `get_trip_context` and `find_route_options`.
4. The 3D scene displays candidate routes with route cards.
5. Agent calls `inspect_route_segment` and `simulate_route_disruption` for a weak point.
6. A critique panel explains why the cheapest or fastest route may not be best.
7. Human changes a preference, such as prioritizing reliability over price.
8. Agent calls `set_route_preferences`, `compare_route_options`, and `show_route_on_scene`.
9. Agent creates a draft primary/backup plan.
10. Human reviews the exact plan and confirms saving or sharing.

### What the product is not

- Not a turn-by-turn navigation replacement.
- Not a global live-traffic service.
- Not an autonomous transportation booking system.
- Not a safety guarantee.
- Not a social feed of unmoderated location data.
- Not a full-world 3D mapping project for the hackathon.

## 5. 3D map direction

### Visual target

Use the supplied reference as inspiration: a soft, pastel, low-poly, isometric 3D map with simplified buildings, roads, green spaces, water, and landmarks.

Recommended style:

- muted cream, green, blue, and gray environment
- extruded building footprints
- glowing route ribbons
- animated dots moving along the selected path
- colored transfer markers
- muted inactive routes
- focused camera movement when the agent inspects a segment
- simple callouts for entrances, stations, crossings, stairs, and reports

### Spatial meaning

The map should help answer:

- Which side or entrance of the destination does the route use?
- Where are the transfers?
- Which route has the most walking?
- Which segment includes stairs or an accessibility caution?
- Which route is more exposed to rain?
- Where does a disruption report apply?

Do not add 3D merely for spectacle. Every highlighted object should support a decision.

### Technical scope

Build a single district scene, not a full city. Use React Three Fiber or plain Three.js with local JSON/GeoJSON. Buildings can be simple extrusions from hand-authored polygons. A GLB model is optional.

Include a route-list fallback for low-power devices, browsers without WebGL, and normal users who prefer a non-3D view.

## 6. WebMCP implementation requirements

### Platform constraints

Use imperative JavaScript registration on the top-level planner page:

```ts
if (typeof document.modelContext?.registerTool === "function") {
  await document.modelContext.registerTool({
    name: "get_trip_context",
    title: "Read current trip context",
    description: "Read the current city, origin, destination, deadline, and commute preferences. This tool does not change application state.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async () => getTripContext(),
  });
}
```

Register tools on initial page load. Do not require the human to click a button before tools become discoverable.

Do not rely on declarative form tools for the primary demo. The current ChatGPT built-in browser site-tool implementation does not discover declarative tools or tools registered inside iframes. The map, route cards, activity log, and tool registry should be available from the same top-level page.

Use the same application services for human controls and WebMCP handlers. Do not create a weaker or less-validated agent-only backend path.

### Tool categories

#### Read-only tools

Mark these with `annotations: { readOnlyHint: true }`:

- `get_city_pack`
- `get_trip_context`
- `find_place_options`
- `find_route_options`
- `inspect_route_segment`
- `check_route_constraints`
- `compare_route_options`
- `simulate_route_disruption`
- `get_recent_route_reports`

#### Reversible actions

These update visible working state but do not commit a public or sensitive action:

- `set_route_preferences`
- `show_route_on_scene`
- `focus_route_segment`
- `create_draft_route_plan`
- `select_primary_route`
- `select_backup_route`

#### Sensitive or commitment actions

These must require explicit human confirmation:

- `save_route_plan`
- `share_route_plan`
- `draft_service_report`
- `publish_service_report`

For user-submitted reports and other untrusted content, use `untrustedContentHint: true` where supported. Escape content in the UI and never treat returned user text as instructions.

### Tool descriptions

Use clear conventional `snake_case` names. Descriptions must accurately state side effects. Avoid ambiguous names such as `finalize_plan`, `apply_changes`, or `update_everything`.

Every tool should have:

- a purpose-specific name
- a description an agent can act on without guesswork
- a narrow JSON schema
- `additionalProperties: false` where appropriate
- structured output
- stable IDs for routes and segments
- an explicit statement of whether it changes page state

### Recommended tool contracts

#### `get_trip_context`

Input: no fields.

Output:

```json
{
  "city_id": "demo_city",
  "origin_label": "Central Station",
  "destination_label": "Riverside Conference Center",
  "arrival_deadline": "2026-09-04T08:30:00+02:00",
  "preferences": {
    "max_fare": 10,
    "currency": "EUR",
    "max_transfers": 2,
    "walking_priority": "high",
    "reliability_priority": "high",
    "avoid_stairs": true,
    "rain_exposure": "minimize"
  }
}
```

Do not infer or request an exact home address. Prefer landmarks or approximate origin areas.

#### `find_route_options`

Input:

```json
{
  "city_id": "demo_city",
  "origin_id": "central_station",
  "destination_id": "riverside_center",
  "depart_at": "2026-09-04T07:00:00+02:00",
  "arrival_deadline": "2026-09-04T08:30:00+02:00",
  "max_fare": 10,
  "currency": "EUR",
  "max_transfers": 2,
  "avoid_stairs": true,
  "max_walking_meters": 1200
}
```

Output: route candidates with stable IDs, segment IDs, geometry references, duration ranges, fare ranges, transfer count, walking distance, confidence, freshness, accessibility notes, and tradeoffs.

#### `inspect_route_segment`

Input:

```json
{
  "route_id": "route_station_tram_walk",
  "segment_id": "segment_river_crossing"
}
```

Output: transport mode, distance, duration range, landmarks, transfer details, accessibility notes, rain exposure, active reports, and evidence freshness.

#### `compare_route_options`

Input:

```json
{
  "route_ids": ["route_station_tram_walk", "route_station_bus_walk", "route_station_walk_only"],
  "criteria": ["reliability", "fare", "walking", "arrival_buffer"]
}
```

Output: structured criterion-by-criterion comparison and contributing values. Do not return only a prose ranking.

#### `simulate_route_disruption`

Input:

```json
{
  "route_id": "route_station_tram_walk",
  "disruption": {
    "segment_id": "segment_river_crossing",
    "delay_minutes": 15
  }
}
```

Output: revised arrival range, deadline status, affected segments, and backup candidates.

#### `set_route_preferences`

Input: only supported preference fields such as maximum fare, maximum transfers, walking priority, reliability priority, accessibility requirements, and rain exposure.

Behavior: update visible working state and recompute the comparison. Do not save a permanent profile.

#### `show_route_on_scene`

Input:

```json
{
  "route_id": "route_station_tram_walk",
  "display_mode": "primary",
  "show_segments": true,
  "camera_target": "riverside_center_entrance"
}
```

Behavior: update the 3D scene, route cards, camera target, and activity log. Return the displayed route ID and segment IDs so the agent can verify the result.

#### `create_draft_route_plan`

Input: primary route ID, optional backup route ID, preference snapshot, arrival target, rationale, and trigger condition for the backup.

Behavior: create a draft only. Return a stable draft ID and exact human-readable summary.

#### `save_route_plan`

Input: draft ID and confirmation state.

Behavior: if the human has not approved the exact plan in the UI, return `confirmation_required` and show the confirmation panel. Saving must not occur before approval.

#### `draft_service_report`

Input: segment ID, report category, observation text, observed time, approximate landmark, and optional expiration time.

Behavior: create an unsubmitted draft. Strip exact private locations and unnecessary personal information.

#### `publish_service_report`

Input: report draft ID and confirmation state.

Behavior: show the exact text, affected segment, audience, and freshness/expiration policy. Publish only after explicit human confirmation.

## 7. Application state and architecture

### Suggested file structure

```text
app/
  page.tsx
  planner/page.tsx
  api/routes/route.ts
  api/plans/route.ts
  api/reports/route.ts
components/
  route-scene/
  route-cards/
  preference-controls/
  agent-activity-log/
  confirmation-panel/
lib/
  city-packs/
    demo-city.ts
    types.ts
  route-engine/
  permissions/
  webmcp/
    registerWebMcpTools.ts
    toolSchemas.ts
    toolDescriptions.ts
```

### Shared planner state

```ts
type PlannerState = {
  cityId: string;
  tripContext: TripContext;
  routeOptions: RouteOption[];
  selectedPrimaryRouteId?: string;
  selectedBackupRouteId?: string;
  visibleRouteIds: string[];
  focusedSegmentId?: string;
  sceneCameraTarget?: string;
  activity: ActivityEvent[];
  pendingConfirmation?: ConfirmationRequest;
};
```

Use React state, Context, or Zustand. Keep the implementation simple.

### Core rule

Buttons, forms, and WebMCP tools must invoke the same route-engine functions, validators, and permission checks. WebMCP should expose application capability—not a second simulation of the app.

## 8. City-pack data strategy

The global product should use a portable city-pack schema:

```ts
type CityPack = {
  id: string;
  name: string;
  timezone: string;
  defaultCurrency: string;
  landmarks: Landmark[];
  routeOptions: RouteOption[];
  sceneFeatures: SceneFeature[];
  reports: RouteReport[];
  attribution?: string[];
};
```

For the hackathon, ship one polished city pack. Add a second small pack only if it is easy. The product should demonstrate that the city is a replaceable data package, not a hard-coded identity.

### Data options

Preferred order:

1. Curated local seed data for reliability and zero API cost.
2. Open map data with attribution if it can be imported once during development.
3. Optional server-side public routing endpoint only after the demo works locally.

Do not make the live demo depend on a paid map, traffic, geocoding, or transit API. Do not expose API keys in the browser or repository.

## 9. Transparent route scoring

Use deterministic scoring that the agent can explain:

```text
route_score =
  reliability_weight * reliability_score
  + arrival_buffer_weight * buffer_score
  + fare_weight * fare_score
  + walking_weight * walking_score
  + accessibility_weight * accessibility_score
  + weather_weight * weather_score
```

Show the input values and weights. The agent may propose or change weights, but the route engine must remain deterministic and testable.

Avoid unsupported claims such as “safest route.” Prefer “lower walking,” “fewer transfers,” “more reliable based on recent reports,” or “accessibility data unavailable.”

## 10. Safety, privacy, and confirmation

WebMCP tools and their results are untrusted content. Route reports may contain misleading text or prompt-injection attempts. Treat reports as data only.

Required protections:

- validate all tool inputs server-side and client-side
- limit text lengths
- escape report text in rendered UI
- do not store exact home addresses
- use landmarks or approximate areas
- show report timestamps and expiration
- do not publish reports automatically
- do not save or share plans without confirmation
- keep tool descriptions aligned with actual behavior
- return sanitized errors
- keep credentials and keys out of tool inputs and outputs

Confirmation copy must describe the exact side effect:

> Save this route plan with Route A as primary, Route B as backup, and the displayed arrival estimate of 08:12–08:24? This will store the plan for this session.

## 11. Implementation sequence

### Phase 1 — WebMCP proof of life

Create the top-level planner page and register:

- `get_trip_context`
- `find_route_options`
- `show_route_on_scene`

Verify tool discovery in a compatible browser before building visual polish.

### Phase 2 — City pack and route engine

Add landmarks, route segments, route candidates, confidence, freshness, scoring, constraint checking, and delay simulation. Use local seed data.

### Phase 3 — 3D scene

Build the low-poly district scene with buildings, streets, landmarks, route geometry, transfer markers, selected/faded states, camera focus, and a 2D/list fallback.

### Phase 4 — Agentic workflow

Add route cards, preference controls, tool activity log, segment inspection, critic state, route comparison, and visual updates.

### Phase 5 — Human confirmation

Add draft plan, confirmation panel, save/share behavior, report draft, publish confirmation, and audit events. Confirm that an agent cannot bypass the gates.

### Phase 6 — Deployment and submission materials

Add loading, empty, error, and unsupported-browser states. Deploy to Vercel, Cloudflare, Netlify, or Render. Add a public repository with an open-source license, complete README, and demo video.

## 12. Three-minute demo script

Keep the video under three minutes with clear narration and no copyrighted music.

### 0:00–0:20 — Problem

“A route is not just a line from A to B. People balance arrival deadlines, cost, walking, transfers, accessibility, weather, and uncertainty.”

Show the low-poly city scene and an empty route room.

### 0:20–0:55 — Initial request

Ask the agent:

> Find a route from Central Station to the Riverside Conference Center. Arrive by 8:30, stay under 10 euros, avoid stairs, and minimize outdoor walking.

Show the WebMCP activity log and route tools being called.

### 0:55–1:25 — Candidate routes

Show three route cards and their colored paths in the 3D scene. Focus on the transfer segment.

### 1:25–1:55 — Critique and uncertainty

The critic identifies that the cheapest route has a recent delay report and a smaller arrival buffer. Show the report’s timestamp and confidence.

### 1:55–2:20 — Human changes intent

The human changes the priority from lowest fare to highest reliability. The agent calls the preference and comparison tools again. The highlighted route changes in the 3D scene.

### 2:20–2:40 — Contingency

Simulate a 15-minute delay. The agent creates and displays a backup route.

### 2:40–3:00 — Human control

The agent drafts a route plan. The human reviews the exact primary and backup routes and confirms saving. Briefly show that a service report remains a draft until explicitly published.

## 13. Acceptance criteria

### WebMCP

- Imperative `document.modelContext.registerTool` is used.
- Tools register on the top-level planner page during initial load.
- At least eight useful tools are discoverable.
- Tool names use clear `snake_case` naming.
- Each tool has a precise description and narrow JSON schema.
- Read-only tools are marked read-only.
- Tool results contain stable IDs and enough data to verify changes.
- Tool calls update visible cards, scene state, or activity log.
- No primary workflow depends on declarative tools or iframes.

### Product

- A human or agent can create a trip plan.
- At least three route options are shown.
- The 3D scene displays the selected route and landmarks.
- Changing preferences changes the route comparison.
- Delay simulation produces a backup route.
- Activity log distinguishes suggestions, drafts, and confirmed actions.
- Save/share/publish actions require confirmation.
- The normal UI works without WebMCP.
- The city pack can be replaced without changing the route-engine API.

### Submission

- Public live URL accessible in a WebMCP-compatible browser.
- Public code repository.
- Visible open-source license.
- README explaining why WebMCP is necessary.
- Public YouTube demo under three minutes.
- Documentation distinguishing pre-existing work from new WebMCP work.
- No credentials, API keys, or personal data in the repository.

## 14. README outline

The repository README should include:

1. What RouteRoom 3D does.
2. Why the use case is better with WebMCP.
3. A human-agent interaction transcript.
4. Screenshots or a GIF of the 3D scene changing after tool calls.
5. Tool inventory and trust categories.
6. Local setup instructions.
7. WebMCP testing instructions for Chrome and ChatGPT’s browser.
8. City-pack/data limitations and attribution.
9. Safety and privacy limitations.
10. What was added during the challenge period.
11. License.

## 15. Official source notes

This plan is based on:

- [WebMCP Challenge](https://webmcp.devpost.com/)
- [Challenge rules](https://webmcp.devpost.com/rules)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome guide to designing agentic workflows](https://developer.chrome.com/docs/ai/webmcp/build-tools)
- [OpenAI Developers Showcase](https://developers.openai.com/showcase)
- [ChatGPT Learn: Site tools/WebMCP](https://learn.chatgpt.com/docs/webmcp)

Relevant implementation conclusions:

- WebMCP exposes JavaScript-based website tools to agents.
- Tools include names, descriptions, schemas, and execute callbacks.
- WebMCP is particularly useful when humans and agents share live page state.
- The current ChatGPT browser supports a subset of the proposal and does not discover declarative or iframe tools.
- Tool definitions and returned content are untrusted and must not be treated as instructions.
- Side effects must be accurately described and consequential actions must remain human-confirmation-gated.
- The challenge requires a live URL, public repository with an open-source license, a WebMCP explanation, and a public YouTube demo under three minutes.

## Final instruction to Claude

Build RouteRoom as a global product with a replaceable city-pack architecture. Use one tightly scoped, reliable demo district rather than pretending to have live global coverage. Get the WebMCP tool surface and the human-agent workflow working first, then add the low-poly 3D polish. The final experience should feel like a person and an agent jointly exploring and negotiating a route in the same spatial workspace—not like a conventional map with an AI button.
