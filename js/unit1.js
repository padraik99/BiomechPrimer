/* Unit 1 page controller: blind placing, study model, retry. */
(function () {
  'use strict';
  var D = BP.muscles, Q = BP.quiz, S = BP.store, sceneSvg = BP.model.sceneSvg;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = Q.esc;
  var CONF = ['Guessing', 'Unsure', 'Sure'];

  // One item per spot per scene, e.g. "u1-post-sup-gmax".
  var ITEMS = [];
  D.SCENES.forEach(function (sc) {
    sc.spots.forEach(function (sp, n) {
      ITEMS.push({ id: 'u1-' + sc.id + '-' + sp[0], scene: sc, muscle: sp[0], x: sp[1], y: sp[2], n: n + 1 });
    });
  });

  // ---------- tabs ----------
  function showTab(name) {
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (name === 'place') renderStart($('[data-place]'), 'blind');
    if (name === 'retry') renderStart($('[data-retry]'), 'retry');
    if (name === 'study') initStudy();
    try { localStorage.setItem('biomechprimer.unit1.tab', name); } catch (e) { /* ignore */ }
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  }
  $$('[data-tab]').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });

  function updateBadge() {
    var n = Q.pending(ITEMS, 'retry').length;
    $('[data-due-badge]').textContent = n ? '(' + n + ' due)' : '';
  }

  // ---------- start screens ----------
  function renderStart(box, mode) {
    var left = Q.pending(ITEMS, mode).length, due = Q.nextDue(ITEMS);
    if (!left) {
      if (mode === 'blind') {
        box.innerHTML = '<div class="card"><p>All 22 spots placed. ' + (Q.pending(ITEMS, 'retry').length ? 'Your retry is open now: go to tab 4.' :
          due ? 'Your retry opens <strong>' + Q.fmtDate(due) + '</strong>. Use tabs 2 and 3 until then.' : '') + '</p></div>';
      } else {
        box.innerHTML = '<div class="card"><p>Nothing due. ' + (due ? 'Next retry opens <strong>' + Q.fmtDate(due) + '</strong>.' : 'Do the blind placing first.') + '</p></div>';
      }
      return;
    }
    var scenes = scenesWith(mode).map(function (s) { return s.title; }).join(', ');
    box.innerHTML = '<div class="card"><p>' + left + ' spot' + (left > 1 ? 's' : '') + ' to place across: ' + scenes + '. About ' + Math.ceil(left * 0.5) + ' minutes.</p>' +
      (mode === 'retry' ? '<p>This time each placement gets an answer and an explanation.</p>' : '') +
      '<button type="button" class="primary" data-go>' + (mode === 'blind' ? 'Start blind placing' : 'Start retry') + '</button></div>';
    $('[data-go]', box).onclick = function () { runScenes(box, mode); };
  }

  function scenesWith(mode) {
    var pend = Q.pending(ITEMS, mode), ids = {};
    pend.forEach(function (it) { ids[it.scene.id] = true; });
    return D.SCENES.filter(function (s) { return ids[s.id]; });
  }

  // ---------- placing (blind or retry) ----------
  function runScenes(box, mode) {
    var queue = scenesWith(mode), si = 0, results = [];

    function scene() {
      if (si >= queue.length) return finish();
      var sc = queue[si];
      var items = Q.pending(ITEMS, mode).filter(function (it) { return it.scene.id === sc.id; });
      var state = {};           // itemId -> 'done' | 'right' | 'wrong'
      var chip = null, armed = null, busy = false;

      box.innerHTML = '<div class="place-layout">' +
        '<div class="model-stage" data-stage></div>' +
        '<div class="place-side card">' +
        '<div class="muted">' + (mode === 'blind' ? 'Blind placing' : 'Retry') + ' · scene ' + (si + 1) + ' of ' + queue.length + '</div>' +
        '<h3 style="margin:0">' + esc(sc.title) + '</h3>' +
        '<p class="muted" style="margin:0">' + esc(sc.note) + '</p>' +
        '<div data-prompt aria-live="polite"><p style="margin:0">Drag a name onto a numbered spot, or tap a name and then a spot.</p></div>' +
        '<div class="namechips" data-chips></div>' +
        '</div></div>';
      var stage = $('[data-stage]', box), prompt = $('[data-prompt]', box), chipsEl = $('[data-chips]', box);

      function draw() {
        stage.innerHTML = sceneSvg(sc, { spots: items.map(function (it) {
          return { id: it.id, x: it.x, y: it.y, label: state[it.id] === 'right' ? '✓' : state[it.id] === 'wrong' ? '✗' : String(it.n),
            state: state[it.id] || (armed === it.id ? 'armed' : '') };
        }) });
      }

      D.ROSTER.forEach(function (id) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'namechip'; b.textContent = D.MUSCLES[id].name; b.dataset.m = id;
        chipsEl.appendChild(b);
        bindChip(b);
      });

      function selectChip(id) {
        chip = chip === id ? null : id;
        $$('.namechip', chipsEl).forEach(function (c) { c.classList.toggle('selected', c.dataset.m === chip); });
        if (chip && armed) place(armed, chip);
      }

      stage.addEventListener('click', function (e) {
        if (busy) return;
        var g = e.target.closest('[data-spot]'); if (!g) return;
        var id = g.getAttribute('data-spot');
        if (state[id]) return;
        armed = id; draw();
        if (chip) place(armed, chip);
        else prompt.innerHTML = '<p style="margin:0">Spot ' + itemById(id).n + ' selected. Now tap a name.</p>';
      });

      // Pointer Events: one path for mouse, touch and pen. A short press is a tap (select);
      // moving more than 6px turns it into a drag with a floating copy of the chip.
      function bindChip(el) {
        var start = null, ghost = null, pid = null;
        el.addEventListener('pointerdown', function (e) {
          if (busy) return;
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          pid = e.pointerId; start = [e.clientX, e.clientY];
          el.setPointerCapture(pid);
        });
        el.addEventListener('pointermove', function (e) {
          if (e.pointerId !== pid || !start) return;
          if (!ghost && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) {
            ghost = el.cloneNode(true); ghost.classList.add('ghost-drag'); document.body.appendChild(ghost);
          }
          if (ghost) { ghost.style.left = (e.clientX - ghost.offsetWidth / 2) + 'px'; ghost.style.top = (e.clientY - ghost.offsetHeight - 12) + 'px'; }
        });
        function end(e) {
          if (e.pointerId !== pid) return;
          var wasDrag = !!ghost;
          if (ghost) { ghost.remove(); ghost = null; }
          start = null; pid = null;
          if (e.type === 'pointercancel') return;
          if (!wasDrag) { selectChip(el.dataset.m); return; }
          var target = spotAt(e.clientX, e.clientY);
          if (target && !state[target]) { armed = target; draw(); place(target, el.dataset.m); }
        }
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        // keyboard: Enter/Space fire click without pointer events
        el.addEventListener('click', function (e) { if (e.detail === 0) selectChip(el.dataset.m); });
      }

      // Nearest open spot within 30 screen pixels of the drop point.
      function spotAt(x, y) {
        var best = null, bd = 30;
        $$('[data-spot]', stage).forEach(function (g) {
          var r = g.getBoundingClientRect(), d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
          if (d < bd && !state[g.getAttribute('data-spot')]) { bd = d; best = g.getAttribute('data-spot'); }
        });
        return best;
      }

      function itemById(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i]; return null; }

      function place(spotId, muscleId) {
        busy = true;
        var it = itemById(spotId);
        prompt.innerHTML = '<p style="margin:0 0 6px">Spot ' + it.n + ': <strong>' + esc(D.MUSCLES[muscleId].name) + '</strong>. How confident are you?</p>' +
          '<div class="row">' + CONF.map(function (c, k) { return '<button type="button" data-c="' + (k + 1) + '">' + c + '</button>'; }).join('') +
          '<button type="button" data-undo>Undo</button></div>';
        $$('[data-c]', prompt).forEach(function (b) {
          b.onclick = function () { commit(it, muscleId, +b.dataset.c); };
        });
        $('[data-undo]', prompt).onclick = function () { busy = false; armed = null; selectChip(null); draw(); prompt.innerHTML = '<p style="margin:0">Placement undone.</p>'; };
      }

      function commit(it, muscleId, conf) {
        var correct = muscleId === it.muscle;
        var prior = S.getItem(it.id);
        S.record(it.id, mode, correct, conf, muscleId);
        results.push({ correct: correct, conf: conf });
        state[it.id] = mode === 'blind' ? 'done' : (correct ? 'right' : 'wrong');
        armed = null; chip = null; busy = false;
        $$('.namechip', chipsEl).forEach(function (c) { c.classList.remove('selected'); });
        draw();
        var left = items.filter(function (x) { return !state[x.id]; }).length;
        var html = '';
        if (mode === 'blind') {
          html = '<p style="margin:0">Recorded. ' + (left ? left + ' spot' + (left > 1 ? 's' : '') + ' left.' : 'Scene done.') + '</p>';
        } else {
          var m = D.MUSCLES[it.muscle], hyper = !correct && conf === 3;
          var blind = prior && prior.attempts.filter(function (a) { return a.phase === 'blind'; }).pop();
          html = '<div class="feedback ' + (correct ? 'good' : 'bad') + (hyper ? ' hyper' : '') + '">' +
            '<strong>' + (correct ? 'Correct: ' + esc(m.name) + '.' : 'Spot ' + it.n + ' is ' + esc(m.name) + '. You placed ' + esc(D.MUSCLES[muscleId].name) + '.') + '</strong>' +
            (hyper ? '<p><strong>High-confidence error.</strong> These are the errors most likely to stay fixed once corrected. Say the right name and where it sits out loud.</p>' : '') +
            '<p>' + esc(m.where) + ' <a href="' + m.ref + '" target="_blank" rel="noopener">OpenStax figure</a></p>' +
            (blind ? '<p class="muted">Your blind answer: ' + esc(D.MUSCLES[blind.answer] ? D.MUSCLES[blind.answer].name : '?') + ' (' + CONF[blind.confidence - 1] + ')</p>' : '') +
            '</div>';
        }
        if (!left) html += '<div class="row" style="margin-top:10px"><button type="button" class="primary" data-next>' + (si + 1 < queue.length ? 'Next scene' : 'Finish') + '</button></div>';
        prompt.innerHTML = html;
        var nx = $('[data-next]', prompt);
        if (nx) { nx.focus(); nx.onclick = function () { si++; scene(); }; }
        updateBadge();
      }

      draw();
      box.scrollIntoView({ block: 'start' });
    }

    function finish() {
      var html;
      if (mode === 'blind') {
        var due = Q.nextDue(ITEMS);
        html = '<div class="card"><h3>Blind placing recorded</h3><p>' + results.length + ' placements saved with your confidence ratings. Answers stay hidden until your retry' +
          (due ? ', which opens <strong>' + Q.fmtDate(due) + '</strong>' : '') + '.</p><p>Now study: tab 2 decodes the names, tab 3 lets you tap every muscle.</p></div>';
      } else {
        var right = results.filter(function (r) { return r.correct; }).length;
        var hyper = results.filter(function (r) { return !r.correct && r.conf === 3; }).length;
        html = '<div class="card"><h3>' + right + ' / ' + results.length + ' correct</h3>' +
          (hyper ? '<p>' + hyper + ' high-confidence error' + (hyper > 1 ? 's' : '') + '.</p>' : '') +
          '<p>Correct spots come back in 1, 3, 7, then 14 days. Misses come back tomorrow.</p></div>';
      }
      box.innerHTML = html;
      updateBadge();
      if (BP.backup) BP.backup.milestone();
    }

    scene();
  }

  // ---------- study ----------
  var study = null;
  function initStudy() {
    if (study) return;
    study = { scene: D.SCENES[0], sel: null, labels: false };
    var btns = $('[data-scene-buttons]');
    D.SCENES.forEach(function (sc) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = sc.title; b.dataset.scene = sc.id;
      b.onclick = function () { study.scene = sc; study.sel = null; drawStudy(); $('[data-study-info]').innerHTML = '<p class="muted">Tap a muscle.</p>'; };
      btns.appendChild(b);
    });
    $('[data-labels]').onchange = function () { study.labels = this.checked; drawStudy(); };
    $('[data-study-stage]').addEventListener('click', function (e) {
      var p = e.target.closest('[data-m]'); if (!p) return;
      study.sel = p.getAttribute('data-m'); drawStudy(); info(study.sel);
    });
    S.touch();
    drawStudy();
  }

  function drawStudy() {
    var sc = study.scene, stage = $('[data-study-stage]');
    $$('[data-scene]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.scene === sc.id)); b.classList.toggle('chosen', b.dataset.scene === sc.id); });
    stage.innerHTML = sceneSvg(sc, { selected: study.sel, titles: true });
    $('[data-scene-note]').textContent = sc.note;
    if (study.labels) {
      var svg = $('svg', stage), spots = {};
      sc.spots.forEach(function (s) { spots[s[0]] = [s[1], s[2]]; });
      var out = '';
      $$('g:not(.mirror) > path.mus', svg).forEach(function (p) {
        var id = p.getAttribute('data-m'), at = spots[id];
        if (D.MUSCLES[id].context) return; // curved landmark strips: a bbox centre lands off the shape
        if (!at) { var bb = p.getBBox(); at = [bb.x + bb.width / 2, bb.y + bb.height / 2]; }
        out += '<text class="mlabel" x="' + at[0] + '" y="' + at[1] + '">' + esc(D.MUSCLES[id].name.replace(/ \(.*\)/, '')) + '</text>';
      });
      svg.insertAdjacentHTML('beforeend', out);
    }
  }

  function info(id) {
    var m = D.MUSCLES[id];
    $('[data-study-info]').innerHTML = '<p><strong>' + esc(m.name) + '</strong></p>' +
      (m.context ? '<p class="muted">Landmark only: not in this course’s roster.</p>' :
        '<p>' + esc(m.where) + '</p><p><a href="' + m.ref + '" target="_blank" rel="noopener">Compare with the OpenStax figure</a></p>' +
        '<p class="muted">Attachments, line of pull and actions come in Unit 2.</p>');
  }

  // ---------- boot ----------
  updateBadge();
  var start = (location.hash || '').slice(1);
  if (!$('[data-panel="' + start + '"]')) { try { start = localStorage.getItem('biomechprimer.unit1.tab') || ''; } catch (e) { start = ''; } }
  if (!$('[data-panel="' + start + '"]')) start = 'place';
  showTab(start);

  window.BP.unit1 = { ITEMS: ITEMS };
})();
