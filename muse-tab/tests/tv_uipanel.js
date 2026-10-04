/* v60.99 左栏/上栏视觉升级验收（UI 专家规格 + 制谱专家 IA，几何断言驱动——位置/对齐不看截图）；
   v61.0 产品更正：面板统一叫「记号」内部不分类——子标题撤销（断言=零 .rg-sub）、专家排序保留：
   T1 吉他记号面板：四列网格、每行≤4 钮、钮高恒 46、无分类子标题
   T2 拨奏族按钮序（制谱专家：下拨→上拨→下扫→上扫→下琶音→上琶音→切音→拍弦…）
   T3 简谱侧无子标题 + 专家序（音高谱号族在前）+ EB_ORNS 力度置首清除恒尾
   T4 图形区 22px 定高 + 标签 10px/500（跨钮基线对齐的根据）
   T5 上栏：控件行高统一 28、1280 视口不超过 2 行（预置换行兜底口径）、分隔线 16px
   T6 左轨页签 56px 定宽、圆角 12（桌面断点；v66.1 起 10→12）
   v61.5 当前音轨卡（T7 几何：去胶囊徽标行/分段显示行/变调夹单行工具排；T8 图标构图签名）
   突变实证：对 v60.98 跑 T1 红（无网格/钮高不一）+T2/T3 红（旧平铺序）；对 v60.99 跑 T1/T3 红（有子标题）；
   对 v61.3 跑 T7/T8 红（无 .trk-ic/旧图标）。 */
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
    const subs = document.querySelectorAll('#sign-host-tab .rg-sub').length;   // v61.0 不分类=恒 0
    // v61.0 连续平铺：网格挂 sign 宿主、子 body display:contents 融入——跨 body 不留半行缺口
    const host = getComputedStyle(document.getElementById('sign-host-tab'));
    const grid = host.display === 'grid' && host.gridTemplateColumns.split(' ').length === 4
      && ['mark-body', 'tech-host'].every(id => getComputedStyle(document.getElementById(id)).display === 'contents');
    const btns = [...document.querySelectorAll('#sign-host-tab .eb')].filter(x => getComputedStyle(x).display !== 'none');
    const hs = [...new Set(btns.map(x => Math.round(x.getBoundingClientRect().height)))];
    const byRow = {}; btns.forEach(x => { const y = Math.round(x.getBoundingClientRect().top); (byRow[y] = byRow[y] || []).push(1); });
    const rows = Object.values(byRow).map(a => a.length);
    const seamless = rows.length === Math.ceil(btns.length / 4) && rows.slice(0, -1).every(v => v === 4);
    return { subs, grid, hs: hs.join(','), seamless, rows: rows.join(','), n: btns.length };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.subs === 0 && r.grid && r.hs === '46' && r.seamless && r.n >= 30,
    'T1 四列连续平铺+46px 定高+无分类子标题', JSON.stringify(r));

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
    const subs = document.querySelectorAll('#sign-host-vox .rg-sub').length;
    const orn = [...document.getElementById('orn-host').children].filter(x => x.tagName === 'BUTTON').map(x => x.dataset.orn);
    const vb = [...document.getElementById('vmark-body').children].filter(x => x.tagName === 'BUTTON').map(x => x.id || 'tup');
    return { subs, orn: orn.join(','), j1: vb.slice(0, 7).join(',') };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.subs === 0
    && r.orn === 'dyn,grace,gracea,tr,up,down,turn,clr'
    && r.j1 === 'b-sharp,b-flat,b-natural,b-octup,b-octdn,b-ottava,b-clef',
    'T3 简谱无子标题+专家序+力度置首清除恒尾', JSON.stringify(r));

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
  /* v66.1 v4「画廊」：容器类圆角 12（此前 10） */
  T(r.ws === '56' && r.br === '12px' && r.hOk, 'T6 左轨 56px 定宽+圆角 12', JSON.stringify(r));

  // T7 v61.5「当前音轨」卡（UI 专家规格）：身份行去胶囊+徽标块 / 显示行分段控件单行 / 变调夹工具排单行
  r = await pg.evaluate(() => { try {
    setRibbon('tab');
    const chip = document.querySelector('#tab-voices .vchip.trk');
    const cs = getComputedStyle(chip);
    const ic = chip.querySelector('.trk-ic');
    const icr = ic.getBoundingClientRect();
    const noPill = cs.borderStyle === 'none' || parseFloat(cs.borderWidth) === 0;
    const badge = Math.round(icr.width) === 24 && getComputedStyle(ic).backgroundColor !== 'rgba(0, 0, 0, 0)';
    const rowEls = ['nl-tab6', 'nl-tabst', 'nl-tabjp', 'nl-tabmidi'].map(id => document.getElementById(id).getBoundingClientRect());
    const oneRow = new Set(rowEls.map(x => Math.round(x.top))).size === 1;
    const segH = rowEls.slice(0, 3).every(x => Math.round(x.height) === 28);
    const seg2 = getComputedStyle(document.getElementById('nl-tabst')).marginLeft === '-1px';
    const capoBtn = document.getElementById('b-trkcapo').getBoundingClientRect();
    const capoOne = Math.round(capoBtn.top) === Math.round(document.getElementById('b-trkboard').getBoundingClientRect().top);
    // .shell-note 覆盖规则的生效证据：flex 容器会把子项 display:inline 计算为 block（blockification），
    // 不能断言 display——改断言覆盖声明的实际效果：margin 归零（基础规则是 margin-top:3px）、
    // 宽度自适应（基础规则是 width:100%）、与变调夹钮垂直居中同行（几何坐标口径）
    const lbl = document.getElementById('trkcapo-lbl');
    const lblR = lbl.getBoundingClientRect(); const rowR = document.getElementById('tab-capo-row').getBoundingClientRect();
    const lblInline = getComputedStyle(lbl).marginTop === '0px' && lblR.width < rowR.width * 0.6
      && Math.abs((lblR.top + lblR.height / 2) - (capoBtn.top + capoBtn.height / 2)) < 4;
    return { noPill, badge, oneRow, segH, seg2, capoOne, lblInline };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.noPill && r.badge && r.oneRow && r.segH && r.seg2 && r.capoOne && r.lblInline,
    'T7 当前音轨卡：徽标行+分段显示+工具排', JSON.stringify(r));

  // T8 v61.5 乐器图标重绘（构图签名断言）：吉他=45°斜置+音孔；贝斯=45°+无圆音孔；小提琴=涡卷头
  r = await pg.evaluate(() => { try {
    return { g45: SVGI.guitar.includes('rotate(45') && SVGI.guitar.includes('<circle'),
      b45: SVGI.bass.includes('rotate(45') && !SVGI.bass.includes('r="1.5"'),
      vScroll: SVGI.violin.includes('c0-1.1'),
      uk30: SVGI.ukulele.includes('rotate(30') };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.g45 && r.b45 && r.vScroll && r.uk30, 'T8 乐器图标构图签名', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
