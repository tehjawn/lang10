"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { UNITS } from "@/data/japanese";
import { answeredToday, overallStats, unitStats } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { Bar, ButtonLink, Card, Ring, SPRING, Stat, ToriiMark } from "@/components/ui";

export default function DashboardPage() {
  const { progress, ready, user, accountsEnabled } = useProgress();

  if (!ready) return <DashboardSkeleton />;

  const done = answeredToday(progress);
  const goal = progress.dailyGoal;
  const stats = overallStats(progress);
  const goalMet = done >= goal;
  const started = stats.started > 0;

  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
    >
      <Rise>
        <Card className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <Ring value={done} max={goal}>
            <div>
              <div className="text-3xl font-extrabold tabular-nums">{Math.min(done, goal)}</div>
              <div className="text-xs font-bold text-muted">of {goal}</div>
            </div>
          </Ring>

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
                <ToriiMark className="h-5 w-5" />
                {progress.streak}
              </span>
            }
          />
          <Stat label="XP" value={progress.xp.toLocaleString()} />
          <Stat label="Learned" value={`${stats.learned}/${stats.total}`} />
          <Stat label="Due now" value={stats.due} />
        </div>
      </Rise>

      {accountsEnabled && !user && started && (
        <Rise>
          <SaveProgressNudge />
        </Rise>
      )}

      <section>
        <Rise>
          <h2 className="mb-3 px-1 text-sm font-extrabold tracking-wide text-muted uppercase">
            Units
          </h2>
        </Rise>
        <div className="grid gap-3 sm:grid-cols-2">
          {UNITS.map((unit) => {
            const u = unitStats(progress, unit.id);
            return (
              <Rise key={unit.id}>
                <motion.div whileHover={{ y: -3 }} transition={SPRING}>
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
              </Rise>
            );
          })}
        </div>
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
