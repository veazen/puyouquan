'use strict';
/* v68.6「按演奏者出分谱」引擎段（规格 docs/spec-2026-10-parts.md §6.3；外壳无关，PA9 两套外壳都跑）。
   分谱＝只读派生副本：不新增 song 字段、不新增 musetab-* 本机键，绝不经过 mutate / persist / 撤销栈；缺省（不进分谱视图、不发起分谱打印）与 v68.5 逐字节相同。
   file:// 直载，真实浏览器，几何断言优先、逐字节对拍、修前红修后绿、突变实证（§6.6）。
   PA1  分法 partsPlan（§3.2）：16 个预设按期望表逐个对 id / kind / name / tab / vox / opt / scoreEq / ord 与顺序（单演奏者对 kindName）；
        构造夹具：JT 带夹 3 品、双 TAB 且 tabCapos[1]=3、JG / SG / SJG（NWB 建）、SATB＋钢琴、小提琴＋钢琴、两条有词旋律的二重唱、吉他＋钢琴＋人声、
        无词指弹 JT（单演奏者）、无显式分组的 SATB；另加命名 / 认领规则夹具（多 TAB 缺省名＋贝斯、R4 并入 t0、R3 有和弦、R4 多 TAB 各一份、重名、尤克里里多 TAB）；
        纯函数：计划前后 song JSON、撤销 / 重做栈长度逐字节不变
   PA2  派生与红线：21 份谱 × 每份分谱 × 沿用 / 不沿用换行的副本逐项自洽（行 / 轨名 / 内容 / 记谱法 / 分组 / pianoAcc / 混音 / 联排 / 夹位 / 小节元数据 / 版面字段 / 页码 / 歌词 / 小节号 /
        carry 计数＝被删行事件数 / 无新增字段）；§2.3 红线（派生与离屏排前后 song JSON、窗口、撤销栈、落盘、musetab-* 键、#score）；tabJpSpliceS ≡ 借用全局的 tabJpRemoveTrack
   PA3  调与夹位：C 调夹 2 品人声份「1=D」无变调夹；F / G / A / B 调夹 2 品（含转调段）人声 MIDI 逐音相同（refOct 折八度、转调段八度挪回）；和弦平移 2 半音；第 2 条吉他单出 capo＝3、品位发声相同
   PA4  和弦重现：TAB 份 tabColChords / jpColOf 在 prep 借用里逐列＝源谱（排除同拍冲突列；本轨另夹品时比发声）；落在 TAB 行 / 旋律行的构造计数；16 预设 dropped＝0；联排五线谱 keepSolo
   PA5  恒等对拍：真实 beforeprint 口径离屏排「全部行、不剥版面、不带 part」≡ scoreExportClone、geo ≡ PV_GEO（13 份，含 A4L / fit / pgno / 换页 / 210 小节 / nf）
   PA6  页头几何：.pgpart 位置 / 字号 / 不相交 / 截断 / 顶部外侧双数页码时挪右；.pgrun 第 2 页起每页 1 个、靠向、不与页码相交、与墨迹净距 ≥2mm
   PA7  分页与切片：批量 #print-pages 结构（页数、viewBox 序列、pp-src-k、摘除、末元素）；页码各份从 start 起；不跨页；pgbrk 不沿用；afterprint 清理
   PA8  记号（排练号 / 房子 / 𝄋 / ⊕ / D.C. / Fine 数量＝总谱）、转调可见、简谱份行首小节号、无词份行高、有词份歌词逐字
   PA9  打印任务（两套外壳）：批量 / 单份标题、紧接 Ctrl+P 打总谱、5 秒作废、注入抛错回落、缺省 ids、单演奏者 / 未勾选兜底、输出模式看分谱 Ctrl+P、§2.3 红线
   PA10 PNG：partPng 的 SVG / 文件名 / 事件；总谱 exportPNG 交给 svgPngDownload 的串＝原式；等于总谱的钢琴份；真实光栅化下载
   PA11 隔离：当前谱 JG / SJG，交替离屏排各份 3 轮，全部顶层 let / var、RENDER_STAT、#score、#paper、body 前后相同
   PA12 性能（§3.11，中位数，CI ×2）：partsPlan / partSong / 单份 partRender / SATB beforeprint 命中与未命中 / 预排命中；预览切换（快照段按规格公式；整次墙钟对总谱视图同走页壳重建的刷新）
   PA13 收尾回归（两套外壳）：连点两次「分谱」只弹一个对话框（R3）；「不换行」开着时不按长带宽白排（R1）；用完放掉分谱缓存与 PART_SVG（R4）
   PAZ  缺省零差异（§6.4，基线 tests/parts_ref.json＝v68.5 c923d00；env PARTS_REF 可指定基线页，PARTS_REF=none 显式跳过，CI 里拿不到判红）：
        两套外壳 × 28 份谱（16 预设＋210 小节＋§6.3 多演奏者夹具）× 14 项成品逐字节；单演奏者谱的旧外壳弹窗与手机输出抽屉。
        v68.8 有意改动（ENG-6）：带「此处换行」的谱导出 MusicXML 多写 <print new-system="yes"/>——加记号夹具一份（brk[1]）走放行路径：MusicXML 剥掉这一句再比、
        且这一句恰为「有效换行数 × part 数」个，其余 13 项照旧逐字节；PAZ-g 守卫放行只用在这一份（其余 28 份 MusicXML 仍逐字节）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· PARTS_REF 基线页（文件路径或 file:// URL）· ONLY=PA1,PA2 只跑部分段。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
/* 缺省零差异基线（§6.4）：完整 SHA 写在 tests/parts_ref.json，deploy.yml 浅克隆后按它单独 fetch 这一个提交（REF3）；CI 里拿不到＝判红 */
const REFJ = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'parts_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.PARTS_REF_COMMIT || REFJ.commit || 'c923d00d36e9bed94a029ecf4af6d615245fa864';
const IN_CI = !!process.env.CI && process.env.PARTS_REF !== 'none';
let REF = process.env.PARTS_REF && process.env.PARTS_REF !== 'none' ? toUrl(process.env.PARTS_REF) : null;
if (!REF && process.env.PARTS_REF !== 'none') {   /* 缺省：基线提交（v68.5）的 index.html 落到临时目录（按 SHA 命名，换基线不会读到旧缓存） */
  try { const t = path.join(os.tmpdir(), 'parts_ref_' + REF_COMMIT.slice(0, 12) + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
    REF = 'file://' + t; } catch (_) { REF = null; }
}
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);
const NOREF = what => IN_CI ? T(false, what + ' CI 里拿不到对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：判红', 'deploy.yml 的 test job 要先 git fetch --depth=1 origin <parts_ref.json 的 commit>')
  : console.log('⚠️ ' + what + ' 跳过：没有基线页（git show ' + REF_COMMIT.slice(0, 12) + ' 失败；可设 env PARTS_REF=基线 index.html，PARTS_REF=none 为显式跳过）');

