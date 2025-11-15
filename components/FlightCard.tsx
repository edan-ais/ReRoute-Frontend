import type { Flight } from "../lib/types";
import RiskBadge from "./RiskBadge";

export default function FlightCard({ flight }: { flight: Flight }) {
  return (
    <div className="card flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{flight.callsign}</span>
          <RiskBadge score={flight.riskScore} />
        </div>
        <p className="text-xs text-slate-400">
          {flight.origin} → {flight.destination} · {flight.phase} ·{" "}
          {flight.status}
        </p>
        <p className="text-[11px] text-slate-500">
          {flight.altitude.toLocaleString()} ft · {flight.speedKts} kts
        </p>
      </div>
    </div>
  );
}
