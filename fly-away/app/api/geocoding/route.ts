import { NextRequest, NextResponse } from "next/server";
import {
  getCached,
  setCached,
  buildCacheKey,
} from "@/lib/weather-cache";
import { PHOTON_CONFIG } from "@/lib/photon-config";
import type { GeocodingResult } from "@/types/photon";

export const runtime = "nodejs";

// Minimum and maximum query length for validation
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

// Sanitized response shape returned to the client
type GeocodingApiResponse = {
  query: string;
  count: number;
  results: Array<{
    name: string;
    city?: string;
    state?: string;
    country: string;
    countryCode: string;
    lat: number;
    lon: number;
  }>;
};

type GeocodingError = {
  error: string;
  details?: number | string;
};

/**
 * Builds the Photon forward geocoding URL from query parameters.
 */
function buildPhotonUrl(q: string): string {
  const searchParams = new URLSearchParams({
    q,
    limit: String(PHOTON_CONFIG.defaultLimit),
    lang: PHOTON_CONFIG.defaultLang,
  });
  return `${PHOTON_CONFIG.baseUrl}?${searchParams.toString()}`;
}

/**
 * Validates the search query. Returns an error message if invalid, otherwise undefined.
 */
function validateQuery(q?: string): string | undefined {
  if (!q || q.trim().length === 0) {
    return "Query parameter 'q' is required.";
  }
  const trimmed = q.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return `Query must be at least ${MIN_QUERY_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return `Query must be at most ${MAX_QUERY_LENGTH} characters.`;
  }
  // Reject queries that are only whitespace or special characters
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return "Query must contain at least one alphanumeric character.";
  }
  return undefined;
}

/**
 * Normalizes Photon results into the client-facing response shape.
 */
function normalizeResults(
  results: GeocodingResult[],
): GeocodingApiResponse["results"] {
  return results.map((r) => ({
    name: r.name,
    city: r.city,
    state: r.state,
    country: r.country,
    countryCode: r.countryCode,
    lat: r.lat,
    lon: r.lon,
  }));
}

export async function GET(request: NextRequest) {
  // Validate Photon configuration
  if (!PHOTON_CONFIG.baseUrl) {
    return NextResponse.json(
      { error: "Geocoding service is not configured." } as GeocodingError,
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  // ── Input validation ──
  const validationError = validateQuery(q);
  if (validationError) {
    return NextResponse.json(
      { error: validationError } as GeocodingError,
      { status: 400 },
    );
  }

  const trimmedQuery = q!.trim();

  // ── Caching ──
  const cacheKey = buildCacheKey("geocoding", { q: trimmedQuery });
  const cached = getCached<GeocodingApiResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ── Call Photon API ──
  const url = buildPhotonUrl(trimmedQuery);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PHOTON_CONFIG.requestTimeoutMs),
    });

    // Parse JSON safely (malformed provider responses)
    const rawData = (await response.json().catch(() => null)) as
      | { features?: unknown; error?: string; message?: string }
      | null;

    if (!response.ok) {
      // Rate limit (429) — cache briefly to avoid hammering the provider
      if (response.status === 429) {
        setCached(
          cacheKey,
          {
            error:
              rawData?.error ??
              rawData?.message ??
              "Geocoding rate limit exceeded. Please try again later.",
            details: 429,
          } as GeocodingError,
          60_000, // 1 minute
        );
        return NextResponse.json(
          {
            error:
              rawData?.error ??
              rawData?.message ??
              "Geocoding rate limit exceeded. Please try again later.",
            details: 429,
          } as GeocodingError,
          { status: 429 },
        );
      }

      console.error("Photon geocoding API error", {
        status: response.status,
        message: rawData?.error ?? rawData?.message,
      });

      return NextResponse.json(
        {
          error:
            rawData?.error ?? rawData?.message ?? "Geocoding lookup failed.",
          details: response.status,
        } as GeocodingError,
        { status: response.status },
      );
    }

    // ── Malformed provider response handling ──
    if (!rawData || !Array.isArray(rawData.features)) {
      console.error("Photon geocoding malformed response", {
        status: response.status,
        body: rawData,
      });
      return NextResponse.json(
        {
          error:
            "Received an invalid response from the geocoding service.",
        } as GeocodingError,
        { status: 502 },
      );
    }

    // ── Normalize results ──
    const features = rawData.features as Array<{
      properties: {
        name: string;
        city?: string;
        state?: string;
        country: string;
        countrycode: string;
      };
      geometry: {
        coordinates: [number, number];
      };
    }>;

    const results: GeocodingResult[] = features.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return {
        name: f.properties.name,
        city: f.properties.city,
        state: f.properties.state,
        country: f.properties.country,
        countryCode: f.properties.countrycode,
        lat,
        lon,
        osmType: "",
        osmId: 0,
        raw: f as unknown as never,
      };
    });

    const apiResponse: GeocodingApiResponse = {
      query: trimmedQuery,
      count: results.length,
      results: normalizeResults(results),
    };

    // Cache successful response (1 hour TTL — location data changes infrequently)
    setCached(cacheKey, apiResponse, PHOTON_CONFIG.cacheTtlMs);

    return NextResponse.json(apiResponse);
  } catch (error) {
    // Handle timeouts, network failures, DNS errors, etc.
    if (error instanceof Error) {
      if (
        error.name === "AbortError" ||
        error.message.includes("timeout")
      ) {
        console.error("Photon geocoding request timed out", {
          query: trimmedQuery,
          timeoutMs: PHOTON_CONFIG.requestTimeoutMs,
        });
        return NextResponse.json(
          {
            error: "Geocoding request timed out. Please try again.",
          } as GeocodingError,
          { status: 504 },
        );
      }
    }

    console.error("Photon geocoding fetch error", {
      query: trimmedQuery,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to reach the geocoding service." } as GeocodingError,
      { status: 502 },
    );
  }
}
