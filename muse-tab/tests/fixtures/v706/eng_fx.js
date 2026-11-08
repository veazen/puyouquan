'use strict';
/* v70.6 刻版组夹具（tv_v706eng 用；Node 侧构造 song JSON，页面里 migrate 后再排）。
   全部是「生效层对」：voxLayer[i]===1 ＋ 层行带见证 mixer['vox:i'].lay===1 ＋ 两行同为五线谱、谱号八度 / 移调相等（规格 §1.2）；
   dual 例外（宿主开了简谱对照，D-16：不叠放）、jpLay 例外（简谱行的层：voxLayerOk 不生效，按独立行） */
const V =(deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
const R = (dur, o) => V(0, dur, o);
const HD = dur => V(0, dur, { hid: 1 });
const MIX = (n, lay, inst) => { const m = {}; for (let i = 0; i < n; i++) { m['vox:' + i] = { on: true, solo: false, inst: inst || 'piano', vol: 1, pan: null }; if (lay.includes(i)) m['vox:' + i].lay = 1; } return m; };
const SONG = (title, voices, nots, meas, lay, extra) => Object.assign({
  v: 3, title, singer: '', lyricist: '', composer: '', maker: '', key: 'C', beats: 4, unit: 4, tempo: 80, capo: 0, customChords: {},
  tabVoices: [], voxVoices: voices, voxNotations: nots, lyricLines: 1, measures: meas.map(vx => ({ tabs: [], voxes: vx })),
  voxLayer: voices.map((_, i) => lay.includes(i) ? 1 : null), mixer: MIX(voices.length, lay),
}, extra || {});
const FX = {};
/* A 符头：m0 二度（宿主 E5 / 层 D5）· 三度（E5 / C5）· 交叉（宿主 C5 / 层 E5）· 交叉超过 7 谱位（宿主 C4 / 层 E5，不错开）
          m1 同度共用（四分 C5 / 八分 C5+八分 B4）· 二分对四分同度不共用 · 附点对不附点不共用 · 增一度（F♯5 / F5）
          m2 线上音附点（层 E4 附点二分；宿主 C5 二分）＋ 二度附点对齐（宿主 D5 附点四分 / 层 C5 附点四分） */
FX.heads = SONG('符头', ['旋律', '旋律·2'], ['staff', 'staff'], [
  [[V(3, 4, { oct: 1 }), V(3, 4, { oct: 1 }), V(1, 4, { oct: 1 }), V(1, 4)], [V(2, 4, { oct: 1 }), V(1, 4, { oct: 1 }), V(3, 4, { oct: 1 }), V(3, 4, { oct: 1 })]],
  [[V(1, 4, { oct: 1 }), V(1, 2, { oct: 1 }), V(4, 4, { oct: 1, acc: '#' })], [V(1, 8, { oct: 1 }), V(7, 8), V(1, 4, { oct: 1 }), R(4), V(4, 4, { oct: 1 })]],
  [[V(1, 4, { oct: 1, dotted: true }), V(1, 8, { oct: 1 }), V(1, 2, { oct: 1 })], [V(1, 4, { oct: 1 }), V(3, 2, { dotted: true })]],
  [[V(2, 4, { oct: 1, dotted: true }), V(3, 8, { oct: 1 }), V(5, 2, { oct: 1 })], [V(1, 4, { oct: 1, dotted: true }), R(8), R(2)]],
], [1]);
/* （m2：拍 1 层四分 C5 与宿主附点四分 C5 同度不共用；拍 2 起层附点二分 E4——线上音的附点在下方的间） */
/* B 休止：m0 层休止 vs 宿主高音（层四分休止、宿主 C5 D5 E5 F5）· m1 宿主休止 vs 层低音 · m2 两声部同时值同起拍休止合并 + 隐形休止
          m3 宿主整小节休止 vs 层高音（宿主全休止偏上、要加线）· m4 层二分休止 vs 宿主低音（层二分休止偏到谱表下、要加线）
          m5 宿主四分休止、层同一时段是隐形休止（对方同时段没有可见内容 → 居中，p 同 v70.5） */
FX.rests = SONG('休止', ['旋律', '旋律·2'], ['staff', 'staff'], [
  [[V(1, 4, { oct: 1 }), V(2, 4, { oct: 1 }), V(3, 4, { oct: 1 }), V(4, 4, { oct: 1 })], [R(4), V(5, 4), R(4), V(5, 4)]],
  [[R(4), V(1, 4, { oct: 1 }), R(2)], [V(5, 4), V(4, 4), V(3, 4), V(2, 4)]],
  [[V(1, 4, { oct: 1 }), R(4), V(3, 2, { oct: 1 })], [HD(4), R(4), V(5, 2)]],
  [[R(1)], [V(6, 4, { oct: 1 }), V(7, 4, { oct: 1 }), V(1, 2, { oct: 2 })]],
  [[V(1, 4), V(2, 4), V(7, 4, { oct: -1 }), V(6, 4, { oct: -1 })], [R(2), V(5, 2, { oct: -1 })]],
  [[R(4), V(1, 4, { oct: 1 }), V(2, 2, { oct: 1 })], [HD(4), V(5, 4), V(4, 2)]],
], [1]);
/* C 临时记号：m0 宿主 ♯F5（拍 1）、层 F5（拍 2）→ 层印 ♮；m1 层 ♯F5（拍 1）、宿主 ♯F5（拍 3）→ 宿主不重标 */
FX.accs = SONG('临时记号', ['旋律', '旋律·2'], ['staff', 'staff'], [
  [[V(4, 4, { oct: 1, acc: '#' }), V(5, 4, { oct: 1 }), V(6, 2, { oct: 1 })], [V(1, 4, { oct: 1 }), V(4, 4, { oct: 1 }), V(1, 2, { oct: 1 })]],
  [[V(6, 4, { oct: 1 }), V(5, 4, { oct: 1 }), V(4, 2, { oct: 1, acc: '#' })], [V(4, 4, { oct: 1, acc: '#' }), V(1, 4, { oct: 1 }), V(1, 2, { oct: 1 })]],
], [1]);
/* D 弧向与连音：宿主两拍延音（连音线）＋ 层两拍延音；宿主八分三连音、层八分三连音（有符杠） */
FX.arcs = SONG('弧向', ['旋律', '旋律·2'], ['staff', 'staff'], [
  [[V(5, 4, { oct: 1, tie: true }), V(5, 4, { oct: 1 }), V(3, 8, { oct: 1, tup: 3 }), V(4, 8, { oct: 1, tup: 3 }), V(5, 8, { oct: 1, tup: 3 }), V(6, 4, { oct: 1 })],
   [V(3, 4, { tie: true }), V(3, 4), V(1, 8, { tup: 3 }), V(2, 8, { tup: 3 }), V(3, 8, { tup: 3 }), V(1, 4)]],
], [1]);
/* E 合唱：女高（词 la）/ 女低（层，词 lu），男声另一谱表（词 lo）；E2 两段词（宿主 2 段、层 1 段） */
FX.choir = SONG('合唱', ['女高', '女低', '男声'], ['staff', 'staff', 'bass'], [
  [[V(3, 4, { oct: 1, lyrics: ['la'] }), V(2, 4, { oct: 1, lyrics: ['la'] }), V(1, 2, { oct: 1, lyrics: ['la'] })], [V(1, 4, { oct: 1, lyrics: ['lu'] }), V(7, 4, { lyrics: ['lu'] }), V(5, 2, { lyrics: ['lu'] })], [V(5, 4, { lyrics: ['lo'] }), V(5, 4, { lyrics: ['lo'] }), V(3, 2, { lyrics: ['lo'] })]],
], [1], { rowNames: 1, mixer: MIX(3, [1], 'choir') });
FX.choir2 = SONG('合唱两段', ['女高', '女低', '男声'], ['staff', 'staff', 'bass'], [
  [[V(3, 4, { oct: 1, lyrics: ['la', 'li'] }), V(2, 4, { oct: 1, lyrics: ['la', 'li'] }), V(1, 2, { oct: 1, lyrics: ['la', 'li'] })], [V(1, 4, { oct: 1, lyrics: ['lu'] }), V(7, 4, { lyrics: ['lu'] }), V(5, 2, { lyrics: ['lu'] })], [V(5, 4, { lyrics: ['lo'] }), V(5, 4, { lyrics: ['lo'] }), V(3, 2, { lyrics: ['lo'] })]],
], [1], { lyricLines: 2, rowNames: 1, mixer: MIX(3, [1], 'choir') });
/* E3 层词与宿主完全相同：只印一行 */
FX.choirSame = SONG('合唱同词', ['女高', '女低'], ['staff', 'staff'], [
  [[V(3, 4, { oct: 1, lyrics: ['la'] }), V(2, 4, { oct: 1, lyrics: ['le'] }), V(1, 2, { oct: 1, lyrics: ['lo'] })], [V(1, 4, { oct: 1, lyrics: ['la'] }), V(7, 4, { lyrics: ['le'] }), V(5, 2, { lyrics: ['lo'] })]],
], [1]);
/* F 力度：分层钢琴 [右手, 右手·2, 左手, 左手·2]：m0 宿主 mf（层无力度；层音 E5 / F5，朝下的符干端不进力度的避让净空——宿主力度与 v70.5 同 y）；m1 两声部同起拍力度不同（宿主 p、层 f）；m2 同起拍相同（都 mf：只印一个） */
FX.dyn = SONG('力度', ['右手', '右手·2', '左手', '左手·2'], ['staff', 'staff', 'bass', 'bass'], [
  [[V(5, 4, { oct: 1, dyn: 'mf' }), V(6, 4, { oct: 1 }), V(7, 2, { oct: 1 })], [V(3, 2, { oct: 1 }), V(4, 2, { oct: 1 })], [V(1, 1, { oct: -1 })], [HD(2), V(5, 2, { oct: -2 })]],
  [[V(5, 4, { oct: 1, dyn: 'p' }), V(4, 4, { oct: 1 }), V(3, 2, { oct: 1 })], [V(3, 2, { oct: 1, dyn: 'f' }), V(1, 2, { oct: 1 })], [V(1, 1, { oct: -1 })], [V(5, 1, { oct: -2 })]],
  [[V(5, 4, { oct: 1, dyn: 'mf' }), V(4, 4, { oct: 1 }), V(3, 2, { oct: 1 })], [V(3, 2, { oct: 1, dyn: 'mf' }), V(1, 2, { oct: 1 })], [V(1, 1, { oct: -1 })], [V(5, 1, { oct: -2 })]],
], [1, 3], { voxGroups: [{ type: 'brace', from: 0, to: 3 }], lyricLines: 0 });
/* G 闭合二部合唱 [S, A(层)]（不写分组）——叠放后一张谱表，不画方括号 */
FX.duo = SONG('二部', ['女高', '女低'], ['staff', 'staff'], [
  [[V(3, 2, { oct: 1, lyrics: ['a'] }), V(5, 2, { oct: 1, lyrics: ['b'] })], [V(1, 2, { oct: 1, lyrics: ['c'] }), V(3, 2, { oct: 1, lyrics: ['d'] })]],
], [1], { mixer: MIX(2, [1], 'choir') });
/* H 竖向：层有一个很低的音（G3，下加两线以下）——宿主加线区要覆盖它；H0 同一谱但层音在谱表内（对照） */
FX.low = SONG('竖向', ['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [
  [[V(3, 2, { oct: 1 }), V(5, 2, { oct: 1 })], [V(5, 2, { oct: -1 }), V(1, 2, { oct: 1 })], [V(1, 1, { oct: -1 })]],
], [1], { voxGroups: [{ type: 'brace', from: 0, to: 2 }], lyricLines: 0 });
FX.low0 = JSON.parse(JSON.stringify(FX.low)); FX.low0.measures[0].voxes[1][0].oct = 1; FX.low0.measures[0].voxes[1][0].deg = 1;
/* I 对照谱：宿主开了简谱对照（voxDual 两行同值）——层对不叠放 */
FX.dual = JSON.parse(JSON.stringify(FX.heads)); FX.dual.voxDual = [true, true];
/* J 简谱行的层（不是五线谱：voxLayerOk 不生效）——hid 照画 0（D-16），谱面＝v70.5 */
FX.jpLay = SONG('简谱层', ['旋律', '旋律·2'], [null, null], [
  [[V(1, 4), V(2, 4), V(3, 2)], [HD(2), V(5, 2, { oct: -1 })]],
], [1]);
module.exports = { FX, V, R, HD, SONG, MIX };
