const { chromium } = require('playwright'); const fs = require('fs'); const U = process.env.U;
const V = { tab: 1, jp: s => { s.voxNotations = ['jp']; s.voxDual = [false]; }, staff: s => { s.voxNotations = ['staff']; s.voxDual = [false]; } };
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 2400 }, deviceScaleFactor: 3 });
  await pg.goto('file:///home/user/puyouquan/muse-tab/index.html'); await pg.waitForTimeout(1200);
  await pg.addStyleTag({ content: ':root,:root[data-theme]{--paper:#ffffff!important} #paper,#score{background:#fff!important;box-shadow:none!important}' });
  const meta = JSON.parse(fs.readFileSync(U + '/assets/pages.json'));
  for (const name of Object.keys(V)) {
    const info = await pg.evaluate((name) => { guardReplace = p => p(); toast = () => {}; hideStartPad(); const s = PRESETS[name==='tab'?1:13].make(); s.title = '欢乐颂';
      ({ tab: s => {}, jp: s => { s.voxNotations = ['jp']; s.voxDual = [false]; }, staff: s => { s.voxNotations = ['staff']; s.voxDual = [false]; } })[name](s);
      loadSong(s); cleanSnapSave(); render();
      const sv = document.getElementById('score'); const r = sv.getBoundingClientRect(); const pageH = Math.min(r.height, r.width * 1.4142);
      const els = [...sv.querySelectorAll('text,path,line,rect,circle,ellipse,polygon,use')].map(e => e.getBoundingClientRect()).filter(q => (q.width > .3 || q.height > .3) && !(q.width > r.width * .9 && q.height > r.height * .5) && q.bottom <= r.top + pageH);
      return { x: r.left, y: r.top, w: r.width, pageH, yMax: Math.max(...els.map(q => q.bottom)) - r.top, title: song.title }; }, name);
    await pg.screenshot({ path: U + '/assets/page-' + name + '.png', clip: { x: info.x, y: info.y, width: info.w, height: info.pageH } });
    meta[name] = { w: Math.round(info.w), h: Math.round(info.pageH), content: Math.round(info.yMax), title: info.title };
  }
  fs.writeFileSync(U + '/assets/pages.json', JSON.stringify(meta, null, 1)); console.log(JSON.stringify({jp:meta.jp,staff:meta.staff})); await b.close(); })();
