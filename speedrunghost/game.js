'use strict';
/* Speedrun Ghost - (c) 2026 Buggy Games YT. All rights reserved. */
(() => {
const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
const T = 16, ROWS = 17, LH = ROWS * T, NLV = 20;
let VW = 480, VH = 270, SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  const cw = window.innerWidth, ch = window.innerHeight;
  cvs.width = Math.round(cw * DPR); cvs.height = Math.round(ch * DPR);
  cvs.style.width = cw + 'px'; cvs.style.height = ch + 'px';
  SC = Math.min(ch / 270, cw / 360); VW = cw / SC; VH = ch / SC;
}
addEventListener('resize', resize); resize();

/* ---------- save ---------- */
const SKEY = 'speedrunghost_v1';
let S = null;
try { S = JSON.parse(localStorage.getItem(SKEY)); } catch (e) {}
if (!S || typeof S !== 'object') S = {};
S.best = S.best || {}; S.beat = S.beat || {}; S.att = S.att || {}; S.seen = S.seen || {};
S.unl = S.unl || 1; S.deaths = S.deaths || 0; S.mute = !!S.mute; S.fin = !!S.fin;
function save() { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) {} }
function encPath(a) {
  const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
}
function decPath(b) {
  const s = atob(b), u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return new Int16Array(u8.buffer);
}

/* ---------- helpers ---------- */
function mul(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = f => (f / 60).toFixed(2);
const lvName = li => (li >> 2) + 1 + '-' + ((li & 3) + 1);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- levels ---------- */
function genLevel(li) {
  const R = mul(li * 9301 + 4927), wd = li >> 2;
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const cols = [];
  let h = 3;
  const add = (n, hh, o) => { for (let i = 0; i < n; i++) cols.push(Object.assign({ h: hh, sp: 0, pl: -1, fk: 0 }, o || {})); };
  add(12, h);
  const len = 88 + li * 6;
  const pool = ['flat', 'gap', 'gap', 'step', 'spike', 'spike', 'plats', 'pillar'];
  let last = '';
  while (cols.length < len) {
    let seg = pool[Math.floor(R() * pool.length)];
    if (seg === last && seg !== 'gap') seg = 'gap';
    last = seg;
    if (seg === 'flat') add(ri(2, 5), h);
    else if (seg === 'gap') {
      let w = ri(2, Math.min(4, 2 + (li / 5 | 0)));
      const nh = clamp(h + ri(-2, 1), 2, 8);
      if (nh > h) w = Math.min(w, 3);
      const fake = (wd === 3 && nh === h && R() < 0.6) ? h : 0;
      add(w, 0, { fk: fake });
      h = nh; add(ri(3, 4), h);
    } else if (seg === 'step') {
      h = clamp(h + ri(1, 3) * (R() < 0.5 ? -1 : 1), 2, 9); add(ri(3, 5), h);
    } else if (seg === 'spike') {
      add(2, h); add(ri(1, Math.min(3, 1 + (li / 4 | 0))), h, { sp: 1 }); add(3, h);
    } else if (seg === 'plats') {
      add(2, h); let cur = h; const n = ri(2, wd > 1 ? 3 : 2);
      for (let i = 0; i < n; i++) { add(ri(2, 3), 0); cur = clamp(cur + ri(-1, 2), 2, 10); add(ri(2, 3), 0, { pl: cur }); }
      add(ri(2, 3), 0); h = clamp(cur + ri(-1, 1), 2, 9); add(4, h);
    } else if (seg === 'pillar') {
      add(2, h); add(ri(1, 2), clamp(h + ri(2, 3), 2, 11)); add(3, h);
    }
  }
  add(14, h);
  const W = cols.length, g = new Uint8Array(W * ROWS);
  cols.forEach((c, x) => {
    if (c.h > 0) for (let r = ROWS - c.h; r < ROWS; r++) g[r * W + x] = 1;
    if (c.sp) g[(ROWS - c.h - 1) * W + x] = 2;
    if (c.pl >= 0) g[(ROWS - c.pl) * W + x] = 1;
    if (c.fk) g[(ROWS - c.fk) * W + x] = 3;
  });
  // background skyline
  const sky = [];
  for (let i = 0; i < 60; i++) sky.push({ x: i * 70 + R() * 40, w: 24 + R() * 40, h: 30 + R() * 110 });
  return { li, wd, W, g, base: g.slice(), cols, flagC: W - 6, flagY: (ROWS - h) * T, sx: 2 * T, sy: (ROWS - 3) * T - 14, sky };
}

/* ---------- state ---------- */
let state = 'title', L = null, P = null, G = null, rec = [], runF = 0, phase = 'ready', deadT = 0;
let temps = [], taunt = null, tauntCd = 120, sabT = 200, parts = [], camX = 0, camY = 0, tick = 0, glitchT = 0;
let result = null, sel = 0, inter = null, fin = null, ui = [], touchUI = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const I = { kl: 0, kr: 0, kj: 0, tl: 0, tr: 0, tj: 0, l: 0, r: 0, j: 0, jp: 0 };

const PAL = [
  { a: '#0b1630', b: '#1d3b6e', t: '#2b4c8c', top: '#5fd0ff', sk: 'rgba(95,208,255,.10)' },
  { a: '#160b2e', b: '#3a1d63', t: '#4a2b80', top: '#c77dff', sk: 'rgba(199,125,255,.10)' },
  { a: '#07190f', b: '#123d22', t: '#1f5a33', top: '#7dff9a', sk: 'rgba(125,255,154,.09)' },
  { a: '#1e0d06', b: '#5a2a10', t: '#6e3816', top: '#ffae5f', sk: 'rgba(255,174,95,.09)' },
  { a: '#050203', b: '#2a0508', t: '#3a0a10', top: '#ff3b4e', sk: 'rgba(255,59,78,.08)' },
];
const WORLDS = [
  ['WORLD 1: PRACTICE', 'Set a time. Your ghost will remember it.'],
  ['WORLD 2: SLOPPY', "Your ghost got faster. You didn't teach it that."],
  ['WORLD 3: CHEATER', "It's not following your route anymore."],
  ['WORLD 4: SABOTEUR', "It's been in your level. Don't trust the floor."],
  ['WORLD 5: HUNTER', "It doesn't want to race anymore. RUN."],
];
const TAUNTS = [
  ['...', 'again?', 'I remember this part'],
  ['too slow', 'I found a faster way', 'keep up', 'you missed that jump last time', 'attempt {a}. cute.'],
  ['walls are optional', 'why go around?', "I'm not following you anymore", '{d} deaths and counting', 'watch this', 'you taught me this'],
  ["don't trust the floor", 'I fixed your level', 'oops', 'I was here before you', 'that spike is new', 'you left the door open'],
  ['RUN', 'I remember you', "you're not the player", 'you were faster when you were me', 'stay', 'Player 2 is waiting'],
];
const FINALE = [
  'NEW BEST.', 'Saving ghost...', 'Ghost saved.', '...',
  "Funny. That's what it said when it saved you.",
  'You were never racing your ghost.', "You were someone else's.",
  'Player 2 has started a run.',
];

/* ---------- audio ---------- */
let AC = null, drone = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
}
function beep(f, d, type, v, slide) {
  if (!AC || S.mute) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.03);
}
function sfx(n) {
  if (n === 'jump') beep(420, 0.12, 'square', 0.04, 300);
  else if (n === 'die') beep(240, 0.45, 'sawtooth', 0.07, -190);
  else if (n === 'win') { beep(523, 0.1); setTimeout(() => beep(659, 0.1), 90); setTimeout(() => beep(784, 0.22), 180); }
  else if (n === 'lose') { beep(392, 0.15, 'triangle', 0.07); setTimeout(() => beep(311, 0.3, 'triangle', 0.07), 140); }
  else if (n === 'taunt') beep(98, 0.35, 'sine', 0.1, -30);
  else if (n === 'spike') beep(1100, 0.09, 'square', 0.03, -700);
  else if (n === 'click') beep(660, 0.05, 'square', 0.03);
}
function setDrone(wd) {
  stopDrone();
  if (!AC || S.mute || wd < 1) return;
  const g = AC.createGain(); g.gain.value = 0.012 * wd; g.connect(AC.destination);
  const o1 = AC.createOscillator(), o2 = AC.createOscillator();
  o1.type = 'sine'; o2.type = 'sine'; o1.frequency.value = 55 - wd * 3; o2.frequency.value = 55 - wd * 3 + 0.7 + wd * 0.4;
  o1.connect(g); o2.connect(g); o1.start(); o2.start();
  drone = { g, o: [o1, o2] };
}
function stopDrone() { if (drone) { try { drone.o.forEach(o => o.stop()); drone.g.disconnect(); } catch (e) {} drone = null; } }

