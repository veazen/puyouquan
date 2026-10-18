'use strict';
/* v68.3 谱面上方的悬浮条 #flw-sbar（FLOW.sbar；负责人 2026-10-18「以后保留这个吸顶的悬浮条，默认展开，可以收起，使用常用功能」+「界面要少字」）。
   规格 docs/spec-2026-10-sbar.md §7 断言表（收尾 ENG-7：此前只在 scratchpad 里）；几何断言优先、真实点击，file:// 直载。被测页＝默认外壳（flow），SB15 另开 ?shell=classic。
   对基线 b938819（v68.2）跑必须全红：每条都以「#flw-sbar 存在且可见」或 FLOW.sbar 接口为前提（SB15 的旧外壳不变量除外，它在基线上本来就成立——另列）。
   SB1  几何：1180 / 1280 / 1440 / 1920 × 浅 / 深 × {新建钢琴伴奏歌谱、示例《送别》、新建吉他弹唱（从简谱写起）}——条高 40、外框 46；左右缘＝#score ∩ #paper；
        scrollTop 0 条顶 92、#paper 顶 138；吸住（scrollTop 400）条顶＝谱面区顶 84、条底 124；按钮都在条框里、中心命中自己；不溢出、页面无横向滚动；新建钢琴伴奏歌谱条宽 1064 / 972 / 908 / 1088
   SB2  收纳：≥1180 十四种谱类（起步 / 工具阶段）都是全档；821×760 不超过 n2、先收提示；viewZoom 0.5 条宽 560、以谱纸中线居中、不超过 n3；
        fit({w:360}) 到 n5——「更多」变菜单、列出收起的工具、点其中一项与条上点同效；各档条高都是 40
   SB3  每谱类内容：谱名 / 图标＝NWB.kindOfSong＝左栏谱类芯片；记谱法组出不出与按下项＝规格 §2.2；阶段＝§2.3；工具 id 与顺序＝§2.5 表按判据过滤；空谱提示＝SB_TIP、title＝LB_TIP；
        界面上不出现内部代码——NWB.build 14 种 + 新建面板 10 个用途 + 示例谱 + 导入 MIDI 8 轨 + createSong 打开的谱
   SB4  起步推进（真实点击）：钢琴伴奏歌谱 ① → 1235 → ②「一键配伴奏」→ 填进当前谱 → 工具阶段「织体」强调 → 伴奏织体 → 强调消失；续写旋律 → ② 回来「补配 N 小节」；
        吉他弹唱「从简谱写起」① → ②「生成六线谱」→ 低把位 → 工具阶段、仍 1 条吉他轨；钢琴弹唱谱 ① → 标和弦 → 工具阶段「织体」强调、title「生成伴奏」；阶段切换前后 #paper 的 y 不变
   SB5  委托同效：12 个工具 + 谱类 ▾ + 主按钮 +「更多」逐个真实点击，与委托目标在同一份谱上比弹窗 / 菜单签名、song、sel；deg / diag 一步撤销；填词焦点 #i-lyric（窄档先展开音轨面板）；
        谱类 ▾ 菜单在钮下方、与芯片打开的同一份、再点即关；「更多」1440 切到「智能」页、1280 浮出「智能」
   SB6  记谱法：简谱 → 五线 → 对照（谱名 简谱歌谱 → 五线谱歌谱 → 教学对照谱，每次一步撤销，Ctrl+Z 逐字节回原）；简谱 → 五线 → 简谱逐字节；与音轨树同语义；
        钢琴伴奏歌谱钢琴两行不动；三声部合唱一起变；低音谱号来回不丢；视唱练耳 / 小提琴 / 8 轨导入没有这一组；←→ 只移焦点不切换
   SB7  收起 / 展开 + 本机键：收起条高 28、外框 34、#paper 顶 126、musetab-sbar='0'、刷新后仍收起、展开删键；摘要含谱名与「② 配和弦与伴奏」；吸住时切换谱面不跳；
        存储写不进（setItem 抛错）时照样切换、不报错、不写键；整个存储被禁用时（同版 D1：head 内存版存储）编辑器必须启动、悬浮条默认展开、收起 / 展开只在内存（集成前对 A 轨单独跑 SB7d 红：编辑器起不来）
   SB8  Alt+B 与键盘：展开 → 收起焦点在展开钮；再按 → 展开焦点在主按钮；排版模式 Alt+B 回书写展开聚焦；#i-lyric 里不响应；一个 Tab 停点；←→ / Home / End 回绕不动光标；
        Esc 交还谱面；鼠标点工具后焦点不留在条上（空格照常播放）
   SB9  读屏：toolbar + 读屏名；展开钮 aria-expanded；条内按钮读屏名非空（n3 / n4 只剩图标也不丢）；当前步 aria-current=step；① → ② 时 #lb-live 播报
   SB10 去重：没有 #flw-start / #flw-next / ⓘ / 起步说明浮层 / #lb-wrap；行 2 无「起步」、「智能」页无「下一步」、属性页无「起步 · 换谱类」；
        能打开 #lb-menu 的可见入口 ≥1280 恰好 2 个（条上谱类 ▾ + 芯片）、<1280 恰好 1 个；1280 新建钢琴伴奏歌谱行 2 不收键
   SB11 模式与场景：排版 / 输出 visibility:hidden、scrollTop 与 #paper y 不变；启动台 / 观看页 / 谱架 / 打印媒体不出；snapHTML 不带；390 / 820 不出；1180 芯片不可见、条上 ▾ 可见
   SB12 层级：1280 右栏浮出盖住条右段；1180 左栏音轨浮出盖住条左段；#lb-menu 在条上面；导览三步气泡不与条相交、第 3 步圈不变
   SB13 跟滚让位：吸住时方向键跟滚后光标框顶 ≥ 条外框底 + 8；播放跟随 / 报错跳转不落在条下；lbStickBottom()＝条外框底
   SB14 谱面与打印零变化：16 份示例 renderOffscreen 展开 / 收起 / 旧外壳逐字节相同；#score 展开 / 收起逐字节相同；打印分页 #print-pages 不含条
   SB15 旧外壳零差异：?shell=classic 没有 #flw-sbar / .flw-sb-*；新建钢琴伴奏歌谱照旧出 #lb-wrap（lbHTML 同基线，基线页在时）；Alt+B 走 LBAR.show；不写 musetab-sbar
   SB16 数据红线：只做界面操作前后 song 逐字节相同；musetab-* 键差集 ⊆ {musetab-sbar}；记谱法切换后 song 键集合 ⊆ 原键 ∪ {voxNotations, voxDual}
   SB17 性能与抖动：200 小节钢琴伴奏歌谱 FLOW.sbar.sync() 中位 ≤2ms；静置 1.5 秒 render 增量 ≤1；1280 → 1440 → 1280 每步 render ≤3
   SB18 命令面板：搜「悬浮条」「qb」「起步」第一条都是 sbar:toggle，执行即切换；没有 r2:start
   SB19 落地提示：展开时新建钢琴伴奏歌谱 / 导入《送别》/ 示例做同款没有「谱型条 / 起步 / 下一步见」；收起时写「谱面上方的悬浮条」
   SB20 右栏不再被拉走：1440 新建钢琴伴奏歌谱 / 吉他弹唱 / 和弦谱落地 FLOW.rd.page()==='prop'
   SB21 命中区与对比度：条内可见按钮最小边 ≥28；提示字 --muted、强调 --accent-ink 对条底在浅 / 深色下对比度 ≥4.5；ui_cmd 埋点 sbar:<项>
   SB22 收尾（v68.3 验收 SBAR-1..11 · ENG-1 · ENG-5，修前 prefix 页红、修后绿）：鼠标点「更多」后空格照常播放（1280 浮出 / 1440 停靠）；「键盘」「指法」按下态＝实际状态；
        宽度够时长谱名不截断；读屏「可点「X」」的 X 是条上真有的按钮名；钢琴独奏谱第 4 个工具是「织体」（同一弹窗一个名字）；点提示 / 步骤看全文；文件 ▾ 开着按 Alt+B 先收菜单；
        「下一步」与「已选」样式不同（浅底 + 箭头）；全档时步名都在、最后一步强调工具前有步号；记谱法三入口（条 · 音轨 ⋯ · 命令面板）同一判据、⋯ 有「对照」；
        吉他弹唱 ③ 的指引有去处；1280 钉住右栏的收纳档（接受收纳，文档化）
   env：MUSETAB_URL 被测页 · MUSETAB_BASE 基线页（缺省 git show tests/shellflow_ref.json 的提交，与 tv_shellflow S0 同一基线；拿不到时本地 SB15 只验不变量、CI 判红）· ONLY=SB1,SB5 · SHOTS=目录 · PAR 并发页数（缺省 2） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const CLASSICU = withQ(URL0, 'shell=classic');
/* SB15 旧外壳对拍基线：与 tv_shellflow S0 / tv_trktree T0 / tv_modes M23 同一口径——tests/shellflow_ref.json 的提交（git show 取出；deploy.yml 浅克隆后单独 fetch 这一个提交）；
   env MUSETAB_BASE＝基线 index.html 路径（本地临时改）、MUSETAB_REF_COMMIT 临时改提交；拿不到时本地只验不变量、CI 判红（同 tv_shellflow IN_CI） */
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shellflow_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.MUSETAB_REF_COMMIT || REF.commit || '';
const IN_CI = !!process.env.CI && process.env.MUSETAB_REF !== 'none';
const BASEU = (() => {
  const e = process.env.MUSETAB_BASE;
  if (e) { const f = e.replace(/^file:\/\//, '').replace(/[?#].*$/, ''); return fs.existsSync(f) ? (e.startsWith('file://') ? e : 'file://' + path.resolve(e)) : ''; }
  if (!REF_COMMIT || process.env.MUSETAB_REF === 'none') return '';
  try { const txt = require('child_process').execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(require('os').tmpdir(), 'tv_sbar_ref_' + REF_COMMIT.slice(0, 12) + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; }
})();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const OUT = {}, errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (!ok && d != null ? ': ' + String(d).slice(0, 2000) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push(s); };

/* —— 页面内工具（每次 goto 之后注入；只定义 window.__*）—— */
function HELP() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
  try { hideStartPad(); } catch (_) {}
  window.$i = id => document.getElementById(id);
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10;
    return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom), vis: __vis(e) }; };
  window.__raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));
  if (!window.__toastW) { window.__toastW = 1; window.__toasts = []; const t0 = window.toast; window.toast = function (m) { try { __toasts.push(String(m)); } catch (_) {} return t0.apply(this, arguments); }; }
  window.__one = s => { addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return s; };
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__new = (k, o) => { o = o || {}; const s = NWB.build(k, Object.assign({ title: '测' + k, nMea: o.nMea || 8 }, o.b || {})); if (o.mod) o.mod(s); __one(s);
    if (o.meta !== false) LBAR.open(Object.assign({ from: 'new' }, o.meta || {}));
    const tab = (k === 'T' || k === 'ST' || (k === 'JT' && !(o.meta && o.meta.pen === 'J')));
    sel = { mi: 0, row: tab ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return 1; };
  window.__qc = sc => { try { closeModal(); } catch (_) {} NWP.quickCreate(sc); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return 1; };
  window.__songbie3 = () => { const s = __P('送别'), m = s.measures; s.measures = m.concat(JSON.parse(JSON.stringify(m)), JSON.parse(JSON.stringify(m))); __one(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); return 1; };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__melIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((mi * 3 + i) % 7) + 1, u)); }); return s; };
  window.__accIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((i + mi) % 5) + 1, u, { oct: -1 })); }); return s; };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { lbMenuClose(); } catch (_) {} try { closeModal(); } catch (_) {} try { FLOW.rd.close(false); } catch (_) {} };
  /* 弹窗 / 菜单签名（委托同效比较用）：弹窗标题 + 按钮数 + 输入框数；#popmenu 的类与项数与前 60 字 */
  window.__sig = () => { const m = document.querySelector('#modal-mask .modal'), p = document.getElementById('popmenu'), lm = document.getElementById('lb-menu');
    return { modal: m ? ((m.querySelector('h3') || {}).textContent || '').trim() + '|' + m.querySelectorAll('button').length + '|' + m.querySelectorAll('input,select,textarea').length : null,
      pop: p ? p.className + '|' + p.querySelectorAll('button').length + '|' + (p.textContent || '').replace(/\s+/g, '').slice(0, 60) : null, lb: lm ? lm.querySelectorAll('.lb-mi').length : null }; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  /* 悬浮条 DOM 读法 */
  window.__bar = () => { const w = $i('flw-sbar'), bar = $i('flw-sb-bar'); if (!w || !bar) return null;
    const k = $i('flw-sb-kind'), hi = $i('flw-sb-hint');
    return { vis: __vis(w), sb: w.dataset.sb, ph: w.dataset.ph, name: k ? (k.querySelector('.flw-sb-kn') || {}).textContent : null, ic: k ? (k.querySelector('svg.pqi') || { dataset: {} }).dataset.pq : null,
      seg: w.querySelector('.flw-sb-seg') ? [...w.querySelectorAll('.flw-sb-seg button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v).join('') : null,
      steps: [...w.querySelectorAll('.flw-sb-steps li')].map(li => li.className + ':' + (li.querySelector('.flw-sb-t') || {}).textContent.replace(/^已完成：/, '')),
      go: (b => b ? { t: b.textContent.trim(), act: b.dataset.act, title: b.title } : null)(w.querySelector('[data-fa="sbar:go"]')),
      tools: [...w.querySelectorAll('.flw-sb-tool')].map(b => b.dataset.v), pri: (b => b ? b.dataset.v : null)(w.querySelector('.flw-sb-tool.pri')),
      hint: hi ? hi.textContent : null, hintT: hi ? hi.title : null, hintVis: __vis(hi), tier: FLOW.sbar.model().tier,
      txt: bar.innerText + ' ' + [...bar.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '')).join(' ') }; };
  /* 规格 §2.2 / §2.3 / §2.5 的独立复述（只用底层判据：lbInfo / lbCur / lbMelVoices / renderDock 的内联显隐 / chordAvail），对拍实现 */
  window.__oracle = () => {
    const s = song, meta = lbMeta(), f = lbInfo(s, meta), c = lbCur(f), k = f.k, mv = lbMelVoices(s);
    const shown = id => { const b = document.getElementById(id); return !!b && b.style.display !== 'none'; };
    const ik = s.instKey && s.instKey !== 'piano' ? s.instKey : '', it = ik && NW_INSTS.find(x => x.k === ik);
    const segOk = ['J', 'S', 'SJ', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'JT'].includes(k) && !(meta && meta.scene === 'sight') && !(it && ['J', 'S', 'SJ'].includes(k) && it.fam !== 'jianpu') && mv.length >= 1;   /* 收尾 ENG-1：不再限 4 条（与音轨区 ⋯ 同一判据） */
    let seg = null;
    if (segOk) { const vn = s.voxNotations || [], vd = s.voxDual || [], st = mv.map(i => ['staff', 'bass', 'alto'].includes(vn[i])), du = mv.map(i => !!vd[i]);
      seg = st.every(x => !x) ? 'J' : st.every(x => x) ? (du.every(x => x) ? 'D' : du.every(x => !x) ? 'S' : '') : ''; }
    const st = f.steps, last = st && st[st.length - 1];
    const phase = (!st || c.fin || !c.cur || c.cur === last) ? 'tools' : 'steps';
    const ca = FLOW.rdp.chordAvail();
    const OK = { lyr: () => s.voxVoices.length > 0 && (s.lyricLines | 0) > 0, chord: () => true, lab: () => shown('rt-lab'), arr: () => shown('rt-arr') && mv.length === 1, tex: () => shown('b-acctex') || (s.voxVoices.length >= 2 && !!accTexRows(s)),   /* 收尾 SBAR-6：同 openRhyLib（钢琴独奏谱大谱表也能用） */
      rhy: () => shown('panel-tab-pat') || shown('panel-vox-pat'), gen: () => shown('nl-voxtab') && s.voxVoices.length > 0, deg: () => ca.fn, diag: () => ca.dg, board: () => true,
      fing: () => FLOW.pal.ok('fingering', FLOW.ctx()), mea: () => true };
    const TAB = { J: ['lyr', 'chord', 'lab', 'arr'], S: ['lyr', 'chord', 'lab', 'arr'], SJ: ['lyr', 'chord', 'lab', 'arr'], T: ['chord', 'rhy', 'diag', 'board'], JT: ['lyr', 'chord', 'rhy', 'diag'],
      ST: ['board', 'chord', 'rhy', 'diag'], G: ['board', 'fing', 'chord', 'tex'], CG: ['tex', 'chord', 'deg', 'board'], JG: ['tex', 'lyr', 'lab', 'deg'], SG: ['tex', 'lyr', 'lab', 'deg'], SJG: ['tex', 'lyr', 'lab', 'deg'],
      CJ: ['chord', 'lab', 'deg', 'lyr'], CS: ['chord', 'lab', 'deg', 'lyr'], C: ['chord', 'deg', 'mea'] };   /* 收尾 SBAR-6：G 第 4 个是「织体」 */
    let ids = (TAB[k] || []).filter(id => OK[id]()), pri = null;
    if (phase === 'tools' && !c.fin && c.cur && c.cur === last && c.nxt) pri = { tex: 'tex', arrange: 'arr', tabgen: 'gen' }[c.nxt.act] || null;
    if (pri && !ids.includes(pri)) ids.unshift(pri);
    if (ids.length < 3 && !ids.includes('board')) ids.push('board');
    ids = ids.slice(0, 4);
    const SB_TIP = { J: '点谱面，按数字键写音', S: '点谱面，按数字键按调写音', SJ: '两行任选一行输入，另一行同步', T: '↑↓ 选弦，数字键写品位', JT: '↑↓ 选弦，数字键写品位',
      ST: '在六线谱输入，五线谱自动同步', G: '数字键写音，↑↓ 换右手 / 左手', CJ: '先写旋律，再按 Ctrl+K 标和弦', CS: '先写旋律，再按 Ctrl+K 标和弦', C: '选中一拍，按 Ctrl+K 写和弦' };
    const bare = lbAllBare(s);
    /* 收尾 ENG-5：工具阶段里当前步是最后一步且没有按钮（吉他弹唱 ③、导入谱伴奏来自文件的 ③）——它的短提示照样出，优先于空谱提示 */
    const SB_HINT = { '写旋律': '点旋律行，按数字键写音', '标和弦': '选中右手的音，按 Ctrl+K', '选织体': '伴奏来自文件，已保留', '调把位与扫弦': '点六线谱的音改品位' };
    let tip = null, tipT = null;
    if (phase === 'tools') {
      if (!c.fin && c.cur && c.cur === last && !c.nxt && (SB_HINT[c.cur.t] || c.hint)) { tipT = c.hint || c.cur.hint || ''; tip = SB_HINT[c.cur.t] || tipT; }
      else if (bare && SB_TIP[k]) { tip = SB_TIP[k]; tipT = f.tip; } }
    return { k, name: NWB.kindOfSong(s).name, ic: NWB.kindOfSong(s).ic, chip: ($i('flw-kchip') ? ($i('flw-kchip').querySelector('.flw-kn') || {}).textContent : null), seg, phase,
      steps: phase === 'steps' ? st.map(x => x.st + ':' + x.t) : [], go: phase === 'steps' && c.nxt ? c.nxt.btn : null,
      tools: phase === 'tools' ? ids : [], pri, tip, tipT };
  };
  /* 极简 SMF 写出（format 1：速度轨 + n 条旋律轨，每轨 4 小节四分音符；导入 MIDI 多轨场景） */
  window.__smf = n => { const B = []; const u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], u16 = v => [(v >> 8) & 255, v & 255];
    const vlq = v => { const o = [v & 127]; while ((v >>= 7)) o.unshift((v & 127) | 128); return o; };
    const trk = ev => { const d = []; ev.forEach(e => d.push(...e)); d.push(0, 0xff, 0x2f, 0); return [0x4d, 0x54, 0x72, 0x6b, ...u32(d.length), ...d]; };
    B.push(0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(1), ...u16(n + 1), ...u16(480));
    B.push(...trk([[0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20], [0, 0xff, 0x58, 4, 4, 2, 24, 8]]));
    for (let t = 0; t < n; t++) { const ev = [[0, 0xff, 0x03, ...vlq(5), ...Array.from('Track').map(c => c.charCodeAt(0))]], ch = t % 9;
      for (let i = 0; i < 16; i++) { const nn = 60 + ((i + t * 2) % 12) - (t > 3 ? 12 : 0); ev.push([0, 0x90 | ch, nn, 80], [...vlq(480), 0x80 | ch, nn, 0]); }
      B.push(...trk(ev)); }
    return new Uint8Array(B); };
  return 1;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (w, h, o) => {
    o = o || {};
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1 });
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage(); pg._ctx = ctx; pg._tag = o.tag || '';
    pg.on('pageerror', e => errs.push((o.tag || '') + ' PAGEERR: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && /flow|悬浮|sbar/.test(m.text())) errs.push((o.tag || '') + ' CONSOLE: ' + m.text()); });
    await pg.goto(o.url || URL0); await pg.waitForTimeout(o.boot || 900);
    if (o.help !== false) await pg.evaluate(HELP).catch(e => errs.push('HELP: ' + e.message));
    return pg;
  };
  const close = pg => pg._ctx.close().catch(() => {});
  const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ __err: e.message.split('\n')[0] }));
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const raf = pg => EV(pg, () => __raf2());
  const shot = async (pg, name, clip) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true });
    await pg.screenshot(Object.assign({ path: path.join(SHOTS, name + '.png') }, clip ? { clip } : {})).catch(() => {}); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', e.message.split('\n')[0]); } };
  const jobs = [];

  /* ================= SB1 几何 ================= */
  if (want('SB1')) for (const [w, h] of [[1180, 800], [1280, 800], [1440, 900], [1920, 1080]]) for (const sc of ['light', 'dark']) jobs.push(() => SAFE('SB1', 'SB1 ' + w + ' ' + sc, async () => {
    const pg = await open(w, h, { scheme: sc, tag: 'SB1-' + w + sc });
    const WANT = { 1180: 1064, 1280: 972, 1440: 908, 1920: 1088 };
    const rows = [];
    for (const scn of ['newpacc', 'songbie', 'gtrJ']) {
      if (scn === 'newpacc') await EV(pg, () => __qc('pacc'));
      else if (scn === 'songbie') await EV(pg, () => __songbie3());
      else await EV(pg, () => __new('JT', { meta: { pen: 'J' } }));
      await raf(pg);
      const g = await EV(pg, async () => {
        const sw = $i('score-wrap'); sw.scrollTop = 0; await __raf2();
        const W = $i('flw-sbar'), bar = $i('flw-sb-bar'), P = $i('paper'), S = $i('score'), r = x => x.getBoundingClientRect();
        const wr = r(W), br = r(bar), pr = r(P), sr = r(S), swr = r(sw);
        const btns = [...bar.querySelectorAll('button')].filter(__vis);
        const out = btns.filter(x => { const q = r(x); return q.left < br.left - 0.5 || q.right > br.right + 0.5 || q.top < br.top - 0.5 || q.bottom > br.bottom + 0.5; }).map(x => x.dataset.fa + ':' + (x.dataset.v || ''));
        const miss = btns.filter(x => { const q = r(x), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(e && (e === x || x.contains(e))); }).map(x => x.dataset.fa + ':' + (x.dataset.v || ''));
        const o = { vis: __vis(W), barH: br.height, wH: wr.height, L: wr.left, R: wr.right, eL: Math.max(pr.left, sr.left), eR: Math.min(pr.right, sr.right), top0: br.top, paperTop: pr.top, swTop: swr.top,
          out, miss, n: btns.length, ovf: bar.scrollWidth - bar.clientWidth, hs: document.documentElement.scrollWidth - innerWidth, width: Math.round(wr.width), tier: FLOW.sbar.model().tier };
        sw.scrollTop = 400; await __raf2();
        const br2 = r(bar); o.st = sw.scrollTop; o.top1 = br2.top; o.bot1 = br2.bottom;
        sw.scrollTop = 0; await __raf2();
        return o; });
      if (w === 1280 || w === 1440) await shot(pg, 'SB1-' + scn + '-' + w + '-' + sc, { x: 0, y: 0, width: w, height: 300 });
      rows.push(Object.assign({ scn }, g));
    }
    const bad = rows.filter(g => !(g.vis && Math.abs(g.barH - 40) <= 0.5 && Math.abs(g.wH - 46) <= 0.5 && Math.abs(g.L - g.eL) <= 1 && Math.abs(g.R - g.eR) <= 1
      && Math.abs(g.top0 - 92) <= 1 && Math.abs(g.paperTop - 138) <= 1 && g.st >= 50 && Math.abs(g.top1 - g.swTop) <= 1 && Math.abs(g.swTop - 84) <= 1 && Math.abs(g.bot1 - 124) <= 1
      && !g.out.length && !g.miss.length && g.ovf <= 1 && g.hs <= 0 && g.tier === 'full' && (g.scn !== 'newpacc' || Math.abs(g.width - WANT[w]) <= 1)));
    T('SB1', !bad.length, 'SB1 ' + w + '×' + h + ' ' + (sc === 'dark' ? '深' : '浅') + '：新建钢琴伴奏歌谱 / 送别 / 吉他弹唱——条高 40、外框 46、左右缘＝#score ∩ #paper（±1）、条顶 92 · #paper 顶 138、吸住条顶＝谱面区顶 84 · 条底 124、按钮在条框里且中心命中、不溢出、无横向滚动、全档；新建钢琴伴奏歌谱条宽 ' + WANT[w],
      J(rows.map(g => [g.scn, g.width, g.barH, g.wH, Math.round(g.L - g.eL), Math.round(g.R - g.eR), g.top0, g.paperTop, g.top1, g.bot1, g.st, g.out, g.miss, g.ovf, g.hs, g.tier])));
    await close(pg);
  }));

  /* ================= SB2 收纳 ================= */
  const STK = ['J', 'S', 'SJ', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'C'];
  /* 每种谱类：新建空谱 + 有内容的状态（钢琴伴奏歌谱 ②「补配 12 小节」/ ③ 工具阶段；吉他弹唱 ② 生成六线谱；钢琴弹唱谱 ① 提示） */
  const STATES = STK.map(k => ({ k })).concat([
    { k: 'JG', tag: 'JG-gap', mod: 'gap' }, { k: 'SG', tag: 'SG-tools', mod: 'tools' }, { k: 'JT', tag: 'JT-2', mod: 'jt2', meta: { pen: 'J' } }, { k: 'J', tag: 'J-mel', mod: 'mel' }]);
  const setState = (pg, x) => EV(pg, x => {
    __new(x.k, { nMea: 16, meta: x.meta });
    if (x.mod === 'gap') mutate(() => { __melIn(song, 0, [...Array(16).keys()]); __accIn(song, 1, [0, 1, 2, 3]); __accIn(song, 2, [0, 1, 2, 3]); });
    if (x.mod === 'tools') mutate(() => { __melIn(song, 0, [...Array(16).keys()]); __accIn(song, 1, [...Array(16).keys()]); __accIn(song, 2, [...Array(16).keys()]); song.measures[0].voxes[0][0].chord = 'C'; });
    if (x.mod === 'jt2' || x.mod === 'mel') mutate(() => { __melIn(song, 0, [0, 1, 2, 3]); });
    return 1; }, x);
  if (want('SB2')) for (const [w, h] of [[1180, 800], [1280, 800], [1440, 900], [1920, 1080]]) jobs.push(() => SAFE('SB2', 'SB2a ' + w, async () => {
    const pg = await open(w, h, { tag: 'SB2-' + w });
    const rows = [];
    for (const x of STATES) { await setState(pg, x); await raf(pg);
      rows.push(Object.assign({ s: x.tag || x.k }, await EV(pg, () => { const bar = $i('flw-sb-bar'), m = FLOW.sbar.model(); return { tier: m.tier, ph: m.phase, ovf: bar.scrollWidth - bar.clientWidth, h: Math.round(bar.getBoundingClientRect().height), go: m.go }; }))); }
    const bad = rows.filter(r => r.tier !== 'full' || r.ovf > 1 || r.h !== 40);
    T('SB2', !bad.length && rows.some(r => r.go && /补配 12 小节/.test(r.go)), 'SB2a ' + w + '×' + h + '：14 种谱类（空谱）与 4 个有内容的状态（含「补配 12 小节」、钢琴伴奏歌谱工具阶段）都是全档、不溢出、条高 40', J(bad.length ? bad : rows.map(r => r.s + ':' + r.ph + ':' + r.tier)));
    if (w === 1280) {
      /* SB2c 缩小谱面到 50%：条宽最窄 560、以谱纸中线居中、不超过 n3 */
      const z0 = await EV(pg, () => viewZoom);
      const zr = [];
      for (const x of STATES) { await setState(pg, x); await EV(pg, () => setViewZoom(0.5)); await raf(pg); await raf(pg);
        zr.push(Object.assign({ s: x.tag || x.k }, await EV(pg, () => { const W = $i('flw-sbar').getBoundingClientRect(), P = $i('paper').getBoundingClientRect(), S = $i('score').getBoundingClientRect();
          const L = Math.max(P.left, S.left), R = Math.min(P.right, S.right), bar = $i('flw-sb-bar');
          return { w: Math.round(W.width), dc: Math.round((W.left + W.right) / 2 - (L + R) / 2), tier: FLOW.sbar.model().tier, ovf: bar.scrollWidth - bar.clientWidth, h: Math.round(bar.getBoundingClientRect().height), sw: Math.round(R - L) }; }))); }
      await EV(pg, z => { setViewZoom(z); }, z0); await raf(pg);
      const zb = zr.filter(r => Math.abs(r.w - 560) > 1 || Math.abs(r.dc) > 1 || ['n4', 'n5'].includes(r.tier) || r.ovf > 1 || r.h !== 40);
      T('SB2', !zb.length && zr.every(r => r.sw < 560), 'SB2c 谱面缩小到 50%（谱纸可见宽 < 560）：条宽 560±1、以谱纸中线居中、最多收到 n3、不溢出、条高 40', J(zb.length ? zb : zr.map(r => r.s + ':' + r.tier + ':' + r.sw)));
      /* SB2d 强制 360：到 n5——「更多」变菜单、列出收起的工具、点其中一项与条上点同效；SB2e 各档条高 40 */
      await setState(pg, { k: 'SG', mod: 'tools' }); await raf(pg);
      const hs = [];
      for (const fw of [700, 560, 450, 400, 360]) { await EV(pg, fw => FLOW.sbar.fit({ w: fw }), fw); await raf(pg);
        hs.push(await EV(pg, fw => { const bar = $i('flw-sb-bar'); return { fw, tier: FLOW.sbar.model().tier, h: Math.round(bar.getBoundingClientRect().height), ovf: bar.scrollWidth - bar.clientWidth,
          names: [...bar.querySelectorAll('button')].filter(__vis).every(b => (b.getAttribute('aria-label') || b.textContent || '').trim().length > 0) }; }, fw)); }
      const n5 = await EV(pg, () => { const bar = $i('flw-sb-bar'), more = bar.querySelector('.flw-sb-more'), off = [...bar.querySelectorAll('.flw-sb-tool.flw-off')].map(b => b.dataset.v);
        return { off, pop: more.getAttribute('aria-haspopup'), vis: [...bar.querySelectorAll('.flw-sb-tool')].filter(__vis).map(b => b.dataset.v) }; });
      await pg.click('#flw-sbar .flw-sb-more'); await wait(pg, 200);
      const menu = await EV(pg, () => { const p = document.getElementById('popmenu'); return p ? { items: [...p.querySelectorAll('[data-fa="sbar:tool"]')].map(x => x.dataset.v), smart: !!p.querySelector('[data-fa="sbar:smart"]') } : null; });
      /* 菜单里点第一项（360 时是最后一个工具「级数」）＝条上点它＝#vf-names：同一结果、各一步撤销 */
      let same = null;
      if (menu && menu.items.length) {
        const id = menu.items[0], j0 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length }));
        await pg.click('#popmenu [data-fa="sbar:tool"][data-v="' + id + '"]'); await wait(pg, 300);
        const a = await EV(pg, () => { const s = __sig(); __shut(); return { s, j: JSON.stringify(song), u: undoStack.length }; });
        await EV(pg, j0 => { song = JSON.parse(j0.j); docs[curDocI].song = song; undoStack.length = j0.u; render(); return 1; }, j0);
        await EV(pg, () => FLOW.sbar.fit({ w: 0 })); await raf(pg);
        await pg.click('#flw-sbar .flw-sb-tool[data-v="' + id + '"]'); await wait(pg, 300);
        const b2 = await EV(pg, () => { const s = __sig(); __shut(); return { s, j: JSON.stringify(song), u: undoStack.length }; });
        same = { id, a: a.s, b2: b2.s, ok: J(a.s) === J(b2.s) && a.j === b2.j && a.u === b2.u && (a.j !== j0.j || !!a.s.modal || !!a.s.pop) };
      }
      await EV(pg, () => FLOW.sbar.fit({ w: 0 })); await raf(pg);
      const back = await EV(pg, () => ({ tier: FLOW.sbar.model().tier, pop: $i('flw-sb-bar').querySelector('.flw-sb-more').getAttribute('aria-haspopup') }));
      T('SB2', hs.every(x => x.h === 40 && x.ovf <= 1 && x.names) && hs[hs.length - 1].tier === 'n5' && n5.off.length > 0 && n5.pop === 'menu' && !!menu && J(menu.items) === J(n5.off) && menu.smart && same && same.ok && back.tier === 'full' && back.pop === null,
        'SB2d / SB2e 强制条宽 700 → 360：逐档收（条高恒 40、不溢出、按钮读屏名不丢），360 到 n5——工具从后往前收进「更多」（aria-haspopup=menu），菜单列出被收的工具 + 「全部智能工具」，点菜单里的工具与条上点它同一结果；恢复后回全档',
        J({ hs, n5, menu, same, back }));
    }
    await close(pg);
  }));
  if (want('SB2')) jobs.push(() => SAFE('SB2', 'SB2b', async () => {
    const pg = await open(821, 760, { tag: 'SB2b' });
    const rows = [];
    for (const x of STATES) { await setState(pg, x); await raf(pg);
      rows.push(Object.assign({ s: x.tag || x.k }, await EV(pg, () => { const bar = $i('flw-sb-bar'), m = FLOW.sbar.model(), hi = $i('flw-sb-hint');
        return { tier: m.tier, ovf: bar.scrollWidth - bar.clientWidth, h: Math.round(bar.getBoundingClientRect().height), hint: !!hi, hintVis: __vis(hi),
          seg: !!bar.querySelector('.flw-sb-seg'), segTxt: [...bar.querySelectorAll('.flw-sb-seg .flw-sb-l')].some(__vis), toolTxt: [...bar.querySelectorAll('.flw-sb-tool .flw-sb-l')].some(__vis) }; }))); }
    /* 先收提示（n1）再收标签：到 n2 的都已没有可见提示；n1 档记谱法字还在 */
    const bad = rows.filter(r => !['full', 'n1', 'n2'].includes(r.tier) || r.ovf > 1 || r.h !== 40 || (r.tier !== 'full' && r.hint && r.hintVis) || (r.tier === 'n1' && r.seg && !r.segTxt));
    await shot(pg, 'SB2-821-JG', { x: 0, y: 0, width: 821, height: 260 });
    T('SB2', !bad.length && rows.some(r => r.tier !== 'full'), 'SB2b 821×760：各谱类不超过 n2、不溢出、条高 40；收纳先收提示（n1：提示隐藏、记谱法字仍在）再收记谱法字（n2）', J(rows.map(r => r.s + ':' + r.tier)));
    await close(pg);
  }));

  /* ================= SB3 每谱类内容 ================= */
  if (want('SB3')) jobs.push(() => SAFE('SB3', 'SB3', async () => {
    const pg = await open(1440, 900, { tag: 'SB3' });
    const cases = [];
    const check = async (tag) => { await raf(pg); const r = await EV(pg, () => ({ o: __oracle(), b: __bar() })); r.tag = tag; cases.push(r); };
    for (const k of STK) { await EV(pg, k => __new(k), k); await check('build:' + k); }
    for (const sc of ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank']) { await EV(pg, sc => __qc(sc), sc); await check('new:' + sc); }
    await EV(pg, () => { __one(__P('送别')); return 1; }); await check('preset:送别');
    await EV(pg, () => { __one(__P('两只老虎')); return 1; }); await check('preset:两只老虎');
    await EV(pg, () => { __one(createSong('vocal', { title: '打开的谱', nMea: 4 })); return 1; }); await check('open:createSong');
    /* 导入 MIDI 多轨：8 轨文件进现有 MIDI 导入对话框（谱类「歌谱」，旋律声部上限 4——勾前 4 条） */
    await EV(pg, () => { showMidiImport(parseSMF(__smf(8))); return 1; }); await wait(pg, 200);
    await EV(pg, () => { document.querySelectorAll('#modal-mask [data-mi-t]').forEach((x, i) => { x.checked = i < 4; x.dispatchEvent(new Event('change', { bubbles: true })); }); return 1; });
    await pg.click('#mi-go').catch(() => {}); await wait(pg, 400);
    await EV(pg, () => { try { closeModal(); } catch (_) {} while (docs.length > 1) closeDocAt(0); render(); return 1; });
    const nv8 = await EV(pg, () => ({ n: song.voxVoices.length, lab: (document.querySelector('#flw-sbar .flw-sb-seg') || { getAttribute: () => '' }).getAttribute('aria-label') }));
    await check('midi:8');
    await shot(pg, 'SB3-midi8-1440', { x: 0, y: 0, width: 1440, height: 300 });
    const CODE = /(^|[^A-Za-z])(JG|SG|SJG|CJ|CS|JT|ST|SJ|CG)([^A-Za-z]|$)/;
    const bad = [];
    cases.forEach(r => { const o = r.o, x = r.b;
      const e = [];
      if (!x || !x.vis) e.push('不可见');
      else {
        if (x.name !== o.name || x.name !== o.chip) e.push('谱名 ' + x.name + '/' + o.name + '/' + o.chip);
        if (!x.ic || (x.ic !== o.ic && x.ic !== o.ic.replace(/^type-/, 'type-'))) e.push('图标 ' + x.ic + '/' + o.ic);
        if ((x.seg === null) !== (o.seg === null) || (o.seg !== null && x.seg !== o.seg)) e.push('记谱法 ' + x.seg + '/' + o.seg);
        if (x.ph !== o.phase) e.push('阶段 ' + x.ph + '/' + o.phase);
        if (J(x.steps) !== J(o.steps)) e.push('步骤 ' + J(x.steps) + '/' + J(o.steps));
        if ((x.go && x.go.t) !== (o.go || undefined) && !(x.go === null && o.go === null)) e.push('主按钮 ' + J(x.go) + '/' + o.go);
        if (J(x.tools) !== J(o.tools) || (x.pri || null) !== (o.pri || null)) e.push('工具 ' + J(x.tools) + ' pri ' + x.pri + ' / ' + J(o.tools) + ' pri ' + o.pri);
        if ((o.tip || null) !== (o.phase === 'tools' ? (x.hint || null) : (o.tip || null)) || (o.tip && x.hintT !== o.tipT)) e.push('提示 ' + x.hint + '|' + x.hintT + ' / ' + o.tip + '|' + o.tipT);
        if (CODE.test(x.txt)) e.push('内部代码 ' + (x.txt.match(CODE) || [])[2]);
      }
      if (e.length) bad.push(r.tag + '：' + e.join('；')); });
    /* 规格表的几处显式值（防止实现与对拍一起错） */
    const by = t => (cases.find(r => r.tag === t) || {}).b || {};
    const fixed = { 'build:J': ['lyr', 'chord', 'lab', 'arr'], 'build:T': ['chord', 'rhy', 'diag', 'board'], 'build:ST': ['board', 'chord', 'rhy', 'diag'], 'build:G': ['board', 'fing', 'chord', 'tex'], 'build:C': ['chord', 'deg', 'mea'] };
    const fb = Object.keys(fixed).filter(t => J(by(t).tools) !== J(fixed[t])).map(t => t + ':' + J(by(t).tools));
    const segFix = { 'build:SJ': 'D', 'build:SG': 'S', 'build:SJG': 'D', 'build:G': null, 'build:CG': null, 'build:T': null, 'build:C': null, 'new:sight': null, 'midi:8': 'J' };
    const sb = Object.keys(segFix).filter(t => by(t).seg !== segFix[t] && !(segFix[t] === null && by(t).seg === null)).map(t => t + ':' + by(t).seg);
    T('SB3', !bad.length && !fb.length && !sb.length && nv8.n === 4 && /全部旋律轨/.test(nv8.lab) && cases.length === 28,
      'SB3 ' + cases.length + ' 份谱（NWB.build 14 种 · 新建面板 10 个用途 · 示例 2 · createSong 打开 · 导入 MIDI 8 轨文件选 4 条旋律轨——记谱法组读屏名「全部旋律轨」）：谱名 / 图标＝NWB.kindOfSong＝左栏芯片；记谱法组与按下项、阶段、步骤、主按钮、工具 id 与顺序、强调项、空谱提示（＝SB_TIP，title＝LB_TIP）＝规格 §2 对拍；不出现内部代码；规格表显式值（简谱歌谱 / 吉他谱 / 吉他独奏 / 钢琴独奏 / 和弦谱的工具，教学对照 / 五线伴奏 / 对照伴奏按下项，钢琴 / 和弦 / 视唱没有记谱法组；>4 条旋律轨见 SB6e）',
      J({ bad, fb, sb, nv8, n: cases.length }));
    await close(pg);
  }));

  /* ================= SB4 起步推进（真实点击） ================= */
  if (want('SB4')) jobs.push(() => SAFE('SB4', 'SB4', async () => {
    const pg = await open(1280, 800, { tag: 'SB4' });
    const st = () => EV(pg, async () => { await __raf2(); const x = __bar(), m = FLOW.sbar.model(); return { ph: x.ph, steps: x.steps.join(' | '), msteps: (m.steps || []).join(' | '), go: x.go, pri: x.pri, priT: (document.querySelector('#flw-sbar .flw-sb-tool.pri') || {}).title || null,
      hint: x.hint, py: Math.round($i('paper').getBoundingClientRect().top), nTab: song.tabVoices.length }; });
    await EV(pg, () => __qc('pacc'));
    const s0 = await st();
    await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); });
    for (const k of '1235') { await pg.keyboard.press(k); await wait(pg, 30); }
    await wait(pg, 120);
    const s1 = await st();
    await pg.click('#flw-sbar [data-fa="sbar:go"]'); await wait(pg, 200);
    const m1 = await EV(pg, () => ({ out: ($i('arr-out') || {}).value, h: (document.querySelector('#modal-mask h3') || {}).textContent }));
    await pg.click('#arr-go').catch(() => {}); await wait(pg, 300);
    const s2 = await st();
    await pg.click('#flw-sbar .flw-sb-tool.pri').catch(() => {}); await wait(pg, 200);
    const m2 = await EV(pg, () => ({ tex: !!$i('tex-go') }));
    await pg.click('#tex-go').catch(() => {}); await wait(pg, 300);
    const s3 = await st();
    /* 续写旋律 → ② 回来「补配 N 小节」 */
    await EV(pg, () => { mutate(() => { __melIn(song, 0, [1, 2]); }); });
    const s4 = await st();
    const okJG = s0.ph === 'steps' && /^now:写旋律/.test(s0.steps) && s0.hint === '点旋律行，按数字键写音' && !s0.go
      && s1.steps === 'done:写旋律 | now:配和弦与伴奏 | todo:选织体' && s1.go && s1.go.t === '一键配伴奏' && m1.out === 'fill'
      && s2.ph === 'tools' && s2.pri === 'tex' && /^织体（下一步）：换一种伴奏织体/.test(s2.priT) && m2.tex && s3.ph === 'tools' && !s3.pri && /done:选织体/.test(s3.msteps)
      && s4.ph === 'steps' && s4.go && /^补配 2 小节$/.test(s4.go.t) && [s0, s1, s2, s3, s4].every(x => x.py === s0.py);
    await shot(pg, 'SB4-pacc-step2-1280', { x: 0, y: 0, width: 1280, height: 260 });
    T('SB4', okJG, 'SB4a 钢琴伴奏歌谱（真实点击）：①（提示「点旋律行，按数字键写音」）→ 键入 1235 → ②「一键配伴奏」→ 智能配谱默认「填进当前谱」→ 生成后进工具阶段、「织体」强调（title「织体（下一步）：换一种伴奏织体」，收尾 SBAR-4 / 6 名字统一）→ 伴奏织体 → 生成后强调消失；续写 2 小节旋律 → ② 回来「补配 2 小节」；阶段切换前后 #paper 的 y 不变',
      J({ s0, s1, m1, s2, m2, s3, s4 }));
    /* 吉他弹唱「从简谱写起」 */
    await EV(pg, () => __new('JT', { meta: { pen: 'J' } }));
    const g0 = await st();
    for (const k of '5653') { await pg.keyboard.press(k); await wait(pg, 30); }
    await wait(pg, 120);
    const g1 = await st();
    await pg.click('#flw-sbar [data-fa="sbar:go"]'); await wait(pg, 200);
    const md = await EV(pg, () => !!$i('vt-low'));
    await pg.click('#vt-low').catch(() => {}); await wait(pg, 300);
    const g2 = await st();
    const g2h = await EV(pg, () => { const h = $i('flw-sb-hint'); return h ? { t: h.textContent, title: h.title, vis: __vis(h) } : null; });
    T('SB4', g0.ph === 'steps' && /^now:写旋律/.test(g0.steps) && g1.go && g1.go.t === '生成六线谱' && /轨数不变/.test(g1.go.title) && md && g2.ph === 'tools' && g2.nTab === 1 && /now:调把位与扫弦/.test(g2.msteps) && !g2.pri && [g0, g1, g2].every(x => x.py === g0.py)
      && g2h && g2h.vis && g2h.t === '点六线谱的音改品位' && /↑↓ 选弦/.test(g2h.title),
      'SB4b 吉他弹唱「从简谱写起」：① → ②「生成六线谱」（title 写「轨数不变」）→ 低把位 → 工具阶段（③ 是最后一步）、仍 1 条吉他轨、没有强调项；#paper y 不变；③ 的指引有去处（收尾 ENG-5：条上「点六线谱的音改品位」，title 全文含「↑↓ 选弦」）', J({ g0, g1, md, g2, g2h }));
    /* 钢琴弹唱谱 */
    await EV(pg, () => __new('CG'));
    const c0 = await st();
    await EV(pg, () => { mutate(() => { song.measures[0].voxes[0][0].chord = 'C'; }); });
    const c1 = await st();
    T('SB4', c0.ph === 'steps' && c0.steps === 'now:标和弦 | todo:选织体' && c0.hint === '选中右手的音，按 Ctrl+K' && c1.ph === 'tools' && c1.pri === 'tex' && /^织体（下一步）：按已标和弦生成双手伴奏/.test(c1.priT) && c0.py === c1.py,
      'SB4c 钢琴弹唱谱：①标和弦（提示「选中右手的音，按 Ctrl+K」）→ 标一个和弦 → 工具阶段「织体」强调、title「织体（下一步）：按已标和弦生成双手伴奏」；#paper y 不变', J({ c0, c1 }));
    await close(pg);
  }));

  /* ================= SB5 委托同效 ================= */
  if (want('SB5')) jobs.push(() => SAFE('SB5', 'SB5', async () => {
    const pg = await open(1440, 900, { tag: 'SB5' });
    const res = [];
    /* 工具 → [场景, 委托目标（与条上点同一调用）] */
    const CASES = [
      ['chord', () => __new('J'), () => showChordQuick()],
      ['lab', () => __new('J', { mod: s => __melIn(s, 0, [0, 1, 2, 3]) }), () => $i('rt-lab').click()],
      ['arr', () => __new('J', { mod: s => __melIn(s, 0, [0, 1, 2, 3]) }), () => $i('rt-arr').click()],
      ['tex', () => __new('JG', { mod: s => { __melIn(s, 0, [0, 1, 2, 3]); __accIn(s, 1, [0, 1, 2, 3]); __accIn(s, 2, [0, 1, 2, 3]); s.measures[0].voxes[0][0].chord = 'C'; } }), () => $i('b-acctex').click()],
      ['rhy', () => __new('T'), () => openRhyLib()],
      ['diag', () => __new('T', { mod: s => { s.measures[0].tabs[0][0].chord = 'C'; } }), () => $i('b-diag').click()],
      ['board', () => __new('G'), () => $i('rt-board').click()],
      ['mea', () => __new('C'), () => $i('b-mealabel').click()],
      ['deg', () => __new('C', { mod: s => { s.measures[0].voxes[0][0].chord = 'C'; } }), () => $i('vf-names').click()],
      ['fing', () => __new('G', { mod: s => __melIn(s, 0, [0]) }), () => FLOW.pal.act('pal:sign', { dataset: { v: 'fingering' } }, null)],
    ];
    for (const [id, setup, ref] of CASES) {
      await EV(pg, `(${setup.toString()})()`); await raf(pg);
      const j0 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length, sel: JSON.stringify(sel) }));
      const has = await EV(pg, id => !!document.querySelector('#flw-sbar .flw-sb-tool[data-v="' + id + '"]'), id);
      await pg.click('#flw-sbar .flw-sb-tool[data-v="' + id + '"]').catch(() => {}); await wait(pg, 250);
      const a = await EV(pg, () => ({ sig: __sig(), j: JSON.stringify(song), u: undoStack.length, sel: JSON.stringify(sel), board: (() => { try { return !!BOARD.on; } catch (_) { return null; } })(), fn: !!song.funcNames, dm: (() => { try { return diagMode; } catch (_) { return null; } })(), fm: (() => { try { return !!fingMode; } catch (_) { return null; } })() }));
      await EV(pg, () => { __shut(); try { if (BOARD.on) $i('rt-board').click(); } catch (_) {} try { if (fingMode) $i('b-fing').click(); } catch (_) {} return 1; });
      /* 回到同一份谱的同一状态再走委托目标 */
      await EV(pg, j0 => { song = JSON.parse(j0.j); docs[curDocI].song = song; sel = JSON.parse(j0.sel); undoStack.length = j0.u; render(); return 1; }, j0);
      const j1 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length, dm: (() => { try { return diagMode; } catch (_) { return null; } })() }));
      await EV(pg, `(${ref.toString()})()`); await wait(pg, 250);
      const r = await EV(pg, () => ({ sig: __sig(), j: JSON.stringify(song), u: undoStack.length, sel: JSON.stringify(sel), board: (() => { try { return !!BOARD.on; } catch (_) { return null; } })(), fn: !!song.funcNames, dm: (() => { try { return diagMode; } catch (_) { return null; } })(), fm: (() => { try { return !!fingMode; } catch (_) { return null; } })() }));
      await EV(pg, () => { __shut(); try { if (BOARD.on) $i('rt-board').click(); } catch (_) {} try { if (fingMode) $i('b-fing').click(); } catch (_) {} return 1; });
      /* 键盘＝开关 BOARD；指法＝进入直录（fingMode，同 #b-fing）；级数 / 和弦图＝改谱一步撤销；其余＝弹窗 / 菜单 */
      const sameUI = J(a.sig) === J(r.sig) && (a.sig.modal || a.sig.pop || a.sig.lb || (id === 'board' && a.board) || (id === 'fing' && a.fm && r.fm) || id === 'deg' || id === 'diag');
      const sameData = id === 'deg' || id === 'diag' ? (a.j === r.j && a.u - j0.u === 1 && r.u - j1.u === 1) : (a.j === r.j);
      res.push({ id, has, ok: has && sameUI && sameData && a.sel === r.sel && a.board === r.board && a.fn === r.fn && a.fm === r.fm, a: a.sig, r: r.sig, du: [a.u - j0.u, r.u - j1.u], same: a.j === r.j, board: [a.board, r.board], fm: [a.fm, r.fm] });
    }
    T('SB5', res.every(x => x.ok), 'SB5a 工具委托同效（真实点击条上工具 vs 委托目标，同一份谱）：和弦 · 配和弦 · 配伴奏 · 织体 · 节奏型 · 和弦图 · 键盘 · 段落 · 级数 · 指法——弹窗 / 菜单签名、song、sel 逐字节相同；级数 / 和弦图各一步撤销',
      J(res.filter(x => !x.ok).length ? res.filter(x => !x.ok) : res.map(x => x.id + ':' + J(x.a))));
    /* 六线谱（由旋律生成）：简谱歌谱没有 gen 工具——在吉他弹唱「从简谱写起」② 的主按钮上比（同 lbGo('tabgen')） */
    await EV(pg, () => __new('JT', { meta: { pen: 'J' }, mod: s => __melIn(s, 0, [0, 1, 2, 3]) })); await raf(pg);
    await pg.click('#flw-sbar [data-fa="sbar:go"]').catch(() => {}); await wait(pg, 250);
    const g1 = await EV(pg, () => { const s = __sig(); __shut(); return s; });
    await EV(pg, () => showVoxTabMenu(lbMelVoices(song)[0])); await wait(pg, 250);
    const g2 = await EV(pg, () => { const s = __sig(); __shut(); return s; });
    /* 主按钮（钢琴伴奏歌谱 ②）与 #b-arrange 同一弹窗 */
    await EV(pg, () => __new('JG', { mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
    await pg.click('#flw-sbar [data-fa="sbar:go"]').catch(() => {}); await wait(pg, 250);
    const a1 = await EV(pg, () => { const s = __sig(); __shut(); return s; });
    await EV(pg, () => $i('b-arrange').click()); await wait(pg, 250);
    const a2 = await EV(pg, () => { const s = __sig(); __shut(); return s; });
    T('SB5', !!g1.modal && J(g1) === J(g2) && !!a1.modal && J(a1) === J(a2), 'SB5b 主按钮：「生成六线谱」＝showVoxTabMenu 同一弹窗；「一键配伴奏」＝#b-arrange 同一弹窗', J({ g1, g2, a1, a2 }));
    /* 填词：焦点 #i-lyric、activeTab＝lyr（1440 与 1180 窄档——先展开音轨面板） */
    const lyr = [];
    for (const [w, h] of [[1440, 900], [1180, 800]]) {
      await pg.setViewportSize({ width: w, height: h }); await wait(pg, 350);
      await EV(pg, () => { __new('J'); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); return 1; }); await raf(pg);
      await pg.click('#flw-sbar .flw-sb-tool[data-v="lyr"]').catch(() => {}); await wait(pg, 250);
      lyr.push(await EV(pg, w => ({ w, ae: (document.activeElement || {}).id, tab: activeTab, lfo: document.body.classList.contains('flw-lfo-trk'), narrow: document.body.classList.contains('flw-narrow') }), w));
      await pg.keyboard.press('Escape'); await wait(pg, 100); await EV(pg, () => { __shut(); try { setRibbon('vox'); } catch (_) {} try { FLOW.nar && FLOW.nar.close && FLOW.nar.close(); } catch (_) {} return 1; });
    }
    await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 350);
    T('SB5', lyr.every(x => x.ae === 'i-lyric' && x.tab === 'lyr') && lyr[1].narrow && lyr[1].lfo, 'SB5c 填词：焦点在 #i-lyric、activeTab＝lyr；1180 窄档先展开音轨面板（body.flw-lfo-trk）', J(lyr));
    /* 谱类 ▾：菜单在钮下方、与芯片打开的同一份、再点即关 */
    await EV(pg, () => __songbie3()); await raf(pg);
    await pg.click('#flw-sb-kind'); await wait(pg, 200);
    const k1 = await EV(pg, () => { const m = $i('lb-menu'), k = $i('flw-sb-kind'); if (!m) return null; const mr = m.getBoundingClientRect(), kr = k.getBoundingClientRect();
      return { gap: Math.round(mr.top - kr.bottom), dx: Math.round(mr.left - kr.left), html: m.innerHTML, exp: k.getAttribute('aria-expanded') }; });
    await pg.click('#flw-sb-kind'); await wait(pg, 200);
    const k2 = await EV(pg, () => ({ m: !!$i('lb-menu'), exp: $i('flw-sb-kind').getAttribute('aria-expanded') }));
    await pg.click('#flw-kchip'); await wait(pg, 200);
    const k3 = await EV(pg, () => { const m = $i('lb-menu'); const h = m ? m.innerHTML : null; lbMenuClose(); return h; });
    T('SB5', !!k1 && k1.gap >= 0 && k1.gap <= 12 && Math.abs(k1.dx) <= 12 && k1.exp === 'true' && !k2.m && k2.exp === 'false' && k3 === k1.html,
      'SB5d 谱类 ▾：#lb-menu 在钮正下方（间距 ' + (k1 && k1.gap) + '、左缘差 ' + (k1 && k1.dx) + '）、与芯片打开的 innerHTML 相同（同一 lbMenuOpen）、再点即关', J({ k1: k1 && { gap: k1.gap, dx: k1.dx, exp: k1.exp }, k2, same: k1 && k3 === k1.html }));
    /* 更多：1440 切到「智能」页；1280 浮出「智能」，再点收起 */
    await EV(pg, () => { __shut(); return 1; }); await pg.mouse.move(5, 5);
    const dg = await EV(pg, () => { const m = document.querySelector('#flw-sbar .flw-sb-more'); if (!m) return 'none'; const r = m.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { vis: __vis(m), r: [r.left, r.top, r.width, r.height], hit: e ? (e.id || e.className || e.tagName) : null, sb: $i('flw-sbar').dataset.sb, tier: FLOW.sbar.model().tier, modal: !!$i('modal-mask') }; });
    if (!dg || !dg.vis) NOTE('SB5', '   （「更多」点击前：' + J(dg) + '）');
    await pg.click('#flw-sbar .flw-sb-more', { timeout: 5000 }); await wait(pg, 200);
    const mo1 = await EV(pg, () => ({ page: FLOW.rd.page(), dock: document.body.classList.contains('flw-rd') }));
    await EV(pg, () => FLOW.rd.show('prop'));
    await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 400);
    await pg.click('#flw-sbar .flw-sb-more'); await wait(pg, 200);
    const mo2 = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro'), page: FLOW.rd.page() }));
    /* 浮出的右栏（z 30）盖住条的右段（SB12）——再按一次「更多」走键盘：焦点在「更多」上按 Enter */
    await EV(pg, () => { document.querySelector('#flw-sbar .flw-sb-more').focus(); return 1; }); await pg.keyboard.press('Enter'); await wait(pg, 200);
    const mo3 = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro') }));
    T('SB5', mo1.dock && mo1.page === 'smart' && mo2.ro && mo2.page === 'smart' && !mo3.ro, 'SB5e「更多」：1440（停靠）切到右栏「智能」页；1280（竖条）浮出「智能」，已浮出在「智能」时再按（键盘 Enter）收起', J({ mo1, mo2, mo3 }));
    await close(pg);
  }));

  /* ================= SB6 记谱法 ================= */
  if (want('SB6')) jobs.push(() => SAFE('SB6', 'SB6', async () => {
    const pg = await open(1280, 800, { tag: 'SB6' });
    const nm = () => EV(pg, () => ({ name: NWB.kindOfSong(song).name, k: NWB.stackOf(song), j: JSON.stringify(song), u: undoStack.length, seg: __bar().seg }));
    await EV(pg, () => __new('J', { mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
    const a0 = await nm();
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="S"]'); await raf(pg); const a1 = await nm();
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="D"]'); await raf(pg); const a2 = await nm();
    await pg.keyboard.press('Control+z'); await raf(pg); const a3 = await nm();
    await pg.keyboard.press('Control+z'); await raf(pg); const a4 = await nm();
    T('SB6', a0.name === '简谱歌谱' && a0.seg === 'J' && a1.name === '五线谱歌谱' && a1.seg === 'S' && a2.name === '教学对照谱' && a2.seg === 'D' && a1.u === a0.u + 1 && a2.u === a1.u + 1 && a3.j === a1.j && a4.j === a0.j,
      'SB6a 简谱歌谱：简谱 → 五线 → 对照，谱名 简谱歌谱 → 五线谱歌谱 → 教学对照谱，每次一步撤销；Ctrl+Z 两次逐字节回原', J([a0, a1, a2, a3, a4].map(x => [x.name, x.seg, x.u])));
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="S"]'); await raf(pg);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="J"]'); await raf(pg); const b1 = await nm();
    /* 与音轨树同语义：同一份谱用音轨树「只显示五线谱」（tree:only st）后每轨 isStaffNota / !!voxDual / stackOf 与悬浮条「五线」相同 */
    const tree = await EV(pg, () => { const s0 = JSON.stringify(song); FLOW.act('tree:only', { dataset: { k: 'vox', i: '0', v: 'st' } }, null);
      const t = { k: NWB.stackOf(song), st: song.voxVoices.map((_, i) => isStaffNota((song.voxNotations || [])[i])), du: song.voxVoices.map((_, i) => !!(song.voxDual || [])[i]) }; undo(); return { t, back: JSON.stringify(song) === s0 }; });
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="S"]'); await raf(pg);
    const bar = await EV(pg, () => ({ k: NWB.stackOf(song), st: song.voxVoices.map((_, i) => isStaffNota((song.voxNotations || [])[i])), du: song.voxVoices.map((_, i) => !!(song.voxDual || [])[i]) }));
    T('SB6', b1.j === a0.j && tree.back && J(tree.t) === J(bar), 'SB6b 简谱 → 五线 → 简谱 song 逐字节相同；「五线」与音轨树「只显示五线谱」同语义（每轨 isStaffNota · voxDual · stackOf）', J({ same: b1.j === a0.j, tree, bar }));
    /* 钢琴伴奏歌谱：钢琴两行逐字节不动；三声部合唱三轨一起变 */
    await EV(pg, () => __new('JG', { mod: s => { __melIn(s, 0, [0]); __accIn(s, 1, [0]); __accIn(s, 2, [0]); } })); await raf(pg);
    const PR = () => JSON.stringify([1, 2].map(i => [(song.voxNotations || [])[i] || null, !!(song.voxDual || [])[i], song.measures.map(m => m.voxes[i])]));
    const p0 = await EV(pg, `(${PR.toString()})()`);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="D"]'); await raf(pg);
    const p1 = await EV(pg, `({ rows: (${PR.toString()})(), k: NWB.stackOf(song), name: NWB.kindOfSong(song).name })`);
    await EV(pg, () => __new('S', { b: { nVox: 3 } })); await raf(pg);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="J"]'); await raf(pg);
    const ch = await EV(pg, () => ({ n: song.voxVoices.length, st: song.voxVoices.map((_, i) => isStaffNota((song.voxNotations || [])[i])), lab: document.querySelector('#flw-sbar .flw-sb-seg').getAttribute('aria-label') }));
    T('SB6', p0 === p1.rows && p1.k === 'SJG' && ch.n === 3 && ch.st.every(x => !x) && /全部旋律轨/.test(ch.lab),
      'SB6c 钢琴伴奏歌谱「对照」→ 教学对照谱（含伴奏），右手 / 左手两行谱号与音符不动；三声部合唱「简谱」三轨一起变（组读屏名「旋律记谱法（全部旋律轨）」）', J({ p1: [p1.k, p1.name], ch }));
    /* 低音谱号声部：五线 → 简谱 → 五线 仍是 bass（还原路径与音轨树谱号记忆路径各一次） */
    await EV(pg, () => __new('S', { b: { clef: 'bass' } })); await raf(pg);
    const c0 = await EV(pg, () => (song.voxNotations || [])[0]);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="J"]'); await raf(pg);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="S"]'); await raf(pg);
    const c1 = await EV(pg, () => (song.voxNotations || [])[0]);
    /* 简谱 → 对照：出发点是「五线」、要去「对照」——不走还原，按音轨树的谱号记忆（关五线谱层前记下的低音谱号）开 */
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="J"]'); await raf(pg);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="D"]'); await raf(pg);
    const c2 = await EV(pg, () => (song.voxNotations || [])[0] + (song.voxDual && song.voxDual[0] ? '+dual' : ''));
    T('SB6', c0 === 'bass' && c1 === 'bass' && c2 === 'bass+dual', 'SB6d 低音谱号声部：五线 → 简谱 → 五线 仍是低音谱号（来回切逐字节还原）；五线 → 简谱 → 对照 按音轨树的谱号记忆仍开低音谱号', J({ c0, c1, c2 }));
    /* 没有这一组：视唱练耳 / 小提琴 / 8 轨导入 */
    const none = [];
    await EV(pg, () => __qc('sight')); await raf(pg); none.push(['sight', await EV(pg, () => !!document.querySelector('#flw-sbar .flw-sb-seg'))]);
    await EV(pg, () => __new('S', { b: { instKey: 'violin' } })); await raf(pg); none.push(['violin', await EV(pg, () => ({ seg: !!document.querySelector('#flw-sbar .flw-sb-seg'), ik: song.instKey }))]);
    await EV(pg, () => { const s = createSong('vocal', { title: '八轨', nMea: 4, nVox: 1 }); s.voxVoices = Array.from({ length: 8 }, (_, i) => '声部' + (i + 1)); s.measures.forEach(m => { m.voxes = s.voxVoices.map(() => blankVoxCols(4, 4)); }); __one(s); return 1; }); await raf(pg);
    none.push(['8轨', await EV(pg, () => ({ seg: !!document.querySelector('#flw-sbar .flw-sb-seg'), n: song.voxVoices.length }))]);
    T('SB6', none[0][1] === false && none[1][1].seg === false && none[1][1].ik === 'violin' && none[2][1].seg === true && none[2][1].n === 8, 'SB6e 视唱练耳谱、小提琴谱（管弦身份固定五线谱）没有记谱法组；8 条旋律轨的谱有（收尾 ENG-1：与音轨区 ⋯「全部旋律轨改为…」同一判据，不再限 4 条）', J(none));
    /* 焦点在组内 ←→ 只移焦点、不改记谱法、不加撤销步 */
    await EV(pg, () => __new('J')); await raf(pg);
    await EV(pg, () => document.querySelector('#flw-sbar [data-fa="sbar:mel"][data-v="J"]').focus());
    const f0 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length }));
    await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowLeft'); await wait(pg, 100);
    const f1 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length, ae: (document.activeElement || {}).dataset ? document.activeElement.dataset.v : null }));
    T('SB6', f1.j === f0.j && f1.u === f0.u && f1.ae === 'S', 'SB6f 焦点在记谱法组：← → 只移焦点（落在「五线」）、不改记谱法、不加撤销步', J({ same: f1.j === f0.j, du: f1.u - f0.u, ae: f1.ae }));
    await close(pg);
  }));

  /* ================= SB7 收起 / 展开 + 本机键 ================= */
  if (want('SB7')) jobs.push(() => SAFE('SB7', 'SB7', async () => {
    const pg = await open(1280, 800, { tag: 'SB7' });
    await EV(pg, () => __new('JG', { nMea: 40, mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
    const geo = () => EV(pg, () => { const w = $i('flw-sbar'), bar = $i('flw-sb-bar'), tg = $i('flw-sb-tg');
      return { sb: w.dataset.sb, bh: Math.round(bar.getBoundingClientRect().height), wh: Math.round(w.getBoundingClientRect().height), py: Math.round($i('paper').getBoundingClientRect().top),
        key: localStorage.getItem('musetab-sbar'), exp: tg && tg.getAttribute('aria-expanded'), sum: tg ? tg.getAttribute('aria-label') : '', txt: tg ? tg.textContent : '' }; });
    const e0 = await geo();
    await pg.click('#flw-sb-tg'); await raf(pg);
    const c1 = await geo();
    await shot(pg, 'SB7-collapsed-1280', { x: 0, y: 0, width: 1280, height: 220 });
    await pg.reload(); await wait(pg, 900); await EV(pg, HELP); await EV(pg, () => __new('JG', { nMea: 8, mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
    const c2 = await geo();
    await pg.click('#flw-sb-tg'); await raf(pg);
    const e3 = await geo();
    T('SB7', e0.sb === 'exp' && e0.bh === 40 && e0.wh === 46 && e0.py === 138 && e0.key === null && c1.sb === 'col' && c1.bh === 28 && c1.wh === 34 && c1.py === 126 && c1.key === '0' && c1.exp === 'false'
      && /钢琴伴奏歌谱/.test(c1.sum) && /② 配和弦与伴奏/.test(c1.txt) && c2.sb === 'col' && c2.key === '0' && e3.sb === 'exp' && e3.key === null && e3.py === 138,
      'SB7a 点 ⌃ 收起：条高 28、外框 34、#paper 顶 126、musetab-sbar=\'0\'、摘要「钢琴伴奏歌谱 · ② 配和弦与伴奏」；刷新后仍收起；点展开：删键、#paper 顶回 138', J({ e0, c1, c2, e3 }));
    /* 吸住时切换：参考音的屏幕 y 不跳 */
    await EV(pg, () => __new('JG', { nMea: 40, mod: s => __melIn(s, 0, [...Array(40).keys()]) })); await raf(pg);
    const yAt = () => EV(pg, () => { const svg = $i('score'), k = svg.getBoundingClientRect().height / svg.viewBox.baseVal.height, bx = colBoxes['v0:12:0']; return Math.round((svg.getBoundingClientRect().top + bx.y * k) * 10) / 10; });
    await EV(pg, () => { $i('score-wrap').scrollTop = 600; }); await raf(pg);
    const y0 = await yAt();
    await pg.click('#flw-sb-tg'); await raf(pg); const y1 = await yAt();
    await pg.click('#flw-sb-tg'); await raf(pg); const y2 = await yAt();
    T('SB7', Math.abs(y1 - y0) <= 1 && Math.abs(y2 - y0) <= 1, 'SB7b scrollTop 600（条已吸住）时收起 / 展开：第 13 小节的屏幕 y 差 ≤1（' + y0 + ' → ' + y1 + ' → ' + y2 + '）', J({ y0, y1, y2 }));
    await close(pg);
    /* 本机存储写不进：setItem / removeItem 对 musetab-sbar 抛错——照样能切换（只在内存）、不报错、不写键 */
    const pg2 = await open(1280, 800, { tag: 'SB7-noset', init: () => { const si = Storage.prototype.setItem, ri = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'musetab-sbar') throw new Error('QuotaExceeded'); return si.call(this, k, v); };
      Storage.prototype.removeItem = function (k) { if (k === 'musetab-sbar') throw new Error('SecurityError'); return ri.call(this, k); }; } });
    await EV(pg2, () => __qc('pacc')); await raf(pg2);
    await pg2.click('#flw-sb-tg'); await raf(pg2);
    const n1 = await EV(pg2, () => ({ sb: $i('flw-sbar').dataset.sb, key: localStorage.getItem('musetab-sbar') }));
    await pg2.click('#flw-sb-tg'); await raf(pg2);
    const n2 = await EV(pg2, () => ({ sb: $i('flw-sbar').dataset.sb }));
    const pe = errs.filter(e => /SB7-noset/.test(e));
    T('SB7', n1.sb === 'col' && n1.key === null && n2.sb === 'exp' && !pe.length, 'SB7c 本机存储写不进（musetab-sbar 的 setItem / removeItem 抛错）：收起 / 展开照样切换（只记内存）、没有页面报错、没有写键', J({ n1, n2, pe }));
    await close(pg2);
    /* 整个存储被禁用（访问器抛错）：v68.3 集成起 D1 修复在同一版——编辑器必须启动（head 内存版存储），悬浮条默认展开、照样收起 / 展开（只在内存）、没有页面报错 */
    const pg3 = await open(1280, 800, { tag: 'SB7-nostore', help: false, init: () => { const d = () => { throw new DOMException('denied', 'SecurityError'); };
      try { Object.defineProperty(window, 'localStorage', { get: d, configurable: true }); Object.defineProperty(window, 'sessionStorage', { get: d, configurable: true }); } catch (_) {} } });
    const boot = await EV(pg3, () => ({ flow: typeof FLOW !== 'undefined' && !!FLOW.active, sbar: !!document.getElementById('flw-sbar'), mem: !!window.PYQ_LS_MEM }));
    let s3 = null, s4 = null, s5 = null;
    if (boot && boot.flow && boot.sbar) {
      await EV(pg3, HELP); await EV(pg3, () => __qc('pacc')); await raf(pg3);
      s3 = await EV(pg3, () => $i('flw-sbar').dataset.sb || 'exp');
      await pg3.click('#flw-sb-tg'); await raf(pg3);
      s4 = await EV(pg3, () => ({ sb: $i('flw-sbar').dataset.sb, h: Math.round($i('flw-sbar').getBoundingClientRect().height) }));
      await pg3.click('#flw-sb-tg'); await raf(pg3);
      s5 = await EV(pg3, () => ({ sb: $i('flw-sbar').dataset.sb || 'exp', h: Math.round($i('flw-sbar').getBoundingClientRect().height) }));
    }
    const pe3 = errs.filter(e => /SB7-nostore/.test(e));
    T('SB7', !!(boot && boot.flow && boot.sbar && boot.mem) && s3 === 'exp' && s4 && s4.sb === 'col' && s4.h === 34 && s5 && s5.sb === 'exp' && s5.h === 46 && !pe3.length,
      'SB7d 整个存储被禁用（访问器抛错）：编辑器启动（PYQ_LS_MEM 内存版）、悬浮条默认展开、点 ⌃ 收起（外框 34）再展开（46）只在内存、没有页面报错', J({ boot, s3, s4, s5, pe3 }));
    await close(pg3);
  }));

  /* ================= SB8 Alt+B 与键盘 ================= */
  if (want('SB8')) jobs.push(() => SAFE('SB8', 'SB8', async () => {
    const pg = await open(1280, 800, { tag: 'SB8' });
    await EV(pg, () => __new('JG', { mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
    const fo = () => EV(pg, () => { const a = document.activeElement; return { id: a && a.id, fa: a && a.dataset && a.dataset.fa, in: !!(a && a.closest && a.closest('#flw-sbar')), sb: $i('flw-sbar').dataset.sb, mode: FLOW.mode.cur }; });
    await pg.mouse.click(700, 500); await wait(pg, 100);
    await pg.keyboard.press('Alt+b'); await raf(pg); const a1 = await fo();
    await pg.keyboard.press('Alt+b'); await raf(pg); const a2 = await fo();
    await EV(pg, () => setMode('engrave')); await wait(pg, 400);
    await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await wait(pg, 100);
    await pg.keyboard.press('Alt+b'); await wait(pg, 400); await raf(pg); const a3 = await fo();
    /* #i-lyric 里不响应 */
    await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); FLOW.tree.lyrEdit(); return 1; }); await wait(pg, 150);
    const sb0 = await EV(pg, () => $i('flw-sbar').dataset.sb);
    await pg.keyboard.press('Alt+b'); await wait(pg, 150);
    const a4 = await fo(); a4.sb0 = sb0;
    await pg.keyboard.press('Escape'); await EV(pg, () => { try { document.activeElement.blur(); } catch (_) {} setRibbon('vox'); return 1; }); await wait(pg, 100);
    T('SB8', a1.sb === 'col' && a1.id === 'flw-sb-tg' && a2.sb === 'exp' && a2.fa === 'sbar:go' && a3.mode === 'write' && a3.sb === 'exp' && a3.in && a4.id === 'i-lyric' && a4.sb === a4.sb0,
      'SB8a Alt+B：展开 → 收起、焦点在展开钮；再按 → 展开、焦点在 ② 的主按钮；排版模式（收起着）→ 回书写、展开、焦点在条里；焦点在 #i-lyric 时不响应', J({ a1, a2, a3, a4 }));
    /* 一个 Tab 停点；←→ Home End 回绕、谱面光标不动；Esc 交还谱面 */
    await EV(pg, () => __new('J')); await raf(pg);
    const tab = await EV(pg, () => [...$i('flw-sb-bar').querySelectorAll('button')].filter(b => b.tabIndex === 0).length);
    const start = await EV(pg, () => { const t = document.querySelector('#flw-sbar button[tabindex="0"]'); t.focus(); return (t.dataset.fa || '') + ':' + (t.dataset.v || t.id || ''); });
    const s0 = await EV(pg, () => JSON.stringify(sel));
    const seq = [];
    for (const k of ['ArrowRight', 'ArrowRight', 'End', 'ArrowRight', 'Home', 'ArrowLeft']) { await pg.keyboard.press(k); await wait(pg, 40); seq.push(await EV(pg, () => { const a = document.activeElement; return (a.dataset.fa || '') + ':' + (a.dataset.v || a.id || ''); })); }
    const s1 = await EV(pg, () => JSON.stringify(sel));
    const order = await EV(pg, () => [...$i('flw-sb-bar').querySelectorAll('button')].filter(__vis).map(a => (a.dataset.fa || '') + ':' + (a.dataset.v || a.id || '')));
    await pg.keyboard.press('Escape'); await wait(pg, 80);
    const esc = await EV(pg, () => ({ in: !!document.activeElement.closest('#flw-sbar'), sb: $i('flw-sbar').dataset.sb }));
    const N = order.length, i0 = order.indexOf(start);
    T('SB8', tab === 1 && start === 'sbar:tool:lyr' && s0 === s1 && seq[0] === order[i0 + 1] && seq[1] === order[i0 + 2] && seq[2] === order[N - 1] && seq[3] === order[0] && seq[4] === order[0] && seq[5] === order[N - 1] && !esc.in && esc.sb === 'exp',
      'SB8b 条里只有一个 Tab 停点（简谱歌谱＝第一个工具「填词」）；→ → End →（回绕）Home ←（回绕）按可见按钮走、谱面光标 sel 不动；Esc 焦点离开条、展开状态不变', J({ tab, start, seq, order, same: s0 === s1, esc }));
    /* 鼠标点工具后焦点不留在条上（空格照常播放） */
    await pg.click('#flw-sbar .flw-sb-tool[data-v="chord"]'); await wait(pg, 200);
    await EV(pg, () => __shut()); await wait(pg, 80);
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="S"]'); await wait(pg, 150);
    const mb = await EV(pg, () => ({ in: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#flw-sbar')) }));
    await pg.keyboard.press('Space'); await wait(pg, 300);
    const pl = await EV(pg, () => { let p = false; try { p = !!(audio && audio.playing); } catch (_) {} try { stopPlay && stopPlay(); } catch (_) {} try { if (audio && audio.playing) togglePlay(); } catch (_) {} return p; });
    T('SB8', !mb.in && pl, 'SB8c 鼠标点条上的按钮后焦点交还谱面：随后按空格＝开始播放（不再重按那枚按钮）', J({ mb, pl }));
    await close(pg);
  }));

  /* ================= SB9 读屏 ================= */
  if (want('SB9')) jobs.push(() => SAFE('SB9', 'SB9', async () => {
    const pg = await open(1280, 800, { tag: 'SB9' });
    await EV(pg, () => __qc('pacc')); await raf(pg);
    const a = await EV(pg, () => { const bar = $i('flw-sb-bar'), tg = $i('flw-sb-tg');
      const nm = b => (b.getAttribute('aria-label') || b.textContent || '').trim();
      return { role: bar.getAttribute('role'), lab: bar.getAttribute('aria-label'), tg: tg.getAttribute('aria-expanded'), ctl: tg.getAttribute('aria-controls'), names: [...bar.querySelectorAll('button')].map(nm), cur: !!bar.querySelector('li[aria-current="step"]'),
        kind: $i('flw-sb-kind').getAttribute('aria-label'), seg: (bar.querySelector('.flw-sb-seg') || { getAttribute: () => null }).getAttribute('role') }; });
    const tiers = [];
    for (const fw of [420, 380]) { await EV(pg, fw => FLOW.sbar.fit({ w: fw }), fw); await raf(pg);
      tiers.push(await EV(pg, () => ({ tier: FLOW.sbar.model().tier, empty: [...$i('flw-sb-bar').querySelectorAll('button')].filter(__vis).filter(b => !(b.getAttribute('aria-label') || '').trim() && !(b.innerText || '').trim()).length }))); }
    await EV(pg, () => FLOW.sbar.fit({ w: 0 })); await raf(pg);
    await pg.click('#flw-sb-tg'); await raf(pg);
    const c = await EV(pg, () => ({ lab: $i('flw-sb-bar').getAttribute('aria-label'), tg: $i('flw-sb-tg').getAttribute('aria-expanded'), sum: $i('flw-sb-tg').getAttribute('aria-label') }));
    await pg.click('#flw-sb-tg'); await raf(pg);
    /* ① → ② 播报 */
    await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); });
    for (const k of '12') { await pg.keyboard.press(k); await wait(pg, 30); }
    await wait(pg, 200);
    const live = await EV(pg, () => ($i('lb-live') || {}).textContent || '');
    T('SB9', a.role === 'toolbar' && a.lab === '悬浮条：常用工具' && a.tg === 'true' && a.ctl === 'flw-sb-bar' && a.names.every(x => x.length > 0) && a.cur && /谱类：钢琴伴奏歌谱。换谱类/.test(a.kind) && a.seg === 'group'
      && tiers.every(t => !t.empty) && ['n3', 'n4', 'n5'].includes(tiers[0].tier) && c.lab === '悬浮条，已收起' && c.tg === 'false' && /展开悬浮条：钢琴伴奏歌谱/.test(c.sum) && /第 2 步：配和弦与伴奏，可点「一键配伴奏」/.test(live),
      'SB9 读屏：role=toolbar「悬浮条：常用工具」（收起「悬浮条，已收起」）；展开钮 aria-expanded 随状态、aria-controls；按钮读屏名都非空（n3 / n4 只剩图标也不丢）；当前步 aria-current=step；① → ② #lb-live 播报「第 2 步：配和弦与伴奏，可点「一键配伴奏」」',
      J({ a, tiers, c, live }));
    await close(pg);
  }));

  /* ================= SB10 去重 ================= */
  if (want('SB10')) for (const [w, h] of [[1180, 800], [1280, 800], [1440, 900]]) jobs.push(() => SAFE('SB10', 'SB10 ' + w, async () => {
    const pg = await open(w, h, { tag: 'SB10-' + w });
    await EV(pg, () => __qc('pacc')); await raf(pg); await wait(pg, 200);
    await EV(pg, () => FLOW.rd.show('prop'));
    const a = await EV(pg, () => {
      const eb = $i('editbar'), smart = $i('flw-rp-smart'), prop = $i('flw-rp-prop');
      const openers = [$i('flw-sb-kind'), $i('flw-kchip')].filter(__vis).map(x => x.id);
      return { start: !!$i('flw-start'), next: !!$i('flw-next'), i: !!document.querySelector('.flw-stp-i'), pop: !!document.querySelector('#popmenu.flw-stp-pop'), lbw: !!$i('lb-wrap'),
        eb: /起步/.test(eb.textContent + [...eb.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label') || '') + (e.getAttribute('title') || '')).join('')),
        smart: /下一步/.test(smart ? smart.textContent : ''), prop: /起步 · 换谱类/.test(prop ? prop.textContent : ''), openers, off: [...eb.querySelectorAll('.flw-off')].map(e => e.id || e.dataset.dur) }; });
    T('SB10', !a.start && !a.next && !a.i && !a.pop && !a.lbw && !a.eb && !a.smart && !a.prop && (w >= 1280 ? J(a.openers) === J(['flw-sb-kind', 'flw-kchip']) : J(a.openers) === J(['flw-sb-kind'])) && (w !== 1280 || !a.off.length),
      'SB10 ' + w + '：没有行 2 起步组 / 「下一步」卡 / ⓘ / 起步说明浮层 / #lb-wrap；行 2 无「起步」、「智能」页无「下一步」、属性页无「起步 · 换谱类」；打开换谱类菜单的可见入口' + (w >= 1280 ? '恰好 2 个（条上谱类 ▾、芯片）' : '恰好 1 个（条上谱类 ▾）') + (w === 1280 ? '；新建钢琴伴奏歌谱行 2 不收键' : ''), J(a));
    await close(pg);
  }));

  /* ================= SB11 模式与场景 ================= */
  if (want('SB11')) jobs.push(() => SAFE('SB11', 'SB11', async () => {
    const pg = await open(1280, 800, { tag: 'SB11' });
    await EV(pg, () => __songbie3()); await raf(pg);
    await EV(pg, () => { $i('score-wrap').scrollTop = 300; }); await raf(pg);
    const g = () => EV(pg, () => ({ vis: getComputedStyle($i('flw-sbar')).visibility, disp: getComputedStyle($i('flw-sbar')).display, st: $i('score-wrap').scrollTop, py: Math.round($i('paper').getBoundingClientRect().top), mode: FLOW.mode.cur }));
    const w0 = await g();
    const ms = [];
    for (const m of ['engrave', 'output', 'write']) { await pg.click('#flw-mode-' + m).catch(() => EV(pg, m => setMode(m), m)); await wait(pg, 500); ms.push(await g()); }
    T('SB11', w0.vis === 'visible' && ms[0].vis === 'hidden' && ms[1].vis === 'hidden' && ms[2].vis === 'visible' && ms[2].st === w0.st && ms[2].py === w0.py && ms[0].disp !== 'none',
      'SB11a 书写 → 排版 → 输出 → 书写：排版 / 输出时条 visibility:hidden（留占位），回书写 scrollTop 与 #paper y 不变', J({ w0, ms }));
    const sp = await EV(pg, () => { initStartPad(); const d = getComputedStyle($i('flw-sbar')).display, inert = $i('flw-sbar').inert; hideStartPad(); return { d, inert, after: $i('flw-sbar').inert }; });
    await EV(pg, () => { circlePubsSave([{ pid: 'tsb-v', title: '观看测试', author: '测试', type: 'vocal', price: 0, views: 0, data: JSON.parse(JSON.stringify(song)) }]); openPubViewer('tsb-v'); }); await wait(pg, 300);
    const vw = await EV(pg, () => ({ viewer: document.body.classList.contains('viewer'), vis: __vis('#flw-sbar') }));
    await EV(pg, () => exitViewer()); await wait(pg, 300);
    await EV(pg, () => { try { enterStand(); } catch (_) {} }); await wait(pg, 300);
    const stand = await EV(pg, () => ({ stand: document.body.classList.contains('stand'), vis: __vis('#flw-sbar') }));
    await EV(pg, () => { try { exitStand(); } catch (_) {} }); await wait(pg, 300);
    await pg.emulateMedia({ media: 'print' }); const pr = await EV(pg, () => getComputedStyle($i('flw-sbar')).display); await pg.emulateMedia({ media: 'screen' });
    const snap = await EV(pg, () => { const d = new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html'); return !!d.querySelector('#flw-sbar, [class*="flw-sb-"], [data-fa^="sbar:"]'); });
    const back = await EV(pg, () => __vis('#flw-sbar'));
    T('SB11', sp.d === 'none' && sp.inert === true && sp.after === false && vw.viewer && !vw.vis && stand.stand && !stand.vis && pr === 'none' && !snap && back,
      'SB11b 启动台 display:none（并 inert）· 观看页（openPubViewer）· 谱架 · 打印媒体都不出；互动谱快照 FLOW.snapHTML 不带；退出后回来', J({ sp, vw, stand, pr, snap, back }));
    await close(pg);
    const sm = [];
    for (const [w, h] of [[390, 844], [820, 900], [1180, 800]]) { const p2 = await open(w, h, { tag: 'SB11-' + w }); await EV(p2, () => __qc('pacc')); await raf(p2);
      sm.push(await EV(p2, w => ({ w, bar: __vis('#flw-sbar'), kind: __vis('#flw-sb-kind'), chip: __vis('#flw-kchip'), flow: flowOn() }), w)); await close(p2); }
    T('SB11', !sm[0].bar && !sm[1].bar && sm[2].bar && sm[2].kind && !sm[2].chip, 'SB11c 390 / 820 宽（手机 / 旧外壳兜底）看不到条；1180 宽芯片不可见、条上的谱类 ▾ 可见', J(sm));
  }));

  /* ================= SB12 层级 ================= */
  if (want('SB12')) jobs.push(() => SAFE('SB12', 'SB12', async () => {
    const pg = await open(1280, 800, { tag: 'SB12' });
    await EV(pg, () => __qc('pacc')); await raf(pg);
    await EV(pg, () => FLOW.rd.open('prop', null, false)); await wait(pg, 250);
    const r1 = await EV(pg, () => { const b = $i('flw-sb-bar').getBoundingClientRect(), e = document.elementFromPoint(b.right - 20, b.top + b.height / 2); return { hit: !!(e && e.closest('#right-dock')), ro: document.body.classList.contains('flw-ro') }; });
    await EV(pg, () => FLOW.rd.close(false));
    await pg.click('#flw-sb-kind'); await wait(pg, 200);
    const r3 = await EV(pg, () => { const m = $i('lb-menu').getBoundingClientRect(), b = $i('flw-sbar').getBoundingClientRect(); const y = Math.min(m.bottom - 2, Math.max(m.top + 2, b.bottom - 2)); const e = document.elementFromPoint(m.left + 20, m.top + 3); return { hit: !!(e && e.closest('#lb-menu')) }; });
    await EV(pg, () => lbMenuClose());
    await pg.setViewportSize({ width: 1180, height: 800 }); await wait(pg, 400);
    await EV(pg, () => FLOW.nar.open('trk', false)); await wait(pg, 250);
    /* 1180 浮出的音轨面板（#flw-trk 浮成 288 宽，从竖条头 40 之下开始）与条左段重叠的那一块：命中浮层（浮层在条上面） */
    const r2 = await EV(pg, () => { const b = $i('flw-sb-bar').getBoundingClientRect(), lf = $i('flw-trk').getBoundingClientRect();
      const x = Math.round((Math.max(b.left, lf.left) + Math.min(b.right, lf.right)) / 2), y = Math.round((Math.max(b.top, lf.top) + Math.min(b.bottom, lf.bottom)) / 2);
      const e = document.elementFromPoint(x, y); return { hit: !!(e && e.closest('#flw-left')), lfo: document.body.classList.contains('flw-lfo-trk'), over: lf.right > b.left && lf.top < b.bottom && lf.bottom > b.top, x, y }; });
    await close(pg);
    /* 导览：三步气泡不与条相交，第 3 步的圈仍是 #flw-left 与 #mixer-dock */
    const tp = await open(1280, 800, { tag: 'SB12-tour', url: withQ(URL0, 'tour=1'), init: () => { try { localStorage.removeItem('musetab-tour-shell'); } catch (_) {} } });
    await EV(tp, () => __qc('pacc')); await wait(tp, 2400);
    const steps = [];
    for (let i = 0; i < 3; i++) {
      const s = await EV(tp, () => { const t = $i('flw-tour'), sb = $i('flw-sbar'); if (!t) return null; const a = t.getBoundingClientRect(), b = sb.getBoundingClientRect();
        const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return { n: (t.textContent.match(/(\d) \/ 3/) || [])[1], hit, rings: [...document.querySelectorAll('.flw-tour-ring')].map(r => { const q = r.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; }) }; });
      steps.push(s);
      if (i < 2) { await tp.click('#flw-tour [data-tour="next"], #flw-tour .flw-tour-next').catch(() => EV(tp, () => { const b = [...document.querySelectorAll('#flw-tour button')].find(x => /下一步/.test(x.textContent)); if (b) b.click(); })); await wait(tp, 300); }
    }
    const want3 = await EV(tp, () => ['flw-left', 'mixer-dock'].map(id => { const q = $i(id).getBoundingClientRect(); return [Math.round(q.left - 3), Math.round(q.top - 3)]; }));
    await shot(tp, 'SB12-tour-step3-1280');
    await close(tp);
    const ringOk = steps[2] && steps[2].rings.length === 2 && want3.every((p, i) => Math.abs(Math.max(2, p[0]) - steps[2].rings[i][0]) <= 2 && Math.abs(Math.max(2, p[1]) - steps[2].rings[i][1]) <= 2);
    T('SB12', r1.ro && r1.hit && r3.hit && r2.lfo && r2.over && r2.hit && steps.every(s => s && !s.hit) && ringOk,
      'SB12 层级：1280 右栏浮出盖住条右段；#lb-menu 在条上面；1180 左栏音轨浮出盖住条左段；导览三步气泡都不与条相交，第 3 步圈仍是 #flw-left 与 #mixer-dock', J({ r1, r3, r2, steps, want3 }));
  }));

  /* ================= SB13 跟滚让位 ================= */
  if (want('SB13')) jobs.push(() => SAFE('SB13', 'SB13', async () => {
    const pg = await open(1280, 800, { tag: 'SB13' });
    await EV(pg, () => __new('JG', { nMea: 40, mod: s => { __melIn(s, 0, [...Array(40).keys()]); __accIn(s, 1, [...Array(40).keys()]); __accIn(s, 2, [...Array(40).keys()]); } })); await raf(pg);
    /* 光标在第 13 小节、该行顶恰好在条下面（被条盖住的位置）→ 方向键移动一格 → selFollow */
    const r = await EV(pg, async () => {
      const sw = $i('score-wrap'), svg = $i('score'), k = () => svg.getBoundingClientRect().height / svg.viewBox.baseVal.height;
      sel = { mi: 12, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); await __raf2();
      const bx = colBoxes['v0:12:0']; const y = svg.getBoundingClientRect().top + bx.y * k();
      sw.scrollTop += y - ($i('flw-sbar').getBoundingClientRect().top + 10); await __raf2();
      const sb = $i('flw-sbar').getBoundingClientRect().bottom;
      return { sb, lbsb: lbStickBottom(), st: sw.scrollTop }; });
    await pg.keyboard.press('ArrowRight'); await wait(pg, 300);
    const f = await EV(pg, () => { const svg = $i('score'), k = svg.getBoundingClientRect().height / svg.viewBox.baseVal.height, bx = colBoxes['v0:' + sel.mi + ':' + sel.ci];
      return { top: svg.getBoundingClientRect().top + bx.y * k, sb: $i('flw-sbar').getBoundingClientRect().bottom, mi: sel.mi, ci: sel.ci }; });
    /* 播放跟随 / 报错跳转（同 tv_landbar L14 的写法） */
    const h = await EV(pg, () => { const sc = scoreScroller(); const o = sc.scrollTo.bind(sc); sc.scrollTo = a => o(Object.assign({}, a, { behavior: 'instant' })); sc.scrollTop = 0;
      let hits = 0, worst = 0; for (let mi = 0; mi < 40; mi++) { highlight('v0', mi, 0, true); const ph = $i('playhead').getBoundingClientRect(), sb = $i('flw-sbar').getBoundingClientRect().bottom; const hid = Math.max(0, sb - ph.top); if (hid > 0.5) hits++; worst = Math.max(worst, hid); }
      sc.scrollTop = 0; const dd = $i('err-drop'); dd.classList.remove('hidden'); dd.insertAdjacentHTML('beforeend', '<div class="err" id="tsb-err" data-mi="32" data-row="vox" data-vi="0">第 33 小节</div>'); return { hits, worst: Math.round(worst) }; });
    await EV(pg, () => { $i('tsb-err').click(); return 1; }); await wait(pg, 250);   /* 报错清单的委托点击（同 tv_landbar L14；flow 下清单在状态栏上弹层里） */
    const ej = await EV(pg, () => { const svg = $i('score'), k = svg.getBoundingClientRect().height / svg.viewBox.baseVal.height, b = colBoxes['v0:32:0']; return { top: Math.round(svg.getBoundingClientRect().top + b.y * k), sb: Math.round($i('flw-sbar').getBoundingClientRect().bottom), mi: sel.mi }; });
    T('SB13', Math.abs(r.lbsb - r.sb) <= 0.5 && f.top >= f.sb + 8 - 0.5 && h.hits === 0 && ej.mi === 32 && ej.top >= ej.sb,
      'SB13 跟滚让位：吸住时 lbStickBottom()＝条外框底；光标在被条盖住的位置按 → 后跟滚，光标框顶 ≥ 条外框底 + 8；40 小节逐小节播放跟随（highlight）播放带都不在条下；报错跳转到第 33 小节，该小节顶在条之下', J({ r, f, h, ej }));
    await close(pg);
  }));

  /* ================= SB14 谱面与打印零变化 ================= */
  if (want('SB14')) jobs.push(() => SAFE('SB14', 'SB14', async () => {
    const RO = () => { const out = []; PRESETS.forEach((p, i) => { const s = migrate(p.make()); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
      try { renderOffscreen({ song: s, target: svg }); out.push(svg.outerHTML.length + ':' + svg.innerHTML.replace(/\s+/g, '').length + ':' + (svg.innerHTML.match(/<[a-z]+/g) || []).length); } catch (e) { out.push('ERR ' + e.message); } svg.remove(); }); return out; };
    const RO2 = () => { const out = []; PRESETS.forEach(p => { const s = migrate(p.make()); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
      try { renderOffscreen({ song: s, target: svg }); out.push(svg.innerHTML); } catch (e) { out.push('ERR ' + e.message); } svg.remove(); }); return out; };
    const pg = await open(1280, 800, { tag: 'SB14' });
    await EV(pg, () => __qc('pacc')); await raf(pg);
    const e1 = await EV(pg, `(${RO2.toString()})()`);
    await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg);
    const c1 = await EV(pg, `(${RO2.toString()})()`);
    /* #score：同一份谱展开 / 收起逐字节相同（16 份示例逐个打开） */
    const sc = await EV(pg, async () => { const out = []; for (let i = 0; i < PRESETS.length; i++) { __one(migrate(PRESETS[i].make())); FLOW.sbar.toggle({ exp: true }); await __raf2(); const a = $i('score').outerHTML;
      FLOW.sbar.toggle({ exp: false }); await __raf2(); const b2 = $i('score').outerHTML; out.push(a === b2 ? 1 : 0); } FLOW.sbar.toggle({ exp: true }); return out; });
    /* 打印分页（PRINT_PAGING 的同一套）：#print-pages 里没有条 */
    const pp = await EV(pg, () => { try { if (typeof buildPrintPages === 'function') buildPrintPages(); } catch (_) {} const p = $i('print-pages'); return { has: !!p, sb: p ? /flw-sb/.test(p.innerHTML) : false }; });
    await close(pg);
    const cl = await open(1280, 800, { tag: 'SB14-classic', url: CLASSICU });
    const k1 = await EV(cl, `(${RO2.toString()})()`);
    await close(cl);
    const same = Array.isArray(e1) && e1.length === 16 && e1.every((x, i) => x === c1[i] && x === k1[i] && !/^ERR/.test(x));
    T('SB14', same && sc.every(x => x === 1) && !pp.sb, 'SB14 谱面与打印零变化：16 份示例 renderOffscreen 在悬浮条展开 / 收起 / 旧外壳下逐字节相同；16 份示例 #score 展开 / 收起逐字节相同；打印分页不含条',
      J({ n: e1.length, diff: Array.isArray(e1) ? e1.map((x, i) => (x === c1[i] && x === k1[i]) ? 0 : 1) : e1, sc, pp }));
  }));

  /* ================= SB15 旧外壳零差异 ================= */
  if (want('SB15')) jobs.push(() => SAFE('SB15', 'SB15', async () => {
    const run = async url => { const pg = await open(1280, 800, { tag: 'SB15', url });
      await EV(pg, () => __qc('pacc')); await raf(pg);
      const a = await EV(pg, () => ({ sbar: !!document.querySelector('#flw-sbar, [class*="flw-sb-"]'), lb: !!document.querySelector('#lb-wrap .lb-bar'), html: (document.getElementById('lb-wrap') || {}).innerHTML || '',
        keys: Object.keys(localStorage).filter(k => k === 'musetab-sbar') }));
      await pg.mouse.click(700, 500); await wait(pg, 80);
      await pg.keyboard.press('Alt+b'); await wait(pg, 200);
      a.alt = await EV(pg, () => ({ ae: (document.activeElement || {}).className || '', lb: !!document.querySelector('#lb-wrap .lb-bar') }));
      a.keys2 = await EV(pg, () => Object.keys(localStorage).filter(k => k === 'musetab-sbar'));
      await close(pg); return a; };
    const cur = await run(CLASSICU);
    const base = BASEU ? await run(withQ(BASEU, 'shell=classic')) : null;
    if (!BASEU && IN_CI) T('SB15', false, 'SB15 CI 里拿不到旧外壳对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：lbHTML 零差异无法验证，判红');
    else if (!BASEU) NOTE('SB15', '⚠️  SB15 基线页不在（shellflow_ref.json 的提交 git show 失败、也没设 MUSETAB_BASE），lbHTML 只验不变量');
    T('SB15', !cur.sbar && cur.lb && /lb-kind/.test(cur.alt.ae) && !cur.keys.length && !cur.keys2.length && (!base || cur.html === base.html),
      'SB15 ?shell=classic：没有 #flw-sbar / .flw-sb-*；新建钢琴伴奏歌谱照旧出 #lb-wrap' + (base ? '（innerHTML 与基线 ' + (process.env.MUSETAB_BASE ? 'MUSETAB_BASE' : (REF.version || '') + ' ' + REF_COMMIT.slice(0, 7)) + ' 逐字节相同）' : '') + '；Alt+B 走 LBAR.show（焦点落谱名按钮）；不写 musetab-sbar', J({ cur: Object.assign({}, cur, { html: cur.html.length }), base: base && base.html.length }));
  }));

  /* ================= SB16 数据红线 ================= */
  if (want('SB16')) jobs.push(() => SAFE('SB16', 'SB16', async () => {
    const pg = await open(1280, 800, { tag: 'SB16' });
    await EV(pg, () => __qc('pacc')); await EV(pg, () => { mutate(() => __melIn(song, 0, [0, 1])); }); await raf(pg);
    const s0 = await EV(pg, () => ({ j: JSON.stringify(song), k: __keys(), keys: Object.keys(song).sort() }));
    /* 界面操作：切换、开关菜单、悬停、roving、更多、改窗口大小、切模式 */
    await pg.click('#flw-sb-tg'); await pg.click('#flw-sb-tg'); await wait(pg, 100);
    await pg.click('#flw-sb-kind'); await wait(pg, 150); await pg.keyboard.press('Escape'); await wait(pg, 100);
    await pg.hover('#flw-sbar .flw-sb-more'); await pg.hover('#flw-sbar [data-fa="sbar:go"]').catch(() => {});
    await EV(pg, () => document.querySelector('#flw-sbar button[tabindex="0"]').focus()); for (const k of ['ArrowRight', 'ArrowRight', 'Home', 'End']) await pg.keyboard.press(k); await pg.keyboard.press('Escape');
    await pg.click('#flw-sbar .flw-sb-more'); await wait(pg, 150); await EV(pg, () => { document.querySelector('#flw-sbar .flw-sb-more').click(); return 1; }); await wait(pg, 150);   /* 浮出的右栏盖住条右段：第二下程序化点 */
    await pg.setViewportSize({ width: 1440, height: 900 }); await wait(pg, 300); await pg.setViewportSize({ width: 1180, height: 800 }); await wait(pg, 300); await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 300);
    await EV(pg, () => { setMode('engrave'); setMode('output'); setMode('write'); }); await wait(pg, 400);
    await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await EV(pg, () => FLOW.sbar.toggle({ exp: true }));
    const s1 = await EV(pg, () => ({ j: JSON.stringify(song), k: __keys() }));
    await EV(pg, () => FLOW.sbar.toggle({ exp: false }));
    const s2 = await EV(pg, () => ({ k: __keys() }));
    await EV(pg, () => FLOW.sbar.toggle({ exp: true }));
    await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="D"]'); await raf(pg);
    const s3 = await EV(pg, () => Object.keys(song).sort());
    const extraK = s2.k.filter(k => !s0.k.includes(k)), extraF = s3.filter(k => !s0.keys.includes(k));
    T('SB16', s1.j === s0.j && J(s1.k) === J(s0.k) && J(extraK) === J(['musetab-sbar']) && extraF.every(k => ['voxNotations', 'voxDual'].includes(k)),
      'SB16 数据红线：只做界面操作（收起展开、开关菜单、悬停、roving、「更多」、改窗口大小、切模式）前后 song 逐字节相同、musetab-* 键不变；收起时键差集＝{musetab-sbar}；记谱法切换后 song 只多 voxNotations / voxDual', J({ same: s1.j === s0.j, k0: s0.k, k1: s1.k, extraK, extraF }));
    await close(pg);
  }));

  /* ================= SB17 性能与抖动 ================= */
  if (want('SB17')) jobs.push(() => SAFE('SB17', 'SB17', async () => {
    const pg = await open(1280, 800, { tag: 'SB17' });
    await EV(pg, () => __new('JG', { nMea: 200, mod: s => { __melIn(s, 0, [...Array(200).keys()]); __accIn(s, 1, [...Array(100).keys()]); __accIn(s, 2, [...Array(100).keys()]); } })); await raf(pg); await wait(pg, 500);
    const perf = await EV(pg, () => { const t = []; for (let i = 0; i < 25; i++) { const a = performance.now(); FLOW.sbar.sync(); t.push(performance.now() - a); } t.sort((a, b) => a - b); return { med: Math.round(t[12] * 100) / 100, max: Math.round(t[24] * 100) / 100 }; });
    const n0 = await EV(pg, () => RENDER_STAT.n); await wait(pg, 1500); const n1 = await EV(pg, () => RENDER_STAT.n);
    const rs = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) { const a = await EV(pg, () => RENDER_STAT.n); await pg.setViewportSize({ width: w, height: h }); await wait(pg, 600); rs.push(await EV(pg, () => RENDER_STAT.n) - a); }
    T('SB17', perf.med <= 2 && n1 - n0 <= 1 && rs.every(x => x <= 3), 'SB17 200 小节钢琴伴奏歌谱：FLOW.sbar.sync() 中位 ' + perf.med + 'ms（≤2）；静置 1.5 秒 render 增量 ' + (n1 - n0) + '（≤1）；1280 → 1440 → 1280 每步 render ' + rs.join(' / ') + '（≤3）', J({ perf, idle: n1 - n0, rs }));
    await close(pg);
  }));

  /* ================= SB18 命令面板 ================= */
  if (want('SB18')) jobs.push(() => SAFE('SB18', 'SB18', async () => {
    const pg = await open(1280, 800, { tag: 'SB18' });
    await EV(pg, () => __qc('pacc')); await raf(pg);
    const a = await EV(pg, () => { const f = q => ((FLOW.cmd.search(q).hits || [])[0] || {}).id; return { s1: f('悬浮条'), s2: f('qb'), s3: f('起步'), old: FLOW.cmd.list().some(c => c.id === 'r2:start'), sb: $i('flw-sbar').dataset.sb }; });
    await EV(pg, () => FLOW.cmd.run('sbar:toggle')); await raf(pg);
    const b2 = await EV(pg, () => ({ sb: $i('flw-sbar').dataset.sb, w: (FLOW.cmd.list().find(c => c.id === 'sbar:toggle') || {}).w }));
    await EV(pg, () => FLOW.cmd.run('sbar:toggle')); await raf(pg);
    const c = await EV(pg, () => $i('flw-sbar').dataset.sb);
    T('SB18', a.s1 === 'sbar:toggle' && a.s2 === 'sbar:toggle' && a.s3 === 'sbar:toggle' && !a.old && a.sb === 'exp' && b2.sb === 'col' && c === 'exp' && /Alt\+B/.test(b2.w || ''),
      'SB18 命令面板：搜「悬浮条」「qb」「起步」第一条都是 sbar:toggle（位置写「谱面上方 · Alt+B」），执行即切换；没有 r2:start', J({ a, b2, c }));
    await close(pg);
  }));

  /* ================= SB19 落地提示 · SB20 右栏不再被拉走 ================= */
  if (want('SB19') || want('SB20')) jobs.push(() => SAFE('SB19', 'SB19', async () => {
    const pg = await open(1440, 900, { tag: 'SB19' });
    const land = async () => {
      const out = {};
      await EV(pg, () => { __toasts.length = 0; __qc('pacc'); return 1; }); await raf(pg);
      out.pacc = await EV(pg, () => ({ t: __toasts.filter(x => /已新建/.test(x)).slice(-1)[0] || '', page: FLOW.rd.page() }));
      /* 示例做同款：新建面板「从已有音乐 → 示例」 */
      await EV(pg, () => { __toasts.length = 0; showNewWizard({ tab: 'import' }); return 1; }); await wait(pg, 300);
      await pg.click('#nf-isrc-ex').catch(() => {}); await wait(pg, 150); await pg.click('[data-ex="0"]').catch(() => {}); await wait(pg, 150); await pg.click('#nf-exgo').catch(() => {}); await wait(pg, 400);
      out.ex = await EV(pg, () => __toasts.filter(x => /格式新建/.test(x)).slice(-1)[0] || '');
      /* 导入「试一试」《送别》 */
      await EV(pg, () => { __toasts.length = 0; try { closeModal(); } catch (_) {} showNewWizard({ tab: 'import' }); return 1; }); await wait(pg, 300);
      await pg.click('#nf-isrc-ai').catch(() => {}); await wait(pg, 150); await pg.click('#nf-demo').catch(() => {}); await wait(pg, 1200);
      await pg.click('#nf-impgo').catch(() => {}); await wait(pg, 500);
      out.imp = await EV(pg, () => __toasts.filter(x => /已导入/.test(x)).slice(-1)[0] || '');
      await EV(pg, () => { try { closeModal(); } catch (_) {} return 1; });
      return out; };
    const e = await land();
    const rd = [];
    for (const sc of ['pacc', 'gtr', 'chord']) { await EV(pg, sc => __qc(sc), sc); await raf(pg); rd.push(await EV(pg, sc => sc + ':' + FLOW.rd.page(), sc)); }
    await EV(pg, () => FLOW.sbar.toggle({ exp: false }));
    const c = await land();
    await EV(pg, () => FLOW.sbar.toggle({ exp: true }));
    const BAD = /谱型条|起步|下一步见/;
    T('SB19', !!e.pacc.t && !!e.ex && !!e.imp && !BAD.test(e.pacc.t) && !BAD.test(e.ex) && !BAD.test(e.imp) && /谱面上方的悬浮条/.test(c.pacc.t) && /谱面上方的悬浮条/.test(c.ex) && /谱面上方的悬浮条/.test(c.imp) && !/谱型条/.test(c.pacc.t + c.ex + c.imp),
      'SB19 落地提示：悬浮条展开时，新建钢琴伴奏歌谱 / 示例做同款 / 导入《送别》的提示里没有「谱型条 / 起步 / 下一步见」；收起时三处都写「谱面上方的悬浮条」', J({ e, c }));
    T('SB20', rd.every(x => /:prop$/.test(x)) && e.pacc.page === 'prop', 'SB20 1440 停靠：新建钢琴伴奏歌谱 / 吉他弹唱 / 和弦谱落地后右栏停在「属性」页（不再被拉去「智能」）', J(rd));
    await close(pg);
  }));

  /* ================= SB21 命中区与对比度 · ui_cmd 埋点 ================= */
  if (want('SB21')) for (const sc of ['light', 'dark']) jobs.push(() => SAFE('SB21', 'SB21 ' + sc, async () => {
    const pg = await open(1280, 800, { scheme: sc, tag: 'SB21-' + sc });
    await EV(pg, () => __new('CG', { mod: s => { s.measures[0].voxes[0][0].chord = 'C'; } })); await raf(pg);
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const a = await EV(pg, () => { const bar = $i('flw-sb-bar'), bg = getComputedStyle(bar).backgroundColor;
      const pri = bar.querySelector('.flw-sb-tool.pri'), mb = Math.min(...[...bar.querySelectorAll('button')].filter(__vis).map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
      return { bg, pri: pri ? getComputedStyle(pri).color : null, priBg: pri ? getComputedStyle(pri).backgroundColor : null, mb }; });
    await EV(pg, () => __new('J')); await raf(pg);
    const hc = await EV(pg, () => { const h = $i('flw-sb-hint'); return h ? getComputedStyle(h).color : null; });
    await pg.click('#flw-sb-tg'); await raf(pg);
    const cm = await EV(pg, () => { const r = $i('flw-sb-tg').getBoundingClientRect(); return Math.min(r.width, r.height); });
    await pg.click('#flw-sb-tg'); await raf(pg);
    const cr = (x, y) => { const A = lum(x), B = lum(y); return Math.round((Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05) * 100) / 100; };
    /* 强调项的底（收尾 SBAR-10 起是半透明浅主色底）按 alpha 叠在条底上再算 */
    const over = (fg, bg) => { const f = fg.match(/[\d.]+/g).map(Number), g = bg.match(/[\d.]+/g).map(Number), al = f.length > 3 ? f[3] : 1; return 'rgb(' + [0, 1, 2].map(i => Math.round(f[i] * al + g[i] * (1 - al))).join(', ') + ')'; };
    const bgc = /rgba\(0, 0, 0, 0\)|transparent/.test(a.priBg || '') ? a.bg : over(a.priBg, a.bg);
    const r1 = hc ? cr(hc, a.bg) : 0, r2 = a.pri ? cr(a.pri, bgc) : 0;
    T('SB21', a.mb >= 28 && cm >= 28 && r1 >= 4.5 && r2 >= 4.5, 'SB21 ' + (sc === 'dark' ? '深' : '浅') + '色：条内可见按钮最小边 ' + a.mb + '（≥28）、收起钮 ' + cm + '；提示字对条底对比度 ' + r1 + '、强调的工具 ' + r2 + '（≥4.5）', J({ a, hc, cm, r1, r2 }));
    if (sc === 'light') {
      /* ui_cmd：悬浮条各按钮记 sbar:<项>（FLOW.track 前缀接入；file:// 下 API_ON 为假不发，这里替换 FLOW.track 记录调用） */
      await EV(pg, () => { window.__tr = []; const t0 = FLOW.track; FLOW.track = function (id) { __tr.push(id); return false; }; FLOW.track.norm = t0.norm; FLOW.track.stat = t0.stat; return 1; });
      await EV(pg, () => __new('JG', { mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
      await pg.click('#flw-sb-kind'); await wait(pg, 120); await pg.keyboard.press('Escape');
      await pg.click('#flw-sbar [data-fa="sbar:mel"][data-v="S"]'); await wait(pg, 120);
      await pg.click('#flw-sbar [data-fa="sbar:go"]'); await wait(pg, 200); await EV(pg, () => __shut());
      await pg.click('#flw-sbar .flw-sb-more'); await wait(pg, 150); await EV(pg, () => __shut());
      await pg.click('#flw-sb-tg'); await wait(pg, 120); await pg.click('#flw-sb-tg'); await wait(pg, 120);
      await EV(pg, () => __new('J')); await raf(pg);
      for (const id of ['lyr', 'chord', 'lab', 'arr']) { await pg.click('#flw-sbar .flw-sb-tool[data-v="' + id + '"]').catch(() => {}); await wait(pg, 150); await EV(pg, () => { __shut(); try { setRibbon('vox'); } catch (_) {} return 1; }); await pg.keyboard.press('Escape'); }
      const tr = await EV(pg, () => __tr.filter(x => /^sbar:/.test(x)));
      const need = ['sbar:kind', 'sbar:mel', 'sbar:go', 'sbar:more', 'sbar:col', 'sbar:exp', 'sbar:lyr', 'sbar:chord', 'sbar:lab', 'sbar:arr'];
      const norm = await EV(pg, need => need.map(x => FLOW.track.norm(x)), need);
      T('SB21', need.every(x => tr.includes(x)) && J(norm) === J(need), 'SB21b ui_cmd：悬浮条的谱类 ▾ / 记谱法 / 主按钮 / 更多 / 收起 / 展开 / 各工具分别记 sbar:kind · sbar:mel · sbar:go · sbar:more · sbar:col · sbar:exp · sbar:<工具 id>（合 FLOW.track 格式）', J({ tr, norm }));
    }
    await close(pg);
  }));

  /* ================= SB22 收尾（v68.3 验收 SBAR-1..11 · ENG-1 · ENG-5；修前页 MUSETAB_URL=prefix 红、修后绿） ================= */
  const noTour = pg => EV(pg, () => { const t = document.querySelector('#flw-tour'); if (t) t.remove(); return 1; });
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22a', async () => {
    const res = {};
    for (const [w, h] of [[1280, 800], [1440, 900]]) {
      const pg = await open(w, h, { tag: 'SB22a-' + w }); await noTour(pg);
      await EV(pg, () => { __one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return 1; }); await raf(pg);
      await pg.click('#flw-sbar .flw-sb-more'); await wait(pg, 300);
      const inBar = await EV(pg, () => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#flw-sbar')));
      await pg.keyboard.press('Space');
      const played = await EV(pg, async () => { for (let i = 0; i < 40; i++) { if (audio.playing) return true; await new Promise(r => setTimeout(r, 100)); } return false; });
      res[w] = { inBar, played, rd: await EV(pg, () => FLOW.rd.isOpen()) };
      await EV(pg, () => { try { stopPlay(); } catch (_) {} return 1; });
      await close(pg);
    }
    T('SB22', !res[1280].inBar && res[1280].played && !res[1440].inBar && res[1440].played,
      'SB22a（SBAR-1）鼠标点「更多」后焦点交还谱面：1280（右栏浮出）/ 1440（停靠）随后按空格都开始播放（此前焦点留在「更多」上，空格又点一次它）', J(res));
  }));
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22b', async () => {
    const pg = await open(1280, 800, { tag: 'SB22b' }); await noTour(pg);
    await EV(pg, () => __new('G')); await raf(pg);
    const st = v => EV(pg, v => { const b = document.querySelector('#flw-sbar .flw-sb-tool[data-v="' + v + '"]'); return b ? { p: b.getAttribute('aria-pressed'), bg: getComputedStyle(b).backgroundColor, board: !!BOARD.on, fing: !!fingMode } : null; }, v);
    const clickTool = async v => { await pg.click('#flw-sbar .flw-sb-tool[data-v="' + v + '"]'); await pg.mouse.move(700, 600); await wait(pg, 250); };
    await clickTool('board'); const b1 = await st('board');
    await clickTool('board'); const b2 = await st('board');
    await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); return 1; }); await raf(pg);
    await clickTool('fing'); const f1 = await st('fing');
    await clickTool('fing'); const f2 = await st('fing');
    T('SB22', b1 && b2 && b1.board && b1.p === 'true' && !b2.board && b2.p === 'false',
      'SB22b（SBAR-2）点「键盘」不做别的操作：开时 aria-pressed＝true、关时＝false（与 BOARD.on 一致；此前开时没按下、关后还亮着）', J({ b1, b2 }));
    T('SB22', f1 && f2 && f1.fing && f1.p === 'true' && !f2.fing && f2.p === 'false',
      'SB22c（SBAR-5）「指法」进入指法直录（数字键改写指法）时按钮显示按下态，再点退出后复原', J({ f1, f2 }));
    /* SBAR-6：钢琴独奏谱第 4 个工具＝「织体」，点开就是伴奏织体弹窗（同一功能一个名字） */
    await EV(pg, () => { try { closeBoard(); } catch (_) {} try { fingMode = false; } catch (_) {} __new('G'); return 1; }); await raf(pg);
    const tl = await EV(pg, () => ({ tools: [...document.querySelectorAll('#flw-sbar .flw-sb-tool')].map(b => b.dataset.v + ':' + b.textContent.trim()) }));
    await pg.click('#flw-sbar .flw-sb-tool[data-v="tex"]').catch(() => {}); await wait(pg, 300);
    const h3 = await EV(pg, () => (document.querySelector('#modal-mask .modal h3') || {}).textContent || null);
    await EV(pg, () => __shut());
    T('SB22', tl.tools.join(',') === 'board:键盘,fing:指法,chord:和弦,tex:织体' && /伴奏织体/.test(h3 || ''),
      'SB22d（SBAR-6）钢琴独奏谱的工具：键盘 · 指法 · 和弦 · 织体（此前第 4 个写「节奏型」、打开的却是伴奏织体弹窗）', J({ tl, h3 }));
    await close(pg);
  }));
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22e', async () => {
    const rows = [];
    for (const [w, h] of [[1180, 800], [1920, 1080]]) {
      const pg = await open(w, h, { tag: 'SB22e-' + w }); await noTour(pg);
      for (const [tag, k, o] of [['CG对照', 'CG', { mod: s => { s.voxDual = [true, true]; } }], ['SG无词', 'SG', { b: { lyr: 0 } }], ['G对照', 'G', { mod: s => { s.voxDual = [true, true]; } }]]) {
        await EV(pg, a => __new(a[0], a[1] === 'CG' || a[1] === 'G' ? { mod: s => { s.voxDual = [true, true]; } } : { b: { lyr: 0 } }), [k, k]); await raf(pg); await raf(pg);
        rows.push(Object.assign({ w, tag }, await EV(pg, () => { const kn = document.querySelector('#flw-sb-kind .flw-sb-kn'); return { name: kn.textContent, sw: kn.scrollWidth, cw: kn.clientWidth, tier: FLOW.sbar.model().tier }; })));
      }
      await close(pg);
    }
    T('SB22', rows.every(r => r.sw <= r.cw + 1 && r.tier === 'full') && rows.some(r => r.sw > 150),
      'SB22e（SBAR-3）1180 / 1920 全档：长谱名（钢琴弹唱谱对照 / 旋律＋钢琴伴奏谱 / 钢琴独奏谱对照）不被省略号截断（此前 200px 上限下 142 宽就截）', J(rows));
  }));
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22f', async () => {
    const pg = await open(1280, 800, { tag: 'SB22f' }); await noTour(pg);
    await EV(pg, () => __new('JG', { mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg);
    /* SBAR-11：起步 ② 时全档里做完的 / 没轮到的步骤也带步名 */
    const st2 = await EV(pg, () => ({ steps: [...document.querySelectorAll('#flw-sbar .flw-sb-steps li')].map(li => li.className + ':' + Math.round(li.querySelector('.flw-sb-t').getBoundingClientRect().width)), tier: FLOW.sbar.model().tier }));
    /* SBAR-10：主按钮（下一步）与按下的记谱法（已选）样式不同：浅主色底 + 末尾箭头 */
    const sty = await EV(pg, () => { const go = document.querySelector('#flw-sbar .flw-sb-go'), seg = document.querySelector('#flw-sbar .flw-sb-seg button[aria-pressed="true"]');
      const c = (e, p) => e ? getComputedStyle(e, p || null) : null;
      return { goBg: c(go).backgroundColor, goAfter: c(go, '::after').content, segBg: c(seg).backgroundColor, segAfter: c(seg, '::after').content }; });
    /* SBAR-7：点没轮到的步骤 / 提示看全文（触屏没有悬停 title） */
    await EV(pg, () => { __toasts.length = 0; return 1; });
    await pg.click('#flw-sbar .flw-sb-steps li.todo'); await wait(pg, 150);
    const tStep = await EV(pg, () => __toasts.slice());
    /* 进 ③（最后一步）：强调的「织体」前有步号；读屏「可点「X」」的 X 是条上的按钮名（SBAR-4） */
    await EV(pg, () => { mutate(() => { __accIn(song, 1, [...Array(8).keys()]); __accIn(song, 2, [...Array(8).keys()]); }); return 1; }); await raf(pg); await wait(pg, 150);
    const s3 = await EV(pg, () => { const p = document.querySelector('#flw-sbar .flw-sb-tool.pri'), live = ($i('lb-live') || {}).textContent || '';
      const q = (live.match(/「(.+?)」/) || [])[1] || '';
      const names = [...document.querySelectorAll('#flw-sbar button')].flatMap(b => [b.textContent.trim(), b.getAttribute('aria-label') || '']);
      return { live, q, found: !!q && names.includes(q), n: p && p.dataset.n, before: p && getComputedStyle(p, '::before').content, after: p && getComputedStyle(p, '::after').content, priBg: p && getComputedStyle(p).backgroundColor }; });
    await pg.click('#flw-sbar .flw-sb-tool.pri').catch(() => {}); await wait(pg, 250);
    await pg.click('#tex-go').catch(() => {}); await wait(pg, 350);
    const fin = await EV(pg, () => { const live = ($i('lb-live') || {}).textContent || '', q = (live.match(/「(.+?)」/) || [])[1] || '';
      return { live, q, found: !!q && [...document.querySelectorAll('#flw-sbar button')].some(b => b.textContent.trim() === q || b.getAttribute('aria-label') === q) }; });
    /* 821：放不下时没轮到的步骤只留编号（步名进 title） */
    await pg.setViewportSize({ width: 821, height: 760 }); await wait(pg, 300);
    await EV(pg, () => __new('JG', { mod: s => __melIn(s, 0, [0, 1]) })); await raf(pg); await raf(pg);
    const narrow = await EV(pg, () => ({ steps: [...document.querySelectorAll('#flw-sbar .flw-sb-steps li:not(.now) .flw-sb-t')].map(t => Math.round(t.getBoundingClientRect().width)), tier: FLOW.sbar.model().tier, ovf: $i('flw-sb-bar').scrollWidth - $i('flw-sb-bar').clientWidth }));
    await shot(pg, 'SB22f-821', { x: 0, y: 0, width: 821, height: 200 });
    T('SB22', st2.tier === 'full' && st2.steps.length === 3 && st2.steps.every(x => +x.split(':')[1] > 10),
      'SB22f（SBAR-11）1280 起步 ② 全档：做完的 / 当前 / 没轮到的三步都带步名（此前没轮到的只显示编号）', J(st2));
    T('SB22', narrow.steps.every(x => x <= 1) && narrow.ovf <= 1, 'SB22g（SBAR-11）821 放不下：没轮到 / 做完的步骤只留编号（步名进 title），不溢出', J(narrow));
    T('SB22', s3.n === '③' && s3.before === '"③"' && s3.after === '"→"' && s3.found && /「织体」/.test(s3.live),
      'SB22h（SBAR-11 / SBAR-4）进最后一步：强调的「织体」前画步号 ③、后画箭头；读屏「第 3 步：选织体，可点「织体」」——引号里的名字是条上真有的按钮（此前说「换织体」）', J(s3));
    T('SB22', fin.found && /都已完成/.test(fin.live), 'SB22i（SBAR-4）三步都完成后的播报「还可以点「织体」」同样是条上的按钮名', J(fin));
    T('SB22', sty.goBg !== sty.segBg && !/rgba\(0, 0, 0, 0\)/.test(sty.goBg) && sty.goAfter === '"→"' && /none|normal/.test(sty.segAfter),
      'SB22j（SBAR-10）「下一步」（主按钮：浅主色底 + 末尾 →）与「已选」（按下的记谱法：描边、无箭头）样式不同（此前都是主色描边 + 主色字）', J(sty));
    T('SB22', tStep.some(t => /^第 3 步：选织体/.test(t)), 'SB22k（SBAR-7）点没轮到的步骤 → 提示条给全文「第 3 步：选织体（未到）」（触屏平板没有悬停 title）', J(tStep));
    await close(pg);
  }));
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22l', async () => {
    const pg = await open(1280, 800, { tag: 'SB22l' }); await noTour(pg);
    /* SBAR-7：空谱提示点一下看全文 */
    await EV(pg, () => __new('J')); await raf(pg);
    await EV(pg, () => { __toasts.length = 0; return 1; });
    const hint = await EV(pg, () => { const h = $i('flw-sb-hint'); return h ? { t: h.textContent, title: h.title } : null; });
    if (hint) { await pg.click('#flw-sb-hint'); await wait(pg, 150); }
    const tHint = await EV(pg, () => __toasts.slice());
    T('SB22', !!hint && tHint.includes(hint.title) && hint.title.length > hint.t.length, 'SB22l（SBAR-7）点空谱提示 → 提示条给 title 全文', J({ hint, tHint }));
    /* SBAR-9：文件 ▾ 开着按 Alt+B——菜单先收起，焦点进条 */
    await pg.click('#flw-file'); await wait(pg, 250);
    const pop0 = await EV(pg, () => !!$i('popmenu'));
    await pg.keyboard.press('Alt+b'); await wait(pg, 250);
    const d = await EV(pg, () => ({ pop: !!$i('popmenu') && $i('popmenu').getClientRects().length > 0, aeInBar: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#flw-sbar')) }));
    await EV(pg, () => { if (!FLOW.sbar.expanded()) FLOW.sbar.toggle({ exp: true }); return 1; });
    T('SB22', pop0 && !d.pop && d.aeInBar, 'SB22m（SBAR-9）文件 ▾ 菜单开着按 Alt+B：菜单收起、焦点进悬浮条（此前菜单不关）', J({ pop0, d }));
    await close(pg);
  }));
  /* ENG-1：「全部旋律轨改记谱法」三入口（条上记谱法组 · 音轨区 ⋯ tree:mel · 命令面板 trk:allj / alls / alld）同一判据 */
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22n', async () => {
    const pg = await open(1440, 900, { tag: 'SB22n' }); await noTour(pg);
    const rows = [];
    const probe = async tag => {
      await raf(pg);
      const bar = await EV(pg, () => !!document.querySelector('#flw-sbar .flw-sb-seg'));
      await pg.click('#flw-trk [data-fa="tree:hdr"]').catch(() => {}); await wait(pg, 120);
      const menu = await EV(pg, () => { const it = [...document.querySelectorAll('#popmenu [data-fa="tree:mel"]')]; return { n: it.length, en: it.filter(x => x.getAttribute('aria-disabled') !== 'true').length, vs: it.map(x => x.dataset.v).join('') }; });
      await EV(pg, () => __shut());
      const pal = await EV(pg, () => ['trk:allj', 'trk:alls', 'trk:alld'].map(id => { const c = FLOW.cmd.list().find(x => x.id === id); if (!c) return 'none'; const r = c.ok ? c.ok() : ''; return r === '' || r === true ? 'ok' : 'no'; }).join(','));
      rows.push({ tag, bar, menu, pal });
    };
    for (const k of ['J', 'S', 'SJ', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'C']) { await EV(pg, k => __new(k), k); await probe('build:' + k); }
    await EV(pg, () => __qc('teach')); await probe('new:teach');
    await EV(pg, () => __qc('sight')); await probe('new:sight');
    await EV(pg, () => { const s = createSong('vocal', { title: '五声部', nMea: 2, nVox: 1 }); s.voxVoices = ['S1', 'S2', 'A', 'T', 'B']; s.measures.forEach(m => { m.voxes = s.voxVoices.map(() => blankVoxCols(4, 4)); }); __one(s); return 1; }); await probe('J×5');
    const bad = rows.filter(r => { const m = r.menu.en === 3 && r.menu.n === 3, mOff = r.menu.en === 0, p = r.pal === 'ok,ok,ok', pOff = r.pal === 'no,no,no';
      return !((r.bar && m && p) || (!r.bar && mOff && pOff)); });
    const by = t => rows.find(r => r.tag === t) || {};
    /* 音轨区 ⋯「全部旋律轨改为五线谱＋简谱对照」与条上「对照」同一写法：简谱歌谱 → 对照，谱名变教学对照谱，一步撤销 */
    await EV(pg, () => __new('J')); await raf(pg);
    await pg.click('#flw-trk [data-fa="tree:hdr"]').catch(() => {}); await wait(pg, 120);
    await pg.click('#popmenu [data-fa="tree:mel"][data-v="D"]').catch(() => {}); await wait(pg, 200);
    const dd = await EV(pg, () => ({ seg: FLOW.sbar.model().seg, vn: (song.voxNotations || [])[0], vd: !!(song.voxDual || [])[0], name: NWB.kindOfSong(song).name }));
    T('SB22', !bad.length && by('build:SJ').bar && by('new:teach').bar && by('J×5').bar && !by('build:G').bar && !by('new:sight').bar && dd.seg === 'D' && dd.vn === 'staff' && dd.vd && dd.name === '教学对照谱',
      'SB22n（ENG-1）14 种谱类 + 教学对照 / 视唱练耳用途 + 五声部合唱：条上有没有记谱法组 ＝ 音轨区 ⋯ 三项（简谱 / 五线谱 / 五线谱＋简谱对照）能不能用 ＝ 命令面板 trk:allj / alls / alld 能不能用（此前教学对照谱条上能切、⋯ 里禁用说「固定」；五声部合唱反过来）；⋯「对照」与条上「对照」同一写法',
      J({ bad, dd, rows: rows.map(r => r.tag + ':' + (r.bar ? 1 : 0) + '/' + r.menu.en + '/' + r.pal) }));
    await close(pg);
  }));
  /* SBAR-8（接受收纳、文档化）：1280 / 1366 钉住右栏（条宽约 748 / 834）——14 种谱类最多收到 n2、不溢出、「更多」「⌃」都在条上 */
  if (want('SB22')) jobs.push(() => SAFE('SB22', 'SB22o', async () => {
    const rows = [];
    for (const [w, h] of [[1280, 800], [1366, 900]]) {
      const pg = await open(w, h, { tag: 'SB22o-' + w, init: () => { try { localStorage.setItem('musetab-rdock', '1'); } catch (_) {} } }); await noTour(pg);
      for (const k of ['J', 'S', 'SJ', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'C']) {
        await EV(pg, k => __new(k), k); await raf(pg); await raf(pg);
        rows.push(Object.assign({ w, k }, await EV(pg, () => { const bar = $i('flw-sb-bar'); return { tier: FLOW.sbar.model().tier, bw: FLOW.sbar.model().w, ovf: bar.scrollWidth - bar.clientWidth, more: __vis('#flw-sbar .flw-sb-more'), tg: __vis('#flw-sb-tg') }; })));
      }
      await close(pg);
    }
    const lv = t => t === 'full' ? 0 : +t.slice(1);
    T('SB22', rows.every(r => lv(r.tier) <= 2 && r.ovf <= 1 && r.more && r.tg), 'SB22o（SBAR-8，接受收纳）1280 / 1366 钉住右栏：14 种谱类最多收到 n2（先收空谱提示、再收记谱法字）、不溢出、「更多」「⌃」都在',
      J(rows.map(r => r.w + ':' + r.k + ':' + r.tier + ':' + r.bw)));
  }));

  /* —— 跑 —— */
  const PAR = +(process.env.PAR || 2);
  let qi = 0;
  await Promise.all(Array.from({ length: PAR }, async () => { while (qi < jobs.length) { const j = jobs[qi++]; await j(); } }));
  T('SB0', !errs.length, '无页面脚本错误', errs.slice(0, 5).join(' | '));
  for (const k of ['SB1', 'SB2', 'SB3', 'SB4', 'SB5', 'SB6', 'SB7', 'SB8', 'SB9', 'SB10', 'SB11', 'SB12', 'SB13', 'SB14', 'SB15', 'SB16', 'SB17', 'SB18', 'SB19', 'SB20', 'SB21', 'SB22', 'SB0']) (OUT[k] || []).forEach(l => console.log(l));
  await b.close();
  console.log((pass === total ? 'PASS ' : 'FAIL ') + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
