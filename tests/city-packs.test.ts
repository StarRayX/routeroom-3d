import { describe, expect, it } from "vitest";
import { cityPacks, defaultCityPack, getCityPack, validateCityPack } from "@/lib/city-packs";

describe("city packs", () => {
  it("every pack passes validateCityPack with no problems", () => {
    for (const city of cityPacks) {
      const problems = validateCityPack(city);
      expect(problems, `${city.id} had problems:\n${problems.join("\n")}`).toEqual([]);
    }
  });

  it("getCityPack('amsterdam_centrum_rai') returns Amsterdam", () => {
    const city = getCityPack("amsterdam_centrum_rai");
    expect(city).toBeDefined();
    expect(city?.name).toBe("Amsterdam");
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

  it("geometry feature counts land in the 400-900 target range with detail zones and a parseable export date", () => {
    const amsterdam = getCityPack("amsterdam_centrum_rai")!;
    const { geometry } = amsterdam;
    expect(geometry.features.length).toBeGreaterThanOrEqual(400);
    expect(geometry.features.length).toBeLessThanOrEqual(900);
    expect(geometry.detailZones.length).toBeGreaterThanOrEqual(4);
    expect(Number.isNaN(Date.parse(geometry.source.exportedAt))).toBe(false);
  });

  it("both seed reports on the Amsterdam pack are active at the default trip's clockAt", () => {
    const amsterdam = getCityPack("amsterdam_centrum_rai")!;
    const trip = amsterdam.trips.find((t) => t.id === amsterdam.defaultTripId)!;
    const clockAt = new Date(trip.clockAt).getTime();

    for (const report of amsterdam.reports) {
      const observedAt = new Date(report.observedAt).getTime();
      const expiresAt = new Date(report.expiresAt).getTime();
      const active = observedAt <= clockAt && clockAt < expiresAt;
      expect(active, `report ${report.id} should be active at clockAt`).toBe(true);
    }
  });
});