/* ---------- 页内工具（addInitScript 注入）---------- */
const HELP = () => {
  const cl = x => JSON.parse(JSON.stringify(x));
  window.__cl = cl;
  /* 第 vi 条旋律行每小节首列写一个字 / 和弦（NWB 建出的空谱是全休止，voxHasLyrics 只看字） */
  window.__lyr = (s, vi, w) => { s.measures.forEach(m => { const c = ((m.voxes || [])[vi] || [])[0]; if (c) { c.deg = c.deg || 1; c.lyrics = [w || '啊']; } }); return s; };
  window.__chd = (s, vi, how) => { s.measures.forEach((m, mi) => { const c = ((m.voxes || [])[vi] || [])[0]; if (!c || mi % 2) return;
      if (how === 'chords') c.chords = [{ q: 1, chord: 'G' }]; else c.chord = 'C'; }); return s; };
  /* 加一条旋律行（复制第 0 行的列骨架、去掉字与和弦）/ 一条 TAB 轨（复制第 0 轨） */
  window.__addVox = (s, name, nota) => { const n = s.voxVoices.length; s.voxVoices.push(name);
    if (nota !== undefined || Array.isArray(s.voxNotations)) { s.voxNotations = s.voxNotations || []; while (s.voxNotations.length < n) s.voxNotations.push(undefined); s.voxNotations.push(nota); }
    s.measures.forEach(m => { const cols = cl(m.voxes[0] || []); cols.forEach(c => { if (c) { delete c.lyrics; delete c.chord; delete c.chords; } }); m.voxes.push(cols); }); return s; };
  window.__addTab = (s, name) => { s.tabVoices.push(name); s.measures.forEach(m => m.tabs.push(cl(m.tabs[0] || []))); return s; };
  /* PA1 夹具（§6.3 列名 + 命名 / 认领规则补充）。全部经 migrate，与载入编辑器后的形态一致 */
  window.__fx = k => { const B = (id, o) => NWB.build(id, Object.assign({ title: '夹具' + id, nMea: 4 }, o || {}));
    let s;
    switch (k) {
      case 'JT带夹3品': s = PRESETS[0].make(); s.capo = 3; break;
      case '双TAB_tabCapos1=3': s = PRESETS[3].make(); s.tabCapos = [null, 3]; break;
      /* v68.6 收尾 F1：GP 导入常见的「伴奏夹、主音不夹」——参考轨夹 4 品按 C 指法（实际 E 调），第 2 条吉他不夹，品位写在 E 调上（＋4），
         它自己的和弦名按它自己的指法写（C→E：exportMIDI 按本轨和弦取形＋本轨夹位发声，同口径）；开联排。反过来：参考轨不夹、第 2 条夹 3 品（品位 −3，和弦名 C→A） */
      case 'GP主音不夹': case 'GP主音夹3': case 'GP主音不夹无和弦': { s = PRESETS[3].make(); const up = k !== 'GP主音夹3', d = up ? 4 : -3, noCh = k === 'GP主音不夹无和弦';
        s.capo = up ? 4 : 0; s.tabCapos = [null, up ? 0 : 3]; s.tabJp = true; s.tabJpVoices = [true, true];
        s.measures.forEach(m => (m.tabs[1] || []).forEach(c => { (c.notes || []).forEach(n => { if (typeof n.f === 'number' && !n.x) { n.f += d; if (n.f < 0) n.f += 12; } });
          if (c.chord) c.chord = noCh ? '' : shiftChordName(c.chord, d); })); break; }   /* 无和弦：主音轨自己不写和弦，它的和弦全靠从参考轨搬来（必须换算到本轨指法框 C→E） */
      case 'JG': s = __lyr(B('JG'), 0); break;
      case 'JG空谱': s = B('JG'); break;
      case 'SG': s = __lyr(B('SG'), 0); break;
      case 'SJG': s = __lyr(B('SJG'), 0); break;
      case 'SATB+钢琴': s = B('S', { nVox: 4 }); s.voxVoices = ['女高音', '女低音', '男高音', '男低音']; s.voxNotations = ['staff', 'staff', 'staff', 'bass'];
        __addVox(s, '钢琴右手', 'staff'); __addVox(s, '钢琴左手', 'bass'); [0, 1, 2, 3].forEach(i => __lyr(s, i));
        s.voxGroups = [{ type: 'bracket', from: 0, to: 3 }, { type: 'brace', from: 4, to: 5 }]; break;
      case '小提琴+钢琴': s = B('SG'); s.voxVoices = ['小提琴', '右手', '左手']; s.instKey = 'violin'; break;
      case '二重唱': s = B('J', { nVox: 2 }); __lyr(s, 0, '春'); __lyr(s, 1, '风'); break;
      case '二重唱无分组': s = B('J', { nVox: 2 }); delete s.voxGroups; __lyr(s, 0, '春'); __lyr(s, 1, '风'); break;
      case '吉他+钢琴+人声': s = __lyr(B('JT'), 0); __addVox(s, '右手', 'staff'); __addVox(s, '左手', 'bass'); break;
      case '无词指弹JT': s = B('JT'); break;
      case '高行20': s = B('S', { nVox: 4 }); delete s.voxGroups; for (let i = 4; i < 20; i++) __addVox(s, '声部' + (i + 1), 'staff');   /* 一行比一页还高 → PV_GEO.nf（PA5 含 nf） */
        s.layout = { pgno: { on: true, pos: 'bc', start: 1, first: true } }; break;
      case 'JGacc': s = __lyr(B('JG'), 0); s.pianoAcc = true; break;   /* PA2：老伴奏谱口径（pianoAcc），人声份必须删掉它（否则 stackOf 误判 CG） */
      case '多TAB联排': s = __lyr(B('JT'), 0); __addTab(s, '吉他2'); __addTab(s, '吉他3'); s.tabJp = true; s.tabJpVoices = [true, false, true]; break;
      case '老谱全亮联排': s = __lyr(B('JT'), 0); __addTab(s, '吉他2'); s.tabJp = true; delete s.tabJpVoices; break;
      case '无分组SATB': s = B('S', { nVox: 4 }); delete s.voxGroups; s.voxVoices = ['女高音', '女低音', '男高音', '男低音']; s.voxNotations = ['staff', 'staff', 'staff', 'bass'];
        [0, 1, 2, 3].forEach(i => __lyr(s, i)); break;
      case '多TAB缺省名+贝斯': s = __lyr(B('JT'), 0); __addTab(s, '吉他2'); __addTab(s, '贝斯'); break;
      case 'R4并入t0': s = __lyr(B('JT'), 0); __addVox(s, '旋律2'); break;
      case 'R3有和弦chord': s = __chd(B('JT'), 0, 'chord'); break;
      case 'R3有和弦chords': s = __chd(B('JT'), 0, 'chords'); break;
      case 'R4多TAB各一份': s = B('JT'); __addTab(s, '吉他2'); break;
      case '重名': s = __lyr(B('JT'), 0); __addVox(s, '人声'); s.voxVoices[0] = '人声'; __lyr(s, 1); break;
      case '尤克里里多TAB': s = __lyr(B('JT'), 0); s.inst = 'uku'; __addTab(s, '吉他2'); __addTab(s, '低音'); break;
      default: throw new Error('未知夹具 ' + k);
    }
    return migrate(s); };
  /* 计划 → 紧凑行 [id, kind, name, tab, vox, opt, scoreEq, ord]；同时查纯函数（计划前后 JSON 逐字节相同）与输出形状 */
  window.__plan = s => { const j0 = JSON.stringify(s); const r = partsPlan(s); const j1 = JSON.stringify(s);
    const keys = (r.parts || []).every(p => Object.keys(p).join(',') === 'id,kind,name,tab,vox,opt,scoreEq,ord');
    return { solo: r.solo, kindName: r.kindName, kos: (() => { try { return NWB.kindOfSong(s).name; } catch (e) { return 'ERR'; } })(),
      top: Object.keys(r).join(','), keys, pure: j0 === j1,
      rows: (r.parts || []).map(p => [p.id, p.kind, p.name, p.tab, p.vox, p.opt, p.scoreEq, p.ord]) }; };
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    if (typeof undoStack !== 'undefined') { undoStack.length = 0; redoStack.length = 0; }
    loadSong(s); sel = { mi: 0, row: (song.tabVoices || []).length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); blurSel = true; render(); return song.measures.length; };
  /* ---------- PA2 起的公共工具 ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  window.__h = x => { x = String(x); let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < x.length; i++) { const c = x.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + ':' + x.length; };
  window.__rep = (s, k) => { const base = cl(s.measures); for (let i = 1; i < k; i++) s.measures.push(...cl(base)); return s; };
  const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  const TC = (dur, notes, o) => Object.assign({ dur, dotted: false, chord: '', notes: (notes || []).map(([s, f, x]) => x ? { s, f, x: true } : { s, f }), strum: '', tech: '' }, o || {});
  /* §2.3 红线快照：song JSON、全部窗口的谱、撤销 / 重做栈、排队落盘、全部 musetab-* 键值、#score（书写态） */
  window.__red = () => { const ls = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^musetab-/.test(k)) ls[k] = localStorage.getItem(k); } } catch (_) {}
    return { json: JSON.stringify(song), docs: JSON.stringify(docs.map(d => d.song)), u: undoStack.length, r: redoStack.length, pend: !!(typeof persist !== 'undefined' && persist.pending),
      ls: JSON.stringify(ls), score: __h(document.getElementById('score').innerHTML) }; };
  window.__redDiff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
  /* 记号齐全的夹具：两只老虎 ×3（2 条 TAB＋人声，12 小节）＋排练号 / 反复 / 房子 / 𝄋 / ⊕ / 转调 / D.C. / Fine / 段落线 / 𝄎 ＋ 版面字段 ＋ 逐轨联排 ＋ 混音 */
  window.__marksFx = o => { o = o || {}; const s = __rep(PRESETS[3].make(), 3), M = s.measures;
    M[0].label = 'A'; M[0].repeatStart = true; M[2].volta = 1; M[2].repeatEnd = true; M[3].volta = 2; M[4].label = 'B'; M[4].segno = true; M[5].sectionBar = true;
    M[6].keyTo = 'D'; M[7].fine = true; M[8].coda = true; M[9].beats = 4; M[9].unit = 4; M[10].simile = 1; M[11].dc = true;
    M[1].brk = 1; M[6].pull = 1; M[4].pgbrk = 1; M[2].wf = 1.4; M[8].wf = 0.8;
    s.mixer = { 'tab:0': { vol: 0.5 }, 'tab:1': { mute: true }, 'vox:0': { vol: 0.8 }, master: { vol: 1 } };
    if (o.jp !== false) { s.tabJp = true; s.tabJpVoices = [false, true]; }
    if (o.pgno) s.layout = Object.assign({}, s.layout || {}, { pgno: o.pgno });
    if (o.capo) s.capo = o.capo;
    return migrate(s); };
  /* 和弦重现的构造夹具（PA4，计数写死）：
     carryT（落在 TAB 行）：吉他两列二分、人声四列四分带和弦——
       m0 F@1（落到 TAB 拍 2 列：moved）、G@3（本小节后面没有列 → m1 第 0 列：moved）；m1 Am@3（m2 第 0 列自带 C：dropped）；m3 D@0（exact）
     carryV（落在旋律行）：人声两列二分、吉他和弦——
       m0 C@0（exact）、F@1（列内 q=1：exact）、G@1.5（q 非整数 → 下一列起拍 2：moved）；m1 Am@3（第 2 列内 q=1：exact）；m2 E@0（人声第 0 列自带 D：dropped） */
  window.__carryFx = k => { const s = NWB.build('JT', { title: '和弦重现' + k, nMea: 4 }); const M = s.measures;
    if (k === 'T') {
      M.forEach((m, mi) => { m.tabs[0] = [TC(2, [[2, 1]]), TC(2, [[3, 0]])]; m.voxes[0] = [V(1, 4, { lyrics: ['春'] }), V(2, 4), V(3, 4), V(4, 4)]; });
      M[0].voxes[0][1].chord = 'F'; M[0].voxes[0][3].chord = 'G'; M[1].voxes[0][3].chord = 'Am'; M[2].tabs[0][0].chord = 'C'; M[3].voxes[0][0].chord = 'D';
    } else {
      M.forEach(m => { m.voxes[0] = [V(1, 2, { lyrics: ['春'] }), V(2, 2)]; m.tabs[0] = [TC(2, [[2, 1]]), TC(2, [[3, 0]])]; });
      M[0].tabs[0] = [TC(4, [[2, 1]], { chord: 'C' }), TC(8, [[3, 0]], { chord: 'F' }), TC(8, [[3, 2]], { chord: 'G' }), TC(2, [[1, 0]])];
      M[1].tabs[0] = [TC(2, [[2, 1]]), TC(4, [[3, 0]]), TC(4, [[3, 2]], { chord: 'Am' })];
      M[2].tabs[0][0].chord = 'E'; M[2].voxes[0][0].chord = 'D';
    }
    return migrate(s); };
  /* 联排弹唱谱（tabStaff＋人声）且 TAB 上有 ×：拆出吉他份后 × 的解析要随源谱（keepSolo） */
  window.__staffX = () => { const s = PRESETS[0].make(); s.tabStaff = true;
    s.measures.forEach(m => (m.tabs[0] || []).forEach((c, ci) => { if (ci % 2 === 0) (c.notes || []).forEach(n => { n.x = true; }); })); return migrate(s); };
  /* 夹具总入口：{p:预设号} · {f:PA1 夹具名} · {m:记号夹具选项} · {carry:'T'|'V'} · {staffX:1}；rep＝整谱复制份数，capo＝改变调夹，key＝改调，pgno，fixed */
  window.__mkc = c => { let s;
    if (c.p != null) s = migrate(PRESETS[c.p].make()); else if (c.f) s = __fx(c.f); else if (c.m) s = __marksFx(c.m); else if (c.carry) s = __carryFx(c.carry); else if (c.staffX) s = __staffX();
    if (c.rep) __rep(s, c.rep);
    if (c.capo != null) s.capo = c.capo; if (c.key) s.key = c.key;
    if (c.pgno) s.layout = Object.assign({}, s.layout || {}, { pgno: c.pgno });
    if (c.fixed != null) s.layout = Object.assign({}, s.layout || {}, { fixed: !!c.fixed });
    if (c.pgbrk) c.pgbrk.forEach(i => { if (s.measures[i]) s.measures[i].pgbrk = 1; });
    if (c.title) s.title = c.title;
    if (c.keyTo) s.measures[c.keyTo[0]].keyTo = c.keyTo[1];
    if (c.vname) s.voxVoices[0] = c.vname;
    return s; };
  /* 被删行上的和弦事件数（chordEvtsMea 内层 scan 同口径），partCarry 的 exact＋moved＋dropped 必须等于它 */
  window.__delEvN = (src, p) => { let n = 0; const kT = new Set(p.tab), kV = new Set(p.vox);
    const cnt = cols => (cols || []).forEach(c => { if (!c) return; if (c.chord) n++; (c.chords || []).forEach(x => { if (x && x.chord && x.q > 0) n++; }); });
    src.measures.forEach(m => { (m.voxes || []).forEach((cols, i) => { if (!kV.has(i)) cnt(cols); }); (m.tabs || []).forEach((cols, i) => { if (!kT.has(i)) cnt(cols); }); }); return n; };
  /* 列内容（去掉和弦字段：partCarry 只写 chord / chords） */
  window.__noCh = cols => JSON.stringify((cols || []).map(c => { if (!c) return c; const o = Object.assign({}, c); delete o.chord; delete o.chords; return o; }));
  /* v68.6 收尾 F4：副本列＝源列，除了 partCarry 写的 chord / chords 与 partMarks 补的全体记号（anno 速度 / 段落类、ferm、dyn 文字速度术语）——
     源列自己的 anno / ferm / dyn 一个都不许改；补进来的只能是这几类取值 */
  window.__colEq = (pc, sc) => { pc = pc || []; sc = sc || []; if (pc.length !== sc.length) return false;
    const AN = PART_MARK_ANNO, DY = PART_MARK_DYN;
    return pc.every((c, i) => { const s0 = sc[i]; if (!c || !s0) return c === s0;
      const st = x => { const o = Object.assign({}, x); ['chord', 'chords', 'anno', 'ferm', 'dyn'].forEach(k => delete o[k]); return JSON.stringify(o); };
      if (st(c) !== st(s0)) return false;
      return ['anno', 'ferm', 'dyn'].every(k => s0[k] ? JSON.stringify(c[k]) === JSON.stringify(s0[k]) : (!c[k] || (k === 'ferm' ? true : k === 'dyn' ? DY.has(c[k]) : (AN.has(c[k]) || DY.has(c[k]))))); }); };
  /* 离屏排一份副本（不经缓存），返回目标 svg 与 out */
  window.__off = (s, o) => { const tg = document.createElementNS(NS, 'svg'); const out = renderOffscreen(Object.assign({ song: s, target: tg, paperW: 870, fixed: true, crop: false }, o || {})); return { tg, out }; };
  /* 把一份分谱（partRender 结果）挂进文档量几何 */
  window.__mount = r => { let sv = document.getElementById('__pa_mount'); if (!sv) { sv = document.createElementNS(NS, 'svg'); sv.id = '__pa_mount'; sv.setAttribute('class', 'pq-offscore');
      sv.setAttribute('style', 'position:absolute;left:0;top:0;'); document.body.appendChild(sv); }
    sv.setAttribute('viewBox', '0 0 ' + r.vb.w + ' ' + r.vb.h); sv.setAttribute('width', r.vb.w); sv.setAttribute('height', r.vb.h); sv.innerHTML = r.html; return sv; };
  window.__bb = e => { const b = e.getBBox(); return { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height, w: b.width, h: b.height }; };
  window.__hit = (a, b) => a.x < b.x2 && b.x < a.x2 && a.y < b.y2 && b.y < a.y2;
  /* MIDI 字节 → 每轨 {name, notes:[[tick, 音高]…]}（exportMIDI 每个事件都写状态字节，不用连续状态） */
  window.__midi = bytes => { const tr = []; let p = 14;
    while (p + 8 <= bytes.length) { const len = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7]; let q = p + 8; const end = q + len; let name = '', tick = 0; const notes = [];
      while (q < end) { let d = 0, bt; do { bt = bytes[q++]; d = (d << 7) | (bt & 127); } while (bt & 128); tick += d; const st = bytes[q];
        if (st === 0xFF) { const ty = bytes[q + 1]; q += 2; let l = 0; do { bt = bytes[q++]; l = (l << 7) | (bt & 127); } while (bt & 128); if (ty === 3) name = new TextDecoder().decode(bytes.slice(q, q + l)); q += l; continue; }
        const hi = st & 0xF0; q++; if (hi === 0xC0 || hi === 0xD0) { q += 1; continue; } const a = bytes[q], v = bytes[q + 1]; q += 2; if (hi === 0x90 && v > 0) notes.push([tick, a]); }
      tr.push({ name, notes }); p = end; }
    return tr; };
  window.__sleep = ms => new Promise(r => setTimeout(r, ms));
  /* PA2：一份谱的全部分谱（brk 两种）派生副本逐项自洽；前后 §2.3 红线不变（含 partRender 预排各份） */
  window.__pa2 = c => {
    __ld(__mkc(c)); try { persistNow(); } catch (_) {} const src = cl(song), red0 = __red(), P = partsPlan(song), iss = [], E = (t, w) => iss.push(t + ':' + w);
    const MK = ['label', 'keyTo', 'repeatStart', 'repeatEnd', 'volta', 'segno', 'coda', 'dc', 'ds', 'fine', 'beats', 'unit', 'simile', 'finalBar', 'sectionBar'];
    const SK = ['title', 'singer', 'lyricist', 'composer', 'maker', 'beats', 'unit', 'tempo', 'tempoTerm', 'pickup', 'inst', 'func', 'mode', 'chordOnly', 'diagPos', 'tabNota', 'tabClef', 'transp'];
    const srcCapo = src.tabVoices.length ? (src.capo | 0) : 0, jpOn = i => !!src.tabJp && (Array.isArray(src.tabJpVoices) ? !!src.tabJpVoices[i] : true);
    let nPS = 0;
    for (const brk of [false, true]) for (const p of P.parts) {
      let d; try { d = partSong(p, { brk }); nPS++; } catch (e) { E(p.id, 'throw ' + e.message); continue; }
      const c = d.song, tag = p.id + (brk ? '/brk' : ''), nT = c.tabVoices.length, nV = c.voxVoices.length, tr = !p.tab.length && srcCapo > 0;
      const dk = p.tab.length ? srcCapo - capoOf(p.tab[0]) : 0;   /* F1：本轨夹位≠参考轨时副本调框平移 dk */
      if (c === song || c.measures === song.measures) E(tag, '不是副本');
      if (c.measures.length !== src.measures.length) E(tag, '小节数');
      if (J(c.tabVoices) !== J(p.tab.map(i => src.tabVoices[i])) || J(c.voxVoices) !== J(p.vox.map(i => src.voxVoices[i]))) E(tag, '轨名 / 行');
      c.measures.forEach((m, mi) => { if ((m.voxes || []).length !== nV || (m.tabs || []).length !== nT) E(tag, '行数@' + mi);
        p.tab.forEach((i, k) => { if (!__colEq(m.tabs[k], src.measures[mi].tabs[i])) E(tag, 'TAB 内容@' + mi); });
        p.vox.forEach((i, k) => { if (!__colEq(m.voxes[k], src.measures[mi].voxes[i])) E(tag, '旋律内容@' + mi); });
        MK.forEach(k => { if (((tr || dk) && k === 'keyTo') ? false : J(m[k]) !== J(src.measures[mi][k])) E(tag, '小节 ' + k + '@' + mi); });
        if (tr && src.measures[mi].keyTo && m.keyTo !== KEY_LIST[((KEY_PC[src.measures[mi].keyTo] + srcCapo) % 12 + 12) % 12]) E(tag, 'keyTo 未平移@' + mi);
        if (dk && src.measures[mi].keyTo && m.keyTo !== KEY_LIST[((KEY_PC[src.measures[mi].keyTo] + dk) % 12 + 12) % 12]) E(tag, 'keyTo 未随本轨夹位平移@' + mi);
        if ('pgbrk' in m || 'wf' in m) E(tag, 'pgbrk / wf 没剥');
        if (!brk && ('brk' in m || 'pull' in m)) E(tag, 'brk / pull 没剥');
        if (brk && (m.brk !== src.measures[mi].brk || m.pull !== src.measures[mi].pull)) E(tag, 'brk / pull 没沿用@' + mi);
        const ks = m.keyToSig, ks0 = src.measures[mi].keyToSig, tabOnly = !nV && !c.tabStaff && !(c.tabJp && (Array.isArray(c.tabJpVoices) ? c.tabJpVoices.some(Boolean) : true));
        if (tabOnly && m.keyTo ? ks !== 'text' : ks !== ks0) E(tag, 'keyToSig@' + mi);
      });
      SK.forEach(k => { if (J(c[k]) !== J(src[k])) E(tag, '顶层 ' + k); });
      const vn = k => (c.voxNotations || [])[k] || null, vn0 = i => (src.voxNotations || [])[i] || null;
      if (Array.isArray(c.voxNotations) && c.voxNotations.length > nV) E(tag, 'voxNotations 越界');
      if (Array.isArray(c.voxDual) && c.voxDual.length > nV) E(tag, 'voxDual 越界');
      p.vox.forEach((i, k) => { if (vn(k) !== vn0(i)) E(tag, '记谱法 ' + k); if (!!(c.voxDual || [])[k] !== !!(src.voxDual || [])[i]) E(tag, '对照 ' + k); });
      if (p.kind === 'merge') { if (J(c.voxGroups) !== J([{ type: 'bracket', from: 0, to: 1 }])) E(tag, '合并份没写显式方括号 ' + J(c.voxGroups));
        const g = PQ_KIND.groupsOf(c); if (J(g) !== J([{ type: 'bracket', from: 0, to: 1 }])) E(tag, '合并份分组推断 ' + J(g)); }
      else if (p.kind === 'piano') { (c.voxGroups || []).forEach(g => { if (!(g && g.from >= 0 && g.to < nV && g.to > g.from)) E(tag, '分组越界'); });
        if (J(c.voxGroups) !== J(src.voxGroups)) E(tag, '钢琴份分组变了'); if (!!c.pianoAcc !== !!src.pianoAcc) E(tag, '钢琴份 pianoAcc'); }
      else { if ('voxGroups' in c) E(tag, '单行份留着 voxGroups'); if (c.pianoAcc) E(tag, 'pianoAcc 没删'); }
      Object.keys(c.mixer || {}).forEach(k => { const m = /^(tab|vox):(\d+)$/.exec(k); if (!m) { if (J(c.mixer[k]) !== J((src.mixer || {})[k])) E(tag, '混音 ' + k); return; }
        const j = +m[2], o = m[1] === 'tab' ? p.tab[j] : p.vox[j];
        if (j >= (m[1] === 'tab' ? nT : nV)) E(tag, '混音越界 ' + k); else if (J(c.mixer[k]) !== J((src.mixer || {})[m[1] + ':' + o])) E(tag, '混音错位 ' + k); });
      if (nT) { if (c.capo !== capoOf(p.tab[0])) E(tag, 'capo'); if ('tabCapos' in c) E(tag, 'tabCapos 没删');
        if (c.key !== KEY_LIST[((KEY_PC[src.key] + dk) % 12 + 12) % 12]) E(tag, '调框 key（dk＝' + dk + '）');
        if (keyRefOf(c.key, c.refOct | 0) !== keyRefOf(src.key, src.refOct | 0) + dk) E(tag, '调基准音 refOct（dk＝' + dk + '）');
        if (c.tabVoices.some((_, k) => tabJpOn(p.tab[k]) !== (!!c.tabJp && (Array.isArray(c.tabJpVoices) ? !!c.tabJpVoices[k] : true)))) E(tag, '联排开关');
        if (c.tabJpVoices !== undefined && (!Array.isArray(c.tabJpVoices) || c.tabJpVoices.length !== nT)) E(tag, 'tabJpVoices 长度');
        if (!!c.tabStaff !== !!src.tabStaff) E(tag, 'tabStaff'); }
      else { ['tabCapos', 'tabJp', 'tabJpVoices', 'tabStaff'].forEach(k => { if (k in c) E(tag, k + ' 没删'); });
        if (srcCapo > 0 ? (c.capo !== 0 || c.key !== KEY_LIST[((KEY_PC[src.key] + srcCapo) % 12 + 12) % 12]) : (c.key !== src.key || (c.capo | 0) !== (src.capo | 0))) E(tag, '调 / 夹位'); }
      const ly = PQ_KIND.voxHasLyrics(c, 0, nV - 1);
      if (ly ? c.lyricLines !== src.lyricLines : c.lyricLines !== 0) E(tag, 'lyricLines');
      const bn = !src.barNums && !nT && c.voxVoices.some((_, k) => !isStaffNota(vn(k)));
      if (bn ? c.barNums !== 'row' : c.barNums !== src.barNums) E(tag, 'barNums');
      const L0 = src.layout || {}, pg0 = L0.pgno;
      if (pg0 && typeof pg0 === 'object' ? J(c.layout.pgno) !== J(pg0) : J(c.layout.pgno) !== J({ on: true, pos: 'bc', start: 1, first: false })) E(tag, 'pgno');
      Object.keys(L0).forEach(k => { if (k !== 'pgno' && J(c.layout[k]) !== J(L0[k])) E(tag, 'layout.' + k); });
      const nEv = __delEvN(src, p), cr = d.carry, carried = ['tab', 'voice', 'piano'].includes(p.kind);
      if (carried ? cr.exact + cr.moved + cr.dropped !== nEv : (cr.exact || cr.moved || cr.dropped)) E(tag, 'carry 计数 ' + J(cr) + ' / 事件 ' + nEv);
      if (d.keepSolo !== (!!src.tabStaff && src.voxVoices.length > 0 && p.tab.length > 0)) E(tag, 'keepSolo');
      /* 副本上只许出现这几个既有字段（规格 §3.3 第 4、6、7、8、10 步）：合并份的 voxGroups、页码缺省的 layout、lyricLines、行首小节号 barNums、夹位 capo、transposeSong 补的 refOct */
      const okNew = ['layout', 'lyricLines', 'barNums', 'capo', 'refOct', 'funcNames'].concat(p.kind === 'merge' ? ['voxGroups'] : []);
      /* F2：funcNames 只在「源谱有 TAB、本份没有 TAB、不是功能谱、谱上没设、本份旋律行自己不带和弦、确有和弦搬进来」时置真 */
      const own = p.vox.some(i => src.measures.some(m => ((m.voxes || [])[i] || []).some(x => x && (x.chord || (x.chords || []).some(y => y && y.chord)))));
      const wantFN = src.tabVoices.length > 0 && !p.tab.length && !src.func && src.funcNames == null && !own && (d.carry.exact + d.carry.moved) > 0;
      if (wantFN ? c.funcNames !== true : J(c.funcNames) !== J(src.funcNames)) E(tag, 'funcNames ' + J(c.funcNames));
      if (Object.keys(c).some(k => !(k in src) && !okNew.includes(k))) E(tag, '新增顶层字段 ' + Object.keys(c).filter(k => !(k in src) && !okNew.includes(k)).join(','));
      c.measures.forEach((m, mi) => Object.keys(m).forEach(k => { if (!(k in src.measures[mi]) && k !== 'keyToSig') E(tag, '新增小节字段 ' + k); }));
    }
    let nR = 0; for (const p of P.parts) if (!p.scoreEq) try { partRender(p, { paperW: LAST_PAPER_W, brk: false }); partRender(p, { paperW: LAST_PAPER_W, brk: true }); nR++; } catch (e) { E(p.id, 'partRender ' + e.message); }
    const red1 = __red();
    return { n: P.parts.length, nPS, nR, iss: [...new Set(iss)].slice(0, 10), nIss: iss.length, red: __redDiff(red0, red1) };
  };
  /* tabJpSpliceS(s, vi) ≡ 借用全局跑 tabJpRemoveTrack(vi)（调用时轨还没删） */
  window.__jpEq = () => { const out = [], keep = song;
    const bases = [{ tabJp: true, tabJpVoices: [true, false, true] }, { tabJp: true }, { tabJp: true, tabJpVoices: [false, false, true] }, { tabJp: true, tabJpVoices: [true] },
      {}, { tabJp: false, tabJpVoices: [true, true, true] }, { tabJp: true, tabJpVoices: [false, false, false] }, { tabJp: true, tabJpVoices: [true, null, 1] }];
    for (const b of bases) for (let vi = 0; vi < 3; vi++) {
      const mk = () => Object.assign({ tabVoices: ['甲', '乙', '丙'], voxVoices: [], measures: [] }, cl(b));
      const a = mk(); tabJpSpliceS(a, vi);
      const g = mk(); try { song = g; tabJpRemoveTrack(vi); } finally { song = keep; }
      const pick = s => J({ j: s.tabJp, v: s.tabJpVoices, has: ['tabJp', 'tabJpVoices'].map(k => k in s) });
      out.push(pick(a) === pick(g) ? 1 : J(b) + '#' + vi + ' ' + pick(a) + ' ≠ ' + pick(g)); }
    return out; };
  /* PA3：夹位换调。返回人声 / 各吉他份的 MIDI 发声与和弦平移比对 */
  window.__pa3 = () => { const out = {};
    { __ld(__mkc({ p: 0, capo: 2 })); const P = partsPlan(song), v = P.parts.find(p => p.id === 'v0'), r = partRender(v, { paperW: LAST_PAPER_W });
      const sc = document.getElementById('score').innerHTML;
      out.a = { d: />1=D</.test(r.html), cap: /变调夹 \d+ 品/.test(r.html), srcD: />1=D</.test(sc), srcCap: /变调夹 2 品/.test(sc) }; }   /* 页头那行字（热区悬停提示里也有「变调夹」三个字，不算） */
    out.b = ['F', 'G', 'A', 'B'].map(K => {   /* F→G 谱首调折八度（refOct+1）；G / A / B 不折；第 7 小节转 F→G 折——转调段与谱首调折法不同 */ __ld(__mkc({ p: 0, key: K, capo: 2, keyTo: [6, 'F'] }));
      const P = partsPlan(song), v = P.parts.find(p => p.id === 'v0'), d = partSong(v, { brk: false }), c = d.song;
      const trk = (s, nm) => (__midi(exportMIDI(s).bytes).find(t => t.name === nm) || { notes: null }).notes;
      const a = trk(song, song.voxVoices[0]), bb = trk(c, c.voxVoices[0]);
      /* 和弦：每小节「拍位 → 最后一个和弦」（全部行，源谱名字平移 2 个半音）＝副本人声行 */
      const evs = (s, rows) => s.measures.map((m, mi) => { const mU = meaMeter(mi).unit, o = {};
        rows(m).forEach(cols => { let bt = 0; (cols || []).forEach(x => { if (x.chord) o[Math.round(bt * 1e4)] = x.chord; (x.chords || []).forEach(y => { if (y && y.chord && y.q > 0) o[Math.round((bt + y.q * mU / 4) * 1e4)] = y.chord; }); bt += beatsOf(x, mU); }); });
        return o; });
      const se = evs(song, m => (m.voxes || []).concat(m.tabs || [])).map(o => { const r = {}; Object.keys(o).forEach(k => { r[k] = shiftChordName(o[k], 2); }); return r; });
      let ce = null; { const keep = song; try { song = c; ce = evs(c, m => m.voxes || []); } finally { song = keep; } }
      return { K, key: c.key, capo: c.capo, keyTo: c.measures[6].keyTo, refOct: c.refOct | 0, srcRef: song.refOct | 0, n: a && a.length, same: !!a && J(a) === J(bb), ch: J(se) === J(ce), nCh: se.reduce((x, o) => x + Object.keys(o).length, 0),
        carry: d.carry, d1: a && bb && a.findIndex((x, i) => J(x) !== J(bb[i])) }; });
    { __ld(__fx('双TAB_tabCapos1=3')); const P = partsPlan(song);
      out.c = P.parts.filter(p => p.kind === 'tab').map(p => { const d = partSong(p, { brk: false }), c = d.song, nm = song.tabVoices[p.tab[0]];
        const a = (__midi(exportMIDI(song).bytes).find(t => t.name === nm) || {}).notes, bb = (__midi(exportMIDI(c).bytes).find(t => t.name === nm) || {}).notes;
        return { id: p.id, capo: c.capo, want: capoOf(p.tab[0]), tabCapos: 'tabCapos' in c, n: a && a.length, same: !!a && J(a) === J(bb) }; }); }
    /* PA3e（F1）：每一份页头的实际调（第一个「1=X」）＝总谱页头的实际调；本轨另夹品的吉他份另查夹位字样与和弦名换算 */
    const hk = h => { const d = document.createElementNS(NS, 'svg'); d.innerHTML = h; const t = [...d.querySelectorAll('text')].find(x => /^1=/.test(x.textContent.trim())); return t ? t.textContent.trim() : null; };
    const cap = h => { const d = document.createElementNS(NS, 'svg'); d.innerHTML = h; const t = [...d.querySelectorAll('text')].find(x => /变调夹 \d+ 品/.test(x.textContent)); return t ? t.textContent.replace(/　.*$/, '').trim() : ''; };
    out.e = [];
    for (const f of [{ f: 'JT带夹3品' }, { f: '双TAB_tabCapos1=3' }, { f: 'GP主音不夹' }, { f: 'GP主音夹3' }, { f: 'GP主音不夹无和弦' }, { f: 'GP主音不夹', keyTo: [2, 'G'] }, { p: 0, capo: 2 }, { p: 3, capo: 5, key: 'G' }, { f: '吉他+钢琴+人声' }, { p: 11 }]) {
      __ld(__mkc(f)); const sk = hk(document.getElementById('score').innerHTML);
      partsPlan(song).parts.forEach(p => { if (p.scoreEq) return; const r = partRender(p, { paperW: LAST_PAPER_W }), d = partSong(p, { brk: false }).song;
        const ch = [...new Set(d.measures.flatMap(m => (m.tabs[0] || []).map(x => x && x.chord).filter(Boolean)))].join(',');
        out.e.push({ f: f.f || ('#' + f.p + (f.capo ? '夹' + f.capo : '')), id: p.id, score: sk, part: hk(r.html), cap: p.tab.length ? cap(r.html) : '', capo: d.capo, ch }); }); }
    return out; };
  /* PA4a：TAB 份每列生效和弦（tabColChords）与简谱联排列（jpColOf）——在 renderOffscreen 的 prep 借用里取副本的，与源谱对应轨逐列比（排除同拍冲突列）。
     v68.6 收尾 F1：和弦名按所在行的指法框比——旋律行上的和弦是参考轨夹位（song.capo）的指法名，TAB 行上的是本轨夹位（capoOf）的指法名；
     副本里每列的生效和弦＝源谱生效事件的名字换算到本份指法框（shiftChordName(名, 来源行夹位−本轨夹位)；夹位都相同时就是原名）。
     联排列逐字段相同（此前「本轨另夹品时比发声」的放宽已撤：副本调框随本轨夹位平移后，联排数字、升降、八度点都与总谱相同）；
     源谱侧的期望值用 jpColOf(…, 换算后的和弦名) 取——和弦隐含音按本份实际要弹的和弦图取形 */
  window.__pa4inv = c => { __ld(__mkc(c)); const P = partsPlan(song), res = [];
    const srcCapo = song.tabVoices.length ? (song.capo | 0) : 0, frameOf = row => row[0] === 'v' ? srcCapo : capoOf(+row.slice(1));
    const evm = song.measures.map((m, mi) => { const mU = meaMeter(mi).unit, out = [];
      const scan = (cols, row) => { let bt = 0; (cols || []).forEach(x => { if (!x) return;
        if (x.chord) out.push({ beat: bt, ch: x.chord, row }); (x.chords || []).forEach(y => { if (y && y.chord && y.q > 0) out.push({ beat: bt + y.q * mU / 4, ch: y.chord, row }); }); bt += beatsOf(x, mU); }); };
      (m.voxes || []).forEach((cols, i) => scan(cols, 'v' + i)); (m.tabs || []).forEach((cols, i) => scan(cols, 't' + i));
      return out.sort((x, y) => x.beat - y.beat); });
    /* 源谱第 mi 小节拍 bt 的生效事件（chordAtCol 口径：本小节 ≤ 拍位的最后一个，没有则取前面小节最后一个）；同拍的全部事件一并返回（判冲突） */
    const effAt = (mi, bt) => { for (let m = mi; m >= 0; m--) { const es = evm[m].filter(e => m < mi || e.beat <= bt + 1e-4); if (es.length) { const L = es[es.length - 1]; return { e: L, same: es.filter(e => Math.abs(e.beat - L.beat) < 1e-4) }; } } return null; };
    /* 同拍冲突：决定本列的那一拍上两条以上 TAB 的和弦换算成实音后不同（规格 §3.4 唯一例外） */
    const conflict = ef => !!ef && new Set(ef.same.filter(e => e.row[0] === 't').map(e => shiftChordName(e.ch, frameOf(e.row)))).size >= 2;
    for (const p of P.parts) { if (p.kind !== 'tab') continue; const vi = p.tab[0], capT = capoOf(vi);
      const exp = song.measures.map((m, mi) => { const mU = meaMeter(mi).unit; let bt = 0; return (m.tabs[vi] || []).map(col => { const ef = effAt(mi, bt); bt += beatsOf(col, mU);
        return { ch: ef ? shiftChordName(ef.e.ch, frameOf(ef.e.row) - capT) : '', cf: conflict(ef) }; }); });
      const srcJp = song.measures.map((m, mi) => (m.tabs[vi] || []).map((_, ci) => J(jpColOf(mi, vi, ci, exp[mi][ci].ch))));
      const d = partSong(p, { brk: false }); let got = null;
      __off(d.song, { maxSystems: 1, part: { name: p.name, run: true, keepSolo: d.keepSolo }, prep: s => { got = { ch: s.measures.map((m, mi) => tabColChords(mi, 0)),
        jp: s.measures.map((m, mi) => { const chs = tabColChords(mi, 0); return (m.tabs[0] || []).map((_, ci) => J(jpColOf(mi, 0, ci, chs[ci]))); }) }; } });
      let n = 0, ex = 0; const bad = [];
      song.measures.forEach((m, mi) => (m.tabs[vi] || []).forEach((col, ci) => {
        if (exp[mi][ci].cf) { ex++; return; } n++;
        if (exp[mi][ci].ch !== got.ch[mi][ci]) bad.push('和弦@' + mi + ':' + ci + ' ' + exp[mi][ci].ch + '≠' + got.ch[mi][ci]);
        if (srcJp[mi][ci] !== got.jp[mi][ci]) bad.push('联排@' + mi + ':' + ci + ' ' + srcJp[mi][ci].slice(0, 60) + ' ≠ ' + got.jp[mi][ci].slice(0, 60)); }));
      res.push({ id: p.id, n, ex, bad: bad.slice(0, 3), nb: bad.length, carry: d.carry, dk: srcCapo - capT }); }
    return res; };
  /* PA4f（F3）：旋律行和弦重现不越位——随机节奏模糊测试（种子固定）：人声份每个落点（各列起拍、各列内整四分拍位）的生效和弦＝总谱同拍的生效和弦；
     carry 计数＝被删行事件数；外加 g10r 最小复现（全音符旋律，吉他 C@0、G@1.5、Am@2：G 与 Am 同落拍 2，G 记 dropped） */
  window.__pa4f = () => { let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const CH = ['C', 'F', 'G', 'Am', 'Dm', 'Em', 'G7', 'E7'], o = { n: 0, pts: 0, bad: 0, ex: [], cnt: 0, sum: { exact: 0, moved: 0, dropped: 0 } };
    const rhythm = (total, unit) => { const out = []; let left = total;
      const opts = unit === 4 ? [[4, false, 1], [8, false, 0.5], [4, true, 1.5], [2, false, 2], [16, false, 0.25], [8, true, 0.75], [2, true, 3], [1, false, 4]] : [[8, false, 1], [4, false, 2], [4, true, 3], [16, false, 0.5], [8, true, 1.5]];
      let g = 0; while (left > 1e-6 && g++ < 50) { const ok = opts.filter(x => x[2] <= left + 1e-6); const x = ok[Math.floor(rnd() * ok.length)]; out.push(x); left -= x[2]; } return out; };
    const evAll = S => { const keep = song; try { song = S; return S.measures.map((m, mi) => chordEvtsMea(mi)); } finally { song = keep; } };
    const at = (E, mi, b) => { for (let m = mi; m >= 0; m--) { const es = E[m].filter(e => m < mi || e.beat <= b + 1e-4); if (es.length) return es[es.length - 1].chord; } return ''; };
    for (let it = 0; it < 60; it++) {
      const six = it % 3 === 2, s = NWB.build('JT', { title: 'fz', nMea: 5 }); s.beats = six ? 6 : 4; s.unit = six ? 8 : 4; if (it % 5 === 4) s.pickup = true;
      s.measures.forEach((m, mi) => { const tot = (s.pickup && mi === 0) ? (six ? 3 : 2) : s.beats;
        m.voxes[0] = rhythm(tot, s.unit).map(([dur, dotted], k) => ({ dur, dotted, deg: 1 + (k % 7), acc: '', oct: 0, lyrics: k === 0 ? ['啊'] : [], tie: false }));
        const grid = six ? 1 : 0.5, nG = Math.round(tot / grid);
        m.tabs[0] = [...Array(nG)].map(() => ({ dur: 8, dotted: false, chord: rnd() < 0.3 ? CH[Math.floor(rnd() * CH.length)] : '', notes: [{ s: 3, f: 0 }], strum: '', tech: '' })); });
      __ld(migrate(s)); const P = partsPlan(song); if (P.solo) continue; const Es = evAll(song);
      for (const p of P.parts) { if (p.kind !== 'voice') continue; const d = partSong(p, { brk: false }), c = d.song, Ec = evAll(c); o.n++;
        ['exact', 'moved', 'dropped'].forEach(k => { o.sum[k] += d.carry[k]; }); o.cnt += __delEvN(song, p);
        c.measures.forEach((m, mi) => { const mU = meaMeter(mi).unit; let bt = 0; (m.voxes[0] || []).forEach((col, ci) => { const len = beatsOf(col, mU), pts = [bt];
          for (let q = 1; q < len * 4 / mU - 1e-4; q++) pts.push(bt + q * mU / 4);
          pts.forEach(t => { o.pts++; const w = at(Es, mi, t), g = at(Ec, mi, t); if (w !== g) { o.bad++; if (o.ex.length < 4) o.ex.push({ it, mi, ci, t, w, g }); } }); bt += len; }); }); } }
    const s = NWB.build('JT', { title: '越位', nMea: 2 }), V = x => Object.assign({ dur: 1, dotted: false, deg: 1, acc: '', oct: 0, lyrics: ['啊'], tie: false }, x || {});
    const T8 = ch => ({ dur: 8, dotted: false, chord: ch || '', notes: [{ s: 3, f: 0 }], strum: '', tech: '' });
    s.measures[0].voxes[0] = [V()]; s.measures[1].voxes[0] = [V({ deg: 3 })];
    s.measures[0].tabs[0] = [T8('C'), T8(), T8(), T8('G'), T8('Am'), T8(), T8(), T8()]; s.measures[1].tabs[0] = [...Array(8)].map(() => T8());
    __ld(migrate(s)); const v = partsPlan(song).parts.find(p => p.id === 'v0'), d = partSong(v, { brk: false }), E2 = evAll(d.song);
    o.min = { tl: E2.map(es => es.map(e => e.beat + ':' + e.chord).join(' ')), carry: d.carry };
    return o; };
  /* PA5：打印口径（真实 beforeprint：PRINTING_NOW＋分页、render 之后取 LAST_PAPER_W）离屏排「全部行、不剥版面、不带 part」的 JSON 副本 ≡ 成品快照 */
  window.__pa5 = c => { __ld(__mkc(c)); if (c.size) setPrintPage(c.size); let r;
    dispatchEvent(new Event('beforeprint'));
    try { const ref = scoreExportClone().innerHTML, g = JSON.stringify(PV_GEO), pw = LAST_PAPER_W, { tg, out } = __off(__cl(song), { paperW: pw });
      tg.querySelectorAll(EXPORT_DROP_SEL).forEach(e => e.remove()); const h = tg.innerHTML; let at = -1;
      if (h !== ref) { at = 0; while (at < h.length && h[at] === ref[at]) at++; }
      r = { same: h === ref, geo: JSON.stringify(out.geo) === g, n: PV_GEO.n, nf: PV_GEO.nf || null, pw, W: PV_GEO.W, len: ref.length, at, ctx: at >= 0 ? [ref.slice(Math.max(0, at - 60), at + 60), h.slice(Math.max(0, at - 60), at + 60)] : null,
        fol: (ref.match(/class="pgfolio"/g) || []).length, wide: document.getElementById('paper').classList.contains('wide') };
    } finally { dispatchEvent(new Event('afterprint')); if (c.size) setPrintPage('A4'); }
    return r; };
  /* PA6：页头几何（分谱挂进文档量 getBBox；A4 版宽 W、页边距 56，MM＝W/210） */
  window.__pa6 = c => { __ld(__mkc(c)); const P = partsPlan(song), p = P.parts.find(x => x.id === (c.pid || 'v0')), r = partRender(p, { paperW: LAST_PAPER_W });
    const sv = __mount(r), g = r.geo, step = g.pgH + g.gap, W = g.W, M0 = 56, MM = W / 210;
    const pp = sv.querySelectorAll('.pgpart'), pe = pp[0], pb = pe && __bb(pe), y0 = r.sysGeo[0].y0;
    const hdr = [...sv.querySelectorAll('text')].filter(t => !t.classList.contains('pgpart') && !t.classList.contains('pgrun') && __bb(t).y2 < y0 - 2);
    const hits = pb ? hdr.filter(t => __hit(__bb(t), pb)).map(t => (t.getAttribute('class') || '') + ':' + t.textContent.slice(0, 16)) : ['无 .pgpart'];
    const rows = r.sysGeo.map((x, i) => ({ y0: x.y0, y1: x.y1, pg: r.sysPg[i] }));
    const runs = [...sv.querySelectorAll('.pgrun')].map(t => ({ pg: Math.floor(+t.getAttribute('y') / step), bb: __bb(t), t: t.textContent, an: t.getAttribute('text-anchor'), x: +t.getAttribute('x') }));
    const fols = [...sv.querySelectorAll('.pgfolio')].map(t => ({ pg: Math.floor(+t.getAttribute('y') / step), bb: __bb(t), t: t.textContent }));
    const PN = pgnoCfg(partSong(p, { brk: false }).song);
    const runBad = [];
    runs.forEach(x => { const f = fols.find(y => y.pg === x.pg); if (f && __hit(x.bb, f.bb)) runBad.push('与页码相交@' + x.pg);
      const rs = rows.filter(y => y.pg === x.pg); if (!rs.length) return;
      if (PN.pos === 'to') { const gap = (rs[0].y0 - 7) - x.bb.y2; if (gap < 2 * MM - 0.01) runBad.push('距首行 ' + gap.toFixed(1) + '@' + x.pg); }
      else { const gap = x.bb.y - rs[rs.length - 1].y1; if (gap < 2 * MM - 0.01) runBad.push('距末行 ' + gap.toFixed(1) + '@' + x.pg); }
      const n = PN.start + x.pg, L = PN.pos === 'bc' || n % 2 === 1; if (x.an !== (L ? 'start' : 'end') || Math.abs(x.x - (L ? M0 : W - M0)) > 0.01) runBad.push('靠向@' + x.pg);
      if (x.bb.x < M0 - 0.5 || x.bb.x2 > W - M0 + 0.5) runBad.push('出版心@' + x.pg); });
    const perPg = [...Array(g.n).keys()].map(k => runs.filter(x => x.pg === k).length);
    return { n: g.n, nPP: pp.length, name: pe && pe.textContent, x: pe && +pe.getAttribute('x'), an: pe && pe.getAttribute('text-anchor'), y: pe && +pe.getAttribute('y'), fw: pe && pe.getAttribute('font-weight'), fs: pe && pe.getAttribute('font-size'),
      w: pb && pb.w, cap: 0.4 * (W - 2 * M0), wantY: Math.max(12, Math.min(Math.round(8 * MM), Math.round(12 * MM) - 9)), hits, nHdr: hdr.length, perPg, runT: runs.map(x => x.t)[0] || '', runBad,
      runFs: runs.map(x => sv.querySelector('.pgrun').getAttribute('font-size'))[0] || '', fol0: fols.filter(x => x.pg === 0).map(x => ({ x: x.bb.x, x2: x.bb.x2, t: x.t })), title: song.title, pn: PN, W }; };
  /* PA7：分谱打印任务 → #print-pages 结构（真实 beforeprint / afterprint） */
  window.__pa7 = (c, ids) => { __ld(__mkc(c)); const P = partsPlan(song); let o = null;
    PART_JOB = { ids, brk: false, t: Date.now() }; dispatchEvent(new Event('beforeprint'));
    try { const box = document.getElementById('print-pages'), pw = LAST_PAPER_W, sg = Object.assign({}, PV_GEO);
      const list = []; if (ids.includes('score')) list.push({ id: 'score', g: sg });
      P.parts.forEach(p => { if (ids.includes(p.id) && !p.scoreEq) { const r = partRender(p, { paperW: pw, brk: false }); list.push({ id: p.id, g: r.geo, r }); } });
      const defs = [...box.querySelectorAll('.pp-defs > defs > g')].map(x => x.id), pps = [...box.querySelectorAll('.pp > svg')];
      const vbs = pps.map(x => x.getAttribute('viewBox')), uses = pps.map(x => x.querySelector('use').getAttribute('href'));
      const want = []; list.forEach((it, k) => { for (let i = 0; i < it.g.n; i++) want.push(['0 ' + i * (it.g.pgH + it.g.gap) + ' ' + it.g.W + ' ' + it.g.pgH, '#pp-src-' + k]); });
      const ids2 = [...box.querySelectorAll('[id]')].map(x => x.id);
      const fol = list.map((it, k) => { const gr = box.querySelector('#pp-src-' + k), step = it.g.pgH + it.g.gap;
        return [...gr.querySelectorAll('.pgfolio')].map(t => [Math.floor(+t.getAttribute('y') / step), +t.textContent]).sort((a, b) => a[0] - b[0]); });
      const cross = list.filter(it => it.r).map(it => { const step = it.g.pgH + it.g.gap; return it.r.sysGeo.filter(x => (x.y1 - x.y0) <= it.g.pgH && Math.floor(x.y0 / step) !== Math.floor((x.y1 - 0.5) / step)).length; });
      const geoOk = list.filter(it => it.r).every(it => it.g.pgH === Math.round(it.g.W * 1.414) && it.g.gap === 26 && it.r.vb.h === it.g.n * it.g.pgH + (it.g.n - 1) * it.g.gap + 6 && it.r.sysPg.every(x => x < it.g.n) && Math.max(...it.r.sysPg) === it.g.n - 1);
      o = { ns: list.map(it => it.id + ':' + it.g.n), nPP: pps.length, sum: list.reduce((a, it) => a + it.g.n, 0), defs, okSeq: JSON.stringify(want) === JSON.stringify(vbs.map((v, i) => [v, uses[i]])),
        uniq: new Set(ids2).size === ids2.length && ids2.every(x => /^pp-src-\d+$/.test(x)) && ids2.length === list.length, drop: box.querySelectorAll('.pagebg, .pageno, .pgbrk-mk, #playhead, #playline').length,
        last: box.lastElementChild.classList.contains('pp'), printing: document.body.classList.contains('printing'), fol, cross, geoOk, title: document.title };
    } finally { dispatchEvent(new Event('afterprint')); }
    o.after = { job: PART_JOB, box: !!document.getElementById('print-pages'), printing: document.body.classList.contains('printing'), title: document.title };
    return o; };
  /* PA8：记号、小节号、歌词 */
  window.__marksCnt = h => { const n = re => (h.match(re) || []).length, q = d => h.split('d="' + d + '"').length - 1;
    return { lab: n(/height="14\.5" rx="1\.5"/g), dc: n(/D\.C\./g), fine: n(/>Fine</g) + n(/  Fine</g), v1: n(/font-weight="700" fill="var\(--ink\)">1\.</g), v2: n(/font-weight="700" fill="var\(--ink\)">2\.</g),
      segno: q(SMUFL.segno.d), coda: q(SMUFL.coda.d), key: n(/>转1=/g) }; };
  window.__txtCnt = (h, L) => { const t = document.createElementNS(NS, 'svg'); t.innerHTML = h; t.querySelectorAll('.pgpart, .pgrun, title').forEach(e => e.remove());
    const o = {}; [...t.textContent].forEach(ch => { if (L.has(ch)) o[ch] = (o[ch] || 0) + 1; }); return JSON.stringify(Object.keys(o).sort().map(k => k + o[k])); };
  /* PA8f（F2）：弹唱谱拆出的人声份——旋律行上的和弦框印音名（funcNames 只在副本置真），框里的字＝副本数据里的和弦名（带夹时是实音）；总谱逐字节不受影响 */
  window.__pa8fn = () => { const out = [], nz = t => String(t || '').replace(/\s/g, '').replace(/♭/g, 'b').replace(/♯/g, '#');
    for (const i of [0, 1, 3, 4]) for (const capo of [0, 3]) { __ld(__mkc({ p: i, capo })); const sc0 = document.getElementById('score').innerHTML;
      const v = partsPlan(song).parts.find(p => p.id === 'v0'), r = partRender(v, { paperW: LAST_PAPER_W }), d = partSong(v, { brk: false });
      const sv = document.createElementNS(NS, 'svg'); sv.innerHTML = r.html;
      const shown = [...sv.querySelectorAll('[data-vchord] text')].map(t => nz(t.textContent));
      const data = []; d.song.measures.forEach(m => (m.voxes[0] || []).forEach(c => { if (!c) return; if (c.chord) data.push(c.chord); (c.chords || []).forEach(x => { if (x && x.chord && x.q > 0) data.push(x.chord); }); }));
      out.push({ i, capo, fn: d.song.funcNames, srcFn: song.funcNames, n: shown.length, same: J(shown.slice().sort()) === J(data.map(nz).sort()), names: shown.every(t => /^[A-G]/.test(t)), first: shown.slice(0, 4).join(' '),
        score: sc0 === document.getElementById('score').innerHTML }); }
    return out; };
  /* PA8g（F4）：速度 / 段落标注、文字式速度术语、延长号随每一份（只写到第 0 行、不覆盖本份自己的标注） */
  window.__pa8mk = () => { const o = {}, fermD = SMUFL.fermataAbove.d;
    const cnt = (h, words) => { const d = document.createElementNS(NS, 'svg'); d.innerHTML = h; const tx = [...d.querySelectorAll('text')].map(t => t.textContent.trim());
      const r = {}; words.forEach(w => { r[w] = tx.filter(t => t === w).length; }); r.ferm = h.split(fermD).length - 1; return r; };
    { const s = __mkc({ p: 11 }); const M = s.measures; M[2].voxes[0][0].anno = '渐慢'; const L = M[M.length - 1].voxes[0].filter(Boolean); L[L.length - 1].ferm = true; __ld(s);
      o.choir = partsPlan(song).parts.map(p => { const r = partRender(p, { paperW: LAST_PAPER_W }); return p.id + ':' + J(cnt(r.html, ['渐慢'])); }); }
    { const s = __mkc({ p: 0 }), M = s.measures; M[0].tabs[0][0].anno = '前奏'; M[4].tabs[0][0].anno = '原速'; M[3].voxes[0][0].anno = '渐慢'; M[5].voxes[0][0].dyn = 'rit.';
      M[6].tabs[0][0].anno = '扫弦'; M[6].voxes[0][0].anno = '自由地'; const L = M[M.length - 1].voxes[0].filter(Boolean); L[L.length - 1].ferm = true; __ld(s);
      const W = ['前奏', '原速', '渐慢', 'rit.', '扫弦', '自由地'], sc = cnt(withCleanSnap(() => scoreExportClone().innerHTML, { paging: true }), W);
      o.jt = { score: sc, parts: partsPlan(song).parts.map(p => { const r = partRender(p, { paperW: LAST_PAPER_W }), d = partSong(p, { brk: false });
        /* 旋律行上搬来的标注常与搬来的和弦同列：标注挪到和弦框之上（只在分谱里），包围盒互不相交 */
        const sv = __mount(r), an = [...sv.querySelectorAll('text')].filter(t => W.includes(t.textContent.trim())), bx = [...sv.querySelectorAll('[data-vchord] rect, [data-vchord] text')];
        const hit = an.reduce((k, t) => k + bx.filter(x => __hit(__bb(t), __bb(x))).length, 0);
        return { id: p.id, c: cnt(r.html, W), marks: d.marks, hit, nBox: bx.length }; }) }; }
    return o; };
  /* PA9：打印任务（mock window.print：派发 beforeprint → 取 #print-pages → afterprint） */
  window.__pr = () => { dispatchEvent(new Event('beforeprint')); const bx = document.getElementById('print-pages');
    const x = { h: bx ? __h(bx.innerHTML) : '', nPP: bx ? bx.querySelectorAll('.pp').length : 0, defs: bx ? [...bx.querySelectorAll('.pp-defs > defs > g')].map(g => g.id).join() : '', title: document.title, off: RENDER_OFF, job: !!PART_JOB };
    dispatchEvent(new Event('afterprint')); x.after = { job: PART_JOB, title: document.title, box: !!document.getElementById('print-pages') }; return x; };
  window.__pa9 = async shell => { const o = {}; __ld(__mkc({ p: 3, rep: 3 })); try { persistNow(); } catch (_) {} await __sleep(50);   /* 载谱本身排队的落盘先落完，红线只量打印操作 */
    const T0 = document.title, red0 = __red(); o.T0 = T0; o.title = song.title;
    const P = partsPlan(song), nOf = id => partRender(P.parts.find(p => p.id === id), { paperW: LAST_PAPER_W }).geo.n;
    o.ref = __pr(); o.n = { t0: nOf('t0'), t1: nOf('t1'), v0: nOf('v0') };
    const calls = [], op = window.print; window.print = () => { calls.push(__pr()); };
    const errs = [], ce = console.error; console.error = (...a) => { errs.push(a.map(x => String(x && x.message || x)).join(' ')); };
    try {
      EXPORT_ACT.parts('A4', ['t0', 'v0']); o.jobSet = !!PART_JOB && JSON.stringify(PART_JOB.ids); await __sleep(320); o.batch = calls.slice();
      o.ctrlP = __pr();
      PART_JOB = { ids: ['t0'], brk: false, t: Date.now() - 6000 }; o.stale = __pr();
      EXPORT_ACT.parts('A4', ['v0']); await __sleep(320); o.single = calls[calls.length - 1];
      const rc = window.renderCore; PART_CACHE.sig = ''; PART_CACHE.map.clear();
      window.renderCore = function () { if (RENDER_OFF && RENDER_OFF.part) throw new Error('注入'); return rc.apply(this, arguments); };
      try { PART_JOB = { ids: ['t0', 'v0'], brk: false, t: Date.now() }; o.inj = __pr(); o.injErr = errs.filter(e => /分谱打印失败，回落总谱/.test(e)).length; } finally { window.renderCore = rc; }
      const n0 = calls.length; EXPORT_ACT.parts('A4'); await __sleep(320); o.def = calls.length > n0 ? calls[calls.length - 1] : null;
      if (shell !== 'classic') { setMode('output'); const F = FLOW.out, hasV = typeof F.view === 'function';
        if (hasV) F.view('v0'); else F.cur = 'v0';
        o.view = { now: JSON.stringify(partJobNow()), pr: __pr() };
        setMode('write'); o.write = { now: partJobNow(), pr: __pr() };
        if (hasV) F.view('score'); else delete F.cur; }
      else { const F = FLOW.out; const had = F && 'cur' in F; if (F && !had) F.cur = 'v0'; o.classic = { flow: flowOn(), now: partJobNow(), pr: __pr() }; if (F && !had) delete F.cur; }
      o.red = __redDiff(red0, __red());
      __ld(__mkc({ p: 10 })); const n1 = calls.length; EXPORT_ACT.parts('A4'); await __sleep(320);
      o.solo = { printed: calls.length > n1, toast: (document.getElementById('toast') || {}).textContent || '' };
      __ld(__mkc({ p: 3 })); const n2 = calls.length; EXPORT_ACT.parts('A4', []); await __sleep(320);
      o.none = { printed: calls.length > n2, toast: (document.getElementById('toast') || {}).textContent || '' };
    } finally { window.print = op; console.error = ce; }
    o.final = { job: PART_JOB, title: document.title, off: RENDER_OFF };
    return o; };
  /* PA10：分谱 PNG（截获 svgPngDownload 的入参；另跑一次真实光栅化，截获下载的文件名） */
  window.__pa10 = async () => { const o = {}; __ld(__mkc({ p: 3, rep: 3 }));
    const ev = [], pe = window.pyqEvent; window.pyqEvent = (n, m) => { ev.push([n, m == null ? '' : String(m)]); };
    const cap = [], sp = window.svgPngDownload; window.svgPngDownload = (xml, vb, k, name) => cap.push({ xml, vb, k, name });
    try {
      EXPORT_ACT.partPng('v0'); const r = partRender(partsPlan(song).parts.find(p => p.id === 'v0'), { paperW: LAST_PAPER_W }), c0 = cap[0];
      const d = new DOMParser().parseFromString(c0.xml, 'image/svg+xml'), root = d.documentElement;
      o.a = { ev: ev.slice(), name: c0.name, k: c0.k, w: +root.getAttribute('width'), h: +root.getAttribute('height'), vbA: root.getAttribute('viewBox'), vb: c0.vb, wantH: r.geo.n * r.geo.pgH + (r.geo.n - 1) * r.geo.gap + 6,
        perr: !!d.querySelector('parsererror'), nPart: (c0.xml.match(/class="pgpart"/g) || []).length, vars: /var\(--/.test(c0.xml), drop: /class="(pagebg|pageno|pgbrk-mk)"/.test(c0.xml), title: song.title };
      cap.length = 0; ev.length = 0; EXPORT_ACT.png(); o.b = { ev: ev.slice(), name: cap[0] && cap[0].name, k: cap[0] && cap[0].k, vb: cap[0] && cap[0].vb };
      { const xml = cap[0].xml, v = document.getElementById('score').viewBox.baseVal;
        const ref = withCleanSnap(() => { const c = scoreExportClone(); c.setAttribute('width', v.width); c.setAttribute('height', v.height); return svgResolveVars(new XMLSerializer().serializeToString(c)); });
        o.b.same = xml === ref; }
      __ld(__fx('JG')); cap.length = 0; ev.length = 0; EXPORT_ACT.partPng('p'); o.eq = { ev: ev.slice(), name: cap[0] && cap[0].name, vb: cap[0] && cap[0].vb, title: song.title };
    } finally { window.pyqEvent = pe; window.svgPngDownload = sp; }
    /* 真实光栅化：下载动作（a.download）与 toast */
    __ld(__mkc({ p: 3, rep: 3 })); const dl = [], ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) dl.push(this.download); };
    const im = []; const OI = window.Image; window.Image = function () { const i = new OI(); const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(i, 'src', { set(v) { im.push(v.length); d.set.call(i, v); }, get() { return d.get.call(i); } }); return i; };
    try { EXPORT_ACT.partPng('v0'); for (let i = 0; i < 50 && dl.length < 1; i++) await __sleep(100);
      EXPORT_ACT.png(); for (let i = 0; i < 50 && dl.length < 2; i++) await __sleep(100);
      o.c = { dl: dl.slice(), toast: (document.getElementById('toast') || {}).textContent || '', im: im.length };
    } finally { HTMLAnchorElement.prototype.click = ac; window.Image = OI; }
    return o; };
  /* PAZ：缺省零差异记录（只用 v68.5 也有的 API；基线页与被测页按同一顺序跑） */
  window.__recZ = c => { __ld(__mkc(c)); const sc = document.getElementById('score'), o = {}, Jx = x => JSON.stringify(x), NSv = 'http://www.w3.org/2000/svg';
    o.score = __h(sc.innerHTML); o.vb = sc.getAttribute('viewBox'); o.geo = Jx(PV_GEO); o.sys = Jx(SYS_GEO);
    o.snap = withCleanSnap(() => __h(scoreExportClone().innerHTML) + '|' + Jx(PV_GEO) + '|' + Jx(SYS_GEO), { paging: true });
    dispatchEvent(new Event('beforeprint')); { const pp = document.getElementById('print-pages'); o.print = __h(pp ? pp.innerHTML : ''); }
    { const tg = document.createElementNS(NSv, 'svg'), out = renderOffscreen({ song: __cl(song), target: tg, paperW: LAST_PAPER_W, fixed: true, crop: false });
      o.offPrint = __h(tg.innerHTML) + '|' + Jx([out.w, out.h, out.systems, out.drawn, out.pages]); }
    dispatchEvent(new Event('afterprint'));
    { const tg = document.createElementNS(NSv, 'svg'), out = renderOffscreen({ song: __cl(song), target: tg, paperW: 660 }); o.off660 = __h(tg.innerHTML) + '|' + Jx([out.w, out.h, out.systems, out.drawn, out.pages]); }
    { const OI = window.Image; let src = null; window.Image = function () { return { set src(v) { src = v; }, get src() { return src; } }; };
      try { exportPNG(2); } finally { window.Image = OI; } o.png = __h(src || ''); }
    let x = ''; try { x = exportMusicXML(song) || ''; } catch (e) { x = 'ERR ' + e.message; } o.mxl = __h(x);
    /* v68.8 ENG-6 放行口径（同 tv_pgbrk __rec）：剥掉 <print new-system="yes"/> 后的哈希、这一句的个数、part 数、有效换行数（内联算，基线 v68.5 也能跑） */
    o.nsN = (x.match(/<print new-system="yes"\/>/g) || []).length; o.mxlS = __h(x.replace(/<print new-system="yes"\/>/g, ''));
    o.nParts = (x.match(/<part id=/g) || []).length;
    { const M = song.measures || []; let n = 0; for (let k = 1; k < M.length; k++) if (M[k - 1].brk === 1 && M[k].pull !== 1 && M[k].pgbrk !== 1) n++; o.brkN = n; }
    try { o.mid = __h(Array.from(exportMIDI(song).bytes).join(',')); } catch (e) { o.mid = 'ERR ' + e.message; }
    o.json = __h(JSON.stringify(song));
    if (typeof flowOn === 'function' && flowOn() && !(FLOW.mob && FLOW.mob.on)) { setMode('output'); o.pv = __h(PV.content) + '|' + Jx(PV.geo); setMode('write'); }
    else { const b = document.getElementById('b-print'); if (b) { b.click(); const m = document.getElementById('modal-mask'); o.dlg = __h(m ? m.innerHTML : ''); try { closeModal(); } catch (_) {} } }
    o.after = __h(sc.innerHTML);
    const ks = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^musetab-/.test(k)) ks.push(k); } } catch (_) {} o.keys = ks.sort().join(',');
    return o; };
  /* TAB 品位 / × 文字（引擎 TAB 音符三种写法同一串属性） */
  window.__tabTx = h => (h.match(/font-weight="500" text-anchor="middle" paint-order="stroke"[^>]*>[^<]*</g) || []).map(x => x.replace(/^[^>]*>/, '').replace(/<$/, ''));
  function J(x) { return JSON.stringify(x); }
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  if (o.nocache) await pg.addInitScript(() => { window.__noRenderCache = true; });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const pdfPages = buf => buf ? (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length : -1;
const SHOTS = process.env.SHOTS || '';   /* 设了就把 PA7e 的 PDF 存进这个目录 */
/* 页面脚本的全部顶层 let / var 绑定（同 tv_offscreen T2a 的扫描：列 0 起的声明，同一行后续语句接着认）；consts 收顶层 const */
function topBindings(html, consts) {
  const names = new Set();
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    if (/src=|ld\+json/.test(m[1])) continue;
    m[2].split('\n').forEach(line => {
      let rest = line;
      while (rest) {
        const d = /^\s*(let|var|const)\s+(.*)$/.exec(rest); if (!d || (rest === line && /^\s/.test(line))) return;
        const into = d[1] === 'const' ? consts : names;
        let depth = 0, q = '', seg = '', i = 0, end = -1;
        const segs = [], src = d[2];
        for (; i < src.length; i++) { const ch = src[i];
          if (q) { seg += ch; if (ch === '\\') { seg += src[++i] || ''; continue; } if (ch === q) q = ''; continue; }
          if (ch === '"' || ch === "'" || ch === '`') { q = ch; seg += ch; continue; }
          if (ch === '/' && src[i + 1] === '/') break;
          if ('([{'.includes(ch)) depth++;
          if (')]}'.includes(ch)) depth--;
          if (depth === 0 && (ch === ',' || ch === ';')) { segs.push(seg); seg = ''; if (ch === ';') { end = i; break; } continue; }
          seg += ch;
        }
        if (end < 0 && seg.trim()) segs.push(seg);
        segs.forEach(sg => { const n = /^\s*([A-Za-z_$][\w$]*)\s*(=|$)/.exec(sg); if (n && into) into.add(n[1]); });
        rest = end >= 0 ? src.slice(end + 1) : '';
      }
    });
  }
  return [...names];
}
const CIK = process.env.CI ? 2 : 1;   /* §3.11：CI 系数 ×2（同 tv_perf2） */

