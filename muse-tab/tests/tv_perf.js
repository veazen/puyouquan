'use strict';
/* v68.4 性能（PROJECT.md §9.0 P2）。file:// 直载，两种外壳：默认新外壳 flow 与 ?shell=classic。
   ── 开机段（P2-a，A 轨）── 计时一律用「同一次运行里的旧外壳」作相对口径（CI 机器快慢不一，只比倍数），绝对数打印出来备查。
     「启动台可见」探针不强制布局（只读类名 / 属性：解析完成、#start-pad 没有 .hidden、启动遮罩 opacity 0），记 rAF 时刻（页面时钟，0＝导航开始）。
   PA1 开机首画延后（结构）：启动台出现的那一帧，左栏音轨树 #flw-tlist / 记号格 #flw-pgrid / 悬浮条 #flw-sb-bar 都还没画（v68.3 在启动台出现前就画好了）；
       启动台出现后（≤1.5 秒）左栏两块补画好、悬浮条仍不画（启动台下它不显示）；台下左栏 section 仍 visibility:hidden（SH-5 不变）；
       收尾 PERF-1：补画不靠空闲回调——requestIdleCallback 永远不来（桩）也在启动台出现后 ≤400ms 画好（此前排在空闲回调里，人一看到台就点时三块全挤进那一下按下）；
       无交互时启动台出现后两帧内 AudioContext 已建好、音色库仍未建（PA1g：第一次按下里移动端解锁只 resume，不现建）
   PA2 离台一帧内就位：回访（3 个窗口）启动台一出现就真实鼠标点「继续上次编辑」（空闲补画多半还没跑）——点击那一刻同步就有音轨树 / 记号格 / 悬浮条；
       下一帧（rAF → setTimeout0）悬浮条有宽、与谱纸对齐（再 fit 一次几何不变）、页签量过宽、行 2 不溢出；左栏 / 悬浮条的 DOM 与「立刻整画一遍」逐字节相同（不闪空、不错位）；
       等空闲补画跑完再点同样成立；启动台上第一次 pointerdown 就把左栏补好
   PA3 不出启动台的启动（?wxlogin=ok 回跳直达谱面）：DOMContentLoaded 收尾当场补画，第一帧左栏与悬浮条已有内容
   PA4 相对计时（各 N 次交替、取中位）：首访 + 回访到启动台可见合计 flow ≤ classic × 1.15 + 80ms，单项 ≤ classic × 1.3 + 40ms；「继续上次编辑」点击到下一帧 flow ≤ classic × 1.25 + 30ms
       （v68.4 收尾 PERF-5：倍数项让慢机上差值随之放大）；收尾 PERF-1：启动台一出现就真实鼠标点「继续」（按下的 timeStamp → click 之后那一帧）flow ≤ classic × 1.25 + 30ms
   PA5 共享路径：旧外壳开机不挂 flow（FLOW.lzPending 空、无 #flw-left）；两外壳开机后音色预解码照样完成（启动台出现后的空闲时刻，或第一次交互之后的下一帧）；
       收尾 PERF-1 / UX-2：第一次 pointerdown 当场不解码（按下与松开之间是点击的关键路径），这一次点击处理完、再隔一帧之后才开始（rAF → rAF → setTimeout）；按键同理；
       状态栏小节格宽度缓存（#mx-prog）：1440 → 1180 → 1440 来回改窗宽、跨过密集标尺阈值后，小节格与「现量 clientWidth 重画」逐字节相同（两外壳）
   PA6 数据红线：开机、空闲补画、离台全程 song 与 musetab-* 键逐字节不变（离台前后各取一次）
   ── 每笔段（P2-b）见 tv_perf2.js（两份分开跑，run_all CORE 各一条）──
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=PA1,PA4 只跑部分 · N＝PA4 每组次数（缺省 7） */
const { chromium } = require('playwright');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const CLASSIC = withQ(URL0, 'shell=classic');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const NRUN = Math.max(3, +(process.env.N || 7));
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const OUT = {};
const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (!ok && d != null ? ': ' + String(d).slice(0, 1500) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push(s); };
const med = a => { const s = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return NaN; const at = p => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }; return +at(0.5).toFixed(1); };
const iqr = a => { const s = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return NaN; const at = p => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }; return +(at(0.75) - at(0.25)).toFixed(1); };

