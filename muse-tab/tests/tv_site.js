/* v42.0 官网谱库+登录回归 → v58.7 改版为搜索型首页 + 独立个人中心：
   route 把 index.html 伪装为 www.puyouquan.com（API_ON=true）+ stub API，
   验证 搜索/筛选/卡片/工具带/登录弹窗/账号chip直达me.html + me.html 未登录/已登录两态。 */
const { chromium } = require('playwright');
const fs = require('fs'), P = require('path');
const SITE = P.resolve(__dirname, '../site');
const read = f => fs.readFileSync(P.join(SITE, f), 'utf8');
/* v60.6：seedaaa111 有实例缩图（thumb:1）、seedbbb222 没有——两条路径同屏可验 */
const seed = [
  { id:'seedaaa111', title:'小星星', singer:'儿歌', author:'谱友圈官方', updated_at:100, type:'vocal', price:0, measures:4, thumb:1, key:'C', tempo:92, beats:4, unit:4, verses:2, views:12345, favs:67, likes:3, cover:[{deg:1,oct:0,ly:'一'},{deg:1,oct:0,ly:'闪'},{deg:5,oct:0,ly:'一'},{deg:5,oct:0,ly:'闪'}] },
  { id:'seedbbb222', title:'欢乐颂', singer:'贝多芬', author:'谱友圈官方', updated_at:99, type:'guitar', price:0, measures:4, thumb:0, key:'G', tempo:0, beats:3, unit:4, verses:0, cover:[{deg:3,oct:0,ly:'欢'},{deg:3,oct:0,ly:'乐'}] },
];
/* 1×1 PNG：缩图字节由 route 兜住，测试不打真网络 */
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const mkPage = async (loggedIn, page, viewport, role) => {
    const pg = await b.newPage({ viewport: viewport || { width: 1200, height: 900 } });
    const pg2 = pg; pg2._posts = [];                      // v60.0 记录管理写操作请求路径
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', route => {
      const u = new URL(route.request().url());
      const p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (p === '/api/pub/scores') return J({ scores: seed });
      if (/^\/api\/pub\/[A-Za-z0-9_-]+\/thumb$/.test(p)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
      if (p === '/api/health') return J({ ok: true, wx_web: true, wx_mp: false });
      if (p === '/api/favorites') return loggedIn ? J({ favorites: [{ id:'seedaaa111' }] })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/scores') return loggedIn ? J({ scores: [{ id:'sc1', title:'我的第一首', singer:'', status:'published', updated_at:1700000000 }] })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/me/entitlements') return loggedIn ? J({ entitlements: [], vip: false, quota: 20 })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p === '/api/me/creator') return J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role:'creator', wx:false } });
      /* v60.5 绑手机号：横幅只在 phone 为空（微信/小程序合成占位号）时出现 */
      if (p === '/api/me/bind-phone') return J({ user: { id:'u1', phone:'137****7777', nickname:'微信用户', role:'user', wx:true } });
      if (p === '/api/me') return loggedIn ? J({ user: { id:'u1', phone: (role === 'wxonly' ? '' : '138****8888'), nickname:'阿杜',
          role: role === 'wxonly' ? 'user' : (role || 'creator'), wx: role === 'wxonly' }, stats:{},
          unread_msgs: 1 })   /* v60.87 未读站内信数随 /me 带出 */
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      /* v60.87 站内信：一条未读审核通知 + 一条已读公告；read/broadcast 写操作记入 _posts */
      if (p === '/api/messages') return J({ messages: [
        { id: 1, kind: 'review', title: '你的曲谱《小星星》已通过审核并上架', body: '现在所有人都能在谱库看到它了。', link: 'https://puku.puyouquan.com/kanpu.html?pub=seedaaa111', created_at: 1700000100, read: 0 },
        { id: 2, kind: 'announce', title: '课程模块筹备公告', body: '敬请期待', link: '', created_at: 1700000000, read: 1 },
      ] });
      if (p === '/api/messages/read') { pg2._posts.push(p); return J({ ok: true }); }
      if (p === '/api/admin/broadcast') { pg2._posts.push(p); return J({ ok: true }); }
      /* v60.0 平台管理中心（仅 role='admin' 页面用到）：概览/审核队列/用户/审计日志 + 审核写操作 */
      if (p === '/api/admin/overview') return J({ users: 12, roles: { user: 9, creator: 2, admin: 1 }, scores: 20,
        scoreStatus: { private: 15, pending: 2, published: 3 }, pending: 2, published: 3,
        orders: { paid: 4, amount_fen: 39200 }, funnel: [{ name: 'visit', n: 123 }, { name: 'open_pub', n: 45 }] });
      if (p === '/api/admin/users') return J({ users: [{ id: 'u2', phone: '139****9999', nickname: '小谱', avatar: '', role: 'creator', created_at: 1700000000 }] });
      if (p === '/api/admin/reviews') return J({ status: u.searchParams.get('status') || 'pending',
        scores: [{ id: 'sc9', title: '待审谱', singer: '', status: 'pending', review_note: '', updated_at: 1700000000,
                   user_id: 'u2', author: '小谱', phone: '139****9999' }] });
      if (/^\/api\/admin\/scores\/[^/]+\/review$/.test(p)) { pg2._posts.push(p); return J({ ok: true, status: 'published' }); }
      /* v60.88 管理控制台独立页新接口 */
      if (/^\/api\/admin\/users\/[^/]+\/detail$/.test(p)) return J({
        user: { id: 'u2', nickname: '小谱', phone: '139****9999', role: 'creator', created_at: 1700000000 },
        entitlements: [{ kind: 'vip', expires_at: 0, source: 'admin', created_at: 1700000000 }],
        orders: [{ id: 'o1', kind: 'vip', amount_fen: 0, channel: 'redeem', status: 'paid', created_at: 1700000000 }],
        scores: { total: 3, byStatus: { published: 1, pending: 1, private: 1 } } });
      if (p === '/api/admin/broadcasts') return J({ broadcasts: [{ id: 9, title: '课程模块筹备公告', body: '敬请期待', link: '', created_at: 1700000000, reads: 3 }] });
      if (/^\/api\/admin\/broadcasts\/\d+$/.test(p)) { pg2._posts.push('DELETE ' + p); return J({ ok: true }); }
      if (p === '/api/admin/codes') {
        if (route.request().method() === 'POST') { pg2._posts.push(p); return J({ codes: ['PYQ-TEST-TEST-TEST'], kind: 'vip', days: 30 }); }
        return J({ codes: [{ code: 'PYQ-AAAA-BBBB-2345', kind: 'vip', days: 30, created_at: 1700000000, used_by: null, used_at: null }] });
      }
      if (p === '/api/admin/orders') return J({ orders: [{ id: 'o1', kind: 'vip_month', amount_fen: 1500, channel: 'wxpay', status: 'paid', created_at: 1700000000, nickname: '小谱', phone: '139****9999' }] });
      if (/^\/api\/admin\/users\/[^/]+\/(role|grant|revoke)$/.test(p)) { pg2._posts.push(p); return J({ ok: true, role: 'creator', kind: 'vip', expires_at: 0 }); }
      /* v60.90 课程工作台 */
      if (p === '/api/admin/courses') return J({ courses: [{ id: 'course-guitar-qimeng', title: '民谣吉他启蒙课', subtitle: '', instrument: 'guitar', level: '零基础', weeks: 7, status: 'published', sort: 0, updated_at: 1700000000 }] });
      if (/^\/api\/admin\/courses\/[^/]+\/(publish|unpublish)$/.test(p)) { pg2._posts.push(p); return J({ ok: true, status: 'published' }); }
      if (/^\/api\/admin\/courses\/[^/]+$/.test(p)) {
        const mth = route.request().method();
        if (mth === 'PUT') { pg2._posts.push('PUT ' + p); return J({ saved: true, id: p.split('/').pop(), status: 'draft' }); }
        if (mth === 'DELETE') { pg2._posts.push('DELETE ' + p); return J({ ok: true }); }
        return J({ course: { id: 'course-guitar-qimeng', title: '民谣吉他启蒙课', subtitle: '7 周', instrument: 'guitar', level: '零基础', weeks: 7, intro: '', sort: 0, status: 'published',
          data: { emoji: '🎸', fam: 'g', chapters: [{ emoji: '🎸', title: '认识吉他', goal: '', points: ['部件'], task: '调音', links: [{ t: '帮助', href: 'help.html' }] }] } } });
      }
      if (p === '/api/admin/logs') return J({ logs: [{ id: 1, admin_id: 'u1', action: 'approve', target: 'sc9',
        detail: '待审谱', created_at: 1700000000, admin_name: '阿杜', admin_phone: '138****8888' }] });
      if (p === '/api/auth/sms/send') return J({ sent: true, dev_code: '123456' });
      if (p === '/api/auth/sms/verify') return J({ user: { id:'u1', phone:'138****8888', nickname:'阿杜', role:'creator' } });
      if (p === '/index.html' || p === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: read('index.html') });
      if (p === '/me.html') return route.fulfill({ status: 200, contentType: 'text/html', body: read('me.html') });
      if (p === '/admin.html') return route.fulfill({ status: 200, contentType: 'text/html', body: read('admin.html') });
      if (p === '/kecheng.html') return route.fulfill({ status: 200, contentType: 'text/html', body: read('kecheng.html') });
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
      /* v60.6 小节数从封面左下移进正文信息条，与调号/拍号/速度并排 */
      meta: first ? [...first.querySelectorAll('.cc-body .meta i')].map(i => i.textContent).join('|') : '',
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
  T(r.apiOn && r.n === 2 && r.cover && r.type === '歌谱' && r.noFree
    && r.meta === '1=C|4/4|♩=92|4 小节|2 段词|1.2万 浏览|67 收藏'   /* v60.98 卡上显示浏览/收藏数（产品指示） */
    && r.fam === 'v' && r.seal === false /* vocal 无印章件，仅水印 */ && r.skGone
    && /puku\.puyouquan\.com\/kanpu\.html\?pub=seedaaa111/.test(r.href)
    && r.search && r.chips >= 3 && r.tools === 0 /* v61.6 产品指示：首页工具带撤除 */
    && r.login, 'T1 搜索首页结构+卡片', JSON.stringify(r));
  // T1c v60.6 曲谱实例缩图：有缩图的谱出 .cc-shot 真截图（刻版骨架留底层占位），无缩图的只剩骨架
  r = await pg.evaluate(() => {
    const a = document.querySelector('.cc-card[href*="seedaaa111"]');
    const c = document.querySelector('.cc-card[href*="seedbbb222"]');
    const sa = a && a.querySelector('.cc-shot');
    const cov = a && a.querySelector('.cc-cover').getBoundingClientRect();
    return { shotA: !!sa, srcA: sa ? sa.getAttribute('src') : '', lazyA: sa ? sa.getAttribute('loading') : '',
      skelA: !!(a && a.querySelector('.cc-cover svg')),
      shotC: !!(c && c.querySelector('.cc-shot')), skelC: !!(c && c.querySelector('.cc-cover svg')),
      ratio: cov ? +(cov.width / cov.height).toFixed(2) : 0,
      w: a ? Math.round(a.getBoundingClientRect().width) : 0 };
  });
  T(r.shotA && r.srcA === '/api/pub/seedaaa111/thumb?v=1' && r.lazyA === 'lazy' && r.skelA
    && !r.shotC && r.skelC && Math.abs(r.ratio - 2) < 0.06 && r.w <= 210,
    'T1c 实例缩图 + 骨架占位 + 卡片瘦身（2:1 封面/列宽≤210）', JSON.stringify(r));
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
    /* v59.4 双入口：头部「创作者中心」按钮 + 可点徽章，点击后卡片进入 cr-flash 定位高亮 */
    const gocr = document.getElementById('me-gocr');
    const badgeEl = document.getElementById('me-cr-badge');
    badgeEl.click();
    const flashByBadge = el.classList.contains('cr-flash');
    el.classList.remove('cr-flash');
    if (gocr) gocr.click();
    return { badge: !badgeEl.hidden,
      shown: el && !el.hidden, h: el ? (el.querySelector('.me-h')||{}).textContent||'' : '',
      count: (document.getElementById('cr-count')||{}).textContent||'',
      adminHidden: !document.getElementById('me-admin'),   /* v60.88 管理中心独立成页，me.html 不再内嵌 */
      bindHidden: getComputedStyle(document.getElementById('me-bind')).display === 'none',      /* v60.5 已有真手机号→无绑定横幅 */
      goadHidden: getComputedStyle(document.getElementById('me-goad')).display === 'none',
      rowHref: (document.querySelector('#cr-list .pc-row')||{getAttribute:()=>''} ).getAttribute('href')||'',
      goEdit: !!el.querySelector('a[href*="?pc=creator"]'),
      gocrShown: !!gocr && getComputedStyle(gocr).display !== 'none',
      badgeTag: badgeEl.tagName, flashByBadge, flashByBtn: el.classList.contains('cr-flash') };
  });
  T(r.badge && r.shown && r.h.includes('创作者中心') && r.count === '已上架 1'
    && /puku\.puyouquan\.com\/kanpu\.html\?pub=sc1/.test(r.rowHref) && r.goEdit
    && r.gocrShown && r.badgeTag === 'BUTTON' && r.flashByBadge && r.flashByBtn
    && r.adminHidden && r.goadHidden && r.bindHidden,
    'T8a creator角色创作者中心+双入口', JSON.stringify(r));
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
    const dispG = () => getComputedStyle(document.getElementById('me-gocr')).display;
    const before = { badge: disp() !== 'none', gocr: dispG() !== 'none',
      btn: !!document.getElementById('cr-become'),
      sub: ((document.querySelector('#me-creator .cr-sub')||{}).textContent||'').includes('免费开通') };
    const b2 = document.getElementById('cr-become'); if (b2) b2.click();
    await new Promise(r=>setTimeout(r,200));
    return { ...before, afterBadge: disp() !== 'none', afterGocr: dispG() !== 'none',   /* v59.4 开通后头部按钮同步点亮 */
      center: ((document.querySelector('#me-creator .me-h')||{}).textContent||'').includes('创作者中心') };
  });
  T(!r.badge && !r.gocr && r.btn && r.sub && r.afterBadge && r.afterGocr && r.center,
    'T9a user角色成为创作者流+入口点亮', JSON.stringify(r));
  T(pg._errs.length === 0, 'T9b me.html(user) 无报错', pg._errs.join('|') || 'none');
  await pg.close();

  /* T9c v60.88 管理控制台独立页 admin.html（role='admin'）：门卫放行 + 概览四格 + 7 日漏斗
     + 七页签 + 待审队列（预览/通过/驳回弹窗）；写操作确实打到 /api/admin/*。 */
  pg = await mkPage(true, 'admin.html', null, 'admin');
  pg.on('dialog', d => d.accept());                        // 下架/生成/发布的 confirm 一律接受
  await pg.waitForTimeout(500);
  r = await pg.evaluate(() => {
    const row = document.querySelector('#ad-pane .ad-row');
    return {
      gateHidden: document.getElementById('ad-gate').hidden,
      bodyShown: !document.getElementById('ad-body').hidden,
      tiles: document.querySelectorAll('#ad-stats .ad-stat').length,
      funnel: (document.getElementById('ad-funnel')||{}).textContent||'',
      sum: (document.getElementById('ad-sum')||{}).textContent||'',
      dot: (document.getElementById('ad-dot')||{}).textContent||'',
      tabs: document.querySelectorAll('#ad-tabs .ad-tab').length,
      rowTitle: row ? (row.querySelector('b')||{}).textContent||'' : '',
      preview: row ? (row.querySelector('a.ad-b')||{getAttribute:()=>''}).getAttribute('href')||'' : '',
      ok: !!(row && row.querySelector('[data-ok]')), no: !!(row && row.querySelector('[data-no]')),
    };
  });
  T(r.gateHidden && r.bodyShown && r.tiles === 4 && r.sum.includes('待审 2')
    && r.dot === '2' && r.tabs === 8 && r.rowTitle === '待审谱' && r.funnel.includes('近 7 日事件')
    && /zhipu\.puyouquan\.com\/\?review=sc9/.test(r.preview) && r.ok && r.no,
    'T9c admin.html 门卫+概览+漏斗+七页签+待审队列', JSON.stringify(r));

  /* 驳回改弹窗（v60.88 替代 prompt）：常用原因 chip 快填 → 确认驳回 → POST review */
  r = await pg.evaluate(async () => {
    document.querySelector('#ad-pane [data-no]').click();
    await new Promise(r=>setTimeout(r,60));
    const mk = document.getElementById('rj-mask');
    const chips = mk ? mk.querySelectorAll('.fchip').length : 0;
    if (mk) { mk.querySelector('.fchip').click(); document.getElementById('rj-go').click(); }
    await new Promise(r=>setTimeout(r,220));
    return { modal: !!mk, chips, closed: !document.getElementById('rj-mask'),
      msg: (document.getElementById('ad-msg')||{}).textContent||'' };
  });
  T(r.modal && r.chips >= 4 && r.closed && r.msg.includes('已驳回')
    && pg._posts.some(x => x === '/api/admin/scores/sc9/review'),
    'T9d 驳回弹窗（常用原因快填）走真实接口', JSON.stringify(r));

  /* 用户页签：搜索 + 角色下拉 + 详情展开（权益/订单/曲谱计数） */
  r = await pg.evaluate(async () => {
    document.querySelector('#ad-tabs [data-ad="users"]').click();
    await new Promise(r=>setTimeout(r,220));
    const hasSearch = !!document.getElementById('ad-q');
    const sel = document.querySelector('#ad-pane [data-role]');
    const roles = sel ? Array.from(sel.options).map(o=>o.value).join(',') : '';
    const dt = document.querySelector('#ad-pane [data-detail]');
    if (dt) dt.click();
    await new Promise(r=>setTimeout(r,220));
    const detail = (document.querySelector('#ad-pane .ad-detail:not([hidden])')||{}).textContent||'';
    return { hasSearch, roles, grant: !!document.querySelector('#ad-pane [data-grant]'),
      detail: detail.includes('已上架') && detail.includes('vip') };
  });
  T(r.hasSearch && r.roles === 'user,creator,admin' && r.grant && r.detail,
    'T9d2 用户页签+详情展开（权益/订单/曲谱计数）', JSON.stringify(r));

  /* 兑换码页签：生成走 POST /api/admin/codes，历史列表在 */
  r = await pg.evaluate(async () => {
    document.querySelector('#ad-tabs [data-ad="codes"]').click();
    await new Promise(r=>setTimeout(r,220));
    const listHas = ((document.getElementById('cd-list')||{}).textContent||'').includes('PYQ-AAAA');
    document.getElementById('cd-go').click();
    await new Promise(r=>setTimeout(r,220));
    const out = ((document.getElementById('cd-out')||{}).textContent||'');
    return { listHas, gen: out.includes('PYQ-TEST') };
  });
  T(r.listHas && r.gen && pg._posts.includes('/api/admin/codes'),
    'T9d3 兑换码页签：历史列表+生成走真实接口', JSON.stringify(r));

  /* 公告页签：历史（含已读人数）+ 撤回走 DELETE */
  r = await pg.evaluate(async () => {
    document.querySelector('#ad-tabs [data-ad="bcast"]').click();
    await new Promise(r=>setTimeout(r,220));
    const hist = ((document.getElementById('ad-pane')||{}).textContent||'');
    const del = document.querySelector('#ad-pane [data-del]');
    if (del) del.click();
    await new Promise(r=>setTimeout(r,220));
    return { composer: !!document.getElementById('bc-title'),
      hist: hist.includes('课程模块筹备公告') && hist.includes('3 人已读'), hadDel: !!del };
  });
  T(r.composer && r.hist && r.hadDel && pg._posts.includes('DELETE /api/admin/broadcasts/9'),
    'T9d4 公告页签：历史+已读数+撤回走真实接口', JSON.stringify(r));

  /* 订单 + 审计日志页签 */
  r = await pg.evaluate(async () => {
    document.querySelector('#ad-tabs [data-ad="orders"]').click();
    await new Promise(r=>setTimeout(r,220));
    const order = ((document.getElementById('ad-pane')||{}).textContent||'');
    document.querySelector('#ad-tabs [data-ad="logs"]').click();
    await new Promise(r=>setTimeout(r,220));
    const log = (document.querySelector('#ad-pane .ad-log')||{}).textContent||'';
    return { order: order.includes('vip_month') && order.includes('¥15.00') && order.includes('小谱'),
      log: log.includes('审核通过') && log.includes('阿杜') };
  });
  T(r.order && r.log, 'T9d5 订单+审计日志页签', JSON.stringify(r));
  T(pg._errs.length === 0, 'T9e admin.html 无报错', pg._errs.join('|') || 'none');
  await pg.close();

  /* 门卫：非管理员进 admin.html 被拦在门外 */
  pg = await mkPage(true, 'admin.html', null, 'user');
  await pg.waitForTimeout(400);
  r = await pg.evaluate(() => ({
    gate: !document.getElementById('ad-gate').hidden,
    body: document.getElementById('ad-body').hidden,
    msg: (document.getElementById('gate-msg')||{}).textContent||'' }));
  T(r.gate && r.body && r.msg.includes('仅平台管理员'), 'T9f2 非管理员被门卫拦下', JSON.stringify(r));
  await pg.close();

  /* T9f v60.5 绑手机号横幅：微信/小程序建的号 phone 为空 → 横幅出现、可关、可绑；
     真号账号（前面 T8）不该出现横幅——方案A 的核心是「提示而非拦截」。 */
  pg = await mkPage(true, 'me.html', null, 'wxonly');
  await pg.waitForTimeout(500);
  r = await pg.evaluate(async () => {
    const bar = document.getElementById('me-bind');
    const shown = getComputedStyle(bar).display !== 'none';
    document.getElementById('bb-go').click();
    await new Promise(r2 => setTimeout(r2, 60));
    const modal = !!document.getElementById('bd-phone');
    document.getElementById('bd-phone').value = '13700007777';
    document.getElementById('bd-code').value = '123456';
    document.getElementById('bd-go').click();
    await new Promise(r2 => setTimeout(r2, 200));
    return { shown, modal, closed: !document.getElementById('bind-mask'),
      phoneNow: (document.getElementById('me-phone') || {}).textContent || '',
      barGone: getComputedStyle(bar).display === 'none' };
  });
  T(r.shown && r.modal && r.closed && r.phoneNow === '137****7777' && r.barGone,
    'T9f 绑手机号横幅：仅占位号显示 → 绑定后消失', JSON.stringify(r));
  T(pg._errs.length === 0, 'T9g me.html(微信占位号) 无报错', pg._errs.join('|') || 'none');
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
      /* v60.6 窄屏改双列（此前单列 + 150px 高封面，一屏只装得下一张半，翻找成本高） */
      cardCols: card ? Math.round(card.parentElement.getBoundingClientRect().width / card.getBoundingClientRect().width) : 0,
      navH: Math.round(nr.height),
      searchH: Math.round(document.getElementById('lib-q').getBoundingClientRect().height),
      tools: document.querySelectorAll('.tool-card').length,
    };
  });
  T(r.noHScroll && r.chipNowrap && r.cardCols === 2 && r.navH < 45 && r.searchH >= 48 && r.tools === 0,
    'T10 380px 移动端适配（v60.6 卡片双列；v61.6 工具带撤除）', JSON.stringify(r));
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
  /* v61.6 产品指示：首页工具带/谱种带/场景带撤除——落地页首页内链不再要求（sitemap 钉住收录） */
  T(/rel="canonical"/.test(idx) && /og:image/.test(idx), 'S 首页 SEO 头');
  const js2 = read('pyq.js');
  /* v60.86 产品拍板：slogan 回归「专业曲谱平台」；v61.6 起 slogan 只留导航品牌区（页脚撤） */
  T(js2.includes('专业曲谱平台') && js2.includes('beian.miit.gov.cn'), 'S 导航含 slogan+页脚备案');
  const vh = read('view.html');
  T(/canonical" href="https:\/\/www\.puyouquan\.com\/"/.test(vh) && /http-equiv="refresh"/.test(vh) && /noindex/.test(vh), 'S view.html 跳转占位（谱库并入主站）');

  // T11 v60.6 全站扁平化：按钮/LOGO/卡片/输入框零立体投影（inset 分隔线与 0 偏移焦点环不算）
  pg = await mkPage(false);
  r = await pg.evaluate(() => {
    const has = v => {
      if (!v || v === 'none') return false;
      return v.split(/,(?![^(]*\))/).some(l => {
        if (/\binset\b/.test(l)) return false;
        const n = (l.match(/-?[\d.]+px/g) || []).slice(0, 3).map(parseFloat);
        return n.length >= 2 && n.some(x => x !== 0);
      });
    };
    const bad = [];
    document.querySelectorAll('.btn, .brand .mark, .cc-card, .tool-card, .card, .lib-search input, .nav-login, .fchip')
      .forEach(el => { const s = getComputedStyle(el);
        if (has(s.boxShadow)) bad.push((el.className || el.tagName) + '|' + s.boxShadow.slice(0, 36));
        if (/drop-shadow/.test(s.filter || '')) bad.push((el.className || el.tagName) + '|filter'); });
    /* 变量本体也得是 none——不然任何新写的 box-shadow:var(--shadow) 会悄悄把阴影带回来 */
    const cs = getComputedStyle(document.documentElement);
    const tok = (cs.getPropertyValue('--shadow') + '|' + cs.getPropertyValue('--shadow-sm')).replace(/\s/g, '');
    return { bad, tok };
  });
  T(r.bad.length === 0 && r.tok === 'none|none', 'T11 全站扁平化（按钮/LOGO/卡片零投影 + --shadow 令牌置 none）',
    (r.bad.slice(0, 3).join(' ; ') || 'none') + ' tok=' + r.tok);
  T(pg._errs.length === 0, 'T11 扁平化页无报错', pg._errs.join('|') || 'none');
  await pg.close();

  /* ===== v60.82 全站 SEO 补齐 ===== */
  {
    // ① 此前缺 og 卡的五页：og:title/og:image/twitter 三件套到位
    const need = ['features.html','help.html','make.html','log.html','sponsors.html'];
    const miss = need.filter(f => {
      const h = read(f);
      return !(/property="og:title"/.test(h) && /property="og:image"/.test(h) && /twitter:card/.test(h));
    });
    T(miss.length === 0, 'S v60.82 五页补齐 og 卡（features/help/make/log/sponsors）', miss.join(',') || 'all ok');
    // ② 关键词补位：首页 + 三个工具页
    const kwMiss = ['index.html','features.html','help.html','make.html'].filter(f => !/name="keywords"/.test(read(f)));
    T(kwMiss.length === 0, 'S v60.82 keywords 补位（index/features/help/make）', kwMiss.join(',') || 'all ok');
    // ③ 编辑器（zhipu/kanpu 同文件）：canonical 锚点 + SoftwareApplication 结构化数据 + og
    const ed = fs.readFileSync(P.resolve(__dirname, '../index.html'), 'utf8');
    const edCanon = /<link rel="canonical" href="https:\/\/zhipu\.puyouquan\.com\/" id="pyq-canon">/.test(ed);
    let edLd = false;
    try { const m = ed.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      const o = JSON.parse(m[1]); edLd = o['@type'] === 'SoftwareApplication' && /zhipu/.test(o.url); } catch (_) {}
    const edPubCanon = /pyq-canon[\s\S]{0,200}?\/pub\/'\+encodeURIComponent\(id\)/.test(ed);
    T(edCanon && edLd && /property="og:title"/.test(ed) && edPubCanon,
      'S v60.82 编辑器 SEO 头（canonical 锚点/SoftwareApplication/og/观看时 canonical 改写 /pub/ID）',
      JSON.stringify({ edCanon, edLd, edPubCanon }));
    // ④ 服务端动态 sitemap 带 lastmod（源码级断言：epoch 秒 → ISO 日期）
    const sv = fs.readFileSync(P.resolve(__dirname, '../../api/server.js'), 'utf8');
    T(/<lastmod>\$\{new Date\(r\.updated_at \* 1000\)\.toISOString\(\)\.slice\(0, 10\)\}<\/lastmod>/.test(sv),
      'S v60.82 /pub/sitemap.xml 带 lastmod', 'src-level');
  }

  /* ===== v60.86 产品拍板：专业曲谱平台 + 课程模块框架 + 首页布局 ===== */
  {
    // ① 旧口径「智能曲谱平台」全站清零（历史更新日志除外——只查站点文件）
    const sweep = ['pyq.js','index.html','features.html','me.html','make.html','help.html','kecheng.html'];
    const stale = sweep.filter(f => read(f).includes('智能曲谱平台'));
    T(stale.length === 0, 'S v60.86 站点无「智能曲谱平台」旧口径', stale.join(',') || 'clean');
    /* ② v60.89 主菜单收敛：找谱/制谱/学习 三项；功能/帮助收进页脚 */
    T(/kecheng\.html','学习'/.test(js2) && !/features\.html','功能'/.test(js2) && !/help\.html','帮助'/.test(js2),
      'S v60.89 主菜单=找谱/制谱/学习（功能/帮助撤出）');
    T(/f-links[\s\S]{0,400}features\.html/.test(js2) && /f-links[\s\S]{0,400}help\.html/.test(js2),
      'S v60.89 页脚含 功能+帮助');
    /* ③ v60.89 学习页=民谣吉他启蒙课 7 周（首门课立起课程框架） */
    const kc = read('kecheng.html');
    /* v60.90 起章节文本在内嵌 JSON（kc-data）里由 JS 渲染，周次结构由 T14a/b 深比对钉住 */
    const weeks = kc.includes('民谣吉他启蒙课') && kc.includes('幼儿音乐启蒙课');
    let courseLd = false;
    try { const m = kc.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      const o = JSON.parse(m[1]); courseLd = o['@type'] === 'Course' && o.isAccessibleForFree === true; } catch (_) {}
    const kcOk = {
      canon: kc.includes('<link rel="canonical" href="https://www.puyouquan.com/kecheng.html">'),
      og: /property="og:title"/.test(kc) && /property="og:image"/.test(kc),
      kw: /name="keywords"/.test(kc),
      course: kc.includes('民谣吉他启蒙课') && weeks, courseLd,
      task: kc.includes('练习任务'), res: kc.includes('53231323') && kc.includes('大横按'),
      cta: /mailto:support@puyouquan\.com/.test(kc),
      folk: kc.includes('民族乐器'),
    };
    T(Object.values(kcOk).every(Boolean), 'S v60.89 学习页=7 周民谣吉他启蒙课（SEO/Course LD/周次/任务/CTA）', JSON.stringify(kcOk));
    /* ③b 课程介绍并入功能页：形态 + 三种开课方式 + 新定位 */
    const ft = read('features.html');
    const ftOk = {
      src3: ft.includes('官方自制') && ft.includes('名师签约') && ft.includes('创作者开课'),
      lesson: ft.includes('互动谱课时') && ft.includes('kecheng.html'),
      pos: ft.includes('科教级') && ft.includes('民族乐器'),
    };
    T(Object.values(ftOk).every(Boolean), 'S v60.89 功能页并入课程介绍+新定位', JSON.stringify(ftOk));
    T(sm.includes('/kecheng.html'), 'S v60.86 sitemap 含课程页');
    // ④ 首页：定位话术 + 出版级（v61.6 工具带/谱种带撤除——学习入口走主菜单「学习」，民族乐器留 description）
    const ix = read('index.html');
    const ixOk = {
      hero: ix.includes('专业曲谱平台'),
      pub: ix.includes('出版级'),
      folk: ix.includes('民族乐器'),
      kw: /keywords[^>]*出版级制谱/.test(ix),
    };
    T(Object.values(ixOk).every(Boolean), 'S v60.86 首页定位（专业/出版级/民族乐器口径）', JSON.stringify(ixOk));
  }

  /* ===== v61.6 产品指示：官网页脚重设计 + 红框内容去除 ===== */
  {
    // ① 首页三段撤除：工具带 4 卡 / 支持谱种带 / 专属场景带
    const ix6 = read('index.html');
    T(!ix6.includes('tool-band') && !ix6.includes('scene-strip') && !ix6.includes('tool-card'),
      'S v61.6 首页工具带/谱种带/场景带撤除');
    // ② 页脚模板：无品牌块、无「在线制谱」链、© 行只留「© 2026 谱友圈」（域名+口号撤）
    const fm = js2.match(/footEl\.innerHTML[\s\S]*?<\/footer>/);
    const ftpl = fm ? fm[0] : '';
    T(!!ftpl && !ftpl.includes('brand') && !ftpl.includes('在线制谱')
      && ftpl.includes('© 2026 谱友圈<') && !ftpl.includes('puyouquan.com ·'),
      'S v61.6 页脚模板去品牌块/在线制谱/域名口号');
    // 静态兜底同口径（ICP 核验行保留备案号链接）
    T(!ix6.includes('puyouquan.com ·') && !read('me.html').includes('puyouquan.com ·')
      && ix6.includes('beian.miit.gov.cn'),
      'S v61.6 静态兜底 © 行同口径+备案保留');
    // ③ 渲染几何：页脚无品牌块、5 链与 © 行水平居中（数值坐标口径）
    pg = await mkPage(false);
    r = await pg.evaluate(() => {
      const f = document.getElementById('foot');
      const links = f.querySelector('.f-links');
      const wrap = f.querySelector('.wrap').getBoundingClientRect();
      const centered = el => { const c = el.getBoundingClientRect();
        return Math.abs((c.left - wrap.left) - (wrap.right - c.right)) < 8; };
      return { noBrand: !f.querySelector('.brand'), n: links.querySelectorAll('a').length,
        cLinks: centered(links), cBeian: centered(f.querySelector('.beian')),
        beianTxt: f.querySelector('.beian').textContent.trim() };
    });
    T(r.noBrand && r.n === 5 && r.cLinks && r.cBeian
      && /^© 2026 谱友圈/.test(r.beianTxt) && !r.beianTxt.includes('puyouquan.com'),
      'S v61.6 页脚渲染：无品牌块+5 链居中+© 行净化', JSON.stringify(r));
    await pg.close();
  }

  /* ===== v61.7 收录工程（站点侧）：四垂类收进功能页场景区块 + 首页静态目录内链 ===== */
  {
    const ft7 = read('features.html');
    T(ft7.includes('专属场景') && LAND.every(n => ft7.includes(n + '.html')),
      'S v61.7 功能页场景区块内链四垂类落地页');
    /* 首页卡片是 JS 渲染、爬虫拿不到 /pub/ 链接——静态 HTML 里必须有一条到谱库目录页的可爬内链 */
    const ix7 = read('index.html');
    T(ix7.includes('puku.puyouquan.com/pub/') && ix7.includes('曲谱目录'),
      'S v61.7 首页静态内链谱库目录页（首页→目录→每首谱可爬路径）');
  }

  /* ===== v60.90 课程系统：学习页交互 / 数据同步 / 工作台课程页签 ===== */
  {
    // ① 内嵌数据与服务端种子逐字节同源（改课程须两处一起改或走工作台）
    const kcHtml = read('kecheng.html');
    const inline = JSON.parse(kcHtml.match(/<script id="kc-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    const seedC = JSON.parse(fs.readFileSync(P.resolve(__dirname, '../../api/seed-courses.json'), 'utf8'));
    T(JSON.stringify(inline) === JSON.stringify(seedC),
      'T14a v60.90 学习页内嵌课程=服务端种子（单一内容源）', inline.length + ' vs ' + seedC.length + ' 门');
    T(inline.length === 3 && inline.some(c => c.title === '幼儿音乐启蒙课' && (c.data.chapters || []).length === 6)
      && inline.some(c => c.title === '民谣吉他启蒙课' && (c.data.chapters || []).length === 7)
      && inline.some(c => c.title === '认识简谱' && (c.data.chapters || []).length === 6
          && c.data.chapters.every(ch => (ch.quiz || []).length >= 3)),
      'T14b 三门课：吉他 7 章 + 幼儿 6 章 + 认识简谱 6 关（每关 ≥3 闯关题）');

    // ② 学习页：卡片渲染 → 打开详情 → 打卡 → 进度与 localStorage（/api/courses 404 走内嵌兜底）
    pg = await mkPage(false, 'kecheng.html');
    await pg.waitForTimeout(500);
    r = await pg.evaluate(async () => {
      const cards = document.querySelectorAll('#kc-cards .kc-card');
      const kidCard = [...cards].find(a => a.textContent.includes('幼儿音乐启蒙课'));
      const out = { n: cards.length, kid: !!kidCard, fam: kidCard ? kidCard.dataset.fam : '',
        emoji: kidCard ? (kidCard.querySelector('.kc-emoji') || {}).textContent : '' };
      const g = [...cards].find(a => a.textContent.includes('民谣吉他启蒙课'));
      g.click();
      await new Promise(r2 => setTimeout(r2, 100));
      const det = document.getElementById('kcd-course-guitar-qimeng');
      out.detShown = det && !det.hidden;
      out.cardsHidden = document.getElementById('kc-cards').hidden;
      out.chN = det.querySelectorAll('.kc-ch').length;
      det.querySelector('[data-tick="0"]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.prog = det.querySelector('[data-prog]').textContent;
      out.tickTxt = det.querySelector('[data-tick="0"]').textContent;
      out.done = det.querySelectorAll('.kc-done').length;
      out.ls = (localStorage.getItem('pyq-learn-v1') || '');
      out.kidTask = /亲子任务/.test((document.getElementById('kcd-course-kids-qimeng') || {}).innerHTML || '');
      return out;
    });
    T(r.n === 3 /* v61.8 认识简谱上架 */ && r.kid && r.fam === 'v' && r.emoji === '🧸' && r.detShown && r.cardsHidden
      && r.chN === 7 && /1\/7 章/.test(r.prog) && /已完成/.test(r.tickTxt) && r.done === 1
      && r.ls.includes('course-guitar-qimeng') && r.kidTask,
      'T14c 学习页：两卡/详情切换/7 章/打卡进度/localStorage/幼儿亲子任务', JSON.stringify(r));
    T(pg._errs.length === 0, 'T14d 学习页无报错', pg._errs.join('|') || 'none');
    await pg.close();

    // ③ 工作台课程页签：列表 → 编辑器载入 → 添加章节 → 保存走 PUT
    pg = await mkPage(true, 'admin.html', null, 'admin');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      document.querySelector('#ad-tabs [data-ad="courses"]').click();
      await new Promise(r2 => setTimeout(r2, 220));
      const out = { row: /民谣吉他启蒙课/.test(document.getElementById('ad-pane').textContent),
        hasNew: !!document.getElementById('crs-new') };
      document.querySelector('#ad-pane [data-edit]').click();
      await new Promise(r2 => setTimeout(r2, 220));
      out.title = (document.getElementById('crs-title') || {}).value || '';
      out.ch0 = !!document.querySelector('#crs-chs .crs-ch');
      document.getElementById('crs-add').click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.chN = document.querySelectorAll('#crs-chs .crs-ch').length;
      document.querySelector('#crs-chs .crs-ch:last-child [data-f="title"]').value = '新章节';
      document.getElementById('crs-save').click();
      await new Promise(r2 => setTimeout(r2, 220));
      out.msg = (document.getElementById('ad-msg') || {}).textContent || '';
      return out;
    });
    T(r.row && r.hasNew && r.title === '民谣吉他启蒙课' && r.ch0 && r.chN === 2 && /已保存/.test(r.msg)
      && pg._posts.includes('PUT /api/admin/courses/course-guitar-qimeng'),
      'T15 工作台课程页签：列表/编辑器/加章节/保存走 PUT', JSON.stringify(r) + ' posts=' + pg._posts.join(','));
    T(pg._errs.length === 0, 'T15b 工作台课程页无报错', pg._errs.join('|') || 'none');
    await pg.close();

    // v61.8 发布强化：闯关题编辑框 + 坏题保存拦截（定位到章）+ 章节下移 + 预览草稿
    pg = await mkPage(true, 'admin.html', null, 'admin');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      document.querySelector('#ad-tabs [data-ad="courses"]').click();
      await new Promise(r2 => setTimeout(r2, 220));
      document.querySelector('#ad-pane [data-edit]').click();
      await new Promise(r2 => setTimeout(r2, 220));
      const out = { qz: !!document.querySelector('#crs-chs [data-f="quiz"]'),
        pv: !!document.getElementById('crs-preview'),
        dn: !!document.querySelector('[data-chdn]') };
      document.querySelector('#crs-chs [data-f="quiz"]').value = '坏题|只有一个选项|9';
      document.getElementById('crs-save').click();
      await new Promise(r2 => setTimeout(r2, 220));
      out.msg = (document.getElementById('ad-msg') || {}).textContent || '';
      window.open = u => { out.openedUrl = String(u); return null; };
      document.getElementById('crs-preview').click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.pvLs = !!localStorage.getItem('pyq-crs-preview');
      return out;
    });
    T(r.qz && r.pv && r.dn && /第 1 章闯关题格式不对/.test(r.msg)
      && /preview=1/.test(r.openedUrl || '') && r.pvLs
      && !pg._posts.some(p => /PUT \/api\/admin\/courses/.test(p)),
      'T15c v61.8 发布强化：闯关题编辑/坏题拦截定位/下移/预览草稿', JSON.stringify(r) + ' posts=' + pg._posts.join(','));
    await pg.close();

    // v61.8 闯关打卡游戏：逐关解锁 → 答题（对错即判+解析）→ 通关自动打卡+星级 → 解锁下一关
    pg = await mkPage(false, 'kecheng.html');
    await pg.waitForTimeout(500);
    r = await pg.evaluate(async () => {
      const data = JSON.parse(document.getElementById('kc-data').textContent);
      const jc = data.find(c => c.title === '认识简谱');
      const out = { id: jc.id };
      document.querySelector('[data-open="' + jc.id + '"]').click();
      await new Promise(r2 => setTimeout(r2, 120));
      const det = document.getElementById('kcd-' + jc.id);
      out.lock1 = det.querySelector('.kc-ch[data-ci="1"]').classList.contains('kc-lock');
      out.qbtn = (det.querySelector('[data-quiz="0"]') || {}).textContent || '';
      det.querySelector('[data-quiz="0"]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      const quiz = jc.data.chapters[0].quiz;
      const host = det.querySelector('[data-qhost="0"]');
      out.qN = quiz.length;
      for (let k = 0; k < quiz.length; k++) {
        host.querySelector('.kq-opt[data-oi="' + quiz[k].a + '"]').click();
        await new Promise(r2 => setTimeout(r2, 30));
        if (k === 0) out.why0 = !host.querySelector('.kq-why').hidden;
        host.querySelector('[data-next]').click();
        await new Promise(r2 => setTimeout(r2, 30));
      }
      out.pass = /通关/.test((host.querySelector('.kq-result') || {}).textContent || '');
      out.stars = (host.querySelector('.kq-star') || {}).textContent || '';
      host.querySelector('[data-cont]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.done0 = det.querySelector('.kc-ch[data-ci="0"]').classList.contains('kc-done');
      out.unlock1 = !det.querySelector('.kc-ch[data-ci="1"]').classList.contains('kc-lock');
      const ls = JSON.parse(localStorage.getItem('pyq-learn-v1') || '{}');
      out.lsDone = (ls[jc.id] || []).indexOf(0) >= 0;
      out.lsStar = +((ls['s:' + jc.id] || {})['0'] || 0);
      out.jp = !!det.querySelector('.jpn');
      return out;
    });
    T(r.lock1 && /闯关/.test(r.qbtn) && r.qN >= 3 && r.why0 && r.pass && r.stars === '★★★'
      && r.done0 && r.unlock1 && r.lsDone && r.lsStar === 3 && r.jp,
      'T16 闯关打卡：锁→答题→三星通关→自动打卡+解锁下一关+记号渲染', JSON.stringify(r));
    T(pg._errs.length === 0, 'T16b 闯关页无报错', pg._errs.join('|') || 'none');
    await pg.close();
  }

  /* ===== v60.87 站内信：消息卡 / 导航红点 / 一键已读 / 管理员发公告 ===== */
  {
    pg = await mkPage(true, 'me.html');
    await pg.waitForTimeout(500);
    r = await pg.evaluate(() => ({
      card: !!document.getElementById('me-msgs'),
      n: document.querySelectorAll('#msg-list .msg-row').length,
      unread: document.querySelectorAll('#msg-list .msg-unread').length,
      cnt: (document.getElementById('msg-count') || {}).textContent || '',
      ra: !document.getElementById('msg-readall').hidden,
      dot: !!document.querySelector('#nav-acct .acct-dot'),
      body: /敬请期待/.test((document.getElementById('msg-list') || {}).textContent || ''),
    }));
    T(r.card && r.n === 2 && r.unread === 1 && /1 条未读/.test(r.cnt) && r.ra && r.dot && r.body,
      'T12 v60.87 消息卡（两条/1 未读/计数/全部已读钮/导航红点/正文）', JSON.stringify(r));
    await pg.evaluate(() => document.getElementById('msg-readall').click());
    await pg.waitForTimeout(300);
    T(pg._posts.includes('/api/messages/read'), 'T12b 全部已读走真实接口', pg._posts.join(','));
    T(pg._errs.length === 0, 'T12c 消息卡页无报错', pg._errs.join('|') || 'none');
    await pg.close();

    pg = await mkPage(true, 'admin.html', null, 'admin');   /* v60.88 管理独立成页，发公告随迁 */
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      window.confirm = () => true;
      const tab = [...document.querySelectorAll('#ad-tabs .ad-tab')].find(b => b.dataset.ad === 'bcast');
      if (!tab) return { tab: false };
      tab.click();
      await new Promise(r2 => setTimeout(r2, 220));
      const t = document.getElementById('bc-title');
      if (!t) return { tab: true, form: false };
      t.value = '测试公告';
      document.getElementById('bc-go').click();
      return { tab: true, form: true };
    });
    await pg.waitForTimeout(300);
    T(r.tab && r.form && pg._posts.includes('/api/admin/broadcast'),
      'T13 v60.87 管理员发公告走真实广播接口（admin.html）', JSON.stringify(r) + ' posts=' + pg._posts.join(','));
    await pg.close();
  }

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
