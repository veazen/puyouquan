/* v67.3 电脑端编辑页谱面放大（产品报障：「电脑端编辑页面……整体变小了好多，不实用」，截图《快乐的小星星》1=B 4/4 ♩=90）
   根因（实测，非 v66.9 页头）：v64.5 新建谱固定版宽 1060 × 新版外壳 #paper{max-width:900px}（v40.4）——显示缩放＝可视宽/1060
   被钳在 ≤84.5%，1920 宽屏也只用 900px（简谱数字 14.4px，存量谱恒 17px）；v66.0 D7 宽屏下限 70% 让 1440 面板全开只剩 12.1px；
   另 fitKOf 旧式把用户缩放除掉，110% / 120% 点了不变（缩放死区）。修复＝桌面编辑态固定版宽谱 body.fixwide 解除 900 上限、
   显示基准适配可视宽（最高 125%），用户缩放在其上相乘；版面（断行/分页/导出/打印）一字不动。全部为数值断言：
   T1 新建向导（真实点击：声乐谱→标题→1=B→♩=90→创建）建谱 → 固定版宽；1280/1366/1440/1536/1920 × DPR 1 与 1536@1.25、1280@1.5：
      PAGE_W=1060、断行与页数、#score viewBox 与 innerHTML 全部逐字节相同（与窗口/缩放比无关）
   T2 桌面编辑态挂 body.fixwide、#paper 解除 900 上限；简谱数字屏幕字号（font-size × 屏幕/谱面比，CSS px）：1366≥15、1920≥19 为本轮目标；
      1280≥13.8、1440(左栏全开)≥12、1536(左栏全开)≥13.6 只是「不比 v67.1 小」的下限——这三档左栏停靠时的默认放大待产品拍板（收起钮见 tv_deskscale2 T7）；
      1920 纸张铺满谱面区（两侧空白 ≤30px，此前各 191px）；DPR 1.25/1.5 与 DPR 1 的 CSS 字号相同（设备像素＝×DPR）
   T3 页头放得下时走原写法：歌名/1=X/拍号/速度/署名字号 28/16/11/12.5/12.5，页头 SVG 与 v66.8 原写法（tv_header.js 的 REF668）一致
   T4 面板收起自动放大：1440 / 1536 点左栏当前页签收起 → 数字 ≥16 / ≥17.5；再点打开 → 回停靠尺寸，末小节线不被裁
   T5 手动缩放无死区：1366 / 1920 下 ＋ 每档谱面宽 ×1.10±0.01、− 每档 ÷1.10；放不下 → #paper.paper-xs 横滚，滚到底末小节线可见；点百分比回适配
   T6 「排版」浮层点预设（layApply→fitViewWidth）后缩放仍 100%、显示＝适配（不二次放大、也不再把缩放写成 85%）
   T7 不受影响：存量自适应谱（无 fixwide、#paper≤900、100%）、观看页（无 fixwide、≤900）、手机 390（窄屏重排、不横溢）、
      1366 D7（左栏自动收起，再开改浮层、谱面不被挤窄）、打印（按 1060 排、与屏幕断行相同，打印期间不挂 fixwide，打印后显示宽复原）
   验收修（升级用户旧缩放值 / 存量谱排版串扰 / 排版不覆盖手动缩放 / PNG 与窗口无关 / Ctrl+滚轮锚点 / 键盘光标跟滚 / 收起钮）
   见姊妹套件 tv_deskscale2.js（拆开是为了单套件留在 run_all.js 的 180 秒上限内）。
   突变实证：MUSETAB_URL 指向 v67.1 → T2 / T4 / T5 / T6 报红（见文末记录）。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');

/* v66.8 页头原写法：取 tv_header.js 内嵌的 REF668（同一份参照，不重复抄写） */
const REF668 = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'tv_header.js'), 'utf8');
  const i = src.indexOf('const REF668 = `'), j = src.indexOf('})()`;', i);
  if (i < 0 || j < 0) return null;
  return eval(src.slice(i + 'const REF668 = '.length, j + 5));
})();

