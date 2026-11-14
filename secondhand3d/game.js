/* Secondhand 3D · © 2026 Buggy Games YT. All rights reserved.
   Contact: BuggysFanMail@gmail.com
   Low-poly 3D remake of Secondhand. three.js (MIT) is bundled locally. */
import * as THREE from './three.module.min.js';

const SHA = window.SHA, SFX = SHA.sfx;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const QS = new URLSearchParams(location.search);

// ---------------------------------------------------------------- save
const SAVE_KEY = 'secondhand3d-save-v1', META_KEY = 'secondhand3d-meta-v1';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
let M = Object.assign({ ended: false, endName: '', endMins: 0, endDeaths: 0, slot1Taps: 0, muted: false, sens: 1, inv: false }, lsGet(META_KEY) || {});
let SAVED = lsGet(SAVE_KEY);
let S = null;
function newRun(name) {
  return { v: 1, name, hp: 6, maxHearts: 3, pieces: 0, keys: 0, pages: {}, flags: {}, deaths: 0, playMs: 0, area: 'village', spawn: 'start', taken: {} };
}
function save() { if (!S) return; lsSet(SAVE_KEY, S); SAVED = S; }
function saveMeta() { lsSet(META_KEY, M); }
const minsPlayed = () => Math.max(1, Math.round((S ? S.playMs : 0) / 60000));
function C() {
  if (!S) return 0;
  if (S.area !== 'village' && S.area !== 'hollow') return 3;
  if (S.flags.bellRung) return 3;
  if (S.pieces >= 3) return 2;
  if (S.pieces >= 1) return 1;
  return 0;
}
function localTime() { const d = new Date(); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; }
const fmt = s => s.replace(/\{N\}/g, S ? S.name : 'PLAYER').replace(/\{T\}/g, localTime()).replace(/\{M\}/g, String(minsPlayed())).replace(/\{P\}/g, String(Object.keys(S ? S.pages : {}).length));
const GL = '#%&@!?/\\|*$▓░▒';
function corrupt(s, amt) { if (!amt) return s; let o = ''; for (const ch of s) o += (ch !== ' ' && Math.random() < amt) ? GL[(Math.random() * GL.length) | 0] : ch; return o; }

// ---------------------------------------------------------------- renderer
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, 1, 0.1, 160);
scene.add(cam);
const U = {
  uSnap: { value: new THREE.Vector2(320, 150) }, uTime: { value: 0 }, uDrain: { value: 0 },
  uGlitch: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) },
};
const FRAG = `
#include <dithering_fragment>
{
  vec3 col = gl_FragColor.rgb;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l), uDrain) * uTint;
  if (uGlitch > 0.0) {
    vec2 b = floor(gl_FragCoord.xy / vec2(28.0, 10.0));
    float h = fract(sin(dot(b + floor(uTime * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
    if (h < uGlitch * 0.22) { vec2 c = floor(gl_FragCoord.xy / 4.0); col = mix(vec3(1.0, 0.0, 1.0), vec3(0.02), mod(c.x + c.y, 2.0)); }
    else if (h < uGlitch * 0.45) col = col.brg;
    else if (h < uGlitch * 0.55) col = vec3(1.0) - col;
  }
  float bay = mod(floor(gl_FragCoord.x), 2.0) * 0.5 + mod(floor(gl_FragCoord.y), 2.0) * 0.25;
  col = floor(col * 28.0 + bay) / 28.0;
  gl_FragColor.rgb = col;
}`;
function patch(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uSnap = U.uSnap; sh.uniforms.uTime = U.uTime; sh.uniforms.uDrain = U.uDrain; sh.uniforms.uGlitch = U.uGlitch; sh.uniforms.uTint = U.uTint;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nif (gl_Position.w > 0.0) { vec4 p = gl_Position; p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w; gl_Position = p; }');
    sh.fragmentShader = 'uniform float uTime;\nuniform float uDrain;\nuniform float uGlitch;\nuniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', FRAG);
  };
  m.customProgramCacheKey = () => 'sh3d';
  return m;
}
const MC = new Map();
function mat(col, o = {}) {
  const key = col + '|' + (o.basic ? 1 : 0) + '|' + (o.op || 1) + '|' + (o.vc ? 1 : 0) + '|' + (o.side || 0);
  if (MC.has(key) && !o.unique) return MC.get(key);
  const p = { color: new THREE.Color(col), flatShading: true };
  if (o.op && o.op < 1) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
  if (o.vc) { p.vertexColors = true; p.color = new THREE.Color(0xffffff); }
  if (o.side) p.side = THREE.DoubleSide;
  let m;
  if (o.basic) { delete p.flatShading; m = new THREE.MeshBasicMaterial(p); } else m = new THREE.MeshLambertMaterial(p);
  patch(m);
  if (!o.unique) MC.set(key, m);
  return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a3a2a, 1.1);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
sun.position.set(-30, 60, 20);
scene.add(hemi, sun, sun.target);
scene.fog = new THREE.Fog(0x8fb8d8, 25, 90);
scene.background = new THREE.Color(0x8fb8d8);

let VIEW_W = 640, VIEW_H = 300;
function resize() {
  const w = innerWidth, h = innerHeight;
  const sc = Math.max(1, Math.min(h, w) / (QS.has('hi') ? 900 : 300));
  VIEW_W = Math.round(w / sc); VIEW_H = Math.round(h / sc);
  renderer.setSize(VIEW_W, VIEW_H, false);
  cam.aspect = w / h; cam.fov = w < h ? 78 : 62; cam.updateProjectionMatrix();
  U.uSnap.value.set(VIEW_W / 2, VIEW_H / 2);
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- build helpers
let G = null;          // group being built
let A = null;          // area being built / active area
function add(m) { G.add(m); return m; }
function addCol(x, z, w, d, o = {}) { const c = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, low: !!o.low, off: false, tag: o.tag }; A.cols.push(c); return c; }
function box(w, h, d, col, x, y, z, o = {}) {
  const m = new THREE.Mesh(BOX, o.mat || mat(col, o));
  m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.dyn) m.userData.dyn = true;
  add(m);
  if (o.col) { const swap = o.ry && Math.abs(Math.sin(o.ry)) > 0.7; m.userData.col = addCol(x, z, swap ? d : w, swap ? w : d, o); }
  return m;
}
function cyl(rt, rb, h, seg, col, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), o.mat || mat(col, o));
  m.position.set(x, y + h / 2, z); add(m);
  if (o.col) A.circ.push({ x, z, r: Math.max(rt, rb) * (o.colR || 1), low: !!o.low });
  return m;
}
function house(x, z, w, d, wall, roof, o = {}) {
  const h = o.h || 3.2, ry = o.face || 0;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.userData.static = true; G.add(g);
  const prev = G; G = g;
  box(w, h, d, wall, 0, 0, 0);
  box(w + 0.3, 0.3, d + 0.3, '#5a4a3a', 0, 0, 0);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.72, 1, 4, 1), mat(roof));
  r.rotation.y = Math.PI / 4; r.scale.set(w * 1.02 + 0.5, o.roofH || 2.0, d * 1.02 + 0.5); r.position.y = h + (o.roofH || 2.0) / 2; g.add(r);
  box(1.1, 2.0, 0.12, o.door || '#3a2516', 0, 0, d / 2 + 0.03);
  const win = o.win || '#2a2a33';
  const wins = [];
  for (const sx of [-1, 1]) wins.push(box(0.8, 0.8, 0.1, win, sx * w * 0.3, 1.3, d / 2 + 0.04, { basic: o.winBasic, dyn: o.winDyn }));
  if (o.chimney) box(0.6, 1.6, 0.6, '#6a5a50', w * 0.25, h + 0.6, -d * 0.15);
  G = prev;
  const swap = Math.abs(Math.sin(ry)) > 0.7;
  addCol(x, z, (swap ? d : w) + 0.2, (swap ? w : d) + 0.2);
  return { g, wins };
}
function sign(x, z, text, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.userData.static = true; G.add(g);
  const prev = G; G = g;
  box(0.14, 1.0, 0.14, '#5a3e24', 0, 0, 0);
  box(1.2, 0.6, 0.1, '#8a6a42', 0, 0.85, 0.02);
  G = prev;
  A.circ.push({ x, z, r: 0.35, low: true });
  A.inter.push({ x, z, r: 1.8, label: 'Read', fn: () => say(typeof text === 'function' ? text() : text) });
  return g;
}
// instanced trees
function forest(list, o = {}) {
  const n = list.length; if (!n) return;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 1, 5), mat(o.dead ? '#3a3028' : '#5a3e28'), n);
  const top = o.dead ? null : new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), mat(o.col || '#2f5a32'), n * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  list.forEach((t, i) => {
    const h = t.h || 1;
    s.set(1, 1.6 * h, 1); p.set(t.x, 0.8 * h, t.z); q.identity(); m4.compose(p, q, s); trunk.setMatrixAt(i, m4);
    if (top) {
      e.set(0, t.r || 0, 0); q.setFromEuler(e);
      s.set(1.5 * h, 2.4 * h, 1.5 * h); p.set(t.x, 2.3 * h, t.z); m4.compose(p, q, s); top.setMatrixAt(i * 2, m4);
      s.set(1.1 * h, 2.0 * h, 1.1 * h); p.set(t.x, 3.4 * h, t.z); m4.compose(p, q, s); top.setMatrixAt(i * 2 + 1, m4);
    }
    if (!o.noCol) A.circ.push({ x: t.x, z: t.z, r: 0.45 });
  });
  G.add(trunk); if (top) G.add(top);
}

// ---------------------------------------------------------------- people
const PAL = {
  player: { h: '#1f9e8f', s: '#f2c8a0', c: '#d64541', p: '#2c3e70', b: '#3b2a1a', e: '#151515' },
  elder: { h: '#e8e8e8', s: '#e9bf98', c: '#6a4a8c', p: '#4a3466', b: '#2b1d10', e: '#151515', beard: 1 },
  kid: { h: '#7a4a22', s: '#f4cfa8', c: '#e8c23a', p: '#3a5aa0', b: '#3b2a1a', e: '#151515' },
  shop: { h: '#2a2420', s: '#d9a57c', c: '#3f8f5a', p: '#3a3a3a', b: '#222222', e: '#151515', apron: 1 },
  fisher: { h: '#c9c9c9', s: '#d9a57c', c: '#2f5f8f', p: '#3a3a3a', b: '#222222', e: '#151515', hat: 1 },
  wren: { h: '#22303c', s: '#b9cbd6', c: '#7fb2d9', p: '#2e4a66', b: '#1d2a36', e: '#0b0f14', op: 0.82 },
  statue: { h: '#8d8d8d', s: '#a7a7a7', c: '#7c7c7c', p: '#6c6c6c', b: '#575757', e: '#2a2a2a', bell: 1 },
  shadow: { h: '#09090c', s: '#09090c', c: '#09090c', p: '#09090c', b: '#09090c', e: '#e8e8e8', op: 0.9 },
  woman: { h: '#6a4a2a', s: '#e0b89a', c: '#8a6aa0', p: '#4a4a6a', b: '#333333', e: null },
};
function person(pal, sc = 1) {
  const g = new THREE.Group();
  const o = pal.op ? { op: pal.op } : {};
  const part = (w, h, d, col, x, y, z, parent) => { const m = new THREE.Mesh(BOX, mat(col, o)); m.scale.set(w, h, d); m.position.set(x, y, z); (parent || g).add(m); return m; };
  const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; };
  const legL = pivot(-0.13, 0.62, 0), legR = pivot(0.13, 0.62, 0);
  part(0.2, 0.5, 0.22, pal.p, 0, -0.27, 0, legL); part(0.2, 0.5, 0.22, pal.p, 0, -0.27, 0, legR);
  part(0.22, 0.12, 0.3, pal.b, 0, -0.56, 0.04, legL); part(0.22, 0.12, 0.3, pal.b, 0, -0.56, 0.04, legR);
  const body = part(0.5, 0.56, 0.3, pal.c, 0, 0.9, 0);
  if (pal.apron) part(0.4, 0.5, 0.04, '#d8d0bc', 0, 0.86, 0.16);
  const armL = pivot(-0.33, 1.14, 0), armR = pivot(0.33, 1.14, 0);
  part(0.15, 0.5, 0.17, pal.c, 0, -0.22, 0, armL); part(0.15, 0.5, 0.17, pal.c, 0, -0.22, 0, armR);
  part(0.14, 0.12, 0.15, pal.s, 0, -0.52, 0, armL); part(0.14, 0.12, 0.15, pal.s, 0, -0.52, 0, armR);
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); g.add(head);
  part(0.4, 0.4, 0.38, pal.s, 0, 0, 0, head);
  part(0.44, 0.14, 0.42, pal.h, 0, 0.2, -0.01, head);
  part(0.44, 0.3, 0.12, pal.h, 0, 0.03, -0.17, head);
  if (pal.hat) { part(0.6, 0.05, 0.6, '#6a5a3a', 0, 0.28, 0, head); part(0.38, 0.16, 0.38, '#6a5a3a', 0, 0.36, 0, head); }
  if (pal.beard) part(0.34, 0.18, 0.06, '#e8e8e8', 0, -0.14, 0.2, head);
  const eyes = [];
  if (pal.e) for (const sx of [-1, 1]) eyes.push(part(0.07, 0.08, 0.03, pal.e, sx * 0.09, 0.02, 0.195, head));
  let bell = null;
  if (pal.bell) { bell = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 6), mat(pal.c)); bell.position.set(0, -0.62, 0.08); armR.add(bell); armR.rotation.x = -0.6; }
  g.scale.setScalar(sc);
  g.userData = { legL, legR, armL, armR, head, body, eyes, walk: 0, pal };
  return g;
}
function animPerson(g, dt, speed) {
  const u = g.userData;
  if (speed > 0.1) u.walk += dt * (4 + speed * 1.6); else u.walk = lerp(u.walk, Math.round(u.walk / Math.PI) * Math.PI, Math.min(1, dt * 10));
  const s = Math.sin(u.walk) * Math.min(1, speed / 3) * 0.7;
  u.legL.rotation.x = s; u.legR.rotation.x = -s;
  if (!u.armBusy) { u.armL.rotation.x = -s * 0.8; if (!u.pal.bell) u.armR.rotation.x = s * 0.8; }
}
function setEyes(g, col) { for (const e of g.userData.eyes) e.material = mat(col, { basic: true }); }

