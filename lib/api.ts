// lib/api.ts
"use client";

import type { Flight } from "./types";

interface RawFlightItem {
  [key: string]: any;
}

/**
 * Attempt to normalize a variety of common flight API shapes into our Flight model.
 */
function normalizeFlight(item: RawFlightItem, index: number): Flight {
  const live = item.live || item.tracking || item.position || {};
  const departure = item.departure || item.departure_airport || item.origin || {};
  const arrival = item.arrival || item.arrival_airport || item.destination || {};

  const callsign =
    item.callsign ||
    item.flight_iata ||
    item.flight_icao ||
    item.ident ||
    item.number ||
    `FL${index + 1}`;

  const origin =
    departure.icao ||
    departure.iata ||
    departure.code ||
    item.dep_iata ||
    item.dep_icao ||
    "KLAX";

  const destination =
    arrival.icao ||
    arrival.iata ||
    arrival.code ||
    item.arr_iata ||
    item.arr_icao ||
    "KJFK";

  const latitude =
    live.latitude ??
    live.lat ??
    item.latitude ??
    item.lat ??
    34 + Math.random() * 6; // fallback: random-ish west coast band

  const longitude =
    live.longitude ??
    live.lon ??
    item.longitude ??
    item.lon ??
    -125 + Math.random() * 40; // fallback random-ish US long band

  const altitude =
    live.altitude ??
    live.alt ??
    item.altitude ??
    item.alt ??
    30000 + Math.random() * 8000;

  const speedKts =
    live.speed ??
    live.ground_speed ??
    item.speed ??
    item.speed_kts ??
    420 + Math.random() * 80;

  return {
    id: item.id?.toString() || callsign,
    callsign,
    origin,
    destination,
    status: "enroute",
    phase: "cruise",
    latitude,
    longitude,
    altitude,
    speedKts,
    riskScore: 0.3 // will be overwritten by risk engine in the UI
  };
}

/**
 * Ensure we always have 10 flights to draw.
 * If the live API returns fewer, we synthesize the rest from the first item.
 */
function ensureTenFlights(flights: Flight[]): Flight[] {
  if (flights.length >= 10) {
    return flights.slice(0, 10);
  }

  const result = [...flights];
  const template = flights[0] ?? {
    id: "TEMPLATE",
    callsign: "RR000",
    origin: "KLAX",
    destination: "KJFK",
    status: "enroute" as const,
    phase: "cruise" as const,
    latitude: 36,
    longitude: -115,
    altitude: 32000,
    speedKts: 430,
    riskScore: 0.3
  };

  for (let i = flights.length; i < 10; i++) {
    result.push({
      ...template,
      id: `SIM-${i + 1}`,
      callsign: `SIM${i + 1}`,
      latitude: template.latitude + (i - 5) * 0.5,
      longitude: template.longitude + (i - 5) * 1.2,
      riskScore: 0.3
    });
  }

  return result;
}

/**
 * Fetch live flights from the internal Next.js API route.
 */
export async function fetchLiveFlights(params?: {
  flight_date?: string;
}): Promise<Flight[]> {
  const url = new URL("/api/flights", window.location.origin);

  if (params?.flight_date) {
    url.searchParams.set("flight_date", params.flight_date);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    console.warn("Failed to fetch live flights, falling back to empty list");
    return [];
  }

  const data = await res.json();

  const items: RawFlightItem[] =
    data?.data ||
    data?.flights ||
    data?.results ||
    (Array.isArray(data) ? data : []);

  const normalized = items.map((item, idx) => normalizeFlight(item, idx));

  return ensureTenFlights(normalized);
}
