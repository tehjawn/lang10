"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { answeredToday } from "@/lib/progress";
import { useOccasional } from "@/lib/use-occasional";
import { useProgress } from "@/lib/store";
import { ThemeToggle } from "./theme";
import { PulseHalo, SPRING, ToriiMark, cx } from "./ui";

const NAV = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/learn", label: "Learn", icon: BoltIcon },
  { href: "/progress", label: "Progress", icon: ChartIcon },
  { href: "/account", label: "Account", icon: UserIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The lesson player owns the whole screen so nothing competes with the answer.
  const focusMode = pathname === "/learn";

  return (
    <div className="flex min-h-dvh flex-col">
      {!focusMode && <Header pathname={pathname} />}
      <main
        className={cx(
          "mx-auto w-full flex-1",
          focusMode ? "max-w-2xl" : "max-w-4xl px-4 pt-5 pb-28 sm:pb-10",
        )}
      >
        {children}
      </main>
      {!focusMode && <MobileNav pathname={pathname} />}
    </div>
  );
}

function Header({ pathname }: { pathname: string }) {
  const { progress, ready } = useProgress();
  const done = answeredToday(progress);
  // Only a live streak is worth drawing attention back to.
  const streakTick = useOccasional({
    minMs: 12_000,
    maxMs: 21_000,
    enabled: ready && progress.streak > 0,
  });

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="jp grid h-9 w-9 place-items-center rounded-xl bg-matcha text-lg font-bold text-on-brand shadow-card">
            十
          </span>
          <span className="text-xl font-extrabold tracking-tight">Lang10</span>
        </Link>

        <nav className="ml-5 hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "relative rounded-xl px-3.5 py-2 text-sm font-bold transition",
                  active ? "text-matcha" : "text-muted hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-matcha-soft"
                    transition={SPRING}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm font-extrabold tabular-nums text-torii"
            title="Day streak"
          >
            <span className="relative grid place-items-center">
              {ready && progress.streak > 0 && <PulseHalo tick={streakTick} />}
              <ToriiMark className="relative h-4 w-4" />
            </span>
            {ready ? progress.streak : "–"}
          </span>
          <span
            className="rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm font-extrabold tabular-nums text-matcha"
            title="Answers today"
          >
            {ready ? `${done}/${progress.dailyGoal}` : "–"}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-4xl">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition",
                  active ? "text-matcha" : "text-muted",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-mark"
                    className="absolute top-0 h-1 w-10 rounded-b-full bg-matcha"
                    transition={SPRING}
                  />
                )}
                <motion.span animate={{ scale: active ? 1.08 : 1 }} transition={SPRING}>
                  <Icon />
                </motion.span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
