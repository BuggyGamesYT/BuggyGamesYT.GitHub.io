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
const g = buf.getContext('2d');
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
const HUMAN = {
  down: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '..ssssss..', '..skssks..', '..ssssss..', '...ssss...', '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pp..pp..', '..pp..pp..', '..bb..bb..'],
  up: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '..hhhhhh..', '..hhhhhh..', '..hhhhhh..', '...ssss...', '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pp..pp..', '..pp..pp..', '..bb..bb..'],
  side: ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '..hhssss..', '..hsssks..', '..ssssss..', '...ssss...', '..cccccc..', '..scccc...', '..scccc...', '..cccccc..', '...pppp...', '...pppp...', '...bbbb...'],
};
const WALK = { down: ['..pp..pp..', '..pp...pp.', '..bb...bb.'], side: ['..pp..pp..', '.pp....pp.', '.bb....bb.'] };
const PAL = {
  player: { h: '#1f9e8f', s: '#f2c8a0', k: '#151515', c: '#d64541', p: '#2c3e70', b: '#3b2a1a' },
  elder: { h: '#e8e8e8', s: '#e9bf98', k: '#151515', c: '#6a4a8c', p: '#4a3466', b: '#2b1d10' },
  kid: { h: '#7a4a22', s: '#f4cfa8', k: '#151515', c: '#e8c23a', p: '#3a5aa0', b: '#3b2a1a' },
  shop: { h: '#2a2420', s: '#d9a57c', k: '#151515', c: '#3f8f5a', p: '#3a3a3a', b: '#222' },
  wren: { h: '#22303c', s: '#b9cbd6', k: '#0b0f14', c: '#7fb2d9', p: '#2e4a66', b: '#1d2a36' },
  statue: { h: '#8d8d8d', s: '#a7a7a7', k: '#2a2a2a', c: '#7c7c7c', p: '#6c6c6c', b: '#575757' },
  statueR: { h: '#8d8d8d', s: '#a7a7a7', k: '#c01818', c: '#7c7c7c', p: '#6c6c6c', b: '#575757' },
  noface: { h: '#e8e8e8', s: '#e9bf98', k: '#e9bf98', c: '#6a4a8c', p: '#4a3466', b: '#2b1d10' },
  noface2: { h: '#6a4a2a', s: '#e0b89a', k: '#e0b89a', c: '#8a6aa0', p: '#4a4a6a', b: '#333' },
  woodcutter: { h: '#5a3018', s: '#e2b48c', k: '#151515', c: '#b8332e', p: '#2c3e50', b: '#2b1d10' },
  keeper: { h: '#1a1a1a', s: '#d8b8a0', k: '#151515', c: '#26262c', p: '#16161a', b: '#0d0d0d' },
  digger: { h: '#5a4a3a', s: '#d9a57c', k: '#151515', c: '#6b5a3a', p: '#3a3020', b: '#221a10' },
  girl: { h: '#2a1a12', s: '#f2d2b6', k: '#151515', c: '#e8e8f0', p: '#e8e8f0', b: '#333' },
  farmer: { h: '#d8b84a', s: '#e0a878', k: '#151515', c: '#4a7a3a', p: '#3a5a8a', b: '#3b2a1a' },
  traveler: { h: '#555', s: '#cfa888', k: '#151515', c: '#6a6a70', p: '#3a3a40', b: '#222' },
  fisher: { h: '#c9c9c9', s: '#d9a57c', k: '#151515', c: '#2f5f8f', p: '#3a3a3a', b: '#222' },
  oldwoman: { h: '#cfcfcf', s: '#e6c2a2', k: '#151515', c: '#7a4a7a', p: '#5a3a5a', b: '#2a1a2a' },
  shadow: { h: '#0b0b0e', s: '#0b0b0e', k: '#e8e8e8', c: '#0b0b0e', p: '#0b0b0e', b: '#0b0b0e' },
  mimic: { h: '#111', s: '#2a2a2a', k: '#ff2a2a', c: '#3a0a0a', p: '#111', b: '#000' },
};
function drawHuman(ctx, pal, dir, x, y, step, alpha, noArms) {
  let rows = dir === 1 ? HUMAN.up : dir === 0 ? HUMAN.down : HUMAN.side;
  if (step) {
    rows = rows.slice();
    const wk = dir >= 2 ? WALK.side : WALK.down;
    rows[11] = wk[1]; rows[12] = wk[1]; rows[13] = wk[2];
  }
  if (noArms) { rows = rows.slice(); rows[8] = rows[8].replace(/s/g, '.'); rows[9] = rows[9].replace(/s/g, '.'); }
  const flip = dir === 2;
  const ox = Math.round(x - 5), oy = Math.round(y - 13);
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < 10; c++) {
      const ch = row[flip ? 9 - c : c];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch] || '#f0f';
      ctx.fillRect(ox + c, oy + r, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- tiles ----------
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const GLITCHABLE = ['.', ',', 'w', '=', 'T', 'S', 'r', '~', 'C', 'c', 'Q', '#', '_'];
const PALS = {
  hollow: { wall: '#3b2f1e', wall2: '#2a2114', moss: '#3f6a2a', floor: '#2b2a1c', floor2: '#383522' },
  cave: { wall: '#4b3f38', wall2: '#3a302a', moss: null, floor: '#2a2421', floor2: '#332c28' },
  mill: { wall: '#4a3018', wall2: '#2e1d0e', moss: null, floor: '#8a6a44', floor2: '#76583a', plank: true },
  home: { wall: '#b9a88a', wall2: '#9c8c70', moss: null, floor: '#6b5137', floor2: '#5c452e', plank: true },
};
const PCACHE = {};
function hsl(h, s, l) { return 'hsl(' + ((h % 360 + 360) % 360) + ',' + s + '%,' + l + '%)'; }
function palFor(r) {
  if (!r || !r.pal) return PALS.cave;
  if (r.pal !== 'under') return PALS[r.pal] || PALS.cave;
  const f = r.depth || 1, k = 'u' + f + (r.deep ? 'd' : '');
  if (PCACHE[k]) return PCACHE[k];
  let h = 220 - f * 6, s = 12 + Math.min(20, f * 2);
  if (f >= 5 && f % 2 === 1) { h = (f * 67) % 360; s = 35 + (f % 3) * 10; } // wrong colors
  const p = { wall: hsl(h, s, 24), wall2: hsl(h, s, 16), moss: f >= 7 ? hsl(h + 180, 50, 30) : null, floor: hsl(h + (f >= 6 ? 140 : 0), s - 4, 11), floor2: hsl(h, s, 16) };
  PCACHE[k] = p; return p;
}
function grass(x, y, tx, ty) {
  g.fillStyle = '#3d8b3d'; g.fillRect(x, y, 16, 16);
  g.fillStyle = '#4fa049';
  for (let i = 0; i < 4; i++) { const a = hash(tx, ty, i); const b = hash(ty, tx, i + 9); g.fillRect(x + ((a * 14) | 0), y + ((b * 13) | 0), 1, 3); }
}
function floorT(x, y, tx, ty, p) {
  g.fillStyle = p.floor; g.fillRect(x, y, 16, 16);
  g.fillStyle = p.floor2;
  if (p.plank) { g.fillRect(x, y + 7, 16, 1); g.fillRect(x, y + 15, 16, 1); g.fillRect(x + ((ty & 1) ? 5 : 11), y, 1, 7); g.fillRect(x + ((ty & 1) ? 12 : 3), y + 8, 1, 7); }
  else { g.fillRect(x + ((hash(tx, ty, 1) * 13) | 0), y + ((hash(tx, ty, 2) * 13) | 0), 2, 1); g.fillRect(x + ((hash(tx, ty, 3) * 13) | 0), y + ((hash(tx, ty, 4) * 13) | 0), 1, 1); }
}
function baseFor(r, x, y, tx, ty) {
  if (r && r.pal) floorT(x, y, tx, ty, palFor(r)); else grass(x, y, tx, ty);
}
function drawTile(ch, tx, ty, t, r) {
  const x = tx * TS, y = HUD + ty * TS;
  switch (ch) {
    case '.': grass(x, y, tx, ty); break;
    case ',': grass(x, y, tx, ty);
      for (let i = 0; i < 3; i++) { g.fillStyle = ['#f6e05e', '#f28fb1', '#ffffff'][i]; g.fillRect(x + 2 + ((hash(tx, ty, i + 3) * 11) | 0), y + 2 + ((hash(tx, ty, i + 7) * 11) | 0), 2, 2); }
      break;
    case 'w': g.fillStyle = '#367d34'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5cbc4c';
      for (let i = 0; i < 6; i++) { const sx = x + i * 3 - 1 + (Math.sin(t * 2 + tx + i) > 0.6 ? 1 : 0); g.fillRect(sx + 1, y + 3, 1, 12); g.fillRect(sx + 2, y + 6, 1, 9); }
      break;
    case '=': g.fillStyle = '#c9a96b'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#b39257';
      for (let i = 0; i < 3; i++) g.fillRect(x + ((hash(tx, ty, i) * 14) | 0), y + ((hash(ty, tx, i) * 14) | 0), 2, 1);
      break;
    case 'S': g.fillStyle = '#d8c48d'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#c4ae74';
      for (let i = 0; i < 3; i++) g.fillRect(x + ((hash(tx, ty, i) * 14) | 0), y + ((hash(ty, tx, i) * 14) | 0), 1, 1);
      break;
    case 'T': grass(x, y, tx, ty);
      g.fillStyle = '#5b3a1e'; g.fillRect(x + 6, y + 10, 4, 6);
      g.fillStyle = '#1f5a2a'; g.fillRect(x + 1, y + 2, 14, 9); g.fillRect(x + 3, y, 10, 13);
      g.fillStyle = '#2b7436'; g.fillRect(x + 3, y + 2, 6, 4); g.fillRect(x + 9, y + 6, 3, 2);
      break;
    case 'a': grass(x, y, tx, ty);
      g.fillStyle = '#5b3a1e'; g.fillRect(x + 6, y + 10, 4, 6);
      g.fillStyle = '#2f7a34'; g.fillRect(x + 1, y + 2, 14, 9); g.fillRect(x + 3, y, 10, 13);
      g.fillStyle = C() >= 2 ? '#5a1010' : '#d6302a';
      for (let i = 0; i < 4; i++) g.fillRect(x + 3 + ((hash(tx, ty, i) * 9) | 0), y + 2 + ((hash(ty, tx, i) * 8) | 0), 2, 2);
      break;
    case 'R': g.fillStyle = '#8c3b2e'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#6f2c22'; for (let i = 0; i < 4; i++) g.fillRect(x, y + i * 4 + 3, 16, 1);
      break;
    case 'H': g.fillStyle = '#d9c9a3'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#a8977a'; g.fillRect(x, y + 15, 16, 1);
      g.fillStyle = '#304a6b'; g.fillRect(x + 4, y + 4, 8, 6); g.fillStyle = '#d9c9a3'; g.fillRect(x + 7, y + 4, 1, 6); g.fillRect(x + 4, y + 7, 8, 1);
      break;
    case 'D': g.fillStyle = '#d9c9a3'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5b3a1e'; g.fillRect(x + 3, y + 2, 10, 14); g.fillStyle = '#e0b84a'; g.fillRect(x + 10, y + 9, 1, 2);
      break;
    case 'f': grass(x, y, tx, ty);
      g.fillStyle = '#a07a4a'; g.fillRect(x, y + 6, 16, 2); g.fillRect(x, y + 11, 16, 2); g.fillRect(x + 2, y + 4, 2, 11); g.fillRect(x + 12, y + 4, 2, 11);
      break;
    case 'P': grass(x, y, tx, ty);
      g.fillStyle = '#7d7d7d'; g.fillRect(x + 1, y + 8, 14, 8); g.fillStyle = '#9a9a9a'; g.fillRect(x + 1, y + 8, 14, 2);
      break;
    case 'r': grass(x, y, tx, ty);
      g.fillStyle = '#6e6e6e'; g.fillRect(x + 2, y + 5, 12, 9); g.fillRect(x + 4, y + 3, 8, 12); g.fillStyle = '#8e8e8e'; g.fillRect(x + 4, y + 4, 5, 3);
      break;
    case 'M': grass(x, y, tx, ty);
      g.fillStyle = '#8a8a8a'; g.fillRect(x + 4, y + 3, 8, 12); g.fillRect(x + 5, y + 2, 6, 1); g.fillStyle = '#5e5e5e'; g.fillRect(x + 6, y + 6, 4, 1); g.fillRect(x + 6, y + 8, 4, 1);
      g.fillStyle = '#f28fb1'; g.fillRect(x + 3, y + 14, 2, 2); g.fillStyle = '#ffffff'; g.fillRect(x + 11, y + 14, 2, 2);
      break;
    case 'g': grass(x, y, tx, ty);
      g.fillStyle = '#7a7a80'; g.fillRect(x + 3, y + 4, 10, 11); g.fillRect(x + 4, y + 3, 8, 1); g.fillRect(x + 5, y + 2, 6, 1);
      g.fillStyle = '#5a5a60'; g.fillRect(x + 7, y + 5, 2, 6); g.fillRect(x + 5, y + 7, 6, 2);
      g.fillStyle = '#4a7a3a'; g.fillRect(x + 2, y + 14, 12, 2);
      break;
    case 'n': (r && r.pal ? floorT(x, y, tx, ty, palFor(r)) : grass(x, y, tx, ty));
      g.fillStyle = '#6b4320'; g.fillRect(x + 7, y + 9, 2, 7);
      g.fillStyle = '#a07a4a'; g.fillRect(x + 2, y + 2, 12, 8); g.fillStyle = '#7a5a30'; g.fillRect(x + 4, y + 4, 8, 1); g.fillRect(x + 4, y + 6, 6, 1);
      break;
    case '~': {
      g.fillStyle = r && r.night ? '#0f2a52' : '#1f4f93'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#3b72bd';
      const o = ((t * 6 + tx * 3 + ty * 5) | 0) % 16;
      g.fillRect(x + o % 16, y + 4, 4, 1); g.fillRect(x + (o + 8) % 16, y + 11, 4, 1);
      break; }
    case 'm': g.fillStyle = '#3e5a36'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#2c4a3e'; g.fillRect(x + 2, y + 5, 7, 3); g.fillRect(x + 8, y + 11, 6, 2);
      g.fillStyle = '#6a8a4a'; g.fillRect(x + 11, y + 2, 1, 5); g.fillRect(x + 3, y + 10, 1, 4);
      break;
    case 'd': g.fillStyle = '#8a5a2b'; g.fillRect(x, y, 16, 16); g.fillStyle = '#6b4320';
      for (let i = 0; i < 4; i++) g.fillRect(x, y + i * 4 + 3, 16, 1);
      break;
    case 'B': g.fillStyle = '#1f4f93'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#8a5a2b'; g.fillRect(x, y, 16, 6);
      g.fillStyle = '#5b3a1e'; g.fillRect(x + (tx === 7 ? 12 : 0), y, 4, 16);
      break;
    case 'C': g.fillStyle = '#4b3f38'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#3a302a'; g.fillRect(x, y + 7, 16, 1); g.fillRect(x + ((ty & 1) ? 4 : 10), y, 1, 7); g.fillRect(x + ((ty & 1) ? 11 : 3), y + 8, 1, 8);
      break;
    case 'c': g.fillStyle = '#2a2421'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#332c28'; g.fillRect(x + ((hash(tx, ty, 1) * 13) | 0), y + ((hash(tx, ty, 2) * 13) | 0), 2, 1);
      break;
    case 'K': g.fillStyle = '#4a3420'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#35241455'; g.fillStyle = '#352414'; g.fillRect(x + 3, y, 2, 16); g.fillRect(x + 10, y, 1, 16); g.fillRect(x + 7, y + 4, 1, 9);
      g.fillStyle = '#5c4430'; g.fillRect(x + 12, y + 2, 2, 5);
      break;
    case '#': { const p = palFor(r);
      g.fillStyle = p.wall; g.fillRect(x, y, 16, 16);
      g.fillStyle = p.wall2; g.fillRect(x, y + 7, 16, 1); g.fillRect(x, y + 15, 16, 1); g.fillRect(x + ((ty & 1) ? 4 : 10), y, 1, 7); g.fillRect(x + ((ty & 1) ? 11 : 3), y + 8, 1, 7);
      if (p.moss && hash(tx, ty, 5) < 0.35) { g.fillStyle = p.moss; g.fillRect(x + ((hash(tx, ty, 6) * 10) | 0), y + 12, 5, 3); }
      break; }
    case '_': floorT(x, y, tx, ty, palFor(r)); break;
    case 'L': { const p = palFor(r);
      g.fillStyle = p.wall2; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5b3a1e'; g.fillRect(x + 1, y + 1, 14, 14); g.fillStyle = '#7a5230'; g.fillRect(x + 1, y + 4, 14, 1); g.fillRect(x + 1, y + 10, 14, 1);
      g.fillStyle = '#c9b04a'; g.fillRect(x + 6, y + 5, 4, 5); g.fillStyle = '#111'; g.fillRect(x + 7, y + 6, 2, 2); g.fillRect(x + 7, y + 8, 2, 1);
      break; }
    case 'G': { floorT(x, y, tx, ty, palFor(r));
      g.fillStyle = '#9a9aa6'; for (let i = 1; i < 16; i += 4) g.fillRect(x + i, y, 2, 16);
      g.fillStyle = '#6a6a76'; g.fillRect(x, y + 3, 16, 2); g.fillRect(x, y + 11, 16, 2);
      break; }
    case 'o': { floorT(x, y, tx, ty, palFor(r));
      const on = blocks.some(b => b.tx === tx && b.ty === ty);
      g.fillStyle = '#222'; g.fillRect(x + 2, y + 2, 12, 12); g.fillStyle = on ? '#3f8f5a' : '#8a3a3a'; g.fillRect(x + 3, y + 3, 10, 10);
      g.fillStyle = on ? '#6fd08a' : '#c45a5a'; g.fillRect(x + 4, y + 4, 8, 2);
      break; }
    case 'q': { floorT(x, y, tx, ty, palFor(r));
      const done = S.solved[room];
      g.fillStyle = '#333'; g.fillRect(x + 3, y + 11, 10, 4);
      g.fillStyle = done ? '#3fbf7a' : '#3a7ad9'; g.fillRect(x + 4, y + 2, 8, 9); g.fillRect(x + 3, y + 4, 10, 5);
      g.fillStyle = '#fff'; g.fillRect(x + 5, y + 3, 2, 2);
      break; }
    case '<': { baseFor(r, x, y, tx, ty);
      g.fillStyle = '#1a1a1a'; g.fillRect(x + 1, y + 1, 14, 14);
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#8a8a8a', '#6e6e6e', '#555', '#3c3c3c'][i]; g.fillRect(x + 2, y + 12 - i * 3, 12, 2); }
      break; }
    case '>': { if (room === 'lake') { g.fillStyle = '#8a5a2b'; g.fillRect(x, y, 16, 16); } else baseFor(r, x, y, tx, ty);
      g.fillStyle = '#000'; g.fillRect(x + 1, y + 1, 14, 14);
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#5a5a5a', '#3e3e3e', '#262626', '#141414'][i]; g.fillRect(x + 2, y + 2 + i * 3, 12 - i * 2 + 0, 2); }
      if (Math.sin(t * 3 + tx) > 0.6) { g.fillStyle = 'rgba(160,200,255,.25)'; g.fillRect(x + 3, y + 3, 10, 10); }
      break; }
    case 'Y': { if (r && r.night) { g.fillStyle = '#8a5a2b'; g.fillRect(x, y, 16, 16); } else baseFor(r, x, y, tx, ty);
      g.fillStyle = '#4a2f18'; g.fillRect(x + 1, y + 1, 14, 14); g.fillStyle = '#6b4320'; for (let i = 0; i < 3; i++) g.fillRect(x + 1, y + 3 + i * 4, 14, 2);
      g.fillStyle = '#9a9aa6'; g.fillRect(x + 6, y + 6, 4, 4); g.fillStyle = '#222'; g.fillRect(x + 7, y + 7, 2, 2);
      break; }
    case 'O': case 'Z': {
      if (room === 'hollowgate') drawTile('K', tx, ty, t, r); else if (room === 'cavehill') drawTile('C', tx, ty, t, r); else drawTile('H', tx, ty, t, r);
      g.fillStyle = '#000'; g.fillRect(x + 3, y + 4, 10, 12); g.fillRect(x + 5, y + 2, 6, 2);
      if (ch === 'Z') { g.fillStyle = '#7a5a30'; g.fillRect(x + 1, y + 5, 14, 3); g.fillRect(x + 1, y + 11, 14, 3); g.fillStyle = '#ccc'; g.fillRect(x + 3, y + 6, 1, 1); g.fillRect(x + 12, y + 12, 1, 1); }
      break; }
    case 'U': { g.fillStyle = '#1f4f93'; g.fillRect(x, y, 16, 16);
      const a = t * 1.3 * (C() >= 2 ? -1 : 1), cx = (tx === 10 ? x + 16 : x), cy = (ty === 3 ? y + 16 : y);
      g.fillStyle = '#5b3a1e';
      for (let i = 0; i < 6; i++) { const an = a + i * Math.PI / 3; for (let k = 2; k < 15; k += 2) { const px = cx + Math.cos(an) * k, py = cy + Math.sin(an) * k; if (px >= x && px < x + 16 && py >= y && py < y + 16) g.fillRect(px | 0, py | 0, 2, 2); } }
      break; }
    case 'z': { const p = palFor(r); g.fillStyle = '#000'; g.fillRect(x, y, 16, 16); g.fillStyle = p.wall2; g.fillRect(x, y, 16, 2); break; }
    case 'E': { floorT(x, y, tx, ty, palFor(r)); g.fillStyle = '#e8e0d0'; g.fillRect(x + 1, y + 1, 15, 15); g.fillStyle = '#3a6ab0'; g.fillRect(x + 1, y + 6, 15, 10); g.fillStyle = '#f2c84a'; g.fillRect(x + 4, y + 9, 3, 3); g.fillRect(x + 10, y + 12, 3, 2); break; }
    case 'V': { floorT(x, y, tx, ty, palFor(r)); g.fillStyle = '#222'; g.fillRect(x + 1, y + 3, 14, 11); g.fillStyle = Math.random() < 0.05 ? '#fff' : '#3d8b3d'; g.fillRect(x + 3, y + 5, 10, 7); g.fillStyle = '#d64541'; g.fillRect(x + 7, y + 8, 1, 2); break; }
    case 'F': { floorT(x, y, tx, ty, palFor(r)); g.fillStyle = '#5b3a1e'; g.fillRect(x, y + 1, 16, 15); g.fillStyle = '#3a2412'; g.fillRect(x + 1, y + 7, 14, 1);
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#d64541', '#3a7ad9', '#e8c23a', '#888'][i]; g.fillRect(x + 2 + i * 3, y + 2, 2, 5); g.fillRect(x + 2 + i * 3, y + 9, 2, 5); }
      break; }
    case 'J': { drawTile('#', tx, ty, t, r); g.fillStyle = '#c9a050'; g.fillRect(x + 3, y + 3, 10, 10); g.fillStyle = '#ddd'; g.fillRect(x + 4, y + 4, 8, 8); g.fillStyle = '#555'; g.fillRect(x + 6, y + 6, 4, 4); break; }
    case 't': { baseFor(r, x, y, tx, ty); g.fillStyle = '#9a7a50'; g.fillRect(x, y + 4, 16, 6); g.fillStyle = '#6b4a2b'; g.fillRect(x + 1, y + 10, 2, 5); g.fillRect(x + 13, y + 10, 2, 5);
      g.fillStyle = ['#3a7ad9', '#e8c23a', '#d64541', '#fff'][(tx + ty) & 3]; g.fillRect(x + 3 + ((hash(tx, ty, 1) * 6) | 0), y + 2, 4, 3); break; }
    case 'e': { g.fillStyle = '#d8c48d'; g.fillRect(x, y, 16, 16); g.fillStyle = '#3ab0c9'; g.fillRect(x + 1, y + 3, 14, 10); g.fillStyle = '#f2c84a'; g.fillRect(x + 4, y + 6, 4, 2); g.fillRect(x + 9, y + 9, 3, 2); break; }
    case 'u': { g.fillStyle = '#d8c48d'; g.fillRect(x, y, 16, 16); g.fillStyle = '#d64541'; g.fillRect(x + 2, y + 8, 5, 4); g.fillRect(x + 9, y + 8, 5, 4); g.fillStyle = '#fff'; g.fillRect(x + 2, y + 11, 5, 1); g.fillRect(x + 9, y + 11, 5, 1); break; }
    case 'x': g.fillStyle = '#000'; g.fillRect(x, y, 16, 16); break;
    case 'v': g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
      if (hash(tx, ty, (t * 2) | 0) < 0.04) { g.fillStyle = '#0d1a26'; g.fillRect(x, y, 16, 1); }
      break;
    case 'Q':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) & 1 ? '#000' : '#ff00dc'; g.fillRect(x + i * 4, y + j * 4, 4, 4); }
      break;
    default: g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
  }
}

