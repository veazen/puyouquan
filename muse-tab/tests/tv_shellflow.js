'use strict';
/* v67.9 新外壳 flow（?shell=flow 预览；方案 docs/design-2026-10f，工程计划 flowplan §2.9 断言表）。几何断言优先，真实点击，file:// 直载。
   S0  不带开关零差异：与 v67.8（参考提交 2675b9c，或 env MUSETAB_REF 指定的文件）逐项对拍 #top / #editbar / #doc-tabs / #left-dock / #right-dock / #mixer-dock
       的 outerHTML · 几何 · 父节点 · 计算样式，全部带 id 元素的 rect 与 display，body / html 类名与内联样式，body.innerHTML（去 <script>），musetab-* 键与 song JSON；
       1280 / 1440 × 浅 / 深 × {启动态, 三窗口工作态} 加 ?shell=classic 一组。拿不到参考时：CI（env CI）判红（deploy.yml 先按 shellflow_ref.json 补取基线提交），本地只跑 S0b 不变量并打印 ⚠️（MUSETAB_REF=none 显式跳过）
   S0b 不带开关的不变量：FLOW 未挂载、没有任何 flow 节点 / 类 / 属性 / 本机键，#doc-tabs · #beat-box · #eb-zoom 在原位
       v68.2 切默认起：S0 / S0b 的被测页改为旧外壳（?shell=classic，及不带参数但本机键 '0'），对拍 shellflow_ref.json 提交（v68.1 a8c2089）不带开关的默认外壳；有意改动的例外写在 S0 处
   S1  开关：?shell=flow → body.flow + musetab-flow='1'，去掉参数刷新仍是 flow；?shell=classic → 键 '0'、不挂载、默认 DOM 在原位；本机存储不可用时 ?shell=flow 只对本次生效
       v68.2 切默认起：不带参数（无键）即 flow；?shell=flow 删键；?shell=classic 写 '0' 刷新与去参数保持；存储不可用时 ?shell=classic 只对本次、去参数回 flow
   S2  外壳总高：行 1 44 · 行 2 40 · #top 底 84（方案值；#top 的 1px 底线改为行 2 的 inset 阴影，不占高）· 状态栏 32 贴底 · 顶 + 底 116（1280×800 / 1366×768 / 1440×900 × 浅 / 深）
   S3  谱面可见高（#score-wrap 可视区减谱型条与谱面上方的悬浮条，吸住状态 scrollTop≥50 量）：v68.3 悬浮条展开 1280×800 ≥638 · 1366×768 ≥606 · 1440×900 ≥738，
       收起 ≥650 / 618 / 750（v68.2 方案值 684 / 652 / 784 是去掉旧谱型条换来的；负责人 2026-10-18 要求保留吸顶悬浮条，代价 46 / 34）
   S4  右栏：1440 停靠 264、无竖条；1280 / 1366 竖条 40、右栏不占位。竖条「信息」→ 浮出 288 贴竖条、不改谱纸宽；Esc / 点外部 / 再点同页收起；
       钉住 → 1280 也停靠且 musetab-rdock='1'，刷新保持，取消钉住删键
   S5  paperClear：#score 左缘 ≥ 左栏右缘−1、右缘 ≤ 右栏 / 竖条左缘+1；3 视口 × 浅深 × {预设谱, 新建 pacc} × 旧左栏面板开 / 关 共 24 态；
       v68.0 起左栏是 #flw-left 248 常驻、旧 #left-dock 在 flow 下整体隐藏：面板开 / 关两态谱纸都不变（预设谱 #score 870±2、新建谱 ≥870）；
       S5c 旧面板「打开」也不显示、不挂 paper-tight、FLY_AUTO_CLOSED 不消耗；S5d 1439 / 1440 / 1536 预设谱同为 870（v67.9 遗留 L3）
   S6  页签：6 窗口 1280 全露（非当前 ≥140、当前 148–240）、1366 非当前每个 ≥160（当前按曲名 148–240）、1440 全露；10 窗口 1280 露 5 ＋「窗口 5」、1440 露 6 ＋「窗口 4」；
       当前页签永远在行 1 内；× 命中区 ≥28×28；只有未入库的标空心圈；中键关闭 docs−1，未入库有内容的库里多一条
   S7  窗口列表：行高 ≥44、行数＝窗口数；搜「送别」只剩 1 行；点行切窗口；「关闭已存入的窗口」只关库里有的
   S8  页签键盘与拖动排序：role=tablist；←→ 只移焦点（不切窗口、不动谱面光标）；Enter 切换；拖动重排 docs[]、当前窗口不变、
       musetab-docs-v1 {cur, docs} 顺序同步，刷新后顺序与当前窗口还原
   S9  行 2：1280 宽简谱 / 五线谱 / 六线谱单行不溢出、无 .flw-off、高 40；从 1100 起逐档变窄到出现 .flw-off（实测简谱 1000 起收），「更多 ▾」顶部逐个列出，
       菜单里点「休止」＝点 #eb-rest
   S10 行 2 连音两键：#eb-tie 与 #b-tie 效果相同；行 2 的 [data-tup="3"] 置位 curCol().tup，与 applyTuplet(3) 相同
   S11 委托：文件 ▾ / 账号 ▾ 每一项点了真的发生对应动作；保存状态三态（≥1440 长文案 · 1280 短文案 · 已入库带时间，点开另存为文件）；未入库点发布先入库再出发布卡
   S12 播放与状态栏：控件齐全、单行、顺序；播放 / 暂停、回开头、♩=、倍速、节拍器、⋯（演奏感 / 音色库 / 谱架）、位置、当前轨、时值检查上弹不自动弹、缩放、?；
       v68.0 起「混音 ▴」撤出状态栏（混音并进左栏音轨行）：#mx-expand 与旧混音台 .mx-tracks 不可见，DOM 与 setMixerExpanded 保留供委托
   S13 不挂 flow 的场景：打印媒体 / beforeprint、观看页（openPubViewer 进出 + 分享页 PYQ_SHARE 直开）、谱架、手机 ≤820（运行中缩窄与直开 390；v68.1 起手机改挂 flow 的手机子段 FLOW.mob，桌面 flow 照旧不挂）
       S13k（v68.2 集成，第一轮遗留 ②）启动即进观看页不先挂再退：v68.2 起导出的互动谱（数据在 head）与 ?pub= 深链，桌面 1280 / 手机 390 从开机到观看页
       一次都不挂（无 #flw-r1 / #flw-mtop、FLOW.mounted 假），退出观看后照常挂上；没进成（互动谱数据坏、?pub= 拉谱 404）立即补挂 flow，不停在旧外壳
   S14 无抖动：静置 1.5s render 增量 ≤1；1280→1440→1280 每步 render ≤3
   S15 数据零改动：挂载、开关全部菜单、切右栏、resize 前后 song JSON 不变；musetab-* 键差集 ⊆ {musetab-flow, musetab-rdock}
   S16 命中区：#flw-r1 / #editbar / #mixer-dock / #flw-rstrip 内可见按钮最小边 ≥28
   S17 对比度：行 1 文字对框架底 ≥4.5，当前页签对 --toolbar ≥4.5（浅 / 深 / 系统深）
   v67.9 收尾（验收回归，修前红修后绿）：S4e 竖条空白处不算点谱面外（SC-4）· S4f 本机存储不可用时钉住只对本次（SC-7）· S5c 旧左栏面板浮层贴外壳（L4）·
       S6h 截断页签展开不盖「窗口 N ▾」/「＋」/ 保存状态（L2）· S7a 窗口列表 role=dialog、页签读屏名（B4）· S8a 键盘切换后焦点交还谱面（B5）· S8c 同名窗口换位落盘（B6）·
       S11f / S11i 文件 ▾ 排版 / 输出（SC-1；v68.1 起两项切模式，菜单不压住「文件」）· S11g 快速新建与文件菜单不叠（B3）· S11h 菜单读屏名 + 键盘激活后焦点回按钮（B4 / B5）·
       S12h 窄档状态栏单行（L1）· S12i 时值状态项不截走空格 / Enter（B1）· S12j 循环认整小节多选（B2）· S13d 退场收菜单（SC-5）·
       S13g / S13h 互动谱快照回退不带外壳、收件人不进 flow（SC-6）· S13i 启动台竖条 inert（SC-4）· S15a 数据基线取默认外壳（SC-3）·
       S2 / S3 收紧到方案值 84 / 116 与 684 / 652 / 784（L5）· CI 里拿不到 S0 基线判红（SC-2，基线在 shellflow_ref.json）
   v68.0 骨架（左栏空容器提交，计划 §3.10）：S0 对拍前两边的版本角标 #rc-ver 统一成占位（APP_VER 每版必变，不是外壳差异）· M.clear 左栏右缘取 #flw-left ·
       S5a/b 两态谱纸同宽 · S5c 改为「旧面板不再浮出 / 不挂 paper-tight」· S5d 消解 L3 · S12a/g 撤「混音 ▴」· S13 各退场场景 #flw-left 同样不可见、启动台 inert
   env：MUSETAB_URL 被测页（缺省 ../index.html）· MUSETAB_REF 参考页（文件路径或 file://；none＝跳过 S0）· MUSETAB_REF_COMMIT 改基线提交 · ONLY=S2,S6 只跑部分 · SHOTS=目录 存主状态截图 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const FLOWU = withQ(URL0, 'shell=flow'), CLASSICU = withQ(URL0, 'shell=classic');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
/* 对拍基线：tests/shellflow_ref.json（完整 SHA；deploy.yml 浅克隆后按它单独 fetch 这一个提交，验收 SC-2）；env MUSETAB_REF_COMMIT 可临时改 */
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shellflow_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.MUSETAB_REF_COMMIT || REF.commit || '2675b9c';
const IN_CI = !!process.env.CI && process.env.MUSETAB_REF !== 'none';   /* CI 里拿不到基线＝判红（此前只打 ⚠️，默认外壳泄漏在部署闸门里漏过）；MUSETAB_REF=none 是本地显式跳过 */
const NEWKEYS = ['musetab-flow', 'musetab-rdock'];
const J = x => JSON.stringify(x);

/* —— 页面内工具（每个上下文的 init 脚本；只定义 window.__*，不碰页面状态）—— */
function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10;
    return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom), vis: __vis(e) }; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__lib = () => { try { return JSON.parse(localStorage.getItem('musetab-library-v1') || '[]') || []; } catch (_) { return []; } };
  window.__saved = () => { const ids = new Set(__lib().map(e => e && e.id).filter(Boolean)); return docs.map((d, i) => { const s = i === curDocI ? song : d.song; return !!(s && s.id && ids.has(s.id)); }); };
  window.__titles = () => docs.map((d, i) => ((i === curDocI ? song : d.song) || {}).title);
  window.__menu = () => { const m = document.getElementById('popmenu'); return m ? { m: m.dataset.m || '', flw: m.classList.contains('flw-mn'), n: m.querySelectorAll('[data-fa]').length } : null; };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { NWP.quickMenuClose(); } catch (_) {} try { lbMenuClose(); } catch (_) {} try { closeModal(); } catch (_) {}
    try { exitPersonal({ fromPop: true }); } catch (_) {} const c = document.getElementById('circle'); if (c) c.remove(); };
  /* 场景：与方案实拍 inject.js 同一批预设（tabs6 / tabs10 存入 0 / 2 / 4 三个窗口，与其 SAVE3 相同） */
  window.__scn = (k, o) => {
    o = o || {};
    window.guardReplace = p => p();
    try { hideStartPad(); } catch (_) {}
    const one = s => { addDoc(s, () => {}); closeDocAt(0); };
    const L10 = ['两只老虎', '送别', '欢乐颂（四部合唱）', '欢乐颂（教学对照谱）', '欢乐颂（钢琴独奏）', '小步舞曲', '指弹练习曲', '卡农进行', '流行进行', '小星星（分解'];
    if (k === 'songbie') { one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; }
    else if (k === 'newpacc') { NWP.quickCreate('pacc'); closeDocAt(0); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; }
    else if (k === 'gtr') { one(__P('两只老虎')); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; }
    else if (k === 'staff') { one(__P('欢乐颂（钢琴独奏）')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; }
    else if (k === 'three') { one(__P('送别')); addDoc(__P('两只老虎'), () => {}); addDoc(__P('小步舞曲'), () => {}); switchDocTo(0); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; }
    else if (k === 'tabs6' || k === 'tabs10') {
      (k === 'tabs6' ? L10.slice(0, 6) : L10).forEach((n, i) => { addDoc(__P(n), () => {}); if (!i) closeDocAt(0); });
      if (o.save !== false) [0, 2, 4].forEach(i => { if (i < docs.length) { switchDocTo(i); saveToLibrary(); try { closeModal(); } catch (_) {} } });
      switchDocTo(k === 'tabs6' ? 1 : 9);
    }
    try { clampSel(); } catch (_) {}
    try { blurSel = false; lastEnt = null; } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { n: docs.length, cur: curDocI, title: song.title, row: sel.row };
  };
  /* 对比度（同 tv_v678 / tv_b7a 的算法：半透明底逐层合成） */
  window.__col = s => { s = String(s || '').trim(); let m = s.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : +m[4]]; return null; };
  window.__over = (f, b) => f[3] >= 1 ? f.slice(0, 3) : f.slice(0, 3).map((c, i) => c * f[3] + b[i] * (1 - f[3]));
  window.__L = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
  window.__cr = (fg, bg) => { const B = bg.slice(0, 3), F = __over(fg, B); const a = __L(F), b = __L(B); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };
  window.__bgOf = el => { const st = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = __col(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { st.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255]; for (let i = st.length - 1; i >= 0; i--) b = __over(st[i], b); return b.concat(1); };
}

