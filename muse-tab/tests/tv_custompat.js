/* v60.48 自定义节奏型回归（产品指示：节奏型库增加自定义节奏型编辑功能，设计编辑界面，支持不同谱类）：
   T1 库弹窗自定义组：tab/vox 两库均有「自定义」组与「＋新建」卡
   T2 编辑器结构（tab）：名称/时值行/托盘/步序列/实时预览/拍数在位；托盘 token 全集；
      尤克里里谱打开时 5/6 弦 token 隐藏（随 strN 口径）
   T3 构建+保存（tab）：时值8分 → b s3 s2 s3 四步 → 拍数 2 → 保存 → musetab-custompat 落库 + 库出卡
   T4 套用实证：C 和弦语境套用自定义分解 → 逐列 dur/指法与 evToCol 口径一致
   T5 编辑与删除：预填改后覆盖保存；删除卡与存储同步消失
   T6 vox 编辑器：时值点击即加步（含附点）→ 拍数 3.5 → 保存套用 → 简谱列 dur/dotted 逐列一致
   T7 持久化：重载页面后两库恢复、库弹窗卡仍在
   对 v60.47 旧文件跑：无 #cpat-new → T1 当场红（突变实证）。file:// 直载。 */
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
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    window.confirm = () => true; localStorage.removeItem('musetab-custompat'); });

  // T1 两库均有自定义组
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

  // T2 编辑器结构 + uku 弦数口径
  r = await pg.evaluate(() => {
    showPatternLib('tab'); document.getElementById('cpat-new').click();
    const q = s => !!document.querySelector(s);
    const toks = [...document.querySelectorAll('.pe-pal [data-pt]')].map(x => x.dataset.pt);
    const gt = { name: q('#pe-name'), steps: q('#pe-steps'), prev: q('#pe-prev'), beats: q('#pe-beats'),
      save: q('#pe-save'), durs: document.querySelectorAll('.pe-durs [data-pd]').length,
      dot: q('#pe-dot'),
      toks: ['b','B','s1','s2','s3','s4','s5','s6','c','d','u','md','a','x','r'].every(t => toks.includes(t)) };
    document.getElementById('pe-cancel').click(); closeModal();
    /* 尤克里里谱：s5/s6 不出现 */
    showNewWizard();
    document.querySelector('.nw-int[data-int="inst"]').click();
    document.querySelector('[data-k="instKey"][data-v="uku"]').click();
    document.getElementById('nw-create').click();
    showPatternLib('tab'); document.getElementById('cpat-new').click();
    const utoks = [...document.querySelectorAll('.pe-pal [data-pt]')].map(x => x.dataset.pt);
    const uk = { noS5: !utoks.includes('s5'), noS6: !utoks.includes('s6'), hasS4: utoks.includes('s4') };
    document.getElementById('pe-cancel').click(); closeModal();
    return { gt, uk };
  });
  T(r.gt.name && r.gt.steps && r.gt.prev && r.gt.beats && r.gt.save && r.gt.durs === 4 && r.gt.dot && r.gt.toks
    && r.uk.noS5 && r.uk.noS6 && r.uk.hasS4,
    'T2 编辑器结构（托盘全集/时值4档+附点/预览拍数；uku 隐 5/6 弦）', JSON.stringify(r));

  // T3 构建+保存（tab）——回吉他弹唱谱
  r = await pg.evaluate(() => {
    showNewWizard(); document.getElementById('nw-create').click();
    showPatternLib('tab'); document.getElementById('cpat-new').click();
    document.querySelector('.pe-durs [data-pd="8"]').click();
    ['b','s3','s2','s3'].forEach(t => document.querySelector('.pe-pal [data-pt="' + t + '"]').click());
    const beats = document.getElementById('pe-beats').textContent;
    const prevSvg = document.getElementById('pe-prev').innerHTML.includes('<svg');
    document.getElementById('pe-name').value = '我的5323';
    document.getElementById('pe-save').click();
    const st = JSON.parse(localStorage.getItem('musetab-custompat'));
    const card = !!document.querySelector('.pat-card.cpat');
    return { beats, prevSvg, card, tabN: st.tab.length,
      ev: JSON.stringify(st.tab[0].ev), name: st.tab[0].name };
  });
  T(/2/.test(r.beats) && r.prevSvg && r.card && r.tabN === 1 && r.name === '我的5323'
    && r.ev === '[["b",8],["s3",8],["s2",8],["s3",8]]',
    'T3 构建+保存（8分×4步=2拍，落库+库出卡）', JSON.stringify(r));

  // T4 套用实证（C 和弦）
  r = await pg.evaluate(() => {
    song.measures[0].tabs[0][0].chord = 'C';
    sel = { mi: 1, row: 'tab', vi: 0, ci: 0, si: 1 }; selRange = null;
    document.querySelector('.pat-card.cpat').click();   // 库弹窗仍开着：点自定义卡即套用
    const cols = song.measures[1].tabs[0];
    return { n: cols.length, durs: cols.map(c => c.dur).join(),
      notes: JSON.stringify(cols.map(c => c.notes)) };
  });
  T(r.n === 4 && r.durs === '8,8,8,8'
    && r.notes === '[[{"s":5,"f":3}],[{"s":3,"f":0}],[{"s":2,"f":1}],[{"s":3,"f":0}]]',
    'T4 套用实证（C 指法逐列：根音5弦3品/3弦0/2弦1/3弦0）', JSON.stringify(r));

  // T5 编辑与删除
  r = await pg.evaluate(() => {
    showPatternLib('tab');
    document.querySelector('.pat-card.cpat .cp-edit').click();
    const pre = { name: document.getElementById('pe-name').value,
      steps: document.querySelectorAll('#pe-steps .pe-step').length };
    document.getElementById('pe-undo').click();   // 退一步 → 3 步
    document.getElementById('pe-save').click();
    const st1 = JSON.parse(localStorage.getItem('musetab-custompat'));
    document.querySelector('.pat-card.cpat .cp-del').click();   // confirm 已 stub 为 true
    const st2 = JSON.parse(localStorage.getItem('musetab-custompat'));
    const gone = !document.querySelector('.pat-card.cpat');
    closeModal();
    return { pre, ev1: st1.tab[0].ev.length, tabN2: st2.tab.length, gone };
  });
  T(r.pre.name === '我的5323' && r.pre.steps === 4 && r.ev1 === 3 && r.tabN2 === 0 && r.gone,
    'T5 编辑预填+覆盖保存+删除同步', JSON.stringify(r));

  // T6 vox 编辑器（时值即步 + 附点）
  r = await pg.evaluate(() => {
    /* 简谱第 2 小节放两个音，验证套用时音符保留、时值重排 */
    song.measures[1].voxes[0][0].deg = 1; song.measures[1].voxes[0][1].deg = 3;
    showPatternLib('vox'); document.getElementById('cpat-new').click();
    document.querySelector('.pe-durs [data-pd="4"]').click();
    document.querySelector('.pe-durs [data-pd="8"]').click();
    document.querySelector('.pe-durs [data-pd="8"]').click();
    document.getElementById('pe-dot').click();
    document.querySelector('.pe-durs [data-pd="4"]').click();
    const beats = document.getElementById('pe-beats').textContent;
    document.getElementById('pe-name').value = '前四后附点';
    document.getElementById('pe-save').click();
    const st = JSON.parse(localStorage.getItem('musetab-custompat'));
    sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; selRange = null;
    document.querySelector('.pat-card.cpat').click();
    const cols = song.measures[1].voxes[0];
    return { beats, durs: JSON.stringify(st.vox[0].durs),
      got: cols.map(c => c.dur + (c.dotted ? '.' : '')).join(),
      degs: cols.map(c => c.deg || 0).join() };
  });
  T(/3\.5/.test(r.beats) && r.durs === '[[4],[8],[8],[4,1]]'
    && r.got === '4,8,8,4.' && r.degs === '1,3,0,0',
    'T6 vox 编辑器（4+8+8+附点4=3.5拍；套用重排时值音符保留）', JSON.stringify(r));

  // T7 持久化：重载恢复
  await pg.evaluate(() => { showPatternLib('vox'); closeModal(); });
  await pg.reload(); await pg.waitForTimeout(900);
  r = await pg.evaluate(() => {
    window.guardReplace = p => p();
    const st = JSON.parse(localStorage.getItem('musetab-custompat') || '{}');
    showPatternLib('vox');
    const card = !!document.querySelector('.pat-card.cpat');
    closeModal();
    return { voxN: (st.vox || []).length, card };
  });
  T(r.voxN === 1 && r.card, 'T7 重载持久化（vox 自定义恢复+库出卡）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