/* ---------- tiles & physics ---------- */
function tile(c, r) { if (c < 0 || c >= L.W) return 1; if (r < 0 || r >= ROWS) return 0; return L.g[r * L.W + c]; }
const solid = (c, r) => tile(c, r) === 1;
function moveP(p, dx, dy) {
  p.x += dx;
  let c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.01) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 0.01) / T);
  if (dx > 0) { for (let r = r0; r <= r1; r++) if (solid(c1, r)) { p.x = c1 * T - p.w; p.vx = 0; break; } }
  else if (dx < 0) { for (let r = r0; r <= r1; r++) if (solid(c0, r)) { p.x = (c0 + 1) * T; p.vx = 0; break; } }
  p.y += dy; p.on = false;
  c0 = Math.floor(p.x / T); c1 = Math.floor((p.x + p.w - 0.01) / T); r0 = Math.floor(p.y / T); r1 = Math.floor((p.y + p.h - 0.01) / T);
  if (dy > 0) { for (let c = c0; c <= c1; c++) if (solid(c, r1)) { p.y = r1 * T - p.h; p.vy = 0; p.on = true; break; } }
  else if (dy < 0) { for (let c = c0; c <= c1; c++) if (solid(c, r0)) { p.y = (r0 + 1) * T; p.vy = 0; break; } }
}
function hitSpike(p) {
  const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (tile(c, r) === 2) {
    const sx = c * T + 3, sy = r * T + 7;
    if (p.x < sx + 10 && p.x + p.w > sx && p.y < sy + 9 && p.y + p.h > sy) return true;
  }
  return false;
}
function boxInSolid(x, y, w, h) {
  for (let r = Math.floor(y / T); r <= Math.floor((y + h - 1) / T); r++)
    for (let c = Math.floor(x / T); c <= Math.floor((x + w - 1) / T); c++)
      if (c >= 0 && c < L.W && tile(c, r) === 1) return true;
  return false;
}

