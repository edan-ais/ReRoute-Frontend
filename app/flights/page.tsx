// app/flights/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import FlightCard from "../../components/FlightCard";
import ConditionsPanel from "../../components/ConditionsPanel";
import ApprovalPanel from "../../components/ApprovalPanel";

import type {
  Flight,
  Condition,
  EmergencyScenario,
  EmergencyScenarioId,
  RerouteProposal,
  Airport,
  HazardZone,
} from "../../lib/types";

import {
  generateRandomPath,
  buildCurvedPath,
  stepFlights,
} from "../../lib/sim";

const FlightMap = dynamic(() => import("../../components/FlightMap"), {
  ssr: false,
});

// ---------------------------------------------------------
// Local airport catalogue
// ---------------------------------------------------------
const AIRPORTS: Record<string, Airport> = {
  KLAX: { code: "KLAX", name: "Los Angeles Intl", lat: 33.9425, lon: -118.4081 },
  KSAN: { code: "KSAN", name: "San Diego Intl", lat: 32.7338, lon: -117.1933 },
  KSFO: { code: "KSFO", name: "San Francisco Intl", lat: 37.6213, lon: -122.3790 },
  KSMF: { code: "KSMF", name: "Sacramento Intl", lat: 38.6954, lon: -121.5908 },
  KLAS: { code: "KLAS", name: "Harry Reid Intl", lat: 36.0840, lon: -115.1537 },
  KPHX: { code: "KPHX", name: "Phoenix Sky Harbor", lat: 33.4342, lon: -112.0116 },
};

function airportFor(code: string): Airport {
  return AIRPORTS[code];
}

// ---------------------------------------------------------
// Scenarios
// ---------------------------------------------------------
const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    id: "wx",
    name: "Convective Weather Line",
    description: "",
    type: "weather",
  },
  {
    id: "runway",
    name: "Runway Closure at Hub",
    description: "",
    type: "runway",
  },
  {
    id: "staffing",
    name: "Staffing Shortage",
    description: "",
    type: "staffing",
  },
];

