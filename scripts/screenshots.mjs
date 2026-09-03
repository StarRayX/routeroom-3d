/**
 * Capture the RouteRoom submission screenshots from the live site using the
 * system Chrome. Each shot is set up by calling the site's own WebMCP tools
 * through window.__routeroomTools, so the captures show real tool-driven state.
 *
 * Run: node scripts/screenshots.mjs [baseUrl]
 * Default baseUrl: https://routeroom-3d.vercel.app
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2] || "https://routeroom-3d.vercel.app";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callTool(page, name, input = {}) {
  return page.evaluate(
    async ([n, i]) => {
      const t = (window.__routeroomTools || []).find((x) => x.name === n);
      if (!t) return { error: "tool_not_found" };
      try {
        return await t.execute(i);
      } catch (e) {
        return { error: String(e) };
      }
    },
    [name, input],
  );
}

async function clickByText(page, text) {
  return page.evaluate((t) => {
    const el = [...document.querySelectorAll("button, [role=button]")].find((b) => b.textContent && b.textContent.includes(t));
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, text);
}

async function shot(page, name) {
  const file = join(OUT, name);
  await page.screenshot({ path: file });
  console.log("saved", name);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-unsafe-swiftshader",
      "--hide-scrollbars",
      "--window-size=1500,1000",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 2 });

  // 1. Overview: default planner, Metro 52 primary, three route cards.
  await page.goto(`${BASE}/planner`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(3500);
  const toolCount = await page.evaluate(() => (window.__routeroomTools || []).length);
  console.log("tools registered on load:", toolCount);
  await shot(page, "01-overview.png");

  // 2. 3D Mapbox map.
  const opened = await clickByText(page, "Open 3D map");
  console.log("clicked Open 3D map:", opened);
  await sleep(9000);
  const mapbox = await page.evaluate(() => {
    const c = document.querySelector(".mapboxgl-canvas");
    return { present: !!c, w: c ? c.width : 0, h: c ? c.height : 0 };
  });
  console.log("mapbox canvas:", JSON.stringify(mapbox));
  await shot(page, "02-3d-map.png");

  // 3. Agent inspects a segment: focus it and open the segment drawer.
  await callTool(page, "show_route_on_scene", { route_id: "route_metro_52", display_mode: "primary" });
  await callTool(page, "inspect_route_segment", { route_id: "route_metro_52", segment_id: "seg_metro52_walk_to_entrance" });
  await sleep(2500);
  await shot(page, "03-segment-inspect.png");

  // 4. Human changes intent: cap walking, ranking flips to Tram 4.
  await callTool(page, "set_route_preferences", { walking_priority: "high", max_walking_meters: 250 });
  await sleep(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "04-walking-flip.png");

  // 5. Disruption on Tram 4, backup suggested.
  await callTool(page, "simulate_route_disruption", { route_id: "route_tram_4", segment_id: "seg_tram4_ride", delay_minutes: 15 });
  await sleep(2500);
  await shot(page, "05-disruption.png");

  // 6. Draft plan then attempt save: human confirmation sheet appears.
  const draft = await callTool(page, "create_draft_route_plan", { primary_route_id: "route_tram_4", backup_route_id: "route_metro_51" });
  const draftId = draft && (draft.draft_id || (draft.data && draft.data.id));
  if (draftId) await callTool(page, "save_route_plan", { draft_id: draftId });
  await sleep(2500);
  await shot(page, "06-confirmation.png");

  // 7. Tool console: all 22 WebMCP tools, the judge-facing evidence.
  await page.goto(`${BASE}/planner?debug=1`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(3000);
  await clickByText(page, "tool console");
  await clickByText(page, "Agent tool console");
  await sleep(1500);
  await shot(page, "07-tool-console.png");

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
