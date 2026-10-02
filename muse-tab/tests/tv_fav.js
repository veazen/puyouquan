/* v44.5 观看模式收藏接云回归：
   - 已登录：观看栏♡点击 → PUT /api/favorites/:id、心变实；再点 → DELETE、心变空；本地 circleFav 同步翻转。
   - 未登录（线上）：点♡就地拉起登录（看谱→留账号钩子），未产生 favorites 调用；完成登录后自动补收藏（PUT）。
   - 离线/预览（!PYQ_CLOUD）：点♡仅本地翻转，无任何网络调用、不弹登录。
   stub fetch 模拟 /api/pub/scores/:id、/api/auth/sms/*、/api/favorites/*、/api/scores。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // 通用可编程 fetch：记录 /api 调用，覆盖观看拉取/登录/收藏/同步
  const install = () => pg.evaluate(() => {
    window.__calls = [];
    localStorage.removeItem('musetab-circle-fav'); localStorage.removeItem('musetab-library-v1');
    const data = createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 2, nVox: 1, lyr: 1 });
    data.title = '收藏测试';
    window.__data = data;
    window.fetch = async (url, opt) => {
      const method = (opt && opt.method) || 'GET';
      window.__calls.push({ url, method });
      const J = o => ({ ok: true, status: 200, json: async () => o });
      if (/^\/api\/pub\/scores\//.test(url)) return J({ score: { id: 'favid123', title: '收藏测试', author: '官方', updated_at: 1, data: window.__data } });
      if (url === '/api/auth/sms/send') return J({ sent: true, dev_code: '123456' });
      if (url === '/api/auth/sms/verify') return J({ user: { id: 'u9', nickname: '谱友', phone: '138****0000', role: 'user' }, is_new: false });
      if (url === '/api/scores') return J({ scores: [] });
      if (/^\/api\/favorites\//.test(url)) return J({ ok: true });
      return J({});
    };
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // T1 已登录：点收藏 → PUT + 实心；再点 → DELETE + 空心；本地态同步
  await install();
  let r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id: 'u9', nickname: '谱友', role: 'user' };
    await openRemotePub('favid123'); await new Promise(r => setTimeout(r, 120));
    window.__calls = [];
    document.getElementById('vw-fav').click(); await new Promise(r => setTimeout(r, 60));
    const put = window.__calls.some(c => c.url === '/api/favorites/favid123' && c.method === 'PUT');
    const onHeart = document.getElementById('vw-fav').classList.contains('on');
    const localOn = isFav('favid123');
    window.__calls = [];
    document.getElementById('vw-fav').click(); await new Promise(r => setTimeout(r, 60));
    const del = window.__calls.some(c => c.url === '/api/favorites/favid123' && c.method === 'DELETE');
    const offHeart = !document.getElementById('vw-fav').classList.contains('on');
    const localOff = !isFav('favid123');
    return { put, onHeart, localOn, del, offHeart, localOff };
  });
  T(r.put && r.onHeart && r.localOn && r.del && r.offHeart && r.localOff, 'T1 已登录收藏接云（PUT/DELETE + 心态 + 本地态）', JSON.stringify(r));

  // T2 未登录：点收藏拉起登录、无 favorites 调用；完成登录后自动补收藏 PUT + 实心
  await install();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = null;
    await openRemotePub('favid123'); await new Promise(r => setTimeout(r, 120));
    window.__calls = [];
    document.getElementById('vw-fav').click(); await new Promise(r => setTimeout(r, 50));
    const loginShown = !!document.getElementById('lg-go');
    const noFavYet = !window.__calls.some(c => /\/api\/favorites\//.test(c.url));
    // 驱动短信登录
    (document.getElementById('lg-agree')||{}).checked=true; document.getElementById('lg-phone').value = '13800000000';
    document.getElementById('lg-send').click(); await new Promise(r => setTimeout(r, 50));
    document.getElementById('lg-code').value = '123456';
    document.getElementById('lg-go').click(); await new Promise(r => setTimeout(r, 160));
    const favPut = window.__calls.some(c => c.url === '/api/favorites/favid123' && c.method === 'PUT');
    const localOn = isFav('favid123');
    const heartOn = (document.getElementById('vw-fav') || {}).classList ? document.getElementById('vw-fav').classList.contains('on') : false;
    const modalGone = !document.getElementById('lg-go');
    return { loginShown, noFavYet, favPut, localOn, heartOn, modalGone };
  });
  T(r.loginShown && r.noFavYet && r.favPut && r.localOn && r.heartOn && r.modalGone, 'T2 未登录→拉起登录→登录后自动收藏', JSON.stringify(r));

  // T3 离线/预览：点收藏仅本地翻转，无网络调用、不弹登录
  await install();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = false; ACCT = null;
    await openRemotePub('favid123'); await new Promise(r => setTimeout(r, 120));
    window.__calls = [];
    document.getElementById('vw-fav').click(); await new Promise(r => setTimeout(r, 50));
    const noFav = !window.__calls.some(c => /\/api\/favorites\//.test(c.url));
    const noLogin = !document.getElementById('lg-go');
    const localOn = isFav('favid123');
    const heartOn = document.getElementById('vw-fav').classList.contains('on');
    return { noFav, noLogin, localOn, heartOn };
  });
  T(r.noFav && r.noLogin && r.localOn && r.heartOn, 'T3 离线仅本地收藏、不弹登录', JSON.stringify(r));

  await pg.evaluate(() => { if (typeof exitViewer === 'function') exitViewer(); });
  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
