/* Quiz engine shared by all units.
 *
 * mode 'blind'  : first attempt. Answer + confidence recorded, NOTHING revealed.
 * mode 'retry'  : items whose retry date has arrived. Full feedback, with a
 *                 callout for high-confidence errors (hypercorrection effect).
 * mode 'practice': immediate feedback, schedule untouched.
 *
 * item = { id, prompt, choices: [..], answer: index, explain, movement?: id, tag? }
 */
(function () {
  'use strict';

  var CONF = [
    { v: 1, label: 'Guessing' },
    { v: 2, label: 'Unsure' },
    { v: 3, label: 'Sure' }
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmtDate(t) { return new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

  function pending(items, mode) {
    var S = BP.store, now = Date.now();
    if (mode === 'blind') return items.filter(function (it) { return !S.getItem(it.id); });
    if (mode === 'retry') return items.filter(function (it) { var s = S.getItem(it.id); return s && s.due <= now; });
    return items.slice();
  }

  function nextDue(items) {
    var S = BP.store, best = Infinity;
    items.forEach(function (it) { var s = S.getItem(it.id); if (s && s.due > Date.now()) best = Math.min(best, s.due); });
    return best === Infinity ? null : best;
  }

  function run(container, items, mode, onDone) {
    var queue = shuffle(pending(items, mode));
    var i = 0, results = [], fig = null;

    if (!queue.length) { onDone && onDone(results); return; }

    function show() {
      if (fig) { fig.stop(); fig = null; }
      if (i >= queue.length) return finish();
      var it = queue[i], choice = null, conf = null;
      var prior = BP.store.getItem(it.id);
      container.innerHTML =
        '<div class="card">' +
        '<div class="row muted"><span>' + (mode === 'blind' ? 'Blind pretest' : mode === 'retry' ? 'Retry' : 'Practice') + '</span><span>·</span><span>' + (i + 1) + ' of ' + queue.length + '</span></div>' +
        '<div class="progressbar"><div style="width:' + (100 * i / queue.length) + '%"></div></div>' +
        (it.movement ? '<div class="mini-stage" data-fig></div><div class="row" style="justify-content:center"><button type="button" data-replay>Replay movement</button><button type="button" data-view="front">Front</button><button type="button" data-view="side">Side</button><button type="button" data-view="top">Top</button></div>' : '') +
        '<p class="q">' + it.prompt + '</p>' +
        '<div class="choices">' + it.choices.map(function (c, k) { return '<button type="button" data-choice="' + k + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
        '<div class="conf"><div class="muted">How confident are you?</div><div class="row">' +
        CONF.map(function (c) { return '<button type="button" data-conf="' + c.v + '">' + c.label + '</button>'; }).join('') + '</div></div>' +
        '<div class="row" style="margin-top:14px"><button type="button" class="primary" data-submit disabled>Submit</button></div>' +
        '<div data-fb></div></div>';

      if (it.movement) {
        fig = new BP.Figure(container.querySelector('[data-fig]'), { labels: false, showMovePlane: false });
        fig.showAxis = false;
        fig.setMovement(it.movement);
        fig.play(100);
        container.querySelector('[data-replay]').onclick = function () { fig.play(100); };
        container.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { fig.setView(b.dataset.view); }; });
      }

      var submit = container.querySelector('[data-submit]');
      function ready() { submit.disabled = choice === null || conf === null; }
      container.querySelectorAll('[data-choice]').forEach(function (b) {
        b.onclick = function () {
          container.querySelectorAll('[data-choice]').forEach(function (x) { x.classList.remove('chosen'); });
          b.classList.add('chosen'); choice = +b.dataset.choice; ready();
        };
      });
      container.querySelectorAll('[data-conf]').forEach(function (b) {
        b.onclick = function () {
          container.querySelectorAll('[data-conf]').forEach(function (x) { x.classList.remove('chosen'); });
          b.classList.add('chosen'); conf = +b.dataset.conf; ready();
        };
      });

      submit.onclick = function () {
        var correct = choice === it.answer;
        BP.store.record(it.id, mode, correct, conf, choice);
        results.push({ id: it.id, correct: correct, conf: conf });
        if (mode === 'blind') { i++; show(); return; }

        container.querySelectorAll('[data-choice],[data-conf]').forEach(function (x) { x.disabled = true; });
        container.querySelector('[data-choice="' + it.answer + '"]').classList.add('right');
        if (!correct) container.querySelector('[data-choice="' + choice + '"]').classList.add('wrong');
        submit.remove();
        var hyper = !correct && conf === 3;
        var lastBlind = prior && prior.attempts.filter(function (a) { return a.phase === 'blind'; }).pop();
        var fb = container.querySelector('[data-fb]');
        fb.innerHTML = '<div class="feedback ' + (correct ? 'good' : 'bad') + (hyper ? ' hyper' : '') + '">' +
          '<strong>' + (correct ? 'Correct.' : 'Not quite. Answer: ' + esc(it.choices[it.answer])) + '</strong>' +
          (hyper ? '<p><strong>High-confidence error.</strong> These are the errors most likely to stay fixed once corrected. Read the explanation, then say the rule out loud in your own words.</p>' : '') +
          '<p>' + it.explain + '</p>' +
          (lastBlind && mode === 'retry' ? '<p class="muted">Your blind answer: ' + esc(it.choices[lastBlind.answer] != null ? it.choices[lastBlind.answer] : '?') + ' (' + CONF[lastBlind.confidence - 1].label + ')</p>' : '') +
          '</div><div class="row" style="margin-top:12px"><button type="button" class="primary" data-next>Next</button></div>';
        if (fig && it.movement) { fig.labels = true; fig.showMovePlane = true; fig.showAxis = true; fig.render(); }
        var nx = fb.querySelector('[data-next]'); nx.focus(); nx.onclick = function () { i++; show(); };
      };
    }

    function finish() {
      var html;
      if (mode === 'blind') {
        var due = nextDue(items);
        html = '<div class="card"><h3>Pretest recorded</h3><p>' + results.length + ' answers saved with your confidence ratings. ' +
          'Answers stay hidden until your retry' + (due ? ', which opens <strong>' + fmtDate(due) + '</strong>' : '') + '.</p>' +
          '<p>Now study: read the primer, play with the plane explorer, and run the glass-pane drill. Getting things wrong first and then studying is the point.</p></div>';
      } else {
        var right = results.filter(function (r) { return r.correct; }).length;
        var hyper = results.filter(function (r) { return !r.correct && r.conf === 3; }).length;
        html = '<div class="card"><h3>' + right + ' / ' + results.length + ' correct</h3>' +
          (hyper ? '<p>' + hyper + ' high-confidence error' + (hyper > 1 ? 's' : '') + '. Re-read those explanations.</p>' : '') +
          (mode === 'retry' ? '<p>Correct items come back in 1, 3, 7, then 14 days. Misses come back tomorrow.</p>' : '') + '</div>';
      }
      container.innerHTML = html;
      if (BP.backup) BP.backup.milestone();
      onDone && onDone(results);
    }

    show();
  }

  window.BP = window.BP || {};
  window.BP.quiz = { run: run, pending: pending, nextDue: nextDue, fmtDate: fmtDate, esc: esc, shuffle: shuffle };
})();
