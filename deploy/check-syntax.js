#!/usr/bin/env node
/* 部署前语法闸：抽取单文件应用里所有内联 <script>（无 src）逐段解析。
   捕获「模板字符串反引号未转义 / 括号不配对」等会让整段脚本解析失败、
   编辑器白屏的语法错误——smoke.sh 只查页面字符串标记，抓不到这类问题（v43.6 教训）。
   用法：node deploy/check-syntax.js [muse-tab/index.html ...]，任一段出错即非零退出。 */
'use strict';
const fs = require('fs');
const vm = require('vm');

const files = process.argv.slice(2);
if (!files.length) files.push('muse-tab/index.html');

let totalBad = 0;
for (const path of files) {
  let html;
  try { html = fs.readFileSync(path, 'utf8'); }
  catch (e) { console.error('❌ 无法读取 ' + path + '：' + e.message); totalBad++; continue; }
  // 非贪婪匹配到第一个「真正的」</script>；文件内 JS 字符串里的 <\/script> 带反斜杠，不会误命中。
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0, bad = 0;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/.test(m[1] || '')) continue;   // 外链脚本无正文，跳过
    i++;
    try { new vm.Script(m[2], { filename: path + ' [inline#' + i + ']' }); }
    catch (e) { bad++; console.error('❌ ' + path + ' 内联脚本 #' + i + ' 语法错误：' + e.message); }
  }
  if (!i) { console.error('⚠️ ' + path + ' 未找到内联脚本'); bad++; }
  else if (!bad) console.log('✅ ' + path + '：' + i + ' 段内联脚本语法校验通过');
  /* v59.2 教训：APP_VER 忘随更新日志递增 → 线上版本角标停在旧版 + smoke 版本落位两边读同一常量成假绿。
     闸：APP_VER 必须等于更新日志首条 <span class="v">vX.Y</span>，不一致即拦截发版。 */
  const av = (html.match(/const APP_VER='([^']+)'/) || [])[1];
  const cl = (html.match(/<span class="v">(v[\d.]+)<\/span>/) || [])[1];
  if (av && cl) {
    if (av !== cl) { console.error('❌ ' + path + ' 版本不一致：APP_VER=' + av + '，更新日志首条=' + cl + '（发版须同步递增 APP_VER）'); bad++; }
    else console.log('✅ ' + path + '：版本一致（APP_VER=' + av + ' = 更新日志首条）');
  }
  totalBad += bad;
}
process.exit(totalBad ? 1 : 0);