/* ---------- ghost ---------- */
function buildGhost() {
  const wd = L.wd, li = L.li, att = S.att[li] || 0;
  if (wd === 4) return { hunt: true, x: L.sx, y: L.sy, trail: [], frames: 0 };
  let px = [], py = [];
  const b = S.best[li];
  if (b) { const a = decPath(b.p); for (let i = 0; i + 1 < a.length; i += 2) { px.push(a[i]); py.push(a[i + 1]); } }
  else if (wd > 0) {
    let x = L.sx, y = L.sy, ly = L.sy;
    while (x < L.flagC * T + 8) {
      const c = Math.floor((x + 5) / T); let top = -1;
      for (let r = 0; r < ROWS; r++) { const t = tile(c, r); if (t === 1 || t === 3) { top = r; break; } }
      const ty = top >= 0 ? top * T - 22 : ly; ly = ty; y += (ty - y) * 0.25;
      px.push(x); py.push(y); x += 5;
    }
  } else return null;
  if (wd === 1 || wd === 3) { // sloppy: skipped frames
    const nx = [], ny = [];
    for (let i = 0; i < px.length; i++) { if (i % 8 === 7) continue; if (i > 20 && i % 45 < 3) continue; nx.push(px[i]); ny.push(py[i]); }
    px = nx; py = ny;
  }
  if (wd >= 2) { // clipping shortcuts
    const k = (wd === 2 ? 3 : 4) + Math.min(2, att / 6 | 0), win = 50, keep = 18;
    if (px.length > 140) for (let w = k - 1; w >= 0; w--) {
      const s = Math.floor(px.length * (w + 1) / (k + 1)) - win / 2;
      if (s < 10 || s + win >= px.length - 5) continue;
      const ax = px[s], ay = py[s], bx = px[s + win], by = py[s + win], ix = [], iy = [];
      for (let j = 1; j <= keep; j++) { const t = j / (keep + 1); ix.push(ax + (bx - ax) * t); iy.push(ay + (by - ay) * t - Math.sin(t * Math.PI) * 6); }
      px.splice(s + 1, win - 1, ...ix); py.splice(s + 1, win - 1, ...iy);
    }
  }
  return { hunt: false, px, py, n: px.length, frames: (px.length - 1) * 2, x: px[0], y: py[0], trail: [], done: false };
}
function ghostAt(f) {
  const i = f / 2, i0 = Math.floor(i);
  if (i0 >= G.n - 1) return [G.px[G.n - 1], G.py[G.n - 1]];
  const t = i - i0; return [G.px[i0] + (G.px[i0 + 1] - G.px[i0]) * t, G.py[i0] + (G.py[i0 + 1] - G.py[i0]) * t];
}
function say(txt) {
  if (!G || !txt) return;
  txt = txt.replace('{a}', S.att[L.li] || 1).replace('{d}', S.deaths);
  taunt = { txt, t: 150 }; tauntCd = 260; sfx('taunt');
}

/* ---------- flow ---------- */
function startLevel(li) {
  L = genLevel(li); sel = li;
  state = 'play';
  if ((li & 3) === 0 && !S.seen[L.wd]) { state = 'inter'; inter = { t: 0 }; }
  resetRun();
  audio(); setDrone(L.wd);
}
function resetRun() {
  L.g = L.base.slice();
  P = { x: L.sx, y: L.sy, vx: 0, vy: 0, w: 10, h: 14, on: false, coy: 0, buf: 0, face: 1, sq: 0 };
  G = buildGhost(); rec = []; runF = 0; phase = 'ready'; deadT = 0; temps = []; taunt = null; tauntCd = 150;
  sabT = 160 + Math.random() * 80; parts = []; result = null; camX = 0;
  if (G && L.wd >= 2 && (S.att[L.li] || 0) > 0 && Math.random() < 0.5) { say(pick(TAUNTS[L.wd])); taunt.t = 110; }
}
function toLevels() { state = 'levels'; stopDrone(); }
function pause() { if (state === 'play') { state = 'pause'; stopDrone(); } }
function resume() { if (state === 'pause') { state = 'play'; setDrone(L.wd); } }
function die() {
  if (phase !== 'run') return;
  phase = 'dead'; deadT = 40; S.deaths++; save(); sfx('die');
  for (let i = 0; i < 18; i++) parts.push({ x: P.x + 5, y: P.y + 7, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5, t: 40 });
  if (G && L.wd > 0 && Math.random() < 0.35) { say(pick(['ha', 'again', '{d}', 'I never die', 'oops'])); }
}
function finish() {
  phase = 'done';
  const li = L.li, f = runF, prev = S.best[li], isBest = !prev || f < prev.f;
  if (isBest) S.best[li] = { f, p: encPath(Int16Array.from(rec)) };
  let ghostTxt, beat;
  if (!G) { ghostTxt = 'Ghost saved. Now race it.'; beat = false; }
  else if (G.hunt) { ghostTxt = 'YOU ESCAPED'; beat = true; }
  else { beat = f < G.frames; ghostTxt = beat ? 'YOU BEAT THE GHOST' : 'GHOST WINS  ' + fmt(G.frames) + (L.wd > 0 ? '  (it cheated)' : ''); }
  if (beat) S.beat[li] = 1;
  S.unl = Math.max(S.unl, Math.min(NLV, li + 2));
  save();
  sfx(beat || !G ? 'win' : 'lose');
  result = { f, isBest, best: S.best[li].f, ghostTxt, beat };
  state = 'result';
}
function nextLevel() {
  if (L.li >= NLV - 1) { state = 'finale'; stopDrone(); fin = { i: 0, c: 0, t: 0 }; return; }
  startLevel(L.li + 1);
}

