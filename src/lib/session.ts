import { ITEMS, ITEMS_BY_ID, isOrderable } from "@/data/japanese";
import type { Item } from "@/data/types";
import { NEW_ITEM_RESERVE, dueCards, newItems, type Progress } from "./progress";

/** Items are taught and quizzed in groups of this size. */
const CHUNK_SIZE = 5;

export type Step =
  /** Introduces an item before it is ever quizzed. Not scored. */
  | { kind: "teach"; item: Item }
  /** Show Japanese, pick the English. */
  | { kind: "recognize"; item: Item; options: Item[] }
  /** Show English, pick the Japanese. */
  | { kind: "recall"; item: Item; options: Item[] }
  /** Hear the Japanese, pick the English. */
  | { kind: "listen"; item: Item; options: Item[] }
  /** Show Japanese, type the English (romaji for kana items). */
  | { kind: "type"; item: Item }
  /** Show English, rebuild the Japanese phrase from shuffled pieces. */
  | { kind: "order"; item: Item; chunks: string[] };

export type QuizStep = Exclude<Step, { kind: "teach" }>;

export const isQuiz = (s: Step): s is QuizStep => s.kind !== "teach";

function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Three plausible wrong answers, preferring items from the same unit. */
function distractors(item: Item, count = 3): Item[] {
  const sameUnit = ITEMS.filter((i) => i.unit === item.unit && i.id !== item.id);
  const rest = ITEMS.filter((i) => i.unit !== item.unit && i.en !== item.en);
  const pool = [...shuffle(sameUnit), ...shuffle(rest)];
  const picked: Item[] = [];
  const usedAnswers = new Set([item.en.toLowerCase()]);
  for (const candidate of pool) {
    if (picked.length === count) break;
    const key = candidate.en.toLowerCase();
    if (usedAnswers.has(key)) continue;
    usedAnswers.add(key);
    picked.push(candidate);
  }
  return picked;
}

function withOptions(item: Item) {
  return shuffle([item, ...distractors(item)]);
}

/**
 * Picks the exercise for a card based on how well it is known: recognition
 * first, then recall, then production.
 */
function exerciseFor(item: Item, box: number, canListen: boolean): QuizStep {
  const ladder: QuizStep["kind"][][] = [
    ["recognize"],
    ["recognize", "recall"],
    ["recall", "listen", "order"],
    ["recall", "type", "order"],
    ["type", "listen", "order"],
    ["type", "order"],
    ["type"],
  ];
  const choices = (ladder[box] ?? ["type"]).filter(
    (k) => (k !== "listen" || canListen) && (k !== "order" || isOrderable(item)),
  );
  const kind = choices[Math.floor(Math.random() * choices.length)] ?? "recognize";
  if (kind === "type") return { kind: "type", item };
  if (kind === "order") {
    return { kind: "order", item, chunks: shuffleUntilMoved(item.chunks!) };
  }
  return { kind, item, options: withOptions(item) };
}

/**
 * Shuffle that will not hand back the answer already in order. Falls back after
 * a few tries so a pathological input cannot spin.
 */
function shuffleUntilMoved(chunks: string[]): string[] {
  for (let i = 0; i < 8; i++) {
    const next = shuffle(chunks);
    if (next.some((c, idx) => c !== chunks[idx])) return next;
  }
  return [...chunks].reverse();
}

export type SessionPlan = {
  steps: Step[];
  /** Ids quizzed in this session, in queue order. */
  itemIds: string[];
  newCount: number;
  reviewCount: number;
};

export function buildSession(p: Progress, opts: { canListen?: boolean } = {}): SessionPlan {
  const canListen = opts.canListen ?? false;
  const goal = p.dailyGoal;

  const due = dueCards(p);
  const fresh = newItems(p);
  // Hold slots back for new material, but never more than about a third of a
  // short session — otherwise a small daily goal would crowd out reviews.
  const newSlots = Math.min(NEW_ITEM_RESERVE, Math.ceil(goal * 0.4), fresh.length);
  const reviewIds = due.slice(0, Math.max(0, goal - newSlots));
  const newOnes = fresh.slice(0, goal - reviewIds.length);

  // A quiet day with nothing due and nothing new still gives a session: revisit
  // the weakest cards rather than showing an empty screen.
  let reviewItems = reviewIds.map((id) => ITEMS_BY_ID.get(id)!).filter(Boolean);
  if (reviewItems.length + newOnes.length < goal) {
    const already = new Set([...reviewItems, ...newOnes].map((i) => i.id));
    const weakest = Object.entries(p.cards)
      .filter(([id]) => !already.has(id) && ITEMS_BY_ID.has(id))
      .sort((a, b) => a[1].box - b[1].box || b[1].lapses - a[1].lapses)
      .slice(0, goal - reviewItems.length - newOnes.length)
      .map(([id]) => ITEMS_BY_ID.get(id)!);
    reviewItems = [...reviewItems, ...weakest];
  }

  // Alternate new and review material, then work through it in small chunks:
  // teach the new items in a chunk, quiz that chunk, move on. Front-loading all
  // the teaching would mean ten cards to read before a single question.
  const queue: { item: Item; isNew: boolean }[] = [];
  const pendingNew = [...newOnes];
  const pendingReview = [...reviewItems];
  while (pendingNew.length || pendingReview.length) {
    const next = pendingNew.shift();
    if (next) queue.push({ item: next, isNew: true });
    const review = pendingReview.shift();
    if (review) queue.push({ item: review, isNew: false });
  }

  const steps: Step[] = [];
  for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
    const chunk = queue.slice(i, i + CHUNK_SIZE);
    for (const { item, isNew } of chunk) {
      if (isNew) steps.push({ kind: "teach", item });
    }
    steps.push(
      ...shuffle(
        chunk.map(({ item, isNew }) =>
          exerciseFor(item, isNew ? 0 : (p.cards[item.id]?.box ?? 0), canListen),
        ),
      ),
    );
  }

  return {
    steps,
    itemIds: queue.map((q) => q.item.id),
    newCount: newOnes.length,
    reviewCount: reviewItems.length,
  };
}

// -------------------------------------------------------------- answer check

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\b(a|an|the|to)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Accepted written answers for an item: English, its alternates, and romaji. */
export function acceptedAnswers(item: Item): string[] {
  return [item.en, ...(item.alt ?? []), item.romaji];
}

/** The assembled pieces are correct when they rebuild the written phrase. */
export function checkOrder(item: Item, given: string[]): boolean {
  return given.join("") === item.ja;
}

export function checkTyped(item: Item, input: string): boolean {
  const given = normalize(input);
  if (!given) return false;
  return acceptedAnswers(item).some((a) => normalize(a) === given);
}
