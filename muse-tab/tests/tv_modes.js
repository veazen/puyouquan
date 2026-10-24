'use strict';
/* v68.1 新外壳 flow（?shell=flow）三步「书写 › 排版 › 输出」· 右栏属性 / 文字 / 智能 · 行 2 换键 · 命令面板 · 切轨跟滚 · <1280 · 手机。
   工程计划 flowplan §4.9 断言表 M1–M18，另加 v68.0 遗留 M19（TRK-16）/ M20（SH-3）/ M21（SH-4）、M22 三步口径、M23 不带开关零差异。
   几何断言优先（rect / elementFromPoint）、真实点击与按键，file:// 直载。拍板口径：工作流只有三步，不设「播放」步；右栏不设「练习」页；不绑 Alt+数字。
   M1  一打开即 body[data-mode]=write；没有与模式相关的本机键（模式不落盘：进排版后刷新仍是书写）
   M2  排版 / 输出：#preview-ov 左缘＝#flw-left 右缘、顶 84、底＝innerHeight−32、右缘＝右栏（1440 停靠）/ 竖条（1280）左缘；#pv-bar 不可见；
       排版工具组「页头与页码…」打开右栏「版式」的「页头 · 页码」区，再点区里的「页头」打开曲谱信息弹窗（v68.5；此前工具组键直接开弹窗），elementFromPoint(弹窗中心) 落在 .modal 内（预览层级低于弹窗）
   M3  选区与滚动不变：sel.mi=5、#score-wrap 滚到 X，经排版 → 输出 → 书写（真实点模式条）后 sel 逐字段相同、scrollTop ±1
   M4  排版模式按 5 → 回书写、预览关闭，刚落音的那一列 deg=5（按 5 后光标前进，不用 curCol）；排版模式在 #i-tempo 里输入数字不切模式、值改变；输入框里 Esc 只失焦
   M5  Esc：排版 / 输出 → 书写、预览关闭；书写下 Esc 不改模式
   M6  排版工具（行 2 #flw-eng 真实点击）：A3 → layout.page、PV.geo.n 变；紧凑 → layout.preset；此处换行 → measures[mi−1].brk=1 且有一行从 mi 起；
       并入上一行 → measures[mi].pull=1 且不再从 mi 起；锁定此行 → sysRowLocked，改疏密后该行小节集合不变（另有行重排了）；Ctrl+Z 逐步复原到初值；记录快照耗时（R1）
   M7  版面检查：左栏「共 n 页 · m 行」＝PV.geo.n / 分页 layoutSystems().length，每行小节数一致，页面区每页一行；点「第 2 页」→ 第 2 页顶进入 #pv-stage 可视区；
       点版面提示 → sel.mi＝该行首小节，回书写光标落在那里
   M8  输出（#flw-out 真实点击）：7 个导出键各调到 exportPNG / exportShareCard / exportInteractiveCard / downloadMusicXML / downloadMIDI / exportSong / print，
       pyqEvent 事件名与「打印 / 导出」弹窗逐个相同；「分谱」（《送别》一位演奏者，v68.6 起原因「只有一位演奏者」）aria-disabled、点了不导出
   M9  发布 2 步（1280 竖条档）：未入库窗口点行 1「发布」→ 输出模式、发布卡浮出可见并聚焦；点「存入并提交发布」→ song.id 有值、库 +1、#popmenu .t 含「发布《」；全程 2 次点击、location.href 不变
   M10 右栏（1440 停靠）：属性页 #cursor-info 随方向键更新；已加记号芯片＝curCol()，点 × 清掉；文字页 ＋ 加一段、①② 切 activeLyr；
       智能页每项显隐＝委托按钮（钢琴伴奏歌谱有「伴奏织体」，吉他弹唱没有）
   M11 级数角标：1=F、五线谱轨 → 7 个音名键从左到右 C D E F G A B、角标 5 6 7 1 2 3 4；点 C → 那一列 deg=5；回简谱轨角标消失、按 1–7 排
   M12 简谱时值字形：简谱语境 #eb-dur [data-dur=2] 含「5」与 1 条增时线、8 分 1 条 / 16 分 2 条减时线；五线 / 六线谱轨换回与经典外壳逐字节相同的 SMuFL 字形
   M13 命令面板：Ctrl+/ 打开；ych 第一条「延长号 · 在 书写 · 左栏记号 · <组>」，Enter 写 ferm；「预设」→ 示例曲谱；pb 回车 → 排版；
       Ctrl+K 仍是和弦快速输入；? ＝快捷键菜单；命令 ≥120 条（R5）；musetab-cmd-recent 记最近、坏 JSON 回默认不报错；
       「锁定此行」「并入上一行」命令＝点排版工具组同一路径（集成 M13g）
   M14 切轨跟滚：40 小节 3 旋律轨，第 30 小节在视口外，点第 3 轨行 / 键盘 ↓ 换轨 → 光标框 top ≥ 可视顶+12−1、bottom ≤ 可视底−24+1
   M15 1180×800：#flw-mdd 可见、#flw-modes 不可见；#flw-left 宽 56；记号浮层 288 宽、点「延长号」生效；paperClear；「书写 ▾」三步菜单可切到输出
   M16 手机 390×844：#flw-mtop 高 48、#flw-mbar 高 64 贴底；五个抽屉都能开合（点 / Esc / 遮罩）；触控目标 ≥44；旧手机三层底栏不可见；音轨抽屉只有选轨 / 静音 / 独奏（D-07 ②）；
       「播放设置」抽屉搬入 / 搬回四个原节点；输出抽屉走 EXPORT_ACT、与弹窗同一组调用与事件（集成 M16g）
   M17 快捷键不变：三种模式下 Alt+N 都开新建面板（非书写先回书写）；Alt+B；Ctrl+Z / Y / S 在排版照常且不切模式；排版模式空格播放
   M18 数据零改动：三种模式往返 20 次（含真实点击）后 song 逐字节相同；源码里新出现的 musetab-* 键名 ⊆ {musetab-cmd-recent}
   M19 TRK-16 状态栏小节格（flow）：单击＝光标跳到当前轨该小节（不设循环）；Shift+拖选＝当前轨整小节选区（与经典混音台每轨小节格同一 selRange），Ctrl+C / Ctrl+V 接得上；
       普通拖选仍是 setLoop；排版模式单击先回书写
   M20 SH-3（v68.3 迁移：行 2 起步组 / ⓘ / 右栏「下一步」卡撤掉，起步收回谱面上方的悬浮条 #flw-sbar）：1280 竖条 / 1180 窄档 / 1440 停靠三档——
       条上步骤名＝lbInfo 的步名（与经典外壳谱型条 .lb-steps 逐字相同）；当前步提示可见字＝短提示（SB_HINT），title＝经典谱型条 .lb-hint 原文（同源 lbCur）；
       1440 落地右栏停在默认「属性」页（不再被拉去「智能」），全程没有 #flw-start / #flw-next / ⓘ
   M21 SH-4：撤销段 DOM 在 #editbar 行首（模式条之后、第一个工具段之前），视觉同序；真实 Tab 顺序 模式条 → 撤销 / 重做 → 行 2 第一个工具（v68.3 行 2 没有起步组）
   M22 三步口径：#flw-modes 恰好 3 个 tab（书写 / 排版 / 输出）、setMode('play') 无效；「书写 ▾」菜单 3 项；界面文字 / 读屏名 / 命令表里没有「播放」步或模式、没有「四步」；右栏无「练习」页
   M24 v68.1 收尾（验收 MODES）：发布浮层定宽不爬 · 本机演示说明指「输出」· 每行 ＋ / − 当前行恰好 ±1 且前面的行不动 · 此处换行 / 并入上一行不重排前面的行 ·
       解锁保留锁定前的手动换行 · 版式滑杆只按不拖不记撤销 · 改纸张后当前行仍在视野 · 键盘进排版焦点落预览 · 每笔只排两次整谱 · 纯和弦谱分谱不写「人声」
   M25 v68.1 收尾（验收 PN）：只有一句提示的谱类新建后那一句说明可见（v68.3：谱面上方悬浮条的空谱提示 SB_TIP，title＝LB_TIP；右栏停「属性」页）· 821–861 行 2 无遮挡 · 密集标尺的小节面板接 TRK-16 ·
       属性页芯片补拨片 / 打板 / 摇把 / 指法 / 谱号 · 转调小节音名按本小节调 · 命令「和弦图 / 写法」可用性同右栏 · 窄档「+N ↓」· 手机跟滚让开底条 · 命令同分常用在前
   M26 v68.1 收尾（验收 RG）：手机抽屉开着时互动谱快照节点不丢 · 排版 / 输出模式缩放作用于预览 · 命中区 ≥28 · 灰显原因进 title / 读屏名 · 空小节提示带图标
   M27 v68.2 遗留 ①：排版 / 输出每笔整谱排版 1 次（render 本身就是预览快照；mutate / layApply / Ctrl+Z 各 1 次，只改选中行 0 次）· 回书写逐字节相同 · 渲染异常照旧自动撤销 ·
       固定版宽谱排版换纸张不改写 musetab-zoom · 150 小节点击→预览更新 / 最长阻塞记数
   M28 v68.2 遗留 ②：输出模式行 2「预览 适宽 / 整页 / 横排」作用于嵌入预览（几何）、左栏页面横向跳页、排版恒竖排、回书写还原、命令面板直达；821–1280 行 2 不收键
   M29 v68.2 遗留 ③：#toast role=status / aria-live=polite / aria-atomic（flow 桌面与手机）；离开 flow 摘掉、快照里摘掉；经典外壳零差异
   M30 v68.2 遗留 ④：命令面板拼音撞码 ph / qy 按常用度排；最近用过压过静态常用度；PN-9 口径不变
   M31 v68.2 遗留 ⑤：窄档 56 左栏音轨列细滚动条（scrollbar-width:thin）与「+N ↓」并存
   M23 不带开关零差异：默认外壳里本版动过的共享路径（sysAct 行尾按钮 · EXPORT_ACT /「打印 / 导出」弹窗 · 预览 Esc · Alt+N · 拖放 blocked() · #mx-prog 单击 / 拖选 · Esc）
       与 shellflow_ref.json 的基线提交逐项对拍（HTML / 数据 / 事件 / 提示 / 本机键）；不变量：FLOW 未挂载、无 flow 节点 / 类 / data-mode
       v68.2 切默认起：被测页改为 ?shell=classic 的旧外壳、对拍基线提交不带开关的默认外壳；例外仅 musetab-flow 键（写在 M23 处）
   RL  数据红线自检（全部用例汇总）：song 字段集合 ⊆ 操作前 ∪ 本用例应写的现有字段；musetab-* 键差集（去掉基线已有的键名）⊆ {musetab-cmd-recent}
   v69.1 B（规格 f91 §4 / §6.2）有意迁移：排版 / 输出新形态（悬浮条按模式换内容、行工具条、左栏格式卡、行 1 发布弹层）只在 F.nxOn()——M2 / M6 / M8 / M9 / M24a·c·i / M27 / M28a·f
       两种形态各跑（?next=0＝原断言，新形态＝同 id / data-fa 搬家后的断言）；M7 摘要两种写法都认；M26d 新形态量悬浮条与行工具条；__vis 只看元素自身 visibility（可被子孙覆盖）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· MUSETAB_REF 参考页（none＝跳过对拍）· MUSETAB_REF_COMMIT · ONLY=M1,M6 · SHOTS=目录 存截图 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const FLOWU = withQ(URL0, 'shell=flow'), CLASSICU = withQ(URL0, 'shell=classic');
/* v69.1 B（规格 f91 §4 / §6.2）：排版 / 输出的新形态（悬浮条按模式换内容、行工具条、左栏格式卡、行 1 发布弹层）只在 F.nxOn()；
   ?next=0 回到 v69.0 形态——受影响用例两种形态各跑一遍：NX0U 跑原断言，FLOWU 跑新形态断言 */
const NX0U = withQ(FLOWU, 'next=0');
const PIN = () => { try { localStorage.setItem('musetab-rdock', '1'); } catch (_) {} };   /* v69.1 D5：只是借右栏走到别的功能的用例，钉住＝停靠 264（v69.0 几何） */
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shellflow_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.MUSETAB_REF_COMMIT || REF.commit || '2675b9c';
const IN_CI = !!process.env.CI && process.env.MUSETAB_REF !== 'none';
/* 本版之前 flow 预览已有的本机键（v67.9 / v68.0）；本版只许新增 musetab-cmd-recent（计划 §1.2 / §4.7） */
const PREV_FLOW_KEYS = ['musetab-flow', 'musetab-rdock', 'musetab-pal', 'musetab-signdensity'];
const NEW_KEYS = ['musetab-cmd-recent', 'musetab-sbar', 'musetab-chordhear', 'musetab-preview'];   /* v69.0 有意迁移 + musetab-preview（停留预览开关，'0'＝关，规格 f90 §2.9 / 方案 P11） */   /* v68.3 musetab-sbar：谱面上方悬浮条收起（'0'），展开＝删键；v68.9 有意迁移 + musetab-chordhear（和弦面板悬停试听开关，规格 f89 §0.5） */
const J = x => JSON.stringify(x);

/* —— 页面内工具（每个上下文的 init 脚本；只定义 window.__*，不碰页面状态）—— */
function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    /* v69.1 B：visibility 会被子孙覆盖（排版 / 输出模式 #score-wrap 隐藏、里面的悬浮条 #flw-sbar 显式 visible），只看元素自身的计算值；display / opacity 仍逐级查 */
    if (getComputedStyle(e).visibility !== 'visible') return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.opacity === '0') return false; }
    return true; };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10;
    return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom), vis: __vis(e) }; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  /* song 字段集合（数据红线）：顶层 S. · 版式 L. · 混音条目 X. · 小节 M. · 列 C. · 六线谱音 N. 的键名 */
  window.__fields = () => { const S = new Set(), s = song; if (!s) return [];
    Object.keys(s).forEach(k => S.add('S.' + k));
    if (s.layout && typeof s.layout === 'object') Object.keys(s.layout).forEach(k => S.add('L.' + k));
    if (s.mixer && typeof s.mixer === 'object') Object.values(s.mixer).forEach(o => o && Object.keys(o).forEach(k => S.add('X.' + k)));
    (s.measures || []).forEach(m => { if (!m) return; Object.keys(m).forEach(k => S.add('M.' + k));
      ['voxes', 'tabs'].forEach(t => (m[t] || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; Object.keys(c).forEach(k => S.add('C.' + k));
        (c.notes || []).forEach(n => n && Object.keys(n).forEach(k => S.add('N.' + k))); }))); });
    return [...S].sort(); };
  window.__one = s => { addDoc(s, () => {}); closeDocAt(0); };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} try { NWP.quickMenuClose(); } catch (_) {} };
  /* 场景：单窗口、光标在指定轨第 mi 小节第 1 列 */
  window.__scn = (k, o) => {
    o = o || {};
    window.guardReplace = p => p();
    try { hideStartPad(); } catch (_) {}
    let row = 'vox';
    if (k === 'songbie') __one(__P('送别'));
    else if (k === 'long') { const s = __P('送别'), m = s.measures; s.measures = m.concat(JSON.parse(J2(m)), JSON.parse(J2(m)), JSON.parse(J2(m)));
      for (let i = 4; i < (o.rep || 4); i++) s.measures = s.measures.concat(JSON.parse(J2(m)));   /* v69.1 B：o.rep＝送别重复几遍（缺省 4＝64 小节，同原） */
      s.title = '送别（长谱）'; __one(s); }
    else if (k === 'pacc') { __one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; fillAccompaniment('slow', true); }
    else if (k === 'gtr') { __one(__P('两只老虎')); row = 'tab'; }
    else if (k === 'piano') __one(__P('欢乐颂（钢琴独奏）'));
    else if (k === 'trk3') { const s = createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 40, nTab: 1, nVox: 3, lyr: 1 });
      s.voxVoices = ['主唱', '和声一', '和声二']; s.title = '三条旋律轨'; __one(s); }
    else if (k === 'newpacc') { NWP.quickCreate('pacc'); closeDocAt(0); }
    if (o.row) row = o.row;
    sel = { mi: o.mi || 0, row, vi: o.vi || 0, ci: o.ci || 0, si: 1 };
    try { clampSel(); } catch (_) {}
    try { blurSel = false; lastEnt = null; noteSel = []; selRange = null; } catch (_) {}
    try { setRibbon(sel.row); } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { title: song.title, n: song.measures.length, dt: docType(song) };
  };
  window.J2 = x => JSON.stringify(x);
  /* 光标框（与 selFollow 同一算法：colBoxes → 屏幕坐标）与可视区（selFollow 的上 12 / 下 24 余量；flow 下底边让到状态栏） */
  window.__curBox = () => { const b = colBoxes[(sel.row === 'tab' ? 't' : 'v') + sel.vi + ':' + sel.mi + ':' + sel.ci]; const svg = document.getElementById('score');
    if (!b || !svg) return null; const vb = svg.viewBox.baseVal, R = svg.getBoundingClientRect(), k = R.width / vb.width;
    const sc = scoreScroller(), wr = sc.getBoundingClientRect(), md = document.getElementById('mixer-dock');
    const vT = Math.max(wr.top + 12, lbStickBottom() + 8), vB = Math.min(wr.bottom, innerHeight) - 24;
    return { top: Math.round(R.top + b.y * k), bot: Math.round(R.top + (b.y + b.h) * k), vT: Math.round(vT), vB: Math.round(vB), md: md ? Math.round(md.getBoundingClientRect().top) : null, st: sc.scrollTop }; };
  /* 分页口径的行（与预览 / 打印同一份：PRINT_PAGING 下 layoutSystems） */
  window.__pagedRows = () => { const pp = PRINT_PAGING; PRINT_PAGING = true; try { return layoutSystems().map(s => s.measures.map(m => m.mi)); } finally { PRINT_PAGING = pp; } };
  window.__colAt = (mi, ci, row, vi) => { const m = song.measures[mi]; return ((row === 'tab' ? m.tabs : m.voxes)[vi || 0] || [])[ci]; };
}

