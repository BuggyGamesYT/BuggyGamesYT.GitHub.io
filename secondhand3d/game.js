/* Secondhand 3D · © 2026 Buggy Games YT. All rights reserved.
   Contact: BuggysFanMail@gmail.com
   3D remake of Secondhand. three.js (MIT) is bundled locally. */
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
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !QS.has('noaa'), powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
scene.add(cam);
// corruption uniforms: zero = untouched image
const U = { uTime: { value: 0 }, uDrain: { value: 0 }, uGlitch: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } };
const FX_DECL = 'uniform float uTime;\nuniform float uDrain;\nuniform float uGlitch;\nuniform vec3 uTint;\n';
const FX_CODE = `
{
  vec3 col = gl_FragColor.rgb;
  if (uDrain > 0.001) { float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(col, vec3(l), uDrain); }
  col *= uTint;
  if (uGlitch > 0.0) {
    vec2 b = floor(gl_FragCoord.xy / vec2(56.0, 18.0));
    float h = fract(sin(dot(b + floor(uTime * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
    if (h < uGlitch * 0.2) { vec2 c = floor(gl_FragCoord.xy / 6.0); col = mix(vec3(1.0, 0.0, 1.0), vec3(0.02), mod(c.x + c.y, 2.0)); }
    else if (h < uGlitch * 0.42) col = col.brg;
    else if (h < uGlitch * 0.52) col = vec3(1.0) - col;
  }
  gl_FragColor.rgb = col;
}`;
function patch(m, key = 'l', extra = null) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uDrain = U.uDrain; sh.uniforms.uGlitch = U.uGlitch; sh.uniforms.uTint = U.uTint;
    if (extra) extra(sh);
    sh.fragmentShader = FX_DECL + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + FX_CODE);
  };
  m.customProgramCacheKey = () => 'sh3d-' + key;
  return m;
}

// ---------------------------------------------------------------- procedural textures
let tseed = 1;
const tr = () => { tseed = (tseed * 16807) % 2147483647; return (tseed - 1) / 2147483646; };
function cnv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
// tileable value noise, drawn as a layer
function vnoise(g, n, cells, alpha, lo, hi) {
  const [c, x] = cnv(cells + 1);
  const im = x.createImageData(cells + 1, cells + 1), v = [];
  for (let i = 0; i < cells * cells; i++) v.push(tr());
  for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
    const t = v[(i % cells) + (j % cells) * cells], o = (i + j * (cells + 1)) * 4;
    im.data[o] = lerp(lo[0], hi[0], t); im.data[o + 1] = lerp(lo[1], hi[1], t); im.data[o + 2] = lerp(lo[2], hi[2], t); im.data[o + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  g.save(); g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const cp = n / cells; g.drawImage(c, -cp / 2, -cp / 2, (cells + 1) * cp, (cells + 1) * cp); g.restore();
}
// draw something that wraps across the tile edges
function wrapd(n, x, y, r, fn) { for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { if (x + ox < -r || x + ox > n + r || y + oy < -r || y + oy > n + r) continue; fn(x + ox, y + oy); } }
function grain(g, n, amt) {
  const im = g.getImageData(0, 0, n, n), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const k = (tr() - 0.5) * amt; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
  g.putImageData(im, 0, 0);
}
const TEXC = {};
function mkTex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = MAX_ANISO; t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.noflip) t.flipY = false;
  return t;
}
const TEXGEN = {
  grass() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#4f7c38'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 6, 0.55, [56, 92, 40], [104, 140, 64]); vnoise(g, n, 24, 0.35, [50, 84, 36], [110, 146, 70]);
    for (let i = 0; i < 9000; i++) { const x = tr() * n, y = tr() * n, l = 3 + tr() * 7, a = -Math.PI / 2 + (tr() - 0.5) * 1.2, k = tr();
      g.strokeStyle = k < 0.5 ? rgb(60 + tr() * 30, 100 + tr() * 40, 36 + tr() * 20, 0.8) : rgb(110 + tr() * 50, 150 + tr() * 40, 60 + tr() * 30, 0.7); g.lineWidth = 1 + tr() * 1.2;
      wrapd(n, x, y, 12, (px, py) => { g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); }); }
    grain(g, n, 14); return mkTex(c); },
  dirt() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#8c7052'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 5, 0.6, [110, 86, 60], [170, 140, 104]); vnoise(g, n, 20, 0.4, [100, 78, 54], [160, 132, 98]); vnoise(g, n, 64, 0.25, [90, 70, 50], [170, 145, 110]);
    for (let i = 0; i < 700; i++) { const x = tr() * n, y = tr() * n, r = 1 + tr() * tr() * 6, v = 90 + tr() * 90;
      wrapd(n, x, y, r + 2, (px, py) => { g.fillStyle = rgb(v * 0.55, v * 0.5, v * 0.45, 0.7); g.beginPath(); g.ellipse(px + 1, py + 1.5, r, r * 0.75, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(v, v * 0.92, v * 0.82); g.beginPath(); g.ellipse(px, py, r, r * 0.75, 0, 0, TAU); g.fill(); }); }
    grain(g, n, 18); return mkTex(c); },
  sand() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#cdb88e'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 6, 0.5, [180, 160, 120], [222, 206, 168]); vnoise(g, n, 32, 0.3, [176, 156, 118], [226, 212, 176]);
    for (let i = 0; i < 2500; i++) { const v = 120 + tr() * 120; g.fillStyle = rgb(v, v * 0.9, v * 0.75, 0.6); g.fillRect(tr() * n, tr() * n, 1.5, 1.5); }
    grain(g, n, 20); return mkTex(c); },
  cobble() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#6a625a'; g.fillRect(0, 0, n, n);
    const k = 8, cs = n / k;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const x = (i + 0.5 + (j % 2) * 0.5) * cs + (tr() - 0.5) * cs * 0.22, y = (j + 0.5) * cs + (tr() - 0.5) * cs * 0.2;
      const rx = cs * (0.46 + tr() * 0.1), ry = cs * (0.42 + tr() * 0.1), v = 128 + tr() * 50, w = tr() * 12;
      wrapd(n, x, y, cs, (px, py) => {
        const gr = g.createRadialGradient(px - rx * 0.3, py - ry * 0.35, 1, px, py, rx * 1.1);
        gr.addColorStop(0, rgb(v + 22, v + 20 - w, v + 14 - w)); gr.addColorStop(0.75, rgb(v, v - 4 - w, v - 10 - w)); gr.addColorStop(1, rgb(v * 0.7, v * 0.67, v * 0.64));
        g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, rx, ry, (tr() - 0.5) * 0.4, 0, TAU); g.fill(); }); }
    vnoise(g, n, 32, 0.18, [60, 60, 60], [200, 200, 200]); grain(g, n, 16); return mkTex(c); },
  planks() { const n = 512, [c, g] = cnv(n); const rows = 6, rh = n / rows;
    for (let r = 0; r < rows; r++) {
      const v = 0.8 + tr() * 0.3, y0 = r * rh;
      g.fillStyle = rgb(150 * v, 112 * v, 74 * v); g.fillRect(0, y0, n, rh);
      for (let i = 0; i < 40; i++) { const y = y0 + tr() * rh, a = 0.08 + tr() * 0.12; g.strokeStyle = tr() < 0.5 ? `rgba(60,36,18,${a})` : `rgba(210,170,120,${a})`; g.lineWidth = 0.6 + tr() * 1.6;
        g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= n; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 1.6); g.stroke(); }
      if (tr() < 0.6) { const kx = tr() * n, ky = y0 + rh * (0.3 + tr() * 0.4); g.fillStyle = 'rgba(70,40,20,.55)'; g.beginPath(); g.ellipse(kx, ky, 6 + tr() * 5, 3 + tr() * 2, 0, 0, TAU); g.fill(); }
      const sx = tr() * n; g.fillStyle = 'rgba(30,18,10,.8)'; g.fillRect(sx, y0, 2, rh);
      g.fillStyle = 'rgba(25,15,8,.85)'; g.fillRect(0, y0, n, 2.5); g.fillStyle = 'rgba(255,230,190,.15)'; g.fillRect(0, y0 + 2.5, n, 1.5);
    }
    grain(g, n, 12); return mkTex(c); },
  bark() { const n = 256, [c, g] = cnv(n); g.fillStyle = '#8a705a'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 8, 0.5, [110, 90, 70], [170, 146, 120]);
    for (let i = 0; i < 260; i++) { const x = tr() * n, w = 1 + tr() * 4, v = tr(); g.strokeStyle = v < 0.6 ? `rgba(50,36,24,${0.3 + tr() * 0.35})` : `rgba(200,180,150,${0.2 + tr() * 0.3})`; g.lineWidth = w;
      g.beginPath(); for (let y = -10; y <= n + 10; y += 16) { const px = x + Math.sin(y * 0.05 + i) * 4; y < 0 ? g.moveTo(px, y) : g.lineTo(px, y); } g.stroke(); }
    grain(g, n, 20); return mkTex(c); },
  shingle() { const n = 512, [c, g] = cnv(n); const rows = 8, rh = n / rows, cw = n / 8;
    g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, n, n);
    for (let r = rows - 1; r >= -1; r--) for (let i = -1; i <= 8; i++) {
      const x = i * cw + (r % 2) * cw / 2, y = r * rh, v = 150 + tr() * 70;
      const gr = g.createLinearGradient(0, y, 0, y + rh * 1.1); gr.addColorStop(0, rgb(v * 0.7, v * 0.7, v * 0.7)); gr.addColorStop(0.85, rgb(v, v, v)); gr.addColorStop(1, rgb(v * 0.45, v * 0.45, v * 0.45));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + 1.5, y); g.lineTo(x + cw - 1.5, y); g.lineTo(x + cw - 1.5, y + rh * 0.8); g.quadraticCurveTo(x + cw - 1.5, y + rh * 1.1, x + cw / 2, y + rh * 1.12); g.quadraticCurveTo(x + 1.5, y + rh * 1.1, x + 1.5, y + rh * 0.8); g.closePath(); g.fill();
    }
    vnoise(g, n, 16, 0.2, [40, 40, 40], [230, 230, 230]); grain(g, n, 16); return mkTex(c); },
  plaster() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#e8e3da'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 4, 0.35, [196, 188, 176], [246, 242, 236]); vnoise(g, n, 16, 0.25, [200, 194, 184], [250, 248, 244]); vnoise(g, n, 64, 0.15, [180, 176, 170], [255, 255, 255]);
    g.strokeStyle = 'rgba(90,80,70,.25)'; g.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) { let x = tr() * n, y = tr() * n; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (tr() - 0.5) * 30; y += tr() * 18; g.lineTo(x, y); } g.stroke(); }
    const gr = g.createLinearGradient(0, n * 0.75, 0, n); gr.addColorStop(0, 'rgba(110,100,80,0)'); gr.addColorStop(1, 'rgba(110,100,80,.25)'); g.fillStyle = gr; g.fillRect(0, 0, n, n);
    grain(g, n, 10); return mkTex(c); },
  brick() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#3c3832'; g.fillRect(0, 0, n, n);
    const rows = 8, rh = n / rows;
    for (let r = 0; r < rows; r++) { let x = (r % 2) * -40 - tr() * 30; while (x < n) { const w = 70 + tr() * 60, v = 110 + tr() * 70, t = tr() * 20;
      const draw = px => { const gr = g.createLinearGradient(0, r * rh, 0, r * rh + rh); gr.addColorStop(0, rgb(v + 25, v + 20 - t, v + 12 - t)); gr.addColorStop(1, rgb(v * 0.75, v * 0.72 - t, v * 0.68 - t));
        g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(px + 3, r * rh + 3, w - 6, rh - 6, 6) : g.rect(px + 3, r * rh + 3, w - 6, rh - 6); g.fill(); };
      draw(x); if (x + w > n) draw(x - n); if (x < 0) draw(x + n); x += w; } }
    vnoise(g, n, 8, 0.3, [40, 40, 40], [210, 210, 210]); vnoise(g, n, 48, 0.2, [60, 60, 60], [220, 220, 220]); grain(g, n, 22); return mkTex(c); },
  flag() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#26221d'; g.fillRect(0, 0, n, n);
    const k = 4, cs = n / k;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) { const v = 100 + tr() * 60, x = i * cs + 4, y = j * cs + 4, w = cs - 8, h = cs - 8;
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, rgb(v + 20, v + 14, v + 4)); gr.addColorStop(1, rgb(v * 0.8, v * 0.74, v * 0.66));
      g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 10) : g.rect(x, y, w, h); g.fill();
      g.strokeStyle = 'rgba(20,16,12,.5)'; g.lineWidth = 1.2; g.beginPath(); let cx = x + tr() * w, cy = y; g.moveTo(cx, cy); for (let s = 0; s < 5; s++) { cx += (tr() - 0.5) * 30; cy += h / 5; g.lineTo(cx, cy); } if (tr() < 0.5) g.stroke(); }
    vnoise(g, n, 8, 0.35, [50, 46, 40], [200, 196, 186]); vnoise(g, n, 40, 0.2, [60, 60, 60], [220, 220, 220]); grain(g, n, 20); return mkTex(c); },
  leaves() { const n = 256, [c, g] = cnv(n); g.fillStyle = '#3d6a2c'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 6, 0.5, [40, 72, 30], [90, 130, 56]);
    for (let i = 0; i < 1400; i++) { const x = tr() * n, y = tr() * n, r = 3 + tr() * 5, a = tr() * TAU, v = tr();
      wrapd(n, x, y, r, (px, py) => { g.fillStyle = v < 0.5 ? rgb(34 + tr() * 20, 64 + tr() * 30, 24 + tr() * 14, 0.8) : rgb(80 + tr() * 50, 120 + tr() * 50, 44 + tr() * 30, 0.75);
        g.beginPath(); g.ellipse(px, py, r, r * 0.5, a, 0, TAU); g.fill(); }); }
    grain(g, n, 16); return mkTex(c); },
  stone() { const n = 256, [c, g] = cnv(n); g.fillStyle = '#c8c6c0'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 4, 0.5, [170, 168, 162], [232, 230, 224]); vnoise(g, n, 16, 0.35, [160, 158, 154], [240, 238, 234]); vnoise(g, n, 64, 0.25, [150, 150, 150], [250, 250, 250]);
    for (let i = 0; i < 40; i++) { const x = tr() * n, y = tr() * n, r = 4 + tr() * 14; wrapd(n, x, y, r, (px, py) => { g.fillStyle = tr() < 0.5 ? 'rgba(70,80,50,.18)' : 'rgba(40,38,36,.16)'; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); }); }
    for (let i = 0; i < 30; i++) { const x = tr() * n; g.strokeStyle = 'rgba(40,38,36,.12)'; g.lineWidth = 2 + tr() * 4; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (tr() - 0.5) * 20, n); g.stroke(); }
    grain(g, n, 26); return mkTex(c); },
  concrete() { const n = 512, [c, g] = cnv(n); g.fillStyle = '#5a5e64'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 4, 0.4, [70, 74, 80], [120, 124, 130]); vnoise(g, n, 24, 0.3, [60, 64, 70], [140, 144, 150]);
    g.fillStyle = 'rgba(20,22,26,.6)'; g.fillRect(0, 0, n, 3); g.fillRect(0, 0, 3, n);
    for (let i = 0; i < 14; i++) { const x = tr() * n; const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, 'rgba(20,24,30,.25)'); gr.addColorStop(1, 'rgba(20,24,30,0)'); g.fillStyle = gr; g.fillRect(x, 0, 4 + tr() * 10, n * (0.3 + tr() * 0.6)); }
    grain(g, n, 22); return mkTex(c); },
  // people: cloth (uv 0-.5, .5-1), skin (.5-1, .5-1), hair (0-.5, 0-.5), twill (.5-1, 0-.5)
  atlas() { const n = 512, h = 256, [c, g] = cnv(n);
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, h, h); vnoise(g, h, 8, 0.25, [190, 190, 190], [240, 240, 240]);
    for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, y, h, 1); }
    for (let x = 0; x < h; x += 3) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, 0, 1, h); }
    g.save(); g.translate(h, 0); g.fillStyle = '#f6f3f0'; g.fillRect(0, 0, h, h); vnoise(g, h, 6, 0.25, [232, 222, 218], [255, 252, 250]); g.restore();
    g.save(); g.translate(0, h); g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, h, h);
    for (let i = 0; i < 900; i++) { const x = tr() * h; g.strokeStyle = tr() < 0.5 ? 'rgba(40,40,40,.25)' : 'rgba(255,255,255,.25)'; g.lineWidth = 1 + tr() * 1.5; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.6, x + (tr() - 0.5) * 10, h); g.stroke(); }
    g.restore();
    g.save(); g.translate(h, h); g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, h, h);
    for (let i = -h; i < h * 2; i += 4) { g.strokeStyle = 'rgba(0,0,0,.09)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
    vnoise(g, h, 8, 0.2, [180, 180, 180], [240, 240, 240]); g.restore();
    grain(g, n, 8); return mkTex(c); },
  waterN() { const n = 256, [c, g] = cnv(n); const im = g.createImageData(n, n);
    const H = (x, y) => { let v = 0; for (const [a, b, p, s] of [[1, 2, 0.3, 1], [3, -1, 1.7, 0.6], [-2, 5, 2.4, 0.35], [6, 3, 0.9, 0.25], [-7, -4, 4.1, 0.2], [11, -6, 1.1, 0.12]]) v += Math.sin((a * x + b * y) * TAU / n + p) * s; return v; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1); let nx = -dx * 3, ny = -dy * 3, nz = 1; const l = Math.hypot(nx, ny, nz); const o = (x + y * n) * 4;
      im.data[o] = (nx / l * 0.5 + 0.5) * 255; im.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; im.data[o + 2] = (nz / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255; }
    g.putImageData(im, 0, 0); return mkTex(c, { linear: true }); },
  noise() { const n = 256, [c, g] = cnv(n); g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
    vnoise(g, n, 4, 0.6, [0, 0, 0], [255, 255, 255]); vnoise(g, n, 12, 0.4, [0, 0, 0], [255, 255, 255]); vnoise(g, n, 40, 0.25, [0, 0, 0], [255, 255, 255]);
    return mkTex(c, { linear: true }); },
  glow() { const n = 128, [c, g] = cnv(n); const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n); return mkTex(c, { clamp: true }); },
  blob() { const n = 128, [c, g] = cnv(n); const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.7)'); gr.addColorStop(0.5, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n); return mkTex(c, { clamp: true }); },
  flame() { const n = 64, w = 64, h = 128, [c, g] = cnv(w, h); const gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.62, h * 0.5);
    gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.25, 'rgba(255,200,90,.9)'); gr.addColorStop(0.6, 'rgba(255,110,20,.35)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 4); g.bezierCurveTo(w * 0.95, h * 0.55, w * 0.9, h * 0.95, w / 2, h - 4); g.bezierCurveTo(w * 0.1, h * 0.95, w * 0.05, h * 0.55, w / 2, 4); g.fill();
    return mkTex(c, { clamp: true }); },
  eye() { const n = 128, [c, g] = cnv(n); g.fillStyle = '#ece4cf'; g.fillRect(0, 0, n, n);
    g.strokeStyle = 'rgba(170,30,30,.6)'; for (let i = 0; i < 40; i++) { g.lineWidth = 0.6 + tr(); let x = tr() * n, y = tr() < 0.5 ? 0 : n; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (tr() - 0.5) * 16; y += (y < n / 2 ? 1 : -1) * 6; g.lineTo(x, y); } g.stroke(); }
    return mkTex(c); },
};
function tex(name) { if (!TEXC[name]) { tseed = 1 + name.length * 977 + name.charCodeAt(0) * 31; TEXC[name] = TEXGEN[name](); } return TEXC[name]; }

