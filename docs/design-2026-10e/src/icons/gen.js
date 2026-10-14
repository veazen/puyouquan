/* 谱友圈 · 新建流程最终图标集「记谱缩略 · 谱层语法」——唯一数据源与出图脚本
   底稿：nf/icons/src/lib.js 风格 1（评审 8.0–8.1 分），本文件只做三件事：
     ① 按评审 mustFix 修 16px 撞形（吉他/尤克里里、钢琴独奏/钢琴弹唱、合唱减笔）；
     ② 按「谱层语法」补新谱类（旋律＋钢琴伴奏 JG、五线谱和弦谱 CS、儿歌、视唱）与新界面动作；
     ③ 线宽改为 A 的「按显示尺寸固定物理线宽」：≤16px 1.25 / ≤22px 1.5 / ≤34px 1.75 / 更大 2.0（谱线 1.0/1.0/1.25/1.5）。
   谱层语法：同一谱层（简谱数字层 J、五线层 S、六线层 T、大谱表层 G、和弦名层 C、歌词层 L）在所有谱类图标里
   用同一组几何，谱类图标＝自上而下叠谱层，与新建面板中栏「预览」的叠法同构。
   用法：node gen.js  → final/icons/*.svg、final/icons/pq-icons.js、final/data/icons-manifest.json */
'use strict';
const fs = require('fs'), path = require('path');
const B = require('./lib-base');
const { D, digits } = B;
const OUT = path.join(__dirname, '..', '..', 'icons');
const DATA = path.join(__dirname, '..', '..', 'data');
const r = n => Math.round(n * 100) / 100;
const M = '{M}', F = '{F}';
const main = d => `<path d="${d}"/>`;
const fine = d => `<path d="${d}" stroke-width="${F}"/>`;
const dot = (cx, cy, rr) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="currentColor" stroke="none"/>`;
const ring = (cx, cy, rr) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" stroke-width="${F}"/>`;
const head = (cx, cy, rx = 2.15, ry = 1.55, rot = -22) => `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${r(cx)} ${r(cy)})" fill="currentColor" stroke="none"/>`;
const soft = s => `<g opacity=".5">${s}</g>`;
const blk = (x, y, w, h) => `<rect x="${r(x)}" y="${r(y)}" width="${w}" height="${h}" rx=".8" fill="currentColor" stroke="none"/>`;
const lines = (x1, x2, ys) => ys.map(y => `M${r(x1)} ${r(y)}H${r(x2)}`).join('');
const brace = (x, y1, y2) => { const m = (y1 + y2) / 2, q = (y2 - y1) / 4;
  return main(`M${r(x + 1.6)} ${r(y1)}C${r(x + .2)} ${r(y1 + .4)} ${r(x + .9)} ${r(y1 + q * 1.4)} ${r(x + .7)} ${r(m - q * .5)}C${r(x + .6)} ${r(m - .5)} ${r(x)} ${r(m)} ${r(x - .3)} ${r(m)}C${r(x)} ${r(m)} ${r(x + .6)} ${r(m + .5)} ${r(x + .7)} ${r(m + q * .5)}C${r(x + .9)} ${r(y2 - q * 1.4)} ${r(x + .2)} ${r(y2 - .4)} ${r(x + 1.6)} ${r(y2)}`); };
const star = (cx, cy, R, rr) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? rr : R; d += (i ? 'L' : 'M') + r(cx + q * Math.cos(a)) + ' ' + r(cy + q * Math.sin(a)); } return main(d + 'Z'); };

