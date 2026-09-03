# Claude demo rehearsal prompt

Rehearse the RouteRoom demo as a judge would experience it from a clean browser session.

1. Open the live or local planner page directly.
2. Verify that WebMCP tools register on initial load.
3. Ask the agent to read the active city pack and trip context.
4. Ask for multiple route options under explicit constraints.
5. Show the options in the 3D map and route cards.
6. Inspect one segment with a report or uncertainty.
7. Change a human preference and confirm that the recommendation and 3D scene update.
8. Simulate a delay and show a backup route.
9. Create a draft plan.
10. Attempt to save without human confirmation and verify that it stops.
11. Confirm the exact plan and verify the saved state.

Record:

- the exact user prompts
- the exact WebMCP tools called
- visible UI changes after each call
- any tool-discovery or browser compatibility issue
- any claim that is not supported by the data
- which browser and version this rehearsal ran in, and whether
  `document.modelContext` actually existed on the page in that browser. If it
  did not, say so on camera and name the fallback used (the in-page tool
  console or `window.__routeroomTools`) instead of implying WebMCP discovery
  was confirmed. As of 2026-09-03, WebMCP has not yet been verified in a
  WebMCP-capable browser; do not narrate or write up this rehearsal as if it
  has been, until a run against a browser with `document.modelContext`
  present is actually recorded.

The final video must stay under three minutes. Remove any step that does not strengthen the human-agent collaboration story.
