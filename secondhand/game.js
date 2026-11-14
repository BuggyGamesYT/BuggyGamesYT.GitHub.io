/* Secondhand · a game by Buggy Games YT · © 2026 Buggy Games YT. All rights reserved. */
(() => {
'use strict';

// ---------- constants ----------
const W = 256, H = 192, TS = 16, RW = 16, RH = 11, HUD = 16, PW = 256, PH = 176;
const SHW = window.SHW;
const ROOMS = SHW.ROOMS, SOLID = SHW.SOLID, WARP = SHW.WARP;
const cv = document.getElementById('cv');
const out = cv.getContext('2d');
cv.width = W; cv.height = H;
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
let g = buf.getContext('2d');
const dark = document.createElement('canvas'); dark.width = PW; dark.height = PH;
const dg = dark.getContext('2d');
out.imageSmoothingEnabled = false; g.imageSmoothingEnabled = false;

const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ---------- save data ----------
const KEY = 'secondhand-save-v1', META = 'secondhand-meta-v1', DEEPKEY = 'secondhand-deep-v1';
let S = null; // current run (story or deep)
let M = { visits: 0, lastPlayed: 0, wrenSeen: false, ended: false, endName: '', slot3Taps: 0, deepUnlocked: false, deepBest: 0 };
try { const m = JSON.parse(localStorage.getItem(META) || 'null'); if (m && typeof m === 'object') M = Object.assign(M, m); } catch (e) {}
function saveMeta() { try { localStorage.setItem(META, JSON.stringify(M)); } catch (e) {} }
function save() { if (!S) return; try { localStorage.setItem(S.deep ? DEEPKEY : KEY, JSON.stringify(S)); } catch (e) {} }
function newSeed() { return (Math.random() * 4294967296) >>> 0; }
function newRun(name) {
  return { v: 2, name, shards: { hollow: false, cave: false, mill: false }, bosses: { hollow: false, cave: false, mill: false },
    deaths: 0, hearts: 3, maxHearts: 3, room: 'village', x: 7.5 * 16, y: 6 * 16 + 8, playMs: 0, met: {}, flags: {},
    statueSteps: 0, caught: 0, keys: {}, opened: {}, taken: {}, solved: {}, fkeys: {}, pages: {}, disc: {}, lantern: false,
    floor: 0, seed: newSeed(), checkpoint: null, deep: false, kills: 0 };
}
function R(id) {
  if (ROOMS[id]) return ROOMS[id];
  const p = SHW.parseGen(id);
  if (!p || !S) return null;
  const fl = SHW.genFloor(S.seed, p.f, p.deep);
  return fl.rooms[id] || null;
}
// make old or odd saves safe to load
function migrate(s, deep) {
  if (!s || typeof s !== 'object' || typeof s.name !== 'string') return null;
  try {
    if (!s.v) {
      const old = s.shards || {};
      s.shards = { hollow: !!old.woods, cave: !!old.cave, mill: !!old.field };
      s.bosses = Object.assign({}, s.shards);
      const n = (s.shards.hollow ? 1 : 0) + (s.shards.cave ? 1 : 0) + (s.shards.mill ? 1 : 0);
      s.maxHearts = 3 + n;
      if (s.shards.cave) s.lantern = true;
      const remap = { field: 'highfield', cave: 'cavehill', void: 'highfield' };
      if (remap[s.room]) { s.room = remap[s.room]; s.x = 7.5 * 16; s.y = 6 * 16 + 8; }
      if (s.flags) { delete s.flags.gap; delete s.flags.void; }
    }
    const d = newRun(s.name);
    for (const k of Object.keys(d)) if (s[k] === undefined || s[k] === null && k !== 'checkpoint') s[k] = d[k];
    for (const k of ['shards', 'bosses', 'met', 'flags', 'keys', 'opened', 'taken', 'solved', 'fkeys', 'pages', 'disc']) if (typeof s[k] !== 'object' || !s[k]) s[k] = {};
    s.v = 2; s.deep = !!deep;
    s.maxHearts = clamp(s.maxHearts | 0 || 3, 3, 6);
    s.hearts = clamp(s.hearts | 0, 1, s.maxHearts);
    if (typeof s.seed !== 'number') s.seed = newSeed();
    S = s;
    let r = null; try { r = R(s.room); } catch (e) { r = null; }
    if (!r) { s.room = s.deep ? null : 'village'; s.x = 7.5 * 16; s.y = 6 * 16 + 8; }
    if (s.deep && !s.room) { const fi = SHW.floorInfo(s.seed, Math.max(1, s.floor), true); s.room = fi.start; s.x = fi.startArrive[0] * 16 + 8; s.y = fi.startArrive[1] * 16 + 12; }
    if (typeof s.x !== 'number' || typeof s.y !== 'number' || !isFinite(s.x) || !isFinite(s.y)) { s.x = 7.5 * 16; s.y = 6 * 16 + 8; }
    return s;
  } catch (e) { return null; }
}
let SAVED = null;
try { SAVED = migrate(JSON.parse(localStorage.getItem(KEY) || 'null'), false); } catch (e) { SAVED = null; }
S = SAVED;
const C = () => S ? (S.shards.hollow ? 1 : 0) + (S.shards.cave ? 1 : 0) + (S.shards.mill ? 1 : 0) : 0;
let muted = false;
try { muted = localStorage.getItem('secondhand-mute') === '1'; } catch (e) {}
const millOpen = () => C() >= 2 || (S && S.shards.mill);

// ---------- text helpers ----------
const GL = '█▓▒░#@%&?¿§¤';
function corrupt(s, amt) {
  if (amt <= 0) return s;
  let o = '';
  for (const ch of s) o += (ch !== ' ' && Math.random() < amt) ? GL[(Math.random() * GL.length) | 0] : ch;
  return o;
}
function timeStr() { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function dayStr() { return new Date().toLocaleDateString([], { weekday: 'long' }); }
function minsPlayed() { return Math.max(1, Math.round((S ? S.playMs : 0) / 60000)); }
function curDepth() { const r = room && R(room); return r && r.depth ? r.depth : 0; }
function pagesFound() { return S ? Object.keys(S.pages).length : 0; }
function fill(s) {
  const n = S ? S.name : 'PLAYER', f = curDepth();
  return s.replace(/\{N\}/g, n).replace(/\{T\}/g, timeStr()).replace(/\{D\}/g, dayStr())
    .replace(/\{M\}/g, String(minsPlayed())).replace(/\{X\}/g, String(S ? S.deaths : 0))
    .replace(/\{F2\}/g, String(f + 1)).replace(/\{F\}/g, String(f)).replace(/\{P\}/g, String(pagesFound()));
}

// ---------- tile lookup ----------
let room = 'village';
function tileAt(rid, tx, ty) {
  const r = R(rid);
  if (!r) return 'x';
  tx = clamp(tx, 0, RW - 1); ty = clamp(ty, 0, RH - 1);
  let ch = r.map[ty][tx];
  if (ch === 'L') { if (S.opened[rid + ':' + tx + ',' + ty]) ch = '_'; }
  else if (ch === 'G') { if (S.solved[rid]) ch = '_'; }
  else if (ch === 'Y') { if (r.memGate ? S.flags[r.memGate] : S.opened[rid + ':hatch']) ch = '>'; }
  else if (ch === 'O') { if (rid === 'oldmill' && !millOpen()) ch = 'Z'; }
  if (rid === 'lake' && tx === 6 && ty === 9 && S.flags.bellRung) ch = '>';
  return ch;
}

// ---------- pixel sprites ----------
// people are 10x14 templates; letters map to a palette. Shading, a hair shine and a 1px
// dark outline are added when the sprite is first cached, so drawing is one drawImage.
const HUMAN = {
  down: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '..ssssss..', '..skssks..', '..ssssss..', '...ssss...', '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pp..pp..', '..pp..pp..', '..bb..bb..'],
  up: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '..hhhhhh..', '..hhhhhh..', '..hhhhhh..', '...ssss...', '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pp..pp..', '..pp..pp..', '..bb..bb..'],
  side: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '..hhssss..', '..hsssks..', '..ssssss..', '...ssss...', '..cccccc..', '..scccc...', '..scccc...', '..cccccc..', '...pppp...', '...pppp...', '...bbbb...'],
};
// 4-frame walk: 1 and 3 are footfalls, 2 and 4 pass (body lifts a pixel)
const LEGS = {
  down: { 1: ['..pp..pp..', '..pp..bb..', '..bb......'], 3: ['..pp..pp..', '..bb..pp..', '......bb..'] },
  side: { 1: ['..pp..pp..', '.pp....pp.', '.bb....bb.'], 3: ['...pppp...', '..pp..pp..', '..bb..bb..'] },
};
const ARMS = { down: { 1: ['.sccccccs.', '..ccccccs.'], 3: ['.sccccccs.', '.scccccc..'] }, side: { 1: ['...cccc...', '...ccccs..'], 3: ['..scccc...', '..scccc...'] } };
const PAL = {
  player: { h: '#1f9e8f', s: '#f2c8a0', k: '#151515', c: '#d64541', p: '#2c3e70', b: '#3b2a1a' },
  elder: { h: '#e8e8e8', s: '#e9bf98', k: '#151515', c: '#6a4a8c', p: '#4a3466', b: '#2b1d10' },
  kid: { h: '#7a4a22', s: '#f4cfa8', k: '#151515', c: '#e8c23a', p: '#3a5aa0', b: '#3b2a1a' },
  shop: { h: '#2a2420', s: '#d9a57c', k: '#151515', c: '#3f8f5a', p: '#3a3a3a', b: '#222222' },
  wren: { h: '#22303c', s: '#b9cbd6', k: '#0b0f14', c: '#7fb2d9', p: '#2e4a66', b: '#1d2a36' },
  statue: { h: '#8d8d8d', s: '#a7a7a7', k: '#2a2a2a', c: '#7c7c7c', p: '#6c6c6c', b: '#575757' },
  statueR: { h: '#8d8d8d', s: '#a7a7a7', k: '#c01818', c: '#7c7c7c', p: '#6c6c6c', b: '#575757' },
  noface: { h: '#e8e8e8', s: '#e9bf98', k: '#e9bf98', c: '#6a4a8c', p: '#4a3466', b: '#2b1d10' },
  noface2: { h: '#6a4a2a', s: '#e0b89a', k: '#e0b89a', c: '#8a6aa0', p: '#4a4a6a', b: '#333333' },
  woodcutter: { h: '#5a3018', s: '#e2b48c', k: '#151515', c: '#b8332e', p: '#2c3e50', b: '#2b1d10' },
  keeper: { h: '#1a1a1a', s: '#d8b8a0', k: '#151515', c: '#26262c', p: '#16161a', b: '#0d0d0d' },
  digger: { h: '#5a4a3a', s: '#d9a57c', k: '#151515', c: '#6b5a3a', p: '#3a3020', b: '#221a10' },
  girl: { h: '#2a1a12', s: '#f2d2b6', k: '#151515', c: '#e8e8f0', p: '#e8e8f0', b: '#333333' },
  farmer: { h: '#d8b84a', s: '#e0a878', k: '#151515', c: '#4a7a3a', p: '#3a5a8a', b: '#3b2a1a' },
  traveler: { h: '#555555', s: '#cfa888', k: '#151515', c: '#6a6a70', p: '#3a3a40', b: '#222222' },
  fisher: { h: '#c9c9c9', s: '#d9a57c', k: '#151515', c: '#2f5f8f', p: '#3a3a3a', b: '#222222' },
  oldwoman: { h: '#cfcfcf', s: '#e6c2a2', k: '#151515', c: '#7a4a7a', p: '#5a3a5a', b: '#2a1a2a' },
  shadow: { h: '#0b0b0e', s: '#0b0b0e', k: '#e8e8e8', c: '#0b0b0e', p: '#0b0b0e', b: '#0b0b0e' },
  mimic: { h: '#111111', s: '#2a2a2a', k: '#ff2a2a', c: '#3a0a0a', p: '#111111', b: '#000000' },
};
// colour helpers (hex in, hex out)
const HEXC = {};
function rgbOf(h) {
  if (HEXC[h]) return HEXC[h];
  let s = h.replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  HEXC[h] = v; return v;
}
const hx2 = n => ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
function shade(h, k) { if (h[0] !== '#') return h; const [r, g_, b] = rgbOf(h); return k < 1 ? '#' + hx2(r * k) + hx2(g_ * k) + hx2(b * k) : '#' + hx2(r + (255 - r) * (k - 1)) + hx2(g_ + (255 - g_) * (k - 1)) + hx2(b + (255 - b) * (k - 1)); }
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const SPR = new Map();
const OUT = [22, 14, 28];
function addOutline(c, col) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  const im = x.getImageData(0, 0, w, h), d = im.data, o = new Uint8ClampedArray(d);
  const a = (i, j) => i < 0 || j < 0 || i >= w || j >= h ? 0 : d[(j * w + i) * 4 + 3];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (d[k + 3] > 90) continue;
    if (a(i - 1, j) > 90 || a(i + 1, j) > 90 || a(i, j - 1) > 90 || a(i, j + 1) > 90) { o[k] = col[0]; o[k + 1] = col[1]; o[k + 2] = col[2]; o[k + 3] = col[3] === undefined ? 255 : col[3]; }
  }
  im.data.set(o); x.putImageData(im, 0, 0);
}
function whiteOf(c) { const w = mkCanvas(c.width, c.height), x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w.width, w.height); return w; }
// cached sprite: draw(ctx) at (0,0) inside a 1px border used for the outline
function spr(key, w, h, draw, outline) {
  let e = SPR.get(key);
  if (e) return e;
  const c = mkCanvas(w + 2, h + 2), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; x.translate(1, 1); draw(x); x.setTransform(1, 0, 0, 1, 0, 0);
  if (outline !== false) addOutline(c, outline || OUT);
  e = { c, w: null };
  SPR.set(key, e);
  return e;
}
function blitSpr(e, x, y, white) { if (white) { if (!e.w) e.w = whiteOf(e.c); g.drawImage(e.w, x - 1, y - 1); } else g.drawImage(e.c, x - 1, y - 1); }
// string art: rows of letters -> colours
function art(ctx, ox, oy, rows, cols, flip) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r], n = row.length;
    for (let c = 0; c < n; c++) { const ch = row[flip ? n - 1 - c : c]; if (ch === '.' || ch === ' ') continue; ctx.fillStyle = cols[ch]; ctx.fillRect(ox + c, oy + r, 1, 1); }
  }
}
let palSeq = 0;
const palIds = new WeakMap();
function pid(p) { let i = palIds.get(p); if (i === undefined) { i = palSeq++; palIds.set(p, i); } return i; }
function humanRows(dir, step, noArms) {
  const side = dir >= 2;
  let rows = (dir === 1 ? HUMAN.up : dir === 0 ? HUMAN.down : HUMAN.side).slice();
  if (step === 1 || step === 3) {
    const L = (side ? LEGS.side : LEGS.down)[step]; rows[11] = L[0]; rows[12] = L[1]; rows[13] = L[2];
    const A_ = (side ? ARMS.side : ARMS.down)[step]; rows[8] = A_[0]; rows[9] = A_[1];
  }
  if (noArms) { rows[8] = rows[8].replace(/s/g, '.'); rows[9] = rows[9].replace(/s/g, '.'); }
  if (dir === 2) rows = rows.map(r => r.split('').reverse().join(''));
  return rows;
}
function humanSprite(pal, dir, step, noArms) {
  return spr('h' + pid(pal) + '_' + dir + '_' + step + (noArms ? 'n' : ''), 10, 14, x => {
    const rows = humanRows(dir, step, noArms);
    const light = dir === 2 ? 1 : -1; // light comes from the front-left
    for (let r = 0; r < 14; r++) for (let c = 0; c < 10; c++) {
      const ch = rows[r][c];
      if (ch === '.') continue;
      let col = pal[ch] || '#f0f';
      if (ch !== 'k') {
        const back = rows[r][c - light] === undefined ? '.' : rows[r][c - light];
        const below = rows[r + 1] ? rows[r + 1][c] : '.';
        if (back === '.' || (ch === 'h' && below === '.' && r > 2) || (ch === 'c' && r === 10)) col = shade(col, 0.72);
        else if (ch === 'h' && r <= 2 && (rows[r - 1] ? rows[r - 1][c] : '.') === '.' && (dir === 2 ? c >= 5 : c <= 4)) col = shade(col, 1.35);
      }
      x.fillStyle = col; x.fillRect(c, r, 1, 1);
    }
  });
}
function drawHuman(ctx, pal, dir, x, y, step, alpha, noArms, white) {
  step = step | 0;
  const e = humanSprite(pal, dir, step, noArms);
  const bob = step === 2 || step === 4 ? -1 : 0;
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  if (white) { if (!e.w) e.w = whiteOf(e.c); ctx.drawImage(e.w, Math.round(x - 5) - 1, Math.round(y - 13) - 1 + bob); }
  else ctx.drawImage(e.c, Math.round(x - 5) - 1, Math.round(y - 13) - 1 + bob);
  ctx.globalAlpha = 1;
}
const SHADOW = (() => { const c = mkCanvas(12, 4), x = c.getContext('2d'); x.fillStyle = 'rgba(10,8,20,.34)'; x.fillRect(2, 0, 8, 1); x.fillRect(0, 1, 12, 2); x.fillRect(2, 3, 8, 1); return c; })();
const SHADOWB = (() => { const c = mkCanvas(28, 7), x = c.getContext('2d'); x.fillStyle = 'rgba(10,8,20,.34)'; x.fillRect(5, 0, 18, 1); x.fillRect(2, 1, 24, 1); x.fillRect(0, 2, 28, 3); x.fillRect(2, 5, 24, 1); x.fillRect(5, 6, 18, 1); return c; })();
function drawShadow(x, y, big) { if (big) g.drawImage(SHADOWB, Math.round(x - 14), Math.round(y - 3)); else g.drawImage(SHADOW, Math.round(x - 6), Math.round(y - 2)); }
// soft round light, drawn additively
function glowSprite(r, col) {
  const c = mkCanvas(r * 2, r * 2), x = c.getContext('2d');
  const gr = x.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2);
  return c;
}
const GLOW = { torch: glowSprite(36, 'rgba(255,160,60,.7)'), torchB: glowSprite(34, 'rgba(110,170,255,.6)'), pool: glowSprite(26, 'rgba(255,150,60,.22)'), listen: glowSprite(34, 'rgba(200,220,255,.35)'), wisp: glowSprite(14, 'rgba(150,220,255,.6)'), beam: glowSprite(10, 'rgba(200,240,255,.8)'), lantern: glowSprite(60, 'rgba(255,190,110,.22)'), gold: glowSprite(12, 'rgba(255,220,120,.5)') };
function addGlow(c, x, y, a) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }

// ---------- tiles ----------
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const GLITCHABLE = ['.', ',', 'w', '=', 'T', 'S', 'r', '~', 'C', 'c', 'Q', '#', '_'];
const PALS = {
  hollow: { name: 'hollow', wall: '#5e4429', wall2: '#3a2816', top: '#3a2c1a', topHi: '#5e4a2e', moss: '#4f7f2c', floor: '#43392a', floor2: '#2f281b', floorHi: '#574b37', root: '#6e4c2a' },
  cave: { name: 'cave', wall: '#5b4f47', wall2: '#383029', top: '#3a322c', topHi: '#5c5047', moss: null, floor: '#3b332e', floor2: '#2a2420', floorHi: '#4d443d', floorMid: '#352e29' },
  mill: { name: 'mill', wall: '#70492a', wall2: '#3e2814', top: '#3e2814', topHi: '#6a4a28', moss: null, floor: '#94704a', floor2: '#6e5034', floorHi: '#b08a5c', plank: true },
  home: { name: 'home', wall: '#cbb996', wall2: '#a39274', top: '#4a3e32', topHi: '#6a5a48', moss: null, floor: '#7a5a3a', floor2: '#5a422a', floorHi: '#96724c', plank: true },
};
const PCACHE = {};
function hsl(h, s, l) { return 'hsl(' + ((h % 360 + 360) % 360) + ',' + s + '%,' + l + '%)'; }
function palFor(r) {
  if (!r || !r.pal) return PALS.cave;
  if (r.pal !== 'under') return PALS[r.pal] || PALS.cave;
  const f = r.depth || 1, k = 'u' + f + (r.deep ? 'd' : '');
  if (PCACHE[k]) return PCACHE[k];
  let h = 222 - f * 6, s = 14 + Math.min(20, f * 2);
  if (f >= 5 && f % 2 === 1) { h = (f * 67) % 360; s = 35 + (f % 3) * 10; } // wrong colours
  const h2 = h + (f >= 6 ? 140 : 0);
  const p = { name: 'under', depth: f, wall: hsl(h, s, 27), wall2: hsl(h, s, 15), top: hsl(h, s, 15), topHi: hsl(h, s, 27), moss: f >= 7 ? hsl(h + 180, 50, 30) : null,
    floor: hsl(h2, s - 4, 16), floor2: hsl(h2, s - 4, 8), floorHi: hsl(h2, s - 4, 23), floorMid: hsl(h2, s - 4, 13) };
  PCACHE[k] = p; return p;
}
// neighbour lookup for the tile being drawn (set per room build)
let NB = (x, y) => tileAt(room, x, y);
const fr = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const GRASSY = new Set('.,wTafrMgnPmK'.split(''));
const TREEY = new Set(['T', 'a']);
const WATERY = new Set(['~', 'B', 'U', 'e']);
const WALLISH = new Set(['#', 'J']);
const GR = { base: '#4f9f42', mid: '#469339', dark: '#367a31', light: '#69b84c', hi: '#94d466' };
function grass(x, y, tx, ty) {
  fr(GR.base, x, y, 16, 16);
  for (let i = 0; i < 2; i++) { const a = hash(tx, ty, i + 40), b = hash(ty, tx, i + 41); fr(GR.mid, x + ((a * 12) | 0), y + ((b * 12) | 0), 5, 3); fr(GR.mid, x + ((a * 12) | 0) + 1, y + ((b * 12) | 0) - 1, 3, 1); }
  for (let i = 0; i < 3; i++) {
    if (hash(tx, ty, i + 50) < 0.35) continue;
    const px = x + 1 + ((hash(tx, ty, i + 1) * 12) | 0), py = y + 2 + ((hash(ty, tx, i + 9) * 11) | 0);
    fr(GR.dark, px, py, 1, 2); fr(GR.dark, px + 2, py, 1, 2); fr(GR.dark, px + 1, py + 1, 1, 2); fr(GR.light, px + 1, py - 1, 1, 1);
  }
  if (hash(tx, ty, 77) < 0.6) fr(GR.hi, x + ((hash(tx, ty, 78) * 15) | 0), y + ((hash(tx, ty, 79) * 15) | 0), 1, 1);
  const up = NB(tx, ty - 1);
  if (ty > 0 && TREEY.has(up)) { fr('rgba(16,48,20,.32)', x + 2, y, 12, 1); fr('rgba(16,48,20,.26)', x + 1, y + 1, 14, 2); fr('rgba(16,48,20,.14)', x + 3, y + 3, 10, 1); }
  else if (ty > 0 && (up === 'R' || up === 'H')) fr('rgba(16,40,20,.25)', x, y, 16, 2);
}
function floorShadow(x, y, tx, ty) {
  const up = NB(tx, ty - 1), lf = NB(tx - 1, ty);
  if (ty > 0 && (WALLISH.has(up) || up === 'L' || up === 'z')) { fr('rgba(0,0,0,.42)', x, y, 16, 2); fr('rgba(0,0,0,.24)', x, y + 2, 16, 2); fr('rgba(0,0,0,.1)', x, y + 4, 16, 1); }
  if (tx > 0 && (WALLISH.has(lf))) { fr('rgba(0,0,0,.25)', x, y, 2, 16); fr('rgba(0,0,0,.1)', x + 2, y, 1, 16); }
}
function floorT(x, y, tx, ty, p) {
  if (p.plank) {
    fr(p.floor, x, y, 16, 16);
    for (let b = 0; b < 4; b++) {
      const by = y + b * 4;
      fr(p.floorHi, x, by, 16, 1); fr(p.floor2, x, by + 3, 16, 1);
      const sx = ((hash(tx, ty * 4 + b, 3) * 14) | 0) + 1; fr(p.floor2, x + sx, by, 1, 3);
      if (hash(tx, ty * 4 + b, 5) < 0.5) fr(p.floor2, x + ((hash(tx, b, 6) * 12) | 0) + 2, by + 1, 2, 1);
    }
  } else if (p.name === 'hollow') {
    fr(p.floor, x, y, 16, 16);
    // packed earth: soft lighter and darker patches, pebble clusters
    g.globalAlpha = 0.55;
    for (let i = 0; i < 2; i++) { const px = x + ((hash(tx, ty, i + 30) * 10) | 0), py = y + ((hash(ty, tx, i + 31) * 11) | 0); fr(i ? p.floor2 : p.floorHi, px, py, 6, 3); fr(i ? p.floor2 : p.floorHi, px + 1, py - 1, 4, 5); }
    g.globalAlpha = 1;
    if (hash(tx, ty, 33) < 0.22) { const px = x + 2 + ((hash(tx, ty, 34) * 10) | 0), py = y + 3 + ((hash(tx, ty, 35) * 9) | 0);
      for (const [dx, dy] of [[0, 0], [3, 1], [1, 3]]) { fr('#1e180f', px + dx, py + dy + 1, 2, 1); fr('#7a6a52', px + dx, py + dy, 2, 1); } }
    for (let i = 0; i < 5; i++) fr(i < 3 ? p.floor2 : p.floorHi, x + ((hash(tx, ty, i) * 14) | 0), y + ((hash(ty, tx, i + 3) * 14) | 0), i < 3 ? 2 : 1, 1);
    if (hash(tx, ty, 9) < 0.14) { const ry = y + 3 + ((hash(tx, ty, 10) * 9) | 0), rc = shade(p.root, 0.7); fr(rc, x, ry, 6, 1); fr(rc, x + 5, ry + 1, 5, 1); fr(rc, x + 9, ry, 7, 1); }
    if (hash(tx, ty, 14) < 0.3) { const px = x + 2 + ((hash(tx, ty, 15) * 11) | 0), py = y + 2 + ((hash(tx, ty, 16) * 11) | 0); fr(p.floor2, px, py + 1, 3, 1); fr(p.floorHi, px, py, 2, 1); }
  } else {
    // flagstones, 2x2 per tile, a little uneven
    fr(p.floor2, x, y, 16, 16);
    const off = p.name === 'cave' ? ((ty & 1) ? 4 : 0) : 0;
    for (let j = 0; j < 2; j++) for (let i = -1; i < 2; i++) {
      const sx = x + i * 8 + (j ? off : 0), sy = y + j * 8, w = 7, h = 7;
      const cx = Math.max(sx, x), cw = Math.min(sx + w, x + 16) - cx;
      if (cw <= 0) continue;
      fr(hash(tx * 2 + i, ty * 2 + j, 4) < 0.3 ? (p.floorMid || p.floor) : p.floor, cx, sy, cw, h);
      if (sx >= x) fr(p.floorHi, sx, sy, 1, h);
      fr(p.floorHi, cx, sy, cw, 1);
    }
    const crack = p.name === 'under' ? Math.min(0.6, 0.12 + (p.depth || 1) * 0.04) : 0.12;
    if (hash(tx, ty, 8) < crack) { const cx = x + 3 + ((hash(tx, ty, 11) * 9) | 0), cy = y + 3 + ((hash(tx, ty, 12) * 9) | 0); fr(p.floor2, cx, cy, 1, 3); fr(p.floor2, cx + 1, cy + 2, 2, 1); fr(p.floor2, cx + 3, cy + 3, 1, 2); }
  }
  floorShadow(x, y, tx, ty);
}
function shadeAny(a, b) { return b; }
function baseFor(r, x, y, tx, ty) { if (r && r.pal) floorT(x, y, tx, ty, palFor(r)); else grass(x, y, tx, ty); }
const TREE_ART = [
  '....oooooooo....',
  '..oohhllllmmoo..',
  '.ohhllllllmmmmo.',
  '.ohlllllllmmmmo.',
  'olllllllmmmmmmdo',
  'ollllllmmmmmmddo',
  'omllllmmmmmmmddo',
  'ommmmmmmmmmmdddo',
  'odmmmmmmmmmddddo',
  '.odmmmmmmmdddddo',
  '.oddmmmmmdddddo.',
  '..ooddddddddoo..',
  '....ooottooo....',
  '.....ottTTo.....',
  '.....ottTTo.....',
  '....oottTTToo...'];
