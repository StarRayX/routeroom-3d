# ADR 0007: Mapbox Standard is the visual provider; curated RouteRoom data stays the routing truth

## Status

Accepted (2026-09-03). Supersedes the "no live provider in the MVP" clause of ADR 0005 and the corridor merging of ADR 0006. ADR 0005's rule that city packs carry WGS84 geometry and curated snapshots stands. ADR 0003's provider boundary stands and is now exercised.

## Context

Rendering the Amsterdam corridor from a committed OpenStreetMap export meant importing thousands of building footprints and inventing a level-of-detail scheme just to look like a city. Mapbox Standard already renders Amsterdam with 3D buildings, lighting, landmarks, and terrain in the restrained light style the product wants, and its free tier comfortably covers a hackathon demo. ADR 0003 allowed Mapbox once the team explicitly accepted its token, licensing, attribution, and quota requirements. The team has accepted them.

## Decision

Mapbox GL JS v3 with the Mapbox Standard style is the visual provider for the spatial explanation layer. RouteRoom draws its own overlays on top: curated route segments, stops, entrances, transfers, hazards, and observations, all from committed GeoJSON derived from the city pack, with stable feature ids shared by the UI and the WebMCP tools.

Mapbox is presentation only. RouteRoom's deterministic engine remains the routing truth: ranking, scoring, confidence, reports, disruptions, entrance choice, and human confirmation never touch a Mapbox API. Mapbox Directions, Geocoding, Search, Navigation, and every other paid API are not used.

The browser uses a public `pk.` token from `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, treated as public, URL-restricted configuration, never a secret. A `sk.` token is rejected. Without a valid token or WebGL the planner falls back to the SVG map, so the WebMCP workflow never depends on the provider.

The provider adapter boundary is the scene component contract. Replacing Mapbox means implementing that contract again; nothing in the store, engine, tools, or packs changes. The integration is reversible.

## Consequences

Positive:

- Real 3D city context at demo quality without maintaining building data.
- Overlays stay small, deterministic, and offline-authored.
- Attribution is explicit: Mapbox and OpenStreetMap on the map, RouteRoom's curated snapshot for routes and stops.

Tradeoff:

- The demo needs network access and a Mapbox account with a URL-restricted public token.
- Tile and style loads count against the Mapbox free tier; the fallback keeps the product usable if that fails.
- Map appearance is Mapbox's, tuned through Standard style configuration, not fully owned.

## Rejected alternatives

- Committed OSM building geometry with a level-of-detail corridor (ADR 0006): far more data and code for a worse result.
- A self-hosted vector tile stack (MapLibre plus OpenFreeMap or Protomaps): free of tokens but more infrastructure than a hackathon justifies.
- Using Mapbox routing or search APIs: would blur who is responsible for the recommendation.
