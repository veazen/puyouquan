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
  ['CG 钢琴弹唱谱（纯伴奏）（v67.6 前谱库叫钢琴弹唱谱）', vox(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true }, true), 'CG', '钢琴弹唱谱（纯伴奏）'],
  ['CG 带简谱对照', vox(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true, voxDual: [true, false] }), 'CG', '钢琴弹唱谱（纯伴奏，五线＋简谱对照）'],
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
  /* 谱类（筛选维度）仍是 docTypeOf，拍板 4 不改 */
  assert.ok(/type: safe\(\(\) => docTypeOf\(d\), 'vocal'\), typeLabel: typeLabelOf\(d\)/.test(src), '卡片 type 字段口径变了');
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

console.log('PASS ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
