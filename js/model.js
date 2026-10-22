/* Renders one muscle-model scene (view + layer) as SVG.
 * Muscles are authored on the subject's right side and mirrored to the left.
 */
(function () {
  'use strict';
  var D = BP.muscles;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* opts: { selected, spots: [{id, x, y, label, state}], showSide } */
  function sceneSvg(scene, opts) {
    opts = opts || {};
    var view = scene.view, s = '';
    var bones = D.BONES[view];
    var mid = '', side = '';
    bones.forEach(function (b) {
      if (typeof b === 'string') mid += '<path class="bone" d="' + b + '"/>';
      else side += '<path class="bone" d="' + b.m + '"/>';
    });
    var muscles = '';
    scene.draw.forEach(function (id) {
      var m = D.MUSCLES[id];
      muscles += '<path class="mus g-' + m.group + (opts.selected === id ? ' sel' : '') + '" data-m="' + id + '" d="' + D.pathFor(id, view) + '"><title>' +
        (opts.titles ? esc(m.name) : '') + '</title></path>';
    });
    var ghosts = '';
    scene.ghost.forEach(function (id) { ghosts += '<path class="ghost" d="' + D.pathFor(id, view) + '"/>'; });
    var oneSide = side + ghosts + muscles;
    s += mid;
    s += '<g>' + oneSide + '</g>';
    s += '<g transform="translate(400,0) scale(-1,1)" class="mirror">' + oneSide + '</g>';
    // side markers: anterior view puts the subject's right on the viewer's left
    var rx = view === 'ant' ? 24 : 376, lx = view === 'ant' ? 376 : 24;
    s += '<text class="side" x="' + rx + '" y="24">R</text><text class="side" x="' + lx + '" y="24">L</text>';
    (opts.spots || []).forEach(function (p) {
      s += '<g class="spot ' + (p.state || '') + '" data-spot="' + p.id + '" transform="translate(' + p.x + ',' + p.y + ')">' +
        '<circle r="13"/><text>' + esc(p.label) + '</text></g>';
    });
    return '<svg viewBox="0 0 400 830" role="img" aria-label="' + esc(scene.title) + ' view of the trunk and lower limbs">' + s + '</svg>';
  }

  window.BP = window.BP || {};
  window.BP.model = { sceneSvg: sceneSvg };
})();
