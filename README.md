# CodingValue · by Kartick — 2026 Portfolio

A single-page, scroll-driven portfolio for a Cloud / Data Science developer,
built from the 2026 blueprint.

## Stack

| Layer        | Choice                                  |
| ------------ | --------------------------------------- |
| Runtime      | Bun                                     |
| Build / dev  | Vite 5 (esbuild minify, esnext target)  |
| UI           | React 18                                |
| 3D           | Three.js + React Three Fiber (WebGL)    |
| Animation    | GSAP + ScrollTrigger                    |
| Smooth scroll| Lenis (wired into ScrollTrigger)        |
| State bridge | Zustand (loader → DOM, no render churn) |

## Run

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # -> dist/
```

## Sections (top → bottom)

1. **Preloader** — counts every image/video, giant Bebas %, top hairline bar,
   slides up at 100%.
2. **Fixed background** — `#bg` R3F canvas: a 6-layer **transformer stack**
   (glowing nodes + curved vibrating "strings"; a forward-pass pulse ripples
   layer-by-layer), the original six-colour data-stream particles, far stars.
   Pointer steers it, scroll velocity strums the strings, scroll progress
   slowly revolves it. Opaque black clear (`#030304`).
3. **Hero** — massive two-line display name (solid/stroke), magnetic
   Download-Résumé pill, live location HUD, scroll-velocity marquee.
4. **Quote 1 (Dijkstra)** — fully scrubbed float-through-the-void: per-word
   masked rise, portrait clip unmask + parallax.
5. **Education** — pinned scrollytelling: "EDUCATION" characters assemble from
   scatter, IIT Madras ID card + stage photo fly in from the wings.
6. **Projects** — pinned horizontal traverse (GalaxEye / Tynor / SolutionWise)
   in holographic panels (scanlines, corner brackets), scroll-velocity 3D lean,
   video + secondary screenshots, per-project certificate lightbox.
7. **Quote 2 (Turing)** — same scrubbed system.
8. **Achievements** — pinned certificate **deck**: five award scans fly up one
   by one and stack with rotational inertia; the pin releases after the last
   card lands. Click any card → lightbox.
9. **Footer** — giant CTA, magnetic social pills (inline SVG), mono copyright.

> Interaction layer: Lenis smooth scroll, custom neon cursor (dot + lazy ring
> with contextual labels), magnetic hover wrapper, film-grain + vignette.

## Deviations from the blueprint (and why)

- **WebGL, not WebGPU/TSL.** R3F on stable Three.js guarantees the scene runs
  in every browser today. The `#bg` architecture (fixed, `z-index:-1`,
  `pointer-events:none`, scroll-reactive) matches the brief; swapping in
  `three/webgpu` later is isolated to `Background.jsx`.
- **CSS/SVG widgets instead of Rive.** No `.riv` assets were provided; the
  profile orb and location pulse reproduce the intended interaction with zero
  runtime cost. Drop-in Rive later in `Hero.jsx`.
- **Certificates rendered in the DOM** with a perspective/tilt gallery rather
  than handing off to the in-canvas camera — robust and identical in feel.
- **React 18 (no React Compiler).** GSAP already bypasses the reconciler;
  Compiler/React 19 was omitted to keep the build deterministic.
- The single large JS chunk is Three.js; acceptable for a portfolio, can be
  code-split if needed.

Original source assets are kept in `assets/`; the served copies are in
`public/assets/`.
