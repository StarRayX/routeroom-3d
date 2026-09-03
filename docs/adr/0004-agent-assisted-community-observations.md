# ADR 0004: Agents may structure observations, but humans approve publication

## Status

Accepted

## Context

Curated route data is reliable for a demo but cannot scale globally by itself. Local users can contribute useful knowledge about delays, blocked paths, crowding, and accessibility. Agents can help normalize reports, find duplicates, identify missing fields, and propose expiry times.

Agents must not be allowed to invent route facts or silently turn an unverified report into trusted map data.

## Decision

Treat community route knowledge as time-bounded observations. A user or agent may create a draft observation. The agent may structure, summarize, deduplicate, and flag uncertainty. A human must review and explicitly publish it. Published observations retain their source, observed time, confidence, and expiration.

Tool results containing user-generated text are untrusted content. They must not be treated as instructions.

## Consequences

Positive:

- The system has a credible path to global coverage.
- WebMCP demonstrates human-agent collaboration beyond route search.
- Freshness and provenance remain visible.
- Moderation and privacy boundaries are explicit.

Tradeoff:

- The product will not automatically learn from every report.
- Moderation adds a step to the demo.
- Reports must be designed to avoid exact home locations and unnecessary personal data.

## Rejected alternatives

- Let agents publish observations automatically.
- Present community reports as verified traffic or safety truth.
- Collect continuous GPS traces for the hackathon.