const TREE_COL = { o: '#163a1b', d: '#22602a', m: '#327f36', l: '#4aa543', h: '#82cf62', t: '#7a4d28', T: '#4a2c16' };
function tree(x, y, tx, ty, apples) {
  grass(x, y, tx, ty);
  const flip = hash(tx, ty, 13) < 0.5;
  art(g, x, y, TREE_ART, TREE_COL, flip);
  for (let i = 0; i < 4; i++) { const px = x + 3 + ((hash(tx, ty, i + 60) * 9) | 0), py = y + 3 + ((hash(ty, tx, i + 61) * 6) | 0); fr(i < 2 ? TREE_COL.d : TREE_COL.l, px, py, 2, 1); }
  if (apples) {
    const dark = C() >= 2;
    for (let i = 0; i < 5; i++) {
      const px = x + 3 + ((hash(tx, ty, i) * 9) | 0), py = y + 2 + ((hash(ty, tx, i) * 7) | 0);
      fr(dark ? '#3a0a0a' : '#d8302a', px, py, 2, 2); if (!dark) fr('#ffb0a0', px, py, 1, 1); else fr('#1a0505', px + 1, py + 1, 1, 1);
    }
  }
}
function roofT(x, y, tx, ty) {
  const base = '#b8483a', dk = '#86302a', lt = '#d86a52', ol = '#3a1410';
  fr(base, x, y, 16, 16);
  for (let b = 0; b < 4; b++) {
    const by = y + b * 4; fr(lt, x, by, 16, 1); fr(dk, x, by + 3, 16, 1);
    for (let sx = (b & 1) ? 2 : 6; sx < 16; sx += 8) fr(dk, x + sx, by + 1, 1, 2);
  }
  const u = NB(tx, ty - 1) !== 'R' || ty === 0, l = NB(tx - 1, ty) !== 'R', rr = NB(tx + 1, ty) !== 'R', d = NB(tx, ty + 1) !== 'R';
  if (u) { fr(ol, x, y, 16, 1); fr('#e8846a', x, y + 1, 16, 1); }
  if (l) { fr(ol, x, y, 1, 16); fr(lt, x + 1, y, 1, 16); }
  if (rr) { fr(ol, x + 15, y, 1, 16); fr(dk, x + 14, y, 1, 16); }
  if (d) { fr(dk, x, y + 13, 16, 2); fr(ol, x, y + 15, 16, 1); }
}
function wallT(x, y, tx, ty, door) {
  const pl = '#ecdcb6', ps = '#d2c094', ol = '#4a3420';
  fr(pl, x, y, 16, 16);
  if (hash(tx, ty, 3) < 0.6) fr(ps, x + ((hash(tx, ty, 4) * 12) | 0), y + 4 + ((hash(tx, ty, 5) * 6) | 0), 3, 1);
  fr('#9a907e', x, y + 13, 16, 3); fr('#7a7062', x, y + 15, 16, 1); fr('#b8ae9a', x, y + 13, 16, 1);
  for (let i = 2; i < 16; i += 5) fr('#7a7062', x + i, y + 13, 1, 2);
  if (NB(tx, ty - 1) === 'R') { fr('rgba(60,20,10,.35)', x, y, 16, 2); fr('rgba(60,20,10,.15)', x, y + 2, 16, 1); }
  if (!'HD'.includes(NB(tx - 1, ty))) fr(ol, x, y, 1, 16);
  if (!'HD'.includes(NB(tx + 1, ty))) { fr(ol, x + 15, y, 1, 16); fr(ps, x + 14, y, 1, 13); }
  if (door) return;
  // window
  fr('#5a3a1e', x + 3, y + 3, 10, 8); fr('#2e5a90', x + 4, y + 4, 8, 6);
  fr('#6aa0dc', x + 4, y + 4, 3, 1); fr('#6aa0dc', x + 4, y + 5, 1, 2); fr('#a8d0f4', x + 5, y + 5, 1, 1);
  fr('#5a3a1e', x + 7, y + 4, 2, 6); fr('#5a3a1e', x + 4, y + 6, 8, 1);
  fr('#d8c8a0', x + 2, y + 11, 12, 1); fr('#8a6a40', x + 2, y + 12, 12, 1);
}
function doorT(x, y, tx, ty) {
  wallT(x, y, tx, ty, true);
  fr('#3a2412', x + 2, y + 2, 12, 14); fr('#3a2412', x + 3, y + 1, 10, 1);
  fr('#7a4a24', x + 3, y + 3, 10, 13); fr('#8e5a2e', x + 4, y + 2, 8, 1);
  fr('#5a3418', x + 6, y + 3, 1, 13); fr('#5a3418', x + 9, y + 3, 1, 13);
  fr('#9a6a3a', x + 3, y + 3, 1, 13);
  fr('#e8c050', x + 10, y + 9, 2, 2); fr('#8a6a20', x + 11, y + 10, 1, 1);
  fr('#9a9488', x + 1, y + 15, 14, 1);
}
function fenceT(x, y, tx, ty) {
  grass(x, y, tx, ty);
  const wd = '#b98a52', lt = '#dcae70', dk = '#7a5430', ol = '#3a2410';
  const l = NB(tx - 1, ty) === 'f', r = NB(tx + 1, ty) === 'f';
  const x0 = l ? 0 : 2, x1 = r ? 16 : 14;
  for (const ry of [5, 10]) { fr(ol, x + x0, y + ry - 1, x1 - x0, 4); fr(wd, x + x0, y + ry, x1 - x0, 2); fr(lt, x + x0, y + ry, x1 - x0, 1); }
  for (const px of [2, 11]) { fr(ol, x + px - 1, y + 2, 5, 13); fr(wd, x + px, y + 3, 3, 11); fr(lt, x + px, y + 3, 1, 11); fr(dk, x + px + 2, y + 3, 1, 11); fr(lt, x + px, y + 3, 3, 1); }
  fr('rgba(16,48,20,.3)', x + 1, y + 14, 14, 2);
}
function rockT(x, y, tx, ty) {
  grass(x, y, tx, ty);
  art(g, x + 1, y + 2, [
    '....oooooo....',
    '..oollllmmoo..',
    '.ollhllmmmmmo.',
    '.olllmmmmmmdo.',
    'olmmmmmmmmmddo',
    'ommmmmmmmmdddo',
    'ommmmmmmmddddo',
    'odmmmmmdddddo.',
    '.oddddddddoo..',
    '..oooooooo....'], { o: '#26262c', l: '#a6a6ae', h: '#d6d6dc', m: '#808088', d: '#5c5c66' }, hash(tx, ty, 3) < 0.5);
  fr('rgba(16,48,20,.32)', x + 2, y + 12, 13, 2);
  if (hash(tx, ty, 4) < 0.5) { fr('#5a8a3a', x + 4, y + 9, 3, 1); fr('#4a7a2e', x + 5, y + 10, 2, 1); }
}
function graveT(x, y, tx, ty) {
  grass(x, y, tx, ty);
  const lean = hash(tx, ty, 7) < 0.3 ? 1 : 0;
  art(g, x + 3 + lean, y + 1, [
    '...oooo...',
    '.oollmmoo.',
    'olllmmmmdo',
    'ollmmmmmdo',
    'olmmmmmmdo',
    'olmmmmmmdo',
    'ommmmmmmdo',
    'ommmmmmmdo',
    'ommmmmmmdo',
    'ommmmmmddo',
    'odmmmmmddo',
    'odddddddo.',
    'oooooooooo'], { o: '#26262e', l: '#b8b8c2', m: '#8a8a96', d: '#646470' });
  fr('#55555f', x + 7 + lean, y + 4, 2, 6); fr('#55555f', x + 5 + lean, y + 6, 6, 2);
  fr('#3e7a34', x + 2, y + 13, 3, 2); fr('#5aa043', x + 12, y + 13, 2, 2); fr('rgba(16,48,20,.3)', x + 3, y + 14, 11, 2);
}
function signT(x, y, tx, ty, r) {
  if (r && r.pal) floorT(x, y, tx, ty, palFor(r)); else grass(x, y, tx, ty);
  fr('#2a1a0c', x + 6, y + 8, 4, 8); fr('#6b4320', x + 7, y + 9, 2, 7);
  fr('#2a1a0c', x + 1, y + 1, 14, 10); fr('#b8884e', x + 2, y + 2, 12, 8); fr('#d8aa6a', x + 2, y + 2, 12, 1); fr('#8a6234', x + 2, y + 9, 12, 1);
  fr('#6a4a24', x + 4, y + 4, 8, 1); fr('#6a4a24', x + 4, y + 6, 6, 1);
}
function pathT(x, y, tx, ty, sand) {
  const base = sand ? '#e6d29c' : '#cfa66b', dk = sand ? '#d2bb83' : '#b08650', lt = sand ? '#f4e6bc' : '#e2c088';
  fr(base, x, y, 16, 16);
  for (let i = 0; i < 4; i++) { const px = x + ((hash(tx, ty, i) * 14) | 0), py = y + ((hash(ty, tx, i) * 14) | 0); fr(dk, px, py, 2, 1); fr(lt, px, py - 1, 1, 1); }
  if (sand) { for (let i = 0; i < 2; i++) { const py = y + 4 + i * 7 + ((hash(tx, ty, i + 9) * 3) | 0); fr(dk, x + 2, py, 4, 1); fr(dk, x + 6, py - 1, 3, 1); fr(dk, x + 9, py, 4, 1); } }
  else if (hash(tx, ty, 20) < 0.5) { const px = x + 3 + ((hash(tx, ty, 21) * 9) | 0), py = y + 3 + ((hash(tx, ty, 22) * 9) | 0); fr('#8e7a62', px, py, 3, 2); fr('#b8a48a', px, py, 2, 1); }
  // grass edges bite into the path
  const edge = (side) => {
    for (let i = 0; i < 16; i++) {
      const d = 1 + ((hash(tx * 3 + i, ty * 5 + side.length, 30) * 2.2) | 0);
      if (side === 'n') { fr(GR.base, x + i, y, 1, d); fr(GR.dark, x + i, y + d, 1, 1); }
      if (side === 's') { fr(GR.base, x + i, y + 16 - d, 1, d); fr(dk, x + i, y + 15 - d, 1, 1); }
      if (side === 'w') { fr(GR.base, x, y + i, d, 1); fr(GR.dark, x + d, y + i, 1, 1); }
      if (side === 'e') { fr(GR.base, x + 16 - d, y + i, d, 1); fr(GR.dark, x + 15 - d, y + i, 1, 1); }
    }
  };
  if (GRASSY.has(NB(tx, ty - 1)) && ty > 0) edge('n');
  if (GRASSY.has(NB(tx, ty + 1)) && ty < RH - 1) edge('s');
  if (GRASSY.has(NB(tx - 1, ty)) && tx > 0) edge('w');
  if (GRASSY.has(NB(tx + 1, ty)) && tx < RW - 1) edge('e');
}
function waterCols(r) { return r && (r.night || r.gen) ? { base: '#16356a', deep: '#0f2754', band: '#2a4f8a', edge: '#5f86c0', hi: '#6e96d0', foam: '#a8c4ea' } : { base: '#3572c8', deep: '#2a5eb0', band: '#4f8ad8', edge: '#9cc8f2', hi: '#a6d0f6', foam: '#eef8ff' }; }
function waterT(x, y, tx, ty, r) {
  const W_ = waterCols(r);
  fr(W_.base, x, y, 16, 16);
  for (let i = 0; i < 3; i++) { const px = x + ((hash(tx, ty, i + 3) * 12) | 0), py = y + 2 + ((hash(ty, tx, i + 5) * 12) | 0); fr(W_.deep, px, py, 4 + (i & 1) * 2, 1); fr(W_.deep, px + 1, py + 1, 2, 1); }
  const sh = (dx, dy) => { const c = NB(tx + dx, ty + dy); return !WATERY.has(c) && !(tx + dx < 0 || tx + dx >= RW || ty + dy < 0 || ty + dy >= RH); };
  if (sh(0, -1)) { const c = NB(tx, ty - 1); if (c === 'd' || c === 'B') { fr('rgba(8,20,50,.45)', x, y, 16, 3); } else { fr(W_.band, x, y, 16, 3); fr(W_.edge, x, y, 16, 1); } }
  if (sh(0, 1)) { fr(W_.band, x, y + 14, 16, 2); fr(W_.edge, x, y + 15, 16, 1); }
  if (sh(-1, 0)) { fr(W_.band, x, y, 2, 16); fr(W_.edge, x, y, 1, 16); }
  if (sh(1, 0)) { fr(W_.band, x + 14, y, 2, 16); fr(W_.edge, x + 15, y, 1, 16); }
}
// animated layer for water (k = 0..3)
function waterFx(x, y, tx, ty, r, k) {
  const W_ = waterCols(r);
  for (let i = 0; i < 2; i++) {
    const ph = (hash(tx, ty, i + 70) * 4) | 0;
    if (((k + ph) & 3) === 3) continue;
    const px = x + 1 + ((hash(tx, ty, i + 71) * 10) | 0) + (((k + ph) & 3) === 1 ? 1 : 0), py = y + 3 + ((hash(ty, tx, i + 72) * 10) | 0);
    fr(W_.hi, px, py, ((k + ph) & 1) ? 3 : 2, 1);
  }
  const sh = (dx, dy) => { const c = NB(tx + dx, ty + dy); return !WATERY.has(c) && !(tx + dx < 0 || tx + dx >= RW || ty + dy < 0 || ty + dy >= RH) && c !== 'd' && c !== 'B'; };
  g.fillStyle = W_.foam;
  for (let i = 0; i < 16; i += 4) {
    const o = (i + k + tx * 3 + ty) % 16, ln = 2 + ((k + i) & 1);
    if (sh(0, -1)) g.fillRect(x + o, y + 1 + ((k + i) & 1), ln, 1);
    if (sh(0, 1)) g.fillRect(x + o, y + 13 - ((k + i) & 1), ln, 1);
    if (sh(-1, 0)) g.fillRect(x + 1 + ((k + i) & 1), y + o, 1, ln);
    if (sh(1, 0)) g.fillRect(x + 14 - ((k + i) & 1), y + o, 1, ln);
  }
}
function tallGrass(x, y, tx, ty, k) {
  fr('#3d8a36', x, y, 16, 16);
  const sw = [0, 1, 0, -1][(k + tx + ty) & 3];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const bx = x + col * 5 + (row & 1 ? 2 : 0), by = y + 2 + row * 5;
    if (bx > x + 13) continue;
    fr('#2a6a2a', bx, by + 1, 1, 4); fr('#2a6a2a', bx + 2, by + 1, 1, 4);
    fr('#5cb84a', bx + sw, by - 1, 1, 2); fr('#5cb84a', bx + 2 + sw, by - 1, 1, 2); fr('#86d064', bx + 1 + sw, by - 2, 1, 3);
    fr('#2f7a30', bx + 1, by + 2, 1, 3);
  }
}
function marshT(x, y, tx, ty) {
  fr('#556236', x, y, 16, 16);
  for (let i = 0; i < 3; i++) fr('#46542c', x + ((hash(tx, ty, i) * 12) | 0), y + ((hash(ty, tx, i) * 13) | 0), 4, 2);
  const px = x + 2 + ((hash(tx, ty, 5) * 6) | 0), py = y + 4 + ((hash(tx, ty, 6) * 6) | 0);
  fr('#2a3e44', px, py, 7, 3); fr('#2a3e44', px + 1, py - 1, 5, 1); fr('#3e5a62', px + 1, py, 5, 1); fr('#8ab0b6', px + 2, py, 2, 1);
  for (let i = 0; i < 3; i++) { const rx = x + 2 + ((hash(tx, ty, i + 9) * 12) | 0), ry = y + 6 + ((hash(tx, ty, i + 12) * 6) | 0); fr('#6e7a30', rx, ry, 1, 5); fr('#a89a4a', rx, ry - 1, 1, 2); }
}
function dockT(x, y, tx, ty) {
  fr('#9a6634', x, y, 16, 16);
  for (let b = 0; b < 4; b++) {
    const by = y + b * 4;
    fr('#c08850', x, by, 16, 1); fr('#5e3a1a', x, by + 3, 16, 1);
    const sx = ((hash(tx, ty * 4 + b, 2) * 12) | 0) + 2; fr('#5e3a1a', x + sx, by, 1, 3);
    fr('#2e2016', x + 2, by + 1, 1, 1); fr('#2e2016', x + 13, by + 1, 1, 1);
  }
  if (!['d', 'B'].includes(NB(tx - 1, ty))) fr('#3a2410', x, y, 1, 16);
  if (!['d', 'B'].includes(NB(tx + 1, ty))) fr('#3a2410', x + 15, y, 1, 16);
}
function cliffT(x, y, tx, ty) {
  const front = NB(tx, ty + 1) !== 'C' || ty === RH - 1 && false;
  if (front) {
    fr('#6b5a4e', x, y, 16, 16);
    for (let i = 0; i < 4; i++) { const sx = x + 1 + i * 4 + ((hash(tx, ty, i) * 2) | 0); fr('#4e4038', sx, y + 2, 1, 13); fr('#86736a', sx + 1, y + 3, 1, 10); }
    fr('#8a7a6e', x, y, 16, 2); fr('#a8988a', x, y, 16, 1);
    fr('#3a2e28', x, y + 15, 16, 1);
  } else {
    fr('#594a40', x, y, 16, 16);
    for (let i = 0; i < 4; i++) fr(i & 1 ? '#6a5a4e' : '#4a3d35', x + ((hash(tx, ty, i) * 13) | 0), y + ((hash(ty, tx, i) * 13) | 0), 3, 2);
    if (hash(tx, ty, 9) < 0.4) { fr('#4a7a34', x + 3, y + 5, 3, 1); fr('#5aa043', x + 4, y + 4, 1, 1); }
    if (NB(tx, ty - 1) !== 'C' && ty > 0) fr('#7a6a5e', x, y, 16, 1);
  }
}
function barkT(x, y, tx, ty) {
  fr('#5a3e24', x, y, 16, 16);
  for (let i = 0; i < 4; i++) { const sx = x + 1 + i * 4 + ((hash(tx, ty, i) * 2) | 0); fr('#3a2614', sx, y, 1, 16); fr('#7a5634', sx + 1, y, 1, 16); }
  if (hash(tx, ty, 5) < 0.4) { const kx = x + 4 + ((hash(tx, ty, 6) * 6) | 0), ky = y + 4 + ((hash(tx, ty, 7) * 6) | 0); fr('#2a1a0c', kx, ky, 4, 3); fr('#4a3018', kx + 1, ky + 1, 2, 1); }
  if (NB(tx, ty - 1) !== 'K' && ty > 0) { fr('#2a1a0c', x, y, 16, 1); fr('#8a6640', x, y + 1, 16, 1); }
  if (NB(tx - 1, ty) !== 'K') fr('#2a1a0c', x, y, 1, 16);
  if (NB(tx + 1, ty) !== 'K') fr('#2a1a0c', x + 15, y, 1, 16);
}
// dungeon walls in 3/4 view: a brick (or board) face where the floor is below, a dark top otherwise
function dwallT(x, y, tx, ty, p) {
  const below = ty >= RH - 1 ? '#' : NB(tx, ty + 1);
  const front = !WALLISH.has(below) && below !== 'L';
  if (front) {
    fr(p.wall, x, y, 16, 16);
    if (p.plank) {
      for (let i = 0; i < 4; i++) { fr(p.wall2, x + i * 4 + 3, y + 3, 1, 13); fr(shade(p.wall, 1.18), x + i * 4, y + 3, 1, 13); }
      fr(p.wall2, x, y + 8, 16, 1);
    } else {
      for (let row = 0; row < 3; row++) {
        const by = y + 3 + row * 4 + (row === 2 ? 0 : 0), off = (row + ty) & 1 ? 4 : 0;
        fr(p.wall2, x, by + 3, 16, 1);
        for (let bx = off; bx < 16; bx += 8) fr(p.wall2, x + bx, by, 1, 3);
        g.globalAlpha = 0.22; fr('#ffffff', x, by, 16, 1); g.globalAlpha = 1;
      }
    }
    fr(p.topHi, x, y, 16, 2); fr(p.top, x, y, 16, 1);
    fr('rgba(0,0,0,.35)', x, y + 14, 16, 2);
    if (p.moss && hash(tx, ty, 5) < 0.45) { const mx = x + ((hash(tx, ty, 6) * 10) | 0); fr(p.moss, mx, y + 2, 5, 2); fr(p.moss, mx + 1, y + 4, 2, 3); fr(shade(p.moss, 1.3), mx + 1, y + 2, 2, 1); }
    if (p.name === 'hollow' && hash(tx, ty, 9) < 0.35) { const rx = x + 2 + ((hash(tx, ty, 10) * 10) | 0); fr(p.root, rx, y + 2, 2, 9); fr(p.root, rx - 2, y + 9, 2, 3); fr(shade(p.root, 1.3), rx, y + 2, 1, 6); }
  } else if (p.plank) {
    fr(p.top, x, y, 16, 16);
    fr(p.wall2, x, y + ((tx & 1) ? 5 : 11), 16, 1); fr(p.topHi, x, y + ((tx & 1) ? 4 : 10), 16, 1);
    const open = c => !WALLISH.has(c) && c !== 'L' && c !== 'z';
    if (ty > 0 && open(NB(tx, ty - 1))) fr(p.topHi, x, y, 16, 2);
    if (tx > 0 && open(NB(tx - 1, ty))) fr(p.topHi, x, y, 2, 16);
    if (tx < RW - 1 && open(NB(tx + 1, ty))) fr(p.topHi, x + 14, y, 2, 16);
  } else {
    fr(p.top, x, y, 16, 16);
    for (let i = 0; i < 4; i++) { const px = x + 1 + ((hash(tx, ty, i) * 11) | 0), py = y + 1 + ((hash(ty, tx, i) * 12) | 0); fr(p.topHi, px, py, 3, 2); fr(p.wall2, px, py + 2, 3, 1); }
    g.globalAlpha = 0.25; fr('#000000', x, y + 8, 16, 1); fr('#000000', x + ((tx & 1) ? 4 : 11), y, 1, 8); fr('#000000', x + ((tx & 1) ? 10 : 2), y + 8, 1, 8); g.globalAlpha = 1;
    const open = c => !WALLISH.has(c) && c !== 'L' && c !== 'z';
    if (ty > 0 && open(NB(tx, ty - 1))) fr(p.topHi, x, y, 16, 2);
    if (tx > 0 && open(NB(tx - 1, ty))) fr(p.topHi, x, y, 2, 16);
    if (tx < RW - 1 && open(NB(tx + 1, ty))) fr(p.topHi, x + 14, y, 2, 16);
  }
}
function stairsDown(x, y) {
  fr('#0a0a0e', x + 1, y + 1, 14, 14);
  for (let i = 0; i < 4; i++) { fr(['#6a6a72', '#4a4a52', '#30303a', '#1a1a22'][i], x + 2 + i, y + 2 + i * 3, 12 - i * 2, 2); fr('#000', x + 2 + i, y + 4 + i * 3, 12 - i * 2, 1); }
  fr('#2a2a30', x, y, 16, 1); fr('#2a2a30', x, y, 1, 16); fr('#2a2a30', x + 15, y, 1, 16);
}
function drawTile(ch, tx, ty, t, r) {
  const x = tx * TS, y = HUD + ty * TS;
  switch (ch) {
    case '.': grass(x, y, tx, ty); break;
    case ',': grass(x, y, tx, ty);
      for (let i = 0; i < 3; i++) {
        const px = x + 2 + ((hash(tx, ty, i + 3) * 10) | 0), py = y + 2 + ((hash(tx, ty, i + 7) * 10) | 0), c = ['#fff27a', '#f7a0c0', '#ffffff'][i];
        fr(GR.dark, px + 1, py + 3, 1, 2); fr(c, px + 1, py, 1, 1); fr(c, px, py + 1, 1, 1); fr(c, px + 2, py + 1, 1, 1); fr(c, px + 1, py + 2, 1, 1); fr(i === 0 ? '#e88a2a' : '#f6e05e', px + 1, py + 1, 1, 1);
      }
      break;
    case 'w': tallGrass(x, y, tx, ty, (t | 0) & 3); break;
    case '=': pathT(x, y, tx, ty, false); break;
    case 'S': pathT(x, y, tx, ty, true); break;
    case 'T': tree(x, y, tx, ty, false); break;
    case 'a': tree(x, y, tx, ty, true); break;
    case 'R': roofT(x, y, tx, ty); break;
    case 'H': wallT(x, y, tx, ty, false); break;
    case 'D': doorT(x, y, tx, ty); break;
    case 'f': fenceT(x, y, tx, ty); break;
    case 'P': grass(x, y, tx, ty);
      fr('#2a2a30', x, y + 7, 16, 9); fr('#8a8a92', x + 1, y + 8, 14, 7); fr('#b0b0b8', x + 1, y + 8, 14, 2); fr('#6a6a72', x + 1, y + 13, 14, 2); fr('#9a9aa2', x + 3, y + 10, 10, 1);
      break;
    case 'r': rockT(x, y, tx, ty); break;
    case 'M': grass(x, y, tx, ty);
      art(g, x + 4, y + 2, ['..oooo..', '.ollmmo.', 'olllmmdo', 'ollmmmdo', 'olmmmmdo', 'olmmmmdo', 'ommmmmdo', 'ommmmddo', 'ommmmddo', 'odddddo.', 'oooooooo'], { o: '#2a2a30', l: '#b4b4bc', m: '#8e8e98', d: '#66666e' });
      fr('#5e5e66', x + 6, y + 6, 4, 1); fr('#5e5e66', x + 6, y + 8, 4, 1);
      fr('#f7a0c0', x + 2, y + 13, 2, 2); fr('#ffffff', x + 12, y + 13, 2, 2); fr('#fff27a', x + 3, y + 14, 1, 1);
      break;
    case 'g': graveT(x, y, tx, ty); break;
    case 'n': signT(x, y, tx, ty, r); break;
    case '~': waterT(x, y, tx, ty, r); break;
    case 'm': marshT(x, y, tx, ty); break;
    case 'd': dockT(x, y, tx, ty); break;
    case 'B': waterT(x, y, tx, ty, r);
      fr('#3a2410', x, y, 16, 7); fr('#a8723a', x, y, 16, 5); fr('#c89050', x, y, 16, 1); fr('#6a4220', x, y + 5, 16, 1); fr('rgba(8,20,50,.4)', x, y + 7, 16, 2);
      { const px = x + (tx === 7 ? 12 : 0); fr('#2a1808', px - (tx === 7 ? 1 : 0), y, 5, 16); fr('#6b4320', px, y, 4, 16); fr('#8a5a30', px, y, 1, 16); }
      if (room === 'lake' && tx === 7) {
        const c = C(), bx = x + 9, by = y + 7;
        fr('#1a1006', bx, by - 1, 8, 1); fr('#2a1a0a', bx - 1, by, 9, 6); fr(c >= 3 ? '#e8b830' : '#a87a30', bx, by, 7, 5); fr('#ffe08a', bx + 1, by + 1, 1, 3);
        if (c < 3) { fr('#1a1006', bx + 3, by, 1, 5); if (c < 2) fr('#1a1006', bx + 5, by + 1, 1, 4); }
      }
      break;
    case 'C': cliffT(x, y, tx, ty); break;
    case 'c': fr('#4e433b', x, y, 16, 16);
      for (let i = 0; i < 4; i++) fr(i & 1 ? '#5e5148' : '#3e352e', x + ((hash(tx, ty, i) * 13) | 0), y + ((hash(ty, tx, i) * 13) | 0), 3, 2);
      break;
    case 'K': barkT(x, y, tx, ty); break;
    case '#': dwallT(x, y, tx, ty, palFor(r)); break;
    case '_': floorT(x, y, tx, ty, palFor(r)); break;
    case 'L': { const p = palFor(r);
      fr(p.wall2, x, y, 16, 16); fr('#1a120a', x + 1, y + 1, 14, 15);
      fr('#6b4322', x + 2, y + 2, 12, 14); fr('#8a5a30', x + 2, y + 2, 12, 1); fr('#4a2e16', x + 7, y + 2, 1, 14);
      fr('#5a5a62', x + 2, y + 4, 12, 2); fr('#5a5a62', x + 2, y + 11, 12, 2); fr('#9a9aa2', x + 2, y + 4, 12, 1); fr('#9a9aa2', x + 2, y + 11, 12, 1);
      fr('#2a1a08', x + 5, y + 5, 6, 6); fr('#d8b040', x + 6, y + 6, 4, 4); fr('#f8e090', x + 6, y + 6, 2, 1); fr('#1a1008', x + 7, y + 7, 2, 1); fr('#1a1008', x + 7, y + 8, 1, 2);
      break; }
    case 'G': { floorT(x, y, tx, ty, palFor(r));
      fr('#3a3a44', x, y + 3, 16, 3); fr('#3a3a44', x, y + 11, 16, 3); fr('#8a8a96', x, y + 3, 16, 1); fr('#8a8a96', x, y + 11, 16, 1);
      for (let i = 1; i < 16; i += 4) { fr('#26262e', x + i - 1, y, 4, 16); fr('#9a9aa8', x + i, y, 2, 16); fr('#d0d0dc', x + i, y, 1, 16); }
      fr('rgba(0,0,0,.3)', x, y + 14, 16, 2);
      break; }
    case 'o': { floorT(x, y, tx, ty, palFor(r));
      const on = blocks.some(b => b.tx === tx && b.ty === ty);
      fr('#1a1a1e', x + 2, y + 2, 12, 12); fr(on ? '#2f7a4a' : '#7a2a2a', x + 3, y + 3, 10, 10);
      fr(on ? '#6fd08a' : '#c45a5a', x + 3, y + 3, 10, 1); fr(on ? '#6fd08a' : '#c45a5a', x + 3, y + 3, 1, 10); fr(on ? '#1e5a34' : '#4a1818', x + 4, y + 12, 9, 1);
      fr(on ? '#9af0b0' : '#e08a8a', x + 6, y + 6, 4, 4);
      break; }
    case 'q': { floorT(x, y, tx, ty, palFor(r));
      const done = S.solved[room], col = done ? '#3fbf7a' : '#3a7ad9';
      fr('#1a1a20', x + 2, y + 10, 12, 6); fr('#6a6a76', x + 3, y + 11, 10, 4); fr('#9a9aa6', x + 3, y + 11, 10, 1);
      fr('#101018', x + 3, y + 1, 10, 10); fr(col, x + 4, y + 2, 8, 8); fr(shade(col, 0.65), x + 8, y + 6, 4, 4); fr(shade(col, 1.4), x + 5, y + 3, 3, 3); fr('#ffffff', x + 5, y + 3, 1, 1);
      break; }
    case '<': { baseFor(r, x, y, tx, ty);
      fr('#1a1a1e', x + 1, y + 1, 14, 14);
      for (let i = 0; i < 4; i++) { const yy = y + 12 - i * 3; fr(['#9a9aa4', '#7a7a84', '#5a5a64', '#40404a'][i], x + 2, yy, 12, 2); fr(['#c0c0ca', '#a0a0aa', '#80808a', '#60606a'][i], x + 2, yy, 12, 1); }
      break; }
    case '>': { if (room === 'lake') dockT(x, y, tx, ty); else baseFor(r, x, y, tx, ty);
      stairsDown(x, y);
      if (Math.sin(t * 3 + tx) > 0.6) { g.fillStyle = 'rgba(160,200,255,.22)'; g.fillRect(x + 3, y + 3, 10, 10); }
      break; }
    case 'Y': { if (r && r.night) dockT(x, y, tx, ty); else baseFor(r, x, y, tx, ty);
      fr('#1a1006', x + 1, y + 1, 14, 14); fr('#5a3a1c', x + 2, y + 2, 12, 12);
      for (let i = 0; i < 3; i++) { fr('#7a5028', x + 2, y + 2 + i * 4, 12, 3); fr('#9a6a38', x + 2, y + 2 + i * 4, 12, 1); }
      fr('#4a4a52', x + 2, y + 6, 12, 1); fr('#4a4a52', x + 2, y + 10, 12, 1);
      fr('#2a2a30', x + 6, y + 6, 4, 4); fr('#a0a0aa', x + 6, y + 6, 4, 1); fr('#a0a0aa', x + 6, y + 6, 1, 4); fr('#1a1a1e', x + 7, y + 7, 2, 2);
      break; }
    case 'O': case 'Z': {
      if (room === 'hollowgate') drawTile('K', tx, ty, t, r); else if (room === 'cavehill') drawTile('C', tx, ty, t, r); else drawTile('H', tx, ty, t, r);
      fr('#1a120a', x + 2, y + 3, 12, 13); fr('#1a120a', x + 4, y + 1, 8, 2);
      fr('#000000', x + 3, y + 4, 10, 12); fr('#000000', x + 5, y + 2, 6, 2);
      fr('rgba(255,255,255,.12)', x + 3, y + 4, 1, 12);
      if (ch === 'Z') { for (const by of [5, 11]) { fr('#2a1808', x + 1, y + by - 1, 14, 5); fr('#8a6234', x + 1, y + by, 14, 3); fr('#a87a44', x + 1, y + by, 14, 1); fr('#d0d0d8', x + 3, y + by + 1, 1, 1); fr('#d0d0d8', x + 12, y + by + 1, 1, 1); } }
      break; }
    case 'U': { waterT(x, y, tx, ty, r);
      const a = t * 1.3 * (C() >= 2 ? -1 : 1), cx = (tx === 10 ? x + 16 : x), cy = (ty === 3 ? y + 16 : y);
      for (let i = 0; i < 6; i++) { const an = a + i * Math.PI / 3; for (let k = 2; k < 15; k += 2) { const px = cx + Math.cos(an) * k, py = cy + Math.sin(an) * k; if (px >= x && px < x + 15 && py >= y && py < y + 15) { fr('#2a1808', px | 0, py | 0, 3, 3); fr(k > 12 ? '#9a6a38' : '#6b4320', (px | 0), (py | 0), 2, 2); } } }
      break; }
    case 'z': { const p = palFor(r); fr('#000', x, y, 16, 16); fr(p.wall2, x, y, 16, 2); fr(p.top, x, y + 2, 16, 2); fr('rgba(40,40,60,.35)', x, y + 4, 16, 2); break; }
    case 'E': { floorT(x, y, tx, ty, palFor(r)); fr('#2a1a10', x, y, 16, 16); fr('#e8e0d0', x + 1, y + 1, 14, 5); fr('#ffffff', x + 2, y + 1, 5, 2); fr('#3a6ab0', x + 1, y + 6, 14, 9); fr('#5a8ad0', x + 1, y + 6, 14, 1); fr('#f2c84a', x + 4, y + 9, 3, 3); fr('#f2c84a', x + 10, y + 12, 3, 2); fr('#2a4a80', x + 1, y + 14, 14, 1); break; }
    case 'V': { floorT(x, y, tx, ty, palFor(r)); fr('#0e0e10', x, y + 2, 16, 13); fr('#3a3a40', x + 1, y + 3, 14, 11); fr(Math.random() < 0.05 ? '#ffffff' : '#3d8b3d', x + 3, y + 5, 10, 7); fr('rgba(255,255,255,.18)', x + 3, y + 5, 10, 1); fr('#d64541', x + 7, y + 8, 1, 2); fr('#1a1a1e', x + 2, y + 14, 3, 2); fr('#1a1a1e', x + 11, y + 14, 3, 2); break; }
    case 'F': { floorT(x, y, tx, ty, palFor(r)); fr('#2a1808', x, y, 16, 16); fr('#6b4320', x + 1, y + 1, 14, 14); fr('#3a2412', x + 1, y + 7, 14, 1);
      for (let i = 0; i < 4; i++) { const c = ['#d64541', '#3a7ad9', '#e8c23a', '#8a8a8a'][i]; fr(c, x + 2 + i * 3, y + 2, 2, 5); fr(c, x + 2 + i * 3, y + 9, 2, 5); fr(shade(c, 1.3), x + 2 + i * 3, y + 2, 1, 5); }
      break; }
    case 'J': { drawTile('#', tx, ty, t, r); fr('#3a2a10', x + 2, y + 2, 12, 12); fr('#c9a050', x + 3, y + 3, 10, 10); fr('#dddddd', x + 4, y + 4, 8, 8); fr('#555555', x + 6, y + 6, 4, 4); break; }
    case 't': { baseFor(r, x, y, tx, ty); fr('#3a2410', x, y + 3, 16, 8); fr('#b08a58', x, y + 4, 16, 5); fr('#d0aa74', x, y + 4, 16, 1); fr('#6b4a2b', x + 1, y + 10, 2, 5); fr('#6b4a2b', x + 13, y + 10, 2, 5);
      const c = ['#3a7ad9', '#e8c23a', '#d64541', '#ffffff'][(tx + ty) & 3]; fr('#1a1a1a', x + 2 + ((hash(tx, ty, 1) * 6) | 0), y + 1, 6, 4); fr(c, x + 3 + ((hash(tx, ty, 1) * 6) | 0), y + 2, 4, 3); break; }
    case 'e': { pathT(x, y, tx, ty, true); fr('#1a4a5a', x, y + 2, 16, 12); fr('#3ab0c9', x + 1, y + 3, 14, 10); fr('#8ae0f0', x + 2, y + 4, 6, 1); fr('#f2c84a', x + 4, y + 6, 4, 2); fr('#f2c84a', x + 9, y + 9, 3, 2); break; }
    case 'u': { pathT(x, y, tx, ty, true); fr('#3a1010', x + 1, y + 7, 7, 6); fr('#3a1010', x + 8, y + 7, 7, 6); fr('#d64541', x + 2, y + 8, 5, 4); fr('#d64541', x + 9, y + 8, 5, 4); fr('#ffffff', x + 2, y + 11, 5, 1); fr('#ffffff', x + 9, y + 11, 5, 1); break; }
    case 'x': fr('#000', x, y, 16, 16); break;
    case 'v': fr('#000', x, y, 16, 16);
      if (hash(tx, ty, (t * 2) | 0) < 0.04) fr('#0d1a26', x, y, 16, 1);
      break;
    case 'Q': {
      const ph = (t * 6) | 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) fr(((i + j + ph) & 1) ? '#000000' : (hash(i + tx, j + ty, ph) < 0.2 ? '#00e5ff' : '#ff00dc'), x + i * 4, y + j * 4, 4, 4);
      break; }
    default: fr('#000', x, y, 16, 16);
  }
}

