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
      （v67.7 D7 门槛 90%：1440 新建谱左栏已自动收起，先点「小节」页签把它再打开（浮层）再测收起钮；再打开回到同一尺寸）
   突变实证见文末记录：v67.1 原版 0/7；验收修之前的工作区副本（scratchpad/v673/vers/wt-scale-prefix.html）0/7。
   ——— 第二轮验收补（修前红 / 修后绿，修前副本 scratchpad/v673/r3/before-r3.html）———
   T8  「收起」状态稳定：1536 收起后窗口高改 1px（resize）仍收起、谱面仍放大；刷新 → 继续上次编辑仍收起（新增本机键 musetab-flyclosed）；
       点左侧页签再打开即清除记忆
   T9  1920 新建谱点 ＋（110%）：谱面区底边出现吸底横滚条（在视口内、与 #paper 双向同步）；播放高亮到被遮的行尾小节时横向跟随露出
       （v67.7 收尾验收 D2：版宽 870 后 #paper 收到谱纸 100% 宽（--fw-max），110% 照旧一档即横滚——与 v67.6 同口径，断言不放宽）
   T10 暂停态（▶ 继续）键盘移动光标仍跟滚：64 小节长谱从首音连按 → 到末小节，光标不出可视区
   T11 谱架读新建谱的缩放键：预置旧键 0.85（v64.5–v67.1 自动写入）→ 新建谱点 ＋ → 进谱架谱面与 v67.2 同为 1056px（此前 901）
       （v67.7 收尾验收 OUT-4：版宽 870 的固定版宽谱在谱架里也放大到 FIT_MAX 铺满谱架纸宽，门槛仍 1040——修前 957px 红）
   T12 收起钮可用键盘操作：Tab 到收起钮按 Enter＝收起、焦点交给左轨当前音轨钮，再按 Enter＝展开；空格＝收起而不是开始播放
   T13 收起后点左侧音轨钮＝打开该轨面板（逐轨「简谱」开关可见），不必先点「小节」 */
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
    await pg.click('.nf-modal [data-scene="vocal"]');   // v67.4 新建面板「歌谱 · 合唱」（原声乐意图卡）
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
      /* v67.7 D7 门槛 70%→90%：1440 停靠时 870×0.9 放不下，新建谱左栏已自动收起一次——先真实点「小节」页签把面板再打开（浮层），收起钮才可见 */
      if (await pg.evaluate(() => document.getElementById('left-flyout').classList.contains('hidden'))) { await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(600); await pg.evaluate(() => { document.getElementById('score-wrap').scrollTop = 400; }); await pg.waitForTimeout(300); }
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

  /* ======== 第二轮验收补 ======== */
  const wizardInst = async (pg) => {
    await pg.evaluate(() => showNewWizard()); await pg.waitForTimeout(150);
    await pg.click('.nf-modal [data-scene="gtr"]'); await pg.waitForTimeout(80);   // v67.4 新建面板「吉他弹唱」（原器乐意图卡默认＝吉他弹唱）
    await pg.click('#nw-create'); await pg.waitForTimeout(700);
    await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); };
  const flyH = pg => pg.evaluate(() => document.getElementById('left-flyout').classList.contains('hidden'));

  /* T8 收起状态稳定 + 记忆 */
  { const bad = [], out = [];
    const pg = await openInit(1536, 864); await wizard(pg);
    await pg.click('#fly-close'); await pg.waitForTimeout(500);
    const g1 = await geo(pg);
    await pg.setViewportSize({ width: 1536, height: 863 }); await pg.waitForTimeout(600);
    const g2 = await geo(pg);
    if (!(g1.flyHidden && g2.flyHidden && g2.dig >= 17.5 && g2.svgW === g1.svgW)) bad.push('改高 1px 后 ' + JSON.stringify({ h1: g1.flyHidden, h2: g2.flyHidden, dig: g2.dig, w1: g1.svgW, w2: g2.svgW }));
    await pg.setViewportSize({ width: 1536, height: 864 });
    await pg.reload(); await pg.waitForTimeout(900);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    if (await pg.evaluate(() => { const e = document.getElementById('start-pad'); return !!(e && !e.classList.contains('hidden')); })) { await pg.click('#spd-cont'); await pg.waitForTimeout(600); }
    const h3 = await flyH(pg), k3 = await pg.evaluate(() => localStorage.getItem('musetab-flyclosed'));
    if (!h3) bad.push('刷新→继续上次编辑后左栏重开');
    await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(500);
    const h4 = await flyH(pg), k4 = await pg.evaluate(() => localStorage.getItem('musetab-flyclosed'));
    if (h4 || k4 !== null) bad.push('点页签再打开 ' + JSON.stringify({ h4, k4 }));
    out.push(`收起 ${g1.dig}px → 改高后 ${g2.dig}px · 刷新后收起=${h3}（键 ${k3}）· 再打开键=${k4}`);
    await pg._ctx.close();
    T(bad.length === 0, 'T8 「收起」状态稳定：resize 不重开、刷新后仍收起（musetab-flyclosed）、点页签再打开即清除', bad.join(' | ') || out.join(' ; ')); }

  /* T9 放大后的吸底横滚条 + 播放横向跟随 */
  { const bad = [];
    const pg = await openInit(1920, 1080); await wizard(pg);
    await pg.click('#z-in'); await pg.waitForTimeout(400);
    /* v67.7 收尾验收 D2：#paper 收到谱纸 100% 宽后，110% 一档即放不下（与 v67.6 同口径）——不连点 */
    const h = await pg.evaluate(() => { const H = document.getElementById('paper-hbar'), P = document.getElementById('paper');
      if (!H) return { none: true, xs: P.classList.contains('paper-xs') };
      const r = H.getBoundingClientRect(), wr = document.getElementById('score-wrap').getBoundingClientRect();
      return { xs: P.classList.contains('paper-xs'), disp: getComputedStyle(H).display, top: Math.round(r.top), bot: Math.round(r.bottom), wB: Math.round(Math.min(wr.bottom, innerHeight)), ih: innerHeight, sw: H.scrollWidth, cw: H.clientWidth, psw: P.scrollWidth, pcw: P.clientWidth }; });
    if (h.none || !h.xs || h.disp === 'none' || !(h.bot <= h.wB + 1 && h.top >= 0) || !(h.sw > h.cw + 20)) bad.push('横滚条 ' + JSON.stringify(h));
    else {
      await pg.evaluate(() => { document.getElementById('paper-hbar').scrollLeft = 60; }); await pg.waitForTimeout(150);
      const sl = await pg.evaluate(() => { const P = document.getElementById('paper'), H = document.getElementById('paper-hbar');
        return { p: Math.round(P.scrollLeft), pMax: P.scrollWidth - P.clientWidth, hMax: H.scrollWidth - H.clientWidth }; });
      if (Math.abs(sl.p - 60) > 2 || Math.abs(sl.pMax - sl.hMax) > 2) bad.push('横滚条→#paper 未同步 ' + JSON.stringify(sl));
      await pg.evaluate(() => { document.getElementById('paper').scrollLeft = 0; }); await pg.waitForTimeout(150);
    }
    /* 播放高亮落到首行行尾小节（被遮）：横向跟随 */
    const f = await pg.evaluate(async () => { const P = document.getElementById('paper'); P.scrollLeft = 0;
      const mi = layoutSystems()[0].measures.slice(-1)[0].mi; highlight('v0', mi, 0, true);
      await new Promise(r => setTimeout(r, 700));
      const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, mb = meaBoxes[mi], pr = P.getBoundingClientRect();
      return { mi, sl: Math.round(P.scrollLeft), mR: Math.round(R.left + (mb.x + mb.w) * k), pR: Math.round(pr.right) }; });
    if (!(f.sl > 0 && f.mR <= f.pR + 1)) bad.push('播放横向跟随 ' + JSON.stringify(f));
    await pg._ctx.close();
    T(bad.length === 0, 'T9 新建谱 110%：吸底横滚条在视口内且与 #paper 同步；播放高亮到被遮的行尾小节时横向露出', bad.join(' | ') || JSON.stringify({ h, f })); }

  /* T10 暂停态键盘跟滚 */
  { const pg = await openInit(1920, 1080); await wizard(pg);
    /* 每小节两个二分音符（按键少、行数多）：64 小节 */
    await pg.evaluate(() => { const V = (deg) => ({ dur: 2, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
      while (song.measures.length < 64) song.measures.push(blankMeasure());
      song.measures.forEach((m, i) => { m.voxes[0] = [V(1 + i % 7), V(1 + (i + 3) % 7)]; }); render(); });
    await pg.click('#b-play'); await pg.waitForTimeout(1200); await pg.click('#b-play'); await pg.waitForTimeout(300);
    const st = await pg.evaluate(() => ({ playing: audio.playing, paused: !!audio.paused }));
    await pg.evaluate(() => { document.getElementById('score-wrap').scrollTop = 0; }); await pg.waitForTimeout(150);
    const p = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, b = colBoxes['v0:0:0']; return { x: R.left + (b.x + b.w / 2) * k, y: R.top + (b.y + 10) * k }; });
    await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(150);
    let hidden = 0, last = null;
    for (let n = 0; n < 400; n++) {
      await pg.keyboard.press('ArrowRight');
      const c = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, b = colBoxes['v0:' + sel.mi + ':' + sel.ci], wr = document.getElementById('score-wrap').getBoundingClientRect();
        return { mi: sel.mi, vis: !!b && R.top + b.y * k >= wr.top - 1 && R.top + (b.y + b.h) * k <= Math.min(wr.bottom, innerHeight) + 1 }; });
      if (!c.vis) hidden++; last = c; if (c.mi >= 63) break; }
    await pg._ctx.close();
    T(st.playing && st.paused && hidden === 0 && last.mi >= 63, 'T10 暂停态（▶ 继续）连按 → 到第64小节：光标始终在可视区（此前暂停时完全不跟滚）', JSON.stringify({ st, hidden, last })); }

  /* T11 谱架读新建谱缩放键 */
  { const pg = await openInit(1920, 1080, `try{ if(!sessionStorage.getItem('t11')){ localStorage.setItem('musetab-zoom','0.85'); sessionStorage.setItem('t11','1'); } }catch(_){}`);
    await wizard(pg);
    await pg.click('#z-in'); await pg.waitForTimeout(300);
    await pg.click('#b-stand'); await pg.waitForTimeout(900);
    const sg = await pg.evaluate(() => ({ stand: document.body.classList.contains('stand'), svgW: +document.getElementById('score').getAttribute('width'), vz: viewZoom, z: localStorage.getItem('musetab-zoom'), fw: localStorage.getItem('musetab-zoom-fw') }));
    await pg.click('#sb-exit').catch(() => {}); await pg.waitForTimeout(600);
    const back = await pg.evaluate(() => ({ vz: viewZoom, lbl: document.getElementById('zoom-lbl').textContent }));
    await pg._ctx.close();
    /* v67.7 收尾验收 OUT-4：版宽 870 的固定版宽谱在谱架里放大到 FIT_MAX 铺满谱架纸宽（读新键 110% → 1056px；修前 957px、误读旧键 0.85 → ≈740px），门槛不放宽 */
    T(sg.stand && sg.svgW >= 1040 && sg.z === '0.85' && back.lbl === '110%', 'T11 旧键 0.85 的升级用户：新建谱 ＋ 后进谱架谱面 ≥1040px（v67.2 为 1056，此前 901）；旧键原值不动、退出回 110%', JSON.stringify({ sg, back })); }

  /* T12 收起钮键盘可达 / 可操作 */
  { const bad = [];
    const pg = await openInit(1920, 1080); await wizardInst(pg);
    await pg.focus('#fly-close'); await pg.keyboard.press('Shift+Tab'); await pg.keyboard.press('Tab');   // 真实键盘把焦点送到收起钮（:focus-visible）
    const a0 = await pg.evaluate(() => document.activeElement.id);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    const a1 = await pg.evaluate(() => ({ h: document.getElementById('left-flyout').classList.contains('hidden'), cls: document.activeElement.className, trk: document.activeElement.dataset.trk || '' }));
    if (a0 !== 'fly-close' || !a1.h || !/ltab/.test(a1.cls)) bad.push('Enter 收起 ' + JSON.stringify({ a0, a1 }));
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    const a2 = await flyH(pg);
    if (a2) bad.push('焦点在左轨钮上按 Enter 未展开');
    await pg.focus('#fly-close'); await pg.keyboard.press('Shift+Tab'); await pg.keyboard.press('Tab');
    await pg.keyboard.press('Space'); await pg.waitForTimeout(500);
    const a3 = await pg.evaluate(() => ({ h: document.getElementById('left-flyout').classList.contains('hidden'), playing: !!audio.playing }));
    if (!a3.h || a3.playing) bad.push('空格 ' + JSON.stringify(a3));
    await pg.evaluate(() => { try { stopPlay(); } catch (_) {} });
    await pg._ctx.close();
    T(bad.length === 0, 'T12 收起钮键盘操作：Enter 收起（焦点交给左轨钮）→ Enter 展开；空格收起且不触发播放', bad.join(' | ') || JSON.stringify({ a0, a1, a2, a3 })); }

  /* T13 收起后点音轨钮＝打开该轨面板 */
  { const pg = await openInit(1536, 864); await wizardInst(pg);
    await pg.click('#fly-close'); await pg.waitForTimeout(400);
    const h0 = await flyH(pg);
    await pg.click('#rail-tracks .rtrk[data-trk^="tv:"]'); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => { const j = document.getElementById('nl-tabjp'); return { h: document.getElementById('left-flyout').classList.contains('hidden'), jp: !!(j && j.offsetParent), row: sel.row }; });
    await pg._ctx.close();
    T(h0 && !r.h && r.jp && r.row === 'tab', 'T13 收起后点左侧吉他音轨钮：面板展开、逐轨「简谱」开关可见（此前要先点「小节」再点音轨钮）', JSON.stringify(Object.assign({ h0 }, r))); }

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
      T5 红（纵向漂移 −209.8 单位）  T6 红（光标出屏 12 次；行尾列右缘 1877 > 1606）  T7 红（无收起钮）
   ③ 第二轮：MUSETAB_URL=scratchpad/v673/r3/before-r3.html（第二轮修复前的合并树）：PASS 7/13——T1–T7 绿，T8–T13 全红：
      T8 改高 1px 后左栏重开（1123→851px）、刷新后重开  T9 无吸底横滚条、播放不横向跟随（行尾小节右缘 1654 > 纸张 1606）
      T10 暂停态光标出屏 43 次  T11 谱架 901px（旧键 0.85）  T12 Enter 不收起、空格开始播放  T13 点音轨钮面板仍收着 */
