"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import type {
  Flight,
  Condition,
  EmergencyScenario,
  EmergencyScenarioId,
  RerouteProposal,
  Airport
} from "../../lib/types";

import {
  stepFlights,
  buildCurvedPath,
  generateRandomPath
} from "../../lib/sim";

// Dynamically import FlightMap to avoid SSR issues
const FlightMap = dynamic(() => import("../../components/FlightMap"), {
  ssr: false,
});

import FlightCard from "../../components/FlightCard";
import ConditionsPanel from "../../components/ConditionsPanel";
import ApprovalPanel from "../../components/ApprovalPanel";

// ----------------------------------------------
// Synthetic Local Airports
// ----------------------------------------------
const AIRPORTS: Record<string, Airport> = {
  KLAX: { code: "KLAX", name: "Los Angeles Intl", lat: 33.9425, lon: -118.4081 },
  KSAN: { code: "KSAN", name: "San Diego Intl", lat: 32.7338, lon: -117.1933 },
  KSFO: { code: "KSFO", name: "San Francisco Intl", lat: 37.6213, lon: -122.3790 },
  KSMF: { code: "KSMF", name: "Sacramento Intl", lat: 38.6954, lon: -121.5908 },
  KLAS: { code: "KLAS", name: "Harry Reid Intl", lat: 36.0840, lon: -115.1537 },
  KPHX: { code: "KPHX", name: "Phoenix Sky Harbor", lat: 33.4342, lon: -112.0116 },
};

// Helper to safely pull airport objects
function flToAp(code: string): Airport {
  return AIRPORTS[code];
}

// ----------------------------------------------
// Synthetic Emergency Scenarios
// ----------------------------------------------
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

// ----------------------------------------------
// Scenario → Conditions
// ----------------------------------------------
function buildConditionsForScenario(scenario: EmergencyScenario): Condition[] {
  switch (scenario.id) {
    case "wx":
      return [
        {
          id: "cond-wx-1",
          type: "weather",
          label: "Convective SIGMET",
          severity: "high",
          description: "Storm line across the sector.",
          active: true,
        },
      ];
    case "runway":
      return [
        {
          id: "cond-rwy-1",
          type: "runway",
          label: "Runway 27 Closed",
          severity: "medium",
          description: "Primary arrival runway blocked.",
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
          description: "Sector operating with limited controllers.",
          active: true,
        },
      ];
    default:
      return [];
  }
}

// ----------------------------------------------
// Risk Computation
// ----------------------------------------------
function computeRisk(f: Flight, scenarioId: EmergencyScenarioId): number {
  let risk =
    0.2 +
    Math.max(0, Math.min(1, (f.speedKts - 350) / 200)) * 0.3 +
    (f.altitude < 20000 ? 0.15 : 0);

  // Scenario adjustments
  if (scenarioId === "wx") {
    risk += 0.3;
  }
  if (scenarioId === "runway") {
    risk += 0.15;
  }
  if (scenarioId === "staffing") {
    risk += 0.1;
  }

  return Number(Math.min(1, Math.max(0, risk)).toFixed(2));
}

// ----------------------------------------------
// Synthetic Starting Flights (10 flights)
// ----------------------------------------------
function createInitialFlights(): Flight[] {
  const PAIRS = [
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
    const origin = flToAp(o);
    const dest = flToAp(d);
    const path = generateRandomPath(origin, dest);

    return {
      id: `FL${id}`,
      callsign: `FL${id}`,
      origin: o,
      destination: d,
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
    };
  });
}

