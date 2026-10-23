"use client";

import { useEffect, useState } from "react";

import { Loader2, MapPin } from "lucide-react";

import LocationAutocomplete from "@/components/location/location-autocomplete";
import { getAirportCoordinates } from "@/constants/airport-coordinates";
import { matchAirport } from "@/lib/airport-matcher";
import type { LocationResult } from "@/types/location-autocomplete";

type LocationWeatherProps = {
  /** Fallback airport code when no place has been picked */
  airportCode?: string;
  /** Trip date (YYYY-MM-DD) used to choose the closest forecast */
  tripDate?: string;
  /** Temperature units */
  units?: "metric" | "imperial" | "standard";
  /** Show the matched airport code badge */
  showAirportMatch?: boolean;
  /** Called whenever the user picks or clears a place */
  onLocationChange?: (location: LocationResult | null) => void;
  className?: string;
};

type WeatherSnapshot = {
  city: string;
  country: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  precipitation: number;
  loading: boolean;
  error: string | null;
  /** Set when the trip date falls outside the forecast window */
  unavailable: string | null;
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

const EMPTY_SNAPSHOT: WeatherSnapshot = {
  city: "",
  country: "",
  temp: 0,
  feelsLike: 0,
  humidity: 0,
  description: "",
  icon: "01d",
  precipitation: 0,
  loading: false,
  error: null,
  unavailable: null,
};

/**
 * Weather for an arbitrary place, resolved through the Photon geocoder.
 *
 * The existing `DestinationWeather` component only works for the static list
 * of supported airports. This one accepts any city in the world, because the
 * geocoded coordinates are passed straight to the forecast API.
 */
export default function LocationWeather({
  airportCode,
  tripDate,
  units: unitsProp = "metric",
  showAirportMatch = false,
  onLocationChange,
  className,
}: LocationWeatherProps) {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [units, setUnits] = useState(unitsProp);
  const [snapshot, setSnapshot] = useState<WeatherSnapshot>(EMPTY_SNAPSHOT);

  const airportMatch = location ? matchAirport(location) : null;

  // ── Notify the parent whenever the picked place changes ──
  useEffect(() => {
    onLocationChange?.(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // ── Load the forecast for the selected place ──
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // Distinguishes a timeout abort from a request superseded by a newer one.
    let timedOut = false;

    // Guard against a request that never settles.
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);

    async function loadWeather() {
      const fallback = airportCode
        ? getAirportCoordinates(airportCode)
        : undefined;

      const coords = location
        ? { lat: location.lat, lon: location.lon }
        : fallback
          ? { lat: fallback.lat, lon: fallback.lon }
          : undefined;

      if (!coords) {
        setSnapshot(EMPTY_SNAPSHOT);
        return;
      }

      const city = location
        ? (location.city ?? location.name)
        : (fallback?.city ?? "");

      setSnapshot((prev) => ({
        ...prev,
        city,
        country: location?.country ?? fallback?.country ?? "",
        loading: true,
        error: null,
        unavailable: null,
      }));

      try {
        const params = new URLSearchParams({
          lat: coords.lat.toString(),
          lon: coords.lon.toString(),
          units,
        });

        if (tripDate) {
          params.set("tripDate", tripDate);
        }

        const res = await fetch(`/api/forecast?${params.toString()}`, {
          signal,
        });

        const data = await res.json().catch(() => ({}));

        if (signal.aborted) return;

        if (!res.ok) {
          setSnapshot((prev) => ({
            ...prev,
            loading: false,
            error: data?.error ?? "Failed to load the forecast.",
          }));
          return;
        }

        const forecast = data?.dateInfo?.closestForecast;

        // The trip date can fall outside the 5-day forecast window.
        if (data?.dateInfo?.available === false || !forecast) {
          setSnapshot((prev) => ({
            ...prev,
            loading: false,
            unavailable:
              data?.dateInfo?.message ??
              "No forecast is available for this travel date yet.",
          }));
          return;
        }

        setSnapshot((prev) => ({
          ...prev,
          loading: false,
          error: null,
          unavailable: null,
          temp: forecast?.main?.temp ?? 0,
          feelsLike: forecast?.main?.feels_like ?? 0,
          humidity: forecast?.main?.humidity ?? 0,
          description: forecast?.weather?.[0]?.description ?? "Unknown",
          icon: forecast?.weather?.[0]?.icon ?? "01d",
          precipitation: Math.round((forecast?.pop ?? 0) * 100),
        }));
      } catch (err) {
        // A request superseded by a newer one is not an error worth surfacing.
        if (signal.aborted && !timedOut) return;

        setSnapshot((prev) => ({
          ...prev,
          loading: false,
          error: timedOut
            ? "The weather service took too long to respond."
            : err instanceof Error
              ? err.message
              : "Unable to reach the weather service.",
        }));
      }
    }

    void loadWeather();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [location, airportCode, tripDate, units]);

  function toggleUnits() {
    setUnits((prev) =>
      prev === "metric"
        ? "imperial"
        : prev === "imperial"
          ? "standard"
          : "metric",
    );
  }

  const unitLabel =
    units === "metric" ? "°C" : units === "imperial" ? "°F" : "K";

  return (
    <div
      className={
        "rounded-[32px] bg-white p-6 shadow-lg dark:bg-slate-900 " +
        (className ?? "")
      }
    >
      <LocationAutocomplete
        label="Destination"
        placeholder="Search any city worldwide"
        value={location}
        onChange={setLocation}
      />

      {showAirportMatch && location && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {airportMatch
            ? `Nearest supported airport: ${airportMatch.city} (${airportMatch.code})`
            : "No supported airport nearby for this location."}
        </p>
      )}

      <LocationWeatherBody
        snapshot={snapshot}
        tripDate={tripDate}
        unitLabel={unitLabel}
        onToggleUnits={toggleUnits}
      />
    </div>
  );
}

type LocationWeatherBodyProps = {
  snapshot: WeatherSnapshot;
  tripDate?: string;
  unitLabel: string;
  onToggleUnits: () => void;
};

/**
 * Renders the forecast readout (loading / error / empty / data).
 */
function LocationWeatherBody({
  snapshot,
  tripDate,
  unitLabel,
  onToggleUnits,
}: LocationWeatherBodyProps) {
  if (snapshot.loading) {
    return (
      <div className="mt-6">
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
        >
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Loading weather…
        </p>
      </div>
    );
  }

  if (snapshot.error) {
    return (
      <div className="mt-6">
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {snapshot.error}
        </p>
      </div>
    );
  }

  if (snapshot.unavailable) {
    return (
      <div className="mt-6">
        <p className="flex items-start gap-1 text-sm text-amber-700 dark:text-amber-400">
          <span aria-hidden="true">📅</span>
          <span>{snapshot.unavailable}</span>
        </p>
      </div>
    );
  }

  if (!snapshot.city) {
    return (
      <div className="mt-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Search for a destination to see its forecast.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {snapshot.city}
              {snapshot.country ? `, ${snapshot.country}` : ""}
            </span>
          </p>

          {tripDate && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(tripDate)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleUnits}
            aria-label="Toggle temperature units"
            className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            {unitLabel}
          </button>

          <img
            src={WEATHER_ICON_URL(snapshot.icon)}
            alt={snapshot.description}
            width={40}
            height={40}
          />
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {Math.round(snapshot.temp)}°
        </span>

        <span className="text-sm text-slate-500 dark:text-slate-400">
          {unitLabel}
        </span>
      </div>

      <p className="mt-1 text-sm capitalize text-slate-600 dark:text-slate-300">
        {snapshot.description}
      </p>

      {snapshot.precipitation > 0 && (
        <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
          🌧️ {snapshot.precipitation}% chance of precipitation
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Feels like {Math.round(snapshot.feelsLike)}°
        </p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          💧 {snapshot.humidity}% humidity
        </p>
      </div>
    </div>
  );
}
