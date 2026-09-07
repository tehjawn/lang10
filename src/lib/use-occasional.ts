"use client";

import { useEffect, useState } from "react";

/**
 * Returns a counter that advances at randomised intervals, for animations that
 * should catch the eye now and then rather than run continuously.
 *
 * The randomised delay matters: with a fixed interval every pulse on a page
 * eventually falls into step and the whole screen throbs together, which reads
 * as a loading state. Independent jitter keeps them ambient.
 *
 * Ticks are suppressed entirely under prefers-reduced-motion, and skipped while
 * the tab is in the background.
 */
export function useOccasional({
  minMs = 9_000,
  maxMs = 16_000,
  enabled = true,
}: { minMs?: number; maxMs?: number; enabled?: boolean } = {}): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          // A pulse nobody can see is just wasted work.
          if (document.visibilityState === "visible") setTick((t) => t + 1);
          schedule();
        },
        minMs + Math.random() * Math.max(0, maxMs - minMs),
      );
    };

    schedule();
    return () => clearTimeout(timer);
  }, [enabled, minMs, maxMs]);

  return tick;
}
