/* Unit 0 page controller: tabs, explorer, glass drill, pretest/retry wiring. */
(function () {
  'use strict';
  var G = BP.geometry, Q = BP.quiz, ITEMS = BP.unit0.ITEMS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- tabs ----------
  var explorer = null;
  function showTab(name) {
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (name === 'explorer') initExplorer();
    if (name === 'pretest') renderPretest();
    if (name === 'retry') renderRetry();
    if (name === 'drill') renderDrillStart();
    try { localStorage.setItem('biomechprimer.unit0.tab', name); } catch (e) { /* ignore */ }
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  }
  $$('[data-tab]').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });

  function updateBadge() {
    var n = Q.pending(ITEMS, 'retry').length;
    $('[data-due-badge]').textContent = n ? '(' + n + ' due)' : '';
  }

  // ---------- pretest ----------
  function renderPretest() {
    var box = $('[data-pretest]'), left = Q.pending(ITEMS, 'blind').length;
    if (!left) {
      var due = Q.nextDue(ITEMS);
      box.innerHTML = '<div class="card"><p>Pretest complete. ' + (Q.pending(ITEMS, 'retry').length ? 'Your retry is open now: go to tab 5.' :
        due ? 'Your retry opens <strong>' + Q.fmtDate(due) + '</strong>. Study until then.' : '') + '</p></div>';
      return;
    }
    var done = ITEMS.length - left;
    box.innerHTML = '<div class="card"><p>' + left + ' questions' + (done ? ' left (you have answered ' + done + ')' : '') + ', about ' + Math.ceil(left * 0.4) + ' minutes. Guessing is expected.</p>' +
      '<button type="button" class="primary" data-start>Start blind pretest</button></div>';
    $('[data-start]', box).onclick = function () { Q.run(box, ITEMS, 'blind', updateBadge); };
  }

  // ---------- retry ----------
  function renderRetry() {
    var box = $('[data-retry]'), n = Q.pending(ITEMS, 'retry').length, due = Q.nextDue(ITEMS);
    if (!n) {
      box.innerHTML = '<div class="card"><p>Nothing due. ' + (due ? 'Next retry opens <strong>' + Q.fmtDate(due) + '</strong>.' : 'Take the blind pretest first.') + '</p></div>';
      return;
    }
    box.innerHTML = '<div class="card"><p>' + n + ' item' + (n > 1 ? 's' : '') + ' due. This time you get answers and explanations.</p><button type="button" class="primary" data-start>Start retry</button></div>';
    $('[data-start]', box).onclick = function () { Q.run(box, ITEMS, 'retry', updateBadge); };
  }

  // ---------- explorer ----------
  function planeReadout(f) {
    var lines = [];
    ['sag', 'fro', 'tra'].forEach(function (k) {
      if (!f.planes[k]) return;
      var name = G.PLANE_NAMES[k];
      if (k === 'sag') name = Math.abs(f.offsets.sag) < 0.015 ? 'Midsagittal (median)' : 'Parasagittal (still sagittal)';
      lines.push('<p><strong class="' + k + '">' + name + '</strong><br>Slices the body into ' + G.DIVIDES[k] + '.<br>Movement inside it: ' +
        { sag: 'forward and back', fro: '<strong>side to side</strong>', tra: 'rotation' }[k] + ', around the ' + G.AXIS_NAMES[k] + '.</p>');
    });
    return lines.join('') || '<p class="muted">Tick a plane to show it.</p>';
  }

  function moveReadout(f) {
    var mv = f.mv;
    if (!mv) return '';
    return '<p><strong>' + mv.name + '</strong><br><span class="pill ' + mv.plane + '">' + G.PLANE_NAMES[mv.plane] + ' plane</span><br>' +
      'Axis: ' + G.AXIS_NAMES[mv.plane] + '</p>' + (mv.note ? '<p class="muted">' + mv.note + '</p>' : '') +
      (f.glass ? '<p>' + (f.cracked ? '<strong class="fro" style="color:var(--bad)">Glass cracked:</strong> this movement leaves the ' + G.PLANE_NAMES[f.glass].split(' ')[0].toLowerCase() + ' plane.' :
        'Glass intact so far.') + '</p>' : '');
  }

  function initExplorer() {
    if (explorer) return;
    var f = explorer = new BP.Figure($('[data-explorer-stage]'));
    var mode = 'planes';
    f.planes.sag = true;
    var sel = $('[data-move]');
    ['sag', 'fro', 'tra'].forEach(function (k) {
      var g = document.createElement('optgroup'); g.label = G.PLANE_NAMES[k];
      G.MOVEMENTS.filter(function (m) { return m.plane === k; }).forEach(function (m) {
        var o = document.createElement('option'); o.value = m.id; o.textContent = m.name; g.appendChild(o);
      });
      sel.appendChild(g);
    });

    function readout() { $('[data-readout]').innerHTML = mode === 'planes' ? planeReadout(f) : moveReadout(f); }
    f.onFrame = function () { if (mode === 'moves') { $('[data-scrub]').value = f.t; } };
    f.onCrack = function () { setTimeout(readout, 0); };

    function setMode(m) {
      mode = m;
      $$('[data-mode]').forEach(function (b) { b.classList.toggle('chosen', b.dataset.mode === m); });
      $('[data-planes-ui]').hidden = m !== 'planes';
      $('[data-moves-ui]').hidden = m !== 'moves';
      if (m === 'planes') {
        f.stop(); f.setMovement(null); f.glass = null;
        $$('[data-plane]').forEach(function (c) { f.planes[c.dataset.plane] = c.checked; });
      } else {
        f.planes = { sag: false, fro: false, tra: false };
        f.glass = $('[data-glass]').value || null;
        f.setMovement(sel.value);
      }
      f.render(); readout();
    }
    $$('[data-mode]').forEach(function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });
    $$('[data-plane]').forEach(function (c) { c.onchange = function () { f.planes[c.dataset.plane] = c.checked; f.render(); readout(); }; });
    $$('[data-offset]').forEach(function (r) {
      r.oninput = function () {
        var k = r.dataset.offset; f.offsets[k] = +r.value;
        if (!f.planes[k]) { f.planes[k] = true; $('[data-plane="' + k + '"]').checked = true; }
        f.render(); readout();
      };
    });
    sel.onchange = function () { f.stop(); f.setMovement(sel.value); readout(); };
    $('[data-play]').onclick = function () { f.cracked = false; readout(); f.play(2); BP.store.touch(); };
    $('[data-pause]').onclick = function () { f.stop(); };
    $('[data-scrub]').oninput = function () { f.stop(); f.setT(+this.value); readout(); };
    $('[data-showplane]').onchange = function () { f.showMovePlane = this.checked; f.render(); };
    $('[data-showaxis]').onchange = function () { f.showAxis = this.checked; f.render(); };
    $('[data-glass]').onchange = function () { f.glass = this.value || null; f.cracked = false; f.render(); readout(); };
    $$('[data-panel="explorer"] [data-view]').forEach(function (b) { b.onclick = function () { f.setView(b.dataset.view); }; });
    setMode('planes');
  }

  // ---------- glass drill ----------
  var drillFig = null;
  function drillDeck(n) {
    var fro = G.MOVEMENTS.filter(function (m) { return m.plane === 'fro'; });
    var other = G.MOVEMENTS.filter(function (m) { return m.plane !== 'fro'; });
    var deck = [];
    // half frontal, half not, so "no crack" is right about half the time
    for (var i = 0; i < n; i++) deck.push(i % 2 ? Q.shuffle(other)[0] : Q.shuffle(fro)[0]);
    return Q.shuffle(deck);
  }

  function renderDrillStart() {
    if (drillFig) { drillFig.stop(); drillFig = null; }
    var box = $('[data-drill]');
    box.innerHTML = '<div class="card"><p>10 rounds, about 3 minutes. Each round names a movement; you predict, then watch.</p><button type="button" class="primary" data-go>Start drill</button></div>';
    $('[data-go]', box).onclick = function () { runDrill(box, drillDeck(10)); };
  }

  function runDrill(box, deck) {
    var i = 0, score = 0;
    BP.store.touch();
    function round() {
      if (drillFig) { drillFig.stop(); drillFig = null; }
      if (i >= deck.length) {
        box.innerHTML = '<div class="card"><h3>' + score + ' / ' + deck.length + ' predictions right</h3><p>' +
          (score >= 9 ? 'Solid. The frontal plane is the side-to-side plane.' : 'Run it again. Say the rule before each answer: "front | back slice, so side-to-side movement".') +
          '</p><button type="button" class="primary" data-again>Again</button></div>';
        $('[data-again]', box).onclick = function () { runDrill(box, drillDeck(10)); };
        return;
      }
      var mv = deck[i], hits = mv.plane !== 'fro';
      box.innerHTML = '<div class="card"><div class="muted">Round ' + (i + 1) + ' of ' + deck.length + '</div>' +
        '<div class="progressbar"><div style="width:' + (100 * i / deck.length) + '%"></div></div>' +
        '<div class="mini-stage" data-fig></div>' +
        '<p class="q"><strong>' + mv.name + '</strong>' + (mv.pre ? ' <span class="muted">(' + mv.note + ')</span>' : '') + '. Will it crack the chest/back glass?</p>' +
        '<div class="row"><button type="button" data-p="1">Yes, it cracks</button><button type="button" data-p="0">No, it stays between the panes</button></div>' +
        '<div data-fb></div></div>';
      drillFig = new BP.Figure($('[data-fig]', box), { labels: false, showMovePlane: false, hint: false });
      drillFig.showAxis = false; drillFig.glass = 'fro';
      drillFig.setMovement(mv.id);
      $$('[data-p]', box).forEach(function (b) {
        b.onclick = function () {
          var said = b.dataset.p === '1', right = said === hits;
          if (right) score++;
          $$('[data-p]', box).forEach(function (x) { x.disabled = true; });
          b.classList.add('chosen', right ? 'right' : 'wrong');
          drillFig.labels = true; drillFig.showMovePlane = true; drillFig.showAxis = true;
          drillFig.play(2);
          $('[data-fb]', box).innerHTML = '<div class="feedback ' + (right ? 'good' : 'bad') + '"><strong>' + (right ? 'Right.' : 'Not this time.') + '</strong> ' +
            mv.name + ' is in the <span class="' + mv.plane + '"><strong>' + G.PLANE_NAMES[mv.plane] + '</strong></span> plane, around the ' + G.AXIS_NAMES[mv.plane] + '. ' +
            (hits ? 'It moves ' + (mv.plane === 'sag' ? 'forward or back' : 'around (rotation)') + ', so it pushes through the glass.' : 'It moves side to side, so it slides between the panes.') +
            '</div><div class="row" style="margin-top:10px"><button type="button" class="primary" data-next>Next</button></div>';
          $('[data-next]', box).onclick = function () { i++; round(); };
        };
      });
    }
    round();
  }

  // ---------- boot ----------
  updateBadge();
  var start = (location.hash || '').slice(1);
  if (!$('[data-panel="' + start + '"]')) {
    try { start = localStorage.getItem('biomechprimer.unit0.tab') || ''; } catch (e) { start = ''; }
  }
  if (!$('[data-panel="' + start + '"]')) start = 'pretest';
  showTab(start);
})();
