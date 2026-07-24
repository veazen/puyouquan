/* v44.3 移动端 UX 回归：① 观看模式谱面 fit-to-width（390px 不横向溢出）；
   ② 线上未登录点发布→拉起登录（不再本机演示误导）。file:// 直载。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(700);
  let pass = 0, total = 0; const T = (ok, n, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + n + (d ? ': ' + d : '')); };

  let r = await pg.evaluate(() => {
    window.guardReplace = (p) => p();
    enterShareViewer({ song: JSON.parse(JSON.stringify(createSong('guitar', { title: 't', beats:4, unit:4, key:'C', nMea:8, nTab:1, nVox:1, lyr:1 }))) });
    const w = Math.round(document.getElementById('score').getBoundingClientRect().width);
    return { scoreW: w, vw: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth + 2 };
  });
  T(r.scoreW <= r.vw + 1 && !r.overflowX, 'T1 移动端看谱 fit-to-width', JSON.stringify(r));

  r = await pg.evaluate(() => {
    document.body.className = 'shell';   // 退出观看态
    window.PYQ_CLOUD = true; ACCT = null;
    const le = { id:'lib1', title:'测试谱', data: createSong('guitar', { title:'测试谱', beats:4, unit:4, key:'C', nMea:2, nTab:1, nVox:1, lyr:0 }) };
    showPublishMenu(le, { left:100, top:100, width:10, bottom:110, right:110 });
    const btn = document.getElementById('pub-go'); const label = btn ? btn.textContent : '';
    if (btn) btn.click();
    return { label, loginOpen: !!document.getElementById('lg-phone'), pubGone: !document.getElementById('pub-go') };
  });
  T(r.label === '登录后发布到谱库' && r.loginOpen && r.pubGone, 'T2 线上未登录发布→拉起登录', JSON.stringify(r));

  T(errs.length === 0, 'T3 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
