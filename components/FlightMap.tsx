// components/FlightMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { Flight } from "../lib/types";

interface FlightMapProps {
  flights: Flight[];
}

const planeIcon = new L.Icon({
  iconUrl: "/icons/airplane.svg",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

export default function FlightMap({ flights }: FlightMapProps) {
  const routes = useMemo(
    () =>
      flights.map((f) => ({
        id: f.id,
        positions:
          f.path ??
          ([
            [f.latitude - 1, f.longitude - 1],
            [f.latitude + 1, f.longitude + 1]
          ] as [number, number][])
      })),
    [flights]
  );

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-800">
      <MapContainer
        center={[35.0, -118.0]} // Southwest / California
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
            color="#3b82f6"
            weight={3}
            opacity={0.85}
          />
        ))}

        {/* Aircraft markers */}
        {flights.map((f) => (
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
                {(f.originName || "Unknown origin") +
                  " → " +
                  (f.destinationName || "Unknown destination")}
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

