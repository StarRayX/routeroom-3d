import { describe, expect, it } from "vitest";
import { withinRadius } from "@/lib/geo";
import { miniCity, MINI_ROUTE_A, MINI_ROUTES } from "@/components/mapbox/__fixtures__/mini-city";
import { cameraEquals, computeCamera } from "@/components/mapbox/camera";

const destination = miniCity.landmarks.find((l) => l.id === "mini_venue")!;

describe("computeCamera overview", () => {
  it("returns bounds that contain every destination-side landmark within 1200 m", () => {
    const result = computeCamera("overview", { city: miniCity, routes: MINI_ROUTES });
    expect(result.bounds).toBeDefined();
    const [[west, south], [east, north]] = result.bounds!;

    const nearby = miniCity.landmarks.filter(
      (l) =>
        ["station", "stop", "entrance", "venue"].includes(l.kind) && withinRadius(l.position, destination.position, 1200),
    );
    expect(nearby.length).toBeGreaterThan(0);
    for (const landmark of nearby) {
      const [lng, lat] = landmark.position;
      expect(lng).toBeGreaterThanOrEqual(west);
      expect(lng).toBeLessThanOrEqual(east);
      expect(lat).toBeGreaterThanOrEqual(south);
      expect(lat).toBeLessThanOrEqual(north);
    }
  });

  it("uses pitch 55 and bearing -20", () => {
    const result = computeCamera("overview", { city: miniCity, routes: MINI_ROUTES });
    expect(result.pitch).toBe(55);
    expect(result.bearing).toBe(-20);
  });
});

describe("computeCamera route", () => {
  it("returns bounds covering the whole route path, pitch 45", () => {
    const result = computeCamera("route", { city: miniCity, routes: MINI_ROUTES, routeId: "route_mini_a" });
    expect(result.bounds).toBeDefined();
    const [[west, south], [east, north]] = result.bounds!;
    for (const segment of MINI_ROUTE_A.segments) {
      for (const [lng, lat] of segment.path) {
        expect(lng).toBeGreaterThanOrEqual(west);
        expect(lng).toBeLessThanOrEqual(east);
        expect(lat).toBeGreaterThanOrEqual(south);
        expect(lat).toBeLessThanOrEqual(north);
      }
    }
    expect(result.pitch).toBe(45);
  });
});

describe("computeCamera feature", () => {
  it("fits bounds to a focused segment's path", () => {
    const segment = MINI_ROUTE_A.segments.find((s) => s.id === "seg_mini_a_tram")!;
    const result = computeCamera("feature", { city: miniCity, routes: MINI_ROUTES, focusedSegmentId: "seg_mini_a_tram" });
    expect(result.bounds).toBeDefined();
    expect(result.center).toBeUndefined();
    const [[west, south], [east, north]] = result.bounds!;
    for (const [lng, lat] of segment.path) {
      expect(lng).toBeGreaterThanOrEqual(west);
      expect(lng).toBeLessThanOrEqual(east);
      expect(lat).toBeGreaterThanOrEqual(south);
      expect(lat).toBeLessThanOrEqual(north);
    }
    expect(result.pitch).toBe(60);
  });

  it("centers on a landmark with zoom 16.5 when no segment is focused", () => {
    const result = computeCamera("feature", { city: miniCity, routes: MINI_ROUTES, landmarkId: "mini_station" });
    expect(result.bounds).toBeUndefined();
    expect(result.center).toEqual(miniCity.landmarks.find((l) => l.id === "mini_station")!.position);
    expect(result.zoom).toBe(16.5);
  });

  it("centers on a report's segment midpoint when neither a segment nor a landmark is given", () => {
    const report = miniCity.reports[0];
    const result = computeCamera("feature", { city: miniCity, routes: MINI_ROUTES, report });
    expect(result.center).toBeDefined();
    expect(result.zoom).toBe(16.5);
  });
});

describe("cameraEquals", () => {
  it("treats two structurally identical results as equal", () => {
    const a = computeCamera("overview", { city: miniCity, routes: MINI_ROUTES });
    const b = computeCamera("overview", { city: miniCity, routes: MINI_ROUTES });
    expect(cameraEquals(a, b)).toBe(true);
  });

  it("detects a changed zoom, center, or bounds", () => {
    const a = computeCamera("feature", { city: miniCity, routes: MINI_ROUTES, landmarkId: "mini_station" });
    const b = computeCamera("feature", { city: miniCity, routes: MINI_ROUTES, landmarkId: "mini_venue" });
    expect(cameraEquals(a, b)).toBe(false);
  });

  it("detects a preset-driven pitch/bearing change", () => {
    const overview = computeCamera("overview", { city: miniCity, routes: MINI_ROUTES });
    const arrival = computeCamera("arrival", { city: miniCity, routes: MINI_ROUTES });
    expect(cameraEquals(overview, arrival)).toBe(false);
  });
});
