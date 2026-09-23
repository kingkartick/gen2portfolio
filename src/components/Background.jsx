import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore, prefersReducedMotion } from '../store';

gsap.registerPlugin(ScrollTrigger);

/* Fixed, full-screen R3F scene living behind the whole page.

   Centrepiece: the ATTENTION EQUATION as three chrome-framed glass
   panels — Query × Key × Value — standing in a row with machined metal
   multiply signs floating in the gaps. Each card is a chamfered chrome
   frame around a slab of smoked glass; the face carries a grid of empty
   outlined matrix cells (static texture, drawn once) and a sparse
   handful of them light up at a time — blue for Q, amber for K, green/
   magenta for V — like attention weights firing. A few slow glowing
   threads arc from card to card through the × signs, carrying packets
   Q → K → V. Glass bubbles drift around the row.

   Scroll is the camera move: every top-level section gets its own
   designed shot of the row, and the footer is the signature dive — the
   row splits open, K lifts away, and the camera flies through the gap.

   Supporting cast: the coloured "data stream" particles and a sparse far
   star shell, both inherited from the original site. */

const PALETTE = [
  [0.0, 0.9, 1.0], // vivid cyan
  [0.63, 0.53, 1.0], // violet
  [1.0, 0.38, 0.5], // rose
  [0.3, 0.55, 1.0], // electric blue
  [0.85, 0.88, 0.95], // silver
];

/* ---------------- card definitions ---------------- */

const CARD_W = 2.8;
const CARD_H = 4.5;
const FRAME = 0.14; // chrome border width
const CHAM = 0.34; // outer corner chamfer
const FRAME_T = 0.12; // frame depth
const GLASS_T = 0.05; // glass slab depth
const IN_W = CARD_W - FRAME * 2; // glass panel size
const IN_H = CARD_H - FRAME * 2;
const IN_CH = CHAM - FRAME; // inner chamfer

// face canvas — logical units, 2× backing store
const LW = 300;
const LH = Math.round(LW * (IN_H / IN_W)); // ≈ 502

// matrix grid, in canvas units (shared by the face texture, the light
// points and the thread anchors)
const GRID_COLS = 5;
const GRID_ROWS = 6;
const CELL = 40;
const GAP = 9;
const GRID_W = GRID_COLS * CELL + (GRID_COLS - 1) * GAP;
const GRID_H = GRID_ROWS * CELL + (GRID_ROWS - 1) * GAP;
const GRID_X = (LW - GRID_W) / 2;
const GRID_Y = 108;

// accents: a few cells outlined in the card's colour, baked into the
// static face; cellColors feed the dynamic firing lights
const CARD_DEFS = [
  {
    key: 'Q',
    word: 'Query',
    cellColors: ['#4da8ff'],
    accents: [
      { i: 8, c: '#4da8ff' },
      { i: 21, c: '#4da8ff' },
    ],
  },
  {
    key: 'K',
    word: 'Key',
    cellColors: ['#ffb454'],
    accents: [
      { i: 6, c: '#ffb454' },
      { i: 13, c: '#ffb454' },
      { i: 26, c: '#ffb454' },
    ],
  },
  {
    key: 'V',
    word: 'Value',
    cellColors: ['#57ff9e', '#e07bff'],
    accents: [
      { i: 16, c: '#57ff9e' },
      { i: 28, c: '#e07bff' },
    ],
  },
];

// the row — K centre and a touch forward, Q and V turned gently inward,
// gaps left clear for the multiply signs
const CARD_POSE = [
  { x: -3.5, y: -0.15, z: 0.05, rx: 0, ry: 0.18, rz: 0.045 },
  { x: 0.0, y: 0.05, z: 0.15, rx: 0, ry: 0.0, rz: 0.0 },
  { x: 3.5, y: -0.15, z: 0.05, rx: 0, ry: -0.18, rz: -0.045 },
];

// multiply signs sit at the gap midpoints
const CROSS_X = 1.75;

/* ---------------- face texture ----------------
   Grid outlines + accent cells + lettering, drawn ONCE to a static
   texture (re-drawn only when the webfont lands) — never per frame. */

