import { create } from 'zustand';

/* Bridges the asset-loading layer (high-frequency) and the DOM
   without flooding React with re-renders. */
export const useStore = create((set) => ({
  progress: 0,
  loaded: false,
  setProgress: (p) => set({ progress: p }),
  setLoaded: () => set({ loaded: true }),
}));

/* Transient scroll state, written by Lenis at scroll frequency and
   polled per-frame by the WebGL background / marquee / card lean.
   Deliberately a plain object (not reactive state) so 60–120Hz
   updates never touch the React reconciler. */
export const scrollState = {
  velocity: 0, // raw, from Lenis (px/frame-ish, erratic)
  smooth: 0, // damped + clamped — safe to drive visuals with
  progress: 0, // 0..1 through the whole page
};

/* Live Lenis instance so far-away components (e.g. the lightbox)
   can stop/start the smooth scroller without prop drilling. */
let _lenis = null;
export const setLenis = (l) => (_lenis = l);
export const getLenis = () => _lenis;

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