// ---------------------------------------------------------------- input
const keys = {}, tapQ = {};
const held = { A: false, B: false, start: false, select: false };
const inp = { mx: 0, mz: 0, lookX: 0, lookY: 0, run: false };
let prevHeld = { A: false, B: false, start: false, select: false };
const pressed = { A: false, B: false, start: false, select: false };
const released = { A: false, B: false };
let touchMode = false, lastLookInput = -10;
const KEYMAP = { KeyJ: 'A', KeyZ: 'A', KeyK: 'B', KeyX: 'B', Space: 'B', Enter: 'start', Escape: 'start', KeyP: 'start', Tab: 'select', KeyM: 'select' };
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  keys[e.code] = true; if (KEYMAP[e.code] && !e.repeat) tapQ[KEYMAP[e.code]] = true;
  if (KEYMAP[e.code] || e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  audioWake();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// mouse look
let mouseDown = false, lastMX = 0, lastMY = 0, mlx = 0, mly = 0;
cv.addEventListener('mousedown', e => { if (touchMode) return; mouseDown = true; lastMX = e.clientX; lastMY = e.clientY; audioWake(); if (mode === 'play' && !document.pointerLockElement && cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (er) {} } });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('mousemove', e => {
  if (touchMode) return;
  if (document.pointerLockElement === cv) { mlx += e.movementX; mly += e.movementY; }
  else if (mouseDown) { mlx += e.clientX - lastMX; mly += e.clientY - lastMY; lastMX = e.clientX; lastMY = e.clientY; }
});
// touch
const touchEl = $('touch'), stickBase = $('stickBase'), stickKnob = $('stickKnob');
let stick = null, look = null, tlx = 0, tly = 0;
function enableTouch() { if (touchMode) return; touchMode = true; document.body.classList.add('touch'); layoutUI(); }
addEventListener('touchstart', () => { enableTouch(); audioWake(); }, { passive: true });
const mz = $('moveZone'), lz = $('lookZone');
mz.addEventListener('pointerdown', e => { e.preventDefault(); mz.setPointerCapture(e.pointerId); stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; stickBase.style.left = e.clientX + 'px'; stickBase.style.top = e.clientY + 'px'; stickBase.classList.add('on'); stickKnob.style.transform = 'translate(-50%,-50%)'; });
mz.addEventListener('pointermove', e => { if (!stick || e.pointerId !== stick.id) return; let dx = e.clientX - stick.x, dy = e.clientY - stick.y; const d = Math.hypot(dx, dy), mx = 50; if (d > mx) { dx *= mx / d; dy *= mx / d; } stick.dx = dx / mx; stick.dy = dy / mx; stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; });
const endStick = e => { if (stick && e.pointerId === stick.id) { stick = null; stickBase.classList.remove('on'); } };
mz.addEventListener('pointerup', endStick); mz.addEventListener('pointercancel', endStick);
lz.addEventListener('pointerdown', e => { e.preventDefault(); lz.setPointerCapture(e.pointerId); look = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
lz.addEventListener('pointermove', e => { if (!look || e.pointerId !== look.id) return; tlx += e.clientX - look.x; tly += e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; });
const endLook = e => { if (look && e.pointerId === look.id) look = null; };
lz.addEventListener('pointerup', endLook); lz.addEventListener('pointercancel', endLook);
const tbtn = {};
for (const [id, k] of [['btnA', 'A'], ['btnB', 'B'], ['btnStart', 'start'], ['btnSelect', 'select']]) {
  const el = $(id);
  const on = e => { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch (er) {} tbtn[k] = true; tapQ[k] = true; el.classList.add('on'); audioWake(); };
  const off = e => { tbtn[k] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
function pollInput() {
  let mx = 0, mzv = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) mzv -= 1; if (keys.KeyS || keys.ArrowDown) mzv += 1;
  const h = { A: false, B: false, start: false, select: false };
  for (const c in KEYMAP) if (keys[c]) h[KEYMAP[c]] = true;
  for (const k in tapQ) { if (tapQ[k]) h[k] = true; tapQ[k] = false; }
  for (const k in tbtn) if (tbtn[k]) h[k] = true;
  let lx = 0, ly = 0;
  if (keys.KeyQ) lx -= 9; if (keys.KeyE) lx += 9;
  if (stick) { mx += stick.dx; mzv += stick.dy; }
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const dz = v => Math.abs(v) < 0.18 ? 0 : v;
    mx += dz(gp.axes[0] || 0); mzv += dz(gp.axes[1] || 0);
    lx += dz(gp.axes[2] || 0) * 14; ly += dz(gp.axes[3] || 0) * 10;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed;
    if (b(0)) h.A = true; if (b(1) || b(2)) h.B = true; if (b(9)) h.start = true; if (b(8)) h.select = true;
    if (b(12)) mzv -= 1; if (b(13)) mzv += 1; if (b(14)) mx -= 1; if (b(15)) mx += 1;
  }
  const l = Math.hypot(mx, mzv); if (l > 1) { mx /= l; mzv /= l; }
  inp.mx = mx; inp.mz = mzv;
  const sens = M.sens || 1;
  inp.lookX = (mlx * 0.0032 + tlx * 0.009 + lx * 0.004) * sens;
  inp.lookY = (mly * 0.0026 + tly * 0.006 + ly * 0.004) * sens * (M.inv ? -1 : 1);
  if (mlx || mly || tlx || tly || lx || ly) lastLookInput = now;
  mlx = mly = tlx = tly = 0;
  for (const k in h) { pressed[k] = h[k] && !prevHeld[k]; held[k] = h[k]; }
  released.A = !h.A && prevHeld.A; released.B = !h.B && prevHeld.B;
  prevHeld = h;
}
let audioOn = false;
function audioWake() { if (SHA.init()) { audioOn = true; SHA.setMute(!!M.muted); } }

// ---------------------------------------------------------------- areas
const AREAS = {};
let seed = 1;
const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function makeArea(id, o) {
  A = Object.assign({ id, group: new THREE.Group(), cols: [], circ: [], inter: [], npcs: [], foes: [], items: [], spawns: {}, triggers: [],
    fog: [0x000000, 10, 40], song: null, bend: 0, light: 'day', lantern: false, height: () => 0, update: null, onEnter: null, bounds: null }, o);
  G = A.group; G.visible = false; scene.add(G);
  AREAS[id] = A;
  return A;
}
function ground(w, d, cols, x = 0, z = 0, segs = 24, jitter = 0.18) {
  const g = new THREE.PlaneGeometry(w, d, segs, segs); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), pz = pos.getZ(i);
    const edge = Math.abs(px) > w / 2 - 0.01 || Math.abs(pz) > d / 2 - 0.01;
    if (!edge) pos.setY(i, (srand() - 0.5) * jitter);
    c.set(cols[(srand() * cols.length) | 0]); colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.Mesh(g, mat('#ffffff', { vc: true })); m.position.set(x, 0, z); add(m); return m;
}
function patchStrip(x0, z0, x1, z1, wdt, col) {
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz);
  const m = box(wdt, 0.04, l, col, (x0 + x1) / 2, 0.0, (z0 + z1) / 2); m.rotation.y = Math.atan2(dx, dz); return m;
}
function npc(id, pal, x, z, ry, talk, sc = 1) {
  const m = person(PAL[pal], sc); m.position.set(x, 0, z); m.rotation.y = ry; add(m);
  const n = { id, mesh: m, x, z, ry, baseRy: ry, talk, t: Math.random() * 5 };
  A.npcs.push(n); A.circ.push({ x, z, r: 0.45 });
  A.inter.push({ x, z, r: 2.0, label: 'Talk', npc: n, fn: () => { n.facePlayer = 1.2; talk(n); } });
  return n;
}
function pickup(type, x, z, o = {}) {
  let m;
  if (type === 'heart') { m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat('#e04848', { basic: true })); }
  else if (type === 'key') { m = new THREE.Group(); const k1 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 4, 8), mat('#e8c23a', { basic: true })); k1.position.y = 0.25; const k2 = new THREE.Mesh(BOX, mat('#e8c23a', { basic: true })); k2.scale.set(0.08, 0.4, 0.08); m.add(k1, k2); }
  else if (type === 'page') { m = new THREE.Mesh(BOX, mat('#efe6cf', { basic: true })); m.scale.set(0.45, 0.6, 0.04); }
  else if (type === 'piece') { m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 6, 1, true, 0, Math.PI * 1.2), mat('#c9a24a', { side: 1 })); }
  else if (type === 'container') { m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mat('#ff6a6a', { basic: true })); }
  m.position.set(x, 0.8, z); m.userData.dyn = true; add(m);
  const it = Object.assign({ type, x, z, mesh: m, t: Math.random() * 6 }, o);
  A.items.push(it); return it;
}
function spawnPickup(type, x, z, o) { const pg = G, pa = A; G = area.group; A = area; const it = pickup(type, x, z, o); G = pg; A = pa; return it; }
function chest(x, z, give, flag, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = o.ry || 0; G.add(g);
  const prev = G; G = g;
  box(1.2, 0.7, 0.8, '#6a4422', 0, 0, 0); const lid = box(1.24, 0.25, 0.84, '#7a5230', 0, 0.7, 0); box(0.2, 0.25, 0.06, '#e8c23a', 0, 0.55, 0.43);
  G = prev;
  const c = { x, z, g, lid, flag, open: false };
  A.circ.push({ x, z, r: 0.6, low: true });
  const it = { x, z, r: 1.9, label: 'Open', chest: c, fn: () => {
    if (S.taken[flag]) return say([['', 'Empty.']]);
    S.taken[flag] = 1; c.open = true; lid.position.y = 1.05; lid.rotation.x = -0.9; SFX.chest(); give(); save();
  } };
  A.inter.push(it);
  c.inter = it; return c;
}
function torch(x, z, h, col) {
  box(0.16, 0.5, 0.16, '#3a2a1a', x, h, z);
  const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat(col, { basic: true })); f.position.set(x, h + 0.65, z); add(f);
  return f;
}

function mergeStatic(ar) {
  ar.group.updateMatrixWorld(true);
  const buckets = new Map(), remove = [];
  const visit = obj => { for (const ch of obj.children) {
    if (ch.isMesh && !ch.isInstancedMesh && !ch.userData.dyn) {
      const k = ch.material.uuid; if (!buckets.has(k)) buckets.set(k, { m: ch.material, geos: [] });
      const g = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone(); g.applyMatrix4(ch.matrixWorld); buckets.get(k).geos.push(g); remove.push(ch);
    } else if (ch.isGroup && ch.userData.static) visit(ch);
  } };
  visit(ar.group);
  for (const ch of remove) ch.removeFromParent();
  for (const { m, geos } of buckets.values()) {
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = m.vertexColors ? new Float32Array(n * 3) : null;
    let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (col && g.attributes.color) col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (col) bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bg.computeBoundingSphere();
    ar.group.add(new THREE.Mesh(bg, m));
  }
}

// ---------- MILLBROOK
function buildVillage() {
  seed = 7;
  makeArea('village', { song: 'village', light: 'day', bounds: [-62, 62, -62, 60], height: (x, z) => (Math.abs(x) < 1.3 && z > 21 && z < 42.2) ? 0.3 : 0 });
  ground(140, 88, ['#4f7a3a', '#55803e', '#4a7236', '#5a8540', '#4c7a3e'], 0, -26);
  ground(140, 9, ['#c8b48a', '#bfa97c', '#cdb98f'], 0, 21.5, 30, 0.05).position.y = 0.01;
  // lake
  const wg = new THREE.PlaneGeometry(140, 60, 28, 12); wg.rotateX(-Math.PI / 2);
  A.water = new THREE.Mesh(wg, mat('#2d5f86', { op: 0.82, unique: true })); A.water.position.set(0, -0.12, 54); A.water.userData.dyn = true; add(A.water);
  A.waterBase = Float32Array.from(wg.attributes.position.array);
  box(140, 0.1, 60, '#1a2f3a', 0, -2.4, 54);
  addCol(-35.6, 52, 68.7, 60); addCol(35.6, 52, 68.7, 60); addCol(0, 61.5, 3, 39);
  // dock
  for (let z = 21; z < 42; z += 0.7) box(2.5, 0.12, 0.6, z % 1.4 < 0.7 ? '#7a5a38' : '#6e5032', 0, 0.18, z + 0.3);
  for (let z = 23; z <= 41; z += 3.5) for (const sx of [-1.25, 1.25]) cyl(0.12, 0.12, 2.3, 5, '#4a3420', sx, -2, z);
  for (let z = 22; z <= 41.5; z += 0.1) {} // (posts done)
  addCol(-1.45, 33.4, 0.2, 17.6, { low: true }); addCol(1.45, 33.4, 0.2, 17.6, { low: true });
  // the bell frame
  const bf = new THREE.Group(); bf.position.set(0, 0.3, 39.6); G.add(bf);
  { const prev = G; G = bf; box(0.24, 3.2, 0.24, '#4a3420', -1.0, 0, 0); box(0.24, 3.2, 0.24, '#4a3420', 1.0, 0, 0); box(2.4, 0.26, 0.3, '#4a3420', 0, 3.1, 0);
    A.bellWhole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 0.9, 8, 1, true), mat('#b8923e', { side: 1 })); A.bellWhole.position.y = 2.45; bf.add(A.bellWhole);
    A.bellBroken = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 0.9, 8, 1, true, 0, Math.PI * 0.7), mat('#8a7040', { side: 1 })); A.bellBroken.position.y = 2.45; bf.add(A.bellBroken);
    G = prev; }
  A.bellFrame = bf;
  A.circ.push({ x: -1, z: 39.6, r: 0.25 }, { x: 1, z: 39.6, r: 0.25 });
  A.inter.push({ x: 0, z: 39.0, r: 2.0, label: 'Look', fn: bellTalk });
  // hatch (after the bell)
  A.hatch = new THREE.Group(); A.hatch.position.set(0, 0.31, 41.4); G.add(A.hatch);
  { const prev = G; G = A.hatch; box(1.6, 0.02, 1.0, '#000000', 0, 0, 0, { basic: true }); for (let i = 0; i < 4; i++) box(1.2, 0.08, 0.16, '#3a2a1a', 0, -0.2 - i * 0.35, -0.3 + i * 0.18); G = prev; }
  A.inter.push({ x: 0, z: 41.3, r: 1.6, label: 'Go down', cond: () => S.flags.bellRung, fn: () => { SFX.stairs(); goArea('b1', 'start'); } });
  // the lake figure
  A.ghost = person(PAL.wren, 0.95); A.ghost.position.set(2.6, -1.9, 41); A.ghost.rotation.y = Math.PI; add(A.ghost);
  A.ghost.userData.armR.rotation.x = -2.6;
  // village square + paths
  ground(16, 14, ['#b59f78', '#ad9670', '#bba57e'], 0, -3, 8, 0.04).position.y = 0.03;
  patchStrip(0, 3, 0, 21, 2.6, '#a8926c'); patchStrip(-6, -5, -13, -6.5, 2.2, '#a8926c'); patchStrip(6, -5, 13, -6.5, 2.2, '#a8926c');
  patchStrip(-7, 1, -14, 8, 2.0, '#a8926c'); patchStrip(7, 1, 14, 8, 2.0, '#a8926c'); patchStrip(0, -10, 0, -19, 2.2, '#a8926c');
  for (let i = 0; i < 9; i++) { const t = i / 8; patchStrip(lerp(-8, -44, t), lerp(-8, -44, t), lerp(-8, -44, t + 0.125), lerp(-8, -44, t + 0.125), 2.4, i % 2 ? '#9e8a64' : '#a8926c'); }
  // plinth + statue
  box(1.5, 0.6, 1.5, '#7a7a7a', 0, 0, -3, { col: true, low: true }); box(1.7, 0.12, 1.7, '#6a6a6a', 0, 0.6, -3);
  A.inter.push({ x: 0, z: -3, r: 2.2, label: 'Look', fn: () => {
    if (C() === 0) say([['', 'A stone statue of a child holding a little bell.'], ['', 'The plaque is worn smooth. You can only read a "W".']]);
    else say([['', 'The plinth is empty.'], ['', 'There are stone footprints in the grass, heading your way.', 0.05]]);
  } });
  // houses
  const elder = house(-13, -11, 6, 5, '#d8cbb0', '#7a3a2a', { chimney: true, win: '#e8c86a', winBasic: true, winDyn: true });
  house(13, -11, 6, 5, '#c9b89a', '#2f5a6a', { win: '#e8c86a', winBasic: true });
  box(2.2, 0.5, 0.12, '#3f8f5a', 13, 2.3, -8.4);
  A.wren = house(-15, 9, 5, 5, '#a8a49a', '#4a4a52', { face: Math.PI / 2, door: '#2a2a2a', win: '#14141a', winBasic: true });
  for (const k of [0, 1]) box(1.3, 0.12, 0.08, '#6a5032', -12.44, 1.2 + k * 0.5, 9, { ry: Math.PI / 2 + (k ? 0.4 : -0.4) });
  house(15, 9, 5.5, 5, '#d4c4a4', '#6a4a2a', { face: -Math.PI / 2, chimney: true, win: '#e8c86a', winBasic: true });
  house(0, -24, 7, 5, '#cbbfa8', '#3a4a6a', { win: '#e8c86a', winBasic: true });
  house(-26, -12, 5, 5, '#bfb39a', '#6a2a2a', { face: Math.PI / 2, win: '#2a2a33' });
  house(26, -10, 5, 5, '#c8b8a0', '#2a4a3a', { face: -Math.PI / 2, win: '#2a2a33' });
  A.elderWin = elder.wins;
  // fences + lamps
  for (let x = -30; x <= 30; x += 2) if (Math.abs(x) > 2) { box(0.12, 0.8, 0.12, '#6a5032', x, 0, 19.6); box(2, 0.1, 0.06, '#7a6040', x + 1 > 30 ? x : x + 1, 0.55, 19.6); }
  addCol(-16, 19.6, 28, 0.3, { low: true }); addCol(16, 19.6, 28, 0.3, { low: true });
  A.lamps = [];
  for (const [x, z] of [[-4, 3], [4, 3], [-3, 19], [3, 19], [-9, -9], [9, -9]]) {
    cyl(0.07, 0.09, 2.6, 5, '#2a2a2a', x, 0, z, { col: true, colR: 2 });
    const l = new THREE.Mesh(BOX, mat('#e8d08a', { basic: true, unique: true })); l.scale.set(0.3, 0.3, 0.3); l.position.set(x, 2.75, z); add(l); A.lamps.push(l);
  }
  // signs
  sign(3.2, 5, () => C() >= 2 ? [['', fmt('WELCOME HOME, {N}.'), 0.05]] : [['', 'MILLBROOK. Population: 4.']], 0);
  sign(-12, -14.5 + 9.5, [['', 'The Elder\'s house. Knock if you\'re lost.']], 0);
  sign(-22, -20, [['', 'THE HOLLOW: follow the path northwest.'], ['', 'Someone scratched underneath: "W went in. W came out different."']], Math.PI / 4);
  sign(2.2, 20.4, () => C() >= 1 ? [['', 'THE DOCK. Mind the edge.'], ['', 'Below, in smaller letters: "it waves back."', 0.04]] : [['', 'THE DOCK. Mind the edge.']], 0);
  // Wren's house: door, TV
  A.inter.push({ x: -12.2, z: 9, r: 1.8, label: 'Knock', fn: () => {
    const c = C();
    if (c === 0) say([['', 'Locked. Boards nailed across the door.'], ['', 'The mailbox says W. The rest of the name is scratched off.']]);
    else if (c === 1) say([['', 'Locked.'], ['', 'You can hear a TV inside. It\'s playing this game.'], ['', 'Someone in there is at the lake part.', 0.03]]);
    else say([['', 'Locked.'], ['', 'The TV inside says your name.'], ['', fmt('"{N}? Is that you? It\'s {T}. Come inside."'), 0.06]]);
  } });
  A.tv = new THREE.Mesh(BOX, mat('#6a8aff', { basic: true, unique: true })); A.tv.scale.set(0.1, 0.62, 0.62); A.tv.position.set(-12.43, 1.7, 7.5); add(A.tv);
  // page on Wren's porch
  A.page2 = pickup('page', -11.4, 11.2, { n: 2, flag: 'page2', cond: () => C() >= 1 });
  // the Hollow gate: a huge dead tree
  { const x = -48, z = -48;
    cyl(1.6, 2.6, 7.5, 7, '#3a3028', x, 0, z, { col: true, colR: 0.9 });
    for (let i = 0; i < 6; i++) { const b = box(0.4, 4, 0.4, '#3a3028', x + Math.cos(i) * 1.2, 5.2, z + Math.sin(i) * 1.2); b.rotation.z = Math.cos(i * 2.1) * 0.9; b.rotation.x = Math.sin(i * 1.7) * 0.9; }
    const hole = box(1.6, 2.4, 0.3, '#000000', x + 1.7, 0, z + 1.7, { basic: true }); hole.rotation.y = Math.PI / 4;
    A.inter.push({ x: x + 2.6, z: z + 2.6, r: 2.4, label: 'Enter', fn: () => {
      if (S.flags.hollowDone) return say([['', 'The hollow is quiet now. Something still breathes inside.']]);
      SFX.door(); goArea('hollow', 'entry');
    } });
    A.spawns.hollowGate = { x: x + 4, z: z + 4, yaw: Math.PI * 1.25 + Math.PI };
  }
  // trees
  const trees = [], dead = [];
  for (let i = 0; i < 520 && trees.length < 230; i++) {
    const x = srand() * 124 - 62, z = srand() * 82 - 62;
    const r = Math.hypot(x, z * 1.15);
    if (z > 17) continue;
    if (r < 31) continue;
    // keep the hollow path clear
    const t = clamp(((x + 8) * -1 + (z + 8) * -1) / 2 / 36, 0, 1.2); const px = -8 - 36 * t, pz = -8 - 36 * t;
    if (Math.hypot(x - px, z - pz) < 5 && t < 1.15) continue;
    if (Math.hypot(x + 48, z + 48) < 6) continue;
    const tr = { x, z, h: 0.8 + srand() * 0.7, r: srand() * 3 };
    if (Math.hypot(x + 46, z + 46) < 16 && srand() < 0.6) dead.push(tr); else trees.push(tr);
  }
  for (const [x, z] of [[-20, 4], [20, 2], [-22, -4], [21, -18], [-8, -32], [9, -33], [-30, 14], [32, 15], [-36, 16], [37, 12]]) trees.push({ x, z, h: 1 + srand() * 0.4, r: srand() * 3 });
  forest(trees); forest(dead, { dead: true });
  // NPCs
  npc('elder', 'elder', -9.5, -6.5, 0.6, talkElder);
  npc('shop', 'shop', 13, -7.6, -0.2, talkShop);
  npc('kid', 'kid', 6, 7, -0.8, talkKid, 0.72);
  npc('fisher', 'fisher', -6, 21.6, Math.PI, talkFisher);
  // bounds
  addCol(-63, 0, 2, 130); addCol(63, 0, 2, 130); addCol(0, -63, 130, 2);
  A.spawns.start = { x: 0, z: 12, yaw: 0 };
  A.spawns.bell = { x: 0, z: 36, yaw: 0 };
  A.onEnter = villageEnter; A.update = villageUpdate; A.map = mapVillage;
}

