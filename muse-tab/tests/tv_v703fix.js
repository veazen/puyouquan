'use strict';
/* v70.3 定位纠偏（基石方案 docs/plan-2026-11-foundation.md §2.3 D1–D19、§3.1「验收 · 纠偏」；负责人 2026-11-06「按建议推进」）。file:// 直载，真实点击。
   P1  新外壳 1280×800 启动台：可见的「常用 / 新建」chip 的 data-sp 集合＝D19（sc:gtr · sc:pacc · sc:vocal · sc:inst · sc:solo），显示名＝吉他弹唱 · 钢琴伴奏歌谱 · 合唱谱 · 器乐独奏 · 指弹，无用途小标；
       静态 #spd-cards 的常用 chip 行也被 JS 换成同一组（节点在、静态 HTML 不动）；点「合唱谱」→ 面板落 合唱谱 › 简谱合唱，点「器乐独奏」→ 五线谱 › 器乐（data-sp 仍是 sc:*）
   P2  新外壳 1280×800 新建面板常用 4 卡显示名＝钢琴伴奏歌谱 / 简易弹唱 / 单旋律五线谱 / 线简对照谱、无 .nf-tag；快速新建 ▾ 常用组同名、无 .nf-tag
   P3  首屏可见文本（新外壳 1280×800、375×667 窄窗、375×667 手机）：启动台、新建面板（窄窗＝旧形态面板，手机＝「在电脑上开始一份谱」）、快速新建 ▾ 不含「考编 / 艺考 / 师范」，
       「课堂」只出现在「课堂乐器」里；官网首页、制谱页首屏（1280×800 / 375×667）同口径
   P4  旧外壳（?shell=classic）与 ?next=0：启动台常用 chip 与新建面板照旧（4 个用途小标、原名、静态副文案）——逐字节零差异由 tv_shellflow S0 / tv_newpanel2 N0 对拍，这里只抽查不被 JS 改写
   P5  页面脚本错误 0
   env：MUSETAB_URL 被测编辑器（缺省 ../index.html）· MUSETAB_SITE 官网目录（缺省 ../site）· CHROMIUM_PATH */