/* ---------- PA1 期望表（§3.2；行＝[id, kind, name, tab, vox, opt, scoreEq, ord]，顺序即计划顺序） ---------- */
const f = false, t = true;
const P = (id, kind, name, tab, vox, ord, o) => [id, kind, name, tab, vox, !!(o && o.opt), !!(o && o.eq), ord];
const JT2 = [P('t0', 'tab', '吉他', [0], [], 0), P('v0', 'voice', '人声', [], [0], 1)];
/* 16 个预设（规格 §3.2 正文写「15 个」，其列举为 3＋1＋1＋11＝16，PAZ 也写 16：按 16 个逐个核对） */
const PRESET_EXP = [
  { name: '小星星（分解弹唱）', rows: JT2 },
  { name: '欢乐颂（扫弦弹唱）', rows: JT2 },
  { name: '指弹技法示例', solo: '吉他弹唱谱' },   /* 无词指弹：R4 旋律行并入唯一的吉他份 → 1 份 */
  { name: '两只老虎（双声部）', rows: [P('t0', 'tab', '吉他 · 指弹', [0], [], 0), P('t1', 'tab', '吉他 · 扫弦', [1], [], 1), P('v0', 'voice', '人声', [], [0], 2)] },
  { name: '小星星（尤克里里）', rows: [P('t0', 'tab', '尤克里里', [0], [], 0), P('v0', 'voice', '人声', [], [0], 1)] },
  { name: '流行进行（功能谱）', solo: '功能谱' },
  { name: '反复与段落示例', solo: '简谱歌谱' },
  { name: '指弹练习曲·行板（独奏谱）', solo: '吉他独奏谱' },
  { name: '欢乐颂（钢琴独奏）', solo: '钢琴独奏谱' },   /* R5 只有钢琴自己时不出 */
  { name: '卡农进行（钢琴弹唱伴奏）', solo: '钢琴弹唱谱（纯伴奏）' },
  { name: '送别（歌谱）', solo: '简谱歌谱' },
  { name: '欢乐颂（四部合唱）', rows: [   /* 4 份＋2 项可选；该示例不写 voxGroups——按「多行简谱＝一整组方括号」补推断（partsPlan 注释） */
    P('v0', 'choir', '女高音 S', [], [0], 0), P('v1', 'choir', '女低音 A', [], [1], 1), P('m0-1', 'merge', '女高音 S＋女低音 A', [], [0, 1], 1.5, { opt: t }),
    P('v2', 'choir', '男高音 T', [], [2], 2), P('v3', 'choir', '男低音 B', [], [3], 3), P('m2-3', 'merge', '男高音 T＋男低音 B', [], [2, 3], 3.5, { opt: t })] },
  { name: '小步舞曲（器乐五线谱）', solo: '五线谱旋律' },
  { name: '欢乐颂（教学对照谱）', solo: '教学对照谱' },
  { name: '和弦进行示例（纯和弦谱）', solo: '和弦谱' },
  { name: '流行副歌（功能谱·进阶）', solo: '功能谱' },
];
const PIANO3 = (first, eq, nm) => P('p', 'piano', nm || '钢琴伴奏', [], [0, 1, 2], first, { eq });
const SATB = (names, extra) => [P('v0', 'choir', names[0], [], [0], 0), P('v1', 'choir', names[1], [], [1], 1), P('m0-1', 'merge', names[0] + '＋' + names[1], [], [0, 1], 1.5, { opt: t }),
  P('v2', 'choir', names[2], [], [2], 2), P('v3', 'choir', names[3], [], [3], 3), P('m2-3', 'merge', names[2] + '＋' + names[3], [], [2, 3], 3.5, { opt: t })].concat(extra || []);
