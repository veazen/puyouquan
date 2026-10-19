'use strict';
// 一键回归 runner（本地 + CI 门禁共用）。逐个子进程跑套件，判失败标准：
//   子进程退出码 !=0  ||  输出含 ❌  ||  输出缺成功标记（PASS N / NO ERRORS）。
// 后两条兼容尚未补 process.exit 的老套件（v43.8 前 15 个套件断言失败仍 exit 0）。
// 用法：node run_all.js [套件名...]（缺省跑 CORE 集）。需 env CHROMIUM_PATH 指向可用 chromium。
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const CORE = [
  'tv_matrix', 'tv_presets', 'tv_safety', 'tv_head', 'tv_sign',
  'tv_mxl', 'tv_midi', 'tv_meter', 'tv_types', 'tv_trans',
  'tv_pub', 'tv_viewer', 'tv_publish', 'tv_site', 'tv_acct', 'tv_sync',
  'tv_acc', 'tv_arrange', 'tv_brace', 'tv_card', 'tv_combo', 'tv_qr', 'tv_mobile', 'tv_fav', 'tv_tabmxl', 'tv_member', 'tv_thumb',
  'tv_detail1', 'tv_audio',
  /* v60.26 门禁补全：以下 21 个套件长期存在于目录却不在 CORE（tv_dock 的 T1–T6 自 v55.2 起静默失效都没人知道）。
     全部修复后纳入——**新套件默认进 CORE**，除非注明原因。 */
  'tv_audit', 'tv_chord2', 'tv_chordlib', 'tv_circle', 'tv_dblacc', 'tv_dock', 'tv_engrave', 'tv_frame',
  'tv_gliss', 'tv_glyphsz', 'tv_gtech', 'tv_humming', 'tv_minelink', 'tv_mviews', 'tv_mxlfid', 'tv_ottava',
  'tv_piano', 'tv_staff', 'tv_tech', 'tv_tempo', 'tv_trem', 'tv_cursor', 'tv_rclick', 'tv_tuplet', 'tv_meaw', 'tv_d64', 'tv_fing', 'tv_grace', 'tv_bend', 'tv_adds', 'tv_capo', 'tv_clip', 'tv_dot', 'tv_lyr', 'tv_mixui', 'tv_gp', 'tv_mix', 'tv_emode', 'tv_xtone', 'tv_anno', 'tv_lpanel', 'tv_strumtie', 'tv_balance', 'tv_keytab', 'tv_prog', 'tv_eval', 'tv_holdout', 'tv_chordlab', 'tv_chordanchor', 'tv_playkey', 'tv_chordsys', 'tv_playperf', 'tv_metro', 'tv_newwiz', 'tv_tracks', 'tv_paneltools', 'tv_voxtab','tv_custompat','tv_edkey','tv_patfilter','tv_jpspace','tv_lyrvox','tv_tab2','tv_tabrest','tv_trkcapo','tv_board','tv_guide','tv_rhythm','tv_strum','tv_orn','tv_layout','tv_wxshare','tv_mplogin','tv_octbatch','tv_arpfix','tv_playline','tv_headart','tv_vwmob','tv_multidoc','tv_uipanel','tv_nowrap','tv_chordgp','tv_loading','tv_a0','tv_xss','tv_pubsnap','tv_print','tv_a4','tv_a8','tv_a3','tv_a5','tv_a5b','tv_a7','tv_b2a','tv_b1a','tv_b1b','tv_b5','tv_b5b','tv_b7a','tv_b7b','tv_b4a','tv_b4a2','tv_b4b','tv_b4e','tv_b8a','tv_b8b','tv_b8c','tv_b4c','tv_b4c2','tv_b2b','tv_b2c','tv_b3a','tv_b3a2','tv_b3a3','tv_b3a4','tv_b3b','tv_b6a','tv_mxlcov','tv_v66a', 'tv_v66d', 'tv_v66e', 'tv_lrspan', 'tv_header', 'tv_keydet', 'tv_tiemap', 'tv_jpsame', 'tv_textenc', 'tv_tabjpvi', 'tv_paste', 'tv_deskscale', 'tv_deskscale2', 'tv_wiztempo', 'tv_newpanel', 'tv_icons', 'tv_offscreen', 'tv_fillacc', 'tv_nfimport', 'tv_landbar', 'tv_deeplink', 'tv_kindsync',
  /* v67.7 新建谱与导入谱同一密度（FIXED_A4 1060→870、D7 门槛 FIT_DOCK 90%）＋收尾验收 D6–D8：单跑约 150 秒（D2 两个视口并行），在 300 秒上限内 */
  'tv_fixdensity',
  /* v67.8 默认外壳小改（偏好设置入口 / 页签 × 与未入库圈 / 智能死按钮 / 示例曲谱 / 关闭提示）：单跑约 35 秒 */
  'tv_v678',
  /* v67.9 新外壳 ?shell=flow（行 1 + 页签 · 行 2 单行 · 播放与状态栏 · 右栏 264 / 40）＋不带开关与 v67.8 零差异对拍：单跑约 115 秒（两路并行；v67.9 收尾补到 65 项） */
  'tv_shellflow',
  /* v68.0 新外壳左栏：音轨层级树（含混音）· Bravura 记号面板 · 谱型条拆入；不带开关的共享路径与 shellflow_ref.json 基线对拍：单跑约 80 秒（三路并行） */
  'tv_trktree',
  /* v68.1 新外壳三步「书写 › 排版 › 输出」· 右栏属性 / 文字 / 智能 · 行 2 换键 · 命令面板 · 切轨跟滚 · <1280 · 手机（M1–M18）＋ v68.0 遗留 TRK-16 / SH-3 / SH-4、三步口径、
     不带开关的共享路径与 shellflow_ref.json 基线对拍（M19–M23）＋数据红线汇总（RL）：单跑约 55 秒（三路并行） */
  'tv_modes',
  /* v68.2 新外壳切默认：默认 flow / ?shell=classic 与偏好设置「使用旧版布局」兜底 · 老用户迁移 · 首次 3 步导览 · 旧快捷键两外壳同效 · 旧入口去向 ·
     TRK-5 / TRK-6 / PN-5 旧外壳同口径修正 · 数据红线：单跑约 60 秒（三路并行） */
  'tv_flowdef',
  /* v68.2 匿名界面命令 ui_cmd（FLOW.track → pyqEvent；线上域名 route + apiCall 桩）：10 分钟去重 · 每会话 60 条 · API_ON 为假不发 · meta 只含命令 id · 后台「界面」行 · 隐私页：单跑约 20 秒 */
  'tv_uicmd',
  /* v68.2 文案轨（计划 §5.6）：编辑器帮助弹窗按新布局（新外壳 / 手机新外壳）· 旧外壳帮助与 shellflow_ref.json 基线逐字节对拍 · 官网 help.html 新布局 · 措辞闸防四步口径（H1–H10）：单跑约 25 秒 */
  'tv_helpflow',
  /* v68.3 谱面上方的悬浮条 #flw-sbar（负责人 2026-10-18：保留吸顶悬浮条、默认展开、可收起、放常用功能、少字）：几何 · 收纳 · 每谱类内容对拍规格 · 起步推进 · 委托同效 ·
     记谱法 · 收起 / 本机键 musetab-sbar · Alt+B 与键盘 · 读屏 · 去重 · 模式与场景 · 层级 · 跟滚让位 · 谱面零变化 · 旧外壳零差异 · 数据红线 · 性能 · 命令面板 · 落地提示（SB1–SB21）：单跑约 90 秒（两路并行） */
  'tv_sbar',
  /* v68.3 缺陷修复（PROJECT.md §9.0 P0 / P1，两外壳）：存储被禁用不白屏 · 打开文件认 MIDI / MusicXML / GP · 填词框整句按字分配 · MusicXML 往返轨名 · ?pub+?shell 不写键：单跑约 60 秒（两路并行） */
  'tv_fix683',
  /* v68.4 性能（§9.0 P2）：开机段 PA1–PA6（开机首画延后 · 离台一帧内就位 · 直达谱面 · 与旧外壳的相对计时 · 音色预解码 / 小节格宽度缓存 · 数据红线）；
     计时断言只比同一次运行里的旧外壳（首访 + 回访合计 ×1.15+80ms，各 7 次交替取中位），绝对数打印备查：单跑约 100 秒（串行，计时段不与别的页面并发） */
  'tv_perf',
  /* v68.4 性能（§9.0 P2-b，B 轨）：长谱每笔 / 排版模式每笔——#score 按谱行增量替换 · 单次渲染记忆 · 排版快照离文档 + 逐段序列化 + 预览页按段换 · 我的曲谱只读快照；
     P1–P5 / P7 与关缓存（window.__noRenderCache）逐字节对拍，P6 相对计时（开 ≤ 关×0.6 / ×0.8）。PERF=0 跳过 P6 */
  /* v68.4 收尾 PERF-5：tv_perf2 单跑约 9 分钟（P1 30 份谱 × 19 步缓存开 / 关两遍、P8 逐页几何、P6 计时段）——拆成三条（「名字:段」＝ env ONLY），每条约 2–4 分钟，
     慢机上不会整条被 900 秒上限打穿；断言不变 */
  'tv_perf2:P0,P1', 'tv_perf2:P2,P3,P4,P5,P7,P8,P9', 'tv_perf2:P6',
  /* v68.5「此处换页」（measures[].pgbrk）＋「页码设置」（song.layout.pgno）引擎段：缺省与 v68.4 逐字节零差异（基线 git show 71c9cce，或 env PGBRK_REF）· 分页几何 · 页码坐标与避让 ·
     成品（预览 / 打印 / PDF / PNG / 分享卡 / 缩图 / 观看页）· 缓存开关对拍 · MusicXML new-page 往返 · 行级规则（两外壳）：单跑约 3 分钟 */
  'tv_pgbrk',
  /* v68.5 同两项的界面段（新外壳工具组 / 右栏「本行」与「页头 · 页码」/ 版面检查 / 命令面板 / 书写谱面灰缝菜单 / 小节线菜单 · 旧外壳「排版」浮层页码一行 · ui_cmd · 数据红线）：
     U1–U14 + RL，引擎缺省要求在场（依赖分页结果的断言不跳过）；单跑约 2–3 分钟 */
  'tv_pgbrk_ui',
  /* v68.6「按演奏者出分谱」引擎段（规格 docs/spec-2026-10-parts.md §6.3）：PA1 分法（16 预设＋构造夹具）· PA2–PA12 派生 / 调与夹位 / 和弦重现 / 恒等对拍 / 页头 / 切片 / 记号 / 打印任务 / PNG / 隔离 / 性能 ·
     PAZ 缺省零差异（基线 tests/parts_ref.json＝v68.5 c923d00，或 env PARTS_REF） */
  'tv_parts',
  /* v68.6 同一项的界面段（规格 §6.3 PU1–PU15）：新外壳输出模式分谱列表 / 勾选 / 全选三态 / 切预览 / 生命周期 / 键盘 / 沿用总谱换行 / 打印对象 / PNG ·
     旧外壳弹窗「分谱」组与手机抽屉「分谱」行（单演奏者与 v68.5 基线逐字节相同）· 文案预算 · 埋点 · 数据红线；引擎缺省要求在场；单跑约 3 分钟 */
  'tv_parts_ui',
];
const suites = process.argv.slice(2).length ? process.argv.slice(2) : CORE;
/* v68.2 收尾 ENG-7：个别套件单独放宽超时（只防挂死，不放宽断言）。tv_newpanel 44 项（v68.2 迁移后新外壳 + 旧外壳两段：T4 / T16 / T19 / T22 / T28 / T37 各跑两遍）
   本机 4 核单跑 389–428 秒、CI 约 224 秒（a8c2089 实测 CI/本机 ≈ 0.58）——本机跑全量 run_all 时 300 秒必超时误红；给 600 秒，其余照旧 300 秒 */
