import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../store';
import Magnetic from './Magnetic';
import { I } from './icons';

gsap.registerPlugin(ScrollTrigger);

/* NOTE: the original codebase only linked the social root domains —
   swap in the real profile URLs when Kartick provides the handles. */
const SOCIALS = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
      </svg>
    ),
  },
  {
    name: 'Twitter / X',
    href: 'https://twitter.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    href: 'https://github.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.38.82 1.11.82 2.24v3.32c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const root = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.footer-cta-wrap', {
        y: 90,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
      gsap.from('.footer-social', {
        y: 40,
        opacity: 0,
        scale: 0.7,
        stagger: 0.08,
        duration: 0.7,
        ease: 'back.out(2)',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });
      gsap.from('.footer-copy', {
        opacity: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: root.current,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <footer id="Contact" ref={root} className="relative flex min-h-svh flex-col justify-between px-5 pt-28 pb-8 md:px-10">
      <div className="footer-cta-wrap">
        <div className="eyebrow mb-6">Next — Your Project?</div>
        <Magnetic strength={0.12}>
          <a
            href="mailto:sharmakartick512@gmail.com?subject=Consultation%20Inquiry"
            className="footer-cta block"
            data-cursor="EMAIL"
          >
            Let’s build
            <br />
            <span className="stroke-type">something rare</span>{' '}
            <span className="text-neon">↗</span>
          </a>
        </Magnetic>
        <Magnetic strength={0.35}>
          <a
            href="mailto:sharmakartick512@gmail.com?subject=Consultation%20Inquiry"
            className="social-pill footer-mail mt-8"
            data-cursor="EMAIL"
          >
            <span className="btn-fill" aria-hidden="true" />
            <span className="social-icon">{I.mail}</span>
            <span>sharmakartick512@gmail.com</span>
          </a>
        </Magnetic>
        <p className="hud mt-4 normal-case !tracking-[0.12em] !text-dim">
          Usually replies within a day
        </p>
      </div>

      <div>
        <div className="flex flex-wrap gap-3 py-12 md:gap-4">
          {SOCIALS.map((s) => (
            <Magnetic key={s.name} strength={0.4}>
              <a
                className="social-pill footer-social"
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.name}
                data-cursor="VISIT"
              >
                <span className="btn-fill" aria-hidden="true" />
                <span className="social-icon">{s.icon}</span>
                <span>{s.name}</span>
              </a>
            </Magnetic>
          ))}
        </div>

        <div className="footer-copy flex flex-col justify-between gap-2 border-t border-[#17181f] pt-6 md:flex-row">
          <span className="hud">
            © {new Date().getFullYear()} CodingValue · Kartick Sharma
          </span>
          <span className="hud !text-dim">Vite + React + R3F + GSAP + Lenis</span>
        </div>
      </div>
    </footer>
  );
}
