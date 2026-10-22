// Run: node tests/figure.test.js
// Checks every joint action moves the way anatomy says it should, and that
// each movement stays in its own plane (displacement along the plane's axis = 0).
'use strict';
var g = require('../js/figure.js');
var fails = 0;

function check(id, desc, fn) {
  var mv = g.byId(id), a = g.poseAt(mv, 0), b = g.poseAt(mv, 1);
  var ok = fn(a, b);
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + id + ': ' + desc);
}
// +x = subject's left, so for the RIGHT side, lateral = more negative x.
var X = 0, Y = 1, Z = 2;
check('sh-flex', 'hand goes forward and up', function (a, b) { return b.handR[Y] > a.shoulderR[Y] && g.poseAt(g.byId('sh-flex'), 0.4).handR[Z] > 0.1; });
check('sh-ext', 'hand goes backward', function (a, b) { return b.handR[Z] < -0.1; });
check('elb-flex', 'hand comes forward and up', function (a, b) { return b.handR[Y] > a.handR[Y] && g.poseAt(g.byId('elb-flex'), 0.5).handR[Z] > 0.1; });
check('hip-flex', 'foot comes forward', function (a, b) { return b.ankleR[Z] > 0.3; });
check('hip-ext', 'foot goes back', function (a, b) { return b.ankleR[Z] < -0.05; });
check('knee-flex', 'ankle goes behind the knee', function (a, b) { return b.ankleR[Z] < -0.2; });
check('dorsi', 'toes rise', function (a, b) { return b.toeR[Y] > a.toeR[Y] + 0.03; });
check('plantar', 'toes drop', function (a, b) { return b.toeR[Y] < a.toeR[Y] - 0.05; });
check('trunk-flex', 'head goes forward and down', function (a, b) { return b.head[Z] > 0.3 && b.head[Y] < a.head[Y]; });
check('sh-abd', 'hand goes out to the side and up', function (a, b) { return g.poseAt(g.byId('sh-abd'), 0.5).handR[X] < -0.5 && b.handR[Y] > a.shoulderR[Y]; });
check('sh-add', 'hand returns to the side', function (a, b) { return a.handR[X] < -0.5 && Math.abs(b.handR[X] - g.REST.handR[X]) < 1e-9; });
check('hip-abd', 'foot goes out to the side', function (a, b) { return b.ankleR[X] < a.ankleR[X] - 0.2; });
check('hip-add', 'foot returns to midline position', function (a, b) { return a.ankleR[X] < -0.3 && Math.abs(b.ankleR[X] - g.REST.ankleR[X]) < 1e-9; });
check('lat-flex', 'head tilts to the right', function (a, b) { return b.head[X] < -0.2; });
check('invert', 'medial edge rises, lateral edge drops (sole faces in)', function (a, b) { return b.footMedR[Y] > a.footMedR[Y] && b.footLatR[Y] < a.footLatR[Y]; });
check('evert', 'lateral edge rises', function (a, b) { return b.footLatR[Y] > a.footLatR[Y]; });
check('hip-lat-rot', 'toes turn out', function (a, b) { return b.toeR[X] < a.toeR[X] - 0.05; });
check('hip-med-rot', 'toes turn in', function (a, b) { return b.toeR[X] > a.toeR[X] + 0.05; });
check('trunk-rot', 'left shoulder comes forward (turning right)', function (a, b) { return b.shoulderL[Z] > 0.1 && b.shoulderR[Z] < -0.1; });
check('sh-med-rot', 'hand swings toward belly', function (a, b) { return a.handR[Z] > 0.2 && b.handR[X] > a.handR[X] + 0.1; });
check('sh-lat-rot', 'hand swings outward', function (a, b) { return b.handR[X] < a.handR[X] - 0.1; });
check('sh-hz-abd', 'arm swings from front to side', function (a, b) { return a.handR[Z] > 0.5 && b.handR[X] < -0.6; });
check('sh-hz-add', 'arm swings across the body', function (a, b) { return b.handR[X] > a.handR[X] + 0.2; });
check('pronate', 'thumb goes from lateral to medial', function (a, b) { return a.thumbR[X] < a.wristR[X] && b.thumbR[X] > b.wristR[X]; });

// In-plane check: no moving point changes its coordinate along the plane's axis.
g.MOVEMENTS.forEach(function (mv) {
  var n = g.AXES[mv.plane], worst = 0;
  for (var t = 0; t <= 1.0001; t += 0.1) {
    var p0 = g.poseAt(mv, 0), p = g.poseAt(mv, t);
    g.SETS[mv.set].forEach(function (k) { worst = Math.max(worst, Math.abs(g.dot(g.sub(p[k], p0[k]), n))); });
  }
  var ok = worst < 1e-9;
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + mv.id + ': stays in ' + mv.plane + ' plane');
});

// Glass drill truth: frontal glass cracks for every non-frontal movement and never for frontal ones.
g.MOVEMENTS.forEach(function (mv) {
  var cracks = false;
  for (var t = 0; t <= 1.0001; t += 0.05) if (g.leavesPlane(mv, 'fro', g.poseAt(mv, t))) cracks = true;
  var ok = cracks === (mv.plane !== 'fro');
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + mv.id + ': frontal glass ' + (cracks ? 'cracks' : 'holds'));
});

console.log(fails ? fails + ' failure(s)' : 'all passed');
process.exit(fails ? 1 : 0);
