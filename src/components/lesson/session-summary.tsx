"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { answeredToday, completeDay } from "@/lib/progress";
import type { SessionPlan } from "@/lib/session";
import { useProgress } from "@/lib/store";
import { ButtonLink, SPRING } from "@/components/ui";
import { HankoStamp } from "./hanko-stamp";

export function SessionSummary({
  score,
  plan,
}: {
  score: { correct: number; total: number };
  plan: SessionPlan;
}) {
  const { progress, update } = useProgress();
  const goalMet = answeredToday(progress) >= progress.dailyGoal;

  // Roll the streak forward exactly once, the first time today's goal is met.
  useEffect(() => {
    if (goalMet) update(completeDay);
  }, [goalMet, update]);

  const accuracy = score.total ? Math.round((score.correct / score.total) * 100) : 0;
  const xp = score.correct * 10 + (score.total - score.correct) * 2;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <HankoStamp celebrateOnMount={goalMet} />

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.35 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">
          {goalMet ? "Daily goal complete" : "Set complete"}
        </h1>
        <p className="mt-2 text-muted">
          {plan.newCount > 0
            ? `${plan.newCount} new item${plan.newCount === 1 ? "" : "s"} learned · `
            : ""}
          {score.correct}/{score.total} correct
        </p>
      </motion.div>

      <motion.div
        className="grid w-full max-w-sm grid-cols-3 gap-3"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } } }}
      >
        <SummaryStat label="Accuracy" value={`${accuracy}%`} />
        <SummaryStat label="XP" value={`+${xp}`} />
        <SummaryStat label="Streak" value={`${progress.streak}`} tone="torii" />
      </motion.div>

      <motion.div
        className="flex w-full max-w-sm flex-col gap-2.5"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.7 }}
      >
        <ButtonLink href="/" size="xl">
          Back to today
        </ButtonLink>
        <ButtonLink href="/learn" size="lg" variant="outline" prefetch={false}>
          Another set
        </ButtonLink>
      </motion.div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "torii";
}) {
  return (
    <motion.div
      variants={{ hidden: { y: 14, opacity: 0 }, shown: { y: 0, opacity: 1 } }}
      transition={SPRING}
      className="rounded-2xl border border-border bg-surface p-3 shadow-card"
    >
      <div
        className={`text-xl font-extrabold tabular-nums ${tone === "torii" ? "text-torii" : ""}`}
      >
        {value}
      </div>
      <div className="text-[11px] font-bold tracking-wide text-muted uppercase">{label}</div>
    </motion.div>
  );
}
