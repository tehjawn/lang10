import { ITEMS, ITEMS_BY_ID, UNIT_ORDER } from "@/data/japanese";
import type { Item } from "@/data/types";

/** Leitner box → days until the card comes back. Box 0 is "due now". */
export const BOX_INTERVALS = [0, 1, 2, 4, 8, 16, 32];
export const MAX_BOX = BOX_INTERVALS.length - 1;
/** A card counts as "learned" once it survives to this box. */
export const LEARNED_BOX = 3;

export const DEFAULT_DAILY_GOAL = 10;
/** Slots held back in each session so new material always gets in. */
const NEW_ITEM_RESERVE = 4;

export const PROGRESS_VERSION = 1;

export type CardState = {
  box: number;
  /** Local calendar day (YYYY-MM-DD) the card next comes up. */
  due: string;
  seen: number;
  correct: number;
  lapses: number;
  /** Epoch ms of the last answer — used to resolve cross-device merges. */
  ts: number;
};

export type Progress = {
  version: number;
  createdAt: string;
  updatedAt: string;
  xp: number;
  streak: number;
  bestStreak: number;
  /** Local day of the last session that met the daily goal. */
  lastGoalDate: string | null;
  dailyGoal: number;
  /** Advance automatically after a correct answer instead of waiting for a tap. */
  autoAdvance: boolean;
  /** Play the chime on a correct answer. */
  sound: boolean;
  /** YYYY-MM-DD → answers given that day. */
  history: Record<string, number>;
  cards: Record<string, CardState>;
};

export const todayKey = (d = new Date()): string => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const addDays = (key: string, days: number): string => {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayKey(d);
};

export const daysBetween = (a: string, b: string): number =>
  Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000,
  );

export function createProgress(): Progress {
  const now = new Date().toISOString();
  return {
    version: PROGRESS_VERSION,
    createdAt: now,
    updatedAt: now,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastGoalDate: null,
    dailyGoal: DEFAULT_DAILY_GOAL,
    autoAdvance: true,
    sound: true,
    history: {},
    cards: {},
  };
}

/** Repairs anything missing or malformed so old/foreign blobs never crash the app. */
export function normalizeProgress(input: unknown): Progress {
  const base = createProgress();
  if (!input || typeof input !== "object") return base;
  const p = input as Partial<Progress>;
  const cards: Record<string, CardState> = {};
  if (p.cards && typeof p.cards === "object") {
    for (const [id, raw] of Object.entries(p.cards)) {
      if (!ITEMS_BY_ID.has(id) || !raw || typeof raw !== "object") continue;
      const c = raw as Partial<CardState>;
      cards[id] = {
        box: clamp(Math.trunc(Number(c.box) || 0), 0, MAX_BOX),
        due: typeof c.due === "string" ? c.due : todayKey(),
        seen: Math.max(0, Math.trunc(Number(c.seen) || 0)),
        correct: Math.max(0, Math.trunc(Number(c.correct) || 0)),
        lapses: Math.max(0, Math.trunc(Number(c.lapses) || 0)),
        ts: Math.max(0, Math.trunc(Number(c.ts) || 0)),
      };
    }
  }
  const history: Record<string, number> = {};
  if (p.history && typeof p.history === "object") {
    for (const [day, n] of Object.entries(p.history)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) history[day] = Math.max(0, Math.trunc(Number(n) || 0));
    }
  }
  return {
    ...base,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : base.createdAt,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : base.updatedAt,
    xp: Math.max(0, Math.trunc(Number(p.xp) || 0)),
    streak: Math.max(0, Math.trunc(Number(p.streak) || 0)),
    bestStreak: Math.max(0, Math.trunc(Number(p.bestStreak) || 0)),
    lastGoalDate: typeof p.lastGoalDate === "string" ? p.lastGoalDate : null,
    dailyGoal: clamp(Math.trunc(Number(p.dailyGoal) || DEFAULT_DAILY_GOAL), 5, 50),
    autoAdvance: typeof p.autoAdvance === "boolean" ? p.autoAdvance : true,
    sound: typeof p.sound === "boolean" ? p.sound : true,
    history,
    cards,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Merges two progress blobs without losing work done offline on another device.
 * Cards resolve by last-answered time; counters take the higher value.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const cards: Record<string, CardState> = { ...a.cards };
  for (const [id, cb] of Object.entries(b.cards)) {
    const ca = cards[id];
    cards[id] = !ca || cb.ts > ca.ts ? cb : ca;
  }
  const history: Record<string, number> = { ...a.history };
  for (const [day, n] of Object.entries(b.history)) {
    history[day] = Math.max(history[day] ?? 0, n);
  }
  const lastGoalDate =
    [a.lastGoalDate, b.lastGoalDate].filter(Boolean).sort().pop() ?? null;
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return {
    ...newer,
    version: PROGRESS_VERSION,
    createdAt: a.createdAt < b.createdAt ? a.createdAt : b.createdAt,
    updatedAt: new Date().toISOString(),
    xp: Math.max(a.xp, b.xp),
    streak: Math.max(a.streak, b.streak),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    lastGoalDate,
    history,
    cards,
  };
}

