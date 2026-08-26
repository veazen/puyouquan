/* v60.42 左栏音轨卡回归（音轨化 P1：统一轨列表+跨类型加轨，谱类=音轨组合派生）：
   T1 统一列表：弹唱谱两容器均含 吉他轨行+旋律轨行+「＋音轨」；标题=音轨
   T2 点行切图层：vox 图层点吉他轨行 → sel.row=tab 且 activeTab=tab（工具面板随轨）
   T3 歌谱↔弹唱闭环：vocal 谱 ＋音轨→吉他轨 → docType=guitar、新轨选中、tab 图层；
      删该吉他轨 → docType 回 vocal、轨行消失
   T4 删轨守卫：弹唱 1tab+1vox 删唯一旋律轨被拒（非联排独奏形态）；删唯一吉他轨允许（回歌谱）
   T5 整谱形态锁定（D3）：钢琴谱 ＋音轨 toast 拒绝、声部行无删除×；功能谱只有旋律轨选项
   T6 双击改名沿用：同轨 400ms 内两击 → askText 弹出（stub 断言新名落库）
   对 v60.41 旧文件跑：无 .trk 行 → T1 当场红（突变实证）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => {
    window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    loadSong(createSong('tanchang', { title: 'trk', beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2,
      inst: 'guitar', nTab: 1, nVox: 1, lyr: 1, singer: '', lyricist: '', composer: '', maker: '', capo: 0 }));
  });
  await pg.waitForTimeout(400);

  // T1 统一列表结构
  let r = await pg.evaluate(() => {
    const q = (root, s) => document.querySelectorAll('#' + root + ' ' + s).length;
    return {
      tabSideTv: q('tab-voices', '.trk[data-k="tv"]'), tabSideVv: q('tab-voices', '.trk[data-k="vv"]'),
      voxSideTv: q('vox-voices', '.trk[data-k="tv"]'), voxSideVv: q('vox-voices', '.trk[data-k="vv"]'),
      addBtns: document.querySelectorAll('.trk-add').length,
      titles: [...document.querySelectorAll('#panel-tab-voice .rg-title, #panel-vox-voice .rg-title')].map(e => e.textContent)
    };
  });
  T(r.tabSideTv === 1 && r.tabSideVv === 1 && r.voxSideTv === 1 && r.voxSideVv === 1
    && r.addBtns === 2 && r.titles.every(t2 => t2 === '音轨'),
    'T1 统一音轨列表（两容器同份全轨+＋音轨+标题）', JSON.stringify(r));

  // T2 点行切图层
  r = await pg.evaluate(() => {
    setRibbon('vox'); sel.row = 'vox'; sel.vi = 0; render();
    document.querySelector('#vox-voices .trk[data-k="tv"]').click();
    return { row: sel.row, tab: activeTab };
  });
  T(r.row === 'tab' && r.tab === 'tab', 'T2 旋律语境点吉他轨行→自动切图层', JSON.stringify(r));

  // T3 歌谱↔弹唱闭环
  r = await pg.evaluate(() => {
    loadSong(createSong('vocal', { title: 'v', beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2,
      nVox: 1, lyr: 1, singer: '', lyricist: '', composer: '', maker: '', capo: 0 }));
    const dt0 = docType(song);
    showAddTrackMenu();
    const hasTab = !!document.getElementById('ta-tab');
    document.getElementById('ta-tab').click();
    const dt1 = docType(song), selTab = sel.row === 'tab' && activeTab === 'tab';
    const rowN1 = document.querySelectorAll('#tab-voices .trk[data-k="tv"]').length;
    document.querySelector('#tab-voices .vdel[data-k="tvdel"]').click();
    const dt2 = docType(song);
    const rowN2 = document.querySelectorAll('#vox-voices .trk[data-k="tv"]').length;
    return { dt0, hasTab, dt1, selTab, rowN1, dt2, rowN2, backVox: sel.row === 'vox' };
  });
  T(r.dt0 === 'vocal' && r.hasTab && r.dt1 === 'guitar' && r.selTab && r.rowN1 === 1
    && r.dt2 === 'vocal' && r.rowN2 === 0 && r.backVox,
    'T3 歌谱＋吉他轨=弹唱形态·删回歌谱（谱类随轨派生闭环）', JSON.stringify(r));

  // T4 删轨守卫
  r = await pg.evaluate(() => {
    loadSong(createSong('tanchang', { title: 'g', beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2,
      inst: 'guitar', nTab: 1, nVox: 1, lyr: 1, singer: '', lyricist: '', composer: '', maker: '', capo: 0 }));
    delVoiceAt('vox', 0);                       // 弹唱删唯一旋律轨 → 拒
    const voxKept = song.voxVoices.length === 1;
    delVoiceAt('tab', 0);                       // 删唯一吉他轨 → 允许（回歌谱）
    const tabGone = song.tabVoices.length === 0 && docType(song) === 'vocal';
    delVoiceAt('vox', 0);                       // 现在是最后一条音轨 → 拒
    const lastKept = song.voxVoices.length === 1;
    return { voxKept, tabGone, lastKept };
  });
  T(r.voxKept && r.tabGone && r.lastKept, 'T4 删轨守卫（弹唱旋律轨拒删/吉他轨可删到0/最后一轨拒删）', JSON.stringify(r));

  // T5 整谱形态锁定（钢琴/和弦格）+ 功能谱只加旋律轨
  r = await pg.evaluate(() => {
    loadSong(createSong('piano', { title: 'p', beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2,
      lyr: 0, singer: '', lyricist: '', composer: '', maker: '', capo: 0 }));
    showAddTrackMenu();
    const pianoBlocked = !document.getElementById('ta-vox') && !document.getElementById('ta-tab');
    const pianoNoDel = document.querySelectorAll('#vox-voices .vdel').length === 0;
    delVoiceAt('vox', 0);
    const handsKept = song.voxVoices.length === 2;
    loadSong(createSong('func', { title: 'f', beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2,
      ftype: 'func', nVox: 1, lyr: 1, singer: '', lyricist: '', composer: '', maker: '', capo: 0 }));
    showAddTrackMenu();
    const funcVoxOnly = !!document.getElementById('ta-vox') && !document.getElementById('ta-tab');
    document.getElementById('ta-cancel').click();
    return { pianoBlocked, pianoNoDel, handsKept, funcVoxOnly };
  });
  T(r.pianoBlocked && r.pianoNoDel && r.handsKept && r.funcVoxOnly,
    'T5 整谱形态锁定（钢琴不加轨不删手/功能谱仅旋律轨）', JSON.stringify(r));

  // T6 双击改名沿用（askText stub）
  r = await pg.evaluate(() => {
    loadSong(createSong('tanchang', { title: 'r', beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2,
      inst: 'guitar', nTab: 1, nVox: 1, lyr: 1, singer: '', lyricist: '', composer: '', maker: '', capo: 0 }));
    const orig = window.askText;
    let asked = null;
    window.askText = (t2, v, cb) => { asked = v; cb('主音吉他'); };
    const row = () => document.querySelector('#tab-voices .trk[data-k="tv"]');
    row().click(); row().click();               // 同轨 400ms 内两击=改名
    window.askText = orig;
    return { asked, renamed: song.tabVoices[0] === '主音吉他',
      shown: document.querySelector('#tab-voices .trk[data-k="tv"] .vname').textContent === '主音吉他' };
  });
  T(r.asked === '吉他1' && r.renamed && r.shown, 'T6 双击改名沿用', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
