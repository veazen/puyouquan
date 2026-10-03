#!/usr/bin/env node
/* v65.6 B6a ⑥ 更新日志瘦身（评审团 S-30 允许做法之一：近 N 版内联 + 历史链接到官网日志页）
   用法：node deploy/changelog-archive.js [muse-tab/index.html] [--keep=40] [--dry]
   把编辑器内联更新日志里「第 keep 条之后」的 <li><span class="v">vX.Y</span>…</li> 整条搬到
   muse-tab/site/log-full.html（完整逐版日志，静态页，按版本倒序），并在内联列表末尾保留一条指向它的链接。
   幂等：搬过的不重复；内联条数 ≤ keep 时不动文件。语法闸只校验内联首条版本号，不受影响。 */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--')) || path.join(__dirname, '..', 'muse-tab', 'index.html');
const keep = +((args.find(a => a.startsWith('--keep=')) || '--keep=40').slice(7)) || 40;
const dry = args.includes('--dry');
const fullPath = path.join(path.dirname(file), 'site', 'log-full.html');
const LI_RE = /^ {4}<li><span class="v">(v[\d.]+)<\/span>.*<\/li>$/;
const LINK_MARK = 'log-full.html';

let html = fs.readFileSync(file, 'utf8');
const lines = html.split('\n');
const idx = [];
lines.forEach((ln, i) => { if (LI_RE.test(ln)) idx.push(i); });
if (idx.length <= keep) { console.log('内联更新日志 ' + idx.length + ' 条 ≤ ' + keep + '，无需归档'); process.exit(0); }
const moveIdx = idx.slice(keep);                       // 行号（旧的在后）
const moved = moveIdx.map(i => lines[i]);
const versions = moved.map(l => LI_RE.exec(l)[1]);

/* 完整日志页：已有则把新搬来的插到 <ul id="log-full"> 的开头（它们比页内已有条目新） */
let full = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
if (!full) {
  full = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>完整更新日志 · 谱友圈</title>
<meta name="description" content="谱友圈编辑器完整逐版更新日志（历史版本）。">
<link rel="canonical" href="https://www.puyouquan.com/log-full.html">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="pyq.css">
<style>
.logfull{max-width:860px;margin:0 auto;padding:24px 16px 60px}
.logfull ul{list-style:none;padding:0;margin:0}
.logfull li{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--line,#e6e2d8);font-size:14px;line-height:1.65}
.logfull li .v{flex:0 0 58px;font-weight:700;color:var(--accent-ink,#6b4a1a)}
.logfull code{font-size:12.5px;padding:0 4px;border-radius:4px;background:rgba(0,0,0,.05)}
</style>
</head>
<body>
<div id="site-nav"></div>
<main class="logfull">
  <h1>完整更新日志</h1>
  <p>编辑器内「更新日志」只保留最近的版本；更早的版本按倒序收在这里。<a href="log.html">重要版本摘录</a></p>
  <ul id="log-full">
  </ul>
</main>
<script src="pyq.js"></script>
</body>
</html>
`;
}
const have = new Set([...full.matchAll(/<li><span class="v">(v[\d.]+)<\/span>/g)].map(m => m[1]));
const fresh = moved.filter((l, i) => !have.has(versions[i]));
if (fresh.length) full = full.replace('<ul id="log-full">\n', '<ul id="log-full">\n' + fresh.join('\n') + '\n');

/* 内联：删掉搬走的行；在最后一条保留项之后放链接（幂等） */
const keepLast = idx[keep - 1];
const linkLine = `    <li><span class="v">更早</span><div>更早的 ${idx.length - keep + (have.size)} 个版本（${versions[versions.length - 1]} 起）已收进 <a href="https://www.puyouquan.com/log-full.html" target="_blank" rel="noopener">完整更新日志</a>。</div></li>`;
const out = [];
lines.forEach((ln, i) => {
  if (moveIdx.includes(i)) return;
  if (ln.includes(LINK_MARK) && LI_RE.test(ln.replace('更早', 'v0.0'))) return;   // 旧链接行，重写
  out.push(ln);
  if (i === keepLast) out.push(linkLine);
});
console.log('归档 ' + moved.length + ' 条（' + versions[0] + ' … ' + versions[versions.length - 1] + '）→ ' + path.relative(process.cwd(), fullPath) + '；内联保留 ' + keep + ' 条');
if (dry) process.exit(0);
fs.writeFileSync(fullPath, full);
fs.writeFileSync(file, out.join('\n'));
