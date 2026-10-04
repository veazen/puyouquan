const { chromium } = require('playwright'); const fs = require('fs'); const U = process.env.U;
const V = { tab: [1, s => {}], staff: [13, s => { s.voxNotations = ['staff']; s.voxDual = [false]; }], jp: [13, s => { s.voxNotations = ['jp']; s.voxDual = [false]; }] };
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 3 });
  await pg.goto('file:///home/user/puyouquan/muse-tab/index.html'); await pg.waitForTimeout(1200);
  await pg.addStyleTag({ content: ':root,:root[data-theme]{--paper:#ffffff!important} #paper,#score{background:#fff!important;box-shadow:none!important} #paper{--accent:#3e6ae1} #score .pagebg{stroke:none!important} #score #playhead{fill:#000!important;opacity:.07!important}' });
  const meta = {};
  for (const [name, [idx, fn]] of Object.entries(V)) {
    const info = await pg.evaluate(([idx, fns, name]) => { guardReplace = p => p(); toast = () => {}; hideStartPad(); const s = PRESETS[idx].make(); s.title = '欢乐颂'; (0, eval)('(' + fns + ')')(s);
      loadSong(s); cleanSnapSave(); blurSel = true; selRange = null; render();
      const sv = document.getElementById('score'), r = sv.getBoundingClientRect(), k = r.width / sv.viewBox.baseVal.width;
      const mi = 1, mb = meaBoxes[mi], band = meaBands[mi], b0 = meaBands[0];
      const ph = document.getElementById('playhead'), pl = document.getElementById('playline');
      ph.setAttribute('x', mb.x); ph.setAttribute('y', band.y); ph.setAttribute('width', mb.w); ph.setAttribute('height', band.h); ph.setAttribute('opacity', '0.12');
      const x = mb.x + mb.w * 0.45; pl.setAttribute('x1', x); pl.setAttribute('x2', x); pl.setAttribute('y1', band.y + 3); pl.setAttribute('y2', band.y + band.h - 3); pl.setAttribute('opacity', '1');
      const top = b0.y - 14, bot = b0.y + b0.h + 6;
      return { x: r.left, y: r.top + top * k, w: r.width, h: (bot - top) * k, lineX: x * k, title: song.title }; }, [idx, fn.toString(), name]);
    await pg.screenshot({ path: U + '/assets/tri-' + name + '.png', clip: { x: info.x, y: info.y, width: info.w, height: info.h } });
    meta[name] = { w: Math.round(info.w), h: Math.round(info.h), lineX: Math.round(info.lineX) };
  }
  // 即兴卡用的功能谱页
  await pg.evaluate(() => { loadSong(PRESETS[15].make()); cleanSnapSave(); blurSel = true; render(); });
  const r = await pg.evaluate(() => { const q = document.getElementById('score').getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: Math.min(q.height, q.width * 1.4142), t: song.title }; });
  await pg.screenshot({ path: U + '/assets/page-func.png', clip: { x: r.x, y: r.y, width: r.w, height: r.h } }); meta.func = r.t;
  fs.writeFileSync(U + '/assets/tri.json', JSON.stringify(meta)); console.log(JSON.stringify(meta)); await b.close(); })();
