type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  color?: "green" | "cyan" | "rose" | "amber";
};

const colorMap = {
  green: "from-rival-green to-emerald-300",
  cyan: "from-rival-cyan to-sky-300",
  rose: "from-rival-rose to-pink-300",
  amber: "from-rival-amber to-yellow-200"
};

export function ProgressBar({ value, max = 100, label, color = "green" }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  return (
    <div className="w-full">
      {label ? (
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-ink-950">
        <div className={`h-full rounded-full bg-gradient-to-r ${colorMap[color]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
