# RouteRoom UI Design Specification

Status: implementation source of truth

This document defines the visual and interaction design for RouteRoom. It is intentionally stricter than a mood board. If an implementation choice conflicts with this file, preserve the rules in this file unless a later ADR explicitly supersedes them.

## Product idea

RouteRoom is a shared route-decision surface for a human and a browser agent. The map is not decoration and the agent is not a chat widget. Both actors manipulate the same visible route ranking, geographic focus, evidence, and draft plan. Saving, sharing, publishing, and moderation remain human-confirmed.

The interface should feel like a well-made civic navigation tool: calm, spatial, precise, and useful under time pressure.

## Creative direction: the civic map desk

Use the visual language of a physical city-planning desk:

- a large, quiet map surface
- a narrow working rail for the current decision
- paper, stone, ink, transit paint, and muted vegetation tones
- fine structural rules instead of cards floating in space
- one strong route signal, used only to identify the active decision

The desired result is closer to a professional mapping or design tool than a SaaS dashboard.

## Non-negotiable layout

### Desktop

The app fills the viewport and must not become a long dashboard page.

```text
┌──────────────────────────────────────────────────────────────┐
│ 56px toolbar: brand                         context + actions │
├───────────────────┬──────────────────────────────────────────┤
│ 390px route rail  │                                          │
│                   │                                          │
│ Trip              │           map / 3D city                  │
│ Routes            │           shared work surface            │
│                   │                                          │
│ Draft plan        │                         inspect controls  │
└───────────────────┴──────────────────────────────────────────┘
```

- Toolbar: 56px tall, full width, flat, one bottom border.
- Route rail: 390px wide, edge-to-edge, one right border, no outer radius.
- Map: consumes every remaining pixel and at least two-thirds of typical desktop width.
- The page itself does not scroll. Only route and inspector content may scroll inside the rail.
- The map may have one compact inspection toolbar. It must not be surrounded by floating cards.

### Information architecture

The left rail has four mutually exclusive modes:

1. Routes
2. Preferences
3. Activity
4. Route inspection

Preferences, activity, and inspection replace the route list in the same rail. They are not extra cards below the map and not simultaneous columns.

Secondary modes use the full height of the rail. The expanded trip editor appears only in Routes mode so evidence and forms are not squeezed beneath repeated context.

The default Routes mode contains:

- trip summary/editor
- ranked routes
- a compact plan dock fixed to the bottom of the rail

The inspection mode contains tabs for:

- Why
- Segments
- Stress test
- Reports

### Mobile

- Map first, decision surface second.
- Map height: approximately 44–50dvh, never below 340px.
- The route rail becomes normal document flow beneath the map.
- Inspection actions collapse to icon buttons with accessible labels.
- Do not stack every desktop panel into one endless page.
- Confirmation actions become full-width and remain explicit.

## Visual system

### Color tokens

Use these values unless contrast testing requires a small adjustment:

| Token | Value | Purpose |
| --- | --- | --- |
| Ink | `#222522` | Primary text and decisive controls |
| Secondary ink | `#4f544f` | Supporting text and icons |
| Muted ink | `#747974` | Metadata and low-priority labels |
| Canvas | `#f1f0eb` | Map/page ground |
| Surface | `#faf9f5` | Toolbar and route rail |
| Secondary surface | `#eeede8` | Selected rows and control backgrounds |
| Boundary | `#d8d6cf` | Default structural dividers |
| Strong boundary | `#b9b7b0` | Floating map control border |
| Route signal | `#e45c3d` | Active route and focused evidence only |
| Success | `#39745a` | Connected, viable, confirmed |
| Warning | `#a86d20` | Disruption, stairs, reports, attention |
| Danger | `#ae4939` | Missed constraints and destructive states |

Rules:

- Vermilion should occupy less than ten percent of the screen.
- Blue belongs to real geography such as water, not generic actions.
- Candidate routes remain neutral gray. The backup route is dark slate and dashed.
- Do not introduce purple, cyan, neon, gradients, or tinted shadows.
- Color never carries state without text, shape, or line-style support.

### Typography

