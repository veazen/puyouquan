/* v67.7 新建谱与导入谱同一密度（负责人报障原话：「新建的谱（图1）显示比例还是太小，这是之前修正歌曲标题和歌曲信息长度时留下的问题。
   但是导入MIDI的曲谱（图2）显示就没问题。」）
   根因（实测，非 v66.9 页头）：新建谱（song.layout.fixed，v64.5 D-09）按常量 FIXED_A4=1060 排版；存量 / 导入谱在桌面按 #paper 900−30=870 重排、100% 显示——
   同一首谱新建谱每行多塞约 22%，1280–1600 宽显示还被压到 71–90%。v67.3 只修了显示缩放，没动密度。
   修复＝FIXED_A4 1060→870（与存量桌面版宽同值）＋ D7 自动收起左栏门槛 fitFloor（70%）→ FIT_DOCK（90%）。全部为数值断言：
   D1 同一首谱（简谱歌谱带词《送别》、吉他弹唱 TAB＋简谱《小星星（分解弹唱）》、钢琴伴奏大谱表《卡农进行（钢琴弹唱伴奏）》）layout.fixed=true 与 false
      在 #paper 900 生效的 1600×900 / 1920×1080 下：PAGE_W 相同（＝FIXED_A4）、断行（每行小节）相同、#score viewBox 与 innerHTML 逐字节相同
   D2 真实新建（深链 ?new=vocal / gtr / pacc ＋ 回车）与真实导入（新建面板「导入」页签选 .mid 文件 → MIDI 对话框「导入」）在
      1280×800 / 1366×768 / 1440×900 / 1536×864 / 1600×900 / 1920×1080 / 2560×1440 默认面板状态下：
      新建谱屏幕简谱数字字号（17 × svg 显示比例）≥ 导入谱的 0.95 倍（真实 MIDI 导入谱、同谱导入口径各比一次，各自默认面板状态）；
      同一首谱（新建谱去掉 fixed 另开一页签＝导入 / 存量口径，同一窗口、左栏状态对齐）每行小节数 ≤ 导入口径
      （参考输出另列「默认面板状态下各自断行」：1280–1440 新建谱左栏按 D7 收起、导入谱左栏停靠，两边纸宽不同，不直接比每行小节）
   D3 D7：1366 / 1440 新建谱左栏自动收起一次、显示比例 ≥ FIT_DOCK（0.9）；用户再打开左栏＝浮层（body.paper-tight），谱面不被挤窄、末小节线不被裁；
      再收再开不会二次自动收起；1536 / 1600 / 1920 不收起且停靠显示 ≥0.9；导入谱（非固定版宽）在 1366 / 1440 不触发收起
      （D2 的 vocal 窗口顺带做 D3 的真实点击：左轨「小节」页签开 → 收 → 开）
   D4 打印：固定版宽谱在 1280 窗口 beforeprint 时 PAGE_W＝870（＝FIXED_A4）、断行与 1920 屏幕相同、打印期间不挂 fixwide；afterprint 后回屏幕显示
   D5 手机 390：仍走窄屏重排（不挂 fixwide、PAGE_W＜FIXED_A4、谱面不超屏、无横溢，固定版宽与否 #score 逐字节相同）；观看页 1920（不挂 fixwide、#paper≤900、
      PAGE_W＝FIXED_A4、显示＝适配纸宽 min(1,(纸宽−4)/版宽)、≥0.9）；谱架 1920（真实新建 → 谱架钮：PAGE_W＝FIXED_A4、不横溢、显示 ≥0.95，退出回编辑态 fixwide）
      ——v67.6 观看页显示 0.80（且 848px 宽超出 820px 纸宽）、谱架约 0.996；此版观看页 0.938、谱架 1.0
   ——— v67.7 收尾验收补（修前副本 scratchpad/v677/prefix.html：D5–D8 红；修后绿）———
   D5 另加：谱架里固定版宽谱铺满谱架纸宽（OUT-4：谱纸 ≥ 纸宽 −8；修前 870/1060，两侧各空 95px）
   D6（D1）新建谱 → 刷新：开机渲染不占用「左栏自动收起一次」（FLY_AUTO_CLOSED 仍 false）；启动台「继续上次编辑」1366 / 1440 当场收起左栏、
      数字 ≥17px，第一次点谱面谱纸宽不变（修前停靠 13.3 / 14.8px，首击整谱跳成浮层 681→953）；刷新后从启动台再新建同样收起（修前浮层盖住行首）；
      不出启动台的 ?wxlogin 直达也当场收起（修前停靠 0.783）
   D7（D2 / D5）1920 停靠、1600 收起：#paper 收到谱纸 100% 宽（≤ 谱纸 +8）、谱型条与谱纸左右 ±1px、110% 一档即横滚（吸底横滚条）；
      存着 musetab-zoom-fw 0.8 时谱型条仍对齐谱纸；1366 新建谱照样自动收起左栏（D7 按适配底数判，修前停靠 62.6%）
   D8（OUT-1）曲首和弦图带 14 个和弦：A4 100% / 130% / 150%、A5 100% / 150% 整带在版心内（每行个数按版心，放不下就换行）；A4 100% 仍一行
   单跑约 150 秒（D2 两个视口并行）。
   突变实证：MUSETAB_URL 指向 v67.6 原版（scratchpad/v677/v676.html）→ PASS 0/8；指向收尾修复前副本（scratchpad/v677/prefix.html）→ D5–D8 红、4/8（见文末记录）。 */
const { chromium } = require('playwright');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');

