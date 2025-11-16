// app/flights/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import FlightMap from "../../components/FlightMap";
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
import { fetchLiveFlights } from "../../lib/api";

// Three emergencies you can click through
const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    id: "wx",
    name: "Convective Weather Line",
    description:
      "Thunderstorm line across the central sector corridor requiring route deviations.",
    type: "weather"
  },
  {
    id: "runway",
    name: "Runway Closure at Hub",
    description:
      "Primary arrival runway at major hub unavailable, pushing arrivals onto secondary procedures.",
    type: "runway"
  },
  {
    id: "staffing",
    name: "Staffing Shortage",
    description:
      "Reduced staffing in the western sector, requiring complexity reduction via reroutes.",
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
          description:
            "Embedded cells and a broken line of thunderstorms along the central corridor.",
          active: true
        }
      ];
    case "runway":
      return [
        {
          id: "cond-rwy-1",
          type: "runway",
          label: "Runway 27 Closed",
          severity: "medium",
          description:
            "Runway 27 at primary hub closed for inspection; arrivals using longer downwind vectors.",
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
          description:
            "Sector staffed with 2 of 3 positions; complexity reduction required.",
          active: true
        }
      ];
    default:
      return [];
  }
}

/**
 * Simple risk model:
 * - Base risk from speed + altitude
 * - Scenario-specific bumps based on longitude / destination
 */
function computeRisk(flight: Flight, scenarioId: EmergencyScenarioId): number {
  // Base: faster + lower altitude → slightly higher risk
  let risk =
    0.2 +
    Math.max(0, Math.min(1, (flight.speedKts - 350) / 200)) * 0.3 +
    (flight.altitude < 20000 ? 0.15 : 0);

  if (scenarioId === "wx") {
    // Weather corridor across the middle longitudes
    if (flight.longitude > -115 && flight.longitude < -90) {
      risk += 0.35;
      flight.isEmergency = true;
    }
  } else if (scenarioId === "runway") {
    if (
      ["KJFK", "KORD", "KATL", "KLAX"].includes(flight.destination.toUpperCase())
    ) {
      risk += 0.3;
      flight.isEmergency = true;
    }
  } else if (scenarioId === "staffing") {
    if (flight.longitude < -115) {
      risk += 0.25;
      flight.isEmergency = true;
    }
  }

  risk = Math.max(0, Math.min(1, risk));
  return Number(risk.toFixed(2));
}

function generateRerouteProposals(
  flights: Flight[],
  scenarioId: EmergencyScenarioId
): RerouteProposal[] {
  const reasonsByScenario: Record<EmergencyScenarioId, string> = {
    wx: "Shifts route laterally around convective weather while preserving arrival slot times.",
    runway:
      "Sequences arrivals onto secondary runway and adjusts STARs to reduce vectoring.",
    staffing:
      "Flattens crossing flows and offloads traffic into adjacent sectors to reduce complexity."
  };

  const reason = reasonsByScenario[scenarioId];

  return flights
    .filter((f) => f.riskScore >= 0.6)
    .map((flight, idx) => {
      const riskAfter = Number((flight.riskScore * 0.4).toFixed(2));

      const currentRoute =
        flight.route ||
        `${flight.origin} ... ${flight.destination}`;

      const proposedRoute = `${flight.origin} DCT REROUTE${idx + 1} ${
        flight.destination
      }`;

      return {
        id: `prop-${flight.id}`,
        flightId: flight.id,
        callsign: flight.callsign,
        currentRoute,
        proposedRoute,
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
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    null
  );
  const [scenarioId, setScenarioId] =
    useState<EmergencyScenarioId>("wx");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [proposals, setProposals] = useState<RerouteProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load initial flights + poll for updates
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const load = async () => {
      setIsLoading(true);
      try {
        const liveFlights = await fetchLiveFlights();
        if (!isMounted) return;

        setFlights((prev) => {
          // When new data arrives, reattach any existing routes if ids match
          const previousById = new Map(prev.map((f) => [f.id, f]));
          return liveFlights.map((f) => {
            const existing = previousById.get(f.id);
            return existing
              ? { ...f, route: existing.route, riskScore: existing.riskScore }
              : f;
          });
        });

        setLastUpdated(new Date().toLocaleTimeString());
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    // Poll every 15 seconds to simulate "real-time"
    intervalId = setInterval(load, 15_000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Update risk + conditions + proposals whenever flights or scenario change
  useEffect(() => {
    const scenario =
      EMERGENCY_SCENARIOS.find((s) => s.id === scenarioId) ??
      EMERGENCY_SCENARIOS[0];

    setConditions(buildConditionsForScenario(scenario));

    setFlights((prev) =>
      prev.map((f) => {
        const riskScore = computeRisk({ ...f }, scenarioId);
        return { ...f, riskScore };
      })
    );
  }, [scenarioId]);

  // Recompute proposals whenever risk/scenario changes
  useEffect(() => {
    setProposals(generateRerouteProposals(flights, scenarioId));
  }, [flights, scenarioId]);

  const riskStats = useMemo(() => {
    if (flights.length === 0) {
      return { avg: 0, max: 0 };
    }
    const values = flights.map((f) => f.riskScore);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    return { avg, max };
  }, [flights]);

  const handleScenarioChange = (id: EmergencyScenarioId) => {
    setScenarioId(id);
  };

  const handleApproveAll = () => {
    if (proposals.length === 0) return;

    setIsApplying(true);

    // Simulate applying reroutes by updating flight plans + risk
    setFlights((prev) =>
      prev.map((f) => {
        const proposal = proposals.find((p) => p.flightId === f.id);
        if (!proposal) return f;
        return {
          ...f,
          route: proposal.proposedRoute,
          riskScore: proposal.riskAfter
        };
      })
    );

    setProposals((prev) => prev.map((p) => ({ ...p, applied: true })));

    setTimeout(() => {
      setIsApplying(false);
    }, 400);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Live Sector Console
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Live flights from your provider, risk-scored in real time with
            agent-proposed reroutes and human-in-the-loop approvals on a
            single pane of glass.
          </p>
        </div>
        <div className="flex flex-col items-end text-xs text-slate-400">
          <span>
            {isLoading ? "Updating from live feed…" : "Connected to live feed"}
          </span>
          {lastUpdated && (
            <span className="mt-0.5">
              Last update at <span className="text-slate-200">{lastUpdated}</span>
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
        {/* LEFT: Map + flights list */}
        <div className="space-y-4">
          <div className="card h-[360px] md:h-[420px]">
            <div className="mb-3 flex items-center justify-between text-sm">
              <h2 className="font-medium">Sector Map</h2>
              <span className="text-xs text-slate-500">
                {flights.length.toString().padStart(2, "0")} active flight
                paths
              </span>
            </div>
            <FlightMap
              flights={flights}
              selectedFlightId={selectedFlightId}
              scenarioId={scenarioId}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <h2 className="font-medium">Active Flights</h2>
              <span className="text-xs text-slate-500">
                Click a flight to highlight it on the map.
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

        {/* RIGHT: Emergencies + approvals */}
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
