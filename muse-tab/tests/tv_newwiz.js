/* v60.41 音轨化新建向导回归（P0：三意图卡一屏，谱类＝音轨组合×显示方式）：
   T1 一屏结构：三意图卡在位、旧 .ntype 九卡不在、无第二步（nw-create 直接在首屏）、
      导入组 3 入口保留、基础信息四项在位；默认态=器乐卡亮+吉他/伴奏药丸亮
   T2 一击默认建谱：打开→直接点创建 → 吉他弹唱谱（吉他1+旋律1、8 小节、歌词 1 行）
   T3 组合等价矩阵：16 种组合经 UI 创建的产物 与 直接调 createSong 的产物 逐字段一致
      （tabVoices/voxVoices/voxNotations/lyricLines/tabStaff/gtype/pianoAcc/chordOnly/func/inst/小节数；
        v60.46 起含 民乐→简谱独奏 / 管弦→五线谱谱号预置 / 键盘族→大谱表）
   T4 次级联动：换意图/换乐器时次级行内容与钳形正确
   T5 基础信息生效：标题/调/拍号/速度落到 song
   T7 乐器身份+音色预置（v60.46）：instKey 落谱面、混音台按乐器预置、吉他弹唱不受扰
   T6 手机视口：向导弹窗无横向溢出
   对 v60.40 旧文件跑：无 .nw-int → T1 起当场红；对 v60.45 旧文件跑：无 .nw-grpcap/erhu → T1/T3 红（突变实证）。file:// 直载。 */
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
      /* v60.45 导入区两卡（哼唱暂下）+ 二级图标；v60.46 扩编 21 乐器分组；v60.47 二级下拉化 */
      feats: q('.nw-imp .nwi'), humGone: !document.getElementById('nw-hum'),
      instGrid: q('.nw-dd[data-dd="instKey"] .nw-dditem') >= 20,
      instGrps: q('.nw-dd[data-dd="instKey"] .nw-ddcap') >= 4,
      dds: q('#nw-sub .nw-dd') >= 2,
      ddClosed: q('.nw-dd.open') === 0,
      subIcons: q('#nw-sub .nw-dditem svg') > 0 && q('#nw-sub .nw-ddbtn svg') > 0,
      basics: !!document.getElementById('nw-title') && !!document.getElementById('nw-key')
        && !!document.getElementById('nw-beats') && !!document.getElementById('nw-unit') && !!document.getElementById('nw-tempo'),
      defInt: (document.querySelector('.nw-int.on') || {}).dataset ? document.querySelector('.nw-int.on').dataset.int : null,
      defInst: !!document.querySelector('.nw-dditem[data-k="instKey"][data-v="guitar"].on'),
      defForm: !!document.querySelector('.nw-dditem[data-k="form"][data-v="acc"].on'),
      /* 下拉钮开合与外点收起（v60.47 交互口径） */
      ddFlow: (()=>{ const b=document.querySelector('.nw-dd[data-dd="instKey"] .nw-ddbtn');
        b.click(); const opened=!!document.querySelector('.nw-dd[data-dd="instKey"].open');
        document.querySelector('.nw-basics').click();
        const closed=!document.querySelector('.nw-dd.open');
        return opened && closed; })()
    };
  });
  T(r.ints === 3 && r.oldCards === 0 && r.createHere && r.feats === 2 && r.humGone
    && r.instGrid && r.instGrps && r.dds && r.ddClosed && r.ddFlow && r.subIcons && r.basics
    && r.defInt === 'inst' && r.defInst && r.defForm,
    'T1 一屏结构（三意图卡/二级下拉·乐器菜单分组/开合外点收起/导入2卡哼唱撤/默认器乐·吉他·伴奏）', JSON.stringify(r));

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
      /* v60.46 扩编乐器：民乐→简谱独奏 / 管弦→五线谱(谱号预置) / 键盘族→大谱表 */
      ['inst', [['instKey', 'erhu']], 'vocal', { nVox: 1, lyr: 0 }],
      ['inst', [['instKey', 'violin']], 'instr', { clef: 'staff', nVox: 1, lyr: 0 }],
      ['inst', [['instKey', 'trombone']], 'instr', { clef: 'bass', nVox: 1, lyr: 0 }],
      ['inst', [['instKey', 'epiano'], ['form', 'psolo']], 'piano', { lyr: 0 }],
      ['inst', [['instKey', 'accordion']], 'pianoacc', { lyr: 1 }],
    ];
    const bad = [];
    CASES.forEach(([intent, clicks, type, extra], i) => {
      showNewWizard();
      document.querySelector('.nw-int[data-int="' + intent + '"]').click();
      clicks.forEach(([k, v]) => document.querySelector('[data-k="' + k + '"][data-v="' + v + '"]').click());
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
    const vocalRow = q('.nw-dditem[data-k="vocalN"]') && !q('[data-k="instKey"]');
    document.querySelector('.nw-int[data-int="inst"]').click();
    document.querySelector('.nw-dditem[data-k="form"][data-v="lead"]').click();
    document.querySelector('[data-k="instKey"][data-v="piano"]').click();   // lead 对钢琴非法 → 钳回 pacc
    const clamp = q('.nw-dditem[data-k="form"][data-v="pacc"].on') && !q('.nw-dditem[data-k="form"][data-v="lead"]');
    document.querySelector('[data-k="instKey"][data-v="other"]').click();
    const clefRow = q('.nw-dditem[data-k="clef"][data-v="staff"].on');
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

  // T7 乐器身份与混音音色预置（v60.46）：instKey 落谱面、tim 预置、吉他弹唱不受扰
  r = await pg.evaluate(() => {
    showNewWizard();
    document.querySelector('.nw-int[data-int="inst"]').click();
    document.querySelector('[data-k="instKey"][data-v="erhu"]').click();
    document.getElementById('nw-create').click();
    const erhu = { ik: song.instKey, tim: ((song.mixer||{})['vox:0']||{}).inst,
      live: trackCfg('vox',0).inst, icon: !!INST_ICON[song.instKey] };
    showNewWizard();
    document.querySelector('[data-k="instKey"][data-v="piano"]').click();
    document.querySelector('[data-k="form"][data-v="psolo"]').click();
    document.getElementById('nw-create').click();
    const pn = { ik: song.instKey, t0: trackCfg('vox',0).inst, t1: trackCfg('vox',1).inst };
    showNewWizard();
    document.getElementById('nw-create').click();   // 默认 器乐·吉他·伴奏
    const gt = { noIk: song.instKey===undefined, vox: trackCfg('vox',0).inst };
    return { erhu, pn, gt };
  });
  T(r.erhu.ik==='erhu' && r.erhu.tim==='strings' && r.erhu.live==='strings' && r.erhu.icon
    && r.pn.ik==='piano' && r.pn.t0==='piano' && r.pn.t1==='piano'
    && r.gt.noIk && r.gt.vox==='ah',
    'T7 乐器身份+音色预置（二胡→strings/钢琴双手→piano/弹唱人声轨仍 ah）', JSON.stringify(r));

  // T8 53231323 十六分两款（v60.47 产品指定）：数据口径 + C 和弦套用逐列实证
  r = await pg.evaluate(() => {
    showNewWizard(); document.getElementById('nw-create').click();   // 吉他弹唱 8 小节
    /* v60.51 起（2/4）款移入「分解 · 2/4」组——跨组查找 */
    const items = TAB_PATTERN_GROUPS.flatMap(g=>g.items);
    const p44 = items.find(p=>p.name==='53231323 十六分（4/4）');
    const p24 = items.find(p=>p.name==='53231323 十六分（2/4）');
    if(!p44||!p24) return {miss:1};
    const seq = ['b','s3','s2','s3','s1','s3','s2','s3'];
    const tok44 = p44.ev.map(e=>e[0]).join()===seq.concat(seq).join() && p44.ev.every(e=>e[1]===16);
    const tok24 = p24.ev.map(e=>e[0]).join()===seq.join() && p24.ev.every(e=>e[1]===16);
    song.measures[0].tabs[0][0].chord='C';
    sel={mi:1,row:'tab',vi:0,ci:0,si:1}; selRange=null;
    applyTabPattern(p44);
    const cols=song.measures[1].tabs[0];
    const nn=c=>JSON.stringify(c.notes);
    return { miss:0, tok44, tok24, b44:+patBeats(p44).toFixed(2), b24:+patBeats(p24).toFixed(2),
      n:cols.length, allDur:cols.every(c=>c.dur===16),
      root0:nn(cols[0]), s3:nn(cols[1]), s2:nn(cols[2]), s1:nn(cols[4]), root8:nn(cols[8]) };
  });
  T(!r.miss && r.tok44 && r.tok24 && r.b44===4 && r.b24===2 && r.n===16 && r.allDur
    && r.root0==='[{"s":5,"f":3}]' && r.s3==='[{"s":3,"f":0}]' && r.s2==='[{"s":2,"f":1}]'
    && r.s1==='[{"s":1,"f":0}]' && r.root8==='[{"s":5,"f":3}]',
    'T8 53231323 十六分 4/4+2/4（后半保持根音非交替低音；C 指法逐列实证）', JSON.stringify(r));
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