// ---------- THE HOLLOW
const CELL = 18;
function buildHollow() {
  seed = 99;
  makeArea('hollow', { song: 'hollow', light: 'dungeon', lantern: true, fog: [0x070a08, 8, 42] });
  const rooms = { r0: [0, 0], r1: [0, -1], r2: [1, -1], r3: [1, -2], r4: [0, -2], rb: [0, -3] };
  A.rooms = rooms;
  const links = [['r0', 'r1', 'open'], ['r1', 'r2', 'shut', 'r1clear'], ['r2', 'r3', 'shut', 'r2solved'], ['r3', 'r4', 'locked', 'r3door'], ['r4', 'rb', 'boss', 'bossdoor']];
  A.doors = [];
  const edgeKey = (a, b) => [a, b].sort().join('|');
  const linkOf = {};
  for (const l of links) linkOf[edgeKey(...rooms[l[0]].map(String), ...rooms[l[1]].map(String))] = l;
  const has = (gx, gy) => Object.values(rooms).some(r => r[0] === gx && r[1] === gy);
  const H = 4.2;
  const wallCol = '#4a4234', rootCol = '#4a3420';
  const findLink = (ax, ay, bx, by) => links.find(l => { const p = rooms[l[0]], q = rooms[l[1]]; return (p[0] === ax && p[1] === ay && q[0] === bx && q[1] === by) || (p[0] === bx && p[1] === by && q[0] === ax && q[1] === ay); });
  const wallSeg = (x, z, w, d) => box(w, H, d, wallCol, x, 0, z, { col: true });
  for (const [id, [gx, gy]] of Object.entries(rooms)) {
    const cx = gx * CELL, cz = gy * CELL, h = CELL / 2;
    ground(CELL, CELL, ['#2a2418', '#2f2a1c', '#262016', '#33291a'], cx, cz, 9, 0.08);
    // north and west always; south/east only when no neighbour
    const sides = [['n', 0, -1], ['w', -1, 0], ['s', 0, 1], ['e', 1, 0]];
    for (const [sd, dx, dy] of sides) {
      const nb = has(gx + dx, gy + dy);
      if ((sd === 's' || sd === 'e') && nb) continue;
      const link = nb ? findLink(gx, gy, gx + dx, gy + dy) : null;
      const gap = !!link || (id === 'r0' && sd === 's');
      const horiz = dy !== 0;
      const ex = cx + dx * h, ez = cz + dy * h;
      if (!gap) { horiz ? wallSeg(ex, ez, CELL + 1, 1) : wallSeg(ex, ez, 1, CELL + 1); }
      else {
        const seg = (CELL + 1 - 3) / 2;
        if (horiz) { wallSeg(cx - 1.5 - seg / 2, ez, seg, 1); wallSeg(cx + 1.5 + seg / 2, ez, seg, 1); box(3, 0.8, 1, wallCol, cx, H - 0.8, ez); }
        else { wallSeg(ex, cz - 1.5 - seg / 2, 1, seg); wallSeg(ex, cz + 1.5 + seg / 2, 1, seg); box(1, 0.8, 3, wallCol, ex, H - 0.8, cz); }
        if (link && link[2] !== 'open') {
          const d = box(horiz ? 3 : 0.5, H - 0.8, horiz ? 0.5 : 3, link[2] === 'locked' ? '#6a4a1a' : '#4a4a4a', ex, 0, ez, { col: true, dyn: true });
          if (link[2] === 'locked') box(horiz ? 0.6 : 0.56, 0.6, horiz ? 0.56 : 0.6, '#e8c23a', ex, 1.3, ez);
          const door = { flag: link[3], type: link[2], mesh: d, col: d.userData.col, x: ex, z: ez, open: false, y: 0 };
          A.doors.push(door);
          if (link[2] === 'locked') A.inter.push({ x: ex, z: ez, r: 2.2, label: 'Unlock', cond: () => !door.open, fn: () => {
            if (S.keys > 0) { S.keys--; S.taken[door.flag] = 1; SFX.unlock(); save(); } else { SFX.lock(); say([['', 'Locked. You need a key.']]); }
          } });
        }
      }
    }
    // decoration: roots on walls, torches
    for (let i = 0; i < 6; i++) {
      const side = i % 4, t = srand() * 14 - 7;
      const x = side === 0 ? cx + t : side === 1 ? cx + t : side === 2 ? cx - 8.2 : cx + 8.2;
      const z = side === 0 ? cz - 8.2 : side === 1 ? cz + 8.2 : cz + t;
      if (Math.abs(t) < 2.2) continue;
      const r = cyl(0.12, 0.3, 4.5, 5, rootCol, x, 0, z); r.rotation.z = (srand() - 0.5) * 0.6; r.rotation.x = (srand() - 0.5) * 0.6;
    }
    for (const [tx, tz] of [[-7.6, -8.3], [7.6, -8.3]]) torch(cx + tx, cz + tz, 1.8, '#ffb040');
  }
  // R0
  sign(3, 4, [['', 'THE HOLLOW.'], ['', 'Something grew here that should have stayed a seed.']]);
  A.spawns.entry = { x: 0, z: 6, yaw: 0 };
  A.triggers.push({ x0: -1.5, x1: 1.5, z0: 8.6, z1: 10, fn: () => { SFX.door(); goArea('village', 'hollowGate'); } });
  // R1: crawlers -> chest with key
  A.r1chest = chest(0, -18, () => { S.keys++; SFX.key(); say([['', 'You got a SMALL KEY.']]); }, 'hk1');
  // R2: block puzzle
  sign(16, -11.5, [['', 'Push the stone onto the plate.'], ['', 'If it gets stuck, leave the room and it will reset.']]);
  A.plate = box(2, 0.08, 2, '#8a6a2a', 22, 0.02, -22);
  A.block = { home: [18, -18], x: 18, z: -18, mesh: box(1.96, 1.8, 1.96, '#6a6458', 18, 0, -18, { dyn: true }), col: null, push: 0, dir: null, moving: 0, from: null, to: null };
  A.block.col = addCol(18, -18, 1.96, 1.96);
  // R3: page chest, wisps
  chest(22, -40, () => givePage(3), 'page3', { ry: -Math.PI / 2 });
  // R4: hearts + sign
  sign(-4, -31, [['', 'IT IS LISTENING.'], ['', 'Hit it in the eye when it looks at you.']]);
  // boss
  A.spawns.r4 = { x: 0, z: -32, yaw: 0 };
  A.spawns.boss = { x: 0, z: -46, yaw: 0 };
  A.onEnter = hollowEnter; A.update = hollowUpdate; A.map = mapHollow;
}

