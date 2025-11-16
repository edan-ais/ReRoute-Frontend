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
  stepFlights,
  buildCurvedPath
} from "../../lib/sim";

const SCENARIOS: EmergencyScenario[] = [
  { id: "wx", name: "Convective Weather Line", description: "", type: "weather" },
  { id: "runway", name: "Runway Closure at Hub", description: "", type: "runway" },
  { id: "staffing", name: "Staffing Shortage", description: "", type: "staffing" }
];

function buildConditions(id: EmergencyScenarioId): Condition[] {
  switch (id) {
    case "wx":
      return [
        {
          id: "wx1",
          type: "weather",
          label: "Convective SIGMET",
          severity: "high",
          description: "Thunderstorm corridor in sector.",
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
          label: "Reduced Controller Staffing",
          severity: "medium",
          description: "Controller shortage in primary sector.",
          active: true
        }
      ];
    default:
      return [];
  }
}

function computeRisk(f: Flight, s: EmergencyScenarioId) {
  if (f.frozen) return f.riskScore;

  let r = 0.25;
  if (s === "wx" && f.longitude > -120 && f.longitude < -110) r += 0.4;
  if (s === "runway" && ["KLAX","KSFO","KPHX","KLAS"].includes(f.destination)) r += 0.3;
  if (s === "staffing" && f.longitude < -118) r += 0.25;
  return Number(Math.min(1, r).toFixed(2));
}

// ICAO format
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

function buildProposals(
  flights: Flight[],
  scenario: EmergencyScenarioId,
  locked: boolean
): RerouteProposal[] {
  if (locked) return [];

  return flights
    .filter(f => f.riskScore >= 0.6)
    .map((f, i) => {
      const base = f.route ?? `${f.origin} DCT FIX${i + 1} ${f.destination}`;
      const rer = base.replace("DCT", `DCT REROUTE${i + 1} DCT`);

      return {
        id: `P-${f.id}`,
        flightId: f.id,
        callsign: f.callsign,
        currentRoute: base,
        proposedRoute: rer,
        icaoBefore: icao(f, base),
        icaoAfter: icao(f, rer, "F310"),
        riskBefore: f.riskScore,
        riskAfter: Number((f.riskScore * 0.35).toFixed(2)),
        reason: "Avoids impacted region.",
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
    if (locked) return;

    setConditions(buildConditions(scenario));
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

  // ANIMATION LOOP
  useEffect(() => {
    const id = setInterval(() => {
      setFlights(prev => stepFlights(prev));
      setTick(new Date().toLocaleTimeString());
    }, 1600);
    return () => clearInterval(id);
  }, []);

  // **APPROVAL HANDLER — this is the critical part**
  const handleApply = () => {
    if (proposals.length === 0) return;

    setLocked(true);

    setFlights(prev =>
      prev.map(f => {
        const p = proposals.find(pp => pp.flightId === f.id);
        if (!p) return f;

        // Build NEW curved path to visibly change line
        const orig = flights.find(x => x.id === f.id)!;
        const origAirport = { lat: orig.latitude, lon: orig.longitude }; // current pos midflight
        const o = { lat: orig.originName ? 0 : 0 }; // preserved for future use

        // Use starting/ending airports
        const originAp = flights.find(x => x.id === f.id)!.origin;
        const destAp = flights.find(x => x.id === f.id)!.destination;

        const start = flights.find(x => x.id === f.id)!;
        const oA = flToAp(start.origin);
        const dA = flToAp(start.destination);

        // Build NEW route path with different curve
        const newPath = buildCurvedPath(oA, dA, Math.random() * 1.8 - 0.9);

        return {
          ...f,
          frozen: true,
          riskScore: p.riskAfter,
          route: p.proposedRoute,
          path: newPath,
          progress: 0 // restart animation along new line
        };
      })
    );

    setProposals(prev => prev.map(p => ({ ...p, applied: true })));
  };

  // Helper to get ICAO airport from code
  function flToAp(code: string) {
    return {
      code,
      lat: {
        KLAX: 33.9425, KSAN: 32.7338, KSFO: 37.6213,
        KSMF: 38.6954, KLAS: 36.0840, KPHX: 33.4342
      }[code]!,
      lon: {
        KLAX: -118.4081, KSAN: -117.1933, KSFO: -122.3790,
        KSMF: -121.5908, KLAS: -115.1537, KPHX: -112.0116
      }[code]!
    };
  }

  const stats = useMemo(() => {
    if (!flights.length) return { avg: 0, max: 0 };
    const r = flights.map(f => f.riskScore);
    return {
      avg: r.reduce((a, b) => a + b, 0) / r.length,
      max: Math.max(...r)
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
          <div>Last tick: {tick}</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        
        <div className="space-y-4">
          <div className="card h-[420px]">
            <div className="mb-2 text-sm">Sector Map</div>
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

        <div className="space-y-4">
          <div className="card">
            <ConditionsPanel
              scenarios={SCENARIOS}
              activeScenarioId={scenario}
              onScenarioChange={id => !locked && setScenario(id)}
              conditions={conditions}
              averageRisk={stats.avg}
              maxRisk={stats.max}
              totalFlights={flights.length}
            />
          </div>

          <div className="card">
            <ApprovalPanel
              proposals={proposals}
              onApproveAll={handleApply}
              isApplying={false}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