// ---------------------------------------------------------------- scheduling

export function scheduleCard(prev: CardState | undefined, correct: boolean): CardState {
  const box = prev?.box ?? 0;
  // A slip drops the card two boxes rather than all the way to zero, so mature
  // cards are not punished out of proportion to one bad answer.
  const next = correct ? Math.min(MAX_BOX, box + 1) : Math.max(0, box - 2);
  return {
    box: next,
    due: addDays(todayKey(), BOX_INTERVALS[next]),
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1),
    ts: Date.now(),
  };
}

export function applyAnswer(p: Progress, itemId: string, correct: boolean): Progress {
  const day = todayKey();
  const card = scheduleCard(p.cards[itemId], correct);
  return {
    ...p,
    updatedAt: new Date().toISOString(),
    xp: p.xp + (correct ? 10 : 2),
    history: { ...p.history, [day]: (p.history[day] ?? 0) + 1 },
    cards: { ...p.cards, [itemId]: card },
  };
}

/** Called once a session's goal is met; rolls the streak forward or resets it. */
export function completeDay(p: Progress): Progress {
  const day = todayKey();
  if (p.lastGoalDate === day) return p;
  const streak = p.lastGoalDate && daysBetween(p.lastGoalDate, day) === 1 ? p.streak + 1 : 1;
  return {
    ...p,
    updatedAt: new Date().toISOString(),
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
    lastGoalDate: day,
  };
}

// ------------------------------------------------------------------- queries

export const answeredToday = (p: Progress) => p.history[todayKey()] ?? 0;

export const dueCards = (p: Progress, day = todayKey()): string[] =>
  Object.entries(p.cards)
    .filter(([id, c]) => c.due <= day && ITEMS_BY_ID.has(id))
    .sort((x, y) => x[1].due.localeCompare(y[1].due) || x[1].box - y[1].box)
    .map(([id]) => id);

/** New items, in unlock order, that the learner has never seen. */
export const newItems = (p: Progress): Item[] => {
  const rank = new Map(UNIT_ORDER.map((u, i) => [u, i]));
  return ITEMS.filter((i) => !p.cards[i.id]).sort(
    (a, b) => (rank.get(a.unit) ?? 99) - (rank.get(b.unit) ?? 99),
  );
};

export function unitStats(p: Progress, unitId: string) {
  const items = ITEMS.filter((i) => i.unit === unitId);
  let started = 0;
  let learned = 0;
  for (const i of items) {
    const c = p.cards[i.id];
    if (!c) continue;
    started++;
    if (c.box >= LEARNED_BOX) learned++;
  }
  return { total: items.length, started, learned, pct: items.length ? learned / items.length : 0 };
}

/**
 * Plain-language mastery bands. Learners do not need to reason about Leitner
 * boxes or interval lengths to read their own progress.
 */
export const MASTERY_BANDS = [
  { label: "New", boxes: [0], hint: "Just met" },
  { label: "Learning", boxes: [1, 2], hint: "Back within days" },
  { label: "Familiar", boxes: [3, 4], hint: "Back within weeks" },
  { label: "Known", boxes: [5, 6], hint: "Back within a month" },
] as const;

export function masteryCounts(p: Progress) {
  const cards = Object.values(p.cards);
  return MASTERY_BANDS.map((band) => ({
    ...band,
    count: cards.filter((c) => (band.boxes as readonly number[]).includes(c.box)).length,
  }));
}

export function overallStats(p: Progress) {
  const cards = Object.values(p.cards);
  const learned = cards.filter((c) => c.box >= LEARNED_BOX).length;
  const seen = cards.reduce((n, c) => n + c.seen, 0);
  const correct = cards.reduce((n, c) => n + c.correct, 0);
  return {
    total: ITEMS.length,
    started: cards.length,
    learned,
    due: dueCards(p).length,
    accuracy: seen ? correct / seen : 0,
    answers: seen,
  };
}

export { NEW_ITEM_RESERVE };
