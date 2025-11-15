"use client";

import type { Flight } from "../lib/types";

interface Props {
  flights: Flight[];
}

/**
 * Minimal placeholder map so the build succeeds.
 * You can later replace this with a real Leaflet map.
 */
export default function FlightMap({ flights }: Props) {
  return (
    <div className="h-full w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-400">
      <div className="space-y-2 text-center">
        <p className="font-medium text-slate-200">Map Placeholder</p>
        <p>Render a Leaflet map here with all active flights.</p>
        <p className="text-[10px] text-slate-500">
          Flights currently in state: {flights.length}
        </p>
      </div>
    </div>
  );
}
