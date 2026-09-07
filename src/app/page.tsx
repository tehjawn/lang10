"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { UNITS } from "@/data/japanese";
import { answeredToday, overallStats, unitStats } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { useOccasional } from "@/lib/use-occasional";
import {
  Bar,
  ButtonLink,
  Card,
  PulseHalo,
  Ring,
  SPRING,
  Stat,
  ToriiMark,
} from "@/components/ui";

const UNITS_OPEN_KEY = "lang10.unitsOpen";

export default function DashboardPage() {
  const { progress, ready, user, accountsEnabled } = useProgress();
  const stats0 = ready ? overallStats(progress) : null;
  // Each of these runs on its own jittered clock, so nothing pulses in unison.
  const streakTick = useOccasional({
    minMs: 10_000,
    maxMs: 18_000,
    enabled: ready && progress.streak > 0,
  });
  const dueTick = useOccasional({
    minMs: 13_000,
    maxMs: 23_000,
    enabled: ready && (stats0?.due ?? 0) > 0,
  });
  const ringTick = useOccasional({
    minMs: 11_000,
    maxMs: 20_000,
    enabled: ready && answeredToday(progress) >= progress.dailyGoal,
  });
  // Remembered so someone who browses units does not have to reopen the list
  // every time they come back. Read lazily rather than in an effect: this
  // screen renders a skeleton until the store hydrates, so the units section is
  // absent from the server HTML and cannot mismatch.
  const [unitsOpen, setUnitsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(UNITS_OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleUnits = () => {
    setUnitsOpen((open) => {
      try {
        window.localStorage.setItem(UNITS_OPEN_KEY, open ? "0" : "1");
      } catch {
        // Ignore; the choice just will not persist.
      }
      return !open;
    });
  };

  if (!ready) return <DashboardSkeleton />;

  const done = answeredToday(progress);
  const goal = progress.dailyGoal;
  const stats = overallStats(progress);
  const goalMet = done >= goal;
  const started = stats.started > 0;
  // Asking someone to make an account before they have any progress is a
  // decision with nothing behind it, so the prompt waits until there is.
  const worthSaving = progress.streak >= 2 || stats.started >= 20;

  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
    >
      <Rise>
        <Card className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <div className="relative grid place-items-center">
            {goalMet && <PulseHalo tick={ringTick} tone="matcha" className="rounded-full" />}
            <Ring value={done} max={goal}>
              <div>
                <div className="text-3xl font-extrabold tabular-nums">{Math.min(done, goal)}</div>
                <div className="text-xs font-bold text-muted">of {goal}</div>
              </div>
            </Ring>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
              {goalMet
                ? "Today's goal is done"
                : started
                  ? "Pick up where you left off"
                  : "Ten Japanese words a day"}
            </h1>
            <p className="mt-2 text-sm text-muted text-pretty">
              {goalMet
                ? "Come back tomorrow to keep the streak alive — or run an extra set now."
                : started
                  ? `${goal - done} to go. ${stats.due} card${stats.due === 1 ? "" : "s"} due for review.`
                  : "Short daily sets, spaced repetition, and audio. No account needed to start."}
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <ButtonLink href="/learn" size="xl" className="sm:px-10">
                {goalMet ? "Extra practice" : started ? "Continue" : "Start learning"}
              </ButtonLink>
              {started && (
                <ButtonLink href="/progress" size="xl" variant="outline">
                  See progress
                </ButtonLink>
              )}
            </div>
          </div>
        </Card>
      </Rise>

      <Rise>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Streak"
            value={
              <span className="inline-flex items-center gap-1.5 text-torii">
                <span className="relative grid place-items-center">
                  {progress.streak > 0 && <PulseHalo tick={streakTick} />}
                  <ToriiMark className="relative h-5 w-5" />
                </span>
                {progress.streak}
              </span>
            }
          />
          <Stat label="XP" value={progress.xp.toLocaleString()} />
          <Stat label="Learned" value={`${stats.learned}/${stats.total}`} />
          <Stat
            label="Due now"
            value={
              <motion.span
                key={dueTick}
                className="inline-block tabular-nums"
                animate={stats.due > 0 ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                {stats.due}
              </motion.span>
            }
          />
        </div>
      </Rise>

      {accountsEnabled && !user && worthSaving && (
        <Rise>
          <SaveProgressNudge />
        </Rise>
      )}

      <section>
        <Rise>
          <button
            type="button"
            onClick={toggleUnits}
            aria-expanded={unitsOpen}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left shadow-card transition hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold">Browse units</div>
              <div className="text-xs text-muted">
                {UNITS.length} units · {stats.learned} of {stats.total} items learned
              </div>
            </div>
            <motion.span
              animate={{ rotate: unitsOpen ? 180 : 0 }}
              transition={SPRING}
              className="text-muted"
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </motion.span>
          </button>
        </Rise>

        <AnimatePresence initial={false}>
          {unitsOpen && (
            <motion.div
              key="units"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                {UNITS.map((unit) => {
                  const u = unitStats(progress, unit.id);
                  return (
                    <motion.div key={unit.id} whileHover={{ y: -3 }} transition={SPRING}>
                      <Link
                        href={`/unit/${unit.id}`}
                        className="block rounded-2xl border border-border border-b-4 border-b-border-strong bg-surface p-4 shadow-card transition hover:bg-surface-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="jp grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-matcha-soft text-xl text-matcha">
                            {unit.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-extrabold">{unit.title}</div>
                            <div className="truncate text-xs text-muted">{unit.subtitle}</div>
                          </div>
                          <div className="text-right text-xs font-bold tabular-nums text-muted">
                            {u.learned}/{u.total}
                          </div>
                        </div>
                        <Bar pct={u.pct} className="mt-3" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </motion.div>
  );
}

/** Shared entrance: a short rise and fade, staggered by the parent. */
function Rise({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { y: 14, opacity: 0 }, shown: { y: 0, opacity: 1 } }}
      transition={SPRING}
    >
      {children}
    </motion.div>
  );
}

function SaveProgressNudge() {
  return (
    <Card className="flex flex-col gap-3 border-matcha/30 bg-matcha-soft sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="font-extrabold">Keep your streak on every device</div>
        <p className="text-sm text-muted">
          Progress is saved in this browser. Create a free account to sync it.
        </p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/signup" size="md">
          Create account
        </ButtonLink>
        <ButtonLink href="/login" size="md" variant="outline">
          Sign in
        </ButtonLink>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface-2" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
