# Devpost submission, paste-ready fields

Each heading matches a field on the Devpost submission form. Fill the three
placeholders (live URL, repo URL, video) once the deploy, push, and recording
are done. Do not submit until you have verified the live URL in the target
browser.

---

## Project name (60 characters max)

```
RouteRoom 3D
```

## Elevator pitch (200 characters max)

```
A shared route-decision room where an agent compares city routes on a live 3D map and the human approves every saved plan. Built on WebMCP.
```

---

## About the project (Markdown)

```markdown
## Inspiration

Choosing a route is rarely just "fastest." A person is usually balancing an
arrival deadline, walking distance, luggage, transfers, accessibility,
reliability, and how fresh the evidence is. A normal map shows options but
gives an agent no structured way to work the same route state, explain the
tradeoffs in space, and revise the recommendation when priorities change. We
wanted a workspace where a person and an agent decide together, and where the
person still approves anything that gets saved or shared.

## What it does

RouteRoom is a shared route-decision room. The Amsterdam demo compares three
curated route options from Amsterdam Centraal to the RAI convention centre:
Metro 52 plus a walk, Tram 4 to the door, and Metro 51 to Station RAI. An
agent can rank the options, inspect a segment, compare candidates, simulate a
delay, and update the visible ranking and the 3D map. The person can change
priorities and the recommendation moves. When the person says they have a
suitcase and cap walking at 250 metres, the pick shifts off Metro 52 and the
agent surfaces Tram 4's peak-hour delay report. Saving, sharing, and
publishing a report always stop at a human confirmation sheet.

This is a bounded demo, not live global routing.

## Why WebMCP is the right fit

RouteRoom registers 22 typed tools on the top-level planner page with
`document.modelContext.registerTool`. Each tool handler is a thin, validated
wrapper around the same store and deterministic engine the buttons use, so an
agent action and a human click change the same route cards, map overlays,
camera, draft state, and activity log. Stable trip, route, segment, and draft
IDs make every result inspectable.

Without WebMCP the agent would guess at UI controls or narrate changes in
chat. With WebMCP it operates on the site's declared capabilities and returns
structured results while the person watches the same state change. That is the
thing that was not possible before: a person and an agent negotiating a real
decision on one shared, inspectable state, with the human holding the
commit.

## How we built it

Next.js 15, React 19, TypeScript, Zustand for the shared store, Zod for tool
input validation, and Vitest for the engine and tool tests. The map is Mapbox
GL JS v3 with the Mapbox Standard style, behind a provider boundary, with an
SVG fallback when the token or WebGL is missing. Route and landmark overlays
are committed GeoJSON derived from a one-time OpenStreetMap export, with ODbL
attribution and an export date. The route engine does the ranking, scoring,
constraint checks, comparison, and disruption simulation. Mapbox is
presentation only.

## Challenges we ran into

- Designing a tool surface that manipulates meaningful state instead of
  wrapping buttons or turning the product into a chat box.
- Keeping human and agent actions on one state model while preserving the
  confirmation boundary for save, share, and publish.
- Showing a five-kilometre corridor without hiding route differences.
- Communicating uncertainty honestly when the demo data is curated, not live.

## Accomplishments we are proud of

- A shared store where a person and an agent operate the same route state.
- 22 declared WebMCP tools split into read-only, reversible, and
  confirmation-gated, with the gate enforced so a tool cannot approve itself.
- Curated data with visible provenance, freshness, and confidence, plus an
  open-source repository and an SVG fallback.

## What we learned

WebMCP is most valuable when the agent is changing meaningful application
state, not filling forms. A small set of typed, stateful tools can support a
richer human handoff than generated prose, but only when the UI makes every
change observable and consequential actions stay human-approved. Curated data
keeps a demo reproducible as long as its limits are visible instead of dressed
up as real-time truth.

## What's next

- Verify an end-to-end agent tool call in a WebMCP browser, not just tool
  discovery.
- Add more city packs and a documented refresh pipeline for route snapshots.
- Evaluate a live data provider only behind the existing adapter boundary,
  keeping freshness, quota, attribution, and fallback intact.

## Data and honesty note

Route durations, fares, reliability, and reports are a curated snapshot with
source dates, freshness, and confidence. They are not live directions, live
traffic, or live transit data. Mapbox renders the basemap only. RouteRoom's
engine is the routing truth.
```

---

## Built with (tags)

```
next.js, react, typescript, zustand, zod, mapbox-gl-js, gsap, reicon, vitest, webmcp, openstreetmap, geojson, node.js
```

## "Try it out" links

- Live app: `https://routeroom-3d.vercel.app/planner`  (fill after deploy)
- Source code: `https://github.com/StarRayX/routeroom-3d`  (fill after push)

## Image gallery

Real captures are committed in docs/screenshots/ (3000x2000, 3:2). Upload in
this order:

- docs/screenshots/02-3d-map.png (the Mapbox 3D map with the routes)
- docs/screenshots/06-confirmation.png (walking cap flips to Tram 4, human confirmation sheet)
- docs/screenshots/07-tool-console.png (all 22 WebMCP tools by trust category)
- docs/screenshots/01-overview.png (planner overview)
- docs/screenshots/03-segment-inspect.png (segment inspector on the map)
- docs/screenshots/05-disruption.png (delay simulation and backup)

## Video demo link

```
PLACEHOLDER_YOUTUBE_URL  (fill after recording; under 3 minutes, with audio)
```

---

## Submitter and eligibility fields

- Submitter Type: **Individual**
- Country of residence: **Philippines**
- Organization name: leave blank
- App Status: **New**
- If Existing, what you updated: leave blank

## Live URL that judges can access

```
https://routeroom-3d.vercel.app/planner  (fill after deploy; must load in a WebMCP browser)
```

## Testing instructions for judges (optional field)

```
Open /planner at the top level. The site registers 22 WebMCP tools on load.
No sign-in and no credentials are needed. If your browser does not expose
WebMCP, open the in-page tool console at /planner?debug=1 or inspect
window.__routeroomTools in DevTools. The map needs a Mapbox token that is set
on the deployment; without WebGL or the token the planner shows a 2D SVG
fallback and still works.
```

## URL to your PUBLIC Code Repo

```
https://github.com/StarRayX/routeroom-3d  (public, MIT license visible in the About box)
```

## Which agent(s) or client(s) did you test your WebMCP tools with?

```
ChatGPT's in-app browser (the Codex browser) on 2026-09-04. It discovered and
listed all 22 tools automatically on page load, including their schemas and
annotations, which confirms the top-level imperative registration shape. We
also exercised every tool through the in-page tool console and through
window.__routeroomTools, and confirmed the confirmation gate end to end:
save_route_plan returns confirmation_required, a human Confirm commits the
save, and a second call returns already_saved. An agent-driven tool call made
through the browser (as opposed to tool discovery) is not yet verified, and we
do not claim it.
```

## Which AI tools have you leveraged while working on this project?

```
Claude Code (Anthropic Claude, Opus and Sonnet) and OpenAI Codex for
implementation, refactoring, and documentation. Mapbox Standard for the
basemap rendering. No AI service is called at runtime by the app; the route
recommendations come from RouteRoom's own deterministic engine.
```

## Describe the level of learning you/your team derived from the project

Pick the option that is true for you. A strong honest choice is the one that
says you learned a significant amount or a new domain, given this was a first
WebMCP build with a new tool-registration API and a new map provider.

## Did you gain AI value that you can use in your career?

Pick the affirmative option that matches. This project is real evidence of
building an agent-facing tool surface, which is a current and marketable skill.
