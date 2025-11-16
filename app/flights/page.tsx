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
import { createSyntheticFlights, stepFlights } from "../../lib/sim";

const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    id: "wx",
    name: "Convective Weather Line",
    description: "",
    type: "weather"
  },
  {
    id: "runway",
    name: "Runway Closure at Hub",
    description: "",
    type: "runway"
  },
  {
    id: "staffing",
    name: "Staffing Shortage",
    description: "",
    type: "staffing"
  }
];

function buildConditionsForScenario(
  scenario: EmergencyScenario
): Condition[] {
  switch (scenario.id) {
    case "wx":
      return [
        {
          id: "cond-wx-1",
          type: "weather",
          label: "Convective SIGMET",
          severity: "high",
          description: "Thunderstorm activity along the central corridor.",
          active: true
        }
      ];
    case "runway":
      return [
        {
          id: "cond-rwy-1",
          type: "runway",
          label: "Runway 25R Closed",
          severity: "medium",
          description: "Primary arrival runway at hub unavailable.",
          active: true
        }
      ];
    case "staffing":
      return [
        {
          id: "cond-staff-1",
          type: "staffing",
          label: "Reduced Staffing",
          severity: "medium",
          description: "Sector staffed with reduced controller positions.",
          active: true
        }
      ];
    default:
      return [];
  }
}

function computeRisk(flight: Flight, scenarioId: EmergencyScenarioId): number {
  let risk =
    0.2 +
    Math.max(0, Math.min(1, (flight.speedKts - 350) / 200)) * 0.3 +
    (flight.altitude < 20000 ? 0.15 : 0);

  if (scenarioId === "wx") {
    if (flight.longitude > -120 && flight.longitude < -110) {
      risk += 0.35;
      flight.isEmergency = true;
    }
  } else if (scenarioId === "runway") {
    if (["KLAX", "KSFO", "KPHX", "KLAS"].includes(flight.destination.toUpperCase())) {
      risk += 0.3;
      flight.isEmergency = true;
    }
  } else if (scenarioId === "staffing") {
    if (flight.longitude < -118) {
      risk += 0.25;
      flight.isEmergency = true;
    }
  }

  return Number(Math.max(0, Math.min(1, risk)).toFixed(2));
}

// Very simple ICAO-style FPL you can read out as ATC
function buildIcaoFlightPlan(
  flight: Flight,
  route: string,
  overriddenCruiseLevel?: string
): string {
  const dep = flight.origin;
  const dest = flight.destination;
  const callsign = flight.callsign;
  const type = "B738/M"; // synthetic aircraft type
  const equipment = "SDFGIRWY/S";
  const speed = `N0${Math.round(flight.speedKts / 10) * 10}`;
  const level = overriddenCruiseLevel ?? `F${Math.round(flight.altitude / 1000) * 10}`;

  // Compressed but ATC-readable
  return [
    `FPL-${callsign}-IS`,
    `-C/${type}-${equipment}`,
    `-${dep}0800`,
    `-${speed}${level} ${route}`,
    `-${dest}0200`,
    `-DOF/250115`
  ].join("\n");
}

