"use client";

import { AnimatePresence, motion } from "motion/react";
import type { RefObject } from "react";
import type { Item } from "@/data/types";
import { SPRING, cx } from "@/components/ui";
import { AudioButton } from "./audio-button";

/** The Japanese face of an item, sized for the prompt area. */
export function ItemFace({ item, size = "lg" }: { item: Item; size?: "lg" | "md" }) {
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

// ------------------------------------------------------------ multiple choice

export function ChoiceOptions({
  options,
  showJapanese,
  selectedId,
  answerId,
  answered,
  onSelect,
}: {
  options: Item[];
  showJapanese: boolean;
  selectedId: string | null;
  answerId: string;
  answered: boolean;
  onSelect: (item: Item) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option, i) => {
        const chosen = option.id === selectedId;
        const state = !answered
          ? chosen
            ? "chosen"
            : "idle"
          : option.id === answerId
            ? "correct"
            : chosen
              ? "wrong"
              : "dim";

        return (
          <motion.button
            key={option.id}
            type="button"
            disabled={answered}
            onClick={() => onSelect(option)}
            whileTap={answered ? undefined : { scale: 0.97 }}
            animate={
              state === "correct"
                ? { scale: [1, 1.04, 1] }
                : state === "wrong"
                  ? { x: [0, -8, 7, -5, 3, 0] }
                  : { scale: 1, x: 0 }
            }
            transition={
              // Multi-keyframe sequences cannot use a spring — Motion only
              // supports two keyframes there — so these run on a duration.
              state === "correct"
                ? { duration: 0.35, ease: "easeOut" }
                : state === "wrong"
                  ? { duration: 0.4 }
                  : SPRING
            }
            className={cx(
              "tactile flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left",
              state === "idle" &&
                "border-border border-b-border-strong bg-surface hover:bg-surface-2",
              state === "chosen" && "border-matcha border-b-matcha-deep bg-matcha-soft",
              state === "correct" && "border-matcha border-b-matcha-deep bg-matcha-soft",
              state === "wrong" && "border-torii border-b-torii-deep bg-torii-soft",
              state === "dim" && "border-border border-b-border-strong bg-surface opacity-45",
            )}
          >
            <span
              className={cx(
                "hidden h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-extrabold sm:grid",
                state === "chosen" || state === "correct"
                  ? "border-matcha text-matcha"
                  : state === "wrong"
                    ? "border-torii text-torii"
                    : "border-border text-muted",
              )}
              aria-hidden
            >
              {i + 1}
            </span>
            {showJapanese ? (
              <span className="min-w-0">
                <span className="jp block text-2xl font-bold">{option.ja}</span>
                {option.kana !== option.ja && (
                  <span className="jp block text-xs text-muted">{option.kana}</span>
                )}
              </span>
            ) : (
              <span className="min-w-0 font-bold text-pretty">{option.en}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------------- typing

export function TypeAnswer({
  inputRef,
  item,
  value,
  answered,
  correct,
  onChange,
  onSubmit,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  item: Item;
  value: string;
  answered: boolean;
  correct: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <motion.form
      animate={answered && !correct ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && value.trim()) onSubmit();
      }}
    >
      <input
        ref={inputRef}
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
          "w-full rounded-xl border-2 border-b-4 bg-surface px-4 py-4 text-lg font-semibold outline-none transition",
          !answered && "border-border border-b-border-strong focus:border-matcha",
          answered && correct && "border-matcha border-b-matcha-deep bg-matcha-soft",
          answered && !correct && "border-torii border-b-torii-deep bg-torii-soft",
        )}
      />
    </motion.form>
  );
}

// ---------------------------------------------------------- sentence ordering

export function OrderAnswer({
  item,
  pool,
  placed,
  answered,
  correct,
  onPlace,
  onUnplace,
}: {
  item: Item;
  pool: string[];
  placed: number[];
  answered: boolean;
  correct: boolean;
  onPlace: (poolIndex: number) => void;
  onUnplace: (slot: number) => void;
}) {
  const used = new Set(placed);

  return (
    <div className="space-y-4">
      {/* Assembly line — tapping a placed piece sends it back to the pool. */}
      <motion.div
        animate={answered && !correct ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={cx(
          "flex min-h-20 flex-wrap content-start items-start gap-2 rounded-xl border-2 border-dashed p-3",
          !answered && "border-border bg-surface-2",
          answered && correct && "border-matcha bg-matcha-soft",
          answered && !correct && "border-torii bg-torii-soft",
        )}
        aria-label="Your answer"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {placed.map((poolIndex, slot) => (
            <motion.button
              key={`${poolIndex}-${pool[poolIndex]}`}
              type="button"
              layout
              disabled={answered}
              onClick={() => onUnplace(slot)}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={SPRING}
              className="jp tactile rounded-xl border-2 border-border border-b-border-strong bg-surface px-3.5 py-2 text-xl font-bold"
            >
              {pool[poolIndex]}
            </motion.button>
          ))}
        </AnimatePresence>

        {placed.length === 0 && (
          <span className="self-center px-1 text-sm text-muted">
            Tap the pieces below in order
          </span>
        )}
      </motion.div>

      {/* Source pool. Slots stay in place once used so the layout never jumps. */}
      <div className="flex flex-wrap gap-2" aria-label="Available pieces">
        {pool.map((chunk, i) => (
          <motion.button
            key={`${i}-${chunk}`}
            type="button"
            layout
            disabled={answered || used.has(i)}
            onClick={() => onPlace(i)}
            whileTap={{ scale: 0.94 }}
            transition={SPRING}
            className={cx(
              "jp rounded-xl border-2 px-3.5 py-2 text-xl font-bold transition",
              used.has(i)
                ? "border-dashed border-border bg-transparent text-transparent"
                : "tactile border-border border-b-border-strong bg-surface hover:bg-surface-2",
            )}
            aria-hidden={used.has(i)}
          >
            {chunk}
          </motion.button>
        ))}
      </div>

      {answered && !correct && (
        <p className="text-center text-sm text-muted">
          Correct order: <span className="jp font-bold text-ink">{item.ja}</span>
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ teaching

export function TeachCard({ item, canListen }: { item: Item; canListen: boolean }) {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface px-6 py-10 shadow-card">
        <ItemFace item={item} />
        <div className="mt-6 flex items-center justify-center gap-4">
          {canListen && <AudioButton text={item.ja} autoPlay />}
          <div className="text-center">
            <div className="text-xl font-extrabold">{item.en}</div>
            {item.romaji !== item.en && (
              <div className="text-sm text-muted">{item.romaji}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
