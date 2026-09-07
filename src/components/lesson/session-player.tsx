"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UNITS_BY_ID } from "@/data/japanese";
import type { Item } from "@/data/types";
import { applyAnswer } from "@/lib/progress";
import {
  buildSession,
  checkOrder,
  checkTyped,
  isQuiz,
  type SessionPlan,
  type Step,
} from "@/lib/session";
import { playCorrect, playWrong } from "@/lib/sound";
import { isSpeechAvailable, whenVoicesReady } from "@/lib/speech";
import { useProgress } from "@/lib/store";
import { cx } from "@/components/ui";
import { ActionDock, type DockState } from "./action-dock";
import { AudioButton } from "./audio-button";
import { ChoiceOptions, ItemFace, OrderAnswer, TeachCard, TypeAnswer } from "./exercise-views";
import { LessonHeader } from "./lesson-header";
import { SessionSummary } from "./session-summary";

type Phase = "answering" | "feedback";

/**
 * How long a correct answer stays on screen before the session moves on. Long
 * enough to register the green and glance at the reading, short enough that a
 * clean run costs one interaction per question instead of two.
 */
const AUTO_ADVANCE_MS = 1100;

const PROMPTS: Record<Exclude<Step["kind"], "teach">, string> = {
  recognize: "What does this mean?",
  recall: "Which one is this?",
  listen: "What did you hear?",
  type: "Type the meaning",
  order: "Build the phrase",
};