function generateRerouteProposals(
  flights: Flight[],
  scenarioId: EmergencyScenarioId
): RerouteProposal[] {
  const reasonsByScenario: Record<EmergencyScenarioId, string> = {
    wx: "Routes avoid the convective corridor while preserving arrival slots.",
    runway:
      "Routes steer arrivals to secondary runways and reduce vectoring time.",
    staffing:
      "Routes offload traffic toward adjacent sectors to reduce controller load."
  };

  const reason = reasonsByScenario[scenarioId];

  return flights
    .filter((f) => f.riskScore >= 0.6)
    .map((flight, idx) => {
      const riskAfter = Number((flight.riskScore * 0.4).toFixed(2));

      const baseRoute =
        flight.route ||
        `${flight.origin} DCT FIX${idx + 1} ${flight.destination}`;

      // Inject a simple “reroute” fix into the route string
      const rerouteFix = `REROUTE${idx + 1}`;
      const proposedRoute = baseRoute.includes("DCT")
        ? baseRoute.replace("DCT", `DCT ${rerouteFix} DCT`)
        : `${flight.origin} DCT ${rerouteFix} DCT ${flight.destination}`;

      const icaoBefore = buildIcaoFlightPlan(flight, baseRoute);
      const icaoAfter = buildIcaoFlightPlan(flight, proposedRoute, "F310");

      return {
        id: `prop-${flight.id}`,
        flightId: flight.id,
        callsign: flight.callsign,
        currentRoute: baseRoute,
        proposedRoute,
        icaoBefore,
        icaoAfter,
        riskBefore: flight.riskScore,
        riskAfter,
        reason,
        createdAt: new Date().toISOString(),
        applied: false
      };
    });
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] =
    useState<EmergencyScenarioId>("wx");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [proposals, setProposals] = useState<RerouteProposal[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [tickTime, setTickTime] = useState<string | null>(null);

  // Initialize synthetic flights + start animation loop
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const initial = createSyntheticFlights();
    if (isMounted) {
      const withRisk = initial.map((f) => ({
        ...f,
        riskScore: computeRisk({ ...f }, scenarioId)
      }));
      setFlights(withRisk);
      setTickTime(new Date().toLocaleTimeString());
    }

    intervalId = setInterval(() => {
      if (!isMounted) return;
      setFlights((prev) => {
        const stepped = stepFlights(prev);
        return stepped.map((f) => ({
          ...f,
          riskScore: computeRisk({ ...f }, scenarioId)
        }));
      });
      setTickTime(new Date().toLocaleTimeString());
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update conditions + recompute risk when scenario changes
  useEffect(() => {
    const scenario =
      EMERGENCY_SCENARIOS.find((s) => s.id === scenarioId) ??
      EMERGENCY_SCENARIOS[0];

    setConditions(buildConditionsForScenario(scenario));

    setFlights((prev) =>
      prev.map((f) => ({
        ...f,
        riskScore: computeRisk({ ...f }, scenarioId)
      }))
    );
  }, [scenarioId]);

  // Generate reroute proposals
  useEffect(() => {
    setProposals(generateRerouteProposals(flights, scenarioId));
  }, [flights, scenarioId]);

  const riskStats = useMemo(() => {
    if (flights.length === 0) return { avg: 0, max: 0 };
    const values = flights.map((f) => f.riskScore);
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      max: Math.max(...values)
    };
  }, [flights]);

  const handleScenarioChange = (id: EmergencyScenarioId) => {
    setScenarioId(id);
  };

  const handleApproveAll = () => {
    if (proposals.length === 0) return;

    setIsApplying(true);

    setFlights((prev) =>
      prev.map((f) => {
        const p = proposals.find((p) => p.flightId === f.id);
        if (!p) return f;
        return {
          ...f,
          route: p.proposedRoute,
          riskScore: p.riskAfter
        };
      })
    );

    setProposals((prev) => prev.map((p) => ({ ...p, applied: true })));

    setTimeout(() => setIsApplying(false), 400);
  };

  const airportsSummary = useMemo(() => {
    const pairs = new Set<string>();
    flights.forEach((f) => pairs.add(`${f.origin} → ${f.destination}`));
    return Array.from(pairs).slice(0, 6);
  }, [flights]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Live Sector Console
          </h1>
          {airportsSummary.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Active flows: {airportsSummary.join("  ·  ")}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Simulation running</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          {tickTime && (
            <span>
              Last tick <span className="text-slate-200">{tickTime}</span>
            </span>
          )}
        </div>
      </header>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
        {/* Left: Map + flights */}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <h2 className="font-medium">Active Flights</h2>
              <span className="text-xs text-slate-500">
                Select a flight to inspect airports and position.
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {flights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  selected={flight.id === selectedFlightId}
                  onSelect={() =>
                    setSelectedFlightId((prev) =>
                      prev === flight.id ? null : flight.id
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: conditions + approvals */}
        <div className="space-y-4">
          <div className="card">
            <ConditionsPanel
              scenarios={EMERGENCY_SCENARIOS}
              activeScenarioId={scenarioId}
              onScenarioChange={handleScenarioChange}
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
              isApplying={isApplying}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
