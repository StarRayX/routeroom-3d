# Demo script

A shot list for the sub-three-minute submission video, adapted from the demo
script in `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md` section 12 to match how the
route engine actually scores the Aurora City demo data. Target: 2:40-3:00
total, no copyrighted music, clear narration.

Note on the narrative direction: with the default preferences (reliability
priority high, avoid stairs on, minimize rain on), the tram route already
wins on arrival, and the bus route, despite being cheapest, ranks last
because it has stairs at the footbridge, high rain exposure, and an active
delay report. The demo therefore shows the *opposite* flip from a plain
cheapest-vs-fastest map: the human explicitly asks to prioritize price over
comfort, and only then does the bus become the top pick. This is a stronger
demo of preference sensitivity than a flip that happens to align with a
generic "reliability is better" assumption.

## Pre-flight checklist

Run through this before recording. Do it on the actual deployed URL, not
just `localhost`. Some WebMCP registration issues only show up over HTTPS.

- [ ] Deployed URL loads `/planner` directly (not just via redirect from `/`).
- [ ] The 3D scene renders with buildings, the river, and landmarks visible.
- [ ] Reload the page and confirm the WebMCP status indicator reads
      "available" in a compatible browser, or "unavailable" with the tool
      console still usable otherwise.
- [ ] Aurora City's default trip is loaded: Central Station to Riverside
      Conference Center, arriving by 08:30, with the tram route ranked
      first and the bus route ranked last.
- [ ] All three demo routes (`route_tram_walk`, `route_bus_market`,
      `route_step_free`) appear in the initial comparison.
- [ ] The activity log panel is visible on screen and large enough to read
      on camera.
- [ ] Screen recording captures both the 3D scene and the activity log /
      route cards at once. Do not crop either out.
- [ ] Microphone level checked; narration is audible over any UI sound.
- [ ] Browser zoom and window size set so text is legible at 1080p.
- [ ] A fallback plan exists if the WebMCP browser fails to register tools
      live: fall back to the in-page Agent tool console, which drives the
      identical tool calls without relying on the browser's tool
      discovery, so the recording never has to stop.

## Exact prompts to type

Type these into the connected agent (or the Agent tool console) in this
order. Keep wording close to this; it matches the transcript in the README.

1. `Find a route from Central Station to the Riverside Conference Center. Arrive by 8:30, stay under 10 euros, avoid stairs, and minimize outdoor walking.`
2. `The bus looks a lot cheaper. Why did you rank it last?`
3. `Actually, price matters most to me right now. I don't mind stairs or a bit of rain. Reprioritize for the lowest fare.`
4. `What happens if the footbridge crossing on the bus route is delayed 15 minutes?`
5. `Draft a plan with your top pick as primary and a backup, then save it.`

## Shot list

| Time | On screen | Narration | Tool calls visible |
|---|---|---|---|
| 0:00-0:20 | Empty route room: 3D scene loaded, no route highlighted, route cards empty state | "A route is not just a line from A to B. People balance arrival deadlines, cost, walking, transfers, accessibility, weather, and uncertainty." | none |
| 0:20-0:35 | Type prompt 1 into the agent. Activity log starts filling in | "I'll ask an agent to find a route, in plain language." | `get_trip_context()` |
| 0:35-0:55 | Agent calls tools; 3D scene populates with three colored route ribbons; route cards appear, tram highlighted primary | "The agent reads the live trip context, then searches routes using the same engine the page uses." | `find_route_options({...})`, `show_route_on_scene({ route_id: "route_tram_walk", display_mode: "primary" })` |
| 0:55-1:10 | Camera holds on all three route cards + 3D scene | "Three candidates: tram plus a short walk ranks first, a step-free metro route is close behind, and the bus through the market ranks last, even though it's the cheapest." | (cards render prior tool output; no new call needed) |
| 1:10-1:30 | Type prompt 2. Camera focuses on the bus route's footbridge segment | "Let's ask the agent why the cheapest option isn't the top pick." | `inspect_route_segment({ route_id: "route_bus_market", segment_id: "seg_bus_market_crossing_center" })`, `check_route_constraints({ route_id: "route_bus_market" })` |
| 1:30-1:55 | Critique panel shows the delay report with its timestamp and confidence label, the stairs violation, and the rain exposure warning; segment pulses in the scene | "The critic shows the real reasons: stairs at the footbridge, high rain exposure, and an active delay report from this morning. It's not a guess, it's a scored breakdown." | `get_recent_route_reports({...})`, `get_score_breakdown({ route_id: "route_bus_market" })` |
| 1:55-2:15 | Type prompt 3. Comparison table updates; the bus ribbon in the scene brightens to primary, tram fades to a candidate | "The human decides price matters more right now than stairs or rain. The agent updates the preferences, and the recommendation flips." | `set_route_preferences({ fare_priority: "high", reliability_priority: "low", avoid_stairs: false, minimize_rain_exposure: false })`, `compare_route_options({...})`, `show_route_on_scene({ route_id: "route_bus_market", display_mode: "primary" })` |
| 2:15-2:35 | Type prompt 4. Footbridge segment shown with a delay pulse; the tram route ribbon appears dashed as the suggested backup | "Simulate a 15-minute delay right at the footbridge. It still makes the deadline, but the buffer shrinks, so the agent suggests the tram route as a backup." | `simulate_route_disruption({ route_id: "route_bus_market", segment_id: "seg_bus_market_crossing_center", delay_minutes: 15 })` |
| 2:35-2:50 | Type prompt 5. Confirmation panel slides in showing the exact primary, backup, and arrival estimate; human clicks Confirm on screen | "The agent drafts a plan, but it cannot save it. The human reviews the exact text and clicks confirm." | `create_draft_route_plan({...})`, `save_route_plan({...})` returns `confirmation_required`, human click, `save_route_plan({...})` returns saved |
| 2:50-3:00 | Quick cut to the report draft flow: draft a report, show it is still unpublished until a second confirm | "A service report works the same way: drafted, then published only after an explicit human confirmation." | `draft_service_report({...})` (publish confirm optional if time is tight) |

## Notes for editing

- Keep on-screen tool call text (`tool_name({...})`) briefly visible in the
  activity log for each step above; it is the visual proof WebMCP is doing
  the work, not a hidden backend call.
- If Chrome's WebMCP flag is unavailable when recording, use the in-page
  Agent tool console instead and say so on camera in one sentence. Do not
  fake tool discovery.
- Cut any dead air where a tool call is loading; keep pacing tight given the
  three-minute cap.
- End on the confirmed save, not the report flow, if you need to trim time.
  The save/confirm moment is the strongest proof of the human-control claim.
