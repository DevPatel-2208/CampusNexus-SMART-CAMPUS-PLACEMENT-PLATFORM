import confetti from 'canvas-confetti';

/** True when the user prefers reduced motion (OS/browser setting). */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Guard confetti bursts so React re-renders / Strict Mode never double-fire. */
let burstGuard = false;

/**
 * Fire a single, short confetti burst. Respects prefers-reduced-motion.
 * @param {object} opts
 * @param {'normal'|'small'} opts.intensity - 'normal' for first-time/reset, 'small' for returning users.
 */
export function fireConfetti({ intensity = 'normal' } = {}) {
  if (prefersReducedMotion()) return;
  if (burstGuard) return;
  burstGuard = true;
  setTimeout(() => { burstGuard = false; }, 1500);

  const count = intensity === 'small' ? 50 : 130;
  const spread = intensity === 'small' ? 50 : 90;
  const brand = ['#4f46e5', '#7c3aed', '#0f9d6b', '#fbbf24'];

  try {
    confetti({
      particleCount: count,
      spread,
      origin: { x: 0.5, y: 0.28 },
      colors: brand,
      ticks: 220,
      disableForReducedMotion: true,
      scalar: 1.1,
    });
  } catch (error) {
    // Confetti is decorative; unsupported canvas APIs should not break login.
    burstGuard = false;
    return;
  }

  // Two companion bursts for a fuller, premium celebration.
  setTimeout(() => {
    if (prefersReducedMotion()) return;
    try {
      confetti({
        particleCount: Math.floor(count / 2),
        spread: spread * 0.7,
        origin: { x: 0.32, y: 0.34 },
        colors: ['#4f46e5', '#7c3aed'],
        ticks: 160,
        disableForReducedMotion: true,
        scalar: 0.9,
      });
      confetti({
        particleCount: Math.floor(count / 2),
        spread: spread * 0.7,
        origin: { x: 0.68, y: 0.34 },
        colors: ['#0f9d6b', '#fbbf24'],
        ticks: 160,
        disableForReducedMotion: true,
        scalar: 0.9,
      });
    } catch { /* Decorative animation only. */ }
  }, 120);
}
