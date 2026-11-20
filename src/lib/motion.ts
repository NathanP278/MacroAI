export type TransitionDirection = "forward" | "backward" | null;

/**
 * Triggers a subtle tactile vibration on supported mobile devices while
 * respecting the user's reduced-motion preference.
 */
export function triggerHaptic(durationMs = 10): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  try {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignore vibration permission / sandbox failures
  }
}

/**
 * Executes a DOM/state update inside document.startViewTransition when supported
 * (outside test environments), tagging html[data-transition-direction] for
 * directional animations.
 */
export function runViewTransition(
  updateCb: () => void,
  options?: { direction?: TransitionDirection }
): void {
  const isTestEnv =
    typeof process !== "undefined" && Boolean(process.env?.VITEST);
  const doc = typeof document !== "undefined" ? (document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  }) : null;

  if (!doc || isTestEnv || typeof doc.startViewTransition !== "function") {
    updateCb();
    return;
  }

  const root = doc.documentElement;
  if (options?.direction) {
    root.dataset.transitionDirection = options.direction;
  } else {
    delete root.dataset.transitionDirection;
  }

  try {
    const transition = doc.startViewTransition(() => {
      updateCb();
    });
    transition?.finished
      ?.catch(() => {})
      .finally(() => {
        delete root.dataset.transitionDirection;
      });
  } catch {
    delete root.dataset.transitionDirection;
    updateCb();
  }
}
