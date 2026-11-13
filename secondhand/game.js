/* Secondhand · a game by Buggy Games YT · © 2026 Buggy Games YT. All rights reserved. */
(() => {
'use strict';

// ---------- constants ----------
const W = 256, H = 192, TS = 16, RW = 16, RH = 11, HUD = 16, PW = 256, PH = 176;
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
const KEY = 'secondhand-save-v1', META = 'secondhand-meta-v1';
let S = null; // current run
let M = { visits: 0, lastPlayed: 0, wrenSeen: false, ended: false, endName: '', slot3Taps: 0 };
try { const m = JSON.parse(localStorage.getItem(META) || 'null'); if (m) M = Object.assign(M, m); } catch (e) {}
try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
function saveMeta() { try { localStorage.setItem(META, JSON.stringify(M)); } catch (e) {} }
function save() { if (!S) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function newRun(name) {
  return { name, shards: { woods: false, cave: false, field: false }, deaths: 0, hearts: 3, room: 'village',
    x: 7.5 * 16, y: 6 * 16 + 8, playMs: 0, met: {}, flags: {}, statueSteps: 0, caught: 0 };
}
const C = () => S ? (S.shards.woods ? 1 : 0) + (S.shards.cave ? 1 : 0) + (S.shards.field ? 1 : 0) : 0;
let muted = false;
try { muted = localStorage.getItem('secondhand-mute') === '1'; } catch (e) {}

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
function fill(s) {
  const n = S ? S.name : 'PLAYER';
  return s.replace(/\{N\}/g, n).replace(/\{T\}/g, timeStr()).replace(/\{D\}/g, dayStr())
    .replace(/\{M\}/g, String(minsPlayed())).replace(/\{X\}/g, String(S ? S.deaths : 0));
}

// ---------- rooms ----------
const ROOMS = {
  village: { name: 'MILLBROOK', song: 'main', n: 'field', s: 'lake', w: 'woods', e: 'cave', map: [
    'TTTTTTT==TTTTTTT',
    'T.RRR..==..RRRRT',
    'T.HDH..==..HHDHT',
    'T......==......T',
    'T..,...==...,..T',
    '================',
    'T......==......T',
    'T.,...P==....,.T',
    'T..ff..==..ff..T',
    'T......==......T',
    'TTTTTTT==TTTTTTT'] },
  woods: { name: 'THE WOODS', song: 'main', e: 'village', map: [
    'TTTTTTTTTTTTTTTT',
    'T..T....T...T..T',
    'T..T.TT.T.T.T..T',
    'T.TT.T..T.T...TT',
    'T....T.TT.TTT..T',
    'TT.T.T......T..=',
    'T..T.TTTTT.T...T',
    'T.TT.....T.T.T.T',
    'T....TTT.T...T.T',
    'T.T.....,..T...T',
    'TTTTTTTTTTTTTTTT'] },
  cave: { name: 'THE CAVE', song: 'cave', w: 'village', dark: true, map: [
    'CCCCCCCCCCCCCCCC',
    'CcccccCccccccccC',
    'CcCCCcCcCCCCCCcC',
    'CcCccccCcccccCcC',
    'CcCcCCCCcCCCcCcC',
    'cccccCccccCccccC',
    'CCCCcCcCCCCCCcCC',
    'CccccCcccccccccC',
    'CcCCCCCCCCCCCCcC',
    'CccccccccccccccC',
    'CCCCCCCCCCCCCCCC'] },
  field: { name: 'THE HIGH FIELD', song: 'main', s: 'village', n: 'void', map: [
    'TTTTTTTTTTTTTTTT',
    'T..wwww...wwww.T',
    'T.wwwwww.wwwwwwT',
    'T.ww..ww.ww..w.T',
    'T....,.....,...T',
    'T..r...==...r..T',
    'T.wwww.==.wwwwwT',
    'T.wwwww==wwwww.T',
    'T......==....M.T',
    'T,.....==.....,T',
    'TTTTTTT==TTTTTTT'] },
  lake: { name: 'THE LAKE', song: 'lake', n: 'village', map: [
    'TTTTTTT==TTTTTTT',
    'TSSSSSS==SSSSSST',
    'TSSSSSSSSSSSSSST',
    'T~~~~~~dd~~~~~~T',
    '~~~~~~~dd~~~~~~~',
    '~~~~~~~dd~~~~~~~',
    '~~~~~~~dd~~~~~~~',
    '~~~~~~~dd~~~~~~~',
    '~~~~~~~dd~~~~~~~',
    '~~~~~~dddd~~~~~~',
    '~~~~~~~BB~~~~~~~'] },
  void: { name: '', song: 'void', s: 'field', map: [
    'xxxxxxxxxxxxxxxx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xvvvvvvvvvvvvvvx',
    'xxxxxxxvvxxxxxxx'] },
};
const SOLID = new Set(['T', 'R', 'H', 'D', 'f', 'P', 'r', '~', 'B', 'C', 'M', 'x']);
function tileAt(room, tx, ty) {
  const r = ROOMS[room];
  tx = clamp(tx, 0, RW - 1); ty = clamp(ty, 0, RH - 1);
  let ch = r.map[ty][tx];
  if (room === 'field' && ty === 0 && (tx === 7 || tx === 8) && C() >= 2) ch = '=';
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
};
function drawHuman(ctx, pal, dir, x, y, step, alpha) {
  // x,y = feet center in screen coords
  let rows = dir === 1 ? HUMAN.up : dir === 0 ? HUMAN.down : HUMAN.side;
  if (step) {
    rows = rows.slice();
    const wk = dir >= 2 ? WALK.side : WALK.down;
    rows[11] = wk[1]; rows[12] = wk[1]; rows[13] = wk[2];
  }
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
const GLITCHABLE = ['.', ',', 'w', '=', 'T', 'S', 'r', '~', 'C', 'c', 'Q'];
function grass(x, y, tx, ty) {
  g.fillStyle = '#3d8b3d'; g.fillRect(x, y, 16, 16);
  g.fillStyle = '#4fa049';
  for (let i = 0; i < 4; i++) { const a = hash(tx, ty, i); const b = hash(ty, tx, i + 9); g.fillRect(x + ((a * 14) | 0), y + ((b * 13) | 0), 1, 3); }
}
function drawTile(ch, tx, ty, t) {
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
    case '~': {
      g.fillStyle = '#1f4f93'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#3b72bd';
      const o = ((t * 6 + tx * 3 + ty * 5) | 0) % 16;
      g.fillRect(x + o % 16, y + 4, 4, 1); g.fillRect(x + (o + 8) % 16, y + 11, 4, 1);
      break; }
    case 'd': g.fillStyle = '#1f4f93'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#8a5a2b'; g.fillRect(x, y, 16, 16); g.fillStyle = '#6b4320';
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
    case 'x': g.fillStyle = '#000'; g.fillRect(x, y, 16, 16); break;
    case 'v': g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
      if (hash(tx, ty, (t * 2) | 0) < 0.04) { g.fillStyle = '#0d1a26'; g.fillRect(x, y, 16, 1); }
      break;
    case 'Q': // missing texture
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
  hurt() { if (!AC) return; const t = AC.currentTime; tone(160, t, 0.2, 'sawtooth', sfxG, 0.15); tone(110, t + 0.08, 0.25, 'square', sfxG, 0.12); },
  pick() { if (!AC) return; const t = AC.currentTime; [72, 76, 79, 84].forEach((m, i) => tone(mtof(m), t + i * 0.08, 0.18, 'square', sfxG, 0.12)); },
  shard() { if (!AC) return; const t = AC.currentTime; [69, 72, 76, 81, 80].forEach((m, i) => tone(mtof(m), t + i * 0.13, 0.35, 'square', sfxG, 0.12, i === 4 ? -40 : 0)); },
  grind() { if (!AC) return; noise(AC.currentTime, 0.18, 0.05, 260); },
  sting() { if (!AC) return; const t = AC.currentTime; [49, 50, 55, 56, 61].forEach(m => tone(mtof(m), t, 1.4, 'sawtooth', sfxG, 0.07)); noise(t, 0.9, 0.35, 3000); },
  static(d) { if (!AC) return; noise(AC.currentTime, d || 0.5, 0.25, 6000); },
  bell(rev) {
    if (!AC) return; const t = AC.currentTime;
    if (!rev) { [[72, 0.25], [79, 0.12], [84, 0.08], [88, 0.05]].forEach(([m, v]) => tone(mtof(m), t, 3.5, 'sine', sfxG, v)); }
    else { [[72, 0.22], [79, 0.1], [84, 0.07], [88, 0.04]].forEach(([m, v]) => tone(mtof(m) * 0.94, t, 3, 'sine', sfxG, v, 0, 2.9)); }
  },
  door() { if (!AC) return; tone(90, AC.currentTime, 0.15, 'square', sfxG, 0.1); },
  ok() { if (!AC) return; const t = AC.currentTime; tone(mtof(76), t, 0.08, 'square', sfxG, 0.1); tone(mtof(83), t + 0.07, 0.12, 'square', sfxG, 0.1); },
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
  void: { step: 0.5, lt: 'sine', bt: 'sine', lv: 0.0, bv: 0.12,
    lead: [0, 0, 0, 0, 0, 0, 0, 0], bass: [33, 0, 0, 0, 34, 0, 0, 0] },
  boot: null,
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
let pressA = false, pressB = false;
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  audioInit();
  if (KEYMAP[e.code]) { held[KEYMAP[e.code]] = true; e.preventDefault(); return; }
  if (e.repeat) return;
  if (['KeyZ', 'Space', 'Enter', 'KeyJ'].includes(e.code)) { pressA = true; e.preventDefault(); onA(); }
  else if (['KeyX', 'Escape', 'KeyK', 'Backspace'].includes(e.code)) { pressB = true; e.preventDefault(); onB(); }
  else if (e.code === 'KeyP') { if (mode === 'play') openPause(); }
  else if (e.code === 'KeyM') { setMute(!muted); refreshPause(); }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) held[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { held.up = held.down = held.left = held.right = false; });

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
pad.addEventListener('pointerdown', e => { audioInit(); padId = e.pointerId; pad.setPointerCapture(e.pointerId); padSet(e); e.preventDefault(); });
pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padSet(e); });
const padEnd = e => { if (e.pointerId !== padId) return; padId = null; held.up = held.down = held.left = held.right = false; pad.dataset.d = ''; };
pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);
function btn(id, fn) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { audioInit(); b.classList.add('on'); e.preventDefault(); fn(); });
  const up = () => b.classList.remove('on');
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
}
btn('btnA', () => { pressA = true; onA(); });
btn('btnB', () => { pressB = true; onB(); });
$('pauseBtn').addEventListener('click', () => { if (mode === 'play') openPause(); });
let touchMode = matchMedia('(pointer: coarse)').matches;
addEventListener('touchstart', () => { if (!touchMode) { touchMode = true; layout(); } }, { passive: true });
cv.addEventListener('pointerdown', () => { audioInit(); if (mode === 'boot' || mode === 'dialog' || mode === 'card') onA(); });

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
  touchEl.classList.toggle('on', touchMode && (mode === 'play' || mode === 'dialog' || mode === 'boot' || mode === 'card'));
  $('pauseBtn').classList.toggle('on', touchMode && mode === 'play');
}
addEventListener('resize', layout);