/* —— 页面内测量 —— */
const M = {
  shell: () => ({ flow: document.body.classList.contains('flow'), pre: document.documentElement.classList.contains('flow-pre'),
    active: typeof FLOW !== 'undefined' && FLOW.active, mounted: typeof FLOW !== 'undefined' && FLOW.mounted, key: localStorage.getItem('musetab-flow'),
    r1: __R('#flw-r1'), eb: __R('#editbar'), top: __R('#top'), md: __R('#mixer-dock'), rd: __R('#right-dock'), rs: __R('#flw-rstrip'), ih: innerHeight, iw: innerWidth,
    cls: ['flw-rd', 'flw-rs', 'flw-ro'].filter(c => document.body.classList.contains(c)),
    home: { tabs: (document.getElementById('doc-tabs').parentElement || {}).id || document.getElementById('doc-tabs').parentElement.tagName,
      beat: document.getElementById('beat-box').parentElement.id || document.getElementById('beat-box').parentElement.className,
      zoom: document.getElementById('eb-zoom').parentElement.id || document.getElementById('eb-zoom').parentElement.className } }),
  visH: () => { const sw = __R('#score-wrap'), md = __R('#mixer-dock'), top = __R('#top');
    const lbw = document.getElementById('lb-wrap'), lbb = lbw && (lbw.querySelector('.lb-bar') || lbw), lb = lbb && __vis(lbb) ? __R(lbb) : null;
    const sbw = document.getElementById('flw-sbar'), sb = sbw && __vis(sbw) ? __R(sbw) : null;   /* v68.3 谱面上方的悬浮条（外框含衬底） */
    const t = Math.max(sw.y, top.vis ? top.b : 0, lb ? lb.b : 0, sb ? sb.b : 0), bt = Math.min(md && md.vis ? md.y : innerHeight, sw.b, innerHeight);
    return { vh: Math.round((bt - t) * 10) / 10, lb: lb ? lb.h : 0, sb: sb ? sb.h : 0, st: Math.round(document.getElementById('score-wrap').scrollTop), sw: sw.y + '–' + sw.b }; },
  clear: () => { const sv = __R('#score'), ld = __R('#left-dock'), fl = document.getElementById('left-flyout'), lf = __R('#flw-left');
    let L = ld && ld.vis ? ld.r : 0; const fly = !!(fl && __vis(fl)); if (fly) L = Math.max(L, __R(fl).r);
    if (lf && lf.vis) L = Math.max(L, lf.r);   /* v68.0 左栏 #flw-left 248 常驻 */
    const rd = __R('#right-dock'), rs = __R('#flw-rstrip'); let R = innerWidth; if (rd && rd.vis) R = Math.min(R, rd.x); if (rs && rs.vis) R = Math.min(R, rs.x);
    return { L, R, x: sv.x, r: sv.r, w: sv.w, ok: sv.x >= L - 1 && sv.r <= R + 1, fly, tight: document.body.classList.contains('paper-tight'), fixed: !!(song.layout && song.layout.fixed) }; },
  hits: () => { const out = []; ['#flw-r1', '#editbar', '#mixer-dock', '#flw-rstrip'].forEach(s => { const root = document.querySelector(s); if (!root) return;
    root.querySelectorAll('button,[role="button"],[role="tab"]').forEach(e => { if (!__vis(e)) return; const r = e.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 27.5) out.push(s + ' ' + (e.id ? '#' + e.id : (e.getAttribute('data-fa') || e.className || e.tagName)) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)
        + ' 「' + ((e.getAttribute('aria-label') || e.textContent || e.title || '').trim().slice(0, 8)) + '」'); }); });
    let n = 0; ['#flw-r1', '#editbar', '#mixer-dock', '#flw-rstrip'].forEach(s => { const root = document.querySelector(s); if (root) root.querySelectorAll('button,[role="button"],[role="tab"]').forEach(e => { if (__vis(e)) n++; }); });
    return { n, small: out }; },
  tabs: () => { const tabs = [...document.querySelectorAll('#doc-tabs .dtab')].map(t => { const r = t.getBoundingClientRect();
      return { i: +t.dataset.doc, on: t.classList.contains('on'), vis: __vis(t), w: Math.round(r.width * 10) / 10, l: r.left, r: r.right, dot: !!t.querySelector('.dt-dot'),
        sel: t.getAttribute('aria-selected'), role: t.getAttribute('role') }; });
    const ov = document.getElementById('flw-tabovf');
    return { r1: __R('#flw-r1'), tabs, ovf: ov ? { vis: __vis(ov), t: ov.textContent.replace(/\s+/g, ' ').trim() } : null, add: __R('#dt-add'), n: docs.length, cur: curDocI,
      tl: !!document.querySelector('#doc-tabs [role="tablist"]'), saved: __saved() }; },
  con: () => { const res = {}; const ck = (k, el) => { if (!el || !__vis(el)) return; res[k] = __cr(__col(getComputedStyle(el).color), __bgOf(el)); };
    ck('文件', document.getElementById('flw-file')); ck('保存状态', document.getElementById('flw-save')); ck('账号', document.querySelector('#flw-acct .flw-av') || document.getElementById('flw-acct'));
    ck('发布', document.getElementById('flw-pub')); ck('窗口N', document.getElementById('flw-tabovf'));
    ck('非当前页签', document.querySelector('#doc-tabs .dtab:not(.on):not(.flw-off) .dt-t')); ck('当前页签', document.querySelector('#doc-tabs .dtab.on .dt-t'));
    const on = document.querySelector('#doc-tabs .dtab.on'); if (on) res.当前页签底 = getComputedStyle(on).backgroundColor;
    const tb = document.createElement('div'); tb.style.background = 'var(--toolbar)'; document.body.appendChild(tb); res.toolbar = getComputedStyle(tb).backgroundColor; tb.remove();
    return res; }
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const OUT = {};   /* 编号 → 输出行（并发跑，最后按编号顺序打印） */
  let pass = 0, total = 0;
  const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + d : '')); };
  const NOTE = (id, s) => (OUT[id] = OUT[id] || []).push(s);
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', acceptDownloads: true });
    ctx.setDefaultTimeout(6000);   /* 控件缺失时尽快判红，不卡满 30 秒 */
    await ctx.addInitScript(INIT);
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push((o.tag || (w + 'x' + h)) + ' PAGEERR:' + e.message));
    await pg.goto(o.url || FLOWU); await pg.waitForTimeout(o.wait || 1200);
    await prep(pg, o.theme);
    pg.__ctx = ctx; return pg;
  };
  const prep = (pg, theme) => pg.evaluate(th => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    if (th) document.documentElement.dataset.theme = th;
    window.__dl = []; try { const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) __dl.push(this.download); return oc.apply(this, arguments); }; } catch (_) {}
    window.__toasts = []; try { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
    const st = document.createElement('style'); st.id = 'tv-sf-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); }, theme || null);
  const close = pg => pg.__ctx.close();
  const EV = (pg, fn, a) => pg.evaluate(fn, a);
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  /* 点开菜单（opener 选择器），按项名点（.flw-ml 去掉说明后的文字；外观三段按钮看自身文字） */
  const menuItem = async (pg, opener, label, o = {}) => {
    await EV(pg, () => __shut());
    if (opener) { await wait(pg, 120);   /* 骨架：菜单收起后 80ms 内按到它的按钮算「收起」那一下，程序收菜单后先等一等 */
      await pg.click(opener, { timeout: 2500 }); await wait(pg, 150); }
    const h = await pg.evaluateHandle(lb => { const m = document.getElementById('popmenu'); if (!m) return null;
      const own = el => { const ml = el.querySelector('.flw-ml'); if (!ml) return (el.getAttribute('aria-label') || el.textContent || '').trim(); const c = ml.cloneNode(true); c.querySelectorAll('.flw-md').forEach(x => x.remove()); return c.textContent.trim(); };
      const items = [...m.querySelectorAll('[data-fa]')];
      return items.find(el => own(el) === lb) || items.find(el => own(el).startsWith(lb)) || null; }, label);
    const el = h.asElement();
    if (!el) { const m = await EV(pg, () => __menu()); await EV(pg, () => __shut()); return { ok: false, menu: m }; }
    const dis = await el.evaluate(x => x.getAttribute('aria-disabled') === 'true');   /* Playwright 把 aria-disabled 当不可点，置灰项（点了说明原因）要 force */
    try { await el.click({ timeout: 2500, force: dis }); }
    catch (e) { const why = await el.evaluate(x => { const q = x.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return { at: [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)], top: t ? (t.id || t.className || t.tagName) : null, inMenu: !!(t && t.closest('#popmenu')) }; }).catch(() => null);
      await EV(pg, () => __shut()); return { ok: false, why: '「' + label + '」点不到 ' + J(why) }; }
    await wait(pg, o.wait || 220);
    return { ok: true };
  };
  /* 下载：事件到了 + 页面里 <a download> 的文件名是 .mtab.json + 下载内容就是当前 song（file:// 下 suggestedFilename 恒为 download，故读页面记下的名字） */
  const dlInfo = async (pg, d) => { if (!d) return null; let body = null; try { const p = await d.path(); body = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {}
    const r = await EV(pg, () => ({ name: (window.__dl || []).slice(-1)[0] || '', title: song.title, m: JSON.stringify(song.measures) }));
    return { ok: /\.mtab\.json$/.test(r.name) && !!body && body.title === r.title && JSON.stringify(body.measures) === r.m, name: r.name, body: !!body }; };
  const pool = async (jobs, n) => { const q = jobs.slice(); const run1 = async () => { while (q.length) { const j = q.shift(); await j(); } }; await Promise.all(Array.from({ length: n }, run1)); };
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const jobs = [];

  /* ================= S0 不带开关零差异（对拍 v67.8）+ S0b 不变量 ================= */
  const refURL = (() => {
    const e = process.env.MUSETAB_REF;
    if (e === 'none') return null;
    if (e) return e.startsWith('file://') ? e : 'file://' + path.resolve(e);
    try { const txt = cp.execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
      const f = path.join(os.tmpdir(), 'tv_shellflow_ref_' + REF_COMMIT.slice(0, 12) + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return null; }
  })();
  const IDS = ['top', 'editbar', 'doc-tabs', 'left-dock', 'right-dock', 'mixer-dock'];
  const snapDefault = async (url, w, h, scheme, scen, init) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    if (init) await ctx.addInitScript(init);
    const pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message));
    await pg.goto(url); await pg.waitForTimeout(1600);
    if (scen === 'multidoc') { await pg.evaluate(() => { window.guardReplace = p => p(); addDoc(PRESETS[0].make()); addDoc(PRESETS[1].make()); addDoc(demoSong()); try { setRTab('info'); } catch (_) {} render(); }); await pg.waitForTimeout(800); }
    /* 版本角标 #rc-ver（＝APP_VER，每版必变，不是外壳差异）两边统一成同一占位再对拍：此前基线是 v67.8、被测是 v67.9 起，
       S0 恒在右栏 outerHTML / body.innerHTML 的角标处报差（v68.0 骨架核实：除角标外与 v67.8 逐字节相同） */
    await pg.evaluate(() => { const rv = document.getElementById('rc-ver'); if (rv) rv.textContent = 'vX'; });
    /* v68.3 有意改动 ⑤（D2 打开文件认 MIDI / MusicXML / Guitar Pro）：顶栏 #b-open 的提示与 #file-in 的 accept 两边统一成同一占位再对拍（行为见 tv_fix683 X2） */
    await pg.evaluate(() => { const o = document.getElementById('b-open'), f = document.getElementById('file-in'); if (o) o.title = 'X'; if (f) f.setAttribute('accept', 'X'); });
    const r = await pg.evaluate(IDS => {
      const R = el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100).join(','); };
      const o = {};
      IDS.forEach(id => { const el = document.getElementById(id); o[id] = el ? { html: el.outerHTML, rect: R(el), parent: el.parentElement && (el.parentElement.id || el.parentElement.tagName),
        cs: (() => { const s = getComputedStyle(el); return [s.display, s.position, s.height, s.width, s.padding, s.backgroundColor, s.zIndex].join('|'); })() } : null; });
      const all = {}; document.querySelectorAll('[id]').forEach(el => { all[el.id] = R(el) + '|' + getComputedStyle(el).display; });
      const c = document.body.cloneNode(true); c.querySelectorAll('script').forEach(n => n.remove());
      return { o, all, body: document.body.className, bodyStyle: document.body.getAttribute('style'), html: document.documentElement.className, inner: c.innerHTML,
        keys: Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().join(','), song: JSON.stringify(song),
        inv: typeof FLOW === 'undefined' ? null : { mounted: FLOW.mounted, active: FLOW.active,
          nodes: document.querySelectorAll('[id^="flw-"],.flw-x,[data-flw-slot],[data-pri],[data-fa],.flw-off,.flw-mn').length,
          bodyFlw: [...document.body.classList].filter(c => /^fl(ow|w-)/.test(c)), styleFlw: /--flw-/.test(document.body.getAttribute('style') || ''),
          tabs: document.getElementById('doc-tabs').parentElement === document.body, beat: document.getElementById('beat-box').parentElement.id,
          zoom: document.getElementById('eb-zoom').parentElement.id, key: localStorage.getItem('musetab-flow'), rdock: localStorage.getItem('musetab-rdock') } };
    }, IDS);
    await ctx.close(); return { r, pe };
  };
  /* v68.2 切默认（PLAN §5.1 / §5.4）：不带开关＝新外壳 flow，旧外壳只在 ?shell=classic 或本机键 musetab-flow='0'（偏好设置「使用旧版布局」）下出现。
     S0 / S0b 改为对拍「?shell=classic 的旧外壳」与「基线提交（shellflow_ref.json，v68.1 a8c2089）不带开关的默认外壳＝旧外壳」：
     6 组都用 ?shell=classic，另加一组「不带参数、本机键已是 '0'」（偏好设置那条路，地址里没有 shell=）。
     本版对旧外壳的有意改动（显式例外，均不在这几组开机 / 多窗口快照里出现，故仍要求零差异）：
       ① 偏好设置多一行「使用旧版布局」（PREF_ITEMS oldshell；只在弹窗打开时出现）
       ② TRK-5 引擎 / 混音台音量读数 trkVolOf（存了 0 的显示 0%、不出声；快照里没有 vol=0 的轨）
       ③ TRK-6 删吉他轨混音 / 变调夹随行前移（只在删轨时）
       ④ PN-5 五线谱音名键按本小节调（只在中途转调的五线谱小节里；这几份谱没有转调）
       ⑤ v68.3 D2：顶栏「打开」#b-open 的提示与 #file-in 的 accept（认 MIDI / MusicXML / Guitar Pro）——快照前两边统一成占位；
          v68.3 其余缺陷修复（D1 存储被禁用的内存版与提示、D3 填词框多字分配、D4 MusicXML 轨名、D5 观看意图不写键）都不在这几组开机 / 多窗口快照的路径上，仍要求零差异
     musetab-flow 键不参与键集合对拍（旧外壳写 '0'，基线默认外壳不写），另由 S0b 断言其值为 '0' */
  if (want('S0')) jobs.push(async () => {
    const CASES = [['boot', 1280, 800, 'light'], ['boot', 1440, 900, 'dark'], ['multidoc', 1280, 800, 'light'], ['multidoc', 1280, 800, 'dark'], ['multidoc', 1440, 900, 'light'], ['multidoc', 1440, 900, 'dark']];
    const inv = [];
    const KEY0 = () => { try { localStorage.setItem('musetab-flow', '0'); } catch (_) {} };
    const cmp = async ([sc, w, h, th], newUrl, tag, init) => {
      const B = await snapDefault(newUrl, w, h, th, sc, init);
      const v = B.r.inv;
      if (!v || v.mounted !== false || v.active !== false || v.nodes || v.bodyFlw.length || v.styleFlw || !v.tabs || v.beat !== 'beat-host' || v.zoom !== 'editbar' || v.key !== '0' || v.rdock !== null || B.pe.length)
        inv.push(tag + ' ' + J(v) + (B.pe.length ? ' 报错 ' + B.pe.join('|') : ''));
      if (!refURL) return null;
      const A = await snapDefault(refURL, w, h, th, sc);
      const diffs = [];
      IDS.forEach(id => { const a = A.r.o[id], c = B.r.o[id];
        if (!a || !c) { diffs.push(id + ' 缺失'); return; }
        if (a.html !== c.html) { let i = 0; while (i < a.html.length && a.html[i] === c.html[i]) i++; diffs.push(id + '.outerHTML @' + i + ' ref=' + J(a.html.slice(i, i + 60)) + ' new=' + J(c.html.slice(i, i + 60))); }
        if (a.rect !== c.rect) diffs.push(id + '.rect ' + a.rect + ' → ' + c.rect);
        if (a.parent !== c.parent) diffs.push(id + '.parent ' + a.parent + ' → ' + c.parent);
        if (a.cs !== c.cs) diffs.push(id + '.computed ' + a.cs + ' → ' + c.cs); });
      const idDiff = [...new Set([...Object.keys(A.r.all), ...Object.keys(B.r.all)])].filter(k => A.r.all[k] !== B.r.all[k]);
      if (idDiff.length) diffs.push('带 id 元素 ' + idDiff.length + ' 个不同：' + idDiff.slice(0, 5).map(k => k + ' ' + A.r.all[k] + ' → ' + B.r.all[k]).join('；'));
      if (A.r.body !== B.r.body) diffs.push('body.class ' + A.r.body + ' → ' + B.r.body);
      if (A.r.bodyStyle !== B.r.bodyStyle) diffs.push('body@style ' + A.r.bodyStyle + ' → ' + B.r.bodyStyle);
      if (A.r.html !== B.r.html) diffs.push('html.class ' + A.r.html + ' → ' + B.r.html);
      if (A.r.inner !== B.r.inner) { let i = 0; const x = A.r.inner, y = B.r.inner; while (i < x.length && x[i] === y[i]) i++; diffs.push('body.innerHTML @' + i + ' ref=' + J(x.slice(i, i + 70)) + ' new=' + J(y.slice(i, i + 70))); }
      const ka = A.r.keys.split(',').filter(k => k !== 'musetab-flow').join(','), kb = B.r.keys.split(',').filter(k => k !== 'musetab-flow').join(',');
      if (ka !== kb) diffs.push('musetab-* 键 ' + A.r.keys + ' → ' + B.r.keys);
      if (A.r.song !== B.r.song) diffs.push('song JSON 不同');
      return { tag, diffs, n: Object.keys(B.r.all).length };
    };
    const res = [];
    for (let i = 0; i < CASES.length; i += 2) { const part = await Promise.all(CASES.slice(i, i + 2).map(c => cmp(c, CLASSICU, '?shell=classic ' + c.join(' ')))); res.push(...part); }
    res.push(await cmp(['multidoc', 1440, 900, 'light'], URL0, '本机键 0（不带参数）multidoc 1440 light', KEY0));
    T('S0', inv.length === 0, 'S0b 旧外壳（?shell=classic，及不带参数但本机键 musetab-flow=\'0\'）：FLOW 未挂载、无任何 flow 节点 / 类 / 属性（[id^=flw-] .flw-x [data-flw-slot] [data-pri] [data-fa] .flw-off）、body 无 flow 类与 --flw 令牌、#doc-tabs 在 body · #beat-box 在 #beat-host · #eb-zoom 在 #editbar、musetab-flow 为 \'0\'、不写 musetab-rdock、无报错',
      inv.length ? inv.join('；') : (CASES.length + 1) + ' 组');
    if (!refURL && IN_CI) T('S0', false, 'S0 CI 里拿不到对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：默认外壳零差异无法验证，判红',
      'deploy.yml 的 test job 要先 git fetch --depth=1 origin <shellflow_ref.json 的 commit>');
    else if (!refURL) NOTE('S0', '⚠️  S0 与 ' + (REF.version || 'v67.8') + ' 对拍跳过：拿不到参考（git show ' + REF_COMMIT.slice(0, 12) + ' 失败；本地可设 MUSETAB_REF=参考 index.html，MUSETAB_REF=none 为显式跳过）');
    else { const bad = res.filter(x => x && x.diffs.length);
      T('S0', bad.length === 0, 'S0 旧外壳（?shell=classic / 本机键 0）与基线 ' + (REF.version || '') + '（' + REF_COMMIT.slice(0, 7) + '）不带开关的默认外壳零差异（' + res.length + ' 组：6 个容器 outerHTML / 几何 / 父节点 / 计算样式 · 全部带 id 元素 rect 与 display · body / html 类与内联样式 · body.innerHTML · musetab-* 键（除 musetab-flow）· song JSON；有意改动见上方注释 ①–⑤）',
        bad.length ? bad.map(x => x.tag + '：' + x.diffs.join(' | ')).join('\n      ') : res.map(x => x.tag + '（' + x.n + ' 个 id）').join('；')); }
  });

  /* ================= S1 开关与本机键 =================
     v68.2 切默认改断言（PLAN §1.2「v68.2（切默认）」）：读到 '0' 才不开，无键 / '1' 都开；?shell=classic 写 '0'；?shell=flow 只对本次生效（v68.2 收尾 OU-2 起不删键）；
     原 S1a「?shell=flow 写 '1'」与 S1c「存储不可用时 ?shell=flow 只对本次、去参数回默认外壳」是 v67.9–v68.1 预览期的口径 */
  if (want('S1')) jobs.push(async () => {
    try {
      const pg = await open(1280, 800, { tag: 'S1', url: URL0 });
      const a0 = await EV(pg, M.shell);
      await pg.goto(FLOWU); await wait(pg, 1000); const a = await EV(pg, M.shell);
      await pg.goto(URL0); await wait(pg, 1000); const b2 = await EV(pg, M.shell);
      T('S1', a0.flow && a0.pre && a0.active && a0.mounted && a0.key === null && a.flow && a.pre && a.active && a.key === null && b2.flow && b2.key === null,
        'S1a 不带参数（无键）→ html.flow-pre · body.flow · FLOW.active（v68.2 默认新外壳）；?shell=flow 不写键（删键），去掉参数刷新仍是 flow', J({ def: [a0.flow, a0.key], flow: [a.flow, a.key], reload: [b2.flow, b2.key] }));
      await pg.goto(CLASSICU); await wait(pg, 1000);
      const c = await EV(pg, () => Object.assign({ r1: !!document.getElementById('flw-r1'), rs: !!document.getElementById('flw-rstrip'), x: document.querySelectorAll('.flw-x,[data-flw-slot]').length }, (() => {
        const s = document.getElementById('doc-tabs').parentElement; return { tabs: s === document.body }; })()));
      const c2 = await EV(pg, M.shell);
      await pg.goto(URL0); await wait(pg, 1000); const d = await EV(pg, M.shell);
      await pg.goto(FLOWU); await wait(pg, 1000); const e2 = await EV(pg, M.shell);
      await pg.goto(URL0); await wait(pg, 1000); const f2 = await EV(pg, M.shell);
      /* v68.2 收尾 OU-2 改口径：?shell=flow 只对本次生效、不删键（此前删键——选了旧版布局的人每打开一次预览期收藏的 ?shell=flow 书签，选择就被抹掉一次）；
         换回新版走偏好设置「使用旧版布局」关（它删键，见 tv_flowdef F1e） */
      T('S1', !c2.flow && !c2.pre && !c2.mounted && c2.key === '0' && !c.r1 && !c.rs && !c.x && c.tabs && c2.home.beat === 'beat-host' && c2.home.zoom === 'editbar' && !d.flow && !d.pre && d.key === '0'
        && e2.flow && e2.key === '0' && !f2.flow && f2.key === '0',
        'S1b ?shell=classic → 键写 \'0\'、不挂载（没有 #flw-r1 / #flw-rstrip / 落点）、#doc-tabs 在 body、#beat-box 在 #beat-host、#eb-zoom 在 #editbar；再去掉参数仍是旧外壳；?shell=flow 只对本次进新外壳、键 \'0\' 不动，去参数回到用户选的旧外壳', J({ c, home: c2.home, key: c2.key, after: [d.flow, d.key], back: [e2.flow, e2.key, f2.flow, f2.key] }));
      await close(pg);
      /* 本机存储不可用（读写 musetab-flow 抛错）：两个参数都只对本次生效；不带参数＝默认新外壳 */
      const priv = () => { const g = Storage.prototype.getItem, s = Storage.prototype.setItem, r = Storage.prototype.removeItem;
        Storage.prototype.getItem = function (k) { if (k === 'musetab-flow') throw new Error('隐私模式'); return g.apply(this, arguments); };
        Storage.prototype.setItem = function (k) { if (k === 'musetab-flow') throw new Error('隐私模式'); return s.apply(this, arguments); };
        Storage.prototype.removeItem = function (k) { if (k === 'musetab-flow') throw new Error('隐私模式'); return r.apply(this, arguments); }; };
      const pp = await open(1280, 800, { tag: 'S1p', init: priv, url: CLASSICU });
      const e = await EV(pp, () => ({ flow: document.body.classList.contains('flow'), pre: document.documentElement.classList.contains('flow-pre') }));
      await pp.goto(URL0); await wait(pp, 1000);
      const f = await EV(pp, () => ({ flow: document.body.classList.contains('flow'), pre: document.documentElement.classList.contains('flow-pre') }));
      await pp.goto(FLOWU); await wait(pp, 1000);
      const g = await EV(pp, () => ({ flow: document.body.classList.contains('flow') }));
      T('S1', !e.flow && !e.pre && f.flow && f.pre && g.flow, 'S1c 本机存储不可用（读写 musetab-flow 抛错）时 ?shell=classic 只对本次生效、不报错；去掉参数即回默认新外壳；?shell=flow 照常', J({ e, f, g }));
      await close(pp);
    } catch (e) { T('S1', false, 'S1 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S2 S3 S4（静态）S5 S16 S17：3 视口 × 浅 / 深 ================= */
  const VPS = [[1280, 800], [1366, 768], [1440, 900]];
  const GEO = {};
  const MINVH = { 1280: 638, 1366: 606, 1440: 738 };   /* v68.3 悬浮条展开（吸住）：v68.2 方案值 684 / 652 / 784 减外框 46（验收 L5：#top 多出的 1px 不吸收） */
  const MINVHC = { 1280: 650, 1366: 618, 1440: 750 };  /* v68.3 悬浮条收起（吸住）：减外框 34 */
  if (['S2', 'S3', 'S4', 'S5', 'S16'].some(want)) for (const [w, h] of VPS) for (const sc of ['light', 'dark']) jobs.push(async () => {
    const tag = w + '×' + h + (sc === 'dark' ? ' 深' : ' 浅'), g = GEO[tag] = { err: null, clear: [] };
    try {
      const pg = await open(w, h, { scheme: sc, tag });
      await EV(pg, () => __scn('songbie')); await wait(pg, 350);
      await EV(pg, () => { try { closeFlyout(); } catch (_) {} render(); }); await wait(pg, 300);
      g.sh = await EV(pg, M.shell); g.hit = await EV(pg, M.hits);
      /* S3：吸住状态（scrollTop≥50）量展开 / 收起两态的谱面可见高，量完滚回、展开（musetab-sbar 删键） */
      await EV(pg, () => { document.getElementById('score-wrap').scrollTop = 120; }); await wait(pg, 120);
      g.vh = await EV(pg, M.visH);
      await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await wait(pg, 120);
      g.vhc = await EV(pg, M.visH);
      await EV(pg, () => { FLOW.sbar.toggle({ exp: true }); document.getElementById('score-wrap').scrollTop = 0; }); await wait(pg, 150);
      if (w !== 1366) await shot(pg, 'flow-' + w + 'x' + h + '-' + sc);
      for (const k of ['songbie', 'newpacc']) {
        if (k === 'newpacc') { await EV(pg, () => __scn('newpacc')); await wait(pg, 400); }
        for (const fly of [false, true]) {
          await EV(pg, f => { if (f) openFlyout('lyr'); else closeFlyout(); render(); }, fly); await wait(pg, 350);
          g.clear.push(Object.assign({ k, want: fly }, await EV(pg, M.clear)));   /* want＝是否调了 openFlyout；fly＝旧面板实际可见（v68.0 flow 下恒假） */
        }
      }
      if (w !== 1366) { await EV(pg, () => { closeFlyout(); render(); }); await wait(pg, 250); await shot(pg, 'flow-' + w + 'x' + h + '-' + sc + '-newpacc'); }
      await close(pg);
    } catch (e) { g.err = e.message.split('\n')[0]; }
  });

  /* ================= S5 续：v68.0 左栏 248 常驻后旧左栏面板不再浮出 / 挤窄谱纸（计划 §0-13、§3.2-3）=================
     v67.9 的 S5c 断言旧面板浮层贴外壳（验收 L4：≤1180 宽 · 1280 钉住右栏后 D7 挂 paper-tight）。v68.0 起 flow 下 #left-dock 整体隐藏，
     paperFitGuard 在 flow 下不判 D7——同样两个场景改断言：openFlyout 之后面板不可见、#flw-left 248 贴外壳底到状态栏顶、不挂 paper-tight、FLY_AUTO_CLOSED 不消耗、谱纸宽不变 */
  if (want('S5')) jobs.push(async () => {
    try {
      const rows = [];
      for (const [w, pin] of [[1180, false], [1280, true]]) {
        const pg = await open(w, 800, { tag: 'S5x-' + w, init: pin ? () => { try { localStorage.setItem('musetab-rdock', '1'); } catch (_) {} } : null });
        await EV(pg, () => __scn('newpacc')); await wait(pg, 500);
        const w0 = await EV(pg, () => __R('#score').w);
        await EV(pg, () => { openFlyout('lyr'); render(); }); await wait(pg, 500);
        rows.push(await EV(pg, w0 => { const lf = __R('#flw-left');
          return { w: innerWidth, fly: __vis('#left-flyout'), ld: __vis('#left-dock'), tight: document.body.classList.contains('paper-tight'), fac: FLY_AUTO_CLOSED,
            lf: lf && [lf.x, lf.y, lf.w, lf.b], top: __R('#top').b, md: __R('#mixer-dock').y, sw: [w0, __R('#score').w], clear: __vis('#score') && __R('#score').x >= lf.r - 1 }; }, w0));
        await close(pg);
      }
      /* v68.1（计划 §4.5「<1280 宽档」）：<1280 左栏收成 56 竖条（body.flw-narrow，--flw-lw:56px）——1180 这一行改断言 56，1280 仍是 248 */
      T('S5', rows.every(r => !r.fly && !r.ld && !r.tight && r.fac === false && r.lf && r.lf[0] === 0 && Math.abs(r.lf[2] - (r.w < 1280 ? 56 : 248)) <= 0.5 && Math.abs(r.lf[1] - r.top) <= 0.5 && Math.abs(r.lf[3] - r.md) <= 0.5
          && Math.abs(r.sw[0] - r.sw[1]) <= 1 && r.clear),
        'S5c 左栏常驻（v68.0 248；v68.1 起 <1280 收成 56 竖条）：1180 宽与 1280 钉住右栏两场景 openFlyout 后旧面板不可见、#flw-left 宽 56 / 248 贴外壳底到状态栏顶、不挂 paper-tight、FLY_AUTO_CLOSED 不消耗、谱纸宽不变',
        J(rows));
    } catch (e) { T('S5', false, 'S5c 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S5d v67.9 遗留 L3：1440–1536 右栏停靠 + 旧左栏面板打开时谱纸比 1439 窄 85px —— v68.0 左栏 248 常驻后消解 =================
     停靠阈值「视口 − 248 − 264 − 16 ≥ 912」与左栏实宽一致：1439 竖条态与 1440 / 1536 停靠态的预设谱 #score 同为 870，新建谱（fixwide）≥870 */
  if (want('S5')) jobs.push(async () => {
    try {
      const rows = [];
      for (const w of [1439, 1440, 1536]) {
        const pg = await open(w, 900, { tag: 'S5d-' + w });
        await EV(pg, () => __scn('songbie')); await wait(pg, 350);
        await EV(pg, () => { openFlyout('lyr'); render(); }); await wait(pg, 400);
        const dock = await EV(pg, () => document.body.classList.contains('flw-rd')), a = await EV(pg, M.clear);
        await EV(pg, () => __scn('newpacc')); await wait(pg, 450);
        const b2 = await EV(pg, M.clear);
        rows.push({ w, dock, pre: a.w, preOk: a.ok, L: a.L, neu: b2.w, neuOk: b2.ok, fixed: b2.fixed });
        await close(pg);
      }
      T('S5', rows.every(r => r.preOk && r.neuOk && Math.abs(r.pre - 870) <= 2 && r.neu >= 869.5) && rows.map(r => r.dock).join() === 'false,true,true',
        'S5d v67.9 遗留 L3 消解：1439（竖条）/ 1440 / 1536（右栏停靠）旧面板「打开」时预设谱 #score 同为 870±2、新建谱 ≥870，paperClear 全真（此前 1440 停靠只剩 785）',
        J(rows));
    } catch (e) { T('S5', false, 'S5d 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S4 右栏交互（1280）================= */
  if (want('S4')) jobs.push(async () => {
    try {
      const pg = await open(1280, 800, { tag: 'S4' });
      await EV(pg, () => __scn('songbie')); await wait(pg, 400);
      /* v68.1 右栏页（计划 §4.4）：书写模式竖条＝属性 / 文字 / 智能（旧「创作 / 信息」两页在 flow 下隐藏）——此前点的是「信息」，同一断言意图改点「属性」 */
      const info = '#flw-rstrip [data-fa="rd:tab"][data-p="prop"]';
      const has = await EV(pg, s => !!document.querySelector(s), info);
      const pw0 = await EV(pg, () => ({ pw: document.getElementById('paper').clientWidth, n: RENDER_STAT.n }));
      if (has) await pg.click(info, { timeout: 2500 }); await wait(pg, 250);
      const o1 = await EV(pg, () => ({ rd: __R('#right-dock'), rs: __R('#flw-rstrip'), ro: document.body.classList.contains('flw-ro'), tab: FLOW.rd.page(),
        pw: document.getElementById('paper').clientWidth, n: RENDER_STAT.n, sc: __R('#score') }));
      T('S4', has && o1.ro && o1.rd.vis && Math.abs(o1.rd.w - 288) <= 0.5 && Math.abs(o1.rd.r - o1.rs.x) <= 1 && o1.tab === 'prop' && o1.pw === pw0.pw && o1.n - pw0.n <= 1,
        'S4b 1280 竖条「属性」→ 右栏浮出 288、右缘贴竖条左缘、切到属性页（v68.1 右栏页：属性 · 文字 · 智能）；浮出是覆盖层：谱纸宽不变、不重排', J({ has, rd: o1.rd, rsx: o1.rs && o1.rs.x, tab: o1.tab, pw: [pw0.pw, o1.pw], dn: o1.n - pw0.n }));
      await pg.keyboard.press('Escape'); await wait(pg, 150);
      const o2 = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro'), rd: __vis('#right-dock') }));
      if (has) await pg.click(info); await wait(pg, 150);
      await pg.mouse.click(500, 400); await wait(pg, 200);
      const o3 = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro'), rd: __vis('#right-dock') }));
      if (has) { await pg.click(info); await wait(pg, 150); await pg.click(info); await wait(pg, 150); }
      const o4 = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro'), rd: __vis('#right-dock') }));
      T('S4', !o2.ro && !o2.rd && !o3.ro && !o3.rd && !o4.ro && !o4.rd, 'S4c 浮出后 Esc 收起、点谱面（外部）收起、再点同一页收起', J({ esc: o2, out: o3, again: o4 }));
      const pin = '#flw-rstrip [data-fa="rd:pin"]';
      const hasPin = await EV(pg, s => !!document.querySelector(s), pin);
      if (hasPin) await pg.click(pin); await wait(pg, 400);
      const p1 = await EV(pg, () => ({ rd: __R('#right-dock'), rs: __vis('#flw-rstrip'), cls: ['flw-rd', 'flw-rs', 'flw-ro'].filter(c => document.body.classList.contains(c)), key: localStorage.getItem('musetab-rdock') }));
      const c1 = await EV(pg, M.clear);
      await pg.reload(); await wait(pg, 1100); await prep(pg); await EV(pg, () => __scn('songbie')); await wait(pg, 300);
      const p2 = await EV(pg, () => ({ rd: __R('#right-dock'), rs: __vis('#flw-rstrip'), key: localStorage.getItem('musetab-rdock') }));
      const unpin = await EV(pg, () => { const e = document.querySelector('#right-dock [data-fa="rd:pin"], #flw-rstrip [data-fa="rd:pin"]'); if (!e) return null; e.click(); return e.id || e.className; });
      await wait(pg, 400);
      const p3 = await EV(pg, () => ({ rd: __vis('#right-dock'), rs: __R('#flw-rstrip'), key: localStorage.getItem('musetab-rdock') }));
      T('S4', hasPin && p1.rd.vis && Math.abs(p1.rd.w - 264) <= 0.5 && !p1.rs && J(p1.cls) === '["flw-rd"]' && p1.key === '1' && c1.ok && p2.rd.vis && Math.abs(p2.rd.w - 264) <= 0.5 && !p2.rs && p2.key === '1'
        && unpin && !p3.rd && p3.rs.vis && Math.abs(p3.rs.w - 40) <= 0.5 && p3.key === null,
        'S4d 钉住 → 1280 也停靠 264（竖条消失、paperClear 仍真）、写 musetab-rdock=\'1\'，刷新保持；取消钉住 → 删键、回竖条 40', J({ p1: [p1.rd && p1.rd.w, p1.rs, p1.cls, p1.key], clear: c1.ok, reload: [p2.rd && p2.rd.w, p2.key], unpin, p3: [p3.rd, p3.rs && p3.rs.w, p3.key] }));
      /* 验收 SC-4（§0-4 点外部名单）：选中音符后在竖条空白处按下指针——不算「点谱面外」：blurSel 不变、拍区选择保留、不重排 */
      await EV(pg, () => { sel = { mi: 2, row: 'vox', vi: 0, ci: 1, si: 1 }; blurSel = false; selRange = { row: 'vox', vi: 0, m1: 2, c1: 0, m2: 3, c2: 0 }; render(); }); await wait(pg, 250);
      const gp = await EV(pg, () => { const g = __R('#flw-rstrip .flw-rs-grow'); return g && g.h > 20 ? [g.x + g.w / 2, g.y + g.h / 2] : null; });
      const o0 = await EV(pg, () => ({ n: RENDER_STAT.n }));
      if (gp) { await pg.mouse.click(gp[0], gp[1]); await wait(pg, 300); }
      const o5 = await EV(pg, () => ({ n: RENDER_STAT.n, blur: blurSel, sr: !!selRange, ro: document.body.classList.contains('flw-ro') }));
      T('S4', !!gp && !o5.blur && o5.sr && o5.n === o0.n && !o5.ro, 'S4e 竖条空白处按下指针不算「点谱面外」（§0-4 名单含 #flw-rstrip）：blurSel 仍为假、拍区选择保留、RENDER_STAT.n 不增、也不浮出', J({ at: gp, o0, o5 }));
      await close(pg);
      /* 验收 SC-7：本机存储写不进（Safari 隐私模式类）时点「钉住」——只对本次生效，提示写明；取消钉住照常 */
      const pq = await open(1280, 800, { tag: 'S4-priv', init: () => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'musetab-rdock') throw new DOMException('quota', 'QuotaExceededError'); return s.apply(this, arguments); }; } });
      await EV(pq, () => __scn('songbie')); await wait(pq, 300);
      await EV(pq, () => { window.__toasts = []; });
      await pq.click('#flw-rs-pin'); await wait(pq, 400);
      const v1 = await EV(pq, () => ({ rd: document.body.classList.contains('flw-rd'), rs: document.body.classList.contains('flw-rs'), w: __R('#right-dock').w, toast: (window.__toasts || []).join('|'), key: localStorage.getItem('musetab-rdock'),
        pressed: (document.getElementById('flw-rd-pin') || {}).getAttribute && document.getElementById('flw-rd-pin').getAttribute('aria-pressed') }));
      await EV(pq, () => document.getElementById('flw-rd-pin').click()); await wait(pq, 400);
      const v2 = await EV(pq, () => ({ rd: document.body.classList.contains('flw-rd'), rs: document.body.classList.contains('flw-rs') }));
      T('S4', v1.rd && !v1.rs && Math.abs(v1.w - 264) <= 0.5 && /只对本次/.test(v1.toast) && v1.key === null && v1.pressed === 'true' && !v2.rd && v2.rs,
        'S4f 本机存储不可用时「钉住」只对本次生效（验收 SC-7）：右栏真的停靠 264、按钮按下态、提示写明「只对本次有效」；取消钉住回竖条', J({ v1, v2 }));
      await close(pq);
    } catch (e) { T('S4', false, 'S4 交互执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S6 S7 S8 S17 页签 ================= */
  const TABCHK = (t, w) => {
    const vis = t.tabs.filter(x => x.vis), on = t.tabs.find(x => x.on), off = vis.filter(x => !x.on);
    return { vis: vis.length, on, offMin: off.length ? Math.min(...off.map(x => x.w)) : null, all: t.tabs.map(x => (x.on ? '*' : '') + x.w + (x.vis ? '' : '(收)')).join(' '),
      inR1: vis.every(x => x.l >= t.r1.x - 0.5 && x.r <= t.r1.r + 0.5), ovf: t.ovf, w };
  };
  if (['S6', 'S7', 'S8', 'S17'].some(want)) jobs.push(async () => {
    try {
      /* 1280：6 窗口全露 · × 28 · 空心圈 · 对比度 · 中键关闭 */
      const pg = await open(1280, 800, { tag: 'S6-1280' });
      await EV(pg, () => __scn('tabs6')); await wait(pg, 400);
      const t = await EV(pg, M.tabs), c = TABCHK(t, 1280);
      T('S6', t.n === 6 && c.vis === 6 && c.on && c.on.w >= 148 && c.on.w <= 240 && c.offMin >= 140 && c.inR1 && t.ovf && !t.ovf.vis,
        'S6a 1280 宽 6 个窗口全部露出：非当前 ≥140、当前 148–240、都在行 1 内，不出「窗口 N ▾」', J({ vis: c.vis, widths: c.all, ovf: t.ovf }));
      const dots = t.tabs.map(x => x.dot), sv = t.saved;
      T('S6', sv.filter(Boolean).length === 3 && dots.every((d, i) => d === !sv[i]), 'S6b 只有未入库的窗口标空心圈 .dt-dot（存入 0 / 2 / 4 三个后它们不标）', J({ dots, saved: sv }));
      const xs = await EV(pg, () => { const x = document.querySelector('#doc-tabs .dtab.on .dt-x'); return x && __vis(x) ? __R(x) : null; });
      await pg.hover('#doc-tabs .dtab[data-doc="3"] .dt-t'); await wait(pg, 120);
      const xh = await EV(pg, () => { const x = document.querySelector('#doc-tabs .dtab[data-doc="3"] .dt-x'); return x && __vis(x) ? __R(x) : null; });
      T('S6', !!(xs && xs.w >= 28 && xs.h >= 28 && xh && xh.w >= 28 && xh.h >= 28), 'S6c 关闭 × 命中区 ≥28×28（当前页签常显、非当前悬停时出现）', J({ cur: xs, hover: xh }));
      for (const th of ['light', 'dark']) { await EV(pg, x => { document.documentElement.dataset.theme = x; }, th); await wait(pg, 80); (GEO['con-' + th] = await EV(pg, M.con)); }
      await EV(pg, () => { delete document.documentElement.dataset.theme; });
      /* 中键关闭非当前、未入库、有内容的窗口 3（欢乐颂（教学对照谱））。
         v68.2 收尾 NU-8：原样示例谱关窗不再转存（示例随时能从「示例曲谱」再开；见 tv_flowdef F8e）——这里先在窗口 3 上改一笔（作曲署名），
         它才是「用户的内容」，红线（未入库、有内容的绝不丢）照旧验 */
      await EV(pg, () => { const d = docs[3]; if (d && d.song) d.song.composer = (d.song.composer || '') + '（改）'; });
      const m0 = await EV(pg, () => ({ n: docs.length, lib: __lib().length, t3: __titles()[3], s3: __saved()[3], asIs: docIsDemoAsIs(docs[3].song) }));
      const box = await EV(pg, () => __R('#doc-tabs .dtab[data-doc="3"] .dt-t'));
      await pg.mouse.click(box.x + 10, box.y + box.h / 2, { button: 'middle' }); await wait(pg, 300);
      const m1 = await EV(pg, t3 => ({ n: docs.length, lib: __lib().length, inLib: __lib().some(e => e.title === t3), gone: !__titles().includes(t3) }), m0.t3);
      T('S6', !m0.s3 && !m0.asIs && m1.n === m0.n - 1 && m1.lib === m0.lib + 1 && m1.inLib && m1.gone, 'S6d 中键关闭：docs 减 1；未入库有内容（改过的）窗口自动存入「我的曲谱」（库多一条，与 tv_multidoc T3 同一红线）', J({ m0, m1 }));
      await close(pg);

      /* 1366：6 窗口每个 ≥160 */
      const p2 = await open(1366, 768, { tag: 'S6-1366' });
      await EV(p2, () => __scn('tabs6')); await wait(p2, 400);
      const t2 = await EV(p2, M.tabs), c2 = TABCHK(t2, 1366);
      T('S6', c2.vis === 6 && c2.offMin >= 160 && c2.on && c2.on.w >= 148 && c2.on.w <= 240 && c2.inR1, 'S6e 1366 宽 6 个窗口全露，非当前每个 ≥160（约 8 个汉字；当前页签按曲名 148–240，「送别」只两个字取下限 148）', J({ widths: c2.all }));
      await close(p2);

      /* 1440 深：6 窗口全露 · 10 窗口露 6 ＋「窗口 4」· 系统深色对比度 */
      const p3 = await open(1440, 900, { tag: 'S6-1440', scheme: 'dark' });
      await EV(p3, () => __scn('tabs6')); await wait(p3, 400);
      const t3 = await EV(p3, M.tabs), c3 = TABCHK(t3, 1440);
      GEO['con-sysdark'] = await EV(p3, M.con);
      await close(p3);
      const p3b = await open(1440, 900, { tag: 'S6-1440-10', scheme: 'dark' });
      await EV(p3b, () => __scn('tabs10')); await wait(p3b, 400);
      const t4 = await EV(p3b, M.tabs), c4 = TABCHK(t4, 1440);
      await shot(p3b, 'flow-1440x900-dark-tabs10');
      T('S6', c3.vis === 6 && c3.inR1 && t4.n === 10 && c4.vis === 6 && c4.on && c4.on.i === 9 && c4.inR1 && t4.ovf && t4.ovf.vis && t4.ovf.t.replace(/\D/g, '') === '4',
        'S6f 1440：6 窗口全露；10 窗口露 6 个（含当前第 10 个）＋「窗口 4 ▾」', J({ six: c3.all, ten: c4.all, ovf: t4.ovf }));
      await close(p3b);

      /* 1280 · 10 窗口：露 5 ＋「窗口 5」· 当前可见 · 键盘 · 窗口列表 · 关闭已存入的 */
      const p4 = await open(1280, 800, { tag: 'S6-1280-10' });
      await EV(p4, () => __scn('tabs10')); await wait(p4, 400);
      const t5 = await EV(p4, M.tabs), c5 = TABCHK(t5, 1280);
      await shot(p4, 'flow-1280x800-light-tabs10');
      T('S6', t5.n === 10 && c5.vis === 5 && c5.on && c5.on.i === 9 && c5.on.vis && c5.on.r <= t5.r1.r && c5.inR1 && t5.ovf && t5.ovf.vis && t5.ovf.t.replace(/\D/g, '') === '5' && t5.add && t5.add.vis && t5.add.r <= t5.r1.r,
        'S6g 1280：10 窗口露 5 个＋「窗口 5 ▾」；switchDocTo(9) 后当前页签右缘 ≤ #flw-r1 右缘，「＋」也在行 1 内', J({ widths: c5.all, ovf: t5.ovf, onR: c5.on && c5.on.r, r1R: t5.r1.r, add: t5.add && t5.add.r }));
      /* S8 键盘 */
      const k0 = await EV(p4, () => ({ cur: curDocI, sel: JSON.stringify(sel) }));
      await p4.focus('#doc-tabs .dtab.on');
      await p4.keyboard.press('ArrowLeft'); await wait(p4, 80);
      const k1 = await EV(p4, () => { const a = document.activeElement; return { foc: a && a.classList.contains('dtab') ? +a.dataset.doc : null, cur: curDocI, sel: JSON.stringify(sel), ti: a && a.tabIndex }; });
      await p4.keyboard.press('ArrowLeft'); await wait(p4, 80);
      const k2 = await EV(p4, () => { const a = document.activeElement; return { foc: a && a.classList.contains('dtab') ? +a.dataset.doc : null, cur: curDocI }; });
      await p4.keyboard.press('Enter'); await wait(p4, 250);
      const k3 = await EV(p4, () => ({ cur: curDocI, on: +((document.querySelector('#doc-tabs .dtab.on') || {}).dataset || {}).doc, sel1: document.querySelectorAll('#doc-tabs .dtab[aria-selected="true"]').length,
        foc: document.activeElement && document.activeElement.classList.contains('dtab') ? +document.activeElement.dataset.doc : null, ae: document.activeElement.tagName,
        rove: ((document.querySelector('#doc-tabs .dtab.on') || {}).tabIndex), m: JSON.stringify(song.measures), n: docs.length }));
      /* 验收 B5：键盘切换后焦点交还谱面——数字键落进这个窗口的谱面，Delete 也作用于谱面（不关窗口），口径一致 */
      await p4.keyboard.press('5'); await wait(p4, 150);
      const k4 = await EV(p4, () => ({ cur: curDocI, n: docs.length, m: JSON.stringify(song.measures) }));
      await p4.keyboard.press('Delete'); await wait(p4, 200);
      k4.n2 = await EV(p4, () => docs.length);
      await EV(p4, () => { undo(); undo(); render(); });
      T('S8', t5.tl && t5.tabs.every(x => x.role === 'tab') && k1.foc === 8 && k1.cur === 9 && k1.sel === k0.sel && k1.ti === 0 && k2.foc === 7 && k2.cur === 9 && k3.cur === 7 && k3.on === 7 && k3.sel1 === 1
        && k3.foc === null && k3.ae === 'BODY' && k3.rove === 0 && k4.cur === 7 && k4.n === k3.n && k4.m !== k3.m && k4.n2 === k3.n,
        'S8a 页签键盘：[role=tablist] / role=tab；←← 只移焦点（不切窗口、谱面光标不动、roving tabindex）；Enter 切到焦点窗口（aria-selected 唯一），焦点交还谱面（验收 B5，同鼠标点页签）：之后数字键落音、Delete 不关窗口',
        J({ k1, k2, k3: Object.assign({}, k3, { m: undefined }), k4: { cur: k4.cur, n: [k4.n, k4.n2], edited: k4.m !== k3.m } }));
      /* S7 窗口列表 */
      await EV(p4, () => { switchDocTo(9); render(); }); await wait(p4, 250);
      await p4.click('#flw-tabovf'); await wait(p4, 200);
      const w1 = await EV(p4, () => { const m = document.getElementById('popmenu'); if (!m) return null; const rows = [...m.querySelectorAll('.flw-wrow')];
        /* 验收 B4：窗口列表含搜索框，不能是 role=menu——是 role=dialog 且有名字；行是有名字的按钮，行内不再嵌 role=button；页签读屏名＝曲名（+ 仅存本机），不含「关闭《…》」 */
        const tabs = [...document.querySelectorAll('#doc-tabs .dtab')];
        const a11y = m.getAttribute('role') === 'dialog' && !!m.getAttribute('aria-label') && !m.querySelector('[role="menu"] input') && !m.querySelector('.flw-wrow [role="button"]')
          && rows.every(r => (r.getAttribute('aria-label') || '').length > 0 && !r.hasAttribute('role'))
          && tabs.every(t => { const l = t.getAttribute('aria-label') || ''; return l.length > 0 && !/关闭/.test(l); }) && tabs.every(t => !t.querySelector('.dt-x:not([aria-hidden="true"])'));
        return { m: m.dataset.m, n: rows.length, hMin: Math.min(...rows.map(r => r.getBoundingClientRect().height)), inp: !!m.querySelector('input'), cur: rows.filter(r => r.classList.contains('on')).length, a11y }; });
      await p4.fill('#popmenu input', '送别'); await wait(p4, 120);
      const w2 = await EV(p4, () => [...document.querySelectorAll('#popmenu .flw-wrow')].filter(r => __vis(r)).map(r => r.textContent.trim().slice(0, 12)));
      await p4.fill('#popmenu input', ''); await wait(p4, 80);
      const vis2 = await EV(p4, () => [...document.querySelectorAll('#popmenu .flw-wrow')].filter(r => __vis(r)).length);
      const tgt = await EV(p4, () => __titles().indexOf(__titles().find(t => /送别/.test(t))));
      await p4.click('#popmenu .flw-wrow[data-i="' + tgt + '"]'); await wait(p4, 300);
      const w3 = await EV(p4, () => ({ cur: curDocI, menu: !!document.getElementById('popmenu'), onVis: __vis('#doc-tabs .dtab.on'), title: song.title }));
      T('S7', w1 && w1.n === 10 && w1.hMin >= 44 && w1.inp && w1.cur === 1 && w2.length === 1 && /送别/.test(w2[0]) && vis2 === 10 && w3.cur === tgt && !w3.menu && w3.onVis && w1.a11y,
        'S7a 窗口列表：行数＝窗口数 10、行高 ≥44、带搜索框；搜「送别」只剩 1 行，清空恢复；点行切到该窗口（收起的也会露出成当前页签）；读屏（验收 B4）：列表 role=dialog 有名字、行为有名字的按钮、不嵌套可交互元素，页签名不含「关闭」', J({ w1, w2, vis2, w3, tgt }));
      const s0 = await EV(p4, () => ({ n: docs.length, saved: __saved(), lib: __lib().length, titles: __titles() }));
      const r = await menuItem(p4, '#flw-tabovf', '关闭已存入的窗口', { wait: 350 });
      const s1 = await EV(p4, () => ({ n: docs.length, saved: __saved(), lib: __lib().length, titles: __titles() }));
      const keepT = s0.titles.filter((_, i) => !s0.saved[i]);
      T('S7', r.ok && s0.saved.filter(Boolean).length === 3 && s1.n === 7 && s1.saved.every(x => !x) && J(s1.titles) === J(keepT) && s1.lib === s0.lib,
        'S7b「关闭已存入的窗口」只关 song.id 在库里的 3 个，未入库的 7 个原样保留（顺序不变、库条目数不变）', J({ r, before: s0.saved.map(Number).join(''), after: s1.titles.length, lib: [s0.lib, s1.lib] }));
      await close(p4);

      /* S8 拖动排序：docs[] 重排、当前窗口不变、musetab-docs-v1 往返 */
      const p5 = await open(1440, 900, { tag: 'S8-drag' });
      await EV(p5, () => __scn('tabs6', { save: false })); await wait(p5, 400);
      const d0 = await EV(p5, () => ({ titles: __titles(), cur: curDocI, title: song.title, docObj: (window.__d1 = docs[curDocI], 1) }));
      const a = await EV(p5, () => __R('#doc-tabs .dtab[data-doc="0"]')), z = await EV(p5, () => __R('#doc-tabs .dtab[data-doc="2"]'));
      await p5.mouse.move(a.x + a.w / 2, a.y + a.h / 2); await p5.mouse.down(); await p5.mouse.move(a.x + a.w / 2 + 12, a.y + a.h / 2, { steps: 2 });
      await p5.mouse.move(z.x + z.w * 0.8, z.y + z.h / 2, { steps: 10 }); await p5.mouse.up(); await wait(p5, 250);
      const d1 = await EV(p5, () => { persistFlush(); let ls = null; try { ls = JSON.parse(localStorage.getItem('musetab-docs-v1')); } catch (_) {}
        return { titles: __titles(), cur: curDocI, title: song.title, same: docs[curDocI] === window.__d1, tabs: [...document.querySelectorAll('#doc-tabs .dtab .dt-t')].map(x => x.textContent),
          ls: ls && { keys: Object.keys(ls).sort().join(','), cur: ls.cur, titles: (ls.docs || []).map(s => s && s.title) } }; });
      const expect = [d0.titles[1], d0.titles[2], d0.titles[0], ...d0.titles.slice(3)];
      await p5.goto(FLOWU); await wait(p5, 1300); await prep(p5);
      const d2 = await EV(p5, () => ({ titles: __titles(), cur: curDocI, title: song.title }));
      T('S8', J(d1.titles) === J(expect) && d1.same && d1.title === d0.title && d1.cur === 0 && J(d1.tabs) === J(expect) && d1.ls && d1.ls.keys === 'cur,docs' && d1.ls.cur === d1.cur && J(d1.ls.titles) === J(expect)
        && J(d2.titles) === J(expect) && d2.title === d0.title && d2.cur === d1.cur,
        'S8b 拖动页签排序：窗口 1 拖到窗口 3 之后 → docs[] 重排、当前窗口对象与曲名不变（curDocI 修正）、页签同序；musetab-docs-v1 仍是 {cur, docs} 且顺序同步，刷新后顺序与当前窗口还原',
        J({ before: d0.titles.map(x => x.slice(0, 4)), after: d1.titles.map(x => x.slice(0, 4)), cur: [d0.cur, d1.cur, d2.cur], ls: d1.ls && d1.ls.keys, reload: d2.titles.map(x => x.slice(0, 4)) }));
      /* 验收 B6：当前窗口不动、两个同名且都未入库的窗口互换位置（docsSig 只拼 id || 曲名 + 当前下标，签名不变）——顺序也要写进 musetab-docs-v1，刷新后不还原 */
      await EV(p5, () => { while (docs.length > 1) closeDocAt(docs.length - 1); const x = __P('小步舞曲'), a = __P('送别'), b2 = __P('两只老虎'); a.title = b2.title = '同名窗口';
        addDoc(x, () => {}); addDoc(a, () => {}); addDoc(b2, () => {}); closeDocAt(0); switchDocTo(0); render(); persistFlush(); }); await wait(p5, 300);   /* 换位前的状态先落盘（真实使用里早已写过） */
      const MS = () => EV(p5, () => ({ cur: curDocI, m: docs.map((d, i) => ((i === curDocI ? song : d.song).measures || []).length), titles: __titles() }));
      const e0 = await MS();
      await EV(p5, () => { FLOW.r1.moveDoc(2, 1); persistFlush(); }); await wait(p5, 200);
      const e1 = await MS();
      await p5.goto(FLOWU); await wait(p5, 1300); await prep(p5);
      const e2 = await MS();
      T('S8', e0.m.length === 3 && e0.cur === 0 && e0.m[1] !== e0.m[2] && J(e1.m) === J([e0.m[0], e0.m[2], e0.m[1]]) && e1.cur === 0 && J(e2.m) === J(e1.m) && e2.cur === 0 && e2.titles[1] === '同名窗口' && e2.titles[2] === '同名窗口',
        'S8c 同名未入库窗口拖动换位（验收 B6）：当前窗口不动、两个同名窗口互换后 musetab-docs-v1 照样重写，刷新后保持换位后的顺序（按小节数辨认）', J({ e0: e0.m, e1: e1.m, reload: e2.m, cur: [e0.cur, e1.cur, e2.cur] }));
      await close(p5);
      /* 验收 L2：截断页签悬停展开只在页签区里（不盖「窗口 N ▾」「＋」与保存状态），指针离开原位即收起，点它们第一下就生效 */
      const p6 = await open(1280, 800, { tag: 'S6-peek' });
      await EV(p6, () => { __scn('tabs10'); switchDocTo(0); render(); }); await wait(p6, 400);
      const pk = await EV(p6, () => { const vis = [...document.querySelectorAll('#doc-tabs .dtab')].filter(t => __vis(t)); const t = vis[vis.length - 1], i = +t.dataset.doc;
        const s2 = i === curDocI ? song : docs[i].song; s2.title = '一首名字特别特别长的练习曲（第二版·修订）'; persist(); persistFlush(); render(); return i; });
      await wait(p6, 400);
      const tb = await EV(p6, i => __R('#doc-tabs .dtab[data-doc="' + i + '"]'), pk);
      await p6.mouse.move(tb.x + tb.w / 2, tb.y + tb.h / 2); await wait(p6, 900);
      const pe = await EV(p6, i => { const t = document.querySelector('#doc-tabs .dtab[data-doc="' + i + '"]'), ov = __R('#flw-tabovf'), ad = __R('#dt-add'), sv = __R('#flw-save'), tl = __R('#doc-tabs .flw-tl');
        return { peek: !!(t && t.classList.contains('flw-peek')), r: __R(t), ov, ad: ad && ad.x, sv: sv && sv.x, tl: tl && tl.x }; }, pk);
      const oc = await EV(p6, () => { const r = __R('#flw-tabovf'); return [r.x + r.w / 2, r.y + r.h / 2]; });
      await p6.mouse.move(oc[0], oc[1], { steps: 4 }); await wait(p6, 120);
      const pe2 = await EV(p6, () => !!document.querySelector('#doc-tabs .flw-peek'));
      await p6.mouse.click(oc[0], oc[1]); await wait(p6, 250);
      const om = await EV(p6, () => __menu());
      T('S6', pe.peek && pe.r.w > tb.w + 1 && pe.ov.vis && pe.r.r <= pe.ov.x + 0.5 && pe.r.r <= pe.ad + 0.5 && pe.r.r <= pe.sv + 0.5 && pe.r.x >= pe.tl - 0.5 && !pe2 && om && om.m === 'ovf',
        'S6h 截断页签悬停展开（验收 L2）：只在页签区内展开（右缘 ≤「窗口 N ▾」左缘，不盖「＋」与保存状态），指针移出原位即收起，点「窗口 N ▾」第一下就打开窗口列表',
        J({ tab: [tb.x, tb.r], peek: pe.peek && [pe.r.x, pe.r.r], ovf: pe.ov && pe.ov.x, add: pe.ad, save: pe.sv, after: pe2, menu: om }));
      await close(p6);
    } catch (e) { T('S6', false, 'S6–S8 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S9 S10 行 2 ================= */
  if (want('S9') || want('S10')) jobs.push(async () => {
    try {
      const pg = await open(1280, 800, { tag: 'S9' });
      const rows = [];
      for (const k of ['songbie', 'staff', 'gtr']) {
        await EV(pg, x => __scn(x), k); await wait(pg, 350);
        rows.push(await EV(pg, () => { const eb = document.getElementById('editbar'), r = eb.getBoundingClientRect();
          const kids = [...eb.querySelectorAll('button,.eb-unit,.eb-grp,input,select')].filter(e => __vis(e));
          const out = kids.filter(e => { const q = e.getBoundingClientRect(); return q.top < r.top - 0.5 || q.bottom > r.bottom + 0.5 || q.right > r.right + 0.5; }).map(e => e.id || e.className);
          return { ctx: FLOW.ctx(), sw: eb.scrollWidth, cw: eb.clientWidth, h: Math.round(r.height * 10) / 10, off: eb.querySelectorAll('.flw-off').length, out, n: kids.length,
            more: __vis('#flw-more'), tie: __vis('#eb-tie'), tup: __vis('#editbar [data-tup="3"]') }; }));
      }
      T('S9', rows.map(x => x.ctx).join() === 'jp,st,tab' && rows.every(x => x.sw <= x.cw + 1 && x.off === 0 && Math.abs(x.h - 40) <= 0.5 && !x.out.length && x.more && x.tie && x.tup),
        'S9a 1280 宽简谱 / 五线谱 / 六线谱三种语境：#editbar 单行（scrollWidth ≤ clientWidth+1、所有控件在 40 高的行内）、一个都不收（.flw-off＝0）、连音线 / 3 连音 / 更多 ▾ 在', J(rows.map(x => [x.ctx, x.sw + '/' + x.cw, x.h, x.off, x.out.slice(0, 3)])));
      /* S10 连音两键 */
      await EV(pg, () => __scn('songbie')); await wait(pg, 250);
      const j0 = await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; blurSel = false; render(); return { s: JSON.stringify(song.measures), tie: !!curCol().tie }; });
      await pg.click('#eb-tie'); await wait(pg, 150);
      const j1 = await EV(pg, () => ({ s: JSON.stringify(song.measures), tie: !!song.measures[0].voxes[0][0].tie }));
      await EV(pg, () => { undo(); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; render(); });
      const j2 = await EV(pg, () => { const u = JSON.stringify(song.measures); document.getElementById('b-tie').click(); return { u, s: JSON.stringify(song.measures) }; });
      await EV(pg, () => { undo(); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; render(); });
      await pg.click('#editbar [data-tup="3"]'); await wait(pg, 150);
      const j3 = await EV(pg, () => ({ s: JSON.stringify(song.measures), tup: song.measures[0].voxes[0][0].tup }));
      await EV(pg, () => { undo(); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; render(); applyTuplet(3); });
      const j4 = await EV(pg, () => JSON.stringify(song.measures));
      T('S10', j1.tie !== j0.tie && j2.u === j0.s && j2.s === j1.s && !!j3.tup && j3.s === j4,
        'S10 行 2 连音线 #eb-tie 与记号面板 #b-tie 效果相同（curCol().tie 翻转、谱数据逐字节相同）；行 2 的 3 连音置位 curCol().tup，与 applyTuplet(3) 相同', J({ tie: [j0.tie, j1.tie], same: j2.s === j1.s, tup: j3.tup, tupSame: j3.s === j4 }));
      /* 变窄：收进「更多 ▾」。计划写 1100 宽开始收；实测简谱轨 1100 仍放得下，所以从 1100 起逐档（1100 / 1000 / 900）缩到出现收起为止，同宽六线谱的收起情况一并记下 */
      let n0 = null, W2 = 0;
      for (const w2 of [1100, 1000, 900]) {
        await pg.setViewportSize({ width: w2, height: 800 }); await wait(pg, 450);
        await EV(pg, () => __scn('songbie')); await wait(pg, 400);
        n0 = await EV(pg, () => { const eb = document.getElementById('editbar'); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; render();
          return { off: [...eb.querySelectorAll('.flw-off')].map(e => e.id || ('dur' + e.dataset.dur)), sw: eb.scrollWidth, cw: eb.clientWidth, deg: curCol().deg, flow: document.body.classList.contains('flow') }; });
        await wait(pg, 200); W2 = w2;
        if (n0.off.length) break;
      }
      await EV(pg, () => __scn('gtr')); await wait(pg, 350);
      const tabOff = await EV(pg, () => [...document.querySelectorAll('#editbar .flw-off')].map(e => e.id || ('dur' + e.dataset.dur)));
      await EV(pg, () => { __scn('songbie'); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; render(); }); await wait(pg, 350);
      await pg.click('#flw-more'); await wait(pg, 200);
      const mm = await EV(pg, () => { const m = document.getElementById('popmenu'); if (!m) return null; const top = []; for (const el of m.children) { if (el.tagName === 'HR') break; if (el.dataset && el.dataset.fa) top.push(el); }
        const hid = [...document.querySelectorAll('#editbar .flw-off')];
        return { m: m.dataset.m, head: (m.querySelector('.flw-mh') || {}).textContent || '', n: top.length, ok: hid.every(h => top.some(x => x.dataset.old && document.querySelector(x.dataset.old) === h)),
          labels: top.map(x => ((x.querySelector('.flw-ml') || x).textContent || '').trim()), rest: top.findIndex(x => x.dataset.old === '#eb-rest') }; });
      let restSame = null;
      if (mm && mm.rest >= 0) {
        await pg.click('#popmenu [data-old="#eb-rest"]'); await wait(pg, 200);
        restSame = await EV(pg, () => { const a = { s: JSON.stringify(song.measures), deg: song.measures[0].voxes[0][0].deg, sel: JSON.stringify(sel) };
          undo(); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; lastEnt = null; render(); document.getElementById('eb-rest').click();
          return { deg: a.deg, same: a.s === JSON.stringify(song.measures), selSame: a.sel === JSON.stringify(sel) }; });
      }
      T('S9', n0.flow && n0.off.length >= 1 && n0.sw <= n0.cw + 1 && mm && mm.m === 'more' && mm.n === n0.off.length && mm.ok && restSame && restSame.deg === 0 && restSame.same && restSame.selSame && n0.deg !== 0,
        'S9b 变窄后低优先键按 data-pri 收起（.flw-off，单行不溢出），「更多 ▾」顶部逐个列出被收起的键；菜单里点「休止」＝点 #eb-rest（当前音变休止、谱数据与光标逐字节相同）',
        J({ width: W2, off: n0.off, tabSameW: tabOff, sw: n0.sw + '/' + n0.cw, menu: mm && { n: mm.n, head: mm.head, labels: mm.labels, ok: mm.ok }, restSame }));
      await close(pg);
    } catch (e) { T('S9', false, 'S9 / S10 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S11 委托：保存状态 · 发布 · 文件 ▾ · 账号 ▾ ================= */
  if (want('S11')) jobs.push(async () => {
    try {
      const pg = await open(1440, 900, { tag: 'S11' });
      await EV(pg, () => { localStorage.setItem('musetab-library-v1', '[]'); __scn('three'); }); await wait(pg, 400);
      const F0 = await EV(pg, () => Object.keys(song).sort());
      const st = () => EV(pg, () => { const b2 = document.getElementById('flw-save'); return b2 ? { t: b2.innerText.replace(/\s+/g, ' ').trim(), vis: __vis(b2), id: song.id || null, lib: __lib().length, h: Math.round(b2.getBoundingClientRect().height) } : null; });
      /* 保存状态 · 发布 */
      const s1 = await st();
      await pg.click('#flw-pub'); await wait(pg, 300);
      /* v68.1 迁移（计划 §4.3「发布卡」）：行 1「发布」＝切到「输出」并打开右栏「发布与导出」页、焦点落到卡上的「存入并提交发布」（这一下不存）；
         再点卡上的按钮才先存入、再出原发布卡——共 2 次点击，不离开编辑器 */
      const pb0 = await EV(pg, () => ({ mode: FLOW.mode.cur, page: FLOW.rd.page(), ae: (document.activeElement || {}).id || '', id: song.id || null }));
      await pg.click('#flw-pub-go'); await wait(pg, 300);
      const pb = await EV(pg, () => ({ id: song.id || null, lib: __lib().length, t: ((document.querySelector('#popmenu .t') || {}).textContent || '') }));
      await EV(pg, () => { __shut(); setMode('write'); }); await wait(pg, 200);
      const s2 = await st();
      await pg.click('#flw-save'); await wait(pg, 200);
      const sm = await EV(pg, () => __menu());
      await EV(pg, () => __shut());
      const dl1 = pg.waitForEvent('download', { timeout: 4000 }).catch(() => null);
      const r0 = await menuItem(pg, '#flw-save', '另存为文件');
      const f1 = await dlInfo(pg, await dl1);
      await EV(pg, () => { switchDocTo(1); render(); }); await wait(pg, 200);
      const s3 = await st();
      await pg.click('#flw-save'); await wait(pg, 300);
      const s4 = await st();
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 500);
      await EV(pg, () => { switchDocTo(2); render(); }); await wait(pg, 250);
      const s5 = await st();
      await pg.click('#flw-save'); await wait(pg, 300);
      const s6 = await st();
      const TM = /\d{2}:\d{2}/;
      T('S11', s1.vis && /仅存本机/.test(s1.t) && /存入我的曲谱/.test(s1.t) && !s1.id && /已存入我的曲谱/.test(s2.t) && TM.test(s2.t) && s2.id
        && /仅存本机/.test(s5.t) && !/存入我的曲谱/.test(s5.t) && !s5.id && s6.id && /已存入/.test(s6.t) && TM.test(s6.t) && s6.lib === s5.lib + 1
        && /仅存本机/.test(s3.t) && s4.id && s4.lib === s3.lib + 1 && /已存入我的曲谱/.test(s4.t),
        'S11a 保存状态三态：未入库 ≥1440「○ 仅存本机 · 存入我的曲谱」/ 1280–1439 短文案「○ 仅存本机」，点一下＝saveToLibrary（库多一条、song.id 有值）；已入库「已存入我的曲谱 · HH:MM」',
        J({ s1: s1.t, s2: s2.t, s3: s3.t, s4: s4.t, s5: s5.t, s6: s6.t }));
      T('S11', !s1.id && pb0.mode === 'output' && pb0.page === 'pub' && pb0.ae === 'flw-pub-go' && !pb0.id && pb.id && pb.lib === s1.lib + 1 && /发布《/.test(pb.t) && sm && sm.m === 'save' && r0.ok && f1 && f1.ok,
        'S11b 未入库窗口点「发布」→ 切到「输出」、右栏发布页、焦点在「存入并提交发布」（还没存）；再点它 → 先存入（song.id 有值、库多一条）再出发布卡（#popmenu .t 含「发布《」）；已入库点保存状态 → 菜单「另存为文件」触发下载 .mtab.json',
        J({ pub0: pb0, pub: pb, menu: sm, r0, file: f1 }));
      await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 500);
      await EV(pg, () => { switchDocTo(0); render(); }); await wait(pg, 200);

      /* 文件 ▾ 每一项 */
      const FILE = [];
      const fi = async (label, check, o = {}) => { let r;
        try { const pre = o.pre ? await EV(pg, o.pre) : null; const ev = o.ev ? pg.waitForEvent(o.ev, { timeout: 3000 }).catch(() => null) : null;
          const m = await menuItem(pg, o.opener || '#flw-file', label, { wait: o.wait || 300 }); const evr = ev ? await ev : null;
          r = m.ok ? await check(pre, evr) : { ok: false, why: '菜单里没有「' + label + '」 ' + J(m.menu) }; }
        catch (e) { r = { ok: false, why: e.message.split('\n')[0] }; }
        await EV(pg, () => __shut()); await wait(pg, 80);
        FILE.push((r.ok ? '' : '✗') + label + (r.ok ? '' : ' ' + (r.why || J(r)))); return r; };
      const ok = (cond, d) => ({ ok: !!cond, why: d });
      await fi('新建…', async () => { const r = await EV(pg, () => ({ m: !!document.querySelector('#modal-mask .nf-modal'), imp: (document.getElementById('nf-tab-import') || { getAttribute: () => null }).getAttribute('aria-selected') })); return ok(r.m && r.imp === 'false', J(r)); });
      await fi('快速新建', async () => ok(await EV(pg, () => !!document.getElementById('nf-qm')), 'NWP 快捷菜单 #nf-qm 没出来'));
      await fi('按上次设置新建', async pre => { const r = await EV(pg, () => ({ n: docs.length, blank: !docHasContent(song) })); const okk = r.n === pre + 1; if (okk) await EV(pg, () => closeDocAt(curDocI)); return ok(okk, J(r)); }, { pre: () => docs.length });
      await fi('从已有音乐…', async () => { const r = await EV(pg, () => ({ m: !!document.querySelector('#modal-mask .nf-modal'), imp: (document.getElementById('nf-tab-import') || { getAttribute: () => null }).getAttribute('aria-selected') })); return ok(r.m && r.imp === 'true', J(r)); });
      await fi('打开文件…', async (_, fc) => ok(!!fc, '没有弹出选择文件'), { ev: 'filechooser' });
      await fi('我的曲谱', async () => ok(await EV(pg, () => !!document.getElementById('pcenter')), '个人中心 #pcenter 没出来'));
      await fi('示例曲谱', async () => { const t = await EV(pg, () => ((document.querySelector('#modal-mask h3') || {}).textContent || '')); return ok(/示例曲谱/.test(t), t); });
      await fi('谱库', async () => ok(await EV(pg, () => !!document.getElementById('circle')), '#circle 没出来'));
      await EV(pg, () => { addDoc(__P('卡农进行'), () => {}); render(); }); await wait(pg, 200);
      await fi('保存到我的曲谱', async pre => { const r = await EV(pg, () => ({ id: song.id || null, lib: __lib().length })); return ok(r.id && r.lib === pre + 1, J(r)); }, { pre: () => __lib().length });
      await fi('存为文件', async (_, d) => { const r = await dlInfo(pg, d); return ok(r && r.ok, J(r)); }, { ev: 'download' });
      await fi('复制为新窗口', async pre => { const r = await EV(pg, p => { const src = docs.find(d => d.song && d.song.title === p.title); return { n: docs.length, title: song.title, id: song.id || null,
          same: JSON.stringify(song.measures) === p.m, srcKept: !!src && JSON.stringify(src.song.measures) === p.m && src.song.id === p.id }; }, pre);
        return ok(r.n === pre.n + 1 && r.title === pre.title + '（副本）' && !r.id && r.same && r.srcKept, J(r)); }, { pre: () => ({ n: docs.length, title: song.title, id: song.id, m: JSON.stringify(song.measures) }) });
      await fi('曲谱信息…', async () => { const r = await EV(pg, () => { const i = document.getElementById('mm-title'); return i ? i.value === song.title : null; }); return ok(r === true, J(r)); });
      await fi('换谱类…', async () => { const r = await EV(pg, () => ({ m: !!document.getElementById('lb-menu'), t: (window.__toasts || []).slice(-1)[0] || '' })); return ok(r.m, J(r)); });
      await fi('关闭窗口', async pre => { const r = await EV(pg, () => ({ n: docs.length, titles: __titles() })); return ok(r.n === pre.n - 1 && !r.titles.includes(pre.t), J(r)); }, { pre: () => ({ n: docs.length, t: song.title }) });
      /* v68.2 收尾 NU-8：「流行进行」改一笔（作曲署名）＝用户内容，关闭其他时照旧转存；原样示例谱（pristine）只关不存——期望按 docIsDemoAsIs 分开数 */
      await EV(pg, () => { const p = __P('流行进行'); p.composer = (p.composer || '') + '（改）'; addDoc(p, () => {}); addDoc(__P('小星星（分解'), () => {}); render(); }); await wait(pg, 200);
      await fi('关闭其他窗口', async pre => { const r = await EV(pg, () => ({ n: docs.length, t: song.title, lib: __lib().length, titles: __lib().map(e => e.title) }));
        return ok(r.n === 1 && r.t === pre.t && pre.unsavedOthers >= 1 && r.lib === pre.lib + pre.unsavedOthers && pre.others.every(t => r.titles.includes(t))
          && pre.demo.every(t => !r.titles.includes(t) || pre.libT.includes(t)), J({ r, pre })); },
        { pre: () => { const sv = __saved(), t = __titles(), ds = docs.map((d, i) => i === curDocI ? song : d.song), asIs = ds.map(x => docIsDemoAsIs(x));
          const oth = t.map((x, i) => i).filter(i => i !== curDocI);
          return { t: song.title, lib: __lib().length, libT: __lib().map(e => e.title), unsavedOthers: oth.filter(i => !sv[i] && !asIs[i]).length,
            others: oth.filter(i => sv[i] || !asIs[i]).map(i => t[i]), demo: oth.filter(i => !sv[i] && asIs[i]).map(i => t[i]) }; } });
      const fileBad = FILE.filter(x => x.startsWith('✗'));
      T('S11', fileBad.length === 0 && FILE.length === 15,
        'S11c 文件 ▾ 每一项委托到位：新建…（.nf-modal）· 快速新建 ▾（#nf-qm）· 按上次设置新建（新窗口）· 从已有音乐…（导入页签）· 打开文件…（选择文件）· 我的曲谱（#pcenter）· 示例曲谱 · 谱库（#circle）· 保存到我的曲谱 · 存为文件（下载）· 复制为新窗口（副本无 id、原谱不动）· 曲谱信息… · 换谱类…（#lb-menu）· 关闭窗口 · 关闭其他（未入库有内容的自动存入）',
        fileBad.length ? fileBad.join('；') : FILE.length + ' 项');

      /* 账号 ▾ 每一项 */
      const ACC = [];
      const ai = async (label, check, o = {}) => { const before = FILE.length; await fi(label, check, Object.assign({ opener: '#flw-acct' }, o)); ACC.push(FILE.pop()); return before; };
      await ai('个人中心', async () => ok(await EV(pg, () => !!document.getElementById('pcenter')), '#pcenter 没出来'));
      await ai('创作者中心', async () => { const r = await EV(pg, () => ({ pc: !!document.getElementById('pcenter'), q: location.search, on: ((document.querySelector('#pcx-side .on, #pcx-side [aria-current]') || {}).textContent || '').trim() })); return ok(r.pc && (/creator/.test(r.q) || /创作者/.test(r.on)), J(r)); });
      await ai('谱库', async () => ok(await EV(pg, () => !!document.getElementById('circle')), '#circle 没出来'));
      for (const [lb, v] of [['深色', 'dark'], ['浅色', 'light'], ['跟随系统', null]]) {
        await ai(lb, async () => { const r = await EV(pg, () => ({ th: document.documentElement.getAttribute('data-theme'), ls: localStorage.getItem('musetab-theme'),
          chk: [...document.querySelectorAll('#popmenu [data-fa="r1:theme"]')].filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.textContent.trim()) })); return ok(r.th === v && r.ls === v && (!r.chk.length || (r.chk.length === 1 && r.chk[0] === lb)), J(r)); });
      }
      await ai('谱面反色', async pre => { const r = await EV(pg, () => document.getElementById('paper').classList.contains('score-invert')); return ok(r === !pre, J({ pre, r })); }, { pre: () => document.getElementById('paper').classList.contains('score-invert') });
      await ai('谱面反色', async pre => { const r = await EV(pg, () => document.getElementById('paper').classList.contains('score-invert')); return ok(r === !pre && r === false, J({ pre, r })); }, { pre: () => document.getElementById('paper').classList.contains('score-invert') });
      await ai('偏好设置…', async () => ok(await EV(pg, () => !!document.querySelector('#modal-mask .prf-modal') && document.querySelectorAll('#modal-mask .prf-row').length >= 4), '.prf-modal 没出来'));
      await ai('快捷键', async () => { const r = await EV(pg, () => { const md = document.querySelector('#modal-mask .modal'); const st = [...document.querySelectorAll('#modal-mask .hd-st')].find(x => /快捷键/.test(x.textContent || ''));
        if (!md || !st) return { md: !!md, st: !!st }; const a = md.getBoundingClientRect(), c = st.getBoundingClientRect(); return { md: true, st: true, inView: c.top >= a.top - 1 && c.top < a.bottom, h3: (md.querySelector('h3') || {}).textContent }; });
        return ok(r.md && r.st && r.inView, J(r)); });
      await ai('帮助与教程', async () => { const t = await EV(pg, () => ((document.querySelector('#modal-mask h3') || {}).textContent || '')); return ok(/帮助/.test(t), t); });
      await ai('更新日志', async () => { const t = await EV(pg, () => ((document.querySelector('#modal-mask h3') || {}).textContent || '')); return ok(/更新日志/.test(t), t); });
      const accBad = ACC.filter(x => x.startsWith('✗'));
      T('S11', accBad.length === 0 && ACC.length === 12,
        'S11d 账号 ▾ 每一项委托到位：个人中心 · 创作者中心 · 谱库 · 外观 深色 / 浅色 / 跟随系统（写 / 删 data-theme 与 musetab-theme，三段勾选同步）· 谱面反色（开 / 关）· 偏好设置…（.prf-modal）· 快捷键（帮助滚到「快捷键」节）· 帮助与教程 · 更新日志',
        accBad.length ? accBad.join('；') : ACC.length + ' 项');
      const F1 = await EV(pg, () => Object.keys(song).sort());
      T('S11', F1.every(k => F0.includes(k) || k === 'id'), 'S11e 数据红线：委托动作前后 song 字段集合 ⊆ 原字段 ∪ {id}（只由 saveToLibrary 写入现有的 id 字段）', J(F1.filter(k => !F0.includes(k))));
      await close(pg);
    } catch (e) { T('S11', false, 'S11 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S11 续：排版 / 预览 / 打印入口（验收 SC-1）· 两层菜单（B3）· 菜单读屏名（B4）· 键盘激活后焦点（B5）================= */
  if (want('S11')) jobs.push(async () => {
    try {
      const pg = await open(1440, 900, { tag: 'S11x' });
      await EV(pg, () => { __scn('three'); }); await wait(pg, 400);
      /* v68.1 迁移（README「老用户迁移」：「排版」→ 排版；「预览 / 打印…」→ 输出）：v67.9 的过渡入口（排版… · 打印预览 · 打印与导出…）撤掉，
         文件 ▾ 改为「排版」「输出 · 打印与导出」两项，切到行 2 的同名步骤：排版＝嵌入预览 + 右栏「版式」（#layout-pop 搬入）；输出＝嵌入预览 + 行 2 导出键（与弹窗同一组 EXPORT_ACT） */
      const L1 = await menuItem(pg, '#flw-file', '排版', { wait: 500 });
      const l1 = await EV(pg, () => ({ mode: FLOW.mode.cur, pv: document.getElementById('preview-ov').classList.contains('on'), lay: !!document.querySelector('#flw-rp-lay #layout-pop') }));
      await EV(pg, () => setMode('write')); await wait(pg, 200);
      const X1 = await menuItem(pg, '#flw-file', '输出 · 打印与导出', { wait: 500 });
      const x1 = await EV(pg, () => ({ mode: FLOW.mode.cur, pv: document.getElementById('preview-ov').classList.contains('on'),
        out: ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].every(k => { const b = document.getElementById('flw-out-' + k); return !!b && __vis(b); }) }));
      await EV(pg, () => { setMode('write'); __shut(); }); await wait(pg, 200);
      const P1 = await menuItem(pg, '#flw-file', '打印预览', { wait: 200 });
      await EV(pg, () => __shut());
      T('S11', L1.ok && l1.mode === 'engrave' && l1.pv && l1.lay && X1.ok && x1.mode === 'output' && x1.pv && x1.out && !P1.ok,
        'S11f 排版 / 输出入口（v68.1 迁移，原验收 SC-1 的过渡项撤掉）：文件 ▾「排版」→ 排版模式（嵌入预览 · #layout-pop 在右栏「版式」页）·「输出 · 打印与导出」→ 输出模式（行 2 打印 / PNG / 分享卡 / 互动谱 / MusicXML / MIDI / 曲谱文件可见）；菜单里不再有「打印预览」',
        J({ L1, l1, X1, x1, P1: P1.ok }));
      /* B3：「快速新建 ▾」开着时点「文件」——只剩一层菜单 */
      await menuItem(pg, '#flw-file', '快速新建', { wait: 200 });
      const q0 = await EV(pg, () => ({ qm: !!document.getElementById('nf-qm') }));
      await pg.click('#flw-file'); await wait(pg, 200);
      const q1 = await EV(pg, () => ({ qm: !!document.getElementById('nf-qm'), menu: __menu(), n: document.querySelectorAll('#popmenu, #nf-qm').length }));
      await EV(pg, () => __shut()); await wait(pg, 150);
      T('S11', q0.qm && !q1.qm && q1.n === 1 && q1.menu && q1.menu.m === 'file', 'S11g 两层菜单不叠（验收 B3）：文件 ▾ 行尾「快速新建 ▾」开着时再点「文件」，快速新建收起、只剩文件菜单', J({ q0, q1 }));
      /* B4：六个下拉菜单都有读屏名 */
      const names = [];
      for (const op of ['#flw-file', '#flw-acct', '#flw-more', '#flw-st-more', '#flw-st-help', '#flw-save']) {
        await EV(pg, () => __shut()); await wait(pg, 120);
        if (op === '#flw-save') await EV(pg, () => { if (!song.id) saveToLibrary(); try { closeModal(); } catch (_) {} render(); });
        await pg.click(op); await wait(pg, 160);
        names.push(await EV(pg, o => { const m = document.getElementById('popmenu'); return m ? o + '=' + (m.getAttribute('aria-label') || '') + '/' + m.getAttribute('role') : o + ':无菜单'; }, op));
      }
      await EV(pg, () => __shut()); await wait(pg, 120);
      /* B5：键盘 Enter 激活不弹窗的菜单项（账号 ▾「谱面反色」、更多 ▾「不换行视图」）后焦点回到菜单按钮 */
      const kb = async (op, label) => { await EV(pg, () => __shut()); await wait(pg, 120); await pg.focus(op); await pg.keyboard.press('Enter'); await wait(pg, 180);
        let k = 0; while (k++ < 20 && !(await EV(pg, lb => { const a = document.activeElement; const ml = a && a.querySelector && a.querySelector('.flw-ml'); return !!ml && ml.textContent.trim().startsWith(lb); }, label))) { await pg.keyboard.press('ArrowDown'); await wait(pg, 30); }
        await pg.keyboard.press('Enter'); await wait(pg, 250);
        return await EV(pg, () => ({ ae: document.activeElement.id || document.activeElement.tagName, menu: !!document.getElementById('popmenu') })); };
      const k1 = await kb('#flw-acct', '谱面反色');
      await EV(pg, () => { const p = document.getElementById('paper'); if (p.classList.contains('score-invert')) document.getElementById('b-invert').click(); });
      const k2 = await kb('#flw-more', '不换行');
      await EV(pg, () => { try { if (noWrapOn()) document.getElementById('eb-nowrap').click(); } catch (_) {} });
      T('S11', names.length === 6 && names.every(x => /=[^/]+\/menu$/.test(x)) && k1.ae === 'flw-acct' && !k1.menu && k2.ae === 'flw-more' && !k2.menu,
        'S11h 读屏与焦点（验收 B4 / B5）：文件 / 账号 / 更多 / ⋯ / ? / 保存状态 六个 role=menu 都有 aria-label（取打开它的按钮名）；键盘 Enter 激活「谱面反色」「不换行视图」后菜单收起、焦点回到 #flw-acct / #flw-more',
        J({ names, k1, k2 }));
      /* 文件 ▾ 加了一行过渡入口后仍不压住「文件」按钮：1280×800 一屏放下；更矮的窗口从按钮下沿起、菜单内滚动；再点「文件」＝收起 */
      const fm = [];
      for (const [w, h] of [[1280, 800], [1366, 768], [1280, 680]]) {
        await EV(pg, () => __shut()); await pg.setViewportSize({ width: w, height: h }); await wait(pg, 450);
        await pg.click('#flw-file'); await wait(pg, 200);
        const r = await EV(pg, () => { const m = document.getElementById('popmenu'), q = m && m.getBoundingClientRect(), f = document.getElementById('flw-file').getBoundingClientRect();
          return m ? { vh: innerHeight, top: Math.round(q.top), b: Math.round(q.bottom), fb: Math.round(f.bottom), scroll: m.scrollHeight - m.clientHeight } : null; });
        try { await pg.click('#flw-file', { timeout: 1500 }); await wait(pg, 200); r.closed = await EV(pg, () => !document.getElementById('popmenu')); }
        catch (_) { r.closed = '按钮被菜单盖住、点不到'; await EV(pg, () => __shut()); }
        fm.push(r);
      }
      T('S11', fm.every(r => r && r.top >= r.fb && r.b <= r.vh - 7.5 && r.closed === true) && fm[0].scroll <= 1,
        'S11i 文件 ▾ 不压住「文件」按钮（v68.1「排版」「输出 · 打印与导出」两项并成一行）：1280×800 一屏放下不滚动；1366×768 / 1280×680 从按钮下沿起、菜单内滚动；再点「文件」即收起', J(fm));
      await close(pg);
    } catch (e) { T('S11', false, 'S11f–i 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S12 播放与状态栏 ================= */
  if (want('S12')) jobs.push(async () => {
    try {
      const pg = await open(1280, 800, { tag: 'S12' });
      await EV(pg, () => __scn('songbie')); await wait(pg, 400);
      const ORDER = ['b-play', 'b-restart', 'mx-prog', 'b-mxgrid', 'flw-st-trk', 'flw-st-pos', 'beat-box', 'i-tempo', 'mx-rate', 'b-metro', 'flw-st-more', 'eb-zoom', 'flw-st-help'];
      const lay = await EV(pg, ids => { const md = __R('#mixer-dock'); const r = ids.map(id => { const e = document.getElementById(id); const q = e && __R(e);
          return { id, vis: !!(q && q.vis), x: q ? q.x : null, inRow: !!(q && q.y >= md.y - 0.5 && q.b <= md.b + 0.5 && q.r <= innerWidth), inDock: !!(e && e.closest('#mixer-dock')) }; });
        return { r, hid: ['.mx-splabel', '#b-stand', '#b-vwset', '#mx-expand', '.mx-tracks'].map(s => [...document.querySelectorAll('#mixer-dock ' + s)].some(e => __vis(e))), md }; }, ORDER);
      /* 顺序按方案 README / 计划 §2.5；v67.9 暂留的「混音 ▴」在 v68.0 撤出（计划 §3.1：混音并进左栏音轨行），#mx-expand 与 .mx-tracks 都要不可见 */
      const bad = lay.r.filter(x => !x.vis || !x.inRow || !x.inDock).map(x => x.id);
      const seq = lay.r.filter(x => x.vis), mono = seq.every((x, i) => !i || x.x > seq[i - 1].x);
      T('S12', !bad.length && mono && lay.hid.every(x => !x),
        'S12a 状态栏控件齐全、单行、按序：播放 · 回开头 · 小节格 · ▦ · 当前轨 · 位置 · 时值检查 · ♩= · 倍速 · 节拍器 · ⋯ · 缩放 · ?；速度字样 / #b-stand / #b-vwset 收起；v68.0「混音 ▴」#mx-expand 与旧混音台 .mx-tracks 不可见',
        J({ bad, hid: lay.hid, order: lay.r.filter(x => x.vis).sort((a, b) => a.x - b.x).map(x => x.id).join(' ') }));
      await shot(pg, 'flow-1280x800-light-statusbar');
      /* 播放 / 暂停 */
      await pg.click('#b-play'); await wait(pg, 500);
      const p1 = await EV(pg, () => ({ playing: !!audio.playing, paused: !!audio.paused, t: document.getElementById('b-play').textContent.trim() }));
      await pg.click('#b-play'); await wait(pg, 250);
      const p2 = await EV(pg, () => ({ playing: !!audio.playing, paused: !!audio.paused, t: document.getElementById('b-play').textContent.trim() }));
      await EV(pg, () => { stopPlay(); setPlayBtn(); sel = { mi: 2, row: 'vox', vi: 0, ci: 1, si: 1 }; render(); });
      await pg.click('#b-restart'); await wait(pg, 200);
      const p3 = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, playing: !!audio.playing }));
      T('S12', p1.playing && !p1.paused && /暂停/.test(p1.t) && p2.playing && p2.paused && /继续/.test(p2.t) && p3.mi === 0 && p3.ci === 0 && !p3.playing,
        'S12b #b-play 播放（audio.playing、文案「暂停」）→ 再点暂停（「继续」）；#b-restart 停止并回到开头（sel.mi=0）', J({ p1, p2, p3 }));
      /* ♩= · 倍速 · 节拍器 */
      const t0 = await EV(pg, () => song.tempo);
      await pg.fill('#i-tempo', String(t0 === 123 ? 124 : 123)); await pg.press('#i-tempo', 'Enter'); await wait(pg, 200);
      const t1 = await EV(pg, () => ({ tempo: song.tempo, rate: playRate }));
      await pg.selectOption('#mx-rate', '0.75'); await wait(pg, 150);
      const t2 = await EV(pg, () => ({ tempo: song.tempo, rate: playRate }));
      await pg.click('#b-metro'); await wait(pg, 150);
      const t3 = await EV(pg, () => ({ pop: document.getElementById('metro-pop').classList.contains('on'), on: metroOn }));
      await pg.click('#mp-on'); await wait(pg, 120);
      const t4 = await EV(pg, () => ({ on: metroOn, btn: document.getElementById('b-metro').classList.contains('on') }));
      await EV(pg, () => { document.getElementById('mp-on').click(); document.querySelectorAll('.vh-pop.on').forEach(p => p.classList.remove('on')); });
      await pg.selectOption('#mx-rate', '1');
      T('S12', t1.tempo === (t0 === 123 ? 124 : 123) && t2.rate === 0.75 && t2.tempo === t1.tempo && t3.pop && t4.on === !t3.on && t4.btn,
        'S12c ♩= 改 #i-tempo → song.tempo 跟着变；倍速 → playRate（不改 song.tempo）；节拍器 → 弹出 #metro-pop，拍点开关 metroOn 翻转、按钮点亮', J({ t0, t1, t2, t3, t4 }));
      /* 位置 · 当前轨 */
      const q0 = await EV(pg, () => ({ pos: (document.getElementById('flw-st-pos') || {}).textContent || '', trk: (document.getElementById('flw-st-trk') || {}).textContent || '', name: song.voxVoices[0] }));
      await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); const a = document.activeElement; if (a && a.blur) a.blur(); });
      let guard = 0; while (guard++ < 24 && (await EV(pg, () => sel.mi)) < 1) { await pg.keyboard.press('ArrowRight'); await wait(pg, 40); }
      await wait(pg, 150);
      const q1 = await EV(pg, () => ({ mi: sel.mi, pos: (document.getElementById('flw-st-pos') || {}).textContent || '' }));
      T('S12', /第\s*1\s*\/\s*\d+\s*小节/.test(q0.pos) && q0.trk.includes(q0.name) && /简谱/.test(q0.trk) && q1.mi === 1 && /第\s*2\s*\/\s*\d+\s*小节/.test(q1.pos),
        'S12d 当前轨「旋律名 · 简谱」；方向键移到第 2 小节后位置变为「第 2/N 小节 · 第 c 拍」', J({ q0, q1 }));
      /* 时值检查 */
      await EV(pg, () => { mutate(() => { const v = song.measures[0].voxes[0]; v.push(JSON.parse(JSON.stringify(v[v.length - 1]))); }); render(); }); await wait(pg, 250);
      const e1 = await EV(pg, () => ({ t: document.getElementById('beat-status').textContent.trim(), drop: __vis('#err-drop'), n: beatErrors().length }));
      await pg.click('#beat-status'); await wait(pg, 200);
      const e2 = await EV(pg, () => ({ drop: __R('#err-drop'), md: __R('#mixer-dock') }));
      await pg.keyboard.press('Escape'); await wait(pg, 150);
      const e3 = await EV(pg, () => __vis('#err-drop'));
      await EV(pg, () => { undo(); render(); }); await wait(pg, 200);
      const e4 = await EV(pg, () => document.getElementById('beat-status').textContent.trim());
      T('S12', e1.n === 1 && /时值不符\s*1\s*处/.test(e1.t) && !e1.drop && e2.drop && e2.drop.vis && e2.drop.b <= e2.md.y + 0.5 && e2.drop.y >= 0 && !e3 && /时值正确/.test(e4),
        'S12e 时值检查：制造一处错误 → 「时值不符 1 处」且不自动弹出；点它 → #err-drop 向上弹出（底 ≤ 状态栏顶、不出屏）；Esc 收起；撤销后「时值正确」', J({ e1, drop: e2.drop && [e2.drop.y, e2.drop.b], mdTop: e2.md.y, e3, e4 }));
      /* ⋯ 更多：演奏感 · 音色库 · 谱架 */
      const h0 = await EV(pg, () => ({ hum: humOn(), ls: localStorage.getItem('musetab-humanize') }));
      const m1 = await menuItem(pg, '#flw-st-more', '演奏感');
      const h1 = await EV(pg, () => ({ hum: humOn(), ls: localStorage.getItem('musetab-humanize') }));
      await menuItem(pg, '#flw-st-more', '演奏感');
      const h2 = await EV(pg, () => ({ hum: humOn(), ls: localStorage.getItem('musetab-humanize') }));
      await EV(pg, () => { window.__toasts = []; });
      const m2 = await menuItem(pg, '#flw-st-more', '音色库');
      const h3 = await EV(pg, () => ({ toast: (window.__toasts || []).join('|'), sb: __vis('#rc-sndlib'), url: location.href, menu: !!document.getElementById('popmenu') }));
      const m3 = await menuItem(pg, '#flw-st-more', '谱架', { wait: 400 });
      const h4 = await EV(pg, () => ({ stand: document.body.classList.contains('stand'), flow: document.body.classList.contains('flow'), r1: __vis('#flw-r1'), rs: __vis('#flw-rstrip') }));
      await EV(pg, () => exitStand()); await wait(pg, 300);
      const h5 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), tabs: document.getElementById('doc-tabs').parentElement.id }));
      T('S12', m1.ok && h1.hum === !h0.hum && h2.hum === h0.hum && h2.ls === h0.ls && m2.ok && !h3.sb && h3.toast.length > 0 && h3.menu && m3.ok && h4.stand && !h4.flow && !h4.r1 && !h4.rs && h5.flow && h5.tabs === 'flw-r1',
        'S12f ⋯ 更多：演奏感＝prefSet(humanize)（翻转再翻回、本机键复原）；音色库在 #rc-sndlib 隐藏时置灰、点了只说明原因不刷新；谱架 → body.stand、行 1 与竖条不可见，退出后 flow 回场',
        J({ m: [m1, m2, m3], h0, h1, h2, h3: { toast: h3.toast.slice(0, 40), sb: h3.sb, menuKept: h3.menu }, h4, h5 }));
      /* ? · 旧混音台（v68.0 不显示，DOM 留着供委托）· 缩放 */
      const m4 = await menuItem(pg, '#flw-st-help', '完整帮助');
      const g1 = await EV(pg, () => ((document.querySelector('#modal-mask h3') || {}).textContent || ''));
      await EV(pg, () => __shut());
      const g2 = await EV(pg, () => { const me = document.getElementById('mx-expand'); me.click();   /* 程序化点旧入口：混音台照常渲染（委托路径活着），但 flow 下不显示、不撑高状态栏 */
        const tr = document.querySelector('#mixer-dock .mx-tracks'), bar = __R('#mixer-dock .mx-bar');
        const r = { ex: document.getElementById('mixer-dock').classList.contains('expanded'), rows: tr ? tr.querySelectorAll('.mx-row').length : 0, trVis: __vis(tr), meVis: __vis(me), bar, ih: innerHeight, md: __R('#mixer-dock').h };
        me.click(); r.ex2 = document.getElementById('mixer-dock').classList.contains('expanded'); return r; });
      await wait(pg, 200);
      const z0 = await EV(pg, () => (document.getElementById('zoom-lbl') || {}).textContent);
      await pg.click('#z-in'); await wait(pg, 300);
      const z1 = await EV(pg, () => ({ z: (document.getElementById('zoom-lbl') || {}).textContent, inDock: !!document.getElementById('eb-zoom').closest('#mixer-dock') }));
      T('S12', m4.ok && /帮助/.test(g1) && g2.ex && g2.rows >= 1 && !g2.trVis && !g2.meVis && Math.abs(g2.md - 32) <= 0.5 && Math.abs(g2.bar.b - g2.ih) <= 0.5 && !g2.ex2 && z1.inDock && z1.z !== z0,
        'S12g ? → 「完整帮助」开帮助；v68.0 旧混音台 flow 下不显示：程序化点 #mx-expand 照常渲染混音行（DOM 留着供委托）但入口与 .mx-tracks 都不可见、状态栏仍 32 贴底；缩放（搬入的 #eb-zoom）照常改缩放',
        J({ g1, g2: { ex: g2.ex, rows: g2.rows, trVis: g2.trVis, meVis: g2.meVis, md: g2.md, bar: g2.bar && [g2.bar.y, g2.bar.b], ex2: g2.ex2 }, z: [z0, z1.z] }));
      await close(pg);
    } catch (e) { T('S12', false, 'S12 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S12 续：窄档单行（验收 L1）· 焦点（B1）· 循环认整小节多选（B2）================= */
  if (want('S12')) jobs.push(async () => {
    try {
      const pg = await open(1280, 800, { tag: 'S12x' });
      await EV(pg, () => __scn('songbie')); await wait(pg, 400);
      /* L1：长轨名 + 多选 + 时值不符，821 / 900 / 1000 / 1100 / 1180：.mx-bar 不溢出、缩放与「?」在视口内、状态栏仍 32；1280 真实内容一档都不收 */
      const real = await EV(pg, () => { const b = document.querySelector('#mixer-dock .mx-bar'); return { f: [...b.classList].filter(c => /^flw-f\d$/.test(c)).length, ov: b.scrollWidth - b.clientWidth }; });
      await EV(pg, () => { song.voxVoices[0] = '女高音独唱声部（第一段主歌与副歌）'; const c = curRowCols(); if (c && c.length > 1) c.pop(); selRange = { row: 'vox', vi: 0, m1: 9, c1: 0, m2: 15, c2: 0 }; render(); }); await wait(pg, 300);
      const nar = [];
      for (const w of [821, 900, 1000, 1100, 1180]) {
        await pg.setViewportSize({ width: w, height: 800 }); await wait(pg, 450);
        nar.push(await EV(pg, () => { const b = document.querySelector('#mixer-dock .mx-bar'), h = __R('#flw-st-help'), z = __R('#z-in'), md = __R('#mixer-dock');
          return { w: innerWidth, flow: document.body.classList.contains('flow'), ov: b.scrollWidth - b.clientWidth, help: h.r - innerWidth, zoom: z.r - innerWidth, h: md.h, hv: h.vis,
            f: [...b.classList].filter(c => /^flw-f\d$/.test(c)).length, bad: /时值不符/.test(document.getElementById('beat-status').textContent) }; }));
      }
      T('S12', real.f === 0 && real.ov <= 1 && nar.every(x => x.flow && x.ov <= 1 && x.help <= 0.5 && x.zoom <= 0.5 && Math.abs(x.h - 32) <= 0.5 && x.hv && x.bad),
        'S12h 窄档单行（验收 L1）：长轨名 + 多选第 10–16 小节 + 时值不符，821 / 900 / 1000 / 1100 / 1180 宽 .mx-bar 不溢出、缩放与「?」都在视口内、状态栏仍 32（FLOW.st.fit 按档收）；1280 真实内容一档都不收',
        J({ real, nar: nar.map(x => x.w + ':ov' + x.ov + ' ?' + Math.round(x.help) + ' 档' + x.f) }));
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 400);
      await EV(pg, () => __scn('songbie')); await wait(pg, 300);
      /* B1：鼠标点过时值状态项后焦点不留在它身上，空格＝播放、Enter＝写歌词（与默认外壳点不可聚焦的状态项相同）；键盘打开的 Esc 收起后焦点才回到它 */
      const ST = () => EV(pg, () => ({ playing: !!audio.playing, ae: document.activeElement.id || document.activeElement.tagName, eo: document.body.classList.contains('flw-eo') }));
      await EV(pg, () => { sel = { mi: 3, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
      await pg.click('#beat-status'); await wait(pg, 150); const f1 = await ST();
      await pg.keyboard.press(' '); await wait(pg, 400); const f2 = await ST();
      await EV(pg, () => { stopPlay(); setPlayBtn(); });
      await pg.click('#beat-status'); await wait(pg, 150);
      await pg.keyboard.press('Enter'); await wait(pg, 300); const f3 = await ST();
      await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); try { closeFlyout(); } catch (_) {} mutate(() => { song.measures[1].voxes[0].splice(0, 1); }); sel = { mi: 5, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await wait(pg, 250);
      await pg.click('#beat-status'); await wait(pg, 150); const f4 = await ST();
      await pg.keyboard.press('Escape'); await wait(pg, 150); const f5 = await ST();
      await pg.keyboard.press(' '); await wait(pg, 400); const f6 = await ST();
      await EV(pg, () => { stopPlay(); setPlayBtn(); });
      await pg.focus('#beat-status'); await pg.keyboard.press('Enter'); await wait(pg, 150); const f7 = await ST();
      await pg.keyboard.press('Escape'); await wait(pg, 150); const f8 = await ST();
      T('S12', f1.ae === 'BODY' && f2.playing && f3.ae === 'i-lyric' && f4.eo && f4.ae === 'BODY' && !f5.eo && f5.ae !== 'beat-status' && f6.playing && !f6.eo && f7.eo && !f8.eo && f8.ae === 'beat-status',
        'S12i 焦点（验收 B1）：鼠标点「时值正确」后焦点在 body，空格开始播放、Enter 进歌词框；点「时值不符」展开后 Esc 收起，焦点不回状态项，空格是播放不是重新展开；键盘 Enter 打开的，Esc 收起后焦点回到状态项',
        J({ f1, f2, f3, f4, f5, f6, f7, f8 }));
      await EV(pg, () => { stopPlay(); setPlayBtn(); undo(); render(); });
      /* B2：拖小节号的整小节多选（measureRange）也算「所选小节」：位置文案「已选第 2–4 小节」，循环 2–4 */
      await EV(pg, () => { setLoop(null); selRange = null; measureSel = null; measureRange = { m1: 1, m2: 3 }; render(); }); await wait(pg, 200);
      const g0 = await EV(pg, () => (document.getElementById('flw-st-pos') || {}).textContent || '');
      await pg.click('#flw-st-loop'); await wait(pg, 200);
      const g1 = await EV(pg, () => ({ loop: audio.loop ? [audio.loop.a, audio.loop.b] : null, pressed: document.getElementById('flw-st-loop').getAttribute('aria-pressed') }));
      await EV(pg, () => { setLoop(null); measureRange = null; measureSel = 6; render(); }); await wait(pg, 150);
      await pg.click('#flw-st-loop'); await wait(pg, 200);
      const g2 = await EV(pg, () => audio.loop ? [audio.loop.a, audio.loop.b] : null);
      await EV(pg, () => { setLoop(null); measureSel = null; render(); });
      T('S12', /已选第\s*2–4\s*小节/.test(g0) && J(g1.loop) === '[1,3]' && g1.pressed === 'true' && J(g2) === '[6,6]',
        'S12j 循环选区与位置认整小节多选（验收 B2）：measureRange 第 2–4 小节 → 位置「已选第 2–4 小节」、点循环＝循环 2–4；单选整小节 measureSel=6 → 循环第 7 小节', J({ g0, g1, g2 }));
      await close(pg);
    } catch (e) { T('S12', false, 'S12h–j 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S13 打印 / 观看页 / 谱架 / 手机 ================= */
  if (want('S13')) jobs.push(async () => {
    try {
      const pg = await open(1280, 800, { tag: 'S13' });
      await EV(pg, () => __scn('songbie')); await wait(pg, 300);
      const NEWV = () => ({ r1: __vis('#flw-r1'), rs: __vis('#flw-rstrip'), lf: __vis('#flw-left'), x: [...document.querySelectorAll('.flw-x')].filter(e => __vis(e)).map(e => e.id || e.className), top: __vis('#top'), tabs: __vis('#doc-tabs') });
      await pg.emulateMedia({ media: 'print' }); await wait(pg, 150);
      const pr1 = await EV(pg, NEWV);
      await EV(pg, () => window.dispatchEvent(new Event('beforeprint'))); await wait(pg, 400);
      const pr2 = await EV(pg, () => Object.assign({ printing: document.body.classList.contains('printing') }, { r1: __vis('#flw-r1'), rs: __vis('#flw-rstrip'), lf: __vis('#flw-left'), x: [...document.querySelectorAll('.flw-x')].filter(e => __vis(e)).length }));
      await EV(pg, () => window.dispatchEvent(new Event('afterprint'))); await pg.emulateMedia({ media: 'screen' }); await wait(pg, 300);
      const pr3 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), r1: __vis('#flw-r1'), lf: __vis('#flw-left') }));
      T('S13', !pr1.r1 && !pr1.rs && !pr1.lf && !pr1.x.length && !pr1.top && !pr2.r1 && !pr2.rs && !pr2.lf && !pr2.x && pr3.flow && pr3.r1 && pr3.lf,
        'S13a 打印：@media print 与 beforeprint（body.printing）下行 1、竖条、左栏 #flw-left、状态栏搬入项（.flw-x）全不可见；打印后回到 flow', J({ pr1, pr2, pr3 }));
      /* 观看页（openPubViewer 进出） */
      await EV(pg, () => { circlePubsSave([{ pid: 'tsf-v', title: '观看测试', author: '测试', type: 'vocal', price: 0, views: 0, data: JSON.parse(JSON.stringify(song)) }]); openPubViewer('tsf-v'); }); await wait(pg, 400);
      const v1 = await EV(pg, () => ({ viewer: document.body.classList.contains('viewer'), flow: document.body.classList.contains('flow'), active: FLOW.active, x: [...document.querySelectorAll('#mixer-dock .flw-x')].filter(e => __vis(e)).map(e => e.id || e.className),
        beat: document.getElementById('beat-box').parentElement.id, zoom: document.getElementById('eb-zoom').parentElement.id, tabs: document.getElementById('doc-tabs').parentElement === document.body, rs: __vis('#flw-rstrip'), lf: __vis('#flw-left'), md: __vis('#mixer-dock'),
        cls: ['flw-rd', 'flw-rs', 'flw-ro', 'flw-eo'].filter(c => document.body.classList.contains(c)) }));
      await EV(pg, () => exitViewer()); await wait(pg, 400);
      const v2 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), tabs: document.getElementById('doc-tabs').parentElement.id, beat: document.getElementById('beat-box').parentElement.className, r1: __vis('#flw-r1'), lf: __vis('#flw-left') }));
      T('S13', v1.viewer && !v1.flow && !v1.active && !v1.x.length && v1.beat === 'beat-host' && v1.zoom === 'editbar' && v1.tabs && !v1.rs && !v1.lf && v1.md && !v1.cls.length && v2.flow && v2.tabs === 'flw-r1' && /mx-bar/.test(v2.beat) && v2.r1 && v2.lf,
        'S13b 观看页（openPubViewer）：flow 退场，#mixer-dock .flw-x 全不可见、#beat-box / #eb-zoom / #doc-tabs 搬回原位、竖条 / 左栏与布局类清掉；exitViewer 后回场', J({ v1, v2 }));
      /* 谱架 */
      await EV(pg, () => enterStand()); await wait(pg, 300);
      const st1 = await EV(pg, () => ({ stand: document.body.classList.contains('stand'), flow: document.body.classList.contains('flow'), r1: __vis('#flw-r1'), rs: __vis('#flw-rstrip'), lf: __vis('#flw-left'), x: [...document.querySelectorAll('.flw-x')].filter(e => __vis(e)).length }));
      await EV(pg, () => exitStand()); await wait(pg, 300);
      const st2 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), r1: __vis('#flw-r1'), lf: __vis('#flw-left') }));
      T('S13', st1.stand && !st1.flow && !st1.r1 && !st1.rs && !st1.lf && !st1.x && st2.flow && st2.r1 && st2.lf, 'S13c 谱架（enterStand / exitStand）：进入即退场、新容器（行 1 / 竖条 / 左栏）与搬入项不可见；退出回场', J({ st1, st2 }));
      /* 运行中缩到 ≤820（文件 ▾ 开着：验收 SC-5，菜单要随 flow 一起收起，不留没样式、还能点的残片） */
      await pg.click('#flw-file'); await wait(pg, 200);
      const mb0 = await EV(pg, () => __menu());
      await pg.setViewportSize({ width: 800, height: 800 }); await wait(pg, 500);
      /* v68.1 轨 D 改断言（计划 §4.6：手机挂 flow 的手机子段 FLOW.mob）：缩到 ≤820 时桌面 flow 照旧整体退场（同 v67.9 口径），
         随后挂上手机子段——body 上唯一的 flw-* 类是 flw-m，顶栏 #flw-mtop / 底条 #flw-mbar 出现，旧手机图层轨 #left-rail 隐藏
         （原断言「旧 #left-dock 可见、无 flw-* 类」是 v67.9 手机不挂 flow 的口径，本版起不成立）；拉回 1280 手机子段退场 */
      const mb1 = await EV(pg, () => ({ menu: !!document.getElementById('popmenu'), flow: document.body.classList.contains('flow'), active: FLOW.active, home: [document.getElementById('doc-tabs').parentElement === document.body, document.getElementById('beat-box').parentElement.id, document.getElementById('eb-zoom').parentElement.id],
        x: [...document.querySelectorAll('.flw-x')].filter(e => __vis(e)).length, cls: [...document.body.classList].filter(c => /^flw-/.test(c)), sty: /--flw-/.test(document.body.getAttribute('style') || ''), off: document.querySelectorAll('.flw-off,[data-pri]').length, r1: __vis('#flw-r1'), lf: __vis('#flw-left'),
        mob: { on: FLOW.mob.on, mt: __vis('#flw-mtop'), mb: __vis('#flw-mbar'), rail: __vis('#left-rail'), top: __vis('#top') } }));
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 500);
      const mb2 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), tabs: document.getElementById('doc-tabs').parentElement.id, r1: __vis('#flw-r1'), lf: __vis('#flw-left'), ld: __vis('#left-dock'),
        mob: { on: FLOW.mob.on, m: document.body.classList.contains('flw-m'), mt: __vis('#flw-mtop'), mb: __vis('#flw-mbar') } }));
      T('S13', mb0 && mb0.m === 'file' && !mb1.menu && !mb1.flow && !mb1.active && J(mb1.home) === '[true,"beat-host","editbar"]' && !mb1.x && J(mb1.cls) === '["flw-m"]' && !mb1.sty && !mb1.off && !mb1.r1 && !mb1.lf
        && mb1.mob.on && mb1.mob.mt && mb1.mob.mb && !mb1.mob.rail && !mb1.mob.top
        && mb2.flow && mb2.tabs === 'flw-r1' && mb2.r1 && mb2.lf && !mb2.ld && !mb2.mob.on && !mb2.mob.m && !mb2.mob.mt && !mb2.mob.mb,
        'S13d 运行中缩到 800 宽：桌面 flow 退场（节点搬回原位、.flw-x / .flw-off / data-pri / --flw 令牌全清；开着的文件 ▾ 一并收起，验收 SC-5），换上手机子段（body 只剩 flw-m，顶栏 / 底条出现，旧图层轨与旧顶栏隐藏）；拉回 1280 桌面 flow 重新挂上、手机子段退场', J({ mb0, mb1, mb2 }));
      /* 验收 SC-6：互动谱导出走「当前 DOM 快照」回退（fetch 失败：file:// / 断网）——快照里不带 flow 外壳：无 html.flow-pre / body.flow / flw-* 类 / [id^=flw-] / .flw-x / 落点 / data-pri，
         搬移节点在原位（#doc-tabs 在 body、#beat-box 在 #beat-host、#eb-zoom 在 #editbar）；导出后界面原样（flow 照旧、节点在 flow 位置） */
      await EV(pg, () => { window.__snapBlob = null; window.__f0 = window.fetch; window.fetch = () => Promise.reject(new Error('离线'));
        window.__cou = URL.createObjectURL; URL.createObjectURL = b => { window.__snapBlob = b; return 'blob:none'; }; window.__ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {}; });
      await EV(pg, () => exportInteractiveCard()); await wait(pg, 300);
      const ic = await EV(pg, async () => { const b = window.__snapBlob; window.fetch = window.__f0; URL.createObjectURL = window.__cou; HTMLAnchorElement.prototype.click = window.__ac;
        if (!b) return null; const txt = await b.text(); window.__snapTxt = txt; const d = new DOMParser().parseFromString(txt, 'text/html');
        const cls = [...d.querySelectorAll('[class]')].concat([d.documentElement]).filter(e => [...e.classList].some(c => c === 'flow' || c === 'flow-pre' || /^flw-/.test(c))).map(e => e.id || e.tagName);
        return { cls, ids: d.querySelectorAll('[id^="flw-"], .flw-x, [data-flw-slot], [data-pri]').length, attrs: [...d.querySelectorAll('*')].filter(e => [...e.attributes].some(a => /^data-flw-/.test(a.name))).length,
          home: [d.getElementById('doc-tabs').parentElement === d.body, (d.getElementById('beat-box').parentElement || {}).id, (d.getElementById('eb-zoom').parentElement || {}).id], style: /--flw-/.test(d.body.getAttribute('style') || ''),
          share: /pyq-share-data/.test(txt),
          live: { flow: document.body.classList.contains('flow'), tabs: document.getElementById('doc-tabs').parentElement.id, beat: document.getElementById('beat-box').parentElement.className, zoom: document.getElementById('eb-zoom').parentElement.className, x: document.getElementById('eb-zoom').classList.contains('flw-x') } }; });
      T('S13', !!ic && !ic.cls.length && !ic.ids && !ic.attrs && J(ic.home) === '[true,"beat-host","editbar"]' && !ic.style && ic.share && ic.live.flow && ic.live.tabs === 'flw-r1' && /mx-bar/.test(ic.live.beat) && /mx-bar/.test(ic.live.zoom) && ic.live.x,
        'S13g 互动谱导出快照回退（验收 SC-6）：快照不带 flow 外壳（类 / 节点 / 属性 / 令牌全无，搬移节点在原位）；导出后界面原样', J(ic));
      const snapTxt = await EV(pg, () => window.__snapTxt || '');
      await close(pg);
      /* 收件人打开快照（新上下文）：观看页里 flow 不启用（无 body.flow、无可见 flow 节点 / 类）；按 Esc / exitViewer 退出观看后是收件人自己的默认外壳——
         v68.2 切默认起不带参数＝新外壳（原断言「无 html.flow-pre、FLOW 不挂载、退出后是旧外壳」是 v67.9–v68.1 预览期口径），带 ?shell=classic＝旧外壳 */
      if (snapTxt) {
        const sf = path.join(os.tmpdir(), '_tv_shellflow_snap.html'); fs.writeFileSync(sf, snapTxt);
        const rx = [];
        for (const q of ['', '?shell=classic']) {
          const pr = await open(1280, 800, { tag: 'S13-snap' + q, url: 'file://' + sf + q, wait: 1300 });
          const a = await EV(pr, () => ({ viewer: document.body.classList.contains('viewer'), pre: document.documentElement.classList.contains('flow-pre'), mounted: FLOW.mounted, r1: !!document.getElementById('flw-r1'),
            flow: document.body.classList.contains('flow'), active: FLOW.active, vis: [...document.querySelectorAll('[id^="flw-"],.flw-x')].filter(e => __vis(e)).length, cls: [...document.body.classList].filter(x => /^flw-/.test(x)) }));
          await EV(pr, () => { try { exitViewer(); } catch (_) {} }); await wait(pr, 500);
          const c = await EV(pr, () => ({ flow: document.body.classList.contains('flow'), pre: document.documentElement.classList.contains('flow-pre'), mounted: FLOW.mounted, r1: !!document.getElementById('flw-r1'),
            zoom: __vis('#eb-zoom'), zp: document.getElementById('eb-zoom').parentElement.id, cls: [...document.body.classList].filter(x => /^flw-/.test(x)) }));
          rx.push({ q, a, c });
          await close(pr);
        }
        try { fs.unlinkSync(sf); } catch (_) {}
        const okA = a => a.viewer && !a.flow && !a.active && !a.vis && !a.cls.length;
        const [r0, rc] = [rx.find(x => x.q === ''), rx.find(x => x.q === '?shell=classic')];
        T('S13', !!r0 && !!rc && okA(r0.a) && okA(rc.a) && !r0.a.mounted && !r0.a.r1 && !rc.a.mounted && r0.c.flow && r0.c.r1 && rc.c.pre === false && !rc.c.flow && !rc.c.mounted && !rc.c.r1 && rc.c.zoom && rc.c.zp === 'editbar' && !rc.c.cls.length,
          'S13h 收件人打开快照（验收 SC-6）：观看页里 flow 不启用（无 body.flow / FLOW.active / 可见 flow 节点 / flw-* 类；v68.2 集成：数据注入在 head，开机起就没挂过——FLOW.mounted 假、无 #flw-r1）；退出观看后按收件人自己的开关——不带参数＝默认新外壳（v68.2 起），带 ?shell=classic＝旧外壳（#eb-zoom 在 #editbar 可见、无 #flw-r1）', J(rx));
      }
      /* 手机 390 直开 ?shell=flow
         v68.1 轨 D 改断言（计划 §4.6）：原 S13e「FLOW 不挂载、无任何 flow 节点、旧手机布局原样」是 v67.9 / v68.0 手机不挂 flow 的口径。
         本版手机挂 flow 的手机子段（FLOW.mob，body.flw-m）：桌面 flow 仍不挂（FLOW.mounted / FLOW.active 为假、无 #flw-r1、无搬移落点与 data-pri、#beat-box 在原位、页签条隐藏），
         启动台态照旧是旧手机启动台与旧顶栏（拍板「启动台不挂」）；打开一份谱后换成顶栏 48 + 底条 64，旧顶栏 / 图层轨 / 迷你条隐藏，无横向溢出 */
      const pm = await open(390, 844, { tag: 'S13-mob' });
      const MOB = () => ({ flow: document.body.classList.contains('flow'), pre: document.documentElement.classList.contains('flow-pre'), mounted: FLOW.mounted, active: FLOW.active, r1: !!document.getElementById('flw-r1'),
        x: document.querySelectorAll('.flw-x,[data-flw-slot],[data-pri]').length, tabs: getComputedStyle(document.getElementById('doc-tabs')).display, beat: document.getElementById('beat-box').parentElement.id, sw: document.documentElement.scrollWidth,
        m: document.body.classList.contains('flw-m'), on: FLOW.mob.on, sp: startPadOn(), mt: __R('#flw-mtop'), mb: __R('#flw-mbar'), top: __vis('#top'), md: __vis('#mixer-dock'), rail: __vis('#left-rail'), ih: innerHeight });
      const mo = await EV(pm, MOB);
      await EV(pm, () => __scn('songbie')); await wait(pm, 300);
      const mo2 = await EV(pm, MOB);
      T('S13', mo.pre && !mo.flow && !mo.mounted && !mo.active && !mo.r1 && !mo.x && mo.tabs === 'none' && mo.beat === 'beat-host' && mo.sw <= 390 && mo.m && mo.on && mo.sp && !mo.mt.vis && !mo.mb.vis && mo.top
        && !mo2.flow && !mo2.mounted && !mo2.x && mo2.m && !mo2.sp && mo2.mt.vis && Math.abs(mo2.mt.y) < .6 && Math.abs(mo2.mt.h - 48) < .6 && mo2.mb.vis && Math.abs(mo2.mb.h - 64) < .6 && Math.abs(mo2.mb.b - mo2.ih) < .6
        && !mo2.top && !mo2.md && !mo2.rail && mo2.beat === 'beat-host' && mo2.tabs === 'none' && mo2.sw <= 390,
        'S13e 手机 390 直开 ?shell=flow：桌面 flow 不挂（无行 1 / 搬移落点 / data-pri，#beat-box 在原位、页签条隐藏），挂手机子段 body.flw-m——启动台态是旧手机启动台与旧顶栏；打开谱后顶栏 48 贴顶、底条 64 贴底，旧顶栏 / 迷你条 / 图层轨隐藏，无横向溢出', J({ mo, mo2 }));
      await close(pm);
      /* 验收 SC-4（§0-16 启动台 inert 名单）：启动台态 #flw-rstrip.inert，Tab 走 40 步焦点都不进竖条；文件 ▾ / ＋ 照常可用 */
      const sp = await open(1280, 800, { tag: 'S13-startpad' });
      const s0 = await EV(sp, () => ({ on: startPadOn(), inert: document.getElementById('flw-rstrip').inert, lfInert: document.getElementById('flw-left').inert, file: __vis('#flw-file') }));
      let inRs = 0, seen = new Set();
      await EV(sp, () => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      for (let k = 0; k < 40; k++) { await sp.keyboard.press('Tab'); const r = await EV(sp, () => { const a = document.activeElement; return { rs: !!(a && a.closest && a.closest('#flw-rstrip, #flw-left')), id: a && (a.id || a.className || a.tagName) }; });
        if (r.rs) inRs++; seen.add(String(r.id).slice(0, 20)); }
      await close(sp);
      T('S13', s0.on && s0.inert === true && s0.lfInert === true && inRs === 0 && s0.file, 'S13i 启动台态（验收 SC-4，§0-16）：#flw-rstrip 与 v68.0 左栏 #flw-left 为 inert，Tab 40 步焦点一次都不进竖条 / 左栏；文件 ▾ 可见可用', J({ s0, inRs, seen: seen.size }));
      /* 分享页直开（注入 PYQ_SHARE，?shell=flow） */
      const SRC = URL0.startsWith('file://') ? decodeURIComponent(URL0.slice(7).replace(/[?#].*$/, '')) : null;
      if (SRC && fs.existsSync(SRC)) {
        const sg = { docType: 'vocal', title: '分享测试', key: 'C', tempo: 90, beats: 4, unit: 4, capo: 0, tabVoices: [], voxVoices: ['旋律'], lyricsRows: 0,
          measures: [0, 1].map(() => ({ tabs: [], voxes: [[1, 2, 3, 4].map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [] }))], lyrPad: {} })) };
        const html = fs.readFileSync(SRC, 'utf8').replace(/<\/body>/i, '<script id="pyq-share-data">window.PYQ_SHARE=' + JSON.stringify({ v: 1, mode: 'viewer', song: sg }).replace(/<\//g, '<\\/') + ';<\/script>\n</body>');
        const f = path.join(os.tmpdir(), '_tv_shellflow_shared.html'); fs.writeFileSync(f, html);
        const ps = await open(1280, 800, { tag: 'S13-share', url: 'file://' + f + '?shell=flow', wait: 1300 });
        const sh = await EV(ps, () => ({ viewer: document.body.classList.contains('viewer'), flow: document.body.classList.contains('flow'), active: FLOW.active, mounted: FLOW.mounted,
          vis: [...document.querySelectorAll('[id^="flw-"],.flw-x')].filter(e => __vis(e)).map(e => e.id || e.className), cls: [...document.body.classList].filter(c => /^flw-/.test(c)),
          home: [document.getElementById('beat-box').parentElement.id, document.getElementById('eb-zoom').parentElement.id, document.getElementById('doc-tabs').parentElement === document.body], md: __vis('#mixer-dock') }));
        T('S13', sh.viewer && !sh.flow && !sh.active && !sh.vis.length && !sh.cls.length && J(sh.home) === '["beat-host","editbar",true]' && sh.md,
          'S13f 分享页（PYQ_SHARE 观看模式）带 ?shell=flow 直开：flow 不启用（body.flow / FLOW.active 为假、无可见 flow 节点与 flw-* 类，#beat-box / #eb-zoom / #doc-tabs 在原位），播放条照常', J(sh));
        await close(ps); try { fs.unlinkSync(f); } catch (_) {}
        /* S13k（v68.2 集成，第一轮遗留 ②）：启动即进观看页的意图（FLOW.vint）——不先挂 flow 再退场 */
        const src0 = fs.readFileSync(SRC, 'utf8');
        const injH = so => '<script id="pyq-share-data">window.PYQ_SHARE=' + JSON.stringify({ v: 1, mode: 'viewer', song: so }).replace(/<\//g, '<\\/') + ';<\/script>\n';
        const KST = () => ({ viewer: document.body.classList.contains('viewer'), mounted: FLOW.mounted, active: FLOW.active, flow: document.body.classList.contains('flow'),
          r1: !!document.getElementById('flw-r1'), mtop: !!document.getElementById('flw-mtop'), m: document.body.classList.contains('flw-m'), r1v: __vis('#flw-r1'), lf: __vis('#flw-left'),
          ld: __vis('#left-dock'), mt: __vis('#flw-mtop'), toasts: (window.__toasts || []).slice() });
        const never = x => x.viewer && !x.mounted && !x.active && !x.flow && !x.r1 && !x.mtop && !x.m;
        const kres = {};
        /* ① v68.2 起导出的互动谱（数据在 head，与 exportInteractiveCard 同一注入点）：1280 / 390；② 数据坏（0 小节） */
        for (const [k, so] of [['share', sg], ['bad', Object.assign({}, sg, { measures: [] })]]) {
          const fk = path.join(os.tmpdir(), '_tv_shellflow_k_' + k + '.html'); fs.writeFileSync(fk, src0.replace(/<\/head>/i, injH(so) + '</head>'));
          for (const w of (k === 'share' ? [1280, 390] : [1280])) {
            const pk = await open(w, w > 820 ? 800 : 844, { tag: 'S13k-' + k + w, url: 'file://' + fk, wait: 1300 });
            const a0 = await EV(pk, KST);
            let a1 = null; if (a0.viewer) { await EV(pk, () => exitViewer()); await wait(pk, 500); a1 = await EV(pk, KST); }
            kres[k + w] = { a0, a1 };
            await close(pk);
          }
          try { fs.unlinkSync(fk); } catch (_) {}
        }
        /* ③ ?pub= 深链（线上域名路由：编辑器单文件 + /api 桩；拉谱 300ms 后回，404＝失败） */
        const liveK = async (w, fail) => {
          const ctx = await b.newContext({ viewport: { width: w, height: w > 820 ? 800 : 844 } }); ctx.setDefaultTimeout(6000);
          await ctx.addInitScript(INIT);
          await ctx.route(/https:\/\/zhipu\.puyouquan\.com\/.*/, async route => {
            const p = new URL(route.request().url()).pathname;
            if (p === '/api/me') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
            if (p.startsWith('/api/pub/scores/')) { await new Promise(r => setTimeout(r, 300));
              return fail ? route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"没有这首谱"}' })
                : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ score: { id: 'k1', title: '深链测试', author: '测试', data: sg }, stats: { views: 1 } }) }); }
            if (p.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
            return route.fulfill({ status: 200, contentType: 'text/html', body: src0 });
          });
          const pk = await ctx.newPage(); pk.on('pageerror', e => errs.push('S13k-pub PAGEERR:' + e.message));
          await pk.goto('https://zhipu.puyouquan.com/?pub=k1'); await pk.waitForTimeout(1500); await prep(pk);
          const a0 = await EV(pk, () => Object.assign({ toastTxt: (document.getElementById('toast') || {}).textContent || '' }, (() => ({ viewer: document.body.classList.contains('viewer'), mounted: FLOW.mounted, active: FLOW.active, flow: document.body.classList.contains('flow'),
            r1: !!document.getElementById('flw-r1'), mtop: !!document.getElementById('flw-mtop'), m: document.body.classList.contains('flw-m'), r1v: __vis('#flw-r1'), lf: __vis('#flw-left'), ld: __vis('#left-dock'), mt: __vis('#flw-mtop') }))()));
          let a1 = null; if (a0.viewer) { await EV(pk, () => exitViewer()); await wait(pk, 500); a1 = await EV(pk, KST); }
          await ctx.close();
          return { a0, a1 };
        };
        kres.pub1280 = await liveK(1280, false); kres.pub390 = await liveK(390, false); kres.pubFail = await liveK(1280, true);
        const ok1 = x => x && x.a1 && never(x.a0) && x.a1.flow && x.a1.active && x.a1.r1v && x.a1.lf && !x.a1.ld;
        const okM = x => x && x.a1 && never(x.a0) && x.a1.m && x.a1.mt && !x.a1.flow;
        const bad = kres.bad1280 && kres.bad1280.a0, pf = kres.pubFail.a0;
        T('S13', ok1(kres.share1280) && okM(kres.share390) && ok1(kres.pub1280) && okM(kres.pub390)
          && !!bad && !bad.viewer && bad.flow && bad.active && bad.r1v && bad.lf && !bad.ld
          && !pf.viewer && pf.flow && pf.active && pf.r1v && pf.lf && !pf.ld && /曲谱加载失败/.test(pf.toastTxt),
          'S13k 启动即进观看页不先挂再退（v68.2 集成）：head 注入的互动谱与 ?pub= 深链在 1280 / 390 从开机到观看页一次都没挂（无 #flw-r1 / #flw-mtop），退出观看后照常挂上（桌面 flow / 手机 flw-m）；'
          + '互动谱数据坏、?pub= 拉谱 404 没进成 → 立即补挂 flow（行 1 / 左栏可见、旧左栏隐藏）', J(kres));
      }
    } catch (e) { T('S13', false, 'S13 执行异常', e.message.split('\n')[0]); }
  });

  /* ================= S14 无抖动 · S15 数据零改动 ================= */
  if (want('S14') || want('S15')) jobs.push(async () => {
    try {
      /* 默认外壳同场景的键集合（作 S15 基线） */
      const DATA = () => { try { persistFlush(); } catch (_) {} return { song: JSON.stringify(song), docs: localStorage.getItem('musetab-docs-v1') || '', f: Object.keys(song).sort() }; };
      const pd = await open(1280, 800, { tag: 'S15-def', url: CLASSICU });   /* v68.2 切默认：「默认外壳」基线改取 ?shell=classic 的旧外壳（不带参数已是 flow） */
      await EV(pd, () => __scn('songbie')); await wait(pd, 500);
      const kDef = await EV(pd, () => __keys());
      const dDef = await EV(pd, DATA);   /* 验收 SC-3：数据基线取默认外壳（此前 s0 取在 flow 挂载之后，挂载 / 同步时写进 song 的字段抓不到） */
      await close(pd);
      const pg = await open(1280, 800, { tag: 'S14' });
      await EV(pg, () => __scn('songbie')); await wait(pg, 600);
      const dFlow = await EV(pg, DATA);
      const n0 = await EV(pg, () => RENDER_STAT.n); await wait(pg, 1500); const n1 = await EV(pg, () => RENDER_STAT.n);
      await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 700); const n2 = await EV(pg, () => ({ n: RENDER_STAT.n, cls: ['flw-rd', 'flw-rs'].filter(c => document.body.classList.contains(c)).join() }));
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 700); const n3 = await EV(pg, () => ({ n: RENDER_STAT.n, cls: ['flw-rd', 'flw-rs'].filter(c => document.body.classList.contains(c)).join() }));
      await wait(pg, 1000); const n4 = await EV(pg, () => RENDER_STAT.n);
      T('S14', n1 - n0 <= 1 && n2.n - n1 <= 3 && n3.n - n2.n <= 3 && n4 - n3.n <= 1 && n2.cls === 'flw-rd' && n3.cls === 'flw-rs',
        'S14 无抖动：静置 1.5s render 增量 ≤1；1280→1440（停靠）→1280（竖条）每步 render ≤3，之后静置不再重排', J({ idle: n1 - n0, to1440: n2.n - n1, to1280: n3.n - n2.n, idle2: n4 - n3.n, cls: [n2.cls, n3.cls] }));
      /* S15：开关全部菜单、切右栏、resize 前后 song 不变 */
      const s0 = await EV(pg, () => ({ s: JSON.stringify(song), k: __keys() }));
      const menus = [];
      for (const op of ['#flw-file', '#flw-acct', '#flw-more', '#flw-st-more', '#flw-st-help', '#flw-tabovf']) {   /* 保存状态在未入库时点一下就是存入（会写 song.id），不在此列 */
        const ex = await EV(pg, s => __vis(s), op); if (!ex) { menus.push(op + ':无'); continue; }
        await pg.click(op); await wait(pg, 150); const m = await EV(pg, () => __menu());
        await pg.keyboard.press('Escape'); await wait(pg, 100); const gone = await EV(pg, () => !document.getElementById('popmenu'));
        menus.push(op + ':' + (m ? m.m + (gone ? '' : '(未收)') : '无菜单'));
      }
      const info = await EV(pg, () => { const e = document.querySelector('#flw-rstrip [data-fa="rd:tab"]'); if (e) e.click(); return !!e; }); await wait(pg, 150);
      await pg.keyboard.press('Escape'); await wait(pg, 100);
      await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 500); await pg.setViewportSize({ width: 1100, height: 800 }); await wait(pg, 500); await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 500);
      const s1 = await EV(pg, () => ({ s: JSON.stringify(song), k: __keys() }));
      const extra = [...new Set([...s1.k, ...s0.k])].filter(k => !kDef.includes(k));
      const dSame = dFlow.song === dDef.song && dFlow.docs === dDef.docs && dFlow.f.every(k => dDef.f.includes(k)) && dDef.docs.length > 0;
      T('S15', dSame, 'S15a 数据基线取默认外壳（验收 SC-3）：同一场景 __scn(送别) 下 flow 挂载 + 同步后的 song JSON、musetab-docs-v1 与默认外壳逐字节相同，song 字段集合 ⊆ 默认外壳的',
        J({ song: dFlow.song === dDef.song, docs: dFlow.docs === dDef.docs, extra: dFlow.f.filter(k => !dDef.f.includes(k)) }));
      T('S15', s0.s === s1.s && s1.s === dDef.song && extra.every(k => NEWKEYS.includes(k)) && menus.every(x => !/未收|无菜单/.test(x)) && info,
        'S15 数据零改动：开关文件 / 账号 / 更多 / ⋯ / ? 菜单（窗口 N ▾ 只开一个窗口时不出现）、浮出右栏、1440 / 1100 / 1280 来回 resize 前后 song JSON 相同；musetab-* 键比默认外壳只多 ⊆ {musetab-flow, musetab-rdock}',
        J({ same: s0.s === s1.s, extra, menus }));
      await close(pg);
    } catch (e) { T('S14', false, 'S14 / S15 执行异常', e.message.split('\n')[0]); }
  });

  await pool(jobs, 2);

  /* —— 汇总 S2 S3 S4（静态）S5 S16 S17 —— */
  const G = Object.entries(GEO).filter(([k]) => !/^con-/.test(k));
  const SAFE = (id, name, fn) => { try { fn(); } catch (e) { T(id, false, name + ' 汇总异常', e.message.split('\n')[0]); } };
  const hv = o => o ? o.h : '无', bv = o => o ? o.b : '无';
  if (G.length) {
    const errG = G.filter(([, g]) => g.err).map(([k, g]) => k + ' ' + g.err);
    if (errG.length) T('S2', false, 'S2–S5 / S16 执行异常', errG.join('；'));
    const ok = G.filter(([, g]) => !g.err && g.sh);
    if (want('S2')) SAFE('S2', 'S2', () => { const bad = ok.filter(([, g]) => { const s = g.sh; return !(s.flow && s.r1 && s.r1.vis && Math.abs(s.r1.h - 44) <= 0.5 && Math.abs(s.eb.h - 40) <= 0.5 && Math.abs(s.top.b - 84) <= 0.5 && Math.abs(s.md.h - 32) <= 0.5 && Math.abs(s.md.b - s.ih) <= 0.5 && s.top.b + s.md.h <= 116.5); });
      T('S2', !bad.length && ok.length === 6, 'S2 外壳总高（3 视口 × 浅 / 深）：行 1 44 · 行 2 40 · #top 底 84（＝44+40，无 1px 底边）· 状态栏 32 贴底 · 顶 + 底 116',
        (bad.length ? '不符 ' : '') + (bad.length ? bad : ok).map(([k, g]) => k + ' r1=' + hv(g.sh.r1) + ' eb=' + hv(g.sh.eb) + ' top.b=' + bv(g.sh.top) + ' dock=' + hv(g.sh.md) + '@' + bv(g.sh.md)).join('；')); });
    if (want('S3')) SAFE('S3', 'S3', () => { const bad = ok.filter(([k, g]) => { const w = k.split('×')[0]; return !(g.vh.vh >= MINVH[w] && g.vh.st >= 50 && g.vh.sb === 46 && g.vhc && g.vhc.vh >= MINVHC[w] && g.vhc.sb === 34); });
      T('S3', !bad.length && ok.length === 6, 'S3 谱面可见高（#score-wrap 可视区减谱型条与悬浮条，吸住时量）：悬浮条展开 1280×800 ≥638 · 1366×768 ≥606 · 1440×900 ≥738；收起 ≥650 / 618 / 750',
        ok.map(([k, g]) => k + ' 展开 ' + g.vh.vh + '（条 ' + g.vh.sb + '，scrollTop ' + g.vh.st + '）收起 ' + (g.vhc && g.vhc.vh) + '（条 ' + (g.vhc && g.vhc.sb) + '）' + (g.vh.lb ? '（谱型条 ' + g.vh.lb + '）' : '')).join('；')); });
    if (want('S4')) SAFE('S4', 'S4a', () => { const bad = ok.filter(([k, g]) => { const w = +k.split('×')[0], s = g.sh; if (!s.rd || !s.rs) return true; return w >= 1440 ? !(s.rd.vis && Math.abs(s.rd.w - 264) <= 0.5 && !s.rs.vis && J(s.cls) === '["flw-rd"]')
        : !(s.rs.vis && Math.abs(s.rs.w - 40) <= 0.5 && !s.rd.vis && J(s.cls) === '["flw-rs"]'); });
      T('S4', !bad.length && ok.length === 6, 'S4a 右栏让位：1440 停靠 264（无竖条，body.flw-rd）；1280 / 1366 竖条 40（右栏不占位，body.flw-rs）', ok.map(([k, g]) => k + ' rd=' + (g.sh.rd && g.sh.rd.vis ? g.sh.rd.w : '隐') + ' rs=' + (g.sh.rs && g.sh.rs.vis ? g.sh.rs.w : '隐')).join('；')); });
    if (want('S5')) SAFE('S5', 'S5', () => { const all = [], bad = [], wbad = [];
      ok.forEach(([k, g]) => g.clear.forEach(c => { all.push(c); if (!c.ok) bad.push(k + ' ' + c.k + (c.want ? ' 面板开' : ' 面板关') + ' score ' + c.x + '–' + c.r + ' 左栏右缘 ' + c.L + ' 右侧左缘 ' + c.R + (c.tight ? ' tight' : ''));
        if (c.k === 'songbie' ? Math.abs(c.w - 870) > 2 : c.w < 868) wbad.push(k + ' ' + c.k + (c.want ? ' 面板开' : ' 面板关') + ' w=' + c.w);
        if (c.fly || c.tight) wbad.push(k + ' ' + c.k + ' 旧面板可见 / paper-tight'); }));
      T('S5', !bad.length && all.length === 24, 'S5a paperClear 24 态全真（3 视口 × 浅深 × {预设谱 送别, 新建 pacc} × 旧左栏面板开 / 关）：#score 不被左栏 / 右栏 / 竖条遮住', bad.length ? bad.join('；') : all.length + ' 态');
      T('S5', !wbad.length && all.length === 24, 'S5b 谱纸宽（v68.0 左栏 248 常驻，旧面板开 / 关两态相同、旧面板不可见、无 paper-tight）：预设谱 #score 870±2、新建谱（fixwide）≥868',
        wbad.length ? wbad.join('；') : ok.map(([k, g]) => k + ' ' + g.clear.map(c => c.w).join('/')).join('；')); });
    if (want('S16')) SAFE('S16', 'S16', () => { const bad = ok.filter(([, g]) => g.hit.small.length);
      T('S16', !bad.length && ok.length === 6, 'S16 命中区：#flw-r1 / #editbar / #mixer-dock / #flw-rstrip 内可见按钮最小边 ≥28（桌面 3 视口 × 浅 / 深）',
        bad.length ? bad.map(([k, g]) => k + '：' + g.hit.small.join('，')).join('；') : ok.map(([k, g]) => k + ' ' + g.hit.n + ' 个').join('；')); });
  }
  if (want('S17') && GEO['con-light']) SAFE('S17', 'S17', () => {
    const fails = [];
    for (const k of ['con-light', 'con-dark', 'con-sysdark']) { const c = GEO[k]; if (!c) { fails.push(k + ' 缺'); continue; }
      ['文件', '保存状态', '账号', '发布', '非当前页签', '当前页签'].forEach(n => { if (!(c[n] >= 4.5)) fails.push(k.slice(4) + ' ' + n + '=' + c[n]); });
      if (c.当前页签底 !== c.toolbar) fails.push(k.slice(4) + ' 当前页签底 ' + c.当前页签底 + ' ≠ --toolbar ' + c.toolbar); }
    T('S17', !fails.length, 'S17 对比度：行 1（文件 ▾ · 保存状态 · 账号 · 发布 · 非当前页签）对框架底 ≥4.5，当前页签（--toolbar 底）≥4.5（浅 / 深 / 系统深）',
      fails.length ? fails.join('；') : ['con-light', 'con-dark', 'con-sysdark'].map(k => k.slice(4) + ' ' + ['文件', '保存状态', '发布', '非当前页签', '当前页签'].map(n => n + GEO[k][n]).join(' ')).join('；'));
  });
  else if (want('S17')) T('S17', false, 'S17 对比度没有量到（页签块未跑完）');
  T('S15', errs.length === 0, '无页面脚本错误', errs.slice(0, 4).join(' | '));

  for (const k of ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17']) (OUT[k] || []).forEach(l => console.log(l));
  await b.close();
  console.log((pass === total ? 'PASS ' : 'FAIL ') + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
