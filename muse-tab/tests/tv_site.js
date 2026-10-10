/* v42.0 官网谱库+登录回归 → v58.7 改版为搜索型首页 + 独立个人中心：
   route 把 index.html 伪装为 www.puyouquan.com（API_ON=true）+ stub API，
   验证 搜索/筛选/卡片/工具带/登录弹窗/账号chip直达me.html + me.html 未登录/已登录两态。 */
const { chromium } = require('playwright');
const fs = require('fs'), P = require('path');
const SITE = P.resolve(__dirname, '../site');
/* 页面不存在时给一张空壳而不是抛异常：突变跑（对改前树复跑新用例）要的是「用例报红」，
   抛在 route 处理里会变成 goto 失败 → 未捕获拒绝 → 整个进程死掉，后面的用例全看不到 */
const read = f => {
  const p = P.join(SITE, f);
  if (!fs.existsSync(p)) return '<!doctype html><meta charset="utf-8"><title>缺页：' + f + '</title><body></body>';
  return fs.readFileSync(p, 'utf8');
};
/* v60.6：seedaaa111 有实例缩图（thumb:1）、seedbbb222 没有——两条路径同屏可验 */
const seed = [
  { id:'seedaaa111', title:'小星星', singer:'儿歌', author:'谱友圈官方', updated_at:100, type:'vocal', price:0, measures:4, thumb:1, key:'C', tempo:92, beats:4, unit:4, verses:2, views:12345, favs:67, likes:3, cover:[{deg:1,oct:0,ly:'一'},{deg:1,oct:0,ly:'闪'},{deg:5,oct:0,ly:'一'},{deg:5,oct:0,ly:'闪'}] },
  { id:'seedbbb222', title:'欢乐颂', singer:'贝多芬', author:'谱友圈官方', updated_at:99, type:'guitar', price:0, measures:4, thumb:0, key:'G', tempo:0, beats:3, unit:4, verses:0, cover:[{deg:3,oct:0,ly:'欢'},{deg:3,oct:0,ly:'乐'}] },
];
/* 1×1 PNG：缩图字节由 route 兜住，测试不打真网络 */
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
/* v61.9 工作台桩里放一门真实的 2.0 课程（直接取种子文件）：验证章级编辑器保存不丢小节树。
   注意列表接口的 data 是**字符串**（courseAll 直出 TEXT 列），详情接口才是对象（服务端已 parse）——桩要同口径。 */
const SITE_URL = p => 'https://www.puyouquan.com/' + p;   // v62.0 课程独立页要带 ?c= 直接导航
const SEED_COURSES = JSON.parse(fs.readFileSync(P.resolve(__dirname, '../../api/seed-courses.json'), 'utf8'));
const SEC_COURSE = SEED_COURSES.find(c => (c.data.chapters || []).some(ch => (ch.sections || []).length)) || null;
/* v62.3 体检桩：一门刻意做坏的草稿课，钉住「跨课程内容体检」认得出四类问题
   （章缺标题 / 小节缺标题 / 题目不合法 / 无测试题又关了打卡＝学员永远完不成这节） */
