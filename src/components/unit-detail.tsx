"use client";

import { itemsForUnit } from "@/data/japanese";
import type { Unit } from "@/data/types";
import { BOX_INTERVALS, LEARNED_BOX, todayKey, unitStats } from "@/lib/progress";
import { isSpeechAvailable, speak } from "@/lib/speech";
import { useProgress } from "@/lib/store";
import { Bar, ButtonLink, Card, cx } from "@/components/ui";

export function UnitDetail({ unit }: { unit: Unit }) {
  const { progress, ready } = useProgress();
  const items = itemsForUnit(unit.id);
  const stats = ready ? unitStats(progress, unit.id) : null;
  const today = todayKey();

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-4">
        <span className="jp grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl text-accent">
          {unit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight">{unit.title}</h1>
          <p className="text-sm text-muted">{unit.subtitle}</p>
          <Bar pct={stats?.pct ?? 0} className="mt-2" />
        </div>
        <div className="hidden text-right text-sm tabular-nums text-muted sm:block">
          {stats ? `${stats.learned}/${stats.total}` : `${items.length}`}
        </div>
      </Card>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const card = ready ? progress.cards[item.id] : undefined;
            const state = !card
              ? "new"
              : card.box >= LEARNED_BOX
                ? "learned"
                : card.due <= today
                  ? "due"
                  : "learning";
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => speak(item.ja)}
                  disabled={!isSpeechAvailable()}
                  className="jp min-w-0 flex-1 text-left disabled:cursor-default"
                  aria-label={`Play ${item.ja}`}
                >
                  <span className="block truncate text-lg font-bold">{item.ja}</span>
                  <span className="block truncate text-xs text-muted">
                    {item.kana !== item.ja ? `${item.kana} · ` : ""}
                    {item.romaji}
                  </span>
                </button>
                <span className="min-w-0 flex-1 truncate text-sm text-pretty">{item.en}</span>
                <StateBadge state={state} box={card?.box ?? 0} />
              </li>
            );
          })}
        </ul>
      </Card>

      <ButtonLink href="/learn" size="lg" className="w-full">
        Practice now
      </ButtonLink>
    </div>
  );
}

function StateBadge({
  state,
  box,
}: {
  state: "new" | "learning" | "due" | "learned";
  box: number;
}) {
  const label = {
    new: "New",
    learning: "Learning",
    due: "Due",
    learned: `${BOX_INTERVALS[box]}d`,
  }[state];

  return (
    <span
      className={cx(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
        state === "new" && "bg-surface-2 text-muted",
        state === "learning" && "bg-accent-soft text-accent",
        state === "due" && "bg-danger-soft text-danger",
        state === "learned" && "bg-success-soft text-success",
      )}
    >
      {label}
    </span>
  );
}
