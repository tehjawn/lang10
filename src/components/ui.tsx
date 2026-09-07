"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/** Shared spring. Firm enough to feel physical, short enough to stay out of the way. */
export const SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } as const;
export const SOFT_SPRING = { type: "spring", stiffness: 260, damping: 26 } as const;

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-border bg-surface p-5 shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-xl font-bold tracking-tight " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50";

const VARIANTS = {
  /** The one action colour. Used for the primary move on any screen. */
  matcha: "tactile bg-matcha text-on-brand border-matcha-deep hover:bg-matcha-hover",
  torii: "tactile bg-torii text-white border-torii-deep hover:brightness-105",
  outline: "tactile bg-surface text-ink border-border-strong ring-1 ring-border hover:bg-surface-2",
  soft: "bg-matcha-soft text-matcha hover:brightness-97",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-torii-soft text-torii hover:brightness-97",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
  xl: "h-16 px-8 text-lg",
} as const;

type StyleProps = { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES };

export function Button({
  variant = "matcha",
  size = "md",
  className,
  ...rest
}: StyleProps & ComponentProps<"button">) {
  return <button className={cx(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />;
}

export function ButtonLink({
  variant = "matcha",
  size = "md",
  className,
  ...rest
}: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={cx(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />;
}

/**
 * Icon button with motion press compression. Used where there is no room for
 * the 4px lip treatment.
 */
export function IconButton({
  className,
  children,
  ...rest
}: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={SPRING}
      className={cx(
        "grid place-items-center rounded-full border border-border bg-surface text-matcha",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Circular meter for the daily goal. */
export function Ring({
  value,
  max,
  size = 132,
  stroke = 12,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--matcha)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ ...SOFT_SPRING, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-3 text-center shadow-card">
      <div className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[11px] font-bold tracking-wide text-muted uppercase">{label}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function Bar({
  pct,
  className,
  tone = "matcha",
}: {
  pct: number;
  className?: string;
  tone?: "matcha" | "torii";
}) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-track", className)}>
      <motion.div
        className={cx("h-full rounded-full", tone === "torii" ? "bg-torii" : "bg-matcha")}
        initial={false}
        animate={{ width: `${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%` }}
        transition={SOFT_SPRING}
      />
    </div>
  );
}

/**
 * A halo that blooms outward once per `tick`. Keyed on the tick so each change
 * replays the animation from the start; the parent decides how often that is.
 * Multi-keyframe sequences run on a duration — Motion springs only support two.
 */
export function PulseHalo({
  tick,
  tone = "torii",
  className,
}: {
  tick: number;
  tone?: "torii" | "matcha";
  className?: string;
}) {
  return (
    <motion.span
      key={tick}
      aria-hidden
      className={cx("pointer-events-none absolute inset-0 rounded-full", className)}
      style={{ background: `radial-gradient(circle, var(--${tone}) 0%, transparent 68%)` }}
      initial={{ opacity: 0, scale: 0.65 }}
      animate={{ opacity: [0, 0.5, 0], scale: [0.65, 1.7, 2.1] }}
      transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.35, 1] }}
    />
  );
}

/** An expanding outline, for marking a spot rather than lighting it up. */
export function PulseRing({
  tick,
  tone = "matcha",
  className,
}: {
  tick: number;
  tone?: "torii" | "matcha";
  className?: string;
}) {
  return (
    <motion.span
      key={tick}
      aria-hidden
      className={cx("pointer-events-none absolute inset-0 rounded-[4px] border-2", className)}
      style={{ borderColor: `var(--${tone})` }}
      initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: [0, 0.8, 0], scale: [1, 1.9, 2.4] }}
      transition={{ duration: 1.4, ease: "easeOut", times: [0, 0.25, 1] }}
    />
  );
}

/** The red seal used for streaks and the end-of-session stamp. */
export function ToriiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2.6 4.2c3 1 6 1.5 9.4 1.5s6.4-.5 9.4-1.5v2.9c-.9.3-1.8.5-2.7.7V9h2.2v2.6h-2.2v8.2h-2.7v-8.2H8v8.2H5.3v-8.2H3.1V9h2.2V7.8c-.9-.2-1.8-.4-2.7-.7V4.2Zm5.4 4.1v.7h8v-.7c-1.3.1-2.6.2-4 .2s-2.7-.1-4-.2Z" />
    </svg>
  );
}
