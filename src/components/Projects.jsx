import { useRef, useLayoutEffect, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../store';
import { impactReveal } from '../fx';
import Lightbox from './Lightbox';

gsap.registerPlugin(ScrollTrigger);

/* Asset notes (mapped from the original codebase):
   · posters — the original had C2/C3 swapped between GalaxEye and Tynor;
     corrected here (C3 = NDVI map → GalaxEye, C2 = edge rig → Tynor).
   · certImg — the original's "orphan" scans (ljk/jkl;/jk.png) are the real
     per-company internship letters; using them fixes the original bug where
     GalaxEye and SolutionWise shared the same Google-Drive link. The Drive
     links that were verifiably distinct are kept as secondary actions. */
const PROJECTS = [
  {
    name: 'GalaxEye',
    role: 'Web Development Intern',
    video: '/assets/video1.mp4',
    poster: '/assets/C3.png',
    shots: ['/assets/C32.png', '/assets/galaxeye-ndvi-layers.jpg'],
    desc: 'Geospatial analytics built on Leaflet with NDVI vegetation-index layers — turning satellite raster data into actionable insight.',
    tags: ['Leaflet', 'Geospatial', 'NDVI', 'Data Viz'],
    certImg: '/assets/cert-galaxeye-letter.png',
    certDrive: 'https://drive.google.com/file/d/1hadL8-2L5wWjJvB909LRRZJzbNOuMSLt/view?usp=drive_link',
  },
  {
    name: 'Tynor',
    role: 'Industrial Eng. Intern',
    video: '/assets/video2.mp4',
    poster: '/assets/C2.png',
    shots: ['/assets/C22.png'],
    desc: 'Manufacturing defect detection with YOLO + TensorFlow Lite — real-time bounding-box inference on production components.',
    tags: ['YOLO', 'TensorFlow Lite', 'CV', 'Edge ML'],
    certImg: '/assets/cert-tynor-letter.png',
    certDrive: 'https://drive.google.com/file/d/1daRqA4CWhIySuj_OHAOutbU0PZbsMQs6/view?usp=drive_link',
  },
  {
    name: 'SolutionWise',
    role: 'Web Developer Intern',
    video: '/assets/video3.mp4',
    poster: '/assets/C1.png',
    shots: ['/assets/C12.png'],
    desc: 'Service-marketplace platform. Angular SPA frontend backed by a Strapi headless CMS, with a clean API-driven data architecture.',
    tags: ['Angular', 'Strapi', 'REST API', 'Cloud'],
    certImg: '/assets/cert-solutionwise-letter.png',
    certDrive: null, // original Drive link duplicated GalaxEye's — local scan is canonical
  },
];

export default function Projects() {
  const root = useRef(null);
  const track = useRef(null);
  const progress = useRef(null);
  const pinHead = useRef(null);
  const counter = useRef(null);
  const [active, setActive] = useState(null);

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      const el = track.current;
      const getX = () => -(el.scrollWidth - window.innerWidth);

      // quickTo pre-compiles the setters — the scroll hot path only retargets
      const panels = gsap.utils.toArray('.proj-panel', el);
      const leanTo = panels.map((c) =>
        gsap.quickTo(c, 'rotationY', { duration: 0.55, ease: 'power2.out' })
      );
      const setProgress = progress.current
        ? gsap.quickSetter(progress.current, 'scaleX')
        : () => {};

      const tween = gsap.to(el, {
        x: getX,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${el.scrollWidth - window.innerWidth}`,
          pin: true,
          scrub: 1.2, // the lag is the elasticity — panels catch up with weight
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setProgress(self.progress);
            // the big intro title slides away with the reel — this compact
            // pinned header takes over so you always know where you are
            if (pinHead.current) {
              pinHead.current.classList.toggle('is-on', self.progress > 0.045);
              const idx = Math.min(
                PROJECTS.length,
                Math.max(1, Math.ceil(self.progress * PROJECTS.length + 0.0001))
              );
              const label = `0${idx}`;
              if (counter.current && counter.current.textContent !== label) {
                counter.current.textContent = label;
              }
            }
            if (!reduced) {
              const lean = gsap.utils.clamp(-14, 14, self.getVelocity() / -240);
              leanTo.forEach((to) => to(lean));
            }
          },
          // never park a panel tilted when the pin releases
          onLeave: () => leanTo.forEach((to) => to(0)),
          onLeaveBack: () => leanTo.forEach((to) => to(0)),
        },
      });

      if (!reduced) {
        impactReveal(root.current.querySelector('.h-section'), root.current, {
          start: 'top 60%',
        });
        gsap.from(root.current.querySelector('.proj-eyebrow'), {
          x: -40,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
        });

        // panels surface from the right of the pinned traverse
        panels.forEach((panel) => {
          gsap.from(panel, {
            y: 90,
            opacity: 0,
            scale: 0.88,
            rotationZ: 2,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tween,
              start: 'left 92%',
              toggleActions: 'play none none reverse',
            },
          });
        });
      }

      return () => tween.kill();
    }, root);
    return () => ctx.revert();
  }, []);

  // Only the on-screen video decodes/plays — three concurrent
  // HTMLVideoElements would throttle the CPU during the scrub.
  useEffect(() => {
    const vids = root.current.querySelectorAll('video');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) target.play().catch(() => {});
          else target.pause();
        }),
      { threshold: 0.1 }
    );
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <section id="Projects" ref={root} className="relative">
      <div className="relative h-svh overflow-hidden">
        {/* persistent header — visible while the reel traverses */}
        <div
          ref={pinHead}
          className="proj-pin-head pointer-events-none absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-5 pt-5 md:px-10 md:pt-7"
          aria-hidden="true"
        >
          <div className="eyebrow">Chapter 02 — Projects</div>
          <div className="hud !text-bone">
            File <span ref={counter}>01</span>
            <span className="text-dim"> / 0{PROJECTS.length}</span>
          </div>
        </div>
        <div
          ref={track}
          className="flex h-full items-center gap-[6vw] pr-[10vw] pl-[6vw]"
          style={{ width: 'max-content', perspective: '1200px' }}
        >
          {/* intro block */}
          <div className="w-[74vw] shrink-0 md:w-[38vw]">
            <div className="proj-eyebrow eyebrow mb-5">Chapter 02 — Selected Work · 3 Internships</div>
            <h2 className="h-section impact">Projects</h2>
            <p className="hud mt-8 normal-case !tracking-[0.12em]">
              Scroll — the reel traverses sideways →
            </p>
          </div>

          {PROJECTS.map((p, i) => (
            <article
              key={p.name}
              className="proj-panel holo w-[86vw] shrink-0 md:w-[62vw]"
              style={{ willChange: 'transform' }}
            >
              <i className="holo-corner tl" aria-hidden="true" />
              <i className="holo-corner tr" aria-hidden="true" />
              <i className="holo-corner bl" aria-hidden="true" />
              <i className="holo-corner br" aria-hidden="true" />

              <div className="relative z-[1] grid gap-0 md:grid-cols-[1.25fr_1fr]">
                {/* media */}
                <div className="relative aspect-video overflow-hidden md:aspect-auto md:min-h-[52vh]">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={p.video}
                    poster={p.poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="proj-idx absolute top-4 left-4">
                    FILE 0{i + 1} / 0{PROJECTS.length} — {p.role}
                  </div>
                </div>

                {/* body */}
                <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
                  <div>
                    <h3 className="proj-name">{p.name}</h3>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-dim md:text-base">
                      {p.desc}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span className="tag-chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* secondary shots */}
                  <div className="flex gap-3">
                    {p.shots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setActive(s)}
                        className="edu-card h-16 w-24 overflow-hidden md:h-20 md:w-32"
                        data-cursor="ZOOM"
                        aria-label={`${p.name} screenshot`}
                      >
                        <img src={s} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <button
                      className="proj-link"
                      onClick={() => setActive(p.certImg)}
                      data-cursor="OPEN"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="6" />
                        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                      </svg>
                      Internship Certificate
                    </button>
                    {p.certDrive && (
                      <a
                        className="proj-link !text-dim"
                        href={p.certDrive}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor="DRIVE"
                      >
                        Drive ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* traverse progress */}
        <div className="proj-progress" aria-hidden="true">
          <i ref={progress} />
        </div>
      </div>

      <Lightbox src={active} onClose={() => setActive(null)} />
    </section>
  );
}
