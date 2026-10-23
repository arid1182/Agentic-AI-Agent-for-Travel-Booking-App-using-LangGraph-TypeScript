import { NextRequest, NextResponse } from "next/server";
import {
  getCached,
  setCached,
  buildCacheKey,
} from "@/lib/weather-cache";

export const runtime = "nodejs";

type OpenWeatherForecastResponse = {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: { all: number };
    wind: { speed: number; deg: number; gust?: number };
    visibility: number;
    pop: number;
    sys: { pod: string };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: { lon: number; lat: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
};

type WeatherQueryParams = {
  lat?: string;
  lon?: string;
  city?: string;
  units?: "metric" | "imperial" | "standard";
  lang?: string;
  tripDate?: string; // YYYY-MM-DD travel date
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

  return `https://api.openweathermap.org/data/2.5/forecast?${searchParams.toString()}`;
}

/**
 * Finds the forecast entry closest to the given trip date.
 * OpenWeather 5-day / 3-hour forecast covers roughly 5 days from now.
 * Returns availability info plus the closest matching forecast entry.
 */
function findForecastForTripDate(
  forecast: OpenWeatherForecastResponse,
  tripDate?: string,
): {
  available: boolean;
  message?: string;
  closestForecast?: OpenWeatherForecastResponse["list"][number];
} {
  if (!tripDate) {
    // No trip date specified — return the full forecast list
    return {
      available: true,
      closestForecast: forecast.list[0],
    };
  }

  const tripDayStart = new Date(`${tripDate}T00:00:00Z`);
  tripDayStart.setUTCHours(0, 0, 0, 0);
  const tripDayEnd = new Date(tripDayStart);
  tripDayEnd.setUTCHours(23, 59, 59, 999);

  const now = new Date();
  const fiveDaysFromNow = new Date(now);
  fiveDaysFromNow.setUTCDate(now.getUTCDate() + 5);

  // Check if trip date is within the forecast window (today + ~5 days)
  if (tripDayEnd < now || tripDayStart > fiveDaysFromNow) {
    return {
      available: false,
      message:
        "Forecast is only available for trips within the next 5 days. Your travel date is outside the forecast window.",
    };
  }

  // Find the forecast entry closest to noon on the trip date
  const tripNoon = new Date(tripDayStart);
  tripNoon.setUTCHours(12, 0, 0, 0);

  let closest: OpenWeatherForecastResponse["list"][number] | undefined;
  let minDiff = Infinity;

  for (const entry of forecast.list) {
    const entryTime = new Date(entry.dt * 1000);
    const diff = Math.abs(entryTime.getTime() - tripNoon.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  if (!closest) {
    return {
      available: false,
      message: "No forecast data available for your travel date.",
    };
  }

  return {
    available: true,
    closestForecast: closest,
  };
}

function sanitizeOpenWeatherError(
  data: unknown,
  status: number,
): { error: string; details?: number } {
  const errorData = data as { message?: string; cod?: number | string };
  return {
    error: errorData.message || "Failed to fetch forecast data.",
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
  const tripDate = searchParams.get("tripDate") || undefined;

  const params: WeatherQueryParams = { lat, lon, city, units, lang, tripDate };

  // Build cache key from request parameters (excluding API key)
  const cacheKey = buildCacheKey("forecast", {
    lat: params.lat ?? "",
    lon: params.lon ?? "",
    city: params.city ?? "",
    units: params.units ?? "",
    lang: params.lang ?? "",
    tripDate: params.tripDate ?? "",
  });

  // Return cached response if available
  const cached = getCached(cacheKey);
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
      | OpenWeatherForecastResponse
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

      console.error("OpenWeather forecast API error", {
        status: response.status,
        message: errorData.message,
      });

      return NextResponse.json(
        sanitizeOpenWeatherError(errorData, response.status),
        { status: response.status },
      );
    }

    const forecastData = data as OpenWeatherForecastResponse;

    // Determine forecast availability for the trip date
    const dateInfo = findForecastForTripDate(forecastData, tripDate);

    const result = {
      data: forecastData,
      dateInfo,
    };

    // Cache successful response
    setCached(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("OpenWeather forecast fetch error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to reach the weather service." },
      { status: 502 },
    );
  }
}
