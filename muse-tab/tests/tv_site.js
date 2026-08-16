/* v42.0 官网谱库+登录回归 → v58.7 改版为搜索型首页 + 独立个人中心：
   route 把 index.html 伪装为 www.puyouquan.com（API_ON=true）+ stub API，
   验证 搜索/筛选/卡片/工具带/登录弹窗/账号chip直达me.html + me.html 未登录/已登录两态。 */
const { chromium } = require('playwright');
const fs = require('fs'), P = require('path');
const SITE = P.resolve(__dirname, '../site');
const read = f => fs.readFileSync(P.join(SITE, f), 'utf8');
const seed = [
  { id:'seedaaa111', title:'小星星', singer:'儿歌', author:'谱友圈官方', updated_at:100, type:'vocal', price:0, measures:4, cover:[{deg:1,oct:0,ly:'一'},{deg:1,oct:0,ly:'闪'},{deg:5,oct:0,ly:'一'},{deg:5,oct:0,ly:'闪'}] },
  { id:'seedbbb222', title:'欢乐颂', singer:'贝多芬', author:'谱友圈官方', updated_at:99, type:'guitar', price:0, measures:4, cover:[{deg:3,oct:0,ly:'欢'},{deg:3,oct:0,ly:'乐'}] },
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const mkPage = async (loggedIn, page, viewport, role) => {
    const pg = await b.newPage({ viewport: viewport || { width: 1200, height: 900 } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', route => {
      const u = new URL(route.request().url());
      const p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (p === '/api/pub/scores') return J({ scores: seed });
      if (p === '/api/health') return J({ ok: true, wx_web: true, wx_mp: false });
      if (p === '/api/favorites') return loggedIn ? J({ favorites: [{ id:'seedaaa111' }] })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/scores') return loggedIn ? J({ scores: [{ id:'sc1', title:'我的第一首', singer:'', status:'published', updated_at:1700000000 }] })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/me/entitlements') return loggedIn ? J({ entitlements: [], vip: false, quota: 20 })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/me/creator') return J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role:'creator', wx:false } });
      if (p === '/api/me') return loggedIn ? J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role: role || 'creator', wx:false }, stats:{} })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/auth/sms/send') return J({ sent: true, dev_code: '123456' });
      if (p === '/api/auth/sms/verify') return J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role:'creator' } });
      if (p === '/index.html' || p === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: read('index.html') });
      if (p === '/me.html') return route.fulfill({ status: 200, contentType: 'text/html', body: read('me.html') });
      if (p === '/pyq.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: read('pyq.js') });
      if (p === '/pyq.css') return route.fulfill({ status: 200, contentType: 'text/css', body: read('pyq.css') });
      return route.fulfill({ status: 404, body: '' });
    });
    pg._errs = errs;
    await pg.goto('https://www.puyouquan.com/' + (page || ''));
    await pg.waitForTimeout(600);
    return pg;
  };

  // T1 搜索型首页：卡片渲染 + kanpu 链接 + 搜索框/chip/工具带就位 + 登录按钮
  let pg = await mkPage(false);
  let r = await pg.evaluate(() => {
    const cards = document.querySelectorAll('#lib-grid .cc-card');
    const first = cards[0];
    return {
      n: cards.length,
      cover: !!(first && first.querySelector('.cc-cover svg')),
      type: first ? first.querySelector('.cc-type').textContent : '',
      noFree: first ? !first.querySelector('.cc-price') : false,   /* v58.8 免费角标撤除，仅付费显 ¥ */
      mea: first ? (first.querySelector('.cc-mea')||{}).textContent||'' : '',
      fam: first ? first.dataset.fam : '',
      seal: !!(first && first.querySelector('.cv-seal')),          /* 刻版印章层（谱号/TAB/按点） */
      skGone: !document.querySelector('#lib-grid .sk-card'),
      href: first ? first.getAttribute('href') : '',
      search: !!document.getElementById('lib-q'),
      chips: document.querySelectorAll('#lib-cats .fchip').length,
      tools: document.querySelectorAll('.tool-card').length,
      login: !!document.getElementById('nav-login'),
      apiOn: /puyouquan\.com$/.test(location.hostname),
    };
  });
  T(r.apiOn && r.n === 2 && r.cover && r.type === '歌谱' && r.noFree && r.mea === '4 小节'
    && r.fam === 'v' && r.seal === false /* vocal 无印章件，仅水印 */ && r.skGone
    && /puku\.puyouquan\.com\/kanpu\.html\?pub=seedaaa111/.test(r.href)
    && r.search && r.chips >= 3 && r.tools === 3 && r.login, 'T1 搜索首页结构+卡片', JSON.stringify(r));
  // T1a v58.8 刻版封面：guitar 卡有 TAB 印章 + data-fam=g + 家族色变量生效
  r = await pg.evaluate(() => {
    const g = [...document.querySelectorAll('#lib-grid .cc-card')].find(c => c.dataset.fam === 'g');
    return { has: !!g, seal: !!(g && g.querySelector('.cv-seal')),
      lines: g ? g.querySelectorAll('.cv-line').length : 0,
      famVar: g ? getComputedStyle(g).getPropertyValue('--fam').trim().length > 0 : false };
  });
  T(r.has && r.seal && r.lines === 6 && r.famVar, 'T1a 刻版封面（六线+TAB印章+家族色）', JSON.stringify(r));

  // T1b 本地即时搜索：命中过滤 + 空结果引导 + URL ?q= 同步
  r = await pg.evaluate(async () => {
    const q = document.getElementById('lib-q');
    const type = (v) => { q.value = v; q.dispatchEvent(new Event('input')); };
    type('欢乐');
    await new Promise(r=>setTimeout(r,30));
    const hit = document.querySelectorAll('#lib-grid .cc-card').length;
    const title = document.getElementById('lib-title').textContent;
    type('不存在的歌');
    await new Promise(r=>setTimeout(r,30));
    const empty = !!document.querySelector('#lib-grid .lib-empty');
    const urlQ = location.search.includes('q=');
    type('');
    await new Promise(r=>setTimeout(r,30));
    const back = document.querySelectorAll('#lib-grid .cc-card').length;
    return { hit, title, empty, urlQ, back };
  });
  T(r.hit === 1 && r.title === '搜索结果' && r.empty && r.urlQ && r.back === 2, 'T1b 即时搜索+空态+URL同步', JSON.stringify(r));

  // T2 登录弹窗结构
  r = await pg.evaluate(() => {
    document.getElementById('nav-login').click();
    return { phone: !!document.getElementById('lg-phone'), code: !!document.getElementById('lg-code'),
      send: !!document.getElementById('lg-send'), go: !!document.getElementById('lg-go') };
  });
  T(r.phone && r.code && r.send && r.go, 'T2 登录弹窗', JSON.stringify(r));

  // T3 走通登录 → 账号 chip
  r = await pg.evaluate(async () => {
    document.getElementById('lg-phone').value = '13888888888';
    document.getElementById('lg-send').click(); await new Promise(r=>setTimeout(r,50));
    document.getElementById('lg-code').value = '123456';
    document.getElementById('lg-go').click(); await new Promise(r=>setTimeout(r,80));
    const chip = document.querySelector('.acct-chip');
    return { gone: !document.getElementById('pyq-login'), chip: !!chip, nm: chip ? chip.querySelector('.acct-nm').textContent : '' };
  });
  T(r.gone && r.chip && r.nm === '阿杜', 'T3 登录后账号chip', JSON.stringify(r));
  T(pg._errs.length === 0, 'T4 未登录首页无报错', pg._errs.join('|') || 'none');
  await pg.close();

  // T5 已登录：chip 为 me.html 直达链接（v58.7 下拉菜单废除）
  pg = await mkPage(true);
  r = await pg.evaluate(() => {
    const chip = document.querySelector('.acct-chip');
    return { chip: !!chip, isLink: chip ? chip.tagName === 'A' : false,
      href: chip ? chip.getAttribute('href') : '', noMenu: !document.querySelector('.acct-menu'),
      noLogin: !document.getElementById('nav-login') };
  });
  T(r.chip && r.isLink && r.href === 'me.html' && r.noMenu && r.noLogin, 'T5 已登录chip直达me.html', JSON.stringify(r));
  T(pg._errs.length === 0, 'T6 已登录首页无报错', pg._errs.join('|') || 'none');
  await pg.close();

  // T7 me.html 未登录：整页居中登录卡（含手机号/验证码/微信钮），主体隐藏
  pg = await mkPage(false, 'me.html');
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => ({
    auth: !document.getElementById('me-auth').hidden,
    body: document.getElementById('me-body').hidden,
    phone: !!document.getElementById('lg-phone'), wx: !!document.getElementById('lg-wx'),
  }));
  T(r.auth && r.body && r.phone && r.wx, 'T7 me.html 未登录登录卡', JSON.stringify(r));
  await pg.close();

  // T8 me.html 已登录：昵称/手机号/会员卡/云端曲谱行/收藏卡片（favorites×pub联查）/账号操作
  pg = await mkPage(true, 'me.html');
  await pg.waitForTimeout(400);
  r = await pg.evaluate(() => ({
    body: !document.getElementById('me-body').hidden,
    nick: document.getElementById('me-nick-t').textContent,
    phone: document.getElementById('me-phone').textContent,
    vip: document.getElementById('me-vip').textContent.includes('免费版'),
    rows: document.querySelectorAll('#sc-list .pc-row').length,
    rowHref: (document.querySelector('#sc-list .pc-row')||{}).getAttribute ? document.querySelector('#sc-list .pc-row').getAttribute('href') : '',
    favs: document.querySelectorAll('#fav-grid .cc-card').length,
    bindWx: !!document.getElementById('wx-bind'),
    ops: document.querySelectorAll('.me-op').length,
  }));
  T(r.body && r.nick === '阿杜' && r.phone === '138****8888' && r.vip && r.rows === 1
    && /zhipu\.puyouquan\.com\/\?mine=sc1/.test(r.rowHref) && r.favs === 1 && r.bindWx && r.ops >= 4,
    'T8 me.html 已登录主体', JSON.stringify(r));
  // T8a v58.9 creator 角色：创作者徽标 + 创作者中心（已发布计数 + kanpu 行 + 去编辑器发布 ?pc=creator）
  r = await pg.evaluate(() => {
    const el = document.getElementById('me-creator');
    return { badge: !document.getElementById('me-cr-badge').hidden,
      shown: el && !el.hidden, h: el ? (el.querySelector('.me-h')||{}).textContent||'' : '',
      count: (document.getElementById('cr-count')||{}).textContent||'',
      rowHref: (document.querySelector('#cr-list .pc-row')||{getAttribute:()=>''} ).getAttribute('href')||'',
      goEdit: !!el.querySelector('a[href*="?pc=creator"]') };
  });
  T(r.badge && r.shown && r.h.includes('创作者中心') && r.count === '已发布 1 首'
    && /puku\.puyouquan\.com\/kanpu\.html\?pub=sc1/.test(r.rowHref) && r.goEdit,
    'T8a creator角色创作者中心', JSON.stringify(r));
  // T8b v58.9 换头像：点头像 → 8 预设浮层 → 选预设 → PATCH 生效 img 头像 + 浮层关闭
  r = await pg.evaluate(async () => {
    document.getElementById('me-av').click();
    await new Promise(r=>setTimeout(r,50));
    const opts = document.querySelectorAll('#av-mask .av-opt');
    const n = opts.length, up = !!document.getElementById('av-up');
    if (opts[2]) opts[2].click();
    await new Promise(r=>setTimeout(r,150));
    const av = document.getElementById('me-av');
    const img = av.querySelector('img');
    return { n, up, closed: !document.getElementById('av-mask'),
      hasImg: av.classList.contains('has-img'),
      src: img ? img.getAttribute('src').slice(0, 22) : '' };
  });
  T(r.n === 8 && r.up && r.closed && r.hasImg && r.src === 'data:image/svg+xml;bas', 'T8b 换头像浮层+预设生效', JSON.stringify(r));
  T(pg._errs.length === 0, 'T9 me.html 无报错', pg._errs.join('|') || 'none');
  await pg.close();

  // T9a v58.9 user 角色：成为创作者卡 → 点击 POST /me/creator → 徽标亮起 + 创作者中心接管
  pg = await mkPage(true, 'me.html', null, 'user');
  await pg.waitForTimeout(400);
  r = await pg.evaluate(async () => {
    /* v58.7 教训：display 声明压过 [hidden]，显隐必须断言 computed display */
    const disp = () => getComputedStyle(document.getElementById('me-cr-badge')).display;
    const before = { badge: disp() !== 'none',
      btn: !!document.getElementById('cr-become'),
      sub: ((document.querySelector('#me-creator .cr-sub')||{}).textContent||'').includes('免费开通') };
    const b2 = document.getElementById('cr-become'); if (b2) b2.click();
    await new Promise(r=>setTimeout(r,200));
    return { ...before, afterBadge: disp() !== 'none',
      center: ((document.querySelector('#me-creator .me-h')||{}).textContent||'').includes('创作者中心') };
  });
  T(!r.badge && r.btn && r.sub && r.afterBadge && r.center, 'T9a user角色成为创作者流', JSON.stringify(r));
  T(pg._errs.length === 0, 'T9b me.html(user) 无报错', pg._errs.join('|') || 'none');
  await pg.close();

  // T10 手机断点（380px）：首页无横向滚动 + chip 单行横滑 + 卡片单列全宽 + 导航不竖排
  pg = await mkPage(false, '', { width: 380, height: 800 });
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => {
    const doc = document.documentElement;
    const chipRow = document.getElementById('lib-cats');
    const card = document.querySelector('#lib-grid .cc-card');
    const nav = document.getElementById('nav-login');
    const nr = nav ? nav.getBoundingClientRect() : { height: 99 };
    return {
      noHScroll: doc.scrollWidth <= doc.clientWidth + 1,
      chipNowrap: chipRow ? getComputedStyle(chipRow).flexWrap === 'nowrap' : false,
      chipScroll: chipRow ? chipRow.scrollWidth >= chipRow.clientWidth : false,
      cardFull: card ? Math.abs(card.getBoundingClientRect().width - card.parentElement.getBoundingClientRect().width) < 2 : false,
      navH: Math.round(nr.height),
      searchH: Math.round(document.getElementById('lib-q').getBoundingClientRect().height),
      tools: document.querySelectorAll('.tool-card').length,
    };
  });
  T(r.noHScroll && r.chipNowrap && r.cardFull && r.navH < 45 && r.searchH >= 48 && r.tools === 3,
    'T10 380px 移动端适配', JSON.stringify(r));
  await pg.close();

  // v44.6 SEO 基建 + 四垂类落地页（静态文件断言）
  const LAND = ['kaobian', 'yikao', 'shifan', 'jixing'];
  for (const name of LAND) {
    const h = read(name + '.html');
    const okCanon = h.includes('<link rel="canonical" href="https://www.puyouquan.com/' + name + '.html">');
    const okOg = h.includes('og:image') && h.includes('https://www.puyouquan.com/og.png') && h.includes('og:title');
    const okDesc = /<meta name="description" content="[^"]{40,}"/.test(h);
    const okCta = h.includes('//zhipu.puyouquan.com/');
    const okH1 = /<h1[^>]*>[^<]*<span class="grad">/.test(h);
    let ldOk = false;
    try { const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/); const o = JSON.parse(m[1]); ldOk = o['@type'] === 'FAQPage' && o.mainEntity.length >= 3; } catch (_) {}
    T(okCanon && okOg && okDesc && okCta && okH1 && ldOk, 'S 落地页 ' + name, JSON.stringify({ okCanon, okOg, okDesc, okCta, okH1, ldOk }));
  }
  const robots = read('robots.txt');
  T(/Sitemap: https:\/\/www\.puyouquan\.com\/sitemap\.xml/.test(robots) && /Sitemap: https:\/\/puku\.puyouquan\.com\/pub\/sitemap\.xml/.test(robots), 'S robots.txt 双 sitemap', robots.slice(0, 40));
  const sm = read('sitemap.xml');
  T(sm.includes('<urlset') && LAND.every(n => sm.includes('/' + n + '.html')), 'S sitemap.xml 含四落地页');
  const idx = read('index.html');
  T(LAND.every(n => idx.includes(n + '.html')) && /rel="canonical"/.test(idx) && /og:image/.test(idx), 'S 首页内链四落地页+SEO头');
  const js2 = read('pyq.js');
  T(js2.includes('智能曲谱平台') && js2.includes('beian.miit.gov.cn'), 'S 页脚含 slogan+备案（v58.8 场景链移居首页 scene-strip）');
  const vh = read('view.html');
  T(/canonical" href="https:\/\/www\.puyouquan\.com\/"/.test(vh) && /http-equiv="refresh"/.test(vh) && /noindex/.test(vh), 'S view.html 跳转占位（谱库并入主站）');

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
