/* v42.1 编辑器创作者「发布到在线谱库」回归（v60.0 起为审核流）：
   file:// 下 API_ON=false；测试置 window.PYQ_CLOUD=true + ACCT + stub fetch，驱动真实发布链路
   （非创作者自动开通 → 确保云端存谱 → POST publish → 创作者落「已提交审核」/管理员直接上架出公开链接），
   并校验短id升级、错误回滚、本机演示降级。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // 可编程 fetch：记录 /api 调用；publishErr 时 publish 返回 403
  const setup = () => pg.evaluate(() => {
    window.__calls = []; window.__remote = {}; window.__publishErr = false;
    window.fetch = async (url, opt) => {
      const method = (opt && opt.method) || 'GET';
      const body = opt && opt.body ? JSON.parse(opt.body) : null;
      window.__calls.push({ url, method, body });
      const J = o => ({ ok: true, status: 200, json: async () => o });
      const E = (s, e) => ({ ok: false, status: s, json: async () => ({ error: e }) });
      if (url === '/api/me/creator' && method === 'POST') return J({ user: { id: 'u1', nickname: '谱友', phone: '138****8888', role: 'creator' } });
      const pm = url.match(/^\/api\/scores\/([^/]+)\/publish$/);
      if (pm && method === 'POST') {
        if (window.__publishErr) return E(403, '请先在个人中心「成为创作者」');
        const adm = !!(typeof ACCT !== 'undefined' && ACCT && ACCT.role === 'admin');   // 服务端同规则：管理员免自审
        window.__remote[pm[1]] = adm ? 'published' : 'pending';
        return J({ published: adm, status: adm ? 'published' : 'pending', pending: !adm });
      }
      const sm = url.match(/^\/api\/scores\/([^/]+)$/);
      if (sm && method === 'PUT') { window.__remote[sm[1]] = 'saved'; return J({ saved: true, updated_at: body.updated_at }); }
      return J({});
    };
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // T1 非创作者发布：自动开通创作者 → PUT 存谱 → POST 发布 → 出真实公开链接，本地记录 online
  await setup();
  let r = await pg.evaluate(async () => {
    if(document.getElementById('modal-mask')) closeModal();
    window.PYQ_CLOUD = true; ACCT = { id: 'u1', nickname: '谱友', role: 'user' };
    localStorage.removeItem('musetab-library-v1'); localStorage.removeItem('musetab-circle-pub');
    loadSong(createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 }));
    song.title = '小星星'; saveToLibrary();
    await new Promise(r => setTimeout(r, 60));
    window.__calls = [];                                  // 只统计发布流程调用
    const e = libLoad()[0];
    showPublishMenu(e, { left: 100, bottom: 100 });
    document.getElementById('pub-go').click();
    await new Promise(r => setTimeout(r, 160));
    const cp = circlePubs()[0];
    return {
      creator: window.__calls.some(c => c.url === '/api/me/creator' && c.method === 'POST'),
      put: window.__calls.some(c => /^\/api\/scores\/[^/]+$/.test(c.url) && c.method === 'PUT'),
      pub: window.__calls.some(c => /^\/api\/scores\/[^/]+\/publish$/.test(c.url) && c.method === 'POST'),
      role: ACCT.role, id: e.id,
      submitted: /已提交审核/.test(document.body.textContent), noUrl: !document.getElementById('pd-url'),
      online: !!(cp && cp.online), status: cp && cp.status, cloudId: cp && cp.cloudId, title: cp && cp.title,
    };
  });
  T(r.creator && r.put && r.pub && r.role === 'creator' && r.submitted && r.noUrl
    && !r.online && r.status === 'pending' && r.cloudId === r.id && r.title === '小星星', 'T1 非创作者一键发布进审核', JSON.stringify(r));

  // T2 已是创作者：跳过 /me/creator，仍 PUT + publish
  await setup();
  r = await pg.evaluate(async () => {
    if(document.getElementById('modal-mask')) closeModal();
    window.PYQ_CLOUD = true; ACCT = { id: 'u1', nickname: '谱友', role: 'creator' };
    localStorage.removeItem('musetab-library-v1'); localStorage.removeItem('musetab-circle-pub');
    loadSong(createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 }));
    song.title = '欢乐颂'; saveToLibrary();
    await new Promise(r => setTimeout(r, 60));
    window.__calls = [];
    const e = libLoad()[0];
    showPublishMenu(e, { left: 100, bottom: 100 });
    document.getElementById('pub-go').click();
    await new Promise(r => setTimeout(r, 160));
    return {
      noCreator: !window.__calls.some(c => c.url === '/api/me/creator'),
      pub: window.__calls.some(c => /\/publish$/.test(c.url) && c.method === 'POST'),
      done: !!document.getElementById('pd-ok'),          // 审核流：确认框给「知道了」而非公开链接
    };
  });
  T(r.noCreator && r.pub && r.done, 'T2 创作者提交审核', JSON.stringify(r));

  // T3 短/非法 id：发布前升级为云兼容 id，publish 与公开链接均用新 id
  await setup();
  r = await pg.evaluate(async () => {
    if(document.getElementById('modal-mask')) closeModal();
    window.PYQ_CLOUD = true; ACCT = { id: 'u1', nickname: '谱友', role: 'creator' };
    localStorage.setItem('musetab-library-v1', JSON.stringify([{ id: 'si0', title: '短id谱', updatedAt: '', mtime: 1000, data: { v: 3, title: '短id谱', id: 'si0', measures: [], tabVoices: ['T1'], voxVoices: ['V1'] } }]));
    localStorage.removeItem('musetab-circle-pub');
    const e = libLoad()[0];
    showPublishMenu(e, { left: 100, bottom: 100 });
    window.__calls = [];
    document.getElementById('pub-go').click();
    await new Promise(r => setTimeout(r, 160));
    const nid = libLoad()[0].id;
    const pubCall = window.__calls.find(c => /\/publish$/.test(c.url));
    const cp = circlePubs()[0];
    return {
      upgraded: nid !== 'si0' && /^[A-Za-z0-9_-]{8,40}$/.test(nid),
      pubId: pubCall ? pubCall.url === '/api/scores/' + nid + '/publish' : false,
      recId: !!(cp && cp.cloudId === nid),
    };
  });
  T(r.upgraded && r.pubId && r.recId, 'T3 短id升级后发布', JSON.stringify(r));

  // T4 未登录 / 预览环境（PYQ_CLOUD=false）：走本机演示，不触网，仅记录本地
  await setup();
  r = await pg.evaluate(async () => {
    if(document.getElementById('modal-mask')) closeModal();
    window.PYQ_CLOUD = false; ACCT = null;
    localStorage.removeItem('musetab-library-v1'); localStorage.removeItem('musetab-circle-pub');
    loadSong(createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 }));
    song.title = '本机谱'; saveToLibrary();
    await new Promise(r => setTimeout(r, 40));
    window.__calls = [];
    const e = libLoad()[0];
    showPublishMenu(e, { left: 100, bottom: 100 });
    document.getElementById('pub-go').click();
    await new Promise(r => setTimeout(r, 120));
    const cp = circlePubs()[0];
    return { noNet: window.__calls.length === 0, noDone: !document.getElementById('pd-url'), rec: !!(cp && cp.status === 'pending' && !cp.online) };
  });
  T(r.noNet && r.noDone && r.rec, 'T4 本机演示降级', JSON.stringify(r));

  // T5 发布接口报错：提示失败、按钮可再点、不弹成功框、本地不置 online
  await setup();
  r = await pg.evaluate(async () => {
    if(document.getElementById('modal-mask')) closeModal();
    window.PYQ_CLOUD = true; ACCT = { id: 'u1', nickname: '谱友', role: 'creator' }; window.__publishErr = true;
    localStorage.removeItem('musetab-library-v1'); localStorage.removeItem('musetab-circle-pub');
    loadSong(createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 }));
    song.title = '失败谱'; saveToLibrary();
    await new Promise(r => setTimeout(r, 60));
    const e = libLoad()[0];
    showPublishMenu(e, { left: 100, bottom: 100 });
    const btn = document.getElementById('pub-go');
    btn.click();
    await new Promise(r => setTimeout(r, 160));
    return { noDone: !document.getElementById('pd-url'), reenabled: !btn.disabled, noRec: circlePubs().length === 0 };
  });
  T(r.noDone && r.reenabled && r.noRec, 'T5 发布失败回滚', JSON.stringify(r));

  // T6 管理员发布免自审：服务端直接给 published → 弹公开链接框，本地记 approved/online
  await setup();
  r = await pg.evaluate(async () => {
    if(document.getElementById('modal-mask')) closeModal();
    window.PYQ_CLOUD = true; ACCT = { id: 'a1', nickname: '管理员', role: 'admin' };
    localStorage.removeItem('musetab-library-v1'); localStorage.removeItem('musetab-circle-pub');
    loadSong(createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 }));
    song.title = '管理员谱'; saveToLibrary();
    await new Promise(r => setTimeout(r, 60));
    window.__calls = [];
    const e = libLoad()[0];
    showPublishMenu(e, { left: 100, bottom: 100 });
    document.getElementById('pub-go').click();
    await new Promise(r => setTimeout(r, 160));
    const urlEl = document.getElementById('pd-url'); const cp = circlePubs()[0];
    return {
      noCreator: !window.__calls.some(c => c.url === '/api/me/creator'),   // admin 不该再去开创作者
      done: urlEl ? urlEl.value === 'https://puku.puyouquan.com/pub/' + e.id : false,
      online: !!(cp && cp.online), status: cp && cp.status,
    };
  });
  T(r.noCreator && r.done && r.online && r.status === 'approved', 'T6 管理员发布免自审', JSON.stringify(r));

  T(errs.length === 0, 'T7 全程无报错', errs.join('|') || 'none');

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
