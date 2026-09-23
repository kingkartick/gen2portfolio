import { useRef, useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../store';
import { impactReveal } from '../fx';
import Lightbox from './Lightbox';

gsap.registerPlugin(ScrollTrigger);

/* The five distinct award scans from the original build, now labelled.
   (The orphan "Hackopitch Certificate.PNG" in assets/ is a duplicate
   scan of cert5 — same award, so it is intentionally not repeated.) */
const CERTS = [
  { src: '/assets/cert1.png', label: 'Vyomverse Hackathon · 1st Place — IIST' },
  { src: '/assets/cert2.png', label: 'Product Teardown · Winner — The Product Folks' },
  { src: '/assets/cert3.png', label: 'Ideathon 2024 · 1st Place — EDC' },
  { src: '/assets/cert4.png', label: 'Fresco Portfolio Comp · 3rd — IITM Paradox' },
  { src: '/assets/cert5.png', label: 'Hack-O-Pitch · Top 8 — IITM Paradox ’22' },
];

// final resting tilt of each card on the deck
const REST = [-4, 3, -2, 5, -1.5];

/* Pinned deck scrollytelling: the section holds the viewport while each
   certificate flies up from below the fold — rotated, oversized, heavy —
   and lands on the stack. Cards already on the deck sink, shrink and dim
   a step as each newcomer covers them. Only after the fifth card settles
   does the pin release and the page continue to the footer. Scrubbing
   back deals the deck out again in reverse. */
export default function Achievements() {
  const root = useRef(null);
  const counter = useRef(null);
  const [active, setActive] = useState(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      impactReveal(root.current.querySelector('.h-section'), root.current, {
        start: 'top 55%',
      });
      gsap.from('.ach-eyebrow', {
        x: -40,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 55%',
          toggleActions: 'play none none reverse',
        },
      });

      const cards = gsap.utils.toArray('.stack-card', root.current);
      const setCounter = counter.current
        ? gsap.quickSetter(counter.current, 'textContent')
        : () => {};

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: `+=${cards.length * 85}%`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const idx = Math.min(
              cards.length,
              Math.max(1, Math.ceil(self.progress * cards.length + 0.0001))
            );
            setCounter(`0${idx}`);
          },
        },
      });

      cards.forEach((card, i) => {
        // the newcomer flies in from below the viewport with rotational inertia
        tl.fromTo(
          card,
          {
            yPercent: 165,
            rotation: i % 2 ? 16 : -16,
            scale: 1.08,
          },
          {
            yPercent: 0,
            rotation: REST[i],
            scale: 1,
            duration: 1,
            ease: 'power2.out',
          },
          i
        );
        // …and everyone beneath takes a step down into the shadow
        if (i > 0) {
          tl.to(
            cards.slice(0, i),
            {
              scale: (idx) => 1 - (i - idx) * 0.04,
              yPercent: (idx) => -(i - idx) * 3.2,
              filter: (idx) => `brightness(${Math.max(0.35, 1 - (i - idx) * 0.22)})`,
              duration: 1,
              ease: 'power2.out',
            },
            i
          );
        }
      });
      // settle beat so the finished deck breathes before the pin releases
      tl.to({}, { duration: 0.5 });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="Achievements" ref={root} className="relative">
      <div className="flex h-svh flex-col overflow-hidden px-5 pt-16 md:px-10 md:pt-20">
        <div className="flex items-end justify-between">
          <div>
            <div className="ach-eyebrow eyebrow mb-4">Chapter 03 — Recognition</div>
            <h2 className="h-section impact !text-[clamp(2.6rem,8vw,7rem)]">Achievements</h2>
            {/* the cards are buttons into the lightbox, but the only hint
                was the desktop-cursor label + the md+ HUD line — say it out
                loud, since touch users get neither */}
            <div className="ach-hint hud mt-4 flex items-center gap-2.5">
              <span className="loc-dot" />
              <span className="sm:hidden">Tap any certificate to enlarge</span>
              <span className="hidden sm:inline">Click any certificate to view it full size</span>
            </div>
          </div>
          <div className="hud hidden pb-3 text-right md:block">
            <span className="proj-idx !text-[1.6rem]" ref={counter}>
              01
            </span>
            <span className="proj-idx !text-dim"> / 0{CERTS.length}</span>
            <div className="mt-1 !text-dim">scroll — the deck deals itself</div>
          </div>
        </div>

        {/* the deck */}
        <div className="relative mx-auto mt-6 w-full max-w-3xl flex-1 md:mt-8">
          <div className="stack-stage absolute inset-x-0 top-1/2 mx-auto aspect-[16/10] max-h-[62vh] w-full -translate-y-[54%]">
            {CERTS.map((c, i) => (
              <button
                key={c.src}
                className="stack-card ach-card"
                onClick={() => setActive(c)}
                data-cursor="VIEW"
                aria-label={c.label}
              >
                <img src={c.src} alt={c.label} loading="lazy" />
                <span className="ach-tag">
                  {String(i + 1).padStart(2, '0')} — {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Lightbox src={active?.src} alt={active?.label} onClose={() => setActive(null)} />
    </section>
  );
}
