"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Item } from "@/data/types";
import { Button, SPRING, cx } from "@/components/ui";
import { AudioButton } from "./audio-button";

export type DockState =
  | { phase: "answering"; canSubmit: boolean }
  | { phase: "feedback"; correct: boolean; item: Item; canListen: boolean }
  | { phase: "teach"; item: Item };

/**
 * Fixed bottom bar carrying the one action available at any moment. Feedback
 * appears here too, so the answer and the verdict occupy the same place on
 * screen — the eye never has to hunt for the result.
 */
export function ActionDock({ state, onPrimary }: { state: DockState; onPrimary: () => void }) {
  const label =
    state.phase === "answering" ? "Check" : state.phase === "teach" ? "Got it" : "Continue";

  const disabled = state.phase === "answering" && !state.canSubmit;
  const tone = state.phase === "feedback" && !state.correct ? "torii" : "matcha";

  return (
    <div className="sticky bottom-0 z-20 mt-auto">
      <AnimatePresence mode="wait" initial={false}>
        {state.phase === "feedback" && (
          <motion.div
            key={state.correct ? "correct" : "wrong"}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            className={cx(
              "border-t px-4 pt-4 pb-2",
              state.correct
                ? "border-matcha/30 bg-matcha-soft"
                : "border-torii/30 bg-torii-soft",
            )}
          >
            <div className="mx-auto flex max-w-xl items-start gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...SPRING, delay: 0.05 }}
                className={cx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-white",
                  state.correct ? "bg-matcha" : "bg-torii",
                )}
                aria-hidden
              >
                {state.correct ? <CheckGlyph /> : <CrossGlyph />}
              </motion.span>

              <div className="min-w-0 flex-1">
                <p
                  className={cx(
                    "text-base font-extrabold",
                    state.correct ? "text-matcha" : "text-torii",
                  )}
                >
                  {state.correct ? "正解 — nice!" : "Not quite"}
                </p>
                <p className="mt-0.5 text-sm text-ink/80">
                  <span className="jp font-bold">{state.item.ja}</span>
                  {state.item.kana !== state.item.ja && (
                    <span className="jp text-muted"> ({state.item.kana})</span>
                  )}
                  <span className="text-muted"> · {state.item.romaji} · </span>
                  <span className="font-bold">{state.item.en}</span>
                </p>
              </div>

              {state.canListen && (
                <AudioButton text={state.item.ja} size="sm" className="shrink-0" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cx(
          "border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur",
          state.phase === "feedback"
            ? state.correct
              ? "border-matcha/30 bg-matcha-soft"
              : "border-torii/30 bg-torii-soft"
            : "bg-paper/90",
        )}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Button
            variant={tone}
            size="xl"
            className="w-full"
            onClick={onPrimary}
            disabled={disabled}
          >
            {label}
          </Button>
        </div>
        <p className="mx-auto mt-2 hidden max-w-xl text-center text-xs text-muted sm:block">
          {state.phase === "answering"
            ? "Press 1–9 to choose · Enter to check"
            : "Press Enter to continue"}
        </p>
      </div>
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
