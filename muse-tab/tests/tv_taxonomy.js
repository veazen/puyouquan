/* 分类升级 P0 引擎与数据（方案 docs/design-2026-11-taxonomy §五 派生规则 / §六 映射 / §十四 P0 验收 ②③；2026-10-31 负责人「好的，按建议」＝§十五 30 项按推荐）
   界面零变化：只验统一谱名表 PQ_KIND 新增的谱种引擎（PZ / pzOf / facetsOf / ikOf / docTypeOf / pzMatch，编辑器内联段＝api/kindname.js 逐字节）与服务端接口。
   X1 判法表 24 行（含 14a / 14b、15a–15c 分支、表外「单行简谱＋推断钢琴」）每行至少一例：行号、主谱种 › 二级、也出现在、乐器身份与方案逐条一致
      （含 GP 导入的弹唱 / 指弹、带和弦名无扫弦的 GP 指弹、古筝左右手两行简谱、二胡二重奏、古筝大谱表、音轨名 Violin 而无 instKey 的导入、空白谱建的单行五线谱器乐）
   X2 曲库 10 首（api/seed-library.json 的 lib-os-*；v70.0 起种子里另有示例 / 公版钢琴 lib-ex-* / lib-pd-*，由 tv_v700ex 核）＝§6.3：9 首艺术歌曲 钢琴谱 › 弹唱（也在 五线谱 › 歌曲）、夏威夷骊歌 合唱谱 › 五线合唱（也在 五线谱 › 合唱、钢琴谱 › 伴奏）
   X3 示例 16 份（编辑器 PRESETS，migrate 后）＝§6.4；真实导入 MusicXML 6 份（小提琴独奏按音轨名进器乐、长笛＋钢琴、弦乐四重奏、SAB、人声＋钢琴、钢琴）；
      编辑器页面里的 PQ_KIND（内联段）与 node 端对同一批谱给出相同的谱种 / 分面 / 谱类
   X4 不变式：互切镜像（不在钢琴组、不是对照行的旋律 / 人声行整体简谱⇄五线谱；只许 12/13、23/24 两对例外，15c/17 一对在 P0 消失）、名实一致、含有一致、一级内唯一
   X5 旧 type / typeLabel 逐值不变：编辑器语料（预设 / 14 谱行变体 / 11 用途 / 导入）＋金表——编辑器 docType 与修前副本（fixtures/taxo_prev.js）逐值相同；
      服务端 type 只在 §十二第 5 条点名的三类边角改变（老钢琴谱右手有词 / 显式分组全部失效 / 脏短码与 v:2·无 v 老格式），且等于编辑器口径；
      typeLabel 只有 J 多声部无词改名（拍板 22 / 26：简谱重奏谱 / X谱（简谱））与纯伴奏 CG 改名（拍板 10，P1 同版：钢琴伴奏谱（纯伴奏））；
      v70.0 P2a 第 0 步登记两条有意改名（规格 docs/spec-2026-11-v700.md §5）：拍板 11 合唱带钢琴「简谱 / 五线谱合唱谱（含钢琴伴奏）」、
      拍板 22 后半 无词旋律＋钢琴带乐器身份「X＋钢琴伴奏谱（简谱 / 五线谱）」（原「钢琴伴奏歌谱」/「旋律＋钢琴伴奏谱（五线谱）」）
   X6 坏谱：pzOf / facetsOf / docTypeOf / pubKindOf 不抛错、只读不改入参
   X7 真服务端（api/server.js + 临时库）：卡片带 pz / sub / inst / also / fx 且＝node 推断；?pz= / ?sub= / ?inst= 在全库筛（230 首旧谱垫底，第 201 首起也筛得到），
      主谱种在前、翻页不重不漏；/api/pub/cats＝按卡片本地重算（一级＝各二级之和）；坏谱在列表 / 筛选 / 计数里都不 500
   修前红：MUSETAB_URL / MUSETAB_API 指向 23b6b01 的编辑器 / api 副本复跑。env：MUSETAB_URL 编辑器、MUSETAB_API 服务端 server.js。 */
'use strict';
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const { spawn, spawnSync } = require('child_process');
const http = require('http');

const ED = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const API_DIR = path.dirname(process.env.MUSETAB_API || path.resolve(__dirname, '../../api/server.js'));
const K = require(path.join(API_DIR, 'kindname.js'));
const PREV = require('./fixtures/taxo_prev.js');
const LIB = JSON.parse(fs.readFileSync(path.join(API_DIR, 'seed-library.json'), 'utf8'));

let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
const errs = [];
const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name + '（运行异常）', String(e && e.stack || e).slice(0, 300)); } };
const J = x => JSON.parse(JSON.stringify(x));
const has = f => typeof K[f] === 'function';

