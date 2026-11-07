'use strict';
// v67.6 统一谱名表（api/kindname.js）单测：规则逐条、与编辑器内联段逐字节一致、乐器名与编辑器 NW_INSTS 一致、脏数据不抛错、
// server.js 的 typeLabelOf 读它（谱库卡片 / SSR 落地页同名）。零依赖：node api/kindname.test.js
// 浏览器侧「同一批 song 编辑器与服务端推出同名」见 muse-tab/tests/tv_kindsync.js。
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert');
const K = require('./kindname');
const ROOT = path.resolve(__dirname, '..');

let pass = 0, total = 0;
const T = (name, fn) => { total++; try { fn(); pass++; console.log('✅ ' + name); } catch (e) { console.log('❌ ' + name + ': ' + e.message); } };

/* 小工具：按行造谱。rows＝每行记谱法（undefined＝简谱），ly＝是否填词 */
const mea = (n, ly) => [{ tabs: [], voxes: Array.from({ length: n }, () => [{ dur: 4, deg: 1, oct: 0, acc: '', lyrics: ly ? ['啊'] : [] }]) }];
const vox = (names, nota, o, ly) => Object.assign({ v: 3, title: 't', tabVoices: [], voxVoices: names, voxNotations: nota, lyricLines: ly ? 1 : 0, measures: mea(names.length, ly) }, o || {});
const BR = (a, b) => ({ type: 'bracket', from: a, to: b }), BC = (a, b) => ({ type: 'brace', from: a, to: b });

/* [说明, 谱 JSON, 期望谱行, 期望谱名]——与编辑器新建面板 14 种谱行组合、谱型条换谱类、导入「做成哪种谱」的产物结构一致 */
const CASES = [
  ['J 简谱歌谱', vox(['旋律'], [undefined], null, true), 'J', '简谱歌谱'],
  ['J 未填词也叫简谱歌谱', vox(['旋律'], [undefined]), 'J', '简谱歌谱'],
  ['J 二声部合唱（显式方括号）', vox(['女高', '女低'], [undefined, undefined], { voxGroups: [BR(0, 1)] }, true), 'J', '简谱合唱谱'],
  /* 分类升级 P0（拍板 22 / 26，判法表 15a–15c）：简谱多行也看词与乐器——此前一律「简谱合唱谱」 */
  ['J 二声部留了词位还没填词＝简谱合唱谱', vox(['女高', '女低'], [undefined, undefined], { voxGroups: [BR(0, 1)], lyricLines: 1 }), 'J', '简谱合唱谱'],
  ['J 二声部无词、带乐器身份（古筝左右手）＝古筝谱（简谱）', vox(['右手', '左手'], [undefined, undefined], { instKey: 'guzheng' }), 'J', '古筝谱（简谱）'],
  ['J 二声部无词无乐器＝简谱重奏谱', vox(['一', '二'], [undefined, undefined], { voxGroups: [BR(0, 1)] }), 'J', '简谱重奏谱'],
  ['J 二声部有词又带乐器身份＝简谱合唱谱（有词先算合唱）', vox(['一', '二'], [undefined, undefined], { instKey: 'erhu' }, true), 'J', '简谱合唱谱'],
  ['J 二胡（instKey）', vox(['旋律'], [undefined], { instKey: 'erhu' }), 'J', '二胡谱（简谱）'],
  ['J instKey=piano 不算乐器谱', vox(['旋律'], [undefined], { instKey: 'piano' }, true), 'J', '简谱歌谱'],
  ['S 无词单行＝五线谱旋律（v67.6 前谱库叫器乐五线谱）', vox(['旋律'], ['staff']), 'S', '五线谱旋律'],
  ['S 留了歌词行＝五线谱歌谱', Object.assign(vox(['旋律'], ['staff']), { lyricLines: 1 }), 'S', '五线谱歌谱'],
  ['S lyricLines=0 但谱里有词＝五线谱歌谱', Object.assign(vox(['旋律'], ['staff'], null, true), { lyricLines: 0 }), 'S', '五线谱歌谱'],
  ['S 小提琴', vox(['小提琴'], ['staff'], { instKey: 'violin' }), 'S', '小提琴谱（五线谱）'],
  ['S 其他器乐', vox(['旋律'], ['alto'], { instKey: 'other' }), 'S', '器乐谱（五线谱）'],
  ['S 未知 instKey 按器乐', vox(['旋律'], ['staff'], { instKey: 'constructor' }), 'S', '器乐谱（五线谱）'],
  ['S SATB 合唱', vox(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], null, true), 'S', '五线谱合唱谱'],
  ['S 二声部合唱（高＋低音谱表、有词）不是钢琴', vox(['女声', '男声'], ['staff', 'bass'], null, true), 'S', '五线谱合唱谱'],
  ['S SAB 三部合唱不写分组、末行低音谱号：没有钢琴证据不叫钢琴伴奏歌谱', vox(['S', 'A', 'B'], ['staff', 'staff', 'bass'], null, true), 'S', '五线谱合唱谱'],
  /* v67.6 收尾验收 major：五线谱一族没词也没留词位＝器乐谱，不叫「歌谱」「合唱」（导入的弦乐四重奏 / 长笛＋钢琴） */
  ['S 多行无词无词位（器乐重奏）＝五线谱重奏谱', vox(['Vn1', 'Vn2', 'Va', 'Vc'], ['staff', 'staff', 'alto', 'bass']), 'S', '五线谱重奏谱'],
  ['S 多行留了词位（合唱建谱、还没填词）＝五线谱合唱谱', Object.assign(vox(['女高', '女低', '男声'], ['staff', 'staff', 'bass']), { lyricLines: 1 }), 'S', '五线谱合唱谱'],
  ['SJ 教学对照谱', vox(['旋律'], ['staff'], { voxDual: [true] }, true), 'SJ', '教学对照谱'],
  ['T 吉他谱（六线谱）', { v: 3, tabVoices: ['吉他1'], voxVoices: [], measures: [] }, 'T', '吉他谱（六线谱）'],
  ['T 尤克里里谱（四线谱）', { v: 3, inst: 'uku', tabVoices: ['尤克里里1'], voxVoices: [], measures: [] }, 'T', '尤克里里谱（四线谱）'],
  ['JT 吉他弹唱谱', { v: 3, tabVoices: ['吉他1'], voxVoices: ['旋律1'], measures: [] }, 'JT', '吉他弹唱谱'],
  ['JT 尤克里里弹唱谱（v67.6 前谱库叫尤克里里谱）', { v: 3, inst: 'uku', tabVoices: ['尤克里里1'], voxVoices: ['旋律1'], measures: [] }, 'JT', '尤克里里弹唱谱'],
  ['ST 吉他独奏谱', { v: 3, tabVoices: ['吉他1'], tabStaff: true, voxVoices: [], measures: [] }, 'ST', '吉他独奏谱'],
  ['ST 尤克里里独奏谱（MIDI「尤克里里独奏」导入；此前叫吉他独奏谱）', { v: 3, inst: 'uku', tabVoices: ['尤克里里1'], tabStaff: true, voxVoices: [], measures: [] }, 'ST', '尤克里里独奏谱'],
  ['G 钢琴独奏谱', vox(['右手', '左手'], ['staff', 'bass']), 'G', '钢琴独奏谱'],
  ['G 电钢琴独奏谱', vox(['右手', '左手'], ['staff', 'bass'], { instKey: 'epiano' }), 'G', '电钢琴独奏谱'],
  ['G 带简谱对照', vox(['右手', '左手'], ['staff', 'bass'], { voxDual: [true, false] }), 'G', '钢琴独奏谱（五线＋简谱对照）'],
  ['CG 钢琴伴奏谱（纯伴奏）（拍板 10：分类升级 P1 由「钢琴弹唱谱（纯伴奏）」改名，与归属 钢琴谱 › 伴奏 一致）', vox(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true }, true), 'CG', '钢琴伴奏谱（纯伴奏）'],
  ['CG 带简谱对照', vox(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true, voxDual: [true, false] }), 'CG', '钢琴伴奏谱（纯伴奏，五线＋简谱对照）'],
  ['JG 钢琴伴奏歌谱（显式 1–2 行花括号；v67.6 前谱库叫简谱歌谱）', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], funcNames: true }, true), 'JG', '钢琴伴奏歌谱'],
  ['JG 老谱没写分组：认一键配伴奏声部名', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], null, true), 'JG', '钢琴伴奏歌谱'],
  ['SG 钢琴伴奏歌谱（五线谱）', vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)] }, true), 'SG', '钢琴伴奏歌谱（五线谱）'],
  ['SG 无词无词位（长笛＋钢琴导入）＝旋律＋钢琴伴奏谱（五线谱）', vox(['Flute', 'Piano·右手', 'Piano·左手'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)] }), 'SG', '旋律＋钢琴伴奏谱（五线谱）'],
  ['SG lyricLines=0 但旋律有词＝钢琴伴奏歌谱（五线谱）', Object.assign(vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)] }, true), { lyricLines: 0 }), 'SG', '钢琴伴奏歌谱（五线谱）'],
  ['SJG 教学对照谱（含伴奏）', vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)], voxDual: [true, false, false] }, true), 'SJG', '教学对照谱（含伴奏）'],
  ['显式方括号 0–2 的三行（合唱）不是钢琴伴奏歌谱', vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BR(0, 2)] }, true), 'S', '五线谱合唱谱'],
  ['钢琴伴奏歌谱删掉左手后剩「简谱旋律＋右手五线」：只数简谱行，不叫合唱', vox(['旋律', '右手伴奏'], [undefined, 'staff'], null, true), 'J', '简谱歌谱'],
  ['显式分组全部越界：回退推断（大谱表照旧是钢琴独奏谱）', vox(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(1, 2)] }), 'G', '钢琴独奏谱'],
  ['CJ 功能谱', vox(['旋律'], [undefined], { func: true }), 'CJ', '功能谱'],
  ['CS 五线谱和弦谱', vox(['旋律'], ['staff'], { func: true }), 'CS', '五线谱和弦谱'],
  ['C 和弦谱', vox(['和弦'], [undefined], { func: true, chordOnly: true }), 'C', '和弦谱'],
  /* v70.0 P2a（规格 docs/spec-2026-11-v700.md §5）：拍板 11 合唱带钢琴加「（含钢琴伴奏）」；拍板 22 后半 无词旋律＋钢琴带乐器身份「X＋钢琴伴奏谱（简谱 / 五线谱）」；乐器表补 6 种 */
  ['J 二部合唱＋钢琴（显式方括号＋花括号）＝简谱合唱谱（含钢琴伴奏）（拍板 11）', vox(['女高', '女低', '右手', '左手'], [undefined, undefined, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)], lyricLines: 1 }), 'J', '简谱合唱谱（含钢琴伴奏）'],
  ['J 老合唱谱＋推断出的钢琴两行（没写分组、留了词位）＝简谱合唱谱（含钢琴伴奏）（拍板 11 有意改名）', vox(['女高', '女低', '钢琴右', '钢琴左'], [undefined, undefined, 'staff', 'bass'], { lyricLines: 1 }), 'J', '简谱合唱谱（含钢琴伴奏）'],
  ['J 二部无词＋钢琴＝简谱重奏谱（无词不加）', vox(['一', '二', '右手', '左手'], [undefined, undefined, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }), 'J', '简谱重奏谱'],
  ['J 二部无词带乐器＋钢琴＝古筝谱（简谱）（无词不加）', vox(['一', '二', '右手', '左手'], [undefined, undefined, 'staff', 'bass'], { voxGroups: [BC(2, 3)], instKey: 'guzheng' }), 'J', '古筝谱（简谱）'],
  ['S SATB＋钢琴（导入的 SATB＋钢琴 MusicXML）＝五线谱合唱谱（含钢琴伴奏）（拍板 11）', vox(['S', 'A', 'T', 'B', 'Piano·右手', 'Piano·左手'], ['staff', 'staff', 'staff', 'bass', 'staff', 'bass'], { voxGroups: [BR(0, 3), BC(4, 5)], lyricLines: 1 }), 'S', '五线谱合唱谱（含钢琴伴奏）'],
  ['S 弦乐四重奏＋钢琴（无词）＝五线谱重奏谱（无词不加）', vox(['Vn1', 'Vn2', 'Va', 'Vc', '右手', '左手'], ['staff', 'staff', 'alto', 'bass', 'staff', 'bass'], { voxGroups: [BR(0, 3), BC(4, 5)] }), 'S', '五线谱重奏谱'],
  ['S SATB 没有钢琴：五线谱合唱谱（不加）', vox(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], { voxGroups: [BR(0, 3)] }, true), 'S', '五线谱合唱谱'],
  ['JG 无词带乐器身份（二胡）＝二胡＋钢琴伴奏谱（简谱）（拍板 22 后半）', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'erhu' }), 'JG', '二胡＋钢琴伴奏谱（简谱）'],
  ['JG 无词带新乐器（竖笛）＝竖笛＋钢琴伴奏谱（简谱）', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'recorder' }), 'JG', '竖笛＋钢琴伴奏谱（简谱）'],
  ['JG 有词带乐器身份＝钢琴伴奏歌谱（有词照旧）', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'erhu' }, true), 'JG', '钢琴伴奏歌谱'],
  ['JG 无词 instKey=piano＝钢琴伴奏歌谱（钢琴不算乐器身份）', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'piano' }), 'JG', '钢琴伴奏歌谱'],
  ['JG 无词无乐器（钢琴即兴伴奏）＝钢琴伴奏歌谱（照旧）', vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], intent: 'pacc' }), 'JG', '钢琴伴奏歌谱'],
  ['SG 无词小提琴＝小提琴＋钢琴伴奏谱（五线谱）（拍板 22 后半）', vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'violin' }), 'SG', '小提琴＋钢琴伴奏谱（五线谱）'],
  ['SG 无词大提琴（低音谱号旋律）＝大提琴＋钢琴伴奏谱（五线谱）', vox(['大提琴', '右手伴奏', '左手伴奏'], ['bass', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'cello' }), 'SG', '大提琴＋钢琴伴奏谱（五线谱）'],
  ['SG 无词其他器乐＝器乐＋钢琴伴奏谱（五线谱）', vox(['旋律', '右手伴奏', '左手伴奏'], ['alto', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'other' }), 'SG', '器乐＋钢琴伴奏谱（五线谱）'],
  ['SG 无词未知 instKey 按器乐', vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'constructor' }), 'SG', '器乐＋钢琴伴奏谱（五线谱）'],
  ['SG 有词带乐器＝钢琴伴奏歌谱（五线谱）（有词照旧）', vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'violin' }, true), 'SG', '钢琴伴奏歌谱（五线谱）'],
  ['J 竖笛＝竖笛谱（简谱）', vox(['竖笛'], [undefined], { instKey: 'recorder' }), 'J', '竖笛谱（简谱）'],
  ['J 口风琴＝口风琴谱（简谱）', vox(['口风琴'], [undefined], { instKey: 'melodica' }), 'J', '口风琴谱（简谱）'],
  ['J 陶笛＝陶笛谱（简谱）', vox(['陶笛'], [undefined], { instKey: 'ocarina' }), 'J', '陶笛谱（简谱）'],
  ['J 箫＝箫谱（简谱）', vox(['箫'], [undefined], { instKey: 'xiao' }), 'J', '箫谱（简谱）'],
  ['S 大提琴（低音谱号）＝大提琴谱（五线谱）', vox(['大提琴'], ['bass'], { instKey: 'cello' }), 'S', '大提琴谱（五线谱）'],
  ['S 单簧管＝单簧管谱（五线谱）', vox(['单簧管'], ['staff'], { instKey: 'clarinet' }), 'S', '单簧管谱（五线谱）'],
  ['空谱 {}', {}, 'J', '简谱歌谱'],
];