// ---------- game state ----------
let mode = 'cart'; // cart | boot | files | name | play | dialog | paused | card | over | ending | memory
let T = 0, last = performance.now();
const P = { x: 0, y: 0, dir: 0, step: 0, anim: 0, inv: 0, swing: 0, kx: 0, ky: 0, entryX: 0, entryY: 0, hidden: false };
let room = 'village';
let npcs = [], wisps = [], items = [], statue = null, fx = [];
let flick = null, tear = 0, staticT = 0, flash = 0, shake = 0;
let fadeA = 0, fadeTo = 0;
let ending = null;

function enterRoom(name, x, y) {
  room = name; S.room = name; P.x = x; P.y = y; P.entryX = x; P.entryY = y;
  npcs = []; wisps = []; items = []; fx = []; statue = null;
  const c = C();
  if (name === 'village') {
    if (c < 3) npcs.push({ id: 'elder', x: 4.5 * 16, y: 3 * 16 + 14, dir: 0, pal: 'elder' });
    else npcs.push({ id: 'elder', x: 7.5 * 16 + 8, y: 9 * 16 + 4, dir: 1, pal: 'noface' });
    if (c < 3) npcs.push({ id: 'kid', x: 10.5 * 16, y: 8 * 16 + 14, dir: 2, pal: 'kid' });
    if (c < 3) npcs.push({ id: 'shop', x: 13.5 * 16, y: 3 * 16 + 14, dir: 0, pal: 'shop' });
  }
  if (name === 'void') npcs.push({ id: 'wren', x: 7.5 * 16 + 8, y: 4 * 16 + 14, dir: 0, pal: 'wren', ghost: true });
  if (name === 'woods') {
    [[6.5, 3.5], [10.5, 7.5], [3.5, 8.5]].forEach(([a, b]) => wisps.push(mkWisp(a * 16, b * 16)));
    if (!S.shards.woods) items.push({ id: 'woods', x: 1.5 * 16, y: 1.5 * 16 });
  }
  if (name === 'cave') {
    [[8.5, 3.5], [12.5, 7.5], [5.5, 9.5], [12.5, 1.5]].forEach(([a, b]) => wisps.push(mkWisp(a * 16, b * 16)));
    if (!S.shards.cave) items.push({ id: 'cave', x: 14.5 * 16, y: 1.5 * 16 });
  }
  if (name === 'field') {
    if (!S.shards.field) items.push({ id: 'field', x: 13.5 * 16, y: 2.5 * 16, hidden: true });
  }
  // the statue
  if (c >= 1 && name !== 'void') {
    S.statueSteps = (S.statueSteps || 0) + 1;
    placeStatue();
  }
  setSong(ROOMS[name].song);
  showToast(name === 'void' ? corrupt('SAVE 01', 0.5) : (c >= 2 && Math.random() < 0.35 ? corrupt(ROOMS[name].name, 0.4) : ROOMS[name].name));
  save();
  // room intro events
  if (name === 'village' && !S.flags.intro) { S.flags.intro = true; say([['', 'Welcome to MILLBROOK, {N}!'], ['', 'Talk to people with A. Swing your stick with A too.']]); }
  if (name === 'field' && c >= 2 && !S.flags.gap) { S.flags.gap = true; say([['', 'There is a gap in the trees to the north that was not there before.']]); }
  if (name === 'void' && !S.flags.void) { S.flags.void = true; }
  if (name === 'lake' && c >= 1 && !S.flags.dock) { S.flags.dock = true; say([['', 'For a second, something pale moves under the dock.'], ['', 'You decide it was a fish.']]); }
}
function mkWisp(x, y) { return { x, y, vx: 0, vy: 0, t: Math.random() * 6, hp: 1, alive: true, cd: 0 }; }
function placeStatue() {
  const want = Math.max(36, 150 - S.statueSteps * 12);
  let best = null, bd = 1e9;
  for (let i = 0; i < 80; i++) {
    const tx = 1 + ((Math.random() * (RW - 2)) | 0), ty = 1 + ((Math.random() * (RH - 2)) | 0);
    if (SOLID.has(tileAt(room, tx, ty))) continue;
    const x = tx * 16 + 8, y = ty * 16 + 14;
    const d = Math.abs(Math.hypot(x - P.x, y - P.y) - want);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) statue = { x: best.x, y: best.y, moving: 0, gt: 0 };
}

