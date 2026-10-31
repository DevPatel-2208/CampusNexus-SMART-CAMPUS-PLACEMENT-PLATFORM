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
    safeConfetti({
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
      safeConfetti({
        particleCount: Math.floor(count / 2),
        spread: spread * 0.7,
        origin: { x: 0.32, y: 0.34 },
        colors: ['#4f46e5', '#7c3aed'],
        ticks: 160,
        disableForReducedMotion: true,
        scalar: 0.9,
      });
      safeConfetti({
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


function safeConfetti(opts) {
  try {
    const shoot = typeof confetti === 'function' ? confetti : confetti?.default;
    if (typeof shoot === 'function') {
      shoot(opts);
    }
  } catch (err) {
    console.warn('Confetti animation error:', err);
  }
}


/**
 * Multi-cannon grand celebration for passed assessments.
 */
export function firePassConfetti() {
  safeConfetti({
    particleCount: 85,
    spread: 75,
    origin: { x: 0.12, y: 0.55 },
    colors: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'],
    zIndex: 10005,
  });

  safeConfetti({
    particleCount: 85,
    spread: 75,
    origin: { x: 0.88, y: 0.55 },
    colors: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'],
    zIndex: 10005,
  });

  setTimeout(() => {
    safeConfetti({
      particleCount: 110,
      spread: 105,
      origin: { x: 0.5, y: 0.35 },
      colors: ['#4f46e5', '#10b981', '#fbbf24', '#38bdf8', '#8b5cf6'],
      zIndex: 10005,
    });
  }, 280);
}
