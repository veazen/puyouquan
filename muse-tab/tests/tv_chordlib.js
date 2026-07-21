/* v39.0 和弦引擎回归：模板推导逐音高验证 / 12根音全覆盖 / 未知类型不再静默大三 / 尤克里里 / 斜杠 / 音程表 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 模板正确性：每个类型×E/A型×12根音，推导指法逐音解码，必须 ⊆ 和弦音集且含根音
  let r = await pg.evaluate(() => {
    const GOPEN = [4, 9, 2, 7, 11, 4];   // 指法串字符序（6弦→1弦）空弦 pc
    const bad = [];
    let n = 0;
    for (const qual in CHORD_TEMPLATES) {
      const iv = QUAL_INTERVALS[qual];
      if (!iv) { bad.push(qual + ':无音程表'); continue; }
      for (const form of ['E', 'A']) {
        if (!CHORD_TEMPLATES[qual][form]) continue;
        for (let root = 0; root < 12; root++) {
          const sh = movableShape(root, qual, form);
          if (!sh || sh.length !== 6) { bad.push(qual + form + root + ':空'); continue; }
          const allowed = new Set(Object.values(iv).map(v => (root + v) % 12));
          const got = new Set();
          [...sh].forEach((ch, i) => { if (ch !== 'x') got.add((GOPEN[i] + parseInt(ch, 36)) % 12); });
          if (!got.has(root % 12)) bad.push(qual + form + root + ':缺根音');
          for (const pc of got) if (!allowed.has(pc)) bad.push(qual + form + root + ':杂音' + pc);
          n++;
        }
      }
    }
    return { n, bad: bad.slice(0, 12) };
  });
  T(r.bad.length === 0, 'T1 模板逐音高验证', r.n + ' 个推导指法' + (r.bad.length ? ' 问题:' + r.bad.join(' | ') : ' 全部纯净'));

  // T2 全覆盖：12根音 × 22类型 chordShape 均非空（吉他）
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const ROOTS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    const SUFS = ['','m','7','maj7','m7','dim','dim7','m7b5','aug','sus2','sus4','7sus4','6','m6','9','maj9','m9','add9','11','13','5','mmaj7'];
    const miss = [];
    ROOTS.forEach(rt => SUFS.forEach(sf => { const s = chordShape(rt + sf); if (!s || s.length !== 6) miss.push(rt + sf); }));
    return { total: ROOTS.length * SUFS.length, miss: miss.slice(0, 10) };
  });
  T(r.miss.length === 0, 'T2 吉他 12×22 全覆盖', r.total + ' 组合' + (r.miss.length ? ' 缺:' + r.miss.join(',') : ' 全命中'));

  // T3 修复验证：未知类型不再静默退成大三和弦
  r = await pg.evaluate(() => ({
    unknownMovable: movableShape(6, 'xyz', 'E'),
    unknownShape: chordShape('F#xyz'),
    knownStill: !!chordShape('F#dim7'),
    dimNotMaj: (() => {   // F#dim 的推导指法不含大三度 A#(10)
      const sh = movableShape(6, 'dim', 'E'); const GOPEN = [4,9,2,7,11,4];
      const got = new Set(); [...sh].forEach((ch,i)=>{ if(ch!=='x') got.add((GOPEN[i]+parseInt(ch,36))%12); });
      return !got.has(10);
    })()
  }));
  T(r.unknownMovable === null && r.unknownShape === null && r.knownStill && r.dimNotMaj,
    'T3 未知类型明确失败/减和弦不再画成大三', 'movable=null:' + (r.unknownMovable === null) + ' dim纯净:' + r.dimNotMaj);

  // T4 尤克里里：12根音×8常用类型算法推导，4弦、含根音、无杂音
  r = await pg.evaluate(() => {
    loadSong(createSong('tanchang', {inst: 'uku', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0}));
    const ROOTS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    const SUFS = ['','m','7','maj7','m7','sus4','dim','9'];
    const bad = [];
    ROOTS.forEach(rt => SUFS.forEach(sf => {
      const s = chordShape(rt + sf);
      if (!s || s.length !== 4) { bad.push(rt + sf + ':空'); return; }
      const p = parseChordName(rt + sf), iv = QUAL_INTERVALS[sf];
      const allowed = new Set(Object.values(iv).map(v => (p.rootPc + v) % 12));
      const got = new Set(); [...s].forEach((ch, i) => { if (ch !== 'x') got.add((UKU_OPEN_PC[i] + parseInt(ch, 36)) % 12); });
      if (!got.has(p.rootPc)) bad.push(rt + sf + ':缺根音');
      for (const pc of got) if (!allowed.has(pc)) bad.push(rt + sf + ':杂音');
    }));
    return { bad: bad.slice(0, 10) };
  });
  T(r.bad.length === 0, 'T4 尤克里里 12×8 推导', r.bad.length ? '问题:' + r.bad.join(',') : '96 组合全部纯净');

  // T5 斜杠低音推导：无内置指法的 Db/F 也能生成，且最低发声弦为 F
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const sh = chordShape('Db/F');
    if (!sh) return { ok: false };
    const GOPEN = [4, 9, 2, 7, 11, 4];
    let lowest = null;
    [...sh].forEach((ch, i) => { if (lowest == null && ch !== 'x') lowest = (GOPEN[i] + parseInt(ch, 36)) % 12; });
    return { ok: true, sh, lowest, isF: lowest === 5 };
  });
  T(r.ok && r.isF, 'T5 斜杠低音 Db/F', '指法=' + r.sh + ' 最低音=F:' + r.isF);

  // T6 音程表：织体引擎兼容槽位 + 类型正确
  r = await pg.evaluate(() => {
    const cd = chordTones('Cdim'), fs = chordTones('Fsus4'), g13 = chordTones('G13'), unk = chordTones('Cxyz'), am7 = chordTones('Am7');
    return {
      dim5: cd.iv[5] === 6, sus3: fs.iv[3] === 5, t13: g13.iv[6] === 9 && g13.iv[7] === 10,
      slots: [cd, fs, g13, unk].every(x => [1, 3, 5, 8].every(k => x.iv[k] != null)),
      unkMaj: unk.iv[3] === 4, m7ok: am7.iv[3] === 3 && am7.iv[7] === 10
    };
  });
  T(r.dim5 && r.sus3 && r.t13 && r.slots && r.unkMaj && r.m7ok, 'T6 音程表升级',
    'dim减五=' + r.dim5 + ' sus4挂留=' + r.sus3 + ' 13和弦=' + r.t13 + ' 织体槽位齐=' + r.slots);

  // T7 下游链路冒烟：扩容和弦标注 + 渲染 + 自动补全无 NaN/报错
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    mutate(() => {
      song.measures[0].tabs[0][0].chord = 'Abmaj9';
      song.measures[1].tabs[0][0].chord = 'C#m7b5';
    });
    const svg = document.getElementById('score').innerHTML;
    return { nan: svg.includes('NaN'), undef: svg.includes('undefined'),
      dia1: !!chordShape('Abmaj9'), dia2: !!chordShape('C#m7b5') };
  });
  T(!r.nan && !r.undef && r.dia1 && r.dia2, 'T7 谱面渲染冒烟', '无NaN=' + !r.nan + ' 和弦图可得=' + (r.dia1 && r.dia2));

  // T8 编辑和弦弹窗（v39.2 单页版）：主音标签/无搜索/无调内条/无自定义指法行/22类型/试听/单页无滚动
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    sel = {mi:0, row:'tab', vi:0, ci:0, si:1};
    showChordEditor(0, 0, 0);
    const modal = document.querySelector('.modal');
    const h4s = [...modal.querySelectorAll('h4')].map(h => h.textContent);
    const hasZhuyin = h4s.some(t => t.startsWith('主音'));
    const noGenyin = !h4s.some(t => t.startsWith('根音'));
    const removed = !document.getElementById('ce-search') && !document.querySelector('[data-cdia]')
      && !document.querySelector('.ce-fret');
    const quals = document.querySelectorAll('[data-cq]').length;
    const hasPlay = !!document.getElementById('ce-play');
    const noNullCard = !document.querySelector('[data-cpos][data-shape="null"]');
    const onePage = modal.scrollHeight <= modal.clientHeight + 2;
    document.getElementById('ce-cancel').click();
    return { hasZhuyin, noGenyin, removed, quals, hasPlay, noNullCard, onePage };
  });
  T(r.hasZhuyin && r.noGenyin && r.removed && r.quals >= 20 && r.hasPlay && r.noNullCard && r.onePage,
    'T8 单页弹窗', '主音=' + r.hasZhuyin + ' 已精简=' + r.removed + ' 类型=' + r.quals + ' 无滚动=' + r.onePage);

  // T9 功能谱菜单：和弦图预览+试听入口出现
  r = await pg.evaluate(() => {
    loadSong(createSong('func', {nVox:1, beats:4, unit:4, key:'C', nMea:2, lyr:0}));
    sel = {mi:0, row:'vox', vi:0, ci:0, si:1}; clampSel(); render();
    song.measures[0].voxes[0][0].chord = 'C';
    showVoxChordMenu(300, 200);
    const pm = document.getElementById('popmenu');
    const hasSvg = !!pm.querySelector('.vc-prev svg');
    const hasPlay = !!pm.querySelector('#vc-play');
    closePop();
    return { hasSvg, hasPlay };
  });
  T(r.hasSvg && r.hasPlay, 'T9 功能谱菜单预览+试听', '和弦图=' + r.hasSvg + ' 试听=' + r.hasPlay);

  // T10 动态候选：调内和弦排最前、含自定义和弦
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    song.customChords['我的特殊'] = 'x32010';
    document.getElementById('i-chord').dispatchEvent(new Event('focus'));
    const opts = [...document.querySelectorAll('#chord-list option')].map(o => o.value);
    const dia = diatonicChords();
    return { first7: opts.slice(0, 7).join() === dia.join(), hasCustom: opts.includes('我的特殊'), n: opts.length };
  });
  T(r.first7 && r.hasCustom && r.n > 100, 'T10 动态候选', '调内置顶=' + r.first7 + ' 含自定义=' + r.hasCustom + ' 候选数=' + r.n);

  // T11 和弦图式创建器：旧指板矩阵移除，竖式和弦图可点格放音/顶部切×○/把位步进
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    showChordEditor(0, 0, 0);
    const noOldFb = document.querySelectorAll('[data-fb]').length === 0;
    const hasCdg = !!document.querySelector('.cdg');
    // 点 6弦(i=0) 第1格 → 该弦品位 = 把位起始品
    document.querySelector('[data-cdc="0:0"]').dispatchEvent(new MouseEvent('click', {bubbles: true}));
    const base = ceState._cdShownBase;
    const afterCell = (ceState.custom || '')[0] === (base <= 9 ? '' + base : base.toString(36));
    // 顶部切换：非×→×
    document.querySelector('[data-cdt="0"]').dispatchEvent(new MouseEvent('click', {bubbles: true}));
    const afterTop = (ceState.custom || '')[0] === 'x';
    // 把位直接输入数字（v39.3）
    const bi = document.getElementById('ce-base');
    bi.value = '7'; bi.dispatchEvent(new Event('change', {bubbles: true}));
    const stepped = ceState._cdShownBase === 7;
    document.getElementById('ce-cancel').click();
    return { noOldFb, hasCdg, afterCell, afterTop, stepped };
  });
  T(r.noOldFb && r.hasCdg && r.afterCell && r.afterTop && r.stepped,
    'T11 和弦图式创建器', '旧指板移除=' + r.noOldFb + ' 点格=' + r.afterCell + ' ×○切换=' + r.afterTop + ' 把位步进=' + r.stepped);

  // T12 升降号在主音左上角：TAB 和弦名 / 功能谱级数 / 弹窗预览 三处
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    mutate(() => { song.measures[0].tabs[0][0].chord = 'C#m7'; });
    const svg1 = document.getElementById('score').innerHTML;
    const tabOk = /♯<\/tspan><tspan[^>]*>Cm7</.test(svg1) && !svg1.includes('>C#m7<');
    loadSong(createSong('func', {nVox:1, beats:4, unit:4, key:'C', nMea:2, lyr:0}));
    song.funcNames = false;
    mutate(() => { song.measures[0].voxes[0][0].chord = 'Eb'; });   // 1=C 下 Eb = b3 级
    const svg2 = document.getElementById('score').innerHTML;
    const degOk = /♭<\/tspan><tspan[^>]*>3</.test(svg2);
    loadSong(PRESETS[0].make());
    showChordEditor(0, 0, 0);
    document.querySelector('[data-cr="F#"]').click();          // 主音 F#（rerender 后重查）
    document.querySelector('[data-cq="m"]').click();
    const sup = document.querySelector('.modal b sup.chacc');
    const prevOk = sup && sup.textContent === '♯';
    document.getElementById('ce-cancel').click();
    return { tabOk, degOk, prevOk: !!prevOk };
  });
  T(r.tabOk && r.degOk && r.prevOk, 'T12 升降号左上角', 'TAB=' + r.tabOk + ' 级数=' + r.degOk + ' 弹窗预览=' + r.prevOk);

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
