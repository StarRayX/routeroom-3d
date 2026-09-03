# ADR 0003: Use the Mapbox reference as design inspiration, not copied source

## Status

Accepted

## Context

The desired visual direction resembles Mapbox Standard: light blocks, subdued colors, recognizable landmarks, and a map that keeps custom data legible. Mapbox describes its 3D experience as using building extrusions, landmarks, lighting, atmosphere, and custom data layers. The blog post is a product and design reference, not a permission to copy its source, assets, screenshots, or proprietary data.

The project also prefers free or near-free infrastructure and does not want secret credentials exposed.

## Decision

Use the reference for visual principles only. Implement the MVP with a provider boundary and a stylized local or open-data scene. A real map integration may supply coordinates, streets, and building footprints, but the app must not depend on Mapbox unless the team explicitly accepts its account, token, licensing, attribution, quota, and deployment requirements.

If a provider is used, isolate it behind a map adapter. Never copy Mapbox source, assets, screenshots, or proprietary tiles into the repository. Any public client token must be treated as public, domain-restricted, quota-limited configuration rather than a secret.

## Consequences

Positive:

- The visual quality can approach the reference without legal or vendor lock-in.
- The demo can remain deterministic with local city-pack data.
- A provider can be swapped later.

Tradeoff:

- The first demo may be less geographically rich than Mapbox Standard.
- Open map data requires attribution and careful licensing review.
- Provider integration should be added only after WebMCP and route state work.

## Rejected alternatives

- Copying code or assets from the Mapbox blog or screenshots.
- Calling a paid provider on every agent tool invocation.
- Making the WebMCP demo fail when a map provider quota or network request fails.