// ---------- collision ----------
function solidAt(px, py) {
  if (px < 0 || px >= PW || py < 0 || py >= PH) {
    // edges: walkable only where the edge tile is walkable and a neighbour exists
    const tx = clamp(Math.floor(px / 16), 0, RW - 1), ty = clamp(Math.floor(py / 16), 0, RH - 1);
    return SOLID.has(tileAt(room, tx, ty));
  }
  return SOLID.has(tileAt(room, Math.floor(px / 16), Math.floor(py / 16)));
}
function boxFree(x, y, self) {
  const pts = [[x - 5, y - 4], [x + 4, y - 4], [x - 5, y + 2], [x + 4, y + 2]];
  for (const [a, b] of pts) if (solidAt(a, b)) return false;
  for (const n of npcs) if (n !== self && Math.abs(n.x - x) < 10 && Math.abs(n.y - y) < 8) return false;
  return true;
}
function moveBody(b, dx, dy) {
  if (dx && boxFree(b.x + dx, b.y, b)) b.x += dx;
  if (dy && boxFree(b.x, b.y + dy, b)) b.y += dy;
}

// ---------- dialog ----------
const dlg = $('dlg'), dlgWho = $('dlgWho'), dlgText = $('dlgText'), dlgMore = $('dlgMore');
let D = null; // {lines, i, shown, full, done}
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
    if (now !== before) {
      dlgText.textContent = l.text.slice(0, now);
      if (now % 2 === 0) SFX.blip();
    }
    if (D.shown >= l.text.length) dlgMore.style.visibility = 'visible';
  }
  // late-game: text sometimes flickers to the uncorrupted line or back
  if (C() >= 2 && D.shown >= l.text.length && Math.random() < 0.01) {
    dlgText.textContent = Math.random() < 0.5 ? corrupt(l.raw, 0.25) : l.text;
  }
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
  if (mode === 'play') { interact(); return; }
}
function onB() {
  if (mode === 'dialog') { dialogAdvance(); return; }
  if (mode === 'play') { openPause(); return; }
  if (mode === 'paused') { closePause(); return; }
}
window.shBack = function () {
  if (mode === 'dialog') { dialogAdvance(); return 1; }
  if (mode === 'play') { openPause(); return 1; }
  if (mode === 'paused') { closePause(); return 1; }
  if (mode === 'name' || (mode === 'files' && $('confirm').classList.contains('show'))) { $('confirm').classList.remove('show'); openFiles(); return 1; }
  if (mode === 'help') { closeHelp(); return 1; }
  return 0;
};