const SATBN = ['女高音', '女低音', '男高音', '男低音'];
const FIX_EXP = [
  /* §6.3 PA1 列名的构造夹具 */
  { k: 'JT带夹3品', rows: JT2 },
  { k: '双TAB_tabCapos1=3', rows: PRESET_EXP[3].rows },
  { k: 'GP主音不夹', rows: PRESET_EXP[3].rows }, { k: 'GP主音夹3', rows: PRESET_EXP[3].rows }, { k: 'GP主音不夹无和弦', rows: PRESET_EXP[3].rows },
  { k: 'JG', rows: [P('v0', 'voice', '人声', [], [0], 0), PIANO3(1, t)] },   /* 花括号行名「右手伴奏 / 左手伴奏」→ 钢琴伴奏；无 TAB → scoreEq */
  { k: 'JG空谱', rows: [P('v0', 'inst', '旋律', [], [0], 0), PIANO3(1, t)] },   /* 旋律行无词无和弦、没有 TAB → R4 各一份 inst */
  { k: 'SG', rows: [P('v0', 'voice', '人声', [], [0], 0), PIANO3(1, t)] },
  { k: 'SJG', rows: [P('v0', 'voice', '人声', [], [0], 0), PIANO3(1, t)] },
  { k: 'SATB+钢琴', rows: SATB(SATBN, [P('p', 'piano', '钢琴', [], [0, 1, 2, 3, 4, 5], 4, { eq: t })]) },
  { k: '小提琴+钢琴', rows: [P('v0', 'inst', '小提琴', [], [0], 0), PIANO3(1, t, '钢琴')] },
  { k: '二重唱', rows: [P('v0', 'choir', '旋律', [], [0], 0), P('v1', 'choir', '旋律 2', [], [1], 1)] },   /* NWB 建 J 两行写显式方括号 → choir；缺省名「旋律」重名追加「 2」 */
  { k: '二重唱无分组', rows: [P('v0', 'choir', '旋律', [], [0], 0), P('v1', 'choir', '旋律 2', [], [1], 1)] },   /* 不写分组的多行简谱同口径 */
  { k: '吉他+钢琴+人声', rows: [P('t0', 'tab', '吉他', [0], [], 0), P('v0', 'voice', '人声', [], [0], 1), P('p', 'piano', '钢琴', [], [0, 1, 2], 2)] },   /* 花括号为推断；有 TAB → 不是 scoreEq */
  { k: '无词指弹JT', solo: '吉他弹唱谱' },
  { k: '无分组SATB', rows: SATB(SATBN) },   /* 四行五线谱推断为方括号 */
  /* 命名 / 认领规则补充 */
  { k: '多TAB缺省名+贝斯', rows: [P('t0', 'tab', '吉他 1', [0], [], 0), P('t1', 'tab', '吉他 2', [1], [], 1), P('t2', 'tab', '贝斯', [2], [], 2), P('v0', 'voice', '人声', [], [0], 3)] },
  { k: 'R4并入t0', rows: [P('t0', 'tab', '吉他', [0], [1], 0), P('v0', 'voice', '人声', [], [0], 1)] },
  { k: 'R3有和弦chord', rows: JT2 },
  { k: 'R3有和弦chords', rows: JT2 },
  { k: 'R4多TAB各一份', rows: [P('t0', 'tab', '吉他 1', [0], [], 0), P('t1', 'tab', '吉他 2', [1], [], 1), P('v0', 'inst', '旋律', [], [0], 2)] },
  { k: '重名', rows: [P('t0', 'tab', '吉他', [0], [], 0), P('v0', 'voice', '人声', [], [0], 1), P('v1', 'voice', '人声 2', [], [1], 2)] },
  { k: '尤克里里多TAB', rows: [P('t0', 'tab', '尤克里里 1', [0], [], 0), P('t1', 'tab', '尤克里里 2', [1], [], 1), P('t2', 'tab', '尤克里里 · 低音', [2], [], 2), P('v0', 'voice', '人声', [], [0], 3)] },
];
const okPlan = (r, e) => !r.err && r.pure && r.keys && r.top === 'solo,kindName,parts' && typeof r.kindName === 'string' && r.kindName === r.kos &&
  (e.solo ? r.solo === true && r.rows.length === 0 && r.kindName === e.solo : r.solo === false && J(r.rows) === J(e.rows));
