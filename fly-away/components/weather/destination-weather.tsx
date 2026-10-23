"use client";

import { useEffect, useState } from "react";

import { getAirportCoordinates } from "@/constants/airport-coordinates";
import type { DestinationWeather } from "@/types/weather";

type DestinationWeatherProps = {
  airportCode: string;
  city?: string;
  tripDate?: string;
  units?: "metric" | "imperial" | "standard";
  className?: string;
};

const WEATHER_ICON_URL = (icon: string) =>
  `https://openweathermap.org/img/wn/${icon}@2x.png`;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function windDirection(deg?: number): string {
  if (deg === undefined || deg === null) return "";
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export default function DestinationWeather({
  airportCode,
  city: cityProp,
  tripDate,
  units: unitsProp = "metric",
  className,
}: DestinationWeatherProps) {
  const [units, setUnits] = useState<"metric" | "imperial" | "standard">(
    unitsProp,
  );
  const [state, setState] = useState<DestinationWeather>({
    airportCode: airportCode.toUpperCase(),
    city: cityProp ?? "",
    country: "",
    lat: 0,
    lon: 0,
    tripDate: tripDate ?? "",
    forecast: null,
    dateInfo: { available: false },
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      const coords = getAirportCoordinates(airportCode);
      if (!coords) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: `Unknown airport code: ${airportCode}`,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        city: cityProp ?? coords.city,
        country: coords.country,
        lat: coords.lat,
        lon: coords.lon,
        tripDate: tripDate ?? "",
        loading: true,
      }));

      try {
        const params = new URLSearchParams({
          lat: coords.lat.toString(),
          lon: coords.lon.toString(),
          units,
          ...(tripDate ? { tripDate } : {}),
        });

        const res = await fetch(`/api/forecast?${params.toString()}`, {
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.error || "Failed to load forecast.",
          }));
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          loading: false,
          forecast: data.dateInfo?.closestForecast ?? null,
          dateInfo: data.dateInfo ?? { available: false },
        }));
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    }

    void loadWeather();
    return () => {
      cancelled = true;
    };
  }, [airportCode, cityProp, tripDate, units]);

  const toggleUnits = () => {
    setUnits((prev) =>
      prev === "metric"
        ? "imperial"
        : prev === "imperial"
          ? "standard"
          : "metric",
    );
  };

  const unitLabel = units === "metric" ? "°C" : units === "imperial" ? "°F" : "K";

  if (state.loading) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 ${className ?? ""}`}
      >
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="animate-pulse rounded-full bg-slate-200 w-3 h-3 dark:bg-slate-700"></span>
          Loading weather for {state.city || state.airportCode}…
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div
        className={`rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20 ${className ?? ""}`}
      >
        <p className="text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      </div>
    );
  }

  if (!state.dateInfo.available) {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20 ${className ?? ""}`}
      >
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {state.dateInfo.message ??
            "Weather forecast is not available for this travel date."}
        </p>
      </div>
    );
  }

  const forecast = state.forecast;
  if (!forecast) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 ${className ?? ""}`}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No forecast data available.
        </p>
      </div>
    );
  }

  const temp = Math.round(forecast.main.temp);
  const description = forecast.weather[0]?.description ?? "Unknown";
  const icon = forecast.weather[0]?.icon ?? "01d";
  const pop = Math.round((forecast.pop ?? 0) * 100);
  const feelsLike = Math.round(forecast.main.feels_like);
  const windSpeed = forecast.wind?.speed;
  const windDir = windDirection(forecast.wind?.deg);
  const humidity = forecast.main.humidity;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {state.city}, {state.country}
          </p>
          {state.tripDate && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(state.tripDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleUnits}
            aria-label="Toggle temperature units"
            className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            {unitLabel}
          </button>
          <img
            src={WEATHER_ICON_URL(icon)}
            alt={description}
            width={40}
            height={40}
            className="ml-2"
          />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {temp}°
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {unitLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 capitalize">
        {description}
      </p>
      {pop > 0 && (
        <p className="col-span-2 text-sm text-blue-600 dark:text-blue-400">
          🌧️ {pop}% chance of precipitation
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Feels like {feelsLike}°
        </p>
        {windSpeed != null && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            💨 {windSpeed} {units === "metric" ? "m/s" : "mph"}{windDir ? ` ${windDir}` : ""}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          💧 {humidity}% humidity
        </p>
      </div>
    </div>
  );
}