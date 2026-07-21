/* v38.9 阶段2 回归：顶栏收敛「⋯更多」 + 同源互切签名切换条 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 顶栏收敛：6 个低频按钮隐藏、⋯更多可见；菜单开合正常且条目齐全
  let r = await pg.evaluate(() => {
    const hiddenIds = ['b-open','b-save','b-layout','b-preview','b-invert','b-theme'];
    const hidden = hiddenIds.every(id => getComputedStyle(document.getElementById(id)).display === 'none');
    const more = document.getElementById('b-more');
    more.click();
    const menu = document.getElementById('more-menu');
    const open = menu.classList.contains('on');
    const items = menu.querySelectorAll('[data-mm]').length;
    document.body.click();
    const closed = !menu.classList.contains('on');
    return { hidden, open, items, closed };
  });
  T(r.hidden && r.open && r.items === 6 && r.closed, 'T1 顶栏收敛+更多菜单', '隐藏=' + r.hidden + ' 条目=' + r.items + ' 开合=' + (r.open && r.closed));

  // T2 菜单条目委托原处理器：点「曲谱反色」→ #paper 反色类切换
  r = await pg.evaluate(() => {
    const was = document.getElementById('paper').classList.contains('score-invert');
    document.getElementById('b-more').click();
    document.querySelector('#more-menu [data-mm="b-invert"]').click();
    const now = document.getElementById('paper').classList.contains('score-invert');
    document.getElementById('b-invert').click();   // 还原
    return { toggled: was !== now, menuClosed: !document.getElementById('more-menu').classList.contains('on') };
  });
  T(r.toggled && r.menuClosed, 'T2 菜单委托原按钮', '反色生效=' + r.toggled);

  // T3 签名切换条·吉他谱：TAB / TAB＋五线谱 互切且状态同步
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const ns = document.getElementById('nota-switch');
    const t0 = ns.querySelector('[data-ns="tn-tab"]').classList.contains('on');
    ns.querySelector('[data-ns="tn-both"]').click();
    const both = !!song.tabStaff && ns.querySelector('[data-ns="tn-both"]').classList.contains('on');
    ns.querySelector('[data-ns="tn-tab"]').click();
    const back = !song.tabStaff && ns.querySelector('[data-ns="tn-tab"]').classList.contains('on');
    return { t0, both, back, hint: ns.textContent.includes('同源互切') };
  });
  T(r.t0 && r.both && r.back && r.hint, 'T3 吉他谱联排互切', 'TAB默认=' + r.t0 + ' 切联排=' + r.both + ' 切回=' + r.back);

  // T4 签名切换条·歌谱：简谱→五线谱→＋简谱行，数据与按钮态同步
  r = await pg.evaluate(() => {
    loadSong(createSong('vocal', {nVox:1, beats:4, unit:4, key:'C', nMea:2, lyr:1}));
    const ns = document.getElementById('nota-switch');
    const jp0 = ns.querySelector('[data-ns="vn-jp"]').classList.contains('on');
    const noDual0 = !ns.querySelector('[data-ns="vn-dual"]');
    ns.querySelector('[data-ns="vn-st"]').click();
    const st = (song.voxNotations||[])[0] === 'staff';
    const dualBtn = !!document.querySelector('#nota-switch [data-ns="vn-dual"]');
    document.querySelector('#nota-switch [data-ns="vn-dual"]').click();
    const dual = !!(song.voxDual||[])[0];
    return { jp0, noDual0, st, dualBtn, dual };
  });
  T(r.jp0 && r.noDual0 && r.st && r.dualBtn && r.dual, 'T4 歌谱记谱法互切', '简谱→五线谱=' + r.st + ' ＋简谱行=' + r.dual);

  // T5 纯和弦谱：切换条隐藏；教学谱：低音/中音选项存在
  r = await pg.evaluate(() => {
    loadSong(createSong('func', {ftype:'chord', nVox:1, beats:4, unit:4, key:'G', nMea:2, lyr:0}));
    const empty = document.getElementById('nota-switch').innerHTML === '';
    loadSong(createSong('instr', {nVox:1, clef:'alto', beats:4, unit:4, key:'D', nMea:2, lyr:0}));
    const ns = document.getElementById('nota-switch');
    const alto = ns.querySelector('[data-ns="vn-al"]').classList.contains('on');
    const hasBass = !!ns.querySelector('[data-ns="vn-bs"]');
    return { empty, alto, hasBass };
  });
  T(r.empty && r.alto && r.hasBass, 'T5 和弦谱隐藏/器乐谱选中态', '和弦谱空=' + r.empty + ' 中音在选=' + r.alto);

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
