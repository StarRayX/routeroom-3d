---
name: RouteRoom
description: Supporting tokens and rationale for RouteRoom's civic map desk.
colors:
  ink: "#222522"
  secondary-ink: "#4F544F"
  muted-ink: "#747974"
  canvas: "#F1F0EB"
  surface: "#FAF9F5"
  secondary-surface: "#EEEDE8"
  boundary: "#D8D6CF"
  strong-boundary: "#B9B7B0"
  route-signal: "#E45C3D"
  water: "#DCE9EB"
  park: "#DDE6DA"
  success: "#39745A"
  warning: "#A86D20"
  danger: "#AE4939"
typography:
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
  bodySize: "13px"
  explanationSize: "15px"
  routeNameSize: "14px"
  railHeadingSize: "18px"
  metadataSize: "11px"
  strongWeight: 650
  bodyWeight: 450
  lineHeight: 1.5
geometry:
  toolbarHeight: "56px"
  routeRailWidth: "390px"
  controlRadius: "8px"
  containedRadius: "10px"
  border: "1px solid {colors.boundary}"
  shadow: "0 2px 8px rgb(34 37 34 / 10%)"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# RouteRoom design support

`docs/UI_DESIGN.md` is the implementation source of truth. This file keeps the compact token set and the rationale behind it; layout, behavior, accessibility, and content rules remain there.

## Rationale

RouteRoom is a civic map desk: a large, quiet geographic work surface beside a narrow decision rail. Paper, stone, water, vegetation, civic ink, and one vermilion route signal preserve the product's spatial identity without turning the planner into a dashboard. The map owns the visual weight; route comparison owns the rail's density.

## Token rules

- Use `route-signal` only for the active route and focused evidence; keep it below ten percent of the view.
- Reserve `water` for real geography. Do not introduce generic blue, purple, cyan, neon, gradients, tinted shadows, or glass effects.
- Keep structural surfaces opaque, edge-to-edge, and flat at rest. Use borders for hierarchy; reserve the shadow token for map-floating controls and confirmation dialogs.
- Use sentence case and neutral sans typography. Metadata uses tabular numerals; color never carries state by itself.
- Treat ranked routes as bordered list rows, not individual cards. The plan dock is a structural rail footer, and inspection/preferences/activity replace the route list in the same rail.
- Use 6–8px radii for controls and at most 10px for small contained elements. Avoid repeated rounded shells, pill-shaped UI, and nested cards.
- Keep interaction motion purposeful: 150–250ms state changes may explain route, focus, drawer, or confirmation changes. Hover changes color or opacity only; never translate or lift content.

## Identity guardrails

The interface should feel like a professional mapping or design tool: calm, precise, readable under time pressure, and visibly shared by a human and an agent. Keep agent state as quiet text and record actions in the normal activity workflow. Do not add chat bubbles, assistant avatars, promotional copy, vanity metrics, decorative badges, or card-first treatment.
