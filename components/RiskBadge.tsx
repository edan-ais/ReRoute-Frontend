// components/RiskBadge.tsx
"use client";

interface RiskBadgeProps {
  value: number;
}

export default function RiskBadge({ value }: RiskBadgeProps) {
  const risk = Math.round(value * 100);

  let color = "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  if (risk >= 70) {
    color = "bg-red-500/15 text-red-300 border-red-500/40";
  } else if (risk >= 40) {
    color = "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Risk {risk}
    </span>
  );
}
