/* BiomechPrimer 3D stick figure.
 *
 * World axes (subject in anatomical position):
 *   +x = subject's LEFT   (so from the front, viewer's right)
 *   +y = up (superior)
 *   +z = anterior (the way the subject faces)
 * Demonstrations use the subject's RIGHT side (x < 0).
 *
 * Every joint action rotates a set of points about the axis perpendicular
 * to its plane. Rotation about an axis never changes a point's distance
 * along that axis, which is exactly why a movement stays "inside" its plane
 * and why the glass-pane test never cracks for the matching plane.
 *
 * The geometry half (no DOM) is exported for Node tests.
 */
(function (root) {
  'use strict';

  var D2R = Math.PI / 180;

  // ---------- geometry ----------
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }

  // Rodrigues rotation of point p about the line through o along unit k.
  // Positive angle = counter-clockwise looking down the axis from its tip.
  function rotateAbout(p, o, k, rad) {
    var v = sub(p, o), c = Math.cos(rad), s = Math.sin(rad);
    var r = add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
    return add(r, o);
  }

  var AXES = { sag: [1, 0, 0], fro: [0, 0, 1], tra: [0, 1, 0] };
  var PLANE_NAMES = { sag: 'Sagittal', fro: 'Frontal (coronal)', tra: 'Transverse (horizontal)' };
  var AXIS_NAMES = { sag: 'mediolateral (M-L) axis', fro: 'anteroposterior (A-P) axis', tra: 'longitudinal (vertical) axis' };
  var DIVIDES = { sag: 'left and right', fro: 'front (anterior) and back (posterior)', tra: 'upper (superior) and lower (inferior)' };

  var REST = {
    pelvis: [0, 1.0, 0], lumbar: [0, 1.06, 0], chest: [0, 1.34, 0], neck: [0, 1.5, 0],
    head: [0, 1.63, 0], nose: [0, 1.63, 0.11],
    shoulderR: [-0.2, 1.45, 0], elbowR: [-0.22, 1.17, 0], wristR: [-0.23, 0.92, 0], handR: [-0.23, 0.83, 0], thumbR: [-0.285, 0.88, 0.01],
    shoulderL: [0.2, 1.45, 0], elbowL: [0.22, 1.17, 0], wristL: [0.23, 0.92, 0], handL: [0.23, 0.83, 0], thumbL: [0.285, 0.88, 0.01],
    hipR: [-0.1, 0.96, 0], kneeR: [-0.1, 0.52, 0.01], ankleR: [-0.1, 0.09, 0], heelR: [-0.1, 0.02, -0.05], toeR: [-0.11, 0.02, 0.17],
    footMedR: [-0.06, 0.02, 0.08], footLatR: [-0.15, 0.02, 0.06],
    hipL: [0.1, 0.96, 0], kneeL: [0.1, 0.52, 0.01], ankleL: [0.1, 0.09, 0], heelL: [0.1, 0.02, -0.05], toeL: [0.11, 0.02, 0.17],
    footMedL: [0.06, 0.02, 0.08], footLatL: [0.15, 0.02, 0.06]
  };

  var SEGMENTS = [
    ['pelvis', 'lumbar'], ['lumbar', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['head', 'nose'],
    ['shoulderR', 'shoulderL'], ['hipR', 'hipL'], ['pelvis', 'hipR'], ['pelvis', 'hipL'],
    ['shoulderR', 'elbowR'], ['elbowR', 'wristR'], ['wristR', 'handR'], ['wristR', 'thumbR'],
    ['shoulderL', 'elbowL'], ['elbowL', 'wristL'], ['wristL', 'handL'], ['wristL', 'thumbL'],
    ['hipR', 'kneeR'], ['kneeR', 'ankleR'], ['ankleR', 'heelR'], ['heelR', 'footLatR'], ['footLatR', 'toeR'], ['toeR', 'footMedR'], ['footMedR', 'heelR'],
    ['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['ankleL', 'heelL'], ['heelL', 'footLatL'], ['footLatL', 'toeL'], ['toeL', 'footMedL'], ['footMedL', 'heelL']
  ];

  var SETS = {};
  SETS.handR = ['handR', 'thumbR'];
  SETS.forearmR = ['wristR'].concat(SETS.handR);
  SETS.armR = ['elbowR'].concat(SETS.forearmR);
  SETS.armL = ['elbowL', 'wristL', 'handL', 'thumbL'];
  SETS.footR = ['heelR', 'toeR', 'footMedR', 'footLatR'];
  SETS.shankR = ['ankleR'].concat(SETS.footR);
  SETS.legR = ['kneeR'].concat(SETS.shankR);
  SETS.upper = ['chest', 'neck', 'head', 'nose', 'shoulderR', 'shoulderL'].concat(SETS.armR, SETS.armL);

  /* Joint actions. angle sign follows rotateAbout's convention about the
   * plane's axis (AXES). Directions are checked in tests/figure.test.js.
   * pre: steps applied fully first, to reach a start position. */
  var MOVEMENTS = [
    // sagittal: rotation about the M-L axis
    { id: 'sh-flex', name: 'Shoulder flexion', plane: 'sag', joint: 'shoulderR', set: 'armR', angle: -170 },
    { id: 'sh-ext', name: 'Shoulder extension', plane: 'sag', joint: 'shoulderR', set: 'armR', angle: 50 },
    { id: 'elb-flex', name: 'Elbow flexion', plane: 'sag', joint: 'elbowR', set: 'forearmR', angle: -140 },
    { id: 'hip-flex', name: 'Hip flexion', plane: 'sag', joint: 'hipR', set: 'legR', angle: -100 },
    { id: 'hip-ext', name: 'Hip extension', plane: 'sag', joint: 'hipR', set: 'legR', angle: 20 },
    { id: 'knee-flex', name: 'Knee flexion', plane: 'sag', joint: 'kneeR', set: 'shankR', angle: 120 },
    { id: 'dorsi', name: 'Ankle dorsiflexion', plane: 'sag', joint: 'ankleR', set: 'footR', angle: -20 },
    { id: 'plantar', name: 'Ankle plantarflexion', plane: 'sag', joint: 'ankleR', set: 'footR', angle: 45 },
    { id: 'trunk-flex', name: 'Trunk flexion', plane: 'sag', joint: 'lumbar', set: 'upper', angle: 70 },
    // frontal: rotation about the A-P axis
    { id: 'sh-abd', name: 'Shoulder abduction', plane: 'fro', joint: 'shoulderR', set: 'armR', angle: -170 },
    { id: 'sh-add', name: 'Shoulder adduction', plane: 'fro', joint: 'shoulderR', set: 'armR', angle: 90,
      pre: [{ joint: 'shoulderR', set: 'armR', plane: 'fro', angle: -90 }], note: 'Starts from 90 degrees of abduction and returns toward the side.' },
    { id: 'hip-abd', name: 'Hip abduction', plane: 'fro', joint: 'hipR', set: 'legR', angle: -40 },
    { id: 'hip-add', name: 'Hip adduction', plane: 'fro', joint: 'hipR', set: 'legR', angle: 40,
      pre: [{ joint: 'hipR', set: 'legR', plane: 'fro', angle: -40 }], note: 'Starts abducted and returns toward the midline.' },
    { id: 'lat-flex', name: 'Trunk lateral flexion', plane: 'fro', joint: 'lumbar', set: 'upper', angle: 30 },
    { id: 'invert', name: 'Inversion (foot)', plane: 'fro', joint: 'ankleR', set: 'footR', angle: 25,
      note: 'Simplified. The real subtalar axis is oblique, so inversion is mostly, not purely, frontal plane.' },
    { id: 'evert', name: 'Eversion (foot)', plane: 'fro', joint: 'ankleR', set: 'footR', angle: -12,
      note: 'Simplified. The real subtalar axis is oblique.' },
    // transverse: rotation about the longitudinal axis
    { id: 'hip-lat-rot', name: 'Hip lateral (external) rotation', plane: 'tra', joint: 'hipR', set: 'legR', angle: -40 },
    { id: 'hip-med-rot', name: 'Hip medial (internal) rotation', plane: 'tra', joint: 'hipR', set: 'legR', angle: 35 },
    { id: 'trunk-rot', name: 'Trunk rotation (to the right)', plane: 'tra', joint: 'lumbar', set: 'upper', angle: -40 },
    { id: 'sh-med-rot', name: 'Shoulder medial rotation', plane: 'tra', joint: 'shoulderR', set: 'armR', angle: 70,
      pre: [{ joint: 'elbowR', set: 'forearmR', plane: 'sag', angle: -90 }], note: 'Elbow bent to 90 degrees so you can see the rotation.' },
    { id: 'sh-lat-rot', name: 'Shoulder lateral rotation', plane: 'tra', joint: 'shoulderR', set: 'armR', angle: -50,
      pre: [{ joint: 'elbowR', set: 'forearmR', plane: 'sag', angle: -90 }], note: 'Elbow bent to 90 degrees so you can see the rotation.' },
    { id: 'sh-hz-abd', name: 'Shoulder horizontal abduction', plane: 'tra', joint: 'shoulderR', set: 'armR', angle: -80,
      pre: [{ joint: 'shoulderR', set: 'armR', plane: 'sag', angle: -90 }], note: 'Starts with the arm raised forward to 90 degrees; that start position is what puts it in the transverse plane.' },
    { id: 'sh-hz-add', name: 'Shoulder horizontal adduction', plane: 'tra', joint: 'shoulderR', set: 'armR', angle: 40,
      pre: [{ joint: 'shoulderR', set: 'armR', plane: 'sag', angle: -90 }], note: 'Starts with the arm raised forward to 90 degrees.' },
    { id: 'pronate', name: 'Forearm pronation', plane: 'tra', joint: 'wristR', set: 'handR', angle: 150,
      note: 'Watch the thumb: it starts lateral (palm forward) and rolls across to medial.' }
  ];

  function byId(id) { for (var i = 0; i < MOVEMENTS.length; i++) if (MOVEMENTS[i].id === id) return MOVEMENTS[i]; return null; }

  function applyStep(pose, step, frac) {
    var o = pose[step.joint], k = AXES[step.plane], rad = step.angle * frac * D2R;
    SETS[step.set].forEach(function (n) { pose[n] = rotateAbout(pose[n], o, k, rad); });
  }

  // Pose at fraction t (0..1) of a movement. No movement = anatomical position.
  function poseAt(mv, t) {
    var pose = {};
    Object.keys(REST).forEach(function (n) { pose[n] = REST[n].slice(); });
    if (!mv) return pose;
    (mv.pre || []).forEach(function (s) { applyStep(pose, s, 1); });
    applyStep(pose, { joint: mv.joint, set: mv.set, plane: mv.plane, angle: mv.angle }, t);
    return pose;
  }

  // Glass crack test: has any moving point shifted along the glass plane's
  // axis? Exactly zero for movements in that plane, so any small threshold works.
  function leavesPlane(mv, plane, pose, rest) {
    var n = AXES[plane];
    rest = rest || poseAt(mv, 0);
    return SETS[mv.set].some(function (nm) { return Math.abs(dot(sub(pose[nm], rest[nm]), n)) > 0.012; });
  }

  var geometry = { leavesPlane: leavesPlane, REST: REST, SETS: SETS, MOVEMENTS: MOVEMENTS, AXES: AXES, byId: byId, poseAt: poseAt, rotateAbout: rotateAbout, dot: dot, sub: sub,
    PLANE_NAMES: PLANE_NAMES, AXIS_NAMES: AXIS_NAMES, DIVIDES: DIVIDES };

  if (typeof module !== 'undefined' && module.exports) { module.exports = geometry; return; }

  // ---------- rendering ----------
  var VIEWS = { front: [0, 0], side: [-90, 0], top: [0, 89], three: [-35, 15] };
  var CENTER = [0, 0.9, 0];

  function Figure(container, opts) {
    opts = opts || {};
    this.el = container;
    this.yaw = opts.yaw != null ? opts.yaw : VIEWS.three[0];
    this.pitch = opts.pitch != null ? opts.pitch : VIEWS.three[1];
    this.zoom = 1;
    this.mv = null; this.t = 0;
    this.planes = { sag: false, fro: false, tra: false };
    this.offsets = { sag: 0, fro: 0, tra: 1.0 }; // plane positions in explorer mode
    this.showAxis = true;
    this.showMovePlane = opts.showMovePlane !== false;
    this.glass = null;          // null | 'sag' | 'fro' | 'tra'
    this.labels = opts.labels !== false;
    this.playing = false;
    this.onCrack = null;
    this.onFrame = null;
    this.cracked = false;

    container.classList.add('stage');
    container.innerHTML = '<svg viewBox="-1.12 -1.16 2.24 2.24" role="img" aria-label="Rotatable 3D figure"></svg>' +
      '<div class="crack" aria-live="polite">CRACK! Left the plane</div>' +
      (opts.hint === false ? '' : '<div class="hint">Drag to rotate</div>');
    this.svg = container.querySelector('svg');
    this.crackEl = container.querySelector('.crack');
    this._bindPointer();
    this.render();
  }

  Figure.prototype._bindPointer = function () {
    var self = this, el = this.el, last = null, id = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      id = e.pointerId; last = [e.clientX, e.clientY];
      el.setPointerCapture(id); el.classList.add('dragging');
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id || !last) return;
      var dx = e.clientX - last[0], dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      self.yaw -= dx * 0.5;
      self.pitch = Math.max(-89, Math.min(89, self.pitch + dy * 0.5));
      self.render();
    });
    function end(e) { if (e.pointerId !== id) return; last = null; id = null; el.classList.remove('dragging'); }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };

  Figure.prototype.setView = function (name) { var v = VIEWS[name]; if (v) { this.yaw = v[0]; this.pitch = v[1]; this.render(); } };
  Figure.prototype.setMovement = function (id) { this.mv = id ? byId(id) : null; this.t = 0; this.cracked = false; this.render(); };
  Figure.prototype.setT = function (t) { this.t = t; this.render(); };

  Figure.prototype.play = function (loops) {
    var self = this, start = null, period = 2600, total = (loops || 2) * period;
    this.stop();
    this.playing = true; this.cracked = false;
    function frame(ts) {
      if (!self.playing) return;
      if (start === null) start = ts;
      var e = ts - start;
      if (e >= total) { self.playing = false; self.t = 0; self.render(); return; }
      var ph = (e % period) / period;            // 0 -> 1
      self.t = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI); // 0 -> 1 -> 0 eased
      self.render();
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };
  Figure.prototype.stop = function () { this.playing = false; if (this._raf) cancelAnimationFrame(this._raf); };

  Figure.prototype._project = function (p) {
    var x = p[0] - CENTER[0], y = p[1] - CENTER[1], z = p[2] - CENTER[2];
    var cy = Math.cos(this.yaw * D2R), sy = Math.sin(this.yaw * D2R);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    var cp = Math.cos(this.pitch * D2R), sp = Math.sin(this.pitch * D2R);
    var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    return [x1 * this.zoom, -y2 * this.zoom, z2];
  };

  function f(n) { return n.toFixed(4); }

  // Split a world-space quad into a grid of cells so they depth-sort with the body.
  Figure.prototype._quad = function (items, c, u, v, cls, n, extra) {
    n = n || 6;
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var a = (i / n) * 2 - 1, b = (j / n) * 2 - 1, a2 = ((i + 1) / n) * 2 - 1, b2 = ((j + 1) / n) * 2 - 1;
        var pts = [[a, b], [a2, b], [a2, b2], [a, b2]].map(function (q) { return add(add(c, scale(u, q[0])), scale(v, q[1])); });
        var pr = pts.map(this._project, this);
        var depth = (pr[0][2] + pr[1][2] + pr[2][2] + pr[3][2]) / 4;
        items.push({ z: depth - 0.0001, s: '<polygon class="' + cls + '" points="' + pr.map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' ') + '"' + (extra || '') + '/>' });
      }
    }
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) { return this._project(add(add(c, scale(u, q[0])), scale(v, q[1]))); }, this);
    return corners;
  };

  // Half-size vectors spanning a plane of the given kind.
  function spans(kind, w, h) {
    if (kind === 'sag') return [[0, h, 0], [0, 0, w]];
    if (kind === 'fro') return [[w, 0, 0], [0, h, 0]];
    return [[w, 0, 0], [0, 0, h]];
  }

  Figure.prototype.render = function () {
    var self = this, items = [], overlay = [];
    var pose = poseAt(this.mv, this.t);
    var moving = {};
    if (this.mv) SETS[this.mv.set].forEach(function (n) { moving[n] = true; });

    // floor
    var floor = [[-0.6, 0, -0.5], [0.6, 0, -0.5], [0.6, 0, 0.5], [-0.6, 0, 0.5]].map(this._project, this);
    overlay.push('<polygon class="floor" points="' + floor.map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' ') + '"/>');

    // explorer planes
    ['sag', 'fro', 'tra'].forEach(function (k) {
      if (!self.planes[k]) return;
      var c = k === 'sag' ? [self.offsets.sag, 0.92, 0] : k === 'fro' ? [0, 0.92, self.offsets.fro] : [0, self.offsets.tra, 0];
      var s = k === 'sag' ? spans(k, 0.5, 0.92) : k === 'fro' ? spans(k, 0.6, 0.92) : spans(k, 0.6, 0.5);
      var corners = self._quad(items, c, s[0], s[1], 'plane-' + k);
      self._outline(items, corners, k, self.labels ? PLANE_NAMES[k].split(' ')[0] : '');
    });

    // movement plane and axis through the joint
    if (this.mv) {
      var j = pose[this.mv.joint], k = this.mv.plane;
      if (this.showMovePlane) {
        var s = spans(k, 0.75, 0.75);
        var corners = this._quad(items, j, s[0], s[1], 'plane-' + k);
        this._outline(items, corners, k, this.labels ? PLANE_NAMES[k].split(' ')[0] + ' plane' : '');
      }
      if (this.showAxis) {
        var ax = AXES[k], a = this._project(add(j, scale(ax, -0.4))), b = this._project(add(j, scale(ax, 0.4)));
        items.push({ z: (a[2] + b[2]) / 2 + 0.05, s: '<line class="axis axis-' + k + '" x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"/>' +
          '<circle class="axis-end axis-' + k + '" cx="' + f(a[0]) + '" cy="' + f(a[1]) + '" r="0.018"/><circle class="axis-end axis-' + k + '" cx="' + f(b[0]) + '" cy="' + f(b[1]) + '" r="0.018"/>' });
      }
    }

    // glass panes: two panes parallel to the chosen plane, hugging the moving part
    var cracked = false;
    if (this.mv && this.glass) {
      var n = AXES[this.glass], jj = pose[this.mv.joint], rest = poseAt(this.mv, 0), d = 0.06;
      SETS[this.mv.set].forEach(function (nm) { d = Math.max(d, Math.abs(dot(sub(rest[nm], rest[self.mv.joint]), n)) + 0.04); });
      cracked = leavesPlane(this.mv, this.glass, pose, rest);
      var gs = spans(this.glass, 0.7, 0.7);
      [-1, 1].forEach(function (sgn) {
        var c = add(jj, scale(n, sgn * d));
        var cs = self._quad(items, c, gs[0], gs[1], 'glass' + (cracked ? ' broken' : ''), 5);
        self._outline(items, cs, 'glass', '');
      });
    }
    if (cracked && !this.cracked && this.onCrack) this.onCrack();
    this.cracked = this.cracked || cracked;
    if (this.crackEl) this.crackEl.classList.toggle('on', cracked);

    // body: split segments in 3 so they sort against plane cells
    SEGMENTS.forEach(function (sg) {
      var p = pose[sg[0]], q = pose[sg[1]], hot = !!moving[sg[1]];
      for (var i = 0; i < 3; i++) {
        var a = self._project(add(p, scale(sub(q, p), i / 3))), b = self._project(add(p, scale(sub(q, p), (i + 1) / 3)));
        var cls = 'bone' + (hot ? ' hot' : '') + (/thumb/.test(sg[1]) ? ' thumb' : '') + (/foot|toe|heel/.test(sg[1]) ? ' foot' : '');
        items.push({ z: (a[2] + b[2]) / 2, s: '<line class="' + cls + '" x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"/>' });
      }
    });
    var hd = this._project(pose.head);
    items.push({ z: hd[2] - 0.05, s: '<circle class="headc" cx="' + f(hd[0]) + '" cy="' + f(hd[1]) + '" r="' + f(0.1 * this.zoom) + '"/>' });
    var ns = this._project(pose.nose);
    items.push({ z: ns[2], s: '<circle class="nose" cx="' + f(ns[0]) + '" cy="' + f(ns[1]) + '" r="0.022"/>' });
    if (this.mv) {
      var jp = this._project(pose[this.mv.joint]);
      items.push({ z: jp[2] + 0.06, s: '<circle class="joint-hot" cx="' + f(jp[0]) + '" cy="' + f(jp[1]) + '" r="0.03"/>' });
    }

    items.sort(function (a, b) { return a.z - b.z; });
    this.svg.innerHTML = '<style>' + SVG_CSS + '</style>' + overlay.join('') + items.map(function (i) { return i.s; }).join('');
    if (this.onFrame) this.onFrame(this);
  };

  Figure.prototype._outline = function (items, corners, k, label) {
    var z = Math.max.apply(null, corners.map(function (c) { return c[2]; }));
    var s = '<polygon class="edge edge-' + k + '" points="' + corners.map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' ') + '"/>';
    if (label) {
      var top = corners.slice().sort(function (a, b) { return a[1] - b[1]; })[0];
      s += '<text class="plabel plabel-' + k + '" x="' + f(top[0]) + '" y="' + f(top[1] - 0.02) + '">' + label + '</text>';
    }
    items.push({ z: z, s: s });
  };

  var SVG_CSS = [
    '.floor{fill:var(--line);opacity:.35}',
    '.bone{stroke:var(--muted);stroke-width:.04;stroke-linecap:round}',
    '.bone.hot{stroke:var(--accent)}',
    '.bone.thumb{stroke-width:.025}',
    '.bone.foot{stroke-width:.022}',
    '.headc{fill:var(--surface);stroke:var(--muted);stroke-width:.03}',
    '.nose{fill:var(--ink)}',
    '.joint-hot{fill:var(--accent);stroke:var(--surface);stroke-width:.01}',
    '.plane-sag{fill:var(--sag);opacity:.16}',
    '.plane-fro{fill:var(--fro);opacity:.16}',
    '.plane-tra{fill:var(--tra);opacity:.16}',
    '.edge{fill:none;stroke-width:.006}',
    '.edge-sag{stroke:var(--sag)}.edge-fro{stroke:var(--fro)}.edge-tra{stroke:var(--tra)}.edge-glass{stroke:var(--muted);stroke-dasharray:.02 .015}',
    '.glass{fill:#9fd3ff;opacity:.22}.glass.broken{fill:var(--warn);opacity:.35}',
    '.axis{stroke-width:.014;stroke-dasharray:.03 .015}.axis-end{stroke:none}',
    '.axis-sag{stroke:var(--sag);fill:var(--sag)}.axis-fro{stroke:var(--fro);fill:var(--fro)}.axis-tra{stroke:var(--tra);fill:var(--tra)}',
    'circle.axis-end{stroke:none}',
    '.plabel{font:600 .055px "Segoe UI",system-ui,sans-serif;text-anchor:middle}',
    '.plabel-sag{fill:var(--sag)}.plabel-fro{fill:var(--fro)}.plabel-tra{fill:var(--tra)}'
  ].join('');

  root.BP = root.BP || {};
  root.BP.geometry = geometry;
  root.BP.Figure = Figure;
  root.BP.VIEWS = VIEWS;
})(typeof window !== 'undefined' ? window : this);
