// components/ConditionsPanel.tsx
"use client";

import type {
  Condition,
  EmergencyScenario,
  EmergencyScenarioId
} from "../lib/types";

interface ConditionsPanelProps {
  scenarios: EmergencyScenario[];
  activeScenarioId: EmergencyScenarioId;
  onScenarioChange: (id: EmergencyScenarioId) => void;
  conditions: Condition[];
  averageRisk: number;
  maxRisk: number;
  totalFlights: number;
}

export default function ConditionsPanel({
  scenarios,
  activeScenarioId,
  onScenarioChange,
  conditions,
  averageRisk,
  maxRisk,
  totalFlights
}: ConditionsPanelProps) {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Emergencies & Conditions</h2>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => {
          const active = scenario.id === activeScenarioId;
          const base =
            scenario.id === "wx"
              ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
              : scenario.id === "runway"
              ? "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-200"
              : "bg-sky-500/10 border-sky-500/40 text-sky-200";

          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onScenarioChange(scenario.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? base + " shadow-[0_0_0_1px_rgba(148,163,184,0.25)]"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {scenario.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
          <div className="text-slate-400">Flights tracked</div>
          <div className="mt-1 text-lg font-semibold">
            {totalFlights.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
          <div className="text-slate-400">Avg risk</div>
          <div className="mt-1 text-lg font-semibold">
            {Math.round(averageRisk * 100)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
          <div className="text-slate-400">Peak risk</div>
          <div className="mt-1 text-lg font-semibold">
            {Math.round(maxRisk * 100)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {conditions.map((cond) => (
          <div
            key={cond.id}
            className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="font-medium text-slate-200">{cond.label}</div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  cond.severity === "high"
                    ? "bg-red-500/15 text-red-300 border border-red-500/40"
                    : cond.severity === "medium"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {cond.severity.toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {cond.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

