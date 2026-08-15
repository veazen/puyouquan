/* v42.0 官网谱库+登录回归：用 page.route 把 view.html 伪装为 puku.puyouquan.com（API_ON=true）+ stub API，
   验证编辑器同款卡片渲染（封面/类型/免费）、导航登录按钮、登录弹窗、已登录账号 chip。 */
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

  const mkPage = async (loggedIn) => {
    const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', route => {
      const u = new URL(route.request().url());
      const p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (p === '/api/pub/scores') return J({ scores: seed });
      if (p === '/api/me') return loggedIn ? J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role:'creator' }, stats:{} })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/auth/sms/send') return J({ sent: true, dev_code: '123456' });
      if (p === '/api/auth/sms/verify') return J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role:'creator' } });
      if (p === '/view.html' || p === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: read('view.html') });
      if (p === '/pyq.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: read('pyq.js') });
      if (p === '/pyq.css') return route.fulfill({ status: 200, contentType: 'text/css', body: read('pyq.css') });
      return route.fulfill({ status: 404, body: '' });
    });
    pg._errs = errs;
    await pg.goto('https://puku.puyouquan.com/view.html');
    await pg.waitForTimeout(600);
    return pg;
  };

  // 未登录：卡片 + 登录按钮
  let pg = await mkPage(false);
  let r = await pg.evaluate(() => {
    const cards = document.querySelectorAll('#lib-grid .cc-card');
    const first = cards[0];
    return {
      n: cards.length,
      cover: !!(first && first.querySelector('.cc-cover svg')),
      type: first ? first.querySelector('.cc-type').textContent : '',
      free: first ? first.querySelector('.cc-price').textContent : '',
      title: first ? first.querySelector('.t').textContent : '',
      href: first ? first.getAttribute('href') : '',
      login: !!document.getElementById('nav-login'),
      apiOn: /puyouquan\.com$/.test(location.hostname),
    };
  });
  /* v58.5 观看页驻 puku 域：卡片链接改 puku.puyouquan.com/kanpu.html?pub= */
  T(r.apiOn && r.n === 2 && r.cover && r.type === '歌谱' && r.free === '免费' && r.title === '小星星'
    && /puku\.puyouquan\.com\/kanpu\.html\?pub=seedaaa111/.test(r.href) && r.login, 'T1 卡片+登录按钮', JSON.stringify(r));

  // 登录弹窗结构
  r = await pg.evaluate(() => {
    document.getElementById('nav-login').click();
    return { phone: !!document.getElementById('lg-phone'), code: !!document.getElementById('lg-code'),
      send: !!document.getElementById('lg-send'), go: !!document.getElementById('lg-go') };
  });
  T(r.phone && r.code && r.send && r.go, 'T2 登录弹窗', JSON.stringify(r));

  // 走通登录 → 账号 chip
  r = await pg.evaluate(async () => {
    document.getElementById('lg-phone').value = '13888888888';
    document.getElementById('lg-send').click(); await new Promise(r=>setTimeout(r,50));
    document.getElementById('lg-code').value = '123456';
    document.getElementById('lg-go').click(); await new Promise(r=>setTimeout(r,80));
    const chip = document.querySelector('.acct-chip');
    return { gone: !document.getElementById('pyq-login'), chip: !!chip, nm: chip ? chip.querySelector('.acct-nm').textContent : '' };
  });
  T(r.gone && r.chip && r.nm === '阿杜', 'T3 登录后账号chip', JSON.stringify(r));
  T(pg._errs.length === 0, 'T4 未登录页无报错', pg._errs.join('|') || 'none');
  await pg.close();

  // 已登录进入：直接显示 chip + 菜单
  pg = await mkPage(true);
  r = await pg.evaluate(() => {
    const chip = document.querySelector('.acct-chip'); if (chip) chip.click();
    return { chip: !!chip, menu: !!document.querySelector('.acct-menu.on'),
      logout: !!document.getElementById('acct-logout'), noLogin: !document.getElementById('nav-login') };
  });
  T(r.chip && r.menu && r.logout && r.noLogin, 'T5 已登录chip+菜单', JSON.stringify(r));
  T(pg._errs.length === 0, 'T6 已登录页无报错', pg._errs.join('|') || 'none');
  await pg.close();

  // v44.6 SEO 基建 + 四垂类落地页（静态文件断言：canonical/og/JSON-LD/内链/robots/sitemap）
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
  T(LAND.every(n => js2.includes(n + '.html')), 'S 页脚含四场景内链');

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
