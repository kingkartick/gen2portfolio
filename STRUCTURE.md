# App Structure — CodingValue Portfolio

> **⚠ July 2026 rebuild:** the site was redesigned (pitch-black cinematic
> theme, Tailwind v4, R3F transformer-network background, pinned Education
> chapter, holographic project panels, pinned certificate deck, custom
> cursor + magnetic hovers). Component names/roles below have drifted:
> `Studies.jsx` → `Education.jsx`, `Background.jsx` is now declarative R3F,
> `Cursor.jsx` / `Magnetic.jsx` / `Lightbox.jsx` were added, styling moved to
> Tailwind v4 + bespoke CSS in `src/styles/global.css`. The README's section
> list is current; treat the tables below as historical until refreshed.

A single-page, scroll-driven portfolio for a Cloud / Data-Science developer. One
long `<main>` of stacked sections sitting on top of a fixed, full-screen WebGL
background. No router, no backend, no data fetching — everything is static and
content is hard-coded into the components.

## Stack

| Layer          | Choice                                              |
| -------------- | --------------------------------------------------- |
| Runtime / pkg  | Bun (`bun.lock`)                                     |
| Build / dev    | Vite 5 (`vite.config.js`, esbuild minify, esnext)   |
| UI             | React 18 (`react`, `react-dom`)                     |
| 3D             | Three.js (raw, imperative — **not** R3F despite deps)|
| Animation      | GSAP + ScrollTrigger                                 |
| Smooth scroll  | Lenis (driven off GSAP's ticker → ScrollTrigger)     |
| State          | Zustand (single tiny store, loader→DOM bridge only)  |

> Note: `@react-three/fiber`, `@react-three/drei`, and `three` are all in
> `package.json`, but the background is written in **raw imperative Three.js**
> ([src/components/Background.jsx](src/components/Background.jsx)). R3F/drei are
> installed but currently unused.

## Entry & boot chain

```
index.html                         → #root + loads /src/main.jsx (module)
  └─ src/main.jsx                   → ReactDOM.createRoot → <App/> in StrictMode
       └─ src/App.jsx               → sets up Lenis+GSAP, renders everything
```

- [index.html](index.html) — shell. Loads **remote** resources via `<link>`/`<script>`:
  - Google Fonts: **Space Grotesk, Inter, JetBrains Mono, Alex Brush**
  - Font Awesome 6.5.2 (used by footer social icons)
  - `@lottiefiles/dotlottie-wc` web component (see "dead/aspirational" note below)
- [src/main.jsx](src/main.jsx) — mounts React, imports the single global stylesheet.
- [src/App.jsx](src/App.jsx) — the composition root:
  - Instantiates **Lenis** smooth scroll (skipped under
    `prefers-reduced-motion`), ties it into `gsap.ticker` and
    `ScrollTrigger.update`. Desktop wheels get momentum lerp; touch devices
    use `syncTouch` (native fling physics, mirrored into ScrollTrigger). The
    same ticker damps raw scroll velocity into `scrollState.smooth`.
  - Watches `store.loaded`; when the preloader finishes it waits 1.1s, unmounts
    the preloader, and calls `ScrollTrigger.refresh()` to re-measure.
  - Renders section order (top → bottom): `Preloader`, `Background`, then inside
    `<main>`: `Hero`, `QuoteBlock (Dijkstra)`, `Studies`, `Projects`,
    `QuoteBlock (Turing)`, `Achievements`, `Footer`.

## State — [src/store.js](src/store.js)

A minimal Zustand store, deliberately kept out of React render churn:

| field | purpose |
| --- | --- |
| `progress` (0–1) | live asset-load fraction, written at high frequency |
| `loaded` (bool)  | flips true when the preloader animation completes |

Only `App` reads `loaded`; `Preloader` writes both. Progress is intentionally
pushed here (not React state) so per-asset updates don't trigger re-renders.

The module also exports transient (non-reactive) scroll plumbing:

- `scrollState` — plain object `{ velocity, smooth, progress }`. Lenis writes
  raw velocity + page progress on scroll; App's ticker damps/clamps it into
  `smooth`. Polled per-frame by the Hero marquee (timeScale) — never touches
  the React reconciler. (The Three.js background intentionally does NOT read
  it — the scene stays scroll-independent.)
- `setLenis`/`getLenis` — live Lenis instance so the lightbox can
  `stop()`/`start()` the scroller without prop drilling.
- `prefersReducedMotion()` — shared media-query check.

## Components — [src/components/](src/components/)

| File | Section | Responsibility | Animation tech |
| --- | --- | --- | --- |
| `Preloader.jsx` | Loading overlay | Preloads every image+video (8s safety timeout per video), drives % bar, slides up when done | GSAP eased tween → DOM |
| `Background.jsx` | Fixed `#bg` canvas | Imperative Three.js scene: stars, data streams, clouds, central neural "hub" cloud, lightning bolts that always strike the hub, pointer parallax. **Deliberately scroll-independent.** Mobile: milder iso tilt + pitch toward camera + smaller/raised hub. DPR clamped to 2 | raw Three.js + `requestAnimationFrame` |
| `Hero.jsx` | Top header | Entrance timeline after preloader (nav drop, tile cascade, marquee fade); marquee speed/direction follows scroll velocity | GSAP timeline + ticker timeScale |
| `QuoteBlock.jsx` | Quote (×2, reusable) | Fully scrubbed cinematic reveal: glass card float-in, portrait clip-unmask + parallax drift, per-word masked rise w/ rotation, byline slide; props: `img/alt/quote/by` | GSAP timeline + ScrollTrigger scrub |
| `Studies.jsx` | Education | Per-char heading rise, cells flip up from grid floor (reverse on scroll-back), photo parallax inside frames | GSAP + charReveal + scrub parallax |
| `Projects.jsx` | Work | Pinned **horizontal scroll**; per-card fly-in via `containerAnimation` triggers; per-char heading; velocity 3D lean via `quickTo`; IntersectionObserver video play/pause | GSAP pin + scrub + quickTo |
| `Achievements.jsx` | Certificates | Per-char heading, cards 3D-flip in (reverse on scroll-back), pointer-tilt, click → lightbox (Esc; stops Lenis) | GSAP reveal + JS tilt + React state |
| `Footer.jsx` | Footer | CTA + socials pop in with back-out ease (reverse on scroll-back); `mailto:` CTA, social links | GSAP from + ScrollTrigger |

Shared: [src/fx.js](src/fx.js) — `splitChars`/`charReveal`/`impactReveal`.
`impactReveal` is the anime title-card slam used on all section headings
(chars crash down oversized, squash, elastic-settle; line shakes + glow
flash + accent slash). Titles render in **Bebas Neue** italic uppercase with
a metallic steel gradient fill (`background-clip: text`) — see the `.impact`
CSS block. The Three.js scene backdrop is pure black (`0x000000` clear color
+ fog), with site tokens (`--bg: #0b0b0d`) darkened to match. All reveal
initial-states are set in JS, never CSS, so reduced-motion users always see
content. (idempotent, StrictMode-safe)

### Data lives inside components (no CMS/JSON)

- **Projects** array is hard-coded at the top of
  [src/components/Projects.jsx](src/components/Projects.jsx#L7) — name, video,
  poster, description, tags, and a Google-Drive certificate link per project.
  Order rendered: **GalaxEye → Tynor → SolutionWise** (README's list order differs).
- **Certificates** array is hard-coded in
  [src/components/Achievements.jsx](src/components/Achievements.jsx#L7)
  (`cert1..cert5.png`).
- **Quote content** is passed as props from `App.jsx` (Dijkstra, Turing).

## Styling — [src/styles/global.css](src/styles/global.css) (single file, ~900 lines)

One global stylesheet, no CSS modules / Tailwind / styled-components. Organized
top-to-bottom by section with banner comments matching the components:

- **`:root` design tokens** — colors ("Oatmeal & Ink" / "Digital Twilight"),
  the four font families, `--maxw`, and a spring easing curve.
- **Theming trick**: `.light` overrides the CSS custom properties. The Studies
  section is the only light-theme block; `.section.light` also sets an opaque
  background so the dark WebGL canvas doesn't bleed through.
- Sections: fixed `#bg` (z-index -1, `pointer-events:none`), layout helpers,
  preloader + multilingual greeting keyframes, nav, hero/bento/marquee, quote
  glass card, studies bento grid, projects pinned track + cert shine, achievements
  grid, lightbox modal, plus `@media (max-width:768px/760px)` responsive rules.
- The cycling **multilingual greeting** ("Hello / नमस्ते / Bonjour / GutenTag /
  こんにちわ") is pure CSS — `#greeting-div::before` `content` swapped via a
  `@keyframes cycle` animation. No JS.
- **No `url()` asset references in CSS** — every image/video is referenced from JSX.

## Assets

### Two parallel folders — `assets/` (source) vs `public/assets/` (served)

`public/assets/` is what Vite serves at `/assets/...` and copies verbatim into
`dist/`. `assets/` is the untouched original drop; per the README, "original
source assets are kept in `assets/`; the served copies are in `public/assets/`."
They currently hold the **same files**.

### Asset manifest — [src/assets.js](src/assets.js)

Central list of heavy assets so the preloader can pre-warm the browser cache:
12 images + 3 videos. This is *only* the preload list — components still
reference paths as string literals themselves.

### Where each asset is used

| Asset | Used in | As |
| --- | --- | --- |
| `220px-Edsger_Wybe_Dijkstra.jpg` | App → QuoteBlock #1 | Dijkstra portrait |
| `Alanbhai.jpeg` | App → QuoteBlock #2 | Turing portrait |
| `idCard.png` | Studies | IIT Madras ID bento cell |
| `meStage.jpg` | Studies | stage photo bento cell |
| `video1.mp4` + `C2.png` | Projects (GalaxEye) | video texture + poster |
| `video2.mp4` + `C3.png` | Projects (Tynor) | video texture + poster |
| `video3.mp4` + `C1.png` | Projects (SolutionWise) | video texture + poster |
| `cert1..cert5.png` | Achievements | certificate grid + lightbox |

### Unused / orphan assets (present in folders, referenced nowhere in code)

`C12.png`, `C22.png`, `C32.png`, `Hackopitch Certificate.PNG`,
`jk.png`, `jkl;.png`, `ljk.png`, `WhatsApp Image 2024-05-24 at 13.35.46.jpeg`,
and the **entire `fonta/` folder** (MSDF font atlases: AIPOINTE, AlexBrush,
roboto-regular — `.json` + `.png`). The `fonta/` MSDF atlases were presumably
intended for 3D text in the Three.js scene but nothing loads them. All of these
still get copied into `dist/` because they sit under `public/`.

## Dead / aspirational bits worth knowing

- **Profile orb / Lottie**: `index.html` loads the `dotlottie-wc` web component
  and `global.css` styles `.tile--profile dotlottie-wc`, but **no component
  renders a `tile--profile`** — the profile orb described in the README is not
  wired into `Hero.jsx`.
- **R3F/drei installed but unused** (background is raw Three.js).
- **`resume.txt`** at the repo root is reference content, not imported anywhere.

## Build output — `dist/`

`vite build` emits `dist/index.html`, one hashed JS bundle
(`assets/index-*.js` — dominated by Three.js), one hashed CSS bundle, and a
verbatim copy of everything under `public/assets/` (including the unused files).

## Mental model / data flow

```
Preloader ──writes progress/loaded──► Zustand store ──loaded──► App reveals page
   │
   └─ preloads IMAGES+VIDEOS (assets.js)

App ── instantiates Lenis ──► gsap.ticker ──► ScrollTrigger.update
         │                        │
         │ writes velocity/progress   each section's useLayoutEffect registers
         ▼                            its own ScrollTrigger (scrub reveals,
   scrollState (plain object) ──────► pinned horizontal scroll, stagger-ins,
         │ polled per frame           masked char/word rises, card fly-ins)
         └─► Hero marquee: timeScale follows scroll velocity

Background = independent Three.js RAF loop, fixed behind everything (z-index:-1),
             reacts only to mouse position + window resize — NOT to scroll.
```