/* 开机探针（addInitScript）：启动台可见那一帧记下时刻与三块的子节点数；不强制布局 */
const PROBE = `(()=>{ const T=window.__B={};
  const cnt=id=>{ const e=document.getElementById(id); return e? e.childElementCount : -1; };
  document.addEventListener('DOMContentLoaded', ()=>{ try{ T.banksAtDcl=Object.keys(sfBanks).length; }catch(_){ T.banksAtDcl=-1; } });
  const tick=()=>{ try{
    const sp=document.getElementById('start-pad'), v=document.getElementById('boot-veil');
    const on=document.readyState!=='loading' && sp && !sp.classList.contains('hidden') && document.getElementById('spd-cards') && (!v || v.style.opacity==='0');
    if(on && T.pad==null){ T.pad=performance.now(); T.atPad={trk:cnt('flw-tlist'), pal:cnt('flw-pgrid'), sb:cnt('flw-sb-bar')}; setTimeout(()=>{ T.padP=performance.now(); },0);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ try{ T.ctx2=!!audio.ctx; }catch(_){ T.ctx2=null; } }));
      /* __PDPAD：启动台出现的那一帧（rAF 里、补画排程之前）当场派发一次 pointerdown——「人一看到台就按下」的最早时刻 */
      if(window.__PDPAD){ const lp=()=>(FLOW.lzPending? FLOW.lzPending().sort().join(',') : '?'); T.pdp={p0:lp(), t0:cnt('flw-tlist'), g0:cnt('flw-pgrid')};
        document.getElementById('start-pad').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
        Object.assign(T.pdp, {p1:lp(), trk:cnt('flw-tlist'), pal:cnt('flw-pgrid'), sb:cnt('flw-sb-bar'), banks:Object.keys(sfBanks).length, ctx:!!audio.ctx}); } }
    if(document.readyState!=='loading' && T.first==null){ T.first=performance.now(); T.atFirst={trk:cnt('flw-tlist'), pal:cnt('flw-pgrid'), sb:cnt('flw-sb-bar'), sp:!!(sp && !sp.classList.contains('hidden'))}; }
    if(T.pad!=null && T.idle==null && cnt('flw-tlist')>0 && cnt('flw-pgrid')>0) T.idle=performance.now();
  }catch(_){}
  if(performance.now()<6000) requestAnimationFrame(tick); };
  requestAnimationFrame(tick); })();`;
/* 回访存量：3 个「自己的谱」窗口（同 v68.2 / v68.4 剖析口径），当前窗口是最后一个 */
const SEED = () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
  const pk = (pfx, t) => { const p = PRESETS.find(x => x.name.indexOf(pfx) === 0); const s = p.make(); s.title = t; return s; };
  loadSong(pk('送别', '送别·我的练习')); addDoc(pk('两只老虎', '两只老虎·我的练习')); addDoc(pk('欢乐颂（钢琴独奏）', '欢乐颂·我的练习')); persistNow(); };
