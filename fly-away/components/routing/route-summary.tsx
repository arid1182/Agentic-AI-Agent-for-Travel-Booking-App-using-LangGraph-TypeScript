"use client";

import { useState, useEffect } from "react";
import { fetchOSRMRoute, getOSRMDistance, getOSRMDuration, getOSRMPolyline, isOSRRouteValid } from "@/lib/osrm-utils";
import { MapPinIcon, ClipboardIcon } from "lucide-react";

/**
 * Props for RouteSummary component
 */
export interface RouteSummaryProps {
  /** Origin coordinates [lon, lat] or null */
  origin: [number, number] | null;
  /** Destination coordinates [lon, lat] or null */
  destination: [number, number] | null;
  /** Origin display label */
  originLabel: string;
  /** Destination display label */
  destinationLabel: string;
  /** Optional: whether to show route (default true) */
  showRoute?: boolean;
  /** Optional: distance unit preference */
  unit?: "km" | "miles";
}

/**
 * RouteSummary displays ground transportation route between origin and destination
 * using OSRM routing service. Route calculation is optional and can be disabled.
 */
export function RouteSummary({
  origin,
  destination,
  originLabel,
  destinationLabel,
  showRoute = true,
  unit = "km",
}: RouteSummaryProps) {
  const [route, setRoute] = useState<{
    distance: number;
    duration: number;
    valid: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Only fetch route if showRoute is true and we have both coordinates
  useEffect(() => {
    if (!showRoute || !origin || !destination) {
      setRoute(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchOSRMRoute(origin, destination, "car")
      .then((data) => {
        if (isOSRRouteValid(data)) {
          setRoute({
            distance: getOSRMDistance(data),
            duration: getOSRMDuration(data),
            valid: true,
          });
        } else {
          setRoute({ distance: 0, duration: 0, valid: false });
          setError("No route found.");
        }
      })
      .catch((err) => {
        console.error("OSRM route error:", err);
        setError("Route calculation failed.");
        setRoute({ distance: 0, duration: 0, valid: false });
      })
      .finally(() => setIsLoading(false));
  }, [showRoute, origin, destination]);

  const formatDistance = (meters: number): string => {
    if (unit === "miles") {
      return `${(meters / 1609.34).toFixed(1)} mi`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Display states
  if (!origin || !destination) {
    return <p className="text-slate-500 text-sm">Enter origin and destination</p>;
  }

  if (error) {
    return (
      <div className="p-2 rounded bg-red-100 text-red-800 text-xs">
        <ClipboardIcon className="w-4 h-4 mr-1 opacity-100" />
        <span>{error}</span>
      </div>
    );
  }

  if (!route || !route.valid) {
    return (
      <div className="p-2 rounded bg-yellow-100 text-yellow-800 text-xs">
        <ClipboardIcon className="w-4 h-4 mr-1 opacity-100" />
        <span>{error || "No route available"}</span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-md bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <MapPinIcon className="text-slate-500 w-4 h-4" />
        <span>
          {" "}
          {originLabel} {"→"} {destinationLabel}:{" "}
          {formatDistance(route.distance)} in {formatDuration(route.duration)}
        </span>
      </div>
    </div>
  );
}
