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
    /* v65.6 B6a ⑤：也盖住 async function 与顶层 const/let/var 箭头函数常量——同一 <script> 内重复 const 本是语法错，
       但四段内联脚本各自解析，跨段同名常量要到运行时才炸（Identifier has already been declared），这里一并拦 */
    const fnRe = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)\n]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/gm;
    let fm;
    while ((fm = fnRe.exec(html))) {
      const name = fm[1] || fm[2];
      const line = html.slice(0, fm.index).split('\n').length;
      if (seen.has(name)) dups.push(name + '（行 ' + seen.get(name) + ' 与 ' + line + '）');
      else seen.set(name, line);
    }
    if (dups.length) { console.error('❌ ' + path + ' 顶层函数重名（后声明会静默覆盖前者）：' + dups.join('；')); bad++; }
    else console.log('✅ ' + path + '：顶层函数无重名（' + seen.size + ' 个）');
  }
  /* v63.5 B2a ①：简谱 1 的八度折叠规则（主音高于 F♯ 折回下一个八度）只许写在 keyRefOf 一处——
     此前散写在 8 处，改一处漏七处。别处出现「> 66」的折叠写法即拦截。 */
  {
    const hits = (html.match(/[A-Za-z_$][\w$]*\s*>\s*66\b/g) || []).length;
    if (/function keyRefOf\(/.test(html) && hits > 1) { console.error('❌ ' + path + ' 八度折叠规则（>66）散写了 ' + hits + ' 处，只许在 keyRefOf 里写一次——换调参考音一律调 keyRefOf(key)'); bad++; }
  }
  /* v67.6 统一谱名表：编辑器内联的 @pq-kindname 段必须与服务端 api/kindname.js 的同名段逐字节相同——
     单文件无构建只能两处各放一份，改了一处忘了另一处＝谱库卡片 / 落地页与编辑器、观看页的谱名分家（拍板 5 要的就是同名）。 */
  {
    const BEG = '/* @pq-kindname begin', END = '/* @pq-kindname end */';
    const cut = s => { const a = s.indexOf(BEG), b = s.indexOf(END); return a >= 0 && b > a ? s.slice(a, b + END.length) : null; };
    const mine = cut(html);
    if (mine != null) {
      const srvPath = require('path').resolve(__dirname, '..', 'api', 'kindname.js');
      let srv = null; try { srv = cut(fs.readFileSync(srvPath, 'utf8')); } catch (_) {}
      if (srv == null) { console.error('❌ ' + path + ' 内联了统一谱名表，但读不到服务端副本 api/kindname.js 的 @pq-kindname 段'); bad++; }
      else if (srv !== mine) { console.error('❌ ' + path + ' 统一谱名表 @pq-kindname 段与 api/kindname.js 不一致（两处必须逐字节相同）'); bad++; }
      else console.log('✅ ' + path + '：统一谱名表与 api/kindname.js 逐字节一致');
    }
  }
  /* v59.2 教训：APP_VER 忘随更新日志递增 → 线上版本角标停在旧版 + smoke 版本落位两边读同一常量成假绿。
     闸：APP_VER 必须等于更新日志首条 <span class="v">vX.Y</span>，不一致即拦截发版。 */
  const av = (html.match(/const APP_VER='([^']+)'/) || [])[1];   // 与 smoke.sh 线上版本落位同一写法，故不放宽
  const cl = (html.match(/<span class="v">(v[\d.]+)<\/span>/) || [])[1];
  /* v63.0：有更新日志却读不到 APP_VER（例如写成带空格的 const APP_VER = '…'）＝闸与 smoke 版本落位双双失效，
     同样拦截——此前会静默跳过 */
  if (cl && !av) { console.error('❌ ' + path + ' 有更新日志但未找到 APP_VER 常量（写法须为 const APP_VER=\'vX.Y\'）'); bad++; }
  if (av && cl) {
    if (av !== cl) { console.error('❌ ' + path + ' 版本不一致：APP_VER=' + av + '，更新日志首条=' + cl + '（发版须同步递增 APP_VER）'); bad++; }
    else console.log('✅ ' + path + '：版本一致（APP_VER=' + av + ' = 更新日志首条）');
  }
  totalBad += bad;
}
process.exit(totalBad ? 1 : 0);
