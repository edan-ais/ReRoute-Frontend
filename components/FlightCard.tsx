// components/FlightCard.tsx
"use client";

import type { Flight } from "../lib/types";
import RiskBadge from "./RiskBadge";

interface FlightCardProps {
  flight: Flight;
  selected?: boolean;
  onSelect?: () => void;
}

export default function FlightCard({
  flight,
  selected,
  onSelect
}: FlightCardProps) {
  const originLabel = flight.originName
    ? `${flight.origin} · ${flight.originName}`
    : flight.origin;
  const destinationLabel = flight.destinationName
    ? `${flight.destination} · ${flight.destinationName}`
    : flight.destination;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border px-3 py-3 text-sm transition hover:border-sky-500/70 hover:bg-sky-500/5 ${
        selected
          ? "border-sky-500/80 bg-sky-500/10"
          : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium">
            {flight.callsign}{" "}
            <span className="text-xs text-slate-400">({flight.id})</span>
          </span>
          <span className="text-xs text-slate-400">
            {originLabel} → {destinationLabel}
          </span>
        </div>
        <RiskBadge value={flight.riskScore} />
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span>
          {Math.round(flight.altitude).toLocaleString()} ft ·{" "}
          {Math.round(flight.speedKts)} kts
        </span>
        <span className="hidden md:inline">
          {flight.latitude.toFixed(2)}°
          {flight.latitude >= 0 ? "N" : "S"},{" "}
          {Math.abs(flight.longitude).toFixed(2)}°
          {flight.longitude <= 0 ? "W" : "E"}
        </span>
        <span className="capitalize text-slate-300">{flight.phase}</span>
      </div>
    </button>
  );
}
