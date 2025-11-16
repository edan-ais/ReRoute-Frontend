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
  { code: "KLAS", name: "Harry Reid Intl", lat: 36.0840, lon: -115.1537 },
  { code: "KPHX", name: "Phoenix Sky Harbor", lat: 33.4342, lon: -112.0116 }
];

// Predefined flows
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
  return AIRPORTS.find(a => a.code === code) ?? AIRPORTS[0];
}

function segLen(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// Path interpolation
function interpolate(path: [number, number][], t: number) {
  if (path.length < 2) return { lat: path[0][0], lon: path[0][1] };

  const total = path
    .slice(0, -1)
    .reduce((sum, p, idx) => sum + segLen(p, path[idx + 1]), 0);

  let dist = t * total;
  let acc = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const len = segLen(a, b);

    if (acc + len >= dist) {
      const tt = (dist - acc) / len;
      return {
        lat: a[0] + tt * (b[0] - a[0]),
        lon: a[1] + tt * (b[1] - a[1])
      };
    }
    acc += len;
  }

  const last = path[path.length - 1];
  return { lat: last[0], lon: last[1] };
}

// Curved 3-point path
function curved(origin: Airport, dest: Airport, curveDir: number) {
  const midLat = (origin.lat + dest.lat) / 2 + curveDir * 1.2;
  const midLon = (origin.lon + dest.lon) / 2 + curveDir * 0.6;

  return [
    [origin.lat, origin.lon],
    [midLat, midLon],
    [dest.lat, dest.lon]
  ] as [number, number][];
}

export function createSyntheticFlights(): Flight[] {
  return ROUTES.map(([o, d], i) => {
    const orig = findAirport(o);
    const dest = findAirport(d);

    const path = curved(orig, dest, i % 2 === 0 ? 1 : -1);
    const progress = 0.1 + i * 0.08;
    const pos = interpolate(path, progress);

    return {
      id: `FL${i + 1}`,
      callsign: `FL${i + 1}`,
      origin: o,
      destination: d,
      originName: orig.name,
      destinationName: dest.name,
      status: "enroute",
      phase: "cruise",
      latitude: pos.lat,
      longitude: pos.lon,
      altitude: 30000 + i * 500,
      speedKts: 440 + (i % 3) * 12,
      riskScore: 0.3,
      route: `${o} DCT FIX${i + 1} ${d}`,
      path,
      progress,
      isEmergency: false,
      frozen: false
    };
  });
}

// After approval: frozen = true means NEVER change route/risk again
export function stepFlights(prev: Flight[]) {
  return prev.map(f => {
    if (!f.path || f.path.length < 2) return f;

    // Frozen flights still move, but do NOT change route/risk
    const prog = (f.progress ?? 0) + 0.01;
    const next = prog % 1;
    const pos = interpolate(f.path, next);

    return {
      ...f,
      progress: next,
      latitude: pos.lat,
      longitude: pos.lon,
      altitude: f.altitude + Math.sin(next * Math.PI * 2) * 200
    };
  });
}