function buildConditionsForScenario(
  id: EmergencyScenarioId
): Condition[] {
  switch (id) {
    case "wx":
      return [
        {
          id: "cond-wx-1",
          type: "weather",
          label: "Convective SIGMET",
          severity: "high",
          description: "Storm line across the central corridor.",
          active: true,
        },
      ];
    case "runway":
      return [
        {
          id: "cond-rwy-1",
          type: "runway",
          label: "Runway 25R Closed",
          severity: "medium",
          description: "Primary arrival runway unavailable at KLAX.",
          active: true,
        },
      ];
    case "staffing":
      return [
        {
          id: "cond-staff-1",
          type: "staffing",
          label: "Reduced Staffing",
          severity: "medium",
          description: "Controller staffing reduced in western sector.",
          active: true,
        },
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------
// Hazard zones (polygons on the map)
// ---------------------------------------------------------
function buildHazardZonesForScenario(
  id: EmergencyScenarioId
): HazardZone[] {
  if (id === "wx") {
    // Rough diagonal weather band across SoCal / AZ
    return [
      {
        id: "hz-wx-1",
        scenarioId: "wx",
        label: "Convective Line",
        severity: "high",
        polygon: [
          { lat: 34.0, lon: -120.0 },
          { lat: 35.5, lon: -118.0 },
          { lat: 35.0, lon: -113.5 },
          { lat: 33.5, lon: -115.5 },
        ],
      },
    ];
  }

  if (id === "runway") {
    // Tight box around KLAX
    return [
      {
        id: "hz-rwy-1",
        scenarioId: "runway",
        label: "KLAX Runway Constraint",
        severity: "medium",
        polygon: [
          { lat: 33.85, lon: -118.53 },
          { lat: 33.85, lon: -118.28 },
          { lat: 34.02, lon: -118.28 },
          { lat: 34.02, lon: -118.53 },
        ],
      },
    ];
  }

  // staffing
  return [
    {
      id: "hz-staff-1",
      scenarioId: "staffing",
      label: "Staffing Hotspot",
      severity: "medium",
      polygon: [
        { lat: 33.5, lon: -121.0 },
        { lat: 34.8, lon: -121.0 },
        { lat: 35.2, lon: -119.0 },
        { lat: 33.9, lon: -119.0 },
      ],
    },
  ];
}

// ---------------------------------------------------------
// Risk model (simple heuristic)
// ---------------------------------------------------------
function computeRisk(f: Flight, scenarioId: EmergencyScenarioId): number {
  let risk =
    0.2 +
    Math.max(0, Math.min(1, (f.speedKts - 350) / 200)) * 0.3 +
    (f.altitude < 20000 ? 0.15 : 0);

  if (scenarioId === "wx") {
    risk += 0.3;
  } else if (scenarioId === "runway") {
    risk += 0.18;
  } else if (scenarioId === "staffing") {
    risk += 0.12;
  }

  return Number(Math.min(1, Math.max(0, risk)).toFixed(2));
}

// ---------------------------------------------------------
// Synthetic initial flights
// ---------------------------------------------------------
function createInitialFlights(): Flight[] {
  const PAIRS: [string, string][] = [
    ["KLAX", "KSAN"],
    ["KSAN", "KLAX"],
    ["KLAX", "KSFO"],
    ["KSFO", "KLAX"],
    ["KLAX", "KPHX"],
    ["KPHX", "KLAX"],
    ["KLAS", "KLAX"],
    ["KLAX", "KLAS"],
    ["KSFO", "KSMF"],
    ["KSMF", "KSFO"],
  ];

  let id = 1;
  return PAIRS.map(([o, d]) => {
    const origin = airportFor(o);
    const dest = airportFor(d);
    const path = generateRandomPath(origin, dest);

    const f: Flight = {
      id: `FL${id}`,
      callsign: `FL${id}`,
      origin: o,
      originName: origin.name,
      destination: d,
      destinationName: dest.name,
      status: "enroute",
      phase: "cruise",
      altitude: 32000 + id * 200,
      speedKts: 440 + id,
      latitude: path[0].lat,
      longitude: path[0].lon,
      riskScore: 0.3,
      isEmergency: false,
      frozen: false,
      path,
      progress: 0,
      route: `${o} DCT FIX${id} DCT ${d}`,
    };

    id += 1;
    return f;
  });
}

// ---------------------------------------------------------
// ICAO flight plan helper
// ---------------------------------------------------------
function icaoPlan(
  f: Flight,
  route: string,
  newLevel?: string
): string {
  const spd = `N0${Math.round(f.speedKts / 10) * 10}`;
  const level = newLevel ?? `F${Math.round(f.altitude / 1000) * 10}`;

  return [
    `FPL-${f.callsign}-IS`,
    `-C/B738/M-SDFGIRWY/S`,
    `-${f.origin}0800`,
    `-${spd}${level} ${route}`,
    `-${f.destination}0200`,
    `-DOF/250115`,
  ].join("\n");
}

// ---------------------------------------------------------
// Proposals from flights + scenario
// ---------------------------------------------------------
function generateRerouteProposals(
  flights: Flight[],
  scenarioId: EmergencyScenarioId,
  locked: boolean
): RerouteProposal[] {
  if (locked) return [];

  const reasonByScenario: Record<EmergencyScenarioId, string> = {
    wx: "Route bends around convective weather corridor.",
    runway: "Route adjusted to relieve KLAX runway constraint.",
    staffing: "Route shifts load off the constrained sector.",
  };

  return flights
    .filter((f) => f.riskScore >= 0.5)
    .map((f, idx) => {
      const currentRoute =
        f.route ?? `${f.origin} DCT FIX${idx + 1} DCT ${f.destination}`;
      const proposedRoute = currentRoute.replace(
        "DCT",
        `DCT RERTE${idx + 1} DCT`
      );

      return {
        id: `prop-${f.id}`,
        flightId: f.id,
        callsign: f.callsign,
        currentRoute,
        proposedRoute,
        icaoBefore: icaoPlan(f, currentRoute),
        icaoAfter: icaoPlan(f, proposedRoute, "F310"),
        riskBefore: f.riskScore,
        riskAfter: Number((f.riskScore * 0.4).toFixed(2)),
        reason: reasonByScenario[scenarioId],
        createdAt: new Date().toISOString(),
        applied: false,
      };
    });
}

// ---------------------------------------------------------
// PAGE COMPONENT
// ---------------------------------------------------------
export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>(() =>
    createInitialFlights()
  );
  const [scenarioId, setScenarioId] =
    useState<EmergencyScenarioId>("wx");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [proposals, setProposals] = useState<RerouteProposal[]>([]);
  const [scenarioLocked, setScenarioLocked] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    null
  );

  // Scenario change → conditions, hazard zones, risk
  useEffect(() => {
    const zones = buildHazardZonesForScenario(scenarioId);
    setHazardZones(zones);
    setConditions(buildConditionsForScenario(scenarioId));

    if (!scenarioLocked) {
      setFlights((prev) =>
        prev.map((f) => ({
          ...f,
          riskScore: computeRisk(f, scenarioId),
        }))
      );
    }
  }, [scenarioId, scenarioLocked]);

  // Proposals
  useEffect(() => {
    setProposals(
      generateRerouteProposals(flights, scenarioId, scenarioLocked)
    );
  }, [flights, scenarioId, scenarioLocked]);

  // Animation loop
  useEffect(() => {
    const id = setInterval(() => {
      setFlights((prev) => stepFlights(prev));
    }, 1600);

    return () => clearInterval(id);
  }, []);

  // Approve & apply all reroutes
  const handleApproveAll = () => {
    if (proposals.length === 0) return;

    setScenarioLocked(true);

    setFlights((prev) =>
      prev.map((f) => {
        const p = proposals.find((pp) => pp.flightId === f.id);
        if (!p) return f;

        const origin = airportFor(f.origin);
        const dest = airportFor(f.destination);

        let bendFactor = 0.6;
        if (scenarioId === "wx") bendFactor = 1.0;
        else if (scenarioId === "runway") bendFactor = -0.8;
        else if (scenarioId === "staffing") bendFactor = 0.4;

        const newPath = buildCurvedPath(origin, dest, bendFactor);

        return {
          ...f,
          route: p.proposedRoute,
          riskScore: p.riskAfter,
          frozen: true,
          path: newPath,
          progress: 0,
          latitude: newPath[0].lat,
          longitude: newPath[0].lon,
        };
      })
    );

    setProposals((prev) =>
      prev.map((p) => ({ ...p, applied: true }))
    );
  };

  const riskStats = useMemo(() => {
    if (!flights.length) return { avg: 0, max: 0 };
    const vals = flights.map((f) => f.riskScore);
    return {
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      max: Math.max(...vals),
    };
  }, [flights]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sector Console</h1>
        <div className="text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Simulation active</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* LEFT: Map + flights */}
        <div className="space-y-4">
          <div className="card h-[380px] md:h-[430px]">
            <div className="mb-2 flex items-center justify-between text-sm">
              <h2 className="font-medium">Sector Map</h2>
              <span className="text-xs text-slate-500">
                {flights.length.toString().padStart(2, "0")} active flights
              </span>
            </div>
            <FlightMap
              flights={flights}
              selectedFlightId={selectedFlightId}
              hazardZones={hazardZones}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Active Flights</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {flights.map((f) => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  selected={selectedFlightId === f.id}
                  onSelect={() =>
                    setSelectedFlightId((prev) =>
                      prev === f.id ? null : f.id
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Conditions + approvals */}
        <div className="space-y-4">
          <div className="card">
            <ConditionsPanel
              scenarios={EMERGENCY_SCENARIOS}
              activeScenarioId={scenarioId}
              onScenarioChange={(id) => {
                if (!scenarioLocked) setScenarioId(id);
              }}
              conditions={conditions}
              averageRisk={riskStats.avg}
              maxRisk={riskStats.max}
              totalFlights={flights.length}
            />
          </div>

          <div className="card">
            <ApprovalPanel
              proposals={proposals}
              onApproveAll={handleApproveAll}
              isApplying={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