// ----------------------------------------------
// Reroute Proposal Generator
// ----------------------------------------------
function generateRerouteProposals(
  flights: Flight[],
  scenarioId: EmergencyScenarioId,
  scenarioLocked: boolean
): RerouteProposal[] {
  if (scenarioLocked) return []; // freeze reroutes after approval

  const reasons: Record<EmergencyScenarioId, string> = {
    wx: "Adjusted to avoid convective weather cells.",
    runway: "Adjusted to accommodate runway constraints.",
    staffing: "Adjusted to relieve sector workload.",
  };

  return flights
    .filter((f) => f.riskScore >= 0.5)
    .map((f) => {
      const origin = flToAp(f.origin);
      const dest = flToAp(f.destination);

      // Create ICAO messages
      const currentICAO = `FPL-${f.callsign}-IS
-C/B738/M-SDFGIRWY/S
-${f.origin}0800
-N0450F${Math.round(f.altitude / 100)} ${f.origin} DCT FIX1 DCT ${f.destination}
-${f.destination}0200
-DOF/250115`;

      const proposedICAO = `FPL-${f.callsign}-IS
-C/B738/M-SDFGIRWY/S
-${f.origin}0800
-N0450F${Math.round(f.altitude / 100)} ${f.origin} DCT RERTE DCT ${f.destination}
-${f.destination}0200
-DOF/250115`;

      return {
        id: `prop-${f.id}`,
        flightId: f.id,
        callsign: f.callsign,
        currentRoute: `${f.origin} FIX1 ${f.destination}`,
        proposedRoute: `${f.origin} RERTE ${f.destination}`,
        icaoBefore: currentICAO,
        icaoAfter: proposedICAO,
        riskBefore: f.riskScore,
        riskAfter: Number((f.riskScore * 0.4).toFixed(2)),
        reason: reasons[scenarioId],
        createdAt: new Date().toISOString(),
        applied: false,
      };
    });
}

// ----------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------
export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>(() =>
    createInitialFlights()
  );
  const [scenarioId, setScenarioId] =
    useState<EmergencyScenarioId>("wx");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [proposals, setProposals] = useState<RerouteProposal[]>([]);
  const [scenarioLocked, setScenarioLocked] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    null
  );

  // ----------------------------------------------
  // Scenario Change
  // ----------------------------------------------
  useEffect(() => {
    const scenario =
      EMERGENCY_SCENARIOS.find((s) => s.id === scenarioId) ??
      EMERGENCY_SCENARIOS[0];

    setConditions(buildConditionsForScenario(scenario));

    if (!scenarioLocked) {
      setFlights((prev) =>
        prev.map((f) => ({
          ...f,
          riskScore: f.frozen
            ? f.riskScore
            : computeRisk(f, scenarioId),
        }))
      );
    }
  }, [scenarioId, scenarioLocked]);

  // ----------------------------------------------
  // Reroute Proposal Generation
  // ----------------------------------------------
  useEffect(() => {
    setProposals(generateRerouteProposals(flights, scenarioId, scenarioLocked));
  }, [flights, scenarioId, scenarioLocked]);

  // ----------------------------------------------
  // Animate Flights
  // ----------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setFlights((prev) => stepFlights(prev));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ----------------------------------------------
  // Approve All Reroutes
  // ----------------------------------------------
  const handleApproveAll = () => {
    if (proposals.length === 0) return;

    setScenarioLocked(true); // freeze system forever

    setFlights((prev) =>
      prev.map((f) => {
        const p = proposals.find((pp) => pp.flightId === f.id);
        if (!p) return f;

        const originA = flToAp(f.origin);
        const destA = flToAp(f.destination);

        // Build NEW flight path
        const newCurve = Math.random() * 1.8 - 0.9;
        const newPath = buildCurvedPath(originA, destA, newCurve);

        return {
          ...f,
          route: p.proposedRoute,
          riskScore: p.riskAfter,
          frozen: true,
          applied: true,
          path: newPath,
          progress: 0,
          latitude: newPath[0].lat,
          longitude: newPath[0].lon,
        };
      })
    );

    setProposals((prev) =>
      prev.map((p) => ({
        ...p,
        applied: true,
      }))
    );
  };

  const riskStats = useMemo(() => {
    if (flights.length === 0) return { avg: 0, max: 0 };
    const values = flights.map((f) => f.riskScore);
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      max: Math.max(...values),
    };
  }, [flights]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Live Sector Console</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1.1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <div className="card h-[360px] md:h-[420px]">
            <div className="mb-3 flex items-center justify-between text-sm">
              <h2 className="font-medium">Sector Map</h2>
              <span className="text-xs text-slate-500">
                {flights.length.toString().padStart(2, "0")} tracked flights
              </span>
            </div>

            <FlightMap flights={flights} />
          </div>

          <div>
            <h2 className="font-medium text-sm mb-2">Active Flights</h2>
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

        {/* RIGHT COLUMN */}
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

