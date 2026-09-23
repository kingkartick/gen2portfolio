import gsap from 'gsap';

/* Splits an element's text into per-character spans, each wrapped in an
   overflow-hidden mask so the glyphs can rise into view. Idempotent —
   safe under StrictMode's double-mounted effects. */
export function splitChars(el) {
  if (!el) return [];
  if (!el._chars) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    el._chars = [...text].map((ch) => {
      const mask = document.createElement('span');
      mask.className = 'char-mask';
      mask.setAttribute('aria-hidden', 'true');
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch === ' ' ? ' ' : ch;
      mask.appendChild(c);
      el.appendChild(mask);
      return c;
    });
  }
  return el._chars;
}

/* Masked per-character rise, scrubbed in by scroll. Call inside a
   gsap.context so it reverts with the component. */
export function charReveal(el, trigger, vars = {}) {
  const chars = splitChars(el);
  if (!chars.length) return null;
  return gsap.from(chars, {
    yPercent: 115,
    rotation: 6,
    transformOrigin: '0% 100%',
    stagger: 0.04,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: trigger || el,
      start: 'top 78%',
      toggleActions: 'play none none reverse',
    },
    ...vars,
  });
}

/* Anime title-card slam. Each character crashes down oversized and
   rotated, squashes on touchdown, elastic-settles; on the final
   touchdown the whole line shakes and an accent slash sweeps in
   underneath. Call inside a gsap.context. */
export function impactReveal(el, trigger, st = {}) {
  const chars = splitChars(el);
  if (!chars.length) return null;
  el.classList.add('impact');

  // accent slash under the line (created once, survives StrictMode remounts)
  if (!el._slash) {
    const s = document.createElement('span');
    s.className = 'impact-slash';
    s.setAttribute('aria-hidden', 'true');
    el.appendChild(s);
    el._slash = s;
  }

  const stag = 0.055;
  const drop = 0.34; // per-char fall time
  const land = drop + (chars.length - 1) * stag; // last touchdown

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: trigger || el,
      start: 'top 75%',
      toggleActions: 'play none none reverse',
      ...st,
    },
  });

  tl.from(chars, {
    yPercent: -180,
    scale: 2.7,
    opacity: 0,
    rotation: () => gsap.utils.random(-18, 18),
    transformOrigin: '50% 100%',
    duration: drop,
    ease: 'power3.in',
    stagger: stag,
  })
    // squash exactly as each char touches down…
    .to(
      chars,
      { scaleY: 0.68, scaleX: 1.22, duration: 0.08, ease: 'power2.out', stagger: stag },
      drop
    )
    // …then spring back to shape
    .to(
      chars,
      { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1.7, 0.38)', stagger: stag },
      drop + 0.08
    )
    // ground-shake on the final touchdown
    .to(
      el,
      {
        keyframes: [{ x: -7 }, { x: 6 }, { x: -4 }, { x: 2 }, { x: 0 }],
        duration: 0.35,
        ease: 'power2.out',
      },
      land
    )
    // accent slash sweeps underneath
    .fromTo(
      el._slash,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.5, ease: 'power4.out' },
      land + 0.05
    );

  return tl;
}