- Use the project’s existing Inter configuration or a high-quality neutral sans already loaded by the project.
- Body text: 13–14px in dense application areas, 15–16px for continuous explanation.
- Route names: 14px/650.
- Rail headings: 18px/650.
- Metadata: 11–12px with tabular numerals for time, money, distance, confidence, and rank.
- Use sentence case.
- No eyebrow headings, uppercase micro-labels, decorative slogans, serif display faces, or gradient text.
- Do not make headings oversized. The map, not typography, is the visual anchor.

### Geometry and depth

- Structural surfaces are rectangular and edge-to-edge.
- Controls use 6–8px radii.
- Small contained elements may use at most 10px.
- Avoid repeating rounded rectangles around every piece of content.
- Resting UI is flat. Use one-pixel borders for hierarchy.
- Shadows are reserved for controls floating over the map and confirmation dialogs.
- Maximum normal shadow: `0 2px 8px rgb(34 37 34 / 10%)`.
- No glass, blur, glow, frosted panels, thick accent borders, or colored side stripes.

### Icons

- Use Reicon for interface actions.
- Standard size: 16–18px, Outline weight.
- Icons are monochrome unless semantic color is required.
- Do not place every icon in its own colored circle.
- Icons supplement labels; they do not replace ambiguous desktop actions.

## Component behavior

### Toolbar

- Left: RouteRoom mark and wordmark.
- Right: city/trip pack selector, plain agent connection status, Preferences, Activity, and 3D/2D mode.
- The agent state is quiet text, not a promotional badge.
- The mobile toolbar may hide text labels while retaining tooltips or accessible names.

### Trip editor

- Show origin and destination as a vertical route sequence in the narrow rail, not two cramped columns.
- Show departure and arrival deadline in one compact row.
- The route refresh action spans the rail width.
- Long place names wrap to two lines or truncate gracefully; they must never collide with the map.

### Ranked routes

- Routes are list rows separated by borders, not independent rounded cards.
- The primary route is slightly warmer than the rail, with text “Primary.”
- The backup route uses a muted background and an underlined or dashed “Backup” state.
- Candidate rows stay compact.
- Every row shows the same four comparison metrics in the same grid positions: duration, fare, walk, transfers.
- Only the primary route expands to show confidence, freshness, qualities, tradeoffs, and reasoning access.
- Candidate actions must not dominate the route name or metrics.
- Reports appear as quiet amber text such as “2 reports,” not a bright badge.

### Plan dock

- A structural footer of the route rail, not a separate card.
- Show a short primary/backup summary that can wrap without covering its action.
- Use one clear action: Create draft, Save plan, or Share link according to state.
- Saving, sharing, and publishing always open the human confirmation dialog before side effects occur.

### Preferences

- Replace the route list in the rail.
- Use standard labeled selects, segmented controls, and switches.
- Avoid arranging settings as a dashboard grid.
- Show the current recommendation once at the bottom.
- When a preference changes the ranking, animate only the affected route emphasis and map route.

### Activity

- Replace the route list in the rail.
- Human and agent actions share one chronological list.
- Identify actor with text and a small semantic marker.
- Do not turn the log into chat bubbles.
- Keep timestamps and tool details secondary.

### Route inspection

- Replace the route list in the rail.
- Use normal underline tabs, not pills.
- Selecting a segment must update both the rail and map focus.
- Reports are explicitly labeled as user-submitted and potentially untrusted.
- Drafting a report and publishing it are separate steps; publishing is confirmation-gated.

### Confirmation dialog

- Centered modal with a neutral backdrop.
- State exactly what will happen, what data will be used, and who can see it.
- Primary confirmation and Cancel are visually distinct.
- No dramatic slide-in motion.

## Map and 3D scene

Mapbox Standard is the target provider. The existing Three.js scene is a fallback and development fixture.

The map must:

- use a pale, restrained Standard style with 3D buildings
- keep real Mapbox/OpenStreetMap attribution visible
- render curated RouteRoom GeoJSON above the basemap
- show one active vermilion route, one dashed slate backup, and faint candidates
- distinguish walking from transit through dash pattern and line weight
- limit persistent labels to origin, destination, transfer, selected entrance, and currently focused evidence
- show report markers without permanent floating text
- keep agent-triggered and human-triggered state visually identical

