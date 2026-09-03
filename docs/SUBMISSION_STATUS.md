# RouteRoom 3D submission status

Last updated: 2026-09-04. Owner: Clarence Pagaduan.

## Deadline warning, read first

Devpost lists the WebMCP Challenge deadline as **Sep 3, 2026 at 1:00pm PDT**. This machine's clock reads 2026-09-04, which is after that time. The submission form is the authority: check the countdown and the submit button on the Devpost page before spending more effort. If it is closed, stop here.

## Where the code lives

- Newest integrated code is on branch `codex/visual-redesign` (map-first redesign merged with the Amsterdam Mapbox scene), checked out in the worktree at `C:/Users/StarX/Desktop/SCHOOL/profranks/.worktrees/routeroom-visual-redesign`.
- `main` has the pre-redesign integration.
- Deploy and submit from `codex/visual-redesign`.

## What is done

- Deterministic route engine, shared Zustand store, 22 WebMCP tools registered on the top-level planner page.
- Amsterdam Centraal to RAI demo pack from a one-time OpenStreetMap export, ODbL attribution, curated route options with freshness and confidence labels.
- Mapbox GL JS v3 Standard scene with an SVG fallback when the token or WebGL is missing.
- MIT license present and visible.
- Tool discovery verified in the ChatGPT/Codex in-app browser on 2026-09-04: all 22 tools listed on page load. See `docs/WEBMCP_TESTING.md`.
- Full submission text drafted: `docs/DEVPOST_FIELDS.md` (paste-ready) and `docs/DEVPOST_SUBMISSION_DRAFT.md` (long form).

## What blocks submission, in order

1. **Deploy a live URL.** Vercel is easiest. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (a public `pk.` token, URL-restricted to the deploy domain) as an environment variable. Steps in `docs/DEPLOYMENT.md`. Verify `/planner` loads, the Mapbox map and both attribution lines show, and the tools register.
2. **Push a public repository.** Create a public GitHub repo, `git remote add origin`, push `codex/visual-redesign`. Confirm the MIT license shows in the About box.
3. **Record the demo video.** Under three minutes, with audio, public on YouTube. Shot list is in `docs/DEMO_SCRIPT.md` and `docs/DEVPOST_FIELDS.md`. Only claim what you actually show. Tool discovery in the browser is verified; an agent-driven tool call through the browser is not, so either show it live or say plainly that the in-page tool console is the fallback.
4. **Capture screenshots.** Replace the placeholders named in `docs/screenshots/`.
5. **Paste the field content** from `docs/DEVPOST_FIELDS.md` into the Devpost form. Fill the live URL, repo URL, and video link once 1 to 3 are done.

## What I cannot do for you

I cannot deploy to your host, create a repo under your GitHub account, or record the video. Those need your accounts and your voice. Everything else is ready.

## Honesty guardrails for the submission

- Route times, fares, and reports are a curated snapshot, not live directions. Say so.
- Mapbox is presentation only. RouteRoom's engine is the routing truth.
- Do not claim an agent invoked a tool through a WebMCP browser until you have seen it change the page.
