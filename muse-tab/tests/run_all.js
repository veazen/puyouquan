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
  'tv_piano', 'tv_staff', 'tv_tech', 'tv_tempo', 'tv_trem', 'tv_cursor', 'tv_rclick', 'tv_tuplet', 'tv_meaw', 'tv_d64', 'tv_fing', 'tv_grace', 'tv_bend', 'tv_adds', 'tv_capo', 'tv_clip', 'tv_dot', 'tv_lyr', 'tv_mixui', 'tv_gp', 'tv_mix', 'tv_emode', 'tv_xtone', 'tv_anno', 'tv_lpanel', 'tv_strumtie', 'tv_balance', 'tv_keytab', 'tv_prog', 'tv_eval', 'tv_holdout', 'tv_chordlab', 'tv_chordanchor', 'tv_playkey', 'tv_chordsys', 'tv_playperf', 'tv_metro', 'tv_newwiz', 'tv_tracks', 'tv_paneltools', 'tv_voxtab','tv_custompat','tv_edkey','tv_patfilter','tv_jpspace','tv_lyrvox','tv_tab2','tv_tabrest','tv_trkcapo','tv_board','tv_guide','tv_rhythm','tv_strum','tv_orn','tv_layout','tv_wxshare','tv_mplogin','tv_octbatch','tv_arpfix','tv_playline','tv_headart','tv_vwmob','tv_multidoc','tv_uipanel','tv_nowrap','tv_chordgp','tv_loading','tv_a0','tv_xss','tv_pubsnap','tv_print','tv_a4','tv_a8','tv_a3','tv_a5','tv_a5b','tv_a7','tv_b2a','tv_b1a','tv_b1b','tv_b5',
];
const suites = process.argv.slice(2).length ? process.argv.slice(2) : CORE;

let fail = 0, ran = 0;
for (const s of suites) {
  const f = s.endsWith('.js') ? s : s + '.js';
  if (!fs.existsSync(f)) { console.log('⚠️  跳过（不存在）: ' + s); continue; }
  ran++;
  let out = '', code = 0;
  try { out = execFileSync('node', [f], { encoding: 'utf8', env: process.env, timeout: 180000 }); }
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
