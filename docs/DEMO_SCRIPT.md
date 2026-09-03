# Demo script

A shot list for the sub-three-minute submission video, adapted from the demo
script in `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md` section 12 to match how the
route engine actually scores the Amsterdam Centrum to RAI demo data (pack id
`amsterdam_centrum_rai`, decisions dated 2026-09-03). Target: 2:40-3:00
total, no copyrighted music, clear narration.

Note on the narrative direction: with the default preferences, Metro 52 plus
the walk from Europaplein already wins. It is the fastest option and it is
step-free, so it is primary by default, even though its last leg is a 380 m
outdoor walk to the RAI entrance. The demo's flip is not about fare: all
three routes run on GVB and share the same one-hour fare. It is about
walking distance and luggage. The human explains they have a suitcase and
want to stay under 250 meters of walking. That moves the recommendation off
Metro 52. Tram 4 to the door has the least walking of the three, but the
critic immediately surfaces its active peak-hour delay report, so the human
sees both sides of that tradeoff before a 15-minute simulated delay on Tram
4 produces Metro 51 as a backup.

## Pre-flight checklist

Run through this before recording. Do it on the actual deployed URL, not
just `localhost`. Some WebMCP registration issues only show up over HTTPS.

- [ ] Deployed URL loads `/planner` directly (not just via redirect from `/`).
- [ ] The 3D scene renders the whole corridor from Centraal Station to the
      RAI, with buildings, water, and landmarks visible, not just the
      destination block.
- [ ] Confirm tools actually register in the specific WebMCP browser being
      used for this recording (check its own tool/agent surface, per
      `docs/WEBMCP_TESTING.md`). If that cannot be confirmed, say so on
      camera in one sentence and state plainly that the in-page tool console
      is standing in for it. Do not imply WebMCP registration was confirmed
      if it was not; as of 2026-09-03 it has not yet been verified in a
      WebMCP-capable browser.
- [ ] The Amsterdam Centrum to RAI trip is loaded: Centraal Station to the
      RAI, arriving by 9:00, with Metro 52 ranked first by default.
- [ ] All three demo routes (`route_metro_52`, `route_tram_4`,
      `route_metro_51`) appear in the initial comparison.
- [ ] The ODbL attribution and export date are visible on screen at some
      point in the recording (see `docs/DEPLOYMENT.md`).
- [ ] The activity log panel is visible on screen and large enough to read
      on camera. It stays collapsed until the first agent action; let it
      open naturally rather than forcing it open before the first tool call.
- [ ] Screen recording captures the 3D scene and the route cards / activity
      log at once. Do not crop either out.
- [ ] Microphone level checked; narration is audible over any UI sound.
- [ ] Browser zoom and window size set so text is legible at 1080p.
- [ ] A fallback plan exists if the WebMCP browser fails to register tools
      live: fall back to the in-page Agent tool console, which drives the
      identical tool calls without relying on the browser's tool discovery,
      so the recording never has to stop.

## Exact prompts to type

Type these into the connected agent (or the Agent tool console) in this
order. Keep wording close to this; it matches the transcript in the README.

1. `Find a route from Centraal Station to the RAI. I need to arrive by 9.`
2. `Metro 52 looks fastest. Why is there so much walking at the end?`
3. `I've got a suitcase. Keep me under 250 meters of walking.`
4. `What happens if Tram 4 is delayed 15 minutes?`
5. `Draft a plan with your top pick as primary and a backup, then save it.`

## Shot list

