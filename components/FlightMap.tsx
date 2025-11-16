// components/FlightMap.tsx
"use client";

import React from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Flight, HazardZone } from "../lib/types";

interface FlightMapProps {
  flights: Flight[];
  selectedFlightId?: string | null;
  hazardZones?: HazardZone[];
}

const DEFAULT_CENTER: [number, number] = [34.2, -118.2]; // SoCal-ish

export default function FlightMap({
  flights,
  selectedFlightId,
  hazardZones = [],
}: FlightMapProps) {
  const center: [number, number] =
    flights.length > 0
      ? [flights[0].latitude, flights[0].longitude]
      : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={6}
      className="h-full w-full rounded-xl overflow-hidden"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* HAZARD ZONES */}
      {hazardZones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.polygon.map((p) => [p.lat, p.lon] as [number, number])}
          pathOptions={{
            color:
              zone.severity === "high"
                ? "#ef4444" // red
                : zone.severity === "medium"
                ? "#f97316" // orange
                : "#22c55e", // green
            weight: 2,
            fillOpacity: 0.18,
          }}
        />
      ))}

      {/* FLIGHT PATHS + PLANES */}
      {flights.map((f) => {
        const pathLatLngs =
          f.path && f.path.length > 0
            ? (f.path.map((p) => [p.lat, p.lon] as [number, number]))
            : ([ [f.latitude, f.longitude] ] as [number, number][]);

        const isSelected = f.id === selectedFlightId;

        const color = f.frozen
          ? "#22c55e" // approved / resolved = green
          : f.riskScore >= 0.6
          ? "#ef4444" // high risk
          : f.riskScore >= 0.4
          ? "#f97316" // medium risk
          : "#38bdf8"; // low risk / nominal

        return (
          <React.Fragment key={f.id}>
            <Polyline
              positions={pathLatLngs}
              pathOptions={{
                color,
                weight: isSelected ? 4 : 2,
                opacity: 0.9,
              }}
            />
            <CircleMarker
              center={[f.latitude, f.longitude]}
              radius={isSelected ? 6 : 4}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 1,
              }}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}

