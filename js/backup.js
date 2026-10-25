/* Automatic backup of progress to a file you choose (e.g. in your Google Drive folder).
 *
 * Edge/Chrome on desktop: link a file once. After that every change is written to
 * it within a couple of seconds. Before each write the file is read and merged in,
 * so two computers sharing one Drive file never overwrite each other's progress.
 * If the browser asks for permission again on a later visit, one click reconnects.
 *
 * Browsers that can't write to a chosen file (Android, iPhone): a "Back up now" bar
 * appears after each finished round; it downloads the progress file.
 *
 * Clearing site data removes the link as well as the progress, but never the file:
 * import it (Home page) and everything comes back.
 */
(function () {
  'use strict';
  var S = BP.store;
  var DB = 'biomechprimer', STORE = 'handles', KEY = 'backup';
  var LAST = 'biomechprimer.lastBackup';
  var supported = typeof window.showSaveFilePicker === 'function' && typeof indexedDB !== 'undefined';
  var handle = null, status = supported ? 'unlinked' : 'unsupported'; // unlinked | linked | needs-permission | error | unsupported
  var timer = null, writing = false, again = false, merging = false, lastError = '';
  var listeners = [];

  // ---------- tiny IndexedDB wrapper for the file handle ----------
  function idb(mode, fn) {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        var tx = req.result.transaction(STORE, mode), st = tx.objectStore(STORE), r = fn(st);
        tx.oncomplete = function () { resolve(r && r.result); req.result.close(); };
        tx.onerror = function () { reject(tx.error); };
      };
    });
  }
  var saveHandle = function (h) { return idb('readwrite', function (st) { return st.put(h, KEY); }); };
  var loadHandle = function () { return idb('readonly', function (st) { return st.get(KEY); }); };
  var dropHandle = function () { return idb('readwrite', function (st) { return st.delete(KEY); }); };

  function lastBackup() { try { return +localStorage.getItem(LAST) || 0; } catch (e) { return 0; } }
  function markBackedUp() { try { localStorage.setItem(LAST, String(Date.now())); } catch (e) { /* ignore */ } }
  function setStatus(s, err) { status = s; lastError = err || ''; listeners.forEach(function (f) { f(info()); }); }
  function info() { return { status: status, supported: supported, file: handle && handle.name, last: lastBackup(), error: lastError }; }

  // ---------- read, merge, write ----------
  function readFile(h) {
    return h.getFile().then(function (f) { return f.size ? f.text() : ''; }).then(function (t) {
      if (!t.trim()) return null;
      try { return JSON.parse(t); } catch (e) { throw new Error('The backup file is not valid JSON, so it was left untouched.'); }
    });
  }

  function sync() {
    if (!handle || status !== 'linked') return Promise.resolve();
    if (writing) { again = true; return Promise.resolve(); }
    writing = true;
    var pulled = null;
    return readFile(handle).then(function (data) {
      if (data) {
        if (!data.items) throw new Error('That file is not a BiomechPrimer progress file, so it was left untouched.');
        merging = true;
        try { pulled = S.merge(data); } finally { merging = false; }
      }
      return handle.createWritable();
    }).then(function (w) {
      return w.write(S.exportText()).then(function () { return w.close(); });
    }).then(function () {
      markBackedUp(); setStatus('linked');
      if (pulled && pulled.changed) synced(pulled);
    }).catch(function (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) setStatus('needs-permission');
      else setStatus('error', e && e.message ? e.message : String(e));
    }).then(function () {
      writing = false;
      if (again) { again = false; schedule(); }
    });
  }

  function schedule() {
    if (status !== 'linked') return;
    clearTimeout(timer);
    timer = setTimeout(sync, 1500);
  }
  // A change made while a write is in flight queues one more write afterwards.
  // Our own merge's saves are skipped: the write that follows already includes them.
  window.addEventListener('bp:changed', function () { if (merging) return; if (writing) again = true; else schedule(); });
  // Flush when leaving or hiding the page (closing the app, switching tabs).
  document.addEventListener('visibilitychange', function () { if (document.hidden && timer) { clearTimeout(timer); timer = null; sync(); } });

  // ---------- linking (must run from a click) ----------
  function use(h) {
    handle = h;
    return saveHandle(h).catch(function () { /* IndexedDB blocked: link lasts this visit only */ }).then(function () {
      setStatus('linked'); return sync();
    });
  }

  function linkNew() {
    return window.showSaveFilePicker({
      suggestedName: 'biomechprimer-progress.json',
      types: [{ description: 'BiomechPrimer progress', accept: { 'application/json': ['.json'] } }]
    }).then(use).catch(function (e) { if (e && e.name !== 'AbortError') setStatus('error', e.message); });
  }

  function linkExisting() {
    return window.showOpenFilePicker({
      types: [{ description: 'BiomechPrimer progress', accept: { 'application/json': ['.json'] } }]
    }).then(function (hs) {
      return hs[0].requestPermission({ mode: 'readwrite' }).then(function (p) {
        if (p !== 'granted') throw Object.assign(new Error('Permission to write the file was refused.'), { name: 'NotAllowedError' });
        return use(hs[0]);
      });
    }).catch(function (e) {
      if (!e || e.name === 'AbortError') return;
      if (e.name === 'NotAllowedError') setStatus('needs-permission'); else setStatus('error', e.message);
    });
  }

  function reconnect() {
    if (!handle) return Promise.resolve();
    return handle.requestPermission({ mode: 'readwrite' }).then(function (p) {
      if (p === 'granted') { setStatus('linked'); return sync(); }
      setStatus('needs-permission');
    }).catch(function (e) { setStatus('error', e.message); });
  }

  function unlink() {
    handle = null; clearTimeout(timer);
    return dropHandle().catch(function () { /* ignore */ }).then(function () { setStatus(supported ? 'unlinked' : 'unsupported'); });
  }

  // ---------- "Back up now" bar ----------
  // Shown after a finished round when nothing is backing up automatically.
  var bar = null;
  function showBar(text, buttons, onClick) {
    if (!document.body) return;
    if (bar) bar.remove();
    bar = document.createElement('div');
    bar.className = 'backup-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>' + text + '</span>' + buttons.map(function (b, i) {
      return '<button type="button"' + (i === 0 ? ' class="primary"' : '') + ' data-bk="' + b[0] + '">' + b[1] + '</button>';
    }).join('');
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bk]'); if (!b) return;
      var close = function () { if (bar) { bar.remove(); bar = null; } };
      if (b.getAttribute('data-bk') === 'later') return close();
      Promise.resolve(onClick(b.getAttribute('data-bk'))).then(close, function (err) { b.textContent = 'Failed: ' + err.message; });
    });
  }

  function milestone() {
    if (status === 'linked') { clearTimeout(timer); return sync(); }
    if (lastBackup() >= (S.state.updatedAt || 0)) return; // nothing new since the last backup
    if (status === 'needs-permission') {
      showBar('Auto-backup is paused until you allow access to the backup file again.', [['reconnect', 'Reconnect'], ['later', 'Later']], reconnect);
    } else if (supported) {
      showBar('Round finished. Turn on auto-backup so clearing your browser can’t erase your progress.',
        [['link', 'Turn on auto-backup'], ['later', 'Later']], linkNew);
    } else {
      showBar('Round finished. Save a backup so clearing your browser can’t erase your progress.',
        [['now', 'Back up now'], ['later', 'Later']], function () { return S.exportFile().then(markBackedUp); });
    }
  }

  // Another computer's progress arrived from the shared file. The Home page
  // re-renders itself (BP.onSynced); other pages offer a reload.
  function synced(r) {
    window.dispatchEvent(new CustomEvent('bp:synced', { detail: r }));
    if (typeof BP.onSynced === 'function') return BP.onSynced(r);
    var n = r.added + r.updated + r.checks;
    showBar('Merged ' + n + ' update' + (n === 1 ? '' : 's') + ' from your backup file (another device).', [['reload', 'Reload to see them'], ['later', 'Later']],
      function () { location.reload(); });
  }

  // ---------- boot ----------
  // Ask the browser not to evict our storage under disk pressure. (It does not
  // protect against you clearing site data; the backup file does.)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  var ready = !supported ? Promise.resolve() : loadHandle().then(function (h) {
    if (!h) return;
    handle = h;
    return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
      if (p === 'granted') { setStatus('linked'); return sync(); }
      setStatus('needs-permission');
    });
  }).catch(function () { /* no stored link */ });

  window.BP = window.BP || {};
  window.BP.backup = {
    info: info, ready: ready, linkNew: linkNew, linkExisting: linkExisting, reconnect: reconnect,
    unlink: unlink, milestone: milestone, sync: sync,
    onChange: function (f) { listeners.push(f); },
    _use: use // tests: link a handle without a picker
  };
})();
