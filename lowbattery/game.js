// Low Battery - © 2026 Buggy Games YT. All rights reserved.
(() => {
'use strict';

// ---------- map ----------
const W = 47, H = 35;
const grid = []; // 0 floor, 1 wall, 2 bus, 3 desk, 4 gate
for (let y = 0; y < H; y++) { grid.push(new Array(W).fill(1)); }
function carve(x, y, w, h, v = 0) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) grid[j][i] = v; }
// garage
carve(1, 1, 20, 22);
[[4,3],[9,3],[14,3],[4,13],[9,13],[14,13]].forEach(([x,y]) => carve(x, y, 2, 7, 2));
// garage -> offices
carve(21, 5, 1, 2);
// offices
carve(22, 5, 24, 2);
carve(22, 1, 7, 3); carve(25, 4, 1, 1);
carve(30, 1, 7, 3); carve(33, 4, 1, 1);
carve(38, 1, 8, 3); carve(41, 4, 1, 1);
carve(22, 8, 10, 7); carve(26, 7, 1, 1);
carve(33, 8, 13, 7); carve(39, 7, 1, 1);
carve(35, 10, 5, 1, 3); carve(35, 12, 5, 1, 3); carve(23, 12, 3, 1, 3);
// tunnel
carve(21, 20, 4, 2);
carve(24, 20, 2, 13);
carve(26, 25, 3, 3);
carve(24, 31, 20, 2);
carve(42, 19, 2, 14);
carve(30, 19, 14, 2);
carve(30, 17, 2, 2);
// gate (bottom of garage)
carve(10, 23, 2, 1, 4);

const solid = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return true; const v = grid[y][x]; return v === 1 || v === 2 || v === 3 || (v === 4 && !gateOpen); };
const blocksLight = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return true; const v = grid[y][x]; return v === 1 || v === 2 || (v === 4 && !gateOpen); };

// ---------- objects ----------
const START = { x: 2.5, y: 21.5 };
const FUSES0 = [{ x: 19.5, y: 1.5, area: 'garage' }, { x: 44.5, y: 2.5, area: 'back office' }, { x: 30.8, y: 17.6, area: 'tunnel' }];
const CHARGERS = [{ x: 1.5, y: 11.5 }, { x: 24.5, y: 9.5 }, { x: 27.5, y: 26.5 }];
const ZSPAWN = [[17.5, 11.5], [7.5, 2.5], [27.5, 12.5], [42.5, 9.5], [33.5, 2.5], [24.5, 28.5], [36.5, 31.5], [42.5, 22.5]];
const BOX = { x: 12.6, y: 22.4 };
const NOTES0 = [
  { x: 7.5, y: 11.5, text: "NIGHT LOG, DRIVER 7\n\nThe depot power dies around 1 a.m. every night.\nKeep your phone charged.\nIt doesn't come near a full battery." },
  { x: 23.5, y: 2.5, text: "DISPATCH MEMO\n\nGate runs off the fuse box by the exit. Box needs 3 fuses.\nSpares: garage (far corner), back office, tunnel.\n\nAlso: STOP leaving phones charging overnight. Something keeps unplugging them." },
  { x: 40.5, y: 32.3, text: "(scratched into the wall)\n\nit counts.\nit whispers the number.\nwhen the number hits zero\nit stops whispering." }
];
const WALLWORDS = [
  { x: 6.0, y: 22.6, t: 'IT FEEDS ON THE DARK' },
  { x: 33.5, y: 7.6, t: 'I CAN HEAR YOU CHARGING' },
  { x: 25.0, y: 30.6, t: "DON'T LET IT HIT 0" },
  { x: 12.0, y: 0.6, t: 'KEEP IT ABOVE 20' },
  { x: 36.0, y: 18.6, t: 'IT LIKES THE HUM' }
];

// ---------- state ----------
let S = null, gateOpen = false, mode = 'title', zMode = false;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const dk = document.createElement('canvas'), dctx = dk.getContext('2d');
let VW = 0, VH = 0, DPR = 1, TS = 40;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.floor(VW * DPR); cv.height = Math.floor(VH * DPR);
  dk.width = cv.width; dk.height = cv.height;
  TS = Math.max(28, Math.min(64, Math.min(VW, VH) / 9.5));
}
window.addEventListener('resize', resize); resize();

// ---------- battery ----------
const BAT = { real: false, level: 0.64, charging: false, api: null, native: false, prevCharging: false };
function readNative() {
  try {
    if (window.LBNative && typeof window.LBNative.level === 'function') {
      const l = Number(window.LBNative.level());
      if (l >= 0) { BAT.level = l / 100; BAT.charging = !!window.LBNative.charging(); return true; }
    }
  } catch (e) {}
  return false;
}
async function initBattery() {
  if (readNative()) { BAT.native = true; BAT.real = true; return; }
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      BAT.api = b; BAT.real = true;
      const upd = () => { BAT.level = b.level; BAT.charging = b.charging; };
      upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
    }
  } catch (e) { BAT.real = false; }
}
setInterval(() => { if (BAT.native) readNative(); }, 1500);

// ---------- audio ----------
let AC = null, master = null, muted = localStorage.getItem('lb_mute') === '1';
let hum = null, drone = null, heart = 0;
function audio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(AC.destination);
    // ambient drone
    const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 43; f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = 0.05;
    o.connect(f); f.connect(g); g.connect(master); o.start(); drone = g;
    // charger hum
    const h = AC.createOscillator(), hg = AC.createGain();
    h.type = 'square'; h.frequency.value = 60; hg.gain.value = 0; h.connect(hg);
    const hf = AC.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 400; hg.connect(hf); hf.connect(master); h.start(); hum = hg;
  } catch (e) { AC = null; }
}
function setMute(m) { muted = m; localStorage.setItem('lb_mute', m ? '1' : '0'); if (master) master.gain.value = m ? 0 : 0.8; document.getElementById('muteBtn').textContent = 'Sound: ' + (m ? 'off' : 'on'); }
function blip(freq, dur, type = 'sine', vol = 0.2, slide = 0) {
  if (!AC) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.3, fq = 900) {
  if (!AC) return;
  const n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = buf; f.type = 'bandpass'; f.frequency.value = fq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
const NUM = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n) { if (n >= 100) return 'one hundred'; if (n < 20) return NUM[n]; return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + NUM[n % 10] : ''); }
function whisper(pct) {
  showMsg(pct + '%...', 2.5, '#b33');
  noise(1.1, 0.12, 2400);
  if (muted) return;
  try {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(words(pct) + ' percent');
      u.pitch = 0.1; u.rate = 0.6; u.volume = 0.7;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }
  } catch (e) {}
}

