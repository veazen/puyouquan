/* v67.3 电脑端编辑页谱面放大——验收修回归（tv_deskscale.js 的姊妹套件；对抗式验收发现逐条复现后修复，均走真实 UI）
   背景：v67.3 起桌面编辑态的固定版宽谱（body.fixwide）显示＝适配可视宽 × 用户缩放；v64.5–v67.1 的「排版」会把适配补偿
   0.7/0.8/0.85/1.05 自动写进 musetab-zoom（旧 fitKOf 把它除掉所以看不出来），v67.1 缩放死区也存下了 1.1/1.2——
   直接乘到新基准上，升级用户反而更小或一打开就横滚。修复＝fixwide 用新增键 musetab-zoom-fw（缺省 1），旧键原样归存量谱。
   T1 升级用户旧缩放值：预置 musetab-zoom＝0.7（1440）/ 0.8（1536）/ 0.85、1.2（1920）/ 1.05（1366）→ 向导新建：显示与「点缩放标签复位 100%」
      完全相同（旧值不起作用）、无横滚、标签 100%、旧键原值不动；新建谱上点 ＋ 只写新键；切到存量自适应谱仍用旧键原值（与 v67.1 相同）
   T2 共享缩放键串扰：新建谱 → 点示例谱页签 → 排版「标准」→ 完成：示例谱自己不横溢（fitViewWidth 向下取整到 5% 档，
      此前 1920 下 105% 横溢 14px）→ 点回新建谱：不横滚、缩放 100%、宽度同初始
   T3 「排版」不覆盖用户手动缩放：新建谱放大到 130% → 排版「标准」→ 仍 130%；缩放标签悬停提示给出实际倍率
   T4 导出 PNG 与窗口无关：1366 与 1920 导出同一首谱，PNG 逐字节相同（此前克隆带屏幕显示宽，抗锯齿随窗口变）
   T5 Ctrl+滚轮以光标为中心：长谱滚到中段，按住 Ctrl 滚 3 格，光标下谱面点漂移 ≤3 单位（此前纵向补偿写在窗口滚动上，漂移 75–210）
   T6 键盘光标跟滚：1366×657 长谱真实键盘连续录入 32 小节，每小节检查光标在谱面区可视范围内（此前第 5 行起落到屏幕下方）；
      1920 放大到 130% 横滚兜底时，→ 键把光标移到首行行尾小节末列，该列在 #paper 可视范围内（此前出屏）
   T7 左栏「收起」钮：1440 / 1536 桌面编辑态可见；点它 → 面板收起、数字 ≥16 / ≥17.5px；开合前后可视区上缘对应的谱面纵坐标不变（±3，
      此前 scrollTop 不动、谱面跳 24%）；点左侧页签再打开 → 回停靠尺寸
   突变实证见文末记录：v67.1 原版 0/7；验收修之前的工作区副本（scratchpad/v673/vers/wt-scale-prefix.html）0/7。 */