/* —— M23：默认外壳（不带开关）里本版动过的共享路径；在基线页与被测页各跑一遍，逐项对拍。只用两版都有的 API —— */
async function M23SCN() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const TO = []; try { const ot = toast; toast = function (m) { TO.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
  const EV = [];
  try { pyqEvent = function (n) { EV.push('ev:' + n); }; } catch (_) {}
  ['exportPNG', 'exportShareCard', 'exportInteractiveCard', 'downloadMusicXML', 'downloadMIDI', 'exportSong'].forEach(f => { try { window[f] = function () { EV.push('fn:' + f + '(' + [...arguments].join(',') + ')'); }; } catch (_) {} });
  try { const sp = setPrintPage; setPrintPage = function (s) { EV.push('setPrintPage(' + s + ')'); return sp.apply(this, arguments); }; } catch (_) {}
  try { const cm = closeModal; closeModal = function () { EV.push('closeModal'); return cm.apply(this, arguments); }; } catch (_) {}
  window.print = () => EV.push('print');
  try { hideStartPad(); } catch (_) {}
  const P = n => migrate(PRESETS.find(x => x.name.indexOf(n) >= 0).make());
  /* v68.2 收尾 NU-8（本版对旧外壳的有意改动 ⑤）：原样示例谱关窗不再自动转存（closeDocAt / docIsDemoAsIs，两外壳同口径；tv_flowdef F8e 专测）。
     本对拍要比的是其余共享路径，被关的那个窗口先改一笔署名，基线与本版都按「有内容」转存，结果仍逐项相同 */
  const one = s => { addDoc(s, () => {}); const d0 = docs[0]; if (d0 && d0.song) d0.song.composer = (d0.song.composer || '') + '·'; closeDocAt(0); };
  const out = {}, ae = () => { const a = document.activeElement; return a ? (a.id || a.tagName) : null; };
  const kd = (key, o) => { const e = new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, o || {})); window.dispatchEvent(e); return e.defaultPrevented; };
  const take = () => { const r = EV.join(' '); EV.length = 0; return r; };
  const ms = () => song.measures.map((m, i) => (m.brk ? 'b' : '') + (m.pull ? 'p' : '') + (m.wf ? 'w' + m.wf : '') || '.').join('');
  /* A 谱面行尾 ○ ＋ −（v68.1 抽成 sysAct）：宽度手柄打开后行尾按钮出现；按下即生效（pointerdown） */
  one(P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render();
  { const hb = document.getElementById('b-meahandle'); if (hb) hb.click(); else { meaHandleOn = true; render(); } }
  const pd = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }));
  const sbtn = (act, k) => [...document.querySelectorAll('#score [data-sysact^="' + act + ':"]')][k || 0];
  out.A_btns = [...document.querySelectorAll('#score [data-sysact]')].map(g => g.getAttribute('data-sysact')).join(',');
  out.A_m0 = ms();
  { const b = sbtn('push', 0); if (b) pd(b); out.A_push = ms() + '|' + TO.slice(-1)[0]; }
  { const b = sbtn('pull', 1); if (b) pd(b); out.A_pull = ms() + '|' + TO.slice(-1)[0]; }
  { const b = sbtn('reset', 0); if (b) pd(b); out.A_reset = ms() + '|' + TO.slice(-1)[0]; }
  undo(); undo(); out.A_undo = ms();
  { const hb = document.getElementById('b-meahandle'); if (hb) hb.click(); else { meaHandleOn = false; render(); } }
  /* B 「打印 / 导出」弹窗（v68.1 各按钮改调 EXPORT_ACT）：弹窗 HTML、每个按钮的事件 / 调用顺序 */
  take();
  document.getElementById('b-print').click(); { const m = document.getElementById('modal-mask'); out.B_modal = m ? m.innerHTML : null; }
  for (const id of ['ex-png', 'ex-card', 'ex-icard', 'ex-mxl', 'ex-mid', 'ex-mtab']) {
    if (!document.getElementById('modal-mask')) document.getElementById('b-print').click();
    take(); document.getElementById(id).click(); await sleep(30); out['B_' + id] = take() + '|' + !!document.getElementById('modal-mask');
  }
  document.getElementById('b-print').click(); document.getElementById('ex-size').value = 'A4L'; take();
  document.getElementById('ex-print').click(); out.B_print0 = take(); await sleep(220); out.B_print = out.B_print0 + ' / ' + take() + '|' + !!document.getElementById('modal-mask');
  /* C 打印预览：开着时 Alt+N 不响应、拖放被拦（blocked()='preview'）；Esc 关预览 */
  take(); TO.length = 0;
  document.getElementById('b-preview').click(); await sleep(60);
  out.C_on = document.getElementById('preview-ov').className + '|' + PV.fit + '|' + PV.zoom;
  out.C_altn = [kd('n', { code: 'KeyN', altKey: true }), !!document.getElementById('modal-mask')].join('|');
  { const dt = new DataTransfer(); dt.items.add(new File(['<x/>'], 'a.musicxml', { type: 'application/xml' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    const mk = document.getElementById('nf-dropmask'); out.C_mask = mk ? mk.outerHTML : null;
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    out.C_drop = [!!document.getElementById('nf-dropmask'), TO.slice(-1)[0] || '', !!document.getElementById('modal-mask')].join('|'); }
  out.C_esc = [kd('Escape'), document.getElementById('preview-ov').className].join('|');
  /* D 预览关着：Alt+N 开新建面板；拖进来出提示层（不拦） */
  out.D_altn = [kd('n', { code: 'KeyN', altKey: true }), !!document.getElementById('modal-mask'), !!(NWP.modal && NWP.modal.isConnected)].join('|');
  try { closeModal(); } catch (_) {} take();
  { const dt = new DataTransfer(); dt.items.add(new File(['<x/>'], 'a.musicxml', { type: 'application/xml' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    const mk = document.getElementById('nf-dropmask'); out.D_mask = mk ? mk.outerHTML : null;
    window.dispatchEvent(new DragEvent('dragleave', { dataTransfer: dt, bubbles: true, cancelable: true, relatedTarget: null }));
    out.D_mask2 = !!document.getElementById('nf-dropmask'); }
  /* E 状态栏小节格 #mx-prog（默认外壳：单击＝单小节循环、再点取消、拖动＝循环选区；不动光标与选区） */
  sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; selRange = null; render(); TO.length = 0;
  const cell = mi => document.querySelector('#mx-prog .mxc[data-mi="' + mi + '"]');
  const pe = (t, el, o) => (el || window).dispatchEvent(new PointerEvent(t, Object.assign({ bubbles: true, cancelable: true, button: 0, pointerId: 1 }, o || {})));
  out.E_title = document.getElementById('mx-prog').title + '|' + document.getElementById('mx-prog').className;
  pe('pointerdown', cell(4)); pe('pointerup', window);
  out.E_click = J2([audio.loop, sel, selRange, TO.slice(-1)[0]]);
  pe('pointerdown', cell(4)); pe('pointerup', window);
  out.E_click2 = J2([audio.loop, TO.slice(-1)[0]]);
  pe('pointerdown', cell(2)); pe('pointermove', cell(3)); pe('pointermove', cell(5)); pe('pointerup', window);
  out.E_drag = J2([audio.loop, sel, selRange, TO.slice(-1)[0]]);
  pe('pointerdown', cell(6), { shiftKey: true }); pe('pointerup', window, { shiftKey: true });
  out.E_shift = J2([audio.loop, sel, selRange]);
  out.E_cells = document.getElementById('mx-prog').innerHTML;
  setLoop(null);
  /* F Esc 在书写（无浮层）：不改谱、不报错 */
  { const j0 = JSON.stringify(song); out.F_esc = [kd('Escape'), JSON.stringify(song) === j0, ae()].join('|'); }
  /* G 不变量 */
  out.G_inv = J2({ flowNodes: document.querySelectorAll('[id^="flw-"],.flw-x,[data-flw-slot],.flw-mn,.flw-kchip,.flw-pvs').length,
    bodyFlw: [...document.body.classList].filter(c => /^fl(ow|w-)/.test(c)), mode: document.body.getAttribute('data-mode'),
    mounted: typeof FLOW === 'undefined' ? null : FLOW.mounted, pvTi: document.getElementById('pv-stage').getAttribute('tabindex') });
  out.G_keys = Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().join(',');
  out.G_flow = localStorage.getItem('musetab-flow');   /* v68.2：旧外壳（?shell=classic）为 '0'，基线默认外壳为 null——对拍时不比，M23a 单独断言 */
  function J2(x) { return JSON.stringify(x); }
  out.toasts = TO.join(' ‖ ');
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const OUT = {};
  let pass = 0, total = 0;
  const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + d : '')); };
  const NOTE = (id, s) => (OUT[id] = OUT[id] || []).push(s);
  const prep = (pg, theme) => pg.evaluate(th => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    if (th) document.documentElement.dataset.theme = th;
    window.__toasts = []; try { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
    const st = document.createElement('style'); st.id = 'tv-md-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); }, theme || null);
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', hasTouch: !!o.touch, isMobile: !!o.mobile });
    ctx.setDefaultTimeout(6000);
    await ctx.addInitScript(INIT);
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push((o.tag || (w + 'x' + h)) + ' PAGEERR:' + e.message));
    await pg.goto(o.url || FLOWU); await pg.waitForTimeout(o.wait || 1200);
    await prep(pg, o.theme);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const EV = (pg, fn, a) => pg.evaluate(fn, a);
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const scn = async (pg, k, o) => { const r = await pg.evaluate(([k, o]) => __scn(k, o), [k, o || {}]); await wait(pg, 150); return r; };
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const pool = async (jobs, n) => { const q = jobs.slice(); const run1 = async () => { while (q.length) { const j = q.shift(); await j(); } }; await Promise.all(Array.from({ length: n }, run1)); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', String(e && e.message || e).split('\n')[0]); } };
  const mode = pg => EV(pg, () => ({ cur: FLOW.mode.cur, dm: document.body.dataset.mode, pv: document.getElementById('preview-ov').classList.contains('on') }));
  /* 真实点模式条（1280 起模式条可见；<1280 走「书写 ▾」菜单） */
  const clickMode = async (pg, m) => {
    const vis = await EV(pg, () => __vis('#flw-modes'));
    if (vis) await pg.click('#flw-mode-' + m);
    else { await pg.click('#flw-mdd'); await wait(pg, 150); await pg.click('#popmenu [data-fa="mode:set"][data-v="' + m + '"]'); }
    await wait(pg, m === 'write' ? 250 : 450);
  };
  /* v69.1 B：排版工具的点击——?next=0 在行 2 #flw-eng；新形态纸张在悬浮条「A4 ▾」菜单里、疏密 / 每行 ± 在悬浮条、
     换行 / 并入 / 锁定在行工具条 #flw-rowt、内容大小 ± 在右栏「版式」页（同 id / data-fa 搬家，取屏上那一枚） */
  const engSel = (fa, k, v) => '[data-fa="' + fa + '"]' + (k ? '[data-' + k + '="' + v + '"]' : '');
  const engClick = async (pg, fa, k, v) => {
    const s = engSel(fa, k, v);
    if (await EV(pg, s => __vis('#flw-eng ' + s), s)) return pg.click('#flw-eng ' + s);
    if (fa === 'lay:page') { await pg.click('#flw-sb-page'); await wait(pg, 150); return pg.click('#popmenu ' + s); }
    return pg.click(s + ' >> visible=true');
  };
  const jobs = [];

  /* —— 数据红线（每个用例的开头记基线，结尾比；最后汇总成两条 RL）—— */
  const literalKeys = txt => new Set((String(txt || '').match(/musetab-[a-z0-9-]+/g) || []));
  const refSrc = (() => {
    const e = process.env.MUSETAB_REF;
    if (e === 'none') return null;
    try { if (e) return fs.readFileSync(e.startsWith('file://') ? e.slice(7) : path.resolve(e), 'utf8');
      return cp.execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (_) { return null; }
  })();
  const refURL = (() => { if (!refSrc) return null; if (process.env.MUSETAB_REF) { const e = process.env.MUSETAB_REF; return e.startsWith('file://') ? e : 'file://' + path.resolve(e); }
    const f = path.join(os.tmpdir(), 'tv_modes_ref_' + REF_COMMIT.slice(0, 12) + '.html'); fs.writeFileSync(f, refSrc); return 'file://' + f; })();
  const curSrc = (() => { try { return fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8'); } catch (_) { return ''; } })();
  /* 基线已有的键名：基线提交源码里的 musetab-* 字面量 ∪ v67.9 / v68.0 flow 键；拿不到基线时退回被测源码里除本版新键以外的字面量（打 ⚠️） */
  const KNOWN = refSrc ? new Set([...literalKeys(refSrc), ...PREV_FLOW_KEYS]) : new Set([...literalKeys(curSrc)].filter(k => !NEW_KEYS.includes(k)));
  const known = k => KNOWN.has(k) || [...KNOWN].some(p => p.endsWith('-') && k.startsWith(p));
  const RLF = [], RLK = [];
  const redBase = pg => EV(pg, () => ({ f: __fields(), k: __keys() }));
  const redEnd = async (id, pg, base, allowF) => {
    const now = await redBase(pg);
    const nf = now.f.filter(x => !base.f.includes(x)), badF = nf.filter(x => !(allowF || []).includes(x));
    const nk = now.k.filter(x => !base.k.includes(x)), badK = nk.filter(k => !known(k) && !NEW_KEYS.includes(k));
    RLF.push({ id, ok: !badF.length, d: id + (nf.length ? ' 新字段 ' + nf.join(',') : '') + (badF.length ? ' ✗' + badF.join(',') : '') });
    RLK.push({ id, ok: !badK.length, d: id + (nk.length ? ' 新键 ' + nk.join(',') : '') + (badK.length ? ' ✗' + badK.join(',') : '') });
  };

  /* ================= M1 打开即书写、模式不落盘 ================= */
  if (want('M1')) jobs.push(() => SAFE('M1', 'M1', async () => {
    const pg = await open(1280, 800, { tag: 'M1' });
    const a = await EV(pg, () => ({ dm: document.body.dataset.mode, cur: FLOW.mode.cur, sel: (document.getElementById('flw-mode-write') || {}).getAttribute && document.getElementById('flw-mode-write').getAttribute('aria-selected'),
      keys: __keys().filter(k => /mode|step/i.test(k)) }));
    await scn(pg, 'songbie'); const base = await redBase(pg);
    await clickMode(pg, 'engrave');
    const b1 = await EV(pg, () => ({ dm: document.body.dataset.mode, keys: __keys(), ls: Object.keys(localStorage).filter(k => /mode/i.test(k) || /engrave/.test(localStorage.getItem(k) || '')).filter(k => /^musetab-/.test(k)) }));
    await redEnd('M1', pg, base, []);
    await pg.reload(); await wait(pg, 1200); await prep(pg);
    const c = await EV(pg, () => ({ dm: document.body.dataset.mode, cur: FLOW.mode.cur, pv: document.getElementById('preview-ov').classList.contains('on') }));
    T('M1', a.dm === 'write' && a.cur === 'write' && a.sel === 'true' && !a.keys.length,
      'M1a 一打开即 body[data-mode]=write、FLOW.mode.cur=write、模式条「书写」aria-selected；没有任何与模式相关的 musetab-* 键', J(a));
    T('M1', b1.dm === 'engrave' && !b1.ls.length && c.dm === 'write' && c.cur === 'write' && !c.pv,
      'M1b 进排版不写本机键（没有值含 engrave 的 musetab-* 键）；刷新后回到书写、预览不开（模式不落盘）', J({ b1: b1.ls, reload: c }));
    await close(pg);
  }));

  /* ================= M2 排版 / 输出主视图几何 + 弹窗层级 ================= */
  /* v69.1 D5（A）：新形态 1440 也是竖条（52），预览右缘＝竖条左缘；?next=0 的 1440 停靠 264 原断言照留 */
  /* v69.1 B 迁移（规格 §4 B1.1 / B2.2 / §6.2 M2）：新形态排版 / 输出时悬浮条在预览顶（条顶＝行 2 底 84、条底＝预览顶、左右缘＝预览左右缘），
     输出模式右栏不出页、竖条与右栏隐藏 → 预览右缘＝视口右缘；?next=0 跑原断言（顶 84、右缘＝右栏 / 竖条左缘） */
  if (want('M2')) for (const nx0 of [true, false]) for (const [w, h] of [[1280, 800], [1440, 900]]) jobs.push(() => SAFE('M2', 'M2 ' + w + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(w, h, { tag: 'M2-' + w + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const rows = [];
    for (const m of ['engrave', 'output']) {
      await clickMode(pg, m);
      rows.push(await EV(pg, m => { const pv = __R('#preview-ov'), lf = __R('#flw-left'), rd = __R('#right-dock'), rs = __R('#flw-rstrip');
        const dock = document.body.classList.contains('flw-rd'), R = dock ? rd.x : rs.x;
        const sb = __R('#flw-sbar');
        return { m, pv: [pv.x, pv.y, pv.r, pv.b], vis: pv.vis, lfR: lf.r, R, dock, ih: innerHeight, iw: innerWidth, bar: __vis('#pv-bar'), z: getComputedStyle(document.getElementById('preview-ov')).zIndex,
          pages: document.querySelectorAll('#pv-pages .pv-page').length, mode: FLOW.mode.cur, sb: sb && [sb.x, sb.y, sb.r, sb.b, sb.vis] }; }, m));
      await shot(pg, 'M2-' + w + '-' + m + (nx0 ? '-nx0' : ''));
    }
    const ok = nx0 ? r => r.vis && r.mode === r.m && Math.abs(r.pv[0] - r.lfR) <= 1 && Math.abs(r.pv[1] - 84) <= 1 && Math.abs(r.pv[3] - (r.ih - 32)) <= 1 && Math.abs(r.pv[2] - r.R) <= 1 && !r.bar && r.pages >= 1 && !(r.sb && r.sb[4])
      : r => r.vis && r.mode === r.m && Math.abs(r.pv[0] - r.lfR) <= 1 && !!r.sb && r.sb[4] && Math.abs(r.sb[1] - 84) <= 1 && Math.abs(r.pv[1] - r.sb[3]) <= 1 && Math.abs(r.sb[0] - r.pv[0]) <= 1 && Math.abs(r.sb[2] - r.pv[2]) <= 1
        && Math.abs(r.pv[3] - (r.ih - 32)) <= 1 && Math.abs(r.pv[2] - (r.m === 'output' ? r.iw : r.R)) <= 1 && !r.bar && r.pages >= 1;
    const dk = !!nx0 && w >= 1440;   /* v69.1 D5：新形态任何宽度右栏默认竖条 */
    T('M2', rows.every(ok) && rows.every(r => r.dock === dk),
      'M2a ' + w + '×' + h + (nx0 ? ' ?next=0' : '') + ' 排版 / 输出：#preview-ov 左缘＝#flw-left 右缘、' + (nx0 ? '顶 84（悬浮条不出）' : '悬浮条顶 84、条底＝预览顶、条左右缘＝预览左右缘') + '、底＝innerHeight−32、右缘＝'
        + (nx0 ? (dk ? '右栏（停靠 264）' : '竖条') + '左缘' : '排版竖条（D5）左缘 / 输出视口右缘（右栏无页）') + '（±1）；#pv-bar 不可见；预览有页', J(rows));
    /* 弹窗层级：排版模式「页头与页码…」→ 右栏「页头 · 页码」区的「页头」（＝#b-meta）开曲谱信息弹窗，弹窗中心点命中 .modal（不被嵌入预览盖住）。
       v68.5 有意改动（规格 §12.3）：工具组键先打开右栏这一区（页码在这里设），页头再点区里的「页头」行 */
    await clickMode(pg, 'engrave');
    const mv = await EV(pg, () => __vis('#flw-eng-meta'));
    if (mv) { await pg.click('#flw-eng-meta'); await wait(pg, 250); await pg.click('#flw-lay-hdpn [data-fa="lay:hd"]'); }
    else await EV(pg, () => document.getElementById('b-meta').click());
    await wait(pg, 300);
    const md = await EV(pg, () => { const m = document.querySelector('#modal-mask .modal'); if (!m) return null; const r = m.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), t2 = document.elementFromPoint(r.left + 12, r.top + 12);
      return { inModal: !!(t && t.closest('.modal')), corner: !!(t2 && t2.closest('.modal')), zMask: getComputedStyle(document.getElementById('modal-mask')).zIndex, zPv: getComputedStyle(document.getElementById('preview-ov')).zIndex, mode: FLOW.mode.cur }; });
    await shot(pg, 'M2-' + w + '-modal');
    T('M2', !!md && md.inModal && md.corner && md.mode === 'engrave' && +md.zPv < +md.zMask,
      'M2b ' + w + (nx0 ? ' ?next=0' : '（新形态：行 2 无此键，程序化 #b-meta）') + ' 排版模式点「页头与页码…」→ 右栏「页头」' + (mv ? '（真实点击）' : '（行 2 收纳，程序化 #b-meta）') + '：曲谱信息弹窗中心与左上角 elementFromPoint 都落在 .modal 内；预览 z < 遮罩 z；模式不变', J(md));
    await EV(pg, () => { try { closeModal(); } catch (_) {} });
    await clickMode(pg, 'write');
    await redEnd('M2', pg, base, []);
    await close(pg);
  }));

  /* ================= M3 选区与滚动不变 ================= */
  if (want('M3')) jobs.push(() => SAFE('M3', 'M3', async () => {
    const pg = await open(1280, 800, { tag: 'M3' });
    await scn(pg, 'long', { mi: 5, ci: 1 }); const base = await redBase(pg);
    const s0 = await EV(pg, () => { const w = document.getElementById('score-wrap'); w.scrollTop = Math.min(420, w.scrollHeight - w.clientHeight - 10); return { sel: J2(sel), st: w.scrollTop, sl: w.scrollLeft, max: w.scrollHeight - w.clientHeight }; });
    await wait(pg, 150);
    await clickMode(pg, 'engrave'); const m1 = await mode(pg);
    await clickMode(pg, 'output'); const m2 = await mode(pg);
    await clickMode(pg, 'write');
    const s1 = await EV(pg, () => { const w = document.getElementById('score-wrap'); return { sel: J2(sel), st: w.scrollTop, sl: w.scrollLeft, cur: FLOW.mode.cur }; });
    T('M3', s0.st > 100 && m1.cur === 'engrave' && m2.cur === 'output' && s1.cur === 'write' && s1.sel === s0.sel && Math.abs(s1.st - s0.st) <= 1 && Math.abs(s1.sl - s0.sl) <= 1,
      'M3 sel.mi=5、#score-wrap 滚到 ' + s0.st + '：真实点 排版 → 输出 → 书写 后 sel 逐字段相同、scrollTop / scrollLeft ±1', J({ s0, s1, m1: m1.cur, m2: m2.cur }));
    await redEnd('M3', pg, base, []);
    await close(pg);
  }));

  /* ================= M4 排版模式按 5 · 输入框不截键 ================= */
  if (want('M4')) jobs.push(() => SAFE('M4', 'M4', async () => {
    const pg = await open(1280, 800, { tag: 'M4' });
    await scn(pg, 'songbie');
    /* 第 3 小节里第一个不是 5 的音 */
    const at = await EV(pg, () => { const cs = song.measures[2].voxes[0]; const ci = cs.findIndex(c => c && c.deg && c.deg !== 5); sel = { mi: 2, row: 'vox', vi: 0, ci, si: 1 }; render(); return { mi: 2, ci, deg0: cs[ci].deg }; });
    const base = await redBase(pg);
    await clickMode(pg, 'engrave');
    const fe = await EV(pg, () => (document.activeElement || {}).id);
    await pg.keyboard.press('5'); await wait(pg, 350);
    const a = await EV(pg, at => ({ cur: FLOW.mode.cur, dm: document.body.dataset.mode, pv: document.getElementById('preview-ov').classList.contains('on'), deg: __colAt(at.mi, at.ci, 'vox', 0).deg, sel: [sel.mi, sel.ci] }), at);
    T('M4', fe === 'pv-stage' && a.cur === 'write' && a.dm === 'write' && !a.pv && a.deg === 5,
      'M4a 排版模式（焦点在预览区）按 5 → 回书写、预览关闭，刚落音的第 ' + (at.mi + 1) + ' 小节第 ' + (at.ci + 1) + ' 列 deg ' + at.deg0 + '→5（光标随后前进到 ' + J(a.sel) + '）', J({ fe, a }));
    await pg.keyboard.press('Control+z'); await wait(pg, 200);
    /* #i-tempo：状态栏的速度框，排版模式下照常输入 */
    await clickMode(pg, 'engrave');
    const tv = await EV(pg, () => ({ vis: __vis('#i-tempo'), v: document.getElementById('i-tempo').value }));
    if (tv.vis) await pg.click('#i-tempo', { clickCount: 3 }); else await EV(pg, () => { const i = document.getElementById('i-tempo'); i.focus(); i.select(); });
    await pg.keyboard.type('88'); await wait(pg, 150);
    const b1 = await EV(pg, () => ({ cur: FLOW.mode.cur, v: document.getElementById('i-tempo').value, ae: (document.activeElement || {}).id }));
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    const b2 = await EV(pg, () => ({ cur: FLOW.mode.cur, ae: (document.activeElement || {}).id || document.activeElement.tagName }));
    T('M4', tv.vis && b1.cur === 'engrave' && b1.v === '88' && b1.ae === 'i-tempo' && b2.cur === 'engrave' && b2.ae !== 'i-tempo',
      'M4b 排版模式真实点状态栏 #i-tempo 输入 88 → 不切模式、值变 88；输入框里 Esc 只失焦、仍在排版', J({ tv, b1, b2 }));
    await EV(pg, () => { try { setMode('write'); } catch (_) {} });
    await redEnd('M4', pg, base, []);
    await close(pg);
  }));

  /* ================= M5 Esc ================= */
  if (want('M5')) jobs.push(() => SAFE('M5', 'M5', async () => {
    const pg = await open(1280, 800, { tag: 'M5' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const r = [];
    for (const m of ['engrave', 'output']) {
      await clickMode(pg, m); const a = await mode(pg);
      await pg.keyboard.press('Escape'); await wait(pg, 250); const b2 = await mode(pg);
      r.push({ m, a, b: b2 });
    }
    const j0 = await EV(pg, () => J2(sel));
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    const c = await EV(pg, () => ({ cur: FLOW.mode.cur, dm: document.body.dataset.mode, pv: document.getElementById('preview-ov').classList.contains('on') }));
    T('M5', r.every(x => x.a.cur === x.m && x.a.pv && x.b.cur === 'write' && x.b.dm === 'write' && !x.b.pv) && c.cur === 'write' && !c.pv,
      'M5 Esc：排版 → 书写、输出 → 书写，预览关闭、data-mode=write；书写下再按 Esc 不改模式', J({ r, c, sel: j0 }));
    await redEnd('M5', pg, base, []);
    await close(pg);
  }));

  /* ================= M6 排版工具组（真实点击）+ Ctrl+Z 逐步复原 ================= */
  /* v69.1 B 迁移（规格 §4 B1.1 / B1.3 / §6.2 M6）：新形态纸张 / 疏密 / 每行 ± 在排版悬浮条（纸张走「A4 ▾」菜单）、换行 / 并入 / 锁定在行工具条（同 id），先断言条与工具条可见再点；
     ?next=0 跑原断言（行 2 #flw-eng） */
  if (want('M6')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M6', 'M6' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'M6' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await scn(pg, 'long');
    const j0 = await EV(pg, () => J2(song)); const base = await redBase(pg);
    await clickMode(pg, 'engrave');
    const g0 = await EV(pg, () => ({ n: PV.geo.n, page: (song.layout || {}).page || 'A4' }));
    const where = await EV(pg, () => ({ row2: __vis('#flw-eng'), sbar: __vis('#flw-sbar'), page: __vis('#flw-sb-page'), rowt: __vis('#flw-rowt') }));
    if (nx0 ? !where.row2 : !(where.sbar && where.page && where.rowt && !where.row2)) throw new Error('排版工具不在预期位置 ' + J(where));
    const cl = async (fa, k, v, ms) => { await engClick(pg, fa, k, v); await wait(pg, ms || 700); };
    await cl('lay:page', 'v', 'A3');
    const g1 = await EV(pg, nx0 => ({ page: song.layout && song.layout.page, n: PV.geo.n, pages: document.querySelectorAll('#pv-pages .pv-page').length,
      pressed: nx0 ? document.querySelector('#flw-eng [data-fa="lay:page"][data-v="A3"]').getAttribute('aria-pressed') : String(/^纸张 A3$/.test(document.getElementById('flw-sb-page').getAttribute('aria-label')) && /A3/.test(document.getElementById('flw-sb-page').textContent)) }), nx0);
    T('M6', g1.page === 'A3' && g1.n !== g0.n && g1.pages === g1.n && g1.pressed === 'true',
      'M6a ' + X + (nx0 ? '行 2「纸张 A3」' : '悬浮条「A4 ▾」→ 菜单「A3」') + ' → song.layout.page=A3、PV.geo.n ' + g0.n + '→' + g1.n + '（预览已重拍，页数＝.pv-page 数）、' + (nx0 ? '键按下态' : '条上读数「A3」'), J({ where, g0, g1 }));
    await cl('lay:preset', 'v', 'compact');
    const g2 = await EV(pg, () => ({ preset: song.layout && song.layout.preset }));
    T('M6', g2.preset === 'compact', 'M6b ' + X + (nx0 ? '行 2' : '悬浮条') + '「疏密 紧凑」→ song.layout.preset=compact', J(g2));
    /* 此处换行：取第一行里 ≥3 小节那一行的第 3 小节（不在行首），选中它（预览里单击＝FLOW.lay.pick 同一路径） */
    const pick = await EV(pg, () => { const rows = FLOW.lay.rowsNow(); const r = rows.find(x => x.n >= 3); if (!r) return null; FLOW.lay.pick(r.m1 + 2, 0); return { mi: r.m1 + 2, row: [r.m1, r.m2] }; });
    if (!pick) throw new Error('没有 ≥3 小节的行');
    const mi = pick.mi;
    await cl('lay:brk', null, null, 600);
    const g3 = await EV(pg, mi => ({ brk: song.measures[mi - 1].brk, pull: song.measures[mi].pull, starts: FLOW.lay.rowsNow().some(r => r.m1 === mi), ls: layoutSystems().some(s => s.measures[0].mi === mi), paged: __pagedRows().some(r => r[0] === mi) }), mi);
    T('M6', g3.brk === 1 && g3.pull == null && g3.starts && g3.ls && g3.paged,
      'M6c ' + X + '选中第 ' + (mi + 1) + ' 小节（第 ' + (pick.row[0] + 1) + '–' + (pick.row[1] + 1) + ' 小节那一行）点「此处换行」→ measures[' + (mi - 1) + '].brk=1，layoutSystems()（屏幕与分页两种口径）有一行从第 ' + (mi + 1) + ' 小节起', J(g3));
    await cl('lay:join', null, null, 600);
    const g4 = await EV(pg, mi => ({ pull: song.measures[mi].pull, brk: song.measures[mi - 1].brk, starts: FLOW.lay.rowsNow().some(r => r.m1 === mi) }), mi);
    T('M6', g4.pull === 1 && g4.brk == null && !g4.starts, 'M6d ' + X + '当前行（从第 ' + (mi + 1) + ' 小节起）点「并入上一行」→ measures[' + mi + '].pull=1、上一小节的 brk 清掉，不再有行从它起', J(g4));
    /* 锁定此行：选第 2 行，锁定后改疏密（宽松：小节自然宽变大），该行小节集合不变；另有别的行重排（证明改宽度真的起作用） */
    const lk = await EV(pg, () => { const rows = FLOW.lay.rowsNow(); const r = rows[1]; FLOW.lay.pick(r.m1, 0); return { m1: r.m1, m2: r.m2, all: rows.map(x => [x.m1, x.m2]) }; });
    await cl('lay:lock', null, null, 600);
    const g5 = await EV(pg, lk => ({ locked: sysRowLocked(lk.m1, lk.m2), pressed: document.getElementById('flw-eng-lock').getAttribute('aria-pressed'), lab: document.querySelector('#flw-eng-lock .flw-glb, #flw-eng-lock .flw-rtl').textContent }), lk);
    await cl('lay:preset', 'v', 'loose', 800);
    const g6 = await EV(pg, lk => { const rows = FLOW.lay.rowsNow(), r = rows.find(x => x.m1 === lk.m1); const pr = __pagedRows();
      return { preset: song.layout.preset, row: r ? [r.m1, r.m2] : null, paged: pr.find(x => x[0] === lk.m1) || null, all: rows.map(x => [x.m1, x.m2]), locked: sysRowLocked(lk.m1, lk.m2) }; }, lk);
    const pg6 = g6.paged ? [g6.paged[0], g6.paged[g6.paged.length - 1]] : null;
    T('M6', g5.locked && g5.pressed === 'true' && g6.preset === 'loose' && g6.locked && J(g6.row) === J([lk.m1, lk.m2]) && J(pg6) === J([lk.m1, lk.m2]) && J(g6.all) !== J(lk.all),
      'M6e ' + X + '第 2 行（第 ' + (lk.m1 + 1) + '–' + (lk.m2 + 1) + ' 小节）点「锁定此行」→ sysRowLocked、键按下「' + g5.lab + '」；再点「宽松」改宽度：该行小节集合不变（屏幕与分页口径），别的行已重排', J({ g5, g6: { row: g6.row, paged: pg6, rowsBefore: lk.all.length, rowsAfter: g6.all.length } }));
    await shot(pg, 'M6-engrave-1440' + (nx0 ? '-nx0' : ''));
    /* Ctrl+Z 逐步复原：A3 · 紧凑 · 换行 · 并入 · 锁定 · 宽松 共 6 步 */
    await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    const steps = [];
    for (let i = 0; i < 6; i++) { await pg.keyboard.press('Control+z'); await wait(pg, 250); steps.push(await EV(pg, () => ((song.layout || {}).page || '-') + '/' + ((song.layout || {}).preset || '-'))); }
    await wait(pg, 400);
    const g7 = await EV(pg, j0 => ({ same: J2(song) === j0, cur: FLOW.mode.cur, perf: FLOW.mode.perf }), j0);
    T('M6', g7.same && g7.cur === 'engrave', 'M6f ' + X + '排版模式 Ctrl+Z 6 次逐步复原（纸张 / 疏密走 #layout-pop 撤销点，换行 / 并入 / 锁定走 mutate）→ JSON.stringify(song) 回到初值、不切模式', J({ steps, cur: g7.cur }));
    NOTE('M6', '   ℹ️  R1 快照耗时（64 小节）：进入 ' + J(g7.perf.open) + ' · 刷新 ' + J(g7.perf.refresh));
    await clickMode(pg, 'write');
    await redEnd('M6', pg, base, ['S.layout', 'L.page', 'L.preset', 'L.scale', 'M.brk', 'M.pull']);
    await close(pg);
  }));

  /* ================= M7 版面检查 ================= */
  if (want('M7')) jobs.push(() => SAFE('M7', 'M7', async () => {
    const pg = await open(1440, 900, { tag: 'M7' });
    await scn(pg, 'long'); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 300);
    /* v69.1 B 迁移（规格 §4 B1.2）：新形态摘要拆成三枚读数「n 页」「m 行」「每行 …」（不成说明句）；?next=0 仍是「共 n 页 · m 行」——两种写法都按数字比 */
    const a = await EV(pg, () => { const sum = (document.querySelector('#flw-lay-rep .flw-lrsum') || {}).textContent || '', m = sum.match(/共\s*(\d+)\s*页\s*·\s*(\d+)\s*行/) || sum.match(/^\s*(\d+)\s*页\s*(\d+)\s*行/);
      const R = FLOW.mode.layReport(), pr = __pagedRows();
      const items = [...document.querySelectorAll('#flw-lay-rep [data-fa="lay:pg"]')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
      return { sum, pages: m ? +m[1] : null, rows: m ? +m[2] : null, geoN: PV.geo.n, pvPages: document.querySelectorAll('#pv-pages .pv-page').length, pr: pr.length,
        per: R && R.per.join(','), prPer: pr.map(x => x.length).join(','), items, ranges: R && R.pageRanges.map(p => p.rows ? '第 ' + (p.pg + 1) + ' 页 第 ' + (p.a + 1) + (p.b > p.a ? '–' + (p.b + 1) : '') + ' 小节 · ' + p.rows + ' 行' : '空页'),
        vis: __vis('#flw-lay-rep'), issues: R ? R.issues.map(x => x.k + ':' + x.mi) : null }; });
    T('M7', a.vis && a.pages === a.geoN && a.pages === a.pvPages && a.pages >= 2 && a.rows === a.pr && a.per === a.prPer && a.items.length === a.pages && a.items.every((t, i) => t.replace(/\s/g, '') === a.ranges[i].replace(/\s/g, '')),
      'M7a 左栏版面检查「共 ' + a.pages + ' 页 · ' + a.rows + ' 行」＝PV.geo.n（＝.pv-page 数）/ 分页 layoutSystems().length；每行小节数一致；「页面」区每页一行「第 n 页 · 第 a–b 小节」', J({ sum: a.sum, geoN: a.geoN, pr: a.pr, per: a.per, items: a.items.slice(0, 3) }));
    await shot(pg, 'M7-layrep-1440');
    /* 点「第 2 页」：第 2 页顶进入 #pv-stage 可视区 */
    const before = await EV(pg, () => { const ps = document.getElementById('pv-stage'), p2 = document.querySelectorAll('#pv-pages .pv-page')[1], r = ps.getBoundingClientRect(), q = p2.getBoundingClientRect();
      return { st: ps.scrollTop, in: q.top >= r.top - 1 && q.top < r.bottom }; });
    await pg.click('#flw-lay-rep [data-fa="lay:pg"][data-pg="1"]'); await wait(pg, 250);
    const after = await EV(pg, () => { const ps = document.getElementById('pv-stage'), p2 = document.querySelectorAll('#pv-pages .pv-page')[1], r = ps.getBoundingClientRect(), q = p2.getBoundingClientRect();
      return { st: ps.scrollTop, top: Math.round(q.top), sT: Math.round(r.top), sB: Math.round(r.bottom), in: q.top >= r.top - 1 && q.top < r.bottom }; });
    T('M7', after.in && after.st !== before.st, 'M7b 点「第 2 页」→ 第 2 页 .pv-page 顶进入 #pv-stage 可视区（滚动 ' + before.st + '→' + after.st + '）', J({ before, after }));
    /* 版面提示（若有）或第 1 页：点一项 → sel.mi＝该行首小节，回书写光标落在那里 */
    const iss = await EV(pg, () => { const b2 = document.querySelector('#flw-lay-rep [data-fa="lay:go"]'); return b2 ? { mi: +b2.dataset.mi, k: b2.dataset.k, t: b2.textContent.trim() } : null; });
    if (iss) {
      await pg.click('#flw-lay-rep [data-fa="lay:go"]'); await wait(pg, 250);
      const s1 = await EV(pg, () => ({ mi: sel.mi, cur: FLOW.mode.cur }));
      await clickMode(pg, 'write');
      const s2 = await EV(pg, () => { const cb = __curBox(); return { mi: sel.mi, ci: sel.ci, cur: FLOW.mode.cur, inView: cb && cb.top >= cb.vT - 1 && cb.bot <= cb.vB + 1 }; });
      T('M7', s1.mi === iss.mi && s1.cur === 'engrave' && s2.mi === iss.mi && s2.ci === 0 && s2.cur === 'write' && s2.inView,
        'M7c 点版面提示「' + iss.t.slice(0, 18) + '」→ 仍在排版、sel.mi＝第 ' + (iss.mi + 1) + ' 小节；回书写光标落在那里并在可视区内', J({ iss, s1, s2 }));
    } else NOTE('M7', '   ℹ️  M7c 本谱版面检查没有提示项（无单小节行 / 末行够长 / 无单行页 / 无跨页行），跳过「点提示落光标」');
    await redEnd('M7', pg, base, []);
    await close(pg);
  }));

  /* ================= M8 输出工具组 = 弹窗同一组动作与事件 ================= */
  /* v69.1 B 迁移（规格 §4 B2.1 / B2.2 / §6.2 M8）：新形态 7 个导出键是左栏格式卡（同 id、同 data-fa、同 EXPORT_ACT 调用与事件），「分谱」是悬浮条「总谱 | 分谱」分段（同 id #flw-out-parts）；
     ?next=0 跑原断言（行 2 #flw-out） */
  if (want('M8')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M8', 'M8' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'M8' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    const X = nx0 ? '（?next=0 行 2）' : '（新形态：左栏格式卡 + 悬浮条分谱段）';
    await scn(pg, 'songbie'); const base = await redBase(pg);
    await EV(pg, () => { window.__EV = [];
      try { pyqEvent = function (n) { __EV.push('ev:' + n); }; } catch (_) {}
      ['exportPNG', 'exportShareCard', 'exportInteractiveCard', 'downloadMusicXML', 'downloadMIDI', 'exportSong'].forEach(f => { window[f] = function () { __EV.push('fn:' + f + '(' + [...arguments].join(',') + ')'); }; });
      const sp = setPrintPage; setPrintPage = function (s) { __EV.push('setPrintPage(' + s + ')'); return sp.apply(this, arguments); };
      window.print = () => __EV.push('print'); });
    await clickMode(pg, 'output');
    const take = () => EV(pg, () => { const r = __EV.join(' '); __EV.length = 0; return r; });
    const KEYS = [['png', 'ex-png'], ['card', 'ex-card'], ['icard', 'ex-icard'], ['mxl', 'ex-mxl'], ['mid', 'ex-mid'], ['mtab', 'ex-mtab'], ['print', 'ex-print']];
    const res = [];
    for (const [k, ex] of KEYS) {
      const s = '#flw-out-' + k, vis = await EV(pg, s => __vis(s), s);
      await take(); if (vis) await pg.click(s); await wait(pg, 260); const a = await take();
      await EV(pg, () => document.getElementById('b-print').click()); await wait(pg, 60);
      await take(); await EV(pg, ex => document.getElementById(ex).click(), ex); await wait(pg, 260); const m = (await take()).replace(/ ?closeModal/g, '');
      res.push({ k, vis, flow: a, modal: m, home: await EV(pg, s => { const e = document.querySelector(s); return e ? (e.closest('#flw-out-fmt') ? 'fmt' : e.closest('#editbar') ? 'row2' : e.closest('#flw-sbar') ? 'sbar' : '?') : null; }, s) });
      await EV(pg, () => { try { closeModal(); } catch (_) {} });
    }
    const FN = { png: 'fn:exportPNG(2)', card: 'fn:exportShareCard()', icard: 'fn:exportInteractiveCard()', mxl: 'fn:downloadMusicXML()', mid: 'fn:downloadMIDI()', mtab: 'fn:exportSong()', print: 'print' };
    T('M8', res.every(r => r.vis && r.home === (nx0 ? 'row2' : 'fmt') && r.flow === r.modal && r.flow.includes(FN[r.k])) && /setPrintPage\(A4\) print/.test(res.find(r => r.k === 'print').flow),
      'M8a ' + X + '输出 7 键（打印 / PNG / 分享卡 / 互动谱 / MusicXML / MIDI / 曲谱文件）真实点击：调用与 pyqEvent 事件名和「打印 / 导出」弹窗对应按钮逐个相同（打印＝setPrintPage(A4) 后 print）',
      res.map(r => r.k + '@' + r.home + '「' + r.flow + '」' + (r.flow === r.modal ? '' : ' ≠ 弹窗「' + r.modal + '」')).join('；'));
    const pt = await EV(pg, () => { const e = document.getElementById('flw-out-parts'); return e ? { dis: e.getAttribute('aria-disabled'), vis: __vis(e), why: e.dataset.why || e.title, home: e.closest('#flw-sbar') ? 'sbar' : e.closest('#editbar') ? 'row2' : '?' } : null; });
    await take(); if (pt && pt.vis) await pg.click('#flw-out-parts', { force: true }); await wait(pg, 200);
    const pa = await take();
    /* v68.2 收尾 NU-2：说明文案由「下一批」（内部排期用语）改为对用户的「即将推出」，并且不得出现内部用语
       v68.6 有意迁移（规格 docs/spec-2026-10-parts.md §6.5）：分谱上线，键名「分谱」；《送别》只有一位演奏者——仍灰显、点了不导出也不记事件，
       原因从「…即将推出」改为「只有一位演奏者」（修前 v68.5：why＝「按演奏者出分谱：即将推出…」→ 本条红；修后绿） */
    T('M8', !!pt && pt.dis === 'true' && pt.vis && pt.home === (nx0 ? 'row2' : 'sbar') && !/fn:|print|ev:/.test(pa) && /只有一位演奏者/.test(pt.why) && !/即将推出|下一批|拍板|负责人/.test(pt.why), 'M8b ' + X + '「分谱」aria-disabled、原因「只有一位演奏者」（不写「即将推出」「下一批」等），点了不导出也不记事件', J({ pt, pa }));
    await shot(pg, 'M8-output-1440' + (nx0 ? '-nx0' : ''));
    await clickMode(pg, 'write');
    await redEnd('M8', pg, base, []);
    await close(pg);
  }));

  /* ================= M9 发布 2 步（1280 竖条档）================= */
  /* v69.1 B 迁移（规格 §4 B2.3 / §6.2 M9）：新形态行 1「发布」不切模式、就地出三点进度弹层 #flw-pubp，第 2 次点主动作 #flw-pubp-go＝存入并提交（本机演示：记一条发布、开创作者中心）；
     仍 2 次点击、location.href 不变、模式不变。?next=0 跑原断言（切输出 → 右栏发布卡 #flw-pub-go → 发布浮层） */
  if (want('M9')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M9', 'M9' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1280, 800, { tag: 'M9' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const h0 = await EV(pg, () => ({ href: location.href, lib: __keys().includes('musetab-library-v1') ? (JSON.parse(localStorage.getItem('musetab-library-v1') || '[]') || []).length : 0, id: song.id || null }));
    let clicks = 0;
    await pg.click('#flw-pub'); clicks++; await wait(pg, 450);
    if (nx0) {
      const a = await EV(pg, () => ({ cur: FLOW.mode.cur, page: FLOW.rd.page(), ro: document.body.classList.contains('flw-ro'), go: __R('#flw-pub-go'), ae: (document.activeElement || {}).id, id: song.id || null,
        pv: document.getElementById('preview-ov').classList.contains('on') }));
      await shot(pg, 'M9-pubcard-1280-nx0');
      await pg.click('#flw-pub-go'); clicks++; await wait(pg, 450);
      const c = await EV(pg, () => ({ id: song.id || null, lib: (JSON.parse(localStorage.getItem('musetab-library-v1') || '[]') || []).length, t: ((document.querySelector('#popmenu .t') || {}).textContent || ''), href: location.href, cur: FLOW.mode.cur }));
      await shot(pg, 'M9-published-1280-nx0');
      T('M9', a.cur === 'output' && a.page === 'pub' && a.ro && a.go && a.go.vis && a.ae === 'flw-pub-go' && a.pv && !a.id,
        'M9a（?next=0）未入库窗口点行 1「发布」（第 1 次点击）→ 输出模式、右栏竖条浮出「发布与导出」页、发布卡按钮可见并聚焦，尚未存入', J(a));
      T('M9', clicks === 2 && !!c.id && c.lib === h0.lib + 1 && /发布《/.test(c.t) && c.href === h0.href && c.cur === 'output',
        'M9b（?next=0）点「存入并提交发布」（第 2 次点击）→ song.id 有值、我的曲谱 +1、#popmenu .t 含「发布《」；全程 location.href 不变', J({ h0, c, clicks }));
    } else {
      const a = await EV(pg, () => { const p = document.getElementById('flw-pubp'), ol = p && p.querySelector('.flw-pbst');
        return { cur: FLOW.mode.cur, pop: __vis('#flw-pubp'), go: __R('#flw-pubp-go'), ae: (document.activeElement || {}).id, id: song.id || null, st: ol && ol.getAttribute('aria-label'),
          pv: document.getElementById('preview-ov').classList.contains('on'), card: !!document.getElementById('flw-pub-go') }; });
      await shot(pg, 'M9-pubpop-1280');
      await EV(pg, () => { window.__m9doc = 1; });
      await pg.click('#flw-pubp-go'); clicks++; await wait(pg, 450);
      /* 本机演示提交后照原 pubSubmit 打开创作者中心（openPersonal 只 pushState ?pc=creator，不换页）——比文档没换（页内标记还在）与路径不变 */
      const c = await EV(pg, () => ({ id: song.id || null, lib: (JSON.parse(localStorage.getItem('musetab-library-v1') || '[]') || []).length, pubs: circlePubs().filter(x => x.libId === song.id).length,
        toast: (__toasts || []).slice(-1)[0] || '', href: location.href, path: location.pathname, doc: window.__m9doc === 1, cur: FLOW.mode.cur, pc: !!document.getElementById('pcenter') }));
      await shot(pg, 'M9-published-1280');
      T('M9', a.cur === 'write' && a.pop && a.go && a.go.vis && a.ae === 'flw-pubp-go' && !a.pv && !a.id && !a.card && /第 1 步/.test(a.st || ''),
        'M9a（新形态）未入库窗口点行 1「发布」（第 1 次点击）→ 不切模式、就地出发布进度弹层（读屏「' + a.st + '」）、主动作可见并聚焦，尚未存入；右栏发布卡不建', J(a));
      T('M9', clicks === 2 && !!c.id && c.lib === h0.lib + 1 && c.pubs === 1 && /已记录发布/.test(c.toast) && c.doc && c.path === new URL(h0.href).pathname && c.pc && c.cur === 'write',
        'M9b（新形态）点弹层主动作（第 2 次点击）→ 先存入（song.id 有值、我的曲谱 +1）再提交（本机演示记一条发布、提示「已记录发布…」、照原样打开创作者中心）；全程不换页（同一文档、路径不变）、模式不变', J({ h0, c, clicks }));
    }
    await EV(pg, () => { try { closePop(); } catch (_) {} try { if (document.getElementById('pcenter')) pcxBack(); } catch (_) {} try { setMode('write'); } catch (_) {} });
    await redEnd('M9', pg, base, ['S.id', 'S.updatedAt', 'S.savedAt', 'S.createdAt']);
    await close(pg);
  }));

  /* ================= M10 右栏 属性 / 文字 / 智能 ================= */
  if (want('M10')) jobs.push(() => SAFE('M10', 'M10', async () => {
    const pg = await open(1440, 900, { tag: 'M10', init: PIN });   /* v69.1 D5：新形态默认竖条，本用例借停靠的右栏测页内容 → 钉住 */
    await scn(pg, 'songbie', { mi: 1 }); const base = await redBase(pg);
    /* v68.7 S1 迁移（规格 B5 / R13）：新外壳 #cursor-info 的「列 第 c / n」换成拍位「拍 第 b / B」（b＝FLOW.st.pos().beat，与状态栏同口径）→ 断言改读拍位；旧外壳那一行逐字不动（不在本用例）。
       修前红修后绿：改前写「列第 c / n」，没有「拍第 b /」 */
    const ci0 = await EV(pg, () => ({ page: FLOW.rd.page(), in: !!document.querySelector('#flw-rp-prop #cursor-info'), vis: __vis('#cursor-info'), t: document.getElementById('cursor-info').textContent, sel: [sel.mi, sel.ci], bt: FLOW.st.pos().beat }));
    await pg.keyboard.press('ArrowRight'); await wait(pg, 200);
    const ci1 = await EV(pg, () => ({ t: document.getElementById('cursor-info').textContent, sel: [sel.mi, sel.ci], bt: FLOW.st.pos().beat }));
    const has = (t, s, bt) => t.indexOf('小节第 ' + (s[0] + 1) + ' /') >= 0 && t.indexOf('拍第 ' + bt + ' /') >= 0 && t.indexOf('列第') < 0;
    T('M10', ci0.page === 'prop' && ci0.in && ci0.vis && ci1.t !== ci0.t && has(ci0.t, ci0.sel, ci0.bt) && has(ci1.t, ci1.sel, ci1.bt) && ci1.sel[1] === ci0.sel[1] + 1 && ci1.bt > ci0.bt,
      'M10a 右栏默认「属性」页，#cursor-info 搬入且可见；→ 键后随光标更新（第 ' + (ci1.sel[0] + 1) + ' 小节第 ' + ci1.bt + ' 拍；v68.7 新外壳读拍位不读列）', J({ ci0: ci0.t.slice(0, 40), ci1: ci1.t.slice(0, 40) }));
    /* 已加记号：记号面板点「延长号」→ 芯片出现、与 curCol 一致；点 × → 清掉 */
    const at = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, ferm: !!curCol().ferm }));
    await pg.click('#flw-pgrid .flw-sg[data-v="fermata"]'); await wait(pg, 250);
    const m1 = await EV(pg, at => { const c = __colAt(at.mi, at.ci, 'vox', 0); const marks = FLOW.rdp.marks();
      const want = []; if (c.ferm) want.push('fermata'); if (c.artic === 'stacc') want.push('staccato'); if (c.dyn) want.push('@dyn');
      return { ferm: !!c.ferm, marks, want, chip: __vis('#flw-rx-mk [data-fa="rdp:unmark"][data-v="fermata"]') }; }, at);
    await pg.click('#flw-rx-mk [data-fa="rdp:unmark"][data-v="fermata"]'); await wait(pg, 250);
    const m2 = await EV(pg, at => ({ ferm: !!__colAt(at.mi, at.ci, 'vox', 0).ferm, marks: FLOW.rdp.marks() }), at);
    T('M10', !at.ferm && m1.ferm && m1.chip && m1.want.every(x => m1.marks.includes(x)) && !m2.ferm && !m2.marks.includes('fermata'),
      'M10b 左栏点「延长号」→ 第 ' + (at.mi + 1) + ' 小节第 ' + (at.ci + 1) + ' 列 ferm、右栏「已加记号」出现延长号芯片（与 curCol 读到的记号一致）；点芯片 × → ferm 清掉、芯片消失', J({ m1, m2 }));
    /* 文字页：＋ 加一段 → ② 切 activeLyr → ① 切回 */
    await pg.click('#flw-rpt-text'); await wait(pg, 200);
    const t0 = await EV(pg, () => ({ page: FLOW.rd.page(), n: song.lyricLines, al: activeLyr, chips: document.querySelectorAll('#flw-rp-text .chip[data-k="ll"]').length }));
    await pg.click('#flw-rp-text .chip[data-k="ll+"]'); await wait(pg, 250);
    await pg.click('#flw-rp-text .chip[data-k="ll"][data-idx="1"]'); await wait(pg, 200);
    const t1 = await EV(pg, () => ({ n: song.lyricLines, al: activeLyr, pr: document.querySelector('#flw-rp-text .chip[data-k="ll"][data-idx="1"]').getAttribute('aria-pressed') }));
    await pg.click('#flw-rp-text .chip[data-k="ll"][data-idx="0"]'); await wait(pg, 200);
    const t2 = await EV(pg, () => ({ al: activeLyr }));
    T('M10', t0.page === 'text' && t0.n === 1 && t0.chips === 1 && t1.n === 2 && t1.al === 1 && t1.pr === 'true' && t2.al === 0,
      'M10c 文字页（真实点页签）：「＋」加一段 lyricLines 1→2，点 ② → activeLyr=1（aria-pressed），点 ① → 0', J({ t0, t1, t2 }));
    await pg.keyboard.press('Control+z'); await wait(pg, 200);
    await redEnd('M10', pg, base, ['C.ferm']);   /* 下面换窗口（钢琴伴奏 / 吉他弹唱），各自重取基线 */
    /* v69.0 S2 迁移（D4 / P4）：右栏「智能」页撤掉，同一组工具在悬浮条「智能 ▾」画廊——原「智能页每项显隐＝委托按钮」→「画廊每卡可用＝委托按钮」（同一判据；
       不能用的置灰加锁、不隐藏）；导入 MIDI 不进画廊（文件 ▾「从已有音乐…」，tv_smart SM4）。钢琴伴奏歌谱「织体」可用、吉他弹唱「织体」锁住但在。
       修前红修后绿：改前没有 #flw-sb-smart / 画廊 */
    const DEL = { arr: 'rt-arr', lab: 'rt-lab', tex: 'b-acctex', fill: 'rt-fill' };
    const smart = async k => { await scn(pg, k); const b0 = await redBase(pg); await pg.click('#flw-sb-smart'); await wait(pg, 300);
      const r = await EV(pg, DEL => { const cs = [...document.querySelectorAll('#popmenu[data-m="smart"] .flw-gc')];
        const items = cs.filter(x => x.getAttribute('aria-disabled') !== 'true').map(x => x.dataset.v), all = cs.map(x => x.dataset.v);
        const mism = Object.keys(DEL).filter(k => { const b2 = document.getElementById(DEL[k]); let on = !!b2 && b2.style.display !== 'none';
          if (k === 'tex' && !on) on = (song.voxVoices || []).length >= 2 && !!accTexRows(song); return on !== items.includes(k); });
        return { items, all, mism, vis: __vis('#popmenu[data-m="smart"]'), page: !!document.getElementById('flw-rp-smart') }; }, DEL);
      await EV(pg, () => { try { FLOW.menu.close(); } catch (_) {} });
      await redEnd('M10', pg, b0, []); return r; };
    const sp = await smart('pacc'), sg = await smart('gtr');
    await shot(pg, 'M10-smart-gtr-1440');
    T('M10', sp.vis && sp.items.includes('tex') && !sg.items.includes('tex') && sg.all.includes('tex') && !sp.mism.length && !sg.mism.length && !sp.page && !sg.page,
      'M10d「智能 ▾」画廊（v69.0 起替代右栏智能页）：钢琴伴奏歌谱「织体」可用、吉他弹唱「织体」锁住不藏；一键配伴奏 / 配和弦 / 织体 / 智能填词 每卡可用＝委托按钮（rt-arr / rt-lab / b-acctex|大谱表 / rt-fill）；没有 #flw-rp-smart', J({ pacc: sp, gtr: sg }));
    await close(pg);
  }));

  /* ================= M11 五线谱级数角标 ================= */
  if (want('M11')) jobs.push(() => SAFE('M11', 'M11', async () => {
    const pg = await open(1280, 800, { tag: 'M11' });
    await scn(pg, 'piano');
    await EV(pg, () => { song.key = 'F'; const cs = song.measures[1].voxes[0]; const ci = cs.findIndex(c => c && c.deg && c.deg !== 5); sel = { mi: 1, row: 'vox', vi: 0, ci: Math.max(0, ci), si: 1 }; render(); });
    await wait(pg, 200); const base = await redBase(pg);
    const keysOf = () => EV(pg, () => ({ ctx: FLOW.ctx(), btn: [...document.querySelectorAll('#eb-note > .nd')].filter(b => +b.dataset.nd >= 1 && +b.dataset.nd <= 7 && __vis(b)).map(b => { const c = b.cloneNode(true); const d = c.querySelector('.flw-deg'); if (d) d.remove();
      /* v68.1 收尾 PN-5（迁移）：五线谱语境音名由 FLOW.r2k 的 .flw-ltr 按本小节调写，syncInputs 按全曲调写的 .dg 隐藏——读看得见的那一个 */
      if (c.querySelector('.flw-ltr') && getComputedStyle(b.querySelector('.dg') || b).display === 'none') { const g = c.querySelector('.dg'); if (g) g.remove(); }
      return { nd: +b.dataset.nd, x: b.getBoundingClientRect().left, t: c.textContent.trim(), deg: (b.querySelector('.flw-deg') || {}).textContent || '' }; }).sort((a, b) => a.x - b.x) }));
    const k1 = await keysOf();
    const letters = k1.btn.map(x => x.t).join(' '), degs = k1.btn.map(x => x.deg).join(' ');
    T('M11', k1.ctx === 'st' && letters === 'C D E F G A B' && degs === '5 6 7 1 2 3 4',
      'M11a 1=F、五线谱轨：音名键从左到右「' + letters + '」、级数角标「' + degs + '」（期望 C D E F G A B / 5 6 7 1 2 3 4）', J(k1.btn.map(x => x.t + x.deg + '@' + Math.round(x.x))));
    const at = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, deg0: curCol().deg }));
    const cBtn = k1.btn.find(x => x.t === 'C');
    if (cBtn) await pg.click('#eb-note > .nd[data-nd="' + cBtn.nd + '"]'); await wait(pg, 250);
    const c1 = await EV(pg, at => ({ deg: __colAt(at.mi, at.ci, 'vox', 0).deg }), at);
    T('M11', !!cBtn && cBtn.nd === 5 && c1.deg === 5, 'M11b 点「C」键（data-nd=' + (cBtn && cBtn.nd) + '）→ 第 ' + (at.mi + 1) + ' 小节第 ' + (at.ci + 1) + ' 列 deg ' + at.deg0 + '→5（点击仍写音级，数据语义不变）', J(c1));
    await pg.keyboard.press('Control+z'); await wait(pg, 150);
    await redEnd('M11', pg, base, []);
    await scn(pg, 'songbie');
    const k2 = await keysOf();
    T('M11', k2.ctx === 'jp' && k2.btn.map(x => x.nd).join('') === '1234567' && k2.btn.every(x => !x.deg),
      'M11c 换到简谱轨：角标全部移除，音级键按 1–7 排（syncInputs 原顺序）', J(k2.btn.map(x => x.nd + ':' + x.t)));
    await close(pg);
  }));

  /* ================= M12 简谱时值字形 ================= */
  if (want('M12')) jobs.push(() => SAFE('M12', 'M12', async () => {
    const ref = await open(1280, 800, { tag: 'M12-classic', url: CLASSICU });
    await scn(ref, 'pacc', { row: 'vox', vi: 1 });
    const orig = await EV(ref, () => { const o = {}; document.querySelectorAll('#eb-dur > [data-dur] > .dg').forEach(g => { o[g.parentNode.dataset.dur] = g.innerHTML; }); return o; });
    await close(ref);
    const pg = await open(1280, 800, { tag: 'M12' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const dg = () => EV(pg, () => { const o = {}; document.querySelectorAll('#eb-dur > [data-dur] > .dg').forEach(g => { const sv = g.querySelector('svg.flw-jd');
      o[g.parentNode.dataset.dur] = { html: g.innerHTML, jd: !!sv, t: sv ? [...sv.querySelectorAll('text')].map(x => x.textContent).join('') : '', rects: sv ? sv.querySelectorAll('rect').length : 0,
        under: sv ? [...sv.querySelectorAll('rect')].filter(r => +r.getAttribute('y') > 13).length : 0 }; }); return { ctx: FLOW.ctx(), o }; });
    const a = await dg();
    const o = a.o;
    T('M12', a.ctx === 'jp' && o['2'] && o['2'].jd && o['2'].t === '5' && o['2'].rects === 1 && o['2'].under === 0 && o['8'].t === '5' && o['8'].under === 1 && o['16'].under === 2 && o['1'].rects === 3 && o['4'].rects === 0,
      'M12a 简谱语境时值键＝简谱字形：二分「5 –」1 条增时线、全音符 3 条、四分无线、8 分 1 条 / 16 分 2 条减时线（数字「5」）', J(Object.keys(o).map(k => k + ':' + o[k].t + '/' + o[k].rects + '/' + o[k].under)));
    await shot(pg, 'M12-jp-dur-1280');
    await redEnd('M12', pg, base, []);   /* 下面换窗口（钢琴伴奏 / 吉他弹唱），各自重取基线 */
    const back = async (k, o2) => { await scn(pg, k, o2); const b0 = await redBase(pg); const r = await dg(); await redEnd('M12', pg, b0, []); return r; };
    const st = await back('pacc', { row: 'vox', vi: 1 }), tb = await back('gtr');
    const same = x => Object.keys(orig).every(k => x.o[k] && x.o[k].html === orig[k] && !x.o[k].jd);
    T('M12', st.ctx === 'st' && same(st) && tb.ctx === 'tab' && same(tb),
      'M12b 切到五线谱轨（钢琴伴奏右手）/ 六线谱轨：时值键 .dg 与经典外壳逐字节相同（SMuFL 原字形，' + Object.keys(orig).length + ' 键）', J({ st: st.ctx, tab: tb.ctx, diff: Object.keys(orig).filter(k => !(st.o[k] && st.o[k].html === orig[k])) }));
    await close(pg);
  }));

  /* ================= M13 命令面板 ================= */
  if (want('M13')) jobs.push(() => SAFE('M13', 'M13', async () => {
    const pg = await open(1280, 800, { tag: 'M13' });
    await scn(pg, 'songbie', { mi: 1 }); const base = await redBase(pg);
    const at = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, ferm: !!curCol().ferm }));
    await pg.keyboard.press('Control+Slash'); await wait(pg, 200);
    const o1 = await EV(pg, () => { const m = document.getElementById('popmenu'); return { open: !!(m && m.classList.contains('flw-cmd') && __vis(m)), role: m && m.getAttribute('role'), ae: (document.activeElement || {}).id }; });
    await pg.keyboard.type('ych'); await wait(pg, 200);
    /* v68.7 S1 迁移：命令面板删位置列 .flw-cmdw（「在 书写 · 左栏记号 · 组名」）→ 断言没有 .flw-cmdw、读屏名 aria-label＝名称；位置改由 ↑↓ 描边真实控件（tv_flowdef F6b）。
       理由：规格 A3 / README ②P3；修前红修后绿：改前每行带 .flw-cmdw、aria-label 是「名称 · 在 …」→ 红 */
    const r1 = await EV(pg, () => { const b2 = document.getElementById('flw-cmdo-0'); return b2 ? { t: b2.querySelector('.flw-cmdt').textContent, w: b2.querySelectorAll('.flw-cmdw').length, al: b2.getAttribute('aria-label'), sel: b2.getAttribute('aria-selected'),
      grp: FLOW.pal.GROUPS('jp').find(g => g[2].indexOf('fermata') >= 0)[1] } : null; });
    await shot(pg, 'M13-cmd-ych-1280');
    await pg.keyboard.press('Enter'); await wait(pg, 250);
    const e1 = await EV(pg, at => ({ ferm: !!__colAt(at.mi, at.ci, 'vox', 0).ferm, open: !!document.querySelector('#popmenu.flw-cmd'), rec: localStorage.getItem('musetab-cmd-recent') }), at);
    T('M13', o1.open && o1.role === 'dialog' && o1.ae === 'flw-cmdq' && !!r1 && r1.t === '延长号' && r1.w === 0 && r1.al === '延长号' && r1.sel === 'true' && !at.ferm && e1.ferm && !e1.open,
      'M13a Ctrl+/ 打开命令面板（role=dialog、焦点在搜索框）；输入 ych 第一条「' + (r1 && r1.t) + '」（v68.7 S1：没有位置列、读屏名＝名称）；Enter → 第 ' + (at.mi + 1) + ' 小节第 ' + (at.ci + 1) + ' 列 ferm、面板关闭', J({ o1, r1, e1: { ferm: e1.ferm, open: e1.open } }));
    let rec = null; try { rec = JSON.parse(e1.rec); } catch (_) {}
    T('M13', Array.isArray(rec) && rec[0] === 'sign:fermata', 'M13b 最近用过记在 musetab-cmd-recent（数组，第 1 条 sign:fermata）', e1.rec);
    await pg.keyboard.press('Control+z'); await wait(pg, 150);
    const q = async s => { await pg.keyboard.press('Control+Slash'); await wait(pg, 150); await pg.keyboard.type(s); await wait(pg, 200);
      return EV(pg, () => [...document.querySelectorAll('#flw-cmdl .flw-cmdr')].map(b2 => b2.querySelector('.flw-cmdt').textContent)); };
    const p1 = await q('预设'); await pg.keyboard.press('Escape'); await wait(pg, 150);
    const p2 = await q('pb'); await pg.keyboard.press('Enter'); await wait(pg, 500);
    const m2 = await mode(pg);
    T('M13', p1.includes('示例曲谱') && m2.cur === 'engrave' && m2.pv,
      'M13c 旧名「预设」→ 结果含「示例曲谱」；输入 pb 回车（第一条「' + p2[0] + '」）→ 进排版、预览打开', J({ p1: p1.slice(0, 4), p2: p2.slice(0, 3), m2 }));
    await pg.keyboard.press('Escape'); await wait(pg, 250);
    await pg.keyboard.press('Control+k'); await wait(pg, 200);
    const k1 = await EV(pg, () => ({ ck: !!document.getElementById('ck-in'), cmd: !!document.querySelector('#popmenu.flw-cmd') }));
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    await EV(pg, () => { try { closePop(); } catch (_) {} const a = document.activeElement; if (a && a.blur) a.blur(); });
    await pg.keyboard.press('Shift+Slash'); await wait(pg, 200);
    const h1 = await EV(pg, () => { const m = document.getElementById('popmenu'); const c = FLOW.menu.cur && FLOW.menu.cur(); return { name: c && c.name, ds: m && m.dataset.m, cmd: !!(m && m.classList.contains('flw-cmd')), txt: m ? m.textContent.slice(0, 30) : '' }; });
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    T('M13', k1.ck && !k1.cmd && (h1.name === 'help' || h1.ds === 'help') && !h1.cmd,
      'M13d Ctrl+K 仍打开和弦快速输入（#ck-in），不打开命令面板；?（Shift+/）＝快捷键菜单', J({ k1, h1 }));
    const n = await EV(pg, () => ({ n: FLOW.cmd.list().length, signs: FLOW.cmd.list().filter(c => /^sign:/.test(c.id)).length, nSigns: Object.keys(FLOW.pal.SIGNS).length }));
    T('M13', n.n >= 120 && n.signs === n.nSigns, 'M13e 命令表 ' + n.n + ' 条（≥120，计划 R5），记号条目 ' + n.signs + ' 条＝FLOW.pal.SIGNS 全部自动生成', J(n));
    /* 坏 JSON：回默认、不报错 */
    const myErrs = () => errs.filter(e => /^M13 /.test(e)).length, e0 = myErrs();   /* 只数本页的报错（其他用例并行跑） */
    await EV(pg, () => localStorage.setItem('musetab-cmd-recent', '{坏'));
    await pg.keyboard.press('Control+Slash'); await wait(pg, 200);
    const bad = await EV(pg, () => ({ open: !!document.querySelector('#popmenu.flw-cmd'), heads: [...document.querySelectorAll('#flw-cmdl .flw-cmdh')].map(x => x.textContent), rows: document.querySelectorAll('#flw-cmdl .flw-cmdr').length }));
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    T('M13', bad.open && !bad.heads.includes('最近用过') && bad.rows > 0 && myErrs() === e0, 'M13f musetab-cmd-recent 写成坏 JSON → 面板照开、不列「最近用过」、无报错', J(bad));
    /* M13g（v68.1 集成）：命令「锁定此行」「并入上一行」与点排版工具组 #flw-eng 那枚按钮同一路径（FLOW.lay.act → sysLockRow / sysAct('pull')）——
       C 轨单独提交时 A 轨还没合入，这两条只切到排版；集成后接上真实动作。Ctrl+Z 各一步复原 */
    const runCmd = async s => { await pg.keyboard.press('Control+Slash'); await wait(pg, 150); await pg.keyboard.type(s); await wait(pg, 200);
      const t = await EV(pg, () => { const b2 = document.getElementById('flw-cmdo-0'); return b2 ? b2.querySelector('.flw-cmdt').textContent : null; });
      await pg.keyboard.press('Enter'); await wait(pg, 700); return t; };
    const lrow = await EV(pg, () => { setMode('write'); const rows = FLOW.lay.rowsNow(), r = rows[1] || rows[0];
      sel = Object.assign({}, sel, { mi: r.m1, ci: 0 }); selRange = null; render(); return [r.m1, r.m2]; });
    const jg = await EV(pg, () => J2(song));
    const tl = await runCmd('锁定此行');
    const gl = await EV(pg, () => { const r = FLOW.lay.rowsNow().find(x => sel.mi >= x.m1 && sel.mi <= x.m2);
      return { cur: FLOW.mode.cur, row: r ? [r.m1, r.m2] : null, locked: !!r && sysRowLocked(r.m1, r.m2), pressed: document.getElementById('flw-eng-lock').getAttribute('aria-pressed') }; });
    await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await pg.keyboard.press('Control+z'); await wait(pg, 400);
    const ul = await EV(pg, jg => J2(song) === jg, jg);
    const tp = await runCmd('并入上一行');
    const gp = await EV(pg, mi => ({ cur: FLOW.mode.cur, pull: song.measures[mi].pull, starts: FLOW.lay.rowsNow().some(r => r.m1 === mi) }), lrow[0]);
    await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await pg.keyboard.press('Control+z'); await wait(pg, 400);
    const up = await EV(pg, jg => J2(song) === jg, jg);
    T('M13', tl === '锁定此行' && gl.cur === 'engrave' && gl.locked && gl.pressed === 'true' && ul && tp === '并入上一行' && gp.cur === 'engrave' && gp.pull === 1 && !gp.starts && up,
      'M13g 命令「锁定此行」→ 进排版、当前行（第 ' + (lrow[0] + 1) + '–' + (lrow[1] + 1) + ' 小节）sysRowLocked、工具组键按下；「并入上一行」→ measures[' + lrow[0] + '].pull=1、不再有行从它起；各 Ctrl+Z 一步复原',
      J({ tl, gl, ul, tp, gp, up }));
    await EV(pg, () => { try { setMode('write'); } catch (_) {} });
    await redEnd('M13', pg, base, ['C.ferm', 'M.brk', 'M.pull']);
    await close(pg);
  }));

  /* ================= M14 切轨跟滚 ================= */
  if (want('M14')) jobs.push(() => SAFE('M14', 'M14', async () => {
    const pg = await open(1280, 800, { tag: 'M14' });
    await scn(pg, 'trk3', { mi: 29 }); const base = await redBase(pg);
    const prep2 = () => EV(pg, () => { sel = { mi: 29, row: 'vox', vi: 0, ci: 0, si: 1 }; selRange = null; render(); const w = scoreScroller(); w.scrollTop = 0; });
    await prep2(); await wait(pg, 200);
    const pre = await EV(pg, () => { const s0 = J2(sel); sel.vi = 2; const cb = __curBox(); sel.vi = 0; return { cb, out: cb && (cb.top < cb.vT || cb.bot > cb.vB) }; });
    await pg.click('#flw-tr-vox-2', { position: { x: 20, y: 14 } }); await wait(pg, 350);
    const a = await EV(pg, () => ({ sel: [sel.row, sel.vi, sel.mi], cb: __curBox() }));
    const inV = cb => cb && cb.top >= cb.vT - 1 && cb.bot <= cb.vB + 1;
    T('M14', pre.out && a.sel.join() === 'vox,2,29' && inV(a.cb),
      'M14a 3 条旋律轨 40 小节：第 3 轨第 30 小节原在视口外（' + (pre.cb && pre.cb.top) + '），点音轨树第 3 轨 → sel=vox:2:29、光标框 top ' + (a.cb && a.cb.top) + ' ≥ 可视顶+12（' + (a.cb && a.cb.vT) + '）、bottom ' + (a.cb && a.cb.bot) + ' ≤ 可视底−24（' + (a.cb && a.cb.vB) + '）', J({ pre, a }));
    /* 键盘：焦点在第 1 轨行上按 ↓ 换到第 2 轨（先滚回顶部） */
    await prep2(); await wait(pg, 200);
    await EV(pg, () => { const r = document.getElementById('flw-tr-vox-0'); r.tabIndex = 0; r.focus(); });
    const pre2 = await EV(pg, () => { sel.vi = 1; const cb = __curBox(); sel.vi = 0; return cb && (cb.top < cb.vT || cb.bot > cb.vB); });
    await pg.keyboard.press('ArrowDown'); await wait(pg, 350);
    const k = await EV(pg, () => ({ sel: [sel.row, sel.vi, sel.mi], cb: __curBox(), ae: (document.activeElement || {}).id }));
    T('M14', pre2 && k.sel.join() === 'vox,1,29' && inV(k.cb), 'M14b 音轨树键盘 ↓ 换到第 2 轨 → 同样跟滚进可视区（上 12 / 下 24 余量）', J({ pre2, k }));
    await shot(pg, 'M14-follow-1280');
    await redEnd('M14', pg, base, []);
    await close(pg);
  }));

  /* ================= M15 1180 窄档 ================= */
  if (want('M15')) jobs.push(() => SAFE('M15', 'M15', async () => {
    const pg = await open(1180, 800, { tag: 'M15' });
    await scn(pg, 'songbie', { mi: 1 }); const base = await redBase(pg);
    const a = await EV(pg, () => ({ narrow: document.body.classList.contains('flw-narrow'), mdd: __vis('#flw-mdd'), modes: __vis('#flw-modes'), lf: __R('#flw-left'), pal: __vis('#flw-pal'),
      sc: __R('#score'), rs: __R('#flw-rstrip') }));
    const clear = x => x.sc.x >= x.lf.r - 1 && x.sc.r <= x.rs.x + 1;
    T('M15', a.narrow && a.mdd && !a.modes && Math.abs(a.lf.w - 56) <= 0.5 && !a.pal && clear(a),
      'M15a 1180×800：body.flw-narrow、「书写 ▾」可见、模式条不可见；#flw-left 宽 56、记号区不占位；paperClear（#score ' + a.sc.x + '–' + a.sc.r + ' 在 56 与竖条 ' + a.rs.x + ' 之间）', J(a));
    const at = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, w0: document.getElementById('paper').clientWidth }));
    await pg.click('#flw-nbtn'); await wait(pg, 250);
    const b1 = await EV(pg, () => ({ pal: __R('#flw-pal'), sec: document.body.classList.contains('flw-lfo-sec'), cell: __vis('#flw-pgrid .flw-sg[data-v="fermata"]'), w: document.getElementById('paper').clientWidth }));
    await shot(pg, 'M15-pal-1180');
    await pg.click('#flw-pgrid .flw-sg[data-v="fermata"]'); await wait(pg, 250);
    const b2 = await EV(pg, at => ({ ferm: !!__colAt(at.mi, at.ci, 'vox', 0).ferm }), at);
    T('M15', b1.sec && b1.pal.vis && Math.abs(b1.pal.w - 288) <= 1 && Math.abs(b1.pal.x - 57) <= 1.5 && b1.w === at.w0 && b1.cell && b2.ferm,
      'M15b 竖条底部「记号」→ 同一个 #flw-pal 浮成 288 宽（x≈57，贴竖条）、谱纸宽不变；点「延长号」→ 第 ' + (at.mi + 1) + ' 小节第 ' + (at.ci + 1) + ' 列 ferm', J({ b1, b2 }));
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    await pg.click('#flw-mdd'); await wait(pg, 200);
    const mm = await EV(pg, () => { const m = document.getElementById('popmenu'); return m && { items: [...m.querySelectorAll('[role="menuitemradio"]')].map(x => x.dataset.v + ':' + x.getAttribute('aria-checked')), txt: m.textContent }; });
    await pg.click('#popmenu [data-fa="mode:set"][data-v="output"]'); await wait(pg, 450);
    const c = await EV(pg, () => ({ cur: FLOW.mode.cur, t: document.getElementById('flw-mdd').textContent.trim(), pv: __R('#preview-ov'), lf: __R('#flw-left') }));
    await shot(pg, 'M15-output-1180');
    T('M15', !!mm && mm.items.join() === 'write:true,engrave:false,output:false' && c.cur === 'output' && /输出/.test(c.t) && Math.abs(c.pv.x - c.lf.r) <= 1,
      'M15c「书写 ▾」菜单恰好三步（书写 · 排版 · 输出），选「输出」→ 输出模式、按钮字变「输出」、预览左缘贴 56 竖条', J({ items: mm && mm.items, c: { cur: c.cur, t: c.t, pvx: c.pv.x, lf: c.lf.r } }));
    await EV(pg, () => setMode('write'));
    await redEnd('M15', pg, base, ['C.ferm']);
    await close(pg);
  }));

  /* ================= M16 手机 390×844 ================= */
  if (want('M16')) jobs.push(() => SAFE('M16', 'M16', async () => {
    const pg = await open(390, 844, { tag: 'M16', touch: true, mobile: true });
    await scn(pg, 'songbie'); await wait(pg, 300); const base = await redBase(pg);
    const a = await EV(pg, () => ({ m: document.body.classList.contains('flw-m'), flow: document.body.classList.contains('flow'), top: __R('#flw-mtop'), bar: __R('#flw-mbar'), ih: innerHeight,
      old: { top: __vis('#top'), rail: __vis('#left-rail'), mx: __vis('#mixer-dock'), eb: __vis('#editbar') } }));
    T('M16', a.m && a.top && a.top.vis && Math.abs(a.top.h - 48) <= 0.5 && a.bar && a.bar.vis && Math.abs(a.bar.h - 64) <= 0.5 && Math.abs(a.bar.b - a.ih) <= 1 && !a.old.rail && !a.old.mx && !a.old.eb,
      'M16a 手机 390×844：body.flw-m；顶栏 #flw-mtop 高 48、底条 #flw-mbar 高 64 贴底；旧手机三层底栏（时值条 #editbar · 图层轨 #left-rail · 迷你条 #mixer-dock）不可见', J(a));
    const small = sel => EV(pg, sel => { const out = []; document.querySelectorAll(sel).forEach(e => { if (!__vis(e)) return; const r = e.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 43.5) out.push((e.id || e.dataset.fm + ':' + (e.dataset.v || '')) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }); return out; }, sel);
    const s0 = await small('#flw-mtop button, #flw-mbar button');
    const rows = [];
    for (const v of ['menu', 'win', 'trk', 'pal', 'out']) {
      const op = '[data-fm="sheet"][data-v="' + v + '"]';
      await pg.click(op); await wait(pg, 250);
      const o = await EV(pg, ([v, op]) => { const sh = document.getElementById('flw-msheet'); return { v, vis: __vis(sh), dv: sh.dataset.v, lab: sh.getAttribute('aria-label'), exp: document.querySelector(op).getAttribute('aria-expanded'),
        fms: [...new Set([...sh.querySelectorAll('[data-fm]')].map(x => x.dataset.fm))], dur: !!sh.querySelector('#eb-dur') && __vis('#eb-dur'), txt: sh.textContent.slice(0, 200) }; }, [v, op]);
      o.small = await small('#flw-msheet button');
      if (SHOTS && (v === 'trk' || v === 'pal')) await shot(pg, 'M16-mobile-' + v);
      if (v === 'win') { await pg.keyboard.press('Escape'); } else await EV(pg, () => document.getElementById('flw-mveil').click());
      await wait(pg, 200);
      o.closed = await EV(pg, op => !__vis('#flw-msheet') && document.querySelector(op).getAttribute('aria-expanded') === 'false', op);
      rows.push(o);
    }
    T('M16', rows.every(o => o.vis && o.dv === o.v && o.exp === 'true' && o.closed),
      'M16b 五个抽屉（菜单 · 窗口 · 音轨 · 记号 · 输出与分享）点开即显示、aria-expanded=true；点遮罩 / Esc 收起', rows.map(o => o.v + (o.vis && o.closed ? '✓' : '✗') + '「' + o.lab + '」').join(' '));
    const allSmall = s0.concat(...rows.map(o => o.small.map(x => o.v + ':' + x)));
    T('M16', !allSmall.length, 'M16c 顶栏 / 底条 / 各抽屉内可见按钮最小边 ≥44', allSmall.length ? allSmall.join('；') : '全部 ≥44');
    const tr = rows.find(o => o.v === 'trk'), pl = rows.find(o => o.v === 'pal');
    /* 音轨抽屉里允许的动作：选轨 / 静音 / 独奏，以及跳到别的抽屉（sheet，如「播放设置…」）——没有改记谱法、加轨的动作 */
    const trSheets = await EV(pg, () => { /* 抽屉已收起：重开读 sheet 跳转目标 */ document.querySelector('#flw-mbar [data-fm="sheet"][data-v="trk"]').click();
      const r = [...document.querySelectorAll('#flw-msheet [data-fm="sheet"]')].map(x => x.dataset.v); document.getElementById('flw-mveil').click(); return r; });
    await wait(pg, 150);
    T('M16', tr.fms.every(f => ['trk', 'mute', 'solo', 'sheet'].includes(f)) && trSheets.every(v => ['menu', 'win', 'trk', 'pal', 'out', 'play'].includes(v)) && /到电脑/.test(tr.txt) && pl.dur,
      'M16d 音轨抽屉只有选轨 / 静音 / 独奏（另有跳到其他抽屉的入口 ' + J(trSheets) + '；没有改记谱法、加轨的按钮，注明到电脑，D-07 ②）；记号抽屉顶部是搬入的 #eb-dur 时值条', J({ trk: tr.fms, sheets: trSheets, pal: pl.dur }));
    /* 播放设置抽屉（若有：手机挂 flow 后旧迷你条隐藏，回到开头 / 速度 / 倍速 / 节拍器四个原节点搬进抽屉、收起搬回） */
    if (trSheets.includes('play')) {
      await pg.click('#flw-mbar [data-fm="sheet"][data-v="trk"]'); await wait(pg, 200);
      await pg.click('#flw-msheet [data-fm="sheet"][data-v="play"]'); await wait(pg, 250);
      const IDS = ['b-restart', 'i-tempo', 'mx-rate', 'b-metro'];
      const pin = await EV(pg, IDS => { const sh = document.getElementById('flw-msheet'); return { v: sh.dataset.v, in: IDS.map(id => { const e = document.getElementById(id); return !!e && sh.contains(e) && __vis(e); }) }; }, IDS);
      const psm = await small('#flw-msheet button, #flw-msheet select, #flw-msheet input');
      await shot(pg, 'M16-mobile-play');
      await EV(pg, () => document.getElementById('flw-mveil').click()); await wait(pg, 200);
      const pout = await EV(pg, IDS => IDS.map(id => { const e = document.getElementById(id); return !!e && !!e.closest('#mixer-dock'); }), IDS);
      T('M16', pin.v === 'play' && pin.in.every(Boolean) && pout.every(Boolean) && !psm.length,
        'M16f「播放设置…」抽屉：回到开头 / 速度 / 倍速 / 节拍器四个原节点（#b-restart #i-tempo #mx-rate #b-metro）搬入可见、触控 ≥44；收起后搬回 #mixer-dock', J({ pin, pout, small: psm }));
    } else NOTE('M16', '   ℹ️  M16f 本构建手机外壳没有「播放设置」抽屉，跳过');
    const d1 = await EV(pg, () => ({ in: !!document.querySelector('#flw-msheet #eb-dur'), parent: document.getElementById('eb-dur').parentElement.id }));
    T('M16', !d1.in && d1.parent !== 'flw-msheet', 'M16e 记号抽屉收起后 #eb-dur 搬回原位', J(d1));
    /* M16g（v68.1 集成）：输出与分享抽屉的 分享卡 / 图片 PNG / 打印 走 A 轨 EXPORT_ACT——调用与 pyqEvent 事件名和「打印 / 导出」弹窗对应按钮（纸张 A4）逐个相同
       （D 轨单独提交时基线还没有 EXPORT_ACT，带一段临时直调兜底；集成后兜底删掉，只剩真实接口） */
    await EV(pg, () => { window.__EV = [];
      try { pyqEvent = function (n) { __EV.push('ev:' + n); }; } catch (_) {}
      ['exportPNG', 'exportShareCard'].forEach(f => { window[f] = function () { __EV.push('fn:' + f + '(' + [...arguments].join(',') + ')'); }; });
      const sp = setPrintPage; setPrintPage = function (s) { __EV.push('setPrintPage(' + s + ')'); return sp.apply(this, arguments); };
      window.print = () => __EV.push('print'); });
    const takeM = () => EV(pg, () => { const r = __EV.join(' '); __EV.length = 0; return r; });
    const exr = [];
    for (const [k, mid] of [['card', 'ex-card'], ['png', 'ex-png'], ['print', 'ex-print']]) {
      await pg.click('#flw-mbar [data-fm="sheet"][data-v="out"]'); await wait(pg, 250);
      await takeM(); await pg.click('#flw-msheet [data-fm="ex"][data-v="' + k + '"]'); await wait(pg, 300); const a = await takeM();
      await EV(pg, () => { const v = document.getElementById('flw-mveil'); if (v && !v.hidden && __vis('#flw-msheet')) v.click(); }); await wait(pg, 150);
      await EV(pg, () => document.getElementById('b-print').click()); await wait(pg, 60);
      await takeM(); await EV(pg, mid => { const sz = document.getElementById('ex-size'); if (sz) sz.value = 'A4'; document.getElementById(mid).click(); }, mid); await wait(pg, 300);
      const m = (await takeM()).replace(/ ?closeModal/g, '');
      await EV(pg, () => { try { closeModal(); } catch (_) {} });
      exr.push({ k, mob: a, modal: m });
    }
    T('M16', exr.every(r => r.mob && r.mob === r.modal) && /ev:share_card fn:exportShareCard\(\)/.test(exr[0].mob) && /ev:export_png fn:exportPNG\(2\)/.test(exr[1].mob) && /setPrintPage\(A4\) print/.test(exr[2].mob),
      'M16g 手机「输出与分享」抽屉：分享卡 / 图片 PNG / 打印 走 EXPORT_ACT，调用与事件名和「打印 / 导出」弹窗（纸张 A4）逐个相同', exr.map(r => r.k + '「' + r.mob + '」' + (r.mob === r.modal ? '' : ' ≠ 弹窗「' + r.modal + '」')).join('；'));
    await redEnd('M16', pg, base, []);
    await close(pg);
  }));

  /* ================= M17 快捷键不变 ================= */
  if (want('M17')) jobs.push(() => SAFE('M17', 'M17', async () => {
    const pg = await open(1280, 800, { tag: 'M17' });
    await scn(pg, 'songbie', { mi: 1 }); const base = await redBase(pg);
    const an = [];
    for (const m of ['write', 'engrave', 'output']) {
      if (m !== 'write') await clickMode(pg, m); else await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      await pg.keyboard.press('Alt+n'); await wait(pg, 400);
      an.push(await EV(pg, m => ({ m, cur: FLOW.mode.cur, nf: !!(NWP.modal && NWP.modal.isConnected), pv: document.getElementById('preview-ov').classList.contains('on') }), m));
      await EV(pg, () => { try { closeModal(); } catch (_) {} }); await wait(pg, 150);
    }
    T('M17', an.every(x => x.nf && x.cur === 'write' && !x.pv), 'M17a 书写 / 排版 / 输出三种模式下 Alt+N 都打开新建面板（非书写先回书写、预览关闭）', J(an));
    await clickMode(pg, 'engrave');
    await pg.keyboard.press('Alt+b'); await wait(pg, 300);
    const ab = await EV(pg, () => ({ cur: FLOW.mode.cur, ae: (document.activeElement || {}).id || ((document.activeElement || {}).className || ''),
      exp: !!(FLOW.sbar && FLOW.sbar.expanded()), inBar: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#flw-sbar')) }));
    /* v68.3：Alt+B＝谱面上方悬浮条——排版 / 输出先回书写，再展开并把焦点放进条里（不是切换） */
    T('M17', ab.cur === 'write' && ab.exp && ab.inBar, 'M17b 排版模式 Alt+B → 回书写、谱面上方的悬浮条展开且焦点在条里（起步 / 谱类 / 常用工具在悬浮条）', J(ab));
    /* Ctrl+Z / Y / S：书写里落一个音，进排版撤销 / 重做 / 存为文件，模式不变 */
    await EV(pg, () => { window.__xs = 0; exportSong = function () { __xs++; }; });
    const at = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, deg: curCol().deg }));
    await pg.keyboard.press(String(at.deg === 3 ? 4 : 3)); await wait(pg, 200);
    const d1 = await EV(pg, at => __colAt(at.mi, at.ci, 'vox', 0).deg, at);
    await clickMode(pg, 'engrave');
    await pg.keyboard.press('Control+z'); await wait(pg, 300);
    const z = await EV(pg, at => ({ deg: __colAt(at.mi, at.ci, 'vox', 0).deg, cur: FLOW.mode.cur }), at);
    await pg.keyboard.press('Control+y'); await wait(pg, 300);
    const y = await EV(pg, at => ({ deg: __colAt(at.mi, at.ci, 'vox', 0).deg, cur: FLOW.mode.cur }), at);
    await pg.keyboard.press('Control+s'); await wait(pg, 200);
    const s = await EV(pg, () => ({ xs: __xs, cur: FLOW.mode.cur }));
    T('M17', d1 !== at.deg && z.deg === at.deg && z.cur === 'engrave' && y.deg === d1 && y.cur === 'engrave' && s.xs === 1 && s.cur === 'engrave',
      'M17c 排版模式 Ctrl+Z 撤销（deg ' + d1 + '→' + at.deg + '）、Ctrl+Y 重做、Ctrl+S 存为文件（exportSong 1 次），模式都不变', J({ at, d1, z, y, s }));
    /* 空格：排版模式照常播放 */
    await pg.keyboard.press(' '); await wait(pg, 400);
    const p1 = await EV(pg, () => ({ playing: !!audio.playing, cur: FLOW.mode.cur }));
    await EV(pg, () => { try { stopPlay(); } catch (_) {} }); await wait(pg, 150);
    T('M17', p1.playing && p1.cur === 'engrave', 'M17d 排版模式按空格 → 开始播放（audio.playing）、不切模式', J(p1));
    await pg.keyboard.press('Control+z'); await wait(pg, 150);
    await EV(pg, () => { try { setMode('write'); } catch (_) {} });
    await redEnd('M17', pg, base, []);
    await close(pg);
  }));

  /* ================= M18 往返 20 次数据零改动 · 源码新键名 ================= */
  if (want('M18')) jobs.push(() => SAFE('M18', 'M18', async () => {
    const pg = await open(1280, 800, { tag: 'M18' });
    await scn(pg, 'pacc', { mi: 3 }); const base = await redBase(pg);
    const j0 = await EV(pg, () => J2(song));
    for (let i = 0; i < 2; i++) { await clickMode(pg, 'engrave'); await clickMode(pg, 'output'); await clickMode(pg, 'write'); }
    for (let i = 0; i < 18; i++) await EV(pg, () => { setMode('engrave'); setMode('output'); setMode('write'); });
    await wait(pg, 500);
    const a = await EV(pg, j0 => ({ same: J2(song) === j0, cur: FLOW.mode.cur, pv: document.getElementById('preview-ov').classList.contains('on'), dm: document.body.dataset.mode }), j0);
    T('M18', a.same && a.cur === 'write' && !a.pv && a.dm === 'write', 'M18a 三种模式往返 20 次（2 次真实点击 + 18 次 setMode）后 song 逐字节相同、回书写、预览关闭', J(a));
    await redEnd('M18', pg, base, []);
    await close(pg);
    const lit = [...literalKeys(curSrc)], newLit = refSrc ? lit.filter(k => !literalKeys(refSrc).has(k) && !PREV_FLOW_KEYS.includes(k)) : null;
    if (!refSrc) NOTE('M18', '⚠️  M18b 源码键名对拍跳过：拿不到基线（' + REF_COMMIT.slice(0, 7) + '）');
    /* v68.2：基线（shellflow_ref.json）换成 v68.1 a8c2089 后，musetab-cmd-recent 已在基线里；v68.2 新增 musetab-tour-shell（首次导览，计划 §1.2）；v68.3 新增 musetab-sbar（悬浮条收起） */
    else T('M18', newLit.every(k => NEW_KEYS.concat(['musetab-tour-shell']).includes(k)), 'M18b 源码里的 musetab-* 键名：相对基线 ' + (REF.version || '') + '（' + REF_COMMIT.slice(0, 7) + '）与 v67.9 / v68.0 flow 键，新出现的只有 ' + J(newLit) + '（⊆ musetab-cmd-recent · v68.2 musetab-tour-shell · v68.3 musetab-sbar）',
      '共 ' + lit.length + ' 个字面量');
  }));

  /* ================= M19 TRK-16 状态栏小节格 ================= */
  if (want('M19')) jobs.push(() => SAFE('M19', 'M19', async () => {
    /* 经典外壳混音台「每轨小节格」拖第 3–4 小节：旧写法的 selRange（对照） */
    const cl = await open(1280, 800, { tag: 'M19-classic', url: CLASSICU });
    await scn(cl, 'songbie');
    await EV(cl, () => setMixerExpanded(true)); await wait(cl, 300);
    const cc = mi => EV(cl, mi => { const c = document.querySelector('#mx-tracks .mx-row[data-kind="vox"][data-vi="0"] .mx-cells .mxtc[data-mi="' + mi + '"]'); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, mi);
    const [p2, p3] = [await cc(2), await cc(3)];
    await cl.mouse.move(p2[0], p2[1]); await cl.mouse.down(); await cl.mouse.move(p3[0], p3[1], { steps: 4 }); await cl.mouse.up(); await wait(cl, 250);
    const old = await EV(cl, () => ({ sr: J2(selRange), sel: [sel.row, sel.vi, sel.mi, sel.ci] }));
    await close(cl);
    const pg = await open(1280, 800, { tag: 'M19' });
    await scn(pg, 'songbie', { mi: 0 }); const base = await redBase(pg);
    const cell = mi => EV(pg, mi => { const c = document.querySelector('#mx-prog .mxc[data-mi="' + mi + '"]'); if (!c || !__vis(c)) return null; const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, mi);
    const dense = await EV(pg, () => progDense());
    /* a 单击＝光标跳到当前轨该小节 */
    const c4 = await cell(4);
    await pg.mouse.click(c4[0], c4[1]); await wait(pg, 250);
    const a = await EV(pg, () => ({ sel: [sel.row, sel.vi, sel.mi, sel.ci], loop: audio.loop, sr: selRange, blur: blurSel, at: (document.querySelector('#mx-prog .mxc.flw-at') || { dataset: {} }).dataset.mi }));
    T('M19', !dense && a.sel.join() === 'vox,0,4,0' && !a.loop && !a.sr && !a.blur && a.at === '4',
      'M19a flow 状态栏小节格单击第 5 小节 → 光标跳到当前轨（旋律）第 5 小节第 1 列、不设循环、无选区；格子描出光标所在小节', J(a));
    /* b Shift+拖选 2→3＝当前轨整小节选区，与经典混音台每轨小节格同一 selRange */
    const [q2, q3] = [await cell(2), await cell(3)];
    await pg.keyboard.down('Shift'); await pg.mouse.move(q2[0], q2[1]); await pg.mouse.down(); await pg.mouse.move(q3[0], q3[1], { steps: 4 }); await pg.mouse.up(); await pg.keyboard.up('Shift'); await wait(pg, 250);
    const b1 = await EV(pg, () => ({ sr: J2(selRange), sel: [sel.row, sel.vi, sel.mi, sel.ci], loop: audio.loop, toast: __toasts.slice(-1)[0] }));
    T('M19', b1.sr === old.sr && J(b1.sel) === J(old.sel) && !b1.loop && JSON.parse(b1.sr || 'null') && JSON.parse(b1.sr).whole === true,
      'M19b Shift+拖选第 3–4 小节 → 当前轨整小节选区 selRange（whole:true）与经典混音台每轨小节格拖选逐字段相同、不设循环；提示「' + b1.toast + '」', J({ flow: b1.sr, classic: old.sr }));
    /* c Ctrl+C → 单击第 9 小节 → Ctrl+V：第 9–10 小节＝第 3–4 小节 */
    await pg.keyboard.press('Control+c'); await wait(pg, 150);
    const clip = await EV(pg, () => ({ whole: !!(clipCols && clipCols.whole), n: clipCols && clipCols.meas && clipCols.meas.length }));
    const c8 = await cell(8); await pg.mouse.click(c8[0], c8[1]); await wait(pg, 200);
    await pg.keyboard.press('Control+v'); await wait(pg, 250);
    const pv = await EV(pg, () => { const f = m => J2((song.measures[m].voxes[0] || []).map(c => [c.deg, c.dur, c.oct, c.dot || 0, c.tie || 0])); return { a: f(2) + f(3), b: f(8) + f(9), sel: sel.mi }; });
    T('M19', clip.whole && clip.n === 2 && pv.a === pv.b, 'M19c Ctrl+C 复制整小节（clipCols.whole、2 小节）→ 单击第 9 小节 → Ctrl+V：第 9–10 小节音符＝第 3–4 小节', J({ clip, same: pv.a === pv.b }));
    await pg.keyboard.press('Control+z'); await wait(pg, 200);
    /* d 普通拖选＝循环（原口径） */
    const s0 = await EV(pg, () => J2(sel));
    const [q5, q7] = [await cell(5), await cell(7)];
    await pg.mouse.move(q5[0], q5[1]); await pg.mouse.down(); await pg.mouse.move(q7[0], q7[1], { steps: 5 }); await pg.mouse.up(); await wait(pg, 250);
    const d = await EV(pg, () => ({ loop: audio.loop, sel: J2(sel), sr: selRange, cells: [...document.querySelectorAll('#mx-prog .mxc.loop')].map(x => +x.dataset.mi).join(',') }));
    T('M19', d.loop && d.loop.a === 5 && d.loop.b === 7 && d.sel === s0 && d.cells === '5,6,7', 'M19d 普通拖选第 6–8 小节 → setLoop 循环 {a:5,b:7}（格子 .loop），光标不动', J(d));
    await EV(pg, () => setLoop(null));
    /* e 排版模式单击小节格：先回书写再落光标 */
    await clickMode(pg, 'engrave');
    const c11 = await cell(11); await pg.mouse.click(c11[0], c11[1]); await wait(pg, 350);
    const e = await EV(pg, () => ({ cur: FLOW.mode.cur, mi: sel.mi, pv: document.getElementById('preview-ov').classList.contains('on') }));
    T('M19', e.cur === 'write' && e.mi === 11 && !e.pv, 'M19e 排版模式单击小节格第 12 小节 → 回书写、光标落在第 12 小节', J(e));
    await shot(pg, 'M19-prog-1280');
    await redEnd('M19', pg, base, []);
    await close(pg);
  }));

  /* ================= M20 SH-3 起步说明可见（v68.3 迁移：起步在谱面上方的悬浮条 #flw-sbar） ================= */
  if (want('M20')) jobs.push(() => SAFE('M20', 'M20', async () => {
    /* 经典外壳谱型条（同一份新建钢琴伴奏歌谱）：步骤名与 .lb-hint——悬浮条的步骤名与提示 title 必须与它逐字相同（同源 lbSteps / lbCur） */
    const cl = await open(1280, 800, { tag: 'M20-classic', url: CLASSICU });
    await scn(cl, 'newpacc'); await wait(cl, 300);
    const lb = await EV(cl, () => ({ steps: [...document.querySelectorAll('#lb-wrap .lb-steps li > span')].map(x => x.textContent), hint: (document.querySelector('#lb-wrap .lb-hint') || {}).textContent || '' }));
    await close(cl);
    for (const [w, h] of [[1280, 800], [1180, 800], [1440, 900]]) {
      const pg = await open(w, h, { tag: 'M20-' + w });
      await scn(pg, 'newpacc'); await wait(pg, 300); const base = await redBase(pg);
      const a = await EV(pg, () => { const f = lbInfo(song, lbMeta()), c = lbCur(f), hi = document.querySelector('#flw-sbar #flw-sb-hint');
        return { rs: document.body.classList.contains('flw-rs'), bar: __vis('#flw-sbar .flw-sb-bar'), steps: [...document.querySelectorAll('#flw-sbar .flw-sb-steps li .flw-sb-t')].map(x => x.textContent.replace(/^已完成：/, '')),
          fsteps: f.steps.map(x => x.t), hint: hi ? hi.textContent : null, hintVis: __vis(hi), title: hi ? hi.title : '', chint: c.hint || '',
          cur: (document.querySelector('#flw-sbar .flw-sb-steps li[aria-current="step"]') || {}).className || '', page: FLOW.rd.page(), dock: document.body.classList.contains('flw-rd'),
          gone: !document.getElementById('flw-start') && !document.getElementById('flw-next') && !document.querySelector('.flw-stp-i') }; });
      await shot(pg, 'M20-sbar-' + w);
      /* v68.7 S1 迁移（规格 B2）：原「条上步名＝lbInfo 全名＝经典 .lb-steps；提示「点旋律行，按数字键写音」；title＝经典 .lb-hint 原文」→
         条上 2 字步名（＝lbInfo 全名按 STEP2 换算，经典 .lb-steps 仍是全名＝lbInfo 同源）；提示「按 1–7 写音」、title＝同一句（P2）；经典 .lb-hint 原文照旧＝lbCur（旧外壳零差异）。
         修前红修后绿：改前条上是全名、提示是旧句、title 是长句 */
      const S2 = { '写旋律': '旋律', '配和弦与伴奏': '伴奏', '选织体': '织体', '生成六线谱': '吉他', '调把位与扫弦': '节奏', '标和弦': '和弦' };
      T('M20', a.bar && a.gone && J(a.steps) === J(a.fsteps.map(t => S2[t] || t)) && J(a.fsteps) === J(lb.steps) && a.cur === 'now' && a.hint === '按 1–7 写音' && a.hintVis
        && a.title === a.hint && a.chint === lb.hint && !!lb.hint && a.rs && !a.dock && a.page === 'prop',
        'M20a ' + w + '×' + h + (w < 1280 ? '（窄档）' : '（右栏竖条；v69.1 D5 起 1440 也是竖条）') + '：悬浮条步骤「' + a.steps.join(' › ') + '」＝lbInfo 步名的 2 字名（lbInfo＝经典谱型条 .lb-steps）；当前步提示「' + a.hint + '」（≤12 字），title＝同一句；经典 .lb-hint 原文不动（同源 lbCur）；'
        + '落地右栏停在「属性」页；没有行 2 起步组 / ⓘ / 「下一步」卡',
        J({ a, lb }));
      await redEnd('M20', pg, base, []);
      await close(pg);
    }
  }));

  /* ================= M21 SH-4 撤销在行首、Tab 顺序 ================= */
  if (want('M21')) jobs.push(() => SAFE('M21', 'M21', async () => {
    const pg = await open(1280, 800, { tag: 'M21' });
    await scn(pg, 'newpacc'); await wait(pg, 300); const base = await redBase(pg);
    /* v68.3 迁移：行 2 没有起步组了（起步在谱面上方的悬浮条）——模式条 < 撤销 < 第一个工具段，Tab：模式条 → 撤销 / 重做 → 行 2 第一个工具 */
    const a = await EV(pg, () => { const eb = document.getElementById('editbar'), ch = [...eb.children], ix = id => ch.indexOf(document.getElementById(id));
      const firstTool = ch.findIndex(e => e.id && /^(ebu-|eb-)/.test(e.id) && e.id !== 'seg-undo' && __vis(e));
      const ft = firstTool >= 0 ? ch[firstTool] : null;
      return { modes: ix('flw-modes'), undo: ix('seg-undo'), start: document.getElementById('flw-start') ? 1 : 0, firstTool, ftId: ft && ft.id, xm: __R('#flw-modes'), xu: __R('#seg-undo'), xf: ft ? __R(ft) : null,
        firstBtn: ft ? ((ft.tagName === 'BUTTON' ? ft : [...ft.querySelectorAll('button')].find(b => __vis(b))) || {}).id || '' : '' }; });
    T('M21', a.modes >= 0 && a.modes < a.undo && a.firstTool > a.undo && !a.start && a.xm.r <= a.xu.x + 1 && !!a.xf && a.xu.r <= a.xf.x + 1,
      'M21a 撤销段 #seg-undo 的 DOM 在 #editbar 行首：模式条（' + a.modes + '）< 撤销（' + a.undo + '）< 第一个工具段（' + a.firstTool + ' ' + a.ftId + '）；视觉 x 同序；行 2 没有起步组', J(a));
    await EV(pg, () => document.getElementById('flw-mode-write').focus());
    const seq = ['flw-mode-write'];
    for (let i = 0; i < 6; i++) { await pg.keyboard.press('Tab'); await wait(pg, 60);
      const t = await EV(pg, () => { const e = document.activeElement; return e ? (e.id || (e.dataset.fa || e.className || e.tagName)) : null; });
      seq.push(t); if (t && !/^b-(undo|redo)$/.test(t)) break; }
    const iu = seq.indexOf('b-undo'), last = seq[seq.length - 1];
    T('M21', iu === 1 && seq.slice(1, -1).every(x => /^b-(undo|redo)$/.test(x)) && !!a.firstBtn && last === a.firstBtn,
      'M21b 真实 Tab 顺序：模式条（当前步）→ 撤销 / 重做 → 行 2 第一个工具（' + a.firstBtn + '），中间没有别的', seq.join(' → '));
    await pg.keyboard.press('Shift+Tab'); await wait(pg, 60);
    await redEnd('M21', pg, base, []);
    await close(pg);
  }));

  /* ================= M22 三步口径 ================= */
  if (want('M22')) jobs.push(() => SAFE('M22', 'M22', async () => {
    const pg = await open(1280, 800, { tag: 'M22' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const a = await EV(pg, () => ({ tabs: [...document.querySelectorAll('#flw-modes [role="tab"]')].map(x => x.id + ':' + x.textContent.trim()), lab: document.getElementById('flw-modes').getAttribute('aria-label'),
      modes: FLOW.mode.MODES.map(x => x.m).join(), play: setMode('play'), cur: FLOW.mode.cur,
      pages: ['write', 'engrave', 'output'].map(m => FLOW.rd.pagesFor(m).map(p => p.p + ':' + p.t).join('/')).join(' | ') }));
    T('M22', J(a.tabs) === J(['flw-mode-write:书写', 'flw-mode-engrave:排版', 'flw-mode-output:输出']) && a.modes === 'write,engrave,output' && a.play === false && a.cur === 'write' && /书写 › 排版 › 输出/.test(a.lab) && !/prac|练习/.test(a.pages),
      'M22a #flw-modes 恰好 3 个 tab（书写 / 排版 / 输出）、读屏名「' + a.lab + '」；FLOW.mode.MODES 三步、setMode(\'play\') 无效；右栏页表没有「练习」', J(a));
    /* 界面文字扫描：三种模式下 body 可见文字 + flow 容器内的读屏名 / title / data-why + 命令表 + 「书写 ▾」菜单 */
    const BAD = /四步|播放(步|模式)|「播放」(步|模式)|播放\s*›|›\s*播放|练习页|「练习」页/;
    const scan = () => EV(pg, () => { const s = [document.body.innerText];
      document.querySelectorAll('#flw-r1 *, #editbar *, #flw-left *, #right-dock *, #flw-rstrip *, #mixer-dock *, #popmenu *').forEach(e => ['title', 'aria-label', 'data-why', 'placeholder'].forEach(k => { const v = e.getAttribute && e.getAttribute(k); if (v) s.push(v); }));
      return s.join('\n'); });
    const hits = [];
    for (const m of ['write', 'engrave', 'output']) { if (m !== 'write') await clickMode(pg, m); const t = await scan(); const mm = t.match(BAD); if (mm) hits.push(m + ':' + mm[0] + '…' + t.slice(Math.max(0, mm.index - 20), mm.index + 20)); }
    await clickMode(pg, 'write');
    const cmd = await EV(pg, () => FLOW.cmd.list().map(c => [c.id, c.t, c.k, typeof c.w === 'function' ? c.w() : c.w].join(' ')).join('\n'));
    const cm = cmd.match(BAD); if (cm) hits.push('命令表:' + cm[0]);
    const playMode = await EV(pg, () => FLOW.cmd.list().filter(c => /^mode:/.test(c.id)).map(c => c.id));
    await pg.setViewportSize({ width: 1180, height: 800 }); await wait(pg, 500);
    await pg.click('#flw-mdd'); await wait(pg, 200);
    const mdd = await EV(pg, () => { const m = document.getElementById('popmenu'); return m ? { n: m.querySelectorAll('[role="menuitemradio"]').length, t: m.textContent } : null; });
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    if (mdd && BAD.test(mdd.t)) hits.push('书写▾:' + mdd.t.match(BAD)[0]);
    T('M22', !hits.length && !!mdd && mdd.n === 3 && /书写/.test(mdd.t) && /排版/.test(mdd.t) && /输出/.test(mdd.t) && playMode.every(x => /^mode:(write|engrave|output)$/.test(x)),
      'M22b 三种模式下界面文字 / 读屏名 / title / 命令表（' + cmd.split('\n').length + ' 条）/「书写 ▾」菜单（' + (mdd && mdd.n) + ' 项）里没有「播放」步或模式、没有「四步」、没有「练习」页；命令表的模式条目只有 ' + J(playMode),
      hits.length ? hits.join('；') : '');
    await redEnd('M22', pg, base, []);
    await close(pg);
  }));

  /* ================= M23 不带开关零差异（对拍基线）================= */
  const runDefault = async (url, fn, w = 1280, h = 800) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message));
    await pg.goto(url); await pg.waitForTimeout(1500);
    let r = null; try { r = await pg.evaluate(fn); } catch (e) { r = { ERR: e.message.split('\n')[0] }; }
    await ctx.close(); return { r, pe };
  };
  /* v68.2 切默认（PLAN §5.4）：被测页改为 ?shell=classic 的旧外壳，基线仍是 shellflow_ref.json 提交（v68.1 a8c2089）不带开关的默认外壳（＝旧外壳）。
     显式例外：musetab-flow（旧外壳写 '0'、基线不写）——G_keys 对拍时两边都去掉，M23a 另断言值为 '0'。本场景路径不经过本版其余有意改动
     （偏好设置「使用旧版布局」· TRK-5 音量 0 · TRK-6 删吉他轨 · PN-5 转调小节音名），其余必须零差异。
     v68.7 简约化：对旧外壳没有有意改动、不加例外（M19–M22 的旧外壳提示逐条对拍照旧；共享代码改动逐条登记在 tv_shellflow S0 ⑦） */
  const noFlowKey = k => String(k || '').split(',').filter(x => x && x !== 'musetab-flow').join(',');
  if (want('M23')) jobs.push(() => SAFE('M23', 'M23', async () => {
    const B = await runDefault(CLASSICU, M23SCN);
    const inv = B.r && B.r.G_inv ? JSON.parse(B.r.G_inv) : null;
    const keysBad = B.r && B.r.G_keys ? B.r.G_keys.split(',').filter(k => PREV_FLOW_KEYS.concat(NEW_KEYS).includes(k) && k !== 'musetab-flow') : ['?'];
    T('M23', !!inv && inv.flowNodes === 0 && !inv.bodyFlw.length && inv.mode === null && inv.mounted === false && inv.pvTi === null && !keysBad.length && B.r.G_flow === '0' && !B.pe.length && !B.r.ERR,
      'M23a 旧外壳（?shell=classic）跑完 v68.1 动过的全部共享路径（行尾 ○＋− · 打印 / 导出弹窗 7 键 · 预览 Esc · Alt+N · 拖放 · 小节格 · Esc）后：FLOW 未挂载、没有 flow 节点 / 类、body 无 data-mode、#pv-stage 无 tabindex、musetab-flow 停在 \'0\'、不写其余 flow 本机键、无报错',
      J({ inv, keysBad, flow: B.r && B.r.G_flow, pe: B.pe, err: B.r && B.r.ERR }));
    const sane = B.r && /setPrintPage\(A4L\)/.test(B.r.B_print) && /print/.test(B.r.B_print) && /fn:exportPNG\(2\)/.test(B.r['B_ex-png']) && /ev:export_png/.test(B.r['B_ex-png'])
      && B.r.C_altn === 'false|false' && /preview/.test(B.r.C_mask || '') && B.r.D_altn.split('|')[1] === 'true' && /"a":4,"b":4/.test(B.r.E_click) && /"a":2,"b":5/.test(B.r.E_drag);
    T('M23', !!sane, 'M23b 默认外壳行为自洽（与基线对拍之外的绝对断言）：打印＝setPrintPage(所选纸张) 后 print；PNG＝export_png + exportPNG(2)；预览开着 Alt+N 不响应、拖放提示「先关掉打印预览」；关着 Alt+N 开新建面板；小节格单击＝单小节循环、拖动＝循环选区',
      B.r ? J({ print: B.r.B_print, png: B.r['B_ex-png'], altn: [B.r.C_altn, B.r.D_altn], click: (B.r.E_click || '').slice(0, 60), drag: (B.r.E_drag || '').slice(0, 60) }) : '');
    if (!refURL && IN_CI) { T('M23', false, 'M23c CI 里拿不到对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：判红', 'deploy.yml 先 git fetch --depth=1 origin <shellflow_ref.json 的 commit>'); return; }
    if (!refURL) { NOTE('M23', '⚠️  M23c 与 ' + (REF.version || '基线') + ' 对拍跳过：拿不到参考（本地可设 MUSETAB_REF=参考 index.html；MUSETAB_REF=none 为显式跳过）'); return; }
    const A = await runDefault(refURL, M23SCN);
    const norm = r => { if (!r) return r; const o = Object.assign({}, r); o.G_keys = noFlowKey(o.G_keys); delete o.G_flow; return o; };
    const RA = norm(A.r), RB = norm(B.r);
    const ks = [...new Set([...Object.keys(RA || {}), ...Object.keys(RB || {})])].filter(k => k !== 'G_inv');
    const bad = ks.filter(k => (RA || {})[k] !== (RB || {})[k]).map(k => { const x = String((RA || {})[k]), y = String((RB || {})[k]); let i = 0; while (i < x.length && x[i] === y[i]) i++;
      return k + ' @' + i + ' ref=' + J(x.slice(Math.max(0, i - 20), i + 60)) + ' new=' + J(y.slice(Math.max(0, i - 20), i + 60)); });
    T('M23', !bad.length && !A.pe.length && !(A.r && A.r.ERR), 'M23c 旧外壳（?shell=classic）与基线 ' + (REF.version || '') + '（' + REF_COMMIT.slice(0, 7) + '）不带开关的默认外壳逐项相同（例外仅 musetab-flow 键）：行尾 ○＋− 写入 / 提示 / 撤销 · 打印 / 导出弹窗 HTML 与 7 键的调用 / 事件 / 关窗顺序 · 预览开关与 Esc · Alt+N 拦 / 放 · 拖放提示层 HTML 与拦截提示 · 小节格单击 / 再点 / 拖动 / Shift 单击（循环 · 光标 · 选区 · 格子 HTML）· Esc · musetab-* 键 · 全部提示文案',
      bad.length ? bad.join('\n      ') : ks.length + ' 项');
  }));

  /* ================= M24 v68.1 收尾 · 三步模式与排版 / 输出（验收 MODES-1…10）================= */
  const rowsOf = pg => EV(pg, () => __pagedRows().map(r => [r[0], r[r.length - 1]]));
  const rowAt = (R, mi) => R.find(r => mi >= r[0] && mi <= r[1]) || null;
  const pvSel = pg => EV(pg, () => { const el = document.querySelector('#pv-pages .flw-pvs'), ps = document.getElementById('pv-stage'); if (!el || !ps) return null;
    const a = el.getBoundingClientRect(), b = ps.getBoundingClientRect(); return { box: [Math.round(a.top), Math.round(a.bottom)], stage: [Math.round(b.top), Math.round(b.bottom)], st: ps.scrollTop, inView: a.bottom > b.top + 4 && a.top < b.bottom - 4 }; });
  /* v69.1 B 迁移（规格 §4 B2.3）：新形态行 1「发布」直接出发布进度弹层（同一 #popmenu 机制）——同样量定宽不爬；说明句全删（P1）：不再有「本机演示…」长句，
     本机演示时主动作字「本机发布」；?next=0 跑原断言（右栏发布卡 → 发布浮层，本机演示说明指「输出」） */
  if (want('M24')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M24', 'M24a' + (nx0 ? ' ?next=0' : ''), async () => {
    /* MODES-1 / MODES-9：1440 停靠，行 1「发布」→ 右栏发布卡「存入并提交发布」（右缘贴近视口，x≈1198）：发布浮层定宽、不往左爬；本机演示说明指向「输出」 */
    const pg = await open(1440, 900, { tag: 'M24a' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    await pg.click('#flw-pub');
    if (nx0) { await wait(pg, 450); await pg.click('#flw-pub-go'); }
    const t = [], at = [120, 600, 1600];
    for (let i = 0; i < at.length; i++) { await wait(pg, at[i] - (i ? at[i - 1] : 0));
      t.push(await EV(pg, () => { const p = document.getElementById('popmenu'); if (!p) return null; const r = p.getBoundingClientRect();
        return { l: Math.round(r.left), w: Math.round(r.width), r: Math.round(r.right), vw: document.documentElement.clientWidth, txt: p.textContent.replace(/\s+/g, ' ') }; })); }
    await shot(pg, 'M24-publish-1440' + (nx0 ? '-nx0' : ''));
    T('M24', t.every(x => x) && t.every(x => x.l === t[0].l && x.w === t[0].w) && t[0].w <= 340 && t[0].r <= t[0].vw - 7.5 && t[0].l >= 8,
      'M24a ' + (nx0 ? '（?next=0）' : '（新形态：行 1 发布弹层）') + 'MODES-1 发布卡弹出的发布浮层定宽、不往左爬：0.12 / 0.6 / 1.6 秒 left / width 都是 ' + (t[0] ? t[0].l + ' / ' + t[0].w : '-') + '，右缘离视口 ≥8（此前 1.3 秒爬到 1032 宽盖住谱面）', J(t.map(x => x && [x.l, x.w, x.r])));
    const txt = (t[0] || {}).txt || '';
    if (nx0) T('M24', /在「输出」里用/.test(txt) && !/打印\/导出/.test(txt), 'M24b（?next=0）MODES-9 本机演示说明：互动谱 / 分享卡去「输出」里找（flow 下没有「打印/导出」弹窗入口，与右栏发布卡同一口径）', txt.slice(0, 120));
    else T('M24', /本机发布/.test(txt) && /存入/.test(txt) && !/先自动存入|提交后进入|当前为本机演示|打印\/导出/.test(txt), 'M24b（新形态）发布弹层没有说明句（P1：「先自动存入…」「提交后进入平台审核…」「当前为本机演示…」都不出），本机演示时主动作字「本机发布」', txt.slice(0, 120));
    await EV(pg, () => { try { closePop(); } catch (_) {} try { setMode('write'); } catch (_) {} });
    await redEnd('M24', pg, base, ['S.id', 'S.updatedAt', 'S.savedAt', 'S.createdAt']);
    await close(pg);
  }));
  /* v69.1 B 迁移：同一组断言两种形态各跑——?next=0 点行 2 #flw-eng，新形态点悬浮条（每行 ±，#flw-eng-bars 同 id 读数）与行工具条（换行 / 并入 / 锁定同 id） */
  if (want('M24')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M24', 'M24c' + (nx0 ? ' ?next=0' : ''), async () => {
    /* MODES-2 / MODES-7 / MODES-4：64 小节，光标第 13 小节（第 3 行），行 2 排版工具真实点击；行按分页口径（__pagedRows＝预览 / 打印同一份） */
    const pg = await open(1440, 900, { tag: 'M24c' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await scn(pg, 'long', { mi: 12 }); const base = await redBase(pg);
    await clickMode(pg, 'engrave');
    const st = () => EV(pg, () => ({ j: J2(song), u: undoStack.length, toast: __toasts.slice(-1)[0] || '', bars: document.getElementById('flw-eng-bars').textContent }));
    const R0 = await rowsOf(pg), r0 = rowAt(R0, 12), s0 = await st(), before = J(R0.filter(r => r[1] < r0[0])), n0 = r0[1] - r0[0] + 1;
    await engClick(pg, 'lay:bars', 'd', '1'); await wait(pg, 700);
    const R1 = await rowsOf(pg), r1 = rowAt(R1, 12), s1 = await st();
    T('M24', !!r1 && r1[0] === r0[0] && r1[1] === r0[1] + 1 && J(R1.filter(r => r[1] < r0[0])) === before && s1.u === s0.u + 1 && s1.bars === (n0 + 1) + ' 小节' && /移入本行/.test(s1.toast),
      'M24c ' + X + 'MODES-2「每行 ＋」：当前行第 ' + (r0[0] + 1) + '–' + (r0[1] + 1) + ' 小节 → 第 ' + (r0[0] + 1) + '–' + (r0[1] + 2) + ' 小节（' + n0 + '→' + (n0 + 1) + ' 小节，计数「' + s1.bars + '」），前面的行不动，一步撤销', J({ r0, r1, toast: s1.toast }));
    await pg.keyboard.press('Control+z'); await wait(pg, 600);
    const su = await st();
    await engClick(pg, 'lay:bars', 'd', '-1'); await wait(pg, 700);
    const R2 = await rowsOf(pg), r2 = rowAt(R2, r0[0]);
    T('M24', su.j === s0.j && !!r2 && r2[0] === r0[0] && r2[1] === r0[1] - 1 && J(R2.filter(r => r[1] < r0[0])) === before,
      'M24d ' + X + '「每行 −」：本行少一个小节、行首不动、前面的行不动；上一步 Ctrl+Z 逐字节复原', J({ r2, undoExact: su.j === s0.j }));
    await pg.keyboard.press('Control+z'); await wait(pg, 600);
    await EV(pg, mi => FLOW.lay.pick(mi, 0), r0[0] + 2); await wait(pg, 150);
    await engClick(pg, 'lay:brk'); await wait(pg, 700);
    const R3 = await rowsOf(pg);
    T('M24', R3.some(r => r[0] === r0[0] + 2) && J(R3.filter(r => r[1] < r0[0])) === before,
      'M24e ' + X + 'MODES-7「此处换行」：第 ' + (r0[0] + 3) + ' 小节起另起一行，前面已排好的行不变（' + JSON.parse(before).map(r => (r[0] + 1) + '–' + (r[1] + 1)).join(' ') + '）', J(R3.slice(0, 5)));
    await pg.keyboard.press('Control+z'); await wait(pg, 600);
    const p0 = rowAt(R0, r0[0] - 1);
    await EV(pg, mi => FLOW.lay.pick(mi, 0), r0[0]); await wait(pg, 150);
    await engClick(pg, 'lay:join'); await wait(pg, 700);
    const R4 = await rowsOf(pg);
    T('M24', R4.some(r => r[0] === p0[0] && r[1] === r0[0]) && J(R4.filter(r => r[1] < p0[0])) === J(R0.filter(r => r[1] < p0[0])),
      'M24f ' + X + 'MODES-7「并入上一行」：第 ' + (r0[0] + 1) + ' 小节并到上一行行尾（上一行第 ' + (p0[0] + 1) + '–' + (r0[0] + 1) + ' 小节），更前面的行不变', J(R4.slice(0, 5)));
    await pg.keyboard.press('Control+z'); await wait(pg, 600);
    /* MODES-4：行首「此处换行」（行首小节前一小节 brk=1）→ 锁定 → 改回自动：手动换行保留；不带手动换行时锁定再解锁逐字节还原 */
    await EV(pg, mi => FLOW.lay.pick(mi, 0), r0[0]); await wait(pg, 150);
    const pre = await EV(pg, m1 => ({ brk: song.measures[m1 - 1].brk || 0, pull: song.measures[m1].pull || 0 }), r0[0]);
    await engClick(pg, 'lay:brk'); await wait(pg, 600);
    const mb = await EV(pg, m1 => song.measures[m1 - 1].brk, r0[0]);
    await engClick(pg, 'lay:lock'); await wait(pg, 600);
    const lk = await EV(pg, () => document.getElementById('flw-eng-lock').getAttribute('aria-pressed'));
    await engClick(pg, 'lay:lock'); await wait(pg, 600);
    const ul = await EV(pg, m1 => ({ brk: song.measures[m1 - 1].brk, toast: __toasts.slice(-1)[0] }), r0[0]);
    T('M24', pre.brk !== 1 && mb === 1 && lk === 'true' && ul.brk === 1, 'M24g ' + X + 'MODES-4 行首点「此处换行」（measures[' + (r0[0] - 1) + '].brk=1）→ 锁定此行 → 再点改回自动：锁定前手动加的换行保留（此前一起删掉）', J({ pre, mb, lk, ul }));
    for (let i = 0; i < 3; i++) { await pg.keyboard.press('Control+z'); await wait(pg, 450); }
    const s2 = await st();
    await EV(pg, mi => FLOW.lay.pick(mi, 0), r0[0] + 1); await wait(pg, 150);
    await engClick(pg, 'lay:lock'); await wait(pg, 600); await engClick(pg, 'lay:lock'); await wait(pg, 600);
    const s3 = await st();
    T('M24', s2.j === s0.j && s3.j === s0.j, 'M24h ' + X + '撤销回初值后：不带手动换行时「锁定此行」再改回自动 → 谱数据逐字节还原', J({ undoBack: s2.j === s0.j, lockUnlock: s3.j === s0.j }));
    await EV(pg, () => setMode('write'));
    await redEnd('M24', pg, base, []);
    await close(pg);
  }));
  if (want('M24')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M24', 'M24i' + (nx0 ? ' ?next=0' : ''), async () => {
    /* MODES-3：右栏「版式」滑杆（搬入的 #layout-pop）只按下不拖 / 在端点按键：不记撤销点、不留标记；真拖动只记一笔；行 2「内容 ＋」也只记一笔 */
    const pg = await open(1440, 900, { tag: 'M24i' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    await scn(pg, 'songbie', { mi: 2 }); const base = await redBase(pg);
    await EV(pg, () => setMode('engrave', { page: 'lay' })); await wait(pg, 600);
    const u0 = await EV(pg, () => undoStack.length);
    await EV(pg, () => { const r = document.getElementById('lp-notegap'); ['pointerdown', 'pointerup'].forEach(t => r.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1 })));
      r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); r.dispatchEvent(new KeyboardEvent('keyup', { key: 'Home', bubbles: true })); });
    const u1 = await EV(pg, () => ({ u: undoStack.length, arm: document.getElementById('lp-notegap').getAttribute('data-flw-arm') }));
    const j1 = await EV(pg, () => J2(song));
    await EV(pg, () => { const r = document.getElementById('lp-notegap'); r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
      r.value = String(Math.min(+r.max, +r.value + 0.2)); r.dispatchEvent(new Event('input', { bubbles: true }));
      r.value = String(Math.min(+r.max, +r.value + 0.1)); r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); r.dispatchEvent(new Event('change', { bubbles: true })); });
    const u2 = await EV(pg, () => ({ u: undoStack.length, arm: document.getElementById('lp-notegap').getAttribute('data-flw-arm'), ng: (song.layout || {}).noteGap }));
    await EV(pg, () => undo()); await wait(pg, 300);
    const j2 = await EV(pg, () => J2(song));
    const u3 = await EV(pg, () => undoStack.length);
    /* v69.1 集成（A 轨 D5）：新形态「版式」页默认收在带字竖条里——真点竖条「版式」浮出（点不到即超时判红），再点「内容 ＋」 */
    if (!nx0 && !(await EV(pg, () => FLOW.rd.dockOn()))) { await pg.click('#flw-rstrip [data-fa="rd:tab"][data-p="lay"]'); await wait(pg, 300); }
    await engClick(pg, 'lay:scale', 'd', '1'); await wait(pg, 600);   /* v69.1 B：新形态「内容 ＋」在右栏「版式」页（内容大小 − 值 ＋，同 lay:scale 路径）；?next=0 在行 2 */
    const u4 = await EV(pg, () => ({ u: undoStack.length, sc: (song.layout || {}).scale }));
    T('M24', u1.u === u0 && !u1.arm && u2.u === u0 + 1 && !u2.arm && j2 === j1 && u4.u === u3 + 1 && Math.abs(u4.sc - 1.1) < 1e-9,
      'M24i ' + (nx0 ? '（?next=0）' : '（新形态）') + 'MODES-3 版式滑杆只按下不拖 / 端点按 Home：撤销栈不变、不留标记；真拖动（两次 input＋change）记一步，一次 Ctrl+Z 正好退回拖动前；' + (nx0 ? '行 2' : '版式页') + '「内容 ＋」也只记一步', J({ u0, u1, u2, back: j2 === j1, u3, u4 }));
    await EV(pg, () => setMode('write'));
    await redEnd('M24', pg, base, ['S.layout', 'L.page', 'L.preset', 'L.density', 'L.scale', 'L.noteGap', 'L.rowGap']);
    await close(pg);
  }));
  if (want('M24')) jobs.push(() => SAFE('M24', 'M24j', async () => {
    /* MODES-5：64 小节，光标第 43 小节，进排版（预览滚到当前行）→ 点「A5」：当前行框仍在 #pv-stage 可视区 */
    const pg = await open(1440, 900, { tag: 'M24j' });
    await scn(pg, 'long', { mi: 42 }); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 300);
    const a = await pvSel(pg);
    await engClick(pg, 'lay:page', 'v', 'A5'); await wait(pg, 1000);   /* v69.1 B：新形态走悬浮条「A4 ▾」菜单 */
    const b2 = await pvSel(pg);
    await shot(pg, 'M24-A5-follow');
    T('M24', !!a && a.inView && !!b2 && b2.inView, 'M24j MODES-5 排版里改纸张 A5（页面几何变了）：正在操作的当前行框仍在预览可视区（重拍前看得见、重拍后看不见就滚回来；此前只按像素放回滚动）', J({ a, b2 }));
    await EV(pg, () => setMode('write'));
    await redEnd('M24', pg, base, ['S.layout', 'L.page', 'L.preset', 'L.density', 'L.scale', 'L.noteGap', 'L.rowGap']);
    await close(pg);
  }));
  if (want('M24')) jobs.push(() => SAFE('M24', 'M24k', async () => {
    /* MODES-6：纯键盘——模式条 → 再 Enter 进排版：焦点进预览（tabindex 0），PageDown 滚动预览；Shift+Tab 回到模式条当前那一步 */
    const pg = await open(1280, 800, { tag: 'M24k' });
    await scn(pg, 'long', { mi: 5 }); const base = await redBase(pg);
    await EV(pg, () => document.getElementById('flw-mode-write').focus());
    await pg.keyboard.press('ArrowRight'); await wait(pg, 80); await pg.keyboard.press('Enter'); await wait(pg, 800);
    const a = await EV(pg, () => ({ cur: FLOW.mode.cur, ae: (document.activeElement || {}).id, ti: document.getElementById('pv-stage').getAttribute('tabindex'), st: document.getElementById('pv-stage').scrollTop }));
    await pg.keyboard.press('PageDown'); await wait(pg, 300);
    const b2 = await EV(pg, () => ({ st: document.getElementById('pv-stage').scrollTop, cur: FLOW.mode.cur }));
    await pg.keyboard.press('Shift+Tab'); await wait(pg, 150);
    const c = await EV(pg, () => (document.activeElement || {}).id);
    T('M24', a.cur === 'engrave' && a.ae === 'pv-stage' && a.ti === '0' && b2.st > a.st && b2.cur === 'engrave' && c === 'flw-mode-engrave',
      'M24k MODES-6 键盘在模式条 → Enter 进排版：焦点落预览（tabindex 0），PageDown 滚动 ' + a.st + '→' + b2.st + '、不切模式；Shift+Tab 回到模式条「排版」', J({ a, b2, c }));
    await EV(pg, () => setMode('write'));
    await redEnd('M24', pg, base, []);
    await close(pg);
  }));
  if (want('M24')) jobs.push(() => SAFE('M24', 'M24l', async () => {
    /* MODES-8（R1）：排版里每改一笔只排两次整谱（mutate 一次 + 快照分页一次；此前另有一次「复原」排版）；回书写补排一次，书写谱面与正常 render 逐字节相同 */
    const pg = await open(1440, 900, { tag: 'M24l' });
    await scn(pg, 'long', { mi: 12 }); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 400);
    await EV(pg, () => { window.__rc = 0; const r0 = render; render = function () { __rc++; return r0.apply(this, arguments); }; });
    await engClick(pg, 'lay:bars', 'd', '-1'); await wait(pg, 900);   /* v69.1 B：新形态在悬浮条 */
    const n1 = await EV(pg, () => __rc);
    await clickMode(pg, 'write');
    const w = await EV(pg, () => { const s = document.getElementById('score'), a = s.innerHTML, n = __rc; render(); return { same: s.innerHTML === a, cur: FLOW.mode.cur, nBack: n }; });
    T('M24', n1 === 2 && w.same && w.cur === 'write' && w.nBack >= n1 + 1,
      'M24l MODES-8 排版里点一次「每行 −」：render 调用 ' + n1 + ' 次（v68.2 起＝mutate 那次转成快照 + 快照里那一次，真正整谱排版只有 1 次，见 M27a）；回书写补排后 #score 与再 render 一次逐字节相同', J({ n1, w }));
    await EV(pg, () => undo());
    await redEnd('M24', pg, base, []);
    await close(pg);
  }));
  if (want('M24')) jobs.push(() => SAFE('M24', 'M24m', async () => {
    /* MODES-10：纯和弦谱「输出内容」分谱不写「人声」 */
    const pg = await open(1440, 900, { tag: 'M24m' });
    await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} __one(__P('和弦进行示例')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await wait(pg, 200); const base = await redBase(pg);
    await clickMode(pg, 'output');
    const t = await EV(pg, () => ({ co: !!song.chordOnly, txt: [...document.querySelectorAll('#flw-out-list .flw-oli')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) }));
    T('M24', t.co && t.txt.length >= 2 && !t.txt.some(x => /人声/.test(x)) && t.txt.some(x => /和弦谱/.test(x)), 'M24m MODES-10 纯和弦谱（chordOnly）「输出内容」：分谱写谱名表的「和弦谱」，不写「人声 · 和弦」', J(t.txt));
    await EV(pg, () => setMode('write'));
    await redEnd('M24', pg, base, []);
    await close(pg);
  }));

  /* ================= M25 v68.1 收尾 · 右栏 / 行 2 / 窄档 / 手机 / 命令面板（验收 PN-1…9）================= */
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25a', async () => {
    /* v68.3 迁移：只有一句提示的谱类（没有起步步骤）——谱面上方的悬浮条在常用工具阶段，空谱提示可见（短），title＝LB_TIP（经典谱型条 .lb-tip 同源）；
       落地不再把右栏拉去「智能」页（停靠态停在默认「属性」页）；没有 ⓘ / 「下一步」卡 */
    /* v68.7 S1 迁移（规格 B2，README P2）：短提示换新句（≤12 字、不带句读），title＝同一句（原＝LB_TIP 长句；LB_TIP 仍在，经典谱型条用）。修前红修后绿：改前可见字与 title 都是旧句 */
    const SB_TIP = { gtr: '↑↓ 选弦 数字写品位', vocal: '按 1–7 写音', chord: '选一拍 Ctrl+K 写和弦' };
    const rows = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) {
      const pg = await open(w, h, { tag: 'M25a-' + w });
      for (const k of ['gtr', 'vocal', 'chord']) {
        await EV(pg, k => { window.guardReplace = p => p(); NWP.quickCreate(k); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); }, k);
        await wait(pg, 450);
        const a = await EV(pg, () => { const f = lbInfo(song, lbMeta()), hi = document.querySelector('#flw-sbar #flw-sb-hint');
          return { tip: f.tip || '', steps: !!f.steps, page: FLOW.rd.page(), dock: document.body.classList.contains('flw-rd'), ph: (document.getElementById('flw-sbar') || {}).dataset.ph,
            hint: hi ? hi.textContent : null, hv: __vis(hi), title: hi ? hi.title : '', next: !!document.getElementById('flw-next'), i: !!document.querySelector('.flw-stp-i') }; });
        rows.push({ w, k, a });
      }
      await shot(pg, 'M25-tip-' + w);
      await close(pg);
    }
    const ok = rows.every(r => !r.a.steps && !!r.a.tip && r.a.ph === 'tools' && r.a.hint === SB_TIP[r.k] && r.a.hv && r.a.title === r.a.hint && !r.a.next && !r.a.i
      && !r.a.dock && r.a.page === 'prop');
    T('M25', ok, 'M25a PN-1 只有一句提示的谱类（吉他弹唱 / 简谱歌谱 / 和弦谱）新建落地：谱面上方悬浮条在常用工具阶段、空谱提示可见（≤12 字）且 title＝同一句（v68.7；LB_TIP 仍有、经典谱型条用）；右栏停在「属性」页（v69.1 D5：1440 / 1280 都是竖条）；没有 ⓘ / 「下一步」卡',
      J(rows.map(r => [r.w, r.k, r.a.page, r.a.ph, r.a.hint, 'title=hint:' + (r.a.title === r.a.hint)])));
  }));
  if (want('M25')) for (const w of [821, 841, 861]) jobs.push(() => SAFE('M25', 'M25b ' + w, async () => {
    /* PN-2：821–861 宽新建钢琴伴奏歌谱：行 2 没有被「更多 ▾」盖住 / 裁到屏外的键；收起的键都在「更多 ▾」里（v68.3 起步收回悬浮条、行 2 没有起步组，断言不变） */
    const pg = await open(w, 800, { tag: 'M25b-' + w });
    await scn(pg, 'newpacc'); await wait(pg, 400); const base = await redBase(pg);
    const r = await EV(pg, () => { const eb = document.getElementById('editbar'), er = eb.getBoundingClientRect(), bad = [];
      [...eb.querySelectorAll('button')].filter(x => __vis(x)).forEach(x => { const q = x.getBoundingClientRect(); const at = document.elementFromPoint(Math.min(q.right - 3, innerWidth - 1), q.top + q.height / 2);
        if (q.right > er.right + 1 || (at && at !== x && !x.contains(at))) bad.push(x.id || (x.dataset.dur ? 'dur' + x.dataset.dur : x.dataset.fa || '?')); });
      const off = [...eb.querySelectorAll('.flw-off')].filter(x => x.tagName === 'BUTTON').map(x => x.id || 'dur' + x.dataset.dur);
      return { sw: eb.scrollWidth, cw: eb.clientWidth, ovf: eb.classList.contains('flw-r2-ovf'), bad, off, d8: __vis('#eb-dur [data-dur="8"]'), d4: __vis('#eb-dur [data-dur="4"]') }; });
    await pg.click('#flw-more'); await wait(pg, 250);
    const m = await EV(pg, () => (document.getElementById('popmenu') || {}).textContent || '');
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    const NAME = { dur8: '八分音符', dur16: '十六分音符', 'eb-add': '后插音符', 'eb-delcol2': '删音符', 'eb-octup': '高八度', 'eb-octdn': '低八度', 'eb-acc-s': '升号', 'eb-acc-f': '降号' };
    const miss = r.off.filter(k => NAME[k] && m.indexOf(NAME[k]) < 0);
    if (w === 821) await shot(pg, 'M25-r2-821');
    T('M25', r.sw <= r.cw + 1 && !r.ovf && !r.bad.length && r.d8 && r.d4 && !miss.length,
      'M25b PN-2 ' + w + ' 宽新建钢琴伴奏歌谱：行 2 不溢出、没有键被盖住或裁到屏外（八分 / 四分时值键可点），收起的键（' + r.off.filter(k => NAME[k]).join(' ') + '）都在「更多 ▾」里', J({ r, miss }));
    await redEnd('M25', pg, base, []);
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25c', async () => {
    /* PN-3：48 小节（送别 ×3）进密集标尺 → 点状态栏小节格打开小节选择面板：单击＝光标跳到当前轨该小节、Shift+单击＝当前轨整小节选区、拖动＝循环 */
    const pg = await open(1440, 900, { tag: 'M25c' });
    await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} const s = __P('送别'), m = s.measures; s.measures = m.concat(JSON.parse(J2(m)), JSON.parse(J2(m))); __one(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await wait(pg, 300); const base = await redBase(pg);
    const openPanel = async () => { const r = await EV(pg, () => { const p = document.getElementById('mx-prog').getBoundingClientRect(); return [p.left + p.width / 2, p.top + p.height / 2]; }); await pg.mouse.click(r[0], r[1]); await wait(pg, 250); };
    const cellP = mi => EV(pg, mi => { const c = document.querySelector('#mx-panel .mxc[data-mi="' + mi + '"]'); if (!c) return null; const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, mi);
    const dense = await EV(pg, () => progDense());
    await openPanel();
    const t = await EV(pg, () => ((document.querySelector('#mx-panel > .t') || {}).textContent || ''));
    const c30 = await cellP(30); if (c30) await pg.mouse.click(c30[0], c30[1]); await wait(pg, 300);
    const a = await EV(pg, () => ({ sel: [sel.row, sel.vi, sel.mi, sel.ci], loop: audio.loop, panel: !!document.getElementById('mx-panel') }));
    await openPanel();
    const c20 = await cellP(20); if (c20) { await pg.keyboard.down('Shift'); await pg.mouse.click(c20[0], c20[1]); await pg.keyboard.up('Shift'); } await wait(pg, 300);
    const b2 = await EV(pg, () => ({ sr: selRange, loop: audio.loop, panel: !!document.getElementById('mx-panel') }));
    await openPanel();
    const [d10, d12] = [await cellP(10), await cellP(12)];
    if (d10 && d12) { await pg.mouse.move(d10[0], d10[1]); await pg.mouse.down(); await pg.mouse.move(d12[0], d12[1], { steps: 4 }); await pg.mouse.up(); } await wait(pg, 300);
    const c = await EV(pg, () => ({ loop: audio.loop, mi: sel.mi, panel: !!document.getElementById('mx-panel') }));
    await EV(pg, () => { try { setLoop(null); } catch (_) {} try { closePop(); } catch (_) {} });
    await pg.click('#b-mxgrid'); await wait(pg, 250);   /* 状态栏 ▦（命令「小节选择面板」同一枚）打开的同一个面板：说明同样是 flow 口径 */
    const t2 = await EV(pg, () => ((document.querySelector('#mx-panel > .t') || {}).textContent || ''));
    await EV(pg, () => { try { closePop(); } catch (_) {} });
    T('M25', dense && /单击＝光标跳到/.test(t) && /单击＝光标跳到/.test(t2) && a.sel.join() === 'vox,0,30,0' && !a.loop && !a.panel
      && !!b2.sr && b2.sr.whole === true && b2.sr.m1 === 20 && b2.sr.m2 === 20 && !b2.loop && !b2.panel
      && !!c.loop && c.loop.a === 10 && c.loop.b === 12 && c.mi === 20 && c.panel,
      'M25c PN-3 48 小节（密集标尺）：小节选择面板说明写 flow 口径；单击第 31 格 → 光标跳到当前轨第 31 小节、不设循环、面板收起；Shift+单击第 21 格 → 当前轨整小节选区（whole）；拖第 11–13 格 → 循环、光标不动', J({ dense, t: t.slice(0, 40), a, b2: { sr: b2.sr, loop: b2.loop, panel: b2.panel }, c }));
    await redEnd('M25', pg, base, []);
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25d', async () => {
    /* PN-4：属性页「已加记号」列出六线谱拨片方向 / 打板 / 摇把 / 左右手指法与五线谱指法 / 谱号切换；拨片 × 与指法 × 清掉对应字段 */
    const pg = await open(1440, 900, { tag: 'M25d', init: PIN });   /* v69.1 D5：借停靠的属性页读「已加记号」→ 钉住 */
    await scn(pg, 'gtr', { row: 'tab' }); const base = await redBase(pg);
    const chips = () => EV(pg, () => [...document.querySelectorAll('#flw-rp-prop .flw-rx-mk [data-fa="rdp:unmark"]')].map(x => x.dataset.v));
    const t0 = await EV(pg, () => { const c = curCol(); const n = (c.notes || []).find(x => x.s === sel.si) || (c.notes || [])[0]; if (n) sel.si = n.s;
      c.pk = 'd'; c.perc = 'bass'; if (n) { n.bar = 'dive'; n.rhFing = 'i'; n.lhF = '2'; } render(); return { si: sel.si, n: !!n }; });
    await wait(pg, 200);
    const k1 = await chips();
    if (k1.includes('pick-down')) { await pg.click('#flw-rp-prop .flw-rx-mk [data-fa="rdp:unmark"][data-v="pick-down"]'); await wait(pg, 250); }
    const pk = await EV(pg, () => curCol().pk || null);
    await redEnd('M25', pg, base, ['C.pk', 'C.perc', 'N.bar', 'N.rhFing', 'N.lhF']);
    await scn(pg, 'piano', { mi: 1, ci: 0 }); const base2 = await redBase(pg);
    await EV(pg, () => { const c = curCol(); c.fing = '3'; c.clef = 'bass'; render(); }); await wait(pg, 200);
    const k2 = await chips();
    if (k2.includes('fingering')) { await pg.click('#flw-rp-prop .flw-rx-mk [data-fa="rdp:unmark"][data-v="fingering"]'); await wait(pg, 250); }
    const fg = await EV(pg, () => curCol().fing || null);
    const need1 = ['pick-down', 'perc', 'whammy', 'finger-rh', 'finger-lh'], need2 = ['fingering', 'clef'];
    T('M25', t0.n && need1.every(x => k1.includes(x)) && !pk && need2.every(x => k2.includes(x)) && !fg,
      'M25d PN-4 属性页「已加记号」：六线谱 下拨 / 打板 / 摇把 / 右手指 / 左手指、五线谱 指法 / 谱号切换都出芯片（此前写「无」）；下拨 × 清掉 c.pk、指法 × 清掉 c.fing', J({ k1, pk, k2, fg }));
    await redEnd('M25', pg, base2, ['C.fing', 'C.clef']);
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25e', async () => {
    /* PN-5：五线谱轨中途转调（第 5 小节起 G 大调）：光标在第 6 小节时音名键按本小节调——C D E F G A B 的角标 4 5 6 7 1 2 3，点「C」写音级 4（＝C） */
    const pg = await open(1280, 800, { tag: 'M25e' });
    await scn(pg, 'piano'); const base = await redBase(pg);
    await EV(pg, () => { song.key = 'C'; song.measures[4].keyTo = 'G'; const cs = song.measures[5].voxes[0]; sel = { mi: 5, row: 'vox', vi: 0, ci: Math.max(0, cs.findIndex(c => c && c.deg && c.deg !== 4)), si: 1 }; render(); });
    await wait(pg, 200);
    const k = await EV(pg, () => ({ ctx: FLOW.ctx(), keyAt: keyAt(sel.mi), btn: [...document.querySelectorAll('#eb-note > .nd')].filter(b => +b.dataset.nd >= 1 && +b.dataset.nd <= 7 && __vis(b)).map(b => {
      const l = b.querySelector('.flw-ltr'), t = (l && __vis(l)) ? l.textContent : (b.querySelector('.dg') || {}).textContent;
      return { nd: +b.dataset.nd, x: b.getBoundingClientRect().left, t: String(t || '').trim(), deg: (b.querySelector('.flw-deg') || {}).textContent || '' }; }).sort((a, b) => a.x - b.x) }));
    const at = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci }));
    const cb = k.btn.find(x => x.t === 'C');
    if (cb) await pg.click('#eb-note > .nd[data-nd="' + cb.nd + '"]'); await wait(pg, 250);
    const c1 = await EV(pg, at => __colAt(at.mi, at.ci, 'vox', 0).deg, at);
    T('M25', k.ctx === 'st' && k.keyAt === 'G' && k.btn.map(x => x.t).join(' ') === 'C D E F G A B' && k.btn.map(x => x.deg).join(' ') === '4 5 6 7 1 2 3' && c1 === 4,
      'M25e PN-5 转调小节（1=G）：音名键 C D E F G A B 的角标 4 5 6 7 1 2 3（按本小节调，此前按全曲 1=C 写着 1–7），点「C」写音级 4', J({ keyAt: k.keyAt, keys: k.btn.map(x => x.t + x.deg), deg: c1 }));
    await EV(pg, () => undo());
    await redEnd('M25', pg, base, ['M.keyTo']);
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25f', async () => {
    /* PN-6：命令「和弦图」「和弦写法」的可用性＝右栏「文字」页同一判据（没有吉他轨 / 没有和弦＝置灰并写原因，执行不改谱） */
    const pg = await open(1440, 900, { tag: 'M25f' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const a = await EV(pg, () => { const L = FLOW.cmd.list(), d = L.find(c => c.id === 'tx:diag'), n = L.find(c => c.id === 'tx:names');
      const j = J2(song), u = undoStack.length; FLOW.cmd.run(d); const same = J2(song) === j && undoStack.length === u;
      return { diag: d.ok(), names: n.ok(), same, rpDiag: !!document.querySelector('#flw-rp-text [data-fa="rdp:diag"]'), rpNames: !!document.querySelector('#flw-rp-text [data-fa="rdp:names"]') }; });
    await redEnd('M25', pg, base, []);
    await scn(pg, 'gtr');
    const b2 = await EV(pg, () => { const d = FLOW.cmd.list().find(c => c.id === 'tx:diag'); return { diag: d.ok(), rpDiag: !!document.querySelector('#flw-rp-text [data-fa="rdp:diag"]') }; });
    T('M25', !!a.diag && !!a.names && !a.rpDiag && !a.rpNames && a.same && b2.diag === '' && b2.rpDiag,
      'M25f PN-6 送别（无吉他轨、无和弦）：右栏不出「和弦图」「写法」，命令面板这两条也置灰（原因「' + a.diag + '」），执行不改谱、不留撤销；两只老虎（有吉他轨）两边都可用', J({ a, b2 }));
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25g', async () => {
    /* PN-7：<1280 左栏 56 竖条，轨多时底部有「+N ↓」 */
    const pg = await open(1000, 600, { tag: 'M25g' });
    await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} __one(createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 8, nTab: 2, nVox: 10, lyr: 1 })); render(); });
    await wait(pg, 400); const base = await redBase(pg);
    const r = await EV(pg, () => { const L = document.getElementById('flw-tlist'), m = L && L.querySelector('.flw-tmore'); const mr = m && m.getBoundingClientRect(), lr = L.getBoundingClientRect();
      return { nar: document.body.classList.contains('flw-narrow'), over: L.scrollHeight > L.clientHeight + 2, vis: !!m && __vis(m), t: m ? m.textContent : '', inList: !!mr && mr.bottom <= lr.bottom + 1 && mr.top >= lr.top }; });
    await shot(pg, 'M25-narrow-trk');
    T('M25', r.nar && r.over && r.vis && /^\+\d+ ↓$/.test(r.t) && r.inList, 'M25g PN-7 1000×600 十二条轨：左栏 56 竖条图标列放不下时底部吸「' + r.t + '」（此前滚动条与「还有 N 条」都隐藏，最后几条无从知道）', J(r));
    await redEnd('M25', pg, base, []);
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25h', async () => {
    /* PN-8：手机 390×844 选到第 30 小节跟滚：光标框底边离 64 高底条 ≥8 */
    const pg = await open(390, 844, { tag: 'M25h', touch: true, mobile: true });
    await scn(pg, 'trk3', { mi: 29, row: 'vox', vi: 2 }); await wait(pg, 300); const base = await redBase(pg);
    await EV(pg, () => { const sc = scoreScroller(); if (sc) sc.scrollTop = 0; else window.scrollTo(0, 0); });
    await wait(pg, 150);
    await EV(pg, () => { SEL_FOLLOW = true; render(); }); await wait(pg, 300);
    const r = await EV(pg, () => { const b = __curBox(), mb = document.getElementById('flw-mbar').getBoundingClientRect(); return { b, mbTop: Math.round(mb.top), gap: b ? Math.round(mb.top - b.bot) : null }; });
    T('M25', !!r.b && r.gap >= 8 && r.b.top >= 0, 'M25h PN-8 手机 390×844 跟滚到第 30 小节：光标框底边离底条 ' + r.gap + 'px（≥8；此前 0，下面的歌词行被底条盖住）', J(r));
    await redEnd('M25', pg, base, []);
    await close(pg);
  }));
  if (want('M25')) jobs.push(() => SAFE('M25', 'M25i', async () => {
    /* PN-9：命令面板拼音首字母撞码时三步模式 / 常用项在前 */
    const pg = await open(1440, 900, { tag: 'M25i' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const r = await EV(pg, () => { const f = q => { const h = FLOW.cmd.search(q).hits || []; return h.length ? h[0].id : null; }; return { sc: f('sc'), bf: f('bf'), hy: f('hy'), sd: f('sd'), zz: f('zz'), dy: f('打印') }; });
    T('M25', r.sc === 'mode:output' && r.bf === 'st:play' && r.hy === 'trk:mix' && r.sd === 'st:tempo' && r.zz === 'lay:A4' && r.dy === 'out:print',
      'M25i PN-9 命令面板同分时常用在前：sc→输出 · bf→播放 · hy→混音 · sd→速度 · zz→纸张 A4 · 打印→打印 / 存 PDF', J(r));
    await redEnd('M25', pg, base, []);
    await close(pg);
  }));

  /* ================= M26 v68.1 收尾 · 回归与红线（验收 RG-1…5）================= */
  if (want('M26')) jobs.push(() => SAFE('M26', 'M26a', async () => {
    /* RG-1：手机「播放设置 / 记号与时值」抽屉开着时导出互动谱的 DOM 快照：搬进抽屉的旧节点在快照里都在原位；快照后抽屉与节点照旧 */
    const pg = await open(390, 844, { tag: 'M26a', touch: true, mobile: true });
    await scn(pg, 'songbie'); await wait(pg, 300); const base = await redBase(pg);
    const rows = [];
    for (const [v, ids] of [['play', ['b-restart', 'i-tempo', 'mx-rate', 'b-metro']], ['pal', ['eb-dur']]]) {
      const r = await EV(pg, ([v, ids]) => { FLOW.mob.open(v); const html = FLOW.snapHTML(), d = new DOMParser().parseFromString(html, 'text/html');
        const sh = document.getElementById('flw-msheet');
        const res = { v, inSnap: ids.filter(id => !!d.getElementById(id)), sheetInSnap: !!d.getElementById('flw-msheet'), stillOpen: FLOW.mob.sheet === v, stillIn: ids.filter(id => sh && sh.contains(document.getElementById(id))) };
        FLOW.mob.close(); res.back = ids.filter(id => { const e = document.getElementById(id); return e && !sh.contains(e); }); return res; }, [v, ids]);
      r.ok = r.inSnap.length === ids.length && !r.sheetInSnap && r.stillOpen && r.stillIn.length === ids.length && r.back.length === ids.length;
      rows.push(r);
    }
    T('M26', rows.every(r => r.ok), 'M26a RG-1 手机「播放设置」「记号与时值」抽屉开着时 FLOW.snapHTML()：#b-restart #i-tempo #mx-rate #b-metro / #eb-dur 都在快照里（此前随 #flw-msheet 一起被删，收件人页面脚本崩溃）；快照后抽屉仍开着、节点仍在抽屉里，收起后归位', J(rows));
    await redEnd('M26', pg, base, []);
    await close(pg);
  }));
  if (want('M26')) jobs.push(() => SAFE('M26', 'M26b', async () => {
    /* RG-2：排版模式状态栏缩放 / 预览区 Ctrl+滚轮缩放预览，不动被盖住的书写谱面；点百分比回到适配宽度 */
    const pg = await open(1440, 900, { tag: 'M26b' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 300);
    const st = () => EV(pg, () => { const p = document.querySelector('#pv-pages .pv-page .pv-paper'), r = p.getBoundingClientRect();
      return { pw: Math.round(r.width), sw: Math.round(document.getElementById('score').getBoundingClientRect().width), vz: viewZoom, lbl: document.getElementById('zoom-lbl').textContent, fit: PV.fit }; });
    const a = await st();
    await pg.click('#z-in'); await wait(pg, 400);
    const b2 = await st();
    await pg.click('#zoom-lbl'); await wait(pg, 400);
    const c = await st();
    const ps = await EV(pg, () => { const r = document.getElementById('pv-stage').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await pg.mouse.move(ps[0], ps[1]); await pg.keyboard.down('Control'); await pg.mouse.wheel(0, -120); await pg.keyboard.up('Control'); await wait(pg, 400);
    const d = await st();
    await shot(pg, 'M26-zoom');
    const pct = x => Math.round(x.pw / (210 * 96 / 25.4) * 100) + '%';
    T('M26', b2.pw > a.pw + 20 && b2.sw === a.sw && b2.vz === a.vz && b2.lbl === pct(b2) && Math.abs(c.pw - a.pw) <= 1 && c.fit === 'w' && d.pw > a.pw + 20 && d.sw === a.sw,
      'M26b RG-2 排版模式：状态栏「＋」把预览页宽 ' + a.pw + '→' + b2.pw + '（标签 ' + b2.lbl + '＝预览倍率），书写谱面宽 / 缩放不动；点百分比回到适配宽度；预览区 Ctrl+滚轮同样放大（' + d.pw + '）', J({ a, b2, c, d }));
    await EV(pg, () => setMode('write')); await wait(pg, 300);
    const w = await EV(pg, () => ({ lbl: document.getElementById('zoom-lbl').textContent, vz: viewZoom }));
    T('M26', w.lbl === Math.round(w.vz * 100) + '%', 'M26c 回书写：百分比标签回到书写缩放（' + w.lbl + '）', J(w));
    await redEnd('M26', pg, base, []);
    await close(pg);
  }));
  if (want('M26')) jobs.push(() => SAFE('M26', 'M26d', async () => {
    /* RG-3 / RG-4 / RG-5：命中区 ≥28；灰显原因进 title 与读屏名；输出页空小节提示带警示图标 */
    const pg = await open(1440, 900, { tag: 'M26d' });
    await scn(pg, 'newpacc'); await wait(pg, 300); const base = await redBase(pg);
    await EV(pg, () => { FLOW.rd.show('prop'); }); await wait(pg, 200);
    const sz = sel => EV(pg, sel => [...document.querySelectorAll(sel)].filter(x => __vis(x)).map(x => { const r = x.getBoundingClientRect(); return [x.textContent.trim().slice(0, 6), Math.round(r.width), Math.round(r.height)]; }), sel);
    /* v68.7 S1 迁移（D8，规格 B5）：属性页编辑模式卡在新外壳里隐藏，两档的常驻入口是状态栏「⋯」›「时值检查」两项 → 改量这两项（同一 ≥28 阈值）；卡片节点照留、仍不可见。
       修前红修后绿：改前属性页卡可见（hid 为假）、⋯ 菜单两项带副标题之外量法相同 */
    const hid = await EV(pg, () => !!document.querySelector('#right-dock #em-toggle') && !__vis('#right-dock #em-toggle'));
    await pg.click('#flw-st-more'); await wait(pg, 200);
    const em = (await sz('#popmenu [data-fa="st:em"]')).concat(hid ? [] : [['卡片可见', 0, 0]]);
    await pg.keyboard.press('Escape'); await wait(pg, 150);
    /* v69.1 A2 迁移（D8）：新形态「⋯」里的两档撤掉（em 应为空），改量状态栏 ⚠N（≥28）与谱面红点（≥24）的命中区——第 2 小节旋律删掉一个音制造欠拍，量完撤销；?next=0 的两档原断言在 tv_emode / tv_v687fix */
    const nx = await EV(pg, () => FLOW.nxOn());
    let ew = null;
    if (nx) {
      await EV(pg, () => { mutate(() => { song.measures[1].voxes[0].pop(); }); }); await wait(pg, 250);
      ew = await EV(pg, () => { const b = document.getElementById('beat-status').getBoundingClientRect(), d = document.querySelector('#flw-errdots .flw-errdot'), r = d && __vis(d) ? d.getBoundingClientRect() : null;
        return { bs: [Math.round(b.width), Math.round(b.height)], dot: r ? [Math.round(r.width), Math.round(r.height)] : null }; });
      await EV(pg, () => undo()); await wait(pg, 200);
    }
    await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await EV(pg, () => setMode('engrave', { page: 'lay' })); await wait(pg, 700);
    await EV(pg, () => { if (!FLOW.rd.dockOn()) FLOW.rd.open('lay'); }); await wait(pg, 200);   /* v69.1 D5：新形态右栏默认竖条——浮出「版式」页后量 */
    /* v69.1 B 迁移（规格 §4 B1.1 / B1.3）：新形态纸张 / 疏密 / 每行 ± 在排版悬浮条、换行 / 并入 / 锁定 / 换页 / 复原在行工具条——量这两处（同一 ≥28 阈值）；?next=0 仍量行 2 分段键 */
    const nxf = await EV(pg, () => !!FLOW.nxOn());
    const g1 = await sz(nxf ? '#flw-sb-page, #flw-sbar .flw-sb-lseg button, #flw-sbar [data-fa="lay:bars"], #flw-rowt button' : '#editbar .flw-gseg .flw-gsb'), g2 = await sz('#right-dock .flw-gseg .flw-gsb');
    await EV(pg, () => FLOW.rd.close(false));
    const small = [...em, ...g1, ...g2, ...(ew ? [['⚠N', ...ew.bs]] : [])].filter(x => Math.min(x[1], x[2]) < 27.5).concat(ew && !(ew.dot && Math.min(...ew.dot) >= 24) ? [['红点', ...(ew.dot || [0, 0])]] : []);
    /* v68.7 S1：右栏「本行」的「断行 自动 / 锁定」已并入行 2「锁定此行」（规格 §6.C4 去重）——g2 现在量的是右栏「页头 · 页码」的分段键（同一 .flw-gseg .flw-gsb 样式），断言不变 */
    T('M26', (nx ? (em.length === 0 && !!ew && !!ew.dot) : em.length === 2) && g1.length >= 6 && g2.length >= 2 && !small.length, 'M26d RG-3 命中区 ≥28：' + (nxf ? '排版悬浮条（纸张 ▾ · 疏密 · 每行 ±）与行工具条五键' : '行 2 纸张 / 疏密分段键') + '、右栏分段键（页码）；新形态「⋯」无两档（v69.1 D8），量状态栏 ⚠N ≥28、谱面红点 ≥24（?next=0：「⋯」›「时值检查」两项 ≥28）', J({ small, n: [em.length, g1.length, g2.length], ew }));
    /* v68.7 S1 迁移（规格 §6.C4 去重 / 功能保全 #22）：右栏「本行」的「并入上一行」已撤，同名键只在行 2——原「行 2 与右栏两处灰显同步」改为「行 2 一处灰显 / 还原 + 右栏没有 lay:join」；
       行 2 灰显 title 改为「名称（原因）」（原「名称——现在用不了：原因」），仍含原因、还原后不含（断言不变）。修前红：5cddfb8 右栏有 lay:join（rj 为 true） */
    const dis = await EV(pg, () => { const a = document.getElementById('flw-eng-join');
      return { a: [a.getAttribute('aria-disabled'), a.getAttribute('aria-label'), a.title], rj: !!document.querySelector('#flw-rp-lay [data-fa="lay:join"]') }; });
    await EV(pg, () => { const R = FLOW.lay.rowsNow(); FLOW.lay.pick(R[1].m1, 0); }); await wait(pg, 200);
    const en = await EV(pg, () => { const a = document.getElementById('flw-eng-join');
      return { a: [a.getAttribute('aria-disabled'), a.getAttribute('aria-label'), a.title], rj: !!document.querySelector('#flw-rp-lay [data-fa="lay:join"]') }; });
    const W = '已是第一行';
    T('M26', dis.a[0] === 'true' && dis.a[1].indexOf(W) >= 0 && dis.a[2].indexOf(W) >= 0 && !dis.rj
      && en.a[0] == null && en.a[1] === '并入上一行' && en.a[2].indexOf(W) < 0 && !en.rj,
      'M26e RG-4 第 1 行「并入上一行」灰显：原因「' + W + '…」写进 title 与读屏名（行 2；右栏不再有第二枚）；换到第 2 行可用后还原原来的名称与提示', J({ dis, en }));
    await clickMode(pg, 'output'); await wait(pg, 300);
    const tr = await EV(pg, () => { const t = document.getElementById('flw-out-trim'); return t ? { vis: __vis(t), svg: !!t.querySelector('svg'), txt: t.textContent.trim().slice(0, 30) } : null; });
    T('M26', !!tr && tr.vis && tr.svg, 'M26f RG-5 输出页「末尾有 N 个空小节」提示带警示图标（svgi warn，与经典弹窗同源；此前 IC(\'warn\') 取不到键、只剩空格）', J(tr));
    await EV(pg, () => setMode('write'));
    await redEnd('M26', pg, base, []);
    await close(pg);
  }));

  /* ================= M27 v68.2 遗留 ①：大谱排版 / 输出每笔只排一次整谱（render 本身就是快照）================= */
  if (want('M27')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M27', 'M27a' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'M27a' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });   /* v69.1 B：两种形态各跑（新形态排版工具在悬浮条，engClick 取屏上那一枚） */
    await scn(pg, 'long', { mi: 12 }); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 500);
    /* 每一笔：整谱排版次数＝RENDER_STAT.n 增量（只在真正排版时 +1）；预览是否已按新谱重拍（PV.content / PV.geo 变了、页数＝.pv-page 数） */
    const step = async (label, act, ms) => {
      await EV(pg, () => { window.__n0 = RENDER_STAT.n; window.__c0 = PV.content; window.__g0 = JSON.stringify(PV.geo); window.__j0 = JSON.stringify(song); });
      await act(); await wait(pg, ms || 700);
      return EV(pg, l => ({ l, d: RENDER_STAT.n - __n0, changed: JSON.stringify(song) !== __j0, pv: PV.content !== __c0 || JSON.stringify(PV.geo) !== __g0,
        pages: document.querySelectorAll('#pv-pages .pv-page').length === PV.geo.n, filled: document.querySelectorAll('#pv-pages .pv-paper > svg[data-flw-v]').length > 0, cur: FLOW.mode.cur }), label);
    };
    const r1 = await step('每行 −', () => engClick(pg, 'lay:bars', 'd', '-1'));
    const r2 = await step('纸张 A3', () => engClick(pg, 'lay:page', 'v', 'A3'));
    const r3 = await step('Ctrl+Z', () => pg.keyboard.press('Control+z'));
    const r4 = await step('只改选中行', () => EV(pg, () => { const R = FLOW.lay.rowsNow(); FLOW.lay.pick(R[Math.min(2, R.length - 1)].m1, 0); render(); }));
    const ok = r => r.d === 1 && r.changed && r.pv && r.pages && r.filled && r.cur === 'engrave';
    T('M27', ok(r1) && ok(r2) && ok(r3) && r4.d === 0 && !r4.changed && r4.cur === 'engrave',
      'M27a' + (nx0 ? '（?next=0）' : '（新形态）') + ' 排版模式 64 小节：「每行 −」/「纸张 A3」/ Ctrl+Z 每笔整谱排版恰好 1 次（render 本身就是预览快照那一次分页排版；此前 mutate 一次 + 快照一次＝2），预览已按新谱重拍、页数＝.pv-page 数；只改选中行（谱没变）0 次', J([r1, r2, r3, r4]));
    /* 回书写：补排一次，#score 与再 render 一次逐字节相同；排版里的「适配宽度」此时补做（fitViewWidth 幂等） */
    await clickMode(pg, 'write');
    const w = await EV(pg, () => { const s = document.getElementById('score'), a = s.innerHTML, vz = viewZoom; render(); const same = s.innerHTML === a; fitViewWidth(); return { same, cur: FLOW.mode.cur, pv: document.getElementById('preview-ov').classList.contains('on'), vz, vz2: viewZoom, sel: sel.mi }; });
    T('M27', w.same && w.cur === 'write' && !w.pv && w.vz === w.vz2,
      'M27b 回书写：书写谱面补排后与再 render 一次逐字节相同；排版里 A3 要的「适配宽度」回书写时已做（再调 fitViewWidth 缩放不变）', J(w));
    await EV(pg, () => { while (undoStack.length) undo(); });
    await redEnd('M27', pg, base, ['S.layout', 'L.page', 'L.preset', 'L.density', 'L.scale', 'L.noteGap', 'L.rowGap', 'L.fixed']);
    await close(pg);
  }));
  if (want('M27')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M27', 'M27c' + (nx0 ? ' ?next=0' : ''), async () => {
    /* 落盘前兜底照旧：排版模式下这一笔的那次排版抛异常 → mutate 自动撤销、提示、谱数据不变（快照分支同步执行，异常原样抛回 mutate） */
    const pg = await open(1440, 900, { tag: 'M27c' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });   /* v69.1 B：两种形态各跑（新形态排版工具在悬浮条，engClick 取屏上那一枚） */
    await scn(pg, 'long', { mi: 12 }); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 400);
    await EV(pg, () => { window.__j0 = JSON.stringify(song); window.__u0 = undoStack.length; const rc = renderCore; window.renderCore = function () { window.renderCore = rc; throw new Error('测试注入的渲染异常'); }; });
    await engClick(pg, 'lay:bars', 'd', '-1'); await wait(pg, 600);
    const r = await EV(pg, () => ({ same: JSON.stringify(song) === __j0, undo: undoStack.length === __u0, t: (__toasts || []).filter(x => /渲染异常/.test(x)).length, cur: FLOW.mode.cur, pv: document.querySelectorAll('#pv-pages .pv-page').length === PV.geo.n }));
    errs.splice(0, errs.length, ...errs.filter(e => !/测试注入的渲染异常/.test(e)));
    T('M27', r.same && r.undo && r.t >= 1 && r.cur === 'engrave' && r.pv, 'M27c' + (nx0 ? '（?next=0）' : '（新形态）') + ' 排版模式这一笔的排版抛异常：mutate 照旧自动撤销（谱数据与撤销栈不变）并提示「已自动撤销」，预览照常', J(r));
    await clickMode(pg, 'write');
    await redEnd('M27', pg, base, []);
    await close(pg);
  }));
  if (want('M27')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M27', 'M27d' + (nx0 ? ' ?next=0' : ''), async () => {
    /* 固定版宽新谱：排版里换纸张（layApply → fitViewWidth）不把快照态的缩放写进存量谱的键 musetab-zoom，回书写 fixwide / 缩放原样 */
    const pg = await open(1440, 900, { tag: 'M27d' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });   /* v69.1 B：两种形态各跑（新形态排版工具在悬浮条，engClick 取屏上那一枚） */
    await scn(pg, 'newpacc'); await wait(pg, 300); const base = await redBase(pg);
    const k = () => EV(pg, () => ({ z: localStorage.getItem('musetab-zoom'), zf: localStorage.getItem('musetab-zoom-fw'), vz: viewZoom, fw: document.body.classList.contains('fixwide'), lbl: document.getElementById('zoom-lbl').textContent }));
    const a = await k();
    await clickMode(pg, 'engrave');
    await engClick(pg, 'lay:page', 'v', 'A5'); await wait(pg, 500);
    await engClick(pg, 'lay:page', 'v', 'A4'); await wait(pg, 500);
    const m = await EV(pg, () => ({ z: localStorage.getItem('musetab-zoom') }));
    await clickMode(pg, 'write');
    const c = await k();
    T('M27', a.fw && m.z === a.z && c.z === a.z && c.zf === a.zf && c.vz === a.vz && c.fw && c.lbl === a.lbl,
      'M27d' + (nx0 ? '（?next=0）' : '（新形态）') + ' 固定版宽新谱排版里 A5 → A4：musetab-zoom（存量谱的缩放键）不被改写、回书写 fixwide / 缩放 / 百分比原样', J({ a, m, c }));
    await redEnd('M27', pg, base, ['S.layout', 'L.page', 'L.preset', 'L.density', 'L.scale', 'L.noteGap', 'L.rowGap', 'L.fixed']);
    await close(pg);
  }));
  if (want('M27')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M27', 'M27e' + (nx0 ? ' ?next=0' : ''), async () => {
    /* 150 小节：点「每行 −」到预览更新（#pv-pages 变更所在任务结束）、期间最长阻塞（longtask）——只记数（机器负载差异大，不设阈值），整谱排版次数断言 */
    const pg = await open(1440, 900, { tag: 'M27e' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });   /* v69.1 B：两种形态各跑（新形态排版工具在悬浮条，engClick 取屏上那一枚） */
    await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} const s = __P('送别'); let m = []; while (m.length < 150) m = m.concat(JSON.parse(J2(s.measures))); s.measures = m.slice(0, 150); s.title = '送别 150';
      __one(s); sel = { mi: 75, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); render();
      window.__LT = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => __LT.push({ s: e.startTime, d: e.duration }))).observe({ type: 'longtask' }); } catch (_) {} });
    await wait(pg, 300); const base = await redBase(pg);
    await clickMode(pg, 'engrave'); await wait(pg, 900);
    await EV(pg, () => { window.__UPD = null; window.__T0 = null; window.__n0 = RENDER_STAT.n; new MutationObserver(() => { if (__UPD == null && __T0 != null) __UPD = performance.now(); }).observe(document.getElementById('pv-pages'), { childList: true, subtree: true });
      [...document.querySelectorAll('[data-fa="lay:bars"][data-d="-1"]')].find(x => __vis(x)).addEventListener('pointerdown', e => { __T0 = e.timeStamp; }, { once: true, capture: true }); });
    await engClick(pg, 'lay:bars', 'd', '-1'); await wait(pg, 1800);
    const r = await EV(pg, () => { const lt = __LT.filter(x => x.s >= __T0 - 5 && x.s <= __T0 + 1700); return { upd: __UPD == null ? null : Math.round(__UPD - __T0), longest: lt.length ? Math.round(Math.max(...lt.map(x => x.d))) : 0, renders: RENDER_STAT.n - __n0, snap: FLOW.mode.perf.refresh.last, pages: PV.geo.n }; });
    NOTE('M27', '   ℹ️  M27e' + (nx0 ? '（?next=0）' : '（新形态）') + ' 150 小节排版「每行 −」：点击→预览更新 ' + r.upd + 'ms · 最长阻塞 ' + r.longest + 'ms · 快照 ' + r.snap + 'ms · ' + r.pages + ' 页');
    T('M27', r.renders === 1 && r.upd != null, 'M27e' + (nx0 ? '（?next=0）' : '（新形态）') + ' 150 小节排版「每行 −」整谱排版 ' + r.renders + ' 次（此前 2），预览随后更新', J(r));
    await EV(pg, () => undo()); await clickMode(pg, 'write');
    await redEnd('M27', pg, base, []);
    await close(pg);
  }));

  /* ================= M28 v68.2 遗留 ②：输出模式预览排布「适宽 / 整页 / 横排」================= */
  /* v69.1 B 迁移（规格 §4 B2.2）：新形态输出模式右栏不出页、预览区右缘＝视口右缘（1440 下宽 1192，?next=0 为 928）——64 小节两页横排已装得下、不必横向滚动，
     新形态改用 128 小节（3 页）测横向滚动，点「第 n 页」挑第一张右缘出了预览区的页；?next=0 跑原断言（64 小节、第 2 页） */
  if (want('M28')) for (const nx0 of [true, false]) jobs.push(() => SAFE('M28', 'M28a' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'M28a' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    const X = nx0 ? '（?next=0）' : '（新形态 128 小节）';
    await scn(pg, 'long', { rep: nx0 ? 4 : 8 }); const base = await redBase(pg);
    await clickMode(pg, 'output'); await wait(pg, 300);
    const st = () => EV(pg, () => { const ps = document.getElementById('pv-stage'), sr = ps.getBoundingClientRect(), g = document.getElementById('flw-out-arr');
      const pp = [...document.querySelectorAll('#pv-pages .pv-page .pv-paper')].map(x => { const r = x.getBoundingClientRect(); return { x: Math.round(r.left - sr.left), y: Math.round(r.top - sr.top), r: Math.round(r.right - sr.left), w: Math.round(r.width), h: Math.round(r.height) }; });
      let z = 0; try { z = Math.round(pvDims().zpct * 100); } catch (_) {}
      return { vis: !!g && __vis(g), btn: g ? [...g.querySelectorAll('button')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')) : [], lay: PV.lay, fit: PV.fit, cls: document.getElementById('pv-pages').className,
        cw: ps.clientWidth, ch: ps.clientHeight, sw: ps.scrollWidth, sl: ps.scrollLeft, pp, lbl: document.getElementById('zoom-lbl').textContent, z, n: PV.geo.n }; });
    const a = await st();
    await pg.click('#flw-out-arr [data-v="p"]'); await wait(pg, 400);
    const p = await st(); await shot(pg, 'M28-output-page' + (nx0 ? '-nx0' : ''));
    T('M28', a.vis && J(a.btn) === J(['适宽:true', '整页:false', '横排:false']) && a.lay === 'v' && a.fit === 'w' && a.n >= 2
      && p.lay === 'v' && p.fit === 'p' && J(p.btn) === J(['适宽:false', '整页:true', '横排:false']) && p.pp.every(q => q.w <= p.cw - 50 && q.h <= p.ch - 50) && p.lbl === p.z + '%',
      'M28a ' + X + '输出模式行 2「预览 适宽 / 整页 / 横排」（缺省适宽）；点「整页」：竖排、每页整页装进预览区（' + (p.pp[0] && p.pp[0].w + '×' + p.pp[0].h) + ' ≤ ' + p.cw + '×' + p.ch + ' 减边距）、按下态与缩放标签（' + p.lbl + '）跟着变', J({ a: { btn: a.btn, n: a.n }, p }));
    await pg.click('#flw-out-arr [data-v="h"]'); await wait(pg, 400);
    const h = await st(); await shot(pg, 'M28-output-horizontal' + (nx0 ? '-nx0' : ''));
    const q1 = h.pp[0], q2 = h.pp[1];
    T('M28', h.lay === 'h' && /lay-h/.test(h.cls) && J(h.btn) === J(['适宽:false', '整页:false', '横排:true']) && !!q2 && q2.x > q1.r && Math.abs(q2.y - q1.y) <= 1 && Math.abs(q1.h - (h.ch - 52)) <= 3 && (h.sw > h.cw) === (h.pp[h.pp.length - 1].r > h.cw + 1),   /* v69.1 D5：预览区宽随右栏变 → 页超出预览区才可滚 */
      'M28b ' + X + '点「横排」：页左右排开（第 2 页左缘 ' + (q2 && q2.x) + ' > 第 1 页右缘 ' + (q1 && q1.r) + '、同高）、页高占满预览区、页超出预览区（' + h.cw + '）时可横向滚动', J(h));
    /* 左栏「页面」点第 2 页：横排下横向滚到它 */
    const PGI = nx0 ? 1 : await EV(pg, () => { const ps = document.getElementById('pv-stage'), sr = ps.getBoundingClientRect(), pp = [...document.querySelectorAll('#pv-pages .pv-page .pv-paper')];
      const i = pp.findIndex((x, k) => k >= 1 && x.getBoundingClientRect().right - sr.left > ps.clientWidth + 1); return i >= 1 ? i : 1; });
    const pgBtn = await EV(pg, i => __vis('#flw-out-list [data-fa="lay:pg"][data-pg="' + i + '"]'), PGI);
    const j0 = await EV(pg, i => { const ps = document.getElementById('pv-stage'), sr = ps.getBoundingClientRect(), r = document.querySelectorAll('#pv-pages .pv-page .pv-paper')[i].getBoundingClientRect(); return { r: Math.round(r.right - sr.left), cw: ps.clientWidth }; }, PGI);
    if (pgBtn) await pg.click('#flw-out-list [data-fa="lay:pg"][data-pg="' + PGI + '"]'); await wait(pg, 300);
    const j = await EV(pg, i => { const ps = document.getElementById('pv-stage'), sr = ps.getBoundingClientRect(), r = document.querySelectorAll('#pv-pages .pv-page .pv-paper')[i].getBoundingClientRect();
      return { pgi: i, sl: ps.scrollLeft, x: Math.round(r.left - sr.left), r: Math.round(r.right - sr.left), cw: ps.clientWidth }; }, PGI);
    await wait(pg, 300);
    const j2 = await EV(pg, i => !!document.querySelectorAll('#pv-pages .pv-paper > svg')[i].childNodes.length, PGI);
    T('M28', pgBtn && (j0.r <= j0.cw + 1 || j.sl > 0) && j.x >= 0 && j.r <= j.cw + 1 && j2, 'M28c ' + X + '横排下点左栏「第 ' + (PGI + 1) + ' 页」：横向滚动（scrollLeft ' + j.sl + '）把这一页整页带进预览区（' + j.x + '–' + j.r + ' / ' + j.cw + '），该页谱面已填', J({ pgBtn, j0, j, j2 }));
    /* 排版恒为竖排适宽；回输出恢复横排；回书写预览排布还原（经典「打印预览」不受影响） */
    await clickMode(pg, 'engrave'); await wait(pg, 300);
    const e = await EV(pg, () => ({ lay: PV.lay, fit: PV.fit, cls: document.getElementById('pv-pages').className }));
    await clickMode(pg, 'output'); await wait(pg, 300);
    const o = await EV(pg, () => ({ lay: PV.lay, fit: PV.fit, btn: [...document.querySelectorAll('#flw-out-arr button')].map(b => b.getAttribute('aria-pressed')).join(',') }));
    await pg.click('#flw-out-arr [data-v="w"]'); await wait(pg, 300);
    const wv = await st();
    await clickMode(pg, 'write');
    const wr = await EV(pg, () => ({ lay: PV.lay, cur: FLOW.mode.cur }));
    T('M28', e.lay === 'v' && e.fit === 'w' && /lay-v/.test(e.cls) && o.lay === 'h' && o.btn === 'false,false,true' && wv.lay === 'v' && wv.fit === 'w' && Math.abs(wv.pp[0].w - (wv.cw - 52)) <= 3 && wr.lay === 'v' && wr.cur === 'write',
      'M28d ' + X + '切到排版恒为竖排适宽；回输出恢复「横排」；点「适宽」回竖排、页宽占满；回书写 PV.lay 还原为进来之前的竖排', J({ e, o, wv: { lay: wv.lay, fit: wv.fit, w: wv.pp[0].w, cw: wv.cw }, wr }));
    /* 命令面板：搜「横排」第一条＝输出预览横排，执行＝进输出并横排 */
    const c = await EV(pg, () => { const h = FLOW.cmd.search('横排').hits || []; return h.length ? h[0].id : null; });
    await EV(pg, () => FLOW.cmd.run('out:arrh')); await wait(pg, 500);
    const c2 = await EV(pg, () => ({ cur: FLOW.mode.cur, lay: PV.lay }));
    T('M28', c === 'out:arrh' && c2.cur === 'output' && c2.lay === 'h', 'M28e ' + X + 'Ctrl+/ 搜「横排」第一条＝「预览：横排」（在 输出 · 预览），执行＝进输出并横排', J({ c, c2 }));
    await clickMode(pg, 'write');
    await redEnd('M28', pg, base, []);
    await close(pg);
  }));
  /* v69.1 B 迁移（规格 §4 B2.1 / B2.2）：新形态行 2 输出只留「预览」分段（3 键），7 个导出键搬到左栏格式卡（同 id）、主按钮「存 PDF」与分谱段在悬浮条——
     821–1279 窄档左栏是 56 竖条，格式卡在竖条「内容」浮层里（点一下浮出 288 宽，卡都在屏内、命中区 ≥44）；≥1280 左栏直接可见。?next=0 跑原断言（行 2 8 键） */
  if (want('M28')) for (const nx0 of [true, false]) for (const w of [821, 900, 979, 1180, 1280]) jobs.push(() => SAFE('M28', 'M28f ' + w + (nx0 ? ' ?next=0' : ''), async () => {
    /* 加了「预览」分段后行 2 在 821–1280 都不收键（输出模式「更多 ▾」隐藏，收进去就点不到）；<980 分享 / 专业格式只留图标、名在 title / 读屏名 */
    const pg = await open(w, 720, { tag: 'M28f-' + w + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : FLOWU });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    await clickMode(pg, 'output'); await wait(pg, 400);
    const r = await EV(pg, () => { const eb = document.getElementById('editbar'), vis = x => !!x && __vis(x);
      const btns = [...document.querySelectorAll('#flw-out button')];
      return { off: [...eb.querySelectorAll('.flw-off')].map(x => x.id || x.className), ovf: eb.scrollWidth - eb.clientWidth, arr: vis(document.getElementById('flw-out-arr')), cmd: vis(document.getElementById('flw-cmdb')),
        all: btns.every(vis), named: btns.every(b => (b.getAttribute('aria-label') || b.textContent).trim().length > 0), lbl: [...document.querySelectorAll('#flw-out .flw-glb')].filter(vis).length,
        er: Math.round(Math.max(...btns.map(b => b.getBoundingClientRect().right))), cl: Math.round(document.getElementById('flw-cmdb').getBoundingClientRect().left), n: btns.length }; });
    if (w === 821) await shot(pg, 'M28-output-821' + (nx0 ? '-nx0' : ''));
    if (nx0) T('M28', !r.off.length && r.arr && r.cmd && r.all && r.named && r.er <= r.cl && (w >= 980 ? r.lbl === 8 : r.lbl === 2),
      'M28f ' + w + '（?next=0）输出模式行 2：「预览」分段与 8 个输出键都在屏上、没有键被收（.flw-off 0）、不压「搜功能」；' + (w >= 980 ? '键都带字' : '<980 分享 / 专业格式只留图标（名在读屏名）'), J(r));
    else {
      const nar = await EV(pg, () => __vis('#flw-nbtn'));
      if (nar) { await pg.click('#flw-nbtn'); await wait(pg, 300); }
      const f = await EV(pg, () => { const cs = ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].map(k => document.getElementById('flw-out-' + k));
        const box = c => { const q = c.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; };
        return { vis: cs.map(c => !!c && __vis(c)), in: cs.every(c => { if (!c) return false; const q = box(c); return q[0] >= 0 && q[2] <= innerWidth && q[1] >= 0 && q[3] <= innerHeight; }),
          named: cs.every(c => !!c && (c.getAttribute('aria-label') || c.textContent).trim().length > 0), big: cs.every(c => !!c && Math.min(c.getBoundingClientRect().width, c.getBoundingClientRect().height) >= 44),
          inFmt: cs.every(c => !!c && !!c.closest('#flw-out-fmt')), go: __vis('#flw-sb-go'), goT: (document.getElementById('flw-sb-go') || {}).textContent, b0: cs[0] && box(cs[0]) }; });
      if (w === 821) await shot(pg, 'M28-output-821-fmt');
      T('M28', !r.off.length && r.arr && r.cmd && r.all && r.named && r.er <= r.cl && r.n === 3 && f.vis.every(Boolean) && f.in && f.named && f.big && f.inFmt && f.go && /存 PDF/.test(f.goT || '') && nar === (w < 1280),
        'M28f ' + w + '（新形态）输出模式行 2 只留「预览」分段（3 键，不收、不压「搜功能」）；7 张格式卡' + (w < 1280 ? '在竖条「内容」浮层里（点一下浮出）' : '在左栏') + '、都在屏内、命中区 ≥44、有名；悬浮条主按钮「存 PDF」可见', J({ r, f, nar }));
    }
    await clickMode(pg, 'write');
    await redEnd('M28', pg, base, []);
    await close(pg);
  }));

  /* ================= M29 v68.2 遗留 ③：#toast role=status（只在 flow 下挂；经典外壳零差异）================= */
  if (want('M29')) jobs.push(() => SAFE('M29', 'M29a', async () => {
    const pg = await open(1280, 800, { tag: 'M29a' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const at = () => EV(pg, () => { const t = document.getElementById('toast'); return { role: t.getAttribute('role'), live: t.getAttribute('aria-live'), atomic: t.getAttribute('aria-atomic'), txt: t.textContent }; });
    const a = await at();
    await clickMode(pg, 'output'); await wait(pg, 300);
    await pg.click('#flw-out-parts', { force: true }); await wait(pg, 200);
    const b2 = await at();
    await clickMode(pg, 'write');
    /* 进谱架（离开 flow）摘掉、退谱架挂回 */
    await EV(pg, () => enterStand()); await wait(pg, 300);
    const s = await at();
    /* 属性名单（去掉 toast() 自己写的 style＝透明度）：经典外壳只有 id */
    const snapA = () => EV(pg, () => { const d = new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html'), t = d.getElementById('toast'); return t ? [...t.attributes].map(a => a.name).filter(n => n !== 'style').join(',') : null; });
    const snap = await snapA();
    await EV(pg, () => exitStand()); await wait(pg, 300);
    const x = await at();
    const snap2 = await snapA();
    /* v68.2 收尾 NU-2：「下一批」→「即将推出」；v68.6 有意迁移（规格 §6.5）：《送别》一位演奏者，灰显原因改为「只有一位演奏者」（修前 v68.5 toast「…即将推出…」→ 红；修后绿），role=status 断言不变 */
    T('M29', a.role === 'status' && a.live === 'polite' && a.atomic === 'true' && b2.role === 'status' && /只有一位演奏者/.test(b2.txt) && !/下一批|即将推出/.test(b2.txt),
      'M29a flow 桌面 #toast＝role=status · aria-live=polite · aria-atomic=true（读屏播报）；输出模式点灰显的「分谱」，原因（' + b2.txt.slice(0, 18) + '…）写进这个播报区', J({ a, b2: b2.role }));
    T('M29', s.role === null && s.live === null && x.role === 'status' && snap === 'id' && snap2 === 'id',
      'M29b 进谱架（离开 flow）属性摘掉、退谱架挂回；互动谱快照（FLOW.snapHTML）里 #toast 与经典外壳逐字节相同', J({ s, x: x.role, snap, snap2 }));
    await redEnd('M29', pg, base, []);
    await close(pg);
  }));
  if (want('M29')) jobs.push(() => SAFE('M29', 'M29c', async () => {
    const cl = await open(1280, 800, { tag: 'M29c-classic', url: CLASSICU });
    const c = await EV(cl, () => { toast('经典外壳提示'); return [...document.getElementById('toast').attributes].map(a => a.name).filter(n => n !== 'style').join(','); });
    await close(cl);
    const mb = await open(390, 844, { tag: 'M29c-mobile', touch: true, mobile: true });
    await scn(mb, 'songbie');
    const m = await EV(mb, () => ({ m: document.body.classList.contains('flw-m'), role: document.getElementById('toast').getAttribute('role') }));
    await close(mb);
    T('M29', c === 'id' && m.m && m.role === 'status',
      'M29c 经典外壳（?shell=classic）#toast 不带任何新属性（与 v67.8 逐字节相同，不进对拍例外）；flow 手机（body.flw-m）同样 role=status', J({ c, m }));
  }));

  /* ================= M30 v68.2 遗留 ④：命令面板拼音撞码 ph / qy 按常用度排 ================= */
  if (want('M30')) jobs.push(() => SAFE('M30', 'M30a', async () => {
    const pg = await open(1440, 900, { tag: 'M30a' });
    const top = (q, n) => EV(pg, ([q, n]) => (FLOW.cmd.search(q).hits || []).slice(0, n).map(c => c.id), [q, n]);
    await scn(pg, 'piano'); const base = await redBase(pg);
    const ctx = await EV(pg, () => FLOW.ctx());
    const ph = await top('ph', 3), qy = await top('qy', 3);
    await scn(pg, 'songbie');
    const phj = await top('ph', 1);
    await scn(pg, 'gtr', { row: 'tab' });
    const qyt = await top('qy', 3);
    T('M30', ctx === 'st' && J(ph) === J(['sign:meter', 'trk:clef', 'sign:clef']) && J(qy) === J(['r2:d1', 'sign:grace-pre', 'sign:strum-mute']) && phj[0] === 'sign:meter' && J(qyt) === J(['r2:d1', 'sign:grace-pre', 'sign:strum-mute']),
      'M30a 拼音撞码按常用度：ph（五线谱语境）→ 本小节拍号 · 本轨谱号 · 谱号切换；qy → 全音符 · 前倚音 · 扫弦切音（简谱 / 六线谱语境同序）', J({ ctx, ph, qy, phj, qyt }));
    /* 个人常用：最近用过的压过静态常用度（只在同分、同可用性之内） */
    await scn(pg, 'songbie');
    await EV(pg, () => { FLOW.cmd.run('sign:grace-pre'); }); await wait(pg, 300);
    await EV(pg, () => { __shut(); });
    const qr = await top('qy', 2), rec = await EV(pg, () => FLOW.cmd.recent());
    T('M30', rec[0] === 'sign:grace-pre' && J(qr) === J(['sign:grace-pre', 'r2:d1']), 'M30b 用过「前倚音」后再搜 qy：它排到全音符前面（最近用过 musetab-cmd-recent 压过静态常用度）', J({ qr, rec: rec.slice(0, 3) }));
    /* PN-9 的口径不变 */
    const f = q => EV(pg, q => { const h = FLOW.cmd.search(q).hits || []; return h.length ? h[0].id : null; }, q);
    const pn = { sc: await f('sc'), bf: await f('bf'), hy: await f('hy'), sd: await f('sd'), zz: await f('zz') };
    T('M30', pn.sc === 'mode:output' && pn.bf === 'st:play' && pn.hy === 'trk:mix' && pn.sd === 'st:tempo' && pn.zz === 'lay:A4', 'M30c PN-9 同分常用在前照旧：sc→输出 · bf→播放 · hy→混音 · sd→速度 · zz→A4', J(pn));
    await redEnd('M30', pg, base, []);
    await close(pg);
  }));

  /* ================= M31 v68.2 遗留 ⑤：窄档 56 左栏轨多时细滚动条（与「+N ↓」并存）================= */
  if (want('M31')) jobs.push(() => SAFE('M31', 'M31a', async () => {
    const pg = await open(1000, 600, { tag: 'M31a' });
    await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} __one(createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 8, nTab: 2, nVox: 10, lyr: 1 })); render(); });
    await wait(pg, 400); const base = await redBase(pg);
    const r = await EV(pg, () => { const L = document.getElementById('flw-tlist'), cs = getComputedStyle(L), m = L.querySelector('.flw-tmore'), lr = L.getBoundingClientRect();
      const ic = [...L.querySelectorAll('.flw-trow .flw-tic')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect());
      return { nar: document.body.classList.contains('flw-narrow'), sw: cs.scrollbarWidth, oy: cs.overflowY, over: L.scrollHeight > L.clientHeight + 2, more: m ? m.textContent : '', mv: !!m && __vis(m),
        inside: ic.length > 0 && ic.every(q => q.left >= lr.left - 0.5 && q.right <= lr.left + L.clientWidth + 0.5), w: Math.round(lr.width) }; });
    await shot(pg, 'M31-narrow-scroll');
    T('M31', r.nar && r.sw === 'thin' && r.oy === 'auto' && r.over && r.mv && /^\+\d+ ↓$/.test(r.more) && r.inside && r.w <= 56,
      'M31a 1000×600 十二条轨：左栏 56 竖条音轨列 scrollbar-width:thin（此前 none）——轨多时出细滚动条、与底部「' + r.more + '」并存，图标仍在可用宽内（无头浏览器隐藏滚动条，按计算样式断言）', J(r));
    /* 轨少放得下：不出滚动条（overflow 自动） */
    await EV(pg, () => { __one(createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 8, nTab: 1, nVox: 1, lyr: 1 })); render(); }); await wait(pg, 300);
    const s = await EV(pg, () => { const L = document.getElementById('flw-tlist'); return { over: L.scrollHeight > L.clientHeight + 2, more: !!L.querySelector('.flw-tmore') && __vis(L.querySelector('.flw-tmore')) }; });
    T('M31', !s.over && !s.more, 'M31b 两条轨放得下：不溢出、没有「+N ↓」（滚动条随 overflow-y:auto 不出现）', J(s));
    await redEnd('M31', pg, base, []);
    await close(pg);
  }));

  await pool(jobs, 3);
  /* —— 数据红线汇总（每个用例都参与）—— */
  if (RLF.length) {
    T('RL', RLF.every(x => x.ok), 'RL1 数据红线 · song 字段集合：每个用例结束时 ⊆ 开始时 ∪ 本用例应写的现有字段（' + RLF.length + ' 个用例）', RLF.filter(x => !x.ok || /新字段/.test(x.d)).map(x => x.d).join('；') || '全部无新字段');
    T('RL', RLK.every(x => x.ok), 'RL2 数据红线 · musetab-* 键差集（去掉基线已有键名）⊆ {musetab-cmd-recent}（' + RLK.length + ' 个用例）' + (refSrc ? '' : '  ⚠️ 无基线源码，退回被测源码字面量'),
      RLK.filter(x => !x.ok || /新键/.test(x.d)).map(x => x.d).join('；') || '全部无新键');
  }
  const ORDER = k => k === 'RL' ? 999 : +k.replace(/\D/g, '');
  Object.keys(OUT).sort((x, y) => ORDER(x) - ORDER(y)).forEach(k => OUT[k].forEach(l => console.log(l)));
  if (errs.length) { console.log('❌ 页面报错 ' + errs.length + '：'); errs.slice(0, 8).forEach(e => console.log('   ' + e)); }
  console.log('\n' + (pass === total && !errs.length ? '✅ PASS ' : '❌ FAIL ') + pass + '/' + total);
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
