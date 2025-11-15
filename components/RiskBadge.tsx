interface Props {
  score: number; // 0–1
}

export default function RiskBadge({ score }: Props) {
  let label = "Low";
  let color = "bg-emerald-500/20 text-emerald-300";
  if (score >= 0.7) {
    label = "High";
    color = "bg-rose-500/20 text-rose-300";
  } else if (score >= 0.4) {
    label = "Medium";
    color = "bg-amber-500/20 text-amber-300";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} · {(score * 100).toFixed(0)}%
    </span>
  );
}