Do not make the camera orbit automatically. Use short, purposeful camera transitions when route, segment, entrance, or report focus changes. Respect `prefers-reduced-motion`.

The map is a shared evidence surface, not routing truth. RouteRoom’s curated trip data owns ranking, confidence, reports, and route decisions.

## Motion

GSAP may be used for state changes that explain causality:

- route emphasis after ranking changes
- sidebar mode crossfade
- focused map feature or camera transition
- confirmation appearance

Durations should normally be 150–250ms.

Do not use:

- transform animation on hover
- bouncing or elastic easing
- continuous ambient animation
- decorative page-load choreography
- animated gradients
- repeated pulsing except for an active, time-sensitive disruption

Reduced-motion mode must remove nonessential animation and preserve every state change.

## Human-agent collaboration states

Agent participation must be visible without creating an AI-themed interface.

- Connected status appears in the toolbar.
- Agent actions update the same route list and map used by the human.
- The activity view records the actor, action, target, and time.
- A pending agent draft appears in the normal plan or report workflow.
- Consequential operations pause at a conventional confirmation dialog.
- Avoid assistant avatars, chat bubbles, sparkly AI panels, “thinking” gradients, or generated prose blocks on the default screen.

## Content style

- Be direct: “Why this route,” “Set as backup,” “2 reports.”
- Avoid generic startup or AI copy.
- Avoid ornamental labels such as “decision intelligence,” “live pulse,” or “command center.”
- Use “agent” only when actor identity or connection state matters.
- Keep descriptions short enough to scan during a commute decision.
- Never present confidence as certainty.

## Accessibility

- Meet WCAG 2.2 AA.
- All functionality must be keyboard reachable.
- Focus rings must be visible against both surface and map backgrounds.
- Provide accessible names for icon-only controls.
- Maintain a complete 2D/list fallback when WebGL or Mapbox is unavailable.
- Preserve semantic headings and landmarks.
- Use `aria-live` only for meaningful ranking, confirmation, or error changes.
- Route identity cannot depend on color alone.

## Explicitly banned patterns

- dashboard card grids
- a floating rounded shell around the entire app
- nested cards inside cards
- giant hero copy inside the planner
- uppercase eyebrow labels
- decorative pills or status badges
- gradient backgrounds or text
- glassmorphism and backdrop blur
- colored side stripes on selected cards
- generic AI chat surfaces
- fake charts or vanity metrics
- 20–32px radii
- large or colored shadows
- transform hover effects
- separate panels for every WebMCP capability
- long desktop page scrolling

## Current implementation boundary

The expected UI implementation lives primarily in:

- `app/globals.css`
- `src/components/planner/PlannerWorkspace.tsx`
- `src/components/planner/InsightDrawer.tsx`
- `src/components/panels/TopBar.tsx`
- `src/components/panels/TripStrip.tsx`
- `src/components/panels/RouteCards.tsx`
- `src/components/panels/PreferenceControls.tsx`
- `src/components/panels/ActivityLog.tsx`
- `src/components/panels/PlanDock.tsx`
- `src/components/panels/ConfirmationPanel.tsx`
- `src/components/route-scene/route-scene.css`

The Mapbox provider should consume the existing scene props instead of owning application state or changing this information architecture.

## Definition of done

Before calling the UI complete, verify:

- the desktop planner fits in one viewport
- the map owns the majority of the screen
- origin and destination remain readable at 390px rail width
- all three route rows are scannable without horizontal clipping
- the primary route is clear without a colored side stripe
- preferences, activity, and inspection replace the route list
- map controls do not obscure important route geometry
- confirmation is required for save, share, and publish
- keyboard focus is visible everywhere
- reduced motion is honored
- 900px, 768px, and 390px layouts remain usable
- missing Mapbox token and WebGL failure have readable fallbacks
- no console errors occur during the three-minute demo path
- screenshots do not resemble a generic SaaS or AI dashboard
