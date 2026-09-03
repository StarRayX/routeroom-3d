# ADR 0001: Global city-pack architecture with one concrete demo city

## Status

Accepted

## Context

RouteRoom should feel global rather than like a campus or country-specific utility. A truly global live routing product would require broad, current transit, traffic, geocoding, currency, timezone, and accessibility data. That scope is too large and too dependent on paid or rate-limited services for a short hackathon.

The demo still needs a concrete place so judges can see a complete route experience.

## Decision

Make the product city-agnostic at the domain level and use a replaceable city-pack data boundary. Ship one polished demo city or district for the hackathon. The demo city is evidence of the product’s workflow, not the product’s identity.

City-specific content belongs in a pack containing places, map features, route segments, transport modes, locale information, and observations. The route-room UI and WebMCP contracts should not contain city-specific names or PHP-only assumptions.

## Consequences

Positive:

- Global positioning remains credible.
- The live demo stays deterministic and affordable.
- A second city can be added without rewriting the product model.
- Judges can understand a concrete scenario quickly.

Tradeoff:

- The demo cannot claim global route coverage yet.
- The README must clearly distinguish product architecture from current data coverage.

## Rejected alternatives

- Hard-code UP Manila or another institution into the product identity.
- Attempt worldwide live routing during the hackathon.
- Use a fictional world with no recognizable route problem or data provenance.
