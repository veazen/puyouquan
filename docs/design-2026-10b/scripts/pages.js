const { chromium } = require('playwright'); const fs = require('fs'); const U = process.env.U;
const P = {
  teach: 13, strum: 1, songbie: 10, minuet: 12, guitar: 0, piano: 8, satb: 11, canon: 9, solo: 7,
};
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 2400 }, deviceScaleFactor: 3 });
  await pg.goto('file:///home/user/puyouquan/muse-tab/index.html'); await pg.waitForTimeout(1200);
  await pg.addStyleTag({ content: ':root,:root[data-theme]{--paper:#ffffff!important} #paper,#score{background:#fff!important;box-shadow:none!important}' });
  const meta = {};
  for (const [name, idx] of Object.entries(P)) {
    const info = await pg.evaluate((i) => { guardReplace = p => p(); toast = () => {}; hideStartPad(); loadSong(PRESETS[i].make()); cleanSnapSave(); render();
      const sv = document.getElementById('score'); const r = sv.getBoundingClientRect();
      /* 第一页高度：A4 比例 */ const pageH = Math.min(r.height, r.width * 1.4142);
      const els = [...sv.querySelectorAll('text,path,line,rect,circle,ellipse,polygon,use')].map(e => e.getBoundingClientRect()).filter(q => (q.width > .3 || q.height > .3) && !(q.width > r.width * .9 && q.height > r.height * .5) && q.bottom <= r.top + pageH);
      const yMax = Math.max(...els.map(q => q.bottom)) - r.top;
      return { x: r.left, y: r.top, w: r.width, pageH, yMax, title: song.title }; }, idx);
    await pg.screenshot({ path: U + '/assets/page-' + name + '.png', clip: { x: info.x, y: info.y, width: info.w, height: info.pageH } });
    meta[name] = { w: Math.round(info.w), h: Math.round(info.pageH), content: Math.round(info.yMax), title: info.title };
  }
  fs.writeFileSync(U + '/assets/pages.json', JSON.stringify(meta, null, 1)); console.log(JSON.stringify(meta)); await b.close(); })();
