'use strict';
/* v70.0 C 组：示例分组、5 份新示例、冷启动发布（规格 docs/spec-2026-11-v700.md §7、§8.4）
   E1  零差异：旧外壳（?shell=classic）与 ?next=0 的「示例做同款」网格 / 来源说明 / 右栏，和「示例曲谱」对话框（去缩图）——16 份、旧名、不分组，
       与 fixtures/v700_base.json 的 ex 部分（基线 6d8d6f8 现场生成）逐字节相同
   E2  新外壳新形态：21 份按谱种分组（role=group＋组标题，组序＝PQ_KIND.PZ、空组不出、组内按下标、与 pzOf 一致）、显示 name2（6 个改名）、来源说明写 21 份；
       网格键盘 ← → 按 DOM 顺序跨组、↑ ↓ 取上 / 下一视觉行横向最近的一项（逐步与几何独立推算比对）、Home / End；
       做同款保留示例的 intent（两只老虎 kids、视唱 sight）；只看示例开原示例；「示例曲谱」对话框同样分组 21 张卡、点卡打开对的示例
   E3  5 份新示例数据：migrate 与 sanitizeUntrusted 逐字节（对合法数据零改动）、beatErrors 0、pzOf / intent 金表、MusicXML 导出 → 导入 → 再导出逐小节音高＋拼写相同且过 XSD、
       五线谱碰撞普查（geom_census）0 处（连同 3 份手工录入）、新建面板 .nf-ex 名字不被截断（1280 / 1024 × 默认字体 / DejaVu Sans）
   E4  build-library：种子里 16 份示例＋手工录入条目（id / 来源许可 / intent / 制谱署名与 manifest 一致，原 10 首在前）；
       门 ⑨–⑭ 各造一例让它失败（多一个音 → ⑨；六音和弦 → ⑩；金表改错 → ⑪；改 manual 的一个音 → ⑫ 报出小节号；许可写 CC BY-SA → ⑬；去掉 reviewed → ⑭），同一份正确条目照过
   E5  冷启动计数（读 api/seed-library.json，用 api/kindname.js 重算）：7 个一级都 ≥1、钢琴谱 › 独奏 ≥3（规格 4 含莫扎特 K. 2，K. 2 待负责人补，见报告）、艺考视唱（intent=sight）≥3、简谱一级（主谱种或也出现在）≥8
   E   页面脚本错误 0
   用法：node tv_v700ex.js [--write-base]（--write-base：用 git show 6d8d6f8:muse-tab/index.html 现场生成 E1 基线写进 fixtures/v700_base.json 的 ex 键，其余键原样保留）
   env：MUSETAB_URL、CHROMIUM_PATH */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE_F = path.join(__dirname, 'fixtures', 'v700_base.json');
const XSD = path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
const BASE_REV = '6d8d6f8';
const J = x => JSON.stringify(x);
const qs = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };

