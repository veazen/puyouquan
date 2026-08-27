/* v60.51 节奏型库筛选回归（产品指示：2 拍十六分分解移到 2/4 分类和半小节分类；
   库改筛选展示不全铺，方便查找）：
   T1 默认收敛：4/4 谱打开 TAB 库→只见 4/4 组（2/4、3/4、散拍组不渲染）、筛选条在位、
      拍号 chip 4/4 高亮、自定义组恒显（＋新建卡在）
   T2 类型筛选=扫弦：只余扫弦组；再选散拍→半小节组内仅扫弦款（分解款被 item 级过滤）
   T3 拍号=散拍：半小节/一拍两组显示，含新增「53231323 十六分（半小节）」（span2·2拍）
   T4 归类调整：2/4 谱打开→默认见「分解 · 2/4」组含「53231323 十六分（2/4）」；
      4/4 组不渲染（旧版它在 4/4 组=突变红）
   T5 筛选后套用索引无错位：散拍筛选下点「53231323 十六分（半小节）」→ 填的是它不是别款
   T6 简谱库拍号筛选：4/4 谱只见 2/4 4/4 两组、3/4 6/8 组不见；切 3/4 反转
   对 v60.50 旧文件跑：无 .pf-bar → T1 当场红（突变实证）。file:// 直载。 */
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
    localStorage.removeItem('musetab-custompat'); });

  const cats = `[...document.querySelectorAll('.modal h4')].map(h=>h.textContent)`;

  // T1 默认收敛（4/4 谱）
  let r = await pg.evaluate(`(()=>{
    showNewWizard(); document.getElementById('nw-create').click();   // 4/4 吉他弹唱
    showPatternLib('tab');
    const cs=${cats};
    const st={ bar: !!document.querySelector('.pf-bar'),
      met44on: !!document.querySelector('.pf-chip[data-pfm="44"].on'),
      has44: cs.some(c=>c.includes('分解节奏型 · 4/4')) && cs.some(c=>c.includes('扫弦节奏型 · 4/4')),
      no24: !cs.some(c=>c.includes('· 2/4')), no34: !cs.some(c=>c.includes('3/4')),
      noFree: !cs.some(c=>c.includes('半小节')) && !cs.some(c=>c.includes('一拍')),
      cust: cs.some(c=>c.includes('自定义')) && !!document.getElementById('cpat-new') };
    return st; })()`);
  T(r.bar && r.met44on && r.has44 && r.no24 && r.no34 && r.noFree && r.cust,
    'T1 默认收敛=当前谱 4/4（筛选条/44 高亮/其余组不渲染/自定义恒显）', JSON.stringify(r));

  // T2 类型筛选=扫弦（含散拍组内 item 级过滤）
  r = await pg.evaluate(`(()=>{
    document.querySelector('.pf-chip[data-pft="strum"]').click();
    const cs1=${cats};
    const onlyStrum = cs1.filter(c=>c.includes('节奏型 ·')).every(c=>c.includes('扫弦'));
    document.querySelector('.pf-chip[data-pfm="free"]').click();
    const names=[...document.querySelectorAll('.pat-card .nm')].map(x=>x.textContent);
    const freeStrumOnly = names.some(n=>n.includes('扫弦 ↓')) && !names.some(n=>n.includes('分解 5323'))
      && !names.some(n=>n.includes('53231323 十六分（半小节）'));
    return { onlyStrum, freeStrumOnly }; })()`);
  T(r.onlyStrum && r.freeStrumOnly, 'T2 类型=扫弦（组级+散拍组内 item 级过滤）', JSON.stringify(r));

  // T3 拍号=散拍 全类型：两组在位 + 新增半小节十六分
  r = await pg.evaluate(`(()=>{
    document.querySelector('.pf-chip[data-pft="all"]').click();
    const cs=${cats};
    const names=[...document.querySelectorAll('.pat-card .nm')].map(x=>x.textContent);
    const card=[...document.querySelectorAll('.pat-card')].find(c=>c.querySelector('.nm').textContent==='53231323 十六分（半小节）');
    const bt=card? card.querySelector('.bt').textContent : '';
    return { half: cs.some(c=>c.includes('半小节')), one: cs.some(c=>c.includes('一拍')),
      hasNew: !!card, bt, no44: !cs.some(c=>c.includes('· 4/4')) }; })()`);
  T(r.half && r.one && r.hasNew && /2 拍/.test(r.bt) && r.no44,
    'T3 散拍=半小节/一拍两组（新增 53231323 半小节·2拍）', JSON.stringify(r));

  // T4 2/4 谱默认见 2/4 组（归类调整；旧版该款在 4/4 组=突变红）
  r = await pg.evaluate(`(()=>{
    closeModal();
    showNewWizard();
    document.getElementById('nw-beats').value='2';
    document.getElementById('nw-create').click();
    showPatternLib('tab');
    const cs=${cats};
    const names=[...document.querySelectorAll('.pat-card .nm')].map(x=>x.textContent);
    return { met24on: !!document.querySelector('.pf-chip[data-pfm="24"].on'),
      has24grp: cs.some(c=>c.includes('分解节奏型 · 2/4')),
      has24pat: names.includes('53231323 十六分（2/4）'),
      no44: !cs.some(c=>c.includes('· 4/4')) }; })()`);
  T(r.met24on && r.has24grp && r.has24pat && r.no44,
    'T4 2/4 谱默认=2/4 组（53231323 十六分（2/4）已归位）', JSON.stringify(r));

  // T5 筛选后套用索引无错位（散拍下点半小节十六分 → 填对款）
  r = await pg.evaluate(`(()=>{
    song.measures[0].tabs[0][0].chord='C';
    sel={mi:0,row:'tab',vi:0,ci:0,si:1}; selRange=null;
    document.querySelector('.pf-chip[data-pfm="free"]').click();
    const card=[...document.querySelectorAll('.pat-card')].find(c=>c.querySelector('.nm').textContent==='53231323 十六分（半小节）');
    card.click();
    const cols=song.measures[0].tabs[0];
    return { n: cols.filter(c=>c.notes.length).length,
      durs:[...new Set(cols.filter(c=>c.notes.length).map(c=>c.dur))].join(),
      first: JSON.stringify(cols[0].notes) }; })()`);
  T(r.n === 8 && r.durs === '16' && r.first === '[{"s":5,"f":3}]',
    'T5 筛选后套用无错位（半小节十六分 8×16分 · 根音5弦3品）', JSON.stringify(r));

  // T6 简谱库拍号筛选
  r = await pg.evaluate(`(()=>{
    showPatternLib('vox');
    const cs1=${cats};
    const noTyp = !document.querySelector('.pf-chip[data-pft]');
    const at24 = cs1.some(c=>c.includes('基础时值')) && !cs1.some(c=>c.includes('3/4 6/8'));
    document.querySelector('.pf-chip[data-pfm="34"]').click();
    const cs2=${cats};
    const at34 = cs2.some(c=>c.includes('3/4 6/8')) && !cs2.some(c=>c.includes('基础时值'));
    closeModal();
    return { noTyp, at24, at34 }; })()`);
  T(r.noTyp && r.at24 && r.at34, 'T6 简谱库拍号筛选（无类型行；2/4↔3/4 组切换）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
