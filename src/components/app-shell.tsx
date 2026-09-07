"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { answeredToday } from "@/lib/progress";
import { useProgress } from "@/lib/store";
import { cx } from "./ui";

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
      {!focusMode && <Header />}
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

function Header() {
  const { progress, ready } = useProgress();
  const done = answeredToday(progress);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm text-accent-fg">
            十
          </span>
          <span className="text-lg">Lang10</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <Pill title="Day streak" tone="sakura">
            🔥 {ready ? progress.streak : "–"}
          </Pill>
          <Pill title="Answers today" tone="accent">
            {ready ? `${done}/${progress.dailyGoal}` : "–"}
          </Pill>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cx(
        "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
        active ? "bg-accent-soft text-accent" : "text-muted hover:text-text",
      )}
    >
      {label}
    </Link>
  );
}

function Pill({
  children,
  title,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  tone: "accent" | "sakura";
}) {
  return (
    <span
      title={title}
      className={cx(
        "rounded-full border border-border px-2.5 py-1 text-xs tabular-nums",
        tone === "sakura" ? "text-sakura" : "text-accent",
      )}
    >
      {children}
    </span>
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
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon />
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
  strokeWidth: 1.8,
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
