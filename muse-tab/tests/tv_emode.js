/* tv_emode — v56.6 右栏重排 + 自由/智能编辑开关回归：
   创作页签置首为默认；光标位置/节拍检查（含开关+beat-box）在创作页；预提示卡移除；
   智能=修复建议+一键采纳，自由=只列正确与否（可定位、无建议无按钮）。 */
const { chromium } = require('playwright');
const path = require('path');
/* v68.2 切默认（flow）：T1–T9 断言旧外壳右栏页签（#rtabs .rtab / 创作页 #rc-cursor · #rc-beat 卡片 / #b-shell 往返）——这一段钉 ?shell=classic；
   文末「flow 段」在默认外壳断言同一功能：E1 编辑模式开关 #em-toggle 在右栏「属性」页、时值检查 #beat-box 在状态栏 ·
   E3–E6 智能 / 自由编辑（真实点击：状态栏时值项展开上弹 #err-drop、属性页开关切换、点条目定位、全部采纳）——tv_modes M10 只覆盖光标信息与记号芯片，不含编辑模式 */
const FILE0 = 'file://' + path.resolve(__dirname, '..', 'index.html');
const FILE = FILE0 + '?shell=classic';

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
    const sugCard = document.getElementById('rt-lab').closest('.rcard');   /* v60.26 rt-sug 撤位，锚点换工作台 */
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

  /* ===================== flow 段（默认外壳，不带参数）===================== */
  const pf = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  pf.on('pageerror', e => errs.push('flow:' + String(e.message)));
  await pf.goto(FILE0); await pf.waitForTimeout(900);
  await pf.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    window.__vis = e => { if (typeof e === 'string') e = document.getElementById(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
    try { localStorage.removeItem('musetab-editmode'); } catch (_) {}
    const s = createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [ { dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false },
                               { dur: 4, dotted: false, deg: 2, acc: '', oct: 0, lyrics: [], tie: false } ];
    loadSong(s); hideStartPad(); sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = true; render(); syncInputs(); });
  await pf.waitForTimeout(200);

  // E1 位置：#em-toggle 在右栏「属性」页（1440 停靠）、#beat-box 在状态栏（#mixer-dock .mx-bar），旧创作页卡片不出现
  /* v68.7 S1 迁移（D8 拍板「新外壳撤掉编辑模式开关」，本版不撤功能，规格 B5）：原「#em-toggle 在属性页且可见」→ #em-toggle 节点仍在属性页（DOCK 落点照留、st:em 仍委托它）但不可见；
     两档的常驻入口＝状态栏「⋯」菜单「时值检查」组的两项 [data-fa="st:em"]（自由编辑 / 修复建议）。修前红修后绿：改前 #em-toggle 可见（emVis 为真）、⋯ 菜单两项照有 */
  r = await pf.evaluate(() => { const et = document.getElementById('em-toggle'), bb = document.getElementById('beat-box');
    return { flow: document.body.classList.contains('flow'), page: FLOW.rd.page(), emIn: !!et.closest('#flw-rp-prop'), emVis: __vis(et),
      bbIn: !!bb.closest('#mixer-dock .mx-bar'), bsVis: __vis('beat-status'), oldCards: __vis('rc-cursor') || __vis('rc-beat') || __vis('rtabs') }; });
  await pf.click('#flw-st-more'); await pf.waitForTimeout(150);
  r.menu = await pf.evaluate(() => [...document.querySelectorAll('#popmenu [data-fa="st:em"]')].filter(x => __vis(x)).map(x => x.dataset.v + ':' + x.getAttribute('aria-checked')));
  await pf.keyboard.press('Escape'); await pf.waitForTimeout(120);
  T(r.flow && r.page === 'prop' && r.emIn && !r.emVis && r.bbIn && r.bsVis && !r.oldCards && JSON.stringify(r.menu) === JSON.stringify(['free:false', 'smart:true']),
    'E1 flow：编辑模式两档在状态栏「⋯」›「时值检查」（属性页的卡片隐藏、#em-toggle 节点照留）、时值检查在状态栏（旧创作页卡片不出现）', JSON.stringify(r));
  /* ⋯ 菜单里点一档（与 #em-toggle 同一开关：st:em → #em-toggle button.click()） */
  const emPick = async v => { await pf.click('#flw-st-more'); await pf.waitForTimeout(150); await pf.click('#popmenu [data-fa="st:em"][data-v="' + v + '"]'); await pf.waitForTimeout(150); };

  const eo = () => pf.evaluate(() => { const ed = document.getElementById('err-drop');
    return { open: document.body.classList.contains('flw-eo') && __vis(ed), bad: document.getElementById('beat-status').className === 'bad', good: document.getElementById('beat-status').className === 'good',
      smartOn: !![...document.querySelectorAll('#em-toggle button')].find(b => b.dataset.em === 'smart' && b.classList.contains('on')),
      freeOn: !![...document.querySelectorAll('#em-toggle button')].find(b => b.dataset.em === 'free' && b.classList.contains('on')),
      mode: localStorage.getItem('musetab-editmode'), rows: ed.querySelectorAll('.err').length, sug: ed.querySelectorAll('.err-sug').length,
      fix: ed.querySelectorAll('.err-fix').length, all: !!ed.querySelector('#err-fixall'), hd: (ed.querySelector('.err-hd span') || {}).textContent || '' }; });

  // E3 智能编辑（默认）：真实点状态栏时值项 → 上弹 #err-drop：修复建议 + 单条 / 全部一键采纳
  await pf.click('#beat-status'); await pf.waitForTimeout(150);
  const e3 = await eo();
  T(e3.bad && e3.open && e3.smartOn && e3.sug >= 1 && e3.fix >= 1 && e3.all && /修复建议/.test(e3.hd), 'E3 flow 智能编辑：点状态栏时值项上弹建议 + 一键采纳', JSON.stringify(e3));

  // E4 真实点「自由编辑」：只列正确与否，无建议 / 无采纳按钮；本机键持久化
  /* v68.7 S1 迁移（D8）：原真实点属性页 #em-toggle「自由编辑」→ 真实点状态栏「⋯」›「自由编辑」（musetab-editmode 写值断言不变）。修前红修后绿：改前 ⋯ 菜单同样能点（本条在改前也绿，迁移只换入口） */
  await emPick('free');
  if (!(await eo()).open) { await pf.click('#beat-status'); await pf.waitForTimeout(150); }
  const e4 = await eo();
  T(e4.mode === 'free' && e4.freeOn && e4.bad && e4.open && e4.rows >= 1 && e4.sug === 0 && e4.fix === 0 && !e4.all && /时值检查/.test(e4.hd),
    'E4 flow 自由编辑（状态栏「⋯」真实点击）：只报正确与否，无修复建议', JSON.stringify(e4));

  // E5 自由模式点条目定位：sel 跳到该小节、上弹层收起
  await pf.click('#err-drop .err .err-desc'); await pf.waitForTimeout(150);
  const e5 = await pf.evaluate(() => ({ mi: sel.mi, row: sel.row, open: document.body.classList.contains('flw-eo') }));
  T(e5.mi === 0 && e5.row === 'vox' && !e5.open, 'E5 flow 自由模式点条目定位（并收起上弹层）', JSON.stringify(e5));

  // E6 切回智能 + 全部采纳 → 时值恢复正确（v68.7：从状态栏「⋯」切回）
  await emPick('smart');
  if (!(await eo()).open) { await pf.click('#beat-status'); await pf.waitForTimeout(150); }
  await pf.click('#err-fixall'); await pf.waitForTimeout(200);
  const e6 = await eo();
  T(e6.mode === 'smart' && e6.smartOn && e6.good && !e6.open, 'E6 flow 智能全部采纳 → 时值恢复', JSON.stringify(e6));
  await pf.close();

  await browser.close();
  console.log('PASS ' + pass + '/' + (pass + fail));
  console.log(errs.length ? ('ERRORS: ' + errs.join(' | ')) : 'NO ERRORS');
  process.exit(fail || errs.length ? 1 : 0);
})();
