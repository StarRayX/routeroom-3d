# Handoff to Codex, 2026-09-04

Claude session ended at the usage limit mid-integration of the Mapbox provider. State of the working tree at handoff, in `C:\Users\StarX\Desktop\SCHOOL\career-building\projects\webmcp` (git initialised, NO commits yet).

## What is done and verified

- Decisions Q1 to Q6 plus the Mapbox pivot are recorded: `CONTEXT.md`, `docs/adr/0005`, `0006` (superseded by 0007), `0007-mapbox-standard-visual-provider.md`, top of `CLAUDE_WEBMCP_ROUTEROOM_PLAN.md`.
- Amsterdam pack: `src/lib/city-packs/amsterdam/` (amsterdam.ts, geometry.json 196 KB, routes-geometry.json, routes.geojson, points.geojson, reports.geojson, ATTRIBUTION.md). Importer `scripts/import-osm.mjs` (`npm run import:osm`), overlay export `scripts/export-overlays.ts` (`npm run export:overlays`, uses the new `tsx` devDependency). Aurora and Harbor packs deleted.
- Engine, store (trips, selectTrip, share payload `{c,t,p,b,d,r}`), 22 WebMCP tools (`find_place_options` removed, `list_trips` and `select_trip` added), docs/TOOLS.md rewritten with engine-verified numbers.
- Mapbox scene: `src/components/mapbox/` (MapboxRouteScene.tsx, geojson.ts, camera.ts, style.ts, token.ts, README.md, fixtures). `src/components/route-scene/index.ts` now exports `RouteScene` = MapboxRouteScene; `RouteMap2D` is the fallback for missing token or no WebGL. The three.js scene files are deleted and no `three` or `@react-three` imports remain.
- `npx tsc --noEmit` was clean project-wide at 00:06 on 2026-09-04. The full vitest suite (85 tests, 9 files) passed at about 23:58 per the last agent run; re-run to confirm after the final Mapbox edits.
- Docs updated for Mapbox: README.md, docs/MAPBOX.md, docs/DEPLOYMENT.md, CONTRIBUTING.md, CLAUDE.md, `.env.example` (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=`).
- WebMCP is still NOT verified in a WebMCP-capable browser. `docs/WEBMCP_TESTING.md` has the honest record; keep it that way until a Chrome build with the flag is used.

## What Claude did not finish (do these, in order)

1. `npm uninstall three @react-three/fiber @react-three/drei @types/three` (no code uses them now).
2. `npm run typecheck && npm run lint && npm test && npm run build`. Fix anything that surfaces; the Mapbox agent was cut off while about to re-run lint and tests after a small README note edit in `src/components/mapbox/README.md`.
3. Put a real `pk.` token in `.env.local` (never commit it) and manually check the ten items in `docs/MAPBOX.md` (Amsterdam loads in Standard, 3D buildings, three plausible routes, primary dominant, walking dotted vs transit solid, app-state changes move the map, report and entrance focus, missing-token fallback, attribution visible, `git log -p --all | grep -c "sk\."` is 0). Claude never had a token, so the Mapbox view has only been type-checked and unit-tested, not seen.
4. Wire the reset button: the scene listens for `window.dispatchEvent(new CustomEvent("routeroom:reset-view"))`. The UI worktree owns the button.
5. Merge caution: this tree's UI agent already reshaped `src/components/planner/PlannerWorkspace.tsx` and `src/components/panels/*` (InspectDrawer.tsx, RouteWhy.tsx, AttributionFooter.tsx, formatDateOnly.ts added; ComparisonTable, ScoreBreakdown, CritiquePanel deleted; globals.css retokened). Your UI worktree references `src/components/planner/InsightDrawer.tsx`, which does not exist here. Reconcile before merging; the store and scene contracts are stable, the panels are not.
6. First commit. Suggested message: "RouteRoom 3D: Amsterdam pack, trip-scoped WebMCP tools, Mapbox Standard scene, decision records". Then `git log -p --all | grep -c "sk\."` must print 0.
7. Screenshots in `docs/screenshots/` are placeholders. Demo video not recorded.

## Interfaces the UI must connect

- Scene: `import { RouteScene, RouteMap2D } from "@/components/route-scene"`, props in `src/components/route-scene/types.ts` (unchanged contract). Reset via the CustomEvent above.
- Store: `usePlanner(selector)` and `usePlannerStoreApi()` from `src/lib/planner-context.tsx`; every action takes an actor ("human" | "agent"); only `approveConfirmation` commits save, share, publish.
- Tools for testing without a WebMCP browser: `window.__routeroomTools` and `/planner?debug=1`.

## Environment variables

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: public `pk.` token, URL-restricted for deployments. Nothing else.
