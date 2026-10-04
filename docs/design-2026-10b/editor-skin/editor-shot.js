const { chromium } = require('playwright');
const fs = require('fs');
const U = process.env.U || __dirname, MODE = process.env.MODE || 'shot';
const SETUPS = {
  guitar: `loadSong(PRESETS[0].make()); render(); cursor={mi:1,ci:2,vi:0}; selRange=null; blurSel=false; render();`,
  teach: `loadSong(PRESETS[13].make()); render(); blurSel=false; selRange={row:'vox',vi:0,m1:2,c1:0,m2:2,c2:song.measures[2].voxes[0].length-1,whole:true}; cursor={mi:2,ci:0,vi:0}; render();`,
  piano: `loadSong(PRESETS[9].make()); render();`,
  start: ``,
  viewer: `toast=()=>{}; const s=PRESETS[0].make(); enterShareViewer({song:s}); document.getElementById('toast')&&(document.getElementById('toast').style.opacity=0);`,
  viewerSong: `toast=()=>{}; const s=PRESETS[10].make(); enterShareViewer({song:s}); document.getElementById('toast')&&(document.getElementById('toast').style.opacity=0);`,
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const vp = { width: +(process.env.W || 1440), height: +(process.env.H || 900) };
  const pg = await b.newPage({ viewport: vp, deviceScaleFactor: +(process.env.DPR || 1) });
  await pg.goto('file://' + require('path').join(__dirname, '../../../muse-tab/index.html')); await pg.waitForTimeout(1200);
  const which = process.env.SETUP || 'guitar';
  if (MODE === 'text') {
    let all = '';
    for (const k of Object.keys(SETUPS)) { all += await pg.evaluate((c) => { guardReplace = p => p(); if (c) { hideStartPad(); (0, eval)(c); } return document.body.innerText + [...document.querySelectorAll('#score text')].map(t => t.textContent).join(''); }, SETUPS[k]); }
    fs.writeFileSync(U + '/mock/editor-text.txt', all); console.log('text', all.length); await b.close(); return;
  }
  if (process.env.PROPOSAL === '1') {
    const FD = require('path').join(__dirname, '../mock') + '/';
    const fonts = fs.readFileSync(FD + 'fonts.css', 'utf8').replace(/url\('fonts\//g, "url('file://" + FD + "fonts/");
    await pg.addStyleTag({ content: fonts + '\n' + fs.readFileSync(U + '/_inject.css', 'utf8') });
    if (process.env.THEME) await pg.evaluate((t) => document.documentElement.setAttribute('data-theme', t), process.env.THEME);
    await pg.waitForTimeout(300);
  }
  await pg.evaluate((c) => { guardReplace = p => p(); if (c) { hideStartPad(); (0, eval)(c); } }, SETUPS[which]);
  if (process.env.PRE) await pg.evaluate(process.env.PRE);
  if (process.env.AFTER) await pg.evaluate(fs.readFileSync(process.env.AFTER, 'utf8'));
  if (process.env.POST) { const r = await pg.evaluate(process.env.POST); if (r) console.log('POST', r); }
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: process.env.OUT });
  await b.close();
})();