// ---------- input ----------
const keys = {};
let mouse = { x: 0, y: 0, active: false };
let touchMove = null, touchAim = null, hideHeld = false, isTouch = false;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (mode === 'play') {
    if (k === 'f') toggleLight();
    if (k === 'p' || k === 'escape') pause(true);
    if (k === ' ') e.preventDefault();
  } else if (mode === 'note' && (k === 'e' || k === 'enter' || k === ' ' || k === 'escape')) closeNote();
  else if (mode === 'pause' && (k === 'p' || k === 'escape')) pause(false);
  if (k === 'm') setMute(!muted);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
cv.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; shoot(); } });
addEventListener('mouseup', () => { mouse.down = false; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
cv.addEventListener('touchstart', e => {
  isTouch = true; document.getElementById('touch').classList.add('on'); mouse.active = false;
  for (const t of e.changedTouches) {
    if (t.clientX < VW / 2 && !touchMove) touchMove = { id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY };
    else if (!touchAim) touchAim = { id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY };
  }
  e.preventDefault();
}, { passive: false });
cv.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (touchMove && t.identifier === touchMove.id) { touchMove.x = t.clientX; touchMove.y = t.clientY; }
    if (touchAim && t.identifier === touchAim.id) {
      const dx = t.clientX - touchAim.x, dy = t.clientY - touchAim.y;
      if (dx * dx + dy * dy > 16 && S) { S.aimTarget = Math.atan2(t.clientY - touchAim.sy, t.clientX - touchAim.sx); S.aimHold = 2.5; }
      touchAim.x = t.clientX; touchAim.y = t.clientY;
      if (Math.hypot(t.clientX - touchAim.sx, t.clientY - touchAim.sy) > 70) { touchAim.sx += (t.clientX - touchAim.sx) * 0.3; touchAim.sy += (t.clientY - touchAim.sy) * 0.3; }
    }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) { if (touchMove && t.identifier === touchMove.id) touchMove = null; if (touchAim && t.identifier === touchAim.id) touchAim = null; } };
cv.addEventListener('touchend', endTouch); cv.addEventListener('touchcancel', endTouch);
const bHide = document.getElementById('bHide'), bLight = document.getElementById('bLight');
const press = (el, down, up) => { el.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false }); el.addEventListener('touchend', e => { e.preventDefault(); up && up(); }, { passive: false }); el.addEventListener('touchcancel', () => up && up()); };
press(bHide, () => { hideHeld = true; bHide.classList.add('on'); }, () => { hideHeld = false; bHide.classList.remove('on'); });
press(bLight, () => toggleLight());
press(document.getElementById('bPause'), () => pause(true));
const bShoot = document.getElementById('bShoot');
press(bShoot, () => { bShoot.classList.add('on'); shoot(); }, () => bShoot.classList.remove('on'));
function toggleLight() { if (!S) return; S.lightOn = !S.lightOn; blip(S.lightOn ? 1800 : 1200, 0.04, 'square', 0.08); }

// ---------- game ----------
function newGame() {
  gateOpen = false;
  S = {
    px: START.x, py: START.y, aim: -Math.PI / 2, aimTarget: -Math.PI / 2, aimHold: 0,
    lightOn: true, sim: !BAT.real || document.getElementById('simChk').checked,
    simLevel: 0.64, fuses: FUSES0.map(f => ({ ...f, got: false })), carried: 0, inserted: 0,
    notes: NOTES0.map(n => ({ ...n, read: false })),
    ck: { x: START.x, y: START.y }, visitedCk: new Set(),
    d: { x: 36.5, y: 6, tx: 36.5, ty: 6, path: [], repath: 0, burn: 0, state: 'wander', stun: 0, eyesBlink: 0 },
    t: 0, msg: '', msgT: 0, msgC: '#ddd', shake: 0, hurt: 0, flick: 1, flickT: 0,
    whisperT: 18, charging: false, wasCharging: false, caughtCount: 0, still: 0, step: 0, hidden: false,
    objective: 'Find a way out.', ended: false,
    ammo: 12, shootCd: 0, flash: 0, tracer: null, bodies: [],
    zombies: (zMode ? ZSPAWN : []).map(([x, y]) => ({ x, y, hp: 2, face: Math.random() * 6.28, path: [], repath: Math.random(), state: 'wander', groan: 2 + Math.random() * 5, ph: Math.random() * 6, stun: 0 }))
  };
  showMsg('Where... is everyone?', 3);
  setTimeout(() => S && showMsg(S.sim ? "Can't read your real battery here. Using the phone's own battery." : 'Your light runs on your real battery: ' + pct() + '%.', 4), 3200);
}
function level() { return S.sim ? S.simLevel : BAT.level; }
function pct() { return Math.max(0, Math.min(100, Math.round(level() * 100))); }
function showMsg(m, t = 3, c = '#ddd') { if (!S) return; S.msg = m; S.msgT = t; S.msgC = c; }
const onCharger = () => CHARGERS.find(c => Math.hypot(c.x - S.px, c.y - S.py) < 0.8);