const TIMEOUT = { tv_newpanel: 600000, tv_fixdensity: 450000, tv_deskscale2: 450000, tv_shellflow: 450000, tv_perf2: 900000, tv_pgbrk: 600000, tv_pgbrk_ui: 450000, tv_parts: 600000, tv_parts_ui: 450000 };   /* v68.6 tv_parts 本机单跑约 175 秒（PAZ：两套外壳 × 28 份谱 × 基线 / 被测两页 ＋ 手机；收尾加 PA4f 模糊测试与 PA13 两套外壳），留余量；tv_parts_ui 单跑约 80 秒（两页并行） */   /* v68.2：后三个两段（classic + flow）本机负载高时 220–270 秒，留余量防误红 */
/* v68.4：tv_perf2 本机单跑 512 秒（含 P6 计时段；PERF=0 时 391 秒）——收尾 PERF-5 拆成三段（见 CORE），每段 900 秒上限（本机前两段合计 601 秒、单段不超过约 6 分钟，留 2.5 倍以上；只防挂死） */

let fail = 0, ran = 0;
for (const s of suites) {
  /* v68.4 收尾 PERF-5：「套件名:段」＝只跑这几段（传 env ONLY 给套件，如 tv_perf2:P6） */
  const ci = s.indexOf(':'), nm = ci > 0 ? s.slice(0, ci) : s, only = ci > 0 ? s.slice(ci + 1) : '';
  const f = nm.endsWith('.js') ? nm : nm + '.js';
  if (!fs.existsSync(f)) { console.log('⚠️  跳过（不存在）: ' + s); continue; }
  ran++;
  let out = '', code = 0;
  /* v67.3 单套件超时 180→300 秒：tv_deskscale2 多视口真实点击单跑 107–143 秒，CI 负载下离 180 秒上限太近（超时只防挂死，不放宽断言） */
  try { out = execFileSync('node', [f], { encoding: 'utf8', env: only ? Object.assign({}, process.env, { ONLY: only }) : process.env, timeout: TIMEOUT[s] || TIMEOUT[f.replace(/\.js$/, '')] || 300000 }); }
  catch (e) { code = e.status == null ? 1 : e.status; out = (e.stdout || '') + (e.stderr || ''); }
  // 失败判定：子进程非零退出 || 输出含 ❌（各套件失败断言的统一标记）|| 无任何输出（崩溃）。
  // 不强制要求 PASS/NO ERRORS 标记——部分老套件仅逐行打 ✅（如 tv_brace）。
  const bad = code !== 0 || /❌/.test(out) || !out.trim();
  console.log((bad ? '❌ FAIL' : '✅ pass') + '  ' + s + (code ? '  exit=' + code : ''));
  if (bad) {
    fail++;
    out.split('\n').filter(l => /❌|Error|error:|throw/.test(l)).slice(0, 6).forEach(l => console.log('    ' + l));
  }
}
console.log('\n' + (fail ? ('❌ ' + fail + '/' + ran + ' 套件失败') : ('✅ 全部 ' + ran + ' 套件通过')));
process.exit(fail ? 1 : 0);
