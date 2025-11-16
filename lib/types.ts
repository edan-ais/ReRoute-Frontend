// ================================================
// Airport
// ================================================
export interface Airport {
  code: string;      // ICAO (KLAX)
  name: string;      // Los Angeles Intl
  lat: number;
  lon: number;
}

// ================================================
// Flight
// ================================================
export interface Flight {
  id: string;                     // FL1, FL2, etc.
  callsign: string;               // FL1, AA123, etc.

  origin: string;                 // ICAO
  originName?: string;            // nice readable airport name

  destination: string;            // ICAO
  destinationName?: string;       // nice readable airport name

  status: string;                 // enroute, climbing, etc.
  phase: string;                  // cruise, climb, descent

  altitude: number;               // feet
  speedKts: number;               // knots

  latitude: number;
  longitude: number;

  riskScore: number;              // 0–1
  isEmergency: boolean;           // triggered by scenario
  frozen: boolean;                // after approval, flight no longer updates

  // Primary flight path (visual line on map)
  path: { lat: number; lon: number }[];

  // 0–1 progress along path (animated movement)
  progress: number;

  // Optional raw ATC route string
  route?: string;
}

// ================================================
// Condition (weather, runway, staffing, etc.)
// ================================================
export interface Condition {
  id: string;
  type: "weather" | "staffing" | "runway";
  label: string;
  severity: "low" | "medium" | "high";
  description: string;
  active: boolean;
}

// ================================================
// Scenarios
// ================================================
export type EmergencyScenarioId = "wx" | "runway" | "staffing";

export interface EmergencyScenario {
  id: EmergencyScenarioId;
  name: string;
  description: string;
  type: "weather" | "runway" | "staffing";
}

// ================================================
// Reroute Proposal
// ================================================
// MUST match everything used in:
// • ApprovalPanel
// • FlightCard
// • FlightsPage
// • The ATC view showing ICAO plans before/after
// ================================================
export interface RerouteProposal {
  id: string;
  flightId: string;
  callsign: string;

  currentRoute: string;       // ICAO text shown before reroute
  proposedRoute: string;      // ICAO text shown after reroute

  icaoBefore: string;         // explicit ICAO flight-plan block
  icaoAfter: string;          // explicit ICAO flight-plan block

  riskBefore: number;
  riskAfter: number;

  reason: string;
  createdAt: string;          // ISO timestamp

  applied: boolean;           // becomes true after approval
}

