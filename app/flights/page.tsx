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
          description:
            "Thunderstorm activity along the central corridor.",
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
            "Primary arrival runway at hub unavailable.",
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
            "Sector staffed with reduced positions.",
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
    if (flight.longitude > -115 && flight.longitude < -90) {
      risk += 0.35;
      flight.isEmergency = true;
    }
  } else if (scenarioId === "runway") {
    if (
      ["KJFK", "KORD", "KATL", "KLAX"].includes(
        flight.destination.toUpperCase()
      )
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
    wx: "Route avoids the convective corridor while preserving arrival slots.",
    runway:
      "Route steers arrivals to secondary runway and reduces vectoring time.",
    staffing:
      "Route offloads traffic toward adjacent sector to reduce controller load."
  };

  const reason = reasonsByScenario[scenarioId];

  return flights
    .filter((f) => f.riskScore >= 0.6)
    .map((flight, idx) => {
      const riskAfter = Number((flight.riskScore * 0.4).toFixed(2));
      const currentRoute =
        flight.route ||
        `${flight.origin} DCT DIRECT${idx + 1} ${flight.destination}`;
      const proposedRoute = `${flight.origin} DCT REROUTE${idx + 1} ${flight.destination}`;

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
  const [simulatedFlights, setSimulatedFlights] = useState<Flight[] | null>(
    null
  );
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
  const [mode, setMode] = useState<"live" | "simulated">("live");

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const load = async () => {
      setIsLoading(true);
      try {
        const liveFlights = await fetchLiveFlights();
        if (!isMounted) return;

        setFlights((prev) => {
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
    intervalId = setInterval(load, 15_000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

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
    setMode("live");
    setSimulatedFlights(null);
  };

  const handleApproveAll = () => {
    if (proposals.length === 0) return;

    setIsApplying(true);

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

    // Generate simulated flight positions to visualize rerouted paths
    setSimulatedFlights((prev) => {
      return flights.map((f, idx) => {
        const proposal = proposals.find((p) => p.flightId === f.id);
        if (!proposal) return f;
        const offset = (idx % 3) - 1; // -1, 0, 1
        return {
          ...f,
          latitude: f.latitude + offset * 1.2,
          longitude: f.longitude + offset * 1.8
        };
      });
    });

    setMode("simulated");

    setTimeout(() => {
      setIsApplying(false);
    }, 400);
  };

  const airportsSummary = useMemo(() => {
    const pairs = new Set<string>();
    flights.forEach((f) => {
      pairs.add(`${f.origin} → ${f.destination}`);
    });
    return Array.from(pairs).slice(0, 6);
  }, [flights]);

  return (
    <div className="space-y-4">
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
            <span>{isLoading ? "Updating feed" : "Feed connected"}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          {lastUpdated && (
            <span>
              Last update <span className="text-slate-200">{lastUpdated}</span>
            </span>
          )}
          <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-1 py-0.5">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                mode === "live"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300"
              }`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => simulatedFlights && setMode("simulated")}
              disabled={!simulatedFlights}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                mode === "simulated"
                  ? "bg-slate-100 text-slate-900"
                  : !simulatedFlights
                  ? "text-slate-500"
                  : "text-slate-300"
              }`}
            >
              Simulated
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="card h-[360px] md:h-[420px]">
            <div className="mb-3 flex items-center justify-between text-sm">
              <h2 className="font-medium">Sector Map</h2>
              <span className="text-xs text-slate-500">
                {flights.length.toString().padStart(2, "0")} tracked flights
              </span>
            </div>
            <FlightMap
              flights={flights}
              simulatedFlights={simulatedFlights || undefined}
              mode={mode}
            />
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
