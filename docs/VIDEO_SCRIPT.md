# RouteRoom 3D demo video script

Target length: under 3:00. One take is fine. Read the narration close to
word for word. Times are cues, not hard cuts.

## Before you record

1. Open `https://routeroom-3d.vercel.app/planner` in Chrome. Reload once so
   preferences start at their defaults.
2. Decide how you play the agent. Two honest options:
   - A WebMCP-enabled browser (Chrome with the flag, or ChatGPT's browser).
     Then you narrate the agent calling each tool for real.
   - The in-page agent tool console at `/planner?debug=1` ("Run as agent").
     This runs the exact same registered tools. If you use it, say once on
     camera: "I am acting as the agent through the page's own tool console,
     which runs the same 22 registered WebMCP tools." Do not imply an external
     model is driving it if it is not.
3. Have the 3D map ready to open (the "Open 3D map" button loads Mapbox).
4. Audio: quiet room, clear voice. No copyrighted music.

## Shot list and narration

**0:00 to 0:20. The problem.**
On screen: `/planner`, the three route cards, From Amsterdam Centraal, To RAI
convention centre.
Say: "This is RouteRoom. Getting from Amsterdam Centraal to the RAI convention
centre is not just about the fastest train. You weigh the arrival deadline,
walking distance, luggage, transfers, and reliability. RouteRoom is a shared
decision room where an agent and I work the same route state, and I approve
anything that gets saved."

**0:20 to 0:38. WebMCP registration.**
On screen: open `/planner?debug=1`, show the agent tool console header
"WebMCP status: unavailable, 22 tools discoverable" and the three columns.
Say: "The page registers 22 typed WebMCP tools on load: read-only, reversible,
and confirmation-gated. These are the same tools an agent's browser discovers.
I will act as the agent here."

**0:38 to 1:08. Rank and show on the map.**
Actions: open the 3D map; run `show_route_on_scene({ route_id: "route_metro_52",
display_mode: "primary" })`.
On screen: the Mapbox 3D map, Metro 52 as the vermilion primary route to
Europaplein.
Say: "The agent ranks the three curated options. Metro 52 wins by default:
fastest and step-free. It draws the route on the map. The map is Mapbox, but
the recommendation is RouteRoom's own engine, and every number is a curated
snapshot, not live traffic."

**1:08 to 1:35. Inspect the evidence.**
Actions: `inspect_route_segment({ route_id: "route_metro_52", segment_id:
"seg_metro52_walk_to_entrance" })`, then `check_route_constraints({ route_id:
"route_metro_52" })`.
Say: "Metro 52 ends with a 490 metre outdoor walk. The agent inspects that
segment and the constraint check. Fine on a normal day."

**1:35 to 2:10. I change my mind, the ranking flips.**
Action: `set_route_preferences({ walking_priority: "high", max_walking_meters:
250 })`.
On screen: the cards reorder, Tram 4 becomes primary, Metro 52 shows the red
"490 m of walking, above the 250 m limit," and the highlighted route on the map
moves to the tram.
Say: "Now I have a suitcase, so I cap walking at 250 metres. The agent re-ranks.
Tram 4 to the door is now primary, and it flags Metro 52 as over my limit. The
highlighted route on the map moves to the tram."

**2:10 to 2:35. Disruption and a backup.**
Actions: `get_recent_route_reports({ segment_id: "seg_tram4_ride" })`, then
`simulate_route_disruption({ route_id: "route_tram_4", segment_id:
"seg_tram4_ride", delay_minutes: 15 })`.
Say: "Tram 4 has an active peak-hour delay report. Simulate a 15 minute delay:
it now misses the deadline, and the agent suggests Metro 51 as a step-free
backup."

**2:35 to 2:55. Draft, then my confirmation.**
Actions: `create_draft_route_plan({ primary_route_id: "route_tram_4",
backup_route_id: "route_metro_51" })`, then `save_route_plan({ draft_id })`.
On screen: the confirmation sheet, "Save this route plan? Requested by: agent,"
the exact plan, Confirm and Not now.
Say: "The agent drafts the plan. Saving stops here. A confirmation sheet shows
the exact plan and asks me. The agent cannot approve its own action." Click
Confirm. "Saved."

**2:55 to 3:00. Provenance close.**
On screen: the attribution line, "Routes and stops: RouteRoom curated snapshot;
map, Mapbox and OpenStreetMap."
Say: "Curated data, labelled, with attribution. A person and an agent decided
together, and I kept the final call."

## Honesty checklist for the recording

- If you did not use a real WebMCP browser, say the tool console ran the tools.
- Do not call the data live traffic or live transit. It is a curated snapshot.
- Do not say Mapbox produced the recommendation. It renders the map only.
- Show the attribution at least once.
