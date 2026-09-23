import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '../store';
import { IMAGES, VIDEOS } from '../assets';

/* Centralised asset loading. Counts every image + video so the
   percentage reflects real bytes parsed, not just DOM ready.
   Progress goes to Zustand (not React state) so high-frequency
   updates never trigger reconciler churn. */
function preloadAll(onProgress) {
  const items = [
    ...IMAGES.map((src) => ({ src, type: 'img' })),
    ...VIDEOS.map((src) => ({ src, type: 'video' })),
  ];
  const total = items.length;
  let done = 0;

  const tick = () => {
    done += 1;
    onProgress(done / total);
  };

  return Promise.all(
    items.map(
      (it) =>
        new Promise((resolve) => {
          if (it.type === 'img') {
            const img = new Image();
            img.onload = img.onerror = () => {
              tick();
              resolve();
            };
            img.src = it.src;
          } else {
            const v = document.createElement('video');
            v.preload = 'auto';
            v.muted = true;
            let settled = false;
            const settle = () => {
              if (settled) return;
              settled = true;
              tick();
              resolve();
            };
            v.oncanplaythrough = v.onerror = settle;
            // Safety valve: on throttled connections canplaythrough can
            // stall indefinitely — never hold the whole site hostage.
            setTimeout(settle, 8000);
            v.src = it.src;
          }
        })
    )
  );
}

export default function Preloader() {
  const root = useRef(null);
  const fill = useRef(null);
  const pct = useRef(null);
  const setProgress = useStore((s) => s.setProgress);
  const setLoaded = useStore((s) => s.setLoaded);

  useEffect(() => {
    const eased = { v: 0 };
    const paint = () => {
      if (fill.current) fill.current.style.width = `${(eased.v * 100).toFixed(0)}%`;
      if (pct.current) pct.current.firstChild.textContent = `${Math.round(eased.v * 100)}`;
    };

    preloadAll((p) => {
      setProgress(p);
      gsap.to(eased, { v: p, duration: 0.5, ease: 'power2.out', onUpdate: paint });
    }).then(() => {
      gsap.to(eased, {
        v: 1,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: paint,
        onComplete: () => {
          gsap
            .timeline()
            .to(root.current, {
              yPercent: -100,
              duration: 1,
              ease: 'expo.inOut',
              delay: 0.25,
            })
            .add(() => setLoaded());
        },
      });
    });
  }, [setProgress, setLoaded]);

  return (
    <div id="preloader" ref={root}>
      <div className="pre__bar">
        <div className="pre__fill" ref={fill} />
      </div>
      <div className="pre__top flex items-start justify-between">
        <span className="pre__brand">CodingValue© — Kartick Sharma</span>
        <span className="pre__brand">EST. IST / INDIA</span>
      </div>
      <div className="pre__greeting" aria-hidden="true" />
      <div className="pre__pct" ref={pct}>
        0<i>%</i>
      </div>
    </div>
  );
}