// ---------- THE UNDERNEATH
function buildB1() {
  seed = 13;
  makeArea('b1', { song: 'under', bend: 1.6, light: 'under', lantern: true, fog: [0x000000, 4, 26], floor: 'B1' });
  ground(6, 76, ['#1c2024', '#202428', '#181c20'], 0, -34, 4, 0.05);
  for (let z = 2; z > -72; z -= 4) { box(1, 3.6, 4, '#262b31', -3.5, 0, z); box(1, 3.6, 4, '#2a2f35', 3.5, 0, z); }
  addCol(-3.5, -34, 1, 76); addCol(3.5, -34, 1, 76); addCol(0, 4, 8, 1); addCol(0, -72.5, 8, 1);
  for (let z = -4; z > -70; z -= 9) { torch(-2.9, z, 1.6, '#4a8aff'); torch(2.9, z - 4.5, 1.6, '#4a8aff'); }
  A.figs = [];
  for (const z of [-16, -30, -46, -58]) { const f = person(PAL.shadow); f.position.set((srand() - 0.5) * 3, 0, z); f.rotation.y = 0; add(f); setEyes(f, '#e8e8e8'); A.figs.push({ mesh: f, gone: false, z }); }
  pickup('page', 1.6, -40, { n: 7, flag: 'page7' });
  box(2, 0.05, 2, '#000000', 0, 0.01, -69, { basic: true });
  A.inter.push({ x: 0, z: -69, r: 1.8, label: 'Go down', fn: () => { SFX.stairs(); floorSkip(); } });
  A.spawns.start = { x: 0, z: 1, yaw: 0 };
  A.onEnter = () => { placeStatueBehind(10); }; A.update = b1Update;
}
function buildB6() {
  seed = 66;
  makeArea('b6', { song: 'mem', bend: 1.0, light: 'mem', fog: [0x0a0a0c, 8, 34], floor: 'B6' });
  ground(26, 26, ['#56604a', '#5a644e', '#4e5844'], 0, 0, 12, 0.1);
  house(0, -10, 8, 5, '#9a968c', '#4a4a50', { win: '#202024', winBasic: true });
  for (const [x, z] of [[-5, -2], [0, -2.5], [5, -2]]) { box(2.6, 0.08, 1.2, '#c8c8c0', x, 0.8, z, { col: true, low: true }); for (const sx of [-1.1, 1.1]) box(0.06, 0.8, 1.0, '#8a8a8a', x + sx, 0, z); for (let i = 0; i < 4; i++) box(0.35, 0.12 + srand() * 0.3, 0.4, ['#7a6a5a', '#5a5a6a', '#6a5a4a', '#8a7a6a'][i], x - 0.9 + i * 0.6, 0.88, z + (srand() - 0.5) * 0.4); }
  box(0.9, 0.6, 0.6, '#a08050', -8, 0, 0, { col: true, low: true });
  A.cart = box(0.3, 0.05, 0.36, '#9a9aa2', 0.2, 0.88, -2.4);
  A.inter.push({ x: 0.2, z: -2.4, r: 1.8, label: 'Look', fn: () => say([['', 'A grey cartridge. No box.'], ['', fmt('The label says {N} in marker.')], ['', 'It\'s warm, like somebody was just holding it.', 0.04]]) });
  A.inter.push({ x: -8, z: 0, r: 1.8, label: 'Read', fn: () => say([['', 'A cardboard box: "GAMES $1 EACH. EVERYTHING MUST GO."']]) });
  npc('woman', 'woman', 4.5, -4, 0.3, n => say([['WOMAN', 'Everything goes. All of it.'], ['WOMAN', 'We can\'t keep looking at it every day.'], ['WOMAN', 'Especially that game. Take it. Please. One dollar.']], () => { if (!S.flags.b6) { S.flags.b6 = true; save(); SFX.secret(); toast('Somewhere behind you, stairs open.'); } }));
  const buyer = npc('buyer', 'player', -3, 2.5, Math.PI * 0.9, n => say([['???', 'One dollar? For an old game with no box?'], ['???', 'Somebody wrote on the label. SECONDHAND.'], ['???', '...okay. Deal.'], ['', 'The kid holding the cartridge looks a little like you.']]));
  buyer.mesh.traverse(o => { if (o.material) o.material = mat('#' + o.material.color.getHexString(), { op: 0.55 }); });
  A.stairs = box(2, 0.05, 2, '#000000', 0, 0.02, 8, { basic: true, dyn: true });
  A.inter.push({ x: 0, z: 8, r: 1.8, label: 'Go down', cond: () => S.flags.b6, fn: () => { SFX.stairs(); floorSkip2(); } });
  addCol(0, -13.5, 30, 1); addCol(0, 13.5, 30, 1); addCol(-13.5, 0, 1, 30); addCol(13.5, 0, 1, 30);
  A.spawns.start = { x: 0, z: 10, yaw: 0 };
  A.update = (dt) => { area.stairs.visible = !!S.flags.b6; };
}
function buildB10() {
  makeArea('b10', { song: 'void', bend: 0.6, light: 'void', fog: [0x000000, 6, 40], floor: 'B10' });
  const grid = new THREE.GridHelper(120, 60, 0x223344, 0x111a22); grid.position.y = -0.4; add(grid);
  box(120, 0.1, 120, '#000000', 0, -0.6, 0, { basic: true });
  for (let z = 6; z > -12.5; z -= 0.7) box(2.5, 0.12, 0.6, '#5a4a38', 0, 0.18, z);
  for (let z = 5; z >= -12; z -= 3.5) for (const sx of [-1.25, 1.25]) cyl(0.12, 0.12, 2.3, 5, '#3a2a20', sx, -2, z);
  addCol(-1.45, -3, 0.2, 20); addCol(1.45, -3, 0.2, 20); addCol(0, -13.4, 3, 0.4, { low: true }); addCol(0, 6.6, 3, 0.4, { low: true });
  A.height = () => 0.3;
  A.wrenNpc = npc('wren', 'wren', 0, -11.2, 0, talkWren);
  A.spawns.start = { x: 0, z: 5, yaw: 0 };
  A.update = b10Update;
}
function buildLakebed() {
  makeArea('lakebed', { light: 'water', fog: [0x0a2a3a, 2, 22] });
  ground(60, 60, ['#3a4a3a', '#34443a', '#2e3e34'], 0, 0, 12, 0.3);
  for (let z = -10; z <= 10; z += 0.7) box(2.5, 0.12, 0.6, '#1a2a2a', 0, 7, z);
  for (let z = -9; z <= 9; z += 3.5) for (const sx of [-1.25, 1.25]) cyl(0.12, 0.12, 7, 5, '#1a2a24', sx, 0, z);
  for (let i = 0; i < 30; i++) { const r = cyl(0.04, 0.08, 1.5 + Math.random() * 2, 4, '#2a4a2a', (Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20); r.rotation.z = (Math.random() - 0.5) * 0.4; }
  A.surface = box(60, 0.05, 60, '#3a7a9a', 0, 7.4, 0, { op: 0.5, dyn: true });
  A.me = person(PAL.player); A.me.position.set(0.5, 0, 2); add(A.me);
  A.wren = person(PAL.wren); A.wren.position.set(0, 7.2, 0); add(A.wren);
}

// ---------------------------------------------------------------- story text
const PAGES = {
  2: ['JUNE 5.', 'there\'s a kid in the village who says my name over and over. it\'s kind of funny.'],
  3: ['JUNE 9.', 'the statue moved. i KNOW it moved. i turned around and it was closer.'],
  7: ['JULY 2.', 'LAKE TRIP SATURDAY!!! i\'ll finish the game when i get back.'],
};
const PREV = () => M.ended && M.endName ? M.endName : 'Wren';
function givePage(n) { S.pages[n] = 1; SFX.page(); save(); say([['', 'You found a page from a diary. (' + Object.keys(S.pages).length + ' of 3)'], ['WREN', PAGES[n][0] + '  ' + PAGES[n][1]]]); }
function talkElder() {
  const c = C(), W = PREV();
  if (!S.flags.metElder) {
    S.flags.metElder = true; save();
    return say([['ELDER', 'Ah, a new face. What was your name again?'], ['ELDER', fmt('{N}. Hm. That\'s not the name I remember.')],
      ['ELDER', 'Never mind. The old bell at the end of the dock broke into three pieces.'],
      ['ELDER', 'One of them fell into THE HOLLOW. The dead tree up the path to the northwest.'],
      ['ELDER', 'The other two... I don\'t know. Somebody had them once.'],
      ['ELDER', 'Bring the pieces to the bell. Then everything can go back to how it was.'], ['ELDER', 'Press SELECT if you get lost. And keep an eye on the statue.']]);
  }
  if (c === 0) return say([['ELDER', 'The Hollow is northwest. Follow the path past the trees.'], ['ELDER', 'Swing your sword with B. Hold it, then let go, to spin.']]);
  if (c === 1) return say([['ELDER', 'You found one. Good, good.'], ['ELDER', 'Did the statue move? I could swear it was on its plinth this morning.'], ['ELDER', fmt('Don\'t let it get behind you, {N}.')]]);
  if (c === 2) return say([['ELDER', fmt('Your hands are shaking, {N}.')], ['ELDER', fmt('It\'s {T} where you are. Shouldn\'t you be asleep?'), 0.0], ['ELDER', W + ' used to play this late too.'], ['ELDER', 'Ring the bell. ' + W + ' wants to be let out.'], ['ELDER', 'I mean. ' + W + ' wants it fixed.'], ['ELDER', 'Same thing.', 0.2]]);
  return say([['ELDER', 'You rang it.'], ['ELDER', fmt('Go down, {N}. All the way down. Someone is waiting at the bottom.'), 0.1]]);
}
function talkKid() {
  const c = C(), W = PREV();
  if (c === 0) return say([['KID', 'Wanna know a secret?'], ['KID', 'If you stand at the end of the dock, you can see someone under the water.'], ['KID', 'They wave sometimes.']]);
  if (c === 1) return say([['KID', fmt('{N}! {N}! {N}!')], ['KID', '...sorry. I just like saying it.'], ['KID', 'Nobody new ever comes here.']]);
  return say([['KID', W + ' used to play with me every day.'], ['KID', 'Then ' + W + ' stopped coming.'], ['KID', fmt('You\'ve been here {M} minutes. Are you going to stop coming too?'), 0.03]]);
}
function talkShop() {
  const c = C();
  if (c === 0) return say([['SHOPKEEPER', 'Shop\'s closed. Been closed for a while.'], ['SHOPKEEPER', fmt('Somebody wrote in my ledger: WREN FOUND {P} OF 3 PAGES.')], ['SHOPKEEPER', 'Pages of what, I wonder.']]);
  if (c === 1) return say([['SHOPKEEPER', fmt('We don\'t get many new players, {N}.')], ['SHOPKEEPER', 'Last one never finished.']]);
  return say([['SHOPKEEPER', 'You bought this at a yard sale, didn\'t you?'], ['SHOPKEEPER', 'One dollar. No box. Name on the label in marker.'], ['SHOPKEEPER', 'That\'s how it always gets passed on.', 0.04]]);
}
function talkFisher() {
  const c = C();
  if (c === 0) return say([['FISHER', 'Don\'t fish off the dock.'], ['FISHER', 'Something under there takes the bait and gives it back.']]);
  if (c === 1) return say([['FISHER', 'It gave my hook back again today.'], ['FISHER', 'There was a hair tie on it. A kid\'s.']]);
  if (c === 2) return say([['FISHER', 'The water\'s colder than it should be.'], ['FISHER', fmt('It\'s {T}, {N}. Nobody swims at {T}.'), 0.05]]);
  return say([['FISHER', '...'], ['FISHER', 'It\'s not waving anymore. It\'s pointing at you.', 0.08]]);
}
function bellTalk() {
  if (S.flags.bellRung) return say([['', 'The bell is whole. The water under the dock is moving.']]);
  if (S.pieces < 3) return say([['', 'An old bell, cracked open.'], ['', 'Pieces are missing. (' + S.pieces + ' of 3)']]);
  say([['', 'You fit the three pieces together.'], ['', 'Ring the bell?']], () => {
    S.flags.bellRung = true; save();
    AREAS.village.bellWhole.visible = true; AREAS.village.bellBroken.visible = false; AREAS.village.hatch.visible = true;
    SFX.bell(false); setTimeout(() => SFX.bell(true), 2400); shake = 0.6; glitchKick(0.9);
    setTimeout(() => { applyLight(); setSong(); toast('Something opened under the dock.'); }, 2600);
  });
}
function talkWren() { if (!S.flags.metWren) ending(); }

// ---------------------------------------------------------------- dialog
let dlg = null;
const dlgEl = $('dlg'), dlgWho = $('dlgWho'), dlgText = $('dlgText'), dlgMore = $('dlgMore');
function say(lines, cb) {
  dlg = { lines, i: -1, cb, txt: '', shown: 0, done: false };
  nextLine();
}
function sayP(lines) { return new Promise(r => say(lines, r)); }
function nextLine() {
  dlg.i++;
  if (dlg.i >= dlg.lines.length) { const cb = dlg.cb; dlg = null; dlgEl.classList.remove('show'); aConsumed = true; if (cb) cb(); return; }
  const [who, text, amt] = dlg.lines[dlg.i];
  const c = C();
  const a = amt != null ? amt : (c >= 2 && who && who !== 'WREN' ? 0.012 * c : 0);
  dlg.txt = corrupt(fmt(text), a); dlg.shown = 0; dlg.done = false;
  dlgWho.textContent = who ? corrupt(who, a * 2) : '';
  dlgEl.classList.toggle('glitchy', a > 0.02);
  dlgEl.classList.add('show'); dlgMore.style.visibility = 'hidden';
  SFX.blip();
}
function dlgUpdate(dt) {
  if (!dlg) return;
  if (!dlg.done) { dlg.shown += dt * 48; if (dlg.shown >= dlg.txt.length) { dlg.shown = dlg.txt.length; dlg.done = true; dlgMore.style.visibility = 'visible'; } dlgText.textContent = dlg.txt.slice(0, Math.floor(dlg.shown)); }
  if (pressed.A || pressed.B) { if (!dlg.done) { dlg.shown = dlg.txt.length; } else nextLine(); }
}
let toastT = 0;
function toast(s, t = 2.6) { const el = $('toast'); el.textContent = s; el.classList.add('show'); toastT = t; }

// ---------------------------------------------------------------- player + world state
let mode = 'title', now = 0, last = 0, shake = 0, aConsumed = false;
let area = null;
const P = { x: 0, z: 0, y: 0, face: 0, speed: 0, inv: 0, kbx: 0, kbz: 0, kbt: 0, swingT: -1, spinT: -1, bT: 0, ready: false, hitSet: new Set(), wx: 0, wz: 0, stepPh: 0, mesh: null, sword: null, back: null };
let camYaw = 0, camPitch = 0.34, camDist = 6.2, camOverride = null;
const lantern = new THREE.PointLight(0xffc890, 0, 16, 1.4);
scene.add(lantern);
function buildPlayer() {
  P.mesh = person(PAL.player);
  const piv = new THREE.Group(); piv.position.set(0, 1.0, 0); P.mesh.add(piv);
  const blade = new THREE.Mesh(BOX, mat('#dfe6ee', { basic: true })); blade.scale.set(0.07, 0.05, 1.05); blade.position.set(0, 0, 0.95); piv.add(blade);
  const hilt = new THREE.Mesh(BOX, mat('#6a4a2a')); hilt.scale.set(0.3, 0.07, 0.08); hilt.position.set(0, 0, 0.38); piv.add(hilt);
  piv.visible = false; P.sword = piv;
  const back = new THREE.Mesh(BOX, mat('#b8c0c8')); back.scale.set(0.06, 0.9, 0.05); back.position.set(0.12, 1.0, -0.2); back.rotation.z = 0.5; P.mesh.add(back); P.back = back;
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 8), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; P.mesh.add(sh);
}
const statue = { mesh: null, x: 0, z: -3, active: false, steps: 0, grindT: 0, moving: false };
function buildStatue() { statue.mesh = person(PAL.statue, 1.02); }
function placeStatueOnPlinth() { const m = statue.mesh; m.position.set(0, 0.72, -3); m.rotation.y = 0; setEyes(m, '#2a2a2a'); AREAS.village.group.add(m); statue.active = false; }
function placeStatueBehind(dist) {
  const d = dist || Math.max(9, 22 - statue.steps * 1.5);
  area.group.add(statue.mesh);
  setEyes(statue.mesh, C() >= 3 ? '#ff2020' : '#2a2a2a');
  const back = camYaw; // camera direction = behind the player
  for (let i = 0; i < 24; i++) {
    const a = back + rnd(-0.9, 0.9), r = d + rnd(-2, 2);
    const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
    if (!freeSpot(x, z, 0.6) || !inBounds(x, z)) continue;
    statue.x = x; statue.z = z; statue.active = true; statue.mesh.position.set(x, area.height(x, z), z); return;
  }
  statue.x = P.x + Math.sin(back) * d; statue.z = P.z + Math.cos(back) * d; statue.active = true;
  statue.mesh.position.set(statue.x, 0, statue.z);
}
function inBounds(x, z) { const b = area.bounds; return !b || (x > b[0] && x < b[1] && z > b[2] && z < b[3]); }
function freeSpot(x, z, r) {
  for (const c of area.cols) if (!c.off && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
  for (const c of area.circ) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false;
  return true;
}
function solve(o, r) {
  for (const c of area.circ) {
    const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 1e-6) { o.x = c.x + dx / d * m; o.z = c.z + dz / d * m; }
  }
  for (const b of area.cols) {
    if (b.off) continue;
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1);
    const dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-10) { const d = Math.sqrt(d2); o.x = cx + dx / d * r; o.z = cz + dz / d * r; }
    else { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bb = b.z1 - o.z, m = Math.min(l, rr, t, bb);
      if (m === l) o.x = b.x0 - r; else if (m === rr) o.x = b.x1 + r; else if (m === t) o.z = b.z0 - r; else o.z = b.z1 + r; }
  }
}
function segHit(ax, az, bx, bz, pad = 0.15) {
  let best = 1;
  const dx = bx - ax, dz = bz - az;
  for (const b of area.cols) {
    if (b.off || b.low) continue;
    const x0 = b.x0 - pad, x1 = b.x1 + pad, z0 = b.z0 - pad, z1 = b.z1 + pad;
    if (ax > x0 && ax < x1 && az > z0 && az < z1) continue;
    let t0 = 0, t1 = 1;
    if (Math.abs(dx) < 1e-9) { if (ax < x0 || ax > x1) continue; } else { let a = (x0 - ax) / dx, c = (x1 - ax) / dx; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); }
    if (Math.abs(dz) < 1e-9) { if (az < z0 || az > z1) continue; } else { let a = (z0 - az) / dz, c = (z1 - az) / dz; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); }
    if (t0 <= t1 && t0 < best) best = t0;
  }
  const L2 = dx * dx + dz * dz;
  if (L2 > 1e-9) for (const c of area.circ) {
    if (c.r < 0.9 || c.low) continue;
    const r = c.r + pad, fx = ax - c.x, fz = az - c.z;
    const bq = 2 * (fx * dx + fz * dz), cq = fx * fx + fz * fz - r * r;
    if (cq < 0) continue;
    const disc = bq * bq - 4 * L2 * cq; if (disc < 0) continue;
    const t = (-bq - Math.sqrt(disc)) / (2 * L2);
    if (t >= 0 && t < best) best = t;
  }
  return best;
}