// ---------- audio ----------
let AC = null, master, musicG, sfxG, noiseBuf;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(AC.destination);
    musicG = AC.createGain(); musicG.gain.value = 0.32; musicG.connect(master);
    sfxG = AC.createGain(); sfxG.gain.value = 0.7; sfxG.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function setMute(m) {
  muted = m; try { localStorage.setItem('secondhand-mute', m ? '1' : '0'); } catch (e) {}
  if (master) master.gain.value = m ? 0 : 0.55;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function tone(f, t, dur, type, dest, vol, det, attack) {
  if (!AC) return;
  const o = AC.createOscillator(), gn = AC.createGain();
  o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
  if (attack) { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + attack); gn.gain.setValueAtTime(vol, t + dur - 0.01); gn.gain.linearRampToValueAtTime(0, t + dur); }
  else { gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur); }
  o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, vol, freq, dest) {
  if (!AC) return;
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
  const gn = AC.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(gn); gn.connect(dest || sfxG); s.start(t); s.stop(t + dur + 0.05);
}
const SFX = {
  blip() { if (!AC) return; tone(700 + Math.random() * 300, AC.currentTime, 0.035, 'square', sfxG, 0.04); },
  swing() { if (!AC) return; noise(AC.currentTime, 0.09, 0.25, 2500); },
  hit() { if (!AC) return; const t = AC.currentTime; tone(420, t, 0.08, 'square', sfxG, 0.12); tone(210, t + 0.05, 0.1, 'square', sfxG, 0.12); },
  kill() { if (!AC) return; const t = AC.currentTime; tone(600, t, 0.06, 'square', sfxG, 0.1); tone(300, t + 0.05, 0.08, 'square', sfxG, 0.1); noise(t, 0.15, 0.12, 4000); },
  bossHit() { if (!AC) return; const t = AC.currentTime; tone(140, t, 0.18, 'sawtooth', sfxG, 0.16); noise(t, 0.12, 0.2, 1500); },
  hurt() { if (!AC) return; const t = AC.currentTime; tone(160, t, 0.2, 'sawtooth', sfxG, 0.15); tone(110, t + 0.08, 0.25, 'square', sfxG, 0.12); },
  pick() { if (!AC) return; const t = AC.currentTime; [72, 76, 79, 84].forEach((m, i) => tone(mtof(m), t + i * 0.08, 0.18, 'square', sfxG, 0.12)); },
  key() { if (!AC) return; const t = AC.currentTime; [79, 83, 86, 91].forEach((m, i) => tone(mtof(m), t + i * 0.06, 0.14, 'square', sfxG, 0.1)); },
  shard() { if (!AC) return; const t = AC.currentTime; [69, 72, 76, 81, 80].forEach((m, i) => tone(mtof(m), t + i * 0.13, 0.35, 'square', sfxG, 0.12, i === 4 ? -40 : 0)); },
  secret() { if (!AC) return; const t = AC.currentTime; [67, 66, 63, 57, 56, 64, 68, 72].forEach((m, i) => tone(mtof(m + 12), t + i * 0.09, 0.15, 'square', sfxG, 0.08)); },
  grind() { if (!AC) return; noise(AC.currentTime, 0.18, 0.05, 260); },
  push() { if (!AC) return; noise(AC.currentTime, 0.2, 0.12, 400); },
  sting() { if (!AC) return; const t = AC.currentTime; [49, 50, 55, 56, 61].forEach(m => tone(mtof(m), t, 1.4, 'sawtooth', sfxG, 0.07)); noise(t, 0.9, 0.35, 3000); },
  static(d) { if (!AC) return; noise(AC.currentTime, d || 0.5, 0.25, 6000); },
  bell(rev) {
    if (!AC) return; const t = AC.currentTime;
    if (!rev) { [[72, 0.25], [79, 0.12], [84, 0.08], [88, 0.05]].forEach(([m, v]) => tone(mtof(m), t, 3.5, 'sine', sfxG, v)); }
    else { [[72, 0.22], [79, 0.1], [84, 0.07], [88, 0.04]].forEach(([m, v]) => tone(mtof(m) * 0.94, t, 3, 'sine', sfxG, v, 0, 2.9)); }
  },
  door() { if (!AC) return; tone(90, AC.currentTime, 0.15, 'square', sfxG, 0.1); },
  unlock() { if (!AC) return; const t = AC.currentTime; tone(mtof(60), t, 0.08, 'square', sfxG, 0.1); tone(mtof(67), t + 0.08, 0.08, 'square', sfxG, 0.1); noise(t + 0.1, 0.2, 0.15, 900); },
  stairs() { if (!AC) return; const t = AC.currentTime; for (let i = 0; i < 5; i++) tone(mtof(64 - i * 3), t + i * 0.07, 0.08, 'triangle', sfxG, 0.12); },
  ok() { if (!AC) return; const t = AC.currentTime; tone(mtof(76), t, 0.08, 'square', sfxG, 0.1); tone(mtof(83), t + 0.07, 0.12, 'square', sfxG, 0.1); },
  shot() { if (!AC) return; tone(300, AC.currentTime, 0.12, 'triangle', sfxG, 0.08, 0); },
};

