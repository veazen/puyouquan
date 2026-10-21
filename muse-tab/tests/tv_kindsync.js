/* v67.6 谱库与服务端谱名同步 + 埋点 create_stack（新建流程方案 docs/design-2026-10e，负责人「按推荐方案执行」：
   拍板 4 谱库分类不改 docType、拍板 5 谱名统一扩到谱库卡片与服务端 typeLabelOf、拍板 10 用 create_stack 校准首访默认用途）
   K1 统一谱名表只此一份：编辑器内联 @pq-kindname 段＝api/kindname.js（逐字节），页面里 PQ_KIND 与 node require 的规则模块导出同一组函数；
      编辑器 NWB.stackOf / kindOf / ctxOf、全局 isChoir / voxGroupsOf / voxHasLyrics / isPianoAccStack、docTypeLabel / docTypeLabelPub 都转调它
   K2 同一批谱（16 预设 + 14 种谱行组合 × 变体经 NWB.build + 11 个用途面板计划 + MusicXML 导入 7 份 × 6 种做法 + MIDI 导入 5 种模式
      + 换谱类产物 + 边界样本）：编辑器谱名 docTypeLabel＝服务端 nameOf(存储 JSON)、谱行一致；面板谱名＝建出来的谱名；预设原始 JSON（未 migrate）服务端名＝编辑器名
   K3 真服务端（api/server.js + 临时库，语料全部上架）：谱库列表 typeLabel、SSR 落地页标题、og 封面＝编辑器谱名；type 字段（谱库分类）＝编辑器 docType（不改）
   K4 观看页（puku kanpu.html?pub=ID，真跳转）标题＝统一谱名；分享卡 PNG 右上角＝统一谱名；小程序分享 share＝「歌名 - 演唱者 · 统一谱名」，
      ≤44 字且长歌名截歌名不截谱名（小程序 score.js onMsg / onShareAppMessage 原样收下）
   K5 谱库卡片：官网首页卡片 .cc-type＝服务端 typeLabel（分类筛选仍按 docType）；编辑器谱友圈卡片线上＝typeLabel、本地演示谱＝按谱面现算
   K6 埋点 create_stack：真实点击「新建 → 创建」「新建 ▾ → 钢琴即兴伴奏」、真实按键 Alt+Shift+N（按上次）各发一条 create_stack
      （用途:谱行:入口:打开用途:首次）并照发 create_song（口径不变：createSong 类型），meta 不含曲名；经真服务端白名单入库
   收尾验收（v67.6 收尾修复）：
   K7 major 无词器乐导入谱不叫「歌谱」「合唱」：真实点击「新建 → 从已有音乐 → 选择文件」导入小提琴独奏 / 长笛＋钢琴 / 弦乐四重奏（无词）按原文件：
      歌词行数照文件（0）、右栏谱名 / 谱型条 / 面板「按原文件」小字 / 服务端谱库口径同名＝五线谱旋律 / 旋律＋钢琴伴奏谱（五线谱）/ 五线谱重奏谱；
      有词文件仍五线谱歌谱（1 行词）、「配钢琴伴奏」做法仍钢琴伴奏歌谱（五线谱）（留 1 行词，同 v67.5）；面板悬停预告与建成同名；谱型条菜单项＝换完的谱名
   K8 minor 恶意 / 坏谱：真服务端谱库列表不 500；恶意短码 / 歌词 / 声部名 / 键名 / 非 v3 的谱，谱库 typeLabel＝真跳转观看页标题里的谱名；坏谱落地页 / 封面照常出
   K9 minor 本地演示付费谱：真实点击卡片——卡片谱名＝观看栏谱名＝整谱统一谱名（不按试看截断后的谱算）
   K10 minor 小程序分享标题截歌名不留半个 emoji（无孤立代理项、≤44 码元、谱名完整）
   K11 minor 谱库卡片谱名：1280 宽编辑器谱友圈 / 官网卡片中长谱名不丢括号里的区分（≤2 行、不裁切、不压价格角标）；外层改 flex 并插图标（p6a 合并后）仍不溢出
   第二轮验收（修前红修后绿：MUSETAB_URL / MUSETAB_API 指向第二轮修复前的副本复跑，K11–K14 红）：
   K11 补本机演示付费谱「¥12.5 / ¥19.5 / ¥128」＋长谱名：两行徽标不压价格角标（此前只测了免费）
   K12 S-2 旧格式（v:2）/ 缺 tabVoices 的已发布谱：观看页（真跳转）v:2 打得开、标题＝谱库谱名；打不开的坏谱 2 秒内揭幕并提示「曲谱数据异常」（此前遮罩卡 8 秒后静默落到默认谱），谱库谱名照此回落「曲谱」
   K13 seam-1 本机演示谱观看栏在平板竖屏（641–900 宽）＋长谱名不横向溢出、「退出观看」在屏内；.va 单行省略、全名在 title
   K14 seam-5「我的曲谱」卡片谱类行按点开后（migrate）的口径：旧格式 v1 / v2 存档叫吉他弹唱谱（此前叫简谱歌谱），与服务端同名
   突变实证：MUSETAB_URL=file://…/v675.html（v67.5 编辑器）复跑——K1/K3/K4/K5/K6 报红。
   env：MUSETAB_URL 编辑器、MUSETAB_API 服务端 server.js（默认仓库 api/server.js）、MUSETAB_SITE 官网目录。 */
'use strict';
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const { songbieXML } = require('./fixtures/songbie_ai.js');

const ED = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const API_DIR = path.dirname(process.env.MUSETAB_API || path.resolve(__dirname, '../../api/server.js'));
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');
const MP_ROOT = path.resolve(__dirname, '../../miniprogram');
const KIND = require(path.join(API_DIR, 'kindname.js'));
const readEd = () => fs.readFileSync(ED, 'utf8');
/* v68.2 默认外壳 flow（计划 §5.4）：K6 / K7 的真实点击入口换新外壳——新建＝页签「＋」#dt-add；「新建 ▾」＝文件 ▾ 新建行尾 ▾（r1:newdd，同一 NWP.quickMenu，埋点入口仍记 menu）；
   右栏谱名＝「属性」页「整谱 · 谱类」#flw-rx-song（旧外壳信息卡 #ri-type）；谱型条谱名 / 换谱类菜单＝左栏音轨区谱类芯片 #flw-kchip（同一个 #lb-menu）。
   下面的读取函数按 flowOn() 自动取对应位置，?shell=classic 下仍读旧位置 */
const NEWB = '#dt-add';

let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
const errs = [];
const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name + '（运行异常）', String(e && e.stack || e).slice(0, 400)); } };

