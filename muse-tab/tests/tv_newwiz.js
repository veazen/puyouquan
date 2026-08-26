/* v60.41 音轨化新建向导回归（P0：三意图卡一屏，谱类＝音轨组合×显示方式）：
   T1 一屏结构：三意图卡在位、旧 .ntype 九卡不在、无第二步（nw-create 直接在首屏）、
      导入组 3 入口保留、基础信息四项在位；默认态=器乐卡亮+吉他/伴奏药丸亮
   T2 一击默认建谱：打开→直接点创建 → 吉他弹唱谱（吉他1+旋律1、8 小节、歌词 1 行）
   T3 组合等价矩阵：11 种组合经 UI 创建的产物 与 直接调 createSong 的产物 逐字段一致
      （tabVoices/voxVoices/voxNotations/lyricLines/tabStaff/gtype/pianoAcc/chordOnly/func/inst/小节数）
   T4 次级联动：换意图/换乐器时次级行内容与钳形正确
   T5 基础信息生效：标题/调/拍号/速度落到 song
   T6 手机视口：向导弹窗无横向溢出
   对 v60.40 旧文件跑：无 .nw-int → T1 起当场红（突变实证）。file:// 直载。 */
const { chromium, devices } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  // T1 一屏结构与默认态
  let r = await pg.evaluate(() => {
    showNewWizard();
    const q = s => document.querySelectorAll(s).length;
    return {
      ints: q('.nw-int'), oldCards: q('.ntype'), createHere: !!document.getElementById('nw-create'),
      feats: q('.nw-feats .nwf'),
      basics: !!document.getElementById('nw-title') && !!document.getElementById('nw-key')
        && !!document.getElementById('nw-beats') && !!document.getElementById('nw-unit') && !!document.getElementById('nw-tempo'),
      defInt: (document.querySelector('.nw-int.on') || {}).dataset ? document.querySelector('.nw-int.on').dataset.int : null,
      defInst: !!document.querySelector('.nw-pill[data-k="instKey"][data-v="guitar"].on'),
      defForm: !!document.querySelector('.nw-pill[data-k="form"][data-v="acc"].on')
    };
  });
  T(r.ints === 3 && r.oldCards === 0 && r.createHere && r.feats === 3 && r.basics
    && r.defInt === 'inst' && r.defInst && r.defForm,
    'T1 一屏结构（三意图卡/旧九卡撤/创建在首屏/导入3入口/默认器乐·吉他·伴奏）', JSON.stringify(r));

  // T2 一击默认建谱 = 吉他弹唱
  r = await pg.evaluate(() => {
    document.getElementById('nw-create').click();
    return { tab: song.tabVoices.slice(), vox: song.voxVoices.slice(), mea: song.measures.length,
      lyr: song.lyricLines, inst: song.inst, title: song.title };
  });
  T(r.tab.length === 1 && r.vox.length === 1 && r.mea === 8 && r.lyr === 1 && r.inst === 'guitar'
    && r.title === '未命名曲谱',
    'T2 一击默认建谱=吉他弹唱（吉他1+旋律1·8小节·词1行）', JSON.stringify(r));

  // T3 组合等价矩阵：UI 产物 vs 直接 createSong 产物
  r = await pg.evaluate(() => {
    const sig = s => JSON.stringify({
      tab: s.tabVoices, vox: s.voxVoices, nota: s.voxNotations || null, lyr: s.lyricLines,
      ts: !!s.tabStaff, gt: s.gtype || null, pa: !!s.pianoAcc, co: !!s.chordOnly,
      fn: !!s.func, inst: s.inst, mea: s.measures.length
    });
    const base = { title: '未命名曲谱', singer: '', lyricist: '', composer: '', maker: '',
      beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 8, capo: 0 };
    /* 组合：[意图, 次级点击序列, 期望的 createSong(type,o) 参数] */
    const CASES = [
      ['vocal', [], 'vocal', { nVox: 1, lyr: 1 }],
      ['vocal', [['vocalN', '4']], 'vocal', { nVox: 4, lyr: 1 }],
      ['inst', [], 'tanchang', { inst: 'guitar', nTab: 1, nVox: 1, lyr: 1 }],
      ['inst', [['instKey', 'uku']], 'tanchang', { inst: 'uku', nTab: 1, nVox: 1, lyr: 1 }],
      ['inst', [['form', 'lead']], 'solo', { gtype: 'lead', nVox: 0, lyr: 0 }],
      ['inst', [['form', 'finger']], 'solo', { gtype: 'finger', nVox: 0, lyr: 0 }],
      ['inst', [['instKey', 'piano']], 'pianoacc', { lyr: 1 }],
      ['inst', [['instKey', 'piano'], ['form', 'psolo']], 'piano', { lyr: 0 }],
      ['inst', [['instKey', 'other'], ['clef', 'alto']], 'instr', { clef: 'alto', nVox: 1, lyr: 0 }],
      ['func', [], 'func', { ftype: 'func', nVox: 1, lyr: 1 }],
      ['func', [['ftype', 'chord']], 'func', { ftype: 'chord', nVox: 1, lyr: 1 }],
    ];
    const bad = [];
    CASES.forEach(([intent, clicks, type, extra], i) => {
      showNewWizard();
      document.querySelector('.nw-int[data-int="' + intent + '"]').click();
      clicks.forEach(([k, v]) => document.querySelector('.nw-pill[data-k="' + k + '"][data-v="' + v + '"]').click());
      document.getElementById('nw-create').click();
      const got = sig(song);
      const want = sig(createSong(type, Object.assign({}, base, extra)));
      if (got !== want) bad.push({ i, type, got, want });
    });
    return { n: CASES.length, bad };
  });
  T(r.bad.length === 0, 'T3 组合等价矩阵（' + r.n + ' 种组合 UI 产物 = createSong 直调产物）',
    r.bad.length ? JSON.stringify(r.bad[0]) : 'all equal');

  // T4 次级联动与钳形
  r = await pg.evaluate(() => {
    showNewWizard();
    const q = s => !!document.querySelector(s);
    document.querySelector('.nw-int[data-int="vocal"]').click();
    const vocalRow = q('.nw-pill[data-k="vocalN"]') && !q('.nw-pill[data-k="instKey"]');
    document.querySelector('.nw-int[data-int="inst"]').click();
    document.querySelector('.nw-pill[data-k="form"][data-v="lead"]').click();
    document.querySelector('.nw-pill[data-k="instKey"][data-v="piano"]').click();   // lead 对钢琴非法 → 钳回 pacc
    const clamp = q('.nw-pill[data-k="form"][data-v="pacc"].on') && !q('.nw-pill[data-k="form"][data-v="lead"]');
    document.querySelector('.nw-pill[data-k="instKey"][data-v="other"]').click();
    const clefRow = q('.nw-pill[data-k="clef"][data-v="staff"].on');
    document.getElementById('nw-cancel').click();
    return { vocalRow, clamp, clefRow };
  });
  T(r.vocalRow && r.clamp && r.clefRow, 'T4 次级联动（声乐行/钢琴钳形/谱号行）', JSON.stringify(r));

  // T5 基础信息生效
  r = await pg.evaluate(() => {
    showNewWizard();
    document.getElementById('nw-title').value = '试验曲';
    document.getElementById('nw-key').value = 'G';
    document.getElementById('nw-beats').value = '3';
    document.getElementById('nw-tempo').value = '120';
    document.getElementById('nw-create').click();
    return { t: song.title, k: song.key, b: song.beats, tp: song.tempo };
  });
  T(r.t === '试验曲' && r.k === 'G' && r.b === 3 && r.tp === 120, 'T5 基础信息生效', JSON.stringify(r));
  await pg.close();

  // T6 手机视口无横向溢出
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'zh-CN' });
  const pm = await ctx.newPage();
  const errsM = []; pm.on('pageerror', e => errsM.push(e.message));
  await pm.goto(F); await pm.waitForTimeout(900);
  r = await pm.evaluate(() => {
    window.guardReplace = p => p();
    showNewWizard();
    const m = document.querySelector('.modal');
    return { over: document.documentElement.scrollWidth - window.innerWidth,
      mOver: m ? m.scrollWidth - m.clientWidth : 99, ints: document.querySelectorAll('.nw-int').length };
  });
  T(r.over <= 0 && r.mOver <= 1 && r.ints === 3, 'T6 手机视口向导无横向溢出', JSON.stringify(r));
  await ctx.close();

  T(errs.concat(errsM).length === 0, '无页面报错', errs.concat(errsM).join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