const FV = [[0, 1], [0, -1], [-1, 0], [1, 0]];
function interact() {
  const [fx_, fy_] = FV[P.dir];
  const ax = P.x + fx_ * 12, ay = P.y - 3 + fy_ * 12;
  for (const n of npcs) {
    if (Math.abs(n.x - ax) < 11 && Math.abs(n.y - 4 - ay) < 12) { talk(n); return; }
  }
  const tx = Math.floor(ax / 16), ty = Math.floor(ay / 16);
  const ch = tileAt(room, tx, ty);
  if (ch === 'D') { SFX.door(); doorText(tx); return; }
  if (ch === 'P' && room === 'village') {
    say(C() === 0 ? [['', 'A stone statue of a child holding a little bell.'], ['', 'The plaque is worn smooth. You can only read a "W".']]
      : [['', 'The plinth is empty.'], ['', 'There are small stone footprints leading away from it.']]);
    return;
  }
  if (ch === 'M') {
    say(C() >= 2 ? [['', 'A small stone with flowers.'], ['', '"FOR {N}. WHO ALWAYS GOT THIS FAR."', 0]] : [['', 'A small stone with flowers.'], ['', '"FOR W. WHO ALWAYS GOT THIS FAR."']]);
    return;
  }
  if (ch === 'B' && room === 'lake') { bell(); return; }
  if (ch === '~' && room === 'lake') {
    say(C() >= 3 ? [['', 'Your reflection is a second late.']] : [['', 'The water is very still. And very cold.']]);
    return;
  }
  // swing the stick
  if (P.swing <= 0) {
    P.swing = 0.22; SFX.swing();
    const hx = P.x + fx_ * 12, hy = P.y - 4 + fy_ * 12;
    for (const w of wisps) if (w.alive && Math.abs(w.x - hx) < 13 && Math.abs(w.y - hy) < 13) {
      w.alive = false; SFX.hit(); burst(w.x, w.y, '#bfefff');
      if (Math.random() < 0.3 && S.hearts < 3) items.push({ id: 'heart', x: w.x, y: w.y });
    }
    if (statue && Math.abs(statue.x - hx) < 12 && Math.abs(statue.y - 4 - hy) < 14) {
      SFX.hit(); shake = 0.15;
      if (!S.flags.hitStatue) { S.flags.hitStatue = true; say([['', 'Your stick bounces off the stone.'], ['', 'It does not like that.']]); }
    }
  }
}
function doorText(tx) {
  const c = C();
  if (tx === 3) say(c >= 1 ? [['', 'Locked.'], ['', 'You can hear a TV inside. It is playing this game.']] : [['', 'Locked. The Elder\'s house.']]);
  else say(c >= 2 ? [['', 'A note on the door: "CLOSED UNTIL THE NEXT PLAYER LEAVES."']] : [['', 'Locked. A sign says "BACK SOON".']]);
}
function burst(x, y, col) { for (let i = 0; i < 10; i++) fx.push({ x, y, vx: rnd(-50, 50), vy: rnd(-60, 30), t: 0.5, col }); }

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
        ['ELDER', 'One is in the WOODS to the west. One is in the CAVE to the east. One is up in the HIGH FIELD.'],
        ['ELDER', 'Bring them to the bell at the end of the dock. Then everything can go back to how it was.']]);
    }
    if (c === 0) return say([['ELDER', 'Woods to the west. Cave to the east. The field up north.'], ['ELDER', 'The cave is dark. Stay close to the walls.']]);
    if (c === 1) return say([['ELDER', 'You found one. Good, good.'], ['ELDER', 'Did the statue move? I could swear it was on its plinth this morning.'], ['ELDER', 'Don\'t let it get behind you, {N}.']]);
    if (c === 2) return say([['ELDER', 'Your hands are shaking, {N}.'], ['ELDER', 'It\'s {T} where you are. Shouldn\'t you be asleep?', 0.0], ['ELDER', 'Wren used to play this late too.']]);
    return say([['ELDER', 'Ring the bell, {N}.'], ['ELDER', 'Wren wants to be let out.'], ['ELDER', 'I mean. Wren wants it fixed.'], ['ELDER', 'Same thing.', 0.2]]);
  }
  if (n.id === 'kid') {
    if (c === 0) return say([['KID', 'Wanna know a secret?'], ['KID', 'If you stand at the end of the dock, you can see someone under the water.'], ['KID', 'They wave sometimes.']]);
    if (c === 1) return say([['KID', '{N}! {N}! {N}!'], ['KID', '...sorry. I just like saying it.'], ['KID', 'Nobody new ever comes here.']]);
    return say([['KID', 'Wren used to play with me every day.'], ['KID', 'Then Wren stopped coming.'], ['KID', 'You\'ve been here {M} minutes. Are you going to stop coming too?']]);
  }
  if (n.id === 'shop') {
    if (c === 0) return say([['SHOPKEEPER', 'Shop\'s closed. Been closed for a while.'], ['SHOPKEEPER', 'What year is it out there, anyway?']]);
    if (c === 1) return say([['SHOPKEEPER', 'We don\'t get many new players, {N}.'], ['SHOPKEEPER', 'Last one never finished.']]);
    return say([['SHOPKEEPER', 'You bought this at a yard sale, didn\'t you?'], ['SHOPKEEPER', 'One dollar. No box. Name on the label in marker.'], ['SHOPKEEPER', 'That\'s how it always gets passed on.']]);
  }
  if (n.id === 'wren') {
    if (!S.met.wren) {
      S.met.wren = true;
      return say([['???', 'Oh.'], ['???', 'You can see me.'], ['WREN', 'This was my file. Save one. I was on the lake part. I was so close to the end.'],
        ['WREN', 'The summer I got this, I went swimming at the real lake.'], ['WREN', 'The cartridge never left my shelf after that.'],
        ['WREN', 'Then someone sold it at a yard sale. And now you have it, {N}.'],
        ['WREN', 'Please ring the bell. Then I can finally go home.']], null, { clean: true });
    }
    return say([['WREN', 'Ring the bell, {N}. Please.']], null, { clean: true });
  }
}

