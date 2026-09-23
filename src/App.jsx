import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore, scrollState, setLenis, prefersReducedMotion } from './store';
import { resolveAnchor, scrollToAnchor } from './anchors';
import Preloader from './components/Preloader';
import Background from './components/Background';
import Cursor from './components/Cursor';
import Hero from './components/Hero';
import QuoteBlock from './components/QuoteBlock';
import Education from './components/Education';
import Projects from './components/Projects';
import Achievements from './components/Achievements';
import Footer from './components/Footer';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const [showPreloader, setShowPreloader] = useState(true);

  // Smooth scroll. Desktop wheels get momentum lerp; touch devices keep the
  // OS's native fling physics but Lenis mirrors them into ScrollTrigger
  // (syncTouch) so scrubbed animations stay perfectly in sync.
  useEffect(() => {
    // Vestibular safety: hand scrolling back to the browser entirely.
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 1.2,
    });
    setLenis(lenis);

    lenis.on('scroll', (e) => {
      ScrollTrigger.update();
      scrollState.velocity = e.velocity;
      scrollState.progress = e.progress || 0;
    });

    const raf = (time) => {
      lenis.raf(time * 1000);
      // Damp + clamp raw velocity into a signal safe for visuals:
      // v_smooth += (v_raw − v_smooth) · α, clamped to ±40.
      const target = gsap.utils.clamp(-40, 40, scrollState.velocity);
      scrollState.smooth += (target - scrollState.smooth) * 0.1;
      // decay raw toward 0 so the "breath" settles when scrolling stops
      scrollState.velocity *= 0.9;
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  // Refresh measurements once assets are in and the preloader has left.
  useEffect(() => {
    if (loaded) {
      const t = setTimeout(() => {
        setShowPreloader(false);
        ScrollTrigger.refresh();
      }, 1100);
      return () => clearTimeout(t);
    }
  }, [loaded]);

  /* Deep links (?#project-tynor, #Education, …).

     Has to wait for the preloader to lift AND for ScrollTrigger to have
     measured the pins: a Projects anchor is derived from the pinned
     reel's scroll range, so resolving it against stale measurements
     lands on the wrong card. The native browser jump that may already
     have happened on load is simply overwritten here. */
  useEffect(() => {
    if (!loaded) return;
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    let cancelled = false;
    // just after the preloader's own 1100ms refresh
    const t1 = setTimeout(() => {
      if (!cancelled) scrollToAnchor(hash, { immediate: true });
    }, 1200);
    // second pass: late webfonts/images can still reflow the pin range,
    // and only correct if it actually drifted, so there is no double jump
    const t2 = setTimeout(() => {
      if (cancelled) return;
      const y = resolveAnchor(hash);
      if (y !== null && Math.abs(window.scrollY - y) > 16) {
        scrollToAnchor(hash, { immediate: true });
      }
    }, 2400);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loaded]);

  // In-page hash changes (shared link pasted into the same tab, back/forward)
  useEffect(() => {
    const onHash = () => scrollToAnchor(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Layout can still shift after that refresh (late webfont swap,
  // straggler assets on window load). Stale measurements are what make
  // pinned sections drift into each other — re-measure on both signals.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => window.removeEventListener('load', refresh);
  }, []);

  return (
    <>
      {showPreloader && <Preloader />}
      <Background />
      <Cursor />
      <div id="noise" aria-hidden="true" />
      <div id="vignette" aria-hidden="true" />
      <main>
        <Hero />
        <QuoteBlock
          img="/assets/220px-Edsger_Wybe_Dijkstra.jpg"
          alt="Edsger W. Dijkstra"
          quote="Computer Science is no more about computers than astronomy is about telescopes."
          by="Edsger W. Dijkstra"
          role="Pioneer of structured programming · Turing Award 1972"
          meta="Archive 01 · Rotterdam, 1930"
          accent={['computer', 'science', 'astronomy']}
        />
        <Education />
        <Projects />
        <QuoteBlock
          img="/assets/Alanbhai.jpeg"
          alt="Alan Turing"
          quote="Sometimes it is the people no one imagines anything of who do the things that no one can imagine."
          by="Alan Turing"
          role="Father of computer science & artificial intelligence"
          meta="Archive 02 · London, 1912"
          accent={['imagines', 'imagine']}
        />
        <Achievements />
        <Footer />
      </main>
    </>
  );
}
