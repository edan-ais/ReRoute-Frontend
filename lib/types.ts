export interface Airport {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Flight {
  id: string;
  callsign: string;

  // ICAO identifiers
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

export interface Condition {
  id: string;
  type: "weather" | "staffing" | "runway";
  label: string;
  severity: "low" | "medium" | "high";
  description: string;
  active: boolean;
}

export type EmergencyScenarioId = "wx" | "runway" | "staffing";

export interface EmergencyScenario {
  id: EmergencyScenarioId;
  name: string;
  description: string;
  type: "weather" | "runway" | "staffing";
}

export interface RerouteProposal {
  id: string;
  flightId: string;
  callsign: string;

  currentRoute: string;
  proposedRoute: string;

  icaoBefore: string;
  icaoAfter: string;

  riskBefore: number;
  riskAfter: number;

  reason: string;
  createdAt: string;

  applied: boolean;
}