function chamPathAt(ctx, x, y, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cellRect(i) {
  const r = Math.floor(i / GRID_COLS);
  const c = i % GRID_COLS;
  return { x: GRID_X + c * (CELL + GAP), y: GRID_Y + r * (CELL + GAP) };
}

function makeFace(def) {
  const canvas = document.createElement('canvas');
  canvas.width = LW * 2;
  canvas.height = LH * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const draw = () => {
    ctx.clearRect(0, 0, LW, LH);
    ctx.save();
    // clip to the chamfered panel so the plane's corners stay empty
    chamPathAt(ctx, 0, 0, LW, LH, 24);
    ctx.clip();

    // faint diagonal sheen so the smoked glass reads as a surface
    const g = ctx.createLinearGradient(0, 0, LW, LH);
    g.addColorStop(0, 'rgba(255,255,255,0.055)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.035)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LW, LH);

    // hairline inner border following the chamfer
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    chamPathAt(ctx, 4, 4, LW - 8, LH - 8, 22);
    ctx.stroke();

    // the matrix — empty outlined cells
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const { x, y } = cellRect(i);
      roundedRect(ctx, x, y, CELL, CELL, 5);
      ctx.stroke();
    }

    // a few cells outlined in the card's colour, softly lit
    for (const a of def.accents) {
      const { x, y } = cellRect(a.i);
      ctx.save();
      ctx.shadowColor = a.c;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = a.c;
      ctx.lineWidth = 1.8;
      roundedRect(ctx, x, y, CELL, CELL, 5);
      ctx.stroke();
      ctx.restore();
    }

    // lettering — corner letter + word, nothing else
    ctx.fillStyle = 'rgba(248,250,255,0.95)';
    ctx.font = '600 52px "Space Grotesk", sans-serif';
    ctx.fillText(def.key, 26, 74);
    ctx.font = '500 34px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(248,250,255,0.85)';
    const w = ctx.measureText(def.word).width;
    ctx.fillText(def.word, (LW - w) / 2, LH - 30);
    ctx.restore();
    texture.needsUpdate = true;
  };
  draw();
  return { texture, draw };
}

// grid-cell centre in card-local space — lights and threads anchor here
function cellLocal(row, col) {
  const cx = GRID_X + col * (CELL + GAP) + CELL / 2;
  const cy = GRID_Y + row * (CELL + GAP) + CELL / 2;
  return new THREE.Vector3(
    (cx / LW - 0.5) * IN_W,
    (0.5 - cy / LH) * IN_H,
    GLASS_T / 2 + 0.01
  );
}

/* ---------------- firing cells ----------------
   One point per matrix cell, invisible until it fires: a sharpened sine
   keeps roughly two or three cells lit per card at any moment, matching
   the reference's sparse glow. All animation lives in the shader. */

function buildLights(def) {
  const n = GRID_COLS * GRID_ROWS;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const speeds = new Float32Array(n);
  const sizes = new Float32Array(n);
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    cellLocal(Math.floor(i / GRID_COLS), i % GRID_COLS).toArray(positions, i * 3);
    positions[i * 3 + 2] += 0.02; // just proud of the face
    // first colour dominates; later ones are the occasional accent
    col.set(def.cellColors[Math.random() < 0.78 ? 0 : 1 % def.cellColors.length]);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    phases[i] = Math.random();
    speeds[i] = 0.11 + Math.random() * 0.13; // long cycle, brief flash
    sizes[i] = 0.42;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  return geo;
}

const lightVertex = /* glsl */ `
attribute vec3 aCol;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
uniform float uTime;
uniform float uScale;
uniform float uPx;
varying float vB;
varying vec3 vCol;
void main(){
  // brief flash on a long cycle: a cell is dark most of the time, then
  // fires and fades. Two Gaussians so the pulse wraps seamlessly, and
  // only ~3 cells per card are lit at any moment.
  float u = fract(uTime * aSpeed + aPhase);
  vB = exp(-u * u * 700.0) + exp(-(1.0 - u) * (1.0 - u) * 700.0);
  vCol = aCol;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * uScale * uPx / -mv.z, 72.0);
  gl_Position = projectionMatrix * mv;
}`;

const lightFragment = /* glsl */ `
varying float vB;
varying vec3 vCol;
void main(){
  vec2 p = abs(gl_PointCoord - 0.5);
  float d = max(p.x, p.y);
  float core = 1.0 - smoothstep(0.10, 0.17, d);
  float glow = 1.0 - smoothstep(0.05, 0.5, d);
  vec3 col = vCol * (0.6 + 0.9 * vB) + vec3(1.0) * core * vB * 0.55;
  float a = (core * 0.9 + glow * 0.45) * vB;
  gl_FragColor = vec4(col, a);
}`;

/* ---------------- attention threads ----------------
   A handful of slow glowing arcs — Q's edge cells to K's, K's to V's —
   each curving through the multiply sign in its gap and carrying a
   light packet. Six threads total: presence, not a network. */

const THREAD_RUNS = [
  { a: [0, 1, 4], b: [1, 0, 0], ca: '#4da8ff', cb: '#ffb454', oy: 0.55 },
  { a: [0, 3, 4], b: [1, 2, 0], ca: '#4da8ff', cb: '#ffb454', oy: 0.0 },
  { a: [0, 5, 4], b: [1, 4, 0], ca: '#4da8ff', cb: '#ffb454', oy: -0.55 },
  { a: [1, 0, 4], b: [2, 1, 0], ca: '#ffb454', cb: '#57ff9e', oy: 0.55 },
  { a: [1, 3, 4], b: [2, 2, 0], ca: '#ffb454', cb: '#e07bff', oy: 0.0 },
  { a: [1, 5, 4], b: [2, 4, 0], ca: '#ffb454', cb: '#57ff9e', oy: -0.55 },
];

const THREAD_SEGMENTS = 18;

function buildThreads() {
  const mats = CARD_POSE.map((p) => {
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(p.x, p.y, p.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx, p.ry, p.rz)),
      new THREE.Vector3(1, 1, 1)
    );
    return m;
  });

  const positions = [];
  const ts = [];
  const colA = [];
  const colB = [];
  const phases = [];
  const speeds = [];
  const pt = new THREE.Vector3();

  THREAD_RUNS.forEach((run) => {
    const a = cellLocal(run.a[1], run.a[2]).applyMatrix4(mats[run.a[0]]);
    const b = cellLocal(run.b[1], run.b[2]).applyMatrix4(mats[run.b[0]]);
    // control point pulls the arc through the multiply sign in this gap
    const ctrl = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + run.oy, 0.55);
    const ca = new THREE.Color(run.ca);
    const cb = new THREE.Color(run.cb);
    const phase = Math.random();
    const speed = 0.16 + Math.random() * 0.14;
    let prev = null;
    for (let s = 0; s <= THREAD_SEGMENTS; s++) {
      const t = s / THREAD_SEGMENTS;
      const u = 1 - t;
      pt.set(
        u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
        u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
        u * u * a.z + 2 * u * t * ctrl.z + t * t * b.z
      );
      const point = [pt.x, pt.y, pt.z, t];
      if (prev) {
        positions.push(prev[0], prev[1], prev[2], point[0], point[1], point[2]);
        ts.push(prev[3], point[3]);
        colA.push(ca.r, ca.g, ca.b, ca.r, ca.g, ca.b);
        colB.push(cb.r, cb.g, cb.b, cb.r, cb.g, cb.b);
        phases.push(phase, phase);
        speeds.push(speed, speed);
      }
      prev = point;
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(ts), 1));
  geo.setAttribute('aColA', new THREE.BufferAttribute(new Float32Array(colA), 3));
  geo.setAttribute('aColB', new THREE.BufferAttribute(new Float32Array(colB), 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(phases), 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(new Float32Array(speeds), 1));
  return geo;
}

