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
   —— v60.57 追加（产品指示：节奏型库支持使用连音线）：
   T9  内置连音线节奏型：两库各有一条带连音线的示例；库预览卡画出弧线；拍数不变
   T10 套用落地：TAB 侧按同弦接 n.tk 指针（接不上不产生野指针）、谱面真出现连音线弧；
       简谱侧节奏型自带 tie 生效且不抹掉旋律原有的 tie
   T11 自定义往返：草稿里画连音线 → 保存到库（ev 第 4 位 / durs 第 3 位）→「改」铺回草稿仍带线
   对 v60.48 旧文件跑：无 #pm-go（步进编辑器无拍号弹窗）→ T2 当场红（突变实证）；
   对 v60.56 旧文件跑 T9/T10/T11 当场红。file:// 直载。 */
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

  /* ===== v60.57 追加：节奏型连音线 ===== */

  // T9 内置连音线节奏型 + 库预览画出弧线
  r = await pg.evaluate(() => {
    const gT = TAB_PATTERN_GROUPS.find(x => x.cat.indexOf('4/4') >= 0);
    const iT = gT.items.findIndex(it => (it.ev || []).some(e => e[3]));
    const gV = VOX_PATTERN_GROUPS.find(x => x.cat.indexOf('组合') >= 0);
    const iV = gV.items.findIndex(it => (it.durs || []).some(d => d[2]));
    const beatsT = iT >= 0 ? +patBeats(gT.items[iT]).toFixed(2) : null;
    const beatsV = iV >= 0 ? +patBeats(gV.items[iV]).toFixed(2) : null;
    /* 库卡片里画出弧线（<path d 含 Q>）——预览看得见才叫「库支持」 */
    showPatternLib('tab');
    const cT = [...document.querySelectorAll('.pat-card')].find(c => (c.textContent || '').indexOf('切分延音') >= 0);
    const arcT = cT ? [...cT.querySelectorAll('svg path')].filter(x => (x.getAttribute('d') || '').indexOf(' Q ') > 0).length : 0;
    closeModal();
    showPatternLib('vox');
    const cV = [...document.querySelectorAll('.pat-card')].find(c => (c.textContent || '').indexOf('切分延音') >= 0);
    const arcV = cV ? [...cV.querySelectorAll('svg path')].filter(x => (x.getAttribute('d') || '').indexOf(' Q ') > 0).length : 0;
    closeModal();
    return { iT, iV, beatsT, beatsV, arcT, arcV, nameT: iT >= 0 ? gT.items[iT].name : null };
  });
  T(r.iT >= 0 && r.iV >= 0 && r.beatsT === 4 && r.beatsV === 4 && r.arcT >= 1 && r.arcV >= 1,
    'T9 两库各有连音线示例 + 预览卡画出弧线 + 拍数正确', JSON.stringify(r));

  // T10 套用落地：TAB 接 n.tk 指针 + 谱面出弧；简谱 tie 生效且不抹旧 tie
  r = await pg.evaluate(() => {
    const gT = TAB_PATTERN_GROUPS.find(x => x.cat.indexOf('4/4') >= 0);
    const pT = gT.items.find(it => (it.ev || []).some(e => e[3]));
    loadSong(createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 }));
    song.measures[0].tabs[0][0].chord = 'C';
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; render();
    applyTabPattern(pT);
    const cols = song.measures[0].tabs[0];
    const links = [];
    cols.forEach((c, i) => (c.notes || []).forEach(n => { if (n.tk) links.push(i + '->' + n.tk.ci + ':s' + n.tk.si); }));
    /* 野指针护栏：每条 tk 的目标列必须存在且该弦上确实有音 */
    const sane = links.every(L => {
      const a = +L.split('->')[0], ci = +L.split('->')[1].split(':')[0], si = +L.split(':s')[1];
      const b2 = cols[ci];
      return b2 && (b2.notes || []).some(n => n.s === si) && ci === a + 1;
    });
    blurSel = true; render();
    const arcs = [...document.querySelectorAll('#score path')].filter(x => !x.getAttribute('transform'))
      .map(x => x.getAttribute('d') || '').filter(d => d.slice(0, 2) === 'M ' && d.indexOf(' Q ') > 0);
    // 简谱侧
    const gV = VOX_PATTERN_GROUPS.find(x => x.cat.indexOf('组合') >= 0);
    const pV = gV.items.find(it => (it.durs || []).some(d => d[2]));
    loadSong(createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 }));
    song.measures[0].voxes[0] = [1, 2, 3, 5, 6].map(d =>
      Object.assign({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false }));
    song.measures[0].voxes[0][3].tie = true;          // 旋律本来就有一条 tie，套用后不该被抹掉
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render();
    applyVoxPattern(pV);
    const vTies = song.measures[0].voxes[0].map(c => !!c.tie);
    return { links, sane, arcOnScore: arcs.length, vTies };
  });
  T(r.links.length >= 1 && r.sane && r.arcOnScore >= 1 && r.vTies[1] === true && r.vTies[3] === true,
    'T10 套用落地：TAB 接同弦指针+谱面出弧；简谱 tie 生效且不抹旧 tie', JSON.stringify(r));

  // T11 自定义往返：草稿画连音线 → 入库 → 「改」铺回仍带线
  r = await pg.evaluate(() => {
    localStorage.removeItem('musetab-custompat');
    window.askText = (t, d, cb) => cb('连音线自定义');
    startPatEdit('tab', null, 4, 4);
    const cs = song.measures[0].tabs[0];
    cs.length = 0;
    for (let i = 0; i < 8; i++) cs.push(Object.assign(tcol(), { dur: 8, notes: [{ s: 3, f: 0 }] }));
    cs[0].chord = 'C';
    cs[2].notes[0].tk = { mi: 0, ci: 3, si: 3 };       // 第 3 列连到第 4 列（3 弦）
    render();
    patEditSave();
    const st = JSON.parse(localStorage.getItem('musetab-custompat') || '{}');
    const ev = (st.tab || [])[0] ? st.tab[0].ev : null;
    const savedTie = ev ? ev.map(e => e[3] ? 1 : 0) : null;
    /* 「改」铺回草稿：连音线指针要还在 */
    startPatEdit('tab', 0, 4, 4);
    const back = song.measures[0].tabs[0];
    const backTk = back.map((c, i) => (c.notes || []).some(n => n.tk && n.tk.ci === i + 1) ? 1 : 0);
    endPatEdit();
    return { savedTie, backTk, nEv: ev ? ev.length : 0 };
  });
  T(r.nEv === 8 && r.savedTie && r.savedTie[2] === 1 && r.savedTie.reduce((a, x) => a + x, 0) === 1
    && r.backTk && r.backTk[2] === 1,
    'T11 自定义往返：草稿连音线入库（ev 第 4 位）→「改」铺回仍带线', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
