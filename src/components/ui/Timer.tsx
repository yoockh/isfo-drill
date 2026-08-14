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

  // Satu aksen (mustard). Merah HANYA sebagai sinyal urgensi 3 detik terakhir.
  const critical = isCritical;
  const boxColor = critical ? "var(--color-nb-red)" : "var(--color-mustard)";

  return (
    <div className="w-full">
      <div
        className={`border-[2.5px] sm:border-[3px] border-[#1a1a1a] rounded-[8px] shadow-[4px_4px_0_0_#1a1a1a] px-4 py-2 flex items-baseline justify-center gap-2 ${
          critical ? "animate-pulse" : ""
        }`}
        style={{ backgroundColor: boxColor }}
      >
        <span className="text-6xl font-extrabold tabular-nums leading-none">
          {displaySeconds}
        </span>
        <span className="text-lg font-extrabold">DTK</span>
      </div>
      <div className="mt-2 h-3 w-full border-[2.5px] border-[#1a1a1a] rounded-[6px] overflow-hidden bg-white">
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: isLow ? "var(--color-nb-red)" : "var(--color-teal)",
          }}
        />
      </div>
    </div>
  );
}
