"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap, MapMouseEvent } from "mapbox-gl";
// Next.js App Router supports importing CSS from any client component; this
// loads Mapbox's control/attribution styles once, at module scope.
import "mapbox-gl/dist/mapbox-gl.css";
import { RouteMap2D } from "../route-scene/RouteMap2D";
import type { RouteSceneProps } from "../route-scene/types";
import "../route-scene/route-scene.css";
import { getMapboxTokenFromEnv, type MapboxTokenResolution } from "./token";
import { buildPointFeatures, buildReportFeatures, buildRouteFeatures, buildTransferFeatures } from "./geojson";
import { cameraEquals, computeCamera, type CameraResult } from "./camera";
import { addRouteRoomLayers, applyStandardConfig, LAYER_IDS, setRouteRoomData, SOURCE_IDS } from "./style";

/**
 * Fired on `window` to ease the camera back to the default overview without
 * changing the RouteSceneProps contract. The planner UI can dispatch
 * `window.dispatchEvent(new CustomEvent("routeroom:reset-view"))` from a
 * "Reset view" button; this component listens for it for as long as it is
 * mounted. Also fires automatically whenever both `focusedSegmentId` and
 * `cameraTarget` become undefined, since that already means "show me the
 * overview" through the normal props channel.
 */
export const RESET_VIEW_EVENT = "routeroom:reset-view";

type MapboxGlModule = typeof import("mapbox-gl");
type MapboxGlDefault = MapboxGlModule["default"];

const ROUTE_LINE_LAYER_IDS: readonly string[] = [
  LAYER_IDS.routeCasing,
  LAYER_IDS.routeTransit,
  LAYER_IDS.routeWalk,
  LAYER_IDS.routeDisrupted,
];
const POINT_LAYER_IDS: readonly string[] = [LAYER_IDS.points, `${LAYER_IDS.points}-dot`];

/**
 * `GeoJSONFeature` (mapbox-gl's type for `event.features[n]`) declares only
 * the fields it adds on top of `GeoJSON.Feature`; `properties` and
 * `geometry` come from that base type, which does not resolve in this
 * project (see geojson.ts's module doc comment). This narrows a clicked
 * feature to exactly the shape this component reads off it.
 */
type ClickedFeature<Properties> = {
  properties: Properties;
  geometry: { type: "Point"; coordinates: [number, number] };
};

function asClickedFeature<Properties>(feature: unknown): ClickedFeature<Properties> | undefined {
  if (!feature || typeof feature !== "object") return undefined;
  return feature as ClickedFeature<Properties>;
}

function detectWebGl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tokenNotice(resolution: Exclude<MapboxTokenResolution, { status: "ok" }>): string {
  if (resolution.status === "missing") {
    return "Map provider not configured. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the Mapbox view.";
  }
  if (resolution.reason === "secret_token") {
    return "A secret Mapbox token was provided. Use a public pk. token.";
  }
  return "Mapbox token looks invalid.";
}

function FallbackScene({ notice, ...props }: RouteSceneProps & { notice: string }) {
  return (
    <div className="rs-mapbox-fallback">
      <RouteMap2D {...props} />
      <p className="rs-mapbox-notice">{notice}</p>
    </div>
  );
}

/**
 * Mapbox GL JS v3 implementation of the RouteSceneProps contract. Renders
 * the RouteMap2D SVG fallback (with a compact notice line, never the raw
 * token) when the Mapbox token is missing/invalid or WebGL is unavailable.
 */
