/**
 * Export the RouteRoom overlay GeoJSON for a city pack.
 *
 * Writes, next to the pack:
 *   routes.geojson  one LineString per route segment, feature.id = segment id
 *   points.geojson  one Point per landmark, feature.id = landmark id
 *   reports.geojson one Point per seed report at its segment midpoint, feature.id = report id
 *
 * These are the committed, reviewable form of what the Mapbox scene draws.
 * The scene builds the same features at runtime from the pack (with live
 * display state); this export exists for provenance and for anyone who wants
 * the overlay data without running the app. Mapbox is presentation only;
 * nothing here comes from a Mapbox API.
 *
 * Run: npm run export:overlays
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { midpoint } from "../src/lib/geo";
import { cityPacks } from "../src/lib/city-packs";
import type { CityPack } from "../src/lib/types";

type Feature = {
  type: "Feature";
  id: string;
  geometry: { type: "LineString"; coordinates: [number, number][] } | { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string | number | boolean | null>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  name: string;
  provenance: Record<string, string | string[]>;
  features: Feature[];
};

function collection(name: string, city: CityPack, features: Feature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    name,
    provenance: {
      city_pack: city.id,
      generated_by: "scripts/export-overlays.ts",
      curated_at: city.snapshot.curatedAt,
      geometry_source: city.geometry.source.attribution,
      geometry_license: city.geometry.source.license,
      geometry_exported_at: city.geometry.source.exportedAt,
      note: "Curated snapshot for the RouteRoom demo. Not live directions. Mapbox renders the basemap only.",
    },
    features,
  };
}

function exportPack(city: CityPack, outDir: string) {
  const routes: Feature[] = city.routeOptions.flatMap((route) =>
    route.segments.map((segment) => ({
      type: "Feature" as const,
      id: segment.id,
      geometry: { type: "LineString" as const, coordinates: segment.path },
      properties: {
        segment_id: segment.id,
        route_id: route.id,
        route_name: route.name,
        mode: segment.mode,
        is_walk: segment.mode === "walk",
        label: segment.label,
        line_name: segment.lineName ?? null,
        operator: segment.operator ?? null,
        from_landmark_id: segment.fromLandmarkId,
        to_landmark_id: segment.toLandmarkId,
        distance_meters: segment.distanceMeters,
        has_stairs: segment.hasStairs,
        covered: segment.covered,
        accessibility: segment.accessibility,
        rain_exposure: segment.rainExposure,
      },
    })),
  );

  const points: Feature[] = city.landmarks.map((landmark) => ({
    type: "Feature" as const,
    id: landmark.id,
    geometry: { type: "Point" as const, coordinates: landmark.position },
    properties: {
      landmark_id: landmark.id,
      name: landmark.name,
      kind: landmark.kind,
      description: landmark.description ?? null,
      osm_id: landmark.osmId ?? null,
    },
  }));

  const segmentsById = new Map(city.routeOptions.flatMap((route) => route.segments.map((segment) => [segment.id, { route, segment }] as const)));
  const reports: Feature[] = city.reports.flatMap((report) => {
    const found = segmentsById.get(report.segmentId);
    if (!found) return [];
    return [{
      type: "Feature" as const,
      id: report.id,
      geometry: { type: "Point" as const, coordinates: midpoint(found.segment.path) },
      properties: {
        report_id: report.id,
        segment_id: report.segmentId,
        route_id: found.route.id,
        category: report.category,
        confidence: report.confidence,
        source: report.source,
        observed_at: report.observedAt,
        expires_at: report.expiresAt,
        landmark_id: report.landmarkId ?? null,
        // Report text is untrusted user-facing content; it stays in the pack, not in the map overlay.
      },
    }];
  });

  mkdirSync(outDir, { recursive: true });
  const write = (file: string, data: FeatureCollection) => {
    writeFileSync(join(outDir, file), `${JSON.stringify(data, null, 1)}\n`);
    console.log(`${city.id}: ${file} (${data.features.length} features)`);
  };
  write("routes.geojson", collection("routeroom_routes", city, routes));
  write("points.geojson", collection("routeroom_points", city, points));
  write("reports.geojson", collection("routeroom_reports", city, reports));
}

const here = dirname(fileURLToPath(import.meta.url));
for (const city of cityPacks) {
  exportPack(city, join(here, "..", "src", "lib", "city-packs", city.id === "amsterdam_centrum_rai" ? "amsterdam" : city.id));
}
