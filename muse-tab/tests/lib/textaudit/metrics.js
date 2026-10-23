'use strict';
/* v68.7 S0 文字量审计 · 指标（tv_textbudget 用）。
   出处：方案阶段汇总脚本 f83ux/analyze.js（每屏总字 / 说明字 / 说明行 / 带副标题按钮 / 悬停 / 屏内同名）与 v68.7 规格补充统计 base68.js
   （可点控件组、菜单焦点层、P3、入口表原口径 + K 口径），口径见 docs/design-2026-10g/research/01-text-audit.md、规格 v68.7 §1。
   · 字＝\p{L}\p{N}；live＝未被遮挡且不在提示条里的组；总字＝label + phrase + desc + key（num 不计）。
   · 说明字 desc＝含 ，。；：、！？（）“”「」 或 >8 字的组；说明行＝desc 组数。
   · 带副标题按钮＝可点元素内首组之后还有 phrase / desc 组。
   · 可点控件组＝可点元素 + 纯图标钮，记号格（pal:sign / .flw-sg）合成 1 组。
   · 屏内同名组＝同名可点项（去 … ▾ › 空白 ·）出现在 ≥2 个区域（analyze.js dupInScreen）。
   · P3＝可见文字组（含输入框 placeholder）+ 悬停 title + 可见 data-why 里命中定稿正则的条数（不扫 aria-label）。
   · 入口表：只算桌面屏；命令面板不计；原口径＝按可见名正则（analyze.js FUN）；K 口径（规格 §1.5）＝
     K1 模式条三模式同一控件（row2:modes）· K2 保存胶囊 #flw-save 不论写什么都算「存入我的曲谱」· K3 另按元素认（data-fa / data-old / data-v / id）。 */
