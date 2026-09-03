# RouteRoom 3D — Devpost submission draft

## Project tagline

Plan a difficult city trip with an agent, then keep the decision human.

## Problem

Choosing a route is rarely just “fastest.” A person may be balancing an arrival deadline, walking distance with luggage, transfers, accessibility, reliability, and how trustworthy or fresh the evidence is. A normal map can show options, but it does not give an agent a structured way to inspect the same route state, explain tradeoffs spatially, and revise the recommendation when the person changes priorities.

## Solution

RouteRoom is a shared route-decision workspace. The Amsterdam demo compares three curated route options from Amsterdam Centraal to the RAI convention centre. The agent can inspect route segments, compare candidates, test a delay, and update the visible route ranking and scene. The person can change priorities and approve the final plan. This is a bounded demo, not live global routing.

## Why WebMCP is central

RouteRoom exposes 22 typed tools on the top-level planner page with `document.modelContext.registerTool`. Tool handlers are thin, validated wrappers around the same Zustand planner store and deterministic route engine used by the human UI. Therefore an agent action and a human click update the same route cards, map overlays, camera focus, draft state, and activity log. Stable trip, route, segment, and draft IDs make the result inspectable.

Without WebMCP, an agent would have to guess UI controls or describe proposed changes in chat. With WebMCP, it can operate on the site’s declared capabilities and return structured results while the person watches the same state change. The ChatGPT/Codex in-app browser discovered all 22 tools automatically on page load on 2026-09-04, confirming the registration shape, schemas, and annotations. **Verification caveat:** an agent-driven invocation through that browser is still not verified. Do not claim the full browser-agent loop until one tool call has visibly changed the page.

## Human–agent collaboration loop

1. The person selects the trip and states constraints, such as “arrive by 9” and “under 250 m of walking.”
2. The agent lists the available trip, ranks its curated route options, and explains the score and tradeoffs.
3. The agent inspects a suspicious or important segment and focuses the same segment in the scene.
4. The person changes priorities; the agent recomputes the ranking and updates the scene.
5. The agent simulates a disruption and suggests a backup.
6. The agent drafts a plan. The person reviews the exact side effect in a confirmation sheet and explicitly confirms save, sharing, or publication.

## Exposed tool groups

- Read-only: city/trip context, trip list, segment inspection, constraint checks, route comparison, disruption simulation, reports, score breakdown, and saved plans.
- Reversible page-state actions: select trip, find/re-rank options, set preferences, show/focus a route or segment, select primary/backup, create a draft, and draft a service report.
- Confirmation-gated actions: `save_route_plan`, `share_route_plan`, and `publish_service_report`.

## Confirmation and safety

Consequential actions return `confirmation_required` and open a human-facing sheet showing the exact plan/report, side effect, and audience. The WebMCP layer cannot approve its own confirmation; only the human Confirm control can approve that exact draft. Reports are treated as untrusted content, sanitized for publication, labelled low confidence, and given an expiry. Tool errors are sanitized.

## Tech stack

Next.js 15, React 19, TypeScript, Zustand, Zod, Vitest, GSAP, Reicon, and Mapbox GL JS v3 with Mapbox Standard. The application has an SVG/2D fallback when Mapbox or WebGL is unavailable. The repository includes an open-source MIT license.

## Public data and provenance

RouteRoom’s route and landmark overlays are committed GeoJSON derived from a one-time OpenStreetMap export, with ODbL attribution and an export date. Route durations, fares, reliability, and reports are curated snapshots with source dates, freshness, and confidence; they are not live directions, live traffic, or live transit data. Mapbox is presentation only; RouteRoom’s engine remains the routing truth. **Needs verification before submission:** confirm the deployed page visibly shows both required attribution lines and confirm the live Mapbox Standard 3D view loads in the recording environment. Do not claim live Mapbox 3D unless that manual check passes.

## Challenges

- Designing a useful tool surface without turning the product into a chat UI or a collection of button wrappers.
- Keeping human and agent actions on one state model while preserving confirmation boundaries.
- Making a five-kilometre corridor readable without hiding route differences or rendering excessive geometry.
- Communicating uncertainty honestly when the demo data is curated rather than live.
- Integrating an optional Mapbox visual provider while keeping the planner deterministic and usable with a fallback.

