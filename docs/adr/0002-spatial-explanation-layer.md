# ADR 0002: Use 3D as a spatial explanation layer

## Status

Accepted

## Context

The 3D map is visually distinctive, but a full navigation engine or editable 3D world would consume the deadline and distract from WebMCP. The 3D view is valuable when it helps a person understand why routes differ.

## Decision

Use a restrained low-poly 3D map with real coordinate relationships and simplified building blocks. The 3D view should show route geometry, transfers, entrances, walking segments, and observations. It should support orbit, zoom, route selection, and agent-directed focus.

The map is primarily for visual explanation and shared inspection. Users and agents do not edit building geometry in the hackathon MVP.

## Consequences

Positive:

- The scene communicates spatial tradeoffs quickly.
- Agent tool calls can visibly focus or change the route.
- The product remains useful with a 2D/list fallback.
- The scope is compatible with a small city pack.

Tradeoff:

- 3D is not a source of routing truth.
- The implementation needs careful performance and accessibility handling.
- Some spatial details must be labeled unknown instead of invented.

## Rejected alternatives

- A decorative 3D background unrelated to route decisions.
- A full city-scale photorealistic reconstruction.
- User-editable 3D urban modeling during the hackathon.
