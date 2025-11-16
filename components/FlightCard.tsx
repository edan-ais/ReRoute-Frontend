import type { Flight } from "../lib/types";

interface FlightCardProps {
  flight: Flight;
  selected: boolean;
  onSelect: () => void;
}

export default function FlightCard({
  flight,
  selected,
  onSelect,
}: FlightCardProps) {
  const originLabel = flight.originName
    ? `${flight.origin} · ${flight.originName}`
    : flight.origin;

  const destinationLabel = flight.destinationName
    ? `${flight.destination} · ${flight.destinationName}`
    : flight.destination;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition ${
        selected
          ? "border-sky-400 bg-sky-950/40"
          : "border-slate-700 bg-slate-900/40 hover:bg-slate-800/40"
      }`}
    >
      <div className="flex justify-between">
        <div className="font-semibold">{flight.callsign}</div>
        <div className="text-xs text-slate-400">
          Risk {Math.round(flight.riskScore * 100)}
        </div>
      </div>

      <div className="mt-1 text-sm text-slate-300">
        {originLabel} → {destinationLabel}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {Math.round(flight.altitude).toLocaleString()} ft ·{" "}
        {Math.round(flight.speedKts)} kts
      </div>

      <div className="text-xs text-slate-500">
        {flight.latitude.toFixed(2)}°N, {flight.longitude.toFixed(2)}°W
      </div>

      {flight.route && (
        <div className="mt-2 text-xs text-sky-300">
          Route: {flight.route}
        </div>
      )}
    </button>
  );
}