// ---------- bell / ending ----------
function bell() {
  const c = C();
  if (c < 3) {
    return say([['', 'An old bell, cracked into pieces.'], ['', (3 - c) + (3 - c === 1 ? ' piece is' : ' pieces are') + ' still missing.']]);
  }
  say([['', 'You fit the three pieces together.'], ['', 'The bell is whole again.']], () => startEnding());
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
  M.ended = true; M.endName = S.name; M.endMins = minsPlayed(); M.endDeaths = S.deaths; saveMeta();
  S.done = true; save();
  mode = 'over';
  $('endStats').textContent = 'Time: ' + minsPlayed() + ' min · Deaths: ' + S.deaths;
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
  $('pShards').textContent = C() + ' of 3';
  $('pDeaths').textContent = String(S.deaths);
  $('pSound').textContent = muted ? 'Sound: off' : 'Sound: on';
}
function closePause() { $('pausePanel').classList.remove('show'); mode = 'play'; layout(); }
$('pResume').onclick = () => closePause();
$('pSound').onclick = () => { setMute(!muted); refreshPause(); };
$('pHelp').onclick = () => openHelp('paused');
$('pQuit').onclick = () => { save(); $('pausePanel').classList.remove('show'); openFiles(); };
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
function openFiles() {
  mode = 'files'; MUS.name = null; layout();
  ['pausePanel', 'endPanel', 'helpPanel'].forEach(id => $(id).classList.remove('show'));
  const now = Date.now();
  let head = 'SELECT A FILE';
  if (M.ended) head = 'you came back.';
  else if (S && M.lastPlayed && now - M.lastPlayed > 86400000) head = 'you were gone ' + Math.floor((now - M.lastPlayed) / 86400000) + ' days, ' + S.name + '.';
  else if (S && M.visits > 1) head = 'welcome back, ' + S.name + '.';
  $('filesHead').textContent = head;
  const s1 = $('slot1'), s2 = $('slot2'), s3 = $('slot3');
  if (M.ended) {
    s1.innerHTML = '<b>1</b> ' + esc(M.endName) + '<small>UNDER THE DOCK</small>';
    s2.innerHTML = '<b>2</b> WREN<small>WENT HOME</small>';
  } else {
    s1.innerHTML = M.wrenSeen ? '<b>1</b> WREN<small>— — —</small>' : '<b>1</b> WREN<small>♥♡♡ · THE LAKE · 2 of 3</small>';
    s2.innerHTML = S ? '<b>2</b> ' + esc(S.name) + '<small>' + '♥'.repeat(S.hearts) + '♡'.repeat(3 - S.hearts) + ' · ' + ROOMS[S.room].name + ' · ' + C() + ' of 3</small>' : '<b>2</b> — NEW GAME —<small>&nbsp;</small>';
  }
  s3.innerHTML = '<b>3</b> ' + (M.slot3Taps > 2 ? 'EMPTY. FOR NOW.' : '?????') + '<small>&nbsp;</small>';
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
  if (S) { filesPanel.classList.remove('show'); startGame(); }
  else { filesPanel.classList.remove('show'); namePanel.classList.add('show'); mode = 'name'; setTimeout(() => $('nameIn').focus(), 50); }
};
$('slot3').onclick = () => { M.slot3Taps = (M.slot3Taps || 0) + 1; saveMeta(); SFX.static(0.3); flashMsg(M.slot3Taps > 2 ? 'It\'s waiting for the next player.' : 'This file is corrupted.'); openFiles(); };
$('eraseBtn').onclick = () => { $('confirm').classList.add('show'); };
$('eraseNo').onclick = () => $('confirm').classList.remove('show');
$('eraseYes').onclick = () => {
  try { localStorage.removeItem(KEY); localStorage.removeItem(META); } catch (e) {}
  S = null; M = { visits: 1, lastPlayed: 0, wrenSeen: false, ended: false, endName: '', slot3Taps: 0 }; saveMeta();
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
  S = newRun(n); save(); startGame();
};
$('nameBack').onclick = () => { namePanel.classList.remove('show'); openFiles(); };