// ---------- pre-rendered room layers ----------
// The static tiles of a room are drawn once into an offscreen canvas; water and tall grass
// get 4 animation frames; only a few tiles (wheel, stairs glow, TV, void, glitch) are redrawn each frame.
const DYN = new Set(['U', '>', 'v', 'V', 'Q']);
const ANIMT = new Set(['~', 'w', 'B']);
const RC = { sig: null, base: mkCanvas(W, H), frames: null, dyn: [], torches: [], water: [], shade: null, hasAnim: false };
function roomSig() {
  const r = R(room);
  let s = room + '|' + C() + '|' + (S.solved[room] ? 1 : 0) + '|' + (S.flags.bellRung ? 1 : 0) + '|' + (S.opened[room + ':hatch'] ? 1 : 0) + '|' + (r && r.memGate ? (S.flags[r.memGate] ? 1 : 0) : '') + '|' + Object.keys(S.opened).length + '|' + (millOpen() ? 1 : 0);
  if (blocks.length) for (const b of blocks) s += b.tx + ',' + b.ty + ';';
  return s;
}
function buildRoomLayer(rid, r, mapFn) {
  const keepG = g;
  NB = (x, y) => mapFn(clamp(x, 0, RW - 1), clamp(y, 0, RH - 1));
  RC.dyn = []; RC.torches = []; RC.water = []; RC.hasAnim = false;
  const bg = RC.base.getContext('2d'); bg.imageSmoothingEnabled = false;
  g = bg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) {
    const ch = mapFn(tx, ty);
    if (ch === '~' || ch === 'B' || ch === 'U') RC.water.push([tx * 16 + 8, ty * 16 + 8]);
    if (DYN.has(ch)) { RC.dyn.push([ch, tx, ty]); drawTile(ch === '>' || ch === 'U' ? ch : ch, tx, ty, 0, r); continue; }
    if (ch === 'w') { RC.hasAnim = true; continue; }
    if (ANIMT.has(ch)) RC.hasAnim = true;
    drawTile(ch, tx, ty, 0, r);
  }
  // torches on the brick faces along the top wall of dungeon rooms
  const p = r && r.pal ? palFor(r) : null;
  if (p && !r.dark && p.name !== 'home' && !(p.name === 'under' && (p.depth || 0) >= 7)) {
    const cand = [];
    for (let tx = 2; tx < RW - 2; tx++) if (mapFn(tx, 0) === '#' && !WALLISH.has(mapFn(tx, 1)) && mapFn(tx, 1) !== 'L' && mapFn(tx - 1, 0) === '#' && mapFn(tx + 1, 0) === '#') cand.push(tx);
    const want = [3, 12, 7];
    for (const w of want) { const best = cand.filter(c => Math.abs(c - w) <= 1 && !RC.torches.some(t => Math.abs(t[0] - c) < 3))[0]; if (best !== undefined && RC.torches.length < 2 + (cand.length > 10 ? 1 : 0)) RC.torches.push([best, 0]); }
    for (const [tx] of RC.torches) { const x = tx * 16, y = HUD; fr('#140f0c', x + 4, y + 6, 8, 4); fr('#140f0c', x + 6, y + 9, 4, 6); fr('#7a6a5a', x + 5, y + 7, 6, 2); fr('#a89880', x + 5, y + 7, 6, 1); fr('#5a4a3a', x + 7, y + 9, 2, 5); }
  }
  // dungeon mood: a soft vignette baked once
  RC.shade = null;
  if (p) {
    const sc = mkCanvas(W, H), x = sc.getContext('2d');
    const k = p.name === 'home' ? 0.25 : p.name === 'mill' ? 0.38 : 0.5;
    const gr = x.createRadialGradient(W / 2, HUD + PH / 2, 40, W / 2, HUD + PH / 2, 170);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,6,' + k + ')');
    x.fillStyle = gr; x.fillRect(0, HUD, W, PH);
    RC.shade = sc;
  }
  // animation frames for water / tall grass
  RC.frames = null;
  if (RC.hasAnim) {
    RC.frames = [];
    for (let k = 0; k < 4; k++) {
      const fc = mkCanvas(W, H), fg = fc.getContext('2d'); fg.imageSmoothingEnabled = false; g = fg;
      for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) {
        const ch = mapFn(tx, ty);
        if (ch === 'w') tallGrass(tx * 16, HUD + ty * 16, tx, ty, k);
        else if (ch === '~') waterFx(tx * 16, HUD + ty * 16, tx, ty, r, k);
      }
      RC.frames.push(fc);
    }
  }
  g = keepG;
  NB = (x, y) => tileAt(room, x, y);
}
const PERF = { ft: 0, build: 0, blit: 0 };
function ensureRoomLayer() {
  const sig = roomSig();
  if (sig !== RC.sig) { const t0 = performance.now(); RC.sig = sig; buildRoomLayer(room, R(room), (x, y) => tileAt(room, x, y)); PERF.build = performance.now() - t0; }
}
function drawRoomLayer(r) {
  g.drawImage(RC.base, 0, 0);
  if (RC.frames) g.drawImage(RC.frames[((T * 3.2) | 0) & 3], 0, 0);
  for (const [ch, tx, ty] of RC.dyn) drawTile(ch, tx, ty, T, r);
}
function drawTorches() {
  const blue = R(room) && R(room).gen;
  for (const [tx] of RC.torches) {
    const x = tx * 16 + 8, y = HUD + 5, f = ((T * 10 + tx) | 0) % 3, fl = 0.85 + Math.sin(T * 9 + tx) * 0.1 + Math.sin(T * 23 + tx * 3) * 0.05;
    addGlow(blue ? GLOW.torchB : GLOW.torch, x, y + 1, fl);
    if (!blue) addGlow(GLOW.pool, x, y + 26, fl);
    fr(blue ? '#1a2a8a' : '#8a2008', x - 3, y, 6, 2); fr(blue ? '#3a6aff' : '#e8501a', x - 3, y - 2, 6, 3); fr(blue ? '#3a6aff' : '#e8501a', x - 2 + (f === 1 ? -1 : 0), y - 4, 4, 2);
    fr(blue ? '#9ad0ff' : '#ffb030', x - 2, y - 2, 4, 2); fr(blue ? '#9ad0ff' : '#ffb030', x - 1 + (f === 2 ? 1 : 0), y - 5, 2, 3); fr('#fff4c0', x - 1, y - 2, 2, 1); fr('#fff4c0', x + (f === 0 ? -1 : 0), y - 4, 1, 2);
  }
}

// ---------- audio ----------
// the synth lives in audio.js (SHA); songs in music.js
const SHA = window.SHA;
let AC = null;
function audioInit() { if (SHA.init()) AC = SHA.ctx; }
function setMute(m) {
  muted = m; try { localStorage.setItem('secondhand-mute', m ? '1' : '0'); } catch (e) {}
  SHA.setMute(m);
}
SHA.muted = muted;
const SFX = SHA.sfx;
const MUS = { get name() { return SHA.current; }, set name(v) { if (v == null) SHA.stop(); } };
function setSong(name, bend) { SHA.setSong(name, bend || 0); }
function musicTick() { SHA.tick(); }
const OVERSONG = { village: 'village', orchard: 'orchard', chapel: 'chapel', highfield: 'fields', northroad: 'fields', eastroad: 'fields', oldroad: 'fields', bramble: 'fields',
  deepwoods: 'woods', woods: 'woods', hollowgate: 'woods', woodcutter: 'woods', clearing: 'woods',
  lake: 'lake', reedshore: 'lake', marsh: 'lake', bridge: 'lake', graveyard: 'eerie', cavehill: 'eerie', oldmill: 'eerie' };
// which song a room plays, and how bent (corrupted) it sounds
function songFor(rm) {
  if (!rm) return ['title', 0];
  const c = C();
  if (rm.boss && !S.bosses[rm.area]) return ['boss', 0];
  if (rm.song === 'void') return ['void', 0.6];
  if (rm.song === 'mem') return ['mem', 0.7];
  if (rm.gen) { const d = rm.depth; return [d >= 7 ? 'glitch' : 'under', Math.min(3, 0.35 + d * (d >= 7 ? 0.12 : 0.32))]; }
  if (rm.dungeon) return [rm.area, c * 0.45];
  const s = OVERSONG[rm.id] || 'village';
  return [s, s === 'eerie' ? c * 0.4 : [0, 0.8, 1.8, 2.7][c] || 0];
}
function playRoomMusic(rm) { const [n, b] = songFor(rm || R(room)); setSong(n, b); }
function titleMusic() { const st = SAVED; setSong('title', M.ended ? 2.4 : st ? [0, 0.4, 1.2, 2][Math.min(3, (st.shards.hollow ? 1 : 0) + (st.shards.cave ? 1 : 0) + (st.shards.mill ? 1 : 0))] : 0); }

// ---------- input ----------
const held = { up: false, down: false, left: false, right: false };
let aHeld = false;
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  audioInit();
  if (KEYMAP[e.code]) { held[KEYMAP[e.code]] = true; e.preventDefault(); return; }
  if (['KeyZ', 'KeyJ'].includes(e.code)) { e.preventDefault(); if (e.repeat) return; aHeld = true; onA(); return; }
  if (e.repeat) return;
  if (['KeyX', 'KeyK', 'Space'].includes(e.code)) { e.preventDefault(); bDown(); }
  else if (['Enter', 'Escape', 'KeyP'].includes(e.code)) { e.preventDefault(); onStart(); }
  else if (['ShiftLeft', 'ShiftRight', 'Tab', 'KeyQ'].includes(e.code)) { e.preventDefault(); onSelect(); }
  else if (e.code === 'KeyM') { setMute(!muted); refreshPause(); }
});
addEventListener('keyup', e => {
  if (KEYMAP[e.code]) held[KEYMAP[e.code]] = false;
  if (['KeyZ', 'KeyJ'].includes(e.code)) aHeld = false;
  if (['KeyX', 'KeyK', 'Space'].includes(e.code)) bUp();
});
addEventListener('blur', () => { held.up = held.down = held.left = held.right = false; aHeld = false; bHeld = false; P.charging = false; P.charged = false; });

// touch: d-pad as a single pad (slide your thumb), plus A and B
const touchEl = $('touch'), pad = $('pad');
let padId = null;
function padSet(e) {
  const r = pad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  held.up = held.down = held.left = held.right = false;
  if (Math.hypot(dx, dy) < r.width * 0.12) return;
  if (Math.abs(dx) > Math.abs(dy)) held[dx < 0 ? 'left' : 'right'] = true; else held[dy < 0 ? 'up' : 'down'] = true;
  pad.dataset.d = held.up ? 'u' : held.down ? 'd' : held.left ? 'l' : 'r';
}
pad.addEventListener('pointerdown', e => { audioInit(); padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (_) {} padSet(e); e.preventDefault(); });
pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padSet(e); });
const padEnd = e => { if (e.pointerId !== padId) return; padId = null; held.up = held.down = held.left = held.right = false; pad.dataset.d = ''; };
pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);
function btn(id, fn, onUp) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { audioInit(); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); fn(); });
  const up = () => { b.classList.remove('on'); if (onUp) onUp(); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
}
// joystick: a floating stick anywhere in the left zone
const stickZone = $('stickZone'), stickBase = $('stickBase'), stickKnob = $('stickKnob');
const AXIS = { x: 0, y: 0 };
let stickId = null, sx0 = 0, sy0 = 0;
stickZone.addEventListener('pointerdown', e => {
  audioInit(); stickId = e.pointerId; try { stickZone.setPointerCapture(e.pointerId); } catch (_) {}
  sx0 = e.clientX; sy0 = e.clientY;
  stickBase.style.left = sx0 + 'px'; stickBase.style.top = sy0 + 'px'; stickBase.classList.add('on');
  stickKnob.style.transform = 'translate(-50%,-50%)'; e.preventDefault();
});
stickZone.addEventListener('pointermove', e => {
  if (e.pointerId !== stickId) return;
  let dx = e.clientX - sx0, dy = e.clientY - sy0; const Rr = 48, d = Math.hypot(dx, dy);
  if (d > Rr) { dx = dx / d * Rr; dy = dy / d * Rr; }
  stickKnob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  if (d < 10) { AXIS.x = AXIS.y = 0; } else { AXIS.x = dx / Rr; AXIS.y = dy / Rr; }
});
const stickEnd = e => { if (e.pointerId !== stickId) return; stickId = null; AXIS.x = AXIS.y = 0; stickBase.classList.remove('on'); };
stickZone.addEventListener('pointerup', stickEnd); stickZone.addEventListener('pointercancel', stickEnd);
let padStyle = 'dpad';
try { padStyle = localStorage.getItem('secondhand-pad') || 'dpad'; } catch (e) {}
function setPadStyle(st) {
  padStyle = st; try { localStorage.setItem('secondhand-pad', st); } catch (e) {}
  document.body.classList.toggle('stick', st === 'stick');
  AXIS.x = AXIS.y = 0; held.up = held.down = held.left = held.right = false;
  document.querySelectorAll('.padOpt').forEach(b => b.textContent = 'Phone controls: ' + (st === 'stick' ? 'Joystick' : 'D-pad'));
}
setPadStyle(padStyle);
document.querySelectorAll('.padOpt').forEach(b => b.onclick = () => setPadStyle(padStyle === 'stick' ? 'dpad' : 'stick'));
btn('btnStart', () => onStart());
btn('btnSelect', () => onSelect());
btn('btnA', () => { aHeld = true; onA(); }, () => { aHeld = false; });
btn('btnB', () => bDown(), () => { if (bHeld) bUp(); });
let touchMode = matchMedia('(pointer: coarse)').matches;
addEventListener('touchstart', () => { if (!touchMode) { touchMode = true; layout(); } }, { passive: true });
document.addEventListener('click', e => { const t = e.target; if (t && t.classList && t.classList.contains('b') && AC) SFX.menu(); });
cv.addEventListener('pointerdown', () => { audioInit(); if (mode === 'boot' || mode === 'dialog' || mode === 'card' || mode === 'map') onA(); });

// ---------- layout ----------
let scale = 3;
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const portrait = vh > vw;
  document.body.classList.toggle('touch', touchMode);
  document.body.classList.toggle('portrait', portrait);
  const ctrlH = touchMode && portrait ? Math.min(250, vh * 0.36) : 0;
  const availH = vh - ctrlH - (touchMode && portrait ? 8 : 0);
  scale = Math.min(vw / W, availH / H);
  if (scale > 2) scale = Math.floor(scale * 2) / 2;
  const cw = W * scale, ch = H * scale;
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const top = touchMode && portrait ? Math.max(8, (availH - ch) / 2) : (vh - ch) / 2;
  cv.style.left = ((vw - cw) / 2) + 'px'; cv.style.top = top + 'px';
  const dlg = $('dlg');
  dlg.style.left = ((vw - cw) / 2 + 6 * scale) + 'px';
  dlg.style.width = (cw - 12 * scale) + 'px';
  dlg.style.top = (top + ch - 58 * scale) + 'px';
  dlg.style.height = (52 * scale) + 'px';
  dlg.style.fontSize = Math.max(12, Math.min(22, scale * 6.2)) + 'px';
  const toast = $('toast');
  toast.style.top = (top + 22 * scale) + 'px';
  toast.style.fontSize = Math.max(12, Math.min(20, scale * 5.5)) + 'px';
  touchEl.classList.toggle('on', touchMode && (mode === 'play' || mode === 'dialog' || mode === 'boot' || mode === 'card' || mode === 'map'));
}
addEventListener('resize', layout);

// ---------- game state ----------
let mode = 'cart'; // cart | boot | files | name | play | dialog | paused | card | over | ending | memory | map | help
let T = 0, last = performance.now();
const P = { x: 0, y: 0, dir: 0, step: 0, anim: 0, inv: 0, swing: 0, kx: 0, ky: 0, entryX: 0, entryY: 0, hidden: false, dust: 0, pushT: 0, bumpT: 0, running: false, swingId: 0, mdx: 0, mdy: 0, charging: false, chargeT: 0, charged: false, chargeSnd: false, spin: 0, spinA: 0, spinId: 0, lastStep: 0 };
let npcs = [], foes = [], items = [], statue = null, fx = [], blocks = [], shots = [], spikes = [], beams = [];
let flick = null, tear = 0, staticT = 0, flash = 0, shake = 0, fadeT = 0;
let ending = null, msgCool = 0, clearArmed = false;