// ---------------------------------------------------------------- lighting / music / area switching
const fadeEl = $('fade');
const wait = ms => new Promise(r => setTimeout(r, ms));
function applyLight() {
  const c = C(), L = area.light;
  let bg = 0x000000, f0 = 10, f1 = 40, hI = 1, hC = 0xcfe3ff, hG = 0x4a3a2a, sI = 1.4, sC = 0xfff1d6, lan = 0, lanC = 0xffc890;
  if (L === 'day') {
    if (c === 0) { bg = 0x8fb8d8; f0 = 30; f1 = 95; hI = 1.15; sI = 1.7; }
    else if (c === 1) { bg = 0x8a929c; f0 = 22; f1 = 78; hI = 0.95; sI = 1.0; sC = 0xe8e0d0; hC = 0xb8c4d0; }
    else if (c === 2) { bg = 0x3a2432; f0 = 12; f1 = 58; hI = 0.6; hC = 0xb090c0; hG = 0x302030; sI = 0.7; sC = 0xff7050; lan = 6; }
    else { bg = 0x05060a; f0 = 6; f1 = 34; hI = 0.32; hC = 0x5070a0; hG = 0x101018; sI = 0.25; sC = 0x8090ff; lan = 10; lanC = 0x9fb8ff; }
  } else {
    bg = area.fog[0]; f0 = area.fog[1]; f1 = area.fog[2];
    if (L === 'dungeon') { hI = 0.85; hC = 0xd8c0a0; hG = 0x302418; sI = 0.35; lan = 22; }
    if (L === 'under') { hI = 0.45; hC = 0x6080c0; hG = 0x080810; sI = 0.1; sC = 0x6080ff; lan = 12; lanC = 0x9fb8ff; }
    if (L === 'mem') { hI = 0.7; hC = 0xc8c0b0; hG = 0x302820; sI = 0.5; sC = 0xd8c8b0; }
    if (L === 'void') { hI = 0.5; hC = 0x8090a0; sI = 0.15; lan = 9; lanC = 0xc0d0ff; }
    if (L === 'water') { hI = 0.9; hC = 0x60c0d0; hG = 0x103020; sI = 0.8; sC = 0x90e0ff; }
  }
  scene.background.setHex(bg); scene.fog.color.setHex(bg); scene.fog.near = f0; scene.fog.far = f1;
  hemi.intensity = hI; hemi.color.setHex(hC); hemi.groundColor.setHex(hG); sun.intensity = sI; sun.color.setHex(sC);
  lantern.intensity = lan; lantern.color.setHex(lanC);
  baseBg = bg;
}
let baseBg = 0;
function bendFor() {
  const c = C();
  if (area.id === 'village') return [0, 0.8, 1.8, 2.7][c];
  if (area.id === 'hollow') return c * 0.45;
  return area.bend || 0;
}
function setSong(name) {
  if (!area) return;
  let n = name || area.song;
  if (area.id === 'village' && C() >= 3) n = 'under';
  if (area.id === 'hollow' && area.bossFight) n = 'boss';
  if (n) SHA.setSong(n, bendFor()); else SHA.stop();
}
let switching = false;
async function goArea(id, spawn, o = {}) {
  if (switching) return; switching = true;
  if (!o.noFade) { fadeEl.classList.add('on'); await wait(420); }
  if (area) area.group.visible = false;
  for (const f of area ? area.foes : []) if (f.mesh) f.mesh.removeFromParent();
  if (area) area.foes = [];
  area = AREAS[id]; area.group.visible = true;
  area.group.add(P.mesh);
  const sp = typeof spawn === 'object' ? spawn : area.spawns[spawn] || area.spawns.start || { x: 0, z: 0, yaw: 0 };
  P.x = sp.x; P.z = sp.z; P.face = (sp.yaw || 0) + Math.PI; camYaw = sp.yaw || 0; camPitch = 0.34;
  P.kbt = 0; P.swingT = P.spinT = -1; P.inv = 0;
  statue.active = false; if (statue.mesh) statue.mesh.removeFromParent();
  S.area = id; S.check = { area: id, x: P.x, z: P.z, yaw: camYaw };
  if (id === 'village' || id === 'hollow' || id === 'b1') save();
  $('floorTag').textContent = area.floor || '';
  applyLight();
  if (area.onEnter) area.onEnter();
  setSong();
  switching = false;
  if (!o.noFade) fadeEl.classList.remove('on');
}

// ---------------------------------------------------------------- particles
const parts = [];
const PG = new THREE.BoxGeometry(0.12, 0.12, 0.12);
function puff(x, y, z, col, n = 8, sp = 3) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(PG, mat(col, { basic: true })); m.position.set(x, y, z); area.group.add(m);
    parts.push({ m, vx: rnd(-sp, sp), vy: rnd(1, sp * 1.4), vz: rnd(-sp, sp), t: rnd(0.4, 0.8) });
  }
}
function partsUpdate(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t -= dt; p.vy -= 9 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    p.m.scale.setScalar(Math.max(0.01, p.t * 1.5));
    if (p.t <= 0) { p.m.removeFromParent(); parts.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- foes
const WHITE = () => mat('#ffffff', { basic: true });
function mkFoe(type, x, z, room) {
  const g = new THREE.Group();
  const f = { type, x, z, room, hp: type === 'crawler' ? 2 : 1, r: type === 'crawler' ? 0.5 : 0.4, mesh: g, vx: 0, vz: 0, t: rnd(0, 2), stun: 0, cd: rnd(1, 2), lunge: 0, flash: 0, mats: [] };
  if (type === 'crawler') {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat('#3a2418')); b.scale.set(1, 0.6, 1.2); b.position.y = 0.42; g.add(b);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(BOX, mat('#24160e')); l.scale.set(0.6, 0.06, 0.06); const s = i < 3 ? -1 : 1; l.position.set(s * 0.45, 0.28, -0.3 + (i % 3) * 0.3); l.rotation.z = s * 0.5; g.add(l); }
    for (const sx of [-0.13, 0.13]) { const e = new THREE.Mesh(BOX, mat('#ff3030', { basic: true })); e.scale.set(0.09, 0.09, 0.05); e.position.set(sx, 0.52, 0.52); g.add(e); }
  } else {
    const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), mat('#b8ffd8', { basic: true })); b.position.y = 1.3; g.add(b);
    const h = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), mat('#60ff9a', { basic: true, op: 0.25 })); h.position.y = 1.3; g.add(h);
  }
  g.traverse(o => { if (o.isMesh) f.mats.push([o, o.material]); });
  g.position.set(x, 0, z); area.group.add(g); area.foes.push(f);
  return f;
}
function foeFlash(f, on) { for (const [o, m] of f.mats) o.material = on ? WHITE() : m; }
function hitFoe(f, dmg, fromX, fromZ) {
  if (f.type === 'boss') return hitBoss(f, dmg);
  f.hp -= dmg; f.flash = 0.12; foeFlash(f, true); SFX.hit();
  const dx = f.x - fromX, dz = f.z - fromZ, d = Math.hypot(dx, dz) || 1;
  f.vx = dx / d * 9; f.vz = dz / d * 9; f.stun = 0.35; f.lunge = 0;
  if (f.hp <= 0) {
    f.dead = true; SFX.kill(); puff(f.x, 0.6, f.z, f.type === 'crawler' ? '#3a2418' : '#b8ffd8', 10);
    f.mesh.removeFromParent();
    if (Math.random() < 0.3 && S.hp < S.maxHearts * 2) spawnPickup('heart', f.x, f.z);
  }
}
function foesUpdate(dt) {
  for (const f of area.foes) {
    if (f.dead) continue;
    if (f.flash > 0) { f.flash -= dt; if (f.flash <= 0) foeFlash(f, false); }
    if (f.type === 'boss') continue;
    f.t += dt;
    const dx = P.x - f.x, dz = P.z - f.z, d = Math.hypot(dx, dz) || 1;
    if (f.stun > 0) { f.stun -= dt; f.x += f.vx * dt; f.z += f.vz * dt; f.vx *= 0.88; f.vz *= 0.88; }
    else if (f.type === 'crawler') {
      f.cd -= dt;
      if (f.lunge > 0) { f.lunge -= dt; f.x += f.vx * dt; f.z += f.vz * dt; }
      else if (d < 12) {
        const wob = Math.sin(f.t * 3) * 0.6;
        const ax = dx / d, az = dz / d;
        f.x += (ax + -az * wob) * 2.4 * dt; f.z += (az + ax * wob) * 2.4 * dt;
        if (d < 3 && f.cd <= 0) { f.lunge = 0.28; f.vx = ax * 8; f.vz = az * 8; f.cd = rnd(1.4, 2.2); SFX.skitter(1); }
        if (Math.random() < dt * 2) SFX.skitter(0.4);
      }
      f.mesh.rotation.y = Math.atan2(dx, dz);
      f.mesh.position.y = Math.abs(Math.sin(f.t * 12)) * 0.05;
    } else {
      if (d < 14) { f.x += dx / d * 1.7 * dt; f.z += dz / d * 1.7 * dt; }
      f.mesh.children[0].position.y = f.mesh.children[1].position.y = 1.1 + Math.sin(f.t * 3) * 0.25;
      f.mesh.children[0].rotation.y += dt * 3;
    }
    const o = { x: f.x, z: f.z }; solve(o, f.r); f.x = o.x; f.z = o.z;
    f.mesh.position.x = f.x; f.mesh.position.z = f.z;
    if (d < f.r + 0.45 && f.stun <= 0) hurt(1, f.x, f.z);
  }
  area.foes = area.foes.filter(f => !f.dead);
}

