'use strict';
/* v68.0 新外壳 flow（?shell=flow）左栏：音轨层级树（含混音，FLOW.tree）· Bravura 记号面板（FLOW.pal + pqSign）· 谱型条拆入（FLOW.start）。
   工程计划 flowplan §3.8 断言表；几何断言优先、真实点击，file:// 直载。数据红线：只经现有函数写现有字段，界面操作不改谱、不新增 musetab-* 键（除本版两个）。
   T0  不带开关零差异：默认外壳里 v68.0 动过的共享路径（混音台行 → trkMixSet · 「＋ 音轨」弹窗 → addTrackOf · 力度弹窗 → dynApplyTo · 偏好设置 PREF_ITEMS ·
       Enter 填词 · 「/」键 · 谱型条 lbSync / lbMenuOut / LBAR.show）逐项与 shellflow_ref.json 的基线提交对拍（HTML / 数据 / 焦点 / 本机键），
       并核 S0b 不变量（FLOW 不挂载、没有任何 flow 节点）。拿不到基线：CI 判红，本地只跑不变量并打印 ⚠️（与 tv_shellflow S0 同口径，MUSETAB_REF=none 显式跳过）
   T1  钢琴伴奏歌谱（送别 + fillAccompaniment）：花括号组 2 行 + 旋律 1 行；徽标 简 / 高音 / 低音（data-badge）；花括号按组高非均匀拉伸；轨名在 248 宽不截断（含当前行露出动作钮时）
   T2  欢乐颂（四部合唱）：方括号组 4 行；song.voxGroups 前后都是 undefined（合唱方括号只按谱类推断显示）
   T3  两只老虎（吉他弹唱）：吉他组，组末「五线谱联排 · 全部吉他轨」行
   T4  点「右手伴奏」行 → sel {row:'vox', vi:1}、activeTab 'vox'、记号面板出现「钢琴」组
   T5  记谱法往返（setVoxNotation / toggleVoxDual）：点界面 → 数据与直接调旧函数逐字节相同 → 谱面重刻 → 点回 → #score 逐字节还原、song 等价还原
   T6  「只显示这一种」与谱号 ▾：与 setVoxNotation 同一结果；只剩一层时再关＝不改谱 + 提示
   T7  六线谱轨「简谱行 · 仅本轨」（tabJpVoices）与组末联排（tabStaff）：与 #nl-tabjp / #tn-* 同一数据；一步撤销；点两次逐字节还原
   T8  静音 / 独奏：song.mixer、trackAudible、anySolo、aria-pressed；已打开的在非当前行常显
   T9  ⋯ 里的音色 / 音量 / 声像，连同静音 / 独奏：逐步与经典外壳混音台行（?shell=classic）改出的 song.mixer（有效值）与播放事件（光标时间轴 · 各轨增益 / 声像 · 每个音的音色）完全一致；
       音轨树只读时不补写 song.mixer 缺省条目（计划 R5）；播放中同一组步骤的总线 setTargetAtTime 与光标参考轨也与混音台逐步相同（applyMixLive）
   T10 钢琴伴奏 / 合唱 / 吉他弹唱 / 8 轨 / 12 轨：音轨区 ≤ 左栏 48%；「还有 N 条」的 N＝提示条以下的轨行数；滚到底提示消失；记号区同屏露出「最近使用」6 格与 ≥2 个组标题；
       T10b 当前轨行始终露在音轨区里（换窗口 · 改光标轨 · Alt+↓）
   T11 命中区：动作钮 / 眼睛 / 谱号 ▾ / 层名 / 歌词段号 / 填词 / 谱类芯片 / 标题钮——中心 28×28 方块四角（往里 1px）elementFromPoint 都命中自身；记号面板控件外框最小边 ≥28
   T12 加轨菜单：与经典「＋ 音轨」弹窗逐谱同一可用性（16 个预设 + 满轨）；锁定谱类只给原因 +「换谱类…」；功能谱只加旋律轨；吉他谱「尤克里里轨」置灰带原因；点「吉他轨」与弹窗 #ta-tab 同一结果
   T13 ⋯ 改名（与双击轨名同一 askText）一步撤销；删除的可用性与旧左栏 .vdel（canDel）逐轨一致，删除一步撤销
   T14 歌词段号复用 chip 契约：② 切 activeLyr、＋ 加一段；Enter 聚焦 #i-lyric 且它在 #flw-left 内、不删经典偏好键 musetab-flyclosed
   T15 语境分组：简谱无「钢琴」「谱号」；五线谱有；六线谱有「扫弦 · 拨弦」「吉他技巧」、无「力度」
   T16 格子与旧按钮 1:1：三种语境每个可见格的转发目标恰好命中 1 个元素，或是白名单函数且它对应的旧按钮存在；无死格
   T17 点格效果：8 个代表格写的字段（ferm / artic / dyn / repeatStart / strum / tech / note.x）；抽样 30 个（覆盖 简谱 / 五线谱 / 六线谱）与点旧按钮的 song / sel / 弹窗逐字节相同
   T18 搜索：yc → 第一个是延长号；mf → 中强；五线谱专属在简谱语境灰显并注明「仅五线谱」，点了不改谱
   T19 最近使用：连点延长号 2 次后「最近」第 1 格是延长号；变化落在 musetab-habits，没有新键
   T20 两档密度与折叠：带字 52×52（标签 ≥11px）/ 只看字形 36×36；musetab-signdensity='glyph' 刷新后保持；折叠写 musetab-pal、刷新保持；坏 JSON 回默认不报错
   T21 字形 pqSign：149 个变体（20 / 16 两档母版）墨迹不出格；面板上显示的 Bravura 变体最大边 p90/p10 ≤1.5（含活文字 / bare 档的数另行打印，不判）；文字类 <text> 用 Georgia,serif
   T22 SMUFL：94 个（原 50 + 追加 44）；原 50 个 d / bb 与基线提交逐字相同
   T23 谱面零回归：16 个预设 renderOffscreen 在 flow 与经典外壳逐字节相同；去掉追加的 44 个字形重刻仍逐字节相同；与基线提交的编辑器 #score 逐字节相同
   T24 起步：新建钢琴伴奏歌谱没有 #lb-wrap；#flw-start 步骤状态＝lbCur(lbInfo)；主按钮与 #b-arrange 同一弹窗；× 收起后 Alt+B 恢复并聚焦
   T25 谱类芯片：#lb-menu 在芯片下方；再点芯片即关（不先关后开）
   T26 谱纸：1280×800 / 1440×900 预设谱 #score 870±2、新建谱 ≥868；paperClear；无 paper-tight；FLY_AUTO_CLOSED 不消耗
   T27 数据零改动：只做界面操作（展开 / 收起 / 搜索 / 切密度 / 折叠 / 悬停 / 开关菜单）前后 song 逐字节相同；musetab-* 键差集 ⊆ 本版新键
   —— v68.0 收尾（验收三镜头的回归，修前红、修后绿）——
   T28 音轨树：记谱风格入口（TRK-1）· 纯和弦谱填词（TRK-2）· 记谱法组合操作一步撤销（TRK-3）· 点下方行不跳 / 双击改名（TRK-4）· 音量 0 与引擎同口径（TRK-5）·
       删吉他轨混音 / 变调夹随行删（TRK-6）· 钢琴「歌词 ＋」（TRK-8）· 展开覆盖不跨窗口（TRK-9）· 往返还原谱号（TRK-10）· 子行滚进来（TRK-11）· 指板浮层让位（TRK-12）·
       音色下拉 ↓（TRK-13）· 无旋律轨不出「由旋律生成」（TRK-14）
   T29 记号面板：更多力度 / 左手指（S1 / TRK-7）· 字面与谱面同一声明（S2）· 搜索（S3）· 弹窗类格子应用才计数（S4）· 计数不挤「猜你想做」（S5）· 格子四角命中（S6）·
       细线 ≥1px（S7）· 存储被拦仍生效（S8）· 灰格提示按方向（S9）· 读屏与 roving tabindex（S10）
   T30 外壳：启动台不画占位谱（SH-5）· 821–1179 起步组不裁「更多 ▾」（SH-1）· 1600 不比 1536 收得多（SH-6）· 起步组 DOM 在前（SH-4）· 「起步 · 换谱类…」（SH-2 / TRK-15）· 竖条态 Alt+B / 落地提示（SH-3）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· MUSETAB_REF 参考页（none＝跳过对拍）· MUSETAB_REF_COMMIT · ONLY=T1,T5 · SHOTS=目录 存截图 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const FLOWU = withQ(URL0, 'shell=flow'), CLASSICU = withQ(URL0, 'shell=classic');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shellflow_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.MUSETAB_REF_COMMIT || REF.commit || '2675b9c';
const IN_CI = !!process.env.CI && process.env.MUSETAB_REF !== 'none';
const NEWKEYS = ['musetab-flow', 'musetab-rdock', 'musetab-pal', 'musetab-signdensity'];
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
  /* FNV-1a（32 位）＋长度：大段 HTML 只传指纹回 node */
  window.__h = s => { s = String(s == null ? '' : s); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16) + ':' + s.length; };
  window.__score = () => { const s = document.getElementById('score'); return s ? s.innerHTML : ''; };
  /* song 等价：voxNotations 的 undefined / null / 'jianpu' 与缺省等价（setVoxNotation 写 undefined）、voxDual 的 false 与缺省等价（toggleVoxDual 关掉写 false） */
  window.__norm = j => { const s = typeof j === 'string' ? JSON.parse(j) : JSON.parse(JSON.stringify(j));
    if (Array.isArray(s.voxNotations)) { s.voxNotations = s.voxNotations.map(v => (v == null || v === 'jianpu') ? null : v); while (s.voxNotations.length && s.voxNotations[s.voxNotations.length - 1] == null) s.voxNotations.pop(); if (!s.voxNotations.length) delete s.voxNotations; }
    if (Array.isArray(s.voxDual)) { s.voxDual = s.voxDual.map(v => !!v); while (s.voxDual.length && !s.voxDual[s.voxDual.length - 1]) s.voxDual.pop(); if (!s.voxDual.length) delete s.voxDual; }
    return JSON.stringify(s); };
  window.__diff = (a, b) => { const out = []; const go = (x, y, p) => { if (JSON.stringify(x) === JSON.stringify(y)) return;
      if (x && y && typeof x === 'object' && typeof y === 'object') new Set([...Object.keys(x), ...Object.keys(y)]).forEach(k => go(x[k], y[k], p + '.' + k));
      else out.push(p + ': ' + JSON.stringify(x) + ' → ' + JSON.stringify(y)); };
    go(typeof a === 'string' ? JSON.parse(a) : a, typeof b === 'string' ? JSON.parse(b) : b, ''); return out; };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { lbMenuClose(); } catch (_) {} try { closeModal(); } catch (_) {}
    try { NWP.quickMenuClose(); } catch (_) {} };
  window.__one = s => { addDoc(s, () => {}); closeDocAt(0); };
  /* 场景：单窗口、光标在指定轨第 mi 小节第 1 个音 */
  window.__scn = (k, o) => {
    o = o || {};
    window.guardReplace = p => p();
    try { hideStartPad(); } catch (_) {}
    let row = 'vox', vi = 0;
    if (k === 'songbie') __one(__P('送别'));
    else if (k === 'pacc') { __one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; fillAccompaniment('slow', true); }
    else if (k === 'choir') __one(__P('四部合唱'));
    else if (k === 'gtr') { __one(__P('两只老虎')); row = 'tab'; }
    else if (k === 'piano') __one(__P('钢琴独奏'));
    else if (k === 'canon') __one(__P('卡农进行'));
    else if (k === 'staff') __one(__P('小步舞曲'));
    else if (k === 'func') __one(__P('流行进行（功能谱）'));
    else if (k === 'uke') { __one(__P('小星星（尤克里里）')); row = 'tab'; }
    else if (k === 't8' || k === 't12') { const n = k === 't8' ? 4 : 6;
      const s = createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 4, nTab: n, nVox: n, lyr: 1 });
      s.voxVoices = s.voxVoices.map((_, i) => ['主唱', '和声一', '和声二', '低声部', '旋律五', '旋律六'][i] || ('旋律' + (i + 1)));
      __one(s); }
    else if (k === 'newpacc') { NWP.quickCreate('pacc'); closeDocAt(0); }
    else if (k === 'preset') __one(migrate(PRESETS[o.i].make()));
    if (o.row) row = o.row; if (o.vi != null) vi = o.vi;
    sel = { mi: o.mi || 0, row, vi, ci: 0, si: 1 };
    try { clampSel(); } catch (_) {}
    try { blurSel = false; lastEnt = null; noteSel = []; selRange = null; } catch (_) {}
    try { setRibbon(sel.row); } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { title: song.title, dt: docType(song), nT: song.tabVoices.length, nV: song.voxVoices.length };
  };
  /* 播放快照：光标时间轴（audio.events）· 各轨总线增益 / 声像 · 每个音的「轨 · 音色 · 频率 · 相对起点 · 时长 · 力度」（包一层 playInst 记下来；起点按第一个音归零） */
  window.__play = () => {
    window.SF_PLAYWAIT = false;
    if (!window.__piW) { const o = playInst; window.__pi = []; playInst = function (inst, ctx, bus, freq, when, dur, gain) { if (window.__piOn) __pi.push([bus, inst, freq, when, dur, gain]); return o.apply(this, arguments); }; window.__piW = 1; }
    __pi.length = 0; window.__piOn = true;
    try { play(); } finally { window.__piOn = false; }
    const tr = audio.tracks || {}, key = bus => Object.keys(tr).find(k => tr[k] === bus) || '?';
    const r3 = v => Math.round(v * 1000) / 1000;
    const t0 = __pi.length ? Math.min(...__pi.map(x => x[3])) : 0;
    const notes = __pi.map(x => [key(x[0]), x[1], Math.round(x[2] * 10) / 10, r3(x[3] - t0), r3(x[4]), r3(x[5])].join(' ')).sort();
    const ev = (audio.events || []).map(e => e.pre + ':' + e.mi + ':' + e.ci + ':' + (e.whole ? 1 : 0) + ':' + r3(e.tm)).join(',');
    const gains = Object.keys(tr).sort().map(k => k + '=' + r3(tr[k].dry.gain.value) + '/' + (tr[k].pan ? r3(tr[k].pan.pan.value) : '-')).join(' ');
    try { stopPlay(); } catch (_) {}
    return { n: notes.length, ev: __h(ev), nev: (audio.events || []).length, gains, notes: __h(notes.join('\n')), insts: [...new Set(__pi.map(x => key(x[0]) + '=' + x[1]))].sort().join(' ') };
  };
  /* 有效混音（缺省补齐后的值，与 trackCfg 同一缺省口径——只算不写） */
  window.__mixEff = () => { const out = {}; const d = k => ({ on: true, solo: false, inst: k.startsWith('tab') ? (song.inst === 'uku' ? 'uku' : 'steel') : 'ah', vol: 1, pan: null });
    const all = song.tabVoices.map((_, i) => 'tab:' + i).concat(song.voxVoices.map((_, i) => 'vox:' + i));
    all.forEach(k => { const c = Object.assign(d(k), (song.mixer || {})[k] || {}); if (c.pan === undefined) c.pan = null; out[k] = [c.on !== false, !!c.solo, c.inst, Math.round((c.vol == null ? 1 : c.vol) * 100), c.pan == null ? null : Math.round(c.pan * 100)].join('|'); });
    return out; };
  window.J2 = x => JSON.stringify(x);
  window.__toasts = [];
}

