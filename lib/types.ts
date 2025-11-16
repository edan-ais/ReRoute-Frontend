// =====================================================
// Airport
// =====================================================
export interface Airport {
  code: string;       // ICAO code
  name: string;       // Human readable label
  lat: number;
  lon: number;
}

// =====================================================
// Hazard Zones (visual overlays on the map)
// =====================================================
export interface HazardZone {
  id: string;
  type: "weather" | "terrain" | "traffic" | "restricted";
  label: string;
  severity: "low" | "medium" | "high";

  // Polygon describing the hazard region
  polygon: { lat: number; lon: number }[];
}

// =====================================================
// Flight
// =====================================================
export interface Flight {
  id: string;
  callsign: string;

  origin: string;
  originName?: string;

  destination: string;
  destinationName?: string;

  status: string;
  phase: string;

  altitude: number;
  speedKts: number;

  latitude: number;
  longitude: number;

  riskScore: number;
  isEmergency: boolean;

  frozen: boolean;

  path: { lat: number; lon: number }[];
  progress: number;

  route?: string;
}

// =====================================================
// Condition
// =====================================================
export interface Condition {
  id: string;
  type: "weather" | "staffing" | "runway";
  label: string;
  severity: "low" | "medium" | "high";
  description: string;
  active: boolean;
}

// =====================================================
// Scenario
// =====================================================
export type EmergencyScenarioId = "wx" | "runway" | "staffing";

export interface EmergencyScenario {
  id: EmergencyScenarioId;
  name: string;
  description: string;
  type: "weather" | "runway" | "staffing";
}

// =====================================================
// Reroute Proposal
// =====================================================
export interface RerouteProposal {
  id: string;
  flightId: string;
  callsign: string;

  currentRoute: string;
  proposedRoute: string;

  // ATC-style ICAO-formatted plans
  icaoBefore: string;
  icaoAfter: string;

  riskBefore: number;
  riskAfter: number;

  reason: string;
  createdAt: string;

  applied: boolean;
}

