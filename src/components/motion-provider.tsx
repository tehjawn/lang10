"use client";

import { MotionConfig } from "motion/react";

/**
 * `reducedMotion="user"` makes every Framer Motion animation respect the OS
 * setting, matching what globals.css does for CSS transitions.
 */
export function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
