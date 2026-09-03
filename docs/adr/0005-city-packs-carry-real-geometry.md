# ADR 0005: City packs carry real-world geometry and the scene is a projected view

## Status

Accepted (2026-09-03)

## Context

The first implementation placed buildings, landmarks, and route polylines in hand-authored scene units with no relationship to any real place. That made the demo city fictional, which ADR 0001 rejects, and it left the "provider adapter" and "block model" terms with no code behind them. Judges cannot tell whether an agent focusing the camera on an entrance means anything if the entrance is invented.

Two ways to get real geometry were considered: a live basemap SDK with vector tiles, or a one-time export of public map data committed to the repository. ADR 0003 constrains the project to free, deterministic, credential-free infrastructure.

## Decision

City packs store geometry in WGS84 longitude and latitude: landmarks, building footprints, roads, water, green space, and route segment polylines. A scene projection converts them to local meters around the pack's center. The spatial explanation layer never holds its own coordinates.

Geometry comes from a one-time OpenStreetMap export, simplified and committed as static data inside the pack, together with the source date and the ODbL attribution string. The import script is kept in the repository so the snapshot can be reproduced. The only provider adapter in the MVP is this static city pack. No tile server, map SDK, token, or runtime network request is involved.

Route options and transit details are curated snapshots: hand-reviewed estimates with a source date, evidence freshness, and confidence, labelled as such in the UI and in tool results. They are not live directions.

## Consequences

Positive:

- Real coordinate relationships: distances, directions, transfers, and entrances match the district.
- The demo stays deterministic and offline; nothing fails when a provider is down.
- A future live provider (for example MapLibre with an open tile source) plugs in behind the same adapter without changing route concepts.
- Attribution and licensing are explicit: "© OpenStreetMap contributors, ODbL" plus the export date, shown in the product and the README.

Tradeoff:

- Snapshots go stale; freshness must be visible so a judge or user can tell.
- Footprint simplification is a manual quality step per city pack.
- Transit times and fares are curated, not computed; adding a trip means curating its route options.

## Rejected alternatives

- Keep hand-authored scene units and amend ADR 0002 (contradicts the product thesis).
- Live basemap with vector tiles in the MVP (network dependency, attribution surface, and non-deterministic demo).
- Real routing over the exported street graph (the scope trap the plan warns about).
