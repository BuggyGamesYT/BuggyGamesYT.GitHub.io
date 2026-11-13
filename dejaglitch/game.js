// Déjà Glitch · © 2026 Buggy Games YT
'use strict';
(() => {
  const W = 960, H = 540, FLOOR = 440, FY = 478, L = 2600, SPEED = 250;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
  }
  addEventListener('resize', fit); fit();

  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const IN_APP = location.host === 'appassets.androidplatform.net';
  if (IN_APP) $('homeLink').style.display = 'none';

  // ---------- data ----------
  const REQ = [3, 4, 4, 5, 5, 6];
  const SECTOR_NAMES = ['Subway Underpass', 'Office Corridor', 'Night Alley', 'Red Hall', 'Violet Wing', 'The Source'];
  const THEMES = [
    { ceil: '#23282a', wall: '#cfd6cf', wall2: '#93a496', seam: '#b4beb5', floor: '#55605a', fl2: '#4a544e', acc: '#2f8f4e' },
    { ceil: '#2c2924', wall: '#d6cdb9', wall2: '#a39579', seam: '#bfb59f', floor: '#665d4f', fl2: '#5a5244', acc: '#8a6a2e' },
    { ceil: '#0d1220', wall: '#5b6b86', wall2: '#3a465e', seam: '#4f5e78', floor: '#272d3a', fl2: '#20252f', acc: '#5aa0ff' },
    { ceil: '#1e0c0e', wall: '#a8565a', wall2: '#6e3134', seam: '#97494d', floor: '#3a2224', fl2: '#311c1e', acc: '#ff6b6b' },
    { ceil: '#160f22', wall: '#8a74ad', wall2: '#5a4877', seam: '#7c67a0', floor: '#2f2840', fl2: '#282236', acc: '#c49bff' },
    { ceil: '#010603', wall: '#123a22', wall2: '#0a2615', seam: '#1a4d2d', floor: '#06160c', fl2: '#041009', acc: '#3dff86' },
  ];
  const ANOM = {
    cat:     { name: 'Black cat déjà vu', tier: 1 },
    clones:  { name: 'Repeating NPC', tier: 1 },
    code:    { name: 'Code wall', tier: 1 },
    missing: { name: 'Missing texture', tier: 1 },
    tpose:   { name: 'T-pose glide', tier: 1 },
    clip:    { name: 'Floor clipping', tier: 1 },
    popin:   { name: 'Texture pop-in', tier: 2 },
    eyes:    { name: 'Watching poster', tier: 2 },
    float:   { name: 'Floating trash can', tier: 2 },
    sign:    { name: 'Backwards exit sign', tier: 2 },
    lights:  { name: 'Flickering light', tier: 3 },
    door:    { name: 'Door number swap', tier: 3 },
    clock:   { name: 'Backwards clock', tier: 3 },
    shadow:  { name: 'Lagging shadow', tier: 3 },
    possess: { name: 'Stranger turns Agent', tier: 1 },
    ripple:  { name: 'Liquid wall', tier: 2 },
    spoon:   { name: 'Bending spoon', tier: 3 },
  };
  const NG = 17;
  const LIGHTS = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
  const CODE_CH = '01<>{}#$%&*+=?/\\アイウエオカキクケコサシスセソ'.split('');

  // ---------- save ----------
  let best = { sector: 0, wins: 0, time: 0, found: [] };
  try { best = Object.assign(best, JSON.parse(localStorage.getItem('dejaglitch-best') || '{}')); } catch (e) {}
  const AGD = [{ n: 'Normal', sp: 1, mx: 3, cd: 1, bv: 1 }, { n: 'Easy', sp: .75, mx: 2, cd: 1.6, bv: .8 }, { n: 'Chill', sp: .55, mx: 1, cd: 2.2, bv: .65 }];
  let opts = { agent: 0, shoot: true };
  try { opts = Object.assign(opts, JSON.parse(localStorage.getItem('dejaglitch-opts') || '{}')); } catch (e) {}
  function saveOpts() { try { localStorage.setItem('dejaglitch-opts', JSON.stringify(opts)); } catch (e) {} }
  const AG = () => AGD[opts.agent] || AGD[0];
  function save() { try { localStorage.setItem('dejaglitch-best', JSON.stringify(best)); } catch (e) {} }
  function bestLine() {
    const f = (best.found || []).length;
    let s = '';
    if (best.wins) s = `Escaped ${best.wins}× · best time ${fmt(best.time)} · glitches found ${f}/${NG}`;
    else if (best.sector > 0 || f) s = `Furthest: Sector ${best.sector + 1} · glitches found ${f}/${NG}`;
    $('bestLine').textContent = s;
  }
  const fmt = t => { t = Math.round(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

  // ---------- audio ----------
  let AC = null, muted = false, hum = null;
  try { muted = localStorage.getItem('dejaglitch-mute') === '1'; } catch (e) {}
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, d, type = 'square', v = 0.05, slide = 0, delay = 0) {
    if (muted) return; const a = ac(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, v = 0.05) {
    if (muted) return; const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), g = a.createGain(); g.gain.value = v;
    s.buffer = b; s.connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    good() { tone(660, .12, 'square', .04); tone(990, .18, 'square', .04, 0, .1); },
    bad() { tone(160, .35, 'sawtooth', .06, -80); noise(.25, .05); },
    glitch() { noise(.18, .06); tone(1200, .08, 'square', .03, -900); },
    jump() { tone(300, .12, 'triangle', .05, 300); },
    hit() { tone(90, .4, 'sawtooth', .08, -40); noise(.3, .08); },
    shot() { tone(900, .09, 'square', .04, -700); noise(.06, .04); },
    ring() { tone(1320, .08, 'square', .025); tone(1320, .08, 'square', .025, 0, .12); },
    slow() { tone(400, .35, 'sine', .05, -280); },
    sector() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, 'square', .04, 0, i * .1)); },
  };
  function startHum() {
    if (muted || hum) return; const a = ac(); if (!a) return;
    const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 55.7;
    g.gain.value = 0.025; o.connect(g); o2.connect(g); g.connect(a.destination); o.start(); o2.start();
    hum = { o, o2, g };
  }
  function stopHum() { if (hum) { try { hum.o.stop(); hum.o2.stop(); } catch (e) {} hum = null; } }

  // ---------- input ----------
  const keys = { left: false, right: false, jump: false, slow: false, sight: false, run: false };
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', Space: 'slow', ShiftLeft: 'run', ShiftRight: 'run', KeyR: 'run', KeyC: 'sight', KeyE: 'sight' };
  addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (k) { if (k === 'jump' && !keys.jump) jumpPressed = true; if (k === 'sight' && !keys.sight) sightPressed = true; keys[k] = true; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') { if (G.mode === 'play') pause(); else if (G.mode === 'paused') resume(); }
    if (e.code === 'KeyM') toggleMute();
    if ((e.code === 'Enter') && G.mode === 'title' && !document.querySelector('#how.show,#about.show,#pills.show')) startGame();
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  let jumpPressed = false, sightPressed = false;
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    if (k === 'run') {
      b.addEventListener('pointerdown', e => { e.preventDefault(); ac(); keys.run = !keys.run; b.classList.toggle('on', keys.run); b.textContent = keys.run ? 'RUN ✓' : 'RUN'; });
      b.addEventListener('contextmenu', e => e.preventDefault());
      return;
    }
    const on = e => { e.preventDefault(); ac(); if (k === 'jump' && !keys.jump) jumpPressed = true; if (k === 'sight' && !keys.sight) sightPressed = true; keys[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  const isTouch = ('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches;
  addEventListener('touchstart', () => { if (G.mode === 'play') $('touch').classList.add('on'); }, { passive: true });

  // ---------- state ----------
  const G = { mode: 'title', sector: 0, streak: 0, integrity: 3, patched: new Set(), anomaly: null, last: null,
    slow: 100, slowOn: false, time: 0, caught: 0, mistakes: 0, found: 0, flash: 0, shake: 0, toast: '', toastT: 0, toast2: '', firstLoop: true, hurtT: 0 };
  let P, seg, walker, cat, agents, hunters = [], bullets = [], rings = [], cam = 0, codeCols = [];

  function resetCodeCols() { codeCols = []; for (let i = 0; i < W / 16; i++) codeCols.push({ y: rnd(-H, 0), s: rnd(80, 220) }); }
  resetCodeCols();

  function toast(a, b = '', t = 2.6) { G.toast = a; G.toast2 = b; G.toastT = t; }

  function pickAnomaly() {
    if (G.firstLoop) return null;
    if (Math.random() > 0.55) return null;
    const maxTier = G.sector === 0 ? 1 : G.sector === 1 ? 2 : 3;
    const ok = k => ANOM[k].tier <= maxTier && !G.patched.has(k) && k !== G.last;
    let pool = Object.keys(ANOM).filter(ok);
    if (!pool.length) {
      G.patched.clear(); toast('PATCH ROLLBACK', 'Old glitches are leaking back in.');
      pool = Object.keys(ANOM).filter(ok);
    }
    // later sectors lean toward subtle glitches
    const weighted = [];
    pool.forEach(k => { const t = ANOM[k].tier; const w = G.sector >= 3 ? t : (t === 1 ? 2 : 1); for (let i = 0; i < w; i++) weighted.push(k); });
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  function newSegment() {
    if (TRACE()) G.sector = Math.min(5, Math.floor(G.trace / 20));
    seg = { t: 0, anomaly: G.anomaly, hinted: false, phoneX: G.hardline ? rnd(900, 2200) : null };
    hunters = [];
    if (TRACE() && opts.agent === 0 && G.trace >= 40) for (let i = 0; i < (G.trace >= 75 ? 2 : 1); i++) hunters.push({ x: 1000 + i * 800 + rnd(0, 300), t: rnd(0, 2), bob: rnd(0, 6) });
    P = { x: 130, y: 0, vy: 0, jumps: 0, face: 1, maxX: 130, hist: [], phase: 0, inv: 0 };
    walker = { x: 2050, phase: 0 };
    cat = { x: 1050, st: 'wait', a: 1, t: 0, phase: 0 };
    agents = []; bullets = []; rings = [];
    if (G.sector >= 1) {
      const maxN = Math.min(AG().mx, 1 + Math.floor(G.sector / 2));
      const n = 1 + Math.floor(Math.random() * maxN);
      for (let i = 0; i < n; i++) agents.push({ x: 850 + i * 560 + rnd(0, 220), st: 'idle', phase: 0, face: -1, rez: 0, cool: rnd(1, 2.5) });
    }
  }

  function startGame(diff) {
    if (diff !== 'blue' && diff !== 'red') { showPanel('pills'); return; }
    G.diff = diff; setSlowLabel('SLOW');
    ac(); startHum();
    Object.assign(G, { trace: 0, maxTrace: 0, hardline: false, lineT: 0, said: {}, sight: 2, sightT: 0 });
    Object.assign(G, { mode: 'play', sector: 0, streak: 0, integrity: maxHP(), anomaly: null, last: null, slow: 100, time: 0, caught: 0, mistakes: 0, found: 0, flash: .6, firstLoop: true });
    G.patched = new Set();
    newSegment();
    hidePanels();
    if (isTouch) $('touch').classList.add('on');
    $('pauseBtn').classList.add('on');
    $('touch').classList.toggle('red', diff === 'red');
    toast(diff === 'red' ? 'TRACE MODE · OPERATOR ONLINE' : 'SECTOR 1 · ' + SECTOR_NAMES[0], diff === 'red' ? 'Memorize this street. Glitches boost the trace on your real body.' : 'Memorize this street. Then walk to the far door ▶', 4);
    sfx.glitch();
  }

  function maxHP() { return 3; }
  const TRACE = () => G.diff === 'red';
  function addTrace(v) {
    if (G.hardline) return;
    const before = G.trace;
    G.trace = clamp(G.trace + v, 0, 100);
    [25, 50, 75].forEach(m => {
      if (before < m && G.trace >= m && !G.said[m]) {
        G.said[m] = 1;
        toast('OPERATOR: TRACE ' + m + '%', m === 25 ? 'Keep feeding me glitches. Every one makes your signal louder.' : m === 50 ? (opts.agent === 0 ? 'Hunters are coming online. Watch their red scan beams.' : 'Halfway there. Stay sharp.') : 'Almost locked. The Agents can feel it too.', 3.2);
        sfx.ring();
      }
    });
    if (G.trace >= 100) {
      G.hardline = true; G.lineT = 45;
      if (seg) seg.phoneX = clamp(P.x + (P.x > 1300 ? -1 : 1) * rnd(450, 700), 300, 2300);
      toast('HARDLINE LOCATED', 'Your body is found. Reach the ringing phone in 45s to unplug.', 4);
      sfx.sector();
    }
  }
  function decide(dir) {
    const a = G.anomaly, correct = a ? dir === 'back' : dir === 'forward';
    G.firstLoop = false;
    if (correct) {
      G.streak++;
      if (a) {
        G.patched.add(a); G.found++;
        if (!best.found.includes(a)) { best.found.push(a); save(); }
      }
      sfx.good();
      if (TRACE()) {
        const gain = (a ? 12 : 5) + Math.min(G.streak, 5);
        if (a) { G.sight = Math.min(3, G.sight + 1); toast('GLITCH USED: ' + ANOM[a].name.toUpperCase(), `Signal spike: +${gain}% trace. Agents patched it.`); }
        else toast('CLEAN LOOP', `+${gain}% trace.`, 1.8);
        addTrace(gain);
      } else {
        if (a) toast('GLITCH USED: ' + ANOM[a].name.toUpperCase(), 'The Agents patched it. It won\'t come back.');
        else toast('CLEAN LOOP', 'Nothing was off. Good call.', 1.8);
        if (G.streak >= REQ[G.sector]) {
          G.sector++; G.streak = 0; G.firstLoop = true; G.integrity = maxHP();
          if (G.sector > best.sector && G.sector < REQ.length) { best.sector = G.sector; save(); }
          if (G.sector >= REQ.length) return win();
          toast('SECTOR ' + (G.sector + 1) + ' · ' + SECTOR_NAMES[G.sector], G.sector === 1 ? 'Agents are here now. Jump them (tap jump again in the air).' : G.sector === 2 ? 'Agents shoot now. Slow-mo and jump the bullets.' : G.sector === 5 ? 'The phone is ringing. Get to it.' : 'Memorize the new look.', 4);
          sfx.sector();
        }
      }
    } else {
      G.streak = 0; G.mistakes++;
      if (TRACE()) { addTrace(-10); toast('WRONG CALL · SIGNAL LOST', (a ? 'You walked past: ' + ANOM[a].name + '.' : 'Nothing was glitched that time.') + ' -10% trace.', 3); }
      else toast('WRONG CALL · LOOP RESET', a ? 'You walked past: ' + ANOM[a].name + '.' : 'Nothing was glitched that time.', 3);
      sfx.bad(); G.shake = .4;
    }
    G.last = a;
    G.anomaly = pickAnomaly();
    G.flash = .7; sfx.glitch();
    newSegment();
  }

  function caught() {
    G.integrity--; G.caught++; G.shake = .5; G.hurtT = .5; sfx.hit();
    if (G.integrity <= 0) {
      if (TRACE()) return lose();
      G.integrity = maxHP(); G.streak = 0; G.firstLoop = true; G.anomaly = null;
      toast('SYSTEM RESET', 'The Agents wiped your progress in this sector.', 3);
    } else {
      if (TRACE()) addTrace(-8);
      toast('HIT', 'Integrity ' + G.integrity + '/' + maxHP() + '.' + (TRACE() ? ' -8% trace.' : '') + ' Restarting this loop.', 2.4);
    }
    G.flash = .6;
    const keep = G.anomaly, px = seg.phoneX; newSegment(); seg.anomaly = keep; if (px) seg.phoneX = px; P.inv = 1.2;
  }

  function endScreen(title, html) {
    G.mode = 'end'; stopHum();
    $('endTitle').textContent = title; $('endText').innerHTML = html;
    showPanel('end'); $('touch').classList.remove('on'); $('pauseBtn').classList.remove('on');
  }
  function win() {
    if (TRACE()) {
      best.traceWins = (best.traceWins || 0) + 1;
      if (!best.traceTime || G.time < best.traceTime) best.traceTime = G.time;
      save(); sfx.sector();
      return endScreen('Hardline answered. You\'re unplugged.', `Your body was found and disconnected from the simulation.<br>Time ${fmt(G.time)} · best ${fmt(best.traceTime)}<br>Glitches used: ${G.found}<br>Wrong calls: ${G.mistakes} · Hits: ${G.caught}<br>Glitch log: ${best.found.length}/${NG} found ever`);
    }
    best.wins = (best.wins || 0) + 1;
    if (!best.time || G.time < best.time) best.time = G.time;
    best.sector = REQ.length - 1; save(); sfx.sector();
    endScreen('You answered the phone and glitched out.', `Time ${fmt(G.time)}<br>Glitches used: ${G.found}<br>Wrong calls: ${G.mistakes} · Agent hits: ${G.caught}<br>Glitch log: ${best.found.length}/${NG} found ever`);
  }
  function lose() {
    sfx.bad();
    endScreen('Signal lost.', `The Agents got you before the trace locked.<br>Trace reached: ${Math.floor(G.maxTrace)}%<br>Time ${fmt(G.time)} · Glitches used: ${G.found}`);
  }

  // ---------- panels ----------
  let returnTo = 'title';
  function hidePanels() { document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); }
  function showPanel(id) { hidePanels(); $(id).classList.add('show'); }
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
    returnTo = document.querySelector('.panel.show') ? document.querySelector('.panel.show').id : 'title';
    showPanel(b.dataset.open);
  }));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => showPanel(returnTo)));
  // Android back button (called from the app wrapper): 1 = handled, 0 = let the app close.
  window.dgBack = () => {
    const p = document.querySelector('.panel.show');
    if (G.mode === 'play') { pause(); return 1; }
    if (p && (p.id === 'how' || p.id === 'about')) { showPanel(returnTo); return 1; }
    if (p && p.id === 'pills') { showPanel('title'); return 1; }
    if (p && p.id === 'redModes') { showPanel('pills'); return 1; }
    if (G.mode === 'paused') { resume(); return 1; }
    if (G.mode === 'end') { toTitle(); return 1; }
    return 0;
  };
  $('playBtn').onclick = () => startGame();
  $('againBtn').onclick = () => G.diff === 'story' ? storyStart(1) : startGame(G.diff);
  $('bluePill').onclick = () => startGame('blue');
  function optLabels() { $('agentOpt').textContent = 'Agents: ' + AG().n; $('shootOpt').textContent = 'Agents shoot: ' + (opts.shoot ? 'On' : 'Off'); }
  $('agentOpt').onclick = () => { opts.agent = (opts.agent + 1) % AGD.length; saveOpts(); optLabels(); };
  $('shootOpt').onclick = () => { opts.shoot = !opts.shoot; saveOpts(); optLabels(); };
  optLabels();
  $('redPill').onclick = () => { const c = best.storyCh || 0; $('storyCont').style.display = c > 1 ? '' : 'none'; $('storyCont').textContent = 'Continue: ' + (CH_NAMES[c] || ''); showPanel('redModes'); };
  $('storyBtn').onclick = () => storyStart(1);
  if (location.hash === '#dev') window.__dg = { storyStart, S: () => S, P: () => P, G };
  $('storyCont').onclick = () => storyStart(best.storyCh || 1);
  $('traceBtn').onclick = () => startGame('red');
  $('endTitleBtn').onclick = toTitle;
  $('quitBtn').onclick = toTitle;
  $('resumeBtn').onclick = resume;
  $('skipBtn').onclick = storySkip;
  $('pauseBtn').onclick = () => { if (G.mode === 'play') pause(); };
  $('muteBtn').onclick = toggleMute;
  function toTitle() { setSlowLabel('SLOW'); G.mode = 'title'; stopHum(); bestLine(); showPanel('title'); $('touch').classList.remove('on'); $('pauseBtn').classList.remove('on'); }
  function pause() { if (G.mode !== 'play') return; $('skipBtn').style.display = STORY() ? '' : 'none'; G.mode = 'paused'; for (const k in keys) keys[k] = false; showPanel('pause'); }
  function resume() { if (G.mode !== 'paused') return; hidePanels(); G.mode = 'play'; last = performance.now(); }
  function toggleMute() {
    muted = !muted; try { localStorage.setItem('dejaglitch-mute', muted ? '1' : '0'); } catch (e) {}
    $('muteBtn').textContent = 'Sound: ' + (muted ? 'off' : 'on');
    if (muted) stopHum(); else if (G.mode === 'play' || G.mode === 'paused') startHum();
  }
  $('muteBtn').textContent = 'Sound: ' + (muted ? 'off' : 'on');
  addEventListener('pagehide', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  bestLine();

  // ---------- update ----------
  function update(dt) {
    G.time += dt;
    // slow-mo
    const wantSlow = keys.slow && G.slow > 2;
    if (wantSlow && !G.slowOn) sfx.slow();
    G.slowOn = wantSlow;
    G.slow = clamp(G.slow + (G.slowOn ? -32 : 14) * dt, 0, 100);
    const wdt = G.slowOn ? dt * 0.28 : dt;
    seg.t += wdt;
    if (TRACE()) {
      G.maxTrace = Math.max(G.maxTrace, G.trace);
      if (!G.hardline) addTrace(0.3 * dt);
      else {
        G.lineT -= dt;
        if (seg.phoneX && Math.abs(P.x - seg.phoneX) < 34 && P.y < 40) return win();
        if (G.lineT <= 0) { G.hardline = false; G.trace = 70; G.said[75] = 0; seg.phoneX = null; toast('LINE CUT', 'The Agents cut the hardline. Trace dropped to 70%.', 3); sfx.bad(); }
        else if (seg.phoneX && Math.floor(G.lineT * 1.2) % 2 === 0 && (!seg.rang || seg.t - seg.rang > .8)) { seg.rang = seg.t; sfx.ring(); }
      }
      if (sightPressed) {
        if (G.sight > 0 && G.sightT <= 0) { G.sight--; G.sightT = 3; tone(220, .5, 'sine', .05, 600); }
        else if (G.sightT <= 0) toast('NO CODE SIGHT LEFT', 'Use a glitch to earn another charge.', 1.6);
      }
      if (G.sightT > 0) G.sightT -= dt;
      for (const h of hunters) {
        h.x += Math.sign(P.x - h.x) * 70 * wdt; h.t += wdt; h.bob += wdt * 3;
        const ph = h.t % 3.2;
        if (P.inv <= 0 && ph > .8 && ph < 1.6 && Math.abs(P.x - h.x) < 26) { caught(); return; }
      }
    }
    sightPressed = false;

    // player
    const mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const run = keys.run ? 1.8 : 1;
    P.x += mv * SPEED * run * dt; if (mv) { P.face = mv; P.phase += dt * 12 * run; }
    if (jumpPressed) {
      if (P.y === 0 && P.vy === 0) { P.vy = 640; P.jumps = 1; sfx.jump(); }
      else if (P.jumps < 3) {
        P.jumps++; P.vy = P.jumps === 2 ? 580 : 540;
        rings.push({ x: P.x, y: P.y, t: 0 });
        tone(P.jumps === 2 ? 500 : 700, .14, 'triangle', .05, 400);
      }
    }
    jumpPressed = false;
    if (P.y > 0 || P.vy > 0) { P.y += P.vy * dt; P.vy -= 1500 * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; P.jumps = 0; } if (P.y > 280) { P.y = 280; P.vy = Math.min(P.vy, 0); } }
    P.maxX = Math.max(P.maxX, P.x);
    if (G.firstLoop && P.maxX < 700 && P.x < 110) {
      P.x = 110;
      if (!seg.hinted && G.firstLoop && G.sector === 0) { seg.hinted = true; toast('WALK THE LOOP FIRST', 'Look around, then decide.', 2); }
    }
    P.hist.push({ x: P.x, y: P.y }); if (P.hist.length > 45) P.hist.shift();
    if (P.inv > 0) P.inv -= dt;
    if (P.x >= L - 60) return decide('forward');
    if (P.x <= 20) return decide('back');

    // camera
    cam += (clamp(P.x - W * 0.42, 0, L - W) - cam) * Math.min(1, dt * 8);

    // walker
    walker.x -= 55 * wdt; walker.phase += wdt * 7;

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.trail.push(b.x); if (b.trail.length > 18) b.trail.shift();
      b.x += b.vx * wdt;
      if (b.x < cam - 100 || b.x > cam + W + 100) { bullets.splice(i, 1); continue; }
      if (P.inv <= 0 && Math.abs(b.x - P.x) < 12 && P.y < b.h + 4 && P.y + 85 > b.h) { bullets.splice(i, 1); caught(); return; }
    }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > .45) rings.splice(i, 1); }
    // payphone
    if (!TRACE() && G.sector === 5 && Math.floor(seg.t * 1.2) % 2 === 0 && Math.abs(P.x - (L - 190)) < 500) { if (!seg.rang || seg.t - seg.rang > .8) { seg.rang = seg.t; sfx.ring(); } }

    // cat
    if (cat.st === 'wait' && P.x > 520) { cat.st = 'walk'; cat.x = 1050; cat.a = 1; }
    else if (cat.st === 'walk') { cat.x -= 75 * wdt; cat.phase += wdt * 14; if (cat.x < 820) { cat.st = 'fade'; cat.t = 0; } }
    else if (cat.st === 'fade') { cat.t += wdt; cat.a = 1 - cat.t / .5; if (cat.t > .5) { cat.st = 'gone'; cat.t = 0; } }
    else if (cat.st === 'gone' && seg.anomaly === 'cat') { cat.t += wdt; if (cat.t > .5) { cat.st = 'walk'; cat.x = 1050; cat.a = 1; cat.rep = true; G.flash = Math.max(G.flash, .25); tone(140, .25, 'square', .04, 70); } }

    // agents
    const spd = (110 + G.sector * 14) * AG().sp;
    const shoots = opts.shoot && G.sector >= 2;
    for (const a of agents) {
      const dx = P.x - a.x;
      if (a.st === 'idle' && Math.abs(dx) < 520) { a.st = 'chase'; a.rez = .5; sfx.glitch(); }
      if (a.st === 'chase') {
        a.face = Math.sign(dx) || a.face;
        if (Math.abs(dx) > 8) a.x += a.face * spd * wdt;
        a.phase += wdt * 10;
        if (a.rez > 0) a.rez -= dt;
        a.cool -= wdt;
        if (shoots && a.cool <= 0 && Math.abs(dx) < 460 && Math.abs(dx) > 60) {
          a.cool = (rnd(1.7, 3.2) - G.sector * .1) * AG().cd;
          bullets.push({ x: a.x + a.face * 16, h: 52, vx: a.face * 520 * AG().bv, trail: [] }); sfx.shot();
        }
        if (P.inv <= 0 && Math.abs(dx) < 26 && P.y < 74) { caught(); return; }
      }
    }
  }

  // ---------- drawing helpers ----------
  function person(x, fy, o) {
    ctx.save(); ctx.translate(x, fy);
    if (o.sunk) { ctx.beginPath(); ctx.rect(-50, -200, 100, 200); ctx.clip(); ctx.translate(0, o.sunk); }
    if (o.face < 0) ctx.scale(-1, 1);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const sw = o.tpose ? 0 : Math.sin(o.phase || 0) * 7;
    ctx.fillStyle = o.pants; ctx.fillRect(-7 + sw * .6, -32, 6, 32); ctx.fillRect(1 - sw * .6, -32, 6, 32);
    ctx.fillStyle = '#111'; ctx.fillRect(-8 + sw * .6, -3, 8, 3); ctx.fillRect(0 - sw * .6, -3, 8, 3);
    ctx.fillStyle = o.coat; ctx.fillRect(-11, -66, 22, 36);
    if (o.long) ctx.fillRect(-12, -34, 24, 16);
    if (o.tie) { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-4, -66, 8, 14); ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-1, -64, 3, 13); }
    ctx.fillStyle = o.coat;
    if (o.tpose) ctx.fillRect(-36, -64, 72, 7);
    else if (o.phone) { ctx.fillRect(-14, -64, 5, 26); ctx.fillRect(8, -64, 5, 12); ctx.fillRect(8, -56, 12, 5); ctx.fillStyle = '#9fe8ff'; ctx.fillRect(18, -62, 4, 7); }
    else { ctx.fillRect(-14 - sw * .4, -64, 5, 28); ctx.fillRect(9 + sw * .4, -64, 5, 28); }
    ctx.fillStyle = o.skin; ctx.fillRect(-7, -82, 14, 16); ctx.fillRect(6, -76, 2, 3);
    ctx.fillStyle = o.hair; ctx.fillRect(-8, -85, 16, 6); ctx.fillRect(-8, -85, 4, 12);
    if (o.shades) { ctx.fillStyle = o.shades; ctx.fillRect(-3, -77, 11, 4); }
    if (o.ear) { ctx.fillStyle = '#ddd'; ctx.fillRect(-6, -76, 2, 6); }
    ctx.restore();
  }
  function shadow(x, w, a = .28) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(x, FY + 1, w, 5, 0, 0, Math.PI * 2); ctx.fill(); }

  const adCrisp = document.createElement('canvas'); adCrisp.width = 120; adCrisp.height = 90;
  (c => {
    c.fillStyle = '#ffcf33'; c.fillRect(0, 0, 120, 90);
    c.fillStyle = '#e8402a'; c.fillRect(0, 62, 120, 28);
    c.fillStyle = '#c0c4cc'; c.fillRect(72, 14, 26, 44); c.fillStyle = '#e8402a'; c.fillRect(72, 24, 26, 18);
    c.fillStyle = '#7d828c'; c.fillRect(74, 12, 22, 4);
    c.fillStyle = '#1b1b1b'; c.font = 'bold 22px monospace'; c.fillText('FIZZ', 8, 36);
    c.font = 'bold 11px monospace'; c.fillText('ICE COLD', 8, 52);
    c.fillStyle = '#fff'; c.font = 'bold 12px monospace'; c.fillText('ONLY 99¢', 30, 81);
  })(adCrisp.getContext('2d'));
  const adTiny = document.createElement('canvas'); adTiny.width = 8; adTiny.height = 6;
  adTiny.getContext('2d').drawImage(adCrisp, 0, 0, 8, 6);

  function codeRect(x, y, w, h, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#010a04'; ctx.fillRect(x, y, w, h);
    ctx.font = '12px monospace';
    for (let c = 0; c < w / 11; c++) {
      const sp = 60 + ((c * 37) % 70), off = (c * 53) % h;
      for (let r = 0; r < 14; r++) {
        const yy = y + ((t * sp + off + r * 13) % (h + 40)) - 20;
        ctx.fillStyle = r === 13 ? '#d8ffe4' : `rgba(61,255,134,${0.15 + r / 16})`;
        ctx.fillText(CODE_CH[(c * 7 + r * 3 + Math.floor(t * 8)) % CODE_CH.length], x + c * 11, yy);
      }
    }
    ctx.restore();
  }

  function drawScene() {
    const th = THEMES[G.sector] || THEMES[0], A = seg.anomaly, t = seg.t;
    ctx.fillStyle = th.ceil; ctx.fillRect(0, 0, W, 100);
    ctx.save(); ctx.translate(-Math.round(cam), 0);
    const x0 = cam - 20, x1 = cam + W + 20;
    // wall
    ctx.fillStyle = th.wall; ctx.fillRect(x0, 100, x1 - x0, FLOOR - 100);
    ctx.fillStyle = th.wall2; ctx.fillRect(x0, 340, x1 - x0, FLOOR - 340);
    ctx.fillStyle = th.acc; ctx.fillRect(x0, 334, x1 - x0, 6);
    ctx.strokeStyle = th.seam; ctx.lineWidth = 1;
    for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) { ctx.beginPath(); ctx.moveTo(x + .5, 100); ctx.lineTo(x + .5, 334); ctx.stroke(); }
    for (let y = 130; y < 334; y += 30) { ctx.beginPath(); ctx.moveTo(x0, y + .5); ctx.lineTo(x1, y + .5); ctx.stroke(); }
    if (A === 'ripple') {
      ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        const r = ((t * 40 + k * 26) % 130);
        ctx.strokeStyle = `rgba(220,255,240,${.5 * (1 - r / 130)})`;
        ctx.beginPath(); ctx.ellipse(1040, 250, r * 1.5, r * .7, 0, 0, 7); ctx.stroke();
      }
    }
    // floor
    ctx.fillStyle = th.floor; ctx.fillRect(x0, FLOOR, x1 - x0, H - FLOOR);
    ctx.fillStyle = th.fl2;
    for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) ctx.fillRect(x, FLOOR, 2, H - FLOOR);
    ctx.fillRect(x0, FLOOR + 30, x1 - x0, 2); ctx.fillRect(x0, FLOOR + 70, x1 - x0, 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x0, FLOOR, x1 - x0, 6);

    // lights
    LIGHTS.forEach((lx, i) => {
      let on = true;
      if (A === 'lights' && i === 4) on = Math.sin(t * 31) + Math.sin(t * 17.3) > -.2;
      ctx.fillStyle = '#555'; ctx.fillRect(lx - 40, 98, 80, 8);
      ctx.fillStyle = on ? '#fffbe6' : '#6b6b62'; ctx.fillRect(lx - 36, 104, 72, 5);
      if (on) {
        const g = ctx.createLinearGradient(0, 110, 0, FLOOR + 60);
        g.addColorStop(0, 'rgba(255,250,220,.20)'); g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 36, 109); ctx.lineTo(lx + 36, 109); ctx.lineTo(lx + 120, FLOOR + 60); ctx.lineTo(lx - 120, FLOOR + 60); ctx.fill();
      }
    });

    // start door + loop sign
    door(20, '#1c2420', 'IN'); door(L - 100, '#1c2420', 'OUT');
    ctx.fillStyle = '#111'; ctx.fillRect(18, 120, 84, 46);
    ctx.fillStyle = '#ffb000'; ctx.font = 'bold 13px monospace'; ctx.fillText('LOOP', 30, 138);
    ctx.font = 'bold 22px monospace'; ctx.fillText(String(G.streak), 76, 158);
    ctx.font = '10px monospace'; ctx.fillStyle = '#c99000'; ctx.fillText('S' + (G.sector + 1), 30, 158);

    // rules board
    ctx.fillStyle = '#f2efe4'; ctx.fillRect(150, 170, 150, 120); ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.strokeRect(150, 170, 150, 120);
    ctx.fillStyle = '#222'; ctx.font = 'bold 12px monospace'; ctx.fillText('NOTICE', 200, 188);
    ctx.font = '10px monospace';
    ['Don\'t overlook any glitch.', 'Glitch? Turn back.', 'No glitch? Go on.', 'Agents are NOT', 'glitches. Avoid them.'].forEach((s, i) => ctx.fillText(s, 157, 206 + i * 16));

    // portrait poster (eyes)
    ctx.fillStyle = '#e9e4d8'; ctx.fillRect(330, 160, 96, 126); ctx.strokeStyle = '#2a2a2a'; ctx.strokeRect(330, 160, 96, 126);
    ctx.fillStyle = '#8fb3a0'; ctx.fillRect(338, 168, 80, 90);
    ctx.fillStyle = '#d9a982'; ctx.fillRect(360, 186, 36, 44); ctx.fillStyle = '#3a2a1e'; ctx.fillRect(358, 180, 40, 12);
    ctx.fillStyle = '#4a6b5a'; ctx.fillRect(352, 230, 52, 28);
    ctx.fillStyle = '#fff'; ctx.fillRect(366, 200, 9, 6); ctx.fillRect(382, 200, 9, 6);
    let ex = 0; if (A === 'eyes') ex = clamp((P.x - 378) / 120, -1, 1) * 3;
    ctx.fillStyle = '#111'; ctx.fillRect(369 + ex, 201, 3, 4); ctx.fillRect(385 + ex, 201, 3, 4);
    ctx.fillStyle = '#7a3b2e'; ctx.fillRect(372, 218, 12, 2);
    ctx.fillStyle = '#222'; ctx.font = 'bold 11px monospace'; ctx.fillText('STAY CALM', 344, 276);

    // door 07
    door(610, '#5c4a3a');
    ctx.fillStyle = '#d8c48a'; ctx.fillRect(628, 214, 34, 18);
    ctx.fillStyle = '#222'; ctx.font = 'bold 14px monospace';
    ctx.fillText(A === 'door' && P.x > 560 ? '70' : '07', 636, 228);

    // vent / code wall
    const codeOn = A === 'code' && (t % 3.4) < 2;
    if (codeOn) codeRect(860, 190, 110, 130, t);
    else {
      ctx.fillStyle = '#7d8580'; ctx.fillRect(860, 190, 110, 130);
      ctx.fillStyle = '#4e5550'; for (let y = 198; y < 316; y += 10) ctx.fillRect(866, y, 98, 4);
      if (A === 'code' && (t % 3.4) < 2.15) { ctx.fillStyle = 'rgba(61,255,134,.5)'; ctx.fillRect(860, 190 + Math.random() * 120, 110, 4); }
    }

    // clock
    ctx.fillStyle = '#f6f6f0'; ctx.beginPath(); ctx.arc(1150, 200, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke();
    const ang = (A === 'clock' ? -1 : 1) * t * Math.PI * 2 / 6;
    ctx.lineWidth = 3; line(1150, 200, 1150 + Math.cos(-Math.PI / 2 + 5.2) * 14, 200 + Math.sin(-Math.PI / 2 + 5.2) * 14);
    line(1150, 200, 1150 + Math.cos(-Math.PI / 2 + 1.05) * 18, 200 + Math.sin(-Math.PI / 2 + 1.05) * 18);
    ctx.strokeStyle = '#d33'; ctx.lineWidth = 1.5; line(1150, 200, 1150 + Math.cos(-Math.PI / 2 + ang) * 21, 200 + Math.sin(-Math.PI / 2 + ang) * 21);

    // ad poster (pop-in)
    ctx.fillStyle = '#222'; ctx.fillRect(1336, 176, 128, 98);
    const far = A === 'popin' && Math.abs(P.x - 1400) > 260;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(far ? adTiny : adCrisp, 1340, 180, 120, 90);

    // trash can
    const fl = A === 'float' ? 16 + Math.sin(t * 2) * 4 : 0;
    shadow(1650, 20, A === 'float' ? .15 : .3);
    ctx.fillStyle = '#4b5a52'; ctx.fillRect(1632, FY - 50 - fl, 36, 50);
    ctx.fillStyle = '#39463f'; ctx.fillRect(1628, FY - 56 - fl, 44, 8);
    ctx.fillStyle = '#5d6e64'; for (let i = 0; i < 4; i++) ctx.fillRect(1637 + i * 8, FY - 44 - fl, 3, 38);

    // painting / missing texture
    ctx.fillStyle = '#3b2a1a'; ctx.fillRect(1846, 176, 128, 98);
    if (A === 'missing') {
      for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 8; xx++) { ctx.fillStyle = (xx + yy) % 2 ? '#000' : '#ff00dc'; ctx.fillRect(1852 + xx * 14.5, 182 + yy * 14.3, 14.5, 14.3); }
    } else {
      ctx.fillStyle = '#87c3e8'; ctx.fillRect(1852, 182, 116, 86);
      ctx.fillStyle = '#4f8f4a'; ctx.beginPath(); ctx.moveTo(1852, 268); ctx.lineTo(1890, 222); ctx.lineTo(1920, 250); ctx.lineTo(1945, 215); ctx.lineTo(1968, 268); ctx.fill();
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(1940, 200, 9, 0, 7); ctx.fill();
    }

    // cafe sign (spoon)
    ctx.fillStyle = '#333'; ctx.fillRect(2058, 100, 3, 70);
    ctx.fillStyle = '#f4ead6'; ctx.beginPath(); ctx.arc(2060, 196, 28, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6b3d1f'; ctx.lineWidth = 3; ctx.stroke();
    {
      const bend = A === 'spoon' ? Math.min(1, t / 6) * 1.3 : 0;
      ctx.save(); ctx.translate(2060, 212); ctx.strokeStyle = '#7d8590'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -12, Math.sin(bend) * 14, -12 - Math.cos(bend) * 12); ctx.stroke();
      ctx.fillStyle = '#7d8590'; ctx.beginPath(); ctx.ellipse(Math.sin(bend) * 16, -12 - Math.cos(bend) * 16, 5, 8, bend, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#6b3d1f'; ctx.font = 'bold 9px monospace'; ctx.fillText('CAFE', 2049, 222);

    // payphone (final sector)
    const phoneAt = TRACE() ? seg.phoneX : (G.sector === 5 ? L - 190 : null);
    if (phoneAt) {
      const px = phoneAt, ringing = Math.floor(t * 1.2) % 2 === 0;
      ctx.fillStyle = '#1b1f22'; ctx.fillRect(px - 26, 250, 52, FLOOR - 250 + 30);
      ctx.fillStyle = '#c0c6cc'; ctx.fillRect(px - 18, 270, 36, 70);
      ctx.fillStyle = '#111'; ctx.fillRect(px - 14, 274, 10, 40);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = '#333'; ctx.fillRect(px + 2 + (i % 3) * 5, 284 + Math.floor(i / 3) * 7, 3, 4); }
      ctx.fillStyle = '#3dff86'; ctx.font = 'bold 10px monospace'; ctx.fillText('PHONE', px - 15, 264);
      if (ringing) { ctx.strokeStyle = 'rgba(61,255,134,.8)'; ctx.lineWidth = 2; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(px - 9, 290, 10 + k * 7, -2.4, -.8); ctx.stroke(); } }
    }

    // exit sign
    ctx.fillStyle = '#333'; ctx.fillRect(2198, 100, 4, 24); ctx.fillRect(2258, 100, 4, 24);
    ctx.fillStyle = '#0f6b33'; ctx.fillRect(2170, 122, 120, 38);
    ctx.fillStyle = '#eafff0'; ctx.font = 'bold 18px monospace';
    ctx.fillText(A === 'sign' ? '← EXIT' : 'EXIT →', 2192, 148);

    // stander (phone guy)
    shadow(1265, 16);
    person(1265, FY, { coat: '#3b4a6b', pants: '#2a2f3a', skin: '#b98a63', hair: '#1a1a1a', face: -1, phone: true });

    // walker
    const wo = { coat: '#6d6f73', pants: '#333', skin: '#e1b894', hair: '#5a3b22', face: -1, long: true, phase: walker.phase };
    if (A === 'tpose') { wo.tpose = true; }
    if (A === 'clip') wo.sunk = 46;
    if (A !== 'clip') shadow(walker.x, 16);
    const poss = A === 'possess' && (t % 2.4) > 1.2;
    if (poss) {
      Object.assign(wo, { coat: '#22252b', pants: '#1b1d22', hair: '#1c1c1c', shades: '#000', tie: true, ear: true, long: false });
      ctx.fillStyle = 'rgba(61,255,134,.5)';
      for (let k = 0; k < 7; k++) ctx.fillRect(walker.x - 24 + ((k * 13 + Math.floor(t * 30) * 7) % 48), FY - 120 + ((k * 29 + Math.floor(t * 25) * 11) % 120), 3 + (k % 3) * 4, 3);
    }
    if (A === 'possess' && Math.abs((t % 2.4) - 1.2) < .08) { ctx.save(); ctx.globalAlpha = .55; ctx.translate(-5, 0); person(walker.x, FY, Object.assign({}, wo, { coat: '#3dff86', pants: '#3dff86', skin: '#3dff86', hair: '#3dff86' })); ctx.restore(); }
    person(walker.x, FY, wo);
    if (A === 'clones') { shadow(walker.x + 44, 16); person(walker.x + 44, FY, wo); }

    // cat
    if (cat.st === 'walk' || cat.st === 'fade') {
      if (cat.rep) {
        ctx.save(); ctx.globalAlpha = .45; ctx.translate(6 + Math.sin(t * 40) * 3, 0); ctx.filter = 'none';
        drawCat(cat.x + 30, cat.a * .6, cat.phase, '#3dff86'); ctx.restore();
        if (Math.floor(t * 8) % 2) { ctx.fillStyle = 'rgba(61,255,134,.35)'; ctx.fillRect(cat.x - 40, FY - 50, 80, 3); ctx.fillRect(cat.x - 30, FY - 26, 70, 2); }
      }
      drawCat(cat.x, cat.a, cat.phase);
    }

    ctx.restore();
  }
  function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function door(x, col, label) {
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 4, 196, 88, FLOOR - 196);
    ctx.fillStyle = col; ctx.fillRect(x, 200, 80, FLOOR - 200);
    ctx.fillStyle = '#c9b46a'; ctx.fillRect(x + 64, 320, 8, 8);
    if (label) { ctx.fillStyle = '#ffb000'; ctx.font = 'bold 12px monospace'; ctx.fillText(label, x + 30, 260); }
  }
  function drawCat(x, a, ph, col) {
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x, FY); ctx.scale(1.7, 1.7);
    shadow(0, 14, .25);
    ctx.fillStyle = col || '#0b0b0b';
    ctx.fillRect(-14, -16, 28, 10); // body
    ctx.fillRect(-20, -24, 10, 10); // head (facing left)
    ctx.fillRect(-20, -28, 3, 5); ctx.fillRect(-13, -28, 3, 5); // ears
    const s = Math.sin(ph) * 3;
    ctx.fillRect(-12 + s, -6, 3, 6); ctx.fillRect(-4 - s, -6, 3, 6); ctx.fillRect(5 + s, -6, 3, 6); ctx.fillRect(10 - s, -6, 3, 6);
    ctx.fillRect(13, -22, 3, 10); ctx.fillRect(13, -24, 6, 3); // tail
    ctx.fillStyle = '#b6ff3d'; ctx.fillRect(-18, -21, 2, 2);
    ctx.restore();
  }

  function drawActors() {
    ctx.save(); ctx.translate(-Math.round(cam), 0);
    for (const a of agents) {
      if (a.st === 'idle' && Math.abs(P.x - a.x) > 900) continue;
      const flick = a.rez > 0 && Math.random() < .5;
      if (flick) { ctx.globalAlpha = .4; }
      shadow(a.x, 16);
      person(a.x, FY, { coat: '#22252b', pants: '#1b1d22', skin: '#d9b08c', hair: '#1c1c1c', face: a.face, shades: '#000', tie: true, ear: true, phase: a.phase });
      if (flick) { ctx.fillStyle = 'rgba(61,255,134,.6)'; ctx.fillRect(a.x - 14, FY - 90 + Math.random() * 80, 28, 3); }
      ctx.globalAlpha = 1;
    }
    for (const b of bullets) {
      b.trail.forEach((x, i) => {
        if (G.slowOn) { ctx.strokeStyle = `rgba(200,255,220,${i / 40})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, FY - b.h, 3 + (18 - i) * .5, 6 + (18 - i), 0, 0, 7); ctx.stroke(); }
        else { ctx.fillStyle = `rgba(255,220,120,${i / 36})`; ctx.fillRect(x - 2, FY - b.h - 1, 4, 2); }
      });
      ctx.fillStyle = '#ffd36b'; ctx.fillRect(b.x - 4, FY - b.h - 2, 8, 4);
    }
    for (const r of rings) {
      const k = r.t / .45; ctx.strokeStyle = `rgba(61,255,134,${1 - k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, FY - r.y, 14 + k * 26, 4 + k * 6, 0, 0, 7); ctx.stroke();
    }
    for (const h of hunters) {
      const ph = h.t % 3.2, hy = 190 + Math.sin(h.bob) * 8;
      if (ph > .2 && ph < .8 && Math.floor(h.t * 12) % 2) { ctx.fillStyle = 'rgba(255,40,60,.18)'; ctx.fillRect(h.x - 26, hy, 52, FY - hy); }
      if (ph >= .8 && ph < 1.6) { ctx.fillStyle = 'rgba(255,40,60,.42)'; ctx.fillRect(h.x - 26, hy, 52, FY - hy); ctx.fillStyle = 'rgba(255,200,200,.6)'; ctx.fillRect(h.x - 3, hy, 6, FY - hy); }
      ctx.strokeStyle = '#1a1414'; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) { const ox = -20 + k * 8; ctx.beginPath(); ctx.moveTo(h.x + ox, hy + 6); ctx.quadraticCurveTo(h.x + ox + Math.sin(h.bob + k) * 10, hy + 30, h.x + ox + Math.sin(h.bob * 1.3 + k) * 6, hy + 52); ctx.stroke(); }
      ctx.fillStyle = '#2a2222'; ctx.beginPath(); ctx.ellipse(h.x, hy, 26, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff2a44'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(h.x + k * 10, hy - 2, 3.5, 0, 7); ctx.fill(); }
    }
    // player shadow
    let sx = P.x;
    if (seg.anomaly === 'shadow' && P.hist.length) sx = P.hist[0].x;
    shadow(sx, 16 - Math.min(10, P.y / 12), .3);
    // slow-mo trail
    if (G.slowOn) for (let i = 0; i < P.hist.length; i += 9) {
      const h = P.hist[i];
      person(h.x, FY - h.y, { coat: '#0b2a16', pants: '#0b2a16', skin: '#1f7a3f', hair: '#0b2a16', face: P.face, long: true, alpha: .18 + i / 200 });
    }
    const blink = P.inv > 0 && Math.floor(P.inv * 12) % 2;
    if (!blink) person(P.x, FY - P.y, { coat: '#0a0d0b', pants: '#121512', skin: '#e3b68b', hair: '#0d0d0d', face: P.face, long: true, shades: '#3dff86', phase: P.phase });
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,10,4,.6)'; ctx.fillRect(10, 10, 300, 62);
    ctx.fillStyle = '#3dff86'; ctx.font = 'bold 15px monospace';
    if (TRACE()) {
      ctx.fillText(G.hardline ? `HARDLINE ${Math.max(0, Math.ceil(G.lineT))}s` : `TRACE ${Math.floor(G.trace)}%`, 20, 31);
      ctx.fillStyle = '#123d22'; ctx.fillRect(170, 22, 130, 10);
      ctx.fillStyle = G.hardline ? (Math.floor(G.time * 4) % 2 ? '#ff4d6d' : '#ffd36b') : '#ff4d6d'; ctx.fillRect(170, 22, 130 * (G.hardline ? G.lineT / 45 : G.trace / 100), 10);
    } else ctx.fillText(`SECTOR ${G.sector + 1}/6  LOOP ${G.streak}/${REQ[G.sector]}`, 20, 31);
    ctx.font = '11px monospace'; ctx.fillStyle = '#9fe8b8'; ctx.fillText('INTEGRITY', 20, 50);
    for (let i = 0; i < maxHP(); i++) { ctx.fillStyle = i < G.integrity ? '#3dff86' : '#123d22'; ctx.fillRect(92 + i * 16, 41, 12, 10); }
    ctx.fillStyle = '#9fe8b8'; ctx.fillText('SLOW-MO', 160, 50);
    ctx.fillStyle = '#123d22'; ctx.fillRect(220, 42, 80, 8);
    ctx.fillStyle = G.slowOn ? '#d8ffe4' : '#3dff86'; ctx.fillRect(220, 42, 80 * G.slow / 100, 8);
    ctx.fillStyle = '#5fd88a'; ctx.fillText(`PATCHED ${G.patched.size}`, 20, 66);
    if (TRACE()) { ctx.fillText('CODE SIGHT', 160, 66); for (let i = 0; i < 3; i++) { ctx.fillStyle = i < G.sight ? '#d8ffe4' : '#123d22'; ctx.fillRect(240 + i * 16, 58, 10, 8); } }
    drawToast();
    // direction hints at the ends
    if (P.maxX >= 700 && P.x < 400) { ctx.fillStyle = 'rgba(255,176,0,.8)'; ctx.font = 'bold 13px monospace'; ctx.fillText('◀ turn back = "I saw a glitch"', 20, 92); }
  }
  function drawToast() {
    if (G.toastT > 0) {
      const a = Math.min(1, G.toastT * 2);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,10,4,.72)'; ctx.fillRect(W / 2 - 300, 116, 600, G.toast2 ? 60 : 38);
      ctx.fillStyle = '#eafff0'; ctx.font = 'bold 18px monospace'; ctx.fillText(G.toast, W / 2, 141);
      if (G.toast2) { ctx.fillStyle = '#9fe8b8'; ctx.font = '13px monospace'; ctx.fillText(G.toast2, W / 2, 165); }
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  function anomalyX() {
    const A = seg.anomaly;
    const m = { cat: cat.st === 'gone' || cat.st === 'wait' ? 950 : cat.x, clones: walker.x + 22, code: 915, missing: 1910, tpose: walker.x, clip: walker.x, popin: 1400, eyes: 378, float: 1650, sign: 2230, lights: 1400, door: 645, clock: 1150, shadow: P.x, possess: walker.x, ripple: 1040, spoon: 2060 };
    return A ? m[A] : null;
  }
  function post(dt) {
    if (G.sightT > 0) {
      ctx.fillStyle = 'rgba(0,26,10,.62)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '12px monospace';
      for (let c = 0; c < W / 14; c++) { ctx.fillStyle = 'rgba(61,255,134,.35)'; ctx.fillText(CODE_CH[(c * 7 + Math.floor(G.time * 10)) % CODE_CH.length], c * 14, (G.time * (60 + (c * 37) % 90) + c * 41) % H); }
      const ax = anomalyX();
      if (ax !== null && ax !== undefined) {
        const sx = ax - cam, pulse = 20 + Math.sin(G.time * 8) * 6;
        ctx.strokeStyle = '#eafff0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(clamp(sx, 20, W - 20), 280, pulse + 30, 0, 7); ctx.stroke();
        ctx.fillStyle = '#eafff0'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText(sx < 0 ? '◀ ANOMALY' : sx > W ? 'ANOMALY ▶' : 'ANOMALY', clamp(sx, 70, W - 70), 230 - pulse); ctx.textAlign = 'left';
      } else { ctx.fillStyle = '#9fe8b8'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText('SIGNAL CLEAN', W / 2, 280); ctx.textAlign = 'left'; }
    }
    if (TRACE() && G.hardline && seg.phoneX) {
      const sx = seg.phoneX - cam;
      if (sx < 0 || sx > W) { ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText(sx < 0 ? '◀ RINGING' : 'RINGING ▶', sx < 0 ? 80 : W - 80, 250); ctx.textAlign = 'left'; }
    }
    if (G.slowOn) {
      ctx.fillStyle = 'rgba(30,255,110,.10)'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .85);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,20,8,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (G.hurtT > 0) { ctx.fillStyle = `rgba(255,30,60,${G.hurtT * .5})`; ctx.fillRect(0, 0, W, H); }
    if (G.flash > 0) {
      const n = Math.ceil(G.flash * 14);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H, h = rnd(4, 30), dx = rnd(-60, 60);
        ctx.drawImage(cv, 0, y, W, h, dx, y, W, h);
      }
      ctx.fillStyle = `rgba(61,255,134,${G.flash * .25})`; ctx.fillRect(0, 0, W, H);
    }
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }

  function drawTitleBg(dt) {
    ctx.fillStyle = 'rgba(0,6,2,.25)'; ctx.fillRect(0, 0, W, H);
    ctx.font = '15px monospace';
    codeCols.forEach((c, i) => {
      c.y += c.s * dt;
      if (c.y > H + 200) { c.y = rnd(-200, 0); c.s = rnd(80, 220); }
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = r === 0 ? '#d8ffe4' : `rgba(61,255,134,${.7 - r * .25})`;
        ctx.fillText(CODE_CH[Math.floor(Math.random() * CODE_CH.length)], i * 16, c.y - r * 16);
      }
    });
  }

  // ---------- red pill: THE ENDING (3 chapters) ----------
  const CH_NAMES = ['', 'Chapter 1 · Two Worlds', 'Chapter 2 · Awakening', 'Chapter 3 · Final Call'];
  let S = null;
  const STORY = () => G.diff === 'story';
  function storyStart(ch) {
    G.diff = 'story'; ac(); startHum();
    Object.assign(G, { mode: 'play', slow: 100, slowOn: false, time: G.time && ch > 1 ? G.time : 0, caught: 0, flash: .8, shake: 0, hurtT: 0 });
    if (ch === 1) G.time = 0;
    S = { ch, t: 0, cut: 0, cam: 0, bullets: [], agents: [], fx: [], woken: 0, done: false };
    P = { x: 120, y: 0, vy: 0, jumps: 0, face: 1, phase: 0, inv: 0, maxX: 120, hist: [] };
    const d = opts.agent;
    if (ch === 1) {
      S.hpMax = 3; S.len = 5600; S.hull = S.hullMax = [120, 165, 220][d]; S.hp = 3;
      const doors = [[650, 1250, 1850, 2450, 3050, 3650, 4250, 4850], [800, 1700, 2600, 3500, 4400], [1000, 2400, 3800, 4900]][d];
      S.agents = doors.map(x => ({ x, door: x, st: 'hid', hp: 1, face: -1, phase: 0, cool: rnd(1, 2), rez: 0 }));
      toast(CH_NAMES[1], 'Reach the phone at the end of the hall before the machines break into the ship.', 4.5);
    } else if (ch === 2) {
      S.hp = S.hpMax = [5, 8, 8][d]; S.cut = S.retried ? 1.2 : 4; P.x = 220; P.down = true;
      const n = [3, 2, 1][d];
      for (let i = 0; i < n; i++) S.agents.push({ x: 640 + i * 110, st: 'idle', hp: d ? 1 : 2, face: -1, phase: 0, cool: 1.5 + i * .7, wind: 0, stag: 0 });
      toast('...', '', 1);
    } else {
      S.hp = S.hpMax = 3; S.cut = 7; S.fly = false; P.x = 360; P.alt = 0; S.dist = 0; S.goalT = 60; S.need = [12, 10, 8][d];
      S.orbs = []; S.sigs = []; S.spawnO = .5; S.spawnS = 1.5;
    }
    hidePanels();
    if (isTouch) $('touch').classList.add('on');
    $('pauseBtn').classList.add('on'); $('touch').classList.remove('red');
    setSlowLabel(ch === 2 ? 'STOP' : 'SLOW');
    if (ch > (best.storyCh || 0)) { best.storyCh = ch; save(); }
    sfx.glitch();
  }
  function storySkip() { if (!S || G.diff !== 'story') return; hidePanels(); G.mode = 'play'; last = performance.now(); storyNext(); }
  function storyStartRetry(ch) { const ws = S; storyStart(ch); if (ch === 2) { S.retried = true; S.cut = 1.2; } }
  function setSlowLabel(t) { const b = document.querySelector('#touch [data-k="slow"]'); if (b) b.textContent = t; }
  function storyHit() {
    if (P.inv > 0) return;
    S.hp--; G.caught++; G.shake = .5; G.hurtT = .5; P.inv = 1.3; sfx.hit(); G.flash = .4;
    if (S.hp <= 0) { toast('CONNECTION LOST', 'Retrying the chapter...', 2.2); S.retry = 2; }
  }
  function storyNext() {
    if (S.ch < 3) { const t = G.time; storyStart(S.ch + 1); G.time = t; return; }
    best.storyWins = (best.storyWins || 0) + 1;
    if (!best.storyTime || G.time < best.storyTime) best.storyTime = G.time;
    save(); setSlowLabel('SLOW'); sfx.sector();
    endScreen('You\'re out of the loop.', `You made the call, broke the Agents, and flew out over the code.<br>People woken on the way: ${S.woken}<br>Total time ${fmt(G.time)} · best ${fmt(best.storyTime)}<br>Hits taken: ${G.caught}`);
  }

  function storyUpdate(dt) {
    G.time += dt; S.t += dt;
    if (S.retry) { S.retry -= dt; if (S.retry <= 0) { const t = G.time; storyStartRetry(S.ch); G.time = t; } return; }
    const meterRate = S.ch === 2 ? 12 : 35;
    const want = keys.slow && G.slow > 2;
    if (want && !G.slowOn) sfx.slow();
    G.slowOn = want;
    G.slow = clamp(G.slow + (want ? -meterRate : 14) * dt, 0, 100);
    const wdt = dt * (G.slowOn ? .3 : 1);
    if (P.inv > 0) P.inv -= dt;
    if (S.ch === 1) ch1(dt, wdt); else if (S.ch === 2) ch2(dt, wdt); else ch3(dt, wdt);
    jumpPressed = false; sightPressed = false;
  }
  function walkPlayer(dt, minX, maxX) {
    const mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), run = keys.run ? 1.8 : 1;
    P.x = clamp(P.x + mv * SPEED * run * dt, minX, maxX); if (mv) { P.face = mv; P.phase += dt * 12 * run; }
    if (jumpPressed) {
      if (P.y === 0 && P.vy === 0) { P.vy = 640; P.jumps = 1; sfx.jump(); }
      else if (P.jumps < 3) { P.jumps++; P.vy = P.jumps === 2 ? 580 : 540; sfx.jump(); }
    }
    if (P.y > 0 || P.vy > 0) { P.y += P.vy * dt; P.vy -= 1500 * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; P.jumps = 0; } }
  }
  function moveBullets(wdt, hitPlayer) {
    for (let i = S.bullets.length - 1; i >= 0; i--) {
      const b = S.bullets[i];
      if (b.frozen) continue;
      b.trail = b.trail || []; b.trail.push(b.x); if (b.trail.length > 14) b.trail.shift();
      b.x += b.vx * wdt;
      if (b.back) {
        for (const a of S.agents) if (a.st !== 'gone' && a.st !== 'dazed' && Math.abs(b.x - a.x) < 18) { agentHurt(a, Math.sign(b.vx)); b.dead = true; break; }
      } else if (hitPlayer && P.inv <= 0 && Math.abs(b.x - P.x) < 12 && P.y < b.h + 4 && P.y + 85 > b.h) { b.dead = true; storyHit(); }
      if (b.dead || b.x < S.cam - 150 || b.x > S.cam + W + 150) S.bullets.splice(i, 1);
    }
  }
  function agentShoot(a) {
    a.face = Math.sign(P.x - a.x) || -1;
    S.bullets.push({ x: a.x + a.face * 16, h: 52, vx: a.face * 480 * AG().bv }); sfx.shot();
  }

  // Chapter 1: run the hall while the ship is breached
  function ch1(dt, wdt) {
    if (S.cut > 0) {
      S.cut -= dt; S.shotA && (S.shotA.phase += dt * 6);
      if (S.cut <= 0) storyNext();
      return;
    }
    walkPlayer(dt, 60, S.len);
    S.hull -= dt;
    if (S.hull <= 0) { toast('THE SHIP IS BREACHED', 'Too slow. Retrying the chapter...', 2.4); S.retry = 2.2; sfx.bad(); return; }
    if (S.hull < 20 && Math.floor(S.hull) !== S.lastBeep) { S.lastBeep = Math.floor(S.hull); tone(880, .1, 'square', .03); }
    const spd = (120) * AG().sp;
    for (const a of S.agents) {
      if (a.st === 'hid' && Math.abs(P.x - a.x) < 520) { a.st = 'out'; a.rez = 0; sfx.glitch(); }
      if (a.st === 'out') {
        a.rez = Math.min(1, a.rez + dt * 2); a.cool -= wdt;
        const dx = P.x - a.x; a.face = Math.sign(dx) || -1;
        if (Math.abs(dx) > 40) { a.x += Math.sign(dx) * spd * wdt; a.phase += wdt * 8; }
        if (opts.shoot && a.cool <= 0 && Math.abs(dx) < 480 && Math.abs(dx) > 70) { a.cool = rnd(1.8, 3) * AG().cd; agentShoot(a); }
        if (P.inv <= 0 && Math.abs(dx) < 22 && P.y < 45) storyHit();
      }
    }
    moveBullets(wdt, true);
    S.cam += (clamp(P.x - W * .42, 0, S.len + 200 - W) - S.cam) * Math.min(1, dt * 8);
    if (P.x >= S.len - 120) {
      // the scripted ambush at the phone room door
      S.cut = 3.2; S.bullets = []; S.agents.forEach(a => a.st = 'hid');
      S.shotA = { x: S.len + 40, phase: 0 };
      G.flash = 1; G.shake = .8; sfx.hit(); noise(.5, .1);
      toast('YOU WERE SHOT.', 'The door was a trap. Everything goes dark...', 3.2);
    }
  }

  // Chapter 2: wake up, stop the bullets, break the Agents
  function agentHurt(a, dir) {
    a.hp--; a.stag = .6; a.x += dir * 60; G.shake = .25; tone(200, .2, 'sawtooth', .05, -120);
    if (a.hp <= 0) { a.st = 'dazed'; toast('AGENT DAZED', 'Run into him to break him from the inside.', 2.2); }
  }
  function ch2(dt, wdt) {
    if (S.cut > 0) {
      S.cut -= dt;
      if (S.cut < 3.2 && !S.said1) { S.said1 = 1; toast('OPERATOR', 'Your heart just started again. Get up. You can see it now.', 3); }
      if (S.cut <= 0) { P.down = false; S.code = true; G.flash = 1; sfx.sector(); toast('YOU CAN SEE THE CODE', opts.shoot ? 'Hold STOP to freeze bullets, let go to send them back.' : 'Walk up to an Agent and hold STOP to knock him down. Then walk into him.', 4); }
      return;
    }
    walkPlayer(dt, 40, W - 40);
    const holding = G.slowOn || (keys.slow && S.ch === 2);
    // freeze bullets in front of you while holding, send them back on release
    for (const b of S.bullets) {
      if (!b.back && holding && Math.abs(b.x - P.x) < 150 && !b.frozen) { b.frozen = true; b.fy = rnd(-14, 14); tone(1500, .05, 'sine', .02); }
      if (b.frozen && !holding) { b.frozen = false; b.back = true; b.vx = -b.vx * 1.3; }
    }
    let alive = 0;
    for (const a of S.agents) {
      if (a.st === 'gone') continue;
      alive++;
      if (a.st === 'burst') { a.t += dt; if (a.t > 1.1) { a.st = 'gone'; P.hidden = false; G.flash = .8; } continue; }
      if (a.st === 'dazed') {
        if (Math.abs(P.x - a.x) < 30) { a.st = 'burst'; a.t = 0; P.hidden = true; P.x = a.x; G.shake = 1; noise(.9, .12); [200, 400, 800, 1600].forEach((f, i) => tone(f, .3, 'square', .04, 0, i * .08)); }
        continue;
      }
      a.stag = Math.max(0, a.stag - wdt); a.cool -= wdt;
      const dx = P.x - a.x; a.face = Math.sign(dx) || -1;
      if (a.stag > 0) continue;
      if (opts.shoot) {
        const want = 330 + (a.x % 60);
        if (Math.abs(dx) < want - 30) { a.x -= Math.sign(dx) * 90 * AG().sp * wdt; a.phase += wdt * 8; }
        else if (Math.abs(dx) > want + 60) { a.x += Math.sign(dx) * 90 * AG().sp * wdt; a.phase += wdt * 8; }
        a.x = clamp(a.x, 30, W - 30);
        if (a.cool <= 0) { a.cool = rnd(2, 3.2) * AG().cd; agentShoot(a); }
      } else {
        const busy = S.agents.some(o => o !== a && o.wind > 0);
        if (a.wind > 0) {
          if (keys.slow && Math.abs(dx) < 140) { a.wind = 0; agentHurt(a, -Math.sign(dx)); a.cool = rnd(1.4, 2.2) * AG().cd; G.flash = .5; sfx.good(); continue; }
          a.wind -= dt;
          if (a.wind <= 0) {
            if (Math.abs(dx) < 75) storyHit();
            a.cool = rnd(1.6, 2.6) * AG().cd;
          }
        } else if (keys.slow && Math.abs(dx) < 90) { agentHurt(a, -Math.sign(dx)); a.cool = rnd(1.4, 2.2) * AG().cd; G.flash = .5; sfx.good(); continue; }
        else if (Math.abs(dx) > 55) { a.x += Math.sign(dx) * 110 * AG().sp * wdt; a.phase += wdt * 8; }
        else if (a.cool <= 0 && !busy) a.wind = [1.1, 1.4, 1.7][opts.agent];
      }
    }
    moveBullets(wdt, true);
    if (!alive && !S.won) { S.won = true; S.cut2 = 2.5; toast('THEY RAN.', 'One last thing to do.', 2.5); }
    if (S.cut2) { S.cut2 -= dt; if (S.cut2 <= 0) storyNext(); }
  }

  // Chapter 3: the last call, then fly
  function ch3(dt, wdt) {
    if (!S.fly) {
      S.cut -= dt;
      P.x = Math.min(480, P.x + 60 * dt); P.phase += dt * 5;
      if (S.cut < 5.6 && !S.l1) { S.l1 = 1; P.phone = true; toast('THE CALL', 'I know you\'re listening. I\'m not scared of you anymore.', 2.6); sfx.ring(); }
      if (S.cut < 3 && !S.l2) { S.l2 = 1; toast('THE CALL', 'I\'m going to show everyone what\'s outside the loop.', 2.8); }
      if (S.cut <= 0) { S.fly = true; P.phone = false; P.x = 300; P.alt = 380; S.t = 0; G.flash = .8; tone(300, .6, 'sine', .05, 600); toast('FLY', 'Hold ▲ to rise. Fly through the green lights to wake people. Dodge red signals.', 4.5); }
      return;
    }
    S.dist += dt;
    const mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const spd = 280 * (1 + mv * .4);
    P.alt = clamp(P.alt + (keys.jump ? -300 : 170) * dt, 40, 440);
    P.x = clamp(P.x + mv * 120 * dt, 160, 520);
    S.scroll = (S.scroll || 0) + spd * wdt;
    S.spawnO -= wdt; S.spawnS -= wdt;
    if (S.dist < S.goalT - 3) {
      if (S.spawnO <= 0) { S.spawnO = rnd(.9, 1.5); S.orbs.push({ x: W + 40, y: rnd(60, 400) }); }
      if (S.spawnS <= 0) { S.spawnS = rnd(1.1, 1.8) / [1, .75, .55][opts.agent]; S.sigs.push({ x: W + 40, y: rnd(40, 420), ph: rnd(0, 6), r: rnd(18, 30) }); }
    }
    for (let i = S.orbs.length - 1; i >= 0; i--) {
      const o = S.orbs[i]; o.x -= spd * wdt;
      if (Math.hypot(o.x - P.x, o.y - P.alt) < 34) { S.woken++; S.orbs.splice(i, 1); tone(880, .1, 'triangle', .04); tone(1320, .14, 'triangle', .04, 0, .08); continue; }
      if (o.x < -40) S.orbs.splice(i, 1);
    }
    for (let i = S.sigs.length - 1; i >= 0; i--) {
      const s = S.sigs[i]; s.x -= spd * wdt * 1.1; s.ph += wdt * 3; s.y += Math.sin(s.ph) * 40 * wdt;
      if (P.inv <= 0 && Math.hypot(s.x - P.x, s.y - P.alt) < s.r + 12) { storyHit(); S.sigs.splice(i, 1); continue; }
      if (s.x < -60) S.sigs.splice(i, 1);
    }
    if (S.dist >= S.goalT) storyNext();
  }

  // ---------- story drawing ----------
  function agentLook(a) { return { coat: '#22252b', pants: '#1b1d22', skin: '#e1b894', hair: '#1c1c1c', shades: '#000', tie: true, ear: true, face: a.face, phase: a.phase }; }
  const HERO = { coat: '#111', pants: '#111', skin: '#e1b894', hair: '#141414', shades: '#3dff86', long: true };
  function storyDraw() {
    if (S.ch === 3) return drawCh3();
    const code = S.ch === 2 && S.code;
    ctx.save();
    if (G.shake > 0) ctx.translate(rnd(-6, 6) * G.shake, rnd(-6, 6) * G.shake);
    ctx.fillStyle = code ? '#010a04' : '#2a1414'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-Math.round(S.cam), 0);
    const x0 = Math.floor(S.cam / 100) * 100, len = S.ch === 1 ? S.len + 300 : W;
    if (code) {
      ctx.font = '13px monospace';
      for (let x = 0; x < W; x += 15) for (let y = (G.time * 70 + x * 3) % 22 - 22; y < FLOOR; y += 22) { ctx.fillStyle = `rgba(61,255,134,${.12 + ((x * 7 + y) % 5) * .05})`; ctx.fillText(CODE_CH[(x + Math.floor(y) + Math.floor(G.time * 6)) % CODE_CH.length], x, y); }
      ctx.strokeStyle = '#3dff86'; ctx.lineWidth = 2; ctx.strokeRect(0, 70, W, FLOOR - 70);
      ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(W, FLOOR); ctx.stroke();
      for (let x = 60; x < W; x += 300) ctx.strokeRect(x, 230, 70, FLOOR - 230);
    } else {
      ctx.fillStyle = '#1b0f0f'; ctx.fillRect(S.cam, 0, W, 70);
      ctx.fillStyle = '#8c4b44'; ctx.fillRect(S.cam, 70, W, FLOOR - 70);
      ctx.fillStyle = '#6e3631'; ctx.fillRect(S.cam, 300, W, FLOOR - 300);
      ctx.fillStyle = '#d9b36a'; ctx.fillRect(S.cam, 296, W, 4);
      for (let x = x0; x < S.cam + W + 100; x += 100) { ctx.fillStyle = 'rgba(255,230,180,.08)'; ctx.fillRect(x + 20, 70, 40, FLOOR - 70); }
      for (let x = 400; x < len; x += 500) { ctx.fillStyle = '#f6e7c8'; ctx.fillRect(x, 66, 60, 5); ctx.fillStyle = 'rgba(255,240,200,.07)'; ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x + 60, 70); ctx.lineTo(x + 120, FLOOR); ctx.lineTo(x - 60, FLOOR); ctx.fill(); }
      if (S.ch === 1) {
        S.agents.forEach(a => { ctx.fillStyle = a.st === 'hid' ? '#4a2a1c' : '#140b08'; ctx.fillRect(a.door - 34, 230, 68, FLOOR - 230); ctx.fillStyle = '#d9b36a'; ctx.fillRect(a.door + 22, 330, 6, 6); });
        const ex = S.len + 40;
        ctx.fillStyle = S.cut > 0 ? '#140b08' : '#4a2a1c'; ctx.fillRect(ex - 36, 230, 72, FLOOR - 230);
        ctx.fillStyle = '#f6e7c8'; ctx.fillRect(ex - 18, 246, 36, 16); ctx.fillStyle = '#3a1a14'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('303', ex, 258); ctx.textAlign = 'left';
        if (Math.floor(G.time * 1.2) % 2 === 0 && S.cut <= 0) { ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 13px monospace'; ctx.fillText('☎ ring', ex - 24, 220); }
      }
      ctx.fillStyle = '#3d2420'; ctx.fillRect(S.cam, FLOOR, W, H - FLOOR);
    }
    // agents
    for (const a of S.agents) {
      if (a.st === 'hid' || a.st === 'gone') continue;
      if (a.st === 'burst') {
        const k = a.t / 1.1;
        ctx.save(); ctx.translate(a.x, FY - 42); ctx.scale(1 + k * .8, 1 + k * .8);
        ctx.fillStyle = `rgba(230,255,240,${1 - k})`; ctx.fillRect(-14, -42, 28, 84); ctx.restore();
        for (let i = 0; i < 18; i++) { const an = i / 18 * 6.28, r = k * 260; ctx.fillStyle = `rgba(61,255,134,${1 - k})`; ctx.fillText(CODE_CH[i % CODE_CH.length], a.x + Math.cos(an) * r, FY - 42 + Math.sin(an) * r); }
        continue;
      }
      const o = agentLook(a);
      if (code) Object.assign(o, { coat: '#0c3d1f', pants: '#0c3d1f', skin: '#3dff86', hair: '#0c3d1f', shades: '#d8ffe4' });
      if (S.ch === 1) o.alpha = a.rez;
      if (a.st === 'dazed') { ctx.save(); ctx.translate(a.x, FY); ctx.scale(1, .75); ctx.translate(-a.x, -FY); person(a.x, FY, o); ctx.restore(); ctx.strokeStyle = `rgba(230,255,240,${.5 + Math.sin(G.time * 10) * .4})`; ctx.lineWidth = 2; ctx.strokeRect(a.x - 18, FY - 70, 36, 70); }
      else { shadow(a.x, 16); person(a.x + (a.stag > 0 ? rnd(-3, 3) : 0), FY, o); }
      if (a.wind > 0) { ctx.fillStyle = Math.floor(G.time * 8) % 2 ? '#ff4d6d' : '#ffd36b'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText('HOLD STOP!', a.x, FY - 104); ctx.textAlign = 'left'; ctx.strokeStyle = 'rgba(255,77,109,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, FY - 50, 40, -1.57, -1.57 + 6.28 * (a.wind / [1.1, 1.4, 1.7][opts.agent])); ctx.stroke(); }
    }
    if (S.shotA) { const o = agentLook({ face: -1, phase: 0 }); person(S.shotA.x, FY, o); ctx.fillStyle = '#ffd36b'; if (S.cut > 2.8) ctx.fillRect(S.shotA.x - 30, FY - 54, 14, 4); }
    // bullets
    for (const b of S.bullets) {
      const y = FY - b.h + (b.frozen ? b.fy + Math.sin(G.time * 5 + b.x) * 2 : 0);
      if (b.trail && !b.frozen) b.trail.forEach((x, i) => { ctx.fillStyle = `rgba(255,220,120,${i / 30})`; ctx.fillRect(x - 2, y - 1, 4, 2); });
      ctx.fillStyle = b.frozen ? '#eafff0' : b.back ? '#3dff86' : '#ffd36b'; ctx.fillRect(b.x - 4, y - 2, 8, 4);
      if (b.frozen) { ctx.strokeStyle = 'rgba(200,255,220,.5)'; ctx.beginPath(); ctx.arc(b.x, y, 9 + Math.sin(G.time * 8) * 2, 0, 7); ctx.stroke(); }
    }
    // hero
    if (!P.hidden) {
      const ho = Object.assign({}, HERO, { face: P.face, phase: P.phase });
      if (code) Object.assign(ho, { coat: '#d8ffe4', pants: '#d8ffe4', skin: '#eafff0', hair: '#d8ffe4', shades: '#3dff86' });
      if (P.inv > 0 && Math.floor(P.inv * 12) % 2) ho.alpha = .4;
      if (S.ch === 1 && S.cut > 0) { ctx.save(); ctx.translate(P.x, FY); ctx.rotate(-Math.min(1.5, (3.2 - S.cut) * 2)); ctx.translate(-P.x, -FY); person(P.x, FY, ho); ctx.restore(); }
      else if (P.down) { ctx.save(); ctx.translate(P.x, FY); ctx.rotate(-1.5 + Math.max(0, 1 - S.cut) * 1.5); ctx.translate(-P.x, -FY); person(P.x, FY, ho); ctx.restore(); }
      else { shadow(P.x, 16); person(P.x, FY - P.y, ho); }
      if (S.ch === 2 && G.slowOn && !P.down) { ctx.fillStyle = 'rgba(200,255,220,.15)'; ctx.beginPath(); ctx.arc(P.x + P.face * 20, FY - 60 - P.y, 150, 0, 7); ctx.fill(); ctx.fillStyle = '#eafff0'; ctx.fillRect(P.x + P.face * 14 - 2, FY - 70 - P.y, 4, 14); }
    }
    ctx.restore();
    if (G.slowOn && S.ch === 1) { ctx.fillStyle = 'rgba(160,255,200,.08)'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    if (S.ch === 1) drawShip();
    if ((S.ch === 1 && S.cut > 0) || (S.ch === 2 && S.cut > 1)) { ctx.fillStyle = `rgba(0,0,0,${S.ch === 1 ? clamp((3.2 - S.cut) / 2.4, 0, .92) : .9})`; ctx.fillRect(0, 0, W, H); if (S.ch === 2) { ctx.fillStyle = `rgba(61,255,134,${(4 - S.cut) / 3 * .6})`; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.fillText('♥ . . .  ♥ . .  ♥', W / 2, H / 2); ctx.textAlign = 'left'; } }
    storyHUD();
  }
  function drawShip() {
    const x = W - 250, y = 84, w = 232, h = 126, k = 1 - S.hull / S.hullMax;
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x - 4, y - 4, w + 8, h + 30);
    ctx.fillStyle = '#10161a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1d272d'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 22, y + 8, 16, 26);
    ctx.fillStyle = '#3dff86'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 10 + i * 30, y + 46, 22, 14);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x + 30, y + 70, 30, 40); ctx.fillRect(x + 26, y + 104, 40, 8);
    ctx.fillStyle = '#e1b894'; ctx.fillRect(x + 38, y + 62, 12, 12);
    // hull being cut
    const cx = x + w - 40, cy = y + 60;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 30, -1.57, -1.57 + k * 6.28); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ffd36b'; const an = -1.57 + k * 6.28; ctx.fillRect(cx + Math.cos(an) * 30 + rnd(-8, 8), cy + Math.sin(an) * 30 + rnd(-8, 8), 2, 2); }
    if (k > .7) { ctx.fillStyle = '#ff2a44'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(cx + i * 9, cy, 3, 0, 7); ctx.fill(); } }
    ctx.fillStyle = '#9fe8b8'; ctx.font = '11px monospace'; ctx.fillText('REAL WORLD · HULL', x, y + h + 16);
    ctx.fillStyle = '#3a1a1a'; ctx.fillRect(x + 128, y + h + 7, 104, 10);
    ctx.fillStyle = S.hull < 20 && Math.floor(G.time * 4) % 2 ? '#ffd36b' : '#ff4d6d'; ctx.fillRect(x + 128, y + h + 7, 104 * S.hull / S.hullMax, 10);
  }
  function drawCh3() {
    const t = G.time, sc = S.scroll || 0;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#010804'); g.addColorStop(1, '#06200f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let layer = 0; layer < 2; layer++) {
      const sp = layer ? .9 : .35, base = layer ? 0 : 90;
      for (let i = -1; i < 12; i++) {
        const bw = 90 + ((i * 37 + layer * 13) % 5) * 14;
        const wx = ((i * 110 - sc * sp) % 1320 + 1320) % 1320 - 120;
        const bh = 150 + ((Math.floor((i * 110 - sc * sp) / 1320) * 7 + i * 53 + layer * 29) % 7 + 7) % 7 * 40 - base;
        ctx.fillStyle = layer ? '#020d06' : '#04160b'; ctx.fillRect(wx, H - bh, bw, bh);
        ctx.fillStyle = layer ? 'rgba(61,255,134,.35)' : 'rgba(61,255,134,.15)';
        for (let yy = H - bh + 12; yy < H - 10; yy += 18) for (let xx = wx + 8; xx < wx + bw - 10; xx += 16) if (((xx * 3 + yy) | 0) % 7 < 3) ctx.fillRect(xx, yy, 6, 8);
      }
    }
    ctx.font = '12px monospace';
    for (let c = 0; c < W / 24; c++) { ctx.fillStyle = 'rgba(61,255,134,.12)'; ctx.fillText(CODE_CH[(c * 5 + Math.floor(t * 8)) % CODE_CH.length], c * 24, (t * (50 + c * 7 % 60) + c * 47) % H); }
    if (!S.fly) {
      ctx.fillStyle = '#0a1a10'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
      // phone booth
      ctx.strokeStyle = '#3dff86'; ctx.lineWidth = 3; ctx.strokeRect(470, 330, 70, FLOOR - 330);
      ctx.fillStyle = 'rgba(61,255,134,.08)'; ctx.fillRect(470, 330, 70, FLOOR - 330);
      ctx.fillStyle = '#9fe8b8'; ctx.font = 'bold 11px monospace'; ctx.fillText('PHONE', 482, 344);
      const ho = Object.assign({}, HERO, { face: 1, phase: P.phase, phone: P.phone });
      person(P.x, FY - 38, ho);
      if (S.cut < 1) { ctx.fillStyle = `rgba(230,255,240,${1 - S.cut})`; ctx.fillRect(0, 0, W, H); }
    } else {
      for (const o of S.orbs) { ctx.fillStyle = 'rgba(61,255,134,.25)'; ctx.beginPath(); ctx.arc(o.x, o.y, 18 + Math.sin(t * 6 + o.x) * 3, 0, 7); ctx.fill(); ctx.fillStyle = '#d8ffe4'; ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, 7); ctx.fill(); }
      for (const s of S.sigs) { ctx.strokeStyle = '#ff2a44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + Math.sin(t * 9 + s.ph) * 3, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,42,68,.35)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .55, 0, 7); ctx.stroke(); }
      // flying hero
      const ho = Object.assign({}, HERO, { face: 1, phase: 0 });
      if (P.inv > 0 && Math.floor(P.inv * 12) % 2) ho.alpha = .4;
      ctx.save(); ctx.translate(P.x, P.alt); ctx.rotate(1.35);
      ctx.strokeStyle = 'rgba(20,20,20,.9)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 6, -20); ctx.lineTo(-8 + i * 6 + Math.sin(t * 20 + i) * 4, 14); ctx.stroke(); }
      person(0, 40, ho); ctx.restore();
      ctx.fillStyle = 'rgba(200,255,220,.25)'; for (let i = 0; i < 4; i++) ctx.fillRect(P.x - 60 - i * 30, P.alt - 20 + i * 8 + Math.sin(t * 10 + i) * 3, 40 - i * 6, 2);
    }
    storyHUD();
  }
  function storyHUD() {
    ctx.fillStyle = 'rgba(0,10,4,.6)'; ctx.fillRect(10, 10, 320, 62);
    ctx.fillStyle = '#3dff86'; ctx.font = 'bold 14px monospace'; ctx.fillText(CH_NAMES[S.ch].toUpperCase(), 20, 31);
    ctx.font = '11px monospace'; ctx.fillStyle = '#9fe8b8'; ctx.fillText('INTEGRITY', 20, 50);
    const mx = S.hpMax || 3;
    for (let i = 0; i < mx; i++) { ctx.fillStyle = i < S.hp ? '#3dff86' : '#123d22'; ctx.fillRect(92 + i * 16, 41, 12, 10); }
    ctx.fillStyle = '#9fe8b8'; ctx.fillText(S.ch === 2 ? 'STOP' : 'SLOW-MO', 170, 50);
    ctx.fillStyle = '#123d22'; ctx.fillRect(230, 42, 90, 8);
    ctx.fillStyle = G.slowOn ? '#d8ffe4' : '#3dff86'; ctx.fillRect(230, 42, 90 * G.slow / 100, 8);
    ctx.fillStyle = '#5fd88a';
    if (S.ch === 2) ctx.fillText(`AGENTS LEFT ${S.agents.filter(a => a.st !== 'gone').length}`, 20, 66);
    if (S.ch === 3 && S.fly) { ctx.fillText(`WOKEN ${S.woken}/${S.need}`, 20, 66); ctx.fillStyle = '#123d22'; ctx.fillRect(130, 59, 190, 6); ctx.fillStyle = '#3dff86'; ctx.fillRect(130, 59, 190 * S.dist / S.goalT, 6); }
    if (S.ch === 1) ctx.fillText('PHONE: END OF THE HALL ▶', 20, 66);
    if (G.flash > 0) { ctx.fillStyle = `rgba(200,255,220,${G.flash * .5})`; ctx.fillRect(0, 0, W, H); }
    if (G.hurtT > 0) { ctx.fillStyle = `rgba(255,40,60,${G.hurtT * .4})`; ctx.fillRect(0, 0, W, H); }
    drawToast();
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (G.mode === 'play' && STORY()) {
      storyUpdate(dt);
      G.flash = Math.max(0, G.flash - dt); G.toastT -= dt; G.hurtT = Math.max(0, G.hurtT - dt);
      if (G.shake > 0) G.shake -= dt;
    } else if (G.mode === 'play') {
      update(dt);
      G.flash = Math.max(0, G.flash - dt); G.toastT -= dt; G.hurtT = Math.max(0, G.hurtT - dt);
      if (G.shake > 0) G.shake -= dt;
    }
    if ((G.mode === 'play' || G.mode === 'paused') && STORY()) storyDraw();
    else if (G.mode === 'play' || G.mode === 'paused') {
      ctx.save();
      if (G.shake > 0) ctx.translate(rnd(-6, 6) * G.shake, rnd(-6, 6) * G.shake);
      drawScene(); drawActors();
      ctx.restore();
      drawHUD(); post(dt);
    } else drawTitleBg(dt);
    requestAnimationFrame(frame);
  }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
})();
