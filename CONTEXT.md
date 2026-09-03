# RouteRoom Vocabulary

This file is a glossary, not an implementation specification.

## RouteRoom

The product name for the shared human-agent route decision experience.

## Route decision room

The shared workspace where a person and an agent inspect route options, adjust priorities, discuss tradeoffs, and create a route plan.

## City pack

A replaceable bundle of city-specific places, map geometry in real-world coordinates, trips with their route options, transport modes, currency, timezone, locale, data attribution, and local observations. The product is city-agnostic; a city pack is data, never product identity.

## Demo city

The one real city district shown in the hackathon demo, built from a curated snapshot of public map data. It demonstrates the product without limiting the product's global scope. A demo city is never a fictional place.

## Trip

A fixed origin, destination, and arrival deadline that a city pack ships with, together with the route options curated for it. RouteRoom compares the route options of a trip. It does not compute routes between arbitrary places.

_Avoid_: query, search, journey

## Curated snapshot

Route options, transit details, and map geometry captured and reviewed at a stated source date. A curated snapshot carries evidence freshness and confidence. It is an estimate, not live directions.

_Avoid_: live directions, real-time routing

## Route option

One possible way to travel a trip, including its segments, time range, cost range, transfers, walking, accessibility information, confidence, and tradeoffs.

## Route segment

A meaningful leg of a route, such as a walk to a station, a train ride, a bus ride, or a final walk to an entrance.

## Primary route

The route currently preferred under the person's stated priorities.

## Backup route

A prepared alternative used when a defined condition makes the primary route less suitable.

## Observation

A time-bounded report about a route segment or place, such as a delay, blocked path, crowding, or accessibility issue. An observation is not automatically verified truth.

## Evidence freshness

How recently the source of a route estimate, map geometry, or observation was updated or observed.

## Confidence

The product's estimate of how much trust to place in a route value or observation, based on provenance, recency, and completeness. Confidence is not a guarantee.

## City-pack contributor

A person or agent that proposes structured local route knowledge for review. Contributors may improve coverage, but they do not publish unverified facts automatically.

## Spatial explanation layer

The 3D map view used to make route geometry, entrances, transfers, walking, and observations easier to understand. It is a visual explanation surface, not the product's core data source.

## Scene projection

The mapping from a city pack's real-world coordinates to the local meters the spatial explanation layer draws in. Distances and directions in the scene match the real district.

## Corridor

The complete, geographically truthful geometry of a trip from origin to destination as shown in the spatial explanation layer. The whole corridor is visible; detail varies along it.

## Detail zone

A part of the corridor rendered with individual block models because a decision happens there: the origin, transfers, stations and stops, walking segments, and venue entrances.

## Merged block

Neutral building geometry outside a detail zone, merged into a few simplified shapes so the corridor stays legible and cheap to render. A merged block carries no decision-relevant detail.

_Avoid_: background buildings, scenery

## Block model

A simplified extrusion of a real building footprint from the city pack's geometry. It communicates spatial context without attempting photorealistic 3D reconstruction.

## Human confirmation

An explicit human approval of the exact action and content shown before a plan is saved, shared, or an observation is published.

## Agent proposal

A reversible suggestion produced by an agent. It becomes a committed product state only after the relevant human confirmation.

## Provider adapter

The boundary between the route-room experience and a source of map geometry, geocoding, routing, or tiles. The product can change providers without changing the user-facing route concepts. In the hackathon MVP the only provider is the static city pack.