const { chromium } = require('playwright');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');

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
  /* 真实 UI 走新建向导 */
  const wizard = async (pg) => {
    await pg.evaluate(() => showNewWizard()); await pg.waitForTimeout(150);
    await pg.click('.nw-int[data-int="vocal"]');
    await pg.fill('#nw-title', '快乐的小星星');
    await pg.selectOption('#nw-key', 'B');
    await pg.fill('#nw-tempo', '90');
    await pg.click('#nw-create'); await pg.waitForTimeout(700);
    await pg.evaluate(NOTES); await pg.waitForTimeout(400);
    await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
  };
  const geo = pg => pg.evaluate(GEO);
  /* 独立上下文打开（可预置本机存储），模拟升级用户 */
  const openInit = async (w, h, init) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    if (init) await pg.addInitScript(init);
    await pg.goto(URL0); await pg.waitForTimeout(900);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    pg._ctx = ctx; return pg; };
  const layStd = async pg => {   /* 顶栏「排版」→「标准」→「完成」 */
    await pg.click('#b-layout'); await pg.waitForTimeout(200);
    await pg.click('#lp-preset button[data-preset="standard"]'); await pg.waitForTimeout(300);
    await pg.click('#lp-done').catch(() => {}); await pg.waitForTimeout(250); };
  const LS = pg => pg.evaluate(() => ({ z: localStorage.getItem('musetab-zoom'), fw: localStorage.getItem('musetab-zoom-fw'), lbl: document.getElementById('zoom-lbl').textContent }));

  /* T1 升级用户旧缩放值 */
  { const bad = [], out = [];
    const CASES = [[1440, 900, '0.7'], [1536, 864, '0.8'], [1920, 1080, '0.85'], [1920, 1080, '1.2'], [1366, 768, '1.05']];
    for (const [w, h, z] of CASES) {
      const pg = await openInit(w, h, `try{ if(!sessionStorage.getItem('t8')){ localStorage.setItem('musetab-zoom','${z}'); sessionStorage.setItem('t8','1'); } }catch(_){}`);
      await wizard(pg);
      const g = await geo(pg), ls = await LS(pg);
      /* 基准＝点缩放标签复位到 100% 后的显示（全新用户的默认）：旧值不起作用就应当完全相同 */
      await pg.click('#zoom-lbl'); await pg.waitForTimeout(250); const base = await geo(pg);
      if (!(g.dig >= base.dig - 0.01 && g.svgW === base.svgW && !g.xs && g.clipped === 0 && g.vz === 1 && ls.lbl === '100%' && ls.z === z))
        bad.push(`${w} 存 ${z}: 数字 ${g.dig}（复位后 ${base.dig}）宽 ${g.svgW}/${base.svgW} xs=${g.xs} vz=${g.vz} 标签 ${ls.lbl} 旧键 ${ls.z}`);
      out.push(`${w}/${z}:${g.dig}`);
      if (w === 1920 && z === '0.85') {
        /* 新建谱上点 ＋ 只写新键；切到存量自适应谱（示例谱页签）仍用旧键原值 */
        await pg.click('#z-in'); await pg.waitForTimeout(200);
        const l1 = await LS(pg);
        await pg.click('#doc-tabs .dtab[data-doc="0"] .dt-t'); await pg.waitForTimeout(600);
        const ga = await geo(pg), l2 = await LS(pg);
        if (!(l1.fw === '1.1' && l1.z === z && ga.vz === 0.85 && !ga.fixwide && l2.lbl === '85%'))
          bad.push('分键 ' + JSON.stringify({ l1, vzLegacy: ga.vz, fixwide: ga.fixwide, l2 }));
      }
      await pg._ctx.close();
    }
    T(bad.length === 0, 'T1 升级用户旧缩放值（0.7/0.8/0.85/1.2/1.05）不再乘到新建谱：显示与复位 100% 相同、无横滚、标签 100%，旧键原值不动；新建谱缩放走新增键', bad.join(' | ') || out.join(' ')); }

  /* T2 共享缩放键串扰 */
  { const bad = [], out = [];
    for (const [w, h] of [[1536, 864], [1920, 1080]]) {
      const pg = await openInit(w, h); await wizard(pg);
      const g0 = await geo(pg);
      await pg.click('#doc-tabs .dtab[data-doc="0"] .dt-t'); await pg.waitForTimeout(600);
      await layStd(pg); const ga = await geo(pg);
      await pg.click('#doc-tabs .dtab[data-doc="1"] .dt-t'); await pg.waitForTimeout(700);
      const gb = await geo(pg), ls = await LS(pg);
      if (ga.xs || ga.svgW > ga.paperW) bad.push(`${w} 示例谱排版后横溢 ${ga.svgW}/${ga.paperW} vz=${ga.vz}`);
      if (gb.xs || gb.svgW !== g0.svgW || gb.vz !== 1 || ls.lbl !== '100%') bad.push(`${w} 切回新建谱 ${gb.svgW}/${gb.paperW}（初始 ${g0.svgW}）xs=${gb.xs} vz=${gb.vz}`);
      out.push(`${w}: 示例 ${ga.svgW}/${ga.paperW} 新建 ${gb.svgW}/${gb.paperW}`);
      await pg._ctx.close();
    }
    T(bad.length === 0, 'T2 存量谱上用「排版」后：存量谱自己不横溢，切回新建谱不横滚、缩放 100%', bad.join(' | ') || out.join(' ; ')); }

  /* T3 「排版」不覆盖用户手动缩放 + 标签实际倍率提示 */
  { const pg = await openInit(1920, 1080); await wizard(pg);
    for (let i = 0; i < 3; i++) { await pg.click('#z-in'); await pg.waitForTimeout(150); }
    const g1 = await geo(pg); await layStd(pg); const g2 = await geo(pg);
    const tip = await pg.evaluate(() => document.getElementById('zoom-lbl').title);
    T(g1.vz === 1.3 && g2.vz === 1.3 && g2.svgW === g1.svgW && /实际约 \d+%/.test(tip),
      'T3 新建谱放大到 130% 后点「排版」预设，缩放仍 130%；标签悬停给出实际倍率', JSON.stringify({ before: g1.vz, after: g2.vz, w1: g1.svgW, w2: g2.svgW, tip }));
    await pg._ctx.close(); }

  /* T4 导出 PNG 与窗口无关 */
  { const hs = {};
    for (const [w, h] of [[1366, 768], [1920, 1080]]) {
      const pg = await openInit(w, h); await wizard(pg);
      hs[w] = await pg.evaluate(() => new Promise(res => { const o = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (cb, t) { HTMLCanvasElement.prototype.toBlob = o; const u = this.toDataURL('image/png');
          let x = 0; for (let i = 0; i < u.length; i++) x = (x * 31 + u.charCodeAt(i)) >>> 0; res({ w: this.width, h: this.height, len: u.length, hash: x, sw: +document.getElementById('score').getAttribute('width') }); };
        const oa = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { HTMLAnchorElement.prototype.click = oa; };
        exportPNG(2); }));
      await pg._ctx.close();
    }
    const a = hs[1366], c = hs[1920];
    T(a.sw !== c.sw && a.w === c.w && a.h === c.h && a.hash === c.hash && a.len === c.len,
      'T4 导出 PNG 与窗口无关（1366 / 1920 显示宽不同，PNG 逐字节相同）', JSON.stringify(hs)); }

  /* T5 Ctrl+滚轮纵向锚点 */
  { const pg = await openInit(1920, 1080); await wizard(pg);
    await pg.evaluate(() => { for (let i = 0; i < 40; i++) song.measures.push(JSON.parse(JSON.stringify(song.measures[i % 8]))); render(); });
    await pg.evaluate(() => { document.getElementById('score-wrap').scrollTop = 600; }); await pg.waitForTimeout(300);
    const pt = { x: 900, y: 600 };
    const probe = () => pg.evaluate(({ x, y }) => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), vb = sv.viewBox.baseVal;
      return { ux: +((x - R.left) / R.width * vb.width).toFixed(1), uy: +((y - R.top) / R.height * vb.height).toFixed(1), w: Math.round(R.width) }; }, pt);
    const a = await probe();
    await pg.mouse.move(pt.x, pt.y); await pg.keyboard.down('Control');
    for (let i = 0; i < 3; i++) { await pg.mouse.wheel(0, -100); await pg.waitForTimeout(250); }
    await pg.keyboard.up('Control'); const c = await probe();
    T(c.w > a.w * 1.25 && Math.abs(c.uy - a.uy) <= 3 && Math.abs(c.ux - a.ux) <= 3,
      'T5 Ctrl+滚轮放大 3 档，光标下谱面点不漂移（≤3 单位）', JSON.stringify({ a, c, dy: +(c.uy - a.uy).toFixed(1) }));
    await pg._ctx.close(); }

  /* T6 键盘光标跟滚 */
  { const bad = [];
    { const pg = await openInit(1366, 657); await wizard(pg);
      await pg.evaluate(() => { const q = () => ({ dur: 4, dotted: false, deg: 0, acc: '', oct: 0, lyrics: [], tie: false });
        while (song.measures.length < 32) song.measures.push(JSON.parse(JSON.stringify(song.measures[0])));
        song.measures.forEach(m => { m.voxes[0] = [q(), q(), q(), q()]; }); render(); });
      await pg.waitForTimeout(300);
      const p = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, b = colBoxes['v0:0:0']; return { x: R.left + (b.x + b.w / 2) * k, y: R.top + (b.y + b.h / 2) * k }; });
      await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(200);
      let hidden = 0, worst = '';
      for (let m = 0; m < 32; m++) {
        for (const ch of '1235') { await pg.keyboard.press(ch); await pg.waitForTimeout(25); }
        { await pg.waitForTimeout(60);
          const q = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width;
            const b = colBoxes['v0:' + sel.mi + ':' + sel.ci], wr = document.getElementById('score-wrap').getBoundingClientRect();
            return { mi: sel.mi, top: b ? R.top + b.y * k : -1, bot: b ? R.top + (b.y + b.h) * k : 1e9, wT: wr.top, wB: Math.min(wr.bottom, innerHeight) }; });
          if (q.top < q.wT || q.bot > q.wB) { hidden++; worst = JSON.stringify(q); } }
      }
      const data = await pg.evaluate(() => song.measures.slice(0, 32).every(mm => mm.voxes[0].map(c => c.deg).join('') === '1235'));
      if (hidden || !data) bad.push(`1366×657 长谱录入：光标出屏 ${hidden} 次 ${worst} 数据完整=${data}`);
      await pg._ctx.close(); }
    { const pg = await openInit(1920, 1080); await wizard(pg);
      await pg.evaluate(() => { song.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 2, 3, 5][i % 4]; })); render(); });
      for (let i = 0; i < 3; i++) { await pg.click('#z-in'); await pg.waitForTimeout(150); }
      /* 点第 1 小节首音，再用 → 键走到第 6 小节（首行行尾） */
      const p = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, b = colBoxes['v0:0:0']; return { x: R.left + (b.x + b.w / 2) * k, y: R.top + (b.y + b.h / 2) * k }; });
      await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(150);
      const end = await pg.evaluate(() => { const s0 = SYS_GEO[0].y0; let last = 0; Object.keys(meaBoxes).forEach(mi => { const b = colBoxes['v0:' + mi + ':0']; if (b && b.y < SYS_GEO[0].y1 && b.y >= s0 - 2) last = Math.max(last, +mi); }); return last; });
      for (let i = 0; i < 80; i++) { const at = await pg.evaluate(() => sel.mi); if (at >= end) break; await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(20); }
      for (let i = 0; i < 6; i++) { await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(20); if (await pg.evaluate(() => sel.ci >= curRowCols().length - 1)) break; }
      await pg.waitForTimeout(200);
      const r = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, P = document.getElementById('paper'), pr = P.getBoundingClientRect();
        const b = colBoxes['v0:' + sel.mi + ':' + sel.ci]; return { mi: sel.mi, ci: sel.ci, xs: P.classList.contains('paper-xs'), colR: Math.round(R.left + (b.x + b.w) * k), paperR: Math.round(pr.right), sl: P.scrollLeft }; });
      if (!(r.xs && r.mi === end && r.colR <= r.paperR)) bad.push('1920@130% 行尾光标出屏 ' + JSON.stringify(Object.assign({ end }, r)));
      await pg._ctx.close(); }
    T(bad.length === 0, 'T6 键盘移动光标跟滚：长谱录入光标不落出可视区；放大横滚时行尾光标列在 #paper 可视范围内', bad.join(' | ') || 'ok'); }

  /* T7 左栏「收起」钮 + 开合保持纵向锚点 */
  { const bad = [], out = [];
    for (const [w, h, min] of [[1440, 900, 16], [1536, 864, 17.5]]) {
      const pg = await openInit(w, h); await wizard(pg);
      await pg.evaluate(() => { for (let i = 0; i < 40; i++) song.measures.push(JSON.parse(JSON.stringify(song.measures[i % 8]))); render(); });
      await pg.evaluate(() => { document.getElementById('score-wrap').scrollTop = 400; }); await pg.waitForTimeout(300);
      const top = () => pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), vb = sv.viewBox.baseVal, wr = document.getElementById('score-wrap').getBoundingClientRect();
        return +((wr.top - R.top) / (R.width / vb.width)).toFixed(1); });
      const btn = await pg.evaluate(() => { const e = document.getElementById('fly-close'); if (!e) return null; const r = e.getBoundingClientRect(); return { vis: r.width > 0 && r.height > 0, txt: e.textContent.trim() }; });
      if (!btn || !btn.vis) { bad.push(`${w} 无收起钮 ${JSON.stringify(btn)}`); await pg._ctx.close(); continue; }
      const t0 = await top(), g0 = await geo(pg);
      await pg.click('#fly-close'); await pg.waitForTimeout(600);
      const t1 = await top(), g1 = await geo(pg);
      await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(600);
      const t2 = await top(), g2 = await geo(pg);
      if (!(g1.flyHidden && g1.dig >= min && g1.clipped === 0)) bad.push(`${w} 收起后 ${JSON.stringify({ h: g1.flyHidden, dig: g1.dig })}`);
      if (!(!g2.flyHidden && g2.svgW === g0.svgW)) bad.push(`${w} 再打开 ${JSON.stringify({ h: g2.flyHidden, w: g2.svgW, w0: g0.svgW })}`);
      if (!(Math.abs(t1 - t0) <= 3 && Math.abs(t2 - t0) <= 3)) bad.push(`${w} 开合锚点漂移 ${t0}→${t1}→${t2}`);
      out.push(`${w}: ${g0.dig}→${g1.dig}px 锚 ${t0}/${t1}/${t2}`);
      await pg._ctx.close();
    }
    T(bad.length === 0, 'T7 左栏「收起」钮：收起后谱面放大（1440≥16 / 1536≥17.5px），开合前后可视区内容不跳（±3 单位），点页签再打开回停靠尺寸', bad.join(' | ') || out.join(' ; ')); }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