function startGame() {
  audioInit();
  mode = 'card'; cardT = 0; cardText = [S.done ? '' : (C() === 0 ? 'FILE 2' : 'FILE 2'), S.name];
  cardDone = () => { mode = 'play'; layout(); enterRoom(S.room || 'village', S.x || 7.5 * 16, S.y || 6 * 16 + 8); P.dir = 0; };
  layout();
}
let cardT = 0, cardText = ['', ''], cardDone = null;

// Wren's memory: you play slot 1 for a moment
function wrenMemory() {
  M.wrenSeen = true; saveMeta();
  mode = 'memory'; memT = 0; layout();
  MUS.name = null;
  room = 'lake'; npcs = []; wisps = []; items = []; statue = null; fx = [];
  P.x = 7.5 * 16 + 8; P.y = 1 * 16 + 12; P.dir = 0;
  memPhase = 0;
}
let memT = 0, memPhase = 0;
function memoryTick(dt) {
  memT += dt;
  if (memPhase === 0) {
    // walk down the dock on its own
    if (P.y < 9 * 16 + 8) { P.y += dt * 22; P.anim += dt; P.step = (P.anim * 4 | 0) % 2; }
    else { memPhase = 1; memT = 0; P.step = 0; }
  } else if (memPhase === 1 && memT > 1) {
    memPhase = 2; memT = 0; SFX.static(1.2);
  } else if (memPhase === 2 && memT > 4) {
    memPhase = 3; memT = 0;
  } else if (memPhase === 3 && memT > 1.4) {
    memPhase = 4; openFiles(); flashMsg('Save 1 could not be loaded.');
  }
}
function afterEndScene() {
  filesPanel.classList.remove('show');
  mode = 'card'; cardT = 0; cardText = ['', 'you are under the dock now.'];
  cardDone = () => { mode = 'card'; cardT = 0; cardText = ['', 'wait for the next player.']; cardDone = () => openFiles(); };
  layout();
}

