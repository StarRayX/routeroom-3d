# src/components/mapbox

Mapbox GL JS v3 implementation of the route scene. This is the only place in
the codebase that imports `mapbox-gl` or reads the Mapbox access token.
`src/components/route-scene` re-exports `MapboxRouteScene` as `RouteScene` so
the planner's import path never changes.

## Files

- `token.ts` — resolves and validates `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. Never logs the token.
- `geojson.ts` — pure converters from a `CityPack` + route-scene props into GeoJSON. No mapbox-gl import.
- `camera.ts` — pure camera math (`computeCamera`, `cameraEquals`). No mapbox-gl import.
- `style.ts` — the layer/source definitions as data, plus `addRouteRoomLayers` and `setRouteRoomData`.
- `MapboxRouteScene.tsx` — the `"use client"` component that ties the above to a live `mapboxgl.Map`.
- `__fixtures__/mini-city.ts` — a tiny synthetic `CityPack` used by the mapbox-* tests.

## Component interface

`MapboxRouteScene` implements `RouteSceneProps`
(`src/components/route-scene/types.ts`) unchanged. Nothing here adds a prop:

| Prop | Effect on the map |
| --- | --- |
| `city` | Source of landmarks and the pack's ODbL attribution string. |
| `routes` | Every route; used to resolve segment/route lookups. |
| `visibleRouteIds` | Routes outside this list are omitted from every source entirely. |
| `displayModes` | Drives `display_mode` on route/point features (`primary`/`backup`/`candidate`), which the style layers colour, width, and dash by. |
| `primaryRouteId`, `backupRouteId` | Not read directly; `displayModes` already carries the same information per route. |
| `focusedSegmentId` | Sets `focused` on that segment's feature (drawn as a white halo) and drives the "feature" camera preset (fits the segment's bounds). |
| `cameraTarget` | Included in `rr-points` even if off every visible route, and drives the "feature" camera preset (centers on it, zoom 16.5) when no segment is focused. |
| `activeReports` | Rendered as `rr-reports` circles at each reported segment's midpoint. |
| `disruptedSegmentIds` | Sets `disrupted` on those segments (drawn as a dashed amber overlay). |
| `onSelectRoute` | Called on a click on any route line layer whose feature has no `segment_id` handler wired, or when `onSelectSegment` is not provided. |
| `onSelectSegment` | Called on a click on a route line layer (with `routeId, segmentId`) or on `rr-reports` (with the report's route and segment). |
| `onSelectLandmark` | Called on a click on `rr-points` / `rr-points-dot`. |
| `onWebGlUnavailable` | Called once, at most, when the WebGL probe fails. |
| `reducedMotion` | When `true` (or when `prefers-reduced-motion: reduce` and this prop is unset), every camera move uses `duration: 0`. |

## Reset event

The props contract has no "reset" prop, so `MapboxRouteScene` listens for a
`CustomEvent` on `window`:

```js
window.dispatchEvent(new CustomEvent("routeroom:reset-view"));
```

(exported as `RESET_VIEW_EVENT` from `MapboxRouteScene.tsx`). On receipt, the
camera eases to the "overview" preset regardless of the current
`focusedSegmentId`/`cameraTarget` props. The UI agent can wire a "Reset view"
button to this event without any change to `RouteSceneProps`. The camera also
already returns to overview through the normal props channel whenever both
`focusedSegmentId` and `cameraTarget` become `undefined`.

## Camera presets (`camera.ts`)

- `overview` — bounds of the trip's destination landmark plus every
  station/stop/entrance/venue landmark within 1200 m of it. Pitch 55,
  bearing -20. This is the default and what the reset event returns to.
- `route` — bounds of one route's full path (every segment's `path`
  concatenated). Pitch 45.
- `arrival` — bounds of the destination-side stations/stops/entrances (same
  1200 m radius, narrower kind set than overview: no venues). Pitch 60.
  Not wired to a `RouteSceneProps` field yet; available for a future
  "arriving" moment if the UI agent wants one.
- `feature` — fits bounds to a focused segment's path, or centers (zoom
  16.5) on a landmark or a report's segment midpoint. Pitch 60. This is what
  `focusedSegmentId` / `cameraTarget` actually drive today.

`cameraEquals` does an epsilon-tolerant structural comparison so an
unchanged camera target never re-triggers `fitBounds`/`easeTo`.

## Sources and layers (`style.ts`)

Sources (`SOURCE_IDS`): `rr-routes` (GeoJSON, `promoteId: "segment_id"`),
`rr-points`, `rr-reports`, `rr-transfers` (this one source carries both
transfer points and hazard points, split back apart by the `kind` property).

Layers (`LAYER_IDS`, in `ROUTE_ROOM_LAYERS`, added in this order so later
layers draw over earlier ones within their slot):

| Layer id | Type | Slot | Source | Notes |
| --- | --- | --- | --- | --- |
| `rr-route-focus` | line | middle | rr-routes | White halo under the route lines; filter `focused`. |
| `rr-route-casing` | line | middle | rr-routes | White casing under every segment; width/opacity by `display_mode`. |
| `rr-route-transit` | line | middle | rr-routes | Filter `!is_walk`; colour by `display_mode`. |
| `rr-route-walk` | line | middle | rr-routes | Filter `is_walk`; dashed, colour by `display_mode`. |
| `rr-route-disrupted` | line | middle | rr-routes | Filter `disrupted`; dashed amber overlay. |
| `rr-transfers` | circle | top | rr-transfers | Filter `kind == "transfer"`. |
| `rr-hazards` | circle | top | rr-transfers | Filter `kind == "hazard"`. |
| `rr-points-dot` | circle | top | rr-points | The dot under each label (symbol layers cannot paint a circle). |
| `rr-points` | symbol | top | rr-points | `text-field: name`, halo'd label. |
| `rr-reports` | circle | top | rr-reports | Hover shows a popup (category + confidence); no permanent label. |

Colours: primary `#d9603b`, backup `#3b4a56`, candidate `#9a9a96`, disrupted
`#d9a441`. Checked by `tests/mapbox-style.test.ts`.

