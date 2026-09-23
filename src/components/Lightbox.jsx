import { useEffect } from 'react';
import { getLenis } from '../store';

/* Full-screen image viewer. Owns the Esc-to-close listener and pauses
   Lenis while open (body overflow alone doesn't stop it — Lenis drives
   scrollTop itself). Shared by Projects (certificates) and Achievements. */
export default function Lightbox({ src, alt = 'Certificate', onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    getLenis()?.stop();
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      getLenis()?.start();
      document.body.style.overflow = '';
    };
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" data-cursor="CLOSE">
        [ESC] CLOSE ✕
      </button>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