/* ───────── 24 网格谱层（与风格 1 现有谱类图标逐像素一致的那几层抽出来复用） ───────── */
const LAYER = {
  /* C 和弦名层：与 type-pianoacc 顶部「C」同一字形、同一位置 */
  C: main(D('C', 6.75, 1.5, 6)),
  /* G 大谱表层（下 2/3）：与 type-pianoacc 同一几何 */
  G: brace(3.1, 9.25, 21) + main('M5.75 9.25V21') + fine(lines(5.75, 21.25, [9.25, 11.75, 14.25, 16, 18.5, 21])),
  /* J 简谱层（上 1/3）：数字高 6，与 type-vocal 同笔画字形 */
  J: main(digits('56', 9.6, 1.5, 6, 2.4)),
  /* S 五线层（下 2/3）：五线间距 2.5 */
  S: fine(lines(2.75, 21.25, [10.5, 13, 15.5, 18, 20.5])),
};
const NEW24 = {
  /* 旋律＋钢琴伴奏（J＋G）：简谱层压在大谱表层上——与钢琴弹唱谱（C＋G）只差顶层，一眼可辨「有没有旋律」 */
  'type-jg': { n: '钢琴伴奏歌谱（旋律＋钢琴伴奏）', d: main(digits('56', 7.2, 1.5, 6, 2.6)) + dot(16.6, .9, .8) + LAYER.G + head(13.9, 17.25, 1.85, 1.35) + head(10.2, 19.75, 1.85, 1.35) + main('M15.7 16.75v-2.15M12 19.2v-2.6') },
  /* 五线谱和弦谱 Lead Sheet（C＋S） */
  'type-lead': { n: '五线谱和弦谱（Lead Sheet）', d: LAYER.C + main('M14.4 7.5l2-5.75M18.4 7.5l2-5.75') + LAYER.S + head(8.6, 18, 2.1, 1.5) + main('M10.65 17.4V11.2') + head(15.4, 15.5, 2.1, 1.5) + main('M17.45 14.9V8.9') },
  /* 儿歌弹唱（场景）：星形 + 简谱层，下接大谱表层（儿歌伴奏） */
  'type-kids': { n: '儿歌弹唱（场景）', d: star(6.4, 4.6, 3.9, 1.65) + main(D('1', 13.4, 1.5, 6) + D('5', 17.6, 1.5, 6)) + LAYER.G + head(13.9, 17.25, 1.85, 1.35) + head(10.2, 19.75, 1.85, 1.35) },
  /* 视唱练耳（场景）：音叉 + 声波（沿用方向 A 的音叉，按 1.75 主笔重描） */
  'type-sight': { n: '视唱练耳谱例（场景）', d: main('M7.5 2.75v7.4c0 2.1 1.6 3.5 3.6 3.5s3.6-1.4 3.6-3.5V2.75') + main('M11.1 13.65v7.6M8.6 21.25h5') + main('M18 6.1c1.05 1.05 1.05 3.15 0 4.2M20.5 4.4c2 2 2 5.6 0 7.6') },
  /* 自定谱行（场景外）：三条谱层叠放＋加号 */
  'type-custom': { n: '自选记谱法', d: fine(lines(2.75, 14.5, [4.5, 7])) + main(digits('35', 2.75, 10.25, 4.5, 2)) + fine(lines(2.75, 14.5, [17.5, 20])) + main('M18.5 9.5v7M15 13h7') },
};
/* 记谱法 / 谱行：补「和弦行」「对照」「织体」 */
const NOTA_NEW = {
  'nota-chord': { n: '和弦行（和弦名 / 级数）', d: main(D('C', 3, 3.5, 9)) + main('M11.6 13l2.6-7.25M16.6 13l2.6-7.25') + fine('M2.75 17.75h18.5') + soft(main('M2.75 21h11')) },
  'nota-dual': { n: '五线＋简谱对照', d: fine(lines(2.75, 21.25, [3, 5.5, 8, 10.5])) + head(8, 8, 2.1, 1.5) + main('M10.05 7.4V1.75') + head(16, 5.5, 2.1, 1.5) + main('M18.05 4.9V.9') + main(D('3', 5.75, 14.5, 6.75) + D('6', 13.75, 14.5, 6.75)) },
  'nota-texture': { n: '伴奏织体', d: head(5.6, 18, 1.9, 1.4, -20) + head(11.2, 14, 1.9, 1.4, -20) + head(16.8, 10, 1.9, 1.4, -20) + main('M7.4 17.4V4.4M13 13.4V4.4M18.6 9.4V4.4') + main('M7.4 4.4h11.2') + fine('M2.75 21h18.5') },
};
/* 来源：补 AI 转谱、音频、图片、粘贴；动作：补界面通用 */
const PG = main('M14.5 2.5H7.5A2 2 0 0 0 5.5 4.5v15a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6.5z') + main('M14.5 2.5v2.8a1.2 1.2 0 0 0 1.2 1.2h2.8');
const SPARK = (x, y, s) => main(`M${r(x)} ${r(y - s)}l${r(s * .32)} ${r(s * .68)} ${r(s * .68)} ${r(s * .32)}-${r(s * .68)} ${r(s * .32)}-${r(s * .32)} ${r(s * .68)}-${r(s * .32)}-${r(s * .68)}-${r(s * .68)}-${r(s * .32)} ${r(s * .68)}-${r(s * .32)}z`);
const SRC_NEW = {
  'src-ai': { n: 'AI 转谱结果（MusicXML）', d: main('M14.5 2.5H7.5A2 2 0 0 0 5.5 4.5v15a2 2 0 0 0 2 2h4.5') + main('M14.5 2.5v2.8a1.2 1.2 0 0 0 1.2 1.2h2.8M18.5 6.5v4') + fine('M8.25 9.5h7.5M8.25 12.25h4.5M8.25 15h3') + SPARK(17.25, 17.25, 4.4) },
  'src-audio': { n: '录音 / 音频（暂停中）', d: main('M3 10.5v3M6.25 8v8M9.5 5.5v13M12.75 8.5v7M16 10v4') + main('M18.75 6.25v11.5M21.25 9.5v5') },
  'src-image': { n: '图片识谱（规划中）', d: main('M4.75 5.25h14.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z') + fine(lines(5.5, 18.5, [9.25, 11.25, 13.25])) + main('M8.5 16.75l3.5-3 2.5 2 2-1.5 2 2.5') },
};
const ACT_NEW = {
  'act-chevron': { n: '展开 ▾', d: main('M6 9.5l6 6 6-6') },
  'act-close': { n: '关闭', d: main('M6.5 6.5l11 11M17.5 6.5l-11 11') },
  'act-check': { n: '已选', d: main('M4.75 12.5l4.5 4.5 10-10') },
  'act-swap': { n: '换谱类', d: main('M4 8.5h14.5M15 5l3.5 3.5L15 12') + main('M20 15.5H5.5M9 12l-3.5 3.5L9 19') },
  'act-undo': { n: '撤销', d: main('M8.5 5.5L4.75 9.25 8.5 13') + main('M4.75 9.25h9.5a5 5 0 0 1 0 10H9') },
  'act-settings': { n: '更多设置', d: main('M4 7h9.5M17.5 7H20M4 17h3M11 17h9') + `<circle cx="15.5" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>` },
  'act-link': { n: '链接 / 深链', d: main('M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1') + main('M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1') },
  'act-info': { n: '说明', d: `<circle cx="12" cy="12" r="8.75"/>` + main('M12 11v5.25') + dot(12, 7.9, 1.05) },
  'act-enter': { n: '回车创建', d: main('M19.25 5.5v6.25a2 2 0 0 1-2 2H5.5M9.25 9.75L5.5 13.75l3.75 4') },
  'act-back': { n: '返回', d: main('M14.5 5.5L8 12l6.5 6.5') },
  'act-step': { n: '下一步', d: main('M4.5 12h14M13.5 7l5 5-5 5') },
};
/* ───────── 16 网格微缩母版（≤16px 专用；按评审 mustFix 修撞形） ───────── */
const m16 = d => `<path d="${d}"/>`;
const f16 = d => `<path d="${d}" stroke-width="${F}"/>`;
const G16 = brace(1.2, 7.5, 14.5) + m16('M3.5 7.5v7') + f16(lines(3.5, 14.5, [7.5, 9.5, 12.5, 14.5]));   /* 大谱表层（下半）：两组各两线，组间 3px */
const T16 = {
  /* 吉他：横宽 6 弦格（10×6）＋歌词层；尤克里里：竖长 4 弦格（6×10），无歌词层——轮廓比例相反，1x 下也分得开 */
  guitar: f16('M2.5 3.5v6M4.5 3.5v6M6.5 3.5v6M8.5 3.5v6M10.5 3.5v6M12.5 3.5v6M2.5 6.5h10M2.5 9.5h10') + m16('M2.25 3.5h10.5') + dot(6.5, 5, .95) + dot(10.5, 8, .95) + soft(blk(2.25, 12, 2.6, 2.4) + blk(6.2, 12, 2.6, 2.4) + blk(10.15, 12, 2.6, 2.4)),
  uku: f16('M5.5 3.5v11M7.5 3.5v11M9.5 3.5v11M11.5 3.5v11M5.5 6.5h6M5.5 9.5h6M5.5 12.5h6') + m16('M5.25 3.5h6.5') + dot(5.5, 8, .95) + `<circle cx="7.5" cy="1.6" r=".75" stroke-width="${F}"/><circle cx="9.5" cy="1.6" r=".75" stroke-width="${F}"/><circle cx="11.5" cy="1.6" r=".75" stroke-width="${F}"/>`,
  /* 钢琴独奏：整高大谱表（两组各三线）；钢琴弹唱：顶部和弦名层 + 下半大谱表；钢琴伴奏歌谱：顶部简谱层 + 下半大谱表 */
  piano: brace(1.2, 2.5, 13.5) + m16('M3.5 2.5v11') + f16(lines(3.5, 14.5, [2.5, 4.5, 6.5, 9.5, 11.5, 13.5])) + head(9, 4.5, 1.5, 1.1) + head(11.5, 11.5, 1.5, 1.1),
  pianoacc: m16(D('C', 2.2, 1, 4.6)) + m16('M8.6 5.6l1.5-4.1M12 5.6l1.5-4.1') + G16,
  jg: m16(digits('56', 3.6, 1, 4.6, 2.2)) + dot(11.1, .55, .6) + G16,
  vocal: m16(digits('56', 2.6, 2.6, 6.2, 3.1)) + dot(12.6, 1.5, .8) + m16('M2.2 10.8h11.6') + soft(blk(2.4, 12.6, 2.6, 2.4) + blk(6.7, 12.6, 2.6, 2.4) + blk(11, 12.6, 2.6, 2.4)),
  /* 合唱：减笔——方括号 + 两行各两字 */
  choir: m16('M3.4 1.8C2.5 2 2 2.4 2 3.2v9.6c0 .8.5 1.2 1.4 1.4') + m16(digits('35', 5.4, 1.75, 5, 2.4) + digits('13', 5.4, 9.25, 5, 2.4)),
  teach: f16(lines(1.5, 14.5, [2.5, 4.5, 6.5])) + head(5.1, 5.5, 1.5, 1.1) + head(11.1, 3.5, 1.5, 1.1) + m16(D('3', 3.7, 9.3, 5) + D('6', 9.75, 9.3, 5)),
  instr: f16(lines(1.5, 14.5, [3.5, 6.5, 9.5, 12.5])) + head(6, 11, 1.75, 1.3) + m16('M7.6 10.5V3') + head(11.5, 8, 1.75, 1.3) + m16('M13.1 7.5V1.75'),
  lead: m16(D('C', 2.2, 1, 4.6)) + m16('M8.6 5.6l1.5-4.1M12 5.6l1.5-4.1') + f16(lines(1.5, 14.5, [8.5, 11, 13.5])) + head(5.5, 13.5, 1.5, 1.1) + m16('M6.9 13.1V9') + head(11, 11, 1.5, 1.1) + m16('M12.4 10.6V6.9'),
  solo: f16('M1.5 4.5h13M1.5 7.5H5M8.6 7.5h5.9M1.5 10.5h13M1.5 13.5h13') + m16(D('7', 5.3, 5.4, 4.2)) + m16('M8.4 6c1.6-.3 2.5-1.4 2.8-3.5M10.1 3.4l1.1-1.3 .95 1.45'),
  func: m16(D('I', 1.1, 1.6, 5) + D('V', 4.95, 1.6, 5) + D('V', 10.4, 1.6, 5)) + f16('M1.5 8.25h13') + m16(D('1', 2.9, 9.75, 4.75) + D('5', 10.6, 9.75, 4.75)),
  chord: m16('M1.75 2.5v4.75M8 2.5v4.75M14.25 2.5v4.75M1.75 8.75v4.75M8 8.75v4.75M14.25 8.75v4.75M3.7 6.3l1.3-2.85M10 6.3l1.3-2.85M3.7 12.55l1.3-2.85M10 12.55l1.3-2.85'),
  blank: f16('M2 4h12M2 7h12') + soft(f16('M2 10h5')) + m16('M11.75 9.25v5M9.25 11.75h5'),
};