for (const [name, s, k, nm] of CASES) {
  T('规则 · ' + name, () => {
    const d = JSON.parse(JSON.stringify(s));   // 服务端拿到的是存储的 JSON（undefined 变 null）
    assert.strictEqual(K.stackOf(d), k, '谱行');
    assert.strictEqual(K.nameOf(d), nm, '谱名');
    assert.strictEqual(K.kindName(K.stackOf(d), K.ctxOf(d)), nm, 'kindName(stackOf, ctxOf)');
  });
}

T('kindName 未知谱行代号 / 原型链键 → 曲谱', () => {
  for (const k of ['', 'X', 'constructor', '__proto__', 'toString', undefined]) assert.strictEqual(K.kindName(k, {}), '曲谱');
  assert.strictEqual(K.kindName('S', { nVox: 3, lyr: true }), '五线谱合唱谱');
  assert.strictEqual(K.kindName('S', { nVox: 3 }), '五线谱重奏谱');
  assert.strictEqual(K.kindName('SG', { lyr: true }), '钢琴伴奏歌谱（五线谱）');
  assert.strictEqual(K.kindName('ST', { inst: 'uku' }), '尤克里里独奏谱');
  assert.strictEqual(K.kindName('JT', { inst: 'uku' }), '尤克里里弹唱谱');
  assert.strictEqual(K.kindName('G', { instKey: 'synth', dual: true }), '电子琴独奏谱（五线＋简谱对照）');
});

T('14 种谱行组合各有名字（不落「曲谱」）且互不相同（默认上下文）', () => {
  const ks = ['J', 'S', 'SJ', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'C'];
  const names = ks.map(k => K.kindName(k, {}));
  assert.ok(names.every(n => n && n !== '曲谱'), names.join());
  assert.strictEqual(new Set(names).size, ks.length, names.join());
});

T('脏数据不抛错（null 小节 / null 列 / 非数组歌词 / null 分组）', () => {
  const bad = [
    { measures: [null, { voxes: [null, [null, { lyrics: 'x' }]] }], voxVoices: ['a'], voxNotations: ['staff'] },
    { voxVoices: ['a', 'b'], voxNotations: ['staff', 'bass'], voxGroups: [null, { type: 'brace', from: 'x' }], measures: [{ voxes: [[{ lyrics: [null, 1] }]] }] },
    { tabVoices: ['g'], voxVoices: null, measures: null },
  ];
  for (const d of bad) { const n = K.nameOf(d); assert.ok(typeof n === 'string' && n.length, String(n)); }
});

T('只读：推断前后谱面 JSON 逐字节不变', () => {
  for (const [, s] of CASES) { const a = JSON.stringify(s); K.nameOf(s); K.groupsOf(s); K.isChoir(s); K.isPianoAccStack(s); assert.strictEqual(JSON.stringify(s), a); }
});