// ---------------------------------------------------------------- the Hollow logic
function hollowEnter() {
  const A_ = area;
  A_.curRoom = null;
  A_.r1chest.g.visible = !!S.taken.r1clear;
  A_.r1chest.inter.cond = () => !!S.taken.r1clear;
  for (const d of A_.doors) { d.open = doorShouldOpen(d); d.y = d.open ? -4 : 0; d.mesh.position.y = d.y + (4.2 - 0.8) / 2; d.col.off = d.open; }
  A_.bossFight = false;
  if (!A_.boss) buildBoss();
  resetBoss();
  if (A_.portal) A_.portal.visible = !!S.taken.piece1;
}
function doorShouldOpen(d) {
  if (d.type === 'boss') return !area.bossFight;
  return !!S.taken[d.flag];
}
function roomAt(x, z) { const gx = Math.round(x / CELL), gy = Math.round(z / CELL); for (const [id, r] of Object.entries(area.rooms)) if (r[0] === gx && r[1] === gy) return id; return null; }
function hollowUpdate(dt) {
  const A_ = area;
  const room = roomAt(P.x, P.z);
  if (room && room !== A_.curRoom) {
    A_.curRoom = room;
    for (const f of A_.foes) if (f.type !== 'boss' && f.room !== room) { f.dead = true; f.mesh.removeFromParent(); }
    const [gx, gy] = A_.rooms[room], cx = gx * CELL, cz = gy * CELL;
    S.check = { area: 'hollow', x: P.x, z: P.z, yaw: camYaw };
    S.seen = S.seen || {}; S.seen[room] = 1;
    if (room === 'r1' && !S.taken.r1clear) { mkFoe('crawler', cx - 4, cz - 3, room); mkFoe('crawler', cx + 4, cz - 4, room); mkFoe('crawler', cx, cz - 6, room); }
    if (room === 'r2' && !S.taken.r2solved) resetBlock();
    if (room === 'r3') { mkFoe('wisp', cx - 4, cz - 4, room); mkFoe('wisp', cx + 3, cz - 6, room); }
    if (room === 'r4') { mkFoe('crawler', cx - 5, cz - 5, room); mkFoe('crawler', cx + 5, cz - 5, room); if (!S.taken.r4h) { S.taken.r4h = 1; spawnPickup('heart', cx - 6, cz + 5); spawnPickup('heart', cx + 6, cz + 5); } }
  }
  if (room === 'r1' && !S.taken.r1clear && A_.foes.filter(f => f.room === 'r1').length === 0 && A_.curRoom === 'r1') {
    S.taken.r1clear = 1; save(); SFX.secret(); A_.r1chest.g.visible = true; puff(0, 0.8, -18, '#e8c23a', 12); toast('A chest appeared.');
  }
  // doors
  for (const d of A_.doors) {
    const want = doorShouldOpen(d);
    if (want !== d.open) { d.open = want; SFX.gate(); }
    const ty = d.open ? -4 : 0; d.y = lerp(d.y, ty, Math.min(1, dt * 5)); d.mesh.position.y = d.y + (4.2 - 0.8) / 2;
    d.col.off = d.open && d.y < -2;
    if (!d.open && d.y > -1) d.col.off = false;
  }
  blockUpdate(dt);
  bossUpdate(dt);
}
function resetBlock() { const b = area.block; b.x = b.home[0]; b.z = b.home[1]; b.moving = 0; syncBlock(); }
function syncBlock() { const b = area.block; b.mesh.position.set(b.x, 0.9, b.z); b.col.x0 = b.x - 0.98; b.col.x1 = b.x + 0.98; b.col.z0 = b.z - 0.98; b.col.z1 = b.z + 0.98; }
function blockUpdate(dt) {
  const b = area.block;
  if (S.taken.r2solved) { b.x = 22; b.z = -22; syncBlock(); return; }
  if (b.moving > 0) {
    b.moving -= dt; const t = 1 - Math.max(0, b.moving) / 0.32;
    b.x = lerp(b.from[0], b.to[0], t); b.z = lerp(b.from[1], b.to[1], t); syncBlock();
    if (b.moving <= 0) { b.x = b.to[0]; b.z = b.to[1]; syncBlock(); if (b.x === 22 && b.z === -22) { S.taken.r2solved = 1; save(); SFX.secret(); toast('Click.'); } }
    return;
  }
  const dx = P.x - b.x, dz = P.z - b.z;
  let dir = null;
  if (Math.abs(dz) < 0.75 && dx < -1.2 && dx > -1.7 && P.wx > 0.6) dir = [1, 0];
  else if (Math.abs(dz) < 0.75 && dx > 1.2 && dx < 1.7 && P.wx < -0.6) dir = [-1, 0];
  else if (Math.abs(dx) < 0.75 && dz < -1.2 && dz > -1.7 && P.wz > 0.6) dir = [0, 1];
  else if (Math.abs(dx) < 0.75 && dz > 1.2 && dz < 1.7 && P.wz < -0.6) dir = [0, -1];
  if (dir) { b.push += dt; if (b.push > 0.3) {
    b.push = 0; const nx = b.x + dir[0] * 2, nz = b.z + dir[1] * 2;
    if (nx >= 12 && nx <= 24 && nz >= -24 && nz <= -12) { b.from = [b.x, b.z]; b.to = [nx, nz]; b.moving = 0.32; SFX.push(); }
  } } else b.push = 0;
}
// boss: THE ROOTED ONE
function buildBoss() {
  const prevG = G, prevA = A; G = area.group; A = area;
  const g = new THREE.Group(); g.position.set(0, 0, -57); G.add(g);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 5.5, 7), mat('#3a2a1c')); trunk.position.y = 2.75; g.add(trunk);
  for (let i = 0; i < 5; i++) { const br = new THREE.Mesh(BOX, mat('#33241a')); br.scale.set(0.35, 3, 0.35); br.position.set(Math.cos(i * 1.3) * 0.9, 5.6, Math.sin(i * 1.3) * 0.9); br.rotation.set(Math.sin(i) * 0.8, 0, Math.cos(i * 1.7) * 0.8); g.add(br); }
  for (let i = 0; i < 7; i++) { const rt = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 5), mat('#2e2016')); const a = i / 7 * TAU; rt.position.set(Math.cos(a) * 1.9, 0.3, Math.sin(a) * 1.9); rt.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3); g.add(rt); }
  const eyeG = new THREE.Group(); eyeG.position.set(0, 2.6, 1.25); g.add(eyeG);
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), mat('#e8e0c8', { basic: true })); eyeG.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 4), mat('#c01818', { basic: true })); pupil.position.z = 0.42; eyeG.add(pupil);
  const lidT = new THREE.Mesh(BOX, mat('#4a3424')); lidT.scale.set(1.4, 0.7, 0.5); lidT.position.set(0, 0.35, 0.35); eyeG.add(lidT);
  const lidB = new THREE.Mesh(BOX, mat('#4a3424')); lidB.scale.set(1.4, 0.7, 0.5); lidB.position.set(0, -0.35, 0.35); eyeG.add(lidB);
  area.circ.push({ x: 0, z: -57, r: 1.8 });
  const f = { type: 'boss', x: 0, z: -57, r: 1.9, hp: 8, mesh: g, mats: [], flash: 0 };
  g.traverse(o => { if (o.isMesh) f.mats.push([o, o.material]); });
  area.boss = { g, f, eyeG, lidT, lidB, pupil, state: 'sleep', t: 0, cycle: 0, spikes: [], sink: 0 };
  // exit portal
  const portal = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 4, 12), mat('#9fe8ff', { basic: true })); portal.position.set(0, 1.4, -51); area.group.add(portal); portal.visible = false;
  area.portal = portal;
  area.inter.push({ x: 0, z: -51, r: 2.0, label: 'Leave', cond: () => !!S.taken.piece1, fn: () => { S.flags.hollowDone = true; save(); SFX.warp(); goArea('village', 'hollowGate'); } });
  G = prevG; A = prevA;
}
function resetBoss() {
  const B = area.boss; if (!B) return;
  if (S.taken.bossDead) { B.g.visible = false; area.circ = area.circ.filter(c => !(c.x === 0 && c.z === -57)); area.portal.visible = !!S.taken.piece1; return; }
  B.g.visible = true; B.g.position.y = 0; B.f.hp = 8; B.f.dead = false; B.state = 'sleep'; B.t = 0; B.cycle = 0; setLids(0);
  for (const s of B.spikes) s.m.removeFromParent(); B.spikes = [];
}
function setLids(open) { const B = area.boss; B.lidT.position.y = 0.35 + open * 0.5; B.lidB.position.y = -0.35 - open * 0.5; }
function bossUpdate(dt) {
  const B = area.boss; if (!B || S.taken.bossDead) {
    if (B && B.state === 'dying') { B.t += dt; B.g.position.y = -B.t * 2.4; B.g.rotation.z = Math.sin(B.t * 30) * 0.03; if (B.t > 2.6) { B.state = 'gone'; B.g.visible = false; } }
    if (area.portal) { area.portal.visible = !!S.taken.piece1; area.portal.rotation.y += dt * 1.5; }
    return;
  }
  if (B.state === 'sleep') {
    if (P.z < -47.2) {
      area.bossFight = true; B.state = 'closed'; B.t = 2.2; area.foes.push(B.f); B.f.dead = false;
      SFX.roar(); shake = 0.5; toast('THE ROOTED ONE'); setSong();
    }
    return;
  }
  const fast = B.f.hp <= 4;
  B.g.rotation.y = lerp(B.g.rotation.y, B.g.rotation.y + angDiff(B.g.rotation.y, Math.atan2(P.x - 0, P.z + 57)), Math.min(1, dt * 1.5));
  B.t -= dt;
  if (B.state === 'closed') {
    setLids(0);
    if (B.t <= 0) {
      B.state = 'roots'; B.t = 1.0; B.cycle++;
      const pts = [[P.x, P.z]]; for (let i = 0; i < (fast ? 4 : 2); i++) pts.push([clamp(P.x + rnd(-4, 4), -7.5, 7.5), clamp(P.z + rnd(-4, 4), -62, -46.5)]);
      for (const [x, z] of pts) {
        const mk = new THREE.Mesh(new THREE.CircleGeometry(0.9, 8), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false })); mk.rotation.x = -Math.PI / 2; mk.position.set(x, 0.06, z); area.group.add(mk);
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 5), mat('#4a3020')); sp.position.set(x, -1.3, z); area.group.add(sp);
        B.spikes.push({ m: mk, sp, x, z, t: 0, hit: false });
      }
      SFX.grind();
      if (B.cycle % 2 === 0 && area.foes.filter(f => f.type === 'crawler').length < 3) { mkFoe('crawler', -5, -50, 'rb'); mkFoe('crawler', 5, -50, 'rb'); }
    }
  } else if (B.state === 'roots') {
    if (B.t <= 0) { B.state = 'open'; B.t = fast ? 2.0 : 2.6; SFX.roar(); }
  } else if (B.state === 'open') {
    setLids(1); B.pupil.position.x = clamp((P.x) * 0.03, -0.15, 0.15);
    if (B.t <= 0) { B.state = 'closed'; B.t = fast ? 2.0 : 2.8; }
  }
  for (let i = B.spikes.length - 1; i >= 0; i--) {
    const s = B.spikes[i]; s.t += dt;
    if (s.t > 1.0) { s.sp.position.y = Math.min(0, -1.3 + (s.t - 1.0) * 14); if (!s.hit && s.t > 1.05 && Math.hypot(P.x - s.x, P.z - s.z) < 1.0) { s.hit = true; hurt(2, s.x, s.z); } if (s.t < 1.1) SFX.clank(); }
    if (s.t > 1.8) { s.sp.position.y -= dt * 8; s.m.material.opacity *= 0.9; }
    if (s.t > 2.3) { s.m.removeFromParent(); s.sp.removeFromParent(); B.spikes.splice(i, 1); }
  }
}
function hitBoss(f, dmg) {
  const B = area.boss;
  if (B.state !== 'open') { SFX.clank(); puff(P.x + Math.sin(P.face) * 1.5, 1.2, P.z + Math.cos(P.face) * 1.5, '#ffffff', 4, 2); return; }
  f.hp -= dmg; f.flash = 0.15; foeFlash(f, true); SFX.bossHit(); shake = 0.25; glitchKick(0.25);
  P.kbx = -Math.sin(P.face) * 7; P.kbz = -Math.cos(P.face) * 7; P.kbt = 0.18;
  B.state = 'closed'; B.t = 1.6;
  if (f.hp <= 0) {
    f.dead = true; B.state = 'dying'; B.t = 0; S.taken.bossDead = 1; area.bossFight = false;
    SFX.roar(); shake = 1.2; glitchKick(1);
    for (const s of B.spikes) { s.m.removeFromParent(); s.sp.removeFromParent(); } B.spikes = [];
    for (const o of area.foes) if (o.type === 'crawler') { o.dead = true; o.mesh.removeFromParent(); puff(o.x, 0.5, o.z, '#3a2418'); }
    area.circ = area.circ.filter(c => !(c.x === 0 && c.z === -57));
    spawnPickup('container', -1.6, -53, { flag: 'hc1' }); spawnPickup('piece', 1.6, -53, { flag: 'piece1' });
    save(); setSong();
  }
}

// ---------------------------------------------------------------- statue
const _v = new THREE.Vector3();
function statueSeen() {
  if (blinkT > 0) return false;
  let inView = false;
  for (const y of [0.4, 1.0, 1.6]) { _v.set(statue.x, y, statue.z).project(cam); if (_v.z < 1 && _v.z > -1 && Math.abs(_v.x) < 1.02 && Math.abs(_v.y) < 1.02) { inView = true; break; } }
  if (!inView) return false;
  return segHit(cam.position.x, cam.position.z, statue.x, statue.z, 0) >= 0.999;
}
function statueUpdate(dt) {
  if (!statue.active || dlg || mode !== 'play') { statue.moving = false; return; }
  const seen = statueSeen();
  const dx = P.x - statue.x, dz = P.z - statue.z, d = Math.hypot(dx, dz) || 1;
  if (!seen) {
    const c = C(), sp = area.id === 'village' ? (c === 1 ? 3.3 : c === 2 ? 4.1 : 4.6) : 4.4;
    const o = { x: statue.x + dx / d * sp * dt, z: statue.z + dz / d * sp * dt };
    solve(o, 0.4); statue.x = o.x; statue.z = o.z;
    statue.mesh.rotation.y = Math.atan2(dx, dz);
    statue.moving = true;
    statue.grindT -= dt; if (statue.grindT <= 0 && d < 26) { statue.grindT = 0.4; SFX.grind(); }
  } else statue.moving = false;
  statue.mesh.position.set(statue.x, area.height(statue.x, statue.z), statue.z);
  if (d < 0.95) {
    hurt(2, statue.x, statue.z, true); SFX.sting(); glitchKick(0.8);
    statue.steps++;
    statue.active = false;
    setTimeout(() => { if (area && (area.id === 'village' || area.id === 'b1') && mode !== 'title') placeStatueBehind(); }, 1200);
  }
}

// ---------------------------------------------------------------- player
function hurt(n, fx, fz, big) {
  if (P.inv > 0 || mode !== 'play' || window.__god) return;
  S.hp -= n; P.inv = 1.0; SFX.hurt(); shake = Math.max(shake, big ? 0.6 : 0.3);
  const dx = P.x - fx, dz = P.z - fz, d = Math.hypot(dx, dz) || 1;
  P.kbx = dx / d * (big ? 11 : 8); P.kbz = dz / d * (big ? 11 : 8); P.kbt = 0.22;
  P.swingT = P.spinT = -1; P.bT = 0; P.ready = false;
  if (S.hp <= 0) die();
  else if (S.hp <= 2) SFX.lowhp();
}
async function die() {
  mode = 'dead'; S.deaths++; S.hp = 0;
  toast(C() >= 2 ? corrupt(PREV().toUpperCase() + ' DIDN\'T GET TO CONTINUE', 0.06) : 'GAME OVER', 3);
  SFX.static(0.6);
  await wait(2600);
  S.hp = S.maxHearts * 2;
  const ch = S.check || { area: S.area };
  if (area.id === 'hollow') { area.bossFight = false; resetBoss(); }
  mode = 'play';
  await goArea(ch.area, ch.x != null ? { x: ch.x, z: ch.z, yaw: ch.yaw } : 'start');
  save();
}
function playerUpdate(dt) {
  // movement relative to camera
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  let wx = rx * inp.mx + fx * -inp.mz, wz = rz * inp.mx + fz * -inp.mz;
  const mag = Math.min(1, Math.hypot(wx, wz));
  P.wx = mag > 0.05 ? wx / Math.hypot(wx, wz) * mag : 0; P.wz = mag > 0.05 ? wz / Math.hypot(wx, wz) * mag : 0;
  if (!held.A) aConsumed = false;
  const running = held.A && !aConsumed && mag > 0.3;
  let sp = (running ? 7.4 : 4.6) * mag;
  if (P.swingT >= 0) sp *= 0.35; if (P.spinT >= 0) sp *= 0.6; if (P.bT > 0.25) sp *= 0.55;
  if (P.kbt > 0) { P.kbt -= dt; P.x += P.kbx * dt; P.z += P.kbz * dt; }
  else if (mag > 0.05) {
    P.x += P.wx / mag * sp * dt; P.z += P.wz / mag * sp * dt;
    if (P.bT < 0.25 && P.spinT < 0) P.face += angDiff(P.face, Math.atan2(P.wx, P.wz)) * Math.min(1, dt * 14);
  }
  const o = { x: P.x, z: P.z }; solve(o, 0.4); P.x = o.x; P.z = o.z;
  P.speed = P.kbt > 0 ? 0 : sp;
  P.y = lerp(P.y, area.height(P.x, P.z), Math.min(1, dt * 14));
  // steps
  if (sp > 0.5) { P.stepPh += dt * sp * 0.55; if (P.stepPh > 1) { P.stepPh -= 1; SFX.step(area.light === 'day' ? (P.y > 0.1 ? 'wood' : Math.abs(P.x) < 7 && P.z > -10 && P.z < 21 ? 'dirt' : 'grass') : area.id === 'b10' || area.id === 'lakebed' ? 'wood' : area.id === 'b6' ? 'grass' : 'stone', running ? 1 : 0.7); } }
  // sword
  if (pressed.B && P.swingT < 0 && P.spinT < 0) { P.swingT = 0; P.hitSet.clear(); SFX.swing(); P.bT = 0.001; }
  if (held.B && P.bT > 0) {
    P.bT += dt;
    if (P.bT > 0.3 && P.bT - dt <= 0.3) SFX.charge();
    if (P.bT > 0.75 && !P.ready) { P.ready = true; SFX.chargeReady(); puff(P.x, 1.0, P.z, '#ffffff', 5, 1.5); }
  }
  if (released.B) {
    if (P.ready) { P.spinT = 0; P.hitSet.clear(); SFX.spin(); }
    P.bT = 0; P.ready = false;
  }
  if (P.swingT >= 0) {
    P.swingT += dt; const t = P.swingT / 0.24;
    P.sword.visible = true; P.back.visible = false;
    P.sword.rotation.set(0, lerp(1.3, -1.3, Math.min(1, t)), 0);
    P.mesh.userData.armR.rotation.x = -1.4; P.mesh.userData.armBusy = true;
    if (P.swingT > 0.03 && P.swingT < 0.22) swordHits(2.1, 1.15, 1);
    if (P.swingT > 0.26) { P.swingT = -1; }
  }
  if (P.spinT >= 0) {
    P.spinT += dt; const t = P.spinT / 0.42;
    P.sword.visible = true; P.back.visible = false; P.sword.rotation.set(0, 1.3, 0);
    P.face += dt * TAU / 0.42 * 1.0;
    swordHits(2.7, 9, 2);
    if (Math.random() < 0.5) puff(P.x + Math.sin(P.face + 1.3) * 1.8, 1.0, P.z + Math.cos(P.face + 1.3) * 1.8, '#dfe6ee', 1, 0.5);
    if (t >= 1) P.spinT = -1;
  }
  if (P.swingT < 0 && P.spinT < 0) {
    if (P.bT > 0.25) { P.sword.visible = true; P.back.visible = false; P.sword.rotation.set(0, 0, 0); P.mesh.userData.armR.rotation.x = -1.3; P.mesh.userData.armBusy = true; P.sword.children[0].material = P.ready && Math.sin(now * 30) > 0 ? mat('#ffffff', { basic: true }) : mat('#dfe6ee', { basic: true }); }
    else { P.sword.visible = false; P.back.visible = true; P.mesh.userData.armBusy = false; }
  }
  if (P.inv > 0) { P.inv -= dt; P.mesh.visible = Math.sin(now * 40) > -0.3 || P.inv <= 0; } else P.mesh.visible = true;
  P.mesh.position.set(P.x, P.y, P.z); P.mesh.rotation.y = P.face;
  animPerson(P.mesh, dt, P.speed);
}
function swordHits(range, arc, dmg) {
  for (const f of area.foes) {
    if (f.dead || P.hitSet.has(f)) continue;
    const dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz);
    if (d > range + f.r) continue;
    if (arc < 4 && Math.abs(angDiff(P.face, Math.atan2(dx, dz))) > arc) continue;
    P.hitSet.add(f); hitFoe(f, dmg, P.x, P.z);
  }
  if (statue.active && !P.hitSet.has(statue) && Math.hypot(statue.x - P.x, statue.z - P.z) < range + 0.3) { P.hitSet.add(statue); SFX.clank(); puff(statue.x, 1.2, statue.z, '#ffffff', 5, 2); }
}
function itemsUpdate(dt) {
  for (const it of area.items) {
    if (it.gone) continue;
    const show = (!it.flag || !S.taken[it.flag]) && (!it.cond || it.cond());
    it.mesh.visible = show; if (!show) continue;
    it.t += dt; it.mesh.rotation.y += dt * 2; it.mesh.position.y = 0.8 + Math.sin(it.t * 3) * 0.12 + area.height(it.x, it.z);
    if (Math.hypot(P.x - it.x, P.z - it.z) < 1.0) {
      it.gone = true; it.mesh.removeFromParent(); if (it.flag) S.taken[it.flag] = 1;
      if (it.type === 'heart') { S.hp = Math.min(S.maxHearts * 2, S.hp + 2); SFX.heart(); }
      else if (it.type === 'page') { givePage(it.n); }
      else if (it.type === 'container') { S.maxHearts++; S.hp = S.maxHearts * 2; SFX.heart(); say([['', 'You got a HEART CONTAINER! Your life went up.']]); }
      else if (it.type === 'piece') { S.pieces = Math.max(S.pieces, 1); SFX.shard(); glitchKick(0.5); save(); say([['', 'You got a BELL PIECE! 1 of 3.'], ['', 'SAVING...'], ['', 'SAVE 1: WREN', 0], ['', fmt('SAVE 2: {N}. Done.')]], () => { SFX.static(0.3); glitchKick(0.6); }); }
      save();
    }
  }
  area.items = area.items.filter(i => !i.gone || i.flag);
}
let interTarget = null;
const promptEl = $('prompt');
function interUpdate() {
  let best = null, bd = 1e9;
  for (const it of area.inter) {
    if (it.cond && !it.cond()) continue;
    const dx = it.x - P.x, dz = it.z - P.z, d = Math.hypot(dx, dz);
    if (d > it.r) continue;
    const ang = Math.abs(angDiff(P.face, Math.atan2(dx, dz)));
    const score = d + (ang > 1.6 ? 1.5 : 0);
    if (score < bd) { bd = score; best = it; }
  }
  interTarget = best;
  if (best && !dlg) { promptEl.textContent = 'A  ' + best.label; promptEl.classList.add('on'); } else promptEl.classList.remove('on');
  if (best && pressed.A && !dlg) { aConsumed = true; if (best.npc) best.npc.facePlayer = 1; best.fn(); }
}
function triggersUpdate() { for (const t of area.triggers) if (P.x > t.x0 && P.x < t.x1 && P.z > t.z0 && P.z < t.z1) { t.fn(); break; } }

