"use client";

import Link from "next/link";
import { UNITS } from "@/data/japanese";
import { answeredToday, overallStats, unitStats } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { Bar, ButtonLink, Card, Ring, Stat } from "@/components/ui";

export default function DashboardPage() {
  const { progress, ready, user, accountsEnabled } = useProgress();

  if (!ready) return <DashboardSkeleton />;

  const done = answeredToday(progress);
  const goal = progress.dailyGoal;
  const stats = overallStats(progress);
  const goalMet = done >= goal;
  const started = stats.started > 0;

  return (
    <div className="space-y-5">
      <Card className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <Ring value={done} max={goal}>
          <div>
            <div className="text-3xl font-extrabold tabular-nums">{Math.min(done, goal)}</div>
            <div className="text-xs font-semibold text-muted">of {goal}</div>
          </div>
        </Ring>

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-balance">
            {goalMet
              ? "Today's goal is done 🎉"
              : started
                ? "Pick up where you left off"
                : "Ten Japanese words a day"}
          </h1>
          <p className="mt-1.5 text-sm text-muted text-pretty">
            {goalMet
              ? `Come back tomorrow to keep the streak alive — or run an extra set now.`
              : started
                ? `${goal - done} to go. ${stats.due} card${stats.due === 1 ? "" : "s"} due for review.`
                : "Short daily sets, spaced repetition, and audio. No account needed to start."}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/learn" size="lg" className="sm:px-8">
              {goalMet ? "Extra practice" : started ? "Continue" : "Start learning"}
            </ButtonLink>
            {started && (
              <ButtonLink href="/progress" size="lg" variant="outline">
                See progress
              </ButtonLink>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Streak" value={`${progress.streak}🔥`} />
        <Stat label="XP" value={progress.xp.toLocaleString()} />
        <Stat label="Learned" value={`${stats.learned}/${stats.total}`} />
        <Stat label="Due now" value={stats.due} />
      </div>

      {accountsEnabled && !user && started && <SaveProgressNudge />}

      <section>
        <h2 className="mb-3 px-1 text-sm font-bold tracking-wide text-muted uppercase">
          Units
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {UNITS.map((unit) => {
            const u = unitStats(progress, unit.id);
            return (
              <Link
                key={unit.id}
                href={`/unit/${unit.id}`}
                className="group rounded-2xl border border-border bg-surface p-4 transition hover:border-accent hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="jp grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-lg text-accent">
                    {unit.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{unit.title}</div>
                    <div className="truncate text-xs text-muted">{unit.subtitle}</div>
                  </div>
                  <div className="text-right text-xs font-semibold tabular-nums text-muted">
                    {u.learned}/{u.total}
                  </div>
                </div>
                <Bar pct={u.pct} className="mt-3" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SaveProgressNudge() {
  return (
    <Card className="flex flex-col gap-3 border-accent/40 bg-accent-soft sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="font-bold">Keep your streak on every device</div>
        <p className="text-sm text-muted">
          Progress is saved in this browser. Create a free account to sync it.
        </p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/signup" size="sm">
          Create account
        </ButtonLink>
        <ButtonLink href="/login" size="sm" variant="outline">
          Sign in
        </ButtonLink>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <Card className="h-52 animate-pulse bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface-2" />
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
