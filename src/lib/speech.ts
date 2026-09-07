"use client";

/**
 * Japanese text-to-speech via the browser's built-in speech synthesis. There is
 * no audio to ship and no API to pay for, but voice availability varies by
 * platform, so every caller must handle `isSpeechAvailable() === false`.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return voices.find((v) => v.lang?.toLowerCase().startsWith("ja")) ?? null;
}

export function isSpeechAvailable(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  if (cachedVoice === undefined) cachedVoice = pickJapaneseVoice();
  return cachedVoice !== null;
}

/** Resolves once the voice list has loaded, which is async on most browsers. */
export function whenVoicesReady(callback: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  const handler = () => {
    cachedVoice = pickJapaneseVoice();
    callback();
  };
  // Some browsers populate voices synchronously, others only after the event.
  cachedVoice = pickJapaneseVoice();
  if (cachedVoice) callback();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
}

export type SpeakOptions = {
  rate?: number;
  /** Fires when audio actually begins, for playback-synced UI. */
  onStart?: () => void;
  /** Fires on end, error, or when another utterance interrupts this one. */
  onEnd?: () => void;
};

export function speak(text: string, { rate = 0.85, onStart, onEnd }: SpeakOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  if (cachedVoice === undefined) cachedVoice = pickJapaneseVoice();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = rate;
  if (cachedVoice) utterance.voice = cachedVoice;

  // `end` does not always fire when an utterance is cancelled mid-flight, so
  // guard against the caller being left with a ripple that never stops.
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onEnd?.();
  };
  utterance.onstart = () => onStart?.();
  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  // Safety net: some engines drop the end event entirely.
  const estimateMs = Math.min(12_000, 900 + text.length * 220);
  window.setTimeout(finish, estimateMs);
}
