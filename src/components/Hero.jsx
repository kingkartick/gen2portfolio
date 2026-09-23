import { useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore, prefersReducedMotion } from '../store';
import { scrollToAnchor } from '../anchors';
import Magnetic from './Magnetic';
import { I } from './icons';

gsap.registerPlugin(ScrollTrigger);

/* ---------- data ---------- */

const NAV_LINKS = [
  { label: 'Portfolio', num: '01', to: 0 },
  { label: 'About', num: '02', to: '#Education' },
  { label: 'Projects', num: '03', to: '#Projects' },
  { label: 'Awards', num: '04', to: '#Achievements' },
  { label: 'Contact', num: '05', to: '#Contact' },
];

const STACK = [
  { icon: I.layers, title: 'TensorFlow' },
  { icon: I.chat, title: 'LLMs' },
  { icon: I.sparkles, title: 'Diffusion Models' },
  { icon: I.bolt, title: 'FastAPI' },
  { icon: I.cloud, title: 'AWS' },
];

const SOCIALS = [
  { name: 'GitHub', href: 'https://github.com/', icon: I.github },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/', icon: I.linkedin },
  {
    name: 'Email',
    href: 'mailto:sharmakartick512@gmail.com?subject=Consultation%20Inquiry',
    icon: I.mail,
  },
];

/* Lenis owns the scroller — native anchor jumps would desync it. Routed
   through the shared resolver so a nav entry can point at a Projects card
   (whose scroll position has to be computed, not measured) exactly the
   way it points at a section. */
function goTo(e, to) {
  e.preventDefault();
  scrollToAnchor(to === 0 ? 'top' : to);
}

export default function Hero() {
  const root = useRef(null);
  const loaded = useStore((s) => s.loaded);

  // Entrance choreography — fires the moment the preloader lifts.
  // The Q/K/V card fan IS the hero; the DOM frames it on the edges.
  useEffect(() => {
    if (!loaded || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .from('.hero-nav', { y: -26, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.1)
        .from(
          '.hero-left > *',
          { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out' },
          0.25
        )
        .from(
          '.hero-hud > *',
          { y: 20, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' },
          0.6
        );
    }, root);
    return () => ctx.revert();
  }, [loaded]);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // identity block sinks and dims as you leave — the cards take over
      gsap.to('.hero-left', {
        yPercent: -24,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <header ref={root} className="relative flex h-svh flex-col overflow-hidden">
      {/* nav */}
      <nav className="hero-nav flex items-center justify-between gap-6 px-5 py-5 md:px-10 md:py-6">
        <a href="/" onClick={(e) => goTo(e, 0)} className="flex items-center gap-3" data-cursor="TOP">
          <span className="logo-mark">
            K<i>/</i>
          </span>
          <span className="hud !text-bone !tracking-[0.34em]">Kartick</span>
        </a>

        <div className="hidden items-start gap-9 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.to === 0 ? '/' : l.to} onClick={(e) => goTo(e, l.to)} className="nav-link">
              {l.label}
              <span>{l.num}</span>
            </a>
          ))}
        </div>

        <Magnetic>
          <a
            href="mailto:sharmakartick512@gmail.com?subject=Consultation%20Inquiry"
            className="btn-pill !px-6 !py-3"
            data-cursor="SAY HI"
          >
            <span className="btn-fill" aria-hidden="true" />
            <span>Contact me</span>
            <span>↗</span>
          </a>
        </Magnetic>
      </nav>

      {/* middle band — one job: identity + one line + one way into the
          work. The scene owns the rest of the viewport. */}
      <div className="hero-band relative flex flex-1 items-center px-5 md:px-10">
        {/* soft scrim so the identity block stays readable over the card
            fan's glow — an overlay, the scene isn't touched */}
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-left relative max-w-xl">
          <div className="eyebrow mb-6">AI &amp; LLM Engineer</div>
          <h1 className="hero-name">Kartick</h1>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            {STACK.map((s) => (
              <span key={s.title} className="hero-stack-item">
                <span className="stack-icon">{s.icon}</span>
                <span>{s.title}</span>
              </span>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-7">
            <Magnetic strength={0.35}>
              <a
                href="#Projects"
                onClick={(e) => goTo(e, '#Projects')}
                className="hero-btn hero-btn--primary"
                data-cursor="WORK"
              >
                <span>View my work</span>
                <span>↗</span>
              </a>
            </Magnetic>
            <a
              href="/assets/Kartick-Sharma-Resume.txt"
              download="Kartick-Sharma-Resume.txt"
              className="proj-link"
              data-cursor="GET"
            >
              Résumé <span>↓</span>
            </a>
          </div>
        </div>
      </div>

      {/* bottom — HUD row only; stats + stack live below the fold now */}
      <div className="px-5 pb-5 md:px-10">
        <div className="hero-hud flex items-center justify-between">
          <div className="hud flex items-center gap-3">
            <span className="loc-dot" />
            <span className="hidden sm:inline">Located in India · IST</span>
            <span className="sm:hidden">India · IST</span>
          </div>
          <div className="hud hidden md:block">
            Scroll to explore <span className="scroll-arrow">↓</span>
          </div>
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <Magnetic key={s.name} strength={0.4}>
                <a
                  className="icon-btn"
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  aria-label={s.name}
                  data-cursor="VISIT"
                >
                  {s.icon}
                </a>
              </Magnetic>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
