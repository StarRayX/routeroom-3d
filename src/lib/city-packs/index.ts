import { distanceMeters, pathLengthMeters } from "../geo";
import type { CityPack } from "../types";
import { amsterdamCity } from "./amsterdam/amsterdam";

export const cityPacks: CityPack[] = [amsterdamCity];

export const defaultCityPack: CityPack = amsterdamCity;

export function getCityPack(id: string): CityPack | undefined {
  return cityPacks.find((pack) => pack.id === id);
}

export function getTrip(city: CityPack, tripId: string) {
  return city.trips.find((trip) => trip.id === tripId);
}

const TRANSIT_MODES = new Set(["tram", "bus", "metro", "train", "bike", "ferry"]);
const M_PER_DEG_LAT = 111_320;

/**
 * Checks a city pack for internal consistency and returns a list of
 * plain-language problem descriptions. An empty array means the pack is
 * valid.
 */
export function validateCityPack(city: CityPack): string[] {
  const problems: string[] = [];

  const landmarkIds = new Set(city.landmarks.map((landmark) => landmark.id));
  const landmarkById = new Map(city.landmarks.map((landmark) => [landmark.id, landmark]));
  const entranceLikeLandmarkIds = new Set(
    city.landmarks
      .filter((landmark) => landmark.kind === "entrance" || landmark.kind === "station" || landmark.kind === "stop")
      .map((landmark) => landmark.id),
  );

  // Duplicate route ids
  const seenRouteIds = new Set<string>();
  for (const route of city.routeOptions) {
    if (seenRouteIds.has(route.id)) problems.push(`Duplicate route id "${route.id}".`);
    seenRouteIds.add(route.id);
  }
  const routeIds = new Set(city.routeOptions.map((route) => route.id));

  // Duplicate segment ids (across the whole pack)
  const seenSegmentIds = new Set<string>();
  const allSegmentIds = new Set<string>();
  for (const route of city.routeOptions) {
    for (const segment of route.segments) {
      if (seenSegmentIds.has(segment.id)) problems.push(`Duplicate segment id "${segment.id}".`);
      seenSegmentIds.add(segment.id);
      allSegmentIds.add(segment.id);
    }
  }

  for (const route of city.routeOptions) {
    if (route.segments.length === 0) {
      problems.push(`Route "${route.id}" has no segments.`);
      continue;
    }

    for (const segment of route.segments) {
      if (!landmarkIds.has(segment.fromLandmarkId)) {
        problems.push(`Route "${route.id}" segment "${segment.id}" has fromLandmarkId "${segment.fromLandmarkId}" that is not in the landmarks list.`);
      }
      if (!landmarkIds.has(segment.toLandmarkId)) {
        problems.push(`Route "${route.id}" segment "${segment.id}" has toLandmarkId "${segment.toLandmarkId}" that is not in the landmarks list.`);
      }
      if (segment.durationMin > segment.durationMax) {
        problems.push(`Route "${route.id}" segment "${segment.id}" has durationMin (${segment.durationMin}) greater than durationMax (${segment.durationMax}).`);
      }
      if (segment.path.length < 2) {
        problems.push(`Route "${route.id}" segment "${segment.id}" has a path with fewer than 2 points.`);
      } else {
        const pathMeters = pathLengthMeters(segment.path);
        const tolerance = Math.max(pathMeters, segment.distanceMeters) * 0.25;
        if (Math.abs(pathMeters - segment.distanceMeters) > tolerance) {
          problems.push(
            `Route "${route.id}" segment "${segment.id}" has distanceMeters (${segment.distanceMeters}) that differs from its path length (${Math.round(pathMeters)}) by more than 25 percent.`,
          );
        }
      }
    }

    if (route.fareMin > route.fareMax) problems.push(`Route "${route.id}" has fareMin (${route.fareMin}) greater than fareMax (${route.fareMax}).`);
    if (route.durationMin > route.durationTypical) {
      problems.push(`Route "${route.id}" has durationMin (${route.durationMin}) greater than durationTypical (${route.durationTypical}).`);
    }
    if (route.durationTypical > route.durationMax) {
      problems.push(`Route "${route.id}" has durationTypical (${route.durationTypical}) greater than durationMax (${route.durationMax}).`);
    }

    const walkSum = route.segments.filter((segment) => segment.mode === "walk").reduce((sum, segment) => sum + segment.distanceMeters, 0);
    const walkTolerance = Math.max(walkSum, route.walkingMeters) * 0.2;
    if (Math.abs(route.walkingMeters - walkSum) > walkTolerance) {
      problems.push(`Route "${route.id}" has walkingMeters (${route.walkingMeters}) that differs from the sum of its walk segments' distanceMeters (${walkSum}) by more than 20 percent.`);
    }

    const transitSegmentCount = route.segments.filter((segment) => TRANSIT_MODES.has(segment.mode)).length;
    const expectedTransfers = Math.max(0, transitSegmentCount - 1);
    if (route.transfers !== expectedTransfers) {
      problems.push(`Route "${route.id}" has transfers (${route.transfers}) that does not equal its number of transit segments minus one (${expectedTransfers}).`);
    }

    const firstSegment = route.segments[0];
    const lastSegment = route.segments[route.segments.length - 1];
    const trip = city.trips.find((candidate) => candidate.routeOptionIds.includes(route.id));
    if (trip) {
      if (firstSegment.fromLandmarkId !== trip.originId) {
        problems.push(`Route "${route.id}" starts at "${firstSegment.fromLandmarkId}" instead of trip "${trip.id}"'s origin "${trip.originId}".`);
      }
      const destination = landmarkById.get(trip.destinationId);
      const endsAtDestination = lastSegment.toLandmarkId === trip.destinationId;
      const endLandmark = landmarkById.get(lastSegment.toLandmarkId);
      const endsNearDestination =
        !endsAtDestination &&
        destination &&
        endLandmark &&
        entranceLikeLandmarkIds.has(lastSegment.toLandmarkId) &&
        distanceMeters(endLandmark.position, destination.position) <= 400;
      if (!endsAtDestination && !endsNearDestination) {
        problems.push(
          `Route "${route.id}" ends at "${lastSegment.toLandmarkId}", which is neither trip "${trip.id}"'s destination "${trip.destinationId}" nor an entrance/station/stop landmark within 400 m of it.`,
        );
      }
    }
  }

  for (const report of city.reports) {
    if (!allSegmentIds.has(report.segmentId)) problems.push(`Report "${report.id}" has segmentId "${report.segmentId}" that is not in any route.`);
    if (report.landmarkId && !landmarkIds.has(report.landmarkId)) problems.push(`Report "${report.id}" has landmarkId "${report.landmarkId}" that is not in the landmarks list.`);
  }

  if (!city.trips.some((trip) => trip.id === city.defaultTripId)) {
    problems.push(`defaultTripId "${city.defaultTripId}" is not in the trips list.`);
  }

  for (const trip of city.trips) {
    if (!landmarkIds.has(trip.originId)) problems.push(`Trip "${trip.id}" originId "${trip.originId}" is not in the landmarks list.`);
    if (!landmarkIds.has(trip.destinationId)) problems.push(`Trip "${trip.id}" destinationId "${trip.destinationId}" is not in the landmarks list.`);
    if (trip.routeOptionIds.length === 0) problems.push(`Trip "${trip.id}" has no routeOptionIds.`);
    for (const routeId of trip.routeOptionIds) {
      if (!routeIds.has(routeId)) problems.push(`Trip "${trip.id}" references routeOptionId "${routeId}" that is not in routeOptions.`);
    }

    const clockAt = Date.parse(trip.clockAt);
    const departAt = Date.parse(trip.departAt);
    const arrivalDeadline = Date.parse(trip.arrivalDeadline);
    if (Number.isNaN(clockAt)) problems.push(`Trip "${trip.id}" clockAt "${trip.clockAt}" is not a parseable timestamp.`);
    if (Number.isNaN(departAt)) problems.push(`Trip "${trip.id}" departAt "${trip.departAt}" is not a parseable timestamp.`);
    if (Number.isNaN(arrivalDeadline)) problems.push(`Trip "${trip.id}" arrivalDeadline "${trip.arrivalDeadline}" is not a parseable timestamp.`);
    if (!Number.isNaN(clockAt) && !Number.isNaN(departAt) && !Number.isNaN(arrivalDeadline)) {
      if (!(clockAt <= departAt && departAt < arrivalDeadline)) {
        problems.push(`Trip "${trip.id}" timestamps are out of order: clockAt (${trip.clockAt}) must be at or before departAt (${trip.departAt}), which must be before arrivalDeadline (${trip.arrivalDeadline}).`);
      }
    }
  }

  // Geometry checks
  const geometry = city.geometry;
  if (geometry.detailZones.length === 0) problems.push("geometry.detailZones is empty; at least one detail zone is required.");
  if (geometry.source.attribution.trim().length === 0) problems.push("geometry.source.attribution is empty.");
  if (geometry.source.license !== "ODbL-1.0") problems.push(`geometry.source.license is "${geometry.source.license}", expected "ODbL-1.0".`);
  if (city.attribution.length === 0) problems.push("city.attribution is empty.");

  const { bounds } = geometry;
  const slackMeters = 200;
  const midLat = (bounds.south + bounds.north) / 2;
  const cosLat = Math.max(0.01, Math.cos((midLat * Math.PI) / 180));
  const slackLat = slackMeters / M_PER_DEG_LAT;
  const slackLng = slackMeters / (M_PER_DEG_LAT * cosLat);
  const slackBounds = {
    west: bounds.west - slackLng,
    east: bounds.east + slackLng,
    south: bounds.south - slackLat,
    north: bounds.north + slackLat,
  };
  let outOfBoundsCount = 0;
  for (const feature of geometry.features) {
    for (const [lng, lat] of feature.coordinates) {
      if (lng < slackBounds.west || lng > slackBounds.east || lat < slackBounds.south || lat > slackBounds.north) {
        outOfBoundsCount += 1;
      }
    }
  }
  if (outOfBoundsCount > 0) problems.push(`${outOfBoundsCount} geometry coordinate(s) fall outside geometry.bounds plus ${slackMeters} m of slack.`);

  return problems;
}
