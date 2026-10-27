/**
 * Types for OSRM (Open Source Routing Machine) Route API response.
 *
 * OSRM API endpoint pattern:
 * GET https://router.project-osrm.org/route/v1/{profile}/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson
 *
 * Public demo server: https://router.project-osrm.org
 * Self-hosted option available for production with SLA and rate limit control.
 */

/** OSRM root response shape */
export type OSRMRouteResponse = {
  code: "Ok" | "NoRoute" | "Error"
  waypoints: [number, number][]
  routes?: OSRMRoute[]
  error?: string
}

/** Individual route returned by OSRM */
export type OSRMRoute = {
  /** Unique identifier for this route */
  constructor: string
  /** Summary text (e.g. "via I-95 N") */
  summary: string
  /** Duration in seconds */
  duration: number
  /** Distance in meters */
  distance: number
  /** Duration text description (e.g. "2h 30m") */
  duration_text: string
  /** Distance text description (e.g. "150.3 km") */
  distance_text: string
  /** Polyline-encoded geometry string (alternative to overview.geojson) */
  geometry: string
  /** Full GeoJSON LineString for the route overview */
  overview: OSRMRouteOverview
  /** Step-by-step instructions for the route */
  steps: OSRMRouteStep[]
  /** Weight name (e.g. "duration", "distance") */
  weight_name: string
  /** Additional weight value */
  weight: number
}

/** Route overview with GeoJSON LineString */
export type OSRMRouteOverview = {
  /** GeoJSON geometry type */
  type: "LineString"
  /** Array of [longitude, latitude] coordinate pairs */
  coordinates: [number, number][]
}

/** Individual step within a route */
export type OSRMRouteStep = {
  /** Step duration in seconds */
  duration: number
  /** Step distance in meters */
  distance: number
  /** Step instruction text */
  instruction: string
  /** maneuver name (e.g. "Exit left", "Continue") */
  maneuver: string
  /** Distance along the route where this step starts */
  offset: number
  /** Duration along the route where this step starts */
  duration_offset: number
  /** Optional text for the step */
  mode?: string
  /** Optional arrival road index */
  arrivalRoadIndex?: number
  /** Optional name of the road */
  name?: string
  /** Optional exit number */
  exit?: number
  /** Optional distance to the next turn */
  distance_to_next?: number
}