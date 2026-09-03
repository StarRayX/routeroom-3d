# Amsterdam city pack -- data attribution

## Map data

© OpenStreetMap contributors. Map geometry (buildings, water, parks, roads,
and rail) in `geometry.json` and `routes-geometry.json` is derived from
OpenStreetMap data, available under the Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/

You are free to copy, distribute, transmit, and adapt this data as long as
you credit OpenStreetMap and its contributors. If you alter or build upon
this data, you may distribute the result only under the same license. See
the full license text at the link above.

Export date: see `geometry.source.exportedAt` in `geometry.json` (ISO
timestamp of the import run that produced the committed file).

## Bounding boxes queried

Corridor bbox: south 52.335, west 4.870, north 52.385, east 4.925 (covers
Amsterdam Centraal to the RAI convention centre).

Detail zones (individual building footprints kept, radius in meters):

| zone | center (lat, lng) | radius | reason |
| --- | --- | --- | --- |
| centraal | 52.3791, 4.9003 | 320 m | origin |
| europaplein | 52.3417, 4.8905 | 300 m | station |
| station_rai | 52.3379, 4.8895 | 300 m | station |
| rai_entrance | 52.3411, 4.8896 | 250 m | entrance |
| rai_destination | 52.3410, 4.8880 | 300 m | destination |

## Data source used for this export

`scripts/import-osm.mjs` prefers the Overpass API
(`https://overpass-api.de/api/interpreter`), which can filter by tag
server-side. During the development of this city pack, Overpass was
unreachable from the project's network (confirmed with direct `curl`
requests to overpass-api.de, overpass.kumi.systems, overpass.private.coffee,
and the maps.mail.ru Overpass mirror -- all timed out, while
api.openstreetmap.org and general internet access worked normally). The
script automatically falls back to the standard OpenStreetMap API
(`api.openstreetmap.org/api/0.6/map`), tiling the corridor bbox into small
sub-requests to stay under that endpoint's 50,000-node-per-request limit,
and filtering the raw nodes/ways for `building`, `natural=water`,
`waterway=canal|river`, `leisure=park`, `highway` in
primary/secondary/tertiary/primary_link/secondary_link, and
`railway=subway|tram` locally instead of server-side.

`geometry.source.notes` in the committed `geometry.json` records which path
actually ran for that export. Rerun `node scripts/import-osm.mjs --refresh`
once Overpass is reachable to redo the import through Overpass instead; the
script prefers it automatically whenever its `/api/status` endpoint
responds.

## What was simplified

Real central-Amsterdam density is much higher than the 400-900 feature
budget: the full tiled export saw 44,317 candidate building ways, and an
unfiltered water/road pass produced well over 3,000 features. Getting to a
782-feature `geometry.json` took real cuts, all made in
`scripts/import-osm.mjs` and logged to `geometry.source.notes` on every run:

- Building footprints inside detail zones: individual polygons, simplified
  with Ramer-Douglas-Peucker (tolerance ~1.5 m), footprints under 35 m²
  dropped, coordinates rounded to 6 decimal places. Height comes from the
  OSM `height` tag or `building:levels * 3.2`, defaulting to 11 m. Real
  density still leaves far more than a scene needs, so **within each detail
  zone only the 70 largest footprints by real area are kept**; smaller ones
  are dropped outright (not merged). This export kept 176 detail-zone
  buildings across the 5 zones (160 dropped under 35 m², 84 more dropped
  over the per-zone cap).
- Buildings outside every detail zone are merged into a coverage grid:
  cells with more than ~18% building coverage become one rectangular
  "merged_block" feature (10 m inset on each side), with height set to the
  median height of the buildings that fell in the cell (default 12 m).
  Horizontally adjacent cells in the same row with similar height are
  merged into one wider rectangle. The grid cell size is **170 m**, not the
  original 110 m target -- real coverage at 110 m produced far too many
  active cells for the feature budget, so resolution was reduced (this
  export: 491 active cells -> 154 merged rectangles). When the OSM API
  fallback path ran, coverage uses each building's real footprint area
  (Shoelace formula) rather than a bounding-box approximation.
