"use client";

interface TimerProps {
  remaining: number;
  total: number;
  isLow: boolean;
  isCritical: boolean;
}

export function Timer({ remaining, total, isLow, isCritical }: TimerProps) {
  const progress = Math.max(0, remaining / total);
  const displaySeconds = Math.ceil(remaining);

  // Hijau/teal → kuning → merah (3 detik terakhir)
  let numberColor = "text-primary-700";
  let barColor = "bg-primary-600";

  if (isCritical) {
    numberColor = "text-red-600 animate-pulse";
    barColor = "bg-red-500";
  } else if (isLow) {
    numberColor = "text-amber-500";
    barColor = "bg-amber-400";
  }

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-center gap-1.5">
        <span
          className={`text-6xl font-bold tabular-nums leading-none ${numberColor}`}
        >
          {displaySeconds}
        </span>
        <span className="text-lg font-medium text-slate-400">dtk</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ease-linear ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