// ---------------------------------------------------------------- materials
const MC = new Map();
function mat(col, o = {}) {
  const key = col + '|' + (o.basic ? 1 : 0) + '|' + (o.op || 1) + '|' + (o.vc ? 1 : 0) + '|' + (o.side || 0) + '|' + (o.tex || '') + '|' + (o.emis || '') + '|' + (o.shiny || 0) + '|' + (o.add ? 1 : 0);
  if (MC.has(key) && !o.unique) return MC.get(key);
  const p = { color: new THREE.Color(col) };
  if (o.op && o.op < 1) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
  if (o.add) { p.transparent = true; p.blending = THREE.AdditiveBlending; p.depthWrite = false; }
  if (o.vc) { p.vertexColors = true; p.color = new THREE.Color(0xffffff); }
  if (o.side) p.side = THREE.DoubleSide;
  if (o.tex) p.map = tex(o.tex);
  let m;
  if (o.basic) m = new THREE.MeshBasicMaterial(p);
  else if (o.shiny) { p.shininess = o.shiny; p.specular = new THREE.Color(o.spec || 0x444444); if (o.emis) p.emissive = new THREE.Color(o.emis); m = new THREE.MeshPhongMaterial(p); }
  else { if (o.emis) p.emissive = new THREE.Color(o.emis); m = new THREE.MeshLambertMaterial(p); }
  patch(m, o.basic ? 'b' : o.shiny ? 'p' : 'l');
  if (!o.unique) MC.set(key, m);
  return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a3a2a, 1.1);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
const SUN_DIR = new THREE.Vector3(-0.42, 0.78, 0.46).normalize();
sun.position.copy(SUN_DIR).multiplyScalar(60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
{ const sc = sun.shadow.camera; sc.left = -19; sc.right = 19; sc.top = 19; sc.bottom = -19; sc.near = 5; sc.far = 130; }
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.055; sun.shadow.radius = 2.2;
scene.add(hemi, sun, sun.target);
// one movable point light for lamps and torches near the player (constant light count = no recompiles)
const lampLight = new THREE.PointLight(0xffc070, 0, 11, 1.6);
scene.add(lampLight);
scene.fog = new THREE.FogExp2(0x8fb8d8, 0.016);
scene.background = new THREE.Color(0x8fb8d8);
// sky dome
const skyU = { uTop: { value: new THREE.Color(0x3a76c0) }, uHor: { value: new THREE.Color(0x9cc6e2) }, uSun: { value: SUN_DIR.clone() }, uSunCol: { value: new THREE.Color(0xfff0d0) },
  uSunAmt: { value: 1 }, uCloud: { value: 1 }, tNoise: { value: null }, uTime: U.uTime, uDrain: U.uDrain, uGlitch: U.uGlitch, uTint: U.uTint };
const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: FX_DECL + `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uSunAmt; uniform float uCloud; uniform sampler2D tNoise; varying vec3 vDir;
  void main(){ vec3 d = normalize(vDir); float h = d.y;
    vec3 col = mix(uHor, uTop, pow(smoothstep(-0.02, 0.75, h), 0.7));
    col = mix(col, uHor * 0.85, smoothstep(0.0, -0.2, h));
    if (h > 0.0 && uCloud > 0.0) { vec2 cp = d.xz / (h + 0.12) * 0.22; float n = texture2D(tNoise, cp + vec2(uTime * 0.004, 0.0)).r * 0.65 + texture2D(tNoise, cp * 2.7 - vec2(uTime * 0.006, 0.0)).r * 0.35;
      float cl = smoothstep(0.52, 0.78, n) * smoothstep(0.0, 0.25, h) * uCloud; col = mix(col, mix(uHor, vec3(1.0), 0.75) * (0.85 + 0.25 * n), cl * 0.75); }
    float s = max(dot(d, uSun), 0.0);
    col += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12) * uSunAmt;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    ` + FX_CODE + '}',
}));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ---------------------------------------------------------------- resolution + adaptive quality
const QL = [{ pr: 0.75, sh: 0 }, { pr: 1.0, sh: 1024 }, { pr: 1.25, sh: 1024 }, { pr: 1.5, sh: 2048 }, { pr: 1.75, sh: 2048 }, { pr: 2.0, sh: 2048 }];
const DPR = window.devicePixelRatio || 1;
let qMax = DPR >= 2 ? 4 : DPR >= 1.5 ? 3 : 2;   // 1.75 on phones, 1.5 / 1.25 on low-dpr screens
let qLevel = Math.min(qMax, 3);
const qLock = QS.has('q') ? clamp(parseInt(QS.get('q'), 10) || 0, 0, QL.length - 1) : -1;
if (qLock >= 0) { qLevel = qLock; qMax = qLock; }
let qAcc = 0, qN = 0, qCool = 2, qGood = 0;
let VIEW_W = 640, VIEW_H = 300;
function applyQuality() {
  const q = QL[qLevel];
  renderer.setPixelRatio(Math.min(q.pr, Math.max(1, DPR)));
  const want = q.sh > 0;
  if (sun.castShadow !== want) sun.castShadow = want;
  if (want && sun.shadow.mapSize.x !== q.sh) { sun.shadow.mapSize.set(q.sh, q.sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  resize();
}
function qualityTick(rawDt) {
  if (qLock >= 0 || mode !== 'play' || rawDt > 0.25) return;
  qCool -= rawDt; qAcc += rawDt; qN++;
  if (qN < 60) return;
  const avg = qAcc / qN * 1000; qAcc = 0; qN = 0;
  if (qCool > 0) return;
  if (avg > 23 && qLevel > 0) { qLevel--; qGood = 0; qCool = 2.5; applyQuality(); }
  else if (avg < 17.5 && qLevel < qMax) { if (++qGood >= 6) { qLevel++; qGood = 0; qCool = 4; applyQuality(); } }
  else qGood = 0;
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  VIEW_W = Math.round(w * renderer.getPixelRatio()); VIEW_H = Math.round(h * renderer.getPixelRatio());
  cam.aspect = w / h; cam.fov = w < h ? 76 : 60; cam.updateProjectionMatrix();
}
addEventListener('resize', resize);
skyU.tNoise.value = tex('noise');
applyQuality();

// ---------------------------------------------------------------- build helpers
let G = null;          // group being built
let A = null;          // area being built / active area
function add(m) { G.add(m); return m; }
function addCol(x, z, w, d, o = {}) { const c = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, low: !!o.low, off: false, tag: o.tag }; A.cols.push(c); return c; }
// box geometry whose UVs are in world metres / ts, so textures keep their scale on any size
function boxGeo(w, h, d, ts) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ts) { const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / ts, uv.getY(i) * dims[f][1] / ts); } }
  return g;
}
function shadowFlags(m, o) { m.castShadow = !o.basic && !o.noCast && !(o.op && o.op < 1); m.receiveShadow = !o.basic; }
function box(w, h, d, col, x, y, z, o = {}) {
  const m = new THREE.Mesh(o.tex ? boxGeo(w, h, d, o.ts || 2) : boxGeo(w, h, d, 0), o.mat || mat(col, o));
  m.position.set(x, y + h / 2, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  if (o.dyn) m.userData.dyn = true;
  shadowFlags(m, o);
  add(m);
  if (o.col) { const swap = o.ry && Math.abs(Math.sin(o.ry)) > 0.7; m.userData.col = addCol(x, z, swap ? d : w, swap ? w : d, o); }
  return m;
}
function cylGeo(rt, rb, h, seg, ts, open) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open);
  if (ts) { const uv = g.attributes.uv, circ = Math.PI * (rt + rb); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / ts, uv.getY(i) * h / ts); }
  return g;
}
function cyl(rt, rb, h, seg, col, x, y, z, o = {}) {
  const m = new THREE.Mesh(cylGeo(rt, rb, h, Math.max(seg, o.tex ? 10 : 8), o.tex ? (o.ts || 1) : 0), o.mat || mat(col, o));
  m.position.set(x, y + h / 2, z); shadowFlags(m, o); add(m);
  if (o.col) A.circ.push({ x, z, r: Math.max(rt, rb) * (o.colR || 1), low: !!o.low });
  return m;
}
function glowSprite(col, size, op = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('glow'), color: new THREE.Color(col), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  s.scale.setScalar(size); return s;
}
// a gable roof, wall triangles, trim, glowing windows, a door and a chimney
function gableGeo(d, rh, ts) {
  const g = new THREE.BufferGeometry();
  const p = [0, 0, d / 2, 0, 0, -d / 2, 0, rh, 0], uv = [d / 2 / ts, 0, -d / 2 / ts, 0, 0, rh / ts];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
  return g;
}
function house(x, z, w, d, wall, roof, o = {}) {
  const h = o.h || 3.2, ry = o.face || 0, rh = o.roofH || 2.0;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.userData.static = true; G.add(g);
  const prev = G; G = g;
  const wallM = mat(wall, { tex: 'plaster' }), wood = '#5a3e2a';
  box(w, h, d, wall, 0, 0, 0, { mat: wallM, tex: 'plaster', ts: 2.5 });
  box(w + 0.3, 0.45, d + 0.3, '#8a8378', 0, -0.15, 0, { tex: 'brick', ts: 1.6 });
  // timber frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.2, h, 0.2, wood, sx * (w / 2 + 0.02), 0, sz * (d / 2 + 0.02), { tex: 'planks', ts: 1.5 });
  box(w + 0.1, 0.2, 0.18, wood, 0, h - 0.2, d / 2 + 0.045, { tex: 'planks', ts: 1.5 }); box(w + 0.1, 0.2, 0.18, wood, 0, h - 0.2, -d / 2 - 0.045, { tex: 'planks', ts: 1.5 });
  box(0.18, 0.2, d + 0.1, wood, w / 2 + 0.045, h - 0.2, 0, { tex: 'planks', ts: 1.5 }); box(0.18, 0.2, d + 0.1, wood, -w / 2 - 0.045, h - 0.2, 0, { tex: 'planks', ts: 1.5 });
  box(w + 0.06, 0.14, 0.14, wood, 0, 2.35, d / 2 + 0.03, { tex: 'planks', ts: 1.5 });
  // roof: two slabs over a ridge running along x
  const ov = 0.45, half = d / 2 + ov, ang = Math.atan2(rh, d / 2), slope = half / Math.cos(ang);
  const yr = h + rh, roofM = mat(roof, { tex: 'shingle' });
  for (const sz of [-1, 1]) {
    const m = new THREE.Mesh(boxGeo(w + 0.9, 0.14, slope, 1.3), roofM);
    m.position.set(0, yr - Math.sin(ang) * slope / 2 + 0.07, sz * Math.cos(ang) * slope / 2); m.rotation.x = sz * ang; m.castShadow = m.receiveShadow = true; g.add(m);
  }
  { const m = new THREE.Mesh(cylGeo(0.11, 0.11, w + 0.95, 8, 1), mat('#4a3a30', { tex: 'bark' })); m.rotation.z = Math.PI / 2; m.position.set(0, yr + 0.08, 0); m.castShadow = true; g.add(m); }
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(gableGeo(d, rh, 2.5), wallM); m.position.set(sx * w / 2, h, 0); if (sx < 0) m.rotation.y = Math.PI; m.castShadow = m.receiveShadow = true; g.add(m); }
  // door
  const dz = d / 2 + 0.03;
  box(1.35, 2.3, 0.16, wood, 0, 0, dz, { tex: 'planks', ts: 1.2 });
  box(1.05, 2.05, 0.14, o.door || '#4a2e18', 0, 0, dz + 0.05, { tex: 'planks', ts: 1.0 });
  { const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#c9a24a', { shiny: 60, spec: 0x886633 })); k.position.set(0.36, 1.0, dz + 0.15); g.add(k); }
  box(1.6, 0.18, 0.7, '#7d7770', 0, -0.05, dz + 0.4, { tex: 'stone', ts: 1.2 });
  // windows (front two + one on each side)
  const winM = mat(o.win || '#2a2a33', { basic: o.winBasic });
  const wins = [];
  const wspots = [[-w * 0.3, dz, 0], [w * 0.3, dz, 0], [w / 2 + 0.03, 0, Math.PI / 2], [-w / 2 - 0.03, 0, -Math.PI / 2]];
  for (const [wx, wz, wr] of wspots) {
    const wg = new THREE.Group(); wg.position.set(wx, 0, wz); wg.rotation.y = wr; g.add(wg); wg.userData.static = true;
    G = wg;
    for (const [fw, fh, fx, fy] of [[1.0, 0.1, 0, 1.2], [1.0, 0.1, 0, 2.1], [0.1, 0.8, -0.45, 1.3], [0.1, 0.8, 0.45, 1.3]]) box(fw, fh, 0.14, wood, fx, fy, 0.04, { tex: 'planks', ts: 1.2 });
    const glass = box(0.8, 0.8, 0.06, o.win || '#2a2a33', 0, 1.3, 0.0, { mat: winM, basic: o.winBasic, dyn: o.winDyn });
    if (!o.winBasic) glass.material = mat(o.win || '#2a2a33', { shiny: 90, spec: 0x99aabb });
    box(0.06, 0.8, 0.05, wood, 0, 1.3, 0.05); box(0.8, 0.06, 0.05, wood, 0, 1.67, 0.05);
    box(1.15, 0.08, 0.24, wood, 0, 1.18, 0.1, { tex: 'planks', ts: 1.2 });
    wins.push(glass);
    G = g;
  }
  if (o.chimney) { box(0.7, 2.4, 0.7, '#7a6a60', w * 0.27, h + 0.3, -d * 0.18, { tex: 'brick', ts: 1.2 }); box(0.86, 0.14, 0.86, '#5a4e46', w * 0.27, h + 2.7, -d * 0.18, { tex: 'brick', ts: 1.2 }); }
  G = prev;
  const swap = Math.abs(Math.sin(ry)) > 0.7;
  addCol(x, z, (swap ? d : w) + 0.2, (swap ? w : d) + 0.2);
  return { g, wins };
}
function sign(x, z, text, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, A.height ? A.height(x, z) : 0, z); g.rotation.y = ry; g.userData.static = true; G.add(g);
  const prev = G; G = g;
  cyl(0.07, 0.08, 1.15, 8, '#5a3e24', 0, -0.05, 0, { tex: 'bark', ts: 0.8 });
  box(1.25, 0.66, 0.08, '#9a7a52', 0, 0.82, 0.07, { tex: 'planks', ts: 0.9 });
  box(1.35, 0.08, 0.12, '#5a3e24', 0, 1.48, 0.07, { tex: 'planks', ts: 0.9 });
  box(1.35, 0.08, 0.12, '#5a3e24', 0, 0.78, 0.07, { tex: 'planks', ts: 0.9 });
  for (let i = 0; i < 3; i++) box(0.6 + (i % 2) * 0.3, 0.04, 0.02, '#2a1a10', -0.05, 0.97 + i * 0.15, 0.115);
  G = prev;
  A.circ.push({ x, z, r: 0.35, low: true });
  A.inter.push({ x, z, r: 1.8, label: 'Read', fn: () => say(typeof text === 'function' ? text() : text) });
  return g;
}
// smooth displaced blob (foliage, rocks); radial normals keep the shading soft
function blobGeo(r, detail, amp, sy, seedv) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, nrm = new Float32Array(p.count * 3);
  const k = seedv * 1.7;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const l = Math.hypot(x, y, z), nx = x / l, ny = y / l, nz = z / l;
    const n = Math.sin(nx * 5.1 + k) * Math.cos(ny * 4.3 + k * 2) * 0.5 + Math.sin(nz * 6.7 - k) * Math.sin(nx * 3.1 + ny * 2.3) * 0.5;
    const rr = r * (1 + n * amp);
    p.setXYZ(i, nx * rr, ny * rr * sy, nz * rr);
    nrm[i * 3] = nx; nrm[i * 3 + 1] = ny; nrm[i * 3 + 2] = nz;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}
