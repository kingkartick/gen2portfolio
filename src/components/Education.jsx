import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars } from '../fx';
import { prefersReducedMotion } from '../store';

gsap.registerPlugin(ScrollTrigger);

/* Pinned scrollytelling chapter. While the viewport is held, scrubbing
   assembles the section piece by piece: the word EDUCATION crashes in
   character-by-character from scattered positions, then the IIT Madras
   ID card and the stage photo fly in from the wings, then the degree
   copy resolves. Scrolling back disassembles it in reverse. */
export default function Education() {
  const root = useRef(null);
  const title = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const chars = splitChars(title.current);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=170%',
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.from(chars, {
        y: () => gsap.utils.random(-340, 340),
        x: () => gsap.utils.random(-240, 240),
        rotation: () => gsap.utils.random(-100, 100),
        scale: () => gsap.utils.random(1.6, 3),
        opacity: 0,
        ease: 'power2.out',
        stagger: { each: 0.06, from: 'random' },
        duration: 1.2,
      })
        .from(
          '.edu-photo--id',
          { xPercent: -140, rotation: -14, opacity: 0, ease: 'power2.out', duration: 0.9 },
          '-=0.35'
        )
        .from(
          '.edu-photo--stage',
          { xPercent: 140, rotation: 12, opacity: 0, ease: 'power2.out', duration: 0.9 },
          '<0.12'
        )
        .from('.edu-info > *', { y: 60, opacity: 0, stagger: 0.12, duration: 0.55 }, '-=0.4')
        // settle beat: photos breathe apart so the pin never feels parked
        .to('.edu-photo--id', { y: -26, rotation: -3, duration: 0.8, ease: 'none' })
        .to('.edu-photo--stage', { y: 26, rotation: 3, duration: 0.8, ease: 'none' }, '<');
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="Education" ref={root} className="relative">
      <div className="relative flex h-svh flex-col justify-center overflow-hidden px-5 md:px-10">
        {/* corner HUD — same framing as the hero and the other chapters */}
        <div className="hud absolute top-5 right-5 hidden md:top-7 md:right-10 md:block">
          Chapter 01 <span className="text-dim">/ 03</span>
        </div>
        <div className="eyebrow mb-4">Chapter 01 — Foundation</div>

        <h2 ref={title} className="impact !text-[clamp(3.2rem,13vw,13rem)]" aria-label="Education">
          Education
        </h2>

        <div className="mt-8 grid items-start gap-8 md:mt-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="edu-info max-w-md">
            <p className="font-grotesk text-xl leading-snug text-bone md:text-2xl">
              Bachelor of Science —{' '}
              <span className="text-neon">Data Science &amp; Applications</span>
            </p>
            <p className="hud mt-4 normal-case !tracking-[0.1em]">
              Indian Institute of Technology, Madras
            </p>
            <p className="hud mt-2 !text-dim normal-case !tracking-[0.1em]">
              Currently pursuing · Chennai, India
            </p>
          </div>

          <figure className="edu-photo edu-photo--id edu-card aspect-[3/2] max-h-[34vh] p-2">
            <img src="/assets/idCard.png" alt="IIT Madras student ID card with institute crest" loading="lazy" />
          </figure>

          <figure className="edu-photo edu-photo--stage edu-card aspect-[3/2] max-h-[34vh] p-2 md:translate-y-10">
            <img src="/assets/meStage.jpg" alt="On stage at IIT Madras" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  );
}
