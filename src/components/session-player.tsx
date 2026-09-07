"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "@/data/types";
import { UNITS_BY_ID } from "@/data/japanese";
import { answeredToday, applyAnswer, completeDay } from "@/lib/progress";
import { buildSession, checkTyped, isQuiz, type SessionPlan, type Step } from "@/lib/session";
import { isSpeechAvailable, speak, whenVoicesReady } from "@/lib/speech";
import { useProgress } from "@/lib/store";
import { Button, ButtonLink, Card, cx } from "./ui";

type Phase = "answering" | "feedback";

export function SessionPlayer() {
  const { progress, ready, update } = useProgress();
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [chosen, setChosen] = useState<Item | null>(null);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [canListen, setCanListen] = useState(false);

  // Voices arrive asynchronously; until then, listening exercises stay out of
  // the rotation so nobody gets a silent question.
  useEffect(() => whenVoicesReady(() => setCanListen(isSpeechAvailable())), []);

  // Build the set once per visit, from the progress snapshot at mount.
  const built = useRef(false);
  useEffect(() => {
    if (!ready || built.current) return;
    built.current = true;
    setPlan(buildSession(progress, { canListen: isSpeechAvailable() }));
  }, [ready, progress]);

  const step = plan?.steps[index];
  const finished = Boolean(plan) && index >= (plan?.steps.length ?? 0);

  const answer = useCallback(
    (correct: boolean, item: Item) => {
      setWasCorrect(correct);
      setPhase("feedback");
      setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
      update((p) => applyAnswer(p, item.id, correct));
    },
    [update],
  );

  const next = useCallback(() => {
    setPhase("answering");
    setChosen(null);
    setTyped("");
    setIndex((i) => i + 1);
  }, []);

  if (!ready || !plan) return <SessionSkeleton />;
  if (finished) return <SessionSummary score={score} plan={plan} />;
  if (!step) return <SessionSkeleton />;

  const quizTotal = plan.steps.filter(isQuiz).length;
  // The current question counts as done as soon as it has been answered, so the
  // bar moves with the answer rather than waiting for Continue.
  const quizIndex =
    plan.steps.slice(0, index).filter(isQuiz).length + (phase === "feedback" ? 1 : 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader done={quizIndex} total={quizTotal} />

      <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
        {step.kind === "teach" ? (
          <TeachStep key={index} item={step.item} canListen={canListen} onNext={next} />
        ) : (
          <QuizStepView
            key={index}
            step={step}
            phase={phase}
            chosen={chosen}
            typed={typed}
            wasCorrect={wasCorrect}
            canListen={canListen}
            onChoose={(item) => {
              setChosen(item);
              answer(item.id === step.item.id, step.item);
            }}
            onTypedChange={setTyped}
            onSubmitTyped={() => answer(checkTyped(step.item, typed), step.item)}
            onNext={next}
          />
        )}
      </div>
    </div>
  );
}

function SessionHeader({ done, total }: { done: number; total: number }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur">
      <Link
        href="/"
        aria-label="End session"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </Link>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums text-muted">
        {done}/{total}
      </span>
    </header>
  );
}

function SpeakButton({ text, className }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label="Play pronunciation"
      className={cx(
        "grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-accent transition hover:bg-accent-soft active:scale-95",
        className,
      )}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}

function ItemFace({ item, size = "lg" }: { item: Item; size?: "lg" | "md" }) {
  const showKana = item.kana !== item.ja;
  return (
    <div className="text-center">
      <div
        className={cx(
          "jp font-bold text-balance",
          size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl",
        )}
      >
        {item.ja}
      </div>
      {showKana && <div className="jp mt-2 text-lg text-muted">{item.kana}</div>}
    </div>
  );
}

