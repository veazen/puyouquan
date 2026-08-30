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
    if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(m[1] || '')) continue;   // v60.82 JSON-LD 数据块不是 JS，按 JS 解析必假红
    i++;
    try { new vm.Script(m[2], { filename: path + ' [inline#' + i + ']' }); }
    catch (e) { bad++; console.error('❌ ' + path + ' 内联脚本 #' + i + ' 语法错误：' + e.message); }
  }
  if (!i) { console.error('⚠️ ' + path + ' 未找到内联脚本'); bad++; }
  else if (!bad) console.log('✅ ' + path + '：' + i + ' 段内联脚本语法校验通过');
  /* v59.7 教训（v37.2 同款复发）：单文件里后声明的同名函数会静默覆盖前一个——
     v59.5 新增的摇把菜单 showBarMenu 覆盖了既有「小节线设置菜单」，右键小节线功能整块失灵，
     语法闸查不出、只有 CI 的 tv_rclick 拦下。闸：顶层 `function 名(` 重复即拦截发版。 */
  {
    const seen = new Map(), dups = [];
    const fnRe = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let fm;
    while ((fm = fnRe.exec(html))) {
      const name = fm[1];
      const line = html.slice(0, fm.index).split('\n').length;
      if (seen.has(name)) dups.push(name + '（行 ' + seen.get(name) + ' 与 ' + line + '）');
      else seen.set(name, line);
    }
    if (dups.length) { console.error('❌ ' + path + ' 顶层函数重名（后声明会静默覆盖前者）：' + dups.join('；')); bad++; }
    else console.log('✅ ' + path + '：顶层函数无重名（' + seen.size + ' 个）');
  }
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