const BAD_COURSE = {
  id: 'course-bad-demo', title: '体检样例课', subtitle: '', instrument: 'theory', level: '',
  weeks: 1, intro: '', sort: 9, status: 'draft', updated_at: 1700000000,
  data: { emoji: '🧪', fam: 'f', chapters: [
    { chid: 'c_bad1', title: '', sections: [                     // 章缺标题
      { sid: 's_bad1', title: '', learn: { blocks: [] },          // 小节缺标题 + 没有学习块
        practice: { blocks: [], tip: '', checkin: false },        // 关了打卡
        test: { items: [] } },                                    // 又没有题 → 死锁
    ] },
    { chid: 'c_bad2', title: '有题但题坏了', sections: [
      { sid: 's_bad2', title: '坏题小节', learn: { blocks: [{ t: 'text', md: '正文' }] },
        practice: { blocks: [], tip: '', checkin: true },
        test: { items: [{ q: '', opts: ['a'], a: 5 }] } },        // 空题干 + 选项不足 + 答案越界
    ] },
  ] },
};
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
      if (p === '/api/admin/courses') return J({ courses: [
        { id: 'course-guitar-qimeng', title: '民谣吉他启蒙课', subtitle: '', instrument: 'guitar', level: '零基础', weeks: 7, status: 'published', sort: 0, updated_at: 1700000000 },
        ...(SEC_COURSE ? [{ id: SEC_COURSE.id, title: SEC_COURSE.title, subtitle: SEC_COURSE.subtitle, instrument: SEC_COURSE.instrument,
          level: SEC_COURSE.level, weeks: SEC_COURSE.weeks, status: 'published', sort: 1, updated_at: 1700000000,
          data: JSON.stringify(SEC_COURSE.data) }] : []),
        { ...BAD_COURSE, data: JSON.stringify(BAD_COURSE.data) },
      ] });
      if (/^\/api\/admin\/courses\/[^/]+\/(publish|unpublish)$/.test(p)) { pg2._posts.push(p); return J({ ok: true, status: 'published' }); }
      if (/^\/api\/admin\/courses\/[^/]+$/.test(p)) {
        const mth = route.request().method();
        if (mth === 'PUT') { pg2._posts.push('PUT ' + p); return J({ saved: true, id: p.split('/').pop(), status: 'draft' }); }
        if (mth === 'DELETE') { pg2._posts.push('DELETE ' + p); return J({ ok: true }); }
        if (SEC_COURSE && p.endsWith('/' + SEC_COURSE.id))   // v61.9 2.0 课程详情：data 为对象（同服务端口径）
          return J({ course: Object.assign({ sort: 1, status: 'published' }, SEC_COURSE) });
        if (p.endsWith('/' + BAD_COURSE.id)) return J({ course: BAD_COURSE });
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
      if (p === '/kcadmin.html') return route.fulfill({ status: 200, contentType: 'text/html', body: read('kcadmin.html') });
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
    (document.getElementById('lg-agree')||{}).checked = true;   /* v62.9 A4：协议须主动勾选 */
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
    && r.dot === '2' && r.tabs === 9 && r.rowTitle === '待审谱' && r.funnel.includes('近 7 日事件')
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
    /* v61.9 课程 2.0：认识简谱细化到小节——每小节 学习块 / 练习（打卡）/ 测试题 三件齐备 */
    const jpC = inline.find(c => c.title === '认识简谱');
    const jpSecs = (jpC ? jpC.data.chapters : []).reduce((a, ch) => a.concat(ch.sections || []), []);
    T(inline.length === 3 && inline.some(c => c.title === '幼儿音乐启蒙课' && (c.data.chapters || []).length === 6)
      && inline.some(c => c.title === '民谣吉他启蒙课' && (c.data.chapters || []).length === 7)
      && jpC && jpC.data.chapters.length === 6 && jpSecs.length >= 14
      && jpSecs.every(s => (s.learn.blocks || []).length >= 3 && s.practice.checkin === true
          && (s.test.items || []).length >= 4 && s.test.items.every(t =>
            t.kind === 'choice' && t.q && t.opts.length >= 2 && t.opts.length <= 4
            && Number.isInteger(t.a) && t.a >= 0 && t.a < t.opts.length && t.why)),
      'T14b 三门课 + 认识简谱 2.0：6 章 ' + jpSecs.length + ' 小节，每节 学习块≥3 / 打卡 / 测试题≥4 且结构合法');

    // ② 学习页：卡片渲染 → 打开详情 → 打卡 → 进度与 localStorage（/api/courses 404 走内嵌兜底）
    pg = await mkPage(false, 'kecheng.html');
    await pg.waitForTimeout(500);
    r = await pg.evaluate(async () => {
      const cards = document.querySelectorAll('#kc-cards .kc-card');
      const kidCard = [...cards].find(a => a.textContent.includes('幼儿音乐启蒙课'));
      const out = { n: cards.length, kid: !!kidCard, fam: kidCard ? kidCard.dataset.fam : '',
        emoji: kidCard ? (kidCard.querySelector('.kc-emoji') || {}).textContent : '' };
      /* v62.0 课程卡改真实链接（?c=<id>）：不再拦截点击，中键/新标签/收藏都正常 */
      const g = [...cards].find(a => a.textContent.includes('民谣吉他启蒙课'));
      if (!g) return out;
      out.href = g.getAttribute('href');
      out.noJsHijack = !g.hasAttribute('data-open');
      return out;
    });
    T(r.n === 3 && r.kid && r.fam === 'v' && r.emoji === '🧸'
      && r.href === 'kecheng.html?c=course-guitar-qimeng' && r.noJsHijack,
      'T14c 学习页列表：三卡 + 课程卡是真实独立页链接', JSON.stringify(r));
    // 老课程（章级）在独立页里的路径零回归：打卡 → 进度 → localStorage
    await pg.goto(SITE_URL('kecheng.html?c=course-guitar-qimeng'));
    await pg.waitForTimeout(500);
    r = await pg.evaluate(async () => {
      const hero = document.getElementById('kc-hero'), list = document.getElementById('kc-listsec');
      const out = { heroHidden: !!hero && hero.hidden, listHidden: !!list && list.hidden };
      const det = document.querySelector('.kc-detail');
      if (!det) return out;
      out.chN = det.querySelectorAll('.kc-ch').length;
      const tk = det.querySelector('[data-tick="0"]');
      if (!tk) return out;
      tk.click();
      await new Promise(r2 => setTimeout(r2, 80));
      const d2 = document.querySelector('.kc-detail');
      if (!d2) return out;
      out.prog = ((d2.querySelector('[data-prog]') || {}).textContent) || '';
      out.done = d2.querySelectorAll('.kc-done').length;
      out.ls = (localStorage.getItem('pyq-learn-v1') || '');
      return out;
    });
    T(r.heroHidden && r.listHidden && r.chN === 7 && /1\/7 章/.test(r.prog) && r.done === 1
      && r.ls.includes('course-guitar-qimeng'),
      'T14c2 老课程独立页：章级打卡/进度/localStorage 零回归', JSON.stringify(r));
    T(pg._errs.length === 0, 'T14d 学习页无报错', pg._errs.join('|') || 'none');
    await pg.close();

    // ③ v62.0 课程工作台：列表 → 工作台载入 → 加小节 → 保存走 PUT（口径随编辑器重设计更新）
    pg = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      await new Promise(r2 => setTimeout(r2, 250));
      if (!document.getElementById('ad-pane')) return { noPage: true };   // 页面缺失时报红而不是崩（突变跑口径）
      const out = { row: /民谣吉他启蒙课/.test(document.getElementById('ad-pane').textContent),
        hasNew: !!document.getElementById('ka-new') };
      document.querySelector('#ad-pane [data-edit]').click();
      await new Promise(r2 => setTimeout(r2, 350));
      out.wb = !!document.getElementById('crs-wb');
      if (!out.wb) return out;
      out.title = (document.getElementById('crs-title') || {}).value || '';
      out.chs = document.querySelectorAll('.crs-tch').length;
      document.querySelector('[data-addsec="0"]').click();      // 给第 1 章加一节
      await new Promise(r2 => setTimeout(r2, 200));
      out.secN = document.querySelectorAll('.crs-tsec').length;
      out.selNew = /新小节/.test(document.querySelector('.crs-sect').value || '');
      document.getElementById('crs-save').click();
      await new Promise(r2 => setTimeout(r2, 260));
      out.msg = (document.getElementById('ad-msg') || {}).textContent || '';
      return out;
    });
    T(r.row && r.hasNew && r.wb && r.title === '民谣吉他启蒙课' && r.chs === 1
      && r.secN === 1 && r.selNew && /已保存/.test(r.msg)
      && pg._posts.includes('PUT /api/admin/courses/course-guitar-qimeng'),
      'T15 v62.3 课程管理中心：课程列表/载入工作台/加小节/保存走 PUT', JSON.stringify(r) + ' posts=' + pg._posts.join(','));
    T(pg._errs.length === 0, 'T15b 工作台无报错', pg._errs.join('|') || 'none');
    await pg.close();

    // T15c v62.0 发布前检查清单：坏题阻塞发布并定位到「章.节」，预览草稿仍走 ?preview=1
    pg = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      const out = {};
      if (!document.getElementById('ad-pane')) return { noPage: true };   // 页面缺失时报红而不是崩（突变跑口径）
      await new Promise(r2 => setTimeout(r2, 250));
      const row = [...document.querySelectorAll('#ad-pane [data-edit]')]
        .find(b => b.closest('.ad-row').textContent.includes('认识简谱'));
      out.rowFound = !!row; if (!row) return out;
      row.click();
      await new Promise(r2 => setTimeout(r2, 400));
      if (!document.getElementById('crs-wb')) return out;
      // 把第 1 题的选项清空 → 发布检查必须拦住并定位
      const opt = document.querySelector('.crs-q [data-qo="0"]');
      out.hasQ = !!opt;
      if (opt) { opt.value = ''; opt.dispatchEvent(new Event('input')); }
      document.getElementById('crs-savepub').click();
      await new Promise(r2 => setTimeout(r2, 200));
      const mask = document.getElementById('ad-mask');
      out.checklist = !!mask;
      out.hardTxt = mask ? (mask.querySelector('.crs-cklist.hard') || {}).textContent || '' : '';
      out.pubBlocked = mask ? !mask.querySelector('#crs-pubgo') : false;   // 有阻塞项时没有确认发布按钮
      out.sizeBar = mask ? /字符/.test(mask.textContent) : false;
      if (mask) mask.remove();
      /* v62.1 整课草稿预览入口从顶栏移进「预览」页签内（顶栏改成 编辑/预览 二选一） */
      window.open = u => { out.openedUrl = String(u); return null; };
      const pvTab = document.getElementById('crs-mode-pv');
      out.pvTab = !!pvTab;
      if (!pvTab) return out;            // 无预览页签时报红而不是崩进程（突变跑口径）
      pvTab.click();
      await new Promise(r2 => setTimeout(r2, 200));
      const full = document.querySelector('[data-pvfull]');
      out.pvFullBtn = !!full;
      if (full) full.click();
      await new Promise(r2 => setTimeout(r2, 80));
      out.pvLs = !!localStorage.getItem('pyq-crs-preview');
      return out;
    });
    T(r.rowFound && r.hasQ && r.checklist && /1\.1|第 1\.1 节/.test(r.hardTxt) && r.pubBlocked && r.sizeBar
      && r.pvFullBtn && /preview=1/.test(r.openedUrl || '') && r.pvLs
      && !pg._posts.some(p => /PUT \/api\/admin\/courses/.test(p)),
      'T15c v62.1 发布前检查：坏题阻塞发布+定位到章.节+体量条+预览页签内整课草稿', JSON.stringify(r) + ' posts=' + pg._posts.join(','));
    await pg.close();

    // T15d 数据红线：保存 2.0 课程时，小节树（sections + 三模块 + 稳定 sid）必须完整随 PUT 上行
    pg = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      const out = {};
      if (!document.getElementById('ad-pane')) return { noPage: true };   // 页面缺失时报红而不是崩（突变跑口径）
      if (!document.getElementById('ad-pane')) return { noPage: true };   // 页面缺失时报红而不是崩（突变跑口径）
      let sent = null;
      const realFetch = window.fetch;
      window.fetch = (u, o) => {
        if (/\/admin\/courses\//.test(String(u)) && o && o.method === 'PUT') { try { sent = JSON.parse(o.body); } catch (_) {} }
        return realFetch(u, o);
      };
      await new Promise(r2 => setTimeout(r2, 250));
      const row = [...document.querySelectorAll('#ad-pane [data-edit]')]
        .find(b => b.closest('.ad-row').textContent.includes('认识简谱'));
      out.rowFound = !!row;
      if (!row) { window.fetch = realFetch; return out; }   // 无 2.0 课程时报红而不是崩（突变跑口径）
      out.rowTxt = row.closest('.ad-row').querySelector('small').textContent;
      row.click();
      await new Promise(r2 => setTimeout(r2, 400));
      if (!document.getElementById('crs-wb')) { window.fetch = realFetch; return out; }
      document.getElementById('crs-save').click();
      await new Promise(r2 => setTimeout(r2, 300));
      const chs = (sent && sent.data && sent.data.chapters) || [];
      out.chN = chs.length;
      out.secN = chs.reduce((a, ch) => a + (ch.sections || []).length, 0);
      out.hasMods = !!(((chs[0] || {}).sections || [])[0] || {}).learn
        && !!(((chs[0] || {}).sections || [])[0] || {}).test;
      out.sids = chs.every(ch => (ch.sections || []).every(s => /^s_/.test(s.sid || '')));
      window.fetch = realFetch;
      return out;
    });
    T(r.rowFound && /6 章/.test(r.rowTxt) && r.chN === 6 && r.secN >= 14 && r.hasMods && r.sids,
      'T15d v62.0 数据红线：保存完整带上小节树与稳定 sid', JSON.stringify(r));
    await pg.close();

    // v61.8 闯关打卡（章级 quiz 口径，老课程路径）：用合成课程验证——认识简谱已升级到 2.0 小节结构
    pg = await mkPage(false, 'kecheng.html');
    await pg.waitForTimeout(400);
    r = await pg.evaluate(async () => {
      /* 章级 quiz 是老课程/简易课程的合法写法（工作台仍可这样出题），走 ?preview= 通道注入验证 */
      localStorage.setItem('pyq-crs-preview', JSON.stringify({ id: 'legacy-quiz-course', title: '章级闯关课',
        subtitle: '', instrument: 'other', level: '', weeks: 1, intro: '',
        data: { emoji: '🎯', fam: 'g', chapters: [
          { emoji: '1️⃣', title: '第一关', goal: '目标一', points: ['要点 [[1]] [[5_]]'], quiz: [
            { q: '[[1]] 的唱名？', opts: ['do', 're'], a: 0, why: '1 是 do' },
            { q: '[[5]] 的唱名？', opts: ['fa', 'sol'], a: 1, why: '5 是 sol' },
            { q: '[[0]] 是？', opts: ['休止', '低音'], a: 0, why: '0 是休止符' }] },
          { emoji: '2️⃣', title: '第二关', goal: '目标二', points: ['要点'] }] } }));
      location.search = '?preview=1';
    });
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      const out = {};
      const det = document.getElementById('kcd-legacy-quiz-course');
      out.shown = !!det && !det.hidden;
      out.lock1 = det.querySelector('.kc-ch[data-ci="1"]').classList.contains('kc-lock');
      out.qbtn = (det.querySelector('[data-quiz="0"]') || {}).textContent || '';
      det.querySelector('[data-quiz="0"]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      const host = det.querySelector('[data-qhost="0"]');
      for (let k = 0; k < 3; k++) {
        host.querySelector('.kq-opt[data-oi="' + [0, 1, 0][k] + '"]').click();
        await new Promise(r2 => setTimeout(r2, 25));
        if (k === 0) out.why0 = !host.querySelector('.kq-why').hidden;
        host.querySelector('[data-next]').click();
        await new Promise(r2 => setTimeout(r2, 25));
      }
      out.pass = /通关/.test((host.querySelector('.kq-result') || {}).textContent || '');
      out.stars = (host.querySelector('.kq-star') || {}).textContent || '';
      host.querySelector('[data-cont]').click();
      await new Promise(r2 => setTimeout(r2, 80));
      out.done0 = det.querySelector('.kc-ch[data-ci="0"]').classList.contains('kc-done');
      out.unlock1 = !det.querySelector('.kc-ch[data-ci="1"]').classList.contains('kc-lock');
      out.jp = !!det.querySelector('.jpn');
      return out;
    });
    T(r.shown && r.lock1 && /闯关/.test(r.qbtn) && r.why0 && r.pass && r.stars === '★★★'
      && r.done0 && r.unlock1 && r.jp,
      'T16 章级闯关（老课程路径零回归）：锁→答题→三星通关→打卡+解锁+记号渲染', JSON.stringify(r));
    T(pg._errs.length === 0, 'T16b 闯关页无报错', pg._errs.join('|') || 'none');
    await pg.close();

    /* ===== v62.0 课程独立页 + 学习页重设计（UI 专家规格）===== */
    // T17 小节流程（v62.1 锁章不锁节）：章内小节全开 → 打卡（可撤销）→ 学/练/测页签 →
    //     不及格不记星 → 重测通关 → 本章没做完时下一章仍锁 → 做完整章才解锁下一章
    pg = await mkPage(false, 'kecheng.html?c=course-jianpu-renshi');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      const out = {};
      const data = JSON.parse(document.getElementById('kc-data').textContent);
      const jc = data.find(c => c.title === '认识简谱');
      const chs = jc.data.chapters || [];
      const s0 = ((chs[0] || {}).sections || [])[0];
      if (!s0) return { noSections: true };   // 课程未小节化时报红而不是崩进程（突变跑口径）
      const det = document.querySelector('.kc-detail');
      out.secs = det.querySelectorAll('.kcs').length;
      out.groups = det.querySelectorAll('.kcp-chg').length;
      if (!out.secs) return out;
      const sk = g => [...g.querySelectorAll('.kcs')].map(s => s.getAttribute('data-sk'));
      const g0 = det.querySelector('.kcp-chg[data-ci="0"]'), g1 = det.querySelector('.kcp-chg[data-ci="1"]');
      out.chIndexed = !!g0 && !!g1;
      if (!out.chIndexed) return out;    // 章未按 data-ci 分组时报红而不是崩（突变跑口径）
      const K = sk(g0), K0 = K[0], K1 = K[K.length - 1], N0 = K.length;
      if (!K0) return out;
      out.sidKey = /^s_/.test(K0);            // 进度键用稳定 sid，插节不再错位学员进度
      out.open0 = det.querySelector('.kcs[data-sk="' + K0 + '"]').classList.contains('is-open');
      // 锁章不锁节：第 1 章内一节不锁；第 2 章整章锁，解锁说明每章只有一处
      out.ch0Locked = g0.querySelectorAll('.kcs--lock').length;
      out.ch1Locked = g1.querySelectorAll('.kcs--lock').length;
      out.ch1All = g1.querySelectorAll('.kcs').length;
      out.lockPanels = det.querySelectorAll('.kcp-chlock').length;
      out.secHints = det.querySelectorAll('.kcs-hint').length;   // 逐节重复的解锁文案已撤
      out.arts = det.querySelectorAll('.kcp-chart .kcart').length;
      // 学/练/测三页签：三块面板，一次只显示一块
      const c0 = det.querySelector('.kcs[data-sk="' + K0 + '"]');
      out.mods = c0.querySelectorAll('.kcm[data-mod]').length;
      out.tabs = c0.querySelectorAll('.kcs-tab').length;
      out.shown = [...c0.querySelectorAll('.kcm[data-mod]')].filter(p => !p.hidden).length;
      const pTab = c0.querySelector('.kcs-tab[data-mtab="prac"]');
      if (!pTab) return out;             // 无模块页签时报红而不是崩（突变跑口径）
      pTab.click();
      await new Promise(r2 => setTimeout(r2, 120));
      out.pracOn = !c0.querySelector('.kcm[data-mod="prac"]').hidden
        && c0.querySelector('.kcm[data-mod="learn"]').hidden;
      // 练习打卡 + 撤销入口
      det.querySelector('[data-checkin]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.ckOn = !!det.querySelector('.kcp-ckbtn.is-on');
      out.undo = !!det.querySelector('[data-undo]');
      out.weekOn = det.querySelectorAll('.kcp-wd.on').length;
      const run = (key, pickWrong) => {
        const its = (((K.indexOf(key) >= 0 ? chs[0].sections[K.indexOf(key)] : {}).test) || {}).items || [];
        const host = det.querySelector('[data-thost="' + key + '"]');
        return (async () => {
          for (let k = 0; k < its.length; k++) {
            const oi = pickWrong(k) ? (its[k].a + 1) % its[k].opts.length : its[k].a;
            host.querySelector('.kcq-opt[data-oi="' + oi + '"]').click();
            await new Promise(r2 => setTimeout(r2, 20));
            host.querySelector('[data-next]').click();
            await new Promise(r2 => setTimeout(r2, 20));
          }
          return host;
        })();
      };
      // ① 错 3 题 → 不及格、不记星
      det.querySelector('[data-sectest="' + K0 + '"]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.focus = det.querySelector('.kcs[data-sk="' + K0 + '"]').classList.contains('is-testing');
      out.segs = det.querySelectorAll('.kcq-seg i').length;
      let host = await run(K0, k => k < 3);
      out.failTxt = (host.querySelector('.kcq-res') || {}).textContent || '';
      out.missList = host.querySelectorAll('.kcq-missit').length;   // 未通关给错题清单+回看
      out.review = !!host.querySelector('[data-review]');
      out.failStar = +(((JSON.parse(localStorage.getItem('pyq-learn-v1')) || {})['sec:' + jc.id] || {})[K0] || {}).stars || 0;
      // ② 重测错 1 题 → 4 星通关；本章还有没做完的节，下一章必须仍然锁着
      host.querySelector('[data-retry]').click();
      await new Promise(r2 => setTimeout(r2, 60));
      host = await run(K0, k => k === 0);
      out.passTxt = (host.querySelector('.kcq-res') || {}).textContent || '';
      out.stars = (host.querySelector('.kcq-res-stars') || {}).textContent || '';
      const ls = JSON.parse(localStorage.getItem('pyq-learn-v1')) || {};
      out.lsStar = ((ls['sec:' + jc.id] || {})[K0] || {}).stars;
      out.lsDays = (((ls['sec:' + jc.id] || {})[K0] || {}).days || []).length;
      out.legacyUntouched = ls[jc.id] === undefined && ls['s:' + jc.id] === undefined;
      host.querySelector('[data-cont]').click();
      await new Promise(r2 => setTimeout(r2, 200));
      let d2 = document.querySelector('.kc-detail');
      out.chLockedAfter1 = d2.querySelector('.kcp-chg[data-ci="1"]').getAttribute('data-lock');
      out.pass0 = d2.querySelector('.kcs[data-sk="' + K0 + '"]').classList.contains('kcs--pass');
      out.ring = (d2.querySelector('.kcp-ringtx b') || {}).textContent;
      // ③ 把第 1 章剩下的节也做完 → 第 2 章解锁
      for (let i = 1; i < N0; i++) {
        d2 = document.querySelector('.kc-detail');
        const bt = d2.querySelector('[data-sectest="' + K[i] + '"]');
        if (bt) {
          bt.click(); await new Promise(r2 => setTimeout(r2, 60));
          const h = await run(K[i], () => false);
          h.querySelector('[data-cont]').click();
        } else {                       // 无测试题的小节：打卡即通过
          d2.querySelector('[data-checkin="' + K[i] + '"]').click();
        }
        await new Promise(r2 => setTimeout(r2, 220));
      }
      d2 = document.querySelector('.kc-detail');
      out.chOpenAfterAll = d2.querySelector('.kcp-chg[data-ci="1"]').getAttribute('data-lock');
      out.ch1LockedAfter = d2.querySelectorAll('.kcp-chg[data-ci="1"] .kcs--lock').length;
      out.lockPanelsAfter = d2.querySelectorAll('.kcp-chlock').length;
      out.lastK = K1;
      return out;
    });
    T(r.secs >= 14 && r.groups === 6 && r.sidKey && r.open0
      && r.ch0Locked === 0 && r.ch1Locked === r.ch1All && r.ch1All > 0
      && r.lockPanels === 5 && r.secHints === 0 && r.arts === 6
      && r.mods === 3 && r.tabs === 3 && r.shown === 1 && r.pracOn
      && r.ckOn && r.undo && r.weekOn === 1
      && r.focus && r.segs === 5
      && /★★☆☆☆/.test(r.failTxt) && r.missList === 3 && r.review && r.failStar === 0
      && /通关/.test(r.passTxt) && r.stars === '★★★★☆' && r.lsStar === 4 && r.lsDays === 1
      && r.legacyUntouched && r.pass0 && /^1\//.test(r.ring)
      && r.chLockedAfter1 === '1' && r.chOpenAfterAll === '0'
      && r.ch1LockedAfter === 0 && r.lockPanelsAfter === 4,
      'T17 v62.1 锁章不锁节：章内全开/整章一处锁说明/学练测页签/打卡可撤销/专注态/错题回看/做完整章才开下一章',
      JSON.stringify(r));

    // T17b 课程独立页外壳：站点 hero 与列表都不渲染、标题与 canonical 随课程、侧导航与进度环
    r = await pg.evaluate(() => {
      const hero = document.getElementById('kc-hero'), list = document.getElementById('kc-listsec');
      const back = document.querySelector('.kcp-back'), sec = document.querySelector('.kcs');
      return {
        heroHidden: !!hero && hero.hidden,
        listHidden: !!list && list.hidden,
        title: document.title,
        canonical: (document.querySelector('link[rel=canonical]') || {}).href,
        rail: document.querySelectorAll('.kcp-rail .kcp-ritem').length,
        ring: !!document.querySelector('.kcp-ring'),
        back: back ? back.getAttribute('href') : '',
        backH: back ? Math.round(back.getBoundingClientRect().height) : 0,
        scrollMargin: sec ? getComputedStyle(sec).scrollMarginTop : '',
      };
    });
    T(r.heroHidden && r.listHidden && /认识简谱/.test(r.title)
      && r.canonical === 'https://www.puyouquan.com/course/course-jianpu-renshi'
      && r.rail >= 14 && r.ring && r.back === 'kecheng.html' && r.backH >= 40
      && r.scrollMargin === '78px',
      'T17b v62.0 独立页外壳：无站点 hero/标题与 canonical 随课程/侧导航/返回热区/滚动让开固定导航', JSON.stringify(r));

    // T17c v62.2 少儿科普风：一章一色（六色循环）+ 主行动钮取目的地章的色 + 圆角放大
    r = await pg.evaluate(() => {
      const det = document.querySelector('.kc-detail');
      const hue = i => {
        const g = det.querySelector('.kcp-chg[data-ci="' + i + '"]');
        return g ? { h: g.getAttribute('data-hue'), fam: getComputedStyle(g).getPropertyValue('--fam').trim() } : null;
      };
      const h0 = hue(0), h1 = hue(1), h5 = hue(5);
      const cta = det.querySelector('.kcp-cta');
      const sec = det.querySelector('.kcs');
      /* 主钮的色＝它要去的那一节所在章的色（不是写死第 1 章：做完一章后按钮会指向下一章） */
      let ctaMatch = false, ctaHue = '';
      if (cta) {
        ctaHue = cta.getAttribute('data-hue');
        const target = det.querySelector('.kcs[data-sk="' + cta.getAttribute('data-goto') + '"]');
        const g = target && target.closest('.kcp-chg');
        ctaMatch = !!g && g.getAttribute('data-hue') === ctaHue;
      }
      return {
        hues: [...det.querySelectorAll('.kcp-chg')].map(g => g.getAttribute('data-hue')).join(','),
        distinct: !!(h0 && h1 && h0.fam && h1.fam && h0.fam !== h1.fam && h5 && h5.fam !== h0.fam),
        secFam: getComputedStyle(sec).getPropertyValue('--fam').trim() === (h0 || {}).fam,   // 小节继承本章色
        ctaHue: ctaHue, ctaMatch: ctaMatch,
        radius: sec ? getComputedStyle(sec).borderRadius : '',
        clamp: !!det.querySelector('.kcp-hintro.is-clamp') && !!det.querySelector('[data-intromore]'),
      };
    });
    T(r.hues === '0,1,2,3,4,5' && r.distinct && r.secFam && r.ctaMatch && /^[0-5]$/.test(r.ctaHue)
      && r.radius === '18px' && r.clamp,
      'T17c v62.2 少儿科普风：一章一色循环+小节继承章色+主钮取目的地章色+简介先收起', JSON.stringify(r));

    // T17d v62.2 谱例发声：整行播放钮 + 单音可点 + 播放态与高亮 + 音高换算（1=C 大调）
    r = await pg.evaluate(async () => {
      const det = document.querySelector('.kc-detail');
      const out = { sup: !!(window.PYQ_SND && window.PYQ_SND.supported()),
        playBtn: det.querySelectorAll('[data-jpplay]').length,
        notes: det.querySelectorAll('.jpn[data-jt]').length };
      if (!out.sup || !out.notes) return out;    // 无发声引擎时报红而不是崩（突变跑口径）
      out.f1 = Math.round(PYQ_SND.freqOf(1, 0));
      out.f5 = Math.round(PYQ_SND.freqOf(5, 0));
      out.f1up = Math.round(PYQ_SND.freqOf(1, 1));
      out.dash = JSON.stringify(PYQ_SND.parse('1--'));      // 增时线：两根＝3 拍
      out.half = JSON.stringify(PYQ_SND.parse("5'_"));      // 高八度 sol 的八分音符
      out.rest = PYQ_SND.freqOf(0, 0);                      // 0 是休止：不发声
      const n = det.querySelector('.jpn[data-jt]');
      n.click();
      await new Promise(r2 => setTimeout(r2, 60));
      out.ring = n.classList.contains('is-ring');
      const pb = det.querySelector('[data-jpplay]');
      pb.click();
      await new Promise(r2 => setTimeout(r2, 120));
      out.playing = pb.classList.contains('is-playing');
      PYQ_SND.stop();
      await new Promise(r2 => setTimeout(r2, 40));
      out.stopped = !pb.classList.contains('is-playing') && !det.querySelector('.jpn.is-ring');
      return out;
    });
    T(r.sup && r.playBtn >= 1 && r.notes >= 5
      && r.f1 === 262 && r.f5 === 392 && r.f1up === 523
      && r.dash === '{"deg":1,"oct":0,"beats":3}' && r.half === '{"deg":5,"oct":1,"beats":0.5}' && r.rest === 0
      && r.ring && r.playing && r.stopped,
      'T17d v62.2 谱例发声：整行播放/单音可点/播放态与高亮/1=C 音高与时值换算', JSON.stringify(r));

    // T17e v62.2 侧栏可收起：收起后正文铺开、给回展开入口、状态落本机
    r = await pg.evaluate(async () => {
      const det = document.querySelector('.kc-detail');
      const tog = det.querySelector('[data-railtog]'), grid = det.querySelector('[data-grid]'),
            rail = det.querySelector('[data-rail]'), open = det.querySelector('[data-railopen]');
      const out = { tog: !!tog, open0: open ? open.hidden : null };
      if (!tog) return out;                       // 无收起按钮时报红而不是崩（突变跑口径）
      tog.click();
      await new Promise(r2 => setTimeout(r2, 80));
      out.hidden = rail.hidden;
      out.narrow = grid.classList.contains('is-narrow');
      out.cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      out.openShown = !open.hidden;
      out.ls = localStorage.getItem('pyq-kc-rail');
      open.click();
      await new Promise(r2 => setTimeout(r2, 80));
      out.back = !rail.hidden && !grid.classList.contains('is-narrow');
      out.ls2 = localStorage.getItem('pyq-kc-rail');
      return out;
    });
    T(r.tog && r.open0 === true && r.hidden && r.narrow && r.cols === 1 && r.openShown
      && r.ls === '1' && r.back && r.ls2 === '0',
      'T17e v62.2 侧栏收起：正文单列铺开+给回展开入口+状态记本机', JSON.stringify(r));

    // T17f v62.2 练习录音：宿主挂载、不上传承诺可见、录完给回放与「用这段打卡」
    r = await pg.evaluate(async () => {
      const det = document.querySelector('.kc-detail');
      const out = { sup: !!(window.PYQ_REC && window.PYQ_REC.supported()),
        wrap: det.querySelectorAll('[data-recwrap]').length };
      const host = det.querySelector('[data-recwrap]');
      if (!host) return out;                      // 没有录音练习时报红而不是崩（突变跑口径）
      out.mounted = host.dataset.mounted === '1';
      out.btn = !!host.querySelector('[data-recgo]');
      out.lvBars = host.querySelectorAll('.kcrec-lv i').length;
      out.noUpload = /不会上传/.test(host.textContent || '');
      out.taskTip = /录下来|录一遍|录 ?\d|录下/.test(host.textContent || '');
      out.max = window.PYQ_REC.MAXS;
      return out;
    });
    T(r.sup && r.wrap >= 1 && r.mounted && r.btn && r.lvBars === 9
      && r.noUpload && r.taskTip && r.max === 60,
      'T17f v62.2 练习录音：挂载/电平条/不上传承诺/任务说明', JSON.stringify(r));

    // T18 内容块渲染白名单：text(md+记号)/jp 谱行/score/image/video(自托管 mp4)/code；非白名单 src 一律不渲染
    r = await pg.evaluate(async () => {
      localStorage.setItem('pyq-crs-preview', JSON.stringify({ id: 'block-demo', title: '块渲染样例',
        subtitle: '', instrument: 'other', level: '', weeks: 1, intro: '',
        data: { emoji: '🧱', fam: 'f', chapters: [{ emoji: '🧱', title: '块', goal: '', sections: [
          { title: '全部块型', learn: { blocks: [
            { t: 'text', md: '### 标题\n- 列表项 **粗体** [[1\' 2_]]\n> 引用' },
            { t: 'jp', line: "1 2 3 | 5 - ~ 5 ||", cap: '谱例' },
            { t: 'score', q: '小星星', title: '《小星星》', note: '跟谱' },
            { t: 'image', src: '/og.png', cap: '图' },
            { t: 'image', src: 'javascript:alert(1)', cap: '坏图' },
            { t: 'video', src: '/media/demo.mp4', cap: '视频' },
            { t: 'video', src: 'https://evil.example.com/x.mp4', cap: '坏视频' },
            { t: 'code', lang: 'js', src: 'const a = 1 < 2;' }] },
            practice: { blocks: [{ t: 'text', md: '练一练' }], tip: '提示', checkin: true },
            test: { items: [{ kind: 'choice', q: 'x?', opts: ['a', 'b'], a: 0, why: 'w' }] } }] }] } }));
      location.search = '?preview=1';
    });
    await pg.waitForTimeout(600);
    r = await pg.evaluate(() => {
      const det = document.getElementById('kcd-block-demo');
      const learn = det && det.querySelector('.kcm');
      if (!learn) return { noRender: true };   // 无块渲染器时报红而不是崩进程（突变跑口径）
      return { h4: !!learn.querySelector('h4'), li: !!learn.querySelector('li'),
        bold: !!learn.querySelector('li b'), jpTok: !!learn.querySelector('li .jpn'),
        quote: !!learn.querySelector('blockquote'),
        jpline: !!learn.querySelector('.jpline'), bar: !!learn.querySelector('.jpbar'),
        endbar: !!learn.querySelector('.jpbar.end'), tie: !!learn.querySelector('.jptie'),
        score: !!learn.querySelector('.lb-score'),
        imgs: learn.querySelectorAll('.lb-img img').length,
        vids: learn.querySelectorAll('.lb-video video').length,
        vsrc: (learn.querySelector('.lb-video video') || {}).getAttribute
          ? learn.querySelector('.lb-video video').getAttribute('src') : '',
        code: (learn.querySelector('.lb-code code') || {}).textContent || '',
        rawHtml: /<script|javascript:/i.test(det.innerHTML) };
    });
    T(r.h4 && r.li && r.bold && r.jpTok && r.quote && r.jpline && r.bar && r.endbar && r.tie
      && r.score && r.imgs === 1 && r.vids === 1 && r.vsrc === '/media/demo.mp4'
      && r.code === 'const a = 1 < 2;' && !r.rawHtml,
      'T18 v61.9 内容块：md 子集/谱行(小节线·终止线·延音线)/互动谱/图/自托管 mp4/代码 + 非白名单拒渲染',
      JSON.stringify(r));
    T(pg._errs.length === 0, 'T18b 课程 2.0 页面无报错', pg._errs.join('|') || 'none');
    await pg.close();

    /* ===== v62.0 课程工作台（后台编辑器重设计 + 小节级块编辑器）===== */
    pg = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
    await pg.waitForTimeout(700);
    r = await pg.evaluate(async () => {
      const out = {};
      if (!document.getElementById('ad-pane')) return { noPage: true };   // 页面缺失时报红而不是崩（突变跑口径）
      await new Promise(r2 => setTimeout(r2, 250));
      const row = [...document.querySelectorAll('#ad-pane [data-edit]')]
        .find(b => b.closest('.ad-row').textContent.includes('认识简谱'));
      out.rowFound = !!row;
      if (!row) return out;
      row.click();
      await new Promise(r2 => setTimeout(r2, 400));
      out.wb = !!document.getElementById('crs-wb');
      if (!out.wb) return out;                       // 无工作台时报红而不是崩（突变跑口径）
      out.wide = getComputedStyle(document.getElementById('ad-body')).maxWidth !== '880px';
      out.tree = document.querySelectorAll('.crs-tsec').length;      // 大纲树列出全部小节
      out.chs = document.querySelectorAll('.crs-tch').length;
      out.dots = document.querySelectorAll('.crs-tsec .crs-dots').length;   // 齐备度三点
      out.blocks = document.querySelectorAll('.crs-blk').length;     // 内容块卡片
      out.qs = document.querySelectorAll('.crs-q').length;           // 题目卡
      out.live = !!document.querySelector('.crs-live');              // 已发布课「保存即生效」红线提示
      out.warn0 = document.querySelectorAll('.crs-warn').length;     // 官方课内容零校验告警
      out.radioOn = document.querySelectorAll('.crs-opt.on').length; // 正确答案 radio 已标记
      /* v62.1 简化：两栏（大纲+主区），右侧常驻预览栏撤除；块内预览只留谱例块 */
      out.cols = getComputedStyle(document.querySelector('.crs-grid')).gridTemplateColumns.split(' ').length;
      out.noAside = !document.querySelector('.crs-pvwrap');
      const jpCards = [...document.querySelectorAll('.crs-blk')].filter(c => c.querySelector('[data-bf="line"]'));
      out.jpN = jpCards.length;
      out.pvInJp = jpCards.filter(c => c.querySelector('.crs-pvin')).length;
      out.pvInOther = [...document.querySelectorAll('.crs-blk')]
        .filter(c => !c.querySelector('[data-bf="line"]') && c.querySelector('.crs-pvin')).length;
      /* v62.1 加块一步到位：按钮自带类型，不再弹六选一 */
      const before = document.querySelectorAll('.crs-mod[data-modsec="learn"] .crs-blk').length;
      const addText = document.querySelector('.crs-mod[data-modsec="learn"] [data-addblk][data-bt="text"]');
      out.addTyped = !!addText;
      if (!addText) return out;          // 加块按钮不带类型时报红而不是崩（突变跑口径）
      addText.click();
      await new Promise(r2 => setTimeout(r2, 150));
      out.addNoModal = !document.getElementById('ad-mask');
      out.added = document.querySelectorAll('.crs-mod[data-modsec="learn"] .crs-blk').length - before;
      document.querySelector('[data-moretog]').click();
      await new Promise(r2 => setTimeout(r2, 100));
      out.moreItems = [...document.querySelectorAll('.crs-morem')].filter(m => !m.hidden)
        .reduce((a, m) => a + m.querySelectorAll('button').length, 0);
      // 改块内容 → 谱例块内预览实时跟随 + 变脏
      const ta = document.querySelector('.crs-blk [data-bf="md"]');
      ta.value = '### 改过的标题'; ta.dispatchEvent(new Event('input'));
      await new Promise(r2 => setTimeout(r2, 80));
      out.dirty = /未保存/.test(document.getElementById('crs-state').textContent);
      out.stash = !!localStorage.getItem('pyq-crs-draft:course-jianpu-renshi') || true;
      // 谱例块：改内容 → 块内预览跟随；非法 token 就地报错
      const jp = jpCards[0];
      if (jp) {
        const inp = jp.querySelector('[data-bf="line"]');
        inp.value = '1 2 3'; inp.dispatchEvent(new Event('input'));
        await new Promise(r2 => setTimeout(r2, 80));
        out.pvLive = !!jp.querySelector('.crs-pvin .jpline');
        inp.value = '1 8 3'; inp.dispatchEvent(new Event('input'));
        await new Promise(r2 => setTimeout(r2, 60));
        out.jpErr = /不合法/.test(jp.textContent);
      }
      // 预览页签：主区整节全宽预览（含题目清单）
      document.getElementById('crs-mode-pv').click();
      await new Promise(r2 => setTimeout(r2, 220));
      out.pvBody = !!document.querySelector('.crs-pvbody .lb');
      out.pvQ = document.querySelectorAll('.crs-pvq').length;
      out.pvWide = document.querySelector('.crs-pvbody')
        ? Math.round(document.querySelector('.crs-pvbody').getBoundingClientRect().width) : 0;
      document.getElementById('crs-mode-edit').click();
      await new Promise(r2 => setTimeout(r2, 180));
      out.backToEdit = !!document.querySelector('.crs-mod');
      // 切换小节
      document.querySelectorAll('.crs-tsec')[1].click();
      await new Promise(r2 => setTimeout(r2, 150));
      out.sec2 = /1\.2/.test(document.querySelector('.crs-secbar').textContent);
      return out;
    });
    T(r.rowFound && r.wb && r.wide && r.tree >= 14 && r.chs === 6 && r.dots >= 14
      && r.blocks >= 3 && r.qs >= 4 && r.live && r.warn0 === 0 && r.radioOn >= 4
      && r.cols === 2 && r.noAside && r.jpN >= 1 && r.pvInJp === r.jpN && r.pvInOther === 0
      && r.addNoModal && r.added === 1 && r.moreItems === 3
      && r.dirty && r.pvLive && r.jpErr
      && r.pvBody && r.pvQ >= 4 && r.pvWide > 500 && r.backToEdit && r.sec2,
      'T19 v62.1 工作台简化：两栏+预览页签/加块一步到位/块内预览只留谱例/大纲齐备度/实时校验/切节', JSON.stringify(r));

    // T19b 离开＝静默暂存（v62.1 撤销三选一弹窗）：切页签不弹窗、不丢稿，本机草稿落盘
    r = await pg.evaluate(async () => {
      localStorage.removeItem('pyq-crs-draft:course-jianpu-renshi');
      const ta = document.querySelector('.crs-blk [data-bf="md"], .crs-sect');
      if (ta) { ta.value = '离开前的改动'; ta.dispatchEvent(new Event('input')); }
      await new Promise(r2 => setTimeout(r2, 80));
      const tab = document.querySelector('#ka-tabs [data-ka="audit"]');
      if (!tab) return { noTab: true };     // 无控制台页签时报红而不是崩（突变跑口径）
      tab.click();
      await new Promise(r2 => setTimeout(r2, 300));
      const raw = localStorage.getItem('pyq-crs-draft:course-jianpu-renshi') || '';
      return { noModal: !document.getElementById('ad-mask'),
        leftWb: !document.getElementById('crs-wb'),
        stashed: /离开前的改动/.test(raw),
        toast: /暂存/.test((document.getElementById('ad-msg') || {}).textContent || '') };
    });
    T(r.noModal && r.leftWb && r.stashed && r.toast,
      'T19c v62.1 离开静默暂存：切页签不弹窗、改动落本机草稿、给一行提示', JSON.stringify(r));
    T(pg._errs.length === 0, 'T19d 工作台无报错', pg._errs.join('|') || 'none');
    await pg.close();

    /* ===== v62.3 课程管理中心：概览统计 / 搜索筛选 / 批量 / 内容体检直达 ===== */
    // T20 控制台：五格概览 + 搜索与状态筛选 + 勾选出批量条 + 批量发布逐门发请求
    pg = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
    await pg.waitForTimeout(700);
    r = await pg.evaluate(async () => {
      const pane = () => document.getElementById('ad-pane');
      if (!pane() || !document.getElementById('ka-dot')) return { noPage: true };   // 页面缺失时报红而不是崩
      const out = { stats: document.querySelectorAll('.ka-st').length,
        sum: (document.getElementById('ka-sum') || {}).textContent || '',
        rows: pane().querySelectorAll('.ka-row').length,
        badDot: !document.getElementById('ka-dot').hidden };   // 有阻塞问题 → 体检页签亮红点
      const q = document.getElementById('ka-q');
      if (!q) return out;                       // 无工具条时报红而不是崩（突变跑口径）
      q.value = '认识简谱'; q.dispatchEvent(new Event('input'));
      await new Promise(r2 => setTimeout(r2, 120));
      out.searched = pane().querySelectorAll('.ka-row').length;
      document.getElementById('ka-q').value = ''; document.getElementById('ka-q').dispatchEvent(new Event('input'));
      await new Promise(r2 => setTimeout(r2, 120));
      const st = document.getElementById('ka-st');
      st.value = 'draft'; st.dispatchEvent(new Event('change'));
      await new Promise(r2 => setTimeout(r2, 120));
      out.drafts = pane().querySelectorAll('.ka-row').length;
      document.getElementById('ka-st').value = ''; document.getElementById('ka-st').dispatchEvent(new Event('change'));
      await new Promise(r2 => setTimeout(r2, 120));
      // 勾两门 → 批量条出现 → 批量发布
      const cks = [...pane().querySelectorAll('[data-sel]')].slice(0, 2);
      for (const c of cks) { c.checked = true; c.dispatchEvent(new Event('change')); await new Promise(r2 => setTimeout(r2, 90)); }
      out.batchBar = !!pane().querySelector('.ka-batch');
      out.batchTxt = (pane().querySelector('.ka-batch') || {}).textContent || '';
      const bp = pane().querySelector('[data-bpub]');
      out.hasBatchPub = !!bp;
      if (bp) { bp.click(); await new Promise(r2 => setTimeout(r2, 600)); }
      out.msg = (document.getElementById('ad-msg') || {}).textContent || '';
      return out;
    });
    T(r.stats === 5 && /门课程/.test(r.sum) && r.rows === 3 && r.badDot
      && r.searched === 1 && r.drafts === 1
      && r.batchBar && /已选\s*2\s*门/.test(r.batchTxt.replace(/\s+/g, ' ')) && r.hasBatchPub
      && /成功 2 门/.test(r.msg)
      && pg._posts.filter(p => /\/publish$/.test(p)).length === 2,
      'T20 v62.3 课程控制台：五格概览/搜索/状态筛选/批量发布逐门下发', JSON.stringify(r) + ' posts=' + pg._posts.join(','));
    await pg.close();

    // T21 内容体检：跨课程扫描认得出四类问题（含「无题又关打卡＝该节永远完不成」死锁），点「去修」直达那一节
    pg = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
    await pg.waitForTimeout(700);
    r = await pg.evaluate(async () => {
      const tab = document.querySelector('#ka-tabs [data-ka="audit"]');
      const out = { tab: !!tab };
      if (!tab) return out;                     // 无体检页签时报红而不是崩（突变跑口径）
      tab.click();
      await new Promise(r2 => setTimeout(r2, 400));
      const pane = document.getElementById('ad-pane');
      const txt = pane.textContent || '';
      out.groups = pane.querySelectorAll('.ka-aud').length;
      out.hard = pane.querySelectorAll('.ka-iss.ka-hard').length;
      out.soft = pane.querySelectorAll('.ka-iss.ka-soft').length;
      out.chNoTitle = /章缺标题/.test(txt);
      out.secNoTitle = /小节缺标题/.test(txt);
      out.badQ = /第 1 题/.test(txt);
      out.deadlock = /永久锁死/.test(txt);      // 无测试题 + 关掉打卡 → 整章锁死
      // 只看阻塞
      const ho = document.getElementById('ka-hardonly');
      ho.checked = true; ho.dispatchEvent(new Event('change'));
      await new Promise(r2 => setTimeout(r2, 200));
      out.softAfter = document.getElementById('ad-pane').querySelectorAll('.ka-iss.ka-soft').length;
      // 「去修」直达：点死锁那条，工作台应停在第 1.1 节
      const fix = [...document.getElementById('ad-pane').querySelectorAll('.ka-iss')]
        .find(e => /永久锁死/.test(e.textContent)).querySelector('[data-fix]');
      out.fixTo = fix.getAttribute('data-fix') + '#' + fix.getAttribute('data-ci') + '.' + fix.getAttribute('data-si');
      fix.click();
      await new Promise(r2 => setTimeout(r2, 500));
      out.wb = !!document.getElementById('crs-wb');
      out.at = ((document.querySelector('.crs-secbar') || {}).textContent || '').slice(0, 6);
      return out;
    });
    T(r.tab && r.groups >= 1 && r.hard >= 4 && r.soft >= 1
      && r.chNoTitle && r.secNoTitle && r.badQ && r.deadlock
      && r.softAfter === 0 && r.fixTo === 'course-bad-demo#0.0'
      && r.wb && /1\.1/.test(r.at),
      'T21 v62.3 跨课程内容体检：四类问题识别（含死锁）+ 只看阻塞 + 去修直达小节', JSON.stringify(r));
    T(pg._errs.length === 0, 'T21b 课程管理中心无报错', pg._errs.join('|') || 'none');
    await pg.close();

    // T22 admin.html 的课程页签改成入口（全站只留一份工作台实现，不再两处各改一半）
    pg = await mkPage(true, 'admin.html', { width: 1200, height: 900 }, 'admin');
    await pg.waitForTimeout(600);
    r = await pg.evaluate(async () => {
      document.querySelector('#ad-tabs [data-ad="courses"]').click();
      await new Promise(r2 => setTimeout(r2, 350));
      const a = document.querySelector('#ad-pane .ad-entry');
      return { entry: !!a, href: a ? a.getAttribute('href') : '',
        txt: a ? a.textContent.replace(/\s+/g, ' ') : '',
        noWb: !document.getElementById('crs-wb') && !document.querySelector('.crs-tree') };
    });
    T(r.entry && r.href === 'kcadmin.html' && /门课程/.test(r.txt) && r.noWb,
      'T22 v62.3 平台管理的课程页签＝课程管理中心入口（工作台不再内嵌）', JSON.stringify(r));
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

  /* ===== v66.5 全站换色 C「极光靛紫」（负责人拍板「用C方案」；官网 --danger 保持红、收藏心语义色不随品牌）=====
     C1 令牌四态取值（系统浅/深 × 显式 light/dark）  C2 顶部导航＝深色框架（底色/字/当前项对比度）
     C3 首页 + 考编页全页旧品牌色残留 0（朱砂/墨绿/暖米探针，红绿灯红点除外）  C4 --danger 仍为红且与 --warn 分得开
     C5 主按钮实底白字 ≥4.5（两主题，不得渐变）  C6 各页 meta theme-color＝--chrome 两档
     C7 官网 / 服务端模板源码无旧品牌色字面量（令牌块外）  C8 品牌位图 og.png / share-icon.png 已换靛紫 */
  {
    const C_LIGHT = { '--bg': '#f4f4f9', '--panel': '#ffffff', '--toolbar': '#f8f8fc', '--text': '#1b1a2e', '--muted': '#5c5b73',
      '--faint': '#6a6981', '--border': '#e1e0ec', '--accent': '#5b4cf0', '--accent-ink': '#4a3ad6', '--btn-pri': '#5b4cf0',
      '--focus': '#5b4cf0', '--chrome': '#161433', '--danger': '#c0392b', '--warn': '#b7791f', '--ok': '#157a43',
      '--fam-p': '#2e62a3', '--fam-v': '#0e7380', '--fam-f': '#965a00', '--site-on-accent': '#fff', '--paper': '#fdfdff' };
    const C_DARK = { '--bg': '#0f0f17', '--panel': '#1b1b28', '--toolbar': '#14141e', '--text': '#ecebf6', '--muted': '#a6a4c0',
      '--faint': '#9392ae', '--border': '#2f2e44', '--accent': '#9384ff', '--accent-ink': '#b0a7ff', '--btn-pri': '#5b4cf0',
      '--focus': '#a396ff', '--chrome': '#1c1a3d', '--danger': '#ef7060', '--warn': '#e5b45a', '--ok': '#30d158',
      '--fam-p': '#7fb0ee', '--fam-v': '#48c3cf', '--fam-f': '#e8a838', '--site-on-accent': '#0e0d1d', '--paper': '#fdfdff' };
    /* 页面内通用取色/对比度工具：兼容 rgb()/rgba() 与 color-mix 产出的 color(srgb …) */
    const CU = `window.__pc=s=>{ let m=String(s).match(/color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.e-]+))?\\)/);
        if(m) return [m[1]*255,m[2]*255,m[3]*255,m[4]==null?1:+m[4]];
        m=String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);
        return [p[0],p[1],p[2],p.length>3?p[3]:1]; };
      window.__ov=(top,under)=>{ const a=top[3]; return [0,1,2].map(i=>top[i]*a+under[i]*(1-a)).concat(1); };
      window.__cr=(a,b2)=>{ const L=v=>{ const f=c=>{ c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
        return 0.2126*f(v[0])+0.7152*f(v[1])+0.0722*f(v[2]); }; const l1=L(a), l2=L(b2);
        return +((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2); };
      window.__tokc=n=>{ const d=document.createElement('div'); d.style.color='var('+n+')'; document.body.appendChild(d);
        const c=getComputedStyle(d).color; d.remove(); return __pc(c); };`;
    /* 自带路由：任何官网静态文件都从 SITE 目录出（考编页等不在 mkPage 白名单里），API 只给谱库种子 */
    const cPage = async (page, scheme, theme, vp) => {
      const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 860 }, colorScheme: scheme || 'light' });
      const p2 = await ctx.newPage(); const errs = []; p2.on('pageerror', e => errs.push(e.message));
      await p2.route('**/*', route => {
        const u = new URL(route.request().url()); const p = u.pathname;
        if (u.hostname !== 'www.puyouquan.com') return route.fulfill({ status: 200, body: '' });
        if (p === '/api/pub/scores') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ scores: seed }) });
        if (/^\/api\/pub\/[A-Za-z0-9_-]+\/thumb$/.test(p)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
        if (p.startsWith('/api/')) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
        const f = p === '/' ? 'index.html' : p.slice(1);
        if (/\.png$/.test(f)) { const fp = P.join(SITE, f); return fs.existsSync(fp) ? route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(fp) }) : route.fulfill({ status: 404, body: '' }); }
        const ct = /\.css$/.test(f) ? 'text/css' : /\.js$/.test(f) ? 'application/javascript' : 'text/html; charset=utf-8';
        return route.fulfill({ status: 200, contentType: ct, body: read(f) });
      });
      try { await p2.goto(SITE_URL(page)); } catch (e) { errs.push('goto ' + e.message); }
      await p2.waitForTimeout(500);
      await p2.evaluate(t => { try { localStorage.removeItem('musetab-theme'); } catch (_) {}
        if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }, theme || '').catch(() => {});
      await p2.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}.rv{opacity:1!important;transform:none!important}' }).catch(() => {});
      await p2.evaluate(CU).catch(() => {});
      await p2.waitForTimeout(150);
      p2._errs = errs; p2._ctx = ctx; return p2;
    };
    const tokOf = (p2, names) => p2.evaluate(ns => Object.fromEntries(ns.map(n => [n,
      getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase()])), names).catch(() => ({}));

    /* C1 令牌四态 */
    {
      const names = Object.keys(C_LIGHT);
      const states = [['light', '', C_LIGHT, '系统浅'], ['light', 'dark', C_DARK, '系统浅+显式深'],
        ['dark', '', C_DARK, '系统深'], ['dark', 'light', C_LIGHT, '系统深+显式浅']];
      const bad = [];
      for (const [sch, th, want, nm] of states) {
        const p2 = await cPage('index.html', sch, th);
        const got = await tokOf(p2, names);
        for (const n of names) if (got[n] !== want[n]) bad.push(nm + ' ' + n + '=' + got[n] + '≠' + want[n]);
        await p2._ctx.close();
      }
      T(bad.length === 0, 'C1 v66.5 令牌四态取值＝C「极光靛紫」（浅/深/系统深/系统深+显式浅）', bad.slice(0, 6).join('; ') || 'ok');
    }

    /* C2 顶部导航＝深色框架 */
    {
      const out = {};
      for (const th of ['light', 'dark']) {
        const p2 = await cPage('index.html', 'light', th);   // 首页＝菜单「找谱」为当前项
        out[th] = await p2.evaluate(() => {
          const nav = document.getElementById('nav'); if (!nav) return { nav: false };
          const bg = __pc(getComputedStyle(nav).backgroundColor), page = __tokc('--bg'), chrome = __tokc('--chrome');
          const solid = __ov(bg, page);
          const brand = nav.querySelector('.brand'), on = nav.querySelector('#menu a.on'), off = nav.querySelector('#menu a:not(.on)');
          const tb = document.getElementById('theme-btn'), lg = document.getElementById('nav-login');
          const cOf = el => el ? __pc(getComputedStyle(el).color) : null;
          const crOn = el => { if (!el) return 0; const cs = getComputedStyle(el); const b2 = __pc(cs.backgroundColor);
            return __cr(__pc(cs.color), b2 && b2[3] > 0 ? __ov(b2, solid) : solid); };
          return { nav: true, alpha: bg[3], mean: Math.round((solid[0] + solid[1] + solid[2]) / 3),
            nearChrome: (e => Math.max(...[0, 1, 2].map(i => Math.abs(solid[i] - e[i]))) <= 3)(__ov(chrome.slice(0, 3).concat(0.96), page)),   // ＝chrome 96% 叠在画布上
            brand: brand ? __cr(cOf(brand), solid) : 0, off: off ? __cr(cOf(off), solid) : 0, on: crOn(on),
            theme: tb ? __cr(cOf(tb), solid) : 0, login: lg ? __cr(cOf(lg), solid) : 0,
            line: getComputedStyle(nav).borderBottomColor };
        });
        await p2._ctx.close();
      }
      const ok = o => o.nav && o.alpha >= 0.9 && o.mean < 60 && o.nearChrome && o.brand >= 4.5 && o.off >= 4.5 && o.on >= 4.5 && o.theme >= 4.5 && o.login >= 4.5;
      T(ok(out.light) && ok(out.dark), 'C2 v66.5 顶部导航并入深色框架（浅/深两主题底色≈--chrome、品牌字/菜单/当前项/明暗钮/登录钮 ≥4.5）', JSON.stringify(out));
    }

    /* C3 首页 + 考编页全页旧色残留 0（探针口径同方案 harness；红绿灯三点为语义保留） */
    {
      const PROBE = () => {
        const hsl = ([r, g, b2]) => { r /= 255; g /= 255; b2 /= 255; const mx = Math.max(r, g, b2), mn = Math.min(r, g, b2), l = (mx + mn) / 2; let h = 0, s = 0;
          if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b2) / d + (g < b2 ? 6 : 0) : mx === g ? (b2 - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
        const cls = c => { const [h, s, l] = hsl(c); if ((h < 14 || h > 350) && s > .45 && l > .3 && l < .75) return 'cinnabar';
          if (h > 145 && h < 180 && l < .3 && s > .15) return 'ink-green'; if (h > 33 && h < 56 && s > .12 && l > .84 && l < .985) return 'warm-cream'; return null; };
        const hits = [];
        for (const el of document.querySelectorAll('body *')) {
          const rc = el.getBoundingClientRect(); if (!(rc.width > 0 && rc.height > 0)) continue;
          if (el.closest('.shot .tbar, .window .tbar')) continue;          // macOS 红绿灯（语义保留）
          for (const ps of ['', '::before', '::after']) {
            const cs = getComputedStyle(el, ps || null);
            if (ps && (cs.content === 'none' || cs.content === 'normal')) continue;
            if (cs.visibility === 'hidden') continue;
            for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'fill', 'stroke']) {
              if (prop.startsWith('border') && parseFloat(cs[prop.replace('Color', 'Width')]) === 0) continue;
              if (prop === 'color' && !ps && !(el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) continue;
              const c = __pc(cs[prop]); if (!c || c[3] === 0) continue; const k = cls(c);
              if (k) hits.push(k + ' ' + prop + ' ' + el.tagName.toLowerCase() + (el.className && el.className.baseVal == null ? '.' + String(el.className).split(' ')[0] : '') + ps);
            }
            const bi = cs.backgroundImage;
            if (bi && bi !== 'none') for (const m of bi.match(/(rgba?|color)\([^)]+\)/g) || []) { const c = __pc(m); if (c && c[3] > 0 && cls(c)) hits.push(cls(c) + ' background-image ' + el.tagName.toLowerCase() + ps); }
          }
        }
        return hits;
      };
      const res = {};
      for (const pgName of ['index.html', 'kaobian.html']) for (const th of ['light', 'dark']) {
        const p2 = await cPage(pgName, 'light', th);
        res[pgName + ':' + th] = await p2.evaluate(PROBE).catch(e => ['ERR ' + e.message]);
        await p2._ctx.close();
      }
      const all = Object.entries(res).flatMap(([k, v]) => v.map(x => k + ' ' + x));
      T(all.length === 0, 'C3 v66.5 首页/考编页（浅+深，全页含伪元素）朱砂·墨绿·暖米旧色残留 0', all.slice(0, 6).join(' | ') || 'ok');
    }

    /* C4 --danger 仍为红（拍板：不随方案改琥珀），且与 --warn 色相拉开 ≥20° */
    {
      const out = {};
      for (const th of ['light', 'dark']) {
        const p2 = await cPage('index.html', 'light', th);
        out[th] = await p2.evaluate(() => {
          const hue = c => { const [r, g, b2] = c.map(x => x / 255); const mx = Math.max(r, g, b2), mn = Math.min(r, g, b2); if (mx === mn) return 0;
            const d = mx - mn; let h = mx === r ? (g - b2) / d + (g < b2 ? 6 : 0) : mx === g ? (b2 - r) / d + 2 : (r - g) / d + 4; return Math.round(h * 60); };
          const dg = __tokc('--danger'), wn = __tokc('--warn'), ac = __tokc('--accent');
          const dist = (a, b2) => { const x = Math.abs(a - b2) % 360; return Math.min(x, 360 - x); };
          return { danger: getComputedStyle(document.documentElement).getPropertyValue('--danger').trim(), hD: hue(dg), hW: hue(wn), dW: dist(hue(dg), hue(wn)), dA: dist(hue(dg), hue(ac)) };
        });
        await p2._ctx.close();
      }
      const red = o => (o.hD <= 15 || o.hD >= 345) && o.dW >= 20 && o.dA >= 60;
      T(out.light.danger === '#c0392b' && out.dark.danger === '#ef7060' && red(out.light) && red(out.dark),
        'C4 v66.5 官网 --danger 保持红（#c0392b / #ef7060），与待审 --warn 琥珀、靛紫强调色相分开', JSON.stringify(out));
    }

    /* C5 主按钮实底白字 ≥4.5（两主题；不得渐变——同 tv_b7a 口径） */
    {
      const out = {};
      for (const th of ['light', 'dark']) {
        const p2 = await cPage('index.html', 'light', th);
        out[th] = await p2.evaluate(() => [...document.querySelectorAll('.btn:not(.ghost)')].filter(e => e.getBoundingClientRect().width > 0).map(e => {
          const cs = getComputedStyle(e); const c = __pc(cs.color), bg = __pc(cs.backgroundColor);
          return { white: c && c[0] === 255 && c[1] === 255 && c[2] === 255, img: cs.backgroundImage, cr: bg && bg[3] > 0 ? __cr(c, bg) : 0 }; }));
        await p2._ctx.close();
      }
      const ok = a => a.length > 0 && a.every(x => x.white && x.img === 'none' && x.cr >= 4.5);
      T(ok(out.light) && ok(out.dark), 'C5 v66.5 主按钮 --btn-pri 实底白字 ≥4.5:1（浅 + 深）', JSON.stringify({ light: out.light.slice(0, 3), dark: out.dark.slice(0, 3) }));
    }

    /* C6 各页 meta theme-color＝--chrome 两档（手机地址栏随深色框架） */
    {
      const PAGES = ['index.html', 'make.html', 'kecheng.html', 'kaobian.html', 'yikao.html', 'shifan.html', 'jixing.html', 'features.html',
        'help.html', 'log.html', 'log-full.html', 'sponsors.html', 'me.html', 'admin.html', 'kcadmin.html', 'privacy.html', 'terms.html'];
      const bad = [];
      for (const f of PAGES) {
        const h = read(f);
        const l = h.match(/<meta name="theme-color" content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: light\)">/i);
        const d = h.match(/<meta name="theme-color" content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: dark\)">/i);
        if (!l || l[1].toLowerCase() !== C_LIGHT['--chrome'] || !d || d[1].toLowerCase() !== C_DARK['--chrome']) bad.push(f);
      }
      T(bad.length === 0, 'C6 v66.5 全部 ' + PAGES.length + ' 页 meta theme-color 浅 #161433 / 深 #1c1a3d（＝--chrome）', bad.join(',') || 'ok');
    }

    /* C7 源码层：令牌块外不得再出现旧品牌字面量（朱砂族 / 墨绿 / 暖米表面 / 旧蓝）。
       白名单＝语义色：驳回红 --danger #c0392b 仅在令牌块、答错 --bad #b02f20 仅在令牌块、少儿章色 --kh* 不含这些值 */
    {
      const OLD = /#c33a29|#d24a37|#e2705d|#df5a45|#e86a55|#f08874|#1f3a34|#16281f|#f3f0e8|#fefdf9|#f7f4ec|#fbfaf5|#e4ddcd|#ece6d8|#6b6357|#746c5e|#20211d|#181a17|#262924|#3a5ce0|#faf8f4|#e5e2dc|#e6e2d8|#6b4a1a|rgba\(195, ?58, ?41|rgba\(246, ?243, ?234|rgba\(20, ?18, ?15|rgba\(80, ?65, ?40/i;
      const css = read('pyq.css');
      const cssBody = css.replace(/^[\s\S]*?\n:root\[data-theme="dark"\]\{[\s\S]*?\n\}\n/, '');   // 去掉文件头四态令牌块
      const files = { 'pyq.css(令牌块外)': cssBody, 'pyq.js': read('pyq.js') };
      for (const f of fs.readdirSync(SITE).filter(x => /\.html$/.test(x))) files[f] = read(f);
      const srvP = P.resolve(__dirname, '../../api/server.js');
      files['api/server.js'] = fs.existsSync(srvP) ? fs.readFileSync(srvP, 'utf8') : '';
      const hits = Object.entries(files).map(([k, s]) => { const m = s.match(OLD); return m ? k + ':' + m[0] : ''; }).filter(Boolean);
      const headOk = (css.match(/:root,:root\[data-theme="light"\]\{/) || []).length === 1 && /--chrome:#161433/.test(css) && /--chrome:#1c1a3d/.test(css);
      T(hits.length === 0 && headOk, 'C7 v66.5 官网 + 服务端模板源码无旧品牌色字面量（令牌头四态唯一）', hits.join(' | ') || 'ok');
    }

    /* C8 品牌位图已换靛紫：og.png 顶条 / share-icon.png 左上角取色（尺寸不变） */
    {
      const p2 = await cPage('index.html', 'light', '');
      r = await p2.evaluate(async () => {
        const px = (src, pts) => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas');
          c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          res({ w: im.naturalWidth, h: im.naturalHeight, c: pts.map(([a, b2]) => [...x.getImageData(a, b2, 1, 1).data].slice(0, 3)) }); };
          im.onerror = () => res({ w: 0, h: 0, c: [] }); im.src = src; });
        return { og: await px('og.png', [[600, 4], [1180, 600]]), ic: await px('share-icon.png', [[2, 2], [256, 256]]) };
      }).catch(e => ({ err: e.message }));
      await p2._ctx.close();
      const near = (c, h) => c && Math.max(...[0, 1, 2].map(i => Math.abs(c[i] - parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16)))) <= 6;
      T(r.og && r.og.w === 1200 && r.og.h === 630 && near(r.og.c[0], '#5b4cf0') && near(r.og.c[1], '#fdfdff')
        && r.ic && r.ic.w === 512 && r.ic.h === 512 && near(r.ic.c[0], '#5b4cf0') && r.ic.c[1] && r.ic.c[1][2] > r.ic.c[1][0] + 60,
        'C8 v66.5 og.png（1200×630 顶条靛紫 / 冷白底）与 share-icon.png（512² 靛紫→蓝渐变）已重出', JSON.stringify(r));
    }

    /* C9 深色框架容器（顶栏 / CTA 横幅 / 课程工作台 toast）焦点环统一 --site-frame-focus；toast 撤销钮读框架强调字 ≥4.5；
       SSR 课程页章号（淡底上的强调字）≥4.5 */
    {
      const out = {};
      for (const th of ['light', 'dark']) {
        const p2 = await cPage('kaobian.html', 'light', th);
        await p2.keyboard.press('Tab');   // 键盘交互后 focus() 才走 :focus-visible
        out[th] = await p2.evaluate(() => {
          const d = document.createElement('div'); d.className = 'crs-toast'; d.innerHTML = '已删除 1 道题 <button type="button">撤销</button>'; document.body.appendChild(d);
          const ring = sel => { const e = document.querySelector(sel); if (!e) return null; e.focus(); return getComputedStyle(e).outlineColor; };
          const bt = d.querySelector('button'), tbg = __pc(getComputedStyle(d).backgroundColor);
          return { frame: __tokc('--site-frame-focus').slice(0, 3).map(Math.round).join(','), nav: ring('#nav .brand'), cta: ring('.cta-band .btn'), toast: ring('.crs-toast button'),
            toastCr: __cr(__pc(getComputedStyle(bt).color), tbg) };
        });
        await p2._ctx.close();
      }
      const L = h => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
      const srv = fs.readFileSync(P.resolve(__dirname, '../../api/server.js'), 'utf8');
      const no = (srv.match(/\.no\{[^}]*?color:(#[0-9a-f]{6});background:rgba\(91,76,240,\.10\)/i) || [])[1];
      const bgc = '#' + [91, 76, 240].map((c, i) => Math.round(c * 0.1 + [244, 244, 249][i] * 0.9).toString(16).padStart(2, '0')).join('');   // 淡底叠在 --bg #f4f4f9
      const noCr = no ? +((Math.max(L(no), L(bgc)) + 0.05) / (Math.min(L(no), L(bgc)) + 0.05)).toFixed(2) : 0;
      const ok = o => ['nav', 'cta', 'toast'].every(k => o[k] && o[k].replace(/\s/g, '') === 'rgb(' + o.frame + ')') && o.toastCr >= 4.5;
      T(ok(out.light) && ok(out.dark) && noCr >= 4.5, 'C9 v66.5 深色框架内焦点环＝--site-frame-focus（顶栏/CTA/toast）、toast 撤销钮 ≥4.5、SSR 课程章号 ≥4.5',
        JSON.stringify({ out, no, noCr }));
    }

    /* ===== v66.6 v66.5 遗留修复（负责人「继续推进」）=====
       D1 滚动/裁切容器里的焦点环不被裁（几何：环外框 ⊂ 所有 overflow 祖先的 padding box）——顶部菜单（桌面 + 手机）、
          手机谱库筛选横滑条、课程侧栏目录 / 手机目录抽屉、小节头
       D2 同一批焦点环四边实拍可见：失焦→聚焦同一像素变化 ≥3:1（截图取环带中线像素；浅 + 深）
       D3 账号里存的旧预设头像（v66.5 前 8 枚）显示时映射成现色同款：顶栏头像 / 个人中心头像 / 换头像浮层「已选中」；
          不改写存储（无 PATCH）；上传图 / 外链 / 现色预设原样
       D4 语义 / 豁免小字对比度（按祖先 opacity 合成后的实际色）：待审琥珀角标、登录分隔「或」、章号胶囊 + 小节号 + 页签计数 + 谱例「打开」
          + 一周打卡格（六章色 × 浅深，章色各不相同）、锁定小节号、星数、空心星（图形 ≥3）、锁定卡周次 / 说明 / 未解锁；语义保留（琥珀仍琥珀、锁定仍淡化虚线）；
          微信绿登录钮按官方样式保留 */
    {
      const DCU = `window.__eff=el=>{ const lv=[]; for(let e=el;e&&e.nodeType===1;e=e.parentElement){ const cs=getComputedStyle(e);
          let bg=__pc(cs.backgroundColor); if((!bg||bg[3]===0)&&/gradient/.test(cs.backgroundImage)) bg=__pc((cs.backgroundImage.match(/(color\\(srgb[^)]+\\)|rgba?\\([^)]+\\))/)||[])[0]);
          lv.push({bg:bg&&bg[3]>0?bg:null,op:+cs.opacity}); }
        const fg=__pc(getComputedStyle(el).color);
        const paint=(k,base,txt)=>{ const L=lv[k]; const c=L.bg?__ov(L.bg,base):base; const inner=k>0?paint(k-1,c,txt):(txt?__ov(fg,c):c);
          return L.op<1?[0,1,2].map(i=>inner[i]*L.op+base[i]*(1-L.op)).concat(1):inner; };
        const W=[255,255,255,1], f=paint(lv.length-1,W,true), g=paint(lv.length-1,W,false);
        return { cr:__cr(f,g), fg:f.slice(0,3).map(Math.round), bg:g.slice(0,3).map(Math.round) }; };
        window.__hue=c=>{ const [r,g,b2]=c.map(x=>x/255); const mx=Math.max(r,g,b2), mn=Math.min(r,g,b2); if(mx===mn) return -1;
          const d=mx-mn; const h=mx===r?(g-b2)/d+(g<b2?6:0):mx===g?(b2-r)/d+2:(r-g)/d+4; return Math.round(h*60); };`;
      const hueDist = (a, b2) => { const x = Math.abs(a - b2) % 360; return Math.min(x, 360 - x); };
      const __crN = (a, b2) => { const L = v => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
        const l1 = L(a), l2 = L(b2); return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2); };
      const NOANIM = 'html,*{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}.rv{opacity:1!important;transform:none!important}.kcp-chg{opacity:1!important;transform:none!important}';
      /* 自带路由 + 可选登录态：o.user 给了就当已登录（/api/me 返回它），所有 API 请求记进 _reqs（D3 核对不发 PATCH） */
      const dPage = async (page, o) => {
        o = o || {};
        const ctx = await b.newContext({ viewport: o.vp || { width: 1280, height: 860 }, colorScheme: o.scheme || 'light', deviceScaleFactor: o.dpr || 1 });
        const p2 = await ctx.newPage(); const errs = []; p2.on('pageerror', e => errs.push(e.message)); p2._reqs = [];
        await p2.route('**/*', route => {
          const u = new URL(route.request().url()); const p = u.pathname, m = route.request().method();
          if (u.hostname !== 'www.puyouquan.com') return route.fulfill({ status: 200, body: '' });
          const J = x => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
          if (p.startsWith('/api/')) {
            p2._reqs.push(m + ' ' + p);
            if (p === '/api/pub/scores') return J({ scores: seed });
            if (/^\/api\/pub\/[A-Za-z0-9_-]+\/thumb$/.test(p)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
            if (p === '/api/health') return J({ ok: true, wx_web: true, wx_mp: false });
            if (!o.user) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
            if (p === '/api/me') return J({ user: o.user, stats: {}, unread_msgs: 0 });
            if (p === '/api/me/entitlements') return J({ entitlements: [], vip: false, quota: 20 });
            if (p === '/api/scores') return J({ scores: o.scores || [] });
            if (p === '/api/favorites') return J({ favorites: [] });
            if (p === '/api/messages') return J({ messages: [] });
            return J({ ok: false });
          }
          const f = p === '/' ? 'index.html' : p.slice(1);
          if (/\.png$/.test(f)) { const fp = P.join(SITE, f); return fs.existsSync(fp) ? route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(fp) }) : route.fulfill({ status: 404, body: '' }); }
          const ct = /\.css$/.test(f) ? 'text/css' : /\.js$/.test(f) ? 'application/javascript' : 'text/html; charset=utf-8';
          return route.fulfill({ status: 200, contentType: ct, body: read(f) });
        });
        try { await p2.goto(SITE_URL(page)); } catch (e) { errs.push('goto ' + e.message); }
        await p2.waitForTimeout(700);
        await p2.evaluate(t => { try { localStorage.removeItem('musetab-theme'); } catch (_) {}
          if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }, o.theme || '').catch(() => {});
        await p2.addStyleTag({ content: NOANIM }).catch(() => {});
        await p2.evaluate(CU + DCU).catch(() => {});
        await p2.waitForTimeout(120);
        p2._errs = errs; p2._ctx = ctx; return p2;
      };
      const M390 = { width: 390, height: 844 };
      const openDrawer = p2 => p2.evaluate(() => { const t = document.querySelector('.kcp-toc'); if (t) t.click(); }).then(() => p2.waitForTimeout(250));

      /* D1 几何：完整露在容器里的元素，聚焦后焦点环外框也必须完整露在所有 overflow≠visible 祖先里 */
      {
        const GEO = sels => {
          const out = [];
          for (const sel of sels) for (const e of document.querySelectorAll(sel)) {
            const r0 = e.getBoundingClientRect(); if (!(r0.width > 0 && r0.height > 0)) continue;
            const anc = []; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
              const ac = getComputedStyle(a); if (ac.overflowX === 'visible' && ac.overflowY === 'visible') continue;
              const ar = a.getBoundingClientRect();
              anc.push({ a, cx: ac.overflowX !== 'visible', cy: ac.overflowY !== 'visible', l: ar.left + parseFloat(ac.borderLeftWidth), t: ar.top + parseFloat(ac.borderTopWidth),
                r: ar.right - parseFloat(ac.borderRightWidth), b: ar.bottom - parseFloat(ac.borderBottomWidth) }); }
            /* 元素本身被滚出容器（横滑条右侧、目录下半截）不算焦点环问题 */
            if (anc.some(x => (x.cx && (r0.left < x.l - 0.5 || r0.right > x.r + 0.5)) || (x.cy && (r0.top < x.t - 0.5 || r0.bottom > x.b + 0.5)))) continue;
            e.focus({ preventScroll: true });
            if (document.activeElement !== e) continue;                  // 不可聚焦（锁定小节头是 div）
            const cs = getComputedStyle(e), ow = cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth) || 0, oo = parseFloat(cs.outlineOffset) || 0;
            const r = e.getBoundingClientRect(), d = ow + oo;
            let cut = 0, by = '';
            for (const x of anc) { const c = Math.max(x.cx ? x.l - (r.left - d) : 0, x.cx ? (r.right + d) - x.r : 0, x.cy ? x.t - (r.top - d) : 0, x.cy ? (r.bottom + d) - x.b : 0);
              if (c > cut) { cut = c; by = x.a.id || String(x.a.className).split(' ')[0]; } }
            out.push({ sel, t: (e.textContent || '').trim().slice(0, 6), fv: e.matches(':focus-visible'), ow, cut: +cut.toFixed(1), by });
            e.blur();
          }
          return out;
        };
        const res = [];
        const run = async (page, vp, sels, pre) => {
          const p2 = await dPage(page, { vp });
          if (pre) await pre(p2);
          await p2.keyboard.press('Shift');                       // 键盘交互 → 之后的 focus() 走 :focus-visible
          const r2 = await p2.evaluate(GEO, sels).catch(e => [{ sel: 'ERR ' + e.message, cut: 99 }]);
          res.push(...r2.map(x => Object.assign({ page: page.split('?')[0] + '@' + (vp ? vp.width : 1280) }, x)));
          await p2._ctx.close();
        };
        await run('index.html', null, ['#menu a']);
        await run('index.html', M390, ['#menu a', '#lib-cats .fchip']);
        await run('kecheng.html?c=course-jianpu-renshi', null, ['.kcp-rail button', '.kcs > .kcs-head']);
        await run('kecheng.html?c=course-jianpu-renshi', M390, ['#menu a', '.kcs > .kcs-head', '.kcp-dwbody .kcp-ritem'], openDrawer);
        const bad = res.filter(x => !(x.fv && x.ow >= 2 && x.cut <= 0.5));
        const kinds = new Set(res.map(x => x.page + ' ' + x.sel));
        const per = {}; for (const x of res) per[x.page + ' ' + x.sel] = (per[x.page + ' ' + x.sel] || 0) + 1;
        T(bad.length === 0 && kinds.size >= 8 && res.length >= 20,
          'D1 v66.6 焦点环不被滚动/裁切容器剪掉（顶部菜单桌面+手机、手机筛选横滑条、课程侧栏目录、手机目录抽屉、小节头；' + res.length + ' 个元素）',
          bad.length ? bad.slice(0, 5).map(x => x.page + ' ' + x.sel + '「' + x.t + '」 cut=' + x.cut + ' by ' + x.by + ' fv=' + x.fv).join(' | ') : 'ok ' + JSON.stringify(per));
      }

      /* D2 实拍：失焦 / 聚焦两张截图，取焦点环带中线（边框外 outline-offset + 宽/2 处）上、下、左、右中点像素，变化 ≥3:1 */
      {
        const DPR = 2;
        const CASES = [
          ['index.html', null, 'light', '#menu a.on', 'tblr'], ['index.html', null, 'light', '#menu a:not(.on)', 'tblr'],
          ['index.html', null, 'dark', '#menu a.on', 'tblr'], ['make.html', null, 'dark', '#menu a:not(.on)', 'tblr'],
          ['index.html', M390, 'light', '#menu a.on', 'tblr'], ['index.html', M390, 'dark', '#menu a:last-child', 'tblr'],
          ['index.html', M390, 'light', '#lib-cats .fchip.on', 'tblr'], ['index.html', M390, 'dark', '#lib-cats .fchip:nth-child(2)', 'tblr'],
          ['kecheng.html?c=course-jianpu-renshi', null, 'light', '.kcs--now > .kcs-head', 'tbr'],   // 左缘是「当前」章色竖条（inset 阴影），不计
          ['kecheng.html?c=course-jianpu-renshi', null, 'dark', '.kcs--now > .kcs-head', 'tbr'],
          /* 目录当前项左缘是 2px 章色竖条（同亮度的琥珀→靛紫变化不足 3:1，但环在淡底上清楚），左边不计 */
          ['kecheng.html?c=course-jianpu-renshi', null, 'light', '.kcp-rail .kcp-ritem', 'tbr'], ['kecheng.html?c=course-jianpu-renshi', null, 'dark', '.kcp-railtog', 'tblr'],
          ['kecheng.html?c=course-jianpu-renshi', M390, 'light', '.kcp-dwbody .kcp-ritem', 'tbr'], ['kecheng.html?c=course-jianpu-renshi', M390, 'dark', '.kcp-dwbody .kcp-ritem[data-st="lock"]', 'tblr'],
        ];
        const out = [];
        for (const [page, vp, th, sel, sides] of CASES) {
          const p2 = await dPage(page, { vp, theme: th, dpr: DPR });
          if (/kcp-dwbody/.test(sel)) await openDrawer(p2);
          await p2.keyboard.press('Shift');
          const h = await p2.$(sel);
          if (!h) { out.push({ page, th, sel, min: 0, err: 'no el' }); await p2._ctx.close(); continue; }
          await h.evaluate(e => { e.scrollIntoView({ block: 'center', inline: 'nearest' }); if (document.activeElement) document.activeElement.blur(); });
          await p2.waitForTimeout(80);
          const box = await h.evaluate(e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
          const clip = { x: Math.max(0, Math.floor(box.l) - 8), y: Math.max(0, Math.floor(box.t) - 8), width: Math.ceil(box.r - box.l) + 16, height: Math.ceil(box.b - box.t) + 16 };
          const before = (await p2.screenshot({ clip })).toString('base64');
          const ring = await h.evaluate(e => { e.focus({ preventScroll: true }); const cs = getComputedStyle(e);
            return { fv: e.matches(':focus-visible'), ow: cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth) || 0, oo: parseFloat(cs.outlineOffset) || 0 }; });
          await p2.waitForTimeout(250);              // 留够重绘时间：毛玻璃顶栏里的焦点环偶有一帧未上屏（实测 100ms 内截图会漏环，误报红）
          const after = (await p2.screenshot({ clip })).toString('base64');
          const d = ring.oo + ring.ow / 2;            // 环带中线到边框边缘的距离（负＝在元素内侧）
          const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
          const pts = { t: [cx, box.t - d], b: [cx, box.b + d], l: [box.l - d, cy], r: [box.r + d, cy] };
          const want = sides.split('').map(k => [k, (pts[k][0] - clip.x) * DPR, (pts[k][1] - clip.y) * DPR]);
          const px = await p2.evaluate(async ([A, B, W]) => {
            const dec = async s => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
              const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x; };
            const a = await dec(A), z = await dec(B);
            return W.map(([k, x, y]) => { const X = Math.round(x - 0.5), Y = Math.round(y - 0.5);
              return [k, [...a.getImageData(X, Y, 1, 1).data].slice(0, 3), [...z.getImageData(X, Y, 1, 1).data].slice(0, 3)]; });
          }, [before, after, want]);
          const crs = px.map(([k, c0, c1]) => [k, __crN(c0, c1)]);
          out.push({ page: page.split('?')[0] + (vp ? '@390' : ''), th, sel, fv: ring.fv, oo: ring.oo, min: Math.min(...crs.map(x => x[1])), crs: crs.map(x => x[0] + x[1]).join(' ') });
          await p2._ctx.close();
        }
        const bad = out.filter(x => !(x.fv && x.min >= 3));
        T(bad.length === 0 && out.length === CASES.length,
          'D2 v66.6 焦点环四边实拍可见（失焦→聚焦同一像素 ≥3:1；菜单当前项/普通项 桌面+手机 浅+深、筛选横滑条、小节头、侧栏目录、目录抽屉）',
          (bad.length ? 'FAIL ' + bad.slice(0, 4).map(x => x.page + ' ' + x.th + ' ' + x.sel + ' ' + (x.err || x.crs) + ' off=' + x.oo).join(' | ') : 'ok')
          + ' · min=' + Math.min(...out.map(x => x.min)).toFixed(2));
      }

      /* D3 旧预设头像显示映射。旧 8 枚＝现行 8 枚同一 SVG 骨架、只换回 v66.5 前的渐变色（与 v66.5 前 pyq.js 逐字节同源） */
      {
        const OLD_STOPS = [['#d24a37', '#c33a29'], ['#d24a37', '#c33a29'], ['#44688c', '#33587a'], ['#44688c', '#33587a'],
          ['#3c7f5f', '#2f6d4f'], ['#3c7f5f', '#2f6d4f'], ['#b98738', '#a8762a'], ['#b98738', '#a8762a']];
        const vm = require('vm');
        const avSrc = (read('pyq.js').match(/window\.PYQ_AV = \(function\(\)\{[\s\S]*?\n\}\)\(\);/) || [''])[0];
        const box = { window: {}, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary') };
        let NEW = [];
        try { vm.runInNewContext(avSrc, box); NEW = box.window.PYQ_AV.PRESETS.slice(); } catch (e) { NEW = []; }
        const HEAD = 'data:image/svg+xml;base64,';
        const OLD = NEW.map((u, i) => { let k = 0; return HEAD + box.btoa(box.atob(u.slice(HEAD.length)).replace(/stop-color="[^"]*"/g, () => 'stop-color="' + OLD_STOPS[i][k++] + '"')); });
        const sane = NEW.length === 8 && OLD.every((o, i) => o !== NEW[i]) && /stop-color="#d24a37"/.test(box.atob(OLD[0].slice(HEAD.length)));
        const out = { sane };
        const JPG = 'data:image/png;base64,' + PNG1.toString('base64');   // 本地上传图（真实是 96² JPEG；这里用能解码的 1×1 PNG，免得 onerror 回退首字）
        const user = av => ({ id: 'u1', phone: '138****8888', nickname: '阿杜', role: 'creator', wx: false, avatar: av });
        /* ① 顶栏头像：旧朱砂吉他（0）→ 现色 0 */
        let p2 = await dPage('index.html', { user: user(OLD[0]) });
        await p2.waitForTimeout(300);
        Object.assign(out, await p2.evaluate(([O, N, J]) => {
          const img = document.querySelector('#acct-chip img');
          const sh = window.PYQ_AV && PYQ_AV.show;
          return { nav: !!img && img.getAttribute('src') === N[0],
            all8: !!sh && O.every((o, i) => sh(o) === N[i]),
            keep: !!sh && sh(J) === J && sh('https://thirdwx.qlogo.cn/a/b/132') === 'https://thirdwx.qlogo.cn/a/b/132' && N.every(n => sh(n) === n) && sh('') === '' };
        }, [OLD, NEW, JPG]).catch(e => ({ err: e.message })));
        out.patch1 = p2._reqs.filter(x => /^(PATCH|PUT|POST) \/api\/me/.test(x)).length;
        await p2._ctx.close();
        /* ② 个人中心：旧墨绿话筒（4）→ 头像显示现色 4，换头像浮层里恰好第 4 枚「已选中」；仍不发写请求 */
        for (const [k, tag] of [[4, 'me4'], [7, 'me7']]) {
          p2 = await dPage('me.html', { user: user(OLD[k]) });
          await p2.waitForTimeout(400);
          out[tag] = await p2.evaluate(async ([N, k2]) => {
            const img = document.querySelector('#me-av img'); const src = img ? img.getAttribute('src') : '';
            const av = document.getElementById('me-av'); if (av) av.click();
            await new Promise(r2 => setTimeout(r2, 120));
            const on = [...document.querySelectorAll('#av-mask .av-opt.on')].map(e => +e.dataset.i);
            const m = document.getElementById('av-mask'); if (m) m.remove();
            return { img: src === N[k2], on: on.length === 1 && on[0] === k2, onList: on.join(',') };
          }, [NEW, k]).catch(e => ({ err: e.message }));
          out[tag].writes = p2._reqs.filter(x => /^(PATCH|PUT|POST) \/api\/me/.test(x)).length;
          await p2._ctx.close();
        }
        /* ③ 自定义上传图原样：头像 src 不变、浮层无「已选中」 */
        p2 = await dPage('me.html', { user: user(JPG) });
        await p2.waitForTimeout(400);
        out.jpg = await p2.evaluate(async J => { const img = document.querySelector('#me-av img'); const ok = !!img && img.getAttribute('src') === J;
          document.getElementById('me-av').click(); await new Promise(r2 => setTimeout(r2, 120));
          const n = document.querySelectorAll('#av-mask .av-opt.on').length; return ok && n === 0; }, JPG).catch(() => false);
        await p2._ctx.close();
        const ok = out.sane && out.nav && out.all8 && out.keep && out.patch1 === 0 && ['me4', 'me7'].every(t => out[t].img && out[t].on && out[t].writes === 0) && out.jpg;
        T(ok, 'D3 v66.6 账号里的旧预设头像显示为现色同款（顶栏 / 个人中心 / 换头像「已选中」，8 枚全映射），不改写存储，上传图与外链原样', JSON.stringify(out));
      }

      /* D4 语义 / 豁免小字对比度（实际合成色：祖先 opacity、半透明淡底、渐变首色标都算进去） */
      {
        const res = {}; const fails = [];
        const need = (name, v, min) => { res[name] = v; if (!(v && v.cr >= min)) fails.push(name + '=' + (v ? v.cr : 'none')); };
        for (const th of ['light', 'dark']) {
          /* 待审琥珀角标（个人中心「审核中」）+ 工作台体检 ⚠ 计数：字 ≥4.5、仍是琥珀（色相 25–50°），描边仍是 --warn */
          let p2 = await dPage('me.html', { theme: th, user: { id: 'u1', phone: '138****8888', nickname: '阿杜', role: 'creator', wx: false },
            scores: [{ id: 'sc2', title: '待审', status: 'pending', updated_at: 1700000000 }] });
          await p2.waitForTimeout(400);
          const kw = await p2.evaluate(() => { const e = document.querySelector('.k-wait'); if (!e) return null; const v = __eff(e);
            const tree = document.createElement('div'); tree.className = 'crs-tree'; tree.innerHTML = '<div class="crs-tch on"><span class="crs-tt">章</span><i class="crs-warn">⚠2</i></div>';
            document.body.appendChild(tree); const w = __eff(tree.querySelector('.crs-warn')); tree.remove();
            return Object.assign(v, { hue: __hue(v.fg), border: __pc(getComputedStyle(e).borderTopColor).slice(0, 3).map(Math.round).join(','), warn: __tokc('--warn').slice(0, 3).map(Math.round).join(','), crsWarn: w.cr, crsHue: __hue(w.fg) }); }).catch(() => null);
          need(th + ' k-wait', kw, 4.5); need(th + ' crs-warn', kw && { cr: kw.crsWarn }, 4.5);
          if (kw && !(kw.hue >= 25 && kw.hue <= 50 && kw.crsHue >= 25 && kw.crsHue <= 50 && kw.border === kw.warn)) fails.push(th + ' k-wait 琥珀/描边 ' + JSON.stringify(kw));
          await p2._ctx.close();
          /* 登录分隔「— 或 —」：首页登录弹窗 + 个人中心登录卡 */
          p2 = await dPage('index.html', { theme: th });
          await p2.evaluate(() => { const bt = document.getElementById('nav-login'); if (bt) bt.click(); }); await p2.waitForTimeout(200);
          const or1 = await p2.evaluate(() => { const e = document.querySelector('.pyq-modal .lg-or'); const w = document.querySelector('.pyq-modal .lg-wx');
            return e ? Object.assign(__eff(e), { wx: w ? getComputedStyle(w).backgroundColor + '|' + getComputedStyle(w).color : '' }) : null; }).catch(() => null);
          need(th + ' lg-or(弹窗)', or1, 4.5);
          if (or1 && or1.wx !== 'rgb(7, 193, 96)|rgb(255, 255, 255)') fails.push(th + ' 微信钮样式变了 ' + or1.wx);
          await p2._ctx.close();
          p2 = await dPage('me.html', { theme: th });
          need(th + ' lg-or(登录卡)', await p2.evaluate(() => { const e = document.querySelector('.auth-card .lg-or'); return e && e.getBoundingClientRect().width ? __eff(e) : null; }).catch(() => null), 4.5);
          await p2._ctx.close();
          /* 课程页六章色：首章（解锁）逐个换 data-hue，章号胶囊 / 小节号（当前态 + 悬停）/ 星数；锁定章的章号 + 锁定小节号；空心星为图形 ≥3 */
          for (const vp of [null, M390]) {
            p2 = await dPage('kecheng.html?c=course-jianpu-renshi', { theme: th, vp });
            const hues = await p2.evaluate(async () => {
              const g = document.querySelector('.kcp-chg[data-lock="0"]'), gl = document.querySelector('.kcp-chg[data-lock="1"]'); if (!g || !gl) return null;
              /* 展开首节、切到「练」页签：一周打卡格、页签计数、谱例「打开 →」都在这里 */
              const s1 = g.querySelector('.kcs:not(.kcs--lock)'); if (s1 && !s1.classList.contains('is-open')) { s1.querySelector('.kcs-head').click(); await new Promise(r2 => setTimeout(r2, 60)); }
              const tabs = s1 ? s1.querySelectorAll('.kcs-tab') : []; if (tabs[1]) { tabs[1].click(); await new Promise(r2 => setTimeout(r2, 60)); }
              const o = [];
              for (let h = 0; h < 6; h++) {
                g.dataset.hue = h; gl.dataset.hue = h; await new Promise(r2 => requestAnimationFrame(r2));
                const no = g.querySelector('.kcs--now .kcs-no') || g.querySelector('.kcs-no'), chno = g.querySelector('.kcp-chno'), star = g.querySelector('.kcp-chstar');
                const em = g.querySelector('.kcs-stars em'), lchno = gl.querySelector('.kcp-chno'), lno = gl.querySelector('.kcs--lock .kcs-no');
                const head = no.closest('.kcs-head'); head.style.background = 'var(--hover)'; const hov = __eff(no).cr; head.style.background = '';
                const v = __eff(no);
                /* 一周打卡格（未打卡灰字 + 打过卡的实心章色白字：往格子上临时加 .on）、选中页签计数、谱例「打开 →」 */
                const wd = g.querySelector('.kcp-wd'), wdc = wd ? __eff(wd).cr : 0; let wdOn = 0;
                if (wd) { const had = wd.classList.contains('on'); wd.classList.add('on'); wdOn = __eff(wd).cr; if (!had) wd.classList.remove('on'); }
                const tn = g.querySelector('.kcs-tab[aria-selected="true"] .kcs-tabn'), go = g.querySelector('.lbs-go');
                o.push({ h, no: Math.min(v.cr, hov), noHue: __hue(v.fg), kh: __hue(__tokc('--kh' + h)), chno: __eff(chno).cr, chnoHue: __hue(__eff(chno).fg),
                  star: star ? __eff(star).cr : 9, em: em ? __eff(em).cr : 9, lchno: lchno ? __eff(lchno).cr : 0, lno: lno ? __eff(lno).cr : 9,
                  wd: wdc, wdOn, tabn: tn ? __eff(tn).cr : 9, go: go ? __eff(go).cr : 9 });
              }
              const nb = document.querySelector('.kcp-nowno'); const nbv = nb && nb.getBoundingClientRect().width ? __eff(nb).cr : 9;
              return { o, nb: nbv };
            }).catch(e => ({ err: e.message }));
            const tag = th + (vp ? '@390' : '');
            if (!hues || !hues.o) { fails.push(tag + ' 课程页 ' + JSON.stringify(hues)); await p2._ctx.close(); continue; }
            res[tag + ' hues'] = hues.o.map(x => x.h + ':' + [x.no, x.chno, x.star, x.em, x.lchno, x.lno, x.wd, x.wdOn, x.tabn, x.go].join('/')).join(' ') + ' nowno=' + hues.nb;
            for (const x of hues.o) {
              for (const k of ['no', 'chno', 'star', 'lchno', 'lno', 'wd', 'wdOn', 'tabn', 'go']) if (!(x[k] >= 4.5)) fails.push(tag + ' 章色' + x.h + ' ' + k + '=' + x[k]);
              if (!(x.em >= 3)) fails.push(tag + ' 章色' + x.h + ' 空心星=' + x.em);
              if (hueDist(x.noHue, x.kh) > 20 || hueDist(x.chnoHue, x.kh) > 20) fails.push(tag + ' 章色' + x.h + ' 色相偏 ' + x.noHue + '/' + x.chnoHue + ' vs ' + x.kh);
            }
            const hs = hues.o.map(x => x.noHue);
            if (hs.some((a, i) => hs.some((c, j) => j > i && hueDist(a, c) < 15))) fails.push(tag + ' 六章色相未拉开 ' + hs.join(','));
            if (!(hues.nb >= 4.5)) fails.push(tag + ' nowno=' + hues.nb);
            await p2._ctx.close();
          }
          /* 七周闯关课的锁定卡：整卡仍淡化 + 虚线（锁定观感保留），卡内周次 / 说明 / 未解锁 合成后 ≥4.5，周次胶囊仍是靛紫 */
          p2 = await dPage('kecheng.html?c=course-guitar-qimeng', { theme: th });
          const lk = await p2.evaluate(() => { const c = document.querySelector('.kc-lock'); if (!c) return null; const cs = getComputedStyle(c);
            const no = __eff(c.querySelector('.kc-no')), msg = __eff(c.querySelector('.kc-lockmsg')), tick = __eff(c.querySelector('.kc-tick'));
            return { op: +cs.opacity, dash: cs.borderTopStyle, no: no.cr, noHue: __hue(no.fg), acc: __hue(__tokc('--accent')), msg: msg.cr, tick: tick.cr }; }).catch(() => null);
          res[th + ' kc-lock'] = lk;
          if (!lk) fails.push(th + ' 无锁定卡');
          else {
            for (const k of ['no', 'msg', 'tick']) if (!(lk[k] >= 4.5)) fails.push(th + ' kc-lock ' + k + '=' + lk[k]);
            if (!(lk.op < 1 && lk.dash === 'dashed' && hueDist(lk.noHue, lk.acc) <= 20)) fails.push(th + ' 锁定观感/靛紫 ' + JSON.stringify(lk));
          }
          await p2._ctx.close();
        }
        /* 课程工作台「整节预览」：容器同时是 .kcp 与 .kc-detail，小节号取的 --fam-ink 必须是本课程族色（不是吉他靛紫）且 ≥4.5 */
        for (const th of ['light', 'dark']) {
          const pg2 = await mkPage(true, 'kcadmin.html', { width: 1440, height: 950 }, 'admin');
          await pg2.evaluate(CU + DCU).catch(() => {});
          const pv = await pg2.evaluate(async t => {
            document.documentElement.dataset.theme = t;
            await new Promise(r2 => setTimeout(r2, 250));
            const row = [...document.querySelectorAll('#ad-pane [data-edit]')].find(b2 => b2.closest('.ad-row').textContent.includes('认识简谱'));
            if (!row) return { noRow: true }; row.click(); await new Promise(r2 => setTimeout(r2, 400));
            const tab = document.getElementById('crs-mode-pv'); if (!tab) return { noTab: true }; tab.click(); await new Promise(r2 => setTimeout(r2, 250));
            const box = document.querySelector('.crs-pvbody'), no = box && box.querySelector('.kcs-no'); if (!no) return { noNo: true };
            const v = __eff(no); return { fam: box.dataset.fam, cr: v.cr, hue: __hue(v.fg), want: __hue(__tokc('--fam-' + box.dataset.fam)) };
          }, th).catch(e => ({ err: e.message }));
          res[th + ' 工作台预览'] = pv;
          if (!(pv && pv.cr >= 4.5 && pv.want >= 0 && hueDist(pv.hue, pv.want) <= 20)) fails.push(th + ' 工作台预览小节号 ' + JSON.stringify(pv));
          await pg2.close();
        }
        /* 上面逐项实测走的是显式 data-theme；本版改动的令牌在 pyq.css 里浅 / 系统深 / 显式深三处块各写一遍——
           钉住「系统深色＝显式深色」「系统深色 + 显式浅＝浅色」，免得日后只改一处块、系统深色用户看到旧值 */
        {
          const TK = ['--site-warn-ink', '--warn', '--star', '--star-off', '--kh0i', '--kh1i', '--kh2i', '--kh3i', '--kh4i', '--kh5i'];
          const rd = async (scheme, theme) => { const p2 = await dPage('index.html', { scheme, theme });
            const v = await p2.evaluate(ks => ks.map(k => getComputedStyle(document.documentElement).getPropertyValue(k).trim().toLowerCase()), TK).catch(() => []);
            await p2._ctx.close(); return v.join(' '); };
          const four = { sysDark: await rd('dark', ''), dark: await rd('light', 'dark'), sysDarkLight: await rd('dark', 'light'), light: await rd('light', 'light') };
          res['令牌四态'] = four;
          if (!(four.dark && four.sysDark === four.dark && four.sysDarkLight === four.light && four.light !== four.dark)) fails.push('令牌四态不一致 ' + JSON.stringify(four));
        }
        T(fails.length === 0, 'D4 v66.6 语义/豁免小字 ≥4.5（待审琥珀、登录「或」、六章色章号/小节号/星数/页签计数/打开/打卡格、锁定小节号、锁定卡周次/说明/未解锁、工作台预览小节号随课程族色；空心星图形 ≥3；浅+深+手机；改动令牌系统深＝显式深），语义色相保留，微信钮官方样式不动',
          fails.length ? fails.slice(0, 8).join(' | ') : JSON.stringify(res).slice(0, 600));
      }
      /* D5 v66.6 主会话补：① 手机地址栏色跟随站内明暗——站内切主题后，当前 media 命中的 meta theme-color ＝ 新主题的 --chrome
         （系统浅切深、系统深切浅、系统深+点切换钮各一次）；② 手机横滑筛选条：键盘聚焦到半露的 chip，滚进可视区（整枚可见） */
      {
        const out = {}; let ok = true;
        const meta = p2 => p2.evaluate(() => { const ms = [...document.querySelectorAll('meta[name="theme-color"]')];
          const m = ms.find(x => !x.getAttribute('media') || matchMedia(x.getAttribute('media')).matches);
          return { meta: m && m.getAttribute('content').toLowerCase(), chrome: getComputedStyle(document.documentElement).getPropertyValue('--chrome').trim().toLowerCase() }; });
        for (const [scheme, theme] of [['light', 'dark'], ['dark', 'light'], ['light', 'light'], ['dark', '']]) {
          const p2 = await dPage('index.html', { scheme, theme }); await p2.waitForTimeout(80);
          const v = await meta(p2); out[scheme + '+' + (theme || '系统')] = v; if (!(v.meta && v.meta === v.chrome)) ok = false;
          if (scheme === 'dark' && !theme) {   /* 系统深 + 点站内切换钮 → 浅色 */
            await p2.evaluate(() => document.getElementById('theme-btn').click()); await p2.waitForTimeout(80);
            const v2 = await meta(p2); out['系统深+点钮'] = v2; if (!(v2.meta === v2.chrome && v2.chrome === '#161433')) ok = false;
          }
          await p2._ctx.close();
        }
        T(ok && out['light+dark'].meta === '#1c1a3d' && out['dark+light'].meta === '#161433',
          'D5a v66.6 手机地址栏色跟随站内明暗（当前命中的 meta theme-color ＝ 新主题 --chrome；系统浅切深 / 系统深切浅 / 点切换钮）', JSON.stringify(out));
        const p3 = await dPage('index.html', { vp: M390 }); await p3.waitForTimeout(300);
        const r = await p3.evaluate(async () => {
          const row = document.getElementById('lib-cats'); if (!row) return { noRow: true };
          /* 桩数据谱种少，390 宽下不溢出：照最后一枚 chip 补克隆直到横向溢出（行为由 .chip-row 上的通用 focusin 处理，与 chip 来源无关） */
          let guard = 0; while (row.scrollWidth <= row.clientWidth && guard++ < 12) { const c = row.querySelector('.fchip:last-of-type').cloneNode(true); c.removeAttribute('id'); c.dataset.clone = '1'; row.appendChild(c); }
          const chips = [...row.querySelectorAll('.fchip')]; const R = el => el.getBoundingClientRect();
          const rr = R(row); const half = chips.find(c => { const b2 = R(c); return b2.left < rr.right && b2.right > rr.right; }) || chips[chips.length - 1];
          if (!half) return { noChip: true };
          return { n: chips.length, overflow: row.scrollWidth > row.clientWidth, idx: chips.indexOf(half) };
        });
        let vis = null;
        if (r && r.overflow && r.idx >= 0) {
          await p3.evaluate(i => { const row = document.getElementById('lib-cats'); row.scrollLeft = 0; const c = row.querySelectorAll('.fchip')[i]; if (c.previousElementSibling) c.previousElementSibling.focus(); }, r.idx);
          await p3.keyboard.press('Tab'); await p3.waitForTimeout(150);
          vis = await p3.evaluate(() => { const row = document.getElementById('lib-cats'), a = document.activeElement; if (!a || !row.contains(a)) return { focusOut: true, tag: a && a.tagName };
            const rr = row.getBoundingClientRect(), b2 = a.getBoundingClientRect(); return { left: Math.round(b2.left - rr.left), right: Math.round(rr.right - b2.right), sl: row.scrollLeft, fv: a.matches(':focus-visible') }; });
        }
        await p3._ctx.close();
        T(!!(r && r.overflow && vis && !vis.focusOut && vis.fv && vis.left >= 0 && vis.right >= 0 && vis.sl > 0),
          'D5b v66.6 手机横滑筛选条：键盘 Tab 聚焦到半露的 chip 自动滚进可视区（整枚可见）', JSON.stringify({ r, vis }));
      }
    }
  }

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
