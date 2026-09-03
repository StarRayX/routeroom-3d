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

## Verification status (honest record)

Last updated: 2026-09-04.

**Top-level registration and discovery verified in the ChatGPT/Codex in-app browser at `http://localhost:3014` on 2026-09-04.** The browser discovered and displayed all 22 tools automatically on page load, including their exact schemas and annotations. This proves the top-level registration/discovery shape works. It does not yet prove that an agent successfully invoked a site tool through the browser.

What has been verified so far, and how:

- All 22 tools build, validate input, and return structured results, exercised through the `window.__routeroomTools` testing surface and the in-page tool console.
- The confirmation gate was exercised end to end through that surface: `save_route_plan` returned `confirmation_required`, a human click on Confirm committed the save, and a second call returned `already_saved`.
- Existing unit tests passed 85/85 on the main integration commit.
- `registerWebMcpTools` detects `document.modelContext.registerTool` at the top level and reports `unavailable` otherwise; the status pill shows "Human mode" in a browser without WebMCP.

What remains unverified:

- [ ] An agent in the ChatGPT/Codex in-app browser can successfully invoke a site tool and the page updates.

Do not describe agent invocation through the browser as validated in the README, the demo video, or the submission until the unchecked item above has been checked.

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
- [x] **Tools register on the top-level planner page during initial
      load.** Load `/planner` fresh (hard refresh), then immediately check
      the WebMCP browser's tool list or run
      `typeof document.modelContext?.registerTool` in DevTools before
      clicking anything. On 2026-09-04, the ChatGPT/Codex in-app browser at
      `http://localhost:3014` displayed all 22 tools automatically; no button
      click was required.
- [x] **At least eight useful tools are discoverable.** RouteRoom exposes
      22; the ChatGPT/Codex in-app browser at `http://localhost:3014`
      displayed all 22 automatically on page load on 2026-09-04, including
      exact schemas and annotations.
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
      `route_metro_52`, `route_tram_4`, and `route_metro_51`.
- [ ] **The 3D scene displays the selected route and landmarks.** Visually
      confirm buildings, the river, and route ribbons render after
      `show_route_on_scene`, or confirm the list fallback renders instead
      when WebGL is unavailable (see `resize_window`/DevTools WebGL
      override, or a browser with WebGL disabled).
- [ ] **Changing preferences changes the route comparison.** Call
      `set_route_preferences({ walking_priority: "high", max_walking_meters: 250 })`
      and confirm the top-ranked route changes from `route_metro_52` to
      `route_tram_4`: Metro 52 is the fastest, step-free option but has a
      372 m walk from Europaplein; Tram 4 goes to the door with 125 m of
      walking (see `docs/DEMO_SCRIPT.md`).
- [ ] **Delay simulation produces a backup route.** Call
      `simulate_route_disruption` on `route_tram_4`'s `seg_tram4_ride`
      with a 15-minute delay and confirm `suggested_backup_route_id` is
      populated with `route_metro_51`.
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
- [ ] **The Amsterdam city pack is the current demo pack.** Confirm the
      Amsterdam pack is the only city pack, with the three current routes:
      Metro 52 plus walk from Europaplein, Metro 51 to Station RAI, and Tram
      4 to the door. Confirm `src/lib/route-engine.ts` takes a `CityPack` as
      a plain parameter with no city-specific branching.

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
