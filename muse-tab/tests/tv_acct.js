/* v41.7 账号系统回归：降级提示 / 登录弹窗 / 手机校验 / 登录成功 / 账号卡渲染 / 创作者按钮
   API_ON 由 hostname 决定（file:// 下为 false）；需 API_ON=true 的分支用 stub fetch + 直接调用全局函数验证。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 file:// 下 API_ON=false：个人中心独立页（v59.0）页头含降级提示、无登录按钮，本地资料表单可用
  let r = await pg.evaluate(() => {
    openPersonal('profile');
    const pc = document.getElementById('pcenter');
    return { apiOn: API_ON, open: !!pc, hint: document.getElementById('pcx-hero').innerHTML.includes('puyouquan.com'),
      noLogin: !document.getElementById('acct-login'), hasProfile: !!document.getElementById('pc-name') };
  });
  T(r.apiOn === false && r.open && r.hint && r.noLogin && r.hasProfile, 'T1 本机降级提示（独立页）', JSON.stringify(r));

  // T2 openLogin 弹窗结构完整
  r = await pg.evaluate(() => {
    openLogin();
    return { phone: !!document.getElementById('lg-phone'), code: !!document.getElementById('lg-code'),
      send: !!document.getElementById('lg-send'), go: !!document.getElementById('lg-go') };
  });
  T(r.phone && r.code && r.send && r.go, 'T2 登录弹窗结构', JSON.stringify(r));

  // T3 手机号校验：非法号码点「获取验证码」→ 提示错误且不发请求
  r = await pg.evaluate(async () => {
    let called = 0; const of = window.fetch; window.fetch = () => { called++; return of.apply(window, arguments); };
    openLogin(); (document.getElementById('lg-agree')||{}).checked=true; 
    document.getElementById('lg-phone').value = '123';
    document.getElementById('lg-send').click();
    await new Promise(r => setTimeout(r, 50));
    const msg = document.getElementById('lg-msg').textContent;
    window.fetch = of;
    return { msg, called };
  });
  T(/手机号/.test(r.msg) && r.called === 0, 'T3 手机号校验拦截', JSON.stringify(r));

  // T3x v62.9 A4 ①：协议勾选默认不勾；不勾选时「获取验证码」只提示、不发请求
  r = await pg.evaluate(async () => {
    let called = 0; const of = window.fetch; window.fetch = () => { called++; return of.apply(window, arguments); };
    openLogin();
    const box = document.getElementById('lg-agree');
    document.getElementById('lg-phone').value = '13800000000';
    document.getElementById('lg-send').click();
    await new Promise(r => setTimeout(r, 50));
    const msg = document.getElementById('lg-msg').textContent;
    window.fetch = of; closeModal();
    return { has: !!box, def: box ? box.checked : null, msg, called };
  });
  T(r.has && r.def === false && /同意/.test(r.msg) && r.called === 0, 'T3x 协议默认不勾、不勾选不发验证码', JSON.stringify(r));

  // T4 stub fetch 走通「发送验证码 → 登录」：ACCT 落地、账号卡显示昵称与退出
  r = await pg.evaluate(async () => {
    window.fetch = async (url, opt) => {
      const body = opt && opt.body ? JSON.parse(opt.body) : {};
      const J = o => ({ ok: true, status: 200, json: async () => o });
      if (url.endsWith('/auth/sms/send')) return J({ sent: true, dev_code: '123456' });
      if (url.endsWith('/auth/sms/verify')) return J({ user: { id: 'u1', phone: '138****0000', nickname: '谱友0000', role: 'user' }, is_new: true });
      return J({});
    };
    openLogin(); (document.getElementById('lg-agree')||{}).checked=true; 
    document.getElementById('lg-phone').value = '13800000000';
    document.getElementById('lg-send').click();
    await new Promise(r => setTimeout(r, 60));
    document.getElementById('lg-code').value = '123456';
    document.getElementById('lg-go').click();
    await new Promise(r => setTimeout(r, 80));
    return { acct: ACCT, cache: JSON.parse(localStorage.getItem('musetab-acct') || 'null') };
  });
  T(r.acct && r.acct.id === 'u1' && r.cache && r.cache.nickname === '谱友0000', 'T4 登录落地', JSON.stringify(r.acct));

  // T5 登录后账号态（模拟 API_ON 路径）：v59.0 页头渲染函数与账号操作函数完备（file:// 下 API_ON=false 短路为提示）
  r = await pg.evaluate(() => {
    const A = ACCT;
    return { hasFn: typeof pcxHeroHTML === 'function' && typeof acctLogout === 'function' && typeof acctBecomeCreator === 'function'
        && typeof enterPersonal === 'function' && typeof exitPersonal === 'function',
      role: A && A.role, nick: A && A.nickname };
  });
  T(r.hasFn && r.role === 'user' && r.nick === '谱友0000', 'T5 账号态与函数完备', JSON.stringify(r));

  // T6 退出登录：acctSave(null) 清缓存
  r = await pg.evaluate(async () => {
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await acctLogout();
    return { acct: ACCT, cache: localStorage.getItem('musetab-acct') };
  });
  T(r.acct === null && r.cache === null, 'T6 退出清账号', JSON.stringify(r));

  // T7 既有键零污染：账号系统只新增 musetab-acct，未触碰 profile/lib 等既有键
  r = await pg.evaluate(() => {
    localStorage.setItem('musetab-profile', JSON.stringify({ name: '既有' }));
    acctSave({ id: 'x', phone: '1', nickname: 'n', role: 'user' });
    acctSave(null);
    return { profile: JSON.parse(localStorage.getItem('musetab-profile') || '{}').name };
  });
  T(r.profile === '既有', 'T7 既有键零污染', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
