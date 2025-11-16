// app/flights/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";

const FlightMap = nextDynamic(() => import("../../components/FlightMap"), {
  ssr: false
});

import FlightCard from "../../components/FlightCard";
import ConditionsPanel from "../../components/ConditionsPanel";
import ApprovalPanel from "../../components/ApprovalPanel";

import type {
  Flight,
  Condition,
  EmergencyScenario,
  EmergencyScenarioId,
  RerouteProposal
} from "../../lib/types";

import {
  createSyntheticFlights,
  stepFlights
} from "../../lib/sim";

const SCENARIOS: EmergencyScenario[] = [
  { id: "wx", name: "Convective Weather Line", description: "", type: "weather" },
  { id: "runway", name: "Runway Closure at Hub", description: "", type: "runway" },
  { id: "staffing", name: "Staffing Shortage", description: "", type: "staffing" }
];

function buildConditions(s: EmergencyScenario): Condition[] {
  switch (s.id) {
    case "wx":
      return [
        {
          id: "wx1",
          type: "weather",
          label: "Convective SIGMET",
          severity: "high",
          description: "Thunderstorm line across sector.",
          active: true
        }
      ];
    case "runway":
      return [
        {
          id: "rw1",
          type: "runway",
          label: "Runway 25R Closed",
          severity: "medium",
          description: "Primary arrival runway unavailable.",
          active: true
        }
      ];
    case "staffing":
      return [
        {
          id: "st1",
          type: "staffing",
          label: "Controller Shortage",
          severity: "medium",
          description: "Reduced staffing workload.",
          active: true
        }
      ];
    default:
      return [];
  }
}

function computeRisk(f: Flight, scenario: EmergencyScenarioId) {
  if (f.frozen) return f.riskScore; // IMPORTANT

  let r = 0.25;

  if (scenario === "wx" && f.longitude > -120 && f.longitude < -110) r += 0.4;
  if (scenario === "runway" && ["KLAX","KSFO","KPHX","KLAS"].includes(f.destination)) r += 0.3;
  if (scenario === "staffing" && f.longitude < -118) r += 0.25;

  return Number(Math.max(0, Math.min(1, r)).toFixed(2));
}

// ATC-style flight plan text
function icao(f: Flight, route: string, newLevel?: string) {
  const spd = `N0${Math.round(f.speedKts / 10) * 10}`;
  const lvl = newLevel ?? `F${Math.round(f.altitude / 1000) * 10}`;

  return [
    `FPL-${f.callsign}-IS`,
    `-C/B738/M-SDFGIRWY/S`,
    `-${f.origin}0800`,
    `-${spd}${lvl} ${route}`,
    `-${f.destination}0200`,
    `-DOF/250115`
  ].join("\n");
}

function buildProposals(flights: Flight[], s: EmergencyScenarioId, locked: boolean): RerouteProposal[] {
  if (locked) return []; // IMPORTANT — freeze proposals forever

  return flights
    .filter(f => f.riskScore >= 0.6)
    .map((f, i) => {
      const before = f.route ?? `${f.origin} DCT FIX${i+1} ${f.destination}`;
      const after = before.replace("DCT", `DCT REROUTE${i+1} DCT`);

      return {
        id: `P-${f.id}`,
        flightId: f.id,
        callsign: f.callsign,
        currentRoute: before,
        proposedRoute: after,
        icaoBefore: icao(f, before),
        icaoAfter: icao(f, after, "F310"),
        riskBefore: f.riskScore,
        riskAfter: Number((f.riskScore * 0.35).toFixed(2)),
        reason: "Reroute avoids impact region.",
        createdAt: new Date().toISOString(),
        applied: false
      };
    });
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [scenario, setScenario] = useState<EmergencyScenarioId>("wx");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [proposals, setProposals] = useState<RerouteProposal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [tick, setTick] = useState("");

  // INIT
  useEffect(() => {
    const init = createSyntheticFlights();
    setFlights(
      init.map(f => ({
        ...f,
        riskScore: computeRisk(f, scenario)
      }))
    );
    setTick(new Date().toLocaleTimeString());
  }, []);

  // SCENARIO CHANGE
  useEffect(() => {
    if (locked) return; // freeze after approval

    const sc = SCENARIOS.find(s => s.id === scenario)!;
    setConditions(buildConditions(sc));
    setFlights(prev =>
      prev.map(f => ({
        ...f,
        riskScore: computeRisk(f, scenario)
      }))
    );
  }, [scenario, locked]);

  // PROPOSALS
  useEffect(() => {
    setProposals(buildProposals(flights, scenario, locked));
  }, [flights, scenario, locked]);

  // STEP ANIMATION
  useEffect(() => {
    const id = setInterval(() => {
      setFlights(prev => stepFlights(prev));
      setTick(new Date().toLocaleTimeString());
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // APPLY ALL
  const handleApply = () => {
    if (proposals.length === 0) return;

    setLocked(true);

    setFlights(prev =>
      prev.map(f => {
        const p = proposals.find(x => x.flightId === f.id);
        if (!p) return f;

        return {
          ...f,
          frozen: true,
          riskScore: p.riskAfter,
          route: p.proposedRoute
        };
      })
    );

    setProposals(prev => prev.map(p => ({ ...p, applied: true })));
  };

  const riskStats = useMemo(() => {
    if (!flights.length) return { avg: 0, max: 0 };
    const vals = flights.map(f => f.riskScore);
    return {
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      max: Math.max(...vals)
    };
  }, [flights]);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sector Console</h1>
        </div>
        <div className="text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Simulation running</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <div>Last tick: {tick}</div>
        </div>
      </header>

      {/* GRID */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        
        {/* LEFT: Map + Flights */}
        <div className="space-y-4">
          <div className="card h-[420px]">
            <div className="mb-2 text-sm font-medium">Sector Map</div>
            <FlightMap flights={flights} />
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Active Flights</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {flights.map(f => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  selected={selectedId === f.id}
                  onSelect={() =>
                    setSelectedId(prev => (prev === f.id ? null : f.id))
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Conditions + Approvals */}
        <div className="space-y-4">
          <div className="card">
            <ConditionsPanel
              scenarios={SCENARIOS}
              activeScenarioId={scenario}
              onScenarioChange={id => !locked && setScenario(id)}
              conditions={conditions}
              averageRisk={riskStats.avg}
              maxRisk={riskStats.max}
              totalFlights={flights.length}
            />
          </div>

          <div className="card">
            <ApprovalPanel
              proposals={proposals}
              isApplying={false}
              onApproveAll={handleApply}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