## Env var and token rules

`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is read in exactly one place,
`getMapboxTokenFromEnv()` in `token.ts`. Rules, enforced by
`resolveMapboxToken`:

- Must start with `pk.` (a Mapbox public browser token). Accepted.
- Starts with `sk.` (a secret token): rejected as `secret_token`. **Never**
  put a secret token in `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — anything
  `NEXT_PUBLIC_*` is inlined into the client bundle at build time and is
  publicly visible.
- Anything else non-empty: rejected as `malformed`.
- Missing/empty: `missing`.

Deployed public tokens should be URL-restricted in the Mapbox account
dashboard to the app's real domains. This module never logs a token value,
valid or not, in any state.

## What is and is not fetched from Mapbox

Fetched: the `mapbox://styles/mapbox/standard` style document and its
vector/raster tiles (buildings, roads, labels, atmosphere), requested by
`mapboxgl.Map` itself using the resolved access token.

Not fetched, anywhere in this codebase: the Mapbox Directions API, Geocoding
API, Search Box API, or Navigation SDK. Per ADR 0005, all route geometry,
timing, and fares come from the curated city pack; Mapbox supplies only the
basemap backdrop the curated data is drawn on.

## `buildPointFeatures` signature note

The brief describes `buildPointFeatures(city, routes, visibleRouteIds,
cameraTarget)`. This implementation adds a fifth, optional parameter,
`displayModes`, because `on_primary` cannot be computed correctly without
knowing which visible route is the primary one — a landmark used only by a
backup or candidate route must not read as primary just because some other
route is visible. Every call site in this codebase (`MapboxRouteScene.tsx`)
passes it; omitting it degrades gracefully to `on_primary: false` for every
point rather than erroring.

## Manual verification

This environment has no real Mapbox token and cannot render WebGL, so none
of the following were run here — they need a real `pk.` token and a browser.
Steps, for whoever has both:

1. Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk...` and load the planner with the
   Amsterdam city pack. The Standard style should load: light basemap,
   subdued POI labels off, transit/place labels on, roads unlabeled.
2. Let the camera settle on the overview preset; 3D buildings should be
   visible near the destination once `show3dObjects` takes effect.
3. All three Amsterdam routes (`route_metro_52`, `route_tram_4`,
   `route_metro_51`) should be visible as plausible, real-street-following
   lines, not straight segments.
4. The route in `displayModes` marked `"primary"` should visually dominate:
   thicker, brighter orange, on top of the white casing.
5. Walking segments should read as dotted/dashed and visually distinct from
   solid transit segments in the same colour family.
6. Changing planner state (selecting a different primary route, toggling a
   route's visibility) should update the map's lines/points without a full
   remount — watch for `setRouteRoomData` calls in the network/console, not
   a new `mapboxgl.Map` instance.
7. Clicking a report marker or an entrance/venue point should ease the
   camera to the "feature" preset and call `onSelectSegment` /
   `onSelectLandmark` with the right ids.
8. Temporarily unset `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (or set it to
   something that doesn't start with `pk.`): the page should render
   `RouteMap2D` plus the matching one-line notice, not crash or blank out.
9. Mapbox's own attribution control should remain visible in a corner of the
   map (this component does not disable it), and the RouteRoom curated-data
   + OpenStreetMap attribution line should be visible under the map.
10. View source / inspect the bundle: no `sk.` token, and no hardcoded `pk.`
    token, should appear anywhere in the shipped JavaScript.
