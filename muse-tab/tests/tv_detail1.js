/* v45.6 细节批次1 回归（几何断言优先）：
   T1 TAB 闷音 × 放大到 15（含描边），打板 × 放大到 16
   T2 TAB 休止符改用 SMuFL 字形（谱面不再出现 Unicode 𝄻𝄼𝄽𝄾𝄿𝅀 文本休止）
   T3 拍弦=框内×：col.slap 列画方框 + 列内音符一律记 ×（不再显示品位数字）
   T4 联排(五线谱+TAB)间距按音域自适应：低音下加线时 谱表底线→TAB顶线 间隙 ≥ 24px
   T5 小节内换谱号：col.clef='bass' 后同一音（C4）谱面位置上移 45px（treble→bass 恰好 12 谱级×3.75），
      且该小节布局宽度增加 ≥15px（小谱号占位）
   T6 换谱号 MusicXML 往返：导出含 ≥2 个 <clef>，导入还原 col.clef='bass'
   T7 右栏信息卡补齐：作词/作曲/制谱/调弦/谱类·小节数 同步显示，空值行隐藏
   ---- v45.7 细节批次2 ----
   T8 和弦图横按判定收紧：Em(022000) 两邻弦同品不再画横杠、Bm(x24432) 跨 4 弦距仍画横杠
   T9 联排像素级间距：低音下加线深度(26.25px)+边距 → gap≥36；高弦推弦装饰 → gap≥30
   T10 联排低音谱号（song.tabClef='bass'）：低音入谱表 gap 回落、高音上加线区向上扩
   T11 面板重组：b-notation 入记谱法组、技巧含哑音无下推弦、tn-clef 按钮存在、techFromBar('mute') 翻转 n.x
   ---- v45.8 细节批次3 ----
   T12 行首小节号右对齐收进左页边距（text-anchor=end、x<MARGIN、贴谱表顶线）
   T13 系统左端连线：联排(五线谱+TAB) 行首竖线贯通两谱行（x=MARGIN 跨度≥80）；弹唱(TAB+简谱)同样相连
   T14 TAB 全空小节居中画一个全休止（不再逐列落在列位；部分空列仍逐列画）
   ---- v45.9 细节批次4 ----
   T15 行首连线无同位双绘（色差根因）：x=56 的竖线恰好 1 条（连线接管各谱行行首线）；单 TAB 行仍 1 条自身行首线
   T16 TAB 字母移入谱表内（x=oxH+9=65，不再悬在页边距 oxH-11=45）
   ---- v46.0 细节批次5 ----
   T17 联排谱号下「8」缀隐藏（记谱 +12 不变——低音空弦仍下加 2 线）
   T18 v46.1 泛音固定正菱形（一律宽 14px）+ 两位数品位数字缩号自适应（10.5→8）
   T19 Ctrl+点击小节线多选：首点选中单小节整声部、再点扩展为连续小节范围
   T20 行首小节线热区左延至系统起始线（barzone x=oxH-4=52）
   ---- v46.1 细节批次6 ----
   T21 泛音类归组：EB_TECHS 自然泛音 N.H. 排尾部（清除前）、EB_GTECH 人工泛音三键置首
   T22 泛音菱形不变量：hmT 人工泛音同样带菱形框 + A.H. 标注
   ---- v46.2 ----
   T23 右栏「智能」页签排第一位（data-p=ai 为 #rtabs 首个按钮；默认激活仍为信息页）
   ---- v46.3 ----
   T24 智能预提示按选中对象切换：TAB 音符/五线谱音符/简谱音符/整小节/小节线 五种上下文标题各不同，
       且含可点 rib: 直达项与次级「整体建议」段
   ---- v46.4 ----
   T25 右栏四页签（智能·创作·信息·库）：创作栏承接创作辅助+导入互操作，光标位置卡移入智能栏
   T26 光标卡音符可编辑信息：选中音符显示 弦/品/技法 + 可改项（时值/附点/…）+ 和弦
   ---- v46.5 ----
   T27 启动台（新开页面）：#start-pad 可见、含 新建/打开/导入/我的 四卡、左栏收起、谱面隐藏
   T28 启动台交互：点「新建」→ 启动台关闭 + 新建向导弹出 + 左栏恢复；loadSong 亦关闭启动台
   ---- v46.6 ----
   T29 音符图层：顶栏 音符(原编辑)/时值/节奏 三组收纳入左栏 note 层，时值点击生效、后插生效
   T30 连音线回归谱类记号层：顶栏记号组无 eb-tie；TAB 记号层 b-tie-t 点击建立 n.tk 连音线
   T31 启动台默认页（并入 T27 页）：右栏停智能页+欢迎提示、光标卡「—」、左栏无选中高亮
   ---- v46.7 ----
   T32 顶栏撤销：音符/时值/节奏拆三独立图层（各开各面板）、连音入两谱类记号层、
       缩放入左栏 rail-zoom、节拍状态入播放条、新版外壳 #editbar 隐藏、右栏序 智能·库·创作·信息
   ---- v68.2 切默认（flow）：全套用例跑两遍——先旧外壳（?shell=classic，原断言逐字不变），再默认外壳（flow，标 [flow]）。
   刻版 / 数据 / 交互函数类用例两遍同一断言；只有下面几条断言旧外壳结构的部分在 flow 遍换成新外壳口径（意图不变）：
     T25 右栏：旧「创作」页卡片（#rtabs / .rcard[data-rt]）→ flow 右栏「属性」页含 #cursor-info 与 #em-toggle、时值检查 #beat-box 在状态栏、无旧页签条（另见 tv_modes M10a、tv_emode E1）
     T32 顶栏：编辑行可见 / 连音在记号层 / 无顶栏记号组照旧；缩放 #eb-zoom 与时值检查 #beat-box 在 flow 是状态栏（#mixer-dock），不判「缩放在 #editbar / 时值在右栏」
     T33 行 2 不溢出视口照旧；「节奏 7 组合全铺开 / 经典版 4+更多」是旧顶栏布局，flow 行 2 收键见 tv_shellflow S9
     T38 刻版三项（行首连体线 x=56 / 单行歌谱无起始线 / 合唱只有连体线）照旧；节奏组铺开与经典紧凑两项是旧顶栏布局（同上 S9）
     T40 音符输入组九项照旧；撤销段位置：flow 在行 2 #editbar 行首（tv_modes M21），不判旧外壳的「节奏组之后 / 经典版进主栏」
     T41 三语境音符组照旧；排序：六线谱语境 0–9 → 10–24▾ → ×；五线谱语境 flow 按音名 C→B 排、带级数角标（v68.1 方案，tv_modes M11）。
         v68.2 收尾 ENG-10 ③：此前 flow 的行 2 键标签只在 render 钩子（FLOW.sync）里刷新，flow 遍在读排序前补了一次 render() 绕过；
         现在 syncInputs 末尾跟着刷新行 2 语境与换键（FLOW.r2 / FLOW.r2k.sync），去掉这两处 render()，与旧外壳同样只调 syncInputs */