const { chromium } = require('playwright');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, total = 0;
const T = (name, ok, msg, d) => { total++; if (ok) pass++; console.log((ok ? '✅ ' : '❌ ') + name + ' ' + msg + (ok || !d ? '' : '：' + d)); };
const errs = [];
/* 禁用词：考编 / 艺考 / 师范；「课堂」去掉「课堂乐器」后不得再出现 */
const badWords = t => { const x = String(t || ''); const out = []; for (const w of ['考编', '艺考', '师范']) if (x.includes(w)) out.push(w); if (x.replace(/课堂乐器/g, '').includes('课堂')) out.push('课堂'); return out; };
const VIS = `window.__vis=e=>{ if(!e||!e.isConnected) return false; const r=e.getBoundingClientRect(); if(!(r.width>0&&r.height>0)) return false;
  for(let x=e;x&&x.nodeType===1;x=x.parentElement){ const cs=getComputedStyle(x); if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0') return false; } return true; };
  /* 可见文本：只收可见文字节点（父元素可见、落在视口内） */
  window.__vtext=(root, viewport)=>{ if(!root) return ''; const out=[], wk=document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while((n=wk.nextNode())){ const t=n.nodeValue.replace(/\\s+/g,' ').trim(); if(!t) continue; const p=n.parentElement; if(!p || !__vis(p)) continue;
      if(viewport){ const r=p.getBoundingClientRect(); if(r.bottom<=0 || r.top>=innerHeight || r.right<=0 || r.left>=innerWidth) continue; }
      out.push(t); } return out.join(' '); };`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (u, w, h, mob) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, mob ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}));
    await ctx.addInitScript(VIS);
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(u.slice(-40) + ' ' + w + ': ' + e.message));
    await pg.goto(u); await W(1600);
    return { ctx, pg };
  };
  try {
    /* ===== P1 启动台 chip ===== */
    {
      const { ctx, pg } = await open(URL0, 1280, 800);
      const r = await pg.evaluate(() => ({
        nx: flowNx(), all: flowNxAll(),
        vis: [...document.querySelectorAll('#start-pad [data-sp^="sc:"]')].filter(__vis).map(e => e.dataset.sp + ':' + e.textContent.replace(/\s+/g, '')),
        tags: [...document.querySelectorAll('#start-pad .nf-tag')].filter(__vis).length,
        stat: [...document.querySelectorAll('#spd-cards .spd-chips:not(.spd-sub) [data-sp]')].map(e => e.dataset.sp + ':' + e.textContent.replace(/\s+/g, '')),
        statTags: document.querySelectorAll('#spd-cards .nf-tag').length,
        sub: [...document.querySelectorAll('#spd-cards [data-sp="new"] > span, #spd-cards [data-sp="mstart"] > span')].map(e => e.textContent) }));
      const want = ['sc:gtr:吉他弹唱', 'sc:pacc:钢琴伴奏歌谱', 'sc:vocal:合唱谱', 'sc:inst:器乐独奏', 'sc:solo:指弹'];
      T('P1', r.nx && r.all && J(r.vis) === J(want) && !r.tags, '新外壳 1280×800 启动台可见 chip＝D19 五个（data-sp 集合 + 显示名）、无用途小标', J(r));
      T('P1', J(r.stat) === J(want) && !r.statTags && r.sub.every(t => !badWords(t).length && !/按用途/.test(t)), '静态 #spd-cards 常用 chip 行与主卡副文案也被新外壳改写（节点在）', J(r));
      const land = [];
      for (const [k, exp] of [['vocal', 'fm:hechang.jianpu'], ['inst', 'fm:wuxian.qiyue'], ['pacc', 'sc:pacc'], ['gtr', 'fm:jita.tanchang'], ['solo', 'fm:jita.zhitan']]) {
        await pg.click('#spd-nx [data-sp="sc:' + k + '"]'); await W(500);
        land.push(Object.assign({ k, exp }, await pg.evaluate(() => ({ open: !!document.querySelector('.nf-modal'), pick: NWP.state ? NWP.state.pick : null, scene: NWP.state ? NWP.state.scene : null }))));
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} }); await W(250);
      }
      T('P1', land.every(x => x.open && x.pick === x.exp), '点 chip 落点：合唱谱 → 合唱谱 › 简谱合唱，器乐独奏 → 五线谱 › 器乐，钢琴伴奏歌谱 → 常用卡，吉他弹唱 / 指弹 → 吉他谱', J(land));
      /* ===== P2 新建面板常用卡 · 快速新建 ▾ ===== */
      await pg.evaluate(() => showNewWizard()); await W(700);
      const p2 = await pg.evaluate(() => ({ cards: [...document.querySelectorAll('.nf-modal .nf-left [data-scene]')].map(e => e.dataset.scene + ':' + (e.querySelector('b') || {}).textContent),
        tags: document.querySelectorAll('.nf-modal .nf-tag').length }));
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} hideStartPad(); NWP.quickMenu(document.getElementById('flw-file')); }); await W(400);
      const q = await pg.evaluate(() => { const m = document.getElementById('nf-qm'); return m ? { cy: [...m.querySelectorAll('[role=group][aria-labelledby="nf-qh-cy"] [data-q]')].map(e => e.dataset.q + ':' + (e.querySelector('b') || {}).textContent), tags: m.querySelectorAll('.nf-tag').length } : null; });
      await pg.evaluate(() => { try { NWP.quickMenuClose(); } catch (_) {} });
      T('P2', J(p2.cards) === J(['pacc:钢琴伴奏歌谱', 'kids:简易弹唱', 'sight:单旋律五线谱', 'teach:线简对照谱', 'blank:空白谱', 'custom:自选']) && !p2.tags,
        '新建面板常用 4 卡＝钢琴伴奏歌谱 / 简易弹唱 / 单旋律五线谱 / 线简对照谱、无用途小标', J(p2));
      T('P2', q && J(q.cy) === J(['pacc:钢琴伴奏歌谱', 'kids:简易弹唱', 'sight:单旋律五线谱', 'teach:线简对照谱']) && !q.tags, '快速新建 ▾ 常用组同名、无用途小标', J(q));
      await ctx.close();
    }
    /* ===== P3 首屏可见文本（编辑器） ===== */
    for (const [w, h, mob, tag] of [[1280, 800, 0, '1280×800'], [375, 667, 0, '375×667 窄窗'], [375, 667, 1, '375×667 手机']]) {
      const { ctx, pg } = await open(URL0, w, h, mob);
      const pad = await pg.evaluate(() => __vtext(document.getElementById('start-pad'), true));
      await pg.evaluate(() => showNewWizard()); await W(800);
      const panel = await pg.evaluate(() => { const m = document.querySelector('.nf-modal') || document.querySelector('.nw-mpc-mask .modal'); return m ? __vtext(m, false) : ''; });
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} try { hideStartPad(); } catch (_) {} try { NWP.quickMenu(document.getElementById('flw-file') || document.body); } catch (_) {} }); await W(400);
      const qm = await pg.evaluate(() => __vtext(document.getElementById('nf-qm'), false));
      await ctx.close();
      const bad = { pad: badWords(pad), panel: badWords(panel), qm: badWords(qm) };
      T('P3', pad.length > 0 && panel.length > 0 && !bad.pad.length && !bad.panel.length && !bad.qm.length,
        '新外壳 ' + tag + '：启动台 / 新建面板 / 快速新建 ▾ 可见文本无「考编 / 艺考 / 师范」，「课堂」只在「课堂乐器」', J({ bad, pad: pad.slice(0, 160), panel: panel.slice(0, 200), qm: qm.slice(0, 160) }));
    }
    /* ===== P3 官网首页 / 制谱页首屏 ===== */
    for (const pgName of ['index.html', 'make.html']) for (const [w, h] of [[1280, 800], [375, 667]]) {
      const { ctx, pg } = await open('file://' + path.join(SITE, pgName), w, h, 0);
      const t = await pg.evaluate(() => __vtext(document.body, true));
      await ctx.close();
      T('P3', t.length > 20 && !badWords(t).length, '官网 ' + pgName + ' ' + w + '×' + h + ' 首屏可见文本无「考编 / 艺考 / 师范 / 课堂」', J({ bad: badWords(t), t: t.slice(0, 200) }));
    }
    /* ===== P4 旧外壳 / ?next=0 不被改写 ===== */
    for (const [q, tag] of [['shell=classic', '旧外壳'], ['next=0', '?next=0']]) {
      const { ctx, pg } = await open(withQ(URL0, q), 1280, 800);
      const r = await pg.evaluate(() => ({ all: flowNxAll(), tags: [...document.querySelectorAll('#spd-cards .spd-chips .nf-tag')].map(e => e.textContent).join(','),
        chips: [...document.querySelectorAll('#spd-cards .spd-chips:not(.spd-sub) [data-sp]')].map(e => e.dataset.sp).join(','),
        sub: (document.querySelector('#spd-cards [data-sp="new"] > span:last-child') || {}).textContent || '', nx: !!document.querySelector('#spd-nx:not([hidden])') }));
      await pg.evaluate(() => showNewWizard()); await W(700);
      const p = await pg.evaluate(() => ({ tags: [...document.querySelectorAll('.nf-modal .nf-tag')].map(e => e.textContent).join(','), grp: [...document.querySelectorAll('.nf-modal .nf-gl')].map(e => e.textContent).join(',') }));
      await ctx.close();
      T('P4', !r.all && !r.nx && r.tags === '考编,课堂,艺考,师范' && r.chips === 'sc:gtr,sc:pacc,sc:teach,sc:sight,sc:kids' && /^按用途选：/.test(r.sub)
        && p.tags === '考编,师范,课堂,艺考,乐队' && /课堂声乐/.test(p.grp), tag + '：启动台常用 chip / 副文案与新建面板小标、组名照旧（不被 JS 改写）', J({ r, p }));
    }
  } catch (e) { T('X', false, '执行异常', String(e && e.stack || e).slice(0, 600)); }
  await b.close();
  T('P5', !errs.length, '页面脚本错误 0', J(errs.slice(0, 5)));
  console.log('\n' + (pass === total ? '✅' : '❌') + ' tv_v703fix ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
