import { describe, expect, it } from "vitest";
import { cityPacks, defaultCityPack, getCityPack, validateCityPack } from "@/lib/city-packs";

describe("city packs", () => {
  it("every pack passes validateCityPack with no problems", () => {
    for (const city of cityPacks) {
      const problems = validateCityPack(city);
      expect(problems, `${city.id} had problems:\n${problems.join("\n")}`).toEqual([]);
    }
  });

  it("getCityPack('demo_city') returns Aurora City", () => {
    const city = getCityPack("demo_city");
    expect(city).toBeDefined();
    expect(city?.name).toBe("Aurora City");
    expect(city).toBe(defaultCityPack);
  });

  it("city pack ids are unique", () => {
    const ids = cityPacks.map((city) => city.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every route has at least 2 segments", () => {
    for (const city of cityPacks) {
      for (const route of city.routeOptions) {
        expect(route.segments.length, `${city.id}/${route.id}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("aurora's bus route has an active delay report at clockAt", () => {
    const aurora = getCityPack("demo_city")!;
    const clockAt = new Date(aurora.defaultTrip.clockAt).getTime();
    const busRoute = aurora.routeOptions.find((route) => route.id === "route_bus_market")!;
    const busRouteSegmentIds = new Set(busRoute.segments.map((segment) => segment.id));

    const activeDelayReport = aurora.reports.find((report) => {
      if (report.category !== "delay") return false;
      if (!busRouteSegmentIds.has(report.segmentId)) return false;
      const observedAt = new Date(report.observedAt).getTime();
      const expiresAt = new Date(report.expiresAt).getTime();
      return observedAt <= clockAt && clockAt < expiresAt;
    });

    expect(activeDelayReport).toBeDefined();
  });
});
