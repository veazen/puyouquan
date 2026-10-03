/* v63.3 A5 内容纠错（二）：课程与文案（2026-10 评审团 §6.2 A5 ④–⑨；P1-33 / P2-65 种子题 / P2-73 S 级勘误 / P2-40 / P2-24 文案 / P3-28 / P2-69 种子谱）
   T1 文案禁止词 lint 0 命中（deploy/check-wording.js：编辑器＋官网用户可见文字，排除注释与更新日志历史）
   T2 课程测验每次出题打乱选项：同一题多次出题顺序不止一种；按钮 data-oi 仍是原索引；答错时「正确答案是 X」的 X 与屏上字母一致
   T3 通关最后一章不再提示「第 N+1 章已解锁」
   T4 课程页 Esc 监听不随重绘叠加（打卡/撤销反复重绘后 keydown 监听数不增长）
   T5 《认识简谱》S 级勘误落到种子：1=G 不再说「每个音都升高」、「单独一个数字＝一拍」限定拍号、53231323 时值、「1 - .」写法；
      「一小节要凑满」挪到第 5 章（拍号之后，sid 不变）；种子题答案位置均衡（任一位置 ≤40%）；kecheng.html 内嵌与种子逐字段一致
   T6 已发布课程保存的回执如实（kcadmin：「学员立即看到」/「草稿（未发布）」两种口径，不再一律「已保存草稿」）
   T7 课程「互动谱」卡只给曲名时，点击按曲名到谱库找同名谱直达观看页（找不到才落到搜索页）
   突变实证：对 v63.3 之前的文件复跑，T1–T7 全部报红（0/7）。 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), cp = require('child_process');
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');
const ROOT = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const mkPage = async (page) => {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    /* 统计 document 上的 keydown 监听注册次数（T4） */
    await pg.addInitScript(() => {
      window.__kd = 0; const add = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function (t, f, o) { if (t === 'keydown') window.__kd++; return add.call(this, t, f, o); };
    });
    await pg.route('https://www.puyouquan.com/**', route => {
      const p = new URL(route.request().url()).pathname;
      if (p.startsWith('/api/')) return route.fulfill({ status: 404, body: '' });   // 课程走内嵌种子兜底
      const f = p === '/' ? 'index.html' : p.slice(1);
      if (fs.existsSync(path.join(SITE, f))) {
        const ct = /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html';
        return route.fulfill({ status: 200, contentType: ct, body: read(f) });
      }
      return route.fulfill({ status: 404, body: '' });
    });
    await pg.goto('https://www.puyouquan.com/' + page); await pg.waitForTimeout(700);
    return pg;
  };

  /* ---------- T1 文案 lint ---------- */
  {
    let out = '', code = 0;
    try { out = cp.execFileSync('node', [path.join(ROOT, 'deploy/check-wording.js')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status || 1; out = String(e.stderr || '') + String(e.stdout || ''); }
    T(code === 0 && /0 命中/.test(out), 'T1 文案禁止词 lint 0 命中', code ? out.split('\n').slice(-2).join(' ') : 'ok');
  }

  /* ---------- T2 / T3 / T4 课程页 ---------- */
  {
    const pg = await mkPage('kecheng.html?c=course-jianpu-renshi');
    const r = await pg.evaluate(async () => {
      const out = {}; const wait = ms => new Promise(r2 => setTimeout(r2, ms));
      const data = JSON.parse(document.getElementById('kc-data').textContent);
      const jc = data.find(c => c.id === 'course-jianpu-renshi');
      const chs = jc.data.chapters; const allK = chs.flatMap(ch => (ch.sections || []).map(s => s.sid));
      const det = document.querySelector('.kc-detail'); if (!det) return { err: 'no detail' };
      const K0 = allK[0], it0 = chs[0].sections[0].test.items[0];
      /* T2 同一题出 15 次 */
      const orders = new Set(); let keyOk = true;
      for (let n = 0; n < 15; n++) {
        const btn = document.querySelector('[data-sectest="' + K0 + '"]'); if (!btn) return { err: 'no sectest' };
        btn.click(); await wait(20);
        const host = document.querySelector('[data-thost="' + K0 + '"]');
        const opts = [...host.querySelectorAll('.kcq-opt')];
        orders.add(opts.map(o => o.getAttribute('data-oi')).join(''));
        if (n === 0) {   /* 答错：正确答案字母＝屏上该选项的字母 */
          const wrong = opts.find(o => +o.getAttribute('data-oi') !== it0.a); wrong.click(); await wait(20);
          const right = opts.find(o => +o.getAttribute('data-oi') === it0.a);
          const letter = (right.querySelector('.kcq-key') || {}).textContent;
          keyOk = (host.querySelector('.kcq-why') || {}).textContent.indexOf('正确答案是 ' + letter) >= 0;
        }
      }
      out.orders = orders.size; out.keyOk = keyOk;
      /* T4 反复重绘（打卡/撤销）后 keydown 监听数不增长 */
      const kd0 = window.__kd;
      for (let n = 0; n < 4; n++) {
        const ck = document.querySelector('.kc-detail [data-checkin]'); if (ck) { ck.click(); await wait(80); }
        const un = document.querySelector('.kc-detail [data-undo]'); if (un) { un.click(); await wait(80); }
      }
      out.kdGrow = window.__kd - kd0;
      /* T3 前五章与末章前几节全满星 → 做末章最后一节 */
      const ls = JSON.parse(localStorage.getItem('pyq-learn-v1') || '{}'); const m = ls['sec:' + jc.id] = ls['sec:' + jc.id] || {};
      const lastK = allK[allK.length - 1];
      allK.forEach(k => { if (k !== lastK) m[k] = { stars: 5, days: [] }; });
      localStorage.setItem('pyq-learn-v1', JSON.stringify(ls));
      location.reload(); return out;
    }).catch(e => ({ err: e.message }));
    await pg.waitForTimeout(900);
    const r3 = await pg.evaluate(async () => {
      const wait = ms => new Promise(r2 => setTimeout(r2, ms));
      const data = JSON.parse(document.getElementById('kc-data').textContent);
      const jc = data.find(c => c.id === 'course-jianpu-renshi'); const chs = jc.data.chapters;
      const last = chs[chs.length - 1].sections.slice(-1)[0]; const its = last.test.items;
      const btn = document.querySelector('[data-sectest="' + last.sid + '"]'); if (!btn) return { err: 'no last sectest' };
      btn.click(); await wait(40);
      const host = document.querySelector('[data-thost="' + last.sid + '"]');
      for (let k = 0; k < its.length; k++) {
        host.querySelector('.kcq-opt[data-oi="' + its[k].a + '"]').click(); await wait(15);
        host.querySelector('[data-next]').click(); await wait(15);
      }
      await wait(40);
      return { h4: (host.querySelector('.kcq-res h4') || {}).textContent || '', nCh: chs.length };
    }).catch(e => ({ err: e.message }));
    T(!r.err && r.orders >= 2 && r.keyOk, 'T2 测验每次出题打乱选项、答案字母与屏上一致（15 次出题的不同顺序数）', JSON.stringify({ orders: r.orders, keyOk: r.keyOk, err: r.err }));
    T(!r3.err && r3.h4 && !/章已解锁/.test(r3.h4), 'T3 通关最后一章不提示「第 N+1 章已解锁」', JSON.stringify(r3));
    T(!r.err && r.kdGrow === 0, 'T4 课程页重绘不叠加 Esc 监听', JSON.stringify({ kdGrow: r.kdGrow }));
    await pg.close();
  }

  /* ---------- T7 互动谱卡直达同名谱 ---------- */
  {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR7:' + e.message));
    await pg.route('https://www.puyouquan.com/**', route => {
      const u = new URL(route.request().url()), p = u.pathname;
      if (p === '/api/pub/scores') return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ q: u.searchParams.get('q'), total: 2, scores: [
          { id: 'userxmas001', title: '小星星（改编）', author: '网友' }, { id: 'seedabc12345', title: '小星星', author: '谱友圈官方' }] }) });
      if (p === '/blank.html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body><div id="h"></div></body>' });
      if (p === '/pyq.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: read('pyq.js') });
      return route.fulfill({ status: 404, body: '' });
    });
    await pg.goto('https://www.puyouquan.com/blank.html');
    await pg.addScriptTag({ url: 'https://www.puyouquan.com/pyq.js' }).catch(e => errs.push('LOAD7:' + e.message));
    const r = await pg.evaluate(async () => {
      let opened = null; window.open = () => { const w = { closed: false, location: { set href(v) { opened = v; } } }; return w; };
      document.getElementById('h').innerHTML = PYQ_KC.blockHtml({ t: 'score', q: '小星星', title: '《小星星》' });
      const a = document.querySelector('a.lb-score'); const href0 = a.getAttribute('href');
      a.click(); await new Promise(r2 => setTimeout(r2, 300));
      return { href0, scq: a.getAttribute('data-scq'), opened };
    }).catch(e => ({ err: e.message }));
    T(!r.err && /index\.html\?q=/.test(r.href0) && r.opened && /kanpu\.html\?pub=seedabc12345/.test(r.opened),
      'T7 课程互动谱卡直达同名谱观看页（不再停在搜索页）', JSON.stringify(r));
    await pg.close();
  }

  /* ---------- T5 种子勘误 ---------- */
  {
    const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'api/seed-courses.json'), 'utf8'));
    const jc = seed.find(c => c.id === 'course-jianpu-renshi'); const s = JSON.stringify(jc);
    const chs = jc.data.chapters;
    const ch5 = (chs[4].sections || []).map(x => x.sid), ch3 = (chs[2].sections || []).map(x => x.sid);
    const pos = {}; let n = 0;
    seed.forEach(c => (c.data.chapters || []).forEach(ch => {
      const qs = [...(ch.quiz || []), ...(ch.sections || []).flatMap(x => ((x.test || {}).items) || [])];
      qs.forEach(q => { pos[q.a] = (pos[q.a] || 0) + 1; n++; });
    }));
    const maxShare = Math.max(...Object.values(pos)) / n;
    const emb = JSON.parse(read('kecheng.html').split('<script id="kc-data" type="application/json">')[1].split('</script>')[0]);
    const r = { up: /每个音都升高/.test(s), beat: /以四分音符为一拍\*\*的拍子里/.test(s), q44: /在 4\/4 拍里，单独一个数字/.test(s),
      s16: /第 53231323 分解型就是十六分/.test(s), dotHalf: /\[\[1 - \.\]\]/.test(s),
      moved: ch5.includes('s_748d77') && !ch3.includes('s_748d77'), maxShare: +maxShare.toFixed(2), same: JSON.stringify(emb) === JSON.stringify(seed) };
    T(!r.up && r.beat && r.q44 && !r.s16 && !r.dotHalf && r.moved && r.maxShare <= 0.4 && r.same,
      'T5 《认识简谱》勘误＋「凑满」挪到拍号之后＋答案位置均衡＋内嵌与种子一致', JSON.stringify(r));
  }

  /* ---------- T6 kcadmin 保存回执如实 ---------- */
  {
    const h = read('kcadmin.html');
    const ok = /r&&r\.live\? '已保存，学员立即看到新内容（本课已发布）' : '已保存草稿（未发布，学员看不到）'/.test(h) && !/adMsg\('已保存草稿'\)/.test(h);
    T(ok, 'T6 kcadmin 保存回执区分「已发布即生效」与「草稿」');
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