/* ───────── 登记：组 → 键 → {grid, body, n, use, was} ───────── */
const REG = {};
const put = (key, grid, body, n, grp, extra) => { REG[key] = Object.assign({ grid, body, n, grp }, extra || {}); };
const USE = {
  type: '新建面板场景列表 24px · 页签 / 谱库筛选 16px（微缩母版）· 谱型条 20px',
  nota: '「自定谱行」开关 20px · 预览右侧行标 16px · 谱型条「旋律用」分段 16px',
  src: '「从已有音乐」页来源卡 24px · 启动台 28px',
  act: '顶栏 / 页签条 / 面板通用 16–20px',
  inst: '乐器下拉 20px（20px 以下必须配文字）· 左轨音轨钮 18px',
  clef: '视唱 / 器乐谱号分段 20px',
};
const WAS = {
  'type-vocal': '页签 note ♪ / 向导 mic 两套→一枚', 'type-func': '页签误用 piano', 'type-instr': '页签 violin（器乐全显示小提琴）', 'type-teach': '页签 book',
  'type-chord': '页签 chordgrid（6 种用途共用）', 'type-pianoacc': '页签 piano（与钢琴独奏同图）', 'act-new': '顶栏 pencil 铅笔', 'act-import': '启动台 loop 循环箭头',
  'act-add': '页签条「＋ 新窗口」文字', 'nota-jianpu': '<text> 字符简谱图标（依赖字体）', 'nota-tab6': '只有六道横线的 tab 图标', 'src-gp': '与「器乐谱」共用 guitar',
  'nota-texture': '「伴奏」柱状图 bars', 'act-chevron': '字符 ▾', 'act-close': '字符 ✕',
};
const TYPE_N = { guitar: '吉他弹唱谱', uku: '尤克里里谱', solo: '吉他独奏谱 · 指弹', piano: '钢琴独奏谱', pianoacc: '钢琴弹唱谱（纯伴奏）', vocal: '简谱歌谱', choir: '合唱谱', teach: '教学对照谱', instr: '五线谱旋律 · 器乐五线谱', func: '功能谱（简谱＋级数）', chord: '和弦谱（小节格）', blank: '空白谱' };
for (const [k, v] of Object.entries(B.T1)) if (k !== 'finger') put('type-' + k, 24, v.d, TYPE_N[k] || v.n, 'type', { was: WAS['type-' + k] });
for (const [k, v] of Object.entries(NEW24)) put(k, 24, v.d, v.n, 'type', { isNew: true });
for (const [k, d] of Object.entries(T16)) put('type16-' + k, 16, d, (TYPE_N[k] || (NEW24['type-' + k] || {}).n || k) + ' · 16 微缩', 'type16', { fixed16: ['guitar', 'uku', 'piano', 'pianoacc', 'choir'].includes(k), isNew: ['jg', 'lead'].includes(k) });
for (const [k, v] of Object.entries(B.NOTA)) put('nota-' + k, 24, v.d, v.n, 'nota', { was: WAS['nota-' + k] });
for (const [k, v] of Object.entries(NOTA_NEW)) put(k, 24, v.d, v.n, 'nota', { isNew: true, was: WAS[k] });
for (const [k, v] of Object.entries(B.CLEF)) put('clef-' + k, 24, v.d, v.n, 'clef');
for (const [k, v] of Object.entries(B.SRC)) put('src-' + k, 24, v.d, v.n, 'src', { was: WAS['src-' + k] });
for (const [k, v] of Object.entries(SRC_NEW)) put(k, 24, v.d, v.n, 'src', { isNew: true });
for (const [k, v] of Object.entries(B.TPL)) put('tpl-' + k, 24, v.d, v.n, 'tpl');
for (const [k, v] of Object.entries(B.ACT)) put('act-' + k, 24, v.d, v.n, 'act', { was: WAS['act-' + k] });
for (const [k, v] of Object.entries(ACT_NEW)) put(k, 24, v.d, v.n, 'act', { isNew: true, was: WAS[k] });
for (const [k, v] of Object.entries(B.INST)) put('inst-' + k, 24, v.d, v.n, 'inst');