// songs: arrays of midi notes per step (0 = rest)
const SONGS = {
  main: { step: 0.17, lt: 'square', bt: 'triangle', lv: 0.09, bv: 0.2,
    lead: [69, 0, 72, 74, 76, 0, 74, 72, 71, 0, 67, 69, 72, 71, 69, 0, 69, 0, 72, 74, 76, 0, 79, 77, 76, 74, 72, 71, 69, 0, 0, 0,
           72, 0, 71, 72, 74, 0, 72, 71, 69, 0, 67, 65, 64, 0, 0, 0, 65, 0, 67, 69, 71, 0, 72, 74, 76, 75, 76, 0, 69, 0, 0, 0],
    bass: [45, 0, 52, 0, 48, 0, 52, 0, 43, 0, 50, 0, 45, 0, 52, 0, 45, 0, 52, 0, 48, 0, 55, 0, 41, 0, 48, 0, 45, 0, 40, 0,
           41, 0, 48, 0, 43, 0, 50, 0, 45, 0, 52, 0, 40, 0, 47, 0, 41, 0, 48, 0, 43, 0, 50, 0, 40, 0, 44, 0, 45, 0, 0, 0] },
  cave: { step: 0.22, lt: 'triangle', bt: 'triangle', lv: 0.1, bv: 0.18,
    lead: [57, 0, 0, 60, 0, 0, 59, 0, 0, 0, 56, 0, 0, 0, 0, 0, 57, 0, 0, 63, 0, 0, 62, 0, 0, 0, 59, 0, 0, 0, 0, 0],
    bass: [33, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 0, 0, 0, 0] },
  lake: { step: 0.26, lt: 'triangle', bt: 'sine', lv: 0.12, bv: 0.16,
    lead: [57, 60, 64, 67, 64, 60, 57, 0, 55, 59, 62, 67, 62, 59, 55, 0, 53, 57, 60, 64, 60, 57, 53, 0, 52, 56, 59, 64, 59, 56, 52, 0],
    bass: [45, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0] },
  under: { step: 0.24, lt: 'triangle', bt: 'square', lv: 0.09, bv: 0.07,
    lead: [57, 0, 60, 0, 63, 0, 62, 0, 57, 0, 0, 0, 56, 0, 0, 0, 57, 0, 60, 0, 64, 0, 63, 0, 59, 0, 0, 0, 0, 0, 0, 0],
    bass: [33, 0, 33, 0, 0, 0, 0, 0, 32, 0, 32, 0, 0, 0, 0, 0, 31, 0, 31, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0] },
  mem: { step: 0.3, lt: 'sine', bt: 'sine', lv: 0.1, bv: 0.08,
    lead: [76, 79, 83, 79, 76, 0, 74, 0, 72, 76, 79, 76, 72, 0, 71, 0, 69, 72, 76, 72, 69, 0, 67, 0, 69, 0, 71, 0, 72, 0, 0, 0],
    bass: [45, 0, 0, 0, 52, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0, 40, 0, 0, 0, 44, 0, 0, 0] },
  boss: { step: 0.13, lt: 'square', bt: 'sawtooth', lv: 0.07, bv: 0.08,
    lead: [57, 58, 57, 0, 57, 58, 60, 0, 57, 58, 57, 0, 63, 62, 60, 58, 57, 58, 57, 0, 57, 58, 60, 0, 64, 63, 62, 61, 60, 0, 58, 0],
    bass: [33, 0, 33, 33, 0, 33, 0, 0, 33, 0, 33, 33, 0, 34, 0, 0, 31, 0, 31, 31, 0, 31, 0, 0, 32, 0, 32, 32, 0, 33, 0, 0] },
  void: { step: 0.5, lt: 'sine', bt: 'sine', lv: 0.0, bv: 0.12,
    lead: [0, 0, 0, 0, 0, 0, 0, 0], bass: [33, 0, 0, 0, 34, 0, 0, 0] },
};
const MUS = { name: null, idx: 0, next: 0, override: null };
function setSong(name) {
  if (MUS.name === name) return;
  MUS.name = name; MUS.idx = 0; if (AC) MUS.next = AC.currentTime + 0.1;
}
function musicTick() {
  if (!AC || !MUS.name || !SONGS[MUS.name]) return;
  const s = SONGS[MUS.name], c = MUS.override != null ? MUS.override : C();
  const rate = [1, 1.08, 1.35, 1.7][c] || 1, det = [0, 0, -180, -420][c] || 0, rev = c >= 3;
  if (MUS.next < AC.currentTime - 0.5) MUS.next = AC.currentTime + 0.05;
  while (MUS.next < AC.currentTime + 0.15) {
    const L = s.lead.length, i = rev ? (L - 1 - (MUS.idx % L)) : MUS.idx % L;
    const skip = c >= 2 && Math.random() < 0.06;
    const ln = s.lead[i], bn = s.bass[i % s.bass.length];
    const d = s.step * rate;
    const wob = c >= 1 && Math.random() < 0.04 ? rnd(-60, 60) : 0;
    if (!skip) {
      if (ln) tone(mtof(ln), MUS.next, d * 0.9, s.lt, musicG, s.lv, det + wob);
      if (bn) tone(mtof(bn), MUS.next, d * 1.8, s.bt, musicG, s.bv, det);
    }
    MUS.next += d * (c >= 2 && Math.random() < 0.05 ? 1.6 : 1);
    MUS.idx++;
  }
}

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
  if (['KeyX', 'KeyK', 'Space'].includes(e.code)) { e.preventDefault(); onB(); }
  else if (['Enter', 'Escape', 'KeyP'].includes(e.code)) { e.preventDefault(); onStart(); }
  else if (['ShiftLeft', 'ShiftRight', 'Tab', 'KeyQ'].includes(e.code)) { e.preventDefault(); onSelect(); }
  else if (e.code === 'KeyM') { setMute(!muted); refreshPause(); }
});
addEventListener('keyup', e => {
  if (KEYMAP[e.code]) held[KEYMAP[e.code]] = false;
  if (['KeyZ', 'KeyJ'].includes(e.code)) aHeld = false;
});
addEventListener('blur', () => { held.up = held.down = held.left = held.right = false; aHeld = false; });

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
btn('btnB', () => onB());
let touchMode = matchMedia('(pointer: coarse)').matches;
addEventListener('touchstart', () => { if (!touchMode) { touchMode = true; layout(); } }, { passive: true });
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
const P = { x: 0, y: 0, dir: 0, step: 0, anim: 0, inv: 0, swing: 0, kx: 0, ky: 0, entryX: 0, entryY: 0, hidden: false, dust: 0, pushT: 0, bumpT: 0, running: false, swingId: 0, mdx: 0, mdy: 0 };
let npcs = [], foes = [], items = [], statue = null, fx = [], blocks = [], shots = [], spikes = [];
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
  npcs = []; foes = []; items = []; fx = []; statue = null; blocks = []; shots = []; spikes = [];
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
  MUS.override = rm.depth ? (rm.depth <= 2 ? 1 : rm.depth <= 5 ? 2 : 3) : (rm.song === 'mem' ? 1 : null);
  if (rm.song === 'mem') MUS.override = 1;
  setSong(rm.boss && !S.bosses[rm.area] ? 'boss' : rm.song);
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
  if (name === 'village' && !S.flags.intro) { S.flags.intro = true; return say([['', 'Welcome to MILLBROOK, {N}!'], ['', 'Talk and read with A. Hold A while you walk to run.'], ['', 'Swing your sword with B. START pauses. SELECT shows the map.']]); }
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
function showToast(s) {
  const t = $('toast'); t.textContent = s; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
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
  if (mode === 'play') { mode = 'map'; SFX.ok(); layout(); return; }
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
    if (viaA || msgCool <= 0) { msgCool = 2.5; if (viaA) say([['', 'A locked door. You need a KEY.']]); else showToast('LOCKED'); }
    return false;
  }
  if (ch === 'Y') {
    if (r.memGate) { if (viaA || msgCool <= 0) { msgCool = 3; say([['', 'A trapdoor, shut tight.'], ['', r.memGate === 'mem3' ? 'Something in the bedroom wants to be seen first.' : r.memGate === 'mem6' ? 'Somebody at the sale has something to tell you first.' : 'Someone on the beach is waiting to talk to you.']]); } return false; }
    if (S.fkeys[r.area]) { S.opened[room + ':hatch'] = 1; SFX.unlock(); burst(tx * 16 + 8, ty * 16 + 8, '#9fd3ff'); showToast('THE HATCH OPENS'); save(); return true; }
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
    say([['', 'The bell rings. Then it rings again, backwards.'], ['', 'At the end of the dock, a board drops away. There are stairs under it, going down into the water.'], ['', 'down here, {N}.', 0.1]], () => setSong('lake'));
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
  mode = 'paused'; refreshPause(); $('pausePanel').classList.add('show'); layout();
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
function closePause() { $('pausePanel').classList.remove('show'); mode = 'play'; layout(); }
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
  SFX.static(0.6);
};
let bootT = 0;
function storyS() { if (S && !S.deep) return S; return SAVED; }
function openFiles() {
  if (S && S.deep) { save(); S = SAVED; }
  else if (S) SAVED = S;
  mode = 'files'; MUS.name = null; MUS.override = null; layout();
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
    if (P.y < 9 * 16 + 8) { P.y += dt * 22; P.anim += dt; P.step = (P.anim * 4 | 0) % 2; }
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
const SWING = 0.26;
function swing() {
  if (P.swing > 0) return;
  P.swing = SWING; P.swingId++; SFX.swing();
  // sword orbs
  const [fx_, fy_] = FV[P.dir];
  const hx = P.x + fx_ * 12, hy = P.y - 4 + fy_ * 12;
  const r = R(room);
  if (r.puzzle === 'orb' && !S.solved[room]) {
    for (const [ox, oy] of [[0, 0], [fx_ * 6, fy_ * 6]]) {
      const tx = Math.floor((hx + ox) / 16), ty = Math.floor((hy + oy) / 16);
      if (tileAt(room, tx, ty) === 'q') { solveRoom('The orb flashes green. Somewhere, bars slide open.'); break; }
    }
  }
  if (statue && Math.abs(statue.x - hx) < 12 && Math.abs(statue.y - 4 - hy) < 14) {
    SFX.hit(); shake = 0.15;
    if (!S.flags.hitStatue) { S.flags.hitStatue = true; say([['', 'Your sword bounces off the stone.'], ['', 'It does not like that.']]); }
  }
}
function swingHits() {
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
function damageFoe(f) {
  if (f.inv > 0) return;
  f.hp--; f.fl = 0.15; f.inv = f.boss ? 0.45 : 0.2;
  const dx = f.x - P.x, dy = f.y - (P.y - 4), d = Math.hypot(dx, dy) || 1, kb = f.boss ? 70 : 170;
  f.kx = dx / d * kb; f.ky = dy / d * kb;
  if (f.boss) { SFX.bossHit(); shake = 0.12; } else SFX.hit();
  if (f.hp <= 0) {
    f.alive = false; S.kills = (S.kills || 0) + 1;
    burst(f.x, f.y, f.type === 'wisp' ? '#bfefff' : f.type === 'bat' ? '#c86cff' : f.type === 'mimic' ? '#d64541' : '#aaa', f.boss ? 40 : 10);
    if (f.boss) return bossDefeated(f);
    SFX.kill();
    if (Math.random() < 0.22 && S.hearts < S.maxHearts) items.push({ id: 'heart', x: f.x, y: f.y, drop: 6 });
  }
}
function hurt(src, dmg) {
  if (P.inv > 0 || mode !== 'play') return;
  S.hearts -= dmg || 1; P.inv = 1.2; SFX.hurt(); shake = 0.2; flash = 0.15;
  const dx = P.x - src.x, dy = P.y - src.y, d = Math.hypot(dx, dy) || 1;
  P.kx = dx / d * 140; P.ky = dy / d * 140;
  if (S.hearts <= 0) gameOver();
}
function solveRoom(msg) {
  if (S.solved[room]) return;
  S.solved[room] = 1; save(); SFX.secret();
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
  setSong(R(room).song);
  const L = { rooted: 'THE ROOTED ONE falls apart into dirt and old leaves.', listener: 'THE LISTENER closes its eye. The dark gets a little lighter.', miller: 'THE MILLER\'s mask cracks. There is nothing behind it but flour.' }[f.type];
  setTimeout(() => { spawnBossLoot(area); if (mode === 'play') say([['', L]]); }, 900);
}
function gotItem(it) {
  if (it.uid) S.taken[it.uid] = 1;
  const area = R(room).area;
  switch (it.id) {
    case 'heart': S.hearts = Math.min(S.maxHearts, S.hearts + 1); SFX.pick(); break;
    case 'key': S.keys[area] = (S.keys[area] || 0) + 1; SFX.key(); burst(P.x, P.y - 8, '#e8c23a');
      if (!S.flags.gotKey) { S.flags.gotKey = true; say([['', 'You got a KEY!'], ['', 'Walk into a locked door to open it. Keys only work in the place you found them.']]); } else showToast('KEY');
      break;
    case 'fkey': S.fkeys[area] = 1; SFX.key(); burst(P.x, P.y - 8, '#9fd3ff');
      if (!S.flags.gotFkey) { S.flags.gotFkey = true; say([['', 'You got the FLOOR KEY!'], ['', 'Find the locked hatch on this floor and go down.']]); } else showToast('FLOOR KEY');
      break;
    case 'page': S.pages[it.n] = 1; SFX.secret();
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

// ---------- update ----------
function update(dt) {
  T += dt;
  if (msgCool > 0) msgCool -= dt;
  if (fadeT > 0) fadeT -= dt;
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
  if (padStyle === 'stick' && (AXIS.x || AXIS.y)) { mx = AXIS.x; my = AXIS.y; }
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  if (P.swing > 0) { P.swing -= dt; mx *= 0.15; my *= 0.15; }
  const bx0 = P.x, by0 = P.y;
  const moving = Math.abs(mx) > 0.05 || Math.abs(my) > 0.05;
  P.running = moving && aHeld && P.swing <= 0;
  if (moving) {
    if (P.swing <= 0) P.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my > 0 ? 0 : 1);
    const onMarsh = tileAt(room, Math.floor(P.x / 16), Math.floor((P.y - 1) / 16)) === 'm';
    const sp = 64 * (P.running ? 1.75 : 1) * (onMarsh ? 0.7 : 1) * dt;
    const bx = P.x, by = P.y;
    moveBody(P, mx * sp, my * sp);
    // corner assist: slide around the edge of a blocking tile
    if (P.x === bx && mx && Math.abs(my) < 0.3) { const cy = Math.floor((P.y - 1) / 16) * 16 + 9; const ny = P.y + Math.sign(cy - P.y) * Math.min(sp, Math.abs(cy - P.y)); if (Math.abs(cy - P.y) > 0.5 && boxFree(P.x + Math.sign(mx) * 2, cy, P)) moveBody(P, 0, ny - P.y); }
    if (P.y === by && my && Math.abs(mx) < 0.3) { const cx = Math.floor(P.x / 16) * 16 + 8; const nx = P.x + Math.sign(cx - P.x) * Math.min(sp, Math.abs(cx - P.x)); if (Math.abs(cx - P.x) > 0.5 && boxFree(cx, P.y + Math.sign(my) * 2, P)) moveBody(P, nx - P.x, 0); }
    P.anim += dt * (P.running ? 1.8 : 1); P.step = ((P.anim * 7) | 0) % 2;
    if (P.running) { P.dust -= dt; if (P.dust <= 0) { P.dust = 0.09; puff(P.x - FV[P.dir][0] * 4, P.y + 1); } }
    // bumping into things: doors, hatches, push blocks
    const blocked = P.x === bx && P.y === by;
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
    if (b.mv <= 0) { b.mv = 0; b.x = b.tx * 16; b.y = b.ty * 16; checkPlates(); }
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
  let ox = 0, oy = 0;
  if (shake > 0) { ox = rnd(-2, 2) | 0; oy = rnd(-2, 2) | 0; }
  g.save(); g.translate(ox, oy);
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) {
    let ch = tileAt(room, tx, ty);
    if (flick && flick.tx === tx && flick.ty === ty) ch = flick.ch;
    drawTile(ch, tx, ty, T, r);
  }
  // blocks
  for (const b of blocks) drawBlock(b, r);
  if (room === 'village' && c === 0) drawHuman(g, PAL.statue, 0, 6 * 16 + 8, HUD + 7 * 16 + 9, 0);
  if (room === 'lake' && c >= 1 && Math.sin(T * 0.7) > 0.85) { g.globalAlpha = 0.25; g.fillStyle = '#0a1a33'; g.fillRect(7 * 16 + 9, HUD + 6 * 16, 10, 14); g.globalAlpha = 1; }
  if (room === 'lake' && c >= 3 && mode !== 'ending') {
    const a = 0.25 + 0.2 * Math.sin(T * 3);
    drawHuman(g, PAL.wren, 0, 3 * 16 + 8, HUD + 6 * 16 + 12, 0, Math.random() < 0.05 ? 0.9 : a);
  }
  // spikes (telegraphs)
  for (const s of spikes) {
    if (s.t < s.warn) { g.fillStyle = 'rgba(200,40,40,' + (0.25 + 0.3 * Math.sin(s.t * 30)) + ')'; g.fillRect((s.x - 8) | 0, (HUD + s.y - 4) | 0, 16, 8); }
    else { g.fillStyle = '#4a3420'; for (let i = -2; i <= 2; i++) { const h = 10 - Math.abs(i) * 2; g.fillRect((s.x + i * 3) | 0, (HUD + s.y + 3 - h) | 0, 2, h); } }
  }
  // items
  for (const it of items) drawItem(it);
  // sort characters by y
  const list = [];
  for (const n of npcs) list.push({ y: n.y, f: () => drawNpc(n) });
  if (statue) list.push({ y: statue.y, f: () => drawHuman(g, c >= 3 || (mode === 'ending') ? PAL.statueR : PAL.statue, statue.fixed ? 0 : faceToward(statue), statue.x + (statue.moving > 0 ? rnd(-0.6, 0.6) : 0), HUD + statue.y, 0) });
  for (const f of foes) if (f.type === 'crawler' || f.type === 'mimic' || f.boss) list.push({ y: f.y + 4, f: () => drawFoe(f) });
  const pAlpha = mode === 'ending' && ending.phase >= 2 ? Math.max(0, 1 - ending.t / 4) : 1;
  if (!(P.inv > 0 && ((T * 20) | 0) % 2)) list.push({ y: P.y, f: () => drawPlayer(pAlpha) });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  for (const f of foes) if (f.type === 'wisp' || f.type === 'bat') drawFoe(f);
  for (const s of shots) drawShot(s);
  for (const p of fx) {
    if (p.puff) { g.globalAlpha = Math.max(0, p.t / 0.35) * 0.8; g.fillStyle = p.col; g.fillRect((p.x - 1) | 0, (HUD + p.y - 1) | 0, 3, 3); g.globalAlpha = 1; }
    else { g.fillStyle = p.col; g.fillRect(p.x | 0, (HUD + p.y) | 0, 2, 2); }
  }
  g.restore();
  if (r.night) { g.fillStyle = 'rgba(5,10,40,.45)'; g.fillRect(0, HUD, W, PH); }
  if (r.dark) {
    renderDark();
    for (const f of foes) if (f.type === 'wisp' || f.type === 'listener') drawFoe(f);
    for (const s of shots) drawShot(s);
    for (const it of items) if (it.id !== 'heart') drawItem(it, true);
  }
  // boss health bar
  const boss = foes.find(f => f.boss && f.alive);
  if (boss) {
    g.fillStyle = '#000'; g.fillRect(W / 2 - 52, HUD + PH - 9, 104, 6);
    g.fillStyle = '#5a1018'; g.fillRect(W / 2 - 51, HUD + PH - 8, 102, 4);
    g.fillStyle = '#e8384f'; g.fillRect(W / 2 - 51, HUD + PH - 8, (102 * boss.hp / boss.maxhp) | 0, 4);
  }
  renderHud();
}
function drawBlock(b, r) {
  const x = b.x | 0, y = (HUD + b.y) | 0, p = palFor(r);
  g.fillStyle = '#222'; g.fillRect(x + 1, y + 2, 15, 14);
  g.fillStyle = r.pal === 'mill' ? '#9a7040' : '#7a7a84'; g.fillRect(x + 1, y + 1, 14, 13);
  g.fillStyle = r.pal === 'mill' ? '#b88a50' : '#9a9aa6'; g.fillRect(x + 2, y + 2, 12, 3);
  g.fillStyle = p.wall2; g.fillRect(x + 4, y + 7, 8, 1); g.fillRect(x + 4, y + 10, 8, 1);
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
  drawHuman(g, pal, dir, n.x, HUD + n.y, 0);
}
function drawPlayer(alpha) {
  const y = mode === 'ending' && ending.phase >= 2 ? P.y + Math.min(10, ending.t * 2.5) : P.y;
  const swingNow = P.swing > 0;
  if (swingNow && P.dir === 1) drawSwing(alpha, y);
  if (swingNow) { drawHuman(g, PAL.player, P.dir, P.x, HUD + y, 0, alpha, true); if (P.dir !== 1) drawSwing(alpha, y); return; }
  const bob = P.running && P.step ? -1 : 0;
  drawHuman(g, PAL.player, P.dir, P.x, HUD + y + bob, P.step, alpha);
  if (P.hidden) { g.fillStyle = '#5cbc4c'; for (let i = 0; i < 5; i++) g.fillRect(P.x - 5 + i * 2, HUD + y - 5, 1, 5); }
}
function drawSwing(alpha, y) {
  const [fx_, fy_] = FV[P.dir];
  const k = 1 - P.swing / SWING;
  const e = k < 0.25 ? -0.25 : k < 0.6 ? ((k - 0.25) / 0.35) : 1;
  const base = Math.atan2(fy_, fx_);
  const ang = base + (-1.25 + e * 2.5) * (P.dir === 2 || P.dir === 1 ? -1 : 1);
  const sx = P.x + (P.dir === 2 ? -3 : P.dir === 3 ? 3 : (P.dir === 0 ? 4 : -4)), sy = HUD + y - 6;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  g.globalAlpha = alpha === undefined ? 1 : alpha;
  for (let i = 0; i < 5; i++) { g.fillStyle = i < 2 ? PAL.player.c : PAL.player.s; g.fillRect((sx + ca * i) | 0, (sy + sa * i) | 0, 2, 2); }
  const hx = sx + ca * 5, hy = sy + sa * 5;
  g.fillStyle = '#6b4320'; g.fillRect((hx) | 0, (hy) | 0, 2, 2);
  g.fillStyle = '#e8b830'; g.fillRect((hx + ca * 2 - sa * 2) | 0, (hy + sa * 2 + ca * 2) | 0, 1, 1); g.fillRect((hx + ca * 2 + sa * 2) | 0, (hy + sa * 2 - ca * 2) | 0, 1, 1); g.fillRect((hx + ca * 2) | 0, (hy + sa * 2) | 0, 2, 2);
  for (let i = 3; i < 13; i++) { g.fillStyle = i === 12 ? '#ffffff' : '#c9d3dc'; g.fillRect((hx + ca * i) | 0, (hy + sa * i) | 0, 2, 2); }
  if (k > 0.25 && k < 0.75) {
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let t = 1; t <= 4; t++) { const a2 = ang - t * 0.22 * (P.dir === 2 || P.dir === 1 ? -1 : 1); g.fillRect((hx + Math.cos(a2) * 11) | 0, (hy + Math.sin(a2) * 11) | 0, 2, 2); }
  }
  g.globalAlpha = 1;
}
function drawFoe(f) {
  const hit = f.fl > 0 && ((T * 30) | 0) % 2 === 0;
  const x = f.x | 0, y = (HUD + f.y) | 0;
  if (f.type === 'wisp') {
    const yy = (y + Math.sin(f.t * 5) * 1.5) | 0;
    g.fillStyle = 'rgba(160,220,255,.25)'; g.fillRect(x - 6, yy - 6, 12, 12);
    g.fillStyle = hit ? '#fff' : '#bfefff'; g.fillRect(x - 3, yy - 4, 6, 8); g.fillRect(x - 4, yy - 3, 8, 6);
    g.fillStyle = '#ffffff'; g.fillRect(x - 2, yy - 3, 3, 3);
    g.fillStyle = '#123'; g.fillRect(x - 2, yy, 1, 1); g.fillRect(x + 1, yy, 1, 1);
    return;
  }
  if (f.type === 'bat') {
    const flap = ((f.t * 14) | 0) % 2, gl = Math.random() < 0.15;
    if (gl) { g.fillStyle = 'rgba(255,0,220,.6)'; g.fillRect(x - 6 + 2, y - 2, 12, 3); g.fillStyle = 'rgba(0,229,255,.6)'; g.fillRect(x - 6 - 2, y - 1, 12, 3); }
    g.fillStyle = hit ? '#fff' : '#2a1238';
    g.fillRect(x - 2, y - 3, 4, 5);
    if (flap) { g.fillRect(x - 7, y - 4, 5, 2); g.fillRect(x + 2, y - 4, 5, 2); g.fillRect(x - 6, y - 2, 2, 2); g.fillRect(x + 4, y - 2, 2, 2); }
    else { g.fillRect(x - 7, y, 5, 2); g.fillRect(x + 2, y, 5, 2); g.fillRect(x - 5, y - 1, 3, 1); g.fillRect(x + 2, y - 1, 3, 1); }
    g.fillStyle = '#ff3a6a'; g.fillRect(x - 1, y - 2, 1, 1); g.fillRect(x + 1, y - 2, 1, 1);
    return;
  }
  if (f.type === 'crawler') {
    const warn = f.st === 'warn';
    const leg = ((f.t * (f.st === 'rush' ? 24 : 8)) | 0) % 2;
    g.fillStyle = hit ? '#fff' : warn ? '#7a2020' : '#1b1b1f';
    g.fillRect(x - 4, y - 3, 8, 6); g.fillRect(x - 3, y - 4, 6, 8);
    g.fillStyle = hit ? '#fff' : '#2d2d33';
    for (let i = 0; i < 3; i++) { const o = (i + leg) % 2; g.fillRect(x - 7, y - 3 + i * 3 + o, 3, 1); g.fillRect(x + 4, y - 3 + i * 3 + (1 - o), 3, 1); }
    g.fillStyle = warn ? '#ffef5a' : '#e8e8e8'; g.fillRect(x - 2 + f.dx, y - 1 + f.dy, 1, 1); g.fillRect(x + 1 + f.dx, y - 1 + f.dy, 1, 1);
    return;
  }
  if (f.type === 'mimic') {
    if (hit) { drawHuman(g, { h: '#fff', s: '#fff', k: '#fff', c: '#fff', p: '#fff', b: '#fff' }, f.dir || 0, f.x, HUD + f.y + 4, 0); return; }
    g.globalAlpha = 0.25; g.fillStyle = '#000'; g.fillRect(x - 5, y + 3, 10, 2); g.globalAlpha = 1;
    drawHuman(g, PAL.mimic, f.dir || 0, f.x + (Math.random() < 0.04 ? rnd(-2, 2) : 0), HUD + f.y + 4, f.moving ? ((T * 7) | 0) % 2 : 0, 0.92);
    return;
  }
  if (f.type === 'rooted') {
    g.fillStyle = hit ? '#fff' : '#3a2814';
    g.fillRect(x - 8, y - 10, 16, 22); g.fillRect(x - 11, y + 6, 22, 6);
    g.fillStyle = hit ? '#fff' : '#2a1c0c';
    const sw = Math.sin(T * 2) * 2;
    g.fillRect(x - 14 + sw, y - 20, 2, 12); g.fillRect(x - 18 + sw, y - 20, 6, 2); g.fillRect(x - 16 + sw, y - 26, 2, 7);
    g.fillRect(x + 12 - sw, y - 20, 2, 12); g.fillRect(x + 12 - sw, y - 20, 6, 2); g.fillRect(x + 14 - sw, y - 26, 2, 7);
    g.fillRect(x - 10, y - 12, 4, 4); g.fillRect(x + 6, y - 12, 4, 4);
    g.fillStyle = f.hp <= f.maxhp / 2 ? '#ff4a3a' : '#f0d040'; g.fillRect(x - 5, y - 5, 3, 2); g.fillRect(x + 2, y - 5, 3, 2);
    g.fillStyle = '#000'; g.fillRect(x - 3, y + 1, 6, 4);
    return;
  }
  if (f.type === 'listener') {
    const a = f.alpha === undefined ? 1 : f.alpha;
    g.globalAlpha = a * 0.3; g.fillStyle = '#d8e8ff'; g.fillRect(x - 20, y - 18, 40, 36); g.globalAlpha = a;
    g.fillStyle = hit ? '#fff' : '#c9c2b8'; g.fillRect(x - 14, y - 12, 28, 24); g.fillRect(x - 11, y - 15, 22, 30); g.fillRect(x - 17, y - 8, 34, 16);
    g.fillStyle = '#efe9df'; g.fillRect(x - 9, y - 7, 18, 12);
    const ex = clamp((P.x - f.x) / 20, -4, 4) | 0, ey = clamp((P.y - 6 - f.y) / 20, -2, 2) | 0;
    g.fillStyle = f.hp <= f.maxhp / 2 ? '#a01818' : '#2a4a7a'; g.fillRect(x - 4 + ex, y - 4 + ey, 8, 7);
    g.fillStyle = '#000'; g.fillRect(x - 2 + ex, y - 2 + ey, 4, 3);
    g.fillStyle = '#8a8278'; for (let i = 0; i < 5; i++) g.fillRect(x - 12 + i * 6, y + 13 + (((T * 6 + i) | 0) % 2), 2, 4);
    g.globalAlpha = 1;
    return;
  }
  if (f.type === 'miller') {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 7, y + 10, 14, 3);
    g.fillStyle = hit ? '#fff' : '#4a3020'; g.fillRect(x - 6, y - 8, 12, 18); g.fillRect(x - 8, y - 4, 16, 10);
    g.fillStyle = hit ? '#fff' : '#2a1c10'; g.fillRect(x - 5, y + 10, 4, 3); g.fillRect(x + 1, y + 10, 4, 3);
    g.fillStyle = '#efe9df'; g.fillRect(x - 5, y - 20, 10, 12); g.fillRect(x - 4, y - 21, 8, 1);
    g.fillStyle = '#111'; g.fillRect(x - 3, y - 16, 2, 1); g.fillRect(x + 1, y - 16, 2, 1);
    g.fillStyle = '#c9b27a'; g.fillRect(x + 7, y - 6, 7, 9); g.fillStyle = '#a8905a'; g.fillRect(x + 8, y - 7, 5, 2);
    return;
  }
}
function drawShot(s) {
  const x = s.x | 0, y = (HUD + s.y) | 0;
  if (s.kind === 'sickle') { const a = s.t * 14; g.fillStyle = '#d0d0d8'; for (let i = 0; i < 4; i++) { const aa = a + i * 0.5; g.fillRect((x + Math.cos(aa) * 4) | 0, (y + Math.sin(aa) * 4) | 0, 2, 2); } g.fillStyle = '#6b4320'; g.fillRect(x - 1, y - 1, 2, 2); return; }
  g.fillStyle = 'rgba(220,240,255,.35)'; g.fillRect(x - 4, y - 4, 8, 8);
  g.fillStyle = '#e8f4ff'; g.fillRect(x - 2, y - 2, 4, 4);
}
function drawItem(it, glow) {
  const bob = Math.sin(T * 4) * 1.5;
  const x = it.x | 0, y = (HUD + it.y + bob) | 0;
  if (it.id === 'heart') { if (it.drop && it.drop < 1.5 && ((T * 10) | 0) % 2) return; drawHeart(it.x - 4, HUD + it.y - 4, true); return; }
  if (it.hidden && !glow && !(Math.sin(T * 2.2) > 0.6) && !S.taken[it.uid]) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 1, y - 1, 2, 2); return; }
  if (it.id === 'piece') { drawShard(x, y); return; }
  if (it.id === 'key' || it.id === 'fkey') {
    g.fillStyle = it.id === 'fkey' ? 'rgba(150,210,255,.3)' : 'rgba(255,230,120,.3)'; g.fillRect(x - 6, y - 6, 12, 12);
    g.fillStyle = it.id === 'fkey' ? '#9fd3ff' : '#e8c23a';
    g.fillRect(x - 4, y - 4, 5, 5); g.fillRect(x, y - 2, 6, 2); g.fillRect(x + 3, y, 1, 2); g.fillRect(x + 5, y, 1, 3);
    g.fillStyle = '#000'; g.fillRect(x - 3, y - 3, 3, 3);
    return;
  }
  if (it.id === 'page') {
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x - 6, y - 7, 12, 14);
    g.fillStyle = '#efe6cf'; g.fillRect(x - 4, y - 5, 8, 10); g.fillStyle = '#7a6a4a'; for (let i = 0; i < 3; i++) g.fillRect(x - 3, y - 3 + i * 3, 6, 1);
    return;
  }
  if (it.id === 'lantern') {
    g.fillStyle = 'rgba(255,210,120,.3)'; g.fillRect(x - 8, y - 8, 16, 16);
    g.fillStyle = '#555'; g.fillRect(x - 3, y - 6, 6, 2); g.fillRect(x - 1, y - 8, 2, 2);
    g.fillStyle = '#ffd36a'; g.fillRect(x - 3, y - 4, 6, 7); g.fillStyle = '#fff4c0'; g.fillRect(x - 1, y - 2, 2, 3);
    g.fillStyle = '#555'; g.fillRect(x - 4, y + 3, 8, 2);
    return;
  }
  if (it.id === 'hc') {
    g.fillStyle = 'rgba(255,90,110,.3)'; g.fillRect(x - 8, y - 8, 16, 16);
    const rows = ['.xxx.xxx.', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'];
    rows.forEach((row, j) => { for (let i = 0; i < 9; i++) if (row[i] === 'x') { g.fillStyle = j < 2 && i > 1 && i < 4 ? '#ffb0bc' : '#e8384f'; g.fillRect(x - 4 + i, y - 4 + j, 1, 1); } });
    return;
  }
}
function drawShard(x, y) {
  x |= 0; y |= 0;
  g.fillStyle = 'rgba(255,230,120,.3)'; g.fillRect(x - 6, y - 6, 12, 12);
  g.fillStyle = '#e8b830'; g.fillRect(x - 1, y - 5, 3, 10); g.fillRect(x - 3, y - 3, 7, 6);
  g.fillStyle = '#fff3b0'; g.fillRect(x - 1, y - 3, 2, 3);
}
function drawHeart(x, y, full) {
  const rows = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
  g.fillStyle = full ? '#e8384f' : '#4a1d24';
  rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === 'x') g.fillRect(x + i, y + j, 1, 1); });
}
function renderDark() {
  dg.globalCompositeOperation = 'source-over';
  dg.fillStyle = '#000'; dg.fillRect(0, 0, PW, PH);
  dg.globalCompositeOperation = 'destination-out';
  const rad = (S.lantern ? 74 : 36) + Math.sin(T * 6) * 1.5;
  const gr = dg.createRadialGradient(P.x, P.y - 6, 6, P.x, P.y - 6, rad);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  dg.fillStyle = gr; dg.beginPath(); dg.arc(P.x, P.y - 6, rad, 0, Math.PI * 2); dg.fill();
  g.drawImage(dark, 0, HUD);
}
function renderHud() {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, HUD);
  for (let i = 0; i < S.maxHearts; i++) drawHeart(4 + i * 9, 5, i < S.hearts);
  const r = R(room);
  g.font = '8px monospace'; g.textBaseline = 'middle';
  let hx = 4 + S.maxHearts * 9 + 4;
  if (r.dungeon) {
    g.fillStyle = '#e8c23a'; g.fillRect(hx, 5, 4, 4); g.fillRect(hx + 4, 6, 4, 2); g.fillRect(hx + 6, 8, 1, 2);
    g.fillStyle = '#000'; g.fillRect(hx + 1, 6, 2, 2);
    g.fillStyle = '#ddd'; g.textAlign = 'left'; g.fillText('x' + (S.keys[r.area] || 0), hx + 9, 8);
  } else if (r.gen) {
    const has = S.fkeys[r.area];
    g.fillStyle = has ? '#9fd3ff' : '#2a3a4a'; g.fillRect(hx, 5, 4, 4); g.fillRect(hx + 4, 6, 4, 2); g.fillRect(hx + 6, 8, 1, 2);
    g.fillStyle = '#000'; g.fillRect(hx + 1, 6, 2, 2);
  }
  const c = C();
  for (let i = 0; i < 3; i++) {
    const x = W - 34 + i * 11, y = 8;
    g.fillStyle = i < c ? '#e8b830' : '#3a3220'; g.fillRect(x - 1, y - 4, 3, 8); g.fillRect(x - 3, y - 2, 7, 4);
  }
  if (r.depth) {
    g.fillStyle = r.depth >= 7 && Math.random() < 0.03 ? '#d64541' : '#9fd3ff'; g.textAlign = 'right';
    g.fillText((S.deep ? '∞' : '') + 'B' + r.depth, W - 40, 8);
  }
  g.fillStyle = '#777'; g.textAlign = 'center';
  let label = S.name;
  if (visC() >= 2 && Math.sin(T * 0.9) > 0.97) label = 'WREN';
  if (r.depth >= 5 && Math.random() < 0.004 * r.depth) label = timeStr();
  g.fillText(label, W / 2 + 8, 8);
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
function renderAttract() {
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) drawTile(ty < 3 ? 'S' : '~', tx, ty, T * 0.5, null);
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
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) drawTile(ROOMS.lake.map[ty][tx], tx, ty, T, ROOMS.lake);
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
let noiseImg = null;
function staticNoise(a) {
  if (!noiseImg) noiseImg = g.createImageData(W, H);
  const d = noiseImg.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 * a; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(noiseImg, 0, 0);
}
function blit() {
  out.setTransform(1, 0, 0, 1, 0, 0);
  const c = mode === 'play' || mode === 'dialog' || mode === 'paused' || mode === 'ending' || mode === 'map' ? visC() : 0;
  const filt = c >= 3 ? 'saturate(0.45) contrast(1.1)' : c >= 2 ? 'saturate(0.8)' : 'none';
  if (out.filter !== undefined) out.filter = filt;
  if (tear > 0) {
    for (let y = 0; y < H; y += 8) {
      const off = Math.random() < 0.3 ? rnd(-10, 10) | 0 : 0;
      out.drawImage(buf, 0, y, W, 8, off, y, W, 8);
    }
  } else out.drawImage(buf, 0, 0);
  if (out.filter !== undefined) out.filter = 'none';
  if (staticT > 0) {
    out.globalAlpha = 0.6; g.save(); staticNoise(1); g.restore(); out.drawImage(buf, 0, 0); out.globalAlpha = 1;
  }
  if (flash > 0) { out.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, flash * 3) + ')'; out.fillRect(0, 0, W, H); }
}

// ---------- end panel ----------
$('endTitle').onclick = () => { $('endPanel').classList.remove('show'); openFiles(); };

// ---------- loop ----------
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  try { update(dt); } catch (e) { console.error(e); }
  musicTick();
  render();
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
  get mode() { return mode; }, get S() { return S; }, get room() { return room; }, P, C, R, SHW, held,
  get foes() { return foes; }, get items() { return items; }, get npcs() { return npcs; }, get blocks() { return blocks; }, get statue() { return statue; },
  enterRoom: (r, x, y) => enterRoom(r, x, y), tileAt: (r, x, y) => tileAt(r, x, y), goFloor: (f, w) => goFloor(f, w || 'start'),
  setA: v => { aHeld = !!v; }, noStatue: () => { statue = null; }, damage: n => { P.inv = 0; hurt({ x: P.x, y: P.y + 1 }, n || 1); },
};
})();
