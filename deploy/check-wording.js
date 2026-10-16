#!/usr/bin/env node
/* v63.3 A5 ⑥ 文案禁止词 lint（2026-10 评审团 §6.2「A5 禁止词 lint 词表」）。
   范围：编辑器 muse-tab/index.html + 官网 muse-tab/site/*.html|*.js 的**用户可见文字**——
   去掉 HTML 注释、JS 块注释与行注释，排除更新日志历史条目（<li><span class="v">…）。
   命中即退出码 1（发版流水线与 CI 语法闸同级拦截）。新增禁止词：只改下面 RULES。
   豁免：同一行写 wording-ok 并注明原因（仅限已下线、对用户不可见的入口）。 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RULES = [
  [/智能曲谱平台/, '对外定位已改口为「专业曲谱平台」（2026-08-31）'],
  [/人人都能做谱/, '旧口号'],
  [/不懂五线谱[，,、\s]*也能/, '与师范/考编等专业人群定位冲突的旧口号'],
  [/为吉他爱好者打造/, '旧定位'],
  [/九种场景|八场景|八大场景/, 'v60.41 起为三意图卡'],
  [/单窗口/, 'v60.99 起多开窗口'],
  [/C端/, '内部黑话'],
  [/11\s*套/, '织体共 22 套（4/4 15 套，2/4 3 套，3/4、6/8 各 2 套），须按拍号如实写'],
  [/哼唱成谱/, '入口已下线'],
  [/解锁专业功能/, '会员没有这项权益'],
  /* 「打开已有曲谱替换当前窗口」是现行行为（loadSong + guardReplace），只拦「新建 / 导入 / 生成…替换当前窗口」这类旧说法 */
  [/(新建|导入|生成|新曲谱|伴奏谱)[^。；]{0,12}替换当前窗口/, 'v60.99 起新建/导入/生成另开窗口'],
  [/「＋和弦」/, 'v60.28 已撤销该入口'],
  /* v67.8 编辑器顶栏按钮「预设」改名「示例曲谱」（方案 docs/design-2026-10f）：只拦指代该按钮的说法，「预设织体」「预设小节」等别的含义不拦 */
  [/顶栏[「“]预设[」”]|[「“]预设[」”]按钮|>预设<\/button>|预设 · 我的曲谱|[「“]我的[」”]里(选)?(的)?预设/, 'v67.8 起编辑器按钮叫「示例曲谱」'],
  /* v67.8 验收 F5：示例曲谱页头署名（PRESETS 的 maker 常量，打印 / 发布会带出去）不再印「…预设」 */
  [/maker:\s*['"][^'"]*预设/, 'v67.8 起「预设」改名「示例曲谱」，示例谱署名用「谱友圈」'],
  /* v67.8 验收 S-3：右栏预提示宿主 v56.6 已撤，四个本机偏好（落音自动前进等）的开关 v67.8 起在顶栏「偏好设置」 */
  [/预提示里一键(关闭|开启)/, 'v67.8 起在顶栏「偏好设置」里开关（右栏预提示 v56.6 已撤）'],
];
function visible(src, isJs) {
  let s = src.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  s = s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  /* 行注释：// 前须是行首或空白/分号/括号，且不是 URL 的 :// */
  s = s.replace(/(^|[\s;{}(),])\/\/(?!\/)[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  return s.split('\n').map(l => /<li><span class="v">v\d/.test(l) ? '' : l);
}
function files() {
  const out = [path.join(ROOT, 'muse-tab/index.html')];
  const sd = path.join(ROOT, 'muse-tab/site');
  fs.readdirSync(sd).filter(f => /\.(html|js)$/.test(f)).forEach(f => out.push(path.join(sd, f)));
  return out;
}
let hits = 0;
for (const f of files()) {
  const raw = fs.readFileSync(f, 'utf8'), rawL = raw.split('\n');
  const lines = visible(raw, /\.js$/.test(f));
  lines.forEach((l, i) => {
    if (/wording-ok/.test(rawL[i] || '')) return;   // 显式豁免：已下线、常隐的入口（行内须写明原因）
    for (const [re, why] of RULES) {
      const m = re.exec(l);
      if (m) { hits++; console.error(`❌ ${path.relative(ROOT, f)}:${i + 1} 「${m[0]}」——${why}\n     ${l.trim().slice(0, 140)}`); }
    }
  });
}
if (hits) { console.error(`❌ 文案禁止词命中 ${hits} 处`); process.exit(1); }
console.log('✅ 文案禁止词 lint：0 命中（编辑器 + 官网用户可见文字）');
