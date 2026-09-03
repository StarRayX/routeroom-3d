# Claude UI continuation prompt

Use the following prompt when handing RouteRoom’s frontend to Claude Code.

---

Continue implementing RouteRoom’s frontend from the current repository state.

Before editing any frontend code, install and load the Uncodixfy skill from:

`https://github.com/cyxzdev/Uncodixfy`

Preferred installation command:

`npx skills add cyxzdev/Uncodixfy`

If that command is unavailable, install the repository’s skill files into your user-level Claude skills directory using the documented Claude Code skill format. Do not create a duplicate project-level skill if a working user-level installation already exists.

Then read the complete Uncodixfy `SKILL.md`. Explicitly state that the skill is loaded before making UI changes.

Next, read these project documents completely:

1. `docs/UI_DESIGN.md` — authoritative UI specification
2. `PRODUCT.md` — product intent and register
3. `DESIGN.md` — supporting design tokens and earlier rationale
4. `CONTEXT.md` — domain language

Treat `docs/UI_DESIGN.md` as the source of truth when it conflicts with older visual guidance.

## Objective

Finish and polish the RouteRoom planner as a professional map-first application for human-agent route decisions. Preserve the current full-viewport structure: a 56px toolbar, a 390px structural route rail, and a map filling the remaining workspace.

This is not a dashboard redesign exercise. Do not add cards, hero sections, floating shells, AI chat, decorative metrics, extra navigation, or marketing copy.

## Hard design constraints

- Apply every applicable Uncodixfy rule.
- No uppercase eyebrow labels.
- No nested rounded cards.
- No decorative pills or badge overload.
- No gradients, glass, blur, glow, or oversized shadows.
- No transform hover animations.
- No 20–32px radii.
- No colored side stripe on the selected route.
- No long desktop page scroll.
- No generic AI assistant panel.
- Use Reicon for UI icons.
- Use GSAP only for short, purposeful state transitions.
- Respect `prefers-reduced-motion`.
- Preserve WCAG 2.2 AA and keyboard behavior.

## Product behavior to preserve

- Humans and WebMCP agents manipulate the same visible route and map state.
- Preferences can rerank routes visibly.
- Why, Segments, Stress test, and Reports replace the route list in the existing left rail.
- Activity is chronological evidence, not chat.
- Saving, sharing, report publishing, and moderation remain human-confirmation-gated.
- Mapbox is the presentation layer; RouteRoom’s curated trip data remains routing truth.
- Maintain the existing public component contracts so the Mapbox work can merge independently.

## First actions

1. Inspect the current Git status and preserve unrelated work.
2. Run the app and capture the current planner at desktop width.
3. Compare it line-by-line with `docs/UI_DESIGN.md` and the Uncodixfy prohibitions.
4. Fix functional layout defects before decorative polish.
5. Verify every sidebar mode and the confirmation workflow.
6. Test desktop, tablet, and mobile layouts.

## Priority order

1. Prevent clipping and overflow in the trip editor, route rows, and plan dock.
2. Reduce visual density in the expanded primary route without hiding essential comparison data.
3. Restrict persistent map labels to decision-relevant locations.
4. Ensure sidebar modes replace content cleanly and return predictably.
5. Polish Mapbox integration without changing the overall application shell.
6. Tighten keyboard, focus, reduced-motion, loading, empty, and error states.

## Validation

Before finishing, run:

- TypeScript checking
- ESLint
- relevant tests
- production build

Visually verify at approximately:

- 1440×900
- 1024×768
- 390×844

Report:

- files changed
- screenshots or a live preview URL
- checks executed and their results
- remaining compromises
- any conflict with parallel Mapbox work

Do not stop after producing a plan. Make the changes, inspect the running UI, and iterate until the interface visibly satisfies `docs/UI_DESIGN.md`.

---