const threadVertex = /* glsl */ `
attribute float aT;
attribute vec3 aColA;
attribute vec3 aColB;
attribute float aPhase;
attribute float aSpeed;
uniform float uTime;
varying float vGlow;
varying vec3 vCol;
void main(){
  float packet = fract(uTime * aSpeed + aPhase);
  vGlow = smoothstep(0.14, 0.0, abs(aT - packet));
  vCol = mix(aColA, aColB, aT);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const threadFragment = /* glsl */ `
uniform float uFade;
varying float vGlow;
varying vec3 vCol;
void main(){
  vec3 col = vCol * (0.55 + 0.6 * vGlow) + vec3(1.0) * vGlow * 0.3;
  float a = (0.16 + 0.62 * vGlow) * uFade;
  gl_FragColor = vec4(col, a);
}`;

/* ---------------- glass bubbles ---------------- */

function FloatingOrbs({ mobile }) {
  const ref = useRef();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const count = mobile ? 6 : 11;
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => {
        // shell around the row, biased to the flanks so cards stay the star
        const side = Math.random() > 0.5 ? 1 : -1;
        return {
          x: side * (3.6 + Math.random() * 3.4),
          y: (Math.random() - 0.5) * 6.4,
          z: -2.8 + Math.random() * 3.6,
          s: 0.08 + Math.random() * 0.2,
          bob: 0.3 + Math.random() * 0.6,
          drift: (Math.random() - 0.5) * 0.25,
          ph: Math.random() * Math.PI * 2,
        };
      }),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    seeds.forEach((c, i) => {
      dummy.position.set(
        c.x + Math.sin(t * c.bob * 0.6 + c.ph) * c.drift,
        c.y + Math.sin(t * c.bob + c.ph) * 0.4,
        c.z
      );
      dummy.scale.setScalar(c.s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshPhysicalMaterial
        color="#aac4d8"
        transparent
        opacity={0.22}
        roughness={0.08}
        clearcoat={1}
        envMapIntensity={1.2}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ---------------- section-aware camera rig ----------------

   The page is a shot list, not one monotonic camera move. Every
   top-level section (<main>'s children — GSAP pin-spacers included,
   so pinned chapters hold their framing for their whole pinned
   duration) gets its own designed view of the card row. Anchors are
   measured from the real DOM and the rig eases between neighbouring
   shots exactly while two sections share the viewport, so the row
   always frames AROUND the content instead of crashing through it.

   Fields: z camera dolly · x/y row offset · s row scale ·
   ry/rx row orientation · ct contain-fit · pk park against a viewport
   edge (−1 left, +1 right, 0 off — see the x block in useFrame) ·
   sp card spread (1 = closed row, >1 opens it for the dive). */

const SHOTS = [
  // 0 hero — the equation fills the clear right half
  { z: 16.0, x: 4.2, y: 0.05, s: 1.35, ry: -0.3, rx: 0.03, ct: 1, pk: 0, sp: 1, mz: 16.0, myf: 0.47, dm: 1, dd: 1 },
  // 1 quote (Dijkstra) — grazing sweep parked hard left, out of the copy
  { z: 20.0, x: 0.0, y: -1.6, s: 0.85, ry: 0.95, rx: 0.3, ct: 1, pk: -1, sp: 1, mz: 20.0, myf: 0.42, dm: 0.5, dd: 1 },
  // 2 education — compact row parked top-right, seen from below
  { z: 18.5, x: 4.4, y: 2.5, s: 0.8, ry: -0.55, rx: -0.18, ct: 1, pk: 0, sp: 1, mz: 18.5, myf: 0.56, dm: 0.32, dd: 1 },
  // 3 projects reel — calm wide backdrop sunk beneath the panels
  { z: 21.0, x: 0.0, y: -2.9, s: 1.1, ry: 0.4, rx: -0.14, ct: 1, pk: 0, sp: 1, mz: 21.0, myf: 0.4, dm: 0.32, dd: 1 },
  // 4 quote (Turing) — parked left too, but seen from below and turned
  // flatter (a left park needs POSITIVE yaw to keep the faces toward the
  // camera — mirroring it edge-ons the row into a sliver)
  { z: 20.0, x: 0.0, y: -1.6, s: 0.85, ry: 0.58, rx: -0.26, ct: 1, pk: -1, sp: 1, mz: 20.0, myf: 0.42, dm: 0.5, dd: 1 },
  // 5 achievements — big tilted row peeking around the certificate deck
  { z: 16.5, x: 0.0, y: 0.4, s: 1.25, ry: 0.6, rx: 0.2, ct: 1, pk: 0, sp: 1, mz: 16.5, myf: 0.44, dm: 0, dd: 0 },
  // 6 footer — the row splits open and the camera dives through the gap.
  // mz pulls the mobile camera back: a narrow viewport sees barely 2.3
  // world units either side at z 6.2, so the split row flies clean out of
  // frame and the finale reads as an empty screen.
  { z: 6.2, x: 0.0, y: 0.1, s: 1.25, ry: 0.02, rx: 0.02, ct: 0, pk: 0, sp: 2.4, mz: 11.5, myf: -0.28, dm: 1, dd: 1 },
];

const SHOT_FIELDS = ['z', 'x', 'y', 's', 'ry', 'rx', 'ct', 'pk', 'sp', 'mz', 'myf', 'dm', 'dd'];
const RIG = { keys: [] };

function measureRig() {
  const main = document.querySelector('main');
  if (!main) return;
  const vh = window.innerHeight;
  const keys = [];
  Array.from(main.children).forEach((el, i) => {
    const shot = SHOTS[Math.min(i, SHOTS.length - 1)];
    const top = el.getBoundingClientRect().top + window.scrollY;
    // tall sections (quotes, pin-spacers) hold their shot until their
    // bottom meets the viewport bottom — then the handover begins
    const hold = top + el.offsetHeight - vh;
    keys.push({ at: top, shot });
    if (hold > top + 2) keys.push({ at: hold, shot });
  });
  keys.sort((a, b) => a.at - b.at);
  RIG.keys = keys;
}

function sampleShot(scrollY, out) {
  const keys = RIG.keys;
  if (!keys.length) {
    Object.assign(out, SHOTS[0]);
    return out;
  }
  let a = keys[0];
  let b = keys[0];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].at <= scrollY) {
      a = keys[i];
      b = keys[i];
    } else {
      b = keys[i];
      break;
    }
  }
  const span = b.at - a.at;
  let t = span > 0 ? (scrollY - a.at) / span : 0;
  t = Math.min(1, Math.max(0, t));
  t = t * t * (3 - 2 * t); // smoothstep — shots settle in, never jerk
  for (const f of SHOT_FIELDS) out[f] = a.shot[f] + (b.shot[f] - a.shot[f]) * t;
  return out;
}

/* ---------------- the cards ---------------- */

function chamferShape(w, h, c) {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  s.moveTo(-hw + c, -hh);
  s.lineTo(hw - c, -hh);
  s.lineTo(hw, -hh + c);
  s.lineTo(hw, hh - c);
  s.lineTo(hw - c, hh);
  s.lineTo(-hw + c, hh);
  s.lineTo(-hw, hh - c);
  s.lineTo(-hw, -hh + c);
  s.closePath();
  return s;
}

function AttentionCard({ def, pose, refFn, lightUniforms }) {
  const { frameGeo, glassGeo } = useMemo(() => {
    const outer = chamferShape(CARD_W, CARD_H, CHAM);
    const inner = chamferShape(IN_W, IN_H, IN_CH);
    outer.holes.push(new THREE.Path(inner.getPoints().reverse()));
    const frame = new THREE.ExtrudeGeometry(outer, {
      depth: FRAME_T,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    frame.translate(0, 0, -FRAME_T / 2);
    const glass = new THREE.ExtrudeGeometry(chamferShape(IN_W, IN_H, IN_CH), {
      depth: GLASS_T,
      bevelEnabled: false,
    });
    glass.translate(0, 0, -GLASS_T / 2);
    return { frameGeo: frame, glassGeo: glass };
  }, []);
  const face = useMemo(() => makeFace(def), [def]);
  const lightsGeo = useMemo(() => buildLights(def), [def]);

  // first paint may land before the webfont — redraw once fonts are ready
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) face.draw();
    });
    return () => {
      live = false;
    };
  }, [face]);

  const uniforms = useMemo(
    () => ({
      uTime: lightUniforms.uTime, // shared clock
      uScale: lightUniforms.uScale, // shared row scale
      uPx: lightUniforms.uPx, // shared pixel-height factor
    }),
    [lightUniforms]
  );

  return (
    <group ref={refFn} position={[pose.x, pose.y, pose.z]} rotation={[pose.rx, pose.ry, pose.rz]}>
      {/* machined chrome frame — the env map does the talking */}
      <mesh geometry={frameGeo}>
        <meshStandardMaterial color="#c9ced6" metalness={1} roughness={0.22} envMapIntensity={1.35} />
      </mesh>
      {/* smoked-glass slab, recessed inside the frame */}
      <mesh geometry={glassGeo} renderOrder={1}>
        <meshPhysicalMaterial
          color="#0b0e13"
          transparent
          opacity={0.55}
          roughness={0.18}
          metalness={0.3}
          clearcoat={1}
          clearcoatRoughness={0.2}
          envMapIntensity={1.0}
          depthWrite={false}
        />
      </mesh>
      {/* grid + lettering — static texture floating on the glass */}
      <mesh position={[0, 0, GLASS_T / 2 + 0.004]} renderOrder={2}>
        <planeGeometry args={[IN_W, IN_H]} />
        <meshBasicMaterial map={face.texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* the firing cells */}
      <points geometry={lightsGeo} renderOrder={3}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={lightVertex}
          fragmentShader={lightFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// opening unfold: the deck the cards start stacked in, slightly turned
// away, and the per-card deal order (Q leads, V follows, K crowns)
const INTRO_STACK = { x: 0, y: -0.25, ry: 0.55 };
const INTRO_DELAY = [0, 0.3, 0.15];

function CardFan({ mobile }) {
  const group = useRef();
  const cards = useRef([]);
  const crosses = useRef([]);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const loaded = useStore((s) => s.loaded);
  const introStart = useRef(null);
  const spread = useRef(1);
  const shotNow = useRef({ ...SHOTS[0] });
  const threadsGeo = useMemo(() => buildThreads(), []);

  // mobile: the row is wide and the layout stacks full-width, so it rides
  // smaller and high above the identity block instead of behind it
  const fanScale = mobile ? 0.56 : 1;
  // #bg's clear colour IS --color-void, so fading the canvas fades only
  // the scene — the page background underneath is the identical black
  const bgEl = useRef(null);
  const dimNow = useRef(1);
  const dimSent = useRef(-1);

  // half-extents of the closed row (card corners under their poses) —
  // what the contain-fit must keep on screen
  const ext = { w: 5.05, h: 2.55, d: 0.7 };

  // uniform objects shared by all three cards' light shaders
  const lightUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uScale: { value: 1 }, uPx: { value: 800 } }),
    []
  );
  const threadUniforms = useMemo(() => ({ uTime: { value: 0 }, uFade: { value: 0 } }), []);

  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    if (!reduced) {
      lightUniforms.uTime.value = t;
      threadUniforms.uTime.value = t;
    }
    lightUniforms.uScale.value = group.current.scale.x;
    lightUniforms.uPx.value = state.gl.drawingBufferHeight * 0.87;
    // rig anchors can be empty on the very first frames (fonts/pins still
    // settling) — measure lazily so the page never falls back to shot 0
    if (!RIG.keys.length) measureRig();

    // frame-rate-independent damping (per-frame lerps drag on 144 Hz and
    // overshoot after instant jumps — nav clicks, restored scroll)
    const kMove = 1 - Math.exp(-dt * 4.2);
    const kCam = 1 - Math.exp(-dt * 4.6);

    // scroll IS the camera move — sample the shot list at the live scroll
    // position and damp everything toward it. Pointer steers on top.
    const shot = sampleShot(window.scrollY, shotNow.current);
    // mobile text chapters stack full-width, so the row cannot dodge the
    // copy the way it parks aside on desktop — it drops to ambience instead.
    // dd does the same on desktop; the achievements chapter sets both to 0
    // so the certificate deck gets the screen to itself.
    if (!bgEl.current) bgEl.current = document.getElementById('bg');
    dimNow.current += ((mobile ? shot.dm : shot.dd) - dimNow.current) * kMove;
    if (bgEl.current && Math.abs(dimNow.current - dimSent.current) > 0.004) {
      dimSent.current = dimNow.current;
      bgEl.current.style.opacity = dimNow.current.toFixed(3);
    }

    // mobile frames are narrow: a full split throws the cards clean past
    // both edges, so the finale opens about half as far
    const spT = mobile ? 1 + (shot.sp - 1) * 0.45 : shot.sp;
    spread.current += (spT - spread.current) * kMove;

    // the moment the preloader lifts, the unfold clock starts (the 0.85s
    // offset lands the deal right as the curtain finishes rising)
    if (!reduced && loaded && introStart.current === null) introStart.current = t + 0.85;

    // the row opens for the footer dive: Q and V part to the sides,
    // K lifts up and back, clearing the lane the camera flies down
    const sp = spread.current;
    const open = sp - 1;
    cards.current.forEach((card, i) => {
      if (!card) return;
      const pose = CARD_POSE[i];
      const bob = reduced ? 0 : Math.sin(t * 0.55 + i * 2.1) * 0.045;

      // unfold ease: 0 = stacked deck, 1 = dealt row; mild back-ease so
      // each card overshoots a touch and settles with a flourish
      let e = 1;
      if (!reduced) {
        const st = introStart.current;
        if (st === null) e = 0;
        else {
          const u = Math.min(1, Math.max(0, (t - st - INTRO_DELAY[i]) / 1.35));
          const c = 1.1;
          e = 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
        }
      }

      const tx = pose.x * sp;
      const ty = pose.y + bob + (i === 1 ? open * 2.6 : 0);
      const tz = pose.z - (i === 1 ? open * 1.5 : 0);
      card.position.set(
        INTRO_STACK.x + (tx - INTRO_STACK.x) * e,
        INTRO_STACK.y + (ty - INTRO_STACK.y) * e,
        i * 0.07 + (tz - i * 0.07) * e
      );
      card.rotation.set(
        (pose.rx + (reduced ? 0 : Math.sin(t * 0.4 + i * 1.7) * 0.018)) * e,
        INTRO_STACK.ry + (pose.ry * sp - INTRO_STACK.ry) * e,
        pose.rz * sp * e
      );
    });

    // multiply signs + threads: appear once the row has dealt, retire
    // as it splits open for the dive (their anchors detach with spread)
    let introFx = 1;
    if (!reduced) {
      const st = introStart.current;
      const u = st === null ? 0 : Math.min(1, Math.max(0, (t - st - 1.3) / 0.6));
      introFx = u * u * (3 - 2 * u);
    }
    const fadeSp = Math.min(1, Math.max(0, 1 - open * 1.8));
    threadUniforms.uFade.value = introFx * fadeSp;
    crosses.current.forEach((cross, ci) => {
      if (!cross) return;
      const dir = ci === 0 ? -1 : 1;
      cross.position.set(CROSS_X * dir * sp, -0.05, 0.3);
      cross.scale.setScalar(Math.max(0.0001, introFx * fadeSp));
      if (!reduced) {
        cross.rotation.z = Math.sin(t * 0.5 + ci * 2) * 0.08;
        cross.rotation.y = Math.sin(t * 0.35 + ci) * 0.14;
      }
    });

    const px = state.pointer.x;
    const py = state.pointer.y;
    const ry = shot.ry + px * 0.16;
    const rx = shot.rx - py * 0.1;
    group.current.rotation.y += (ry - group.current.rotation.y) * kMove;
    group.current.rotation.x += (rx - group.current.rotation.x) * kMove;

    // contain-fit: project the row's bounding box through THIS shot's
    // camera distance, offset and rotation respected, then shrink until
    // the whole equation clears the frame. The footer's ct:0 keeps the
    // dive a dive.
    const cy = Math.abs(Math.cos(group.current.rotation.y));
    const sy = Math.abs(Math.sin(group.current.rotation.y));
    const cx2 = Math.abs(Math.cos(group.current.rotation.x));
    const sx2 = Math.abs(Math.sin(group.current.rotation.x));
    const hxE = ext.w * cy + ext.d * sy; // on-screen half-width after yaw
    const hzE = ext.w * sy + ext.d * cy; // half-depth after yaw
    const hyE = ext.h * cx2 + hzE * sx2; // on-screen half-height after pitch
    const camZ = mobile ? shot.mz : shot.z;
    const dist = camZ + 2.5; // group is parked at z −2.5
    const vH = Math.tan((60 * Math.PI) / 360) * dist; // fov matches <Canvas>
    const vW = vH * (state.size.width / state.size.height);
    const base = fanScale * shot.s;
    const ct = Math.min(1, Math.max(0, shot.ct));

    // y: desktop names a world offset. Mobile names a FRACTION of the
    // visible half-height (myf), because the camera dollies between
    // chapters — a fixed world offset that clears the copy at z 18 sits
    // clean off the top edge at the footer's z 6.2, which is exactly how
    // the finale went missing on phones.
    const drift = reduced ? 0 : Math.sin(t * 0.5) * 0.1;
    const yT = mobile ? vH * shot.myf + drift * 0.5 : 0.1 + shot.y + drift;
    // margins: 8% sides, 10% top/bottom (nav bar + hero HUD row)
    const fitY = (vH * 0.9 - Math.abs(yT)) / (hyE * base);

    // x: mobile stacks full-width, so the row stays centred where it reads
    // biggest. On desktop a shot names a world offset (shot.x) and/or PARKS
    // against a viewport edge (shot.pk = ∓1) — the quote chapters park so
    // the centre column stays clear for their copy at ANY window width,
    // where a fixed offset would overlap on narrow screens and strand the
    // row mid-frame on wide ones. pk blends 0→1 across a shot handover, so
    // both terms are weighted rather than switched.
    const offX = mobile ? 0 : shot.x;
    const pk = mobile ? 0 : Math.min(1, Math.abs(shot.pk));
    // a parked row sits flush at the edge, so it gets the full width
    // allowance; an offset one gets what its offset leaves behind
    const allowX = vW * 0.92 - Math.abs(offX) * (1 - pk);
    const fit = Math.max(0.3, Math.min(1, allowX / (hxE * base), fitY));
    const targetScale = base * (1 + (fit - 1) * ct);
    // push it as far aside as its final size allows — measured from the
    // scale, so there is no feedback loop between offset and fit. The row
    // is yawed, so its near end sits closer to the camera and projects
    // wider than the flat box the fit assumes; park against that near
    // depth or the leading card hangs off the edge on narrow windows.
    const nearDist = Math.max(1, dist - hzE * targetScale);
    const parkX = Math.max(0, (vW * 0.92 * nearDist) / dist - hxE * targetScale);
    const xT = offX * (1 - pk) + (mobile ? 0 : shot.pk) * parkX;

    group.current.position.x += (xT - group.current.position.x) * kMove;
    group.current.position.y += (yT - group.current.position.y) * kMove;
    group.current.scale.setScalar(
      group.current.scale.x + (targetScale - group.current.scale.x) * kMove
    );

    if (!reduced) {
      state.camera.position.z += (camZ - state.camera.position.z) * kCam;
    }
  });

  return (
    <group ref={group} scale={fanScale} position={[0, mobile ? 5.0 : 0.1, -2.5]}>
      {CARD_DEFS.map((def, i) => (
        <AttentionCard
          key={def.key}
          def={def}
          pose={CARD_POSE[i]}
          refFn={(el) => (cards.current[i] = el)}
          lightUniforms={lightUniforms}
        />
      ))}
      {/* machined multiply signs in the gaps — Q × K × V */}
      {[0, 1].map((i) => (
        <group key={i} ref={(el) => (crosses.current[i] = el)} position={[CROSS_X * (i === 0 ? -1 : 1), -0.05, 0.3]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.62, 0.16, 0.11]} />
            <meshStandardMaterial color="#cdd3dc" metalness={1} roughness={0.2} envMapIntensity={1.35} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.62, 0.16, 0.11]} />
            <meshStandardMaterial color="#cdd3dc" metalness={1} roughness={0.2} envMapIntensity={1.35} />
          </mesh>
        </group>
      ))}
      <lineSegments geometry={threadsGeo}>
        <shaderMaterial
          uniforms={threadUniforms}
          vertexShader={threadVertex}
          fragmentShader={threadFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <FloatingOrbs mobile={mobile} />
    </group>
  );
}

/* ---------------- ambient layers ---------------- */

const fieldVertex = /* glsl */ `
uniform float uTime;
attribute vec3 aColor;
attribute float aSpeed;
attribute float aSize;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec3 p = position;
  p.x = mod(p.x + uTime * aSpeed + 35.0, 70.0) - 35.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * (30.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const fieldFragment = /* glsl */ `
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vColor, a * 0.65);
}`;

function DataField({ mobile }) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const count = mobile ? 200 : 380;

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 26 - 8;
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
      speeds[i] = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.8);
      sizes[i] = 1.0 + Math.random() * 2.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return { geometry: geo, uniforms: { uTime: { value: 0 } } };
  }, [count]);

  useFrame((state) => {
    if (!reduced) uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={fieldVertex}
        fragmentShader={fieldFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Stars() {
  const ref = useRef();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const geometry = useMemo(() => {
    const n = 900;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 60 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, dt) => {
    if (!reduced && ref.current) ref.current.rotation.y += dt * 0.008;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#ffffff" size={0.22} transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}

function Glow({ mobile }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(120,150,190,0.26)');
    g.addColorStop(0.4, 'rgba(90,80,160,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <sprite scale={mobile ? 16 : 26} position={[0, 0, -10]}>
      <spriteMaterial map={texture} transparent opacity={0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

export default function Background() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  // live breakpoint — rotating a tablet or resizing the window resizes
  // the row at the right density instead of keeping the mount-time guess
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // shot anchors come from real layout. GSAP re-measures pins on font
  // swaps, image loads and resizes — all of it funnels through refresh,
  // so the rig re-measures on the same signal.
  useEffect(() => {
    measureRig();
    ScrollTrigger.addEventListener('refresh', measureRig);
    window.addEventListener('resize', measureRig);
    return () => {
      ScrollTrigger.removeEventListener('refresh', measureRig);
      window.removeEventListener('resize', measureRig);
    };
  }, []);

  return (
    <div id="bg">
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 60, position: [0, 0, 16], near: 0.1, far: 400 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        // opaque black clear — with a transparent canvas the additive
        // materials leave alpha≈0 and the whole scene composites away.
        // RoomEnvironment gives the chrome + glass a studio to reflect —
        // local, no CDN fetch.
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#030304', 1);
          const pmrem = new THREE.PMREMGenerator(gl);
          scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
          pmrem.dispose();
        }}
      >
        {/* neutral studio: white key, cool fills, faint cyan wash from
            behind — the chrome frames stay silver, not tinted */}
        <directionalLight position={[6, 8, 8]} intensity={1.2} />
        <pointLight color="#ffffff" intensity={30} distance={40} position={[-8, 3, 7]} />
        <pointLight color="#7f9dff" intensity={18} distance={40} position={[8, -2, 6]} />
        <pointLight color="#3fd4f4" intensity={12} distance={40} position={[0, 6, -4]} />
        <Glow mobile={mobile} />
        <CardFan mobile={mobile} />
        <DataField mobile={mobile} />
        <Stars />
      </Canvas>
    </div>
  );
}
