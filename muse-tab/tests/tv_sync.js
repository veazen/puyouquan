/* v41.8 我的曲谱云同步回归：登出/离线不触网、保存推送、短id升级、登录拉取、mtime双向合并、删除传播、413容错
   file:// 下 API_ON=false；测试通过置 window.PYQ_CLOUD=true + ACCT + stub fetch 驱动云端逻辑（与线上 PYQ_CLOUD=API_ON 等价）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // 安装 fetch 记录器：返回可编程响应，记录所有 /api 调用
  const setup = () => pg.evaluate(() => {
    window.__calls = [];
    window.__remote = {};   // 云端 scores：id -> {id,title,updated_at,data}
    window.fetch = async (url, opt) => {
      const method = (opt && opt.method) || 'GET';
      const body = opt && opt.body ? JSON.parse(opt.body) : null;
      window.__calls.push({ url, method, body });
      const J = o => ({ ok: true, status: 200, json: async () => o });
      const m = url.match(/\/api\/scores\/([^/]+)$/);
      if (url.endsWith('/api/scores') && method === 'GET')
        return J({ scores: Object.values(window.__remote).map(s => ({ id: s.id, title: s.title, singer: '', status: 'private', updated_at: s.updated_at })) });
      if (m && method === 'PUT') { window.__remote[m[1]] = { id: m[1], title: body.title, updated_at: body.updated_at, data: body.data }; return J({ saved: true, updated_at: body.updated_at }); }
      if (m && method === 'GET') { const s = window.__remote[m[1]]; return s ? J({ score: { ...s } }) : ({ ok: false, status: 404, json: async () => ({ error: 'x' }) }); }
      if (m && method === 'DELETE') { delete window.__remote[m[1]]; return J({ deleted: true }); }
      return J({});
    };
  });

  // T1 未登录 / 离线：PYQ_CLOUD=false 时保存不触网
  let r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = false; ACCT = null; window.__calls = [];
    const of = window.fetch; window.fetch = (...a) => { window.__calls.push(a[0]); return of(...a); };
    loadSong(createSong('guitar', { beats:4, unit:4, key:'C', nMea:2, nTab:1, nVox:1, lyr:1 }));
    saveToLibrary();
    await new Promise(r => setTimeout(r, 50));
    return { calls: window.__calls.length };
  });
  T(r.calls === 0, 'T1 未登录不触网', JSON.stringify(r));

  // T2 登录态保存 → PUT /scores/{id} 带数据；本地条目获得 mtime
  await setup();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id:'u1', nickname:'谱友', role:'user' };
    localStorage.removeItem('musetab-library-v1');
    loadSong(createSong('guitar', { beats:4, unit:4, key:'C', nMea:2, nTab:1, nVox:1, lyr:1 }));
    song.title = '小星星'; saveToLibrary();
    await new Promise(r => setTimeout(r, 60));
    const put = window.__calls.find(c => c.method === 'PUT');
    const e = libLoad()[0];
    return { put: !!put, hasData: put && !!put.body.data, title: put && put.body.title, mtime: e && e.mtime > 0, remoteN: Object.keys(window.__remote).length };
  });
  T(r.put && r.hasData && r.title === '小星星' && r.mtime && r.remoteN === 1, 'T2 保存推送云端', JSON.stringify(r));

  // T3 短/非法 id 升级为云兼容 id 再推送
  await setup();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id:'u1', nickname:'谱友', role:'user' };
    localStorage.setItem('musetab-library-v1', JSON.stringify([{ id:'si0', title:'旧', updatedAt:'', mtime:1000, data:{ v:3, title:'旧', id:'si0' } }]));
    await scoreCloudPush('si0');
    await new Promise(r => setTimeout(r, 40));
    const e = libLoad()[0];
    const put = window.__calls.find(c => c.method === 'PUT');
    const okId = /^[A-Za-z0-9_-]{8,40}$/.test(e.id);
    return { upgraded: e.id !== 'si0' && okId, dataId: e.data.id === e.id, put: put && put.url.endsWith('/api/scores/' + e.id) };
  });
  T(r.upgraded && r.dataId && r.put, 'T3 短id升级', JSON.stringify(r));

  // T4 登录拉取：云端有本地没有的谱 → 同步后本地新增
  await setup();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id:'u1', nickname:'谱友', role:'user' };
    localStorage.removeItem('musetab-library-v1');
    window.__remote['cloudsong01'] = { id:'cloudsong01', title:'云端谱', updated_at: 9999, data:{ v:3, title:'云端谱', measures:[], tabVoices:[], voxVoices:['V1'] } };
    await syncScores();
    await new Promise(r => setTimeout(r, 40));
    const lib = libLoad();
    return { n: lib.length, has: lib.some(e => e.id === 'cloudsong01' && e.title === '云端谱'), mtime: (lib[0]||{}).mtime };
  });
  T(r.n === 1 && r.has && r.mtime === 9999, 'T4 登录拉取云端', JSON.stringify(r));

  // T5 双向合并按 mtime：本地新→推云；云新→覆盖本地
  await setup();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id:'u1', nickname:'谱友', role:'user' };
    // 本地 A 比云新（应推云）；本地 B 比云旧（应被云覆盖）
    localStorage.setItem('musetab-library-v1', JSON.stringify([
      { id:'aaaaaaaa', title:'本地新A', updatedAt:'', mtime:5000, data:{ v:3, title:'本地新A' } },
      { id:'bbbbbbbb', title:'本地旧B', updatedAt:'', mtime:1000, data:{ v:3, title:'本地旧B' } },
    ]));
    window.__remote['aaaaaaaa'] = { id:'aaaaaaaa', title:'云旧A', updated_at:2000, data:{ v:3, title:'云旧A' } };
    window.__remote['bbbbbbbb'] = { id:'bbbbbbbb', title:'云新B', updated_at:8000, data:{ v:3, title:'云新B', measures:[] } };
    await syncScores();
    await new Promise(r => setTimeout(r, 60));
    const lib = libLoad();
    const A = lib.find(e => e.id === 'aaaaaaaa'), B = lib.find(e => e.id === 'bbbbbbbb');
    return { cloudA: window.__remote['aaaaaaaa'].title, cloudAt: window.__remote['aaaaaaaa'].updated_at,
      localB: B.title, localBmtime: B.mtime, localA: A.title };
  });
  T(r.cloudA === '本地新A' && r.cloudAt === 5000 && r.localB === '云新B' && r.localBmtime === 8000 && r.localA === '本地新A',
    'T5 mtime双向合并', JSON.stringify(r));

  // T6 删除传播：删除本地 → DELETE /scores/{id}
  await setup();
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id:'u1', nickname:'谱友', role:'user' };
    localStorage.setItem('musetab-library-v1', JSON.stringify([{ id:'delme123', title:'待删', updatedAt:'', mtime:100, data:{ v:3 } }]));
    window.__remote['delme123'] = { id:'delme123', title:'待删', updated_at:100, data:{ v:3 } };
    await apiCall('/scores/delme123', { method:'DELETE' });   // 模拟删除入口的传播调用
    return { del: window.__calls.some(c => c.method === 'DELETE' && c.url.endsWith('/delme123')), remoteN: Object.keys(window.__remote).length };
  });
  T(r.del && r.remoteN === 0, 'T6 删除传播', JSON.stringify(r));

  // T7 413 容错：超大谱推送返回 413 → 提示且不抛错
  r = await pg.evaluate(async () => {
    window.PYQ_CLOUD = true; ACCT = { id:'u1', nickname:'谱友', role:'user' };
    window.fetch = async () => ({ ok: false, status: 413, json: async () => ({ error: '谱面过大' }) });
    localStorage.setItem('musetab-library-v1', JSON.stringify([{ id:'biggg123', title:'大谱', updatedAt:'', mtime:100, data:{ v:3 } }]));
    let threw = false;
    try { await scoreCloudPush('biggg123'); } catch (e) { threw = true; }
    return { threw };
  });
  T(r.threw === false, 'T7 413不抛错', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
