"use client";

/**
 * Feedback tones, synthesised rather than shipped as audio files — the app
 * already leans on the browser for Japanese speech, and a handful of short
 * cues cost nothing to generate but a few kilobytes to download.
 *
 * Everything is built from the yo scale, the pentatonic that most Japanese
 * folk music sits in, so the cues sound related to each other and to the
 * subject. Levels are deliberately low: these play many times a session and
 * should sit under the interface rather than announce themselves.
 */

/** Yo scale on D, plus the octave — the pool every cue draws from. */
const D4 = 293.66;
const A4 = 440.0;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880.0;
const B5 = 987.77;
const D6 = 1174.66;
/** Below the scale, used only for the softened "not quite". */
const G4 = 392.0;
const EB4 = 311.13;

type Voice = {
  freq: number;
  /** Seconds after the cue starts. */
  at: number;
  length: number;
  gain: number;
  type?: OscillatorType;
};

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
 * Schedules a set of voices through one shared low-pass. Every failure path is
 * swallowed: audio is a flourish and must never interfere with a lesson.
 */
function play(voices: Voice[], filterHz: number) {
  const ctx = getContext();
  if (!ctx) return;

  // A context created before any gesture starts suspended and stays that way
  // until resumed. Cues are always reached from a click or keypress, which is
  // what lets this succeed.
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  try {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterHz;
    filter.connect(ctx.destination);

    const start = ctx.currentTime;
    let last: OscillatorNode | null = null;
    let lastEnd = 0;

    for (const voice of voices) {
      const at = start + voice.at;
      const osc = ctx.createOscillator();
      osc.type = voice.type ?? "triangle";
      osc.frequency.value = voice.freq;

      const gain = ctx.createGain();
      // Ramped at both edges so notes have no click.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(voice.gain, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + voice.length);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(at);
      osc.stop(at + voice.length + 0.02);

      if (voice.at + voice.length >= lastEnd) {
        lastEnd = voice.at + voice.length;
        last = osc;
      }
    }

    // Nodes are collected once stopped; release the filter with the last voice.
    if (last) last.onended = () => filter.disconnect();
  } catch {
    // Ignore — a missing chime is never worth breaking a lesson over.
  }
}

/** A rising fifth. Reads as resolved rather than merely loud. */
export function playCorrect() {
  play(
    [
      { freq: E5, at: 0, length: 0.28, gain: 0.16 },
      { freq: B5, at: 0.075, length: 0.28, gain: 0.16 },
    ],
    3200,
  );
}

/**
 * A falling minor third on a sine, filtered down and quieter than the correct
 * chime. This is a shrug, not a buzzer — the feedback panel already carries the
 * correction, and the sound only needs to mark that something changed.
 */
export function playWrong() {
  play(
    [
      { freq: G4, at: 0, length: 0.34, gain: 0.13, type: "sine" },
      { freq: EB4, at: 0.085, length: 0.44, gain: 0.12, type: "sine" },
    ],
    1400,
  );
}

/**
 * The daily goal. A pentatonic run up to a held octave over a soft root and
 * fifth, so it lands as a small piece of music rather than a jingle.
 */
export function playCelebrate() {
  play(
    [
      { freq: D4, at: 0, length: 1.3, gain: 0.07, type: "sine" },
      { freq: A4, at: 0.02, length: 1.25, gain: 0.05, type: "sine" },
      { freq: D5, at: 0, length: 0.5, gain: 0.12 },
      { freq: E5, at: 0.07, length: 0.5, gain: 0.12 },
      { freq: G5, at: 0.14, length: 0.5, gain: 0.12 },
      { freq: A5, at: 0.21, length: 0.5, gain: 0.12 },
      { freq: B5, at: 0.28, length: 0.5, gain: 0.12 },
      { freq: D6, at: 0.36, length: 1.1, gain: 0.15 },
    ],
    4200,
  );
}

/**
 * Finishing an extra set once the goal is already met. The same shape as the
 * celebration but three notes and no pad, so repeat practice is acknowledged
 * without pretending it is the main event.
 */
export function playFlourish() {
  play(
    [
      { freq: D5, at: 0, length: 0.4, gain: 0.12 },
      { freq: G5, at: 0.07, length: 0.4, gain: 0.12 },
      { freq: A5, at: 0.14, length: 0.55, gain: 0.13 },
    ],
    3400,
  );
}
