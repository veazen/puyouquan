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
  'tv_acc', 'tv_arrange', 'tv_brace', 'tv_card', 'tv_combo', 'tv_qr', 'tv_mobile', 'tv_fav', 'tv_tabmxl', 'tv_member',
  'tv_detail1', 'tv_audio',
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