const NPCLINES = {
  woodcutter: {
    0: [['WOODCUTTER', 'Careful in the Hollow, kid. That\'s the big dead tree north of here, past the brambles.'], ['WOODCUTTER', 'Something lives in the roots. I hear it breathing when I chop.'], ['WOODCUTTER', 'Keys rattle around down there. Doors too. Somebody built a whole house under that tree.']],
    1: [['WOODCUTTER', 'You came out of the Hollow? Huh.'], ['WOODCUTTER', 'Most don\'t. Well. One did. Little kid in a blue shirt, years back.'], ['WOODCUTTER', 'Never said their name. Started with a W, I think.']],
    2: [['WOODCUTTER', 'I chopped this same log yesterday. And the day before.'], ['WOODCUTTER', 'It grows back every night, {N}. Like nobody\'s saving the game.']],
    3: [['WOODCUTTER', 'I can hear chopping when I\'m not chopping.'], ['WOODCUTTER', 'Go home, {N}. It\'s {T}.']] },
  keeper: {
    0: [['KEEPER', 'Welcome to the chapel. The bell used to ring every hour, before it broke.'], ['KEEPER', 'Without it, the days just... loop. Same morning. Same sky.'], ['KEEPER', 'The doors are locked. They\'ve been locked since the last player.']],
    1: [['KEEPER', 'Pray for the bell, {N}. And for whoever had it before you.'], ['KEEPER', 'We keep a book of names. One of them keeps rewriting itself.']],
    2: [['KEEPER', 'I wrote your name in the book this morning.'], ['KEEPER', 'I don\'t remember you telling me it.']],
    3: [['KEEPER', 'The book has one more page than it did yesterday.'], ['KEEPER', 'It just says {N}, over and over, in a child\'s handwriting.']] },
  digger: {
    0: [['GRAVEDIGGER', 'These are graves for players who didn\'t finish.'], ['GRAVEDIGGER', 'Don\'t look at me like that. It\'s just a joke the village tells.'], ['GRAVEDIGGER', '...mostly.']],
    1: [['GRAVEDIGGER', 'Dug a new one today. No name on it yet.'], ['GRAVEDIGGER', 'It\'s about your size.']],
    2: [['GRAVEDIGGER', 'Read the stone in the top right corner, {N}.'], ['GRAVEDIGGER', 'I didn\'t carve it. I came back and it was carved.']],
    3: [['GRAVEDIGGER', 'Every grave here has the same date now.'], ['GRAVEDIGGER', 'Today. {D}.']] },
  girl: {
    0: [['GIRL', 'I\'m waiting for my friend. We play here every day.'], ['GIRL', 'They said they\'d be right back. That was a long time ago.']],
    1: [['GIRL', 'Did you see a kid in a blue shirt? A bit taller than me?'], ['GIRL', 'They always went to the lake after this.']],
    2: [['GIRL', 'You walk just like them, {N}.'], ['GIRL', 'You even stop in the same spots.']],
    3: [['GIRL', 'My friend\'s name was Wren.'], ['GIRL', 'Is it your turn now?']] },
  farmer: {
    0: [['FARMER', 'Apples are good this year! Same as last year. Same as every year.'], ['FARMER', 'Road north goes to the chapel. East is the old road, then the cave hill.']],
    1: [['FARMER', 'Found a bite in one of my apples. Little teeth.'], ['FARMER', 'Nobody here is little anymore, except the kid.']],
    2: [['FARMER', 'Funny thing. The apples are counting down.'], ['FARMER', 'Yesterday there were twelve. Today, eleven. Like a timer.']],
    3: [['FARMER', 'The apples went dark, {N}.'], ['FARMER', 'There\'s nothing left to grow here but you.']] },
  traveler: {
    0: [['TRAVELER', 'I\'ve been walking this road a long while. It always brings me back here.'], ['TRAVELER', 'There\'s a cave on the hill to the south. You\'ll want a light down there.'], ['TRAVELER', 'They say somebody left a lantern inside and never came back for it.']],
    1: [['TRAVELER', 'You again. Or someone dressed like you.'], ['TRAVELER', 'The cave goes deeper than the map shows.']],
    2: [['TRAVELER', 'Do you ever feel like someone is holding the controller for you?'], ['TRAVELER', 'Like you\'re the character, and they\'re the player?']],
    3: [['TRAVELER', 'I tried to leave. The road just ends at the edge of the screen.'], ['TRAVELER', 'Do you know what\'s past the edge, {N}? I think you do.']] },
  fisher: {
    0: [['FISHER', 'Haven\'t caught a thing in years. The fish won\'t bite.'], ['FISHER', 'Sometimes the line goes tight anyway. Then it lets go.']],
    1: [['FISHER', 'Something tugged my line and wrote a letter in the mud.'], ['FISHER', 'A "W". Funny kind of fish.']],
    2: [['FISHER', 'Don\'t swim in the lake, {N}.'], ['FISHER', 'I mean it. Nobody comes back up the same.']],
    3: [['FISHER', 'I caught something today.'], ['FISHER', 'A game cartridge. Wet. With a name on the label in marker.']] },
  oldwoman: {
    0: [['OLD WOMAN', 'That\'s the old mill across the river. The miller boarded it up from the inside.'], ['OLD WOMAN', 'Nobody\'s seen him since. But the wheel still turns.'], ['OLD WOMAN', 'Those boards won\'t hold forever. Once that bell is mostly whole, I\'d bet they give.']],
    1: [['OLD WOMAN', 'The boards on the mill are rotting. Not long now.'], ['OLD WOMAN', 'Find another piece of that bell and they\'ll fall right off.']],
    2: [['OLD WOMAN', 'The mill door is open. I heard it creak all night.'], ['OLD WOMAN', 'The miller grinds something in there. It isn\'t flour. It\'s old saves.']],
    3: [['OLD WOMAN', 'My grandson played your game, you know.'], ['OLD WOMAN', 'He said there was a kid under the dock who waved at him.'], ['OLD WOMAN', 'He never played it again.']] },
};
const PAGES = {
  1: ['JUNE 3.', 'got a game at a yard sale for one dollar. no box. somebody wrote SECONDHAND on the label in marker.'],
  2: ['JUNE 5.', 'there\'s a kid in the village who says my name over and over. it\'s kind of funny.'],
  3: ['JUNE 9.', 'the statue moved. i KNOW it moved. i turned around and it was closer.'],
  4: ['JUNE 14.', 'the old man asked what time it was. he said the REAL time. how does it know.'],
  5: ['JUNE 20.', 'there\'s another file on the cartridge. save 1. it has the name of the player before me. i didn\'t touch it.'],
  6: ['JUNE 28.', 'i got all three bell pieces. i\'m scared to ring it. the game keeps saying thank you.'],
  7: ['JULY 2.', 'LAKE TRIP SATURDAY!!! i\'ll finish the game when i get back.'],
  8: ['(no date)', 'the rest of the pages are blank. the paper is wavy, like it got wet and dried again.'],
};
const GRAVES = ['HERE LIES A PLAYER WHO PRESSED START.', 'HERE LIES ??? · GAME OVER', 'HERE LIES SOMEONE WHO SAID "JUST ONE MORE LEVEL."', 'RESTING. NOT SAVED.', 'HERE LIES THE KID WHO FOUND THE SECRET. SHH.', 'GONE TO THE LAKE.', 'CONTINUE? NO.', 'HERE LIES SAVE 03. EMPTY. FOR NOW.'];

// ---------- rooms: enter / transitions ----------
const tc = (tx, ty) => [tx * 16 + 8, ty * 16 + 12];
const FOEHP = { wisp: 1, bat: 1, crawler: 2, mimic: 2, rooted: 8, listener: 8, miller: 10 };
function mkFoe(type, x, y) {
  const d = curDepth(), extra = (d >= 7 ? 1 : 0) + (d >= 15 ? 1 : 0);
  const f = { type, x, y, vx: 0, vy: 0, t: Math.random() * 6, hp: FOEHP[type] + (FOEHP[type] < 5 ? extra : 0), alive: true, fl: 0, inv: 0, kx: 0, ky: 0, st: 'roam', st_t: rnd(0.5, 2), cd: rnd(1, 2.5), dx: 1, dy: 0, boss: FOEHP[type] >= 8, hitBy: -1 };
  f.maxhp = f.hp;
  if (type === 'crawler') { const a = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0]; f.dx = a[0]; f.dy = a[1]; }
  return f;
}
function enterRoom(name, x, y, opts) {
  opts = opts || {};
  const prevArea = room && R(room) ? R(room).area : null;
  const r = R(name);
  if (!r) { name = 'village'; x = 7.5 * 16; y = 6 * 16 + 8; }
  room = name; S.room = name; P.x = x; P.y = y; P.entryX = x; P.entryY = y; P.kx = P.ky = 0;
  const rm = R(name);
  npcs = []; foes = []; items = []; fx = []; statue = null; blocks = []; shots = []; spikes = []; beams = [];
  P.spin = 0; P.charging = false; P.charged = false;
  S.disc[name] = 1;
  const c = C();
  // npcs
  if (name === 'village') {
    if (c < 3) npcs.push({ id: 'elder', x: 4.5 * 16, y: 3 * 16 + 14, dir: 0, pal: 'elder' });
    else npcs.push({ id: 'elder', x: 7.5 * 16 + 8, y: 9 * 16 + 4, dir: 1, pal: 'noface' });
    if (c < 3) npcs.push({ id: 'kid', x: 10.5 * 16, y: 8 * 16 + 14, dir: 2, pal: 'kid' });
    if (c < 3) npcs.push({ id: 'shop', x: 13.5 * 16, y: 3 * 16 + 14, dir: 0, pal: 'shop' });
  }
  for (const n of rm.npcs || []) {
    if (n.id === 'figure' && S.taken[rm.area + ':fig']) continue;
    const [nx, ny] = tc(n.tx, n.ty);
    npcs.push(Object.assign({}, n, { x: nx + (n.ox || 0), y: ny + 2 }));
  }
  // foes (dungeon "clear" rooms stay clear once solved; bosses stay beaten)
  const solvedClear = rm.puzzle === 'clear' && S.solved[name];
  if (!solvedClear) for (const [t, fx_, fy_] of rm.foes || []) foes.push(mkFoe(t, fx_ * 16 + 8, fy_ * 16 + 8));
  clearArmed = rm.puzzle === 'clear' && !S.solved[name] && foes.length > 0;
  if (rm.boss && !S.bosses[rm.area]) foes.push(mkFoe(rm.boss, 7.5 * 16 + 8, 4 * 16));
  // items
  for (const it of rm.items || []) {
    if (it.uid && S.taken[it.uid]) continue;
    if (it.id === 'heart' && S.hearts >= S.maxHearts && Math.random() < 0.5) continue;
    items.push(Object.assign({}, it, { x: it.tx * 16 + 8, y: it.ty * 16 + 8 }));
  }
  if (rm.boss && S.bosses[rm.area]) spawnBossLoot(rm.area);
  // push blocks
  for (const [bx, by] of rm.blocks || []) blocks.push({ tx: bx, ty: by, x: bx * 16, y: by * 16, mv: 0 });
  if (blocks.length && rm.puzzle === 'blocks' && !S.solved[name] && !S.flags.pushHint) { S.flags.pushHint = true; setTimeout(() => showToast('Walk into the stone block to push it onto the red plate. Stuck? Leave the room to reset it.', 4500), 600); }
  if (rm.puzzle === 'blocks' && S.solved[name]) {
    const plates = []; for (let yy = 0; yy < RH; yy++) for (let xx = 0; xx < RW; xx++) if (rm.map[yy][xx] === 'o') plates.push([xx, yy]);
    plates.forEach(([px, py], i) => { if (blocks[i]) { blocks[i].tx = px; blocks[i].ty = py; blocks[i].x = px * 16; blocks[i].y = py * 16; } });
  }
  // the statue
  if ((c >= 1 && rm.area === 'over') || (rm.statueOk && !S.deep) || (rm.statueOk && S.deep && Math.random() < 0.7)) {
    S.statueSteps = (S.statueSteps || 0) + 1;
    placeStatue();
  }
  // music
  playRoomMusic(rm);
  // toast
  const areaChanged = prevArea !== rm.area || opts.force;
  if (name === 'void') showToast(corrupt('SAVE 01', 0.5));
  else if (rm.area === 'over') showToast(c >= 2 && Math.random() < 0.35 ? corrupt(rm.name, 0.4) : rm.name);
  else if (rm.gen && areaChanged) showToast((S.deep ? 'THE DEEP  ' : 'THE UNDERNEATH  ') + 'B' + rm.depth);
  else if (areaChanged) showToast(rm.name);
  if (rm.gen && S.deep) { for (const k of Object.keys(S.disc)) { const p = SHW.parseGen(k); if (p && p.f < rm.depth - 1) delete S.disc[k]; } }
  S.x = P.x; S.y = P.y;
  save();
  roomIntro(name, rm, c);
}
function roomIntro(name, rm, c) {
  if (name === 'village' && !S.flags.intro) { S.flags.intro = true; return say([['', 'Welcome to MILLBROOK, {N}!'], ['', 'Talk and read with A. Hold A while you walk to run.'], ['', 'Swing your sword with B. Hold B, then let go, to spin. START pauses. SELECT shows the map.']]); }
  if (name === 'lake' && c >= 1 && !S.flags.dock) { S.flags.dock = true; return say([['', 'For a second, something pale moves under the dock.'], ['', 'You decide it was a fish.']]); }
  if (name === 'h1' && !S.flags.hollowIn) { S.flags.hollowIn = true; return say([['', 'THE HOLLOW.'], ['', 'The roots creak, like the tree is breathing in.'], ['', 'Locked doors need keys. Keys are somewhere in here.']]); }
  if (name === 'c1' && !S.flags.caveIn) { S.flags.caveIn = true; return say([['', 'THE CAVE.'], ['', S.lantern ? 'Your lantern pushes the dark back.' : 'It is very dark. You can barely see your own hands.']]); }
  if (name === 'm1' && !S.flags.millIn) { S.flags.millIn = true; return say([['', 'THE OLD MILL.'], ['', 'The floorboards are warm. Somewhere above you, the big wheel turns the wrong way.']]); }
  if (rm.boss && !S.bosses[rm.area] && !S.flags['bossIntro_' + rm.area]) {
    S.flags['bossIntro_' + rm.area] = true;
    const L = { rooted: [['', 'The roots in the walls pull together into something tall.'], ['', 'It has antlers made of branches. It has your sword\'s reflection in its eyes.'], ['', 'THE ROOTED ONE']],
      listener: [['', 'Something huge is breathing in the dark.'], ['', 'An eye opens. It has been listening to you this whole time.'], ['', 'THE LISTENER']],
      miller: [['', 'A tall man in a flour-white mask turns around slowly.'], ['', '"WE GRIND WHAT THE LAST PLAYER LEFT BEHIND."'], ['', 'THE MILLER']] }[rm.boss];
    return say(L);
  }
  if (rm.gen && rm.id === SHW.floorInfo(S.seed, rm.depth, S.deep).start && !S.flags['fl' + (S.deep ? 'd' : '') + rm.depth]) {
    S.flags['fl' + (S.deep ? 'd' : '') + rm.depth] = true;
    if (!S.deep && rm.depth === 1) return say([['', 'THE UNDERNEATH.'], ['', 'The stairs go down further than the lake is deep.'], ['', 'Find the FLOOR KEY. Unlock the hatch. Go down.']]);
    if (S.deep && rm.depth === 1) return say([['', 'THE DEEP.'], ['', 'It doesn\'t end. See how far you get, {N}.']]);
    if (!S.deep && rm.depth === 7) return say([['', 'The walls here remember a different game.'], ['', 'They forgot their colors on the way down.']]);
  }
  if (name === 'w3a' && !S.flags.w3) { S.flags.w3 = true; return say([['', 'B3.'], ['', 'This isn\'t a dungeon. It\'s a house.'], ['', 'It smells like summer and old carpet.']]); }
  if (name === 'w6a' && !S.flags.w6) { S.flags.w6 = true; return say([['', 'B6.'], ['', 'A driveway on a sunny morning. Folding tables. Price stickers.']]); }
  if (name === 'w9a' && !S.flags.w9) { S.flags.w9 = true; return say([['', 'B9.'], ['', 'A real lake, at night. Not the one in the game.'], ['', 'The water is very still.']]); }
}
function placeStatue() {
  const want = Math.max(56, 150 - S.statueSteps * 4);
  let best = null, bd = 1e9;
  for (let i = 0; i < 80; i++) {
    const tx = 1 + ((Math.random() * (RW - 2)) | 0), ty = 1 + ((Math.random() * (RH - 2)) | 0);
    if (SOLID.has(tileAt(room, tx, ty)) || WARP.has(tileAt(room, tx, ty))) continue;
    const x = tx * 16 + 8, y = ty * 16 + 14;
    const d = Math.abs(Math.hypot(x - P.x, y - P.y) - want);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) statue = { x: best.x, y: best.y, moving: 0, gt: 0 };
}
function goWarp(rid, tx, ty) {
  fadeT = 0.35; SFX.stairs();
  const [x, y] = tc(tx, ty);
  enterRoom(rid, x, y);
  P.dir = 0;
  const r = R(rid);
  if (r.area !== 'over') S.checkpoint = { room: rid, x, y }; else S.checkpoint = null;
  save();
}
function goFloor(f, which) {
  const fi = SHW.floorInfo(S.seed, f, S.deep);
  const rid = which === 'start' ? fi.start : fi.stairs, a = which === 'start' ? fi.startArrive : fi.stairsArrive;
  if (which === 'start') S.floor = Math.max(S.floor || 0, f);
  if (S.deep && S.floor > (M.deepBest || 0)) { M.deepBest = S.floor; saveMeta(); }
  goWarp(rid, a[0], a[1]);
  const st = SHW.floorInfo(S.seed, f, S.deep);
  S.checkpoint = { room: st.start, x: tc(st.startArrive[0], st.startArrive[1])[0], y: tc(st.startArrive[0], st.startArrive[1])[1] };
  save();
}
function doWarp(tx, ty, ch) {
  const r = R(room);
  const w = (r.warps || []).find(w => w.x === tx && w.y === ty);
  if (w && w.to) return goWarp(w.to, w.ax, w.ay);
  if (w && w.special === 'floor1') return goFloor(1, 'start');
  if (!r.depth) return;
  if (ch === '<') {
    if (r.depth === 1) {
      if (S.deep) { P.x = P.entryX; P.y = P.entryY; return say([['', 'The stairs up are gone. There is only down.']]); }
      return goWarp('lake', 7, 8);
    }
    return goFloor(r.depth - 1, 'stairs');
  }
  if (ch === '>') {
    if (!S.deep && r.depth >= 10) return;
    return goFloor(r.depth + 1, 'start');
  }
}

// ---------- collision ----------
function blockOn(tx, ty) { for (const b of blocks) if (b.tx === tx && b.ty === ty) return b; return null; }
function solidAt(px, py) {
  const tx = clamp(Math.floor(px / 16), 0, RW - 1), ty = clamp(Math.floor(py / 16), 0, RH - 1);
  if (blocks.length && blockOn(tx, ty)) return true;
  return SOLID.has(tileAt(room, tx, ty));
}
function boxFree(x, y, self) {
  const pts = [[x - 4, y - 4], [x + 3, y - 4], [x - 4, y + 2], [x + 3, y + 2]];
  for (const [a, b] of pts) if (solidAt(a, b)) return false;
  for (const n of npcs) if (n !== self && !n.ghost && Math.abs(n.x - x) < 10 && Math.abs(n.y - y) < 8) return false;
  return true;
}
function moveBody(b, dx, dy) {
  let moved = false;
  if (dx && boxFree(b.x + dx, b.y, b)) { b.x += dx; moved = true; }
  if (dy && boxFree(b.x, b.y + dy, b)) { b.y += dy; moved = true; }
  return moved;
}

// ---------- dialog ----------
const dlg = $('dlg'), dlgWho = $('dlgWho'), dlgText = $('dlgText'), dlgMore = $('dlgMore');
let D = null;
function say(lines, done, opts) {
  opts = opts || {};
  const c = C();
  const L = lines.map(([who, text, amt]) => {
    let t = fill(text);
    const a = amt != null ? amt : (opts.clean ? 0 : [0, 0.0, 0.03, 0.06][c]);
    return { who: who ? fill(who) : '', text: corrupt(t, a), raw: t };
  });
  D = { lines: L, i: 0, shown: 0, done, t: 0 };
  mode = 'dialog';
  dlg.classList.add('show');
  dlg.classList.toggle('glitchy', c >= 2);
  showLine();
  layout();
}
function showLine() {
  const l = D.lines[D.i];
  dlgWho.textContent = l.who; dlgWho.style.display = l.who ? '' : 'none';
  D.shown = 0; dlgText.textContent = ''; dlgMore.style.visibility = 'hidden';
}
function dialogTick(dt) {
  if (!D) return;
  const l = D.lines[D.i];
  if (D.shown < l.text.length) {
    const before = Math.floor(D.shown);
    D.shown = Math.min(l.text.length, D.shown + dt * 45);
    const now = Math.floor(D.shown);
    if (now !== before) { dlgText.textContent = l.text.slice(0, now); if (now % 2 === 0) SFX.blip(); }
    if (D.shown >= l.text.length) dlgMore.style.visibility = 'visible';
  }
  if (C() >= 2 && D.shown >= l.text.length && Math.random() < 0.01) dlgText.textContent = Math.random() < 0.5 ? corrupt(l.raw, 0.25) : l.text;
}
function dialogAdvance() {
  const l = D.lines[D.i];
  if (D.shown < l.text.length) { D.shown = l.text.length; dlgText.textContent = l.text; dlgMore.style.visibility = 'visible'; return; }
  D.i++;
  if (D.i >= D.lines.length) {
    const done = D.done; D = null; dlg.classList.remove('show');
    mode = 'play'; layout();
    if (done) done();
  } else showLine();
}

// ---------- toast ----------
let toastTimer = null;
function showToast(s, ms) {
  const t = $('toast'); t.textContent = s; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1800);
}

// ---------- A / B ----------
function onA() {
  if (mode === 'boot') { if (bootT > 0.8) { SFX.ok(); openFiles(); } return; }
  if (mode === 'dialog') { dialogAdvance(); return; }
  if (mode === 'card') { if (cardT > 1.2 && cardDone) { const f = cardDone; cardDone = null; f(); } return; }
  if (mode === 'map') { mode = 'play'; layout(); return; }
  if (mode === 'play') { interact(); return; }
}
function onB() {
  if (mode === 'dialog') { dialogAdvance(); return; }
  if (mode === 'card') { onA(); return; }
  if (mode === 'map') { mode = 'play'; layout(); return; }
  if (mode === 'paused') { closePause(); return; }
  if (mode === 'play') { swing(); return; }
}
function onStart() {
  if (mode === 'boot' || mode === 'card') { onA(); return; }
  if (mode === 'dialog') { dialogAdvance(); return; }
  if (mode === 'play' || mode === 'map') { mode = 'play'; openPause(); return; }
  if (mode === 'paused') { closePause(); return; }
}
function onSelect() {
  if (mode === 'play') { mode = 'map'; SFX.menu(); layout(); return; }
  if (mode === 'map') { mode = 'play'; layout(); return; }
}
window.shBack = function () {
  if (mode === 'dialog') { dialogAdvance(); return 1; }
  if (mode === 'play') { openPause(); return 1; }
  if (mode === 'map') { mode = 'play'; layout(); return 1; }
  if (mode === 'paused') { closePause(); return 1; }
  if (mode === 'name' || (mode === 'files' && $('confirm').classList.contains('show'))) { $('confirm').classList.remove('show'); openFiles(); return 1; }
  if (mode === 'help') { closeHelp(); return 1; }
  return 0;
};

