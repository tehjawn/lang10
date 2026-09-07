"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { SOFT_SPRING, ToriiMark } from "@/components/ui";

export function LessonHeader({
  done,
  total,
  streak,
}: {
  done: number;
  total: number;
  streak: number;
}) {
  const pct = total ? Math.min(1, done / total) : 0;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-paper/90 px-4 py-3 backdrop-blur">
      <Link
        href="/"
        aria-label="End session"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </Link>

      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Session progress"
      >
        <motion.div
          className="h-full rounded-full bg-matcha"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={SOFT_SPRING}
        >
          {/* A lighter cap gives the fill a rounded, lit edge as it advances. */}
          <div className="h-1 w-full rounded-full bg-white/25" />
        </motion.div>
      </div>

      <span
        className="relative flex shrink-0 items-center gap-1.5 text-sm font-extrabold tabular-nums text-torii"
        title={`${streak} day streak`}
      >
        <span className="relative grid place-items-center">
          <span className="streak-glow absolute inset-0" aria-hidden />
          <ToriiMark className="relative h-5 w-5" />
        </span>
        {streak}
      </span>
    </header>
  );
}
