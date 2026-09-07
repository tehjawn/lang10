"use client";

import Link from "next/link";
import { UNITS } from "@/data/japanese";
import {
  BOX_INTERVALS,
  LEARNED_BOX,
  MAX_BOX,
  addDays,
  overallStats,
  todayKey,
  unitStats,
} from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { Bar, ButtonLink, Card, Stat, cx } from "@/components/ui";

const HEATMAP_WEEKS = 13;

export default function ProgressPage() {
  const { progress, ready } = useProgress();

  if (!ready) {
    return <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface-2" />;
  }

  const stats = overallStats(progress);
  const boxCounts = Array.from({ length: MAX_BOX + 1 }, (_, box) =>
    Object.values(progress.cards).filter((c) => c.box === box).length,
  );

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">Progress</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Streak" value={`${progress.streak}🔥`} hint={`Best ${progress.bestStreak}`} />
        <Stat label="XP" value={progress.xp.toLocaleString()} />
        <Stat label="Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} hint={`${stats.answers} answers`} />
        <Stat label="Learned" value={`${stats.learned}/${stats.total}`} />
      </div>

      <Card>
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Activity</h2>
        <Heatmap history={progress.history} goal={progress.dailyGoal} />
      </Card>

      <Card>
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
          Memory strength
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cards move up a box each time you get them right, and come back after longer gaps.
        </p>
        <div className="mt-4 space-y-2">
          {boxCounts.map((count, box) => (
            <div key={box} className="flex items-center gap-3 text-sm">
              <span
                className={cx(
                  "w-24 shrink-0 font-semibold",
                  box >= LEARNED_BOX ? "text-success" : "text-muted",
                )}
              >
                {box === 0 ? "New" : `${BOX_INTERVALS[box]}-day`}
              </span>
              <Bar pct={stats.started ? count / stats.started : 0} className="flex-1" />
              <span className="w-8 shrink-0 text-right tabular-nums text-muted">{count}</span>
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
                    <span className="font-semibold group-hover:text-accent">{unit.title}</span>
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
                  "h-3.5 w-3.5 rounded-[3px]",
                  cell.future
                    ? "bg-transparent"
                    : cell.count === 0
                      ? "bg-[var(--ring-track)]"
                      : cell.count >= goal
                        ? "bg-accent"
                        : "bg-accent/45",
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-[var(--ring-track)]" />
        <span className="h-3 w-3 rounded-[3px] bg-accent/45" />
        <span className="h-3 w-3 rounded-[3px] bg-accent" />
        <span>Goal met</span>
      </div>
    </div>
  );
}
