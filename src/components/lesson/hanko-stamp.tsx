"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

const MATCHA = "#4caf50";
const TORII = "#e53935";
const PAPER = "#fdfbf7";

/** Two side bursts, angled inward, so nothing fires straight at the reader. */
export function celebrate() {
  const shared = { particleCount: 60, spread: 70, startVelocity: 42, ticks: 220, scalar: 0.95, colors: [MATCHA, TORII, PAPER, "#2e7d32"] };
  confetti({ ...shared, origin: { x: 0.1, y: 0.75 }, angle: 60 });
  confetti({ ...shared, origin: { x: 0.9, y: 0.75 }, angle: 120 });
  window.setTimeout(() => {
    confetti({ ...shared, particleCount: 40, origin: { x: 0.5, y: 0.55 }, angle: 90, spread: 100 });
  }, 220);
}

/**
 * The red seal pressed at the end of a session. It lands with a slight
 * overshoot and a small rotation, the way a real hanko goes down off-square.
 */
export function HankoStamp({ celebrateOnMount = false }: { celebrateOnMount?: boolean }) {
  useEffect(() => {
    if (!celebrateOnMount) return;
    // Let the stamp land first, then throw the confetti.
    const id = window.setTimeout(celebrate, 260);
    return () => window.clearTimeout(id);
  }, [celebrateOnMount]);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -32, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1], rotate: [-32, -6, -9], opacity: 1 }}
      transition={{ duration: 0.62, times: [0, 0.6, 1], ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      aria-hidden
    >
      <svg width="132" height="132" viewBox="0 0 100 100" className="drop-shadow-sm">
        <defs>
          {/* Roughens the seal edge so it reads as pressed ink, not a vector circle. */}
          <filter id="hanko-ink">
            <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="3" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" />
          </filter>
        </defs>
        <g filter="url(#hanko-ink)" fill="none" stroke={TORII} strokeWidth="6">
          <rect x="7" y="7" width="86" height="86" rx="20" />
        </g>
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill={TORII}
          fontSize="46"
          fontWeight="700"
          fontFamily="var(--font-jp)"
          filter="url(#hanko-ink)"
        >
          完
        </text>
      </svg>
    </motion.div>
  );
}
