export type UnitKind = "kana" | "vocab" | "phrase";

export type Unit = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  kind: UnitKind;
};

export type Item = {
  /** Stable id — never renumber these, progress is keyed on them. */
  id: string;
  unit: string;
  /** Written form as a learner would see it (kanji where natural). */
  ja: string;
  /** Kana reading. Equals `ja` for kana and katakana-only words. */
  kana: string;
  romaji: string;
  /** Primary English meaning, shown as the prompt/answer. */
  en: string;
  /** Extra English spellings accepted when typing. */
  alt?: string[];
  /**
   * The phrase broken into the pieces a learner assembles in the ordering
   * exercise. Joined, these must equal `ja`. Only present where the split is
   * natural and yields at least three pieces — two-piece phrases make for a
   * trivial puzzle, so those items simply never get the exercise.
   */
  chunks?: string[];
};