function moveCircle(o, dx, dy, r) {
  const nx = o.x + dx; if (!solid(nx + Math.sign(dx) * r, o.y - r * 0.8) && !solid(nx + Math.sign(dx) * r, o.y + r * 0.8)) o.x = nx;
  const ny = o.y + dy; if (!solid(o.x - r * 0.8, ny + Math.sign(dy) * r) && !solid(o.x + r * 0.8, ny + Math.sign(dy) * r)) o.y = ny;
}
function los(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.15);
  for (let i = 1; i < n; i++) { const t = i / n; if (blocksLight(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
  return true;
}
function bfs(sx, sy, tx, ty) {
  sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
  const prev = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
  let head = 0;
  while (head < q.length) {
    const c = q[head++], cx = c % W, cy = (c - cx) / W;
    if (cx === tx && cy === ty) break;
    for (const [ox, oy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + ox, ny = cy + oy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const id = ny * W + nx; if (prev[id] !== -1 || solid(nx + 0.5, ny + 0.5)) continue;
      prev[id] = c; q.push(id);
    }
  }
  const goal = ty * W + tx; if (prev[goal] === -1) return [];
  const path = []; let c = goal;
  while (c !== sy * W + sx) { path.push({ x: c % W + 0.5, y: Math.floor(c / W) + 0.5 }); c = prev[c]; }
  return path.reverse();
}
function randomDarkSpot(minDist) {
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * H);
    if (solid(x + 0.5, y + 0.5) || grid[y][x] === 4) continue;
    if (Math.hypot(x + 0.5 - S.px, y + 0.5 - S.py) < minDist) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: 36.5, y: 6 };
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

// beam strength 0..1 (what the player gets)
function beam() {
  if (!S.lightOn || S.hidden) return 0;
  const L = level();
  return Math.max(0, Math.min(1, L)) * S.flick;
}
function beamRange(b) { return 1.6 + 7.2 * b; }
function beamHalf(b) { return 0.28 + 0.38 * b; }

function update(dt) {
  S.t += dt;
  if (!BAT.native && BAT.api) { BAT.level = BAT.api.level; BAT.charging = BAT.api.charging; }
  // charging
  const ch = onCharger();
  if (ch && !S.visitedCk.has(ch)) { S.visitedCk.add(ch); S.ck = { x: ch.x, y: ch.y }; if (zMode) S.ammo += 8; showMsg(S.sim ? 'Charging spot. Stand here to charge. (checkpoint)' : 'A working outlet. Plug in your real phone to charge. (checkpoint)', 4, '#7c7'); blip(880, 0.15, 'sine', 0.15); }
  S.charging = S.sim ? !!ch : BAT.charging;
  if (S.charging && !S.wasCharging) { showMsg('Charging... the light steadies.', 3, '#7c7'); blip(660, 0.1); blip(990, 0.15); S.whisperT = 5; }
  if (!S.charging && S.wasCharging) showMsg('Unplugged.', 2);
  S.wasCharging = S.charging;
  if (hum) hum.gain.setTargetAtTime(S.charging ? 0.025 : 0, AC.currentTime, 0.3);
  // sim battery
  if (S.sim) {
    if (S.charging) S.simLevel = Math.min(1, S.simLevel + 0.035 * dt);
    else if (S.lightOn && !S.hidden) S.simLevel -= 0.0016 * dt;
    else S.simLevel -= 0.0004 * dt;
    if (S.simLevel <= 0) { S.simLevel = 0; return end('dead'); }
  }
  // flicker
  const L = level();
  S.flickT -= dt;
  if (S.charging) S.flick = 1;
  else if (S.flickT <= 0) {
    if (L < 0.05) { S.flick = Math.random() < 0.5 ? 0 : 0.3 + Math.random() * 0.7; S.flickT = 0.05 + Math.random() * 0.25; }
    else if (L < 0.2) { S.flick = Math.random() < 0.18 ? (Math.random() < 0.5 ? 0 : 0.4) : 1; S.flickT = 0.06 + Math.random() * (S.flick < 1 ? 0.15 : 1.2); if (S.flick === 0) blip(3000, 0.02, 'square', 0.03); }
    else { S.flick = Math.random() < 0.02 ? 0.6 : 1; S.flickT = 0.1 + Math.random() * 2; }
  }
  // movement
  let mx = 0, my = 0;
  if (keys['a'] || keys['arrowleft']) mx -= 1; if (keys['d'] || keys['arrowright']) mx += 1;
  if (keys['w'] || keys['arrowup']) my -= 1; if (keys['s'] || keys['arrowdown']) my += 1;
  if (touchMove) { const dx = touchMove.x - touchMove.sx, dy = touchMove.y - touchMove.sy, m = Math.hypot(dx, dy); if (m > 8) { const k = Math.min(1, m / 55); mx = dx / m * k; my = dy / m * k; } }
  const mm = Math.hypot(mx, my); if (mm > 1) { mx /= mm; my /= mm; }
  S.hidden = keys[' '] || hideHeld;
  const spd = (S.hidden ? 1.4 : 3.1) * dt;
  const p = { x: S.px, y: S.py }; moveCircle(p, mx * spd, my * spd, 0.28); S.px = p.x; S.py = p.y;
  const moving = Math.hypot(mx, my) > 0.1;
  if (moving) { S.still = 0; S.step += dt * (S.hidden ? 2 : 4); if (S.step > 1) { S.step = 0; noise(0.05, S.hidden ? 0.03 : 0.08, 300); } } else S.still += dt;
  // aim
  if (mouse.active && !isTouch) { S.aimTarget = Math.atan2(mouse.y - VH / 2, mouse.x - VW / 2); }
  else { S.aimHold -= dt; if (moving && S.aimHold <= 0 && !touchAim) S.aimTarget = Math.atan2(my, mx); }
  S.aim += angDiff(S.aimTarget, S.aim) * Math.min(1, dt * 12);
  // pickups
  for (const f of S.fuses) if (!f.got && Math.hypot(f.x - S.px, f.y - S.py) < 0.7) {
    f.got = true; S.carried++; blip(520, 0.1, 'square', 0.12); blip(780, 0.2, 'square', 0.1);
    const n = S.fuses.filter(x => x.got).length;
    showMsg('Fuse ' + n + '/3' + (n === 3 ? '. Get to the fuse box by the gate.' : ''), 3.5, '#fd6');
    S.d.state = 'hunt'; S.shake = 0.3;
  }
  for (const n of S.notes) if (!n.read && Math.hypot(n.x - S.px, n.y - S.py) < 0.7) { n.read = true; openNote(n.text); return; }
  if (S.carried > 0 && Math.hypot(BOX.x - S.px, BOX.y - S.py) < 1.0) {
    S.inserted += S.carried; S.carried = 0; blip(200, 0.3, 'sawtooth', 0.15);
    if (S.inserted >= 3) { gateOpen = true; showMsg('The gate grinds open. GO.', 4, '#fd6'); noise(1.5, 0.25, 200); S.d.state = 'hunt'; }
    else showMsg('Fuse box: ' + S.inserted + '/3', 3, '#fd6');
  }
  if (gateOpen && S.py > 23.2) return end(S.charging ? 'plugged' : pct() >= 20 ? 'escape' : 'dead');
  S.objective = S.inserted >= 3 ? 'Get out through the gate.' : S.carried + S.inserted === 3 ? 'Bring the fuses to the box by the gate.' : 'Find the fuses: ' + (S.carried + S.inserted) + '/3';
  // whisper while charging
  if (S.charging) { S.whisperT -= dt; if (S.whisperT <= 0) { S.whisperT = 16 + Math.random() * 10; whisper(pct()); } }
  updateDimmer(dt);
  if (mode !== 'play') return;
  updateZombies(dt);
  if (zMode) updateGun(dt);
  if (S.msgT > 0) S.msgT -= dt;
  if (S.shake > 0) S.shake -= dt; if (S.hurt > 0) S.hurt -= dt;
}

function updateDimmer(dt) {
  const d = S.d, dist = Math.hypot(d.x - S.px, d.y - S.py);
  const b = beam(), fuses = S.fuses.filter(f => f.got).length + (gateOpen ? 1 : 0);
  if (d.stun > 0) { d.stun -= dt; return; }
  // in the beam?
  let lit = false;
  if (b > 0 && dist < beamRange(b) + 0.4) {
    const a = Math.atan2(d.y - S.py, d.x - S.px);
    if (Math.abs(angDiff(a, S.aim)) < beamHalf(b) + 0.15 && los(S.px, S.py, d.x, d.y)) lit = true;
  }
  d.lit = lit;
  let slow = 1;
  if (lit) {
    if (b > 0.35) { d.burn += dt * b * 1.3; slow = 0; if (Math.random() < dt * 4) noise(0.08, 0.06, 3500); }
    else slow = 0.55;
    if (d.burn > 1.1) {
      d.burn = 0; noise(0.6, 0.3, 1800); blip(140, 0.6, 'sawtooth', 0.15, 0.4);
      const s = randomDarkSpot(13); d.x = s.x; d.y = s.y; d.path = []; d.state = 'wander'; d.stun = 2.5;
      showMsg('It hates the light.', 2.5, '#aaa'); return;
    }
  } else d.burn = Math.max(0, d.burn - dt * 0.3);
  // awareness
  const hearRange = 7 + (S.lightOn && !S.hidden ? 5 : 0) + fuses * 1.5;
  if (S.charging) d.state = 'hunt';
  else if (S.hidden && S.still > 1.2 && dist > 2.2) { if (d.state === 'hunt') { d.state = 'wander'; d.path = []; showMsg('It lost you...', 2, '#888'); } }
  else if (dist < hearRange) d.state = 'hunt';
  // move
  d.repath -= dt;
  if (d.repath <= 0 || !d.path.length) {
    d.repath = 0.5;
    if (d.state === 'hunt') d.path = bfs(d.x, d.y, S.px, S.py);
    else if (!d.path.length) { const s = randomDarkSpot(4); d.path = bfs(d.x, d.y, s.x, s.y); }
  }
  const L = level();
  let spd = (1.45 + fuses * 0.3) * (1.35 - Math.min(1, L) * 0.6) * slow;
  if (d.state === 'wander') spd *= 0.6;
  if (S.charging) spd *= 1.15;
  if (d.path.length) {
    const n = d.path[0], dx = n.x - d.x, dy = n.y - d.y, m = Math.hypot(dx, dy);
    if (m < 0.08) d.path.shift(); else { const st = Math.min(m, spd * dt); d.x += dx / m * st; d.y += dy / m * st; }
    if (d.state === 'hunt' && dist < 1.6 && los(d.x, d.y, S.px, S.py)) { const st = spd * dt; d.x += (S.px - d.x) / dist * st * 0.5; d.y += (S.py - d.y) / dist * st * 0.5; }
  }
  // heartbeat
  heart -= dt;
  if (dist < 8 && heart <= 0) { heart = 0.35 + dist * 0.12; blip(55, 0.12, 'sine', 0.35 * (1 - dist / 8)); }
  if (navigator.vibrate && isTouch && dist < 3 && heart > 0.6) {}
  // caught
  if (dist < 0.55) caught();
}

function updateZombies(dt) {
  const lightOut = S.lightOn && !S.hidden && beam() > 0.02;
  const fuses = S.fuses.filter(f => f.got).length;
  for (const z of S.zombies) {
    if (z.stun > 0) { z.stun -= dt; continue; }
    const dist = Math.hypot(z.x - S.px, z.y - S.py);
    // zombies are drawn to light and noise, not scared of it
    let sense = lightOut ? 6 + 4 * beam() : 2.5;
    if (S.hidden && S.still > 0.8) sense = 1.3;
    const sees = dist < sense && (dist < 2 || los(z.x, z.y, S.px, S.py));
    if (sees) { if (z.state !== 'hunt') { z.state = 'hunt'; z.repath = 0; noise(0.5, 0.12 * (1 - dist / 12), 220); } z.lost = 0; }
    else if (z.state === 'hunt') { z.lost = (z.lost || 0) + dt; if (z.lost > 3) { z.state = 'wander'; z.path = []; } }
    z.repath -= dt;
    if (z.repath <= 0 || !z.path.length) {
      z.repath = 0.8;
      if (z.state === 'hunt') z.path = bfs(z.x, z.y, S.px, S.py);
      else if (!z.path.length) {
        const tx = Math.floor(z.x + (Math.random() - 0.5) * 10), ty = Math.floor(z.y + (Math.random() - 0.5) * 10);
        if (tx > 0 && ty > 0 && tx < W && ty < H && !solid(tx + 0.5, ty + 0.5) && grid[ty][tx] !== 4) z.path = bfs(z.x, z.y, tx + 0.5, ty + 0.5).slice(0, 12);
      }
    }
    const spd = (z.state === 'hunt' ? 1.15 + fuses * 0.12 : 0.55) * (0.85 + 0.15 * Math.sin(S.t * 3 + z.ph));
    if (z.path.length) {
      const n = z.path[0], dx = n.x - z.x, dy = n.y - z.y, m = Math.hypot(dx, dy);
      if (m < 0.08) z.path.shift(); else { const st = Math.min(m, spd * dt); z.x += dx / m * st; z.y += dy / m * st; z.face += angDiff(Math.atan2(dy, dx), z.face) * Math.min(1, dt * 6); }
    }
    z.groan -= dt;
    if (z.groan <= 0) { z.groan = 4 + Math.random() * 6; if (dist < 9) { blip(90 + Math.random() * 40, 0.7, 'sawtooth', 0.12 * (1 - dist / 9), 0.6); } }
    if (dist < 0.5) { caught(true); return; }
  }
}

function shoot() {
  if (!S || mode !== 'play' || !zMode || S.shootCd > 0) return;
  if (S.ammo <= 0) { blip(1500, 0.03, 'square', 0.08); showMsg('Out of ammo. Find a charging spot.', 2, '#d95'); S.shootCd = 0.3; return; }
  S.ammo--; S.shootCd = 0.38; S.flash = 0.08; S.shake = Math.max(S.shake, 0.12);
  noise(0.25, 0.5, 1200); blip(70, 0.25, 'square', 0.25, 0.4);
  const cx = Math.cos(S.aim), cy = Math.sin(S.aim);
  let r = 0; while (r < 12) { r += 0.1; if (blocksLight(S.px + cx * r, S.py + cy * r)) break; }
  let hit = null, best = r;
  for (const z of S.zombies) {
    const rx = z.x - S.px, ry = z.y - S.py, along = rx * cx + ry * cy; if (along < 0 || along > best) continue;
    const off = Math.abs(rx * cy - ry * cx); if (off < 0.42) { hit = z; best = along; }
  }
  S.tracer = { x: S.px + cx * best, y: S.py + cy * best, t: 0.07 };
  if (hit) {
    hit.hp -= best < 2.5 ? 2 : 1; hit.stun = 0.5; hit.x += cx * 0.25; hit.y += cy * 0.25; noise(0.15, 0.3, 500);
    if (hit.hp <= 0) { S.zombies.splice(S.zombies.indexOf(hit), 1); S.bodies.push({ x: hit.x, y: hit.y, a: S.aim }); blip(110, 0.5, 'sawtooth', 0.15, 0.3); if (!S.zombies.length) showMsg('That was the last zombie.', 3, '#fd6'); }
  }
  // gunshots are loud: nearby zombies come running
  for (const z of S.zombies) if (Math.hypot(z.x - S.px, z.y - S.py) < 11) { z.state = 'hunt'; z.repath = 0; z.lost = 0; }
}
function updateGun(dt) {
  if (S.shootCd > 0) S.shootCd -= dt; if (S.flash > 0) S.flash -= dt;
  if (S.tracer) { S.tracer.t -= dt; if (S.tracer.t <= 0) S.tracer = null; }
  if (keys['e'] || keys['shift'] || mouse.down) shoot();
}

function caught(byZombie) {
  S.caughtCount++; S.hurt = 1.2; S.shake = 0.6;
  noise(0.9, 0.5, 600); blip(90, 0.8, 'sawtooth', 0.3, 0.3);
  try { navigator.vibrate && navigator.vibrate([200, 80, 300]); } catch (e) {}
  if (S.sim) S.simLevel = Math.max(0.01, S.simLevel - 0.08);
  S.px = S.ck.x; S.py = S.ck.y;
  const s = randomDarkSpot(14); S.d.x = s.x; S.d.y = s.y; S.d.path = []; S.d.state = 'wander'; S.d.stun = 3;
  for (const z of S.zombies) if (Math.hypot(z.x - S.px, z.y - S.py) < 7) { const s2 = randomDarkSpot(10); z.x = s2.x; z.y = s2.y; z.path = []; z.state = 'wander'; z.stun = 2; }
  if (byZombie) { showMsg(['A zombie grabbed you. You broke free and ran.', 'They follow the light...', 'Teeth. So many teeth.'][Math.min(2, S.caughtCount - 1)], 3.5, '#d55'); return; }
  showMsg(['It touched you. You woke up somewhere else.', 'Again. It was so cold.', 'It knows your face now.'][Math.min(2, S.caughtCount - 1)], 3.5, '#d55');
}

// ---------- render ----------
let lastPoly = [];
function lightPoly(b) {
  const pts = [], R = beamRange(b), half = beamHalf(b), N = 64;
  for (let i = 0; i <= N; i++) {
    const a = S.aim - half + (2 * half) * i / N, cx = Math.cos(a), cy = Math.sin(a);
    let r = 0; while (r < R) { r += 0.08; if (blocksLight(S.px + cx * r, S.py + cy * r)) break; }
    pts.push([S.px + cx * Math.min(r + 0.25, R), S.py + cy * Math.min(r + 0.25, R)]);
  }
  return pts;
}
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

function render() {
  const c = ctx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, VW, VH);
  if (!S) return;
  let sx = 0, sy = 0; if (S.shake > 0) { sx = (Math.random() - 0.5) * 10 * S.shake; sy = (Math.random() - 0.5) * 10 * S.shake; }
  const camX = S.px * TS - VW / 2 + sx, camY = S.py * TS - VH / 2 + sy;
  const wx = x => x * TS - camX, wy = y => y * TS - camY;
  const x0 = Math.max(0, Math.floor(camX / TS) - 1), x1 = Math.min(W, Math.ceil((camX + VW) / TS) + 1);
  const y0 = Math.max(0, Math.floor(camY / TS) - 1), y1 = Math.min(H, Math.ceil((camY + VH) / TS) + 1);
  // tiles
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const v = grid[y][x], X = wx(x), Y = wy(y), h = hash(x, y);
    if (v === 1) { c.fillStyle = '#1a1816'; c.fillRect(X, Y, TS + 1, TS + 1); if (y + 1 < H && grid[y + 1][x] !== 1) { c.fillStyle = '#2b2723'; c.fillRect(X, Y + TS * 0.55, TS + 1, TS * 0.45 + 1); } }
    else {
      const tunnel = x >= 21 && y >= 17;
      c.fillStyle = tunnel ? (h < 0.5 ? '#2a2a26' : '#272722') : (h < 0.5 ? '#3a3935' : '#363531'); c.fillRect(X, Y, TS + 1, TS + 1);
      if (h > 0.85) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(X + TS * h, Y + TS * (1 - h) + 4, TS * 0.18, 0, 7); c.fill(); }
      if (!tunnel && x <= 20 && (x === 7 || x === 12 || x === 17) ) { c.fillStyle = '#7a6a2a'; c.fillRect(X + TS * 0.47, Y, TS * 0.06, TS); }
      if (v === 2) {
        c.fillStyle = '#9c7a1c'; c.fillRect(X, Y, TS + 1, TS + 1);
        c.fillStyle = '#2e3a44'; if (y % 7 !== 2) c.fillRect(X + (x % 2 ? 2 : TS * 0.6), Y + 3, TS * 0.38, TS - 6);
      }
      if (v === 3) { c.fillStyle = '#4b3a2a'; c.fillRect(X + 2, Y + 4, TS - 4, TS - 8); c.fillStyle = '#5c4834'; c.fillRect(X + 2, Y + 4, TS - 4, 4); }
      if (v === 4) { c.fillStyle = gateOpen ? '#1e1e1e' : '#555'; c.fillRect(X, Y, TS + 1, TS + 1); if (!gateOpen) { c.fillStyle = '#333'; for (let i = 0; i < 5; i++) c.fillRect(X + i * TS / 5 + 2, Y, 3, TS); } }
    }
  }
  // wall words (only while charging)
  if (S.charging) {
    c.font = `bold ${Math.round(TS * 0.36)}px "Courier New", monospace`; c.textAlign = 'center';
    for (const w of WALLWORDS) { c.fillStyle = `rgba(150,255,170,${0.55 + Math.sin(S.t * 3 + w.x) * 0.2})`; c.fillText(w.t, wx(w.x), wy(w.y)); }
  }
  // chargers
  for (const ch of CHARGERS) {
    const X = wx(ch.x), Y = wy(ch.y);
    c.fillStyle = '#123a1c'; c.fillRect(X - TS * 0.3, Y - TS * 0.3, TS * 0.6, TS * 0.6);
    c.fillStyle = S.visitedCk.has(ch) ? '#5f5' : '#2a8'; c.fillRect(X - TS * 0.12, Y - TS * 0.2, TS * 0.08, TS * 0.18); c.fillRect(X + TS * 0.04, Y - TS * 0.2, TS * 0.08, TS * 0.18);
  }
  // fuse box
  { const X = wx(BOX.x), Y = wy(BOX.y); c.fillStyle = '#4a4f55'; c.fillRect(X - TS * 0.35, Y - TS * 0.4, TS * 0.7, TS * 0.6);
    for (let i = 0; i < 3; i++) { c.fillStyle = i < S.inserted ? '#fc3' : '#222'; c.fillRect(X - TS * 0.25 + i * TS * 0.2, Y - TS * 0.25, TS * 0.12, TS * 0.3); } }
  // notes
  for (const n of S.notes) if (!n.read) { const X = wx(n.x), Y = wy(n.y); c.save(); c.translate(X, Y); c.rotate(0.2); c.fillStyle = '#d9d2b8'; c.fillRect(-TS * 0.2, -TS * 0.25, TS * 0.4, TS * 0.5); c.fillStyle = '#777'; for (let i = 0; i < 4; i++) c.fillRect(-TS * 0.14, -TS * 0.16 + i * TS * 0.1, TS * 0.28, 1.5); c.restore(); }
  // fuses
  for (const f of S.fuses) if (!f.got) { const X = wx(f.x), Y = wy(f.y); c.fillStyle = '#c92'; c.fillRect(X - TS * 0.08, Y - TS * 0.2, TS * 0.16, TS * 0.4); c.fillStyle = '#ddd'; c.fillRect(X - TS * 0.1, Y - TS * 0.24, TS * 0.2, TS * 0.08); c.fillRect(X - TS * 0.1, Y + TS * 0.16, TS * 0.2, TS * 0.08); }
  // dimmer body (drawn in world; darkness hides it unless lit)
  const d = S.d, DX = wx(d.x), DY = wy(d.y), wob = Math.sin(S.t * 7) * 0.05;
  c.fillStyle = '#050505';
  c.beginPath(); c.ellipse(DX, DY, TS * (0.36 + wob), TS * (0.48 - wob), 0, 0, 7); c.fill();
  for (let i = 0; i < 6; i++) { const a = S.t * 2 + i; c.beginPath(); c.arc(DX + Math.cos(a) * TS * 0.4, DY + Math.sin(a * 1.3) * TS * 0.45, TS * 0.12, 0, 7); c.fill(); }
  // bodies
  for (const b of S.bodies) { const X = wx(b.x), Y = wy(b.y); c.save(); c.translate(X, Y); c.rotate(b.a); c.fillStyle = '#2e3826'; c.fillRect(-TS * 0.3, -TS * 0.2, TS * 0.6, TS * 0.4); c.fillStyle = '#4a1010'; c.beginPath(); c.arc(TS * 0.1, 0, TS * 0.3, 0, 7); c.globalAlpha = 0.6; c.fill(); c.globalAlpha = 1; c.restore(); }
  // zombies (drawn rotated to face where they walk, arms reaching forward)
  for (const z of S.zombies) {
    const X = wx(z.x), Y = wy(z.y); if (X < -TS || Y < -TS || X > VW + TS || Y > VH + TS) continue;
    const sw = Math.sin(S.t * 4 + z.ph) * TS * 0.04;
    c.save(); c.translate(X, Y); c.rotate(z.face);
    c.fillStyle = '#3d4a33';
    c.fillRect(TS * 0.05, -TS * 0.27 + sw, TS * 0.32, TS * 0.09); c.fillRect(TS * 0.05, TS * 0.18 - sw, TS * 0.32, TS * 0.09);
    c.fillStyle = '#5d6b46'; c.fillRect(TS * 0.33, -TS * 0.28 + sw, TS * 0.07, TS * 0.11); c.fillRect(TS * 0.33, TS * 0.17 - sw, TS * 0.07, TS * 0.11);
    c.fillStyle = '#3d4a33'; c.beginPath(); c.ellipse(0, 0, TS * 0.2, TS * 0.28, 0, 0, 7); c.fill();
    c.fillStyle = z.hp < 2 ? '#6b4a3a' : '#5d6b46'; c.beginPath(); c.arc(TS * 0.04, 0, TS * 0.15, 0, 7); c.fill();
    c.fillStyle = z.state === 'hunt' ? '#c22' : '#666'; c.fillRect(TS * 0.11, -TS * 0.08, TS * 0.05, TS * 0.05); c.fillRect(TS * 0.11, TS * 0.03, TS * 0.05, TS * 0.05);
    c.restore();
  }
  // player
  { const X = wx(S.px), Y = wy(S.py); c.fillStyle = '#4a5866'; c.beginPath(); c.arc(X, Y, TS * 0.28, 0, 7); c.fill(); c.fillStyle = '#c9a57f'; c.beginPath(); c.arc(X, Y, TS * 0.16, 0, 7); c.fill();
    c.fillStyle = '#ddd'; c.fillRect(X + Math.cos(S.aim) * TS * 0.28 - 3, Y + Math.sin(S.aim) * TS * 0.28 - 3, 6, 6);
    if (zMode) { c.save(); c.translate(X, Y); c.rotate(S.aim); c.fillStyle = '#222'; c.fillRect(TS * 0.12, TS * 0.1, TS * 0.3, TS * 0.07); c.restore(); } }

  // ---- darkness ----
  const b = beam();
  const g = dctx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(0,0,0,0.985)'; g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'destination-out';
  const PX = wx(S.px), PY = wy(S.py);
  // tiny ambient around player (screen glow)
  const amb = S.hidden ? 0.35 : 0.9 + (S.charging ? 0.4 : 0);
  let rg = g.createRadialGradient(PX, PY, 0, PX, PY, TS * 1.3 * amb);
  rg.addColorStop(0, 'rgba(0,0,0,0.75)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(PX - TS * 3, PY - TS * 3, TS * 6, TS * 6);
  if (b > 0.01) {
    const poly = lightPoly(b), R = beamRange(b) * TS;
    rg = g.createRadialGradient(PX, PY, TS * 0.2, PX, PY, R);
    rg.addColorStop(0, `rgba(0,0,0,${0.35 + 0.65 * Math.min(1, b * 1.3)})`); rg.addColorStop(0.6, `rgba(0,0,0,${0.25 + 0.6 * b})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.beginPath(); g.moveTo(PX, PY); for (const [x, y] of poly) g.lineTo(wx(x), wy(y)); g.closePath(); g.fill();
    lastPoly = poly;
  }
  // charger glow
  for (const ch of CHARGERS) { const X = wx(ch.x), Y = wy(ch.y); const r2 = g.createRadialGradient(X, Y, 0, X, Y, TS * 0.9); r2.addColorStop(0, 'rgba(0,0,0,.6)'); r2.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r2; g.fillRect(X - TS, Y - TS, TS * 2, TS * 2); }
  if (gateOpen) { const X = wx(11), Y = wy(23.5); const r2 = g.createRadialGradient(X, Y, 0, X, Y, TS * 2.5); r2.addColorStop(0, 'rgba(0,0,0,.7)'); r2.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r2; g.fillRect(X - TS * 3, Y - TS * 3, TS * 6, TS * 6); }
  if (S.flash > 0) { const r3 = g.createRadialGradient(PX, PY, 0, PX, PY, TS * 5); r3.addColorStop(0, 'rgba(0,0,0,.9)'); r3.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r3; g.fillRect(PX - TS * 5, PY - TS * 5, TS * 10, TS * 10); }
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(dk, 0, 0); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  // warm beam tint
  if (b > 0.01 && lastPoly.length) {
    c.globalCompositeOperation = 'soft-light'; c.fillStyle = `rgba(255,220,150,${0.25 * b})`;
    c.beginPath(); c.moveTo(PX, PY); for (const [x, y] of lastPoly) c.lineTo(wx(x), wy(y)); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  if (S.tracer) { c.strokeStyle = 'rgba(255,230,150,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(PX + Math.cos(S.aim) * TS * 0.42, PY + Math.sin(S.aim) * TS * 0.42); c.lineTo(wx(S.tracer.x), wy(S.tracer.y)); c.stroke(); }
  // dimmer eyes glint in the dark
  const dist = Math.hypot(d.x - S.px, d.y - S.py);
  if (dist < 7 && !d.lit && d.stun <= 0) {
    d.eyesBlink -= 1 / 60; if (d.eyesBlink < -0.15) d.eyesBlink = 1 + Math.random() * 3;
    if (d.eyesBlink > 0) { const a = 0.25 + 0.6 * (1 - dist / 7); c.fillStyle = `rgba(230,230,230,${a})`; c.fillRect(DX - TS * 0.13, DY - TS * 0.1, TS * 0.07, TS * 0.04); c.fillRect(DX + TS * 0.06, DY - TS * 0.1, TS * 0.07, TS * 0.04); }
  }
  for (const z of S.zombies) if (z.state === 'hunt' && Math.hypot(z.x - S.px, z.y - S.py) < 6) { const X = wx(z.x), Y = wy(z.y); c.fillStyle = 'rgba(200,30,30,.55)'; c.fillRect(X - TS * 0.08, Y - TS * 0.08, TS * 0.05, TS * 0.05); c.fillRect(X + TS * 0.03, Y - TS * 0.08, TS * 0.05, TS * 0.05); }
  if (d.lit) { c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(DX - TS * 0.14, DY - TS * 0.12, TS * 0.08, TS * 0.08); c.fillRect(DX + TS * 0.06, DY - TS * 0.12, TS * 0.08, TS * 0.08); }
  // vignette / hurt / static
  if (S.hurt > 0) { c.fillStyle = `rgba(120,0,0,${Math.min(0.6, S.hurt * 0.5)})`; c.fillRect(0, 0, VW, VH); }
  const near = Math.max(0, 1 - dist / 5);
  if (near > 0) { c.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 60 * near; i++) c.fillRect(Math.random() * VW, Math.random() * VH, 2, 2); }
  hud();
}

function hud() {
  const c = ctx, p = pct();
  const x = 14 + (window.visualViewport ? 0 : 0), y = 14;
  c.globalAlpha = 0.9;
  c.strokeStyle = '#ddd'; c.lineWidth = 2; c.strokeRect(x, y, 44, 20); c.fillStyle = '#ddd'; c.fillRect(x + 44, y + 6, 4, 8);
  c.fillStyle = p <= 20 ? '#e0303a' : p <= 50 ? '#e6b030' : '#7c7';
  if (!(p <= 20 && Math.floor(S.t * 2) % 2)) c.fillRect(x + 3, y + 3, Math.max(1, 38 * p / 100), 14);
  c.font = 'bold 15px ui-monospace, monospace'; c.textAlign = 'left'; c.fillStyle = '#eee';
  c.fillText(p + '%' + (S.charging ? ' ⚡' : ''), x + 56, y + 16);
  c.font = '11px ui-monospace, monospace'; c.fillStyle = '#888'; c.fillText(S.sim ? 'IN-GAME BATTERY' : 'REAL BATTERY', x, y + 36);
  c.fillStyle = '#fd6'; c.font = '13px ui-monospace, monospace'; c.fillText('FUSES ' + (S.carried + S.inserted) + '/3' + (S.lightOn ? '' : '   LIGHT OFF') + (S.hidden ? '   HIDING' : ''), x, y + 54);
  if (zMode) { c.fillStyle = S.ammo ? '#ddd' : '#d55'; c.fillText('AMMO ' + S.ammo + '   ZOMBIES ' + S.zombies.length, x, y + 72); }
  c.textAlign = 'center'; c.fillStyle = '#aaa'; c.font = '13px ui-monospace, monospace';
  c.fillText(S.objective, VW / 2, VH - (isTouch ? 118 : 22));
  if (S.msgT > 0) { c.globalAlpha = Math.min(1, S.msgT); c.fillStyle = S.msgC; c.font = `bold ${VW < 500 ? 15 : 18}px ui-monospace, monospace`; c.fillText(S.msg, VW / 2, VH * 0.22); }
  c.globalAlpha = 1;
}

// ---------- panels ----------
const $ = id => document.getElementById(id);
function panel(id) { for (const p of document.querySelectorAll('.panel')) p.classList.toggle('show', p.id === id); }
function openNote(t) { mode = 'note'; $('noteText').textContent = t; panel('notePanel'); blip(300, 0.1, 'triangle', 0.08); }
function closeNote() { mode = 'play'; panel(null); }
function pause(on) { if (on && mode === 'play') { mode = 'pause'; panel('pausePanel'); } else if (!on && mode === 'pause') { mode = 'play'; panel(null); } }
const ENDS = {
  escape: ['THE LAST BUS', "You squeeze through the gate into the cold air. Streetlights. Real ones.\nYour phone buzzes. A text from an unknown number:\n\n\"see you on the next bus.\""],
  dead: ['DEAD BATTERY', "The screen goes black.\nIn the dark, something very close whispers one last number.\n\n\"zero.\""],
  plugged: ['PLUGGED IN', "You made it out, still charging. You feel the cable twitch.\nAt home you plug your phone in by the bed.\n\nAt 3:07 a.m. it lights up on its own.\n\"100%. I'm home.\""]
};
function end(kind) {
  if (S.ended) return; S.ended = true; mode = 'end';
  if (kind === 'dead') { noise(2, 0.4, 300); } else blip(440, 0.6, 'sine', 0.15);
  const [t, txt] = ENDS[kind];
  $('endTitle').textContent = t;
  $('endText').textContent = txt + '\n\nEnding ' + (['escape', 'plugged', 'dead'].indexOf(kind) + 1) + ' of 3.' + (kind === 'dead' && S.sim ? '' : '');
  const seen = new Set(JSON.parse(localStorage.getItem('lb_ends') || '[]')); seen.add(kind); localStorage.setItem('lb_ends', JSON.stringify([...seen]));
  setTimeout(() => panel('endPanel'), kind === 'dead' ? 1200 : 400);
}
function refreshBatInfo() {
  const seen = JSON.parse(localStorage.getItem('lb_ends') || '[]');
  const ends = seen.length ? ` Endings found: ${seen.length}/3.` : '';
  if (BAT.real) { $('batInfo').innerHTML = `Your battery: <b>${Math.round(BAT.level * 100)}%</b>${BAT.charging ? ' (charging)' : ''}. That's how bright your light will be.${ends}`; $('simRow').style.display = ''; }
  else { $('batInfo').innerHTML = `Can't read your real battery here, so you'll get an in-game battery that drains.${ends}`; $('simRow').style.display = 'none'; }
}
const startGame = z => { zMode = z; document.getElementById('touch').classList.toggle('zm', z); audio(); if (AC && AC.state === 'suspended') AC.resume(); newGame(); mode = 'play'; panel(null); };
$('zStartBtn').onclick = () => startGame(true);
$('startBtn').onclick = () => { startGame(false); return; audio(); if (AC && AC.state === 'suspended') AC.resume(); newGame(); mode = 'play'; panel(null); };
$('helpBtn').onclick = () => panel('help');
$('helpBack').onclick = () => panel('title');
$('noteClose').onclick = closeNote;
$('resumeBtn').onclick = () => pause(false);
$('muteBtn').onclick = () => setMute(!muted);
$('quitBtn').onclick = () => { mode = 'title'; S = null; refreshBatInfo(); panel('title'); };
$('againBtn').onclick = () => { mode = 'title'; S = null; refreshBatInfo(); panel('title'); };
setMute(muted);
window.addEventListener('pagehide', () => { if (mode === 'play') pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') pause(true); });
window.lbBack = () => { if (mode === 'play') { pause(true); return 1; } if (mode === 'pause' || mode === 'note') { mode === 'note' ? closeNote() : pause(false); return 1; } return 0; };

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === 'play' && S) update(dt);
  render();
  requestAnimationFrame(frame);
}
initBattery().then(refreshBatInfo);
setInterval(() => { if (mode === 'title') refreshBatInfo(); }, 2000);
requestAnimationFrame(frame);

// test hook
window.__lb = { grid, bfs, solid: (x, y) => solid(x, y), get S() { return S; } };
})();
