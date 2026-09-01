/* v60.97-98 手机观看页改版（产品指示两轮）回归：
   - 头部右上只留 收藏/分享/主页 三钮（谱架撤头部入底栏；点赞心/计数角标/浏览位撤下）
   - 幽灵图标钮（UI 专家规格）：40×40 无边框透明底、字形 21px；收藏点亮=朱砂实心红星+回弹
   - 音轨面板点外部自动收起；底栏等高圆角；轨行卡片化+声像撤下
   - 触屏可拖选音轨小节格（touch-action:none + 指针捕获 + elementFromPoint 取格） */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 头部三钮（收藏/分享/主页可见，谱架撤头部入底栏）；无点赞心/角标/浏览位；幽灵钮 40px+字形 21px
  let r = await pg.evaluate(async () => { try {
    const data = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 6, nTab: 1, nVox: 1, lyr: 1 });
    data.title = '演示';
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({
      score: { id: 'm123', title: '演示', singer: '测试', author: '官方', updated_at: 100, data },
      stats: { views: 9, likes: 0, favs: 0 } }) });
    await openRemotePub('m123');
    await new Promise(z => setTimeout(z, 150));
    const el = id2 => document.getElementById(id2);
    const vis = id2 => el(id2) && getComputedStyle(el(id2)).display !== 'none';
    const fav = el('vw-fav'), cs = getComputedStyle(fav);
    const svg = fav.querySelector('svg').getBoundingClientRect();
    return { three: vis('vw-fav') && vis('vw-card') && vis('vh-home'),
      standHead: !vis('vh-stand'), standDock: vis('b-stand'),
      noLike: !el('vw-like'), noCnt: !document.querySelector('.vh-cnt'), noViews: !el('vh-views'),
      ghost: cs.borderStyle === 'none' && cs.backgroundColor === 'rgba(0, 0, 0, 0)',
      w: Math.round(fav.getBoundingClientRect().width), svgW: Math.round(svg.width) };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.three && r.standHead && r.standDock && r.noLike && r.noCnt && r.noViews && r.ghost && r.w === 40 && r.svgW === 21,
    'T1 三钮幽灵样式+谱架移底栏+无角标浏览位', JSON.stringify(r));

  // T2 收藏点亮=朱砂实心红星 + 回弹动画类
  r = await pg.evaluate(() => { try {
    const fav = document.getElementById('vw-fav');
    fav.click();
    const on = fav.classList.contains('on'), pop = fav.classList.contains('pop');
    const fill = getComputedStyle(fav.querySelector('svg')).fill;
    fav.click();   // 还原
    const off = !fav.classList.contains('on');
    return { on, pop, fill, off };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.on && r.pop && r.fill === 'rgb(195, 58, 41)' && r.off, 'T2 红星点亮+回弹（朱砂 #c33a29）', JSON.stringify(r));

  // T3 音轨面板：点外部自动收起、点面板内不收
  r = await pg.evaluate(() => { try {
    setMixerExpanded(true);
    const open1 = mixerExpanded;
    document.getElementById('score').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const closed = !mixerExpanded;
    setMixerExpanded(true);
    document.getElementById('mx-tracks').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const kept = mixerExpanded;
    setMixerExpanded(false);
    return { open1, closed, kept };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.open1 && r.closed && r.kept, 'T3 点外部收起/点面板内不收', JSON.stringify(r));

  // T4 底栏与音轨面板 UI：主钮≥44 高、圆角统一、轨行卡片底色、声像撤下
  r = await pg.evaluate(() => { try {
    setMixerExpanded(true);
    const play = document.getElementById('b-play').getBoundingClientRect();
    const btns = [...document.querySelectorAll('#mixer-dock .mx-bar>button')]
      .filter(x => getComputedStyle(x).display !== 'none');
    const radii = btns.map(x => getComputedStyle(x).borderRadius);
    const row = document.querySelector('.mx-row');
    const bg = row ? getComputedStyle(row).backgroundColor : '';
    const panHid = ![...document.querySelectorAll('.mx-row .mx-pan')].some(x => getComputedStyle(x).display !== 'none');
    return { playH: Math.round(play.height),
      radiiOk: radii.length > 3 && radii.every(v => v === '13px' || v === '14px'),
      cardBg: bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', panHid };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.playH >= 44 && r.radiiOk && r.cardBg && r.panHid, 'T4 底栏等高圆角+轨行卡片化+声像撤下', JSON.stringify(r));

  // T5 触屏拖选小节格（v60.98 产品报障：手机拖不动）：touch-action:none + 跨格拖动落 loop 选区
  r = await pg.evaluate(async () => { try {
    const cells = document.querySelector('.mx-cells');
    const ta = getComputedStyle(cells).touchAction;
    const cs = [...cells.querySelectorAll('.mxtc')];
    const rc = i => { const r2 = cs[i].getBoundingClientRect(); return { x: r2.x + r2.width / 2, y: r2.y + r2.height / 2 }; };
    const p0 = rc(0), p2 = rc(2);
    cs[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: p0.x, clientY: p0.y }));
    cells.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: p2.x, clientY: p2.y }));
    cells.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: p2.x, clientY: p2.y }));
    await new Promise(z => setTimeout(z, 80));
    const loop = audio.loop ? audio.loop.a + '-' + audio.loop.b : 'none';
    setLoop(null); setMixerExpanded(false);
    return { ta, loop };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.ta === 'none' && r.loop === '0-2', 'T5 触屏拖选小节格 0→2 落循环选区', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