const cnt = s => (String(s).match(/[\p{L}\p{N}]/gu) || []).length;
const live = g => !g.occ && g.region !== 'toast';
const P3 = /行 ?[12](?![\d.])|[左右底顶]栏|状态栏|标题行|右侧|左侧|谱面上方|行尾「|「[^」]{1,8}」页|原「|原(?:顶|底)栏|(?:文件|账号|更多) ?▾/;
/* v68.7 收尾 BUD-3：定稿正则之外的同义指路观察名单（同 deploy/check-wording.js 的 p3syn）——只报告，不进 KEYS / 验收线 */
const P3SYN = /下面的|上面的|旁的按钮|下方的按钮|上方的按钮|右端|左端/;
/* 右栏当前页（读屏标题 h2 视觉隐藏，不进可见文字；按场景定）。v68.3 撤「下一步」卡后，新建谱默认停在属性页 */
/* v69.0 S2：rp-smart 屏改为「智能 ▾」画廊（右栏停在属性页），不再是右栏「智能」页 */
const rpage = id => ({ engrave: '版式', output: '发布与导出', 'rp-text': '文字', startpad: '无', newpanel: '无', 'newpanel-pacc': '无' })[id] || '属性';
const regKey = (s, g, c) => { let r = g.region; if (r === 'row2') r = 'row2:' + ((s.meta && s.meta.mode) || 'm'); if (r === 'right') r = 'right:' + rpage(s.id);
  if (c && /data-fa=mode:set|#flw-mdd|data-fa=mode:menu/.test(c.el || '')) r = 'row2:modes'; return r; };
/* 功能表：[名, 原口径（可见名）, K3 元素口径] */
const FUN = [
  ['新建', c => /^(新建|开始一份谱|新建曲谱|新建面板)/.test(c.label) || /dt-add|data-fa=r1:new\]|data-sp=new/.test(c.el), c => /data-fa=r1:new\]|#dt-add|data-sp=new|data-q=panel/.test(c.el)],
  ['按上次新建', c => /按上次|马上开始|按默认/.test(c.label), c => /data-fa=r1:last|data-q=last|data-sp=last/.test(c.el)],
  ['从已有音乐 / 导入', c => /从已有音乐|^导入/.test(c.label), c => /data-fa=r1:import|data-q=import|data-sp=imp|data-v=midi\]|data-fa=tree:midi/.test(c.el) && !/tree:midi/.test(c.el)],
  ['打开文件', c => /^打开文件|^打开$/.test(c.label), c => /data-old=b-open/.test(c.el)],
  ['我的曲谱', c => /我的曲谱|^我的$/.test(c.label) && !/存入|已存/.test(c.label), c => /data-fa=r1:mine/.test(c.el)],
  ['存入我的曲谱', c => /存入我的曲谱|保存到我的曲谱|存入并提交/.test(c.label), c => /#flw-save|data-old=b-savemine/.test(c.el)],
  ['存为文件', c => /存为文件/.test(c.label), c => /data-old=b-save\]/.test(c.el)],
  ['发布', c => /发布/.test(c.label) && !/仅存/.test(c.label), c => /#flw-pub/.test(c.el)],
  ['填词', c => /填词/.test(c.label), c => /data-fa=tree:lyr|data-fa=sbar:tool\]\[data-v=lyr|data-v=lyr\]/.test(c.el)],
  ['生成六线谱', c => /生成六线谱/.test(c.label), c => /tree:gentab|tree:gen\]|data-v=gen\]/.test(c.el)],
  ['换谱类', c => /换谱类/.test(c.label), c => /#flw-sb-kind|button#flw-kchip|data-fa=tree:kind|data-fa=r1:kind|tree:kindmenu/.test(c.el)],
  ['曲谱信息', c => /曲谱信息/.test(c.label), c => /data-v=b-meta|data-old=b-meta/.test(c.el)],
  ['帮助', c => /帮助/.test(c.label), c => /data-m=help|data-old=b-help/.test(c.el)],
  ['快捷键', c => /快捷键/.test(c.label), c => /data-fa=r1:keys/.test(c.el)],
  ['时值检查 / 编辑模式', c => /时值|修复建议|自由编辑/.test(c.label), c => /#beat-status|data-fa=st:em|#em-toggle|data-v=chk\]/.test(c.el)],
  ['纸张 A4/A5', c => /^A[345]$|纸张/.test(c.label), c => /data-fa=lay:page/.test(c.el)],
  ['排版（模式）', c => /^排版$/.test(c.label), c => /data-v=engrave\]/.test(c.el)],
  ['输出（模式）', c => /^输出$/.test(c.label), c => /data-v=output\]/.test(c.el)],
  ['谱库', c => /^谱库/.test(c.label), c => /data-old=b-circle/.test(c.el)],
  ['偏好设置', c => /偏好设置/.test(c.label), c => /data-fa=r1:prefs/.test(c.el)],
  ['示例曲谱', c => /示例/.test(c.label), c => /data-fa=r1:demo/.test(c.el)],
];
function funcs(R, mode) {   /* mode: 'orig' | 'K' */
  const fun = {};
  for (const [id, s] of Object.entries(R)) { if (!s.vp || s.vp[0] < 800) continue;
    const icon = (s.iconOnly || []).map(b => ({ label: String(b.aria || b.title || '').split(/[：（(]/)[0], aria: b.aria, el: b.el, region: b.region, icon: true }));
    (s.clicks || []).filter(c => !c.occ).concat(icon).forEach(c => {
      const g = c.icon ? { region: c.region } : ((s.groups || []).find(x => x.click === c.id) || { region: c.region });
      const rk = regKey(s, g, mode === 'K' ? c : null);
      if (rk === 'menu:cmd') return;
      FUN.forEach(([f, t, te]) => { if (t(c) || (mode === 'K' && te(c))) (fun[f] = fun[f] || new Set()).add(rk); });
    });
  }
  return Object.entries(fun).map(([f, set]) => ({ f, n: set.size, places: [...set].sort() })).sort((a, b) => b.n - a.n || (a.f < b.f ? -1 : 1));
}
const M11 = ['quickmenu', 'trk-more', 'trk-hdr', 'menu-save', 'trk-add', 'menu-file', 'menu-acct', 'menu-more', 'menu-stmore', 'menu-help', 'cmd'];
const WRITE5 = ['write-pacc', 'write-gtr', 'write-inst', 'write-func', 'write-songbie'];
/* S1 范围（带副标题按钮＝0 的 20 屏）与 P3＝0 的 25 屏（桌面 30 屏去掉帮助 / 导览 / 偏好） */
const S1SUB = ['write-pacc', 'write-gtr', 'write-inst', 'write-func', 'write-songbie', 'rp-prop', 'rp-text', 'rp-smart', 'left-sign', 'trk-more', 'trk-hdr', 'menu-save', 'trk-add', 'menu-file', 'menu-acct', 'menu-more', 'menu-stmore', 'menu-help', 'cmd', 'quickmenu'];
const S4X = ['help', 'tour1', 'tour2', 'tour3', 'prefs'];
function screen(s) {
  const gs = (s.groups || []).filter(live); const sum = k => gs.filter(g => g.k === k).reduce((a, g) => a + g.n, 0);
  const total = ['label', 'phrase', 'desc', 'key'].reduce((a, k) => a + sum(k), 0);
  const cl = (s.clicks || []).filter(c => !c.occ);
  const all = cl.map(c => c.el).concat((s.iconOnly || []).map(c => c.el)); const cells = all.filter(e => /pal:sign|flw-sg/.test(e)).length;
  const focus = s.focus ? new RegExp(s.focus.slice(1, -1)) : null;
  const fg = focus ? gs.filter(g => focus.test(g.region)) : null;
  /* 屏内同名（analyze.js dupInScreen 口径） */
  const norm = t => String(t).replace(/[…▾›\s·]/g, '').replace(/^＋/, '');
  const byLab = {}; cl.forEach(c => { const n = norm(c.label); if (!n || /^\d+$/.test(n) || n.length < 2) return; (byLab[n] = byLab[n] || new Set()).add(c.region); });
  const dups = Object.entries(byLab).filter(([, v]) => v.size >= 2).map(([k, v]) => k + '×' + v.size).sort();
  const titles = s.titles || [];
  const p3v = gs.filter(g => P3.test(g.text)).map(g => g.text), p3t = titles.filter(t => P3.test(t.text)).map(t => t.text), p3w = (s.whys || []).filter(t => P3.test(t.text)).map(t => t.text);
  const syn = [].concat(gs.map(g => g.text), titles.map(t => '〔悬停〕' + t.text), (s.whys || []).map(t => '〔why〕' + t.text)).filter(t => P3SYN.test(t));
  return {
    total, desc: sum('desc'), descLines: gs.filter(g => g.k === 'desc').length,
    btnWithSub: cl.filter(c => c.sub && c.sub.length).length,
    hoverChars: titles.reduce((a, t) => a + t.n, 0), hoverN: titles.length,
    clickGrp: all.length - cells + (cells ? 1 : 0),
    p3: p3v.length + p3t.length + p3w.length, dup: dups.length,
    focus: fg ? { total: ['label', 'phrase', 'desc', 'key'].reduce((a, k) => a + fg.filter(g => g.k === k).reduce((x, g) => x + g.n, 0), 0), desc: fg.filter(g => g.k === 'desc').reduce((a, g) => a + g.n, 0),
      items: cl.filter(c => focus.test(c.region) && c.label).length, withSub: cl.filter(c => focus.test(c.region) && c.label && c.sub && c.sub.length).length } : null,
    _p3: { vis: p3v, title: p3t, why: p3w }, _p3syn: syn, _dups: dups,
    _subs: cl.filter(c => c.sub && c.sub.length).map(c => c.label + '｜' + c.sub.join(' / '))
  };
}
function summarize(R) {
  const scr = {}; for (const [id, s] of Object.entries(R)) scr[id] = screen(s);
  const m11 = M11.filter(id => scr[id]).reduce((a, id) => { const f = scr[id].focus || { total: 0, desc: 0, items: 0, withSub: 0 }; return { total: a.total + f.total, desc: a.desc + f.desc, items: a.items + f.items, withSub: a.withSub + f.withSub }; }, { total: 0, desc: 0, items: 0, withSub: 0 });
  m11.share = m11.total ? +(m11.desc / m11.total * 100).toFixed(1) : 0;
  const fK = funcs(R, 'K'), fO = funcs(R, 'orig');
  const w5 = WRITE5.filter(id => scr[id]);
  return { screens: scr, menus11: m11,
    write5: { desc: w5.map(id => scr[id].desc), avgDesc: w5.length ? +(w5.reduce((a, id) => a + scr[id].desc, 0) / w5.length).toFixed(1) : 0, hover: w5.map(id => scr[id].hoverChars), clickGrp: w5.map(id => scr[id].clickGrp) },
    s1sub: S1SUB.filter(id => scr[id]).reduce((a, id) => a + scr[id].btnWithSub, 0),
    p3x: Object.keys(scr).filter(id => R[id].vp[0] >= 800 && S4X.indexOf(id) < 0).reduce((a, id) => a + scr[id].p3, 0),
    p3syn: Object.keys(scr).filter(id => R[id].vp[0] >= 800 && S4X.indexOf(id) < 0 && scr[id]._p3syn.length).map(id => id + ' ' + JSON.stringify(scr[id]._p3syn.map(t => String(t).slice(0, 40)))),
    fun3K: fK.filter(x => x.n >= 3), fun3orig: fO.filter(x => x.n >= 3), funK: fK };
}
module.exports = { cnt, P3, P3SYN, FUN, funcs, screen, summarize, M11, WRITE5, S1SUB, S4X, rpage, regKey };
