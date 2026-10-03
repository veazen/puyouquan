/* v60.84 小程序分享卡素材链路：
   ① node 侧直测 miniprogram 两页的 onMsg/onShareAppMessage/onShareTimeline——
      完整标题（歌名 - 演唱者 · 谱类）优先、imageUrl 必设（缩略图优先/品牌图回落）、
      外域图片直接拒收（防被嵌入页塞外链）。
   ② 浏览器侧用 Playwright route 把 index.html 伪装成 https://puku.puyouquan.com/kanpu.html
      （wxShareCard 有 origin 守卫，file:// 下整段直接 return，必须真域名才走得进小程序分支），
      stub jweixin 脚本捕获 wx.miniProgram.postMessage——断言网页端发出的素材：
      share=完整标题、img=/api/pub/ID/thumb?v=thumb_at（无缩略图时为空串）。
   突变实证：对 v60.83 文件跑，T3/T4/T7/T8 全红（旧码只发 pubId+title、不设 imageUrl）。
   可用 env MUSETAB_FILE 指向旧文件复跑突变验证。 */
'use strict';
const path = require('path');
const fs = require('fs');

let pass = 0, total = 0;
const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

/* ===== ① node 侧：小程序页面逻辑 ===== */
function loadPage(rel) {
  let cfg = null;
  global.Page = c => { cfg = c; };
  global.wx = {
    getEnterOptionsSync: () => ({ scene: 1001 }), getLaunchOptionsSync: () => ({ scene: 1001 }),
    showShareMenu: () => {}, redirectTo: () => {},
    login: cb => cb && cb.fail && cb.fail(), request: () => {}, getStorageSync: () => '', removeStorageSync: () => {},
  };
  const p = path.resolve(process.env.MUSETAB_MP_ROOT || path.resolve(__dirname, '../../miniprogram'), 'pages/' + rel);
  delete require.cache[p];
  require(p);
  return cfg;
}

const BRAND = 'https://www.puyouquan.com/share-icon.png';
const IMG = 'https://puku.puyouquan.com/api/pub/abc123/thumb?v=1725000000';
const msg = d => ({ detail: { data: [d] } });

for (const rel of ['index/index.js', 'score/score.js']) {
  const pg = loadPage(rel), tag = rel.split('/')[0];

  // 素材齐全：完整标题 + 缩略图
  let ctx = { curUrl: 'https://puku.puyouquan.com/kanpu.html?pub=abc123', id: 'abc123' };
  pg.onMsg.call(ctx, msg({ pubId: 'abc123', title: '难忘的一天', share: '难忘的一天 - 许巍 · 吉他弹唱谱', img: IMG }));
  let r = pg.onShareAppMessage.call(ctx, { webViewUrl: 'https://puku.puyouquan.com/kanpu.html?pub=abc123' });
  T(r.title === '难忘的一天 - 许巍 · 吉他弹唱谱' && r.path === '/pages/score/score?id=abc123&f=mp' && r.imageUrl === IMG,
    tag + ' 好友卡：完整标题+缩略图', JSON.stringify(r));
  let rt = pg.onShareTimeline.call(ctx);
  T(rt.title === '难忘的一天 - 许巍 · 吉他弹唱谱' && rt.query === 'id=abc123' && rt.imageUrl === IMG,
    tag + ' 朋友圈卡：完整标题+缩略图', JSON.stringify(rt));

  // 没收到素材：标题回落、imageUrl 必设品牌图（不设时微信自动截屏 web-view＝空白图）
  ctx = { curUrl: 'https://puku.puyouquan.com/kanpu.html?pub=zzz9', id: 'zzz9' };
  r = pg.onShareAppMessage.call(ctx, { webViewUrl: 'https://puku.puyouquan.com/kanpu.html?pub=zzz9' });
  T(r.imageUrl === BRAND && /谱友圈/.test(r.title) && r.path === '/pages/score/score?id=zzz9&f=mp',
    tag + ' 无素材回落品牌图', JSON.stringify(r));

  // 外域图片拒收（防嵌入页塞外链）；旧 title 仍收
  ctx = { curUrl: 'https://puku.puyouquan.com/kanpu.html?pub=abc123', id: 'abc123' };
  pg.onMsg.call(ctx, msg({ pubId: 'abc123', title: '难忘的一天', img: 'https://evil.example.com/x.png' }));
  r = pg.onShareAppMessage.call(ctx, { webViewUrl: 'https://puku.puyouquan.com/kanpu.html?pub=abc123' });
  T(!ctx.pubImg && r.imageUrl === BRAND && r.title === '难忘的一天 - 谱友圈',
    tag + ' 外域图拒收+旧口径标题回落', JSON.stringify(r));
}

/* ===== ② 浏览器侧：网页端 postMessage 素材 ===== */
const { chromium } = require('playwright');
const FILE = process.env.MUSETAB_FILE || path.resolve(__dirname, '../index.html');
const HTML = fs.readFileSync(FILE, 'utf8');
const JWEIXIN = 'window.wx=window.wx||{};window.wx.miniProgram={postMessage:function(m){window.__wxpm=m;}};';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  // 先在 file:// 下借页面自身 createSong 造合法曲谱数据（含演唱者，谱类=吉他弹唱谱）
  const seedPg = await b.newPage();
  await seedPg.goto('file://' + FILE); await seedPg.waitForTimeout(600);
  const data = await seedPg.evaluate(() => {
    const d = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 });
    d.title = '分享测题'; d.singer = '测唱'; return JSON.parse(JSON.stringify(d));
  });
  await seedPg.close();

  const probe = async (id, thumbAt) => {
    /* wxShareCard 双守卫：UA 须含 MicroMessenger（微信内）+ __wxjs_environment（小程序 web-view） */
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Linux; Android 14) MicroMessenger/8.0.49 miniProgram' });
    await pg.addInitScript(() => { window.__wxjs_environment = 'miniprogram'; });
    await pg.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith('https://puku.puyouquan.com/kanpu.html'))
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
      if (u.includes('res.wx.qq.com') && u.includes('jweixin'))
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: JWEIXIN });
      if (u.includes('/api/pub/scores/' + id))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ score: { id, title: '分享测题', singer: '测唱', author: '官方', updated_at: 1, thumb_at: thumbAt, data } }) });
      if (u.includes('/api/'))
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"x"}' });
      return route.abort();
    });
    await pg.goto('https://puku.puyouquan.com/kanpu.html?pub=' + id);
    await pg.waitForFunction(() => !!window.__wxpm, null, { timeout: 20000 }).catch(() => {});
    const pm = await pg.evaluate(() => window.__wxpm || null);
    await pg.close();
    return pm && pm.data;
  };

  let d1 = await probe('T1x', 1725000000);
  T(!!d1 && d1.pubId === 'T1x' && d1.title === '分享测题'
    && d1.share === '分享测题 - 测唱 · 吉他弹唱谱'
    && d1.img === 'https://puku.puyouquan.com/api/pub/T1x/thumb?v=1725000000',
    'T7 网页端素材：share 完整标题 + img 缩略图直链', JSON.stringify(d1));

  let d2 = await probe('T2x', 0);
  T(!!d2 && d2.pubId === 'T2x' && d2.share === '分享测题 - 测唱 · 吉他弹唱谱' && d2.img === '',
    'T8 无缩略图 img 为空（小程序层回落品牌图）', JSON.stringify(d2));

  await b.close();
  console.log(pass === total ? ('PASS ' + pass + '/' + total) : ('FAIL ' + pass + '/' + total));
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.log('❌ 运行异常: ' + e.message); process.exit(1); });
