/* v62.9 A4 合规与诚信 + 小程序环境一次性适配（2026-10 评审团 §6.2 A4；D-01「考编包停售改预约」）：
   编辑器
   T1 权益页：考编包「免费预约」（无支付、无「30 套」「常考」）、点预约走 /reserve 后显示已预约；会员文案只写现有增量；支付提示不自相矛盾
   T2 小程序环境：权益页不出现任何价格与购买按钮；登录弹窗无扫码登录；观看设置「免费开始制谱」改复制链接
   T3 看谱页 ⚙「举报这首谱」：需选理由，提交走 /report
   T4 线上发布菜单不再出现无效的定价/试读输入框（本机演示仍保留）
   T5 隐私政策披露匿名设备标识与账号关联、举报信息（更新日期 2026 年 10 月）
   官网
   T6 登录弹窗与个人中心登录卡：协议默认不勾，不勾不发验证码
   T7 小程序环境：html.is-mp、赞助价目隐藏、页脚邮件/备案转纯文本、制谱器链接改复制；个人中心会员入口直达 ?pc=rights 且无「解锁专业功能」
   T8 管理后台「举报」页签：列出并可标记已处理 */
const { chromium } = require('playwright');
const fs = require('fs'), P = require('path');
const SITE = process.env.MUSETAB_SITE || P.resolve(__dirname, '../site');
const F = process.env.MUSETAB_URL || 'file://' + P.resolve(__dirname, '../index.html');
const read = f => { const p = P.join(SITE, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '<!doctype html><body></body>'; };
const MPUA = 'Mozilla/5.0 (iPhone) AppleWebKit MicroMessenger/8.0.50 miniProgram/wx0';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const editor = async (ua) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: ua });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push('ED:' + e.message));
    /* 伪装线上域名（API_ON 是 const，按 hostname 判定）：编辑器页取本地文件，其余请求一律拦掉、接口在页内打桩 */
    const html = fs.readFileSync(F.replace(/^file:\/\//, ''), 'utf8');
    await pg.route('**/*', route => { const u = new URL(route.request().url());
      if (u.hostname === 'zhipu.puyouquan.com' && (u.pathname === '/' || u.pathname === '/index.html')) return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      if (u.pathname === '/api/health') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return route.abort(); });
    await pg.goto('https://zhipu.puyouquan.com/'); await pg.waitForTimeout(1000);
    await pg.evaluate(`(()=>{ if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); if(typeof undoStack!=='undefined') undoStack.length=0; })()`);
    return pg;
  };
  /* 编辑器里模拟「线上 + 已登录」：权益页需要 API_ON/ACCT */
  const ONLINE = `window.__calls=[]; window.PYQ_CLOUD=true; ACCT={id:'u1',phone:'138****0000',role:'creator',nickname:'测试'};
    window.PYQ_ENT={vip:false,quota:500,entitlements:[]}; window.PYQ_RESV=[];
    apiCall=async(p,o)=>{ window.__calls.push({p, b:o&&o.body}); if(p==='/reserve') return {reserved:true}; if(p==='/report') return {reported:true}; return {}; };`;

  /* ---------- T1 权益页 ---------- */
  {
    const pg = await editor();
    const r = await pg.evaluate(`(async()=>{ ${ONLINE} window.PYQ_WXPAY=true;
      openPersonal('rights'); await new Promise(r=>setTimeout(r,200));
      const pc=document.getElementById('pcenter'); const t=pc? pc.innerText : '';
      const card=pc && pc.querySelector('.mb-card.pack_kaobian');
      const ct=card? card.innerText : '';
      const btn=card && card.querySelector('[data-reserve]');
      const pay=!!(pc && pc.querySelector('[data-pay="pack_kaobian"]'));
      if(btn) btn.click(); await new Promise(r=>setTimeout(r,250));
      const pc2=document.getElementById('pcenter'); const card2=pc2 && pc2.querySelector('.mb-card.pack_kaobian');
      return {ct, pay, hasBtn:!!btn, called:window.__calls.some(c=>c.p==='/reserve' && c.b && c.b.kind==='pack_kaobian'),
        after: card2? card2.innerText : '', t}; })()`).catch(e => ({ err: e.message }));
    T(r && r.hasBtn && !r.pay && /免费预约/.test(r.ct) && !/30 套|常考|¥ ?39|￥39/.test(r.ct), 'T1 考编包：免费预约、无支付、无「30 套/常考/¥39」', JSON.stringify({ ct: (r.ct || r.err || '').replace(/\s+/g, ' ').slice(0, 90), pay: r.pay }));
    T(r && r.called && /已预约/.test(r.after || ''), 'T1b 点「免费预约」走 /reserve，卡片变「已预约」', JSON.stringify({ called: r.called, after: (r.after || '').replace(/\s+/g, ' ').slice(0, 60) }));
    T(r && !/后续会员功能上线即享|在线支付即将上线|八场景/.test(r.t || '') && /会员也可在上方直接微信支付/.test(r.t || ''), 'T1c 会员文案只写现有增量、支付提示不自相矛盾', '');
    await pg.close();
  }

  /* ---------- T2 小程序环境（编辑器） ---------- */
  {
    const pg = await editor(MPUA);
    const r = await pg.evaluate(`(async()=>{ ${ONLINE} window.PYQ_WXPAY=true; window.PYQ_WX_WEB=true;
      const mp=typeof isMpEnv==='function'? isMpEnv() : null;
      openPersonal('rights'); await new Promise(r=>setTimeout(r,200));
      const pc=document.getElementById('pcenter'); const t=pc? pc.innerText : '';
      const pays=pc? pc.querySelectorAll('[data-pay],[data-buy]').length : -1;
      exitPersonal && exitPersonal();
      openLogin(); const wx=!!document.getElementById('lg-wx'); closeModal();
      return {mp, price:/¥|￥/.test(t), pays, wx}; })()`).catch(e => ({ err: e.message }));
    T(r && r.mp === true && !r.price && r.pays === 0, 'T2 小程序里权益页无任何价格与购买按钮', JSON.stringify(r));
    T(r && r.wx === false, 'T2b 小程序里登录弹窗无扫码登录', JSON.stringify(r));
    const r2 = await pg.evaluate(`(async()=>{ let copied=''; try{ navigator.clipboard.writeText=async(t)=>{ copied=t; }; }catch(_){}
      const ot=toast; let tm=''; toast=(m)=>{ tm=String(m); };
      viewerCtx={pubId:'pub0000001'}; showVwSettings();
      const mk=document.getElementById('vs-make'); const label=mk? mk.textContent : '';
      if(mk) mk.click(); await new Promise(r=>setTimeout(r,80)); toast=ot; closeModal();
      return {label, copied, tm}; })()`).catch(e => ({ err: e.message }));
    T(r2 && /复制/.test(r2.label || '') && /zhipu\.puyouquan\.com/.test(r2.copied || '') && /复制/.test(r2.tm || ''), 'T2c 小程序里「开始制谱」改复制链接去电脑打开', JSON.stringify(r2));
    await pg.close();
  }

  /* ---------- T3 举报 / T4 发布菜单 / T5 隐私 ---------- */
  {
    const pg = await editor();
    const r = await pg.evaluate(`(async()=>{ ${ONLINE}
      const ot=toast; const ts=[]; toast=(m)=>ts.push(String(m));
      viewerCtx={pubId:'pub0000001'}; showVwSettings();
      const rp=document.getElementById('vs-report'); const has=!!rp; if(rp) rp.click();
      await new Promise(r=>setTimeout(r,60));
      const go=document.getElementById('rp-go'); if(go) go.click(); await new Promise(r=>setTimeout(r,60));
      const noReason=ts.some(t=>/选择举报理由/.test(t)) && !window.__calls.some(c=>c.p==='/report');
      const radio=document.querySelector('#rp-reasons input[value="copyright"]'); if(radio) radio.checked=true;
      const note=document.getElementById('rp-note'); if(note) note.value='未授权';
      if(go) go.click(); await new Promise(r=>setTimeout(r,120));
      const sent=window.__calls.find(c=>c.p==='/report'); toast=ot;
      viewerCtx={}; showVwSettings(); const noRpOwn=!document.getElementById('vs-report'); closeModal();
      return {has, noReason, sent, done:ts.some(t=>/已收到举报/.test(t)), noRpOwn}; })()`).catch(e => ({ err: e.message }));
    T(r && r.has && r.noReason && r.sent && r.sent.b.reason === 'copyright' && r.sent.b.score_id === 'pub0000001' && r.done, 'T3 看谱页 ⚙ 举报：须选理由，提交走 /report', JSON.stringify(r && r.sent));
    T(r && r.noRpOwn, 'T3b 非谱库谱（本机/互动谱）不出现举报入口', JSON.stringify(r && r.noRpOwn));
    const r4 = await pg.evaluate(`(()=>{ const e={id:'loc1',title:'测试',data:PRESETS[0].make()};
      showPublishMenu(e,{left:100,bottom:100}); const on=!!document.getElementById('pub-price'); closePop();
      window.PYQ_CLOUD=false; ACCT=null; showPublishMenu(e,{left:100,bottom:100}); const off=!!document.getElementById('pub-price'); closePop();
      return {on, off}; })()`).catch(e => ({ err: e.message }));
    T(r4 && r4.on === false && r4.off === true, 'T4 线上发布菜单无定价/试读输入框（本机演示保留）', JSON.stringify(r4));
    const r5 = await pg.evaluate(`(()=>{ showPrivacy(); const t=(document.getElementById('modal-mask')||{}).innerText||''; closeModal();
      return {anon:/pyq_anon/.test(t) && /与你的账号关联/.test(t), rep:/举报信息/.test(t), upd:/2026 年 10 月/.test(t)}; })()`).catch(e => ({ err: e.message }));
    T(r5 && r5.anon && r5.rep && r5.upd, 'T5 隐私政策披露匿名设备标识与账号关联、举报信息', JSON.stringify(r5));
    await pg.close();
  }

  /* ---------- 官网 ---------- */
  const site = async (page, opt) => {
    opt = opt || {};
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, userAgent: opt.ua });
    if (opt.init) await ctx.addInitScript(opt.init);
    const pg = await ctx.newPage();
    pg._posts = []; pg._sms = 0;
    pg.on('pageerror', e => errs.push(page + ':' + e.message));
    await pg.route('**/*', route => {
      const u = new URL(route.request().url()), p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      const NL = () => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (route.request().method() === 'POST') pg._posts.push(p);
      if (p === '/api/health') return J({ ok: true, wx_web: true });
      if (p === '/api/auth/sms/send') { pg._sms++; return J({ sent: true }); }
      if (p === '/api/me') return opt.logged ? J({ user: { id: 'u1', phone: '138****8888', nickname: '阿杜', role: opt.role || 'creator' }, stats: {}, unread_msgs: 0 }) : NL();
      if (p === '/api/me/entitlements') return J({ entitlements: [], vip: false, quota: 500 });
      if (p === '/api/scores' || p === '/api/favorites' || p === '/api/likes' || p === '/api/messages') return opt.logged ? J({ scores: [], favorites: [], likes: [], messages: [], cards: [] }) : NL();
      if (p === '/api/pub/scores') return J({ scores: [], total: 0 });
      if (p === '/api/admin/overview') return J({ users: 1, roles: {}, scores: 1, scoreStatus: {}, pending: 0, published: 1, revisions: 0, reports: 1, orders: { paid: 0, amount_fen: 0 }, funnel: [] });
      if (p === '/api/admin/reviews') return J({ status: 'pending', scores: [] });
      if (p === '/api/admin/reports') return J({ reports: [{ id: 1, score_id: 'pub0000001', reason: 'copyright', note: '未授权', created_at: 1700000000, title: '被举报的谱', status: 'published', n: 2 }] });
      if (p.startsWith('/api/')) return J({ ok: true, closed: 2 });
      if (p === '/' || p === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html', body: read('index.html') });
      if (/^\/[a-z]+\.html$/.test(p)) return route.fulfill({ status: 200, contentType: 'text/html', body: read(p.slice(1)) });
      if (p === '/pyq.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: read('pyq.js') });
      if (p === '/pyq.css') return route.fulfill({ status: 200, contentType: 'text/css', body: read('pyq.css') });
      return route.fulfill({ status: 404, body: '' });
    });
    await pg.goto('https://www.puyouquan.com/' + page); await pg.waitForTimeout(900);
    return pg;
  };

  /* ---------- T6 官网登录协议 ---------- */
  {
    const pg = await site('index.html');
    const r = await pg.evaluate(async () => {
      if (window.PYQ_ACCT && PYQ_ACCT.openLogin) PYQ_ACCT.openLogin();
      await new Promise(r2 => setTimeout(r2, 100));
      const box = document.getElementById('lg-agree');
      const ph = document.getElementById('lg-phone'); if (ph) ph.value = '13800000000';
      const send = document.getElementById('lg-send'); if (send) send.click();
      await new Promise(r2 => setTimeout(r2, 100));
      return { has: !!box, def: box ? box.checked : null, msg: (document.getElementById('lg-msg') || {}).textContent || '' };
    }).catch(e => ({ err: e.message }));
    T(r && r.has && r.def === false && /同意/.test(r.msg) && pg._sms === 0, 'T6 官网登录弹窗：协议默认不勾，不勾不发验证码', JSON.stringify({ r, sms: pg._sms }));
    await pg.close();
    const pg2 = await site('me.html');
    const r2 = await pg2.evaluate(async () => {
      const box = document.getElementById('lg-agree');
      const ph = document.getElementById('lg-phone'); if (ph) ph.value = '13800000000';
      const send = document.getElementById('lg-send'); if (send) send.click();
      await new Promise(r3 => setTimeout(r3, 100));
      return { has: !!box, def: box ? box.checked : null, msg: (document.getElementById('lg-msg') || {}).textContent || '' };
    }).catch(e => ({ err: e.message }));
    T(r2 && r2.has && r2.def === false && /同意/.test(r2.msg) && pg2._sms === 0, 'T6b 个人中心登录卡：协议默认不勾，不勾不发验证码', JSON.stringify({ r2, sms: pg2._sms }));
    await pg2.close();
  }

  /* ---------- T7 官网小程序环境 ---------- */
  {
    const init = `window.__copied=''; Object.defineProperty(navigator,'clipboard',{value:{writeText:async(t)=>{ window.__copied=t; }}, configurable:true});`;
    const pg = await site('sponsors.html', { ua: MPUA, init });
    const r = await pg.evaluate(async () => {
      const tiers = document.querySelector('.tiers'); const ft = document.querySelector('a.mp-text');
      const mk = [...document.querySelectorAll('a[href*="zhipu.puyouquan.com"]')][0];
      const href0 = location.href; if (mk) mk.click(); await new Promise(r2 => setTimeout(r2, 120));
      return { mp: document.documentElement.classList.contains('is-mp'), tiers: tiers ? getComputedStyle(tiers).display : '?',
        note: !!document.querySelector('.mp-note'), stay: location.href === href0, copied: window.__copied,
        ft: ft ? getComputedStyle(ft).pointerEvents : '?' };
    }).catch(e => ({ err: e.message }));
    T(r && r.mp && r.tiers === 'none' && r.ft === 'none', 'T7 小程序里官网：赞助价目隐藏、页脚邮件/备案转纯文本', JSON.stringify(r));
    T(r && r.stay && /zhipu\.puyouquan\.com/.test(r.copied || '') && r.note, 'T7b 小程序里点制谱器链接：不跳转、复制链接并提示', JSON.stringify(r));
    await pg.close();
    const pg2 = await site('me.html', { logged: true });
    await pg2.waitForTimeout(400);
    const r2 = await pg2.evaluate(() => { const v = document.getElementById('me-vip'); const a = v && v.querySelector('a');
      return { t: v ? v.innerText : '', href: a ? a.getAttribute('href') : '' }; }).catch(e => ({ err: e.message }));
    T(r2 && /pc=rights/.test(r2.href || '') && !/解锁专业功能/.test(r2.t || ''), 'T7c 个人中心会员入口直达 ?pc=rights，不再写「解锁专业功能」', JSON.stringify(r2));
    await pg2.close();
  }

  /* ---------- T8 管理后台举报页签 ---------- */
  {
    const pg = await site('admin.html', { logged: true, role: 'admin' });
    const r = await pg.evaluate(async () => {
      const tab = [...document.querySelectorAll('#ad-tabs .ad-tab')].find(x => x.dataset.ad === 'reports');
      if (!tab) return { tab: false };
      const dot = document.getElementById('ad-rdot');
      tab.click(); await new Promise(r2 => setTimeout(r2, 250));
      const pane = document.getElementById('ad-pane'); const t = pane ? pane.innerText : '';
      const c = pane && pane.querySelector('[data-rp-close]'); if (c) c.click(); await new Promise(r2 => setTimeout(r2, 250));
      return { tab: true, dot: dot ? !dot.hidden && dot.textContent : null, t: t.replace(/\s+/g, ' ').slice(0, 80) };
    }).catch(e => ({ err: e.message }));
    T(r && r.tab && /被举报的谱/.test(r.t || '') && /2 条举报/.test(r.t || '') && pg._posts.includes('/api/admin/reports/pub0000001/close'), 'T8 管理后台举报页签：列出并可标记已处理', JSON.stringify({ r, posts: pg._posts }));
    T(r && r.dot === '1', 'T8b 举报页签角标显示未处理数', JSON.stringify(r && r.dot));
    await pg.close();
  }

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
