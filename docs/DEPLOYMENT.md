# Deployment

RouteRoom 3D is a standard Next.js 15 App Router project with no database.
Any host that runs Next.js works. It needs one environment variable,
`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, for the Mapbox GL JS v3 / Mapbox Standard
visual provider (see [ADR 0007](./adr/0007-mapbox-standard-visual-provider.md)).
Without it, or with an invalid token, the deployed planner still works; it
falls back to the SVG map with a short notice.

Each city pack's route and landmark overlay data (`routes.geojson` and
`points.geojson`, described in
[ADR 0005](./adr/0005-city-packs-carry-real-geometry.md) and
[ADR 0007](./adr/0007-mapbox-standard-visual-provider.md)) ships inside the
build as static data; a small `geometry.json` remains for reference data
that isn't part of the route overlays. The basemap itself, streets,
buildings, terrain, is fetched live from Mapbox at runtime, so a deployed
page does make network requests to Mapbox's style and tile endpoints; it
still makes no request to a geocoding, routing, search, or navigation API.
Because the overlay data is OpenStreetMap-derived, the ODbL attribution
string and export date that the pack carries must stay visible on the
deployed page, alongside Mapbox's own attribution control, not just in the
README. Do not ship a build that hides or removes either attribution line.

## Vercel (recommended)

1. Push the repository to GitHub (or GitLab/Bitbucket).
2. In the Vercel dashboard, choose **Add New Project** and import the repo.
3. Vercel auto-detects Next.js. Leave the build command (`next build`) and
   output settings on their defaults.
4. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` as an environment variable for both
   the **Production** and **Preview** environments, set to a public `pk.`
   Mapbox token. In the Mapbox account dashboard, restrict that token by URL
   to your deployed domain(s), including the `*.vercel.app` preview domain
   pattern if you want previews to show the map too.
5. Deploy. Vercel gives you a `*.vercel.app` URL, which is what you submit
   as the public live URL.

Every push to the default branch redeploys automatically. Pull requests get
their own preview URL, which is useful for testing a city-pack change before
merging.

## Netlify

1. Import the repository as a new site.
2. Framework preset: Next.js. Netlify's Next.js runtime handles the App
   Router automatically; leave the build command as `next build`.
3. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` as a site environment variable, set
   to a public `pk.` Mapbox token restricted by URL to your `*.netlify.app`
   domain.
4. Deploy and use the generated `*.netlify.app` URL.

## Cloudflare Pages

1. Create a new Pages project from the repository.
2. Framework preset: Next.js. Cloudflare's build image installs
   dependencies and runs `next build` for you.
3. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` as an environment variable, set to
   a public `pk.` Mapbox token restricted by URL to your `*.pages.dev`
   domain.
4. Deploy and use the generated `*.pages.dev` URL.

If the Cloudflare adapter in use does not support a feature this project
relies on (for example a specific Node API), Vercel is the safer default
for the submission deadline.

## Post-deploy checklist

- [ ] Open the deployed URL directly at `/planner` and confirm the Mapbox
      map loads in Standard style with 3D buildings (or the SVG fallback,
      if the token is missing/invalid or WebGL is unavailable).
- [ ] Confirm the Mapbox attribution control (`© Mapbox © OpenStreetMap`)
      and RouteRoom's own ODbL attribution line and export date are both
      visible on the deployed page, not only in the README.
- [ ] Confirm `npm run build` succeeded with no type errors in the deploy
      logs.
- [ ] Open the in-page Agent tool console and run a read-only tool (for
      example `get_trip_context`) to confirm the tool layer is registered
      on the deployed build, not just in local dev.
- [ ] Try a WebMCP-compatible browser against the deployed URL (see
      `docs/WEBMCP_TESTING.md`), not just `localhost`. Some registration
      issues only show up over HTTPS on a real domain.
- [ ] Confirm the confirmation panel actually blocks `save_route_plan` until
      a human clicks Confirm, on the deployed build.
- [ ] Check the browser console on the deployed page for errors on first
      load, including any Mapbox token or style-load errors.
- [ ] Confirm the browser makes no network request to a routing, geocoding,
      search, or navigation provider; the Network tab should show only the
      app's own bundle and assets, plus Mapbox's style and tile requests.
- [ ] Copy the final URL into the README and the demo video description.

## Mapbox free-tier monitoring

Style and tile loads for a demo stay well inside Mapbox's free monthly
allowance. Even so, check the usage numbers in the Mapbox account dashboard
before and after a public demo or judging period, especially if the URL is
shared widely. If the free tier is ever exceeded, Mapbox requests fail and
the app falls back to the SVG map automatically; nothing in the product
breaks, but the 3D view stops appearing until usage resets or billing is
enabled.