const FV = [[0, 1], [0, -1], [-1, 0], [1, 0]];
function readLines(v) { return SHW.pick(v, C()); }
function interact() {
  const [fx_, fy_] = FV[P.dir];
  const ax = P.x + fx_ * 12, ay = P.y - 3 + fy_ * 12;
  for (const n of npcs) {
    if (Math.abs(n.x - ax) < 11 && Math.abs(n.y - 4 - ay) < 12) { talk(n); return true; }
  }
  const tx = clamp(Math.floor(ax / 16), 0, RW - 1), ty = clamp(Math.floor(ay / 16), 0, RH - 1);
  const ch = tileAt(room, tx, ty), r = R(room), k = tx + ',' + ty;
  if (r.memObj && r.memObj.tiles.includes(k)) {
    const first = !S.flags[r.memObj.flag];
    S.flags[r.memObj.flag] = true; save();
    if (first) { SFX.secret(); return say(r.memObj.lines, null, { clean: true }), true; }
    return say([r.memObj.lines[0]], null, { clean: true }), true;
  }
  if (r.signs && r.signs[k]) { say(readLines(r.signs[k])); return true; }
  if (ch === 'D') { SFX.door(); if (r.doors && r.doors[k]) say(readLines(r.doors[k])); else doorText(tx); return true; }
  if (r.tables && ch === 't') { const tb = r.tables.find(([a, b, y]) => ty === y && tx >= a && tx <= b); if (tb) { say(tb[3]); return true; } }
  if (ch === 'L' || ch === 'Y' || ch === 'Z') { tryOpen(tx, ty, true); return true; }
  if (ch === 'P' && room === 'village') {
    say(C() === 0 ? [['', 'A stone statue of a child holding a little bell.'], ['', 'The plaque is worn smooth. You can only read a "W".']]
      : [['', 'The plinth is empty.'], ['', 'There are small stone footprints leading away from it.']]);
    return true;
  }
  if (ch === 'M') { say(C() >= 2 ? [['', 'A small stone with flowers.'], ['', '"FOR {N}. WHO ALWAYS GOT THIS FAR."', 0]] : [['', 'A small stone with flowers.'], ['', '"FOR W. WHO ALWAYS GOT THIS FAR."']]); return true; }
  if (ch === 'g') {
    if (room === 'graveyard' && tx === 11 && ty === 1 && C() >= 2) say([['', 'HERE LIES {N}.', 0], ['', 'GOT FURTHER THAN MOST.']]);
    else say([['', GRAVES[Math.floor(hash(tx, ty, 7) * GRAVES.length)]]]);
    return true;
  }
  if (ch === 'a') { say(C() >= 2 ? [['', 'An apple tree. The apples are dark red, almost black.'], ['', 'One of them has a bite taken out of it. The bite is still wet.']] : [['', 'An apple tree. The apples look perfect. Too perfect.']]); return true; }
  if (ch === 'K' && room === 'clearing') { say([['', 'A huge dead tree. Two initials are carved in the bark: W + M.']]); return true; }
  if (ch === 'U') { say([['', C() >= 2 ? 'The wheel is turning backwards. There is no water pushing it.' : 'The old wheel creaks around and around.']]); return true; }
  if (ch === 'q') { say([['', S.solved[room] ? 'The orb glows green.' : 'A glass orb on a stand. It hums when your sword is near.']]); return true; }
  if (ch === 'B' && room === 'lake') { bell(); return true; }
  if (ch === '~' && (room === 'lake' || (r.night))) { say(C() >= 3 ? [['', 'Your reflection is a second late.']] : [['', 'The water is very still. And very cold.']]); return true; }
  return false;
}
function doorText(tx) {
  const c = C();
  if (tx === 3) say(c >= 1 ? [['', 'Locked.'], ['', 'You can hear a TV inside. It is playing this game.']] : [['', 'Locked. The Elder\'s house.']]);
  else say(c >= 2 ? [['', 'A note on the door: "CLOSED UNTIL THE NEXT PLAYER LEAVES."']] : [['', 'Locked. A sign says "BACK SOON".']]);
}
function openGroup(tx, ty) {
  const r = R(room), st = [[tx, ty]], seen = new Set();
  while (st.length) {
    const [x, y] = st.pop(), k = x + ',' + y;
    if (seen.has(k) || x < 0 || y < 0 || x >= RW || y >= RH || r.map[y][x] !== 'L') continue;
    seen.add(k); S.opened[room + ':' + k] = 1;
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
function tryOpen(tx, ty, viaA) {
  const ch = tileAt(room, tx, ty), r = R(room);
  if (ch === 'L') {
    const area = r.area;
    if ((S.keys[area] || 0) > 0) { S.keys[area]--; openGroup(tx, ty); SFX.unlock(); burst(tx * 16 + 8, ty * 16 + 8, '#c9b04a'); showToast('UNLOCKED'); save(); return true; }
    if (viaA || msgCool <= 0) { msgCool = 2.5; SFX.lock(); if (viaA) say([['', 'A locked door. You need a KEY.']]); else showToast('LOCKED'); }
    return false;
  }
  if (ch === 'Y') {
    if (r.memGate) { if (viaA || msgCool <= 0) { msgCool = 3; say([['', 'A trapdoor, shut tight.'], ['', r.memGate === 'mem3' ? 'Something in the bedroom wants to be seen first.' : r.memGate === 'mem6' ? 'Somebody at the sale has something to tell you first.' : 'Someone on the beach is waiting to talk to you.']]); } return false; }
    if (S.fkeys[r.area]) { S.opened[room + ':hatch'] = 1; SFX.unlock(); SFX.hatch(); burst(tx * 16 + 8, ty * 16 + 8, '#9fd3ff'); showToast('THE HATCH OPENS'); save(); return true; }
    if (viaA || msgCool <= 0) { msgCool = 2.5; if (viaA) say([['', 'A locked hatch in the floor.'], ['', 'The FLOOR KEY is somewhere on this floor.']]); else showToast('FIND THE FLOOR KEY'); }
    return false;
  }
  if (ch === 'Z' && (viaA || msgCool <= 0)) { msgCool = 3; say([['', 'The mill door is boarded shut from the inside.'], ['', 'The boards are old. With a little more of the bell put back together, they might give.']]); }
  return false;
}
function burst(x, y, col, n) { for (let i = 0; i < (n || 10); i++) fx.push({ x, y, vx: rnd(-50, 50), vy: rnd(-60, 30), t: 0.5, col, grav: 1 }); }
function puff(x, y) { fx.push({ x: x + rnd(-2, 2), y, vx: rnd(-10, 10), vy: rnd(-14, -4), t: 0.35, col: '#d8cfb0', grav: 0, puff: 1 }); }

// ---------- NPC talk ----------
function talk(n) {
  const c = C();
  const dx = P.x - n.x, dy = P.y - n.y;
  n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  if (n.id === 'elder') {
    if (c === 0 && !S.met.elder) {
      S.met.elder = true;
      return say([['ELDER', 'Ah, a new face. What was your name again?'], ['ELDER', '{N}. Hm. That\'s not the name I remember.'],
        ['ELDER', 'Never mind. The old bell on the lake has broken into three pieces.'],
        ['ELDER', 'One is in THE HOLLOW, the dead tree beyond the woods to the northwest.'],
        ['ELDER', 'One is in THE CAVE on the hill to the east. One is in THE OLD MILL, across the river.'],
        ['ELDER', 'Each one is guarded. You\'ll find keys and locked doors. Be brave.'],
        ['ELDER', 'Bring the pieces to the bell at the end of the dock. Then everything can go back to how it was.'], ['ELDER', 'Paths lead off every edge of the village. Press SELECT if you get lost.']]);
    }
    if (c === 0) return say([['ELDER', 'The Hollow is northwest, past the woodcutter. The Cave is east. The Mill is southeast, over the bridge.'], ['ELDER', 'The mill is boarded up. Start with the Hollow or the Cave.']]);
    if (c === 1) return say([['ELDER', 'You found one. Good, good.'], ['ELDER', 'Did the statue move? I could swear it was on its plinth this morning.'], ['ELDER', 'Don\'t let it get behind you, {N}.']]);
    if (c === 2) return say([['ELDER', 'Your hands are shaking, {N}.'], ['ELDER', 'It\'s {T} where you are. Shouldn\'t you be asleep?', 0.0], ['ELDER', 'Wren used to play this late too.']]);
    if (S.flags.bellRung) return say([['ELDER', 'You rang it.'], ['ELDER', 'Go down, {N}. All the way down. Someone is waiting at the bottom.', 0.1]]);
    return say([['ELDER', 'Ring the bell, {N}.'], ['ELDER', 'Wren wants to be let out.'], ['ELDER', 'I mean. Wren wants it fixed.'], ['ELDER', 'Same thing.', 0.2]]);
  }
  if (n.id === 'kid') {
    if (c === 0) return say([['KID', 'Wanna know a secret?'], ['KID', 'If you stand at the end of the dock, you can see someone under the water.'], ['KID', 'They wave sometimes.']]);
    if (c === 1) return say([['KID', '{N}! {N}! {N}!'], ['KID', '...sorry. I just like saying it.'], ['KID', 'Nobody new ever comes here.']]);
    return say([['KID', 'Wren used to play with me every day.'], ['KID', 'Then Wren stopped coming.'], ['KID', 'You\'ve been here {M} minutes. Are you going to stop coming too?']]);
  }
  if (n.id === 'shop') {
    if (c === 0) return say([['SHOPKEEPER', 'Shop\'s closed. Been closed for a while.'], ['SHOPKEEPER', 'Somebody wrote in my ledger: WREN FOUND {P} OF 8 PAGES.'], ['SHOPKEEPER', 'Pages of what, I wonder.']]);
    if (c === 1) return say([['SHOPKEEPER', 'We don\'t get many new players, {N}.'], ['SHOPKEEPER', 'Last one never finished.']]);
    return say([['SHOPKEEPER', 'You bought this at a yard sale, didn\'t you?'], ['SHOPKEEPER', 'One dollar. No box. Name on the label in marker.'], ['SHOPKEEPER', 'That\'s how it always gets passed on.']]);
  }
  if (n.id === 'wren') {
    if (S.deep) return say([['WREN', 'I\'m not really here, {N}. I went home.'], ['WREN', 'You\'re just remembering me.']], null, { clean: true });
    if (!S.met.wren) {
      S.met.wren = true;
      return say([['???', 'Oh.'], ['???', 'You can see me.'], ['WREN', 'This was my file. Save one. I was on the lake part. I was so close to the end.'],
        ['WREN', 'You came all the way down. Nobody ever came all the way down.'],
        ['WREN', 'The summer I got this, I went swimming at the real lake.'], ['WREN', 'The cartridge never left my shelf after that.'],
        ['WREN', 'Then someone sold it at a yard sale. And now you have it, {N}.'],
        ['WREN', 'I\'ve been waiting so long. Can I go home now?']], () => startEnding(), { clean: true });
    }
    return say([['WREN', 'Can I go home now, {N}?']], () => startEnding(), { clean: true });
  }
  if (n.id === 'wrenghost') {
    const L = {
      hall: [['WREN', 'You found my house.'], ['WREN', 'It\'s quieter than I remember. Come see my room.']],
      room: [['WREN', 'This is my room. I was going to finish the game after the lake trip.'], ['WREN', 'Look at my shelf, {N}.']],
      lake: [['WREN', 'It was so hot that day.'], ['WREN', 'I was a good swimmer. I really was.'], ['WREN', 'The water got cold really fast. And then it was just... the game.'], ['WREN', 'Keep going down, {N}. I\'m at the bottom.']],
    }[n.lines] || [['WREN', '...']];
    return say(L, () => { if (n.flag && !S.flags[n.flag]) { S.flags[n.flag] = true; save(); SFX.secret(); say([['', 'Somewhere nearby, a trapdoor unlocks.']]); } }, { clean: true });
  }
  if (n.id === 'saleswoman') {
    return say([['WOMAN', 'Everything goes. All of it.'], ['WOMAN', 'We can\'t keep looking at it every day.'], ['WOMAN', 'Especially that game. Take it. Please. One dollar.']], () => { if (!S.flags.mem6) { S.flags.mem6 = true; save(); SFX.secret(); say([['', 'Somewhere nearby, a trapdoor unlocks.']]); } });
  }
  if (n.id === 'buyer') {
    return say([['???', 'One dollar? For an old game with no box?'], ['???', 'Somebody wrote on the label. SECONDHAND.'], ['???', '...okay. Deal.'], ['', 'The kid holding the cartridge looks a little like you.']], null, { clean: true });
  }
  if (n.id === 'figure') {
    const L = SHW.FIG_LINES[n.lines || 0];
    return say(L, () => { S.taken[R(room).area + ':fig'] = 1; npcs = npcs.filter(o => o !== n); staticT = 0.3; SFX.static(0.3); burst(n.x, n.y - 8, '#111', 16); save(); }, { clean: true });
  }
  if (NPCLINES[n.id]) return say(readLines(NPCLINES[n.id]));
}

// ---------- bell / ending ----------
function bell() {
  const c = C();
  if (c < 3) return say([['', 'An old bell, cracked into pieces.'], ['', (3 - c) + (3 - c === 1 ? ' piece is' : ' pieces are') + ' still missing.']]);
  if (S.flags.bellRung) return say([['', 'The bell hums quietly.'], ['', 'The stairs under the dock are waiting.']]);
  say([['', 'You fit the three pieces together.'], ['', 'The bell is whole again.']], () => ringBell());
}
function ringBell() {
  SFX.bell(false); setTimeout(() => SFX.bell(true), 1800);
  flash = 0.4; shake = 0.5; S.flags.bellRung = true; save();
  MUS.name = null;
  setTimeout(() => {
    if (mode !== 'play') return;
    staticT = 0.4; SFX.static(0.4);
    say([['', 'The bell rings. Then it rings again, backwards.'], ['', 'At the end of the dock, a board drops away. There are stairs under it, going down into the water.'], ['', 'down here, {N}.', 0.1]], () => playRoomMusic());
  }, 2600);
}
function startEnding() {
  mode = 'ending'; layout();
  ending = { t: 0, phase: 0 };
  MUS.name = null;
  SFX.bell(false);
  setTimeout(() => SFX.bell(true), 2400);
}
function endingTick(dt) {
  const e = ending; e.t += dt;
  if (e.phase === 0 && e.t > 4.5) {
    e.phase = 1;
    statue = { x: P.x, y: P.y - 18, moving: 0, gt: 0, fixed: true };
    SFX.sting(); flash = 0.4;
    say([['', 'Don\'t turn around.', 0], ['WREN', 'Thank you, {N}.'], ['WREN', 'I\'m going home now.'], ['WREN', 'It\'s your turn to wait under the dock.'], ['WREN', 'Don\'t worry. Someone always finds the cartridge eventually.']], () => { mode = 'ending'; ending.phase = 2; ending.t = 0; layout(); }, { clean: true });
  }
  if (e.phase === 2 && e.t > 5.5) { e.phase = 3; e.t = 0; SFX.static(2.6); }
  if (e.phase === 3 && e.t > 2.8) { e.phase = 4; e.t = 0; }
  if (e.phase === 4 && e.t > 1.6) { e.phase = 5; finishGame(); }
}
function finishGame() {
  M.ended = true; M.endName = S.name; M.endMins = minsPlayed(); M.endDeaths = S.deaths; M.deepUnlocked = true; saveMeta();
  S.done = true; save();
  mode = 'over';
  $('endStats').textContent = 'Time: ' + minsPlayed() + ' min · Deaths: ' + S.deaths + ' · Pages: ' + pagesFound() + ' of 8';
  $('endPanel').classList.add('show');
  layout();
}

// ---------- pause ----------
function openPause() {
  if (mode !== 'play') return;
  mode = 'paused'; refreshPause(); SFX.menu(); $('pausePanel').classList.add('show'); layout();
}
function refreshPause() {
  if (!S) return;
  $('pShards').textContent = S.deep ? '3 of 3' : C() + ' of 3';
  $('pDeaths').textContent = String(S.deaths);
  $('pPages').textContent = pagesFound() + ' of 8';
  $('pHearts').textContent = String(S.maxHearts);
  $('pDeep').textContent = S.floor ? 'B' + S.floor : '—';
  $('pSound').textContent = muted ? 'Sound: off' : 'Sound: on';
}
function closePause() { $('pausePanel').classList.remove('show'); mode = 'play'; SFX.menu(); layout(); }
$('pResume').onclick = () => closePause();
$('pSound').onclick = () => { setMute(!muted); refreshPause(); };
$('pHelp').onclick = () => openHelp('paused');
$('pQuit').onclick = () => { S.x = P.x; S.y = P.y; save(); $('pausePanel').classList.remove('show'); openFiles(); };
let helpBack = null;
function openHelp(back) { helpBack = back; $('helpPanel').classList.add('show'); mode = 'help'; }
function closeHelp() { $('helpPanel').classList.remove('show'); mode = helpBack || 'files'; if (mode === 'paused') $('pausePanel').classList.add('show'); }
$('helpClose').onclick = closeHelp;

// ---------- title / files ----------
const cartPanel = $('cartPanel'), filesPanel = $('filesPanel'), namePanel = $('namePanel');
$('insert').onclick = () => {
  audioInit(); cartPanel.classList.remove('show');
  M.visits = (M.visits || 0) + 1; saveMeta();
  mode = 'boot'; bootT = 0; layout();
  SFX.static(0.6); titleMusic();
};
let bootT = 0;
function storyS() { if (S && !S.deep) return S; return SAVED; }
function openFiles() {
  if (S && S.deep) { save(); S = SAVED; }
  else if (S) SAVED = S;
  mode = 'files'; titleMusic(); SHA.ambientOff(); layout();
  ['pausePanel', 'endPanel', 'helpPanel'].forEach(id => $(id).classList.remove('show'));
  const now = Date.now(), st = SAVED;
  let head = 'SELECT A FILE';
  if (M.ended) head = 'you came back.';
  else if (st && M.lastPlayed && now - M.lastPlayed > 86400000) head = 'you were gone ' + Math.floor((now - M.lastPlayed) / 86400000) + ' days, ' + st.name + '.';
  else if (st && M.visits > 1) head = 'welcome back, ' + st.name + '.';
  $('filesHead').textContent = head;
  const s1 = $('slot1'), s2 = $('slot2'), s3 = $('slot3'), s4 = $('slot4');
  if (M.ended) {
    s1.innerHTML = '<b>1</b> ' + esc(M.endName) + '<small>UNDER THE DOCK</small>';
    s2.innerHTML = '<b>2</b> WREN<small>WENT HOME</small>';
  } else {
    s1.innerHTML = M.wrenSeen ? '<b>1</b> WREN<small>— — —</small>' : '<b>1</b> WREN<small>♥♡♡ · THE LAKE · 2 of 3</small>';
    let where = '';
    if (st) { let r = null; try { S = st; r = R(st.room); } catch (e) {} where = r ? (r.gen ? 'B' + r.depth : (r.name || 'B10')) : '???'; }
    s2.innerHTML = st ? '<b>2</b> ' + esc(st.name) + '<small>' + '♥'.repeat(Math.min(st.hearts, st.maxHearts)) + '♡'.repeat(Math.max(0, st.maxHearts - st.hearts)) + ' · ' + esc(where) + ' · ' + C() + ' of 3</small>' : '<b>2</b> — NEW GAME —<small>&nbsp;</small>';
  }
  s3.innerHTML = M.ended ? '<b>3</b> — NEXT PLAYER —<small>start a new game</small>' : '<b>3</b> ' + (M.slot3Taps > 2 ? 'EMPTY. FOR NOW.' : '?????') + '<small>&nbsp;</small>';
  if (M.deepUnlocked) {
    let dr = null; try { dr = JSON.parse(localStorage.getItem(DEEPKEY) || 'null'); } catch (e) {}
    s4.style.display = '';
    s4.innerHTML = '<b>∞</b> THE DEEP<small>best: ' + (M.deepBest ? 'B' + M.deepBest : 'none yet') + (dr && dr.floor ? ' · in progress: B' + dr.floor : '') + '</small>';
  } else s4.style.display = 'none';
  filesPanel.classList.add('show');
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
$('slot1').onclick = () => {
  SFX.ok();
  if (M.ended) return afterEndScene();
  if (M.wrenSeen) { flashMsg('This file is still in use.'); return; }
  filesPanel.classList.remove('show'); wrenMemory();
};
$('slot2').onclick = () => {
  SFX.ok();
  if (M.ended) { flashMsg('Nobody is home.'); return; }
  if (SAVED) { S = SAVED; filesPanel.classList.remove('show'); startGame(); }
  else { filesPanel.classList.remove('show'); namePanel.classList.add('show'); mode = 'name'; setTimeout(() => $('nameIn').focus(), 50); }
};
$('slot3').onclick = () => {
  if (M.ended) {
    SFX.ok();
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = null; SAVED = null;
    M = { visits: M.visits || 1, lastPlayed: 0, wrenSeen: false, ended: false, endName: '', slot3Taps: 0, prevPlayer: M.endName, deepUnlocked: true, deepBest: M.deepBest || 0 }; saveMeta();
    filesPanel.classList.remove('show'); namePanel.classList.add('show'); mode = 'name'; $('nameIn').value = ''; setTimeout(() => $('nameIn').focus(), 50);
    return;
  }
  M.slot3Taps = (M.slot3Taps || 0) + 1; saveMeta(); SFX.static(0.3); flashMsg(M.slot3Taps > 2 ? 'It\'s waiting for the next player.' : 'This file is corrupted.'); openFiles(); };
$('slot4').onclick = () => { SFX.ok(); filesPanel.classList.remove('show'); startDeep(); };
$('eraseBtn').onclick = () => { $('confirm').classList.add('show'); };
$('eraseNo').onclick = () => $('confirm').classList.remove('show');
$('eraseYes').onclick = () => {
  try { localStorage.removeItem(KEY); localStorage.removeItem(META); localStorage.removeItem(DEEPKEY); } catch (e) {}
  S = null; SAVED = null; M = { visits: 1, lastPlayed: 0, wrenSeen: false, ended: false, endName: '', slot3Taps: 0, deepUnlocked: false, deepBest: 0 }; saveMeta();
  $('confirm').classList.remove('show'); SFX.static(0.5); openFiles();
};
$('helpBtn').onclick = () => openHelp('files');
let msgTimer = null;
function flashMsg(s) { const m = $('filesMsg'); m.textContent = s; clearTimeout(msgTimer); msgTimer = setTimeout(() => m.textContent = '', 2200); }
$('nameForm').onsubmit = e => {
  e.preventDefault();
  let n = ($('nameIn').value || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 8);
  if (!n) n = 'PLAYER';
  if (n === 'WREN') { $('nameMsg').textContent = 'That name is taken.'; SFX.static(0.3); return; }
  $('nameIn').blur();
  namePanel.classList.remove('show');
  S = newRun(n); SAVED = S; save(); startGame();
};
$('nameBack').onclick = () => { namePanel.classList.remove('show'); openFiles(); };

function startGame() {
  audioInit();
  mode = 'card'; cardT = 0; cardText = ['FILE 2', S.name];
  cardDone = () => { mode = 'play'; layout(); spawnAt(S.room || 'village', S.x || 7.5 * 16, S.y || 6 * 16 + 8); P.dir = 0; };
  layout();
}
function startDeep() {
  audioInit();
  let d = null;
  try { d = migrate(JSON.parse(localStorage.getItem(DEEPKEY) || 'null'), true); } catch (e) { d = null; }
  if (!d) {
    d = newRun(M.endName || (SAVED && SAVED.name) || 'PLAYER');
    Object.assign(d, { deep: true, shards: { hollow: true, cave: true, mill: true }, bosses: { hollow: true, cave: true, mill: true }, maxHearts: 6, hearts: 6, lantern: true, floor: 1 });
    d.flags.bellRung = true; d.flags.intro = true;
    S = d;
    const fi = SHW.floorInfo(d.seed, 1, true);
    d.room = fi.start; [d.x, d.y] = tc(fi.startArrive[0], fi.startArrive[1]);
  }
  S = d; save();
  mode = 'card'; cardT = 0; cardText = ['THE DEEP', 'B' + (S.floor || 1) + ' · best B' + (M.deepBest || 0)];
  cardDone = () => { mode = 'play'; layout(); spawnAt(S.room, S.x, S.y); P.dir = 0; };
  layout();
}
// put the player somewhere safe even if a save points at a wall
function spawnAt(rid, x, y) {
  room = rid;
  if (!R(rid)) { rid = 'village'; x = 7.5 * 16; y = 6 * 16 + 8; room = rid; }
  blocks = []; npcs = [];
  for (const [bx, by] of R(rid).blocks || []) blocks.push({ tx: bx, ty: by });
  if (!boxFree(x, y) || x < 8 || x > PW - 8 || y < 8 || y > PH - 4) {
    const r = R(rid); let best = null, bd = 1e9;
    for (let ty = 1; ty < RH - 1; ty++) for (let tx = 1; tx < RW - 1; tx++) {
      const ch = tileAt(rid, tx, ty); if (SOLID.has(ch) || WARP.has(ch)) continue;
      const [cx, cy] = tc(tx, ty); if (!boxFree(cx, cy)) continue;
      const d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = [cx, cy]; }
    }
    if (best) [x, y] = best; else { rid = 'village'; x = 7.5 * 16; y = 6 * 16 + 8; }
  }
  enterRoom(rid, x, y, { force: true });
}
let cardT = 0, cardText = ['', ''], cardDone = null;

// Wren's memory: you play slot 1 for a moment
function wrenMemory() {
  M.wrenSeen = true; saveMeta();
  mode = 'memory'; memT = 0; layout();
  MUS.name = null;
  const keepS = S; S = S || newRun('WREN');
  room = 'lake'; npcs = []; foes = []; items = []; statue = null; fx = []; blocks = [];
  memS = keepS;
  P.x = 7.5 * 16 + 8; P.y = 1 * 16 + 12; P.dir = 0;
  memPhase = 0;
}
let memT = 0, memPhase = 0, memS = null;
function memoryTick(dt) {
  memT += dt;
  if (memPhase === 0) {
    if (P.y < 9 * 16 + 8) { P.y += dt * 22; P.anim += dt; P.step = 1 + (((P.anim * 6) | 0) & 3); }
    else { memPhase = 1; memT = 0; P.step = 0; }
  } else if (memPhase === 1 && memT > 1) {
    memPhase = 2; memT = 0; SFX.static(1.2);
  } else if (memPhase === 2 && memT > 4) {
    memPhase = 3; memT = 0;
  } else if (memPhase === 3 && memT > 1.4) {
    memPhase = 4; S = memS; openFiles(); flashMsg('Save 1 could not be loaded.');
  }
}
function afterEndScene() {
  filesPanel.classList.remove('show');
  mode = 'card'; cardT = 0; cardText = ['', 'you are under the dock now.'];
  cardDone = () => { mode = 'card'; cardT = 0; cardText = ['', 'wait for the next player.']; cardDone = () => { openFiles(); flashMsg('File 3 is open. So is THE DEEP.'); }; };
  layout();
}

// ---------- combat ----------
// tap B: swing. Keep holding B ~0.6s: the sword charges (glint, sparkles); let go to spin 360°.
// At low health every swing also throws a pale beam of light (the spin throws 8).
const SWING = 0.26, SPIN = 0.42, CHARGE = 0.6;
let bHeld = false;
function lowHP() { return !!S && S.hearts > 0 && (S.hearts <= 1 || S.hearts <= S.maxHearts * 0.25); }
function bDown() { bHeld = true; onB(); }
function bUp() {
  bHeld = false;
  if (mode === 'play' && P.charged && P.spin <= 0) spinAttack();
  P.charging = false; P.charged = false; P.chargeT = 0; P.chargeSnd = false;
}
function swingAt(hx, hy, radius) {
  // sword orbs + the statue react to any blade nearby
  const r = R(room);
  if (r.puzzle === 'orb' && !S.solved[room]) {
    for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) if (tileAt(room, tx, ty) === 'q' && Math.hypot(tx * 16 + 8 - hx, ty * 16 + 8 - hy) < radius) { SFX.click(); solveRoom('The orb flashes green. Somewhere, bars slide open.'); return; }
  }
}
function swing() {
  if (P.swing > 0 || P.spin > 0) return;
  P.swing = SWING; P.swingId++; SFX.swing();
  P.charging = true; P.chargeT = 0; P.charged = false; P.chargeSnd = false;
  const [fx_, fy_] = FV[P.dir];
  const hx = P.x + fx_ * 12, hy = P.y - 4 + fy_ * 12;
  const r = R(room);
  if (r.puzzle === 'orb' && !S.solved[room]) {
    for (const [ox, oy] of [[0, 0], [fx_ * 6, fy_ * 6]]) {
      const tx = Math.floor((hx + ox) / 16), ty = Math.floor((hy + oy) / 16);
      if (tileAt(room, tx, ty) === 'q') { SFX.click(); solveRoom('The orb flashes green. Somewhere, bars slide open.'); break; }
    }
  }
  if (statue && Math.abs(statue.x - hx) < 12 && Math.abs(statue.y - 4 - hy) < 14) {
    SFX.clank(); shake = 0.15; sparks(statue.x, statue.y - 8, 5, '#ffffff');
    if (!S.flags.hitStatue) { S.flags.hitStatue = true; say([['', 'Your sword bounces off the stone.'], ['', 'It does not like that.']]); }
  }
  if (lowHP() && mode === 'play') fireBeam(Math.atan2(fy_, fx_));
}
function spinAttack() {
  P.spin = SPIN; P.swingId++; P.spinId = P.swingId; P.swing = 0;
  const [fx_, fy_] = FV[P.dir];
  P.spinA = Math.atan2(fy_, fx_) - 0.6;
  SFX.spin(); shake = Math.max(shake, 0.06);
  fx.push({ x: P.x, y: P.y - 5, vx: 0, vy: 0, t: 0.35, max: 0.35, col: '#cfeeff', kind: 'ring', r: 26 });
  swingAt(P.x, P.y - 4, 30);
  if (statue && Math.hypot(statue.x - P.x, statue.y - P.y) < 28) { SFX.clank(); sparks(statue.x, statue.y - 8, 6, '#ffffff'); }
  if (lowHP()) for (let i = 0; i < 8; i++) fireBeam(i * Math.PI / 4, i > 0);
}
function fireBeam(ang, quiet) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  beams.push({ x: P.x + ca * 12, y: P.y - 5 + sa * 12, vx: ca * 190, vy: sa * 190, ang, t: 0, life: 1.4 });
  if (!quiet) SFX.beam();
}
function beamPop(b) { burst(b.x, b.y, '#d8f4ff', 7); sparks(b.x, b.y, 4, '#ffffff'); SFX.beamPop(); }
function beamsTick(dt) {
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (Math.random() < 0.6) fx.push({ x: b.x - b.vx * 0.03 + rnd(-1, 1), y: b.y - b.vy * 0.03 + rnd(-1, 1), vx: 0, vy: 0, t: 0.2, max: 0.2, col: '#bfeaff', kind: 'spark' });
    let gone = b.t > b.life;
    if (!gone && (b.x < 2 || b.x > PW - 2 || b.y < 2 || b.y > PH - 2 || flyBlocked(b.x, b.y))) { beamPop(b); gone = true; }
    if (!gone) for (const f of foes) {
      if (!f.alive || (f.type === 'listener' && f.alpha < 0.6)) continue;
      if (Math.hypot(f.x - b.x, f.y - b.y) < (f.boss ? 17 : 10)) { const keep = f.inv; f.inv = 0; damageFoe(f, 1, b); if (f.inv === 0) f.inv = keep; beamPop(b); gone = true; break; }
    }
    if (!gone && statue && Math.hypot(statue.x - b.x, statue.y - 6 - b.y) < 9) { beamPop(b); SFX.clank(); gone = true; }
    if (!gone) for (let j = shots.length - 1; j >= 0; j--) { const s = shots[j]; if (Math.hypot(s.x - b.x, s.y - b.y) < 8) { shots.splice(j, 1); beamPop(b); gone = true; break; } }
    if (gone) beams.splice(i, 1);
  }
}
function swingHits() {
  if (P.spin > 0) return spinHits();
  if (P.swing <= 0) return;
  const k = 1 - P.swing / SWING;
  if (k < 0.15 || k > 0.8) return;
  const [fx_, fy_] = FV[P.dir];
  const hx = P.x + fx_ * 12, hy = P.y - 4 + fy_ * 12;
  for (const f of foes) {
    if (!f.alive || f.hitBy === P.swingId) continue;
    const rr = f.boss ? 20 : 13;
    if (f.type === 'listener' && f.alpha < 0.6) continue;
    if (Math.abs(f.x - hx) < rr && Math.abs(f.y - hy) < rr) { f.hitBy = P.swingId; damageFoe(f); }
  }
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; if (Math.abs(s.x - hx) < 12 && Math.abs(s.y - hy) < 12) { burst(s.x, s.y, '#fff', 5); shots.splice(i, 1); SFX.hit(); } }
}
function spinHits() {
  const k = 1 - P.spin / SPIN;
  if (k > 0.92) return;
  const cx = P.x, cy = P.y - 4;
  for (const f of foes) {
    if (!f.alive || f.hitBy === P.spinId) continue;
    if (f.type === 'listener' && f.alpha < 0.6) continue;
    if (Math.hypot(f.x - cx, f.y - cy) < (f.boss ? 32 : 25)) { f.hitBy = P.spinId; f.inv = 0; damageFoe(f, 2); }
  }
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; if (Math.hypot(s.x - cx, s.y - cy) < 22) { burst(s.x, s.y, '#fff', 5); shots.splice(i, 1); SFX.hit(); } }
}
function sparks(x, y, n, col) { for (let i = 0; i < n; i++) fx.push({ x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: rnd(-60, 60), vy: rnd(-60, 40), t: 0.3, max: 0.3, col, kind: 'spark' }); }
function damageFoe(f, dmg, from) {
  if (f.inv > 0) return;
  f.hp -= dmg || 1; f.fl = 0.15; f.inv = f.boss ? 0.45 : 0.2;
  const src = from || { x: P.x, y: P.y - 4 };
  const dx = f.x - src.x, dy = f.y - src.y, d = Math.hypot(dx, dy) || 1, kb = f.boss ? 70 : 170 + (dmg > 1 ? 60 : 0);
  f.kx = dx / d * kb; f.ky = dy / d * kb;
  sparks(f.x - dx / d * 5, f.y - dy / d * 5, f.boss ? 6 : 4, '#fff6c0');
  if (f.boss) { SFX.bossHit(); shake = 0.12; } else SFX.hit();
  if (f.hp <= 0) {
    f.alive = false; S.kills = (S.kills || 0) + 1;
    burst(f.x, f.y, f.type === 'wisp' ? '#bfefff' : f.type === 'bat' ? '#c86cff' : f.type === 'mimic' ? '#d64541' : '#aaa', f.boss ? 40 : 10);
    for (let i = 0; i < (f.boss ? 10 : 5); i++) fx.push({ x: f.x + rnd(-4, 4), y: f.y + rnd(-4, 4), vx: rnd(-14, 14), vy: rnd(-20, -4), t: 0.5, max: 0.5, col: '#d8d0e0', kind: 'smoke' });
    fx.push({ x: f.x, y: f.y, vx: 0, vy: 0, t: 0.3, max: 0.3, col: '#ffffff', kind: 'ring', r: f.boss ? 30 : 12 });
    if (f.boss) return bossDefeated(f);
    SFX.kill();
    if (Math.random() < 0.22 && S.hearts < S.maxHearts) items.push({ id: 'heart', x: f.x, y: f.y, drop: 6 });
  }
}
function hurt(src, dmg) {
  if (P.inv > 0 || mode !== 'play' || window.__shGod) return;
  S.hearts -= dmg || 1; P.inv = 1.2; SFX.hurt(); shake = 0.2; flash = 0.15;
  P.charging = false; P.charged = false; P.chargeT = 0;
  if (lowHP()) lowBeep = 3.6;
  const dx = P.x - src.x, dy = P.y - src.y, d = Math.hypot(dx, dy) || 1;
  P.kx = dx / d * 140; P.ky = dy / d * 140;
  if (S.hearts <= 0) gameOver();
}
function solveRoom(msg) {
  if (S.solved[room]) return;
  S.solved[room] = 1; save(); SFX.secret(); SFX.gate();
  showToast(msg && msg.length < 26 ? msg : 'A GATE OPENS');
  if (msg && msg.length >= 26 && !S.flags.firstGate) { S.flags.firstGate = true; say([['', msg]]); }
}
function spawnBossLoot(area) {
  if (!S.taken[area + ':hc']) items.push({ id: 'hc', uid: area + ':hc', x: 6 * 16 + 8, y: 5 * 16 + 8 });
  if (!S.taken[area + ':piece']) items.push({ id: 'piece', uid: area + ':piece', area, x: 9 * 16 + 8, y: 5 * 16 + 8 });
}
function bossDefeated(f) {
  const area = R(room).area;
  S.bosses[area] = true; save();
  foes.forEach(o => { if (o !== f) { o.alive = false; burst(o.x, o.y, '#888', 6); } });
  shots = []; spikes = [];
  SFX.sting(); flash = 0.5; shake = 0.6; staticT = 0.3;
  playRoomMusic();
  const L = { rooted: 'THE ROOTED ONE falls apart into dirt and old leaves.', listener: 'THE LISTENER closes its eye. The dark gets a little lighter.', miller: 'THE MILLER\'s mask cracks. There is nothing behind it but flour.' }[f.type];
  setTimeout(() => { spawnBossLoot(area); SFX.chest(); if (mode === 'play') say([['', L]]); }, 900);
}
function gotItem(it) {
  if (it.uid) S.taken[it.uid] = 1;
  const area = R(room).area;
  switch (it.id) {
    case 'heart': S.hearts = Math.min(S.maxHearts, S.hearts + 1); SFX.heart(); sparks(P.x, P.y - 8, 4, '#ffb0bc'); break;
    case 'key': S.keys[area] = (S.keys[area] || 0) + 1; SFX.key(); burst(P.x, P.y - 8, '#e8c23a');
      if (!S.flags.gotKey) { S.flags.gotKey = true; say([['', 'You got a KEY!'], ['', 'Walk into a locked door to open it. Keys only work in the place you found them.']]); } else showToast('KEY');
      break;
    case 'fkey': S.fkeys[area] = 1; SFX.key(); burst(P.x, P.y - 8, '#9fd3ff');
      if (!S.flags.gotFkey) { S.flags.gotFkey = true; say([['', 'You got the FLOOR KEY!'], ['', 'Find the locked hatch on this floor and go down.']]); } else showToast('FLOOR KEY');
      break;
    case 'page': S.pages[it.n] = 1; SFX.page();
      say([['', 'You found a page from a diary. (' + pagesFound() + ' of 8)'], ['WREN', PAGES[it.n][0] + '  ' + PAGES[it.n][1], 0]], null, { clean: true });
      break;
    case 'lantern': S.lantern = true; SFX.pick(); say([['', 'You got the LANTERN!'], ['', 'The dark pulls back. A little.'], ['', 'Scratched on the handle: "W."']]); break;
    case 'hc': S.maxHearts = Math.min(6, S.maxHearts + 1); S.hearts = S.maxHearts; SFX.pick(); burst(P.x, P.y - 8, '#e8384f', 16);
      say([['', 'You got a HEART CONTAINER!'], ['', 'Your hearts went up to ' + S.maxHearts + '.']]); break;
    case 'piece': gotShard(it.area); break;
  }
  save();
}
function gotShard(id) {
  S.shards[id] = true; save();
  SFX.shard(); burst(P.x, P.y - 8, '#ffe36b');
  const c = C();
  if (c === 1) say([['', 'You got a BELL PIECE! 1 of 3.'], ['', 'SAVING...'], ['', 'SAVE 1: WREN', 0], ['', 'SAVE 2: {N}. Done.']], () => { staticT = 0.25; SFX.static(0.25); });
  else if (c === 2) say([['', 'You got a BELL PIECE! 2 of 3.'], ['', 'The music sounds wrong now.'], ['', 'It isn\'t your speakers.'], ['', 'Far away, you hear boards falling off a door.']]);
  else say([['', 'You got the last BELL PIECE!'], ['', 'thank you, {N}.', 0.15], ['', 'Take them to the bell at the end of the dock.']]);
}
function gameOver() {
  S.deaths++; S.hearts = S.maxHearts;
  P.inv = 0; P.kx = P.ky = 0; P.swing = 0;
  const c = C();
  if (S.deep) {
    const reached = S.floor || 1;
    if (reached > (M.deepBest || 0)) M.deepBest = reached;
    saveMeta();
    try { localStorage.removeItem(DEEPKEY); } catch (e) {}
    mode = 'card'; cardT = 0; cardText = ['THE DEEP', 'you reached B' + reached + '.  best: B' + M.deepBest];
    cardDone = () => { S = SAVED; openFiles(); };
    layout(); return;
  }
  save();
  mode = 'card'; cardT = 0;
  cardText = ['GAME OVER', c >= 2 ? corrupt('WREN DIDN\'T GET TO CONTINUE', 0.08) : 'CONTINUE?'];
  if (c >= 1 && S.deaths >= 3) cardText[1] = 'that\'s ' + S.deaths + ' times, ' + S.name + '.';
  const cp = S.checkpoint;
  cardDone = () => { mode = 'play'; layout(); if (cp && R(cp.room)) spawnAt(cp.room, cp.x, cp.y); else enterRoom('village', 7.5 * 16 + 8, 6 * 16 + 8); };
  layout();
}
function caught() {
  S.caught = (S.caught || 0) + 1;
  SFX.sting(); staticT = 0.7; shake = 0.3;
  S.hearts--; P.inv = 1.5;
  const first = !S.flags.caught; S.flags.caught = true;
  const back = () => { if (S.hearts <= 0) gameOver(); else { P.x = P.entryX; P.y = P.entryY; S.statueSteps = Math.max(0, S.statueSteps - 3); placeStatue(); } };
  if (first) say([['', 'IT WAS RIGHT BEHIND YOU.', 0], ['', 'It only moves when you aren\'t looking at it.']], back, { clean: true });
  else back();
}

