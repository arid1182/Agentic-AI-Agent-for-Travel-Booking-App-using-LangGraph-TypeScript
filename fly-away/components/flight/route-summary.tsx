"use client";

import { useState, useEffect } from "react";
import { fetchOSRMRoute, getOSRMDistance, getOSRMDuration, getOSRMPolyline, isOSRRouteValid } from "@/lib/osrm-utils";
import { MapPinIcon, ClipboardIcon } from "lucide-react";

interface RouteSummaryProps {
  origin: [number, number] | null;
  destination: [number, number] | null;
  originLabel: string;
  destinationLabel: string;
}

export function RouteSummary({ origin, destination, originLabel, destinationLabel }: RouteSummaryProps) {
  const [route, setRoute] = useState<{ distance: number; duration: number; valid: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination) {
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
        console.error(err);
        setError("Route calculation failed.");
        setRoute({ distance: 0, duration: 0, valid: false });
      })
      .finally(() => setIsLoading(false));
  }, [origin, destination]);

  const formatDistance = (meters: number) => `${(meters / 1000).toFixed(1)} km`;
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (!origin || !destination) {
    return <p className="text-slate-500">Enter origin and destination</p>;
  }

  if (error) {
    return <div className="p-2 rounded bg-red-100 text-red-800 text-xs">{error}</div>;
  }

  if (!route || !route.valid) {
    return <div className="p-2 rounded bg-yellow-100 text-yellow-800 text-xs">{error || "No route"}</div>;
  }

  return (
    <div className="p-4 rounded-md bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <MapPinIcon className="text-slate-500 w-4 h-4" />
        <span>
          {" "}
          {originLabel} → {destinationLabel}:{" "}
          {formatDistance(route.distance)} in {formatDuration(route.duration)}
        </span>
      </div>
    </div>
  );
}
