import { NextRequest, NextResponse } from "next/server";
import {
  getCached,
  setCached,
  buildCacheKey,
} from "@/lib/weather-cache";

export const runtime = "nodejs";

type OpenWeatherResponse = {
  coord: { lon: number; lat: number };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: { speed: number; deg: number; gust?: number };
  clouds: { all: number };
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
};

type WeatherQueryParams = {
  lat?: string;
  lon?: string;
  city?: string;
  units?: "metric" | "imperial" | "standard";
  lang?: string;
};

function buildOpenWeatherUrl(params: WeatherQueryParams, apiKey: string): string {
  const searchParams = new URLSearchParams({
    appid: apiKey,
    units: params.units ?? "metric",
    lang: params.lang ?? "en",
  });

  if (params.lat && params.lon) {
    searchParams.set("lat", params.lat);
    searchParams.set("lon", params.lon);
  } else if (params.city) {
    searchParams.set("q", params.city);
  } else {
    throw new Error("Either lat+lon or city is required");
  }

  return `https://api.openweathermap.org/data/2.5/weather?${searchParams.toString()}`;
}

function sanitizeOpenWeatherError(
  data: unknown,
  status: number,
): { error: string; details?: number } {
  const errorData = data as { message?: string; cod?: number | string };
  return {
    error: errorData.message || "Failed to fetch weather data.",
    details: status,
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenWeather API key is not configured." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") || undefined;
  const lon = searchParams.get("lon") || undefined;
  const city = searchParams.get("city") || undefined;
  const units = (searchParams.get("units") as
    | "metric"
    | "imperial"
    | "standard"
    | null) ?? "metric";
  const lang = searchParams.get("lang") || "en";

  const params: WeatherQueryParams = { lat, lon, city, units, lang };

  // Build cache key from request parameters (excluding API key)
  const cacheKey = buildCacheKey("weather", {
    lat: params.lat ?? "",
    lon: params.lon ?? "",
    city: params.city ?? "",
    units: params.units ?? "",
    lang: params.lang ?? "",
  });

  // Return cached response if available
  const cached = getCached<{ data: OpenWeatherResponse }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  let url: string;
  try {
    url = buildOpenWeatherUrl(params, apiKey);
  } catch {
    return NextResponse.json(
      { error: "Either lat+lon or city query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    const data = (await response.json().catch(() => ({}))) as
      | OpenWeatherResponse
      | { message?: string; cod?: number | string };

    if (!response.ok) {
      const errorData = data as { message?: string; cod?: number | string };

      // Rate limit (429) — cache briefly to avoid hammering the API
      if (response.status === 429) {
        setCached(cacheKey, sanitizeOpenWeatherError(errorData, 429), 60_000); // 1 min
        return NextResponse.json(
          {
            error:
              errorData.message ||
              "OpenWeather rate limit exceeded. Please try again later.",
            details: 429,
          },
          { status: 429 },
        );
      }

      console.error("OpenWeather API error", {
        status: response.status,
        message: errorData.message,
      });

      return NextResponse.json(
        sanitizeOpenWeatherError(errorData, response.status),
        { status: response.status },
      );
    }

    const result = { data };

    // Cache successful response
    setCached(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("OpenWeather fetch error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to reach the weather service." },
      { status: 502 },
    );
  }
}