function mergeGeos(list) {
  // list of [geometry, matrix4|null, colorHex|null]; output non-indexed position/normal/uv(/color)
  let n = 0; const parts = [];
  for (const [g0, m4, col] of list) { let g = g0.index ? g0.toNonIndexed() : g0.clone(); if (m4) g.applyMatrix4(m4); parts.push([g, col]); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), colA = list.some(l => l[2]) ? new Float32Array(n * 3) : null;
  let o = 0; const c = new THREE.Color();
  for (const [g, col] of parts) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (colA) { c.set(col || '#ffffff'); for (let i = 0; i < cnt; i++) { colA[(o + i) * 3] = c.r; colA[(o + i) * 3 + 1] = c.g; colA[(o + i) * 3 + 2] = c.b; } }
    o += cnt; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (colA) out.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  return out;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// instanced placement, split into cells so the frustum (and the near-player filter) can skip whole chunks
function instCells(geo, material, pts, cell, o = {}) {
  const cells = new Map();
  for (const t of pts) { const k = Math.floor(t.x / cell) + ',' + Math.floor(t.z / cell); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(t); }
  const out = [];
  for (const list of cells.values()) {
    const im = new THREE.InstancedMesh(geo, material, list.length);
    let cx = 0, cz = 0; const col = new THREE.Color();
    list.forEach((t, i) => {
      _e.set(t.rx || 0, t.ry || 0, t.rz || 0); _q.setFromEuler(_e); _s.set(t.sx || t.s || 1, t.sy || t.s || 1, t.sz || t.s || 1); _p.set(t.x, t.y || 0, t.z);
      _m4.compose(_p, _q, _s); im.setMatrixAt(i, _m4);
      if (t.c != null) { col.setRGB(t.c[0], t.c[1], t.c[2]); im.setColorAt(i, col); }
      cx += t.x; cz += t.z;
    });
    im.computeBoundingSphere();
    im.castShadow = !!o.cast; im.receiveShadow = o.recv !== false;
    im.userData.dyn = true; im.userData.cx = cx / list.length; im.userData.cz = cz / list.length;
    add(im); out.push(im);
    if (o.near) A.nearCells.push(im);
  }
  return out;
}
const WIND_V = sh => {
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 ip = instanceMatrix[3]; float sw = sin(uTime * 1.9 + ip.x * 0.37 + ip.z * 0.23) * 0.5 + sin(uTime * 3.1 + ip.x * 0.9) * 0.2; transformed.x += sw * 0.09 * position.y * 3.0; transformed.z += sw * 0.05 * position.y * 3.0; }`);
};
const FOLIAGE_V = sh => {
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 ip = instanceMatrix[3]; transformed.x += sin(uTime * 1.3 + ip.x * 0.2 + position.y) * 0.035 * position.y; }`);
};
function grassTuftGeo() {
  const pos = [], col = [], nor = [];
  const c0 = new THREE.Color('#5a8a3c'), c1 = new THREE.Color('#b4d27a');
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU + Math.random() * 0.5, r = 0.02 + Math.random() * 0.11, hgt = 0.12 + Math.random() * 0.12, lean = 0.05 + Math.random() * 0.08, w = 0.018;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, hgt, bz + Math.sin(a) * lean);
    col.push(c0.r, c0.g, c0.b, c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
function flowerGeo() {
  const list = [];
  const stem = new THREE.CylinderGeometry(0.008, 0.01, 0.22, 3, 1, true); list.push([stem, M4(0, 0.11, 0), '#4a7a30']);
  list.push([new THREE.CircleGeometry(0.06, 5), M4(0, 0.225, 0, -Math.PI / 2), '#ffffff']);
  list.push([new THREE.ConeGeometry(0.022, 0.02, 5), M4(0, 0.235, 0), '#f0c040']);
  return mergeGeos(list);
}
let SHARED = null;
function shared() {
  if (SHARED) return SHARED;
  const foliM = patch(new THREE.MeshLambertMaterial({ map: tex('leaves'), color: 0xffffff }), 'fol', FOLIAGE_V);
  const canopies = [0, 1, 2].map(v => {
    const list = []; const n = 3 + (v % 2);
    list.push([blobGeo(1.05, 1, 0.16, 0.85, v * 3 + 1), M4(0, 0, 0), null]);
    for (let i = 0; i < n; i++) { const a = i / n * TAU + v, rr = 0.6 + (i % 2) * 0.2; list.push([blobGeo(0.6 + (i % 3) * 0.1, 1, 0.2, 0.85, v * 7 + i), M4(Math.cos(a) * rr, -0.15 + (i % 2) * 0.45, Math.sin(a) * rr), null]); }
    list.push([blobGeo(0.6, 1, 0.18, 0.9, v + 11), M4(0.1, 0.7, -0.05), null]);
    const g = mergeGeos(list);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.6 + p.getZ(i) * 0.3, p.getY(i) * 0.6);
    return g;
  });
  const canLo = (() => { const g = mergeGeos([[blobGeo(1.1, 1, 0.18, 0.85, 5), M4(0, 0, 0), null], [blobGeo(0.7, 0, 0.1, 0.9, 6), M4(0.3, 0.6, 0.2), null]]); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.6 + p.getZ(i) * 0.3, p.getY(i) * 0.6); return g; })();
  const pine = (() => { const list = []; for (let i = 0; i < 4; i++) { const r = 1.25 - i * 0.26, y = 0.35 + i * 0.75; const cg = new THREE.ConeGeometry(r, 1.35, 10, 2); const p = cg.attributes.position; for (let k = 0; k < p.count; k++) { const a = Math.atan2(p.getZ(k), p.getX(k)); const s = 1 + Math.sin(a * 5 + i) * 0.08; p.setX(k, p.getX(k) * s); p.setZ(k, p.getZ(k) * s); } cg.computeVertexNormals(); list.push([cg, M4(0, y, 0), null]); }
    const g = mergeGeos(list); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, Math.atan2(p.getZ(i), p.getX(i)) * 0.6, p.getY(i) * 0.7); return g; })();
  const trunk = (() => { const g = cylGeo(0.13, 0.24, 1, 9, 0.9); g.translate(0, 0.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.01) { p.setX(i, p.getX(i) * 1.35); p.setZ(i, p.getZ(i) * 1.35); } g.computeVertexNormals(); return g; })();
  const deadTree = (() => { const list = [[cylGeo(0.12, 0.26, 3.2, 8, 0.9), M4(0, 1.6, 0), null]];
    for (let i = 0; i < 5; i++) { const a = i * 1.37, t = 0.25 + i * 0.12; list.push([cylGeo(0.025, 0.08, 1.6 - i * 0.12, 6, 0.9), M4(Math.cos(a) * 0.35, 2.2 + i * 0.25, Math.sin(a) * 0.35, Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8), null]); }
    return mergeGeos(list); })();
  const rock = [0, 1, 2].map(v => { const g = blobGeo(1, 1, 0.28, 0.6, v * 5 + 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + p.getZ(i) * 0.5, p.getY(i) + p.getZ(i) * 0.5); return g; });
  const grassM = patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'grass', WIND_V);
  const flowerM = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), 'flower', WIND_V);
  SHARED = { foliM, canopies, canLo, pine, trunk, deadTree, rock, trunkM: mat('#c8b49c', { tex: 'bark' }), deadM: mat('#a8988a', { tex: 'bark' }), rockM: mat('#9a968e', { tex: 'stone' }),
    tuft: grassTuftGeo(), flower: flowerGeo(), grassM, flowerM };
  return SHARED;
}
// trees: rounded broadleaf canopies + a few pines, instanced per cell
function forest(list, o = {}) {
  if (!list.length) return;
  const S_ = shared(), hf = A.height || (() => 0);
  if (o.dead) {
    instCells(S_.deadTree, S_.deadM, list.map(t => ({ x: t.x, z: t.z, y: hf(t.x, t.z) - 0.1, ry: t.r || 0, s: (t.h || 1) * 1.15 })), 60, { cast: true });
  } else {
    const trunks = [], cans = [[], [], []], pines = [];
    for (const t of list) {
      const h = t.h || 1, y = hf(t.x, t.z) - 0.05, kind = Math.floor((t.r || 0) * 10) % 5;
      const tint = [0.82 + ((t.r * 13) % 1) * 0.3, 0.86 + ((t.r * 7) % 1) * 0.24, 0.8 + ((t.r * 3) % 1) * 0.2];
      if (kind === 4) { trunks.push({ x: t.x, z: t.z, y, sx: h * 0.8, sy: h * 1.1, sz: h * 0.8 }); pines.push({ x: t.x, z: t.z, y: y + h * 0.9, ry: t.r, s: h * 1.25, c: [tint[0] * 0.8, tint[1] * 0.9, tint[2] * 0.85] }); }
      else { trunks.push({ x: t.x, z: t.z, y, sx: h, sy: h * 2.3, sz: h }); cans[kind % 3].push({ x: t.x, z: t.z, y: y + h * 3.05, ry: t.r * 2, sx: h * 1.45, sy: h * 1.35, sz: h * 1.45, c: tint }); }
    }
    instCells(S_.trunk, S_.trunkM, trunks, 40, { cast: !o.lo });
    cans.forEach((c, i) => { if (!c.length) return;
      const hi = instCells(o.lo ? S_.canLo : S_.canopies[i], S_.foliM, c, o.lo ? 70 : 40, { cast: !o.lo });
      if (!o.lo) { const lo = instCells(S_.canLo, S_.foliM, c, 40, { cast: true }); hi.forEach((h, k) => { A.lodCells.push([h, lo[k]]); lo[k].visible = false; }); } });
    if (pines.length) instCells(S_.pine, S_.foliM, pines, 40, { cast: !o.lo });
  }
  if (!o.noCol) for (const t of list) A.circ.push({ x: t.x, z: t.z, r: 0.45 });
}
function rocks(list, o = {}) {
  const S_ = shared(), hf = A.height || (() => 0), groups = [[], [], []];
  for (const r of list) { groups[r.v % 3].push({ x: r.x, z: r.z, y: hf(r.x, r.z) - r.s * 0.15, ry: r.ry, sx: r.s * 1.2, sy: r.s, sz: r.s, c: o.tint || null }); if (r.s > 0.35 && !o.noCol) A.circ.push({ x: r.x, z: r.z, r: r.s * 0.9, low: true }); }
  groups.forEach((g, i) => g.length && instCells(S_.rock[i], o.mat || S_.rockM, g, 70, { cast: true }));
}