| Time | On screen | Narration | Tool calls visible |
|---|---|---|---|
| 0:00-0:20 | The whole corridor from Centraal Station to the RAI, no route highlighted, route cards empty state | "A route is not just a line from A to B. People balance arrival deadlines, walking distance, luggage, transfers, and how fresh the underlying data actually is." | none |
| 0:20-0:35 | Type prompt 1 into the agent. Activity log opens for the first time and starts filling in | "I'll ask an agent to find a route, in plain language." | `get_trip_context()`, `list_trips()` |
| 0:35-0:55 | Agent calls tools; the corridor lights up with three route ribbons at low detail, detail zones render at the stations and the RAI entrance; route cards appear, Metro 52 highlighted primary | "The agent reads the curated trip, then compares its route options using the same engine the page uses." | `find_route_options({})`, `show_route_on_scene({ route_id: "route_metro_52", display_mode: "primary" })` |
| 0:55-1:10 | Camera holds on all three route cards and the corridor | "Three curated options for this trip: Metro 52 plus a walk from Europaplein ranks first, it's the fastest and step-free. Metro 51 is close behind with a short, partly covered walk. Tram 4 goes right to the door but takes longest." | (cards render prior tool output; no new call needed) |
| 1:10-1:30 | Type prompt 2. Camera opens the side drawer on Metro 52's final segment | "Let's ask the agent about that walk at the end." | `inspect_route_segment({ route_id: "route_metro_52", segment_id: "seg_metro_52_europaplein_rai_walk" })`, `check_route_constraints({ route_id: "route_metro_52" })` |
| 1:30-1:55 | Side drawer shows the 380 m outdoor walk, step-free, no active reports; the segment pulses in the scene | "380 meters outdoors from Europaplein to the entrance. No stairs, nothing wrong with it, it's just the longest walk of the three." | (side drawer renders prior tool output) |
| 1:55-2:15 | Type prompt 3. Route cards re-rank; the scene's primary ribbon moves from Metro 52 to Tram 4; an amber flag appears on Tram 4's card | "With a suitcase and a 250-meter walking cap, the ranking flips. Tram 4 goes almost to the door, so it moves to the top. But the critic flags something." | `set_route_preferences({ walking_priority: "high", max_walking_meters: 250 })`, `compare_route_options({ route_ids: ["route_tram_4", "route_metro_51", "route_metro_52"], criteria: ["walking", "reliability", "step_free_access"] })`, `show_route_on_scene({ route_id: "route_tram_4", display_mode: "primary" })` |
| 2:15-2:35 | Side drawer opens on Tram 4's city-center crossing, showing the active peak-hour delay report in amber, its confidence and timestamp; then type prompt 4, delay pulse on the same segment, Metro 51's ribbon appears dashed as the suggested backup | "Tram 4 has an active delay report for peak hours. Simulate a 15-minute delay there, and the agent suggests Metro 51 as a backup, it's step-free too, with almost no walking risk." | `get_recent_route_reports({ segment_id: "seg_tram_4_center_crossing" })`, `simulate_route_disruption({ route_id: "route_tram_4", segment_id: "seg_tram_4_center_crossing", delay_minutes: 15 })` |
| 2:35-2:50 | Type prompt 5. Confirmation sheet slides in showing the exact primary, backup, and arrival estimate; human clicks Confirm on screen | "The agent drafts a plan, but it cannot save it. The human reviews the exact text on the confirmation sheet and clicks confirm." | `create_draft_route_plan({ primary_route_id: "route_tram_4", backup_route_id: "route_metro_51" })`, `save_route_plan({...})` returns `confirmation_required`, human click, `save_route_plan({...})` returns saved |
| 2:50-3:00 | Quick cut to the ODbL attribution line on screen, then the plan dock showing the saved plan | "The whole route corridor comes from a one-time OpenStreetMap export, credited on the page. The plan is saved, and the human stayed in control the entire way." | none |

## Notes for editing

- Keep on-screen tool call text (`tool_name({...})`) briefly visible in the
  activity log for each step above; it is the visual proof WebMCP is doing
  the work, not a hidden backend call.
- If the WebMCP browser being used does not register tools live when
  recording, use the in-page Agent tool console instead and say so on
  camera in one sentence. Do not fake tool discovery, and do not cut the
  line that names the fallback; the honest version of this demo is stronger
  than a demo that implies something unverified.
- Cut any dead air where a tool call is loading; keep pacing tight given the
  three-minute cap.
- End on the confirmed save, not the attribution cutaway, if you need to
  trim time. The save/confirm moment is the strongest proof of the
  human-control claim; the attribution cutaway is the second thing to cut
  after the report flow, not the first.
- Every route duration, fare, and reliability figure shown on camera is a
  curated snapshot with a source date, not a live measurement. If narration
  states a number, it should match what the tool actually returned in that
  take, not a rounded or remembered figure from a previous run.
