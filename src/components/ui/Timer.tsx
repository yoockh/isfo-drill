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

  let colorClass = "text-green-600 dark:text-green-400";
  let barColor = "bg-green-500";

  if (isCritical) {
    colorClass = "text-red-600 dark:text-red-400 animate-pulse";
    barColor = "bg-red-500";
  } else if (isLow) {
    colorClass = "text-yellow-600 dark:text-yellow-400";
    barColor = "bg-yellow-500";
  }

  return (
    <div className="w-full">
      <div className={`text-center text-4xl font-bold tabular-nums ${colorClass}`}>
        {displaySeconds}
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ease-linear ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
