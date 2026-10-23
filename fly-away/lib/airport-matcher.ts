/**
 * Maps a geocoded location to the closest airport supported by the app.
 *
 * The flight search form (and Duffel) work with IATA airport codes, while
 * the Photon geocoder returns arbitrary coordinates. This helper bridges the
 * two so a place picked in the autocomplete can be resolved to an airport
 * code without replacing the existing airport-code selects.
 */

import { airportCoordinates } from "@/constants/airport-coordinates";
import type { LocationResult } from "@/types/location-autocomplete";

export type AirportMatch = {
  /** IATA code of the matched airport */
  code: string;
  /** City of the matched airport */
  city: string;
  /** Great-circle distance from the picked location, in kilometres */
  distanceKm: number;
  /** True when the city name matched exactly */
  exact: boolean;
};

/** Maximum radius (km) within which a location is considered the same city. */
const NEARBY_RADIUS_KM = 80;

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two coordinates, in kilometres.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Finds the airport that best matches a geocoded location.
 *
 * Resolution order:
 * 1. Exact match on the city name (case-insensitive)
 * 2. Nearest airport by great-circle distance
 *
 * Returns `null` when nothing is close enough to be considered the same city.
 */
export function matchAirport(
  location: Pick<LocationResult, "name" | "city" | "lat" | "lon">,
): AirportMatch | null {
  if (airportCoordinates.length === 0) {
    return null;
  }

  const candidateCity = normalize(location.city);
  const candidateName = normalize(location.name);

  // 1. Exact city-name match.
  const exact = airportCoordinates.find((airport) => {
    const airportCity = normalize(airport.city);

    return (
      (candidateCity !== "" && airportCity === candidateCity) ||
      (candidateName !== "" && airportCity === candidateName)
    );
  });

  if (exact) {
    return {
      code: exact.code,
      city: exact.city,
      distanceKm: distanceKm(location.lat, location.lon, exact.lat, exact.lon),
      exact: true,
    };
  }

  // 2. Nearest airport by distance.
  let nearest: AirportMatch | null = null;

  for (const airport of airportCoordinates) {
    const km = distanceKm(
      location.lat,
      location.lon,
      airport.lat,
      airport.lon,
    );

    if (!nearest || km < nearest.distanceKm) {
      nearest = {
        code: airport.code,
        city: airport.city,
        distanceKm: km,
        exact: false,
      };
    }
  }

  if (!nearest || nearest.distanceKm > NEARBY_RADIUS_KM) {
    return null;
  }

  return nearest;
}