- Water: canal/river ways sharing a name are chained end to end into one
  line feature per named canal (OSM splits a single canal into many short
  ways, one per bridge) rather than kept as separate fragments;
  unnamed water lines under 100 m and water/park polygons under 4,000 m²
  are dropped, named ones under 60 m / 1,000 m². This export kept 199 water
  and 42 park features.
- Roads: only `highway=primary` and `primary_link` are kept (secondary,
  tertiary, and secondary_link were dropped -- otherwise entirely too many
  short street segments for the budget); segments under 20 m are dropped.
  Primary ways get `widthMeters: 10`, primary_link gets `widthMeters: 7`.
  Lines are lightly simplified (tolerance ~2 m). This export kept 208 road
  features.
- Any water/park/road way that extends past the corridor bbox (the OSM API
  returns a way's full geometry once any one of its nodes falls inside a
  requested tile) is dropped rather than clipped -- the corridor scene only
  needs the bbox area anyway.
- Rail: Metro 52, Metro 51, and Tram 4 are each a single polyline
  (`widthMeters: 4`) between the stop used to board and the stop used to
  arrive for the demo trip. When routed through Overpass, this is the
  numbered route relation's member ways, chained in member order and
  clipped to those two stops. When routed through the OSM API fallback,
  there is no relation data available to isolate "line 52" from the other
  lines that share the same physical track, so instead the script builds a
  graph from every `railway=subway` (shared by Metro 52 and Metro 51) or
  `railway=tram` (Tram 4) way near the straight line between the two stops,
  and finds the real shortest path across that graph (Dijkstra) -- a real
  track alignment, even though it is not guaranteed to be exactly the
  numbered service's official routing where multiple lines diverge.

Known approximation: the Metro 52 and Metro 51 ride segments' `path` starts
at Amsterdam Centraal's main coordinate rather than the `centraal_metro_platform`
landmark used as the walk segment's endpoint (about 115 m away) -- moving the
shortest-path search to the entrance point did not reliably find a connected
graph path in the OSM API fallback data, so the search anchor was kept at the
station coordinate, which the real Noord/Zuidlijn platforms sit beneath
anyway. The Tram 4 ride segment does start exactly at its landmark
(`centraal_tram_stop`).

## Landmark positions

Landmark coordinates in `amsterdam.ts` are curated by hand against real
Amsterdam geography (station and entrance locations, walking distances
along real streets), not auto-generated. `scripts/import-osm.mjs` also
dumps every nearby station/stop/entrance node it saw to
`scripts/.cache/landmark-candidates.json` (gitignored) as a cross-reference
-- for example it confirmed `europaplein_station` against the real OSM node
`node/5737467956` ("Europaplein station", `railway=station`,
`wheelchair=yes`), whose `osmId` is recorded on that landmark. Not every
landmark carries a verified `osmId`; where the candidate dump was ambiguous
(multiple named entrances/stops nearby) or moving to the exact node would
have meant redoing the hand-tuned route distances, the curated position was
kept instead, deliberately erring toward "close, real-world plausible" over
"pinned to one exact node."

## Route options and transit details

Route durations, fares, reliability, accessibility, and the two seed
service reports in `amsterdam.ts` are a curated snapshot (ADR 0005), not
live directions -- see `amsterdamCity.snapshot` for sources and curation
date. They are hand-authored from GVB's public timetable/fare pages and the
OSM route-relation facts verified for this corridor, not generated by the
import script.

## Overlay GeoJSON (routes.geojson, points.geojson, reports.geojson)

Generated by `scripts/export-overlays.ts` (`npm run export:overlays`) from `amsterdam.ts`, which in turn takes its transit polylines from `routes-geometry.json` (OpenStreetMap track geometry, ODbL) and its walking legs and landmark positions from the curated pack. Each feature carries a stable id (segment id, landmark id, report id) shared by the UI and the WebMCP tools. The Mapbox scene builds the same features at runtime; these committed copies exist for review and provenance. Report text is intentionally not included in the overlay. Mapbox renders the basemap only and is not a source for any of this data.