// ---------- foes ----------
function flyBlocked(x, y) {
  if (x < 6 || x > PW - 6 || y < 6 || y > PH - 6) return true;
  const ch = tileAt(room, Math.floor(x / 16), Math.floor(y / 16));
  return SOLID.has(ch) && ch !== '~' && ch !== 'z';
}
function foeSolid(x, y) {
  if (x < 4 || x > PW - 4 || y < 4 || y > PH - 4) return true;
  return solidAt(x, y);
}
function foeMove(f, dx, dy, fly) {
  const blk = fly ? flyBlocked : (x, y) => foeSolid(x - 4, y - 3) || foeSolid(x + 4, y - 3) || foeSolid(x - 4, y + 4) || foeSolid(x + 4, y + 4);
  let hitX = false, hitY = false;
  if (dx) { if (!blk(f.x + dx, f.y)) f.x += dx; else hitX = true; }
  if (dy) { if (!blk(f.x, f.y + dy)) f.y += dy; else hitY = true; }
  return [hitX, hitY];
}
function lineClear(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (solidAt(x, y)) return false; }
  return true;
}
function foesTick(dt) {
  const c = C(), depth = curDepth(), spd = 1 + Math.min(0.5, depth * 0.035);
  const px = P.x, py = P.y - 4;
  for (const f of foes) {
    if (!f.alive) continue;
    f.t += dt; if (f.fl > 0) f.fl -= dt; if (f.inv > 0) f.inv -= dt;
    if (f.kx || f.ky) {
      foeMove(f, f.kx * dt, f.ky * dt, f.type === 'bat' || f.type === 'wisp');
      f.kx *= Math.pow(0.004, dt); f.ky *= Math.pow(0.004, dt);
      if (Math.abs(f.kx) < 4) f.kx = 0; if (Math.abs(f.ky) < 4) f.ky = 0;
    }
    const dx = px - f.x, dy = py - f.y, d = Math.hypot(dx, dy) || 1;
    if (f.type === 'wisp') {
      const chase = d < 70 && !P.hidden;
      const sp = (chase ? 26 + c * 4 : 14) * spd;
      const tx = chase ? dx / d : Math.cos(f.t * 0.7 + f.x), ty = chase ? dy / d : Math.sin(f.t * 0.9 + f.y);
      f.vx += (tx * sp - f.vx) * Math.min(1, dt * 2); f.vy += (ty * sp - f.vy) * Math.min(1, dt * 2);
      const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt;
      if (!flyBlocked(nx, f.y)) f.x = nx; else f.vx *= -1;
      if (!flyBlocked(f.x, ny)) f.y = ny; else f.vy *= -1;
      if (d < 9) hurt(f);
    } else if (f.type === 'bat') {
      f.cd -= dt;
      if (f.cd <= 0) {
        f.cd = rnd(0.2, 0.55);
        const toward = Math.random() < (d < 90 ? 0.55 : 0.2);
        const a = toward ? Math.atan2(dy, dx) + rnd(-0.7, 0.7) : rnd(0, Math.PI * 2);
        const sp = rnd(45, 75) * spd;
        f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp;
      }
      const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt;
      if (!flyBlocked(nx, f.y)) f.x = nx; else f.vx *= -1;
      if (!flyBlocked(f.x, ny)) f.y = ny; else f.vy *= -1;
      if (d < 8) hurt(f);
    } else if (f.type === 'crawler') {
      if (f.st === 'roam') {
        const [hx, hy] = foeMove(f, f.dx * 18 * spd * dt, f.dy * 18 * spd * dt);
        f.st_t -= dt;
        if (hx || hy || f.st_t <= 0) { const a = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0]; f.dx = a[0]; f.dy = a[1]; f.st_t = rnd(0.8, 2); }
        if (d < 130 && (Math.abs(dx) < 7 || Math.abs(dy) < 7) && lineClear(f.x, f.y, px, py)) {
          f.st = 'warn'; f.st_t = 0.25;
          if (Math.abs(dx) < 7) { f.dx = 0; f.dy = Math.sign(dy); } else { f.dx = Math.sign(dx); f.dy = 0; }
        }
      } else if (f.st === 'warn') { f.st_t -= dt; if (f.st_t <= 0) { f.st = 'rush'; f.st_t = 1.3; } }
      else if (f.st === 'rush') {
        const [hx, hy] = foeMove(f, f.dx * 125 * spd * dt, f.dy * 125 * spd * dt);
        f.st_t -= dt;
        if (hx || hy || f.st_t <= 0) { f.st = 'rest'; f.st_t = 0.7; if (hx || hy) burst(f.x + f.dx * 6, f.y + f.dy * 6, '#888', 4); }
      } else { f.st_t -= dt; if (f.st_t <= 0) { f.st = 'roam'; f.st_t = rnd(0.6, 1.5); } }
      if (d < 9) hurt(f);
    } else if (f.type === 'mimic') {
      // mirrors the player's movement left/right, follows up/down, and slowly drifts closer
      foeMove(f, -P.mdx + Math.sign(dx) * 9 * spd * dt, P.mdy + Math.sign(dy) * 9 * spd * dt);
      f.dir = P.dir === 2 ? 3 : P.dir === 3 ? 2 : P.dir;
      f.moving = Math.abs(P.mdx) + Math.abs(P.mdy) > 0.01;
      if (d < 9) hurt(f);
    } else if (f.boss) bossTick(f, dt, dx, dy, d);
  }
  if (foes.length && foes.some(f => !f.alive)) foes = foes.filter(f => f.alive);
  if (clearArmed && !foes.length) { clearArmed = false; solveRoom('The last one falls. Bars slide open.'); }
  // shots
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.t > s.life || flyBlocked(s.x, s.y)) { shots.splice(i, 1); continue; }
    if (Math.hypot(s.x - px, s.y - py) < 7) { hurt(s); shots.splice(i, 1); }
  }
  for (let i = spikes.length - 1; i >= 0; i--) {
    const s = spikes[i]; s.t += dt;
    if (s.t > s.warn && !s.hit && Math.hypot(s.x - px, s.y - py) < 11) { s.hit = true; hurt(s); }
    if (s.t > s.warn + 0.45) spikes.splice(i, 1);
  }
}
function bossTick(f, dt, dx, dy, d) {
  if (f.wake === undefined) f.wake = 1.8;
  if (f.wake > 0) { f.wake -= dt; return; }
  const enraged = f.hp <= f.maxhp / 2;
  f.cd -= dt;
  if (f.type === 'rooted') {
    foeMove(f, Math.sign(dx) * 16 * dt * (enraged ? 1.4 : 1), Math.sign(dy) * 12 * dt * (enraged ? 1.4 : 1));
    if (f.cd <= 0) {
      f.cd = enraged ? 2.0 : 2.8;
      const n = enraged ? 4 : 3;
      for (let i = 0; i < n; i++) spikes.push({ x: clamp(P.x + (i ? rnd(-40, 40) : 0), 24, PW - 24), y: clamp(P.y - 4 + (i ? rnd(-30, 30) : 0), 24, PH - 24), t: 0, warn: 0.75 });
      if (enraged && foes.filter(o => o.type === 'wisp').length < 2 && Math.random() < 0.5) foes.push(mkFoe('wisp', f.x, f.y - 10));
    }
    if (d < 15) hurt(f);
  } else if (f.type === 'listener') {
    f.alpha = f.alpha === undefined ? 1 : f.alpha;
    if (f.st === 'roam' || f.st === 'show') {
      f.st = 'show'; f.st_t = (f.st_t || 3.2) - dt; f.alpha = Math.min(1, f.alpha + dt * 3);
      if (f.cd <= 0) {
        f.cd = enraged ? 0.9 : 1.3; SFX.shot();
        const n = enraged ? 10 : 8, off = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; shots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 48, vy: Math.sin(a) * 48, t: 0, life: 4, kind: 'orb' }); }
      }
      if (f.st_t <= 0) { f.st = 'hide'; f.st_t = 0.9; }
    } else if (f.st === 'hide') {
      f.alpha = Math.max(0, f.alpha - dt * 2.5); f.st_t -= dt;
      if (f.st_t <= 0) {
        const spots = [[3.5, 3], [12.5, 3], [3.5, 8], [12.5, 8], [8, 5.5]].map(([a, b]) => [a * 16, b * 16]).filter(([a, b]) => Math.hypot(a - P.x, b - P.y) > 60);
        const s = spots[(Math.random() * spots.length) | 0] || [128, 80];
        f.x = s[0]; f.y = s[1]; f.st = 'show'; f.st_t = enraged ? 2.6 : 3.4; f.cd = 0.7;
      }
    }
    if (d < 15 && f.alpha > 0.6) hurt(f);
  } else if (f.type === 'miller') {
    if (f.st === 'dash') {
      const [hx, hy] = foeMove(f, f.dx * 140 * dt, f.dy * 140 * dt);
      f.st_t -= dt; if (hx || hy || f.st_t <= 0) { f.st = 'roam'; f.st_t = 1; if (hx || hy) { shake = 0.2; SFX.grind(); } }
    } else {
      foeMove(f, Math.sign(dx) * 20 * dt, Math.sign(dy) * 20 * dt);
      f.st_t -= dt;
      if (f.st_t <= 0 && (Math.abs(dx) < 8 || Math.abs(dy) < 8)) { f.st = 'dash'; f.st_t = 0.7; if (Math.abs(dx) < 8) { f.dx = 0; f.dy = Math.sign(dy); } else { f.dx = Math.sign(dx); f.dy = 0; } }
      if (f.cd <= 0) {
        f.cd = enraged ? 1.6 : 2.4; SFX.shot();
        const a = Math.atan2(dy, dx), n = enraged ? 3 : 1;
        for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.35; shots.push({ x: f.x, y: f.y - 6, vx: Math.cos(aa) * 75, vy: Math.sin(aa) * 75, t: 0, life: 4, kind: 'sickle' }); }
      }
    }
    if (d < 15) hurt(f);
  }
}

// ---------- sounds of the world ----------
let lowBeep = 0, lowBeepT = 0, prevLow = false;
const WINDY = new Set(['highfield', 'northroad', 'eastroad', 'oldroad', 'bramble', 'graveyard', 'chapel', 'orchard', 'cavehill', 'w6a', 'w6b', 'w6c']);
function surfaceAt(x, y) {
  const ch = tileAt(room, Math.floor(x / 16), Math.floor((y - 1) / 16)), r = R(room);
  if (ch === '.' || ch === ',' || ch === 'w') return 'grass';
  if (ch === '=') return 'dirt';
  if (ch === 'S' || ch === 'e' || ch === 'u') return 'sand';
  if (ch === 'm') return 'marsh';
  if (ch === 'd' || ch === 'B' || ch === 'Y') return 'wood';
  if (ch === 'Q') return 'glitch';
  if (r && r.pal) { const p = palFor(r); if (p.plank) return 'wood'; if (p.name === 'hollow') return 'dirt'; }
  return 'stone';
}
function footstep() { SFX.step(surfaceAt(P.x, P.y), P.running ? 1.2 : 0.85); }
function soundsTick(dt) {
  const r = R(room);
  let wd = 999; for (const [wx, wy] of RC.water) { const d = Math.hypot(wx - P.x, wy - P.y); if (d < wd) wd = d; }
  const water = RC.water.length ? clamp(1 - (wd - 10) / 90, 0, 1) * (r.night ? 0.6 : 1) : 0;
  const wind = WINDY.has(room) ? 1 : (r.gen && r.depth >= 9 ? 0.4 : 0);
  let hum = 0; for (const f of foes) if (f.alive && f.type === 'wisp') hum = Math.max(hum, clamp(1 - Math.hypot(f.x - P.x, f.y - P.y) / 90, 0, 1));
  const drips = r.area === 'cave' ? 1 : (r.gen || r.area === 'hollow') ? 0.45 : 0;
  SHA.ambient({ water, wind, hum, drips });
  for (const f of foes) {
    if (!f.alive) continue;
    if (f.boss && f.wake !== undefined && f.wake <= 0 && !f.roared) { f.roared = true; SFX.roar(f.type); shake = Math.max(shake, 0.3); }
    if (f.boss && f.roared && !f.roared2 && f.hp <= f.maxhp / 2) { f.roared2 = true; SFX.roar(f.type); shake = Math.max(shake, 0.3); }
    const d = Math.hypot(f.x - P.x, f.y - P.y), v = clamp(1 - d / 110, 0, 1);
    if (v <= 0) continue;
    if (f.type === 'bat') { const fl = ((f.t * 14) | 0) % 2; if (fl !== f.flapS) { f.flapS = fl; if (fl) SFX.flap(v); } }
    else if (f.type === 'crawler' && (f.st === 'rush' || f.st === 'roam')) { f.skT = (f.skT || 0) - dt; if (f.skT <= 0) { f.skT = f.st === 'rush' ? 0.08 : 0.32; SFX.skitter(v * (f.st === 'rush' ? 1 : 0.6)); } }
    else if (f.type === 'mimic' && Math.random() < dt * 0.8) SFX.mimic(v);
  }
  // low health: a few soft beeps, then it stops nagging
  const low = lowHP();
  if (low && !prevLow) lowBeep = 3.6;
  prevLow = low;
  if (!low) lowBeep = 0;
  if (lowBeep > 0) { lowBeep -= dt; lowBeepT -= dt; if (lowBeepT <= 0) { lowBeepT = 0.62; SFX.lowhp(); } }
}

// ---------- update ----------
function update(dt) {
  T += dt;
  if (msgCool > 0) msgCool -= dt;
  if (fadeT > 0) fadeT -= dt;
  if (mode !== 'play') { P.charging = false; P.charged = false; }
  if (mode === 'boot') { bootT += dt; return; }
  if (mode === 'card') { cardT += dt; return; }
  if (mode === 'memory') { memoryTick(dt); return; }
  if (mode === 'ending') { endingTick(dt); fxTick(dt); return; }
  if (mode === 'dialog') { dialogTick(dt); return; }
  if (mode !== 'play') return;
  S.playMs += dt * 1000;
  if (((T * 10) | 0) % 50 === 0) { M.lastPlayed = Date.now(); saveMeta(); }
  const c = C(), r = R(room);

  // player movement
  let mx = 0, my = 0;
  if (held.left) mx -= 1; if (held.right) mx += 1; if (held.up) my -= 1; if (held.down) my += 1;
  if (padStyle === 'stick' && (AXIS.x || AXIS.y)) { mx = AXIS.x; my = AXIS.y; if (Math.abs(my) < Math.abs(mx) * 0.4) my = 0; else if (Math.abs(mx) < Math.abs(my) * 0.4) mx = 0; }
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  if (P.swing > 0) { P.swing -= dt; mx *= 0.15; my *= 0.15; }
  if (P.spin > 0) { P.spin -= dt; mx *= 0.2; my *= 0.2; if (P.spin <= 0) P.spin = 0; }
  // charging the spin: keep holding B after a swing
  if (P.charging) {
    if (!bHeld) { P.charging = false; P.charged = false; P.chargeT = 0; }
    else {
      P.chargeT += dt;
      if (P.chargeT > 0.28 && !P.chargeSnd) { P.chargeSnd = true; SFX.charge(); }
      if (P.chargeT >= CHARGE && !P.charged) { P.charged = true; SFX.chargeReady(); const [fx_, fy_] = FV[P.dir]; sparks(P.x + fx_ * 16, P.y - 6 + fy_ * 16, 6, '#ffffff'); }
      if (P.swing <= 0) { mx *= 0.62; my *= 0.62; }
    }
  }
  const bx0 = P.x, by0 = P.y;
  const moving = Math.abs(mx) > 0.05 || Math.abs(my) > 0.05;
  P.running = moving && aHeld && P.swing <= 0 && !P.charging && P.spin <= 0;
  if (moving) {
    if (P.swing <= 0 && !P.charging && P.spin <= 0) P.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my > 0 ? 0 : 1);
    const onMarsh = tileAt(room, Math.floor(P.x / 16), Math.floor((P.y - 1) / 16)) === 'm';
    const sp = 64 * (P.running ? 1.75 : 1) * (onMarsh ? 0.7 : 1) * dt;
    const bx = P.x, by = P.y;
    moveBody(P, mx * sp, my * sp);
    // corner assist: slide around the edge of a blocking tile
    if (P.x === bx && mx && Math.abs(my) < 0.3) { const cy = Math.floor((P.y - 1) / 16) * 16 + 9; const ny = P.y + Math.sign(cy - P.y) * Math.min(sp, Math.abs(cy - P.y)); if (Math.abs(cy - P.y) > 0.5 && boxFree(P.x + Math.sign(mx) * 2, cy, P)) moveBody(P, 0, ny - P.y); }
    if (P.y === by && my && Math.abs(mx) < 0.3) { const cx = Math.floor(P.x / 16) * 16 + 8; const nx = P.x + Math.sign(cx - P.x) * Math.min(sp, Math.abs(cx - P.x)); if (Math.abs(cx - P.x) > 0.5 && boxFree(cx, P.y + Math.sign(my) * 2, P)) moveBody(P, nx - P.x, 0); }
    P.anim += dt * (P.running ? 1.8 : 1); P.step = 1 + (((P.anim * 9) | 0) & 3);
    if ((P.step === 1 || P.step === 3) && P.step !== P.lastStep && (P.x !== bx || P.y !== by)) footstep();
    P.lastStep = P.step;
    if (P.running) { P.dust -= dt; if (P.dust <= 0) { P.dust = 0.09; puff(P.x - FV[P.dir][0] * 4, P.y + 1); } }
    // bumping into things: doors, hatches, push blocks
    // blocked along the way you're facing (joystick input always has a little sideways drift)
    const blocked = (P.dir >= 2 ? P.x === bx : P.y === by) && (P.dir >= 2 ? Math.abs(mx) > 0.5 : Math.abs(my) > 0.5);
    if (blocked && P.swing <= 0) {
      const [fx_, fy_] = FV[P.dir];
      const tx = Math.floor((P.x + fx_ * 7) / 16), ty = Math.floor((P.y - 1 + fy_ * 6) / 16);
      const ch = tileAt(room, tx, ty);
      P.bumpT += dt;
      if ((ch === 'L' || ch === 'Y' || ch === 'Z') && P.bumpT > 0.12) { tryOpen(tx, ty, false); P.bumpT = -0.6; }
      const b = blockOn(tx, ty);
      if (b && !b.mv && (fx_ === 0 || fy_ === 0)) {
        P.pushT += dt;
        if (P.pushT > 0.25) { P.pushT = 0; pushBlock(b, fx_, fy_); }
      } else P.pushT = 0;
    } else { P.bumpT = 0; P.pushT = 0; }
  } else { P.step = 0; P.bumpT = 0; P.pushT = 0; }
  if (P.kx || P.ky) {
    moveBody(P, P.kx * dt, P.ky * dt);
    P.kx *= Math.pow(0.002, dt); P.ky *= Math.pow(0.002, dt);
    if (Math.abs(P.kx) < 5) P.kx = 0; if (Math.abs(P.ky) < 5) P.ky = 0;
  }
  P.mdx = P.x - bx0; P.mdy = P.y - by0;
  if (P.inv > 0) P.inv -= dt;
  P.hidden = tileAt(room, Math.floor(P.x / 16), Math.floor((P.y - 2) / 16)) === 'w';
  // blocks sliding
  for (const b of blocks) if (b.mv) {
    b.mv -= dt; const k = Math.max(0, b.mv / 0.15);
    b.x = b.tx * 16 - b.dx * 16 * k; b.y = b.ty * 16 - b.dy * 16 * k;
    if (b.mv <= 0) { b.mv = 0; b.x = b.tx * 16; b.y = b.ty * 16; if (R(room).map[b.ty][b.tx] === 'o') SFX.click(); checkPlates(); }
  }

  // room exits (knockback never carries you through a doorway)
  if (P.kx || P.ky) { P.x = clamp(P.x, 4, PW - 4); P.y = clamp(P.y, 7, PH - 4); }
  else {
    if (P.x < 3 && r.w) return enterRoom(r.w, PW - 10, P.y);
    if (P.x > PW - 3 && r.e) return enterRoom(r.e, 10, P.y);
    if (P.y < 6 && r.n) return enterRoom(r.n, P.x, PH - 6);
    if (P.y > PH - 3 && r.s) return enterRoom(r.s, P.x, 12);
  }
  P.x = clamp(P.x, 2, PW - 2); P.y = clamp(P.y, 5, PH - 2);
  // stairs / doorways
  {
    const tx = Math.floor(P.x / 16), ty = Math.floor((P.y - 3) / 16), ch = tileAt(room, tx, ty);
    if (WARP.has(ch) && fadeT <= 0.05) { doWarp(tx, ty, ch); if (room !== r.id) return; }
  }

  foesTick(dt);
  swingHits();
  beamsTick(dt);
  soundsTick(dt);
  if (mode !== 'play') return;
  // items
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.drop) { it.drop -= dt; if (it.drop <= 0) { items.splice(i, 1); continue; } }
    if (Math.abs(it.x - P.x) < 9 && Math.abs(it.y - (P.y - 4)) < 10) { items.splice(i, 1); gotItem(it); if (mode !== 'play') return; }
  }
  // statue
  if (statue && !statue.fixed) {
    const dx = statue.x - P.x, dy = statue.y - P.y, d = Math.hypot(dx, dy) || 1;
    const [fx_, fy_] = FV[P.dir];
    const looking = (fx_ * dx + fy_ * dy) / d > 0.25;
    if (!looking) {
      const sp = (12 + c * 5 + Math.min(10, curDepth())) * dt;
      const bx = { x: statue.x, y: statue.y };
      const ax = Math.sign(-dx) * Math.min(sp, Math.abs(dx)), ay = Math.sign(-dy) * Math.min(sp, Math.abs(dy));
      if (!solidAt(statue.x + ax, statue.y - 2)) statue.x += ax;
      if (!solidAt(statue.x, statue.y + ay - 2)) statue.y += ay;
      if (bx.x !== statue.x || bx.y !== statue.y) {
        statue.gt -= dt; if (statue.gt <= 0) { statue.gt = 0.35; SFX.grind(); }
        statue.moving = 0.2;
      }
    }
    if (statue.moving > 0) statue.moving -= dt;
    if (d < 11) caught();
  }
  fxTick(dt);

  // ambient glitches
  const vc = visC(), dep = curDepth();
  if (vc >= 1 && !flick && Math.random() < dt * (0.25 + vc * 0.35 + dep * 0.12)) {
    const tx = (Math.random() * RW) | 0, ty = (Math.random() * RH) | 0;
    const alt = vc >= 2 && Math.random() < 0.3 ? 'Q' : GLITCHABLE[(Math.random() * GLITCHABLE.length) | 0];
    flick = { tx, ty, ch: alt, t: rnd(0.08, 0.3 + vc * 0.2) };
  }
  if (flick) { flick.t -= dt; if (flick.t <= 0) flick = null; }
  if (vc >= 2 && Math.random() < dt * 0.15 * vc * (1 + dep * 0.08)) tear = rnd(0.06, 0.2);
  if (tear > 0) tear -= dt;
  if (vc >= 3 && Math.random() < dt * (0.05 + dep * 0.01)) { staticT = 0.12; SFX.static(0.1); }
}
function visC() {
  if (mode === 'files' || !S) return 0;
  const r = room && R(room);
  if (r && r.depth) return r.song === 'mem' ? 1 : r.depth <= 2 ? 2 : 3;
  return C();
}
function pushBlock(b, dx, dy) {
  const nx = b.tx + dx, ny = b.ty + dy;
  if (nx < 1 || ny < 1 || nx > RW - 2 || ny > RH - 2) return;
  const ch = tileAt(room, nx, ny);
  if (SOLID.has(ch) || WARP.has(ch) || blockOn(nx, ny)) return;
  for (const n of npcs) if (Math.abs(n.x - (nx * 16 + 8)) < 12 && Math.abs(n.y - (ny * 16 + 12)) < 12) return;
  b.tx = nx; b.ty = ny; b.dx = dx; b.dy = dy; b.mv = 0.15; SFX.push();
}
function checkPlates() {
  const r = R(room);
  if (r.puzzle !== 'blocks' || S.solved[room]) return;
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (r.map[y][x] === 'o' && !blockOn(x, y)) return;
  solveRoom('Click. Somewhere in the room, bars slide open.');
}
function fxTick(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { const p = fx[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.grav) p.vy += 120 * dt; if (p.t <= 0) fx.splice(i, 1); }
  if (staticT > 0) staticT -= dt; if (flash > 0) flash -= dt; if (shake > 0) shake -= dt;
}

