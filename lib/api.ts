// lib/api.ts
"use client";

import type { Flight } from "./types";

interface AviationStackFlight {
  flight_date?: string;
  flight_status?: string;
  departure?: {
    airport?: string;
    timezone?: string;
    iata?: string;
    icao?: string;
    terminal?: string;
    gate?: string;
    delay?: number;
    scheduled?: string;
    estimated?: string;
    actual?: string;
    estimated_runway?: string;
    actual_runway?: string;
  };
  arrival?: {
    airport?: string;
    timezone?: string;
    iata?: string;
    icao?: string;
    terminal?: string;
    gate?: string;
    baggage?: string;
    delay?: number;
    scheduled?: string;
    estimated?: string;
    actual?: string;
    estimated_runway?: string;
    actual_runway?: string;
  };
  airline?: {
    name?: string;
    iata?: string;
    icao?: string;
  };
  flight?: {
    number?: string;
    iata?: string;
    icao?: string;
    codeshared?: any;
  };
  aircraft?: {
    registration?: string;
    iata?: string;
    icao?: string;
    icao24?: string;
  };
  live?: {
    updated?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    direction?: number;
    speed_horizontal?: number;
    speed_vertical?: number;
    is_ground?: boolean;
  };
  [key: string]: any;
}

function mapStatus(status?: string): "scheduled" | "enroute" | "landed" | "delayed" | "cancelled" {
  const s = (status || "").toLowerCase();
  if (s === "active") return "enroute";
  if (s === "landed") return "landed";
  if (s === "scheduled") return "scheduled";
  if (s === "cancelled") return "cancelled";
  if (s === "incident" || s === "diverted") return "delayed";
  return "enroute";
}

function normalizeAviationStackFlight(item: AviationStackFlight, index: number): Flight {
  const dep = item.departure || {};
  const arr = item.arrival || {};
  const live = item.live || {};
  const flt = item.flight || {};

  const callsign =
    flt.iata ||
    flt.icao ||
    flt.number ||
    `FL${index + 1}`;

  const origin =
    dep.icao ||
    dep.iata ||
    "UNKNOWN";

  const destination =
    arr.icao ||
    arr.iata ||
    "UNKNOWN";

  const latitude =
    live.latitude ??
    37 + Math.random() * 4; // fallback
  const longitude =
    live.longitude ??
    -122 + Math.random() * 6; // fallback

  const altitude =
    (live.altitude ?? 0) * 3.28084 || // meters → feet, if provided
    30000 + Math.random() * 8000;

  const speedKts =
    (live.speed_horizontal ?? 0) * 0.539957 || // km/h → knots, if provided
    420 + Math.random() * 80;

  return {
    id: `${item.flight_date || "LIVE"}-${callsign}-${index}`,
    callsign,
    origin,
    destination,
    originName: dep.airport,
    destinationName: arr.airport,
    status: mapStatus(item.flight_status),
    phase: "cruise",
    latitude,
    longitude,
    altitude,
    speedKts,
    riskScore: 0.3
  };
}

function ensureTenFlights(flights: Flight[]): Flight[] {
  if (flights.length >= 10) return flights.slice(0, 10);

  if (flights.length === 0) {
    const template: Flight = {
      id: "SIM-1",
      callsign: "SIM1",
      origin: "KLAX",
      destination: "KJFK",
      originName: "Los Angeles Intl",
      destinationName: "John F. Kennedy Intl",
      status: "enroute",
      phase: "cruise",
      latitude: 36,
      longitude: -115,
      altitude: 32000,
      speedKts: 430,
      riskScore: 0.3
    };
    const arr: Flight[] = [];
    for (let i = 0; i < 10; i++) {
      arr.push({
        ...template,
        id: `SIM-${i + 1}`,
        callsign: `SIM${i + 1}`,
        latitude: template.latitude + (i - 5) * 0.4,
        longitude: template.longitude + (i - 5) * 1.3
      });
    }
    return arr;
  }

  const template = flights[0];
  const result = [...flights];
  for (let i = flights.length; i < 10; i++) {
    result.push({
      ...template,
      id: `SIM-${i + 1}`,
      callsign: `SIM${i + 1}`,
      latitude: template.latitude + (i - 5) * 0.4,
      longitude: template.longitude + (i - 5) * 1.3
    });
  }
  return result;
}

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

  const items: AviationStackFlight[] =
    data?.data && Array.isArray(data.data)
      ? data.data
      : Array.isArray(data)
      ? data
      : [];

  const normalized = items
    .filter((item) => item.live || item.departure || item.arrival)
    .map((item, idx) => normalizeAviationStackFlight(item, idx));

  return ensureTenFlights(normalized);
}