const { chromium } = require('playwright');
const F0 = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
const RUNS = [['旧外壳', F0 + (F0.includes('?') ? '&' : '?') + 'shell=classic', false], ['flow', F0, true]];
(async () => {
 let PASS = 0, TOTAL = 0, ERRN = 0;
 for (const [TAG, F, FLOWM] of RUNS) {
  console.log('—————— ' + TAG + ' ——————');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + (FLOWM ? '[flow] ' : '') + name + (d ? ': ' + d : '')); };
  const isFlow = await pg.evaluate(() => document.body.classList.contains('flow'));
  T(isFlow === FLOWM, '外壳前提：' + TAG + (FLOWM ? '（不带参数＝body.flow）' : '（?shell=classic）'), String(isFlow));

  // T1 TAB 闷音 ×=15 / 打板 ×=16
  const t1 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [
      { dur: 4, notes: [{ s: 3, f: 2, x: 1 }] },
      { dur: 4, notes: [], perc: 'bass' },
      { dur: 2, notes: [{ s: 1, f: 3 }] },
    ];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    const mut = /font-size="15"[^>]*>×</.test(svg);
    const perc = /font-size="16"[^>]*>×</.test(svg);
    const noOld = !/font-size="12\.5"[^>]*>×</.test(svg) && !/font-size="13"[^>]*>×</.test(svg);
    return { mut, perc, noOld };
  });
  T(t1.mut && t1.perc && t1.noOld, 'T1 闷音×15/打板×16', JSON.stringify(t1));

  /* T2 TAB 休止的表达方式，三版口径叠加后的现状：
     · v45.6 起画 SMuFL 休止字形 → v60.60 撤掉 → **v60.64 产品指示「恢复休止字形」画回来**；
     · v60.63：时值线只画在「本拍里有发声」的列上（单独占一拍的休止不画线）。
     所以本例：四个休止各有一枚字形（附点休止连附点一起，时值可辨），
     而符干只有首列那个发声的四分音符一根。 */
  const t2 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [
      { dur: 4, notes: [{ s: 5, f: 3 }] },
      { dur: 4, notes: [] },                    // 四分休止
      { dur: 8, notes: [] }, { dur: 8, notes: [] },   // 八分休止×2
      { dur: 4, dotted: true, notes: [] },      // 附点四分休止
    ];
    loadSong(s); blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    const restGlyphs = document.querySelectorAll('#score path[transform]').length;
    /* v60.71 符干减重到 0.85、小节线仍是 1 —— 线径已唯一锁定符干，
       旧的「按最左竖线定谱表底线再按 y2 剔小节线」启发式随之作废 */
    const stems = [...document.querySelectorAll('#score line')].filter(x =>
      Math.abs(+x.getAttribute('x1') - +x.getAttribute('x2')) < 0.3
      && +x.getAttribute('stroke-width') === 0.85
      && Math.abs(+x.getAttribute('y2') - +x.getAttribute('y1')) > 3).length;
    const dot = /circle[^>]*r="1\.6"/.test(svg);
    return { noUni: !/[𝄻𝄼𝄽𝄾𝄿𝅀]/.test(svg), restGlyphs, stems, dot };
  });
  /* 首列是发声的四分音符 → 1 根符干；其余四列都是独占一拍的休止 → 一根不画。
     附点也随之不画（附点是画在时值线上的，没有线就没有点）——这是 v60.63 口径的直接后果。 */
  T(t2.noUni && t2.restGlyphs === 4 && t2.stems === 1 && t2.dot,
    'T2 TAB 休止画 SMuFL 字形（附点休止带点）；时值线只画在有发声的拍上', JSON.stringify(t2));

  // T3 拍弦=框内×
  const t3 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [
      { dur: 4, notes: [{ s: 5, f: 2 }, { s: 4, f: 2 }], slap: true },
      { dur: 4, notes: [{ s: 5, f: 2 }, { s: 4, f: 2 }] },
      { dur: 2, notes: [] },
    ];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    const nX = (svg.match(/font-size="15"[^>]*>×</g) || []).length;   // 拍弦列 2 音全记 ×
    const box = /<rect [^>]*rx="2"[^>]*stroke-width="1.1"/.test(svg); // 拍弦方框
    const digits = (svg.match(/font-size="10\.5"[^>]*>2</g) || []).length;  // 非拍弦列仍显示品位数字
    return { nX, box, digits };
  });
  T(t3.nX >= 2 && t3.box && t3.digits >= 2, 'T3 拍弦框内×(非拍弦列不受影响)', JSON.stringify(t3));

  // T4 联排间距：低音空弦(E2→treble-8vb 记谱 E3，下加线 2 层)时 谱表↔TAB 间隙自适应加大
  const t4 = await pg.evaluate(() => {
    const s = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.tabStaff = true;
    s.measures[0].tabs[0] = [
      { dur: 4, notes: [{ s: 6, f: 0 }] },   // E2 → 记谱 E3(step30) < 32 → 下加线区
      { dur: 4, notes: [{ s: 1, f: 0 }] },
      { dur: 2, notes: [] },
    ];
    loadSong(s);
    const M = sysMetrics(0, 0, 0, 0);
    const gap = M.tabTops[0] - M.tabStaffB[0];
    /* 高把位对照：无下加线音符时间隙回到基础值（仍 ≥14 保住 treble-8vb 的"8"缀） */
    song.measures[0].tabs[0] = [{ dur: 1, notes: [{ s: 1, f: 0 }] }];
    const gap0 = sysMetrics(0, 0, 0, 0).tabTops[0] - sysMetrics(0, 0, 0, 0).tabStaffB[0];
    return { gap: +gap.toFixed(1), gap0: +gap0.toFixed(1) };
  });
  T(t4.gap >= 24 && t4.gap0 >= 13 && t4.gap > t4.gap0 + 8, 'T4 联排谱表↔TAB 间距自适应', JSON.stringify(t4));

  // T5 小节内换谱号几何：C4 在 treble(下加一线) vs bass(上加一线) 位置差恰 45px；布局加宽
  const t5 = await pg.evaluate(() => {
    const s = createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 2, nVox: 1, lyr: 0 });
    s.voxNotations = ['staff'];
    const mk = () => [{ dur: 4, deg: 1 }, { dur: 4, deg: 1 }, { dur: 4, deg: 1 }, { dur: 4, deg: 1 }];
    s.measures[0].voxes[0] = mk(); s.measures[1].voxes[0] = mk();
    loadSong(s);
    noteSel = [{ row: 'vox', mi: 1, ci: 0, vi: 0 }]; render();
    const cy = () => { const c = document.querySelector('#score circle[r="8.5"]'); return c ? +c.getAttribute('cy') : null; };
    const w0 = measureLayout(song.measures[1]).w;
    const y0 = cy();
    song.measures[1].voxes[0][0].clef = 'bass'; render();
    const y1 = cy();
    const w1 = measureLayout(song.measures[1]).w;
    /* 第二小节第 2 列不再重复画谱号但沿用 bass 音位：cy 应与第 1 列一致 */
    noteSel = [{ row: 'vox', mi: 1, ci: 1, vi: 0 }]; render();
    const y2 = cy();
    noteSel = []; render();
    return { dy: +(y0 - y1).toFixed(1), dw: +(w1 - w0).toFixed(1), carry: Math.abs(y2 - y1) < 0.5 };
  });
  T(t5.dy === 45 && t5.dw >= 15 && t5.carry, 'T5 小节内换谱号(位差45px/加宽/延续)', JSON.stringify(t5));

  // T6 换谱号 MusicXML 往返
  const t6 = await pg.evaluate(() => {
    const xml = exportMusicXML(song);   // T5 遗留：m2c1 clef=bass
    const nClef = (xml.match(/<clef>/g) || []).length;
    const im = importMusicXML(xml);
    if (im.error) return { error: im.error };
    return { nClef, cl: im.song.measures[1].voxes[0][0].clef, nota: im.song.voxNotations[0] };
  });
  T(!t6.error && t6.nClef >= 2 && t6.cl === 'bass' && t6.nota === 'staff', 'T6 换谱号 MusicXML 往返', JSON.stringify(t6));

  // T7 信息卡补齐与同步
  const t7 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'G', nMea: 3, nTab: 1, nVox: 1, lyr: 1 });
    s.lyricist = '测词'; s.composer = '测曲'; s.maker = ''; s.tuning = [64, 59, 55, 50, 45, 38];
    loadSong(s);
    const g = id => (document.getElementById(id) || {}).textContent || '';
    const vis = id => { const el = document.getElementById(id); return el && el.style.display !== 'none'; };
    return { ly: g('ri-lyricist'), co: g('ri-composer'), ty: g('ri-type'),
      tun: g('ri-tuning'), makerHid: !vis('ri-maker-row'), tunVis: vis('ri-tuning-row') };
  });
  T(t7.ly === '测词' && t7.co === '测曲' && /弹唱谱 · 3 小节/.test(t7.ty) && t7.tun.length > 0 && t7.makerHid && t7.tunVis,
    'T7 信息卡补齐(作词/作曲/谱类·小节/调弦/空值隐藏)', JSON.stringify(t7));

  // T8 和弦图横按表示：v53.5 产品拍板改逐弦圆点、全面撤横杠——Em/Bm/F 均无横杠，按弦数=圆点数
  const t8 = await pg.evaluate(() => {
    const em = chordDiagramSVG('Em', 0, 0, 1, '022000', true);
    const bm = chordDiagramSVG('Bm', 0, 0, 1, 'x24432', true);
    const f = chordDiagramSVG('F', 0, 0, 1, '133211', true);
    const barre = s => /stroke-width="5\.2"/.test(s);
    const dots = s => (s.match(/r="2\.5"/g) || []).length;
    return { emBarre: barre(em), bmBarre: barre(bm), fBarre: barre(f), emDots: dots(em), bmDots: dots(bm), fDots: dots(f) };
  });
  T(!t8.emBarre && !t8.bmBarre && !t8.fBarre && t8.emDots === 2 && t8.bmDots === 5 && t8.fDots === 6,
    'T8 横按=逐弦圆点无横杠(Em2/Bm5/F6点)', JSON.stringify(t8));

  // T9 v45.7 联排像素级间距：低音下加线 26.25px → gap≥36；一弦推弦装饰 → gap≥30
  const t9 = await pg.evaluate(() => {
    const mk = cols => { const s = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
      s.tabStaff = true; s.measures[0].tabs[0] = cols; loadSong(s);
      const M = sysMetrics(0, 0, 0, 0); return +(M.tabTops[0] - M.tabStaffB[0]).toFixed(1); };
    const gLow  = mk([{ dur: 2, notes: [{ s: 6, f: 0 }] }, { dur: 2, notes: [] }]);          // E2→E3 下加2线
    const gBend = mk([{ dur: 2, notes: [{ s: 1, f: 0, tech: 'b', bAmt: 'full' }] }, { dur: 2, notes: [] }]);  // 一弦推弦弧
    const gBase = mk([{ dur: 1, notes: [{ s: 1, f: 0 }] }]);
    return { gLow, gBend, gBase };
  });
  T(t9.gLow >= 36 && t9.gBend >= 30 && t9.gBase >= 13 && t9.gBase < 20,
    'T9 联排像素级间距(低音36+/推弦30+/基础14)', JSON.stringify(t9));

  // T10 v45.7 联排低音谱号：低音入谱表 gap 回落基础值；高音弦音符转为上加线 → 谱表上方扩距
  const t10 = await pg.evaluate(() => {
    const s = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.tabStaff = true;
    s.measures[0].tabs[0] = [{ dur: 2, notes: [{ s: 6, f: 0 }] }, { dur: 2, notes: [{ s: 1, f: 0 }] }];
    loadSong(s);
    const g1 = sysMetrics(0, 0, 0, 0);
    const gapT = g1.tabTops[0] - g1.tabStaffB[0], topT = g1.tabStaffB[0];
    song.tabClef = 'bass'; render();
    const g2 = sysMetrics(0, 0, 0, 0);
    const gapB = g2.tabTops[0] - g2.tabStaffB[0], topB = g2.tabStaffB[0];
    const hasF = document.getElementById('score').innerHTML.length > 0;
    delete song.tabClef; render();
    return { gapT: +gapT.toFixed(1), gapB: +gapB.toFixed(1), dTop: +(topB - topT).toFixed(1), hasF };
  });
  T(t10.gapT >= 36 && t10.gapB < 20 && t10.dTop >= 25 && t10.hasF,
    'T10 低音谱号联排(低音入谱表/上加线区扩)', JSON.stringify(t10));

  // T11 v45.7 面板重组：记谱风格入记谱法组、技巧含哑音无下推弦、谱号按钮、mute 翻转 n.x
  const t11 = await pg.evaluate(() => {
    const bn = document.getElementById('b-notation');
    const inNota = !!(bn && bn.closest('#panel-tab-notation'));
    const clefBtns = !!(document.getElementById('tn-clef-g') && document.getElementById('tn-clef-f'));
    const hasMute = EB_TECHS.some(e => e[0] === 'mute'), noBd = EB_TECHS.some(e => e[0] === 'bd');   /* v49.8 回落按钮回归：字段名沿用、语义翻转为「存在 bd」 */
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 3, f: 2 }] }, { dur: 2, notes: [] }, { dur: 4, notes: [] }];
    loadSong(s);
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 };
    techFromBar('mute');
    const xOn = !!song.measures[0].tabs[0][0].notes[0].x;
    techFromBar('mute');
    const xOff = !song.measures[0].tabs[0][0].notes[0].x;
    return { inNota, clefBtns, hasMute, noBd, xOn, xOff };
  });
  T(t11.inNota && t11.clefBtns && t11.hasMute && t11.noBd && t11.xOn && t11.xOff,
    'T11 面板重组(记谱风格分组/哑音入技巧/谱号按钮)', JSON.stringify(t11));

  // T12+T13 v45.8 行首小节号入边距 + 系统左端连线（联排两谱行贯通）
  const t12 = await pg.evaluate(() => {
    const s = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 9, nTab: 1, nVox: 0, lyr: 0 });
    s.tabStaff = true;
    for (let i = 0; i < 9; i++) s.measures[i].tabs[0] = [{ dur: 2, notes: [{ s: 6, f: 0 }] }, { dur: 2, notes: [{ s: 1, f: 0 }] }];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    // 行首小节号：右对齐、x ≤ MARGIN-4=52
    const mnum = /<text x="(\d+(?:\.\d+)?)" y="[\d.]+" font-size="9.5" text-anchor="end"[^>]*opacity="0.65">\d+</.exec(svg);
    // 系统左端连线：x=56 竖线，跨度 ≥80（谱表30 + 间距 + TAB45）
    let conn = false;
    const re = /<line x1="56" y1="([\d.]+)" x2="56" y2="([\d.]+)"/g; let m2;
    while ((m2 = re.exec(svg))) { if (Math.abs(+m2[2] - +m2[1]) >= 80) conn = true; }
    return { mnumX: mnum ? +mnum[1] : null, conn };
  });
  T(t12.mnumX !== null && t12.mnumX <= 52, 'T12 行首小节号入左边距(anchor=end)', JSON.stringify(t12));
  T(t12.conn, 'T13a 联排行首竖线贯通(跨度≥80)', JSON.stringify(t12));

  // T13b 弹唱谱（TAB+简谱声部）行首同样相连
  const t13 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 2, notes: [] }, { dur: 4, notes: [] }];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    let span = 0;
    const re = /<line x1="56" y1="([\d.]+)" x2="56" y2="([\d.]+)"/g; let m2;
    while ((m2 = re.exec(svg))) span = Math.max(span, Math.abs(+m2[2] - +m2[1]));
    return { span: +span.toFixed(1) };
  });
  T(t13.span >= 80, 'T13b 弹唱谱 TAB↔简谱行首相连', JSON.stringify(t13));

  /* T14 TAB 全空小节：v45.6 画居中全休止字形 → v60.60 改逐列时值线骨架 →
     v60.63「单独占一拍的休止不要时值线」后**字形和时值线都没有**，谱表内彻底干净。
     v60.64 恢复休止字形时**只恢复有音符的小节**，全空小节这一条不反转——
     它是 v60.60「新建项目/新增小节谱内不要标记」的落点（小节仍是跟拍号相等的休止列，
     数据在、只是不画）。 */
  const t14 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 4, notes: [] }, { dur: 2, notes: [] }];
    // m1 保持新建默认（全空，一拍一列四分）
    loadSong(s); blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    const S2 = layoutSystems(); const lm2 = S2[0].measures[1];
    const x0 = 56 + STAFF_HEAD_W + lm2.x;
    /* v60.64 休止字形恢复后，全谱计数会把 m0 里的休止也算进来——本项要的是
       「**空小节**里一枚都没有」，故把字形按 x 收窄到 m1 这一段 */
    const glyphs = [...document.querySelectorAll('#score path[transform]')].filter(el => {
      const m = /translate\(([-0-9.]+)/.exec(el.getAttribute('transform') || '');
      const x = m ? +m[1] : -1;
      return x > x0 && x < x0 + lm2.L.w;
    }).length;
    /* 符干长度约 10px（tabBot+2 → stemY）；小节线跨整个谱表（≈45px），按长度上限剔掉 */
    const stemXs = [...document.querySelectorAll('#score line')].filter(x => {
      const len = Math.abs(+x.getAttribute('y2') - +x.getAttribute('y1'));
      return Math.abs(+x.getAttribute('x1') - +x.getAttribute('x2')) < 0.3
        && +x.getAttribute('stroke-width') === 1 && len > 3 && len < 30;
    }).map(x => +x.getAttribute('x1')).filter(x => x > x0 && x < x0 + lm2.L.w);
    return { glyphs, emptyCols: song.measures[1].tabs[0].length, stemsInEmpty: stemXs.length };
  });
  T(t14.glyphs === 0 && t14.emptyCols === 4 && t14.stemsInEmpty === 0,
    'T14 TAB 全空小节：字形与时值线都没有（新建骨架保持干净，列数仍＝拍号）', JSON.stringify(t14));

  // T15 v45.9 行首连线无同位双绘 + T16 TAB 字母入谱表
  const t15 = await pg.evaluate(() => {
    const vcount = svg => { let n = 0, m2; const re = /<line x1="56" y1="([\d.]+)" x2="56" y2="([\d.]+)"/g;
      while ((m2 = re.exec(svg))) n++; return n; };
    // 联排（连线接管）：x=56 竖线恰 1 条
    const s1 = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s1.tabStaff = true; s1.measures[0].tabs[0] = [{ dur: 1, notes: [{ s: 5, f: 2 }] }];
    loadSong(s1);
    const nLinked = vcount(document.getElementById('score').innerHTML);
    const tabIn = /<text x="65"[^>]*font-weight="bold"[^>]*>T</.test(document.getElementById('score').innerHTML);
    const tabOut = /<text x="45"[^>]*>T</.test(document.getElementById('score').innerHTML);
    // 单 TAB 行（无连线）：仍恰 1 条自身行首线
    const s2 = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s2.measures[0].tabs[0] = [{ dur: 1, notes: [{ s: 5, f: 2 }] }];
    loadSong(s2);
    const nSingle = vcount(document.getElementById('score').innerHTML);
    return { nLinked, nSingle, tabIn, tabOut };
  });
  T(t15.nLinked === 1 && t15.nSingle === 1, 'T15 行首连线无同位双绘(竖线恰1条)', JSON.stringify(t15));
  T(t15.tabIn && !t15.tabOut, 'T16 TAB 字母入谱表内(x=65)', JSON.stringify(t15));

  // T17 v46.0 「8」缀隐藏 + T18 泛音菱形加宽
  const t17 = await pg.evaluate(() => {
    const s = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.tabStaff = true;
    s.measures[0].tabs[0] = [
      { dur: 4, notes: [{ s: 6, f: 0 }] },
      { dur: 4, notes: [{ s: 1, f: 12, tech: 'hm' }] },
      { dur: 4, notes: [{ s: 3, f: 7, tech: 'hm' }] },
      { dur: 4, notes: [] },
    ];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    const widths = [];
    const re = /<polygon points="([\d.]+),[\d.]+ ([\d.]+),[\d.]+ [\d.]+,[\d.]+ ([\d.]+),[\d.]+"/g; let m2;
    while ((m2 = re.exec(svg))) widths.push(+(+m2[2] - +m2[3]).toFixed(1));
    const smallDigit = /font-size="8"[^>]*>12</.test(svg);       // 两位数缩号入框
    const normDigit = /font-size="10\.5"[^>]*>7</.test(svg);     // 个位数保持常规字号
    return { no8: !svg.includes('>8</text>'), widths: widths.sort((a, b) => a - b), smallDigit, normDigit };
  });
  T(t17.no8, 'T17 谱号下 8 缀已隐藏', JSON.stringify(t17));
  T(t17.widths.length === 2 && t17.widths[0] === 14 && t17.widths[1] === 14 && t17.smallDigit && t17.normDigit,
    'T18 泛音固定菱形+数字自适应(14/14·12缩号)', JSON.stringify(t17));

  // T19 Ctrl+点击小节线多选 + T20 行首热区左延
  const t19 = await pg.evaluate(async () => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 0, lyr: 0 });
    for (let i = 0; i < 4; i++) s.measures[i].tabs[0] = [{ dur: 2, notes: [{ s: 5, f: 2 }] }, { dur: 2, notes: [{ s: 1, f: 0 }] }];
    loadSong(s);
    const zone = mi => [...document.querySelectorAll('.barzone')].find(z => z.dataset.bar.startsWith((mi - 1) + ':' + mi + ':tab'));
    const rowStart = !![...document.querySelectorAll('.barzone')].find(z => z.getAttribute('x') === '52');
    const click = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, ctrlKey: true }));
    click(zone(1));
    const one = selRange && selRange.m1 === 1 && selRange.m2 === 1 && selRange.whole;
    click(zone(3));
    const ext = selRange && selRange.m1 === 1 && selRange.m2 === 3 && selRange.whole;
    selRange = null; render();
    return { rowStart, one, ext };
  });
  T(t19.one && t19.ext, 'T19 Ctrl+点击小节线多选(单选→扩选1-3)', JSON.stringify(t19));
  T(t19.rowStart, 'T20 行首小节线热区左延(x=52)', JSON.stringify(t19));

  // T21 v46.1 泛音类归组 + T22 泛音菱形不变量
  const t21 = await pg.evaluate(() => {
    const hmIdx = EB_TECHS.findIndex(e => e[0] === 'hm');
    const grouped = hmIdx === EB_TECHS.length - 2 && EB_TECHS[EB_TECHS.length - 1][0] === ''
      && EB_TECHS[hmIdx][2] === 'N.H.' && !EB_TECHS.some(e => e[2] === '◇')
      && EB_GTECH[0][0] === 'hmA' && EB_GTECH[1][0] === 'hmP' && EB_GTECH[2][0] === 'hmT';
    // hmT 人工泛音同样带菱形 + A.H. 标注（渲染不变量）
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 2, notes: [{ s: 2, f: 5, tech: 'hm', hmT: 'A' }] }, { dur: 2, notes: [] }];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    const diamond = /<polygon points="[\d.]+,[\d.]+ [\d.]+,[\d.]+ [\d.]+,[\d.]+ [\d.]+,[\d.]+" fill="none"/.test(svg);
    const ah = svg.includes('A.H.');
    return { grouped, diamond, ah };
  });
  T(t21.grouped, 'T21 泛音类归组(N.H.尾部+人工泛音置首)', JSON.stringify(t21));
  T(t21.diamond && t21.ah, 'T22 人工泛音同样带菱形框+A.H.标注', JSON.stringify(t21));

  // T23 v46.2 智能页签置首
  const t23 = await pg.evaluate(() => {
    const tabs = [...document.querySelectorAll('#rtabs .rtab')].map(b => b.dataset.p);
    const on = document.querySelector('#rtabs .rtab.on');
    return { first: tabs[0], order: tabs.join(','), defOn: on && on.dataset.p };
  });
  /* v46.6 起启动台把右栏默认页设为智能；v46.7 页签序改为 智能·库·创作·信息 */
  /* v48.3 右栏收敛为两页签：信息（默认）· 创作 */
  /* v56.6 创作页签置首为默认（光标位置+节拍检查随编辑流） */
  T(t23.first === 'make' && t23.order === 'make,info' && t23.defOn === 'make',
    'T23 页签序(创作·信息，默认停创作)', JSON.stringify(t23));

  // T24 v46.3 智能预提示 → v56.6 移除（用户指示）：卡片/宿主不存在且 renderHints 空转不抛
  const t24 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 2, notes: [] }, { dur: 4, notes: [] }];
    s.measures[0].voxes[0] = [{ dur: 4, deg: 1 }, { dur: 4, deg: 3 }, { dur: 2, deg: 5 }];
    loadSong(s);
    const out = { gone: !document.getElementById('rc-hints') && !document.getElementById('hint-body') };
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 5 }; barSel = null; selRange = null; noteSel = [];
    try{ renderDock(); renderHints(); out.noThrow = true; }catch(_){ out.noThrow = false; }
    return out;
  });
  T(t24.gone && t24.noThrow, 'T24 智能预提示卡已移除(v56.6)且渲染无异常', JSON.stringify(t24));

  // T25+T26 v46.4→v56.6 两页签 + 光标卡音符可编辑信息
  const t25 = await pg.evaluate(() => {
    const tabs = [...document.querySelectorAll('#rtabs .rtab')].map(b => b.dataset.p).join(',');
    /* v56.6 光标位置+节拍检查（em-toggle+beat-box）移入创作页；预提示移除；
       导入互操作(rt-mxl) 暂时隐藏（启动台/新建向导仍可达） */
    const ciInfo = !!document.querySelector('.rcard[data-rt="make"] #cursor-info');
    const makeCards = !!document.querySelector('.rcard[data-rt="make"] #rt-midi')   /* v60.26 首项换导入MIDI */
      && !!document.querySelector('.rcard[data-rt="make"]#rc-beat')
      && !!document.querySelector('#rc-beat #em-toggle')
      && document.getElementById('beat-box').parentElement === document.getElementById('beat-host');
    const mxlHidden = !document.querySelector('#rt-mxl') || !document.querySelector('#rt-mxl').offsetParent;
    const libOff = !document.querySelector('.rcard[data-rt="lib"]') || !document.querySelector('.rcard[data-rt="lib"]').offsetParent;
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 8, notes: [{ s: 5, f: 3, tech: 'h' }], chord: 'C' }, { dur: 2, notes: [] }, { dur: 4, dotted: true, notes: [] }];
    loadSong(s);
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 5 }; barSel = null; selRange = null; noteSel = []; syncInputs();
    const t = document.getElementById('cursor-info').textContent;
    /* v68.2 flow 口径：右栏「属性」页含 #cursor-info 与 #em-toggle；时值检查 #beat-box 在状态栏；旧页签条不出现 */
    const vis2 = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const fl = { prop: !!document.querySelector('#flw-rp-prop #cursor-info') && !!document.querySelector('#flw-rp-prop #em-toggle'),
      beatSt: !!document.getElementById('beat-box').closest('#mixer-dock'), noRtabs: !vis2(document.getElementById('rtabs')) };
    /* v56.6b 「可改」快捷键提示行已去除（用户指示），断言不再出现 */
    return { tabs, ciInfo, makeCards, mxlHidden, libOff, fl, note: /5弦 3品/.test(t) && /击弦/.test(t), noEdit: !/可改|时值 Q–T/.test(t), chord: /和弦/.test(t) && /\bC\b/.test(t) };
  });
  T(FLOWM ? (t25.fl.prop && t25.fl.beatSt && t25.fl.noRtabs && t25.mxlHidden && t25.libOff)
          : (t25.tabs === 'make,info' && t25.ciInfo && t25.makeCards && t25.mxlHidden && t25.libOff),
    FLOWM ? 'T25 右栏属性页＝光标位置 + 编辑模式，时值检查在状态栏，库与导入互操作隐藏' : 'T25 两页签(创作=光标位置+节拍检查+创作帮助，库与导入互操作隐藏)', JSON.stringify(t25));
  T(t25.note && t25.noEdit && t25.chord, 'T26 光标卡音符信息(弦品/技法/和弦，无「可改」行)', JSON.stringify(t25));

  // T29 v47.3 顶栏回归：音符/时值/节奏三组恒在顶栏，时值点击生效、后插生效、组标签「音符」
  const t29 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 4, notes: [] }, { dur: 2, notes: [] }];
    loadSong(s);
    const eb = document.getElementById('editbar');
    const inBar = id => { const el = document.getElementById(id); return !!(el && eb.contains(el)); };
    const opsIn = inBar('eb-edit'), durIn = inBar('eb-dur'), rhyIn = inBar('eb-combo');
    const label = document.querySelector('#ebu-eb-edit .eb-t').textContent;   // v47.5 更名「编辑」
    // 时值点击生效：选中第1列 → 点 8分
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 5 }; selRange = null; noteSel = [];
    const d8 = document.querySelector('#eb-dur [data-dur="8"]');
    if (d8) d8.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const durOk = song.measures[0].tabs[0][0].dur === 8;
    // 后插生效（editbar 监听 ebHandler）
    const n0 = song.measures[0].tabs[0].length;
    document.querySelector('#eb-edit #eb-add').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const insOk = song.measures[0].tabs[0].length === n0 + 1;
    return { opsIn, durIn, rhyIn, label, durOk, insOk };
  });
  T(t29.opsIn && t29.durIn && t29.rhyIn && t29.label === '编辑' && t29.durOk && t29.insOk,
    'T29 顶栏组回归(编辑/时值/节奏+时值/后插生效)', JSON.stringify(t29));

  // T30 v46.6 连音线回归谱类记号层
  const t30 = await pg.evaluate(() => {
    const noTop = !document.querySelector('#eb-marks #eb-tie');
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 2, f: 1 }] }, { dur: 4, notes: [{ s: 2, f: 3 }] }, { dur: 2, notes: [] }];
    loadSong(s);
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 2 }; selRange = null; noteSel = [];
    const bt = document.getElementById('b-tie-t');
    if (bt) bt.click();
    const n = song.measures[0].tabs[0][0].notes[0];
    return { noTop, hasBtn: !!bt, tied: !!(n.tk && n.tk.ci === 1) };
  });
  T(t30.noTop && t30.hasBtn && t30.tied, 'T30 连音线回归记号层(TAB b-tie-t 生效)', JSON.stringify(t30));

  // T32 v47.3 顶栏回归：编辑行可见、缩放/时值提示入顶栏、左栏无 note/dur/rhy 层；连音仍留记号层
  const t32 = await pg.evaluate(() => {
    const eb = document.getElementById('editbar');
    const ebVisible = getComputedStyle(eb).display !== 'none';
    const tabs = [...document.querySelectorAll('.ltab[data-t]')].map(b => b.dataset.t).join(',');
    const noLayers = !/note|dur|rhy/.test(tabs);
    const tupTab = !!document.querySelector('#mark-body [data-tup="3"]');
    const tupVox = !!document.querySelector('#vmark-body [data-tup="3"]');
    const noTopMarks = !document.getElementById('eb-marks');
    const zoomInBar = eb.contains(document.getElementById('eb-zoom'));
    /* v48.3 节拍状态归回右栏「信息」页（撤 v47.3 的顶栏搬移）；缩放仍在顶栏 */
    const beatInDock = !!document.getElementById('beat-box').closest('#right-dock');
    const zoomSt = !!document.getElementById('eb-zoom').closest('#mixer-dock'), beatSt = !!document.getElementById('beat-box').closest('#mixer-dock');   /* flow：状态栏 */
    return { ebVisible, noLayers, tupTab, tupVox, noTopMarks, zoomInBar, beatInDock, zoomSt, beatSt };
  });
  T(t32.ebVisible && t32.noLayers && t32.tupTab && t32.tupVox && t32.noTopMarks
    && (FLOWM ? t32.zoomSt && t32.beatSt : t32.zoomInBar && t32.beatInDock),
    'T32 顶栏回归(编辑行可见/缩放入顶栏·时值提示回右栏/左栏撤三层/连音留记号层)', JSON.stringify(t32));

  // T33 v47.3 顶栏内容不溢出视口 + 新版节奏组合全铺开（7 个可见、更多▾隐藏）；经典版 4+更多 紧凑
  const t33 = await pg.evaluate(() => {
    const vis = el => el && getComputedStyle(el).display !== 'none' && el.offsetParent !== null;
    const eb = document.getElementById('editbar');
    let maxRight = 0; eb.querySelectorAll('button').forEach(x => { if (vis(x)) maxRight = Math.max(maxRight, x.getBoundingClientRect().right); });
    const fits = maxRight <= innerWidth + 1;
    const combos = [...document.querySelectorAll('#eb-combo [data-ec]')].filter(vis).length;
    const moreVis = vis(document.getElementById('eb-more'));   // v47.4 更多▾ 回顶栏（展开 3/4·6/8 等拍号组合）
    document.getElementById('b-shell').click();
    const cCombos = [...document.querySelectorAll('#eb-combo [data-ec]')].filter(vis).length;
    const cMore = vis(document.getElementById('eb-more'));
    document.getElementById('b-shell').click();
    return { fits, maxRight: Math.round(maxRight), combos, moreVis, cCombos, cMore };
  });
  T(t33.fits && (FLOWM || (t33.combos === 7 && t33.moreVis && t33.cCombos === 4 && t33.cMore)),
    'T33 顶栏不溢出+节奏7组合铺开+更多▾在栏(经典4+更多)', JSON.stringify(t33));

  // T34 v46.8 倚音图标统一：前/后倚音同款元素（小音符斜杠+主音符+连线）镜像布局，弃用简谱数字画法
  const t34 = await pg.evaluate(() => {
    const g = ornSVG('grace'), ga = ornSVG('gracea');
    const cnt = (s, re) => (s.match(re) || []).length;
    // 两枚图标：各 2 实心符头（小 rx=2.3 + 主 rx=3.1）、有斜杠/符尾/连线，无 <text> 数字
    const sym = [g, ga].every(s => cnt(s, /<ellipse/g) === 2 && s.includes('rx="2.3"') && s.includes('rx="3.1"')
      && cnt(s, /<line/g) >= 3 && s.includes('Q ') && !/<text/.test(s));
    // 镜像：前倚音小符头在左（cx=5），后倚音小符头在右（主符头在左）
    const mir = g.indexOf('rx="2.3"') < g.indexOf('rx="3.1"') && ga.indexOf('rx="3.1"') < ga.indexOf('rx="2.3"');
    // v46.9 单独「倚音」钮移除（与装饰组前倚音重复）；装饰组前/后倚音齐备且选中态同步 col.grace/graceA
    const gone = !document.getElementById('b-grace');
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    loadSong(createSong('vocal', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, lyr: 0 }));
    openFlyout('vox');
    const gb = document.querySelector('[data-orn="grace"]'), gab = document.querySelector('[data-orn="gracea"]');
    let syncOn = false;
    if (gb && gab) {
      sel.row = 'vox'; clampSel();
      const col = curCol();
      if (col) {
        col.deg = col.deg || 1; col.grace = { notes: [{ deg: 2, oct: 0 }], dur: 8 }; syncInputs();
        syncOn = gb.classList.contains('on') && !gab.classList.contains('on');
        delete col.grace; syncInputs();
        syncOn = syncOn && !gb.classList.contains('on');
      }
    }
    return { sym, mir, gone, both: !!(gb && gab), syncOn };
  });
  T(t34.sym && t34.mir && t34.gone && t34.both && t34.syncOn,
    'T34 倚音图标统一+去重(镜像同款/单独钮移除/装饰组选中态)', JSON.stringify(t34));

  // T36 v47.0 纯 TAB 行首：TAB 字母与拍号不重叠（表头区 26px 预留）+ 拍号与首列内容间距 ≥8px（tsLead 17）
  //     + 变拍子在 TAB 行画新拍号（此前纯 TAB 谱完全不显示变拍）
  const t36 = await pg.evaluate(() => {
    const probe = (mk) => {
      if (typeof undoStack !== 'undefined') undoStack.length = 0;
      loadSong(mk());
      const svg = document.getElementById('score');
      const ts = [...svg.querySelectorAll('text')].map(t => {
        const bb = t.getBBox();
        return { t: t.textContent, x: bb.x, y: bb.y, w: bb.width, h: bb.height, fs: t.getAttribute('font-size') };
      });
      const tab = ts.filter(o => 'TAB'.includes(o.t) && o.t.length === 1 && (o.fs === '11.5' || o.fs === '9.5') && o.y < 320);
      const sig = ts.filter(o => o.fs === '14' && /^\d+$/.test(o.t) && o.x < 130 && o.y > 150);
      let ov = false;
      tab.forEach(a => sig.forEach(c => {
        const xov = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
        const yov = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (xov > 0 && yov > 0) ov = true;
      }));
      const sigR = sig.length ? Math.max.apply(null, sig.map(o => o.x + o.w)) : 0;
      // 首列内容（× 或品位数字）最左缘
      const first = ts.filter(o => (o.t === '×' || /^\d{1,2}$/.test(o.t)) && o.fs !== '14' && o.x > sigR && o.y > 150 && o.y < 260)
        .sort((a, c) => a.x - c.x)[0];
      return { ov, gap: first ? Math.round((first.x - sigR) * 10) / 10 : -1 };
    };
    const g = probe(() => {
      const s = createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 1, lyr: 0 });
      s.measures[0].tabs[0] = [{ dur: 4, dotted: false, chord: 'C', strum: '', tech: '', notes: [{ s: 5, f: 3 }] },
        { dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [{ s: 2, f: 1 }] },
        { dur: 2, dotted: false, chord: '', strum: '', tech: '', notes: [{ s: 1, f: 0 }] }];
      return s;
    });
    const u = probe(() => { const s = createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 0, lyr: 0 }); s.inst = 'uku'; return s; });
    // 变拍子：第 2 小节 3/4 → TAB 行第 2 小节起始处画 3 与 4（font-num 14 且 x 在小节内）
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s2 = createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 0, lyr: 0 });
    s2.measures[1].beats = 3; s2.measures[1].unit = 4;
    loadSong(s2);
    const sig2 = [...document.getElementById('score').querySelectorAll('text')]
      .filter(t => t.getAttribute('font-size') === '14' && /^[34]$/.test(t.textContent))
      .map(t => ({ t: t.textContent, x: Math.round(t.getBBox().x) }));
    const meterDrawn = sig2.filter(o => o.t === '3').length >= 1 && sig2.length >= 4;   // 首小节 4/4 + 变拍 3/4
    return { g, u, meterDrawn };
  });
  T(!t36.g.ov && t36.g.gap >= 8 && !t36.u.ov && t36.u.gap >= 8 && t36.meterDrawn,
    'T36 纯TAB行首拍号不叠字母且留距+变拍子TAB行显示', JSON.stringify(t36));

  // T37 v47.1 音符快捷浮条 + 习惯学习：弹出/操作/重排/预判/关-重开/简谱上下文
  const t37 = await pg.evaluate(() => {
    localStorage.removeItem('musetab-habits'); localStorage.removeItem('musetab-quickbar'); HABITS = null;
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('solo', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0, gtype: 'lead' });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [{ s: 3, f: 5 }] },
      { dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [{ s: 3, f: 7 }] }];
    loadSong(s);
    // ① v51.3 鼠标左键只选中不弹；右键 pointerdown 弹出；触屏点按仍自动弹（TAB 语境按钮组）。
    //   每次分发前重新取节点：pointerdown 处理器内 render() 重建 SVG，缓存节点已脱离文档不再冒泡
    const cellQ = () => document.querySelector('.strcell[data-mi="0"][data-ci="0"][data-si="3"]');
    cellQ().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 0 }));
    const noPopLeft = !document.getElementById('quickbar');
    cellQ().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'touch', button: 0 }));
    const tapPop = !!document.getElementById('quickbar');
    closeQuickbar();
    cellQ().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 2 }));
    let qb = document.getElementById('quickbar');
    const open = !!qb && noPopLeft && tapPop;
    const btns0 = qb ? [...qb.querySelectorAll('[data-qb]')].map(x => x.dataset.qb).join(',') : '';
    const tabCtx = /dur:4,dur:8,dur:16,dot,tech:.+,tie,more,off/.test(btns0);   /* v60.28 浮条「和弦」钮撤销（入口=创作辅助图标） */
    // ② 浮条操作生效 + 习惯记录
    qb.querySelector('[data-qb="dur:8"]').click();
    const durOk = song.measures[0].tabs[0][0].dur === 8;
    const h1 = JSON.parse(localStorage.getItem('musetab-habits') || '{}');
    const recOk = h1.n && h1.n['dur:8'] >= 1 && h1.last === 'dur:8';
    // ③ 高频重排 + 转移预判（tup:3 不在条上 → 独立猜测钮居首）
    for (let i = 0; i < 3; i++) { habit('dur:8'); habit('tup:3'); } habit('dur:8');
    for (let i = 0; i < 4; i++) habit('tech:hm');
    habit('dur:8');   // last=dur:8 → next 预判 tup:3
    closeQuickbar(); showQuickbar(300, 300);
    qb = document.getElementById('quickbar');
    const btns1 = [...qb.querySelectorAll('[data-qb]')].map(x => x.dataset.qb);
    const rerank = btns1.includes('tech:hm');
    const guess = qb.querySelector('.qb-guess') && qb.querySelector('[data-qb]').dataset.qb === 'tup:3';
    // ④ 「猜你想做」直达：v56.6 预提示卡移除，改走快捷浮条置顶预判项（点击应用 3连音）
    sel.row = 'tab'; sel.mi = 0; sel.ci = 0; clampSel(); closeQuickbar(); showQuickbar(300, 300);
    let hintDo = false;
    const gq = document.querySelector('#quickbar [data-qb="tup:3"]');
    if (gq) { gq.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      hintDo = !!(song.measures[0].tabs[0][0] && song.measures[0].tabs[0][0].tup); }
    closeQuickbar();
    // ⑤ 关闭→不再弹（重开入口 v56.6 随预提示卡移除，直接恢复偏好键）
    showQuickbar(300, 300);
    document.querySelector('#quickbar [data-qb="off"]').click();
    showQuickbar(300, 300);
    let offOk = !document.getElementById('quickbar') && localStorage.getItem('musetab-quickbar') === 'off';
    // v51.3 关闭偏好只关自动弹：右键 force 唤出不受影响
    showQuickbar(300, 300, true);
    offOk = offOk && !!document.getElementById('quickbar'); closeQuickbar();
    try{ localStorage.removeItem('musetab-quickbar'); }catch(_){}
    const backOn = localStorage.getItem('musetab-quickbar') !== 'off';
    // ⑥ 简谱语境按钮组（升降/八度/连音线）
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    loadSong(createSong('vocal', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, lyr: 0 }));
    sel.row = 'vox'; clampSel(); showQuickbar(300, 300);
    const btns2 = [...document.getElementById('quickbar').querySelectorAll('[data-qb]')].map(x => x.dataset.qb).join(',');
    const voxCtx = btns2.includes('acc:#') && btns2.includes('oct:+') && btns2.includes('tie') && !btns2.includes('tech:');
    closeQuickbar(); localStorage.removeItem('musetab-habits'); HABITS = null;
    return { open, tabCtx, durOk, recOk, rerank, guess: !!guess, hintDo, offOk, backOn, voxCtx };
  });
  T(t37.open && t37.tabCtx && t37.durOk && t37.recOk && t37.rerank && t37.guess && t37.hintDo
    && t37.offOk && t37.backOn && t37.voxCtx,
    'T37 快捷浮条+习惯学习(弹出/生效/重排/预判/关重开/简谱)', JSON.stringify(t37));

  // T38 v47.2 简谱行首线与连体线共用 + 节奏全铺开/节奏型库独立
  const t38 = await pg.evaluate(() => {
    const headLines = () => [...document.getElementById('score').querySelectorAll('line')]
      .map(l => ({ x: +l.getAttribute('x1'), x2: +l.getAttribute('x2'), h: Math.abs(+l.getAttribute('y2') - +l.getAttribute('y1')) }))
      .filter(l => Math.abs(l.x - l.x2) < 0.5 && l.x < 90 && l.h > 8);
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    // 弹唱（2 行系统）：每系统行首只剩连体线一条（x=56），简谱行无 ox=82 处独立线
    loadSong(createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 6, nTab: 1, nVox: 1, lyr: 1 }));
    const g = headLines();
    const gOk = g.length >= 1 && g.every(l => Math.abs(l.x - 56) < 1);
    // 单行歌谱：行首无起始线（GB 惯例）
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    loadSong(createSong('vocal', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 6, nVox: 1, lyr: 1 }));
    const vOk = headLines().length === 0;
    // 二声部合唱：只有连体线
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    loadSong(createSong('vocal', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 4, nVox: 2, lyr: 0 }));
    const c = headLines();
    const cOk = c.length >= 1 && c.every(l => Math.abs(l.x - 56) < 1);
    // v47.3 节奏组合在新版顶栏全铺开（更多▾隐藏）；经典版顶栏保持紧凑：4 组合 + 更多 + 库
    const vis = el => el && getComputedStyle(el).display !== 'none' && el.offsetParent !== null;
    const grp = document.getElementById('eb-combo');
    const shellOk = [...grp.querySelectorAll('[data-ec]')].filter(vis).length === 7
      && vis(grp.querySelector('#eb-more'));   // v47.4 更多▾ 恢复展示（拍号组合入口）
    document.getElementById('b-shell').click();
    const classicOk = [...grp.querySelectorAll('[data-ec]')].filter(vis).length === 4
      && vis(grp.querySelector('#eb-more')) && vis(grp.querySelector('#eb-lib'));
    document.getElementById('b-shell').click();
    return { gN: g.length, gOk, vOk, cN: c.length, cOk, shellOk, classicOk };
  });
  T(t38.gOk && t38.vOk && t38.cOk && (FLOWM || (t38.shellOk && t38.classicOk)),
    'T38 简谱行首线共用连体线+节奏顶栏铺开(经典紧凑)', JSON.stringify(t38));

  // T39 v47.4 更多节奏菜单：分组（单拍/二拍/三拍·复合拍）+ 6/8 应用（附点四分 → 八分×3）
  const t39 = await pg.evaluate(() => {
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    loadSong(createSong('vocal', { title: 'x', key: 'C', beats: 6, unit: 8, nMea: 2, nVox: 1, lyr: 0 }));
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    song.measures[0].voxes[0] = [V(1, 4, { dotted: true }), V(3, 4, { dotted: true })]; render();
    document.getElementById('eb-more').click();
    const pm = document.getElementById('popmenu');
    const groups = pm ? [...pm.querySelectorAll('.t')].map(t => t.textContent).join('|') : '';
    const grouped = /单拍细分/.test(groups) && /二拍组合/.test(groups) && /复合拍/.test(groups);
    const nBtns = pm ? pm.querySelectorAll('[data-ec2]').length : 0;
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; selRange = null;
    const target = pm ? [...pm.querySelectorAll('[data-ec2]')].find(x => x.title === '八分×3') : null;
    if (target) target.click();
    const cols = song.measures[0].voxes[0];
    const applied = cols.length === 4 && cols[0].dur === 8 && cols[2].dur === 8 && cols[3].dur === 4 && !!cols[3].dotted;
    closePop();
    return { grouped, nBtns, applied };
  });
  T(t39.grouped && t39.nBtns >= 20 && t39.applied,
    'T39 更多节奏菜单(拍号分组+6/8应用)', JSON.stringify(t39));

  // T40 v47.5 音符输入组 + 撤销重做下移：TAB=品位0-9(连点合成两位)、简谱=1-7/0/八度、undo 在节奏组后
  const t40 = await pg.evaluate(() => {
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [] },
      { dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [] }, { dur: 2, dotted: false, chord: '', strum: '', tech: '', notes: [] }];
    loadSong(s);
    const vis = el => el && getComputedStyle(el).display !== 'none' && el.offsetParent !== null;
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; selRange = null; syncInputs();
    const tabDigits = [...document.querySelectorAll('#eb-note .nd')].filter(vis).length;
    const octHidTab = !vis(document.getElementById('eb-octup'));
    document.querySelector('#eb-note [data-nd="1"]').click();
    document.querySelector('#eb-note [data-nd="2"]').click();
    const fret12 = (song.measures[0].tabs[0][0].notes.find(n => n.s === 3) || {}).f === 12;
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; selRange = null; syncInputs();
    const voxDigits = [...document.querySelectorAll('#eb-note .nd')].filter(vis).length;
    const octVisVox = vis(document.getElementById('eb-octup'));
    document.querySelector('#eb-note [data-nd="5"]').click();
    const deg5 = song.measures[0].voxes[0][0].deg === 5;
    /* v47.9 落音后延迟前进：连点 5→0 属「录旋律」，0 会落到下一列（符合预期）。
       本项要验的是「0 把当前选中的音变成休止」，故先像真实点选那样重选该音并清掉前进锚点 */
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; lastEnt = null; syncInputs();
    document.querySelector('#eb-note [data-nd="0"]').click();
    const rest0 = !song.measures[0].voxes[0][0].deg;
    const eb = document.getElementById('editbar'), su = document.getElementById('seg-undo');
    const inBar = eb.contains(su) && su.previousElementSibling && su.previousElementSibling.id === 'ebu-eb-combo';
    const label2 = document.querySelector('#ebu-eb-note .eb-t').textContent;
    document.getElementById('b-shell').click();
    const inHead = !eb.contains(su) && !!su.closest('.main-bar');
    document.getElementById('b-shell').click();
    const flowUndo = eb.contains(su);   /* flow：撤销段在行 2 #editbar（行首位置见 tv_modes M21） */
    return { tabDigits, octHidTab, fret12, voxDigits, octVisVox, deg5, rest0, inBar, label2, inHead, flowUndo };
  });
  T(t40.tabDigits === 10 && t40.octHidTab && t40.fret12 && t40.voxDigits === 8 && t40.octVisVox
    && t40.deg5 && t40.rest0 && t40.label2 === '音符' && (FLOWM ? t40.flowUndo : t40.inBar && t40.inHead),
    'T40 音符输入组(品位/音级上下文)+撤销重做入上栏', JSON.stringify(t40));

  // T41 v47.6 音符组三态：TAB(0-9+0–24选择器+×) / 简谱(1-7) / 五线谱(音名随调号+♯♭♮) + 节奏型库入上栏
  const t41 = await pg.evaluate(() => {
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const vis = el => el && getComputedStyle(el).display !== 'none';
    const s = createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'D', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [] },
      { dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [] }, { dur: 2, dotted: false, chord: '', strum: '', tech: '', notes: [] }];
    loadSong(s);
    // ① TAB 语境
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; selRange = null; syncInputs();
    const tabCtx = [...document.querySelectorAll('#eb-note .nd')].filter(vis).length === 10
      && vis(document.getElementById('eb-fret-more')) && vis(document.getElementById('eb-mute-n'))
      && !vis(document.getElementById('eb-octup')) && !vis(document.getElementById('eb-acc-s'));
    // 0–24 选择器：25 个品位钮 + 高把位写入
    document.getElementById('eb-fret-more').click();
    const grid = document.querySelectorAll('#popmenu [data-fret]').length;
    const has24 = !!document.querySelector('#popmenu [data-fret="24"]');
    document.querySelector('#popmenu [data-fret="17"]').click();
    const fret17 = (song.measures[0].tabs[0][0].notes.find(n => n.s === 3) || {}).f === 17;
    // × 闷音 + 选中态同步
    document.getElementById('eb-mute-n').click(); syncInputs();
    const nx = song.measures[0].tabs[0][0].notes.find(n => n.s === 3);
    const muteOk = !!(nx && nx.x) && document.getElementById('eb-mute-n').classList.contains('on');
    // ② 简谱语境：数字标签、有八度；变音钮旧外壳不给，flow 简谱语境给 ♯ ♭ ♮（v68.1 方案：accBump / accNat 在简谱走 toggleAcc，见 index.html 行 2 CSS ⑫ 注释）。
    //    v68.2 收尾 ENG-10 ③：此前 flow 遍只调 syncInputs、行 2 语境停在上一个（六线谱），「无变音钮」是借着过期语境空过的；现在语境随 syncInputs 更新，按 flow 方案口径断言
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; selRange = null; syncInputs();
    const FLj = document.body.classList.contains('flow');
    const jpOk = document.querySelector('#eb-note [data-nd="1"] .dg').textContent === '1'
      && [...document.querySelectorAll('#eb-note .nd')].filter(vis).length === 8
      && (FLj ? document.getElementById('editbar').dataset.flwCtx === 'jp' && vis(document.getElementById('eb-acc-s')) : !vis(document.getElementById('eb-acc-s'))) && vis(document.getElementById('eb-octup'));
    // ③ 五线谱语境（D 大调）：按钮显音名 D E F G A B C；点「F」写音级 3；♯ 生效且高亮
    song.voxNotations = ['staff']; render(); syncInputs();
    const letters = [1,2,3,4,5,6,7].map(k => document.querySelector('#eb-note [data-nd="' + k + '"] .dg').textContent).join('');
    const stCtx = letters === 'DEFGABC' && vis(document.getElementById('eb-acc-s'))
      && vis(document.getElementById('eb-octup')) && !vis(document.getElementById('eb-fret-more'));
    /* v47.9 本用例自建选区（不沿用上一用例遗留的光标/前进锚点），再验「落音 + 变音作用于该音」 */
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; lastEnt = null; syncInputs();
    document.querySelector('#eb-note [data-nd="3"]').click();
    const degOk = song.measures[0].voxes[0][0].deg === 3;
    document.getElementById('eb-acc-s').click(); syncInputs();
    const accOk = song.measures[0].voxes[0][0].acc === '#' && document.getElementById('eb-acc-s').classList.contains('on');
    // C 大调下音名应为 CDEFGAB（换调即换标签）
    song.key = 'C'; render(); syncInputs();
    const lettersC = [1,2,3,4,5,6,7].map(k => document.querySelector('#eb-note [data-nd="' + k + '"] .dg').textContent).join('');
    // ③b 组内排序：吉他 0 居首(空弦最常用)；简谱/五线谱 1-7 在前、0 殿后、功能钮排尾
    const seq = () => [...document.querySelectorAll('#eb-note > *')].filter(e => getComputedStyle(e).display !== 'none')
      .sort((a, c) => a.getBoundingClientRect().left - c.getBoundingClientRect().left)
      .map(e => (e.textContent || '').trim()).join(' ');
    const FL = document.body.classList.contains('flow');
    const stSeq = seq();
    /* v47.8 起五线谱休止钮改出 SMuFL 字形（无文本），序列断言改为「七音名 + 休止钮带 svg」 */
    const stRestSvg = /<svg/.test(document.querySelector('#eb-note [data-nd="0"] .dg').innerHTML);
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; syncInputs();
    const tabSeq = seq();
    /* v48.0 展示修正：折叠选择器只标「折叠掉的那段」（0–9 已铺开 → 显示 10–24▾，
       原固定写 0–24▾ 与旁边的 0–9 重复）；× 补中文小字「分解」 */
    const orderOk = FL
      ? tabSeq.indexOf('0 1 2 3 4 5 6 7 8 9 10–24▾ ×') === 0 && /分解$/.test(tabSeq) && /^C\S* D\S* E\S* F\S* G\S* A\S* B\S* /.test(stSeq) && stRestSvg
      : tabSeq.indexOf('0 1 2 3 4 5 6 7 8 9') === 0 && /10–24▾ ×分解$/.test(tabSeq)
      && stSeq.indexOf('C D E F G A B') === 0 && stRestSvg;
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; syncInputs();
    // ④ 节奏型库按钮在上栏、位于节奏组末尾
    const lib = document.getElementById('eb-lib');
    const libOk = vis(lib) && document.getElementById('editbar').contains(lib)
      && lib === document.getElementById('eb-combo').lastElementChild;
    return { tabCtx, grid, has24, fret17, muteOk, jpOk, letters, lettersC, stCtx, degOk, accOk, libOk, orderOk, tabSeq, stSeq };
  });
  T(t41.tabCtx && t41.grid >= 25 && t41.has24 && t41.fret17 && t41.muteOk && t41.jpOk
    && t41.stCtx && t41.degOk && t41.accOk && t41.lettersC === 'CDEFGAB' && t41.libOk && t41.orderOk,
    'T41 音符组三态(TAB 0-24+×/简谱/五线谱音名+变音)+节奏型库入上栏', JSON.stringify(t41));

  // T42 v47.7 缺陷修复（专家工作流查出、逐条实测复现后修）：
  //   闷音往返保真 / 五线谱变音目标音高模型 / 换弦断开两位合成 / uku 弦号与品位上限 / Esc 关弹窗 / 品位越界守卫
  const t42 = await pg.evaluate(() => {
    const mk = () => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
      const s = createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
      s.measures[0].tabs[0] = [{ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [] },
        { dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [] }, { dur: 2, dotted: false, chord: '', strum: '', tech: '', notes: [] }]; loadSong(s); };
    // ① 闷音往返不丢品位（v47.6 顶栏 × 钮让该数据丢失一键可达）
    mk(); sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; setFret(7);
    toggleMute(); const onX = song.measures[0].tabs[0][0].notes[0].x === true;
    toggleMute(); const muteKeep = song.measures[0].tabs[0][0].notes[0].f === 7 && onX;
    // ② 五线谱 ♮ 真生效：G 大调 deg=7(F♯) → 本位 F，渲染变化 + 音高降半音 + accCarry 出 ♮ 字形
    mk(); song.voxNotations = ['staff']; song.key = 'G'; sel = { row: 'vox', vi: 0, mi: 0, ci: 0 };
    const c = song.measures[0].voxes[0][0]; c.deg = 7; c.acc = ''; c.oct = 0; render();
    const h0 = document.getElementById('score').innerHTML, m0 = voxMidi(c);
    accNat(); render();
    const natOk = document.getElementById('score').innerHTML !== h0 && (m0 - voxMidi(c)) === 1
      && accCarry({}, 3, 0, 1) === '♮' && ACC_G['♮'] === 'accidentalNatural';
    // ③ 五线谱 ♯ 连点不再造出「画重降却发声升号」的非法态
    c.acc = ''; accBump(1); const s1 = c.acc; accBump(1); render();
    const noBogus = s1 === '#' && !/♭♭/.test(document.getElementById('score').innerHTML);
    // ④ 简谱变音零回归：仍是 ''→#→x 与 n 的旧循环
    mk(); song.voxNotations = ['jianpu']; sel = { row: 'vox', vi: 0, mi: 0, ci: 0 };
    const j = song.measures[0].voxes[0][0]; j.deg = 1; j.acc = '';
    accBump(1); const q1 = j.acc; accBump(1); const q2 = j.acc; accNat(); const q3 = j.acc;
    const jpSame = q1 === '#' && q2 === 'x' && q3 === 'n';
    // ⑤ 换弦断开两位品位合成（此前 1→↓→2 在新弦写出 12 品）
    /* v48.2 六线谱也自动前进：1 落在 col0/3弦后光标进到 col1，换弦后的 2 落在 col1/4弦。
       本项要守的仍是「换弦断开两位合成」——绝不能出现 12 品；列位随自动前进变化属预期。
       另补：和弦叠音（同列多弦）现在走「← 退回再换弦」，一并纳入回归。 */
    mk(); sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; lastEnt = null; pending = { digits: '', time: 0 };
    inputDigit(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    inputDigit(2);
    const n1 = song.measures[0].tabs[0][0].notes.find(n => n.s === 3);
    const nn = song.measures[0].tabs[0][1].notes.find(n => n.s === 4);
    const no12 = !JSON.stringify(song.measures[0].tabs[0].map(c => (c.notes || []).map(x => x.f))).includes('12');
    /* 叠音段另起一份干净小节（mk() 只有 3 列，末列无处可前进，会测不出叠音） */
    mk(); sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; lastEnt = null; pending = { digits: '', time: 0 };
    inputDigit(3); moveCol(-1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    inputDigit(2);
    const stack = song.measures[0].tabs[0][0].notes;
    const pendOk = sel.si === 4 && !!n1 && n1.f === 1 && !!nn && nn.f === 2 && no12
      && stack.length === 2 && stack.some(x => x.s === 3 && x.f === 3) && stack.some(x => x.s === 4 && x.f === 2);
    // ⑥ 尤克里里：弦号钳到 4、品位上限 15
    const s2 = createSong('guitar', { title: 'u', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s2.inst = 'uku'; loadSong(s2); sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 6 }; clampSel();
    const ukuOk = sel.si === 4 && fretMaxOf() === 15;
    // ⑦ Esc 关弹窗 + ⑧ 品位越界守卫
    mk(); sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; showFretMenu(300, 300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const escOk = !document.getElementById('popmenu');
    setFret(99); const guardOk = song.measures[0].tabs[0][0].notes[0].f === 24;
    return { muteKeep, natOk, noBogus, jpSame, pendOk, ukuOk, escOk, guardOk };
  });
  T(t42.muteKeep && t42.natOk && t42.noBogus && t42.jpSame && t42.pendOk && t42.ukuOk && t42.escOk && t42.guardOk,
    'T42 缺陷修复(闷音保真/五线谱变音/换弦断合成/uku/Esc/品位守卫)', JSON.stringify(t42));

  // T43 v47.8 三谱类音符组分化 + 品位折叠 + 五线谱休止字形 + 节奏型库按谱类路由
  const t43 = await pg.evaluate(() => {
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const vis = el => el && getComputedStyle(el).display !== 'none';
    const seq = () => [...document.querySelectorAll('#eb-note > *')].filter(vis)
      .sort((a, c) => a.getBoundingClientRect().left - c.getBoundingClientRect().left)
      .map(e => (e.textContent || '').trim() || '[g]').join(' ');
    loadSong(createSong('guitar', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 }));
    /* v68.7 S1 迁移（README P2 悬停＝名称 + 键）：新外壳音高键 title「唱名 3」、品位键「5 品」、× 键「哑音（x）」（旧外壳原文「简谱音名 3（…）」「5 品（…）」「× 分解标记…」不动，[classic] 段照原断言）。
       修前红修后绿：改前新外壳的 title 是旧长句，/^唱名 3$/ · /^5 品$/ 不中 */
    const fl = typeof flowOn === 'function' && flowOn();
    // ① 简谱：1-7 简谱音名 + 0 休止 + 高/低八度；库＝节奏型库
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; syncInputs();
    const jpOk = seq().indexOf('1 2 3 4 5 6 7 0') === 0
      && (fl ? /^唱名 3$/ : /简谱音名/).test(document.querySelector('#eb-note [data-nd="3"]').title)
      && document.getElementById('eb-lib').textContent === '节奏型库…';
    // ② 吉他：数字＝品位（非简谱音名）、× 为分解标记、品位钮按余量折叠且不溢出
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 3 }; syncInputs();
    const caps = []; for (let i = 0; i < 3; i++) { syncInputs(); caps.push(fretInlineCap()); }
    const shown = [...document.querySelectorAll('#eb-note .nd')].filter(vis).map(x => +x.dataset.nd);
    const cap = fretInlineCap();
    let maxRight = 0; document.getElementById('editbar').querySelectorAll('button').forEach(x => { if (vis(x)) maxRight = Math.max(maxRight, x.getBoundingClientRect().right); });
    const tabOk = (fl ? /^5 品$/ : /品（/).test(document.querySelector('#eb-note [data-nd="5"]').title)
      && (fl ? /^哑音（x）$/ : /分解标记/).test(document.getElementById('eb-mute-n').title)
      && new Set(caps).size === 1                       // 折叠稳定（不随重算抖动）
      && Math.max.apply(null, shown) === cap            // 恰好铺开到 cap
      && vis(document.getElementById('eb-fret-more')) === (cap < fretMaxOf())
      && maxRight <= innerWidth + 1;
    // ③ 五线谱：休止钮出 SMuFL 休止字形且随时值变化（不再是简谱的「0」）
    song.voxNotations = ['staff']; sel = { row: 'vox', vi: 0, mi: 0, ci: 0 };
    const c0 = song.measures[0].voxes[0][0];
    const restHTML = d => { c0.dur = d; syncInputs(); return document.querySelector('#eb-note [data-nd="0"] .dg').innerHTML; };
    const rq = restHTML(4), re = restHTML(8), rw = restHTML(1);
    const stRestOk = /<svg/.test(rq) && /<svg/.test(re) && /<svg/.test(rw) && rq !== re && rq !== rw;
    // ④ 库按谱类路由：单谱表五线谱 → 提示后退回节奏型库
    const toasts = []; const ot = window.toast; window.toast = m => toasts.push(m);
    openRhyLib();
    /* v68.7 S1 迁移（规格 §6.C3 #8）：新外壳（[flow] 段）提示条原 /需要大谱表/（整句）→ 短文「需要钢琴大谱表」；旧外壳段原断言逐字不变。修前红：5cddfb8 [flow] 段为整句 */
    const singleOk = (document.body.classList.contains('flow') ? toasts[0] === '需要钢琴大谱表' : /需要大谱表/.test(toasts[0] || '')) && !!document.querySelector('.modal');
    closeModal();
    // ⑤ 大谱表钢琴 → 伴奏织体（含内置钢琴节奏型条目）
    loadSong(createSong('piano', { title: 'p', key: 'C', beats: 4, unit: 4, nMea: 2, lyr: 0 }));
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; syncInputs();
    const libTxt = document.getElementById('eb-lib').textContent;
    openRhyLib();
    /* v69.0 S2 迁移（D9 配谱直接执行）：新外壳新形态（F.nxOn）里伴奏织体不再弹窗，openRhyLib 在大谱表上打开织体条 #flw-nx-tbar——
       断言改看织体条里有「柱式和弦」「抒情分解」；旧外壳 / ?next=0 仍是 .modal（原断言逐字不变）。修前红：v69.0 新外壳 m 为 null */
    const nx = document.body.classList.contains('flow') && !document.body.classList.contains('flw-nx0') && typeof FLOW !== 'undefined' && FLOW.nx && FLOW.nxOn && FLOW.nxOn();
    const m = nx ? document.getElementById('flw-nx-tbar') : document.querySelector('.modal');
    const pianoOk = libTxt === '伴奏织体…' && !!m && /柱式和弦/.test(m.textContent) && /抒情分解/.test(m.textContent);
    closeModal(); try { if (nx) FLOW.nx.tbar.close(false); } catch (_) {} window.toast = ot;
    return { jpOk, tabOk, cap, shownMax: Math.max.apply(null, shown), stRestOk, singleOk, pianoOk };
  });
  T(t43.jpOk && t43.tabOk && t43.stRestOk && t43.singleOk && t43.pianoOk,
    'T43 三谱类音符组(简谱音名/品位折叠/五线谱休止字形)+库按谱类路由', JSON.stringify(t43));

  // T27+T28 v46.5 启动台（需全新页面取启动态）
  const pg2 = await b.newPage({ viewport: { width: 1400, height: 950 } });
  pg2.on('pageerror', e => errs.push('PAGEERR2:' + e.message));
  await pg2.goto(F); await pg2.waitForTimeout(900);
  const t27 = await pg2.evaluate(() => {
    const sp = document.getElementById('start-pad');
    const vis = sp && !sp.classList.contains('hidden');
    const cards = [...document.querySelectorAll('#spd-cards [data-sp]')].filter(c => getComputedStyle(c).display !== 'none').map(c => c.dataset.sp).join(',');   // v63.1 手机专用卡（看示例/发到电脑继续）桌面不显示
    const flyClosed = document.getElementById('left-flyout').classList.contains('hidden');
    const paperHidden = getComputedStyle(document.getElementById('paper')).visibility === 'hidden';
    // v46.6 默认页 → v56.6：启动台右栏停「创作」页（预提示卡已移除，欢迎语随之取消）
    const rOn = document.querySelector('#rtabs .rtab.on');
    const makeOn = rOn && rOn.dataset.p === 'make';
    const ciDash = document.getElementById('cursor-info').textContent.trim() === '—';
    const noLtabOn = !document.querySelector('.ltab.on');
    return { vis, cards, flyClosed, paperHidden, makeOn, ciDash, noLtabOn };
  });
  /* v67.4 启动台卡片：开始一份谱 / 按上次 / 从已有音乐 ＋ 常用用途直达 ＋ 打开文件 / 我的曲谱（框架不动） */
  T(t27.vis && t27.cards === 'new,last,imp,sc:gtr,sc:pacc,sc:teach,sc:sight,sc:kids,open,mine' && t27.flyClosed && t27.paperHidden,
    'T27 启动台默认态(开始一份谱/按上次/从已有音乐＋常用用途＋打开/我的；左栏收起+空白谱面)', JSON.stringify(t27));
  T(t27.makeOn && t27.ciDash && t27.noLtabOn,
    'T31 启动台默认页(创作页+光标—+左栏无高亮)', JSON.stringify(t27));
  // T28 v46.9 改版：点新建后启动台保持（向导背后是干净启动台）、向导无「当前曲谱《旧稿》」状态行
  const t28 = await pg2.evaluate(() => {
    document.querySelector('#spd-cards [data-sp="new"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const padStay = !document.getElementById('start-pad').classList.contains('hidden');
    const m = document.querySelector('.modal');
    const wizard = !!m;
    const noOldInfo = m ? !/当前曲谱《/.test(m.textContent) : false;
    const paperHidden = getComputedStyle(document.getElementById('paper')).visibility === 'hidden';
    return { padStay, wizard, noOldInfo, paperHidden };
  });
  T(t28.padStay && t28.wizard && t28.noOldInfo && t28.paperHidden,
    'T28 启动台点新建(留台+向导无旧稿信息+谱面仍隐藏)', JSON.stringify(t28));
  // T35 v46.9 完成向导创建 → 关台 + 全新曲谱（不残留上次编辑）+ 左栏恢复；中途取消则回启动台
  const t35a = await pg2.evaluate(() => {
    document.getElementById('nw-cancel').click();
    return { padBack: !document.getElementById('start-pad').classList.contains('hidden') };
  });
  const t35 = await pg2.evaluate(() => {
    document.querySelector('#spd-cards [data-sp="new"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    /* v67.4 新建面板：点「歌谱 · 合唱」用途（默认独唱，16 小节）→ 创建 */
    document.querySelector('.nf-modal [data-scene="vocal"]').click();
    document.getElementById('nw-create').click();
    return { padGone: document.getElementById('start-pad').classList.contains('hidden'),
      fresh: song.title === '未命名曲谱' && song.key === 'C' && song.measures.length === 16,
      paperVis: getComputedStyle(document.getElementById('paper')).visibility === 'visible',
      /* v66.0 D7：1400 宽下固定版宽（向导新建）左右面板全开放不下 → 左栏自动收起一次让宽给谱面；
         此时「左栏恢复」以「谱面完整可见」代替（面板仍可从左轨再打开，改浮层不挤谱面） */
      flyBack: !document.getElementById('left-flyout').classList.contains('hidden')
        || (FLY_AUTO_CLOSED && +document.getElementById('score').getAttribute('width') <= document.getElementById('paper').clientWidth + 1) };
  });
  T(t35a.padBack && t35.padGone && t35.fresh && t35.paperVis && t35.flyBack,
    'T35 向导创建=全新曲谱(取消回台/创建关台/无残留)', JSON.stringify(Object.assign({}, t35a, t35)));
  await pg2.close();

  console.log('[' + TAG + '] PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  PASS += pass; TOTAL += total; ERRN += errs.length;
 }
  console.log('PASS ' + PASS + '/' + TOTAL);
  process.exit(PASS === TOTAL && !ERRN ? 0 : 1);
})();
