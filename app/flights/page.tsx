"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import type {
  Flight,
  Airport,
  HazardZone,
  RerouteProposal,
} from "../../lib/types";

import {
  generateRandomPath,
  buildCurvedPath,
  stepFlights,
  generateHazardZones,
} from "../../lib/sim";

const FlightMap = dynamic(() => import("../../components/FlightMap"), {
  ssr: false,
});

// -------------------------------------------------
// Simple local airport set
// -------------------------------------------------
const AIRPORTS: Airport[] = [
  { code: "KSBA", name: "Santa Barbara", lat: 34.426, lon: -119.840 },
  { code: "KBUR", name: "Burbank", lat: 34.200, lon: -118.359 },
  { code: "KLAX", name: "Los Angeles", lat: 33.941, lon: -118.408 },
  { code: "KSNA", name: "Orange County", lat: 33.675, lon: -117.868 },
];

// Pick a random airport
function randomAirport(): Airport {
  return AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
}

// -------------------------------------------------
// Initial synthetic flights
// -------------------------------------------------
function createInitialFlights(): Flight[] {
  return Array.from({ length: 10 }, (_, i) => {
    const o = randomAirport();
    const d = randomAirport();
    const path = generateRandomPath(o, d);

    return {
      id: `FL${i + 1}`,
      callsign: `FL${i + 1}`,

      origin: o.code,
      originName: o.name,
      destination: d.code,
      destinationName: d.name,

      status: "enroute",
      phase: "cruise",

      altitude: 30000 + i * 200,
      speedKts: 440 + i,

      latitude: path[0].lat,
      longitude: path[0].lon,

      riskScore: 0.3,
      isEmergency: false,
      frozen: false,

      path,
      progress: 0,

      route: `${o.code} DCT WP${i + 1} ${d.code}`,
    };
  });
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>(createInitialFlights());
  const [hazards] = useState<HazardZone[]>(generateHazardZones());
  const [proposals, setProposals] = useState<RerouteProposal[]>([]);

  // -------------------------------------------------
  // Animate flight positions
  // -------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      setFlights((prev) => stepFlights(prev));
    }, 1000 / 30);

    return () => clearInterval(id);
  }, []);

  // -------------------------------------------------
  // Build reroute proposals (first 3 flights)
  // -------------------------------------------------
  useEffect(() => {
    const affected = flights.slice(0, 3);

    setProposals(
      affected.map((f) => ({
        id: `prop-${f.id}`,
        flightId: f.id,
        callsign: f.callsign,

        currentRoute: f.route!,
        proposedRoute: `${f.origin} DCT FIXR${f.id} ${f.destination}`,

        icaoBefore: f.route!,
        icaoAfter: `${f.origin} DCT FIXR${f.id} ${f.destination}`,

        riskBefore: f.riskScore,
        riskAfter: f.riskScore * 0.5,

        reason: "Avoids local hazard region and improves spacing.",
        createdAt: new Date().toISOString(),

        applied: false,
      }))
    );
  }, [flights]);

  // -------------------------------------------------
  // Apply reroutes (one button)
  // -------------------------------------------------
  function approveAll() {
    setFlights((prev) =>
      prev.map((f) => {
        const p = proposals.find((x) => x.flightId === f.id);
        if (!p) return f;

        const origin = AIRPORTS.find((a) => a.code === f.origin)!;
        const dest = AIRPORTS.find((a) => a.code === f.destination)!;

        // new curved path
        const newPath = buildCurvedPath(
          origin,
          dest,
          (Math.random() - 0.5) * 2
        );

        return {
          ...f,
          path: newPath,
          frozen: true,
          riskScore: p.riskAfter,
          route: p.proposedRoute,
        };
      })
    );

    setProposals((prev) =>
      prev.map((p) => ({ ...p, applied: true }))
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Synthetic Flight Sector
      </h1>

      <div className="card h-[420px]">
        <FlightMap flights={flights} hazardZones={hazards} />
      </div>

      <div className="card p-4 space-y-3">
        <button
          onClick={approveAll}
          className="px-4 py-2 bg-sky-500 text-white rounded"
        >
          Approve & Apply All Reroutes
        </button>

        {/* Show ICAO before/after for ATC */}
        {proposals.map((p) => (
          <div
            key={p.id}
            className="border border-slate-700 rounded p-3 bg-slate-900 text-xs"
          >
            <div className="font-semibold text-sky-300 mb-1">
              {p.callsign}
            </div>

            <div className="text-slate-400">Before:</div>
            <div className="text-slate-200 mb-2">{p.icaoBefore}</div>

            <div className="text-slate-400">After:</div>
            <div className="text-emerald-300">{p.icaoAfter}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