/* ---------- 金表样例（存储 JSON 口径：undefined 记谱法写 null） ---------- */
const C = o => Object.assign({ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
const lyOn = (ly, i) => ly === true || (Array.isArray(ly) && ly.includes(i));
const V = (names, nota, o, ly) => Object.assign({ v: 3, title: 't', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: [], voxVoices: names, voxNotations: nota, lyricLines: ly ? 1 : 0,
  measures: [{ tabs: [], voxes: names.map((_, i) => [C(lyOn(ly, i) ? { lyrics: ['啊'] } : {}), C({ deg: 3 })]) }] }, o || {});
const TB = (o, cols) => Object.assign({ v: 3, title: 't', key: 'G', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: ['吉他1'], voxVoices: [], lyricLines: 0,
  measures: [{ tabs: [cols || [{ dur: 4, notes: [{ s: 1, f: 0 }] }, { dur: 4, notes: [{ s: 2, f: 1 }] }]], voxes: [] }] }, o || {});
const JT = o => Object.assign({ v: 3, title: 't', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: ['吉他1'], voxVoices: ['旋律1'], lyricLines: 1,
  measures: [{ tabs: [[{ dur: 4, chord: 'C', strum: 'd', notes: [{ s: 2, f: 1 }] }]], voxes: [[C({ lyrics: ['啊'] })]] }] }, o || {});
const BR = (a, b) => ({ type: 'bracket', from: a, to: b }), BC = (a, b) => ({ type: 'brace', from: a, to: b });
const ACC = [null, 'staff', 'bass'], ACS = ['staff', 'staff', 'bass'], ACN = ['旋律', '右手伴奏', '左手伴奏'];
/* [说明, 谱, 行号, 主谱种.二级, 也出现在, 乐器身份] —— §5.2 判法表 / §6.1 映射表 */
const GOLD = [
  ['JT 吉他弹唱谱', JT(), '1', 'jita.tanchang', [], ''],
  ['JT 尤克里里弹唱谱', JT({ inst: 'uku', tabVoices: ['尤克里里1'] }), '1', 'uku.tanchang', [], ''],
  ['T 留了词位', TB({ lyricLines: 1 }), '2', 'jita.tanchang', [], ''],
  ['T GP 导入的弹唱（和弦＋扫弦）', TB({}, [{ dur: 4, chord: 'G', strum: 'd', notes: [{ s: 6, f: 3 }] }, { dur: 4, strum: 'u', notes: [] }]), '2', 'jita.tanchang', [], ''],
  ['T GP 导入的指弹（只有音）', TB(), '3', 'jita.zhitan', [], ''],
  ['T 带和弦名、没有扫弦的 GP 指弹（T19）', TB({}, [{ dur: 4, chord: 'Am', notes: [{ s: 5, f: 0 }] }, { dur: 4, strum: 'arp', notes: [{ s: 3, f: 2 }] }]), '3', 'jita.zhitan', [], ''],
  ['T 尤克里里无和弦无词', TB({ inst: 'uku', tabVoices: ['尤克里里1'] }), '3', 'uku.zhitan', [], ''],
  ['ST 吉他独奏谱', TB({ tabStaff: true }), '4', 'jita.zhitan', [], ''],
  ['ST 尤克里里独奏谱（修：能按尤克里里筛）', TB({ tabStaff: true, inst: 'uku', tabVoices: ['尤克里里1'] }), '4', 'uku.zhitan', [], ''],
  ['C 和弦谱', V(['和弦'], [null], { func: true, chordOnly: true }), '5', 'gongneng.hexian', [], ''],
  ['CJ 功能谱无词', V(['旋律'], [null], { func: true }), '6', 'gongneng.jishu', [], ''],
  ['CJ 功能谱有词', V(['旋律'], [null], { func: true }, true), '6', 'gongneng.jishu', ['jianpu.gequ'], ''],
  ['CJ 功能谱有词·儿歌', V(['旋律'], [null], { func: true, intent: 'kids' }, true), '6', 'gongneng.jishu', ['jianpu.erge'], ''],
  ['CS 五线谱和弦谱有词', V(['旋律'], ['staff'], { func: true }, true), '6', 'gongneng.jishu', ['wuxian.gequ'], ''],
  ['CG 纯伴奏', V(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true }), '7', 'gangqin.banzou', [], ''],
  ['CG 纯伴奏带简谱对照', V(['右手', '左手'], ['staff', 'bass'], { pianoAcc: true, voxDual: [true, false] }), '7', 'gangqin.banzou', ['wuxian.duizhao', 'jianpu.duizhao'], ''],
  ['SJ 教学对照谱', V(['旋律'], ['staff'], { voxDual: [true] }, true), '8', 'wuxian.duizhao', ['jianpu.duizhao'], ''],
  ['SJG 教学对照谱（含伴奏）有词', V(ACN, ACS, { voxDual: [true, false, false], voxGroups: [BC(1, 2)] }, [0]), '8', 'wuxian.duizhao', ['jianpu.duizhao', 'gangqin.tanchang'], ''],
  ['SJG 无词', V(ACN, ACS, { voxDual: [true, false, false], voxGroups: [BC(1, 2)] }), '8', 'wuxian.duizhao', ['jianpu.duizhao', 'gangqin.banzou'], ''],
  ['JG 钢琴伴奏歌谱有词', V(ACN, ACC, { voxGroups: [BC(1, 2)] }, [0]), '9', 'gangqin.tanchang', ['jianpu.gequ'], ''],
  ['JG 有词·儿歌弹唱', V(ACN, ACC, { voxGroups: [BC(1, 2)], intent: 'kids' }, [0]), '9', 'gangqin.tanchang', ['jianpu.erge'], ''],
  ['SG 艺术歌曲（人声＋钢琴有词）', V(['Voice', 'Piano·右手', 'Piano·左手'], ACS, { voxGroups: [BC(1, 2)] }, [0]), '9', 'gangqin.tanchang', ['wuxian.gequ'], ''],
  ['JG 无词＋二胡（二胡＋钢琴）', V(['二胡', '右手伴奏', '左手伴奏'], ACC, { voxGroups: [BC(1, 2)], instKey: 'erhu' }), '10', 'jianpu.qiyue', ['gangqin.banzou'], 'erhu'],
  ['SG 无词＋小提琴（音轨名推，T4）', V(['Violin', 'Piano·右手', 'Piano·左手'], ACS, { voxGroups: [BC(1, 2)] }), '10', 'wuxian.qiyue', ['gangqin.banzou'], 'violin'],
  ['JG 无词 intent=pacc', V(ACN, ACC, { voxGroups: [BC(1, 2)], intent: 'pacc' }), '11', 'gangqin.tanchang', ['jianpu.gequ'], ''],
  ['SG 无词 intent=kids', V(ACN, ACS, { voxGroups: [BC(1, 2)], intent: 'kids' }), '11', 'gangqin.tanchang', ['wuxian.gequ'], ''],
  ['JG 无词其余（跟谱名钢琴伴奏歌谱）', V(ACN, ACC, { voxGroups: [BC(1, 2)] }), '12', 'gangqin.tanchang', ['jianpu.gequ'], ''],
  ['SG 无词其余（旋律＋钢琴伴奏谱）', V(ACN, ACS, { voxGroups: [BC(1, 2)] }), '13', 'gangqin.banzou', ['wuxian.qiyue'], 'other'],
  ['G 钢琴独奏谱', V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)] }), '14a', 'gangqin.duzou', [], ''],
  ['G 电子琴独奏谱（键盘族）', V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)], instKey: 'synth' }), '14a', 'gangqin.duzou', [], 'synth'],
  ['G 钢琴独奏带简谱对照', V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)], voxDual: [true, false] }), '14a', 'gangqin.duzou', ['wuxian.duizhao', 'jianpu.duizhao'], ''],
  ['G 老谱：没写分组、右手有词（两端一致，修）', V(['右手', '左手'], ['staff', 'bass'], null, [0]), '14a', 'gangqin.duzou', [], ''],
  ['G 古筝大谱表（instKey，谱名古筝独奏谱）', V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)], instKey: 'guzheng' }), '14b', 'wuxian.qiyue', [], 'guzheng'],
  ['G 古筝大谱表（导入：音轨名推）', V(['Guzheng·右手', 'Guzheng·左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)] }), '14b', 'wuxian.qiyue', [], 'guzheng'],
  ['J 古筝左右手两行（无词、instKey）', V(['右手', '左手'], [null, null], { instKey: 'guzheng' }), '15a', 'jianpu.qiyue', [], 'guzheng'],
  ['J 二胡二重奏（无词、音轨名推）', V(['二胡一', '二胡二'], [null, null], { voxGroups: [BR(0, 1)] }), '15a', 'jianpu.qiyue', [], 'erhu'],
  ['J 四部合唱', V(['S', 'A', 'T', 'B'], [null, null, null, null], { voxGroups: [BR(0, 3)] }, true), '15b', 'hechang.jianpu', ['jianpu.hechang'], ''],
  ['J 合唱＋钢琴', V(['女', '男', '右手', '左手'], [null, null, 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }, [0, 1]), '15b', 'hechang.jianpu', ['jianpu.hechang', 'gangqin.banzou'], ''],
  ['J 二声部无词无乐器（简谱重奏谱）', V(['一', '二'], [null, null], { voxGroups: [BR(0, 1)] }), '15c', 'jianpu.qiyue', [], 'other'],
  ['S SATB 合唱', V(['S', 'A', 'T', 'B'], ['staff', 'staff', 'staff', 'bass'], null, true), '16', 'hechang.wuxian', ['wuxian.hechang'], ''],
  ['S 合唱＋钢琴（夏威夷骊歌式五行）', V(['Voice', 'Women', 'Men', 'Piano·右手', 'Piano·左手'], ['staff', 'staff', 'bass', 'staff', 'bass'], { voxGroups: [BR(1, 2), BC(3, 4)] }, [0, 1, 2]), '16', 'hechang.wuxian', ['wuxian.hechang', 'gangqin.banzou'], ''],
  ['S 弦乐四重奏（无词，导入）', V(['Vn1', 'Vn2', 'Va', 'Vc'], ['staff', 'staff', 'alto', 'bass']), '17', 'wuxian.chongzou', [], 'violin'],
  ['S 二声部重奏＋钢琴（无词）', V(['旋律1', '旋律2', '右手', '左手'], ['staff', 'staff', 'staff', 'bass'], { voxGroups: [BR(0, 1), BC(2, 3)] }), '17', 'wuxian.chongzou', ['gangqin.banzou'], ''],
  ['J 二胡谱（简谱）', V(['二胡'], [null], { instKey: 'erhu' }), '18', 'jianpu.qiyue', [], 'erhu'],
  ['J 萨克斯简谱', V(['旋律'], [null], { instKey: 'sax' }), '18', 'jianpu.qiyue', [], 'sax'],
  ['S 小提琴谱（五线谱）', V(['小提琴'], ['staff'], { instKey: 'violin' }), '18', 'wuxian.qiyue', [], 'violin'],
  ['S 导入小提琴：没写 instKey、音轨名 Violin（T4，原稿落视唱）', V(['Violin'], ['staff']), '18', 'wuxian.qiyue', [], 'violin'],
  ['S 二胡五线谱', V(['二胡'], ['staff'], { instKey: 'erhu' }), '18', 'wuxian.qiyue', [], 'erhu'],
  ['J 简谱歌谱有词', V(['旋律'], [null], null, true), '19', 'jianpu.gequ', [], ''],
  ['J 有词·儿歌', V(['旋律'], [null], { intent: 'kids' }, true), '19', 'jianpu.erge', [], ''],
  ['S 五线谱歌谱有词', V(['旋律'], ['staff'], null, true), '19', 'wuxian.gequ', [], ''],
  ['S 有词·儿歌（五线谱一律歌曲）', V(['旋律'], ['staff'], { intent: 'kids' }, true), '19', 'wuxian.gequ', [], ''],
  ['S 空白谱真填了词', V(['旋律'], ['staff'], { intent: 'blank' }, true), '19', 'wuxian.gequ', [], ''],
  ['S 视唱（intent=sight）', V(['旋律'], ['staff'], { intent: 'sight' }), '20', 'wuxian.shichang', [], ''],
  ['J 简谱视唱', V(['旋律'], [null], { intent: 'sight' }), '20', 'jianpu.shichang', [], ''],
  ['J 无词 intent=vocal', V(['旋律'], [null], { intent: 'vocal' }), '21', 'jianpu.gequ', [], ''],
  ['J 无词 intent=kids', V(['旋律'], [null], { intent: 'kids' }), '21', 'jianpu.erge', [], ''],
  ['S 无词 intent=inst', V(['旋律'], ['staff'], { intent: 'inst' }), '22', 'wuxian.qiyue', [], 'other'],
  ['S 空白谱建的单行（留了词位没填词，T19）', V(['旋律'], ['staff'], { intent: 'blank', lyricLines: 1 }), '22', 'wuxian.qiyue', [], 'other'],
  ['J 自选建的单行（留了词位）', V(['旋律'], [null], { intent: 'custom', lyricLines: 1 }), '22', 'jianpu.qiyue', [], 'other'],
  ['J 无词没有 intent（简谱歌谱）', V(['旋律'], [null]), '23', 'jianpu.gequ', [], ''],
  ['J 单行＋推断出的钢琴两行（表外补：含有一致）', V(['旋律', '钢琴右', '钢琴左'], ACC), '23', 'jianpu.gequ', ['gangqin.banzou'], ''],
  ['S 无词没有 intent（五线谱旋律）', V(['旋律'], ['staff']), '24', 'wuxian.shichang', [], ''],
  ['S 认不出的 intent 按没写', V(['旋律'], ['staff'], { intent: 'zzz' }), '24', 'wuxian.shichang', [], ''],
].map(([tag, d, row, main, also, inst]) => ({ tag, d: J(d), row, main, also, inst }));
/* 修前修后 type 会变的三类点名边角（§十二第 5 条）＋坏谱（X5 / X6 / X7） */
const EDGE = [
  ['边角 a 老钢琴谱右手有词（instKey=piano）', V(['RH', 'LH'], ['staff', 'bass'], { instKey: 'piano' }, [0]), 'a'],
  ['边角 a 老钢琴谱右手有词（声部名右手 / 左手）', V(['右手', '左手'], ['staff', 'bass'], null, [0]), 'a'],
  ['边角 b 显式分组全部失效、两行有词', V(['女', '男'], ['staff', 'bass'], { voxGroups: [BC(1, 2)] }, true), 'b'],
  ['边角 c 脏短码 inst 带反引号', JT({ inst: 'uku`', tabVoices: ['尤克里里1'] }), 'c'],
  ['边角 c voxNotations 带引号', V(['右', '左'], ["staff'", 'bass']), 'c'],
  ['边角 c v:2 老格式', { v: 2, key: 'G', measures: [{ tab: [{ dur: 4, notes: [{ s: 6, f: 3 }] }], vox: [{ dur: 4, deg: 1, lyric: '啊' }] }] }, 'c'],
  ['边角 c 没有 v 字段（老格式）', { title: 'nov', voxVoices: ['右', '左'], voxNotations: ['staff', 'bass'], tabVoices: [], measures: [{ tabs: [], voxes: [[C()], [C()]] }] }, 'c'],
].map(([tag, d, cat]) => ({ tag, d: J(d), cat }));
const BAD = [
  ['坏谱 data 是 null', null], ['坏谱 data 是数组', []], ['坏谱 data 是数字', 5],
  ['坏谱 小节不是数组', { v: 3, tabVoices: [], voxVoices: ['a'], measures: { a: 1 } }],
  ['坏谱 声部不是数组', { v: 3, tabVoices: [], voxVoices: ['a'], voxNotations: ['staff'], lyricLines: 1, measures: [{ tabs: [], voxes: { a: 1 } }] }],
  ['坏谱 歌词是字符串（两行谱表）', { v: 3, tabVoices: [], voxVoices: ['女', '男'], voxNotations: ['staff', 'bass'], lyricLines: 1, measures: [{ tabs: [], voxes: [[{ deg: 1, dur: 4, lyrics: '啊' }], [{ deg: 1, dur: 4 }]] }] }],
  ['坏谱 分组 / 记谱法 / 乐器是怪值', { v: 3, tabVoices: [], voxVoices: ['a', 'b'], voxNotations: 'staff', voxGroups: [null, 5, { type: 'brace', from: 'x' }], instKey: { toString: 1 }, intent: ['kids'], measures: [null, { voxes: [[null, { lyrics: [null, 1, { a: 1 }], chord: {} }]] }] }],
  ['坏谱 缺 tabVoices（观看页打不开）', { v: 3, voxVoices: ['右手', '左手'], voxNotations: ['staff', 'bass'], measures: [{ voxes: [[{ deg: 1 }], [{ deg: 1 }]] }] }],
  ['坏谱 顶层 key 是对象', { v: 3, key: { toString: 1 }, tempo: { valueOf: 1 }, tabVoices: [], voxVoices: ['a'], measures: [{ tabs: [], voxes: [[C()]] }] }],
].map(([tag, d]) => ({ tag, d: d == null ? d : J(d) }));
/* v70.5（规格 docs/spec-2026-11-v705.md §10.4 tv_taxonomy X6）坏 voxLayer：判据不成立的谱一律按独立谱表——分类结果＝剥掉 voxLayer 与见证后的结果，不抛、只读 */
const LBADT = (() => { const pno = (lay, o) => Object.assign({ v: 3, tabVoices: [], voxVoices: ['右手', '右手·2', '左手'], voxNotations: ['staff', 'staff', 'bass'], lyricLines: 0, voxLayer: lay,
    mixer: { 'vox:1': { on: true, lay: 1 } }, measures: [{ tabs: [], voxes: [[C()], [C()], [C()]] }] }, o || {});
  return [['坏层 长度不等', pno([null, 1])], ['坏层 不是数组', pno({ 1: 1 })], ['坏层 值是 true', pno([null, true, null])], ['坏层 越界 [1,null,null]', pno([1, null, null])],
    ['坏层 缺见证', pno([null, 1, null], { mixer: {} })], ['坏层 记谱法不同（层是低音）', pno([null, 1, null], { voxNotations: ['staff', 'bass', 'bass'] })],
    ['坏层 跨组边界（brace 1–2）', pno([null, 1, null], { voxGroups: [BC(1, 2)] })], ['坏层 和弦谱', pno([null, 1, null], { chordOnly: true })],
    ['坏层 mixer 是字符串', pno([null, 1, null], { mixer: 'x' })], ['坏层 声部不是数组', pno([null, 1, null], { voxVoices: 'ab' })]].map(([tag, d]) => ({ tag, d: J(d) })); })();
const stripLay = d => { const c = J(d); delete c.voxLayer; if (c.mixer && typeof c.mixer === 'object') Object.values(c.mixer).forEach(e => { if (e && typeof e === 'object') delete e.lay; }); return c; };

const placesOf = r => [r.pz + '.' + r.sub].concat(r.also || []);
const pzShow = r => r ? r.row + ' ' + placesOf(r).join('+') + (r.inst ? ' 〔' + r.inst + '〕' : '') : 'null';
const want = g => g.row + ' ' + [g.main].concat(g.also).join('+') + (g.inst ? ' 〔' + g.inst + '〕' : '');
const viewOrClean = d => { let v = null; try { v = K.viewOf(d); } catch (_) {} return v || (d && typeof d === 'object' && !Array.isArray(d) ? K.sanitizeLike(d) : {}); };

/* ---------- 不变式 ---------- */
/* 互切：不在钢琴花括号组、不是对照行（voxDual）的旋律 / 人声行整体在简谱和五线谱之间切换（＝作者逐行 setVoxNotation：只改 voxNotations[i]） */
function switched(d) {
  const s = J(d), vv = Array.isArray(s.voxVoices) ? s.voxVoices : [], dual = Array.isArray(s.voxDual) ? s.voxDual : [], vn = Array.isArray(s.voxNotations) ? s.voxNotations.slice() : [];
  const br = K.groupsOf(s).filter(g => g.type === 'brace'), inBr = i => br.some(g => i >= g.from && i <= g.to);
  let n = 0;
  for (let i = 0; i < vv.length; i++) { if (inBr(i) || dual[i]) continue; n++; vn[i] = K.isStaffNota(vn[i]) ? null : 'staff'; }
  for (let i = 0; i < vv.length; i++) if (vn[i] === undefined) vn[i] = null;
  s.voxNotations = vn;
  const same = JSON.stringify(br) === JSON.stringify(K.groupsOf(s).filter(g => g.type === 'brace'));
  return n ? { s, same } : null;
}
const nI = x => x === 'other' ? '' : (x || '');
function mirrorOk(a, b) {
  const g = x => x === 'erge' ? 'gequ' : x;
  if (a.pz === 'jianpu' || a.pz === 'wuxian') {
    if (b.pz !== (a.pz === 'jianpu' ? 'wuxian' : 'jianpu')) return false;
    if ((a.sub === 'qiyue' && b.sub === 'chongzou') || (a.sub === 'chongzou' && b.sub === 'qiyue')) return nI(a.inst) === nI(b.inst);   /* 简谱 › 器乐（多声部）↔ 五线谱 › 重奏 */
    return g(a.sub) === g(b.sub) && (a.sub !== 'qiyue' || nI(a.inst) === nI(b.inst));
  }
  if (b.pz !== a.pz) return false;
  if (a.pz === 'hechang') return b.sub === (a.sub === 'jianpu' ? 'wuxian' : 'jianpu');
  return b.sub === a.sub;
}
const MIRROR_EXC = [['12', '13'], ['23', '24']];   /* 方案 §5.4：跟现有谱名走造成的已知例外，只许减少；15c / 17 一对 P0 起消失 */
/* 名实一致：卡片谱名与主谱种不打架（拍板 10 的 CG 改名随 P1 同版上：「钢琴伴奏谱（纯伴奏）」在 钢琴谱 › 伴奏） */
function nameOk(nm, r) {
  const m = r.pz + '.' + r.sub;
  if (/合唱谱/.test(nm)) return r.pz === 'hechang';
  if (/^简谱重奏谱|谱（简谱）$/.test(nm)) return m === 'jianpu.qiyue';
  if (/^钢琴(弹唱|伴奏)谱（纯伴奏/.test(nm)) return m === 'gangqin.banzou';
  if (/独奏谱/.test(nm)) return ['gangqin.duzou', 'wuxian.qiyue', 'jita.zhitan', 'uku.zhitan'].includes(m);
  if (/弹唱谱/.test(nm)) return ['jita.tanchang', 'uku.tanchang', 'gangqin.tanchang'].includes(m);
  if (/重奏谱/.test(nm)) return m === 'wuxian.chongzou';
  if (/^[^＋]+谱（五线谱）$/.test(nm) && !/^钢琴伴奏/.test(nm)) return m === 'wuxian.qiyue';
  if (/功能谱|和弦谱/.test(nm)) return r.pz === 'gongneng';
  if (/教学对照谱/.test(nm)) return r.sub === 'duizhao';
  return true;
}
/* 含有一致：简谱旋律行的谱必含简谱、五线谱旋律行的谱必含五线谱（按谱行：J / JG / SJ / SJG 与 S / SG / SJ / SJG；弹唱谱与功能谱第 1–6 行除外，§5.3）；
   有钢琴花括号组且不是独奏（G）的必含钢琴谱 */
function containOk(d, r) {
  const k = K.stackOf(d), pl = placesOf(r).map(x => x.split('.')[0]);
  const vn = Array.isArray(d.voxNotations) ? d.voxNotations : [];
  const pno = K.groupsOf(d).some(g => g.type === 'brace' && g.to - g.from === 1 && K.isStaffNota(vn[g.from]) && vn[g.to] === 'bass');
  const bad = [];
  if (['J', 'JG', 'SJ', 'SJG'].includes(k) && !pl.includes('jianpu')) bad.push('缺简谱');
  if (['S', 'SG', 'SJ', 'SJG'].includes(k) && !pl.includes('wuxian')) bad.push('缺五线谱');
  if (pno && !['G', 'T', 'JT', 'ST', 'C', 'CJ', 'CS'].includes(k) && !pl.includes('gangqin')) bad.push('缺钢琴谱');
  return bad;
}
const uniqOk = r => { const p = placesOf(r).map(x => x.split('.')[0]); return new Set(p).size === p.length; };
function invariants(samples) {
  const bad = { mirror: [], name: [], contain: [], uniq: [] }, exc = [], skip = [];
  let mirN = 0;
  for (const x of samples) {
    const v = viewOrClean(x.d), r = K.pzOf(v), nm = K.nameOf(v);
    if (!nameOk(nm, r)) bad.name.push(x.tag + '：' + nm + ' → ' + pzShow(r));
    const c = containOk(v, r); if (c.length) bad.contain.push(x.tag + '：' + c.join() + ' ' + pzShow(r));
    if (!uniqOk(r)) bad.uniq.push(x.tag + '：' + pzShow(r));
    const sw = switched(v); if (!sw) continue;
    if (!sw.same) { skip.push(x.tag); continue; }   /* 推断出的钢琴组随切换变了（没写分组的老谱），不算互切 */
    mirN++;
    const r2 = K.pzOf(sw.s);
    if (mirrorOk(r, r2)) continue;
    if (MIRROR_EXC.some(([p, q]) => (r.row === p && r2.row === q) || (r.row === q && r2.row === p))) { exc.push(r.row + '→' + r2.row); continue; }
    bad.mirror.push(x.tag + '：' + pzShow(r) + ' ⇄ ' + pzShow(r2));
  }
  return { bad, exc: [...new Set(exc)].sort(), skip, mirN };
}

/* ---------- 修前修后的旧 type / typeLabel ---------- */
function edgeCat(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return '';
  let v = null; try { v = K.viewOf(d); } catch (_) {}
  if (v && v !== d) return 'c';
  if (Array.isArray(d.voxGroups) && d.voxGroups.length && !K.groupsExplicitOk(d)) return 'b';
  const vn = d.voxNotations || [], vv = d.voxVoices || [];
  if (!(Array.isArray(d.voxGroups) && d.voxGroups.length) && vv.length === 2 && vn[0] === 'staff' && vn[1] === 'bass' && (d.instKey === 'piano' || (vv[0] === '右手' && vv[1] === '左手')) && K.voxHasLyrics(d, 0, 1)) return 'a';
  return '';
}
const safe = (fn, dflt) => { try { return fn(); } catch (_) { return dflt; } };
/* v70.0 P2a 第 0 步有意改名（规格 §5.1 / §5.2；PREV 副本是 P0 修前规则，两条改名都要按谱面结构核：不许别的谱顺带改名）：
   拍板 11 J / S 多声部有词且带钢琴花括号组 → 「简谱 / 五线谱合唱谱（含钢琴伴奏）」；
   拍板 22 后半 JG / SG 无词、带乐器身份（不含钢琴）→ 「X＋钢琴伴奏谱（简谱）/（五线谱）」 */
function p2aRenameOk(was, now, d) {
  if (!d || typeof d !== 'object') return false;
  const k = safe(() => K.stackOf(d), ''), c = safe(() => K.ctxOf(d), null) || {};
  const ik = c.instKey && c.instKey !== 'piano' ? c.instKey : '';
  if ((k === 'J' || k === 'S') && c.nVox > 1 && c.lyr && c.pno === true && /^(简谱|五线谱)合唱谱$/.test(was) && now === was + '（含钢琴伴奏）') return true;
  if (k === 'JG' && !c.lyr && ik && was === '钢琴伴奏歌谱' && now === K.instName(ik) + '＋钢琴伴奏谱（简谱）') return true;
  if (k === 'SG' && !c.lyr && ik && was === '旋律＋钢琴伴奏谱（五线谱）' && now === K.instName(ik) + '＋钢琴伴奏谱（五线谱）') return true;
  return false;
}
function typeDrift(samples) {
  const bad = [], cats = {}, nameDiff = [];
  for (const x of samples) {
    const d = x.d, pk = safe(() => K.pubKindOf(d), null);
    if (!pk) { bad.push(x.tag + '：pubKindOf 不可用'); continue; }
    const v = safe(() => K.viewOf(d), null), oldSrv = safe(() => PREV.docTypeSrv(d && typeof d === 'object' ? d : {}), 'vocal');
    /* 服务端新 type＝修前编辑器口径（观看页看到的谱；打不开的按清洗后的原始结构＝修前服务端口径） */
    const expect = v ? safe(() => PREV.docTypeEd(v), 'vocal') : safe(() => PREV.docTypeSrv(viewOrClean(d)), 'vocal');
    if (pk.type !== expect) bad.push(x.tag + '：服务端 type ' + pk.type + ' ≠ 编辑器口径 ' + expect);
    if (pk.type !== oldSrv) { const c = edgeCat(d); if (!c) bad.push(x.tag + '：type 变了 ' + oldSrv + '→' + pk.type + '（不在点名边角里）'); else cats[c] = (cats[c] || 0) + 1; }
    const oldName = v ? safe(() => PREV.PQ_KIND.nameOf(v), '曲谱') : '曲谱';
    if (pk.typeLabel !== oldName) {
      const ok = (v && PREV.PQ_KIND.stackOf(v) === 'J' && oldName === '简谱合唱谱' && /^(简谱重奏谱|.+谱（简谱）)$/.test(pk.typeLabel) && !K.ctxOf(v).lyr)
        /* 分类升级 P1 有意迁移（拍板 10 与 P1 同版）：纯伴奏 CG「钢琴弹唱谱（纯伴奏…）」改名「钢琴伴奏谱（纯伴奏…）」，只换「弹唱」两字 */
        || (v && PREV.PQ_KIND.stackOf(v) === 'CG' && /^钢琴弹唱谱（纯伴奏/.test(oldName) && pk.typeLabel === oldName.replace('钢琴弹唱谱', '钢琴伴奏谱'))
        /* v70.0 P2a 第 0 步有意迁移：拍板 11 / 22 后半（规格 §5.1 / §5.2） */
        || (v && p2aRenameOk(oldName, pk.typeLabel, v));
      if (ok) nameDiff.push(pk.typeLabel); else bad.push(x.tag + '：typeLabel 变了 ' + oldName + '→' + pk.typeLabel);
    }
  }
  return { bad, cats, nameDiff };
}

/* ---------- MusicXML 样本（真实导入）。注：只有一个大谱表声部的文件导入后声部名按编辑器惯例改成「右手 / 左手」（v65.2 B3a），音轨名丢失——
   古筝等非键盘乐器的单个大谱表导入认不出乐器（落 钢琴谱 › 独奏），留给 P2a 导入写 instKey；判法本身（14b）见 X1 金表 ---------- */
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
  ['导入 小提琴独奏（无词，音轨名 Violin）', mxl([{ name: 'Violin', clefs: ['G'] }], '小提琴独奏'), '18 wuxian.qiyue 〔violin〕'],
  ['导入 长笛＋钢琴（无词）', mxl([{ name: 'Flute', clefs: ['G'] }, { name: 'Piano', clefs: ['G', 'F'] }], '长笛与钢琴'), '10 wuxian.qiyue+gangqin.banzou 〔flute〕'],
  ['导入 弦乐四重奏（无词）', mxl([{ name: 'Violin I', clefs: ['G'] }, { name: 'Violin II', clefs: ['G'] }, { name: 'Viola', clefs: ['G'] }, { name: 'Cello', clefs: ['F'] }], '弦乐四重奏'), '17 wuxian.chongzou 〔violin〕'],
  ['导入 SAB 三部合唱', mxl([{ name: 'Soprano', clefs: ['G'], ly: true }, { name: 'Alto', clefs: ['G'], ly: true }, { name: 'Baritone', clefs: ['F'], ly: true }], 'SAB'), '16 hechang.wuxian+wuxian.hechang'],
  ['导入 人声＋钢琴（有词）', mxl([{ name: 'Voice', clefs: ['G'], ly: true }, { name: 'Piano', clefs: ['G', 'F'] }], '人声钢琴'), '9 gangqin.tanchang+wuxian.gequ'],
  ['导入 钢琴大谱表', mxl([{ name: 'Piano', clefs: ['G', 'F'] }], '钢琴'), '14a gangqin.duzou'],
];
/* 示例 16 份（方案 §6.4） */
const PRESET_WANT = {
  '小星星（分解弹唱）': '1 jita.tanchang', '欢乐颂（扫弦弹唱）': '1 jita.tanchang', '指弹技法示例': '1 jita.tanchang', '两只老虎（双声部）': '1 jita.tanchang',
  '小星星（尤克里里）': '1 uku.tanchang', '流行进行（功能谱）': '6 gongneng.jishu', '反复与段落示例': '19 jianpu.gequ', '指弹练习曲·行板（独奏谱）': '4 jita.zhitan',
  '欢乐颂（钢琴独奏）': '14a gangqin.duzou', '卡农进行（钢琴弹唱伴奏）': '7 gangqin.banzou', '送别（歌谱）': '19 jianpu.gequ', '欢乐颂（四部合唱）': '15b hechang.jianpu+jianpu.hechang',
  '小步舞曲（器乐五线谱）': '24 wuxian.shichang', '欢乐颂（教学对照谱）': '8 wuxian.duizhao+jianpu.duizhao', '和弦进行示例（纯和弦谱）': '5 gongneng.hexian', '流行副歌（功能谱·进阶）': '6 gongneng.jishu+jianpu.gequ',
};

/* ---------- 真服务端 ---------- */
const SQLF = (() => { try { require('node:sqlite'); return []; } catch (_) { return ['--experimental-sqlite']; } })();
const PORT = 3900 + (process.pid % 90);
const DB = path.join(os.tmpdir(), 'pyq_taxo_' + process.pid + '.db');
const BASE = 'http://127.0.0.1:' + PORT;
const get = u => new Promise((res, rej) => http.get(BASE + u, r => { let b = ''; r.setEncoding('utf8'); r.on('data', c => b += c); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
const getJ = async u => { const r = await get(u); let j = null; try { j = JSON.parse(r.body); } catch (_) {} return { status: r.status, j }; };
function seed(items) {
  const f = path.join(os.tmpdir(), 'pyq_taxo_' + process.pid + '.json');
  fs.writeFileSync(f, JSON.stringify(items.map(x => ({ id: x.id, title: x.title, data: x.d, at: x.at }))));
  const code = `const {q,now}=require('./db'); const L=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
    const uid='taxonomy0001'; q.userCreate.run(uid,'13100004444','谱种金表',now()); const t=now();
    L.forEach(x=>{ q.scoreUpsert.run(x.id,uid,x.title,'',JSON.stringify(x.data),t,t); q.scoreSetStatus.run('published',x.id,uid); q.scoreSnap.run(t+x.at,x.id); });
    console.log('seeded '+L.length);`;
  const r = spawnSync(process.execPath, [...SQLF, '-e', code, f], { cwd: API_DIR, env: Object.assign({}, process.env, { DB_PATH: DB, JWT_SECRET: 'taxonomy' }), encoding: 'utf8' });
  try { fs.unlinkSync(f); } catch (_) {}
  return (r.stdout || '') + (r.status ? (r.stderr || '') : '');
}
async function startServer() {
  const p = spawn(process.execPath, [...SQLF, 'server.js'], { cwd: API_DIR, env: Object.assign({}, process.env, { PORT: String(PORT), DB_PATH: DB, JWT_SECRET: 'taxonomy', COOKIE_DOMAIN: '' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', c => log += c); p.stderr.on('data', c => log += c);
  for (let i = 0; i < 60; i++) { try { const r = await get('/api/health'); if (r.status === 200) return { p, log: () => log }; } catch (_) {} await new Promise(r => setTimeout(r, 150)); }
  throw new Error('server not up: ' + log.slice(0, 400));
}
async function allPages(q) {
  const out = []; let tot = -1, st = 200;
  for (let p = 0; p <= 200; p++) {
    const r = await getJ('/api/pub/scores?' + q + '&size=60&page=' + p); st = Math.max(st, r.status);
    if (r.status !== 200 || !r.j || !Array.isArray(r.j.scores)) return { status: r.status, cards: out, total: -1 };
    tot = r.j.total; out.push(...r.j.scores);
    if (out.length >= tot || !r.j.scores.length) break;
  }
  return { status: st, cards: out, total: tot };
}

(async () => {
  let b = null, srv = null;
  try {
    /* ---------- X1 判法表 ---------- */
    await guard('X1', async () => {
      const bad = [], rows = new Set();
      for (const g of GOLD) { const r = K.pzOf(g.d); rows.add(r.row); if (pzShow(r) !== want(g)) bad.push(g.tag + '：' + pzShow(r) + ' ≠ ' + want(g)); }
      const ALL = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14a', '14b', '15a', '15b', '15c', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
      const miss = ALL.filter(x => !rows.has(x));
      T(has('pzOf') && !bad.length && !miss.length, 'X1 判法表 24 行（含 14a / 14b、15a–15c）每行至少一例：行号 · 主谱种 › 二级 · 也出现在 · 乐器身份＝方案 §5.2 / §6.1（' + GOLD.length + ' 例）',
        JSON.stringify({ n: GOLD.length, miss, bad: bad.slice(0, 8) }));
      /* 分面抽查（§5.5） */
      const f = (i) => K.facetsOf(GOLD.find(g => g.tag === i).d);
      const fx = { jt: f('JT 吉他弹唱谱'), satb: f('S SATB 合唱'), jg: f('JG 无词＋二胡（二胡＋钢琴）'), g: f('G 钢琴独奏谱'), sj: f('SJ 教学对照谱'), cj: f('CJ 功能谱有词') };
      T(fx.jt.inst.join() === 'guitar' && fx.jt.chord && fx.jt.nota0 === '' && fx.jt.fkey === 'C' && fx.satb.ens && fx.satb.parts === 4 && fx.satb.nota0 === 'st'
        && fx.jg.acc && fx.jg.inst.join() === 'erhu,piano' && fx.jg.nota0 === 'jp' && !fx.g.acc && fx.g.inst.join() === 'piano' && fx.sj.nota0 === 'dual' && fx.cj.chord && fx.cj.verses === 1,
        'X1b 分面 facetsOf：乐器 / 编制 / 已配和弦 / 带伴奏（钢琴独奏不算）/ 合奏 / 段数 / 原稿记谱 / 指法调', JSON.stringify(fx));
    });

    /* ---------- X2 曲库 10 首 ---------- */
    await guard('X2', async () => {
      const bad = [], OS = LIB.filter(x => /^lib-os-/.test(String(x.id || '')));   /* v70.0：只核 OpenScore 公版 10 首（C 组往种子里加 lib-ex-* / lib-pd-*，由 tv_v700ex 核） */
      OS.forEach(x => { const r = K.pzOf(x.data), f = K.facetsOf(x.data), hw = /夏威夷/.test(x.title);
        const w = hw ? '16 hechang.wuxian+wuxian.hechang+gangqin.banzou' : '9 gangqin.tanchang+wuxian.gequ';
        if (pzShow(r) !== w) bad.push(x.title + '：' + pzShow(r));
        if (!f.acc || (hw && !f.ens) || f.nota0 !== 'st') bad.push(x.title + ' 分面 ' + JSON.stringify(f));
        if (K.docTypeOf(x.data) !== PREV.docTypeEd(x.data)) bad.push(x.title + ' type 变了'); });
      T(OS.length === 10 && !bad.length, 'X2 曲库 10 首（lib-os-*）＝§6.3：9 首艺术歌曲 钢琴谱 › 弹唱（也在 五线谱 › 歌曲）、夏威夷骊歌 合唱谱 › 五线合唱（也在 五线谱 › 合唱、钢琴谱 › 伴奏），都带伴奏、旧 type 不变',
        JSON.stringify({ n: OS.length, all: LIB.length, bad: bad.slice(0, 6) }));
    });

    /* ---------- X3 编辑器：示例 16 份 / 导入 / 语料（X5 用） ---------- */
    b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
    let corpus = [];
    await guard('X3', async () => {
      const pg = await b.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
      await pg.goto('file://' + ED); await pg.waitForTimeout(1000);
      const out = await pg.evaluate(({ XMLS }) => {
        try { window.guardReplace = p => p(); hideStartPad(); } catch (_) {}
        const J = s => JSON.parse(JSON.stringify(s)), res = [];
        const add = (tag, s, extra) => { try { const d = J(s); delete d.layout; delete d.id;
          const P = PQ_KIND.pzOf ? PQ_KIND.pzOf(s) : null, F = PQ_KIND.facetsOf ? PQ_KIND.facetsOf(s) : null;
          res.push(Object.assign({ tag, d, dt: docType(s), name: docTypeLabel(s), pz: P, fx: F, del: /PQ_KIND\.docTypeOf\(s\)/.test(String(docType)) }, extra || {})); }
          catch (e) { res.push({ tag, err: String(e && e.message || e) }); } };
        PRESETS.forEach(p => add('预设 ' + p.name, migrate(p.make()), { preset: p.name, raw: J(p.make()) }));
        const VA = { J: [{}, { nVox: 2 }, { nVox: 4 }, { nVox: 2, lyr: 0 }, { instKey: 'erhu' }, { lyr: 0 }], S: [{}, { lyr: 0 }, { nVox: 3 }, { nVox: 3, lyr: 0 }, { instKey: 'violin' }, { instKey: 'other', clef: 'alto' }],
          SJ: [{}, { nVox: 2 }], T: [{}, { inst: 'uku' }], JT: [{}, { inst: 'uku' }], ST: [{}], G: [{}, { instKey: 'epiano' }], CG: [{}], JG: [{}, { lyr: 0 }], SG: [{}, { lyr: 0 }], SJG: [{}], CJ: [{}], CS: [{}], C: [{}] };
        NWB.VALID.forEach(k => (VA[k] || [{}]).forEach(o => add('谱行 ' + k + ' ' + JSON.stringify(o), NWB.build(k, Object.assign({ title: 't' }, o)))));
        NWP.SCENE_IDS.forEach(id => { try { const P = NWP.planOf(NWP.fresh({ scene: id, clean: true })); const o = Object.assign({}, P.o); delete o.tuningKey; delete o.pen; add('用途 ' + id, NWB.build(P.stack, o)); } catch (e) { res.push({ tag: '用途 ' + id, err: e.message }); } });
        XMLS.forEach(([nm, xml, w]) => { const r = importMusicXML(xml); if (!r || r.error) { res.push({ tag: nm, err: (r && r.error) || 'null' }); return; } add(nm, r.song, { xmlWant: w }); });
        return res;
      }, { XMLS });
      await pg.close();
      corpus = out.filter(x => !x.err).map(x => Object.assign(x, { d: x.d }));
      const errsC = out.filter(x => x.err).map(x => x.tag + ' ' + x.err);
      const pres = corpus.filter(x => x.preset), bad = [];
      pres.forEach(x => { const w = PRESET_WANT[x.preset]; const got = x.pz ? pzShow(x.pz).replace(/ 〔[^〕]*〕$/, '') : 'null'; if (got !== w) bad.push(x.preset + '：' + got + ' ≠ ' + w); });
      T(pres.length === 16 && Object.keys(PRESET_WANT).every(n => pres.some(x => x.preset === n)) && !bad.length && !errsC.length,
        'X3 示例 16 份（migrate 后）＝方案 §6.4（吉他 / 尤克里里弹唱、功能谱有词也在简谱 › 歌曲、钢琴独奏 / 纯伴奏、四部合唱、小步舞曲 五线谱 › 视唱、对照谱两边都在）',
        JSON.stringify({ n: pres.length, bad, errs: errsC.slice(0, 4) }));
      const xb = corpus.filter(x => x.xmlWant).map(x => { const g = x.pz ? pzShow(x.pz) : 'null'; return g === x.xmlWant ? null : x.tag + '：' + g + ' ≠ ' + x.xmlWant; });
      T(corpus.filter(x => x.xmlWant).length === XMLS.length && xb.every(v => !v), 'X3b 真实导入 MusicXML 6 份（没写 instKey）：小提琴独奏按音轨名进 五线谱 › 器乐 › 小提琴（不进视唱）、长笛＋钢琴、弦乐四重奏 重奏、SAB 合唱谱、人声＋钢琴 弹唱、钢琴 独奏',
        JSON.stringify(xb.filter(Boolean)));
      /* 编辑器页面里的规则＝node 端（同一段代码，换个运行环境再核一遍）；docType() 转调 PQ_KIND.docTypeOf */
      const diff = corpus.filter(x => !x.pz || JSON.stringify(x.pz) !== JSON.stringify(K.pzOf(x.d)) || JSON.stringify(x.fx) !== JSON.stringify(K.facetsOf(x.d)) || x.dt !== K.docTypeOf(x.d)).map(x => x.tag);
      T(corpus.length >= 60 && !diff.length && corpus.every(x => x.del), 'X3c 编辑器内联 PQ_KIND 与 node 端对同一批谱（' + corpus.length + ' 份：示例 / 14 谱行变体 / 11 用途 / 导入）给出相同的 pzOf / facetsOf / docTypeOf；编辑器 docType() 转调 PQ_KIND.docTypeOf',
        JSON.stringify({ n: corpus.length, diff: diff.slice(0, 6) }));
    });

    const SAMPLES = GOLD.map(g => ({ tag: g.tag, d: g.d })).concat(LIB.map(x => ({ tag: '曲库 ' + x.title, d: x.data })), corpus.map(x => ({ tag: x.tag, d: x.d })));
    /* ---------- X4 不变式 ---------- */
    await guard('X4', async () => {
      const r = invariants(SAMPLES);
      T(has('pzOf') && !r.bad.mirror.length && r.mirN >= 60 && r.exc.every(e => MIRROR_EXC.some(([p, q]) => e === p + '→' + q || e === q + '→' + p)) && !r.exc.some(e => /15c|17/.test(e)),
        'X4a 互切镜像（' + r.mirN + ' 份有可切换行）：简谱 / 五线谱主谱种落到对面镜像二级、其余谱种不变（合唱谱二级跟记谱法走）；例外只有 12⇄13、23⇄24（15c⇄17 在 P0 消失）',
        JSON.stringify({ exc: r.exc, bad: r.bad.mirror.slice(0, 6), skip: r.skip.length }));
      T(has('pzOf') && !r.bad.name.length, 'X4b 名实一致：合唱谱 / 简谱重奏谱·X谱（简谱）/ 独奏谱 / 弹唱谱 / 重奏谱 / X谱（五线谱）/ 功能谱·和弦谱 / 教学对照谱 与主谱种不打架', JSON.stringify(r.bad.name.slice(0, 6)));
      T(has('pzOf') && !r.bad.contain.length, 'X4c 含有一致：有简谱旋律行的必含简谱、有五线谱旋律行的必含五线谱（弹唱谱与功能谱除外）、有钢琴花括号组且不是独奏的必含钢琴谱', JSON.stringify(r.bad.contain.slice(0, 6)));
      T(has('pzOf') && !r.bad.uniq.length, 'X4d 一级内唯一：同一首谱在同一个一级里至多一个二级（一级数字＝各二级之和）', JSON.stringify(r.bad.uniq.slice(0, 6)));
    });

    /* ---------- X5 旧 type / typeLabel ---------- */
    await guard('X5', async () => {
      const edBad = corpus.filter(x => x.dt !== safe(() => PREV.docTypeEd(x.d), '?')).map(x => x.tag + '：' + safe(() => PREV.docTypeEd(x.d), '?') + '→' + x.dt);
      const edName = corpus.filter(x => x.name !== safe(() => PREV.PQ_KIND.nameOf(x.d), '?')).map(x => ({ tag: x.tag, was: safe(() => PREV.PQ_KIND.nameOf(x.d), '?'), now: x.name }));
      const edNameBad = edName.filter(x => !(x.was === '简谱合唱谱' && /^(简谱重奏谱|.+谱（简谱）)$/.test(x.now))
        && !(/^钢琴弹唱谱（纯伴奏/.test(x.was) && x.now === x.was.replace('钢琴弹唱谱', '钢琴伴奏谱'))   /* 分类升级 P1 有意迁移：拍板 10 纯伴奏 CG 改名同版上 */
        && !p2aRenameOk(x.was, x.now, x.d));   /* v70.0 P2a 第 0 步有意迁移：拍板 11 合唱带钢琴 / 拍板 22 后半 X＋钢琴伴奏谱 */
      T(corpus.length >= 60 && !edBad.length && !edNameBad.length, 'X5a 编辑器：docType 与修前逐值相同（' + corpus.length + ' 份）；谱名只有 J 多声部无词改名（拍板 22 / 26）、纯伴奏 CG 改名（拍板 10）与 P2a 拍板 11 / 22 后半：' + [...new Set(edName.map(x => x.was + '→' + x.now))].join('、') + '）',
        JSON.stringify({ edBad: edBad.slice(0, 5), edNameBad: edNameBad.slice(0, 5) }));
      const all = SAMPLES.concat(EDGE.map(x => ({ tag: x.tag, d: x.d })), corpus.filter(x => x.raw).map(x => ({ tag: x.tag + '（原始 JSON）', d: x.raw })), BAD);
      const r = typeDrift(all);
      const catOk = EDGE.every(x => edgeCat(x.d) === x.cat) && ['a', 'b', 'c'].every(c => r.cats[c] > 0);
      T(has('pubKindOf') && !r.bad.length && catOk, 'X5b 服务端 type：' + all.length + ' 份里只有点名的三类边角改变（a 老钢琴谱右手有词 ' + (r.cats.a || 0) + ' · b 显式分组全部失效 ' + (r.cats.b || 0) + ' · c 脏短码 / v:2 / 无 v 老格式 ' + (r.cats.c || 0) + '），且都等于编辑器口径；typeLabel 只有 J 多声部无词改名、纯伴奏 CG 改名（拍板 10）与 P2a 拍板 11 / 22 后半',
        JSON.stringify({ bad: r.bad.slice(0, 6), cats: r.cats, names: [...new Set(r.nameDiff)] }));
    });

    /* ---------- X6 坏谱 ---------- */
    await guard('X6', async () => {
      const bad = [];
      for (const x of BAD.concat(EDGE)) {
        const before = JSON.stringify(x.d);
        try { const r = K.pzOf(x.d), f = K.facetsOf(x.d), t = K.docTypeOf(x.d), pk = K.pubKindOf(x.d);
          if (!K.pzHas(r.pz, r.sub) || !Array.isArray(f.inst) || typeof t !== 'string' || !K.pzHas(pk.pz, pk.sub) || typeof pk.typeLabel !== 'string') bad.push(x.tag + ' 结果不合法'); }
        catch (e) { bad.push(x.tag + ' 抛错 ' + e.message); }
        if (JSON.stringify(x.d) !== before) bad.push(x.tag + ' 改了入参');
      }
      T(has('pzOf') && has('pubKindOf') && !bad.length, 'X6 坏谱（null / 数组 / 小节或声部不是数组 / 歌词是字符串 / 分组记谱法乐器怪值 / 缺六线谱轨 / 顶层对象值）：pzOf / facetsOf / docTypeOf / pubKindOf 不抛错、结果在表内、只读', JSON.stringify(bad.slice(0, 6)));
      /* v70.5 坏 voxLayer（§10.4）：不抛、只读、四个出口＝剥掉 voxLayer 与见证后的结果 */
      const badL = [], sig = d => JSON.stringify([K.pzOf(d), K.facetsOf(d), K.docTypeOf(d), K.pubKindOf(d)]);
      for (const x of LBADT) {
        const before = JSON.stringify(x.d);
        try { if (sig(x.d) !== sig(stripLay(x.d))) badL.push(x.tag + ' ≠ 剥字段结果'); } catch (e) { badL.push(x.tag + ' 抛错 ' + e.message); }
        if (JSON.stringify(x.d) !== before) badL.push(x.tag + ' 改了入参');
      }
      T(typeof K.voxLayerOk === 'function' && !badL.length, 'X6b 坏 voxLayer（' + LBADT.length + ' 类：长度 / 非数组 / 值是 true / 越界 / 缺见证 / 记谱法不同 / 跨组边界 / 和弦谱 / 坏 mixer / 坏声部）：pzOf / facetsOf / docTypeOf / pubKindOf 不抛、只读、＝剥字段结果', JSON.stringify(badL.slice(0, 6)));
    });

    /* ---------- X7 真服务端 ---------- */
    await guard('X7', async () => {
      try { fs.unlinkSync(DB); } catch (_) {}
      srv = await startServer(); srv.p.kill(); await new Promise(r => setTimeout(r, 300));   /* 先起一次建表＋官方种子 */
      const FILL = Array.from({ length: 230 }, (_, i) => ({ id: 'txf' + String(i).padStart(4, '0') + 'xx', title: '垫底' + i, at: i,
        d: J(i % 3 === 0 ? V(['旋律'], [null], null, true) : i % 3 === 1 ? V(['右手', '左手'], ['staff', 'bass'], { voxGroups: [BC(0, 1)] }) : V(['二胡'], ['staff'], { instKey: 'erhu' })) }));
      const TOP = GOLD.concat(EDGE, BAD).map((x, i) => ({ id: 'txg' + String(i).padStart(4, '0') + 'xx', title: '金表' + i, at: 1000 + i, d: x.d, tag: x.tag }));
      const sd = seed(FILL.concat(TOP));
      srv = await startServer();
      const mine = new Map(FILL.concat(TOP).map(x => [x.id, x]));
      const L0 = await getJ('/api/pub/scores'), list = (L0.j && L0.j.scores) || [];
      const cardBad = [];
      list.forEach(c => { const x = mine.get(c.id); if (!x) return; const pk = K.pubKindOf(x.d);
        if (c.pz !== pk.pz || c.sub !== pk.sub || c.inst !== pk.inst || JSON.stringify(c.also) !== JSON.stringify(pk.also) || JSON.stringify(c.fx) !== JSON.stringify(pk.fx) || c.type !== pk.type || c.typeLabel !== pk.typeLabel) cardBad.push(x.tag || x.id); });
      T(sd.includes('seeded ' + (FILL.length + TOP.length)) && L0.status === 200 && list.length === 200 && list.every(c => typeof c.pz === 'string' && Array.isArray(c.also) && c.fx) && !cardBad.length,
        'X7a 真服务端列表（不带条件＝最新 200 首，口径不变）：每张卡带 pz / sub / inst / also / fx，与 node 推断逐项相同；坏谱也有卡（不 500）', JSON.stringify({ seeded: sd.trim().slice(0, 30), st: L0.status, n: list.length, cardBad: cardBad.slice(0, 5) }));
      /* 7 个一级全量翻页：成员＝本地推断；第 201 首以后的垫底谱也在 */
      const byPz = {}, cardsAll = new Map(), stBad = [];
      for (const p of K.PZ) { const r = await allPages('pz=' + p.id); if (r.status !== 200) stBad.push(p.id + ' ' + r.status); byPz[p.id] = r; r.cards.forEach(c => cardsAll.set(c.id, c)); }
      const memBad = [], orderBad = [];
      for (const p of K.PZ) {
        const ids = byPz[p.id].cards.map(c => c.id), set = new Set(ids);
        if (set.size !== ids.length || ids.length !== byPz[p.id].total) memBad.push(p.id + ' 重复或漏页');
        const segs = byPz[p.id].cards.map(c => K.pzMatch(c, { pz: p.id })); if (segs.some((v, i) => v < 0 || (i && segs[i - 1] > v))) orderBad.push(p.id);
        for (const [id, x] of mine) { const pk = K.pubKindOf(x.d), inP = placesOf(pk).some(s => s.split('.')[0] === p.id); if (inP !== set.has(id)) memBad.push(p.id + ' ' + (x.tag || id) + (inP ? ' 漏了' : ' 多了')); }
      }
      const oldOk = byPz.jianpu && byPz.jianpu.cards.some(c => c.id === 'txf0000xx') && byPz.gangqin.cards.some(c => c.id === 'txf0001xx') && byPz.wuxian.cards.some(c => c.id === 'txf0002xx');
      T(!stBad.length && !memBad.length && !orderBad.length && oldOk, 'X7b ?pz= 在全库筛（' + cardsAll.size + ' 首；最早的垫底谱第 201 首以后也筛得到）：7 个一级的成员＝本地推断的 主谱种 ∪ 也出现在，主谱种在前，翻页不重不漏',
        JSON.stringify({ stBad, memBad: memBad.slice(0, 6), orderBad, oldOk, totals: Object.fromEntries(K.PZ.map(p => [p.id, byPz[p.id].total])) }));
      /* 二级 / 乐器 / 只给二级 */
      const subQ = [['pz=wuxian&sub=qiyue&inst=erhu', { pz: 'wuxian', sub: 'qiyue', inst: 'erhu' }], ['pz=jianpu&inst=guzheng', { pz: 'jianpu', inst: 'guzheng' }], ['pz=wuxian&inst=violin', { pz: 'wuxian', inst: 'violin' }],
        ['sub=duizhao', { sub: 'duizhao' }], ['inst=piano', { inst: 'piano' }], ['pz=gangqin&sub=banzou', { pz: 'gangqin', sub: 'banzou' }], ['pz=hechang&sub=jianpu', { pz: 'hechang', sub: 'jianpu' }]];
      const sqBad = [];
      for (const [qs, f] of subQ) { const r = await allPages(qs), got = new Set(r.cards.map(c => c.id)), wantIds = [...cardsAll.values()].filter(c => K.pzMatch(c, f) >= 0).map(c => c.id);
        if (r.status !== 200 || got.size !== wantIds.length || wantIds.some(id => !got.has(id))) sqBad.push(qs + ' ' + got.size + '≠' + wantIds.length); }
      const erhuOld = (await allPages('pz=wuxian&sub=qiyue&inst=erhu')).cards.some(c => c.id === 'txf0002xx');
      T(!sqBad.length && erhuOld, 'X7c ?sub= / ?inst=（简谱五线谱下＝器乐身份含重奏，其他一级与不限一级看分面）／只给二级：结果＝同一个 pzMatch 在全部卡片上筛出的集合', JSON.stringify({ sqBad, erhuOld }));
      /* 计数：/api/pub/cats＝按卡片本地重算；一级＝各二级之和；带 q；非法参数 */
      const cats = await getJ('/api/pub/cats'), loc = { total: cardsAll.size, pz: {} };
      K.PZ.forEach(p => { const o = loc.pz[p.id] = { n: 0, sub: Object.fromEntries(p.subs.map(x => [x.id, 0])) }; if (p.id === 'jianpu' || p.id === 'wuxian') o.inst = {};
        for (const c of cardsAll.values()) { if (K.pzMatch(c, { pz: p.id }) < 0) continue; o.n++; p.subs.forEach(x => { if (K.pzMatch(c, { pz: p.id, sub: x.id }) >= 0) o.sub[x.id]++; });
          if (o.inst && c.inst && K.pzMatch(c, { pz: p.id, inst: c.inst }) >= 0) o.inst[c.inst] = (o.inst[c.inst] || 0) + 1; } });
      const sums = cats.j && Object.entries(cats.j.pz || {}).every(([, o]) => Object.values(o.sub).reduce((a, x) => a + x, 0) === o.n);
      const cq = await getJ('/api/pub/cats?q=' + encodeURIComponent('垫底22'));   /* 标题 垫底22、垫底220–229（作者昵称也参与关键词，别用昵称里的字） */
      const ill = await getJ('/api/pub/scores?pz=constructor&sub=__proto__&inst=toString');
      /* 分类升级 P1 有意迁移：/api/pub/cats 另带可转数 conv（tv_libpz Z1 / Z6 核对），这里比 total / pz 两项 */
      const cj = cats.j ? { total: cats.j.total, pz: cats.j.pz } : null;
      T(cats.status === 200 && JSON.stringify(cj) === JSON.stringify(loc) && sums && cq.status === 200 && cq.j && cq.j.q === '垫底22' && cq.j.total === FILL.filter(x => x.title.includes('垫底22')).length && Object.values(cq.j.pz).reduce((s, o) => s + o.n, 0) >= cq.j.total
        && ill.status === 200 && ill.j && !('page' in ill.j) && ill.j.scores.length === 200,
        'X7d /api/pub/cats＝按卡片本地重算（一级 / 二级 / 器乐乐器），一级＝各二级之和；?q= 按关键词算；非法 pz / sub / inst 参数忽略（回到最新 200 首）',
        JSON.stringify({ st: cats.status, same: JSON.stringify(cj) === JSON.stringify(loc), sums, cq: cq.j && cq.j.total, ill: ill.j && ill.j.scores && ill.j.scores.length }));
      const badIds = TOP.filter(x => BAD.some(y => y.tag === x.tag)).map(x => x.id);
      const badIn = badIds.every(id => cardsAll.has(id));
      const st2 = [(await get('/api/pub/scores?pz=jianpu&q=' + encodeURIComponent('金表'))).status, (await get('/api/pub/scores?inst=erhu&size=60&page=3')).status, (await get('/api/pub/cats')).status];
      T(badIn && st2.every(s => s === 200), 'X7e 坏谱（' + badIds.length + ' 份）在列表 / 谱种筛选 / 计数里都在、都不 500（各自回落默认）', JSON.stringify({ badIn, st2 }));
    });
  } finally {
    if (srv) { try { srv.p.kill(); } catch (_) {} }
    for (const f of [DB, DB + '-wal', DB + '-shm']) { try { fs.unlinkSync(f); } catch (_) {} }
    if (b) await b.close();
  }
  const errs2 = errs.filter(e => !/ResizeObserver/.test(e));
  console.log('PASS ' + pass + '/' + total);
  console.log(errs2.length ? 'ERRORS:\n' + errs2.slice(0, 10).join('\n') : 'NO ERRORS');
  process.exit(pass === total && !errs2.length ? 0 : 1);
})().catch(e => { console.log('❌ 运行异常: ' + (e && e.stack || e)); process.exit(1); });