// ---------------------------------------------------------------- village / underneath logic
let lastC = -1, whisperT = 30;
function villageEnter() {
  const A_ = area, c = C();
  A_.bellWhole.visible = !!S.flags.bellRung; A_.bellBroken.visible = !S.flags.bellRung;
  A_.hatch.visible = !!S.flags.bellRung;
  if (c === 0) placeStatueOnPlinth(); else placeStatueBehind(c === 1 && !S.flags.statueSeen ? 20 : null);
  S.flags.statueSeen = c >= 1 || S.flags.statueSeen;
  lastC = c;
}
async function copyEvent() {
  S.flags.copied = true;
  statue.active = false;
  SFX.static(0.5); glitchKick(0.7);
  await sayP([['', 'SAVING...'], ['', 'SAVE 1: WREN. BELL PIECES: 2.', 0.04], ['', 'COPYING SAVE 1 INTO SAVE 2...', 0.08], ['', 'Done.']]);
  S.pieces = 3; save(); SFX.shard(); glitchKick(1); shake = 0.5;
  await sayP([['', 'You got 2 BELL PIECES. 3 of 3.'], ['', 'You didn\'t find these.', 0.15]]);
  applyLight(); setSong(); lastC = C();
  placeStatueBehind(16);
}
function villageUpdate(dt) {
  const A_ = area, c = C();
  if (c !== lastC) { lastC = c; applyLight(); setSong(); if (c >= 3) setEyes(statue.mesh, '#ff2020'); }
  // water
  const pos = A_.water.geometry.attributes.position, base = A_.waterBase;
  for (let i = 0; i < pos.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; pos.array[i * 3 + 1] = Math.sin(x * 0.35 + now * 1.1) * 0.08 + Math.cos(z * 0.45 + now * 1.4) * 0.06; }
  pos.needsUpdate = true;
  A_.water.material.color.setHex(c >= 3 ? 0x101828 : c === 2 ? 0x3a2a40 : 0x2d5f86);
  // the figure under the dock
  A_.ghost.visible = c >= 1 || Math.hypot(P.x, P.z - 40) < 4;
  A_.ghost.position.y = -1.9 + Math.sin(now * 0.7) * 0.1;
  A_.ghost.userData.armR.rotation.z = c >= 3 ? 0 : Math.sin(now * 2.2) * 0.5;
  A_.ghost.userData.armR.rotation.x = c >= 3 ? -1.5 : -2.6;
  A_.ghost.rotation.y = c >= 3 ? Math.atan2(P.x - 2.6, P.z - 41) : Math.PI;
  // TV + lamps + windows
  A_.tv.material.color.setHex(c >= 1 ? (Math.random() < 0.3 ? 0x8aa8ff : 0x4a6aff) : 0x14141a);
  if (c >= 1 && Math.hypot(P.x + 13, P.z - 9) < 7 && Math.random() < dt * 0.3) SFX.tv();
  for (const l of A_.lamps) l.material.color.setHex(c >= 2 ? (c >= 3 && Math.random() < 0.05 ? 0x000000 : 0xffd27a) : 0x6a6a5a);
  for (const w of A_.elderWin) w.material = mat(c >= 3 ? '#08080a' : '#e8c86a', { basic: true });
  // the copy
  if (S.pieces === 1 && !S.flags.copied && Math.hypot(P.x, P.z) < 15 && mode === 'play' && !dlg) copyEvent();
  // NPCs at night
  for (const n of A_.npcs) n.mesh.visible = c < 3 || n.id === 'elder' || n.id === 'fisher';
  if (c >= 2) { whisperT -= dt; if (whisperT <= 0) { whisperT = rnd(35, 70); toast(fmt(['{N}?', 'It\'s {T}.', '{M} minutes.', 'Behind you.'][(Math.random() * 4) | 0]), 1.4); SFX.static(0.12); } }
  if (audioOn) SHA.ambient({ water: clamp((P.z - 2) / 22, 0, 1) * (c >= 3 ? 0.6 : 1), wind: 0.35 + c * 0.15, hum: c >= 3 ? 0.4 : 0 });
}
function b1Update(dt) {
  for (const f of area.figs) {
    if (f.gone) continue;
    f.mesh.rotation.y = Math.atan2(P.x - f.mesh.position.x, P.z - f.mesh.position.z);
    if (Math.hypot(P.x - f.mesh.position.x, P.z - f.z) < 5) {
      f.gone = true; f.mesh.visible = false; SFX.static(0.3); glitchKick(0.5); puff(f.mesh.position.x, 1, f.z, '#09090c', 12);
      toast(fmt(['{N}?', 'It\'s {T}. Somebody upstairs should be asleep.', 'You have played for {M} minutes. We counted.', 'Don\'t look at the statue, {N}. Look at me.'][area.figs.indexOf(f)]), 2.4);
    }
  }
  if (audioOn) SHA.ambient({ hum: 0.7, drips: 0.6 });
}
function b10Update(dt) { const w = area.wrenNpc; w.mesh.position.y = 0.3 + Math.sin(now) * 0.03; if (audioOn) SHA.ambient({ water: 0.3, hum: 0.5 }); }
async function floorSkip() {
  mode = 'cut'; const tag = $('floorTag');
  for (const f of ['B2', 'B3', 'B4', 'B5']) { tag.textContent = f; SFX.static(0.15); glitchKick(0.5); await wait(380); }
  mode = 'play'; await goArea('b6', 'start');
  toast('B6 · the yard sale');
}
async function floorSkip2() {
  mode = 'cut'; const tag = $('floorTag');
  for (const f of ['B7', 'B8', 'B9', 'B9', 'B9']) { tag.textContent = f; SFX.static(0.2); glitchKick(0.7); await wait(420); }
  mode = 'play'; await goArea('b10', 'start');
}

// ---------------------------------------------------------------- ending
async function ending() {
  S.flags.metWren = true; mode = 'cut'; P.speed = 0;
  await sayP([['???', 'Oh.'], ['???', 'You can see me.'], ['WREN', 'This was my file. Save one. I was on the lake part. I was so close to the end.'],
    ['WREN', 'You came all the way down. Nobody ever came all the way down.'],
    ['WREN', 'The summer I got this, I went swimming at the real lake.'], ['WREN', 'The cartridge never left my shelf after that.'],
    ['WREN', 'Then someone sold it at a yard sale. And now you have it, {N}.'],
    ['WREN', 'I\'ve been waiting so long. Can I go home now?']]);
  SFX.bell(false); SHA.stop(); await wait(1600);
  // the statue, right behind you
  area.group.add(statue.mesh); setEyes(statue.mesh, '#ff2020');
  const bx = P.x - Math.sin(P.face) * 1.3, bz = P.z - Math.cos(P.face) * 1.3;
  statue.mesh.position.set(bx, 0.3, bz); statue.mesh.rotation.y = P.face;
  await sayP([['', 'Don\'t turn around.', 0]]);
  await sayP([['WREN', 'Thank you, {N}.'], ['WREN', 'I\'m going home now.'], ['WREN', 'It\'s your turn to wait under the dock.'], ['WREN', 'Don\'t worry. Someone always finds the cartridge eventually.']]);
  // the camera turns around
  const y0 = camYaw, y1 = P.face + 0.15; let t = 0;
  await new Promise(res => { camOverride = dt => {
    t += dt / 1.5; const k = Math.min(1, t), e = k * k * (3 - 2 * k);
    const yaw = lerp(y0, y0 + angDiff(y0, y1), e);
    const tx = P.x, tz = P.z, d = lerp(camDist, 2.4, e);
    cam.position.set(tx + Math.sin(yaw) * d, 1.7, tz + Math.cos(yaw) * d);
    cam.lookAt(lerp(tx, bx, e), 1.5, lerp(tz, bz, e));
    if (k >= 1) res();
  }; });
  SFX.sting(); glitchKick(1); shake = 0.8; await wait(900);
  SFX.static(2.4); fadeEl.classList.add('on'); await wait(1200);
  camOverride = null;
  await goArea('lakebed', { x: 0, z: 2, yaw: 0 }, { noFade: true });
  P.mesh.visible = false; P.mesh.removeFromParent();
  const L = area; L.me.visible = true; L.wren.position.set(0, 7.2, -9);
  let wt = 0;
  camOverride = dt => {
    wt += dt;
    cam.position.set(3.2, 1.3, 6.5); cam.lookAt(0, 3.2, -1);
    L.wren.position.z = -9 + Math.min(18, wt * 2.4); L.wren.rotation.y = 0; animPerson(L.wren, dt, 2.4);
    L.me.rotation.y = Math.PI * 0.85 + Math.sin(wt * 0.6) * 0.1; L.me.position.y = 0.1 + Math.sin(wt * 0.8) * 0.08;
    L.me.userData.armL.rotation.z = -0.4 + Math.sin(wt) * 0.1; L.me.userData.armR.rotation.z = 0.4 - Math.sin(wt) * 0.1;
    L.surface.position.y = 7.4 + Math.sin(wt * 1.4) * 0.05;
  };
  SHA.setSong('void', 2.6);
  fadeEl.classList.remove('on');
  await wait(1800); toast(fmt('SAVE 1: {N}'), 2.4);
  await wait(2600); toast('UNDER THE DOCK', 2.6);
  await wait(3400);
  fadeEl.classList.add('on'); await wait(900);
  camOverride = null;
  M.ended = true; M.endName = S.name; M.endMins = minsPlayed(); M.endDeaths = S.deaths; saveMeta();
  S.done = true; save();
  mode = 'end'; SHA.setSong('title', 1.6); SHA.ambientOff();
  $('endStats').textContent = 'Time: ' + minsPlayed() + ' min · Deaths: ' + S.deaths + ' · Pages: ' + Object.keys(S.pages).length + ' of 3';
  showPanel('endPanel'); layoutUI();
  fadeEl.classList.remove('on');
}

// ---------------------------------------------------------------- corruption fx
let glitchV = 0, burstT = 20, blinkT = 0, blinkNext = 12;
function glitchKick(v) { glitchV = Math.max(glitchV, v); }
function fxUpdate(dt) {
  const c = C(), id = area.id;
  let drain = 0, tint = [1, 1, 1], rate = 0;
  if (id === 'village') { drain = [0, 0.12, 0.35, 0.5][c]; tint = c === 2 ? [1.06, 0.88, 0.96] : c === 3 ? [0.82, 0.9, 1.15] : [1, 1, 1]; rate = [0, 45, 18, 9][c]; }
  else if (id === 'hollow') { drain = c * 0.1; rate = c ? 40 : 0; }
  else if (id === 'b1') { drain = 0.5; tint = [0.85, 0.92, 1.15]; rate = 7; }
  else if (id === 'b6') { drain = 0.55; tint = [1.12, 1.0, 0.82]; rate = 12; }
  else if (id === 'b10') { drain = 0.3; rate = 14; }
  else if (id === 'lakebed') { drain = 0.2; rate = 0; }
  U.uDrain.value = lerp(U.uDrain.value, drain, Math.min(1, dt * 2));
  U.uTint.value.setRGB(lerp(U.uTint.value.r, tint[0], dt * 2), lerp(U.uTint.value.g, tint[1], dt * 2), lerp(U.uTint.value.b, tint[2], dt * 2));
  if (rate && mode === 'play') { burstT -= dt; if (burstT <= 0) { burstT = rnd(rate * 0.6, rate * 1.4); glitchKick(rnd(0.3, 0.8)); SFX.static(0.12); } }
  glitchV = Math.max(0, glitchV - dt * 2.2);
  U.uGlitch.value = glitchV > 0.02 ? glitchV : 0;
  if (blinkT > 0) blinkT -= dt;
  if (((id === 'village' && c >= 2) || id === 'b1') && statue.active && mode === 'play' && !dlg) { blinkNext -= dt; if (blinkNext <= 0) { blinkNext = rnd(8, 15); blinkT = 0.14; } }
}

// ---------------------------------------------------------------- camera
const camPos = new THREE.Vector3();
function cameraUpdate(dt) {
  if (camOverride) { camOverride(dt); return; }
  if (mode === 'play' && !dlg) { camYaw -= inp.lookX; camPitch = clamp(camPitch + inp.lookY, -0.2, 1.15); }
  if (now - lastLookInput > 1.6 && P.speed > 1 && mode === 'play') { const d = angDiff(camYaw, P.face + Math.PI); if (Math.abs(d) < 2.3) camYaw += d * Math.min(1, dt * 0.9); }
  const tx = P.x, ty = P.y + 1.35, tz = P.z, cp = Math.cos(camPitch);
  let px = tx + Math.sin(camYaw) * cp * camDist, pz = tz + Math.cos(camYaw) * cp * camDist, py = ty + Math.sin(camPitch) * camDist;
  const t = segHit(tx, tz, px, pz, 0.3);
  if (t < 1) { const k = Math.max(0.15, t - 0.05); px = tx + (px - tx) * k; pz = tz + (pz - tz) * k; py = ty + (py - ty) * Math.max(k, 0.4); }
  py = Math.max(py, area.height(px, pz) + 0.35);
  if (area.light === 'dungeon' || area.light === 'under') py = Math.min(py, 4.0);
  const target = new THREE.Vector3(px, py, pz);
  if (camPos.distanceTo(target) > 8) camPos.copy(target); else camPos.lerp(target, Math.min(1, dt * 14));
  cam.position.copy(camPos);
  if (shake > 0) { shake -= dt; cam.position.x += rnd(-1, 1) * shake * 0.25; cam.position.y += rnd(-1, 1) * shake * 0.25; }
  cam.lookAt(tx, ty + 0.15, tz);
}

