// lib/types.ts

export type FlightPhase =
  | "climb"
  | "cruise"
  | "descent"
  | "approach"
  | "taxi"
  | "parked";

export type FlightStatus =
  | "scheduled"
  | "enroute"
  | "landed"
  | "delayed"
  | "cancelled";

export interface Flight {
  id: string;
  callsign: string;
  origin: string;
  destination: string;
  originName?: string;
  destinationName?: string;

  status: FlightStatus;
  phase: FlightPhase;

  latitude: number;
  longitude: number;
  altitude: number;
  speedKts: number;

  riskScore: number;
  route?: string;

  // Synthetic animation
  path?: [number, number][];
  progress?: number;

  isEmergency?: boolean;

  frozen?: boolean; // ⛔ after approval, route/risk never changes
}

export type ConditionType = "weather" | "traffic" | "staffing" | "runway";
export type ConditionSeverity = "low" | "medium" | "high";

export interface Condition {
  id: string;
  type: ConditionType;
  label: string;
  severity: ConditionSeverity;
  description: string;
  active: boolean;
}

export type EmergencyScenarioId = "wx" | "runway" | "staffing";

export interface EmergencyScenario {
  id: EmergencyScenarioId;
  name: string;
  description: string;
  type: ConditionType;
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
  applied?: boolean;
}

