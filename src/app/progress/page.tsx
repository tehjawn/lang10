"use client";

import Link from "next/link";
import { UNITS } from "@/data/japanese";
import { addDays, masteryCounts, overallStats, todayKey, unitStats } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { Bar, ButtonLink, Card, PulseHalo, PulseRing, Stat, ToriiMark, cx } from "@/components/ui";
import { useOccasional } from "@/lib/use-occasional";

const HEATMAP_WEEKS = 13;

export default function ProgressPage() {
  const { progress, ready } = useProgress();
  // Hooks must run before the loading branch returns.
  const streakTick = useOccasional({
    minMs: 10_000,
    maxMs: 19_000,
    enabled: ready && progress.streak > 0,
  });

  if (!ready) {
    return <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface-2" />;
  }

  const stats = overallStats(progress);
  const bands = masteryCounts(progress);

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">Progress</h1>

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
          hint={`Best ${progress.bestStreak}`}
        />
        <Stat label="XP" value={progress.xp.toLocaleString()} />
        <Stat label="Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} hint={`${stats.answers} answers`} />
        <Stat label="Learned" value={`${stats.learned}/${stats.total}`} />
      </div>

      <Card>
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Activity</h2>
        <Heatmap history={progress.history} goal={progress.dailyGoal} />
      </Card>

      <Card>
        <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">
          How well you know them
        </h2>
        <p className="mt-1 text-sm text-muted">
          Items climb as you get them right, and come back after longer gaps.
        </p>
        <div className="mt-4 space-y-3">
          {bands.map((band) => (
            <div key={band.label} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 font-extrabold">{band.label}</span>
              <Bar pct={stats.started ? band.count / stats.started : 0} className="flex-1" />
              <span className="w-8 shrink-0 text-right font-bold tabular-nums text-muted">
                {band.count}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Units</h2>
          <ButtonLink href="/learn" size="sm" variant="soft">
            Practice
          </ButtonLink>
        </div>
        <ul className="mt-4 space-y-3">
          {UNITS.map((unit) => {
            const u = unitStats(progress, unit.id);
            return (
              <li key={unit.id}>
                <Link href={`/unit/${unit.id}`} className="group block">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold group-hover:text-matcha">{unit.title}</span>
                    <span className="tabular-nums text-muted">
                      {u.learned}/{u.total}
                    </span>
                  </div>
                  <Bar pct={u.pct} className="mt-1.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Heatmap({ history, goal }: { history: Record<string, number>; goal: number }) {
  const today = todayKey();
  // Marks where "now" is on a grid of ninety near-identical squares.
  const todayTick = useOccasional({ minMs: 8_000, maxMs: 15_000 });
  // End the grid on the Saturday of this week so columns stay whole weeks.
  const weekday = new Date(`${today}T00:00:00`).getDay();
  const lastDay = addDays(today, 6 - weekday);
  const days = HEATMAP_WEEKS * 7;

  const cells = Array.from({ length: days }, (_, i) => {
    const key = addDays(lastDay, -(days - 1 - i));
    return { key, count: history[key] ?? 0, future: key > today };
  });

  const columns: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="flex gap-1">
        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.key}
                title={cell.future ? cell.key : `${cell.key} — ${cell.count} answers`}
                className={cx(
                  "relative h-3.5 w-3.5 rounded-[3px]",
                  cell.future
                    ? "bg-transparent"
                    : cell.count === 0
                      ? "bg-track"
                      : cell.count >= goal
                        ? "bg-matcha"
                        : "bg-matcha/45",
                )}
              >
                {cell.key === today && (
                  <PulseRing
                    tick={todayTick}
                    tone={cell.count >= goal ? "matcha" : "torii"}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-track" />
        <span className="h-3 w-3 rounded-[3px] bg-matcha/45" />
        <span className="h-3 w-3 rounded-[3px] bg-matcha" />
        <span>Goal met</span>
      </div>
    </div>
  );
}
