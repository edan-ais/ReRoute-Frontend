import type { Condition } from "../lib/types";

interface Props {
  conditions: Condition[];
}

export default function ConditionsPanel({ conditions }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">Active Conditions</h2>
      <div className="space-y-2">
        {conditions.map((c) => (
          <div
            key={c.id}
            className="card flex flex-col gap-1 bg-slate-900/80"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-200">
                {c.label}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                {c.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
