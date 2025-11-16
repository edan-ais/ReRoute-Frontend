// =====================================================
// Airport
// =====================================================
export interface Airport {
  code: string;       // ICAO code (KLAX)
  name: string;       // Human readable name (Los Angeles Intl)
  lat: number;
  lon: number;
}

// =====================================================
// Hazard Zones (always visible synthetic polygons)
// =====================================================
export interface HazardZone {
  id: string;
  type: "weather" | "terrain" | "traffic" | "restricted";
  label: string;
  severity: "low" | "medium" | "high";

  // Polygon vertices
  polygon: { lat: number; lon: number }[];
}

// =====================================================
// Flight — synthetic only, animated along a path
// =====================================================
export interface Flight {
  id: string;                    // FL1, FL2, etc.
  callsign: string;              // FL1, AA123, etc.

  origin: string;                // ICAO
  originName?: string;           // human readable
  destination: string;           // ICAO
  destinationName?: string;      // human readable

  status: string;                // enroute
  phase: string;                 // cruise

  altitude: number;              // feet
  speedKts: number;              // knots

  latitude: number;
  longitude: number;

  riskScore: number;             // 0–1
  isEmergency: boolean;          // not used heavily, but kept

  frozen: boolean;               // once rerouted, no more movement updates

  // Flight path polyline
  path: { lat: number; lon: number }[];

  // % progress along path (0–1)
  progress: number;

  // ICAO-style route string
  route?: string;
}

// =====================================================
// Reroute Proposal (ATC sees before/after ICAO format)
// =====================================================
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

