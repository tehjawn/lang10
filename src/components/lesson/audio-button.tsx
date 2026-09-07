"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { speak } from "@/lib/speech";
import { SPRING, cx } from "@/components/ui";

const RING_COUNT = 3;

/**
 * Speaker control that emits concentric rings while audio is actually playing.
 * The rings are driven by the utterance's own start/end events rather than a
 * fixed timer, so they track real playback length.
 */
export function AudioButton({
  text,
  size = "md",
  autoPlay = false,
  className,
  label = "Play pronunciation",
}: {
  text: string;
  size?: "sm" | "md" | "lg";
  autoPlay?: boolean;
  className?: string;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const play = useCallback(() => {
    speak(text, {
      onStart: () => mounted.current && setPlaying(true),
      onEnd: () => mounted.current && setPlaying(false),
    });
  }, [text]);

  useEffect(() => {
    if (autoPlay) play();
  }, [autoPlay, play]);

  const box = { sm: "h-9 w-9", md: "h-12 w-12", lg: "h-28 w-28" }[size];
  const glyph = { sm: 16, md: 20, lg: 44 }[size];

  return (
    <span className={cx("relative inline-grid place-items-center", className)}>
      <AnimatePresence>
        {playing &&
          Array.from({ length: RING_COUNT }, (_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className={cx(
                "pointer-events-none absolute rounded-full border-2",
                size === "lg" ? "border-matcha/45" : "border-matcha/35",
                box,
              )}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: size === "lg" ? 1.75 : 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={play}
        aria-label={label}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        transition={SPRING}
        className={cx(
          "relative grid place-items-center rounded-full",
          size === "lg"
            ? "bg-matcha text-on-brand shadow-card"
            : "border border-border bg-surface text-matcha",
          box,
        )}
      >
        <motion.span
          animate={playing ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={playing ? { duration: 0.9, repeat: Infinity } : SPRING}
          className="grid place-items-center"
        >
          <SpeakerGlyph size={glyph} />
        </motion.span>
      </motion.button>
    </span>
  );
}

function SpeakerGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}
