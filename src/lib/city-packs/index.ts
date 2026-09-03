import type { CityPack } from "../types";
import { auroraCity } from "./aurora-city";
import { harborCity } from "./harbor-city";

export const cityPacks: CityPack[] = [auroraCity, harborCity];

export const defaultCityPack: CityPack = auroraCity;

export function getCityPack(id: string): CityPack | undefined {
  return cityPacks.find((pack) => pack.id === id);
}

const TRANSIT_MODES = new Set(["tram", "bus", "metro", "bike", "ferry"]);

/**
 * Checks a city pack for internal consistency and returns a list of
 * plain-language problem descriptions. An empty array means the pack is
 * valid.
 *
 * Note on the transfers rule: transfers is checked against the number of
 * transit segments on the route (not transit segments minus one). The
 * hackathon city packs count every boarding of a tram/bus/metro/ferry as a
 * transfer point, including the first one from a walking leg, which matches
 * how the seed data is authored.
 */
export function validateCityPack(city: CityPack): string[] {
  const problems: string[] = [];

  const landmarkIds = new Set(city.landmarks.map((landmark) => landmark.id));
  const entranceLandmarkIds = new Set(
    city.landmarks.filter((landmark) => landmark.kind === "entrance").map((landmark) => landmark.id),
  );

  // Duplicate route ids
  const seenRouteIds = new Set<string>();
  for (const route of city.routeOptions) {
    if (seenRouteIds.has(route.id)) {
      problems.push(`Duplicate route id "${route.id}".`);
    }
    seenRouteIds.add(route.id);
  }

  // Duplicate segment ids (across the whole pack)
  const seenSegmentIds = new Set<string>();
  const allSegmentIds = new Set<string>();
  for (const route of city.routeOptions) {
    for (const segment of route.segments) {
      if (seenSegmentIds.has(segment.id)) {
        problems.push(`Duplicate segment id "${segment.id}".`);
      }
      seenSegmentIds.add(segment.id);
      allSegmentIds.add(segment.id);
    }
  }

  for (const route of city.routeOptions) {
    if (route.segments.length === 0) {
      problems.push(`Route "${route.id}" has no segments.`);
      continue;
    }

    // Segment landmark references
    for (const segment of route.segments) {
      if (!landmarkIds.has(segment.fromLandmarkId)) {
        problems.push(
          `Route "${route.id}" segment "${segment.id}" has fromLandmarkId "${segment.fromLandmarkId}" that is not in the landmarks list.`,
        );
      }
      if (!landmarkIds.has(segment.toLandmarkId)) {
        problems.push(
          `Route "${route.id}" segment "${segment.id}" has toLandmarkId "${segment.toLandmarkId}" that is not in the landmarks list.`,
        );
      }
      if (segment.durationMin > segment.durationMax) {
        problems.push(
          `Route "${route.id}" segment "${segment.id}" has durationMin (${segment.durationMin}) greater than durationMax (${segment.durationMax}).`,
        );
      }
    }

    // Fare and duration ordering
    if (route.fareMin > route.fareMax) {
      problems.push(`Route "${route.id}" has fareMin (${route.fareMin}) greater than fareMax (${route.fareMax}).`);
    }
    if (route.durationMin > route.durationTypical) {
      problems.push(
        `Route "${route.id}" has durationMin (${route.durationMin}) greater than durationTypical (${route.durationTypical}).`,
      );
    }
    if (route.durationTypical > route.durationMax) {
      problems.push(
        `Route "${route.id}" has durationTypical (${route.durationTypical}) greater than durationMax (${route.durationMax}).`,
      );
    }

    // walkingMeters vs sum of walk-segment distances (within 20%)
    const walkSum = route.segments
      .filter((segment) => segment.mode === "walk")
      .reduce((sum, segment) => sum + segment.distanceMeters, 0);
    const tolerance = Math.max(walkSum, route.walkingMeters) * 0.2;
    if (Math.abs(route.walkingMeters - walkSum) > tolerance) {
      problems.push(
        `Route "${route.id}" has walkingMeters (${route.walkingMeters}) that differs from the sum of its walk segments' distanceMeters (${walkSum}) by more than 20 percent.`,
      );
    }

    // transfers vs transit segment count
    const transitSegmentCount = route.segments.filter((segment) => TRANSIT_MODES.has(segment.mode)).length;
    if (transitSegmentCount > 0 && route.transfers !== transitSegmentCount) {
      problems.push(
        `Route "${route.id}" has transfers (${route.transfers}) that does not match its number of transit segments (${transitSegmentCount}).`,
      );
    }

    // First/last segment vs default trip
    const firstSegment = route.segments[0];
    const lastSegment = route.segments[route.segments.length - 1];
    if (firstSegment.fromLandmarkId !== city.defaultTrip.originId) {
      problems.push(
        `Route "${route.id}" starts at "${firstSegment.fromLandmarkId}" instead of the default trip origin "${city.defaultTrip.originId}".`,
      );
    }
    const endsAtValidLandmark =
      lastSegment.toLandmarkId === city.defaultTrip.destinationId || entranceLandmarkIds.has(lastSegment.toLandmarkId);
    if (!endsAtValidLandmark) {
      problems.push(
        `Route "${route.id}" ends at "${lastSegment.toLandmarkId}", which is neither the default trip destination "${city.defaultTrip.destinationId}" nor an entrance landmark.`,
      );
    }
  }

  // Reports reference existing segments
  for (const report of city.reports) {
    if (!allSegmentIds.has(report.segmentId)) {
      problems.push(`Report "${report.id}" has segmentId "${report.segmentId}" that is not in any route.`);
    }
  }

  // Default trip landmark references
  if (!landmarkIds.has(city.defaultTrip.originId)) {
    problems.push(`defaultTrip.originId "${city.defaultTrip.originId}" is not in the landmarks list.`);
  }
  if (!landmarkIds.has(city.defaultTrip.destinationId)) {
    problems.push(`defaultTrip.destinationId "${city.defaultTrip.destinationId}" is not in the landmarks list.`);
  }

  // Default trip timestamps
  const clockAt = Date.parse(city.defaultTrip.clockAt);
  const departAt = Date.parse(city.defaultTrip.departAt);
  const arrivalDeadline = Date.parse(city.defaultTrip.arrivalDeadline);
  if (Number.isNaN(clockAt)) {
    problems.push(`defaultTrip.clockAt "${city.defaultTrip.clockAt}" is not a parseable timestamp.`);
  }
  if (Number.isNaN(departAt)) {
    problems.push(`defaultTrip.departAt "${city.defaultTrip.departAt}" is not a parseable timestamp.`);
  }
  if (Number.isNaN(arrivalDeadline)) {
    problems.push(`defaultTrip.arrivalDeadline "${city.defaultTrip.arrivalDeadline}" is not a parseable timestamp.`);
  }
  if (!Number.isNaN(clockAt) && !Number.isNaN(departAt) && !Number.isNaN(arrivalDeadline)) {
    if (!(clockAt <= departAt && departAt < arrivalDeadline)) {
      problems.push(
        `defaultTrip timestamps are out of order: clockAt (${city.defaultTrip.clockAt}) must be at or before departAt (${city.defaultTrip.departAt}), which must be before arrivalDeadline (${city.defaultTrip.arrivalDeadline}).`,
      );
    }
  }

  return problems;
}
