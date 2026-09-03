/**
 * Scene projection (ADR 0005): city packs store [longitude, latitude]; the
 * scene draws local meters around the pack's projection center. This is an
 * equirectangular approximation, accurate to well under 1 percent over a
 * 10 km corridor, which is all a district scene needs.
 *
 * Scene axes: x east, z SOUTH (three.js has z toward the viewer, so north is
 * negative z), y up. One scene unit = SCENE_METERS_PER_UNIT meters.
 */

import type { CityGeometry, LngLat, Point3 } from "./types";

export const EARTH_RADIUS_M = 6_371_008.8;
export const SCENE_METERS_PER_UNIT = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export type Projector = {
  /** Meters east and north of the center. */
  toMeters: (point: LngLat) => { east: number; north: number };
  /** Scene [x, y, z] with the given elevation in meters (default 0). */
  toScene: (point: LngLat, elevationMeters?: number) => Point3;
  /** Inverse of toScene for x/z. */
  fromScene: (x: number, z: number) => LngLat;
  metersPerUnit: number;
};

export function createProjector(center: LngLat, metersPerUnit: number = SCENE_METERS_PER_UNIT): Projector {
  const cosLat = Math.cos(toRad(center[1]));
  const toMeters = (point: LngLat) => ({
    east: toRad(point[0] - center[0]) * cosLat * EARTH_RADIUS_M,
    north: toRad(point[1] - center[1]) * EARTH_RADIUS_M,
  });
  return {
    toMeters,
    toScene: (point, elevationMeters = 0) => {
      const { east, north } = toMeters(point);
      return [east / metersPerUnit, elevationMeters / metersPerUnit, -north / metersPerUnit];
    },
    fromScene: (x, z) => {
      const east = x * metersPerUnit;
      const north = -z * metersPerUnit;
      return [center[0] + (east / (cosLat * EARTH_RADIUS_M)) * (180 / Math.PI), center[1] + (north / EARTH_RADIUS_M) * (180 / Math.PI)];
    },
    metersPerUnit,
  };
}

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Length of a polyline in meters. */
export function pathLengthMeters(path: LngLat[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) total += distanceMeters(path[index - 1], path[index]);
  return total;
}

/** Point at a fraction (0..1) along a polyline by length. */
export function pointAlong(path: LngLat[], fraction: number): LngLat {
  if (path.length === 0) return [0, 0];
  if (path.length === 1 || fraction <= 0) return path[0];
  const total = pathLengthMeters(path);
  if (total === 0 || fraction >= 1) return path[path.length - 1];
  let remaining = fraction * total;
  for (let index = 1; index < path.length; index += 1) {
    const legLength = distanceMeters(path[index - 1], path[index]);
    if (remaining <= legLength) {
      const t = legLength === 0 ? 0 : remaining / legLength;
      const [x0, y0] = path[index - 1];
      const [x1, y1] = path[index];
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    remaining -= legLength;
  }
  return path[path.length - 1];
}

export function midpoint(path: LngLat[]): LngLat {
  return pointAlong(path, 0.5);
}

/** Axis-aligned bounds of a set of points. */
export function boundsOf(points: LngLat[]): CityGeometry["bounds"] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return { west, south, east, north };
}

/** Bounds center. */
export function boundsCenter(bounds: CityGeometry["bounds"]): LngLat {
  return [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2];
}

/** Is the point within `radiusMeters` of `center`? */
export function withinRadius(point: LngLat, center: LngLat, radiusMeters: number): boolean {
  return distanceMeters(point, center) <= radiusMeters;
}
