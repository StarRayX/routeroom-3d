#!/usr/bin/env node
/**
 * One-time OpenStreetMap importer for the Amsterdam Centraal to RAI city
 * pack (ADR 0005, ADR 0006). Queries OpenStreetMap, simplifies geometry, and
 * writes:
 *   src/lib/city-packs/amsterdam/geometry.json
 *   src/lib/city-packs/amsterdam/routes-geometry.json
 *
 * Data source: Overpass (https://overpass-api.de/api/interpreter) is tried
 * first, since it can filter by tag server-side in a handful of requests.
 * If Overpass is unreachable (it was blocked/unreachable from this
 * project's network during development -- see ATTRIBUTION.md), the script
 * automatically falls back to the standard OpenStreetMap API
 * (api.openstreetmap.org/api/0.6/map), tiling the bounding box to stay under
 * its per-request node limit and filtering by tag locally. Both paths
 * produce the same output shape and the geometry source notes record which
 * one actually ran.
 *
 * Reproducible: raw responses are cached under scripts/.cache/ (gitignored),
 * so reruns without --refresh do not hit the network again.
 *
 * Usage: node scripts/import-osm.mjs [--refresh]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, ".cache");
const OUT_DIR = path.join(__dirname, "..", "src", "lib", "city-packs", "amsterdam");
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OSM_API_BASE = "https://api.openstreetmap.org/api/0.6";
const REFRESH = process.argv.includes("--refresh");
const USER_AGENT = "routeroom-3d-import/1.0 (city-pack import script)";

const BBOX = { south: 52.335, west: 4.87, north: 52.385, east: 4.925 };
const CENTER = [4.8945, 52.36]; // [lng, lat], roughly the corridor midpoint
const M_PER_DEG_LAT = 111_320;
const cosCenterLat = Math.cos((CENTER[1] * Math.PI) / 180);
const mPerDegLng = M_PER_DEG_LAT * cosCenterLat;

const DETAIL_ZONES = [
  { id: "centraal", name: "Amsterdam Centraal", center: [4.9003, 52.3791], radiusMeters: 320, reason: "origin" },
  { id: "europaplein", name: "Europaplein", center: [4.8905, 52.3417], radiusMeters: 300, reason: "station" },
  { id: "station_rai", name: "Station RAI", center: [4.8895, 52.3379], radiusMeters: 300, reason: "station" },
  { id: "rai_entrance", name: "RAI main entrance", center: [4.8896, 52.3411], radiusMeters: 250, reason: "entrance" },
  { id: "rai_destination", name: "RAI convention centre", center: [4.888, 52.341], radiusMeters: 300, reason: "destination" },
];

// Stations used to clip the transit polylines (lng, lat).
const ROUTE_STOPS = {
  metro_52: { fromName: "Amsterdam Centraal Station", from: [4.9003, 52.3791], toName: "Europaplein", to: [4.8905, 52.3417] },
  metro_51: { fromName: "Amsterdam Centraal Station", from: [4.9003, 52.3791], toName: "Station RAI", to: [4.8895, 52.3379] },
  tram_4: { fromName: "Centraal tram stop", from: [4.899, 52.3788], toName: "Amsterdam Station RAI (Drentepark)", to: [4.8889, 52.3399] },
};
const ROUTE_LINE_NAMES = { metro_52: "Metro 52", metro_51: "Metro 51", tram_4: "Tram 4" };

// ---------------------------------------------------------------------------
// Geometry helpers (deliberately duplicated from src/lib/geo.ts's approach --
// this script is plain Node with no project imports).
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg) => (deg * Math.PI) / 180;

function distanceMeters(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** [lng, lat] -> local meters (x east, y north) around CENTER. */
function toLocalXY([lng, lat]) {
  return [(lng - CENTER[0]) * mPerDegLng, (lat - CENTER[1]) * M_PER_DEG_LAT];
}

function withinRadius(point, center, radiusMeters) {
  return distanceMeters(point, center) <= radiusMeters;
}

function nearestZone(point) {
  for (const zone of DETAIL_ZONES) {
    if (withinRadius(point, zone.center, zone.radiusMeters)) return zone;
  }
  return undefined;
}

function centroidOf(ring) {
  return ring.reduce((acc, p) => [acc[0] + p[0] / ring.length, acc[1] + p[1] / ring.length], [0, 0]);
}

