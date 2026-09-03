# Deployment

RouteRoom 3D is a standard Next.js 15 App Router project with no database and
no required environment variables. Any host that runs Next.js works.

## Vercel (recommended)

1. Push the repository to GitHub (or GitLab/Bitbucket).
2. In the Vercel dashboard, choose **Add New Project** and import the repo.
3. Vercel auto-detects Next.js. Leave the build command (`next build`) and
   output settings on their defaults.
4. No environment variables are needed. Skip that step.
5. Deploy. Vercel gives you a `*.vercel.app` URL, which is what you submit
   as the public live URL.

Every push to the default branch redeploys automatically. Pull requests get
their own preview URL, which is useful for testing a city-pack change before
merging.

## Netlify

1. Import the repository as a new site.
2. Framework preset: Next.js. Netlify's Next.js runtime handles the App
   Router automatically; leave the build command as `next build`.
3. No environment variables are needed.
4. Deploy and use the generated `*.netlify.app` URL.

## Cloudflare Pages

1. Create a new Pages project from the repository.
2. Framework preset: Next.js. Cloudflare's build image installs
   dependencies and runs `next build` for you.
3. No environment variables are needed.
4. Deploy and use the generated `*.pages.dev` URL.

If the Cloudflare adapter in use does not support a feature this project
relies on (for example a specific Node API), Vercel is the safer default
for the submission deadline.

## Post-deploy checklist

- [ ] Open the deployed URL directly at `/planner` and confirm the 3D scene
      loads (or the list fallback, if WebGL is unavailable).
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
      load.
- [ ] Copy the final URL into the README and the demo video description.
