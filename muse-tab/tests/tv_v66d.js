/* v66.5 全站换色 C「极光靛紫」（编辑器）——色板真源 docs/design-2026-10d/C/palette.md
   T1 关键令牌：五种主题状态（浅 / 深 / 系统深 / 系统深+显式浅 / 系统浅+显式深）下 :root 令牌取 C 的浅深值
   T2 深色框架：main-bar / doc-tabs / mixer-dock 底色＝--chrome（浅 #161433 / 深 #1c1a3d，RGB 均值 <80），带 --glow 1px 内描发丝线
   T3 旧色残留：E1 编辑器浅 / E2 编辑器深 / E3 启动台 / E5 新建向导 / E6 手机看谱 等价场景，旧品牌色（朱砂 / 墨绿 / 暖米）探针 0 处
      （探针逻辑与方案期 harness 相同：可见元素的 color / background / border / fill / stroke 与背景渐变）
   T4 关键对比度（页面计算值）：正文 / 次级 / 三级字、强调实底上的字（深色主题深墨字）、主按钮白字、链接、框架字、焦点环、谱纸刻版灰
   T5 打印：五种主题状态 × print 媒体，--paper #fff / --ink #000、body 白底、谱面墨色 rgb(0,0,0)、刻版灰＝--ed-print-muted
   T6 导出：exportPNG 与分享卡经 svgResolveVars 后的 SVG 字符串无旧色、无残留 var()；浅深主题导出逐字相同（印刷色不随主题）
   T7 启动遮罩：底 / 字读 --bg / --text（含「系统深色 + 显式浅色」）、Logo 与三音符＝品牌三色，内联脚本不再写死深色值
   T8 meta theme-color：浅深两条，＝两主题的 --chrome
   T9 语义色保留：收藏红星 rgb(195,58,41)、告警琥珀、成功绿、独奏琥珀不随品牌
   T10 播放带 / 播放竖线读 --play-band（极光蓝），与靛紫编辑笔解耦；反色纸上跟随反色编辑笔
   T11 深色主题控件底不是谱纸白（新建向导卡 / 帮助步骤卡读 --ed-raise＝--panel），浅色仍是纸白
   T12 深色框架容器内焦点环 #8576f8，框架外仍是 --focus
   T13 隐藏态小字对比 ≥4.5（验收补修，方案覆盖层未覆盖）：坞内声像读数 / 密集标尺小节号 / 轨道小节格编号、
       手机「智能」钮（深色主栏上）、谱库卡曲名与本地封面骨架（深色主题不再读谱面墨 --ink）、个人中心当前项
   突变实证：MUSETAB_URL 指向 v66.4（换色前，git HEAD 版）复跑 → T1–T8、T10–T13 全红；
   绿的两条是 T9 语义色保留与「无页面脚本错误」——两者本就应不随换色变化。
   T13 另对「验收补修前」的版本复跑为红（声像读数 2.71、密集标尺 2.17、手机智能钮 2.43、深色谱库曲名 1.08、小节格 3.6–4.4、个人中心 4.47）。
   v68.2 切默认（flow）：T1、T3–T11 照旧在默认外壳；外壳相关的三条两种外壳各断言一次——
   T2 flow：行 1 #flw-r1 底＝--chrome、发丝线改画在 #flw-r1::after（1px · --glow · 底边，计划 §2.4；旧主栏 .main-bar 在 flow 下隐藏）；页签条 #doc-tabs 并入行 1、
      不另起底色（透明，看到的是行 1 的 --chrome）；播放坞 #mixer-dock 同旧口径。旧外壳段（?shell=classic）原断言不变（.main-bar / #doc-tabs / #mixer-dock）。
   T12 flow：行 1 / 页签 / 状态栏内焦点环 #8576f8，左栏 #flw-left 与行 2 #editbar（浅底）＝--focus；旧外壳段原断言不变。
   T13 坞内声像读数 / 轨道小节格编号（混音台独有，flow 没有混音台）与手机「智能」钮（旧手机主栏）只在旧外壳段断言；flow 段量可见的同类小字：
      状态栏小节格编号 / 坞、行 1 页签字 / 行 1、手机顶栏 #flw-mtop 文字 / 顶栏，谱库卡曲名、封面骨架、个人中心照旧。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => q ? u + (u.includes('?') ? '&' : '?') + q : u;
const FILE = URL0.startsWith('file://') ? URL0.slice(7) : path.resolve(__dirname, '../index.html');
const HTML = fs.readFileSync(FILE, 'utf8');
const C = {
  light: { '--bg': '#f4f4f9', '--toolbar': '#f8f8fc', '--panel': '#ffffff', '--text': '#1b1a2e', '--muted': '#5c5b73', '--faint': '#6a6981',
    '--border': '#e1e0ec', '--accent': '#5b4cf0', '--accent-ink': '#4a3ad6', '--btn-pri': '#5b4cf0', '--focus': '#5b4cf0',
    '--chrome': '#161433', '--ed-on-accent': '#fff', '--ed-on-pri': '#fff', '--play-band': '#1f8be6', '--grad-2': '#3366ee', '--grad-3': '#0891b2', '--danger': '#b45309' },
  dark: { '--bg': '#0f0f17', '--toolbar': '#14141e', '--panel': '#1b1b28', '--text': '#ecebf6', '--muted': '#a6a4c0', '--faint': '#9392ae',
    '--border': '#2f2e44', '--accent': '#9384ff', '--accent-ink': '#b0a7ff', '--btn-pri': '#5b4cf0', '--focus': '#a396ff',
    '--chrome': '#1c1a3d', '--ed-on-accent': '#0e0d1d', '--ed-on-pri': '#fff', '--play-band': '#1f8be6', '--grad-2': '#5b9cff', '--grad-3': '#38cdf0', '--danger': '#ffa424' },
};
const CONST = { '--paper': '#fdfdff', '--ink': '#141414', '--ed-brand': '#5b4cf0', '--ed-brand-2': '#3366ee', '--ed-brand-3': '#0891b2', '--ed-print-muted': '#5c5b73', '--ed-print-border': '#e1e0ec' };
/* 五种主题状态：[名, 系统配色, data-theme, 生效主题] */
const STATES = [['浅', 'light', null, 'light'], ['深', 'dark', 'dark', 'dark'], ['系统深', 'dark', null, 'dark'], ['系统深+显式浅', 'dark', 'light', 'light'], ['系统浅+显式深', 'light', 'dark', 'dark']];
const OLD = /#c33a29|#d24a37|#e2705d|#b02f20|#df5a45|#1f3a34|#f3f0e8|#f7f4ec|#fbfaf5|#faf9f6|#e5e2dc|#e4ddcd|#ece6d8|#6b6357|#a49c8d|#746c5e|#20211d|rgba\(195,\s*58,\s*41/i;
const hex2 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const rgbOf = h => 'rgb(' + hex2(h).join(', ') + ')';
/* 旧品牌色探针（与方案期 tc/harness.js 同口径） */
const PROBE = () => {
  const toRGB = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (p.length > 3 && p[3] === 0) return null; return p.slice(0, 3); };
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
  const cls = c => { const [h, s, l] = hsl(c); if ((h < 14 || h > 350) && s > .45 && l > .3 && l < .75) return 'cinnabar'; if (h > 145 && h < 180 && l < .3 && s > .15) return 'ink-green'; if (h > 33 && h < 56 && s > .12 && l > .84 && l < .985) return 'warm-cream'; return null; };
  const hits = {};
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight * 1.5; };
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue; if (el.closest('#paper svg, #print-pages, .gl-paper, svg.score')) continue;
    const cs = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke']) {
      if (prop.startsWith('border') && parseFloat(cs.borderTopWidth) === 0) continue;
      if (prop === 'color' && !(el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) continue;
      const c = toRGB(cs[prop]); if (!c) continue; const k = cls(c); if (!k) continue;
      const sel = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '');
      const key = k + ' ' + prop + ' ' + sel; hits[key] = (hits[key] || 0) + 1;
    }
    const bi = cs.backgroundImage; if (bi && bi !== 'none' && /rgb/.test(bi)) { for (const m of bi.match(/rgba?\([^)]+\)/g) || []) { const c = toRGB(m); if (c && cls(c)) { const key = cls(c) + ' background-image ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''); hits[key] = (hits[key] || 0) + 1; } } }
  }
  return Object.entries(hits).sort((a, b) => b[1] - a[1]);
};
/* 页面内：令牌 → 计算色（rgba 数组），可指定作用域元素（谱面隔离层 #paper 下的 --muted 等） */
const COLORLIB = `window.__col = (s) => { s = String(s || '').trim(); let m = s.match(/^rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.e-]+))?\\)/);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : +m[4]]; return null; };
  window.__tok = (name, scope) => { const e = document.createElement('i'); e.style.cssText = 'position:absolute;color:var(' + name + ')'; (scope || document.body).appendChild(e);
    const c = getComputedStyle(e).color; e.remove(); return __col(c); };
  window.__over = (f, b) => f[3] >= 1 ? f.slice(0, 3) : f.slice(0, 3).map((c, i) => c * f[3] + b[i] * (1 - f[3]));
  window.__L = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
  window.__cr = (fg, bg) => { const B = bg.slice(0, 3), F = __over(fg, B); const a = __L(F), b = __L(B); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (scheme, theme, vp, q) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1440, height: 900 }, colorScheme: scheme });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(withQ(URL0, q)); await pg.waitForTimeout(900);
    await pg.evaluate(t => { window.guardReplace = p => p(); if (t) document.documentElement.dataset.theme = t; }, theme);
    await pg.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    await pg.evaluate(COLORLIB);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const LOAD = `hideStartPad(); loadSong(PRESETS[0].make()); render(); sel.mi=1; sel.ci=2; render();`;

  /* ---------- T1 关键令牌（五态） ---------- */
  {
    const bad = [];
    for (const [nm, scheme, theme, eff] of STATES) {
      const pg = await open(scheme, theme);
      const names = Object.keys(C[eff]).concat(Object.keys(CONST));
      const got = await pg.evaluate(ns => { const cs = getComputedStyle(document.documentElement); return Object.fromEntries(ns.map(n => [n, cs.getPropertyValue(n).trim().toLowerCase()])); }, names);
      const want = Object.assign({}, C[eff], CONST);
      for (const n of names) if (got[n] !== want[n]) bad.push(nm + ' ' + n + '=' + got[n] + '≠' + want[n]);
      await close(pg);
    }
    T(!bad.length, 'T1 关键令牌：五种主题状态取 C 的浅深值（含主题无关常量）', bad.slice(0, 6).join('；'));
  }

  /* ---------- T2 深色框架底色 + 发丝线 ---------- */
  {
    const out = {}; let ok = true;
    const GLOW = /rgba\(139, 125, 255, 0\.3\).*inset|inset.*rgba\(139, 125, 255, 0\.3\)/;
    const avgOf = bg => { const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(bg || ''); return m ? (+m[1] + +m[2] + +m[3]) / 3 : 999; };
    /* 旧外壳段（?shell=classic）：原断言 */
    for (const [nm, scheme, theme, eff] of [STATES[0], STATES[1]]) {
      const pg = await open(scheme, theme, null, 'shell=classic');
      await pg.evaluate(LOAD); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => { const g = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, sh: cs.boxShadow }; };
        return { flow: document.body.classList.contains('flow'), bar: g('body.shell #top .main-bar'), tabs: g('#doc-tabs'), dock: g('#mixer-dock') }; });
      const want = rgbOf(C[eff]['--chrome']);
      if (r.flow) ok = false;
      for (const k of ['bar', 'tabs', 'dock']) {
        const x = r[k];
        if (!x || x.bg !== want || avgOf(x.bg) >= 80 || !GLOW.test(x.sh)) ok = false;
      }
      out['旧·' + nm] = r; await close(pg);
    }
    /* flow 段（默认外壳）：行 1 #flw-r1 底＝--chrome、发丝线＝#flw-r1::after（1px、--glow、贴底边）；#doc-tabs 在行 1 内且不另起底色；播放坞同旧口径 */
    for (const [nm, scheme, theme, eff] of [STATES[0], STATES[1]]) {
      const pg = await open(scheme, theme);
      await pg.evaluate(LOAD); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => { const g = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); const q = e.getBoundingClientRect(); return { bg: cs.backgroundColor, sh: cs.boxShadow, vis: q.width > 0 && q.height > 0 }; };
        const r1 = document.getElementById('flw-r1'), a = r1 ? getComputedStyle(r1, '::after') : null;
        return { flow: document.body.classList.contains('flow'), bar: g('#flw-r1'), hair: a ? { c: a.content, bg: a.backgroundColor, h: a.height, b: a.bottom, pos: a.position, op: a.opacity } : null,
          tabs: Object.assign(g('#doc-tabs') || {}, { inR1: !!(r1 && r1.contains(document.getElementById('doc-tabs'))) }), dock: g('#mixer-dock'), oldBar: g('body.shell #top .main-bar') }; });
      const want = rgbOf(C[eff]['--chrome']);
      const hairOk = r.hair && r.hair.c !== 'none' && r.hair.bg === 'rgba(139, 125, 255, 0.3)' && r.hair.h === '1px' && r.hair.b === '0px' && r.hair.pos === 'absolute' && +r.hair.op > 0;
      if (!(r.flow && r.bar && r.bar.vis && r.bar.bg === want && avgOf(r.bar.bg) < 80 && hairOk
        && r.tabs.inR1 && r.tabs.vis && r.tabs.bg === 'rgba(0, 0, 0, 0)'
        && r.dock && r.dock.vis && r.dock.bg === want && avgOf(r.dock.bg) < 80 && GLOW.test(r.dock.sh) && r.oldBar && !r.oldBar.vis)) ok = false;
      out['flow·' + nm] = r; await close(pg);
    }
    T(ok, 'T2 主栏 / 页签条 / 播放坞底＝--chrome（深色框架，RGB 均值 <80）+ --glow 1px 发丝线（旧外壳：.main-bar / #doc-tabs / #mixer-dock 内描；flow：行 1 #flw-r1 + ::after 发丝线、页签并入行 1 不另起底、#mixer-dock）', JSON.stringify(out).slice(0, 700));
  }

  /* ---------- T3 旧色残留（等价场景） ---------- */
  {
    const scenes = [
      ['E1 编辑器浅', 'light', null, null, LOAD],
      ['E2 编辑器深', 'dark', 'dark', null, LOAD],
      ['E3 启动台', 'light', null, null, null],
      ['E5 新建向导', 'light', null, null, `hideStartPad(); loadSong(PRESETS[0].make()); render(); try{ showNewWizard(); }catch(e){}`],
      ['E6 手机看谱', 'light', null, { width: 390, height: 844 }, `hideStartPad(); toast=()=>{}; enterShareViewer({ song: PRESETS[10].make() });`],
    ];
    const res = {};
    for (const [nm, scheme, theme, vp, setup] of scenes) {
      const pg = await open(scheme, theme, vp);
      if (setup) { await pg.evaluate(setup); await pg.waitForTimeout(500); }
      const hits = await pg.evaluate(PROBE);
      res[nm] = { n: hits.reduce((a, h) => a + h[1], 0), top: hits.slice(0, 3) };
      await close(pg);
    }
    T(Object.values(res).every(x => x.n === 0), 'T3 E1/E2/E3/E5/E6 等价场景旧色（朱砂 / 墨绿 / 暖米）残留 0 处', JSON.stringify(res).slice(0, 500));
  }

  /* ---------- T4 关键对比度（页面计算值） ---------- */
  {
    const out = {}; const fails = [];
    for (const [nm, scheme, theme, eff] of [STATES[0], STATES[1]]) {
      const pg = await open(scheme, theme);
      await pg.evaluate(LOAD); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => {
        const t = n => __tok(n), P = document.getElementById('paper');
        const chrome = t('--chrome');
        const tabBg = __over([236, 234, 255, .07], chrome.slice(0, 3));
        const el = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return [__col(cs.color), __col(cs.backgroundColor)]; };
        const ltab = el('body.shell .ltab.on'), play = el('#b-play'), dtab = el('.dtab.on');
        return {
          'text/bg': __cr(t('--text'), t('--bg')), 'muted/bg': __cr(t('--muted'), t('--bg')),
          'faint/bg': __cr(t('--faint'), t('--bg')), 'faint/panel': __cr(t('--faint'), t('--panel')), 'faint/toolbar': __cr(t('--faint'), t('--toolbar')),
          'on-pri/btn-pri': __cr(t('--ed-on-pri'), t('--btn-pri')), 'on-accent/accent': __cr(t('--ed-on-accent'), t('--accent')),
          'accent-ink/panel': __cr(t('--accent-ink'), t('--panel')), 'accent/panel': __cr(t('--accent'), t('--panel')),
          'chrome-text/chrome': __cr(t('--chrome-text'), chrome), 'chrome-muted/chrome': __cr(t('--chrome-muted'), chrome),
          'chrome-muted/页签底': __cr(t('--chrome-muted'), tabBg), 'chrome-accent/chrome': __cr(t('--ed-chrome-accent'), chrome),
          '.ltab.on': ltab && __cr(ltab[0], ltab[1]), '#b-play': play && __cr(play[0], play[1]), '.dtab.on': dtab && __cr(dtab[0], dtab[1]),
          'focus/bg≥3': __cr(t('--focus'), t('--bg')),
          '谱纸 sc-muted/paper': __cr(__tok('--muted', P), __tok('--paper', P)), '谱纸 sc-faint/paper': __cr(__tok('--faint', P), __tok('--paper', P)),
          '谱纸 编辑笔/paper≥3': __cr(__tok('--accent', P), __tok('--paper', P)),
        };
      });
      for (const [k, v] of Object.entries(r)) { const min = /≥3/.test(k) ? 3 : 4.5; if (!(v >= min)) fails.push(nm + ' ' + k + '=' + v); }
      out[nm] = r; await close(pg);
    }
    T(!fails.length, 'T4 关键对比度（浅深两套，页面计算值）全部达标', fails.length ? fails.join('；') : JSON.stringify(out).slice(0, 300));
  }

  /* ---------- T5 打印白底黑字（五态 × print） ---------- */
  {
    const bad = [];
    for (const [nm, scheme, theme] of STATES) {
      const pg = await open(scheme, theme);
      await pg.evaluate(LOAD); await pg.waitForTimeout(300);
      await pg.emulateMedia({ media: 'print', colorScheme: scheme });
      const r = await pg.evaluate(() => { const R = getComputedStyle(document.documentElement), P = document.getElementById('paper');
        const txt = [...document.querySelectorAll('#score text')].find(e => e.getAttribute('fill') === 'var(--ink)');
        return { paper: R.getPropertyValue('--paper').trim(), ink: R.getPropertyValue('--ink').trim(), body: getComputedStyle(document.body).backgroundColor,
          inkFill: txt ? getComputedStyle(txt).fill : null, pmuted: getComputedStyle(P).getPropertyValue('--muted').trim(), k: R.getPropertyValue('--ed-print-muted').trim() }; });
      if (r.paper !== '#fff' || r.ink !== '#000' || r.body !== 'rgb(255, 255, 255)' || r.inkFill !== 'rgb(0, 0, 0)' || !r.k || r.pmuted !== r.k) bad.push(nm + ' ' + JSON.stringify(r));
      await close(pg);
    }
    T(!bad.length, 'T5 打印：五种主题状态均白纸（--paper #fff / body 白底）黑墨（--ink #000、谱面字 rgb(0,0,0)），刻版灰＝纸面值', bad.slice(0, 2).join('；'));
  }

  /* ---------- T6 导出 SVG / 分享卡印刷色 ---------- */
  {
    const grab = async (scheme, theme) => { const pg = await open(scheme, theme); await pg.evaluate(LOAD); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => { const o = svgResolveVars; let x = ''; svgResolveVars = s => { x = o(s); return x; };
        try { exportPNG(1); } finally { svgResolveVars = o; }
        const card = svgResolveVars(buildShareCardSVG());
        return { png: x, card }; });
      await close(pg); return r; };
    const L = await grab('light', null), D = await grab('dark', 'dark');
    const leftVar = s => (s.match(/var\(--(?!font-)[a-z0-9-]+\)/g) || []).slice(0, 3);
    const cardOk = /stop-color="#5b4cf0"/.test(L.card) && /stop-color="#3366ee"/.test(L.card) && /stop-color="#0891b2"/.test(L.card) && /fill="#fdfdff"/.test(L.card);
    const r = { pngLen: L.png.length, oldPng: (L.png.match(OLD) || [])[0] || null, oldCard: (L.card.match(OLD) || [])[0] || null,
      varPng: leftVar(L.png), varCard: leftVar(L.card), sameTheme: L.png === D.png && L.card === D.card, cardOk, tv_print_T6: /fill="#8a8a8a"/.test(L.card) };
    T(r.pngLen > 1000 && !r.oldPng && !r.oldCard && !r.varPng.length && !r.varCard.length && r.sameTheme && cardOk && r.tv_print_T6,
      'T6 导出 PNG / 分享卡 SVG：无旧色、无残留 var()、品牌渐变三色 + 冷白卡底、浅深主题导出逐字相同', JSON.stringify(r));
  }

  /* ---------- T7 启动遮罩 ---------- */
  {
    const m = HTML.match(/<div id="boot-veil"[\s\S]*?\n<\/div>/);
    const inlineDark = /_bv\.style\.background\s*=\s*'#/.test(HTML);
    const out = {}; let ok = !!m && !inlineDark;
    for (const [nm, scheme, theme, eff] of [STATES[0], STATES[1], STATES[3]]) {
      const pg = await open(scheme, theme);
      const r = await pg.evaluate(html => { document.getElementById('boot-veil')?.remove(); const w = document.createElement('div'); w.innerHTML = html; const v = w.firstElementChild; document.body.appendChild(v);
        const cs = e => getComputedStyle(e); const notes = [...v.querySelectorAll('.bv-staff b')].map(e => cs(e).backgroundColor);
        const r = { bg: cs(v).backgroundColor, txt: cs(document.getElementById('bv-txt')).color, logo: cs(v.firstElementChild).backgroundImage.slice(0, 120), notes };
        v.remove(); return r; }, m ? m[0] : '<div id="boot-veil"></div>');
      const c = C[eff];
      const good = r.bg === rgbOf(c['--bg']) && r.txt === rgbOf(c['--text']) && /rgb\(91, 76, 240\).*rgb\(51, 102, 238\).*rgb\(8, 145, 178\)/.test(r.logo)
        && r.notes.join() === ['rgb(91, 76, 240)', 'rgb(51, 102, 238)', 'rgb(8, 145, 178)'].join();
      if (!good) ok = false; out[nm] = r; await close(pg);
    }
    T(ok, 'T7 启动遮罩：底 / 字随四态主题（含系统深+显式浅）、Logo 与三音符＝品牌三色，无写死深色分支', JSON.stringify({ found: !!m, inlineDark, out }).slice(0, 500));
  }

  /* ---------- T8 meta theme-color ---------- */
  {
    const pg = await open('light', null);
    const r = await pg.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map(e => [e.getAttribute('content'), e.getAttribute('media')]));
    await close(pg);
    const li = r.find(x => /light/.test(x[1] || '')), dk = r.find(x => /dark/.test(x[1] || ''));
    T(r.length === 2 && li && dk && li[0].toLowerCase() === C.light['--chrome'] && dk[0].toLowerCase() === C.dark['--chrome'], 'T8 meta theme-color 浅深两条＝--chrome', JSON.stringify(r));
  }

  /* ---------- T9 语义色保留（不随品牌） ---------- */
  {
    const out = {};
    for (const [nm, scheme, theme] of [STATES[0], STATES[1]]) {
      const pg = await open(scheme, theme, { width: 390, height: 844 });
      await pg.evaluate(async () => { const data = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 1, lyr: 1 }); data.title = '演示';
        window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ score: { id: 'm123', title: '演示', singer: '测试', author: '官方', updated_at: 100, data }, stats: { views: 1, likes: 0, favs: 0 } }) });
        await openRemotePub('m123'); await new Promise(z => setTimeout(z, 150)); });
      out[nm] = await pg.evaluate(() => { const f = document.getElementById('vw-fav'); if (!f) return { err: 'no #vw-fav' }; f.classList.add('on'); const svg = f.querySelector('svg');
        const solo = document.createElement('button'); solo.className = 'mx-btn solo on'; document.body.appendChild(solo);
        const r = { star: svg ? getComputedStyle(svg).fill : null, danger: __tok('--danger').slice(0, 3).map(Math.round).join(), ok: __tok('--ok').slice(0, 3).map(Math.round).join(), solo: getComputedStyle(solo).backgroundColor };
        solo.remove(); return r; });
      await close(pg);
    }
    const ok = out['浅'].star === 'rgb(195, 58, 41)' && out['深'].star === 'rgb(223, 90, 69)' && out['浅'].danger === '180,83,9' && out['深'].danger === '255,164,36'
      && out['浅'].ok === '21,122,67' && out['深'].ok === '48,209,88' && out['浅'].solo === 'rgb(245, 179, 1)';
    T(ok, 'T9 语义色保留：收藏红星 / 告警琥珀 / 成功绿 / 独奏琥珀', JSON.stringify(out));
  }

  /* ---------- T10 播放带 / 播放竖线 ---------- */
  {
    const pg = await open('light', null);
    await pg.evaluate(LOAD); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const ph = document.getElementById('playhead'), pl = document.getElementById('playline'), P = document.getElementById('paper');
      const a = { band: getComputedStyle(ph).fill, line: getComputedStyle(pl).stroke, pen: getComputedStyle(P).getPropertyValue('--accent').trim() };
      P.classList.add('score-invert'); const b2 = { band: getComputedStyle(ph).fill, line: getComputedStyle(pl).stroke, pen: getComputedStyle(P).getPropertyValue('--accent').trim() };
      P.classList.remove('score-invert'); return { a, inv: b2 }; });
    await close(pg);
    T(r.a.band === 'rgb(31, 139, 230)' && r.a.line === 'rgb(31, 139, 230)' && r.a.pen === '#5b4cf0' && r.inv.band === rgbOf('#a396ff') && r.inv.line === rgbOf('#a396ff'),
      'T10 播放带 / 竖线＝--play-band 极光蓝（编辑笔仍靛紫）；反色纸上跟随反色编辑笔', JSON.stringify(r));
  }

  /* ---------- T11 深色主题控件底不是谱纸白 ---------- */
  {
    const out = {}; let ok = true;
    for (const [nm, scheme, theme, eff] of [STATES[0], STATES[1], STATES[2]]) {
      const pg = await open(scheme, theme);
      await pg.evaluate(`hideStartPad(); loadSong(PRESETS[0].make()); render(); showNewWizard();`); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => { const g = s => { const e = document.querySelector(s); return e ? [getComputedStyle(e).backgroundColor, __cr(__col(getComputedStyle(e).color), __col(getComputedStyle(e).backgroundColor))] : null; };
        const hd = document.createElement('div'); hd.className = 'hd-step'; hd.textContent = '步骤'; document.body.appendChild(hd); const h = g('.hd-step'); hd.remove();
        return { nwi: g('.nf-modal #nw-title'), hd: h,   /* v67.4 新建面板：抬升控件（曲名框，--ed-raise）替原意图卡 .nw-int */ panel: getComputedStyle(document.body).getPropertyValue('--panel').trim(), paper: getComputedStyle(document.body).getPropertyValue('--paper').trim() }; });
      const want = rgbOf(eff === 'dark' ? C.dark['--panel'] : CONST['--paper']);
      if (!r.nwi || r.nwi[0] !== want || r.hd[0] !== want || r.nwi[1] < 4.5 || r.hd[1] < 4.5) ok = false;
      out[nm] = r; await close(pg);
    }
    T(ok, 'T11 新建面板抬升控件 / 帮助步骤卡：深色主题读 --panel（不再白卡浅字），浅色仍是纸白，字对比 ≥4.5', JSON.stringify(out).slice(0, 500));
  }

  /* ---------- T12 框架焦点环 ---------- */
  {
    const pg = await open('light', null, null, 'shell=classic');
    await pg.evaluate(LOAD); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const f = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).getPropertyValue('--focus').trim() : null; };
      return { bar: f('body.shell #top .main-bar'), tabs: f('#doc-tabs'), dock: f('#mixer-dock'), pop: f('.vh-pop'), pill: f('#audio-loading'), out: f('#left-dock') }; });
    await close(pg);
    /* flow 段：行 1 / 页签 / 状态栏是深色框架；左栏 #flw-left 与行 2 #editbar 是浅底（框架外） */
    const pf = await open('light', null);
    await pf.evaluate(LOAD); await pf.waitForTimeout(300);
    const rf = await pf.evaluate(() => { const f = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).getPropertyValue('--focus').trim() : null; };
      return { flow: document.body.classList.contains('flow'), bar: f('#flw-r1'), tabs: f('#doc-tabs'), dock: f('#mixer-dock'), st: f('#mixer-dock .mx-bar'), pop: f('.vh-pop'), pill: f('#audio-loading'), out: f('#flw-left'), out2: f('#editbar') }; });
    await close(pf);
    T(['bar', 'tabs', 'dock', 'pop', 'pill'].every(k => r[k] === '#8576f8') && r.out === C.light['--focus']
      && rf.flow && ['bar', 'tabs', 'dock', 'st', 'pop', 'pill'].every(k => rf[k] === '#8576f8') && rf.out === C.light['--focus'] && rf.out2 === C.light['--focus'],
      'T12 深色框架容器内焦点环 #8576f8，框架外为 --focus（旧外壳 + flow：行 1 / 页签 / 状态栏 vs 左栏 / 行 2）', JSON.stringify({ classic: r, flow: rf }));
  }

  /* ---------- T13 隐藏态文字对比（验收补修：方案覆盖层未覆盖到的深色框架 / 谱库 / 个人中心小字） ---------- */
  {
    const out = {}; const fails = [];
    for (const [nm, scheme, theme] of [STATES[0], STATES[1]]) {
      for (const vp of [null, { width: 390, height: 844 }]) {
        const pg = await open(scheme, theme, vp || undefined, 'shell=classic');   /* 旧外壳段：坞内声像读数 / 轨道小节格 / 手机「智能」钮是旧外壳独有 */
        await pg.evaluate(LOAD); await pg.waitForTimeout(300);
        const r = await pg.evaluate((mob) => {
          const t = n => __tok(n), chrome = t('--chrome');
          const cells = __over([236, 234, 255, .07], chrome.slice(0, 3)), cell = __over([236, 234, 255, .13], cells);
          const col = e => e ? __col(getComputedStyle(e).color) : null;
          const __cr0 = __cr; const __crS = (f, b) => (f && b) ? __cr0(f, b) : -1;   /* 元素缺失记 -1（判红） */
          const o = {};
          if (mob) { o['手机「智能」钮/主栏'] = __crS(col(document.getElementById('b-msmart')), chrome); return o; }
          const prog = document.getElementById('mx-prog'); const lb = document.createElement('i'); lb.className = 'mxlbl'; lb.textContent = '10'; prog.appendChild(lb);
          o['密集标尺小节号/坞'] = __crS(col(lb), chrome); lb.remove();
          document.getElementById('mx-expand')?.click();   /* 展开音轨排（行在展开时渲染） */
          o['声像读数/坞'] = __crS(col(document.querySelector('body.shell #mixer-dock .mx-pan .pv')), chrome);
          o['轨道小节格编号/格底'] = __crS(col(document.querySelector('body.shell .mxtc span')), cell);
          openCircle(); const ct = document.querySelector('#circle .cc-card .t'); o['谱库卡曲名/卡底'] = ct ? __crS(col(ct), __col(getComputedStyle(ct.closest('.cc-card')).backgroundColor)) : -1;
          const cv = document.querySelector('#circle .cc-cover svg text[font-size="17"]');
          o['谱库封面骨架墨色 ≠ 谱面墨'] = cv ? (cv.getAttribute('fill') === 'var(--text)' ? 9 : 0) : 9;
          document.getElementById('cc-back')?.click(); enterPersonal('rights');
          const pb = document.querySelector('.pcx-side button.on'); o['个人中心当前项/淡底'] = pb ? __crS(col(pb), __over(__col(getComputedStyle(pb).backgroundColor), t('--bg'))) : -1;
          return o;
        }, !!vp);
        for (const [k, v] of Object.entries(r)) if (!(v >= 4.5)) fails.push('旧·' + nm + (vp ? '·手机 ' : ' ') + k + '=' + v);
        out['旧·' + nm + (vp ? '·手机' : '')] = r; await close(pg);
      }
      /* flow 段：只量看得见的同类小字（不可见的混音台 / 旧手机主栏不计） */
      for (const vp of [null, { width: 390, height: 844 }]) {
        const pg = await open(scheme, theme, vp || undefined);
        await pg.evaluate(LOAD); await pg.waitForTimeout(300);
        const r = await pg.evaluate((mob) => {
          const t = n => __tok(n), chrome = t('--chrome');
          const col = e => e ? __col(getComputedStyle(e).color) : null;
          const vis = e => { if (!e) return false; const q = e.getBoundingClientRect(); if (!(q.width > 0 && q.height > 0)) return false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
          const bgOf = el => { const st = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = __col(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { st.push(c); if (c[3] >= 1) break; } }
            let bb = [255, 255, 255]; for (let i = st.length - 1; i >= 0; i--) bb = __over(st[i], bb); return bb.concat(1); };
          const texts = root => root ? [...root.querySelectorAll('*')].filter(x => vis(x) && [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) : [];
          const minCr = els => els.length ? Math.min(...els.map(x => __cr(col(x), bgOf(x)))) : -1;
          const o = { '外壳＝flow（桌面 body.flow / 手机 body.flw-m）': document.body.classList.contains(mob ? 'flw-m' : 'flow') ? 9 : 0 };
          if (mob) { o['手机顶栏 #flw-mtop 文字/顶栏'] = minCr(texts(document.getElementById('flw-mtop'))); o['手机底条 #flw-mbar 文字/底条'] = minCr(texts(document.getElementById('flw-mbar'))); return o; }
          const prog = document.getElementById('mx-prog'); const lb = document.createElement('i'); lb.className = 'mxlbl'; lb.textContent = '10'; prog.appendChild(lb);
          o['密集标尺小节号/坞'] = vis(prog) ? __cr(col(lb), chrome) : -1; lb.remove();
          o['状态栏小节格编号等可见字/坞'] = minCr(texts(document.getElementById('mixer-dock')).filter(x => !x.closest('#b-play')));
          o['行 1 文字（含页签）/行 1'] = minCr(texts(document.getElementById('flw-r1')));
          openCircle(); const ct = document.querySelector('#circle .cc-card .t'); o['谱库卡曲名/卡底'] = ct ? __cr(col(ct), __col(getComputedStyle(ct.closest('.cc-card')).backgroundColor)) : -1;
          const cv = document.querySelector('#circle .cc-cover svg text[font-size="17"]');
          o['谱库封面骨架墨色 ≠ 谱面墨'] = cv ? (cv.getAttribute('fill') === 'var(--text)' ? 9 : 0) : 9;
          document.getElementById('cc-back')?.click(); enterPersonal('rights');
          const pb = document.querySelector('.pcx-side button.on'); o['个人中心当前项/淡底'] = pb ? __cr(col(pb), __over(__col(getComputedStyle(pb).backgroundColor), t('--bg'))) : -1;
          return o;
        }, !!vp);
        for (const [k, v] of Object.entries(r)) if (!(v >= 4.5)) fails.push('flow·' + nm + (vp ? '·手机 ' : ' ') + k + '=' + v);
        out['flow·' + nm + (vp ? '·手机' : '')] = r; await close(pg);
      }
    }
    T(!fails.length, 'T13 隐藏态小字对比 ≥4.5：坞内声像读数 / 密集标尺 / 小节格编号、手机「智能」钮、谱库卡曲名（深色不再墨色压深底）、个人中心当前项',
      fails.length ? fails.join('；') : JSON.stringify(out).slice(0, 400));
  }

  T(!errs.length, '无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`\nPASS ${pass}/${total}`); await b.close(); process.exit(pass === total ? 0 : 1);
})();
