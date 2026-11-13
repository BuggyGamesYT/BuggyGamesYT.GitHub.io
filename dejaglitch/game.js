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
  };
  const LIGHTS = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
  const CODE_CH = '01<>{}#$%&*+=?/\\アイウエオカキクケコサシスセソ'.split('');

  // ---------- save ----------
  let best = { sector: 0, wins: 0, time: 0, found: [] };
  try { best = Object.assign(best, JSON.parse(localStorage.getItem('dejaglitch-best') || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem('dejaglitch-best', JSON.stringify(best)); } catch (e) {} }
  function bestLine() {
    const f = (best.found || []).length;
    let s = '';
    if (best.wins) s = `Escaped ${best.wins}× · best time ${fmt(best.time)} · glitches found ${f}/14`;
    else if (best.sector > 0 || f) s = `Furthest: Sector ${best.sector + 1} · glitches found ${f}/14`;
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
  const keys = { left: false, right: false, jump: false, slow: false };
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', Space: 'slow', ShiftLeft: 'slow', ShiftRight: 'slow' };
  addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (k) { if (k === 'jump' && !keys.jump) jumpPressed = true; keys[k] = true; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') { if (G.mode === 'play') pause(); else if (G.mode === 'paused') resume(); }
    if (e.code === 'KeyM') toggleMute();
    if ((e.code === 'Enter') && G.mode === 'title' && !document.querySelector('#how.show,#about.show')) startGame();
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  let jumpPressed = false;
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); ac(); if (k === 'jump' && !keys.jump) jumpPressed = true; keys[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
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
  let P, seg, walker, cat, agents, cam = 0, codeCols = [];

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
    seg = { t: 0, anomaly: G.anomaly, hinted: false };
    P = { x: 130, y: 0, vy: 0, face: 1, maxX: 130, hist: [], phase: 0, inv: 0 };
    walker = { x: 2050, phase: 0 };
    cat = { x: 1050, st: 'wait', a: 1, t: 0, phase: 0 };
    agents = [];
    if (G.sector >= 1) {
      const maxN = Math.min(3, 1 + Math.floor(G.sector / 2));
      const n = 1 + Math.floor(Math.random() * maxN);
      for (let i = 0; i < n; i++) agents.push({ x: 850 + i * 560 + rnd(0, 220), st: 'idle', phase: 0, face: -1, rez: 0 });
    }
  }

  function startGame() {
    ac(); startHum();
    Object.assign(G, { mode: 'play', sector: 0, streak: 0, integrity: 3, anomaly: null, last: null, slow: 100, time: 0, caught: 0, mistakes: 0, found: 0, flash: .6, firstLoop: true });
    G.patched = new Set();
    newSegment();
    hidePanels();
    if (isTouch) $('touch').classList.add('on');
    $('pauseBtn').classList.add('on');
    toast('SECTOR 1 · ' + SECTOR_NAMES[0], 'Memorize this street. Then walk to the far door ▶', 4);
    sfx.glitch();
  }

  function decide(dir) {
    const a = G.anomaly, correct = a ? dir === 'back' : dir === 'forward';
    G.firstLoop = false;
    if (correct) {
      G.streak++;
      if (a) {
        G.patched.add(a); G.found++;
        if (!best.found.includes(a)) { best.found.push(a); save(); }
        toast('GLITCH USED: ' + ANOM[a].name.toUpperCase(), 'The Agents patched it. It won\'t come back.');
      } else toast('CLEAN LOOP', 'Nothing was off. Good call.', 1.8);
      sfx.good();
      if (G.streak >= REQ[G.sector]) {
        G.sector++; G.streak = 0; G.firstLoop = true; G.integrity = 3;
        if (G.sector > best.sector && G.sector < REQ.length) { best.sector = G.sector; save(); }
        if (G.sector >= REQ.length) return win();
        toast('SECTOR ' + (G.sector + 1) + ' · ' + SECTOR_NAMES[G.sector], G.sector === 1 ? 'Agents are here now. Jump them. Hold slow-mo to time it.' : 'Memorize the new look.', 4);
        sfx.sector();
      }
    } else {
      G.streak = 0; G.mistakes++;
      toast('WRONG CALL · LOOP RESET', a ? 'You walked past: ' + ANOM[a].name + '.' : 'Nothing was glitched that time.', 3);
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
      G.integrity = 3; G.streak = 0; G.firstLoop = true; G.anomaly = null;
      toast('SYSTEM RESET', 'The Agents wiped your progress in this sector.', 3);
    } else toast('AGENT CONTACT', 'Integrity ' + G.integrity + '/3. Restarting this loop.', 2.4);
    G.flash = .6;
    const keep = G.anomaly; newSegment(); seg.anomaly = keep; P.inv = 1.2;
  }

  function win() {
    G.mode = 'end'; stopHum();
    best.wins = (best.wins || 0) + 1;
    if (!best.time || G.time < best.time) best.time = G.time;
    best.sector = REQ.length - 1; save();
    $('endTitle').textContent = 'You glitched out of the simulation.';
    $('endText').innerHTML = `Time ${fmt(G.time)}<br>Glitches used: ${G.found}<br>Wrong calls: ${G.mistakes} · Agent hits: ${G.caught}<br>Glitch log: ${best.found.length}/14 found ever`;
    showPanel('end'); $('touch').classList.remove('on'); $('pauseBtn').classList.remove('on');
    sfx.sector();
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
    if (G.mode === 'paused') { resume(); return 1; }
    if (G.mode === 'end') { toTitle(); return 1; }
    return 0;
  };
  $('playBtn').onclick = startGame;
  $('againBtn').onclick = startGame;
  $('endTitleBtn').onclick = toTitle;
  $('quitBtn').onclick = toTitle;
  $('resumeBtn').onclick = resume;
  $('pauseBtn').onclick = () => { if (G.mode === 'play') pause(); };
  $('muteBtn').onclick = toggleMute;
  function toTitle() { G.mode = 'title'; stopHum(); bestLine(); showPanel('title'); $('touch').classList.remove('on'); $('pauseBtn').classList.remove('on'); }
  function pause() { if (G.mode !== 'play') return; G.mode = 'paused'; for (const k in keys) keys[k] = false; showPanel('pause'); }
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

    // player
    const mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    P.x += mv * SPEED * dt; if (mv) { P.face = mv; P.phase += dt * 12; }
    if (jumpPressed && P.y === 0) { P.vy = 640; sfx.jump(); }
    jumpPressed = false;
    if (P.y > 0 || P.vy > 0) { P.y += P.vy * dt; P.vy -= 1500 * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; } }
    P.maxX = Math.max(P.maxX, P.x);
    if (P.maxX < 700 && P.x < 110) {
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

    // cat
    if (cat.st === 'wait' && P.x > 520) { cat.st = 'walk'; cat.x = 1050; cat.a = 1; }
    else if (cat.st === 'walk') { cat.x -= 75 * wdt; cat.phase += wdt * 14; if (cat.x < 820) { cat.st = 'fade'; cat.t = 0; } }
    else if (cat.st === 'fade') { cat.t += wdt; cat.a = 1 - cat.t / .5; if (cat.t > .5) { cat.st = 'gone'; cat.t = 0; } }
    else if (cat.st === 'gone' && seg.anomaly === 'cat') { cat.t += wdt; if (cat.t > .7) { cat.st = 'walk'; cat.x = 1050; cat.a = 1; } }

    // agents
    const spd = 110 + G.sector * 14;
    for (const a of agents) {
      const dx = P.x - a.x;
      if (a.st === 'idle' && Math.abs(dx) < 520) { a.st = 'chase'; a.rez = .5; sfx.glitch(); }
      if (a.st === 'chase') {
        a.face = Math.sign(dx) || a.face;
        if (Math.abs(dx) > 8) a.x += a.face * spd * wdt;
        a.phase += wdt * 10;
        if (a.rez > 0) a.rez -= dt;
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
    person(walker.x, FY, wo);
    if (A === 'clones') { shadow(walker.x + 44, 16); person(walker.x + 44, FY, wo); }

    // cat
    if (cat.st === 'walk' || cat.st === 'fade') drawCat(cat.x, cat.a, cat.phase);

    ctx.restore();
  }
  function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function door(x, col, label) {
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 4, 196, 88, FLOOR - 196);
    ctx.fillStyle = col; ctx.fillRect(x, 200, 80, FLOOR - 200);
    ctx.fillStyle = '#c9b46a'; ctx.fillRect(x + 64, 320, 8, 8);
    if (label) { ctx.fillStyle = '#ffb000'; ctx.font = 'bold 12px monospace'; ctx.fillText(label, x + 30, 260); }
  }
  function drawCat(x, a, ph) {
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x, FY);
    shadow(0, 14, .25);
    ctx.fillStyle = '#0b0b0b';
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
    ctx.fillText(`SECTOR ${G.sector + 1}/6  LOOP ${G.streak}/${REQ[G.sector]}`, 20, 31);
    ctx.font = '11px monospace'; ctx.fillStyle = '#9fe8b8'; ctx.fillText('INTEGRITY', 20, 50);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < G.integrity ? '#3dff86' : '#123d22'; ctx.fillRect(92 + i * 16, 41, 12, 10); }
    ctx.fillStyle = '#9fe8b8'; ctx.fillText('SLOW-MO', 160, 50);
    ctx.fillStyle = '#123d22'; ctx.fillRect(220, 42, 80, 8);
    ctx.fillStyle = G.slowOn ? '#d8ffe4' : '#3dff86'; ctx.fillRect(220, 42, 80 * G.slow / 100, 8);
    ctx.fillStyle = '#5fd88a'; ctx.fillText(`PATCHED ${G.patched.size}`, 20, 66);
    if (G.toastT > 0) {
      const a = Math.min(1, G.toastT * 2);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,10,4,.72)'; ctx.fillRect(W / 2 - 300, 116, 600, G.toast2 ? 60 : 38);
      ctx.fillStyle = '#eafff0'; ctx.font = 'bold 18px monospace'; ctx.fillText(G.toast, W / 2, 141);
      if (G.toast2) { ctx.fillStyle = '#9fe8b8'; ctx.font = '13px monospace'; ctx.fillText(G.toast2, W / 2, 165); }
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    // direction hints at the ends
    if (P.maxX >= 700 && P.x < 400) { ctx.fillStyle = 'rgba(255,176,0,.8)'; ctx.font = 'bold 13px monospace'; ctx.fillText('◀ turn back = "I saw a glitch"', 20, 92); }
  }

  function post(dt) {
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

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (G.mode === 'play') {
      update(dt);
      G.flash = Math.max(0, G.flash - dt); G.toastT -= dt; G.hurtT = Math.max(0, G.hurtT - dt);
      if (G.shake > 0) G.shake -= dt;
    }
    if (G.mode === 'play' || G.mode === 'paused') {
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
