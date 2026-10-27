import { NextRequest, NextResponse } from "next/server"
import type { OSRMRouteResponse, OSRMRoute } from "@/types/osrm-types"
import { fetchOSRMRoute, getOSRMDuration, getOSRMDistance, getOSRMPolyline, getOSRMSteps, isOSRRouteValid } from "@/lib/osrm-utils"

const MIN_LAT = -90
const MAX_LAT = 90
const MIN_LON = -180
const MAX_LON = 180
const MIN_DISTANCE_KM = 0.1
const MAX_DISTANCE_KM = 5000
const ROUTE_CACHE_TTL = 3600

const routeCache = new Map<string, { data: Awaited<ReturnType<typeof fetchOSRMRoute>>; expiry: number }>()

function isValidCoordinate(lat: number, lon: number): boolean {
  return lat >= MIN_LAT && lat <= MAX_LAT && lon >= MIN_LON && lon <= MAX_LON
}

function buildCacheKey(origin: [number, number], destination: [number, number]): string {
  const originStr = origin.join(",")
  const destStr = destination.join(",")
  const sorted = originStr < destStr ? `${originStr}|${destStr}` : `${destStr}|${originStr}`
  return `osrm-route:${sorted}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const originStr = searchParams.get("origin")
    if (!originStr) {
      return NextResponse.json(
        { error: "Missing required query parameter: 'origin' (format: 'lon,lat')." },
        { status: 400 }
      )
    }
    const destinationStr = searchParams.get("destination")
    if (!destinationStr) {
      return NextResponse.json(
        { error: "Missing required query parameter: 'destination' (format: 'lon,lat')." },
        { status: 400 }
      )
    }
    const originParts = originStr.split(",").map((p) => parseFloat(p.trim()))
    const destinationParts = destinationStr.split(",").map((p) => parseFloat(p.trim()))
    const originLon = originParts[0]
    const originLat = originParts[1]
    const destLon = destinationParts[0]
    const destLat = destinationParts[1]

    if (
      originParts.length !== 2 ||
      isNaN(originLon) ||
      isNaN(originLat) ||
      !isValidCoordinate(originLat, originLon)
    ) {
      return NextResponse.json(
        {
          error: "Invalid origin coordinate format. Expected 'lon,lat' with valid ranges: lat [-90,90], lon [-180,180].",
        },
        { status: 400 }
      )
    }

    if (
      destinationParts.length !== 2 ||
      isNaN(destLon) ||
      isNaN(destLat) ||
      !isValidCoordinate(destLat, destLon)
    ) {
      return NextResponse.json(
        {
          error: "Invalid destination coordinate format. Expected 'lon,lat' with valid ranges: lat [-90,90], lon [-180,180].",
        },
        { status: 400 }
      )
    }

    const originLatRad = (originLat * Math.PI) / 180
    const destLatRad = (destLat * Math.PI) / 180
    const dLat = ((destLat - originLat) * Math.PI) / 180
    const dLon = ((destLon - originLon) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(originLatRad) * Math.cos(destLatRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const distanceKm = 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))

    if (distanceKm < MIN_DISTANCE_KM) {
      return NextResponse.json(
        {
          error: `Origin and destination are too close (${distanceKm.toFixed(2)} km). Minimum distance is ${MIN_DISTANCE_KM} km.`,
        },
        { status: 400 }
      )
    }

    if (distanceKm > MAX_DISTANCE_KM) {
      return NextResponse.json(
        {
          error: `Origin and destination are too far apart (${distanceKm.toFixed(1)} km). Maximum allowed distance is ${MAX_DISTANCE_KM} km.`,
        },
        { status: 400 }
      )
    }

    const profile = (searchParams.get("profile") || "car") as "car" | "foot" | "bike" | "truck"

    const cacheKey = buildCacheKey([originLon, originLat], [destLon, destLat])
    const cached = routeCache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json(cached.data)
    }

    const originCoord: [number, number] = [originLon, originLat]
    const destCoord: [number, number] = [destLon, destLat]

    let routeData: Awaited<ReturnType<typeof fetchOSRMRoute>>
    try {
      routeData = await fetchOSRMRoute(originCoord, destCoord, profile)
    } catch (fetchError: any) {
      const errorMessage = fetchError.message || "Unknown OSRM error"
      if (errorMessage.includes("No route") || fetchError.code === "NoRoute") {
        return NextResponse.json(
          {
            error: "No route found between the specified origin and destination.",
            code: "NoRoute",
          },
          { status: 404 }
        )
      }
      console.error("OSRM fetch error:", fetchError)
      return NextResponse.json(
        {
          error: "Failed to fetch route from routing service. Please try again later.",
          details: errorMessage,
        },
        { status: 502 }
      )
    }

    if (!isOSRRouteValid(routeData) || !routeData.routes || routeData.routes.length === 0) {
      return NextResponse.json(
        {
          error: "Routing service returned an invalid response.",
        },
        { status: 502 }
      )
    }

    const firstRoute = routeData.routes[0]
    const response = {
      code: routeData.code,
      waypoints: routeData.waypoints,
      distance: getOSRMDistance(routeData),
      duration: getOSRMDuration(routeData),
      geometry: getOSRMPolyline(routeData),
      overviewCoordinates: routeData.routes[0].overview.coordinates,
      steps: routeData.routes[0].steps,
      summary: firstRoute.summary,
      weight_name: firstRoute.weight_name,
    }

    routeCache.set(cacheKey, {
      data: response,
      expiry: Date.now() + ROUTE_CACHE_TTL * 1000,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Routing API unexpected error:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing the routing request.",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
