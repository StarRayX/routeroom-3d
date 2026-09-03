# Handoff: start the RouteRoom Devpost submission (Codex Devpost plugin)

Use this prompt to drive the Devpost submission for the WebMCP Challenge with
the Devpost plugin. Do not submit anything final without explicit human
confirmation. Create a draft, fill it, then stop and ask.

## Read first

- `docs/SUBMISSION_STATUS.md` (blockers and order of work)
- `docs/DEVPOST_FIELDS.md` (paste-ready content for every form field)
- `docs/DEVPOST_SUBMISSION_DRAFT.md` (long-form background)

## Deadline gate

Devpost lists the deadline as Sep 3, 2026 at 1:00pm PDT. The current date is
later than that. Before doing any work, read the live challenge page and report
the exact submission state (open, closed, countdown value). If submissions are
closed, stop and tell the user; do not attempt a workaround.

## Prerequisites the submission cannot skip

These need the user's own accounts and cannot be faked. Confirm each is real
before filling the matching field. Do not invent a URL.

1. Live URL: the app deployed and reachable (Vercel recommended), with
   `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` set as a public `pk.` token restricted to
   the deploy domain. Open `/planner` and confirm it loads.
2. Public repo URL: `codex/visual-redesign` pushed to a public GitHub, GitLab,
   or Bitbucket repo with the MIT license visible.
3. Video: a public YouTube link, under three minutes, with audio.

If any of the three is missing, tell the user which ones, and do not fill those
fields with guesses.

## What to do

1. Confirm the deadline state (gate above).
2. Ask the user for the live URL, repo URL, and video link. Use them verbatim.
3. Open or create the RouteRoom draft submission in the WebMCP Challenge.
4. Fill each field from `docs/DEVPOST_FIELDS.md` exactly: project name,
   elevator pitch, the Markdown story, built-with tags, try-it-out links,
   video link, submitter type Individual, country Philippines, app status New,
   the live URL, the testing instructions, the repo URL, the "which agents did
   you test with" answer, the "which AI tools" answer, and the two learning
   dropdowns (let the user pick those two).
5. Upload the screenshots the user provides for the image gallery.
6. Save the draft. Do not click final submit.
7. Report back: every field you filled, anything left blank, and a one-line
   readiness check against the Devpost requirements (live URL, text, video,
   public repo with license). Then ask the user to review and confirm before
   final submission.

## Honesty rules for anything you type into the form

- Route data is a curated snapshot, not live directions. Do not imply live
  traffic or transit feeds.
- Mapbox is presentation only. RouteRoom's engine is the routing truth.
- Tool discovery in the ChatGPT/Codex browser is verified. An agent-driven
  tool call through the browser is not. Do not claim it.
- No em dashes. Plain language.
