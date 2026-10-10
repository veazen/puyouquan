/* v62.6 A2 打印与导出管线回归（2026-10 评审团 §6.2 A2：P0-3 余项 / P1-01 余项 / P2-07 / P2-08 / P3-21）：
   T1 逐页切片：PDF 页数 = 屏幕虚拟页数（两种窗口宽 × 三首预设），打印后切片容器移除
   T2 系统不跨页：每个系统完整落在一张虚拟页里（SYS_GEO 与页边界几何断言）
   T3 观看页打印：切片同样生效、顶部操作栏不进成品、PDF 页数 = 虚拟页数
   T4 不换行模式：打印预览页数 = 打印页数（两者都借分页排版）
   T5 PNG 成品无页框/页码/播放头；字体栈与屏幕令牌同源
   T6 分享卡：裁切落在完整系统下沿（无系统被拦腰截断）、谱框底边在页脚之上、二维码说明不贴底边、口号为「专业曲谱平台」
   T7 离线互动谱取自 DOM 快照时图标不重复注入（每个按钮一枚）
   突变实证：对 v62.6 之前的文件复跑，T1/T3/T5/T6/T7 应报红。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (vp) => {
    const pg = await b.newPage({ viewport: vp || { width: 1440, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(F); await pg.waitForTimeout(1000);
    await pg.evaluate(`(()=>{ if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); if(typeof undoStack!=='undefined') undoStack.length=0; })()`);
    return pg;
  };
  const pdfPages = buf => buf ? (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length : -1;
  const LOADS = (pi, k) => `{ const s=PRESETS[${pi}].make(); const base=JSON.parse(JSON.stringify(s.measures));
    for(let i=0;i<${k};i++) s.measures.push(...JSON.parse(JSON.stringify(base)));
    loadSong(s); if(typeof hideStartPad==='function') hideStartPad(); render(); }`;
  const LOAD = (pi, k) => `(()=>{ ${LOADS(pi, k)}
    return {n:PV_GEO.n, sys:(typeof SYS_GEO!=='undefined'? SYS_GEO : null), g:PV_GEO}; })()`;

  /* ---------- T1 / T2 逐页切片 + 系统不跨页 ---------- */
  {
    const res = [], cross = [];
    for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 900 }]) {
      const pg = await open(vp);
      for (const [pi, k] of [[0, 3], [12, 2], [5, 4]]) {
        const r = await pg.evaluate(LOAD(pi, k)).catch(e => ({ err: e.message }));
        const buf = await pg.pdf({ format: 'A4', preferCSSPageSize: true }).catch(() => null);
        const left = await pg.evaluate(`!!document.getElementById('print-pages') || document.body.classList.contains('printing')`).catch(() => true);
        res.push({ w: vp.width, pi, n: r.n, pdf: pdfPages(buf), left });
        if (r.sys && r.g) r.sys.forEach((s, si) => {
          const p0 = Math.floor(s.y0 / (r.g.pgH + r.g.gap)), top = p0 * (r.g.pgH + r.g.gap);
          if (r.g.n > 1 && s.y1 > top + r.g.pgH + 0.5) cross.push(`${vp.width}/${pi}/sys${si}`);
        });
        if (!r.sys) cross.push('no SYS_GEO');
      }
      await pg.close();
    }
    T(res.every(x => x.n >= 1 && x.pdf === x.n), 'T1 PDF 页数＝屏幕虚拟页数（两种窗口宽 × 三首预设）', JSON.stringify(res.map(x => `${x.w}/#${x.pi}:${x.n}→${x.pdf}`)));
    T(res.every(x => !x.left), 'T1b 打印结束后切片容器移除、编辑器复原', JSON.stringify(res.map(x => x.left)));
    T(cross.length === 0, 'T2 每个系统完整落在一张虚拟页里（不跨页）', cross.join(',') || 'ok');
  }

  /* ---------- T3 观看页打印 ---------- */
  {
    const pg = await open({ width: 1280, height: 900 });
    const r = await pg.evaluate(`(async()=>{ const s=PRESETS[0].make(); const base=JSON.parse(JSON.stringify(s.measures));
      for(let i=0;i<3;i++) s.measures.push(...JSON.parse(JSON.stringify(base)));
      const oa=apiCall; apiCall=async(p)=>{ if(/^\\/pub\\/scores\\//.test(p)) return {score:{id:'tvprint01', title:'打印测试', data:s, author:'x'}}; return {}; };
      try{ await openRemotePub('tvprint01'); }finally{ apiCall=oa; }
      await new Promise(r=>setTimeout(r,300)); render();
      return {viewer:!!viewerMode, n:PV_GEO.n}; })()`).catch(e => ({ err: e.message }));
    await pg.evaluate(`addEventListener('beforeprint',()=>{ const p=document.getElementById('print-pages');
      window.__pp={pages:p? p.querySelectorAll('.pp').length : 0, bar:(()=>{ const v=document.getElementById('viewerbar'); return v? getComputedStyle(v).display : 'none'; })()}; })`);
    const buf = await pg.pdf({ format: 'A4', preferCSSPageSize: true }).catch(() => null);
    const pp = await pg.evaluate(`window.__pp||null`).catch(() => null);
    T(r && r.viewer && pp && pp.pages === r.n && pdfPages(buf) === r.n, 'T3 观看页打印逐页切片，PDF 页数＝虚拟页数', JSON.stringify({ r, pp, pdf: pdfPages(buf) }));
    await pg.emulateMedia({ media: 'print' });
    await pg.evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
    const bar = await pg.evaluate(`(()=>{ const v=document.getElementById('viewerbar'); return v? getComputedStyle(v).display : 'none'; })()`).catch(() => '?');
    await pg.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    T(bar === 'none', 'T3b 观看页顶部操作栏不进打印成品', bar);
    await pg.close();
  }

  /* ---------- T4 不换行模式：预览页数＝打印页数 ---------- */
  {
    const pg = await open({ width: 1440, height: 900 });
    const r = await pg.evaluate(`(()=>{ ${LOADS(0, 3)}
      try{ localStorage.setItem('musetab-nowrap','1'); }catch(_){}
      render(); const nw=typeof noWrapOn==='function'? noWrapOn() : null;
      pvOpen(); const pv=PV.geo.n; pvClose(); return {nw, pv}; })()`).catch(e => ({ err: e.message }));
    const buf = await pg.pdf({ format: 'A4', preferCSSPageSize: true }).catch(() => null);
    T(r && r.pv >= 1 && pdfPages(buf) === r.pv, 'T4 不换行模式：打印预览页数＝打印页数', JSON.stringify({ r, pdf: pdfPages(buf) }));
    await pg.close();
  }

  /* ---------- T5 PNG ---------- */
  {
    const pg = await open();
    await pg.evaluate(LOAD(0, 3)).catch(() => {});
    const r = await pg.evaluate(`(()=>{ const o=svgResolveVars; let x=''; svgResolveVars=(s)=>{ x=o(s); return x; };
      try{ exportPNG(1); }finally{ svgResolveVars=o; }
      const fam=getComputedStyle(document.documentElement).getPropertyValue('--font-num').trim().split(',')[0].replace(/["']/g,'');
      return {len:x.length, frame:/class="pagebg"/.test(x), pno:/class="pageno"/.test(x), play:/id="playhead"|id="playline"/.test(x), fam, famIn:x.indexOf(fam)>=0}; })()`).catch(e => ({ err: e.message }));
    T(r && r.len > 1000 && !r.frame && !r.pno && !r.play, 'T5 PNG 成品无页框/页码/播放头', JSON.stringify(r));
    T(r && r.famIn, 'T5b PNG 字体栈与屏幕令牌同源（--font-num 首选字体进成品）', JSON.stringify({ fam: r && r.fam }));
    await pg.close();
  }

  /* ---------- T6 分享卡 ---------- */
  {
    const pg = await open();
    const res = [];
    for (const [pi, k] of [[0, 3], [12, 2], [5, 2], [8, 2]]) {
      const r = await pg.evaluate(`(()=>{ ${LOADS(pi, k)}
        const card=buildShareCardSVG(); const sys=SYS_GEO.slice();
        const m=card.match(/<svg x="25" y="96" width="700" height="([\\d.]+)" viewBox="0 0 ([\\d.]+) ([\\d.]+)"/);
        if(!m) return {err:'no box'};
        const drawH=+m[1], cropH=+m[3];
        const cut=sys.filter(g=>g.y0<cropH && g.y1>cropH+0.5).length;
        const qr=card.match(/<text x="[\\d.]+" y="([\\d.]+)" font-size="11" fill="#8a8a8a" text-anchor="middle">/);
        return {drawH, cropH, cut, boxBottom:96+drawH+6, qrText:qr? +qr[1] : null, slogan:/专业曲谱平台/.test(card), old:/人人都能做谱|#6d5cff/.test(card)}; })()`).catch(e => ({ err: e.message }));
      res.push(r);
    }
    T(res.every(x => x && x.cut === 0), 'T6 分享卡裁切落在完整系统下沿（无系统被拦腰截断）', JSON.stringify(res.map(x => x && (x.err || x.cut))));
    T(res.every(x => x && x.boxBottom <= 1000 - 130), 'T6b 谱框底边在页脚之上（不被页脚遮罩盖住）', JSON.stringify(res.map(x => x && x.boxBottom)));
    T(res.every(x => x && (x.qrText === null || x.qrText <= 1000 - 10)), 'T6c 二维码说明文字不贴底边', JSON.stringify(res.map(x => x && x.qrText)));
    T(res.every(x => x && x.slogan && !x.old), 'T6d 卡片口号「专业曲谱平台」（旧口号与旧蓝紫 #6d5cff 撤除）', JSON.stringify(res.map(x => x && [x.slogan, x.old])));
    await pg.close();
  }

  /* ---------- T7 离线互动谱快照：图标不重复注入 ---------- */
  {
    const pg = await open();
    const html = await pg.evaluate(`'<!doctype html>'+document.documentElement.outerHTML`).catch(() => '');
    const pg2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
    pg2.on('pageerror', e => errs.push('SNAP:' + e.message));
    await pg2.route('**/*', r => r.request().url().startsWith('file:') || r.request().url().startsWith('data:') ? r.continue() : r.abort());
    await pg2.setContent(html, { waitUntil: 'load' }).catch(() => {});
    await pg2.waitForTimeout(900);
    const r = await pg2.evaluate(`(()=>{ const a=[...document.querySelectorAll('[data-svgi]')].filter(el=>el.querySelectorAll(':scope > svg.svgi').length>1).length;
      const c=[...document.querySelectorAll('[data-sic]')].filter(el=>el.querySelectorAll(':scope > .sicon').length>1).length;
      return {svgi:document.querySelectorAll('[data-svgi]').length, dupSvgi:a, dupSic:c}; })()`).catch(e => ({ err: e.message }));
    T(r && r.svgi > 5 && r.dupSvgi === 0 && r.dupSic === 0, 'T7 DOM 快照二次打开，每个按钮只有一枚图标', JSON.stringify(r));
    await pg2.close(); await pg.close();
  }

  console.log('PASS ' + pass + '/' + total);
  const real = errs.filter(e => !/SNAP:/.test(e));
  console.log(real.length ? 'ERRORS:\n' + real.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !real.length ? 0 : 1);
})();
