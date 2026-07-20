/* v38.8 数据安全与快赢回归：迁移容错/坏状态不落盘/配额提示/防覆盖/新入口 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 迁移逐条容错：三个文档中间一个损坏 → 只丢该条，其余两条完好加载
  const pg1 = await b.newPage();
  const errs1 = []; pg1.on('pageerror', e => errs1.push('PAGEERR:' + e.message));
  await pg1.addInitScript(() => {
    const good = t => ({v:3, title:t, key:'C', beats:4, unit:4, tempo:90, capo:0, customChords:{},
      tabVoices:[], voxVoices:['旋律1'], lyricLines:0,
      measures:[{tabs:[], voxes:[[{dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[]}]], lyrPad:{}}]});
    localStorage.setItem('musetab-docs-v1', JSON.stringify({cur:0, docs:[
      good('完好一'), {v:2, title:'损坏文档', measures:'不是数组'}, good('完好二')]}));
  });
  await pg1.goto(F); await pg1.waitForTimeout(1200);
  let r = await pg1.evaluate(() => ({ n: docs.length, titles: docs.map(d => d.song.title), cur: song.title,
    toast: document.getElementById('toast').textContent }));
  T(r.n === 2 && r.titles.join() === '完好一,完好二' && r.toast.includes('损坏'),
    'T1 单文档损坏不连累其余', '存活=' + r.titles.join('/') + ' 提示=' + (r.toast.slice(0, 20) || '(无)'));
  await pg1.close();

  // 之后的用例用干净页面
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);

  // T2 渲染异常不落盘：强制 render 依赖抛错 → 自动撤销，坏标题既不在 song 也不在 localStorage
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const t0 = song.title;
    const old = layoutSystems;
    layoutSystems = () => { throw new Error('模拟渲染崩溃'); };
    mutate(() => { song.title = '坏状态标题'; });
    layoutSystems = old;
    const stored = localStorage.getItem('musetab-song-v1') || '';
    return { t0, now: song.title, persisted: stored.includes('坏状态标题'),
      toast: document.getElementById('toast').textContent };
  });
  T(r.now === r.t0 && !r.persisted && r.toast.includes('撤销'),
    'T2 渲染异常自动撤销且不落盘', '标题还原=' + (r.now === r.t0) + ' 未写盘=' + !r.persisted);

  // T3 存储写入失败给出提示（模拟配额异常）
  r = await pg.evaluate(() => {
    const old = Storage.prototype.setItem;
    Storage.prototype.setItem = function(){ throw new DOMException('QuotaExceededError'); };
    persist._warned = false;
    mutate(() => { song.title = '配额测试'; });
    Storage.prototype.setItem = old;
    return { toast: document.getElementById('toast').textContent };
  });
  T(r.toast.includes('存储写入失败'), 'T3 配额失败明确提示', r.toast.slice(0, 30));

  // T4 防静默覆盖：未入库+有编辑时 loadSong 另开新窗口，原曲谱保留
  r = await pg.evaluate(() => {
    const s0 = createSong('vocal', {nVox:1, beats:4, unit:4, key:'C', nMea:2, lyr:0});
    s0.title = '未保存的心血';
    docs = [{song: s0, sel: null}]; curDocI = 0; song = s0;
    undoStack = []; redoStack = []; clampSel(); render();
    mutate(() => { song.title = '未保存的心血·改'; });   // 产生编辑记录
    const before = docs.length;
    loadSong(PRESETS[0].make());
    return { before, after: docs.length, kept: docs.some(d => d.song.title === '未保存的心血·改'),
      current: song.title };
  });
  T(r.after === r.before + 1 && r.kept && r.current !== '未保存的心血·改',
    'T4 未入库编辑不被覆盖', '窗口 ' + r.before + '→' + r.after + ' 原谱保留=' + r.kept);

  // T5 已入库(song.id 存在)时保持原地打开行为（不多开窗口）
  r = await pg.evaluate(() => {
    song.id = 'sfake01'; persist._warned = true;   // 标记为已入库
    const before = docs.length;
    loadSong(PRESETS[1].make());
    return { before, after: docs.length };
  });
  T(r.after === r.before, 'T5 已入库原地打开兼容', '窗口数不变=' + (r.after === r.before));

  // T6 快赢入口：播放条谱架按钮 / 0.25× 倍速 / 向导差异化入口条 / 发布免责说明
  r = await pg.evaluate(() => {
    const stand = document.getElementById('b-stand');
    const rate025 = !!document.querySelector('#mx-rate option[value="0.25"]');
    document.getElementById('b-new').click();
    const feats = document.querySelectorAll('.nw-feats .nwf').length;
    const cancel = document.getElementById('nw-cancel'); if (cancel) cancel.click();
    stand.click();
    const standOn = document.body.classList.contains('stand');
    if (standOn) exitStand();
    return { stand: !!stand, rate025, feats, standOn };
  });
  T(r.stand && r.rate025 && r.feats === 3 && r.standOn,
    'T6 谱架入口/0.25×/向导提权', '谱架可进=' + r.standOn + ' 提权按钮=' + r.feats);

  const allErrs = errs1.concat(errs);
  console.log('PASS ' + pass + '/' + total);
  console.log(allErrs.length ? 'ERRORS:\n' + allErrs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !allErrs.length ? 0 : 1);
})();