/* 突变实证（2026-10）：
   ① MUSETAB_URL=v67.1 9650254 原版：PASS 0/7——T1 红（存 0.7/0.8/0.85 标签 70%/80%/85%、宽 742/848 ≠ 复位后 755/851，1920 存 0.85 数字 14.37）
      T2 红（示例谱排版后 105% 横溢 866/855、914/900）  T3 红（130%→85%）  T4 红（v67.1 显示宽恒 896，前提不成立）
      T5 红（纵向漂移 −75.3 单位）  T6 红（1366×657 光标出屏 5 次；1920@130% 行尾列右缘 1444 > 纸张右缘 1437）  T7 红（无收起钮）
   ② MUSETAB_URL=scratchpad/v673/vers/wt-scale-prefix.html（验收修之前的工作区副本）：PASS 0/7——
      T1 红（1440 存 0.7→数字 8.48px、宽 529；1536 存 0.8→10.92px、宽 681；复位后 12.11 / 13.65）
      T2 红（切回新建谱 894/855、1297/1239 横滚）  T3 红（130%→100%）  T4 红（1366 / 1920 PNG 哈希不同）
      T5 红（纵向漂移 −209.8 单位）  T6 红（光标出屏 12 次；行尾列右缘 1877 > 1606）  T7 红（无收起钮） */
