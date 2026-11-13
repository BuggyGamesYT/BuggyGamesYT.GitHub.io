// Patch Notes - game core (physics, levels, glitches). No DOM in here.
// Copyright (c) 2026 Buggy Games YT. All Rights Reserved.
(function (root) {
  'use strict';
  const T = 32, GRAV = 0.6, MAXFALL = 14, JUMPV = -11.2, WALLJUMPV = -10.8, WALK = 3.6;
  const DASHV = 16, DASHF = 9, LAUNCHV = -21, VOID_FLOOR = 40, HYPERV = 14;

  const GLITCHES = {
    clip: 'Speed Clip',
    walljump: 'Wall Jump',
    dupe: 'Key Dupe',
    ledge: 'Ledge Clip',
    launch: 'Crate Launch',
    oob: 'Out of Bounds',
    hyper: 'Hyper Jump',
    iframes: 'Dash I-Frames',
    deathkey: 'Respawn Keep',
    pauseclip: 'Pause Clip'
  };
  const START_LIVE = ['clip', 'walljump', 'dupe', 'ledge', 'launch', 'oob'];

  // Level ops: [char, x, y, w, h]. '#' wall, '|' thin wall, 'L' cracked ceiling, 'D' locked door,
  // 'K' key, 'B' hidden bug (collectible), 'C' crate, 'E' exit, '^' spikes, 'P' start.
  const box = (w, h) => [['#', 0, 0, w, 1], ['#', 0, h - 1, w, 1], ['#', 0, 0, 1, h], ['#', w - 1, 0, 1, h]];
  const LEVELS = [
    { name: 'Hello World', w: 30, h: 17, need: 0, ops: [...box(30, 17), ['|', 18, 1, 1, 15], ['P', 3, 15], ['E', 25, 15], ['B', 10, 13]],
      hint: 'Dashing (Shift) into thin striped walls at full speed may let players clip through them. Please do not do this.',
      notes: { ver: '1.0.1', lines: ['Fixed players phasing through thin walls while dashing. Walls are now 400% more wall.', 'Removed the "speed" from "speedrunning".', 'Known issue: players can jump off walls. That is not a feature. Please stop.'], patch: ['clip'] } },
    { name: 'The Shaft', w: 24, h: 17, need: 0, ops: [...box(24, 17), ['#', 12, 1, 1, 12], ['#', 16, 4, 7, 12], ['P', 3, 15], ['E', 20, 3], ['B', 14, 8]],
      hint: 'Players report jumping again while touching a wall. Our physics team says that is impossible.',
      notes: { ver: '1.0.2', lines: ['Wall jumping removed. Walls are for leaning on, not climbing.', 'Gravity now applies near walls. It always did. Walls were just ignoring it.', 'Known issue: pausing at the exact moment you grab a key. Do not.'], patch: ['walljump'] } },
    { name: 'Locksmith', w: 26, h: 17, need: 2, ops: [...box(26, 17), ['D', 17, 1, 1, 15], ['#', 6, 13, 5, 1], ['K', 8, 12], ['P', 3, 15], ['E', 22, 15], ['B', 8, 10]],
      hint: 'This door takes 2 keys and we only placed 1. Pausing (P) right as you grab a key sometimes gives you two. Do not do this.',
      notes: { ver: '1.0.3', lines: ['Keys can no longer be duplicated by pausing. The pause menu is now read only.', 'Key economy restored. The locksmith union has called off the strike.', 'Known issue: something about cracked ceilings. We will look at it Monday.'], patch: ['dupe'] } },
    { name: 'Crawlspace', w: 26, h: 17, need: 0, ops: [...box(26, 17), ['#', 1, 12, 24, 1], ['L', 1, 12], ['^', 10, 11, 2, 1], ['P', 6, 15], ['E', 22, 11], ['B', 18, 14]],
      hint: 'Jumping into a corner under a cracked ceiling while holding toward the wall... we do not want to talk about it.',
      notes: { ver: '1.0.4', lines: ['Cracked ceilings are now just ceilings. We sent the intern up there with some glue.', 'Players can no longer phase upward by hugging corners.', 'Known issue: crates. Just crates in general.'], patch: ['ledge'] } },
    { name: 'Liftoff', w: 26, h: 17, need: 0, ops: [...box(26, 17), ['#', 16, 7, 9, 9], ['C', 9, 15], ['P', 3, 15], ['E', 22, 6], ['B', 3, 12]],
      hint: 'Pressing Grab (E) while standing on a crate does something very wrong. Physics team is on vacation.',
      notes: { ver: '1.0.5', lines: ['Crates are no longer powered by rocket fuel.', 'Grabbing a crate you are standing on no longer launches you into orbit. NASA has stopped emailing us.', 'Known issue: the floor has a bottom. Please do not look under it.'], patch: ['launch'] } },
    { name: 'Under Construction', w: 30, h: 17, need: 0, ops: [['#', 0, 0, 30, 1], ['#', 0, 0, 1, 17], ['#', 29, 0, 1, 17], ['#', 1, 14, 7, 3], ['#', 11, 14, 9, 3], ['#', 20, 0, 1, 17], ['#', 21, 16, 2, 1], ['#', 24, 16, 5, 1], ['P', 3, 13], ['E', 26, 15], ['B', 5, 10]],
      hint: 'The exit room has no door yet. Also, dashing while falling into a pit... you do not die? Where do you even go?',
      notes: { ver: '1.0.6', lines: ['Removed the floor below the floor.', 'Dashing no longer makes you immune to the void.', 'Oops: this build accidentally reverted the 1.0.2 wall jump fix. We will get it next time.'], patch: ['oob'], restore: ['walljump'] } },
    { name: 'Regression', w: 24, h: 17, need: 0, ops: [...box(24, 17), ['#', 4, 5, 19, 11], ['^', 10, 4, 2, 1], ['^', 16, 4, 2, 1], ['P', 2, 15], ['E', 21, 4], ['B', 2, 9]],
      hint: 'The wall jump fix got reverted by accident. Ignore that. Do not climb anything.',
      notes: { ver: '1.0.7', lines: ['Wall jumping removed. Again. For real this time. We put it in a jar.', 'Hotfix: rolled wall physics back to 1.0.0 to stop crates crashing the game.', 'Side effects of the rollback: unknown. Probably fine.'], patch: ['walljump'], restore: ['clip'] } },
    { name: 'Rollback', w: 35, h: 17, need: 0, ops: [...box(35, 17), ['|', 8, 1, 1, 15], ['|', 15, 1, 1, 15], ['|', 23, 1, 1, 15], ['^', 20, 15, 3, 1], ['P', 3, 15], ['E', 31, 15], ['B', 12, 13]],
      hint: 'Since the rollback, thin walls feel thin again. Dash only once per jump. Mind the spikes.',
      notes: { ver: '1.0.8', lines: ['Thin walls are thick now. Again.', 'Somehow key duplication is back. Nobody touched the pause menu. We are scared.', 'Added a second person to count keys.'], patch: ['clip'], restore: ['dupe'] } },
    { name: 'Double Trouble', w: 30, h: 17, need: 2, ops: [...box(30, 17), ['D', 10, 1, 1, 15], ['D', 20, 1, 1, 15], ['K', 5, 15], ['#', 13, 13, 5, 1], ['K', 15, 12], ['P', 2, 15], ['E', 26, 15], ['B', 15, 9]],
      hint: 'Two doors, two keys each, one key per room. Key duplication is back and we have no idea how.',
      notes: { ver: '1.0.9', lines: ['Duplication fixed, again. Keys are now counted by two people who do not like each other.', 'Merged an old branch from a dev who "left the company". Do not worry about it.', 'Cracked ceilings and crates may be acting up. Unrelated, surely.'], patch: ['dupe'], restore: ['ledge', 'launch'] } },
    { name: 'Merge Conflict', w: 28, h: 17, need: 0, ops: [...box(28, 17), ['#', 1, 12, 26, 1], ['L', 1, 12], ['#', 18, 3, 9, 9], ['C', 11, 11], ['P', 20, 15], ['E', 23, 2], ['B', 25, 14]],
      hint: 'The old branch brought back cracked ceilings AND rocket crates. Two bugs, one level.',
      notes: { ver: '1.0.10', lines: ['Removed cracked ceilings and rocket crates for good.', 'New feature: dash momentum! Jumping mid-dash now keeps some of your speed. Totally intended.', 'Known issue: it keeps ALL of your speed.'], patch: ['ledge', 'launch'], restore: ['hyper'] } },
    { name: 'Momentum', w: 34, h: 17, need: 0, ops: [['#', 0, 0, 34, 1], ['#', 0, 0, 1, 17], ['#', 33, 0, 1, 17], ['#', 1, 16, 8, 1], ['#', 21, 16, 12, 1], ['P', 3, 15], ['E', 30, 15], ['B', 15, 12]],
      hint: 'Dash and jump at the same time keeps ALL your dash speed. The gap is way too wide without it. Run at the gap and press Dash (Shift) and Jump together a few steps before the edge.',
      notes: { ver: '1.1.1', lines: ['Dash momentum nerfed into the ground. Jumping now politely asks your speed to leave.', 'New accessibility option: you are invincible while dashing. For fairness.', 'Known issue: spikes do not count as damage while dashing. Working as intended?'], patch: ['hyper'], restore: ['iframes'] } },
    { name: 'Spike Tunnel', w: 30, h: 17, need: 0, ops: [...box(30, 17), ['#', 8, 1, 14, 14], ['^', 12, 15, 2, 1], ['P', 3, 15], ['E', 26, 15], ['B', 4, 13]],
      hint: 'No room to jump in here. Spikes cannot hurt you while you are mid-dash (Shift). We call that a feature.',
      notes: { ver: '1.1.2', lines: ['Removed dash invincibility. Spikes are spiky again.', 'Added checkpoints! Respawning now keeps whatever you were holding.', 'Known issue: "whatever you were holding" includes keys. And the keys respawn too.'], patch: ['iframes'], restore: ['deathkey'] } },
    { name: 'Save Scum', w: 26, h: 17, need: 3, ops: [...box(26, 17), ['D', 17, 1, 1, 15], ['K', 8, 15], ['^', 12, 15, 1, 1], ['P', 3, 15], ['E', 22, 15], ['B', 2, 12]],
      hint: 'Door needs 3 keys and there is 1. Die while holding a key and you respawn with it, and the key comes back. The spikes are right there...',
      notes: { ver: '1.1.3', lines: ['Dying now takes your keys away. As it should.', 'Rolled physics back to 1.0.0 to fix checkpoints. Thin walls and dash momentum may have come back with it.', 'Known issue: yes, both of them came back.'], patch: ['deathkey'], restore: ['clip', 'hyper'] } },
    { name: 'Fast Travel', w: 40, h: 17, need: 0, ops: [['#', 0, 0, 40, 1], ['#', 0, 0, 1, 17], ['#', 39, 0, 1, 17], ['#', 1, 16, 8, 1], ['#', 21, 16, 18, 1], ['|', 30, 1, 1, 15], ['P', 3, 15], ['E', 36, 15], ['B', 26, 13]],
      hint: 'A huge gap AND a thin wall. Hyper jump across (Dash and Jump together), land, then dash (Shift) through the striped wall.',
      notes: { ver: '1.1.4', lines: ['Thin walls and momentum fixed. Again. We have a whiteboard counting how many times.', 'Reverted wall physics to an old build to fix the whiteboard app.', 'Known issue: walls are climbable and spikes are optional again. Not our best week.'], patch: ['clip', 'hyper'], restore: ['walljump', 'iframes'] } },
    { name: 'Spike Ceiling', w: 24, h: 17, need: 0, ops: [...box(24, 17), ['#', 12, 1, 1, 12], ['#', 16, 4, 7, 12], ['#', 17, 1, 6, 2], ['^', 18, 3, 2, 1], ['P', 3, 15], ['E', 21, 3], ['B', 14, 7]],
      hint: 'Wall jump up the shaft, then dash (Shift) through the spikes at the top. Invincibility frames are back somehow.',
      notes: { ver: '1.1.5', lines: ['Wall jumps and i-frames removed. They are in the jar with the other wall jumps.', 'The key counting team quit. We replaced them with a spreadsheet.', 'Known issue: the spreadsheet has duplicate rows. And it remembers keys after you die.'], patch: ['walljump', 'iframes'], restore: ['dupe', 'deathkey'] } },
    { name: 'Key Farm', w: 26, h: 17, need: 4, ops: [...box(26, 17), ['D', 17, 1, 1, 15], ['K', 8, 15], ['^', 12, 15, 1, 1], ['P', 3, 15], ['E', 22, 15], ['B', 20, 12]],
      hint: 'Door needs 4 keys. Pausing (P) right as you grab a key duplicates it, and dying keeps your keys. Farm away.',
      notes: { ver: '1.1.6', lines: ['Keys can no longer be farmed. The spreadsheet has been deleted.', 'Restored the level editor from a backup we found in the basement. It brought some old friends.', 'Known issue: there is a floor under the floor again, and the ceiling is cracked.'], patch: ['dupe', 'deathkey'], restore: ['oob', 'ledge'] } },
    { name: 'Basement', w: 30, h: 17, need: 0, ops: [['#', 0, 0, 30, 1], ['#', 0, 0, 1, 17], ['#', 29, 0, 1, 17], ['#', 1, 14, 7, 3], ['#', 11, 14, 9, 3], ['#', 20, 0, 1, 17], ['#', 21, 16, 2, 1], ['#', 24, 16, 5, 1], ['#', 21, 12, 8, 1], ['L', 28, 12], ['P', 3, 13], ['E', 25, 11], ['B', 15, 11]],
      hint: 'Dash in the air over the pit to fall under the map. Come up on the other side, then jump into the cracked corner while holding toward the wall.',
      notes: { ver: '1.1.7', lines: ['Removed the floor under the floor. Permanently. We poured concrete.', 'Glued the cracked ceilings. With better glue this time.', 'Known issue: crates found the rocket fuel again, and dashing makes you spike-proof. We are so tired.'], patch: ['oob', 'ledge'], restore: ['launch', 'iframes'] } },
    { name: 'Rocket Science', w: 26, h: 17, need: 0, ops: [...box(26, 17), ['#', 12, 5, 13, 11], ['#', 14, 1, 11, 3], ['^', 15, 4, 3, 1], ['C', 6, 15], ['P', 3, 15], ['E', 22, 4], ['B', 9, 13]],
      hint: 'The shelf is way too high. Push the crate over, stand on it and Grab (E). Then dash (Shift) through the spikes up top.',
      notes: { ver: '1.1.8', lines: ['Crates are decaf now. I-frames removed.', 'Every known glitch has been fixed. QA signed off. QA is my cousin.', 'Known issue: the pause menu. It is always the pause menu.'], patch: ['launch', 'iframes'] } },
    { name: 'Gold Master', w: 26, h: 17, need: 0, ops: [...box(26, 17), ['#', 14, 1, 3, 15], ['P', 4, 15], ['E', 22, 15], ['B', 8, 13]],
      hint: 'All glitches removed. Every single one. The pause menu is totally safe. Totally.',
      notes: { ver: '2.0.0', lines: ['Removed the pause menu.', 'Removed walls you can pause through. It was all the walls.', 'Patch Notes is now officially 100% glitch free. Thanks for playing!'], patch: ['pauseclip'] } }
  ];


  // ---------- Randomized levels: every player gets their own set of 100, built from a seed ----------
  // Hand-made glitch rooms are the building blocks; NEEDS lists the glitches each room is built around.
  const ROOMS = LEVELS.splice(0, LEVELS.length);
  const FINALE = ROOMS.pop();
  const NEEDS = [['clip'], ['walljump'], ['dupe'], ['ledge'], ['launch'], ['oob'], ['walljump'], ['clip'], ['dupe'], ['ledge', 'launch'],
    ['hyper'], ['iframes'], ['deathkey'], ['hyper', 'clip'], ['walljump', 'iframes'], ['dupe', 'deathkey'], ['oob', 'ledge'], ['launch', 'iframes']];
  ROOMS.forEach((R, i) => { R.live = NEEDS[i]; R.tpl = i; });
  FINALE.live = ['pauseclip']; FINALE.tpl = 99;
  const TOTAL = 100;
  const NAMES_A = ['Null', 'Legacy', 'Spaghetti', 'Hotfix', 'Crunch', 'Day One', 'Off By One', 'Race', 'Stack', 'Memory', 'Feature', 'Force Push', 'Cherry Pick', 'Code Freeze', 'Merge', 'Edge', 'Infinite', 'Broken', 'Cursed', 'Unpatched', 'Beta', 'Alpha', 'Nightly', 'Rollback', 'Ghost', 'Hello', 'Deprecated', 'Async', 'Undefined', 'Zero Day'];
  const NAMES_B = ['Pointer', 'Code', 'Overflow', 'Leak', 'Condition', 'Case', 'Loop', 'Branch', 'Build', 'Creep', 'Patch', 'Crash', 'Hitbox', 'Collision', 'Frame', 'Physics', 'Save', 'Spawn', 'Exception', 'Commit', 'World', 'Shaft', 'Basement', 'Tunnel', 'Farm'];
  const PATCH_LINE = {
    clip: ['Thin walls thickened. Again.', 'Speed clipping patched. Walls have been told to try harder.', 'Walls are now 400% more wall.'],
    walljump: ['Wall jumping removed and the jar has been sealed.', 'Walls are no longer stairs.', 'Gravity now applies near walls.'],
    dupe: ['Key duplication fixed. The pause menu is on probation.', 'Keys now have serial numbers.', 'Keys are counted by two people who do not like each other.'],
    ledge: ['Cracked ceilings re-glued.', 'Corners are no longer doors.', 'Sent the intern up there with some glue.'],
    launch: ['Crates de-rocketed.', 'Grabbing crates no longer files a flight plan.', 'NASA has stopped emailing us.'],
    oob: ['Floor under the floor removed. More concrete.', 'The void is closed for maintenance.'],
    hyper: ['Dash momentum nerfed.', 'Jumping now drops your speed like it is hot.'],
    iframes: ['Spikes are spiky again, even mid-dash.', 'Dash invincibility revoked.'],
    deathkey: ['Dying takes your keys again.', 'Checkpoints no longer remember keys.'],
    pauseclip: ['Removed the pause menu.']
  };
  const ISSUE_LINE = {
    clip: 'thin walls feel thin', walljump: 'walls feel climbable', dupe: 'pausing near keys acts weird', ledge: 'cracked ceilings are cracking',
    launch: 'crates smell like rocket fuel', oob: 'there is a floor under the floor', hyper: 'dash momentum is back', iframes: 'spikes forget to hurt dashers', deathkey: 'keys survive death', pauseclip: 'the pause menu'
  };
  const FILLER = ['Hired 81 new level designers. None of them talked to each other.', 'Fixed a typo in the credits. Introduced 4 new bugs.', 'QA has been replaced with a rubber duck.', 'Optimized the game. It now crashes 12% faster.',
    'Removed a comment that said "do not remove this comment". Things got worse.', 'Updated the engine. Nobody knows what changed.', 'The intern found the backup branch. We are investigating.',
    'Shuffled every level so speedrunners stop memorizing them. You are welcome.', 'Renamed bugs to "surprise mechanics".', 'Greg is on vacation. Greg wrote this patch on vacation.',
    'Level layouts are now randomly generated. Our level designer has been freed.', 'Added more spikes. Spikes are cheap.', 'Rolled back the rollback.', 'Merged 37 branches at once. What could go wrong.',
    'QA signed off. QA is my cousin.', 'Your copy of the game is unique. So are your bugs.'];

  let seedNow = 0;
  function rng(seed) { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

  // where each hand-made room is entered (its spawn) and left (its exit door)
  const META = new Map();
  function meta(R) {
    if (META.has(R)) return META.get(R);
    const g = build(R); let sx = 2, sy = 15, er = 15, ec = R.w - 2;
    for (let r = 0; r < R.h; r++) for (let c = 0; c < R.w; c++) { if (g[r][c] === 'P') { sx = c; sy = r; } if (g[r][c] === 'E') { er = r; ec = c; } }
    const m = { sx, sy, er, ec, g }; META.set(R, m); return m;
  }

  // an obstacle run piece: starts at floor row f0 (a tower if the last room's exit was high up), ends at floor row f1
  function makeRun(rnd, n, A, f0, f1) {
    const F = 16, ops = [['#', 0, 0, A, 1]];
    const ground = new Array(A).fill(F);
    for (let c = 0; c < 3; c++) ground[c] = f0;
    for (let c = A - 3; c < A; c++) ground[c] = f1;
    const bits = [];
    let x = f0 < 14 ? 13 : 6;
    const kinds = n < 6 ? ['spike', 'block', 'pit'] : ['spike', 'spike', 'block', 'pit', 'pit', 'tall', 'step', 'spikepit'];
    while (x < A - 6) {
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      let w = 1;
      if (kind === 'spike' || kind === 'pit') w = 1 + (rnd() < Math.min(0.7, 0.2 + n / 100) ? 1 : 0) + (n > 40 && rnd() < 0.25 ? 1 : 0);
      if (kind === 'step') w = 3 + Math.floor(rnd() * 3);
      if (x + w > A - 6) break;
      bits.push([kind, x, w]);
      x += w + 3 + Math.floor(rnd() * 3) + (kind === 'spikepit' ? 1 : 0);
    }
    for (const [kind, bx, w] of bits) {
      if (kind === 'pit') for (let c = bx; c < bx + w; c++) ground[c] = 99;
      if (kind === 'step') for (let c = bx; c < bx + w; c++) ground[c] = F - 1;
    }
    for (let c = 0; c < A; c++) if (ground[c] < 99) ops.push(['#', c, ground[c], 1, 17 - ground[c]]);
    for (const [kind, bx, w] of bits) {
      if (kind === 'spike') ops.push(['^', bx, F - 1, w, 1]);
      else if (kind === 'block') ops.push(['#', bx, F - 1, 1, 1]);
      else if (kind === 'tall') ops.push(['#', bx, F - 2, 1, 2]);
      else if (kind === 'spikepit') { ops.push(['.', bx, F, 1, 17 - F]); ops.push(['^', bx + 1, F - 1, 1, 1]); }
    }
    return ops;
  }

  // one long level: run, puzzle room, run, puzzle room ... all side by side in one wide map
  function stitch(rnd, n, rooms, bugAt) {
    const ops = [], regions = [];
    let off = 0, f0 = 16;
    rooms.forEach((R, k) => {
      const m = meta(R);
      const A = 14 + Math.min(30, Math.floor(n * 0.35)) + Math.floor(rnd() * 8);
      const f1 = m.sy + 1;
      for (const o of makeRun(rnd, n, A, f0, f1)) { const q = o.slice(); q[1] += off; ops.push(q); }
      if (k === 0) { ops.push(['#', 0, 0, 1, 17]); ops.push(['P', 1, f0 - 1]); }
      regions.push({ x0: off, x1: off + A, live: R.live, need: 0, room: -1, spawn: { c: off + 1, r: f0 - 1 } });
      off += A;
      for (const o of R.ops) {
        if (o[0] === 'P' || (o[0] === 'B' && k !== bugAt)) continue;
        const q = o.slice(); q[1] += off; if (q[0] === 'E' && k < rooms.length - 1) q[0] = 'X'; ops.push(q);
      }
      ops.push(['.', off, m.sy - 1, 1, 2]);
      const hole = k < rooms.length - 1 ? { c: off + R.w - 1, rows: m.g[m.er - 1][R.w - 2] === '.' ? [m.er - 1, m.er] : [m.er] } : null;
      regions.push({ hole, x0: off, x1: off + R.w, live: R.live, need: R.need || 0, room: k, tpl: R.tpl, hint: R.hint, spawn: { c: m.sx + off, r: m.sy }, door: { c: off, r: m.sy - 1, wall: [m.g[m.sy - 1][0], m.g[m.sy][0]] } });
      off += R.w;
      f0 = Math.min(16, m.er + 1);
    });
    return { w: off, h: 17, need: 0, ops, regions };
  }

  function generate(seed) {
    seedNow = seed >>> 0;
    const rnd = rng(seedNow);
    const pick = a => a[Math.floor(rnd() * a.length)];
    const single = ROOMS.filter(R => R.live.length === 1);
    LEVELS.length = 0;
    let recent = [];
    for (let n = 0; n < TOTAL; n++) {
      const final = n === TOTAL - 1;
      const count = final ? 4 : n < 4 ? 1 : n < 15 ? 2 : n < 35 ? 3 : n < 65 ? 4 : 5;
      const pool = n < 4 ? single : n < 10 ? single.concat(ROOMS.slice(10, 13)) : ROOMS;
      const rooms = [];
      while (rooms.length < count - (final ? 1 : 0)) {
        const R = pick(pool);
        if (rooms.includes(R) || (recent.includes(R) && rnd() < 0.7)) continue;
        rooms.push(R);
      }
      if (final) rooms.push(FINALE);
      recent = rooms.slice();
      const bugAt = Math.floor(rnd() * rooms.length);
      const L = stitch(rnd, n, rooms, bugAt);
      const live = new Set(); rooms.forEach(R => R.live.forEach(g => live.add(g)));
      const name = final ? 'Gold Master' : pick(NAMES_A) + ' ' + pick(NAMES_B);
      const hint = rooms.length === 1 ? rooms[0].hint : rooms.map((R, k) => 'Puzzle ' + (k + 1) + ': ' + R.hint).join(' ');
      LEVELS.push(Object.assign(L, { name, puzzles: rooms.length, live: [...live], tpl: rooms[0].tpl, hint,
        notes: { ver: final ? '2.0.0' : '1.' + Math.floor(n / 10) + '.' + (n % 10) } }));
    }
    for (let i = 0; i < LEVELS.length; i++) {
      const L = LEVELS[i], cur = new Set(L.live), nxt = new Set(i + 1 < LEVELS.length ? LEVELS[i + 1].live : []);
      const patch = [...cur].filter(g => !nxt.has(g)), restore = [...nxt].filter(g => !cur.has(g));
      L.notes.patch = patch; L.notes.restore = i + 1 === LEVELS.length - 1 ? [] : restore;
      if (i === LEVELS.length - 1) { L.notes.lines = FINALE.notes.lines; L.notes.patch = ['pauseclip']; L.notes.restore = []; continue; }
      const lines = [];
      patch.forEach(g => lines.push(pick(PATCH_LINE[g])));
      lines.push(pick(FILLER));
      if (i + 1 === LEVELS.length - 1) lines.push('All glitches gone. Only the pause menu is left, and we are watching it.');
      else if (L.notes.restore.length) lines.push('Known issue: ' + L.notes.restore.map(g => ISSUE_LINE[g]).join(', and ') + '.');
      else lines.push('Known issue: ' + [...nxt].map(g => ISSUE_LINE[g]).join(', and ') + ' (still).');
      L.notes.lines = lines;
    }
    return seedNow;
  }

  function liveFor(idx) { return new Set(LEVELS[idx] ? LEVELS[idx].live : []); }


  function build(L) {
    const g = [];
    for (let y = 0; y < L.h; y++) g.push(new Array(L.w).fill('.'));
    for (const [ch, x, y, w = 1, h = 1] of L.ops) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[y + j][x + i] = ch;
    return g;
  }

  generate(1);

  function Game() { this.events = []; }

  Game.prototype.load = function (idx) {
    const L = LEVELS[idx];
    this.idx = idx; this.L = L;
    this.live = liveFor(idx); this.used = new Set();
    this.keys = 0; this.frame = 0; this.done = false; this.dead = 0; this.doorMsg = 0; this.kept = 0; this.bug = false; this.reveal = 0;
    this.loadRoom(L); this.reg = -1; this.ckpt = 0; this.room = -1; this.stage = 1; this.cleared = new Set();
    if (L.regions) this.region(0);
  };
  Game.prototype.openHole = function (Rg) { for (const r of Rg.hole.rows) this.grid[r][Rg.hole.c] = '.'; };
  // which part of the long level the player is in: sets that part's glitches, door, and checkpoint
  Game.prototype.region = function (k) {
    const L = this.L, Rg = L.regions[k];
    if (this.p.void && this.reg >= 0 && k !== this.reg && !Rg.live.includes('oob')) return this.die('void');
    this.reg = k; this.live = new Set(Rg.live); this.need = Rg.need;
    if (Rg.room >= 0) this.R = Rg;
    if (k > this.ckpt) {
      this.ckpt = k;
      this.spawn = { x: Rg.spawn.c * T + 6, y: (Rg.spawn.r + 1) * T - 28 };
      if (Rg.room >= 0 && Rg.room > this.room) { this.room = Rg.room; this.stage = Rg.room + 2; this.keys = 0; this.kept = 0; this.ev('stage', { room: Rg.room + 1, of: L.puzzles }); }
    }
  };

  // a generated level has two stages: the obstacle run (L), then the glitch room (L.room). Dying in stage 2 respawns in stage 2.
  Game.prototype.loadRoom = function (R) {
    this.R = R; this.need = R.need; this.grid = build(R); this.cols = R.w; this.rows = R.h;
    this.W = R.w * T; this.B = R.h * T; this.crates = [];
    let sx = 2, sy = 2;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const ch = this.grid[r][c];
      if (ch === 'P') { sx = c; sy = r; this.grid[r][c] = '.'; }
      else if (ch === 'C') { this.crates.push({ x: c * T + 1, y: (r + 1) * T - 30, w: 30, h: 30, vy: 0, crate: true }); this.grid[r][c] = '.'; }
    }
    this.spawn = { x: sx * T + 6, y: (sy + 1) * T - 28 };
    this.p = { x: this.spawn.x, y: this.spawn.y, w: 20, h: 28, vx: 0, vy: 0, face: 1, onGround: false, canDash: true, dash: 0,
      airDashed: false, hyper: false, jumpAge: 99, postDash: 0, ifr: false, lock: 0, jbuf: 0, coyote: 0, keyTimer: 0, launched: false, void: false, on: null, clipping: false };
  };

  Game.prototype.ev = function (type, extra) {
    if (GLITCHES[type]) {
      const first = !this.used.has(type);
      this.used.add(type);
      this.events.push({ type: 'glitch', glitch: type, first });
    } else this.events.push(Object.assign({ type }, extra || {}));
  };

  Game.prototype.tile = function (c, r) {
    if (r < 0 || r >= this.rows) return '.';
    if (c < 0 || c >= this.cols) return '#';
    return this.grid[r][c];
  };

  const SOLID = { '#': 1, 'L': 1, 'D': 1, '|': 1 };
  Game.prototype.hit = function (e, o) {
    o = o || {};
    const c0 = Math.floor(e.x / T), c1 = Math.floor((e.x + e.w - 0.001) / T);
    const r0 = Math.floor(e.y / T), r1 = Math.floor((e.y + e.h - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = this.tile(c, r);
      if (SOLID[ch] && !(ch === '|' && o.ignoreClip)) return { type: 'tile', ch, c, r };
    }
    if (o.crates) for (const k of this.crates) {
      if (k === o.self) continue;
      if (e.x < k.x + k.w && e.x + e.w > k.x && e.y < k.y + k.h && e.y + e.h > k.y) return { type: 'crate', crate: k };
    }
    if (o.player) { const p = this.p; if (e.x < p.x + p.w && e.x + e.w > p.x && e.y < p.y + p.h && e.y + e.h > p.y) return { type: 'player' }; }
    if (o.voidFloor && e.y + e.h > this.B + VOID_FLOOR) return { type: 'void' };
    return null;
  };

  Game.prototype.move = function (e, d, axis, o) {
    let rem = d;
    while (Math.abs(rem) > 1e-4) {
      const s = Math.abs(rem) > 4 ? Math.sign(rem) * 4 : rem;
      e[axis] += s;
      const h = this.hit(e, o);
      if (h) {
        e[axis] -= s;
        const fs = Math.sign(s) * 0.5;
        for (let k = 0; k < 8; k++) { e[axis] += fs; if (this.hit(e, o)) { e[axis] -= fs; break; } }
        return h;
      }
      rem -= s;
    }
    return null;
  };

  Game.prototype.overlapsChar = function (e, ch, inset) {
    inset = inset || 0;
    const x = e.x + inset, y = e.y + inset, w = e.w - inset * 2, h = e.h - inset * 2;
    const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (this.tile(c, r) === ch) return { c, r };
    return null;
  };

  Game.prototype.touching = function (dir) {
    const p = this.p;
    return !!this.hit({ x: p.x + dir * 2, y: p.y + 2, w: p.w, h: p.h - 4 }, {});
  };

  Game.prototype.die = function (why) {
    if (this.dead) return;
    this.dead = 40; this.kept = this.keys; this.ev('die', { why });
  };

  Game.prototype.respawn = function () {
    const cleared = this.cleared, idx = this.idx, used = this.used, live = this.live, kept = this.kept, bug = this.bug, reveal = this.reveal, ckpt = this.ckpt, room = this.room, stage = this.stage, frame = this.frame;
    this.load(idx); this.used = used; this.live = live; this.reveal = reveal; this.frame = frame;
    if (this.L.regions) {
      const Rg = this.L.regions[ckpt];
      this.cleared = cleared || new Set(); for (const k of this.cleared) this.openHole(this.L.regions[k]);
      this.ckpt = ckpt; this.room = room; this.stage = stage; this.reg = ckpt; this.live = new Set(Rg.live); this.need = Rg.need; if (Rg.room >= 0) this.R = Rg;
      this.spawn = { x: Rg.spawn.c * T + 6, y: (Rg.spawn.r + 1) * T - 28 }; this.p.x = this.spawn.x; this.p.y = this.spawn.y;
    }
    if (bug) { this.bug = true; for (const row of this.grid) for (let c = 0; c < row.length; c++) if (row[c] === 'B') row[c] = '.'; }
    if (kept > 0 && live.has('deathkey')) { this.keys = kept; this.ev('deathkey'); }
  };

  Game.prototype.pause = function () {
    const p = this.p;
    this.reveal = 300;
    if (p.keyTimer > 0 && this.live.has('dupe')) { this.keys++; p.keyTimer = 0; this.ev('dupe'); }
  };

  Game.prototype.resume = function () {
    const p = this.p;
    if (!this.live.has('pauseclip') || this.dead || this.done) return;
    const dir = p.face;
    if (!this.touching(dir)) return;
    for (let dx = 8; dx <= 6 * T; dx += 4) {
      const t = { x: p.x + dir * dx, y: p.y, w: p.w, h: p.h };
      if (t.x < 0 || t.x + t.w > this.W) break;
      if (!this.hit(t, { crates: true })) { p.x = t.x; this.ev('pauseclip'); return; }
    }
  };

  Game.prototype.step = function (inp) {
    if (this.done) return;
    this.frame++;
    if (this.dead) { if (--this.dead === 0) this.respawn(); return; }
    const p = this.p, LV = this.live;
    if (p.keyTimer > 0) p.keyTimer--;
    if (this.reveal > 0) this.reveal--;
    if (this.doorMsg > 0) this.doorMsg--;

    // crates
    for (const k of this.crates) {
      k.vy = Math.min(k.vy + GRAV, MAXFALL);
      if (this.move(k, k.vy, 'y', { crates: true, self: k, player: true })) k.vy = 0;
      if (k.y > this.B + 200) { k.y = -9999; }
    }

    if (inp.jumpP) p.jbuf = 6; else if (p.jbuf > 0) p.jbuf--;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir && p.lock === 0 && p.dash === 0) p.face = dir;

    if (p.jumpAge < 99) p.jumpAge++;
    if (p.postDash > 0) p.postDash--;
    if (inp.dashP && p.canDash && p.dash === 0) {
      p.canDash = false; if (dir) p.face = dir;
      this.ev('dash');
      // forgiving hyper: dash pressed just after a ground jump also counts
      if (LV.has('hyper') && p.jumpAge <= 10 && !p.onGround && p.vy < 0) { p.hyper = true; p.vx = p.face * HYPERV; this.ev('hyper'); }
      else p.dash = DASHF;
    }
    const dashing = p.dash > 0;
    if (p.dash > 0) {
      p.vx = p.face * DASHV; p.vy = 0; p.dash--;
      if (p.dash === 0 && p.onGround) p.postDash = 10;
      if (!p.onGround) p.airDashed = true;
    } else if (p.hyper) { /* keeps full dash speed */ }
    else if (p.lock > 0) p.lock--;
    else p.vx += (dir * WALK - p.vx) * (p.onGround ? 0.45 : 0.28);

    if (p.jbuf > 0) {
      if (p.onGround || p.coyote > 0) {
        const wasDash = p.dash > 0 || p.postDash > 0;
        p.vy = JUMPV; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.dash = 0; p.jumpAge = 0; this.ev('jump');
        if (wasDash && LV.has('hyper')) { p.hyper = true; p.vx = p.face * HYPERV; this.ev('hyper'); }
      }
      else if (LV.has('walljump')) {
        const w = this.touching(-1) ? -1 : this.touching(1) ? 1 : 0;
        if (w) { p.vy = WALLJUMPV; p.vx = -w * 6.5; p.lock = 10; p.face = -w; p.jbuf = 0; p.dash = 0; this.ev('walljump'); }
      }
    }
    if (!inp.jump && p.vy < -4 && !p.launched) p.vy = -4;
    if (p.dash === 0) p.vy = Math.min(p.vy + GRAV, MAXFALL);

    // grab
    if (inp.grabP) {
      if (p.onGround && p.on) {
        if (LV.has('launch')) { p.vy = LAUNCHV; p.launched = true; p.onGround = false; p.coyote = 0; p.jbuf = 0; p.on.vy = 3; this.ev('launch'); }
        else this.ev('toast', { text: 'Grab: nothing happens. Patched.' });
      } else this.ev('toast', { text: 'Nothing to grab.' });
    }

    // horizontal
    const ign = dashing && LV.has('clip');
    const o = { ignoreClip: ign, crates: true, voidFloor: p.void };
    const hx = this.move(p, p.vx, 'x', o);
    if (hx) {
      if (hx.type === 'crate' && p.dash === 0 && p.onGround) {
        const push = Math.max(-2.2, Math.min(2.2, p.vx));
        this.move(hx.crate, push, 'x', { crates: true, self: hx.crate });
        this.move(p, push, 'x', o);
        p.vx = push;
      } else { p.vx = 0; p.hyper = false; if (p.dash > 0) p.dash = 0; }
    }
    if (ign && this.overlapsChar(p, '|')) { p.clipping = true; this.ev('clip'); }
    if (p.dash === 0 && p.clipping) {
      let n = 0;
      while (this.overlapsChar(p, '|') && n++ < 30) p.x += p.face * 4;
      p.clipping = false;
    }
    if (p.y < 0 || p.void) p.x = Math.max(0, Math.min(this.W - p.w, p.x));

    // vertical
    const vy = p.vy;
    const hy = this.move(p, p.vy, 'y', o);
    if (hy) {
      if (vy < 0 && LV.has('ledge') && dir) this.ledge(dir);
      p.vy = 0;
    }
    const g = this.hit({ x: p.x, y: p.y + 1, w: p.w, h: p.h }, o);
    p.onGround = !!g && p.vy >= 0;
    p.on = g && g.type === 'crate' ? g.crate : null;
    if (p.onGround) {
      p.coyote = 6; p.airDashed = false; p.launched = false; p.hyper = false;
      if (p.dash === 0) p.canDash = true;
    } else if (p.coyote > 0) p.coyote--;

    // void / out of bounds
    if (!p.void && p.y + p.h > this.B + 8) {
      if (LV.has('oob') && p.airDashed) { p.void = true; this.ev('oob'); }
      else return this.die('void');
    }
    if (p.void && p.onGround && p.y + p.h <= this.B + 1) p.void = false;
    if (p.y > this.B + 600) return this.die('void');

    // pickups and hazards
    const kc = this.overlapsChar(p, 'K', 2);
    if (kc) { this.grid[kc.r][kc.c] = '.'; this.keys++; p.keyTimer = 40; this.ev('key'); }
    const dc = this.overlapsChar({ x: p.x - 3, y: p.y + 2, w: p.w + 6, h: p.h - 4 }, 'D');
    if (dc) {
      if (this.keys >= this.need) { this.keys -= this.need; this.openDoor(dc.c, dc.r); this.ev('door'); }
      else if (!this.doorMsg) { this.doorMsg = 90; this.ev('toast', { text: 'Locked. Needs ' + this.need + ' keys, you have ' + this.keys + '.' }); }
    }
    const bc = this.overlapsChar(p, 'B', 2);
    if (bc && this.reveal > 0) { this.grid[bc.r][bc.c] = '.'; this.bug = true; this.ev('bug'); }
    if (p.dash === 0) p.ifr = false;
    if (this.spiked()) {
      if (p.dash > 0 && LV.has('iframes')) { if (!p.ifr) { p.ifr = true; this.ev('iframes'); } }
      else return this.die('spikes');
    }
    if (this.L.regions) {
      const cc = Math.floor((p.x + p.w / 2) / T), rg = this.L.regions;
      let k = this.reg; while (k < rg.length - 1 && cc >= rg[k].x1) k++; while (k > 0 && cc < rg[k].x0) k--;
      if (k !== this.reg) { this.region(k); if (this.dead) return; }
      // the way in shuts behind you, so each puzzle room plays exactly like it was built
      const D = rg[this.reg].door;
      if (D && cc >= D.c + 2 && this.grid[D.r + 1][D.c] === '.') { this.grid[D.r][D.c] = D.wall[0]; this.grid[D.r + 1][D.c] = D.wall[1]; this.ev('shut'); }
    }
    if (this.L.regions && this.overlapsChar(p, 'X', 4)) {
      const Rg = this.L.regions[this.reg];
      if (Rg.hole && !this.cleared.has(this.reg)) { this.cleared.add(this.reg); this.openHole(Rg); this.ev('clear', { room: Rg.room + 1, of: this.L.puzzles }); }
    }
    if (this.overlapsChar(p, 'E', 4)) { this.done = true; this.ev('exit'); }
  };

  Game.prototype.ledge = function (dir) {
    const p = this.p;
    if (!this.touching(dir)) return;
    const r = Math.floor((p.y - 3) / T);
    const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.001) / T);
    for (let c = c0; c <= c1; c++) {
      if (this.tile(c, r) !== 'L') continue;
      const ny = r * T - p.h - 0.5;
      if (!this.hit({ x: p.x, y: ny, w: p.w, h: p.h }, { crates: true })) { p.y = ny; p.vy = -2; this.ev('ledge'); }
      return;
    }
  };

  Game.prototype.spiked = function () {
    const p = this.p;
    const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.001) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (this.tile(c, r) !== '^') continue;
      const sx = c * T + 6, sy = r * T + 14, sw = 20, sh = 18;
      if (p.x < sx + sw && p.x + p.w > sx && p.y < sy + sh && p.y + p.h > sy) return true;
    }
    return false;
  };

  Game.prototype.openDoor = function (c, r) {
    const st = [[c, r]];
    while (st.length) {
      const [x, y] = st.pop();
      if (this.tile(x, y) !== 'D' || x < 0 || x >= this.cols) continue;
      this.grid[y][x] = '.';
      st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  };

  root.PN = { Game, LEVELS, GLITCHES, liveFor, T, generate, ROOMS, FINALE, seed: () => seedNow };
})(typeof window !== 'undefined' ? window : globalThis);
