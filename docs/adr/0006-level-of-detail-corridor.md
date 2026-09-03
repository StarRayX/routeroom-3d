# ADR 0006: The scene shows the whole trip corridor with level-of-detail zones

## Status

Accepted (2026-09-03)

## Context

The Amsterdam demo trip is about five kilometres. Rendering every building footprint along it as a separate object would mean roughly fifteen thousand render objects, and a destination-only scene would hide most of the differences between route options, which weakens the central 3D and WebMCP pitch.

## Decision

The spatial explanation layer always shows the complete, geographically truthful corridor from origin to destination. Detail zones around the origin, transfers, stations and stops, walking segments, and venue entrances render individual block models. Everywhere else, neutral building geometry is merged at import time into a small number of simplified shapes. Merging happens in the city-pack import step, not at runtime, and the pack records which zones are detailed.

## Consequences

Positive:

- Route differences (a tram that stops at the door versus a metro with a longer walk) are visible end to end.
- The render object count stays in the low hundreds.
- Detail is spent only where a decision happens, which matches ADR 0002.

Tradeoff:

- Merged blocks look deliberately abstract next to detailed zones; the visual system must make that read as intentional.
- Detail zones are curated per trip, so adding a trip means choosing its zones.

## Rejected alternatives

- Destination district only (hides most route differences).
- Full detail along the corridor (thousands of objects, scenery instead of explanation).
- Two detail tiles with a schematic middle (breaks geographic truth).