/* —— T0：默认外壳（不带开关）里 v68.0 动过的共享路径；在基线页与被测页各跑一遍，逐项对拍。只用两版都有的 API —— */
function T0SCN() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
  const TO = []; try { const ot = toast; toast = function (m) { TO.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
  try { hideStartPad(); } catch (_) {}
  const P = n => migrate(PRESETS.find(x => x.name.indexOf(n) >= 0).make());
  const one = s => { addDoc(s, () => {}); closeDocAt(0); };
  const out = {}, ae = () => { const a = document.activeElement; return a ? (a.id || a.tagName) : null; };
  const lastT = () => TO.length ? TO[TO.length - 1] : '';
  const kd = (key, o) => { const e = new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, o || {})); window.dispatchEvent(e); return e.defaultPrevented; };
  /* A 混音台行（经典外壳的混音入口；v68.0 写入抽成 trkMixSet） */
  one(P('两只老虎')); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; render();
  document.getElementById('mx-expand').click();
  out.A_dock = document.getElementById('mixer-dock').outerHTML;
  const row = (k, i) => document.querySelector('#mx-tracks .mx-row[data-kind="' + k + '"][data-vi="' + i + '"]');
  const fire = (el, t, v) => { if (v != null) el.value = v; el.dispatchEvent(new Event(t, { bubbles: true })); };
  row('vox', 0).querySelector('.mx-btn.mute').click();
  row('tab', 1).querySelector('.mx-btn.solo').click();
  fire(row('tab', 0).querySelector('.mx-vol input'), 'input', '60');
  fire(row('vox', 0).querySelector('.mx-pan input'), 'input', '-40');
  out.A_pan = row('vox', 0).querySelector('.mx-pan .pv').textContent;
  row('tab', 0).querySelector('.mx-pan input').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  fire(row('tab', 1).querySelector('.mx-inst'), 'change', 'nylon');
  out.A_rows = document.getElementById('mx-tracks').outerHTML;
  out.A_mixer = JSON.stringify(song.mixer);
  setMixerExpanded(false);
  /* B 「＋ 音轨」弹窗（addTrackOf）与整谱形态的拒绝 */
  showAddTrackMenu(); { const m = document.querySelector('#modal-mask'); out.B_modal = m ? m.innerHTML : null; }
  document.getElementById('ta-tab').click();
  out.B_song = JSON.stringify({ tv: song.tabVoices, vv: song.voxVoices, sel, jv: song.tabJpVoices, mixer: song.mixer, m0: song.measures[0].tabs.length });
  out.B_toast = lastT();
  showAddTrackMenu(); document.getElementById('ta-vox').click();
  out.B_song2 = JSON.stringify({ vv: song.voxVoices, sel, nt: song.voxNotations }); out.B_toast2 = lastT();
  one(P('卡农进行')); render(); TO.length = 0; showAddTrackMenu(); out.B_lock = [lastT(), !!document.querySelector('#modal-mask')].join('|');
  /* C 力度弹窗（dynApplyTo） */
  one(P('送别')); sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; lastEnt = null; noteSel = []; render();
  showDynMenu(120, 160); { const m = document.getElementById('popmenu'); out.C_pop = m ? m.innerHTML : null; }
  document.querySelector('#popmenu [data-dy="mf"]').click();
  out.C_col = JSON.stringify(song.measures[1].voxes[0][0]); out.C_toast = lastT();
  showDynMenu(120, 160); document.querySelector('#popmenu [data-dy="<"]').click();
  out.C_col2 = JSON.stringify(song.measures[1].voxes[0][0]);
  sel = { mi: 1, row: 'tab', vi: 0, ci: 0, si: 1 }; TO.length = 0; showDynMenu(1, 1); out.C_tab = lastT() + '|' + !!document.getElementById('popmenu');
  /* D 偏好设置（PREF_ITEMS；v68.0 的「记号格：只看字形」只在 flow 下列出） */
  try { showPrefs(); const m = document.querySelector('#modal-mask'); out.D_prefs = m ? m.innerHTML : null; closeModal(); } catch (e) { out.D_prefs = 'ERR ' + e.message; }
  /* E Enter 填词（经典：openFlyout('lyr') + 聚焦 #i-lyric）与「/」键（经典无绑定） */
  one(P('送别')); sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; render();
  try { document.activeElement.blur(); } catch (_) {}
  out.E_enter = [kd('Enter'), ae(), (document.getElementById('left-flyout') || {}).className, localStorage.getItem('musetab-flyclosed'), activeTab].join('|');
  try { document.activeElement.blur(); } catch (_) {}
  const j0 = JSON.stringify(song); out.E_slash = [kd('/'), ae(), JSON.stringify(song) === j0].join('|');
  /* F 谱型条（lbSync / lbMenuOpen / lbMenuOut / LBAR.show） */
  NWP.quickCreate('pacc'); closeDocAt(0); render();
  { const w = document.getElementById('lb-wrap'); out.F_lb = w ? w.outerHTML : null; }
  { const k = document.querySelector('#lb-wrap .lb-kind'); if (k) { k.click(); const m = document.getElementById('lb-menu'); out.F_menu = m ? m.innerHTML : null;
      k.click(); out.F_menu2 = !!document.getElementById('lb-menu'); } else out.F_menu = 'NO .lb-kind'; }
  { const x = document.querySelector('#lb-wrap [data-lb="hide"]') || document.querySelector('#lb-wrap .lb-x'); if (x) x.click(); out.F_hide = [!!document.querySelector('#lb-wrap .lb-bar'), lastT()].join('|');
    LBAR.show(); out.F_show = [!!document.querySelector('#lb-wrap .lb-bar'), ae(), (document.activeElement || {}).className].join('|'); }
  /* G 不变量：FLOW 不挂载、没有 flow 节点 / 类 / 本机键 */
  out.G_keys = Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().join(',');
  out.G_inv = J2({ flowNodes: document.querySelectorAll('[id^="flw-"],.flw-x,[data-flw-slot],.flw-mn,.flw-kchip').length,
    bodyFlw: [...document.body.classList].filter(c => /^fl(ow|w-)/.test(c)), mounted: typeof FLOW === 'undefined' ? null : FLOW.mounted });
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
    const st = document.createElement('style'); st.id = 'tv-tt-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); }, theme || null);
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light' });
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
  const scn = async (pg, k, o) => { const r = await pg.evaluate(([k, o]) => __scn(k, o), [k, o || {}]); await wait(pg, 120); return r; };
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const pool = async (jobs, n) => { const q = jobs.slice(); const run1 = async () => { while (q.length) { const j = q.shift(); await j(); } }; await Promise.all(Array.from({ length: n }, run1)); };
  /* 音轨行的动作钮只在悬停 / 当前 / 焦点行露出：先悬停行（落在图标上，不碰轨名的双击改名），再真实点击 */
  const rowSel = (k, i) => '#flw-tr-' + k + '-' + i;
  const rowAct = async (pg, k, i, btn) => { await pg.hover(rowSel(k, i), { position: { x: 20, y: 18 } }); await pg.click(rowSel(k, i) + ' ' + btn); await wait(pg, 120); };
  const away = pg => pg.mouse.move(700, 500);   /* 鼠标移到谱面中央：左栏不再有悬停行 */
  const toasts = pg => EV(pg, () => __toasts.slice());
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', String(e && e.message || e).split('\n')[0]); } };
  const jobs = [];

  /* ================= T0 不带开关零差异（对拍基线提交）================= */
  const refURL = (() => {
    const e = process.env.MUSETAB_REF;
    if (e === 'none') return null;
    if (e) return e.startsWith('file://') ? e : 'file://' + path.resolve(e);
    try { const txt = cp.execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
      const f = path.join(os.tmpdir(), 'tv_trktree_ref_' + REF_COMMIT.slice(0, 12) + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return null; }
  })();
  const refNote = id => { if (!refURL && IN_CI) T(id, false, id + ' CI 里拿不到对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：判红', 'deploy.yml 先 git fetch --depth=1 origin <shellflow_ref.json 的 commit>');
    else if (!refURL) NOTE(id, '⚠️  ' + id + ' 与 ' + (REF.version || '基线') + ' 对拍跳过：拿不到参考（本地可设 MUSETAB_REF=参考 index.html；MUSETAB_REF=none 为显式跳过）'); };
  const runDefault = async (url, fn, arg, w = 1280, h = 800) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message));
    await pg.goto(url); await pg.waitForTimeout(1500);
    let r = null; try { r = await pg.evaluate(fn, arg); } catch (e) { r = { ERR: e.message.split('\n')[0] }; }
    await ctx.close(); return { r, pe };
  };
  if (want('T0')) jobs.push(() => SAFE('T0', 'T0', async () => {
    const B = await runDefault(URL0, T0SCN);
    const inv = B.r && B.r.G_inv ? JSON.parse(B.r.G_inv) : null;
    const keysBad = B.r && B.r.G_keys ? B.r.G_keys.split(',').filter(k => NEWKEYS.includes(k)) : ['?'];
    T('T0', !!inv && inv.flowNodes === 0 && !inv.bodyFlw.length && inv.mounted === false && !keysBad.length && !B.pe.length && !B.r.ERR,
      'T0a 不带开关跑完 v68.0 动过的全部共享路径（混音台 · ＋ 音轨 · 力度弹窗 · 偏好设置 · Enter · 「/」· 谱型条）后：FLOW 未挂载、没有任何 flow 节点 / 类、不写 musetab-flow / rdock / pal / signdensity、无报错',
      J({ inv, keysBad, pe: B.pe, err: B.r && B.r.ERR }));
    T('T0', !!B.r && !!B.r.D_prefs && !/signdensity|只看字形/.test(B.r.D_prefs), 'T0b 默认外壳的偏好设置不列「记号格：只看字形」（PREF_ITEMS 新项带 when:flowOn）');
    refNote('T0');
    if (!refURL) return;
    const A = await runDefault(refURL, T0SCN);
    const ks = [...new Set([...Object.keys(A.r || {}), ...Object.keys(B.r || {})])].filter(k => k !== 'G_inv');
    const bad = ks.filter(k => (A.r || {})[k] !== (B.r || {})[k]).map(k => { const x = String((A.r || {})[k]), y = String((B.r || {})[k]); let i = 0; while (i < x.length && x[i] === y[i]) i++;
      return k + ' @' + i + ' ref=' + J(x.slice(Math.max(0, i - 20), i + 50)) + ' new=' + J(y.slice(Math.max(0, i - 20), i + 50)); });
    T('T0', !bad.length && !A.pe.length, 'T0c 默认外壳与 ' + (REF.version || '基线') + '（' + REF_COMMIT.slice(0, 7) + '）逐项相同：混音台行（静音 / 独奏 / 音量 / 声像 / 双击复位 / 音色 → song.mixer 与行 HTML）· ＋ 音轨弹窗与加轨结果 / 提示 · 整谱拒绝 · 力度弹窗 HTML 与写入（mf / < / TAB 拒绝）· 偏好设置 · Enter 填词焦点与 musetab-flyclosed · 「/」不拦 · 谱型条 HTML / 换谱类菜单 / 收起 / Alt+B · musetab-* 键 · 全部提示文案',
      bad.length ? bad.join('\n      ') : ks.length + ' 项');
  }));

  /* —— 页面内：树结构（组 / 行 / 徽标 / 名字截断）—— */
  const TREE = () => {
    const rows = r => ({ id: r.id, badge: (r.querySelector('.flw-badge') || { dataset: {} }).dataset.badge, name: (r.querySelector('.flw-tn') || {}).textContent,
      cut: (n => n ? n.scrollWidth > n.clientWidth + 0.5 : null)(r.querySelector('.flw-tn')), on: r.classList.contains('on'), h: Math.round(r.getBoundingClientRect().height * 10) / 10 });
    return { grp: [...document.querySelectorAll('#flw-tlist .flw-tgrp')].map(g => ({ g: g.dataset.g, name: (g.querySelector('.flw-tgn') || {}).textContent, rows: [...g.querySelectorAll('.flw-trow')].map(rows),
        sub: [...g.querySelectorAll(':scope > .flw-tgb > .flw-tgsub')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) })),
      loose: [...document.querySelectorAll('#flw-tlist > .flw-trow')].map(rows), all: [...document.querySelectorAll('#flw-tlist .flw-trow')].map(rows),
      chip: (document.querySelector('#flw-kchip .flw-kn') || {}).textContent, n: (document.querySelector('#flw-thd .flw-tc') || {}).textContent,
      pal: [...document.querySelectorAll('#flw-pgrid .flw-pgh')].map(x => x.textContent.replace(/\d+$/, '').replace(/本机习惯$/, '').trim()) };
  };

  /* ================= T1–T4 树结构 · 括线 · 选轨 ================= */
  if (['T1', 'T2', 'T3', 'T4'].some(want)) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T1' });
    await SAFE('T1', 'T1', async () => {
      await scn(pg, 'pacc'); await wait(pg, 250);
      const a = await EV(pg, TREE);
      const br = await EV(pg, () => { const g = document.querySelector('#flw-tlist .flw-tgrp[data-g="brace"]'); if (!g) return null;
        const ln = g.querySelector('.flw-tline'), sv = ln && ln.querySelector('svg'), p = sv && sv.querySelector('path'), body = g.querySelector('.flw-tgb');
        const rr = e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, y: Math.round(r.top) }; };
        const rows = [...g.querySelectorAll('.flw-trow')].map(e => e.getBoundingClientRect());
        return { svg: sv && rr(sv), path: p && rr(p), body: body && rr(body), rowsTop: Math.round(rows[0].top), rowsBot: Math.round(rows[rows.length - 1].bottom), smg: !!(p && /^M/.test(p.getAttribute('d') || '')) }; });
      const order = a.all.map(r => r.badge).join(','), names = a.all.map(r => r.name).join(',');
      T('T1', a.grp.length === 1 && a.grp[0].g === 'brace' && a.grp[0].rows.length === 2 && a.loose.length === 1 && order === 'jp,treble,bass' && names === '旋律,右手伴奏,左手伴奏',
        'T1a 钢琴伴奏歌谱（送别 + 一键配伴奏 slow）：旋律 1 行在外、花括号组「钢琴 · 大谱表」2 行；徽标依次 简 / 高音谱号 / 低音谱号（data-badge）', J({ grp: a.grp.map(g => g.g + ':' + g.rows.length + ':' + g.name), loose: a.loose.length, order, names, chip: a.chip }));
      T('T1', !!br && br.smg && br.path.h >= br.svg.h - 1.5 && br.path.w <= 8 && Math.abs(br.svg.h - (br.body.h - 8)) <= 2 && br.svg.h >= 60,
        'T1b 花括号＝SMuFL brace 非均匀拉伸：字形高贴满组身（组身高 −8，±2）而宽仍 ≤8px（均匀缩放会变成一个大括号团）', J(br));
      /* 轨名不截断：静止态 + 每一行轮流当前（动作钮露出、摘要收起）+ 悬停 */
      const cuts = [];
      a.all.forEach(r => { if (r.cut) cuts.push('静止 ' + r.name); });
      for (const [k, i] of [['vox', 0], ['vox', 1], ['vox', 2]]) {
        await pg.click(rowSel(k, i), { position: { x: 20, y: 18 } }); await wait(pg, 150);
        await pg.hover(rowSel(k, i), { position: { x: 20, y: 18 } });
        const t = await EV(pg, TREE); t.all.forEach(r => { if (r.cut) cuts.push((r.on ? '当前 ' : '') + r.name); });
      }
      await away(pg);
      T('T1', !cuts.length, 'T1c 248 宽下轨名 scrollWidth ≤ clientWidth：「旋律」「右手伴奏」「左手伴奏」在静止 / 当前（露出 静音 · 独奏 · ⋯）/ 悬停各态都不截断', cuts.join('；') || '3 行 × 3 态');
      await shot(pg, 'T1-pacc-1280x800');
    });
    await SAFE('T2', 'T2', async () => {
      const v0 = await EV(pg, () => { __scn('choir'); return song.voxGroups; });
      await wait(pg, 200);
      const a = await EV(pg, TREE);
      const hooks = await EV(pg, () => { const g = document.querySelector('#flw-tlist .flw-tgrp[data-g="bracket"]'); return g ? [g.querySelectorAll('.flw-tline .flw-bt path').length, g.querySelectorAll('.flw-tline .flw-bb path').length] : null; });
      for (let i = 0; i < 4; i++) { await pg.click(rowSel('vox', i), { position: { x: 20, y: 18 } }); await wait(pg, 80); }
      const v1 = await EV(pg, () => ({ vg: song.voxGroups, has: Object.prototype.hasOwnProperty.call(song, 'voxGroups') }));
      T('T2', a.grp.length === 1 && a.grp[0].g === 'bracket' && a.grp[0].rows.length === 4 && J(hooks) === '[1,1]' && v0 === undefined && v1.vg === undefined && !v1.has,
        'T2 欢乐颂（四部合唱）：方括号组 4 行（Bravura bracketTop / Bottom 两钩）；song.voxGroups 进出与逐行点选前后都是 undefined（合唱方括号只按谱类推断显示，不写数据）',
        J({ grp: a.grp.map(g => g.g + ':' + g.rows.length + ':' + g.name), hooks, v0: v0 === undefined ? 'undefined' : v0, v1 }));
      await shot(pg, 'T2-choir-1280x800');
    });
    await SAFE('T3', 'T3', async () => {
      await scn(pg, 'gtr'); await wait(pg, 200);
      const a = await EV(pg, TREE);
      const g = a.grp.find(x => x.g === 'gtr');
      T('T3', !!g && g.rows.length === 2 && g.rows.every(r => r.badge === 'tab6') && g.sub.length === 1 && /五线谱联排/.test(g.sub[0]) && /全部吉他轨/.test(g.sub[0]) && a.loose.length === 1 && a.loose[0].badge === 'jp',
        'T3 两只老虎（吉他弹唱）：吉他组 2 行（徽标 六）、组末「五线谱联排 · 全部吉他轨」行；旋律轨在组外', J({ g, loose: a.loose.map(r => r.name + ':' + r.badge) }));
      await shot(pg, 'T3-gtr-1280x800');
    });
    await SAFE('T4', 'T4', async () => {
      await scn(pg, 'pacc'); await wait(pg, 200);
      const p0 = (await EV(pg, TREE)).pal;
      await pg.click(rowSel('vox', 1), { position: { x: 20, y: 18 } }); await wait(pg, 200);
      const r = await EV(pg, () => ({ sel: { row: sel.row, vi: sel.vi }, at: activeTab, cur: (document.querySelector('#flw-tlist .flw-trow.on') || {}).id, as: (document.querySelector('#flw-tr-vox-1') || { getAttribute: () => null }).getAttribute('aria-selected'),
        scope: (document.querySelector('#flw-pscope .flw-sn') || {}).textContent, ae: document.activeElement && document.activeElement.className }));
      const p1 = (await EV(pg, TREE)).pal;
      T('T4', r.sel.row === 'vox' && r.sel.vi === 1 && r.at === 'vox' && r.cur === 'flw-tr-vox-1' && r.as === 'true' && p1.includes('钢琴') && !p0.includes('钢琴') && /右手伴奏/.test(r.scope || '') && !/flw-trow/.test(r.ae || ''),
        'T4 点「右手伴奏」行 → sel {row:vox, vi:1}、activeTab vox、行 aria-selected；记号面板换五线谱语境出现「钢琴」组（旋律简谱时没有）、作用于芯片跟着换；鼠标点的焦点不留在行上',
        J({ r, p0: p0.join('/'), p1: p1.join('/') }));
    });
    await close(pg);
  });

  /* ================= T5–T7 记谱法层：点界面 ＝ 调旧函数（逐字节）· 往返还原 ================= */
  const SNAP = () => ({ j: JSON.stringify(song), sc: __h(__score()), np: document.querySelectorAll('#score path').length, nt: JSON.stringify(song.voxNotations), du: JSON.stringify(song.voxDual),
    jv: JSON.stringify(song.tabJpVoices), ts: song.tabStaff === undefined ? 'undef' : String(song.tabStaff), sel: sel.row + sel.vi });
  const eye = (k, i, v) => '#flw-tlist [data-fa="tree:eye"][data-k="' + k + '"][data-i="' + i + '"]' + (v ? '[data-v="' + v + '"]' : '');
  if (['T5', 'T6'].some(want)) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T5' });
    await SAFE('T5', 'T5', async () => {
      /* 界面：五线谱眼睛（叠亮）→ 简谱眼睛（撤对照）→ 简谱眼睛（再叠）→ 五线谱眼睛（撤五线谱，回到只有简谱） */
      const UI = [['st', 'staff', 'true'], ['jp', 'staff', 'false'], ['jp', 'staff', 'true'], ['st', null, 'false']];
      const FN = ["setVoxNotation('staff'); toggleVoxDual();", 'toggleVoxDual();', 'toggleVoxDual();', "toggleVoxDual(); setVoxNotation('jianpu');"];
      await scn(pg, 'songbie', { mi: 1 });
      const s0 = await EV(pg, SNAP), ui = [];
      for (const [v] of UI) { await pg.click(eye('vox', 0, v)); await wait(pg, 150); ui.push(await EV(pg, SNAP)); }
      await scn(pg, 'songbie', { mi: 1 });
      const f0 = await EV(pg, SNAP), fn = [];
      for (const code of FN) { await EV(pg, c => { (0, eval)(c); }, code); fn.push(await EV(pg, SNAP)); }
      const dataOk = UI.map((u, i) => { const s = ui[i], nt = JSON.parse(s.nt || 'null') || [], du = JSON.parse(s.du || 'null') || [];
        return (u[1] ? nt[0] === u[1] : (nt[0] == null)) && String(!!du[0]) === u[2]; });
      const same = ui.map((s, i) => s.j === fn[i].j && s.sc === fn[i].sc);
      T('T5', s0.j === f0.j && dataOk.every(Boolean) && same.every(Boolean),
        'T5a 旋律轨记谱法层四步（五线谱眼睛＝叠亮 → 简谱眼睛＝撤对照 → 再叠 → 五线谱眼睛＝撤五线谱）：每一步 voxNotations[0] / voxDual[0] 符合，且 song JSON 与 #score 都和直接调 setVoxNotation / toggleVoxDual 逐字节相同',
        J({ data: UI.map((u, i) => u[0] + '→' + ui[i].nt + '/' + ui[i].du + (dataOk[i] ? '' : '✗')), same, init: s0.j === f0.j }));
      T('T5', ui[0].np > s0.np && ui[0].sc !== s0.sc && ui[1].sc !== ui[0].sc, 'T5b 谱面重刻：叠亮五线谱后 #score 路径数增加（' + s0.np + ' → ' + ui[0].np + '），撤对照后谱面再变');
      T('T5', ui[3].sc === s0.sc && (await EV(pg, ([a, c]) => __norm(a) === __norm(c), [ui[3].j, s0.j])),
        'T5c 全部点回：#score 逐字节还原；song 等价还原（只剩 voxNotations:[null] / voxDual:[false] 与缺省等价——与经典外壳点回去的结果相同）',
        J({ score: ui[3].sc + ' vs ' + s0.sc, diff: await EV(pg, ([a, c]) => __diff(a, c), [s0.j, ui[3].j]) }));
    });
    await SAFE('T6', 'T6', async () => {
      const only = v => '#flw-tlist [data-fa="tree:only"][data-k="vox"][data-i="0"][data-v="' + v + '"]';
      await scn(pg, 'songbie', { mi: 1 });
      const s0 = await EV(pg, SNAP);
      await pg.click(only('st')); await wait(pg, 150); const a1 = await EV(pg, SNAP);
      await pg.click(only('jp')); await wait(pg, 150); const a2 = await EV(pg, SNAP);
      await EV(pg, () => { __toasts.length = 0; });
      await pg.click(eye('vox', 0, 'jp')); await wait(pg, 150); const a3 = await EV(pg, SNAP); const t3 = await toasts(pg);
      await pg.click(only('st')); await wait(pg, 150);
      await EV(pg, () => { __toasts.length = 0; });
      const a4p = await EV(pg, SNAP);
      await pg.click(eye('vox', 0, 'st')); await wait(pg, 150); const a4 = await EV(pg, SNAP); const t4 = await toasts(pg);
      /* 谱号 ▾（五线谱层开着才有）：低音谱号 */
      await pg.click('#flw-tlist [data-fa="tree:clef"][data-i="0"]'); await wait(pg, 150);
      const menu = await EV(pg, () => { const m = document.getElementById('popmenu'); return m ? { m: m.dataset.m, n: m.querySelectorAll('[data-fa="tree:clefset"]').length } : null; });
      await pg.click('#popmenu [data-fa="tree:clefset"][data-v="bs"]'); await wait(pg, 150); const a5 = await EV(pg, SNAP);
      /* 同一序列直接调旧函数 */
      await scn(pg, 'songbie', { mi: 1 });
      const f = [];
      for (const c of ["setVoxNotation('staff')", "setVoxNotation('jianpu')", '0', "setVoxNotation('staff')", "setVoxNotation('bass')"]) { await EV(pg, x => { (0, eval)(x); }, c); f.push(await EV(pg, SNAP)); }
      T('T6', JSON.parse(a1.nt)[0] === 'staff' && !(JSON.parse(a1.du || '[]')[0]) && JSON.parse(a2.nt)[0] == null && a1.j === f[0].j && a2.j === f[1].j && a1.sc === f[0].sc && a2.sc === f[1].sc,
        'T6a 点层名「只显示这一种」：「五线谱」＝setVoxNotation(\'staff\')（无对照）、「简谱」＝setVoxNotation(\'jianpu\')，song 与 #score 逐字节相同', J({ a1: a1.nt + '/' + a1.du, a2: a2.nt }));
      T('T6', a3.j === a2.j && a3.sc === a2.sc && t3.some(t => /至少保留一种记谱法/.test(t)) && a4.j === a4p.j && t4.some(t => /至少保留一种记谱法/.test(t)),
        'T6b 只剩一层时再点它的眼睛（只有简谱时点简谱 / 只有五线谱时点五线谱）＝不改谱、不重刻 + 提示「至少保留一种记谱法」', J({ t3, t4 }));
      T('T6', !!menu && menu.m === 'treeClef' && menu.n === 3 && JSON.parse(a5.nt)[0] === 'bass' && a5.j === f[4].j && a5.sc === f[4].sc,
        'T6c 谱号 ▾（菜单挂 body，三项）选「低音谱号」＝setVoxNotation(\'bass\')（#vn-bs），song 与 #score 逐字节相同', J({ menu, nt: a5.nt }));
    });
    await close(pg);
  });
  if (want('T7')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T7' });
    await SAFE('T7', 'T7', async () => {
      const tjp = '#flw-tlist [data-fa="tree:tabjp"][data-k="tab"][data-i="0"]', tst = '#flw-tlist [data-fa="tree:tabstaff"]';
      await scn(pg, 'gtr', { mi: 1 });
      const s0 = await EV(pg, SNAP);
      await pg.click(tjp); await wait(pg, 150); const a1 = await EV(pg, SNAP);
      const pr1 = await EV(pg, s => document.querySelector(s).getAttribute('aria-pressed'), tjp);
      await EV(pg, () => undo()); await wait(pg, 100); const u1 = await EV(pg, SNAP);
      await pg.click(tst); await wait(pg, 150); const a2 = await EV(pg, SNAP);
      await EV(pg, () => undo()); await wait(pg, 100); const u2 = await EV(pg, SNAP);
      await pg.click(tjp); await wait(pg, 120); await pg.click(tjp); await wait(pg, 120); const r1 = await EV(pg, SNAP);
      await pg.click(tst); await wait(pg, 120); await pg.click(tst); await wait(pg, 120); const r2 = await EV(pg, SNAP);
      await scn(pg, 'gtr', { mi: 1 });
      await EV(pg, () => document.getElementById('nl-tabjp').click()); const f1 = await EV(pg, SNAP);
      await scn(pg, 'gtr', { mi: 1 });
      await EV(pg, () => document.getElementById('tn-both').click()); const f2 = await EV(pg, SNAP);
      T('T7', JSON.parse(a1.jv || '[]')[0] === true && pr1 === 'true' && a1.j === f1.j && a1.sc === f1.sc && a1.sc !== s0.sc && u1.j === s0.j,
        'T7a 六线谱轨「简谱行 · 仅本轨」眼睛：tabJpVoices[0] 翻转（aria-pressed 跟着亮）、与 #nl-tabjp 同一数据与谱面；一步撤销逐字节还原', J({ jv: a1.jv, pr1, same: a1.j === f1.j }));
      T('T7', a2.ts === 'true' && a2.j === f2.j && a2.sc === f2.sc && u2.j === s0.j,
        'T7b 吉他组末「五线谱联排 · 全部吉他轨」：tabStaff 翻转、与 #tn-both 同一数据与谱面；一步撤销逐字节还原', J({ ts: a2.ts }));
      T('T7', r1.j === s0.j && r1.sc === s0.sc && r2.j === s0.j && r2.sc === s0.sc,
        'T7c 两个开关各点两次：song JSON 与 #score 逐字节还原（tabJp / tabJpVoices 全关即删、tabStaff 关即删）', J({ r1: r1.j === s0.j, r2: r2.j === s0.j }));
      await shot(pg, 'T7-gtr-tabjp-1280x800');
    });
    await close(pg);
  });

  /* ================= T8 静音 / 独奏 ================= */
  if (want('T8')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T8' });
    await SAFE('T8', 'T8', async () => {
      await scn(pg, 'gtr');
      const m0 = await EV(pg, () => JSON.stringify(song.mixer));
      await rowAct(pg, 'vox', 0, '.flw-tmute');
      const a = await EV(pg, () => ({ mx: JSON.stringify(song.mixer), keys: Object.keys(song.mixer || {}), pr: document.querySelector('#flw-tr-vox-0 .flw-tmute').getAttribute('aria-pressed'),
        muted: document.querySelector('#flw-tr-vox-0').classList.contains('muted') }));
      const aud = await EV(pg, () => ({ vox0: trackAudible('vox', 0), tab0: trackAudible('tab', 0) }));
      await rowAct(pg, 'tab', 1, '.flw-tsolo');
      const s = await EV(pg, () => ({ solo: (song.mixer['tab:1'] || {}).solo, pr: document.querySelector('#flw-tr-tab-1 .flw-tsolo').getAttribute('aria-pressed') }));
      const s2 = await EV(pg, () => ({ any: anySolo(), tab1: trackAudible('tab', 1), tab0: trackAudible('tab', 0) }));
      /* 集成补：鼠标点开关钮后焦点不留在树上（否则行一直 :focus-within 露着动作钮、空格再按一次这枚钮而不是播放；与记号面板同口径） */
      const fo = await EV(pg, () => { const a = document.activeElement, t = document.getElementById('flw-trk'); return { inTrk: !!(a && t && t.contains(a)), ae: a ? (a.id || a.className || a.tagName) : null }; });
      /* 已打开的静音 / 独奏在非当前行常显：光标在 tab:0（当前行），鼠标移开 */
      await away(pg); await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); }); await wait(pg, 120);   /* 焦点行（:focus-within）也露动作钮，这里量「非当前、非悬停、无焦点」 */
      const vis = await EV(pg, () => ({ m: __vis('#flw-tr-vox-0 .flw-tmute'), s0: __vis('#flw-tr-vox-0 .flw-tsolo'), more0: __vis('#flw-tr-vox-0 [data-fa="tree:more"]'),
        s1: __vis('#flw-tr-tab-1 .flw-tsolo'), m1: __vis('#flw-tr-tab-1 .flw-tmute'), cur: (document.querySelector('#flw-tlist .flw-trow.on') || {}).id }));
      await rowAct(pg, 'vox', 0, '.flw-tmute');
      const b2 = await EV(pg, () => ({ on: song.mixer['vox:0'].on, pr: document.querySelector('#flw-tr-vox-0 .flw-tmute').getAttribute('aria-pressed') }));
      T('T8', m0 === undefined && J(a.keys) === '["vox:0"]' && JSON.parse(a.mx)['vox:0'].on === false && a.pr === 'true' && a.muted && aud.vox0 === false && aud.tab0 === true,
        'T8a 静音：song.mixer[\'vox:0\'].on===false（只写被点的这一条，缺省条目照 trkMixSet / trackCfg 口径）、trackAudible(\'vox\',0)===false、钮 aria-pressed=true、行标 .muted', J({ m0: m0 === undefined ? 'undefined' : m0, a, aud }));
      T('T8', s.solo === true && s.pr === 'true' && s2.any === true && s2.tab1 === true && s2.tab0 === false,
        'T8b 独奏：song.mixer[\'tab:1\'].solo===true、anySolo()===true、只有独奏轨发声、aria-pressed 同步', J({ s, s2 }));
      T('T8', !fo.inTrk, 'T8d 鼠标点树上的静音 / 独奏后焦点不留在音轨树里（行不再 :focus-within 常露动作钮，空格不会再按一次独奏）', J({ fo }));
      T('T8', vis.cur === 'flw-tr-tab-0' && vis.m && !vis.s0 && !vis.more0 && vis.s1 && !vis.m1 && b2.on === true && b2.pr === 'false',
        'T8c 已打开的静音 / 独奏在非当前、非悬停行常显（只露亮着的那一枚，其余与 ⋯ 不露）；再点静音还原 on:true', J({ vis, b2 }));
      await shot(pg, 'T8-mute-solo-1280x800');
    });
    await close(pg);
  });

  /* ================= T9 ⋯ 混音 ＝ 经典混音台（数据与播放事件逐步对拍）================= */
  const MIXSTEPS = [['mute', 'vox', 0], ['solo', 'tab', 1], ['vol', 'tab', 0, 60], ['pan', 'vox', 0, -40], ['pan0', 'vox', 0], ['inst', 'tab', 1, 'nylon'], ['vol', 'vox', 0, 135]];
  const mixStep = async (pg, flow, st, live) => {
    const [a, k, i, v] = st;
    if (flow) {
      if (a === 'mute') return rowAct(pg, k, i, '.flw-tmute');
      if (a === 'solo') return rowAct(pg, k, i, '.flw-tsolo');
      await rowAct(pg, k, i, '[data-fa="tree:more"]'); await wait(pg, 100);
      if (a === 'inst') await pg.selectOption('#popmenu [data-mx="inst"]', v);
      else if (a === 'pan0') await pg.click('#popmenu [data-fa="tree:pan0"]');
      else await EV(pg, ([a, v]) => { const el = document.querySelector('#popmenu [data-mx="' + a + '"]'); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, [a, v]);
      await wait(pg, 80); await pg.keyboard.press('Escape'); await wait(pg, 80); return;
    }
    const row = '#mx-tracks .mx-row[data-kind="' + k + '"][data-vi="' + i + '"] ';
    if (a === 'mute') return pg.click(row + '.mx-btn.mute');
    if (a === 'solo') return pg.click(row + '.mx-btn.solo');
    if (a === 'inst') return pg.selectOption(row + '.mx-inst', v);
    /* 双击滑杆＝回「自动」。真实双击的第一下 click 会先把滑杆拨到点击处（写一次 pan=0 再写 null）；播放中对拍只比「复位」本身，用不带前置 click 的 dblclick 事件 */
    if (a === 'pan0') return live ? EV(pg, s => document.querySelector(s).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), row + '.mx-pan input') : pg.dblclick(row + '.mx-pan input');
    return EV(pg, ([s, v]) => { const el = document.querySelector(s); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, [row + (a === 'vol' ? '.mx-vol input' : '.mx-pan input'), v]);
  };
  if (want('T9')) jobs.push(async () => {
    const [pf, pc] = await Promise.all([open(1280, 800, { tag: 'T9f' }), open(1280, 800, { tag: 'T9c', url: CLASSICU })]);
    await SAFE('T9', 'T9', async () => {
      await scn(pf, 'gtr'); await scn(pc, 'gtr');
      /* 音轨树只读：画树、开关各行 ⋯ 菜单、悬停，song.mixer 仍不存在（计划 R5：读混音不经 trackCfg） */
      for (const [k, i] of [['tab', 0], ['tab', 1], ['vox', 0]]) { await rowAct(pf, k, i, '[data-fa="tree:more"]'); await wait(pf, 80); await pf.keyboard.press('Escape'); }
      const r5 = await EV(pf, () => ({ mixer: song.mixer === undefined, menu: !!document.getElementById('popmenu') }));
      T('T9', r5.mixer && !r5.menu, 'T9a 音轨树只读不补写：画树 + 开关三条轨的 ⋯ 混音菜单后 song.mixer 仍是 undefined（不调 trackCfg / anySolo / trackAudible）', J(r5));
      await pc.click('#mx-expand'); await wait(pc, 200);
      const flowS = [], clsS = [];
      const snap = pg => EV(pg, () => ({ eff: __mixEff(), play: __play() }));
      flowS.push(await snap(pf)); clsS.push(await snap(pc));
      for (const st of MIXSTEPS) {
        await mixStep(pf, true, st); await mixStep(pc, false, st); await wait(pf, 60);
        flowS.push(await snap(pf)); clsS.push(await snap(pc));
      }
      const bad = flowS.map((f, i) => J(f) === J(clsS[i]) ? null : (i ? MIXSTEPS[i - 1].join(':') : '初始') + ' flow=' + J(f) + ' classic=' + J(clsS[i])).filter(Boolean);
      const fin = await Promise.all([pf, pc].map(p => EV(p, () => { const m = song.mixer || {}; return JSON.stringify(Object.keys(m).sort().map(k => [k, m[k]])); })));
      const last = flowS[flowS.length - 1];
      T('T9', !bad.length && fin[0] === fin[1] && last.play.n > 0,
        'T9b 静音 vox0 → 独奏 tab1 → 音量 tab0 60% → 声像 vox0 L40 → 声像复位（自动）→ 音色 tab1 尼龙 → 音量 vox0 135%：每一步音轨树（⋯ 菜单）与经典混音台行改出的有效混音、播放光标时间轴、各轨增益 / 声像、每个音的音色逐项相同；最终 song.mixer 逐条相同',
        bad.length ? bad.join('\n      ') : (MIXSTEPS.length + 1) + ' 步 · 末步 ' + last.play.n + ' 个音 · ' + last.play.gains + ' · ' + last.play.insts);
      const m = await EV(pf, () => ({ t0: song.mixer['tab:0'], t1: song.mixer['tab:1'], v0: song.mixer['vox:0'] }));
      T('T9', m.t0.vol === 0.6 && m.t1.inst === 'nylon' && m.t1.solo === true && m.v0.pan === null && m.v0.vol === 1.35 && m.v0.on === false,
        'T9c ⋯ 里改的值原样落在 song.mixer（v56 起的同一组字段 on / solo / vol / pan / inst）', J(m));
      /* 播放中即时生效（applyMixLive）：同一组步骤在播放中做，记下每一步各轨总线 setTargetAtTime 的值与光标时间轴的参考轨，两边对拍 */
      const LIVE0 = () => { window.__stc = [];
        if (!window.__stcW) { const o = AudioParam.prototype.setTargetAtTime; AudioParam.prototype.setTargetAtTime = function (v, at, tc) {
          if (window.__stcOn) { const tr = audio.tracks || {}, k = Object.keys(tr).find(x => tr[x].dry && tr[x].dry.gain === this), kp = !k && Object.keys(tr).find(x => tr[x].pan && tr[x].pan.pan === this);
            __stc.push((k ? k + '.增益' : kp ? kp + '.声像' : '?') + '=' + (+v).toFixed(3)); } return o.call(this, v, at, tc); }; window.__stcW = 1; }
        window.SF_PLAYWAIT = false; play(); window.__stcOn = true; return !!audio.playing; };
      const LIVE1 = () => { const r = { calls: __stc.slice().sort().join(' '), ref: (audio.events || []).slice(0, 1).map(e => e.pre + (e.whole ? '·整谱' : '·单轨')).join(), n: (audio.events || []).length, playing: !!audio.playing }; __stc.length = 0; return r; };
      await scn(pf, 'gtr'); await scn(pc, 'gtr'); await EV(pc, () => { if (!mixerExpanded) document.getElementById('mx-expand').click(); }); await wait(pc, 150);
      const on = await Promise.all([pf, pc].map(p => EV(p, LIVE0)));
      const lf = [], lc = [];
      for (const st of MIXSTEPS.filter(x => x[0] !== 'inst')) { await mixStep(pf, true, st, 1); await mixStep(pc, false, st, 1); await wait(pf, 60); lf.push(await EV(pf, LIVE1)); lc.push(await EV(pc, LIVE1)); }
      await Promise.all([pf, pc].map(p => EV(p, () => { window.__stcOn = false; try { stopPlay(); } catch (_) {} })));
      const lbad = lf.map((f, i) => J(f) === J(lc[i]) ? null : MIXSTEPS.filter(x => x[0] !== 'inst')[i].join(':') + ' flow=' + J(f) + ' classic=' + J(lc[i])).filter(Boolean);
      T('T9', on.every(Boolean) && !lbad.length && lf.every(x => x.playing && x.calls) && /tab:1·单轨|t1·单轨/.test(lf[1].ref),
        'T9d 播放中即时生效：同一组步骤（静音 / 独奏 / 音量 / 声像 / 复位 / 音量）在播放中经音轨树做，各轨总线 setTargetAtTime 的目标值与光标参考轨（独奏后切到该轨单轨模式）与经典混音台逐步相同',
        lbad.length ? lbad.join('\n      ') : lf.map(x => x.ref + '｜' + x.calls).join('；'));
    });
    await Promise.all([close(pf), close(pc)]);
  });

  /* ================= T10 8 轨 / 12 轨：48% · 「还有 N 条」· 记号区露出 ================= */
  const GEO10 = () => {
    const L = document.getElementById('flw-left').getBoundingClientRect(), T = document.getElementById('flw-trk').getBoundingClientRect();
    const tl = document.getElementById('flw-tlist'), tr = tl.getBoundingClientRect(), mh = tl.querySelector('.flw-tmore');
    const hint = mh && __vis(mh) ? mh.getBoundingClientRect() : null;
    const rows = [...tl.querySelectorAll('.flw-trow')];
    const cut = hint ? hint.top : tr.bottom - 24;   /* 无提示时：提示条（高 24）若出现会盖住的那一带也不得有轨行（＝没有被藏起来的行） */
    const below = rows.filter(r => { const b = r.getBoundingClientRect(); return (b.top + b.bottom) / 2 > cut; }).length;
    const g = document.getElementById('flw-pgrid').getBoundingClientRect(), inG = e => { const q = e.getBoundingClientRect(); return q.height > 0 && q.top >= g.top - 0.5 && q.bottom <= g.bottom + 0.5; };
    const heads = [...document.querySelectorAll('#flw-pgrid .flw-pgh')].filter(inG).map(x => x.textContent.replace(/\d+$/, '').replace(/本机习惯$/, '').trim());
    const rec = [...document.querySelectorAll('#flw-pgrid .flw-rec .flw-sg')];
    return { lh: Math.round(L.height), th: Math.round(T.height * 10) / 10, ratio: Math.round(T.height / L.height * 1000) / 1000, rows: rows.length, over: tl.scrollHeight > tl.clientHeight + 2,
      hint: hint ? { n: +mh.dataset.n, t: mh.textContent } : null, below, heads, recAll: rec.length, recVis: rec.filter(inG).length, cutNames: rows.filter(r => { const n = r.querySelector('.flw-tn'); return n.scrollWidth > n.clientWidth + 0.5; }).length };
  };
  if (want('T10')) for (const [w, h] of [[1280, 800], [1440, 900]]) jobs.push(async () => {
    const pg = await open(w, h, { tag: 'T10 ' + w });
    await SAFE('T10', 'T10 ' + w, async () => {
      const res = {};
      for (const k of ['pacc', 'choir', 'gtr', 't8', 't12']) { await scn(pg, k); await wait(pg, 250); res[k] = await EV(pg, GEO10);
        if (k === 't12') { await shot(pg, 'T10-t12-' + w + 'x' + h);
          res.t12end = await EV(pg, () => { const tl = document.getElementById('flw-tlist'); tl.scrollTop = tl.scrollHeight; return 0; }); await wait(pg, 250); res.t12end = await EV(pg, GEO10); } }
      const bad = [];
      Object.entries(res).forEach(([k, g]) => {
        if (!(g.ratio <= 0.481)) bad.push(k + ' 音轨区占 ' + g.ratio);
        if (g.cutNames) bad.push(k + ' 轨名截断 ' + g.cutNames);
        if (k !== 't12end') { if (g.hint ? !(g.hint.n === g.below && g.below > 0 && g.hint.t === '还有 ' + g.below + ' 条 ↓') : g.below > 0) bad.push(k + ' 提示 ' + J(g.hint) + ' 实际区外 ' + g.below); }
        else if (g.hint || g.below) bad.push('滚到底仍有提示 / 区外行 ' + J(g.hint) + ' ' + g.below);
        if (!(g.heads[0] === '最近使用' && g.recVis === 6 && g.heads.length >= 3)) bad.push(k + ' 记号区露出 ' + g.heads.join('/') + ' 最近格 ' + g.recVis);
      });
      const ov = ['t8', 't12'].every(k => res[k].over && res[k].hint) && res.t8.rows === 8 && res.t12.rows === 12 && res.pacc.rows === 3 && res.choir.rows === 4 && res.gtr.rows === 3;
      /* 当前轨行始终在音轨区可视范围内（提示条以上）：换窗口（上一份谱的当前行 id 相同）· 程序改光标轨（Alt+↑↓ / 点谱面同路径）· 键盘 Alt+↓ */
      const CURV = () => { const tl = document.getElementById('flw-tlist'), c = tl.querySelector('.flw-trow.on'), mh = tl.querySelector('.flw-tmore');
        if (!c) return { id: null }; const r = c.getBoundingClientRect(), t = tl.getBoundingClientRect(), bot = mh && __vis(mh) ? mh.getBoundingClientRect().top : t.bottom;
        return { id: c.id, ok: r.top >= t.top - 0.5 && r.bottom <= bot + 0.5, top: Math.round(r.top - t.top), bot: Math.round(bot - r.bottom), st: tl.scrollTop }; };
      const cv = [];
      await scn(pg, 'gtr'); await EV(pg, () => { document.getElementById('flw-tlist').scrollTop = 0; }); await wait(pg, 200);
      await scn(pg, 't8'); await wait(pg, 200); cv.push(['8 轨', await EV(pg, CURV)]);
      await scn(pg, 't12'); await wait(pg, 200); cv.push(['换成 12 轨（当前行 id 同为 vox-0）', await EV(pg, CURV)]);
      await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 5, ci: 0, si: 1 }; clampSel(); render(); }); await wait(pg, 200); cv.push(['光标改到 旋律六', await EV(pg, CURV)]);
      await EV(pg, () => { sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); render(); }); await wait(pg, 200); cv.push(['光标改到 吉他1', await EV(pg, CURV)]);
      await away(pg); await pg.keyboard.press('Alt+ArrowDown'); await wait(pg, 200); cv.push(['Alt+↓', await EV(pg, CURV)]);
      const cbad = cv.filter(([, c]) => !c.ok);
      T('T10', !cbad.length, 'T10b ' + w + '×' + h + ' 当前轨行始终露在音轨区里（提示条以上）：换窗口后 · 程序改光标轨 · Alt+↓ 换轨',
        cbad.length ? cbad.map(([k, c]) => k + ' ' + J(c)).join('；') : cv.map(([k, c]) => k + ' ' + c.id).join('；'));
      T('T10', !bad.length && ov, 'T10 ' + w + '×' + h + '：音轨区 ≤ 左栏 48%（钢琴伴奏 / 合唱 / 吉他弹唱 / 8 轨 / 12 轨）；溢出时「还有 N 条 ↓」的 N＝提示条上缘以下的轨行数、滚到底提示消失；记号区同屏露出「最近使用」6 格与 ≥2 个组标题；轨名不截断',
        bad.length ? bad.join('；') : Object.entries(res).map(([k, g]) => k + ' ' + g.th + '/' + g.lh + '=' + g.ratio + (g.hint ? ' 还有' + g.hint.n : '') + ' 露出 ' + g.heads.slice(0, 3).join('/')).join('；'));
    });
    await close(pg);
  });

  /* ================= T11 命中区：中心 28×28 四角都命中自身 ================= */
  const HIT = sels => {
    const out = [], bad = [];
    sels.forEach(s => document.querySelectorAll(s).forEach(el => {
      if (!__vis(el)) return;
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      /* 角点取中心 ±13（＝28 方块往里 1px）：Chrome 的命中测试在相邻控件交界处有约 0.9px 的亚像素归属偏差（实测 静音 155–183 / 独奏 183–211 时 x≥182.2 已判给独奏），±13.5 会误报 */
      const miss = [[-13, -13], [13, -13], [-13, 13], [13, 13]].filter(([dx, dy]) => { const t = document.elementFromPoint(cx + dx, cy + dy); return !(t && (t === el || el.contains(t))); });
      const nm = s + (el.dataset.v ? '[' + el.dataset.v + ']' : '') + (el.dataset.idx != null ? '#' + el.dataset.idx : '');
      out.push(s);
      if (miss.length) { const t = document.elementFromPoint(cx + miss[0][0], cy + miss[0][1]); bad.push(nm + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' 漏角 ' + miss.length + '（落到 ' + (t ? (t.id || t.className || t.tagName) : '无') + '）'); }
    }));
    return { n: out.length, bad, kinds: [...new Set(out)] };
  };
  if (want('T11')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T11' });
    await SAFE('T11', 'T11', async () => {
      const S1 = ['#flw-tlist .flw-trow.on .flw-tmute', '#flw-tlist .flw-trow.on .flw-tsolo', '#flw-tlist .flw-trow.on [data-fa="tree:more"]', '#flw-tlist .flw-teye', '#flw-tlist .flw-tonly',
        '#flw-tlist .flw-tclef', '#flw-tlist .flw-tvc', '#flw-tlist .flw-tfill', '#flw-kchip', '#flw-thd .flw-tib'];
      await scn(pg, 'pacc'); await away(pg); await wait(pg, 150);
      const a = await EV(pg, HIT, S1);
      await pg.click(rowSel('vox', 1), { position: { x: 20, y: 18 } }); await away(pg); await wait(pg, 150);
      const b2 = await EV(pg, HIT, S1);
      await scn(pg, 'gtr'); await away(pg); await wait(pg, 150);
      const c = await EV(pg, HIT, S1);
      const kinds = [...new Set([...a.kinds, ...b2.kinds, ...c.kinds])];
      const bad = [...a.bad, ...b2.bad, ...c.bad];
      T('T11', !bad.length && kinds.length >= 10, 'T11a 音轨树命中区 ≥28：当前行 静音 / 独奏 / ⋯、记谱法眼睛、层名、谱号 ▾、歌词段号与 ＋（伪元素扩展）、填词、谱类芯片、标题 ＋ / ⋯——中心 28×28 方块四角 elementFromPoint 都命中自身（钢琴伴奏歌谱旋律 / 右手、吉他弹唱）',
        bad.length ? bad.join('；') : (a.n + b2.n + c.n) + ' 个控件 · ' + kinds.length + ' 类');
      /* 记号面板：外框最小边 ≥28（同 tv_shellflow S16 口径；格子 52 / 36） */
      const pal = await EV(pg, () => { const small = [], n = { c: 0 }; ['#flw-pdens', '#flw-pclr', '#flw-pq', '#flw-pgrid button.flw-pgh', '#flw-pgrid .flw-sg'].forEach(s => document.querySelectorAll(s).forEach(e => {
        if (!__vis(e)) return; n.c++; const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 27.5) small.push(s + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); })); return { n: n.c, small }; });
      T('T11', !pal.small.length && pal.n > 20, 'T11b 记号面板控件外框最小边 ≥28（密度钮 · 清除 · 搜索框 · 组头 · 格子）', pal.small.join('；') || pal.n + ' 个');
      /* 集成补：密度钮 6px 圆角——Chrome 按圆角命中，四角往里 1px 会漏到 .flw-ph；要求同音轨树口径（::after 方块）四角命中自身 */
      const pd = await EV(pg, HIT, ['#flw-pdens']);
      T('T11', pd.n === 1 && !pd.bad.length, 'T11c 记号面板密度钮 #flw-pdens：中心 28×28 方块四角 elementFromPoint 都命中自身（圆角不漏角）', pd.bad.join('；') || pd.n + ' 个');
    });
    await close(pg);
  });

  /* ================= T12 加轨菜单：与经典「＋ 音轨」弹窗逐谱同一可用性 ================= */
  const OLDADD = () => { __toasts.length = 0; try { closeModal(); } catch (_) {}
    showAddTrackMenu(); const m = document.querySelector('#modal-mask');
    const r = { lock: !m && __toasts.some(t => /整谱形态/.test(t)), full: !m && __toasts.some(t => /上限/.test(t)), vox: !!document.getElementById('ta-vox'), tab: !!document.getElementById('ta-tab'), map: !!document.getElementById('ta-map') };
    try { closeModal(); } catch (_) {} return r; };
  const NEWADD = () => { const m = document.getElementById('popmenu'); if (!m || m.dataset.m !== 'treeAdd') return null;
    const en = a => { const e = m.querySelector('[data-fa="' + a + '"]'); return !!e && e.getAttribute('aria-disabled') !== 'true'; };
    const why = a => { const e = m.querySelector('[data-fa="' + a + '"]'); return e ? (e.dataset.why || '') : null; };
    const items = [...m.querySelectorAll('[data-fa]')].map(e => e.dataset.fa + (e.getAttribute('aria-disabled') === 'true' ? '✗' : ''));
    const dis = [...m.querySelectorAll('[aria-disabled="true"]')].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12) + '｜' + (e.dataset.why || '').slice(0, 30));
    return { lock: items.length === 1 && items[0] === 'tree:kindmenu' && /暂不支持加轨/.test(m.textContent), vox: en('tree:addvox'), tab: en('tree:addtab'), map: en('tree:gen'),
      allOff: !en('tree:addvox') && !en('tree:addtab'), items, dis, whyTab: why('tree:addtab'), whyVox: why('tree:addvox'), text: m.textContent.replace(/\s+/g, ' ') }; };
  if (want('T12')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T12' });
    await SAFE('T12', 'T12', async () => {
      const n = await EV(pg, () => PRESETS.length), bad = [], seen = [];
      const cases = Array.from({ length: n }, (_, i) => ['preset', { i }]).concat([['full', {}]]);
      for (const [k, o] of cases) {
        if (k === 'full') await EV(pg, () => { const s = createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 8, nVox: 7, lyr: 0 }); __one(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
        else await scn(pg, k, o);
        const old = await EV(pg, OLDADD); await wait(pg, 60);
        await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 120);
        const nw = await EV(pg, NEWADD);
        await pg.keyboard.press('Escape'); await wait(pg, 60);
        const title = await EV(pg, () => song.title + '·' + docType(song));
        seen.push(title + (old.lock ? ' 锁' : old.full ? ' 满' : ' ' + ['vox', 'tab', 'map'].filter(x => old[x]).join('+')));
        if (!nw) { bad.push(title + ' 菜单没开'); continue; }
        if (old.lock !== nw.lock) bad.push(title + ' 锁定 old=' + old.lock + ' new=' + nw.lock);
        else if (!old.lock) {
          if (old.full ? !nw.allOff : (old.vox !== nw.vox || old.tab !== nw.tab || old.map !== nw.map)) bad.push(title + ' old=' + J(old) + ' new=' + J({ vox: nw.vox, tab: nw.tab, map: nw.map }));
          if (!nw.vox && !nw.whyVox) bad.push(title + ' 旋律轨置灰没写原因');
          if (!nw.tab && !nw.whyTab) bad.push(title + ' ' + '吉他轨置灰没写原因');
        }
      }
      T('T12', !bad.length, 'T12a 加轨菜单与经典「＋ 音轨」弹窗逐谱同一可用性（16 个预设 + 满轨 8+7）：整谱形态⇔只给原因、旋律轨 / 吉他轨 / 由旋律生成 各自可用⇔弹窗里有那一项；置灰项都带原因',
        bad.length ? bad.join('；') : seen.join('；'));
      /* 锁定谱类：只给原因 +「换谱类…」，点它开换谱类菜单 */
      await scn(pg, 'canon'); await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 120);
      const lk = await EV(pg, NEWADD);
      await pg.click('#popmenu [data-fa="tree:kindmenu"]'); await wait(pg, 200);
      const lm = await EV(pg, () => !!document.getElementById('lb-menu')); await EV(pg, () => __shut());
      T('T12', !!lk && lk.lock && /钢琴大谱表 \/ 和弦格保持整谱形态，暂不支持加轨/.test(lk.text) && lm,
        'T12b 锁定谱类（卡农进行 · 钢琴弹唱伴奏谱）：只写原因（与经典弹窗同一句「钢琴大谱表 / 和弦格保持整谱形态，暂不支持加轨」）+「换谱类…」，点它打开换谱类菜单', J({ items: lk && lk.items, lm }));
      /* 功能谱：只加旋律轨 */
      await scn(pg, 'func'); await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 120);
      const fu = await EV(pg, NEWADD); await pg.keyboard.press('Escape');
      T('T12', !!fu && fu.vox && !fu.tab && /功能谱只加旋律轨/.test(fu.whyTab || '') && !/尤克里里轨/.test(fu.items.join()),
        'T12c 功能谱：旋律轨可加、吉他轨置灰「功能谱只加旋律轨」、不出 4 线 / 6 线的其他项', J(fu && { items: fu.items, whyTab: fu.whyTab }));
      /* 吉他弹唱：尤克里里轨置灰带原因 + 另建尤克里里弹唱谱；点「吉他轨」＝弹窗 #ta-tab */
      await scn(pg, 'gtr', { row: 'vox', vi: 0 }); await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 120);
      const gt = await EV(pg, NEWADD);
      const s0 = await EV(pg, () => ({ n: song.tabVoices.length }));
      await pg.click('#popmenu [data-fa="tree:addtab"]'); await wait(pg, 200);
      const a = await EV(pg, () => ({ j: JSON.stringify(song), sel: J2(sel), n: song.tabVoices.length, row: sel.row, vi: sel.vi, cur: (document.querySelector('#flw-tlist .flw-trow.on') || {}).id }));
      await scn(pg, 'gtr', { row: 'vox', vi: 0 });
      const o = await EV(pg, () => { showAddTrackMenu(); document.getElementById('ta-tab').click(); return { j: JSON.stringify(song), sel: J2(sel) }; });
      const ukuDis = gt && gt.dis.find(x => /^尤克里里轨/.test(x));
      T('T12', !!gt && !!ukuDis && /吉他（6 线）/.test(ukuDis) && gt.items.includes('tree:uku') && a.n === s0.n + 1 && a.row === 'tab' && a.vi === s0.n && a.cur === 'flw-tr-tab-' + s0.n && a.j === o.j && a.sel === o.sel,
        'T12d 吉他弹唱：「尤克里里轨」置灰并写原因（本谱乐器是吉他 6 线）、另给「另建尤克里里弹唱谱…」；点「吉他轨」→ tabVoices+1、光标落在新轨（树里新行高亮），song 与 sel 和经典弹窗 #ta-tab 逐字节相同',
        J({ uku: ukuDis, n: [s0.n, a.n], sel: a.row + a.vi, same: a.j === o.j }));
      /* 集成补（计划 §3.3）：「导入 MIDI 为新轨…」没有对应函数，本轮不出现（覆盖本轨的导入在本轨 ⋯ 里） */
      T('T12', !!gt && !/导入 MIDI 为新轨/.test(gt.text) && !!fu && !/导入 MIDI 为新轨/.test(fu.text), 'T12e 加轨菜单不出现「导入 MIDI 为新轨…」（计划 §3.3：现在没有对应函数，本轮不出现；不放死项）', J({ items: gt && gt.items }));
    });
    await close(pg);
  });

  /* ================= T13 改名 / 删除 ================= */
  if (want('T13')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T13' });
    await SAFE('T13', 'T13', async () => {
      await scn(pg, 'songbie');
      const j0 = await EV(pg, () => JSON.stringify(song));
      await rowAct(pg, 'vox', 0, '[data-fa="tree:more"]'); await pg.click('#popmenu [data-fa="tree:rename"]'); await wait(pg, 150);
      const ask = await EV(pg, () => { const i = document.getElementById('ask-in'); return i ? i.value : null; });
      await pg.fill('#ask-in', '主唱'); await pg.click('#ask-ok'); await wait(pg, 150);
      const r1 = await EV(pg, () => ({ n: song.voxVoices[0], row: (document.querySelector('#flw-tr-vox-0 .flw-tn') || {}).textContent }));
      await EV(pg, () => undo()); await wait(pg, 100);
      const j1 = await EV(pg, () => JSON.stringify(song));
      /* 双击轨名＝同一个改名框 */
      await pg.dblclick(rowSel('vox', 0) + ' .flw-tn'); await wait(pg, 150);
      const ask2 = await EV(pg, () => { const i = document.getElementById('ask-in'); return i ? i.value : null; });
      await EV(pg, () => __shut());
      T('T13', ask === '旋律' && r1.n === '主唱' && r1.row === '主唱' && j1 === j0 && ask2 === '旋律',
        'T13a ⋯「改名…」与双击轨名都开同一个 askText（默认值＝原名）；改成「主唱」后树与数据同步，一步撤销 song 逐字节还原', J({ ask, r1, undo: j1 === j0, ask2 }));
      /* 删除可用性与旧左栏 .vdel（canDel）逐轨一致 */
      const bad = [], seen = [];
      for (const k of ['songbie', 'gtr', 'canon', 'choir', 'pacc']) {
        await scn(pg, k);
        const tr = await EV(pg, () => song.tabVoices.map((_, i) => ['tab', i]).concat(song.voxVoices.map((_, i) => ['vox', i])));
        for (const [kk, i] of tr) {
          const old = await EV(pg, ([kk, i]) => { sel = { mi: 0, row: kk, vi: i, ci: 0, si: 1 }; clampSel(); setRibbon(kk); render(); return !!document.querySelector('#left-dock .vdel'); }, [kk, i]);
          await rowAct(pg, kk, i, '[data-fa="tree:more"]');
          const nw = await EV(pg, () => { const e = document.querySelector('#popmenu [data-fa="tree:del"]'); return e ? { en: e.getAttribute('aria-disabled') !== 'true', why: e.dataset.why || '' } : null; });
          await pg.keyboard.press('Escape');
          seen.push(k + ':' + kk + i + (old ? '可删' : '不可'));
          if (!nw || nw.en !== old || (!nw.en && !nw.why)) bad.push(k + ' ' + kk + i + ' old=' + old + ' new=' + J(nw));
        }
      }
      T('T13', !bad.length, 'T13b ⋯「删除音轨」可用性与旧左栏当前轨 ×（.vdel，canDel）逐轨一致（歌谱 / 吉他弹唱 / 钢琴弹唱伴奏 / 四部合唱 / 钢琴伴奏歌谱）；不可删的置灰写原因', bad.length ? bad.join('；') : seen.join(' '));
      await scn(pg, 'gtr');
      const g0 = await EV(pg, () => JSON.stringify(song));
      await rowAct(pg, 'tab', 1, '[data-fa="tree:more"]'); await pg.click('#popmenu [data-fa="tree:del"]'); await wait(pg, 150);
      const d1 = await EV(pg, () => ({ n: song.tabVoices.length, names: song.tabVoices.join(','), rows: document.querySelectorAll('#flw-tlist .flw-trow').length }));
      await EV(pg, () => undo()); await wait(pg, 100);
      const g1 = await EV(pg, () => JSON.stringify(song));
      await scn(pg, 'songbie'); const b0 = await EV(pg, () => { __toasts.length = 0; return JSON.stringify(song); });
      await rowAct(pg, 'vox', 0, '[data-fa="tree:more"]'); await pg.click('#popmenu [data-fa="tree:del"]', { force: true }); await wait(pg, 150);
      const b1 = await EV(pg, () => JSON.stringify(song)), bt = await toasts(pg);
      await EV(pg, () => __shut());
      T('T13', d1.n === 1 && d1.names === '指弹' && d1.rows === 2 && g1 === g0 && b1 === b0 && bt.some(t => /至少保留一条旋律轨/.test(t)),
        'T13c 删除：吉他弹唱删「扫弦」轨 → tabVoices 剩「指弹」、树少一行，一步撤销逐字节还原；歌谱唯一旋律轨的删除项置灰，点了只提示原因、不改谱', J({ d1, undo: g1 === g0, bt }));
    });
    await close(pg);
  });

  /* ================= T14 歌词段号 · Enter 填词 ================= */
  if (want('T14')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T14' });
    await SAFE('T14', 'T14', async () => {
      await scn(pg, 'songbie', { mi: 1 });
      const k0 = await EV(pg, () => ({ fc: localStorage.getItem('musetab-flyclosed'), n: song.lyricLines, chips: document.querySelectorAll('#flw-tr-vox-0 ~ .flw-tsubs .chip[data-k="ll"]').length,
        add: !!document.querySelector('#flw-tlist .chip[data-k="ll+"]') }));
      await pg.click('#flw-tlist .chip[data-k="ll+"]'); await wait(pg, 150);
      const a = await EV(pg, () => ({ n: song.lyricLines, chips: [...document.querySelectorAll('#flw-tlist .chip[data-k="ll"]')].map(c => c.textContent + (c.classList.contains('on') ? '*' : '')).join(',') }));
      await pg.click('#flw-tlist .chip[data-k="ll"][data-idx="1"]'); await wait(pg, 150);
      const b2 = await EV(pg, () => ({ al: activeLyr, at: activeTab, on: (document.querySelector('#flw-tlist .chip[data-k="ll"].on') || {}).textContent }));
      await pg.click('#flw-tlist .chip[data-k="ll"][data-idx="0"]'); await wait(pg, 150);
      const c = await EV(pg, () => ({ al: activeLyr }));
      await EV(pg, () => { undo(); setRibbon('vox'); render(); const a = document.activeElement; if (a && a.blur) a.blur(); }); await wait(pg, 150);
      const u = await EV(pg, () => song.lyricLines);
      await away(pg);
      await pg.keyboard.press('Enter'); await wait(pg, 200);
      const e = await EV(pg, () => { const i = document.getElementById('i-lyric'), r = i.getBoundingClientRect(), l = document.getElementById('flw-left').getBoundingClientRect();
        return { ae: document.activeElement && document.activeElement.id, vis: __vis(i), inside: r.left >= l.left - 0.5 && r.right <= l.right + 0.5 && r.top >= l.top - 0.5 && r.bottom <= l.bottom + 0.5,
          r: [Math.round(r.left), Math.round(r.top), Math.round(r.width)], at: activeTab, fc: localStorage.getItem('musetab-flyclosed'), fly: __vis('#left-flyout'),
          host: !!i.closest('.flw-tlyr'), fill: (document.querySelector('#flw-tlist .flw-tfill') || {}).textContent }; });
      await shot(pg, 'T14-lyric-enter-1280x800');
      T('T14', k0.n === 1 && k0.add && a.n === 2 && /^1\*?,2/.test(a.chips) && b2.al === 1 && b2.at === 'lyr' && b2.on === '2' && c.al === 0 && u === 1,
        'T14a 歌词段号复用 chip 契约（.chip[data-k="ll" | "ll+"]）：＋ 加一段（lyricLines 1→2，一步撤销）、点 ② → activeLyr=1 且切到歌词层、点 ① 回 0', J({ k0, a, b2, c, undo: u }));
      T('T14', e.ae === 'i-lyric' && e.vis && e.inside && e.host && e.at === 'lyr' && e.fc === k0.fc && !e.fly,
        'T14b 旋律行按 Enter：焦点落在 #i-lyric、它可见且整个在 #flw-left 内（当前旋律轨「歌词」子行下的填词区）；不经旧面板、不删经典偏好键 musetab-flyclosed', J(e));
    });
    await close(pg);
  });

  /* ================= T15 语境分组 ================= */
  if (want('T15')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T15' });
    await SAFE('T15', 'T15', async () => {
      const G = {};
      for (const [k, o, c] of [['songbie', {}, 'jp'], ['staff', {}, 'st'], ['gtr', {}, 'tab']]) { await scn(pg, k, o); await wait(pg, 120);
        G[c] = await EV(pg, () => ({ ctx: FLOW.ctx(), g: [...document.querySelectorAll('#flw-pgrid button.flw-pgh')].map(x => x.textContent.replace(/\d+$/, '').trim()) })); }
      const has = (c, n) => G[c].g.some(x => x.indexOf(n) >= 0);
      const ok = G.jp.ctx === 'jp' && G.st.ctx === 'st' && G.tab.ctx === 'tab'
        && !has('jp', '钢琴') && !has('jp', '谱号') && has('jp', '力度')
        && has('st', '钢琴') && has('st', '谱号') && has('st', '力度')
        && has('tab', '扫弦 · 拨弦') && has('tab', '吉他技巧') && !has('tab', '力度') && !has('tab', '钢琴');
      T('T15', ok, 'T15 语境分组：简谱轨没有「钢琴」「谱号」组；五线谱轨有「钢琴」「谱号 · 调号 · 拍号」；六线谱轨有「扫弦 · 拨弦」「吉他技巧」、没有「力度」（TAB 不支持力度，计划 §0-10）',
        Object.entries(G).map(([c, x]) => c + '=' + x.ctx + '：' + x.g.join('/')).join('；'));
    });
    await close(pg);
  });

  /* ================= T16 格子 ↔ 旧按钮 1:1 存在性（三种语境、全部组展开）================= */
  const ALLOPEN = () => { localStorage.setItem('musetab-pal', JSON.stringify({ line: false, art: false, dyn: false, orn: false, piano: false, tempo: false, keys: false, bar: false, jump: false, strum: false, gtech: false })); FLOW.pal.on(); };
  const CTXS = [['songbie', { mi: 1 }, 'jp'], ['staff', { mi: 1 }, 'st'], ['gtr', { mi: 1 }, 'tab']];
  if (want('T16')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T16' });
    await SAFE('T16', 'T16', async () => {
      const res = {};
      for (const [k, o, c] of CTXS) {
        await scn(pg, k, o); await EV(pg, ALLOPEN); await wait(pg, 120);
        res[c] = await EV(pg, () => {
          const ctx = FLOW.ctx(), ids = [...new Set([...document.querySelectorAll('#flw-pgrid [data-fa="pal:sign"]')].map(e => e.dataset.v))], bad = [], kinds = {};
          const one = s => { try { return document.querySelectorAll(s).length; } catch (_) { return -1; } };
          /* 收尾补（验收 S1 / TRK-7）：「更多力度」＝[data-orn="dyn"] 的 showDynMenu，「左手指」＝[data-hand="lh"] 的 showHandMenu('lh') */
          const TW = { slide: '[data-slidemenu]', harm: '[data-harmmenu]', bar: '[data-barmenu]', fing: '[data-fingmenu]', rh: '[data-hand="rh"]', tupn: '[data-tupcustom]', clef: '#b-clef', ott: '#b-ottava', dyn: '[data-orn="dyn"]', lh: '[data-hand="lh"]' };
          ids.forEach(id => {
            const t = FLOW.pal.target(id, ctx);
            if (!t) { bad.push(id + ' 无转发'); return; }
            if (!FLOW.pal.ok(id, ctx)) bad.push(id + ' ok()=false 却出格');
            if (t.sel) { kinds.sel = (kinds.sel || 0) + 1; if (t.n !== 1) bad.push(id + ' ' + t.sel + ' 命中 ' + t.n); return; }
            kinds[t.fn] = (kinds[t.fn] || 0) + 1;
            if (t.fn === 'dyn') { if (one('[data-orn="dyn"]') !== 1 || !DYN_LIST.some(d => d[0] === t.arg)) bad.push(id + ' 力度弹窗或 DYN_LIST 无 ' + t.arg); }
            else if (t.fn === 'orn') { if (one('[data-orn="' + t.arg + '"]') !== 1 || typeof ornFromBar !== 'function') bad.push(id + ' [data-orn=' + t.arg + '] 命中 ' + one('[data-orn="' + t.arg + '"]')); }
            else if (t.fn === 'tech') { const s = t.arg === 'lr' ? '[data-gtech="tech:lr"]' : '[data-tech2="' + t.arg + '"]'; if (one(s) !== 1 || typeof techFromBar !== 'function') bad.push(id + ' ' + s + ' 命中 ' + one(s)); }
            else if (/^menu:/.test(t.fn)) { const m = t.fn.slice(5); if (m === 'tempo') { if (typeof showHeadMenu !== 'function') bad.push(id + ' showHeadMenu 不在'); } else if (!TW[m] || one(TW[m]) < 1) bad.push(id + ' 旧弹窗钮 ' + TW[m] + ' 不在'); }
            else bad.push(id + ' 非白名单函数 ' + t.fn);
          });
          return { ctx, n: ids.length, kinds, bad };
        });
      }
      const bad = Object.values(res).flatMap(r => r.bad.map(x => r.ctx + ' ' + x));
      T('T16', !bad.length && res.jp.n >= 40 && res.st.n >= 45 && res.tab.n >= 35 && res.jp.ctx === 'jp' && res.st.ctx === 'st' && res.tab.ctx === 'tab',
        'T16 三种语境全部组展开后，每个可见格的转发目标恰好命中 1 个现有元素，或是白名单函数（dynApplyTo / ornFromBar / techFromBar / 旧弹窗）且它对应的旧按钮 / 弹窗在；没有死格',
        bad.length ? bad.join('；') : Object.values(res).map(r => r.ctx + ' ' + r.n + ' 格 ' + J(r.kinds)).join('；'));
      await shot(pg, 'T16-tab-allopen-1280x800');
    });
    await close(pg);
  });

  /* ================= T17 点格效果：代表格的字段 · 抽样 30 格与点旧按钮逐字节相同 ================= */
  const CELL = async (pg, id) => { const s = '#flw-pgrid .flw-pgb:not(.flw-rec) [data-fa="pal:sign"][data-v="' + id + '"]';
    await pg.locator(s).first().scrollIntoViewIfNeeded(); await pg.click(s); await wait(pg, 150); };
  const REC17 = () => { const pm = document.getElementById('popmenu'), md = document.querySelector('#modal-mask');
    const r = { j: JSON.stringify(song), sel: [sel.row, sel.vi, sel.mi, sel.ci, sel.si].join(':'), pop: pm ? pm.innerText.replace(/\s+/g, ' ').slice(0, 160) : null, modal: md ? md.innerText.replace(/\s+/g, ' ').slice(0, 160) : null };
    __shut(); return r; };
  /* 旧按钮一侧：按格子的转发表找到它对应的旧按钮（或弹窗里的那一项）去点 */
  const OLD17 = ([id, ctx]) => { const t = FLOW.pal.target(id, ctx);
    if (t.sel) { document.querySelector(t.sel).click(); return 'click ' + t.sel; }
    if (t.fn === 'dyn') { document.querySelector('[data-orn="dyn"]').click(); const b = [...document.querySelectorAll('#popmenu [data-dy]')].find(x => x.dataset.dy === t.arg); b.click(); return '力度弹窗 › ' + t.arg; }
    if (t.fn === 'orn') { document.querySelector('[data-orn="' + t.arg + '"]').click(); return '[data-orn=' + t.arg + ']'; }
    if (t.fn === 'tech') { const s = t.arg === 'lr' ? '[data-gtech="tech:lr"]' : '[data-tech2="' + t.arg + '"]'; document.querySelector(s).click(); return s; }
    if (t.fn === 'menu:tempo') { showHeadMenu('tempo', 300, 200); return 'showHeadMenu tempo'; }
    const TW = { slide: '[data-slidemenu]', harm: '[data-harmmenu]', bar: '[data-barmenu]', fing: '[data-fingmenu]', rh: '[data-hand="rh"]', tupn: '[data-tupcustom]', clef: '#b-clef', ott: '#b-ottava' };
    const b = document.querySelector(TW[t.fn.slice(5)]); b.click(); return TW[t.fn.slice(5)]; };
  const SAMPLE30 = { jp: ['tie', 'tuplet3', 'staccato', 'tenuto', 'breath', 'dyn-p', 'dyn-fp', 'hair-dim', 'tempo-accel', 'trill', 'mordent-down', 'grace-pre', 'volta2'],
    st: ['accent', 'marcato', 'fermata', 'ped', 'ped-up', 'dyn-ff', 'turn', 'bar-double'],
    tab: ['fermata', 'tie', 'strum-up', 'strum-mute', 'pick-down', 'arp-down', 'slap', 'pull', 'vibrato'] };
  if (want('T17')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T17' });
    await SAFE('T17', 'T17a', async () => {
      const REP = [['jp', 'fermata', '.measures.1.voxes.0.0.ferm', true], ['st', 'fermata', '.measures.1.voxes.0.0.ferm', true], ['tab', 'fermata', '.measures.1.tabs.0.0.ferm', true],
        ['jp', 'staccato', '.measures.1.voxes.0.0.artic', 'stacc'], ['jp', 'dyn-mf', '.measures.1.voxes.0.0.dyn', 'mf'], ['jp', 'hair-cresc', '.measures.1.voxes.0.0.dyn', '<'],
        ['jp', 'rep-start', '.measures.1.repeatStart', true], ['tab', 'strum-down', '.measures.1.tabs.0.0.strum', 'd'], ['tab', 'hammer', '.measures.1.tabs.0.0.notes.0.tech', 'h'], ['tab', 'dead-note', 'x', true]];
      const bad = [], ok = [];
      for (const [c, id, p, v] of REP) {
        const [k, o] = CTXS.find(x => x[2] === c);
        await scn(pg, k, o); await EV(pg, ALLOPEN); await wait(pg, 80);
        const j0 = await EV(pg, () => JSON.stringify(song));
        await CELL(pg, id);
        const d = await EV(pg, j0 => { const s1 = JSON.stringify(song), r = { d: __diff(j0, s1) };
          r.x = (song.measures[1].tabs && song.measures[1].tabs[0] && song.measures[1].tabs[0][0]) ? song.measures[1].tabs[0][0].notes.filter(n => n.x).length : 0; __shut(); return r; }, j0);
        const hit = p === 'x' ? d.x === 1 : d.d.some(x => x.indexOf(p + ':') === 0 && x.endsWith('→ ' + JSON.stringify(v)));
        (hit ? ok : bad).push(c + ' ' + id + ' ' + (p === 'x' ? '哑音 × 个数 ' + d.x : d.d.join(' ')));
      }
      T('T17', !bad.length, 'T17a 代表格写对字段：延长号（简谱 / 五线谱 col.ferm、六线谱经 #b-ferm-t 写 tab 列 ferm）· 跳音 col.artic=stacc · mf col.dyn · 渐强 col.dyn=\'<\' · 反复开始 measure.repeatStart · 下扫 col.strum=d · 击弦 note.tech=h · 哑音 × 当前弦位 note.x',
        bad.length ? bad.join('；') : ok.join('；'));
    });
    await SAFE('T17', 'T17b', async () => {
      const bad = [], ok = [];
      for (const c of ['jp', 'st', 'tab']) {
        const [k, o] = CTXS.find(x => x[2] === c);
        for (const id of SAMPLE30[c]) {
          await scn(pg, k, o); await EV(pg, ALLOPEN); await wait(pg, 60);
          await CELL(pg, id); const A = await EV(pg, REC17);
          await scn(pg, k, o); await wait(pg, 60);
          const how = await EV(pg, OLD17, [id, c]); await wait(pg, 120); const B = await EV(pg, REC17);
          const same = A.j === B.j && A.sel === B.sel && A.pop === B.pop && A.modal === B.modal;
          (same ? ok : bad).push(c + ':' + id + (same ? '' : ' ≠ ' + how + ' ' + J({ sel: [A.sel, B.sel], pop: [A.pop, B.pop], modal: [A.modal, B.modal], j: A.j === B.j })));
        }
      }
      T('T17', !bad.length && ok.length === 30, 'T17b 抽样 30 格（简谱 13 · 五线谱 8 · 六线谱 9；含 #id 直转、[data-*] 选择器、力度弹窗 dynApplyTo、装饰 ornFromBar、技巧 techFromBar、倚音输入框）：点格与点对应旧按钮（或旧弹窗里的那一项）后 song JSON、光标、弹出内容逐字节相同',
        bad.length ? bad.join('；') : ok.join(' '));
    });
    await close(pg);
  });

  /* ================= T18 搜索 · T19 最近使用 ================= */
  const FIRST = () => { const g = document.querySelector('#flw-pgrid .flw-pgb'); const c = g && g.querySelector('[data-fa="pal:sign"]'); return c ? c.dataset.v : null; };
  if (['T18', 'T19'].some(want)) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T18' });
    await SAFE('T18', 'T18', async () => {
      await scn(pg, 'songbie', { mi: 1 }); await away(pg);
      await pg.keyboard.press('/'); await wait(pg, 100);
      const f = await EV(pg, () => document.activeElement && document.activeElement.id);
      await pg.keyboard.type('yc'); await wait(pg, 150); const yc = await EV(pg, FIRST);
      await pg.fill('#flw-pq', 'mf'); await wait(pg, 150); const mf = await EV(pg, FIRST);
      await pg.fill('#flw-pq', 'jq'); await wait(pg, 150); const jq = await EV(pg, FIRST);
      await pg.fill('#flw-pq', 'tb'); await wait(pg, 150);
      const tb = await EV(pg, () => { const c = document.querySelector('#flw-pgrid [data-v="ped"]'); const h = c && c.closest('.flw-pgb').previousElementSibling;
        return c ? { na: c.classList.contains('flw-sg-na'), ad: c.getAttribute('aria-disabled'), why: c.dataset.why || '', head: h ? h.textContent : '' } : null; });
      const j0 = await EV(pg, () => { __toasts.length = 0; return JSON.stringify(song); });
      await pg.click('#flw-pgrid [data-v="ped"]', { force: true }); await wait(pg, 120);
      const j1 = await EV(pg, () => JSON.stringify(song)), tt = await toasts(pg);
      await pg.focus('#flw-pq'); await pg.keyboard.press('Escape'); await wait(pg, 120);
      const esc = await EV(pg, () => ({ v: document.getElementById('flw-pq').value, rec: !!document.querySelector('#flw-pgrid .flw-rec') }));
      await shot(pg, 'T18-search-1280x800');
      T('T18', f === 'flw-pq' && yc === 'fermata' && mf === 'dyn-mf' && jq === 'hair-cresc',
        'T18a 「/」聚焦记号搜索框；拼音首字母 yc → 第一个是「延长号」、mf → 「中强 mf」、jq → 「渐强」', J({ f, yc, mf, jq }));
      T('T18', !!tb && tb.na && tb.ad === 'true' && /仅五线谱/.test(tb.head) && j1 === j0 && tt.some(t => /仅五线谱/.test(t)) && esc.v === '' && esc.rec,
        'T18b 简谱语境搜「tb」：踏板（五线谱专属）在「仅五线谱」组里灰显（aria-disabled）、点了只提示不改谱；Esc 清空回到分组', J({ tb, same: j1 === j0, tt, esc }));
    });
    await SAFE('T19', 'T19', async () => {
      await scn(pg, 'songbie', { mi: 1 });
      const k0 = await EV(pg, () => __keys()), r0 = await EV(pg, () => [...document.querySelectorAll('#flw-pgrid .flw-rec [data-v]')].map(e => e.dataset.v));
      await CELL(pg, 'fermata'); await CELL(pg, 'fermata');
      const r1 = await EV(pg, () => ({ rec: [...document.querySelectorAll('#flw-pgrid .flw-rec [data-v]')].map(e => e.dataset.v), keys: __keys(),
        h: (JSON.parse(localStorage.getItem('musetab-habits') || '{}').n || {})['sg:fermata'], last: JSON.parse(localStorage.getItem('musetab-habits') || '{}').last }));
      const add = r1.keys.filter(k => !k0.includes(k));
      /* 收尾（验收 S5）：记号格只记次数 n、不改 last、不记相邻转移 t（不挤掉「猜你想做」）——原「last === sg:fermata」改为「last 不是 sg:*」 */
      T('T19', r0[0] !== 'fermata' && r1.rec[0] === 'fermata' && r1.rec.length === 6 && r1.h >= 2 && !/^sg:/.test(r1.last || '') && add.every(k => k === 'musetab-habits'),
        'T19 最近使用：连点「延长号」2 次后「最近」第 1 格是延长号（6 格）；计数记在既有键 musetab-habits（n[sg:fermata]，不改 last、不记转移），没有新键', J({ r0, rec: r1.rec, h: r1.h, last: r1.last, add }));
    });
    await close(pg);
  });

  /* ================= T20 两档密度 · 折叠本机键 ================= */
  if (want('T20')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T20' });
    const M20 = () => { const c = document.querySelector('#flw-pg-art [data-v="staccato"]'), l = c && c.querySelector('.flw-sgl'), r = c && c.getBoundingClientRect();
      return c ? { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, fs: parseFloat(getComputedStyle(l).fontSize), lab: __vis(l), ctx: c.querySelectorAll('.pqsg-c').length,
        cols: getComputedStyle(c.parentElement).gridTemplateColumns.split(' ').length, key: localStorage.getItem('musetab-signdensity'), pr: (document.getElementById('flw-pdens') || { getAttribute: () => null }).getAttribute('aria-pressed') } : null; };
    await SAFE('T20', 'T20', async () => {
      await scn(pg, 'songbie', { mi: 1 });
      const a = await EV(pg, M20);
      await pg.click('#flw-pdens'); await wait(pg, 150);
      const b2 = await EV(pg, M20);
      await shot(pg, 'T20-glyph-1280x800');
      await pg.reload(); await wait(pg, 1200); await prep(pg); await scn(pg, 'songbie', { mi: 1 });
      const c = await EV(pg, M20);
      const pf = await EV(pg, () => { showPrefs(); const t = document.getElementById('prf-t-signdensity'); const r = t ? t.textContent : null; closeModal(); return r; });
      await pg.click('#flw-pdens'); await wait(pg, 150);
      const d = await EV(pg, M20);
      T('T20', !!a && Math.abs(a.w - 52) <= 1 && Math.abs(a.h - 52) <= 1 && a.fs >= 11 && a.lab && a.cols === 4 && a.ctx > 0 && a.key === null,
        'T20a 带字（缺省）：格 52×52、标签 ≥11px、一行 4 格；跳音画在语境上（灰「5」，.pqsg-c）', J(a));
      T('T20', !!b2 && Math.abs(b2.w - 36) <= 1 && Math.abs(b2.h - 36) <= 1 && !b2.lab && b2.cols === 6 && b2.ctx === 0 && b2.key === 'glyph' && b2.pr === 'true'
        && !!c && Math.abs(c.w - 36) <= 1 && c.key === 'glyph' && pf === '记号格：只看字形' && !!d && Math.abs(d.w - 52) <= 1 && d.key === null,
        'T20b 只看字形：36×36、一行 6 格、不带字、跳音用 bare（不画语境「5」，免得读成「:」）；写 musetab-signdensity=\'glyph\'，刷新后保持；flow 下偏好设置列出「记号格：只看字形」；再点回带字即删键',
        J({ b: b2, reload: c && [c.w, c.key], pf, back: d && [d.w, d.key] }));
      /* 折叠：写 musetab-pal，刷新保持；坏 JSON 回默认、不报错 */
      const e0 = await EV(pg, () => ({ art: !document.getElementById('flw-pg-art').hidden, orn: !document.getElementById('flw-pg-orn').hidden }));
      await pg.click('#flw-pgrid button.flw-pgh[data-v="art"]'); await wait(pg, 150);
      const e1 = await EV(pg, () => ({ art: !document.getElementById('flw-pg-art').hidden, exp: document.querySelector('#flw-pgrid button.flw-pgh[data-v="art"]').getAttribute('aria-expanded'), key: localStorage.getItem('musetab-pal') }));
      await pg.reload(); await wait(pg, 1200); await prep(pg); await scn(pg, 'songbie', { mi: 1 });
      const e2 = await EV(pg, () => ({ art: !document.getElementById('flw-pg-art').hidden }));
      const n0 = errs.length;
      await EV(pg, () => localStorage.setItem('musetab-pal', '{坏 json'));
      await pg.reload(); await wait(pg, 1200); await prep(pg); await scn(pg, 'songbie', { mi: 1 });
      const e3 = await EV(pg, () => ({ art: !document.getElementById('flw-pg-art').hidden, orn: !document.getElementById('flw-pg-orn').hidden, n: document.querySelectorAll('#flw-pgrid [data-fa="pal:sign"]').length }));
      await EV(pg, () => localStorage.setItem('musetab-pal', '[1,2]')); await EV(pg, () => FLOW.pal.on());
      const e4 = await EV(pg, () => ({ art: !document.getElementById('flw-pg-art').hidden }));
      T('T20', e0.art && !e0.orn && !e1.art && e1.exp === 'false' && JSON.parse(e1.key).art === true && !e2.art && e3.art && !e3.orn && e3.n > 20 && e4.art && errs.length === n0,
        'T20c 折叠：低频组（装饰音等）默认折叠；点「奏法」组头折叠 → musetab-pal {art:true}、aria-expanded=false，刷新保持；musetab-pal 写成坏 JSON / 数组 → 回默认、不报错',
        J({ e0, e1, e2, e3, e4 }));
    });
    await close(pg);
  });

  /* ================= T21 字形 pqSign（光栅化量墨迹）================= */
  async function GLYPHS() {
    const vars = [];
    Object.keys(PQS_RULES).forEach(k => { const r = PQS_RULES[k];
      if (k.indexOf('--') > 0) { const p = k.split('--'); vars.push([p[0], p[1], k]); }
      else if (r.m) ['st', 'jp', 'tab', 'bare'].forEach(c => vars.push([k, c, k + '@' + c]));
      else vars.push([k, 'st', k]); });
    const ink = (svg) => new Promise(res => {
      const vb = +(/viewBox="0 0 ([\d.]+) /.exec(svg) || [0, 20])[1], S = 8, W = Math.round(3 * vb * S);
      let t = svg.replace(/currentColor/g, '#000').replace(/ viewBox="0 0 [\d.]+ [\d.]+"/, ' viewBox="' + (-vb) + ' ' + (-vb) + ' ' + (3 * vb) + ' ' + (3 * vb) + '"')
        .replace(/ width="[\d.]+" height="[\d.]+"/, ' width="' + W + '" height="' + W + '"');
      if (!/xmlns=/.test(t)) t = t.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, W, W).data;
        let x0 = W, y0 = W, x1 = -1, y1 = -1;
        for (let y = 0; y < W; y++) for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 32) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        res(x1 < 0 ? null : { vb, b: [x0 / S - vb, y0 / S - vb, (x1 + 1) / S - vb, (y1 + 1) / S - vb] }); };
      img.onerror = () => res('ERR'); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t); });
    const over = [], sides = [], empty = [], tol = 0.3;
    for (const [k, c, nm] of vars) for (const B of [20, 16]) {
      const r = await ink(pqSign(k, B, c));
      if (!r || r === 'ERR') { empty.push(nm + '@' + B); continue; }
      const [a, bb, cc, d] = r.b;
      if (a < -tol || bb < -tol || cc > r.vb + tol || d > r.vb + tol) over.push(nm + '@' + B + ' [' + r.b.map(v => v.toFixed(2)).join(',') + ']/' + r.vb);
      if (B === 20) sides.push([Math.max(cc - a, d - bb), nm]);
    }
    sides.sort((p, q) => p[0] - q[0]);
    const q = f => sides[Math.floor(f * (sides.length - 1))][0];
    const nb = sides.filter(x => !/@bare$/.test(x[1])), qb = f => nb[Math.floor(f * (nb.length - 1))][0];
    /* 格子里实际显示的变体（带字档：每个记号 × 它可用的语境；只看字形档的 bare 另算）——规范稿 1.38 量的是面板上显示的那一批 */
    const shown = new Map();
    Object.entries(FLOW.pal.SIGNS).forEach(([id, sg]) => ['jp', 'st', 'tab'].forEach((c, ci) => { if (sg[5 + ci]) { const svg = pqSign(sg[2], 20, c); if (!shown.has(svg)) shown.set(svg, id + '@' + c); } }));
    const disp = [];
    for (const [svg, nm] of shown) { const r = await ink(svg); if (r && r !== 'ERR') disp.push([Math.max(r.b[2] - r.b[0], r.b[3] - r.b[1]), nm, /<text/.test(svg)]); }
    const pure = disp.filter(x => !x[2]).sort((p, q) => p[0] - q[0]), qp = f => pure[Math.floor(f * (pure.length - 1))][0];
    disp.sort((p, q) => p[0] - q[0]);
    const qd = f => disp[Math.floor(f * (disp.length - 1))][0];
    const txt = Object.keys(PQT).filter(k => k !== 'tech-pm').map(k => { const d = new DOMParser().parseFromString(pqSign(k, 20), 'image/svg+xml'); return [...d.querySelectorAll('text')].map(t => k + ':' + t.getAttribute('font-family')); }).flat();
    const scoreFam = [...new Set([...document.querySelectorAll('#score text')].filter(t => t.getAttribute('font-style') === 'italic' || /italic/.test(t.getAttribute('style') || '')).map(t => t.getAttribute('font-family') || (t.style && t.style.fontFamily) || ''))];
    return { n: vars.length, over, empty, p10: q(0.1), p90: q(0.9), ratio: Math.round(q(0.9) / q(0.1) * 100) / 100, min: sides[0], max: sides[sides.length - 1],
      nb: nb.length, p10b: qb(0.1), p90b: qb(0.9), ratioB: Math.round(qb(0.9) / qb(0.1) * 100) / 100, low: sides.slice(0, 16).map(x => x[1] + '=' + x[0]).join(' '),
      np: pure.length, p10p: qp(0.1), p90p: qp(0.9), ratioP: Math.round(qp(0.9) / qp(0.1) * 100) / 100, lowP: pure.slice(0, 8).map(x => x[1] + '=' + x[0]).join(' '),
      nd: disp.length, p10d: qd(0.1), p90d: qd(0.9), ratioD: Math.round(qd(0.9) / qd(0.1) * 100) / 100, lowD: disp.slice(0, 12).map(x => x[1] + '=' + x[0]).join(' '), highD: disp.slice(-8).map(x => x[1] + '=' + x[0]).join(' '), txtBad: txt.filter(x => !/:Georgia,serif$/.test(x)), txtN: txt.length, scoreFam,
      cache: pqSign('sg-fermata', 20, 'jp') === pqSign('sg-fermata', 20, 'jp'), s16: /width="16"/.test(pqSign('sg-fermata', 16, 'st')) && /viewBox="0 0 16 16"/.test(pqSign('sg-fermata', 16, 'st')) };
  }
  if (want('T21')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T21' });
    await SAFE('T21', 'T21', async () => {
      await scn(pg, 'songbie');
      const r = await EV(pg, GLYPHS);
      T('T21', r.n === 149 && !r.over.length && !r.empty.length && r.s16,
        'T21a pqSign 149 个变体（92 键：附着记号 × 简谱 / 五线谱 / 六线谱 / bare，连音线另有简谱 / 六线谱专版）在 20 与 16 两档母版（16 用自己的 viewBox 0 0 16 16，不缩放 20 母版）墨迹都不出格（光栅量墨迹，容差 0.3）',
        r.over.length || r.empty.length ? J({ over: r.over.slice(0, 8), empty: r.empty.slice(0, 8), n: r.n }) : r.n + ' × 2 档');
      T('T21', r.ratioP <= 1.5, 'T21b 光学一致：面板上实际显示的 Bravura 字形（' + r.np + ' 个语境变体，不含活文字）墨迹最大边 p90 / p10 ≤ 1.5（规范稿方案 1 实测 1.38）',
        J({ p10: r.p10p, p90: r.p90p, ratio: r.ratioP, low: r.lowP }));
      NOTE('T21', '   ℹ️  参考（不判）：含活文字的显示变体 ' + r.nd + ' 个 p90/p10=' + r.ratioD + '（本机无 Georgia，回退 DejaVu Serif）；规则表全部 149 个变体 ' + r.ratio + '、去掉 bare 档 ' + r.nb + ' 个 ' + r.ratioB
        + '（bare 跳音只是一个点、sg-dur-1 / sg-jp-rest 等非面板键本来就小）；最小 ' + r.low.split(' ').slice(0, 4).join(' '));
      /* 收尾（验收 S2）：P.M. 跟谱面（不写 font-family、随界面字体 600 斜体）走 var(--font-ui)，不再算进 Georgia 这一族；它与谱面逐项相同由 T29b 量 */
      const txtWant = Object.keys(await EV(pg, () => PQT)).filter(k => !/^hair-/.test(k) && k !== 'tech-pm').length;
      T('T21', !r.txtBad.length && r.txtN === txtWant && r.scoreFam.includes('Georgia,serif') && r.cache,
        'T21c 文字类记号（力度 / rit. / accel. / D.C. / D.S. / Fine）是活文字 <text font-family="Georgia,serif">，与谱面斜体记号同一声明（P.M. 随谱面用界面字体，见 T29b）；同参调用走缓存', J({ bad: r.txtBad.slice(0, 5), n: r.txtN, score: r.scoreFam }));
    });
    await close(pg);
  });

  /* ================= T22 SMUFL 追加 · T23 谱面零回归 ================= */
  const ADD = (() => { try { return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../docs/design-2026-10f/icons/smufl-add.json'), 'utf8')); } catch (_) { return null; } })();
  /* 自足（基线页没有 INIT）：16 个预设逐个装进编辑器（单窗口、光标收起）取 #score，再 renderOffscreen(870) 取离屏输出 */
  function SCORE16() {
    window.guardReplace = p => p();
    const h = s => { s = String(s); let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16) + ':' + s.length; };
    try { hideStartPad(); } catch (_) {}
    const out = { ed: [], off: [], names: [] };
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('style', 'position:fixed;left:-5000px;top:0'); document.body.appendChild(sv);
    PRESETS.forEach((p, i) => {
      addDoc(migrate(p.make()), () => {}); closeDocAt(0);
      sel = { mi: 0, row: (song.tabVoices || []).length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; blurSel = true; noteSel = []; selRange = null; render();
      out.ed.push(h(document.getElementById('score').innerHTML)); out.names.push(p.name);
      sv.innerHTML = ''; const r = renderOffscreen({ song: migrate(p.make()), target: sv, paperW: 870 }); out.off.push(r ? h(sv.innerHTML) : 'null');
    });
    sv.remove();
    out.smufl = JSON.stringify(Object.keys(SMUFL).sort().map(k => [k, SMUFL[k]]));
    return out;
  }
  if (['T22', 'T23'].some(want)) jobs.push(async () => {
    const [pf, pc] = await Promise.all([open(1280, 800, { tag: 'T23f' }), open(1280, 800, { tag: 'T23c', url: CLASSICU })]);
    await SAFE('T22', 'T22', async () => {
      const cur = await EV(pf, () => ({ n: Object.keys(SMUFL).length, s: JSON.stringify(Object.keys(SMUFL).sort().map(k => [k, SMUFL[k]])) }));
      const S = new Map(JSON.parse(cur.s));
      const addBad = ADD ? Object.keys(ADD).filter(k => { const g = S.get(k), a = ADD[k]; return !g || g.d !== a.d || J(g.bb) !== J(a.bb); }) : ['缺 smufl-add.json'];
      T('T22', cur.n === 94 && ADD && Object.keys(ADD).length === 44 && !addBad.length,
        'T22a SMUFL 共 94 个（原 50：47 原生 + 3 合成；追加 44），追加的 44 个 d / bb 与 docs/design-2026-10f/icons/smufl-add.json 逐字相同', J({ n: cur.n, addBad: addBad.slice(0, 5) }));
      refNote('T22');
      if (refURL) {
        const R = await runDefault(refURL, () => JSON.stringify(Object.keys(SMUFL).sort().map(k => [k, SMUFL[k]])));
        const ref = new Map(JSON.parse(R.r));
        const diff = [...ref.keys()].filter(k => J(ref.get(k)) !== J(S.get(k)));
        const extra = [...S.keys()].filter(k => !ref.has(k));
        T('T22', ref.size === 50 && !diff.length && extra.length === 44 && extra.every(k => ADD && ADD[k]),
          'T22b 原 50 个字形（含 flag64th / rest64th 合成）与基线 ' + REF_COMMIT.slice(0, 7) + ' 逐字相同（d / bb / 其余属性），新增的恰好是那 44 个', J({ ref: ref.size, diff: diff.slice(0, 5), extra: extra.length }));
      }
    });
    await SAFE('T23', 'T23', async () => {
      const [F, C] = await Promise.all([EV(pf, SCORE16), EV(pc, SCORE16)]);
      const offBad = F.off.map((x, i) => x === C.off[i] ? null : F.names[i]).filter(Boolean);
      T('T23', F.off.length === 16 && !offBad.length && !F.off.includes('null'),
        'T23a 16 个预设 renderOffscreen(870) 在 ?shell=flow 与 ?shell=classic 下逐字节相同（谱面引擎不认外壳）', offBad.join('、') || '16 / 16');
      /* 去掉追加的 44 个字形再刻：逐字节相同＝谱面没有用到任何新字形 */
      const strip = await EV(pf, keys => { const bak = {}; keys.forEach(k => { bak[k] = SMUFL[k]; delete SMUFL[k]; });
        let r; try { r = SCORE16x(); } finally { Object.assign(SMUFL, bak); } return r;
        function SCORE16x() { const h = s => { s = String(s); let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16) + ':' + s.length; };
          const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('style', 'position:fixed;left:-5000px;top:0'); document.body.appendChild(sv);
          const o = PRESETS.map(p => { sv.innerHTML = ''; renderOffscreen({ song: migrate(p.make()), target: sv, paperW: 870 }); return h(sv.innerHTML); }); sv.remove(); return { n: Object.keys(SMUFL).length, o }; } }, ADD ? Object.keys(ADD) : []);
      const sBad = strip.o.map((x, i) => x === F.off[i] ? null : F.names[i]).filter(Boolean);
      T('T23', strip.n === 50 && !sBad.length, 'T23b 把追加的 44 个字形从 SMUFL 临时删掉重刻 16 个预设：与追加后逐字节相同（谱面渲染不调用新字形）', sBad.join('、') || '16 / 16（删后 SMUFL=' + strip.n + '）');
      refNote('T23');
      if (refURL) {
        const [A, B] = await Promise.all([runDefault(refURL, SCORE16), runDefault(URL0, SCORE16)]);
        const ed = A.r.ed.map((x, i) => x === B.r.ed[i] ? null : A.r.names[i]).filter(Boolean), off = A.r.off.map((x, i) => x === B.r.off[i] ? null : A.r.names[i]).filter(Boolean);
        T('T23', A.r.ed.length === 16 && !ed.length && !off.length && !A.pe.length && !B.pe.length,
          'T23c 与基线 ' + REF_COMMIT.slice(0, 7) + '（SMUFL 追加之前）对拍：16 个预设在默认外壳编辑器里的 #score 与 renderOffscreen 输出逐字节相同（简谱 / 六线谱 / 五线谱零回归）',
          (ed.length || off.length) ? J({ ed, off }) : '16 × 2');
      }
    });
    await Promise.all([close(pf), close(pc)]);
  });

  /* ================= T24 起步 · T25 谱类芯片 ================= */
  if (['T24', 'T25'].some(want)) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T24' });
    const ST = () => { const g = document.getElementById('flw-start'), f = lbInfo(song, LBAR.meta()), c = lbCur(f);
      const steps = g ? [...g.querySelectorAll('[data-fa="start:step"]')] : [];
      const go = g && g.querySelector('[data-fa="start:go"]');
      return { lb: !!document.getElementById('lb-wrap'), vis: __vis(g), hidden: g ? g.hidden : null, next: (n => n ? { hidden: n.hidden } : null)(document.getElementById('flw-next')),
        ui: steps.map(s => ['done', 'now', 'todo'].find(x => s.classList.contains(x)) + (s.getAttribute('aria-current') === 'step' ? '*' : '')).join(','),
        want: f && f.steps ? f.steps.map(x => x.st + (x.st === 'now' ? '*' : '')).join(',') : '', go: go ? { t: go.textContent.trim(), act: go.dataset.act } : null, nxt: c && c.nxt ? { t: c.nxt.btn, act: c.nxt.act } : null,
        meta: (LBAR.meta() || {}).hidden }; };
    await SAFE('T24', 'T24', async () => {
      await scn(pg, 'newpacc'); await wait(pg, 200);
      const a = await EV(pg, ST);
      await EV(pg, () => mutate(() => { for (let mi = 0; mi < 4; mi++) song.measures[mi].voxes[0].forEach((c, k) => { c.deg = 1 + ((mi * 4 + k) % 7); }); })); await wait(pg, 200);
      const b2 = await EV(pg, ST);
      await shot(pg, 'T24-start-1280x800');
      await pg.click('#flw-start [data-fa="start:go"]'); await wait(pg, 300);
      const m1 = await EV(pg, () => { const h = document.querySelector('#modal-mask h3'); const t = h ? h.textContent : null; closeModal(); return t; });
      await EV(pg, () => document.getElementById('b-arrange').click()); await wait(pg, 300);
      const m2 = await EV(pg, () => { const h = document.querySelector('#modal-mask h3'); const t = h ? h.textContent : null; closeModal(); return t; });
      const j0 = await EV(pg, () => { __toasts.length = 0; return JSON.stringify(song); });
      await pg.click('#flw-start [data-fa="start:hide"]'); await wait(pg, 200);
      const c = await EV(pg, ST), ct = await toasts(pg);
      await away(pg); await pg.keyboard.press('Alt+b'); await wait(pg, 250);
      const d = await EV(pg, ST);
      const fo = await EV(pg, () => { const a = document.activeElement; return { inStart: !!(a && a.closest && a.closest('#flw-start')), fa: a && a.dataset ? a.dataset.fa : null }; });
      const j1 = await EV(pg, () => JSON.stringify(song));
      T('T24', !a.lb && a.vis && a.ui === a.want && /now\*/.test(a.ui) && !b2.lb && b2.ui === b2.want && b2.ui === 'done,now*,todo' && !!b2.go && b2.go.act === 'arrange' && b2.go.t === b2.nxt.t,
        'T24a 新建钢琴伴奏歌谱：没有 #lb-wrap（谱型条拆入）；行 2「起步」组的步骤状态＝lbCur(lbInfo(song, LBAR.meta()))（当前步 aria-current=step）；写完旋律推进到「配和弦与伴奏」，主按钮「' + (b2.go && b2.go.t) + '」',
        J({ a: [a.ui, a.want], b: [b2.ui, b2.want, b2.go] }));
      T('T24', !!m1 && m1 === m2, 'T24b 起步主按钮打开的弹窗与 #b-arrange 相同（同一个 lbGo → #b-arrange.click）', J({ m1, m2 }));
      T('T24', c.hidden === true && c.next && c.next.hidden && c.meta === true && ct.some(t => /Alt\+B/.test(t)) && d.vis && d.meta === false && fo.inStart && fo.fa === 'start:go' && j1 === j0 && !d.lb,
        'T24c ×：起步组与右栏「下一步」卡一起收起（LB_META.hidden，提示写 Alt+B）；Alt+B → 重新出现、焦点落在起步组主按钮；收起 / 调出不改谱、全程不建 #lb-wrap', J({ c: [c.hidden, c.next, c.meta], ct, d: [d.vis, d.meta], fo, same: j1 === j0 }));
    });
    await SAFE('T25', 'T25', async () => {
      await scn(pg, 'songbie'); await away(pg);
      await pg.click('#flw-kchip'); await wait(pg, 200);
      const a = await EV(pg, () => { const m = document.getElementById('lb-menu'), c = document.getElementById('flw-kchip'); if (!m) return { m: false };
        const mr = m.getBoundingClientRect(), cr = c.getBoundingClientRect(); return { m: true, gap: Math.round(mr.top - cr.bottom), dx: Math.round(mr.left - cr.left), exp: c.getAttribute('aria-expanded'), vis: __vis(m) }; });
      await pg.click('#flw-kchip'); await wait(pg, 250);
      const b2 = await EV(pg, () => ({ m: !!document.getElementById('lb-menu'), exp: document.getElementById('flw-kchip').getAttribute('aria-expanded') }));
      await pg.click('#flw-kchip'); await wait(pg, 200); await pg.mouse.click(700, 500); await wait(pg, 200);
      const c = await EV(pg, () => ({ m: !!document.getElementById('lb-menu') }));
      T('T25', a.m && a.vis && a.gap >= 0 && a.gap <= 12 && Math.abs(a.dx) <= 12 && a.exp === 'true' && !b2.m && b2.exp === 'false' && !c.m,
        'T25 谱类芯片 ▾：打开 #lb-menu（换谱类，lbMenuOpen 同一菜单），定位在芯片正下方（间距 0–12、左缘对齐 ±12）；再点芯片即关（lbMenuOut 认 .flw-kchip，不先关后开）；点谱面也关', J({ a, b: b2, c }));
    });
    await close(pg);
  });

  /* ================= T26 谱纸 ================= */
  if (want('T26')) for (const [w, h] of [[1280, 800], [1440, 900]]) jobs.push(async () => {
    const pg = await open(w, h, { tag: 'T26 ' + w });
    await SAFE('T26', 'T26 ' + w, async () => {
      const M26 = () => { const s = document.getElementById('score').getBoundingClientRect(), l = document.getElementById('flw-left').getBoundingClientRect();
        const rd = document.getElementById('right-dock'), rs = document.getElementById('flw-rstrip'); let R = innerWidth;
        if (__vis(rd)) R = Math.min(R, rd.getBoundingClientRect().left); if (__vis(rs)) R = Math.min(R, rs.getBoundingClientRect().left);
        return { w: Math.round(s.width * 10) / 10, clear: s.left >= l.right - 1 && s.right <= R + 1, tight: document.body.classList.contains('paper-tight'), fac: FLY_AUTO_CLOSED, lw: Math.round(l.width) }; };
      await scn(pg, 'songbie'); await wait(pg, 300); const a = await EV(pg, M26);
      await EV(pg, () => { try { openFlyout('lyr'); } catch (_) {} render(); }); await wait(pg, 250); const a2 = await EV(pg, M26);
      await scn(pg, 'newpacc'); await wait(pg, 300); const c = await EV(pg, M26);
      if (w === 1440) await shot(pg, 'T26-newpacc-1440x900');
      T('T26', Math.abs(a.w - 870) <= 2 && a2.w === a.w && c.w >= 868 && [a, a2, c].every(x => x.clear && !x.tight && x.fac === false && x.lw === 248),
        'T26 ' + w + '×' + h + '：预设谱 #score 870±2（旧面板 openFlyout 前后同宽）、新建谱（fixwide）≥868；左栏 248 常驻、paperClear；无 paper-tight、FLY_AUTO_CLOSED 不消耗', J({ a, a2, c }));
    });
    await close(pg);
  });

  /* ================= T27 数据零改动（只做界面操作）================= */
  if (want('T27')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T27' });
    await SAFE('T27', 'T27', async () => {
      const bad = [], seen = [];
      for (const k of ['songbie', 'gtr', 'pacc']) {
        await scn(pg, k); await wait(pg, 150);
        const s0 = await EV(pg, () => ({ j: JSON.stringify(song), keys: __keys(), mx: song.mixer === undefined }));
        const rows = await EV(pg, () => [...document.querySelectorAll('#flw-tlist .flw-trow')].map(r => [r.dataset.k, +r.dataset.i]));
        for (const [kk, i] of rows) { await pg.hover(rowSel(kk, i), { position: { x: 20, y: 18 } }); await wait(pg, 30); }
        for (const a of ['tree:expall', 'tree:colall', 'tree:curexp']) { await pg.click('#flw-thd [data-fa="tree:hdr"]'); await wait(pg, 100); await pg.click('#popmenu [data-fa="' + a + '"]'); await wait(pg, 120); }
        await rowAct(pg, rows[0][0], rows[0][1], '[data-fa="tree:more"]'); await pg.keyboard.press('Escape');
        await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 80); await pg.keyboard.press('Escape');
        await pg.click('#flw-kchip'); await wait(pg, 120); await pg.click('#flw-kchip'); await wait(pg, 120);
        await pg.focus('#flw-pq'); await pg.keyboard.type('yc'); await wait(pg, 100); await pg.fill('#flw-pq', 'zzz'); await wait(pg, 80); await pg.keyboard.press('Escape'); await wait(pg, 80);
        await pg.click('#flw-pdens'); await wait(pg, 80); await pg.click('#flw-pdens'); await wait(pg, 80);
        const g = await EV(pg, () => (document.querySelector('#flw-pgrid button.flw-pgh') || {}).dataset.v);
        await pg.click('#flw-pgrid button.flw-pgh[data-v="' + g + '"]'); await wait(pg, 80); await pg.click('#flw-pgrid button.flw-pgh[data-v="' + g + '"]'); await wait(pg, 80);
        const cells = await EV(pg, () => [...document.querySelectorAll('#flw-pgrid .flw-sg')].slice(0, 8).map(e => e.dataset.v));
        for (const v of cells) { await pg.hover('#flw-pgrid .flw-sg[data-v="' + v + '"]'); await wait(pg, 20); }
        const tip = await EV(pg, () => (document.getElementById('flw-pinfo') || {}).textContent);
        await pg.focus(rowSel(rows[0][0], rows[0][1])); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowRight'); await away(pg);
        const s1 = await EV(pg, () => ({ j: JSON.stringify(song), keys: __keys(), mx: song.mixer === undefined }));
        const add = s1.keys.filter(x => !s0.keys.includes(x)), gone = s0.keys.filter(x => !s1.keys.includes(x));
        seen.push(k + ' ' + rows.length + ' 行 · 提示「' + String(tip || '').slice(0, 14) + '」' + (add.length ? ' 新键 ' + add.join(',') : ''));
        if (s1.j !== s0.j) bad.push(k + ' song 变了 ' + J(await EV(pg, ([a, c]) => __diff(a, c).slice(0, 4), [s0.j, s1.j])));
        if (!add.every(x => NEWKEYS.includes(x)) || gone.length) bad.push(k + ' 键差 +' + add.join(',') + ' −' + gone.join(','));
        if (s0.mx && !s1.mx) bad.push(k + ' 生出了 song.mixer');
      }
      T('T27', !bad.length, 'T27 只做界面操作（逐行悬停 · 展开全部 / 收起全部 / 只展开当前轨 · 开关轨 ⋯ / ＋ / 谱类菜单 · 搜索与 Esc · 切密度两次 · 折叠再展开 · 悬停记号格出提示 · 树上 ← →）：song 逐字节不变、不生 song.mixer；musetab-* 键差集 ⊆ {musetab-flow, musetab-rdock, musetab-pal, musetab-signdensity}',
        bad.length ? bad.join('；') : seen.join('；'));
    });
    await close(pg);
  });

  /* ================= T28 音轨树收尾（v68.0 验收 TRK-1…TRK-14 的回归；修前红、修后绿）================= */
  if (want('T28')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T28' });
    const more = async (k, i) => { await rowAct(pg, k, i, '[data-fa="tree:more"]'); await wait(pg, 120); };
    const one = (pg, name, row, vi) => EV(pg, ([n, r, v]) => { __one(__P(n)); sel = { mi: 0, row: r, vi: v, ci: 0, si: 1 }; clampSel(); blurSel = false; setRibbon(sel.row); render();
      try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} }, [name, row, vi]);
    await SAFE('T28', 'T28a', async () => {
      await scn(pg, 'gtr', { mi: 1 }); await more('tab', 0);
      const it = await EV(pg, () => { const b = document.querySelector('#popmenu [data-old="b-notation"]'); return b ? { role: b.getAttribute('role'), ck: b.getAttribute('aria-checked') } : null; });
      const n0 = await EV(pg, () => ({ e: effNota(), u: undoStack.length }));
      if (it) { await pg.click('#popmenu [data-old="b-notation"]'); await wait(pg, 150); } else await EV(pg, () => __shut());
      const n1 = await EV(pg, () => ({ e: effNota(), t: song.tabNota === undefined ? 'undef' : song.tabNota, u: undoStack.length }));
      T('T28', !!it && it.role === 'menuitemcheckbox' && it.ck === String(n0.e === 'x') && n1.t === (n0.e === 'x' ? 'num' : 'x') && n1.e === n1.t && n1.u === n0.u + 1,
        'T28a 吉他轨 ⋯「记谱风格：和弦内音记 ×（教材式）」＝旧左栏 #b-notation（验收 TRK-1：flow 下原本没有入口）：勾选态＝effNota()，点了 song.tabNota 翻转、一步可撤销', J({ it, n0, n1 }));
    });
    await SAFE('T28', 'T28b', async () => {
      await one(pg, '纯和弦谱', 'vox', 0); await wait(pg, 150); await away(pg);
      const r0 = await EV(pg, () => ({ row: !!document.querySelector('#flw-tlist .flw-trow.on + .flw-tsubs .flw-tlyrrow'), ll: song.lyricLines | 0 }));
      await pg.keyboard.press('Enter'); await wait(pg, 150);
      const r1 = await EV(pg, () => { const li = document.getElementById('i-lyric'), lf = document.getElementById('flw-left').getBoundingClientRect(), r = li.getBoundingClientRect();
        return { ae: document.activeElement && document.activeElement.id, vis: __vis(li), inLeft: r.left >= lf.left - 1 && r.right <= lf.right + 1, act: activeTab }; });
      const s0 = await EV(pg, () => JSON.stringify(song.measures));
      await pg.keyboard.type('词'); await wait(pg, 60); await pg.keyboard.press('Enter'); await wait(pg, 150);
      const s1 = await EV(pg, () => ({ j: JSON.stringify(song.measures), ly: JSON.stringify(song.measures).includes('"词"') }));
      T('T28', r0.row && r0.ll >= 1 && r1.ae === 'i-lyric' && r1.vis && r1.inLeft && s1.j !== s0 && s1.ly,
        'T28b 纯和弦谱（谱面刻歌词）：当前轨照样出「歌词」子行；Enter 聚焦左栏里看得见的 #i-lyric、逐字填词写进谱（验收 TRK-2：此前没有子行、填词框在隐藏落点里，Enter 是死键）', J({ r0, r1, ly: s1.ly }));
      await EV(pg, () => { try { document.activeElement.blur(); } catch (_) {} });
    });
    await SAFE('T28', 'T28c', async () => {
      const out = [];
      for (const [nm, a, v] of [['送别', 'eye', 'st'], ['教学对照', 'only', 'jp'], ['教学对照', 'eye', 'st']]) {
        await one(pg, nm, 'vox', 0); await wait(pg, 120);
        const s0 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length }));
        await pg.click('#flw-tlist [data-fa="tree:' + a + '"][data-k="vox"][data-i="0"][data-v="' + v + '"]'); await wait(pg, 150);
        const s1 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length }));
        await EV(pg, () => undo()); await wait(pg, 100);
        const s2 = await EV(pg, () => JSON.stringify(song));
        out.push({ c: nm + ' ' + a + ':' + v, changed: s1.j !== s0.j, push: s1.u - s0.u, back: s2 === s0.j });
      }
      T('T28', out.every(o => o.changed && o.push === 1 && o.back), 'T28c 旋律轨记谱法层的组合操作（简谱→五线谱眼睛叠亮 · 对照谱点名「简谱」· 对照谱关五线谱眼睛）都只压 1 张撤销快照，一次撤销回到操作前（验收 TRK-3：此前各压 2 张，Ctrl+Z 一次落到没见过的中间态）', J(out));
    });
    await SAFE('T28', 'T28d', async () => {
      await one(pg, '两只老虎', 'tab', 0); await EV(pg, () => { window.__ask = 0; window.__askO = askText; askText = () => { __ask++; }; }); await wait(pg, 150);
      const Y = id => EV(pg, id => Math.round(document.getElementById(id).getBoundingClientRect().top), id);
      const y0 = await Y('flw-tr-vox-0');
      await pg.dblclick('#flw-tr-vox-0 .flw-tn'); await wait(pg, 250);
      const y1 = await Y('flw-tr-vox-0'), ask = await EV(pg, () => __ask), held = await EV(pg, () => document.getElementById('flw-tr-tab-0').getAttribute('aria-expanded'));
      await away(pg); await wait(pg, 250);
      const after = await EV(pg, () => ({ prev: document.getElementById('flw-tr-tab-0').getAttribute('aria-expanded'), cur: (document.querySelector('#flw-tlist .flw-trow.on') || {}).id }));
      await EV(pg, () => { askText = __askO; });
      await scn(pg, 'newpacc'); await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await wait(pg, 150);
      const y2 = await Y('flw-tr-vox-2'); await pg.click('#flw-tr-vox-2 .flw-tn'); await wait(pg, 200); const y3 = await Y('flw-tr-vox-2');
      await away(pg);
      T('T28', y1 === y0 && ask === 1 && held === 'true' && after.prev === 'false' && after.cur === 'flw-tr-vox-0' && y3 === y2,
        'T28d 鼠标点当前行下方的行：所点的行原地不动（上一个当前行先不收，指针离开音轨列表再收），双击下方轨名也开改名框；钢琴伴奏歌谱单击「左手伴奏」不跳（验收 TRK-4：此前上跳 56–112px，双击第二下落到子行上）',
        J({ y: [y0, y1], ask, held, after, pacc: [y2, y3] }));
    });
    await SAFE('T28', 'T28e', async () => {
      await scn(pg, 'songbie'); await EV(pg, () => { song.mixer = { 'vox:0': { on: true, solo: false, inst: 'ah', vol: 0, pan: null } }; });
      await more('vox', 0);
      const a = await EV(pg, () => { const r = document.querySelector('#popmenu [data-mx="vol"]'), o = document.querySelector('#popmenu [data-mxo="vol"]'); return r ? { min: r.min, v: r.value, o: o.textContent } : null; });
      await pg.focus('#popmenu [data-mx="vol"]'); await pg.keyboard.press('Home'); await wait(pg, 100);
      const b2 = await EV(pg, () => ({ vol: song.mixer['vox:0'].vol, o: (document.querySelector('#popmenu [data-mxo="vol"]') || {}).textContent }));
      await pg.focus('#popmenu [data-mx="inst"]'); await pg.keyboard.press('ArrowDown'); await wait(pg, 120);
      const c = await EV(pg, () => (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.mx) || (document.activeElement || {}).id || null);
      await pg.keyboard.press('Escape'); await EV(pg, () => __shut()); await away(pg);
      T('T28', !!a && a.min === '1' && a.v === '100' && a.o === '100%' && b2.vol === 0.01 && b2.o === '1%' && c === 'inst',
        'T28e ⋯ 音量：存了 0 的轨读数 100%（与播放引擎 cfg.vol||1、经典混音台同口径），滑杆最小 1%（Home → vol 0.01，验收 TRK-5）；音色下拉按 ↓ 焦点留在下拉上、不被菜单截走（TRK-13）', J({ a, b2, c }));
    });
    await SAFE('T28', 'T28f', async () => {
      await scn(pg, 'gtr');
      await EV(pg, () => { song.mixer = { 'tab:0': { on: false, solo: false, inst: 'steel', vol: 1, pan: null }, 'tab:1': { on: true, solo: false, inst: 'nylon', vol: 0.5, pan: null } }; song.tabCapos = [null, 3]; render(); __toasts.length = 0; });
      const j0 = await EV(pg, () => JSON.stringify(song));
      await more('tab', 0); await pg.click('#popmenu [data-fa="tree:del"]'); await wait(pg, 200);
      const a = await EV(pg, () => ({ mx: JSON.stringify(song.mixer), cap: JSON.stringify(song.tabCapos), n: song.tabVoices.length, muted: document.getElementById('flw-tr-tab-0').classList.contains('muted') }));
      const tt = await toasts(pg);
      await EV(pg, () => undo()); await wait(pg, 100); const j1 = await EV(pg, () => JSON.stringify(song));
      const mx = JSON.parse(a.mx);
      T('T28', a.n === 1 && !mx['tab:1'] && mx['tab:0'] && mx['tab:0'].inst === 'nylon' && mx['tab:0'].vol === 0.5 && mx['tab:0'].on === true && !a.muted && a.cap === '[null]'
        && tt.some(t => /原来夹 3 品/.test(t)) && j1 === j0,
        'T28f 删第 1 条吉他轨：song.mixer 的 tab:* 随行删、其后前移（剩下的「扫弦」保住自己的 nylon / 50% / 不静音），tabCapos 随行删；参考轨夹位不同时提示；一步撤销逐字节还原（验收 TRK-6，flow 先行，默认外壳待拍板）', J({ a, tt: tt.slice(-1) }));
    });
    await SAFE('T28', 'T28g', async () => {
      await scn(pg, 'piano');
      const a = await EV(pg, () => ({ ll: song.lyricLines | 0, add: !!document.querySelector('#flw-tlist .flw-trow.on + .flw-tsubs [data-k="ll+"]') }));
      if (a.add) { await pg.click('#flw-tlist .flw-trow.on + .flw-tsubs [data-k="ll+"]'); await wait(pg, 150); }
      const b2 = await EV(pg, () => ({ ll: song.lyricLines | 0 }));
      T('T28', a.add && b2.ll === a.ll + 1, 'T28g 钢琴独奏（只有大谱表两行、没有词）：当前轨给「歌词 ＋」＝旧左栏「＋添加歌词行」入口，点了 lyricLines+1（验收 TRK-8：此前只有 Enter 能碰出来）', J({ a, b2 }));
    });
    await SAFE('T28', 'T28h', async () => {
      await scn(pg, 'gtr', { row: 'vox', vi: 0 });
      await pg.focus('#flw-tr-vox-0'); await pg.keyboard.press('ArrowLeft'); await wait(pg, 120);
      const a = await EV(pg, () => document.getElementById('flw-tr-vox-0').getAttribute('aria-expanded'));
      await EV(pg, () => { addDoc(__P('四部合唱'), () => {}); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); render(); }); await wait(pg, 150);
      const b2 = await EV(pg, () => ({ e: document.getElementById('flw-tr-vox-0').getAttribute('aria-expanded'), n: docs.length, t: song.title }));
      await EV(pg, () => { while (docs.length > 1) closeDocAt(0); });
      T('T28', a === 'false' && b2.e === 'true' && b2.n === 2, 'T28h 展开 / 收起覆盖只属于这份谱：A 谱当前轨按 ← 收起，切到 B 谱当前轨照常展开（验收 TRK-9：此前按 vox:0 键跨窗口串用）', J({ a, b2 }));
    });
    await SAFE('T28', 'T28i', async () => {
      const out = [];
      await scn(pg, 'piano', { row: 'vox', vi: 1 });
      let s0 = await EV(pg, () => ({ n: JSON.stringify(song.voxNotations), sc: __h(__score()) }));
      for (const v of ['jp', 'st']) { await pg.click('#flw-tlist [data-fa="tree:only"][data-i="1"][data-v="' + v + '"]'); await wait(pg, 150); }
      let s1 = await EV(pg, () => ({ n: JSON.stringify(song.voxNotations), sc: __h(__score()) }));
      out.push({ c: '钢琴独奏左手 点名简谱→点名五线', ok: s1.n === s0.n && s1.sc === s0.sc, n: [s0.n, s1.n] });
      await scn(pg, 'pacc', { row: 'vox', vi: 2 });
      s0 = await EV(pg, () => ({ n: (song.voxNotations || [])[2], sc: __h(__score()) }));
      for (const v of ['jp', 'st', 'st', 'jp']) { await pg.click('#flw-tlist [data-fa="tree:eye"][data-i="2"][data-v="' + v + '"]'); await wait(pg, 150); }
      s1 = await EV(pg, () => ({ n: (song.voxNotations || [])[2], sc: __h(__score()) }));
      out.push({ c: '钢琴伴奏左手 开简谱→关五线→开五线→关简谱', ok: s1.n === 'bass' && s1.sc === s0.sc, n: [s0.n, s1.n] });
      T('T28', out.every(o => o.ok), 'T28i 记谱法往返还原谱号：低音谱号轨关掉五线谱再打开仍是低音谱号，#score 逐字节还原（验收 TRK-10：此前一律开成高音谱号）', J(out));
    });
    await SAFE('T28', 'T28j', async () => {
      await scn(pg, 't12'); await wait(pg, 150);
      await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 120); await pg.click('#popmenu [data-fa="tree:addvox"]'); await wait(pg, 300); await away(pg); await wait(pg, 150);
      const g = await EV(pg, () => { const L = document.getElementById('flw-tlist'), lb = L.getBoundingClientRect(), c = L.querySelector('.flw-trow.on'), s = c && c.nextElementSibling;
        const has = !!(s && s.classList.contains('flw-tsubs')), r = c.getBoundingClientRect(), sr = has ? s.getBoundingClientRect() : r;
        return { cur: c.id, top: Math.round(r.top - lb.top), subsBot: Math.round(lb.bottom - sr.bottom), has }; });
      T('T28', g.has && g.top >= 0 && g.subsBot >= 0, 'T28j 12 轨再加一条旋律轨：当前行连同它展开的子行（五线谱 / 歌词 / 由此生成…）整体滚进音轨区（验收 TRK-11：此前子行被裁在区外、「还有 N 条」又不数子行）', J(g));
    });
    await SAFE('T28', 'T28k', async () => {
      await scn(pg, 'gtr'); await more('tab', 0); await pg.click('#popmenu [data-fa="tree:board"]'); await wait(pg, 300);
      const g = await EV(pg, () => { const p = document.getElementById('board-pane'), b = p.getBoundingClientRect(), l = document.getElementById('flw-left').getBoundingClientRect();
        return { on: p.classList.contains('on'), l: Math.round(b.left), r: Math.round(b.right), lr: Math.round(l.right), vw: innerWidth }; });
      await EV(pg, () => { try { closeBoard(); } catch (_) {} }); await away(pg);
      T('T28', g.on && g.l >= g.lr + 4 && g.r <= g.vw - 40, 'T28k 从音轨 ⋯ 打开的指板 / 键盘浮层在左栏与右栏竖条之间居中，不压左栏记号格（验收 TRK-12：此前 1280 宽左缘 150 压住记号格右侧 98px）', J(g));
    });
    await SAFE('T28', 'T28l', async () => {
      await one(pg, '指弹练习曲', 'tab', 0); await wait(pg, 120);
      await pg.click('#flw-thd [data-fa="tree:add"]'); await wait(pg, 120);
      const m = await EV(pg, () => { const m = document.getElementById('popmenu'); return { gen: !!(m && m.querySelector('[data-fa="tree:gen"]')), vox: song.voxVoices.length, txt: m ? m.textContent.replace(/\s+/g, ' ').slice(0, 120) : '' }; });
      await pg.keyboard.press('Escape');
      T('T28', m.vox === 0 && !m.gen, 'T28l 指弹独奏（没有旋律轨）的加轨菜单不出「由「旋律」生成六线谱轨…」——与经典「＋ 音轨」弹窗不出 #ta-map 同口径（验收 TRK-14）', J(m));
    });
    await close(pg);
  });

  /* ================= T29 记号面板收尾（v68.0 验收 S1–S10、TRK-7 的回归）================= */
  if (want('T29')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T29' });
    const rec = () => EV(pg, () => [...document.querySelectorAll('#flw-pgrid .flw-rec [data-v]')].map(e => e.dataset.v));
    await SAFE('T29', 'T29a', async () => {
      await scn(pg, 'songbie', { mi: 1 }); await EV(pg, ALLOPEN); await wait(pg, 100);
      const dm = await EV(pg, () => !!document.querySelector('#flw-pg-dyn [data-v="dyn-more"]'));
      let pm = null, A = null, B = null;
      if (dm) { await CELL(pg, 'dyn-more'); pm = await EV(pg, () => { const m = document.getElementById('popmenu'); return m ? [...m.querySelectorAll('[data-dy]')].map(b => b.dataset.dy) : null; });
        if (pm) { await pg.click('#popmenu [data-dy="ppp"]'); await wait(pg, 150); } A = await EV(pg, () => JSON.stringify(song)); }
      await scn(pg, 'songbie', { mi: 1 }); await EV(pg, () => document.querySelector('[data-orn="dyn"]').click()); await wait(pg, 100);
      await pg.click('#popmenu [data-dy="ppp"]'); await wait(pg, 150); B = await EV(pg, () => JSON.stringify(song));
      const dl = await EV(pg, () => DYN_LIST.map(d => d[0]));
      await scn(pg, 'gtr', { mi: 1 }); await EV(pg, () => { const n = ((song.measures[1].tabs[0][0] || {}).notes || [])[0]; if (n) { sel.si = n.s; render(); } }); await EV(pg, ALLOPEN); await wait(pg, 100);
      const lh = await EV(pg, () => !!document.querySelector('#flw-pg-gtech [data-v="finger-lh"]'));
      let C = null, D = null;
      if (lh) { await CELL(pg, 'finger-lh'); await pg.click('#popmenu [data-pki="1"]'); await wait(pg, 150); C = await EV(pg, () => JSON.stringify(song)); }
      await scn(pg, 'gtr', { mi: 1 }); await EV(pg, () => { const n = ((song.measures[1].tabs[0][0] || {}).notes || [])[0]; if (n) { sel.si = n.s; render(); } }); await EV(pg, () => document.querySelector('[data-hand="lh"]').click()); await wait(pg, 100);
      await pg.click('#popmenu [data-pki="1"]'); await wait(pg, 150); D = await EV(pg, () => JSON.stringify(song));
      const q = await EV(pg, () => ({ ppp: FLOW.pal.search('ppp')[0], atempo: FLOW.pal.search('a tempo')[0], dolce: FLOW.pal.search('dolce')[0], lh: FLOW.pal.search('左手')[0] }));
      T('T29', dm && !!pm && pm.length === dl.length + 1 && dl.every(d => pm.includes(d)) && A === B && /"lhF":"1"/.test(D) && lh && C === D && q.ppp === 'dyn-more' && q.atempo === 'dyn-more' && q.dolce === 'dyn-more' && q.lh === 'finger-lh',
        'T29a 旧左栏的力度弹窗与左手指法在 flow 下都有入口（验收 S1 / TRK-7）：「力度」组末「更多力度」＝[data-orn="dyn"] 同一个 showDynMenu（DYN_LIST ' + dl.length + ' 项一项不少，选 ppp 与旧弹窗 song 逐字节相同）；「吉他技巧」组「左手指」＝[data-hand="lh"]（选第 1 指 song 逐字节相同）；搜 ppp / a tempo / dolce / 左手 都能找到',
        J({ dm, pm: pm && pm.length, dl: dl.length, same: A === B, lh, lhSame: C === D, q }));
    });
    await SAFE('T29', 'T29b', async () => {
      const bad = [], ok = [];
      for (const [k, ids] of [['songbie', ['dyn-mf', 'dc', 'volta1']], ['gtr', ['palm-mute', 'hammer', 'pull']]]) for (const id of ids) {
        await scn(pg, k, { mi: 1 }); await EV(pg, ALLOPEN); await wait(pg, 100);
        const cell = await EV(pg, id => { const c = document.querySelector('#flw-pgrid .flw-pgb:not(.flw-rec) [data-v="' + id + '"]'); const m = {};
          if (c) [...c.querySelectorAll('svg text:not(.pqsg-c)')].forEach(t => { const cs = getComputedStyle(t); m[t.textContent] = cs.fontFamily + '|' + cs.fontStyle + '|' + cs.fontWeight; }); return m; }, id);
        const before = await EV(pg, () => [...document.querySelectorAll('#score text')].map(t => t.textContent + '|' + t.getAttribute('x') + '|' + t.getAttribute('y')));
        await CELL(pg, id); await EV(pg, () => __shut()); await wait(pg, 100);
        const score = await EV(pg, b => { const B = new Set(b); const m = {}; [...document.querySelectorAll('#score text')].filter(t => !B.has(t.textContent + '|' + t.getAttribute('x') + '|' + t.getAttribute('y')))
          .forEach(t => { const cs = getComputedStyle(t); m[t.textContent] = cs.fontFamily + '|' + cs.fontStyle + '|' + cs.fontWeight; }); return m; }, before);
        const pairs = Object.keys(cell).filter(t => score[t] && /[^\d]/.test(t));
        if (!pairs.length) bad.push(id + ' 没对上谱面字面 ' + J({ cell: Object.keys(cell), score: Object.keys(score) }));
        pairs.forEach(t => (cell[t] === score[t] ? ok : bad).push(id + '「' + t + '」' + (cell[t] === score[t] ? '' : ' 格 ' + cell[t].split('|').slice(1).join(' ') + ' ≠ 谱面 ' + score[t].split('|').slice(1).join(' ') + (cell[t].split('|')[0] === score[t].split('|')[0] ? '' : '（字体族不同）'))));
      }
      T('T29', !bad.length && ok.length >= 6, 'T29b 文字类记号的格内字面与谱面同一声明（computed font-family / style / weight 逐项相同）：mf · D.C. · 房子号「1.」· P.M. · 击弦 h · 勾弦 p（验收 S2：此前 P.M. / h / p 格里是 Georgia 斜粗、谱面随界面字体 600，房子号格里 Georgia 400、谱面 700）',
        bad.length ? bad.join('；') : ok.join(' '));
    });
    await SAFE('T29', 'T29c', async () => {
      await scn(pg, 'songbie', { mi: 1 });
      const want1 = { fermata: 'fermata', fe: 'fermata', staccato: 'staccato', crescendo: 'hair-cresc', '3连音': 'tuplet3', 'N连音': 'tupletN', '第一段': 'volta1', '终点': 'fine', 'ＭＦ': 'dyn-mf', '同前1小节': 'sim1', '转调标记': 'keysig', '指法数字': 'fingering' };
      const r = await EV(pg, w => { const o = {}; Object.keys(w).forEach(q => { o[q] = FLOW.pal.search(q)[0] || null; });
        o.__dyn = FLOW.pal.search('力度').length; o.__strum = FLOW.pal.search('扫弦').join(','); return o; }, want1);
      const bad = Object.keys(want1).filter(q => r[q] !== want1[q]).map(q => q + '→' + r[q]);
      await pg.focus('#flw-pq'); await pg.keyboard.type('fermata'); await wait(pg, 150);
      const ui = await EV(pg, () => { const g = document.querySelector('#flw-pgrid .flw-pgb'); const c = g && g.querySelector('[data-fa="pal:sign"]'); return c ? c.dataset.v : null; });
      await pg.keyboard.press('Escape');
      T('T29', !bad.length && r.__dyn >= 11 && /strum-down/.test(r.__strum) && /strum-up/.test(r.__strum) && ui === 'fermata',
        'T29c 记号搜索（验收 S3）：英文全称（fermata / staccato / crescendo）、旧按钮名（3连音 · 第一段 · 终点 · 同前1小节 · 转调标记 · 指法数字）、全角 ＭＦ 都排第 1；别名双向前缀（打全 fermata 不再落空）；搜组名「力度」返回整组、「扫弦」含下扫与上扫',
        bad.length ? bad.join('；') : J({ dyn: r.__dyn, strum: r.__strum, ui }));
    });
    await SAFE('T29', 'T29d', async () => {
      await scn(pg, 'gtr', { mi: 1 }); await EV(pg, () => { localStorage.removeItem('musetab-habits'); HABITS = null; FLOW.pal.on(); }); await EV(pg, ALLOPEN); await wait(pg, 100);
      const r0 = await rec();
      await CELL(pg, 'finger-rh'); const pop = await EV(pg, () => !!document.getElementById('popmenu')); await pg.keyboard.press('Escape'); await wait(pg, 120);
      const e = await EV(pg, () => ({ n: (habitsLoad().n || {})['sg:finger-rh'] || 0 })); const r1 = await rec();
      await CELL(pg, 'finger-rh'); await pg.click('#popmenu [data-pki="1"]'); await wait(pg, 200);
      const f = await EV(pg, () => ({ n: (habitsLoad().n || {})['sg:finger-rh'] || 0 })); const r2 = await rec();
      T('T29', pop && e.n === 0 && J(r1) === J(r0) && f.n === 1 && r2[0] === 'finger-rh',
        'T29d 弹窗类格子（右手指法）打开后 Esc 取消不算用过、「最近使用」不变；真正选了一项才记一次并立刻排到「最近」第 1 格（验收 S4）', J({ pop, e, r0, r1, f, r2: r2.slice(0, 3) }));
    });
    await SAFE('T29', 'T29e', async () => {
      await scn(pg, 'songbie', { mi: 1 }); await EV(pg, ALLOPEN); await wait(pg, 80);
      await EV(pg, () => { localStorage.setItem('musetab-habits', JSON.stringify({ n: { 'dur:8': 9, tie: 3 }, t: { 'dur:8>tie': 3 }, last: 'dur:8' })); HABITS = null; });
      for (let i = 0; i < 4; i++) { await EV(pg, () => habit('dur:8')); await CELL(pg, 'fermata'); }
      const r = await EV(pg, () => { habit('dur:8'); const g = habitNext(); const h = habitsLoad(); return { act: g && g.act, sgT: Object.keys(h.t).filter(k => /sg:/.test(k)), n: h.n['sg:fermata'] || 0, last: h.last }; });
      const r1 = await rec();
      T('T29', r.act === 'tie' && !r.sgT.length && r.n === 4 && r1.includes('fermata'),
        'T29e 记号格的使用计数只记次数、不记相邻转移：「八分 → 延长号」点 4 次后「猜你想做」仍是可用的连音线（验收 S5：此前 sg:fermata 转移挤掉了它、habitApplicable 又不认 sg: 而整条消失）；延长号照样进「最近使用」', J({ r, r1 }));
    });
    await SAFE('T29', 'T29f', async () => {
      await scn(pg, 'songbie', { mi: 1 }); await away(pg); await wait(pg, 100);
      /* 只量整枚露在格子区可视范围里的（区内滚走的格子 elementFromPoint 本来就落到别处） */
      const VIS = () => { const g = document.getElementById('flw-pgrid'); g.scrollTop = 0; const gr = g.getBoundingClientRect();
        g.querySelectorAll('.flw-sg, button.flw-pgh').forEach(e => { const r = e.getBoundingClientRect(); if (r.top < gr.top || r.bottom > gr.bottom) e.classList.add('tv-out'); else e.classList.remove('tv-out'); }); };
      /* 量控件自身外框的四角（往里 1px）——格子 52 / 36 比 28 方块大，T11 的「中心 28 方块」量不到圆角（验收 S6 用的就是外框四角） */
      const EDGE = sels => { const bad = [], seen = { n: 0 };
        sels.forEach(s => document.querySelectorAll(s).forEach(el => { if (!__vis(el)) return; seen.n++; const r = el.getBoundingClientRect();
          const miss = [[r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1]].filter(([x, y]) => { const t = document.elementFromPoint(x, y); return !(t && (t === el || el.contains(t))); });
          if (miss.length) { const t = document.elementFromPoint(miss[0][0], miss[0][1]); bad.push(s.split(' ').pop() + (el.dataset.v ? '[' + el.dataset.v + ']' : '') + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' 漏角 ' + miss.length + '（落到 ' + (t ? (t.id || String(t.className && t.className.baseVal != null ? t.className.baseVal : t.className) || t.tagName) : '无') + '）'); } }));
        return { n: seen.n, bad }; };
      await EV(pg, VIS);
      const a = await EV(pg, EDGE, ['#flw-pgrid .flw-sg:not(.tv-out)', '#flw-pgrid button.flw-pgh:not(.tv-out)', '#flw-pclr']);
      await pg.click('#flw-pdens'); await away(pg); await wait(pg, 120); await EV(pg, VIS);
      const b2 = await EV(pg, EDGE, ['#flw-pgrid .flw-sg:not(.tv-out)']);
      await pg.click('#flw-pdens'); await away(pg);
      T('T29', !a.bad.length && !b2.bad.length && a.n >= 20 && b2.n >= 20, 'T29f 记号格（52 / 36 两档）、组头、「清除」：外框四角（往里 1px）elementFromPoint 都命中自身（验收 S6：此前 6–8px 圆角让四角漏到格子区底）',
        [...a.bad, ...b2.bad].slice(0, 4).join('；') || (a.n + ' + ' + b2.n + ' 个'));
    });
    await SAFE('T29', 'T29g', async () => {
      await scn(pg, 'songbie', { mi: 1 });
      await EV(pg, () => { localStorage.removeItem('musetab-signdensity'); localStorage.removeItem('musetab-pal'); FLOW.pal.on();
        const S = Storage.prototype; window.__stO = [S.setItem, S.removeItem]; const blk = k => /^musetab-(pal|signdensity)$/.test(k);
        S.setItem = function (k, v) { if (blk(k)) throw new Error('blocked'); return __stO[0].call(this, k, v); };
        S.removeItem = function (k) { if (blk(k)) throw new Error('blocked'); return __stO[1].call(this, k); }; });
      await pg.click('#flw-pdens'); await wait(pg, 120);
      const d = await EV(pg, () => document.getElementById('flw-pal').classList.contains('flw-dense'));
      await pg.click('#flw-pgrid button.flw-pgh[data-v="art"]'); await wait(pg, 120);
      const f = await EV(pg, () => document.querySelector('#flw-pgrid button.flw-pgh[data-v="art"]').getAttribute('aria-expanded'));
      await pg.click('#flw-pdens'); await wait(pg, 120);
      const d2 = await EV(pg, () => document.getElementById('flw-pal').classList.contains('flw-dense'));
      await EV(pg, () => { const S = Storage.prototype; S.setItem = __stO[0]; S.removeItem = __stO[1]; });
      T('T29', d === true && f === 'false' && d2 === false, 'T29g 本机存储写不进（隐私模式 / 站点数据被拦）时，密度钮与组折叠照样在本次会话里生效（记在内存；验收 S8：此前点了没有任何反应）', J({ d, f, d2 }));
    });
    await SAFE('T29', 'T29h', async () => {
      const out = [];
      for (const [k, q, id, re] of [['songbie', '琶音', 'arp-up', /先在左栏音轨选中吉他轨/], ['gtr', 'mf', 'dyn-mf', /先在左栏音轨选中旋律轨/], ['songbie', 'tb', 'ped', /切到五线谱/]]) {
        await scn(pg, k, { mi: 1 }); await pg.fill('#flw-pq', q); await wait(pg, 150);
        const j0 = await EV(pg, () => { __toasts.length = 0; return JSON.stringify(song); });
        await pg.click('#flw-pgrid [data-v="' + id + '"]', { force: true }); await wait(pg, 120);
        const r = await EV(pg, j0 => ({ t: __toasts.slice(-1)[0] || '', same: JSON.stringify(song) === j0 }), j0);
        out.push({ c: k + ' ' + q, ok: re.test(r.t) && r.same, t: r.t });
        await pg.focus('#flw-pq'); await pg.keyboard.press('Escape');
      }
      T('T29', out.every(o => o.ok), 'T29h 灰格（别的记谱法才有）的提示按方向写：仅六线谱→「先选中吉他轨」、仅简谱 / 五线谱（在六线谱上）→「先选中旋律轨」、仅五线谱→「切到五线谱」；不改谱（验收 S9）', J(out));
    });
    await SAFE('T29', 'T29i', async () => {
      await scn(pg, 'songbie', { mi: 1 }); await wait(pg, 100);
      const a = await EV(pg, () => { const g = document.getElementById('flw-pgrid'); const all = [...g.querySelectorAll('.flw-sg, button.flw-pgh')];
        return { live: document.getElementById('flw-pinfo').getAttribute('aria-live'), tab0: all.filter(x => x.tabIndex === 0).length, n: all.length,
          acc: (g.querySelector('[data-v="accent"]') || { getAttribute: () => null }).getAttribute('aria-label'), cr: (g.querySelector('[data-v="hair-cresc"]') || { getAttribute: () => null }).getAttribute('aria-label'),
          clr: document.getElementById('flw-pclr').getAttribute('aria-label') }; });
      /* 键盘：Tab 进格子区只停一站，方向键在格子之间走 */
      await pg.focus('#flw-pq'); await pg.keyboard.press('Tab'); await wait(pg, 60);
      const t1 = await EV(pg, () => { const x = document.activeElement; return x && x.closest('#flw-pgrid') ? (x.dataset.v || x.className) : (x.id || x.className); });
      await pg.keyboard.press('ArrowRight'); await wait(pg, 60);
      const t2 = await EV(pg, () => (document.activeElement.dataset || {}).v || null);
      await pg.keyboard.press('Tab'); await wait(pg, 60);
      const t3 = await EV(pg, () => { const x = document.activeElement; return { inGrid: !!(x && x.closest('#flw-pgrid')), id: x && (x.id || x.className) }; });
      await EV(pg, () => { try { document.activeElement.blur(); } catch (_) {} });
      T('T29', a.live === null && a.tab0 === 1 && a.n > 10 && a.acc === '重音' && a.cr === '渐强（发夹线）' && a.clr === '清除当前音的装饰记号' && !!t1 && !!t2 && t2 !== t1 && !t3.inGrid,
        'T29i 读屏与键盘（验收 S10）：提示行不再是 aria-live（悬停不连续播报）；格子区只占 1 个 Tab 站（roving tabindex，方向键在格子间走，再按 Tab 离开格子区）；读屏名不读符号（「重音」「渐强（发夹线）」）；「清除」读作「清除当前音的装饰记号」', J({ a, t1, t2, t3 }));
    });
    await SAFE('T29', 'T29j', async () => {
      const r = await EV(pg, async () => {
        const raster = (svg, W) => new Promise(res => { let t = svg.replace(/currentColor/g, '#000').replace(/ width="[\d.]+" height="[\d.]+"/, ' width="' + W + '" height="' + W + '"'); if (!/xmlns=/.test(t)) t = t.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); x.drawImage(img, 0, 0); res(x.getImageData(0, 0, W, W).data); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t); });
        const K = 16, runs = (d, W, horiz, at) => { const r = []; let cur = 0; for (let i = 0; i < W; i++) { const p = horiz ? d[(at * W + i) * 4 + 3] : d[(i * W + at) * 4 + 3]; if (p > 127) cur++; else if (cur) { r.push(cur / K); cur = 0; } } if (cur) r.push(cur / K); return r; };
        const out = {};
        /* 小节线类：逐行横扫，只取恰好 2 段墨的行（细线 + 细 / 粗线，避开 50% 墨的谱线与反复点）里的最细一段；连线：竖扫中线 */
        for (const k of ['sg-bar-double', 'sg-bar-final', 'sg-rep-start', 'sg-rep-end']) {
          const W = 20 * K, d = await raster(pqSign(k, 20), W); let m = Infinity;
          for (let y = Math.round(W * 0.2); y < Math.round(W * 0.8); y += 2) { const r = runs(d, W, true, y); if (r.length === 2) m = Math.min(m, ...r); }
          out[k] = m; }
        { const W = 20 * K, d = await raster(pqSign('sg-tie', 20), W); out['sg-tie'] = Math.min(...runs(d, W, false, Math.round(W * 0.5))); }
        return out; });
      T('T29', Object.keys(r).length === 5 && Object.values(r).every(v => Number.isFinite(v) && v >= 0.95), 'T29j Bravura 细线在 20 母版不发灰：段落线 / 终止线 / 反复记号的细线、连音线中段都 ≥1px（16 倍光栅量线宽；验收 S7：此前 0.5–0.56px、连音线中段 0.78px）', J(r));
    });
    await close(pg);
  });

  /* ================= T30 外壳收尾（v68.0 验收 SH-1…SH-6、TRK-15 的回归）================= */
  if (want('T30')) jobs.push(async () => {
    const pg = await open(1280, 800, { tag: 'T30' });
    await SAFE('T30', 'T30a', async () => {
      const boot = await EV(pg, () => ({ sp: startPadOn(), trk: getComputedStyle(document.getElementById('flw-trk')).visibility, pal: getComputedStyle(document.getElementById('flw-pal')).visibility, w: Math.round(document.getElementById('flw-left').getBoundingClientRect().width) }));
      T('T30', boot.sp && boot.trk === 'hidden' && boot.pal === 'hidden' && boot.w === 248, 'T30a 启动台态：左栏只留 248 宽空栏，不画台下占位谱（用户没打开的谱）的音轨树与记号格（验收 SH-5）', J(boot));
    });
    const R2 = () => { const eb = document.getElementById('editbar'), er = eb.getBoundingClientRect();
      const vis = e => { const r = e.getBoundingClientRect(); if (!(r.width > 0)) return false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
      const clip = [...eb.querySelectorAll('button')].filter(vis).filter(b => b.getBoundingClientRect().right > er.right + 0.5).map(b => b.id || b.dataset.fa);
      const m = document.getElementById('flw-more'), mr = m.getBoundingClientRect(), hit = document.elementFromPoint(mr.left + mr.width / 2, mr.top + mr.height / 2);
      return { sw: eb.scrollWidth, cw: eb.clientWidth, clip, more: vis(m) && mr.right <= er.right + 0.5 && !!hit && m.contains(hit), off: [...eb.querySelectorAll('.flw-off')].map(e => e.id || ('dur' + e.dataset.dur)) }; };
    await SAFE('T30', 'T30b', async () => {
      const out = [];
      for (const w of [900, 1024, 1100]) {
        await pg.setViewportSize({ width: w, height: 800 }); await wait(pg, 350);
        await scn(pg, 'newpacc'); await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await wait(pg, 350);
        const a = await EV(pg, R2);
        await EV(pg, () => { const m = song.measures; for (let i = 0; i < 4; i++) m[i].voxes[0].forEach((c, j) => { c.deg = 1 + ((i * 4 + j) % 7); }); render(); }); await wait(pg, 350);
        const b2 = await EV(pg, R2);
        out.push({ w, s1: a, s2: b2 });
      }
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 300);
      const bad = out.filter(o => [o.s1, o.s2].some(s => s.clip.length || !s.more));
      T('T30', !bad.length, 'T30b 821–1179 宽出现起步组（钢琴伴奏歌谱 ① 写旋律 / ② 一键配伴奏）：行 2 没有按钮被裁到屏外，「更多 ▾」始终整枚在屏、点得中（编辑组只留图标 → 起步组只留编号与主按钮图标 → 连音线 / 增时线 / 附点收进「更多 ▾」；验收 SH-1）',
        J(out.map(o => o.w + ' ①' + o.s1.sw + '/' + o.s1.cw + (o.s1.clip.length ? ' 裁 ' + o.s1.clip : '') + (o.s1.more ? '' : ' 更多不可点') + ' ②' + o.s2.sw + '/' + o.s2.cw + (o.s2.clip.length ? ' 裁 ' + o.s2.clip : '') + (o.s2.more ? '' : ' 更多不可点'))));
    });
    await SAFE('T30', 'T30c', async () => {
      const offAt = async w => { await pg.setViewportSize({ width: w, height: 900 }); await wait(pg, 350); await scn(pg, 'newpacc');
        await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; const m = song.measures; for (let i = 0; i < 4; i++) m[i].voxes[0].forEach((c, j) => { c.deg = 1 + ((i * 4 + j) % 7); }); render(); }); await wait(pg, 400);
        return EV(pg, () => [...document.querySelectorAll('#editbar .flw-off')].map(e => e.id || ('dur' + e.dataset.dur))); };
      const a = await offAt(1536), b2 = await offAt(1600);
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 300);
      const extra = b2.filter(x => x !== 'flw-scope' && !a.includes(x));
      T('T30', !extra.length, 'T30c 窗口变宽常显的键不变少：1600 宽（组名开始显示）出现起步组时先收组名，收起的键不多于 1536 宽（「作用于」芯片 <1600 本就不显示；验收 SH-6）', J({ w1536: a, w1600: b2 }));
    });
    await SAFE('T30', 'T30d', async () => {
      await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 300);
      await scn(pg, 'newpacc'); await wait(pg, 300);
      /* v68.1（计划 §4.11「模式条 → 撤销 → 起步」，验收 SH-4）：行首多了模式条（role=tablist，roving tabindex 只有当前段可 Tab 到），撤销段在 DOM 上也搬到行首——
         Tab 顺序＝模式条（当前段）→ 撤销 → 起步，与视觉顺序一致（此前断言「起步是第一站」，撤销在 DOM 末尾） */
      const t = await EV(pg, () => { const all = [...document.querySelectorAll('#editbar button')].filter(b => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && b.tabIndex >= 0);
        return { idx: all.findIndex(b => b.closest('#flw-start')), n: all.length, first: all.slice(0, 3).map(b => b.id || b.dataset.fa) }; });
      T('T30', t.idx === 2 && t.first[0] === 'flw-mode-write' && t.first[1] === 'b-undo', 'T30d 行 2 的 DOM / Tab 顺序与视觉一致：模式条（当前段「书写」）→ 撤销 → 起步（验收 SH-4：此前撤销在 DOM 末尾、要走过 27 个工具键）', J(t));
    });
    await SAFE('T30', 'T30e', async () => {
      await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 300);
      await scn(pg, 'songbie'); await EV(pg, () => { setRTab('info'); }); await wait(pg, 150);
      const a = await EV(pg, () => { const b = document.getElementById('ri-lbar'), d = new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html'), sb = d.getElementById('ri-lbar');
        return { t: b.textContent.trim(), tip: b.title, snap: !!sb && /谱型条 · 换谱类…/.test(sb.textContent) && /在谱面上方显示谱型条/.test(sb.title), snapNew: !!sb && /起步/.test(sb.textContent + sb.title) }; });
      /* v68.1：flow 下旧右栏卡片 .rcard 只隐藏（右栏改为属性 / 文字 / 智能页，计划 §4.4），这枚按钮不再可见——按 §1.4 委托原则走程序化 click()，委托路径（LBAR.show 的 flow 分支）不变 */
      await EV(pg, () => document.getElementById('ri-lbar').click()); await wait(pg, 200);
      const b2 = await EV(pg, () => ({ menu: !!document.getElementById('lb-menu') }));
      await EV(pg, () => __shut());
      await pg.setViewportSize({ width: 800, height: 900 }); await wait(pg, 500);
      const c = await EV(pg, () => ({ flow: flowOn(), t: document.getElementById('ri-lbar').textContent.trim() }));
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 500);
      T('T30', /起步 · 换谱类/.test(a.t) && !/谱型条/.test(a.tip) && a.snap && !a.snapNew && b2.menu && !c.flow && /谱型条 · 换谱类/.test(c.t),
        'T30e 右栏「信息」页那枚按钮在 flow 下叫「起步 · 换谱类…」，点了直接打开换谱类菜单（验收 SH-2 / TRK-15：此前叫「谱型条」、点了屏上没有任何变化）；页面快照与退出 flow 后原样还原', J({ a, b2, c }));
    });
    await SAFE('T30', 'T30f', async () => {
      await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 300);
      await scn(pg, 'songbie'); await wait(pg, 150); await away(pg);
      const a = await EV(pg, () => ({ rs: document.body.classList.contains('flw-rs'), txt: FLOW.start.retext('；下一步见谱面上方的谱型条') }));
      await pg.keyboard.press('Alt+b'); await wait(pg, 250);
      /* v68.1 轨 B：「下一步」卡移进右栏「智能」页（#flw-rp-smart 顶部），不再挂 data-rt、也不再让旧页签 rTab 停在「创作」——断言改为右栏当前页＝智能、卡在该页里 */
      const b2 = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro'), tab: FLOW.rd.page(), inPage: !!document.querySelector('#flw-rp-smart > #flw-next'), nx: __vis('#flw-next'), txt: (document.getElementById('flw-next') || {}).textContent || '' }));
      await pg.keyboard.press('Escape'); await wait(pg, 150);
      T('T30', a.rs && /竖条「智能」/.test(a.txt) && b2.ro && b2.tab === 'smart' && b2.inPage && b2.nx && b2.txt.length > 4,
        'T30f <1440（右栏竖条）：落地提示按实际位置说「右栏竖条「智能」里的「下一步」卡」（v68.1 右栏页：属性 · 文字 · 智能，旧「创作」并入「智能」）；没有起步组的谱类按 Alt+B 把「智能」浮出、「下一步」卡露出来（验收 SH-3：此前 Alt+B 屏上无变化）', J({ a, b2: { ro: b2.ro, tab: b2.tab, nx: b2.nx, txt: b2.txt.slice(0, 30) } }));
    });
    await close(pg);
  });

  await pool(jobs, +(process.env.PAR || 3));
  T('T27', errs.length === 0, '无页面脚本错误', errs.slice(0, 4).join(' | '));
  const IDS = Array.from({ length: 31 }, (_, i) => 'T' + i);
  for (const k of IDS) (OUT[k] || []).forEach(l => console.log(l));
  await b.close();
  console.log((pass === total ? 'PASS ' : 'FAIL ') + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
