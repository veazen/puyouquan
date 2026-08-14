/* tv_emode — v56.6 右栏重排 + 自由/智能编辑开关回归：
   创作页签置首为默认；光标位置/节拍检查（含开关+beat-box）在创作页；预提示卡移除；
   智能=修复建议+一键采纳，自由=只列正确与否（可定位、无建议无按钮）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0, errs = [];
const T = (ok, name, detail) => {
  if (ok) { pass++; console.log('✅ ' + name + (detail ? ': ' + detail : '')); }
  else { fail++; console.log('❌ ' + name + (detail ? ': ' + detail : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto(FILE); await pg.waitForTimeout(900);

  // T1 页签序与默认页：创作在前且默认选中；智能预提示卡已移除
  let r = await pg.evaluate(() => {
    const tabs = [...document.querySelectorAll('#rtabs .rtab')].map(b => b.dataset.p);
    const on = document.querySelector('#rtabs .rtab.on');
    return { tabs: tabs.join(','), onP: on && on.dataset.p, shell: document.body.classList.contains('shell'),
      hints: !!document.getElementById('rc-hints'), hintBody: !!document.getElementById('hint-body') };
  });
  T(r.tabs === 'make,info' && r.onP === 'make' && r.shell && !r.hints && !r.hintBody,
    'T1 创作页签置首默认+预提示卡移除', JSON.stringify(r));

  // T2 创作页内容：光标位置/节拍检查(开关+beat-box)可见且序在创作帮助前；信息页反之
  r = await pg.evaluate(() => {
    const vis = id => { const el = document.getElementById(id); return !!el && el.style.display !== 'none' && !!el.offsetParent; };
    const make = { cursor: vis('rc-cursor'), beat: vis('rc-beat'), em: vis('em-toggle'),
      bbHosted: (document.getElementById('beat-box') || {}).parentElement === document.getElementById('beat-host'),
      info: vis('rc-songinfo'),
      /* v57.2 栏目主题（用户指示）：光标卡=「当前编辑位置」；开关+时值提示同栏目=「编辑模式 · 时值提示」；
         标题必须可见（v56.6 曾整页隐藏 make 卡标题→栏目无主题，本次恢复两卡标题显示） */
      tCur: document.querySelector('#rc-cursor .rc-h').textContent.trim() === '当前编辑位置'
        && !!document.querySelector('#rc-cursor .rc-h').offsetParent,
      tBeat: document.querySelector('#rc-beat .rc-h').textContent.trim() === '编辑模式 · 时值提示'
        && !!document.querySelector('#rc-beat .rc-h').offsetParent };
    const order = (() => {
      const aside = document.getElementById('rc-cursor').parentElement;
      const ids = [...aside.children].map(el => el.id).filter(Boolean);
      return ids.indexOf('rc-cursor') < ids.indexOf('rc-beat');
    })();
    setRTab('info');
    const info = { cursor: vis('rc-cursor'), beat: vis('rc-beat'), info: vis('rc-songinfo') };
    setRTab('make');
    return { make, info, order };
  });
  T(r.make.cursor && r.make.beat && r.make.em && r.make.bbHosted && !r.make.info
    && r.make.tCur && r.make.tBeat
    && !r.info.cursor && !r.info.beat && r.info.info && r.order,
    'T2 创作页=当前编辑位置+编辑模式·时值提示(含beat-box)，信息页=曲谱信息', JSON.stringify(r));

  // 造一处时值错误：4/4 小节只填 2 拍
  await pg.evaluate(() => {
    window.guardReplace = p => p();
    const s = createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [ { dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false },
                               { dur: 4, dotted: false, deg: 2, acc: '', oct: 0, lyrics: [], tie: false } ];
    loadSong(s); blurSel = true; render();
  });

  // T3 智能编辑（默认）：状态 bad + 修复建议 + 单条/全部一键采纳按钮
  r = await pg.evaluate(() => {
    try{ localStorage.removeItem('musetab-editmode'); }catch(_){}
    syncInputs();
    const ed = document.getElementById('err-drop');
    return { bad: document.getElementById('beat-status').className === 'bad',
      smartOn: !![...document.querySelectorAll('#em-toggle button')].find(b => b.dataset.em === 'smart' && b.classList.contains('on')),
      sug: ed.querySelectorAll('.err-sug').length, fix: ed.querySelectorAll('.err-fix').length,
      all: !!ed.querySelector('#err-fixall'), hd: (ed.querySelector('.err-hd span') || {}).textContent || '' };
  });
  T(r.bad && r.smartOn && r.sug >= 1 && r.fix >= 1 && r.all && /修复建议/.test(r.hd),
    'T3 智能编辑：建议+一键采纳', JSON.stringify(r));

  // T4 切自由编辑（点开关）：只列正确与否，无建议/无采纳按钮；localStorage 持久化
  await pg.click('#em-toggle button[data-em="free"]');
  await pg.waitForTimeout(120);
  r = await pg.evaluate(() => {
    const ed = document.getElementById('err-drop');
    return { mode: localStorage.getItem('musetab-editmode'),
      freeOn: !![...document.querySelectorAll('#em-toggle button')].find(b => b.dataset.em === 'free' && b.classList.contains('on')),
      bad: document.getElementById('beat-status').className === 'bad',
      rows: ed.querySelectorAll('.err').length, sug: ed.querySelectorAll('.err-sug').length,
      fix: ed.querySelectorAll('.err-fix').length, all: !!ed.querySelector('#err-fixall'),
      hd: (ed.querySelector('.err-hd span') || {}).textContent || '' };
  });
  T(r.mode === 'free' && r.freeOn && r.bad && r.rows >= 1 && r.sug === 0 && r.fix === 0 && !r.all && /时值检查/.test(r.hd),
    'T4 自由编辑：只报正确与否，无修复建议', JSON.stringify(r));

  // T5 自由模式点行定位：sel 跳到该小节
  r = await pg.evaluate(() => {
    sel.mi = 1; sel.ci = 0;
    document.querySelector('#err-drop .err .err-desc').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { mi: sel.mi, row: sel.row };
  });
  T(r.mi === 0 && r.row === 'vox', 'T5 自由模式点击定位', JSON.stringify(r));

  // T6 切回智能 + 全部采纳 → 时值恢复正确
  await pg.click('#em-toggle button[data-em="smart"]');
  await pg.waitForTimeout(120);
  r = await pg.evaluate(() => {
    document.getElementById('err-fixall').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { mode: localStorage.getItem('musetab-editmode'),
      good: document.getElementById('beat-status').className === 'good',
      hidden: document.getElementById('err-drop').classList.contains('hidden') };
  });
  T(r.mode === 'smart' && r.good && r.hidden, 'T6 智能全部采纳→时值恢复', JSON.stringify(r));

  // T7 经典版外壳：光标/节拍检查卡仍可见（无 rt-new 隐藏），切回新版正常
  r = await pg.evaluate(() => {
    document.getElementById('b-shell').click();
    const vis = id => { const el = document.getElementById(id); return !!el && !!el.offsetParent; };
    const classic = { shell: document.body.classList.contains('shell'), cursor: vis('rc-cursor'), beat: vis('rc-beat') };
    document.getElementById('b-shell').click();
    return { classic, backShell: document.body.classList.contains('shell') };
  });
  T(!r.classic.shell && r.classic.cursor && r.classic.beat && r.backShell,
    'T7 经典版两卡可见+切回新版', JSON.stringify(r));

  // T8 v57.3 创作页卡片=标准卡样式（同曲谱信息卡）：带边框 + 标题可点击收起/展开（默认展开）
  r = await pg.evaluate(() => {
    setRTab('make');   /* T7 外壳往返后回创作页再断言 */
    const card = document.getElementById('rc-cursor');
    if(!card.classList.contains('open')) card.classList.add('open');
    const cs = getComputedStyle(card);
    const framed = cs.borderTopWidth !== '0px' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const bodyVis = () => !!card.querySelector('.rc-b').offsetParent;
    const open0 = card.classList.contains('open') && bodyVis();
    card.querySelector('.rc-h').click();
    const collapsed = !card.classList.contains('open') && !bodyVis();
    card.querySelector('.rc-h').click();
    const reopened = card.classList.contains('open') && bodyVis();
    /* 创作辅助卡：标题栏「创作辅助」可见，卡内重复大标题行隐藏（新版外壳） */
    const sugCard = document.getElementById('rt-sug').closest('.rcard');
    const sugTitle = sugCard.querySelector('.rc-h').textContent.trim() === '创作辅助'
      && !!sugCard.querySelector('.rc-h').offsetParent;
    const aihHidden = !sugCard.querySelector('.ai-h').offsetParent;
    return { framed, open0, collapsed, reopened, sugTitle, aihHidden };
  });
  T(r.framed && r.open0 && r.collapsed && r.reopened && r.sugTitle && r.aihHidden,
    'T8 创作页标准卡样式：可收起/展开 + 创作辅助标题归一', JSON.stringify(r));

  // T9 v57.7 启动遮罩：初始化完成后 #boot-veil 已移除、shell 外壳就位（加载期乱版由遮罩盖住）
  r = await pg.evaluate(() => ({
    veilGone: !document.getElementById('boot-veil'),
    shell: document.body.classList.contains('shell') }));
  T(r.veilGone && r.shell, 'T9 启动遮罩初始化后移除', JSON.stringify(r));

  await browser.close();
  console.log('PASS ' + pass + '/' + (pass + fail));
  console.log(errs.length ? ('ERRORS: ' + errs.join(' | ')) : 'NO ERRORS');
  process.exit(fail || errs.length ? 1 : 0);
})();