function TeachStep({
  item,
  canListen,
  onNext,
}: {
  item: Item;
  canListen: boolean;
  onNext: () => void;
}) {
  // Say each new item once as it is introduced.
  useEffect(() => {
    if (canListen) speak(item.ja);
  }, [item, canListen]);

  useEnterKey(onNext);

  const unit = UNITS_BY_ID.get(item.unit);

  return (
    <div className="flex flex-1 flex-col animate-pop">
      <p className="text-center text-sm font-bold tracking-wide text-accent uppercase">
        New — {unit?.title ?? "Vocabulary"}
      </p>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <Card className="w-full max-w-md py-9">
          <ItemFace item={item} />
          <div className="mt-5 flex items-center justify-center gap-3">
            {canListen && <SpeakButton text={item.ja} />}
            <div className="text-center">
              <div className="text-lg font-bold">{item.en}</div>
              {/* Kana items are their own romaji — no need to say it twice. */}
              {item.romaji !== item.en && (
                <div className="text-sm text-muted">{item.romaji}</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Button size="lg" className="w-full" onClick={onNext}>
        Got it
      </Button>
    </div>
  );
}

function QuizStepView({
  step,
  phase,
  chosen,
  typed,
  wasCorrect,
  canListen,
  onChoose,
  onTypedChange,
  onSubmitTyped,
  onNext,
}: {
  step: Exclude<Step, { kind: "teach" }>;
  phase: Phase;
  chosen: Item | null;
  typed: string;
  wasCorrect: boolean;
  canListen: boolean;
  onChoose: (item: Item) => void;
  onTypedChange: (v: string) => void;
  onSubmitTyped: () => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step.kind === "listen" && canListen) speak(step.item.ja);
  }, [step, canListen]);

  useEffect(() => {
    if (step.kind === "type" && phase === "answering") inputRef.current?.focus();
  }, [step, phase]);

  const prompt = {
    recognize: "What does this mean?",
    recall: "Which one is this?",
    listen: "What did you hear?",
    type: "Type the meaning",
  }[step.kind];

  const answered = phase === "feedback";

  // Number keys pick options. Enter is deliberately not handled here: once an
  // answer is in, the Continue button takes focus and handles Enter itself.
  useEffect(() => {
    if (step.kind === "type" || answered) return;
    const handler = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= step.options.length) onChoose(step.options[n - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, answered, onChoose]);

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-sm font-bold tracking-wide text-muted uppercase">{prompt}</p>

      <div className="flex flex-1 flex-col items-center justify-center py-6">
        {step.kind === "recall" ? (
          <div className="text-center">
            <div className="text-3xl font-extrabold text-balance sm:text-4xl">{step.item.en}</div>
          </div>
        ) : step.kind === "listen" ? (
          <button
            type="button"
            onClick={() => speak(step.item.ja)}
            className="grid h-28 w-28 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95"
            aria-label="Replay audio"
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <ItemFace item={step.item} />
            {canListen && answered && <SpeakButton text={step.item.ja} />}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {step.kind === "type" ? (
          <TypeAnswer
            ref={inputRef}
            item={step.item}
            value={typed}
            answered={answered}
            wasCorrect={wasCorrect}
            onChange={onTypedChange}
            onSubmit={onSubmitTyped}
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {step.options.map((option, i) => (
              <OptionButton
                key={option.id}
                index={i}
                option={option}
                showJapanese={step.kind === "recall"}
                state={
                  !answered
                    ? "idle"
                    : option.id === step.item.id
                      ? "correct"
                      : option.id === chosen?.id
                        ? "wrong"
                        : "muted"
                }
                disabled={answered}
                onClick={() => onChoose(option)}
              />
            ))}
          </div>
        )}

        {answered && (
          <Feedback correct={wasCorrect} item={step.item} canListen={canListen} onNext={onNext} />
        )}
      </div>
    </div>
  );
}

function OptionButton({
  option,
  index,
  showJapanese,
  state,
  disabled,
  onClick,
}: {
  option: Item;
  index: number;
  showJapanese: boolean;
  state: "idle" | "correct" | "wrong" | "muted";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99]",
        state === "idle" && "border-border bg-surface hover:border-accent hover:bg-surface-2",
        state === "correct" && "border-success bg-success-soft",
        state === "wrong" && "border-danger bg-danger-soft animate-shake",
        state === "muted" && "border-border bg-surface opacity-50",
      )}
    >
      <span className="hidden h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-xs font-bold text-muted sm:grid">
        {index + 1}
      </span>
      {showJapanese ? (
        <span className="min-w-0">
          <span className="jp block text-2xl font-bold">{option.ja}</span>
          {option.kana !== option.ja && (
            <span className="jp block text-xs text-muted">{option.kana}</span>
          )}
        </span>
      ) : (
        <span className="min-w-0 font-semibold text-pretty">{option.en}</span>
      )}
    </button>
  );
}

