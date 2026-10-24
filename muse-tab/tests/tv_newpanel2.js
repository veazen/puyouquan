'use strict';
/* v69.1 C 轨（界面简约化 S3：方案 docs/design-2026-10g ⑤ 画板 4 / ⑥；规格 v69.1 §5 C1 / C2、§6.4 tv_newpanel2）：新建面板合稿 + 启动台三动作 + 快速新建。
   只新形态（F.nxOn()，桌面非手机页）；?next=0 / ?shell=classic 与 v69.0（658d425）逐字节相同。
   N0  ?next=0 / ?shell=classic：新建面板（默认 + 钢琴即兴伴奏）.nf-shell 去掉预览框内容后与基线逐字节相同；启动台 #start-pad 同理（新形态节点 #spd-nx 不建）
   N1  新形态 newpanel / newpanel-pacc：textaudit 单屏抽取 总字 ≤120、说明字 0、说明行 0
   N2  9 用途 + 5 垂类徽标原样（名称 / 顺序 / 徽标字与 ?next=0 逐项同；「自选记谱法」可见字「自选」、读屏名不变）
   N3  参数行：#nw-title 占位「曲名」、#nw-key 显示 1=C、4/4、♩=72、#nf-nmea 16 先断言可见；直接键入（曲名 / 速度 96 / 小节数 24）→ 建谱字段与 ?next=0 面板同输入相同
   N4  记谱法只一处：[data-act=mel] 全在 #nf-pvmel；点「五线」→ 预览重刻（pvStats +1）、#nf-kind 变；「对照」→ 谱行同时有简谱与五线谱；固定用途只读读数；自选用途五开关在预览左上
   N5  「示例」角标、虚线「5–16」、钢琴伴奏类淡紫伴奏行（.nf-bacc 底色 == --nx-pv）；非伴奏类无淡紫
   N6  三步胶片步名序列 == 建好后 #flw-sbar .flw-sb-t 序列（钢琴伴奏歌谱 / 吉他弹唱先写旋律 / 钢琴弹唱（纯伴奏 CG）/ 无步骤谱类）
   N7  「创建 ↗」：可见、title「创建（Enter）」、Enter 建谱、新窗口打开（docs.length+1）、当前谱保留
   N8  ⋯（#nf-more）：先断言可见再点 → 弹层五开关 / 歌词 / 定弦 / 变调夹 / 其余变体可见可用；键 1–5 不开 ⋯ 也生效（谱名变、⋯ 角标出）；冲突预告 + 撤销照旧；Esc 先收 ⋯
   N9  点击数不增：吉他弹唱 / 钢琴即兴伴奏 / 儿歌 / 教学对照 / 视唱 / 器乐独奏 / 和弦谱 从面板打开起「点用途 + 创建」2 次就建成该谱类
   N10 深链：?new=sight&key=Dm&tempo=60 → 调 / 速度圆点 data-src="link"；坏参数 → #nf-linkbad 出现
   N11 依据删除后来源可查：每个参数圆点 title ∈ {沿用上次, 按惯例, 你改的, 按链接, 默认}；改速度后速度圆点变「你改的」
   S0  旧外壳 / ?next=0 启动台：#spd-cards 可见、无 #spd-nx（同 N0 逐字节）
   S1  新形态启动台：总字 ≤70、说明字 0；行 2 控件与右栏（含竖条）不可见
   S2  三区可见可用：新建 5 卡 + 全部（点钢琴即兴伴奏 → 面板预选 pacc；全部 → 面板）；导入（徽章 → #b-open 被点；区名 → 面板导入页；拖放框命中区 ≥44）；
       接着写（有自己的谱时最近 ≤3 张、点第 1 张＝切到那一窗口并离台；无时只「我的曲谱」，点它＝我的曲谱）
   S3  启动台无「按上次」卡；Alt+Shift+N 照建（docs+1、谱类＝上次用途）
   Q1  快速新建首项：图标＝上次用途谱类图标（nw-last 预置 pacc → type-jg）、无 .nf-qk、调拍小标签、Alt+Shift+N 键帽；无「从已有音乐…」；9 用途 + 徽标原样；「新建面板…」照有
   K   本机键集合差为空（被测动作本来就写的 musetab-nw-last / 窗口与谱存档除外）；页面脚本错误 0
   突变实证（报告里列）：① deskNewNx 的 nf-pvmel 改回右栏 → N4 红；② FLOW.spd 不隐藏 #spd-cards → S1 红；③ quickMenuFlowHTML 首项回 tpl-last → Q1 红。
   env：MUSETAB_URL 被测页 · MUSETAB_BASE 基线页（缺省 git show 658d425；inplace_ref.json 有就读它）· ONLY=N1,S2 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const TA = require('./lib/textaudit/states.js'), M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const REFC = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'inplace_ref.json'), 'utf8')).commit; } catch (_) { return ''; } })() || '658d4252b780f6534cec556fdf4d9f96609f5928';
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || REFC;
const IN_CI = !!process.env.CI && process.env.MUSETAB_BASE !== 'none';
const BASEU = (() => { const e = process.env.MUSETAB_BASE; if (e) return e === 'none' ? '' : toUrl(e);
  try { const txt = execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(os.tmpdir(), 'tv_newpanel2_base_' + BASE_COMMIT.slice(0, 7) + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; } })();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x), W = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1600) : '')); };
const NOTE = s => lines.push('ℹ️ ' + s);

function INIT() {
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return false; const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__panel = o => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} showNewWizard(o || {}); };
}
async function open(b, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INIT);
  if (o.ls) await ctx.addInitScript(ls => { try { if (!sessionStorage.getItem('__seeded')) { Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('__seeded', '1'); } } catch (_) {} }, o.ls);
  const pg = await ctx.newPage(); pg.on('pageerror', e => pageErrs.push((o.tag || '') + ' ' + e.message));
  await pg.goto(url); await W(o.wait || 1800);
  return { ctx, pg };
}
/* .nf-shell 去掉预览框（#nf-pvbox，data-keep 由 pvSync 管、刻版计时不定）内容后的 HTML */
const shellHTML = pg => pg.evaluate(() => { const s = document.querySelector('.nf-modal .nf-shell'); if (!s) return null; const c = s.cloneNode(true); const b = c.querySelector('#nf-pvbox'); if (b) b.innerHTML = ''; return c.innerHTML; });

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    /* ===== N0 / S0 零差异 ===== */
    if (want('N0') || want('S0')) {
      if (!BASEU) { T('N0', !IN_CI, '基线页（' + BASE_COMMIT.slice(0, 7) + '）', IN_CI ? 'CI 取不到基线 → 判红' : '本地取不到基线，跳过'); }
      else for (const q of ['next=0', 'shell=classic']) {
        const res = {};
        for (const [tag, u] of [['cur', withQ(URL0, q)], ['base', withQ(BASEU, q)]]) {
          const { ctx, pg } = await open(b, u, { tag: 'N0' + tag });
          const sp = await pg.evaluate(() => { const s = document.getElementById('start-pad'); return { html: s ? s.outerHTML : null, nx: !!document.getElementById('spd-nx'), cards: __vis('#spd-cards') }; });
          await pg.evaluate(() => __panel()); await W(900); const p1 = await shellHTML(pg);
          await pg.click('.nf-modal [data-scene="pacc"]'); await W(700); const p2 = await shellHTML(pg);
          res[tag] = { sp, p1, p2 }; await ctx.close();
        }
        const c = res.cur, bs = res.base;
        if (want('N0')) T('N0', !!c.p1 && c.p1 === bs.p1 && c.p2 === bs.p2, '?' + q + '：新建面板（默认 + 钢琴即兴伴奏）.nf-shell 与 v69.0（' + BASE_COMMIT.slice(0, 7) + '）逐字节相同',
          J({ len: [c.p1 && c.p1.length, bs.p1 && bs.p1.length, c.p2 && c.p2.length, bs.p2 && bs.p2.length], at: (() => { const a = c.p2 || '', z = bs.p2 || ''; let i = 0; while (i < a.length && a[i] === z[i]) i++; return [a.slice(i - 60, i + 80), z.slice(i - 60, i + 80)]; })() }));
        if (want('S0')) T('S0', !c.sp.nx && c.sp.cards && c.sp.html === bs.sp.html, '?' + q + '：启动台 #start-pad 与 v69.0 逐字节相同、#spd-cards 可见、无 #spd-nx', J({ nx: c.sp.nx, cards: c.sp.cards, eq: c.sp.html === bs.sp.html }));
      }
    }
    /* ===== N1 / S1 文字量（textaudit 同一抽取） ===== */
    if (want('N1') || want('S1')) {
      for (const id of ['startpad', 'newpanel', 'newpanel-pacc']) {
        if (id === 'startpad' ? !want('S1') : !want('N1')) continue;
        const r = await TA.runState(b, TA.STATES.find(s => s.id === id), { base: URL0 });
        const x = M.screen(r);
        if (id === 'startpad') {
          const { ctx, pg } = await open(b, URL0, { tag: 'S1' });
          const hid = await pg.evaluate(() => ({ row2: !__vis('#editbar'), strip: !__vis('#flw-rstrip'), right: !__vis('#right-dock'), nx: __vis('#spd-nx'), cards: __vis('#spd-cards') }));
          await ctx.close();
          T('S1', x.total <= 70 && x.desc === 0 && x.descLines === 0 && !r.err && hid.row2 && hid.strip && hid.right && hid.nx && !hid.cards, '新形态启动台：总字 ' + x.total + ' ≤70、说明字 ' + x.desc + '＝0；行 2 / 右栏 / 竖条不可见、#spd-nx 可见、#spd-cards 隐藏', J({ hid, err: r.err, g: (r.groups || []).filter(g => !g.occ).map(g => g.text).join('|').slice(0, 400) }));
        } else T('N1', x.total <= 120 && x.desc === 0 && x.descLines === 0 && !r.err, id + '：总字 ' + x.total + ' ≤120、说明字 ' + x.desc + '＝0、说明行 ' + x.descLines + '＝0', J({ err: r.err, desc: (r.groups || []).filter(g => g.k === 'desc' && !g.occ).map(g => g.text) }));
      }
    }
    /* ===== N2–N11（新建面板） ===== */
    if (['N2', 'N3', 'N4', 'N5', 'N7', 'N8', 'N11'].some(want)) {
      const { ctx, pg } = await open(b, URL0, { tag: 'N' });
      const k0 = await pg.evaluate(() => __keys());
      await pg.evaluate(() => __panel()); await W(900);
      if (want('N2')) {
        const cur = await pg.evaluate(() => [...document.querySelectorAll('.nf-modal .nf-left [data-scene]')].map(e => [e.dataset.scene, (e.querySelector('b') || {}).textContent, (e.querySelector('.nf-tag') || {}).textContent || '', e.getAttribute('aria-label') || '']));
        const { ctx: c2, pg: p2 } = await open(b, withQ(URL0, 'next=0'), { tag: 'N2b' });
        await p2.evaluate(() => __panel()); await W(700);
        const old = await p2.evaluate(() => [...document.querySelectorAll('.nf-modal .nf-left [data-scene]')].map(e => [e.dataset.scene, (e.querySelector('b') || {}).textContent, (e.querySelector('.nf-tag') || {}).textContent || '']));
        await c2.close();
        const same = cur.length === old.length && cur.every((c, i) => c[0] === old[i][0] && c[2] === old[i][2] && (c[0] === 'custom' ? (c[1] === '自选' && c[3] === old[i][1]) : c[1] === old[i][1]));
        T('N2', same && cur.length === 11 && cur.filter(c => c[2]).length === 5, '9 用途 + 空白 / 自选与 5 个垂类徽标原样（名称 / 顺序 / 徽标同 ?next=0；「自选」读屏名「自选记谱法」）', J({ cur, old }));
      }
      if (want('N3') || want('N11')) {
        await pg.click('.nf-modal [data-scene="pacc"]'); await W(600);
        const v = await pg.evaluate(() => { const q = s => document.querySelector('.nf-modal ' + s), sel = e => e && e.options[e.selectedIndex].text;
          return { vis: ['#nf-params', '#nw-title', '#nw-key', '#nw-beats', '#nw-unit', '#nw-tempo', '#nf-nmea', '#nf-more'].every(s => __vis(q(s))), ph: q('#nw-title').placeholder, key: sel(q('#nw-key')), meter: sel(q('#nw-beats')) + '/' + sel(q('#nw-unit')),
            glyph: (q('#nw-tglyph') || {}).textContent, tempo: q('#nw-tempo').value, nmea: q('#nf-nmea').value, inRight: !!document.querySelector('.nf-modal .nf-right #nw-title'),
            dots: [...document.querySelectorAll('.nf-modal #nf-params .nf-dot')].map(d => [d.dataset.src, d.title]) }; });
        if (want('N3')) {
          /* 同输入两面板建谱对拍 */
          const build = async (p, nx) => {
            await p.fill('.nf-modal #nw-title', '新歌'); await p.fill('.nf-modal #nw-tempo', '96'); await p.press('.nf-modal #nw-tempo', 'Tab');
            if (!nx) { const m = await p.$('.nf-modal [data-act="more"]'); if (m) { await m.click(); await W(300); } }
            await p.fill('.nf-modal #nf-nmea', '24'); await p.press('.nf-modal #nf-nmea', 'Tab'); await W(200);
            const n0 = await p.evaluate(() => docs.length);
            await p.click('.nf-modal #nw-create'); await W(1200);
            return p.evaluate(n0 => ({ n: docs.length - n0, title: song.title, key: song.key, beats: song.beats, unit: song.unit, tempo: song.tempo, tu: song.tempoUnit || null, mea: song.measures.length, kind: docTypeLabel(song), nv: song.voxVoices.length }), n0);
          };
          const a = await build(pg, true);
          const { ctx: c3, pg: p3 } = await open(b, withQ(URL0, 'next=0'), { tag: 'N3b' });
          await p3.evaluate(() => __panel()); await W(600); await p3.click('.nf-modal [data-scene="pacc"]'); await W(500);
          const o = await build(p3, false); await c3.close();
          T('N3', v.vis && v.ph === '曲名' && v.key === '1=C' && v.meter === '4/4' && v.glyph === '♩' && v.tempo === '72' && v.nmea === '16' && !v.inRight && a.n === 1 && J(Object.assign({}, a, { n: 0 })) === J(Object.assign({}, o, { n: 0 })) && a.title === '新歌' && a.tempo === 96 && a.mea === 24,
            '参数行可见：曲名占位「' + v.ph + '」· ' + v.key + ' · ' + v.meter + ' · ' + v.glyph + '=' + v.tempo + ' · ' + v.nmea + '；直接键入建谱字段与 ?next=0 面板同输入相同', J({ v, a, o }));
        }
        if (want('N11')) {
          const SET = ['沿用上次', '按惯例', '你改的', '按链接', '默认'];
          /* 重新开一个面板（上面 N3 建谱后面板已关），改速度后看速度圆点 */
          await pg.evaluate(() => __panel({ scene: 'pacc' })); await W(600);
          await pg.fill('.nf-modal #nw-tempo', '100'); await pg.press('.nf-modal #nw-tempo', 'Tab'); await W(300);
          const d2 = await pg.evaluate(() => [...document.querySelectorAll('.nf-modal #nf-params .nf-dot')].map(d => [d.dataset.src, d.title]));
          const tp = await pg.evaluate(() => { const d = document.querySelector('.nf-modal .nf-tempo .nf-dot'); return d && d.title; });
          T('N11', v.dots.length >= 4 && v.dots.concat(d2).every(([s, t]) => SET.includes(t)) && tp === '你改的', '依据删除后来源可查：参数圆点 title 都在 {沿用上次 / 按惯例 / 你改的 / 按链接 / 默认}；改速度后速度圆点「你改的」', J({ before: v.dots, after: d2, tp }));
        }
      }
      if (want('N4') || want('N5')) {
        await pg.evaluate(() => __panel({ scene: 'pacc' })); await W(900);
        const r = await pg.evaluate(() => { const all = [...document.querySelectorAll('.nf-modal [data-act="mel"]')]; const inPv = all.every(e => e.closest('#nf-pvmel'));
          return { n: all.length, inPv, vis: __vis('#nf-pvmel'), hit: __hit('#nf-pvmel [data-v="S"]'), kind: document.getElementById('nf-kind').textContent, pv: NWP.pvStats.length,
            ex: __vis('.nf-modal .nf-pvex') && document.querySelector('.nf-modal .nf-pvex').textContent, rest: (document.querySelector('.nf-modal .nf-pvrest') || {}).textContent || '',
            acc: (() => { const a = document.querySelector('.nf-modal .nf-bacc'); if (!a) return null; const c = getComputedStyle(a).backgroundColor, v = getComputedStyle(document.body).getPropertyValue('--nx-pv').trim(); return { c, v, h: a.getBoundingClientRect().height }; })() }; });
        if (want('N4')) {
          await pg.click('.nf-modal #nf-pvmel [data-v="S"]'); await W(900);
          const r2 = await pg.evaluate(() => ({ kind: document.getElementById('nf-kind').textContent, pv: NWP.pvStats.length, mel: NWP.state.mel }));
          await pg.click('.nf-modal #nf-pvmel [data-v="D"]'); await W(900);
          const r3 = await pg.evaluate(() => ({ kind: document.getElementById('nf-kind').textContent, rows: NWP.stackOfState(NWP.state), undo: !!document.querySelector('.nf-modal #nf-undo') }));
          await pg.evaluate(() => __panel({ scene: 'teach' })); await W(500);
          const ro = await pg.evaluate(() => ({ ro: (document.querySelector('.nf-modal #nf-pvmel.nf-pvro') || {}).textContent || '', n: document.querySelectorAll('.nf-modal [data-act="mel"]').length }));
          await pg.evaluate(() => __panel({ scene: 'custom' })); await W(500);
          const cu = await pg.evaluate(() => ({ rows: [...document.querySelectorAll('.nf-modal .nf-pvtop [data-row]')].map(e => e.dataset.row).join(''), vis: __vis('.nf-modal .nf-pvtop [data-row="J"]') }));
          T('N4', r.n === 3 && r.inPv && r.vis && r.hit && r2.pv > r.pv && r2.kind !== r.kind && r2.mel === 'S' && /S/.test(r3.rows) && /J/.test(r3.rows) && ro.ro === '对照' && ro.n === 0 && cu.rows === 'JSTGC' && cu.vis,
            '记谱法只一处（#nf-pvmel，3 枚）：点「五线」预览重刻（pvStats ' + r.pv + '→' + r2.pv + '）、谱名 ' + r.kind + '→' + r2.kind + '；「对照」→ ' + r3.rows + '；教学对照只读「' + ro.ro + '」；自选五开关在预览左上', J({ r, r2, r3, ro, cu }));
        }
        if (want('N5')) {
          await pg.evaluate(() => __panel({ scene: 'vocal' })); await W(900);
          const vo = await pg.evaluate(() => ({ acc: !!document.querySelector('.nf-modal .nf-bacc'), rest: (document.querySelector('.nf-modal .nf-pvrest') || {}).textContent || '' }));
          const rgb = s => (s || '').replace(/\s+/g, '').toLowerCase();
          const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return ''; const n = parseInt(m[1], 16); return 'rgb(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ')'; };
          T('N5', r.ex === '示例' && r.rest === '5–16' && r.acc && rgb(r.acc.c) === hex(r.acc.v) && r.acc.h > 10 && !vo.acc && vo.rest === '5–16', '「示例」角标、虚线「5–16」；钢琴即兴伴奏伴奏行淡紫（' + (r.acc && r.acc.c) + ' == --nx-pv ' + (r.acc && r.acc.v) + '），歌谱无淡紫', J({ r, vo }));
        }
      }
      if (want('N7')) {
        await pg.evaluate(() => __panel({ scene: 'gtr' })); await W(600);
        const v7 = await pg.evaluate(() => { const c = document.querySelector('.nf-modal #nw-create'); return { vis: __vis(c) && __hit(c), t: c.title, txt: c.textContent.replace(/\s+/g, ''), n: docs.length, cur: song.title }; });
        await pg.focus('.nf-modal [data-scene="gtr"]'); await pg.keyboard.press('Enter'); await W(1200);
        const a7 = await pg.evaluate(() => ({ n: docs.length, modal: !!document.querySelector('.nf-modal'), kind: docTypeLabel(song), prev: docs.some(d => d.song && d.song.title !== song.title) || docs.length > 1 }));
        T('N7', v7.vis && v7.t === '创建（Enter）' && /^创建/.test(v7.txt) && /↗/.test(v7.txt) && a7.n === v7.n + 1 && !a7.modal && /吉他/.test(a7.kind), '「创建 ↗」可见可点、title「创建（Enter）」；Enter 新窗口建谱（窗口 ' + v7.n + '→' + a7.n + '）、当前谱保留', J({ v7, a7 }));
      }
      if (want('N8')) {
        await pg.evaluate(() => __panel({ scene: 'gtr' })); await W(600);
        const pre = await pg.evaluate(() => ({ vis: __vis('.nf-modal #nf-more') && __hit('.nf-modal #nf-more'), lab: document.querySelector('.nf-modal #nf-more').getAttribute('aria-label'), rows0: document.querySelectorAll('.nf-modal button[data-row]').length }));
        await pg.click('.nf-modal #nf-more'); await W(300);
        const inMore = await pg.evaluate(() => ({ exp: document.querySelector('.nf-modal #nf-more').getAttribute('aria-expanded'), rows: [...document.querySelectorAll('.nf-modal #nf-moreb [data-row]')].filter(e => __vis(e)).length,
          lyr: __vis('.nf-modal #nf-moreb #nf-lyr'), tun: __vis('.nf-modal #nf-moreb #nf-tuning'), capo: __vis('.nf-modal #nf-moreb #nf-capo'), pen: __vis('.nf-modal #nf-moreb [data-act="var"][data-k="pen"]') }));
        await pg.selectOption('.nf-modal #nf-capo', '3'); await W(300);
        const capo = await pg.evaluate(() => NWP.state.v.capo);
        await pg.keyboard.press('Escape'); await W(250);
        const esc = await pg.evaluate(() => ({ modal: !!document.querySelector('.nf-modal'), more: !!document.querySelector('.nf-modal #nf-moreb'), f: document.activeElement && document.activeElement.id }));
        await pg.focus('.nf-modal [data-scene="gtr"]');
        const k0 = await pg.evaluate(() => document.getElementById('nf-kind').textContent);
        await pg.keyboard.press('2'); await W(500);
        const k1 = await pg.evaluate(() => ({ kind: document.getElementById('nf-kind').textContent, note: !!document.querySelector('.nf-modal .nf-note'), undo: __vis('.nf-modal #nf-undo') }));
        if (k1.undo) { await pg.click('.nf-modal #nf-undo'); await W(400); }
        const k2 = await pg.evaluate(() => document.getElementById('nf-kind').textContent);
        /* ⋯ 角标：键改了谱、用途没变（开关仍收在 ⋯ 里）——教学对照谱按 4 加钢琴大谱表（仍是教学对照用途） */
        await pg.evaluate(() => __panel({ scene: 'teach' })); await W(400); await pg.focus('.nf-modal [data-scene="teach"]');
        const t0 = await pg.evaluate(() => document.getElementById('nf-kind').textContent);
        await pg.keyboard.press('4'); await W(400);
        k1.dot = await pg.evaluate(() => ({ kind: document.getElementById('nf-kind').textContent, scene: NWP.state.scene, dot: __vis('.nf-modal #nf-more .nf-mdot') }));
        k1.dotOk = k1.dot.dot && k1.dot.scene === 'teach' && k1.dot.kind !== t0;
        T('N8', pre.vis && pre.lab === '更多设置' && pre.rows0 === 0 && inMore.exp === 'true' && inMore.rows === 5 && inMore.lyr && inMore.tun && inMore.capo && inMore.pen && capo === 3 && esc.modal && !esc.more && esc.f === 'nf-more'
          && k1.kind !== k0 && k1.dotOk && k1.note && k1.undo && k2 === k0,
          '⋯ 可见可点（读屏「更多设置」）→ 五开关 / 歌词 / 定弦 / 变调夹 / 从哪写起都在弹层；Esc 先收 ⋯；键 2 不开 ⋯ 也生效（' + k0 + '→' + k1.kind + '）、⋯ 角标、冲突预告与撤销照旧', J({ pre, inMore, capo, esc, k1, k2 }));
      }
      const k9 = await pg.evaluate(() => __keys());
      const extra = k9.filter(k => !k0.includes(k) && !/^musetab-(nw-last|docs|doc|song|tabs|win|autosave|last|cur)/.test(k));
      T('K', !extra.length, '新建面板一轮：本机键集合差为空（建谱本来写的 nw-last / 窗口存档除外）', J({ extra, k0, k9 }));
      await ctx.close();
    }
    if (want('N6')) {
      const { ctx, pg } = await open(b, URL0, { tag: 'N6' });
      const res = [];
      for (const [sc, prep] of [['pacc', null], ['gtr', 'penJ'], ['pacc', 'pure'], ['vocal', null]]) {
        await pg.evaluate(o => __panel({ scene: o.sc }), { sc }); await W(500);
        if (prep === 'penJ' || prep === 'pure') { await pg.click('.nf-modal #nf-more'); await W(250); await pg.click('.nf-modal #nf-moreb [data-act="var"][data-k="' + (prep === 'penJ' ? 'pen' : 'acc') + '"][data-v="' + (prep === 'penJ' ? 'J' : 'pure') + '"]'); await W(400); }
        const film = await pg.evaluate(() => [...document.querySelectorAll('.nf-modal #nf-film li b')].map(e => e.textContent));
        await pg.click('.nf-modal #nw-create'); await W(1500);
        const sb = await pg.evaluate(() => [...document.querySelectorAll('#flw-sbar .flw-sb-steps .flw-sb-t')].map(e => e.textContent));
        res.push({ sc, prep, film, sb });
      }
      T('N6', res.every(r => J(r.film) === J(r.sb)) && J(res[0].film) === J(['旋律', '伴奏', '织体']) && J(res[1].film) === J(['旋律', '吉他', '节奏']) && J(res[2].film) === J(['和弦', '织体']) && res[3].film.length === 0,
        '三步胶片与建好后悬浮条同名同序：' + res.map(r => r.sc + (r.prep ? '/' + r.prep : '') + '＝' + (r.film.join('·') || '无')).join('；'), J(res));
      await ctx.close();
    }
    if (want('N9')) {
      const { ctx, pg } = await open(b, URL0, { tag: 'N9' });
      const out = [];
      for (const sc of ['gtr', 'pacc', 'kids', 'teach', 'sight', 'inst', 'chord']) {
        await pg.evaluate(() => __panel()); await W(500);
        const n0 = await pg.evaluate(() => docs.length);
        await pg.click('.nf-modal [data-scene="' + sc + '"]'); await W(250);
        await pg.click('.nf-modal #nw-create'); await W(1000);
        out.push(await pg.evaluate(o => ({ sc: o.sc, ok: docs.length === o.n0 + 1, kind: docTypeLabel(song) }), { sc, n0 }));
      }
      T('N9', out.every(x => x.ok), '点击数不增：7 个用途从面板打开起「点用途 + 创建」2 次就建成', J(out));
      await ctx.close();
    }
    if (want('N10')) {
      const { ctx, pg } = await open(b, withQ(URL0, 'new=sight&key=Dm&tempo=60&meter=5/3'), { tag: 'N10', wait: 2600 });
      const r = await pg.evaluate(() => ({ modal: !!document.querySelector('.nf-modal'), scene: NWP.state && NWP.state.scene,
        key: (document.querySelector('.nf-modal .nf-pc #nw-key') || { parentElement: null }).parentElement && document.querySelector('.nf-modal #nw-key').parentElement.querySelector('.nf-dot').dataset.src,
        tempo: document.querySelector('.nf-modal .nf-tempo .nf-dot') && document.querySelector('.nf-modal .nf-tempo .nf-dot').dataset.src, bad: __vis('.nf-modal #nf-linkbad'), badT: (document.querySelector('.nf-modal #nf-linkbad') || {}).textContent || '' }));
      T('N10', r.modal && r.scene === 'sight' && r.key === 'link' && r.tempo === 'link' && r.bad, '深链：调 / 速度圆点 data-src="link"；没认出的参数 #nf-linkbad 照出', J(r));
      await ctx.close();
    }
    /* ===== S2 / S3 启动台 ===== */
    if (want('S2') || want('S3')) {
      const { ctx, pg } = await open(b, URL0, { tag: 'S2' });
      const s = await pg.evaluate(() => ({ cards: [...document.querySelectorAll('#spd-nx .spd-grid [data-sp]')].map(e => e.dataset.sp + ':' + e.textContent.replace(/\s+/g, '')),
        vis: [...document.querySelectorAll('#spd-nx [data-sp]')].every(e => __vis(e) && __hit(e)), last: !!document.querySelector('#spd-nx [data-sp="last"]') || __vis('#spd-cards [data-sp="last"]'),
        drop: (() => { const d = document.getElementById('spd-drop'); if (!d) return null; const r = d.getBoundingClientRect(); return { h: r.height, w: r.width, lab: d.getAttribute('aria-label') }; })(),
        fmt: (document.querySelector('#spd-nx .spd-fmt') || {}).textContent || '', rc: [...document.querySelectorAll('#spd-nx .spd-rc [data-sp]')].map(e => e.dataset.sp + ':' + e.textContent.replace(/\s+/g, '')) }));
      if (want('S2')) {
        await pg.click('#spd-nx [data-sp="sc:pacc"]'); await W(700);
        const a = await pg.evaluate(() => ({ modal: !!document.querySelector('.nf-modal'), scene: NWP.state && NWP.state.scene, pad: startPadOn() }));
        await pg.evaluate(() => closeModal()); await W(300);
        await pg.click('#spd-nx [data-sp="new"]'); await W(700);
        const a2 = await pg.evaluate(() => ({ modal: !!document.querySelector('.nf-modal'), tab: NWP.state && NWP.state.tab })); await pg.evaluate(() => closeModal()); await W(300);
        await pg.click('#spd-nx .spd-hb[data-sp="imp"]'); await W(700);
        const a3 = await pg.evaluate(() => ({ modal: !!document.querySelector('.nf-modal'), tab: NWP.state && NWP.state.tab })); await pg.evaluate(() => closeModal()); await W(300);
        await pg.evaluate(() => { window.__opened = 0; const o = document.getElementById('b-open'); o.addEventListener('click', e => { window.__opened++; e.stopImmediatePropagation(); e.preventDefault(); }, true); });
        await pg.click('#spd-nx .spd-fmt'); await W(200); await pg.click('#spd-drop'); await W(200);
        const opened = await pg.evaluate(() => window.__opened);
        await pg.click('#spd-nx [data-sp="mine"]'); await W(700);
        const mine = await pg.evaluate(() => ({ modal: !!document.querySelector('#modal-mask .modal'), txt: ((document.querySelector('#modal-mask .modal') || {}).textContent || '').slice(0, 30) }));
        await pg.evaluate(() => closeModal());
        T('S2', s.cards.length === 6 && s.cards[0] === 'sc:gtr:吉他弹唱' && /sc:pacc:钢琴即兴伴奏考编/.test(s.cards[1]) && s.cards[5] === 'new:全部' && s.vis && s.fmt.replace(/\s+/g, '') === 'XMLGPMIDMTAB' && s.drop && s.drop.h >= 44 && s.drop.lab === '拖文件到这里'
          && J(s.rc) === J(['mine:我的曲谱']) && a.modal && a.scene === 'pacc' && a.pad && a2.modal && a2.tab === 'new' && a3.modal && a3.tab === 'import' && opened === 2 && mine.modal,
          '三区可见可点：新建 5 卡 + 全部（钢琴即兴伴奏 → 面板预选 pacc）；导入（徽章 / 拖放框 → 打开文件 ×2、区名 → 导入页、拖放框高 ' + (s.drop && s.drop.h) + '）；接着写（首访只「我的曲谱」→ 我的曲谱）', J({ s, a, a2, a3, opened, mine }));
        /* 有自己的谱：建一份写过音的谱 → 重开页面（同一上下文，存档在）→ 接着写有缩略图，点第 1 张＝切到那一窗口并离台 */
        await pg.evaluate(() => { __panel({ scene: 'blank' }); }); await W(500); await pg.fill('.nf-modal #nw-title', '我的歌A'); await pg.click('.nf-modal #nw-create'); await W(1200);
        await pg.evaluate(() => { song.measures[0].voxes[0][0].deg = 3; persist(); }); await W(400);
        await pg.reload(); await W(2400);
        const r2 = await pg.evaluate(() => ({ rc: [...document.querySelectorAll('#spd-nx .spd-rc [data-sp]')].map(e => e.dataset.sp + ':' + (e.querySelector('b') || e).textContent.replace(/\s+/g, '')), pad: startPadOn() }));
        await W(1200);
        const th = await pg.evaluate(() => ({ svg: !!document.querySelector('#spd-nx .spd-th svg.spd-svg'), score: document.getElementById('score').childElementCount }));
        await pg.click('#spd-nx [data-sp="rc:0"]'); await W(800);
        const r3 = await pg.evaluate(() => ({ pad: startPadOn(), title: song.title }));
        T('S2', r2.pad && r2.rc.length >= 2 && r2.rc.length <= 4 && /^rc:0:我的歌A$/.test(r2.rc[0]) && r2.rc[r2.rc.length - 1] === 'mine:全部' && th.svg && !r3.pad && r3.title === '我的歌A',
          '接着写：最近的谱（≤3 张，第 1 张《我的歌A》，离屏缩略图）+「全部」；点第 1 张＝切到那一窗口并离台', J({ r2, th, r3 }));
      }
      if (want('S3')) {
        const { ctx: c2, pg: p2 } = await open(b, URL0, { tag: 'S3', ls: { 'musetab-nw-last': JSON.stringify({ scene: 'pacc', v: { key: 'D', mode: 'major', beats: 3, unit: 4, tempo: 80, acc: 'mel' }, mel: 'J' }) } });
        const n0 = await p2.evaluate(() => ({ n: docs.length, last: !!document.querySelector('#spd-nx [data-sp="last"]'), lastVis: __vis('[data-sp="last"]') }));
        await p2.keyboard.press('Alt+Shift+N'); await W(1300);
        const n1 = await p2.evaluate(() => ({ n: docs.length, kind: docTypeLabel(song), key: song.key, pad: startPadOn() }));
        T('S3', !n0.last && !n0.lastVis && n1.n === n0.n + 1 && /伴奏/.test(n1.kind) && n1.key === 'D' && !n1.pad, '启动台无「按上次」卡；Alt+Shift+N 照建（' + n1.kind + ' 1=' + n1.key + '）', J({ n0, n1 }));
        await c2.close();
      }
      await ctx.close();
    }
    /* ===== Q1 快速新建 ===== */
    if (want('Q1')) {
      const q = async (u, ls) => { const { ctx, pg } = await open(b, u, { tag: 'Q1', ls });
        await pg.evaluate(() => { hideStartPad(); NWP.quickMenu(document.getElementById('flw-file')); }); await W(400);
        const r = await pg.evaluate(() => { const m = document.getElementById('nf-qm'); if (!m) return null; const f = m.querySelector('[data-q="last"]');
          return { first: f && f.querySelector('svg').outerHTML.slice(0, 160), qk: !!(f && f.querySelector('.nf-qk')), qv: f && (f.querySelector('.nf-qv') || {}).textContent, kbd: f && (f.querySelector('kbd') || {}).textContent, aria: f && f.getAttribute('aria-label'),
            imp: !!m.querySelector('[data-q="import"]'), panel: !!m.querySelector('[data-q="panel"]'), sc: [...m.querySelectorAll('[data-q]')].map(e => e.dataset.q).filter(x => !/last|panel|import/.test(x)), tags: [...m.querySelectorAll('.nf-tag')].map(e => e.textContent) }; });
        await ctx.close(); return r; };
      const ls = { 'musetab-nw-last': JSON.stringify({ scene: 'pacc', v: { key: 'C', mode: 'major', beats: 4, unit: 4, tempo: 72, acc: 'mel' }, mel: 'J' }) };
      const cur = await q(URL0, ls), old = await q(withQ(URL0, 'next=0'), ls);
      const icJG = await (async () => { const { ctx, pg } = await open(b, URL0, { tag: 'Q1i' }); const h = await pg.evaluate(() => pqIcon('type-jg', 20).slice(0, 160)); await ctx.close(); return h; })();
      T('Q1', cur && cur.first === icJG && !cur.qk && /1=C/.test(cur.qv) && cur.kbd === 'Alt+Shift+N' && /钢琴即兴伴奏/.test(cur.aria) && !cur.imp && cur.panel && J(cur.sc) === J(old.sc) && J(cur.tags) === J(old.tags) && old.imp && old.qk,
        '快速新建首项：上次用途谱类图标（type-jg）、谱名只进读屏名、调拍小标签与键帽照留；无「从已有音乐…」；9 用途 + 徽标与 ?next=0 相同；「新建面板…」照有', J({ cur, old }));
    }
  } catch (e) { T('X', false, '执行异常', e && e.stack || e); }
  await b.close();
  T('E', !pageErrs.length, '页面脚本错误 0', J(pageErrs.slice(0, 5)));
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + '）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})();