const NOTES = `(()=>{ const V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
  const A=[[V(1,4),V(5,4),V(1,8,{dotted:true}),V(1,16),V(5,8,{dotted:true}),V(1,16)],
    [V(5,4,{oct:-1}),V(5,4),V(5,8,{dotted:true}),V(5,16),V(6,8,{dotted:true}),V(5,16)],
    [V(6,4,{oct:-1}),V(5,4),V(6,8,{dotted:true}),V(6,16,{oct:-1}),V(1,8,{dotted:true}),V(6,16,{oct:-1})],
    [V(4,4),V(4,4),V(5,4),V(0,4)]];
  song.lyricist='陈财娣'; song.composer='陈财娣'; song.maker='谱友圈';
  for(let i=0;i<8;i++) song.measures[i].voxes[0]=JSON.parse(JSON.stringify(A[i%4]));
  blurSel=true; render(); return true; })()`;

/* 屏幕几何：k＝屏幕 CSS px / 谱面单位；数字＝页头之后第一个 1–7 单字 text */
const GEO = `(()=>{ const sv=document.getElementById('score'), vb=sv.viewBox.baseVal, R=sv.getBoundingClientRect(), k=R.width/vb.width;
  const P=document.getElementById('paper'), pr=P.getBoundingClientRect(), W=document.getElementById('score-wrap'), wr=W.getBoundingClientRect();
  const ts=[...sv.querySelectorAll('text')];
  const title=ts.find(e=>e.getAttribute('font-weight')==='800'), key=ts.find(e=>/^1=/.test(e.textContent)),
    meter=ts.filter(e=>e.textContent==='4' && e.getAttribute('font-family')==='var(--font-num)' && +e.getAttribute('font-size')<14),
    tempo=ts.find(e=>/=90$/.test(e.textContent)), cred=ts.filter(e=>/^(作词|作曲|制谱)：/.test(e.textContent));
  const hb=Math.max(...[title,key,tempo,...cred].filter(Boolean).map(e=>{ const b=e.getBBox(); return b.y+b.height; }));
  const dig=ts.find(e=>/^[1-7]$/.test(e.textContent) && e.getBBox().y>hb+4);
  const fs=e=>e? +e.getAttribute('font-size') : null;
  let barR=0; sv.querySelectorAll('line').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.height>10 && q.width<4 && q.right>barR) barR=q.right; });
  const fly=document.getElementById('left-flyout');
  const sys=layoutSystems().map(s=>s.measures.map(m=>m.mi).join(',')).join('|');
  return { k:+k.toFixed(4), vz:viewZoom, svgW:+sv.getAttribute('width'), PAGE_W, vb:sv.getAttribute('viewBox'), sys, pages:PV_GEO.n,
    digFs:fs(dig), dig:dig? +(fs(dig)*k).toFixed(2) : 0, dpr:devicePixelRatio,
    hd:{title:fs(title), key:fs(key), meter:meter.map(fs), tempo:fs(tempo), cred:cred.map(fs)},
    paperL:+pr.left.toFixed(1), paperR:+pr.right.toFixed(1), paperW:P.clientWidth, svgL:+R.left.toFixed(1), svgR:+R.right.toFixed(1),
    wrapL:wr.left, wrapR:wr.right, barR:+barR.toFixed(1), clipped:Math.max(0, Math.round(barR-pr.right)),
    flyHidden:fly.classList.contains('hidden'), flyPos:getComputedStyle(fly).position,
    fixwide:document.body.classList.contains('fixwide'), tight:document.body.classList.contains('paper-tight'),
    xs:P.classList.contains('paper-xs'), maxW:getComputedStyle(P).maxWidth, docW:document.documentElement.scrollWidth, vw:innerWidth }; })()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (w, h, dpr, mob) => {
    const ctx = await b.newContext(mob ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: dpr || 3 }
      : { viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1 });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(URL0); await pg.waitForTimeout(900);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    pg._ctx = ctx; return pg; };
  /* 真实 UI 走新建向导 */
  const wizard = async (pg) => {
    await pg.evaluate(() => showNewWizard()); await pg.waitForTimeout(150);
    await pg.click('.nf-modal [data-scene="vocal"]');   // v67.4 新建面板「歌谱 · 合唱」（原声乐意图卡）
    await pg.fill('#nw-title', '快乐的小星星');
    await pg.selectOption('#nw-key', 'B');
    await pg.fill('#nw-tempo', '90');
    await pg.click('#nw-create'); await pg.waitForTimeout(700);
    await pg.evaluate(NOTES); await pg.waitForTimeout(400);
    await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
  };
  const geo = pg => pg.evaluate(GEO);
  /* 左栏可见的图层页签（新版外壳的「小节」页签：同页签再点＝收起面板；不用「歌词」以免进出歌词图层触发重排） */
  const railTab = async () => 'mea';

  const VPS = [[1280, 720, 1], [1366, 768, 1], [1440, 900, 1], [1536, 864, 1], [1920, 1080, 1], [1536, 864, 1.25], [1280, 720, 1.5]];
  const TARGET = { 1280: 13.8, 1366: 15, 1440: 12, 1536: 13.6, 1920: 19 };
  const res = {}, html = {}, extra = {};
  for (const [w, h, d] of VPS) {
    const id = `${w}x${h}@${d}`;
    const pg = await open(w, h, d); await wizard(pg);
    const g = await geo(pg); res[id] = g;
    html[id] = await pg.evaluate(() => document.getElementById('score').innerHTML);
    if (d === 1 && (w === 1366 || w === 1920)) {
      /* T3 页头与 v66.8 原写法 */
      extra['hd' + w] = await pg.evaluate(`(()=>{ const ref=${REF668}; const h=document.getElementById('score').innerHTML;
        return {same:h.includes(ref.html), top:ref.top, sys0:(SYS_GEO[0]||{}).y0}; })()`).catch(e => ({ err: e.message }));
      /* T5 手动缩放：＋＋ − − ，再放大到放不下滚到底，点百分比回适配 */
      const z = [g.svgW];
      for (let i = 0; i < 2; i++) { await pg.click('#z-in'); await pg.waitForTimeout(200); z.push((await geo(pg)).svgW); }
      const zx = await pg.evaluate(() => { const P = document.getElementById('paper'); P.scrollLeft = P.scrollWidth; return { xs: P.classList.contains('paper-xs'), ov: getComputedStyle(P).overflowX, sw: P.scrollWidth, cw: P.clientWidth }; });
      await pg.waitForTimeout(150); const gz = await geo(pg);
      for (let i = 0; i < 2; i++) { await pg.click('#z-out'); await pg.waitForTimeout(200); z.push((await geo(pg)).svgW); }
      await pg.click('#z-out'); await pg.waitForTimeout(200); z.push((await geo(pg)).svgW);
      await pg.click('#zoom-lbl'); await pg.waitForTimeout(250); const g1 = await geo(pg);
      extra['zoom' + w] = { z, zx, barR: gz.barR, paperR: gz.paperR, back: { vz: g1.vz, svgW: g1.svgW, xs: g1.xs } };
    }
    if (d === 1 && (w === 1440 || w === 1536)) {
      /* T4 收起左栏当前页签 → 自动放大；再点打开 → 回停靠 */
      const t = await railTab();
      await pg.click(`.ltab[data-t="${t}"]`); await pg.waitForTimeout(500); const gc = await geo(pg);
      if (!gc.flyHidden) { await pg.click(`.ltab[data-t="${t}"]`); await pg.waitForTimeout(500); }
      const gc2 = gc.flyHidden ? gc : await geo(pg);
      await pg.click(`.ltab[data-t="${t}"]`); await pg.waitForTimeout(500); const go = await geo(pg);
      extra['fly' + w] = { closed: { hidden: gc2.flyHidden, dig: gc2.dig, svgW: gc2.svgW, clipped: gc2.clipped }, reopened: { hidden: go.flyHidden, pos: go.flyPos, dig: go.dig, svgW: go.svgW, clipped: go.clipped } };
    }
    if (d === 1 && w === 1920) {
      /* T6 排版浮层点预设 */
      await pg.click('#b-layout'); await pg.waitForTimeout(200);
      await pg.click('#lp-preset button[data-preset="standard"]'); await pg.waitForTimeout(300);
      await pg.click('#lp-done').catch(() => {}); await pg.waitForTimeout(200);
      const gl = await geo(pg);
      extra.lay = { vz: gl.vz, svgW: gl.svgW, before: g.svgW, xs: gl.xs, stored: await pg.evaluate(() => localStorage.getItem('musetab-zoom')) };
    }
    await pg._ctx.close();
  }

  /* T1 版面与窗口无关 */
  { const ids = Object.keys(res), r0 = res[ids[0]], h0 = html[ids[0]];
    const bad = ids.filter(id => { const g = res[id]; return g.PAGE_W !== 1060 || g.sys !== r0.sys || g.pages !== r0.pages || g.vb !== r0.vb || html[id] !== h0; });
    T(bad.length === 0 && r0.PAGE_W === 1060, 'T1 向导建谱固定版宽：7 种桌面视口 / DPR 下 PAGE_W=1060、断行页数与 #score 内容逐字节相同',
      bad.length ? 'diff@' + bad.join(',') : `sys=${r0.sys} pages=${r0.pages} vb=${r0.vb} len=${h0.length}`); }

  /* T2 字号目标 + 1920 铺满 + DPR 一致 */
  { const bad = [];
    for (const [w, h, d] of VPS) { const g = res[`${w}x${h}@${d}`];
      if (!(g.dig >= TARGET[w])) bad.push(`${w}x${h}@${d} 数字 ${g.dig}px < ${TARGET[w]}`);
      if (!g.fixwide || g.maxW !== 'none') bad.push(`${w}@${d} 未解除 900 上限(fixwide=${g.fixwide} max-width=${g.maxW})`);
      if (g.clipped > 0) bad.push(`${w}@${d} 末小节线被裁 ${g.clipped}px`); }
    const g19 = res['1920x1080@1'], gapL = g19.svgL - g19.wrapL, gapR = g19.wrapR - g19.svgR;
    if (!(gapL <= 30 && gapR <= 30)) bad.push(`1920 两侧空白 ${gapL.toFixed(0)}/${gapR.toFixed(0)}px`);
    for (const [w, h] of [[1536, 864], [1280, 720]]) { const a = res[`${w}x${h}@1`], c = res[`${w}x${h}@${w === 1536 ? 1.25 : 1.5}`];
      if (a.dig !== c.dig || a.svgW !== c.svgW) bad.push(`${w} DPR 不一致 ${a.dig}/${c.dig}`); }
    T(bad.length === 0, 'T2 简谱数字屏幕字号：1366≥15 / 1920≥19 达标、1920 铺满、DPR 无关；1280 / 1440 / 1536 左栏停靠不低于 v67.1（13.8 / 12 / 13.6，默认放大待拍板）',
      bad.join(' | ') || VPS.map(([w, h, d]) => { const g = res[`${w}x${h}@${d}`]; return `${w}@${d}:${g.dig}px(设备${(g.dig * d).toFixed(1)})k${g.k}`; }).join(' ')); }

  /* T3 页头 */
  { const bad = [];
    for (const id of Object.keys(res)) { const x = res[id].hd;
      if (x.title !== 28 || x.key !== 16 || x.tempo !== 12.5 || x.meter.join() !== '11,11' || x.cred.join() !== '12.5,12.5,12.5') bad.push(id + ' ' + JSON.stringify(x)); }
    if (!REF668) bad.push('未取到 tv_header.js 的 REF668');
    for (const w of [1366, 1920]) { const x = extra['hd' + w]; if (!x || x.err || !x.same || x.top !== x.sys0) bad.push(w + ' 页头≠v66.8 ' + JSON.stringify(x)); }
    T(bad.length === 0, 'T3 页头放得下时走原写法（字号 28/16/11/12.5/12.5，SVG 与 v66.8 原写法一致、首行起点一致）', bad.join(' | ') || 'ok'); }

  /* T4 面板收起自动放大 */
  { const a = extra.fly1440, c = extra.fly1536, d0 = res['1440x900@1'], d1 = res['1536x864@1'];
    const ok = a && c && a.closed.hidden && a.closed.dig >= 16 && c.closed.hidden && c.closed.dig >= 17.5
      && !a.reopened.hidden && !c.reopened.hidden && a.reopened.svgW === d0.svgW && c.reopened.svgW === d1.svgW
      && a.closed.clipped === 0 && c.closed.clipped === 0 && a.reopened.clipped === 0 && c.reopened.clipped === 0;
    T(ok, 'T4 左栏收起 → 谱面自动放大（1440≥16px / 1536≥17.5px），再打开回停靠尺寸、不裁', JSON.stringify({ 1440: a, 1536: c })); }

  /* T5 手动缩放 */
  { const bad = [];
    for (const w of [1366, 1920]) { const x = extra['zoom' + w]; if (!x) { bad.push(w + ' 无数据'); continue; }
      const z = x.z, rr = (i, j) => z[j] / z[i];
      if (!(Math.abs(rr(0, 1) - 1.1) < 0.012 && Math.abs(rr(1, 2) - 1.2 / 1.1) < 0.012)) bad.push(`${w} 放大档 ${z.slice(0, 3)}`);
      if (!(z[3] === z[1] && z[4] === z[0] && Math.abs(rr(0, 5) - 0.9) < 0.012)) bad.push(`${w} 缩小档 ${z.slice(3)}`);
      if (!(x.zx.xs && x.zx.ov === 'auto' && x.zx.sw > x.zx.cw && x.barR <= x.paperR + 1)) bad.push(`${w} 横滚兜底 ${JSON.stringify(x.zx)} barR ${x.barR}/${x.paperR}`);
      if (!(x.back.vz === 1 && x.back.svgW === z[0] && !x.back.xs)) bad.push(`${w} 点百分比未回适配 ${JSON.stringify(x.back)}`); }
    T(bad.length === 0, 'T5 手动缩放无死区（每档 ±10% 生效）、放不下横滚到底末小节线可见、点百分比回适配', bad.join(' | ') || JSON.stringify({ 1366: extra.zoom1366.z, 1920: extra.zoom1920.z })); }

  /* T6 排版浮层 */
  { const x = extra.lay;
    T(x && x.vz === 1 && x.svgW === x.before && !x.xs && (x.stored === null || +x.stored === 1),
      'T6 「排版」点预设后缩放仍 100%、显示＝适配（不二次放大、不把缩放写成 85%）', JSON.stringify(x)); }

  /* T7 不受影响 */
  { const bad = [];
    /* 存量自适应谱 @1920 */
    let pg = await open(1920, 1080);
    let r = await pg.evaluate(`(()=>{ hideStartPad(); loadSong(PRESETS[0].make()); song.layout=Object.assign({}, song.layout||{}); delete song.layout.fixed; render(); return ${GEO}; })()`);
    if (r.fixwide || r.paperW > 900 || r.k !== 1 || r.PAGE_W !== r.paperW - 30) bad.push('存量谱 ' + JSON.stringify({ fw: r.fixwide, pw: r.paperW, k: r.k, PW: r.PAGE_W }));
    /* 观看页 @1920（固定版宽谱） */
    r = await pg.evaluate(`(()=>{ const s=PRESETS[0].make(); s.layout=Object.assign({}, s.layout||{}, {fixed:true}); enterShareViewer({song:s}); render();
      const P=document.getElementById('paper'); return {fw:document.body.classList.contains('fixwide'), viewer:document.body.classList.contains('viewer'), pw:P.clientWidth,
        k:+(document.getElementById('score').getBoundingClientRect().width/document.getElementById('score').viewBox.baseVal.width).toFixed(4)}; })()`).catch(e => ({ err: e.message }));
    if (r.err || r.fw || !r.viewer || r.k > 1.0001) bad.push('观看页 ' + JSON.stringify(r));
    await pg._ctx.close();
    /* 手机 390（v67.4 拍板 1：手机先不开放新建——同一份面板建谱计划在手机上落谱，验窄屏重排口径不变） */
    pg = await open(390, 844, 3, true);
    await pg.evaluate(() => { const st = NWP.fresh({ scene: 'vocal', clean: true }); st.v.title = '快乐的小星星'; st.v.key = 'B'; realCreate(NWP.planOf(st), ''); });
    await pg.waitForTimeout(700); await pg.evaluate(NOTES); await pg.waitForTimeout(400);
    r = await geo(pg);
    if (r.fixwide || r.PAGE_W >= 1060 || r.svgW > 390 || r.docW > r.vw) bad.push('手机 ' + JSON.stringify({ fw: r.fixwide, PW: r.PAGE_W, svgW: r.svgW, docW: r.docW }));
    await pg._ctx.close();
    /* 1366 D7：左栏自动收起，再开改浮层、谱面不被挤窄 */
    pg = await open(1366, 768); await wizard(pg);
    const g0 = await geo(pg); const t = await railTab();
    await pg.click(`.ltab[data-t="${t}"]`); await pg.waitForTimeout(500);
    let g1 = await geo(pg); if (g1.flyHidden) { await pg.click(`.ltab[data-t="${t}"]`); await pg.waitForTimeout(500); g1 = await geo(pg); }
    if (!(g0.flyHidden && !g0.tight && !g1.flyHidden && g1.tight && g1.flyPos === 'fixed' && g1.svgW >= g0.svgW - 2 && g1.clipped === 0))
      bad.push('D7 ' + JSON.stringify({ g0: { h: g0.flyHidden, t: g0.tight, w: g0.svgW }, g1: { h: g1.flyHidden, t: g1.tight, pos: g1.flyPos, w: g1.svgW, c: g1.clipped } }));
    /* 打印：按 1060、断行同屏，打印期间不挂 fixwide */
    r = await pg.evaluate(() => { const sv = document.getElementById('score'), scr = layoutSystems().map(s => s.measures.map(m => m.mi).join(',')).join('|'), w0 = +sv.getAttribute('width');
      window.dispatchEvent(new Event('beforeprint')); const during = { PW: PAGE_W, sys: layoutSystems().map(s => s.measures.map(m => m.mi).join(',')).join('|'), fw: document.body.classList.contains('fixwide') };
      window.dispatchEvent(new Event('afterprint')); return { scr, during, w0 }; });
    /* 打印期间 D7 浮层类按非编辑态撤下、afterprint 首帧按停靠宽排一帧（v67.1 同样如此），#paper 的 ResizeObserver 下一帧复原——等一帧再量 */
    await pg.waitForTimeout(400); r.w1 = await pg.evaluate(() => +document.getElementById('score').getAttribute('width'));
    if (!(r.during.PW === 1060 && r.during.sys === r.scr && !r.during.fw && r.w1 === r.w0)) bad.push('打印 ' + JSON.stringify(r));
    await pg._ctx.close();
    T(bad.length === 0, 'T7 不受影响：存量自适应谱 / 观看页 / 手机 390 / 1366 D7 收起+浮层 / 打印按 1060', bad.join(' | ') || 'ok'); }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
/* 突变实证（2026-10，MUSETAB_URL=v67.1 9650254 原版）：PASS 3/7——
   T2 红（1280 未解除 900 上限；1366 数字 14.37px<15；1920 数字 14.37px<19、两侧空白 194/194px）
   T4 红（1440 / 1536 收起左栏后仍 896px 宽、数字 14.37px——900 上限）
   T5 红（1366 / 1920 ＋＋−− 谱面宽恒 896：缩放死区；120% 仍无横滚）
   T6 红（排版浮层点预设后 viewZoom=0.85、写入 musetab-zoom=0.85）
   T1 / T3 / T7 绿（版面与窗口无关、页头原写法、存量/观看/手机/D7/打印——本修复不应改动的部分） */