// ---------------------------------------------------------------- terrain: one continuous mesh, textures blended by a painted splat map
function terrain(o) {
  const w = o.x1 - o.x0, d = o.z1 - o.z0, sx = Math.round(w / o.res), sz = Math.round(d / o.res);
  const geo = new THREE.PlaneGeometry(w, d, sx, sz); geo.rotateX(-Math.PI / 2); geo.translate(o.x0 + w / 2, 0, o.z0 + d / 2);
  const p = geo.attributes.position;
  if (o.h) for (let i = 0; i < p.count; i++) p.setY(i, o.h(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const SW = o.splatRes || 512, SH = Math.max(8, Math.round(SW * d / w));
  const [c, g] = cnv(SW, SH); g.fillStyle = '#000'; g.fillRect(0, 0, SW, SH);
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  const X = x => (x - o.x0) / w * SW, Z = z => (z - o.z0) / d * SH, K = SW / w;
  if (o.paint) o.paint(g, X, Z, K);
  const [c2, g2] = cnv(SW, SH); g2.filter = 'blur(' + (o.blur || 1.6) + 'px)'; g2.drawImage(c, 0, 0); g2.filter = 'none';
  const splat = mkTex(c2, { linear: true, clamp: true, noflip: true });
  const L = o.layers; // [base, r, g, b] as [texName, metres per tile, tint]
  const uni = { tA: { value: tex(L[0][0]) }, tB: { value: tex(L[1][0]) }, tC: { value: tex(L[2][0]) }, tD: { value: tex(L[3][0]) }, tSplat: { value: splat }, tNoise: { value: tex('noise') },
    uSc: { value: new THREE.Vector4(1 / L[0][1], 1 / L[1][1], 1 / L[2][1], 1 / L[3][1]) }, uBox: { value: new THREE.Vector4(o.x0, o.z0, w, d) },
    cA: { value: new THREE.Color(L[0][2] || '#ffffff') }, cB: { value: new THREE.Color(L[1][2] || '#ffffff') }, cC: { value: new THREE.Color(L[2][2] || '#ffffff') }, cD: { value: new THREE.Color(L[3][2] || '#ffffff') } };
  const m = patch(new THREE.MeshLambertMaterial({ color: 0xffffff }), 'terrain', sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = 'varying vec3 vTW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vTW;\nuniform sampler2D tA, tB, tC, tD, tSplat, tNoise;\nuniform vec4 uSc, uBox;\nuniform vec3 cA, cB, cC, cD;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec2 wuv = vTW.xz;
      float mac = texture2D(tNoise, wuv * 0.011).r;
      float det = texture2D(tNoise, wuv * 0.29).r - 0.5;
      vec3 base = mix(texture2D(tA, wuv * uSc.x).rgb, texture2D(tA, wuv * uSc.x * 0.31 + 0.37).rgb, 0.4) * cA * mix(0.8, 1.16, mac);
      vec3 sp = texture2D(tSplat, (wuv - uBox.xy) / uBox.zw).rgb;
      vec3 col = base;
      col = mix(col, texture2D(tB, wuv * uSc.y).rgb * cB, smoothstep(0.32, 0.68, sp.r + det * 0.55));
      col = mix(col, texture2D(tC, wuv * uSc.z).rgb * cC, smoothstep(0.32, 0.68, sp.g + det * 0.5));
      col = mix(col, texture2D(tD, wuv * uSc.w).rgb * cD, smoothstep(0.4, 0.6, sp.b + det * 0.25));
      diffuseColor.rgb *= col;`);
  });
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.userData.dyn = true; add(mesh);
  mesh.userData.splat = g2; mesh.userData.splatXZ = [X, Z];
  return mesh;
}
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// soft painted stroke on a splat canvas
function sStroke(g, X, Z, K, pts, wdt, ch) {
  g.strokeStyle = ch; g.lineWidth = wdt * K;
  g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke();
}
function sBlob(g, X, Z, K, x, z, rx, rz, ch) {
  g.fillStyle = ch; g.beginPath(); g.ellipse(X(x), Z(z), rx * K, rz * K, 0, 0, TAU); g.fill();
}

// ---------------------------------------------------------------- people: rounded bodies on a bone rig (one skinned mesh per person)
const PAL = {
  player: { h: '#1f9e8f', s: '#efc29c', c: '#b8332f', p: '#3d5694', b: '#4a3020', e: '#1d1510', hair: 'short', belt: '#3a2618', tunic: 1, collar: '#8a2420' },
  elder: { h: '#ececec', s: '#e6b994', c: '#6a4a8c', p: '#4a3466', b: '#2b1d10', e: '#151515', hair: 'elder', robe: 1, hunch: 0.16, belt: '#c9a24a' },
  kid: { h: '#7a4a22', s: '#f4cfa8', c: '#e8c23a', p: '#3a5aa0', b: '#3b2a1a', e: '#151515', hair: 'messy', kid: 1, short: 1 },
  shop: { h: '#2a2420', s: '#d6a07a', c: '#3f8f5a', p: '#3a3a3a', b: '#222222', e: '#151515', hair: 'short', apron: 1, short: 1, stache: 1 },
  fisher: { h: '#b9b9b9', s: '#d39f78', c: '#2f5f8f', p: '#3a3a3a', b: '#222222', e: '#151515', hair: 'short', hat: 1, beard: '#b9b9b9' },
  wren: { h: '#22303c', s: '#b9cbd6', c: '#7fb2d9', p: '#2e4a66', b: '#1d2a36', e: '#0b0f14', op: 0.82, hair: 'long' },
  statue: { h: '#c4c0b8', s: '#d0ccc4', c: '#c8c4bc', p: '#bcb8b0', b: '#aaa69e', e: '#2a2a2a', bell: 1, stone: 1, hair: 'short', kid: 1, tunic: 1 },
  shadow: { h: '#09090c', s: '#09090c', c: '#09090c', p: '#09090c', b: '#09090c', e: '#e8e8e8', op: 0.9, hair: 'short', dark: 1 },
  woman: { h: '#6a4a2a', s: '#e0b89a', c: '#8a6aa0', p: '#4a4a6a', b: '#333333', e: '#2a2018', hair: 'bun', skirt: 1 },
};
const REG = { cloth: [0, 0.5], skin: [0.5, 0.5], hair: [0, 0], twill: [0.5, 0] };
const PM = new Map();
function personMat(pal) {
  const op = pal.op || 1, key = (pal.stone ? 's' : 'a') + op;
  if (PM.has(key)) return PM.get(key);
  const p = { vertexColors: true, map: tex(pal.stone ? 'stone' : 'atlas') };
  if (op < 1) { p.transparent = true; p.opacity = op; }
  const m = patch(new THREE.MeshLambertMaterial(p), 'pv');
  PM.set(key, m); return m;
}
const _eyeG = (() => { const l = []; for (const sx of [-1, 1]) l.push([new THREE.SphereGeometry(0.0115, 12, 10), M4(sx * 0.039, 0.119, 0.1, 0, sx * 0.25, 0, 1, 1.05, 0.5), null]); return mergeGeos(l); })();
function person(pal, sc = 1) {
  const g = new THREE.Group();
  const bones = [], BI = {}, BW = {};
  const mkb = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); BI[name] = bones.length; bones.push(b);
    BW[name] = parent ? BW[parent.name].clone().add(b.position) : b.position.clone(); if (parent) parent.add(b); return b; };
  const hips = mkb('hips', null, 0, 0.92, 0), spine = mkb('spine', hips, 0, 0.07, 0), chest = mkb('chest', spine, 0, 0.2, 0);
  const neck = mkb('neck', chest, 0, 0.21, 0), head = mkb('head', neck, 0, 0.07, 0);
  const shL = mkb('shL', chest, 0.2, 0.15, 0), elL = mkb('elL', shL, 0, -0.28, 0), haL = mkb('haL', elL, 0, -0.25, 0);
  const shR = mkb('shR', chest, -0.2, 0.15, 0), elR = mkb('elR', shR, 0, -0.28, 0), haR = mkb('haR', elR, 0, -0.25, 0);
  const thL = mkb('thL', hips, 0.1, -0.05, 0), knL = mkb('knL', thL, 0, -0.42, 0), ftL = mkb('ftL', knL, 0, -0.39, 0);
  const thR = mkb('thR', hips, -0.1, -0.05, 0), knR = mkb('knR', thR, 0, -0.42, 0), ftR = mkb('ftR', knR, 0, -0.39, 0);
  shL.rotation.order = shR.rotation.order = 'YXZ';
  // geometry buffers
  const P = [], N = [], UV = [], C = [], SI = [], SW = [], IX = []; let nv = 0;
  const col = new THREE.Color();
  const put = (geo, bone, hex, reg, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
    const w = BW[bone];
    geo.applyMatrix4(M4(w.x + x, w.y + y, w.z + z, rx, ry, rz, sx, sy, sz));
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv, bi = BI[bone];
    col.set(hex); const r0 = REG[reg];
    for (let i = 0; i < p.count; i++) {
      P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i));
      const u = uv ? uv.getX(i) : 0, v = uv ? uv.getY(i) : 0;
      if (pal.stone) UV.push(u * 2 + x * 3, v * 2 + y * 3); else UV.push(r0[0] + 0.012 + u * 0.476, r0[1] + 0.012 + v * 0.476);
      C.push(col.r, col.g, col.b); SI.push(bi, 0, 0, 0); SW.push(1, 0, 0, 0);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) IX.push(nv + geo.index.getX(i)); else for (let i = 0; i < p.count; i++) IX.push(nv + i);
    nv += p.count; geo.dispose();
  };
  const sph = (ws = 16, hs = 12, ...a) => new THREE.SphereGeometry(1, Math.max(6, Math.round(ws * 0.72)), Math.max(4, Math.round(hs * 0.7)), ...a);
  const cap = (r, l, rs = 12) => new THREE.CapsuleGeometry(r, l, 3, Math.max(6, Math.round(rs * 0.75)));
  const lathe = (pts, segs = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), Math.round(segs * 0.85));
  const dk = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
  const S = pal.s, Cl = pal.c, Pa = pal.p, Bo = pal.b, H = pal.h;
  // torso
  put(sph(18, 12), 'hips', Pa, 'twill', 0, 0.0, 0, 0, 0, 0, 0.155, 0.12, 0.115);
  put(lathe([[0.0, -0.07], [0.142, -0.06], [0.148, 0.0], [0.14, 0.08], [0.148, 0.16], [0.162, 0.215]], 20), 'spine', Cl, 'cloth', 0, 0, 0, 0, 0, 0, 1, 1, 0.72);
  put(lathe([[0.162, -0.012], [0.178, 0.07], [0.186, 0.13], [0.17, 0.185], [0.122, 0.222], [0.06, 0.236], [0.0, 0.24]], 20), 'chest', Cl, 'cloth', 0, 0, 0, 0, 0, 0, 1, 1, 0.72);
  if (pal.collar) put(new THREE.TorusGeometry(0.075, 0.018, 6, 18), 'chest', pal.collar, 'cloth', 0, 0.225, 0.004, Math.PI / 2, 0, 0, 1, 1, 0.85);
  if (pal.belt) { put(new THREE.TorusGeometry(0.15, 0.022, 6, 22), 'spine', pal.belt, 'twill', 0, 0.0, 0, Math.PI / 2, 0, 0, 1, 0.73, 1); put(sph(8, 6), 'spine', '#c9a24a', 'skin', 0, 0.0, 0.112, 0, 0, 0, 0.03, 0.026, 0.012); }
  if (pal.tunic) put(lathe([[0.155, 0.04], [0.17, -0.06], [0.2, -0.2]]), 'hips', Cl, 'cloth', 0, 0, 0, 0, 0, 0, 1, 1, 0.78);
  if (pal.robe) put(lathe([[0.165, 0.06], [0.19, -0.12], [0.225, -0.38], [0.25, -0.6]], 20), 'hips', Cl, 'cloth', 0, 0, 0, 0, 0, 0, 1, 1, 0.82);
  if (pal.skirt) put(lathe([[0.155, 0.05], [0.19, -0.12], [0.23, -0.4]], 20), 'hips', Cl, 'cloth', 0, 0, 0, 0, 0, 0, 1, 1, 0.82);
  if (pal.apron) { put(lathe([[0.152, 0.2], [0.15, 0.0], [0.17, -0.25], [0.19, -0.42]], 20), 'spine', '#b8ab92', 'cloth', 0, 0.0, 0.012, 0, 0, 0, 0.9, 1, 0.78); }
  // neck + head
  put(cap(0.05, 0.07), 'neck', S, 'skin', 0, 0.03, 0);
  put(new THREE.SphereGeometry(1, 20, 14), 'head', S, 'skin', 0, 0.115, 0, 0, 0, 0, 0.1, 0.118, 0.108);
  put(sph(16, 12), 'head', S, 'skin', 0, 0.064, 0.02, 0, 0, 0, 0.08, 0.07, 0.084);
  put(sph(10, 8), 'head', dk(S, 0.95), 'skin', 0, 0.096, 0.1, -0.35, 0, 0, 0.013, 0.022, 0.022);
  for (const sx of [-1, 1]) {
    put(sph(10, 8), 'head', dk(S, 0.92), 'skin', sx * 0.099, 0.108, 0, 0, 0, 0, 0.017, 0.031, 0.022);
    put(sph(12, 10), 'head', pal.dark ? '#000000' : '#f3efe8', 'skin', sx * 0.039, 0.12, 0.092, 0, sx * 0.25, 0, 0.022, 0.017, 0.011);
    put(cap(0.0065, 0.026, 6), 'head', dk(H, pal.hair === 'elder' ? 0.9 : 0.6), 'hair', sx * 0.04, 0.143, 0.098, 0, sx * 0.25, Math.PI / 2 + sx * 0.18);
  }
  put(cap(0.006, 0.026, 6), 'head', pal.dark ? '#000000' : '#a05a50', 'skin', 0, 0.06, 0.104, 0, 0, Math.PI / 2);
  // hair
  const hs = pal.hair;
  if (hs === 'short' || hs === 'messy' || hs === 'long' || hs === 'bun') {
    put(sph(22, 12, 0, TAU, 0, Math.PI * 0.55), 'head', H, 'hair', 0, 0.118, -0.006, -0.28, 0, 0, 0.11, 0.128, 0.118);
    put(sph(14, 10), 'head', H, 'hair', 0, 0.09, -0.048, 0, 0, 0, 0.1, 0.095, 0.075);
    for (const sx of [-1, 1]) put(sph(10, 8), 'head', H, 'hair', sx * 0.074, 0.13, -0.01, 0, 0, sx * 0.3, 0.04, 0.06, 0.07);
    const tufts = hs === 'messy' ? 7 : 3;
    for (let i = 0; i < tufts; i++) { const a = (i / tufts - 0.5) * 1.6; put(sph(8, 6), 'head', H, 'hair', Math.sin(a) * 0.07, 0.19 + (hs === 'messy' ? Math.cos(i * 2.1) * 0.02 : 0), 0.06 + Math.cos(a) * 0.02, -0.5, a, 0, 0.034, 0.024, 0.04); }
  }
  if (hs === 'long') { put(sph(16, 12), 'head', H, 'hair', 0, -0.01, -0.06, 0.12, 0, 0, 0.105, 0.17, 0.06); for (const sx of [-1, 1]) put(sph(10, 10), 'head', H, 'hair', sx * 0.088, 0.04, -0.015, 0, 0, 0, 0.03, 0.1, 0.06); }
  if (hs === 'bun') put(sph(12, 10), 'head', H, 'hair', 0, 0.2, -0.08, 0, 0, 0, 0.055, 0.05, 0.05);
  if (hs === 'elder') {
    put(sph(22, 8, Math.PI * 0.75, Math.PI * 1.5, Math.PI * 0.36, Math.PI * 0.26), 'head', H, 'hair', 0, 0.112, -0.004, -0.15, 0, 0, 0.104, 0.122, 0.112);
    put(sph(14, 12), 'head', H, 'hair', 0, 0.02, 0.07, 0.25, 0, 0, 0.075, 0.1, 0.055);
    put(cap(0.012, 0.05, 6), 'head', H, 'hair', 0, 0.078, 0.108, 0, 0, Math.PI / 2);
  }
  if (pal.stache) put(cap(0.011, 0.045, 6), 'head', H, 'hair', 0, 0.077, 0.108, 0, 0, Math.PI / 2);
  if (pal.beard) put(sph(14, 12), 'head', pal.beard, 'hair', 0, 0.035, 0.065, 0.2, 0, 0, 0.07, 0.07, 0.05);
  if (pal.hat) { put(new THREE.CylinderGeometry(0.2, 0.2, 0.014, 24), 'head', '#6a5a3a', 'twill', 0, 0.19, 0, -0.08); put(new THREE.CylinderGeometry(0.1, 0.118, 0.11, 20), 'head', '#6a5a3a', 'twill', 0, 0.25, -0.004, -0.08);
    put(new THREE.CylinderGeometry(0.119, 0.12, 0.025, 20, 1, true), 'head', '#3a2a18', 'twill', 0, 0.21, -0.002, -0.08); }
  // arms
  for (const [sh, el, ha, sx] of [['shL', 'elL', 'haL', 1], ['shR', 'elR', 'haR', -1]]) {
    put(sph(14, 10), sh, Cl, 'cloth', 0, -0.03, 0, 0, 0, 0, 0.058, 0.064, 0.058);
    put(cap(0.052, 0.2), sh, Cl, 'cloth', 0, -0.145, 0);
    put(cap(0.043, 0.17), el, pal.short ? S : Cl, pal.short ? 'skin' : 'cloth', 0, -0.115, 0);
    if (!pal.short) put(new THREE.TorusGeometry(0.039, 0.008, 6, 14), el, dk(Cl, 0.75), 'cloth', 0, -0.205, 0, Math.PI / 2);
    put(sph(12, 10), ha, S, 'skin', 0, -0.05, 0, 0, 0, 0, 0.026, 0.055, 0.042);
    put(sph(10, 8), ha, S, 'skin', 0, -0.095, 0.006, 0, 0, 0, 0.022, 0.04, 0.036);
    put(cap(0.012, 0.03, 6), ha, S, 'skin', -sx * 0.008, -0.045, 0.036, 0.7, 0, 0);
  }
  // legs
  for (const [th, kn, ft] of [['thL', 'knL', 'ftL'], ['thR', 'knR', 'ftR']]) {
    put(cap(0.076, 0.27), th, Pa, 'twill', 0, -0.2, 0);
    put(sph(12, 10), kn, Pa, 'twill', 0, 0, 0.004, 0, 0, 0, 0.058, 0.06, 0.058);
    put(cap(0.059, 0.27), kn, Pa, 'twill', 0, -0.19, 0);
    put(cap(0.064, 0.13, 12), kn, Bo, 'twill', 0, -0.3, 0);
    put(sph(14, 10), ft, Bo, 'twill', 0, 0.0, 0.045, 0, 0, 0, 0.062, 0.052, 0.128);
    put(sph(14, 6), ft, dk(Bo, 0.55), 'twill', 0, -0.03, 0.045, 0, 0, 0, 0.064, 0.025, 0.13);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  geo.setIndex(IX);
  const mesh = new THREE.SkinnedMesh(geo, personMat(pal));
  mesh.add(hips); mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  g.add(mesh);
  const eyes = new THREE.Mesh(_eyeG, pal.dark ? mat(pal.e, { basic: true }) : mat(pal.e || '#151515', { shiny: 80, spec: 0x999999 }));
  head.add(eyes);
  if (pal.kid) head.scale.setScalar(1.16);
  let bell = null;
  if (pal.bell) {
    bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.1], [0.03, 0.098], [0.05, 0.07], [0.058, 0.0], [0.075, -0.06], [0.07, -0.068]].map(([r, y]) => new THREE.Vector2(r, y)), 16), mesh.material);
    bell.position.set(0, -0.13, 0.05); haR.add(bell); bell.castShadow = true;
    shR.rotation.set(-1.25, 0, -0.15); elR.rotation.x = -0.9; haR.rotation.x = 0.4;
    shL.rotation.set(0.1, 0, 0.12); elL.rotation.x = -0.25; neck.rotation.x = 0.12;
    const bg = bell.geometry, n = bg.attributes.position.count, cc = []; for (let i = 0; i < n; i++) cc.push(0.75, 0.75, 0.72); bg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  }
  g.scale.setScalar(sc);
  g.userData = { B: { hips, spine, chest, neck, head, shL, elL, haL, shR, elR, haR, thL, knL, ftL, thR, knR, ftR }, legL: thL, legR: thR, armL: shL, armR: shR, head, body: spine,
    eyes: [eyes], walk: 0, mv: 0, t: Math.random() * 6, pal, skin: mesh, flinch: 0 };
  return g;
}
function animPerson(g, dt, speed) {
  const u = g.userData, B = u.B; if (!B) return;
  u.t += dt;
  const target = clamp(speed / 4.6, 0, 1), run = clamp((speed - 5) / 2.4, 0, 1);
  u.mv = lerp(u.mv, target, Math.min(1, dt * 8));
  if (speed > 0.1) u.walk += dt * (4.4 + speed * 1.05);
  else u.walk = lerp(u.walk, Math.round(u.walk / Math.PI) * Math.PI, Math.min(1, dt * 5));
  const m = u.mv, s = Math.sin(u.walk), c = Math.cos(u.walk), idle = 1 - m, br = Math.sin(u.t * 1.7), hunch = u.pal.hunch || 0;
  const amp = (0.52 + run * 0.3) * m;
  B.thL.rotation.x = -s * amp - run * 0.08; B.thR.rotation.x = s * amp - run * 0.08;
  B.knL.rotation.x = m * (0.1 + Math.max(0, c) * (0.8 + run * 0.6)) + idle * 0.03;
  B.knR.rotation.x = m * (0.1 + Math.max(0, -c) * (0.8 + run * 0.6)) + idle * 0.03;
  B.ftL.rotation.x = -(B.thL.rotation.x + B.knL.rotation.x) * 0.75; B.ftR.rotation.x = -(B.thR.rotation.x + B.knR.rotation.x) * 0.75;
  B.thL.rotation.z = 0.02; B.thR.rotation.z = -0.02;
  B.hips.position.y = 0.92 - Math.abs(s) * 0.035 * m - run * 0.05 + br * 0.003 * idle - (u.crouch || 0);
  B.hips.rotation.set(0, s * 0.14 * m, c * 0.03 * m);
  B.spine.rotation.set(0.04 * m + run * 0.2 + hunch, -s * 0.2 * m, 0);
  B.chest.rotation.set(br * 0.018 * idle, 0, 0);
  B.neck.rotation.set(-(0.04 * m + run * 0.2) * 0.7 - hunch * 0.6, s * 0.08 * m, 0);
  const sw = (0.5 + run * 0.35) * m;
  B.shL.rotation.set(s * sw, 0, 0.11 + idle * br * 0.012 + run * 0.12);
  B.elL.rotation.x = -(0.16 + m * 0.28 + run * 0.75) - Math.max(0, -s) * 0.3 * m;
  B.haL.rotation.x = 0;
  if (!u.armBusy && !u.pal.bell) {
    B.shR.rotation.set(-s * sw, 0, -0.11 - idle * br * 0.012 - run * 0.12);
    B.elR.rotation.x = -(0.16 + m * 0.28 + run * 0.75) - Math.max(0, s) * 0.3 * m;
    B.haR.rotation.x = 0;
  }
  if (u.flinch > 0) {
    const f = Math.sin(Math.min(1, u.flinch) * Math.PI) * 1.0;
    B.spine.rotation.x -= f * 0.4; B.neck.rotation.x -= f * 0.35; B.shL.rotation.z += f * 0.7; if (!u.armBusy) B.shR.rotation.z -= f * 0.7;
    B.knL.rotation.x += f * 0.3; B.knR.rotation.x += f * 0.3;
    u.flinch = Math.max(0, u.flinch - dt * 3.2);
  }
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
  A = Object.assign({ id, group: new THREE.Group(), cols: [], circ: [], inter: [], npcs: [], foes: [], items: [], spawns: {}, triggers: [], nearCells: [], lodCells: [], torches: [], lights: [],
    fog: [0x000000, 10, 40], song: null, bend: 0, light: 'day', lantern: false, height: () => 0, update: null, onEnter: null, bounds: null }, o);
  G = A.group; G.visible = false; scene.add(G);
  AREAS[id] = A;
  return A;
}
function npc(id, pal, x, z, ry, talk, sc = 1) {
  const m = person(PAL[pal], sc); m.position.set(x, A.height(x, z), z); m.rotation.y = ry; add(m);
  const n = { id, mesh: m, x, z, ry, baseRy: ry, talk, t: Math.random() * 5 };
  A.npcs.push(n); A.circ.push({ x, z, r: 0.45 });
  A.inter.push({ x, z, r: 2.0, label: 'Talk', npc: n, fn: () => { n.facePlayer = 1.2; talk(n); } });
  return n;
}
let PGEO = null;
function pickupGeos() {
  if (PGEO) return PGEO;
  const heart = mergeGeos([[new THREE.SphereGeometry(0.16, 16, 12), M4(-0.11, 0.06, 0), null], [new THREE.SphereGeometry(0.16, 16, 12), M4(0.11, 0.06, 0), null],
    [new THREE.ConeGeometry(0.225, 0.34, 16), M4(0, -0.13, 0, Math.PI), null]]);
  heart.scale(1, 1, 0.55);
  const key = mergeGeos([[new THREE.TorusGeometry(0.15, 0.05, 10, 20), M4(0, 0.27, 0), null], [new THREE.CylinderGeometry(0.04, 0.04, 0.48, 10), M4(0, -0.07, 0), null],
    [new THREE.BoxGeometry(0.14, 0.06, 0.05), M4(0.07, -0.24, 0), null], [new THREE.BoxGeometry(0.1, 0.06, 0.05), M4(0.05, -0.12, 0), null]]);
  const piece = new THREE.LatheGeometry([[0.12, 0.25], [0.2, 0.1], [0.28, -0.12], [0.34, -0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 16, 0, Math.PI * 1.1);
  return PGEO = { heart, key, piece };
}
function pickup(type, x, z, o = {}) {
  let m; const P_ = pickupGeos();
  if (type === 'heart') m = new THREE.Mesh(P_.heart, mat('#e03a3a', { shiny: 80, spec: 0xffaaaa, emis: '#3a0606' }));
  else if (type === 'key') m = new THREE.Mesh(P_.key, mat('#e8c23a', { shiny: 90, spec: 0xffeeaa, emis: '#2a2008' }));
  else if (type === 'page') { m = new THREE.Mesh(boxGeo(0.45, 0.6, 0.02, 0.6), mat('#efe6cf', { tex: 'plaster', emis: '#3a362c' })); }
  else if (type === 'piece') m = new THREE.Mesh(P_.piece, mat('#c9a24a', { side: 1, shiny: 70, spec: 0xffddaa }));
  else if (type === 'container') { m = new THREE.Mesh(P_.heart, mat('#ff5a5a', { shiny: 90, spec: 0xffcccc, emis: '#5a1010' })); m.scale.setScalar(1.6); }
  if (type !== 'page') { const gl = glowSprite(type === 'key' || type === 'piece' ? '#ffd27a' : '#ff6060', type === 'container' ? 2.2 : 1.3, 0.45); m.add(gl); }
  m.position.set(x, 0.8, z); m.userData.dyn = true; m.castShadow = true; add(m);
  const it = Object.assign({ type, x, z, mesh: m, t: Math.random() * 6 }, o);
  A.items.push(it); return it;
}
function spawnPickup(type, x, z, o) { const pg = G, pa = A; G = area.group; A = area; const it = pickup(type, x, z, o); G = pg; A = pa; return it; }
function chest(x, z, give, flag, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = o.ry || 0; G.add(g);
  const prev = G; G = g;
  const wood = mat('#8a5a32', { tex: 'planks' }), iron = mat('#3a3a40', { shiny: 40, spec: 0x777777 }), gold = mat('#e8c23a', { shiny: 90, spec: 0xffeeaa });
  box(1.2, 0.7, 0.8, '#8a5a32', 0, 0, 0, { mat: wood, tex: 'planks', ts: 0.8 });
  for (const sx of [-0.45, 0.45]) box(0.08, 0.72, 0.84, '#3a3a40', sx, -0.01, 0, { mat: iron });
  const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4); g.add(lid);
  { const half = (r, len, m) => { const lm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16, 1, false, 0, Math.PI), m); lm.rotation.z = Math.PI / 2; lm.scale.set(0.55, 1, 1); lm.position.set(0, 0, 0.4); lm.castShadow = true; lid.add(lm); return lm; };
    half(0.4, 1.2, wood); for (const sx of [-0.45, 0.45]) half(0.41, 0.08, iron).position.x = sx;
    const lk = new THREE.Mesh(boxGeo(0.2, 0.24, 0.06, 0), gold); lk.position.set(0, -0.06, 0.83); lid.add(lk); }
  G = prev;
  const c = { x, z, g, lid, flag, open: false };
  A.circ.push({ x, z, r: 0.6, low: true });
  const it = { x, z, r: 1.9, label: 'Open', chest: c, fn: () => {
    if (S.taken[flag]) return say([['', 'Empty.']]);
    S.taken[flag] = 1; c.open = true; lid.rotation.x = -1.6; SFX.chest(); give(); save();
  } };
  A.inter.push(it);
  c.inter = it; return c;
}
// wall torch: iron bracket, flickering flame sprite, glow; the nearest one drives the shared point light
function torch(x, z, h, col, face = 0) {
  const g = new THREE.Group(); g.position.set(x, h, z); g.rotation.y = face; G.add(g);
  const iron = mat('#2a2622', { shiny: 30, spec: 0x555555 });
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.55, 8), mat('#4a3420', { tex: 'bark' })); st.position.set(0, 0.25, 0); st.rotation.x = 0.25; g.add(st);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.12, 10, 1, true), iron); cup.position.set(0, 0.55, 0.07); g.add(cup);
  const arm = new THREE.Mesh(boxGeo(0.05, 0.05, 0.3, 0), iron); arm.position.set(0, 0.2, -0.15); g.add(arm);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('flame'), color: new THREE.Color(col), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  fl.scale.set(0.32, 0.55, 1); fl.position.set(0, 0.82, 0.07); g.add(fl);
  const gl = glowSprite(col, 2.6, 0.5); gl.position.set(0, 0.8, 0.1); g.add(gl);
  const t = { x, z, y: h + 0.85, fl, gl, col: new THREE.Color(col), ph: Math.random() * 10 };
  A.torches.push(t);
  return fl;
}
function mergeStatic(ar) {
  ar.group.updateMatrixWorld(true);
  const buckets = new Map(), remove = [];
  const visit = obj => { for (const ch of obj.children) {
    if (ch.isMesh && !ch.isInstancedMesh && !ch.isSkinnedMesh && !ch.userData.dyn) {
      const e = ch.matrixWorld.elements, cell = Math.floor(e[12] / 40) + ',' + Math.floor(e[14] / 40);
      const k = ch.material.uuid + '|' + cell + '|' + (ch.castShadow ? 1 : 0) + (ch.receiveShadow ? 1 : 0);
      if (!buckets.has(k)) buckets.set(k, { m: ch.material, cast: ch.castShadow, recv: ch.receiveShadow, geos: [] });
      const g = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone(); g.applyMatrix4(ch.matrixWorld); buckets.get(k).geos.push(g); remove.push(ch);
    } else if (ch.isGroup && ch.userData.static) visit(ch);
  } };
  visit(ar.group);
  for (const ch of remove) { ch.removeFromParent(); }
  for (const { m, cast, recv, geos } of buckets.values()) {
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = m.vertexColors ? new Float32Array(n * 3) : null;
    let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (col && g.attributes.color) col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bg.computeBoundingSphere();
    const mesh = new THREE.Mesh(bg, m); mesh.castShadow = cast; mesh.receiveShadow = recv;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    ar.group.add(mesh);
  }
}
function waterMat(col, op) {
  const nt = tex('waterN');
  const m = new THREE.MeshPhongMaterial({ color: new THREE.Color(col), transparent: true, opacity: op, shininess: 140, specular: new THREE.Color(0x667788), normalMap: nt, normalScale: new THREE.Vector2(0.35, 0.35), depthWrite: false });
  nt.repeat.set(36, 14);
  return patch(m, 'water', sh => {
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.y += sin(position.x * 0.35 + uTime * 1.1) * 0.07 + cos(position.z * 0.45 + uTime * 1.4) * 0.05;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 mapN2 = texture2D(normalMap, vNormalMapUv * 0.37 + vec2(-uTime * 0.009, uTime * 0.014)).xyz * 2.0 - 1.0; mapN2.xy *= normalScale;
        normal = normalize(normal + normalize(tbn * mapN2) * 0.5); }`)
      .replace('#include <opaque_fragment>', `{ float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0); outgoingLight = mix(outgoingLight, outgoingLight * 0.6 + fogColor * 0.45, fr * 0.5); diffuseColor.a = mix(diffuseColor.a, 1.0, fr * 0.4); }
      #include <opaque_fragment>`);
  });
}