// ---------- render ----------
function render() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (mode === 'cart' || mode === 'files' || mode === 'name' || (mode === 'help' && helpBack === 'files')) { renderAttract(); blit(); return; }
  if (mode === 'boot') { renderBoot(); blit(); return; }
  if (mode === 'card') { renderCard(); blit(); return; }
  if (mode === 'over') { blit(); return; }
  if (mode === 'memory') { renderMemory(); blit(); return; }
  if (!S || !R(room)) { blit(); return; }
  renderWorld();
  if (mode === 'ending') renderEndingFx();
  if (mode === 'map') renderMap();
  if (fadeT > 0) { g.fillStyle = 'rgba(0,0,0,' + Math.min(1, fadeT / 0.35) + ')'; g.fillRect(0, HUD, W, PH); }
  blit();
}
function renderWorld() {
  const c = C(), r = R(room);
  ensureRoomLayer();
  let ox = 0, oy = 0;
  if (shake > 0) { ox = rnd(-2, 2) | 0; oy = rnd(-2, 2) | 0; }
  g.save(); g.translate(ox, oy);
  drawRoomLayer(r);
  if (flick) drawTile(flick.ch, flick.tx, flick.ty, T, r);
  for (const b of blocks) drawBlock(b, r);
  if (room === 'village' && c === 0) drawHuman(g, PAL.statue, 0, 6 * 16 + 8, HUD + 7 * 16 + 9, 0);
  if (room === 'lake' && c >= 1 && Math.sin(T * 0.7) > 0.85) { g.globalAlpha = 0.25; g.fillStyle = '#0a1a33'; g.fillRect(7 * 16 + 9, HUD + 6 * 16, 10, 14); g.globalAlpha = 1; }
  if (room === 'lake' && c >= 3 && mode !== 'ending') {
    const a = 0.25 + 0.2 * Math.sin(T * 3);
    drawHuman(g, PAL.wren, 0, 3 * 16 + 8, HUD + 6 * 16 + 12, 0, Math.random() < 0.05 ? 0.9 : a);
  }
  // spikes (telegraphs, then roots burst up)
  for (const s of spikes) {
    const sx = s.x | 0, sy = (HUD + s.y) | 0;
    if (s.t < s.warn) {
      const a = 0.3 + 0.3 * Math.sin(s.t * 30);
      g.fillStyle = 'rgba(255,170,50,' + (a * 0.7) + ')'; g.fillRect(sx - 7, sy - 1, 14, 4); g.fillRect(sx - 5, sy - 2, 10, 6);
      g.fillStyle = 'rgba(40,22,8,.85)'; g.fillRect(sx - 5, sy, 4, 1); g.fillRect(sx - 1, sy + 1, 3, 1); g.fillRect(sx + 2, sy, 3, 1); g.fillRect(sx - 1, sy - 1, 1, 1); g.fillRect(sx + 1, sy + 2, 1, 1);
      g.fillStyle = 'rgba(255,230,150,' + a + ')'; g.fillRect(sx - 4, sy - 1, 1, 1); g.fillRect(sx + 3, sy + 1, 1, 1);
    } else {
      for (let i = -2; i <= 2; i++) { const h = 11 - Math.abs(i) * 2, px = sx + i * 3; fr('#1a0e06', px - 1, sy + 3 - h, 4, h + 1); fr('#5a3a1c', px, sy + 3 - h + 1, 2, h); fr('#8a6234', px, sy + 3 - h + 1, 1, h - 2); }
    }
  }
  // items
  for (const it of items) drawItem(it);
  // shadows first, then characters sorted by y
  for (const n of npcs) if (!n.ghost) drawShadow(n.x, HUD + n.y + 1);
  if (statue) drawShadow(statue.x, HUD + statue.y + 1);
  for (const f of foes) {
    if (!f.alive) continue;
    if (f.boss) { if (f.type !== 'listener') drawShadow(f.x, HUD + f.y + (f.type === 'miller' ? 12 : 12), true); }
    else if (f.type === 'crawler') drawShadow(f.x, HUD + f.y + 5);
    else if (f.type === 'mimic') drawShadow(f.x, HUD + f.y + 5);
    else { g.globalAlpha = 0.6; drawShadow(f.x, HUD + f.y + 9); g.globalAlpha = 1; }
  }
  const pAlpha = mode === 'ending' && ending.phase >= 2 ? Math.max(0, 1 - ending.t / 4) : 1;
  if (pAlpha > 0.05) drawShadow(P.x, HUD + P.y + 1);
  const list = [];
  for (const n of npcs) list.push({ y: n.y, f: () => drawNpc(n) });
  if (statue) list.push({ y: statue.y, f: () => drawHuman(g, c >= 3 || (mode === 'ending') ? PAL.statueR : PAL.statue, statue.fixed ? 0 : faceToward(statue), statue.x + (statue.moving > 0 ? rnd(-0.6, 0.6) : 0), HUD + statue.y, 0) });
  for (const f of foes) if (f.type === 'crawler' || f.type === 'mimic' || f.boss) list.push({ y: f.y + 4, f: () => drawFoe(f) });
  if (!(P.inv > 0 && ((T * 20) | 0) % 2)) list.push({ y: P.y, f: () => drawPlayer(pAlpha) });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  for (const f of foes) if (f.type === 'wisp' || f.type === 'bat') drawFoe(f);
  for (const b of beams) drawBeam(b);
  for (const s of shots) drawShot(s);
  drawFx();
  if (RC.torches.length) drawTorches();
  g.restore();
  if (RC.shade) g.drawImage(RC.shade, 0, 0);
  if (r.night) { g.fillStyle = 'rgba(5,10,40,.45)'; g.fillRect(0, HUD, W, PH); }
  else if (DUSK[room]) { g.fillStyle = DUSK[room]; g.fillRect(0, HUD, W, PH); }
  if (r.dark) {
    renderDark();
    if (S.lantern) addGlow(GLOW.lantern, P.x, HUD + P.y - 6, 0.9 + Math.sin(T * 6) * 0.05);
    for (const f of foes) if (f.type === 'wisp' || f.type === 'listener') drawFoe(f);
    for (const b of beams) drawBeam(b);
    for (const s of shots) drawShot(s);
    for (const it of items) if (it.id !== 'heart') drawItem(it, true);
  }
  // boss health bar
  const boss = foes.find(f => f.boss && f.alive);
  if (boss) {
    const bx = W / 2 - 54, by = HUD + PH - 11;
    fr('#000', bx - 1, by - 1, 112, 9); fr('#6a5a3a', bx, by, 110, 7); fr('#1a0a10', bx + 1, by + 1, 108, 5);
    fr('#5a1018', bx + 10, by + 2, 97, 3); fr('#e8384f', bx + 10, by + 2, (97 * boss.hp / boss.maxhp) | 0, 3); fr('#ff9aa8', bx + 10, by + 2, (97 * boss.hp / boss.maxhp) | 0, 1);
    // skull
    fr('#e8e0d0', bx + 2, by + 1, 5, 4); fr('#e8e0d0', bx + 3, by + 5, 3, 1); fr('#1a0a10', bx + 3, by + 2, 1, 1); fr('#1a0a10', bx + 5, by + 2, 1, 1);
  }
  renderHud();
}
function drawBlock(b, r) {
  const x = b.x | 0, y = (HUD + b.y) | 0, mill = r.pal === 'mill';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 2, y + 13, 14, 3);
  fr('#16141c', x, y, 16, 15);
  if (mill) {
    fr('#9a7040', x + 1, y + 1, 14, 13); fr('#c09058', x + 1, y + 1, 14, 2); fr('#6a4824', x + 1, y + 12, 14, 2);
    fr('#6a4824', x + 1, y + 6, 14, 1); fr('#6a4824', x + 7, y + 3, 1, 9); fr('#d8a868', x + 2, y + 3, 1, 9);
  } else {
    fr('#7a7a86', x + 1, y + 1, 14, 13); fr('#a6a6b2', x + 1, y + 1, 14, 3); fr('#c8c8d2', x + 2, y + 1, 10, 1); fr('#56565f', x + 1, y + 11, 14, 3);
    fr('#62626c', x + 4, y + 6, 8, 1); fr('#62626c', x + 4, y + 8, 8, 1); fr('#8e8e9a', x + 4, y + 7, 8, 1);
  }
}
function faceToward(s) { const dx = P.x - s.x, dy = P.y - s.y; return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
function drawNpc(n) {
  const c = C();
  let dir = n.dir;
  if (c >= 2 && !n.ghost) dir = faceToward(n);
  if (n.id === 'figure') dir = faceToward(n);
  const pal = PAL[n.pal] || PAL.elder;
  if (n.ghost) {
    const a = n.id === 'figure' ? (0.75 + (Math.random() < 0.08 ? -0.5 : 0)) : 0.55 + 0.25 * Math.sin(T * 2) + (Math.random() < 0.04 ? 0.3 : 0);
    drawHuman(g, pal, dir, n.x + (Math.random() < 0.03 ? rnd(-3, 3) : 0), HUD + n.y, 0, Math.min(1, a));
    return;
  }
  if (c >= 2 && Math.random() < 0.01) { drawHuman(g, PAL.noface, dir, n.x, HUD + n.y, 0); return; }
  drawHuman(g, pal, dir, n.x, HUD + n.y, ((T * 1.2 + n.x) | 0) % 6 === 0 && !n.ghost ? 2 : 0);
}
const DUSK = { graveyard: 'rgba(40,16,70,.26)', cavehill: 'rgba(30,20,50,.16)', oldmill: 'rgba(40,24,30,.14)' };
const DIRANG = [Math.PI / 2, -Math.PI / 2, Math.PI, 0];
function dirFromAng(a) { a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); const q = Math.round(a / (Math.PI / 2)) % 4; return [3, 0, 2, 1][q]; }
function drawPlayer(alpha) {
  const y = mode === 'ending' && ending.phase >= 2 ? P.y + Math.min(10, ending.t * 2.5) : P.y;
  if (P.spin > 0) {
    const k = 1 - P.spin / SPIN, ang = P.spinA + k * Math.PI * 2.15;
    const d = dirFromAng(ang);
    const back = d === 1;
    if (back) drawSpinSword(ang, k, alpha, y);
    drawHuman(g, PAL.player, d, P.x, HUD + y, 0, alpha, true);
    if (!back) drawSpinSword(ang, k, alpha, y);
    return;
  }
  const swingNow = P.swing > 0;
  const holding = !swingNow && P.charging && P.chargeT > 0.12;
  if ((swingNow || holding) && P.dir === 1) drawSwing(alpha, y, holding);
  if (swingNow || holding) {
    drawHuman(g, PAL.player, P.dir, P.x, HUD + y, holding ? P.step : 0, alpha, true);
    if (P.dir !== 1) drawSwing(alpha, y, holding);
    return;
  }
  drawHuman(g, PAL.player, P.dir, P.x, HUD + y, P.step, alpha);
  if (P.hidden) { g.fillStyle = '#5cbc4c'; for (let i = 0; i < 5; i++) g.fillRect(P.x - 5 + i * 2, HUD + y - 5, 1, 5); g.fillStyle = '#86d064'; for (let i = 0; i < 5; i++) g.fillRect(P.x - 5 + i * 2, HUD + y - 6, 1, 1); }
}
// a pixel sword from a hand position along an angle; arm pixels lead into the hilt
function drawSword(sx, sy, ang, alpha, opts) {
  opts = opts || {};
  const ca = Math.cos(ang), sa = Math.sin(ang), arm = opts.arm === undefined ? 4 : opts.arm;
  g.globalAlpha = alpha === undefined ? 1 : alpha;
  const pts = []; for (let i = 0; i <= arm + 12; i++) pts.push([Math.round(sx + ca * i), Math.round(sy + sa * i)]);
  g.fillStyle = '#15121c';
  for (let i = 0; i < pts.length; i++) g.fillRect(pts[i][0] - 1, pts[i][1] - 1, i > arm + 2 ? 3 : 4, i > arm + 2 ? 3 : 4);
  const gx = sx + ca * (arm + 2), gy = sy + sa * (arm + 2);
  for (const s of [-3, -2, 2, 3]) g.fillRect(Math.round(gx - sa * s) - 1, Math.round(gy + ca * s) - 1, 3, 3);
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i];
    if (i < arm - 1) g.fillStyle = PAL.player.c; else if (i < arm + 1) g.fillStyle = PAL.player.s; else if (i < arm + 2) g.fillStyle = '#6b4320'; else if (i < arm + 3) g.fillStyle = '#e8b830';
    else g.fillStyle = opts.flash ? (((T * 20) | 0) % 2 ? '#ffffff' : '#9fe8ff') : (i === pts.length - 1 ? '#ffffff' : '#c9d6e2');
    g.fillRect(px, py, 2, 2);
    if (i >= arm + 3 && !opts.flash) { g.fillStyle = '#eef6ff'; g.fillRect(px, py, 1, 1); }
  }
  g.fillStyle = '#e8b830'; for (const s of [-2, 2]) g.fillRect(Math.round(gx - sa * s), Math.round(gy + ca * s), 2, 2);
  if (opts.glint !== undefined) { const i = arm + 3 + Math.floor(opts.glint * 9); if (pts[i]) { g.fillStyle = '#ffffff'; g.fillRect(pts[i][0] - 1, pts[i][1], 4, 1); g.fillRect(pts[i][0], pts[i][1] - 1, 1, 4); } }
  g.globalAlpha = 1;
  return pts[pts.length - 1];
}
function handPos(dir, y) { return [P.x + (dir === 2 ? -3 : dir === 3 ? 3 : (dir === 0 ? 4 : -4)), HUD + y - 6]; }
function drawSwing(alpha, y, holding) {
  const [fx_, fy_] = FV[P.dir];
  const base = Math.atan2(fy_, fx_);
  const [sx, sy] = handPos(P.dir, y);
  if (holding) {
    const tip = drawSword(sx, sy, base, alpha, { glint: P.charged ? undefined : ((T * 2.2) % 1), flash: P.charged });
    if (P.charged && Math.random() < 0.5) fx.push({ x: tip[0] + rnd(-3, 3), y: tip[1] - HUD + rnd(-3, 3), vx: 0, vy: -8, t: 0.25, max: 0.25, col: '#ffffff', kind: 'spark' });
    return;
  }
  const k = 1 - P.swing / SWING;
  const e = k < 0.25 ? -0.25 : k < 0.6 ? ((k - 0.25) / 0.35) : 1;
  const sgn = P.dir === 2 || P.dir === 1 ? -1 : 1;
  const ang = base + (-1.25 + e * 2.5) * sgn;
  drawSword(sx, sy, ang, alpha);
  if (k > 0.2 && k < 0.8) {
    for (let t = 1; t <= 6; t++) {
      const a2 = ang - t * 0.16 * sgn;
      g.fillStyle = 'rgba(255,255,255,' + (0.55 - t * 0.08) + ')';
      g.fillRect(Math.round(sx + Math.cos(a2) * 13), Math.round(sy + Math.sin(a2) * 13), 2, 2);
      g.fillRect(Math.round(sx + Math.cos(a2) * 10), Math.round(sy + Math.sin(a2) * 10), 1, 1);
    }
  }
}
function drawSpinSword(ang, k, alpha, y) {
  const cx = P.x, cy = HUD + y - 6;
  // swept arc behind the blade
  for (let t = 1; t <= 14; t++) {
    const a2 = ang - t * 0.13;
    const al = Math.max(0, 0.6 - t * 0.04) * (k < 0.9 ? 1 : (1 - k) * 10);
    g.fillStyle = 'rgba(210,245,255,' + al + ')';
    g.fillRect(Math.round(cx + Math.cos(a2) * 15) - 1, Math.round(cy + Math.sin(a2) * 15) - 1, 3, 3);
    g.fillStyle = 'rgba(255,255,255,' + al * 0.8 + ')';
    g.fillRect(Math.round(cx + Math.cos(a2) * 11), Math.round(cy + Math.sin(a2) * 11), 2, 2);
  }
  drawSword(cx + Math.cos(ang) * 2, cy + Math.sin(ang) * 2, ang, alpha, { arm: 4 });
}
function drawBeam(b) {
  const x = b.x, y = HUD + b.y, ca = Math.cos(b.ang), sa = Math.sin(b.ang);
  const fade = Math.min(1, (b.life - b.t) * 4);
  addGlow(GLOW.beam, x, y, 0.7 * fade);
  g.globalAlpha = fade;
  for (let i = -7; i <= 4; i++) {
    const px = Math.round(x + ca * i), py = Math.round(y + sa * i);
    g.fillStyle = i < -3 ? 'rgba(170,225,255,.55)' : '#bfeaff'; g.fillRect(px - 1, py - 1, 3, 3);
  }
  g.fillStyle = '#ffffff';
  for (let i = -4; i <= 5; i++) g.fillRect(Math.round(x + ca * i), Math.round(y + sa * i), 1, 1);
  for (const s of [-2, 2]) g.fillRect(Math.round(x + ca * 3 - sa * s), Math.round(y + sa * 3 + ca * s), 1, 1);
  g.globalAlpha = 1;
}
// ---- foes as cached, outlined sprites ----
const WISP_ROWS = ['...oooo...', '..oiiiio..', '.oiwwwwio.', 'oiwwwwwwio', 'oiwewwewio', 'oiwwwwwwio', 'oiiwwwwiio', '.oiiiiiio.'];
const WISP_TAIL = [['.oio.oio..', '..o...o...'], ['..oio.oio.', '...o...o..']];
const BAT_UP = ['w.............w', 'ww...........ww', 'wmw..b...b..wmw', 'wmmw.bbbbb.wmmw', '.wmmbbebebbmmw.', '..wmmbbbbbmmw..', '...w.bbbbb.w...', '.......b.......'];
const BAT_DN = ['.....b...b.....', '.....bbbbb.....', '..wwbbebebbww..', '.wmmmbbbbbmmmw.', 'wmmmmwbbbwmmmmw', 'wm.mw.....wm.mw', 'w...w.....w...w', '...............'];
const CRAWL = [
  ['l..bbbbbb..l', '.lbhhhbbbbl.', '..bhbbbbbb..', 'llbbbbbbbbll', '..bbbbbbbb..', '.lbbbbbbbbl.', 'l..bbbbbb..l', '....bbbb....'],
  ['.l.bbbbbb.l.', 'l.bhhhbbbb.l', '..bhbbbbbb..', '.lbbbbbbbbl.', 'l.bbbbbbbb.l', '..bbbbbbbb..', '.l.bbbbbb.l.', '....bbbb....']];