export function MapboxRouteScene(props: RouteSceneProps) {
  const { city, onWebGlUnavailable } = props;

  const tokenResolution = useMemo(() => getMapboxTokenFromEnv(), []);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const notifiedUnavailableRef = useRef(false);

  useEffect(() => {
    setWebglAvailable(detectWebGl());
  }, []);

  useEffect(() => {
    if (webglAvailable === false && !notifiedUnavailableRef.current) {
      notifiedUnavailableRef.current = true;
      onWebGlUnavailable?.();
    }
  }, [webglAvailable, onWebGlUnavailable]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const styleLoadedRef = useRef(false);
  const lastCameraRef = useRef<CameraResult | null>(null);
  const popupRef = useRef<InstanceType<MapboxGlDefault["Popup"]> | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const canRenderMap = tokenResolution.status === "ok" && webglAvailable === true;

  useEffect(() => {
    if (!canRenderMap || !containerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let map: MapboxMap | null = null;

    function pushAllData(target: MapboxMap) {
      const p = propsRef.current;
      setRouteRoomData(
        target,
        SOURCE_IDS.routes,
        buildRouteFeatures(p.city, p.routes, p.visibleRouteIds, p.displayModes, p.focusedSegmentId, p.disruptedSegmentIds),
      );
      setRouteRoomData(
        target,
        SOURCE_IDS.points,
        buildPointFeatures(p.city, p.routes, p.visibleRouteIds, p.cameraTarget, p.displayModes),
      );
      setRouteRoomData(target, SOURCE_IDS.reports, buildReportFeatures(p.city, p.routes, p.activeReports));
      setRouteRoomData(target, SOURCE_IDS.transfers, buildTransferFeatures(p.routes, p.visibleRouteIds, p.displayModes));
    }

    function attachInteractionHandlers(target: MapboxMap, mapboxgl: MapboxGlDefault) {
      const setPointerCursor = (layerId: string) => {
        target.on("mouseenter", layerId, () => {
          target.getCanvas().style.cursor = "pointer";
        });
        target.on("mouseleave", layerId, () => {
          target.getCanvas().style.cursor = "";
        });
      };

      for (const layerId of ROUTE_LINE_LAYER_IDS) {
        setPointerCursor(layerId);
        target.on("click", layerId, (event: MapMouseEvent) => {
          const feature = asClickedFeature<{ route_id?: string; segment_id?: string }>(event.features?.[0]);
          if (!feature) return;
          const routeId = feature.properties.route_id;
          const segmentId = feature.properties.segment_id;
          if (!routeId) return;
          if (segmentId && propsRef.current.onSelectSegment) {
            propsRef.current.onSelectSegment(routeId, segmentId);
          } else {
            propsRef.current.onSelectRoute(routeId);
          }
        });
      }

      for (const layerId of POINT_LAYER_IDS) {
        setPointerCursor(layerId);
        target.on("click", layerId, (event: MapMouseEvent) => {
          const feature = asClickedFeature<{ landmark_id?: string }>(event.features?.[0]);
          const landmarkId = feature?.properties.landmark_id;
          if (landmarkId) propsRef.current.onSelectLandmark?.(landmarkId);
        });
      }

      setPointerCursor(LAYER_IDS.reports);
      target.on("click", LAYER_IDS.reports, (event: MapMouseEvent) => {
        const feature = asClickedFeature<{ route_id?: string; segment_id?: string }>(event.features?.[0]);
        if (feature?.properties.route_id && feature.properties.segment_id) {
          propsRef.current.onSelectSegment?.(feature.properties.route_id, feature.properties.segment_id);
        }
      });
      target.on("mouseenter", LAYER_IDS.reports, (event: MapMouseEvent) => {
        target.getCanvas().style.cursor = "pointer";
        const feature = asClickedFeature<{ category?: string; confidence?: string }>(event.features?.[0]);
        if (!feature) return;
        popupRef.current?.remove();
        const category = feature.properties.category?.replace(/_/g, " ") ?? "report";
        const confidence = feature.properties.confidence ?? "unknown";
        popupRef.current = new mapboxgl.Popup({ closeButton: false })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(`<strong>${category}</strong><br/>confidence: ${confidence}`)
          .addTo(target);
      });
      target.on("mouseleave", LAYER_IDS.reports, () => {
        popupRef.current?.remove();
        popupRef.current = null;
      });
    }

    (async () => {
      const mod = (await import("mapbox-gl")) as MapboxGlModule;
      const mapboxgl = mod.default;
      if (cancelled || !containerRef.current || tokenResolution.status !== "ok") return;
      mapboxgl.accessToken = tokenResolution.token;

      const initialCamera = computeCamera("overview", { city: propsRef.current.city, routes: propsRef.current.routes });

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/standard",
        center: initialCamera.center ?? initialCamera.bounds?.[0] ?? propsRef.current.city.geometry.center,
        zoom: initialCamera.zoom ?? 14,
        pitch: initialCamera.pitch,
        bearing: initialCamera.bearing,
        maxPitch: 70,
        // The simple `attributionControl: true` boolean cannot express
        // `compact: false`; add Mapbox's own AttributionControl explicitly
        // instead so the full (non-collapsed) attribution stays visible.
        attributionControl: false,
      });
      map.addControl(new mapboxgl.AttributionControl({ compact: false }));
      if (initialCamera.bounds) {
        map.fitBounds(initialCamera.bounds, {
          pitch: initialCamera.pitch,
          bearing: initialCamera.bearing,
          padding: initialCamera.padding,
          duration: 0,
        });
      }
      lastCameraRef.current = initialCamera;
      mapRef.current = map;

      map.on("style.load", () => {
        if (!map) return;
        applyStandardConfig(map);
        addRouteRoomLayers(map);
        styleLoadedRef.current = true;
        pushAllData(map);
        attachInteractionHandlers(map, mapboxgl);
      });
    })();

    return () => {
      cancelled = true;
      styleLoadedRef.current = false;
      popupRef.current?.remove();
      popupRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
    };
    // Map is created once per mount; prop-driven updates flow through the
    // data/camera effects below instead of recreating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRenderMap]);

  // Data effect: push fresh GeoJSON whenever the relevant props change.
  // No-op (and no error) if the style has not finished loading yet; the
  // "style.load" handler above always pushes the latest propsRef data once
  // it fires, so nothing is lost by skipping here.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    const p = propsRef.current;
    setRouteRoomData(
      map,
      SOURCE_IDS.routes,
      buildRouteFeatures(p.city, p.routes, p.visibleRouteIds, p.displayModes, p.focusedSegmentId, p.disruptedSegmentIds),
    );
    setRouteRoomData(
      map,
      SOURCE_IDS.points,
      buildPointFeatures(p.city, p.routes, p.visibleRouteIds, p.cameraTarget, p.displayModes),
    );
    setRouteRoomData(map, SOURCE_IDS.reports, buildReportFeatures(p.city, p.routes, p.activeReports));
    setRouteRoomData(map, SOURCE_IDS.transfers, buildTransferFeatures(p.routes, p.visibleRouteIds, p.displayModes));
  }, [
    props.city,
    props.routes,
    props.visibleRouteIds,
    props.displayModes,
    props.focusedSegmentId,
    props.disruptedSegmentIds,
    props.cameraTarget,
    props.activeReports,
  ]);

  // Camera effect: feature preset when focused/targeted, else overview.
  // Reset to overview when both become undefined again (this IS that case,
  // since the preset falls back to "overview").
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    const preset = props.focusedSegmentId || props.cameraTarget ? "feature" : "overview";
    const camera = computeCamera(preset, {
      city: props.city,
      routes: props.routes,
      focusedSegmentId: props.focusedSegmentId,
      landmarkId: props.cameraTarget,
    });
    if (lastCameraRef.current && cameraEquals(lastCameraRef.current, camera)) return;
    lastCameraRef.current = camera;
    const animate = !(props.reducedMotion ?? prefersReducedMotion());
    const duration = animate ? undefined : 0;
    if (camera.bounds) {
      map.fitBounds(camera.bounds, { pitch: camera.pitch, bearing: camera.bearing, padding: camera.padding, duration });
    } else if (camera.center) {
      map.easeTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
        padding: camera.padding,
        duration,
      });
    }
  }, [props.focusedSegmentId, props.cameraTarget, props.city, props.routes, props.reducedMotion]);

  // Manual reset: window CustomEvent("routeroom:reset-view"). Lets the UI
  // agent wire a "Reset view" button without changing RouteSceneProps.
  useEffect(() => {
    function handleReset() {
      const map = mapRef.current;
      if (!map || !styleLoadedRef.current) return;
      const camera = computeCamera("overview", { city: propsRef.current.city, routes: propsRef.current.routes });
      lastCameraRef.current = camera;
      const animate = !(propsRef.current.reducedMotion ?? prefersReducedMotion());
      const duration = animate ? undefined : 0;
      if (camera.bounds) {
        map.fitBounds(camera.bounds, { pitch: camera.pitch, bearing: camera.bearing, padding: camera.padding, duration });
      }
    }
    window.addEventListener(RESET_VIEW_EVENT, handleReset);
    return () => window.removeEventListener(RESET_VIEW_EVENT, handleReset);
  }, []);

  if (tokenResolution.status !== "ok") {
    return <FallbackScene {...props} notice={tokenNotice(tokenResolution)} />;
  }
  if (webglAvailable === null) {
    return (
      <div className="rs-mapbox" aria-label={`${city.name} route scene`}>
        <div className="rs-loading">Loading map…</div>
      </div>
    );
  }
  if (webglAvailable === false) {
    return <FallbackScene {...props} notice="3D map unavailable in this browser." />;
  }

  return (
    <div className="rs-mapbox" aria-label={`${city.name} interactive route scene`}>
      <div ref={containerRef} className="rs-mapbox-canvas" />
      <div className="rs-mapbox-attribution">
        Routes and stops: RouteRoom curated snapshot; map: © Mapbox © OpenStreetMap. {city.geometry.source.attribution}
      </div>
    </div>
  );
}