// ---------- MILLBROOK
function villageH(x, z) {
  const r = Math.hypot(x, z * 1.15);
  let m = smooth(30, 46, r) * (1 - smooth(8, 19, z));
  let h = (Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.093 + 0.4) * 1.0 + Math.sin(x * 0.21 + z * 0.17 + 2.1) * 0.35 + Math.sin(x * 0.05 - z * 0.07) * 0.7 + 0.45) * m;
  h *= 1 - 0.7 * (1 - smooth(4, 11, Math.hypot(x + 48, z + 48)));
  h += smooth(60, 88, Math.abs(x)) * 9 + smooth(-60, -88, z) * 9;
  h = lerp(h, -2.6, smooth(21, 31, z));
  h += smooth(78, 96, z) * 6.5;
  return h;
}
function buildVillage() {
  seed = 7;
  makeArea('village', { song: 'village', light: 'day', bounds: [-62, 62, -62, 60], height: (x, z) => (Math.abs(x) < 1.3 && z > 21 && z < 42.2) ? 0.3 : villageH(x, z) });
  const PATHS = [
    [[[0, 2], [0.3, 8], [-0.2, 14], [0, 21.5]], 2.6], [[[-6, -5], [-9.5, -6.2], [-13, -6.6]], 2.2], [[[6, -5], [9.5, -6.2], [13, -6.6]], 2.2],
    [[[-7, 1], [-10.5, 5], [-12.4, 8.4]], 2.0], [[[7, 1], [10.5, 5], [12.4, 8.4]], 2.0], [[[0, -10], [0.3, -16], [0, -21.4]], 2.2],
    [[[-8, -6], [-15, -9], [-23.4, -12]], 1.6], [[[8, -6], [15, -8], [23.4, -10]], 1.6],
    [[[-7, -7], [-14, -15], [-20, -19], [-27, -27.5], [-34, -33], [-40, -41], [-45.5, -45.5]], 2.6],
  ];
  const vt = terrain({ x0: -100, x1: 100, z0: -100, z1: 100, res: 1.6, h: villageH, splatRes: 768, blur: 1.4,
    layers: [['grass', 3.2], ['dirt', 2.6], ['sand', 3], ['cobble', 2.8]],
    paint: (g, X, Z, K) => {
      // shore sand
      g.save(); g.fillStyle = 'rgb(0,255,0)'; g.beginPath(); g.moveTo(X(-100), Z(100));
      for (let x = -100; x <= 100; x += 2) g.lineTo(X(x), Z(17.6 + Math.sin(x * 0.13) * 0.7 + Math.sin(x * 0.37) * 0.35)); g.lineTo(X(100), Z(100)); g.fill(); g.restore();
      // village square (cobbles) with worn dirt border
      g.save(); g.fillStyle = 'rgb(110,0,0)'; g.beginPath(); g.ellipse(X(0), Z(-3), 10 * K, 8.6 * K, 0, 0, TAU); g.fill(); g.restore();
      g.save(); g.fillStyle = 'rgb(0,0,255)'; g.beginPath(); if (g.roundRect) g.roundRect(X(-7.6), Z(-9.6), 15.2 * K, 13.2 * K, 3.4 * K); else g.rect(X(-7.6), Z(-9.6), 15.2 * K, 13.2 * K); g.fill(); g.restore();
      for (const [pts, w] of PATHS) { sStroke(g, X, Z, K, pts, w + 1.0, 'rgb(90,0,0)'); sStroke(g, X, Z, K, pts, w, 'rgb(200,0,0)'); }
      // forest-floor patches
      for (let i = 0; i < 160; i++) { const a = srand() * TAU, r = 34 + srand() * 30, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9 - 14; if (z > 15) continue; sBlob(g, X, Z, K, x, z, 1.5 + srand() * 3, 1.2 + srand() * 2.5, 'rgb(90,0,0)', 1.5); }
      sBlob(g, X, Z, K, -48, -48, 6, 6, 'rgb(150,0,0)', 1.5);
    } });
  // lake
  const wg = new THREE.PlaneGeometry(200, 76, 50, 19); wg.rotateX(-Math.PI / 2);
  A.water = new THREE.Mesh(wg, waterMat('#2d5f86', 0.84)); A.water.position.set(0, -0.12, 58); A.water.userData.dyn = true; A.water.receiveShadow = true; add(A.water);
  addCol(-35.6, 52, 68.7, 60); addCol(35.6, 52, 68.7, 60); addCol(0, 61.5, 3, 39);
  // dock
  const dw = mat('#d8c0a0', { tex: 'planks' }), dw2 = mat('#c4aa88', { tex: 'planks' });
  for (let z = 21; z < 42; z += 0.7) box(2.5, 0.12, 0.62, '#d8c0a0', (Math.sin(z * 7.1) * 0.03), 0.18, z + 0.3, { mat: (z * 10 | 0) % 14 < 7 ? dw : dw2, tex: 'planks', ts: 1.8, ry: Math.sin(z * 3.3) * 0.012 });
  for (const sx of [-1.18, 1.18]) box(0.14, 0.16, 21.2, '#5a4430', sx, 0.04, 31.6, { tex: 'planks', ts: 2 });
  for (let z = 23; z <= 41; z += 3.5) for (const sx of [-1.25, 1.25]) cyl(0.12, 0.13, 2.4, 10, '#6a5440', sx, -2.05, z, { tex: 'bark', ts: 0.8 });
  addCol(-1.45, 33.4, 0.2, 17.6, { low: true }); addCol(1.45, 33.4, 0.2, 17.6, { low: true });
  // the bell frame
  const bf = new THREE.Group(); bf.position.set(0, 0.3, 39.6); G.add(bf);
  { const prev = G; G = bf;
    const bw = mat('#a8865e', { tex: 'planks' });
    box(0.24, 3.2, 0.24, '#6a4c32', -1.0, 0, 0, { mat: bw, tex: 'planks', ts: 1.5 }); box(0.24, 3.2, 0.24, '#6a4c32', 1.0, 0, 0, { mat: bw, tex: 'planks', ts: 1.5 });
    box(2.6, 0.26, 0.32, '#6a4c32', 0, 3.1, 0, { mat: bw, tex: 'planks', ts: 1.5 });
    for (const sx of [-1, 1]) box(0.14, 0.9, 0.14, '#6a4c32', sx * 0.75, 2.5, 0, { mat: bw, rz: sx * 0.7, tex: 'planks', ts: 1.5 });
    const roofM = mat('#5a4038', { tex: 'shingle' });
    for (const sz of [-1, 1]) { const r = new THREE.Mesh(boxGeo(2.9, 0.08, 0.75, 1.2), roofM); r.position.set(0, 3.55, sz * 0.3); r.rotation.x = sz * 0.6; r.castShadow = true; bf.add(r); }
    const bellPts = [[0.0, 0.48], [0.12, 0.46], [0.22, 0.38], [0.27, 0.15], [0.33, -0.12], [0.5, -0.36], [0.6, -0.44], [0.57, -0.46]].map(([r, y]) => new THREE.Vector2(r, y));
    const bronze = mat('#c49a46', { shiny: 70, spec: 0xffe0a0, side: 1 }), bronze2 = mat('#8a7040', { shiny: 40, spec: 0xaa9070, side: 1 });
    A.bellWhole = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 24), bronze); A.bellWhole.position.y = 2.45; A.bellWhole.castShadow = true; bf.add(A.bellWhole);
    A.bellBroken = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 16, 0.3, Math.PI * 0.75), bronze2); A.bellBroken.position.y = 2.45; A.bellBroken.castShadow = true; bf.add(A.bellBroken);
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat('#4a4038', { shiny: 30 })); cl.position.y = 1.95; bf.add(cl); cl.userData.dyn = true;
    G = prev; }
  A.bellFrame = bf;
  A.circ.push({ x: -1, z: 39.6, r: 0.25 }, { x: 1, z: 39.6, r: 0.25 });
  A.inter.push({ x: 0, z: 39.0, r: 2.0, label: 'Look', fn: bellTalk });
  // hatch (after the bell)
  A.hatch = new THREE.Group(); A.hatch.position.set(0, 0.31, 41.4); G.add(A.hatch);
  { const prev = G; G = A.hatch;
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.005; hole.userData.dyn = true; A.hatch.add(hole);
    for (const [w, d, x, z] of [[1.7, 0.1, 0, -0.5], [1.7, 0.1, 0, 0.5], [0.1, 1.0, -0.8, 0], [0.1, 1.0, 0.8, 0]]) box(w, 0.06, d, '#3a2a1a', x, 0, z, { tex: 'planks', ts: 1, dyn: true });
    for (let i = 0; i < 4; i++) box(1.2, 0.08, 0.16, '#3a2a1a', 0, -0.2 - i * 0.35, -0.3 + i * 0.18, { tex: 'planks', ts: 1, dyn: true });
    G = prev; }
  A.inter.push({ x: 0, z: 41.3, r: 1.6, label: 'Go down', cond: () => S.flags.bellRung, fn: () => { SFX.stairs(); goArea('b1', 'start'); } });
  // the lake figure
  A.ghost = person(PAL.wren, 0.95); A.ghost.position.set(2.6, -1.9, 41); A.ghost.rotation.y = Math.PI; add(A.ghost);
  A.ghost.userData.armR.rotation.x = -2.6;
  // plinth + statue
  box(1.5, 0.6, 1.5, '#8a8884', 0, 0, -3, { col: true, low: true, tex: 'stone', ts: 1.2 }); box(1.75, 0.12, 1.75, '#7a7874', 0, 0.6, -3, { tex: 'stone', ts: 1.2 });
  box(1.8, 0.1, 1.8, '#6a6864', 0, -0.05, -3, { tex: 'stone', ts: 1.2 });
  A.inter.push({ x: 0, z: -3, r: 2.2, label: 'Look', fn: () => {
    if (C() === 0) say([['', 'A stone statue of a child holding a little bell.'], ['', 'The plaque is worn smooth. You can only read a "W".']]);
    else say([['', 'The plinth is empty.'], ['', 'There are stone footprints in the grass, heading your way.', 0.05]]);
  } });
  // houses
  const elder = house(-13, -11, 6, 5, '#e2d6bc', '#9a4a36', { chimney: true, win: '#ffd47a', winBasic: true, winDyn: true });
  house(13, -11, 6, 5, '#d4c4a4', '#3f7080', { win: '#ffd47a', winBasic: true });
  box(2.4, 0.55, 0.1, '#3f8f5a', 13, 2.65, -8.38, { tex: 'planks', ts: 1 });
  A.wren = house(-15, 9, 5, 5, '#b4b0a6', '#55555e', { face: Math.PI / 2, door: '#2a2a2a', win: '#14141a', winBasic: true });
  for (const k of [0, 1]) box(1.3, 0.12, 0.06, '#7a5c3a', -12.4, 1.15 + k * 0.5, 9, { ry: Math.PI / 2 + (k ? 0.4 : -0.4), tex: 'planks', ts: 1 });
  house(15, 9, 5.5, 5, '#ddd0b2', '#7a5a3a', { face: -Math.PI / 2, chimney: true, win: '#ffd47a', winBasic: true });
  house(0, -24, 7, 5, '#d6cab2', '#4a5a7a', { win: '#ffd47a', winBasic: true, chimney: true });
  house(-26, -12, 5, 5, '#cabea4', '#7a3a32', { face: Math.PI / 2, win: '#2a2a33' });
  house(26, -10, 5, 5, '#d2c2a8', '#3a5a48', { face: -Math.PI / 2, win: '#2a2a33' });
  A.elderWin = elder.wins;
  // barrels, crates and a well-worn bench
  const crate = mat('#9a7a52', { tex: 'planks' });
  for (const [x, z, s] of [[10.6, -8.2, 0.7], [11.3, -8.6, 0.55], [-17.6, -8.2, 0.7], [-11.4, 6.5, 0.6]]) { box(s, s, s, '#9a7a52', x, 0, z, { mat: crate, tex: 'planks', ts: 0.7, ry: x }); A.circ.push({ x, z, r: s * 0.6, low: true }); }
  for (const [x, z] of [[16.4, -8.4], [-9.6, -8.7]]) { cyl(0.32, 0.28, 0.85, 14, '#7a5a3a', x, 0, z, { tex: 'planks', ts: 0.8 }); A.circ.push({ x, z, r: 0.38, low: true }); }
  box(1.8, 0.08, 0.45, '#8a6a46', 5.5, 0.45, -8.6, { tex: 'planks', ts: 1 }); for (const sx of [-0.7, 0.7]) box(0.1, 0.45, 0.4, '#5a4430', 5.5 + sx, 0, -8.6);
  // fences + lamps
  const fw = mat('#8a6a4a', { tex: 'planks' });
  for (let x = -30; x <= 30; x += 2) if (Math.abs(x) > 2) {
    const y = villageH(x, 19.6);
    box(0.13, 0.95, 0.13, '#8a6a4a', x, y - 0.1, 19.6, { mat: fw, tex: 'planks', ts: 1 });
    if (x < 30 && !(x >= -3 && x < 3)) for (const ry of [0.32, 0.66]) box(2.02, 0.09, 0.05, '#8a6a4a', x + 1, y + ry, 19.6, { mat: fw, tex: 'planks', ts: 1.6 });
  }
  addCol(-16, 19.6, 28, 0.3, { low: true }); addCol(16, 19.6, 28, 0.3, { low: true });
  A.lamps = []; A.lampGlow = [];
  const metal = mat('#26282c', { shiny: 50, spec: 0x666666 });
  for (const [x, z] of [[-4, 3], [4, 3], [-3, 19], [3, 19], [-9, -9], [9, -9]]) {
    cyl(0.16, 0.2, 0.3, 12, '#26282c', x, 0, z, { mat: metal, col: true, colR: 0.9 });
    cyl(0.05, 0.065, 2.7, 10, '#26282c', x, 0.2, z, { mat: metal });
    cyl(0.08, 0.08, 0.08, 10, '#26282c', x, 1.2, z, { mat: metal });
    cyl(0.13, 0.08, 0.06, 10, '#26282c', x, 2.62, z, { mat: metal });
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.32, 8), mat('#e8d08a', { basic: true, unique: true })); l.position.set(x, 2.84, z); add(l); A.lamps.push(l);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; box(0.025, 0.36, 0.025, '#26282c', x + Math.cos(a) * 0.115, 2.66, z + Math.sin(a) * 0.115, { mat: metal }); }
    const capm = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.2, 8), metal); capm.position.set(x, 3.1, z); capm.castShadow = true; add(capm);
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), metal); fin.position.set(x, 3.22, z); add(fin);
    const gl = glowSprite('#ffc870', 2.4, 0.0); gl.position.set(x, 2.84, z); add(gl); A.lampGlow.push(gl);
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
  A.tv = new THREE.Mesh(boxGeo(0.012, 0.6, 0.6, 0), mat('#6a8aff', { basic: true, unique: true })); A.tv.position.set(-12.345, 1.7, 7.5); A.tv.material.polygonOffset = true; A.tv.material.polygonOffsetFactor = -1; add(A.tv);
  // mailbox
  cyl(0.04, 0.04, 1.0, 6, '#5a3e24', -11.2, 0, 10.6, { tex: 'bark' }); box(0.3, 0.22, 0.45, '#4a5a6a', -11.2, 1.0, 10.6, { shiny: 40 });
  // page on Wren's porch
  A.page2 = pickup('page', -11.4, 11.2, { n: 2, flag: 'page2', cond: () => C() >= 1 });
  // the Hollow gate: a huge dead tree
  { const x = -48, z = -48, y0 = villageH(x, z);
    const bark = mat('#5a4a3c', { tex: 'bark' });
    const tg = new THREE.LatheGeometry([[2.9, -0.4], [2.5, 0.3], [2.0, 1.2], [1.75, 3], [1.55, 5], [1.3, 6.8], [0.9, 7.8], [0.0, 8.0]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i), k = 1 + Math.sin(a * 5 + y * 0.7) * 0.12 + Math.sin(a * 11 - y) * 0.05; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
      tg.computeVertexNormals(); const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, p.getY(i) / 2); }
    const tm = new THREE.Mesh(tg, bark); tm.position.set(x, y0, z); tm.castShadow = tm.receiveShadow = true; add(tm);
    A.circ.push({ x, z, r: 2.3 });
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, b = new THREE.Mesh(cylGeo(0.12, 0.45, 4.6, 8, 1), bark); b.position.set(x + Math.cos(a) * 1.3, y0 + 7.4, z + Math.sin(a) * 1.3); b.rotation.set(Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75); b.castShadow = true; add(b);
      const tw = new THREE.Mesh(cylGeo(0.03, 0.12, 2.0, 6, 1), bark); tw.position.set(x + Math.cos(a) * 3.4, y0 + 9.6, z + Math.sin(a) * 3.4); tw.rotation.set(Math.sin(a + 0.6) * 1.0, 0, -Math.cos(a + 0.6) * 1.0); add(tw); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4, r = new THREE.Mesh(cylGeo(0.08, 0.5, 3.0, 8, 1), bark); r.position.set(x + Math.cos(a) * 3.0, y0 + 0.2, z + Math.sin(a) * 3.0); r.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25); add(r); }
    const a = Math.PI / 4, hr = 1.98 * (1 + Math.sin(a * 5 + 1.35 * 0.7) * 0.12 + Math.sin(a * 11 - 1.35) * 0.05) + 0.03, hx = x + Math.cos(a) * hr, hz = z + Math.sin(a) * hr;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x050302 })); hole.scale.set(0.85, 1.35, 1); hole.position.set(hx, y0 + 1.35, hz); hole.rotation.y = a; hole.lookAt(hx + Math.cos(a), y0 + 1.35, hz + Math.sin(a)); add(hole);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16, 8, 24), bark); rim.scale.set(0.88, 1.38, 1); rim.position.copy(hole.position); rim.quaternion.copy(hole.quaternion); add(rim);
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
    const t = clamp(((x + 8) * -1 + (z + 8) * -1) / 2 / 36, 0, 1.2); const px = -8 - 36 * t, pz = -8 - 36 * t;
    if (Math.hypot(x - px, z - pz) < 5 && t < 1.15) continue;
    if (Math.hypot(x + 48, z + 48) < 6) continue;
    const tr_ = { x, z, h: 0.8 + srand() * 0.7, r: srand() * 3 };
    if (Math.hypot(x + 46, z + 46) < 16 && srand() < 0.6) dead.push(tr_); else trees.push(tr_);
  }
  for (const [x, z] of [[-20, 4], [20, 2], [-22, -4], [21, -18], [-8, -32], [9, -33], [-30, 14], [32, 15], [-36, 16], [37, 12]]) trees.push({ x, z, h: 1 + srand() * 0.4, r: srand() * 3 });
  forest(trees); forest(dead, { dead: true });
  // backdrop woods outside the play bounds + the far shore
  const far = [];
  for (let i = 0; i < 900 && far.length < 260; i++) {
    const x = srand() * 190 - 95, z = srand() * 190 - 95;
    const out = Math.abs(x) > 66 || z < -66 || z > 84; if (!out) continue;
    if (z > 18 && z < 84) continue;
    far.push({ x, z, h: 1 + srand() * 0.8, r: srand() * 3 });
  }
  forest(far, { noCol: true, lo: true });
  // rocks
  const rk = [];
  for (let i = 0; i < 400 && rk.length < 70; i++) { const x = srand() * 124 - 62, z = srand() * 80 - 62, r = Math.hypot(x, z * 1.15); if (r < 33 || z > 15) continue;
    const t = clamp(((x + 8) * -1 + (z + 8) * -1) / 2 / 36, 0, 1.2); if (Math.hypot(x + 8 + 36 * t, z + 8 + 36 * t) < 3) continue;
    if (!buildFree(x, z, 1.0)) continue; rk.push({ x, z, s: 0.2 + srand() * srand() * 0.9, ry: srand() * 6, v: i }); }
  for (const [x, z, s] of [[-31, 18.4, 0.6], [33, 18.8, 0.7], [-44, 18.5, 0.9], [46, 19, 0.5], [6.5, -14, 0.35], [-19, -17, 0.4]]) rk.push({ x, z, s, ry: x, v: 2 });
  rocks(rk);
  // grass tufts + flowers, scattered where the splat says grass, shown only near the player
  { const im = vt.userData.splat.getImageData(0, 0, 768, 768).data, [SX, SZ] = vt.userData.splatXZ;
    const grassAt = (x, z) => { const i = ((SZ(z) | 0) * 768 + (SX(x) | 0)) * 4; return im[i] < 40 && im[i + 1] < 30 && im[i + 2] < 30; };
    const tufts = [], flowers = [], S_ = shared();
    for (let i = 0; i < 52000 && tufts.length < 21000; i++) {
      const x = srand() * 128 - 64, z = srand() * 84 - 64;
      if (!grassAt(x, z) || !buildFree(x, z, 0.3)) continue;
      const s = 0.8 + srand() * 0.6, k = 0.9 + srand() * 0.2;
      tufts.push({ x, z, y: villageH(x, z) - 0.02, ry: srand() * 6, s, sy: s * (0.8 + srand() * 0.6), c: [k * (0.9 + srand() * 0.2), k, k * 0.9] });
      if (srand() < 0.12) { const fc = [[1, 1, 1], [1, 0.85, 0.3], [0.75, 0.6, 1], [1, 0.55, 0.6]][(srand() * 4) | 0]; flowers.push({ x: x + 0.2, z: z + 0.1, y: villageH(x, z), ry: srand() * 6, s: 0.8 + srand() * 0.5, c: fc }); }
    }
    instCells(S_.tuft, S_.grassM, tufts, 16, { near: true });
    instCells(S_.flower, S_.flowerM, flowers, 24, { near: true });
  }
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
function buildFree(x, z, r) {
  for (const c of A.cols) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
  if (!A._cg || A._cgN !== A.circ.length) { A._cg = new Map(); A._cgN = A.circ.length; for (const c of A.circ) { const k = Math.floor(c.x / 4) + ',' + Math.floor(c.z / 4); if (!A._cg.has(k)) A._cg.set(k, []); A._cg.get(k).push(c); } }
  const gx = Math.floor(x / 4), gz = Math.floor(z / 4);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = A._cg.get((gx + i) + ',' + (gz + j)); if (l) for (const c of l) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false; }
  return true;
}

