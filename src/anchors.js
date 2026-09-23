import { getLenis, prefersReducedMotion } from './store';

/* Deep-link anchors.

   Most sections resolve the obvious way: find the element, take its
   document offset. The Projects reel cannot. Its cards live inside a
   GSAP-pinned track that travels HORIZONTALLY while the page scrolls
   vertically, so every card reports the same document position and a
   native #hash jump lands on the pin's first frame no matter which card
   you asked for. Projects therefore registers its own resolvers, which
   convert "card i centred" into the vertical scroll offset that puts it
   there.

   Anything registered here wins over a plain getElementById lookup. */

const resolvers = new Map();

export function registerAnchor(id, resolve) {
  resolvers.set(id, resolve);
  return () => {
    // only clear if we still own the slot — a remount may have replaced it
    if (resolvers.get(id) === resolve) resolvers.delete(id);
  };
}

/* → document scrollY for an anchor, or null if nothing matches. */
export function resolveAnchor(id) {
  const key = String(id || '').replace(/^#/, '').trim();
  if (!key) return null;
  if (key.toLowerCase() === 'top') return 0;

  const resolve = resolvers.get(key) || resolvers.get(key.toLowerCase());
  if (resolve) {
    const y = resolve();
    if (Number.isFinite(y)) return Math.max(0, y);
  }

  let el = document.getElementById(key);
  if (!el) {
    // shared links get retyped by hand — tolerate #projects for id="Projects"
    const lower = key.toLowerCase();
    el = [...document.querySelectorAll('[id]')].find((n) => n.id.toLowerCase() === lower);
  }
  if (!el) return null;
  return Math.max(0, el.getBoundingClientRect().top + window.scrollY);
}

export function scrollToAnchor(id, { immediate = false } = {}) {
  const y = resolveAnchor(id);
  if (y === null) return false;

  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true } : { duration: 1.6 });
  else window.scrollTo({ top: y, behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' });
  return true;
}
