# Mapbox setup and integration guide

RouteRoom 3D's visual map is Mapbox GL JS v3 with the Mapbox Standard style.
This is the accepted visual provider decision; see
[ADR 0007](./adr/0007-mapbox-standard-visual-provider.md) for why, and
[ADR 0003](./adr/0003-map-reference-and-provider-boundary.md) for the
provider boundary the decision exercises. This document is a focused,
practical companion to that ADR: how to set the integration up, what it
does and does not do, and how to check it actually works.

## Setup

1. Create a free account at [mapbox.com](https://www.mapbox.com/).
2. In the Mapbox account dashboard, create a new **public** token. Public
   tokens start with `pk.`. Restrict it by URL: `http://localhost:3000` for
   local development, and your deployed domain(s) once you have them.
3. Copy `.env.example` to `.env.local` and set
   `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-token`.
4. Restart the dev server (`npm run dev`) so Next.js picks up the new
   environment variable. Environment variables are read at build/start
   time, not hot-reloaded.

## The environment variable

`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is the only environment variable
RouteRoom 3D uses. The `NEXT_PUBLIC_` prefix is deliberate: this value is
sent to the browser, because a public Mapbox token is meant to run
client-side. It is not a secret in the way a database credential is.

## Token rules

- Must be a public token, the kind that starts with `pk.`. A secret token
  (`sk.`) is rejected by the app rather than used; RouteRoom does not treat
  any Mapbox token as a backend credential.
- Restrict it by URL in the Mapbox account dashboard. An unrestricted
  public token still works but is worse practice; restricting it to known
  domains limits what a copied token can be used for.
- Never commit a real token. `.env.example` documents the variable name
  with a placeholder only; real values go in `.env.local`, which is
  gitignored.
- The app never logs the token and never proxies it through a backend. It
  is read directly by the browser and handed to Mapbox GL JS, which is
  what a public token is for.
- If a token is missing or invalid, the app does not crash. See Fallback
  behavior below.

## What the map fetches

With a valid token, the browser loads the Mapbox Standard style document
and vector tiles for the visible area from Mapbox's servers, plus glyph and
sprite assets the style references. This is a genuine runtime network
dependency; it did not exist before ADR 0007. RouteRoom does not call
Mapbox Directions, Geocoding, Search, Navigation, or any other paid Mapbox
API. RouteRoom's own route and landmark data, committed GeoJSON in
`src/lib/city-packs/amsterdam/` (`routes.geojson`, `points.geojson`), never
goes through Mapbox; it is bundled with the app and drawn locally as
overlays on top of the Mapbox basemap.

## Provider boundary

Mapbox is presentation only. RouteRoom's deterministic engine
(`src/lib/route-engine.ts`) remains the routing truth: ranking, scoring,
confidence, reports, disruptions, entrance choice, and human confirmation
never touch a Mapbox API. The map shows what the engine has already
decided; it does not decide anything itself.

The provider adapter boundary is the scene component contract,
`RouteSceneProps` (`src/components/route-scene/types.ts`). The current
implementation, `src/components/mapbox/MapboxRouteScene.tsx`, is exported
as `RouteScene` from `src/components/route-scene`. Replacing Mapbox means
implementing that contract again in a new component and switching the
export in `src/components/route-scene/index.ts`; nothing in the store,
engine, tools, or city packs changes. See `CONTRIBUTING.md`'s "Adding a map
provider" section for the steps.

## How human and WebMCP actions reach the map

The scene component reacts to planner state; it never owns selection state
itself. Visible routes, display modes, the focused segment, the camera
target, active reports, and disrupted segments all come from
`src/lib/planner-store.ts`, the single store that also powers the human UI.
A human click and a WebMCP tool call both go through the same store
actions, so the map responds identically no matter which one triggered the
change. There is no separate, weaker agent-only path to the map.

A `routeroom:reset-view` window `CustomEvent` returns the camera to the
overview from anywhere in the app.

## Camera presets

The camera eases between a small, fixed set of presets rather than free
navigation:

- **Overview.** The RAI district and its local decision points. The
  default view and the `routeroom:reset-view` target.
- **Route.** Fits the currently selected route.
- **Arrival.** Europaplein, Station RAI, or a venue entrance, depending on
  what the trip's destination segment is.
- **Feature.** A focused segment, stop, entrance, or report, used when the
  human or an agent inspects one specific thing.

Reduced motion is respected: with that preference set, the camera cuts
directly to a preset instead of easing, and route dots do not animate.

## Layer and color system

Route overlays render in the Mapbox Standard "middle" slot; symbols and
markers render in the "top" slot, so RouteRoom's own data always draws
above the basemap's roads and below nothing that would occlude it
unexpectedly.

Colors:

- Primary route: vermilion `#d9603b`.
- Backup route: dark slate `#3b4a56`.
- Other candidate routes: neutral gray.
- Amber `#d9a441`: reserved for warnings, stairs, reports, and
  disruptions. Not used for anything else, so it stays meaningful when it
  appears.

Line style: walking segments are dotted, transit segments are solid, so
the mode of a segment is readable from the line alone, without needing to
select it.

## Fallback behavior

If the Mapbox token is missing or invalid, or WebGL is unavailable, the
planner falls back to the SVG map with a short notice explaining why.
Everything else in the product keeps working: route ranking, preferences,
drafts, saving, sharing, reports, and all 22 WebMCP tools. The fallback
exists specifically so the WebMCP workflow never depends on the provider.

## Attribution

Mapbox's attribution control stays visible on the map (`© Mapbox
© OpenStreetMap`); do not hide, remove, or cover it. RouteRoom adds its own
attribution line for two things the Mapbox control does not cover: the
curated route/report snapshot (source date and confidence) and the
OSM-derived overlay data in `routes.geojson`/`points.geojson`, which
carries its own ODbL attribution and export date, recorded in
`src/lib/city-packs/amsterdam/ATTRIBUTION.md`. Both attribution sources
must be visible on the deployed page, not only in this repository's
documentation.

## Free-tier assumptions

Style and tile loads for a demo stay well inside Mapbox's free monthly
allowance. The team should still watch usage in the Mapbox account
dashboard, especially around a public demo or judging period when the URL
might be shared or loaded repeatedly. If the free tier is ever exceeded,
Mapbox requests fail and the app falls back to the SVG map automatically;
the product does not break, but the 3D view stops appearing until usage
resets or billing is enabled. The fallback described above is what covers
a quota failure, not a manual intervention.

## Manual verification checklist

Run through this after any change that touches the map integration, and
after every deploy:

- [ ] Amsterdam loads in the Mapbox Standard style (not a blank map, not an
      error tile).
- [ ] 3D buildings are visible after the camera settles into the overview
      preset.
- [ ] All three demo routes (Metro 52, Metro 51, Tram 4) are visible and
      plausible against the real street layout.
- [ ] The selected route visually dominates: it is the vermilion primary
      ribbon, clearly distinct from the backup and other candidates.
- [ ] Walking segments and transit segments are visually distinguishable
      (dotted versus solid) without needing to click anything.
- [ ] Changing app state, preferences, selected route, focused segment,
      updates the map without a page reload.
- [ ] Selecting a report or an entrance moves the camera to the feature
      preset and highlights the right object.
- [ ] Removing or invalidating `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` does not
      crash the app; the SVG fallback and its notice appear instead.
- [ ] The Mapbox attribution control and RouteRoom's own attribution line
      are both visible on the page.
- [ ] No secret Mapbox token (`sk.`) has ever been committed. Check the
      full git history, not just the current working tree:

  ```bash
  git log -p --all | grep -c "sk\."
  ```

  This must print `0`. If it prints anything else, treat the token as
  compromised: revoke it in the Mapbox account dashboard immediately, and
  do not assume removing it from a later commit is sufficient, since it
  still exists in history.
