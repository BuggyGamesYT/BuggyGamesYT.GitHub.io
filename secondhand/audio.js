/* Secondhand · audio engine · © 2026 Buggy Games YT. All rights reserved.
   WebAudio only. master -> compressor -> out; music / sfx / ambience buses.
   Music: schedule-ahead step sequencer with crossfades and a "bend" amount (0..3)
   that corrupts calm songs: slower tempo, detune + tape wow, wrong notes, dropouts,
   bars played backwards with swelled (reverse-feel) envelopes, and a closing low-pass. */
(function (G) {
'use strict';
const MUSIC = G.SHMUSIC;
const A = { ctx: null, muted: false };
let ctx = null, master, comp, musicBus, sfxBus, ambBus, noiseBuf, waves = {};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
  try {
    ctx = new (G.AudioContext || G.webkitAudioContext)();
    A.ctx = ctx;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    A.an = ctx.createAnalyser(); A.an.fftSize = 512; comp.connect(A.an);
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : 0.85; master.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.55; ambBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // pulse waves (12.5% / 25%), an organ, a music box
    const mk = (fn, n) => { const re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = fn(k); return ctx.createPeriodicWave(re, im); };
    const pulse = duty => mk(k => 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty) * (k < 24 ? 1 : 0.5), 32);
    waves.p12 = pulse(0.125); waves.p25 = pulse(0.25);
    waves.organ = mk(k => [0, 1, 0.5, 0.3, 0.25, 0, 0.12, 0, 0.1][k] || 0, 9);
    waves.box = mk(k => [0, 1, 0, 0.35, 0, 0.12, 0, 0, 0.06][k] || 0, 9);
    waves.choir = mk(k => [0, 1, 0.62, 0.42, 0.18, 0.3, 0.16, 0.08, 0.05, 0.03][k] || 0, 10); // soft 'aah'
  } catch (e) { ctx = null; A.ctx = null; return false; }
  return true;
}
function setMute(m) {
  A.muted = !!m;
  if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.03); }
}
function osc(type, f, det) {
  const o = ctx.createOscillator();
  if (waves[type]) o.setPeriodicWave(waves[type]); else o.type = type === 'sq' ? 'square' : type === 'tri' ? 'triangle' : type === 'saw' ? 'sawtooth' : type;
  o.frequency.value = f; if (det) o.detune.value = det;
  return o;
}
// a note with a simple envelope. env: 'pluck' (fast decay), 'hold' (sustain then release), 'swell' (reverse feel)
function note(dest, t, f, dur, type, vol, det, env, slideTo) {
  if (!ctx || vol <= 0) return;
  const o = osc(type, f, det), g = ctx.createGain();
  const end = t + Math.max(0.03, dur);
  if (env === 'swell') { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, end - 0.012); g.gain.linearRampToValueAtTime(0, end); }
  else if (env === 'pluck') { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, end); }
  else if (env === 'box') { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(vol * 0.25, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0006, end + 0.25); }
  else {
    const a = Math.min(0.012, dur * 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(vol * 0.7, t + a, 0.08);
    g.gain.setValueAtTime(vol * 0.7, Math.max(t + a, end - 0.03)); g.gain.linearRampToValueAtTime(0, end);
  }
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, end);
  o.connect(g); g.connect(dest); o.start(t); o.stop(end + (env === 'box' ? 0.3 : 0.03));
}
function noise(dest, t, dur, vol, ftype, freq, q, sweepTo, attack) {
  if (!ctx || vol <= 0) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.value = freq || 1000; if (q) f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0006, t + dur); }
  else { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + dur); }
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}