// ---------- THE HOLLOW
const CELL = 18;
function buildHollow() {
  seed = 99;
  makeArea('hollow', { song: 'hollow', light: 'dungeon', lantern: true, fog: [0x0a0c09, 8, 46] });
  const rooms = { r0: [0, 0], r1: [0, -1], r2: [1, -1], r3: [1, -2], r4: [0, -2], rb: [0, -3] };
  A.rooms = rooms;
  const links = [['r0', 'r1', 'open'], ['r1', 'r2', 'shut', 'r1clear'], ['r2', 'r3', 'shut', 'r2solved'], ['r3', 'r4', 'locked', 'r3door'], ['r4', 'rb', 'boss', 'bossdoor']];
  A.doors = [];
  const has = (gx, gy) => Object.values(rooms).some(r => r[0] === gx && r[1] === gy);
  const H = 4.2;
  const wallM = mat('#9a8a72', { tex: 'brick' }), capM = mat('#7a7064', { tex: 'stone' });
  const findLink = (ax, ay, bx, by) => links.find(l => { const p = rooms[l[0]], q = rooms[l[1]]; return (p[0] === ax && p[1] === ay && q[0] === bx && q[1] === by) || (p[0] === bx && p[1] === by && q[0] === ax && q[1] === ay); });
  const wallSeg = (x, z, w, d) => { box(w, H, d, '#9a8a72', x, 0, z, { col: true, mat: wallM, tex: 'brick', ts: 2.4 }); box(w + 0.2, 0.3, d + 0.2, '#7a7064', x, H, z, { mat: capM, tex: 'stone', ts: 1.5 }); };
  terrain({ x0: -10, x1: 28, z0: -64, z1: 10, res: 1, splatRes: 512,
    layers: [['flag', 3, '#b8ac96'], ['dirt', 2.5, '#8a7a62'], ['grass', 3, '#5a6a40'], ['flag', 1.6, '#8a8070']],
    paint: (g, X, Z, K) => {
      for (const [, [gx, gy]] of Object.entries(rooms)) { const cx = gx * CELL, cz = gy * CELL;
        g.save(); g.strokeStyle = 'rgb(170,0,0)'; g.lineWidth = 2.4 * K; g.strokeRect(X(cx - 8.6), Z(cz - 8.6), 17.2 * K, 17.2 * K); g.restore();
        for (let i = 0; i < 5; i++) sBlob(g, X, Z, K, cx + (srand() - 0.5) * 14, cz + (srand() - 0.5) * 14, 0.6 + srand() * 1.6, 0.6 + srand() * 1.6, i % 2 ? 'rgb(0,105,0)' : 'rgb(120,0,0)');
      }
      sBlob(g, X, Z, K, 0, -55, 7, 6, 'rgb(200,0,0)', 1.2); sBlob(g, X, Z, K, 0, -56, 4, 4, 'rgb(0,90,0)');
    } });
  const rubble = [];
  for (const [id, [gx, gy]] of Object.entries(rooms)) {
    const cx = gx * CELL, cz = gy * CELL, h = CELL / 2;
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
        if (horiz) { wallSeg(cx - 1.5 - seg / 2, ez, seg, 1); wallSeg(cx + 1.5 + seg / 2, ez, seg, 1); box(3, 0.8, 1, '#9a8a72', cx, H - 0.8, ez, { mat: wallM, tex: 'brick', ts: 2.4 }); }
        else { wallSeg(ex, cz - 1.5 - seg / 2, 1, seg); wallSeg(ex, cz + 1.5 + seg / 2, 1, seg); box(1, 0.8, 3, '#9a8a72', ex, H - 0.8, cz, { mat: wallM, tex: 'brick', ts: 2.4 }); }
        // door posts
        for (const s of [-1, 1]) box(horiz ? 0.5 : 1.3, H, horiz ? 1.3 : 0.5, '#7a7064', horiz ? cx + s * 1.75 : ex, 0, horiz ? ez : cz + s * 1.75, { mat: capM, tex: 'stone', ts: 1.5 });
        if (link && link[2] !== 'open') {
          const locked = link[2] === 'locked';
          const d = box(horiz ? 3 : 0.5, H - 0.8, horiz ? 0.5 : 3, locked ? '#7a5430' : '#6a6660', ex, 0, ez, { col: true, dyn: true, tex: locked ? 'planks' : 'brick', ts: locked ? 1.2 : 1.6 });
          const iron = mat('#2e2c2a', { shiny: 40, spec: 0x666666 });
          for (const by of [-1.0, 0.2, 1.2]) { const b = new THREE.Mesh(boxGeo(horiz ? 3.04 : 0.56, 0.12, horiz ? 0.56 : 3.04, 0), iron); b.position.y = by; d.add(b); }
          if (locked) { const lk = new THREE.Mesh(boxGeo(horiz ? 0.6 : 0.62, 0.6, horiz ? 0.62 : 0.6, 0), mat('#e8c23a', { shiny: 90, spec: 0xffeeaa })); lk.position.y = 1.3 - (H - 0.8) / 2; d.add(lk); }
          const door = { flag: link[3], type: link[2], mesh: d, col: d.userData.col, x: ex, z: ez, open: false, y: 0 };
          A.doors.push(door);
          if (link[2] === 'locked') A.inter.push({ x: ex, z: ez, r: 2.2, label: 'Unlock', cond: () => !door.open, fn: () => {
            if (S.keys > 0) { S.keys--; S.taken[door.flag] = 1; SFX.unlock(); save(); } else { SFX.lock(); say([['', 'Locked. You need a key.']]); }
          } });
        }
      }
    }
    // corner pillars
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(1.5, H + 0.5, 1.5, '#7a7064', cx + sx * h, 0, cz + sz * h, { mat: capM, tex: 'stone', ts: 1.5 });
    // roots creeping down the walls
    for (let i = 0; i < 6; i++) {
      const side = i % 4, t = srand() * 14 - 7;
      const x = side === 0 ? cx + t : side === 1 ? cx + t : side === 2 ? cx - 8.2 : cx + 8.2;
      const z = side === 0 ? cz - 8.2 : side === 1 ? cz + 8.2 : cz + t;
      if (Math.abs(t) < 2.2) continue;
      const r = cyl(0.06, 0.26, 4.6, 8, '#5a4430', x, 0, z, { tex: 'bark', ts: 1 }); r.rotation.z = (srand() - 0.5) * 0.6; r.rotation.x = (srand() - 0.5) * 0.6;
      const r2 = cyl(0.03, 0.12, 2.2, 6, '#5a4430', x + (srand() - 0.5), 1.5, z + (srand() - 0.5), { tex: 'bark', ts: 1 }); r2.rotation.z = (srand() - 0.5) * 1.2;
    }
    // rubble
    for (let i = 0; i < 6; i++) { const a = srand() * TAU; const x = cx + (srand() < 0.5 ? -1 : 1) * (6.6 + srand() * 1.2), z = cz + (srand() - 0.5) * 13; rubble.push({ x, z, s: 0.15 + srand() * 0.25, ry: a, v: i }); }
    for (const [tx, tz] of [[-7.6, -8.3], [7.6, -8.3]]) torch(cx + tx, cz + tz, 1.8, '#ffb040');
  }
  rocks(rubble, { noCol: true });
  // R0
  sign(3, 4, [['', 'THE HOLLOW.'], ['', 'Something grew here that should have stayed a seed.']]);
  A.spawns.entry = { x: 0, z: 6, yaw: 0 };
  A.triggers.push({ x0: -1.5, x1: 1.5, z0: 8.6, z1: 10, fn: () => { SFX.door(); goArea('village', 'hollowGate'); } });
  // R1: crawlers -> chest with key
  A.r1chest = chest(0, -18, () => { S.keys++; SFX.key(); say([['', 'You got a SMALL KEY.']]); }, 'hk1');
  // R2: block puzzle
  sign(16, -11.5, [['', 'Push the stone onto the plate.'], ['', 'If it gets stuck, leave the room and it will reset.']]);
  A.plate = box(2, 0.08, 2, '#b08a3a', 22, 0.02, -22, { shiny: 50, spec: 0x997744 });
  box(1.6, 0.1, 1.6, '#c9a24a', 22, 0.02, -22, { shiny: 60, spec: 0xaa8844 });
  A.block = { home: [18, -18], x: 18, z: -18, mesh: box(1.96, 1.8, 1.96, '#8a847a', 18, 0, -18, { dyn: true, tex: 'brick', ts: 1.96 }), col: null, push: 0, dir: null, moving: 0, from: null, to: null };
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
function stairsHole(x, z, o = {}) {
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  hm.rotation.x = -Math.PI / 2; hm.position.set(x, 0.012, z); hm.userData.dyn = true; add(hm);
  const g = new THREE.Group(); g.position.set(x, 0, z); add(g); g.userData.dyn = true;
  const pm = G; G = g;
  for (const [w, d, px, pz] of [[2.3, 0.15, 0, -1.07], [2.3, 0.15, 0, 1.07], [0.15, 2.0, -1.07, 0], [0.15, 2.0, 1.07, 0]]) box(w, 0.08, d, o.col || '#4a4a50', px, 0, pz, { tex: 'stone', ts: 1 });
  for (let i = 0; i < 3; i++) box(1.8, 0.06, 0.4, '#2a2a2e', 0, -0.25 - i * 0.3, -0.5 + i * 0.4, { tex: 'stone', ts: 1 });
  G = pm;
  return { hole: hm, frame: g };
}
function buildB1() {
  seed = 13;
  makeArea('b1', { song: 'under', bend: 1.6, light: 'under', lantern: true, fog: [0x020306, 4, 28], floor: 'B1' });
  terrain({ x0: -4.2, x1: 4.2, z0: -74, z1: 5, res: 1, splatRes: 128,
    layers: [['flag', 2.2, '#7a8496'], ['concrete', 2, '#4a5260'], ['dirt', 2, '#3a3a44'], ['flag', 2, '#6a7080']],
    paint: (g, X, Z, K) => { for (let i = 0; i < 30; i++) sBlob(g, X, Z, K, (srand() - 0.5) * 6, -srand() * 72, 0.6 + srand(), 1 + srand() * 2, i % 3 ? 'rgb(160,0,0)' : 'rgb(0,140,0)', 1.4); } });
  const wA = mat('#6a7484', { tex: 'concrete' }), wB = mat('#5e6878', { tex: 'concrete' });
  for (let z = 2; z > -72; z -= 4) { box(1, 3.6, 4, '#262b31', -3.5, 0, z, { mat: (z / 4 | 0) % 2 ? wA : wB, tex: 'concrete', ts: 3.6 }); box(1, 3.6, 4, '#2a2f35', 3.5, 0, z, { mat: (z / 4 | 0) % 2 ? wB : wA, tex: 'concrete', ts: 3.6 }); }
  for (let z = 4; z > -72; z -= 8) for (const sx of [-1, 1]) box(0.3, 3.8, 0.6, '#4a5260', sx * 2.93, 0, z, { tex: 'concrete', ts: 2 });
  for (const sx of [-1, 1]) { const p = cyl(0.07, 0.07, 76, 10, '#3a4048', sx * 2.92, 0, -34, { shiny: 40, spec: 0x445566 }); p.rotation.x = Math.PI / 2; p.position.y = 3.1; }
  addCol(-3.5, -34, 1, 76); addCol(3.5, -34, 1, 76); addCol(0, 4, 8, 1); addCol(0, -72.5, 8, 1);
  for (let z = -4; z > -70; z -= 9) { torch(-2.9, z, 1.6, '#4a8aff', Math.PI / 2); torch(2.9, z - 4.5, 1.6, '#4a8aff', -Math.PI / 2); }
  A.figs = [];
  for (const z of [-16, -30, -46, -58]) { const f = person(PAL.shadow); f.position.set((srand() - 0.5) * 3, 0, z); f.rotation.y = 0; add(f); setEyes(f, '#e8e8e8'); A.figs.push({ mesh: f, gone: false, z }); }
  pickup('page', 1.6, -40, { n: 7, flag: 'page7' });
  stairsHole(0, -69);
  A.inter.push({ x: 0, z: -69, r: 1.8, label: 'Go down', fn: () => { SFX.stairs(); floorSkip(); } });
  A.spawns.start = { x: 0, z: 1, yaw: 0 };
  A.onEnter = () => { placeStatueBehind(10); }; A.update = b1Update;
}
function buildB6() {
  seed = 66;
  makeArea('b6', { song: 'mem', bend: 1.0, light: 'mem', fog: [0x14130f, 8, 36], floor: 'B6' });
  terrain({ x0: -16, x1: 16, z0: -16, z1: 16, res: 1, splatRes: 256,
    layers: [['grass', 3, '#b8b8a0'], ['dirt', 2.5, '#c0b090'], ['sand', 3], ['cobble', 2]],
    paint: (g, X, Z, K) => { sStroke(g, X, Z, K, [[0, 12], [0, -8]], 2.4, 'rgb(200,0,0)'); sStroke(g, X, Z, K, [[-6, -2], [6, -2]], 3.6, 'rgb(150,0,0)'); for (let i = 0; i < 12; i++) sBlob(g, X, Z, K, (srand() - 0.5) * 24, (srand() - 0.5) * 24, 1 + srand() * 2, 1 + srand() * 2, 'rgb(100,0,0)'); } });
  house(0, -10, 8, 5, '#a8a49a', '#5a5a62', { win: '#202024', winBasic: true });
  const tw = mat('#c8c8c0', { tex: 'plaster' }), items = ['#7a6a5a', '#5a5a6a', '#6a5a4a', '#8a7a6a'];
  for (const [x, z] of [[-5, -2], [0, -2.5], [5, -2]]) { box(2.6, 0.08, 1.2, '#c8c8c0', x, 0.8, z, { col: true, low: true, mat: tw, tex: 'plaster', ts: 1 }); for (const sx of [-1.1, 1.1]) for (const sz of [-0.45, 0.45]) cyl(0.03, 0.03, 0.8, 6, '#8a8a8a', x + sx, 0, z + sz, { shiny: 40 }); for (let i = 0; i < 4; i++) box(0.35, 0.12 + srand() * 0.3, 0.4, items[i], x - 0.9 + i * 0.6, 0.88, z + (srand() - 0.5) * 0.4, { tex: 'atlas', ts: 0.6 }); }
  box(0.9, 0.6, 0.6, '#b89060', -8, 0, 0, { col: true, low: true, tex: 'planks', ts: 0.9 });
  A.cart = box(0.3, 0.05, 0.36, '#9a9aa2', 0.2, 0.88, -2.4, { shiny: 40 });
  A.inter.push({ x: 0.2, z: -2.4, r: 1.8, label: 'Look', fn: () => say([['', 'A grey cartridge. No box.'], ['', fmt('The label says {N} in marker.')], ['', 'It\'s warm, like somebody was just holding it.', 0.04]]) });
  A.inter.push({ x: -8, z: 0, r: 1.8, label: 'Read', fn: () => say([['', 'A cardboard box: "GAMES $1 EACH. EVERYTHING MUST GO."']]) });
  npc('woman', 'woman', 4.5, -4, 0.3, n => say([['WOMAN', 'Everything goes. All of it.'], ['WOMAN', 'We can\'t keep looking at it every day.'], ['WOMAN', 'Especially that game. Take it. Please. One dollar.']], () => { if (!S.flags.b6) { S.flags.b6 = true; save(); SFX.secret(); toast('Somewhere behind you, stairs open.'); } }));
  const buyer = npc('buyer', 'player', -3, 2.5, Math.PI * 0.9, n => say([['???', 'One dollar? For an old game with no box?'], ['???', 'Somebody wrote on the label. SECONDHAND.'], ['???', '...okay. Deal.'], ['', 'The kid holding the cartridge looks a little like you.']]));
  buyer.mesh.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.depthWrite = true; patch(o.material, 'ghost'); } });
  const st = stairsHole(0, 8); A.stairs = st.hole; A.stairsFrame = st.frame;
  A.inter.push({ x: 0, z: 8, r: 1.8, label: 'Go down', cond: () => S.flags.b6, fn: () => { SFX.stairs(); floorSkip2(); } });
  forest([[-11, -12], [11, -12], [-12, 6], [12, 9], [-9, 12]].map(([x, z], i) => ({ x, z, h: 0.8, r: i * 0.7 })), { noCol: true });
  addCol(0, -13.5, 30, 1); addCol(0, 13.5, 30, 1); addCol(-13.5, 0, 1, 30); addCol(13.5, 0, 1, 30);
  A.spawns.start = { x: 0, z: 10, yaw: 0 };
  A.update = (dt) => { area.stairs.visible = area.stairsFrame.visible = !!S.flags.b6; };
}
function buildB10() {
  makeArea('b10', { song: 'void', bend: 0.6, light: 'void', fog: [0x000000, 6, 40], floor: 'B10' });
  const grid = new THREE.GridHelper(120, 60, 0x223344, 0x111a22); grid.position.y = -0.4; grid.userData.dyn = true; add(grid);
  box(120, 0.1, 120, '#000000', 0, -0.6, 0, { basic: true });
  const dw = mat('#7a6248', { tex: 'planks' });
  for (let z = 6; z > -12.5; z -= 0.7) box(2.5, 0.12, 0.62, '#7a6248', Math.sin(z * 7.1) * 0.03, 0.18, z, { mat: dw, tex: 'planks', ts: 1.8 });
  for (const sx of [-1.18, 1.18]) box(0.14, 0.16, 19, '#4a3a2a', sx, 0.04, -3.2, { tex: 'planks', ts: 2 });
  for (let z = 5; z >= -12; z -= 3.5) for (const sx of [-1.25, 1.25]) cyl(0.12, 0.13, 2.3, 10, '#4a3a2a', sx, -2, z, { tex: 'bark', ts: 0.8 });
  addCol(-1.45, -3, 0.2, 20); addCol(1.45, -3, 0.2, 20); addCol(0, -13.4, 3, 0.4, { low: true }); addCol(0, 6.6, 3, 0.4, { low: true });
  A.height = () => 0.3;
  A.wrenNpc = npc('wren', 'wren', 0, -11.2, 0, talkWren);
  { const gl = glowSprite('#8fb8ff', 3.2, 0.35); gl.position.y = 1.1; A.wrenNpc.mesh.add(gl); }
  A.spawns.start = { x: 0, z: 5, yaw: 0 };
  A.update = b10Update;
}
function buildLakebed() {
  makeArea('lakebed', { light: 'water', fog: [0x0a2a3a, 2, 24] });
  terrain({ x0: -30, x1: 30, z0: -30, z1: 30, res: 1, splatRes: 256, h: (x, z) => Math.sin(x * 0.3) * Math.cos(z * 0.25) * 0.25 + Math.sin(x * 0.11 + z * 0.13) * 0.3,
    layers: [['sand', 3, '#8aa098'], ['dirt', 2.5, '#5a6a60'], ['grass', 2.5, '#4a6a50'], ['stone', 2]],
    paint: (g, X, Z, K) => { for (let i = 0; i < 40; i++) sBlob(g, X, Z, K, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, 1 + Math.random() * 3, 1 + Math.random() * 3, Math.random() < 0.5 ? 'rgb(150,0,0)' : 'rgb(0,150,0)', 1.4); } });
  const dw = mat('#3a5050', { tex: 'planks' });
  for (let z = -10; z <= 10; z += 0.7) box(2.5, 0.12, 0.62, '#3a5050', 0, 7, z, { mat: dw, tex: 'planks', ts: 1.8 });
  for (let z = -9; z <= 9; z += 3.5) for (const sx of [-1.25, 1.25]) cyl(0.12, 0.13, 7, 10, '#2a3a34', sx, 0, z, { tex: 'bark', ts: 0.8 });
  const weedM = mat('#9ad08a', { tex: 'leaves' });
  for (let i = 0; i < 40; i++) { const r = cyl(0.02, 0.07, 1.5 + Math.random() * 2.2, 6, '#2a4a2a', (Math.random() - 0.5) * 22, 0, (Math.random() - 0.5) * 22, { mat: weedM }); r.rotation.z = (Math.random() - 0.5) * 0.4; r.rotation.x = (Math.random() - 0.5) * 0.3; }
  rocks(Array.from({ length: 16 }, (_, i) => ({ x: (Math.random() - 0.5) * 24, z: (Math.random() - 0.5) * 24, s: 0.2 + Math.random() * 0.5, ry: i, v: i })), { noCol: true });
  const sg = new THREE.PlaneGeometry(60, 60, 20, 20); sg.rotateX(-Math.PI / 2);
  A.surface = new THREE.Mesh(sg, waterMat('#5aa0c0', 0.55)); A.surface.material.side = THREE.DoubleSide; A.surface.position.set(0, 7.4, 0); A.surface.userData.dyn = true; add(A.surface);
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
function swordGeo() {
  const blade = mergeGeos([
    [new THREE.CylinderGeometry(0.0, 0.032, 0.12, 4), M4(0, 0, 0.98, Math.PI / 2, 0, 0, 1, 1, 0.35), null],
    [new THREE.CylinderGeometry(0.032, 0.036, 0.8, 4), M4(0, 0, 0.52, Math.PI / 2, 0, 0, 1, 1, 0.35), null]]);
  const hilt = mergeGeos([
    [new THREE.CylinderGeometry(0.022, 0.024, 0.16, 8), M4(0, 0, 0.01, Math.PI / 2), null],
    [new THREE.SphereGeometry(0.035, 10, 8), M4(0, 0, -0.08), null]]);
  return { blade, hilt };
}
function buildPlayer() {
  P.mesh = person(PAL.player);
  const B = P.mesh.userData.B, sg = swordGeo();
  // the sword lives in the right hand bone
  const grip = new THREE.Group(); grip.position.set(0, -0.07, 0.01); B.haR.add(grip);
  const bladeM = mat('#dfe6ee', { shiny: 110, spec: 0xffffff }), bladeHot = mat('#ffffff', { basic: true });
  const blade = new THREE.Mesh(sg.blade, bladeM); blade.castShadow = true; grip.add(blade);
  const hilt = new THREE.Mesh(sg.hilt, mat('#6a4a2a', { shiny: 30, spec: 0x554433 })); grip.add(hilt);
  const gold = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.045, 0.055), mat('#c9a24a', { shiny: 80, spec: 0xffddaa })); gold.position.z = 0.1; grip.add(gold);
  grip.visible = false; P.sword = grip; P.blade = blade; P.bladeM = bladeM; P.bladeHot = bladeHot;
  // sheathed sword on the back (chest bone)
  const back = new THREE.Group(); back.position.set(0.02, 0.08, -0.15); back.rotation.set(0, 0, 0.55); B.chest.add(back);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.8, 10), mat('#5a3a22', { tex: 'planks', shiny: 20 })); sh.scale.z = 0.5; sh.position.y = -0.18; back.add(sh); sh.castShadow = true;
  const bh = new THREE.Mesh(sg.hilt, hilt.material); bh.rotation.x = -Math.PI / 2; bh.position.y = 0.3; back.add(bh);
  const bg = new THREE.Mesh(gold.geometry, gold.material); bg.position.y = 0.23; back.add(bg);
  P.back = back;
  // swing trail
  const trM = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const streak = (g, arc, r0, r1) => { const p = g.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)), a = Math.atan2(p.getY(i), p.getX(i));
      const kr = smooth(r0, r1, r) * (1 - smooth(r1, r1 + 0.12, r)), ka = arc ? Math.pow(1 - clamp(a / 1.5, 0, 1), 1.6) : 1, k = kr * ka; c.push(0.7 * k, 0.85 * k, 1.0 * k); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; };
  const tr_ = new THREE.Mesh(streak(new THREE.RingGeometry(0.95, 1.62, 28, 3, 0, 1.5), true, 1.0, 1.5), trM); tr_.rotation.x = Math.PI / 2; tr_.position.y = 1.2; tr_.visible = false; P.mesh.add(tr_); P.trail = tr_;
  const ring = new THREE.Mesh(streak(new THREE.RingGeometry(1.05, 1.7, 48, 3), false, 1.1, 1.58), trM.clone()); ring.rotation.x = Math.PI / 2; ring.position.y = 1.15; ring.visible = false; P.mesh.add(ring); P.ring = ring;
  // soft contact shadow
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex('blob'), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.scale.setScalar(0.95); P.mesh.add(blob); P.blob = blob;
}
// sword arm, torso twist and grip, layered on top of the walk cycle
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function swordPose() {
  const u = P.mesh.userData, B = u.B;
  P.trail.visible = false; P.ring.visible = false;
  if (P.swingT >= 0) {
    const t = P.swingT / 0.24, e = ease(t);
    B.spine.rotation.y = lerp(-0.6, 0.6, e); B.hips.rotation.y = lerp(-0.2, 0.25, e);
    B.shR.rotation.set(-1.45 + Math.sin(e * Math.PI) * 0.1, lerp(-1.25, 0.75, e), -0.15);
    B.elR.rotation.x = lerp(-1.0, -0.12, e); B.haR.rotation.x = 0.2;
    P.sword.rotation.set(lerp(1.2, 1.45, e), 0, 0);
    B.shL.rotation.set(0.35, 0, 0.35); B.elL.rotation.x = -0.6;
    B.neck.rotation.y = -B.spine.rotation.y * 0.5;
    P.trail.visible = true; P.trail.material.opacity = 0.6 * Math.max(0, 1 - t * 0.9) * Math.min(1, t * 6);
    P.trail.rotation.z = Math.PI / 2 - (B.spine.rotation.y + B.hips.rotation.y + B.shR.rotation.y) - 0.15;
  } else if (P.spinT >= 0) {
    const t = P.spinT / 0.42;
    B.spine.rotation.y = -0.35; B.shR.rotation.set(-1.5, -1.3, -0.1); B.elR.rotation.x = -0.08; B.haR.rotation.x = 0.1;
    P.sword.rotation.set(1.5, 0, 0);
    B.shL.rotation.set(-0.5, 0, 0.45); B.elL.rotation.x = -0.9; B.spine.rotation.x = 0.18;
    u.crouch = 0.1;
    P.ring.visible = true; P.ring.material.opacity = 0.35 * Math.sin(Math.min(1, t) * Math.PI);
  } else if (P.bT > 0.25) {
    B.spine.rotation.y = -0.55; B.hips.rotation.y = -0.15; u.crouch = 0.06;
    B.shR.rotation.set(-0.55, -0.95, -0.25); B.elR.rotation.x = -1.2; B.haR.rotation.x = 0.3;
    P.sword.rotation.set(0.6, 0, 0);
    B.shL.rotation.set(-0.5, 0, 0.3); B.elL.rotation.x = -0.9;
  } else u.crouch = Math.max(0, (u.crouch || 0) - 0.02);
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
  let top = 0x000000, sunAmt = 0, cloud = 0, sd = SUN_DIR;
  if (L === 'day') {
    if (c === 0) { bg = 0xa8cce4; top = 0x3a78c4; f0 = 30; f1 = 110; hI = 1.25; hG = 0x5a4a32; sI = 2.3; sC = 0xfff0d8; sunAmt = 1; cloud = 1; }
    else if (c === 1) { bg = 0x9aa2ac; top = 0x5a6878; f0 = 22; f1 = 85; hI = 1.05; sI = 1.2; sC = 0xe8e0d0; hC = 0xb8c4d0; sunAmt = 0.25; cloud = 1.6; }
    else if (c === 2) { bg = 0x7a3c46; top = 0x24162e; f0 = 12; f1 = 62; hI = 0.7; hC = 0xb090c0; hG = 0x302030; sI = 1.1; sC = 0xff7050; lan = 6; sunAmt = 1.2; cloud = 0.6; sd = SUN_LOW; }
    else { bg = 0x080a12; top = 0x010206; f0 = 6; f1 = 38; hI = 0.4; hC = 0x5070a0; hG = 0x101018; sI = 0.35; sC = 0x8090ff; lan = 10; lanC = 0x9fb8ff; sunAmt = 0; cloud = 0.25; sd = SUN_MOON; }
  } else {
    bg = area.fog[0]; f0 = area.fog[1]; f1 = area.fog[2]; sd = SUN_TOP;
    if (L === 'dungeon') { hI = 1.1; hC = 0xd8c0a0; hG = 0x564434; sI = 0.5; sC = 0xd8c8a8; lan = 22; }
    if (L === 'under') { hI = 0.85; hC = 0x7090d0; hG = 0x182030; sI = 0.2; sC = 0x6080ff; lan = 16; lanC = 0xa8c0ff; }
    if (L === 'mem') { hI = 0.85; hC = 0xc8c0b0; hG = 0x302820; sI = 0.9; sC = 0xd8c8b0; }
    if (L === 'void') { hI = 0.7; hC = 0x8090a0; sI = 0.2; lan = 12; lanC = 0xc0d0ff; }
    if (L === 'water') { hI = 0.9; hC = 0x60c0d0; hG = 0x103020; sI = 0.8; sC = 0x90e0ff; }
  }
  scene.background.setHex(bg); scene.fog.color.setHex(bg); scene.fog.density = (L === 'day' ? 1.65 : 1.85) / f1; void f0;
  sky.visible = L === 'day';
  if (sky.visible) { skyU.uHor.value.setHex(bg); skyU.uTop.value.setHex(top); skyU.uSunAmt.value = sunAmt; skyU.uCloud.value = cloud; skyU.uSun.value.copy(sd); skyU.uSunCol.value.setHex(sC); }
  sunDir.copy(sd);
  hemi.intensity = hI; hemi.color.setHex(hC); hemi.groundColor.setHex(hG); sun.intensity = sI; sun.color.setHex(sC);
  lantern.intensity = lan; lantern.color.setHex(lanC);
  baseBg = bg;
}
let baseBg = 0;
const SUN_TOP = new THREE.Vector3(0.12, 1, 0.18).normalize(), SUN_LOW = new THREE.Vector3(-0.75, 0.28, 0.6).normalize(), SUN_MOON = new THREE.Vector3(0.3, 0.7, -0.6).normalize(), sunDir = SUN_DIR.clone();
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
const parts = [], partPool = [];
const PG = new THREE.IcosahedronGeometry(0.07, 0);
function puff(x, y, z, col, n = 8, sp = 3) {
  for (let i = 0; i < n; i++) {
    const m = partPool.pop() || new THREE.Mesh(PG, null);
    m.material = mat(col, { basic: true }); m.position.set(x, y, z); m.scale.setScalar(1); area.group.add(m);
    parts.push({ m, vx: rnd(-sp, sp), vy: rnd(1, sp * 1.4), vz: rnd(-sp, sp), t: rnd(0.4, 0.8) });
  }
}
function partsUpdate(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t -= dt; p.vy -= 9 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    p.m.scale.setScalar(Math.max(0.01, p.t * 1.8)); p.m.rotation.x += dt * 5;
    if (p.t <= 0) { p.m.removeFromParent(); partPool.push(p.m); parts.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- foes
const WHITE = () => mat('#ffffff', { basic: true });
function mkFoe(type, x, z, room) {
  const g = new THREE.Group();
  const f = { type, x, z, room, hp: type === 'crawler' ? 2 : 1, r: type === 'crawler' ? 0.5 : 0.4, mesh: g, vx: 0, vz: 0, t: rnd(0, 2), stun: 0, cd: rnd(1, 2), lunge: 0, flash: 0, mats: [] };
  if (type === 'crawler') {
    const shell = mat('#5a3624', { tex: 'bark', shiny: 40, spec: 0x664433 }), legM = mat('#2e1e14', { shiny: 30, spec: 0x443322 });
    const b = new THREE.Mesh(blobGeo(0.45, 2, 0.08, 1, 3), shell); b.scale.set(1, 0.62, 1.25); b.position.y = 0.42; b.castShadow = true; g.add(b);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), shell); hd.scale.set(1, 0.8, 0.9); hd.position.set(0, 0.4, 0.5); g.add(hd);
    f.legs = [];
    for (let i = 0; i < 6; i++) { const s_ = i < 3 ? -1 : 1, lg = new THREE.Group(); lg.position.set(s_ * 0.32, 0.4, -0.3 + (i % 3) * 0.3); g.add(lg);
      const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.32, 3, 6), legM); up.rotation.z = s_ * 1.0; up.position.set(s_ * 0.16, 0.08, 0); lg.add(up);
      const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.36, 3, 6), legM); lo.rotation.z = -s_ * 0.35; lo.position.set(s_ * 0.36, -0.12, 0); lg.add(lo);
      f.legs.push([lg, i]); }
    for (const sx of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#ff3030', { basic: true })); e.position.set(sx, 0.47, 0.68); g.add(e); }
    const eg = glowSprite('#ff3020', 0.7, 0.4); eg.position.set(0, 0.47, 0.7); g.add(eg);
  } else {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 2), mat('#d8fff0', { basic: true })); b.position.y = 1.3; g.add(b);
    const h = glowSprite('#60ff9a', 1.8, 0.8); h.position.y = 1.3; g.add(h);
    for (let i = 0; i < 3; i++) { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 1), mat('#b8ffd8', { basic: true })); o.position.set(Math.cos(i * 2.1) * 0.45, 0, Math.sin(i * 2.1) * 0.45); b.add(o); }
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
      for (const [lg, i] of f.legs) { const ph = f.t * 16 + i * 2.1; lg.rotation.y = Math.sin(ph) * 0.35; lg.rotation.z = (i < 3 ? -1 : 1) * Math.max(0, Math.cos(ph)) * 0.25; }
    } else {
      if (d < 14) { f.x += dx / d * 1.7 * dt; f.z += dz / d * 1.7 * dt; }
      f.mesh.children[0].position.y = f.mesh.children[1].position.y = 1.1 + Math.sin(f.t * 3) * 0.25;
      f.mesh.children[0].rotation.y += dt * 3;
    }
    const o = { x: f.x, z: f.z }; solve(o, f.r); f.x = o.x; f.z = o.z;
    f.mesh.position.x = f.x; f.mesh.position.z = f.z;
    if (d < f.r + 0.45 && f.stun <= 0) hurt(1, f.x, f.z);
  }
  for (let i = area.foes.length - 1; i >= 0; i--) if (area.foes[i].dead) area.foes.splice(i, 1);
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
  const bark = mat('#6a5038', { tex: 'bark' }), bark2 = mat('#4e3a28', { tex: 'bark' });
  const tg = new THREE.LatheGeometry([[2.2, -0.2], [1.85, 0.4], [1.5, 1.4], [1.35, 2.6], [1.3, 3.8], [1.15, 5.0], [0.8, 5.9], [0.0, 6.1]].map(([r, y]) => new THREE.Vector2(r, y)), 22);
  { const p = tg.attributes.position, uv = tg.attributes.uv; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i), k = 1 + Math.sin(a * 6 + y * 0.9) * 0.1 + Math.sin(a * 13 - y * 1.7) * 0.04; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    tg.computeVertexNormals(); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, p.getY(i) / 1.6); }
  const trunk = new THREE.Mesh(tg, bark); trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 6; i++) { const a = i * 1.2 + 0.4; const br = new THREE.Mesh(cylGeo(0.1, 0.38, 3.6, 8, 1), bark2); br.position.set(Math.cos(a) * 0.9, 6.6, Math.sin(a) * 0.9); br.rotation.set(Math.sin(a) * 0.85, 0, -Math.cos(a) * 0.85); br.castShadow = true; g.add(br);
    const tw = new THREE.Mesh(cylGeo(0.02, 0.09, 1.6, 6, 1), bark2); tw.position.set(Math.cos(a) * 2.5, 8.1, Math.sin(a) * 2.5); tw.rotation.set(Math.sin(a + 0.8) * 1.1, 0, -Math.cos(a + 0.8) * 1.1); g.add(tw); }
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.2; const rt = new THREE.Mesh(cylGeo(0.05, 0.42, 2.8, 8, 1), bark2); rt.position.set(Math.cos(a) * 2.3, 0.25, Math.sin(a) * 2.3); rt.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3); rt.castShadow = true; g.add(rt); }
  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.2, 8, 20, Math.PI), bark); brow.position.set(0, 2.75, 1.25); brow.scale.set(1.15, 0.8, 1); g.add(brow);
  const eyeG = new THREE.Group(); eyeG.position.set(0, 2.6, 1.25); g.add(eyeG);
  const socket = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 14), mat('#1a100a')); socket.scale.set(1.15, 0.95, 0.6); socket.position.z = -0.1; eyeG.add(socket);
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), mat('#f0e8d2', { tex: 'eye', shiny: 90, spec: 0xffffff, emis: '#2a2018' })); eyeG.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), mat('#c01818', { shiny: 100, spec: 0xffffff, emis: '#500404' })); pupil.scale.z = 0.5; pupil.position.z = 0.44; eyeG.add(pupil);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat('#080404', { shiny: 100, spec: 0xffffff })); dot.position.z = 0.1; pupil.add(dot);
  const mkLid = (up) => { const grp = new THREE.Group(); grp.position.set(0, up ? 0.35 : -0.35, 0.0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 10, 0, TAU, up ? 0 : Math.PI / 2, Math.PI / 2), mat('#6a5038', { tex: 'bark', side: 1 })); dome.scale.set(1.18, 1.0, 1.05); dome.position.y = up ? -0.35 : 0.35; grp.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 22, Math.PI), bark2); rim.scale.set(1.18, 1, 1.05); rim.rotation.set(up ? -Math.PI / 2 : Math.PI / 2, 0, 0); rim.position.y = up ? -0.35 : 0.35; grp.add(rim);
    eyeG.add(grp); return grp; };
  const lidT = mkLid(true), lidB = mkLid(false);
  area.circ.push({ x: 0, z: -57, r: 1.8 });
  const f = { type: 'boss', x: 0, z: -57, r: 1.9, hp: 8, mesh: g, mats: [], flash: 0 };
  g.traverse(o => { if (o.isMesh) f.mats.push([o, o.material]); });
  area.boss = { g, f, eyeG, lidT, lidB, pupil, state: 'sleep', t: 0, cycle: 0, spikes: [], sink: 0 };
  // exit portal
  const portal = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.1, 10, 40), mat('#9fe8ff', { basic: true })); portal.position.set(0, 1.4, -51); portal.add(glowSprite('#7fd8ff', 3.6, 0.7)); area.group.add(portal); portal.visible = false;
  area.portal = portal;
  area.inter.push({ x: 0, z: -51, r: 2.0, label: 'Leave', cond: () => !!S.taken.piece1, fn: () => { S.flags.hollowDone = true; save(); SFX.warp(); goArea('village', 'hollowGate'); } });
  G = prevG; A = prevA;
}
let SPIKE = null;
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
        const mk = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ map: tex('blob'), color: 0x000000, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); mk.rotation.x = -Math.PI / 2; mk.position.set(x, 0.03, z); area.group.add(mk);
        const sp = new THREE.Mesh(SPIKE || (SPIKE = cylGeo(0.0, 0.5, 2.4, 9, 1)), mat('#5a4028', { tex: 'bark' })); sp.position.set(x, -1.3, z); sp.rotation.y = Math.random() * 6; sp.castShadow = true; area.group.add(sp);
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
  S.hp -= n; P.inv = 1.0; SFX.hurt(); P.mesh.userData.flinch = 1; shake = Math.max(shake, big ? 0.6 : 0.3);
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
    void t; P.sword.visible = true; P.back.visible = false; P.mesh.userData.armBusy = true;
    if (P.swingT > 0.03 && P.swingT < 0.22) swordHits(2.1, 1.15, 1);
    if (P.swingT > 0.26) { P.swingT = -1; }
  }
  if (P.spinT >= 0) {
    P.spinT += dt; const t = P.spinT / 0.42;
    P.sword.visible = true; P.back.visible = false; P.mesh.userData.armBusy = true;
    P.face += dt * TAU / 0.42 * 1.0;
    swordHits(2.7, 9, 2);
    if (Math.random() < 0.5) puff(P.x + Math.sin(P.face + 1.3) * 1.8, 1.0, P.z + Math.cos(P.face + 1.3) * 1.8, '#dfe6ee', 1, 0.5);
    if (t >= 1) P.spinT = -1;
  }
  if (P.swingT < 0 && P.spinT < 0) {
    if (P.bT > 0.25) { P.sword.visible = true; P.back.visible = false; P.mesh.userData.armBusy = true; P.blade.material = P.ready && Math.sin(now * 30) > 0 ? P.bladeHot : P.bladeM; }
    else { P.sword.visible = false; P.back.visible = true; P.mesh.userData.armBusy = false; }
  }
  if (P.inv > 0) { P.inv -= dt; P.mesh.visible = Math.sin(now * 40) > -0.3 || P.inv <= 0; } else P.mesh.visible = true;
  if (P.bT <= 0.25 && P.blade.material !== P.bladeM) P.blade.material = P.bladeM;
  P.mesh.position.set(P.x, P.y, P.z); P.mesh.rotation.y = P.face;
  animPerson(P.mesh, dt, P.speed);
  swordPose();
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
  A_.water.material.normalMap.offset.set(now * 0.011, -now * 0.017);
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
  for (let i = 0; i < A_.lamps.length; i++) { const l = A_.lamps[i], off = c >= 3 && Math.random() < 0.05;
    l.material.color.setHex(c >= 2 ? (off ? 0x000000 : 0xffd27a) : 0x8a8a78); A_.lampGlow[i].material.opacity = c >= 2 && !off ? 0.75 : 0; }
  if (A_.winC !== (c >= 3)) { A_.winC = c >= 3; for (const w of A_.elderWin) w.material = mat(c >= 3 ? '#08080a' : '#ffd47a', { basic: true }); }
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
const camPos = new THREE.Vector3(), _camT = new THREE.Vector3();
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
  const target = _camT.set(px, py, pz);
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
  const T = (n, f) => { const t0 = performance.now(); f(); if (fpsShow) console.log('build ' + n + ' ' + Math.round(performance.now() - t0) + 'ms'); };
  T('player', () => { buildPlayer(); buildStatue(); });
  T('village', buildVillage); T('hollow', buildHollow); T('b1', buildB1); T('b6', buildB6); T('b10', buildB10); T('lakebed', buildLakebed);
  T('merge', () => { for (const a of Object.values(AREAS)) mergeStatic(a); });
  T('compile', () => { try { for (const a of Object.values(AREAS)) a.group.visible = true; renderer.compile(scene, cam); } catch (e) {} });
  for (const a of Object.values(AREAS)) a.group.visible = false;
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
// sun follows the player (texel-snapped), the nearest torch/lamp drives the shared point light, grass only near the player
let nearT = 0;
function worldFx(dt) {
  const tx = area.id === 'lakebed' ? 0 : P.x, tz = area.id === 'lakebed' ? 0 : P.z;
  const snap = 38 / (sun.shadow.mapSize.x || 1024);
  sun.target.position.set(Math.round(tx / snap) * snap, 0, Math.round(tz / snap) * snap);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 60);
  // lights from torches / lit lamps
  let best = null, bd = 1e9, bx = 0, by = 0, bz = 0, bc = null, bi = 0;
  for (const t of area.torches) {
    const fl = 0.75 + Math.sin(now * 13 + t.ph) * 0.12 + Math.sin(now * 23.7 + t.ph * 2) * 0.08 + Math.sin(now * 5.3 + t.ph) * 0.05;
    t.fl.scale.set(0.32 * (0.9 + fl * 0.15), 0.55 * fl, 1); t.gl.material.opacity = 0.32 + fl * 0.22;
    const d = (t.x - P.x) ** 2 + (t.z - P.z) ** 2; if (d < bd) { bd = d; best = t; bx = t.x; by = t.y; bz = t.z; bc = t.col; bi = 7 * fl; }
  }
  if (area.id === 'village' && C() >= 2) for (let i = 0; i < area.lamps.length; i++) { const l = area.lamps[i]; if (area.lampGlow[i].material.opacity <= 0) continue;
    const d = (l.position.x - P.x) ** 2 + (l.position.z - P.z) ** 2; if (d < bd) { bd = d; best = l; bx = l.position.x; by = 2.6; bz = l.position.z; bc = LAMPC; bi = 9; } }
  if (best && bd < 400) { lampLight.position.set(bx, by, bz); lampLight.color.copy(bc); lampLight.intensity = bi * clamp(1.3 - Math.sqrt(bd) / 20, 0, 1); }
  else lampLight.intensity = 0;
  nearT -= dt;
  if (nearT <= 0) { nearT = 0.25; for (const im of area.nearCells) { const dx = im.userData.cx - P.x, dz = im.userData.cz - P.z; im.visible = dx * dx + dz * dz < 30 * 30; }
    for (const [h, l] of area.lodCells) { const dx = h.userData.cx - P.x, dz = h.userData.cz - P.z, near = dx * dx + dz * dz < 42 * 42; h.visible = near; l.visible = !near; } }
}
const LAMPC = new THREE.Color(0xffc070);
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
  lantern.position.set(P.x + Math.sin(P.face) * 0.2, P.y + 2.3, P.z + Math.cos(P.face) * 0.2);
  worldFx(dt);
  hud();
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
}
function frame(ts) {
  requestAnimationFrame(frame);
  now = ts / 1000; const rawDt = now - last; const dt = Math.min(0.05, Math.max(0.001, rawDt || 0.016)); last = now;
  pollInput();
  if (mode === 'play' && !dlg && !switching) { if (pressed.start) openPause(); else if (pressed.select) openMap(); }
  else if (mode === 'pause' && pressed.start) closePause();
  else if (mode === 'map' && (pressed.select || pressed.start || pressed.B)) closeMap();
  if (area && (mode === 'play' || mode === 'dead' || mode === 'cut')) step(dt);
  qualityTick(rawDt);
  if (area) {
    sky.position.copy(cam.position);
    if (blinkT > 0) { scene.background.setHex(0); cam.layers.set(5); renderer.render(scene, cam); cam.layers.set(0); scene.background.setHex(baseBg); }
    else renderer.render(scene, cam);
  } else { renderer.setClearColor(0x000000); renderer.clear(); }
  SHA.tick();
  if (fpsShow) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { perfEl.textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + renderer.info.render.calls + ' calls · ' + Math.round(renderer.info.render.triangles / 1000) + 'k tris · ' + VIEW_W + 'x' + VIEW_H + ' · q' + qLevel; fpsAcc = 0; fpsN = 0; } }
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'play' && !dlg) openPause(); if (S && mode !== 'files') save(); } });
layoutUI();
// test hook
window.__s3d = { get mode() { return mode; }, get S() { return S; }, P, get area() { return area; }, statue, goArea, AREAS, get dlg() { return dlg; }, dlgNext() { if (dlg) nextLine(); return !!dlg; }, say, ending, U,
  setGod(v) { window.__god = v; }, keys, held, get camYaw() { return camYaw; }, set camYaw(v) { camYaw = v; }, get camDist() { return camDist; }, set camDist(v) { camDist = v; }, set camPitch(v) { camPitch = v; }, startNew(name) { S = newRun(name || 'TESTER'); save(); return startGame(true); }, renderer, glitchKick, C };
// Android back button
window.shBack = () => {
  if (mode === 'map') { closeMap(); return 1; }
  if (mode === 'pause') { closePause(); return 1; }
  if (mode === 'play' && !dlg) { openPause(); return 1; }
  if (mode === 'play' || mode === 'cut' || mode === 'dead') return 1;
  return 0;
};
