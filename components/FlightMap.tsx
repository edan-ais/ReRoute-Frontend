// components/FlightMap.tsx
"use client";

import type { Flight, EmergencyScenarioId } from "../lib/types";

interface FlightMapProps {
  flights: Flight[];
  selectedFlightId: string | null;
  scenarioId: EmergencyScenarioId;
}

const MAP_WIDTH = 900;
const MAP_HEIGHT = 460;

/**
 * Very simple lat/lon → x/y projection for a US-centric sector.
 */
function project(lat: number, lon: number) {
  const lonMin = -130;
  const lonMax = -60;
  const latMin = 20;
  const latMax = 55;

  const x = ((lon - lonMin) / (lonMax - lonMin)) * MAP_WIDTH;
  const y = ((latMax - lat) / (latMax - latMin)) * MAP_HEIGHT;

  return {
    x: Math.max(0, Math.min(MAP_WIDTH, x)),
    y: Math.max(0, Math.min(MAP_HEIGHT, y))
  };
}

/**
 * Generate a faux route start/end for visualization.
 * Start is slightly "behind" current position, end slightly "ahead".
 */
function routeEndpointsForFlight(flight: Flight) {
  const { latitude, longitude } = flight;

  const startLat = latitude - 3;
  const startLon = longitude - 6;
  const endLat = latitude + 3;
  const endLon = longitude + 6;

  return {
    start: project(startLat, startLon),
    end: project(endLat, endLon),
    pos: project(latitude, longitude)
  };
}

export default function FlightMap({
  flights,
  selectedFlightId,
  scenarioId
}: FlightMapProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label="Sector map with active flights"
      >
        <defs>
          <linearGradient id="bgGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect
          x={0}
          y={0}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          fill="url(#bgGradient)"
        />

        {/* Sector grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={((i + 1) * MAP_WIDTH) / 7}
            x2={((i + 1) * MAP_WIDTH) / 7}
            y1={0}
            y2={MAP_HEIGHT}
            stroke="#0f172a"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            x2={MAP_WIDTH}
            y1={((i + 1) * MAP_HEIGHT) / 4}
            y2={((i + 1) * MAP_HEIGHT) / 4}
            stroke="#0f172a"
            strokeWidth={1}
          />
        ))}

        {/* Scenario highlight region (very simple visual) */}
        {scenarioId === "wx" && (
          <rect
            x={MAP_WIDTH * 0.3}
            y={MAP_HEIGHT * 0.15}
            width={MAP_WIDTH * 0.4}
            height={MAP_HEIGHT * 0.5}
            fill="#7c2d12"
            fillOpacity={0.25}
          />
        )}
        {scenarioId === "runway" && (
          <circle
            cx={MAP_WIDTH * 0.8}
            cy={MAP_HEIGHT * 0.7}
            r={70}
            fill="#6b21a8"
            fillOpacity={0.25}
          />
        )}
        {scenarioId === "staffing" && (
          <rect
            x={MAP_WIDTH * 0.05}
            y={MAP_HEIGHT * 0.55}
            width={MAP_WIDTH * 0.3}
            height={MAP_HEIGHT * 0.35}
            fill="#075985"
            fillOpacity={0.25}
          />
        )}

        {/* Flight routes & planes */}
        {flights.map((flight) => {
          const { start, end, pos } = routeEndpointsForFlight(flight);
          const isSelected = flight.id === selectedFlightId;
          const isHighRisk = flight.riskScore >= 0.6;

          const routeOpacity = isSelected ? 0.9 : 0.55;

          return (
            <g key={flight.id}>
              {/* Route line */}
              <path
                d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                stroke={isHighRisk ? "#f97316" : "#38bdf8"}
                strokeWidth={isSelected ? 2.8 : 1.8}
                strokeDasharray={isHighRisk ? "4 4" : "1 0"}
                opacity={routeOpacity}
              />

              {/* Plane marker */}
              <g transform={`translate(${pos.x}, ${pos.y})`}>
                <circle
                  r={isSelected ? 7 : 5}
                  fill={isHighRisk ? "#ef4444" : "#22c55e"}
                  stroke="#020617"
                  strokeWidth={1.5}
                />
                <polygon
                  points="-5,1 0,-8 5,1"
                  fill="#e5e7eb"
                  transform="translate(0,-10)"
                />
              </g>

              {/* Label with callsign + coordinates */}
              <text
                x={pos.x + 10}
                y={pos.y - 4}
                fontSize={10}
                fill="#e5e7eb"
              >
                {flight.callsign} · {flight.latitude.toFixed(2)}°
                {flight.latitude >= 0 ? "N" : "S"},{" "}
                {Math.abs(flight.longitude).toFixed(2)}°
                {flight.longitude <= 0 ? "W" : "E"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
