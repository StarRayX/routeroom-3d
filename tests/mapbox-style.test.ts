import { describe, expect, it } from "vitest";
import { COLORS, ROUTE_ROOM_LAYERS, SOURCE_IDS } from "@/components/mapbox/style";

const validSourceIds: string[] = Object.values(SOURCE_IDS);

describe("ROUTE_ROOM_LAYERS", () => {
  it("has unique layer ids", () => {
    const ids = ROUTE_ROOM_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has every layer reference an existing RouteRoom source", () => {
    for (const layer of ROUTE_ROOM_LAYERS) {
      if ("source" in layer && typeof layer.source === "string") {
        expect(validSourceIds).toContain(layer.source);
      }
    }
  });

  it("puts every line layer in slot middle", () => {
    const lineLayers = ROUTE_ROOM_LAYERS.filter((layer) => layer.type === "line");
    expect(lineLayers.length).toBeGreaterThan(0);
    for (const layer of lineLayers) expect(layer.slot).toBe("middle");
  });

  it("puts every symbol/circle layer in slot top", () => {
    const chromeLayers = ROUTE_ROOM_LAYERS.filter((layer) => layer.type === "symbol" || layer.type === "circle");
    expect(chromeLayers.length).toBeGreaterThan(0);
    for (const layer of chromeLayers) expect(layer.slot).toBe("top");
  });
});

describe("COLORS", () => {
  it("matches the required brand colours", () => {
    expect(COLORS.primary).toBe("#d9603b");
    expect(COLORS.backup).toBe("#3b4a56");
    expect(COLORS.disrupted).toBe("#d9a441");
  });
});