/* ---------- update ---------- */
function update() {
  tick++;
  if (state === 'play') updatePlay();
  if (state === 'finale') { fin.t++; if (fin.t % 3 === 0 && fin.i < FINALE.length && fin.c < FINALE[fin.i].length) { fin.c++; if (fin.c % 2) beep(180 + Math.random() * 40, 0.03, 'square', 0.02); } }
  if (inter) inter.t++;
  if (glitchT > 0) glitchT--;
  I.jp = 0;
}
function updatePlay() {
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.t--; }
  parts = parts.filter(p => p.t > 0);
  if (taunt && --taunt.t <= 0) taunt = null;
  if (phase === 'dead') { if (--deadT <= 0) resetRun(); return; }
  if (phase === 'done') return;
  if (phase === 'ready') {
    if (!(I.l || I.r || I.jp)) return;
    phase = 'run'; S.att[L.li] = (S.att[L.li] || 0) + 1; save();
    rec.push(Math.round(P.x), Math.round(P.y));
  }
  runF++;
  // player
  const max = 2.8, acc = P.on ? 0.35 : 0.22;
  if (I.l && !I.r) { P.vx = Math.max(-max, P.vx - acc); P.face = -1; }
  else if (I.r && !I.l) { P.vx = Math.min(max, P.vx + acc); P.face = 1; }
  else { const f = P.on ? 0.3 : 0.08; P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
  if (I.jp) P.buf = 7; else if (P.buf > 0) P.buf--;
  if (P.on) P.coy = 6; else if (P.coy > 0) P.coy--;
  if (P.buf > 0 && P.coy > 0) { P.vy = -7.6; P.buf = 0; P.coy = 0; P.sq = 6; sfx('jump'); }
  if (!I.j && P.vy < -3) P.vy = -3;
  P.vy = Math.min(8, P.vy + 0.42);
  const wasOn = P.on;
  moveP(P, P.vx, P.vy);
  if (P.on && !wasOn) P.sq = -5;
  if (P.sq > 0) P.sq--; else if (P.sq < 0) P.sq++;
  if (runF % 2 === 0) rec.push(Math.round(P.x), Math.round(P.y));
  // ghost
  if (G) {
    G.trail.push([G.x, G.y]); if (G.trail.length > 10) G.trail.shift();
    if (G.hunt) {
      if (runF === 90) say(pick(['my turn', 'RUN', 'found you']));
      if (runF > 90) {
        const dx = P.x - G.x, dy = P.y - G.y, d = Math.hypot(dx, dy) || 1;
        const att = S.att[L.li] || 1;
        const sp = 1.75 + (L.li - 16) * 0.1 - Math.min(0.3, att * 0.02) + (d > 230 ? 1.6 : 0);
        G.x += dx / d * sp; G.y += dy / d * sp;
        if (d < 10) { die(); return; }
      }
    } else {
      const [gx, gy] = ghostAt(runF); G.x = gx; G.y = gy;
      if (!G.done && runF >= G.frames) { G.done = true; if (L.wd > 0) say(pick(['I win.', 'finished. obviously.', 'waiting...'])); }
    }
    G.inWall = boxInSolid(G.x + 1, G.y + 1, 8, 12);
    if (G.inWall && L.wd >= 2 && Math.random() < 0.08) glitchT = Math.max(glitchT, 3);
    const att = S.att[L.li] || 0;
    const pr = [att >= 8 ? 0.0012 : 0, 0.0025, 0.004, 0.005, 0.006][L.wd];
    if (!taunt && --tauntCd <= 0 && Math.random() < pr) say(pick(TAUNTS[L.wd]));
  }
  // sabotage
  if (L.wd >= 3) {
    if (--sabT <= 0) { sabT = (L.wd === 3 ? 150 : 230) + Math.random() * 120; sabotage(); }
    for (const s of temps) if (s.t > 0 && --s.t === 0) { L.g[s.r * L.W + s.c] = 2; }
    if (Math.random() < 0.002 * L.wd) glitchT = 6;
  }
  if (P.y > LH + 16 || hitSpike(P)) { die(); return; }
  if (P.x + P.w > L.flagC * T + 4) finish();
}
function sabotage() {
  if (!G) return;
  const pc = Math.floor(P.x / T);
  for (let k = 0; k < 10; k++) {
    const c = pc + 7 + Math.floor(Math.random() * 7);
    if (c >= L.flagC - 2) continue;
    const col = L.cols[c];
    if (!col || col.h <= 0 || col.sp || col.pl >= 0) continue;
    const r = ROWS - col.h - 1;
    if (tile(c, r) || tile(c - 1, r) || tile(c + 1, r) || tile(c - 2, r) === 2 || tile(c + 2, r) === 2) continue;
    if (!solid(c - 1, r + 1) || !solid(c + 1, r + 1)) continue;
    if (temps.some(s => Math.abs(s.c - c) < 3)) continue;
    temps.push({ c, r, t: 45 }); sfx('spike');
    if (!taunt && Math.random() < 0.4) say(pick(['that spike is new', 'oops', 'I fixed your level']));
    return;
  }
}

