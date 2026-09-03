import { describe, expect, it } from "vitest";
import { distanceMeters } from "@/lib/geo";
import { miniCity, MINI_ROUTES, MINI_ROUTE_A } from "@/components/mapbox/__fixtures__/mini-city";
import {
  buildPointFeatures,
  buildReportFeatures,
  buildRouteFeatures,
  buildTransferFeatures,
} from "@/components/mapbox/geojson";

describe("buildRouteFeatures", () => {
  it("gives every segment a stable feature id equal to the segment id", () => {
    const fc = buildRouteFeatures(miniCity, MINI_ROUTES, ["route_mini_a", "route_mini_b"], {}, undefined, undefined);
    const ids = fc.features.map((f) => f.id).sort();
    expect(ids).toEqual(["seg_mini_a_tram", "seg_mini_a_walk", "seg_mini_b_walk"].sort());
    for (const feature of fc.features) {
      expect(feature.properties.segment_id).toBe(feature.id);
    }
  });

  it("sets is_walk and display_mode from the segment mode and displayModes map", () => {
    const fc = buildRouteFeatures(miniCity, MINI_ROUTES, ["route_mini_a"], { route_mini_a: "primary" }, undefined, undefined);
    const walk = fc.features.find((f) => f.id === "seg_mini_a_walk");
    const tram = fc.features.find((f) => f.id === "seg_mini_a_tram");
    expect(walk?.properties.is_walk).toBe(true);
    expect(tram?.properties.is_walk).toBe(false);
    expect(walk?.properties.display_mode).toBe("primary");
    expect(walk?.properties.sort_key).toBe(3);
  });

  it("defaults an unmapped route to candidate, sort_key 1", () => {
    const fc = buildRouteFeatures(miniCity, MINI_ROUTES, ["route_mini_b"], {}, undefined, undefined);
    const feature = fc.features[0];
    expect(feature.properties.display_mode).toBe("candidate");
    expect(feature.properties.sort_key).toBe(1);
  });

  it("excludes segments of hidden (non-visible) routes entirely", () => {
    const fc = buildRouteFeatures(miniCity, MINI_ROUTES, ["route_mini_a"], {}, undefined, undefined);
    expect(fc.features.some((f) => f.properties.route_id === "route_mini_b")).toBe(false);
  });

  it("sets focused and disrupted flags per segment", () => {
    const fc = buildRouteFeatures(
      miniCity,
      MINI_ROUTES,
      ["route_mini_a"],
      { route_mini_a: "primary" },
      "seg_mini_a_tram",
      ["seg_mini_a_walk"],
    );
    const walk = fc.features.find((f) => f.id === "seg_mini_a_walk");
    const tram = fc.features.find((f) => f.id === "seg_mini_a_tram");
    expect(tram?.properties.focused).toBe(true);
    expect(walk?.properties.focused).toBe(false);
    expect(walk?.properties.disrupted).toBe(true);
    expect(tram?.properties.disrupted).toBe(false);
  });
});

describe("buildPointFeatures", () => {
  it("includes only landmarks used as endpoints on a visible route, excluding an unused stop", () => {
    const fc = buildPointFeatures(miniCity, MINI_ROUTES, ["route_mini_a"], undefined);
    const ids = fc.features.map((f) => f.properties.landmark_id).sort();
    expect(ids).toEqual(["mini_origin", "mini_station", "mini_venue"].sort());
    expect(ids).not.toContain("mini_stop");
  });

  it("includes the camera target landmark even when no route is visible", () => {
    const fc = buildPointFeatures(miniCity, MINI_ROUTES, [], "mini_stop");
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.landmark_id).toBe("mini_stop");
  });

  it("marks on_primary true only for landmarks on a route displayed as primary", () => {
    const fc = buildPointFeatures(miniCity, MINI_ROUTES, ["route_mini_a"], undefined, { route_mini_a: "primary" });
    const venue = fc.features.find((f) => f.properties.landmark_id === "mini_venue");
    expect(venue?.properties.on_primary).toBe(true);
  });

  it("defaults on_primary to false when displayModes is omitted", () => {
    const fc = buildPointFeatures(miniCity, MINI_ROUTES, ["route_mini_a"], undefined);
    expect(fc.features.every((f) => f.properties.on_primary === false)).toBe(true);
  });

  it("feature id equals the landmark id", () => {
    const fc = buildPointFeatures(miniCity, MINI_ROUTES, ["route_mini_a"], undefined);
    for (const feature of fc.features) expect(feature.id).toBe(feature.properties.landmark_id);
  });
});

