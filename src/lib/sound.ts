"use client";

/**
 * Feedback tones, synthesised rather than shipped as audio files — the app
 * already leans on the browser for Japanese speech, and a two-note chime costs
 * nothing to generate but a few kilobytes to download.
 *
 * The tone is a rising perfect fifth on a triangle wave: warm, short, and
 * pitched to sit under the interface rather than announce itself. It plays up
 * to ten times a session, so it is deliberately understated.
 */

const NOTE_GAP_S = 0.075;
const NOTE_LENGTH_S = 0.28;
const PEAK_GAIN = 0.16;
/** E5 then B5 — a fifth apart, which reads as resolved rather than merely loud. */
const CORRECT_NOTES = [659.25, 987.77];

let context: AudioContext | null = null;

type WindowWithAudio = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;

  const w = window as WindowWithAudio;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;

  try {
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

export function isSoundAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithAudio;
  return Boolean(w.AudioContext ?? w.webkitAudioContext);
}

/**
 * Plays the correct-answer chime. Safe to call from anywhere: it is always
 * reached from a click or keypress, which is what lets the audio context start
 * under browser autoplay rules.
 */
export function playCorrect() {
  const ctx = getContext();
  if (!ctx) return;

  // A context created before any gesture starts suspended, and stays that way
  // until resumed. Calling this from a handler is what unblocks it.
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  try {
    // One shared filter per play takes the edge off the triangle's harmonics.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    filter.connect(ctx.destination);

    const start = ctx.currentTime;
    for (const [i, frequency] of CORRECT_NOTES.entries()) {
      const at = start + i * NOTE_GAP_S;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = frequency;

      const gain = ctx.createGain();
      // Ramp rather than switch on, so the note has no click at its edges.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_LENGTH_S);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(at);
      osc.stop(at + NOTE_LENGTH_S + 0.02);
      // Nodes are collected once stopped; drop the filter with the last note.
      if (i === CORRECT_NOTES.length - 1) {
        osc.onended = () => filter.disconnect();
      }
    }
  } catch {
    // Audio is a flourish — never let it break answering a question.
  }
}
