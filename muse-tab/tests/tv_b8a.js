/* v64.5 B8 ① 版面与显示解耦（2026-10 评审团 §6.3 B8 ①：P1-18；D-09 拍板「新建谱固定纸宽」）
   T1 新建向导出的谱默认固定版宽（song.layout.fixed=true）
   T2 固定版宽谱在 1100 / 1280 / 1440 / 1920 四种桌面宽度下版宽都是 1060，行数与页数一致；手机 390 仍走窄屏重排
   T3 显示随可视宽缩放：窄于版宽时缩小显示（最低 80%），宽时不放大
   T4 存量谱在「排版」里自愿开启/关闭固定版宽
   T5 打印：固定版宽谱在 1280 窗口打印时按 1060 排版，与 1920 窗口断行相同
   突变实证：对 v64.5 之前的文件复跑，T1–T5 全部报红（0/5）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const MK = `window.mkLong=(fixed)=>{ const s=createSong('vocal',{title:'长谱',key:'C',beats:4,unit:4,nMea:40,nVox:1,lyr:1});
  s.measures.forEach(m=>m.voxes[0].forEach((c,i)=>{ c.deg=[1,2,3,5][i]; c.lyrics=['啦']; }));
  if(fixed) s.layout=Object.assign({}, s.layout||{}, {fixed:true}); return s; };`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (w, h, mob) => { const pg = await b.newPage(mob ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto('file://' + FILE); await pg.waitForTimeout(900);
    await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); ${MK} })()`); return pg; };

  /* T1 */
  { const pg = await open(1440, 900);
    const r = await pg.evaluate(`(async()=>{ showNewWizard(); await new Promise(r=>setTimeout(r,80));
      const iv=document.querySelector('.nw-int[data-int="vocal"]'); if(iv) iv.click(); await new Promise(r=>setTimeout(r,80));
      const c=document.getElementById('nw-create'); if(c) c.click(); await new Promise(r=>setTimeout(r,300));
      return {fixed: !!(song.layout && song.layout.fixed), title: song.title}; })()`).catch(e => ({ err: e.message }));
    T(!r.err && r.fixed, 'T1 新建向导出的谱默认固定版宽', JSON.stringify(r));
    await pg.close(); }

  /* T2 + T3 */
  const res = {};
  for (const w of [1100, 1280, 1440, 1920]) {
    const pg = await open(w, 900);
    res[w] = await pg.evaluate(`(()=>{ loadSong(mkLong(true)); render(); const sv=document.getElementById('score');
      return {PAGE_W, sys:layoutSystems().length, n:PV_GEO.n, paper:document.getElementById('paper').clientWidth, svgW:+sv.getAttribute('width')}; })()`).catch(e => ({ err: e.message }));
    await pg.close();
  }
  { const pg = await open(390, 844, true);
    res.m390 = await pg.evaluate(`(()=>{ loadSong(mkLong(true)); render(); return {PAGE_W}; })()`).catch(e => ({ err: e.message }));
    await pg.close(); }
  const ws = [1100, 1280, 1440, 1920].map(w => res[w]);
  T(ws.every(x => x && x.PAGE_W === 1060) && ws.every(x => x.sys === ws[0].sys && x.n === ws[0].n) && res.m390.PAGE_W < 1060,
    'T2 四种桌面宽度版宽 1060、行数页数一致；手机窄屏重排', JSON.stringify(res));
  T(ws.every(x => x.svgW <= Math.max(x.paper, Math.round(1060 * 0.8)) + 1 && x.svgW >= Math.round(1060 * 0.8) - 1),
    'T3 显示按可视宽缩放（不放大、最低 80%）', JSON.stringify(ws.map(x => ({ paper: x.paper, svgW: x.svgW }))));

  /* T4 */
  { const pg = await open(1440, 900);
    const r = await pg.evaluate(`(()=>{ loadSong(mkLong(false)); render(); const before=PAGE_W;
      const on=document.querySelector('#lp-fix [data-fix="1"]'); if(!on) return {btn:false, before};
      on.click(); const fx={fixed:!!song.layout.fixed, PAGE_W};
      document.querySelector('#lp-fix [data-fix="0"]').click(); return {btn:true, before, fx, off:{fixed:!!song.layout.fixed, PAGE_W}}; })()`).catch(e => ({ err: e.message }));
    T(!r.err && r.btn && r.before !== 1060 && r.fx.fixed && r.fx.PAGE_W === 1060 && !r.off.fixed && r.off.PAGE_W === r.before,
      'T4 存量谱在排版里开启/关闭固定版宽', JSON.stringify(r));
    await pg.close(); }

  /* T5 */
  { const pg = await open(1280, 900);
    const r = await pg.evaluate(`(()=>{ loadSong(mkLong(true)); render(); window.dispatchEvent(new Event('beforeprint'));
      const during={PAGE_W, sys:layoutSystems().length}; window.dispatchEvent(new Event('afterprint')); return during; })()`).catch(e => ({ err: e.message }));
    T(!r.err && r.PAGE_W === 1060 && r.sys === res[1920].sys, 'T5 固定版宽谱打印按 1060 排版、与宽窗口断行一致', JSON.stringify({ r, wide: res[1920].sys }));
    await pg.close(); }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
