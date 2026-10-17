/* v64.5 B8 ① 版面与显示解耦（2026-10 评审团 §6.3 B8 ①：P1-18；D-09 拍板「新建谱固定纸宽」）
   T1 新建向导出的谱默认固定版宽（song.layout.fixed=true）
   T2 固定版宽谱在 1100 / 1280 / 1440 / 1920 四种桌面宽度下版宽都是 FIXED_A4（v64.5–v67.6 为 1060，v67.7 起 870＝桌面 900−30），行数与页数一致；手机 390 仍走窄屏重排
   T3 显示随可视宽缩放：窄于版宽时缩小显示（v66.0 起宽屏最低 70%、不超出纸宽）；v67.3 起桌面编辑态宽时放大铺满可视宽（≤125%，见 tv_deskscale）
   T4 存量谱在「排版」里自愿开启/关闭固定版宽（v67.7 D7 门槛 90%：1440 开启时左栏会自动收起一次，关闭后再打开左栏版宽回到开启前）
   T5 打印：固定版宽谱在 1280 窗口打印时按 FIXED_A4 排版，与 1920 窗口断行相同
   v67.7 起期望版宽读页面常量 FIXED_A4（不再写死 1060）
   v68.2 切默认（flow）：T1–T3、T5 在默认外壳（flow）跑；T4 两种外壳各跑一段——旧外壳段（?shell=classic）照旧验 D7 左栏自动收起与「小节」页签重开；
   flow 段（T4f）走新入口：排版模式（真实点模式条「排版」）→ 右栏「版式」页的 #lp-fix。口径：flow 的谱面区在 1440（左栏 248 + 右栏 264）、
   1280 竖条态都 ≥ #paper 上限 900，自适应版宽恰好＝870＝FIXED_A4，开 / 关看不出版宽变化；故 flow 段用 1280 + 右栏钉住（musetab-rdock='1'，
   S4 的正式状态）——谱面区 752 → 自适应 722，开启＝870、关闭回 722（断言不放宽：仍要求 before≠FA4、开启＝FA4、关闭＝before）
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
  let FA4 = null;   // v67.7 期望版宽读页面常量 FIXED_A4（1060→870）
  const open = async (w, h, mob, q, ls) => { const pg = await b.newPage(mob ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    if (ls) await pg.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, ls);
    await pg.goto('file://' + FILE + (q ? '?' + q : '')); await pg.waitForTimeout(900);
    await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); ${MK} })()`);
    if (FA4 == null) FA4 = await pg.evaluate(() => typeof FIXED_A4 === 'number' ? FIXED_A4 : null);
    return pg; };

  /* T1 */
  { const pg = await open(1440, 900);
    const r = await pg.evaluate(`(async()=>{ showNewWizard(); await new Promise(r=>setTimeout(r,80));
      const iv=document.querySelector('.nw-int[data-int="vocal"], .nf-modal [data-scene="vocal"]'); if(iv) iv.click();   /* v67.4 新建面板：「歌谱 · 合唱」用途（原声乐意图卡） */ await new Promise(r=>setTimeout(r,80));
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
  /* v67.7 1060 → FIXED_A4（870） */
  T(ws.every(x => x && x.PAGE_W === FA4) && ws.every(x => x.sys === ws[0].sys && x.n === ws[0].n) && res.m390.PAGE_W < FA4,
    'T2 四种桌面宽度版宽＝FIXED_A4（' + FA4 + '）、行数页数一致；手机窄屏重排', JSON.stringify(res));
  /* v66.0 D7：宽屏编辑态下限 80%→70%，且显示宽不再超出纸宽（此前 80% 下限会把末小节线裁掉） */
  T(ws.every(x => x.svgW <= x.paper + 1 && x.svgW >= Math.round(FA4 * 0.7) - 1),   // v67.7 1060 → FIXED_A4
    'T3 显示按可视宽缩放（最低 70%、不超出纸宽；v67.3 起宽屏放大铺满）', JSON.stringify(ws.map(x => ({ paper: x.paper, svgW: x.svgW }))));

  /* T4（旧外壳段） */
  { const pg = await open(1440, 900, false, 'shell=classic');
    /* v67.7：D7 门槛 70%→90%（FIT_DOCK）后，1440 停靠时 870×0.9 放不下 → 开启固定版宽会自动收起左栏一次，关闭后左栏仍收着、
       自适应版宽按收起后的纸宽算（v67.6 1440 不收起）——对比「开启前」须先把左栏再打开（真实点左轨「小节」页签），面板状态对齐后版宽应回到开启前 */
    const r = await pg.evaluate(`(async()=>{ loadSong(mkLong(false)); render(); const fly=document.getElementById('left-flyout'); const flyH0=fly.classList.contains('hidden'); const before=PAGE_W;
      const on=document.querySelector('#lp-fix [data-fix="1"]'); if(!on) return {btn:false, before};
      on.click(); const fx={fixed:!!song.layout.fixed, PAGE_W, flyH:fly.classList.contains('hidden')};
      document.querySelector('#lp-fix [data-fix="0"]').click(); const off={fixed:!!song.layout.fixed, PAGE_W, flyH:fly.classList.contains('hidden')};
      let off2=null;
      if(!flyH0 && fly.classList.contains('hidden')){ document.querySelector('.ltab[data-t="mea"]').click(); await new Promise(r=>setTimeout(r,500)); render();
        off2={PAGE_W, flyH:fly.classList.contains('hidden')}; }
      return {btn:true, before, flyH0, fx, off, off2}; })()`).catch(e => ({ err: e.message }));
    T(!r.err && r.btn && r.before !== FA4 && r.fx.fixed && r.fx.PAGE_W === FA4 && !r.off.fixed && (r.off2 ? !r.off2.flyH && r.off2.PAGE_W === r.before : r.off.PAGE_W === r.before),
      'T4 存量谱在排版里开启/关闭固定版宽（关闭后面板状态对齐时版宽回到开启前）', JSON.stringify(r));
    await pg.close(); }
  /* T4f（flow 段）：1280 + 右栏钉住；真实点模式条「排版」→ 右栏「版式」页 #lp-fix 开 / 关；回书写版宽仍是开启前 */
  { const pg = await open(1280, 900, false, '', { 'musetab-rdock': '1' });
    const r0 = await pg.evaluate(`(()=>{ loadSong(mkLong(false)); render(); return {flow:document.body.classList.contains('flow'), before:PAGE_W, paper:document.getElementById('paper').clientWidth, fixed:!!(song.layout&&song.layout.fixed)}; })()`).catch(e => ({ err: e.message }));
    await pg.click('#flw-mode-engrave'); await pg.waitForTimeout(300);
    const vis = sel => pg.evaluate(s2 => { const e = document.querySelector(s2); return !!e && e.getClientRects().length > 0 && !!e.closest('#flw-rp-lay'); }, sel);
    const r = { r0, mode: await pg.evaluate(() => document.body.dataset.mode), onVis: await vis('#lp-fix [data-fix="1"]') };
    if (r.onVis) {
      await pg.click('#lp-fix [data-fix="1"]'); await pg.waitForTimeout(250);
      r.fx = await pg.evaluate(() => ({ fixed: !!song.layout.fixed, PAGE_W }));
      await pg.click('#lp-fix [data-fix="0"]'); await pg.waitForTimeout(250);
      r.off = await pg.evaluate(() => ({ fixed: !!song.layout.fixed, PAGE_W }));
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(250);
      r.back = await pg.evaluate(() => ({ mode: document.body.dataset.mode, PAGE_W, fixed: !!song.layout.fixed }));
    }
    T(!r0.err && r0.flow && !r0.fixed && r0.before !== FA4 && r.mode === 'engrave' && r.onVis && r.fx.fixed && r.fx.PAGE_W === FA4
      && !r.off.fixed && r.off.PAGE_W === r0.before && r.back.mode === 'write' && r.back.PAGE_W === r0.before && !r.back.fixed,
      'T4f flow：排版模式右栏「版式」开启 / 关闭固定版宽（1280 右栏钉住：自适应 ' + r0.before + ' → 开启 ' + FA4 + ' → 关闭回 ' + r0.before + '）', JSON.stringify(r));
    await pg.close(); }

  /* T5 */
  { const pg = await open(1280, 900);
    const r = await pg.evaluate(`(()=>{ loadSong(mkLong(true)); render(); window.dispatchEvent(new Event('beforeprint'));
      const during={PAGE_W, sys:layoutSystems().length}; window.dispatchEvent(new Event('afterprint')); return during; })()`).catch(e => ({ err: e.message }));
    T(!r.err && r.PAGE_W === FA4 && r.sys === res[1920].sys, 'T5 固定版宽谱打印按 FIXED_A4（' + FA4 + '）排版、与宽窗口断行一致', JSON.stringify({ r, wide: res[1920].sys }));   // v67.7 1060 → FIXED_A4
    await pg.close(); }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
