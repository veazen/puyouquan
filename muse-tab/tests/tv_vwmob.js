/* v60.97 手机观看页改版（产品指示）回归：
   ① 收藏/点赞图标放大：44px 钮 + 25px 字形；浏览数只读位 + 点赞/收藏计数角标（stats 随详情带回）
   ② 谱架钮移底栏：头部 #vh-stand 撤下、底栏 #b-stand 恢复显示；底栏等高 46px 圆角统一
   ③ 音轨面板点外部自动收起（点面板内不收）
   ④ 音轨面板卡片化：行带浮出底色、声像撤下
   ⑤ 点赞本地即时反馈：桃心亮灭 + 计数就地增减 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 打开公开谱（带 stats）：浏览数显示、角标计数、图标 44px、谱架撤头部入底栏
  let r = await pg.evaluate(async () => { try {
    const data = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 1, lyr: 1 });
    data.title = '统计演示';
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({
      score: { id: 'stat123', title: '统计演示', singer: '测试', author: '官方', updated_at: 100, data },
      stats: { views: 12345, likes: 5, favs: 8 } }) });
    await openRemotePub('stat123');
    await new Promise(z => setTimeout(z, 150));
    const el = id2 => document.getElementById(id2);
    const rect = id2 => { const e = el(id2); return e ? e.getBoundingClientRect() : { width: 0, height: 0 }; };
    const favR = rect('vw-fav'), starSvg = el('vw-fav').querySelector('svg').getBoundingClientRect();
    return {
      views: el('vh-views-v') && el('vh-views-v').textContent,
      likeN: el('vw-like-n') && !el('vw-like-n').hidden && el('vw-like-n').textContent,
      favN: el('vw-fav-n') && !el('vw-fav-n').hidden && el('vw-fav-n').textContent,
      favW: Math.round(favR.width), starW: Math.round(starSvg.width),
      standHead: el('vh-stand') ? getComputedStyle(el('vh-stand')).display : 'gone',
      standDock: getComputedStyle(el('b-stand')).display !== 'none' };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.views === '1.2万' && r.likeN === '5' && r.favN === '8' && r.favW >= 42 && r.starW >= 23
    && r.standHead === 'none' && r.standDock,
    'T1 统计显示+图标44px+谱架移底栏', JSON.stringify(r));

  // T2 点赞/收藏即时反馈：桃心亮 + 计数 5→6→5；收藏星亮 + 8→9
  r = await pg.evaluate(() => { try {
    const el = id2 => document.getElementById(id2);
    el('vw-like').click();
    const on1 = el('vw-like').classList.contains('on'), n1 = el('vw-like-n').textContent;
    el('vw-like').click();
    const on2 = el('vw-like').classList.contains('on'), n2 = el('vw-like-n').textContent;
    el('vw-fav').click();
    const fOn = el('vw-fav').classList.contains('on'), fN = el('vw-fav-n').textContent;
    el('vw-fav').click();   // 还原
    return { on1, n1, on2, n2, fOn, fN };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.on1 && r.n1 === '6' && !r.on2 && r.n2 === '5' && r.fOn && r.fN === '9',
    'T2 点赞/收藏即时反馈与计数增减', JSON.stringify(r));

  // T3 音轨面板：点外部自动收起、点面板内不收
  r = await pg.evaluate(async () => { try {
    setMixerExpanded(true);
    const open1 = mixerExpanded;
    document.getElementById('score').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const closed = !mixerExpanded;
    setMixerExpanded(true);
    document.getElementById('mx-tracks').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const kept = mixerExpanded;
    return { open1, closed, kept };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.open1 && r.closed && r.kept, 'T3 点外部收起/点面板内不收', JSON.stringify(r));

  // T4 底栏与音轨面板 UI：主钮≥44 高、按钮圆角统一 13px、轨行卡片底色、声像撤下
  r = await pg.evaluate(() => { try {
    setMixerExpanded(true);
    const play = document.getElementById('b-play').getBoundingClientRect();
    const btns = [...document.querySelectorAll('#mixer-dock .mx-bar>button')]
      .filter(x => getComputedStyle(x).display !== 'none');
    const radii = btns.map(x => getComputedStyle(x).borderRadius);
    const row = document.querySelector('.mx-row');
    const bg = row ? getComputedStyle(row).backgroundColor : '';
    const panHid = ![...document.querySelectorAll('.mx-row .mx-pan')].some(x => getComputedStyle(x).display !== 'none');
    setMixerExpanded(false);
    return { playH: Math.round(play.height), nBtn: btns.length,
      radiiOk: radii.length > 3 && radii.every(v => v === '13px' || v === '14px'),
      cardBg: bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', panHid };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.playH >= 44 && r.radiiOk && r.cardBg && r.panHid, 'T4 底栏等高圆角+轨行卡片化+声像撤下', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
