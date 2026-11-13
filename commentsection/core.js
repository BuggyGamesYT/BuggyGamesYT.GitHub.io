// Comment Section - core game logic (no drawing). Copyright (c) 2026 Buggy Games YT. All Rights Reserved.
(function (root) {
  'use strict';
  var T = 32, H = 17;            // tile size, rows
  var GRAV = 1500, JUMP = 580, RUN = 230;

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  // ---------- streams / levels ----------
  var STREAMS = [
    { name: 'Just Chatting (and Jumping)', sky: ['#1b1440', '#3a2370'], ground: '#5b46c9', top: '#8f7bff' },
    { name: 'Chat Plays My Game', sky: ['#0d2a2c', '#145a55'], ground: '#1f9c7a', top: '#5cf2b8' },
    { name: '24 Hour Rage Stream', sky: ['#2b0f12', '#6b1d22'], ground: '#b8452f', top: '#ff8a5c' },
    { name: 'FINAL STREAM: Chat Has The Controller', sky: ['#07070d', '#26183d'], ground: '#3c3c58', top: '#ff3d7f' }
  ];
  var LEVELS = 13; // 3 streams x 4 parts + boss stream
  function streamOf(li) { return li >= 12 ? 3 : Math.floor(li / 4); }
  function partOf(li) { return li >= 12 ? 1 : (li % 4) + 1; }

  function genLevel(li) {
    var r = rng(li * 7919 + 1337);
    var boss = li === 12;
    var W = boss ? 190 : 70 + li * 9;
    var d = Math.min(1, li / 11);
    var tiles = new Uint8Array(W * H);
    var L = { W: W, H: H, tiles: tiles, coins: [], enemies: [], check: null, goal: null, start: { x: 3 * T, y: 0 }, li: li, boss: boss };
    function set(x, y, v) { if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v; }
    function col(x, h) { for (var y = h; y < H; y++) set(x, y, 1); }
    var h = 14, x = 0;
    for (; x < 9; x++) col(x, h);
    L.start.y = h * T - 30;
    var afterGap = false, cpDone = false;
    var maxGap = 2 + Math.round(d * 2);
    while (x < W - 14) {
      if (!afterGap && r() < 0.32 + d * 0.12) {
        var g = ri(r, 2, maxGap);
        if (g >= 3 && r() < 0.6) { // stepping platform
          var px = x + Math.floor(g / 2) - 1, py = h - 3;
          set(px, py, 1); set(px + 1, py, 1);
          L.coins.push({ x: (px + 1) * T, y: (py - 1) * T + 16, got: false });
        } else {
          L.coins.push({ x: (x + g / 2) * T, y: (h - 3) * T, got: false });
        }
        x += g; afterGap = true; continue;
      }
      var nh = h + ri(r, afterGap ? -1 : -2, afterGap ? 2 : 2);
      nh = Math.max(10, Math.min(14, nh));
      if (afterGap && nh < h - 1) nh = h - 1;
      h = nh; afterGap = false;
      var len = ri(r, 4, 9);
      if (x + len > W - 14) len = W - 14 - x;
      if (len <= 0) break;
      for (var i = 0; i < len; i++) col(x + i, h);
      if (!cpDone && x > W / 2) { L.check = { x: (x + 1) * T, y: h * T - 30, tx: x + 1, ty: h }; cpDone = true; }
      else {
        if (len >= 6 && r() < 0.25 + d * 0.35) set(x + ri(r, 2, len - 4), h - 1, 2);
        if (len >= 6 && r() < 0.25 + d * 0.4) L.enemies.push(mkEnemy((x + ri(r, 2, len - 2)) * T, h * T - 24, false));
        if (len >= 5 && r() < 0.35) {
          var fx = x + 1, fy = h - 4;
          for (var k = 0; k < 3; k++) set(fx + k, fy, 1);
          for (k = 0; k < 3; k++) L.coins.push({ x: (fx + k) * T + 16, y: (fy - 1) * T + 16, got: false });
        } else if (r() < 0.6) {
          for (k = 1; k < Math.min(4, len - 1); k++) L.coins.push({ x: (x + k) * T + 16, y: (h - 1) * T + 10, got: false });
        }
      }
      x += len;
    }
    // finish runway
    h = Math.min(h, 14);
    for (; x < W; x++) col(x, h);
    if (!L.check) L.check = { x: (W - 30) * T, y: h * T - 30, tx: W - 30, ty: h };
    L.goal = { x: (W - 6) * T, y: h * T - 64, w: 40, h: 64 };
    return L;
  }

  function mkEnemy(x, y, spawned) { return { x: x, y: y, w: 26, h: 24, vx: spawned ? -70 : -55, vy: 0, dead: false, spawned: spawned, squash: 0 }; }

  function tileAt(L, tx, ty) {
    if (tx < 0) return 1;
    if (tx >= L.W) return 1;
    if (ty < 0) return 1;         // the sky is a ceiling (matters when gravity flips)
    if (ty >= L.H) return 0;
    return L.tiles[ty * L.W + tx];
  }
  function solid(L, tx, ty) { return tileAt(L, tx, ty) === 1; }

  // move a box through the tile grid; returns {hitX, hitY, landed}
  function moveBox(L, o, dx, dy, gsign) {
    var res = { hitX: false, hitY: false, landed: false };
    o.x += dx;
    var top = Math.floor(o.y / T), bot = Math.floor((o.y + o.h - 0.01) / T), tx, ty;
    if (dx > 0) { tx = Math.floor((o.x + o.w) / T); for (ty = top; ty <= bot; ty++) if (solid(L, tx, ty)) { o.x = tx * T - o.w - 0.01; res.hitX = true; break; } }
    else if (dx < 0) { tx = Math.floor(o.x / T); for (ty = top; ty <= bot; ty++) if (solid(L, tx, ty)) { o.x = (tx + 1) * T + 0.01; res.hitX = true; break; } }
    o.y += dy;
    var left = Math.floor(o.x / T), right = Math.floor((o.x + o.w - 0.01) / T);
    if (dy > 0) { ty = Math.floor((o.y + o.h) / T); for (tx = left; tx <= right; tx++) if (solid(L, tx, ty)) { o.y = ty * T - o.h - 0.01; res.hitY = true; if (gsign > 0) res.landed = true; break; } }
    else if (dy < 0) { ty = Math.floor(o.y / T); for (tx = left; tx <= right; tx++) if (solid(L, tx, ty)) { o.y = (ty + 1) * T + 0.01; res.hitY = true; if (gsign < 0) res.landed = true; break; } }
    return res;
  }

  // ---------- chat ----------
  var A = ['Soggy', 'Crispy', 'Feral', 'Sleepy', 'Turbo', 'Cursed', 'Mid', 'Spicy', 'Lil', 'Big', 'Silent', 'Chunky', 'Wobbly', 'Sneaky', 'Laggy', 'Toasty', 'Moist', 'Unhinged', 'Polite', 'Goofy'];
  var N = ['Waffle', 'Goblin', 'Noodle', 'Toaster', 'Pigeon', 'Potato', 'Gremlin', 'Pickle', 'Raccoon', 'Burrito', 'Nugget', 'Cactus', 'Hamster', 'Sock', 'Wizard', 'Frog', 'Bean', 'Muffin', 'Llama', 'Biscuit'];
  var FIXED = ['grandma_plays', 'NoScopeNana', 'LagSwitchLarry', 'xX_DripLord_Xx', 'certified_bot_not', 'CerealAt3AM', 'mod_wannabe', 'DadJokeDave', 'ur_moms_wifi', 'TouchGrassTim', 'BackseatBarry', 'ClipItChris', 'firstcommentfrank', 'SpeedrunSusan', 'KeyboardKaren', 'chat_lawyer', 'PixelPaul', 'ok_but_why', 'wet_sock_willy', 'TheRealNotReal'];
  var COLORS = ['#ff6b8b', '#ffd23f', '#5cf2b8', '#7ab8ff', '#c792ff', '#ff9f43', '#39ff88', '#ff5ce1', '#9ef0ff', '#f7f7a1'];
  var IDLE = ['W streamer', 'first', 'is this live??', 'my cat could do this', 'chat we are SO back', 'jump bro JUMP', 'who else here at 3am', 'speedrunner arc', 'bro is locked in', 'this is my comfort stream', 'hi from the bathroom', 'lag?', 'audio is fine for me', 'can you say hi to my dog', 'how do i turn off notifications', 'the music slaps', 'bro has the reflexes of a fridge', 'HE IS HIM', 'bro is NOT him', 'skill issue incoming', 'clip that', 'chat behave', 'mods??', 'what game is this', 'i would have died there tbh', 'mom said 10 more minutes', 'go right', 'go left (trust me)', 'certified hood classic', 'lowkey cracked', 'this better be on the channel', 'did he just', 'ok that was clean', 'bro is speedrunning my patience', 'cooking rn', 'aura +1000', 'chat is this real', 'pls notice me', 'lurking', 'my wifi is a potato', 'hydrate', 'posture check', 'touch grass after this'];
  var DEATH = ['F', 'F in chat', 'LMAOOO', 'CLIP IT', 'skill issue', 'bro tripped on air', 'nooooo', 'aura -1000', 'unlucky', 'that was ON PURPOSE right?', 'i saw that coming', 'rip bozo (affectionate)', 'chat we lost him', 'respawn arc', 'bro needs a tutorial'];
  var COIN = ['nice', 'money money', 'collect them all', 'W', 'shiny', 'likes go up'];
  var STOMP = ['BONK', 'sent him to the shadow realm', 'flattened', 'get stomped', 'W stomp', 'pancake'];
  var CHAOS = ['WHO VOTED THAT', 'chat is evil', 'LMAOOO', 'good luck bro', 'chat did this', 'i voted for this proudly', 'democracy has spoken', 'nah this is crazy', 'sorry streamer', 'muahahaha', 'chat what have we done', 'pure chaos'];
  var CLEAR = ['GG', 'GGGG', 'W', 'HE DID IT', 'HE IS HIM', 'clean', 'chat he actually did it', 'clip that ending', 'no way', 'certified W'];
  var DONO_NOTES = ['you got this', 'for the struggle', 'from your #1 fan', 'buy yourself a jump', 'pls survive', 'keep going', 'my lunch money', 'tax write off', 'carry me too', 'for the vibes'];

  function mkName(r) { if (r() < 0.3) return pick(r, FIXED); return pick(r, A) + pick(r, N) + (r() < 0.6 ? ri(r, 1, 999) : ''); }

  // ---------- effects ----------
  var CHAOS_FX = {
    FLIP: { label: 'GRAVITY FLIP', dur: 8 },
    REVERSE: { label: 'REVERSE CONTROLS', dur: 8 },
    SPAWN: { label: 'SPAWN ENEMIES', dur: 0 },
    SPEED: { label: 'SPEED UP', dur: 10 },
    HARDER: { label: 'MAKE IT HARDER', dur: 0 },
    ZOOM: { label: 'ZOOM IN', dur: 10 },
    DARK: { label: 'LIGHTS OUT', dur: 10 },
    MOON: { label: 'MOON GRAVITY', dur: 10 },
    BOUNCY: { label: 'BOUNCY MODE', dur: 8 },
    TINY: { label: 'TINY STREAMER', dur: 10 }
  };
  var CHAOS_KEYS = Object.keys(CHAOS_FX);
  var DONOS = [
    { key: 'SHIELD', label: 'SHIELD', amt: '$5.00' },
    { key: 'LIFE', label: '+1 LIFE', amt: '$10.00' },
    { key: 'SLOW', label: 'SLOW-MO', amt: '$2.00' },
    { key: 'CLEAN', label: 'CLEAN UP', amt: '$20.00' }
  ];

  // ---------- game ----------
  function Game(opts) {
    opts = opts || {};
    this.r = rng((opts.seed || Date.now()) >>> 0);
    this.sfx = opts.sfx || function () {};
    this.chat = [];
    this.banner = null;
    this.reset(opts.startLevel || 0);
  }
  var P = Game.prototype;

  P.reset = function (li) {
    this.li = li;
    this.lives = 3;
    this.viewers = [12, 140, 600, 1500][streamOf(li)];
    this.streamStartViewers = this.viewers;
    this.peak = this.viewers;
    this.loadLevel(li);
  };

  P.loadLevel = function (li) {
    this.li = li;
    this.L = genLevel(li);
    this.fx = {};
    this.poll = null;
    this.pollTimer = 6;
    this.donoTimer = 14 + this.r() * 10;
    this.chatTimer = 0;
    this.cp = { x: this.L.start.x, y: this.L.start.y };
    this.cpHit = false;
    this.state = 'play';
    this.time = 0;
    this.stateT = 0;
    this.spawnPlayer();
    this.say(null, 'Stream ' + (streamOf(li) + 1) + (li === 12 ? ' (FINAL)' : ', part ' + partOf(li)) + ' is LIVE', '#ff4d6d', 'sys');
  };

  P.spawnPlayer = function () {
    var tiny = this.fx.TINY > 0;
    this.p = { x: this.cp.x, y: this.cp.y, w: tiny ? 14 : 22, h: tiny ? 18 : 28, vx: 0, vy: 0, ground: false, coyote: 0, buf: 0, face: 1, inv: 1.2, shield: this.p ? this.p.shield : false, dead: false };
    if (tiny) this.p.y += 10;
  };

  P.say = function (name, text, color, kind) {
    this.chat.push({ name: name, text: text, color: color || '#fff', kind: kind || 'msg', t: 0 });
    if (this.chat.length > 60) this.chat.shift();
  };
  P.viewerSay = function (pool, n) {
    for (var i = 0; i < (n || 1); i++) this.say(mkName(this.r), pick(this.r, pool), pick(this.r, COLORS));
  };
  P.addViewers = function (n) {
    this.viewers = Math.max(1, Math.round(this.viewers + n));
    if (this.viewers > this.peak) this.peak = this.viewers;
  };

  P.gsign = function () { return this.fx.FLIP > 0 ? -1 : 1; };
  P.timeScale = function () { var s = 1; if (this.fx.SPEED > 0) s *= 1.45; if (this.fx.SLOW > 0) s *= 0.6; return s; };

  P.startPoll = function () {
    var n = this.L.boss ? 4 : 3, keys = CHAOS_KEYS.slice(), opts = [];
    while (opts.length < n) opts.push(keys.splice(Math.floor(this.r() * keys.length), 1)[0]);
    this.poll = { opts: opts, votes: opts.map(function () { return 0; }), bias: opts.map(function () { return 0.5 + Math.random(); }), t: this.L.boss ? 5 : 7, dur: this.L.boss ? 5 : 7 };
    this.say(null, 'POLL: what should happen next? Type the number!', '#ffd23f', 'sys');
    this.sfx('poll');
  };

  P.applyChaos = function (k) {
    var def = CHAOS_FX[k];
    this.banner = { text: 'CHAT VOTED: ' + def.label, t: 2.2, color: '#ff4d6d' };
    this.sfx('chaos');
    var self = this, p = this.p;
    if (k === 'SPAWN') {
      for (var i = 0; i < 3; i++) this.L.enemies.push(mkEnemy(p.x + 260 + i * 110 + this.r() * 40, -40 - i * 30, true));
    } else if (k === 'HARDER') {
      var ptx = Math.floor(p.x / T), placed = 0, last = -5, L = this.L;
      for (var tx = ptx + 7; tx < Math.min(L.W - 10, ptx + 34) && placed < 4; tx++) {
        if (tx - last < 3 || this.r() < 0.45) continue;
        if (L.check && Math.abs(tx - L.check.tx) < 2) continue;
        for (var ty = 1; ty < H; ty++) {
          if (solid(L, tx, ty) && tileAt(L, tx, ty - 1) === 0 && solid(L, tx - 1, ty) && solid(L, tx + 1, ty) && tileAt(L, tx - 1, ty - 1) === 0 && tileAt(L, tx + 1, ty - 1) === 0) {
            L.tiles[(ty - 1) * L.W + tx] = 3; placed++; last = tx; break;
          }
          if (solid(L, tx, ty)) break;
        }
      }
      this.L.enemies.push(mkEnemy(p.x + 420, -40, true));
    } else {
      this.fx[k] = def.dur;
      if (k === 'TINY') { p.y += p.h - 18; p.x += (p.w - 14) / 2; p.w = 14; p.h = 18; }
    }
    this.viewerSay(CHAOS, 4);
    this.addViewers(this.viewers * 0.04 + 3);
  };

  P.applyDono = function () {
    var d = pick(this.r, DONOS), p = this.p;
    if (d.key === 'LIFE' && this.lives >= 5) d = DONOS[0];
    if (d.key === 'SHIELD' && p.shield) d = DONOS[2];
    var who = mkName(this.r);
    this.say(who, 'donated ' + d.amt + ': ' + d.label + ' - "' + pick(this.r, DONO_NOTES) + '"', '#ffd23f', 'dono');
    this.banner = { text: who + ' donated: ' + d.label, t: 2, color: '#ffd23f' };
    this.sfx('dono');
    if (d.key === 'SHIELD') p.shield = true;
    else if (d.key === 'LIFE') this.lives++;
    else if (d.key === 'SLOW') this.fx.SLOW = 6;
    else if (d.key === 'CLEAN') {
      var L = this.L;
      L.enemies.forEach(function (e) { if (Math.abs(e.x - p.x) < 700) e.dead = true; });
      for (var i = 0; i < L.tiles.length; i++) if (L.tiles[i] === 3) L.tiles[i] = 0;
      var worst = null, k; for (k in this.fx) if (CHAOS_FX[k] && this.fx[k] > 0 && (!worst || this.fx[k] > this.fx[worst])) worst = k;
      if (worst) { this.fx[worst] = 0; this.endFx(worst); }
    }
  };

  P.endFx = function (k) {
    var p = this.p;
    if (k === 'TINY') {
      var nw = 22, nh = 28; p.x -= (nw - p.w) / 2;
      if (this.gsign() > 0) p.y -= (nh - p.h);
      p.w = nw; p.h = nh;
      // unstick if growing put us in a wall
      var L = this.L;
      for (var tries = 0; tries < 6 && this.overlapsSolid(p); tries++) p.y += this.gsign() > 0 ? -8 : 8;
    }
  };
  P.overlapsSolid = function (o) {
    var L = this.L;
    for (var tx = Math.floor(o.x / T); tx <= Math.floor((o.x + o.w - 0.01) / T); tx++)
      for (var ty = Math.floor(o.y / T); ty <= Math.floor((o.y + o.h - 0.01) / T); ty++) if (solid(L, tx, ty)) return true;
    return false;
  };

  P.hurt = function () {
    var p = this.p;
    if (p.inv > 0 || p.dead) return;
    if (p.shield) { p.shield = false; p.inv = 1.4; this.sfx('shield'); this.viewerSay(['shield carried', 'saved by the dono', 'THANK THE DONOR'], 1); return; }
    this.die();
  };
  P.die = function () {
    var p = this.p;
    if (p.dead) return;
    p.dead = true; p.deadT = 0;
    this.lives--;
    this.sfx('die');
    this.addViewers(-Math.max(2, this.viewers * 0.07));
    this.viewerSay(DEATH, 4);
  };

  P.update = function (dt, input) {
    dt = Math.min(dt, 0.05);
    this.stateT += dt;
    var i;
    for (i = 0; i < this.chat.length; i++) this.chat[i].t += dt;
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    if (this.state !== 'play') return;
    var sdt = dt * this.timeScale();
    this.time += dt;
    this.updateChat(dt);
    this.updateFx(dt);
    var p = this.p;
    if (p.dead) {
      p.deadT += dt;
      if (p.deadT > 1.1) {
        if (this.lives <= 0) { this.state = 'over'; this.stateT = 0; this.sfx('over'); }
        else { this.spawnPlayer(); }
      }
      return;
    }
    this.updatePlayer(sdt, input);
    this.updateEnemies(sdt);
    this.checkStuff();
  };

  P.updateChat = function (dt) {
    // regular chatter, scaled by viewers
    this.chatTimer -= dt;
    var rate = 0.9 + Math.min(5, this.viewers / 300);
    if (this.chatTimer <= 0) {
      this.chatTimer = (0.5 + this.r()) / rate;
      if (this.poll && this.r() < 0.75) {
        var j = this.weightedVote();
        var n = 1 + Math.floor(this.viewers / 100 * this.r());
        this.poll.votes[j] += n;
        this.say(mkName(this.r), (this.r() < 0.7 ? '' + (j + 1) : (j + 1) + ' ' + pick(this.r, ['!!!', 'easy', 'do it', 'pls', 'trust', 'for the content'])), pick(this.r, COLORS));
      } else this.viewerSay(IDLE, 1);
    }
    // slow passive viewer growth
    this.addViewers((this.r() - 0.35) * dt * (2 + this.viewers * 0.01));
    // polls
    if (this.poll) {
      this.poll.t -= dt;
      if (this.poll.t <= 0) {
        var best = 0; for (var k = 1; k < this.poll.opts.length; k++) if (this.poll.votes[k] > this.poll.votes[best]) best = k;
        var win = this.poll.opts[best];
        this.poll = null;
        this.pollTimer = this.L.boss ? 7 : 13 + this.r() * 5;
        this.applyChaos(win);
      }
    } else {
      this.pollTimer -= dt;
      if (this.pollTimer <= 0) this.startPoll();
    }
    this.donoTimer -= dt;
    if (this.donoTimer <= 0) { this.donoTimer = 22 + this.r() * 16; this.applyDono(); }
  };
  P.weightedVote = function () {
    var b = this.poll.bias, s = 0, i; for (i = 0; i < b.length; i++) s += b[i];
    var x = this.r() * s; for (i = 0; i < b.length; i++) { x -= b[i]; if (x <= 0) return i; }
    return 0;
  };

  P.updateFx = function (dt) {
    for (var k in this.fx) {
      if (this.fx[k] > 0) {
        var before = this.fx[k];
        this.fx[k] -= dt;
        if (this.fx[k] <= 0) { this.fx[k] = 0; this.endFx(k); }
        else if (Math.ceil(before) !== Math.ceil(this.fx[k]) && this.fx[k] < 3 && CHAOS_FX[k]) this.sfx('tick');
      }
    }
  };

  P.updatePlayer = function (dt, inp) {
    var p = this.p, g = this.gsign();
    var left = inp.left, right = inp.right;
    if (this.fx.REVERSE > 0) { var t = left; left = right; right = t; }
    var dir = (right ? 1 : 0) - (left ? 1 : 0);
    var accel = p.ground ? 2600 : 1700;
    if (dir) { p.vx += dir * accel * dt; p.face = dir; }
    else { var f = (p.ground ? 2400 : 900) * dt; if (Math.abs(p.vx) <= f) p.vx = 0; else p.vx -= Math.sign(p.vx) * f; }
    var max = RUN * (this.fx.TINY > 0 ? 1.1 : 1);
    if (p.vx > max) p.vx = max; if (p.vx < -max) p.vx = -max;
    if (inp.jumpPressed) p.buf = 0.13;
    p.buf -= dt; p.coyote -= dt; p.inv -= dt;
    var gm = this.fx.MOON > 0 ? 0.45 : 1;
    var jv = JUMP * (this.fx.MOON > 0 ? 0.78 : 1) * (this.fx.TINY > 0 ? 0.9 : 1);
    var wantJump = p.buf > 0 || (this.fx.BOUNCY > 0 && p.ground);
    if (wantJump && (p.ground || p.coyote > 0)) {
      p.vy = -jv * g * (this.fx.BOUNCY > 0 && !(p.buf > 0) ? 0.85 : 1);
      p.ground = false; p.coyote = 0; p.buf = 0; this.sfx('jump');
    }
    if (!inp.jump && p.vy * g < -200 && this.fx.BOUNCY <= 0) p.vy = -200 * g; // variable jump height
    p.vy += GRAV * gm * g * dt;
    var term = 900; if (p.vy > term) p.vy = term; if (p.vy < -term) p.vy = -term;
    var res = moveBox(this.L, p, p.vx * dt, p.vy * dt, g);
    if (res.hitX) p.vx = 0;
    if (res.hitY) p.vy = 0;
    if (res.landed) { p.ground = true; p.coyote = 0.1; }
    else { if (p.ground) p.coyote = 0.1; p.ground = false; }
    // grounded check when standing still (no movement into floor this frame)
    if (!p.ground) {
      var probe = { x: p.x, y: p.y + g * 1.5, w: p.w, h: p.h };
      if (this.overlapsSolid(probe) && p.vy * g >= 0) { p.ground = true; }
    }
    if (p.y > this.L.H * T + 40) this.die();
  };

  P.updateEnemies = function (dt) {
    var L = this.L, p = this.p, g = this.gsign();
    for (var i = 0; i < L.enemies.length; i++) {
      var e = L.enemies[i];
      if (e.dead) { e.squash += dt; continue; }
      if (Math.abs(e.x - p.x) > 900 && !e.spawned) continue;
      e.vy = Math.min(900, e.vy + GRAV * dt);
      var res = moveBox(L, e, e.vx * dt, e.vy * dt, 1);
      if (res.hitY) e.vy = 0;
      if (res.hitX) e.vx = -e.vx;
      else if (res.landed) {
        // turn at ledges
        var ahead = e.vx > 0 ? Math.floor((e.x + e.w + 2) / T) : Math.floor((e.x - 2) / T);
        var below = Math.floor((e.y + e.h + 4) / T);
        if (!solid(L, ahead, below)) e.vx = -e.vx;
      }
      if (e.y > L.H * T + 60) { e.dead = true; e.squash = 99; continue; }
      // contact with player
      if (!p.dead && p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
        var stomp = g > 0 ? (p.vy > 0 && p.y + p.h - e.y < 16) : (p.vy < 0 && e.y + e.h - p.y < 16);
        if (stomp) {
          e.dead = true; e.squash = 0;
          p.vy = -420 * g; this.sfx('stomp');
          this.addViewers(5 + this.viewers * 0.01);
          if (this.r() < 0.6) this.viewerSay(STOMP, 1);
        } else this.hurt();
      }
    }
  };

  P.checkStuff = function () {
    var L = this.L, p = this.p, i;
    // coins (likes)
    for (i = 0; i < L.coins.length; i++) {
      var c = L.coins[i];
      if (!c.got && Math.abs(p.x + p.w / 2 - c.x) < 18 && Math.abs(p.y + p.h / 2 - c.y) < 22) {
        c.got = true; this.sfx('coin'); this.addViewers(2 + this.viewers * 0.006);
        if (this.r() < 0.2) this.viewerSay(COIN, 1);
      }
    }
    // spikes
    var x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w) / T), y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h) / T);
    for (var tx = x0; tx <= x1; tx++) for (var ty = y0; ty <= y1; ty++) {
      var v = tileAt(L, tx, ty);
      if (v === 2 || v === 3) {
        if (p.x + p.w > tx * T + 7 && p.x < tx * T + T - 7 && p.y + p.h > ty * T + 14 && p.y < ty * T + T) this.hurt();
      }
    }
    // checkpoint
    if (!this.cpHit && L.check && p.x > L.check.x - 10) {
      this.cpHit = true; this.cp = { x: L.check.x, y: L.check.y };
      this.say(null, 'Checkpoint saved (chat clipped it)', '#5cf2b8', 'sys'); this.sfx('check');
    }
    // goal
    var G = L.goal;
    if (p.x + p.w > G.x && p.x < G.x + G.w) {
      this.state = 'clear'; this.stateT = 0; this.poll = null;
      this.addViewers(10 + this.viewers * 0.12);
      this.viewerSay(CLEAR, 5);
      this.sfx('clear');
    }
  };

  // go to next level; returns 'next' | 'newstream' | 'win'
  P.advance = function () {
    var nl = this.li + 1;
    if (nl >= LEVELS) { this.state = 'win'; return 'win'; }
    var ns = streamOf(nl) !== streamOf(this.li);
    if (ns) {
      this.lives = 3;
      this.viewers = Math.max(this.viewers, [12, 140, 600, 1500][streamOf(nl)]);
      this.streamStartViewers = this.viewers;
    }
    var shield = this.p.shield;
    this.loadLevel(nl);
    this.p.shield = shield;
    return ns ? 'newstream' : 'next';
  };
  P.retryStream = function () {
    var first = this.li >= 12 ? 12 : Math.floor(this.li / 4) * 4;
    var v = this.streamStartViewers;
    this.reset(first);
    this.viewers = v; this.streamStartViewers = v;
  };

  var api = { Game: Game, genLevel: genLevel, tileAt: tileAt, T: T, H: H, STREAMS: STREAMS, LEVELS: LEVELS, streamOf: streamOf, partOf: partOf, CHAOS_FX: CHAOS_FX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CS = api;
})(this);
