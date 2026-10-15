/* v67.5 新建面板「从已有音乐」完整版＋拖放专项（docs/design-2026-10e README §3、§0 拖放；拍板 2：MIDI / GP 只收入口转交现有选轨）：
   I1  左栏 6 个来源（打开或导入文件 / 整理 AI 转谱结果 / 示例做同款 / 接着做 / 录音转谱 暂停中 / 图片识谱 规划中）：listbox、roving tabindex、↑↓ 选；
       录音 / 图片写明原因并引导「用 AI 转谱工具导出 MusicXML 再拖进来」，按钮跳到对应来源
   I2  老师任务「AI 转谱的 MusicXML → 五线＋简谱对照」真实点击 4 次（新建 → 从已有音乐 → 选择文件 → 导入）：建成教学对照谱、新窗口、原谱不动、音符歌词与文件一致
   I3  依据逐条（真解析器 importMusicXML＋mxlKeyPost）：1=C 按文件、4/4 · ♩=66 按文件、1 声部 · 有歌词 · 五线谱 按内容、来源：转谱软件名 → 按 AI 转谱结果处理、推荐教学对照谱；
       来源自动切到「整理 AI 转谱结果」
   I4  依据的其他口径：没写调号＝「按音符内容推断」（检测出 1=D）；普通制谱软件（MuseScore）写来源「按文件」、推荐按原文件；没写软件但从「整理 AI 转谱结果」进来＝按 AI 处理
   I5  「做成哪种谱」6 选 1：每选一个预览立刻换成那种谱的真实刻版（与导入后的谱首行逐字节一致——所见即所得）、按钮写「导入为 {谱名}」；
       逐个导入：按原文件＝五线谱歌谱、转成简谱＝简谱歌谱、对照＝教学对照谱、配钢琴伴奏＝钢琴伴奏歌谱（五线谱）、生成吉他弹唱＝吉他弹唱谱（把位轨＝mapVoxToTab 同一套取位）、标级数和弦＝功能谱
   I6  多声部文件：配伴奏 / 吉他弹唱 / 级数和弦 置灰并写原因，点了不选中、方向键跳过
   I7  Guitar Pro / MIDI：读到后关面板、转交现有选轨对话框（showGPTrackModal / showMidiImport），面板里不出选轨；谱友圈文件（.mtab.json）新窗口打开、原谱保留
   I8  不支持的格式：音频 → 录音转谱说明、图片 / PDF → 图片识谱说明、其他 → 列出能导入的格式（面板内 role=alert，不关面板、不建谱）
   I9  示例做同款：16 份示例网格（三列，↑↓←→）、预览示例首行、「按此格式新建」＝同谱类 / 谱行 / 调 / 拍号 / 小节数 / 反复，音符歌词和弦与署名留空、新窗口；「只看示例」开原示例
   I10 接着做：首访「还没有自己的谱」（示例谱不算）；有自己的谱后列出（打开中的窗口 → 切过去；我的曲谱 → 新窗口打开）
   I11 拖放：文件拖到窗口任意处出提示层，松手＝开面板「从已有音乐」并读该文件（依据＋推荐）；面板开在「新建」页也会切过去；拖文字不出提示层；
       有别的对话框开着不接（提示先关）；谱面拖选（指针拖动）照常、不出提示层
   I12 键盘：来源列表 Enter＝选择文件；读进来后 Enter＝导入；做法单选 ←→ 跳过置灰项；Esc 关
   I13 读文件到导入前不碰编辑器：切 6 种做法期间 song / 撤销栈 / 本机存储 / 窗口数不变
   I14 手机（拍板 1 看谱为主）：仍是三格式页，MusicXML 读进来按原文件直接打开（不出依据页）
   I15 命中区 ≥44 / 对比度 ≥4.5（浅 / 深）：依据页、置灰做法、示例、接着做、录音说明、格式说明
   —— 收尾（对抗式验收逐条修复，修前红修后绿）——
   I16 打印预览 / 谱架 / 谱友圈广场 / 别的对话框开着时拖入：拖动中提示层说明「先关掉……」，松手不开面板、回车不在背后导入（CDP 原生拖放）
   I17 1024–1100 宽：「做成哪种谱」6 项＋推荐在首屏（放到依据与预览之间，缩窗跟着挪）；左栏底色铺满
   I18 未读文件「导入」灰底禁用样式、点了有说明；已读后再拖坏文件：点名文件、放下旧文件；坏 GP 点名；切做法清提示
   I19 依据：没写拍号 / 3/16 改写 / 只有六线谱 / 钢琴大谱表 / 普通软件文件从「整理 AI 转谱结果」进来
   I20 做法产物：低音谱号配伴奏保留谱号；人声＋钢琴转简谱＝钢琴伴奏歌谱；钢琴两手谱转简谱置灰、对照另起名；吉他弹唱折八度写明
   I21 预览＝导入后整首的首行（32 小节长谱逐字节一致）
   I22 .mtab.json 保留入库 id、补 tabNota；同一份已开着才另作副本
   I23 接着做：份数写实数、按最近切换 / 编辑排序
   I24 拖放区整块可点；「试一试」内置示例《送别（AI 转谱）》
   I25 提示层兜底：拖动取消后指针一动就收；1.5 秒无 dragover 收起、再拖动重现（CDP 原生拖放）
   I26 低音区旋律做成教学对照谱：下加线符头 / 加线不压简谱数字与高音点（几何净距 ≥2px）
   I27 新建预览＝真实首行：钢琴弹唱谱（纯伴奏）按歌词段数留词位；预览页头印「制谱：」
   I28 导入 / 示例做同款落地直接调谱型条 LBAR.open（同版 B 侧），并照发 pq-landed
   —— 第二轮验收（修前＝第二轮实现版红、修后绿）——
   I29 落地即有谱型条（导入 / 拖放 / 示例做同款），第一次点击谱面不下移；只看示例 / 手机不挂；新窗口从谱首看起
   I30 .mtab.json 同 id 而内容不同：按副本打开，不覆盖「我的曲谱」（面板 / 拖放 / 顶栏「打开」同口径）
   I31 个人中心开着时拖入：拦下并说明
   I32 对照行单条下加线避让按系统算（只让含低音的那一行）
   I33 示例《送别》作词署名；示例导入单独计
   I34 导入谱的起步条：伴奏来自文件不给重配主按钮；功能谱已有和弦换提示
   I35 钢琴两手谱「五线＋简谱对照」谱名一致、钢琴族内互换保留简谱对照
   I36 长文件导入预览两段式（先前 32 小节、空闲整首替换，最终仍逐字节一致）
   突变实证：MUSETAB_URL=file://…/v67.4 原版 → 无来源列表 / 依据 / 做法 / 拖放 → 全红；收尾前的实现版 → I16–I28 红。
   拖放：I11 / I18 用 DragEvent＋DataTransfer(File) 合成派发，I16 / I25 用 CDP Input.dispatchDragEvent 原生拖放（无法用真实鼠标从系统拖文件；
   原生拖放的文件名用 ASCII——测试机上中文路径拖进来 dataTransfer 为空）；其余全部真实点击 / 键盘。ONLY=I16,I20 只跑这几项（调试）。 */
