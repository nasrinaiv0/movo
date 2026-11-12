import * as THREE from 'three';
import { isInteracting, modalOpen } from './interaction';

/*
 * The MOVO ram: a small WebGL scene for the Home mascot. The model, texture and part weights live in
 * public/mascot (ram.bin + ram.jpg). Moods blend smoothly into one another:
 *   smile  – spending is comfortably inside its limits (hops, waves, ^ ^ eyes)
 *   cute   – the everyday idle (head tilts, blush, a little wave, toe taps)
 *   sad    – a limit is getting close (head down, ears droop, sighs, a tear)
 *   angry  – a limit has been passed (stomps, shakes a fist, steam, furrowed brows)
 * Arms, legs, head, ears and cape bend in the vertex shader from per-vertex weights, so nothing is rigged.
 * The face (brows, lids, mouths, blush) is drawn as small overlays that ride on the head.
 */

export const RAM_MOODS = ['smile', 'cute', 'sad', 'angry'];

const NECK = new THREE.Vector3(0, -0.1, 0.08);
const SHOULDER_L = new THREE.Vector3(-0.31, -0.3, 0.2);
const HAND_R = new THREE.Vector3(0.4, -0.45, 0.28);
const EYES = [{ x: -0.205, y: 0.17, w: 0.118, h: 0.088, side: -1 }, { x: 0.232, y: 0.19, w: 0.106, h: 0.082, side: 1 }];
const BROWS = [{ x: -0.178, y: 0.318, side: -1 }, { x: 0.16, y: 0.31, side: 1 }];
const MOUTH = { x: 0.016, y: 0.074 };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const bump = (p) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p));
const lerp = (a, b, t) => a + (b - a) * t;

/* --- poses: each mood returns the full pose for time t; the scene blends them by mood weight --- */
function basePose() {
  return { bodyY: 0, squash: 0, rotX: 0, rotZ: 0, rotY: 0, head: [0, 0, 0], armL: [0, 0, 0], armR: [0, 0, 0, 0], legL: [0, 0], legR: [0, 0], ear: 0, flap: 1, cloth: 1,
    browLift: 0, browTilt: 0, lid: 0, lidSlant: 0, happyEyes: 0, open: 0, smileLine: 0, frown: 0, frownW: 1, blush: 0.35, flush: 0, gloom: 0, wink: 0 };
}

function smilePose(t) {
  const p = basePose(); const cyc = (t % 2.6) / 2.6; const hop = bump(cyc / 0.32);
  p.bodyY = 0.085 * hop; p.squash = 0.045 * hop - 0.03 * bump((cyc - 0.32) / 0.12);
  p.rotZ = 0.05 * Math.sin(t * 2.4); p.rotY = 0.12 * Math.sin(t * 0.9);
  p.head = [-0.08, 0.06 * Math.sin(t * 1.2), 0.1 * Math.sin(t * 2.4)];
  p.armL = [-1.35, 0, -0.45 + 0.32 * Math.sin(t * 7.5)];
  p.armR = [0.05 * hop + 0.025 * Math.sin(t * 3), -0.08 * Math.sin(t * 2.4), 0, 0];
  p.legL = [0.035 * hop + 0.02 * Math.max(0, Math.sin(t * 5)), 0.01];
  p.legR = [0.035 * hop + 0.02 * Math.max(0, -Math.sin(t * 5)), 0.01];
  p.flap = 1.8; p.cloth = 1.4; p.browLift = 0.022; p.browTilt = -0.25;
  p.happyEyes = 1; p.open = 1; p.smileLine = 1; p.blush = 0.75;
  return p;
}

function cutePose(t) {
  const p = basePose(); const wave = (t % 7) / 7; const w = smooth(wave / 0.06) * (1 - smooth((wave - 0.3) / 0.08));
  p.bodyY = 0.012 * Math.sin(t * 2); p.squash = 0.012 * Math.sin(t * 2);
  p.rotZ = 0.05 * Math.sin(t * 1.3); p.rotY = 0.14 * Math.sin(t * 0.55);
  p.head = [-0.03, 0.1 * Math.sin(t * 0.5), 0.17 * Math.sin(t * 0.8)];
  p.armL = [-1.2 * w, 0, w * (-0.4 + 0.3 * Math.sin(t * 9))];
  p.armR = [0.012 * Math.sin(t * 2), 0, 0, 0];
  const tap = wave > 0.5 && wave < 0.8 ? 1 : 0;
  p.legR = [0.028 * tap * Math.max(0, Math.sin(t * 7)), 0.01 * tap];
  p.browLift = 0.012; p.browTilt = -0.2; p.smileLine = 1; p.blush = 1;
  const wk = (t % 5.3) / 5.3; p.wink = bump((wk - 0.62) / 0.09);
  return p;
}

