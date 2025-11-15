"use client";

import FlightMap from "../../components/FlightMap";
import FlightCard from "../../components/FlightCard";
import ConditionsPanel from "../../components/ConditionsPanel";
import type { Flight, Condition } from "../../lib/types";

const mockFlights: Flight[] = [
  {
    id: "AA123",
    callsign: "AA123",
    origin: "KLAX",
    destination: "KJFK",
    status: "enroute",
    riskScore: 0.72,
    phase: "cruise",
    latitude: 35.2,
    longitude: -110.4,
    altitude: 33000,
    speedKts: 450
  },
  {
    id: "DL456",
    callsign: "DL456",
    origin: "KSFO",
    destination: "KORD",
    status: "enroute",
    riskScore: 0.31,
    phase: "climb",
    latitude: 37.8,
    longitude: -118.1,
    altitude: 22000,
    speedKts: 410
  }
];

const mockConditions: Condition[] = [
  {
    id: "wx-1",
    type: "weather",
    label: "Convective SIGMET",
    severity: "high",
    description: "Thunderstorm line across central sector corridor.",
    active: true
  },
  {
    id: "staff-1",
    type: "staffing",
    label: "Reduced staffing",
    severity: "medium",
    description: "Sector staffed with 2 of 3 controllers.",
    active: true
  }
];

export default function FlightsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <div className="card h-80">
          <h2 className="text-sm font-medium mb-3">Sector Map</h2>
          <FlightMap flights={mockFlights} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">Active Flights</h2>
          <div className="space-y-3">
            {mockFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <ConditionsPanel conditions={mockConditions} />
        </div>
      </div>
    </div>
  );
}