// ---------------------------------------------------------------- HUD + panels
const heartsEl = $('hearts'), itemsEl = $('hudItems'), perfEl = $('perf');
let hudKey = '';
function hud() {
  if (!S) return;
  const key = S.hp + '|' + S.maxHearts + '|' + S.keys + '|' + S.pieces;
  if (key === hudKey) return; hudKey = key;
  let h = '';
  for (let i = 0; i < S.maxHearts; i++) { const v = S.hp - i * 2; h += v >= 2 ? '♥' : v === 1 ? '<span style="color:#e08888">♥</span>' : '<span class="e">♥</span>'; }
  heartsEl.innerHTML = h;
  itemsEl.textContent = (S.keys ? 'KEY ×' + S.keys + '  ' : '') + 'BELL ' + S.pieces + '/3';
}
const PANELS = ['cartPanel', 'filesPanel', 'namePanel', 'pausePanel', 'helpPanel', 'endPanel'];
function showPanel(id) { for (const p of PANELS) $(p).classList.toggle('show', p === id); }
function layoutUI() {
  const playing = mode === 'play' || mode === 'dead' || mode === 'cut';
  touchEl.classList.toggle('on', touchMode && mode === 'play');
  $('hud').style.display = playing && area && area.id !== 'lakebed' ? 'flex' : 'none';
  $('floorTag').style.display = playing ? 'block' : 'none';
  if (!playing) promptEl.classList.remove('on');
}
function openPause() {
  mode = 'pause'; if (document.pointerLockElement) document.exitPointerLock();
  $('pStats').innerHTML = 'Bell pieces: ' + S.pieces + ' of 3 · Keys: ' + S.keys + '<br>Diary pages: ' + Object.keys(S.pages).length + ' of 3 · Deaths: ' + S.deaths + '<br>Time: ' + minsPlayed() + ' min';
  syncPauseButtons(); showPanel('pausePanel'); layoutUI(); SFX.menu();
}
function closePause() { mode = 'play'; showPanel(null); layoutUI(); }
function syncPauseButtons() {
  $('pSound').textContent = 'Sound: ' + (M.muted ? 'off' : 'on');
  $('pSens').textContent = 'Camera speed: ' + (M.sens < 0.8 ? 'slow' : M.sens > 1.2 ? 'fast' : 'normal');
  $('pInv').textContent = 'Invert camera: ' + (M.inv ? 'on' : 'off');
}
$('pResume').onclick = closePause;
$('pSound').onclick = () => { M.muted = !M.muted; SHA.setMute(M.muted); saveMeta(); syncPauseButtons(); };
$('pSens').onclick = () => { M.sens = M.sens < 0.8 ? 1 : M.sens > 1.2 ? 0.6 : 1.5; saveMeta(); syncPauseButtons(); };
$('pInv').onclick = () => { M.inv = !M.inv; saveMeta(); syncPauseButtons(); };
let helpBack = 'pausePanel';
$('pHelp').onclick = () => { helpBack = 'pausePanel'; showPanel('helpPanel'); };
$('helpBtn').onclick = () => { helpBack = 'filesPanel'; showPanel('helpPanel'); };
$('helpClose').onclick = () => showPanel(helpBack);
$('pQuit').onclick = () => { save(); showFiles(); };
$('endTitle').onclick = () => showFiles();
// map
const mapEl = $('mapPanel'), mapCv = $('mapCv'), mg = mapCv.getContext('2d');
function openMap() {
  mode = 'map'; mapEl.classList.add('show'); layoutUI(); SFX.menu();
  mg.fillStyle = '#0b0b0d'; mg.fillRect(0, 0, 256, 256);
  const names = { village: 'MILLBROOK', hollow: 'THE HOLLOW', b1: 'THE UNDERNEATH', b6: 'THE UNDERNEATH', b10: 'THE UNDERNEATH' };
  $('mapName').textContent = names[area.id] || '';
  if (area.map) area.map(mg); else mapNoise(mg);
}
function closeMap() { mode = 'play'; mapEl.classList.remove('show'); layoutUI(); }
mapEl.addEventListener('pointerdown', () => { if (mode === 'map') closeMap(); });
function arrow(g, x, y, a, col) { g.save(); g.translate(x, y); g.rotate(-a + Math.PI); g.fillStyle = col; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.restore(); }
function mapVillage(g) {
  const X = x => (x + 64) * 2, Z = z => (z + 64) * 2;
  g.fillStyle = '#1d3320'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#12301a'; for (let i = 0; i < 90; i++) { const a = i * 2.4, r = 70 + (i * 37 % 50); const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8 - 10; if (z < 17) g.fillRect(X(x) - 3, Z(z) - 3, 6, 6); }
  g.fillStyle = C() >= 3 ? '#101828' : '#24506e'; g.fillRect(0, Z(24), 256, 256);
  g.fillStyle = '#c8b48a'; g.fillRect(0, Z(19), 256, Z(24) - Z(19));
  g.strokeStyle = '#a8926c'; g.lineWidth = 4; g.beginPath(); g.moveTo(X(0), Z(-22)); g.lineTo(X(0), Z(21)); g.moveTo(X(-8), Z(-8)); g.lineTo(X(-46), Z(-46)); g.stroke();
  g.fillStyle = '#7a5a38'; g.fillRect(X(-1.25), Z(21), 5, Z(42) - Z(21));
  g.fillStyle = '#c9a24a'; g.fillRect(X(0) - 3, Z(39.6) - 3, 6, 6);
  g.fillStyle = '#8a7a6a';
  for (const [x, z, w, d] of [[-13, -11, 6, 5], [13, -11, 6, 5], [-15, 9, 5, 5], [15, 9, 5, 5], [0, -24, 7, 5], [-26, -12, 5, 5], [26, -10, 5, 5]]) g.fillRect(X(x - w / 2), Z(z - d / 2), w * 2, d * 2);
  g.fillStyle = '#aaaaaa'; g.fillRect(X(0) - 2, Z(-3) - 2, 4, 4);
  g.fillStyle = '#3a3028'; g.beginPath(); g.arc(X(-48), Z(-48), 6, 0, TAU); g.fill();
  g.font = '9px monospace'; g.fillStyle = '#ddd'; g.textAlign = 'center';
  g.fillText('HOLLOW', X(-48), Z(-48) + 16); g.fillText('DOCK', X(0) + 18, Z(32));
  if (C() >= 2 && statue.active) { g.fillStyle = '#c01818'; g.fillText('W', X(statue.x), Z(statue.z) + 3); }
  arrow(g, X(P.x), Z(P.z), P.face, '#ffe066');
}
function mapHollow(g) {
  const seen = S.seen || {};
  const X = gx => 80 + gx * 60, Y = gy => 200 + gy * 50;
  for (const [id, [gx, gy]] of Object.entries(area.rooms)) {
    if (!seen[id]) continue;
    g.fillStyle = id === area.curRoom ? '#4a6a4a' : '#2a3a2a'; g.fillRect(X(gx) - 26, Y(gy) - 21, 52, 42);
    g.strokeStyle = '#6a8a6a'; g.lineWidth = 2; g.strokeRect(X(gx) - 26, Y(gy) - 21, 52, 42);
    if (id === 'rb') { g.fillStyle = S.taken.bossDead ? '#666' : '#c01818'; g.font = '12px monospace'; g.textAlign = 'center'; g.fillText('BOSS', X(gx), Y(gy) + 4); }
  }
  for (const d of area.doors) { if (!seen[roomAt(d.x + 1, d.z + 1)] && !seen[roomAt(d.x - 1, d.z - 1)]) continue; g.fillStyle = d.open ? '#9a9a6a' : d.type === 'locked' ? '#e8c23a' : '#888'; g.fillRect(X(d.x / CELL) - 4, Y(d.z / CELL) - 4, 8, 8); }
  const px = X(P.x / CELL), py = Y(P.z / CELL);
  arrow(g, px, py, P.face, '#ffe066');
  g.fillStyle = '#ddd'; g.font = '10px monospace'; g.textAlign = 'left'; g.fillText('KEYS ' + S.keys, 8, 16);
}
function mapNoise(g) {
  const im = g.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 60; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); g.fillStyle = '#9fc6e8'; g.font = '16px monospace'; g.textAlign = 'center'; g.fillText('NO MAP', 128, 120); g.fillText(fmt('KEEP GOING, {N}'), 128, 144);
}

// ---------------------------------------------------------------- files / name / start
let built = false;
function buildWorld() {
  if (built) return; built = true;
  buildPlayer(); buildStatue();
  buildVillage(); buildHollow(); buildB1(); buildB6(); buildB10(); buildLakebed();
  for (const a of Object.values(AREAS)) mergeStatic(a);
}
function showFiles() {
  mode = 'files'; if (area) area.group.visible = false; area = null;
  if (document.pointerLockElement) document.exitPointerLock();
  dlg = null; dlgEl.classList.remove('show'); camOverride = null;
  SAVED = lsGet(SAVE_KEY);
  const s1 = $('slot1'), s2 = $('slot2');
  s1.innerHTML = M.ended ? '<b>1</b> ' + esc(M.endName) + '<small>UNDER THE DOCK</small>' : '<b>1</b> WREN<small>THE LAKE · 2 BELL PIECES · 99:59</small>';
  if (SAVED && !SAVED.done) s2.innerHTML = '<b>2</b> ' + esc(SAVED.name) + '<small>' + ({ village: 'MILLBROOK', hollow: 'THE HOLLOW' }[SAVED.area] || 'THE UNDERNEATH') + ' · ' + SAVED.pieces + ' BELL PIECES · ' + Math.max(1, Math.round(SAVED.playMs / 60000)) + ' MIN</small>';
  else s2.innerHTML = '<b>2</b> NEW FILE<small>' + (M.ended ? 'NEXT PLAYER' : 'EMPTY') + '</small>';
  $('filesMsg').textContent = ''; $('confirm').classList.remove('show');
  showPanel('filesPanel'); layoutUI();
  if (audioOn) { SHA.setSong('title', M.ended ? 1.4 : 0); SHA.ambientOff(); }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('insert').onclick = () => { audioWake(); SFX.ok(); showFiles(); };
$('slot1').onclick = () => {
  SFX.static(0.3);
  if (M.ended) { $('filesMsg').textContent = 'You can\'t load that file. You\'re still in it.'; return; }
  M.slot1Taps = (M.slot1Taps || 0) + 1; saveMeta();
  $('filesMsg').textContent = ['This isn\'t your file.', 'Please don\'t.', 'SAVE 1 is at the lake. It\'s been at the lake for a long time.'][Math.min(2, M.slot1Taps - 1)];
};
$('slot2').onclick = () => {
  SFX.ok();
  if (SAVED && !SAVED.done) { S = SAVED; startGame(false); return; }
  $('nameIn').value = ''; $('nameMsg').textContent = ''; showPanel('namePanel'); setTimeout(() => $('nameIn').focus(), 50);
};
$('nameBack').onclick = () => showFiles();
$('nameForm').onsubmit = e => {
  e.preventDefault();
  const n = $('nameIn').value.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8);
  if (!n) { $('nameMsg').textContent = 'Type a name.'; return; }
  if (n === 'WREN' || (M.ended && n === M.endName)) { $('nameMsg').textContent = 'That name is taken.'; SFX.static(0.3); return; }
  $('nameIn').blur();
  S = newRun(n); save(); startGame(true);
};
$('eraseBtn').onclick = () => $('confirm').classList.add('show');
$('eraseNo').onclick = () => $('confirm').classList.remove('show');
$('eraseYes').onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} M = { ended: false, endName: '', slot1Taps: 0, muted: M.muted, sens: M.sens, inv: M.inv }; saveMeta(); SFX.static(0.6); showFiles(); };
async function startGame(fresh) {
  buildWorld(); audioWake();
  showPanel(null); mode = 'play'; layoutUI();
  hudKey = ''; statue.steps = 0; lastC = -1;
  S.hp = Math.max(S.hp || 0, 2);
  let a = S.area, sp = S.check && S.check.area === a ? { x: S.check.x, z: S.check.z, yaw: S.check.yaw } : 'start';
  if (!['village', 'hollow', 'b1'].includes(a)) { a = 'b1'; sp = 'start'; }
  if (fresh) { a = 'village'; sp = 'start'; }
  await goArea(a, sp);
  if (fresh) say([['', 'The cartridge clicks into place.'], ['', M.ended ? fmt('SAVE 1: ' + M.endName + ' · UNDER THE DOCK') : 'SAVE 1: WREN · THE LAKE', 0.03], ['', fmt('SAVE 2: {N} · NEW')], ['', 'Find the Elder near the middle of the village.']]);
}

// ---------------------------------------------------------------- main loop
let dlgCool = 0, fpsAcc = 0, fpsN = 0, fpsShow = QS.has('perf');
function npcsUpdate(dt) {
  const c = C();
  for (const n of area.npcs) {
    n.t += dt;
    const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz);
    if (n.facePlayer > 0) n.facePlayer -= dt;
    const look = d < 3.5 || n.facePlayer > 0 || c >= 2;
    const want = look ? Math.atan2(dx, dz) : n.baseRy + Math.sin(n.t * 0.4) * 0.35;
    n.mesh.rotation.y += angDiff(n.mesh.rotation.y, want) * Math.min(1, dt * (c >= 2 ? 20 : 5));
    animPerson(n.mesh, dt, 0);
    n.mesh.userData.head.rotation.x = c >= 3 ? 0.25 : Math.sin(n.t * 1.3) * 0.04;
  }
}
function step(dt) {
  U.uTime.value = now;
  if (mode === 'play' && !dlg) S.playMs += dt * 1000;
  const hadDlg = !!dlg;
  dlgUpdate(dt);
  if (hadDlg && !dlg) dlgCool = 0.2;
  if (dlgCool > 0) dlgCool -= dt;
  if (mode === 'play' && !dlg && !switching) {
    playerUpdate(dt);
    if (dlgCool <= 0) interUpdate(); else promptEl.classList.remove('on');
    itemsUpdate(dt); triggersUpdate(); foesUpdate(dt); statueUpdate(dt);
  } else { if (P.mesh) { animPerson(P.mesh, dt, 0); P.mesh.visible = area.id !== 'lakebed'; } promptEl.classList.remove('on'); statue.moving = false; }
  npcsUpdate(dt);
  if (area.update) area.update(dt);
  partsUpdate(dt); fxUpdate(dt); cameraUpdate(dt);
  lantern.position.set(P.x + Math.sin(P.face) * 0.6, P.y + 2.3, P.z + Math.cos(P.face) * 0.6);
  hud();
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
}
function frame(ts) {
  requestAnimationFrame(frame);
  now = ts / 1000; const dt = Math.min(0.05, Math.max(0.001, now - last || 0.016)); last = now;
  pollInput();
  if (mode === 'play' && !dlg && !switching) { if (pressed.start) openPause(); else if (pressed.select) openMap(); }
  else if (mode === 'pause' && pressed.start) closePause();
  else if (mode === 'map' && (pressed.select || pressed.start || pressed.B)) closeMap();
  if (area && (mode === 'play' || mode === 'dead' || mode === 'cut')) step(dt);
  if (area) {
    if (blinkT > 0) { scene.background.setHex(0); cam.layers.set(5); renderer.render(scene, cam); cam.layers.set(0); scene.background.setHex(baseBg); }
    else renderer.render(scene, cam);
  } else { renderer.setClearColor(0x000000); renderer.clear(); }
  SHA.tick();
  if (fpsShow) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { perfEl.textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + renderer.info.render.calls + ' calls · ' + VIEW_W + 'x' + VIEW_H; fpsAcc = 0; fpsN = 0; } }
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'play' && !dlg) openPause(); if (S && mode !== 'files') save(); } });
layoutUI();
// test hook
window.__s3d = { get mode() { return mode; }, get S() { return S; }, P, get area() { return area; }, statue, goArea, AREAS, get dlg() { return dlg; }, say, ending, U,
  setGod(v) { window.__god = v; }, keys, held, get camYaw() { return camYaw; }, set camYaw(v) { camYaw = v; }, startNew(name) { S = newRun(name || 'TESTER'); save(); return startGame(true); }, renderer, glitchKick, C };
// Android back button
window.shBack = () => {
  if (mode === 'map') { closeMap(); return 1; }
  if (mode === 'pause') { closePause(); return 1; }
  if (mode === 'play' && !dlg) { openPause(); return 1; }
  if (mode === 'play' || mode === 'cut' || mode === 'dead') return 1;
  return 0;
};