export function SessionPlayer() {
  const { progress, ready, update } = useProgress();
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [chosen, setChosen] = useState<Item | null>(null);
  const [typed, setTyped] = useState("");
  const [placed, setPlaced] = useState<number[]>([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [canListen, setCanListen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => whenVoicesReady(() => setCanListen(isSpeechAvailable())), []);

  const built = useRef(false);
  useEffect(() => {
    if (!ready || built.current) return;
    built.current = true;
    setPlan(buildSession(progress, { canListen: isSpeechAvailable() }));
  }, [ready, progress]);

  const step = plan?.steps[index];
  const finished = Boolean(plan) && index >= (plan?.steps.length ?? 0);

  useEffect(() => {
    if (step?.kind === "type" && phase === "answering") inputRef.current?.focus();
  }, [step, phase]);

  const next = useCallback(() => {
    // Cancelling synchronously is what makes a manual tap safe during an
    // automatic advance: whichever happens first disarms the other.
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setPhase("answering");
    setChosen(null);
    setTyped("");
    setPlaced([]);
    setIndex((i) => i + 1);
  }, []);

  const submit = useCallback(() => {
    if (!step || step.kind === "teach") return;
    const correct =
      step.kind === "type"
        ? checkTyped(step.item, typed)
        : step.kind === "order"
          ? checkOrder(step.item, placed.map((i) => step.chunks[i]))
          : chosen?.id === step.item.id;

    // Fired here rather than from an effect so it happens exactly once per
    // answer, on the gesture that graded it — which is also what satisfies
    // browser autoplay rules.
    if (progress.sound) (correct ? playCorrect : playWrong)();

    setWasCorrect(correct);
    setPhase("feedback");
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    update((p) => applyAnswer(p, step.item.id, correct));
  }, [step, typed, placed, chosen, update, progress.sound]);

  const primary = useCallback(() => {
    if (!step) return;
    if (step.kind === "teach" || phase === "feedback") return next();
    if (canSubmit(step, { chosen, typed, placed })) submit();
  }, [step, phase, chosen, typed, placed, next, submit]);

  // A correct answer needs no acknowledgement, so it moves on by itself. A
  // wrong one always waits — that is the screen worth reading.
  const autoAdvancing =
    phase === "feedback" && wasCorrect && progress.autoAdvance && step?.kind !== "teach";

  useEffect(() => {
    if (!autoAdvancing) return;
    advanceTimer.current = setTimeout(next, AUTO_ADVANCE_MS);
    return () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };
  }, [autoAdvancing, index, next]);

  /** Number keys pick an option, or place the next piece in an ordering task. */
  const pickByNumber = useCallback(
    (n: number) => {
      if (!step || phase === "feedback") return;
      if (step.kind === "order") {
        if (n < step.chunks.length && !placed.includes(n)) setPlaced((p) => [...p, n]);
        return;
      }
      if (step.kind === "recognize" || step.kind === "recall" || step.kind === "listen") {
        if (n < step.options.length) setChosen(step.options[n]);
      }
    },
    [step, phase, placed],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A keydown can be targeted at the document or window as well as an
      // element, so narrow before reaching for element-only methods.
      const el = event.target instanceof Element ? event.target : null;
      const inField =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

      if (event.key === "Enter" || event.key === " ") {
        // Space belongs to the text field; Enter there is the form's to handle.
        if (inField) return;
        // A focused control activates natively — handling it here too would
        // advance twice on a single press.
        if (el?.closest("[data-native-key]")) return;
        event.preventDefault();
        primary();
        return;
      }

      if (inField) return;
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) {
        event.preventDefault();
        pickByNumber(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary, pickByNumber]);

  const dockState = useMemo<DockState | null>(() => {
    if (!step) return null;
    if (step.kind === "teach") return { phase: "teach", item: step.item };
    if (phase === "feedback")
      return {
        phase: "feedback",
        correct: wasCorrect,
        item: step.item,
        canListen,
        ...(autoAdvancing ? { autoAdvanceMs: AUTO_ADVANCE_MS } : {}),
      };
    return { phase: "answering", canSubmit: canSubmit(step, { chosen, typed, placed }) };
  }, [step, phase, wasCorrect, canListen, chosen, typed, placed, autoAdvancing]);

  if (!ready || !plan) return <LoadingSession />;
  if (finished) return <SessionSummary score={score} plan={plan} />;
  if (!step || !dockState) return <LoadingSession />;

  const quizTotal = plan.steps.filter(isQuiz).length;
  const quizDone =
    plan.steps.slice(0, index).filter(isQuiz).length + (phase === "feedback" ? 1 : 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <LessonHeader done={quizDone} total={quizTotal} streak={progress.streak} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }}
            className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-5 pb-6"
          >
            <p
              className={cx(
                "text-center text-sm font-extrabold tracking-wide uppercase",
                step.kind === "teach" ? "text-matcha" : "text-muted",
              )}
            >
              {step.kind === "teach"
                ? `New — ${UNITS_BY_ID.get(step.item.unit)?.title ?? "Vocabulary"}`
                : PROMPTS[step.kind]}
            </p>

            <div className="flex flex-1 flex-col items-center justify-center py-6">
              {step.kind === "teach" ? (
                <TeachCard item={step.item} canListen={canListen} />
              ) : step.kind === "listen" ? (
                <AudioButton text={step.item.ja} size="lg" autoPlay label="Replay audio" />
              ) : step.kind === "recall" || step.kind === "order" ? (
                <div className="text-3xl font-extrabold text-balance sm:text-4xl">
                  {step.item.en}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ItemFace item={step.item} />
                  {canListen && phase === "feedback" && (
                    <AudioButton text={step.item.ja} size="sm" />
                  )}
                </div>
              )}
            </div>

            {step.kind !== "teach" && (
              <div className="mt-auto">
                {step.kind === "type" ? (
                  <TypeAnswer
                    inputRef={inputRef}
                    item={step.item}
                    value={typed}
                    answered={phase === "feedback"}
                    correct={wasCorrect}
                    onChange={setTyped}
                    onSubmit={submit}
                  />
                ) : step.kind === "order" ? (
                  <OrderAnswer
                    item={step.item}
                    pool={step.chunks}
                    placed={placed}
                    answered={phase === "feedback"}
                    correct={wasCorrect}
                    onPlace={(i) => setPlaced((p) => (p.includes(i) ? p : [...p, i]))}
                    onUnplace={(slot) => setPlaced((p) => p.filter((_, s) => s !== slot))}
                  />
                ) : (
                  <ChoiceOptions
                    options={step.options}
                    showJapanese={step.kind === "recall"}
                    selectedId={chosen?.id ?? null}
                    answerId={step.item.id}
                    answered={phase === "feedback"}
                    onSelect={(item) => {
                      setChosen(item);
                      // Release focus so Enter reaches the dock rather than
                      // re-activating the option just clicked.
                      (document.activeElement as HTMLElement | null)?.blur();
                    }}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div data-native-key>
        <ActionDock state={dockState} onPrimary={primary} />
      </div>
    </div>
  );
}

function canSubmit(
  step: Step,
  state: { chosen: Item | null; typed: string; placed: number[] },
): boolean {
  switch (step.kind) {
    case "teach":
      return true;
    case "type":
      return state.typed.trim().length > 0;
    case "order":
      return state.placed.length === step.chunks.length;
    default:
      return state.chosen !== null;
  }
}

function LoadingSession() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy>
      <motion.div
        className="h-10 w-10 rounded-full border-[3px] border-border border-t-matcha"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
