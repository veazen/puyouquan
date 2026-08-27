/* v60.49 自定义节奏型回归（产品更正：新建节奏型直接根据谱类调到曲谱编辑器，
   只需设定拍号，编辑完有保存到库的按钮）：
   T1 库弹窗自定义组：tab/vox 两库均有「自定义」组与「＋新建」卡
   T2 新建流程（tab）：拍号弹窗（默认随本谱）→ 进编辑器草稿态——单小节吉他谱、
      C 和弦示例在位、保存/取消浮条在位、工作区快照与崩溃备份键已落
   T3 编辑器里写内容 → 保存到库：改草稿小节列（b/s3/s2/s3 弦序 · 8分）→ 点「保存到库」
      → askText 起名 → musetab-custompat 落库（colToEv 反解 token 正确）+ 回到原曲谱 + 库出卡
   T4 套用实证：C 和弦语境套用 → 逐列 dur/指法与 evToCol 口径一致
   T5 「改」预填 + 覆盖保存 + 删除同步：旧 ev 铺回草稿小节，改后覆盖；删除卡与存储同步
   T6 取消流程 + 草稿期守卫：进入草稿 → guardReplace 被拦 → 取消 → 原曲谱原样恢复、备份键清
   T7 vox 流程：时值骨架（含附点）保存 → 套用重排时值、原音符保留
   T8 重载持久化：刷新后两库恢复、库出卡
   对 v60.48 旧文件跑：无 #pm-go（步进编辑器无拍号弹窗）→ T2 当场红（突变实证）。file:// 直载。 */
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
  await pg.evaluate(() => { window.SF_PLAYWAIT = false;
    window.confirm = () => true; localStorage.removeItem('musetab-custompat'); });

  // T1 两库均有自定义组（guardReplace 原生守卫保留——本套件靠干净态直通）
  let r = await pg.evaluate(() => {
    showPatternLib('tab');
    const tab = { nw: !!document.getElementById('cpat-new'),
      cap: [...document.querySelectorAll('.modal h4')].some(h => h.textContent.includes('自定义')) };
    closeModal(); showPatternLib('vox');
    const vox = { nw: !!document.getElementById('cpat-new') };
    closeModal();
    return { tab, vox };
  });
  T(r.tab.nw && r.tab.cap && r.vox.nw, 'T1 库弹窗自定义组（tab/vox 两库＋新建卡）', JSON.stringify(r));

  // T2 新建流程：拍号弹窗 → 编辑器草稿态
  r = await pg.evaluate(() => {
    const origTitle = song.title;
    song.title = '原曲谱甲';   // 标记原工作区
    showPatternLib('tab'); document.getElementById('cpat-new').click();
    const dlg = { beats: !!document.getElementById('pm-beats'), unit: !!document.getElementById('pm-unit'),
      defB: document.getElementById('pm-beats').value };
    document.getElementById('pm-go').click();
    const scratch = {
      mea: song.measures.length, dt: docType(song), title: song.title,
      chordC: song.measures[0].tabs[0][0].chord === 'C',
      bar: !!document.getElementById('patedit-bar'),
      save: !!document.getElementById('patsave'), cancel: !!document.getElementById('patcancel'),
      snap: !!patEdit && patEdit.docs[patEdit.curDocI].song.title === '原曲谱甲',
      bak: !!localStorage.getItem('musetab-patedit-bak')
    };
    return { dlg, scratch, origTitle };
  });
  T(r.dlg.beats && r.dlg.unit && r.dlg.defB === '4'
    && r.scratch.mea === 1 && r.scratch.dt === 'guitar' && r.scratch.title === '节奏型草稿'
    && r.scratch.chordC && r.scratch.bar && r.scratch.save && r.scratch.cancel
    && r.scratch.snap && r.scratch.bak,
    'T2 新建流程（拍号弹窗→单小节草稿/C和弦/浮条/快照+备份键）', JSON.stringify(r));

  // T3 写内容 → 保存到库（colToEv 反解）
  r = await pg.evaluate(() => {
    const mk = (s, f) => ({ dur: 8, dotted: false, chord: '', notes: [{ s, f }], strum: '', tech: '' });
    song.measures[0].tabs[0] = [mk(5, 3), mk(3, 0), mk(2, 1), mk(3, 0)];   // 5323 弦序 · C 指法品
    song.measures[0].tabs[0][0].chord = 'C';
    document.getElementById('patsave').click();
    const ask = !!document.getElementById('ask-in');
    if (ask) { document.getElementById('ask-in').value = '编辑器5323'; document.getElementById('ask-ok').click(); }
    const st = JSON.parse(localStorage.getItem('musetab-custompat'));
    return { ask, tabN: st.tab.length, ev: JSON.stringify(st.tab[0].ev), name: st.tab[0].name,
      backTitle: song.title, barGone: !document.getElementById('patedit-bar'),
      bakGone: !localStorage.getItem('musetab-patedit-bak'),
      libOpen: !!document.querySelector('.pat-card.cpat') };
  });
  T(r.ask && r.tabN === 1 && r.ev === '[["b",8],["s3",8],["s2",8],["s3",8]]' && r.name === '编辑器5323'
    && r.backTitle === '原曲谱甲' && r.barGone && r.bakGone && r.libOpen,
    'T3 写小节→保存到库（b/s3/s2/s3 反解；回原曲谱+库出卡+备份清）', JSON.stringify(r));

  // T4 套用实证（C 和弦）——启动示例谱自带和弦会盖过 C，先换干净弹唱谱
  r = await pg.evaluate(() => {
    showNewWizard(); document.getElementById('nw-create').click();
    song.title = '原曲谱甲';   // 供 T6 恢复断言
    song.measures[0].tabs[0][0].chord = 'C';
    sel = { mi: 1, row: 'tab', vi: 0, ci: 0, si: 1 }; selRange = null;
    showPatternLib('tab');
    document.querySelector('.pat-card.cpat').click();
    const cols = song.measures[1].tabs[0];
    return { n: cols.length, durs: cols.map(c => c.dur).join(),
      notes: JSON.stringify(cols.map(c => c.notes)) };
  });
  T(r.n === 4 && r.durs === '8,8,8,8'
    && r.notes === '[[{"s":5,"f":3}],[{"s":3,"f":0}],[{"s":2,"f":1}],[{"s":3,"f":0}]]',
    'T4 套用实证（C 指法逐列：根音5弦3品/3弦0/2弦1/3弦0）', JSON.stringify(r));

  // T5 「改」预填 + 覆盖 + 删除
  r = await pg.evaluate(() => {
    showPatternLib('tab');
    document.querySelector('.pat-card.cpat .cp-edit').click();   // 拍号弹窗（改）
    document.getElementById('pm-go').click();
    const pre = { cols: song.measures[0].tabs[0].filter(c => c.notes.length).length,
      s0: (song.measures[0].tabs[0][0].notes[0] || {}).s };
    song.measures[0].tabs[0] = song.measures[0].tabs[0].slice(0, 3);   // 删一步
    document.getElementById('patsave').click();
    document.getElementById('ask-ok').click();   // 名称预填旧名直接确定
    const st1 = JSON.parse(localStorage.getItem('musetab-custompat'));
    document.querySelector('.pat-card.cpat .cp-del').click();
    const st2 = JSON.parse(localStorage.getItem('musetab-custompat'));
    const gone = !document.querySelector('.pat-card.cpat');
    closeModal();
    return { pre, name1: st1.tab[0].name, ev1: st1.tab[0].ev.length, tabN2: st2.tab.length, gone };
  });
  T(r.pre.cols === 4 && r.pre.s0 === 5 && r.name1 === '编辑器5323' && r.ev1 === 3
    && r.tabN2 === 0 && r.gone,
    'T5 改=旧 ev 铺回草稿（4列/根音5弦）→覆盖保存→删除同步', JSON.stringify(r));

  // T6 取消流程 + 草稿期守卫
  r = await pg.evaluate(() => {
    showPatternLib('tab'); document.getElementById('cpat-new').click();
    document.getElementById('pm-go').click();
    let guarded = false;
    guardReplace(() => { guarded = true; });   // 草稿期应被拦截不执行
    const inDraft = song.title === '节奏型草稿';
    document.getElementById('patcancel').click();
    const st = JSON.parse(localStorage.getItem('musetab-custompat'));
    return { inDraft, blocked: !guarded, back: song.title === '原曲谱甲',
      bakGone: !localStorage.getItem('musetab-patedit-bak'), tabN: st.tab.length };
  });
  T(r.inDraft && r.blocked && r.back && r.bakGone && r.tabN === 0,
    'T6 取消原样返回 + 草稿期 guardReplace 拦截', JSON.stringify(r));

  // T7 vox 流程（时值骨架含附点 → 套用保留音符）
  r = await pg.evaluate(() => {
    song.measures[1].voxes[0][0].deg = 1; song.measures[1].voxes[0][1].deg = 3;
    showPatternLib('vox'); document.getElementById('cpat-new').click();
    document.getElementById('pm-go').click();
    const dtV = docType(song);
    const mkv = (dur, dot) => { const c = { dur, dotted: !!dot, lyrics: [], deg: 1, acc: '', oct: 0 }; return c; };
    song.measures[0].voxes[0] = [mkv(4), mkv(8), mkv(8), mkv(4, 1)];
    document.getElementById('patsave').click();
    document.getElementById('ask-in').value = '前四后附点';
    document.getElementById('ask-ok').click();
    const st = JSON.parse(localStorage.getItem('musetab-custompat'));
    sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; selRange = null;
    document.querySelector('.pat-card.cpat').click();
    const cols = song.measures[1].voxes[0];
    return { dtV, durs: JSON.stringify(st.vox[0].durs),
      got: cols.map(c => c.dur + (c.dotted ? '.' : '')).join(),
      degs: cols.map(c => c.deg || 0).join() };
  });
  T(r.dtV === 'vocal' && r.durs === '[[4],[8],[8],[4,1]]'
    && r.got === '4,8,8,4.' && r.degs === '1,3,0,0',
    'T7 vox 草稿=简谱型（骨架含附点；套用重排时值音符保留）', JSON.stringify(r));

  // T8 重载持久化
  await pg.reload(); await pg.waitForTimeout(900);
  r = await pg.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('musetab-custompat') || '{}');
    showPatternLib('vox');
    const card = !!document.querySelector('.pat-card.cpat');
    closeModal();
    return { voxN: (st.vox || []).length, card };
  });
  T(r.voxN === 1 && r.card, 'T8 重载持久化（vox 自定义恢复+库出卡）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
