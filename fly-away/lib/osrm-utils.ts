import type {
  OSRMRouteResponse,
  OSRMRoute,
  OSRMRouteOverview,
  OSRMRouteStep,
} from "@/types/osrm-types"

/**
 * OSRM (Open Source Routing Machine) Routing Utility
 *
 * Provides functions to fetch routes from the OSRM API.
 *
 * API endpoint pattern:
 * GET https://{base_url}/route/v1/{profile}/{waypoints}?overview={overview_level}&geometries={geometry_format}
 *
 * Profile options: car, foot, bike, truck
 *
 * Public demo server: https://router.project-osrm.org (MVP, no SLA)
 * Self-hosted: Recommended for production with custom SLA and rate limits
 *
 * Rate limits: Public demo server has unspecified limits; self-hosted preferred for
 * production workloads. See: https://github.com/Project-OSRM/osrm-backend/blob/master/docs/api.md
 */

/**
 * Fetches a route from the OSRM API between origin and destination coordinates.
 *
 * @param origin - [longitude, latitude] of the origin point
 * @param destination - [longitude, latitude] of the destination point
 * @param profile - travel mode profile (default: "car"). Options: "car", "foot", "bike", "truck"
 * @param baseUrl - OSRM base URL (uses NEXT_PUBLIC_OSRM_BASE_URL env var if not provided)
 *
 * @returns Promise resolving to the OSRM route response, or throws on error
 *
 * @example
 * // Fetch a driving route between two points
 * const route = await fetchOSRMRoute(
 *   [-73.985, 40.747],   // origin (lon, lat)
 *   [-73.975, 40.757],   // destination (lon, lat)
 *   "car"
 * )
 */
export async function fetchOSRMRoute(
  origin: [number, number],
  destination: [number, number],
  profile: string = process.env.NEXT_PUBLIC_OSRM_PROFILE ?? "car",
  baseUrl?: string,
): Promise<OSRMRouteResponse> {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_OSRM_BASE_URL

  if (!base) {
    throw new Error(
      "OSRM base URL is not configured. Set NEXT_PUBLIC_OSRM_BASE_URL environment variable.",
    )
  }

  // OSRM API endpoint: /route/v1/{profile}/{lon1,lat1};{lon2,lat2}
  const originStr = origin.join(",")
  const destinationStr = destination.join(",")
  const url = `${base}/route/v1/${profile}/${originStr};${destinationStr}?overview=full&geometries=geojson`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    // No cache control - OSRM responses can be cached on the client side
    // with appropriate TTL based on application needs
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `OSRM API error ${response.status}: ${errorData.message || response.statusText}`,
    )
  }

  const data: OSRMRouteResponse = await response.json()

  if (data.code !== "Ok") {
    throw new Error(
      `OSRM routing failed: ${data.error || data.code || "Unknown error"}. No route found between ${originStr} and ${destinationStr}.`,
    )
  }

  return data
}

/**
 * Extracts the polyline geometry from an OSRM route response.
 *
 * @param response - OSRM route response
 * @returns The encoded polyline string (or null if no routes available)
 */
export function getOSRMPolyline(response: OSRMRouteResponse): string | null {
  if (!response.routes || response.routes.length === 0) {
    return null
  }
  return response.routes[0].geometry
}

/**
 * Extracts the overview GeoJSON coordinates from an OSRM route response.
 *
 * @param response - OSRM route response
 * @returns Array of [longitude, latitude] coordinate pairs, or null if no routes available
 */
export function getOSRMOverviewCoordinates(
  response: OSRMRouteResponse,
): [number, number][] | null {
  if (!response.routes || response.routes.length === 0) {
    return null
  }
  return response.routes[0].overview.coordinates
}

/**
 * Extracts the duration (in seconds) from the first route in the response.
 *
 * @param response - OSRM route response
 * @returns Duration in seconds, or 0 if no routes available
 */
export function getOSRMDuration(response: OSRMRouteResponse): number {
  if (!response.routes || response.routes.length === 0) {
    return 0
  }
  return response.routes[0].duration
}

/**
 * Extracts the distance (in meters) from the first route in the response.
 *
 * @param response - OSRM route response
 * @returns Distance in meters, or 0 if no routes available
 */
export function getOSRMDistance(response: OSRMRouteResponse): number {
  if (!response.routes || response.routes.length === 0) {
    return 0
  }
  return response.routes[0].distance
}

/**
 * Extracts step-by-step instructions from the first route in the response.
 *
 * @param response - OSRM route response
 * @returns Array of step instructions, or empty array if no routes available
 */
export function getOSRMSteps(response: OSRMRouteResponse): OSRMRouteStep[] {
  if (!response.routes || response.routes.length === 0) {
    return []
  }
  return response.routes[0].steps
}

/**
 * Checks if the OSRM response indicates a valid route was found.
 *
 * @param response - OSRM route response
 * @returns True if a route was found, false otherwise
 */
export function isOSRRouteValid(response: OSRMRouteResponse): boolean {
  return (
    response.code === "Ok" &&
    response.routes !== undefined &&
    response.routes.length > 0
  )
}

/**
 * Configuration interface for OSRM routing options.
 */
export interface OSRMRouteOptions {
  /** Travel mode profile. Options: "car", "foot", "bike", "truck" */
  profile?: string
  /** Custom OSRM base URL. If not provided, uses NEXT_PUBLIC_OSRM_BASE_URL env var */
  baseUrl?: string
  /** Whether to include the full overview geometry (default: true) */
  overview?: boolean
  /** Geometry format: "geojson" or "polyline" (default: "geojson") */
  geometries?: "geojson" | "polyline"
}
