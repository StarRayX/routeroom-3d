# WebMCP testing and acceptance checklist

This maps directly to the acceptance criteria in
`CLAUDE_WEBMCP_ROUTEROOM_PLAN.md` section 13. Each row says exactly how to
verify it against the running app.

Browser support for WebMCP is new and moving. Where this document states a
specific flag name or menu path, treat it as a starting point and check the
current Chrome and OpenAI documentation before recording anything official:

- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome guide to designing agentic workflows](https://developer.chrome.com/docs/ai/webmcp/build-tools)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [ChatGPT Learn: Site tools/WebMCP](https://learn.chatgpt.com/docs/webmcp)

## Setting up a WebMCP-capable browser

### Chrome

1. Install a current Chrome build with the WebMCP proposal implemented
   (check the Chrome WebMCP documentation above for which channel. This
   has shipped behind an experimental flag in Chrome Canary/Dev builds
   during the proposal's development; verify the current channel and flag
   name before testing, since this changes as the spec moves through
   Chrome's release process).
2. Open `chrome://flags`, search for the WebMCP / Model Context flag named
   in the current Chrome documentation, and enable it. Restart Chrome when
   prompted.
3. Navigate to the deployed RouteRoom URL (or `http://localhost:3000/planner`
   for local testing) at the top level, not inside another tab's iframe.
4. Open Chrome's tool/agent surface for the page (named and located per the
   current Chrome WebMCP documentation) and confirm it lists the RouteRoom
   tools by name.

### ChatGPT's browser

1. Open the deployed RouteRoom URL directly in ChatGPT's built-in browsing
   surface, at the top level.
2. Per the plan's official source notes, the current ChatGPT browser
   supports a subset of the WebMCP proposal: it does **not** discover
   declarative tools or tools registered inside an iframe. RouteRoom
   registers tools imperatively on the top-level `/planner` page for
   exactly this reason. Check this document's own criteria
   below to confirm that holds.
3. Confirm the tools are visible to the browser's own tool/site-tool surface
   before asking it to plan a trip.

### No-WebMCP-browser path

If neither is available, everything below can still be verified through the
in-page Agent tool console, or directly from DevTools:

```js
const tool = await window.__routeroomTools.find(t => t.name === "find_route_options");
await tool.execute({ max_fare: 8 });
```

## Checklist

### WebMCP registration and discovery

- [ ] **Imperative registration is used.** Open
      `src/lib/webmcp/registerWebMcpTools.ts` and confirm tools are
      registered by calling `document.modelContext.registerTool(...)`
      directly in JavaScript, not through a declarative manifest or HTML
      attribute.
- [ ] **Tools register on the top-level planner page during initial
      load.** Load `/planner` fresh (hard refresh), then immediately check
      the WebMCP browser's tool list or run
      `typeof document.modelContext?.registerTool` in DevTools before
      clicking anything. Tools should already be registered; no button
      click should be required first.
- [ ] **At least eight useful tools are discoverable.** RouteRoom exposes
      21; confirm the count in the WebMCP browser's tool panel, or run
      `(await window.__routeroomTools).length` in DevTools, and cross-check
      against `docs/TOOLS.md`.
- [ ] **Tool names use clear `snake_case` naming.** Scan the tool list for
      names like `get_trip_context`, `find_route_options`,
      `save_route_plan`. No camelCase, no ambiguous names like
      `finalize_plan` or `update_everything`.
- [ ] **Each tool has a precise description and narrow JSON schema.** Pick
      three tools at random in the WebMCP browser's inspector (or
      `docs/TOOLS.md`) and confirm each description states its side effect
      (or explicitly says it has none) and its input schema only accepts
      the fields it actually uses.
- [ ] **Read-only tools are marked read-only.** For each of the 10
      read-only tools in `docs/TOOLS.md`, confirm
      `annotations.readOnlyHint === true` in the registered tool definition.
- [ ] **Tool results contain stable IDs and enough data to verify
      changes.** Call `show_route_on_scene` and confirm the result includes
      `displayed_route_id` and `segment_ids` that match what changed on
      screen, not just a success flag.
- [ ] **Tool calls update visible cards, scene state, or activity log.**
      Call any reversible tool (for example `set_route_preferences`) and
      confirm the route cards, 3D scene, or activity log update within the
      same render, not only the tool's JSON response.
- [ ] **No primary workflow depends on declarative tools or iframes.**
      Confirm the planner page, 3D scene, route cards, activity log, and
      tool registry are all rendered by the same top-level document (view
      the page source / component tree: no `<iframe>` wrapping the
      planner UI).

### Product

- [ ] **A human or agent can create a trip plan.** Complete the flow twice:
      once purely through UI buttons/forms, once purely through tool calls
      (Agent tool console or a WebMCP browser). Both should reach a drafted
      plan.
- [ ] **At least three route options are shown.** Confirm
      `find_route_options` (or the initial page load) returns
      `route_tram_walk`, `route_bus_market`, and `route_step_free`.
- [ ] **The 3D scene displays the selected route and landmarks.** Visually
      confirm buildings, the river, and route ribbons render after
      `show_route_on_scene`, or confirm the list fallback renders instead
      when WebGL is unavailable (see `resize_window`/DevTools WebGL
      override, or a browser with WebGL disabled).
- [ ] **Changing preferences changes the route comparison.** Call
      `set_route_preferences({ fare_priority: "high", reliability_priority: "low", avoid_stairs: false, minimize_rain_exposure: false })`
      and confirm the top-ranked route changes from `route_tram_walk` to
      `route_bus_market` (see `docs/DEMO_SCRIPT.md` for why this specific
      combination flips the recommendation).
- [ ] **Delay simulation produces a backup route.** Call
      `simulate_route_disruption` on `route_bus_market`'s
      `seg_bus_market_crossing_center` with a 15-minute delay and confirm
      `suggested_backup_route_id` is populated.
- [ ] **Activity log distinguishes suggestions, drafts, and confirmed
      actions.** Run a full flow (find, compare, draft, save) and confirm
      the activity log shows different kinds/labels for a read, a
      suggestion, a draft, and a human-confirmed action, not one generic
      "agent did something" line.
- [ ] **Save/share/publish actions require confirmation.** Call
      `save_route_plan`, `share_route_plan`, and `publish_service_report`
      without clicking Confirm in the UI first. Each must return
      `confirmation_required` and must not appear in `list_saved_plans` /
      the reports list until a human clicks Confirm.
- [ ] **The normal UI works without WebMCP.** Open the planner in a browser
      with no WebMCP support at all (regular Chrome/Firefox/Safari with no
      flags). Every planning action should still be reachable through
      on-page buttons and forms.
- [ ] **The city pack can be replaced without changing the route-engine
      API.** Confirm `src/lib/city-packs/harbor-city.ts` exists, passes
      `validateCityPack` with an empty result array, and that
      `src/lib/route-engine.ts` takes a `CityPack` as a plain parameter
      with no Aurora-specific branching.

### Submission

- [ ] Public live URL loads `/planner` in a WebMCP-compatible browser.
- [ ] Public code repository is reachable (no private-repo 404).
- [ ] `LICENSE` (MIT) is present at the repo root.
- [ ] README explains why WebMCP is necessary, not just what the app does.
- [ ] Public YouTube demo is under three minutes.
- [ ] Documentation (this repo's README "What was added during the
      challenge period" section) distinguishes pre-existing work from new
      WebMCP work.
- [ ] No credentials, API keys, or personal data appear anywhere in the
      repository. Grep for `sk-`, `.env` contents, and any hardcoded
      tokens before submission.
