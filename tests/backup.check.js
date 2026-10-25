// Run: node tests/backup.check.js   (needs Playwright + Chromium; used in cloud sessions)
// Auto-backup end to end. The browser's private file system (OPFS) stands in for a
// file in your Drive folder, because the real file picker can't run headless.
'use strict';
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
const http = require('http'), fs = require('fs'), path = require('path');
// Serve over http://localhost (a secure context, like GitHub Pages), since file:// has no OPFS.
const ROOT = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8765);
const U = 'http://localhost:8765/';
const OUT = process.argv[2] || require('os').tmpdir();
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(U + 'index.html');
  console.log('picker supported:', await p.evaluate(() => BP.backup.info().status));
  const readFile = () => p.evaluate(async () => { const d = await navigator.storage.getDirectory(); const h = await d.getFileHandle('bk.json', { create: true }); const t = await (await h.getFile()).text(); return t ? JSON.parse(t) : null; });
  // some progress, then link
  await p.evaluate(() => { BP.unit0.ITEMS.slice(0, 5).forEach(it => BP.store.record(it.id, 'blind', false, 2, 0)); });
  await p.evaluate(async () => { const d = await navigator.storage.getDirectory(); await BP.backup._use(await d.getFileHandle('bk.json', { create: true })); });
  let f = await readFile();
  console.log('1 linked, file items:', Object.keys(f.items).length, 'status:', await p.evaluate(() => BP.backup.info().status));
  await p.screenshot({ path: OUT + '/bk-01-home-linked.png', clip: { x: 0, y: 0, width: 1200, height: 900 } });
  // a change is written within ~1.5 s
  await p.evaluate(() => BP.store.setCheck('chk-u0-primer', true));
  await p.waitForTimeout(2500);
  f = await readFile(); console.log('2 change written:', !!(f.checks['chk-u0-primer'] && f.checks['chk-u0-primer'].on));
  // the other computer adds progress to the shared file
  await p.evaluate(async () => {
    const d = await navigator.storage.getDirectory(), h = await d.getFileHandle('bk.json');
    const data = JSON.parse(await (await h.getFile()).text());
    data.items['u1-ant-sup-tfl'] = { id: 'u1-ant-sup-tfl', attempts: [{ t: Date.now(), phase: 'blind', correct: true, confidence: 3, answer: 'tfl' }], stage: -1, due: Date.now() + 2 * 864e5, updatedAt: Date.now() + 1000 };
    data.checks['chk-os-1-6'] = { on: true, t: Date.now() + 1000 };
    const w = await h.createWritable(); await w.write(JSON.stringify(data)); await w.close();
  });
  await p.evaluate(() => BP.store.setCheck('chk-os-9-5', true));
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ other: !!BP.store.getItem('u1-ant-sup-tfl'), os16: BP.store.isChecked('chk-os-1-6'), os95: BP.store.isChecked('chk-os-9-5') }));
  f = await readFile();
  console.log('3 merged other device into this one:', JSON.stringify(st), '| file kept both:', !!f.items['u1-ant-sup-tfl'] && !!f.checks['chk-os-9-5']);
  console.log('   home plan redrawn (u1 path shows 1 of 22?):', (await p.textContent('[data-path]')).includes('Blind placing'));
  // no write loop: file must stay untouched while idle
  const lm = () => p.evaluate(async () => (await (await (await navigator.storage.getDirectory()).getFileHandle('bk.json')).getFile()).lastModified);
  const seq = []; for (let k = 0; k < 6; k++) { seq.push(await lm()); await p.waitForTimeout(2000); }
  console.log('   write times over 12 s (distinct):', new Set(seq).size, seq.map(x => x % 100000));
  const m1 = await p.evaluate(async () => (await (await (await navigator.storage.getDirectory()).getFileHandle('bk.json')).getFile()).lastModified);
  await p.waitForTimeout(5000);
  const m2 = await p.evaluate(async () => (await (await (await navigator.storage.getDirectory()).getFileHandle('bk.json')).getFile()).lastModified);
  console.log('4 idle 5 s, no extra writes:', m1 === m2);
  // burst of changes while writing: all land
  await p.evaluate(() => { for (let i = 5; i < 29; i++) BP.store.record(BP.unit0.ITEMS[i].id, 'blind', true, 1, 1); });
  await p.waitForTimeout(3500);
  f = await readFile(); console.log('5 burst written, unit0 items in file:', Object.keys(f.items).filter(k => k.startsWith('u0-')).length, '/ 29');
  // reload: link restored from IndexedDB
  await p.reload(); await p.evaluate(() => BP.backup.ready); await p.waitForTimeout(300);
  console.log('6 after reload status:', await p.evaluate(() => BP.backup.info().status));
  // simulate clearing site data: local progress gone, file survives, import restores
  const text = JSON.stringify(await readFile());
  await p.evaluate(() => BP.backup.unlink().then(() => BP.store.reset()));
  const restored = await p.evaluate(t => { const r = BP.store.merge(JSON.parse(t)); return Object.keys(BP.store.state.items).length; }, text);
  console.log('7 restore from file after wipe, items:', restored);
  // erase button path unlinks before reset (no auto-restore surprise)
  console.log('   status after unlink:', await p.evaluate(() => BP.backup.info().status));

  // phone-like browser without file pickers: bar after a finished round
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await c2.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
  const q = await c2.newPage(); q.on('pageerror', e => errors.push('phone: ' + e.message));
  await q.goto(U + 'units/unit0.html#drill');
  await q.click('[data-go]');
  for (let i = 0; i < 10; i++) { await q.click('[data-p="0"]'); await q.click('[data-next]'); }
  const barText = await q.textContent('.backup-bar').catch(() => null);
  console.log('8 phone bar after drill:', barText ? barText.replace(/\s+/g, ' ') : 'MISSING');
  await q.screenshot({ path: OUT + '/bk-02-phone-bar.png' });
  await q.goto(U + 'index.html');
  console.log('   phone home panel:', (await q.textContent('[data-autobk]')).replace(/\s+/g, ' ').slice(0, 90));
  // desktop, unlinked: bar offers auto-backup
  const c3 = await b.newContext(); const r3 = await c3.newPage();
  await r3.goto(U + 'units/unit0.html#drill'); await r3.click('[data-go]');
  for (let i = 0; i < 10; i++) { await r3.click('[data-p="1"]'); await r3.click('[data-next]'); }
  console.log('9 desktop unlinked bar:', (await r3.textContent('.backup-bar')).replace(/\s+/g, ' '));
  console.log('ERRORS:', errors.length ? errors : 'none');
  await b.close(); srv.close();
})();