/** Ramer-Douglas-Peucker on [lng,lat] points, tolerance in meters. */
function simplify(points, toleranceMeters) {
  if (points.length < 3) return points;
  const local = points.map(toLocalXY);
  const keep = new Array(local.length).fill(false);
  keep[0] = true;
  keep[local.length - 1] = true;

  function perpDist(p, a, b) {
    const [px, py] = p;
    const [ax, ay] = a;
    const [bx, by] = b;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  function recurse(startIndex, endIndex) {
    if (endIndex <= startIndex + 1) return;
    let maxDist = -1;
    let maxIndex = -1;
    for (let i = startIndex + 1; i < endIndex; i += 1) {
      const d = perpDist(local[i], local[startIndex], local[endIndex]);
      if (d > maxDist) {
        maxDist = d;
        maxIndex = i;
      }
    }
    if (maxDist > toleranceMeters) {
      keep[maxIndex] = true;
      recurse(startIndex, maxIndex);
      recurse(maxIndex, endIndex);
    }
  }

  recurse(0, local.length - 1);
  return points.filter((_, i) => keep[i]);
}

/** Shoelace area in square meters of a [lng,lat] ring. */
function ringAreaSqMeters(ring) {
  const local = ring.map(toLocalXY);
  let sum = 0;
  for (let i = 0; i < local.length; i += 1) {
    const [x1, y1] = local[i];
    const [x2, y2] = local[(i + 1) % local.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function roundRing(ring) {
  return ring.map(([lng, lat]) => [round6(lng), round6(lat)]);
}

function closeRing(ring) {
  if (ring.length < 3) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
}

function heightFromTags(tags, defaultMeters) {
  if (!tags) return defaultMeters;
  const height = tags.height ? parseFloat(String(tags.height).replace(/[^0-9.]/g, "")) : undefined;
  if (height && Number.isFinite(height) && height > 0) return Math.round(height * 10) / 10;
  const levels = tags["building:levels"] ? parseFloat(String(tags["building:levels"]).replace(/[^0-9.]/g, "")) : undefined;
  if (levels && Number.isFinite(levels) && levels > 0) return Math.round(levels * 3.2 * 10) / 10;
  return defaultMeters;
}

function median(values) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Overpass fetch with cache + one retry (preferred path when reachable)
// ---------------------------------------------------------------------------

async function overpassAvailable() {
  try {
    const res = await fetch(`${OVERPASS_URL.replace("/interpreter", "")}/status`, {
      headers: { Accept: "*/*", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function overpassQuery(cacheKey, query) {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  if (!REFRESH && fs.existsSync(cachePath)) {
    console.log(`[cache] ${cacheKey}`);
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }

  const attempt = async () => {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Accept: "*/*", "User-Agent": USER_AGENT, Connection: "close" },
      body: query,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Overpass HTTP ${res.status} for ${cacheKey}: ${text.slice(0, 500)}`);
    }
    return res.json();
  };

  console.log(`[fetch] ${cacheKey}`);
  const data = await attempt();
  await new Promise((resolve) => setTimeout(resolve, 4000)); // be polite between requests
  fs.writeFileSync(cachePath, JSON.stringify(data));
  return data;
}

const bboxStr = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;

const detailZoneBuildingsQuery = `[out:json][timeout:180];
(
${DETAIL_ZONES.map((z) => `  way["building"](around:${z.radiusMeters + 30},${z.center[1]},${z.center[0]});`).join("\n")}
);
out geom;`;

const gridBuildingsQuery = `[out:json][timeout:180];
way["building"](${bboxStr});
out bb tags;`;

const waterParkQuery = `[out:json][timeout:180];
(
  way["natural"="water"](${bboxStr});
  way["waterway"~"^(canal|river)$"](${bboxStr});
  way["leisure"="park"](${bboxStr});
);
out geom;`;

const roadsQuery = `[out:json][timeout:180];
way["highway"~"^(primary|secondary|tertiary|primary_link|secondary_link)$"](${bboxStr});
out geom;`;

const routeQueries = {
  metro_52: `[out:json][timeout:180];\nrelation["route"="subway"]["ref"="52"];\nout geom;`,
  metro_51: `[out:json][timeout:180];\nrelation["route"="subway"]["ref"="51"];\nout geom;`,
  tram_4: `[out:json][timeout:180];\nrelation["route"="tram"]["ref"="4"];\nout geom;`,
};

/** Not part of CityGeometry -- real station/stop/entrance nodes near the RAI
 * so amsterdam.ts's hand-authored landmarks can cite real OSM coordinates. */
const landmarksQuery = `[out:json][timeout:120];
(
  node["railway"="station"](around:700,52.3398,4.8900);
  node["station"="subway"](around:700,52.3398,4.8900);
  node["railway"="tram_stop"](around:700,52.3398,4.8900);
  node["entrance"](around:400,52.3411,4.8896);
  node["railway"="station"](around:300,52.3791,4.9003);
  node["railway"="tram_stop"](around:300,52.3791,4.9003);
  node["railway"="subway_entrance"](around:300,52.3791,4.9003);
);
out body;`;

function wayRingFromOverpassGeom(way) {
  if (!way.geometry) return undefined;
  const ring = way.geometry.filter(Boolean).map((pt) => [pt.lon, pt.lat]);
  if (ring.length < 3) return undefined;
  return closeRing(ring);
}

function wayPointsFromOverpassGeom(way) {
  return (way.geometry ?? []).filter(Boolean).map((p) => [p.lon, p.lat]);
}

async function fetchAllViaOverpass() {
  const detailBuildingsRaw = await overpassQuery("detail-zone-buildings", detailZoneBuildingsQuery);
  const gridBuildingsRaw = await overpassQuery("grid-buildings", gridBuildingsQuery);
  const waterParkRaw = await overpassQuery("water-parks", waterParkQuery);
  const roadsRaw = await overpassQuery("roads", roadsQuery);

  const detailBuildings = (detailBuildingsRaw.elements ?? [])
    .filter((el) => el.type === "way")
    .map((way) => ({ id: way.id, tags: way.tags, ring: wayRingFromOverpassGeom(way) }))
    .filter((b) => b.ring);

  const gridBuildings = (gridBuildingsRaw.elements ?? [])
    .filter((el) => el.type === "way" && el.bounds)
    .map((way) => ({ id: way.id, tags: way.tags, bounds: way.bounds }));

  const waterParkWays = (waterParkRaw.elements ?? [])
    .filter((el) => el.type === "way")
    .map((el) => ({ id: el.id, tags: el.tags, points: wayPointsFromOverpassGeom(el) }))
    .filter((w) => w.points.length >= 2);

  const roadWays = (roadsRaw.elements ?? [])
    .filter((el) => el.type === "way")
    .map((el) => ({ id: el.id, tags: el.tags, points: wayPointsFromOverpassGeom(el) }))
    .filter((w) => w.points.length >= 2);

  const routeChains = {};
  const routeNotes = [];
  for (const [key, query] of Object.entries(routeQueries)) {
    const raw = await overpassQuery(`route-${key}`, query);
    const relation = (raw.elements ?? []).find((el) => el.type === "relation");
    if (!relation) {
      routeNotes.push(`Route relation for ${key} was not found by Overpass; route geometry is missing.`);
      routeChains[key] = { chain: [], ordered: false, relationRef: undefined, operator: "GVB" };
      continue;
    }
    const ways = (relation.members ?? [])
      .filter((m) => m.type === "way" && m.geometry && m.geometry.length > 1)
      .map((m) => ({ points: m.geometry.filter(Boolean).map((p) => [p.lon, p.lat]) }));
    const { chain, ordered } = chainWays(ways);
    if (!ordered) routeNotes.push(`Route ${ROUTE_LINE_NAMES[key]}: member ways did not chain cleanly end-to-end; fell back to axis-distance ordering.`);
    routeChains[key] = { chain, ordered, relationRef: relation.tags?.ref, operator: relation.tags?.operator ?? "GVB" };
  }

  let landmarkCandidates = [];
  try {
    const landmarksRaw = await overpassQuery("landmarks", landmarksQuery);
    landmarkCandidates = (landmarksRaw.elements ?? [])
      .filter((el) => el.type === "node")
      .map((el) => ({ osmId: `node/${el.id}`, lon: el.lon, lat: el.lat, tags: el.tags ?? {} }));
  } catch (err) {
    console.warn(`landmarks query failed (non-fatal): ${err.message}`);
  }

  return { detailBuildings, gridBuildings, waterParkWays, roadWays, routeChains, routeNotes, landmarkCandidates, sourceLabel: "overpass" };
}

// ---------------------------------------------------------------------------
// OpenStreetMap API fallback: tile the bbox, filter by tag locally.
// Used automatically when Overpass is unreachable.
// ---------------------------------------------------------------------------

const TILE_W_DEG = 0.008;
const TILE_H_DEG = 0.007;
const ROAD_HIGHWAYS = new Set(["primary", "secondary", "tertiary", "primary_link", "secondary_link"]);

function buildTiles() {
  const tiles = [];
  for (let south = BBOX.south; south < BBOX.north - 1e-9; south += TILE_H_DEG) {
    const north = Math.min(south + TILE_H_DEG, BBOX.north);
    for (let west = BBOX.west; west < BBOX.east - 1e-9; west += TILE_W_DEG) {
      const east = Math.min(west + TILE_W_DEG, BBOX.east);
      tiles.push({ west, south, east, north });
    }
  }
  return tiles;
}

/** Fetches one OSM API /map tile, splitting into quadrants on the "too many nodes" 400. */
async function fetchOsmMapTile(tile, depth = 0) {
  ensureCacheDir();
  const key = `osm-tile-${tile.west.toFixed(5)}_${tile.south.toFixed(5)}_${tile.east.toFixed(5)}_${tile.north.toFixed(5)}`;
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  if (!REFRESH && fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf8"));

  const url = `${OSM_API_BASE}/map.json?bbox=${tile.west},${tile.south},${tile.east},${tile.north}`;
  const attempt = () => fetch(url, { headers: { Accept: "*/*", "User-Agent": USER_AGENT } });

  let res;
  try {
    res = await attempt();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    res = await attempt();
  }

  if (res.status === 400 && depth < 3) {
    // Too many nodes in this tile -- split into 4 quadrants and recurse.
    const midLng = (tile.west + tile.east) / 2;
    const midLat = (tile.south + tile.north) / 2;
    const quads = [
      { west: tile.west, south: tile.south, east: midLng, north: midLat },
      { west: midLng, south: tile.south, east: tile.east, north: midLat },
      { west: tile.west, south: midLat, east: midLng, north: tile.north },
      { west: midLng, south: midLat, east: tile.east, north: tile.north },
    ];
    let combined = [];
    for (const q of quads) combined = combined.concat(await fetchOsmMapTile(q, depth + 1));
    fs.writeFileSync(cachePath, JSON.stringify(combined));
    return combined;
  }
  if (!res.ok) {
    console.warn(`  tile ${key} failed: HTTP ${res.status}`);
    fs.writeFileSync(cachePath, JSON.stringify([]));
    return [];
  }
  const data = await res.json();
  fs.writeFileSync(cachePath, JSON.stringify(data.elements));
  return data.elements;
}

async function fetchAllViaOsmApiTiles() {
  const tiles = buildTiles();
  console.log(`[osm-api-fallback] Overpass is unreachable; fetching ${tiles.length} tiles from ${OSM_API_BASE}/map.json instead.`);

  const seenWayIds = new Set();
  const detailBuildings = [];
  const gridBuildings = [];
  const waterParkWays = [];
  const roadWays = [];
  const subwayWays = [];
  const tramWays = [];
  const stationNodes = [];

  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    let elements;
    try {
      elements = await fetchOsmMapTile(tile);
    } catch (err) {
      console.warn(`  tile ${i + 1}/${tiles.length} error: ${err.message}`);
      continue;
    }

    const nodeMap = new Map();
    for (const el of elements) {
      if (el.type !== "node") continue;
      nodeMap.set(el.id, [el.lon, el.lat]);
      if (el.tags && (el.tags.railway === "station" || el.tags.railway === "tram_stop" || el.tags.station === "subway" || el.tags.entrance)) {
        stationNodes.push({ osmId: `node/${el.id}`, lon: el.lon, lat: el.lat, tags: el.tags });
      }
    }

    for (const el of elements) {
      if (el.type !== "way" || seenWayIds.has(el.id)) continue;
      const tags = el.tags ?? {};
      const isBuilding = Boolean(tags.building);
      const isWater = tags.natural === "water" || tags.waterway === "canal" || tags.waterway === "river";
      const isPark = tags.leisure === "park";
      const isRoad = ROAD_HIGHWAYS.has(tags.highway);
      const isSubway = tags.railway === "subway";
      const isTram = tags.railway === "tram";
      if (!isBuilding && !isWater && !isPark && !isRoad && !isSubway && !isTram) continue;

      const coords = (el.nodes ?? []).map((id) => nodeMap.get(id)).filter(Boolean);
      if (coords.length < 2) continue;
      seenWayIds.add(el.id);

      if (isBuilding) {
        if (coords.length < 3) continue;
        const ring = closeRing(coords);
        const zone = nearestZone(centroidOf(ring));
        if (zone) detailBuildings.push({ id: el.id, tags, ring });
        else gridBuildings.push({ id: el.id, tags, ring });
      } else if (isWater || isPark) {
        waterParkWays.push({ id: el.id, tags, points: coords });
      } else if (isRoad) {
        roadWays.push({ id: el.id, tags, points: coords });
      } else if (isSubway) {
        subwayWays.push({ points: coords });
      } else if (isTram) {
        tramWays.push({ points: coords });
      }
    }

    if ((i + 1) % 10 === 0 || i === tiles.length - 1) {
      console.log(`  ...tile ${i + 1}/${tiles.length} (buildings so far: ${detailBuildings.length + gridBuildings.length})`);
    }
  }

  // Physical railway=subway / railway=tram ways form a branching network
  // (several numbered lines share track), not one chainable line, and there
  // is no relation data to isolate "line 52" from "line 50" without
  // Overpass. So each route gets its own real shortest path across the
  // shared way graph between its two stops, instead of one naive chain.
  const routeNotes = [
    "Rail geometry built from railway=subway / railway=tram ways (OSM API fallback), not from the numbered route relations, because Overpass (which resolves relation membership) was unreachable. For each route, the path is the shortest path across the graph of nearby subway/tram ways between its two stops (Dijkstra), since the physical tracks are a shared branching network and the numbered-line relations could not be resolved.",
  ];
  const routeChains = {};
  for (const key of Object.keys(ROUTE_STOPS)) {
    const pool = key === "tram_4" ? tramWays : subwayWays;
    const { from, to } = ROUTE_STOPS[key];
    const { path, ok } = shortestPathAlongWays(pool, from, to);
    if (!ok) routeNotes.push(`${ROUTE_LINE_NAMES[key]}: no connected path found across the fetched ${key === "tram_4" ? "tram" : "subway"} ways between its stops; used a straight line instead.`);
    routeChains[key] = { chain: path, ordered: ok, relationRef: key === "metro_52" ? "52" : key === "metro_51" ? "51" : "4", operator: "GVB" };
  }

  return {
    detailBuildings,
    gridBuildings,
    waterParkWays,
    roadWays,
    routeChains,
    routeNotes,
    landmarkCandidates: stationNodes,
    sourceLabel: "osm-api-tiles",
  };
}

// ---------------------------------------------------------------------------
// Building processing (shared by both fetch paths)
// ---------------------------------------------------------------------------

/**
 * Real central-Amsterdam building density (dense historic parcels, ~1600
 * ways/km^2 near the RAI per the task brief) puts well over a thousand
 * buildings inside the 5 detail zones combined, blowing past the 400-900
 * total feature budget on its own. Keeping every footprint above 35 m^2
 * would render more detail than the corridor scene can use, so within each
 * zone we additionally keep only the MAX_BUILDINGS_PER_ZONE largest
 * footprints (by real area) -- the most visually significant blocks -- and
 * drop the rest. This is a documented approximation (see ATTRIBUTION.md),
 * not a change to the 35 m^2 rule itself.
 */
const MAX_BUILDINGS_PER_ZONE = 70;

function processDetailZoneBuildings(buildings) {
  const byZone = new Map(); // zoneId -> [{id, tags, ring, area}]
  let droppedSmall = 0;

  for (const b of buildings) {
    const area = ringAreaSqMeters(b.ring);
    if (area < 35) {
      droppedSmall += 1;
      continue;
    }
    const zone = nearestZone(centroidOf(b.ring));
    if (!zone) continue;
    if (!byZone.has(zone.id)) byZone.set(zone.id, []);
    byZone.get(zone.id).push({ ...b, area, zoneId: zone.id });
  }

  const features = [];
  let droppedOverCap = 0;
  for (const [, list] of byZone) {
    list.sort((a, b2) => b2.area - a.area);
    const kept = list.slice(0, MAX_BUILDINGS_PER_ZONE);
    droppedOverCap += Math.max(0, list.length - kept.length);
    for (const b of kept) {
      const simplified = simplify(b.ring, 1.5);
      features.push({
        id: `b_${b.id}`,
        kind: "building",
        coordinates: roundRing(simplified),
        heightMeters: heightFromTags(b.tags, 11),
        name: b.tags?.name,
        detailZoneId: b.zoneId,
      });
    }
  }
  return { features, dropped: droppedSmall, droppedOverCap };
}

/** Buildings outside every detail zone, merged into a coverage grid. */
function processMergedBlocks(buildings) {
  // 110 m was the initial target; real building coverage across the whole
  // corridor produced far more active cells than the 400-900 feature
  // budget allows, so the grid resolution is reduced to 170 m (permitted:
  // "reduce merged-block resolution ... if needed").
  const cellSizeM = 170;
  const cellWidthDeg = cellSizeM / mPerDegLng;
  const cellHeightDeg = cellSizeM / M_PER_DEG_LAT;
  const cols = Math.ceil((BBOX.east - BBOX.west) / cellWidthDeg);
  const rows = Math.ceil((BBOX.north - BBOX.south) / cellHeightDeg);

  const cells = new Map(); // key `${row},${col}` -> { area, heights: [] }
  let counted = 0;
  let skippedInZone = 0;

  for (const b of buildings) {
    let centroid;
    let area;
    if (b.ring) {
      centroid = centroidOf(b.ring);
      area = ringAreaSqMeters(b.ring);
    } else if (b.bounds) {
      const { minlat, minlon, maxlat, maxlon } = b.bounds;
      centroid = [(minlon + maxlon) / 2, (minlat + maxlat) / 2];
      const widthM = (maxlon - minlon) * mPerDegLng;
      const heightM = (maxlat - minlat) * M_PER_DEG_LAT;
      // Bounding-box area over-estimates a real footprint; shrink it toward a
      // typical footprint-to-bbox ratio (documented in ATTRIBUTION.md).
      area = widthM * heightM * 0.78;
    } else {
      continue;
    }
    if (nearestZone(centroid)) {
      skippedInZone += 1;
      continue;
    }
    if (centroid[0] < BBOX.west || centroid[0] > BBOX.east || centroid[1] < BBOX.south || centroid[1] > BBOX.north) continue;

    const col = Math.min(cols - 1, Math.max(0, Math.floor((centroid[0] - BBOX.west) / cellWidthDeg)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor((centroid[1] - BBOX.south) / cellHeightDeg)));
    const key = `${row},${col}`;
    if (!cells.has(key)) cells.set(key, { area: 0, heights: [] });
    const cell = cells.get(key);
    cell.area += area;
    const h = heightFromTags(b.tags, undefined);
    if (h) cell.heights.push(h);
    counted += 1;
  }

  const cellAreaM2 = cellSizeM * cellSizeM;
  const shrinkM = 10;
  const shrinkLng = shrinkM / mPerDegLng;
  const shrinkLat = shrinkM / M_PER_DEG_LAT;

  const active = new Map(); // key -> { row, col, coverage, height }
  for (const [key, cell] of cells) {
    const coverage = cell.area / cellAreaM2;
    if (coverage < 0.18) continue;
    const [row, col] = key.split(",").map(Number);
    active.set(key, { row, col, coverage, height: median(cell.heights) ?? 12 });
  }

  function cellRect(row, col) {
    const west = BBOX.west + col * cellWidthDeg + shrinkLng;
    const east = BBOX.west + (col + 1) * cellWidthDeg - shrinkLng;
    const south = BBOX.south + row * cellHeightDeg + shrinkLat;
    const north = BBOX.south + (row + 1) * cellHeightDeg - shrinkLat;
    return [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ];
  }

  // Merge horizontally-adjacent cells in the same row with similar height.
  const features = [];
  const rowsUsed = new Map(); // row -> cols[]
  for (const { row, col } of active.values()) {
    if (!rowsUsed.has(row)) rowsUsed.set(row, []);
    rowsUsed.get(row).push(col);
  }
  let mergedCount = 0;
  for (const [row, colsInRow] of rowsUsed) {
    const sortedCols = [...colsInRow].sort((a, b) => a - b);
    let runStart = sortedCols[0];
    let runHeights = [active.get(`${row},${runStart}`).height];
    let prevCol = runStart;

    const flush = (endCol) => {
      const avgHeight = runHeights.reduce((s, h) => s + h, 0) / runHeights.length;
      const startRect = cellRect(row, runStart);
      const endRect = cellRect(row, endCol);
      const west = startRect[0][0];
      const east = endRect[1][0];
      const south = startRect[0][1];
      const north = startRect[2][1];
      features.push({
        id: `mb_${row}_${runStart}_${endCol}`,
        kind: "merged_block",
        coordinates: roundRing([
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ]),
        heightMeters: Math.round(avgHeight * 10) / 10,
      });
      mergedCount += 1;
    };

    for (let i = 1; i < sortedCols.length; i += 1) {
      const col = sortedCols[i];
      const entry = active.get(`${row},${col}`);
      const runAvg = runHeights.reduce((s, h) => s + h, 0) / runHeights.length;
      const similar = col === prevCol + 1 && Math.abs(entry.height - runAvg) <= Math.max(2, runAvg * 0.2);
      if (similar) {
        runHeights.push(entry.height);
        prevCol = col;
      } else {
        flush(prevCol);
        runStart = col;
        runHeights = [entry.height];
        prevCol = col;
      }
    }
    flush(prevCol);
  }

  return { features, counted, skippedInZone, activeCells: active.size, mergedCount };
}

// ---------------------------------------------------------------------------
// Water / park / road processing (shared by both fetch paths)
// ---------------------------------------------------------------------------

function pathLengthMeters(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += distanceMeters(points[i - 1], points[i]);
  return total;
}

// The real corridor has far more water/park/road ways than the 400-900
// feature budget allows once buildings, merged blocks, and rail are also
// counted. Short/small fragments (drainage ditches, tiny pond edges, minor
// side streets) are dropped rather than every single OSM way being kept --
// documented in ATTRIBUTION.md.
const MIN_WATER_LINE_METERS = 60;
const MIN_WATER_PARK_AREA_SQM = 1000;
const ROAD_CLASSES_KEPT = new Set(["primary", "primary_link"]);
const MIN_ROAD_METERS = 20;

function processWaterAndParks(ways) {
  const features = [];
  const namedCanalGroups = new Map(); // name -> ways[]
  let unnamedIdCounter = 0;

  for (const w of ways) {
    const isWaterway = w.tags?.waterway === "canal" || w.tags?.waterway === "river";
    const isWater = w.tags?.natural === "water";
    const isPark = w.tags?.leisure === "park";
    if (!isWaterway && !isWater && !isPark) continue;
    if (w.points.length < 2) continue;

    if (isWaterway) {
      // OSM splits a single named canal into many short ways (one per
      // bridge). Group by name and chain them into one feature instead of
      // keeping every fragment -- otherwise a handful of real canals turn
      // into hundreds of near-duplicate line features.
      const name = w.tags?.name;
      if (name) {
        if (!namedCanalGroups.has(name)) namedCanalGroups.set(name, []);
        namedCanalGroups.get(name).push(w);
        continue;
      }
      if (pathLengthMeters(w.points) < MIN_WATER_LINE_METERS * 4) continue;
      features.push({ id: `water_${w.id}`, kind: "water", coordinates: roundRing(simplify(w.points, 3)), isLine: true, widthMeters: 12 });
      continue;
    }
    if (w.points.length < 3) continue;
    const minArea = w.tags?.name ? MIN_WATER_PARK_AREA_SQM : MIN_WATER_PARK_AREA_SQM * 4;
    if (ringAreaSqMeters(closeRing(w.points)) < minArea) continue;
    features.push({
      id: `${isWater ? "water" : "park"}_${(w.tags?.name ?? `u${unnamedIdCounter++}`).replace(/\W+/g, "_")}_${w.id}`,
      kind: isWater ? "water" : "park",
      coordinates: roundRing(simplify(w.points, 3)),
      name: w.tags?.name,
    });
  }

  for (const [name, group] of namedCanalGroups) {
    const { chain } = chainWays(group.map((w) => ({ points: w.points })));
    if (pathLengthMeters(chain) < MIN_WATER_LINE_METERS) continue;
    features.push({
      id: `water_canal_${name.replace(/\W+/g, "_")}`,
      kind: "water",
      coordinates: roundRing(simplify(chain, 3)),
      isLine: true,
      widthMeters: 12,
      name,
    });
  }

  return features;
}

function processRoads(ways) {
  const features = [];
  for (const w of ways) {
    if (w.points.length < 2) continue;
    if (!ROAD_CLASSES_KEPT.has(w.tags?.highway)) continue;
    if (pathLengthMeters(w.points) < MIN_ROAD_METERS) continue;
    const isPrimary = w.tags?.highway === "primary" || w.tags?.highway === "primary_link";
    features.push({
      id: `road_${w.id}`,
      kind: "road",
      coordinates: roundRing(simplify(w.points, 2)),
      isLine: true,
      widthMeters: isPrimary ? 10 : 7,
      name: w.tags?.name,
    });
  }
  return features;
}

// ---------------------------------------------------------------------------
// Way chaining -> ordered polylines (shared: relation members or tagged ways)
// ---------------------------------------------------------------------------

const EPS_M = 5;
const pointsEqual = (a, b) => distanceMeters(a, b) < EPS_M;

/** Chain way segments end-to-end. Returns { chain, ordered } (ordered=false => fallback used). */
function chainWays(ways) {
  if (ways.length === 0) return { chain: [], ordered: false };
  const remaining = ways.map((w) => [...w.points]);
  const chain = [...remaining.shift()];
  let progressed = true;
  let usedFallback = false;

  while (remaining.length > 0 && progressed) {
    progressed = false;
    const tail = chain[chain.length - 1];
    const head = chain[0];
    for (let i = 0; i < remaining.length; i += 1) {
      const seg = remaining[i];
      if (pointsEqual(seg[0], tail)) {
        chain.push(...seg.slice(1));
        remaining.splice(i, 1);
        progressed = true;
        break;
      }
      if (pointsEqual(seg[seg.length - 1], tail)) {
        chain.push(...[...seg].reverse().slice(1));
        remaining.splice(i, 1);
        progressed = true;
        break;
      }
      if (pointsEqual(seg[seg.length - 1], head)) {
        chain.unshift(...seg.slice(0, -1));
        remaining.splice(i, 1);
        progressed = true;
        break;
      }
      if (pointsEqual(seg[0], head)) {
        chain.unshift(...[...seg].reverse().slice(0, -1));
        remaining.splice(i, 1);
        progressed = true;
        break;
      }
    }
  }

  if (remaining.length > 0) {
    // Fallback: order all way segments by projected distance along the
    // Centraal -> destination axis, then concatenate their points.
    usedFallback = true;
    const axisSorted = [...ways].sort((a, b) => {
      const ca = a.points[Math.floor(a.points.length / 2)];
      const cb = b.points[Math.floor(b.points.length / 2)];
      return distanceMeters(ROUTE_STOPS.metro_52.from, ca) - distanceMeters(ROUTE_STOPS.metro_52.from, cb);
    });
    return { chain: axisSorted.flatMap((w) => w.points), ordered: false };
  }

  return { chain, ordered: !usedFallback };
}

function nearestIndex(points, target) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const d = distanceMeters(points[i], target);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function clipPolyline(points, from, to) {
  if (points.length === 0) return [from, to];
  const iFrom = nearestIndex(points, from);
  const iTo = nearestIndex(points, to);
  const lo = Math.min(iFrom, iTo);
  const hi = Math.max(iFrom, iTo);
  let clipped = points.slice(lo, hi + 1);
  if (iFrom > iTo) clipped = clipped.reverse();
  if (clipped.length === 0) return [from, to];
  // Snap the endpoints to the requested stop coordinates for a clean join.
  clipped[0] = from;
  clipped[clipped.length - 1] = to;
  return clipped;
}

// ---------------------------------------------------------------------------
// Graph shortest path -- used by the OSM API fallback for rail. Physical
// railway=subway / railway=tram ways form a branching network (multiple
// numbered lines share track), not a single chainable line, so instead of
// naive end-to-end chaining this builds a graph from every way's points and
// runs Dijkstra between the two requested stops. It also restricts the
// graph to ways near the straight line between the stops, so unrelated
// lines elsewhere in the bbox do not get pulled in.
// ---------------------------------------------------------------------------

function avgPoint(points) {
  return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
}

function distanceToSegmentMeters(point, a, b) {
  const p = toLocalXY(point);
  const pa = toLocalXY(a);
  const pb = toLocalXY(b);
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p[0] - pa[0]) * dx + (p[1] - pa[1]) * dy) / lenSq;
  t = Math.max(-0.15, Math.min(1.15, t)); // allow a little overshoot past the endpoints
  const cx = pa[0] + t * dx;
  const cy = pa[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

function nodeKey(point) {
  return `${round6(point[0])},${round6(point[1])}`;
}

function buildWayGraph(ways) {
  const adj = new Map(); // key -> [{to, dist}]
  const nodePoint = new Map(); // key -> [lng,lat]
  for (const w of ways) {
    const pts = w.points;
    for (const p of pts) {
      const k = nodeKey(p);
      if (!nodePoint.has(k)) nodePoint.set(k, p);
    }
    for (let i = 1; i < pts.length; i += 1) {
      const a = nodeKey(pts[i - 1]);
      const b = nodeKey(pts[i]);
      if (a === b) continue;
      const d = distanceMeters(pts[i - 1], pts[i]);
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ to: b, dist: d });
      adj.get(b).push({ to: a, dist: d });
    }
  }
  return { adj, nodePoint };
}

function nearestGraphNodeKey(nodePoint, target) {
  let best;
  let bestDist = Infinity;
  for (const [key, pt] of nodePoint) {
    const d = distanceMeters(pt, target);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

/** Simple array-based Dijkstra; fine at the scale of one corridor's rail graph. */
function dijkstraShortestPath(adj, nodePoint, startKey, endKey) {
  const dist = new Map([[startKey, 0]]);
  const prev = new Map();
  const done = new Set();
  const frontier = new Set([startKey]);

  while (frontier.size > 0) {
    let u;
    let best = Infinity;
    for (const k of frontier) {
      const d = dist.get(k) ?? Infinity;
      if (d < best) {
        best = d;
        u = k;
      }
    }
    if (u === undefined) break;
    frontier.delete(u);
    done.add(u);
    if (u === endKey) break;
    for (const { to, dist: w } of adj.get(u) ?? []) {
      if (done.has(to)) continue;
      const alt = best + w;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, u);
        frontier.add(to);
      }
    }
  }

  if (!dist.has(endKey)) return undefined;
  const path = [];
  let cur = endKey;
  while (cur !== undefined) {
    path.unshift(nodePoint.get(cur));
    cur = cur === startKey ? undefined : prev.get(cur);
  }
  return path;
}

/**
 * Real network shortest path between `from` and `to` along `ways` (a flat
 * pool of {points} for one physical rail mode). Returns { path, ok }: ok is
 * false when no connected path was found (caller should fall back to a
 * straight line and note it).
 */
function shortestPathAlongWays(ways, from, to, corridorMeters = 900) {
  const nearby = ways.filter((w) => distanceToSegmentMeters(avgPoint(w.points), from, to) <= corridorMeters);
  const pool = nearby.length >= 2 ? nearby : ways;
  const { adj, nodePoint } = buildWayGraph(pool);
  if (nodePoint.size === 0) return { path: [from, to], ok: false };

  const startKey = nearestGraphNodeKey(nodePoint, from);
  const endKey = nearestGraphNodeKey(nodePoint, to);
  const path = dijkstraShortestPath(adj, nodePoint, startKey, endKey);
  if (!path) return { path: [from, to], ok: false };
  return { path: [from, ...path, to], ok: true };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Amsterdam OSM import. bbox=${bboxStr} refresh=${REFRESH}`);

  let result;
  const available = await overpassAvailable();
  if (available) {
    console.log("[source] Overpass API is reachable; using it.");
    try {
      result = await fetchAllViaOverpass();
    } catch (err) {
      console.warn(`Overpass fetch failed mid-way (${err.message}); falling back to the OSM API.`);
      result = await fetchAllViaOsmApiTiles();
    }
  } else {
    console.log("[source] Overpass API status check failed; using the OSM API fallback.");
    result = await fetchAllViaOsmApiTiles();
  }

  const { detailBuildings, gridBuildings, waterParkWays, roadWays, routeChains, routeNotes, landmarkCandidates, sourceLabel } = result;

  fs.writeFileSync(path.join(CACHE_DIR, "landmark-candidates.json"), JSON.stringify(landmarkCandidates, null, 2));
  console.log(`Wrote ${landmarkCandidates.length} landmark candidate nodes to scripts/.cache/landmark-candidates.json`);

  const { features: buildingFeatures, dropped: droppedBuildings, droppedOverCap } = processDetailZoneBuildings(detailBuildings);
  const { features: mergedBlockFeatures, counted, skippedInZone, activeCells, mergedCount } = processMergedBlocks(gridBuildings);
  const waterParkFeatures = processWaterAndParks(waterParkWays);
  const roadFeatures = processRoads(roadWays);

  const waterCount = waterParkFeatures.filter((f) => f.kind === "water").length;
  const parkCount = waterParkFeatures.filter((f) => f.kind === "park").length;

  const routes = {};
  const railFeatures = [];
  for (const [key, { chain, relationRef, operator }] of Object.entries(routeChains)) {
    const { from, to, fromName, toName } = ROUTE_STOPS[key];
    const clipped = clipPolyline(chain, from, to);
    routes[key] = {
      relationRef,
      lineName: ROUTE_LINE_NAMES[key],
      operator,
      path: roundRing(simplify(clipped, 2)),
      stops: [
        { name: fromName, position: [round6(from[0]), round6(from[1])] },
        { name: toName, position: [round6(to[0]), round6(to[1])] },
      ],
    };
    railFeatures.push({
      id: `rail_${key}`,
      kind: "rail",
      coordinates: routes[key].path,
      isLine: true,
      widthMeters: 4,
      name: ROUTE_LINE_NAMES[key],
    });
  }

  // The OSM API returns a way's FULL geometry once any of its nodes falls
  // inside a requested tile, so a handful of long water/park/road ways
  // stretch past the corridor bbox. Drop those rather than clip them --
  // simpler, and the corridor scene only needs the bbox anyway.
  const boundsSlackDeg = 220 / M_PER_DEG_LAT;
  const withinBounds = (feature) =>
    feature.coordinates.every(
      ([lng, lat]) => lng >= BBOX.west - boundsSlackDeg && lng <= BBOX.east + boundsSlackDeg && lat >= BBOX.south - boundsSlackDeg && lat <= BBOX.north + boundsSlackDeg,
    );
  const droppedOutOfBounds = [...waterParkFeatures, ...roadFeatures].filter((f) => !withinBounds(f)).length;

  const allFeatures = [...buildingFeatures, ...mergedBlockFeatures, ...waterParkFeatures, ...roadFeatures, ...railFeatures].filter(withinBounds);

  console.log("--- Import summary ---");
  console.log(`Source: ${sourceLabel}`);
  console.log(`Detail-zone buildings kept: ${buildingFeatures.length} (dropped <35 m2: ${droppedBuildings}, dropped over per-zone cap: ${droppedOverCap})`);
  console.log(`Grid buildings considered: ${counted} (skipped, inside a detail zone: ${skippedInZone})`);
  console.log(`Merged-block cells active: ${activeCells} -> merged rectangles emitted: ${mergedCount}`);
  console.log(`Water features: ${waterCount}, park features: ${parkCount}, road features: ${roadFeatures.length}, rail features: ${railFeatures.length}`);
  console.log(`Total geometry features: ${allFeatures.length} (dropped ${droppedOutOfBounds} that extended past the corridor bbox)`);

  const notes = [...routeNotes];
  if (droppedOverCap > 0) {
    notes.push(
      `Real building density in central Amsterdam put well over ${MAX_BUILDINGS_PER_ZONE} qualifying footprints (>=35 m2) in one or more detail zones, which alone would exceed the 400-900 feature budget. Within each detail zone, only the ${MAX_BUILDINGS_PER_ZONE} largest footprints by real area are kept as individual buildings; ${droppedOverCap} smaller ones were dropped (not merged).`,
    );
  }
  if (sourceLabel === "osm-api-tiles") {
    notes.push(
      "Geometry source: Overpass API (overpass-api.de) was unreachable from this project's network at import time, so this export used the standard OpenStreetMap API (api.openstreetmap.org/api/0.6/map), tiled to stay under its per-request node limit, with building/water/park/road/rail features filtered from the raw data locally instead of server-side. Rerun `node scripts/import-osm.mjs --refresh` once Overpass is reachable to redo the import through Overpass.",
    );
  }
  if (allFeatures.length < 400 || allFeatures.length > 900) {
    notes.push(`Feature count ${allFeatures.length} is outside the 400-900 target; see script parameters (grid coverage threshold, road classes, tile size).`);
    console.warn(`WARNING: feature count ${allFeatures.length} outside 400-900 target range.`);
  }

  const bounds = { west: BBOX.west, south: BBOX.south, east: BBOX.east, north: BBOX.north };
  const exportedAt = new Date().toISOString();

  const geometry = {
    center: CENTER,
    bounds,
    features: allFeatures,
    detailZones: DETAIL_ZONES.map((z) => ({ id: z.id, name: z.name, center: z.center, radiusMeters: z.radiusMeters, reason: z.reason })),
    source: {
      provider: "openstreetmap",
      attribution: "© OpenStreetMap contributors",
      license: "ODbL-1.0",
      exportedAt,
      notes: [
        `Bbox: south ${BBOX.south}, west ${BBOX.west}, north ${BBOX.north}, east ${BBOX.east}.`,
        sourceLabel === "overpass"
          ? "Queries (Overpass): building ways in 5 detail zones (out geom), all building ways in the bbox (out bb tags, for merged-block coverage only), natural=water / waterway=canal|river / leisure=park ways, highway in primary|secondary|tertiary|primary_link|secondary_link ways, and the 3 named route relations with member geometry."
          : `Queries (OSM API fallback): the bbox tiled into ${buildTiles().length} sub-requests to api.openstreetmap.org/api/0.6/map, filtered locally for building / natural=water / waterway=canal|river / leisure=park / highway in primary|secondary|tertiary|primary_link|secondary_link / railway=subway|tram.`,
        ...notes,
      ],
    },
  };

  const routesGeometry = { generatedAt: exportedAt, routes };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "geometry.json"), JSON.stringify(geometry));
  fs.writeFileSync(path.join(OUT_DIR, "routes-geometry.json"), JSON.stringify(routesGeometry, null, 2));

  const geomSize = fs.statSync(path.join(OUT_DIR, "geometry.json")).size;
  const routesSize = fs.statSync(path.join(OUT_DIR, "routes-geometry.json")).size;
  console.log(`Wrote geometry.json (${(geomSize / 1024).toFixed(1)} KB) and routes-geometry.json (${(routesSize / 1024).toFixed(1)} KB).`);
  if (geomSize > 1.5 * 1024 * 1024) console.warn("WARNING: geometry.json exceeds 1.5 MB.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
