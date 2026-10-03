/* v63.4 A7 度量地基（2026-10 评审团 §6.2 A7 / §9.1 关键事件清单；D-03 只用第一方）
   T1 关键事件覆盖率 100%：server.js EVENT_CLIENT 每个事件名在编辑器 / 官网 / 小程序代码里都有上报点（静态核对）
   T2 编辑器访问事件带首触来源（utm）与落地页
   T3 编辑器制谱与导出事件：配伴奏 arrange_done、织体 tex_gen、换调 transpose、导入 import_done（带 beatErrors）、
      打印 print_dialog、导出 export_png / export_mxl / export_mid / export_icard、登录弹窗 signup_prompt
   T4 传播：分享卡二维码链接带 ?f=card；带 ?f= 打开观看页记 share_open
   T5 官网：每页 visit（带站外 referrer）、垂类页 landing_view、去制谱器的链接 cta_click、谱库零结果搜索 zero_result（带词、只记一次）
   T6 课程：course_view、?s= 深链 lesson_deeplink（并定位到该节）、小节过关 lesson_done
   突变实证：对 v63.4 之前的文件复跑（MUSETAB_URL/MUSETAB_SITE 指向旧文件），T1–T6 全部报红（0/6）。 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
/* 编辑器文件：MUSETAB_URL=file://… 时读该文件（突变跑用），否则读仓库里的 index.html */
const ED = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');
const readEd = () => fs.readFileSync(ED, 'utf8');
const readSite = f => fs.readFileSync(path.join(SITE, f), 'utf8');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const SCORE = { v: 3, title: '分享测试', key: 'C', beats: 4, unit: 4, tempo: 90, tabVoices: [], voxVoices: ['旋律'], lyricLines: 1,
    measures: [{ tabs: [], voxes: [[1, 2, 3, 5].map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false }))] }] };
  /* 统一路由：zhipu / puku 都给编辑器单文件，www 给官网；/api/events 收集请求体，其余 API 给最小桩 */
  const mk = async (url, opts) => {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    pg._ev = [];
    await pg.route(/https:\/\/(zhipu|puku|www)\.puyouquan\.com\/.*/, route => {
      const u = new URL(route.request().url()), p = u.pathname, host = u.hostname.split('.')[0];
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (p === '/api/events') { try { pg._ev.push(JSON.parse(route.request().postData() || '{}')); } catch (_) {} return J({ ok: true }); }
      if (p === '/api/me') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (/^\/api\/pub\/scores\/[^/]+$/.test(p)) return J({ score: { id: p.split('/').pop(), title: '分享测试', author: '测试', data: SCORE } });
      if (p === '/api/pub/scores') return J({ scores: [{ id: 'seedaaaa0001', title: '小星星', singer: '儿歌', author: '谱友圈官方', type: 'vocal', measures: 4 }], total: 1 });
      if (p.startsWith('/api/')) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"x"}' });
      if (host !== 'www') return route.fulfill({ status: 200, contentType: 'text/html', body: readEd() });
      const f = p === '/' ? 'index.html' : p.slice(1);
      if (fs.existsSync(path.join(SITE, f))) return route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html', body: readSite(f) });
      return route.fulfill({ status: 404, body: '' });
    });
    await pg.goto(url, opts || {}); await pg.waitForTimeout(1200);
    return pg;
  };
  const names = pg => pg._ev.map(e => e.name);
  const find = (pg, n) => pg._ev.filter(e => e.name === n);

  /* ---------- T1 静态覆盖 ---------- */
  {
    const srv = fs.readFileSync(path.join(ROOT, 'api/server.js'), 'utf8');
    const m = /const EVENT_CLIENT = \[([\s\S]*?)\];/.exec(srv);
    const list = m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]) : [];
    const code = readEd() + fs.readdirSync(SITE).filter(f => /\.(html|js)$/.test(f)).map(readSite).join('\n')
      + ['utils/login.js', 'pages/index/index.js', 'pages/score/score.js'].map(f => fs.readFileSync(path.join(ROOT, 'miniprogram', f), 'utf8')).join('\n');
    const LEGACY = ['export'];   // 旧客户端仍可能上报的别名，新代码不再发
    const miss = list.filter(n => !LEGACY.includes(n) && !new RegExp("(pyqEvent|PYQ_EV\\.send|\\bsend|track)\\('" + n + "'").test(code));
    T(list.length >= 25 && miss.length === 0, 'T1 关键事件覆盖率 100%（白名单每个事件都有上报点）', JSON.stringify({ n: list.length, miss }));
  }

  /* ---------- T2 / T3 编辑器 ---------- */
  {
    const pg = await mk('https://zhipu.puyouquan.com/?utm_source=bd&utm_medium=cpc&utm_campaign=kb');
    const v = find(pg, 'visit')[0] || {};
    T(v.src === 'utm:bd/cpc/kb' && /^zhipu\//.test(v.landing || ''), 'T2 编辑器 visit 带首触来源与落地页', JSON.stringify(v));
    await pg.evaluate(`(()=>{ window.SF_PLAYWAIT=false; guardReplace=(p)=>p(); hideStartPad();
      const s=createSong('vox',{title:'旋律',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:1}); s.measures.forEach(m=>m.voxes[0].forEach((c,i)=>{ c.deg=[1,3,5,1][i]; })); loadSong(s); })()`);
    await pg.evaluate(`document.getElementById('b-arrange').onclick()`); await pg.waitForTimeout(80);
    await pg.evaluate(`document.getElementById('arr-go').click()`); await pg.waitForTimeout(300);
    await pg.evaluate(`(()=>{ const s=createSong('pianoacc',{title:'织体',key:'C',beats:4,unit:4,nMea:2}); s.measures.forEach(m=>{ m.voxes[0][0].chord='C'; }); loadSong(s); })()`);
    await pg.evaluate(`document.getElementById('b-acctex').onclick()`); await pg.waitForTimeout(80);
    await pg.evaluate(`document.getElementById('tex-go').click()`); await pg.waitForTimeout(150);
    await pg.evaluate(`stepKey(1)`); await pg.waitForTimeout(80);
    /* 导入：走新建向导的 MusicXML 入口（真实文件选择） */
    const xml = '<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>m</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
      + ['C', 'D', 'E', 'F'].map(s => `<note><pitch><step>${s}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('') + '</measure></part></score-partwise>';
    await pg.evaluate(`showNewWizard()`); await pg.waitForTimeout(100);
    await pg.setInputFiles('#nw-mxlfile', { name: 't.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) }).catch(e => errs.push('FILE:' + e.message));
    await pg.waitForTimeout(400);
    await pg.evaluate(`(()=>{ window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint')); })()`); await pg.waitForTimeout(80);
    for (const id of ['ex-png', 'ex-mxl', 'ex-mid', 'ex-icard']) {
      await pg.evaluate(`document.getElementById('b-print').onclick()`); await pg.waitForTimeout(60);
      await pg.evaluate(`(document.getElementById('${id}')||{click(){}}).click()`); await pg.waitForTimeout(150);
    }
    await pg.evaluate(`(()=>{ closeModal(); openLogin({hint:'登录后即可发布'}); })()`); await pg.waitForTimeout(80);
    const n = names(pg), imp = find(pg, 'import_done')[0] || {};
    const want = ['arrange_done', 'tex_gen', 'transpose', 'import_done', 'print_dialog', 'export_png', 'export_mxl', 'export_mid', 'export_icard', 'signup_prompt'];
    const miss = want.filter(x => !n.includes(x));
    T(miss.length === 0 && /^mxl:be0$/.test(imp.meta || ''), 'T3 编辑器制谱/导出/登录事件齐全（导入带 beatErrors）', JSON.stringify({ miss, imp: imp.meta, got: [...new Set(n)] }));
    await pg.close();
  }

  /* ---------- T4 传播 ---------- */
  {
    const pg = await mk('https://puku.puyouquan.com/kanpu.html?pub=sharetest01&f=card');
    const so = find(pg, 'share_open')[0] || {};
    const qr = await pg.evaluate(`typeof shareCardURL==='function'? shareCardURL() : ''`).catch(() => '');
    T(so.meta === 'card:sharetest01' && /\/pub\/sharetest01\?f=card$/.test(qr), 'T4 分享卡链接带 ?f=card、带 ?f= 打开观看页记 share_open', JSON.stringify({ so: so.meta, qr }));
    await pg.close();
  }

  /* ---------- T5 官网 ---------- */
  {
    const pg = await mk('https://www.puyouquan.com/kaobian.html', { referer: 'https://www.baidu.com/s?wd=考编伴奏' });
    const v = find(pg, 'visit')[0] || {}, lv = find(pg, 'landing_view')[0] || {};
    await pg.evaluate(() => { const a = [...document.querySelectorAll('a[href*="zhipu.puyouquan.com"]')][0]; if (a) { a.addEventListener('click', e => e.preventDefault()); a.click(); } });
    await pg.waitForTimeout(100);
    const cta = find(pg, 'cta_click')[0] || {};
    const pg2 = await mk('https://www.puyouquan.com/');
    await pg2.fill('#lib-q', '一首根本不存在的歌').catch(() => {}); await pg2.waitForTimeout(500);
    await pg2.fill('#lib-q', '一首根本不存在的歌 ').catch(() => {}); await pg2.waitForTimeout(500);
    const zr = find(pg2, 'zero_result');
    T(v.meta === 'kaobian' && v.src === 'ref:www.baidu.com' && /^www\/kaobian\.html$/.test(v.landing || '') && lv.meta === 'kaobian'
      && /^kaobian:/.test(cta.meta || '') && zr.length === 1 && zr[0].meta === '一首根本不存在的歌',
      'T5 官网 visit/landing_view/cta_click/zero_result（零结果同词只记一次）', JSON.stringify({ v, lv: lv.meta, cta: cta.meta, zr: zr.map(x => x.meta) }));
    await pg.close(); await pg2.close();
  }

  /* ---------- T6 课程 ---------- */
  {
    const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'api/seed-courses.json'), 'utf8'));
    const jc = seed.find(c => c.id === 'course-jianpu-renshi'); const s0 = jc.data.chapters[0].sections[1];
    const pg = await mk('https://www.puyouquan.com/kecheng.html?c=course-jianpu-renshi&s=' + s0.sid);
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(async (sid) => {
      const wait = ms => new Promise(r2 => setTimeout(r2, ms));
      const card = document.querySelector('.kcs[data-sk="' + sid + '"]'); const rect = card ? card.getBoundingClientRect() : null;
      const its = JSON.parse(document.getElementById('kc-data').textContent).find(c => c.id === 'course-jianpu-renshi').data.chapters[0].sections[1].test.items;
      const btn = document.querySelector('[data-sectest="' + sid + '"]'); if (!btn) return { err: 'no test' };
      btn.click(); await wait(40);
      const host = document.querySelector('[data-thost="' + sid + '"]');
      for (let k = 0; k < its.length; k++) { host.querySelector('.kcq-opt[data-oi="' + its[k].a + '"]').click(); await wait(15); host.querySelector('[data-next]').click(); await wait(15); }
      return { open: !!(card && card.classList.contains('is-open')), top: rect ? Math.round(rect.top) : null };
    }, s0.sid).catch(e => ({ err: e.message }));
    await pg.waitForTimeout(100);
    const cv = find(pg, 'course_view'), dl = find(pg, 'lesson_deeplink')[0] || {}, ld = find(pg, 'lesson_done')[0] || {};
    T(cv.length === 1 && cv[0].meta === 'course-jianpu-renshi' && dl.meta === 'course-jianpu-renshi:' + s0.sid && r.open
      && new RegExp('^course-jianpu-renshi:' + s0.sid + ':5$').test(ld.meta || ''),
      'T6 课程 course_view（只记一次）/ ?s= 深链定位并记 lesson_deeplink / 过关 lesson_done', JSON.stringify({ cv: cv.map(x => x.meta), dl: dl.meta, ld: ld.meta, r }));
    await pg.close();
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
