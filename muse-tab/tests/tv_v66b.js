/* v66.1 v4「画廊」二期换肤（Apple 风格）
   T1 令牌：浅色 --bg #f5f5f7 / --text #1d1d1f / --accent #0066cc / --btn-pri #0071e3；深色 --bg #000 / --accent #2997ff
   T2 谱面层定值：#paper 的 --accent=#0071e3、--muted=#5c5c5c（浅深一致）；播放小节带无彩（fill=var(--sc-band)）；导出映射同步
   T3 外壳：顶栏 / 播放条不再是墨绿实底；毛玻璃画在 ::before（测试环境 noglass→实底，?glass=1→blur）；弹窗遮罩无模糊
   T4 实心蓝每视图 ≤1 处：编辑器 0、启动台 1（新建）、打印弹窗 1（打印 / 存 PDF）
   T5 当前工具：淡蓝底 #e6f1fc + 蓝字 #0066cc + 1px 内描边，不加粗
   T6 对比度：正文 / 次要 / 三级文字对 --bg 与 --panel ≥4.5（浅深两套），链接蓝 ≥4.5
   T7 不再用浏览器原生 confirm：删除「我的曲谱」先执行 → 提示条带「撤销」→ 撤销恢复；云端删除延迟提交、撤销后不发、关页前提交
   T8 提示条：停留 ≥2.6s，带操作 ≥6s；悬停暂停
   T9 收藏改墨色；分享卡顶条保留朱砂「印」、灰字 #6e6e73
   突变实证：对 v66.0 文件复跑，T1–T5、T7–T9 报红。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (q, w, h) => { const pg = await b.newPage({ viewport: { width: w || 1440, height: h || 900 } }); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + FILE + (q || '')); await pg.waitForTimeout(900); return pg; };
  let pg = await open();
  /* T1 */
  let r = await pg.evaluate(() => { const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); const R = document.documentElement; const o = {};
    for (const th of ['light', 'dark']) { R.dataset.theme = th; o[th] = { bg: v('--bg'), text: v('--text'), accent: v('--accent'), pri: v('--btn-pri'), panel: v('--panel') }; } R.dataset.theme = 'light'; return o; });
  T(r.light.bg === '#f5f5f7' && r.light.text === '#1d1d1f' && r.light.accent === '#0066cc' && r.light.pri === '#0071e3' && r.dark.bg === '#000' && r.dark.accent === '#2997ff' && r.dark.panel === '#1d1d1f', 'T1 Apple 令牌（浅 / 深）', JSON.stringify(r));
  /* T2 */
  r = await pg.evaluate(() => { guardReplace = p => p(); hideStartPad(); loadSong(PRESETS[0].make()); render(); const P = document.getElementById('paper'), R = document.documentElement; const o = {};
    for (const th of ['light', 'dark']) { R.dataset.theme = th; const cs = getComputedStyle(P); o[th] = { pen: cs.getPropertyValue('--accent').trim(), muted: cs.getPropertyValue('--muted').trim() }; }
    R.dataset.theme = 'light'; o.band = document.getElementById('playhead').getAttribute('fill');
    const x = svgResolveVars('<rect fill="var(--accent)"/><text fill="var(--muted)"/><rect fill="var(--sc-band)"/>'); o.exp = x; return o; });
  T(r.light.pen === '#0071e3' && r.dark.pen === '#0071e3' && r.light.muted === '#5c5c5c' && r.dark.muted === '#5c5c5c' && r.band === 'var(--sc-band)' && /#0071e3/.test(r.exp) && /#5c5c5c/.test(r.exp) && /#7f7f7f/.test(r.exp), 'T2 谱面层定值 + 无彩播放带 + 导出映射', JSON.stringify(r));
  /* T3 */
  r = await pg.evaluate(() => { const g = (sel, pse) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e, pse || null); return { bg: cs.backgroundColor, bf: cs.backdropFilter || cs.webkitBackdropFilter }; };
    return { ng: document.documentElement.classList.contains('noglass'), top: g('#top'), topB: g('#top', '::before'), bar: g('#top .main-bar'), dock: g('#mixer-dock'), dockB: g('#mixer-dock', '::before') }; });
  const notGreen = (c) => c && !/31, 58, 52/.test(c.bg);
  const t3a = r.ng && notGreen(r.top) && notGreen(r.bar) && notGreen(r.dock) && /0, 0, 0, 0|transparent/.test(r.bar.bg) && (r.topB.bf === 'none' || !r.topB.bf) && /250, 250, 252/.test(r.topB.bg);
  const pgG = await open('?glass=1');
  const r3 = await pgG.evaluate(() => { const cs = getComputedStyle(document.querySelector('#top'), '::before'); const m = (showModal('<h3>x</h3>'), getComputedStyle(document.getElementById('modal-mask'))); const o = { bf: cs.backdropFilter || cs.webkitBackdropFilter, mbf: m.backdropFilter || m.webkitBackdropFilter }; closeModal(); return o; });
  await pgG.close();
  T(t3a && /blur\(20px\)/.test(r3.bf) && (r3.mbf === 'none' || !r3.mbf), 'T3 外壳去墨绿；毛玻璃在 ::before（测试环境实底）；遮罩无模糊', JSON.stringify({ r, r3 }));
  /* T4 */
  const countBlue = () => pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const q = e.getBoundingClientRect(); if (q.width < 8 || q.height < 8) return false;
    if (e.closest('#score,#paper,.modal-mask') && !e.closest('.modal')) return false; return /rgb\(0, 113, 227\)/.test(cs.backgroundColor); }).map(e => e.id || e.className || e.tagName));
  const ed = await countBlue();
  const pgS = await open();
  const st = await pgS.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); const q = e.getBoundingClientRect(); return q.width > 8 && q.height > 8 && cs.display !== 'none' && /rgb\(0, 113, 227\)/.test(cs.backgroundColor); }).map(e => e.dataset.sp || e.id || e.className));
  await pgS.close();
  await pg.evaluate(() => document.getElementById('b-print').click()); await pg.waitForTimeout(200);
  const md = await pg.evaluate(() => [...document.querySelectorAll('.modal *')].filter(e => /rgb\(0, 113, 227\)/.test(getComputedStyle(e).backgroundColor)).map(e => e.textContent.trim()));
  await pg.evaluate(() => closeModal());
  T(ed.length === 0 && st.length === 1 && st[0] === 'new' && md.length === 1, 'T4 实心蓝每视图 ≤1 处（编辑器 0 / 启动台 1 / 打印弹窗 1）', JSON.stringify({ ed, st, md }));
  /* T5 */
  r = await pg.evaluate(() => { const e = document.querySelector('#editbar .eb.on'); const cs = getComputedStyle(e); return { bg: cs.backgroundColor, c: cs.color, sh: cs.boxShadow, fw: cs.fontWeight }; });
  T(r.bg === 'rgb(230, 241, 252)' && r.c === 'rgb(0, 102, 204)' && /inset/.test(r.sh) && +r.fw < 600, 'T5 当前工具：淡蓝底 + 蓝字 + 内描边，不加粗', JSON.stringify(r));
  /* T6 */
  r = await pg.evaluate(() => { const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
    const L = c => { const a = hex(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
    const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const R = document.documentElement, v = n => getComputedStyle(R).getPropertyValue(n).trim(); const out = {};
    for (const th of ['light', 'dark']) { R.dataset.theme = th; const bg = v('--bg'), pn = v('--panel'); out[th] = Math.min(...['--text', '--muted', '--faint', '--accent'].flatMap(n => [cr(v(n), bg), cr(v(n), pn)])).toFixed(2); }
    R.dataset.theme = 'light'; return out; });
  T(+r.light >= 4.5 && +r.dark >= 4.5, 'T6 文字与链接对比度 ≥4.5（浅 / 深）', JSON.stringify(r));
  /* T7 */
  r = await pg.evaluate(async () => { const src = [...document.scripts].map(s => s.textContent).join('\n'); const nat = (src.match(/[^\w.]confirm\(/g) || []).length;
    const calls = []; window.confirm = () => { throw new Error('native confirm'); };
    const id = 'tvdel1'; const lib = libLoad(); lib.unshift({ id, title: '删除测试', data: Object.assign(PRESETS[3].make(), { title: '删除测试' }) }); libSave(lib); libTab = 'mine';
    showLibrary(); await new Promise(r => setTimeout(r, 50));
    const btn = document.querySelector('[data-del-mine="' + id + '"]'); if (!btn) return { nat, err: 'no del btn', n: libLoad().length, m: document.querySelectorAll('[data-del-mine]').length };
    apiCall = (u, o) => { calls.push((o && o.method || 'GET') + ' ' + u); return Promise.resolve({}); }; window.PYQ_CLOUD = true; btn.click();
    const gone = !libLoad().some(x => x.id === id); const t = document.getElementById('toast'); const hasUndo = !!t.querySelector('.toast-act'); const callsAfterDel = calls.length;
    if (!hasUndo) { closeModal(); return { nat, gone, hasUndo }; }
    t.querySelector('.toast-act').click(); const back = libLoad().some(x => x.id === id); await new Promise(r => setTimeout(r, 30));
    const calls1 = calls.length;
    libTab = 'mine'; showLibrary(); await new Promise(r => setTimeout(r, 30)); document.querySelector('[data-del-mine="' + id + '"]').click();
    window.dispatchEvent(new Event('pagehide')); const committed = calls.filter(c => /DELETE \/scores\/tvdel1/.test(c)).length;
    closeModal(); return { nat, gone, hasUndo, callsAfterDel, back, calls1, committed }; });
  T(r.nat === 0 && r.gone && r.hasUndo && r.callsAfterDel === 0 && r.back && r.calls1 === 0 && r.committed === 1, 'T7 无原生 confirm；删除先执行 + 撤销恢复；云端延迟提交、关页前提交', JSON.stringify(r));
  /* T8 */
  r = await pg.evaluate(async () => { const t = document.getElementById('toast'); toast('短提示'); await new Promise(r => setTimeout(r, 2300)); const a = t.style.opacity;
    toast('带操作', { action: { label: '撤销', fn: () => {} } }); await new Promise(r => setTimeout(r, 3000)); const b2 = t.style.opacity;
    t.onmouseenter(); await new Promise(r => setTimeout(r, 3400)); const c = t.style.opacity; t.onmouseleave(); await new Promise(r => setTimeout(r, 1700)); const d = t.style.opacity;
    return { a, b2, c, d, live: t.getAttribute('aria-live') }; });
  T(r.a === '1' && r.b2 === '1' && r.c === '1' && r.d === '0' && r.live === 'polite', 'T8 提示条时长 / 悬停暂停 / 读屏', JSON.stringify(r));
  /* T9 */
  r = await pg.evaluate(() => { const d = document.createElement('span'); d.className = 'cc-chip fav on'; document.body.appendChild(d); const bg = getComputedStyle(d).backgroundColor; d.remove();
    const svg = buildShareCardSVG(); return { favBg: bg, text: getComputedStyle(document.documentElement).getPropertyValue('--text').trim(), stop: /stop-color="#c33a29"/.test(svg), gray: !/#8a8a8a/.test(svg) && /#6e6e73/.test(svg) }; });
  T(r.favBg === 'rgb(29, 29, 31)' && r.stop && r.gray, 'T9 收藏墨色；分享卡顶条朱砂「印」、灰字达标', JSON.stringify(r));
  await pg.close();
  T(!errs.length, '无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`\nPASS ${pass}/${total}`); await b.close(); process.exit(pass === total ? 0 : 1);
})();