/* 线宽分档（物理像素，A 方案）：返回 [主笔, 谱线] */
function tier(px) { return px <= 16 ? [1.25, 1] : px <= 22 ? [1.5, 1] : px <= 34 ? [1.75, 1.25] : [2, 1.5]; }
function svgOf(key, size, opt) {
  opt = opt || {};
  let k = key;
  if (size <= 16 && /^type-/.test(k) && REG['type16-' + k.slice(5)]) k = 'type16-' + k.slice(5);
  const it = REG[k]; if (!it) throw new Error('no icon ' + key);
  const [pm, pf] = tier(size), g = it.grid, s = g / size;   /* viewBox 单位 = 物理像素 × 网格 / 尺寸 */
  const b = it.body.split('{M}').join(r(pm * s)).split('{F}').join(r(pf * s));
  const dims = opt.master ? '' : ` width="${size}" height="${size}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg"${dims} viewBox="0 0 ${g} ${g}" fill="none" stroke="currentColor" stroke-width="${r(pm * s)}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
}
module.exports = { REG, svgOf, tier };

if (require.main === module) {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(DATA, { recursive: true });
  const man = [];
  for (const [key, it] of Object.entries(REG)) {
    const size = it.grid;   /* 母版按原生尺寸出：24 网格按 24px 档（1.75/1.25），16 网格按 16px 档（1.25/1.0） */
    fs.writeFileSync(path.join(OUT, key + '.svg'), svgOf(key, size).replace('<svg ', '<svg ') + '\n');
    man.push({ key, file: 'icons/' + key + '.svg', name: it.n, group: it.grp, grid: it.grid, isNew: !!it.isNew, fixed16: !!it.fixed16, replaces: it.was || '', use: USE[it.grp === 'type16' ? 'type' : it.grp] || '' });
  }
  /* 运行时：pqIcon(key,size) —— 尺寸分档线宽 + ≤16px 自动换微缩母版；落地时并入 SVGI（L20243）与 svgi()（L20332） */
  const bodies = {}; for (const [k, it] of Object.entries(REG)) bodies[k] = [it.grid, it.body];
  const rt = `/* 谱友圈图标运行时（最终方案）：pqIcon(key, size)。线宽按显示尺寸固定物理像素：≤16 1.25/1.0 · ≤22 1.5/1.0 · ≤34 1.75/1.25 · 更大 2.0/1.5；≤16px 谱类自动换 16 网格微缩母版 */
(function(){
var PQI=${JSON.stringify(bodies)};
function tier(px){ return px<=16?[1.25,1]:px<=22?[1.5,1]:px<=34?[1.75,1.25]:[2,1.5]; }
function rr(n){ return Math.round(n*100)/100; }
function pqIcon(key,size,cls){
  size=size||24; if(size<=16 && /^type-/.test(key) && PQI['type16-'+key.slice(5)]) key='type16-'+key.slice(5);
  var it=PQI[key]; if(!it) return '';
  var g=it[0], t=tier(size), s=g/size, m=rr(t[0]*s), f=rr(t[1]*s);
  return '<svg class="pqi'+(cls?' '+cls:'')+'" width="'+size+'" height="'+size+'" viewBox="0 0 '+g+' '+g+'" fill="none" stroke="currentColor" stroke-width="'+m+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+it[1].split('{M}').join(m).split('{F}').join(f)+'</svg>';
}
window.PQI=PQI; window.pqIcon=pqIcon;
})();
`;
  fs.writeFileSync(path.join(OUT, 'pq-icons.js'), rt);
  fs.writeFileSync(path.join(DATA, 'icons-manifest.json'), JSON.stringify(man, null, 1));
  const cnt = {}; man.forEach(m => cnt[m.group] = (cnt[m.group] || 0) + 1);
  console.log('icons', man.length, JSON.stringify(cnt), 'new', man.filter(m => m.isNew).length);
}