// ======================= music =======================
const players = []; // { song, out, filt, gain, i, next, bend, dying, revBar, dropBar }
let cur = null, curName = null;
function mkPlayer(name, bend, at) {
  const song = MUSIC.SONGS[name];
  const out = ctx.createGain(), filt = ctx.createBiquadFilter(), gain = ctx.createGain();
  filt.type = 'lowpass'; filt.frequency.value = 14000; filt.Q.value = 0.4;
  out.connect(filt); filt.connect(gain); gain.connect(musicBus);
  gain.gain.setValueAtTime(0.0001, at); gain.gain.linearRampToValueAtTime(1, at + 0.7);
  return { name, song, out, filt, gain, i: 0, next: at + 0.05, bend: bend || 0, dying: 0, bar: -1, rev: false, drop: {} };
}
function setBendOn(p, b) {
  p.bend = Math.max(0, b || 0);
  const cut = 14000 / (1 + p.bend * p.bend * 0.55);
  p.filt.frequency.setTargetAtTime(cut, ctx.currentTime, 0.2);
}
function setSong(name, bend) {
  if (!ctx) { curName = name; A.pendingBend = bend; return; }
  if (name && !MUSIC.SONGS[name]) name = null;
  if (cur && cur.name === name) { setBendOn(cur, bend); return; }
  const now = ctx.currentTime;
  if (cur) { cur.dying = now + 1.1; cur.gain.gain.cancelScheduledValues(now); cur.gain.gain.setValueAtTime(cur.gain.gain.value, now); cur.gain.gain.linearRampToValueAtTime(0.0001, now + 1.0); }
  cur = null; curName = name;
  if (name) { cur = mkPlayer(name, bend, now + 0.15); setBendOn(cur, bend); players.push(cur); }
}
function stop() { setSong(null, 0); }
function schedStep(p, t, sd) {
  const s = p.song, S = s.s, b = p.bend, L = s.len, spb = s.spb;
  let i = p.i % L;
  const bar = Math.floor(i / spb);
  if (bar !== p.bar) {
    p.bar = bar;
    p.rev = b >= 1.6 && Math.random() < Math.min(0.85, (b - 1.4) * 0.45);
    p.drop = { h: b >= 0.8 && Math.random() < b * 0.09, d: b >= 0.8 && Math.random() < b * 0.1, l: b >= 1.5 && Math.random() < (b - 1.2) * 0.07 };
  }
  if (p.rev) i = bar * spb + (spb - 1 - (i % spb));
  if (b >= 0.8 && Math.random() < b * 0.03) return; // dropout: the whole step vanishes
  const wow = Math.sin(t * 0.8) * b * 16 + Math.sin(t * 3.1) * b * 4;
  const det = -b * 38 + wow;
  const env = p.rev ? 'swell' : null;
  const ev = s.lead[i];
  if (ev && !p.drop.l) {
    let n = ev.n;
    if (b > 0.5 && Math.random() < b * 0.03) n += Math.random() < 0.5 ? 1 : -1;
    if (b > 2.2 && Math.random() < 0.05) n += 6;
    const dur = ev.len * sd * (p.rev ? 1 : 0.92);
    const lw = S.lw;
    if (lw === 'box') note(p.out, t, mtof(n), dur, 'box', S.lv, det, 'box');
    else note(p.out, t, mtof(n), dur, lw, S.lv, det + (Math.random() - 0.5) * b * 14, env);
  }
  const hv = s.harm[i];
  if (hv && !p.drop.h) for (const h of hv) note(p.out, t, mtof(h.n), h.len * sd * (S.hm === 'pad' ? 1 : 0.8), S.hw, S.hv, det, S.hm === 'pad' ? (p.rev ? 'swell' : null) : (p.rev ? 'swell' : 'pluck'));
  const bv = s.bass[i];
  if (bv) note(p.out, t, mtof(bv.n), bv.len * sd * 0.95, S.bw, S.bv, det * 0.6, env);
  const dr = s.drum[i];
  if (dr && !p.drop.d) {
    const v = S.dv;
    if (dr === 'k') { const o = osc('sine', 130, 0), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.16); o.connect(g); g.connect(p.out); o.start(t); o.stop(t + 0.2); }
    else if (dr === 's') { noise(p.out, t, 0.13, v * 0.45, 'bandpass', 1700, 0.8); note(p.out, t, 190, 0.06, 'tri', v * 0.3, 0, 'pluck'); }
    else if (dr === 'h') noise(p.out, t, 0.035, v * 0.22, 'highpass', 6500);
  }
}
function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  for (let k = players.length - 1; k >= 0; k--) {
    const p = players[k];
    if (p.dying && now > p.dying) { try { p.gain.disconnect(); } catch (e) {} players.splice(k, 1); continue; }
    if (p.next < now - 0.3) p.next = now + 0.03; // after a stall, don't machine-gun catch up
    let guard = 0;
    while (p.next < now + 0.22 && guard++ < 16) {
      const s = p.song;
      const sd = s.step * (1 + p.bend * 0.2);
      if (!p.dying || p.next < p.dying) schedStep(p, p.next, sd);
      // glitch songs (and heavy corruption) stutter: repeat a step
      const stut = (s.s.glitch && Math.random() < 0.08) || (p.bend > 2 && Math.random() < 0.03);
      if (!stut) p.i++;
      p.next += stut ? sd * 0.5 : sd * (p.bend >= 1.5 && Math.random() < 0.04 ? 1.5 : 1);
    }
  }
}

