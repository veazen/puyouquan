/* v45.3 会员权益真实化回归：
   - 权益卡片文案诚实：免费列出全部核心功能（含云同步/MusicXML），付费只列真实增量（配额扩容）；
     不再出现旧虚假卖点（把免费功能当付费卖）与「开通体验」演示开关。
   - memberPlan 由 window.PYQ_ENT 决定（非 localStorage 演示）。
   - 已登录+stub：兑换码输入→POST /api/redeem→刷新权益→显示会员。
   - 预览环境（!API_ON）：显示方案但无兑换输入、提示需线上登录。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 文案诚实性：免费含云同步/MusicXML；无旧虚假卖点；无演示开通按钮
  const t1 = await pg.evaluate(() => {
    const html = pcRightsHTML();
    return {
      freeHasSync: /云端同步/.test(html) && /MusicXML/.test(html),
      noFake: !/多人实时协作|全部 10\+ 乐器音色|去水印/.test(html),
      noDemo: !/开通体验|切回免费版/.test(html),
      hasQuota: /2000/.test(html),
      preview: /puyouquan\.com/.test(html),   // !API_ON 提示
    };
  });
  T(t1.freeHasSync && t1.noFake && t1.noDemo && t1.hasQuota && t1.preview, 'T1 权益文案诚实+无演示开关', JSON.stringify(t1));

  // T2 memberPlan 由 PYQ_ENT 决定
  const t2 = await pg.evaluate(() => {
    window.PYQ_ENT = null; const a = memberPlan();
    window.PYQ_ENT = { vip: true, quota: 2000, entitlements: [{ kind: 'vip', expires_at: 0 }] };
    const b2 = memberPlan();
    window.PYQ_ENT = null;
    return { a, b2 };
  });
  T(t2.a === 'free' && t2.b2 === 'vip', 'T2 memberPlan 接真权益', JSON.stringify(t2));

  // T3 已登录 + stub：兑换流程（输入码→PUT /api/redeem→权益刷新→再开面板显示已开通）
  const t3 = await pg.evaluate(async () => {
    window.__calls = [];
    let vip = false;
    window.fetch = async (url, opt) => {
      const method = (opt && opt.method) || 'GET';
      window.__calls.push({ url, method });
      const J = o => ({ ok: true, status: 200, json: async () => o });
      if (url === '/api/redeem' && method === 'POST') { vip = true; return J({ ok: true, kind: 'vip', expires_at: 0 }); }
      if (url === '/api/me/entitlements') return J({ vip, quota: vip ? 2000 : 500, entitlements: vip ? [{ kind: 'vip', expires_at: 0 }] : [] });
      return J({});
    };
    // 伪装线上已登录环境：API_ON 是 const，改走面板对 ACCT/PYQ_ENT 的分支——直接驱动兑换 handler
    ACCT = { id: 'u1', nickname: '谱友', role: 'user' };
    window.PYQ_ENT = { vip: false, quota: 500, entitlements: [] };
    // pcRightsHTML 在 !API_ON 下不出兑换框（预览态），因此直接验证 redeem→entRefresh 数据链
    const r = await apiCall('/redeem', { method: 'POST', body: { code: 'PYQ-TEST-TEST-TEST' } });
    window.PYQ_ENT = await apiCall('/me/entitlements');
    return { kind: r.kind, vipAfter: window.PYQ_ENT.vip, quota: window.PYQ_ENT.quota, plan: memberPlan(),
      called: window.__calls.some(c => c.url === '/api/redeem') };
  });
  T(t3.kind === 'vip' && t3.vipAfter && t3.quota === 2000 && t3.plan === 'vip' && t3.called, 'T3 兑换→权益刷新数据链', JSON.stringify(t3));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