function TypeAnswer({
  ref,
  item,
  value,
  answered,
  wasCorrect,
  onChange,
  onSubmit,
}: {
  ref: React.RefObject<HTMLInputElement | null>;
  item: Item;
  value: string;
  answered: boolean;
  wasCorrect: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && value.trim()) onSubmit();
      }}
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={answered}
        placeholder="Type in English…"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label={`Meaning of ${item.ja}`}
        className={cx(
          "w-full rounded-xl border-2 bg-surface px-4 py-4 text-lg outline-none transition",
          !answered && "border-border focus:border-accent",
          answered && wasCorrect && "border-success bg-success-soft",
          answered && !wasCorrect && "border-danger bg-danger-soft",
        )}
      />
      {!answered && (
        <Button type="submit" size="lg" className="mt-3 w-full" disabled={!value.trim()}>
          Check
        </Button>
      )}
    </form>
  );
}

function Feedback({
  correct,
  item,
  canListen,
  onNext,
}: {
  correct: boolean;
  item: Item;
  canListen: boolean;
  onNext: () => void;
}) {
  return (
    <div
      className={cx(
        "animate-pop rounded-xl border p-4",
        correct ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft",
      )}
      role="status"
    >
      <div className="flex items-center gap-3">
        <span className={cx("text-lg font-extrabold", correct ? "text-success" : "text-danger")}>
          {correct ? "正解 — nice!" : "Not quite"}
        </span>
        {canListen && <SpeakButton text={item.ja} className="ml-auto h-9 w-9" />}
      </div>
      <p className="mt-1 text-sm">
        <span className="jp font-bold">{item.ja}</span>
        {item.kana !== item.ja && <span className="jp text-muted"> ({item.kana})</span>}
        <span className="text-muted"> · {item.romaji} · </span>
        <span className="font-semibold">{item.en}</span>
      </p>
      <Button size="lg" className="mt-3 w-full" onClick={onNext} autoFocus>
        Continue
      </Button>
    </div>
  );
}

function SessionSummary({
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center animate-pop">
      <div className="text-6xl">{goalMet ? "🎉" : "👏"}</div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">
          {goalMet ? "Daily goal complete" : "Set complete"}
        </h1>
        <p className="mt-2 text-muted">
          {plan.newCount > 0
            ? `${plan.newCount} new item${plan.newCount === 1 ? "" : "s"} learned · `
            : ""}
          {score.correct}/{score.total} correct
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        <SummaryStat label="Accuracy" value={`${accuracy}%`} />
        <SummaryStat label="XP" value={`+${xp}`} />
        <SummaryStat label="Streak" value={`${progress.streak}🔥`} />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <ButtonLink href="/" size="lg">
          Back to today
        </ButtonLink>
        <ButtonLink
          href="/learn"
          size="lg"
          variant="outline"
          // A full reload rebuilds the queue against the progress just saved.
          prefetch={false}
        >
          Another set
        </ButtonLink>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
    </div>
  );
}

function useEnterKey(fn: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") fn();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fn]);
}

function SessionSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