function sadPose(t) {
  const p = basePose(); const sighC = (t % 5.5) / 5.5; const sigh = Math.pow(bump(sighC / 0.45), 2);
  p.bodyY = -0.012 * sigh; p.squash = -0.04 * sigh + 0.006 * Math.sin(t * 1.4);
  p.rotX = 0.07 + 0.02 * sigh; p.rotZ = 0.03 * Math.sin(t * 0.7); p.rotY = 0.06 * Math.sin(t * 0.35);
  p.head = [0.26 + 0.05 * sigh, -0.1 + 0.05 * Math.sin(t * 0.4), 0.07 * Math.sin(t * 0.6)];
  p.armL = [0.28, 0, 0.18 + 0.04 * Math.sin(t * 0.9)];
  p.armR = [-0.025, 0.1, 0.05, 0];
  const scuff = (t % 4.2) / 4.2; const s = bump((scuff - 0.55) / 0.3);
  p.legL = [0.012 * s, 0.035 * s * Math.sin(t * 6)];
  p.ear = 1; p.flap = 0.25; p.cloth = 0.5;
  p.browLift = 0.01; p.browTilt = -0.55; p.lid = 0.42; p.lidSlant = -0.28;
  p.frown = 1; p.frownW = 0.7; p.blush = 0.15; p.gloom = 1;
  return p;
}

function angryPose(t) {
  const p = basePose(); const ph = t * Math.PI * 2 / 1.1; const l = Math.max(0, Math.sin(ph)); const r = Math.max(0, -Math.sin(ph));
  const land = Math.pow(1 - Math.abs(Math.sin(ph)), 6);
  p.bodyY = 0.018 * (l + r) - 0.006 * land; p.squash = -0.025 * land;
  p.rotZ = 0.06 * Math.sin(ph) + 0.008 * Math.sin(t * 38); p.rotX = 0.04; p.rotY = 0.05 * Math.sin(t * 0.8);
  p.head = [0.1, 0.07 * Math.sin(t * 9), 0.03 * Math.sin(ph)];
  p.armL = [-1.05, 0, -0.55 + 0.16 * Math.sin(t * 15)];
  p.armR = [0.045 * Math.max(0, Math.sin(ph + 1.2)), -0.06, 0, 0];
  p.legL = [0.075 * Math.pow(l, 1.4), 0.015 * l]; p.legR = [0.075 * Math.pow(r, 1.4), 0.015 * r];
  p.flap = 0.6; p.cloth = 1.8;
  p.browLift = -0.012; p.browTilt = 0.6; p.lid = 0.33; p.lidSlant = 0.32;
  p.frown = 1; p.frownW = 1.15; p.blush = 0; p.flush = 1;
  return p;
}

const POSES = { smile: smilePose, cute: cutePose, sad: sadPose, angry: angryPose };

function blendPoses(weights, t) {
  const out = basePose(); Object.keys(out).forEach(k => { out[k] = Array.isArray(out[k]) ? out[k].map(() => 0) : 0; });
  RAM_MOODS.forEach(m => {
    const w = weights[m]; if (w < 0.001) return;
    const p = POSES[m](t);
    Object.keys(out).forEach(k => {
      if (Array.isArray(out[k])) out[k] = out[k].map((v, i) => v + p[k][i] * w);
      else out[k] += p[k] * w;
    });
  });
  return out;
}

