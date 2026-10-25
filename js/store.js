/* BiomechPrimer progress store.
 * Everything lives in localStorage under one key. Export writes a JSON file
 * (keep it in your Google Drive folder); import MERGES by newest item, so two
 * machines can trade the same file back and forth without losing work.
 */
(function () {
  'use strict';

  var KEY = 'biomechprimer.progress.v1';
  var DAY = 24 * 60 * 60 * 1000;

  // First retry after a blind attempt: 2 days (spec: 2 to 3).
  var BLIND_DELAY_DAYS = 2;
  // Ladder for correct answers on retries.
  var LADDER = [1, 3, 7, 14];

  function blank() {
    return { version: 1, items: {}, sessions: [], settings: {}, checks: {}, updatedAt: 0 };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !data.items) return blank();
      data.sessions = data.sessions || [];
      data.settings = data.settings || {};
      data.checks = data.checks || {};
      return data;
    } catch (e) {
      return blank();
    }
  }

  var state = load();

  // Every save announces itself so js/backup.js can write the backup file.
  function save() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
    try { window.dispatchEvent(new Event('bp:changed')); } catch (e) { /* no window (tests) */ }
  }

  function dayStamp(t) {
    var d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function noteSession() {
    var today = dayStamp(Date.now());
    if (state.sessions.indexOf(today) === -1) state.sessions.push(today);
  }

  function getItem(id) { return state.items[id] || null; }

  /* Record an answer.
   * phase 'blind': no feedback; schedule first retry BLIND_DELAY_DAYS out.
   * phase 'retry': correct climbs the ladder, wrong drops back to 1 day.
   * phase 'practice': logged only, schedule untouched.
   */
  function record(id, phase, correct, confidence, answer) {
    var now = Date.now();
    var it = state.items[id] || { id: id, attempts: [], stage: -1, due: 0 };
    it.attempts.push({ t: now, phase: phase, correct: !!correct, confidence: confidence, answer: answer });
    if (phase === 'blind') {
      it.stage = -1;
      it.due = now + BLIND_DELAY_DAYS * DAY;
    } else if (phase === 'retry') {
      if (correct) {
        var next = Math.max(0, it.stage + 1);
        if (next > LADDER.length - 1) next = LADDER.length - 1;
        it.stage = next;
        it.due = now + LADDER[next] * DAY;
      } else {
        it.stage = 0;
        it.due = now + LADDER[0] * DAY;
      }
    }
    it.updatedAt = now;
    state.items[id] = it;
    noteSession();
    save();
    return it;
  }

  function isDue(id, now) {
    var it = state.items[id];
    if (!it) return false;
    return it.due <= (now || Date.now());
  }

  function unlockAll() {
    var now = Date.now();
    Object.keys(state.items).forEach(function (k) { state.items[k].due = now; state.items[k].updatedAt = now; });
    save();
  }

  function sessionsThisWeek() {
    var now = new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    var start = dayStamp(monday.getTime());
    return state.sessions.filter(function (d) { return d >= start; }).length;
  }

  // Merge: per item keep the newer copy; union sessions; settings newest wins.
  function merge(incoming) {
    if (!incoming || typeof incoming !== 'object' || !incoming.items) throw new Error('Not a BiomechPrimer progress file.');
    var added = 0, updated = 0, checks = 0, other = false;
    Object.keys(incoming.items).forEach(function (k) {
      var a = state.items[k], b = incoming.items[k];
      if (!a) { state.items[k] = b; added++; }
      else if ((b.updatedAt || 0) > (a.updatedAt || 0)) { state.items[k] = b; updated++; }
    });
    // checks: { id: { on, t } }, newest change wins per id
    Object.keys(incoming.checks || {}).forEach(function (k) {
      var a = state.checks[k], b = incoming.checks[k];
      if (!a || (b.t || 0) > (a.t || 0)) { state.checks[k] = b; checks++; }
    });
    (incoming.sessions || []).forEach(function (d) { if (state.sessions.indexOf(d) === -1) { state.sessions.push(d); other = true; } });
    state.sessions.sort();
    if ((incoming.updatedAt || 0) > (state.updatedAt || 0) && incoming.settings &&
        JSON.stringify(incoming.settings) !== JSON.stringify(state.settings)) { state.settings = incoming.settings; other = true; }
    var changed = !!(added || updated || checks || other);
    // Save only when something changed, so a backup round trip can't loop.
    if (changed) save();
    return { added: added, updated: updated, checks: checks, changed: changed };
  }


  function exportText() {
    return JSON.stringify(Object.assign({ app: 'BiomechPrimer', exportedAt: new Date().toISOString() }, state), null, 2);
  }

  // Edge supports the File System Access API, which lets you pick the Drive
  // folder directly. Falls back to a normal download elsewhere.
  function exportFile() {
    var text = exportText();
    var name = 'biomechprimer-progress.json';
    if (window.showSaveFilePicker) {
      return window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'BiomechPrimer progress', accept: { 'application/json': ['.json'] } }]
      }).then(function (h) {
        return h.createWritable().then(function (w) { return w.write(text).then(function () { return w.close(); }); });
      }).catch(function (e) { if (e && e.name !== 'AbortError') throw e; });
    }
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return Promise.resolve();
  }

  function importFile(file) {
    return file.text().then(function (t) { return merge(JSON.parse(t)); });
  }

  function reset() { state = blank(); save(); }

  // Manual checkmarks for steps the app can't detect (e.g. "read OpenStax 1.6").
  function isChecked(id) { return !!(state.checks[id] && state.checks[id].on); }
  function setCheck(id, on) { state.checks[id] = { on: !!on, t: Date.now() }; if (on) noteSession(); save(); }

  // Count today as a study session without recording an item (drills, explorer).
  function touch() { noteSession(); save(); }

  window.BP = window.BP || {};
  window.BP.store = {
    DAY: DAY, LADDER: LADDER, BLIND_DELAY_DAYS: BLIND_DELAY_DAYS,
    get state() { return state; },
    getItem: getItem, record: record, isDue: isDue, unlockAll: unlockAll,
    sessionsThisWeek: sessionsThisWeek, merge: merge, exportText: exportText,
    exportFile: exportFile, importFile: importFile, reset: reset, save: save, touch: touch, isChecked: isChecked, setCheck: setCheck
  };
})();
