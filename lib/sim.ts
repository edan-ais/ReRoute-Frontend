// lib/sim.ts
import type { Flight } from "./types";

interface Airport {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

const AIRPORTS: Airport[] = [
  { code: "KLAX", name: "Los Angeles Intl", lat: 33.9425, lon: -118.4081 },
  { code: "KSAN", name: "San Diego Intl", lat: 32.7338, lon: -117.1933 },
  { code: "KSFO", name: "San Francisco Intl", lat: 37.6213, lon: -122.3790 },
  { code: "KSMF", name: "Sacramento Intl", lat: 38.6954, lon: -121.5908 },
  { code: "KLAS", name: "Harry Reid Intl (Las Vegas)", lat: 36.0840, lon: -115.1537 },
  { code: "KPHX", name: "Phoenix Sky Harbor", lat: 33.4342, lon: -112.0116 }
];

// Predefined flows to keep everything in one visible territory
const ROUTES: [string, string][] = [
  ["KLAX", "KSFO"],
  ["KSAN", "KLAX"],
  ["KSFO", "KSMF"],
  ["KLAX", "KLAS"],
  ["KLAS", "KPHX"],
  ["KSAN", "KPHX"],
  ["KSFO", "KLAX"],
  ["KPHX", "KLAX"],
  ["KSMF", "KSAN"],
  ["KLAS", "KSAN"]
];

function findAirport(code: string): Airport {
  const found = AIRPORTS.find((a) => a.code === code);
  if (!found) {
    return AIRPORTS[0];
  }
  return found;
}

// Simple distance in "lat/lon space" (good enough for animation)
function segmentLength(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// Given a polyline [ [lat,lon], ... ] and t in [0,1], interpolate along entire path
function interpolatePath(path: [number, number][], t: number): { lat: number; lon: number } {
  if (path.length === 0) {
    return { lat: 0, lon: 0 };
  }
  if (path.length === 1) {
    return { lat: path[0][0], lon: path[0][1] };
  }

  const total = path
    .slice(0, -1)
    .reduce((sum, pt, idx) => sum + segmentLength(pt, path[idx + 1]), 0);

  if (total === 0) {
    return { lat: path[0][0], lon: path[0][1] };
  }

  const target = t * total;
  let acc = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const segLen = segmentLength(a, b);
    if (acc + segLen >= target) {
      const localT = (target - acc) / segLen;
      return {
        lat: a[0] + localT * (b[0] - a[0]),
        lon: a[1] + localT * (b[1] - a[1])
      };
    }
    acc += segLen;
  }

  const last = path[path.length - 1];
  return { lat: last[0], lon: last[1] };
}

// Create a curved path between origin and destination
function buildCurvedPath(
  origin: Airport,
  dest: Airport,
  curveFactor: number
): [number, number][] {
  const start: [number, number] = [origin.lat, origin.lon];
  const end: [number, number] = [dest.lat, dest.lon];

  const midLat = (origin.lat + dest.lat) / 2 + curveFactor * 1.2;
  const midLon = (origin.lon + dest.lon) / 2 + curveFactor * 0.6;

  const mid: [number, number] = [midLat, midLon];

  // 3-point path = a line with a visible "turn"
  return [start, mid, end];
}

export function createSyntheticFlights(): Flight[] {
  const flights: Flight[] = [];

  for (let i = 0; i < ROUTES.length; i++) {
    const [origCode, destCode] = ROUTES[i];
    const origin = findAirport(origCode);
    const dest = findAirport(destCode);

    const curveDir = i % 2 === 0 ? 1 : -1;
    const path = buildCurvedPath(origin, dest, curveDir);

    const initialProgress = 0.2 + 0.06 * i; // spread along path
    const pos = interpolatePath(path, initialProgress);

    const callsign = `FL${i + 1}`;

    flights.push({
      id: callsign,
      callsign,
      origin: origin.code,
      destination: dest.code,
      originName: origin.name,
      destinationName: dest.name,
      status: "enroute",
      phase: "cruise",
      latitude: pos.lat,
      longitude: pos.lon,
      altitude: 30000 + i * 500,
      speedKts: 430 + (i % 3) * 15,
      riskScore: 0.3,
      route: `${origin.code} DCT FIX${i + 1} ${dest.code}`,
      path,
      progress: initialProgress
    });
  }

  return flights;
}

// Move each flight a small step forward along its path
export function stepFlights(prevFlights: Flight[]): Flight[] {
  const delta = 0.01; // how far to move each tick

  return prevFlights.map((flight) => {
    if (!flight.path || flight.path.length < 2) {
      return flight;
    }

    const prevProgress = flight.progress ?? Math.random();
    const nextProgress = (prevProgress + delta) % 1;

    const pos = interpolatePath(flight.path, nextProgress);

    const altJitter =
      flight.altitude + Math.sin(nextProgress * Math.PI * 2) * 300;

    return {
      ...flight,
      progress: nextProgress,
      latitude: pos.lat,
      longitude: pos.lon,
      altitude: altJitter
    };
  });
}