const { chromium } = require('playwright');
const path = require('path');
const { songbieXML } = require('./fixtures/songbie_ai.js');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
/* 文件以 {name, mimeType, buffer} 交给文件选择框（中文文件名不经本地文件系统，避免测试机文件名编码差异） */
const MIME = { musicxml: 'application/vnd.recordare.musicxml+xml', xml: 'application/xml', mid: 'audio/midi', gp5: 'application/octet-stream', json: 'application/json', mp3: 'audio/mpeg', png: 'image/png', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const file = (name, data) => ({ name, mimeType: MIME[name.split('.').pop()] || 'application/octet-stream', buffer: Buffer.isBuffer(data) ? data : Buffer.from(String(data)) });
const SONGBIE = file('送别（AI 转谱）.musicxml', songbieXML());
/* D 大调旋律、不写调号（检测应得 1=D）；普通制谱软件导出 */
const dXML = (sw, nokey) => '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>D 大调</work-title></work><identification><encoding><software>' + sw + '</software></encoding></identification>'
  + '<part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">'
  + [0, 1].map(mi => '<measure number="' + (mi + 1) + '">' + (mi ? '' : '<attributes><divisions>1</divisions>' + (nokey ? '' : '<key><fifths>0</fifths></key>') + '<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>')
    + [['D', 4, 0], ['F', 4, 1], ['A', 4, 0], ['D', 5, 0]].map(([st, o, al]) => '<note><pitch><step>' + st + '</step>' + (al ? '<alter>1</alter>' : '') + '<octave>' + o + '</octave></pitch><duration>1</duration><type>quarter</type></note>').join('') + '</measure>').join('')
  + '</part></score-partwise>';
const SAB = '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>SAB</work-title></work><part-list>'
  + ['S', 'A', 'B'].map((n, i) => '<score-part id="P' + (i + 1) + '"><part-name>' + n + '</part-name></score-part>').join('') + '</part-list>'
  + ['G', 'G', 'F'].map((c, i) => '<part id="P' + (i + 1) + '"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>' + c + '</sign><line>' + (c === 'F' ? 4 : 2) + '</line></clef></attributes>'
    + [0, 1, 2, 3].map(() => '<note><pitch><step>' + (c === 'F' ? 'C' : 'E') + '</step><octave>' + (c === 'F' ? 3 : 4) + '</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>啊</text></lyric></note>').join('') + '</measure></part>').join('') + '</score-partwise>';
/* GP5 最小写出器（同 tv_keydet / tv_gp mkW） */
function gp5() {
  const a = []; const w = { b: v => a.push(v & 255), i: v => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255), sh: v => a.push(v & 255, (v >> 8) & 255), z: n => { for (let i = 0; i < n; i++) a.push(0); },
    bss: (s, size) => { const bf = Buffer.from(s, 'utf8'); a.push(Math.min(bf.length, size)); for (let i = 0; i < size; i++) a.push(i < bf.length ? bf[i] : 0); },
    ibs: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length + 1); a.push(bf.length); bf.forEach(x => a.push(x)); }, iss: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length); bf.forEach(x => a.push(x)); } };
  w.bss('FICHIER GUITAR PRO v5.10', 30); ['GP 转交', '', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);
  w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }
  w.i(0); w.z(4); w.z(11); w.z(30); for (let i = 0; i < 10; i++) w.ibs('');
  w.ibs(''); w.i(90); w.b(0); w.b(0); w.i(0);
  for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
  w.z(42); w.i(1); w.i(1);
  w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0);
  w.z(1); w.b(0); w.bss('吉他', 40); w.i(6); [64, 59, 55, 50, 45, 40, 0].forEach(x => w.i(x));
  w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0); w.z(29); w.i(0); w.i(0); w.i(0); w.i(0); w.z(4); w.ibs(''); w.ibs('');
  w.z(1);
  w.i(4); for (let k = 0; k < 4; k++) { w.b(0); w.b(0); w.b(1 << (7 - 3)); w.b(0x20); w.b(1); w.b(2); w.z(1); w.sh(0); }
  w.i(0); w.b(0);
  return Buffer.from(a);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + String(d).slice(0, 1600) : '')); };
  const errs = [];
  const open = async (w, h, opt) => {
    opt = opt || {};
    const ctx = await b.newContext({ viewport: { width: w || 1280, height: h || 800 }, isMobile: !!opt.mob, hasTouch: !!opt.mob });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(5000);
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(F); await pg.waitForTimeout(900);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; window.__toasts = []; const t0 = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return t0.apply(this, arguments); }; });
    pg._ctx = ctx; return pg;
  };
  /* ONLY=I20,I21 只跑这几项（调试用；缺省全跑） */
  const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
  const guard = async (name, fn) => { if (ONLY.length && !ONLY.some(o => name.split(' ')[0] === o)) return; try { await fn(); } catch (e) { T(false, name, 'EXC: ' + String(e.message || e).split('\n').slice(0, process.env.ONLY ? 12 : 1).join(' / ')); } };
  const toImport = async pg => { await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]'); await pg.click('.nf-tabs [data-v="import"]'); await pg.waitForSelector('#nf-isrc'); };
  const pick = async (pg, fp, sel) => { const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), pg.click(sel || '#nw-import')]); await fc.setFiles(fp); };
  const pvDone = pg => pg.waitForFunction(() => { const i = NWP.pvInfo && NWP.pvInfo(); return !!i && !document.querySelector('.nf-paper.pv-wait'); }, null, { timeout: 4000 });
  const loaded = pg => pg.waitForFunction(() => !!(NWP.state && NWP.state.imp.a) && !!document.querySelector('#nf-ibasis'), null, { timeout: 4000 });
  const basis = pg => pg.evaluate(() => [...document.querySelectorAll('#nf-ibasis p')].map(p => p.querySelector('i').textContent + ' ‖ ' + p.querySelector('em').textContent));

  /* ---------- I1 来源 ---------- */
  await guard('I1 来源', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg);
    const r = {};
    r.list = await pg.evaluate(() => [...document.querySelectorAll('#nf-isrc [role=option]')].map(o => o.dataset.isrc + ':' + o.querySelector('b').textContent + '/' + o.querySelector('small').textContent + ':' + o.tabIndex + ':' + o.getAttribute('aria-selected')));
    r.focus = await pg.evaluate(() => document.activeElement && document.activeElement.dataset.isrc);
    for (let i = 0; i < 4; i++) await pg.keyboard.press('ArrowDown');
    r.audio = await pg.evaluate(() => ({ sel: NWP.state.imp.src, f: document.activeElement.dataset.isrc, txt: document.querySelector('.nf-mid').textContent, go: !!document.querySelector('#nf-impgo[aria-disabled="true"]') }));
    await pg.keyboard.press('ArrowDown');
    r.image = await pg.evaluate(() => ({ sel: NWP.state.imp.src, txt: document.querySelector('.nf-mid').textContent }));
    await pg.click('#nf-isrcgo'); r.jump = await pg.evaluate(() => NWP.state.imp.src);
    await pg.click('#nf-isrc-audio'); await pg.click('#nf-isrcgo'); r.jump2 = await pg.evaluate(() => ({ src: NWP.state.imp.src, f: document.activeElement.dataset.isrc, drop: /拖到这里/.test(document.querySelector('.nf-mid').textContent) }));
    await pg._ctx.close();
    T(r.list.length === 6 && r.list.map(x => x.split(':')[0]).join() === 'file,ai,ex,recent,audio,image' && /打开或导入文件\/MusicXML · Guitar Pro · MIDI · 谱友圈文件:0:true/.test(r.list[0])
      && /录音转谱\/暂停中/.test(r.list[4]) && /图片识谱\/规划中/.test(r.list[5]) && /还没有自己的谱/.test(r.list[3]) && r.list.filter(x => /:0:/.test(x)).length === 1 && r.focus === 'file'
      && r.audio.sel === 'audio' && r.audio.f === 'audio' && /录音转谱暂停中/.test(r.audio.txt) && /AI 转谱工具/.test(r.audio.txt) && /MusicXML/.test(r.audio.txt) && /拖进来/.test(r.audio.txt) && r.audio.go
      && r.image.sel === 'image' && /图片识谱在规划中/.test(r.image.txt) && /导出 MusicXML，再拖进来/.test(r.image.txt) && r.jump === 'file' && r.jump2.src === 'ai' && r.jump2.f === 'ai' && r.jump2.drop,
      'I1 左栏 6 个来源（listbox、roving、↑↓）；录音转谱暂停中 / 图片识谱规划中写明原因并引导「AI 转谱工具导出 MusicXML 再拖进来」，按钮跳到「整理 AI 转谱结果」/「打开或导入文件」', JSON.stringify(r));
  });

  /* ---------- I2 老师任务 4 次点击 ＋ I3 依据 ---------- */
  await guard('I2 老师任务 4 次', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); loadSong(PRESETS[0].make()); render(); });
    const before = await pg.evaluate(() => ({ docs: docs.length, s: JSON.stringify(song), cur: curDocI }));
    let clicks = 0;
    await pg.click('#b-new'); clicks++; await pg.waitForSelector('.nf-modal [data-scene]');
    await pg.click('.nf-tabs [data-v="import"]'); clicks++;
    await pick(pg, SONGBIE); clicks++;
    await loaded(pg); await pvDone(pg);
    const bs = await basis(pg);
    const st = await pg.evaluate(() => ({ src: NWP.state.imp.src, rec: (document.querySelector('.nf-tg [aria-checked="true"]') || {}).dataset.v, tag: (document.querySelector('.nf-tg .nf-tag') || {}).parentElement && document.querySelector('.nf-tg .nf-tag').closest('button').dataset.v,
      go: document.getElementById('nf-impgo').textContent, file: document.querySelector('.nf-file').textContent, focus: document.activeElement.id, pv: NWP.pvInfo().rkey }));
    await pg.click('#nf-impgo'); clicks++;
    await pg.waitForTimeout(250);
    const after = await pg.evaluate(() => ({ docs: docs.length, cur: curDocI, k: NWB.stackOf(song), label: docTypeLabel(song), dual: song.voxDual, vn: song.voxNotations, title: song.title,
      notes: song.measures.map(m => m.voxes[0].map(c => c.deg + (c.oct > 0 ? "'" : c.oct < 0 ? ',' : '') + '/' + c.dur + (c.dotted ? '.' : '') + (c.lyrics[0] || '')).join(' ')).slice(0, 2).join(' | '),
      key: song.key, tempo: song.tempo, prev: JSON.stringify(docs[0].song), modal: !!document.querySelector('.nf-modal'), toast: (window.__toasts.slice(-1)[0] || '') }));
    await pg._ctx.close();
    const want = ['1=C ‖ 按文件', '4/4 · ♩=66 ‖ 按文件', '1 声部 · 有歌词 · 五线谱 ‖ 按内容', '来源：AI Music Transcriber 2.1 ‖ 文件里写明由转谱软件导出 → 按 AI 转谱结果处理', '推荐：教学对照谱 ‖ AI 转谱多为单旋律＋歌词，课堂最常用五线＋简谱对照'];
    T(clicks === 4 && after.docs === before.docs + 1 && after.cur === before.docs && after.prev === before.s && after.k === 'SJ' && after.label === '教学对照谱' && after.dual[0] === true && after.vn[0] === 'staff' && !after.modal
      && after.notes === "5/4长 3/8亭 5/8 1'/2外 | 6/4古 1'/4道 5/2边" && after.key === 'C' && after.tempo === 66 && /已导入为教学对照谱《送别（AI 转谱）》8 小节 · 新窗口打开，原谱保留/.test(after.toast),
      'I2 老师任务「AI 转谱 MusicXML → 五线＋简谱对照」真实点击 4 次（新建 → 从已有音乐 → 选择文件 → 导入）：新窗口建成教学对照谱，原谱逐字节不变，音符 / 歌词 / 调 / 速度与文件一致', JSON.stringify({ clicks, after: Object.assign({}, after, { prev: after.prev.length }) }));
    T(want.every((x, i) => bs[i] === x) && st.src === 'ai' && st.rec === 'SJ' && st.tag === 'SJ' && /导入为 教学对照谱/.test(st.go) && /8 小节 · 1 声部 · 有歌词/.test(st.file) && st.focus === 'nf-impgo' && /^i\|\d+\|SJ$/.test(st.pv),
      'I3 依据逐条：1=C 按文件 / 4/4 · ♩=66 按文件 / 1 声部 · 有歌词 · 五线谱 按内容 / 来源：AI Music Transcriber 2.1 → 按 AI 转谱结果处理 / 推荐教学对照谱；来源自动切到「整理 AI 转谱结果」、默认选中并标「推荐」、焦点落「导入」', JSON.stringify({ bs, st }));
  });

  /* ---------- I4 依据的其他口径 ---------- */
  await guard('I4 依据口径', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg);
    await pick(pg, file('flute.musicxml', dXML('MuseScore 4.2.1', true))); await loaded(pg);
    const a = { bs: await basis(pg), rec: await pg.evaluate(() => NWP.state.imp.a.recommend), src: await pg.evaluate(() => NWP.state.imp.src) };
    await pg.click('#nf-unload'); await pg.click('#nf-isrc-ai');
    await pick(pg, file('plain.musicxml', dXML('', false).replace('<identification><encoding><software></software></encoding></identification>', ''))); await loaded(pg);
    const c = { bs: await basis(pg), rec: await pg.evaluate(() => NWP.state.imp.a.recommend) };
    await pg._ctx.close();
    T(/^1=D ‖ 文件没写调号，按音符内容推断/.test(a.bs[0]) && a.bs.some(x => x === '来源：MuseScore 4.2.1 ‖ 按文件') && !a.bs.some(x => /推荐/.test(x)) && a.rec === 'orig' && a.src === 'file'
      && c.bs.some(x => x === '来源：AI 转谱 ‖ 你选了「整理 AI 转谱结果」') && c.rec === 'SJ' && /^1=C ‖ 按文件$/.test(c.bs[0]),
      'I4 没写调号＝「按音符内容推断」（检测 1=D）；普通制谱软件写「来源：MuseScore 按文件」、推荐按原文件；从「整理 AI 转谱结果」进来的无软件名文件按 AI 处理、推荐教学对照谱', JSON.stringify({ a, c }));
  });

  /* ---------- I5 做成哪种谱 6 选 1：预览＝导入结果首行（逐字节）、逐个导入 ---------- */
  await guard('I5 六种做法', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => hideStartPad());
    const want = { orig: ['S', '五线谱歌谱'], J: ['J', '简谱歌谱'], SJ: ['SJ', '教学对照谱'], acc: ['SG', '钢琴伴奏歌谱（五线谱）'], JT: ['JT', '吉他弹唱谱'], CJ: ['CJ', '功能谱'] };
    const res = {}, keys = new Set();
    for (const t of Object.keys(want)) {
      await toImport(pg); await pick(pg, SONGBIE); await loaded(pg); await pvDone(pg);
      await pg.click('[data-act="tg"][data-v="' + t + '"]'); await pvDone(pg);
      const pv = await pg.evaluate(() => ({ rkey: NWP.pvInfo().rkey, svg: document.querySelector('#nf-pvbox svg').innerHTML, go: document.getElementById('nf-impkind').textContent, cap: document.querySelector('#nf-pv figcaption').textContent,
        checked: document.querySelector('.nf-tg [aria-checked="true"]').dataset.v, aria: document.querySelector('#nf-pvbox svg').getAttribute('aria-label') }));
      keys.add(pv.svg.length + ':' + pv.svg.slice(-200));
      await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
      const out = await pg.evaluate(() => {
        const s = JSON.parse(JSON.stringify(song)); delete s.layout; delete s.id;   /* 整首（收尾：预览不再截前 6 小节，断行是全曲 DP） */
        const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); renderOffscreen({ song: s, target: sv, maxSystems: 1, paperW: 660, invert: false });
        const lyr = song.measures[0].voxes[0].map(c => c.lyrics[0] || '').join('');
        return { k: NWB.stackOf(song), label: docTypeLabel(song), svg: sv.innerHTML, tabs: song.tabVoices.length, tabNotes: (song.measures[0].tabs[0] || []).map(c => (c.notes[0] || {}).s + ':' + (c.notes[0] || {}).f).join(' '),
          chords: song.measures.slice(0, 4).map(m => m.voxes[0].map(c => c.chord || '').join('')).join('|'), lyr, func: !!song.func, fn: !!song.funcNames, rows: song.voxVoices.length, groups: JSON.stringify(song.voxGroups || null), title: song.title, docs: docs.length };
      });
      /* 把位轨与 mapVoxToTab「跟随和弦图」同一套取位：在导入结果上删掉把位轨再用 mapVoxToTab 生成一遍，逐列一致 */
      if (t === 'JT') out.mvt = await pg.evaluate(() => { const s0 = JSON.parse(JSON.stringify(song)); const keep = song; song = s0; s0.tabVoices = []; s0.measures.forEach(m => { m.tabs = []; });
        const u = undoStack.length; try { mapVoxToTab(0, 'follow'); } finally { song = keep; } undoStack.length = u;
        return (s0.measures[0].tabs[0] || []).map(c => (c.notes[0] || {}).s + ':' + (c.notes[0] || {}).f).join(' '); });
      res[t] = { pv: { go: pv.go, checked: pv.checked, cap: pv.cap, aria: /刻版/.test(pv.aria) }, k: out.k, label: out.label, same: pv.svg === out.svg, n: pv.svg.length, tabs: out.tabs, tabNotes: out.tabNotes, mvt: out.mvt, chords: out.chords, lyr: out.lyr, func: out.func, fn: out.fn, rows: out.rows, groups: out.groups, title: out.title };
    }
    await pg._ctx.close();
    const bad = Object.keys(want).filter(t => { const x = res[t]; return !x || x.k !== want[t][0] || x.label !== want[t][1] || x.pv.go !== want[t][1] || x.pv.checked !== t || !x.same || !x.pv.aria || x.lyr !== '长亭外' || x.title !== '送别（AI 转谱）'; });
    const spec = res.acc && res.acc.rows === 3 && /brace","from":1,"to":2/.test(res.acc.groups) && res.JT && res.JT.tabs === 1 && res.JT.tabNotes === res.JT.mvt && /C|G/.test(res.JT.chords)
      && res.CJ && res.CJ.func && !res.CJ.fn && /[CFG]/.test(res.CJ.chords) && keys.size === 6;
    T(!bad.length && spec,
      'I5 做成哪种谱 6 选 1：每选一个预览立刻换（6 张互不相同）、按钮写谱名；预览与导入结果首行逐字节一致（所见即所得）；按原文件＝五线谱歌谱、转简谱＝简谱歌谱、对照＝教学对照谱、配钢琴伴奏＝钢琴伴奏歌谱（五线谱，钢琴两行花括号）、生成吉他弹唱＝吉他弹唱谱（把位＝mapVoxToTab 同一套取位）、标级数和弦＝功能谱（显示级数）；歌词 / 曲名带过去',
      JSON.stringify({ bad, res }));
  });

  /* ---------- I6 多声部文件：只能单旋律的做法置灰 ---------- */
  await guard('I6 置灰', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg); await pick(pg, file('sab.musicxml', SAB)); await loaded(pg);
    const r = await pg.evaluate(() => [...document.querySelectorAll('.nf-tg [role=radio]')].map(x => x.dataset.v + ':' + (x.getAttribute('aria-disabled') || '-') + ':' + x.querySelector('small').textContent));
    await pg.click('[data-act="tg"][data-v="acc"]', { force: true });   /* aria-disabled：Playwright 默认不点，强制真实点一下看它不被选中 */
    const c1 = await pg.evaluate(() => document.querySelector('.nf-tg [aria-checked="true"]').dataset.v);
    await pg.focus('[data-act="tg"][data-v="SJ"]'); await pg.keyboard.press('ArrowDown');
    const c2 = await pg.evaluate(() => ({ v: document.querySelector('.nf-tg [aria-checked="true"]').dataset.v, f: document.activeElement.dataset.v }));
    await pg._ctx.close();
    T(['acc', 'JT', 'CJ'].every(t => r.some(x => x.startsWith(t + ':true:需要单旋律（文件有 3 个声部）'))) && ['orig', 'J', 'SJ'].every(t => r.some(x => x.startsWith(t + ':-:'))) && c1 === 'orig' && c2.v === 'orig' && c2.f === 'orig',
      'I6 3 声部文件：配钢琴伴奏 / 生成吉他弹唱 / 标级数和弦 置灰并写「需要单旋律（文件有 3 个声部）」，点了不选中，方向键从「对照」跳过置灰项回到「按原文件」', JSON.stringify({ r, c1, c2 }));
  });

  /* ---------- I7 GP / MIDI 转交、谱友圈文件 ---------- */
  await guard('I7 转交', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const mid = await pg.evaluate(() => { const s = createSong('vocal', { title: 'mid', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 }); s.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 1][i]; })); const o = exportMIDI(s); return Array.from(o.bytes || o); });
    const r = {};
    await toImport(pg); await pick(pg, file('a.mid', Buffer.from(mid))); await pg.waitForTimeout(300);
    r.midi = await pg.evaluate(() => ({ panel: !!document.querySelector('.nf-modal'), modal: (document.querySelector('.modal h3') || {}).textContent || '', st: !!NWP.state }));
    await pg.evaluate(() => closeModal());
    await toImport(pg); await pick(pg, file('a.gp5', gp5())); await pg.waitForTimeout(300);
    r.gp = await pg.evaluate(() => ({ panel: !!document.querySelector('.nf-modal'), modal: (document.querySelector('.modal h3') || {}).textContent || '', st: !!NWP.state }));
    await pg.evaluate(() => closeModal());
    const d0 = await pg.evaluate(() => { const s = createSong('vocal', { title: '我的旧谱', key: 'G', nMea: 3, nVox: 1, lyr: 1 }); s.measures[0].voxes[0][0].deg = 5; return { json: JSON.stringify(s), docs: docs.length, cur: JSON.stringify(song) }; });
    await toImport(pg); await pick(pg, file('我的旧谱.mtab.json', d0.json)); await pg.waitForTimeout(300);
    r.mtab = await pg.evaluate(d0 => ({ docs: docs.length - d0.docs, title: song.title, key: song.key, deg: song.measures[0].voxes[0][0].deg, prev: JSON.stringify(docs[docs.length - 2].song) === d0.cur, panel: !!document.querySelector('.nf-modal') }), d0);
    await pg._ctx.close();
    T(!r.midi.panel && /MIDI/.test(r.midi.modal) && !r.midi.st && !r.gp.panel && /音轨|Guitar Pro|GP/.test(r.gp.modal) && !r.gp.st && r.mtab.docs === 1 && r.mtab.title === '我的旧谱' && r.mtab.key === 'G' && r.mtab.deg === 5 && r.mtab.prev && !r.mtab.panel,
      'I7 MIDI / Guitar Pro 读到后关面板、转交现有选轨对话框（面板里不重做选轨）；谱友圈文件 .mtab.json 新窗口打开、原谱保留', JSON.stringify(r));
  });

  /* ---------- I8 不支持的格式 ---------- */
  await guard('I8 不支持的格式', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const d0 = await pg.evaluate(() => docs.length);
    await toImport(pg);
    const r = {};
    for (const [n, k] of [['录音.mp3', 'audio'], ['谱子.png', 'image'], ['扫描.pdf', 'image'], ['说明.docx', 'other']]) {
      await pg.click('#nf-isrc-file');
      await pick(pg, file(n, 'x')); await pg.waitForTimeout(150);
      r[k + (n.endsWith('pdf') ? 'pdf' : '')] = await pg.evaluate(() => ({ src: NWP.state.imp.src, alert: (document.querySelector('.nf-imperr[role=alert]') || {}).textContent || '', panel: !!document.querySelector('.nf-modal') }));
    }
    const d1 = await pg.evaluate(() => docs.length);
    await pg._ctx.close();
    T(r.audio.src === 'audio' && /「录音\.mp3」是音频文件：录音转谱暂停中，先用 AI 转谱工具转成 MusicXML 再拖进来/.test(r.audio.alert) && r.image.src === 'image' && /是图片 \/ PDF：图片识谱在规划中/.test(r.image.alert)
      && r.imagepdf.src === 'image' && r.other.src === 'file' && /不是能读的曲谱文件。可以导入：MusicXML/.test(r.other.alert) && /Guitar Pro/.test(r.other.alert) && /MIDI/.test(r.other.alert) && /\.mtab\.json/.test(r.other.alert)
      && Object.values(r).every(x => x.panel) && d1 === d0,
      'I8 不支持的格式在面板里说明（role=alert）：音频 → 录音转谱说明、图片 / PDF → 图片识谱说明、其他 → 列出可导入格式；不关面板、不建谱', JSON.stringify(r));
  });

  /* ---------- I9 示例做同款 ---------- */
  await guard('I9 示例做同款', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg); await pg.click('#nf-isrc-ex'); await pvDone(pg);
    const r = {};
    r.grid = await pg.evaluate(() => ({ n: document.querySelectorAll('#nf-exl [role=option]').length, sel: document.querySelector('#nf-exl [aria-selected="true"]').dataset.ex, cols: getComputedStyle(document.getElementById('nf-exl')).gridTemplateColumns.split(' ').length }));
    await pg.click('#nf-ex-13'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowUp');
    r.nav = await pg.evaluate(() => ({ sel: NWP.state.imp.ex, f: document.activeElement.dataset.ex }));
    await pg.click('#nf-ex-13'); await pvDone(pg);
    r.pv = await pg.evaluate(() => ({ rkey: NWP.pvInfo().rkey, txt: [...document.querySelectorAll('#nf-pvbox svg text')].map(x => x.textContent).join('').slice(0, 40), name: PRESETS[13].name }));
    await pg.fill('#nf-extitle', '我的对照谱');
    const d0 = await pg.evaluate(() => ({ docs: docs.length, cur: JSON.stringify(song) }));
    await pg.click('#nf-exgo'); await pg.waitForTimeout(200);
    r.made = await pg.evaluate(d0 => { const p = migrate(PRESETS[13].make());
      return { docs: docs.length - d0.docs, title: song.title, k: NWB.stackOf(song), pk: NWB.stackOf(p), dt: docType(song) === docType(p), key: song.key === p.key, meter: song.beats + '/' + song.unit === p.beats + '/' + p.unit, nMea: song.measures.length === p.measures.length,
        empty: NWB.isEmptySong(song), credits: [song.singer, song.lyricist, song.composer].join(''), fixed: !!(song.layout && song.layout.fixed), rep: song.measures.map(m => (m.repeatStart ? '[' : '') + (m.repeatEnd ? ']' : '') + (m.finalBar ? '|' : '')).join('') === p.measures.map(m => (m.repeatStart ? '[' : '') + (m.repeatEnd ? ']' : '') + (m.finalBar ? '|' : '')).join(''),
        prev: JSON.stringify(docs[docs.length - 2].song) === d0.cur, id: song.id || null }; }, d0);
    await toImport(pg); await pg.click('#nf-isrc-ex'); await pg.click('#nf-ex-2'); await pg.click('#nf-exopen'); await pg.waitForTimeout(200);
    r.open = await pg.evaluate(() => ({ title: song.title, name: PRESETS[2].name, notes: !NWB.isEmptySong(song) }));
    await pg._ctx.close();
    T(r.grid.n === 16 && r.grid.sel === '13' && r.grid.cols === 3 && r.nav.sel === 9 && r.nav.f === '9' && /^e\|13$/.test(r.pv.rkey) && r.pv.txt.length > 0
      && r.made.docs === 1 && r.made.title === '我的对照谱' && r.made.k === r.made.pk && r.made.dt && r.made.key && r.made.meter && r.made.nMea && r.made.empty && r.made.credits === '' && r.made.fixed && r.made.rep && r.made.prev && !r.made.id
      && r.open.notes && r.open.title.length > 0,
      'I9 示例做同款：16 份示例三列网格（← 一格、↑ 一行）、预览示例首行；「按此格式新建」＝同谱类 / docType / 调 / 拍号 / 小节数 / 反复与终止线、音符歌词和弦与署名留空、固定版宽、新窗口原谱保留；「只看示例」开原示例', JSON.stringify(r));
  });

  /* ---------- I10 接着做 ---------- */
  await guard('I10 接着做', async () => {
    const pg = await open(1280, 800);
    await toImport(pg); await pg.click('#nf-isrc-recent');
    const r = {};
    r.first = await pg.evaluate(() => ({ txt: document.querySelector('.nf-mid').textContent, small: document.querySelector('#nf-isrc-recent small').textContent, go: (document.querySelector('.nf-ft .nf-go') || {}).id }));
    await pg.keyboard.press('Escape');
    await pg.evaluate(() => { hideStartPad(); mutate(() => { song.title = '我改过的谱'; song.measures[0].voxes[0][0].deg = 3; });
      const lib = libLoad(); const s = createSong('vocal', { title: '库里的谱', key: 'A', nMea: 2, nVox: 1 }); s.measures[0].voxes[0][0].deg = 6; s.id = 'sLIB1'; lib.push({ id: 'sLIB1', title: '库里的谱', data: s, mtime: 9e9, updatedAt: '刚刚' }); libSave(lib);
      addDoc(createSong('vocal', { title: '另一个', nMea: 2, nVox: 1 })); });
    const d0 = await pg.evaluate(() => docs.length);
    await toImport(pg); await pg.click('#nf-isrc-recent');
    r.list = await pg.evaluate(() => [...document.querySelectorAll('#nf-rcl [role=option]')].map(o => o.querySelector('b').textContent + '/' + o.querySelector('small').textContent));
    const iw = await pg.evaluate(() => [...document.querySelectorAll('#nf-rcl [role=option]')].findIndex(o => /我改过的谱/.test(o.textContent)));
    await pg.click('#nf-rc-' + iw); await pg.click('#nf-rcgo'); await pg.waitForTimeout(150);
    r.sw = await pg.evaluate(d0 => ({ title: song.title, docs: docs.length - d0, cur: curDocI }), d0);
    await toImport(pg); await pg.click('#nf-isrc-recent');
    const idx = await pg.evaluate(() => [...document.querySelectorAll('#nf-rcl [role=option]')].findIndex(o => /库里的谱/.test(o.textContent)));
    await pg.click('#nf-rc-' + idx); await pg.click('#nf-rcgo'); await pg.waitForTimeout(150);
    r.lib = await pg.evaluate(d0 => ({ title: song.title, docs: docs.length - d0, key: song.key, id: song.id }), d0);
    await pg._ctx.close();
    T(/还没有自己的谱/.test(r.first.txt) && /不含示例谱/.test(r.first.txt) && r.first.small === '还没有自己的谱' && r.first.go === 'nf-rcnew'
      && r.list.some(x => /^另一个\/.*当前窗口/.test(x)) && r.list.some(x => /^我改过的谱\//.test(x) && /打开中的窗口/.test(x)) && r.list.some(x => /^库里的谱\/.*我的曲谱/.test(x))
      && r.sw.title === '我改过的谱' && r.sw.docs === 0 && r.sw.cur === 0 && r.lib.title === '库里的谱' && r.lib.docs === 1 && r.lib.key === 'A' && r.lib.id === 'sLIB1',
      'I10 接着做：首访「还没有自己的谱」（示例谱不算，主按钮「去新建」）；改过的谱（打开中的窗口 → 切过去）与「我的曲谱」（新窗口打开）都列出', JSON.stringify(r));
  });

  /* ---------- I11 拖放 ---------- */
  await guard('I11 拖放', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); loadSong(PRESETS[0].make()); render(); });
    const xml = songbieXML();
    const dt = (name, text, type) => pg.evaluateHandle(([n, t, ty]) => { const d = new DataTransfer(); if (n) d.items.add(new File([t], n, { type: ty })); else d.setData('text/plain', t); return d; }, [name, text, type]);
    const r = {};
    const d1 = await dt('送别（AI 转谱）.musicxml', xml, 'application/xml');
    await pg.dispatchEvent('#paper', 'dragenter', { dataTransfer: d1 }); await pg.dispatchEvent('#paper', 'dragover', { dataTransfer: d1 });
    r.mask = await pg.evaluate(() => { const m = document.getElementById('nf-dropmask'); return m ? { txt: m.textContent, pe: getComputedStyle(m).pointerEvents } : null; });
    await pg.dispatchEvent('#paper', 'drop', { dataTransfer: d1 }); await loaded(pg); await pvDone(pg);
    r.drop = await pg.evaluate(() => ({ mask: !!document.getElementById('nf-dropmask'), tab: NWP.state.tab, src: NWP.state.imp.src, name: NWP.state.imp.a.name, rec: NWP.state.imp.a.recommend, docs: docs.length }));
    await pg.keyboard.press('Escape');
    /* 面板开在「新建」页：拖进来切到「从已有音乐」 */
    await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]');
    const d2 = await dt('笔记.txt', 'hello', 'text/plain');
    await pg.dispatchEvent('.nf-modal', 'dragenter', { dataTransfer: d2 }); await pg.dispatchEvent('.nf-modal', 'drop', { dataTransfer: d2 }); await pg.waitForTimeout(150);
    r.inPanel = await pg.evaluate(() => ({ tab: NWP.state.tab, alert: (document.querySelector('.nf-imperr') || {}).textContent || '' }));
    await pg.keyboard.press('Escape');
    /* 拖文字（非文件）不出提示层、不拦 */
    const d3 = await dt('', 'just text', '');
    await pg.dispatchEvent('#paper', 'dragenter', { dataTransfer: d3 });
    r.text = await pg.evaluate(() => !!document.getElementById('nf-dropmask'));
    /* 别的对话框开着：不接，提示先关 */
    await pg.evaluate(() => showModal('<h3>别的对话框</h3><div class="btns"><button id="xx">关</button></div>'));
    const d4 = await dt('a.musicxml', xml, 'application/xml');
    await pg.dispatchEvent('body', 'dragenter', { dataTransfer: d4 });
    r.otherMask = await pg.evaluate(() => { const m = document.getElementById('nf-dropmask'); return m ? { no: m.classList.contains('no'), txt: m.textContent } : null; });
    await pg.dispatchEvent('body', 'drop', { dataTransfer: d4 }); await pg.waitForTimeout(100);
    r.other = await pg.evaluate(() => ({ panel: !!document.querySelector('.nf-modal'), toast: window.__toasts.slice(-1)[0] || '' }));
    await pg.evaluate(() => closeModal());
    /* 谱面拖选照常（指针拖动不是 HTML5 拖放）：不出提示层，选区建立 */
    await pg.evaluate(() => { selRange = null; render(); });
    const c = sel => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
    const A = await c('[data-row="tab"][data-vi="0"][data-mi="0"][data-ci="0"]') || await c('[data-row="vox"][data-vi="0"][data-mi="0"][data-ci="0"]');
    const Z = await c('[data-row="tab"][data-vi="0"][data-mi="1"][data-ci="2"]') || await c('[data-row="vox"][data-vi="0"][data-mi="1"][data-ci="1"]');
    let maskDuring = false;
    if (A && Z) { await pg.mouse.move(A.x, A.y); await pg.mouse.down(); await pg.mouse.move((A.x + Z.x) / 2, (A.y + Z.y) / 2, { steps: 6 }); maskDuring = await pg.evaluate(() => !!document.getElementById('nf-dropmask'));
      await pg.mouse.move(Z.x, Z.y, { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(80); }
    r.dragSel = { A: !!A, Z: !!Z, maskDuring, range: await pg.evaluate(() => !!(selRange || measureRange)), panel: await pg.evaluate(() => !!document.querySelector('.nf-modal')) };
    await pg._ctx.close();
    T(r.mask && /松手：读文件，选做成哪种谱/.test(r.mask.txt) && r.mask.pe === 'none' && !r.drop.mask && r.drop.tab === 'import' && r.drop.src === 'ai' && /送别/.test(r.drop.name) && r.drop.rec === 'SJ'
      && r.inPanel.tab === 'import' && /不是能读的曲谱文件/.test(r.inPanel.alert) && !r.text && r.otherMask && r.otherMask.no && /先关掉当前对话框/.test(r.otherMask.txt) && !r.other.panel && /先关掉当前对话框/.test(r.other.toast)
      && r.dragSel.A && r.dragSel.Z && !r.dragSel.maskDuring && r.dragSel.range && !r.dragSel.panel,
      'I11 拖放：文件拖到窗口任意处出提示层（不挡指针），松手＝开面板「从已有音乐」读该文件（依据＋推荐教学对照谱）；面板在「新建」页也切过去并说明不支持的格式；拖文字不出提示层；别的对话框开着不接（拖动中提示层就写「先关掉当前对话框」）；谱面指针拖选照常（不出提示层、选区建立）',
      JSON.stringify(r));
  });

  /* ---------- I12 键盘 ---------- */
  await guard('I12 键盘', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg);
    const r = {};
    r.f0 = await pg.evaluate(() => { window.__ic = []; const c0 = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () { window.__ic.push(this.id + ':' + (navigator.userActivation ? navigator.userActivation.isActive : true)); return c0.call(this); }; return document.activeElement.dataset.isrc; });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), pg.keyboard.press('Enter')]);
    /* Enter＝在用户激活内调起文件选择框（#nw-anyfile.click()）。Playwright 截获键盘调起的选择框偶有漏报——漏报时以「激活内调起」为准，再把文件交给同一个输入框 */
    r.ic = await pg.evaluate(() => window.__ic.join());
    r.chooser = !!fc || r.ic === 'nw-anyfile:true';
    if (fc) await fc.setFiles(SONGBIE); else await pg.setInputFiles('#nw-anyfile', SONGBIE);
    await loaded(pg);
    await pg.focus('[data-act="tg"][data-v="SJ"]'); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight');
    r.tg = await pg.evaluate(() => document.querySelector('.nf-tg [aria-checked="true"]').dataset.v);
    await pg.evaluate(() => document.querySelector('.nf-mid').focus && 0); await pg.click('.nf-file b');
    const d0 = await pg.evaluate(() => docs.length);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
    r.enter = await pg.evaluate(d0 => ({ docs: docs.length - d0, k: NWB.stackOf(song), panel: !!document.querySelector('.nf-modal') }), d0);
    await toImport(pg); await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
    r.esc = await pg.evaluate(() => !!document.querySelector('.nf-modal'));
    await pg._ctx.close();
    T(r.f0 === 'file' && r.chooser && r.tg === 'JT' && r.enter.docs === 1 && r.enter.k === 'JT' && !r.enter.panel && !r.esc,
      'I12 键盘：打开即焦点在来源列表，Enter＝选择文件；做法单选 → 移动并选中（对照 → 配伴奏 → 吉他弹唱）；Enter＝导入所选；Esc 关', JSON.stringify(r));
  });

  /* ---------- I13 导入前不碰编辑器 ---------- */
  await guard('I13 导入前不碰编辑器', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); loadSong(PRESETS[3].make()); render(); mutate(() => { song.title += '·'; }); persistNow(); window.__s0 = song; });
    const snap = () => pg.evaluate(() => ({ s: localStorage.getItem('musetab-song-v1'), d: localStorage.getItem('musetab-docs-v1'), keys: Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().join(','),
      u: undoStack.length, r: redoStack.length, sel: JSON.stringify(sel), docs: docs.length, same: song === window.__s0, score: document.getElementById('score').innerHTML.length }));
    const a = await snap();
    await toImport(pg); await pick(pg, SONGBIE); await loaded(pg);
    for (const t of ['J', 'SJ', 'acc', 'JT', 'CJ', 'orig', 'acc']) { await pg.click('[data-act="tg"][data-v="' + t + '"]'); await pvDone(pg); }
    await pg.click('#nf-unload'); await pg.click('#nf-isrc-ex'); await pvDone(pg); await pg.click('#nf-ex-5'); await pvDone(pg);
    const mid = await snap();
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
    const z = await snap();
    await pg._ctx.close();
    const diff = Object.keys(a).filter(k => a[k] !== mid[k] || a[k] !== z[k]);
    T(!diff.length, 'I13 读文件、切 7 次做法、看示例期间：本机存储、全部 musetab-* 键、撤销 / 重做、选区、窗口数、编辑器谱面与 song 身份不变（导入才落地）', diff.join(',') || 'all same');
  });

  /* ---------- I14 手机 ---------- */
  await guard('I14 手机', async () => {
    const ph = await open(390, 844, { mob: true });
    await ph.evaluate(() => showNewWizard({ tab: 'import' })); await ph.waitForTimeout(150);
    const r = { page: await ph.evaluate(() => ({ cards: document.querySelectorAll('.nf-modal .nf-impc .nwi').length, src: !!document.getElementById('nf-isrc') })) };
    const d0 = await ph.evaluate(() => docs.length);
    await pick(ph, SONGBIE, '#nw-import'); await ph.waitForTimeout(300);
    r.done = await ph.evaluate(d0 => ({ docs: docs.length - d0, k: NWB.stackOf(song), panel: !!document.querySelector('.nf-modal'), basis: !!document.getElementById('nf-ibasis') }), d0);
    await ph._ctx.close();
    T(r.page.cards === 3 && !r.page.src && r.done.docs === 1 && r.done.k === 'S' && !r.done.panel && !r.done.basis,
      'I14 手机（拍板 1 看谱为主）：仍是三格式页，MusicXML 读进来按原文件直接打开（不出依据页）', JSON.stringify(r));
  });


  /* ---------- I15 命中区 ≥44 / 对比度 ≥4.5（浅 / 深）：读进文件后的依据页、示例做同款、接着做、录音说明、不支持格式说明（同 tv_newpanel T7 / T8 口径） ---------- */
  const PROBE = `(()=>{
    const vis=e=>{ const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && cs.display!=='none'; };
    const R=document.querySelector('.nf-modal'); const small=[];
    R.querySelectorAll('button,[role=option],[role=radio],select,input:not([type=file]),[role=tab]').forEach(e=>{ if(!vis(e)) return;
      const r=e.getBoundingClientRect(); if(r.width<43.5 || r.height<43.5) small.push((e.id||e.dataset.v||e.dataset.ex||e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height)); });
    const P=s=>{ const m=String(s).match(/[\\d.]+/g)||[0,0,0,0]; return [+m[0],+m[1],+m[2],m[3]==null?1:+m[3]]; };
    const lin=c=>{ c/=255; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
    const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
    const over=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]), f[1]*f[3]+b[1]*(1-f[3]), f[2]*f[3]+b[2]*(1-f[3]), 1];
    const bgOf=e=>{ const chain=[]; for(let x=e;x;x=x.parentElement){ chain.push(P(getComputedStyle(x).backgroundColor)); }
      let c=[255,255,255,1]; const root=P(getComputedStyle(document.body).backgroundColor); if(root[3]>0) c=root;
      for(let i=chain.length-1;i>=0;i--){ if(chain[i][3]>0) c=over(chain[i], c); } return c; };
    let min=99, at='', n=0; const w=document.createTreeWalker(R, NodeFilter.SHOW_TEXT); let t;
    while((t=w.nextNode())){ if(!t.data.trim()) continue; const e=t.parentElement; if(!vis(e) || e.closest('option,select,svg')) continue;
      const cs=getComputedStyle(e); const fg=P(cs.color); const bg=bgOf(e); const f2=fg[3]<1? over(fg,bg) : fg;
      const a=L(f2), b2=L(bg); const cr=(Math.max(a,b2)+0.05)/(Math.min(a,b2)+0.05); n++;
      if(cr<min){ min=cr; at=t.data.trim().slice(0,14)+' @'+(e.className||e.tagName); } }
    return { small, min:+min.toFixed(2), at, n };
  })()`;
  await guard('I15 命中区与对比度', async () => {
    let small = [], minC = 99, minAt = ''; const seen = {};
    const take = async (pg, tag) => { const r = await pg.evaluate(PROBE); small = small.concat(r.small.map(x => tag + ':' + x)); seen[tag] = r.n; if (r.min < minC) { minC = r.min; minAt = tag + ' ' + r.at; } };
    for (const theme of ['light', 'dark']) {
      const pg = await open(1280, 800);
      await pg.evaluate(t => { hideStartPad(); document.documentElement.dataset.theme = t; mutate(() => { song.title = '我的谱'; }); }, theme);
      await toImport(pg); await pick(pg, SONGBIE); await loaded(pg); await pvDone(pg); await take(pg, theme + '/read');
      await pg.click('#nf-unload'); await pick(pg, file('sab.musicxml', SAB)); await loaded(pg); await take(pg, theme + '/sab');
      await pg.click('#nf-isrc-ex'); await pvDone(pg); await take(pg, theme + '/ex');
      await pg.click('#nf-isrc-recent'); await take(pg, theme + '/recent');
      await pg.click('#nf-isrc-audio'); await take(pg, theme + '/audio');
      await pg.click('#nf-isrc-file'); await pg.click('#nf-unload');   /* 回到「打开或导入文件」时上一个文件的依据还在：先「换一个文件」 */
      await pick(pg, file('x.docx', 'x')); await pg.waitForTimeout(120); await take(pg, theme + '/err');
      await pg._ctx.close();
    }
    T(small.length === 0 && minC >= 4.5, 'I15 从已有音乐各页（依据 / 置灰做法 / 示例 / 接着做 / 录音说明 / 格式说明）浅色 / 深色：可点控件宽高全部 ≥44、文字对比度最低 ' + minC + '（≥4.5）',
      (small.join(', ') || 'none <44') + ' · ' + minAt + ' · ' + JSON.stringify(seen));
  });

  /* ================= v67.5 收尾（对抗式验收逐条修复的回归断言）================= */
  const fs = require('fs'), os = require('os');
  const { mx, melody } = require('./fixtures/mxl_build.js');
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nfimp-'));
  const onDisk = (name, data) => { const fp = path.join(TMP, name); fs.writeFileSync(fp, data); return fp; };
  /* 合成拖放（DragEvent＋DataTransfer(File)）：用于面板里已读文件后再拖入 */
  const synDrop = (pg, name, text) => pg.evaluate(([n, t]) => { const d = new DataTransfer(); d.items.add(new File([t], n, { type: 'application/xml' }));
    const tg = document.querySelector('.nf-modal') || document.body; ['dragenter', 'dragover', 'drop'].forEach(ty => tg.dispatchEvent(new DragEvent(ty, { bubbles: true, cancelable: true, dataTransfer: d }))); }, [name, text]);
  const cdpDrag = async (pg, fp, types) => { const cdp = await pg.context().newCDPSession(pg); const data = { items: [], files: [fp], dragOperationsMask: 1 };
    for (const [ty, x, y] of types) await cdp.send('Input.dispatchDragEvent', { type: ty, x, y, data }); return cdp; };
  const maskOf = pg => pg.evaluate(() => { const m = document.getElementById('nf-dropmask'); return m ? { no: m.classList.contains('no'), txt: m.textContent } : null; });

  /* ---------- I16 拖放拦截：打印预览 / 谱架 / 谱友圈广场 / 别的对话框开着（CDP 原生拖放，dropEffect=none 时浏览器不派发 drop） ---------- */
  await guard('I16 拖放拦截', async () => {
    const fp = onDisk('songbie.musicxml', songbieXML());   /* CDP 原生拖放的文件名用 ASCII（测试机上中文路径的文件拖进来 dataTransfer 为空） */
    const r = {};
    for (const [k, js, want] of [['preview', 'pvOpen()', /先关掉打印预览/], ['stand', 'enterStand()', /先退出谱架模式/], ['circle', 'openCircle()', /谱友圈广场/],
      ['modal', 'showModal(\'<h3>别的对话框</h3><div class="btns"><button id="xx">关</button></div>\')', /先关掉当前对话框/]]) {
      const pg = await open(1280, 800);
      await pg.evaluate(() => hideStartPad()); await pg.evaluate(js); await pg.waitForTimeout(250);
      const d0 = await pg.evaluate(() => docs.length);
      await cdpDrag(pg, fp, [['dragEnter', 640, 400], ['dragOver', 650, 410]]);
      const m = await maskOf(pg);
      await cdpDrag(pg, fp, [['drop', 650, 410]]); await pg.waitForTimeout(500);
      const mid = await pg.evaluate(() => ({ panel: !!(NWP.modal && NWP.modal.isConnected), st: !!NWP.state }));
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
      r[k] = { mask: m, want: !!(m && m.no && want.test(m.txt)), panel: mid.panel, st: mid.st, docs: (await pg.evaluate(() => docs.length)) - d0 };
      await pg._ctx.close();
    }
    T(Object.values(r).every(x => x.want && !x.panel && !x.st && x.docs === 0),
      'I16 打印预览 / 谱架模式 / 谱友圈广场 / 别的对话框开着时拖文件进来（真实浏览器拖放）：拖动中提示层就说明「先关掉……再拖进来」，松手不开面板、回车不在背后导入（同 Alt+N 口径）', JSON.stringify(r));
  });

  /* ---------- I17 1100 宽以下：「做成哪种谱」6 个做法在首屏；窗口缩窄时跟着挪；左栏底色铺满 ---------- */
  await guard('I17 紧凑档首屏', async () => {
    const r = {};
    const vis = pg => pg.evaluate(() => { const body = document.querySelector('.nf-body'), br = body.getBoundingClientRect(), inn = e => { const q = e.getBoundingClientRect(); return q.top >= br.top - 0.5 && q.bottom <= br.bottom + 0.5; };
      const tg = [...document.querySelectorAll('.nf-tg [role=radio]')], lab = document.getElementById('nf-tgl'), lb = document.querySelector('.nf-left').getBoundingClientRect();
      return { n: tg.length, inN: tg.filter(inn).length, label: inn(lab), rec: inn(document.querySelector('.nf-tg .nf-tag')), inMid: !!(tg[0] && tg[0].closest('.nf-mid')),
        gap: lb.bottom < br.bottom - 4, stripe: /gradient/.test(getComputedStyle(body).backgroundImage), sh: body.scrollHeight, ch: body.clientHeight }; });
    for (const [w, h] of [[1024, 700], [1024, 768], [1100, 800]]) {
      const pg = await open(w, h);
      await pg.evaluate(() => hideStartPad());
      await toImport(pg); await pick(pg, SONGBIE); await loaded(pg); await pvDone(pg);
      r[w + 'x' + h] = await vis(pg);
      await pg._ctx.close();
    }
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg); await pick(pg, SONGBIE); await loaded(pg); await pvDone(pg);
    r.wide = await pg.evaluate(() => !!document.querySelector('.nf-right .nf-tg'));
    await pg.setViewportSize({ width: 1024, height: 700 }); await pg.waitForTimeout(300);
    r.resized = await vis(pg);
    await pg._ctx.close();
    const ok = x => x.n === 6 && x.inN === 6 && x.label && x.rec && x.inMid && (!x.gap || x.stripe);
    T(['1024x700', '1024x768', '1100x800'].every(k => ok(r[k])) && r.wide && ok(r.resized),
      'I17 1024–1100 宽：读进文件后「做成哪种谱」标题、推荐项与 6 个做法全在首屏（放在依据与预览之间）；1280 时仍在右栏，面板开着把窗口缩到 1024 也跟着挪；左栏吸顶限高时下方灰底铺满不露白', JSON.stringify(r));
  });

  /* ---------- I18 读失败：点名文件、放下旧文件（回车不再导入旧文件）、未读文件时「导入」有禁用样式且点了有说明 ---------- */
  await guard('I18 读失败与禁用', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const d0 = await pg.evaluate(() => docs.length);
    await toImport(pg);
    const st0 = await pg.evaluate(() => { const g = document.getElementById('nf-impgo'); return { aria: g.getAttribute('aria-disabled'), dis: g.disabled, bg: getComputedStyle(g).backgroundColor, cur: getComputedStyle(g).cursor }; });
    await pg.click('#nf-impgo', { force: true }); await pg.waitForTimeout(100);
    const clk = await pg.evaluate(() => ({ alert: (document.querySelector('.nf-imperr[role=alert]') || {}).textContent || '', panel: !!document.querySelector('.nf-modal') }));
    await pick(pg, SONGBIE); await loaded(pg); await pvDone(pg);
    const st1 = await pg.evaluate(() => getComputedStyle(document.getElementById('nf-impgo')).backgroundColor);
    await pg.click('[data-act="tg"][data-v="acc"]'); await pvDone(pg);
    await synDrop(pg, 'broken.xml', '<?xml version="1.0"?><score-partwise><part'); await pg.waitForTimeout(250);
    const br = await pg.evaluate(() => ({ a: !!NWP.state.imp.a, alert: (document.querySelector('.nf-imperr[role=alert]') || {}).textContent || '', card: !!document.querySelector('.nf-file'),
      drop: !!document.querySelector('.nf-drop'), go: document.getElementById('nf-impgo').getAttribute('aria-disabled') }));
    await pg.click('#nf-impgo', { force: true }); await pg.waitForTimeout(150);
    const after = await pg.evaluate(d0 => ({ docs: docs.length - d0, panel: !!document.querySelector('.nf-modal') }), d0);
    /* 坏的 Guitar Pro / 一次两个文件后切做法：错误条点名 / 切做法后清掉 */
    await synDrop(pg, '坏谱.gp5', 'not a gp file'); await pg.waitForTimeout(250);
    const gp = await pg.evaluate(() => (document.querySelector('.nf-imperr[role=alert]') || {}).textContent || '');
    await pg.evaluate(x => { const d = new DataTransfer(); d.items.add(new File([x], 'a.musicxml', { type: 'application/xml' })); d.items.add(new File(['x'], 'b.txt'));
      const tg = document.querySelector('.nf-modal'); ['dragenter', 'dragover', 'drop'].forEach(ty => tg.dispatchEvent(new DragEvent(ty, { bubbles: true, cancelable: true, dataTransfer: d }))); }, songbieXML());
    await loaded(pg);
    const many = await pg.evaluate(() => NWP.state.imp.err);
    await pg.click('[data-act="tg"][data-v="J"]'); await pg.waitForTimeout(80);
    const cleared = await pg.evaluate(() => ({ err: NWP.state.imp.err, alert: !!document.querySelector('.nf-imperr') }));
    await pg._ctx.close();
    T(st0.aria === 'true' && !st0.dis && st0.bg !== st1 && st0.cur === 'default' && /还没有读进文件/.test(clk.alert) && clk.panel
      && !br.a && /「broken\.xml」导入失败/.test(br.alert) && !br.card && br.drop && br.go === 'true' && after.docs === 0 && after.panel
      && /「坏谱\.gp5」导入失败/.test(gp) && /一次读一个文件/.test(many) && !cleared.err && !cleared.alert,
      'I18 未读文件时「导入」是灰底禁用样式（aria-disabled），点了说明「还没有读进文件」；已读文件后再拖入坏文件：报错点名「broken.xml」、放下旧文件回到拖放区（再点导入不会导入旧文件）；坏 GP 同样点名；提示条在切做法时清掉',
      JSON.stringify({ st0, st1, clk, br, after, gp, many, cleared }));
  });

  /* ---------- I19 依据口径：拍号没写 / 被改写、只有六线谱、钢琴大谱表、普通软件文件从「整理 AI 转谱结果」进来 ---------- */
  await guard('I19 依据口径', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const F = {
      notime: mx({ title: 'NoTime', fifths: 2, time: null, parts: [{ name: 'V', measures: melody(4) }] }),
      m316: mx({ title: 'x16', fifths: 0, time: [3, 16], parts: [{ name: 'V', measures: [[{ p: 'C5', d: 1 }, { p: 'D5', d: 1 }, { p: 'E5', d: 1 }], [{ p: 'C5', d: 1 }, { p: 'D5', d: 1 }, { p: 'E5', d: 1 }]] }] }),
      tab: mx({ title: 'Tab', fifths: 0, time: [4, 4], parts: [{ name: 'Guitar', clef: 'TAB', measures: [[{ p: 'E4', d: 2, s: 1, f: 0 }, { p: 'B3', d: 2, s: 2, f: 0 }, { p: 'G3', d: 2, s: 3, f: 0 }, { p: 'D3', d: 2, s: 4, f: 0 }]] }] }),
      piano: mx({ title: 'Piano', fifths: 0, time: [4, 4], parts: [{ name: 'Piano', staves: 2, measures: melody(4).map((rh, i) => [rh, melody(1, { oct: 3, seq: [1, 5, 1, 5] })[0]]) }] }),
      ms: mx({ title: 'MS', sw: 'MuseScore 4.3.2', fifths: 1, time: [3, 4], parts: [{ name: 'Flute', measures: melody(4, { per: 3 }) }] }),
    };
    const r = {};
    for (const k of Object.keys(F)) {
      await toImport(pg); if (k === 'ms') await pg.click('#nf-isrc-ai'); else await pg.click('#nf-isrc-file');
      if (await pg.$('#nf-unload')) await pg.click('#nf-unload');
      await pick(pg, file(k + '.musicxml', F[k])); await loaded(pg);
      r[k] = { bs: await basis(pg), card: await pg.evaluate(() => document.querySelector('.nf-file span').textContent), rec: await pg.evaluate(() => NWP.state.imp.a.recommend) };
      await pg.keyboard.press('Escape');
    }
    await pg._ctx.close();
    T(r.notime.bs[1] === '4/4 · ♩=90 ‖ 文件没写拍号，按 4/4；速度文件没写，按默认'
      && r.m316.bs[1] === '3/4 · ♩=90 ‖ 3/16 拍暂不支持，按 3/4；速度文件没写，按默认' && !r.m316.bs.some(x => /其他记号/.test(x))
      && r.tab.bs[2] === '只有 1 条六线谱 ‖ 按内容' && !r.tab.bs.some(x => /简谱|0 声部/.test(x))
      && r.piano.bs[2] === '钢琴 · 大谱表 2 行 · 无歌词 ‖ 按内容' && /钢琴 · 大谱表 2 行/.test(r.piano.card)
      && r.ms.bs.includes('来源：MuseScore 4.3.2 ‖ 按文件；你选了「整理 AI 转谱结果」→ 按 AI 转谱结果处理') && r.ms.rec === 'SJ' && r.ms.bs.includes('推荐：教学对照谱 ‖ 单旋律，课堂最常用五线＋简谱对照'),
      'I19 依据：没写拍号写「文件没写拍号，按 4/4」、3/16 写「暂不支持，按 3/4」（不再重复算一处跳过）；只有六线谱写「只有 1 条六线谱」（不写简谱 / 0 声部）；钢琴一个 part 两行写「钢琴 · 大谱表 2 行」；普通软件文件从「整理 AI 转谱结果」进来写明「你选了…」再推荐对照谱',
      JSON.stringify(r));
  });

  /* ---------- I20 做法产物：低音谱号配伴奏保留谱号、人声＋钢琴转简谱＝钢琴伴奏歌谱、钢琴两手谱不整份转简谱 / 对照另起名、吉他弹唱折八度要说 ---------- */
  await guard('I20 做法产物', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => hideStartPad());
    const F = {
      bass: mx({ title: 'Cello', fifths: 0, time: [4, 4], parts: [{ name: 'Vc', clef: 'F', measures: melody(4, { oct: 2 }) }] }),
      vp: mx({ title: 'VP', fifths: 0, time: [4, 4], parts: [{ name: 'Voice', measures: melody(4, { ly: 1 }) }, { name: 'Piano', staves: 2, measures: melody(4).map(rh => [rh, melody(1, { oct: 3, seq: [1, 5, 1, 5] })[0]]) }] }),
      piano: mx({ title: 'Piano', fifths: 0, time: [4, 4], parts: [{ name: 'Piano', staves: 2, measures: melody(4).map(rh => [rh, melody(1, { oct: 3, seq: [1, 5, 1, 5] })[0]]) }] }),
      high: mx({ title: 'High', fifths: 0, time: [4, 4], parts: [{ name: 'Picc', measures: melody(4, { oct: 6 }) }] }),
    };
    const r = {};
    const go = async (k, t) => { await toImport(pg); if (await pg.$('#nf-unload')) await pg.click('#nf-unload'); await pick(pg, file(k + '.musicxml', F[k])); await loaded(pg);
      if (t) { await pg.click('[data-act="tg"][data-v="' + t + '"]'); await pvDone(pg); } };
    await go('bass', 'acc');
    r.bassPv = await pg.evaluate(() => NWP.state.imp.a.cv.acc.voxNotations.join());
    await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    r.bass = await pg.evaluate(() => ({ vn: song.voxNotations.join(), k: NWB.stackOf(song) }));
    await go('vp', 'J');
    r.vpKind = await pg.evaluate(() => document.getElementById('nf-impkind').textContent);
    await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    r.vp = await pg.evaluate(() => ({ vn: song.voxNotations.map(x => x || 'J').join(), k: NWB.stackOf(song), label: docTypeLabel(song) }));
    await go('piano');
    r.piano = await pg.evaluate(() => ({ J: [document.getElementById('nf-tg-J').getAttribute('aria-disabled'), document.querySelector('#nf-tg-J small').textContent],
      SJ: document.querySelector('#nf-tg-SJ small').textContent, orig: document.querySelector('#nf-tg-orig small').textContent }));
    await pg.click('[data-act="tg"][data-v="SJ"]'); await pvDone(pg);
    r.pianoGo = await pg.evaluate(() => document.getElementById('nf-impkind').textContent);
    await pg.keyboard.press('Escape');
    await go('high', 'JT');
    r.high = await pg.evaluate(() => ({ small: document.querySelector('#nf-tg-JT small').textContent, cap: document.querySelector('#nf-pv figcaption').textContent }));
    await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    r.highToast = await pg.evaluate(() => window.__toasts.slice(-1)[0] || '');
    await pg._ctx.close();
    T(r.bassPv === 'bass,staff,bass' && r.bass.vn === 'bass,staff,bass' && r.bass.k === 'SG'
      && r.vpKind === '钢琴伴奏歌谱' && r.vp.vn === 'J,staff,bass' && r.vp.k === 'JG' && r.vp.label === '钢琴伴奏歌谱'
      && r.piano.J[0] === 'true' && /钢琴两手谱不整份转/.test(r.piano.J[1]) && r.piano.SJ === '→ 钢琴独奏谱（五线＋简谱对照）' && r.piano.orig === '不改记谱 · 钢琴独奏谱' && r.pianoGo === '钢琴独奏谱（五线＋简谱对照）'
      && /\d+ 个音超出把位，六线谱折了八度/.test(r.high.small) && /折了八度/.test(r.high.cap) && /折了八度/.test(r.highToast),
      'I20 低音谱号旋律「配钢琴伴奏」保留低音谱号（预览＝导入）；人声＋钢琴「转成简谱」只转旋律行＝钢琴伴奏歌谱；钢琴两手谱「转成简谱」置灰写原因、「对照」叫「钢琴独奏谱（五线＋简谱对照）」与按原文件分得开；超出把位的旋律「生成吉他弹唱」在按钮小字、预览说明、导入提示里写明折了八度',
      JSON.stringify(r));
  });

  /* ---------- I21 预览＝导入后整首的首行（断行是全曲 DP，不再截前 6 小节） ---------- */
  await guard('I21 预览整首首行', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => hideStartPad());
    const m = melody(32, { ly: 1 }); for (let i = 0; i < 32; i += 3) m[i] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].map(p => ({ p, d: 1 }));
    const LONG = mx({ title: 'Long', sw: 'Basic Pitch', fifths: 0, time: [4, 4], parts: [{ name: 'V', measures: m }] });
    const r = {};
    for (const t of ['orig', 'J', 'CJ']) {
      await toImport(pg); if (await pg.$('#nf-unload')) await pg.click('#nf-unload');
      await pick(pg, file('long.musicxml', LONG)); await loaded(pg); await pvDone(pg);
      await pg.click('[data-act="tg"][data-v="' + t + '"]'); await pvDone(pg);
      const pv = await pg.evaluate(() => ({ svg: document.querySelector('#nf-pvbox svg').innerHTML, paint: Math.round(((NWP.pvStats || []).slice(-1)[0] || {}).paint || 0) }));
      await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
      const real = await pg.evaluate(() => { const s = JSON.parse(JSON.stringify(song)); delete s.layout; delete s.id;
        const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); renderOffscreen({ song: s, target: sv, maxSystems: 1, paperW: 660, invert: false }); return { svg: sv.innerHTML, n: song.measures.length }; });
      r[t] = { same: pv.svg === real.svg, n: real.n, paint: pv.paint };
    }
    await pg._ctx.close();
    T(Object.values(r).every(x => x.same && x.n === 32), 'I21 32 小节长谱（疏密不均）：预览与导入后整首的首行逐字节一致（按原文件 / 转简谱 / 级数和弦）——此前截前 6 小节再排，首行间距与导入后不同', JSON.stringify(r));
  });

  /* ---------- I22 谱友圈文件（.mtab.json）保留入库 id（同顶栏「打开」）；同一份已在别的窗口开着才另作一份 ---------- */
  await guard('I22 mtab 保留 id', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const j = await pg.evaluate(() => { const s = createSong('tanchang', { inst: 'guitar', title: '库里的吉他谱', key: 'G', nMea: 2, nTab: 1, nVox: 1, lyr: 1 }); s.id = 'sMT1'; delete s.tabNota;
      const lib = libLoad(); lib.push({ id: 'sMT1', title: '库里的吉他谱', data: JSON.parse(JSON.stringify(s)), mtime: 1, updatedAt: '昨天' }); libSave(lib); return JSON.stringify(s); });
    await toImport(pg); await pg.click('#nf-isrc-file'); await pick(pg, file('库里的吉他谱.mtab.json', j)); await pg.waitForTimeout(300);
    const a = await pg.evaluate(() => ({ id: song.id || null, nota: song.tabNota || null, docs: docs.length }));
    await pg.evaluate(() => { mutate(() => { song.measures[0].voxes[0][0].deg = 3; }); saveToLibrary(); });
    const libN = await pg.evaluate(() => libLoad().filter(x => x.title === '库里的吉他谱').length);
    await toImport(pg); await pg.click('#nf-isrc-file'); await pick(pg, file('库里的吉他谱.mtab.json', j)); await pg.waitForTimeout(300);
    const b2 = await pg.evaluate(() => ({ id: song.id || null, docs: docs.length, toast: window.__toasts.slice(-1)[0] || '' }));
    await pg._ctx.close();
    T(a.id === 'sMT1' && (a.nota === 'num' || a.nota === 'x') && libN === 1 && !b2.id && b2.docs === a.docs + 1 && /副本/.test(b2.toast),
      'I22 拖入 / 选择 .mtab.json：保留入库 id、补记谱风格（同顶栏「打开」），改完存入我的曲谱仍是一条（不多出同名谱）；同一份已在别的窗口开着时才另作副本并说明', JSON.stringify({ a, libN, b2 }));
  });

  /* ---------- I23 接着做：份数写实数，打开中的窗口按最近切换 / 编辑排序 ---------- */
  await guard('I23 接着做排序', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); mutate(() => { song.title = '窗口0'; });
      for (let i = 1; i <= 8; i++) { const s = createSong('vocal', { title: '窗口' + i, nMea: 2, nVox: 1 }); s.measures[0].voxes[0][0].deg = 1 + (i % 7); addDoc(s); }
      switchDocTo(3); mutate(() => { song.title = '窗口3改'; }); switchDocTo(8); });
    await toImport(pg);
    const small = await pg.evaluate(() => document.querySelector('#nf-isrc-recent small').textContent);
    await pg.click('#nf-isrc-recent');
    const list = await pg.evaluate(() => [...document.querySelectorAll('#nf-rcl [role=option] b')].map(b => b.textContent));
    await pg._ctx.close();
    T(/等 9 份/.test(small) && list[0] === '窗口8' && list[1] === '窗口3改' && list[2] === '窗口7' && list.length === 7,
      'I23 接着做：左栏写实际份数（9 份，不是列表上限 6）；当前窗口在前，其余按最近切换 / 编辑倒序（刚改过的窗口 3、最近建的窗口 7 排在前面）', JSON.stringify({ small, list }));
  });

  /* ---------- I24 拖放区整块可点；「试一试」用内置示例文件《送别（AI 转谱）》走一遍 ---------- */
  await guard('I24 拖放区与试一试', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await toImport(pg); await pg.click('#nf-isrc-ai');
    const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), pg.click('.nf-drop > b')]);
    const cur = await pg.evaluate(() => getComputedStyle(document.querySelector('.nf-drop')).cursor);
    await pg.click('#nf-demo'); await loaded(pg); await pvDone(pg);
    const a = await pg.evaluate(() => ({ name: NWP.state.imp.a.name, src: NWP.state.imp.src, rec: NWP.state.imp.a.recommend, n: NWP.state.imp.a.measures, sw: NWP.state.imp.a.software }));
    const d0 = await pg.evaluate(() => docs.length);
    await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    const out = await pg.evaluate(d0 => ({ docs: docs.length - d0, k: NWB.stackOf(song), ly: song.measures[0].voxes[0].map(c => c.lyrics[0] || '').join(''), tempo: song.tempo }), d0);
    await pg._ctx.close();
    T(!!fc && cur === 'pointer' && a.name === '送别（AI 转谱）.musicxml' && a.src === 'ai' && a.rec === 'SJ' && a.n === 8 && /AI Music Transcriber/.test(a.sw) && out.docs === 1 && out.k === 'SJ' && out.ly === '长亭外' && out.tempo === 66,
      'I24 拖放区整块可点开选择框（点标题也行）；「试一试：用示例文件《送别（AI 转谱）》」读内置示例：依据按 AI 转谱、推荐教学对照谱，导入后音符歌词速度与示例一致', JSON.stringify({ fc: !!fc, cur, a, out }));
  });

  /* ---------- I25 提示层兜底收起：拖动被取消（不发 dragleave）后指针一动就收；1.5 秒没有 dragover 也收（再拖动会重新出现） ---------- */
  await guard('I25 提示层兜底', async () => {
    const fp = onDisk('songbie2.musicxml', songbieXML());
    const r = {};
    let pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    await cdpDrag(pg, fp, [['dragEnter', 640, 400], ['dragOver', 650, 410]]); r.on = !!(await maskOf(pg));
    await cdpDrag(pg, fp, [['dragCancel', 650, 410]]); r.afterCancel = !!(await maskOf(pg));
    await pg.mouse.move(300, 300); await pg.mouse.move(320, 320); r.afterMove = !!(await maskOf(pg));
    await pg._ctx.close();
    /* 另开一页：拖着不动（无 dragover）1.5 秒后收起，再有 dragover 又出现 */
    pg = await open(1280, 800);
    await pg.evaluate(() => hideStartPad());
    const cdp = await cdpDrag(pg, fp, [['dragEnter', 640, 400], ['dragOver', 650, 410]]); r.on2 = !!(await maskOf(pg));
    await pg.waitForTimeout(1900); r.idle = !!(await maskOf(pg));
    await cdp.send('Input.dispatchDragEvent', { type: 'dragOver', x: 700, y: 300, data: { items: [], files: [fp], dragOperationsMask: 1 } }); r.back = !!(await maskOf(pg));
    await cdp.send('Input.dispatchDragEvent', { type: 'dragCancel', x: 660, y: 420, data: { items: [], files: [fp], dragOperationsMask: 1 } }); await pg.mouse.move(100, 100);
    r.panel = await pg.evaluate(() => !!document.querySelector('.nf-modal'));
    await pg._ctx.close();
    T(r.on && !r.afterMove && r.on2 && !r.idle && r.back && !r.panel, 'I25 拖动被取消（CDP dragCancel，不发 dragleave）后指针一动提示层就收起；拖着不动超过 1.5 秒也收起，再拖动重新出现；全程不开面板', JSON.stringify(r));
  });

  /* ---------- I26 对照行不撞：低音区旋律（低音谱号 C2 起 / 高音谱号 G3–B3）做成教学对照谱，下加线符头与简谱数字净距 ≥2px ---------- */
  await guard('I26 对照行避让', async () => {
    const pg = await open(1440, 900);
    await pg.evaluate(() => hideStartPad());
    const F = { bass: mx({ title: 'Cello', fifths: 0, time: [4, 4], parts: [{ name: 'Vc', clef: 'F', measures: melody(4, { oct: 2 }) }] }),
      low: mx({ title: 'Low', sw: 'AI Music Transcriber 2.1', fifths: 0, time: [4, 4], parts: [{ name: 'V', measures: [[{ p: 'G3', d: 2 }, { p: 'A3', d: 2 }, { p: 'B3', d: 2 }, { p: 'C4', d: 2 }], [{ p: 'B3', d: 2 }, { p: 'A3', d: 2 }, { p: 'G3', d: 4 }]] }] }) };
    const r = {};
    for (const k of Object.keys(F)) {
      await toImport(pg); if (await pg.$('#nf-unload')) await pg.click('#nf-unload');
      await pick(pg, file(k + '.musicxml', F[k])); await loaded(pg);
      await pg.click('[data-act="tg"][data-v="SJ"]'); await pvDone(pg);
      await pg.click('#nf-impgo'); await pg.waitForTimeout(250);
      r[k] = await pg.evaluate(() => { const svg = document.getElementById('score');
        const R = e => { const q = e.getBoundingClientRect(); return e.tagName === 'line' ? { top: q.top - 0.5, bottom: q.bottom + 0.5 } : q; };
        const ds = ['noteheadBlack', 'noteheadHalf', 'noteheadWhole'].map(n => SMUFL[n].d);
        const hs = [...svg.querySelectorAll('path')].filter(p => ds.includes(p.getAttribute('d'))).map(R), led = [...svg.querySelectorAll('line')].filter(l => +l.getAttribute('stroke-width') === 0.9).map(R);
        const digs = [...svg.querySelectorAll('text')].filter(t => /^[1-7]$/.test(t.textContent) && t.getAttribute('font-size') === '17').map(R);
        const dots = [...svg.querySelectorAll('circle')].map(R).filter(c => digs.some(d => c.bottom <= d.top + 1 && c.bottom >= d.top - 9));
        const low = Math.max(...hs.map(h => h.bottom), ...led.map(l => l.bottom)), top = Math.min(...digs.map(d => d.top), ...dots.map(d => d.top));
        return { k: NWB.stackOf(song), vn: song.voxNotations.join(), heads: hs.length, digs: digs.length, clear: +(top - low).toFixed(1) }; });
    }
    await pg._ctx.close();
    T(Object.values(r).every(x => x.k === 'SJ' && x.heads >= 6 && x.digs >= 6 && x.clear >= 2) && r.bass.vn === 'bass',
      'I26 低音区旋律做成教学对照谱（低音谱号 C2 起 / 高音谱号第一、二条下加线附近的 G3–B3）：下加线符头与加线不压简谱数字与高音点（净距 ≥2px）', JSON.stringify(r));
  });

  /* ---------- I27 新建预览＝真实首行：钢琴弹唱谱（纯伴奏）按歌词段数留词位；有制谱人时页头印「制谱：」 ---------- */
  await guard('I27 新建预览一致', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => { hideStartPad(); profileSave({ maker: '张老师' }); });
    await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]');
    await pg.click('[data-scene="pacc"]'); await pg.click('[data-act="var"][data-k="acc"][data-v="pure"]');
    await pg.click('[data-act="more"]'); await pg.selectOption('#nf-lyr', '3'); await pvDone(pg);
    const pv = await pg.evaluate(() => { const i = NWP.pvInfo(); const svg = document.querySelector('#nf-pvbox svg');
      return { k: NWP.stackOfState(NWP.state), h: Object.entries(i.boxes).sort((a, b) => a[1].y - b[1].y).map(([k, b]) => k.split(':')[0] + '@' + Math.round(b.h)).join(), maker: [...svg.querySelectorAll('text')].some(t => /张老师/.test(t.textContent)) }; });
    await pg.click('#nw-create'); await pg.waitForFunction(() => !document.querySelector('.nf-modal')); await pg.waitForTimeout(150);
    const real = await pg.evaluate(() => { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const r = renderOffscreen({ song, target: sv, maxSystems: 1, paperW: 660, invert: false });
      return { h: Object.entries(r.boxes).filter(([k]) => /:0:0$/.test(k)).sort((a, b) => a[1].y - b[1].y).map(([k, b]) => k.split(':')[0] + '@' + Math.round(b.h)).join(), maker: [...sv.querySelectorAll('text')].some(t => /张老师/.test(t.textContent)), ll: song.lyricLines }; });
    await pg._ctx.close();
    T(pv.k === 'CG' && pv.h === real.h && real.ll === 3 && pv.maker && real.maker,
      'I27 新建预览与建成后的首行一致：钢琴弹唱谱（纯伴奏）选 3 段词，预览同样留 3 段词位（行高相同）；个人资料有制谱人时预览页头同样印「制谱：张老师」', JSON.stringify({ pv, real }));
  });

  /* ---------- I28 落地对接谱型条：导入 / 示例做同款落地后直接调 LBAR.open（同版 B 侧），并照发 pq-landed ---------- */
  await guard('I28 落地对接', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); window.__lb = []; window.__ev = []; /* v67.5 合并后 LBAR 是页面顶层 const（B 侧真身）：包住真 open 记录调用并照常执行，不能再用 window.LBAR 替身 */ if (typeof LBAR !== 'undefined' && LBAR && LBAR.open) { const o0 = LBAR.open; LBAR.open = o => { window.__lb.push(o); return o0.call(LBAR, o); }; } else { window.LBAR = { open: o => window.__lb.push(o) }; } document.addEventListener('pq-landed', e => window.__ev.push(e.detail)); });
    await toImport(pg); await pick(pg, SONGBIE); await loaded(pg); await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    await toImport(pg); await pg.click('#nf-isrc-ex'); await pg.click('#nf-exgo'); await pg.waitForTimeout(200);
    const r = await pg.evaluate(() => ({ lb: window.__lb, ev: window.__ev.map(d => d.from + ':' + d.target + ':' + d.stack) }));
    await pg._ctx.close();
    T(r.lb.length === 2 && r.lb[0].from === 'import' && r.lb[0].target === 'SJ' && r.lb[1].from === 'example' && r.ev.join() === 'import:SJ:SJ,example:same:SJ',
      'I28 导入 / 示例做同款落地后直接调谱型条 LBAR.open（合并 B 侧即可显示 F13 的谱型条），同时照发 pq-landed 事件', JSON.stringify(r));
  });

  /* ========== 第二轮验收回归（修前＝r3/pre.html 红、修后绿） ========== */
  const lbGeo = pg => pg.evaluate(() => ({ lb: !!document.querySelector('#lb-wrap .lb-bar'), top: Math.round(document.getElementById('score').getBoundingClientRect().top),
    from: ((typeof LBAR !== 'undefined' && LBAR.meta && LBAR.meta()) || {}).from || null, st: Math.round((document.getElementById('score-wrap') || {}).scrollTop || 0) }));
  const clickNote = async pg => { const pt = await pg.evaluate(() => { const svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.width / svg.viewBox.baseVal.width, b2 = colBoxes['v0:1:0'] || colBoxes['v0:0:0'];
    return { x: R.left + (b2.x + b2.w / 2) * k, y: R.top + (b2.y + b2.h / 2) * k }; }); await pg.mouse.click(pt.x, pt.y); await pg.waitForTimeout(200); };
  const synthDrop = (pg, name, text, sel) => pg.evaluate(([n, x, s]) => { const f = new File([x], n, { type: 'application/xml' }); const d = new DataTransfer(); d.items.add(f);
    const tg = document.querySelector(s) || document.body; ['dragenter', 'dragover', 'drop'].forEach(ty => tg.dispatchEvent(new DragEvent(ty, { bubbles: true, cancelable: true, dataTransfer: d, clientX: 600, clientY: 400 }))); }, [name, text, sel || '#score']);

  /* ---------- I29 落地即有谱型条（major）：导入 / 拖放导入 / 示例做同款（连做两份）落地后谱型条立即在、第一次点音符谱面不下移；只看示例 / 手机不挂；新窗口从谱首看起 ---------- */
  await guard('I29 落地即有谱型条', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => { hideStartPad(); const s = createSong('vocal', { title: '长谱', nMea: 64, nVox: 1 }); addDoc(s); render(); const sw = document.getElementById('score-wrap'); sw.scrollTop = 600; });
    const r = { scrolled: await pg.evaluate(() => document.getElementById('score-wrap').scrollTop) };
    await toImport(pg); await pg.click('#nf-isrc-ai'); await pg.click('#nf-demo'); await loaded(pg); await pvDone(pg);
    await pg.click('#nf-impgo'); await pg.waitForTimeout(150);
    r.demo0 = await lbGeo(pg); r.demoToast = await pg.evaluate(() => window.__toasts.slice(-1)[0] || '');
    await clickNote(pg); r.demo1 = await lbGeo(pg);
    await synthDrop(pg, 'drop.musicxml', songbieXML()); await loaded(pg); await pvDone(pg);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    r.drop0 = await lbGeo(pg); await clickNote(pg); r.drop1 = await lbGeo(pg);
    r.ex = [];
    for (const i of [0, 2]) {
      await toImport(pg); await pg.click('#nf-isrc-ex'); await pg.click('[data-ex="' + i + '"]'); await pg.click('#nf-exgo'); await pg.waitForTimeout(150);
      r.ex.push(await lbGeo(pg));
    }
    await toImport(pg); await pg.click('#nf-isrc-ex'); await pg.click('[data-ex="1"]'); await pg.click('#nf-exopen'); await pg.waitForTimeout(150);
    r.exOpen = await lbGeo(pg);
    await pg._ctx.close();
    const ph = await open(390, 844, { mob: true });
    await ph.evaluate(() => showNewWizard({ tab: 'import' })); await ph.waitForTimeout(150);
    await pick(ph, SONGBIE, '#nw-import'); await ph.waitForTimeout(300);
    await ph.tap('#score').catch(() => {}); await ph.waitForTimeout(200);
    r.mob = await ph.evaluate(() => ({ lb: !!document.getElementById('lb-wrap'), meta: (typeof LBAR !== 'undefined' && LBAR.meta()) || null, k: NWB.stackOf(song) }));
    await ph._ctx.close();
    T(r.scrolled >= 500 && r.demo0.lb && r.demo0.from === 'import' && r.demo0.st === 0 && r.demo1.lb && r.demo1.top === r.demo0.top && /谱型条/.test(r.demoToast)
      && r.drop0.lb && r.drop1.top === r.drop0.top && r.ex.every(x => x.lb && x.from === 'example') && !r.exOpen.lb && !r.exOpen.from && !r.mob.lb && !r.mob.meta && r.mob.k === 'S',
      'I29 导入（试一试《送别》）/ 拖进窗口导入 / 示例做同款（连做两份）落地后谱型条立即在（此前要等第一次点击才冒出、谱面下移 74px），点音符前后谱面不动；落地提示提到谱型条；新窗口从谱首看起（上一个窗口滚了 600px）；「只看示例」与曲谱库打开同口径不挂；手机导入不挂', JSON.stringify(r));
  });

  /* ---------- I30 .mtab.json 不覆盖「我的曲谱」里内容不同的同 id 谱（major）：面板选择 / 顶栏「打开」都按副本打开；内容相同仍沿用 id ---------- */
  await guard('I30 mtab 不覆盖', async () => {
    const pg = await open(1280, 800);
    const j = await pg.evaluate(() => { hideStartPad();
      const mk = n => { const s = createSong('vocal', { title: '我的谱', nMea: n, nVox: 1 }); s.measures[0].voxes[0][0].deg = 3; s.id = 'sCL1'; return s; };
      const nw = mk(8), old = mk(2); const lib = libLoad(); lib.push({ id: 'sCL1', title: '我的谱', data: JSON.parse(JSON.stringify(nw)), mtime: 2000000000, updatedAt: '新' }); libSave(lib);
      window.__push = []; window.scheduleCloudPush = id => window.__push.push(id); window.scoreCloudPush = id => window.__push.push(id); window.PYQ_CLOUD = 1;
      return { old: JSON.stringify(old), same: JSON.stringify(nw) }; });
    const lib = () => pg.evaluate(() => { persistNow(); const e = libLoad().find(x => x.id === 'sCL1'); return { mea: e.data.measures.length, upd: e.updatedAt, push: window.__push.length, id: song.id || null, n: song.measures.length, toast: window.__toasts.slice(-1)[0] || '' }; });
    await toImport(pg); await pg.click('#nf-isrc-file'); await pick(pg, file('我的谱.mtab.json', j.old)); await pg.waitForTimeout(300);
    const a = await lib();
    const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), pg.click('#b-open')]);
    await fc.setFiles(file('我的谱.mtab.json', j.old)); await pg.waitForTimeout(300);
    const t = await lib();
    await toImport(pg); await pg.click('#nf-isrc-file'); await pick(pg, file('我的谱.mtab.json', j.same)); await pg.waitForTimeout(300);
    const s = await lib();
    await pg.evaluate(() => { window.PYQ_CLOUD = 0; });
    await pg._ctx.close();
    T(a.mea === 8 && a.upd === '新' && a.push === 0 && !a.id && a.n === 2 && /不覆盖/.test(a.toast) && t.mea === 8 && t.upd === '新' && !t.id && t.n === 2 && /不覆盖/.test(t.toast)
      && s.id === 'sCL1' && s.n === 8,
      'I30 拖入 / 选择 / 顶栏「打开」一份较早导出的同 id .mtab.json：「我的曲谱」里那一条（8 小节）不被自动保存改回文件内容（2 小节）、不推云端，按副本打开并说明；内容相同的仍沿用 id', JSON.stringify({ a, t, s }));
  });

  /* ---------- I31 个人中心整页开着时拖文件进来：拦下并说明（同 Alt+N），面板不开、不在背后导入 ---------- */
  await guard('I31 个人中心拦拖放', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); openPersonal('mine'); }); await pg.waitForTimeout(200);
    const d0 = await pg.evaluate(() => docs.length);
    await pg.evaluate(x => { const f = new File([x], 'a.musicxml', { type: 'application/xml' }); const d = new DataTransfer(); d.items.add(f); const tg = document.getElementById('pcenter') || document.body;
      ['dragenter', 'dragover'].forEach(ty => tg.dispatchEvent(new DragEvent(ty, { bubbles: true, cancelable: true, dataTransfer: d }))); }, songbieXML());
    const mask = await pg.evaluate(() => { const m = document.getElementById('nf-dropmask'); return m ? m.dataset.why + '|' + m.textContent : null; });
    await synthDrop(pg, 'a.musicxml', songbieXML(), '#pcenter'); await pg.waitForTimeout(200);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    const r = await pg.evaluate(d0 => ({ panel: !!document.querySelector('.nf-modal'), docs: docs.length - d0, pc: !!document.getElementById('pcenter'), toast: window.__toasts.slice(-1)[0] || '' }), d0);
    await pg._ctx.close();
    T(/^pcenter\|/.test(mask || '') && /个人中心/.test(mask) && !r.panel && r.docs === 0 && r.pc && /个人中心/.test(r.toast),
      'I31 个人中心（#pcenter）开着时拖入 MusicXML：拖动中提示「先回到制谱器（关掉个人中心）」，松手不开面板、回车不在背后导入（此前面板开在个人中心之上、导入的窗口落在它背后）', JSON.stringify({ mask, r }));
  });

  /* ---------- I32 对照行单条下加线避让按系统算：只有含 B3 的那一行简谱下移，其余行不动（整谱只多出一行的让位量） ---------- */
  await guard('I32 对照行按行让位', async () => {
    const pg = await open(1366, 900);
    const r = await pg.evaluate(() => { hideStartPad(); const LOW = 7;
      const mk = low => { const s = NWB.build('SJ', { title: 'Dual', key: 'C', beats: 4, unit: 4, tempo: 90, nMea: 24, lyr: 1 });
        s.measures.forEach((m, mi) => { m.voxes[0] = [3, 4, 5, 4].map((d, i) => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: ['啦'], tie: false })); });
        if (low) { s.measures[LOW].voxes[0][1].deg = 7; s.measures[LOW].voxes[0][1].oct = -1; }   /* B3：第一条下加线之下 */
        return s; };
      const meas = s => { addDoc(s); render(); const out = song.measures.map((_, mi) => { const b = colBoxes['v0:' + mi + ':0']; return { y: +b.y.toFixed(2), h: +b.h.toFixed(2) }; }); return out; };
      const A = meas(mk(true)), B = meas(mk(false));
      const ys = [...new Set(A.map(x => x.y))], sysOf = mi => ys.indexOf(A[mi].y), lowSys = sysOf(LOW);
      const hLow = A.filter((_, mi) => sysOf(mi) === lowSys).map(x => x.h), hOther = A.filter((_, mi) => sysOf(mi) !== lowSys).map(x => x.h), hB = B.map(x => x.h);
      /* 各行首小节相对无低音版的纵向位移：低音行及之前＝0，之后各行同一个量（只让一次，不逐行累加） */
      const shift = ys.map(y => { const mi = A.findIndex(x => x.y === y); return +(A[mi].y - B[mi].y).toFixed(2); });
      return { nSys: ys.length, lowSys, hLow: [...new Set(hLow)], hOther: [...new Set(hOther)], hB: [...new Set(hB)], shift }; });
    await pg._ctx.close();
    const after = r.shift.slice(r.lowSys + 1);
    T(r.nSys >= 4 && r.lowSys > 0 && r.lowSys < r.nSys - 2 && r.hB.length === 1 && r.hOther.length === 1 && r.hOther[0] === r.hB[0] && r.hLow.length === 1 && Math.abs(r.hLow[0] - r.hB[0] - 7.75) < 0.05
      && r.shift.slice(0, r.lowSys + 1).every(x => x === 0) && after.length >= 2 && after.every(x => x === after[0]) && after[0] > 0,
      'I32 24 小节教学对照谱只有第 8 小节一个 B3：只有那一行的谱表↔简谱行间隙加 7.75px，其余各行与没有低音时相同；后面各行只整体让一次、不逐行累加（此前整首每一行都下移、逐行累加，长谱多出一页）', JSON.stringify(r));
  });

  /* ---------- I33 「试一试」示例《送别》带作词署名；示例导入单独计（不进真实 MusicXML 导入统计） ---------- */
  await guard('I33 示例署名与统计', async () => {
    const pg = await open(1280, 800);
    await pg.evaluate(() => { hideStartPad(); window.__ev = []; const p0 = window.pyqEvent; window.pyqEvent = function (a, b) { window.__ev.push(a + ':' + b); try { return p0.apply(this, arguments); } catch (_) { } }; });
    await toImport(pg); await pg.click('#nf-isrc-ai'); await pg.click('#nf-demo'); await loaded(pg); await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    const a = await pg.evaluate(() => ({ ly: song.lyricist, co: song.composer, hd: [...document.querySelectorAll('#score text')].map(t => t.textContent).filter(t => /作词|作曲/.test(t)).join('|'), ev: window.__ev.filter(x => /^import_done/.test(x)) }));
    await toImport(pg); await pick(pg, SONGBIE); await loaded(pg); await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    const b2 = await pg.evaluate(() => window.__ev.filter(x => /^import_done/.test(x)));
    await pg._ctx.close();
    T(a.ly === '李叔同' && /Ordway/.test(a.co) && /李叔同/.test(a.hd) && a.ev.length === 1 && /^import_done:mxl-demo:/.test(a.ev[0]) && b2.length === 2 && /^import_done:mxl:/.test(b2[1]),
      'I33 「试一试」内置《送别》页头带「作词：李叔同」；示例导入记 import_done:mxl-demo，真实文件导入仍记 mxl', JSON.stringify({ a, b2 }));
  });

  /* ---------- I34 导入谱的起步条：伴奏来自文件时不给「换织体 / 补配」主按钮（会覆盖文件里的钢琴声部）；功能谱已有和弦的提示不再说「先写旋律」 ---------- */
  await guard('I34 导入谱起步条', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => hideStartPad());
    const VP = mx({ title: 'VP', fifths: 0, time: [4, 4], parts: [{ name: 'Voice', measures: melody(4, { ly: 1 }) }, { name: 'Piano', staves: 2, measures: melody(4).map(rh => [rh, melody(1, { oct: 3, seq: [1, 5, 1, 5] })[0]]) }] });
    const MEL = mx({ title: 'Mel', fifths: 0, time: [4, 4], parts: [{ name: 'V', measures: melody(4, { ly: 1 }) }] });
    const bar = () => pg.evaluate(() => { const w = document.querySelector('#lb-wrap .lb-bar'); if (!w) return null;
      return { k: NWB.stackOf(song), steps: [...w.querySelectorAll('.lb-steps li')].map(li => li.className).join(','), go: !!w.querySelector('.lb-go'), hint: (w.querySelector('.lb-hint') || {}).textContent || '', tip: (w.querySelector('.lb-tip') || {}).textContent || '' }; });
    const r = {};
    for (const t of ['orig', 'SJ']) { await toImport(pg); if (await pg.$('#nf-unload')) await pg.click('#nf-unload'); await pick(pg, file('vp.musicxml', VP)); await loaded(pg);
      await pg.click('[data-act="tg"][data-v="' + t + '"]'); await pvDone(pg); await pg.click('#nf-impgo'); await pg.waitForTimeout(200); r['vp_' + t] = await bar(); }
    await toImport(pg); if (await pg.$('#nf-unload')) await pg.click('#nf-unload'); await pick(pg, file('mel.musicxml', MEL)); await loaded(pg);
    await pg.click('[data-act="tg"][data-v="CJ"]'); await pvDone(pg); await pg.click('#nf-impgo'); await pg.waitForTimeout(200); r.cj = await bar();
    await pg._ctx.close();
    const accOk = x => x && ['JG', 'SG', 'SJG'].includes(x.k) && x.steps === 'done,done,now' && !x.go && /文件里的/.test(x.hint);
    T(accOk(r.vp_orig) && accOk(r.vp_SJ) && r.cj && r.cj.k === 'CJ' && /改和弦/.test(r.cj.tip) && !/先写旋律/.test(r.cj.tip),
      'I34 人声＋钢琴文件按原文件 / 对照导入：起步条 ①② 打勾、③ 只给提示「伴奏是文件里的……」不给主按钮（此前主按钮「换织体」会按织体重配覆盖文件伴奏）；标级数和弦导入后提示「改和弦……」（此前仍说「先写旋律」）', JSON.stringify(r));
  });

  /* ---------- I35 钢琴两手谱做成「五线＋简谱对照」：谱型条 / 菜单照实叫；钢琴族内互换保留简谱对照 ---------- */
  await guard('I35 钢琴对照谱名与互换', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => hideStartPad());
    const PN = mx({ title: 'Piano', fifths: 0, time: [4, 4], parts: [{ name: 'Piano', staves: 2, measures: melody(4).map(rh => [rh, melody(1, { oct: 3, seq: [1, 5, 1, 5] })[0]]) }] });
    await toImport(pg); await pick(pg, file('piano.musicxml', PN)); await loaded(pg);
    await pg.click('[data-act="tg"][data-v="SJ"]'); await pvDone(pg);
    const goKind = await pg.evaluate(() => document.getElementById('nf-impkind').textContent);
    await pg.click('#nf-impgo'); await pg.waitForTimeout(200);
    const nm = () => pg.evaluate(() => ({ bar: (document.querySelector('#lb-wrap .lb-kind b') || {}).textContent, dual: JSON.stringify(song.voxDual || null), k: NWB.stackOf(song) }));
    const a = await nm();
    await pg.click('#lb-wrap .lb-kind'); await pg.waitForTimeout(150);
    const menu = await pg.evaluate(() => ({ cur: (document.querySelector('#lb-menu .lb-mi.m-same b') || {}).textContent, cg: (document.querySelector('#lb-menu [data-sw="CG"] b') || {}).textContent, cgWhy: (document.querySelector('#lb-menu [data-sw="CG"] small') || {}).textContent }));
    await pg.click('#lb-menu [data-sw="CG"]'); await pg.waitForTimeout(200);
    const b2 = await nm();
    await pg.click('#lb-wrap .lb-kind'); await pg.waitForTimeout(150); await pg.click('#lb-menu [data-sw="G"]'); await pg.waitForTimeout(200);
    const c = await nm();
    await pg._ctx.close();
    T(/钢琴独奏谱（五线＋简谱对照）/.test(goKind) && a.bar === '钢琴独奏谱（五线＋简谱对照）' && a.dual === '[true,true]' && menu.cur === a.bar && /简谱对照保留/.test(menu.cgWhy)
      && b2.k === 'CG' && b2.dual === '[true,true]' && /纯伴奏/.test(b2.bar) && /简谱对照/.test(b2.bar) && c.k === 'G' && c.dual === '[true,true]' && c.bar === a.bar,
      'I35 钢琴两手谱导入为「五线＋简谱对照」：谱型条与换谱类菜单的「当前」都叫「钢琴独奏谱（五线＋简谱对照）」（此前只叫钢琴独奏谱）；换成钢琴弹唱谱（纯伴奏）再换回，两行简谱对照都保留（此前静默去掉）', JSON.stringify({ goKind, a, menu, b2, c }));
  });

  /* ---------- I36 长文件导入预览：先出前 32 小节的图（换做法不卡），空闲时整首重排替换，最终仍与导入后整首的首行逐字节一致 ---------- */
  await guard('I36 长文件预览两段式', async () => {
    const pg = await open(1366, 900);
    await pg.evaluate(() => hideStartPad());
    const LONG = mx({ title: 'L160', sw: 'Basic Pitch', fifths: 0, time: [4, 4], parts: [{ name: 'V', measures: melody(160, { ly: 1 }) }] });
    await toImport(pg); await pick(pg, file('l160.musicxml', LONG)); await loaded(pg); await pvDone(pg);
    await pg.waitForFunction(() => NWP.pvInfo() && !NWP.pvInfo().partial, null, { timeout: 8000 });
    const n0 = await pg.evaluate(() => NWP.pvStats.length);
    await pg.click('[data-act="tg"][data-v="J"]');
    await pg.waitForFunction(() => NWP.pvInfo() && !NWP.pvInfo().partial && /\|J$/.test(NWP.pvInfo().rkey), null, { timeout: 8000 });
    /* 这次换做法的每次换图：先 partial（前 32 小节），后整首 */
    const q = await pg.evaluate(n0 => NWP.pvStats.slice(n0).filter(x => /\|J$/.test(x.rkey)).map(x => (x.partial ? 'q' : 'f') + ':' + Math.round(x.ms)), n0);
    const pv = await pg.evaluate(() => document.querySelector('#nf-pvbox svg').innerHTML);
    await pg.click('#nf-impgo'); await pg.waitForTimeout(250);
    const real = await pg.evaluate(() => { const s = JSON.parse(JSON.stringify(song)); delete s.layout; delete s.id;
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); renderOffscreen({ song: s, target: sv, maxSystems: 1, paperW: 660, invert: false }); return { svg: sv.innerHTML, n: song.measures.length }; });
    await pg._ctx.close();
    T(q.length === 2 && /^q:/.test(q[0]) && /^f:/.test(q[1]) && real.n === 160 && pv === real.svg,
      'I36 160 小节文件换做法：先出前 32 小节排的图（partial，换做法不再同步整首排版），空闲时整首重排替换；最终预览与导入后整首的首行逐字节一致', JSON.stringify({ q, n: real.n, same: pv === real.svg }));
  });

  T(errs.length === 0, '无页面报错', errs.join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { }
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