/* ---------- input ---------- */
function syncInput() {
  let tl = 0, tr = 0, tj = 0;
  for (const z of ptrs.values()) { if (z === 'l') tl = 1; else if (z === 'r') tr = 1; else if (z === 'j') tj = 1; }
  I.tl = tl; I.tr = tr; I.tj = tj;
  I.l = I.kl || tl; I.r = I.kr || tr; I.j = I.kj || tj;
}
const KL = ['ArrowLeft', 'KeyA'], KR = ['ArrowRight', 'KeyD'], KJ = ['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyK'];
addEventListener('keydown', e => {
  const c = e.code; audio();
  if (KL.includes(c) || KR.includes(c) || KJ.includes(c) || c === 'ArrowDown' || c === 'Enter') e.preventDefault();
  if (KL.includes(c)) I.kl = 1;
  if (KR.includes(c)) I.kr = 1;
  if (KJ.includes(c)) { if (!I.kj && !e.repeat) I.jp = 1; I.kj = 1; }
  syncInput();
  if (e.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(c)) return;
  if (c === 'KeyM') { S.mute = !S.mute; save(); if (S.mute) stopDrone(); else if (state === 'play') setDrone(L.wd); return; }
  const ok = c === 'Enter' || c === 'Space';
  if (state === 'title') { if (!e.repeat) { state = 'levels'; sel = Math.min(S.unl - 1, sel); sfx('click'); } }
  else if (state === 'levels') {
    if (c === 'ArrowLeft' || c === 'KeyA') sel = Math.max(0, sel - 1);
    if (c === 'ArrowRight' || c === 'KeyD') sel = Math.min(S.unl - 1, sel + 1);
    if (c === 'ArrowUp' || c === 'KeyW') sel = Math.max(0, sel - 4);
    if (c === 'ArrowDown' || c === 'KeyS') sel = Math.min(S.unl - 1, sel + 4);
    if (ok) { I.jp = 0; startLevel(sel); }
    if (c === 'Escape') state = 'title';
  } else if (state === 'play') {
    if (c === 'KeyR') resetRun();
    if (c === 'Escape' || c === 'KeyP') pause();
  } else if (state === 'pause') {
    if (c === 'Escape' || c === 'KeyP' || ok) { I.jp = 0; resume(); }
    if (c === 'KeyR') { resetRun(); resume(); }
    if (c === 'KeyL') toLevels();
  } else if (state === 'result') {
    if (ok) { I.jp = 0; nextLevel(); }
    if (c === 'KeyR') { state = 'play'; resetRun(); }
    if (c === 'Escape') toLevels();
  } else if (state === 'inter') { I.jp = 0; closeInter(); }
  else if (state === 'finale') advanceFinale();
});
addEventListener('keyup', e => {
  const c = e.code;
  if (KL.includes(c)) I.kl = 0;
  if (KR.includes(c)) I.kr = 0;
  if (KJ.includes(c)) I.kj = 0;
  syncInput();
});
const ptrs = new Map();
function lp(e) { return { x: e.clientX / SC, y: e.clientY / SC }; }
function zoneAt(x, y) {
  if (x > VW * 0.5) return 'j';
  if (y < VH * 0.3) return null;
  return x < 62 ? 'l' : 'r';
}
cvs.addEventListener('pointerdown', e => {
  e.preventDefault(); audio();
  if (e.pointerType === 'touch') touchUI = true;
  const p = lp(e);
  for (let i = ui.length - 1; i >= 0; i--) { const b = ui[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { sfx('click'); b.fn(); return; } }
  if (state === 'play') {
    if (!touchUI && e.pointerType === 'mouse') { return; }
    const z = zoneAt(p.x, p.y);
    if (z) { ptrs.set(e.pointerId, z); if (z === 'j') I.jp = 1; syncInput(); }
    try { cvs.setPointerCapture(e.pointerId); } catch (er) {}
  } else if (state === 'title') { state = 'levels'; sfx('click'); }
  else if (state === 'inter') closeInter();
  else if (state === 'finale') advanceFinale();
}, { passive: false });
cvs.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  const z = ptrs.get(e.pointerId);
  if (z === 'l' || z === 'r') { const p = lp(e); if (p.x < VW * 0.5) { ptrs.set(e.pointerId, p.x < 62 ? 'l' : 'r'); syncInput(); } }
});
function up(e) { if (ptrs.delete(e.pointerId)) syncInput(); }
cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up); cvs.addEventListener('lostpointercapture', up);
cvs.addEventListener('contextmenu', e => e.preventDefault());
function closeInter() { if (!inter || inter.t < 20) return; S.seen[L.wd] = 1; save(); inter = null; state = 'play'; }
function advanceFinale() {
  if (!fin) return;
  if (fin.i >= FINALE.length) { S.fin = true; save(); state = 'title'; fin = null; return; }
  if (fin.c < FINALE[fin.i].length) { fin.c = FINALE[fin.i].length; return; }
  fin.i++; fin.c = 0;
}
window.sgBack = () => {
  if (state === 'play') { pause(); return 1; }
  if (state === 'pause' || state === 'result' || state === 'inter') { inter = null; toLevels(); return 1; }
  if (state === 'levels') { state = 'title'; return 1; }
  if (state === 'finale') { advanceFinale(); return 1; }
  return 0;
};
addEventListener('pagehide', () => pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', () => { I.kl = I.kr = I.kj = 0; ptrs.clear(); syncInput(); });

/* ---------- drawing ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function text(s, x, y, size, color, align, bold) {
  ctx.font = (bold === false ? '' : 'bold ') + size + 'px ui-monospace, Menlo, Consolas, "Roboto Mono", monospace';
  ctx.fillStyle = color || '#fff'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
}
function button(label, x, y, w, h, fn, hot) {
  rr(x, y, w, h, 5); ctx.fillStyle = hot ? '#fff' : 'rgba(0,0,0,.55)'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  text(label, x + w / 2, y + h / 2 + 1, 11, hot ? '#000' : '#fff', 'center');
  ui.push({ x, y, w, h, fn });
}
function drawRunner(x, y, face, color, alpha, sq, eyes) {
  ctx.globalAlpha = alpha;
  const sw = 10 + (sq || 0) * -0.4, sh = 14 + (sq || 0) * 0.5;
  const ox = x + (10 - sw) / 2, oy = y + 14 - sh;
  rr(ox, oy, sw, sh, 3); ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = eyes || '#061020';
  const ex = face > 0 ? ox + sw - 5 : ox + 1;
  ctx.fillRect(ex, oy + 4, 2, 3); ctx.fillRect(ex + 3, oy + 4, 2, 3);
  ctx.globalAlpha = 1;
}
function drawGhost(x, y, a, face, wd) {
  const eye = wd >= 2 ? '#ff2040' : '#000';
  const col = S.fin ? '#5fd0ff' : '#e8f4ff';
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y + 4); ctx.quadraticCurveTo(x, y - 1, x + 5, y - 1); ctx.quadraticCurveTo(x + 10, y - 1, x + 10, y + 4); ctx.lineTo(x + 10, y + 14);
  const w = Math.sin(tick * 0.3) * 1.5;
  ctx.lineTo(x + 7.5, y + 12 + w); ctx.lineTo(x + 5, y + 14); ctx.lineTo(x + 2.5, y + 12 - w); ctx.closePath(); ctx.fill();
  ctx.fillStyle = eye; const ex = face > 0 ? x + 5 : x + 1;
  ctx.fillRect(ex, y + 4, 2, 3); ctx.fillRect(ex + 3, y + 4, 2, 3);
  ctx.globalAlpha = 1;
}
function drawBg(pal, cx) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (L) {
    ctx.fillStyle = pal.sk;
    for (const s of L.sky) { const x = s.x - cx * 0.3; if (x > -80 && x < VW + 20) ctx.fillRect(x, VH - s.h - 40, s.w, s.h + 40); }
  }
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for (let x = -((cx * 0.5) % 32); x < VW; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
}
function drawLevel() {
  const pal = PAL[L.wd];
  const tx = clamp(P.x - VW * 0.38, 0, Math.max(0, L.W * T - VW));
  camX += (tx - camX) * 0.2; if (Math.abs(tx - camX) > 200) camX = tx;
  camY = VH >= LH ? (LH - VH) / 2 : clamp(P.y - VH * 0.55, 0, LH - VH);
  drawBg(pal, camX);
  ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));
  const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(L.W - 1, Math.ceil((camX + VW) / T));
  for (let c = c0; c <= c1; c++) for (let r = 0; r < ROWS; r++) {
    const t = L.g[r * L.W + c]; if (!t) continue;
    const x = c * T, y = r * T;
    if (t === 1 || t === 3) {
      if (t === 3) ctx.globalAlpha = 0.82 + Math.sin(tick * 0.07 + c) * 0.1;
      ctx.fillStyle = pal.t; ctx.fillRect(x, y, T, T);
      const above = r > 0 ? L.g[(r - 1) * L.W + c] : 0;
      if (above !== 1 && above !== 3) { ctx.fillStyle = pal.top; ctx.fillRect(x, y, T, 3); }
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + T - 1, T, 1); ctx.fillRect(x + T - 1, y, 1, T);
      ctx.globalAlpha = 1;
    } else if (t === 2) {
      ctx.fillStyle = '#e8e8f0';
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 8, y + T); ctx.lineTo(x + k * 8 + 4, y + 6); ctx.lineTo(x + k * 8 + 8, y + T); ctx.closePath(); ctx.fill(); }
    }
  }
  // warning spikes
  for (const s of temps) if (s.t > 0) {
    ctx.globalAlpha = (s.t >> 2) % 2 ? 0.8 : 0.25; ctx.fillStyle = pal.top;
    ctx.fillRect(s.c * T + 2, s.r * T + T - 3, T - 4, 3);
    if (G) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(G.x + 5, G.y + 7); ctx.lineTo(s.c * T + 8, s.r * T + 14); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // flag
  const fx = L.flagC * T, fy = L.flagY;
  ctx.fillStyle = '#ddd'; ctx.fillRect(fx, fy - 56, 2, 56);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(fx + 2 + i * 5, fy - 56 + j * 5 + Math.sin(tick * 0.1 + i) * 1, 5, 5); }
  // ghost
  if (G && (phase !== 'ready' || !G.hunt)) {
    const wd = L.wd;
    G.trail.forEach((p, i) => drawGhost(p[0], p[1], 0.04 * i / 2, P.x > G.x ? 1 : -1, wd));
    const a = G.hunt ? 0.85 : 0.5 + (wd >= 2 ? Math.sin(tick * 0.5) * 0.12 : 0);
    if (G.inWall) {
      ctx.globalCompositeOperation = 'lighter';
      drawGhost(G.x - 2, G.y, 0.4, 1, wd); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      drawGhost(G.x + 2, G.y + (tick % 3 - 1), a, 1, wd);
    } else drawGhost(G.x, G.y, a, G.hunt ? (P.x > G.x ? 1 : -1) : 1, wd);
    if (taunt) {
      ctx.font = 'bold 9px ui-monospace, Menlo, Consolas, monospace';
      const w = ctx.measureText(taunt.txt).width + 10, bx = G.x + 5 - w / 2, by = G.y - 22;
      ctx.globalAlpha = Math.min(1, taunt.t / 20);
      rr(bx, by, w, 14, 3); ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fill(); ctx.strokeStyle = wd >= 2 ? '#ff3b4e' : '#fff'; ctx.lineWidth = 1; ctx.stroke();
      text(taunt.txt, G.x + 5, by + 7.5, 9, '#fff', 'center');
      ctx.globalAlpha = 1;
    }
  }
  // player
  if (phase !== 'dead') {
    if (S.fin) drawGhost(P.x, P.y, 0.55, P.face, 0);
    else drawRunner(P.x, P.y, P.face, '#5fd0ff', 1, P.sq);
  }
  for (const p of parts) { ctx.globalAlpha = p.t / 40; ctx.fillStyle = S.fin ? '#fff' : '#5fd0ff'; ctx.fillRect(p.x, p.y, 3, 3); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // hunter darkness
  if (L.wd === 4) {
    const sx = P.x + 5 - camX, sy = P.y + 7 - camY;
    const g = ctx.createRadialGradient(sx, sy, 40, sx, sy, 190);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.88)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}
function drawHUD() {
  text(lvName(L.li), 8, 12, 11, '#fff');
  text(fmt(runF), 44, 12, 11, '#fff');
  const b = S.best[L.li];
  text('BEST ' + (b ? fmt(b.f) : '--'), 8, 26, 9, 'rgba(255,255,255,.7)', 'left', false);
  if (G && !G.hunt && phase === 'run') {
    const ahead = P.x >= G.x;
    text(ahead ? 'AHEAD' : 'BEHIND', VW / 2, 12, 10, ahead ? '#7dff9a' : '#ff6b7a', 'center');
  } else if (G && G.hunt && phase === 'run') {
    const d = Math.hypot(P.x - G.x, P.y - G.y);
    text(d < 60 ? '!!!' : 'RUN', VW / 2, 12, 11, '#ff3b4e', 'center');
  }
  text('☠ ' + S.deaths, VW - 36, 12, 10, 'rgba(255,255,255,.75)', 'right');
  button('II', VW - 30, 3, 26, 20, pause);
  if (phase === 'ready' && state === 'play') {
    if ((tick >> 5) % 2) text(touchUI ? 'MOVE TO START' : 'MOVE TO START  (R restart, Esc pause)', VW / 2, VH * 0.32, 11, '#fff', 'center');
    if (!G && L.wd === 0) text('No ghost yet. Your first run becomes it.', VW / 2, VH * 0.32 + 16, 9, 'rgba(255,255,255,.7)', 'center', false);
  }
  if (touchUI && state === 'play') {
    const y = VH - 56;
    const pad = (x, lbl, on) => { ctx.beginPath(); ctx.arc(x, y + 24, 22, 0, Math.PI * 2); ctx.fillStyle = on ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.stroke(); text(lbl, x, y + 25, 14, 'rgba(255,255,255,.8)', 'center'); };
    pad(32, '◀', I.tl); pad(92, '▶', I.tr); pad(VW - 36, '▲', I.tj);
  }
}
function panel(w, h) { const x = (VW - w) / 2, y = (VH - h) / 2; rr(x, y, w, h, 8); ctx.fillStyle = 'rgba(5,5,10,.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke(); return [x, y]; }
function drawTitle() {
  L = L || null;
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, S.fin ? '#120206' : '#081022'); g.addColorStop(1, S.fin ? '#3a0710' : '#1d3b6e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const cy = VH * 0.36;
  for (let i = 4; i >= 0; i--) { ctx.globalAlpha = 0.12 * (5 - i) / 5; text('SPEEDRUN GHOST', VW / 2 - i * 6 + Math.sin(tick * 0.05) * i, cy, 30, '#e8f4ff', 'center'); }
  ctx.globalAlpha = 1;
  text('SPEEDRUN', VW / 2, cy - 18, 30, S.fin ? '#e8f4ff' : '#5fd0ff', 'center');
  text('GHOST', VW / 2, cy + 16, 30, S.fin ? '#ff3b4e' : '#e8f4ff', 'center');
  const gx = (tick * 1.6) % (VW + 60) - 30;
  if (S.fin) { drawRunner(gx + 26, VH * 0.62, 1, '#5fd0ff', 1, 0); drawGhost(gx, VH * 0.62, 0.6, 1, 0); }
  else { drawRunner(gx, VH * 0.62, 1, '#5fd0ff', 1, 0); drawGhost(gx - 26, VH * 0.62, 0.5, 1, 0); }
  text(S.fin ? 'Player 2 is racing you.' : 'Race your best run. It learns to cheat.', VW / 2, VH * 0.55, 10, 'rgba(255,255,255,.8)', 'center', false);
  if ((tick >> 5) % 2) text(touchUI ? 'TAP TO PLAY' : 'PRESS ANY KEY', VW / 2, VH * 0.76, 12, '#fff', 'center');
  text('© 2026 Buggy Games YT', VW / 2, VH - 12, 8, 'rgba(255,255,255,.45)', 'center', false);
  button(S.mute ? 'SOUND OFF' : 'SOUND ON', VW - 84, 6, 78, 20, () => { S.mute = !S.mute; save(); });
}
function drawLevels() {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#05070f'); g.addColorStop(1, '#141c33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  text('LEVELS', VW / 2, 16, 14, '#fff', 'center');
  button('◀', 6, 5, 28, 20, () => { state = 'title'; });
  text('☠ ' + S.deaths, VW - 8, 16, 9, 'rgba(255,255,255,.6)', 'right', false);
  const cw = Math.min(96, (VW - 70) / 4), chh = Math.min(40, (VH - 54) / 5), gx = (VW - cw * 4) / 2 + 14, gy = 32;
  for (let w = 0; w < 5; w++) {
    text('W' + (w + 1), gx - 16, gy + w * chh + chh / 2 - 1, 9, PAL[w].top, 'center');
    for (let l = 0; l < 4; l++) {
      const li = w * 4 + l, x = gx + l * cw, y = gy + w * chh, open = li < S.unl;
      rr(x + 2, y + 2, cw - 4, chh - 4, 4);
      ctx.fillStyle = open ? (li === sel ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)') : 'rgba(255,255,255,.02)'; ctx.fill();
      ctx.strokeStyle = li === sel && open ? '#fff' : (open ? PAL[w].top : 'rgba(255,255,255,.1)'); ctx.lineWidth = 1; ctx.stroke();
      if (open) {
        text(lvName(li), x + 8, y + chh / 2 - 5, 10, '#fff');
        const b = S.best[li]; text(b ? fmt(b.f) : '--', x + 8, y + chh / 2 + 8, 8, 'rgba(255,255,255,.65)', 'left', false);
        if (S.beat[li]) drawGhost(x + cw - 18, y + chh / 2 - 7, 0.9, -1, 0);
        ui.push({ x: x + 2, y: y + 2, w: cw - 4, h: chh - 4, fn: () => { sel = li; startLevel(li); } });
      } else text('--', x + cw / 2, y + chh / 2, 9, 'rgba(255,255,255,.2)', 'center');
    }
  }
  text('👻 = ghost beaten', VW / 2, VH - 9, 8, 'rgba(255,255,255,.4)', 'center', false);
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, VW, VH);
  const [x, y] = panel(170, 150);
  text('PAUSED', VW / 2, y + 18, 13, '#fff', 'center');
  button('RESUME', x + 25, y + 32, 120, 22, resume, true);
  button('RESTART', x + 25, y + 60, 120, 22, () => { resetRun(); resume(); });
  button('LEVELS', x + 25, y + 88, 120, 22, toLevels);
  button(S.mute ? 'SOUND: OFF' : 'SOUND: ON', x + 25, y + 116, 120, 22, () => { S.mute = !S.mute; save(); });
}
function drawResult() {
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, VW, VH);
  const [x, y] = panel(250, 150), r = result;
  text(r.isBest ? 'NEW BEST!' : 'FINISHED', VW / 2, y + 18, 14, r.isBest ? '#7dff9a' : '#fff', 'center');
  text('TIME  ' + fmt(r.f) + '     BEST  ' + fmt(r.best), VW / 2, y + 42, 10, '#fff', 'center');
  text(r.ghostTxt, VW / 2, y + 62, 10, r.beat || !G ? '#7dff9a' : '#ff6b7a', 'center');
  if (r.isBest && G && L.wd > 0 && L.wd < 4) text('Ghost updated. It will cheat harder.', VW / 2, y + 80, 8, 'rgba(255,255,255,.6)', 'center', false);
  const last = L.li >= NLV - 1;
  button('RETRY', x + 12, y + 104, 68, 26, () => { state = 'play'; resetRun(); });
  button('LEVELS', x + 91, y + 104, 68, 26, toLevels);
  button(last ? '???' : 'NEXT', x + 170, y + 104, 68, 26, nextLevel, true);
}
function drawInter() {
  ctx.fillStyle = 'rgba(0,0,0,.88)'; ctx.fillRect(0, 0, VW, VH);
  const w = WORLDS[L.wd];
  text(w[0], VW / 2, VH * 0.4, 16, PAL[L.wd].top, 'center');
  text(w[1], VW / 2, VH * 0.4 + 24, 10, '#fff', 'center', false);
  if (inter.t > 20 && (tick >> 5) % 2) text(touchUI ? 'TAP TO START' : 'PRESS ANY KEY', VW / 2, VH * 0.72, 10, 'rgba(255,255,255,.7)', 'center');
}
function drawFinale() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const n = Math.min(fin.i, FINALE.length - 1), lh = 16, top = VH / 2 - (n + 1) * lh / 2;
  for (let i = 0; i <= n && i < FINALE.length; i++) {
    const s = i < fin.i ? FINALE[i] : FINALE[i].slice(0, fin.c);
    text(s, VW / 2, top + i * lh, 10, i === FINALE.length - 1 ? '#ff3b4e' : '#e8f4ff', 'center', i === FINALE.length - 1);
  }
  if (fin.i >= FINALE.length || (fin.i === FINALE.length - 1 && fin.c >= FINALE[fin.i].length)) {
    if (fin.i === FINALE.length - 1 && fin.c >= FINALE[fin.i].length) { /* wait for tap */ }
    if ((tick >> 5) % 2) text('...', VW / 2, VH - 20, 10, '#666', 'center');
  }
}
function glitch() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const H = cvs.height, W = cvs.width;
  for (let i = 0; i < 4; i++) {
    const y = Math.random() * H, h = 4 + Math.random() * H * 0.06, dx = (Math.random() - 0.5) * W * 0.06;
    try { ctx.drawImage(cvs, 0, y, W, h, dx, y, W, h); } catch (e) {}
  }
}
function draw() {
  ctx.setTransform(SC * DPR, 0, 0, SC * DPR, 0, 0);
  ui = [];
  if (state === 'title') drawTitle();
  else if (state === 'levels') drawLevels();
  else if (state === 'finale') drawFinale();
  else {
    drawLevel();
    if (state === 'play') drawHUD();
    else if (state === 'pause') { drawHUD(); ui = []; drawPause(); }
    else if (state === 'result') drawResult();
    else if (state === 'inter') drawInter();
    if (glitchT > 0 && state === 'play') glitch();
  }
}
let acc = 0, lastT = performance.now();
function frame(t) {
  acc += Math.min(0.1, (t - lastT) / 1000); lastT = t;
  let n = 0; while (acc >= 1 / 60 && n < 6) { update(); acc -= 1 / 60; n++; }
  if (n === 6) acc = 0;
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__sg = { genLevel, S };
})();
