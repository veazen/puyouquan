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
       缩放入左栏 rail-zoom、节拍状态入播放条、新版外壳 #editbar 隐藏、右栏序 智能·库·创作·信息 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

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

  // T2 TAB 休止符 SMuFL 化：谱面无 Unicode 文本休止字符
  const t2 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [
      { dur: 4, notes: [{ s: 5, f: 3 }] },
      { dur: 4, notes: [] },                    // 四分休止
      { dur: 8, notes: [] }, { dur: 8, notes: [] },   // 八分休止×2
      { dur: 4, dotted: true, notes: [] },      // 附点四分休止（v45.6 起附点也画出）
    ];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    const nPath = (svg.match(/<path /g) || []).length;   // 4 枚 SMuFL 休止字形 path（符头为字形、符干为 line）
    const dot = /circle[^>]*r="1\.6"/.test(svg);         // 附点休止的附点（v45.6 起 TAB 休止也画附点）
    return { noUni: !/[𝄻𝄼𝄽𝄾𝄿𝅀]/.test(svg), paths: nPath, dot };
  });
  T(t2.noUni && t2.paths >= 4 && t2.dot, 'T2 TAB 休止符 SMuFL 字形+附点', JSON.stringify(t2));

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

  // T8 v45.7 和弦图横按判定：Em 分指不画横杠、Bm 横按仍画
  const t8 = await pg.evaluate(() => {
    const em = chordDiagramSVG('Em', 0, 0, 1, '022000', true);
    const bm = chordDiagramSVG('Bm', 0, 0, 1, 'x24432', true);
    const barre = s => /stroke-width="5\.2"/.test(s);
    const dots = s => (s.match(/r="2\.5"/g) || []).length;
    return { emBarre: barre(em), bmBarre: barre(bm), emDots: dots(em) };
  });
  T(!t8.emBarre && t8.bmBarre && t8.emDots === 2, 'T8 横按判定(Em无杠/Bm有杠/点r=2.5)', JSON.stringify(t8));

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
    const hasMute = EB_TECHS.some(e => e[0] === 'mute'), noBd = !EB_TECHS.some(e => e[0] === 'bd');
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

  // T14 TAB 全空小节居中全休止：m1 部分空(2枚列位休止) + m2 全空(1枚居中全休止)
  const t14 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 4, notes: [] }, { dur: 2, notes: [] }];
    s.measures[1].tabs[0] = [{ dur: 2, notes: [] }, { dur: 2, notes: [] }];
    loadSong(s);
    const svg = document.getElementById('score').innerHTML;
    const xs = [];
    const re = /transform="translate\((\d+(?:\.\d+)?),[\d.-]+\) scale\(6\.000\)"/g; let m2;
    while ((m2 = re.exec(svg))) xs.push(+m2[1]);
    // 期望 3 枚 TAB 休止（m1 两枚 + m2 一枚居中）；m2 的休止 x ≈ 小节中点
    const S2 = layoutSystems(); const lm2 = S2[0].measures[1];
    const cx = 56 + STAFF_HEAD_W + lm2.x + lm2.L.w / 2;
    const dev = Math.min(...xs.map(x => Math.abs(x - cx)));
    return { n: xs.length, dev: +dev.toFixed(1) };
  });
  T(t14.n === 3 && t14.dev < 10, 'T14 TAB 全空小节居中全休止', JSON.stringify(t14));

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
  T(t23.first === 'ai' && t23.order === 'ai,lib,make,info', 'T23 页签序(智能·库·创作·信息)', JSON.stringify(t23));

  // T24 v46.3 智能预提示按选中对象切换
  const t24 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 2, notes: [] }, { dur: 4, notes: [] }];
    s.measures[0].voxes[0] = [{ dur: 4, deg: 1 }, { dur: 4, deg: 3 }, { dur: 2, deg: 5 }];
    loadSong(s);
    const txt = () => document.getElementById('hint-body').textContent;
    const out = {};
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 5 }; barSel = null; selRange = null; noteSel = []; renderDock();
    out.tab = /吉他谱音符/.test(txt());
    out.clickable = !!document.querySelector('#hint-body [data-hact]');   // 音符上下文含 rib: 直达项
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 }; renderDock();
    out.jp = /简谱音符/.test(txt());
    song.voxNotations = ['staff']; renderDock();
    out.st = /五线谱音符/.test(txt());
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 0, m2: 0, c2: 2, whole: true }; renderDock();
    out.mea = /小节声部/.test(txt());
    selRange = null; barSel = { L: 0, R: 1 }; renderDock();
    out.bar = /小节线/.test(txt());
    out.subs = /整体建议/.test(txt());
    barSel = null; renderDock();
    return out;
  });
  T(t24.tab && t24.jp && t24.st && t24.mea && t24.bar && t24.clickable && t24.subs,
    'T24 智能预提示随选中对象切换(五上下文+直达+次级)', JSON.stringify(t24));

  // T25+T26 v46.4 四页签 + 光标卡音符可编辑信息
  const t25 = await pg.evaluate(() => {
    const tabs = [...document.querySelectorAll('#rtabs .rtab')].map(b => b.dataset.p).join(',');
    const ciAi = !!document.querySelector('.rcard[data-rt="ai"] #cursor-info');
    const makeCards = !!document.querySelector('.rcard[data-rt="make"] #rt-mxl') && !!document.querySelector('.rcard[data-rt="make"] #rt-sug');
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 8, notes: [{ s: 5, f: 3, tech: 'h' }], chord: 'C' }, { dur: 2, notes: [] }, { dur: 4, dotted: true, notes: [] }];
    loadSong(s);
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 5 }; barSel = null; selRange = null; noteSel = []; syncInputs();
    const t = document.getElementById('cursor-info').textContent;
    return { tabs, ciAi, makeCards, note: /5弦 3品/.test(t) && /击弦/.test(t), edit: /时值 Q–T/.test(t), chord: /和弦/.test(t) && /\bC\b/.test(t) };
  });
  T(t25.tabs === 'ai,lib,make,info' && t25.ciAi && t25.makeCards, 'T25 四页签(创作栏)+光标卡入智能栏', JSON.stringify(t25));
  T(t25.note && t25.edit && t25.chord, 'T26 光标卡音符可编辑信息(弦品/技法/可改/和弦)', JSON.stringify(t25));

  // T29 v46.6 音符图层（顶栏三组收纳入左栏）
  const t29 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, notes: [{ s: 5, f: 2 }] }, { dur: 4, notes: [] }, { dur: 2, notes: [] }];
    loadSong(s);
    openFlyout('note');
    const opsIn = !!document.querySelector('#note-ops-host #eb-add');
    const durIn = !!document.querySelector('#note-dur-host [data-dur]');
    const rhyIn = !!document.querySelector('#note-rhy-host #eb-lib');
    const panelVis = document.getElementById('panel-note-ops').style.display !== 'none';
    const label = document.querySelector('#ebu-eb-edit .eb-t').textContent;
    // 时值点击生效：选中第1列 → 点 8分
    sel = { row: 'tab', vi: 0, mi: 0, ci: 0, si: 5 }; selRange = null; noteSel = [];
    const d8 = document.querySelector('#note-dur-host [data-dur="8"]');
    if (d8) d8.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const durOk = song.measures[0].tabs[0][0].dur === 8;
    // 后插生效（ebHandler 委托绑定到 note 面板）
    const n0 = song.measures[0].tabs[0].length;
    document.querySelector('#note-ops-host #eb-add').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const insOk = song.measures[0].tabs[0].length === n0 + 1;
    return { opsIn, durIn, rhyIn, panelVis, label, durOk, insOk };
  });
  T(t29.opsIn && t29.durIn && t29.rhyIn && t29.panelVis && t29.label === '音符' && t29.durOk && t29.insOk,
    'T29 音符图层(三组入左栏+时值/后插生效+标签更名)', JSON.stringify(t29));

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

  // T32 v46.7 顶栏撤销：三独立图层 + 连音入记号层 + 缩放入左栏 + 节拍状态入播放条
  const t32 = await pg.evaluate(() => {
    const tabs = [...document.querySelectorAll('.ltab[data-t]')].map(b => b.dataset.t).join(',');
    const threeTabs = /note,dur,rhy,mea,sect/.test(tabs);
    openFlyout('dur');
    const durOnly = document.getElementById('panel-note-dur').style.display !== 'none'
      && document.getElementById('panel-note-ops').style.display === 'none';
    openFlyout('rhy');
    const rhyOnly = document.getElementById('panel-note-rhy').style.display !== 'none'
      && document.getElementById('panel-note-dur').style.display === 'none';
    const tupTab = !!document.querySelector('#mark-body [data-tup="3"]');
    const tupVox = !!document.querySelector('#vmark-body [data-tup="3"]');
    const noTopMarks = !document.getElementById('eb-marks');
    const zoomInRail = !!document.querySelector('#rail-zoom #eb-zoom');
    const beatInBar = !!document.querySelector('.mx-bar #beat-box');
    const ebHidden = getComputedStyle(document.getElementById('editbar')).display === 'none';
    return { threeTabs, durOnly, rhyOnly, tupTab, tupVox, noTopMarks, zoomInRail, beatInBar, ebHidden };
  });
  T(t32.threeTabs && t32.durOnly && t32.rhyOnly && t32.tupTab && t32.tupVox && t32.noTopMarks
    && t32.zoomInRail && t32.beatInBar && t32.ebHidden,
    'T32 顶栏撤销(三图层/连音入记号层/缩放入左栏/节拍入播放条)', JSON.stringify(t32));

  // T33 v46.8 音符/时值/节奏面板不溢出：组占满面板宽换行铺排（此前 .eb-grp flex:none 撑宽 355px 截断）
  const t33 = await pg.evaluate(() => {
    const fly = document.getElementById('left-flyout');
    const worstOf = (t) => {
      openFlyout(t);
      const fw = fly.getBoundingClientRect().right;
      let worst = 0;
      fly.querySelectorAll('.rg-body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0) worst = Math.max(worst, r.right - fw);
      });
      return Math.round(worst * 10) / 10;
    };
    const note = worstOf('note'), dur = worstOf('dur'), rhy = worstOf('rhy');
    // 换行确认：音符组按钮至少两行（首末按钮 top 不同）
    const ebs = [...document.querySelectorAll('#note-ops-host .eb')];
    openFlyout('note');
    const wrapped = ebs.length >= 6
      && ebs[0].getBoundingClientRect().top < ebs[ebs.length - 1].getBoundingClientRect().top - 10;
    return { note, dur, rhy, wrapped };
  });
  T(t33.note <= 1 && t33.dur <= 1 && t33.rhy <= 1 && t33.wrapped,
    'T33 音符/时值/节奏面板不溢出且换行铺排', JSON.stringify(t33));

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
    // ① 真实 pointerdown 弹出浮条（TAB 语境按钮组）
    const cell = document.querySelector('.strcell[data-mi="0"][data-ci="0"][data-si="3"]');
    cell.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    let qb = document.getElementById('quickbar');
    const open = !!qb;
    const btns0 = qb ? [...qb.querySelectorAll('[data-qb]')].map(x => x.dataset.qb).join(',') : '';
    const tabCtx = /dur:4,dur:8,dur:16,dot,tech:.+,tie,more,off/.test(btns0);
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
    // ④ 智能卡「猜你想做」直达（应用 3连音 → 首音 tup 字段出现）
    renderHints();
    const hb = [...document.querySelectorAll('#hint-body [data-hact]')].find(x => x.dataset.hact.indexOf('qb:') === 0);
    let hintDo = false;
    if (hb) { sel.row = 'tab'; sel.mi = 0; sel.ci = 0; clampSel(); hb.click();
      hintDo = !!(song.measures[0].tabs[0][0] && song.measures[0].tabs[0][0].tup); }
    // ⑤ 关闭→不再弹→智能卡重开
    showQuickbar(300, 300);
    document.querySelector('#quickbar [data-qb="off"]').click();
    showQuickbar(300, 300);
    const offOk = !document.getElementById('quickbar') && localStorage.getItem('musetab-quickbar') === 'off';
    renderHints();
    const re = [...document.querySelectorAll('#hint-body [data-hact]')].find(x => x.dataset.hact === 'qbon');
    if (re) re.click();
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
    // 节奏图层：组合全铺开（≥7）、更多/库钮隐藏、节奏型库独立卡
    openFlyout('rhy');
    const host = document.getElementById('note-rhy-host');
    const vis = el => el && getComputedStyle(el).display !== 'none';
    const combos = [...host.querySelectorAll('[data-ec]')].filter(vis).length;
    const shellOk = combos >= 7 && !vis(host.querySelector('#eb-more')) && !vis(host.querySelector('#eb-lib'))
      && document.getElementById('panel-note-rhylib').style.display !== 'none' && vis(document.getElementById('b-rhylib'));
    // 经典版顶栏保持紧凑：4 组合 + 更多 + 库
    document.getElementById('b-shell').click();
    const grp = document.getElementById('eb-combo');
    const classicOk = [...grp.querySelectorAll('[data-ec]')].filter(vis).length === 4
      && vis(grp.querySelector('#eb-more')) && vis(grp.querySelector('#eb-lib'));
    document.getElementById('b-shell').click();
    return { gN: g.length, gOk, vOk, cN: c.length, cOk, combos, shellOk, classicOk };
  });
  T(t38.gOk && t38.vOk && t38.cOk && t38.shellOk && t38.classicOk,
    'T38 简谱行首线共用连体线+节奏铺开/库独立', JSON.stringify(t38));

  // T27+T28 v46.5 启动台（需全新页面取启动态）
  const pg2 = await b.newPage({ viewport: { width: 1400, height: 950 } });
  pg2.on('pageerror', e => errs.push('PAGEERR2:' + e.message));
  await pg2.goto(F); await pg2.waitForTimeout(900);
  const t27 = await pg2.evaluate(() => {
    const sp = document.getElementById('start-pad');
    const vis = sp && !sp.classList.contains('hidden');
    const cards = [...document.querySelectorAll('#spd-cards [data-sp]')].map(c => c.dataset.sp).join(',');
    const flyClosed = document.getElementById('left-flyout').classList.contains('hidden');
    const paperHidden = getComputedStyle(document.getElementById('paper')).visibility === 'hidden';
    // v46.6 默认页：右栏智能页 + 欢迎提示 + 光标卡「—」+ 左栏无选中高亮
    const rOn = document.querySelector('#rtabs .rtab.on');
    const aiOn = rOn && rOn.dataset.p === 'ai';
    const welcome = /欢迎使用/.test(document.getElementById('hint-body').textContent);
    const ciDash = document.getElementById('cursor-info').textContent.trim() === '—';
    const noLtabOn = !document.querySelector('.ltab.on');
    return { vis, cards, flyClosed, paperHidden, aiOn, welcome, ciDash, noLtabOn };
  });
  T(t27.vis && t27.cards === 'new,open,imp,mine' && t27.flyClosed && t27.paperHidden,
    'T27 启动台默认态(四卡+左栏收起+空白谱面)', JSON.stringify(t27));
  T(t27.aiOn && t27.welcome && t27.ciDash && t27.noLtabOn,
    'T31 启动台默认页(智能页欢迎+光标—+左栏无高亮)', JSON.stringify(t27));
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
    document.querySelector('.ntype[data-nt="vocal"]').click();
    document.getElementById('nw-create').click();
    return { padGone: document.getElementById('start-pad').classList.contains('hidden'),
      fresh: song.title === '未命名曲谱' && song.key === 'C' && song.measures.length === 8,
      paperVis: getComputedStyle(document.getElementById('paper')).visibility === 'visible',
      flyBack: !document.getElementById('left-flyout').classList.contains('hidden') };
  });
  T(t35a.padBack && t35.padGone && t35.fresh && t35.paperVis && t35.flyBack,
    'T35 向导创建=全新曲谱(取消回台/创建关台/无残留)', JSON.stringify(Object.assign({}, t35a, t35)));
  await pg2.close();

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
