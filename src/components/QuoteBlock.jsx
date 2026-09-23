import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../store';

gsap.registerPlugin(ScrollTrigger);

const strip = (w) => w.toLowerCase().replace(/[^\w']/g, '');

/* Editorial pull-quote over the void.
   · the whole block drifts up through the viewport while scaling
     0.86 → 1.06, scrubbed 1:1 to scroll, and the portrait runs its own
     slow parallax so the section never sits dead still,
   · the reveal plays once, in sequence: the portrait wipes in
     bottom-to-top and the card settles from its tilt FIRST — only after
     the image has landed do the quote words rise out of their overflow
     masks, followed by the byline; words listed in `accent` resolve in
     the accent colour,
   · afterwards the card hovers on a slow sine float and the scientist's
     surname ghosts across the back in huge outline type, drifting
     sideways at its own parallax rate. */
export default function QuoteBlock({ img, alt, quote, by, role, meta, accent = [] }) {
  const root = useRef(null);
  const surname = by.split(' ').pop();

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const inner = root.current.querySelector('.quote-inner');
      const card = root.current.querySelector('.quote-card');
      const image = root.current.querySelector('.quote-portrait');
      const words = gsap.utils.toArray('.quote-word', root.current);
      const byline = root.current.querySelector('.quote-by');

      // Initial states live in JS (not CSS) so reduced-motion users and
      // no-JS crawlers always see the content.
      gsap.set(image, { clipPath: 'inset(100% 0 0 0)', scale: 1.25 });
      gsap.set(card, { rotation: -7 });
      gsap.set(words, { yPercent: 120 });
      gsap.set(byline, { opacity: 0, y: 20 });

      // 1 — the float through the void (full traverse, scrubbed)
      gsap.fromTo(
        inner,
        { yPercent: 16, scale: 0.86 },
        {
          yPercent: -16,
          scale: 1.06,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );

      // 2 — the sequenced reveal: image lands first, then the words rise,
      //     then the byline. Plays once on entry, reverses on the way out.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });
      tl.to(image, { clipPath: 'inset(0% 0 0 0)', scale: 1, duration: 1.1, ease: 'power4.inOut' })
        .to(card, { rotation: -1.5, duration: 1.1, ease: 'power3.out' }, 0)
        .to(words, { yPercent: 0, stagger: 0.035, duration: 0.7, ease: 'power3.out' }, 0.95)
        .to(byline, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '>-0.25');

      // 3 — slow portrait parallax across the whole section…
      gsap.fromTo(
        image,
        { y: -16 },
        {
          y: 16,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
      // …plus an idle hover so the card never sits dead still
      gsap.to(card, { y: 12, duration: 3.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });

      // 4 — the ghost surname drifts sideways at its own rate
      gsap.fromTo(
        root.current.querySelector('.quote-ghost'),
        { xPercent: 5 },
        {
          xPercent: -5,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex min-h-[130svh] items-center overflow-hidden px-5 md:px-10"
    >
      <span className="quote-ghost" aria-hidden="true">
        {surname}
      </span>
      <div className="quote-inner mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-[260px_1fr] md:gap-16">
        <figure className="quote-card mx-auto w-48 md:w-full">
          <div className="quote-photo">
            <img className="quote-portrait block w-full" src={img} alt={alt} loading="lazy" />
          </div>
          <figcaption className="quote-card-meta">
            <span>{meta}</span>
            <span className="quote-card-dot" aria-hidden="true" />
          </figcaption>
        </figure>
        <div>
          <blockquote className="quote-text">
            <span className="quote-mark" aria-hidden="true">
              “
            </span>
            {quote.split(' ').map((w, i) => (
              <span className="word-mask" key={i}>
                <span className={`quote-word${accent.includes(strip(w)) ? ' quote-accent' : ''}`}>
                  {w}
                </span>
              </span>
            ))}
            <span className="quote-mark" aria-hidden="true">
              ”
            </span>
          </blockquote>
          <div className="quote-by mt-9">
            <span className="quote-by-name">— {by}</span>
            {role && <span className="quote-by-role">{role}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