/* --- asset loading --- */
async function loadModel(base) {
  const res = await fetch(`${base}ram.bin`);
  if (!res.ok) throw new Error('Mascot model unavailable');
  const buf = await res.arrayBuffer();
  const head = new DataView(buf);
  if (String.fromCharCode(head.getUint8(0), head.getUint8(1), head.getUint8(2), head.getUint8(3)) !== 'RAM1') throw new Error('Unknown mascot model');
  const nV = head.getUint32(4, true); const nI = head.getUint32(8, true);
  let o = 12; const take = (Ctor, count) => { o += (4 - (o % 4)) % 4; const a = new Ctor(buf, o, count); o += count * Ctor.BYTES_PER_ELEMENT; return a; };
  const pos = take(Int16Array, nV * 3); const nrm = take(Int8Array, nV * 3); const uv = take(Uint16Array, nV * 2);
  const w = take(Uint8Array, nV * 8); const idx = take(Uint16Array, nI);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos, v => v / 32767), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(nrm, v => v / 127), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(uv, v => v / 65535), 2));
  const w0 = new Float32Array(nV * 4); const w1 = new Float32Array(nV * 4);
  for (let i = 0; i < nV; i += 1) for (let k = 0; k < 4; k += 1) { w0[i * 4 + k] = w[i * 8 + k] / 255; w1[i * 4 + k] = w[i * 8 + 4 + k] / 255; }
  g.setAttribute('aw0', new THREE.BufferAttribute(w0, 4));
  g.setAttribute('aw1', new THREE.BufferAttribute(w1, 4));
  g.setIndex(new THREE.BufferAttribute(Uint16Array.from(idx), 1));
  g.computeBoundingSphere();
  return g;
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; resolve(t); }, undefined, reject);
  });
}

const DEFORM = `
attribute vec4 aw0; attribute vec4 aw1;
uniform float uT; uniform vec3 uHead; uniform vec3 uArmL; uniform vec4 uArmR; uniform vec4 uLegs;
uniform float uEar; uniform float uFlap; uniform float uCloth;
mat3 rotE(vec3 e){ float cx=cos(e.x),sx=sin(e.x),cy=cos(e.y),sy=sin(e.y),cz=cos(e.z),sz=sin(e.z);
  return mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx)*mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy)*mat3(cz,sz,0.,-sz,cz,0.,0.,0.,1.); }
`;
const DEFORM_BODY = `
vec3 dp = vec3(position); vec3 dn = vec3(normal); mat3 R;
float cw = aw0.x * uCloth;
dp.x += sin(uT*1.7+position.y*4.0+position.z*3.0)*.04*cw;
dp.z += cos(uT*1.4+position.x*3.5)*.035*cw;
dp.y += sin(uT*2.1+position.x*5.0)*.012*cw;
float sx = sign(position.x);
dp.y += sin(uT*2.4+sx)*.03*uFlap*aw0.y - uEar*.075*aw0.y*smoothstep(.0,.3,abs(position.x)-.4);
dp.x += sx*(sin(uT*2.4+sx)*.01*uFlap + uEar*.03)*aw0.y;
dp.x += sin(uT*2.0)*.03*aw0.z; dp.y += sin(uT*2.7)*.012*aw0.z;
dp += vec3(0., uLegs.x, uLegs.y)*aw1.z + vec3(0., uLegs.z, uLegs.w)*aw1.w;
R = rotE(uArmL*aw1.x); dp = R*(dp-vec3(${SHOULDER_L.x},${SHOULDER_L.y},${SHOULDER_L.z}))+vec3(${SHOULDER_L.x},${SHOULDER_L.y},${SHOULDER_L.z}); dn = R*dn;
R = rotE(vec3(uArmR.z,0.,uArmR.y)*aw1.y); dp = R*(dp-vec3(${HAND_R.x},${HAND_R.y},${HAND_R.z}))+vec3(${HAND_R.x},${HAND_R.y},${HAND_R.z})+vec3(0.,uArmR.x,0.)*aw1.y; dn = R*dn;
R = rotE(uHead*aw0.w); dp = R*(dp-vec3(${NECK.x},${NECK.y},${NECK.z}))+vec3(${NECK.x},${NECK.y},${NECK.z}); dn = R*dn;
vec3 objectNormal = normalize(dn);
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`;

function canvasTexture(size, draw) {
  const c = document.createElement('canvas'); c.width = size; c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const radial = (c0, c1) => canvasTexture(64, (x) => { const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, c0); r.addColorStop(1, c1); x.fillStyle = r; x.fillRect(0, 0, 64, 64); });