async function openPg(b, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1280, height: o.h || 800 } });
  const pg = await ctx.newPage(); pg.setDefaultTimeout(8000); pg._ctx = ctx;
  pg.on('pageerror', e => pageErrs.push(String(e && e.message || e).slice(0, 200)));
  await pg.goto(url); await pg.waitForTimeout(900);
  await pg.evaluate(f => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {}
    if (f) { const st = document.createElement('style'); st.textContent = ':root{--font-ui:' + f + ' !important}'; document.head.appendChild(st); } }, o.font || '');
  return pg;
}
const NEWB = pg => pg.evaluate(() => document.querySelector('#dt-add') && getComputedStyle(document.querySelector('#dt-add')).display !== 'none' ? '#dt-add' : '#b-new');
async function toEx(pg) {
  await pg.click(await NEWB(pg)); await pg.waitForSelector('.nf-modal [data-scene]');
  await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
  await pg.click('#nf-isrc-ex'); await pg.waitForSelector('#nf-exl'); await pg.waitForTimeout(200);
}
/* E1 快照：示例做同款（来源说明、网格、右栏、预览说明）＋「示例曲谱」对话框（showLibrary 同步拼出、缩图还没填） */
async function snapEx(b, url) {
  const pg = await openPg(b, url);
  await toEx(pg);
  const a = await pg.evaluate(() => ({ isrc: document.querySelector('#nf-isrc-ex').outerHTML, grid: document.querySelector('#nf-exl').outerHTML,
    right: document.querySelector('.nf-modal .nf-right').outerHTML, cap: document.querySelector('#nf-pv figcaption').textContent }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
  a.lib = await pg.evaluate(() => { libTab = 'preset'; showLibrary(); const m = document.querySelector('.modal'); const h = m ? m.innerHTML.replace(/<img[^>]*>/g, '') : ''; closeModal(); return h; });
  await pg._ctx.close();
  return a;
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    /* ---------- E1 基线 ---------- */
    if (process.argv.includes('--write-base')) {
      const tmp = path.join(ROOT, 'muse-tab', '.v700ex_base_' + process.pid + '.html');   /* 放在 muse-tab/ 下：相对路径资源照常解析 */
      fs.writeFileSync(tmp, execFileSync('git', ['show', BASE_REV + ':muse-tab/index.html'], { cwd: ROOT, maxBuffer: 64 << 20 }));
      try {
        const u = 'file://' + tmp, ex = { rev: BASE_REV, classic: await snapEx(b, qs(u, 'shell=classic')), next0: await snapEx(b, qs(u, 'next=0')) };
        const base = fs.existsSync(BASE_F) ? JSON.parse(fs.readFileSync(BASE_F, 'utf8')) : {};
        base.ex = ex; fs.writeFileSync(BASE_F, JSON.stringify(base, null, 1) + '\n');
        console.log('已写 ' + path.relative(ROOT, BASE_F) + ' 的 ex 键（基线 ' + BASE_REV + '）');
      } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
    }
    { const base = fs.existsSync(BASE_F) ? (JSON.parse(fs.readFileSync(BASE_F, 'utf8')).ex || null) : null;
      const bad = [];
      if (!base) bad.push('fixtures/v700_base.json 没有 ex 键（先跑 --write-base）');
      else for (const k of ['classic', 'next0']) {
        const cur = await snapEx(b, qs(URL0, k === 'classic' ? 'shell=classic' : 'next=0'));
        for (const f of ['isrc', 'grid', 'right', 'cap', 'lib']) if (cur[f] !== base[k][f]) { let i = 0; while (cur[f][i] === base[k][f][i]) i++; bad.push(k + '.' + f + ' @' + i + ' 基线「' + base[k][f].slice(Math.max(0, i - 40), i + 60) + '」 现在「' + cur[f].slice(Math.max(0, i - 40), i + 60) + '」'); }
        if (!/16 份示例/.test(cur.isrc) || (cur.grid.match(/role="option"/g) || []).length !== 16 || /role="group"/.test(cur.grid + cur.lib)) bad.push(k + ' 不是 16 份不分组');
      }
      T('E1', !bad.length, '旧外壳 / ?next=0：示例做同款网格、来源说明、右栏与「示例曲谱」对话框 16 份、旧名、不分组，与基线 ' + BASE_REV + ' 逐字节相同', bad.join('\n     ')); }

    /* ---------- E2 新外壳新形态 ---------- */
    { const pg = await openPg(b, URL0);
      const r = { p2a: await pg.evaluate(() => nwP2A()) };
      await toEx(pg);
      r.grid = await pg.evaluate(() => {
        const g = [...document.querySelectorAll('#nf-exl > [role=group]')].map(x => ({ name: x.querySelector('#' + x.getAttribute('aria-labelledby')).textContent, idx: [...x.querySelectorAll('[role=option]')].map(o => +o.dataset.ex) }));
        const want = {}; EXAMPLES.forEach((p, i) => { const z = PQ_KIND.pzOf(migrate(p.make())).pz; (want[z] = want[z] || []).push(i); });
        const wantG = PQ_KIND.PZ.filter(z => want[z.id]).map(z => ({ name: z.name, idx: want[z.id] }));
        const names = [...document.querySelectorAll('#nf-exl [role=option]')].map(o => [+o.dataset.ex, o.textContent]);
        return { g, ok: J(g) === J(wantG), wantG, n: names.length, nameOk: names.every(([i, t]) => t === (EXAMPLES[i].name2 || EXAMPLES[i].name)), n2: EXAMPLES.filter(p => p.name2).length,
          isrc: document.querySelector('#nf-isrc-ex small').textContent, listbox: document.querySelector('#nf-exl').getAttribute('role') };
        function J(x) { return JSON.stringify(x); } });
      /* 键盘：逐步与几何独立推算比对（← → DOM 顺序；↑ ↓ 上 / 下一视觉行、横向中心最近、同距取 DOM 先者） */
      const geo = () => pg.evaluate(() => [...document.querySelectorAll('#nf-exl [role=option]')].map(o => { const q = o.getBoundingClientRect(); return { ex: +o.dataset.ex, top: q.top, h: q.height, cx: q.left + q.width / 2 }; }));
      const expect = (G, i, k) => { if (k === 'ArrowLeft') return Math.max(0, i - 1); if (k === 'ArrowRight') return Math.min(G.length - 1, i + 1); if (k === 'Home') return 0; if (k === 'End') return G.length - 1;
        const c = G[i], dn = k === 'ArrowDown', cand = G.map((g, j) => ({ g, j })).filter(o => dn ? o.g.top > c.top + c.h / 2 : o.g.top < c.top - c.h / 2);
        if (!cand.length) return i; const top = dn ? Math.min(...cand.map(o => o.g.top)) : Math.max(...cand.map(o => o.g.top));
        return cand.filter(o => Math.abs(o.g.top - top) < c.h / 2).sort((a, b2) => Math.abs(a.g.cx - c.cx) - Math.abs(b2.g.cx - c.cx) || a.j - b2.j)[0].j; };
      const kb = []; let kbOk = true, rowsCross = 0;
      await pg.click('#nf-ex-13');
      const seq = ['Home'].concat(Array(10).fill('ArrowDown'), Array(10).fill('ArrowUp'), ['End'], Array(4).fill('ArrowUp'), ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'Home'], Array(22).fill('ArrowRight'), Array(3).fill('ArrowLeft'));
      for (const k of seq) {
        const G = await geo(), cur = await pg.evaluate(() => +document.activeElement.dataset.ex), i = G.findIndex(g => g.ex === cur), j = expect(G, i, k);
        await pg.keyboard.press(k);
        const got = await pg.evaluate(() => ({ f: +document.activeElement.dataset.ex, sel: NWP.state.imp.ex }));
        const G2 = await geo(), gi = G2.findIndex(g => g.ex === G[i].ex), gj = G2.findIndex(g => g.ex === G[j].ex);
        if (/Arrow(Up|Down)/.test(k) && j !== i && Math.abs(G[j].top - G[i].top) > 60) rowsCross++;   /* 跨过组标题的一步 */
        const ok = got.f === G[j].ex && got.sel === G[j].ex && gi >= 0 && gj >= 0; if (!ok) kbOk = false; kb.push(k.replace('Arrow', '') + ':' + G[i].ex + '→' + got.f + (ok ? '' : '≠' + G[j].ex));
      }
      /* 做同款保留 intent：两只老虎（儿歌弹唱）kids、视唱谱例 · C 大调 sight；只看示例开原示例 */
      const made = {};
      for (const [k, i] of [['kids', 16], ['sightC', 19]]) {
        await pg.click('#nf-ex-' + i); await pg.click('#nf-exgo'); await pg.waitForTimeout(250);
        made[k] = await pg.evaluate(i => ({ intent: song.intent || '', want: EXAMPLES[i].make().intent, empty: NWB.isEmptySong(song), title: song.title, pz: (p => p.pz + '.' + p.sub)(PQ_KIND.pzOf(song)) }), i);
        await toEx(pg);
      }
      await pg.click('#nf-ex-20'); await pg.click('#nf-exopen'); await pg.waitForTimeout(250);
      made.open = await pg.evaluate(() => ({ title: song.title, intent: song.intent || '', notes: !NWB.isEmptySong(song) }));
      /* 「示例曲谱」对话框：分组 21 张卡，点卡（下标 17）打开二胡练习曲 */
      r.lib = await pg.evaluate(() => { libTab = 'preset'; showLibrary(); const m = document.querySelector('.modal');
        const g = [...m.querySelectorAll('[role=group]')].map(x => x.querySelector('h4').textContent + ':' + [...x.querySelectorAll('.song-card')].map(c => c.dataset.preset).join(','));
        const titles = [...m.querySelectorAll('.song-card .sc-title')].map(x => x.textContent);
        return { g, cards: m.querySelectorAll('.song-card').length, titles }; });
      await pg.click('.modal .song-card[data-preset="17"]'); await pg.waitForTimeout(300);
      r.lib.opened = await pg.evaluate(() => ({ title: song.title, ik: song.instKey }));
      await pg._ctx.close();
      const okG = r.p2a && r.grid.ok && r.grid.n === 21 && r.grid.g.length === 7 && r.grid.nameOk && r.grid.n2 === 6 && /^21 份示例/.test(r.grid.isrc) && r.grid.listbox === 'listbox';
      T('E2a', okG, '新外壳新形态：21 份示例按 7 个谱种分组（role=group＋组标题，组序＝PZ、组内按下标、与 pzOf 一致）、显示 name2（6 个改名）、来源说明「21 份示例」', J(r));
      T('E2b', kbOk && rowsCross >= 4, '示例网格键盘：← → 按 DOM 顺序跨组、↑ ↓ 取上 / 下一视觉行横向最近一项（跨组标题 ' + rowsCross + ' 步）、Home / End——' + seq.length + ' 步逐步与几何推算相同', kb.join(' '));
      T('E2c', made.kids.intent === 'kids' && made.kids.want === 'kids' && made.kids.empty && made.sightC.intent === 'sight' && made.sightC.empty && made.sightC.pz === 'wuxian.shichang'
        && made.open.title === '视唱谱例 · G 大调' && made.open.intent === 'sight' && made.open.notes,
        '做同款保留示例 intent（两只老虎 kids、视唱 C 大调 sight，新谱内容留空、视唱照样归五线谱 › 视唱）；只看示例开原示例（带 intent）', J(made));
      const lg = r.lib;
      T('E2d', lg.cards === 21 && lg.g.length === 7 && lg.g.join('|') === r.grid.g.map(x => x.name + ':' + x.idx.join(',')).join('|') && lg.titles.includes('卡农进行（纯伴奏）') && !lg.titles.includes('卡农进行（钢琴弹唱伴奏）')
        && lg.opened.title === '二胡练习曲' && lg.opened.ik === 'erhu',
        '「示例曲谱」对话框（新形态）：同一分组 21 张卡、显示 name2、点卡打开对的示例', J(lg));
    }
    /* v70.0 验收②：分组后 21 份示例比中栏高——点示例 / 方向键选中后，预览框（#nf-pvbox）整块在可视区内（中栏滚动区与视口都不越界），选中项本身也露着（不被预览盖住） */
    { const out = {}; let ok = true;
      for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080], [1024, 700]]) {
        const pg = await openPg(b, URL0, { w, h }); await toEx(pg);
        const vis = () => pg.evaluate(() => { const pv = document.querySelector('#nf-pvbox'), mid = pv.closest('.nf-mid'), sel = document.querySelector('#nf-exl [role=option][aria-selected="true"]');
          const P = pv.getBoundingClientRect(), M = mid.getBoundingClientRect(), S = sel.getBoundingClientRect(), midScr = /auto|scroll/.test(getComputedStyle(mid).overflowY) && mid.scrollHeight > mid.clientHeight + 1;
          const lo = Math.max(0, midScr ? M.top : 0), hi = Math.min(innerHeight, midScr ? M.bottom : innerHeight);
          const hit = document.elementFromPoint(S.left + S.width / 2, S.top + S.height / 2);
          return { ex: +sel.dataset.ex, pv: [Math.round(P.top), Math.round(P.bottom)], win: [Math.round(lo), Math.round(hi)], pvIn: P.height > 100 && P.top >= lo - 1 && P.bottom <= hi + 1, selVis: !!(hit && hit.closest('[role=option]') === sel),
            cap: (document.querySelector('#nf-pv figcaption') || {}).textContent || '', nm: sel.textContent }; });
        const steps = [];
        const opts = await pg.evaluate(() => [...document.querySelectorAll('#nf-exl [role=option]')].map(o => +o.dataset.ex));
        for (const i of [opts[0], opts[10], opts[opts.length - 1]]) { await pg.click('#nf-ex-' + i); await pg.waitForTimeout(250); steps.push(['点' + i, await vis()]); }
        for (const k of ['Home', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'End', 'ArrowUp', 'Home']) { await pg.keyboard.press(k); await pg.waitForTimeout(120); steps.push([k.replace('Arrow', ''), await vis()]); }
        const bad = steps.filter(([, v]) => !(v.pvIn && v.selVis && v.cap.includes(v.nm.replace(/（.*$/, ''))));
        if (bad.length) ok = false;
        out[w + 'x' + h] = bad.length ? bad.map(([k, v]) => k + ':' + JSON.stringify(v)).join(' ; ') : steps.length + ' 步全在视野内（预览 ' + steps[0][1].pv.join('–') + ' / 可视 ' + steps[0][1].win.join('–') + '）';
        await pg._ctx.close();
      }
      T('E2e', ok, '分组示例网格：点示例（首 / 中 / 末）与方向键 / Home / End 选中后，预览框整块在可视区内、选中项不被预览遮住、预览说明跟着换（1280×800 / 1440×900 / 1920×1080 / 1024×700）', J(out));
      console.log('ℹ️ E2e ' + J(out)); }

    /* ---------- E3 5 份新示例数据 ---------- */
    { const pg = await openPg(b, qs(URL0, 'shell=classic'), { w: 1440, h: 900 });
      const GOLD = { 16: ['gangqin.tanchang', 'kids', '两只老虎（儿歌弹唱）'], 17: ['jianpu.qiyue', '', '二胡练习曲（二胡简谱）'], 18: ['hechang.jianpu', '', '送别（简谱三部合唱）'],
        19: ['wuxian.shichang', 'sight', '视唱谱例 · C 大调（五线谱）'], 20: ['jianpu.shichang', 'sight', '视唱谱例 · G 大调（简谱）'] };
      const r = await pg.evaluate(GOLD => {
        const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const per = xs => { const d = new DOMParser().parseFromString(xs, 'application/xml'), M = [];
          d.querySelectorAll('part').forEach(p => [...p.querySelectorAll(':scope > measure')].forEach((m, i) => { M[i] = M[i] || [];
            m.querySelectorAll('note').forEach(n => { if (n.querySelector('grace') || !n.querySelector('pitch')) return;
              const st = n.querySelector('pitch step').textContent, al = +((n.querySelector('pitch alter') || {}).textContent || 0);
              M[i].push(((+n.querySelector('pitch octave').textContent + 1) * 12 + PC[st] + al) + st + al); }); }));
          return M.map(a => a.sort().join(',')); };
        const out = {};
        Object.keys(GOLD).forEach(i => { const p = EXAMPLES[i], raw = JSON.stringify(p.make()), d = migrate(p.make()), mj = JSON.stringify(d), sj = JSON.stringify(sanitizeUntrusted(JSON.parse(raw)));
          loadSong(JSON.parse(mj)); const be = beatErrors().length, x1 = exportMusicXML(song), im = importMusicXML(x1); loadSong(im.song); const x2 = exportMusicXML(song);
          const a = per(x1), c = per(x2), pz = PQ_KIND.pzOf(d);
          out[i] = { name: p.name, mig: mj === raw, san: sj === raw, be, pz: pz.pz + '.' + pz.sub, intent: PQ_KIND.intentOf(d), rt: a.length === c.length && a.every((v, k) => v === c[k]), notes: a.join('').length, x1 }; });
        return out; }, GOLD);
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv_v700ex_')), bad = [], xsdBad = [];
      Object.entries(r).forEach(([i, o]) => { const g = GOLD[i];
        if (!o.mig || !o.san || o.be || o.pz !== g[0] || o.intent !== g[1] || o.name !== g[2] || !o.rt || !o.notes) bad.push([i, o.name, o.mig, o.san, o.be, o.pz, o.intent, o.rt]);
        const f = path.join(tmp, i + '.musicxml'); fs.writeFileSync(f, o.x1);
        try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { xsdBad.push(i + ' ' + String(e.stderr || '').split('\n').filter(l => /error/i.test(l)).slice(0, 2).join(' | ')); } });
      fs.rmSync(tmp, { recursive: true, force: true });
      T('E3a', !bad.length && !xsdBad.length, '5 份新示例：migrate / sanitizeUntrusted 逐字节、beatErrors 0、pzOf / intent 金表、MusicXML 往返音高＋拼写逐小节相同、导出过 MusicXML 4.0 XSD', J({ bad, xsdBad }));
      /* 碰撞普查：5 份新示例＋手工录入（种子里的 lib-pd-* / lib-ex-shichang-f） */
      const GC = require('./geom_census');
      const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));
      const smp = (await pg.evaluate(() => [16, 17, 18, 19, 20].map(i => ({ name: EXAMPLES[i].name, song: migrate(EXAMPLES[i].make()) }))))
        .concat(seed.filter(x => /^lib-pd-|^lib-ex-shichang-f$/.test(x.id)).map(x => ({ name: x.title, song: x.data })));
      const R = await GC.census(pg, smp, { paperW: 870, presets: false }), G = GC.groupCounts(R);
      const hit = Object.values(G).filter(g => !g.info && g.n).map(g => g.id + ' ' + g.n + '：' + (g.ex || []).slice(0, 2).join('；'));
      T('E3b', !hit.length && R.per.length === smp.length, '刻版碰撞普查：5 份新示例＋' + (smp.length - 5) + ' 份手工录入，全部类别组 0 处', J(hit));
      await pg._ctx.close();
      /* 名字不被截断：新建面板 .nf-ex（三列、最多两行）在 1280 / 1024 宽 × 默认字体 / DejaVu Sans */
      const ov = [];
      for (const [w, h] of [[1280, 800], [1024, 700]]) for (const font of ['', "'DejaVu Sans',sans-serif"]) {
        const p2 = await openPg(b, URL0, { w, h, font });
        await toEx(p2);
        const o = await p2.evaluate(() => [...document.querySelectorAll('#nf-exl .nf-ex span')].filter(s => s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1).map(s => s.textContent));
        const n = await p2.evaluate(() => document.querySelectorAll('#nf-exl .nf-ex').length);
        if (o.length || n !== 21) ov.push(w + (font ? ' DejaVu' : ' 默认') + '：' + n + ' 份，截断 ' + o.join('、'));
        await p2._ctx.close();
      }
      T('E3c', !ov.length, '新建面板示例名不被截断（21 份，1280 / 1024 × 默认字体 / DejaVu Sans）', ov.join('；'));
    }

    /* ---------- E4 build-library ---------- */
    { const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'library', 'manifest.json'), 'utf8'));
      const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));
      const want = man.items.map(x => x.id).concat(man.examples.map(x => x.id), man.manual.map(x => x.id)), ids = seed.map(x => x.id);
      const bad = [];
      if (J(ids) !== J(want)) bad.push('种子顺序 / 条目 ≠ items → examples → manual：' + J(ids));
      if (man.examples.length !== 16) bad.push('示例 ' + man.examples.length + ' 份（应 16）');
      man.examples.concat(man.manual).forEach(it => { const s = seed.find(x => x.id === it.id); if (!s) return;
        const lic = (it.source || {}).license, pd = /^lib-pd-/.test(it.id);
        if (s.title !== it.title || s.data.title !== it.title || s.singer !== (it.composer || '') || J(s.source) !== J(it.source) || (s.data.intent || '') !== (it.intent || '')
          || s.data.maker !== (pd ? '谱友圈官方 · 据公有领域版本录入' : '谱友圈官方') || ['CC0 1.0', '公有领域', '谱友圈自编'].indexOf(lic) < 0 || s.data.id != null) bad.push(it.id); });
      T('E4a', !bad.length, '种子：原 ' + man.items.length + ' 首在前，示例 ' + man.examples.length + ' 份、手工录入 ' + man.manual.length + ' 份（' + man.manual.map(x => x.id).join(' / ') + '）；标题＝显示名、作曲进 singer、来源许可 / intent / 制谱署名与 manifest 一致、data 无 id', J(bad));
      /* 反例：临时清单只放手工条目（items / examples 空——示例一一对应会另报，不影响下面按 id 认门） */
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv_v700ex_man_')), C = x => JSON.parse(J(x));
      const fe = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'library', 'manual', 'lib-pd-fur-elise.json'), 'utf8')), feIt = man.manual.find(x => x.id === 'lib-pd-fur-elise');
      const put = (id, data, patch) => { fs.writeFileSync(path.join(tmp, id + '.json'), J(data)); return Object.assign(C(feIt), { id, file: id + '.json' }, patch || {}); };
      const d9 = C(fe); d9.measures[3].voxes[0].push(C(d9.measures[3].voxes[0][1]));                       /* 第 3 小节右手多一个十六分音符 */
      const d10 = C(fe); d10.measures[2].voxes[1][0].adds = [3, 6, 1, 3, 5].map((dg, k) => ({ deg: dg, acc: '', oct: k < 2 ? -1 : 0 }));   /* 六音和弦（导入器和弦上限之外的音丢掉） */
      const d12 = C(fe); Object.assign(d12.measures[3].voxes[0][3], { deg: 6, acc: '' });                                              /* 第 3 小节右手 G♯4 改 A4 */
      const list = [put('lib-pd-ok', fe), put('lib-pd-bad9', d9), put('lib-pd-bad10', d10), put('lib-pd-bad11', fe, { expect: 'gangqin.banzou' }), put('lib-pd-bad12', d12),
        put('lib-pd-bad13', fe, { source: Object.assign(C(feIt.source), { license: 'CC BY-SA 4.0' }) }), put('lib-pd-bad14', fe, { reviewed: undefined })];
      const mf = path.join(tmp, 'manifest.json'); fs.writeFileSync(mf, J({ items: [], examples: [], manual: list }));
      const run = spawnSync('node', [path.join(ROOT, 'deploy', 'build-library.js'), '--check', '--manifest=' + mf], { encoding: 'utf8', env: process.env, timeout: 600000 });
      fs.rmSync(tmp, { recursive: true, force: true });
      const err = (run.stderr || '') + (run.stdout || ''), lineOf = id => (err.split('\n').find(l => l.includes(id + '（')) || '');
      const G4 = { bad9: '⑨', bad10: '⑩', bad11: '⑪', bad12: '⑫', bad13: '⑬', bad14: '⑭' }, miss = [];
      Object.entries(G4).forEach(([k, g]) => { const l = lineOf('lib-pd-' + k); if (!l.includes(g)) miss.push(k + ' 没报 ' + g + '：' + l.slice(0, 160)); });
      const l12 = lineOf('lib-pd-bad12');
      if (!/第 4 段（小节号 3）第 1 行：期望 B4:8 r:16 E4:16 G#4:16 B4:16 实际 B4:8 r:16 E4:16 A4:16 B4:16/.test(l12)) miss.push('⑫ 没报出小节号与期望 / 实际：' + l12.slice(0, 300));
      if (lineOf('lib-pd-ok')) miss.push('正确条目也报了：' + lineOf('lib-pd-ok').slice(0, 200));
      if (run.status === 0) miss.push('构建没失败');
      T('E4b', !miss.length, '质量门反例：多一个音 → ⑨、六音和弦 → ⑩、金表改错 → ⑪、改一个音 → ⑫ 报「第 4 段（小节号 3）第 1 行：期望 … 实际 …」、许可 CC BY-SA → ⑬、去掉 reviewed → ⑭；同一份正确条目照过、构建失败不写文件', miss.join('\n     '));
    }

    /* ---------- E5 冷启动计数 ---------- */
    { const K = require(path.join(ROOT, 'api', 'kindname.js'));
      const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));
      const cnt = {}, solo = [], sight = [], jp = [];
      seed.forEach(x => { const p = K.pzOf(x.data), all = [p.pz + '.' + p.sub].concat(p.also);
        [...new Set(all.map(a => a.split('.')[0]))].forEach(z => { cnt[z] = (cnt[z] || 0) + 1; });
        if (all.includes('gangqin.duzou')) solo.push(x.title);
        if (K.intentOf(x.data) === 'sight') sight.push(x.title);
        if (all.some(a => a.split('.')[0] === 'jianpu')) jp.push(x.title); });
      const miss = K.PZ.filter(z => !(cnt[z.id] >= 1)).map(z => z.name);
      T('E5', seed.length === 29 && !miss.length && solo.length >= 3 && sight.length >= 3 && jp.length >= 8,
        '冷启动 ' + seed.length + ' 份：7 个一级都 ≥1（' + K.PZ.map(z => z.name + ' ' + (cnt[z.id] || 0)).join(' · ') + '）、钢琴谱 › 独奏 ' + solo.length + '（规格 4 含 K. 2，待补）、艺考视唱 ' + sight.length + '、简谱一级 ' + jp.length,
        J({ miss, solo, sight, jp }));
    }
  } catch (e) { T('X', false, '执行异常', e && e.stack || e); }
  await b.close();
  T('E', !pageErrs.length, '页面脚本错误 0', J(pageErrs.slice(0, 5)));
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})();
