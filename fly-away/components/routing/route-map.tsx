"use client";

import { useEffect, useState } from "react";

/**
 * RouteMap renders the OSRM GeoJSON LineString polyline as an SVG path.
 * 
 * The OSRM API returns coordinates in [lon, lat] format.
 * This component creates a simple polyline visualization.
 * Shows empty state when no coordinates are provided.
 */
interface RouteMapProps {
  /** GeoJSON LineString coordinates [[lon, lat], ...] from OSRM */
  coordinates: [number, number][];
  /** Optional stroke color for the polyline */
  color?: string;
  /** Optional stroke width */
  strokeWidth?: number;
  /** Fixed height for the map container */
  height?: string;
}

export function RouteMap({ coordinates, color = "green", strokeWidth = 3, height = "400px" }: RouteMapProps) {
  const [pathString, setPathString] = useState<string | null>(null);

  useEffect(() => {
    if (!coordinates || coordinates.length < 2) {
      setPathString(null);
      return;
    }

    // Convert [lon, lat] OSRM coordinates to SVG path points
    const points = coordinates.map(([lon, lat]) => {
      // Simple projection: scale and translate for visibility
      const x = lon * 15 + 200;
      const y = -lat * 15 + 200;
      return `${x},${y}`;
    });

    // Create SVG path: M (move to first) L (line to rest) Z (close)
    const path = `M ${points[0]} L ${points.slice(1).join(" L ")} Z`;
    setPathString(path);
  }, [coordinates]);

  return (
    <div style={{ height, borderRadius: "8px", overflow: "hidden" }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 400"
        style={{ background: "var(--fallback-bg, #fff)" }}
      >
        <defs>
          <marker
            markerWidth="10"
            markerHeight="10"
            refX="0"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <circle cx="5" cy="5" r="4" fill={color} />
          </marker>
        </defs>

        {pathString && (
          <path
            d={pathString}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
        )}

        {/* Start marker (green circle) */}
        {coordinates.length > 0 && (
          <circle
            cx={coordinates[0][0] * 15 + 200}
            cy={-coordinates[0][1] * 15 + 200}
            r={6}
            fill={color}
          />
        )}

        {/* End marker (red circle) */}
        {coordinates.length > 0 && (
          <circle
            cx={coordinates[coordinates.length - 1][0] * 15 + 200}
            cy={-coordinates[coordinates.length - 1][1] * 15 + 200}
            r={6}
            fill="red"
          />
        )}
      </svg>
    </div>
  );
}
