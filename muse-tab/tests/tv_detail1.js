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
   T18 泛音菱形两位数品位加宽（f=12 → 宽 26px；f=7 → 宽 14px）
   T19 Ctrl+点击小节线多选：首点选中单小节整声部、再点扩展为连续小节范围
   T20 行首小节线热区左延至系统起始线（barzone x=oxH-4=52） */
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
    return { no8: !svg.includes('>8</text>'), widths: widths.sort((a, b) => a - b) };
  });
  T(t17.no8, 'T17 谱号下 8 缀已隐藏', JSON.stringify(t17));
  T(t17.widths.length === 2 && t17.widths[0] === 14 && t17.widths[1] === 26, 'T18 泛音菱形两位数加宽(14/26)', JSON.stringify(t17));

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

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