function drawFoe(f) {
  const hit = f.fl > 0 && ((T * 30) | 0) % 2 === 0;
  const x = f.x | 0, y = (HUD + f.y) | 0;
  if (f.type === 'wisp') {
    const yy = (y + Math.sin(f.t * 5) * 1.5) | 0, fr_ = ((f.t * 6) | 0) & 1;
    addGlow(GLOW.wisp, x, yy, 0.55 + Math.sin(f.t * 7) * 0.1);
    const e = spr('wisp' + fr_, 10, 10, c => art(c, 0, 0, WISP_ROWS.concat(WISP_TAIL[fr_]), { o: '#5ab0e8', i: '#a8e4ff', w: '#ecfcff', e: '#103050' }), [20, 60, 110]);
    blitSpr(e, x - 5, yy - 5, hit);
    return;
  }
  if (f.type === 'bat') {
    const flap = ((f.t * 14) | 0) % 2, gl = Math.random() < 0.15;
    if (gl) { g.fillStyle = 'rgba(255,0,220,.6)'; g.fillRect(x - 6 + 2, y - 2, 12, 3); g.fillStyle = 'rgba(0,229,255,.6)'; g.fillRect(x - 6 - 2, y - 1, 12, 3); }
    const e = spr('bat' + flap, 15, 8, c => art(c, 0, 0, flap ? BAT_UP : BAT_DN, { w: '#2a1036', m: '#6a3a8a', b: '#3e1c52', e: '#ff3a6a' }));
    blitSpr(e, x - 7, y - 4, hit);
    return;
  }
  if (f.type === 'crawler') {
    const warn = f.st === 'warn';
    const leg = ((f.t * (f.st === 'rush' ? 24 : 8)) | 0) % 2;
    const e = spr('crawl' + leg + (warn ? 'w' : ''), 12, 8, c => art(c, 0, 0, CRAWL[leg], warn ? { b: '#7a2020', h: '#d86060', l: '#2a1010' } : { b: '#24242c', h: '#62627a', l: '#16161c' }));
    blitSpr(e, x - 6, y - 4, hit);
    if (!hit) { g.fillStyle = warn ? '#ffef5a' : '#e8e8e8'; g.fillRect(x - 2 + f.dx * 2, y - 1 + f.dy * 2, 1, 1); g.fillRect(x + 1 + f.dx * 2, y - 1 + f.dy * 2, 1, 1); }
    return;
  }
  if (f.type === 'mimic') {
    if (hit) { drawHuman(g, PAL.mimic, f.dir || 0, f.x, HUD + f.y + 4, 0, 1, false, true); return; }
    drawHuman(g, PAL.mimic, f.dir || 0, f.x + (Math.random() < 0.04 ? rnd(-2, 2) : 0), HUD + f.y + 4, f.moving ? 1 + (((T * 8) | 0) % 4) : 0, 0.92);
    if (Math.random() < 0.05) { g.fillStyle = 'rgba(255,40,40,.5)'; g.fillRect(x - 6, y - 8 + ((Math.random() * 12) | 0), 12, 1); }
    return;
  }
  if (f.type === 'rooted') {
    const sw = Math.round(Math.sin(T * 2) * 2), rage = f.hp <= f.maxhp / 2;
    const e = spr('rooted' + sw, 40, 42, c => drawRooted(c, sw));
    blitSpr(e, x - 20, y - 28, hit);
    if (!hit) {
      const ec = rage ? '#ff4a3a' : '#f0d040';
      addGlow(GLOW.gold, x - 4, y - 7, rage ? 0.7 : 0.45); addGlow(GLOW.gold, x + 4, y - 7, rage ? 0.7 : 0.45);
      fr(ec, x - 5, y - 8, 3, 2); fr(ec, x + 2, y - 8, 3, 2); fr('#fff8c0', x - 5, y - 8, 1, 1); fr('#fff8c0', x + 2, y - 8, 1, 1);
    }
    return;
  }
  if (f.type === 'listener') {
    const a = f.alpha === undefined ? 1 : f.alpha;
    addGlow(GLOW.listen, x, y, a * 0.8); g.globalAlpha = a;
    const e = spr('listener', 38, 34, c => drawListener(c));
    blitSpr(e, x - 19, y - 16, hit);
    if (!hit) {
      const ex = clamp((P.x - f.x) / 20, -4, 4) | 0, ey = clamp((P.y - 6 - f.y) / 20, -2, 2) | 0;
      const rage = f.hp <= f.maxhp / 2;
      fr('#1a0a10', x - 5 + ex, y - 5 + ey, 10, 9); fr(rage ? '#a01818' : '#2a4a7a', x - 4 + ex, y - 4 + ey, 8, 7); fr(rage ? '#d84040' : '#4a7ab0', x - 4 + ex, y - 4 + ey, 8, 2);
      fr('#000', x - 2 + ex, y - 2 + ey, 4, 3); fr('#ffffff', x - 3 + ex, y - 3 + ey, 2, 1);
    }
    g.fillStyle = '#8a8278'; for (let i = 0; i < 5; i++) { const ly = y + 15 + (((T * 6 + i) | 0) % 2); fr('#2a2420', x - 13 + i * 6, ly - 1, 4, 6); fr('#9a9288', x - 12 + i * 6, ly, 2, 4); }
    g.globalAlpha = 1;
    return;
  }
  if (f.type === 'miller') {
    const step = ((T * 6) | 0) % 2;
    const e = spr('miller' + step, 26, 36, c => drawMiller(c, step));
    blitSpr(e, x - 13, y - 23, hit);
    if (!hit) { fr('#111', x - 3, y - 16, 2, 1); fr('#111', x + 1, y - 16, 2, 1); if (f.hp <= f.maxhp / 2) { fr('#c01818', x - 3, y - 16, 1, 1); fr('#c01818', x + 2, y - 16, 1, 1); } }
    return;
  }
}
function drawRooted(c, sw) {
  const P_ = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const X = 20, Y = 28;
  // roots
  P_('#2e1c0c', X - 16, Y + 8, 32, 4); P_('#2e1c0c', X - 19, Y + 10, 6, 3); P_('#2e1c0c', X + 13, Y + 10, 6, 3);
  P_('#4a3018', X - 15, Y + 8, 30, 2);
  // antlers
  P_('#3a2614', X - 14 + sw, Y - 22, 2, 12); P_('#3a2614', X - 18 + sw, Y - 22, 6, 2); P_('#3a2614', X - 17 + sw, Y - 28, 2, 7); P_('#3a2614', X - 13 + sw, Y - 27, 2, 5);
  P_('#3a2614', X + 12 - sw, Y - 22, 2, 12); P_('#3a2614', X + 12 - sw, Y - 22, 6, 2); P_('#3a2614', X + 15 - sw, Y - 28, 2, 7); P_('#3a2614', X + 11 - sw, Y - 27, 2, 5);
  P_('#5a3e22', X - 14 + sw, Y - 22, 1, 10); P_('#5a3e22', X + 12 - sw, Y - 22, 1, 10);
  // body
  P_('#4a3018', X - 9, Y - 14, 18, 24); P_('#4a3018', X - 12, Y + 2, 24, 8);
  for (let i = 0; i < 5; i++) { P_('#2e1c0c', X - 8 + i * 4, Y - 12, 1, 21); P_('#6e4a28', X - 7 + i * 4, Y - 12, 1, 18); }
  // arms / branches
  P_('#3a2614', X - 13, Y - 8, 4, 12); P_('#3a2614', X + 9, Y - 8, 4, 12); P_('#3a2614', X - 15, Y + 2, 3, 3); P_('#3a2614', X + 12, Y + 2, 3, 3);
  // face hollow
  P_('#1a0e06', X - 7, Y - 11, 14, 7); P_('#000000', X - 6, Y - 10, 4, 4); P_('#000000', X + 2, Y - 10, 4, 4);
  P_('#000000', X - 3, Y - 1, 6, 5); P_('#1a0e06', X - 4, Y - 2, 8, 1);
  // moss
  P_('#4f7f2c', X - 9, Y - 14, 6, 2); P_('#4f7f2c', X + 4, Y + 4, 5, 2); P_('#6aa040', X - 8, Y - 14, 3, 1);
}
function drawListener(c) {
  const P_ = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const X = 19, Y = 16;
  P_('#a89f94', X - 14, Y - 12, 28, 24); P_('#a89f94', X - 11, Y - 15, 22, 30); P_('#a89f94', X - 17, Y - 8, 34, 16);
  P_('#c9c2b8', X - 13, Y - 11, 25, 21); P_('#c9c2b8', X - 10, Y - 14, 19, 27); P_('#c9c2b8', X - 16, Y - 7, 31, 13);
  P_('#e6e0d6', X - 10, Y - 13, 8, 2); P_('#e6e0d6', X - 14, Y - 6, 2, 6);
  // eyelids + sclera
  P_('#6a5f56', X - 11, Y - 9, 22, 16); P_('#efe9df', X - 9, Y - 7, 18, 12); P_('#d8d0c4', X - 9, Y + 3, 18, 2);
  // veins
  P_('#c06a6a', X - 9, Y - 2, 3, 1); P_('#c06a6a', X + 6, Y + 1, 3, 1); P_('#c06a6a', X + 7, Y - 5, 2, 1);
  // wrinkles
  P_('#8a8278', X - 12, Y - 12, 6, 1); P_('#8a8278', X + 6, Y + 11, 6, 1); P_('#8a8278', X - 15, Y + 3, 3, 1);
}
function drawMiller(c, step) {
  const P_ = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const X = 13, Y = 23;
  // legs
  P_('#2a1c10', X - 5, Y + 9, 4, 4 - step); P_('#2a1c10', X + 1, Y + 9, 4, 3 + step);
  // coat
  P_('#4a3020', X - 6, Y - 8, 12, 18); P_('#4a3020', X - 8, Y - 4, 16, 10); P_('#36220f', X + 3, Y - 8, 3, 18); P_('#6a4a30', X - 6, Y - 8, 2, 17);
  // flour apron
  P_('#d8d0c0', X - 4, Y - 2, 8, 10); P_('#f0ead8', X - 4, Y - 2, 8, 2); P_('#b8b0a0', X - 1, Y + 2, 1, 5);
  // head + mask
  P_('#efe9df', X - 5, Y - 20, 10, 12); P_('#efe9df', X - 4, Y - 21, 8, 1); P_('#d0c8b8', X + 2, Y - 20, 3, 12);
  P_('#b8b0a0', X - 1, Y - 13, 2, 1); P_('#8a8278', X - 4, Y - 11, 8, 1); P_('#8a8278', X + 1, Y - 20, 1, 4); P_('#8a8278', X + 2, Y - 16, 1, 3);
  // hat
  P_('#2a1c10', X - 6, Y - 23, 12, 3); P_('#3a2a18', X - 4, Y - 25, 8, 2);
  // sack of flour
  P_('#c9b27a', X + 7, Y - 6, 7, 9); P_('#a8905a', X + 8, Y - 7, 5, 2); P_('#e0cc96', X + 8, Y - 5, 2, 6);
}
function drawShot(s) {
  const x = s.x | 0, y = (HUD + s.y) | 0;
  if (s.kind === 'sickle') { const a = s.t * 14; for (let i = 0; i < 5; i++) { const aa = a + i * 0.45; fr('#1a1a20', ((x + Math.cos(aa) * 4) | 0) - 1, ((y + Math.sin(aa) * 4) | 0) - 1, 4, 4); } for (let i = 0; i < 5; i++) { const aa = a + i * 0.45; fr(i === 4 ? '#ffffff' : '#c8c8d4', (x + Math.cos(aa) * 4) | 0, (y + Math.sin(aa) * 4) | 0, 2, 2); } fr('#6b4320', x - 1, y - 1, 2, 2); return; }
  addGlow(GLOW.wisp, x, y, 0.5);
  fr('#1a3050', x - 3, y - 3, 6, 6); fr('#cfe8ff', x - 2, y - 2, 4, 4); fr('#ffffff', x - 2, y - 2, 2, 2);
}
const ITEM_SPR = {
  key: c => { c.fillStyle = '#e8c23a'; c.fillRect(0, 1, 4, 4); c.fillRect(4, 2, 6, 2); c.fillRect(7, 4, 1, 2); c.fillRect(9, 4, 1, 2); c.fillStyle = '#fff0a0'; c.fillRect(0, 1, 3, 1); c.fillRect(4, 2, 5, 1); c.fillStyle = '#a8801a'; c.fillRect(1, 4, 3, 1); c.clearRect(1, 2, 2, 2); },
  fkey: c => { c.fillStyle = '#9fd3ff'; c.fillRect(0, 1, 4, 4); c.fillRect(4, 2, 6, 2); c.fillRect(7, 4, 1, 2); c.fillRect(9, 4, 1, 2); c.fillStyle = '#ffffff'; c.fillRect(0, 1, 3, 1); c.fillRect(4, 2, 5, 1); c.fillStyle = '#4a8ac0'; c.fillRect(1, 4, 3, 1); c.clearRect(1, 2, 2, 2); },
  page: c => { c.fillStyle = '#efe6cf'; c.fillRect(0, 0, 8, 10); c.fillStyle = '#d0c4a4'; c.fillRect(6, 0, 2, 2); c.fillRect(0, 9, 8, 1); c.fillStyle = '#7a6a4a'; for (let i = 0; i < 3; i++) c.fillRect(1, 2 + i * 2, 5 - (i === 2 ? 2 : 0), 1); c.fillStyle = '#c03030'; c.fillRect(1, 8, 2, 1); },
  lantern: c => { c.fillStyle = '#4a4a52'; c.fillRect(2, 0, 4, 1); c.fillRect(1, 1, 6, 2); c.fillRect(0, 9, 8, 2); c.fillStyle = '#ffd36a'; c.fillRect(1, 3, 6, 6); c.fillStyle = '#fff4c0'; c.fillRect(3, 4, 2, 4); c.fillStyle = '#4a4a52'; c.fillRect(1, 3, 1, 6); c.fillRect(6, 3, 1, 6); },
  hc: c => { const rows = ['.xxx.xxx.', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....']; rows.forEach((row, j) => { for (let i = 0; i < 9; i++) if (row[i] === 'x') { c.fillStyle = (j < 2 && i > 0 && i < 3) ? '#ffc0c8' : (i > 5 || j > 4) ? '#b0182c' : '#e8384f'; c.fillRect(i, j, 1, 1); } }); },
  piece: c => { c.fillStyle = '#e8b830'; c.fillRect(2, 0, 3, 10); c.fillRect(0, 2, 7, 6); c.fillStyle = '#fff3b0'; c.fillRect(2, 2, 2, 3); c.fillStyle = '#a87a20'; c.fillRect(5, 3, 2, 5); c.fillRect(3, 8, 2, 2); },
  heart: c => { const rows = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...']; rows.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === 'x') { c.fillStyle = (j === 1 && i === 1) || (j === 0 && i === 1) ? '#ffc0c8' : (i >= 5 || j >= 4) ? '#b0182c' : '#e8384f'; c.fillRect(i, j, 1, 1); } }); },
  heartE: c => { const rows = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...']; rows.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === 'x') { c.fillStyle = '#3a1420'; c.fillRect(i, j, 1, 1); } }); },
};
const ITEM_SZ = { key: [10, 6], fkey: [10, 6], page: [8, 10], lantern: [8, 11], hc: [9, 8], piece: [7, 10], heart: [7, 6], heartE: [7, 6] };
function itemSpr(id) { const [w, h] = ITEM_SZ[id]; return spr('it_' + id, w, h, ITEM_SPR[id]); }
function drawItem(it, glow) {
  const bob = Math.sin(T * 4) * 1.5;
  const x = it.x | 0, y = (HUD + it.y + bob) | 0;
  if (it.id === 'heart') { if (it.drop && it.drop < 1.5 && ((T * 10) | 0) % 2) return; drawShadow(it.x, HUD + it.y + 5); blitSpr(itemSpr('heart'), (it.x - 3) | 0, (HUD + it.y - 3 + bob * 0.5) | 0); return; }
  if (it.hidden && !glow && !(Math.sin(T * 2.2) > 0.6) && !S.taken[it.uid]) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 1, y - 1, 2, 2); return; }
  const id = ITEM_SZ[it.id] ? it.id : null;
  if (!id) return;
  drawShadow(it.x, HUD + it.y + 7);
  const glowC = it.id === 'fkey' ? GLOW.wisp : it.id === 'hc' ? null : GLOW.gold;
  if (glowC) addGlow(glowC, x, y, 0.5 + Math.sin(T * 5) * 0.15);
  if (it.id === 'hc') { g.fillStyle = 'rgba(255,90,110,.25)'; g.fillRect(x - 7, y - 7, 14, 14); }
  const [w, h] = ITEM_SZ[id];
  blitSpr(itemSpr(id), x - (w >> 1), y - (h >> 1));
  if (((T * 3 + it.x) | 0) % 5 === 0) { fr('#ffffff', x + (w >> 1), y - (h >> 1) - 1, 1, 3); fr('#ffffff', x + (w >> 1) - 1, y - (h >> 1), 3, 1); }
}
function drawShard(x, y) { blitSpr(itemSpr('piece'), (x | 0) - 3, (y | 0) - 5); }
function drawHeart(x, y, full) { blitSpr(itemSpr(full ? 'heart' : 'heartE'), x | 0, y | 0); }
function drawFx() {
  for (const p of fx) {
    const life = p.max ? Math.max(0, p.t / p.max) : 1;
    if (p.puff) { g.globalAlpha = Math.max(0, p.t / 0.35) * 0.8; g.fillStyle = p.col; g.fillRect((p.x - 1) | 0, (HUD + p.y - 1) | 0, 3, 3); g.globalAlpha = 1; }
    else if (p.kind === 'spark') { g.globalAlpha = life; g.fillStyle = p.col; const x = p.x | 0, y = (HUD + p.y) | 0; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.globalAlpha = 1; }
    else if (p.kind === 'ring') { g.globalAlpha = life * 0.8; g.strokeStyle = p.col; g.lineWidth = 1; g.beginPath(); g.arc(p.x, HUD + p.y, (1 - life) * p.r + 2, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
    else if (p.kind === 'smoke') { g.globalAlpha = life * 0.7; g.fillStyle = p.col; const s = 2 + ((1 - life) * 4) | 0; g.fillRect((p.x - s / 2) | 0, (HUD + p.y - s / 2) | 0, s, s); g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(10,8,20,.5)'; g.fillRect(p.x | 0, ((HUD + p.y) | 0) + 1, 2, 2); g.fillStyle = p.col; g.fillRect(p.x | 0, (HUD + p.y) | 0, 2, 2); }
  }
}
function renderDark() {
  dg.globalCompositeOperation = 'source-over';
  dg.fillStyle = '#000'; dg.fillRect(0, 0, PW, PH);
  dg.globalCompositeOperation = 'destination-out';
  const rad = (S.lantern ? 74 : 36) + Math.sin(T * 6) * 1.5;
  const gr = dg.createRadialGradient(P.x, P.y - 6, 6, P.x, P.y - 6, rad);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  dg.fillStyle = gr; dg.beginPath(); dg.arc(P.x, P.y - 6, rad, 0, Math.PI * 2); dg.fill();
  // beams light the dark a little
  for (const b of beams) { dg.beginPath(); dg.arc(b.x, b.y, 14, 0, Math.PI * 2); dg.fillStyle = 'rgba(0,0,0,.7)'; dg.fill(); }
  g.drawImage(dark, 0, HUD);
}
// ---- HUD: framed hearts, key box, bell pieces, a tiny pixel font ----
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', '/': '001001010100100', '?': '110001010000010', '-': '000000111000000', '.': '000000000000010', '∞': '000000101010101', '+': '000010111010000',
};
function pfWidth(s) { return s.length * 4 - 1; }
function pfText(ctx, s, x, y, col, sh) {
  s = String(s).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const gl = FONT[s[i]]; if (!gl) continue;
    for (let j = 0; j < 15; j++) if (gl[j] === '1') {
      const px = x + i * 4 + (j % 3), py = y + ((j / 3) | 0);
      if (sh) { ctx.fillStyle = sh; ctx.fillRect(px + 1, py + 1, 1, 1); }
      ctx.fillStyle = col; ctx.fillRect(px, py, 1, 1);
    }
  }
}
const HUDC = mkCanvas(W, HUD), HUDG = HUDC.getContext('2d');
let hudKey = '';
function frameBox(ctx, x, y, w, h) {
  ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#8a7650'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#c8b07a'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = '#16121e'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}
function renderHud() {
  const r = R(room), c = C();
  let label = S.name;
  if (visC() >= 2 && Math.sin(T * 0.9) > 0.97) label = 'WREN';
  if (r.depth >= 5 && Math.random() < 0.004 * r.depth) label = timeStr();
  const key = [S.hearts, S.maxHearts, r.dungeon ? (S.keys[r.area] || 0) : '-', r.gen ? (S.fkeys[r.area] ? 1 : 0) : '-', c, label, r.depth || 0, S.deep ? 1 : 0, r.depth >= 7 && Math.random() < 0.03 ? 1 : 0].join('|');
  if (key !== hudKey) {
    hudKey = key;
    const h = HUDG, keepG = g; g = h;
    h.clearRect(0, 0, W, HUD);
    h.fillStyle = '#0d0a14'; h.fillRect(0, 0, W, HUD);
    h.fillStyle = '#1c1628'; h.fillRect(0, 0, W, 1);
    h.fillStyle = '#3a2f52'; h.fillRect(0, HUD - 2, W, 1); h.fillStyle = '#000'; h.fillRect(0, HUD - 1, W, 1);
    // hearts in a frame
    frameBox(h, 2, 2, S.maxHearts * 8 + 4, 11);
    for (let i = 0; i < S.maxHearts; i++) drawHeart(5 + i * 8, 5, i < S.hearts);
    let hx = S.maxHearts * 8 + 12;
    if (r.dungeon || r.gen) {
      frameBox(h, hx, 2, r.dungeon ? 24 : 15, 11);
      blitSpr(itemSpr(r.gen ? 'fkey' : 'key'), hx + 3, 5);
      if (r.gen && !S.fkeys[r.area]) { h.fillStyle = 'rgba(13,10,20,.7)'; h.fillRect(hx + 2, 3, 11, 9); }
      if (r.dungeon) pfText(h, 'x' + (S.keys[r.area] || 0), hx + 14, 5, '#f0e6c8', '#000');
    }
    // name
    const lw = pfWidth(label);
    pfText(h, label, Math.round(W / 2 + 8 - lw / 2), 5, '#a8a0bc', '#000');
    // bell pieces
    frameBox(h, W - 40, 2, 37, 11);
    for (let i = 0; i < 3; i++) {
      const x = W - 33 + i * 11, y = 7;
      if (i < c) { blitSpr(itemSpr('piece'), x - 3, y - 4); }
      else { h.fillStyle = '#3a3226'; h.fillRect(x - 1, y - 3, 3, 8); h.fillRect(x - 3, y - 1, 7, 4); }
    }
    if (r.depth) {
      const s = (S.deep ? '∞' : '') + 'B' + r.depth, red = key.endsWith('|1');
      pfText(h, s, W - 45 - pfWidth(s), 5, red ? '#d64541' : '#9fd3ff', '#000');
    }
    g = keepG;
  }
  g.drawImage(HUDC, 0, 0);
  // the last heart pulses when you're low
  if (lowHP() && S.hearts > 0) { const a = 0.35 + 0.35 * Math.sin(T * 9); g.globalAlpha = a; g.fillStyle = '#ffffff'; const i = S.hearts - 1; g.fillRect(5 + i * 8, 6, 7, 3); g.globalAlpha = 1; }
}
// ---------- the map ----------
function renderMap() {
  g.fillStyle = 'rgba(0,0,0,.86)'; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const r = R(room), area = r.area;
  const title = area === 'over' ? 'MILLBROOK VALLEY' : r.dungeon ? r.name : r.gen ? (S.deep ? 'THE DEEP · B' : 'THE UNDERNEATH · B') + r.depth : area === 'void' ? corrupt('???', 0.5) : r.name;
  g.fillStyle = '#ddd'; g.font = 'bold 10px monospace'; g.fillText(title, W / 2, 11);
  let rooms;
  if (r.gen) rooms = Object.values(SHW.genFloor(S.seed, r.depth, S.deep).rooms);
  else rooms = Object.values(ROOMS).filter(o => o.area === area);
  const shown = rooms.filter(o => S.disc[o.id]);
  let minx = 99, maxx = -99, miny = 99, maxy = -99;
  for (const o of rooms) { minx = Math.min(minx, o.gx); maxx = Math.max(maxx, o.gx); miny = Math.min(miny, o.gy); maxy = Math.max(maxy, o.gy); }
  const cols = maxx - minx + 1, rows = maxy - miny + 1;
  const cw = Math.min(48, Math.floor(232 / cols)), ch = Math.min(32, Math.floor(130 / rows));
  const ox = Math.round(W / 2 - cols * cw / 2), oy = 22 + Math.round((134 - rows * ch) / 2);
  const pos = o => [ox + (o.gx - minx) * cw, oy + (o.gy - miny) * ch];
  // connections
  g.fillStyle = '#555';
  for (const o of shown) {
    const [x, y] = pos(o);
    if (o.e && S.disc[o.e]) g.fillRect(x + cw - 4, y + ch / 2 - 1, 6, 3);
    if (o.s && S.disc[o.s]) g.fillRect(x + cw / 2 - 1, y + ch - 4, 3, 6);
  }
  for (const o of shown) {
    const [x, y] = pos(o), here = o.id === room;
    g.fillStyle = here ? '#1f9e8f' : o.boss ? '#3a1a1e' : '#26262c'; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    g.strokeStyle = '#555'; g.strokeRect(x + 2.5, y + 2.5, cw - 5, ch - 5);
    g.font = '6px monospace'; g.fillStyle = here ? '#fff' : '#9a9a9a';
    if (area === 'over') {
      const nm = o.name.replace(/^THE /, '').replace("WOODCUTTER'S HUT", 'HUT');
      const words = nm.split(' ');
      if (words.length > 1 && nm.length > 8) { g.fillText(words[0].slice(0, 9), x + cw / 2, y + ch / 2 - 4); g.fillText(words.slice(1).join(' ').slice(0, 9), x + cw / 2, y + ch / 2 + 3); }
      else g.fillText(nm.slice(0, 9), x + cw / 2, y + ch / 2 - 1);
    }
    // markers
    const mk = [];
    if (o.id === 'hollowgate' || o.id === 'cavehill' || o.id === 'oldmill') mk.push(['#c86cff', S.bosses[{ hollowgate: 'hollow', cavehill: 'cave', oldmill: 'mill' }[o.id]] ? '✓' : '◆']);
    if (o.id === 'lake') mk.push(['#e8b830', S.flags.bellRung ? '▼' : '◎']);
    if (o.boss) mk.push(['#e8384f', S.bosses[o.area] ? '✓' : '☠']);
    if ((o.items || []).some(i => (i.id === 'key' || i.id === 'fkey') && !S.taken[i.uid])) mk.push(['#e8c23a', 'K']);
    if (o.hatch) mk.push(['#9fd3ff', S.opened[o.id + ':hatch'] ? '▼' : '▣']);
    if (o.memGate) mk.push(['#9fd3ff', S.flags[o.memGate] ? '▼' : '▣']);
    if (o.map.some(row => row.includes('<'))) mk.push(['#aaa', '▲']);
    if (o.puzzle && !S.solved[o.id]) mk.push(['#6fd08a', '?']);
    g.font = '7px monospace';
    mk.slice(0, 3).forEach(([col, s], i) => { g.fillStyle = col; g.fillText(s, x + cw / 2 + (i - (Math.min(3, mk.length) - 1) / 2) * 8, y + ch - 7); });
    if (here && ((T * 3) | 0) % 2) { g.fillStyle = '#d64541'; g.fillRect(x + 4, y + 4, 4, 4); }
  }
  // footer
  g.font = '7px monospace'; g.fillStyle = '#bbb';
  let info = 'PIECES ' + C() + '/3   PAGES ' + pagesFound() + '/8   HEARTS ' + S.maxHearts;
  if (r.dungeon) info = 'KEYS ' + (S.keys[area] || 0) + '   PIECES ' + C() + '/3   ' + (S.lantern ? 'LANTERN ✓' : '');
  if (r.gen) info = 'FLOOR KEY ' + (S.fkeys[area] ? '✓' : '—') + '   ROOMS ' + shown.length + '/' + rooms.length + '   DEEPEST B' + (S.floor || r.depth);
  g.fillText(info, W / 2, H - 22);
  g.fillStyle = '#777'; g.fillText('SELECT or B to close', W / 2, H - 10);
}
const ATTRACT = { sig: null };
function renderAttract() {
  const mapFn = (x, y) => y < 3 ? 'S' : '~';
  if (RC.sig !== 'attract') { RC.sig = 'attract'; buildRoomLayer('attract', null, mapFn); }
  g.drawImage(RC.base, 0, 0); if (RC.frames) g.drawImage(RC.frames[((T * 2) | 0) & 3], 0, 0);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H);
}
function renderBoot() {
  if (bootT < 0.7) { staticNoise(1); return; }
  const a = Math.min(1, (bootT - 0.7) * 1.5);
  g.globalAlpha = a;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 24px monospace';
  const jx = Math.random() < 0.06 ? rnd(-4, 4) : 0;
  g.fillStyle = '#d64541'; g.fillText('SECONDHAND', W / 2 + jx - 1, 70);
  g.fillStyle = '#1f9e8f'; g.fillText('SECONDHAND', W / 2 + jx + 1, 70);
  g.fillStyle = '#eee'; g.fillText('SECONDHAND', W / 2 + jx, 70);
  g.font = '8px monospace'; g.fillStyle = '#888';
  g.fillText(M.ended ? 'it remembers you.' : 'a game nobody remembers', W / 2, 92);
  if (bootT > 1.2 && ((T * 2) | 0) % 2 === 0) { g.fillStyle = '#eee'; g.font = '10px monospace'; g.fillText('PRESS START', W / 2, 130); }
  g.fillStyle = '#555'; g.font = '7px monospace'; g.fillText('© 2026 BUGGY GAMES YT', W / 2, 176);
  g.globalAlpha = 1;
}
function renderCard() {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = cardText[0] === 'GAME OVER' ? '#d64541' : '#eee';
  g.font = 'bold 16px monospace'; g.fillText(cardText[0], W / 2, 80);
  g.fillStyle = '#ccc'; g.font = '9px monospace';
  g.fillText(cardText[1], W / 2, cardText[0] ? 106 : 92);
  if (cardT > 1.2 && ((T * 2) | 0) % 2 === 0) { g.fillStyle = '#666'; g.font = '7px monospace'; g.fillText('PRESS A', W / 2, 150); }
}
function renderMemory() {
  if (RC.sig !== 'memlake') { RC.sig = 'memlake'; buildRoomLayer('lake', ROOMS.lake, (x, y) => ROOMS.lake.map[y][x]); }
  drawRoomLayer(ROOMS.lake);
  g.fillStyle = 'rgba(5,10,40,.55)'; g.fillRect(0, HUD, W, PH);
  if (memPhase < 2) drawHuman(g, PAL.wren, P.dir, P.x, HUD + P.y, P.step);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, HUD);
  g.fillStyle = '#9ab'; g.font = '8px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(memPhase < 2 ? 'WREN' : '', W / 2, 8);
  if (memPhase === 1) { g.fillStyle = '#cde'; g.fillText('just one more level before bed.', W / 2, HUD + 30); }
  if (memPhase === 2) {
    const k = Math.min(1, memT / 3);
    g.fillStyle = 'rgba(10,40,90,' + (0.4 + k * 0.6) + ')'; g.fillRect(0, H - H * k, W, H * k);
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(200,230,255,.5)'; g.fillRect((hash(i, 1, 1) * W) | 0, (H - ((memT * 40 + i * 30) % H)) | 0, 2, 2); }
  }
  if (memPhase >= 3) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#8af'; g.font = '9px monospace'; g.fillText('the water was so cold.', W / 2, H / 2); }
}
function renderEndingFx() {
  const e = ending;
  if (e.phase >= 2 && e.phase < 3) {
    const k = Math.min(1, e.t / 4.5);
    g.fillStyle = 'rgba(10,40,90,' + (0.35 + k * 0.6) + ')'; g.fillRect(0, H - H * k, W, H * k);
    for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(200,230,255,.5)'; g.fillRect((hash(i, 2, 1) * W) | 0, (H - ((e.t * 45 + i * 23) % H)) | 0, 2, 2); }
  }
  if (e.phase === 3) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.font = '8px monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
    const lines = ['ERR 0x0D', 'SAVE 01 ... OVERWRITTEN', 'SAVE 02 ... OVERWRITTEN', 'PLAYER ' + S.name + ' ... MOVED TO SAVE 01', 'PLAYER WREN ... RELEASED', '', 'please insert a new player'];
    const n = Math.min(lines.length, Math.floor(e.t * 3));
    for (let i = 0; i < n; i++) { g.fillStyle = i === 0 ? '#d64541' : '#ccc'; g.fillText(corrupt(lines[i], 0.04), 12, 20 + i * 14); }
    for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff00dc', '#00e5ff', '#e8b830'][i % 3]; g.fillRect(rnd(0, W) | 0, rnd(0, H) | 0, rnd(10, 80) | 0, 2); }
  }
  if (e.phase >= 4) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
}
// static: a few frames of noise made once, shown at random offsets
const NOISE = [];
function noiseFrame() {
  if (!NOISE.length) for (let k = 0; k < 4; k++) {
    const c = mkCanvas(W * 2, H * 2), x = c.getContext('2d'), im = x.createImageData(W * 2, H * 2), d = new Uint32Array(im.data.buffer);
    for (let i = 0; i < d.length; i++) { const v = (Math.random() * 255) | 0; d[i] = 0xff000000 | (v << 16) | (v << 8) | v; }
    x.putImageData(im, 0, 0); NOISE.push(c);
  }
  return NOISE[(Math.random() * NOISE.length) | 0];
}
function staticNoise(a, ctx) {
  ctx = ctx || g;
  const n = noiseFrame();
  ctx.globalAlpha = a === undefined ? 1 : a;
  ctx.drawImage(n, -((Math.random() * W) | 0), -((Math.random() * H) | 0));
  ctx.globalAlpha = 1;
}
function blit() {
  const tb = performance.now();
  blit_();
  PERF.blit = PERF.blit * 0.95 + (performance.now() - tb) * 0.05;
}
function blit_() {
  out.setTransform(1, 0, 0, 1, 0, 0);
  const c = mode === 'play' || mode === 'dialog' || mode === 'paused' || mode === 'ending' || mode === 'map' ? visC() : 0;
  if (tear > 0) {
    for (let y = 0; y < H; y += 8) {
      const off = Math.random() < 0.3 ? rnd(-10, 10) | 0 : 0;
      out.drawImage(buf, 0, y, W, 8, off, y, W, 8);
    }
  } else out.drawImage(buf, 0, 0);
  // corruption drains the colour (a cheap saturation blend instead of a canvas filter)
  if (c >= 2) {
    out.globalCompositeOperation = 'saturation'; out.globalAlpha = c >= 3 ? 0.55 : 0.2;
    out.fillStyle = '#808080'; out.fillRect(0, 0, W, H);
    out.globalAlpha = 1; out.globalCompositeOperation = 'source-over';
    if (c >= 3) { out.fillStyle = 'rgba(10,0,20,.08)'; out.fillRect(0, 0, W, H); }
  }
  if (staticT > 0) staticNoise(0.6, out);
  if (flash > 0) { out.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, flash * 3) + ')'; out.fillRect(0, 0, W, H); }
}

// ---------- end panel ----------
$('endTitle').onclick = () => { $('endPanel').classList.remove('show'); openFiles(); };

// ---------- loop ----------
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  const t0 = performance.now();
  try { update(dt); } catch (e) { console.error(e); }
  musicTick();
  render();
  PERF.ft = PERF.ft * 0.95 + (performance.now() - t0) * 0.05;
  requestAnimationFrame(frame);
}
const inGame = () => S && (mode === 'play' || mode === 'paused' || mode === 'dialog' || mode === 'map');
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (inGame()) { if (mode === 'play') { S.x = P.x; S.y = P.y; } save(); } if (mode === 'play') openPause(); if (AC) AC.suspend(); }
  else if (AC) AC.resume();
});
addEventListener('pagehide', () => { if (inGame()) { if (mode === 'play') { S.x = P.x; S.y = P.y; } save(); } if (mode === 'play') openPause(); });
setInterval(() => { if (S && mode === 'play') { S.x = P.x; S.y = P.y; save(); } }, 5000);

// first screen
cartPanel.classList.add('show');
if (M.visits > 0) $('cartNote').textContent = M.ended ? 'It\'s back in your hands. You don\'t remember picking it up.' : 'The label still says SECONDHAND. The marker looks fresher than last time.';
layout();
requestAnimationFrame(frame);

// test hook (harmless)
window.__sh = {
  get mode() { return mode; }, get song() { return SHA.current; }, get S() { return S; }, get room() { return room; }, P, C, R, SHW, held,
  get foes() { return foes; }, get items() { return items; }, get npcs() { return npcs; }, get blocks() { return blocks; }, get statue() { return statue; },
  enterRoom: (r, x, y) => enterRoom(r, x, y), tileAt: (r, x, y) => tileAt(r, x, y), goFloor: (f, w) => goFloor(f, w || 'start'),
  setA: v => { aHeld = !!v; }, noStatue: () => { statue = null; }, damage: n => { P.inv = 0; hurt({ x: P.x, y: P.y + 1 }, n || 1); },
  get beams() { return beams; }, get fx() { return fx; }, lowHP: () => lowHP(), bDown: () => bDown(), bUp: () => bUp(), mkFoe: (t, x, y) => { const f = mkFoe(t, x, y); foes.push(f); return f; },
  get SPR() { return SPR.size; }, PERF, get audio() { return SHA; },
};
})();
