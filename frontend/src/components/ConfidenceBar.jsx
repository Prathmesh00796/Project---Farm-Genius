export function ConfidenceBar({ value, label }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold text-slate-600">
        <span>{label || "Confidence"}</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
