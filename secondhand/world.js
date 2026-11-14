/* Secondhand · world data · © 2026 Buggy Games YT. All rights reserved. */
(function (G) {
'use strict';
const RW = 16, RH = 11;
// tiles the player cannot walk through
const SOLID = new Set('TRHDfPrM~BCx#LGYKngaUzqEVFJtZuehjIWX'.split(''));
const WARP = new Set(['O', '<', '>']);
const COND = new Set(['L', 'G', 'Y', 'Z']); // solid until opened

// ---------- dialog helpers ----------
// lines: [[who, text, corruptAmt?], ...]  or {0:[...], 2:[...]} picked by corruption level
function pick(v, c) {
  if (Array.isArray(v)) return v;
  let best = null, bk = -1;
  for (const k of Object.keys(v)) { const n = +k; if (n <= c && n > bk) { bk = n; best = v[k]; } }
  return best || v[Object.keys(v)[0]];
}

const ROOMS = {};
function room(id, o) { o.id = id; ROOMS[id] = o; return o; }

// =====================================================================
// OVERWORLD (area "over") · grid 5 x 4
// =====================================================================
room('hollowgate', { area: 'over', gx: 0, gy: 0, name: 'HOLLOW GATE', song: 'main', map: [
  'TTTTTTTTTTTTTTTT',
  'TTT..T.KKK..TT.T',
  'T...T.KKKKK..T.T',
  'T..T..KKOKK.,..T',
  'T..n..w.=.w....T',
  'T..ww...========',
  'T.ww....=...T..T',
  'TT...T..=..ww..T',
  'T..T....=.....TT',
  'T....w..==..T..T',
  'TTTTTTT==TTTTTTT'],
  warps: [{ x: 8, y: 3, to: 'h1', ax: 7, ay: 8 }],
  foes: [['wisp', 4, 7], ['wisp', 12, 3]],
  signs: { '3,4': { 0: [['', 'THE HOLLOW. KEEP OUT.'], ['', 'Carved under it, in small letters: "W WAS HERE"']], 2: [['', 'THE HOLLOW. KEEP OUT.'], ['', 'Carved under it, fresh: "{N} WAS HERE"', 0]] } } });

room('deepwoods', { area: 'over', gx: 1, gy: 0, name: 'DEEP WOODS', song: 'main', map: [
  'TTTTTTTTTTTTTTTT',
  'Tww.T..T...T.wwT',
  'Tw..T.TT.T.T..wT',
  'T..TT....T...T.T',
  'T.T...TT.TTT.T.T',
  '=...T..T.....T.=',
  'T.T.T.TTTT.T...T',
  'T.T...T....T.T.T',
  'T.TTT.T.TT.TTT.T',
  'T.....T.==.....T',
  'TTTTTTT..TTTTTTT'],
  foes: [['bat', 7, 3], ['bat', 4, 7], ['wisp', 12, 6]],
  items: [{ id: 'page', n: 2, tx: 1, ty: 1, uid: 'page2', hidden: true }, { id: 'heart', tx: 14, ty: 1 }] });

room('highfield', { area: 'over', gx: 2, gy: 0, name: 'THE HIGH FIELD', song: 'main', map: [
  'TTTTTTTTTTTTTTTT',
  'T..wwww...wwww.T',
  'T.wwwwww.wwwwwwT',
  'T.ww..ww.ww..w.T',
  'T....,.....,...T',
  '=..r...==...r..=',
  'T.wwww.==.wwwwwT',
  'T.wwwww==wwwww.T',
  'T......==....M.T',
  'T,.....==.....,T',
  'TTTTTTT==TTTTTTT'] });

room('chapel', { area: 'over', gx: 3, gy: 0, name: 'THE CHAPEL', song: 'main', map: [
  'TTTTTTTTTTTTTTTT',
  'T.....RRRR.....T',
  'T....RRRRRR....T',
  'T....HHDDHH..n.T',
  'T.,....==....,.T',
  '================',
  'T..f.f.==..f.f.T',
  'T......==......T',
  'T.r....==...,..T',
  'T......==......T',
  'TTTTTTT==TTTTTTT'],
  npcs: [{ id: 'keeper', tx: 10, ty: 4, dir: 0, pal: 'keeper' }],
  signs: { '13,3': { 0: [['', 'SERVICE EVERY HOUR, ON THE BELL.']], 2: [['', 'SERVICE CANCELLED UNTIL THE NEXT PLAYER.']] } },
  doors: { '7,3': { 0: [['', 'Locked. Inside, someone is humming the village song.']], 2: [['', 'Locked. Inside, someone is humming the village song backwards.']] },
    '8,3': { 0: [['', 'Locked. The keyhole is full of wax.']] } } });

room('graveyard', { area: 'over', gx: 4, gy: 0, name: 'GRAVEYARD', song: 'cave', map: [
  'TTTTTTTTTTTTTTTT',
  'T.g..g..g..g...T',
  'T..............T',
  'T.g..g..g..g...T',
  'T..............T',
  '=======........T',
  'T.g..g..=.g..g.T',
  'T.......=......T',
  'T.g..g..=.g..g.T',
  'T.......==.....T',
  'TTTTTTT==TTTTTTT'],
  npcs: [{ id: 'digger', tx: 13, ty: 4, dir: 2, pal: 'digger' }],
  foes: [['wisp', 4, 2], ['wisp', 10, 7], ['wisp', 13, 2]],
  items: [{ id: 'page', n: 3, tx: 14, ty: 9, uid: 'page3' }] });

room('bramble', { area: 'over', gx: 0, gy: 1, name: 'BRAMBLE PATH', song: 'main', map: [
  'TTTTTTT==TTTTTTT',
  'T.ww...==..T...T',
  'T.ww.r....rT.w.T',
  'T....rr.r......T',
  'TT.......r..ww.T',
  'T..r..r....r...=',
  'T.....rr...r...T',
  'T.ww......r..r.T',
  'T.ww.r...r.....T',
  'T....r.==..r...T',
  'TTTTTTT==TTTTTTT'],
  foes: [['crawler', 4, 4], ['crawler', 12, 7]],
  items: [{ id: 'heart', tx: 14, ty: 1 }] });

room('clearing', { area: 'over', gx: 1, gy: 1, name: 'THE CLEARING', song: 'lake', map: [
  'TTTTTTT..TTTTTTT',
  'T...T.....T...,T',
  'T.,...........TT',
  'T.....KK.......T',
  'T.....KK.......T',
  '...............=',
  'T..............T',
  'TT..,......,...T',
  'T........w.....T',
  'T...T...ww..T..T',
  'TTTTTTT..TTTTTTT'],
  npcs: [{ id: 'girl', tx: 9, ty: 4, dir: 0, pal: 'girl' }] });

room('northroad', { area: 'over', gx: 2, gy: 1, name: 'NORTH ROAD', song: 'main', map: [
  'TTTTTTT==TTTTTTT',
  'T.....,==......T',
  'T.TT...==..n...T',
  'T.TT...==......T',
  'T......==...ww.T',
  '================',
  'T..w...==...ww.T',
  'T.www..==......T',
  'T..w...==..r...T',
  'T......==......T',
  'TTTTTTT==TTTTTTT'],
  signs: { '11,2': { 0: [['', 'NORTH: HIGH FIELD.  WEST: THE CLEARING.'], ['', 'EAST: THE ORCHARD.  SOUTH: MILLBROOK.']], 2: [['', 'NORTH: HIGH FIELD.  WEST: THE CLEARING.'], ['', 'EAST: THE ORCHARD.  SOUTH: YOU.', 0]] } } });

room('orchard', { area: 'over', gx: 3, gy: 1, name: 'THE ORCHARD', song: 'main', map: [
  'TTTTTTT==TTTTTTT',
  'T.a.a.a==a.a.a.T',
  'T......==......T',
  'T.a.a.a==a.a.a.T',
  'T......==......T',
  '================',
  'T......==......T',
  'T.a.a.a==a.a.a.T',
  'T......==......T',
  'T.a.a.a==a.a.a.T',
  'TTTTTTT==TTTTTTT'],
  npcs: [{ id: 'farmer', tx: 4, ty: 4, dir: 0, pal: 'farmer' }],
  foes: [['bat', 12, 8]],
  items: [{ id: 'page', n: 5, tx: 14, ty: 9, uid: 'page5' }, { id: 'heart', tx: 1, ty: 9 }] });

room('oldroad', { area: 'over', gx: 4, gy: 1, name: 'OLD ROAD', song: 'main', map: [
  'TTTTTTT==TTTTTTT',
  'Tr.....==....r.T',
  'T....r.==......T',
  'T..r...==..n...T',
  'T......==....r.T',
  '========.......T',
  'T...r..==...r..T',
  'T......==......T',
  'T.r....==..r...T',
  'T......==......T',
  'TTTTTTT==TTTTTTT'],
  npcs: [{ id: 'traveler', tx: 10, ty: 6, dir: 2, pal: 'traveler' }],
  foes: [['crawler', 3, 8], ['crawler', 13, 2]],
  signs: { '11,3': [['', 'OLD ROAD.  NORTH: GRAVEYARD.  SOUTH: CAVE HILL.'], ['', 'WEST: THE ORCHARD.']] } });

room('woodcutter', { area: 'over', gx: 0, gy: 2, name: "WOODCUTTER'S HUT", song: 'main', map: [
  'TTTTTTT==TTTTTTT',
  'T..RRRR==......T',
  'T..HHDH==..rr..T',
  'T......==......T',
  'T.ff...==...T..T',
  'T......=========',
  'T..r...==......T',
  'T......==..ww..T',
  'T..T...==..ww..T',
  'T......==......T',
  'TTTTTTT==TTTTTTT'],
  npcs: [{ id: 'woodcutter', tx: 10, ty: 3, dir: 0, pal: 'woodcutter' }],
  doors: { '5,2': { 0: [['', 'Locked. Through the window you see a little bed, made up neatly.']], 2: [['', 'Locked. Through the window you see a little bed. Someone is in it, facing the wall.']] } } });

room('woods', { area: 'over', gx: 1, gy: 2, name: 'THE WOODS', song: 'main', map: [
  'TTTTTTT..TTTTTTT',
  'T..T....T...T..T',
  'T..T.TT.T.T.T..T',
  'T.TT.T..T.T...TT',
  'T....T.TT.TTT..T',
  '...T.T......T..=',
  'T..T.TTTTT.T...T',
  'T.TT.....T.T.T.T',
  'T....TTT.T...T.T',
  'T.T.....,..T...T',
  'TTTTTTTTTTTTTTTT'],
  foes: [['wisp', 6, 3], ['wisp', 10, 7], ['wisp', 3, 8]],
  items: [{ id: 'page', n: 1, tx: 1, ty: 1, uid: 'page1' }] });

room('village', { area: 'over', gx: 2, gy: 2, name: 'MILLBROOK', song: 'main', map: [
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
  'TTTTTTT==TTTTTTT'] });

room('eastroad', { area: 'over', gx: 3, gy: 2, name: 'EAST ROAD', song: 'main', map: [
  'TTTTTTT==TTTTTTT',
  'T..r...==...ww.T',
  'T.ww...==..n...T',
  'T.ww...==......T',
  'T......==..r...T',
  '================',
  'T..,...==......T',
  'T.r....==...ww.T',
  'T......==...ww.T',
  'T..ww..==..r...T',
  'TTTTTTT==TTTTTTT'],
  foes: [['wisp', 12, 8]],
  signs: { '11,2': { 0: [['', 'EAST: CAVE HILL.  SOUTH: THE BRIDGE AND THE OLD MILL.']], 2: [['', 'EAST: CAVE HILL.  SOUTH: THE BRIDGE.'], ['', 'Someone scratched out the rest and wrote: TURN BACK, {N}.', 0]] } } });

room('cavehill', { area: 'over', gx: 4, gy: 2, name: 'CAVE HILL', song: 'cave', map: [
  'TTTTTTT==TTTTTTT',
  'T..r...==..CCCCC',
  'T......==.CCCCCC',
  'T..r.n.==.CCCCCC',
  'T......==.CCOCCC',
  '=============.CC',
  'T..r......r...CC',
  'T.....r.......CC',
  'T..rr.....r..CCC',
  'T......r....CCCC',
  'TTTTTTTTTTTTCCCC'],
  warps: [{ x: 12, y: 4, to: 'c1', ax: 7, ay: 8 }],
  foes: [['bat', 4, 7], ['bat', 9, 2]],
  signs: { '5,3': [['', 'THE CAVE. BRING A LIGHT.'], ['', 'Scratched underneath: "THERE\'S ONE INSIDE. I LEFT IT."']] } });

room('marsh', { area: 'over', gx: 0, gy: 3, name: 'THE MARSH', song: 'lake', map: [
  'TTTTTTT..TTTTTTT',
  'T~~..m..m...~~.T',
  'T~..mm.mm.m..~.T',
  'T..mm~~m..mm...T',
  'T.m.~~~.m.~~.m.T',
  'T..m.~..mm.~m..=',
  'T.mm..m..m.....T',
  'T~..m~~.m..m~~.T',
  'T~~.m~...mm.~..T',
  'T~~~..m.m..~~~.T',
  'TTTTTTTTTTTTTTTT'],
  foes: [['wisp', 4, 6], ['wisp', 11, 2], ['crawler', 9, 8]],
  items: [{ id: 'page', n: 4, tx: 1, ty: 5, uid: 'page4' }, { id: 'heart', tx: 14, ty: 1 }] });

room('reedshore', { area: 'over', gx: 1, gy: 3, name: 'REED SHORE', song: 'lake', map: [
  'TTTTTTTTTTTTTTTT',
  'TSSSSSSSSSSSSSSS',
  'TSSwwSSSSSwwSSSS',
  'T.SSSSSSSSSSSSST',
  'T..SSSwwSSSSS..T',
  '...SSSSSSSSSdddT',
  'T.SSSS~~~~~~~~~T',
  'TSSS~~~~~~~~~~~T',
  'T~~~~~~~~~~~~~~T',
  '~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~'],
  npcs: [{ id: 'fisher', tx: 11, ty: 4, dir: 3, pal: 'fisher' }] });

room('lake', { area: 'over', gx: 2, gy: 3, name: 'THE LAKE', song: 'lake', map: [
  'TTTTTTT==TTTTTTT',
  'SSSSSSS==SSSSSSS',
  'SSSSSSSSSSSSSSSS',
  'T~~~~~~dd~~~~~~T',
  '~~~~~~~dd~~~~~~~',
  '~~~~~~~dd~~~~~~~',
  '~~~~~~~dd~~~~~~~',
  '~~~~~~~dd~~~~~~~',
  '~~~~~~~dd~~~~~~~',
  '~~~~~~dddd~~~~~~',
  '~~~~~~~BB~~~~~~~'],
  warps: [{ x: 6, y: 9, special: 'floor1' }] });

room('bridge', { area: 'over', gx: 3, gy: 3, name: 'THE BRIDGE', song: 'lake', map: [
  'TTTTTTT==TTTTTTT',
  'SSSS...==.~~~..T',
  'SSSSS..==.~~~..T',
  'T.SS...==.~~~..T',
  'T......==.~~~.,T',
  'T......===ddd===',
  'T.r....==.~~~..T',
  'T......==.~~~.rT',
  'T..,...==.~~~..T',
  'T......==.~~~..T',
  'TTTTTTTTTT~~~TTT'],
  npcs: [{ id: 'oldwoman', tx: 4, ty: 4, dir: 3, pal: 'oldwoman' }] });

room('oldmill', { area: 'over', gx: 4, gy: 3, name: 'THE OLD MILL', song: 'cave', map: [
  'TTTTTTTTTTTTTTTT',
  'T...RRRRRR..~~~T',
  'T...RRRRRR..~~~T',
  'T...HHHHHHUU~~~T',
  'T...HHHOHHUU~~~T',
  '=======.......~T',
  'T..r......n...~T',
  'T.....ww......~T',
  'T..ww....r....~T',
  'T.......r.....~T',
  'TTTTTTTTTTTTTT~T'],
  warps: [{ x: 7, y: 4, to: 'm1', ax: 7, ay: 8 }],
  foes: [['crawler', 4, 8], ['crawler', 12, 7]],
  signs: { '10,6': { 0: [['', 'MILLBROOK MILL. CLOSED.']], 2: [['', 'MILLBROOK MILL. OPEN. OPEN. OPEN.']] } } });

// =====================================================================
// THE HOLLOW (area "hollow")
// =====================================================================
const DUN = { hollow: { name: 'THE HOLLOW', pal: 'hollow', song: 'cave' }, cave: { name: 'THE CAVE', pal: 'cave', song: 'cave', dark: true }, mill: { name: 'THE OLD MILL', pal: 'mill', song: 'cave' } };
function droom(id, area, gx, gy, o) { const d = DUN[area]; return room(id, Object.assign({ area, gx, gy, name: d.name, song: d.song, pal: d.pal, dark: !!d.dark, dungeon: true }, o)); }

droom('h1', 'hollow', 1, 2, { map: [
  '#######__#######',
  '#______________#',
  '#_##________##_#',
  '#_#__________#_#',
  '#______________#',
  '#______________#',
  '#_#__________#_#',
  '#_##________##_#',
  '#______________#',
  '#n_____<_______#',
  '################'],
  warps: [{ x: 7, y: 9, to: 'hollowgate', ax: 8, ay: 4 }],
  foes: [['wisp', 4, 3], ['wisp', 11, 6]],
  signs: { '1,9': [['', 'Roots cover the walls. Someone scratched a tally into the bark.'], ['', '|||| |||| |||| ||| ... then: "I KEEP DYING HERE. W."']] } });

droom('h2', 'hollow', 1, 1, { map: [
  '#######__#######',
  '#######LL#######',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '________________',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['crawler', 3, 5], ['wisp', 12, 8]] });

droom('h3', 'hollow', 0, 1, { map: [
  '################',
  '#______________#',
  '#_####____####_#',
  '#_#__________#_#',
  '#_#__##__##__#_#',
  '#____#____#_____',
  '#_#__#____#__#_#',
  '#_#__###_##__#_#',
  '#_#__________#_#',
  '#______________#',
  '################'],
  foes: [['crawler', 2, 9], ['crawler', 13, 1]],
  items: [{ id: 'key', tx: 7, ty: 5, uid: 'h3:key' }] });

droom('h4', 'hollow', 2, 1, { map: [
  '################',
  '#__________#___#',
  '#__________#___#',
  '#__b_______##G##',
  '#______________#',
  '_______________#',
  '#______o_______#',
  '#______________#',
  '#__##______##__#',
  '#______________#',
  '################'],
  puzzle: 'blocks',
  foes: [['wisp', 10, 8]],
  items: [{ id: 'key', tx: 13, ty: 1, uid: 'h4:key' }, { id: 'page', n: 6, tx: 12, ty: 2, uid: 'page6' }] });

droom('h5', 'hollow', 1, 0, { map: [
  '#######__#######',
  '#######LL#######',
  '#______________#',
  '#_##__#__#__##_#',
  '#______________#',
  '#__#___##___#__#',
  '#______________#',
  '#_##__#__#__##_#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['bat', 4, 4], ['bat', 11, 4], ['bat', 7, 8], ['crawler', 13, 9]] });

droom('h6', 'hollow', 1, -1, { map: [
  '################',
  '#______________#',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  boss: 'rooted' });

// =====================================================================
// THE CAVE (area "cave") · dark
// =====================================================================
droom('c1', 'cave', 1, 2, { map: [
  '#######__#######',
  '#______________#',
  '#_#####__#####_#',
  '#_#__________#_#',
  '#_#__#____#__#_#',
  '#____#____#____#',
  '#_#__#____#__#_#',
  '#_#__________#_#',
  '#_#####__#####_#',
  '#_____n<_______#',
  '################'],
  warps: [{ x: 7, y: 9, to: 'cavehill', ax: 12, ay: 5 }],
  foes: [['wisp', 3, 3], ['wisp', 12, 7]],
  signs: { '6,9': [['', 'Words scratched in the rock, low down, like a kid wrote them:'], ['', '"IT\'S SO DARK. I PUT THE LANTERN ON THE ROCK FOR THE NEXT ONE."']] } });

droom('c2', 'cave', 1, 1, { map: [
  '#######__#######',
  '#######LL#######',
  '#______________#',
  '#_#__________#_#',
  '#______##______#',
  '_______##_______',
  '#______##______#',
  '#_#__________#_#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['bat', 3, 8], ['bat', 12, 3]],
  items: [{ id: 'lantern', tx: 7, ty: 3, uid: 'lantern' }] });

droom('c3', 'cave', 0, 1, { map: [
  '################',
  '#___#__________#',
  '#_q_#__________#',
  '#___#___####___#',
  '#_###___#__#___#',
  '#_______G__#____',
  '#___#___#__#___#',
  '#___#___####___#',
  '#___#__________#',
  '#______________#',
  '################'],
  puzzle: 'orb',
  foes: [['bat', 6, 8], ['bat', 13, 2]],
  items: [{ id: 'key', tx: 9, ty: 5, uid: 'c3:key' }, { id: 'page', n: 7, tx: 10, ty: 4, uid: 'page7' }] });

droom('c4', 'cave', 2, 1, { map: [
  '################',
  '#_____#__#_____#',
  '#_____#__#_____#',
  '#_____##G#_____#',
  '#______________#',
  '_______________#',
  '#__#___##___#__#',
  '#______________#',
  '#__#___##___#__#',
  '#______________#',
  '################'],
  puzzle: 'clear',
  foes: [['crawler', 2, 2], ['crawler', 13, 2], ['crawler', 13, 9], ['bat', 7, 7]],
  items: [{ id: 'key', tx: 7, ty: 1, uid: 'c4:key' }] });

droom('c5', 'cave', 1, 0, { map: [
  '#######__#######',
  '#######LL#######',
  '#______________#',
  '#______________#',
  '#__##______##__#',
  '#______________#',
  '#__##______##__#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['mimic', 4, 3], ['mimic', 11, 3], ['bat', 7, 6]] });

droom('c6', 'cave', 1, -1, { map: [
  '################',
  '#______________#',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  boss: 'listener' });

// =====================================================================
// THE OLD MILL (area "mill")
// =====================================================================
droom('m1', 'mill', 1, 2, { map: [
  '#######__#######',
  '#______________#',
  '#_##__####__##_#',
  '#______________#',
  '#_#__________#_#',
  '#_#___####___#_#',
  '#_#__________#_#',
  '#______________#',
  '#_##________##_#',
  '#____n_<_______#',
  '################'],
  warps: [{ x: 7, y: 9, to: 'oldmill', ax: 7, ay: 5 }],
  foes: [['crawler', 11, 3]],
  signs: { '5,9': [['', 'A notice nailed to the wall: GRINDING SCHEDULE.'], ['', 'MONDAY: WHEAT.  TUESDAY: WHEAT.  WEDNESDAY: SAVE 01.']] } });

droom('m2', 'mill', 1, 1, { map: [
  '#######__#######',
  '#######LL#######',
  '#______________#',
  '#_####____####_#',
  '#______________#',
  '________________',
  '#______________#',
  '#_####____####_#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['mimic', 12, 8], ['bat', 3, 2]] });

droom('m3', 'mill', 0, 1, { map: [
  '################',
  '#__#___________#',
  '#__G__b________#',
  '#__#________o__#',
  '####___________#',
  '#_______________',
  '#______b_______#',
  '#______________#',
  '#__o___________#',
  '#______________#',
  '################'],
  puzzle: 'blocks',
  items: [{ id: 'key', tx: 1, ty: 2, uid: 'm3:key' }] });

droom('m4', 'mill', 2, 1, { map: [
  '#######__#######',
  '#______________#',
  '#__##______##__#',
  '#______________#',
  '#______________#',
  '_______________#',
  '#____##GG##____#',
  '#____#____#____#',
  '#____#____#____#',
  '#____######____#',
  '################'],
  puzzle: 'clear',
  foes: [['mimic', 3, 3], ['mimic', 12, 3], ['crawler', 2, 8]],
  items: [{ id: 'key', tx: 7, ty: 7, uid: 'm4:key' }] });

droom('m7', 'mill', 2, 0, { map: [
  '################',
  '#______________#',
  '#_##_##__##_##_#',
  '#______________#',
  '#_##_##__##_##_#',
  '#______________#',
  '#_##_##__##_##_#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['crawler', 2, 3], ['crawler', 13, 7], ['bat', 7, 5]],
  items: [{ id: 'page', n: 8, tx: 14, ty: 1, uid: 'page8' }, { id: 'heart', tx: 1, ty: 1 }] });

droom('m5', 'mill', 1, 0, { map: [
  '#######__#######',
  '#######LL#######',
  '#______________#',
  '#_#_#_#__#_#_#_#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#_#_#_#__#_#_#_#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  foes: [['crawler', 2, 4], ['crawler', 13, 6], ['bat', 5, 8], ['bat', 10, 2], ['mimic', 7, 5]] });

droom('m6', 'mill', 1, -1, { map: [
  '################',
  '#______________#',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#__#________#__#',
  '#______________#',
  '#______________#',
  '#######__#######'],
  boss: 'miller' });

// =====================================================================
// MEMORY FLOORS (B3, B6, B9) and the VOID (B10)
// =====================================================================
const HALL = '################';
room('w3a', { area: 'mem3', gx: 0, gy: 0, depth: 3, name: 'B3 · A HALLWAY', song: 'mem', pal: 'home', map: [
  HALL, HALL, HALL,
  '####J####J##J###',
  '#______________#',
  '#<______________',
  '#______________#',
  HALL, HALL, HALL, HALL],
  npcs: [{ id: 'wrenghost', tx: 13, ty: 4, dir: 2, pal: 'wren', ghost: true, lines: 'hall' }],
  signs: { '4,3': [['', 'A school photo. A kid in a blue shirt, grinning. "WREN · GRADE 5"']],
    '9,3': [['', 'A family photo at a lake. Everyone is squinting in the sun.']],
    '12,3': { 0: [['', 'A photo of a TV screen. It shows a village with a bell.'], ['', 'There is a tiny figure in red standing in the village.'], ['', 'It looks like you.']] } } });
room('w3b', { area: 'mem3', gx: 1, gy: 0, depth: 3, name: 'B3 · WREN\'S ROOM', song: 'mem', pal: 'home', map: [
  HALL,
  '#FF___J___VV___#',
  '#______________#',
  '#EE____________#',
  '#EE____________#',
  '________________',
  '#______________#',
  '#______________#',
  '#______________#',
  '#______t_______#',
  HALL],
  memObj: { tiles: ['1,1', '2,1'], flag: 'mem3', lines: [['', 'A shelf of games. One spot has a dust-free rectangle.'], ['', 'Next to it, a note in marker: "SECONDHAND - FINISH BEFORE LAKE TRIP!!"'], ['', 'Somewhere below, a hatch unlocks.']] },
  signs: { '6,1': [['', 'A calendar. JULY. Saturday is circled: "LAKE!!!"'], ['', 'Every day after that is blank.']],
    '10,1': [['', 'The TV is on. It shows MILLBROOK at night.'], ['', 'A tiny figure stands at the end of the dock. Waiting for someone to press START.']],
    '11,1': [['', 'The console\'s power light is on. It has been on for a very long time.']],
    '1,3': [['', 'A bed with a cartoon blanket. It hasn\'t been slept in.']], '2,3': [['', 'A bed with a cartoon blanket. It hasn\'t been slept in.']],
    '1,4': [['', 'Under the pillow: a flashlight and a page of cheat codes. None of them work.']], '2,4': [['', 'The sheets are cold.']],
    '7,9': [['', 'A drawing on the desk: a village, a dock, a bell.'], ['', 'Under the dock, in purple crayon, a stick figure. It is labeled "ME?"']] },
  npcs: [{ id: 'wrenghost', tx: 12, ty: 7, dir: 2, pal: 'wren', ghost: true, lines: 'room' }] });
room('w3c', { area: 'mem3', gx: 2, gy: 0, depth: 3, name: 'B3 · A HALLWAY', song: 'mem', pal: 'home', map: [
  HALL, HALL, HALL,
  '#####J##########',
  '#______________#',
  '___________Y___#',
  '#______________#',
  HALL, HALL, HALL, HALL],
  memGate: 'mem3',
  signs: { '5,3': [['', 'Pencil marks on the door frame.'], ['', 'WREN AGE 6.  WREN AGE 8.  WREN AGE 10.'], ['', 'Nothing after that.']] } });

room('w6a', { area: 'mem6', gx: 0, gy: 0, depth: 6, name: 'B6 · A DRIVEWAY', song: 'mem', map: [
  'TTTTTTTTTTTTTTTT',
  'TRRRRRRR...TTTTT',
  'THHHDHHH.....TTT',
  'T..............T',
  'T....n.........T',
  'T<==============',
  'T..............T',
  'T..f.f.f.f.f...T',
  'T..............T',
  'TTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTT'],
  signs: { '5,4': [['', 'YARD SALE TODAY.  EVERYTHING $1.'], ['', 'EVERYTHING MUST GO.']] },
  doors: { '4,2': [['', 'The door is open a crack. The house is empty. Every room echoes.']] } });
room('w6b', { area: 'mem6', gx: 1, gy: 0, depth: 6, name: 'B6 · THE YARD SALE', song: 'mem', map: [
  'TTTTTTTTTTTTTTTT',
  'T..............T',
  'T.ttt....ttt...T',
  'T..............T',
  'T..............T',
  '================',
  'T..............T',
  'T.ttt....ttt...T',
  'T..............T',
  'T..............T',
  'TTTTTTTTTTTTTTTT'],
  tables: [[2, 4, 2, [['', 'Swim goggles and a beach towel with cartoon fish on it. $1 for both.']]],
    [9, 11, 2, [['', 'A stack of crayon drawings. A village. A dock. A bell. $1 for the stack.']]],
    [2, 4, 7, [['', 'A box of game cartridges. There is an empty space where one used to be.']]],
    [9, 11, 7, [['', 'A bike with the training wheels still on. $1.'], ['', 'The price tag is in a kid\'s handwriting.']]]],
  npcs: [{ id: 'saleswoman', tx: 7, ty: 3, dir: 0, pal: 'noface2', flag: 'mem6' }] });
room('w6c', { area: 'mem6', gx: 2, gy: 0, depth: 6, name: 'B6 · THE CURB', song: 'mem', map: [
  'TTTTTTTTTTTTTTTT',
  'T..............T',
  'T...f.f.f.f....T',
  'T..............T',
  'T..............T',
  '=============Y.T',
  'T..............T',
  'T..............T',
  'T...,....,.....T',
  'T..............T',
  'TTTTTTTTTTTTTTTT'],
  memGate: 'mem6',
  npcs: [{ id: 'buyer', tx: 8, ty: 7, dir: 1, pal: 'player', ghost: true }] });

room('w9a', { area: 'mem9', gx: 0, gy: 0, depth: 9, name: 'B9 · THE REAL LAKE', song: 'mem', night: true, map: [
  'TTTTTTTTTTTTTTTT',
  'TTTT.....TTTTTTT',
  'TT...n.......TTT',
  'T..............T',
  'T......SSSS....T',
  'T<..SSSSSSSSSSSS',
  'T..SSSSSSSSSSS.T',
  'T.SSSSS~~~~SSS.T',
  'TSS~~~~~~~~~~~ST',
  '~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~'],
  signs: { '5,2': [['', 'PUBLIC BEACH.  NO LIFEGUARD ON DUTY.'], ['', 'SWIM AT YOUR OWN RISK.']] } });
room('w9b', { area: 'mem9', gx: 1, gy: 0, depth: 9, name: 'B9 · THE REAL LAKE', song: 'mem', night: true, map: [
  'TTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTT',
  'TT.............T',
  'T..............T',
  'TSSSSSSSSSSSSSST',
  'SSSSSeSSuSSSSSSS',
  'TSSSSSSSSSSSSSST',
  'TSSSSSSSSSSSSSST',
  '~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~'],
  signs: { '5,5': [['', 'A towel with cartoon fish on it. Still folded.']], '8,5': [['', 'A pair of small sneakers, side by side.'], ['', 'Waiting for someone to come back for them.']] },
  npcs: [{ id: 'wrenghost', tx: 11, ty: 6, dir: 0, pal: 'wren', ghost: true, flag: 'mem9', lines: 'lake' }] });
room('w9c', { area: 'mem9', gx: 2, gy: 0, depth: 9, name: 'B9 · THE REAL LAKE', song: 'mem', night: true, map: [
  'TTTTTTTTTTTTTTTT',
  'TTTTTTTTTTTTTTTT',
  'T..............T',
  'TSSSSSSSSSSSSSST',
  'TSSSSSSSdSSSSSST',
  'SSSSSSSSdSSSSSST',
  '~~~~~~~~d~~~~~~~',
  '~~~~~~~~d~~~~~~~',
  '~~~~~~~~d~~~~~~~',
  '~~~~~~~~Y~~~~~~~',
  '~~~~~~~~~~~~~~~~'],
  memGate: 'mem9' });

room('void', { area: 'void', gx: 0, gy: 0, depth: 10, name: '', song: 'void', map: [
  'xxxxxxxxxxxxxxxx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvvvvvvvvvvx',
  'xvvvvvv<vvvvvvvx',
  'xxxxxxxxxxxxxxxx'],
  npcs: [{ id: 'wren', tx: 7, ty: 4, dir: 0, pal: 'wren', ghost: true, ox: 8 }] });

// =====================================================================
// PART 1 · a separate chapter (area "p1"), played from its own file slot.
// Rooms are linked by edges where you walk, and by one-way "jumps" that the
// chapter script fires (a TV, a doorway, a warp, an escape). check_world.js
// follows both. Original story beats, Secondhand's own places and people.
// =====================================================================
const SKYW = 'hhhhhhhhhhhhhhhh';
room('p1_dark', { area: 'p1', gx: 0, gy: 0, name: 'A DARK ROOM', song: 'p1dim', pal: 'dim', dark: true, light: 26, ambient: 0.9, map: [
  'xxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxx',
  'xxxx########xxxx',
  'xxxx#F__V__#xxxx',
  'xxxx#EE____#xxxx',
  'xxxx#EE____#xxxx',
  'xxxx#______#xxxx',
  'xxxx#______#xxxx',
  'xxxx#______#xxxx',
  'xxxx########xxxx',
  'xxxxxxxxxxxxxxxx'],
  tv: [8, 3],
  jumps: [{ on: 'tv', to: 'p1_sky1', ax: 3, ay: 5 }],
  signs: { '5,3': [['', 'A shelf. One game is missing. There is a clean rectangle in the dust where it was.']],
    '5,5': [['', 'A bed. The blanket still has a price sticker on it.'], ['', '$1.']], '6,4': [['', 'The pillow is cold.']] } });
room('p1_sky1', { area: 'p1', gx: 0, gy: 2, name: 'ABOVE THE CLOUDS', song: 'p1sky', sky: true, map: [
  SKYW,
  'hhkkkkhhhkkkkkhh',
  'hkkkkkkkkkkkkkkh',
  'hkkkkkkkkkkhkkkh',
  'hkkkhkkkkkkkkkkk',
  'hkkkkkkkkkkkkkkk',
  'hkkkkkkkkhkkkkkk',
  'hkkhkkkkkkkkkkkh',
  'hkkkkkkkkkkkkkkh',
  'hhkkkkhhkkkkkhhh',
  SKYW],
  debris: [['chair', 2, 1.4], ['fence', 12.5, 1.2], ['frame', 6, 9.6], ['cart', 13, 8.8]] });
room('p1_sky2', { area: 'p1', gx: 1, gy: 2, name: 'ABOVE THE CLOUDS', song: 'p1sky', sky: true, map: [
  SKYW,
  'hhhkkkkkkkkkhhhh',
  'hkkkkkkkkkkkkkhh',
  'hkkkkkkkkkkkkkkh',
  'kkkkkkkkkkkkkkkI',
  'kkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkI',
  'hkkkkkkkkkkkkkkh',
  'hkkkkkkkkkkkkkkh',
  'hhhkkkkkkkkkkhhh',
  SKYW],
  house: [5.5, 1.2],
  debris: [['mailbox', 1.5, 8.9], ['chair', 11.5, 9.4], ['bike', 13.2, 1.6]] });
room('p1_hall', { area: 'p1', gx: 2, gy: 2, name: 'THE GOLD HALL', song: 'p1hall', pal: 'gold', map: [
  '#######__#######',
  '#I_____NN_____I#',
  '#_jjjj_NN_jjjj_#',
  '#______NN______#',
  '#I_jjj_NN_jjj_I#',
  'NNNNNNNNN______#',
  '#I_jjj____jjj_I#',
  '#______________#',
  '#_jjjj____jjjjn#',
  '#I____________I#',
  '################'],
  signs: { '14,8': [['', 'A guest book on a stand.'], ['', 'Every line is signed with the same name: {N}.'], ['', 'The ink on the last one is still wet.']] } });
room('p1_wood1', { area: 'p1', gx: 2, gy: 1, name: 'THE WOODEN ROOMS', song: 'p1dim', pal: 'dwood', dark: true, light: 62, map: [
  '#######__#######',
  '#F____________F#',
  '#______________#',
  '#___##____##___#',
  '#______________#',
  '#______________#',
  '#______________#',
  '#___##____##___#',
  '#______________#',
  '#F____________F#',
  '#######__#######'],
  stone: true,
  jumps: [{ on: 'warp', to: 'p1_wood3', ax: 7, ay: 7 }] });
room('p1_wood2', { area: 'p1', gx: 2, gy: 0, name: 'THE WOODEN ROOMS', song: 'p1dim', pal: 'dwood', dark: true, light: 62, map: [
  '################',
  '#######y########',
  '#______________#',
  '#_F__________F_#',
  '#______________#',
  '#____##__##____#',
  '#______________#',
  '#______________#',
  '#_F__________F_#',
  '#______________#',
  '#######__#######'],
  stone: true,
  jumps: [{ at: [7, 1], to: 'p1_wood3', ax: 7, ay: 7 }] });
room('p1_wood3', { area: 'p1', gx: 3, gy: 0, name: 'THE WOODEN ROOMS', song: 'p1dim', pal: 'dwood', dark: true, light: 62, map: [
  '################',
  '################',
  '##____________##',
  '##____________##',
  '##____________##',
  '##____________##',
  '##____________##',
  '##____________##',
  '##____________##',
  '################',
  '################'],
  jumps: [{ on: 'warp', to: 'p1_wood1', ax: 7, ay: 5 }, { on: 'face', to: 'p1_sand', ax: 7, ay: 8 }] });
room('p1_sand', { area: 'p1', gx: 3, gy: 2, name: 'THE SAND ROOM', song: null, pal: 'sand', map: [
  '#######_########',
  '#######W########',
  '#SSSSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSS#',
  '#SSnSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSS#',
  '################'],
  items: [{ id: 'okey', tx: 7, ty: 6, uid: 'p1:okey', still: true }],
  signs: { '3,7': [['', 'Written in the sand, in a kid\'s handwriting:'], ['', '"IT ONLY COMES WHEN NOBODY IS LOOKING."']] } });
room('p1_corr0', { area: 'p1', gx: 3, gy: 1, name: 'THE LONG CORRIDOR', song: 'p1corr', pal: 'stone', dark: true, light: 60, ambient: 0.8, cam: true, map: [
  '################',
  '################',
  '################',
  '################',
  '#######_________',
  '#######_________',
  '#######_________',
  '#######_########',
  '#######_########',
  '#######_########',
  '#######_########'] });
room('p1_corr', { area: 'p1', gx: 4, gy: 1, name: 'THE LONG CORRIDOR', song: 'p1corr', pal: 'stone', dark: true, light: 60, ambient: 0.8, cam: true, loop: 'ew', map: [
  '################',
  '################',
  '################',
  '################',
  '________________',
  '________________',
  '________________',
  '################',
  '################',
  '################',
  '################'],
  jumps: [{ on: 'escape', to: 'p1_square', ax: 7, ay: 8 }] });
room('p1_square', { area: 'p1', gx: 4, gy: 2, name: 'MILLBROOK', song: 'p1night', night: true, map: [
  'TTTTTTTxxTTTTTTT',
  'T.RRR..==..RRRRT',
  'T.HDH..==..HHDHT',
  'T......==......T',
  'T..,...==...,..T',
  'x==============x',
  'T......==......T',
  'T.,...P==....,.T',
  'T..ff..==..ff..T',
  'T......==......T',
  'TTTTTTTxxTTTTTTT'],
  doors: { '3,2': [['', 'Locked. Every window in Millbrook is dark.']], '13,2': [['', 'Locked. There is a note on the door: "GONE TO THE SALE."']] },
  jumps: [{ on: 'script', to: 'p1_arena', ax: 8, ay: 8 }] });
room('p1_arena', { area: 'p1', gx: 5, gy: 2, name: 'THE RING', song: 'p1fight', arena: true, map: (() => {
  const m = [];
  for (let y = 0; y < RH; y++) { let s = ''; for (let x = 0; x < RW; x++) s += Math.hypot(x + 0.5 - 8, (y + 0.5 - 5.5) * 1.05) <= 5.05 ? 'A' : 'X'; m.push(s); }
  return m;
})() });

const MEM = {
  3: { start: 'w3a', startArrive: [2, 5], stairs: 'w3c', stairsArrive: [10, 5] },
  6: { start: 'w6a', startArrive: [2, 5], stairs: 'w6c', stairsArrive: [12, 5] },
  9: { start: 'w9a', startArrive: [2, 5], stairs: 'w9c', stairsArrive: [8, 8] },
  10: { start: 'void', startArrive: [7, 8], stairs: null, stairsArrive: null },
};

// =====================================================================
// helpers
// =====================================================================
const AREA_NAMES = { p1: 'PART 1', over: 'MILLBROOK VALLEY', hollow: 'THE HOLLOW', cave: 'THE CAVE', mill: 'THE OLD MILL', mem3: 'B3', mem6: 'B6', mem9: 'B9', void: '' };
function walk(ch) { return !SOLID.has(ch); }
function openings(map, side) {
  const out = [];
  if (side === 'n' || side === 's') { const y = side === 'n' ? 0 : RH - 1; for (let x = 0; x < RW; x++) if (walk(map[y][x])) out.push(x); }
  else { const x = side === 'w' ? 0 : RW - 1; for (let y = 0; y < RH; y++) if (walk(map[y][x])) out.push(y); }
  return out;
}
const DIRS = { n: [0, -1, 's'], s: [0, 1, 'n'], w: [-1, 0, 'e'], e: [1, 0, 'w'] };
function linkRooms(rooms) {
  const byPos = {};
  for (const r of Object.values(rooms)) if (r.gx !== undefined) byPos[r.area + ':' + r.gx + ',' + r.gy] = r;
  for (const r of Object.values(rooms)) {
    if (r.gx === undefined) continue;
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nb = byPos[r.area + ':' + (r.gx + dx) + ',' + (r.gy + dy)];
      if (nb && openings(r.map, d).length) r[d] = nb.id; else delete r[d];
    }
  }
}
// pull block markers out of maps
function prep(rooms) {
  for (const r of Object.values(rooms)) {
    r.blocks = r.blocks || [];
    r.map = r.map.map((row, y) => {
      let s = '';
      for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === 'b') { r.blocks.push([x, y]); s += '_'; } else s += ch; }
      return s;
    });
  }
}
prep(ROOMS);
linkRooms(ROOMS);

// =====================================================================
// THE UNDERNEATH · procedural floors
// =====================================================================
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function bfsTiles(m, sx, sy, blocked) {
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]], dist = { [sx + ',' + sy]: 0 };
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= RW || ny >= RH || seen.has(k)) continue;
      const ch = m[ny][nx];
      if (SOLID.has(ch) || (blocked && blocked(nx, ny, ch))) continue;
      seen.add(k); dist[k] = dist[x + ',' + y] + 1; q.push([nx, ny]);
    }
  }
  return { seen, dist };
}
const FIG_LINES = [
  [['?', '{N}?'], ['?', 'You\'re playing late again.']],
  [['?', 'It\'s {T}.'], ['?', 'Somebody upstairs should be asleep.']],
  [['?', 'Floor B{F}.'], ['?', 'Wren made it to B{F2} the first time.']],
  [['?', 'Don\'t look at the statue, {N}. Look at me.']],
  [['?', 'You have played for {M} minutes.'], ['?', 'We counted.']],
  [['?', 'Happy {D}, {N}.']],
  [['?', 'Is that your real name? It sounds real.']],
  [['?', 'We were all players once.'], ['?', 'Then we were saves.']],
  [['?', 'Turn your volume up. You\'re missing the whispering.']],
  [['?', 'Keep going down. Wren is at the bottom.']],
  [['?', 'You died {X} times. That\'s fine. We keep the extras.']],
  [['?', 'Your reflection is in the screen right now.'], ['?', 'Is it a second late?']],
];
const FCACHE = {};
function genFloor(seed, f, deep) {
  const key = (seed >>> 0) + ':' + f + ':' + (deep ? 1 : 0);
  if (FCACHE[key]) return FCACHE[key];
  const r = rng(((seed >>> 0) ^ Math.imul(f + 1, 0x9E3779B1) ^ (deep ? 0x5bd1e995 : 0)) >>> 0);
  const ri = n => Math.floor(r() * n);
  const GW = f >= 6 ? 5 : 4, GH = 4;
  const N = Math.min(12, GW * GH, 6 + Math.floor(Math.min(f, 12) * 0.5) + ri(2));
  const cells = new Map(); // "x,y" -> {x,y,doors}
  const sx = ri(GW), sy = ri(GH);
  cells.set(sx + ',' + sy, { x: sx, y: sy, d: {} });
  let guard = 0;
  while (cells.size < N && guard++ < 5000) {
    const arr = [...cells.values()], c = arr[ri(arr.length)];
    const dn = ['n', 's', 'w', 'e'][ri(4)], [dx, dy, back] = DIRS[dn];
    const nx = c.x + dx, ny = c.y + dy;
    if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || cells.has(nx + ',' + ny)) continue;
    const nc = { x: nx, y: ny, d: {} }; cells.set(nx + ',' + ny, nc);
    c.d[dn] = true; nc.d[back] = true;
  }
  // a few loops
  for (const c of cells.values()) for (const dn of ['e', 's']) {
    const [dx, dy, back] = DIRS[dn], o = cells.get((c.x + dx) + ',' + (c.y + dy));
    if (o && !c.d[dn] && r() < 0.18) { c.d[dn] = true; o.d[back] = true; }
  }
  // room distances (grid graph)
  const gd = {}; const gq = [sx + ',' + sy]; gd[gq[0]] = 0;
  while (gq.length) { const k = gq.shift(), c = cells.get(k); for (const dn of Object.keys(c.d)) { const [dx, dy] = DIRS[dn], nk = (c.x + dx) + ',' + (c.y + dy); if (gd[nk] === undefined) { gd[nk] = gd[k] + 1; gq.push(nk); } } }
  const list = [...cells.values()];
  const startC = cells.get(sx + ',' + sy);
  let stairsC = list.reduce((a, b) => gd[b.x + ',' + b.y] > gd[a.x + ',' + a.y] ? b : a, startC);
  const others = list.filter(c => c !== startC && c !== stairsC);
  others.sort((a, b) => gd[b.x + ',' + b.y] - gd[a.x + ',' + a.y]);
  const keyC = others.length ? others[ri(Math.min(3, others.length))] : stairsC;
  const area = (deep ? 'd' : 'f') + f;
  const rid = c => area + '_' + c.x + '_' + c.y;
  const rooms = {};
  const corrupt = Math.min(1, f / 10);
  const figRoom = f >= 2 ? others[ri(Math.max(1, others.length))] : null;
  let startArrive = null, stairsArrive = null;
  for (const c of list) {
    const m = [];
    for (let y = 0; y < RH; y++) { const row = []; for (let x = 0; x < RW; x++) row.push(x === 0 || y === 0 || x === RW - 1 || y === RH - 1 ? '#' : '_'); m.push(row); }
    const d = c.d;
    if (d.n) m[0][7] = m[0][8] = '_';
    if (d.s) m[RH - 1][7] = m[RH - 1][8] = '_';
    if (d.w) for (const y of [4, 5, 6]) m[y][0] = '_';
    if (d.e) for (const y of [4, 5, 6]) m[y][RW - 1] = '_';
    // decor
    const pat = ri(7);
    const put = (x, y, ch) => { if (x >= 2 && y >= 2 && x <= RW - 3 && y <= RH - 3) m[y][x] = ch; };
    if (pat === 0) { for (const [x, y] of [[3, 3], [12, 3], [3, 7], [12, 7]]) { put(x, y, '#'); put(x + 1, y, '#'); } }
    else if (pat === 1) { for (let y = 3; y <= 7; y += 2) for (let x = 3; x <= 12; x += 3) put(x, y, '#'); }
    else if (pat === 2) { for (let y = 2; y <= 8; y++) for (let x = 2; x <= 13; x++) if (r() < 0.16 + corrupt * 0.06) put(x, y, '#'); }
    else if (pat === 3) { const cx = 3 + ri(9), cy = 3 + ri(4); for (let y = 2; y <= 8; y++) for (let x = 2; x <= 13; x++) if (Math.hypot(x - cx, (y - cy) * 1.4) < 2.6 + r()) put(x, y, 'z'); }
    else if (pat === 4) { if (r() < 0.5) { const x0 = 5 + ri(5); for (let y = 1; y <= 9; y++) { m[y][x0] = '~'; m[y][x0 + 1] = '~'; } } else { const y0 = 3 + ri(4); for (let x = 1; x <= 14; x++) m[y0][x] = '~'; } }
    else if (pat === 5) { for (let x = 3; x <= 12; x++) { put(x, 3, '#'); put(x, 7, '#'); } for (let y = 3; y <= 7; y++) { put(3, y, '#'); put(12, y, '#'); } for (const [x, y] of [[7, 3], [8, 7], [3, 5], [12, 5]]) put(x, y, '_'); }
    else { for (let i = 0; i < 6; i++) put(2 + ri(12), 2 + ri(7), r() < 0.5 ? 'z' : '#'); }
    // corridors: every opening reaches the middle
    const carve = (x, y) => { m[y][x] = m[y][x] === '~' ? 'd' : '_'; };
    const cor = new Set();
    const mark = (x, y) => { carve(x, y); cor.add(x + ',' + y); };
    if (d.n) for (let y = 0; y <= 5; y++) { mark(7, y); mark(8, y); }
    if (d.s) for (let y = 5; y <= RH - 1; y++) { mark(7, y); mark(8, y); }
    if (d.w) for (let x = 0; x <= 8; x++) mark(x, 5);
    if (d.e) for (let x = 7; x <= RW - 1; x++) mark(x, 5);
    mark(7, 5); mark(8, 5);
    // keep the 3-tall side openings walkable a step in
    for (const side of ['w', 'e']) if (d[side]) { const x = side === 'w' ? 1 : RW - 2; for (const y of [4, 6]) if (SOLID.has(m[y][x])) m[y][x] = m[y][x] === '~' ? 'd' : '_'; }
    const room = { id: rid(c), area, gx: c.x, gy: c.y, depth: f, name: 'B' + f, song: 'under', pal: 'under', gen: true, deep: !!deep,
      foes: [], items: [], npcs: [], warps: [], blocks: [], dark: f >= 4 && r() < Math.min(0.6, 0.15 + f * 0.04) };
    const mapStr = () => m.map(row => row.join(''));
    const reach = (blk) => bfsTiles(mapStr(), 7, 5, blk).seen;
    const pickSpot = (avoidCor, R, extra) => {
      const cand = [...R].filter(k => { const [x, y] = k.split(',').map(Number); if (x < 2 || y < 2 || x > RW - 3 || y > RH - 3) return false; if (avoidCor && cor.has(k)) return false; if (m[y][x] !== '_') return false; return !extra || extra(x, y); });
      return cand.length ? cand[ri(cand.length)].split(',').map(Number) : null;
    };
    const nbOk = (x, y, R) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R.has((x + dx) + ',' + (y + dy)) && m[y + dy][x + dx] === '_');
    let R = reach();
    if (c === startC) {
      const sp = pickSpot(true, R, (x, y) => nbOk(x, y, R)) || [4, 3];
      m[sp[1]][sp[0]] = '<';
      R = reach((x, y, ch) => ch === '<');
      const nb = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [sp[0] + dx, sp[1] + dy]).find(([x, y]) => R.has(x + ',' + y));
      startArrive = nb || [7, 5];
      room.warps.push({ x: sp[0], y: sp[1], special: 'up' });
    }
    if (c === stairsC) {
      const sp = pickSpot(true, R, (x, y) => nbOk(x, y, R)) || [12, 7];
      m[sp[1]][sp[0]] = 'Y';
      R = reach((x, y, ch) => ch === '<');
      const nb = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [sp[0] + dx, sp[1] + dy]).find(([x, y]) => R.has(x + ',' + y));
      stairsArrive = nb || [7, 5];
      room.hatch = [sp[0], sp[1]];
    }
    // seal pockets that can't be reached
    R = reach((x, y, ch) => ch === '<');
    for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) { const ch = m[y][x]; if ((ch === '_' || ch === 'd') && !R.has(x + ',' + y)) m[y][x] = '#'; }
    if (c === keyC) { const sp = pickSpot(true, R) || pickSpot(false, R); if (sp) room.items.push({ id: 'fkey', tx: sp[0], ty: sp[1], uid: area + ':fkey' }); }
    if (r() < 0.16 + (f > 6 ? 0.06 : 0)) { const sp = pickSpot(false, R); if (sp) room.items.push({ id: 'heart', tx: sp[0], ty: sp[1] }); }
    // corrupted floor tiles
    if (f >= 3) for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) if (m[y][x] === '_' && r() < Math.min(0.12, (f - 2) * 0.012)) m[y][x] = 'Q';
    // enemies
    if (c !== startC) {
      const types = ['wisp']; if (f >= 2) types.push('bat'); if (f >= 3) types.push('crawler'); if (f >= 5) types.push('mimic');
      const n = Math.min(6, 1 + Math.floor(Math.min(f, 14) / 2.5) + ri(2));
      const entries = [];
      if (d.n) entries.push([7.5, 0]); if (d.s) entries.push([7.5, 10]); if (d.w) entries.push([0, 5]); if (d.e) entries.push([15, 5]);
      for (let i = 0; i < n; i++) {
        const sp = pickSpot(false, R, (x, y) => entries.every(([ex, ey]) => Math.abs(x - ex) + Math.abs(y - ey) > 3));
        if (sp) room.foes.push([types[ri(types.length)], sp[0], sp[1]]);
      }
    }
    if (c === figRoom) { const sp = pickSpot(true, R); if (sp) room.npcs.push({ id: 'figure', tx: sp[0], ty: sp[1], dir: 0, pal: 'shadow', ghost: true, lines: ri(FIG_LINES.length) }); }
    room.statueOk = f >= 4 && r() < 0.3;
    room.map = mapStr();
    rooms[room.id] = room;
  }
  linkRooms(rooms);
  const out = { f, area, deep: !!deep, rooms, start: rid(startC), startArrive, stairs: rid(stairsC), stairsArrive, keyRoom: rid(keyC) };
  FCACHE[key] = out;
  const ks = Object.keys(FCACHE); if (ks.length > 40) delete FCACHE[ks[0]];
  return out;
}
function floorInfo(seed, f, deep) {
  if (!deep && MEM[f]) return Object.assign({ f, area: ROOMS[MEM[f].start].area, rooms: null, mem: true }, MEM[f]);
  return genFloor(seed, f, deep);
}
function parseGen(id) { const m = /^([fd])(\d+)_(\d+)_(\d+)$/.exec(id); return m ? { deep: m[1] === 'd', f: +m[2], x: +m[3], y: +m[4] } : null; }

G.SHW = { RW, RH, SOLID, WARP, COND, ROOMS, MEM, AREA_NAMES, FIG_LINES, pick, openings, linkRooms, genFloor, floorInfo, parseGen, bfsTiles, rng, DIRS };
})(typeof window !== 'undefined' ? window : globalThis);