/* ---------- 样本：MusicXML（parts：[{name, clefs:['G'] | ['G','F'], ly}]）与最小 SMF ---------- */
function mxl(parts, title) {
  const pl = parts.map((p, i) => `<score-part id="P${i + 1}"><part-name>${p.name}</part-name></score-part>`).join('');
  const body = parts.map((p, i) => {
    const st = p.clefs.length;
    const attrs = '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>'
      + (st > 1 ? `<staves>${st}</staves>` : '') + p.clefs.map((c, j) => `<clef${st > 1 ? ` number="${j + 1}"` : ''}><sign>${c}</sign><line>${c === 'G' ? 2 : 4}</line></clef>`).join('') + '</attributes>';
    const notes = staff => ['C', 'D', 'E', 'G'].map(s => `<note><pitch><step>${s}</step><octave>${staff === 2 || p.clefs[0] === 'F' ? 3 : 4}</octave></pitch><duration>1</duration><voice>${staff}</voice><type>quarter</type>`
      + (st > 1 ? `<staff>${staff}</staff>` : '') + (p.ly && staff === 1 ? '<lyric number="1"><syllabic>single</syllabic><text>啊</text></lyric>' : '') + '</note>').join('');
    const m = attrs + notes(1) + (st > 1 ? '<backup><duration>4</duration></backup>' + notes(2) : '');
    return `<part id="P${i + 1}"><measure number="1">${m}</measure><measure number="2">${notes(1)}${st > 1 ? '<backup><duration>4</duration></backup>' + notes(2) : ''}</measure></part>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>${title}</work-title></work><part-list>${pl}</part-list>${body}</score-partwise>`;
}
const XMLS = [
  ['单声部有词', mxl([{ name: 'Voice', clefs: ['G'], ly: true }], '单声部有词')],
  ['长笛（无词）', mxl([{ name: 'Flute', clefs: ['G'] }], '长笛')],
  ['钢琴大谱表', mxl([{ name: 'Piano', clefs: ['G', 'F'] }], '钢琴')],
  ['人声＋钢琴', mxl([{ name: 'Voice', clefs: ['G'], ly: true }, { name: 'Piano', clefs: ['G', 'F'] }], '人声钢琴')],
  ['SAB 三部合唱', mxl([{ name: 'Soprano', clefs: ['G'], ly: true }, { name: 'Alto', clefs: ['G'], ly: true }, { name: 'Baritone', clefs: ['F'], ly: true }], 'SAB')],
  ['弦乐二重奏（无词）', mxl([{ name: 'Violin', clefs: ['G'] }, { name: 'Cello', clefs: ['F'] }], '二重奏')],
  ['送别（AI 转谱）', songbieXML()],
];
/* K7 收尾验收 major：无词器乐文件（导入后不该叫「歌谱」「合唱」） */
const XML_NOLY = [
  ['小提琴独奏（无词）', mxl([{ name: 'Violin', clefs: ['G'] }], '小提琴独奏'), 'S', '五线谱旋律'],
  ['长笛＋钢琴（无词）', mxl([{ name: 'Flute', clefs: ['G'] }, { name: 'Piano', clefs: ['G', 'F'] }], '长笛与钢琴'), 'SG', '旋律＋钢琴伴奏谱（五线谱）'],
  ['弦乐四重奏（无词）', mxl([{ name: 'Vn1', clefs: ['G'] }, { name: 'Vn2', clefs: ['G'] }, { name: 'Va', clefs: ['G'] }, { name: 'Vc', clefs: ['F'] }], '弦乐四重奏'), 'S', '五线谱重奏谱'],
];
/* K8 收尾验收 minor：恶意（存得进库：短码只拒 <>、自由文本与未知字段不限字符）/ 老格式 / 坏谱 */
const ADV = (() => {
  const c = (o) => Object.assign({ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  const base = (o) => Object.assign({ v: 3, title: 't', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: [], voxVoices: ['旋律'], lyricLines: 0, measures: [] }, o);
  const mea = (cells) => [{ tabs: [], voxes: cells.map(x => [c(x)]), repeatStart: false, repeatEnd: false }];
  const proto = JSON.parse('{"v":3,"title":"t","key":"C","beats":4,"unit":4,"tempo":90,"tabVoices":[],"voxVoices":["右","左"],"voxNotations":["staff","bass"],"__proto__":{"pianoAcc":true},"lyricLines":0,"measures":[{"tabs":[],"voxes":[[{"dur":4,"deg":1,"lyrics":[]}],[{"dur":4,"deg":1,"lyrics":[]}]]}]}');
  const keyq = base({ voxVoices: ['a'], measures: mea([{}]) }); keyq["voxNotations'"] = ['staff'];
  return [
    ['恶意 歌词只有尖括号（单行五线谱）', base({ voxVoices: ['a'], voxNotations: ['staff'], lyricLines: 1, measures: mea([{ lyrics: ['<'] }]) }), true],
    ['恶意 歌词只有尖括号（高＋低音谱表两行）', base({ voxVoices: ['女', '男'], voxNotations: ['staff', 'bass'], lyricLines: 1, measures: mea([{ lyrics: ['<>'] }, { lyrics: ['>'] }]) }), true],
    ['恶意 voxNotations 带引号', base({ voxVoices: ['右', '左'], voxNotations: ["staff'", 'bass'], measures: mea([{}, {}]) }), true],
    ['恶意 inst 带反引号', base({ tabVoices: ['尤克里里'], inst: 'uku`', lyricLines: 1, measures: [{ tabs: [[{ dur: 4, notes: [] }]], voxes: [[c()]] }] }), true],
    ['恶意 instKey 带双引号', base({ voxVoices: ['a'], instKey: 'erhu"', measures: mea([{}]) }), true],
    ['恶意 声部名带尖括号（伴奏证据）', base({ voxVoices: ['旋律', '右手<伴奏', '左手伴奏'], voxNotations: [null, 'staff', 'bass'], lyricLines: 1, measures: mea([{}, {}, {}]) }), true],
    ['恶意 键名带引号', keyq, true],
    ['恶意 __proto__ 键', proto, true],
    ['老格式 没有 v 字段', { title: 'nov', voxVoices: ['右', '左'], voxNotations: ['staff', 'bass'], tabVoices: [], measures: mea([{}, {}]) }, true],
    ['坏谱 歌词是字符串（高＋低音谱表两行）', base({ voxVoices: ['女', '男'], voxNotations: ['staff', 'bass'], lyricLines: 1, measures: [{ tabs: [], voxes: [[c({ lyrics: '啊' })], [c()]] }] }), false],
    ['坏谱 声部不是数组', base({ voxVoices: ['a'], voxNotations: ['staff'], measures: [{ tabs: [], voxes: { a: 1 } }] }), false],
    ['坏谱 data 是 null', null, false],
  ].map(([tag, d, view], i) => { const title = 'KV' + String(i).padStart(2, '0') + ' ' + tag.replace(/[{}"'<>&:,]/g, '').slice(0, 20);
    if (d && typeof d === 'object') d.title = title;   /* 观看页标题读谱面 title */
    return { tag, d, view, id: 'kv' + String(i).padStart(4, '0') + 'xx', title }; });
})();
/* K12 第二轮验收 S-2：旧格式 / 缺 tabVoices 的已发布谱（直接入库，模拟早期数据） */
const ADV2 = [
  { tag: 'v:2 旧格式（吉他）', id: 'kw0000oldv2', title: 'KW00 旧格式', want: '吉他弹唱谱', open: true,
    d: { v: 2, title: 'KW00 旧格式', key: 'G', beats: 4, unit: 4, tempo: 90, capo: 0, measures: [{ tab: [{ dur: 4, dotted: false, chord: 'G', notes: [{ s: 6, f: 3 }], strum: '' }], vox: [{ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyric: '啊', tie: false }], repeatStart: false, repeatEnd: false }] } },
  { tag: 'v3 缺 tabVoices（简谱有词）', id: 'kw0001notab', title: 'KW01 缺六线谱轨', want: '曲谱', open: false,
    d: { v: 3, title: 'KW01 缺六线谱轨', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, voxVoices: ['旋律'], lyricLines: 1, measures: [{ voxes: [[{ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: ['啊'], tie: false }]] }] } },
];
function vlq(n) { const s = [n & 0x7f]; n >>= 7; while (n) { s.push((n & 0x7f) | 0x80); n >>= 7; } return s.reverse(); }
function smf(evs) {
  const tk = [0, 0xFF, 0x51, 3, 7, 0xA1, 0x20, 0, 0xFF, 0x58, 4, 4, 2, 24, 8, 0, 0xFF, 0x59, 2, 0, 0];
  let last = 0; evs.forEach(([t, st, d1, d2]) => { tk.push(...vlq(t - last), st, d1, d2); last = t; });
  tk.push(0, 0xFF, 0x2F, 0);
  return Buffer.from([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0xE0, 0x4D, 0x54, 0x72, 0x6B, (tk.length >> 24) & 255, (tk.length >> 16) & 255, (tk.length >> 8) & 255, tk.length & 255, ...tk]).toString('base64');
}
const MID = smf([[0, 0x90, 48, 80], [0, 0x90, 67, 80], [480, 0x80, 48, 0], [480, 0x80, 67, 0], [480, 0x90, 52, 80], [480, 0x90, 64, 80], [960, 0x80, 52, 0], [960, 0x80, 64, 0], [960, 0x90, 55, 80], [960, 0x90, 72, 80], [1920, 0x80, 55, 0], [1920, 0x80, 72, 0]]);
const MIDIS = [['单旋律', { mode: 'single', a: 0 }], ['人声', { mode: 'vocal', a: 0 }], ['吉他独奏', { mode: 'guitar', a: 0 }], ['尤克里里独奏', { mode: 'uku', a: 0 }], ['钢琴分手', { mode: 'split', a: 0, split: 60 }]];

/* ---------- 语料（在编辑器里建，存储 JSON 给服务端） ---------- */
async function corpus(pg) {
  return pg.evaluate(({ XMLS, MID, MIDIS }) => {
    const out = [], J = s => JSON.parse(JSON.stringify(s));
    const add = (tag, s, extra) => {
      try { const d = J(s); delete d.layout; delete d.id; out.push(Object.assign({ tag, d, name: docTypeLabel(s), stack: NWB.stackOf(s), dt: docType(s) }, extra || {})); }
      catch (e) { out.push({ tag, err: String(e && e.message || e) }); }
    };
    /* ① 16 预设（migrate 后）＋原始 JSON */
    PRESETS.forEach((p, i) => add('预设' + i + ' ' + p.name, migrate(p.make()), { raw: J(p.make()) }));
    /* ② 14 种谱行组合 × 变体（NWB.build ＝ 新建面板真实建谱） */
    const V = { J: [{}, { nVox: 2 }, { nVox: 4 }, { instKey: 'erhu' }, { instKey: 'piano' }, { lyr: 0 }], S: [{}, { lyr: 0 }, { nVox: 3 }, { instKey: 'violin' }, { instKey: 'other', clef: 'alto' }, { clef: 'bass', lyr: 0 }],
      SJ: [{}, { nVox: 2 }], T: [{}, { inst: 'uku' }], JT: [{}, { inst: 'uku' }, { capo: 3 }], ST: [{}], G: [{}, { instKey: 'epiano' }, { instKey: 'synth' }], CG: [{}], JG: [{}, { lyr: 0 }], SG: [{}], SJG: [{}], CJ: [{}], CS: [{}], C: [{}] };
    NWB.VALID.forEach(k => (V[k] || [{}]).forEach(o => add('谱行 ' + k + ' ' + JSON.stringify(o), NWB.build(k, Object.assign({ title: 't' }, o)))));
    /* ③ 新建面板 11 个用途（默认值）：面板计划谱名＝建出来的谱名 */
    NWP.SCENE_IDS.forEach(id => { try { const P = NWP.planOf(NWP.fresh({ scene: id, clean: true })); const o = Object.assign({}, P.o); delete o.tuningKey; delete o.pen; add('用途 ' + id, NWB.build(P.stack, o), { panel: P.kind.name }); } catch (e) { out.push({ tag: '用途 ' + id, err: e.message }); } });
    /* ④ MusicXML 导入（原样）× 6 种「做成哪种谱」 */
    XMLS.forEach(([nm, xml]) => {
      const r = importMusicXML(xml); if (!r || r.error) { out.push({ tag: '导入 ' + nm, err: (r && r.error) || 'null' }); return; }
      add('导入 ' + nm, r.song);
      let a = null; try { a = NWP.analyze(nm + '.musicxml', r); } catch (e) { out.push({ tag: '导入 ' + nm + ' analyze', err: e.message }); return; }
      NWP.TARGETS.forEach(([t]) => { if (a.dis && a.dis[t]) return; try { const s = NWP.convert(a, t); if (s) add('导入 ' + nm + ' →' + t, s); } catch (e) { out.push({ tag: '导入 ' + nm + ' →' + t, err: e.message }); } });
    });
    /* ⑤ MIDI 导入 5 种模式 */
    const u8 = Uint8Array.from(atob(MID), c => c.charCodeAt(0)), sm = parseSMF(u8);
    MIDIS.forEach(([nm, sel]) => { try { add('MIDI ' + nm, buildSongFromMIDI(sm, sel).song); } catch (e) { out.push({ tag: 'MIDI ' + nm, err: e.message }); } });
    /* ⑥ 换谱类产物（谱型条：直接换 / 空谱重建 / 另建一份）——从吉他弹唱谱、钢琴伴奏歌谱（有旋律）出发换到 14 种 */
    const keep = song;
    try {
      const jg = NWB.build('JG', { title: 'jg', nMea: 2 }); jg.measures[0].voxes[0][0].deg = 3; jg.measures[0].voxes[0][0].lyrics = ['啊'];
      [['JT', NWB.build('JT', { title: 'jt', nMea: 2 })], ['JG', jg], ['S', NWB.build('S', { title: 's', nMea: 2, lyr: 0 })]].forEach(([from, s0]) => NWB.VALID.forEach(to => {
        try {
          const s = J(s0), p = lbPlan(s, to);
          if (p.mode === 'no' || p.mode === 'same') return;
          let r;
          if (p.mode === 'copy') r = lbCopy(s, to);
          else { song = s; if (p.mode === 'rebuild') r = lbRebuild(s, to); else { lbApplyDirect(s, from, to); r = s; } }
          add('换谱类 ' + from + '→' + to + '（' + p.mode + '）', r, { want: to });
        } catch (e) { out.push({ tag: '换谱类 ' + from + '→' + to, err: e.message }); }
        finally { song = keep; }
      }));
    } finally { song = keep; }
    /* ⑦ 边界：SAB 不写分组、显式分组全部失效、钢琴 / 纯伴奏带对照、伴奏歌谱删左手、老谱无分组按声部名、二声部合唱、器乐四重奏、空谱 */
    const mk = (names, nota, o, ly) => { const s = createSong('vocal', { title: 'b', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: names.length, lyr: ly ? 1 : 0 });
      s.voxVoices = names.slice(); s.voxNotations = nota.slice(); delete s.voxGroups; s.measures.forEach(m => m.voxes.forEach(cols => cols.forEach((c, i) => { c.deg = [1, 3, 5, 1][i % 4]; c.lyrics = [ly ? '啊' : '']; }))); return Object.assign(s, o || {}); };
    add('边界 SAB 无分组', mk(['S', 'A', 'B'], ['staff', 'staff', 'bass'], null, true));
    add('边界 显式分组越界', mk(['右手', '左手'], ['staff', 'bass'], { voxGroups: [{ type: 'brace', from: 1, to: 2 }] }));
    add('边界 钢琴对照', mk(['右手', '左手'], ['staff', 'bass'], { voxDual: [true, false] }));
    add('边界 纯伴奏对照', mk(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true, voxDual: [true, false] }));
    add('边界 伴奏歌谱删左手', mk(['旋律', '右手伴奏'], [undefined, 'staff'], null, true));
    add('边界 老谱按声部名', mk(['旋律', '右手伴奏', '左手伴奏'], [undefined, 'staff', 'bass'], null, true));
    add('边界 二声部合唱', mk(['女', '男'], ['staff', 'bass'], null, true));
    add('边界 器乐四重奏无词', mk(['一', '二', '三', '四'], ['staff', 'staff', 'alto', 'bass'], null, false));
    add('边界 方括号三行', mk(['旋律', '右手伴奏', '左手伴奏'], ['staff', 'staff', 'bass'], { voxGroups: [{ type: 'bracket', from: 0, to: 2 }] }, true));
    return out;
  }, { XMLS, MID, MIDIS });
}

/* ---------- 真服务端（临时库）：语料上架 ---------- */
const SQLF = (() => { try { require('node:sqlite'); return []; } catch (_) { return ['--experimental-sqlite']; } })();
const PORT = 3600 + (process.pid % 300);
const DB = path.join(os.tmpdir(), 'pyq_kindsync_' + process.pid + '.db');
const BASE = 'http://127.0.0.1:' + PORT;
const get = u => new Promise((res, rej) => http.get(BASE + u, r => { let b = ''; r.setEncoding('utf8'); r.on('data', c => b += c); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
function seed(items) {
  const f = path.join(os.tmpdir(), 'pyq_kindsync_' + process.pid + '.json');
  fs.writeFileSync(f, JSON.stringify(items.map(x => ({ id: x.id, title: x.title, data: x.d }))));
  const code = `const {q,now}=require('./db'); const L=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
    const uid='kindsync0001'; q.userCreate.run(uid,'13100003333','谱名同步',now()); const t=now();
    L.forEach((x,i)=>{ q.scoreUpsert.run(x.id,uid,x.title,'',JSON.stringify(x.data),t,t); q.scoreSetStatus.run('published',x.id,uid); q.scoreSnap.run(t+10+i,x.id); });
    console.log('seeded '+L.length);`;
  const r = spawnSync(process.execPath, [...SQLF, '-e', code, f], { cwd: API_DIR, env: Object.assign({}, process.env, { DB_PATH: DB, JWT_SECRET: 'kindsync' }), encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (_) {}
  return (r.stdout || '') + (r.status ? (r.stderr || '') : '');
}
async function startServer() {
  const p = spawn(process.execPath, [...SQLF, 'server.js'], { cwd: API_DIR, env: Object.assign({}, process.env, { PORT: String(PORT), DB_PATH: DB, JWT_SECRET: 'kindsync', COOKIE_DOMAIN: '' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', c => log += c); p.stderr.on('data', c => log += c);
  for (let i = 0; i < 60; i++) { try { const r = await get('/api/health'); if (r.status === 200) return { p, log: () => log }; } catch (_) {} await new Promise(r => setTimeout(r, 150)); }
  throw new Error('server not up: ' + log.slice(0, 400));
}
function sql(q) {
  const code = `const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);console.log(JSON.stringify(d.prepare(process.argv[2]).all()))`;
  const r = spawnSync(process.execPath, [...SQLF, '-e', code, DB, q], { encoding: 'utf8' });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch (_) { return null; }
}

/* 浏览器页：zhipu / puku 给编辑器单文件，www 给官网；/api/* 原样转给真服务端（记下埋点请求体） */
async function mkPage(b, url, opt) {
  opt = opt || {};
  const ctx = await b.newContext({ viewport: opt.vp || { width: 1366, height: 900 }, userAgent: opt.ua });
  if (opt.init) await ctx.addInitScript(opt.init);
  const pg = await ctx.newPage(); pg._ctx = ctx; pg._ev = [];
  pg.on('pageerror', e => errs.push('PAGEERR(' + url + '):' + e.message));
  await pg.route(/^https:\/\/(zhipu|puku|www)\.puyouquan\.com\/.*/, async route => {
    const req = route.request(), u = new URL(req.url()), p = u.pathname, host = u.hostname.split('.')[0];
    if (p.startsWith('/api/')) {
      if (p === '/api/events') { try { pg._ev.push(JSON.parse(req.postData() || '{}')); } catch (_) {} }
      try { const r = await route.fetch({ url: BASE + p + u.search }); return route.fulfill({ response: r }); }
      catch (e) { return route.fulfill({ status: 502, body: '' }); }
    }
    if (host !== 'www') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: readEd() });
    const f = p === '/' ? 'index.html' : p.slice(1);
    if (fs.existsSync(path.join(SITE, f))) return route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : /\.png$/.test(f) ? 'image/png' : 'text/html; charset=utf-8', body: fs.readFileSync(path.join(SITE, f)) });
    return route.fulfill({ status: 404, body: '' });
  });
  await pg.route(/res\.wx\.qq\.com/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.wx=window.wx||{};window.wx.miniProgram={postMessage:function(m){window.__wxpm=m;}};' }));
  await pg.goto(url); await pg.waitForTimeout(opt.wait || 1200);
  return pg;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let srv = null, items = [];
  try {
    /* ---------- K1 ---------- */
    await guard('K1', async () => {
      const cut = s => { const a = s.indexOf('/* @pq-kindname begin'), z = s.indexOf('/* @pq-kindname end */'); return a >= 0 && z > a ? s.slice(a, z) : null; };
      const edBlock = cut(readEd()), srvBlock = cut(fs.readFileSync(path.join(API_DIR, 'kindname.js'), 'utf8'));
      const pg = await b.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
      await pg.goto('file://' + ED); await pg.waitForTimeout(900);
      const r = await pg.evaluate(() => {
        if (typeof PQ_KIND === 'undefined') return { has: false };
        const src = f => String(f).replace(/\s+/g, ' ');
        /* 转调：用一份假谱打探各入口是否读 PQ_KIND（临时替换后恢复） */
        const k0 = PQ_KIND.stackOf, n0 = PQ_KIND.nameOf, c0 = PQ_KIND.isChoir, g0 = PQ_KIND.groupsOf, a0 = PQ_KIND.isPianoAccStack, kn0 = PQ_KIND.kindName;
        const hit = [];
        PQ_KIND.stackOf = () => (hit.push('stackOf'), 'C'); PQ_KIND.kindName = () => (hit.push('kindName'), '探针名'); PQ_KIND.nameOf = () => (hit.push('nameOf'), '探针名');
        PQ_KIND.isChoir = () => (hit.push('isChoir'), true); PQ_KIND.groupsOf = () => (hit.push('groupsOf'), []); PQ_KIND.isPianoAccStack = () => (hit.push('isPianoAccStack'), true);
        const s = { voxVoices: ['a'] };
        const got = { st: NWB.stackOf(s), kn: NWB.kindOf('J', {}).name, lab: docTypeLabel(s), pub: docTypeLabelPub(s), ch: isChoir(s), gr: voxGroupsOf(s).length, acc: isPianoAccStack(s) };
        Object.assign(PQ_KIND, { stackOf: k0, nameOf: n0, isChoir: c0, groupsOf: g0, isPianoAccStack: a0, kindName: kn0 });
        return { has: true, keys: Object.keys(PQ_KIND).sort().join(), got, hit: [...new Set(hit)].sort().join(), fnSrc: src(docTypeLabelPub) };
      });
      await pg.close();
      const SRV_ONLY = new Set(['viewOf', 'pubNameOf', 'sanitizeLike']);   /* 服务端专用（存储 JSON → 观看页看到的谱），不在共享段里 */
      const keysNode = Object.keys(KIND).filter(k => !SRV_ONLY.has(k)).sort().join();
      T(!!edBlock && edBlock === srvBlock && r.has && r.keys === keysNode
        && r.got.st === 'C' && r.got.kn === '探针名' && r.got.lab === '探针名' && r.got.pub === '探针名' && r.got.ch === true && r.got.gr === 0 && r.got.acc === true,
        'K1 统一谱名表只此一份：编辑器内联段＝api/kindname.js 逐字节、导出同一组函数；NWB.stackOf / kindOf、docTypeLabel / docTypeLabelPub、isChoir / voxGroupsOf / isPianoAccStack 都转调 PQ_KIND',
        JSON.stringify({ same: !!edBlock && edBlock === srvBlock, has: r.has, keys: r.keys === keysNode, got: r.got, hit: r.hit }));
    });

    /* ---------- K2 ---------- */
    await guard('K2', async () => {
      const pg = await b.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
      await pg.goto('file://' + ED); await pg.waitForTimeout(900);
      await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
      const out = await corpus(pg);
      await pg.close();
      const bad = [], cnt = {}, stacks = new Set();
      out.forEach(x => {
        const g = x.tag.split(' ')[0].replace(/\d+$/, ''); cnt[g] = (cnt[g] || 0) + 1;
        if (x.err) { bad.push(x.tag + ' 出错 ' + x.err); return; }
        stacks.add(x.stack);
        const sn = KIND.nameOf(x.d), sk = KIND.stackOf(x.d);
        if (sn !== x.name || sk !== x.stack) bad.push(x.tag + '：编辑器 ' + x.stack + ' ' + x.name + ' ≠ 服务端 ' + sk + ' ' + sn);
        if (x.panel != null && x.panel !== x.name) bad.push(x.tag + '：面板谱名 ' + x.panel + ' ≠ 建出来 ' + x.name);
        if (x.raw && KIND.nameOf(x.raw) !== x.name) bad.push(x.tag + '：原始 JSON ' + KIND.nameOf(x.raw) + ' ≠ ' + x.name);
        if (x.want && x.want !== x.stack) bad.push(x.tag + '：换完谱行 ' + x.stack);
        /* 收尾验收 minor：尤克里里独奏（五线＋四线联排）此前一律叫「吉他独奏谱」 */
        if (x.tag === 'MIDI 尤克里里独奏' && x.name !== '尤克里里独奏谱') bad.push(x.tag + '：' + x.name + ' ≠ 尤克里里独奏谱');
      });
      /* 上架用：曲名＝库里标题＝谱面 title（观看页标题读谱面 title），去掉会被转义的引号 / 尖括号 */
      items = out.filter(x => !x.err).map((x, i) => { const title = 'KS' + String(i).padStart(3, '0') + ' ' + x.tag.replace(/[{}"'<>&:,]/g, '').slice(0, 24).trim(); x.d.title = title; return Object.assign(x, { id: 'ks' + String(i).padStart(4, '0') + 'xx', title }); });
      T(bad.length === 0 && out.length >= 140 && stacks.size === 14 && cnt['预设'] === 16 && cnt['用途'] === 11 && (cnt['导入'] || 0) >= 30 && cnt['MIDI'] === 5 && (cnt['换谱类'] || 0) >= 20,
        'K2 同一批谱编辑器谱名＝服务端 nameOf（谱行一致；面板谱名＝建出来的谱名；预设原始 JSON 同名；换谱类落到目标谱行），覆盖 14 种谱行',
        JSON.stringify({ n: out.length, cnt, stacks: [...stacks].sort().join(), bad: bad.slice(0, 12) }));
    });

    /* ---------- 起真服务端：语料全部上架 ---------- */
    try { fs.unlinkSync(DB); } catch (_) {}
    srv = await startServer();   // 先起一次建表＋官方种子
    srv.p.kill(); await new Promise(r => setTimeout(r, 300));
    const sd = seed(items.concat(ADV, ADV2));
    srv = await startServer();

    /* ---------- K3 ---------- */
    await guard('K3', async () => {
      const list = JSON.parse((await get('/api/pub/scores')).body).scores || [];
      const byId = Object.fromEntries(list.map(s => [s.id, s]));
      const bad = [];
      for (const x of items) {
        const s = byId[x.id];
        if (!s) { bad.push(x.id + ' 不在列表'); continue; }
        if (s.typeLabel !== x.name) bad.push(x.tag + ' 列表 typeLabel ' + s.typeLabel + ' ≠ ' + x.name);
        if (s.type !== x.dt) bad.push(x.tag + ' 列表 type ' + s.type + ' ≠ 编辑器 docType ' + x.dt);
      }
      /* SSR 落地页与 og 封面：抽 24 份（覆盖 14 种谱行） */
      const pick = []; const seen = new Set(); items.forEach(x => { if (!seen.has(x.stack) || pick.length < 24) { seen.add(x.stack); pick.push(x); } });
      for (const x of pick.slice(0, 30)) {
        const h = (await get('/pub/' + x.id)).body, cv = (await get('/pub/' + x.id + '/cover.svg')).body;
        const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        if (t !== x.title + ' ' + x.name + ' - 谱友圈谱库') bad.push(x.tag + ' SSR 标题 ' + t);
        if (!cv.includes(x.name + ' · ')) bad.push(x.tag + ' 封面无谱名');
      }
      T(sd.includes('seeded ' + (items.length + ADV.length + ADV2.length)) && bad.length === 0, 'K3 真服务端：谱库列表 typeLabel、SSR 落地页标题、og 封面＝编辑器谱名；谱类 type＝编辑器 docType（分类不改）',
        JSON.stringify({ seeded: sd.trim().slice(0, 40), n: items.length, list: list.length, bad: bad.slice(0, 10) }));
    });

    /* ---------- K4 观看页 / 分享卡 / 小程序分享 ---------- */
    await guard('K4', async () => {
      const ids = [...new Map(items.map(x => [x.stack, x])).values()];   // 每种谱行一份（14 份）
      const pg = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + ids[0].id, { wait: 1500 });
      const nav = await pg.evaluate(() => document.title);
      const res = [];
      for (const x of ids) {
        const r = await pg.evaluate(async id => { await openRemotePub(id); await new Promise(r => setTimeout(r, 60));
          const svg = buildShareCardSVG(), tl = (svg.match(/<text x="722" y="56"[^>]*>([^<]*)<\/text>/) || [])[1] || '';
          const r2 = { title: document.title, card: tl, share: typeof pubShareTitle === 'function' ? pubShareTitle(song, 44) : null, va: (document.querySelector('#viewerbar') || {}).textContent || '' };
          try { exitViewer(); } catch (_) {} return r2; }, x.id);
        res.push(Object.assign({ tag: x.tag, name: x.name, t: x.title }, r));
      }
      await pg._ctx.close();
      const bad = res.filter(r => r.title !== r.t + ' · ' + r.name + ' · 谱友圈谱库' || r.card !== r.name || r.share !== r.t + ' · ' + r.name);
      /* 小程序：长歌名＋演唱者＋最长谱名——网页端发出的 share（真跳转、小程序 UA）≤44 且谱名完整，score.js 原样收下作卡片标题 */
      const longX = items.find(x => x.name === '钢琴弹唱谱（纯伴奏，五线＋简谱对照）') || items.find(x => x.name.length >= 10);
      const pm = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + longX.id, { wait: 400, ua: 'Mozilla/5.0 (Linux; Android 14) MicroMessenger/8.0.49 miniProgram',
        init: 'window.__wxjs_environment="miniprogram";' });
      /* CI 慢机实测：观看页载入完成前就改 song.title，载入后的自动 wxShareCard 会盖掉 __wxpm——先等观看页揭幕（v67.6 CI 抖动修） */
      await pm.waitForFunction(() => typeof viewerMode !== 'undefined' && viewerMode && !!document.getElementById('vw-fav'), null, { timeout: 15000 }).catch(() => {});
      await pm.evaluate(() => { song.title = '一首名字特别特别长的歌曲用来测试小程序分享卡的标题截断'; song.singer = '某位歌手'; window.__wxpm = null; wxShareCard(); });
      await pm.waitForFunction(() => { const d = window.__wxpm && window.__wxpm.data; return !!d && String(d.share || '').startsWith('一首名字'); }, null, { timeout: 8000 }).catch(() => {});
      const mp = await pm.evaluate(() => window.__wxpm && window.__wxpm.data);
      await pm._ctx.close();
      let cfg = null; global.Page = c => { cfg = c; };
      global.wx = { getEnterOptionsSync: () => ({ scene: 1001 }), getLaunchOptionsSync: () => ({ scene: 1001 }), showShareMenu: () => {}, login: cb => cb && cb.fail && cb.fail(), request: () => {}, getStorageSync: () => '', removeStorageSync: () => {} };
      const sp = path.join(MP_ROOT, 'pages/score/score.js'); delete require.cache[sp]; require(sp);
      const ctx = { id: longX.id }; cfg.onMsg.call(ctx, { detail: { data: [mp || {}] } });
      const card = cfg.onShareAppMessage.call(ctx, { webViewUrl: 'https://puku.puyouquan.com/kanpu.html?pub=' + longX.id });
      const mpOk = !!mp && mp.share.length <= 44 && mp.share.endsWith(' · ' + longX.name) && mp.share.startsWith('一首名字') && mp.share.includes('…') && card.title === mp.share;
      T(nav === ids[0].title + ' · ' + ids[0].name + ' · 谱友圈谱库' && bad.length === 0 && mpOk,
        'K4 观看页标题（真跳转 + 14 种谱行）、分享卡 PNG 右上角、小程序分享 share＝统一谱名；长歌名截歌名不截谱名（≤44，小程序卡片标题原样）',
        JSON.stringify({ nav, bad: bad.slice(0, 4), mp: mp && mp.share, mpLen: mp && mp.share.length, card: card && card.title }));
    });

    /* ---------- K5 谱库卡片 ---------- */
    await guard('K5', async () => {
      const list = JSON.parse((await get('/api/pub/scores')).body).scores || [];
      const lab = Object.fromEntries(list.map(s => [s.id, s.typeLabel]));
      const pg = await mkPage(b, 'https://www.puyouquan.com/', { wait: 1500 });
      const site = await pg.evaluate(() => [...document.querySelectorAll('#lib-grid .cc-card')].map(c => ({ id: (c.getAttribute('href').match(/pub=([^&]+)/) || [])[1], t: c.querySelector('.cc-type').textContent })));
      /* 分类筛选仍按 docType：点「歌谱」筛出的全部是 type=vocal */
      const chip = await pg.$('#lib-cats [data-cat="vocal"]');
      let vocalOk = false;
      if (chip) { await chip.click(); await pg.waitForTimeout(200);
        const ids2 = await pg.evaluate(() => [...document.querySelectorAll('#lib-grid .cc-card')].map(c => (c.getAttribute('href').match(/pub=([^&]+)/) || [])[1]));
        const typ = Object.fromEntries(list.map(s => [s.id, s.type])); vocalOk = ids2.length > 0 && ids2.every(id => typ[id] === 'vocal'); }
      await pg._ctx.close();
      const siteBad = site.filter(c => c.t !== lab[c.id]);
      /* 编辑器谱友圈：线上卡片读服务端 typeLabel；本地演示谱（无网）按谱面现算 */
      const pe = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 1500 });
      const ed = await pe.evaluate(async () => { hideStartPad(); openCircle(); await new Promise(r => setTimeout(r, 900));
        return [...document.querySelectorAll('#circle .cc-card')].map(c => ({ id: c.dataset.pub, t: c.querySelector('.cc-type').textContent, remote: c.dataset.remote === '1' })); });
      await pe._ctx.close();
      const edBad = ed.filter(c => c.remote && c.t !== lab[c.id]);
      const pl = await b.newPage(); await pl.goto('file://' + ED); await pl.waitForTimeout(900);
      const loc = await pl.evaluate(() => { hideStartPad(); openCircle(); return [...document.querySelectorAll('#circle .cc-card')].map(c => { const pb = circlePubs().find(x => x.pid === c.dataset.pub);
        return { t: c.querySelector('.cc-type').textContent, want: pb && pb.data ? docTypeLabelPub(pb.data) : null }; }); });
      await pl.close();
      const locBad = loc.filter(c => c.t !== c.want);
      T(site.length >= 12 && siteBad.length === 0 && vocalOk && ed.filter(c => c.remote).length >= 12 && edBad.length === 0 && loc.length > 0 && locBad.length === 0,
        'K5 谱库卡片谱名：官网首页＝服务端 typeLabel（「歌谱」筛选仍按 docType）、编辑器谱友圈线上卡片＝typeLabel、本地演示谱＝按谱面现算',
        JSON.stringify({ site: site.length, siteBad: siteBad.slice(0, 3), vocalOk, ed: ed.length, edBad: edBad.slice(0, 3), loc: loc.length, locBad: locBad.slice(0, 3) }));
    });

    /* ---------- K6 埋点 create_stack ---------- */
    await guard('K6', async () => {
      const pg = await mkPage(b, 'https://zhipu.puyouquan.com/', { wait: 1500 });
      await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} hideStartPad(); });
      const n0 = pg._ev.length;
      /* ① 新建 → 面板默认（首访＝吉他弹唱）→ 填曲名 → 创建 */
      await pg.click(NEWB); await pg.waitForSelector('#nw-create', { timeout: 5000 });
      await pg.fill('#nw-title', '我的私密曲名');
      await pg.click('#nw-create'); await pg.waitForTimeout(500);
      /* ② 新建 ▾ → 钢琴即兴伴奏 */
      await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]', { timeout: 5000 }); await pg.click('#popmenu [data-fa="r1:newdd"]');
      await pg.waitForSelector('#nf-qm [data-q="pacc"]', { timeout: 5000 });
      await pg.click('#nf-qm [data-q="pacc"]'); await pg.waitForTimeout(500);
      /* ③ Alt+Shift+N 按上次（＝钢琴即兴伴奏） */
      await pg.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      await pg.keyboard.press('Alt+Shift+KeyN'); await pg.waitForTimeout(600);
      await pg.waitForTimeout(400);
      const ev = pg._ev.slice(n0).filter(e => /^create_/.test(e.name));
      await pg._ctx.close();
      const st = ev.filter(e => e.name === 'create_stack').map(e => e.meta), sg = ev.filter(e => e.name === 'create_song').map(e => e.meta);
      const rows = sql("SELECT name, meta FROM events WHERE name IN ('create_stack','create_song') ORDER BY id") || [];
      const dbSt = rows.filter(r => r.name === 'create_stack').map(r => r.meta), dbSg = rows.filter(r => r.name === 'create_song').map(r => r.meta);
      const want = ['gtr:JT:panel:gtr:1', 'pacc:JG:menu:pacc:0', 'pacc:JG:last:pacc:0'];
      T(st.join() === want.join() && sg.join() === 'tanchang,vocal,vocal' && !ev.some(e => /私密/.test(e.meta || '')) && dbSt.join() === want.join() && dbSg.join() === sg.join(),
        'K6 埋点 create_stack：面板创建 / ▾ 用途 / Alt+Shift+N 按上次各一条（用途:谱行:入口:打开用途:首次），create_song 照发且口径不变，meta 不含曲名，真服务端白名单入库',
        JSON.stringify({ st, sg, dbSt, dbSg }));
    });

    /* ---------- K7 收尾验收 major：无词器乐导入谱不叫「歌谱」「合唱」（真实点击导入） ---------- */
    await guard('K7', async () => {
      const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const pg = await ctx.newPage();
      pg.on('pageerror', e => errs.push('PAGEERR(K7):' + e.message));
      await pg.goto('file://' + ED); await pg.waitForFunction(() => typeof NWP !== 'undefined'); await pg.waitForTimeout(500);
      await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} hideStartPad(); });
      const imp = async (nm, xml, tg) => {
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} });
        await pg.click(NEWB); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc');
        await pg.setInputFiles('#nw-anyfile', { name: nm + '.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) });
        await pg.waitForFunction(() => !!(NWP.state && NWP.state.imp.a) && !!document.querySelector('#nf-ibasis'), null, { timeout: 6000 });
        if (tg) { await pg.click('#nf-tg-' + tg); await pg.waitForTimeout(150); }
        const orig = await pg.evaluate(() => ((document.querySelector('#nf-tg-orig small') || {}).textContent || ''));
        const basis = await pg.evaluate(() => document.getElementById('nf-ibasis').textContent);
        await pg.click('#nf-impgo'); await pg.waitForFunction(() => !document.querySelector('.nf-modal')); await pg.waitForTimeout(250);
        await pg.evaluate(() => { try { FLOW.tree.sync(); } catch (_) {} });   /* flow：音轨区谱类芯片在下一帧重画，先同步 */
        const r = await pg.evaluate(() => { const fl = typeof flowOn === 'function' && flowOn();
          return { ri: (((fl ? document.querySelector('#flw-rx-song .flw-rx-ell') : document.getElementById('ri-type')) || {}).textContent || '').split(' · ')[0], lab: docTypeLabel(song), k: NWB.stackOf(song), ll: song.lyricLines,
            lb: ((document.querySelector(fl ? '#flw-kchip .flw-kn' : '#lb-wrap .lb-kind b') || {}).textContent || ''), json: JSON.stringify(song) }; });
        return Object.assign(r, { orig, basis, srv: KIND.pubNameOf ? KIND.pubNameOf(JSON.parse(r.json)) : KIND.nameOf(JSON.parse(r.json)), json: undefined });
      };
      const res = [];
      for (const [nm, xml, k, want] of XML_NOLY) res.push(Object.assign({ nm, want, wk: k }, await imp(nm, xml)));
      const lyOne = await imp('单声部有词', XMLS[0][1]);
      const acc = await imp('小提琴独奏（无词）配伴奏', XML_NOLY[0][1], 'acc');
      /* 面板悬停预告＝建成谱名：器乐独奏 · 小提琴（不要歌词）点亮「钢琴大谱表」 */
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} localStorage.removeItem('musetab-nw-last'); });
      await pg.click(NEWB); await pg.waitForSelector('.nf-modal [data-scene]');
      await pg.click('[data-scene="inst"]'); await pg.click('[data-act="var"][data-k="instKey"][data-v="violin"]');
      await pg.hover('[data-row="G"]'); await pg.waitForTimeout(80);
      const hint = await pg.evaluate(() => document.querySelector('.nf-rowhint').textContent);
      await pg.click('[data-row="G"]'); await pg.waitForTimeout(80);
      const kindTxt = await pg.evaluate(() => document.getElementById('nf-kind').textContent);
      await pg.click('#nw-create'); await pg.waitForTimeout(300);
      const made = await pg.evaluate(() => ({ lab: docTypeLabel(song), k: NWB.stackOf(song), ll: song.lyricLines }));
      /* 谱型条换谱类：菜单项写的谱名＝换完的谱名（直接换：沿用无词；空谱重建：钢琴伴奏歌谱默认留 1 行词） */
      const sw = async (to) => {
        /* v68.7 S1 迁移（D4 谱类芯片只读）：flow 的换谱类菜单开者由音轨区芯片 #flw-kchip 改为悬浮条谱类 ▾ #flw-sb-kind（同一 lbMenuOpen、同一 #lb-menu，菜单项断言不变）。
           修前红修后绿：改前两处都能开（本条只换入口）；改后点芯片不开菜单，原写法 waitForSelector('#lb-menu') 超时 */
        const KB = await pg.evaluate(() => (typeof flowOn === 'function' && flowOn()) ? '#flw-sb-kind' : '#lb-wrap .lb-kind');
        await pg.click(KB); await pg.waitForSelector('#lb-menu');
        const item = await pg.evaluate(t => { const x = document.querySelector('#lb-menu .lb-mi[data-sw="' + t + '"]'); return x ? { name: (x.querySelector('b') || x).textContent, mode: x.className.replace(/.*m-/, '') } : null; }, to);
        await pg.click('#lb-menu .lb-mi[data-sw="' + to + '"]'); await pg.waitForTimeout(250);
        return Object.assign(item || {}, { after: await pg.evaluate(() => docTypeLabel(song)) });
      };
      await imp('小提琴独奏（无词）', XML_NOLY[0][1]);
      const swDirect = await sw('SG');
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} localStorage.removeItem('musetab-nw-last'); });
      await pg.click(NEWB); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('[data-scene="sight"]'); await pg.click('#nw-create'); await pg.waitForTimeout(300);
      const swRebuild = await sw('SG');
      await ctx.close();
      const noSong = r => !/歌谱|合唱/.test(r.ri + r.lab + r.lb + r.srv + r.orig);
      const badImp = res.filter(r => !(r.ri === r.want && r.lab === r.want && r.k === r.wk && r.srv === r.want && r.lb === r.want && r.ll === 0 && r.orig.includes(r.want) && /无歌词/.test(r.basis) && noSong(r)));
      T(badImp.length === 0 && lyOne.lab === '五线谱歌谱' && lyOne.ll === 1 && lyOne.srv === '五线谱歌谱'
        && acc.lab === '钢琴伴奏歌谱（五线谱）' && acc.ll === 1 && acc.srv === acc.lab
        && /点亮「钢琴大谱表」→ 旋律＋钢琴伴奏谱（五线谱）/.test(hint) && /旋律＋钢琴伴奏谱（五线谱）/.test(kindTxt) && made.lab === '旋律＋钢琴伴奏谱（五线谱）' && made.k === 'SG' && made.ll === 0
        && swDirect.mode === 'direct' && swDirect.name.includes(swDirect.after) && swDirect.after === '旋律＋钢琴伴奏谱（五线谱）'
        && swRebuild.mode === 'rebuild' && swRebuild.name.includes(swRebuild.after) && swRebuild.after === '钢琴伴奏歌谱（五线谱）',
        'K7 无词器乐导入谱（真实点击导入，按原文件）：歌词行数照文件＝0；右栏（flow：属性页「整谱 · 谱类」）/ 谱型条（flow：音轨区谱类芯片）/ 面板小字 / 谱库口径同名＝五线谱旋律 / 旋律＋钢琴伴奏谱（五线谱）/ 五线谱重奏谱，不含「歌谱」「合唱」；有词文件仍五线谱歌谱、「配钢琴伴奏」仍钢琴伴奏歌谱（五线谱）；面板悬停预告＝建成谱名；谱型条菜单项＝换完的谱名',
        JSON.stringify({ badImp: badImp.map(r => [r.nm, r.ri, r.lab, r.k, r.srv, r.lb, r.ll, r.orig]), lyOne: [lyOne.lab, lyOne.ll, lyOne.srv], acc: [acc.lab, acc.ll, acc.srv], hint, kindTxt, made, swDirect, swRebuild }));
    });

    /* ---------- K8 收尾验收 minor：恶意 / 老格式 / 坏谱——谱库列表不 500；谱库谱名＝观看页（真跳转）谱名；坏谱落地页 / 封面照常出 ---------- */
    await guard('K8', async () => {
      const L = await get('/api/pub/scores'); let list = []; try { list = JSON.parse(L.body).scores || []; } catch (_) {}
      const byId = Object.fromEntries(list.map(x => [x.id, x]));
      const bad = [];
      for (const x of ADV) {
        const s = byId[x.id]; if (!s) { bad.push(x.tag + ' 不在列表'); continue; }
        const h = await get('/pub/' + x.id), cv = await get('/pub/' + x.id + '/cover.svg');
        if (h.status !== 200 || cv.status !== 200) bad.push(x.tag + ' 落地页 ' + h.status + ' / 封面 ' + cv.status);
        if (!x.view) continue;
        const pg = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + x.id, { wait: 1300 });
        const t = await pg.evaluate(() => document.title); await pg._ctx.close();
        if (t !== x.title + ' · ' + s.typeLabel + ' · 谱友圈谱库') bad.push(x.tag + '：谱库 ' + s.typeLabel + ' ≠ 观看页「' + t + '」');
      }
      const nullOne = byId[ADV[ADV.length - 1].id];
      T(L.status === 200 && bad.length === 0 && nullOne && nullOne.typeLabel === '曲谱',
        'K8 恶意 / 老格式 / 坏谱：谱库列表 200；恶意短码 / 歌词 / 声部名 / 键名 / 无 v 字段的谱，谱库 typeLabel＝真跳转观看页标题里的谱名；坏谱（歌词是字符串 / 声部不是数组 / data 为 null）落地页、封面照常出',
        JSON.stringify({ status: L.status, n: list.length, bad: bad.slice(0, 8) }));
    });

    /* ---------- K9 收尾验收 minor：本地演示付费谱——卡片谱名＝观看栏谱名＝整谱统一谱名 ---------- */
    await guard('K9', async () => {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await ctx.newPage();
      pg.on('pageerror', e => errs.push('PAGEERR(K9):' + e.message));
      await pg.goto('file://' + ED); await pg.waitForFunction(() => typeof openCircle === 'function'); await pg.waitForTimeout(400);
      const want = await pg.evaluate(() => {
        const col = (ly) => ({ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, tie: false, lyrics: [ly || ''] });
        const m = (ly) => ({ tabs: [], voxes: [[col(ly)], [col('')]], repeatStart: false, repeatEnd: false });
        const data = { v: 3, title: '试看谱', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: [], voxVoices: ['女', '男'], voxNotations: ['staff', 'bass'], lyricLines: 1, measures: [m(''), m(''), m('啊'), m('啊')] };
        localStorage.setItem(CIRCLE_KEY, JSON.stringify([{ pid: 'locpaid1', title: '试看谱', author: '我', price: 9, preview: 2, type: docType(data), data, status: 'approved', pubAt: '2026-10-15 10:00' }]));
        try { hideStartPad(); } catch (_) {} openCircle(); return PQ_KIND.nameOf(data);
      });
      await pg.waitForSelector('.cc-card[data-pub="locpaid1"]');
      const card = await pg.$eval('.cc-card[data-pub="locpaid1"] .cc-type', e => e.textContent.trim());
      await pg.click('.cc-card[data-pub="locpaid1"] .cc-cover'); await pg.waitForTimeout(700);
      const bar = await pg.evaluate(() => ((document.querySelector('#viewerbar .va') || {}).textContent || '').split(' · ')[1] || '');
      await ctx.close();
      T(card === want && bar === want && want === '五线谱合唱谱', 'K9 本地演示付费谱（试看 2 小节、歌词从第 3 小节起）：真实点击卡片——卡片谱名＝观看栏谱名＝整谱统一谱名（不按试看截断后的谱算）', JSON.stringify({ card, bar, want }));
    });

    /* ---------- K10 收尾验收 minor：小程序分享标题截歌名不留半个 emoji ---------- */
    await guard('K10', async () => {
      const x = items.find(i => i.name === '钢琴弹唱谱（纯伴奏）') || items[0];
      const pm = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + x.id, { wait: 400, ua: 'Mozilla/5.0 (Linux; Android 14) MicroMessenger/8.0.49 miniProgram', init: 'window.__wxjs_environment="miniprogram";' });
      /* CI 慢机实测：观看页载入完成前就改 song.title，载入后的自动 wxShareCard 会盖掉 __wxpm——先等观看页揭幕（v67.6 CI 抖动修） */
      await pm.waitForFunction(() => typeof viewerMode !== 'undefined' && viewerMode && !!document.getElementById('vw-fav'), null, { timeout: 15000 }).catch(() => {});
      const out = [];
      for (const [t, sg] of [['a' + '🎵'.repeat(20), ''], ['🎵'.repeat(30), '歌手🎤'], ['长歌名' + '𝄞'.repeat(25), '']]) {
        await pm.evaluate(([t, sg]) => { song.title = t; song.singer = sg; window.__wxpm = null; wxShareCard(); }, [t, sg]);
        await pm.waitForFunction(t0 => { const d = window.__wxpm && window.__wxpm.data; return !!d && String(d.share || '').startsWith(t0); }, t.slice(0, 2), { timeout: 8000 }).catch(() => {});
        out.push(await pm.evaluate(() => { const sh = (window.__wxpm && window.__wxpm.data && window.__wxpm.data.share) || ''; return { sh, len: sh.length, lone: /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(sh), kind: docTypeLabelPub(song) }; }));
      }
      await pm._ctx.close();
      T(out.length === 3 && out.every(o => o.sh && o.len <= 44 && !o.lone && o.sh.endsWith(' · ' + o.kind) && o.sh.includes('…')),
        'K10 小程序分享标题（真跳转、小程序 UA）：长歌名含 emoji / 增补平面字符时按整字截——无孤立代理项、≤44 码元、谱名完整', JSON.stringify(out));
    });

    /* ---------- K11 收尾验收 minor：谱库卡片中长谱名不丢区分信息；外层 flex＋图标（p6a 合并后）仍不溢出 ---------- */
    await guard('K11', async () => {
      const NAMES = ['钢琴伴奏歌谱（五线谱）', '钢琴弹唱谱（纯伴奏，五线＋简谱对照）', '旋律＋钢琴伴奏谱（五线谱）', '简谱歌谱'];
      const geo = () => [...document.querySelectorAll('.cc-card')].slice(0, 4).map(c => {
        const t = c.querySelector('.cc-type'), n = t.querySelector('.cc-tname') || t, p = c.querySelector('.cc-price');
        const rt = t.getBoundingClientRect(), rn = n.getBoundingClientRect(), rp = p ? p.getBoundingClientRect() : null, lh = parseFloat(getComputedStyle(n).lineHeight) || 13.5;
        return { text: n.textContent, title: t.getAttribute('title'), clipped: n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1, lines: Math.round(rn.height / lh),
          inBox: rn.right <= rt.right + 0.5 && rn.left >= rt.left - 0.5, gap: rp ? Math.round(rp.left - rt.right) : 99 };
      });
      const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
      await pg.goto('file://' + ED); await pg.waitForFunction(() => typeof openCircle === 'function'); await pg.waitForTimeout(400);
      const ed = await pg.evaluate(([NAMES, geoSrc]) => { try { hideStartPad(); } catch (_) {} openCircle();
        ccRemote = NAMES.map((n, i) => ({ id: 'g' + i, title: '谱' + i, author: 'x', type: 'vocal', typeLabel: n, price: 0, measures: 8, cover: [] })); renderCircleGrid();
        const geo = eval(geoSrc), a = geo();
        /* 合并预演：p6a 把外层改 inline-flex 并在前面插 16px 谱类图标 */
        const st = document.createElement('style'); st.textContent = '.cc-type{display:inline-flex;align-items:center;gap:4px;padding:2px 9px 2px 6px}.cc-cover .cc-type svg.pqi{position:static;width:16px;height:16px;flex:none}'; document.head.appendChild(st);
        document.querySelectorAll('.cc-card .cc-type').forEach(t => t.insertAdjacentHTML('afterbegin', '<svg class="pqi" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>'));
        const m = geo(); st.remove(); return { a, m }; }, [NAMES, '(' + geo.toString() + ')']);
      const sp = await ctx.newPage();
      await sp.route(/^https?:/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"scores":[]}' }));
      await sp.goto('file://' + path.join(SITE, 'index.html')).catch(() => {});
      await sp.waitForFunction(() => window.PYQ_LIB && PYQ_LIB.card, null, { timeout: 15000 }).catch(() => {});
      const site = await sp.evaluate(([NAMES, geoSrc]) => { const g = document.getElementById('lib-grid'); if (!g || !window.PYQ_LIB) return null;
        g.innerHTML = NAMES.map((n, i) => ({ id: 's' + i, title: '谱' + i, type: 'vocal', typeLabel: n, price: i === 1 ? 12 : 0 })).map(PYQ_LIB.card).join(''); return eval(geoSrc)(); }, [NAMES, '(' + geo.toString() + ')']);
      await ctx.close();
      /* 第二轮验收 seam-2：本机演示付费谱（发布菜单定价 step 0.5）——长谱名两行徽标 × ¥12.5 / ¥19.5 / ¥128 / ¥999.5 / 已购，1440 / 1280 / 1024、浅色 / 深色 */
      const paid = {};
      for (const [W, theme] of [[1440, 'light'], [1280, 'light'], [1280, 'dark'], [1024, 'light']]) {
        const c2 = await b.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1, colorScheme: theme }); const p2 = await c2.newPage();
        p2.on('pageerror', e => errs.push('PAGEERR(K11):' + e.message));
        await p2.goto('file://' + ED); await p2.waitForFunction(() => typeof openCircle === 'function'); await p2.waitForTimeout(300);
        paid[W + theme] = await p2.evaluate(() => { try { hideStartPad(); } catch (_) {}
          const mk = (k, o, price, dual, own) => { const d = NWB.build(k, Object.assign({ title: '本地 ' + k, nMea: 4 }, o)); if (dual) d.voxDual = [true, false];
            return { pid: 'pp' + k + String(price).replace('.', '_') + (own ? 'o' : ''), title: d.title, author: '我', type: docType(d), price, preview: 2, pubAt: nowStamp(), sales: 0, tips: 0, views: 0, status: 'approved', data: JSON.parse(JSON.stringify(d)) }; };
          const L = [mk('SG', { lyr: 0 }, 12.5), mk('SG', {}, 19.5), mk('CG', {}, 128, true), mk('SJG', {}, 999.5), mk('SG', { lyr: 0 }, 9.5, false, true)];
          circlePubsSave(L); try { localStorage.setItem(OWN_KEY, JSON.stringify({ [L[4].pid]: true })); } catch (_) {}
          openCircle(); renderCircleGrid();
          return [...document.querySelectorAll('.cc-card')].filter(c => /^pp/.test(c.dataset.pub)).map(c => { const t = c.querySelector('.cc-type').getBoundingClientRect(), p = c.querySelector('.cc-price').getBoundingClientRect(), cv = c.querySelector('.cc-cover').getBoundingClientRect();
            return { n: c.querySelector('.cc-type').textContent, p: c.querySelector('.cc-price').textContent, gap: +(p.left - t.right).toFixed(1), inCover: t.left >= cv.left && t.right <= cv.right }; }); });
        await c2.close();
      }
      const paidBad = Object.entries(paid).flatMap(([k, a]) => (a.length === 5 ? a : [{ n: 'n=' + a.length, gap: -99 }]).filter(g => !(g.gap >= 2 && g.inCover !== false)).map(g => k + ' ' + g.n + ' ' + g.p + ' gap=' + g.gap));
      const ok = arr => Array.isArray(arr) && arr.length === 4 && arr.every((g, i) => g.text === NAMES[i] && g.title === NAMES[i] && g.lines <= 2 && g.inBox && g.gap >= 2)
        && !arr[0].clipped && !arr[2].clipped && !arr[3].clipped && arr[3].lines === 1;
      T(ok(ed.a) && ok(site) && ed.m.every(g => g.inBox && g.lines <= 2 && g.gap >= 2) && !ed.m[0].clipped && paidBad.length === 0,
        'K11 谱库卡片谱名（1280 宽）：编辑器谱友圈 / 官网卡片中长谱名不丢括号里的区分（≤2 行不裁切、短名仍一行、title＝全名、不压价格角标）；外层改 flex 并插 16px 图标后仍在框内；'
        + '第二轮：本机演示付费谱 ¥12.5 / ¥19.5 / ¥128 / ¥999.5 / 已购 × 长谱名在 1440 / 1280（浅 / 深）/ 1024 下都不压价格角标',
        JSON.stringify({ ed: ed.a, merged: ed.m, site, paidBad, paid1280: paid['1280light'] }));
    });
    /* ---------- K12 第二轮验收 S-2：旧格式 / 缺 tabVoices 的已发布谱——观看页打得开就同名，打不开就及时提示、谱库回落「曲谱」 ---------- */
    await guard('K12', async () => {
      const L = await get('/api/pub/scores'); let list = []; try { list = JSON.parse(L.body).scores || []; } catch (_) {}
      const byId = Object.fromEntries(list.map(x => [x.id, x]));
      const out = [];
      for (const x of ADV2) {
        const pg = await mkPage(b, 'https://puku.puyouquan.com/kanpu.html?pub=' + x.id, { wait: 2000 });
        const r = await pg.evaluate(() => { const v = document.getElementById('boot-veil');
          return { title: document.title, viewer: document.body.classList.contains('viewer'), veil: !!v && v.style.opacity !== '0', toast: ((document.getElementById('toast') || {}).textContent || '').trim(), meas: (song && song.measures || []).length, songTitle: song && song.title }; });
        await pg._ctx.close();
        out.push(Object.assign({ tag: x.tag, label: (byId[x.id] || {}).typeLabel }, r));
      }
      const [o, n] = out;
      T(L.status === 200 && o.label === '吉他弹唱谱' && o.viewer && !o.veil && o.title === ADV2[0].title + ' · 吉他弹唱谱 · 谱友圈谱库'
        && n.label === '曲谱' && !n.viewer && !n.veil && /曲谱数据异常/.test(n.toast) && !/简谱歌谱/.test(n.title) && n.songTitle !== ADV2[1].title,
        'K12 旧格式 / 缺 tabVoices 的已发布谱（真跳转观看页，2 秒内）：v:2 打得开（谱类按 migrate 后算）、标题谱名＝谱库 typeLabel；打不开的 v3 坏谱揭幕并提示「曲谱数据异常」、不把坏谱留成当前谱、标题不挂它的谱名，谱库谱名回落「曲谱」（此前遮罩卡 8 秒后静默落到默认谱）',
        JSON.stringify(out));
    });

    /* ---------- K13 第二轮验收 seam-1：本机演示谱观看栏平板竖屏不溢出 ---------- */
    await guard('K13', async () => {
      const res = {};
      for (const W of [641, 680, 720, 768, 800, 820, 900, 1024]) {
        const ctx = await b.newContext({ viewport: { width: W, height: 700 } }); const pg = await ctx.newPage();
        pg.on('pageerror', e => errs.push('PAGEERR(K13):' + e.message));
        await pg.goto('file://' + ED); await pg.waitForFunction(() => typeof openPubViewer === 'function'); await pg.waitForTimeout(300);
        res[W] = await pg.evaluate(async () => { try { hideStartPad(); } catch (_) {}
          const out = [];
          for (const [k, o, dual] of [['CG', {}, true], ['SG', { lyr: 0 }], ['SG', {}], ['SJG', {}], ['JT', {}]]) {
            const d = NWB.build(k, Object.assign({ title: '茉莉花', nMea: 4 }, o)); if (dual) d.voxDual = [true, false];
            circlePubsSave([{ pid: 'pubw', title: '茉莉花', author: '谱友圈官方', type: docType(d), price: 0, preview: 2, pubAt: nowStamp(), status: 'approved', data: JSON.parse(JSON.stringify(d)) }]);
            openPubViewer('pubw'); await new Promise(r => setTimeout(r, 120));
            const vb = document.getElementById('viewerbar'), ex = document.getElementById('vw-exit').getBoundingClientRect(), va = vb.querySelector('.va');
            out.push({ k, ov: vb.scrollWidth - vb.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth, exitIn: ex.right <= innerWidth + 0.5 && ex.width > 0,
              vaH: Math.round(va.getBoundingClientRect().height), title: va.getAttribute('title') || '', kind: PQ_KIND.nameOf(d) });
            try { exitViewer(); } catch (_) {}
          }
          return out; });
        await ctx.close();
      }
      const bad = Object.entries(res).flatMap(([W, a]) => a.filter(x => !(x.ov <= 0 && x.page <= 0 && x.exitIn && x.vaH <= 20 && x.title.includes(' · ' + x.kind + ' · '))).map(x => W + ' ' + x.kind + ' ov=' + x.ov + ' exit=' + x.exitIn + ' h=' + x.vaH));
      T(bad.length === 0, 'K13 本机演示谱观看栏（641 / 680 / 720 / 768 / 800 / 820 / 900 / 1024 宽 × 钢琴弹唱谱（纯伴奏，五线＋简谱对照）/ 旋律＋钢琴伴奏谱（五线谱）等长谱名）：#viewerbar 与整页不横向溢出、「退出观看」在屏内、作者 · 谱名 · 小节单行（省略）、全名在 title',
        JSON.stringify({ bad: bad.slice(0, 10), w800: res[800] }));
    });

    /* ---------- K14 第二轮验收 seam-5：「我的曲谱」卡片谱类行＝点开后的谱名（旧格式存档先 migrate 再起名） ---------- */
    await guard('K14', async () => {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
      pg.on('pageerror', e => errs.push('PAGEERR(K14):' + e.message));
      await pg.goto('file://' + ED); await pg.waitForFunction(() => typeof showLibrary === 'function'); await pg.waitForTimeout(400);
      const v2 = { v: 2, title: '老谱v2', key: 'G', beats: 4, unit: 4, tempo: 80, capo: 0, measures: [{ tab: [{ dur: 4, notes: [{ s: 1, f: 3 }], chord: 'G' }], vox: [{ dur: 4, deg: 1, acc: '', oct: 0, lyric: '啊' }] }] };
      const v1 = { title: '老谱v1', key: 'C', beats: 4, unit: 4, tempo: 90, measures: [{ columns: [{ dur: 4, notes: [{ s: 2, f: 1 }], chord: 'C', lyric: '啊' }] }] };
      const r = await pg.evaluate(async ([v2, v1]) => { try { hideStartPad(); } catch (_) {}
        const v3 = JSON.parse(JSON.stringify(NWB.build('SG', { title: '新谱', nMea: 2 })));
        libSave([{ id: 'sold2', title: v2.title, updatedAt: '2020-01-01', data: JSON.parse(JSON.stringify(v2)) }, { id: 'sold1', title: v1.title, updatedAt: '2019-01-01', data: JSON.parse(JSON.stringify(v1)) },
          { id: 'snew3', title: '新谱', updatedAt: '2026-10-01', data: v3 }]);
        libTab = 'mine'; showLibrary(); await new Promise(r => setTimeout(r, 250));
        const card = id => { const c = document.querySelector('[data-mine="' + id + '"] .sc-kind'); return c ? c.textContent + '|' + ((c.querySelector('svg.pqi') || { dataset: {} }).dataset.pq || '') : null; };
        const opened = d => { const m = migrate(JSON.parse(JSON.stringify(d))); return docTypeLabel(m) + '|' + docIcon(m).match(/data-pq="([^"]+)"/)[1]; };
        const stored = JSON.stringify(libLoad().map(x => x.data));
        return { c2: card('sold2'), c1: card('sold1'), c3: card('snew3'), o2: opened(v2), o1: opened(v1), o3: opened(v3), untouched: stored === JSON.stringify([v2, v1, v3]) };
      }, [v2, v1]);
      await ctx.close();
      const srv2 = KIND.pubNameOf(JSON.parse(JSON.stringify(v2))), srv1 = KIND.pubNameOf(JSON.parse(JSON.stringify(v1)));
      T(r.c2 === r.o2 && r.c1 === r.o1 && r.c3 === r.o3 && /^吉他弹唱谱\|/.test(r.c2) && /^吉他弹唱谱\|/.test(r.c1) && srv2 === '吉他弹唱谱' && srv1 === '吉他弹唱谱' && r.untouched,
        'K14「我的曲谱」卡片谱类行（图标＋谱名）＝点开后（migrate）的口径：旧格式 v2 / v1 存档叫吉他弹唱谱（此前读原始存档叫简谱歌谱）、与服务端谱库同名；v3 谱不变；只读不写回存档',
        JSON.stringify(Object.assign(r, { srv2, srv1 })));
    });
  } finally {
    if (srv) { try { srv.p.kill(); } catch (_) {} }
    for (const f of [DB, DB + '-wal', DB + '-shm']) { try { fs.unlinkSync(f); } catch (_) {} }
    await b.close();
  }
  const errs2 = errs.filter(e => !/ResizeObserver/.test(e));
  console.log('PASS ' + pass + '/' + total);
  console.log(errs2.length ? 'ERRORS:\n' + errs2.slice(0, 10).join('\n') : 'NO ERRORS');
  process.exit(pass === total && !errs2.length ? 0 : 1);
})().catch(e => { console.log('❌ 运行异常: ' + (e && e.stack || e)); process.exit(1); });
