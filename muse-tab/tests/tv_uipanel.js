/* v60.99 左栏/上栏视觉升级验收（UI 专家规格 + 制谱专家 IA，几何断言驱动——位置/对齐不看截图）：
   T1 吉他记号面板：四列网格、每行≤4 钮、钮高恒 46、子标题分组序=拨奏/时值装饰指法/连奏与音高/制音与音色
   T2 拨奏组按钮序（制谱专家 G1：下拨→上拨→下扫→上扫→下琶音→上琶音→切音→拍弦）
   T3 简谱侧分组序（J1 音高与谱号/J2 连接与和声/J3 奏法·力度/J4 力度·装饰音）+ EB_ORNS 力度置首清除恒尾
   T4 图形区 22px 定高 + 标签 10px/500（跨钮基线对齐的根据）
   T5 上栏：控件行高统一 28、1280 视口不超过 2 行（预置换行兜底口径）、分隔线 16px
   T6 左轨页签 56px 定宽、圆角 10（桌面断点）
   对 v60.98 旧文件跑：T1/T2/T3 当场红（无 .rg-sub、顺序为旧平铺序）——突变实证。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 网格几何 + 子标题分组序
  let r = await pg.evaluate(() => { try {
    window.guardReplace = p => p();
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    loadSong(s); hideStartPad(); setRibbon('tab');
    const subs = [...document.querySelectorAll('#sign-host-tab .rg-sub')].map(x => x.textContent);
    const grid = ['mark-body', 'tech-host'].every(id =>
      getComputedStyle(document.getElementById(id)).display === 'grid' &&
      getComputedStyle(document.getElementById(id)).gridTemplateColumns.split(' ').length === 4);
    const btns = [...document.querySelectorAll('#sign-host-tab .eb')].filter(x => getComputedStyle(x).display !== 'none');
    const hs = [...new Set(btns.map(x => Math.round(x.getBoundingClientRect().height)))];
    const byRow = {}; btns.forEach(x => { const y = Math.round(x.getBoundingClientRect().top); (byRow[y] = byRow[y] || []).push(1); });
    const maxRow = Math.max(...Object.values(byRow).map(a => a.length));
    return { subs: subs.join('|'), grid, hs: hs.join(','), maxRow, n: btns.length };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.subs === '拨奏|时值 · 装饰 · 指法|连奏与音高|制音与音色' && r.grid && r.hs === '46' && r.maxRow === 4 && r.n >= 30,
    'T1 四列网格+46px 定高+分组序', JSON.stringify(r));

  // T2 拨奏组序（G1）+ 简谱面板组内序头（J1 前三钮）
  r = await pg.evaluate(() => { try {
    const ids = x => x.id || (x.dataset.pk != null ? 'pk-' + x.dataset.pk : '') || (x.dataset.tabgr ? 'gr-' + x.dataset.tabgr : '') || (x.dataset.hand ? 'hand-' + x.dataset.hand : '') || (x.dataset.tup ? 'tup3' : '') || (x.hasAttribute('data-tupcustom') ? 'tupN' : '') || x.tagName;
    const mk = [...document.getElementById('mark-body').children].filter(x => x.tagName === 'BUTTON').map(ids);
    const th = [...document.getElementById('tech-host').children].filter(x => x.tagName === 'BUTTON')
      .map(x => x.dataset.tech2 || (x.hasAttribute('data-slidemenu') && 'slide') || (x.hasAttribute('data-barmenu') && 'bar') || (x.hasAttribute('data-harmmenu') && 'harm') || (x.hasAttribute('data-fingmenu') && 'fing') || x.dataset.gtech || '?');
    return { g1: mk.slice(0, 8).join(','), g4: mk.slice(8).join(','), tech: th.join(',') };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.g1 === 'pk-d,pk-u,b-strum-d,b-strum-u,b-arpd,b-arp,b-smute,b-slap'
    && r.g4 === 'b-tie-t,tup3,tupN,b-ferm-t,gr-pre,gr-post,hand-lh,hand-rh,b-mute'
    && r.tech === 'h,p,hp,slide,b,bd,v,bar,tp,pm,mute,tech:lr,harm,fing',
    'T2 拨奏/时值/技巧组内序（GP8 惯例）', JSON.stringify(r));

  // T3 简谱侧分组 + EB_ORNS 序
  r = await pg.evaluate(() => { try {
    setRibbon('vox');
    const subs = [...document.querySelectorAll('#sign-host-vox .rg-sub')].map(x => x.textContent);
    const orn = [...document.getElementById('orn-host').children].filter(x => x.tagName === 'BUTTON').map(x => x.dataset.orn);
    const vb = [...document.getElementById('vmark-body').children].filter(x => x.tagName === 'BUTTON').map(x => x.id || 'tup');
    return { subs: subs.join('|'), orn: orn.join(','), j1: vb.slice(0, 7).join(',') };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.subs === '音高与谱号|连接与和声|奏法 · 力度|力度 · 装饰音'
    && r.orn === 'dyn,grace,gracea,tr,up,down,turn,clr'
    && r.j1 === 'b-sharp,b-flat,b-natural,b-octup,b-octdn,b-ottava,b-clef',
    'T3 简谱分组+力度置首清除恒尾', JSON.stringify(r));

  // T4 图形区 22px 定高 + 标签 10px/500（跨钮标签基线对齐）
  r = await pg.evaluate(() => { try {
    const gs = [...document.querySelectorAll('#sign-host-vox .eb .g')].filter(x => x.closest('.eb') && getComputedStyle(x.closest('.eb')).display !== 'none');
    const gh = [...new Set(gs.map(x => Math.round(x.getBoundingClientRect().height)))];
    const sp = document.querySelector('#orn-host .eb > span');
    const cs = getComputedStyle(sp);
    return { gh: gh.join(','), fs: cs.fontSize, fw: cs.fontWeight };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.gh === '22' && r.fs === '10px' && r.fw === '500', 'T4 图形区 22px+标签 10px/500', JSON.stringify(r));

  // T5 上栏：可见 .eb 高度统一 28、行数≤2、分隔线 16px、数字 tabular-nums
  r = await pg.evaluate(() => { try {
    const eb = document.getElementById('editbar');
    const btns = [...eb.querySelectorAll('.eb')].filter(x => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0);
    const hs = [...new Set(btns.map(x => Math.round(x.getBoundingClientRect().height)))];
    const centers = [...new Set(btns.map(x => { const r2 = x.getBoundingClientRect(); return Math.round((r2.top + r2.height / 2) / 10); }))];
    const sep = document.querySelector('#editbar .eb-sep');
    const sh = sep ? Math.round(sep.getBoundingClientRect().height) : 0;
    const nd = document.querySelector('#eb-note .nd .dg');
    const tnum = nd ? getComputedStyle(nd).fontVariantNumeric : '';
    return { hs: hs.join(','), rows: centers.length, sh, tnum };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.hs === '28' && r.rows <= 2 && r.sh === 16 && r.tnum.includes('tabular-nums'),
    'T5 上栏 28px 统一行高+≤2 行+16px 分隔线', JSON.stringify(r));

  // T6 左轨页签 56px 定宽、圆角 10px
  r = await pg.evaluate(() => { try {
    const ts = [...document.querySelectorAll('#left-rail .ltab')].filter(x => getComputedStyle(x).display !== 'none');
    const ws = [...new Set(ts.map(x => Math.round(x.getBoundingClientRect().width)))];
    const br = getComputedStyle(ts[0]).borderRadius;
    const hOk = ts.every(x => x.getBoundingClientRect().height >= 45);
    return { ws: ws.join(','), br, hOk };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.ws === '56' && r.br === '10px' && r.hOk, 'T6 左轨 56px 定宽+圆角 10', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
