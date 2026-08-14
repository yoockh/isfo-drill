"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CountdownState {
  remaining: number;
  isLow: boolean;
  isCritical: boolean;
  isDone: boolean;
  elapsed: number;
}

export function useCountdown(totalSeconds: number, active: boolean) {
  const [state, setState] = useState<CountdownState>({
    remaining: totalSeconds,
    isLow: false,
    isCritical: false,
    isDone: false,
    elapsed: 0,
  });

  const startTimeRef = useRef<number>(0);

  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    setState({
      remaining: totalSeconds,
      isLow: false,
      isCritical: false,
      isDone: false,
      elapsed: 0,
    });
  }, [totalSeconds]);

  useEffect(() => {
    if (!active) return;

    startTimeRef.current = Date.now();
    setState({
      remaining: totalSeconds,
      isLow: false,
      isCritical: false,
      isDone: false,
      elapsed: 0,
    });

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remainingMs = Math.max(0, totalSeconds * 1000 - elapsed);
      const remaining = remainingMs / 1000;

      if (remaining <= 0) {
        setState({
          remaining: 0,
          isLow: true,
          isCritical: true,
          isDone: true,
          elapsed,
        });
        clearInterval(interval);
        return;
      }

      setState({
        remaining,
        isLow: remaining <= 5,
        isCritical: remaining <= 3,
        isDone: false,
        elapsed,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [active, totalSeconds]);

  return { ...state, reset };
}