const showPlan = r => r.err ? r.err : (r.solo ? 'solo · ' + r.kindName : r.rows.map(x => x[0] + ':' + x[2] + (x[5] ? '(可选)' : '') + (x[6] ? '(=总谱)' : '')).join(' / ')) + (r.pure ? '' : ' ✗不纯');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= PA1 分法 ================= */
    if (want('PA1')) {
      const A = await open(b);
      const names = await EV(A.pg, () => PRESETS.map(p => p.name));
      T(!names.err && names.length === PRESET_EXP.length && names.every((n, i) => n === PRESET_EXP[i].name), 'PA1a 预设清单与期望表一一对应（' + PRESET_EXP.length + ' 个，按 PRESETS 下标）', J(names));
      const plans = await EV(A.pg, () => PRESETS.map(p => { try { return __plan(migrate(p.make())); } catch (e) { return { err: String(e.message || e) }; } }));
      PRESET_EXP.forEach((e, i) => { const r = plans.err ? plans : plans[i];
        T(okPlan(r, e), 'PA1b 预设#' + i + '《' + e.name + '》' + (e.solo ? '：单演奏者（' + e.solo + '）' : '：' + e.rows.length + ' 项'), showPlan(r) + (okPlan(r, e) ? '' : ' 实得 ' + J(r))); });
      for (const e of FIX_EXP) {
        const r = await EV(A.pg, k => __plan(__fx(k)), e.k);
        T(okPlan(r, e), 'PA1c 夹具「' + e.k + '」' + (e.solo ? '：单演奏者（' + e.solo + '）' : '：' + e.rows.length + ' 项'), showPlan(r) + (okPlan(r, e) ? '' : ' 实得 ' + J(r)));
      }
      /* 编辑器里载入后的 song（loadSong 路径）与离线 migrate 的计划相同；对全局 song 计划不写谱、不进撤销栈 */
      { const r = await EV(A.pg, () => { const out = [];
          [0, 3, 4, 11].forEach(i => { __ld(PRESETS[i].make()); const j0 = JSON.stringify(song), u0 = undoStack.length, r0 = redoStack.length;
            const a = JSON.stringify(partsPlan(song)), bb = JSON.stringify(partsPlan(migrate(PRESETS[i].make())));
            out.push({ i, same: a === bb, json: JSON.stringify(song) === j0, undo: undoStack.length === u0 && redoStack.length === r0 }); });
          return out; });
        T(!r.err && r.every(x => x.same && x.json && x.undo), 'PA1d 载入编辑器后的 song 与离线 migrate 计划相同；计划前后 song JSON、撤销 / 重做栈不变', J(r)); }
      /* 不认参数里没有的东西：空对象 / 缺字段不抛错，按单演奏者返回 */
      { const r = await EV(A.pg, () => [partsPlan({}), partsPlan(null), partsPlan({ tabVoices: ['吉他1'], measures: [] })].map(x => ({ solo: x.solo, n: x.parts.length, k: typeof x.kindName })));
        T(!r.err && r.every(x => x.solo === true && x.n === 0 && x.k === 'string'), 'PA1e 残缺输入（{} / null / 无小节）不抛错，按单演奏者返回', J(r)); }
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= PA2–PA12 / PAZ（A 轨实现；见文件头与规格 §6.3–§6.6） ================= */
    /* ================= PA2 派生与红线 ================= */
    if (want('PA2')) {
      const A = await open(b);
      const CASES = [{ p: 0 }, { p: 1 }, { p: 3 }, { p: 4 }, { p: 11 }, { f: 'JT带夹3品' }, { f: '双TAB_tabCapos1=3' }, { f: 'GP主音不夹' }, { f: 'GP主音夹3' }, { f: 'GP主音不夹', keyTo: [2, 'G'] }, { f: 'JG' }, { f: 'JGacc' }, { f: 'SATB+钢琴' }, { f: '小提琴+钢琴' },
        { f: '吉他+钢琴+人声' }, { f: '多TAB缺省名+贝斯' }, { f: 'R4并入t0' }, { f: '多TAB联排' }, { f: '老谱全亮联排' }, { f: '无分组SATB' }, { m: {} }, { m: { capo: 2 } },
        { m: { jp: false, pgno: { on: false, pos: 'to', start: 3, first: true } } }, { m: { pgno: { on: true, pos: 'bo', start: 2, first: true } } }];
      const nm = c => c.p != null ? '预设#' + c.p : c.f ? c.f : '记号' + J(c.m);
      const bad = []; let nP = 0, nR = 0, nPS = 0; const redBad = [];
      for (const c of CASES) { const r = await EV(A.pg, c => __pa2(c), c);
        if (r.err) { bad.push(nm(c) + ' ' + r.err); continue; } nP += r.n; nR += r.nR; nPS += r.nPS;
        if (r.nIss) bad.push(nm(c) + '［' + r.iss.join('；') + '］'); if (r.red.length) redBad.push(nm(c) + ':' + r.red.join(',')); }
      T(!bad.length && nP >= 50, 'PA2a 派生副本自洽（' + CASES.length + ' 份谱、' + nP + ' 份分谱 × 沿用 / 不沿用换行＝' + nPS + ' 个副本）：行与轨名对得上、每小节 voxes / tabs 长度、音符内容（除 chord / chords）逐列相同、' +
        'voxNotations / voxDual 不越界且随行、合并份显式方括号 [0,1]、单行份无 voxGroups、非钢琴份删 pianoAcc、混音键在范围内且随轨、tabJpVoices 长度＝TAB 数、小节级元数据逐小节相等、' +
        'pgbrk / wf 全剥、brk / pull 按开关、pgno 缺省 {bc, 首页不印} / 谱上写了照用、lyricLines / barNums / 调与夹位按规则、carry 计数＝被删行事件数、无新增字段',
        bad.slice(0, 4).join(' || ') || 'ok');
      T(!redBad.length && nR >= 20, 'PA2b §2.3 红线：派生（' + nPS + ' 次）与离屏排各份（' + nR + ' 份 × 2）前后 song JSON、全部窗口的谱、撤销 / 重做栈、排队落盘、全部 musetab-* 键值、#score 逐字节相同', redBad.slice(0, 4).join(' | ') || 'ok');
      const jp = await EV(A.pg, () => __jpEq());
      T(!jp.err && jp.length === 24 && jp.every(x => x === 1), 'PA2c tabJpSpliceS(s, vi) 与「借用全局跑 tabJpRemoveTrack(vi)」逐字节相同（8 种 tabJp / tabJpVoices 形态 × 3 条轨，含老谱全亮、全关、残余、非布尔值）', jp.err || (jp.filter(x => x !== 1).slice(0, 3).join(' | ') || '24/24'));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA3 调与夹位 ================= */
    if (want('PA3')) {
      const A = await open(b);
      const r = await EV(A.pg, () => __pa3());
      T(!r.err && r.a.d && !r.a.cap && r.a.srcD && r.a.srcCap, 'PA3a C 调夹 2 品拆出的人声份：页头「1=D」（实际调）、没有「变调夹」（总谱照旧「1=D · 变调夹 2 品」）', J(r.err || r.a));
      T(!r.err && r.b.length === 4 && r.b.every(x => x.same && x.n > 20 && x.capo === 0) && r.b[0].refOct === 1,
        'PA3b F / G / A / B 调夹 2 品（第 7 小节转 F）：exportMIDI(人声份副本) 与 exportMIDI(总谱) 的人声发声逐音相同（覆盖八度折叠 refOct）', J(r.err || r.b.map(x => [x.K + '→' + x.key, 'refOct ' + x.srcRef + '→' + x.refOct, x.n + ' 音', x.same ? '同' : '异@' + x.d1])));
      T(!r.err && r.b.every(x => x.ch && x.nCh >= 10 && x.keyTo === 'G'), 'PA3c 和弦名（含从吉他行搬来的）逐拍平移 2 个半音、转调 keyTo F→G 同步平移',
        J(r.err || r.b.map(x => [x.K, x.nCh + ' 个和弦', x.ch ? '平移对' : '平移错', 'keyTo ' + x.keyTo])));   /* F 调时第 7 小节转 F 等于没转，同样平移成 G */
      T(!r.err && r.c.length === 2 && r.c.every(x => x.capo === x.want && !x.tabCapos && x.same && x.n > 4) && r.c[1].capo === 3,
        'PA3d 双吉他第 2 条（tabCapos[1]=3）单出：capo===3、不留 tabCapos，各品位发声逐音相同（第 1 条同样）', J(r.err || r.c));
      { const e = r.err ? [] : r.e, bad = e.filter(x => x.part !== x.score), g = e.filter(x => x.f === 'GP主音不夹' && x.id === 't1')[0], g3 = e.filter(x => x.f === 'GP主音夹3' && x.id === 't1')[0], gn = e.filter(x => x.f === 'GP主音不夹无和弦' && x.id === 't1')[0];
        T(!r.err && e.length >= 20 && !bad.length, 'PA3e 每一份分谱页头的实际调「1=X」＝总谱页头的实际调（' + e.length + ' 份：带夹弹唱、双吉他另夹品、GP「伴奏夹、主音不夹」及其反向、中途转调、钢琴＋吉他＋人声、四部合唱）', J(r.err || bad.slice(0, 4)));
        T(!!g && g.part === '1=E' && g.cap === '' && g.capo === 0 && g.ch === 'E,A,B' && !!g3 && g3.part === '1=C' && /变调夹 3 品（按 1=A 指法）/.test(g3.cap) && g3.ch === 'A,D,E' && !!gn && gn.part === '1=E' && gn.ch === 'E,A,B',
          'PA3f 本轨夹位≠参考轨的吉他份（F1）：「伴奏夹 4、主音不夹」的主音份页头 1=E、无变调夹、和弦名 E,A,B（本轨实际弹的）；主音轨自己不写和弦时，从参考轨搬来的 C,F,G 换算成 E,A,B；「参考轨不夹、第 2 条夹 3」的第 2 条份页头 1=C · 变调夹 3 品（按 1=A 指法）、和弦名 A,D,E', J(r.err || [g, gn, g3])); }
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA4 和弦重现 ================= */
    if (want('PA4')) {
      const A = await open(b);
      const CASES = [{ p: 0 }, { p: 1 }, { p: 3 }, { p: 4 }, { m: {} }, { m: { capo: 2 } }, { f: '双TAB_tabCapos1=3' }, { f: 'GP主音不夹' }, { f: 'GP主音夹3' }, { f: 'GP主音不夹无和弦' }, { f: '多TAB联排' }, { f: 'R4并入t0' }, { f: '多TAB缺省名+贝斯' }, { f: 'JT带夹3品' }, { carry: 'T' }, { staffX: 1 }];
      const rows = []; let n = 0, ex = 0, nDk = 0;
      for (const c of CASES) { const r = await EV(A.pg, c => __pa4inv(c), c); if (r.err) { rows.push(J(c) + ' ' + r.err); continue; }
        r.forEach(x => { n += x.n; ex += x.ex; if (x.dk) nDk += x.n; if (x.nb) rows.push(J(c) + ' ' + x.id + '：' + x.bad.join('，')); }); }
      T(!rows.length && n > 300 && nDk > 40, 'PA4a TAB 份每一列的生效和弦（tabColChords，按所在行的指法框换算）与简谱联排列（jpColOf，逐字段）在 renderOffscreen 的 prep 借用里取，与源谱对应轨逐列相同（' + CASES.length + ' 份谱、' + n + ' 列，其中本轨另夹品 ' + nDk + ' 列；排除同拍冲突列 ' + ex + ' 列）',
        rows.slice(0, 4).join(' | ') || 'ok');
      const f3 = await EV(A.pg, () => __pa4f());
      T(!f3.err && f3.n >= 30 && f3.pts > 1200 && f3.bad === 0 && f3.sum.exact + f3.sum.moved + f3.sum.dropped === f3.cnt,
        'PA4f 旋律行和弦重现不越位（F3）：' + (f3.n || 0) + ' 份随机节奏人声份（4/4、6/8、弱起；附点 / 八分 / 十六分 / 全音符 × 吉他八分格随机和弦）的每个落点（列起拍＋列内整四分拍，共 ' + (f3.pts || 0) + ' 处）生效和弦＝总谱同拍；carry 计数＝被删行事件数',
        J(f3.err || { bad: f3.bad, ex: f3.ex, sum: f3.sum, cnt: f3.cnt }));
      T(!f3.err && J(f3.min.tl) === J(['0:C 2:Am', '']) && J(f3.min.carry) === J({ exact: 2, moved: 0, dropped: 1 }),
        'PA4g 最小复现（全音符旋律，吉他 C@0、G@1.5、Am@2，下一小节拍 0 无和弦）：人声份时间线「0:C 2:Am」，G 与 Am 同落拍 2、后到的覆盖、G 记 dropped（出 ⚠）——此前 G 被挪到下一小节起拍、越过 Am',
        J(f3.err || f3.min));
      const k = await EV(A.pg, () => { const o = {};
        __ld(__mkc({ carry: 'T' })); { const p = partsPlan(song).parts.find(x => x.id === 't0'), d = partSong(p, { brk: false }), M = d.song.measures;
          o.T = { carry: d.carry, at: [M[0].tabs[0][1].chord, M[1].tabs[0][0].chord, M[2].tabs[0][0].chord, M[3].tabs[0][0].chord, M[0].tabs[0][0].chord] }; }
        __ld(__mkc({ carry: 'V' })); { const p = partsPlan(song).parts.find(x => x.id === 'v0'), d = partSong(p, { brk: false }), M = d.song.measures;
          o.V = { carry: d.carry, at: [M[0].voxes[0][0].chord, JSON.stringify(M[0].voxes[0][0].chords), M[0].voxes[0][1].chord, JSON.stringify(M[1].voxes[0][1].chords), M[2].voxes[0][0].chord] }; }
        return o; });
      T(!k.err && J(k.T.carry) === J({ exact: 1, moved: 2, dropped: 1 }) && J(k.T.at) === J(['F', 'G', 'C', 'D', '']),
        'PA4b 落在 TAB 行：和弦不在列起拍 → 挪到下一列（moved）、本小节末列之后 → 下一小节第 0 列（moved）、下一小节首列已有和弦 → 丢（dropped）、恰在列起拍（exact）：{exact:1, moved:2, dropped:1}', J(k.err || k.T));
      T(!k.err && J(k.V.carry) === J({ exact: 3, moved: 1, dropped: 1 }) && J(k.V.at) === J(['C', '[{"q":1,"chord":"F"}]', 'G', '[{"q":1,"chord":"Am"}]', 'D']),
        'PA4c 落在旋律行：恰在列起拍（exact）、列内整四分拍 → chords[{q}]（exact ×2）、q 非整数 → 下一列起拍（moved）、落点自带不同和弦 → 丢（dropped）：{exact:3, moved:1, dropped:1}', J(k.err || k.V));
      const z = await EV(A.pg, () => { const out = []; PRESETS.forEach((pr, i) => { __ld(migrate(pr.make())); partsPlan(song).parts.forEach(p => { const d = partSong(p, { brk: false }); out.push([i, p.id, d.carry.dropped, d.carry.exact + d.carry.moved]); }); }); return out; });
      T(!z.err && z.length >= 13 && z.every(x => x[2] === 0) && z.some(x => x[3] > 0), 'PA4d 全部 16 个预设的每一份分谱 dropped===0（' + (z.length || 0) + ' 份；有搬过来的和弦 ' + (z.err ? 0 : z.filter(x => x[3] > 0).length) + ' 份）', J(z.err || z.filter(x => x[2])));
      const ks = await EV(A.pg, () => { __ld(__mkc({ staffX: 1 })); const P = partsPlan(song), p = P.parts.find(x => x.id === 't0'), d = partSong(p, { brk: false });
        const src = __tabTx(__off(__cl(song)).tg.innerHTML), on = __tabTx(partRender(p, { paperW: LAST_PAPER_W }).html), off = __tabTx(__off(d.song, { part: { name: p.name, run: true, keepSolo: false } }).tg.innerHTML);
        return { keep: d.keepSolo, nX: src.filter(x => x === '×').length, n: src.length, same: JSON.stringify(src) === JSON.stringify(on), offX: off.filter(x => x === '×').length, offSame: JSON.stringify(src) === JSON.stringify(off) }; });
      T(!ks.err && ks.keep && ks.same && ks.n > 20 && !ks.offSame && ks.offX > ks.nX,
        'PA4e 开了联排五线谱的弹唱谱（tabStaff＋人声）拆出吉他份：keepSolo 为真，TAB 上 × 的解析 / 品位与总谱逐个相同（不带 keepSolo 时 × 原样显示 ' + (ks.offX || 0) + ' 个，与总谱不同——断言有效）', J(ks));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA5 恒等对拍 ================= */
    if (want('PA5')) {
      const A = await open(b);
      const CASES = [{ p: 0, rep: 4, fixed: true }, { p: 0, rep: 4 }, { p: 3, rep: 6, size: 'A4L' }, { p: 0, rep: 4, size: 'fit' }, { p: 11, rep: 3, size: 'A4L', fixed: true },
        { p: 0, rep: 4, pgno: { on: true, pos: 'bc', start: 1, first: true } }, { p: 0, rep: 4, fixed: true, pgno: { on: true, pos: 'bo', start: 2, first: true } },
        { p: 3, rep: 8, pgno: { on: true, pos: 'to', start: 4, first: false } }, { p: 0, rep: 4, pgbrk: [5, 22], pgno: { on: true, pos: 'to', start: 1, first: true } },
        { f: 'SATB+钢琴', rep: 6 }, { m: {} }, { p: 0, rep: 14 }, { f: '高行20' }];
      const bad = []; const info = []; let nfN = 0;
      for (const c of CASES) { const r = await EV(A.pg, c => __pa5(c), c);
        if (r.err || !r.same || !r.geo) bad.push(J(c) + ' ' + (r.err || ((r.same ? '' : '内容异@' + r.at + ' ' + J(r.ctx)) + (r.geo ? '' : ' 几何异')))); else { info.push(r.n + '页' + (r.wide ? '宽' : '') + (r.nf ? 'nf' + J(r.nf) : '') + '/' + r.pw); if (r.nf) nfN++; } }
      T(!bad.length && nfN >= 1, 'PA5 打印口径（真实 beforeprint：PRINTING_NOW＋分页，render 后取 LAST_PAPER_W）离屏排「全部行、不剥版面、不带 part 选项」的副本：摘 EXPORT_DROP_SEL 后 innerHTML ≡ scoreExportClone().innerHTML、geo ≡ PV_GEO（含 nf）——' +
        CASES.length + ' 份：固定 / 非固定版宽、A4L、fit、pgno bc / bo / to、手动换页、SATB＋钢琴、记号夹具、210 小节长谱、20 行比一页还高（nf）', bad.slice(0, 2).join(' || ') || info.join(' '));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA6 页头几何 ================= */
    if (want('PA6')) {
      const A = await open(b);
      const nm12 = '甲乙丙丁戊己庚辛壬癸子丑', nm40 = '一二三四五六七八九十'.repeat(4), nm45 = nm40 + '天地玄黄宇';
      const t40 = '春风又绿江南岸明月何时照我还'.repeat(3).slice(0, 40);
      const R = {};
      R.a = await EV(A.pg, () => __pa6({ p: 0 }));
      R.b = await EV(A.pg, a => __pa6({ p: 0, title: a[0], vname: a[1] }), [t40, nm12]);
      R.c = await EV(A.pg, a => __pa6({ p: 0, title: a[0], vname: a[1] }), [t40, nm40]);
      R.d = await EV(A.pg, a => __pa6({ p: 0, vname: a }), nm45);
      R.e = await EV(A.pg, () => __pa6({ p: 0, pgno: { on: true, pos: 'to', start: 2, first: true } }));
      R.f = await EV(A.pg, () => __pa6({ p: 0, pgno: { on: true, pos: 'to', start: 1, first: true } }));
      const okA = r => !r.err && r.nPP === 1 && !r.hits.length && r.nHdr >= 3 && r.y === r.wantY && r.fs === '14' && r.fw === '700' && r.w <= r.cap + 0.5;
      T(okA(R.a) && R.a.name === '人声' && R.a.x === 56 && R.a.an === 'start' && R.a.y === 33,
        'PA6a .pgpart 分谱名：第 1 页左上角（x＝页边距 56、start 对齐）、14 号粗体、基线＝v68.5 首页顶部页码那条线 max(12, min(PN_T, topMargin−9))＝' + (R.a.wantY || '?') + '；与曲名、演唱、左信息块、署名、页码的包围盒交集为 0（' + (R.a.nHdr || 0) + ' 个页头文字）', J(R.a.err || { name: R.a.name, x: R.a.x, y: R.a.y, an: R.a.an, w: R.a.w, hits: R.a.hits }));
      T(okA(R.b) && R.b.name === nm12 && okA(R.c) && /…$/.test(R.c.name) && R.c.name.length < 40 && R.c.w <= R.c.cap + 0.5 && okA(R.d) && /^一二三/.test(R.d.name) && /…$/.test(R.d.name),
        'PA6b 40 字长曲名（折行）× 12 字分谱名：照原样、不相交；40 字分谱名：超过版心 40%（' + Math.round(R.c.cap || 0) + 'px）按实测宽截断加「…」；45 字名先截到 40 字再截断',
        J([R.b.err || [R.b.name, Math.round(R.b.w), R.b.hits], R.c.err || [R.c.name, Math.round(R.c.w), R.c.hits], R.d.err || [R.d.name.length, Math.round(R.d.w)]]));
      T(okA(R.e) && R.e.an === 'end' && R.e.x === R.e.W - 56 && R.e.fol0.length === 1 && R.e.fol0[0].t === '2' && R.e.fol0[0].x2 < 300 && okA(R.f) && R.f.an === 'start' && R.f.fol0.length === 1 && R.f.fol0[0].x > R.f.W / 2,
        'PA6c 顶部外侧页码、首页印、起始页码双数（首页页码在左）：分谱名挪到右上角（x＝W−56、end 对齐）；起始单数时页码在右、分谱名在左；都不相交', J([R.e.err || [R.e.x, R.e.an, R.e.fol0, R.e.hits], R.f.err || [R.f.x, R.f.an, R.f.fol0, R.f.hits]]));
      const RUN = [];
      for (const pg of [null, { on: true, pos: 'bo', start: 1, first: true }, { on: true, pos: 'bo', start: 2, first: false }, { on: true, pos: 'to', start: 1, first: false }, { on: true, pos: 'to', start: 2, first: true }])
        RUN.push(await EV(A.pg, pg => __pa6(Object.assign({ p: 0, rep: 8 }, pg ? { pgno: pg } : {})), pg));
      T(RUN.every(r => !r.err && r.n >= 2 && r.perPg[0] === 0 && r.perPg.slice(1).every(k => k === 1) && !r.runBad.length && r.runT === '人声 · 《' + r.title + '》' && r.runFs === '10.5'),
        'PA6d .pgrun 续页眉「人声 · 《曲名》」10.5 号：第 2 页起每页恰好 1 个、第 1 页没有；与页码不相交；bc 底边带靠左、bo / to 靠内侧（单数页左、双数页右）、不出版心；与本页墨迹净距 ≥2mm（to：首行行顶 −7；bc / bo：末行行底）——缺省 bc 与 bo / to × 起始单双 共 5 种',
        J(RUN.map(r => r.err || [r.pn.pos + r.pn.start, r.n + '页', r.perPg.join(''), r.runBad.slice(0, 2)])));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA7 分页与切片 ================= */
    if (want('PA7')) {
      const A = await open(b);
      const r = await EV(A.pg, () => __pa7({ p: 3, rep: 10, pgno: { on: true, pos: 'bo', start: 3, first: false } }, ['score', 't0', 't1', 'v0']));
      T(!r.err && r.ns.length === 4 && r.nPP === r.sum && r.okSeq && r.uniq && r.drop === 0 && r.last && r.printing && r.geoOk && r.defs.join() === 'pp-src-0,pp-src-1,pp-src-2,pp-src-3',
        'PA7a 批量切片（总谱＋3 份）：pgH＝round(W·1.414)、gap＝26、vb.h＝n·pgH＋(n−1)·gap＋6、页数＝行所在页最大值＋1；.pp 总数＝各份页数之和（' + (r.sum || '?') + '）；viewBox y＝i·(pgH＋gap) 逐页、use 指向本份 #pp-src-k；' +
        'pp-src-k 唯一且是盒内唯一的 id；无 .pagebg / .pageno / .pgbrk-mk / 播放头；末元素是页（.pp:last-child 不分页）；body.printing', J(r.err || { ns: r.ns, nPP: r.nPP, okSeq: r.okSeq, uniq: r.uniq, drop: r.drop, geoOk: r.geoOk }));
      const folOk = r.err ? false : r.fol.every((f, k) => { const n = +r.ns[k].split(':')[1], first = k === 0 ? false : false; return f.length === n - 1 && f.every(([pg, v]) => v === 3 + pg && pg >= 1); });
      T(folOk && r.cross.every(x => x === 0), 'PA7b 每份页码各自从 start（3）起计、first:false 首页不印（第 2 页印 4）；谱行不跨页（除比一页还高的行）', J(r.err || { fol: r.fol.map(f => f.map(x => x.join('→')).join(' ')), cross: r.cross }));
      T(!r.err && r.after.job === null && !r.after.box && !r.after.printing, 'PA7c afterprint：PART_JOB 清空、#print-pages 移除、body.printing 摘掉', J(r.err || r.after));
      const q = await EV(A.pg, () => { __ld(__mkc({ p: 0, pgbrk: [4] })); const n0 = withCleanSnap(() => PV_GEO.n, { paging: true });
        const P = partsPlan(song); return { score: n0, parts: P.parts.map(p => p.id + ':' + partRender(p, { paperW: LAST_PAPER_W }).geo.n), mk: P.parts.map(p => partRender(p, { paperW: LAST_PAPER_W }).html.includes('pgbrk-mk')) }; });
      T(!q.err && q.score === 2 && q.parts.every(x => /:1$/.test(x)) && q.mk.every(x => !x), 'PA7d 总谱第 5 小节「本行换页」（总谱 2 页）：分谱一律不沿用，自动分页各 1 页；分谱里没有换页标记', J(q));
      /* 真打成 PDF（Chromium 打印管线触发 beforeprint / afterprint）：一个 PDF、页数＝各份页数之和 */
      { const n = await EV(A.pg, () => { __ld(__mkc({ p: 3, rep: 10 })); const P = partsPlan(song); let k = 0; ['t0', 't1', 'v0'].forEach(id => { k += partRender(P.parts.find(p => p.id === id), { paperW: LAST_PAPER_W }).geo.n; });
          PART_JOB = { ids: ['score', 't0', 't1', 'v0'], brk: false, t: Date.now() }; return k + PV_GEO.n; });
        const buf = await A.pg.pdf({ format: 'A4', preferCSSPageSize: true }).catch(() => null);
        const after = await EV(A.pg, () => ({ job: PART_JOB, box: !!document.getElementById('print-pages') }));
        if (SHOTS && buf) fs.writeFileSync(path.join(SHOTS, 'PA7-batch.pdf'), buf);
        T(n > 4 && pdfPages(buf) === n && after.job === null && !after.box, 'PA7e 真实打印管线（page.pdf）：总谱＋3 份一次成一个 PDF，页数＝各份页数之和（' + n + '）；打完任务清空', J({ n, pdf: pdfPages(buf), after })); }
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA8 记号、小节号、歌词 ================= */
    if (want('PA8')) {
      const A = await open(b);
      const r = await EV(A.pg, () => { const out = [];
        for (const o of [{}, { jp: false }, { capo: 2 }]) { __ld(__marksFx(o)); const sc = withCleanSnap(() => __marksCnt(scoreExportClone().innerHTML), { paging: true }), nKey = song.measures.filter(m => m.keyTo).length;
          partsPlan(song).parts.forEach(p => { const rr = partRender(p, { paperW: LAST_PAPER_W }), c = __marksCnt(rr.html), d = partSong(p, { brk: false }).song;
            const jian = d.voxVoices.some((_, i) => !isStaffNota((d.voxNotations || [])[i])) || !!d.tabJp || (d.voxDual || []).some(Boolean) || (!d.voxVoices.length && !d.tabStaff);
            const sh = Object.assign({}, c), ss = Object.assign({}, sc); delete sh.key; delete ss.key;
            out.push({ o: JSON.stringify(o), id: p.id, same: JSON.stringify(sh) === JSON.stringify(ss), c, sc, key: jian ? c.key === nKey : null, nKey }); }); }
        return out; });
      T(!r.err && r.length === 9 && r.every(x => x.same && x.c.lab === 2 && x.c.v1 >= 1 && x.c.segno === 1 && x.c.coda === 1 && x.c.dc === 1),
        'PA8a 排练号框 / D.C. / Fine / 房子 1. 2. / 𝄋 / ⊕ 在每一份里的数量与总谱一致（记号夹具 × 联排开 / 关 / 带夹 2 品，共 9 份）', J(r.err || r.filter(x => !x.same).slice(0, 2).map(x => [x.o, x.id, x.c, x.sc])));
      T(!r.err && r.every(x => x.key === null || x.key === true) && r.some(x => x.id === 't0' && x.key === true),
        'PA8b 每个 keyTo 都看得到：有简谱行 / 联排行 / 只剩 TAB 的份写「转1=X」（只剩 TAB 的份副本记成标注式），数量＝转调小节数', J(r.err || r.map(x => x.o.slice(0, 12) + x.id + ':' + x.c.key + '/' + x.nKey)));
      const s2 = await EV(A.pg, () => { __ld(__mkc({ p: 11, rep: 3 })); const P = partsPlan(song);
        const bn = P.parts.filter(p => p.kind === 'choir' || p.kind === 'merge').map(p => { const rr = partRender(p, { paperW: LAST_PAPER_W }); return [p.id, (rr.html.match(/class="jbarno"/g) || []).length, rr.sysGeo.length]; });
        __ld(__mkc({ f: 'R4多TAB各一份', rep: 3 })); const pi = partsPlan(song).parts.find(p => p.kind === 'inst'), ri = partRender(pi, { paperW: LAST_PAPER_W }), d0 = partSong(pi, { brk: false });
        d0.song.lyricLines = 0; const o0 = __off(d0.song, { paperW: LAST_PAPER_W, part: { name: pi.name, run: true, keepSolo: false } }).out;
        const h1 = ri.sysGeo.map(x => +(x.y1 - x.y0).toFixed(2)), h0 = o0.sysGeo.map(x => +(x.y1 - x.y0).toFixed(2));
        const s0 = __mkc({ p: 0 }); s0.lyricLines = 2; s0.measures.forEach((m, mi) => (m.voxes[0] || []).forEach((c, ci) => { if (c.lyrics && c.lyrics[0]) c.lyrics[1] = '秋冬夏'[(mi + ci) % 3]; })); __ld(s0);
        const L = new Set(); song.measures.forEach(m => (m.voxes[0] || []).forEach(c => (c.lyrics || []).forEach(w => [...String(w || '')].forEach(ch => L.add(ch)))));
        const pv = partsPlan(song).parts.find(p => p.id === 'v0'), rv = partRender(pv, { paperW: LAST_PAPER_W }), scH = withCleanSnap(() => scoreExportClone().innerHTML, { paging: true });
        return { bn, h1, h0, lyr: [__txtCnt(scH, L), __txtCnt(rv.html, L)], nL: L.size, ll: d0.song.lyricLines }; });
      T(!s2.err && s2.bn.length === 6 && s2.bn.every(x => x[1] === x[2] - 1 && x[2] >= 2), 'PA8c 简谱份（没有 TAB、谱上没设小节号）行首印小节号：.jbarno 数＝行数 −1（四部合唱 ×3 的 4 份＋2 项合并份）', J(s2.err || s2.bn));
      T(!s2.err && s2.h1.length >= 2 && JSON.stringify(s2.h1) === JSON.stringify(s2.h0), 'PA8d 无词份（双吉他谱里无词无和弦的旋律行单出）每行行高＝同一副本显式 lyricLines＝0 时的行高（不留空歌词位）', J(s2.err || { h1: s2.h1.slice(0, 4), h0: s2.h0.slice(0, 4) }));
      const fn = await EV(A.pg, () => __pa8fn());
      T(!fn.err && fn.length === 8 && fn.every(x => x.fn === true && x.srcFn == null && x.n >= 3 && x.same && x.names && x.score),
        'PA8f 弹唱谱（小星星分解 / 欢乐颂扫弦 / 两只老虎 / 尤克里里 × 不夹 / 夹 3 品）拆出的人声份：旋律行和弦框印音名（总谱 TAB 行上印的就是音名），框里的字＝副本和弦名（夹 3 品时为实音 E♭ B♭7 …）；只在副本置 funcNames，总谱 #score 不变（F2）',
        J(fn.err || fn.map(x => [x.i + (x.capo ? '夹' + x.capo : ''), x.first, x.same ? '同' : '异', x.names ? '音名' : '级数'])));
      const mk = await EV(A.pg, () => __pa8mk());
      const okJT = !mk.err && (() => { const P = Object.fromEntries(mk.jt.parts.map(x => [x.id, x.c])), t = P.t0, v = P.v0;
        const vh = mk.jt.parts.find(x => x.id === 'v0');
        return !!t && !!v && t['前奏'] === 1 && t['原速'] === 1 && t['渐慢'] === 1 && t['rit.'] === 1 && t['扫弦'] === 1 && t['自由地'] === 0 && t.ferm === 1 &&
          v['前奏'] === 1 && v['原速'] === 1 && v['渐慢'] === 1 && v['rit.'] === 1 && v['扫弦'] === 0 && v['自由地'] === 1 && v.ferm === 1 && vh.nBox >= 10 && vh.hit === 0; })();
      T(!mk.err && mk.choir.length === 6 && mk.choir.every(x => /"渐慢":1,"ferm":[1-9]/.test(x)) && okJT,
        'PA8g 速度 / 段落记号与延长号随每一份（F4）：四部合唱女高音第 3 小节「渐慢」＋末音延长号——4 份＋2 项合并份各 1 个「渐慢」、都有延长号；弹唱谱 TAB 上「前奏」「原速」、旋律行「渐慢」「rit.」、旋律末音延长号——吉他份与人声份都齐（rit. 在 TAB 行写成标注）；' +
        '本乐器的「扫弦」不搬；落点已有标注（吉他第 7 小节「扫弦」）时不覆盖，人声份那里照样有「自由地」；人声份里与搬来的和弦同列的标注挪到和弦框之上、包围盒不相交', J(mk.err || { choir: mk.choir, jt: mk.jt && mk.jt.parts.map(x => [x.id, x.c, x.marks, x.hit, x.nBox]) }));
      T(!s2.err && s2.nL >= 8 && s2.lyr[0] === s2.lyr[1], 'PA8e 有词份（小星星两段词）各段歌词逐字出现次数与总谱相同（' + (s2.nL || 0) + ' 个字）', J(s2.err || s2.lyr.map(x => x.slice(0, 120))));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA9 打印任务（两套外壳） ================= */
    if (want('PA9')) for (const shell of ['flow', 'classic']) {
      const A = await open(b, { shell });
      const r = await EV(A.pg, sh => __pa9(sh), shell);
      if (r.err) { T(false, 'PA9 [' + shell + '] 套件', r.err); allErrs.push(...A.errs); await A.close(); continue; }
      const tt = r.title, bt = r.batch[0] || {};
      T(r.batch.length === 1 && bt.nPP === r.n.t0 + r.n.v0 && bt.defs === 'pp-src-0,pp-src-1' && bt.title === tt + '-分谱' && bt.after.title === r.T0 && bt.after.job === null && !bt.after.box && r.jobSet === '["t0","v0"]',
        'PA9a [' + shell + '] 「分谱」任务（吉他 · 指弹＋人声）：一次打印、一个切片盒（' + (bt.nPP || 0) + ' 页＝各份页数之和、两份 defs）；打印期间 document.title＝「曲名-分谱」、afterprint 还原、PART_JOB===null',
        J({ nPP: bt.nPP, n: r.n, defs: bt.defs, title: bt.title, after: bt.after }));
      T(r.ctrlP.h === r.ref.h && r.ctrlP.title === r.T0 && r.stale.h === r.ref.h && r.stale.after.job === null && r.single && r.single.title === tt + '-人声' && r.single.nPP === r.n.v0,
        'PA9b [' + shell + '] 紧接着 Ctrl+P：#print-pages 与纯总谱运行逐字节相同、标题不变；超过 5 秒的任务被忽略（打总谱、afterprint 清掉）；单份任务标题「曲名-人声」', J({ ctrlP: r.ctrlP.h === r.ref.h, stale: r.stale.h === r.ref.h, single: r.single && r.single.title }));
      T(r.inj.h === r.ref.h && r.inj.off === null && r.inj.after.job === null && r.inj.title === r.T0 && r.injErr >= 1 && r.final.off === null,
        'PA9c [' + shell + '] 给离屏分谱渲染注入抛错：回落总谱切片（逐字节同纯总谱）、RENDER_OFF===null、标题不改、PART_JOB 照样清掉、记一条「分谱打印失败，回落总谱」', J({ same: r.inj.h === r.ref.h, off: r.inj.off, err: r.injErr }));
      T(r.def && r.def.defs.split(',').length === 3 && r.solo.printed === false && /只有一位演奏者/.test(r.solo.toast) && r.none.printed === false && /先勾选分谱/.test(r.none.toast),
        'PA9d [' + shell + '] ids 缺省取全部非可选份（' + (shell === 'classic' ? '旧外壳' : '新外壳没有勾选接口时同口径') + '：3 份）；单演奏者谱 / 一份都没勾：不打印，toast 给出原因', J({ def: r.def && r.def.defs, solo: r.solo, none: r.none }));
      if (shell === 'classic') T(r.classic && r.classic.flow === false && r.classic.now === null && r.classic.pr.h === r.ref.h, 'PA9e [classic] 旧外壳 Ctrl+P 一律打总谱（即使 FLOW.out 上留着分谱视图，partJobNow()===null，切片逐字节同纯总谱）', J(r.classic && { now: r.classic.now, same: r.classic.pr.h === r.ref.h }));
      else T(r.view && /"ids":\["v0"\]/.test(r.view.now) && /"view":true/.test(r.view.now) && r.view.pr.nPP === r.n.v0 && r.view.pr.title === tt + '-人声' && r.view.pr.after.title === r.T0 && r.write.now === null && r.write.pr.h === r.ref.h,
        'PA9e [flow] 输出模式看着人声份按 Ctrl+P：partJobNow()＝{ids:[v0], view:true}，打这一份（标题「曲名-人声」，打完还原）；回到书写再 Ctrl+P 打总谱（逐字节同纯总谱）', J(r.view && { now: r.view.now, nPP: r.view.pr.nPP, title: r.view.pr.title, write: r.write.now, same: r.write.pr.h === r.ref.h }));
      T(!r.red.length && r.final.job === null, 'PA9f [' + shell + '] §2.3 红线：整套打印操作前后 song JSON、撤销 / 重做栈、排队落盘、musetab-* 键值、#score 逐字节相同', J(r.red));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA10 PNG ================= */
    if (want('PA10')) {
      const A = await open(b);
      const r = await EV(A.pg, () => __pa10());
      T(!r.err && J(r.a.ev) === J([['export_png', 'part']]) && r.a.name === r.a.title + '-人声' && r.a.k === 2 && r.a.w === r.a.vb.w && r.a.h === r.a.vb.h && r.a.h === r.a.wantH && r.a.vbA === '0 0 ' + r.a.vb.w + ' ' + r.a.vb.h && !r.a.perr && r.a.nPart === 1 && !r.a.vars && !r.a.drop,
        'PA10a 分谱 PNG：事件 export_png（meta part）；交给 svgPngDownload 的 SVG 是合法 XML、宽高＝vb、viewBox＝0 0 w h、h＝n·pgH＋(n−1)·gap＋6；CSS 变量已解析；无屏幕页框 / 页码；文件名「曲名-人声」、2 倍', J(r.err || r.a));
      T(!r.err && J(r.b.ev) === J([['export_png', '']]) && r.b.name === r.a.title && r.b.k === 2 && r.b.same && r.b.vb && r.b.vb.width > 0,
        'PA10b 总谱「图片 PNG」：事件 export_png（无 meta）；exportPNG 交给 svgPngDownload 的串＝v68.5 同式现算（withCleanSnap → scoreExportClone 设宽高 → svgResolveVars）逐字节相同，文件名＝曲名（跨版本对拍见 PAZ）', J(r.err || r.b));
      T(!r.err && r.eq.name === r.eq.title + '-钢琴伴奏' && J(r.eq.ev) === J([['export_png', 'part']]) && r.eq.vb && r.eq.vb.width > 0, 'PA10c 等于总谱的钢琴份：按总谱出图（exportPNG），文件名「曲名-钢琴伴奏」', J(r.err || r.eq));
      T(!r.err && J(r.c.dl) === J([r.a.title + '-人声.png', r.a.title + '.png']) && /已导出 PNG 图片/.test(r.c.toast), 'PA10d 真实光栅化（Image → canvas → toBlob → 下载）：分谱与总谱各下载一次「曲名-人声.png」「曲名.png」、toast「已导出 PNG 图片」（分谱 SVG 不因 &nbsp; 之类的 HTML 实体光栅化失败）', J(r.err || r.c));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA11 隔离 ================= */
    if (want('PA11')) {
      const A = await open(b);
      let html = ''; try { html = fs.readFileSync(decodeURIComponent(URL0.replace(/^file:\/\//, '').split('?')[0]), 'utf8'); } catch (_) {}
      const NAMES = topBindings(html, new Set());
      const r = await A.pg.evaluate(`((NAMES)=>{
        const ser=(v)=>{ const seen=new WeakSet();
          const f=(x,d)=>{ if(x===null||typeof x!=='object'&&typeof x!=='function') return x===undefined?'∅':x;
            if(typeof x==='function') return 'ƒ'; if(x.nodeType) return '<'+x.nodeName+(x.id?'#'+x.id:'')+'>';
            if(seen.has(x)) return '↺'; seen.add(x); if(d>7) return '…';
            if(x instanceof Map) return ['Map',[...x].map(e=>f(e,d+1))]; if(x instanceof Set) return ['Set',[...x].map(e=>f(e,d+1))];
            if(ArrayBuffer.isView(x)) return 'buf'+x.length; if(Array.isArray(x)) return x.map(e=>f(e,d+1));
            const o={}; Object.keys(x).forEach(k=>{ try{ o[k]=f(x[k],d+1); }catch(_){ o[k]='?'; } }); return o; };
          try{ return JSON.stringify(f(v,0)); }catch(e){ return 'ERR'; } };
        /* 分谱自己的缓存（PART_CACHE 记排版结果、PART_SVG 复用的游离 svg）按设计会变，不比；其余全部顶层 let / var 一个都不许变 */
        const SKIP=new Set(['PART_CACHE','PART_SVG']);
        const snap=()=>{ const o={}; NAMES.forEach(n=>{ if(SKIP.has(n)) return; try{ o[n]=ser(eval(n)); }catch(e){ o[n]='TDZ'; } }); o.RENDER_STAT=ser(RENDER_STAT);
          const P=document.getElementById('paper'), R=P.getBoundingClientRect();
          o.$paper=[P.className, P.getAttribute('style'), P.clientWidth, P.clientHeight, R.width, R.height].join('|'); o.$body=document.body.className;
          o.$score=__h(document.getElementById('score').innerHTML); o.$vb=document.getElementById('score').getAttribute('viewBox'); return o; };
        /* 别的谱的分谱副本（先在各自源谱上派生好）：交替排时夹在当前谱的分谱之间 */
        const others=[];
        for(const f of ['吉他+钢琴+人声','双TAB_tabCapos1=3']){ __ld(__fx(f)); partsPlan(song).parts.forEach(p=>{ const d=partSong(p,{brk:false}); others.push({song:d.song, part:{name:p.name, run:true, keepSolo:d.keepSolo}}); }); }
        const out=[];
        for(const cur of ['JG','SJG']){
          __ld(__fx(cur)); try{ persistNow(); }catch(_){}
          const a=snap(), lp=JSON.stringify(LYR_PNO), dg=JSON.stringify(DUAL_GAP), P=partsPlan(song); let n=0;
          const tg=document.createElementNS('http://www.w3.org/2000/svg','svg');
          for(let k=0;k<3;k++){ others.forEach(o=>{ renderOffscreen({song:o.song, target:tg, paperW:870, fixed:true, crop:false, part:o.part}); n++;
              P.parts.forEach(p=>{ if(p.scoreEq) return; PART_CACHE.map.clear(); partRender(p,{paperW:LAST_PAPER_W, brk:k===1}); n++; }); }); }
          const bb=snap(), diff=Object.keys(a).filter(k=>a[k]!==bb[k]);
          out.push({cur, n, diff, lp, dg}); }
        return {names:NAMES.length, has:['LYR_PNO','DUAL_GAP','LYR_ANY','PAGE_W','LAST_PAPER_W','PART_JOB'].map(n=>NAMES.includes(n)), out}; })(${J(NAMES)})`).catch(e => ({ err: e.message }));
      T(!r.err && r.names >= 100 && r.has.every(Boolean) && r.out.every(x => !x.diff.length && x.n >= 30) && r.out.some(x => x.lp !== '[]') && r.out.some(x => x.dg !== '[]'),
        'PA11 当前谱为 JG / SJG，交替离屏排各份 3 轮（本谱分谱＋两首别的谱的分谱副本，' + (r.out ? r.out.map(x => x.n).join(' / ') : '?') + ' 次）：全部 ' + (r.names || '?') + ' 个顶层 let / var（含 LYR_PNO ' + (r.out ? r.out.map(x => x.lp).join(' ') : '') + '、DUAL_GAP 内容、PART_JOB）、RENDER_STAT、#score、#paper 的类与尺寸、body 的类前后都相同（分谱缓存 PART_CACHE / PART_SVG 除外）',
        J(r.err || r.out.map(x => [x.cur, x.diff.slice(0, 6), 'DUAL_GAP ' + x.dg.slice(0, 40)])));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA12 性能（§3.11，报中位数；CI 系数 ×2） ================= */
    if (want('PA12')) {
      const A = await open(b);
      const r = await EV(A.pg, () => { const o = {}, med = a => { const x = a.slice().sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; }, tm = f => { const t = performance.now(); f(); return performance.now() - t; };
        const L = __mkc({ p: 0, rep: 14 }); o.nM = L.measures.length;
        { const a = []; for (let i = 0; i < 21; i++) a.push(tm(() => partsPlan(L))); o.plan = med(a); }
        __ld(__mkc({ p: 0, rep: 14 })); const P = partsPlan(song);
        { const a = []; for (let i = 0; i < 11; i++) a.push(tm(() => P.parts.forEach(p => partSong(p, { brk: false })))); o.song = med(a) / P.parts.length; }
        /* 总谱走同一条流水线（离屏排＋摘屏幕专用元素＋序列化成串），与 partRender 的产出口径一致 */
        { const c = __cl(song), a = []; for (let i = 0; i < 5; i++) a.push(tm(() => { const t = __off(c, { paperW: LAST_PAPER_W }).tg; t.querySelectorAll(EXPORT_DROP_SEL).forEach(e => e.remove()); return t.innerHTML.length; })); o.full = med(a);
          o.parts = P.parts.map(p => { const x = []; for (let i = 0; i < 5; i++) { PART_CACHE.map.clear(); x.push(tm(() => partRender(p, { paperW: LAST_PAPER_W }))); } return [p.id, med(x)]; });
          const h = []; for (let i = 0; i < 5; i++) h.push(tm(() => partRender(P.parts[0], { paperW: LAST_PAPER_W }))); o.hit = med(h); }
        /* SATB 4 份 beforeprint（整个处理器：总谱 render ＋ 装配）。命中＝「分谱」键的预排口径：按当前版宽逐份 partRender 暖好缓存再打印（预排本身不计时）；
           v68.6 收尾 R4 起书写态打完分谱 afterprint 放掉缓存，「上一轮打过」不再算命中，所以命中按预排口径量 */
        const bp = (rep, ids) => { __ld(__mkc({ f: '无分组SATB', rep })); const x = {}; partDrop(); const P = partsPlan(song);
          const one = warm => { if (warm) ids.forEach(id => partRender(P.parts.find(p => p.id === id), { paperW: LAST_PAPER_W })); else partDrop();
            PART_JOB = { ids, brk: false, t: Date.now() }; const t = performance.now(); dispatchEvent(new Event('beforeprint')); const d = performance.now() - t;
            const bx = document.getElementById('print-pages'), ok = !!bx && bx.querySelectorAll('.pp-defs').length === ids.length; dispatchEvent(new Event('afterprint')); return ok ? d : -1; };
          const base = () => { const t = performance.now(); dispatchEvent(new Event('beforeprint')); const d = performance.now() - t; dispatchEvent(new Event('afterprint')); return d; };
          x.score = med([base(), base(), base()]); x.miss = med([one(false), one(false), one(false)]); x.hit = med([one(true), one(true), one(true)]); x.nM = song.measures.length; return x; };
        o.s64 = bp(16, ['v0', 'v1', 'v2', 'v3']); o.s200 = bp(50, ['v0', 'v1', 'v2', 'v3']);
        return o; });
      T(!r.err && r.plan <= 3 * CIK, 'PA12a partsPlan（' + (r.nM || '?') + ' 小节）中位 ' + (r.err ? '?' : r.plan.toFixed(2)) + 'ms ≤ ' + 3 * CIK + 'ms', r.err);
      T(!r.err && r.song <= 20 * CIK, 'PA12b partSong（' + (r.nM || '?') + ' 小节）每份中位 ' + (r.err ? '?' : r.song.toFixed(1)) + 'ms ≤ ' + 20 * CIK + 'ms', r.err);
      const worst = r.err ? 99 : Math.max(...r.parts.map(x => x[1])) / r.full;
      T(!r.err && worst <= 1.2, 'PA12c 单份 partRender（未命中，含派生）≤ 同谱总谱 renderOffscreen（同一条流水线：离屏排＋摘除＋序列化）的 1.2 倍：总谱 ' + (r.err ? '?' : r.full.toFixed(1)) + 'ms，各份 ' + (r.err ? '' : r.parts.map(x => x[0] + ' ' + x[1].toFixed(1)).join(' / ')) + 'ms（最大 ' + worst.toFixed(2) + ' 倍）；命中 ' + (r.err ? '?' : r.hit.toFixed(2)) + 'ms', r.err);
      T(!r.err && r.s64.hit >= 0 && r.s64.miss >= 0 && r.s64.hit <= 150 * CIK && r.s64.miss <= 800 * CIK && r.s200.miss >= 0 && r.s200.miss <= 2500 * CIK,
        'PA12d SATB 4 份 beforeprint 整个处理器（含总谱 render）：64 小节 命中 ' + (r.err ? '?' : r.s64.hit.toFixed(0)) + 'ms ≤ ' + 150 * CIK + '、未命中 ' + (r.err ? '?' : r.s64.miss.toFixed(0)) + 'ms ≤ ' + 800 * CIK + '；200 小节 未命中 ' + (r.err ? '?' : r.s200.miss.toFixed(0)) + 'ms ≤ ' + 2500 * CIK +
        '（同谱只打总谱 ' + (r.err ? '?' : r.s64.score.toFixed(0) + ' / ' + r.s200.score.toFixed(0)) + 'ms）', r.err);
      const wm = await EV(A.pg, async () => { __ld(__mkc({ p: 3, rep: 6 })); PART_CACHE.sig = ''; PART_CACHE.map.clear(); const op = window.print; let res = null;
        window.print = () => { const ro = window.renderOffscreen; let k = 0; window.renderOffscreen = function () { k++; return ro.apply(this, arguments); };
          try { const t = performance.now(); dispatchEvent(new Event('beforeprint')); const d = performance.now() - t; dispatchEvent(new Event('afterprint')); res = { ms: d, offscreen: k }; } finally { window.renderOffscreen = ro; } };
        try { EXPORT_ACT.parts('A4', ['t0', 't1', 'v0']); await __sleep(350); } finally { window.print = op; } return res; });
      T(!wm.err && !!wm && wm.offscreen === 0, 'PA12e 「分谱」键的预排（按当前版宽逐份 partRender）在 beforeprint 里全部命中缓存：装配时离屏排 0 次，beforeprint ' + (wm && wm.ms != null ? wm.ms.toFixed(0) : '?') + 'ms', J(wm));
      /* 预览切换（§3.11 后两项）。v68.6 集成改口径：被测量与参照量同一口径，分两条——
         ① 快照段＝规格公式原样：切换那一次的 FLOW.mode.perf.refresh 记录（pvSnap：总谱分页排版＋partRender）对总谱视图刷新记录的中位数；
         ② 整次（墙钟，含 applySnap 重建页壳 / 填页）：分谱页数与总谱不同时切换必走现有的页壳重建路径（§3.9「页数变化走现有的页壳重建路径」），
            参照量取总谱视图下同样走页壳重建（PV.geo 页数对不上 → pvBuild）的一次刷新。
         v68.6 收尾 R2（验收：本机 5 次跑 3 次红，判据裕量≈0）：只改判据、不改产品——
           · 参照量与被测量在同一个循环里交替采样（GC / 降频这类漂移两边同时吃到），各 9 次取中位（此前未命中 3 次、命中 5 次）；
           · 计时噪声项＝max(5ms, 参照量×15%)（此前固定 5ms：参照量 20–60ms 时 5ms 只够 1–2 次 GC 抖动）；
           · 谱放大到 10 份两只老虎（单份 partRender 约 15ms），让「缓存永不命中」「多重建两次页壳」这类真回归的增量远大于噪声项（突变实证见 PROJECT.md） */
      const pv = await EV(A.pg, () => { if (!(window.FLOW && FLOW.out && typeof FLOW.out.view === 'function' && FLOW.mode && typeof FLOW.mode.reshoot === 'function')) return { err: 'FLOW.out.view / FLOW.mode.reshoot 不在' };
        const med = a => { const x = a.slice().sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; }, tm = f => { const t = performance.now(); f(); return performance.now() - t; };
        const last = () => FLOW.mode.perf.refresh.last;
        __ld(__mkc({ p: 3, rep: 10 })); setMode('output');
        const v0 = () => partsPlan(song).parts.find(p => p.id === 'v0');
        for (let i = 0; i < 2; i++) { FLOW.mode.reshoot(); FLOW.out.view('v0'); FLOW.out.view('score'); }   /* 热身（JIT、字体量宽缓存） */
        const refS = [], pbW = [], pr = [], mW = [], mS = [], hW = [], hS = [], n = [PV.geo.n];
        for (let i = 0; i < 9; i++) {
          FLOW.mode.reshoot(); refS.push(last());
          PV.geo = Object.assign({}, PV.geo, { n: PV.geo.n + 1 }); pbW.push(tm(() => FLOW.mode.reshoot()));
          PART_CACHE.map.clear(); pr.push(tm(() => partRender(v0(), { paperW: LAST_PAPER_W })));
          PART_CACHE.map.clear(); mW.push(tm(() => FLOW.out.view('v0'))); mS.push(last()); if (!i) n.push(PV.geo.n); FLOW.out.view('score');
          FLOW.out.view('v0'); FLOW.out.view('score');   /* 让下一次命中的缓存项是刚排好的（不受 LRU 次序影响） */
          hW.push(tm(() => FLOW.out.view('v0'))); hS.push(last()); FLOW.out.view('score'); }
        setMode('write');
        return { refS: med(refS), pbW: med(pbW), pr: med(pr), missS: med(mS), hitS: med(hS), missW: med(mW), hitW: med(hW), n, k: refS.length }; });
      const f1 = x => (typeof x === 'number' ? x.toFixed(1) : '?'), tol = x => Math.max(5, 0.15 * x);
      T(!pv.err && pv.missS <= (pv.refS + pv.pr) * CIK + tol(pv.refS + pv.pr) && pv.hitS <= pv.refS * 1.1 * CIK + tol(pv.refS),
        'PA12f① 预览切到一份分谱的快照段（FLOW.mode.perf.refresh，交替采样各 ' + (pv.k || '?') + ' 次取中位）：未命中 ' + f1(pv.missS) + 'ms ≤ 刷新中位 ' + f1(pv.refS) + '＋单份 ' + f1(pv.pr) + '；命中 ' + f1(pv.hitS) + 'ms ≤ 刷新中位 ×1.1（噪声项 max(5ms, 参照×15%)）', J(pv));
      T(!pv.err && pv.n[0] !== pv.n[1] && pv.missW <= (pv.pbW + pv.pr) * CIK + tol(pv.pbW + pv.pr) && pv.hitW <= pv.pbW * 1.1 * CIK + tol(pv.pbW),
        'PA12f② 整次切换（墙钟，含重建页壳与填页；总谱 ' + (pv.n ? pv.n[0] : '?') + ' 页 → 分谱 ' + (pv.n ? pv.n[1] : '?') + ' 页）：未命中 ' + f1(pv.missW) + 'ms ≤ 总谱视图同走页壳重建的刷新 ' + f1(pv.pbW) + '＋单份；命中 ' + f1(pv.hitW) + 'ms ≤ 它 ×1.1（噪声项同上）', J(pv));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PA13 收尾回归（验收 R1 / R3 / R4；两套外壳） ================= */
    if (want('PA13')) for (const shell of ['flow', 'classic']) {
      const A = await open(b, { shell });
      const r = await EV(A.pg, async shell => { const o = {};
        const calls = [], op = window.print; window.print = () => calls.push(__pr());
        const ro = window.renderOffscreen; let k = 0; window.renderOffscreen = function () { k++; return ro.apply(this, arguments); };
        try {
          /* R3：120ms 内连点两次「分谱」——只弹 1 个对话框，打的是分谱；对话框关掉之后再点照常 */
          __ld(__mkc({ p: 3, rep: 3 })); EXPORT_ACT.parts('A4', ['t0', 'v0']); EXPORT_ACT.parts('A4', ['t0', 'v0']); await __sleep(400);
          o.dbl = calls.map(c => ({ nPP: c.nPP, defs: c.defs, title: c.title })); EXPORT_ACT.parts('A4', ['v0']); await __sleep(400); o.again = calls.length;
          /* R1：「不换行」开着（旧外壳书写态长带版宽）——预排不按长带宽白排，beforeprint 按分页版宽各排一次，成品页数＝各份页数之和 */
          calls.length = 0; localStorage.setItem('musetab-nowrap', '1'); __ld(__mkc({ f: '无分组SATB', rep: 6 })); const wLong = LAST_PAPER_W; partDrop();
          k = 0; EXPORT_ACT.parts('A4', ['v0', 'v1', 'v2', 'v3']); const kWarm = k; await __sleep(400); const kAll = k;
          o.nw = { wLong, kWarm, kAll, nPP: calls[0] && calls[0].nPP, defs: calls[0] && calls[0].defs, mode: flowOn() ? FLOW.mode.cur : 'classic' };
          localStorage.setItem('musetab-nowrap', '0'); render(); calls.length = 0; partDrop();
          k = 0; EXPORT_ACT.parts('A4', ['v0', 'v1', 'v2', 'v3']); const kW2 = k; await __sleep(400);
          o.wrap = { kWarm: kW2, kAll: k, nPP: calls[0] && calls[0].nPP };
          { const P = partsPlan(song); let n = 0; ['v0', 'v1', 'v2', 'v3'].forEach(id => { n += partRender(P.parts.find(x => x.id === id), { paperW: LAST_PAPER_W }).geo.n; }); o.wantPP = n; }
          /* R4：打完分谱（不在输出模式）后缓存与 PART_SVG 放掉；flow 输出模式里看过分谱、回书写后同样放掉 */
          calls.length = 0; __ld(__mkc({ p: 3, rep: 3 })); EXPORT_ACT.parts('A4', ['t0', 'v0']); await __sleep(400);
          o.after = { cache: PART_CACHE.map.size, svg: PART_SVG ? PART_SVG.childNodes.length : 0, printed: calls.length };
          if (shell === 'flow') { setMode('output'); FLOW.out.view('v0'); const inOut = { cache: PART_CACHE.map.size, svg: PART_SVG ? PART_SVG.childNodes.length : 0 };
            setMode('write'); o.leave = { inOut, cache: PART_CACHE.map.size, svg: PART_SVG ? PART_SVG.childNodes.length : 0, last: FLOW.out.last }; }
        } finally { window.print = op; window.renderOffscreen = ro; try { localStorage.setItem('musetab-nowrap', '0'); } catch (_) {} }
        return o; }, shell);
      const tag = '（' + shell + '）';
      T(!r.err && r.dbl.length === 1 && r.dbl[0].defs.split(',').length === 2 && /-分谱$/.test(r.dbl[0].title) && r.again === 2,
        'PA13a 120ms 内连点两次「分谱」' + tag + '：只弹 1 个打印对话框、打的是勾选的 2 份分谱（标题「曲名-分谱」）；对话框关掉之后再点照常打（R3）', J(r.err || { dbl: r.dbl, again: r.again }));
      T(!r.err && r.nw.wLong > 2000 && r.nw.kWarm === 0 && r.nw.kAll === 4 && r.nw.nPP === r.wantPP && r.wrap.kWarm === 4 && r.wrap.kAll === 4 && r.wrap.nPP === r.wantPP,
        'PA13b 「不换行」开着' + tag + '（书写态长带版宽 ' + (r.nw ? Math.round(r.nw.wLong) : '?') + 'px）：「分谱」不按长带宽预排（0 次），beforeprint 按分页版宽每份排 1 次（共 4 次，此前 8 次＝4 次白排）；不开「不换行」时照旧预排 4 次、beforeprint 全命中；两种情况成品都是 ' + (r.wantPP || '?') + ' 页（R1）',
        J(r.err || { nw: r.nw, wrap: r.wrap, want: r.wantPP }));
      T(!r.err && r.after.printed === 1 && r.after.cache === 0 && r.after.svg === 0 && (shell !== 'flow' || (r.leave.inOut.cache > 0 && r.leave.inOut.svg > 0 && r.leave.cache === 0 && r.leave.svg === 0 && r.leave.last === null)),
        'PA13c 分谱缓存与复用的离屏 svg 用完放掉' + tag + '：书写态 / 旧外壳打完分谱后 PART_CACHE 0 项、PART_SVG 0 个子节点' + (shell === 'flow' ? '；输出模式看着分谱时在用，回书写后同样放掉（此前 PART_SVG 还挂着上一份分谱的整棵 DOM）' : '（此前整个会话都不清）') + '（R4）',
        J(r.err || { after: r.after, leave: r.leave }));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= PAZ 缺省零差异（§6.4；基线 parts_ref.json＝v68.5 c923d00） ================= */
    if (want('PAZ')) {
      if (!REF) NOREF('PAZ 缺省零差异');
      else {
        /* v68.8：末尾加记号齐全夹具 {m:{}}（brk[1]、pull[6]、pgbrk[4]，两只老虎×3、3 个 part）——ENG-6 有意改动的放行路径：
           它的 MusicXML 剥掉 <print new-system="yes"/> 再与基线比、且这一句恰 3 个（1 处有效换行 × 3 part）；其余 28 份不带有效换行，MusicXML 仍逐字节 */
        const CASES = [...Array(16).keys()].map(i => ({ p: i })).concat([{ p: 0, rep: 14 }],
          ['JT带夹3品', '双TAB_tabCapos1=3', 'JG', 'SG', 'SJG', 'SATB+钢琴', '小提琴+钢琴', '二重唱', '吉他+钢琴+人声', '无词指弹JT', '无分组SATB'].map(f => ({ f })), [{ m: {}, nsWant: 3 }]);
        const nm = c => c.f ? c.f : c.m ? '记号夹具' : c.rep ? '长谱' + c.rep : '预设#' + c.p;
        /* 单演奏者（旧外壳弹窗 / 手机抽屉只对拍这些；多演奏者的弹窗与抽屉是有意改动，§6.4 例外） */
        const S = await open(b); const solo = await EV(S.pg, cs => cs.map(c => partsPlan(__mkc(c)).solo), CASES); await S.close();
        const KEYS = ['score', 'vb', 'geo', 'sys', 'snap', 'print', 'offPrint', 'off660', 'png', 'mxl', 'mid', 'json', 'pv', 'after'];
        for (const shell of ['flow', 'classic']) {
          const A = await open(b, { shell }), R = await open(b, { shell, url: REF });
          const diff = [], brkd = []; let nOK = 0, nDlg = 0, nRel = 0;
          for (let i = 0; i < CASES.length; i++) { const c = CASES[i];
            const x = await EV(A.pg, c => __recZ(c), c), y = await EV(R.pg, c => __recZ(c), c);
            if (x.err || y.err) { diff.push(nm(c) + ':' + (x.err || 'REF ' + y.err)); continue; }
            /* v68.8 ENG-6：只对带有效「此处换行」的谱放行 new-system 这一句（剥掉再比 + 个数＝有效换行数×part 数），不带的照旧逐字节 */
            const rel = x.brkN > 0, ks = KEYS.filter(k => k !== 'mxl' && x[k] !== y[k]);
            if (rel) { nRel++; if (x.mxlS !== y.mxl) ks.push('mxl(剥掉 new-system 后仍不同)'); if (x.nsN !== x.brkN * x.nParts || x.nsN !== c.nsWant || y.nsN !== 0 || x.mxl === y.mxl) ks.push('nsN ' + x.nsN + '（应 ' + x.brkN + '×' + x.nParts + '＝' + c.nsWant + '）'); }
            else if (x.mxl !== y.mxl) ks.push('mxl');
            if (!!c.nsWant !== rel || (!c.nsWant && x.nsN !== 0)) brkd.push(nm(c) + ' brkN=' + x.brkN + ' nsN=' + x.nsN);
            if (shell === 'classic' && solo[i]) { nDlg++; if (!x.dlg || x.dlg !== y.dlg) ks.push('dlg'); }
            if (shell === 'flow' && !(typeof x.pv === 'string' && x.pv.length > 20)) ks.push('pv 没取到');   /* 两边都没取到也算红（防空对空） */
            if (ks.length) diff.push(nm(c) + ':' + ks.join(',')); else nOK++; }
          const k1 = await EV(A.pg, () => { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^musetab-/.test(k)) ks.push(k); } return ks.sort().join(','); });
          const k2 = await EV(R.pg, () => { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^musetab-/.test(k)) ks.push(k); } return ks.sort().join(','); });
          T(!diff.length && k1 === k2, 'PAZ [' + shell + '] 缺省零差异：' + CASES.length + ' 份谱（16 预设＋210 小节长谱＋§6.3 多演奏者夹具 11 份＋v68.8 记号夹具 1 份）的书写态 #score、PV_GEO / SYS_GEO、成品快照（分页 withCleanSnap＋scoreExportClone）、不带任务的 beforeprint 切片、' +
            '不带 part 的 renderOffscreen（660 宽与打印口径，原有字段）、exportPNG 交给画布的 SVG 串、MusicXML（记号夹具剥掉 v68.8 的 new-system 再比）、MIDI 字节、song JSON、' + (shell === 'flow' ? '输出模式总谱视图的 PV.content / PV.geo' : '单演奏者谱的「打印 / 导出」弹窗（' + nDlg + ' 份）') + '、musetab-* 键集合与基线 v68.5 逐字节相同',
            diff.slice(0, 6).join(' | ') || (nOK + ' 份全同' + (k1 === k2 ? '' : '；键集合不同 ' + k1 + ' ≠ ' + k2)));
          T(!brkd.length && nRel === 1, 'PAZ-g [' + shell + '] v68.8 守卫：ENG-6 的 MusicXML 放行只用在记号夹具一份（有效换行 1 处 × 3 part＝3 个 new-system，剥掉后与基线逐字节相同），其余 ' + (CASES.length - 1) + ' 份都不带有效换行、MusicXML 仍逐字节对拍',
            brkd.join(' | ') || '放行 ' + nRel + ' 份');
          allErrs.push(...A.errs, ...R.errs.map(e => 'REF:' + e)); await A.close(); await R.close();
        }
        /* 手机 390×844（FLOW.mob）：单演奏者谱的「输出与分享」抽屉 HTML */
        const M = await open(b, { vp: { width: 390, height: 844 } }), MR = await open(b, { vp: { width: 390, height: 844 }, url: REF });
        const md = []; let mn = 0;
        for (let i = 0; i < CASES.length; i++) { if (!solo[i] || CASES[i].rep) continue; const c = CASES[i];
          const one = async pg => { const r0 = await EV(pg, c => { __ld(__mkc(c)); return !!(FLOW.mob && FLOW.mob.on); }, c); if (r0 !== true) return 'nomob ' + J(r0);
            await pg.click('[data-fm="sheet"][data-v="out"]'); await pg.waitForTimeout(220);
            const h = await EV(pg, () => { const sh = document.getElementById('flw-msheet'); return sh ? __h(sh.innerHTML) + '|' + sh.dataset.v : 'none'; });
            await EV(pg, () => { const v = document.getElementById('flw-mveil'); if (v) v.click(); }); await pg.waitForTimeout(150); return h; };
          const h1 = await one(M.pg), h2 = await one(MR.pg); mn++; if (h1 !== h2 || /none|nomob/.test(h1)) md.push(nm(c) + ':' + h1 + ' ≠ ' + h2); }
        T(!md.length && mn >= 10, 'PAZ [手机 390×844] 单演奏者谱（' + mn + ' 份）的「输出与分享」抽屉 HTML 与基线 v68.5 逐字节相同', md.slice(0, 3).join(' | ') || 'ok');
        allErrs.push(...M.errs, ...MR.errs.map(e => 'REF:' + e)); await M.close(); await MR.close();
      }
    }
  } catch (e) { T(false, '套件异常', String(e && e.stack || e).slice(0, 400)); }
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '\n失败：' + fails.join(' | ') : ''));
  const real = allErrs.filter(e => !/^REF:/.test(e) && !/ResizeObserver/.test(e));
  console.log(real.length ? 'ERRORS:\n' + real.slice(0, 10).join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !real.length ? 0 : 1);
})();
