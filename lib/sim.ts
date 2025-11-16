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

// parallel to flight list
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
  ["KLAS", "KSAN"],
];

function findAirport(code: string): Airport {
  return AIRPORTS.find(a => a.code === code) ?? AIRPORTS[0];
}

function length(a: [number, number], b: [number, number]): number {
  return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
}

// Polyline interpolation
function interpolate(path: [number, number][], t: number) {
  if (path.length < 2) return { lat: path[0][0], lon: path[0][1] };

  const segs = path.length - 1;
  const total = path
    .slice(0, segs)
    .reduce((s, p, i) => s + length(p, path[i + 1]), 0);

  let dist = t * total;
  let acc = 0;

  for (let i = 0; i < segs; i++) {
    const a = path[i];
    const b = path[i + 1];
    const segLen = length(a, b);

    if (acc + segLen >= dist) {
      const p = (dist - acc) / segLen;
      return {
        lat: a[0] + p * (b[0] - a[0]),
        lon: a[1] + p * (b[1] - a[1]),
      };
    }
    acc += segLen;
  }

  const last = path[path.length - 1];
  return { lat: last[0], lon: last[1] };
}

// Build a simple curved 3-point path
export function buildCurvedPath(
  origin: Airport,
  dest: Airport,
  curve: number
): [number, number][] {
  const mid: [number, number] = [
    (origin.lat + dest.lat) / 2 + curve,
    (origin.lon + dest.lon) / 2 + curve * 0.6,
  ];

  return [
    [origin.lat, origin.lon],
    mid,
    [dest.lat, dest.lon],
  ];
}

// INITIAL synthetic flights
export function createSyntheticFlights(): Flight[] {
  return ROUTES.map(([o, d], i) => {
    const orig = findAirport(o);
    const dest = findAirport(d);

    const initialPath = buildCurvedPath(orig, dest, i % 2 === 0 ? 1.2 : -1.2);
    const prog = 0.15 + i * 0.07;
    const pos = interpolate(initialPath, prog);

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
      altitude: 30000 + i * 400,
      speedKts: 430 + (i % 3) * 15,

      riskScore: 0.3,
      route: `${o} DCT FIX${i + 1} ${d}`,

      path: initialPath,
      progress: prog,
      frozen: false
    };
  });
}

// AFTER APPROVAL → flights can still move but not change path/risk
export function stepFlights(prev: Flight[]): Flight[] {
  return prev.map(f => {
    if (!f.path || f.path.length < 2) return f;

    const nextP = ((f.progress ?? 0) + 0.01) % 1;
    const pos = interpolate(f.path, nextP);

    return {
      ...f,
      progress: nextP,
      latitude: pos.lat,
      longitude: pos.lon,
      altitude: f.altitude + Math.sin(nextP * Math.PI * 2) * 150
    };
  });
}
