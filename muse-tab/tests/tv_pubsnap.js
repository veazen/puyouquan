/* v62.5 A1b 发布快照（2026-10 评审团 P0-2 审核 TOCTOU；D-02「发布快照，修订另审」）客户端回归：
   T1 官网个人中心（me.html）创作者列表：已上架谱的「更新审核中 / 更新被驳回+原因 / 有未发布修改」三态
   T2 管理后台（admin.html）：待审数含更新审核；队列里更新审核行带「更新审核」角标
   T3 编辑器发布：已上架谱再发布＝提交更新审核（弹窗讲明「通过前谱库仍展示上一版」）；没改动＝提示无需再提交
   T4 编辑器创作者中心：状态行带更新审核态，按钮改叫「提交更新」
   T5 v62.6 小程序 web-view 里 me.html「去绑定」跳原生登录页（P2-60），普通浏览器照旧弹表单
   服务端口径见 api/test.sh「发布快照」段（过审后改谱/改标题/改昵称/换缩图公开端都不变）。 */
const { chromium } = require('playwright');
const fs = require('fs'), P = require('path');
const SITE = process.env.MUSETAB_SITE || P.resolve(__dirname, '../site');   // 突变跑可指向改前的站点目录
const F = process.env.MUSETAB_URL || 'file://' + P.resolve(__dirname, '../index.html');
const read = f => { const p = P.join(SITE, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '<!doctype html><body></body>'; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const MY = [
    { id: 'sc_rev', title: '更新审核中的谱', singer: '', status: 'published', rev_status: 'pending', rev_note: '', pub_dirty: 1, updated_at: 1700000300 },
    { id: 'sc_rej', title: '更新被驳回的谱', singer: '', status: 'published', rev_status: 'rejected', rev_note: '标题不当', pub_dirty: 1, updated_at: 1700000200 },
    { id: 'sc_dty', title: '改过没提交的谱', singer: '', status: 'published', rev_status: '', rev_note: '', pub_dirty: 1, updated_at: 1700000100 },
    { id: 'sc_ok', title: '干净的已上架谱', singer: '', status: 'published', rev_status: '', rev_note: '', pub_dirty: 0, updated_at: 1700000000 },
  ];
  const site = async (page, role, opt) => {
    opt = opt || {};
    const pg = await b.newPage({ viewport: { width: 1200, height: 900 }, userAgent: opt.ua });
    if (opt.init) await pg.addInitScript(opt.init);
    pg.on('pageerror', e => errs.push(page + ':' + e.message));
    await pg.route('**/*', route => {
      const u = new URL(route.request().url()), p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (p === '/api/health') return J({ ok: true });
      if (p === '/api/me') return J({ user: { id: 'u1', phone: opt.phone !== undefined ? opt.phone : '138****8888', nickname: '阿杜', role, wx: opt.phone === '' }, stats: {}, unread_msgs: 0 });
      if (p === '/api/scores') return J({ scores: MY });
      if (p === '/api/favorites' || p === '/api/likes') return J({ favorites: [], likes: [] });
      if (p === '/api/me/entitlements') return J({ entitlements: [], vip: false, quota: 500 });
      if (p === '/api/messages') return J({ messages: [] });
      if (p === '/api/pub/scores') return J({ scores: [] });
      if (p === '/api/admin/overview') return J({ users: 3, roles: { user: 1, creator: 1, admin: 1 }, scores: 9,
        scoreStatus: { pending: 1, published: 4 }, pending: 1, published: 4, revisions: 2, orders: { paid: 0, amount_fen: 0 }, funnel: [] });
      if (p === '/api/admin/reviews') return J({ status: 'pending', scores: [
        { id: 'sc_new', title: '首次发布的谱', status: 'pending', review_note: '', updated_at: 1700000000, revision: 0, user_id: 'u2', author: '小谱', phone: '139****9999' },
        { id: 'sc_rev', title: '更新审核中的谱', status: 'published', review_note: '', updated_at: 1700000300, revision: 1, rev_status: 'pending', user_id: 'u2', author: '小谱', phone: '139****9999' }] });
      if (p.startsWith('/api/')) return J({});
      if (p === '/' + page) return route.fulfill({ status: 200, contentType: 'text/html', body: read(page) });
      if (p === '/pyq.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: read('pyq.js') });
      if (p === '/pyq.css') return route.fulfill({ status: 200, contentType: 'text/css', body: read('pyq.css') });
      return route.fulfill({ status: 404, body: '' });
    });
    await pg.goto('https://www.puyouquan.com/' + page); await pg.waitForTimeout(900);
    return pg;
  };

  /* ---------- T1 me.html ---------- */
  {
    const pg = await site('me.html', 'creator');
    const r = await pg.evaluate(() => { const l = document.getElementById('cr-list'); return l ? l.innerText : ''; }).catch(() => '');
    T(/更新审核中/.test(r) && /更新被驳回/.test(r) && /有未发布修改/.test(r), 'T1 个人中心创作者列表：已上架谱的更新审核三态', r.replace(/\s+/g, ' ').slice(0, 200));
    T(/更新驳回原因：标题不当/.test(r) && /谱库仍展示上一版/.test(r), 'T1b 更新被驳回写明原因且说明谱库仍是上一版', r.replace(/\s+/g, ' ').slice(0, 200));
    await pg.close();
  }

  /* ---------- T2 admin.html ---------- */
  {
    const pg = await site('admin.html', 'admin');
    const r = await pg.evaluate(() => ({ sum: (document.getElementById('ad-sum') || {}).textContent || '',
      pane: (document.getElementById('ad-pane') || {}).innerText || '',
      stat: [...document.querySelectorAll('.ad-stat')].map(e => e.innerText.replace(/\s+/g, ' ')).join('|') })).catch(e => ({ err: e.message }));
    T(/待审 3/.test(r.sum || '') && /含 2 条更新审核/.test(r.stat || ''), 'T2 管理后台待审数含更新审核', JSON.stringify({ sum: r.sum, stat: r.stat }));
    T(/更新审核中的谱\s*更新审核/.test(r.pane || '') && !/首次发布的谱\s*更新审核/.test(r.pane || ''), 'T2b 队列里只有更新审核行带「更新审核」角标', (r.pane || '').replace(/\s+/g, ' ').slice(0, 160));
    await pg.close();
  }

  /* ---------- T5 v62.6 A1c ⑤ 小程序 web-view 里「去绑定」跳原生登录页（网页表单在小程序里是孤岛） ---------- */
  {
    const pg = await site('me.html', 'user', { phone: '', ua: 'Mozilla/5.0 (iPhone) MicroMessenger/8.0 miniProgram',
      init: `window.__navs=[]; window.wx={ miniProgram:{ navigateTo:function(o){ window.__navs.push(o.url); o.success&&o.success(); } } };` });
    const r = await pg.evaluate(async () => { const bb = document.getElementById('me-bind'); const go = document.getElementById('bb-go');
      if (!bb || bb.hidden || !go) return { banner: false };
      go.click(); await new Promise(r2 => setTimeout(r2, 200));
      return { banner: true, navs: window.__navs, modal: !!document.getElementById('bind-mask') }; }).catch(e => ({ err: e.message }));
    T(r.banner && (r.navs || []).includes('/pages/login/login') && !r.modal, 'T5 小程序里点「去绑定」跳原生登录页，不弹网页表单', JSON.stringify(r));
    await pg.close();
    const pg2 = await site('me.html', 'user', { phone: '' });
    const r2 = await pg2.evaluate(async () => { const go = document.getElementById('bb-go'); if (!go) return { go: false };
      go.click(); await new Promise(r3 => setTimeout(r3, 200)); return { modal: !!document.getElementById('bind-mask') }; }).catch(e => ({ err: e.message }));
    T(r2.modal, 'T5b 普通浏览器里「去绑定」照旧弹手机号绑定表单', JSON.stringify(r2));
    await pg2.close();
  }

  /* ---------- T3 / T4 编辑器 ---------- */
  {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    pg.on('pageerror', e => errs.push('editor:' + e.message));
    await pg.goto(F); await pg.waitForTimeout(1000);
    const r = await pg.evaluate(async () => {
      const out = {};
      if (typeof guardReplace !== 'undefined') guardReplace = (p) => p();
      const oa = apiCall, keepCloud = window.PYQ_CLOUD, keepAcct = ACCT; const toasts = []; const ot = toast; toast = m => toasts.push(String(m));
      let mode = 'rev';
      apiCall = async (p, o) => {
        if (/\/publish$/.test(p)) return mode === 'rev' ? { published: true, status: 'published', revision: 'pending' } : { published: true, status: 'published', unchanged: true };
        if (p === '/scores') return { scores: [] };
        return { saved: true };
      };
      window.PYQ_CLOUD = true; ACCT = { id: 'u1', phone: '138', role: 'creator' };
      try {
        const e0 = { id: 'song_pubsnap01', title: '已上架谱', mtime: 1, data: PRESETS[0].make() };
        const lib = libLoad(); lib.unshift(e0); libSave(lib);
        showPublishMenu(e0, { left: 100, bottom: 100 });
        document.getElementById('pub-go').click(); await new Promise(r => setTimeout(r, 300));
        const mk = document.getElementById('modal-mask');
        out.modal = mk ? mk.innerText.replace(/\s+/g, ' ') : '';
        closeModal();
        mode = 'same';
        showPublishMenu(e0, { left: 100, bottom: 100 });
        document.getElementById('pub-go').click(); await new Promise(r => setTimeout(r, 300));
        out.sameToast = toasts.find(t => /无需再次提交/.test(t)) || '';
        out.sameNoModal = !document.getElementById('modal-mask');
        /* T4 创作者中心状态行 */
        window.__srvScores = { song_pubsnap01: { id: 'song_pubsnap01', status: 'published', rev_status: 'pending', pub_dirty: 1 } };
        window.__srvScoresAt = Date.now();
        const h = pcCreatorHTML();
        const d = document.createElement('div'); d.innerHTML = h;
        const row = [...d.querySelectorAll('.pc-row')].find(x => /已上架谱/.test(x.textContent));
        out.row = row ? row.textContent.replace(/\s+/g, ' ') : '';
        out.btn = row && row.querySelector('[data-pub-upd]') ? row.querySelector('[data-pub-upd]').textContent : '';
      } finally { apiCall = oa; toast = ot; window.PYQ_CLOUD = keepCloud; ACCT = keepAcct; }
      return out;
    }).catch(e => ({ err: e.message }));
    T(/更新已提交审核/.test(r.modal || '') && /通过前，谱库里展示的仍是上一版/.test(r.modal || ''), 'T3 已上架谱再发布＝提交更新审核，讲明谱库在通过前仍是上一版', (r.modal || r.err || '').slice(0, 120));
    T(!!r.sameToast && r.sameNoModal, 'T3b 没有改动时提示无需再次提交（不弹审核弹窗）', JSON.stringify({ t: r.sameToast }));
    T(/更新审核中/.test(r.row || '') && r.btn === '提交更新', 'T4 编辑器创作者中心：状态行带更新审核态、按钮改叫「提交更新」', JSON.stringify({ row: (r.row || '').slice(0, 80), btn: r.btn }));
    await pg.close();
  }

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