function spriteTextures() {
  return {
    heart: canvasTexture(64, (x) => { x.fillStyle = '#ff5d7d'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(2, 34, 10, 6, 32, 20); x.bezierCurveTo(54, 6, 62, 34, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(20, 22, 5, 3, -0.6, 0, 7); x.fill(); }),
    star: canvasTexture(64, (x) => { x.fillStyle = '#ffe08a'; x.beginPath(); for (let i = 0; i < 8; i += 1) { const a = i * Math.PI / 4; const r = i % 2 ? 7 : 30; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.closePath(); x.fill(); }),
    puff: canvasTexture(64, (x) => { x.fillStyle = 'rgba(255,255,255,.92)'; [[32, 36, 16], [20, 34, 12], [44, 34, 12], [28, 24, 11], [40, 26, 10]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }); }),
    anger: canvasTexture(64, (x) => { x.strokeStyle = '#e8273d'; x.lineWidth = 7; x.lineCap = 'round'; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j]) => { const sx = i ? 1 : -1; const sy = j ? 1 : -1; x.beginPath(); x.moveTo(32 + sx * 6, 32 + sy * 22); x.quadraticCurveTo(32 + sx * 6, 32 + sy * 6, 32 + sx * 22, 32 + sy * 6); x.stroke(); }); }),
    drop: canvasTexture(64, (x) => { const g = x.createLinearGradient(0, 8, 0, 58); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#5fb4ff'); x.fillStyle = g; x.beginPath(); x.moveTo(32, 6); x.bezierCurveTo(40, 22, 50, 32, 50, 42); x.arc(32, 42, 18, 0, Math.PI); x.bezierCurveTo(14, 32, 24, 22, 32, 6); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(26, 40, 4, 7, -0.3, 0, 7); x.fill(); }),
    gloom: canvasTexture(64, (x) => { x.strokeStyle = 'rgba(80,110,200,.85)'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 7; i += 1) { const px = 8 + i * 8; x.beginPath(); x.moveTo(px, 4); x.lineTo(px, 22 + (i % 2) * 10 + (i === 3 ? 10 : 0)); x.stroke(); } }),
  };
}

/**
 * Mounts the ram into `container`. Returns { setMood, poke, setActive, dispose }.
 * `still` renders single frames (reduced motion): the mood still shows, nothing loops.
 */
const FRAME_MS = 1000 / 30 - 2; // a 30 fps cap (with a little slack so 60 Hz screens hit every other frame)

