/* Unit 1 muscle model: schematic anterior and posterior views.
 *
 * CORRECTION ROUNDS: all anatomy lives in this file. Each muscle is drawn on
 * the subject's RIGHT side and mirrored to the left automatically.
 *   Anterior view : subject faces you, so their right is on YOUR left (x < 200).
 *   Posterior view: you see their back, so their right is on YOUR right (x > 200).
 * Canvas is 400 x 830, midline x = 200. Shapes are deliberately simplified.
 *
 * scene = one view + one layer. `draw` is bottom-to-top paint order,
 * `ghost` are overlying muscles removed for this layer (dashed outline),
 * `spots` are the blind-placing targets: [muscleId, x, y] on the right side.
 */
(function () {
  'use strict';

  var OS = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/';
  var REF = {
    hip: OS + '11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs',
    back: OS + '11-3-axial-muscles-of-the-head-neck-and-back',
    wall: OS + '11-4-axial-muscles-of-the-abdominal-wall-and-thorax'
  };

  // group -> CSS colour token (defined in unit1.html)
  var M = {
    // ---------- anterior ----------
    iliopsoas: { name: 'Iliopsoas', group: 'hipflex', view: 'ant', ref: REF.hip,
      where: 'Psoas major runs down beside the lumbar vertebrae; iliacus fills the inside of the iliac blade. They join and pass under the inguinal ligament to the lesser trochanter.',
      d: 'M184,66 L186,186 C184,210 176,232 168,258 L162,284 L154,280 C158,256 166,230 172,206 L174,70 Z M122,152 C140,146 162,160 178,190 L168,250 L160,280 L152,276 C150,250 140,226 128,200 C122,184 120,166 122,152 Z' },
    tfl: { name: 'Tensor fasciae latae (TFL)', group: 'hipflex', view: 'ant', ref: REF.hip,
      where: 'Short, flat muscle just below and behind the front point of the hip bone (ASIS). It pulls on the iliotibial band.',
      d: 'M128,196 L142,202 C140,240 134,270 126,294 L112,290 C114,262 120,226 128,196 Z' },
    rf: { name: 'Rectus femoris', group: 'quad', view: 'ant', ref: REF.hip,
      where: 'Straight down the front of the thigh, from the hip bone (AIIS) to the patella. The only quadriceps muscle that crosses the hip.',
      d: 'M140,216 L152,216 C168,270 176,330 172,400 C170,440 168,462 164,474 L158,474 C150,450 140,420 136,380 C132,320 134,260 140,216 Z' },
    vl: { name: 'Vastus lateralis', group: 'quad', view: 'ant', ref: REF.hip,
      where: 'Outer front of the thigh, the largest quadriceps muscle. Lies under the iliotibial band at the side.',
      d: 'M124,262 C130,256 138,258 140,268 C134,300 132,360 136,400 C142,440 152,464 156,478 L148,484 C134,470 120,440 114,400 C108,350 112,300 124,262 Z' },
    vm: { name: 'Vastus medialis', group: 'quad', view: 'ant', ref: REF.hip,
      where: 'Inner front of the thigh, the teardrop bulge just above and inside the kneecap.',
      d: 'M168,330 C178,360 190,420 194,456 C196,478 186,492 174,490 L166,476 C172,460 172,420 168,330 Z' },
    vi: { name: 'Vastus intermedius', group: 'quad', view: 'ant', ref: REF.hip,
      where: 'Directly under rectus femoris, on the front of the femur, between the other two vasti. You only see it with rectus femoris removed.',
      d: 'M144,250 L156,250 C166,300 168,380 166,440 L160,472 L150,472 C142,420 138,330 144,250 Z' },
    addl: { name: 'Adductor longus', group: 'add', view: 'ant', ref: REF.hip,
      where: 'Inner thigh, fanning from the front of the pubis down to the middle of the femur. The tendon is the cord you feel in the groin.',
      d: 'M188,250 L196,256 C190,300 180,350 172,394 L158,384 C166,340 178,292 188,250 Z' },
    addm: { name: 'Adductor magnus', group: 'add', view: 'both', ref: REF.hip,
      where: 'The largest adductor: the back of the inner thigh, deep to adductor longus from the front and beside the hamstrings from behind.',
      d: 'M178,268 L196,270 L198,340 C196,410 192,460 188,492 L180,490 C176,440 168,400 160,380 C164,330 170,290 178,268 Z',
      dPost: 'M214,276 L228,278 C222,330 216,400 212,470 L210,496 L202,496 C200,440 200,360 204,300 Z' },
    ta: { name: 'Tibialis anterior', group: 'shin', view: 'ant', ref: REF.hip,
      where: 'Just outside the sharp front edge of the shinbone (tibia). Its tendon crosses the front of the ankle to the inner foot.',
      d: 'M150,532 L164,534 C166,600 168,660 172,710 C176,740 184,770 186,790 L180,792 C172,770 164,740 160,712 C154,660 150,600 150,532 Z' },

    // ---------- posterior ----------
    gmax: { name: 'Gluteus maximus', group: 'glute', view: 'post', ref: REF.hip,
      where: 'The large, thick muscle of the buttock, from the back of the pelvis and sacrum down and outward to the femur and iliotibial band.',
      d: 'M218,180 C228,168 246,160 262,162 L300,236 C304,262 298,300 286,330 L254,334 C236,324 218,302 208,276 L206,236 Z' },
    gmed: { name: 'Gluteus medius', group: 'glute', view: 'post', ref: REF.hip,
      where: 'Upper outer buttock, below the iliac crest. Its top-outer part is not covered by gluteus maximus.',
      d: 'M240,160 L272,148 C286,152 296,170 300,200 L298,246 L284,252 C268,220 254,190 240,160 Z' },
    gmin: { name: 'Gluteus minimus', group: 'glute', view: 'post', ref: REF.hip,
      where: 'The smallest and deepest gluteal, directly under gluteus medius, to the front of the greater trochanter.',
      d: 'M252,172 L282,164 C292,180 296,210 294,244 L284,248 C274,220 262,196 252,172 Z' },
    pir: { name: 'Piriformis', group: 'glute', view: 'post', ref: REF.hip,
      where: 'Deep to gluteus maximus, from the front of the sacrum out to the top of the greater trochanter, just below gluteus medius.',
      d: 'M210,214 L218,210 C246,220 268,232 288,240 L286,252 C264,246 240,236 212,236 Z' },
    bf: { name: 'Biceps femoris', group: 'ham', view: 'post', ref: REF.hip,
      where: 'The outer (lateral) hamstring, from the ischial tuberosity to the head of the fibula. Its tendon is the outer cord behind the knee.',
      d: 'M240,278 L250,280 C262,330 274,390 276,440 C276,480 270,505 264,526 L256,524 C258,500 258,470 252,440 C246,390 240,330 240,278 Z' },
    st: { name: 'Semitendinosus', group: 'ham', view: 'post', ref: REF.hip,
      where: 'Inner (medial) hamstring that turns into a long, thin tendon halfway down. The tendon is the inner cord behind the knee.',
      d: 'M228,276 L242,280 C238,330 230,390 222,440 C216,480 212,510 210,540 L204,538 C204,500 208,460 212,420 C216,370 222,320 228,276 Z' },
    sm: { name: 'Semimembranosus', group: 'ham', view: 'post', ref: REF.hip,
      where: 'Inner hamstring lying deep to semitendinosus, broad and flat at the top, attaching to the back of the inner tibia.',
      d: 'M232,286 L246,290 C246,350 242,420 236,470 C232,500 224,520 218,528 L210,522 C214,480 220,420 224,360 Z' },
    gastroc: { name: 'Gastrocnemius', group: 'calf', view: 'post', ref: REF.hip,
      where: 'The two-headed calf muscle that crosses the back of the knee and joins the Achilles tendon.',
      d: 'M212,500 C222,496 232,500 236,508 C240,500 250,496 260,500 C268,540 268,600 256,650 C248,676 240,690 238,720 L236,780 L228,780 L226,720 C224,690 216,676 210,650 C200,600 202,540 212,500 Z' },
    soleus: { name: 'Soleus', group: 'calf', view: 'post', ref: REF.hip,
      where: 'Flat, broad muscle under gastrocnemius. Its edges show either side of the lower calf. Does not cross the knee.',
      d: 'M208,560 L264,560 C270,610 264,670 248,710 C242,730 238,750 236,770 L228,770 C226,750 222,730 216,710 C202,670 200,610 208,560 Z' },
    es: { name: 'Erector spinae', group: 'back', view: 'post', ref: REF.back,
      where: 'Thick columns either side of the spine in the low back (three columns: iliocostalis, longissimus, spinalis). Drawn with the overlying fascia removed.',
      d: 'M206,40 L238,40 C244,90 246,140 240,180 C234,210 222,236 210,250 L206,250 Z' },
    mult: { name: 'Multifidus', group: 'back', view: 'post', ref: REF.back,
      where: 'Deep, right against the spinous processes, thickest in the low back and over the sacrum. Lies under erector spinae.',
      d: 'M203,60 L216,60 C220,130 222,200 218,250 L206,262 L203,262 Z' },
    ql: { name: 'Quadratus lumborum', group: 'back', view: 'post', ref: REF.wall,
      where: 'Square sheet from the 12th rib and lumbar transverse processes down to the iliac crest, deep to and just lateral to erector spinae.',
      d: 'M222,64 L250,70 C258,100 264,130 268,150 L236,156 C232,120 226,90 222,64 Z' },

    // ---------- context (not in the roster, never targets) ----------
    itbA: { name: 'Iliotibial band', group: 'ctx', view: 'ant', context: true, d: 'M110,290 L120,294 C122,380 130,450 140,520 L132,522 C120,450 112,380 110,290 Z' },
    sart: { name: 'Sartorius', group: 'ctx', view: 'ant', context: true, d: 'M136,200 L146,206 C156,280 176,360 196,470 C198,500 192,520 186,530 L180,526 C184,506 186,486 182,470 C166,370 148,290 136,200 Z' },
    grac: { name: 'Gracilis', group: 'ctx', view: 'ant', context: true, d: 'M196,262 L200,264 L198,330 C196,420 194,480 190,524 L184,522 C188,470 190,400 192,330 Z' },
    itbP: { name: 'Iliotibial band', group: 'ctx', view: 'post', context: true, d: 'M290,300 L300,296 C298,380 290,450 270,524 L262,522 C280,450 288,380 290,300 Z' }
  };

  var BONES = {
    ant: [
      'M186,62 h28 v22 h-28 Z M186,88 h28 v22 h-28 Z M186,114 h28 v22 h-28 Z M186,140 h28 v22 h-28 Z M186,166 h28 v22 h-28 Z',
      'M182,192 L218,192 L210,250 L200,262 L190,250 Z',
      { m: 'M188,40 C160,44 130,58 112,84 L116,88 C134,66 160,52 188,48 Z' },
      { m: 'M182,195 C175,160 150,140 120,148 C108,160 110,180 128,196 L140,212 C146,222 150,228 150,232 L170,240 L196,246 L196,262 L178,266 C170,280 160,290 150,284 C142,276 140,262 146,250 Z' },
      { m: 'M118,246 L134,244 L150,262 L160,280 L158,300 L170,480 L186,495 L186,512 L140,512 L140,495 L150,480 L130,300 L116,270 Z' },
      { m: 'M152,223 a13,13 0 1,0 0.1,0 Z' },
      { m: 'M148,518 L188,518 L184,540 L178,560 L180,750 L190,768 L178,772 L166,760 L166,560 L152,540 Z' },
      { m: 'M138,522 L146,522 L152,750 L150,770 L140,770 L142,750 L136,540 Z' },
      { m: 'M140,772 L192,772 L198,800 L196,820 L130,820 L132,800 Z' },
      { m: 'M163,472 a13,16 0 1,0 0.1,0 Z' }
    ],
    post: [
      'M194,50 h12 v14 h-12 Z M194,76 h12 v14 h-12 Z M194,102 h12 v14 h-12 Z M194,128 h12 v14 h-12 Z M194,154 h12 v14 h-12 Z',
      'M182,190 L218,190 L212,250 L204,270 L200,280 L196,270 L188,250 Z',
      { m: 'M212,40 C240,44 270,58 288,84 L284,88 C266,66 240,52 212,48 Z' },
      { m: 'M218,195 C225,160 250,140 280,148 C292,160 290,180 272,196 L260,212 C254,222 250,228 250,232 L230,240 L204,246 L204,262 L222,266 C230,280 240,290 250,284 C258,276 260,262 254,250 Z' },
      { m: 'M282,246 L266,244 L250,262 L240,280 L242,300 L230,480 L214,495 L214,512 L260,512 L260,495 L250,480 L270,300 L284,270 Z' },
      { m: 'M252,518 L212,518 L216,540 L222,560 L220,750 L210,768 L222,772 L234,760 L234,560 L248,540 Z' },
      { m: 'M262,522 L254,522 L248,750 L250,770 L260,770 L258,750 L264,540 Z' },
      { m: 'M212,772 L262,772 L256,800 L250,826 L222,826 L216,800 Z' }
    ]
  };

  var SCENES = [
    { id: 'ant-sup', view: 'ant', layer: 'Superficial', title: 'Front, superficial',
      draw: ['vl', 'vm', 'rf', 'addl', 'grac', 'tfl', 'itbA', 'sart', 'ta'],
      ghost: [],
      spots: [['tfl', 128, 240], ['rf', 150, 384], ['vl', 127, 404], ['vm', 177, 464], ['addl', 179, 318], ['ta', 160, 620]],
      note: 'Abdominal wall not drawn. Sartorius, gracilis and the iliotibial band are shown in grey as landmarks; they are not in this course’s roster.' },
    { id: 'ant-deep', view: 'ant', layer: 'Deep', title: 'Front, deep',
      draw: ['addm', 'vi', 'vl', 'vm', 'iliopsoas', 'tfl', 'itbA', 'ta'],
      ghost: ['rf', 'sart', 'addl', 'grac'],
      spots: [['iliopsoas', 150, 184], ['vi', 152, 330], ['addm', 191, 372]],
      note: 'Rectus femoris, sartorius, adductor longus and gracilis removed (dashed outlines).' },
    { id: 'post-sup', view: 'post', layer: 'Superficial', title: 'Back, superficial',
      draw: ['es', 'gmed', 'gmax', 'addm', 'sm', 'st', 'bf', 'itbP', 'soleus', 'gastroc'],
      ghost: [],
      spots: [['es', 226, 120], ['gmax', 250, 250], ['gmed', 285, 186], ['st', 221, 400], ['bf', 262, 400], ['addm', 209, 360], ['gastroc', 235, 580], ['soleus', 248, 700]],
      note: 'Skin, fat and the thoracolumbar fascia over the low back are not drawn.' },
    { id: 'post-deep', view: 'post', layer: 'Deep', title: 'Back, deep',
      draw: ['ql', 'mult', 'gmin', 'pir', 'addm', 'sm', 'soleus', 'itbP'],
      ghost: ['es', 'gmax', 'gmed', 'st', 'bf', 'gastroc'],
      spots: [['gmin', 281, 205], ['pir', 240, 228], ['sm', 232, 400], ['mult', 210, 150], ['ql', 246, 115]],
      note: 'Erector spinae, the gluteus maximus and medius, semitendinosus, biceps femoris and gastrocnemius removed (dashed outlines).' }
  ];

  // Roster as the learner sees it in the name list (stable order, A to Z).
  var ROSTER = Object.keys(M).filter(function (k) { return !M[k].context; })
    .sort(function (a, b) { return M[a].name.localeCompare(M[b].name); });

  function pathFor(id, view) { var m = M[id]; return view === 'post' && m.dPost ? m.dPost : m.d; }

  var data = { MUSCLES: M, BONES: BONES, SCENES: SCENES, ROSTER: ROSTER, REF: REF, pathFor: pathFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else { window.BP = window.BP || {}; window.BP.muscles = data; }
})();
