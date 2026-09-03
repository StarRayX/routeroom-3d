# Product

## Register

product

## Users

RouteRoom serves commuters and visitors comparing unfamiliar city routes under real constraints such as arrival deadlines, rain, walking distance, reliability, and accessibility. They may work directly in the interface or alongside a browser agent that can inspect, compare, and stage decisions in the same visible workspace.

## Product Purpose

RouteRoom is a shared route decision room. It turns route planning from a list of directions into a visible, inspectable decision: a human sets priorities, an agent manipulates the same map and route state, and consequential actions remain human-confirmed. Success means users can understand why one route wins, see where its weak points are, and leave with a primary route plus a credible backup.

## Brand Personality

Precise, civic, quietly futuristic. The product should feel calm enough for a time-sensitive decision, spatial enough to make geography legible, and confident without sounding omniscient.

## Anti-references

- A colorful low-poly toy city.
- A wall of equally weighted dashboard cards.
- A generic AI chat bubble pasted over a normal route planner.
- Glassmorphism, purple gradients, neon accents, or ornamental data visualization.
- A Mapbox imitation that treats 3D scenery as the product.

## Design Principles

- The map is the shared working surface. Controls support it instead of competing with it.
- Every agent action leaves visible evidence in the scene, route ranking, or activity record.
- Explain uncertainty through provenance, freshness, and confidence without overwhelming the decision.
- Use progressive disclosure. The default view answers “which route and why”; deeper inspection stays one action away.
- Preserve human authority for saving, sharing, publishing, and moderation.

## Accessibility & Inclusion

Target WCAG 2.2 AA. All controls must be keyboard reachable with visible focus, route states must not rely on color alone, text and controls must maintain AA contrast, and the complete route decision must remain available through the 2D/list fallback. GSAP and scene motion must respect `prefers-reduced-motion`.
