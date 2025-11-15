export interface Flight {
  id: string;
  callsign: string;
  origin: string;
  destination: string;
  status: "enroute" | "departed" | "arrived" | "holding";
  phase: "climb" | "cruise" | "descent" | "approach";
  riskScore: number; // 0–1
  latitude: number;
  longitude: number;
  altitude: number;
  speedKts: number;
}

export interface Condition {
  id: string;
  type: "weather" | "staffing" | "traffic" | "restriction";
  label: string;
  severity: "low" | "medium" | "high";
  description: string;
  active: boolean;
}

export interface RerouteProposal {
  id: string;
  flightId: string;
  callsign: string;
  currentRoute: string;
  proposedRoute: string;
  riskBefore: number;
  riskAfter: number;
  reason?: string;
  createdAt: string;
}