export function createRamScene(container, { mood = 'cute', still = false, base = '/mascot/', onReady, onError } = {}) {
  let disposed = false; let active = true; let raf = 0; let ready = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); onError?.(new Error('WebGL context lost')); });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  cam.position.set(0, 0.12, 4.6); cam.lookAt(0, 0.04, 0);
  scene.add(new THREE.HemisphereLight(0xfff4ea, 0x8a5050, 2.7));
  const key = new THREE.DirectionalLight(0xffeedd, 2.6); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc0cc, 1.4); rim.position.set(-3, 2, -3); scene.add(rim);

  const fit = () => {
    const w = container.clientWidth; const h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (still && ready) renderOnce();
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null; ro?.observe(container); fit();

  const U = { uT: { value: 0 }, uHead: { value: new THREE.Vector3() }, uArmL: { value: new THREE.Vector3() }, uArmR: { value: new THREE.Vector4() }, uLegs: { value: new THREE.Vector4() }, uEar: { value: 0 }, uFlap: { value: 1 }, uCloth: { value: 1 } };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.08, side: THREE.DoubleSide });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = DEFORM + s.vertexShader.replace('#include <beginnormal_vertex>', DEFORM_BODY).replace('#include <begin_vertex>', 'vec3 transformed = dp;');
  };
  mat.customProgramCacheKey = () => 'movo-ram-v1';

  const rig = new THREE.Group(); rig.position.y = -0.93; scene.add(rig);
  const disposables = [mat];
  const track = (o) => { disposables.push(o); return o; };
  const tex = spriteTextures(); Object.values(tex).forEach(track);

  // smooth state
  const weights = { smile: 0, cute: 0, sad: 0, angry: 0 }; weights[RAM_MOODS.includes(mood) ? mood : 'cute'] = 1;
  let target = RAM_MOODS.includes(mood) ? mood : 'cute';
  let T = 0; let last = 0; let poke = -10; let pokeMood = target; let blinkAt = 1.5; let blinkP = -1; let nextFx = 0.6; let tearAt = 2;
  const fx = [];
  let parts = null;

  function spawn(map, pos, vel, life, size, opts = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0 }));
    s.position.copy(pos); scene.add(s);
    fx.push({ s, vel: vel.clone(), life, age: 0, size, ph: Math.random() * 6, spin: opts.spin || 0, grow: opts.grow || 0, gravity: opts.gravity || 0 });
  }
  function headPoint(x, y, z) { return parts.head.localToWorld(new THREE.Vector3(x, y, z).sub(NECK)); }

  function build(geo, map) {
    mat.map = map; mat.needsUpdate = true; track(geo); track(map);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.y = 0.93; mesh.frustumCulled = false; rig.add(mesh);
    rig.updateMatrixWorld(true);
    const head = new THREE.Group(); head.position.copy(NECK); head.rotation.order = 'XYZ'; mesh.add(head);
    const face = new THREE.Group(); face.position.copy(NECK).multiplyScalar(-1); head.add(face);

    const Z = new THREE.Vector3(0, 0, 1); const rc = new THREE.Raycaster(); const P = geo.attributes.position; const N = geo.attributes.normal;
    const local = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    function hit(x, y) {
      const o = new THREE.Vector3(x, y, 3).applyMatrix4(mesh.matrixWorld);
      rc.set(o, new THREE.Vector3(0, 0, -1));
      const h = rc.intersectObject(mesh)[0];
      if (!h) return { p: new THREE.Vector3(x, y, 0.5), n: Z.clone() };
      const f = h.face; const a = new THREE.Vector3().fromBufferAttribute(P, f.a); const b = new THREE.Vector3().fromBufferAttribute(P, f.b); const c = new THREE.Vector3().fromBufferAttribute(P, f.c);
      const p = h.point.clone().applyMatrix4(local); const w = new THREE.Vector3(); THREE.Triangle.getBarycoord(p, a, b, c, w);
      const n = new THREE.Vector3().fromBufferAttribute(N, f.a).multiplyScalar(w.x).addScaledVector(new THREE.Vector3().fromBufferAttribute(N, f.b), w.y).addScaledVector(new THREE.Vector3().fromBufferAttribute(N, f.c), w.z).normalize();
      return { p, n };
    }
    function place(o, x, y, off) { const h = hit(x, y); o.position.copy(h.p).addScaledVector(h.n, off); o.quaternion.setFromUnitVectors(Z, h.n); face.add(o); return o; }
    const INK = track(new THREE.MeshStandardMaterial({ color: 0x4a1c18, roughness: 0.5 }));
    const tube = (pts, r, m = INK) => { const g = track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 6, false)); return new THREE.Mesh(g, m); };
    const surfaceCurve = (fn, off = 0.008, n = 10) => { const pts = []; for (let i = 0; i <= n; i += 1) { const [x, y] = fn(i / n); const h = hit(x, y); pts.push(h.p.clone().addScaledVector(h.n, off)); } return pts; };
    const grouped = (cx, cy) => { const g = new THREE.Group(); g.userData.c = new THREE.Vector3(cx, cy, hit(cx, cy).p.z); face.add(g); return g; };

    // mouths: a soft single-curve smile (cute/smile), open smile + tongue, frown
    const smileLine = grouped(MOUTH.x, MOUTH.y - 0.02);
    smileLine.add(tube(surfaceCurve(t => { const u = t * 2 - 1; return [MOUTH.x + u * 0.048, MOUTH.y - 0.012 - 0.02 * (1 - u * u)]; }), 0.0055));
    const open = new THREE.Group(); face.add(open);
    const mouthMat = track(new THREE.MeshStandardMaterial({ color: 0x7a1620, roughness: 0.6, side: THREE.DoubleSide }));
    const tongueMat = track(new THREE.MeshStandardMaterial({ color: 0xff7f90, roughness: 0.6, side: THREE.DoubleSide }));
    const circle = track(new THREE.CircleGeometry(1, 28));
    const lowerHalf = track(new THREE.CircleGeometry(1, 28, Math.PI, Math.PI)); // flat top, round bottom: an open "D" smile
    const mouthHole = new THREE.Mesh(lowerHalf, mouthMat); const tongue = new THREE.Mesh(circle, tongueMat);
    const mh = hit(MOUTH.x, 0.066); mouthHole.position.copy(mh.p).addScaledVector(mh.n, 0.0065); mouthHole.quaternion.setFromUnitVectors(Z, mh.n); open.add(mouthHole);
    const th = hit(MOUTH.x, 0.04); tongue.position.copy(th.p).addScaledVector(th.n, 0.0075); tongue.quaternion.setFromUnitVectors(Z, th.n); open.add(tongue);
    const frown = grouped(MOUTH.x, MOUTH.y - 0.012);
    frown.add(tube(surfaceCurve(t => { const u = t * 2 - 1; return [MOUTH.x + u * 0.06, MOUTH.y - 0.03 + 0.026 * (1 - u * u)]; }), 0.0062));

    // brows
    const browMat = track(new THREE.MeshStandardMaterial({ color: 0x6b4331, roughness: 0.7 }));
    const browGeo = track(new THREE.CapsuleGeometry(0.0125, 0.062, 4, 10)); browGeo.rotateZ(Math.PI / 2); browGeo.scale(1, 1, 0.45);
    const brows = BROWS.map(b => { const g = place(new THREE.Group(), b.x, b.y, 0.018); const m = new THREE.Mesh(browGeo, browMat); g.add(m); return { g, m, side: b.side }; });

    // upper lids: a dome whose flat lower edge is the lid line, with a lash line along it
    const furMat = track(new THREE.MeshStandardMaterial({ color: 0xf6efea, roughness: 1 }));
    const lashMat = track(new THREE.MeshStandardMaterial({ color: 0x2c1714, roughness: 0.6 }));
    const dome = track(new THREE.CircleGeometry(1, 28, 0, Math.PI));
    const lashGeo = track(new THREE.CapsuleGeometry(0.0055, 1, 3, 6)); lashGeo.rotateZ(Math.PI / 2);
    const eyes = EYES.map(e => {
      const g = place(new THREE.Group(), e.x, e.y, 0.014);
      const pivot = new THREE.Group(); g.add(pivot);
      const lid = new THREE.Mesh(dome, furMat); lid.scale.set(e.w * 1.12, 0.001, 1); pivot.add(lid);
      const lash = new THREE.Mesh(lashGeo, lashMat); lash.scale.set(e.w * 2.05, 1, 1); lash.position.z = 0.002; pivot.add(lash);
      const pts = []; for (let i = 0; i <= 10; i += 1) { const u = (i / 10) * 2 - 1; pts.push(new THREE.Vector3(u * e.w * 0.62, 0.024 * (1 - u * u) - 0.01, 0.004)); }
      const arc = tube(pts, 0.0062); arc.visible = false; g.add(arc);
      return { ...e, g, pivot, lid, lash, arc };
    });

    // blush, anger flush, gloom lines
    const blushTex = track(radial('rgba(255,110,130,.95)', 'rgba(255,110,130,0)'));
    const flat = (map, w, h, opacity = 0) => new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
    const blushes = [[-0.27, 0.035], [0.29, 0.04]].map(([x, y]) => place(flat(blushTex, 0.2, 0.12), x, y, 0.012));
    const flush = place(flat(track(radial('rgba(255,60,70,.75)', 'rgba(255,60,70,0)')), 0.75, 0.42), 0.02, 0.2, 0.03);
    const gloom = place(flat(tex.gloom, 0.3, 0.16), 0.0, 0.37, 0.03);

    const anger = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex.anger, transparent: true, depthWrite: false, opacity: 0 })));
    anger.position.set(0.4, 0.48, 0.3).sub(NECK); anger.scale.setScalar(0.2); head.add(anger);
    const sweat = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex.drop, transparent: true, depthWrite: false, opacity: 0 })));
    sweat.position.set(0.36, 0.34, 0.42).sub(NECK); sweat.scale.set(0.085, 0.11, 1); head.add(sweat);

    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(1.9, 0.75)), track(new THREE.MeshBasicMaterial({ map: track(radial('rgba(40,5,10,.5)', 'rgba(40,5,10,0)')), transparent: true, depthWrite: false })));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.94; scene.add(shadow);

    parts = { mesh, head, smileLine, open, mouthHole, tongue, frown, brows, eyes, blushes, flush, gloom, anger, sweat, shadow };
  }

  const ease = (dt, rate) => 1 - Math.exp(-dt * rate);
  const scaleAbout = (g, s, sx = s) => { const c = g.userData.c; g.scale.set(Math.max(0.001, sx), Math.max(0.001, s), 1); g.position.set(c.x * (1 - g.scale.x), c.y * (1 - g.scale.y), 0); };

  function step(dt) {
    T += dt; U.uT.value = still ? 1.2 : T;
    const k = still ? 1 : ease(dt, 3.2);
    RAM_MOODS.forEach(m => { weights[m] += ((m === target ? 1 : 0) - weights[m]) * k; });
    const t = still ? 1.2 : T;
    const p = blendPoses(weights, t);
    const amp = still ? 0 : 1;

    // poke: a short, mood-flavoured reaction
    const pk = still ? 0 : bump((T - poke) / 1.1);
    if (pk > 0) {
      if (pokeMood === 'smile' || pokeMood === 'cute') { p.bodyY += 0.07 * pk; p.squash += 0.04 * pk; p.happyEyes = Math.max(p.happyEyes, pk > 0.2 ? 1 : 0); p.open = Math.max(p.open, pk); p.blush += 0.4 * pk; p.armL[0] = lerp(p.armL[0], -1.35, pk); p.armL[2] = lerp(p.armL[2], -0.45 + 0.32 * Math.sin(T * 9), pk); }
      if (pokeMood === 'sad') { p.head[0] = lerp(p.head[0], -0.12, pk); p.lid *= 1 - pk; p.ear *= 1 - 0.7 * pk; p.gloom *= 1 - pk; }
      if (pokeMood === 'angry') { p.head[1] += 0.18 * Math.sin(T * 16) * pk; p.bodyY += 0.03 * pk * Math.abs(Math.sin(T * 12)); p.legL[0] += 0.05 * pk * Math.max(0, Math.sin(T * 12)); p.legR[0] += 0.05 * pk * Math.max(0, -Math.sin(T * 12)); }
    }

    // body
    rig.position.y = -0.93 + p.bodyY * amp; const sy = 1 + p.squash * amp; const sxz = 1 - p.squash * 0.5 * amp;
    rig.scale.set(sxz, sy, sxz); rig.rotation.set(p.rotX, p.rotY * amp, p.rotZ * amp);
    const air = Math.max(0, p.bodyY * amp); parts.shadow.scale.setScalar(1 - air * 1.6); parts.shadow.material.opacity = 1 - air * 3;
    U.uHead.value.set(p.head[0], p.head[1] * amp, p.head[2] * amp); parts.head.rotation.set(U.uHead.value.x, U.uHead.value.y, U.uHead.value.z);
    U.uArmL.value.set(p.armL[0], p.armL[1], p.armL[2]); U.uArmR.value.set(p.armR[0], p.armR[1], p.armR[2], 0);
    U.uLegs.value.set(p.legL[0], p.legL[1], p.legR[0], p.legR[1]);
    U.uEar.value = p.ear; U.uFlap.value = p.flap * amp; U.uCloth.value = p.cloth * amp;

    // face
    if (!still && blinkP < 0 && T > blinkAt) { blinkP = 0; blinkAt = T + 2.2 + Math.random() * 3.2; }
    let blink = 0; if (blinkP >= 0) { blinkP += dt / 0.16; blink = Math.sin(Math.min(blinkP, 1) * Math.PI); if (blinkP >= 1) blinkP = -1; }
    const happy = smooth((p.happyEyes - 0.25) / 0.5);
    parts.eyes.forEach((e, i) => {
      const wink = i === 0 ? p.wink : 0;
      const close = Math.max(p.lid, blink, happy, wink);
      e.pivot.rotation.z = e.side * p.lidSlant * (1 - Math.max(blink, happy, wink));
      e.pivot.position.y = e.h - close * e.h * 2;
      e.lid.scale.y = Math.max(0.001, close * e.h * 2 + 0.03);
      e.lid.visible = close > 0.03; e.lash.visible = close > 0.12 && close < 0.9 && happy < 0.5;
      e.arc.visible = close > 0.85 && (happy > 0.5 || wink > 0.5);
    });
    parts.brows.forEach(b => { b.m.position.y = p.browLift; b.m.rotation.z = b.side * p.browTilt; });
    const sl = clamp01(p.smileLine); const fr = clamp01(p.frown);
    scaleAbout(parts.smileLine, sl * (1 + 0.35 * p.open), sl);
    parts.smileLine.visible = sl > 0.02 && p.open < 0.5;
    parts.mouthHole.scale.set(0.054, Math.max(0.001, 0.042 * p.open), 1); parts.tongue.scale.set(0.025, Math.max(0.001, 0.012 * p.open), 1);
    parts.open.visible = p.open > 0.02;
    scaleAbout(parts.frown, fr, fr * (p.frownW || 1));
    parts.frown.visible = fr > 0.02;
    parts.blushes.forEach(b => { b.material.opacity = clamp01(p.blush) * 0.85; });
    parts.flush.material.opacity = clamp01(p.flush) * 0.42;
    parts.gloom.material.opacity = clamp01(p.gloom) * 0.75;
    parts.anger.material.opacity = smooth(weights.angry * 1.4 - 0.3); parts.anger.scale.setScalar(0.19 + 0.02 * Math.sin(T * 6) * amp);
    parts.sweat.material.opacity = smooth(weights.sad * 1.4 - 0.3); parts.sweat.position.y = 0.44 - 0.02 * ((T * 0.4) % 1) * amp;

    // particles
    if (!still && T > nextFx) {
      const r = Math.random(); nextFx = T + 0.55 + Math.random() * 0.6;
      if (weights.smile > 0.5) { const a = Math.random() * 6.28; spawn(tex.star, new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.75 + 0.1, 0.3), new THREE.Vector3(0, 0.06, 0), 1.5, 0.08 + Math.random() * 0.07, { spin: 1 }); }
      else if (weights.cute > 0.5 && r < 0.35) spawn(tex.heart, headPoint(0.45 * (Math.random() < 0.5 ? -1 : 1), 0.55, 0.3), new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.32, 0), 2, 0.12 + Math.random() * 0.06);
      else if (weights.angry > 0.5) [-1, 1].forEach(sd => spawn(tex.puff, headPoint(sd * 0.55, 0.45, 0.05), new THREE.Vector3(sd * 0.18, 0.38, 0), 1.1, 0.13, { grow: 1.4 }));
      else if (weights.sad > 0.5 && T > tearAt) { tearAt = T + 3 + Math.random() * 2; spawn(tex.drop, headPoint(-0.27, 0.1, 0.5), new THREE.Vector3(0, -0.02, 0.02), 1.6, 0.06, { gravity: -0.35 }); }
    }
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      const f = fx[i]; f.age += dt; const q = f.age / f.life;
      if (q >= 1) { scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); continue; }
      f.vel.y += f.gravity * dt;
      f.s.position.x += (f.vel.x + Math.sin(T * 3 + f.ph) * 0.06) * dt; f.s.position.y += f.vel.y * dt; f.s.position.z += f.vel.z * dt;
      const sc = f.size * (f.spin ? 0.4 + 0.6 * Math.sin(q * Math.PI) : 0.6 + 0.5 * Math.min(1, q * 4)) * (1 + f.grow * q);
      f.s.scale.set(sc, sc, 1);
      f.s.material.opacity = Math.min(1, q * 6) * (q > 0.6 ? (1 - q) / 0.4 : 1);
      f.s.material.rotation = f.spin ? T * 2 + f.ph : Math.sin(T * 4 + f.ph) * 0.2;
    }
    renderer.render(scene, cam);
  }

  /*
   * Draw at most 30 times a second, and skip drawing while the person is touching or scrolling or a sheet or dialog
   * is open (lib/interaction.js): the idle animation then never competes with taps, scrolling or pop-ups.
   */
  function frame(now) {
    raf = 0; if (disposed || !active) return;
    if ((last && now - last < FRAME_MS) || isInteracting() || modalOpen()) { raf = requestAnimationFrame(frame); return; }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
    step(dt); raf = requestAnimationFrame(frame);
  }
  function start() { if (!ready || disposed || still || raf) return; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function renderOnce() { if (ready && !disposed) step(0); }

  Promise.all([loadModel(base), loadTexture(`${base}ram.jpg`)]).then(([geo, map]) => {
    if (disposed) { geo.dispose(); map.dispose(); return; }
    build(geo, map); ready = true; fit(); step(0);
    onReady?.(); if (still) renderOnce(); else start();
  }).catch((err) => { if (!disposed) onError?.(err); });

  return {
    setMood(next) {
      if (!RAM_MOODS.includes(next) || next === target) return;
      target = next; if (still) renderOnce();
    },
    poke() { poke = T; pokeMood = target; if (still) renderOnce(); },
    setActive(on) { active = !!on; if (active) start(); else stop(); },
    dispose() {
      disposed = true; stop(); ro?.disconnect();
      fx.forEach(f => f.s.material.dispose());
      disposables.forEach(d => d.dispose?.());
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    },
  };
}
