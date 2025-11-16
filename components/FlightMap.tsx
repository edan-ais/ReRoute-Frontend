// components/FlightMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { Flight } from "../lib/types";

interface FlightMapProps {
  flights: Flight[];
  simulatedFlights?: Flight[];
  mode: "live" | "simulated";
}

const planeIcon = new L.Icon({
  iconUrl: "/icons/airplane.svg",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

export default function FlightMap({ flights, simulatedFlights, mode }: FlightMapProps) {
  const activeFlights = mode === "live" ? flights : simulatedFlights ?? flights;

  const routes = useMemo(
    () =>
      activeFlights.map((f) => ({
        id: f.id,
        positions:
          f.path ??
          ([
            [f.latitude - 1, f.longitude - 1],
            [f.latitude + 1, f.longitude + 1]
          ] as [number, number][])
      })),
    [activeFlights]
  );

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-800">
      <MapContainer
        center={[35.0, -118.0]} // Southwest / California focus
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        className="bg-slate-900"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Curved flight paths */}
        {routes.map((r) => (
          <Polyline
            key={r.id}
            positions={r.positions}
            color={mode === "live" ? "#3b82f6" : "#22c55e"}
            weight={3}
            opacity={0.85}
          />
        ))}

        {/* Aircraft markers */}
        {activeFlights.map((f) => (
          <Marker
            key={f.id}
            icon={planeIcon}
            position={[f.latitude, f.longitude]}
          >
            <Tooltip direction="top">
              <div>
                <strong>{f.callsign}</strong>
                <br />
                {f.origin} → {f.destination}
                <br />
                {(f.originName || "Unknown origin") + " → " + (f.destinationName || "Unknown destination")}
                <br />
                {f.latitude.toFixed(2)}°, {f.longitude.toFixed(2)}°
                <br />
                Alt: {Math.round(f.altitude).toLocaleString()} ft ·{" "}
                {Math.round(f.speedKts)} kts
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