## Accomplishments

- Built a city-pack model and a focused Amsterdam Centraal–RAI demo rather than implying broad live coverage.
- Implemented a deterministic scoring, comparison, constraint, and disruption engine.
- Implemented a shared human/agent store and 22 declared WebMCP tools.
- Added route overlays, segment focus, activity history, draft plans, and human-gated save/share/report flows.
- Added provenance and confidence labels, ODbL attribution documentation, an SVG fallback, and an open-source repository.

These are repository-backed implementation claims. **Still to verify:** live URL, browser-level WebMCP discovery/calls, and final visual captures.

## What we learned

WebMCP is most valuable when the agent is manipulating meaningful application state, not merely filling forms. A small set of typed, stateful tools can support a richer human handoff than generated prose, but only if the UI makes every change observable and consequential actions remain explicitly human-approved. We also learned that curated data can make a demo reproducible, provided its limits are visible rather than presented as real-time truth.

## What’s next

- Verify registration and end-to-end calls in ChatGPT’s in-app browser or Chrome with WebMCP enabled.
- Capture and publish the required sub-three-minute YouTube demo and final screenshots.
- Add more city packs and a documented refresh pipeline for route snapshots.
- Evaluate a live provider only behind the existing adapter boundary, with freshness, quota, attribution, and fallback behavior preserved.
- Add broader accessibility testing and user testing with people travelling under real constraints.

## Requirements checklist

- [ ] Working public live URL that judges can open in ChatGPT’s in-app browser or Chrome with WebMCP enabled — **missing / needs verification**.
- [x] Browser discovers all 22 declared tools on initial page load — **verified in the ChatGPT/Codex in-app browser on 2026-09-04**.
- [ ] Agent successfully calls a declared tool through that browser and visibly changes the page — **not verified; do not claim**.
- [x] Text explains WebMCP fit, UX benefit, human/agent collaboration, and implementation.
- [ ] Public repository URL — **insert final URL**.
- [x] Repository contains source, instructions, and an open-source license (MIT).
- [ ] Public YouTube demo under three minutes with clear audio — **missing**.
- [ ] Final screenshots or video assets — **missing; current docs/screenshots entries are placeholders**.
- [ ] Confirm all third-party SDK/data permissions, attribution, and deployed-page notices — **needs verification**.
- [ ] Confirm Devpost submission fields and status before the deadline — **submission status is not known from this repository**. The listed challenge deadline was September 3, 2026 at 1:00 p.m. PDT.

## Three-minute demo outline

**0:00–0:20 — Problem.** Show the Amsterdam corridor and explain the tradeoff between deadline, walking, transfers, reliability, and evidence freshness.

**0:20–0:55 — Initial agent pass.** Ask for Centraal to RAI by 9. Show the tool activity and three route options; Metro 52 ranks first by the default preferences.

**0:55–1:30 — Inspect evidence.** Ask why Metro 52 ends with walking. Focus the 380 m outdoor, step-free segment and show the constraint critique.

**1:30–2:15 — Human changes intent.** Say there is a suitcase and cap walking at 250 m. Show the ranking and scene change to Tram 4, then show its peak-hour delay report and simulate a 15-minute delay.

**2:15–2:50 — Draft and confirm.** Have the agent draft Tram 4 as primary and Metro 51 as backup. Show `confirmation_required`, review the exact plan, and click Confirm to save.

**2:50–3:00 — Provenance and limits.** Show the attribution/freshness labels and state that route data is a curated snapshot, not live directions. If WebMCP browser discovery was not verified, say so plainly and identify the in-page console as the fallback used.

## Submission evidence to attach

The repository currently names, but does not contain, the following captures: `scene-primary.png`, `scene-comparison.png`, `scene-critique.png`, `scene-flip.png`, and `confirmation-sheet.png`. Replace those placeholders with real captures or use the final video. Record only behavior actually observed in the target browser.