// ---------- update ----------
function hurt(src) {
  if (P.inv > 0) return;
  S.hearts--; P.inv = 1.2; SFX.hurt(); shake = 0.2; flash = 0.15;
  const dx = P.x - src.x, dy = P.y - src.y, d = Math.hypot(dx, dy) || 1;
  P.kx = dx / d * 140; P.ky = dy / d * 140;
  if (S.hearts <= 0) gameOver();
}
function gameOver() {
  S.deaths++; S.hearts = 3; save();
  mode = 'card'; cardT = 0;
  const c = C();
  cardText = ['GAME OVER', c >= 2 ? corrupt('WREN DIDN\'T GET TO CONTINUE', 0.08) : 'CONTINUE?'];
  if (c >= 1 && S.deaths >= 3) cardText[1] = 'that\'s ' + S.deaths + ' times, ' + S.name + '.';
  cardDone = () => { mode = 'play'; layout(); enterRoom('village', 7.5 * 16 + 8, 6 * 16 + 8); };
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

function update(dt) {
  T += dt;
  if (mode === 'boot') { bootT += dt; return; }
  if (mode === 'card') { cardT += dt; return; }
  if (mode === 'memory') { memoryTick(dt); return; }
  if (mode === 'ending') { endingTick(dt); fxTick(dt); return; }
  if (mode === 'dialog') { dialogTick(dt); return; }
  if (mode !== 'play') return;
  S.playMs += dt * 1000;
  if (((T * 10) | 0) % 50 === 0) { M.lastPlayed = Date.now(); saveMeta(); }
  const c = C();

  // player movement
  let mx = 0, my = 0;
  if (held.left) mx -= 1; if (held.right) mx += 1; if (held.up) my -= 1; if (held.down) my += 1;
  if (mx && my) { if (P.dir >= 2) my = 0; else mx = 0; }
  if (P.swing > 0) { P.swing -= dt; mx = my = 0; }
  if (mx || my) {
    P.dir = my > 0 ? 0 : my < 0 ? 1 : mx < 0 ? 2 : 3;
    const sp = 62 * dt;
    moveBody(P, mx * sp, my * sp);
    P.anim += dt; P.step = ((P.anim * 7) | 0) % 2;
  } else P.step = 0;
  if (P.kx || P.ky) {
    moveBody(P, P.kx * dt, P.ky * dt);
    P.kx *= Math.pow(0.002, dt); P.ky *= Math.pow(0.002, dt);
    if (Math.abs(P.kx) < 5) P.kx = 0; if (Math.abs(P.ky) < 5) P.ky = 0;
  }
  if (P.inv > 0) P.inv -= dt;
  P.hidden = tileAt(room, Math.floor(P.x / 16), Math.floor((P.y - 2) / 16)) === 'w';

  // room exits
  const r = ROOMS[room];
  if (P.x < 1 && r.w) return enterRoom(r.w, PW - 3, P.y);
  if (P.x > PW - 1 && r.e) return enterRoom(r.e, 3, P.y);
  if (P.y < 5 && r.n && !(room === 'field' && c < 2)) return enterRoom(r.n, P.x, PH - 3);
  if (P.y > PH - 1 && r.s) return enterRoom(r.s, P.x, 8);
  P.x = clamp(P.x, 4, PW - 4); P.y = clamp(P.y, 5, PH - 2);

  // wisps
  for (const w of wisps) {
    if (!w.alive) continue;
    w.t += dt;
    const dx = P.x - w.x, dy = P.y - 4 - w.y, d = Math.hypot(dx, dy) || 1;
    const chase = d < 70 && !P.hidden;
    const sp = chase ? 26 + c * 4 : 14;
    const tx = chase ? dx / d : Math.cos(w.t * 0.7 + w.x), ty = chase ? dy / d : Math.sin(w.t * 0.9 + w.y);
    w.vx += (tx * sp - w.vx) * Math.min(1, dt * 2); w.vy += (ty * sp - w.vy) * Math.min(1, dt * 2);
    const nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
    if (!solidAt(nx, w.y)) w.x = nx; else w.vx *= -1;
    if (!solidAt(w.x, ny)) w.y = ny; else w.vy *= -1;
    if (d < 9) hurt(w);
  }
  // items
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (Math.abs(it.x - P.x) < 9 && Math.abs(it.y - (P.y - 4)) < 10) {
      items.splice(i, 1);
      if (it.id === 'heart') { S.hearts = Math.min(3, S.hearts + 1); SFX.pick(); }
      else gotShard(it.id);
    }
  }
  // statue
  if (statue && !statue.fixed) {
    const dx = statue.x - P.x, dy = statue.y - P.y, d = Math.hypot(dx, dy) || 1;
    const [fx_, fy_] = FV[P.dir];
    const looking = (fx_ * dx + fy_ * dy) / d > 0.25;
    if (!looking) {
      const sp = (12 + c * 5) * dt;
      const bx = { x: statue.x, y: statue.y };
      // statue walks through anything but solid tiles
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
  if (c >= 1 && !flick && Math.random() < dt * (0.25 + c * 0.35)) {
    const tx = (Math.random() * RW) | 0, ty = (Math.random() * RH) | 0;
    const alt = c >= 2 && Math.random() < 0.3 ? 'Q' : GLITCHABLE[(Math.random() * GLITCHABLE.length) | 0];
    flick = { tx, ty, ch: alt, t: rnd(0.08, 0.3 + c * 0.2) };
  }
  if (flick) { flick.t -= dt; if (flick.t <= 0) flick = null; }
  if (c >= 2 && Math.random() < dt * 0.15 * c) tear = rnd(0.06, 0.2);
  if (tear > 0) tear -= dt;
  if (c >= 3 && Math.random() < dt * 0.05) { staticT = 0.12; SFX.static(0.1); }
}
function fxTick(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { const p = fx[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; if (p.t <= 0) fx.splice(i, 1); }
  if (staticT > 0) staticT -= dt; if (flash > 0) flash -= dt; if (shake > 0) shake -= dt;
}
function gotShard(id) {
  S.shards[id] = true; save();
  SFX.shard(); burst(P.x, P.y - 8, '#ffe36b');
  const c = C();
  if (c === 1) say([['', 'You got a BELL PIECE! 1 of 3.'], ['', 'SAVING...'], ['', 'SAVE 1: WREN', 0], ['', 'SAVE 2: {N}. Done.']], () => { staticT = 0.25; SFX.static(0.25); });
  else if (c === 2) say([['', 'You got a BELL PIECE! 2 of 3.'], ['', 'The music sounds wrong now.'], ['', 'It isn\'t your speakers.']]);
  else say([['', 'You got the last BELL PIECE!'], ['', 'thank you, {N}.', 0.15], ['', 'Take them to the bell at the end of the dock.']]);
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
  renderWorld();
  if (mode === 'ending') renderEndingFx();
  blit();
}
function renderWorld() {
  const c = C();
  let ox = 0, oy = 0;
  if (shake > 0) { ox = rnd(-2, 2) | 0; oy = rnd(-2, 2) | 0; }
  g.save(); g.translate(ox, oy);
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) {
    let ch = tileAt(room, tx, ty);
    if (flick && flick.tx === tx && flick.ty === ty) ch = flick.ch;
    drawTile(ch, tx, ty, T);
  }
  // statue on plinth before it wakes
  if (room === 'village' && c === 0) drawHuman(g, PAL.statue, 0, 6 * 16 + 8, HUD + 7 * 16 + 9, 0);
  // someone under the dock
  if (room === 'lake' && c >= 1 && Math.sin(T * 0.7) > 0.85) {
    g.globalAlpha = 0.25; g.fillStyle = '#0a1a33'; g.fillRect(7 * 16 + 9, HUD + 6 * 16, 10, 14); g.globalAlpha = 1;
  }
  if (room === 'lake' && c >= 3 && mode !== 'ending') {
    const a = 0.25 + 0.2 * Math.sin(T * 3);
    drawHuman(g, PAL.wren, 0, 3 * 16 + 8, HUD + 6 * 16 + 12, 0, Math.random() < 0.05 ? 0.9 : a);
  }
  // items
  for (const it of items) {
    if (it.id === 'heart') { drawHeart(it.x - 4, HUD + it.y - 4, true); continue; }
    if (it.hidden && !(Math.sin(T * 2.2) > 0.93)) continue;
    const bob = Math.sin(T * 4) * 1.5;
    drawShard(it.x, HUD + it.y + bob);
  }
  // sort characters by y
  const list = [];
  for (const n of npcs) list.push({ y: n.y, f: () => drawNpc(n) });
  if (statue) list.push({ y: statue.y, f: () => drawHuman(g, c >= 3 || (mode === 'ending') ? PAL.statueR : PAL.statue, statue.fixed ? 0 : faceToward(statue), statue.x + (statue.moving > 0 ? rnd(-0.6, 0.6) : 0), HUD + statue.y, 0) });
  const pAlpha = mode === 'ending' && ending.phase >= 2 ? Math.max(0, 1 - ending.t / 4) : 1;
  if (!(P.inv > 0 && ((T * 20) | 0) % 2)) list.push({ y: P.y, f: () => drawPlayer(pAlpha) });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  for (const w of wisps) if (w.alive) drawWisp(w);
  for (const p of fx) { g.fillStyle = p.col; g.fillRect(p.x | 0, (HUD + p.y) | 0, 2, 2); }
  g.restore();
  if (ROOMS[room].dark) renderDark();
  // wisps/shards glow over darkness
  if (ROOMS[room].dark) { for (const w of wisps) if (w.alive) drawWisp(w); for (const it of items) if (it.id !== 'heart') drawShard(it.x, HUD + it.y + Math.sin(T * 4) * 1.5, true); }
  renderHud();
}
function faceToward(s) { const dx = P.x - s.x, dy = P.y - s.y; return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
function drawNpc(n) {
  const c = C();
  let dir = n.dir;
  if (c >= 2 && n.id !== 'wren') dir = faceToward(n); // they always watch you
  const pal = PAL[n.pal];
  if (n.ghost) {
    const a = 0.55 + 0.25 * Math.sin(T * 2) + (Math.random() < 0.04 ? 0.3 : 0);
    drawHuman(g, pal, dir, n.x + (Math.random() < 0.03 ? rnd(-3, 3) : 0), HUD + n.y, 0, Math.min(1, a));
    return;
  }
  if (c >= 2 && Math.random() < 0.01) { drawHuman(g, PAL.noface, dir, n.x, HUD + n.y, 0); return; }
  drawHuman(g, pal, dir, n.x, HUD + n.y, 0);
}
function drawPlayer(alpha) {
  const y = mode === 'ending' && ending.phase >= 2 ? P.y + Math.min(10, ending.t * 2.5) : P.y;
  if (P.hidden) {
    drawHuman(g, PAL.player, P.dir, P.x, HUD + y, P.step, alpha);
    // grass in front of legs
    g.fillStyle = '#5cbc4c'; for (let i = 0; i < 5; i++) g.fillRect(P.x - 5 + i * 2, HUD + y - 5, 1, 5);
  } else drawHuman(g, PAL.player, P.dir, P.x, HUD + y, P.step, alpha);
  if (P.swing > 0) {
    const [fx_, fy_] = FV[P.dir];
    const k = 1 - P.swing / 0.22;
    g.fillStyle = '#8a5a2b';
    for (let i = 3; i < 13; i++) {
      const ang = Math.atan2(fy_, fx_) + (k - 0.5) * 1.6;
      g.fillRect((P.x + Math.cos(ang) * i) | 0, (HUD + P.y - 6 + Math.sin(ang) * i) | 0, 2, 2);
    }
  }
}
function drawWisp(w) {
  const x = w.x | 0, y = (HUD + w.y + Math.sin(w.t * 5) * 1.5) | 0;
  g.fillStyle = 'rgba(160,220,255,.25)'; g.fillRect(x - 6, y - 6, 12, 12);
  g.fillStyle = '#bfefff'; g.fillRect(x - 3, y - 4, 6, 8); g.fillRect(x - 4, y - 3, 8, 6);
  g.fillStyle = '#ffffff'; g.fillRect(x - 2, y - 3, 3, 3);
  g.fillStyle = '#123'; g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 1, y, 1, 1);
}
function drawShard(x, y, glowOnly) {
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
  const rad = 40 + Math.sin(T * 6) * 1.5;
  const gr = dg.createRadialGradient(P.x, P.y - 6, 6, P.x, P.y - 6, rad);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  dg.fillStyle = gr; dg.beginPath(); dg.arc(P.x, P.y - 6, rad, 0, Math.PI * 2); dg.fill();
  g.drawImage(dark, 0, HUD);
}
function renderHud() {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, HUD);
  for (let i = 0; i < 3; i++) drawHeart(6 + i * 10, 5, i < S.hearts);
  const c = C();
  for (let i = 0; i < 3; i++) {
    const x = W - 40 + i * 12, y = 8;
    if (i < c) { g.fillStyle = '#e8b830'; g.fillRect(x - 1, y - 4, 3, 8); g.fillRect(x - 3, y - 2, 7, 4); }
    else { g.fillStyle = '#3a3220'; g.fillRect(x - 1, y - 4, 3, 8); g.fillRect(x - 3, y - 2, 7, 4); }
  }
  g.fillStyle = '#777'; g.font = '8px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let label = S.name;
  if (c >= 2 && Math.sin(T * 0.9) > 0.97) label = 'WREN';
  g.fillText(label, W / 2, 8);
}
function renderAttract() {
  // slow drifting lake under the menus
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) drawTile(ty < 3 ? 'S' : '~', tx, ty, T * 0.5);
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
  for (let ty = 0; ty < RH; ty++) for (let tx = 0; tx < RW; tx++) drawTile(tileAt('lake', tx, ty), tx, ty, T);
  // night tint
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
function staticNoise(a) {
  const img = g.createImageData(W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 * a; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}
function blit() {
  out.setTransform(1, 0, 0, 1, 0, 0);
  const c = mode === 'play' || mode === 'dialog' || mode === 'paused' || mode === 'ending' ? C() : 0;
  out.filter = c >= 3 ? 'saturate(0.45) contrast(1.1)' : c >= 2 ? 'saturate(0.8)' : 'none';
  if (tear > 0) {
    for (let y = 0; y < H; y += 8) {
      const off = Math.random() < 0.3 ? rnd(-10, 10) | 0 : 0;
      out.drawImage(buf, 0, y, W, 8, off, y, W, 8);
    }
  } else out.drawImage(buf, 0, 0);
  out.filter = 'none';
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
  update(dt);
  musicTick();
  render();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); if (mode === 'play') openPause(); if (AC) AC.suspend(); }
  else if (AC) AC.resume();
});
addEventListener('pagehide', () => { save(); if (mode === 'play') openPause(); });

// first screen
cartPanel.classList.add('show');
if (M.visits > 0) $('cartNote').textContent = M.ended ? 'It\'s back in your hands. You don\'t remember picking it up.' : 'The label still says SECONDHAND. The marker looks fresher than last time.';
layout();
requestAnimationFrame(frame);

// test hook (harmless)
window.__sh = { get mode() { return mode; }, get S() { return S; }, enterRoom: (r, x, y) => enterRoom(r, x, y), P, get room() { return room; }, C };
})();
