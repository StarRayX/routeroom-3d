import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2] || "https://routeroom-3d.vercel.app";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--window-size=1500,1000"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 2 });

// 03: segment inspector drawer via the toolbar "Segments" button, over the 3D map.
await page.goto(`${BASE}/planner`, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(3000);
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Open 3D map/i.test(x.textContent)); if (b) b.click(); });
await sleep(8000);
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Segments"); if (b) b.click(); });
await sleep(2500);
await page.screenshot({ path: join(OUT, "03-segment-inspect.png") });
console.log("saved 03");

// 07: the agent tool console expanded, all 22 tools grouped by trust.
await page.goto(`${BASE}/planner?debug=1`, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(3000);
await page.evaluate(() => {
  document.querySelectorAll("details").forEach((d) => (d.open = true));
  const s = [...document.querySelectorAll("summary")].find((x) => /tool console/i.test(x.textContent));
  if (s) s.scrollIntoView({ block: "start" });
});
await sleep(1500);
await page.screenshot({ path: join(OUT, "07-tool-console.png"), fullPage: true });
console.log("saved 07");

await browser.close();
console.log("done");
