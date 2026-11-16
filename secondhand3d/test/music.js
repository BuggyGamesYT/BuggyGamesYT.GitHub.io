/* Secondhand · music · © 2026 Buggy Games YT. All rights reserved.
   Original chiptune songs. Each song: tempo, chords per bar ("F/G" = half bar each),
   a lead melody (one token per step: note, "-" hold, "." rest), and patterns that the
   player turns into arpeggio / pad, bass and noise percussion. */
(function (G) {
'use strict';
const J = (...a) => a.join(' ');

// ---------------- calm ----------------
const TITLE_A = J(
  'd5 - - b4 d5 - g5 -', 'f#5 - e5 - d5 - a4 -', 'b4 - - e5 g5 - f#5 e5', 'e5 - d5 - c5 - . .',
  'd5 - - b4 d5 - g5 -', 'f#5 - b5 - a5 - f#5 -', 'g5 - e5 - c5 - e5 -', 'd5 - - - . . . .');
const TITLE_B = J(
  'g5 - - - b5 - a5 g5', 'e5 - - - g5 - f#5 e5', 'd5 - - - g5 - b5 -', 'a5 - - - . . f#5 -',
  'g5 - e5 - b4 - e5 -', 'g5 - e5 - c5 - e5 -', 'a5 - g5 - e5 - c5 -', 'd5 - - - f#5 - a5 -');
const TITLE_B2 = J(
  'g5 - - - b5 - a5 g5', 'e5 - - - g5 - f#5 e5', 'd5 - - - g5 - b5 -', 'a5 - - - . . f#5 -',
  'g5 - e5 - b4 - e5 -', 'g5 - e5 - c5 - e5 -', 'a5 - f#5 - d5 - c5 -', 'b4 - - - . . . .');
const TITLE_CA = 'G D Em C G Bm C D', TITLE_CB = 'Em C G D Em C Am D', TITLE_CB2 = 'Em C G D Em C D G';

const VIL_A = J(
  'e5 - g5 - c6 - b5 a5', 'g5 - e5 - c5 - d5 e5', 'f5 - a5 - c6 - a5 f5', 'g5 - - - d5 - . .',
  'e5 - g5 - c6 - d6 e6', 'd6 - b5 - g5 - e5 g5', 'a5 - c6 - b5 - d6 -', 'c6 - - - . . . .');
const VIL_B = J(
  'a5 - c6 - e6 - c6 a5', 'g5 - - b5 e5 - . .', 'f5 a5 c6 a5 f5 - e5 f5', 'g5 - - - e5 - . .',
  'd5 f5 a5 d6 c6 - a5 -', 'b5 - d6 - g5 - f5 -', 'e5 - g5 - a5 - c6 -', 'b5 - a5 - g5 - - .');
const VIL_B2 = J(
  'a5 - c6 - e6 - c6 a5', 'g5 - - b5 e5 - . .', 'f5 a5 c6 a5 f5 - e5 f5', 'g5 - - - e5 - . .',
  'd5 f5 a5 d6 c6 - a5 -', 'b5 - d6 - g5 - f5 -', 'e5 - d5 - f5 - b4 -', 'c5 - - - . . . .');
const VIL_CA = 'C Am F G C Em F/G C', VIL_CB = 'Am Em F C Dm G Em/Am F/G', VIL_CB2 = 'Am Em F C Dm G F/G C';

const FLD_A = J(
  'c5 - f5 - a5 - g5 f5', 'e5 - g5 - c6 - - .', 'd5 - f5 - a5 - c6 a5', 'bb5 - - - a5 - g5 -',
  'a5 - c6 - f6 - e6 d6', 'c6 - g5 - e5 - g5 -', 'f5 - d5 - e5 - g5 -', 'f5 - - - . . c5 -');
const FLD_B = J(
  'd5 - f5 - bb5 - a5 g5', 'a5 - - - f5 - c5 -', 'bb4 - d5 - g5 - f5 -', 'e5 - g5 - c6 - bb5 -',
  'a5 - f5 - d5 - f5 -', 'e5 - a5 - c6 - e6 -', 'd6 - c6 - bb5 - a5 -', 'g5 - - - e5 - . .');
const FLD_B2 = J(
  'd5 - f5 - bb5 - a5 g5', 'a5 - - - f5 - c5 -', 'bb4 - d5 - g5 - f5 -', 'e5 - g5 - c6 - bb5 -',
  'a5 - f5 - d5 - f5 -', 'e5 - a5 - c6 - e6 -', 'd6 - c6 - bb5 - g5 -', 'f5 - - - . . . .');
const FLD_CA = 'F C Dm Bb F C Bb/C F', FLD_CB = 'Bb F Gm C Dm Am Bb C', FLD_CB2 = 'Bb F Gm C Dm Am Bb/C F';

// orchard: 3/4 (6 steps a bar)
const ORC_A = J(
  'f#5 - a5 - d6 -', 'b5 - - - a5 g5', 'e5 - - c#5 e5 -', 'd5 - - - . .',
  'd5 - f#5 - b5 -', 'g5 - - - f#5 e5', 'c#5 - e5 - a5 -', 'f#5 - - - . .');
const ORC_B = J(
  'g5 - b5 - d6 -', 'a5 - - - f#5 -', 'e5 - g5 - b5 -', 'a5 - - - . c#5',
  'c#5 - f#5 - a5 -', 'b5 - a5 - f#5 -', 'g5 - f#5 - e5 -', 'e5 - - - . .');
const ORC_B2 = J(
  'g5 - b5 - d6 -', 'a5 - - - f#5 -', 'e5 - g5 - b5 -', 'a5 - - - . c#5',
  'c#5 - f#5 - a5 -', 'b5 - a5 - f#5 -', 'e5 - c#5 - e5 -', 'd5 - - - . .');
const ORC_CA = 'D G A D Bm Em A D', ORC_CB = 'G D Em A F#m Bm G A', ORC_CB2 = 'G D Em A F#m Bm A D';

const WDS_A = J(
  'a4 - c5 - e5 - d5 c5', 'b4 - - - g4 - . .', 'a4 - c5 - f5 - e5 d5', 'e5 - - - g#4 - . .',
  'a4 - c5 - e5 - a5 g5', 'g5 - d5 - b4 - d5 -', 'c5 - a4 - f4 - a4 -', 'b4 - - - . . . .');
const WDS_B = J(
  'd5 - f5 - a5 - g5 f5', 'e5 - - - c5 - . .', 'f5 - a5 - d6 - c6 a5', 'b5 - - - g#5 - e5 -',
  'a5 - g5 - f5 - e5 -', 'e5 - - - g5 - . .', 'f5 - e5 - d5 - c5 -', 'b4 - - - g#4 - . .');
const WDS_B2 = J(
  'd5 - f5 - a5 - g5 f5', 'e5 - - - c5 - . .', 'f5 - a5 - d6 - c6 a5', 'b5 - - - g#5 - e5 -',
  'a5 - g5 - f5 - e5 -', 'e5 - - - g5 - . .', 'f5 - e5 - d5 - b4 -', 'a4 - - - . . . .');
const WDS_CA = 'Am G F E Am G F E', WDS_CB = 'Dm Am Dm E F C Dm E', WDS_CB2 = 'Dm Am Dm E F C E Am';

const LAKE_A = J(
  'b4 - - - e5 - g5 -', 'f#5 - - - e5 - - -', 'd5 - - - g5 - b5 -', 'a5 - - - f#5 - - -',
  'g5 - - - e5 - b4 -', 'e5 - - - g5 - b5 -', 'c6 - - - b5 - a5 -', 'f#5 - - - d#5 - . .');
const LAKE_B = J(
  'e5 - g5 - c6 - - -', 'b5 - - - d6 - - -', 'c6 - b5 - a5 - e5 -', 'g5 - - - - - . .',
  'e5 - g5 - b5 - c6 -', 'd6 - - - b5 - g5 -', 'a5 - c6 - e6 - d6 -', 'd#6 - - - b5 - . .');
const LAKE_B2 = J(
  'e5 - g5 - c6 - - -', 'b5 - - - d6 - - -', 'c6 - b5 - a5 - e5 -', 'g5 - - - - - . .',
  'e5 - g5 - b5 - c6 -', 'd6 - - - b5 - g5 -', 'a5 - c6 - b5 - f#5 -', 'e5 - - - - - . .');
const LAKE_CA = 'Em Cmaj7 G D Em Cmaj7 Am B', LAKE_CB = 'C G Am Em C G Am B', LAKE_CB2 = 'C G Am Em C G B Em';

const CHP_A = J(
  'a4 - - - c5 - - -', 'd5 - - - c5 - bb4 -', 'a4 - - - - - . .', 'g4 - - - - - . .',
  'f4 - - - a4 - - -', 'bb4 - - - d5 - - -', 'c5 - - - e5 - - -', 'f5 - - - - - . .');
const CHP_B = J(
  'f5 - - - e5 - d5 -', 'c5 - - - - - . .', 'd5 - - - f5 - - -', 'a5 - - - - - . .',
  'g5 - - - f5 - e5 -', 'e5 - - - c5 - - -', 'd5 - - - e5 - - -', 'f5 - - - - - . .');
const CHP_CA = 'F Bb F C Dm Bb C F', CHP_CB = 'Dm Am Bb F Gm C Bb/C F';

// ---------------- horror ----------------
const EER_A = J(
  'd5 - - - . . c#5 -', 'd5 - f5 - e5 - . .', 'f5 - - - e5 - d5 -', 'c#5 - - - - - . .',
  'a4 - - - bb4 - a4 -', 'g4 - - - bb4 - d5 -', 'eb5 - - - d5 - - -', 'c#5 - - - . . . .');
const EER_B = J(
  'g5 - - - f#5 - g5 -', 'a5 - - - f5 - d5 -', 'g5 - - - eb5 - bb4 -', 'd5 - - - - - . .',
  'bb4 - a4 - g4 - d5 -', 'c#5 - e5 - g5 - bb5 -', 'a5 - - - f5 - - -', 'e5 - - - c#5 - . .');
const EER_CA = 'Dm Dm Bb A Dm Gm Eb A', EER_CB = 'Gm Dm Eb Bb Gm A Bb A';

// ---------------- dungeons ----------------
const HOL_A = J(
  'e5 . e5 g5 f5 - e5 .', 'f5 . a5 - g5 f5 e5 .', 'e5 . b4 - c5 - b4 a4', 'd5 - - - . . . .',
  'e5 . e5 g5 b5 - a5 g5', 'a5 - g5 - f5 - e5 -', 'g5 - b5 - d6 - c6 b5', 'c6 - - - . . . .');
const HOL_B = J(
  'a5 . c6 . e6 - d6 c6', 'b5 - - - g5 - . .', 'a5 . f5 . c6 - b5 a5', 'g5 - - - e5 - . .',
  'c6 . a5 . e5 - a5 c6', 'd#6 - - - b5 - f#5 -', 'e6 - d6 - c6 - b5 a5', 'b5 - - - . . . .');
const HOL_CA = 'Em F Em D Em F G F', HOL_CB = 'Am G F Em Am B C B';

const CAV_A = J(
  'c5 - - - eb5 - d5 -', 'c5 - - - ab4 - . .', 'g4 - - - c5 - eb5 -', 'd5 - - - b4 - . .',
  'c5 - - - g5 - f5 -', 'eb5 - - - c5 - . .', 'f5 - ab5 - g5 - f5 -', 'd5 - - - - - . .');
const CAV_B = J(
  'f5 - - - ab5 - - -', 'g5 - - - eb5 - c5 -', 'eb5 - - - c5 - ab4 -', 'bb4 - - - g4 - . .',
  'c5 - f5 - ab5 - c6 -', 'db6 - - - c6 - ab5 -', 'b5 - - - g5 - d5 -', 'b4 - - - . . . .');
const CAV_CA = 'Cm Ab Cm G Cm Ab Fm G', CAV_CB = 'Fm Cm Ab Eb Fm Db G G';

const MIL_A = J(
  'g5 . d5 . g5 . bb5 a5', 'g5 . d5 . bb4 . d5 .', 'eb5 . g5 . bb5 . a5 g5', 'f#5 - - - d5 . . .',
  'g5 . bb5 . d6 . c6 bb5', 'c6 . eb6 . d6 . c6 .', 'a5 . f#5 . d5 . f#5 .', 'a5 - - - . . . .');
const MIL_B = J(
  'c6 . g5 . eb5 . g5 .', 'bb5 . g5 . d5 . g5 .', 'ab5 . f5 . c5 . f5 .', 'f#5 - - - a5 - . .',
  'eb6 . c6 . g5 . c6 .', 'd6 . bb5 . g5 . bb5 .', 'g5 . bb5 . eb6 . d6 c6', 'a5 - - - f#5 - . .');
const MIL_CA = 'Gm Gm Eb D Gm Cm D D', MIL_CB = 'Cm Gm Ab D Cm Gm Eb D';

const BOS_A = J(
  'a5 a5 . a5 g5 . e5 .', 'a5 . c6 . b5 . g5 .', 'f5 f5 . f5 e5 . c5 .', 'e5 - g#5 - b5 - d6 -',
  'a5 a5 . a5 g5 . e5 .', 'c6 . b5 . a5 . g5 .', 'bb5 - a5 - f5 - d5 -', 'e5 - - - g#5 - b5 -');
const BOS_B = J(
  'd6 - c6 - a5 - f5 -', 'e5 - a5 - c6 - e6 -', 'f6 - e6 - d6 - a5 -', 'g#5 - b5 - e6 - - -',
  'c6 . a5 . f5 . a5 .', 'd6 . b5 . g5 . b5 .', 'd6 - c6 - bb5 - a5 -', 'g#5 - - - e5 - . .');
const BOS_CA = 'Am Am F E Am Am Bb E', BOS_CB = 'Dm Am Dm E F G Bb E';

// ---------------- the underneath ----------------
const UND_A = J(
  'd5 - - b4 d5 - f#5 -', 'g5 - f#5 - d5 - b4 -', 'e5 - - - g5 - f#5 e5', 'c#5 - - - . . . .',
  'd5 - - b4 d5 - b5 -', 'a5 - g5 - d5 - b4 -', 'c5 - - - e5 - g5 -', 'f#5 - - - . . . .');
const UND_B = J(
  'g5 - - - b5 - a5 g5', 'f#5 - - - d5 - b4 -', 'b4 - d5 - g5 - - -', 'a#4 - - - c#5 - f#5 -',
  'g5 - e5 - b4 - e5 -', 'g5 - e5 - c5 - e5 -', 'd5 - - - b4 - g4 -', 'f#4 - - - . . . .');
const UND_CA = 'Bm G Em F# Bm G C F#', UND_CB = 'Em Bm G F# Em C G F#';

const GLI_A = J(
  'a5 a5 a5 . e6 . d#6 .', 'a5 . . c6 b5 . . .', 'bb5 bb5 bb5 . f6 . e6 .', 'bb5 . . d6 c#6 . . .',
  'a5 . c6 . e6 . g6 .', 'f#6 . . . . . a5 .', 'eb6 . c6 . a5 . f#5 .', 'e5 - - - . . . .');
const GLI_B = J(
  'f#5 . a5 . c#6 . . .', 'f5 . ab5 . c6 . . .', 'e5 . g5 . b5 . . .', 'eb5 . gb5 . bb5 . . .',
  'd5 . f5 . a5 . . .', 'c#5 . e5 . g#5 . . .', 'c5 . e5 . g5 . . .', 'b4 . d#5 . f#5 . b5 .');
const GLI_CA = 'Am Am Bb Bb Am Am Eb E', GLI_CB = 'F#m Fm Em Ebm Dm C#m C B';

const VOID_M = J(
  '. . . . . . . .', '. . . . e6 - - -', '- - - - . . . .', '. . . . . . . .',
  '. . . . . . . .', '. . . . . . f6 -', '- - - - - - . .', '. . . . . . . .');


// ---------------- PART 1 ----------------
const P1DIM_M = J(
  '. . . . . . . .', 'a5 - - - - - . .', '. . . . . . . .', 'f5 - - - e5 - - -',
  '. . . . . . . .', '. . d6 - - - . .', '. . . . . . . .', 'c#6 - - - - - - -');
const P1SKY_A = J(
  'e5 - g5 - c6 -', 'b5 - - - g5 -', 'a5 - f5 - d5 -', 'e5 - - - . .',
  'e5 - g5 - c6 -', 'd6 - - - b5 -', 'c6 - a5 - f#5 -', 'g5 - - - . .');
const P1SKY_B = J(
  'a5 - c6 - e6 -', 'd6 - - - b5 -', 'c6 - a5 - e5 -', 'f5 - - - . .',
  'e5 - d5 - c5 -', 'b4 - - - g4 -', 'c5 - eb5 - f#5 -', 'g5 - - - - -');
const P1HALL_M = J(
  'c5 - - - - - - -', 'e5 - - - - - - -', 'd5 - - - - - - -', 'c5 - - - - - . .',
  'f5 - - - - - - -', 'e5 - - - - - - -', 'd5 - - - f5 - - -', 'e5 - - - - - . .');
const P1CORR_M = J('e5 . g5 . b5 . . .', 'a#5 . . . g5 . . .', 'e5 . g5 . c6 . . .', 'b5 . . . d#5 . . .');
const P1NIGHT_M = J(
  'e5 - - - a5 - - -', 'c6 - - - a5 - - -', 'g5 - - - e5 - - -', 'd5 - - - - - . .',
  'e5 - - - a5 - - -', 'c6 - - - d6 - - -', 'b5 - - - g#5 - - -', 'e5 - - - - - . .');
const P1FIGHT_A = J(
  'f#5 . a5 . c#6 . a5 .', 'f#5 . c#6 - b5 . a5 .', 'd5 . f#5 . a5 . d6 .', 'e6 - - - b5 - g#5 -',
  'f#5 . a5 . c#6 . e6 .', 'f#6 - e6 - c#6 - a5 -', 'd6 . a5 . f#5 . d6 .', 'c#6 - - - e#5 - g#5 -');
const P1FIGHT_B = J(
  'b5 . d6 . f#6 . e6 d6', 'c#6 - - - a5 - f#5 -', 'g5 . b5 . d6 . c#6 b5', 'a#5 - - - c#6 - e6 -',
  'f#6 . d6 . b5 . d6 .', 'f#6 . d6 . a5 . f#5 .', 'g#5 . b5 . e6 . d6 .', 'c#6 - - - . . . .');

const SONGS = {
  title: { bpm: 80, spb: 8, chords: J(TITLE_CA, TITLE_CB, TITLE_CA, TITLE_CB2), lead: J(TITLE_A, TITLE_B, TITLE_A, TITLE_B2),
    lw: 'tri', lv: 0.16, hm: 'arp', hp: '0 1 2 3 2 1 0 1', hw: 'p12', hv: 0.035, ho: 4, bp: 'R - - - 5 - - -', bw: 'tri', bv: 0.16, dp: '. . . . h . . .', dv: 0.25, calm: 1 },
  village: { bpm: 104, spb: 8, chords: J(VIL_CA, VIL_CB, VIL_CA, VIL_CB2), lead: J(VIL_A, VIL_B, VIL_A, VIL_B2),
    lw: 'p25', lv: 0.075, hm: 'arp', hp: '0 1 2 1 0 1 2 1', hw: 'p12', hv: 0.03, ho: 4, bp: 'R . 5 . R . 5 .', bw: 'tri', bv: 0.2, dp: 'k . h . . . h .', dv: 0.35, calm: 1 },
  fields: { bpm: 116, spb: 8, chords: J(FLD_CA, FLD_CB, FLD_CA, FLD_CB2), lead: J(FLD_A, FLD_B, FLD_A, FLD_B2),
    lw: 'p25', lv: 0.07, hm: 'arp', hp: '0 2 1 2 0 2 1 2', hw: 'p12', hv: 0.028, ho: 4, bp: 'R . R 5 R . R 5', bw: 'tri', bv: 0.19, dp: 'k . h k s . h .', dv: 0.32, calm: 1 },
  orchard: { bpm: 96, spb: 6, chords: J(ORC_CA, ORC_CB, ORC_CA, ORC_CB2), lead: J(ORC_A, ORC_B, ORC_A, ORC_B2),
    lw: 'p25', lv: 0.072, hm: 'arp', hp: '0 1 2 3 2 1', hw: 'tri', hv: 0.06, ho: 4, bp: 'R . 5 . 5 .', bw: 'tri', bv: 0.19, dp: 'k . h . h .', dv: 0.3, calm: 1 },
  woods: { bpm: 92, spb: 8, chords: J(WDS_CA, WDS_CB, WDS_CA, WDS_CB2), lead: J(WDS_A, WDS_B, WDS_A, WDS_B2),
    lw: 'p25', lv: 0.065, hm: 'arp', hp: '0 1 2 3 0 1 2 3', hw: 'p12', hv: 0.026, ho: 4, bp: 'R - - - 5 - R -', bw: 'tri', bv: 0.19, dp: 'k . h . . . h .', dv: 0.26, calm: 1 },
  lake: { bpm: 76, spb: 8, chords: J(LAKE_CA, LAKE_CB, LAKE_CA, LAKE_CB2), lead: J(LAKE_A, LAKE_B, LAKE_A, LAKE_B2),
    lw: 'tri', lv: 0.15, hm: 'arp', hp: '0 1 2 3 4 3 2 1', hw: 'sine', hv: 0.06, ho: 4, bp: 'R - - - - - - -', bw: 'tri', bv: 0.17, dp: '. . . . . . h .', dv: 0.18, calm: 1 },
  chapel: { bpm: 72, spb: 8, chords: J(CHP_CA, CHP_CB, CHP_CA, CHP_CB), lead: J(CHP_A, CHP_B, CHP_A, CHP_B),
    lw: 'organ', lv: 0.05, hm: 'pad', hw: 'organ', hv: 0.022, ho: 4, bp: 'R - - - 5 - - -', bw: 'tri', bv: 0.17, dp: null, calm: 1 },
  eerie: { bpm: 70, spb: 8, chords: J(EER_CA, EER_CB, EER_CA, EER_CB), lead: J(EER_A, EER_B, EER_A, EER_B),
    lw: 'tri', lv: 0.13, hm: 'pad', hw: 'sine', hv: 0.035, ho: 3, bp: 'R - - - - - - -', bw: 'tri', bv: 0.18, dp: 'k . k . . . . .', dv: 0.4 },
  hollow: { bpm: 100, spb: 8, chords: J(HOL_CA, HOL_CB, HOL_CA, HOL_CB), lead: J(HOL_A, HOL_B, HOL_A, HOL_B),
    lw: 'p25', lv: 0.068, hm: 'arp', hp: '0 1 2 1 0 1 2 1', hw: 'p12', hv: 0.026, ho: 4, bp: 'R . R . 5 . R .', bw: 'tri', bv: 0.2, dp: 'k . h . s . h h', dv: 0.3 },
  cave: { bpm: 84, spb: 8, chords: J(CAV_CA, CAV_CB, CAV_CA, CAV_CB), lead: J(CAV_A, CAV_B, CAV_A, CAV_B),
    lw: 'tri', lv: 0.14, hm: 'arp', hp: '3 2 1 0 1 2 3 2', hw: 'p12', hv: 0.022, ho: 4, bp: 'R - - - - - 5 -', bw: 'tri', bv: 0.2, dp: 'k . . . . . h .', dv: 0.3 },
  mill: { bpm: 120, spb: 8, chords: J(MIL_CA, MIL_CB, MIL_CA, MIL_CB), lead: J(MIL_A, MIL_B, MIL_A, MIL_B),
    lw: 'p25', lv: 0.066, hm: 'arp', hp: '0 1 2 3 0 1 2 3', hw: 'p12', hv: 0.024, ho: 4, bp: 'R R . R 5 . R .', bw: 'tri', bv: 0.19, dp: 'k h s h k h s h', dv: 0.28 },
  boss: { bpm: 150, spb: 8, chords: J(BOS_CA, BOS_CB, BOS_CA, BOS_CB), lead: J(BOS_A, BOS_B, BOS_A, BOS_B),
    lw: 'sq', lv: 0.055, hm: 'arp', hp: '0 1 2 3 0 1 2 3', hw: 'p12', hv: 0.026, ho: 4, bp: 'R O R O R O R O', bw: 'tri', bv: 0.21, dp: 'k h s h k k s h', dv: 0.34 },
  under: { bpm: 88, spb: 8, chords: J(UND_CA, UND_CB, UND_CA, UND_CB), lead: J(UND_A, UND_B, UND_A, UND_B),
    lw: 'tri', lv: 0.13, hm: 'arp', hp: '0 1 2 3 2 1 0 1', hw: 'p12', hv: 0.022, ho: 4, bp: 'R - - - R - 5 -', bw: 'tri', bv: 0.18, dp: 'k . . . s . . .', dv: 0.25 },
  glitch: { bpm: 110, spb: 8, chords: J(GLI_CA, GLI_CB, GLI_CA, GLI_CB), lead: J(GLI_A, GLI_B, GLI_A, GLI_B),
    lw: 'p12', lv: 0.06, hm: 'arp', hp: '0 2 1 3 0 2 1 3', hw: 'tri', hv: 0.05, ho: 4, bp: 'R . . R . R . .', bw: 'tri', bv: 0.2, dp: 'k . s k . k s .', dv: 0.3, glitch: 1 },
  mem: { bpm: 70, spb: 8, chords: J(VIL_CA, VIL_CB, VIL_CA, VIL_CB2), lead: J(VIL_A, VIL_B, VIL_A, VIL_B2),
    lw: 'box', lv: 0.09, hm: 'pad', hw: 'sine', hv: 0.025, ho: 4, bp: 'R - - - - - - -', bw: 'sine', bv: 0.16, dp: null, calm: 1 },
  p1dim: { bpm: 54, spb: 8, chords: 'Dm Dm Bb Bb Dm Dm Gm A', lead: P1DIM_M,
    lw: 'sine', lv: 0.05, hm: 'pad', hw: 'sine', hv: 0.03, ho: 3, bp: 'R - - - - - - -', bw: 'sine', bv: 0.2, dp: null },
  p1sky: { bpm: 84, spb: 6, chords: J('C G F C C G Am/D G', 'Am G Am F C G Cm G'), lead: J(P1SKY_A, P1SKY_B),
    lw: 'box', lv: 0.09, hm: 'arp', hp: '0 1 2 1 2 1', hw: 'sine', hv: 0.028, ho: 4, bp: 'R - - 5 - -', bw: 'sine', bv: 0.13, dp: null, calm: 1 },
  p1hall: { bpm: 60, spb: 8, chords: 'F Am Bb F Dm Am Bb C', lead: P1HALL_M,
    lw: 'choir', lv: 0.045, hm: 'pad', hw: 'choir', hv: 0.026, ho: 4, bp: 'R - - - - - - -', bw: 'sine', bv: 0.1, dp: null, calm: 1 },
  p1corr: { bpm: 92, spb: 8, chords: 'Em Em C B', lead: P1CORR_M,
    lw: 'tri', lv: 0.1, hm: 'arp', hp: '0 2 1 2 0 2 1 2', hw: 'p12', hv: 0.02, ho: 4, bp: 'R . . . R . . .', bw: 'tri', bv: 0.15, dp: 'k . . . . . . .', dv: 0.2 },
  p1night: { bpm: 66, spb: 8, chords: 'Am F C G Am F E E', lead: P1NIGHT_M,
    lw: 'tri', lv: 0.1, hm: 'pad', hw: 'sine', hv: 0.025, ho: 4, bp: 'R - - - 5 - - -', bw: 'tri', bv: 0.13, dp: '. . . . h . . .', dv: 0.12, calm: 1 },
  p1fight: { bpm: 156, spb: 8, chords: J('F#m F#m D E F#m F#m D C#', 'Bm F#m G C# Bm D E C#'), lead: J(P1FIGHT_A, P1FIGHT_B),
    lw: 'sq', lv: 0.05, hm: 'arp', hp: '0 1 2 3 0 1 2 3', hw: 'p12', hv: 0.025, ho: 4, bp: 'R O R O R O R O', bw: 'tri', bv: 0.2, dp: 'k h s h k k s h', dv: 0.32 },
  void: { bpm: 60, spb: 8, chords: 'Am Am Bb Am Am Am Bb Am Am Am Bb Am Am Am Bb Am', lead: J(VOID_M, VOID_M),
    lw: 'sine', lv: 0.05, hm: 'pad', hw: 'sine', hv: 0.03, ho: 3, bp: 'R - - - - - - -', bw: 'sine', bv: 0.2, dp: null },
};

// ---------------- compile ----------------
const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function noteNum(tok) {
  const m = /^([a-g])([#b]?)(\d)$/.exec(tok);
  if (!m) return null;
  return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus: [0, 5, 7], '5': [0, 7] };
function chordOf(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  if (!m) return null;
  const root = PC[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const q = QUAL[m[3]];
  if (!q) return null;
  return { root: (root + 12) % 12, iv: q };
}
function compile(name, s) {
  const toks = s.lead.split(/\s+/).filter(Boolean);
  const bars = s.chords.split(/\s+/).filter(Boolean);
  const spb = s.spb, len = bars.length * spb;
  const errs = [];
  if (toks.length !== len) errs.push(name + ': lead has ' + toks.length + ' steps, chords need ' + len);
  // chords per step
  const ch = new Array(len);
  bars.forEach((b, i) => {
    const parts = b.split('/');
    const seg = spb / parts.length;
    parts.forEach((p, j) => { const c = chordOf(p); if (!c) errs.push(name + ': bad chord ' + p); for (let k = 0; k < seg; k++) ch[i * spb + j * seg + k] = c || { root: 0, iv: [0, 4, 7] }; });
  });
  // lead events
  const lead = new Array(len).fill(null);
  let last = null;
  for (let i = 0; i < len; i++) {
    const t = toks[i] || '.';
    if (t === '-') { if (last) last.len++; continue; }
    if (t === '.') { last = null; continue; }
    const n = noteNum(t);
    if (n == null) { errs.push(name + ': bad note ' + t + ' @' + i); last = null; continue; }
    last = { n, len: 1 }; lead[i] = last;
  }
  // bass
  const bp = s.bp.split(/\s+/), bass = new Array(len).fill(null);
  last = null;
  for (let i = 0; i < len; i++) {
    const t = bp[i % bp.length], c = ch[i];
    if (t === '-') { if (last) last.len++; continue; }
    if (t === '.') { last = null; continue; }
    const r = 36 + c.root; // C2..B2
    const n = t === 'R' ? r : t === '5' ? r + 7 : t === 'O' ? r + 12 : t === '3' ? r + c.iv[1] : r;
    last = { n, len: 1 }; bass[i] = last;
  }
  // harmony
  const harm = new Array(len).fill(null);
  const base = 12 * ((s.ho || 4) + 1);
  const tones = c => { const out = []; for (const o of [0, 12]) for (const v of c.iv) out.push(base + ((c.root + v) % 12) + o + (c.root + v >= 12 ? 0 : 0)); return out.sort((a, b) => a - b); };
  if (s.hm === 'arp') {
    const hp = s.hp.split(/\s+/).map(Number);
    for (let i = 0; i < len; i++) { const tn = tones(ch[i]); harm[i] = [{ n: tn[hp[i % hp.length] % tn.length], len: 1 }]; }
  } else if (s.hm === 'pad') {
    for (let i = 0; i < len;) {
      let j = i + 1; while (j < len && ch[j] === ch[i] && (j % spb) !== 0) j++;
      const c = ch[i];
      harm[i] = c.iv.slice(0, 3).map(v => ({ n: base + ((c.root + v) % 12), len: j - i }));
      i = j;
    }
  }
  // drums
  const dp = s.dp ? s.dp.split(/\s+/) : null, drum = new Array(len).fill(null);
  if (dp) for (let i = 0; i < len; i++) { const t = dp[i % dp.length]; if (t !== '.') drum[i] = t; }
  return { name, len, spb, step: 60 / s.bpm / 2 * (spb === 6 ? 1 : 1), lead, bass, harm, drum, s, errs };
}
const COMPILED = {};
const ERRS = [];
for (const k of Object.keys(SONGS)) { const c = compile(k, SONGS[k]); COMPILED[k] = c; ERRS.push(...c.errs); }
G.SHMUSIC = { SONGS: COMPILED, ERRS, list: Object.keys(SONGS) };
})(typeof window !== 'undefined' ? window : globalThis);
