/* v38.8 数据安全与快赢回归：迁移容错/坏状态不落盘/配额提示/防覆盖/新入口
   v41.5 单窗口化改写：T1 历史多文档→取 cur、其余转存「我的曲谱」不丢数据；
   T4/T5 loadSong 防覆盖由"另开窗口"改为"确认对话"（取消保留/确认替换/已入库直接替换） */
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
  await pg1.goto(F); await pg1.waitForTimeout(1600);
  /* v60.99 多开回归（v41.5 单窗口收敛撤销）：损坏文档仍只丢该条；其余历史窗口
     全部恢复为项目页签（不再转存「我的曲谱」），页签条可见、切换后内容完好 */
  let r = await pg1.evaluate(() => {
    hideStartPad();   // 启动台态页签条按设计隐藏——离开启动台后应可见
    const tabs = document.querySelectorAll('#doc-tabs .dtab').length;
    const visible = document.getElementById('doc-tabs').offsetParent !== null;
    const cur = song.title;
    switchDocTo(1);
    return { n: docs.length, cur, tabs, visible, second: song.title,
      toast: document.getElementById('toast').textContent };
  });
  T(r.n === 2 && r.cur === '完好一' && r.tabs === 2 && r.visible && r.second === '完好二',
    'T1 损坏容错+多开页签恢复', '当前=' + r.cur + ' 页签=' + r.tabs + '(可见=' + r.visible + ') 切换后=' + r.second);
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
    persistNow();   /* v65.6 B6a ② 落盘防抖：写盘在 350ms 后合并执行，这里立即 flush 触发配额异常 */
    Storage.prototype.setItem = old;
    return { toast: document.getElementById('toast').textContent };
  });
  T(r.toast.includes('存储写入失败'), 'T3 配额失败明确提示', r.toast.slice(0, 30));

  // T4 防静默覆盖（v41.5 确认对话版）：未入库+有编辑时 loadSong 先弹确认；
  //    取消→原谱保留未替换；确认「直接替换」→替换生效且仍是单窗口
  r = await pg.evaluate(() => {
    const s0 = createSong('vocal', {nVox:1, beats:4, unit:4, key:'C', nMea:2, lyr:0});
    s0.title = '未保存的心血';
    docs = [{song: s0, sel: null}]; curDocI = 0; song = s0;
    undoStack = []; redoStack = []; clampSel(); render();
    mutate(() => { song.title = '未保存的心血·改'; });   // 产生编辑记录
    loadSong(PRESETS[0].make());
    const dlgShown = !!document.getElementById('gr-cancel');
    const keptDuringDlg = song.title === '未保存的心血·改';
    if (dlgShown) document.getElementById('gr-cancel').click();       // 先取消
    const keptAfterCancel = song.title === '未保存的心血·改';
    loadSong(PRESETS[0].make());                                       // 再次打开并确认替换
    if (document.getElementById('gr-go')) document.getElementById('gr-go').click();
    return { dlgShown, keptDuringDlg, keptAfterCancel,
      replaced: song.title !== '未保存的心血·改', n: docs.length };
  });
  T(r.dlgShown && r.keptDuringDlg && r.keptAfterCancel && r.replaced && r.n === 1,
    'T4 未入库编辑先确认后替换', '弹窗=' + r.dlgShown + ' 取消保留=' + r.keptAfterCancel +
    ' 确认替换=' + r.replaced + ' 单窗口=' + (r.n === 1));

  // T5 已入库(song.id 存在)时直接替换（无确认对话、窗口数保持 1）
  r = await pg.evaluate(() => {
    song.id = 'sfake01'; persist._warned = true;   // 标记为已入库
    const t0 = song.title;
    loadSong(PRESETS[1].make());
    const noDlg = !document.getElementById('gr-cancel');
    return { noDlg, replaced: song.title !== t0, n: docs.length };
  });
  T(r.noDlg && r.replaced && r.n === 1, 'T5 已入库直接替换兼容',
    '无弹窗=' + r.noDlg + ' 已替换=' + r.replaced + ' 单窗口=' + (r.n === 1));

  // T6 快赢入口：播放条谱架按钮 / 0.25× 倍速 / 向导差异化入口条 / 发布免责说明
  r = await pg.evaluate(() => {
    const stand = document.getElementById('b-stand');
    const rate025 = !!document.querySelector('#mx-rate option[value="0.25"]');
    document.getElementById('b-new').click();
    const feats = document.querySelectorAll('.nw-imp .nwi').length;   /* v60.45 导入区两卡（MusicXML/GP，哼唱全站暂下） */
    const cancel = document.getElementById('nw-cancel'); if (cancel) cancel.click();
    stand.click();
    const standOn = document.body.classList.contains('stand');
    if (standOn) exitStand();
    return { stand: !!stand, rate025, feats, standOn };
  });
  T(r.stand && r.rate025 && r.feats === 2 && r.standOn,   /* v60.45 导入 2 入口：MusicXML/GuitarPro（哼唱暂下、MIDI 在创作辅助）；v60.26 旧口径：
       改为创作辅助第一项（替代一键配和弦）与启动台直达独立界面（产品负责人指定） */
    'T6 谱架入口/0.25×/向导提权', '谱架可进=' + r.standOn + ' 提权按钮=' + r.feats);

  const allErrs = errs1.concat(errs);
  console.log('PASS ' + pass + '/' + total);
  console.log(allErrs.length ? 'ERRORS:\n' + allErrs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !allErrs.length ? 0 : 1);
})();