// ======================= sfx =======================
const lastAt = {};
function gate(k, gap) { const n = ctx.currentTime; if (lastAt[k] && n - lastAt[k] < gap) return false; lastAt[k] = n; return true; }
const SF = {};
const T0 = () => ctx.currentTime;
function def(name, fn, gap) { SF[name] = function () { if (!ctx) return; if (gap && !gate(name, gap)) return; try { fn.apply(null, arguments); } catch (e) {} }; }
def('blip', () => note(sfxBus, T0(), 680 + Math.random() * 260, 0.035, 'p25', 0.035, 0, 'pluck'), 0.03);
def('menu', () => { const t = T0(); note(sfxBus, t, 880, 0.04, 'p25', 0.05, 0, 'pluck'); note(sfxBus, t + 0.04, 1320, 0.05, 'p25', 0.04, 0, 'pluck'); }, 0.05);
def('ok', () => { const t = T0(); note(sfxBus, t, mtof(76), 0.08, 'p25', 0.08, 0, 'pluck'); note(sfxBus, t + 0.07, mtof(83), 0.14, 'p25', 0.08, 0, 'pluck'); });
def('swing', () => { const t = T0(); noise(sfxBus, t, 0.11, 0.22, 'bandpass', 1400, 1.2, 4200, 0.02); }, 0.04);
def('charge', () => { const t = T0(); note(sfxBus, t, 300, 0.4, 'p25', 0.05, 0, null, 900); noise(sfxBus, t, 0.4, 0.05, 'bandpass', 2000, 4, 6000, 0.2); }, 0.3);
def('chargeReady', () => { const t = T0(); note(sfxBus, t, mtof(88), 0.18, 'p12', 0.07, 0, 'pluck'); note(sfxBus, t + 0.06, mtof(95), 0.3, 'sine', 0.08, 0, 'pluck'); }, 0.2);
def('spin', () => { const t = T0(); noise(sfxBus, t, 0.42, 0.32, 'bandpass', 600, 1.5, 5000, 0.06); noise(sfxBus, t + 0.12, 0.3, 0.18, 'bandpass', 3000, 2, 900, 0.05); note(sfxBus, t, 220, 0.4, 'saw', 0.03, 0, 'pluck', 660); }, 0.15);
def('beam', () => { const t = T0(); note(sfxBus, t, 1500, 0.22, 'p12', 0.05, 0, 'pluck', 600); note(sfxBus, t, 2250, 0.18, 'sine', 0.05, 0, 'pluck', 1200); noise(sfxBus, t, 0.15, 0.06, 'highpass', 5000); }, 0.06);
def('beamPop', () => { const t = T0(); noise(sfxBus, t, 0.14, 0.12, 'bandpass', 3000, 1, 800); note(sfxBus, t, 900, 0.1, 'sine', 0.05, 0, 'pluck', 300); }, 0.05);
def('hit', () => { const t = T0(); note(sfxBus, t, 420, 0.07, 'sq', 0.09, 0, 'pluck', 200); noise(sfxBus, t, 0.06, 0.18, 'highpass', 2500); }, 0.03);
def('clank', () => { const t = T0(); note(sfxBus, t, 1240, 0.18, 'p12', 0.07, 0, 'pluck'); note(sfxBus, t, 1860, 0.14, 'sine', 0.05, 0, 'pluck'); noise(sfxBus, t, 0.05, 0.15, 'highpass', 4000); }, 0.06);
def('kill', () => { const t = T0(); note(sfxBus, t, 600, 0.06, 'sq', 0.08, 0, 'pluck', 300); note(sfxBus, t + 0.05, 300, 0.1, 'sq', 0.07, 0, 'pluck', 120); noise(sfxBus, t, 0.22, 0.14, 'lowpass', 4000, 0, 300); }, 0.03);
def('bossHit', () => { const t = T0(); note(sfxBus, t, 160, 0.2, 'saw', 0.13, 0, 'pluck', 70); noise(sfxBus, t, 0.14, 0.24, 'lowpass', 1600); }, 0.05);
def('roar', kind => {
  const t = T0(), base = kind === 'listener' ? 70 : kind === 'miller' ? 95 : 58;
  note(sfxBus, t, base * 1.6, 1.0, 'saw', 0.1, 0, null, base * 0.8); note(sfxBus, t, base * 1.62, 1.0, 'sq', 0.05, 30, null, base * 0.78);
  noise(sfxBus, t, 1.1, 0.28, 'lowpass', 700, 4, 200, 0.15);
  if (kind === 'listener') noise(sfxBus, t + 0.2, 0.9, 0.12, 'bandpass', 2400, 6, 500, 0.3); // a long inward breath
}, 0.8);
def('hurt', () => { const t = T0(); note(sfxBus, t, 180, 0.18, 'saw', 0.12, 0, 'pluck', 90); note(sfxBus, t + 0.06, 110, 0.22, 'sq', 0.09, 0, 'pluck'); }, 0.1);
def('pick', () => { const t = T0(); [72, 76, 79, 84].forEach((m, i) => note(sfxBus, t + i * 0.07, mtof(m), 0.16, 'p25', 0.08, 0, 'pluck')); });
def('heart', () => { const t = T0(); [79, 84, 88].forEach((m, i) => note(sfxBus, t + i * 0.05, mtof(m), 0.2, 'p12', 0.07, 0, 'pluck')); note(sfxBus, t + 0.15, mtof(91), 0.35, 'sine', 0.05, 0, 'pluck'); });
def('key', () => { const t = T0(); [79, 83, 86, 91].forEach((m, i) => note(sfxBus, t + i * 0.055, mtof(m), 0.14, 'p25', 0.07, 0, 'pluck')); noise(sfxBus, t, 0.08, 0.06, 'highpass', 7000); });
def('page', () => { const t = T0(); noise(sfxBus, t, 0.18, 0.12, 'bandpass', 3500, 1.5, 1800, 0.03); noise(sfxBus, t + 0.12, 0.12, 0.08, 'bandpass', 2500, 1.5); [64, 67, 71, 74].forEach((m, i) => note(sfxBus, t + 0.18 + i * 0.12, mtof(m + 12), 0.5, 'box', 0.06, 0, 'box')); });
def('shard', () => { const t = T0(); [69, 72, 76, 81, 80].forEach((m, i) => note(sfxBus, t + i * 0.13, mtof(m), 0.35, 'p25', 0.09, i === 4 ? -40 : 0, 'pluck')); });
def('secret', () => { const t = T0(); [67, 66, 63, 57, 56, 64, 68, 72].forEach((m, i) => note(sfxBus, t + i * 0.09, mtof(m + 12), 0.15, 'p25', 0.06, 0, 'pluck')); });
def('chest', () => { const t = T0(); noise(sfxBus, t, 0.3, 0.12, 'lowpass', 500, 2, 1500); [60, 64, 67, 72, 76].forEach((m, i) => note(sfxBus, t + 0.25 + i * 0.07, mtof(m + 12), 0.25, 'p25', 0.06, 0, 'pluck')); }, 0.4);
def('grind', () => { const t = T0(); noise(sfxBus, t, 0.32, 0.12, 'bandpass', 180, 3, 120, 0.04); noise(sfxBus, t, 0.3, 0.05, 'bandpass', 900, 6, 600, 0.05); note(sfxBus, t, 48, 0.3, 'saw', 0.03, 0, null, 44); }, 0.2);
def('push', () => { const t = T0(); noise(sfxBus, t, 0.24, 0.16, 'bandpass', 380, 2, 260, 0.03); noise(sfxBus, t, 0.2, 0.05, 'highpass', 2500); }, 0.15);
def('click', () => { const t = T0(); note(sfxBus, t, 1900, 0.03, 'sq', 0.06, 0, 'pluck'); note(sfxBus, t + 0.04, 1200, 0.04, 'sq', 0.05, 0, 'pluck'); }, 0.05);
def('gate', () => { const t = T0(); for (let i = 0; i < 6; i++) note(sfxBus, t + i * 0.05, 300 - i * 20, 0.05, 'sq', 0.04, 0, 'pluck'); noise(sfxBus, t, 0.35, 0.1, 'bandpass', 800, 2, 300, 0.05); }, 0.3);
def('sting', () => { const t = T0(); [49, 50, 55, 56, 61].forEach(m => note(sfxBus, t, mtof(m), 1.4, 'saw', 0.05, 0, null)); noise(sfxBus, t, 0.9, 0.3, 'lowpass', 3000); }, 0.3);
def('static', d => { noise(sfxBus, T0(), d || 0.5, 0.2, 'highpass', 900); noise(sfxBus, T0(), d || 0.5, 0.1, 'lowpass', 6000); }, 0.05);
def('bell', rev => {
  const t = T0();
  if (!rev) [[72, 0.22], [79, 0.1], [84, 0.07], [88, 0.045], [91.1, 0.02]].forEach(([m, v]) => note(sfxBus, t, mtof(m), 3.6, 'sine', v, 0, 'pluck'));
  else [[72, 0.2], [79, 0.09], [84, 0.06], [88, 0.035]].forEach(([m, v]) => note(sfxBus, t, mtof(m) * 0.94, 3, 'sine', v, 0, 'swell'));
});
def('door', () => { const t = T0(); note(sfxBus, t, 90, 0.15, 'sq', 0.08, 0, 'pluck', 70); noise(sfxBus, t, 0.12, 0.12, 'lowpass', 600); }, 0.2);
def('lock', () => { const t = T0(); note(sfxBus, t, 140, 0.08, 'sq', 0.08, 0, 'pluck'); note(sfxBus, t + 0.07, 120, 0.1, 'sq', 0.07, 0, 'pluck'); noise(sfxBus, t, 0.08, 0.1, 'bandpass', 2000, 3); }, 0.4);
def('unlock', () => { const t = T0(); note(sfxBus, t, mtof(60), 0.08, 'p25', 0.08, 0, 'pluck'); note(sfxBus, t + 0.08, mtof(67), 0.08, 'p25', 0.08, 0, 'pluck'); noise(sfxBus, t + 0.05, 0.08, 0.15, 'bandpass', 3000, 4); noise(sfxBus, t + 0.12, 0.3, 0.12, 'lowpass', 900); });
def('hatch', () => { const t = T0(); note(sfxBus, t, 70, 0.6, 'saw', 0.05, 0, null, 52); noise(sfxBus, t, 0.6, 0.12, 'bandpass', 500, 8, 260, 0.1); noise(sfxBus, t + 0.5, 0.2, 0.18, 'lowpass', 400); }, 0.3);
def('stairs', () => { const t = T0(); for (let i = 0; i < 5; i++) { note(sfxBus, t + i * 0.07, mtof(64 - i * 3), 0.08, 'tri', 0.12, 0, 'pluck'); noise(sfxBus, t + i * 0.07, 0.05, 0.06, 'lowpass', 900); } }, 0.2);
def('shot', () => note(sfxBus, T0(), 320, 0.14, 'tri', 0.07, 0, 'pluck', 180), 0.05);
def('step', (surf, vol) => {
  const t = T0(), v = (vol || 1) * 0.5;
  if (surf === 'grass') noise(sfxBus, t, 0.06, 0.07 * v, 'bandpass', 2600, 1.2, 1800);
  else if (surf === 'dirt') noise(sfxBus, t, 0.05, 0.09 * v, 'bandpass', 1500, 1.4, 900);
  else if (surf === 'wood') { note(sfxBus, t, 190, 0.05, 'tri', 0.08 * v, 0, 'pluck', 150); noise(sfxBus, t, 0.03, 0.05 * v, 'lowpass', 1200); }
  else if (surf === 'marsh') noise(sfxBus, t, 0.12, 0.11 * v, 'lowpass', 300, 6, 900, 0.02);
  else if (surf === 'sand') noise(sfxBus, t, 0.07, 0.07 * v, 'highpass', 3000);
  else if (surf === 'glitch') { note(sfxBus, t, 1800 + Math.random() * 1500, 0.03, 'sq', 0.025 * v, 0, 'pluck'); noise(sfxBus, t, 0.03, 0.06 * v, 'highpass', 3000); }
  else { noise(sfxBus, t, 0.035, 0.1 * v, 'bandpass', 3200, 2); note(sfxBus, t, 900, 0.02, 'tri', 0.025 * v, 0, 'pluck'); }
}, 0.08);
def('flap', vol => { const t = T0(); noise(sfxBus, t, 0.06, 0.1 * vol, 'bandpass', 700, 2, 350); }, 0.09);
def('skitter', vol => { const t = T0(); for (let i = 0; i < 3; i++) noise(sfxBus, t + i * 0.025, 0.015, 0.1 * vol, 'highpass', 4000 + Math.random() * 2000); }, 0.07);
def('mimic', vol => { const t = T0(); for (let i = 0; i < 4; i++) note(sfxBus, t + i * 0.03, 200 + Math.random() * 2400, 0.025, 'sq', 0.03 * vol, 0, 'pluck'); noise(sfxBus, t, 0.1, 0.05 * vol, 'bandpass', 5000, 8); }, 0.25);
def('drip', vol => { const t = T0(), f = rnd(1100, 1900); note(ambBus, t, f, 0.12, 'sine', 0.06 * (vol || 1), 0, 'pluck', f * 0.55); note(ambBus, t + 0.21, f * 0.98, 0.1, 'sine', 0.018 * (vol || 1), 0, 'pluck', f * 0.5); }, 0.3);
def('lowhp', () => { const t = T0(); note(sfxBus, t, 1568, 0.07, 'p25', 0.045, 0, 'pluck'); note(sfxBus, t + 0.11, 1318, 0.07, 'p25', 0.04, 0, 'pluck'); }, 0.3);
def('dash', () => noise(sfxBus, T0(), 0.25, 0.12, 'bandpass', 500, 1, 2000, 0.03), 0.3);
// ---- PART 1 ----
def('warp', () => { const t = T0(); note(sfxBus, t, 220, 1.1, 'sine', 0.07, 0, 'swell', 1760); note(sfxBus, t, 330, 1.1, 'p12', 0.03, 12, 'swell', 2640); for (let i = 0; i < 8; i++) note(sfxBus, t + 0.6 + i * 0.05, mtof(84 + (i % 4) * 3), 0.12, 'sine', 0.04, 0, 'pluck'); noise(sfxBus, t, 1.2, 0.07, 'bandpass', 3000, 6, 9000, 0.9); }, 0.5);
def('scrape', vol => { const t = T0(), v = vol || 1; noise(sfxBus, t, 0.55, 0.16 * v, 'bandpass', 260, 4, 150, 0.08); noise(sfxBus, t, 0.5, 0.06 * v, 'bandpass', 1300, 8, 700, 0.1); note(sfxBus, t, 55, 0.5, 'saw', 0.035 * v, 0, null, 49); }, 0.35);
def('fire', vol => { const t = T0(), v = vol || 1; noise(sfxBus, t, 1.4, 0.22 * v, 'lowpass', 500, 1, 2600, 0.25); for (let i = 0; i < 9; i++) noise(sfxBus, t + Math.random() * 1.2, 0.03, 0.12 * v, 'highpass', 3000 + Math.random() * 3000); }, 0.6);
def('arrow', () => { const t = T0(); note(sfxBus, t, 180, 0.12, 'tri', 0.1, 0, 'pluck', 120); noise(sfxBus, t + 0.02, 0.16, 0.12, 'bandpass', 2200, 2, 5200, 0.02); }, 0.08);
def('tagFall', () => { const t = T0(); note(sfxBus, t, 1400, 0.5, 'sine', 0.035, 0, null, 500); }, 0.1);
def('toll', () => { const t = T0(); [[36, 0.24], [43, 0.12], [48, 0.08], [51.2, 0.06], [55, 0.035]].forEach(([m, v]) => note(sfxBus, t, mtof(m), 5, 'sine', v, 0, 'pluck')); noise(sfxBus, t, 1.6, 0.18, 'lowpass', 260, 2); }, 1);
def('tv', () => { const t = T0(); note(sfxBus, t, 15600, 2.5, 'sine', 0.008, 0, null); noise(sfxBus, t, 0.4, 0.06, 'highpass', 4000); }, 1);
def('splash', () => { const t = T0(); noise(sfxBus, t, 0.3, 0.12, 'bandpass', 900, 1, 300); }, 0.3);