/* 构造最小 SMF（format 0 单轨，C 大调 4/4 ♩=120）：与新建谱填进去的旋律同一份 */
const vlq = n => { const s = [n & 0x7f]; n >>= 7; while (n) { s.push((n & 0x7f) | 0x80); n >>= 7; } return s.reverse(); };
const NB = 16;
const MEL = []; for (let mi = 0; mi < NB; mi++) MEL.push([0, 1, 2, 3].map(i => ((mi * 3 + i) % 7) + 1));
const MIDI = (() => {
  const DEG = [0, 60, 62, 64, 65, 67, 69, 71];
  const tk = [0, 0xFF, 0x51, 3, 7, 0xA1, 0x20, 0, 0xFF, 0x58, 4, 4, 2, 24, 8, 0, 0xFF, 0x59, 2, 0, 0];
  let last = 0; const ev = [];
  MEL.flat().forEach((d, k) => { ev.push([k * 480, 0x90, DEG[d], 80], [k * 480 + 480, 0x80, DEG[d], 0]); });
  ev.forEach(([t, st, a, b]) => { tk.push(...vlq(t - last), st, a, b); last = t; });
  tk.push(0, 0xFF, 0x2F, 0);
  return Buffer.from([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0xE0,
    0x4D, 0x54, 0x72, 0x6B, (tk.length >> 24) & 255, (tk.length >> 16) & 255, (tk.length >> 8) & 255, tk.length & 255, ...tk]);
})();

/* 屏幕几何：k＝屏幕 CSS px / 谱面单位；dig＝17 × k（简谱数字刻版字号 17，见 digFs）；bars＝每行小节数 */
const GEO = () => {
  const sv = document.getElementById('score'), vb = sv.viewBox.baseVal, R = sv.getBoundingClientRect(), k = R.width / vb.width;
  const P = document.getElementById('paper'), pr = P.getBoundingClientRect(), fly = document.getElementById('left-flyout');
    /* 简谱音符数字的刻版字号：谱面里 1–7 单字出现最多的字号（拍号 / 小节号等小字是少数） */
  const cnt = {}; [...sv.querySelectorAll('text')].forEach(e => { if (/^[1-7]$/.test(e.textContent)) { const f = e.getAttribute('font-size'); cnt[f] = (cnt[f] || 0) + 1; } });
  const dfs = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  let barR = 0; sv.querySelectorAll('line').forEach(e => { const q = e.getBoundingClientRect(); if (q.height > 10 && q.width < 4 && q.right > barR) barR = q.right; });
  const sys = layoutSystems();
  return { fixed: !!(song.layout || {}).fixed, PAGE_W, k: +k.toFixed(4), dig: +(17 * k).toFixed(2), digFs: dfs ? +dfs : null,
    bars: sys.map(s => s.measures.length), sys: sys.map(s => s.measures.map(m => m.mi).join(',')).join('|'), vb: sv.getAttribute('viewBox'),
    svgW: +sv.getAttribute('width'), paperW: P.clientWidth, clipped: Math.max(0, Math.round(barR - pr.right)),
    flyH: !!(fly && fly.classList.contains('hidden')), flyPos: fly ? getComputedStyle(fly).position : '', tight: document.body.classList.contains('paper-tight'),
    fw: document.body.classList.contains('fixwide'), xs: P.classList.contains('paper-xs'), auto: typeof FLY_AUTO_CLOSED !== 'undefined' ? FLY_AUTO_CLOSED : null,
    docs: docs.length, n: song.measures.length, docW: document.documentElement.scrollWidth, vw: innerWidth };
};