const waitPad = async pg => { for (let i = 0; i < 200; i++) { const p = await pg.evaluate(() => window.__B && window.__B.pad).catch(() => null); if (p != null) return p; await pg.waitForTimeout(15); } return null; };
const frame = pg => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const newPage = async (url, o) => { o = o || {}; const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); const pg = await ctx.newPage();
    const pe = []; pg.on('pageerror', e => pe.push(e.message)); pg.on('console', m => { if (m.type() === 'error') pe.push('console: ' + m.text()); });
    await pg.addInitScript(PROBE); if (url) await pg.goto(url, { waitUntil: 'load' }); return { ctx, pg, pe }; };

  const SAFE = async (id, fn) => { try { await fn(); } catch (e) { T(id, false, id + ' 运行异常', e && e.message); } };
  /* ================= PA1 开机首画延后 ================= */
  if (want('PA1')) await SAFE('PA1', async () => {
    const { ctx, pg, pe } = await newPage(URL0);
    await pg.waitForTimeout(1600);
    const r = await pg.evaluate(() => { const B = window.__B, vis = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).visibility : null; };
      return { atPad: B.atPad, padAt: Math.round(B.pad), idleAt: B.idle && Math.round(B.idle), sp: startPadOn(), flow: document.body.classList.contains('flow'),
        trk: document.getElementById('flw-tlist').childElementCount, pal: document.getElementById('flw-pgrid').childElementCount, sb: document.getElementById('flw-sb-bar').childElementCount,
        rows: document.querySelectorAll('#flw-tlist .flw-trow').length, cells: document.querySelectorAll('#flw-pgrid .flw-sg').length, secVis: [vis('flw-trk'), vis('flw-pal')],
        pend: (FLOW.lzPending ? FLOW.lzPending() : ['?']).sort().join(',') }; });
    T('PA1', r.flow && r.sp && r.atPad && r.atPad.trk === 0 && r.atPad.pal === 0 && r.atPad.sb === 0,
      'PA1a 启动台出现的那一帧：音轨树 / 记号格 / 悬浮条都还没画（开机不再先画台下那份谱的左栏）', J(r));
    T('PA1', r.sp && r.rows > 0 && r.cells > 0 && r.sb === 0 && r.idleAt != null && r.idleAt - r.padAt <= 1500 && r.pend === 'sbar',
      'PA1b 启动台在的空闲时刻（≤1.5 秒）左栏两块补画好；悬浮条仍待画（台下不显示，离台再画）', J(r));
    T('PA1', r.secVis[0] === 'hidden' && r.secVis[1] === 'hidden', 'PA1c 台下左栏 section 仍 visibility:hidden（验收 SH-5 不变）', J(r.secVis));
    T('PA1', !pe.length, 'PA1d 开机无页面报错', J(pe));
    await ctx.close();
    /* 收尾 PERF-1：空闲回调永远不来（桩）——补画照样在启动台出现后几帧内完成（不靠空闲期） */
    { const P = await newPage(null); await P.pg.addInitScript(() => { window.requestIdleCallback = () => 0; });
      await P.pg.goto(URL0, { waitUntil: 'load' }); await waitPad(P.pg); await P.pg.waitForTimeout(700);
      const r2 = await P.pg.evaluate(() => ({ padAt: Math.round(window.__B.pad), idleAt: window.__B.idle && Math.round(window.__B.idle), pend: (FLOW.lzPending ? FLOW.lzPending() : ['?']).sort().join(','), sp: startPadOn(),
        ctx2: window.__B.ctx2, banks: Object.keys(sfBanks).length }));
      T('PA1', r2.sp && r2.idleAt != null && r2.idleAt - r2.padAt <= 400 && r2.pend === 'sbar', 'PA1e 空闲回调永远不来（桩）：左栏两块仍在启动台出现后 ≤400ms 补画好（启动台首帧之后当即逐块画，不排空闲）', J(r2));
      /* 收尾 PERF-1 ③：没有任何交互，启动台出现后两帧内 AudioContext 已建好（只建、不解码）——之后第一次按下里移动端解锁（tryUnlock）只 resume，不在点击的关键路径上现建（约 35ms） */
      T('PA1', r2.ctx2 === true && r2.banks === 0, 'PA1g 无交互：启动台出现后两帧内 AudioContext 已建好、音色库仍未建（预解码等空闲 / 第一次交互之后）', J(r2));
      T('PA1', !P.pe.length, 'PA1f 无页面报错', J(P.pe));
      await P.ctx.close(); }
  });

  /* ================= PA2 离台一帧内就位 ================= */
  if (want('PA2')) await SAFE('PA2', async () => {
    const { ctx, pg, pe } = await newPage(URL0);
    await pg.waitForTimeout(1200);
    await pg.evaluate(SEED);
    const S0 = await pg.evaluate(() => ({ song: localStorage.getItem('musetab-song'), docs: localStorage.getItem('musetab-docs') }));
    const leave = async (tag, how) => {
      await pg.reload({ waitUntil: 'domcontentloaded' });
      const padAt = await waitPad(pg);
      if (how === 'idle') await pg.waitForTimeout(1500);
      const before = await pg.evaluate(() => ({ trk: document.getElementById('flw-tlist').childElementCount, pal: document.getElementById('flw-pgrid').childElementCount, sb: document.getElementById('flw-sb-bar').childElementCount, pend: FLOW.lzPending ? FLOW.lzPending().sort().join(',') : '?' }));
      /* 同步那一刻：这次 click 的全部监听跑完（window 冒泡阶段、最后注册的那一个）、还在同一任务里、下一帧之前 */
      await pg.evaluate(() => { window.__C = null; window.__F0 = null;
        window.addEventListener('click', () => { window.__C = { trk: document.getElementById('flw-tlist').childElementCount, pal: document.getElementById('flw-pgrid').childElementCount,
          sb: document.getElementById('flw-sb-bar').childElementCount, sp: startPadOn(), pend: FLOW.lzPending ? FLOW.lzPending().join(',') : '?' };
          /* 收尾 C4：这一下点击之后第一帧的 rAF（排在补排的量宽 rAF 之后、绘制之前）量悬浮条 / 页签几何——应已是终值 */
          requestAnimationFrame(() => { const r = document.getElementById('flw-sbar').getBoundingClientRect();
            window.__F0 = { sb: [Math.round(r.left), Math.round(r.width)], tabs: [...document.querySelectorAll('#doc-tabs .dtab')].map(t => Math.round(t.getBoundingClientRect().width)).join(',') }; }); }, { once: true }); });
      const rc = await pg.evaluate(() => { const r = document.getElementById('spd-cont').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await pg.mouse.click(rc[0], rc[1]);
      await frame(pg);
      const SNAP = () => { const R = e => { const r = document.getElementById(e).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
        return { thd: document.getElementById('flw-thd').innerHTML, tl: document.getElementById('flw-tlist').innerHTML, pg: document.getElementById('flw-pgrid').innerHTML, sb: document.getElementById('flw-sb-bar').innerHTML,
          sbR: R('flw-sbar'), leftR: R('flw-left'), paperR: R('paper'), tabs: [...document.querySelectorAll('#doc-tabs .dtab')].map(t => t.style.width).join(','), ebOff: [...document.querySelectorAll('#editbar .flw-off')].length }; };
      const after = await pg.evaluate(() => { const eb = document.getElementById('editbar'), sbm = FLOW.sbar.model();
        return { sp: startPadOn(), sbW: Math.round(document.getElementById('flw-sbar').getBoundingClientRect().width), sbTier: sbm.tier, sbShown: sbm.shown,
          tabsW: [...document.querySelectorAll('#doc-tabs .dtab')].map(t => t.style.width).join(','), ebOvf: eb.scrollWidth > eb.clientWidth + 1, curRow: !!document.querySelector('#flw-tlist .flw-trow.on'),
          focusLeft: !!(document.activeElement && document.getElementById('flw-left').contains(document.activeElement)), tabStop: document.querySelectorAll('#flw-pgrid [tabindex="0"]').length }; });
      const a = await pg.evaluate(SNAP);
      /* 「立刻整画一遍」作对照：同一份谱、同一选区，左栏 / 悬浮条整画、页签 / 行 2 / 悬浮条重新量宽，再过一帧——DOM 与几何应逐字节相同 */
      await pg.evaluate(() => { FLOW.tree.paint(true); FLOW.pal.on(); FLOW.sbar.sync(); FLOW.sbar.fit(); FLOW.r1.fit(); FLOW.r2.fit(); });
      await frame(pg);
      const b2 = await pg.evaluate(SNAP);
      after.same = J(a) === J(b2); after.diff = Object.keys(a).filter(k => J(a[k]) !== J(b2[k])).map(k => k + ':' + String(J(a[k])).slice(0, 120) + ' ≠ ' + String(J(b2[k])).slice(0, 120));
      await pg.waitForTimeout(1200);
      const fin = await pg.evaluate(() => { const r = document.getElementById('flw-sbar').getBoundingClientRect();
        return { f0: window.__F0, end: { sb: [Math.round(r.left), Math.round(r.width)], tabs: [...document.querySelectorAll('#doc-tabs .dtab')].map(t => Math.round(t.getBoundingClientRect().width)).join(',') } }; });
      return { padAt, before, sync: await pg.evaluate(() => window.__C), after, fin };
    };
    const quick = await leave('quick', 'quick');
    T('PA2', quick.sync && quick.sync.trk > 0 && quick.sync.pal > 0 && quick.sync.sb > 0 && !quick.sync.sp && quick.sync.pend === '',
      'PA2a 启动台一出现就点「继续上次编辑」：点击处理完的那一刻音轨树 / 记号格 / 悬浮条都已画好（不等下一帧、不闪空）', J({ before: quick.before, sync: quick.sync }));
    T('PA2', quick.after.sbW > 0 && quick.after.sbShown && quick.after.sbTier === 'full' && /\d+px/.test(quick.after.tabsW) && !quick.after.ebOvf && quick.after.curRow,
      'PA2b 下一帧：悬浮条有宽且全档、页签量过宽、行 2 不溢出、当前轨行在', J(quick.after));
    T('PA2', quick.after.same, 'PA2c 下一帧的左栏 / 悬浮条 DOM 与几何 ＝「立刻整画 + 量宽」一遍（逐字节；不错位）', J(quick.after.diff));
    T('PA2', !quick.after.focusLeft && quick.after.tabStop === 1, 'PA2d 焦点不被补画抢进左栏；记号格仍只占一个 Tab 站', J(quick.after));
    T('PA2', quick.fin.f0 && J(quick.fin.f0) === J(quick.fin.end), 'PA2h 收尾 C4：离台后第一帧绘制前（rAF 里，排在量宽补排之后）悬浮条位置 / 宽与页签宽已是终值', J(quick.fin));
    const idle = await leave('idle', 'idle');
    T('PA2', idle.before.trk > 0 && idle.before.pal > 0 && idle.before.sb === 0 && idle.before.pend === 'sbar' && idle.sync && idle.sync.sb > 0 && idle.after.same && idle.after.sbW > 0,
      'PA2e 等空闲补画跑完再点：左栏早已就绪，离台只补悬浮条，下一帧同样逐字节一致', J({ before: idle.before, sync: idle.sync, after: idle.after.diff }));
    /* 启动台上第一次 pointerdown 当场补左栏：另开一页，在启动台出现的那一帧（补画排程之前）就按下（探针 __PDPAD），只剩 pointerdown 这一条路 */
    { const P2 = await newPage(null); await P2.pg.addInitScript(() => { window.__PDPAD = true; });
      await P2.pg.goto(URL0, { waitUntil: 'load' }); await waitPad(P2.pg); await P2.pg.waitForTimeout(300);
      const pd = await P2.pg.evaluate(() => window.__B.pdp || {});
      /* 按下本身可能引起一次 render（台下那份谱），左栏又记上「待同步」——那是签名比对的轻量补画；这里看按下那一刻左栏已有内容、悬浮条仍不画 */
      T('PA2', /pal/.test(pd.p0) && /tree/.test(pd.p0) && pd.t0 === 0 && pd.g0 === 0 && pd.trk > 0 && pd.pal > 0 && pd.sb === 0,
        'PA2f 启动台上第一次 pointerdown（多半要点「继续 / 新建」了）当场补好左栏（逐块补画之前）', J(pd));
      T('PA2', pd.banks === 0, 'PA2f3 收尾 PERF-1：那一下按下里不建音色库、不派发解码（按下与松开之间是点击的关键路径）', J(pd));
      T('PA2', !P2.pe.length, 'PA2f2 无页面报错', J(P2.pe));
      await P2.ctx.close(); }
    const S1 = await pg.evaluate(() => ({ song: localStorage.getItem('musetab-song'), docs: localStorage.getItem('musetab-docs') }));
    T('PA6', S0.song === S1.song && S0.docs === S1.docs, 'PA6a 开机 / 空闲补画 / 两次离台：本机存的当前谱与窗口表逐字节不变', J({ a: (S0.song || '').length, b: (S1.song || '').length }));
    /* 收尾 C3：页签重画（renderTabs 把量过的宽写进 style）与 fit() 经 style.width 写出的串同一写法（CSSOM 序列化「width: Npx;」）——重画前后同一页签的 style 属性逐字节相同 */
    { const r = await pg.evaluate(() => { const st = () => [...document.querySelectorAll('#doc-tabs .dtab')].map(t => t.getAttribute('style'));
        const a = st(); renderDocTabs(); const z = st();
        const canon = z.map(s => { if (s == null) return null; const d = document.createElement('div'); d.setAttribute('style', s); d.style.width = d.style.width; return d.getAttribute('style'); });
        return { a, z, canon }; });
      T('PA2', J(r.a) === J(r.z) && J(r.z) === J(r.canon) && r.z.some(s => s && /px/.test(s)), 'PA2i 收尾 C3：页签重画后 style 串与量宽写入同一写法（CSSOM 序列化），重画前后逐字节相同', J(r)); }
    T('PA2', !pe.length, 'PA2g 全程无页面报错', J(pe));
    await ctx.close();
  });

  /* ================= PA3 不出启动台的启动 ================= */
  if (want('PA3')) await SAFE('PA3', async () => {
    const { ctx, pg, pe } = await newPage(withQ(URL0, 'wxlogin=ok'));
    await pg.waitForTimeout(800);
    const r = await pg.evaluate(() => ({ atFirst: window.__B.atFirst, sp: startPadOn(), pend: FLOW.lzPending ? FLOW.lzPending().join(',') : '?', sbW: Math.round(document.getElementById('flw-sbar').getBoundingClientRect().width), rows: document.querySelectorAll('#flw-tlist .flw-trow').length }));
    T('PA3', r.atFirst && !r.atFirst.sp && r.atFirst.trk > 0 && r.atFirst.pal > 0 && r.atFirst.sb > 0 && r.pend === '' && r.sbW > 0 && r.rows > 0,
      'PA3 ?wxlogin=ok 直达谱面（不出启动台）：解析完成后的第一帧左栏与悬浮条已画好（DOMContentLoaded 收尾当场补画）', J(r));
    T('PA3', !pe.length, 'PA3b 无页面报错', J(pe));
    await ctx.close();
  });

  /* ================= PA4 相对计时 ================= */
  if (want('PA4')) await SAFE('PA4', async () => {
    const R = { flow: { first: [], revisit: [], cont: [], contQ: [] }, classic: { first: [], revisit: [], cont: [], contQ: [] } };
    /* v68.4 发版：相对计时在 CI / 高负载下有噪声（本机曾以 0.1ms 擦线）——第一轮任一项不达标就再测一轮、合并样本后判定（阈值不放宽） */
    const ROUND = async () => { for (let i = 0; i < NRUN; i++) for (const [k, url] of (i % 2 ? [['classic', CLASSIC], ['flow', URL0]] : [['flow', URL0], ['classic', CLASSIC]])) {
      const { ctx, pg } = await newPage(url);
      await waitPad(pg); await pg.waitForTimeout(1500);
      R[k].first.push(await pg.evaluate(() => window.__B.pad));
      await pg.evaluate(SEED);
      await pg.reload({ waitUntil: 'load' }); await waitPad(pg); await pg.waitForTimeout(1500);
      R[k].revisit.push(await pg.evaluate(() => window.__B.pad));
      R[k].cont.push(await pg.evaluate(() => new Promise(res => { const b = document.getElementById('spd-cont'); if (!b || !b.textContent) return res(null);
        const t0 = performance.now(); b.click(); requestAnimationFrame(() => setTimeout(() => res(performance.now() - t0), 0)); })));
      /* 收尾 PERF-1：启动台一出现就真实鼠标点「继续」——按下的 timeStamp → click 之后那一帧（rAF → setTimeout0）；按下里同步跑掉的工作也算在内 */
      await pg.reload({ waitUntil: 'domcontentloaded' }); await waitPad(pg);
      { const rc = await pg.evaluate(() => { const e = document.getElementById('spd-cont'); if (!e || !e.textContent) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
        if (rc) { await pg.evaluate(() => { window.__Q = null; window.addEventListener('pointerdown', e => { window.__Q = { pd: e.timeStamp }; }, { capture: true, once: true });
            window.addEventListener('click', () => { const q = window.__Q; if (q) requestAnimationFrame(() => setTimeout(() => { q.t = performance.now() - q.pd; }, 0)); }, { capture: true, once: true }); });
          await pg.mouse.click(rc[0], rc[1]);
          await pg.waitForFunction(() => window.__Q && window.__Q.t != null, null, { timeout: 30000 }).catch(() => {});
          R[k].contQ.push(await pg.evaluate(() => window.__Q && window.__Q.t)); } else R[k].contQ.push(null); }
      await ctx.close();
    } };
    const STAT = () => { const m = {}; for (const k in R) { m[k] = {}; for (const ph in R[k]) m[k][ph] = { med: med(R[k][ph]), iqr: iqr(R[k][ph]) }; } return m; };
    const OK = m => { const sF = m.flow.first.med + m.flow.revisit.med, sC = m.classic.first.med + m.classic.revisit.med;
      return sF <= sC * 1.15 + 80 && m.flow.first.med <= m.classic.first.med * 1.3 + 40 && m.flow.revisit.med <= m.classic.revisit.med * 1.3 + 40
        && m.flow.cont.med <= m.classic.cont.med * 1.25 + 30 && m.flow.contQ.med <= m.classic.contQ.med * 1.25 + 30; };
    await ROUND();
    if (!OK(STAT())) { NOTE('PA4', '   第一轮相对计时未全部达标，再测一轮合并样本后判定（' + J(STAT()) + '）'); await ROUND(); }
    const m = STAT();
    NOTE('PA4', '   绝对数（1440×900，各 ' + NRUN + ' 次交替，中位 / IQR，ms）：' + ['first', 'revisit', 'cont', 'contQ'].map(ph => ph + ' flow ' + m.flow[ph].med + '/' + m.flow[ph].iqr + ' · classic ' + m.classic[ph].med + '/' + m.classic[ph].iqr).join('；'));
    /* 主口径：首访 + 回访合计（单项方差大，合计更稳）≤ classic × 1.15 + 80ms；单项另设宽口径（× 1.3 + 40ms）只拦大幅回退。
       本机（另有多个并发浏览器的高负载下）flow / classic 回访比曾到 1.27，单项 × 1.15 + 40 会误红；结构性的「延后 / 离台就位」由 PA1–PA3 断言 */
    const sumF = m.flow.first.med + m.flow.revisit.med, sumC = m.classic.first.med + m.classic.revisit.med;
    T('PA4', sumF <= sumC * 1.15 + 80, 'PA4a 首访 + 回访（3 个窗口）到启动台可见合计：flow ≤ classic × 1.15 + 80ms', J({ sumF, sumC, m }));
    T('PA4', m.flow.first.med <= m.classic.first.med * 1.3 + 40 && m.flow.revisit.med <= m.classic.revisit.med * 1.3 + 40, 'PA4b 首访、回访单项：flow ≤ classic × 1.3 + 40ms（宽口径，拦大幅回退）', J(m));
    T('PA4', m.flow.cont.med <= m.classic.cont.med * 1.25 + 30, 'PA4c 「继续上次编辑」点击到下一帧：flow ≤ classic × 1.25 + 30ms（倍数项：慢机上差值随之放大，收尾 PERF-5）', J(m));
    T('PA4', R.flow.contQ.filter(x => x != null).length >= R.flow.contQ.length - 1 - (R.flow.contQ.length > NRUN ? 1 : 0) && m.flow.contQ.med <= m.classic.contQ.med * 1.25 + 30,
      'PA4d 启动台一出现就真实鼠标点「继续上次编辑」（按下 → click 之后那一帧）：flow ≤ classic × 1.25 + 30ms（收尾 PERF-1）', J({ flow: R.flow.contQ, classic: R.classic.contQ, m }));
  });

  /* ================= PA5 共享路径 ================= */
  if (want('PA5')) await SAFE('PA5', async () => {
    for (const [k, url] of [['flow', URL0], ['classic', CLASSIC]]) {
      const { ctx, pg, pe } = await newPage(url);
      const a = await pg.evaluate(() => ({ banks: window.__B.banksAtDcl }));
      await pg.waitForTimeout(2500);
      const r = await pg.evaluate(() => { const bs = Object.values(sfBanks); return { banks: bs.length, notes: bs.reduce((n, x) => n + Object.keys(x.notes || {}).length, 0), done: bs.reduce((n, x) => n + Object.keys(x.buf || {}).filter(q => q[0] !== 'p').length, 0), ctx: !!audio.ctx,
        mounted: !!document.getElementById('flw-left'), pend: FLOW.lzPending ? FLOW.lzPending().join(',') : '?', flow: document.body.classList.contains('flow') }; });
      T('PA5', a.banks === 0 && r.banks > 0 && r.ctx && r.done >= r.notes && r.notes > 0, 'PA5a ' + k + '：开机解析期（到 DOMContentLoaded）不建音色库 / 不解码；启动台出现后（首帧后 ' + 600 + 'ms 起的空闲时刻）内嵌音色全部预解码完（≤2.5 秒）', J({ a, r }));
      if (k === 'classic') T('PA5', !r.mounted && !r.flow && r.pend === '', 'PA5b 旧外壳开机不挂 flow、没有待画', J(r));
      T('PA5', !pe.length, 'PA5c ' + k + ' 无页面报错', J(pe));
      await ctx.close();
    }
    /* 第一次交互之后开始预解码：空闲永远轮不到（桩）——按下当场不解码，这一次点击（pointerup）处理完、下一帧画出之后开始；按键同理（两种外壳） */
    for (const [k, url] of [['flow', URL0], ['classic', CLASSIC]]) for (const how of ['pointer', 'key']) {
      const { ctx, pg } = await newPage(null); await pg.addInitScript(() => { window.requestIdleCallback = () => 0; });
      await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(300);
      const r = await pg.evaluate(how => { const n0 = Object.keys(sfBanks).length, t = document.getElementById('start-pad') || document.body;
        if (how === 'pointer') t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
        const n1 = Object.keys(sfBanks).length, c1 = !!audio.ctx;
        if (how === 'pointer') t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        const n2 = Object.keys(sfBanks).length;
        return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => setTimeout(() => res({ n0, n1, c1, n2, n3: Object.keys(sfBanks).length, ctx: !!audio.ctx }), 0), 0)))); }, how);
      T('PA5', r.n0 === 0 && r.n1 === 0 && r.n2 === 0 && r.n3 > 0 && r.ctx, 'PA5d ' + k + ' / ' + how + '：空闲之前的第一次' + (how === 'pointer' ? ' pointerdown 当场不建库（松开处理完' : '按键当场不建库（这一键处理完') + '、隔一帧之后才建库并开始预解码）', J(r));
      await ctx.close(); }
    /* #mx-prog 宽度缓存：改窗宽跨过密集标尺阈值（小节数 > 格宽 / 14）后与现量重画逐字节相同。小节数按外壳选（状态栏小节格 1440 宽时 flow 约 400、旧外壳约 800） */
    for (const [k, url, nM] of [['flow', URL0, 20], ['classic', CLASSIC, 30]]) {
      const { ctx, pg, pe } = await newPage(url);
      await pg.waitForTimeout(1000);
      await pg.evaluate(nM => { window.guardReplace = p => p(); hideStartPad(); const p = PRESETS.find(x => x.name.indexOf('送别') === 0); const s = p.make(); const base = s.measures.slice();
        while (s.measures.length < nM) s.measures.push(JSON.parse(JSON.stringify(base[s.measures.length % base.length]))); s.measures.length = nM; s.title = '送别' + nM; loadSong(s); }, nM);
      const rows = [];
      const check = () => pg.evaluate(() => { const box = document.getElementById('mx-prog'), h0 = box.innerHTML, d0 = box.classList.contains('dense'), w0 = box.clientWidth;
          if (typeof PROG_W === 'undefined') return { w: w0, dense: d0, same: false, err: '没有宽度缓存 PROG_W' };
          const keep = PROG_W; PROG_W = null; renderProgCells(); const h1 = box.innerHTML; PROG_W = keep; renderProgCells();
          return { w: w0, dense: d0, same: h0 === h1 }; });
      for (const w of [1440, 1180, 1000, 1440]) { await pg.setViewportSize({ width: w, height: 900 }); await pg.waitForTimeout(400); await frame(pg); rows.push(await check()); }
      /* 不经窗口 resize 的变宽（右栏 / 状态栏内容等让小节格变窄，只有 ResizeObserver 看得见）：下一帧前就按新宽重画 */
      for (const mw of ['120px', '']) { await pg.evaluate(mw => { document.getElementById('mx-prog').style.maxWidth = mw; }, mw); await frame(pg); await frame(pg); rows.push(Object.assign({ mw }, await check())); }
      T('PA5', rows.every(r => r.same) && rows.some(r => r.dense) && rows.some(r => !r.dense), 'PA5e ' + k + '：#mx-prog 宽度缓存——1440 / 1180 / 1000 / 1440 改窗宽、以及不经 resize 的变窄 / 复原（都跨过密集阈值）后小节格与现量重画逐字节相同', J(rows));
      T('PA5', !pe.length, 'PA5f ' + k + ' 无页面报错', J(pe));
      await ctx.close();
    }
  });

  /* ================= PA7 记号格 roving tabindex（收尾 C1：有意与 v68.3 不同，登记在案）=================
     v68.4 起「露出来的」按 DOM 判（折叠组外）：面板整块不显示（窄档收起、排版 / 输出模式）时也照样留一个 Tab 站（v68.3 此时一格都不给，
     窄档浮出面板后 Tab 落在 #flw-pgrid 容器上）。各状态下格子区恰好 1 个 tabindex=0 */
  if (want('PA7')) await SAFE('PA7', async () => {
    const rows = [];
    for (const w of [1440, 1200]) {
      const { ctx, pg, pe } = await newPage(URL0, { w });
      await pg.waitForTimeout(1000);
      await pg.evaluate(() => { window.guardReplace = p => p(); hideStartPad(); loadSong(PRESETS[3].make()); render(); });
      await pg.waitForTimeout(300);
      const cnt = () => pg.evaluate(() => document.querySelectorAll('#flw-pgrid [tabindex="0"]').length);
      rows.push({ w, st: 'write', n: await cnt() });
      await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(600); rows.push({ w, st: 'engrave', n: await cnt() });
      await pg.evaluate(() => setMode('output')); await pg.waitForTimeout(600); rows.push({ w, st: 'output', n: await cnt() });
      await pg.evaluate(() => setMode('write')); await pg.waitForTimeout(300); rows.push({ w, st: 'write2', n: await cnt() });
      if (pe.length) rows.push({ w, err: pe.slice(0, 2) });
      await ctx.close();
    }
    T('PA7', rows.every(r => r.n === 1), 'PA7 记号格只占一个 Tab 站：1440 / 1200（窄档收起）× 书写 / 排版 / 输出 / 回书写，格子区恰好 1 个 tabindex=0（面板不显示时也留着，收尾 C1 登记的有意差异）', J(rows));
  });

  for (const id of ['PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'PA7']) if (OUT[id]) { console.log('— ' + id); OUT[id].forEach(l => console.log('  ' + l)); }
  console.log(`\nPASS ${pass}/${total}`);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