// ======================= ambience =======================
let amb = null;
function ambInit() {
  if (amb || !ctx) return;
  const loop = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
  // water lapping: low noise through a low-pass whose gain swells in waves
  const wSrc = loop(), wF = ctx.createBiquadFilter(), wG = ctx.createGain(), wF2 = ctx.createBiquadFilter();
  wF.type = 'lowpass'; wF.frequency.value = 520; wF2.type = 'highpass'; wF2.frequency.value = 90; wG.gain.value = 0;
  wSrc.connect(wF); wF.connect(wF2); wF2.connect(wG); wG.connect(ambBus); wSrc.start();
  // wind: band-passed noise with a wandering centre
  const nSrc = loop(), nF = ctx.createBiquadFilter(), nG = ctx.createGain();
  nF.type = 'bandpass'; nF.frequency.value = 500; nF.Q.value = 0.9; nG.gain.value = 0;
  nSrc.connect(nF); nF.connect(nG); nG.connect(ambBus); nSrc.start(0, 0.7);
  // wisp hum: two detuned sines with slow vibrato
  const h1 = ctx.createOscillator(), h2 = ctx.createOscillator(), hG = ctx.createGain(), lfo = ctx.createOscillator(), lfoG = ctx.createGain();
  h1.type = 'sine'; h2.type = 'sine'; h1.frequency.value = 233; h2.frequency.value = 349.5; lfo.frequency.value = 5.2; lfoG.gain.value = 4;
  lfo.connect(lfoG); lfoG.connect(h1.frequency); lfoG.connect(h2.frequency);
  hG.gain.value = 0; h1.connect(hG); h2.connect(hG); hG.connect(ambBus); h1.start(); h2.start(); lfo.start();
  amb = { wG, wF, nG, nF, hG, nextLap: 0, nextGust: 0, nextDrip: 0, water: 0, wind: 0, hum: 0 };
}
// p: { water 0..1, wind 0..1, hum 0..1, drips 0..1 }
function ambient(p) {
  if (!ctx || ctx.state !== 'running') return;
  ambInit();
  const t = ctx.currentTime;
  const w = p.water || 0, wi = p.wind || 0, hu = p.hum || 0;
  if (t > amb.nextLap) {
    // one lap of a wave: rise then fall
    const dur = rnd(1.2, 2.3), peak = w * rnd(0.22, 0.34), floor = w * 0.05;
    amb.wG.gain.cancelScheduledValues(t);
    amb.wG.gain.setValueAtTime(amb.wG.gain.value, t);
    amb.wG.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
    amb.wG.gain.linearRampToValueAtTime(floor, t + dur);
    amb.wF.frequency.setValueAtTime(380, t); amb.wF.frequency.linearRampToValueAtTime(rnd(650, 950), t + dur * 0.35); amb.wF.frequency.linearRampToValueAtTime(400, t + dur);
    amb.nextLap = t + dur * rnd(0.85, 1.0);
  }
  if (Math.abs(w - amb.water) > 0.05 && w < amb.water) { amb.wG.gain.setTargetAtTime(w * 0.05, t, 0.2); }
  amb.water = w;
  if (t > amb.nextGust) {
    const dur = rnd(2.5, 5);
    amb.nG.gain.cancelScheduledValues(t); amb.nG.gain.setValueAtTime(amb.nG.gain.value, t);
    amb.nG.gain.linearRampToValueAtTime(wi * rnd(0.05, 0.13), t + dur * 0.5); amb.nG.gain.linearRampToValueAtTime(wi * 0.03, t + dur);
    amb.nF.frequency.linearRampToValueAtTime(rnd(320, 950), t + dur);
    amb.nextGust = t + dur;
  }
  if (wi < amb.wind - 0.05) amb.nG.gain.setTargetAtTime(wi * 0.03, t, 0.3);
  amb.wind = wi;
  if (Math.abs(hu - amb.hum) > 0.02) { amb.hG.gain.setTargetAtTime(hu * 0.035, t, 0.15); amb.hum = hu; }
  if (p.drips && t > amb.nextDrip) { amb.nextDrip = t + rnd(0.8, 3.2) / p.drips; SF.drip(rnd(0.4, 1)); }
}
function ambientOff() { if (amb && ctx) { const t = ctx.currentTime; amb.wG.gain.setTargetAtTime(0, t, 0.1); amb.nG.gain.setTargetAtTime(0, t, 0.1); amb.hG.gain.setTargetAtTime(0, t, 0.1); amb.water = amb.wind = amb.hum = 0; amb.nextLap = amb.nextGust = t + 0.5; } }

A.init = init; A.setMute = setMute; A.setSong = (n, b) => { setSong(n, b); };
A.stop = stop; A.tick = () => { if (ctx && curName && !cur && ctx.state === 'running') { const n = curName; curName = null; setSong(n, A.pendingBend || 0); } tick(); };
A.level = () => { if (!A.an) return 0; const d = new Float32Array(A.an.fftSize); A.an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); };
A.sfx = SF; A.ambient = ambient; A.ambientOff = ambientOff;
Object.defineProperty(A, 'current', { get: () => curName });
Object.defineProperty(A, 'bend', { get: () => cur ? cur.bend : 0 });
Object.defineProperty(A, 'voices', { get: () => players.length });
G.SHA = A;
})(window);
