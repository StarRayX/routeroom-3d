import { describe, expect, it } from "vitest";
import type { RouteSceneProps } from "@/components/route-scene/types";
import { RouteScene, RouteMap2D } from "@/components/route-scene";
import { MapboxRouteScene } from "@/components/mapbox/MapboxRouteScene";
import { miniCity, MINI_ROUTES } from "@/components/mapbox/__fixtures__/mini-city";

/**
 * Proves that MapboxRouteScene (re-exported as RouteScene) and RouteMap2D
 * both satisfy the fixed RouteSceneProps contract, and that the planner's
 * import path ("@/components/route-scene") still resolves to the Mapbox
 * implementation. No rendering happens here (no DOM in this test
 * environment); this only exercises the type contract and the module graph.
 */

const fixtureProps: RouteSceneProps = {
  city: miniCity,
  routes: MINI_ROUTES,
  visibleRouteIds: ["route_mini_a"],
  displayModes: { route_mini_a: "primary", route_mini_b: "candidate" },
  primaryRouteId: "route_mini_a",
  activeReports: miniCity.reports,
  onSelectRoute: () => {},
};

describe("RouteSceneProps contract", () => {
  it("RouteScene re-exports MapboxRouteScene, both callable with a component's props", () => {
    expect(RouteScene).toBe(MapboxRouteScene);
    // Type-level check: this assignment fails to compile if either
    // component's prop type stops matching RouteSceneProps.
    const _acceptsMapbox: (props: RouteSceneProps) => ReturnType<typeof MapboxRouteScene> = MapboxRouteScene;
    const _acceptsMap2D: (props: RouteSceneProps) => ReturnType<typeof RouteMap2D> = RouteMap2D;
    expect(typeof _acceptsMapbox).toBe("function");
    expect(typeof _acceptsMap2D).toBe("function");
  });

  it("fixtureProps satisfies RouteSceneProps for every route-scene renderer", () => {
    expect(fixtureProps.city.id).toBe("mini-city");
    expect(fixtureProps.routes).toHaveLength(2);
  });
});
