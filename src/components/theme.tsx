"use client";

import { motion } from "motion/react";
import { SPRING, cx } from "./ui";

export const THEME_KEY = "lang10.theme";
export type Theme = "dark" | "light";

/**
 * Runs before first paint so the page never flashes the wrong palette. Anything
 * other than an explicit "light" resolves to dark, which is the default.
 */
export const THEME_BOOT_SCRIPT = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_KEY)});
  document.documentElement.dataset.theme = t === "light" ? "light" : "dark";
} catch (e) {
  document.documentElement.dataset.theme = "dark";
}`.trim();

const THEME_COLOR: Record<Theme, string> = { dark: "#1a1a1a", light: "#fdfbf7" };

export function setTheme(next: Theme) {
  const root = document.documentElement;
  // Transitions are gated behind this class so only the swap animates.
  root.classList.add("theme-switching");
  root.dataset.theme = next;
  window.setTimeout(() => root.classList.remove("theme-switching"), 240);

  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private browsing — the choice simply will not persist.
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
}

/**
 * Two states rather than a light/dark/system triple: a third option makes
 * people reason about what "system" currently resolves to, for a choice they
 * can already make in one tap.
 *
 * The button holds no React state. Which icon shows is decided by CSS from the
 * `data-theme` attribute the boot script sets, so there is nothing for the
 * server and client to disagree about, and the label describes the control
 * rather than a state that would need re-rendering.
 */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={() =>
        setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light")
      }
      whileTap={{ scale: 0.88 }}
      transition={SPRING}
      aria-label="Switch between light and dark mode"
      title="Light / dark mode"
      className={cx(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:text-ink",
        className,
      )}
    >
      <span className="grid [grid-template-areas:'icon']">
        <span className="theme-icon theme-icon-sun [grid-area:icon]">
          <SunGlyph />
        </span>
        <span className="theme-icon theme-icon-moon [grid-area:icon]">
          <MoonGlyph />
        </span>
      </span>
    </motion.button>
  );
}

function SunGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}
