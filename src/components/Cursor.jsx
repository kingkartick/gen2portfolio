import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../store';

/* Custom cursor: a hot neon dot that sticks to the pointer and a lazy
   ring that eases after it. Any element carrying [data-cursor="LABEL"]
   (or any <a>/<button>) swells the ring and prints the label inside it.
   Hidden entirely on coarse (touch) pointers via CSS. */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dotX = gsap.quickTo(dot.current, 'x', { duration: 0.08, ease: 'power2.out' });
    const dotY = gsap.quickTo(dot.current, 'y', { duration: 0.08, ease: 'power2.out' });
    const ringX = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3.out' });

    let seen = false;
    const onMove = (e) => {
      if (!seen) {
        // both elements boot parked at 0,0 — only show them once the
        // pointer has a real position, snapped there without easing
        seen = true;
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY, opacity: 1 });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const onOver = (e) => {
      const target = e.target.closest('[data-cursor], a, button');
      if (!target) return;
      ring.current.classList.add('is-hover');
      ring.current.dataset.label = target.dataset.cursor || '';
    };
    const onOut = (e) => {
      const target = e.target.closest('[data-cursor], a, button');
      if (!target) return;
      ring.current.classList.remove('is-hover');
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dot} />
      <div className="cursor-ring" ref={ring} />
    </>
  );
}
