// Run: node tests/spots.check.js   (needs Playwright + Chromium; used in cloud sessions)
// For every Unit 1 scene, checks that each blind-placing spot sits inside its own
// muscle AND that muscle is the topmost one painted at that point. Re-run after
// any anatomy correction to js/muscles-data.js.
'use strict';
var path = require('path'), fs = require('fs');
var pw = (function () { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
var JS = path.join(__dirname, '..', 'js');
(async function () {
  var b = await pw.chromium.launch(), p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  for (var f of ['muscles-data.js', 'model.js']) await p.addScriptTag({ content: fs.readFileSync(path.join(JS, f), 'utf8') });
  var out = await p.evaluate(function () {
    var res = [];
    BP.muscles.SCENES.forEach(function (sc) {
      var d = document.createElement('div');
      d.innerHTML = BP.model.sceneSvg(sc, {});
      document.body.appendChild(d);
      var svg = d.querySelector('svg'), paths = Array.from(svg.querySelectorAll('g:not(.mirror) > path.mus'));
      sc.spots.forEach(function (sp) {
        var pt = svg.createSVGPoint(); pt.x = sp[1]; pt.y = sp[2];
        var top = null; paths.forEach(function (pa) { if (pa.isPointInFill(pt)) top = pa.dataset.m; });
        res.push({ ok: top === sp[0], line: sc.id + ' ' + sp[0] + ' -> topmost: ' + top });
      });
    });
    return res;
  });
  await b.close();
  var fails = out.filter(function (r) { return !r.ok; });
  out.forEach(function (r) { console.log((r.ok ? 'ok   ' : 'FAIL ') + r.line); });
  console.log(fails.length ? fails.length + ' failure(s)' : 'all passed');
  process.exit(fails.length ? 1 : 0);
})();