describe("buildReportFeatures", () => {
  it("gives the report feature id equal to the report id", () => {
    const fc = buildReportFeatures(miniCity, MINI_ROUTES, miniCity.reports);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].id).toBe("report_mini_1");
    expect(fc.features[0].properties.report_id).toBe("report_mini_1");
    expect(fc.features[0].properties.route_id).toBe("route_mini_a");
  });

  it("places the report at a point strictly between its segment's endpoints", () => {
    const fc = buildReportFeatures(miniCity, MINI_ROUTES, miniCity.reports);
    const [lng, lat] = fc.features[0].geometry.coordinates;
    const segment = MINI_ROUTE_A.segments.find((s) => s.id === "seg_mini_a_tram")!;
    const [fromLng, fromLat] = segment.path[0];
    const [toLng, toLat] = segment.path[segment.path.length - 1];

    // The midpoint should be roughly equidistant from both endpoints along
    // the path, and strictly inside the segment's bounding box.
    const distFromStart = distanceMeters([fromLng, fromLat], [lng, lat]);
    const distFromEnd = distanceMeters([toLng, toLat], [lng, lat]);
    expect(distFromStart).toBeGreaterThan(0);
    expect(distFromEnd).toBeGreaterThan(0);
    expect(lng).toBeGreaterThanOrEqual(Math.min(fromLng, toLng));
    expect(lng).toBeLessThanOrEqual(Math.max(fromLng, toLng));
    expect(lat).toBeGreaterThanOrEqual(Math.min(fromLat, toLat));
    expect(lat).toBeLessThanOrEqual(Math.max(fromLat, toLat));
  });

  it("skips a report whose segment cannot be found", () => {
    const fc = buildReportFeatures(miniCity, MINI_ROUTES, [
      { ...miniCity.reports[0], id: "report_orphan", segmentId: "seg_does_not_exist" },
    ]);
    expect(fc.features).toHaveLength(0);
  });
});

describe("buildTransferFeatures", () => {
  it("marks a mode change on a primary route as a transfer point", () => {
    const fc = buildTransferFeatures(MINI_ROUTES, ["route_mini_a"], { route_mini_a: "primary" });
    const transfers = fc.features.filter((f) => f.properties.kind === "transfer");
    expect(transfers).toHaveLength(1);
    expect(transfers[0].properties).toMatchObject({ mode_from: "walk", mode_to: "tram", route_id: "route_mini_a" });
  });

  it("marks the stairs segment as a hazard point", () => {
    const fc = buildTransferFeatures(MINI_ROUTES, ["route_mini_a"], { route_mini_a: "primary" });
    const hazards = fc.features.filter((f) => f.properties.kind === "hazard");
    expect(hazards).toHaveLength(1);
    expect(hazards[0].properties).toMatchObject({ hazard: "stairs", segment_id: "seg_mini_a_tram" });
  });

  it("marks the caution accessibility segment as a hazard point", () => {
    const fc = buildTransferFeatures(MINI_ROUTES, ["route_mini_b"], { route_mini_b: "backup" });
    const hazards = fc.features.filter((f) => f.properties.kind === "hazard");
    expect(hazards).toHaveLength(1);
    const properties = hazards[0].properties;
    expect(properties.kind === "hazard" && properties.hazard).toBe("caution");
  });

  it("produces nothing for a candidate-only route", () => {
    const fc = buildTransferFeatures(MINI_ROUTES, ["route_mini_a"], { route_mini_a: "candidate" });
    expect(fc.features).toHaveLength(0);
  });

  it("ignores a route that is not visible", () => {
    const fc = buildTransferFeatures(MINI_ROUTES, [], { route_mini_a: "primary", route_mini_b: "backup" });
    expect(fc.features).toHaveLength(0);
  });
});