/* 新建后填同一份内容（相当于用户录入）：旋律＋每音一字歌词；吉他弹唱加 TAB；钢琴伴奏加右手 / 左手两行 */
const FILL = ([sc, MEL]) => {
  const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  song.measures.forEach((m, mi) => {
    m.voxes[0] = MEL[mi].map((d, i) => V(d, 4, { lyrics: ['啦'], chord: i === 0 ? ['C', 'F', 'G7', 'Am'][mi % 4] : '' }));
    if (sc === 'gtr') m.tabs[0] = [0, 1, 2, 3].map(i => ({ dur: 4, dotted: false, chord: i === 0 ? ['C', 'G', 'Am', 'F'][mi % 4] : '', notes: [{ s: 2 + (i % 3), f: (mi + i) % 4 }], strum: '', tech: '' }));
    if (sc === 'pacc') {
      m.voxes[1] = [0, 1, 2, 3].map(i => V(((i + mi) % 5) + 1, 4, { adds: [{ deg: ((i + mi + 2) % 7) + 1, oct: 0 }] }));
      m.voxes[2] = [0, 1].map(i => V(((mi + i * 4) % 7) + 1, 2, { oct: -1 }));
    }
  });
  blurSel = true; render(); return true;
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + String(d).slice(0, 2400) : '')); };
  const errs = [];
  const open = async (w, h, q, opt) => {
    opt = opt || {};
    const ctx = await b.newContext(opt.mob ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : { viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    /* 预置本机键（只在本上下文首次载入时写一次，刷新不再覆盖——刷新类断言要看到页面自己写下的状态） */
    if (opt.ls) await pg.addInitScript(`try{ if(!sessionStorage.getItem('__fdinit')){ sessionStorage.setItem('__fdinit','1'); const o=${JSON.stringify(opt.ls)}; for(const k in o){ if(o[k]==null) localStorage.removeItem(k); else localStorage.setItem(k,o[k]); } } }catch(_){}`);
    await pg.goto(URL0 + (q ? '?' + q : '')); await pg.waitForTimeout(1000);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    pg._ctx = ctx; return pg;
  };
  const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name, 'EXC: ' + String(e.message || e).split('\n')[0]); } };
  const geo = pg => pg.evaluate(GEO);
  const C = await (async () => { const pg = await open(1600, 900);
    const c = await pg.evaluate(() => ({ FA4: typeof FIXED_A4 === 'number' ? FIXED_A4 : null, DOCK: typeof FIT_DOCK === 'number' ? FIT_DOCK : null, FMAX: typeof FIT_MAX === 'number' ? FIT_MAX : null }));
    await pg._ctx.close(); return c; })();
  console.log('常量 ' + JSON.stringify(C));
  const FA4 = C.FA4, DOCK = C.DOCK == null ? 0.9 : C.DOCK;   // 旧版无 FIT_DOCK：按验收口径 0.9 判

  /* 三首同谱（示例谱原样内容，只切 layout.fixed） */
  const PRE = ['送别（歌谱）', '小星星（分解弹唱）', '卡农进行（钢琴弹唱伴奏）'];
  const capPair = (pg) => pg.evaluate((PRE) => { hideStartPad(); const out = {};
    for (const nm of PRE) {
      const P = PRESETS.find(p => p.name === nm); if (!P) { out[nm] = { err: 'no preset' }; continue; }
      const base = migrate(P.make());
      const cap = fx => { const s = JSON.parse(JSON.stringify(base)); s.layout = Object.assign({}, s.layout || {}); if (fx) s.layout.fixed = true; else delete s.layout.fixed;
        loadSong(s); blurSel = true; render(); const sv = document.getElementById('score');
        return { PAGE_W, vb: sv.getAttribute('viewBox'), html: sv.innerHTML, sys: layoutSystems().map(x => x.measures.map(m => m.mi).join(',')).join('|'),
          bars: layoutSystems().map(x => x.measures.length).join(','), paperW: document.getElementById('paper').clientWidth, fw: document.body.classList.contains('fixwide'),
          k: +(sv.getBoundingClientRect().width / sv.viewBox.baseVal.width).toFixed(4) }; };
      const a = cap(true), c = cap(false);
      out[nm] = { a: Object.assign({}, a, { html: a.html.length }), c: Object.assign({}, c, { html: c.html.length }), same: a.html === c.html };
    }
    return out; }, PRE);

  /* ---------- D1 同一首谱 fixed / 非 fixed 逐字节相同 ---------- */
  await guard('D1 同谱同密度', async () => {
    const bad = [], seen = [];
    for (const [w, h] of [[1600, 900], [1920, 1080]]) {
      const pg = await open(w, h); const r = await capPair(pg); await pg._ctx.close();
      for (const nm of PRE) { const x = r[nm];
        if (!x || x.err) { bad.push(`${w} ${nm} ${x && x.err}`); continue; }
        const { a, c } = x;
        if (!(c.paperW === 900 && a.fw && !c.fw)) bad.push(`${w} ${nm} 前提（非固定 #paper=900、固定挂 fixwide）不成立 ${JSON.stringify({ pa: a.paperW, pc: c.paperW, fa: a.fw, fc: c.fw })}`);
        if (!(a.PAGE_W === c.PAGE_W && a.PAGE_W === FA4 && a.sys === c.sys && a.vb === c.vb && x.same))
          bad.push(`${w} ${nm} 固定 ${a.PAGE_W}/${a.bars}/${a.vb} vs 非固定 ${c.PAGE_W}/${c.bars}/${c.vb} innerHTML 相同=${x.same}`);
        seen.push(`${w} ${nm.replace(/（.*/, '')}:${a.bars}·k${a.k}/${c.k}`);
      }
    }
    T(bad.length === 0, 'D1 同一首谱（歌谱带词 / 吉他弹唱 TAB＋简谱 / 钢琴伴奏大谱表）在 1600 / 1920（#paper 900）下固定版宽与非固定 PAGE_W 相同（＝FIXED_A4）、断行相同、#score viewBox 与 innerHTML 逐字节相同',
      bad.join(' | ') || seen.join(' ; '));
  });

  /* ---------- D2 真实新建 vs 真实导入（7 视口 × 3 用途） ---------- */
  const VPS = [[1280, 800], [1366, 768], [1440, 900], [1536, 864], [1600, 900], [1920, 1080], [2560, 1440]];
  const SC = ['vocal', 'gtr', 'pacc'];
  const res = {}, d3 = {};
  await guard('D2 新建 vs 导入', async () => {
    /* 每个视口：3 个用途各一个全新窗口（D7 自动收起每窗口只一次）＋ 1 个导入窗口；两个视口并行（各自独立上下文，断言全是几何量） */
    const runVp = async ([w, h]) => {
      res[w] = {};
      for (const sc of SC) {
        const pg = await open(w, h, 'new=' + sc + '&key=C&meter=4/4&bars=' + NB + '&title=' + encodeURIComponent('同一首谱'));
        const panel = await pg.evaluate(() => !!document.querySelector('.nf-modal [data-scene]'));
        await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
        await pg.evaluate(() => { try { toastHide(); } catch (_) {} const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
        await pg.evaluate(FILL, [sc, MEL]); await pg.waitForTimeout(450);
        const A = await geo(pg); A.panel = panel;
        if (sc === 'vocal') {
          /* D3：默认状态 → 用户再打开左栏（真实点左轨「小节」页签）→ 再收 → 再开 */
          const x = { g0: A };
          if (A.flyH) {
            await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(500); x.g1 = await geo(pg);
            await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(500); x.g2 = await geo(pg);
            await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(500); x.g3 = await geo(pg);
          }
          d3[w] = x;
        }
        /* 同一首谱去掉 fixed 另开一页签（导入 / 存量口径），同一窗口同一面板状态 */
        const sj = await pg.evaluate(() => JSON.stringify(song));
        await pg.evaluate(sj => { const s = JSON.parse(sj); delete s.id; s.layout = Object.assign({}, s.layout || {}); delete s.layout.fixed; addDoc(s); }, sj);
        await pg.waitForTimeout(700);
        let A2 = await geo(pg); const A2raw = { flyH: A2.flyH, bars: A2.bars };
        /* 切页签会按图层重开左栏：新建谱左栏是 D7 收起的，这里用左栏自带「收起」钮把面板状态对齐后再比密度 */
        if (A.flyH && !A2.flyH) { await pg.click('#fly-close'); await pg.waitForTimeout(600); A2 = await geo(pg); }
        res[w][sc] = { A, A2, A2raw, sj };
        await pg._ctx.close();
      }
      /* 真实导入：新建面板「导入」页签 → 选 .mid → MIDI 对话框「导入」；随后同一窗口打开三首同谱的非固定版本（导入默认面板状态） */
      const pi = await open(w, h);
      await pi.click('#b-new'); await pi.waitForSelector('.nf-modal [data-scene]'); await pi.click('.nf-tabs [data-v="import"]'); await pi.waitForSelector('#nf-isrc');
      const [fc] = await Promise.all([pi.waitForEvent('filechooser', { timeout: 3000 }), pi.click('#nw-import')]);
      await fc.setFiles({ name: '同一首谱.mid', mimeType: 'audio/midi', buffer: MIDI }); await pi.waitForTimeout(500);
      await pi.click('#mi-go'); await pi.waitForTimeout(900);
      await pi.evaluate(() => { try { toastHide(); } catch (_) {} });
      const I = await geo(pi); I.title = await pi.evaluate(() => song.title);
      res[w].imp = I;
      for (const sc of SC) {
        await pi.evaluate(sj => { const s = JSON.parse(sj); delete s.id; s.layout = Object.assign({}, s.layout || {}); delete s.layout.fixed; addDoc(s); }, res[w][sc].sj);
        await pi.waitForTimeout(700);
        res[w][sc].B = await geo(pi);
        delete res[w][sc].sj;
      }
      await pi._ctx.close();
    };
    const queue = VPS.slice();
    await Promise.all([0, 1].map(async () => { while (queue.length) await runVp(queue.shift()); }));
    const bad = [], seen = [], info = [];
    const mx = a => Math.max(...a);
    for (const [w] of VPS) { const I = res[w].imp;
      if (I.fixed || I.n !== NB || I.dig < 16.5) bad.push(`${w} 真实导入异常 ${JSON.stringify({ fixed: I.fixed, n: I.n, dig: I.dig, title: I.title })}`);
      for (const sc of SC) { const { A, A2, B } = res[w][sc];
        if (!A.panel || !A.fixed || A.n !== NB || A.docs < 1) { bad.push(`${w} ${sc} 深链新建异常 ${JSON.stringify({ panel: A.panel, fixed: A.fixed, n: A.n })}`); continue; }
        if (A.digFs !== 17 || B.digFs !== 17 || I.digFs !== 17) bad.push(`${w} ${sc} 简谱数字刻版字号不是 17（${A.digFs}/${B.digFs}/${I.digFs}）`);
        /* 字号：新建谱 ≥ 0.95 × 导入谱（真实 MIDI 导入 / 同谱导入口径，二者各自默认面板状态） */
        if (!(A.dig >= 0.95 * I.dig && A.dig >= 0.95 * B.dig)) bad.push(`${w} ${sc} 数字 ${A.dig}px < 0.95×导入 ${I.dig}/${B.dig}px`);
        /* 密度：同一窗口同一面板状态下，新建谱每行小节 ≤ 同谱导入口径 */
        if (!(mx(A.bars) <= mx(A2.bars) && A.bars.length >= A2.bars.length && A2.flyH === A.flyH))
          bad.push(`${w} ${sc} 每行小节 新建 ${A.bars} > 导入口径 ${A2.bars}（左栏 ${A.flyH ? '收' : '开'}/${A2.flyH ? '收' : '开'}）`);
        seen.push(`${w}${sc[0]}:${A.dig}/${B.dig}px ${mx(A.bars)}/${mx(A2.bars)}`);
        info.push(`${w}${sc[0]} 默认面板：新建 ${A.bars.join(',')}（左栏${A.flyH ? '收' : '开'} k${A.k}）导入 ${B.bars.join(',')}（左栏${B.flyH ? '收' : '开'}）· 同窗切页签 ${res[w][sc].A2raw.bars.join(',')}（左栏${res[w][sc].A2raw.flyH ? '收' : '开'}）`);
      }
    }
    T(bad.length === 0, 'D2 真实新建（深链 vocal / gtr / pacc ＋ 回车）vs 真实 MIDI 导入，7 种桌面视口默认面板：新建谱数字字号 ≥ 导入谱 0.95 倍；同谱同面板每行小节 ≤ 导入口径',
      bad.join(' | ') || seen.join(' '));
    console.log('   （参考：默认面板状态下各自断行——1280–1440 新建谱左栏按 D7 收起、导入谱左栏停靠，行宽不同不直接比）\n   ' + info.join('\n   '));
  });

  /* ---------- D3 D7 自动收起 ---------- */
  await guard('D3 D7', async () => {
    const bad = [], seen = [];
    for (const w of [1366, 1440]) { const x = d3[w]; if (!x) { bad.push(w + ' 无数据'); continue; }
      const { g0, g1, g2, g3 } = x;
      if (!(g0.flyH && g0.auto === true && !g0.tight && g0.k >= DOCK && g0.clipped === 0 && !g0.xs)) bad.push(`${w} 默认 ${JSON.stringify({ flyH: g0.flyH, auto: g0.auto, tight: g0.tight, k: g0.k, c: g0.clipped })}`);
      if (!g1 || !(!g1.flyH && g1.tight && g1.flyPos === 'fixed' && g1.svgW >= g0.svgW - 2 && g1.clipped === 0)) bad.push(`${w} 再打开 ${JSON.stringify(g1 && { flyH: g1.flyH, tight: g1.tight, pos: g1.flyPos, w: g1.svgW, w0: g0.svgW, c: g1.clipped })}`);
      if (!g2 || !g2.flyH) bad.push(`${w} 再收 ${JSON.stringify(g2 && { flyH: g2.flyH })}`);
      if (!g3 || !(!g3.flyH && g3.tight && g3.svgW >= g0.svgW - 2)) bad.push(`${w} 再开（不应二次自动收起）${JSON.stringify(g3 && { flyH: g3.flyH, tight: g3.tight, w: g3.svgW })}`);
      const I = res[w] && res[w].imp;
      if (!I || I.flyH || I.tight || I.auto) bad.push(`${w} 导入谱触发了收起 ${JSON.stringify(I && { flyH: I.flyH, tight: I.tight, auto: I.auto })}`);
      seen.push(`${w}:收起 k${g0.k}→浮层 ${g1 && g1.svgW}/${g0.svgW}`);
    }
    for (const w of [1536, 1600, 1920]) { const x = d3[w]; const g0 = x && x.g0;
      if (!g0 || !(!g0.flyH && !g0.tight && g0.auto === false && g0.k >= DOCK && g0.clipped === 0)) bad.push(`${w} 不应收起 ${JSON.stringify(g0 && { flyH: g0.flyH, auto: g0.auto, k: g0.k })}`);
      else seen.push(`${w}:停靠 k${g0.k}`);
    }
    T(bad.length === 0, `D3 D7：1366 / 1440 新建谱左栏自动收起一次、显示 ≥${DOCK}；再打开＝浮层不挤窄谱面、不二次收起；1536 / 1600 / 1920 停靠不收起且 ≥${DOCK}；导入谱不触发`,
      bad.join(' | ') || seen.join(' ; '));
  });

  /* ---------- D4 打印 ---------- */
  await guard('D4 打印', async () => {
    const MK = `window.mkLong=()=>{ const s=createSong('vocal',{title:'长谱',key:'C',beats:4,unit:4,nMea:40,nVox:1,lyr:1});
      s.measures.forEach((m,mi)=>m.voxes[0].forEach((c,i)=>{ c.deg=[1,2,3,5][(i+mi)%4]; c.lyrics=['啦']; })); s.layout=Object.assign({}, s.layout||{}, {fixed:true}); return s; }; true`;
    const pw = await open(1920, 1080); await pw.evaluate(MK);
    const wide = await pw.evaluate(() => { hideStartPad(); loadSong(mkLong()); blurSel = true; render(); return { PAGE_W, sys: layoutSystems().map(x => x.measures.map(m => m.mi).join(',')).join('|') }; });
    await pw._ctx.close();
    const pg = await open(1280, 800); await pg.evaluate(MK);
    const r = await pg.evaluate(() => { hideStartPad(); loadSong(mkLong()); blurSel = true; render();
      const sv = document.getElementById('score'), scr = { PAGE_W, w: +sv.getAttribute('width') };
      window.dispatchEvent(new Event('beforeprint'));
      const during = { PAGE_W, sys: layoutSystems().map(x => x.measures.map(m => m.mi).join(',')).join('|'), fw: document.body.classList.contains('fixwide') };
      window.dispatchEvent(new Event('afterprint')); return { scr, during }; });
    await pg.waitForTimeout(400); r.after = await pg.evaluate(() => ({ PAGE_W, w: +document.getElementById('score').getAttribute('width'), fw: document.body.classList.contains('fixwide') }));
    await pg._ctx.close();
    T(r.during.PAGE_W === 870 && r.during.PAGE_W === FA4 && wide.PAGE_W === FA4 && r.during.sys === wide.sys && !r.during.fw && r.after.fw && r.after.w === r.scr.w,
      'D4 打印：固定版宽谱 1280 窗口 beforeprint 时 PAGE_W=870（＝FIXED_A4）、断行与 1920 屏幕一致、打印期间不挂 fixwide，打印后回屏幕显示',
      JSON.stringify({ scr: r.scr, during: { PAGE_W: r.during.PAGE_W, fw: r.during.fw, sameSys: r.during.sys === wide.sys, n: r.during.sys.split('|').length }, after: r.after, wide: wide.PAGE_W }));
  });

  /* ---------- D5 手机 / 观看页 / 谱架 ---------- */
  await guard('D5 手机 / 观看页 / 谱架', async () => {
    const bad = [], seen = [];
    /* 手机 390：窄屏重排、固定版宽与否逐字节相同 */
    { const pg = await open(390, 844, '', { mob: true });
      const r = await pg.evaluate((nm) => { try { hideStartPad(); } catch (_) {}
        const base = migrate(PRESETS.find(p => p.name === nm).make());
        const cap = fx => { const s = JSON.parse(JSON.stringify(base)); s.layout = Object.assign({}, s.layout || {}); if (fx) s.layout.fixed = true; else delete s.layout.fixed;
          loadSong(s); blurSel = true; render(); const sv = document.getElementById('score');
          return { PAGE_W, html: sv.innerHTML, svgW: +sv.getAttribute('width'), fw: document.body.classList.contains('fixwide'), docW: document.documentElement.scrollWidth, vw: innerWidth }; };
        const a = cap(true), c = cap(false); return { a: Object.assign({}, a, { html: a.html.length }), c: { PAGE_W: c.PAGE_W }, same: a.html === c.html }; }, PRE[0]);
      await pg._ctx.close();
      if (!(!r.a.fw && r.a.PAGE_W < FA4 && r.a.svgW <= 390 && r.a.docW <= r.a.vw && r.same && r.a.PAGE_W === r.c.PAGE_W)) bad.push('手机 390 ' + JSON.stringify(r));
      else seen.push(`手机 PAGE_W ${r.a.PAGE_W}`); }
    /* 观看页 1920（固定版宽谱） */
    { const pg = await open(1920, 1080);
      const r = await pg.evaluate((nm) => { hideStartPad(); const s = migrate(PRESETS.find(p => p.name === nm).make()); s.layout = Object.assign({}, s.layout || {}, { fixed: true });
        enterShareViewer({ song: s }); render(); const P = document.getElementById('paper'), sv = document.getElementById('score');
        return { fw: document.body.classList.contains('fixwide'), viewer: document.body.classList.contains('viewer'), pw: P.clientWidth, PAGE_W,
          k: +(sv.getBoundingClientRect().width / sv.viewBox.baseVal.width).toFixed(4), svgW: +sv.getAttribute('width') }; }, PRE[0]).catch(e => ({ err: e.message }));
      await pg._ctx.close();
      /* 观看页不挂 fixwide：显示＝min(1, 可视宽/版宽)（v67.6 为 816/1060≈0.77），此版不得更小、也不放大超纸 */
      const kFit = Math.min(1, (r.pw - 4) / FA4);
      if (r.err || r.fw || !r.viewer || r.pw > 900 || r.PAGE_W !== FA4 || r.k > 1.0001 || Math.abs(r.k - kFit) > 0.006 || r.k < DOCK || r.svgW > r.pw) bad.push('观看页 ' + JSON.stringify(Object.assign({ kFit: +kFit.toFixed(4) }, r)));
      else seen.push(`观看页 k${r.k}`); }
    /* 谱架 1920（真实新建 → 谱架钮） */
    { const pg = await open(1920, 1080, 'new=vocal&bars=' + NB);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(900); await pg.evaluate(FILL, ['vocal', MEL]); await pg.waitForTimeout(300);
      await pg.click('#b-stand'); await pg.waitForTimeout(900);
      const r = await pg.evaluate(() => { const P = document.getElementById('paper'), sv = document.getElementById('score');
        return { stand: document.body.classList.contains('stand'), fixed: !!(song.layout || {}).fixed, PAGE_W, pw: P.clientWidth, svgW: +sv.getAttribute('width'),
          k: +(sv.getBoundingClientRect().width / sv.viewBox.baseVal.width).toFixed(4), docW: document.documentElement.scrollWidth, vw: innerWidth }; });
      await pg.click('#sb-exit').catch(() => {}); await pg.waitForTimeout(500);
      const back = await pg.evaluate(() => ({ stand: document.body.classList.contains('stand'), fw: document.body.classList.contains('fixwide') }));
      await pg._ctx.close();
      /* v67.7 收尾验收 OUT-4：谱架纸宽 min(1060,94vw) 比版宽 870 宽——固定版宽谱放大铺满（谱纸 ≥ 纸宽 −8；修前 870/1060，两侧各空 95px） */
      if (!(r.stand && r.fixed && r.PAGE_W === FA4 && r.svgW <= r.pw + 1 && r.svgW >= Math.min(r.pw - 8, Math.floor(FA4 * (C.FMAX || 1.25)) - 2) && r.k >= 0.95 && r.docW <= r.vw && !back.stand && back.fw)) bad.push('谱架 ' + JSON.stringify({ r, back }));
      else seen.push(`谱架 k${r.k}`); }
    T(bad.length === 0, `D5 手机 390 仍窄屏重排（固定版宽与否逐字节相同）；观看页不挂 fixwide、#paper≤900、显示＝适配纸宽（≥${DOCK}、≤1）；谱架固定版宽、不横溢、铺满谱架纸宽（收尾 OUT-4）`,
      bad.join(' | ') || seen.join(' ; '));
  });

  /* ======================= v67.7 收尾验收补（修前副本 scratchpad/v677/prefix.html 红 / 修后绿） ======================= */
  /* 真实 UI 新建：顶栏「新建」→ 面板选「歌谱」→「创建」，再填同一份内容 */
  const uiNew = async (pg) => {
    await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]');
    await pg.click('.nf-modal [data-scene="vocal"]'); await pg.click('#nw-create'); await pg.waitForTimeout(900);
    await pg.evaluate(() => { try { toastHide(); } catch (_) {} const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    await pg.evaluate(FILL, ['vocal', MEL]); await pg.waitForTimeout(450);
  };
  const lbGeo = pg => pg.evaluate(() => { const w = document.getElementById('lb-wrap'), sv = document.getElementById('score'), P = document.getElementById('paper');
    const q = w && getComputedStyle(w).display !== 'none' ? w.getBoundingClientRect() : null, R = sv.getBoundingClientRect(), pr = P.getBoundingClientRect();
    return { lb: q ? [Math.round(q.left), Math.round(q.right)] : null, sv: [Math.round(R.left), Math.round(R.right)], pp: [Math.round(pr.left), Math.round(pr.right)],
      svgW: +sv.getAttribute('width'), paperW: P.clientWidth, xs: P.classList.contains('paper-xs'), hbar: !!(document.getElementById('paper-hbar') || { classList: { contains: () => false } }).classList.contains('on') }; });

  /* ---------- D6（收尾 D1）刷新后 D7 不被开机渲染用掉 ---------- */
  await guard('D6 刷新后 D7', async () => {
    const bad = [], seen = [];
    for (const [w, h] of [[1366, 768], [1440, 900]]) {
      /* a) 新建谱 → 刷新 → 启动台「继续上次编辑」：当场自动收起左栏、数字 ≥17px；第一次点谱面不再整谱跳变 */
      const pg = await open(w, h); await uiNew(pg);
      await pg.evaluate(() => { song.title = '继续这首'; try { persist(); persistFlush(); } catch (_) {} }); await pg.waitForTimeout(300);
      await pg.reload(); await pg.waitForTimeout(1200);
      await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
      const boot = await pg.evaluate(() => ({ auto: FLY_AUTO_CLOSED, pad: startPadOn(), tight: document.body.classList.contains('paper-tight') }));
      await pg.click('#spd-cont'); await pg.waitForTimeout(800);
      const g0 = await geo(pg);
      const pt = await pg.evaluate(() => { const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, b = colBoxes['v0:1:0'];
        return b ? { x: R.left + (b.x + b.w / 2) * k, y: R.top + (b.y + b.h / 2) * k } : null; });
      if (pt) { await pg.mouse.click(pt.x, pt.y); await pg.waitForTimeout(500); }
      const g1 = await geo(pg), s1 = await pg.evaluate(() => ({ mi: sel.mi, ci: sel.ci }));
      await pg._ctx.close();
      if (!(boot.pad && boot.auto === false && !boot.tight)) bad.push(`${w} 开机就用掉了自动收起 ${JSON.stringify(boot)}`);
      if (!(g0.flyH && g0.auto === true && !g0.tight && g0.dig >= 17 && g0.clipped === 0)) bad.push(`${w} 继续上次编辑 ${JSON.stringify({ flyH: g0.flyH, auto: g0.auto, tight: g0.tight, dig: g0.dig, k: g0.k })}`);
      if (!(pt && g1.svgW === g0.svgW && g1.flyH === g0.flyH && g1.tight === g0.tight && s1.mi === 1)) bad.push(`${w} 首击谱面跳变 ${JSON.stringify({ w0: g0.svgW, w1: g1.svgW, flyH: g1.flyH, tight: g1.tight, sel: s1 })}`);
      /* b) 刷新后从启动台再新建：左栏自动收起，不是浮层盖住行首 */
      const pb = await open(w, h); await uiNew(pb);
      await pb.evaluate(() => { song.title = '继续这首'; try { persist(); persistFlush(); } catch (_) {} }); await pb.waitForTimeout(300);
      await pb.reload(); await pb.waitForTimeout(1200);
      await pb.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
      await uiNew(pb); const g2 = await geo(pb); await pb._ctx.close();
      if (!(g2.flyH && !g2.tight && g2.auto === true && g2.dig >= 17)) bad.push(`${w} 刷新后新建 ${JSON.stringify({ flyH: g2.flyH, tight: g2.tight, auto: g2.auto, dig: g2.dig })}`);
      seen.push(`${w}: 继续 ${g0.dig}px 首击 ${g0.svgW}→${g1.svgW} · 刷新后新建 ${g2.dig}px 左栏${g2.flyH ? '收' : '开'}`);
    }
    /* c) 不出启动台的直达（?wxlogin 回跳）：开机首帧不做 D7，DOMContentLoaded 补排一次——上次编辑的新建谱同样当场收起 */
    { const pc = await open(1366, 768); await uiNew(pc);
      await pc.evaluate(() => { song.title = '继续这首'; try { persist(); persistFlush(); } catch (_) {} }); await pc.waitForTimeout(300);
      await pc.goto(URL0 + '?wxlogin=ok'); await pc.waitForTimeout(1500);
      const g3 = await geo(pc), pad = await pc.evaluate(() => startPadOn()); await pc._ctx.close();
      if (!(!pad && g3.fixed && g3.flyH && g3.auto === true && g3.dig >= 17)) bad.push(`1366 ?wxlogin 直达 ${JSON.stringify({ pad, fixed: g3.fixed, flyH: g3.flyH, auto: g3.auto, dig: g3.dig })}`);
      else seen.push(`1366 ?wxlogin 直达 ${g3.dig}px 左栏收`); }
    T(bad.length === 0, 'D6（收尾 D1）刷新后：开机渲染不占用「自动收起一次」；继续上次编辑的新建谱 1366 / 1440 当场收起左栏、数字 ≥17px、首击谱面不跳变；刷新后再新建同样收起而非浮层盖住行首；?wxlogin 直达同样收起',
      bad.join(' | ') || seen.join(' ; '));
  });

  /* ---------- D7（收尾 D2 / D5）纸面＝谱纸、谱型条对齐、110% 即横滚；存着 0.8 缩放也按适配底数收起左栏 ---------- */
  await guard('D7 纸面与谱型条', async () => {
    const bad = [], seen = [];
    for (const [w, h, ls, nm] of [[1920, 1080, null, '1920 停靠'], [1600, 900, { 'musetab-flyclosed': '1' }, '1600 收起'], [1920, 1080, { 'musetab-zoom-fw': '0.8' }, '1920 缩放 0.8']]) {
      const pg = await open(w, h, '', { ls }); await uiNew(pg);
      const a = await lbGeo(pg), g = await geo(pg);
      const al = a.lb && Math.abs(a.lb[0] - a.sv[0]) <= 1 && Math.abs(a.lb[1] - a.sv[1]) <= 1;
      if (!al) bad.push(`${nm} 谱型条 ${JSON.stringify(a.lb)} ≠ 谱纸 ${JSON.stringify(a.sv)}`);
      if (!ls || !ls['musetab-zoom-fw']) {
        if (!(a.paperW <= a.svgW + 8 && g.k >= (C.FMAX || 1.25) - 0.005)) bad.push(`${nm} 纸面 ${a.paperW} 比 100% 谱纸 ${a.svgW} 宽（k ${g.k}）`);
        await pg.click('#z-in'); await pg.waitForTimeout(400); const b2 = await lbGeo(pg);
        if (!(b2.xs && b2.hbar && b2.svgW > b2.paperW)) bad.push(`${nm} 110% 未横滚 ${JSON.stringify(b2)}`);
      }
      seen.push(`${nm}: 谱纸 ${a.sv} 谱型条 ${a.lb} 纸面 ${a.paperW}`);
      await pg._ctx.close();
    }
    /* D5：存着 musetab-zoom-fw 0.8 的 1366 新建谱——D7 按适配底数判，照样收起左栏（修前停靠 62.6%） */
    { const pg = await open(1366, 768, '', { ls: { 'musetab-zoom-fw': '0.8' } }); await uiNew(pg); const g = await geo(pg); await pg._ctx.close();
      if (!(g.flyH && g.auto === true && g.k >= 0.8 * DOCK - 0.005)) bad.push(`1366 缩放 0.8 ${JSON.stringify({ flyH: g.flyH, auto: g.auto, k: g.k, dig: g.dig })}`);
      else seen.push(`1366 缩放 0.8: 收起 k${g.k} ${g.dig}px`); }
    T(bad.length === 0, 'D7（收尾 D2 / D5）宽屏谱纸封顶 FIT_MAX 时 #paper 收到谱纸宽：谱型条与谱纸左右对齐（±1px，含用户缩小到 80%）、110% 一档即横滚；存着 80% 缩放的 1366 新建谱也自动收起左栏',
      bad.join(' | ') || seen.join(' ; '));
  });

  /* ---------- D8（收尾 OUT-1）曲首和弦图带每行个数按版心 ---------- */
  await guard('D8 曲首和弦图', async () => {
    const pg = await open(1440, 900);
    const CH = ['C', 'Dm7', 'Em', 'F', 'G7', 'Am', 'Bm7b5', 'E7', 'A7', 'D7', 'Fmaj7', 'Gsus4', 'Cmaj7', 'Am7'];
    const out = await pg.evaluate(([CH]) => { hideStartPad(); const res = [];
      for (const [nm, lay] of [['A4·100%', { page: 'A4', scale: 1 }], ['A4·130%', { page: 'A4', scale: 1.3 }], ['A4·150%', { page: 'A4', scale: 1.5 }], ['A5·100%', { page: 'A5', scale: 1 }], ['A5·150%', { page: 'A5', scale: 1.5 }]]) {
        const s = migrate(PRESETS.find(p => p.name === '小星星（分解弹唱）').make()); s.layout = Object.assign({}, s.layout || {}, lay, { fixed: true }); s.diagPos = 'top';
        let q = 0; s.measures.forEach(m => (m.tabs || []).forEach(v => (v || []).forEach(c => { if (c && c.chord) c.chord = CH[(q++) % CH.length]; })));
        loadSong(s); blurSel = true; render();
        const sv = document.getElementById('score'), R = sv.getBoundingClientRect(), k = R.width / sv.viewBox.baseVal.width, y0 = SYS_GEO[0].y0;
        const hd = sv.querySelector('[data-hd="meta"]'), hb = hd ? (+hd.getAttribute('y') + +hd.getAttribute('height')) : 0;
        let l = 1e9, r = -1e9, t = 1e9, b = -1e9; const ys = new Set();
        sv.querySelectorAll('text,line,circle').forEach(e => { if (e.closest('[data-hd]') || e.classList.contains('pageno')) return;
          const qq = e.getBoundingClientRect(); if (!qq.width && !qq.height) return;
          const tt = (qq.top - R.top) / k, bb = (qq.bottom - R.top) / k; if (tt < hb + 2 || bb > y0 - 2) return;
          l = Math.min(l, (qq.left - R.left) / k); r = Math.max(r, (qq.right - R.left) / k); t = Math.min(t, tt); b = Math.max(b, bb);
          if (e.tagName.toLowerCase() === 'text' && e.getAttribute('font-weight') === 'bold' && e.getAttribute('text-anchor') === 'middle') ys.add(e.getAttribute('y')); });
        res.push({ nm, W: PAGE_W, M: MARGIN, used: usedChords().length, l: +l.toFixed(1), r: +r.toFixed(1), rows: ys.size });
      }
      return res; }, [CH]);
    await pg._ctx.close();
    const bad = out.filter(x => !(x.used === 14 && x.l >= x.M - 0.5 && x.r <= x.W - x.M + 0.5));
    const one = out.find(x => x.nm === 'A4·100%');   // 版心放得下 14 个：仍是一行（与此前逐字节相同的那一档）
    if (!one || one.rows !== 1) bad.push({ nm: '一行', one });
    T(bad.length === 0, 'D8（收尾 OUT-1）曲首和弦图带 14 个和弦：A4 100% / 130% / 150%、A5 100% / 150% 下整带都在版心 [MARGIN, PAGE_W−MARGIN] 内（版心放不下就换行）；A4 100% 仍一行',
      JSON.stringify(bad.length ? bad : out.map(x => `${x.nm} W${x.W} [${x.l},${x.r}] ${x.rows}行`)));
  });

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
/* 突变实证（2026-10，MUSETAB_URL=v67.6 原版 scratchpad/v677/v676.html）：PASS 0/5（收尾补 D6–D8 后 0/8：D8 A4 150% / A5 伸出纸外，D6 / D7 同 prefix）——
   D1 红（1600 / 1920 三首同谱固定版宽 PAGE_W 1060 vs 非固定 870：《送别》6,6,4 vs 5,5,5,1、《小星星》5,5,5 vs 4,4,4,3、《卡农进行》4,4 vs 3,3,2，innerHTML 不同）
   D2 红（新建谱数字 1280 13.9px / 1366 15.28 / 1440 12.11 / 1536 13.65 / 1600 14.7 < 0.95×导入 17px；每行小节 6,6,4 > 同谱导入口径 5,5,5,1 / 4,4,4,4）
   D3 红（1366 收起后仅 0.899 < 0.9；1440 不收起、停靠 0.712；1536 / 1600 停靠 0.803 / 0.863 < 0.9）
   D4 红（打印 PAGE_W 1060 ≠ 870）；D5 红（观看页显示 0.80、848px 超出 820px 纸宽）
   v67.7 工作区（收尾前）：PASS 5/5。
   收尾修复前副本（scratchpad/v677/prefix.html，即 b66a409）：PASS 4/8——
   D5 红（谱架 svg 870 / 纸宽 1060，k 1.0）
   D6 红（1366 / 1440 刷新后开机即 FLY_AUTO_CLOSED=true；继续上次编辑停靠 13.31 / 14.75px；首击谱面 681→953 / 755→1027 且变浮层；刷新后新建＝浮层 paper-tight）
   D7 红（1920 停靠谱型条 [367,1606] vs 谱纸 [443,1531]、纸面 1239 比谱纸 1088 宽、110% 不横滚；1600 收起谱型条 [95,1286] vs [147,1235]；
          0.8 缩放谱型条 [367,1606] vs [552,1422]；1366 存 0.8 不收起、k 0.626 / 10.65px）
   D8 红（14 个和弦：A4 130% [−14.6, 676.8] / 150% [−59.1, 632.3]、A5 100% [−42.6, 648.8] / 150% [−144.6, 546.7] 伸出纸外，均一行）
   收尾修复后：PASS 8/8。 */