T('@pq-kindname 段与编辑器 muse-tab/index.html 内联段逐字节相同', () => {
  const cut = s => { const a = s.indexOf('/* @pq-kindname begin'), b = s.indexOf('/* @pq-kindname end */'); assert.ok(a >= 0 && b > a, '缺少标记'); return s.slice(a, b); };
  const srv = cut(fs.readFileSync(path.join(__dirname, 'kindname.js'), 'utf8'));
  const ed = cut(fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8'));
  assert.ok(srv === ed, '两处不一致（改规则必须两处一起改）');
  /* 规则段自足：不引用编辑器全局（NW_INSTS / song / docType 等），服务端才能原样跑 */
  assert.ok(!/\bNW_INSTS\b|\bsong\b|\bdocType\(|\bwindow\b|\bdocument\b/.test(srv.replace(/\/\*[\s\S]*?\*\//g, '')), '规则段引用了编辑器全局');
});

T('乐器名表＝编辑器新建面板 NW_INSTS（k → name 逐项）', () => {
  const html = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8');
  const a = html.indexOf('const NW_INSTS=['), b = html.indexOf('];', a);
  const ed = {}; for (const m of html.slice(a, b).matchAll(/\{k:'([a-z]+)',\s*name:'([^']+)'/g)) ed[m[1]] = m[2];
  assert.ok(Object.keys(ed).length >= 20, '读不到 NW_INSTS');
  assert.deepStrictEqual(K.INST, ed);
});

T('server.js 的 typeLabelOf 读统一谱名表（旧表 TYPE_FULL_SSR / TYPE_CN_SSR 退役）', () => {
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  assert.ok(/require\('\.\/kindname'\)/.test(src), '未 require kindname');
  const m = /function typeLabelOf\(d\) \{([\s\S]*?)\n\}/.exec(src);
  assert.ok(m && /KIND\.pubNameOf\(/.test(m[1]), 'typeLabelOf 未读 KIND.pubNameOf（观看页口径的统一谱名）');
  assert.ok(!/const TYPE_(FULL|CN)_SSR\b/.test(src), '旧谱名表仍在');
  /* 分类升级 P0：谱类 type 改读统一谱名表 PQ_KIND.docTypeOf（服务端自己那份 isChoirOf / docTypeOf 删除）；卡片 type / typeLabel / 谱种 / 分面由 KIND.pubKindOf 一次算齐 */
  assert.ok(!/function (isChoirOf|docTypeOf)\(/.test(src), '服务端仍有自己的谱类判定');
  assert.ok(/const pk = safe\(\(\) => KIND\.pubKindOf\(d\), null\)/.test(src) && /const o = \{ type: pk\.type, typeLabel: pk\.typeLabel, pz: pk\.pz, sub: pk\.sub, inst: pk\.inst, also: pk\.also, fx: pk\.fx,/.test(src), '卡片谱类字段不是从 pubKindOf 来的');
  /* create_stack 进埋点白名单（客户端可报） */
  const ev = /const EVENT_CLIENT = \[([\s\S]*?)\];/.exec(src);
  assert.ok(ev && /'create_stack'/.test(ev[1]) && /'create_song'/.test(ev[1]), 'create_stack / create_song 不在白名单');
});

/* ---------- v67.6 收尾验收 minor：谱库口径＝观看页看到的谱（sanitizeUntrusted 清洗 + migrate）——恶意 / 老格式数据两端同名 ---------- */
const one = (nota, extra, cells) => Object.assign({ v: 3, title: 't', tabVoices: [], voxVoices: nota.map((_, i) => '声部' + i), voxNotations: nota, lyricLines: 0,
  measures: [{ tabs: [], voxes: nota.map((_, i) => [Object.assign({ dur: 4, deg: 1, oct: 0, acc: '', lyrics: [] }, (cells || [])[i] || {})]) }] }, extra || {});
const PUB = [
  ['歌词只有尖括号（单行五线谱）：清洗后没词＝五线谱旋律', one(['staff'], null, [{ lyrics: ['<'] }]), '五线谱旋律', '五线谱歌谱'],
  ['歌词只有尖括号（高＋低音谱表两行）：清洗后没词＝钢琴独奏谱', one(['staff', 'bass'], null, [{ lyrics: ['<>'] }, { lyrics: ['>'] }]), '钢琴独奏谱', '五线谱合唱谱'],
  ['voxNotations 带引号 "staff\'"：清洗后是大谱表', one(["staff'", 'bass']), '钢琴独奏谱', '简谱歌谱'],
  ['inst 带反引号：清洗后是尤克里里', { v: 3, tabVoices: ['尤克里里'], inst: 'uku`', voxVoices: ['旋律'], lyricLines: 1, measures: [{ tabs: [[{ dur: 4, notes: [] }]], voxes: [[{ dur: 4, deg: 1 }]] }] }, '尤克里里弹唱谱', '吉他弹唱谱'],
  ['instKey 带双引号：清洗后是二胡', one([undefined], { instKey: 'erhu"' }), '二胡谱（简谱）', '器乐谱（简谱）'],
  ['声部名带尖括号（伴奏证据）：清洗后认得一键配伴奏', Object.assign(one([undefined, 'staff', 'bass'], { lyricLines: 1 }), { voxVoices: ['旋律', '右手<伴奏', '左手伴奏'] }), '钢琴伴奏歌谱', '简谱歌谱'],
  ['键名带引号 voxNotations\'：清洗后键名复原', (() => { const d = one(['staff']); d["voxNotations'"] = d.voxNotations; delete d.voxNotations; return d; })(), '五线谱旋律', '简谱歌谱'],
  ['键名 __proto__ 带 pianoAcc：丢掉（观看页深拷后不在）', JSON.parse('{"v":3,"tabVoices":[],"voxVoices":["右","左"],"voxNotations":["staff","bass"],"__proto__":{"pianoAcc":true},"measures":[{"tabs":[],"voxes":[[{"deg":1,"dur":4}],[{"deg":1,"dur":4}]]}]}'), '钢琴独奏谱', '钢琴独奏谱'],
  ['v 是字符串 "3"：按 v3', Object.assign(one(['staff']), { v: '3' }), '五线谱旋律', '五线谱旋律'],
  ['没有 v 字段（老格式）：migrate 成吉他弹唱', { title: 'nov', voxVoices: ['右', '左'], voxNotations: ['staff', 'bass'], tabVoices: [], measures: [{ tabs: [], voxes: [[{ deg: 1 }], [{ deg: 1 }]] }] }, '吉他弹唱谱', '钢琴独奏谱'],
  ['v:2 旧格式（尤克里里）：migrate 成尤克里里弹唱', { v: 2, inst: 'uku', key: 'C', measures: [{ tab: [], vox: [{ dur: 4, deg: 1, lyric: '啊' }] }] }, '尤克里里弹唱谱', '简谱歌谱'],
  ['没有小节（观看页打不开）：曲谱', { v: 3, voxVoices: ['a'], voxNotations: ['staff'], measures: [] }, '曲谱', null],
  ['data 是数组：曲谱', [], '曲谱', null],
  ['data 是 null：曲谱', null, '曲谱', null],
  ['小节不是数组的坏谱：曲谱、不抛错', { v: 3, voxVoices: ['a'], voxNotations: ['staff'], measures: [{ voxes: { a: 1 } }] }, '曲谱', null],
];
for (const [name, d, want, raw] of PUB) {
  T('谱库口径 · ' + name, () => {
    const j = d == null ? d : JSON.parse(JSON.stringify(d)), before = JSON.stringify(j);
    assert.strictEqual(K.pubNameOf(j), want);
    if (raw) { let r; try { r = K.nameOf(j); } catch (_) { r = '曲谱'; } assert.strictEqual(r, raw, '原始 JSON 直接推断（修前服务端的叫法）'); }
    assert.strictEqual(JSON.stringify(j), before, '只读');
  });
}
T('谱库口径 · 干净的谱不深拷（谱库列表每条都算，免得多一倍开销）', () => {
  const d = one(['staff', 'bass'], { lyricLines: 1 }, [{ lyrics: ['啊'] }]);
  assert.strictEqual(K.viewOf(d), d);
  const q = one(['staff'], null, [{ lyrics: ["don't"] }]);   // 自由文本里的引号不用清洗
  assert.strictEqual(K.viewOf(q), q);
});
T('清洗字段表＝编辑器 sanitizeUntrusted 用的 SAN_NUM / SAN_FREE / SAN_ENUM_KEEP（api/scoredata.js 同一张）', () => {
  const html = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8');
  const setOf = n => { const m = new RegExp('const ' + n + ' = new Set\\(\\[([^\\]]*)\\]\\)').exec(html); assert.ok(m, '读不到 ' + n); return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]).sort(); };
  const SD = require('./scoredata');
  assert.deepStrictEqual(setOf('SAN_NUM'), [...SD.SD_NUM].sort());
  assert.deepStrictEqual(setOf('SAN_FREE'), [...SD.SD_FREE].sort());
  assert.ok(/const SAN_ENUM_KEEP = \{dyn:new Set\(\['<','>'\]\)\};/.test(html), 'SAN_ENUM_KEEP 变了');
  assert.deepStrictEqual(Object.keys(SD.SD_KEEP), ['dyn']); assert.deepStrictEqual([...SD.SD_KEEP.dyn].sort(), ['<', '>']);
  /* 清洗本体与编辑器 sanitizeUntrusted 同形：非自由文本去 <>"'`、自由文本去 <> */
  const fn = /function sanitizeUntrusted\(v, key\)\{([\s\S]*?)\n\}/.exec(html);
  assert.ok(fn && /SAN_FREE\.has\(key\)\) return v\.replace\(\/\[<>\]\/g,''\)/.test(fn[1]) && /return v\.replace\(\/\[<>"'`\]\/g,''\)/.test(fn[1]), '编辑器 sanitizeUntrusted 口径变了，同步改 kindname.js sanitizeLike');
});

/* ---------- v67.6 第二轮验收（修前红修后绿：KIND_DIR / 直接用修前副本跑红） ---------- */
/* S-2 观看页打不开的 v3 坏谱（缺 tabVoices / 小节里有 null / 歌词写成字符串 / 声部名是字符串）：谱库谱名照观看页回落「曲谱」；
   v:2 旧格式观看页能开（谱类按 migrate 之后算），照旧给具体谱名；编辑器产出的干净谱不受影响 */
const OPEN2 = [
  ['v3 缺 tabVoices（简谱有词）', { v: 3, voxVoices: ['旋律'], lyricLines: 1, measures: [{ voxes: [[{ dur: 4, deg: 1, lyrics: ['啊'] }]] }] }, '曲谱'],
  ['v3 缺 tabVoices（大谱表）', { v: 3, voxVoices: ['右手', '左手'], voxNotations: ['staff', 'bass'], measures: [{ voxes: [[{ deg: 1 }], [{ deg: 1 }]] }] }, '曲谱'],
  ['v3 缺 voxVoices', { v: 3, tabVoices: [], measures: [{ voxes: [[{ deg: 1 }]] }] }, '曲谱'],
  ['tabVoices 是字符串', { v: 3, tabVoices: '吉他', voxVoices: ['旋律'], lyricLines: 1, measures: [{ tabs: [[{ dur: 4, notes: [] }]], voxes: [[{ deg: 1 }]] }] }, '曲谱'],
  ['小节里有 null', { v: 3, tabVoices: [], voxVoices: ['a'], lyricLines: 1, measures: [null, { tabs: [], voxes: [[{ deg: 1, lyrics: ['啊'] }]] }] }, '曲谱'],
  ['歌词是字符串（高＋低音两行）', one(['staff', 'bass'], null, [{ lyrics: '啊' }]), '曲谱'],
  ['v:2 旧格式（吉他）：观看页能开', { v: 2, key: 'G', measures: [{ tab: [{ dur: 4, notes: [{ s: 6, f: 3 }] }], vox: [{ dur: 4, deg: 1, lyric: '啊' }] }] }, '吉他弹唱谱'],
  ['干净 v3 大谱表', one(['staff', 'bass']), '钢琴独奏谱'],
  ['干净 v3 列为 null（空位）仍可开', Object.assign(one(['staff']), { measures: [{ tabs: [], voxes: [null] }] }), '五线谱旋律'],
];
for (const [name, d, want] of OPEN2) T('第二轮 S-2 谱库口径＝观看页能否打开 · ' + name, () => assert.strictEqual(K.pubNameOf(JSON.parse(JSON.stringify(d))), want));

/* S-1 写侧：顶层标量字段是对象 / 数组的谱拒收（此前存得进库、过审后谱库整页 500）；嵌套里同名键（织体型 s:[…]、TAB 音符 s 数字）照常 */
T('第二轮 S-1 scoreDataDanger：顶层 key / tempo / lyricLines / beats 为对象或数组拒收，嵌套同名数组键放行', () => {
  const { scoreDataDanger } = require('./scoredata');
  const base = () => ({ v: 3, key: 'C', beats: 4, unit: 4, tempo: 90, tabVoices: [], voxVoices: ['a'], lyricLines: 0, measures: [{ tabs: [], voxes: [[{ dur: 4, deg: 1 }]] }] });
  for (const [k, v] of [['key', { toString: 1 }], ['tempo', { toString: 1, valueOf: 1 }], ['lyricLines', { valueOf: 1 }], ['beats', [4]], ['mode', { a: 1 }], ['keyTo', ['G']]]) {
    const d = base(); d[k] = v; const r = scoreDataDanger(JSON.parse(JSON.stringify(d)), '', 'data', 0);
    assert.ok(r && r.includes('data.' + k), k + ' 未拒收：' + r);
  }
  const ok = base(); ok.customPat = [{ id: 'x', R: [{ d: 4, s: ['1', '3', '5'] }] }]; ok.measures[0].tabs = [[{ dur: 4, notes: [{ s: 6, f: 3 }] }]]; ok.key = null; ok.tempo = '90';
  assert.strictEqual(scoreDataDanger(JSON.parse(JSON.stringify(ok)), '', 'data', 0), null);
});

/* seam-4 谱类图标与谱名同义：编辑器 NWB.kindOf 的图标覆盖规则（浏览器侧 tv_icons T14 实测渲染；这里核对规则源码） */
T('第二轮 seam-4 kindOf：五线谱重奏谱（S 多行无词）用器乐五线谱图标、尤克里里独奏谱（ST＋uku）用尤克里里图标', () => {
  const html = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8');
  const m = /function kindOf\(k, ctx\)\{([\s\S]*?)\n  \}/.exec(html); assert.ok(m, '读不到 NWB.kindOf');
  assert.ok(/if\(k==='S' && nv>1 && !ctx\.lyr\) ic='type-instr';/.test(m[1]), '五线谱重奏谱仍是合唱谱图标');
  assert.ok(/\(k==='T'\|\|k==='JT'\|\|k==='ST'\) && uku\) ic='type-uku'/.test(m[1]), '尤克里里独奏谱仍是吉他独奏图标');
});

/* ---------- 分类升级 P0（方案 docs/design-2026-11-taxonomy §五 / §十四）：谱种规则单测（整张判法表、曲库、示例、不变式、真服务端见 muse-tab/tests/tv_taxonomy.js） ---------- */
const PREV = require(path.join(ROOT, 'muse-tab/tests/fixtures/taxo_prev.js'));
T('P0 谱种表 PZ：一级 7 个顺序固定、id / slug 唯一、按钮名 ≤4 字（文案预算）、二级 id 一级内唯一', () => {
  assert.deepStrictEqual(K.PZ.map(p => p.id), ['jianpu', 'wuxian', 'gangqin', 'jita', 'uku', 'hechang', 'gongneng']);
  assert.deepStrictEqual(K.PZ.map(p => p.name), ['简谱', '五线谱', '钢琴谱', '吉他谱', '尤克里里', '合唱谱', '功能谱']);
  assert.strictEqual(new Set(K.PZ.map(p => p.slug)).size, 7);
  K.PZ.forEach(p => { assert.ok([...p.name].length <= 4, p.name); assert.strictEqual(new Set(p.subs.map(x => x.id)).size, p.subs.length, p.id);
    p.subs.forEach(x => { assert.ok([...x.name].length <= 4, x.name); assert.ok(/^[a-z]+$/.test(x.id), x.id); }); });
  assert.ok(K.pzHas('jianpu') && K.pzHas('jianpu', 'qiyue') && K.pzHas('', 'duizhao') && K.pzHas('wuxian', 'chongzou'));
  for (const [p, s] of [['jianpu', 'chongzou'], ['constructor'], ['__proto__'], ['', ''], ['', 'toString'], [null, null], ['gangqin', 'gequ']]) assert.ok(!K.pzHas(p, s), p + '/' + s);
  assert.strictEqual(K.pzName('gangqin.tanchang'), '钢琴谱 › 弹唱'); assert.strictEqual(K.pzName('hechang.jianpu'), '合唱谱 › 简谱合唱'); assert.strictEqual(K.pzName('x.y'), '');
});
T('P0 乐器族 INST_FAM＝编辑器新建面板 NW_INSTS.fam（逐项），键与 INST 相同；INTENTS 11 个', () => {
  const html = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8');
  const a = html.indexOf('const NW_INSTS=['), b = html.indexOf('];', a);
  const ed = {}; for (const m of html.slice(a, b).matchAll(/\{k:'([a-z]+)',\s*name:'[^']+',\s*fam:'([a-z]+)'/g)) ed[m[1]] = m[2];
  assert.deepStrictEqual(K.INST_FAM, ed); assert.deepStrictEqual(Object.keys(K.INST_FAM), Object.keys(K.INST));
  assert.deepStrictEqual(K.INTENTS, ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom']);
});
T('P0 docTypeOf：与修前编辑器 docType 逐值相同（本文件全部规则样例）；坏谱不抛错', () => {
  for (const [name, s] of CASES) { const d = JSON.parse(JSON.stringify(s)); if (!Array.isArray(d.tabVoices)) continue;
    assert.strictEqual(K.docTypeOf(d), PREV.docTypeEd(d), name); }
  for (const d of [null, 1, 'x', [], {}, { tabVoices: 'ab' }, { voxNotations: 'staff', voxVoices: 'ab' }, { tabVoices: [], voxNotations: ['staff', 'bass'], voxVoices: ['a', 'b'] }])
    assert.ok(typeof K.docTypeOf(d) === 'string', JSON.stringify(d));
  assert.strictEqual(K.docTypeOf(null), 'vocal'); assert.strictEqual(K.docTypeOf({ tabVoices: 'ab' }), 'vocal');
});
T('P0 ikOf：按首个旋律行音轨名推乐器（人声词、钢琴词、单独的 Bass 不算；「·」后不看）', () => {
  const ik = n => K.ikOf({ voxVoices: [n] });
  const want = { Violin: 'violin', 'Violin I': 'violin', Vn1: 'violin', 'Vl. 2': 'violin', 小提琴: 'violin', Flute: 'flute', 'Fl.': 'flute', 长笛: 'flute', 'Alto Sax': 'sax', 'Soprano Saxophone': 'sax',
    萨克斯: 'sax', 'Trumpet in Bb': 'trumpet', 'Horn in F': 'horn', 'French Horn': 'horn', Trombone: 'trombone', 'Bass Guitar': 'bass', 贝斯: 'bass', 'Electric Piano': 'epiano', 电子琴: 'synth',
    Accordion: 'accordion', Erhu: 'erhu', 二胡: 'erhu', 胡琴: 'erhu', 笛子: 'dizi', 竹笛: 'dizi', 葫芦丝: 'hulusi', 唢呐: 'suona', 'Guzheng·右手': 'guzheng', 古筝: 'guzheng', 琵琶: 'pipa', 扬琴: 'yangqin',
    Harmonica: 'harmonica', 口琴: 'harmonica',
    Voice: '', Soprano: '', 'Singstimme Voice': '', 女高音: '', 主唱: '', 旋律: '', 旋律1: '', Bass: '', Alto: '', Tenor: '', Piano: '', 'Piano·右手': '', 钢琴: '', 右手: '', Viola: '',
    Flugelhorn: '', 'English Horn': '', '': '',
    /* v70.0 P2a 有意迁移：乐器表补 6 种后 Violoncello / 口风琴 认得出（此前断言为空）；其余反例照旧，全套正反例见下方 P2a IK_ALIAS */
    Violoncello: 'cello', 口风琴: 'melodica' };
  for (const [n, k] of Object.entries(want)) assert.strictEqual(ik(n), k, n);
  for (const d of [null, {}, { voxVoices: null }, { voxVoices: [null] }, { voxVoices: [{ toString: 1 }] }, { voxVoices: 'Violin' }]) assert.strictEqual(K.ikOf(d), '');
});
T('P0 pzOf：判法表抽样（完整金表见 tv_taxonomy）、坏谱退回 简谱 › 歌曲、只读', () => {
  const pz = d => { const r = K.pzOf(JSON.parse(JSON.stringify(d))); return [r.row, r.pz + '.' + r.sub, r.inst, r.also.join(',')].join(' '); };
  assert.strictEqual(pz(vox(['旋律'], [undefined], null, true)), '19 jianpu.gequ  ');
  assert.strictEqual(pz(vox(['旋律'], ['staff'])), '24 wuxian.shichang  ');
  assert.strictEqual(pz(vox(['Violin'], ['staff'])), '18 wuxian.qiyue violin ');
  assert.strictEqual(pz(vox(['右手', '左手'], [undefined, undefined], { instKey: 'guzheng' })), '15a jianpu.qiyue guzheng ');
  assert.strictEqual(pz(vox(['一', '二'], [undefined, undefined], { voxGroups: [BR(0, 1)] })), '15c jianpu.qiyue other ');
  assert.strictEqual(pz(vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)] }, true)), '9 gangqin.tanchang  jianpu.gequ');
  assert.strictEqual(pz(vox(['右手', '左手'], ['staff', 'bass'], { voxDual: [true, false], instKey: 'guzheng' })), '14b wuxian.qiyue guzheng jianpu.duizhao');   // 一级内唯一：五线谱已有器乐，不再加对照谱
  const dflt = { pz: 'jianpu', sub: 'gequ', inst: '', also: [], row: '' };
  for (const d of [null, [], 7, { measures: { a: 1 }, voxVoices: ['a'] }, { voxGroups: 5, voxVoices: ['a', 'b'], voxNotations: ['staff', 'bass'], measures: [{ voxes: 'x' }] }]) {
    const r = K.pzOf(d); assert.ok(r && typeof r.pz === 'string' && K.pzHas(r.pz, r.sub), JSON.stringify(d)); }
  assert.deepStrictEqual(K.pzOf(null), Object.assign({}, dflt, { row: '23' }));
  for (const [, s] of CASES) { const a = JSON.stringify(s); K.pzOf(s); K.facetsOf(s); assert.strictEqual(JSON.stringify(s), a); }
});
T('P0 facetsOf：乐器 / 编制 / 和弦 / 伴奏 / 合奏 / 段数 / 原稿记谱 / 指法调；坏谱不抛错', () => {
  const f = K.facetsOf({ v: 3, key: 'G', capo: 2, tabVoices: ['吉他1', '吉他2'], voxVoices: ['旋律'], measures: [{ tabs: [[{ chord: 'G', strum: 'd', notes: [] }]], voxes: [[{ deg: 1, lyrics: ['啊', '', '哦'] }]] }] });
  assert.deepStrictEqual(f, { inst: ['guitar'], parts: 2, chord: true, acc: false, ens: true, verses: 2, nota0: '', fkey: 'F' });
  const g = K.facetsOf(vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'erhu' }));
  assert.deepStrictEqual(g, { inst: ['erhu', 'piano'], parts: 1, chord: false, acc: true, ens: false, verses: 0, nota0: 'jp', fkey: '' });
  assert.strictEqual(K.facetsOf(vox(['右手', '左手'], ['staff', 'bass'])).acc, false, '钢琴独奏不算带伴奏');
  assert.strictEqual(K.facetsOf(vox(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], null, true)).ens, true);
  assert.strictEqual(K.fingerKey('C', 3), 'A'); assert.strictEqual(K.fingerKey('Eb', 1), 'D'); assert.strictEqual(K.fingerKey({}, 1), ''); assert.strictEqual(K.fingerKey('G', '2'), 'F');
  for (const d of [null, [], { measures: [null, 5, { tabs: 'x', voxes: [[null, { lyrics: 'x', chord: {} }]] }] }]) assert.ok(K.facetsOf(d) && Array.isArray(K.facetsOf(d).inst));
});
T('P0 pzMatch：主谱种 0 / 也出现在 1 / 不中 -1；简谱五线谱下乐器＝器乐身份（器乐 ∪ 重奏），其他一级看分面', () => {
  const r = { pz: 'jianpu', sub: 'qiyue', inst: 'erhu', also: ['gangqin.banzou'], fx: { inst: ['erhu', 'piano'] } };
  assert.strictEqual(K.pzMatch(r, {}), 0); assert.strictEqual(K.pzMatch(r, { pz: 'jianpu' }), 0); assert.strictEqual(K.pzMatch(r, { pz: 'gangqin' }), 1);
  assert.strictEqual(K.pzMatch(r, { pz: 'wuxian' }), -1); assert.strictEqual(K.pzMatch(r, { sub: 'banzou' }), 1);
  assert.strictEqual(K.pzMatch(r, { pz: 'jianpu', inst: 'erhu' }), 0); assert.strictEqual(K.pzMatch(r, { pz: 'jianpu', inst: 'piano' }), -1);
  assert.strictEqual(K.pzMatch(r, { inst: 'piano' }), 1); assert.strictEqual(K.pzMatch(r, { inst: 'erhu' }), 0);
  const q2 = { pz: 'wuxian', sub: 'chongzou', inst: 'violin', also: [], fx: { inst: ['violin'] } };
  assert.strictEqual(K.pzMatch(q2, { pz: 'wuxian', inst: 'violin' }), 0, '五线谱选乐器含重奏（T20）');
  const q3 = { pz: 'gangqin', sub: 'tanchang', inst: 'erhu', also: ['jianpu.gequ'], fx: { inst: ['erhu', 'piano'] } };
  assert.strictEqual(K.pzMatch(q3, { pz: 'jianpu', inst: 'erhu' }), -1, '有词的二胡＋钢琴不进「简谱 › 器乐 › 二胡」');
  for (const x of [null, {}, { pz: 5 }]) assert.strictEqual(K.pzMatch(x, {}), -1);
});
T('P0 pubKindOf：type / typeLabel / 谱种同一份清洗＋migrate 副本；观看页打不开的谱名回落曲谱、type 照修前；坏数据不抛错', () => {
  const one = (o) => Object.assign({ v: 3, tabVoices: [], voxVoices: ['a'], lyricLines: 0, measures: [{ tabs: [], voxes: [[{ deg: 1, dur: 4 }]] }] }, o);
  const ev = K.pubKindOf({ v: 3, tabVoices: ['尤克里里'], inst: 'uku`', voxVoices: ['旋律'], lyricLines: 1, measures: [{ tabs: [[{ dur: 4, notes: [] }]], voxes: [[{ dur: 4, deg: 1 }]] }] });
  assert.deepStrictEqual([ev.type, ev.typeLabel, ev.pz, ev.sub], ['uku', '尤克里里弹唱谱', 'uku', 'tanchang'], '脏短码：type 也按清洗后（修前 guitar）');
  assert.strictEqual(PREV.docTypeSrv({ tabVoices: ['尤克里里'], inst: 'uku`' }), 'guitar');
  const v2 = K.pubKindOf({ v: 2, key: 'G', measures: [{ tab: [{ dur: 4, notes: [{ s: 6, f: 3 }] }], vox: [{ dur: 4, deg: 1, lyric: '啊' }] }] });
  assert.deepStrictEqual([v2.type, v2.typeLabel, v2.pz], ['guitar', '吉他弹唱谱', 'jita'], 'v:2 老格式按 migrate 之后');
  const bad = { v: 3, voxVoices: ['右手', '左手'], voxNotations: ['staff', 'bass'], measures: [{ voxes: [[{ deg: 1 }], [{ deg: 1 }]] }] };   // 缺 tabVoices：观看页打不开
  const b = K.pubKindOf(bad); assert.deepStrictEqual([b.type, b.typeLabel], [PREV.docTypeSrv(bad), '曲谱']);
  for (const d of [null, [], 5, 'x', { measures: { a: 1 } }, one({ voxGroups: 'x', measures: [null] }), one({ key: { toString: 1 } })]) {
    const r = K.pubKindOf(d); assert.ok(typeof r.type === 'string' && typeof r.typeLabel === 'string' && K.pzHas(r.pz, r.sub) && Array.isArray(r.also) && r.fx && Array.isArray(r.fx.inst), JSON.stringify(d)); }
});

/* ---------- 分类升级 P1：可转池 pzConv（§4.3）与搜索词解析 api/pzq.js（§七） ---------- */
T('P1 pzConv：按二级镜像、与原稿去重、对照谱永不进；乐器＝同一乐器（五线谱重奏 → 简谱器乐）；合唱谱两个二级互转', () => {
  const C = (pz, sub, also, inst) => ({ pz, sub, also: also || [], inst: inst || '', fx: { inst: [] } });
  const art = C('gangqin', 'tanchang', ['wuxian.gequ']), jg = C('gangqin', 'tanchang', ['jianpu.gequ']), satb = C('hechang', 'wuxian', ['wuxian.hechang']);
  const sj = C('wuxian', 'duizhao', ['jianpu.duizhao']), vn2 = C('wuxian', 'chongzou', [], 'violin'), vn = C('wuxian', 'qiyue', [], 'violin'), eh = C('jianpu', 'qiyue', [], 'erhu');
  assert.strictEqual(K.pzConv(art, { pz: 'jianpu' }), 'jp'); assert.strictEqual(K.pzConv(art, { pz: 'jianpu', sub: 'gequ' }), 'jp'); assert.strictEqual(K.pzConv(art, { pz: 'jianpu', sub: 'hechang' }), '');
  assert.strictEqual(K.pzConv(art, { pz: 'wuxian' }), '', '已是五线谱原稿');
  assert.strictEqual(K.pzConv(jg, { pz: 'wuxian', sub: 'gequ' }), 'st');
  assert.strictEqual(K.pzConv(sj, { pz: 'jianpu' }), '', '对照谱两边都是原稿'); assert.strictEqual(K.pzConv(sj, { pz: 'wuxian' }), '');
  assert.strictEqual(K.pzConv(satb, { pz: 'hechang', sub: 'jianpu' }), 'jp'); assert.strictEqual(K.pzConv(satb, { pz: 'hechang', sub: 'wuxian' }), ''); assert.strictEqual(K.pzConv(satb, { pz: 'hechang' }), '');
  assert.strictEqual(K.pzConv(satb, { pz: 'jianpu', sub: 'hechang' }), 'jp');
  assert.strictEqual(K.pzConv(vn2, { pz: 'jianpu', sub: 'qiyue' }), 'jp', '五线谱重奏 → 简谱器乐'); assert.strictEqual(K.pzConv(vn2, { pz: 'jianpu', inst: 'violin' }), 'jp');
  assert.strictEqual(K.pzConv(vn, { pz: 'jianpu', inst: 'erhu' }), '', '换了乐器不进'); assert.strictEqual(K.pzConv(eh, { pz: 'wuxian', inst: 'erhu' }), 'st');
  assert.strictEqual(K.pzConv(eh, { pz: 'gangqin' }), ''); assert.strictEqual(K.pzConv(eh, { pz: 'jianpu', sub: 'duizhao' }), '');
  for (const x of [null, {}, { pz: 5 }]) assert.strictEqual(K.pzConv(x, { pz: 'jianpu' }), '');
  assert.strictEqual(K.pzConv(art, null), '');
});
T('P1 pzq：停用词 / 整词 / 末尾「X谱」/ 组合规则 / 乐器调只排序 / 单独谱种词＝点一级；每个目标 id 都在 PQ_KIND 表里', () => {
  const P = require('./pzq');
  const g = q => { const r = P.parse(q); return [r.words, r.pz, r.sub, r.inst, r.zt, r.key || r.fkey || r.keySort, r.only ? 'only' : '', r.conv ? 'conv' : '', r.tail, r.hint, r.nota].join('|'); };
  assert.strictEqual(g('茉莉花 二胡谱'), '茉莉花|||erhu|||||||');
  assert.strictEqual(g('茉莉花简谱'), '茉莉花|jianpu||||||conv|jp||');
  assert.strictEqual(g('晴天 和弦谱'), '晴天|gongneng|||||||tab||');
  assert.strictEqual(g('吉他 和弦谱'), '|jita|tanchang||||only||||');
  assert.strictEqual(g('二胡曲谱大全'), '|||erhu|||||||');
  assert.strictEqual(g('萨克斯简谱大全'), '|jianpu|qiyue|sax|||||||');
  assert.strictEqual(g('黄河大合唱'), '黄河大合唱||||||||||');
  assert.strictEqual(g('舒伯特'), '舒伯特||||||||||');
  assert.strictEqual(g('简谱'), '|jianpu|||||only||||');
  assert.strictEqual(g('乌克丽丽'), '|uku|||||only||||');
  assert.strictEqual(g('教资 儿歌弹唱'), '||||shifan||||||');
  /* v70.0 验收④：「艺考视唱」「艺考视唱练耳」连写＝艺考专题（同「艺考」口径；此前整词当曲名 0 条）；带曲名 / 分写照旧 */
  for (const q of ['艺考', '艺考视唱', '艺考视唱练耳']) assert.strictEqual(g(q), '||||yikao||||||', q);
  assert.strictEqual(g('艺考 视唱'), '||shichang||yikao||||||');
  assert.strictEqual(g('小星星 艺考视唱'), '小星星||||yikao||||||');
  /* v70.3 有意迁移（基石方案 §2.3 D9）：专题显示名＝伴奏专题 / 视唱专题 / 儿歌专题 / 对照专题，条件块不加「专题：」前缀 */
  { const r = P.parse('艺考视唱'); assert.ok(r.conds.length === 1 && r.conds[0].label === '视唱专题' && r.conds[0].rm === '', JSON.stringify(r.conds)); }
  /* v70.3 D9：条件块上的名字再搜一次＝同一专题（只增的四个搜索词）；「伴奏专题 ＋ 儿歌」不被改写成师范 */
  for (const [q, z] of [['伴奏专题', 'kaobian'], ['视唱专题', 'yikao'], ['儿歌专题', 'shifan'], ['对照专题', 'ketang']]) {
    assert.strictEqual(g(q), '||||' + z + '||||||', q);
    const r = P.parse(q); assert.ok(r.conds.length === 1 && r.conds[0].label === P.ZT_NAME[z] && r.conds[0].label === q, JSON.stringify(r.conds));
  }
  assert.strictEqual(P.parse('伴奏专题 儿歌').zt, 'kaobian');
  assert.deepStrictEqual(P.ZT_NAME, { kaobian: '伴奏专题', yikao: '视唱专题', shifan: '儿歌专题', ketang: '对照专题' });
  assert.strictEqual(g('器乐谱'), '|||||||||inst|');
  assert.strictEqual(P.parse('C调葫芦丝').keySort, 'C'); assert.strictEqual(P.parse('C调葫芦丝').key, '', '乐器的调不筛');
  assert.strictEqual(P.parse('G调 吉他 晴天').fkey, 'G'); assert.strictEqual(P.parse('小星星 C调').key, 'C');
  assert.strictEqual(g('钢琴 简谱'), '|gangqin|||||||||jp');
  assert.strictEqual(g('合唱 简谱'), '|hechang|jianpu||||only||||');
  const m = P.parse('茉莉花 二胡谱'); assert.ok(m.conds.length === 1 && m.conds[0].label === '乐器：二胡' && m.conds[0].rm === '茉莉花', JSON.stringify(m.conds));
  assert.ok(/没有「晴天」的功能谱/.test(P.fbNote(P.parse('晴天 和弦谱'))));
  const t = P.targets();
  t.pz.forEach(x => assert.ok(K.pzHas(x), 'pzq 谱种 ' + x));
  t.sub.forEach(x => { const [a, b] = x.split('.'); assert.ok(K.pzHas(a, b), 'pzq 二级 ' + x); });
  t.inst.forEach(x => assert.ok(K.own(K.INST, x), 'pzq 乐器 ' + x));
  Object.keys(P.CAT_ALIAS).forEach(k => { const a = P.CAT_ALIAS[k]; assert.ok(!a.pz || K.pzHas(a.pz, a.sub || ''), k); });
});
T('P1 pzq 伴奏词：带伴奏 / 有伴奏 / 无伴奏 / 无伴奏合唱；合唱同现的 伴奏 / 钢琴伴奏＝合唱谱「伴奏」三选（不丢条件、不当成只有谱种词）；钢琴即兴伴奏 / 即兴伴奏谱＝考编专题；不误伤 §十三', () => {
  const P = require('./pzq');
  const g = q => { const r = P.parse(q); return [r.words, r.pz, r.sub, r.inst, r.zt, r.acc ? 'acc' : '', r.hacc, r.only ? 'only' : ''].join('|'); };
  /* 合唱谱「伴奏」三选：带伴奏 */
  for (const q of ['合唱 带伴奏', '带伴奏 合唱', '合唱 有伴奏', '合唱谱 带伴奏', '合唱 伴奏', '合唱 钢琴伴奏', '钢琴伴奏 合唱谱', '合唱 伴奏谱', '合唱 正谱伴奏'])
    assert.strictEqual(g(q), '|hechang|||||yes|', q);
  assert.strictEqual(g('合唱 简谱 伴奏'), '|hechang|jianpu||||yes|', '合唱＋简谱＋伴奏：简谱合唱＋带伴奏');
  assert.strictEqual(g('送别 合唱 带伴奏'), '送别|hechang|||||yes|');
  const ca = P.parse('合唱 伴奏');
  assert.deepStrictEqual(ca.conds.map(c => c.k + ':' + c.v + ':' + c.label + ':' + c.rm), ['pz:hechang:谱种：合唱谱:伴奏', 'hacc:yes:带伴奏:合唱'], '两个条件块都在、各自可删');
  /* 无伴奏 */
  assert.strictEqual(g('无伴奏合唱'), '|hechang|||||no|');
  assert.strictEqual(g('无伴奏'), '|hechang|||||no|', '单独「无伴奏」＝合唱谱 › 无伴奏');
  assert.strictEqual(g('合唱 无伴奏'), '|hechang|||||no|');
  assert.strictEqual(g('简谱 无伴奏合唱'), '|hechang|jianpu||||no|');
  assert.strictEqual(g('无伴奏 小提琴'), '|||violin|||no|', '与乐器同现：只筛不带伴奏的，不改成合唱谱');
  /* 不在合唱谱：带伴奏＝开关 acc */
  assert.strictEqual(g('带伴奏'), '|||||acc||'); assert.strictEqual(g('有伴奏'), '|||||acc||');
  assert.strictEqual(g('简谱 带伴奏'), '|jianpu||||acc||'); assert.strictEqual(g('五线谱 带伴奏'), '|wuxian||||acc||');
  /* 原有钢琴伴奏口径不变 */
  assert.strictEqual(g('钢琴伴奏'), '|gangqin||||acc||'); assert.strictEqual(g('伴奏谱'), '|gangqin||||acc||'); assert.strictEqual(g('合唱'), '|hechang||||||only');
  /* 即兴伴奏一族＝考编专题（同「即兴伴奏」口径；不被「教资 / 考编 + 儿歌 → 师范」那条吃掉） */
  for (const q of ['即兴伴奏', '钢琴即兴伴奏', '即兴伴奏谱']) assert.strictEqual(g(q), '||||kaobian|||', q);
  assert.strictEqual(g('送别 即兴伴奏谱'), '送别||||kaobian|||');
  assert.strictEqual(g('钢琴即兴伴奏 儿歌'), '||||kaobian|||', '即兴伴奏不改落师范（儿歌照常作风格）');
  assert.strictEqual(P.parse('钢琴即兴伴奏 儿歌').style, 'erge');
  assert.strictEqual(g('教资 儿歌弹唱'), '||||shifan|||');
  /* §十三 搜索解析误伤：和弦谱 / C调葫芦丝 / 大全 / 单独简谱 / 黄河大合唱 都不变 */
  assert.strictEqual(g('黄河大合唱'), '黄河大合唱|||||||'); assert.strictEqual(g('简谱'), '|jianpu||||||only');
  assert.strictEqual(P.parse('C调葫芦丝').key, ''); assert.strictEqual(P.parse('晴天 和弦谱').tail, 'tab'); assert.strictEqual(g('二胡曲谱大全'), '|||erhu||||');
  /* 0 结果退路说明带上伴奏条件 */
  assert.strictEqual(P.fbNote(P.parse('送别 合唱 带伴奏')), '没有「送别」的带伴奏合唱谱，下面是其他谱');
  assert.strictEqual(P.fbNote(P.parse('送别 无伴奏')), '没有「送别」的无伴奏合唱谱，下面是其他谱');
});

/* ---------- v70.0 P2a 第 0 步（规格 docs/spec-2026-11-v700.md §2 / §4 / §5 / §3.5）：乐器表补 6 种、谱名两条新规则、判法表第 11 行、intentOf 导出、清洗白名单 ---------- */
const HTML = () => fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8');
const litOf = (src, head, tail) => { const a = src.indexOf(head); assert.ok(a >= 0, '读不到 ' + head); const b = src.indexOf(tail, a + head.length); return new Function('return ' + src.slice(a + head.length - 1, b + 1))(); };
const NWI = () => litOf(HTML(), 'const NW_INSTS=[', '];');
const OLD22 = { guitar: ['吉他', 'tab'], uku: ['尤克里里', 'tab'], bass: ['贝斯', 'staff'], piano: ['钢琴', 'kbd'], epiano: ['电钢琴', 'kbd'], synth: ['电子琴', 'kbd'], accordion: ['手风琴', 'kbd'],
  violin: ['小提琴', 'staff'], flute: ['长笛', 'staff'], sax: ['萨克斯', 'staff'], trumpet: ['小号', 'staff'], horn: ['圆号', 'staff'], trombone: ['长号', 'staff'],
  erhu: ['二胡', 'jianpu'], dizi: ['笛子', 'jianpu'], hulusi: ['葫芦丝', 'jianpu'], suona: ['唢呐', 'jianpu'], guzheng: ['古筝', 'jianpu'], pipa: ['琵琶', 'jianpu'], yangqin: ['扬琴', 'jianpu'], harmonica: ['口琴', 'jianpu'], other: ['其他器乐', 'other'] };
/* §4.1 表：instKey → [名字, fam, clef, tim, grp, INST_PQ, INST_ICON] */
const NEW6 = { recorder: ['竖笛', 'jianpu', undefined, 'flute', '课堂乐器 · 简谱', 'inst-flute', 'flute'], melodica: ['口风琴', 'jianpu', undefined, 'strings', '课堂乐器 · 简谱', 'inst-harmonica', 'harmonica'],
  ocarina: ['陶笛', 'jianpu', undefined, 'flute', '课堂乐器 · 简谱', 'inst-hulusi', 'hulusi'], xiao: ['箫', 'jianpu', undefined, 'flute', '民乐 · 简谱', 'inst-dizi', 'dizi'],
  cello: ['大提琴', 'staff', 'bass', 'strings', '西洋管弦 · 五线谱', 'inst-violin', 'violin'], clarinet: ['单簧管', 'staff', 'staff', 'flute', '西洋管弦 · 五线谱', 'inst-sax', 'sax'] };
const KEYS28 = ['guitar', 'uku', 'bass', 'piano', 'epiano', 'synth', 'accordion', 'violin', 'flute', 'sax', 'trumpet', 'horn', 'trombone', 'cello', 'clarinet',
  'erhu', 'dizi', 'hulusi', 'suona', 'guzheng', 'pipa', 'yangqin', 'harmonica', 'recorder', 'melodica', 'ocarina', 'xiao', 'other'];
T('P2a 乐器表补 6 种：INST / INST_FAM / NW_INSTS 28 键同序（管弦两种接长号后、简谱族四种接口琴后、other 最后）；旧 22 键名义逐项不变；新 6 行 fam / clef / tim / grp / nx:1 照 §4.1', () => {
  assert.deepStrictEqual(Object.keys(K.INST), KEYS28); assert.deepStrictEqual(Object.keys(K.INST_FAM), KEYS28);
  const nw = NWI(); assert.deepStrictEqual(nw.map(x => x.k), KEYS28);
  for (const [k, [nm, fam]] of Object.entries(OLD22)) { assert.strictEqual(K.INST[k], nm, k); assert.strictEqual(K.INST_FAM[k], fam, k); const r = nw.find(x => x.k === k); assert.ok(r && r.name === nm && r.fam === fam && !r.nx, k + ' 旧行变了'); }
  for (const [k, [nm, fam, clef, tim, grp]] of Object.entries(NEW6)) {
    assert.strictEqual(K.INST[k], nm, k); assert.strictEqual(K.INST_FAM[k], fam, k); assert.strictEqual(K.instName(k), nm, k);
    const r = nw.find(x => x.k === k); assert.deepStrictEqual([r.name, r.fam, r.clef, r.tim, r.grp, r.nx], [nm, fam, clef, tim, grp, 1], k);
  }
  assert.strictEqual(nw.filter(x => x.nx).length, 6); assert.strictEqual(nw.filter(x => x.fam !== 'tab' && !x.nx).length, 20, '旧外壳 / ?next=0 / 手机的旧清单仍是 20 种');
  /* 新建面板的旧清单 NWP.INSTS 滤掉 nx（界面零变化；新形态列出它们由 nwP2A() 接线） */
  assert.ok(/const INSTS = NW_INSTS\.filter\(x=>x\.fam!=='tab' && !x\.nx\);/.test(HTML()), 'NWP.INSTS 没滤掉 nx:1 的新乐器');
});
T('P2a 图标表：INST_PQ / INST_ICON 覆盖 28 键（＋人声），6 种新乐器映射到同族已有图标（§4.1，不新增图标）', () => {
  const h = HTML(), pq = litOf(h, 'var INST_PQ = {', '};'), ic = litOf(h, 'const INST_ICON={', '};');
  for (const k of KEYS28) { assert.ok(typeof pq[k] === 'string', 'INST_PQ 缺 ' + k); assert.ok(typeof ic[k] === 'string', 'INST_ICON 缺 ' + k); }
  const oldPq = new Set(Object.keys(OLD22).map(k => pq[k]).concat(pq.vocal)), oldIc = new Set(Object.keys(OLD22).map(k => ic[k]).concat(ic.vocal));
  for (const [k, v] of Object.entries(NEW6)) { assert.strictEqual(pq[k], v[5], k); assert.strictEqual(ic[k], v[6], k); assert.ok(oldPq.has(pq[k]) && oldIc.has(ic[k]), k + ' 用了新图标'); }
});
T('P2a 官网 site/pyq.js 抄本：INST / INST_FAM 键序＝PQ_KIND（名字除 other 官网写「其他」外相同）；MEL＝共享段 LIB_MEL', () => {
  const py = fs.readFileSync(path.join(ROOT, 'muse-tab/site/pyq.js'), 'utf8'), seg = fs.readFileSync(path.join(__dirname, 'kindname.js'), 'utf8');
  const I = litOf(py, 'const INST = {', '};'), F = litOf(py, 'const INST_FAM = {', '};'), M = litOf(py, 'const MEL = {', '};'), LM = litOf(seg, 'const LIB_MEL = {', '};');
  assert.deepStrictEqual(Object.keys(I), KEYS28); assert.deepStrictEqual(F, K.INST_FAM); assert.deepStrictEqual(Object.keys(F), KEYS28);
  for (const k of KEYS28) assert.strictEqual(I[k], k === 'other' ? '其他' : K.INST[k], k);
  assert.deepStrictEqual(M, LM); for (const k of Object.keys(NEW6)) assert.strictEqual(LM[k], 1, 'LIB_MEL 缺 ' + k);
});
T('P2a IK_ALIAS：6 种新乐器按音轨名认（竖笛排在长笛前、箫在笛子后）；旧乐器与人声 / 钢琴反例不误判', () => {
  const ik = n => K.ikOf({ voxVoices: [n] });
  const want = { Recorder: 'recorder', Recorders: 'recorder', 'Recorder 1': 'recorder', Blockflöte: 'recorder', Blockflote: 'recorder', 'Flauto dolce': 'recorder', 'Rec.': 'recorder', 竖笛: 'recorder', 直笛: 'recorder', '高音竖笛': 'recorder',
    Melodica: 'melodica', Pianica: 'melodica', 口风琴: 'melodica', Ocarina: 'ocarina', 'Ocarina 1': 'ocarina', 陶笛: 'ocarina',
    Xiao: 'xiao', 'Xiao 2': 'xiao', 洞箫: 'xiao', 箫: 'xiao', Violoncello: 'cello', Violoncellos: 'cello', Cello: 'cello', 'Cello 1': 'cello', 'Vc.': 'cello', Vlc: 'cello', 大提琴: 'cello',
    Clarinet: 'clarinet', 'Clarinet in Bb': 'clarinet', Clarinets: 'clarinet', Clarinetto: 'clarinet', Klarinette: 'clarinet', 'Cl.': 'clarinet', 'Clar. 2': 'clarinet', 单簧管: 'clarinet', 黑管: 'clarinet',
    /* 反例：旧乐器照旧、人声 / 钢琴 / 单独 Bass 不认、形近词不误判 */
    Violin: 'violin', 'Vln.': 'violin', Flute: 'flute', 'Fl.': 'flute', Flauto: 'flute', 笛子: 'dizi', 口琴: 'harmonica', Viola: '', 'English Horn': '', Voice: '', Bass: '', 'Piano·右手': '', Recitative: '', Clavier: '', Xiaoming: '', Celesta: '' };
  for (const [n, k] of Object.entries(want)) assert.strictEqual(ik(n), k, n);
  assert.notStrictEqual(ik('笛箫'), 'xiao', '「笛箫」不归箫');
  const seg = fs.readFileSync(path.join(__dirname, 'kindname.js'), 'utf8');
  assert.ok(seg.indexOf("['recorder',") < seg.indexOf("['flute',") && seg.indexOf("['dizi',") < seg.indexOf("['xiao',"), '别名表顺序：竖笛须在长笛前、箫在笛子后');
});
T('P2a 谱名：拍板 11 ctxOf.pno 只在 J / S 多声部且有钢琴花括号组时为真、有词合唱才加「（含钢琴伴奏）」；拍板 22 后半 JG / SG 无词带乐器身份「X＋钢琴伴奏谱（简谱 / 五线谱）」', () => {
  assert.strictEqual(K.kindName('J', { nVox: 2, lyr: true, pno: true }), '简谱合唱谱（含钢琴伴奏）');
  assert.strictEqual(K.kindName('S', { nVox: 4, lyr: true, pno: true }), '五线谱合唱谱（含钢琴伴奏）');
  assert.strictEqual(K.kindName('J', { nVox: 2, pno: true }), '简谱重奏谱'); assert.strictEqual(K.kindName('S', { nVox: 2, pno: true }), '五线谱重奏谱');
  assert.strictEqual(K.kindName('J', { nVox: 2, pno: true, instKey: 'erhu' }), '二胡谱（简谱）');
  assert.strictEqual(K.kindName('J', { lyr: true, pno: true }), '简谱歌谱', '单声部不看 pno');
  assert.strictEqual(K.kindName('JG', { instKey: 'violin' }), '小提琴＋钢琴伴奏谱（简谱）'); assert.strictEqual(K.kindName('JG', { instKey: 'violin', lyr: true }), '钢琴伴奏歌谱');
  assert.strictEqual(K.kindName('JG', {}), '钢琴伴奏歌谱'); assert.strictEqual(K.kindName('JG', { instKey: 'piano' }), '钢琴伴奏歌谱');
  assert.strictEqual(K.kindName('SG', { instKey: 'clarinet' }), '单簧管＋钢琴伴奏谱（五线谱）'); assert.strictEqual(K.kindName('SG', { instKey: 'other' }), '器乐＋钢琴伴奏谱（五线谱）');
  assert.strictEqual(K.kindName('SG', {}), '旋律＋钢琴伴奏谱（五线谱）'); assert.strictEqual(K.kindName('SG', { instKey: 'cello', lyr: true }), '钢琴伴奏歌谱（五线谱）');
  assert.strictEqual(K.kindName('SJG', { instKey: 'erhu' }), '教学对照谱（含伴奏）', '对照谱不受影响');
  const pno = d => K.ctxOf(JSON.parse(JSON.stringify(d))).pno;
  assert.strictEqual(pno(vox(['女高', '女低', '右手', '左手'], [undefined, undefined, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }, true)), true);
  assert.strictEqual(pno(vox(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], null, true)), false, 'SATB 无钢琴');
  assert.strictEqual(pno(vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)] }, true)), false, 'JG 不算');
  assert.strictEqual(pno(vox(['右手', '左手'], ['staff', 'bass'])), false, 'G 不算');
  assert.strictEqual(pno(vox(['旋律', '钢琴右', '钢琴左'], [undefined, 'staff', 'bass'])), false, '单行简谱＋推断钢琴（单声部）不算');
  for (const d of [{}, { voxVoices: ['a', 'b'] }, { voxVoices: ['a', 'b'], voxNotations: ['staff', 'bass'], voxGroups: 5 }]) assert.strictEqual(typeof K.ctxOf(d).pno, 'boolean', JSON.stringify(d));
  /* 名实一致：合唱谱＋钢琴 → 主谱种合唱谱、也在 钢琴谱 › 伴奏；X＋钢琴伴奏谱（简谱）→ 简谱 › 器乐（X）、也在 钢琴谱 › 伴奏（第 10 行，归属不变） */
  const pz = d => { const r = K.pzOf(JSON.parse(JSON.stringify(d))); return [r.row, r.pz + '.' + r.sub, r.inst, r.also.join(',')].join(' '); };
  assert.strictEqual(pz(vox(['女高', '女低', '右手', '左手'], [undefined, undefined, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)], lyricLines: 1 })), '15b hechang.jianpu  jianpu.hechang,gangqin.banzou');
  assert.strictEqual(pz(vox(['S', 'A', 'T', 'B', '右手', '左手'], ['staff', 'staff', 'staff', 'bass', 'staff', 'bass'], { voxGroups: [BR(0, 3), BC(4, 5)], lyricLines: 1 })), '16 hechang.wuxian  wuxian.hechang,gangqin.banzou');
  assert.strictEqual(pz(vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'erhu' })), '10 jianpu.qiyue erhu gangqin.banzou');
  assert.strictEqual(pz(vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [BC(1, 2)], instKey: 'cello' })), '10 wuxian.qiyue cello gangqin.banzou');
});
T('P2a 判法表第 11 行加 vocal：歌谱＋钢琴伴奏还没填词（JG / SG）归 钢琴谱 › 弹唱、也在 简谱 / 五线谱 › 歌曲；没写 intent 的老谱照旧 12 / 13', () => {
  const pz = d => { const r = K.pzOf(JSON.parse(JSON.stringify(d))); return [r.row, r.pz + '.' + r.sub, r.inst, r.also.join(',')].join(' '); };
  const jg = o => vox(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], Object.assign({ voxGroups: [BC(1, 2)] }, o)), sg = o => vox(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], Object.assign({ voxGroups: [BC(1, 2)] }, o));
  assert.strictEqual(pz(jg({ intent: 'vocal' })), '11 gangqin.tanchang  jianpu.gequ'); assert.strictEqual(pz(sg({ intent: 'vocal' })), '11 gangqin.tanchang  wuxian.gequ');
  assert.strictEqual(pz(jg({ intent: 'pacc' })), '11 gangqin.tanchang  jianpu.gequ'); assert.strictEqual(pz(jg({ intent: 'kids' })), '11 gangqin.tanchang  jianpu.erge');
  assert.strictEqual(pz(jg({})), '12 gangqin.tanchang  jianpu.gequ'); assert.strictEqual(pz(sg({})), '13 gangqin.banzou other wuxian.qiyue');
  assert.strictEqual(pz(sg({ intent: 'inst' })), '13 gangqin.banzou other wuxian.qiyue', 'inst 不进第 11 行');
  assert.strictEqual(pz(jg({ intent: 'vocal', instKey: 'erhu' })), '10 jianpu.qiyue erhu gangqin.banzou', '带乐器身份先命中第 10 行');
});
T('P2a 按音轨名认出新乐器（§4.3 有意的派生变化）：没有 instKey 的老导入谱 大提琴 / 单簧管 / 竖笛 改落 器乐（第 18 行），谱名不变（谱名只读 instKey）', () => {
  const pz = d => { const r = K.pzOf(JSON.parse(JSON.stringify(d))); return [r.row, r.pz + '.' + r.sub, r.inst].join(' '); };
  assert.strictEqual(pz(vox(['Violoncello'], ['bass'])), '18 wuxian.qiyue cello'); assert.strictEqual(K.nameOf(vox(['Violoncello'], ['bass'])), '五线谱旋律');
  assert.strictEqual(pz(vox(['Clarinet in Bb'], ['staff'])), '18 wuxian.qiyue clarinet');
  assert.strictEqual(pz(vox(['竖笛'], [undefined])), '18 jianpu.qiyue recorder'); assert.strictEqual(K.nameOf(vox(['竖笛'], [undefined])), '简谱歌谱');
  /* 基线（PREV 副本＝分类升级前的规则；ikOf 起于 P0，这里只核「改落」不是落到别处） */
  assert.strictEqual(pz(vox(['Voice'], ['staff'])), '24 wuxian.shichang ');
});
T('P2a intentOf 导出：只认 11 个用途 id，其余（不是字符串 / 不在表里 / 原型链键 / 坏谱）＝没写', () => {
  assert.strictEqual(typeof K.intentOf, 'function');
  for (const id of K.INTENTS) assert.strictEqual(K.intentOf({ intent: id }), id);
  for (const v of ['', 'zzz', 'Sight', ' sight', 'constructor', '__proto__', 'toString', 5, null, {}, ['kids'], true]) assert.strictEqual(K.intentOf({ intent: v }), '', JSON.stringify(v));
  for (const d of [null, undefined, 0, 'kids', [], {}]) assert.strictEqual(K.intentOf(d), '', String(d));
});
T('P2a 清洗白名单（§3.5）：服务端 SD_CODE / SD_TOP_SCALAR 含 intent；11 个合法值经编辑器 normalizeSongFields / sanitizeUntrusted 与服务端 sanitizeLike 逐字节不变；<b> 被剥 / 被拒收；顶层 intent 是对象 / 数组拒收', () => {
  const SD = require('./scoredata'), vm = require('node:vm'), h = HTML();
  assert.ok(SD.SD_CODE.has('intent') && SD.SD_TOP_SCALAR.has('intent'));
  /* 编辑器 SAN_* 按规格不加 intent（短码默认分支） */
  for (const n of ['SAN_NUM', 'SAN_FREE']) assert.ok(!new RegExp('const ' + n + " = new Set\\(\\[[^\\]]*'intent'").test(h), n + ' 不该登记 intent');
  const grab = re => { const m = re.exec(h); assert.ok(m, '读不到 ' + re); return m[0]; };
  const ctx = vm.createContext({});
  vm.runInContext([grab(/const SAN_NUM = new Set\(\[[^\]]*\]\);/), grab(/const SAN_ENUM_KEEP = \{dyn:new Set\(\['<','>'\]\)\};/), grab(/const SAN_FREE = new Set\(\[[^\]]*\]\);/),
    grab(/function normalizeSongFields\(v, key\)\{[\s\S]*?\n\}/), grab(/function sanitizeUntrusted\(v, key\)\{[\s\S]*?\n\}/), 'this.N=normalizeSongFields; this.S=sanitizeUntrusted;'].join('\n'), ctx);
  const base = () => ({ v: 3, title: 't', tabVoices: [], voxVoices: ['旋律'], lyricLines: 0, measures: [{ tabs: [], voxes: [[{ dur: 4, deg: 1 }]] }] });
  for (const id of K.INTENTS) {
    const d = Object.assign(base(), { intent: id }), j = JSON.stringify(d);
    assert.strictEqual(JSON.stringify(ctx.N(JSON.parse(j))), j, 'normalizeSongFields ' + id);
    assert.strictEqual(JSON.stringify(ctx.S(JSON.parse(j))), j, 'sanitizeUntrusted ' + id);
    assert.strictEqual(JSON.stringify(K.sanitizeLike(JSON.parse(j))), j, 'sanitizeLike ' + id);
    assert.strictEqual(SD.scoreDataDanger(JSON.parse(j), '', 'data', 0), null, 'scoreDataDanger ' + id);
  }
  const bad = Object.assign(base(), { intent: '<b>' });
  assert.strictEqual(ctx.N(JSON.parse(JSON.stringify(bad))).intent, 'b'); assert.strictEqual(ctx.S(JSON.parse(JSON.stringify(bad))).intent, 'b'); assert.strictEqual(K.sanitizeLike(JSON.parse(JSON.stringify(bad))).intent, 'b');
  assert.ok(/data\.intent/.test(SD.scoreDataDanger(JSON.parse(JSON.stringify(bad)), '', 'data', 0) || ''), '<b> 未拒收');
  for (const v of [{}, { toString: 1 }, ['kids']]) { const r = SD.scoreDataDanger(Object.assign(base(), { intent: v }), '', 'data', 0); assert.ok(r && r.includes('data.intent'), JSON.stringify(v) + ' 未拒收：' + r); }
  /* 不认识的值不剥、不拒（「拒绝危险，不拒绝陌生」）：留在数据里、intentOf 当没写 */
  const z = Object.assign(base(), { intent: 'zzz' }); assert.strictEqual(SD.scoreDataDanger(z, '', 'data', 0), null); assert.strictEqual(K.sanitizeLike(z).intent, 'zzz'); assert.strictEqual(K.intentOf(z), '');
});
T('P2a 新全局 nwP2A()：函数声明、只此一处、在 var NWP 之前（免 TDZ），与面板 NXP() 同口径但不读面板状态 st', () => {
  const h = HTML(), m = h.match(/\nfunction nwP2A\(\)\{\n([\s\S]*?)\n\}/g) || [];
  assert.strictEqual(m.length, 1, 'nwP2A 声明 ' + m.length + ' 处'); assert.ok(h.indexOf('\nfunction nwP2A(){') < h.indexOf('\nvar NWP = (function(){'));
  assert.ok(/!isMobileNew\(\) && typeof flowOn==='function' && flowOn\(\) && FLOW\.nxOn\(\) && !document\.body\.classList\.contains\('flw-m'\)/.test(m[0]) && !/\bst\b/.test(m[0].replace(/\/\*[\s\S]*?\*\//g, '')), m[0]);
});

T('P2a pzq 新乐器词（§4.4）：竖笛 / 直笛 / 口风琴 / 陶笛 / 箫 / 洞箫 / 大提琴 / 单簧管 / 黑管 → 6 个新 instKey；箫 / 洞箫从「只认调」挪进乐器词（笛箫仍归笛子、巴乌照旧只认调）；箫 / 陶笛 / 竖笛 / 单簧管的调只排序不筛', () => {
  const P = require('./pzq');
  const g = q => { const r = P.parse(q); return [r.words, r.pz, r.sub, r.inst, r.key, r.keySort].join('|'); };
  const W = { 竖笛: 'recorder', 直笛: 'recorder', 口风琴: 'melodica', 陶笛: 'ocarina', 箫: 'xiao', 洞箫: 'xiao', 大提琴: 'cello', 单簧管: 'clarinet', 黑管: 'clarinet' };
  Object.keys(W).forEach(w => { assert.strictEqual(g(w), '|||' + W[w] + '||', w); assert.strictEqual(g('欢乐颂 ' + w + '谱'), '欢乐颂|||' + W[w] + '||', w + '谱'); });
  assert.strictEqual(g('洞箫 春江花月夜'), '春江花月夜|||xiao||', '洞箫此前只认调、整词丢掉；现在是乐器条件');
  assert.strictEqual(g('箫简谱'), '|jianpu|qiyue|xiao||'); assert.strictEqual(g('大提琴五线谱'), '|wuxian|qiyue|cello||');
  assert.strictEqual(g('G调箫'), '|||xiao||G', '箫的调＝乐器的调：不筛只排序'); assert.strictEqual(g('C调陶笛'), '|||ocarina||C');
  assert.strictEqual(g('降B调单簧管'), '|||clarinet||Bb'); assert.strictEqual(g('竖笛 C调'), '|||recorder||C');
  assert.strictEqual(g('大提琴 C调'), '|||cello|C|', '大提琴是实音乐器：调照旧筛');
  assert.strictEqual(g('笛箫'), '|||dizi||', '笛箫仍归笛子'); assert.strictEqual(g('F调巴乌'), '|||||F', '巴乌照旧只认调'); assert.strictEqual(g('巴乌'), '|||||');
  const m = P.parse('欢乐颂 黑管'); assert.ok(m.conds.length === 1 && m.conds[0].label === '乐器：单簧管' && m.conds[0].rm === '欢乐颂', JSON.stringify(m.conds));
  const t = P.targets().inst; ['recorder', 'melodica', 'ocarina', 'xiao', 'cello', 'clarinet'].forEach(k => { assert.ok(t.indexOf(k) >= 0, 'pzq 认 ' + k); assert.ok(K.own(K.INST, k), k); });
});

/* ---------- v70.5 A 组第 0 步（规格 docs/spec-2026-11-v705.md §1.2 / §1.7 / §2 / §10.3 第 1–6 条）：同谱表双声部的合法性与谱表视图 ----------
   voxLayerLinks / voxLayerOk / layerRows / collapseLayers 在共享段（编辑器与服务端同一份）；本步分类入口还没接，等价金表经视图核（f(collapseLayers(s,'kind'))＝f(oracle)），
   接入后同一批夹具改成直接核 f(s)。浏览器侧的改声部路径 / 谱表级同步 / 旧版本编辑见 muse-tab/tests/tv_v705data.js（A 组后续提交） */
const vm5 = require('node:vm');
const J5 = x => JSON.stringify(x);
/* 造分层谱：names 声部名、nota 记谱法（undefined＝简谱）、lay＝voxLayer（undefined＝不写键）、ly＝填词的行下标；
   见证 mixer['vox:i'].lay=1 默认写在 lay[i]===1 的行上，o.w 指定写在哪几行（覆盖缺省）、o.w=[] 不写 */
const LV = (names, nota, lay, o, ly) => {
  o = Object.assign({}, o); const w = o.w; delete o.w;
  const wr = w || (Array.isArray(lay) ? lay.map((x, i) => (x === 1 ? i : -1)).filter(i => i >= 0) : []);
  const mixer = {}; names.forEach((_, i) => { mixer['vox:' + i] = { on: true, solo: false, inst: 'piano', vol: 1, pan: null }; if (wr.includes(i)) mixer['vox:' + i].lay = 1; });
  const d = { v: 3, title: 't', tabVoices: [], voxVoices: names, voxNotations: nota, lyricLines: (ly && ly.length) ? 1 : 0, mixer,
    measures: [{ tabs: [], voxes: names.map((_, i) => [{ dur: 4, deg: 1, oct: 0, acc: '', lyrics: (ly || []).includes(i) ? ['啊'] : [] }, { dur: 4, deg: 0, oct: 0, acc: '', lyrics: [] }]) }] };
  if (lay !== undefined) d.voxLayer = lay;
  return Object.assign(d, o);
};
const ST2 = ['staff', 'staff'], ST3 = ['staff', 'staff', 'staff'];
/* 编辑器内联段在 vm 里再跑一份（§10.3-1「编辑器内联段与服务端各一次」）；跨 realm 的数组只比 JSON */
const EDK = (() => { const h = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8'), a = h.indexOf('/* @pq-kindname begin'), b = h.indexOf('/* @pq-kindname end */');
  const ctx = vm5.createContext({}); vm5.runInContext(h.slice(a, b) + '\nthis.K = PQ_KIND;', ctx); return ctx.K; })();
const okShape = (r, n) => r === null || (Array.isArray(r) && r.length === n && r.every(x => x === 0 || x === 1));
/* [类别, 谱, 期望 voxLayerLinks, 期望 voxLayerOk, 期望 voxLayerOk(s,'sync')]（null 或逐行 0 / 1） */
const LBAD = [
  ['合法：钢琴右手双声部', LV(['RH', 'RH·2', 'LH'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [BC(0, 2)] }), [0, 1, 0], [0, 1, 0], [0, 1, 0]],
  ['合法：中音谱表两行', LV(['Va', 'Va·2'], ['alto', 'alto'], [null, 1]), [0, 1], [0, 1], [0, 1]],
  ['越界：voxLayer[0]===1', LV(['甲', '乙'], ST2, [1, null]), null, null, null],
  ['越界：[1,1]——第 1 行因上一行原值是 1 同样独立', LV(['甲', '乙'], ST2, [1, 1]), null, null, null],
  ['指向自己 / 绝对下标：0（带见证）', LV(['甲', '乙'], ST2, [null, 0], { w: [1] }), null, null, null],
  ['指向自己 / 绝对下标：2（带见证）', LV(['甲', '乙', '丙'], ST3, [null, 2, null], { w: [1] }), null, null, null],
  ['指向自己 / 绝对下标：-1（带见证）', LV(['甲', '乙'], ST2, [null, -1], { w: [1] }), null, null, null],
  ['链式 / 成环：[null,1,1] 只有第 1 行是层', LV(['甲', '甲·2', '甲·3'], ST3, [null, 1, 1]), [0, 1, 0], [0, 1, 0], [0, 1, 0]],
  ['记谱法不同：宿主高音、层低音', LV(['甲', '甲·2'], ['staff', 'bass'], [null, 1]), [0, 1], null, null],
  ['记谱法不同：宿主简谱、层五线', LV(['甲', '甲·2'], [undefined, 'staff'], [null, 1]), [0, 1], null, null],
  ['记谱法不同：宿主五线、层简谱', LV(['甲', '甲·2'], ['staff', undefined], [null, 1]), [0, 1], null, null],
  ['两行都是简谱：不生效，一致对成立（sync 不要求五线谱）', LV(['甲', '甲·2'], [undefined, undefined], [null, 1]), [0, 1], null, [0, 1]],
  ['谱号八度不同（旧版本只改了一行的 voxClefOct）', LV(['T', 'T·2'], ST2, [null, 1], { voxClefOct: [null, -1] }), [0, 1], null, null],
  ['移调不同（旧版本只改了一行的 voxTransp）', LV(['Cl', 'Cl·2'], ST2, [null, 1], { voxTransp: [2, 0] }), [0, 1], null, null],
  ['谱号八度 / 移调归一后相等：0 与 null、2 当 0、-12.2 与 -12 取整', LV(['甲', '甲·2'], ST2, [null, 1], { voxClefOct: [2, null], voxTransp: [-12.2, -12] }), [0, 1], [0, 1], [0, 1]],
  ['长度不等：长', LV(['甲', '甲·2'], ST2, [null, 1, null]), null, null, null],
  ['长度不等：短', LV(['甲', '甲·2', '乙'], ST3, [null, 1]), null, null, null],
  ['非数组：对象', LV(['甲', '甲·2'], ST2, { 1: 1 }, { w: [1] }), null, null, null],
  ['非数组：字符串', LV(['甲', '甲·2'], ST2, '01', { w: [1] }), null, null, null],
  ['非数组：数字', LV(['甲', '甲·2'], ST2, 1, { w: [1] }), null, null, null],
  ['值类型：清洗前的 "1"', LV(['甲', '甲·2'], ST2, [null, '1'], { w: [1] }), null, null, null],
  ['值类型：true', LV(['甲', '甲·2'], ST2, [null, true], { w: [1] }), null, null, null],
  ['值类型：NaN', LV(['甲', '甲·2'], ST2, [null, NaN], { w: [1] }), null, null, null],
  ['值类型：对象', LV(['甲', '甲·2'], ST2, [null, {}], { w: [1] }), null, null, null],
  ['整曲形态：chordOnly', LV(['甲', '甲·2'], ST2, [null, 1], { chordOnly: true }), [0, 1], null, null],
  ['整曲形态：func', LV(['甲', '甲·2'], ST2, [null, 1], { func: true }), [0, 1], null, null],
  ['缺见证：没有 mixer', (() => { const d = LV(['甲', '甲·2'], ST2, [null, 1]); delete d.mixer; return d; })(), null, null, null],
  ['缺见证：mixer 不是对象', LV(['甲', '甲·2'], ST2, [null, 1], { mixer: 'x' }), null, null, null],
  ['缺见证：mixer 里没有 vox:1 的见证', LV(['甲', '甲·2'], ST2, [null, 1], { w: [] }), null, null, null],
  ['缺见证：vox:1 不是对象', (() => { const d = LV(['甲', '甲·2'], ST2, [null, 1]); d.mixer['vox:1'] = 1; return d; })(), null, null, null],
  ['缺见证：见证写在宿主行上', LV(['甲', '甲·2'], ST2, [null, 1], { w: [0] }), null, null, null],
  ['缺见证：lay 是 "1"（清洗前）', (() => { const d = LV(['甲', '甲·2'], ST2, [null, 1]); d.mixer['vox:1'].lay = '1'; return d; })(), null, null, null],
  ['缺见证：lay 是 true', (() => { const d = LV(['甲', '甲·2'], ST2, [null, 1]); d.mixer['vox:1'].lay = true; return d; })(), null, null, null],
  ['缺见证：lay 是 2', (() => { const d = LV(['甲', '甲·2'], ST2, [null, 1]); d.mixer['vox:1'].lay = 2; return d; })(), null, null, null],
  ['跨组边界：显式合法组 from===i（换谱类重建的 brace {1,2}）', LV(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [BC(1, 2)] }), null, null, null],
  ['跨组边界：显式合法组 to===i−1', LV(['X', 'A', 'A·2'], ST3, [null, null, 1], { voxGroups: [BR(0, 1)] }), null, null, null],
  ['组覆盖宿主与层：不是边界', LV(['X', 'A', 'A·2'], ST3, [null, null, 1], { voxGroups: [BR(0, 2)] }), [0, 0, 1], [0, 0, 1], [0, 0, 1]],
  ['不合法的组（越界 / 只占一行 / 坏类型 / null / 坏下标）不算边界', LV(['X', 'A', 'A·2'], ST3, [null, null, 1], { voxGroups: [BC(2, 5), BR(2, 2), { type: 'box', from: 1, to: 2 }, null, { type: 'brace', from: 'x', to: 'y' }] }), [0, 0, 1], [0, 0, 1], [0, 0, 1]],
];
const LB = name => { const r = LBAD.find(x => x[0] === name); assert.ok(r, '夹具 ' + name); return r[1]; };
const stripL = d => { const c = JSON.parse(J5(d)); delete c.voxLayer; if (c.mixer && typeof c.mixer === 'object') Object.values(c.mixer).forEach(e => { if (e && typeof e === 'object') delete e.lay; }); return c; };
const FN5 = ['stackOf', 'docTypeOf', 'nameOf', 'isChoir', 'isPianoAccStack', 'ctxOf', 'pzOf', 'facetsOf', 'groupsOf'];
const sig5 = (k, d) => FN5.map(f => f + '=' + J5(k[f](d))).join(' | ');
T('v70.5 voxLayerLinks / voxLayerOk 坏数据十一类（规格 §1.2 表）：服务端与编辑器内联段同值；不抛、只返回 null 或逐行 0 / 1、不改入参；1e5 行 <50ms', () => {
  assert.ok(['voxLayerLinks', 'voxLayerOk', 'layerRows', 'collapseLayers'].every(f => typeof K[f] === 'function' && typeof EDK[f] === 'function'), '导出表缺四函数');
  for (const [name, d, eL, eO, eS] of LBAD) {
    const n = d.voxVoices.length, before = J5(d);
    for (const k of [K, EDK]) {
      const L = k.voxLayerLinks(d), O = k.voxLayerOk(d), S = k.voxLayerOk(d, 'sync');
      assert.ok(okShape(L, n) && okShape(O, n) && okShape(S, n), name + ' 形态');
      assert.strictEqual(J5(L), J5(eL), name + ' voxLayerLinks'); assert.strictEqual(J5(O), J5(eO), name + ' voxLayerOk'); assert.strictEqual(J5(S), J5(eS), name + " voxLayerOk 'sync'");
      k.layerRows(d); k.layerRows(d, 'kind'); k.collapseLayers(d); k.collapseLayers(d, 'kind');
      assert.strictEqual(J5(d), before, name + ' 只读');
    }
  }
  /* 非对象 / 坏谱：不抛 */
  for (const d of [null, undefined, 0, 'x', [], {}, { voxLayer: [null, 1] }, { voxLayer: [null, 1], voxVoices: 'ab' }, { voxLayer: [null, 1], voxVoices: ['a', 'b'], mixer: { 'vox:1': { lay: 1 } }, voxGroups: 'x' }])
    for (const k of [K, EDK]) { k.voxLayerLinks(d); k.voxLayerOk(d); k.voxLayerOk(d, 'sync'); k.layerRows(d); if (d && typeof d === 'object') { k.layerRows(d, 'kind'); k.collapseLayers(d, 'kind'); } }
  /* 1e5 行：单遍线性 */
  const N = 100000, big = { voxVoices: Array.from({ length: N }, (_, i) => 'v' + i), voxNotations: Array(N).fill('staff'), voxLayer: Array.from({ length: N }, (_, i) => (i % 2 ? 1 : null)), mixer: {}, voxGroups: [BC(0, N - 1)] };
  for (let i = 1; i < N; i += 2) big.mixer['vox:' + i] = { lay: 1 };
  let best = Infinity, r = null;
  for (let t = 0; t < 3; t++) { const t0 = process.hrtime.bigint(); r = K.voxLayerOk(big); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6); }
  assert.ok(r && r.length === N && r[1] === 1 && r[2] === 0 && r[N - 1] === 1, '1e5 行结果');
  assert.ok(best < 50, '1e5 行 voxLayerOk ' + best.toFixed(1) + 'ms ≥ 50ms');
});
T("v70.5 voxLayerOk(s,'sync') 与缺省只差「是五线谱」一条：生效的行一定一致；一致而不生效的行一定不是五线谱", () => {
  let extra = 0;
  for (const [name, d] of LBAD) {
    const O = K.voxLayerOk(d), S = K.voxLayerOk(d, 'sync'), vn = d.voxNotations || [];
    (O || []).forEach((x, i) => assert.ok(!x || (S && S[i] === 1), name + ' 第 ' + i + ' 行生效却不一致'));
    (S || []).forEach((x, i) => { if (x && !(O && O[i])) { extra++; assert.ok(!K.isStaffNota(vn[i]) && vn[i] === vn[i - 1], name + ' 第 ' + i + ' 行一致对多出了五线谱以外的理由'); } });
  }
  assert.ok(extra >= 1, '夹具里没有「一致而不生效」的例子');
});
T('v70.5 坏数据 oracle（§10.3-4）：判据不成立的谱 collapseLayers 两种视图都原样返回，分类函数＝删掉 voxLayer 与见证后的结果、不抛', () => {
  let n = 0;
  for (const [name, d, , eO] of LBAD) {
    if (eO) continue; n++;
    assert.strictEqual(K.collapseLayers(d), d, name); assert.strictEqual(K.collapseLayers(d, 'kind'), d, name);
    assert.strictEqual(K.layerRows(d), null, name); assert.strictEqual(K.layerRows(d, 'kind'), null, name);
    assert.strictEqual(sig5(K, d), sig5(K, stripL(d)), name);
  }
  assert.ok(n >= 30, '坏数据夹具 ' + n);
});
T('v70.5 collapseLayers：无层原样返回（===）；有层只剩宿主、分组映射、去掉 voxLayer、measures 同一引用；幂等、不改入参；voxHasLyrics 在视图上按单元换回行区间', () => {
  for (const [, s] of CASES) { assert.strictEqual(K.collapseLayers(s), s); assert.strictEqual(K.collapseLayers(s, 'kind'), s); assert.strictEqual(K.layerRows(s), null); assert.strictEqual(K.layerRows(s, 'kind'), null); }
  const F = LV(['RH', 'RH·2', 'LH', 'LH·2'], ['staff', 'staff', 'bass', 'bass'], [null, 1, null, 1],
    { voxGroups: [BC(0, 3), BR(0, 1), null, { type: 'brace', from: 'x' }], voxDual: [false, false, false, false], voxShort: ['R', null, 'L', null], voxTransp: [0, 0, 0, 0], voxClefOct: [0, 0, 0, 0] }, [3]);
  const before = J5(F);
  for (const k of [K, EDK]) {
    assert.strictEqual(J5(k.layerRows(F)), '{"rows":[[0,1],[2,3]],"of":[0,0,1,1]}');
    assert.strictEqual(J5(k.layerRows(F, 'kind')), '{"rows":[[0,1],[2,3]],"of":[0,0,1,1]}', '花括号里的层是器乐层（层行带词也折）');
    const V = k.collapseLayers(F);
    assert.ok(V !== F && !('voxLayer' in V) && V.measures === F.measures && V.mixer === F.mixer);
    assert.strictEqual(J5([V.voxVoices, V.voxNotations, V.voxDual, V.voxShort, V.voxTransp, V.voxClefOct]), '[["RH","LH"],["staff","bass"],[false,false],["R","L"],[0,0],[0,0]]');
    assert.strictEqual(J5(V.voxGroups), '[{"type":"brace","from":0,"to":1},null,{"type":"brace"}]', '映射后 to≤from 的组丢掉，坏组原样留给 groupsOf 过滤');
    assert.strictEqual(k.collapseLayers(V), V); assert.strictEqual(k.collapseLayers(V, 'kind'), V); assert.strictEqual(k.layerRows(V), null);
    assert.strictEqual(k.voxHasLyrics(V, 1, 1), true, '单元 1 ＝ 第 2–3 行（LH·2 有词）'); assert.strictEqual(k.voxHasLyrics(V, 0, 0), false);
    assert.strictEqual(k.voxHasLyrics(V, 2, 2), false, '越界单元＝没有'); assert.strictEqual(k.voxHasLyrics(F, 1, 1), false, '真谱仍是行空间');
    assert.strictEqual(J5(k.groupsOf(V)), '[{"type":"brace","from":0,"to":1}]', '视图上的组是单元下标');
    assert.strictEqual(J5(F), before, '只读');
  }
  /* 没写的逐声部数组不在视图里多出键 */
  const G = LV(['RH', 'RH·2', 'LH'], ['staff', 'staff', 'bass'], [null, 1, null]), VG = K.collapseLayers(G);
  assert.ok(VG !== G && !('voxDual' in VG) && !('voxShort' in VG) && !('voxClefOct' in VG) && !('voxTransp' in VG) && !('voxGroups' in VG), Object.keys(VG).join(','));
  /* 自有键 __proto__（坏数据）不会变成视图的原型 */
  const P = JSON.parse('{"v":3,"tabVoices":[],"voxVoices":["RH","RH·2","LH"],"voxNotations":["staff","staff","bass"],"voxLayer":[null,1,null],"mixer":{"vox:1":{"lay":1}},"__proto__":{"pianoAcc":true},"measures":[]}');
  const VP = K.collapseLayers(P); assert.ok(VP !== P && VP.pianoAcc === undefined && Object.getPrototypeOf(VP) === Object.prototype, '__proto__');
  /* 分类视图：声乐层（谱表有真歌词、不在花括号组里）不折，器乐层折 */
  const SATB = LV(['S', 'A', 'T', 'B'], ['staff', 'staff', 'bass', 'bass'], [null, 1, null, 1], { voxGroups: [BR(0, 3)] }, [0, 2]);
  assert.strictEqual(J5(K.layerRows(SATB)), '{"rows":[[0,1],[2,3]],"of":[0,0,1,1]}'); assert.strictEqual(K.layerRows(SATB, 'kind'), null); assert.strictEqual(K.collapseLayers(SATB, 'kind'), SATB);
  const CP = LV(['S', 'A', 'T', 'B', 'RH', 'RH·2', 'LH', 'LH·2'], ['staff', 'staff', 'bass', 'bass', 'staff', 'staff', 'bass', 'bass'], [null, 1, null, 1, null, 1, null, 1], { voxGroups: [BR(0, 3), BC(4, 7)] }, [0, 1, 2, 3]);
  assert.strictEqual(J5(K.layerRows(CP, 'kind').rows), '[[0],[1],[2],[3],[4,5],[6,7]]');
  const VC = K.collapseLayers(CP, 'kind'); assert.strictEqual(J5(VC.voxGroups), '[{"type":"bracket","from":0,"to":3},{"type":"brace","from":4,"to":5}]');
  assert.strictEqual(K.collapseLayers(VC, 'kind'), VC, '分类视图上再 collapse 返回它自己');
  assert.strictEqual(J5(K.layerRows(LV(['Vn', 'Vn·2'], ST2, [null, 1], { instKey: 'violin' }), 'kind')), '{"rows":[[0,1]],"of":[0,0]}', '无词小提琴双声部＝器乐层');
  assert.strictEqual(K.layerRows(LV(['Vn', 'Vn·2'], ST2, [null, 1], { instKey: 'violin' }, [1]), 'kind'), null, '层行有词、谱表不在花括号里＝声乐层');
});
/* 等价金表（§2.3）：[说明, 分层谱, oracle（期望等于它的分类结果）, 期望 stackOf, docTypeOf, nameOf（null＝只比 oracle）] */
const LGOLD = [
  ['钢琴 [RH, RH·2(层), LH]，显式 brace 0–2', LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [BC(0, 2)] }),
    LV(['右手', '左手'], ['staff', 'bass'], undefined, { voxGroups: [BC(0, 1)] }), 'G', 'piano', '钢琴独奏谱'],
  ['钢琴 [RH, RH·2(层), LH]，不写分组', LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null]), LV(['右手', '左手'], ['staff', 'bass']), 'G', 'piano', '钢琴独奏谱'],
  ['钢琴 [RH, LH, LH·2]', LV(['右手', '左手', '左手·2'], ['staff', 'bass', 'bass'], [null, null, 1], { voxGroups: [BC(0, 2)] }),
    LV(['右手', '左手'], ['staff', 'bass'], undefined, { voxGroups: [BC(0, 1)] }), 'G', 'piano', '钢琴独奏谱'],
  ['钢琴 [RH, RH·2, LH, LH·2]', LV(['右手', '右手·2', '左手', '左手·2'], ['staff', 'staff', 'bass', 'bass'], [null, 1, null, 1], { voxGroups: [BC(0, 3)] }),
    LV(['右手', '左手'], ['staff', 'bass'], undefined, { voxGroups: [BC(0, 1)] }), 'G', 'piano', '钢琴独奏谱'],
  ['右手带词的钢琴 [RH(词), RH·2, LH]＋显式 brace 0–2（花括号里＝器乐层）', LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [BC(0, 2)] }, [0]),
    LV(['右手', '左手'], ['staff', 'bass'], undefined, { voxGroups: [BC(0, 1)] }, [0]), 'G', 'piano', '钢琴独奏谱'],
  ['伴奏歌谱 [Mel(无词), Mel·2, RH, LH]，brace 2–3', LV(['旋律', '旋律·2', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'staff', 'bass'], [null, 1, null, null], { voxGroups: [BC(2, 3)] }),
    LV(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], undefined, { voxGroups: [BC(1, 2)] }), 'SG', 'instr', '旋律＋钢琴伴奏谱（五线谱）'],
  ['伴奏歌谱 [Mel(词), Mel·2, RH, LH]，brace 2–3（声乐层＝剥 voxLayer 的 4 行）', LV(['旋律', '旋律·2', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'staff', 'bass'], [null, 1, null, null], { voxGroups: [BC(2, 3)] }, [0]),
    LV(['旋律', '旋律·2', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'staff', 'bass'], undefined, { voxGroups: [BC(2, 3)] }, [0]), 'S', null, '五线谱合唱谱（含钢琴伴奏）'],
  ['[Mel(五线), RH, RH·2, LH]', LV(['旋律', '右手伴奏', '右手伴奏·2', '左手伴奏'], ['staff', 'staff', 'staff', 'bass'], [null, null, 1, null], { voxGroups: [BC(1, 3)] }),
    LV(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], undefined, { voxGroups: [BC(1, 2)] }), 'SG', null, null],
  ['[Mel(简谱), RH, RH·2, LH]', LV(['旋律', '右手伴奏', '右手伴奏·2', '左手伴奏'], [undefined, 'staff', 'staff', 'bass'], [null, null, 1, null], { voxGroups: [BC(1, 3)] }, [0]),
    LV(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], undefined, { voxGroups: [BC(1, 2)] }, [0]), 'JG', null, null],
  ['小提琴 [Vn, Vn·2]，instKey violin，无词', LV(['小提琴', '小提琴·2'], ST2, [null, 1], { instKey: 'violin' }), LV(['小提琴'], ['staff'], undefined, { instKey: 'violin' }), 'S', 'instr', '小提琴谱（五线谱）'],
  ['SATB 闭合谱 [S(词), A(层), T(词), B(层)]（剥 voxLayer）', LV(['S', 'A', 'T', 'B'], ['staff', 'staff', 'bass', 'bass'], [null, 1, null, 1], { voxGroups: [BR(0, 3)] }, [0, 2]),
    LV(['S', 'A', 'T', 'B'], ['staff', 'staff', 'bass', 'bass'], undefined, { voxGroups: [BR(0, 3)] }, [0, 2]), 'S', 'vocal', '五线谱合唱谱'],
  ['二部 [S(词), A(层)]（剥 voxLayer）', LV(['女高', '女低'], ST2, [null, 1], null, [0]), LV(['女高', '女低'], ST2, undefined, null, [0]), 'S', 'vocal', '五线谱合唱谱'],
  ['合唱＋钢琴，四张谱表各带层（S/A、T/B 带词，RH / LH 无词）', LV(['S', 'A', 'T', 'B', 'RH', 'RH·2', 'LH', 'LH·2'], ['staff', 'staff', 'bass', 'bass', 'staff', 'staff', 'bass', 'bass'], [null, 1, null, 1, null, 1, null, 1], { voxGroups: [BR(0, 3), BC(4, 7)] }, [0, 1, 2, 3]),
    LV(['S', 'A', 'T', 'B', 'RH', 'LH'], ['staff', 'staff', 'bass', 'bass', 'staff', 'bass'], undefined, { voxGroups: [BR(0, 3), BC(4, 5)] }, [0, 1, 2, 3]), 'S', 'vocal', '五线谱合唱谱（含钢琴伴奏）'],
];
const LG = name => { const r = LGOLD.find(x => x[0].startsWith(name)); assert.ok(r, '金表 ' + name); return r[1]; };
T("v70.5 等价金表（§2.3）：分类入口直接吃分层谱＝oracle、groupsOf 返回行空间；分类视图 collapseLayers(s,'kind') 上的 stackOf / docTypeOf / nameOf / isChoir / isPianoAccStack / ctxOf / pzOf / facetsOf / groupsOf＝oracle（服务端与编辑器内联段各一次）", () => {
  for (const [name, d, orc, eK, eD, eN] of LGOLD) {
    const before = J5(d);
    for (const k of [K, EDK]) {
      const V = k.collapseLayers(d, 'kind');
      assert.strictEqual(sig5(k, V), sig5(k, orc), name);
      if (eK) assert.strictEqual(k.stackOf(V), eK, name + ' stackOf'); if (eD) assert.strictEqual(k.docTypeOf(V), eD, name + ' docTypeOf'); if (eN) assert.strictEqual(k.nameOf(V), eN, name + ' nameOf');
    }
    assert.strictEqual(J5(d), before, name + ' 只读');
  }
  /* 接入后（§2.4 / §2.5）：分类入口直接吃分层谱，结果＝oracle；groupsOf 返回行空间（oracle 的组按分类视图单元展开回源谱行：from＝首单元首行、to＝末单元末行） */
  const FN5S = FN5.filter(f => f !== 'groupsOf');
  for (const [name, d, orc, eK, eD, eN] of LGOLD) {
    const before = J5(d);
    for (const k of [K, EDK]) {
      assert.strictEqual(FN5S.map(f => f + '=' + J5(k[f](d))).join(' | '), FN5S.map(f => f + '=' + J5(k[f](orc))).join(' | '), name + '（直接核 f(s)）');
      const R = k.layerRows(d, 'kind'), rows = R ? R.rows : d.voxVoices.map((_, i) => [i]);
      assert.strictEqual(J5(k.groupsOf(d)), J5(k.groupsOf(orc).map(g => Object.assign({}, g, { from: rows[g.from][0], to: rows[g.to][rows[g.to].length - 1] }))), name + ' groupsOf 行空间');
      if (eK) assert.strictEqual(k.stackOf(d), eK, name + ' stackOf(s)'); if (eD) assert.strictEqual(k.docTypeOf(d), eD, name + ' docTypeOf(s)'); if (eN) assert.strictEqual(k.nameOf(d), eN, name + ' nameOf(s)');
    }
    assert.strictEqual(J5(d), before, name + ' 只读（直接核）');
  }
  assert.strictEqual(J5(K.groupsOf(LG('钢琴 [RH, RH·2(层), LH]，不写分组'))), '[{"type":"brace","from":0,"to":2}]', '不写分组的分层钢琴：推断花括号覆盖层（行空间 0–2）');
  assert.strictEqual(J5(K.groupsOf(LG('钢琴 [RH, RH·2, LH, LH·2]'))), '[{"type":"brace","from":0,"to":3}]', '显式 brace 0–3 原样（行空间）');
  assert.strictEqual(J5(K.groupsOf(LG('合唱＋钢琴'))), '[{"type":"bracket","from":0,"to":3},{"type":"brace","from":4,"to":7}]', '合唱＋钢琴：行空间');
  assert.strictEqual(J5(K.groupsOf(LG('伴奏歌谱 [Mel(无词)'))), '[{"type":"brace","from":2,"to":3}]', '伴奏歌谱：组仍在第 2–3 行');
  const ps = LG('小提琴'), pp = K.pzOf(ps), pf = K.facetsOf(ps);
  assert.strictEqual([pp.row, pp.pz + '.' + pp.sub, pp.inst, pf.parts, pf.ens].join(' '), '18 wuxian.qiyue violin 1 false', '小提琴双声部（直接核）');
  assert.strictEqual(K.facetsOf(LG('SATB')).parts, 4, '闭合 SATB（直接核）'); assert.strictEqual(K.ctxOf(LG('合唱＋钢琴')).pno, true, '合唱＋钢琴 ctx.pno（直接核）');
  /* §10.3-5 pubKindOf：带层谱（含 "1" 字符串、恶意键）经 viewOf 与编辑器同值 */
  for (const [name, d] of LGOLD) {
    const s = JSON.parse(J5(d)); s.voxLayer = s.voxLayer.map(x => (x === 1 ? '1' : x)); Object.values(s.mixer).forEach(e => { if (e.lay === 1) e.lay = '1'; });
    s.voxVoices = s.voxVoices.map((x, i) => (i === 0 ? x + '<b>' : x)); s.mixer['vox:0'].x = '<script>';
    const pk = K.pubKindOf(s), want = { type: EDK.docTypeOf(d), typeLabel: EDK.nameOf(d), pz: EDK.pzOf(d).pz, sub: EDK.pzOf(d).sub, fx: J5(EDK.facetsOf(d)) };
    assert.strictEqual(J5([pk.type, pk.typeLabel, pk.pz, pk.sub, J5(pk.fx)]), J5([want.type, want.typeLabel, want.pz, want.sub, want.fx]), name + ' pubKindOf（"1" 串经清洗后生效、恶意键剥掉）');
  }
  const vn = K.collapseLayers(LG('小提琴'), 'kind'), p = K.pzOf(vn), f = K.facetsOf(vn);
  assert.strictEqual([p.row, p.pz + '.' + p.sub, p.inst, f.parts, f.ens].join(' '), '18 wuxian.qiyue violin 1 false', '小提琴双声部：pz #18 器乐、parts 1、不是合奏');
  assert.strictEqual(K.facetsOf(K.collapseLayers(LG('SATB'), 'kind')).parts, 4, '闭合 SATB 仍是四个声部（谱库「四部以上」筛得到）');
  assert.strictEqual(K.ctxOf(K.collapseLayers(LG('合唱＋钢琴'), 'kind')).pno, true, '合唱＋钢琴 ctx.pno');
});
T('v70.5 清洗与上传口径（§1.7）：SAN_NUM / SD_NUM 登记 voxLayer / hid / lay；"1" 转 1、合法分层谱经三种清洗逐字节不变；scoreDataDanger 拒收不能转数的字符串 / 非有限数，照收 null / true / 数字串', () => {
  const SD = require('./scoredata'), h = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8');
  for (const k of ['voxLayer', 'hid', 'lay']) { assert.ok(SD.SD_NUM.has(k), 'SD_NUM 缺 ' + k); assert.ok(new RegExp("const SAN_NUM = new Set\\(\\[[^\\]]*'" + k + "'").test(h), 'SAN_NUM 缺 ' + k); }
  const grab = re => { const m = re.exec(h); assert.ok(m, '读不到 ' + re); return m[0]; };
  const ctx = vm5.createContext({});
  vm5.runInContext([grab(/const SAN_NUM = new Set\(\[[^\]]*\]\);/), grab(/const SAN_ENUM_KEEP = \{dyn:new Set\(\['<','>'\]\)\};/), grab(/const SAN_FREE = new Set\(\[[^\]]*\]\);/),
    grab(/function normalizeSongFields\(v, key\)\{[\s\S]*?\n\}/), grab(/function sanitizeUntrusted\(v, key\)\{[\s\S]*?\n\}/), 'this.N=normalizeSongFields; this.S=sanitizeUntrusted;'].join('\n'), ctx);
  const ok = JSON.parse(J5(LG('钢琴 [RH, RH·2, LH, LH·2]'))); ok.measures[0].voxes[3][1].hid = 1; const j = J5(ok);
  assert.strictEqual(J5(ctx.N(JSON.parse(j))), j, 'normalizeSongFields'); assert.strictEqual(J5(ctx.S(JSON.parse(j))), j, 'sanitizeUntrusted'); assert.strictEqual(J5(K.sanitizeLike(JSON.parse(j))), j, 'sanitizeLike');
  assert.strictEqual(K.viewOf(ok), ok, '干净的分层谱不深拷');
  assert.strictEqual(SD.scoreDataDanger(JSON.parse(j), '', 'data', 0), null, '合法分层谱照收');
  /* 数字串：三种清洗都转成数字，清洗后判据成立（服务端 viewOf 与编辑器同值） */
  const str = JSON.parse(j); str.voxLayer = [null, '1', null, '1']; str.mixer['vox:1'].lay = '1'; str.mixer['vox:3'].lay = '1'; str.measures[0].voxes[3][1].hid = '1';
  assert.strictEqual(K.voxLayerOk(str), null, '清洗前 "1" 不生效');
  for (const [nm, c] of [['normalizeSongFields', ctx.N(JSON.parse(J5(str)))], ['sanitizeUntrusted', ctx.S(JSON.parse(J5(str)))], ['sanitizeLike', K.sanitizeLike(JSON.parse(J5(str)))], ['viewOf', K.viewOf(JSON.parse(J5(str)))]])
    assert.strictEqual(J5(c), j, nm + ' 把 "1" 规整成 1');
  assert.strictEqual(J5(K.voxLayerOk(K.viewOf(str))), '[0,1,0,1]');
  const bad = JSON.parse(j); bad.voxLayer = [null, 'x', null, 1];
  assert.strictEqual(J5(ctx.N(JSON.parse(J5(bad))).voxLayer), '[null,0,null,1]', '不能转数的字符串→0（当 null）');
  /* 上传口径：拒收 voxLayer:["x"]、hid:"a"、lay:Infinity；照收 [null,1] / [null,true] / "1" / hid:1 / lay:1 */
  const base = () => ({ v: 3, title: 't', tabVoices: [], voxVoices: ['甲', '甲·2'], voxNotations: ST2, mixer: { 'vox:1': { on: true } }, measures: [{ tabs: [], voxes: [[{ dur: 4, deg: 1 }], [{ dur: 4, deg: 0 }]] }] });
  const dz = f => { const d = base(); f(d); return SD.scoreDataDanger(d, '', 'data', 0); };
  assert.ok(/voxLayer/.test(dz(d => { d.voxLayer = ['x']; }) || ''), 'voxLayer:["x"] 未拒收');
  assert.ok(/hid/.test(dz(d => { d.measures[0].voxes[1][0].hid = 'a'; }) || ''), 'hid:"a" 未拒收');
  assert.ok(/lay/.test(dz(d => { d.mixer['vox:1'].lay = Infinity; }) || ''), 'lay:Infinity 未拒收');
  for (const [nm, f] of [['[null,1]', d => { d.voxLayer = [null, 1]; }], ['[null,true]', d => { d.voxLayer = [null, true]; }], ['["1"]', d => { d.voxLayer = [null, '1']; }],
    ['hid:1', d => { d.measures[0].voxes[1][0].hid = 1; }], ['lay:1', d => { d.mixer['vox:1'].lay = 1; }], ['lay:"1"', d => { d.mixer['vox:1'].lay = '1'; }], ['voxLayer:null', d => { d.voxLayer = null; }]])
    assert.strictEqual(dz(f), null, nm + ' 应照收');
});
T('v70.5 编辑器 helper（node 抽取；浏览器里的路径用例见 tv_v705data）：voxStaffRows 按一致对、voxInsAt 按结构链接顺延、voxLayWSync / voxLayerDrop 只留层行见证、hidSweep 只清有音列；老谱零改动', () => {
  const h = fs.readFileSync(path.join(ROOT, 'muse-tab/index.html'), 'utf8'), a = h.indexOf('\nfunction voxStaffRows('), b = h.indexOf('\n/* v69.8 C 组：按旋律声部下标的可选数组', a);
  assert.ok(a > 0 && b > a, '读不到 helper 段');
  const ctx = vm5.createContext({ PQ_KIND: K }); vm5.runInContext(h.slice(a, b) + '\nthis.H={voxStaffRows, voxInsAt, voxLayWSync, voxLayerDrop, hidSweep};', ctx); const H = ctx.H;
  const pno = LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [BC(0, 2)] });
  assert.strictEqual(J5([0, 1, 2].map(i => H.voxStaffRows(pno, i))), '[[0,1],[0,1],[2]]');
  assert.strictEqual(J5([0, 1].map(i => H.voxStaffRows(LB('两行都是简谱：不生效，一致对成立（sync 不要求五线谱）'), i))), '[[0,1],[0,1]]', '两行简谱：一致对联动（宿主切简谱再切回五线谱能复原）');
  for (const nm of ['记谱法不同：宿主高音、层低音', '谱号八度不同（旧版本只改了一行的 voxClefOct）', '移调不同（旧版本只改了一行的 voxTransp）', '缺见证：mixer 里没有 vox:1 的见证'])
    assert.strictEqual(J5([0, 1].map(v => H.voxStaffRows(LB(nm), v))), '[[0],[1]]', nm + '：不联动');
  assert.strictEqual(J5([0, 1, 2, 3].map(at => H.voxInsAt(pno, at))), '[0,2,2,3]', '插入点恰好是层行 → 顺延到层之后');
  assert.strictEqual(H.voxInsAt(LB('记谱法不同：宿主高音、层低音'), 1), 2, '结构链接（记谱法不同也算）');
  assert.strictEqual(J5([0, 1, 2].map(at => H.voxInsAt(LV(['甲', '乙', '丙'], ST3), at))), '[0,1,2]', '老谱不变');
  const w = LV(['A', 'A·2', 'B'], ST3, [null, 1, null], { w: [0, 1, 2] }); H.voxLayWSync(w);
  assert.strictEqual(J5(Object.keys(w.mixer).filter(k => 'lay' in w.mixer[k])), '["vox:1"]', '见证只留在 voxLayer[i]===1 的行上');
  const w2 = LV(['A', 'A·2'], ST2, [null, 1]); w2.mixer.tab0 = { lay: 1 }; H.voxLayerDrop(w2);
  assert.ok(!('voxLayer' in w2) && !('lay' in w2.mixer['vox:1']) && w2.mixer.tab0.lay === 1, 'voxLayerDrop 删 voxLayer 与全部 vox 见证，别的键不碰');
  for (const d of [...CASES.map(c => c[1]), { v: 3 }, { mixer: 5 }]) { const c = JSON.parse(J5(d)), j0 = J5(c); H.voxLayerDrop(c); H.voxLayWSync(c); H.hidSweep(c); assert.strictEqual(J5(c), j0, '老谱零改动'); }
  const hs = LV(['甲'], ['staff']); hs.measures[0].voxes[0][0].hid = 1; hs.measures[0].voxes[0][1].hid = 1; hs.measures.push(null, { voxes: [null, [null, { deg: 3, hid: 1 }]] });
  hs.measures[0].tabs = [[{ dur: 4, hid: 1, notes: [] }]]; H.hidSweep(hs);
  assert.ok(!('hid' in hs.measures[0].voxes[0][0]) && hs.measures[0].voxes[0][1].hid === 1 && !('hid' in hs.measures[2].voxes[1][1]) && hs.measures[0].tabs[0][0].hid === 1, 'hidSweep：有音列删、休止列留、六线谱不碰');
  for (const d of [null, undefined, {}, { measures: 'x' }]) H.hidSweep(d);
});

console.log('PASS ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
