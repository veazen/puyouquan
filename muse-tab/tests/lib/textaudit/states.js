'use strict';
/* v68.7 S0 文字量审计 · 37 屏（tv_textbudget 用）。
   出处：方案阶段审计驱动 f83ux/audit.js 的 STATES 与 SCN（口径见 docs/design-2026-10g/research/01-text-audit.md），原样入库：
   1440×900 浅色 30 屏 + 390×844 手机 7 屏，每屏一个新上下文、开页后等 2.2 秒再做动作。只改一处：BASE 由调用方传入（缺省 ../../../index.html）。
   menu-save 屏的动作照旧（点两下保存胶囊）：v68.7 S1 起第二下＝立即存入、不再弹菜单，焦点层为空，指标自然归零。 */
const path = require('path');
const BASE = 'file://' + path.resolve(__dirname, '../../../index.html');

/* 页内场景（init 脚本）：__P(预设名) 取示例谱；__scn(k) 关掉启动台、按场景建谱并关掉开机那份，光标落点同方案阶段 */
function SCN() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__scn = (k) => {
    window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    try { hideStartPad(); } catch (_) {}
    const one = s => { addDoc(s, () => {}); closeDocAt(0); };
    if (k === 'songbie') { one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; }
    else if (k === 'pacc' || k === 'gtr' || k === 'inst') { NWP.quickCreate(k); window.__createToast = (document.getElementById('toast') || {}).textContent || ''; closeDocAt(0); }
    try { clampSel(); } catch (_) {} try { blurSel = false; lastEnt = null; } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { n: docs.length, title: song.title, row: sel.row, type: (typeof docTypeLabel === 'function' ? docTypeLabel(song) : '') };
  };
}

const W = (ms) => new Promise(r => setTimeout(r, ms));
const STATES = [
  /* id, 名称, 视口, url 后缀, 动作, 焦点区域（正则，null=整屏） */
  { id: 'startpad', name: '启动台', go: async pg => {} , focus: /startpad/ },
  { id: 'quickmenu', name: '快速新建菜单（文件 ▾ › 快速新建）', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.evaluate(() => NWP.quickMenu(document.getElementById('flw-file'))); await W(500); }, focus: /quickmenu/ },
  { id: 'newpanel', name: '新建面板（默认）', go: async pg => { await pg.evaluate(() => showNewWizard()); await W(1500); }, focus: /modal/ },
  { id: 'newpanel-pacc', name: '新建面板（选中钢琴伴奏歌谱）', go: async pg => { await pg.evaluate(() => showNewWizard()); await W(800); await pg.click('.nf-modal [data-scene="pacc"]'); await W(1500); }, focus: /modal/ },
  { id: 'write-pacc', name: '书写 · 钢琴伴奏歌谱（起步中）', go: async pg => { await pg.evaluate(() => __scn('pacc')); await W(1500); }, focus: null },
  { id: 'write-gtr', name: '书写 · 吉他弹唱', go: async pg => { await pg.evaluate(() => __scn('gtr')); await W(1500); }, focus: null },
  { id: 'write-inst', name: '书写 · 钢琴独奏', go: async pg => { await pg.evaluate(() => __scn('inst')); await W(1500); }, focus: null },
  { id: 'write-func', name: '书写 · 功能谱（旋律＋级数）', go: async pg => {
      await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} showNewWizard({ scene: 'chord' }); }); await W(900);
      await pg.click('.nf-modal [data-act="var"][data-k="ftype"][data-v="CJ"]'); await W(400); await pg.click('#nw-create'); await W(1200);
      await pg.evaluate(() => { window.__createToast = (document.getElementById('toast') || {}).textContent || ''; try { closeDocAt(0); } catch (_) {} render(); try { document.activeElement.blur(); } catch (_) {} }); await W(800); }, focus: null },
  { id: 'write-songbie', name: '书写 · 送别（有内容的预设谱）', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(1200); }, focus: null },
  { id: 'engrave', name: '排版模式', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-mode-engrave'); await W(1800); }, focus: null },
  { id: 'output', name: '输出模式（含发布卡）', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-mode-output'); await W(1800); }, focus: null },
  { id: 'rp-prop', name: '右栏 · 属性', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-rpt-prop'); await W(500); }, focus: /right/ },
  { id: 'rp-text', name: '右栏 · 文字', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-rpt-text'); await W(500); }, focus: /right/ },
  { id: 'rp-smart', name: '右栏 · 智能', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-rpt-smart'); await W(500); }, focus: /right/ },
  { id: 'left-sign', name: '左栏 · 记号面板（带字档）', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); }, focus: /left/ },
  { id: 'trk-more', name: '音轨行「⋯」菜单', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-fa="tree:more"]')].find(x => x.offsetParent); b.click(); }); await W(500); }, focus: /menu:/ },
  { id: 'trk-hdr', name: '音轨区谱类 ▾（钢琴伴奏歌谱 ▾）', go: async pg => { await pg.evaluate(() => __scn('pacc')); await W(1200);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-fa="tree:hdr"]')].find(x => x.offsetParent); b.click(); }); await W(500); }, focus: /menu:/ },
  { id: 'menu-save', name: '保存状态 ▾', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-save'); await W(900); await pg.evaluate(() => { try { toastHide(); } catch (_) {} }); await pg.click('#flw-save'); await W(600); }, focus: /menu:|modal/ },
  { id: 'trk-add', name: '加轨菜单', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-thd [data-fa="tree:add"]'); await W(500); }, focus: /menu:/ },
  { id: 'menu-file', name: '文件 ▾', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-file'); await W(500); }, focus: /menu:/ },
  { id: 'menu-acct', name: '账号 ▾', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-acct'); await W(500); }, focus: /menu:/ },
  { id: 'menu-more', name: '行 2 更多 ▾', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-more'); await W(500); }, focus: /menu:/ },
  { id: 'menu-stmore', name: '状态栏「⋯ 更多」', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('[data-m="stmore"]'); await W(500); }, focus: /menu:/ },
  { id: 'menu-help', name: '状态栏「?」快捷键菜单', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('[data-m="help"]'); await W(500); }, focus: /menu:/ },
  { id: 'cmd', name: '命令面板（空输入）', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.click('#flw-cmdb'); await W(600); }, focus: /menu:/ },
  { id: 'tour1', name: '首次导览 1/3', q: '?tour=1', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(2800); }, focus: /tour/ },
  { id: 'tour2', name: '首次导览 2/3', q: '?tour=1', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(2800); await pg.click('#flw-tour [data-tour="next"]'); await W(700); }, focus: /tour/ },
  { id: 'tour3', name: '首次导览 3/3', q: '?tour=1', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(2800); await pg.click('#flw-tour [data-tour="next"]'); await W(700); await pg.click('#flw-tour [data-tour="next"]'); await W(700); }, focus: /tour/ },
  { id: 'prefs', name: '偏好设置', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.evaluate(() => showPrefs()); await W(600); }, focus: /modal/ },
  { id: 'help', name: '帮助弹窗', go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(800); await pg.evaluate(() => document.getElementById('b-help').click()); await W(800); }, focus: /modal/ },
  /* 手机 */
  { id: 'm-start', name: '手机 · 启动台', vp: [390, 844], go: async pg => {}, focus: null },
  { id: 'm-main', name: '手机 · 主界面（送别）', vp: [390, 844], go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(1500); }, focus: null },
  ...['menu', 'win', 'trk', 'pal', 'out'].map(v => ({ id: 'm-sheet-' + v, name: '手机 · 抽屉 ' + v, vp: [390, 844], go: async pg => { await pg.evaluate(() => __scn('songbie')); await W(1200);
      await pg.evaluate(v => { const b = [...document.querySelectorAll('[data-fm="sheet"][data-v="' + v + '"]')].find(x => x.offsetParent); b.click(); }, v); await W(800); }, focus: /m-sheet/ }))
];

/* 跑一屏（与 f83ux/audit.js 同一流程）：新上下文 → 注入抽取与场景 → 开页等 2.2 秒 → 动作 → 记下提示条 → 藏起提示条 → 截图（可选）→ __audit() */
async function runState(browser, s, o) {
  o = o || {};
  const [w, h] = s.vp || [1440, 900];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light', deviceScaleFactor: 1 });
  await ctx.addInitScript(require('./extract.js')); await ctx.addInitScript(SCN);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  let err = null, a = null, meta = null, toastNow = '', whys = [];
  try {
    await pg.goto((o.base || BASE) + (s.q || '')); await W(2200);
    try { await s.go(pg); } catch (e) { err = String(e.message || e).slice(0, 300); }
    toastNow = await pg.evaluate(() => { const t = document.getElementById('toast'); return t && +getComputedStyle(t).opacity > 0.05 ? (t.textContent || '').trim() : ''; });
    await pg.evaluate(() => { try { toastHide(); } catch (_) {} const t = document.getElementById('toast'); if (t) { t.classList.remove('show'); t.style.display = 'none'; } }); await W(250);
    if (o.shots) await pg.screenshot({ path: path.join(o.shots, s.id + '.png') });
    a = await pg.evaluate(() => __audit());
    whys = await pg.evaluate(() => __auditWhy());
    meta = await pg.evaluate(() => ({ title: (typeof song !== 'undefined' && song) ? song.title : null, type: (typeof docTypeLabel === 'function' && typeof song !== 'undefined' && song) ? docTypeLabel(song) : null,
      mode: document.body.dataset.mode || null, flow: document.body.classList.contains('flow'), mob: document.body.classList.contains('flw-m'), ver: typeof APP_VER !== 'undefined' ? APP_VER : null, createToast: window.__createToast || null }));
  } catch (e) { err = err || String(e.message || e).slice(0, 300); }
  await ctx.close();
  return Object.assign({ id: s.id, name: s.name, vp: [w, h], focus: s.focus ? String(s.focus) : null, err, pageErrs: errs, meta, toastNow, whys }, a || { groups: [], clicks: [], iconOnly: [], titles: [] });
}

module.exports = { STATES, SCN, BASE, runState };
