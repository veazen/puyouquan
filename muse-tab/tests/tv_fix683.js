'use strict';
/* v68.3 缺陷修复（PROJECT.md §9.0 P0 / P1，两种外壳都跑：默认新外壳 flow 与 ?shell=classic）。真实按键 / 点击 / 文件选择框，file:// 直载。
   X1  D1（P0）浏览器禁用全部站点数据：localStorage / sessionStorage 访问器抛 SecurityError（addInitScript 在 window 与 Window.prototype 上装抛错读取器）——
       启动无页面报错、有谱面；开机只提示一次「本机存储被浏览器禁用」、全程不出「可能已满」；简谱行键盘 1 2 3 5 落成四个音；空格播放 / 再按停；
       导出 MusicXML / MIDI / 曲谱文件 / PNG 各下载一次；Alt+N + Enter 新建一个窗口；「保存到我的曲谱」与「存入我的曲谱并继续」之后本次会话的曲谱库里有它；
       派发 beforeunload / pagehide 不报错；对照组（存储正常）不置 PYQ_LS_MEM、不提示。另：静态闸——内联脚本里每一处 localStorage / sessionStorage 都在同一函数的 try 里
       （需 typescript 解析器；NODE_PATH 里没有时只打印 ⚠️ 跳过，运行时断言照跑）
   X2  D2（P1）「打开文件…」（flow：文件 ▾「打开文件…」；旧外壳：顶栏 #b-open；都经文件选择框）：.mid → 「导入 MIDI」；.musicxml / .xml / .mxl → 新建面板「从已有音乐」导入页、
       依据与拖放同一文件逐项相同；.gp5 → 「导入 Guitar Pro：选择音轨」；没有扩展名的 MIDI 按文件头认出；.mtab.json 仍替换当前窗口（窗口数不变）；
       认不出的格式落在「从已有音乐」页并说明能读哪些格式；坏 JSON 的提示指向「从已有音乐」；#file-in accept 含全部可读扩展名
   X3  D3（P1）填词框 #i-lyric：一次插入整句 → 与「智能填词」同一分配（跳过休止、连音线后续音清空）、光标到下一个可填音；输入法合成中途不写谱、上屏后按字分配；
       空格隔开逐字；英文 hap-py birth-day 按连字符 / 空格分音节；单字只落当前音、光标不动、Enter 仍前进；一次 Ctrl+Z 恢复全部歌词
   X4  D4（P1）MusicXML 往返轨名：送别 + 配伴奏（旋律 / 右手伴奏 / 左手伴奏）、旋律 + 钢琴、合唱 + 钢琴、简谱伴奏谱逐项与原谱相同（轨名 / 记谱法 / 括线 / 每行音高）；
       第三方 Piano 大谱表仍为「Piano·右手 / Piano·左手」；抽查四部合唱 / 扫弦弹唱 / 钢琴独奏 / 钢琴弹唱伴奏四份示例谱往返轨名不变
   X5  D5（P1）?pub= / ?review= 带 ?shell=classic：本次是旧外壳、不写 musetab-flow，之后不带参数打开仍是新外壳；普通编辑页 ?shell=classic 仍写 '0'；空 / 非法 pub 不算观看意图
   X6  收尾（v68.3 验收 DF-1..12 · ENG-2 · ENG-3，修前 prefix 页红、修后绿）：内存版存储下切布局先确认（导出 / 仍然切换 / 取消）；输入法合成被打断不写谱；
       框里直接 Ctrl+Z / Ctrl+Shift+Z 撤销重做；改已有歌词（追加字 / 插标点）不覆盖后面的音；整句自动前进后紧跟的回车不空掉一个音；「_」连写同一个音；
       「我的曲谱」写不进时不报成功、不关窗、不替换；内存版存储下胶囊 / 页签 / 关窗提示一律「仅本次」、关页拦一次；互动谱不提示「存储被禁用」；
       扩展名写错按文件头认、没有扩展名的曲谱文件同样替换当前窗口；MuseScore 另存 / 空行名 / 「A·B」行名往返不变；示例钢琴谱往返不多出 voxGroups；旧外壳「打开」提示不写 Ctrl+O
   X7  v68.5（§9.0 P1）「伴奏织体」弹窗说明与「未生成」提示里标和弦的入口按外壳指：新外壳＝右栏「文字」页「输入和弦…」（Ctrl+K），旧外壳仍是「创作」页（钢琴伴奏歌谱 / 钢琴谱两个分支）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=X1,X3 只跑部分 · SHOTS=目录 存截图 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const SHELLS = [['flow', URL0], ['classic', withQ(URL0, 'shell=classic')]];
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
const { songbieXML } = require('./fixtures/songbie_ai.js');

/* GP5 最小样本（同 tv_nfimport 的 gp5()：一条 6 弦吉他轨、一个小节） */
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
/* 不压缩的 ZIP（.mxl 容器） */
function crc32(buf) { let c, crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function zip(files) { const parts = [], cen = []; let off = 0;
  for (const [name, data0] of files) { const data = Buffer.from(data0), nm = Buffer.from(name), crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26);
    parts.push(lh, nm, data);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(off, 42);
    cen.push(ch, nm); off += 30 + nm.length + data.length; }
  const cd = Buffer.concat(cen); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]); }

/* 页面内工具（每个上下文的 init 脚本）：#toast 文字变化记进 __tl（开机期的提示在任何包装之前就会出现，只能这样记） */
function INIT() {
  window.__tl = [];
  document.addEventListener('DOMContentLoaded', () => { const t = document.getElementById('toast'); if (!t) return;
    new MutationObserver(() => { __tl.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true }); });
  window.__lyr = vi => song.measures.map(m => (m.voxes[vi || 0] || []).map(c => (c.deg || 'r') + (c.tie ? '~' : '') + ':' + ((c.lyrics || [])[activeLyr] || '')).join(' ')).join(' | ');
}
/* D1：两处读取器都抛 SecurityError（「阻止所有网站数据」时 Chromium 的行为） */
function BLOCK() {
  const mk = n => function () { throw new DOMException("Failed to read the '" + n + "' property from 'Window': Access is denied for this document.", 'SecurityError'); };
  for (const n of ['localStorage', 'sessionStorage']) {
    try { Object.defineProperty(window, n, { get: mk(n), configurable: true }); } catch (e) {}
    try { Object.defineProperty(Window.prototype, n, { get: mk(n), configurable: true }); } catch (e) {}
  }
}

/* D1 第二道防线：读取器抛错且不可重定义（换不成内存版）——只靠各处 try 也要能启动、编辑、导出 */
function BLOCK_HARD() {
  const mk = n => function () { throw new DOMException("Failed to read the '" + n + "' property from 'Window': Access is denied for this document.", 'SecurityError'); };
  for (const n of ['localStorage', 'sessionStorage']) {
    try { Object.defineProperty(window, n, { get: mk(n), configurable: false }); } catch (e) {}
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const OUT = {}; let pass = 0, total = 0;
  const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + String(d).slice(0, 1400) : '')); };
  const NOTE = (id, s) => (OUT[id] = OUT[id] || []).push(s);
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', String(e && e.message || e).split('\n')[0]); } };
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const EV = (pg, fn, a) => pg.evaluate(fn, a);
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const open = async (url, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, acceptDownloads: true });
    ctx.setDefaultTimeout(6000);
    if (o.block) await ctx.addInitScript(o.block === 'hard' ? BLOCK_HARD : BLOCK);
    await ctx.addInitScript(INIT);
    const pg = await ctx.newPage(); pg.__pe = [];
    pg.on('pageerror', e => pg.__pe.push(e.message));
    await pg.goto(url); await wait(pg, o.wait || 1300);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const prep = pg => EV(pg, () => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {}
    window.__toasts = []; const t0 = toast; toast = function (m) { __toasts.push(String(m)); return t0.apply(this, arguments); }; });
  const blurAll = pg => EV(pg, () => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); });
  const jobs = [];

  /* ================= X1 D1 存储访问器抛错 ================= */
  const x1 = (shell, url) => SAFE('X1', 'X1 ' + shell, async () => {
    const pg = await open(url, { block: true, wait: 2600 });
    const boot = await EV(pg, () => { let hs = false; try { hs = !!song && Array.isArray(song.measures); } catch (_) {}
      let flow = null; try { flowOn(); flow = document.body.classList.contains('flow'); } catch (_) {}
      return { mem: window.PYQ_LS_MEM === true, hs, flow, tl: __tl.slice() }; });
    let svg = false, perr = '';
    try { await EV(pg, () => { window.guardReplace0 = guardReplace; }); await prep(pg); await EV(pg, () => render()); await wait(pg, 150);
      svg = await EV(pg, () => { const sc = document.getElementById('score'); return !!sc && sc.tagName.toLowerCase() === 'svg' && sc.querySelectorAll('text,path,line').length > 20; }); }
    catch (e) { perr = String(e.message || e).split('\n')[0]; }
    const BOOT_TIP = /^本机存储被浏览器禁用，关闭页面后不会保存/;
    const memN = boot.tl.filter(x => BOOT_TIP.test(x)).length;
    T('X1', !pg.__pe.length && boot.hs && svg && boot.mem && boot.flow === (shell === 'flow'),
      'X1a ' + shell + ' 存储读取器抛 SecurityError：启动无页面报错、song 已建、谱面 svg#score 画出来了、window.PYQ_LS_MEM 为真、外壳照常（' + shell + '）', J({ pe: pg.__pe.slice(0, 3), boot: { mem: boot.mem, hs: boot.hs, flow: boot.flow }, svg, perr }));
    T('X1', memN === 1 && !boot.tl.some(x => /可能已满/.test(x)), 'X1b ' + shell + ' 开机 2.6 秒内「本机存储被浏览器禁用」提示恰 1 次、没有「可能已满」', J(boot.tl));
    if (perr) throw new Error('启动后页面不可用（后续 X1c–X1h 无法执行）：' + perr);
    await shot(pg, 'x1_' + shell + '_boot');
    /* 编辑：简谱行键盘 1 2 3 5（真实按键）——只修两个启动点时 autoAdvOn 抛错，四个数字都写在第一个音上 */
    await EV(pg, () => { const s = createSong('vocal', { title: '存储禁用', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); loadSong(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); render(); });
    await blurAll(pg); await wait(pg, 150);
    for (const k of ['1', '2', '3', '5']) { await pg.keyboard.press(k); await wait(pg, 60); }
    await wait(pg, 200);
    const ed = await EV(pg, () => song.measures[0].voxes[0].map(c => c.deg).join(''));
    T('X1', ed === '1235' && !pg.__pe.length, 'X1c ' + shell + ' 编辑：简谱行按 1 2 3 5 → 四个音 1235（落音自动前进照常）', J({ ed, pe: pg.__pe.slice(0, 3) }));
    /* 播放：空格起播、再按暂停，停止 */
    await blurAll(pg); await pg.keyboard.press('Space'); await wait(pg, 700);
    const pl1 = await EV(pg, () => !!audio.playing && !audio.paused);
    await pg.keyboard.press('Space'); await wait(pg, 300);
    const pl2 = await EV(pg, () => !!audio.paused);
    await EV(pg, () => stopPlay()); await wait(pg, 150);
    const pl3 = await EV(pg, () => !audio.playing);
    T('X1', pl1 && pl2 && pl3 && !pg.__pe.length, 'X1d ' + shell + ' 播放：空格起播（audio.playing）、再按暂停、停止，无报错', J({ pl1, pl2, pl3, pe: pg.__pe.slice(0, 3) }));
    /* 导出：与「打印 / 导出」弹窗、输出工具组同一份 EXPORT_ACT */
    const dls = [];
    for (const k of ['mxl', 'mid', 'mtab', 'png']) {
      const dl = pg.waitForEvent('download', { timeout: 6000 }).catch(() => null);
      await EV(pg, k => { EXPORT_ACT[k](); }, k);
      const d = await dl; dls.push(d ? d.suggestedFilename() : null);
    }
    T('X1', dls.every(Boolean) && !pg.__pe.length, 'X1e ' + shell + ' 导出 MusicXML / MIDI / 曲谱文件 / PNG 各下载一次', J({ dls, pe: pg.__pe.slice(0, 3) }));
    /* 新建：Alt+N 打开面板、Enter 建 */
    await EV(pg, () => { try { closeModal(); } catch (_) {} }); await blurAll(pg);
    const n0 = await EV(pg, () => docs.length);
    await pg.keyboard.press('Alt+n'); await wait(pg, 500);
    await pg.keyboard.press('Enter'); await wait(pg, 900);
    const n1 = await EV(pg, () => docs.length);
    T('X1', n1 === n0 + 1 && !pg.__pe.length, 'X1f ' + shell + ' 新建：Alt+N → Enter 多一个窗口', J({ n0, n1, pe: pg.__pe.slice(0, 3) }));
    /* 存入我的曲谱：旧外壳顶栏「保存」、flow 行 1 保存状态（未入库时点一下就存入） */
    await EV(pg, () => { try { closeModal(); } catch (_) {} song.title = '内存里的谱'; render(); });
    await blurAll(pg);
    if (shell === 'flow') await pg.click('#flw-save'); else await pg.click('#b-savemine');
    await wait(pg, 300);
    const sv = await EV(pg, () => ({ id: song.id || null, inLib: !!song.id && libLoad().some(e => e.id === song.id), t: __toasts.slice(-1)[0] || '', pill: (document.getElementById('flw-save') || {}).textContent || '' }));
    /* 未入库有编辑的谱被替换：「存入我的曲谱并继续」（真实 guardReplace） */
    await EV(pg, () => { window.guardReplace = window.guardReplace0; addDoc(createSong('vocal', { title: '未入库的谱', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, lyr: 1 }), () => {});
      mutate(() => { song.measures[0].voxes[0][0].deg = 5; }); loadSong(demoSong()); });
    await wait(pg, 250);
    const gr = await EV(pg, () => !!document.getElementById('gr-save'));
    if (gr) await pg.click('#gr-save');
    await wait(pg, 400);
    const kept = await EV(pg, () => libLoad().some(e => e.title === '未入库的谱' && e.data && e.data.measures[0].voxes[0][0].deg === 5));
    T('X1', sv.inLib && /仅本次|这次打开/.test(sv.t) && gr && kept && !pg.__pe.length,
      'X1g ' + shell + ' 存入我的曲谱：本次会话曲谱库里有它（提示注明只在这次打开期间有效）；替换未入库谱时「存入我的曲谱并继续」后库里有原谱',
      J({ sv, gr, kept, pe: pg.__pe.slice(0, 3) }));
    /* 关窗：beforeunload / pagehide（persistFlush） */
    await EV(pg, () => { mutate(() => { song.title = '关窗前'; }); window.dispatchEvent(new Event('beforeunload')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); });
    await wait(pg, 200);
    const tl = await EV(pg, () => __tl.slice());
    T('X1', !pg.__pe.length && !tl.some(x => /可能已满/.test(x)) && tl.filter(x => BOOT_TIP.test(x)).length === 1,
      'X1h ' + shell + ' 派发 beforeunload / pagehide 无报错；全程「可能已满」0 次、「本机存储被浏览器禁用」仍只 1 次', J({ pe: pg.__pe.slice(0, 3), n: tl.length }));
    if (shell === 'flow') { await EV(pg, () => { song.id = undefined; try { FLOW.sync(); } catch (_) {} render(); }); await wait(pg, 200);
      const pill = await EV(pg, () => ({ t: (document.getElementById('flw-save') || {}).textContent || '', title: (document.getElementById('flw-save') || {}).title || '' }));
      T('X1', /仅本次/.test(pill.t) && /关闭页面后不会保存/.test(pill.title), 'X1i flow 行 1 保存状态：未入库时写「仅本次」（不写「仅存本机」），悬停说明关闭页面后不会保存', J(pill));
      await shot(pg, 'x1_flow_pill'); }
    await close(pg);
  });
  if (want('X1')) {
    SHELLS.forEach(([sh, u]) => jobs.push(() => x1(sh, u)));
    jobs.push(() => SAFE('X1', 'X1 对照', async () => {
      const r = [];
      for (const [sh, u] of SHELLS) { const pg = await open(u, { wait: 2600 });
        r.push(await EV(pg, sh => ({ sh, mem: window.PYQ_LS_MEM === undefined, tl: __tl.filter(x => /本机存储被浏览器禁用/.test(x)).length, real: (() => { try { return localStorage instanceof Storage; } catch (_) { return false; } })() }), sh));
        r[r.length - 1].pe = pg.__pe.length; await close(pg); }
      T('X1', r.every(x => x.mem && !x.tl && x.real && !x.pe), 'X1j 对照（存储正常，两外壳）：不置 PYQ_LS_MEM、不出「本机存储被浏览器禁用」、localStorage 仍是浏览器原生 Storage', J(r));
    }));
    jobs.push(() => SAFE('X1', 'X1 不可重定义', async () => {
      const pg = await open(URL0, { block: 'hard', wait: 2600 });
      const st = await EV(pg, () => { const d = Object.getOwnPropertyDescriptor(window, 'localStorage'); let ok = false; try { ok = !!song && Array.isArray(song.measures); } catch (_) {}
        return { cfg: d ? d.configurable : null, mem: window.PYQ_LS_MEM === true, ok }; });
      await prep(pg);
      await EV(pg, () => { const s = createSong('vocal', { title: '只靠 try', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); loadSong(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); render(); });
      await blurAll(pg); for (const k of ['1', '2', '3', '5']) { await pg.keyboard.press(k); await wait(pg, 60); }
      const ed = await EV(pg, () => song.measures[0].voxes[0].map(c => c.deg).join(''));
      const dl = pg.waitForEvent('download', { timeout: 6000 }).catch(() => null); await EV(pg, () => EXPORT_ACT.mxl()); const d = await dl;
      const tl = await EV(pg, () => __tl.slice());
      T('X1', st.cfg === false && st.ok && ed === '1235' && !!d && !pg.__pe.length && !tl.some(x => /可能已满/.test(x)),
        'X1l 读取器抛错且不可重定义（内存版换不上，只剩各处 try）：flow 照样启动、按 1 2 3 5 落四个音、能导出 MusicXML、无页面报错、不误报「可能已满」', J({ st, ed, dl: !!d, pe: pg.__pe.slice(0, 3) }));
      await close(pg);
    }));
    /* 静态闸：每一处存储访问都在同一函数的 try 里。typescript 在 tests/package.json 里（收尾 ENG-4：此前不在，CI 的 npm install 装不到，闸静默跳过只打 ⚠️）；
       CI 里拿不到 typescript 判红（同 tv_shellflow 的 IN_CI 口径），本机没有才只提示 */
    jobs.push(() => SAFE('X1', 'X1 静态', async () => {
      let ts = null; try { ts = require('typescript'); } catch (_) {}
      if (!ts && process.env.CI) { T('X1', false, 'X1k 静态闸：CI 里没有 typescript（tests/package.json 应带它），存储访问防回归闸没跑', ''); return; }
      if (!ts) { NOTE('X1', '⚠️  X1k 静态闸跳过：NODE_PATH 里没有 typescript（运行时 X1a–X1h 已覆盖启动 / 编辑 / 播放 / 导出 / 新建 / 保存 / 关窗）'); return; }
      const html = fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8');
      const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi; let m; const bad = []; let n = 0;
      const lineOf = off => html.slice(0, off).split('\n').length;
      while ((m = re.exec(html))) { if (/application\/(ld\+)?json/.test(m[1]) || /\bsrc\s*=/.test(m[1])) continue;
        const base = m.index + m[0].indexOf('>') + 1, sf = ts.createSourceFile('x.js', m[2], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        const visit = node => {
          if (ts.isIdentifier(node) && (node.text === 'localStorage' || node.text === 'sessionStorage')) { const p = node.parent;
            if (!(ts.isPropertyAccessExpression(p) && p.name === node && !(ts.isIdentifier(p.expression) && p.expression.text === 'window'))) { n++;
              let x = node, ok = false; while (x.parent) { const par = x.parent; if (ts.isTryStatement(par) && par.tryBlock === x) { ok = true; break; } if (ts.isFunctionLike(par)) break; x = par; }
              if (!ok) bad.push('L' + lineOf(base + node.getStart(sf))); } }
          ts.forEachChild(node, visit); };
        visit(sf); }
      T('X1', n > 50 && !bad.length, 'X1k 静态闸：内联脚本 ' + n + ' 处 localStorage / sessionStorage 访问都在同一函数的 try 里（顶层读 musetab-zoom 等此前 5 处没包）', bad.join(' '));
    }));
  }

  /* ================= X2 D2 打开文件 ================= */
  const XML = songbieXML();
  const MXL = zip([['META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>'], ['score.xml', XML]]);
  const GP5 = gp5();
  const x2 = (shell, url) => SAFE('X2', 'X2 ' + shell, async () => {
    const pg = await open(url); await prep(pg);
    const MID = Buffer.from(await EV(pg, () => { const s = createSong('vocal', { title: 'mid', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 }); s.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 1][i]; })); const o = exportMIDI(s); return Array.from(o.bytes || o); }));
    const MTAB = Buffer.from(await EV(pg, () => { const s = createSong('vocal', { title: '打开的曲谱文件', key: 'G', beats: 3, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); return JSON.stringify(s); }));
    const files = {
      'a.mid': ['audio/midi', MID], 'songbie.musicxml': ['application/vnd.recordare.musicxml+xml', Buffer.from(XML)], 'songbie.xml': ['application/xml', Buffer.from(XML)],
      'songbie.mxl': ['application/vnd.recordare.musicxml', MXL], 'a.gp5': ['application/octet-stream', GP5], 'mid-noext': ['', MID],
      'a.mtab.json': ['application/json', MTAB], 'notes.txt': ['text/plain', Buffer.from('hello')], 'bad.json': ['application/json', Buffer.from('{"x":1}')] };
    const reset = () => EV(pg, () => { try { NWP.close(); } catch (_) {} try { closeModal(); } catch (_) {} __toasts = []; });
    const state = () => EV(pg, () => { const st = NWP.state, live = !!(NWP.modal && NWP.modal.isConnected);
      /* v69.1 C 迁移：新形态页签字面缩成「导入」（字数预算），无障碍名仍是「从已有音乐」——读无障碍名，旧外壳 / ?next=0 无 aria-label 照读字面 */
      const tsel = live ? NWP.modal.querySelector('[role=tab][aria-selected="true"]') : null;
      const tabSel = tsel ? (tsel.getAttribute('aria-label') || tsel.textContent || '') : '';
      return { live, tab: live && st ? st.tab : null, a: !!(live && st && st.imp && st.imp.a), basis: live && st && st.imp && st.imp.a ? JSON.stringify(st.imp.a.basis) : null, kinds: live && st && st.imp && st.imp.a ? JSON.stringify(st.imp.a.kinds) : null,
        err: live && st && st.imp ? st.imp.err : '', tabSel, h3: (document.querySelector('#modal-mask .modal h3') || {}).textContent || null, docs: docs.length, title: song.title, toasts: __toasts.slice(),
        ta: (document.querySelector('#toast .flw-ta') || {}).textContent || '', tk: (document.getElementById('toast') || { dataset: {} }).dataset.k || '' }; });
    const viaOpen = async name => {
      await reset();
      const [mt, buf] = files[name];
      let fc;
      if (shell === 'flow') {
        await pg.click('#flw-file'); await wait(pg, 200);
        const it = await pg.evaluateHandle(() => [...document.querySelectorAll('#popmenu [data-fa]')].find(el => /^打开文件/.test((el.querySelector('.flw-ml') || el).textContent.trim())) || null);
        const el = it.asElement(); if (!el) throw new Error('文件 ▾ 里没有「打开文件…」');
        [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), el.click()]);
      } else [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), pg.click('#b-open')]);
      await fc.setFiles({ name, mimeType: mt, buffer: buf });
      await wait(pg, 900); return state();
    };
    const viaDrop = async name => {
      await reset(); const [mt, buf] = files[name];
      await EV(pg, ([n, t, arr]) => { const d = new DataTransfer(); d.items.add(new File([new Uint8Array(arr)], n, { type: t }));
        window.dispatchEvent(new DragEvent('drop', { dataTransfer: d, bubbles: true, cancelable: true })); }, [name, mt, Array.from(buf)]);
      await wait(pg, 900); return state();
    };
    const acc = await EV(pg, () => ({ fi: document.getElementById('file-in').accept, title: document.getElementById('b-open').title }));
    const need = ['.mid', '.midi', '.kar', '.musicxml', '.xml', '.mxl', '.gp', '.gpx', '.gp3', '.gp4', '.gp5', '.mtab', '.json'];
    T('X2', need.every(x => acc.fi.split(',').includes(x)), 'X2a ' + shell + ' #file-in accept 含 ' + need.join(' '), J(acc));
    const r = {};
    for (const nm of Object.keys(files)) r[nm] = await viaOpen(nm);
    /* v68.7 S1：新外壳坏 JSON 的提示条带「导入」——点它＝新建面板「从已有音乐」（bad.json 是最后一个，提示条有动作停 ≥4 秒，这时还在） */
    const badGo = shell === 'flow' ? await EV(pg, () => { const b = document.querySelector('#toast .flw-ta'); if (!b) return null; b.click(); const live = !!(NWP.modal && NWP.modal.isConnected);
      return { live, tab: live && NWP.state ? NWP.state.tab : null }; }) : null;
    const d = {}; for (const nm of ['a.mid', 'songbie.musicxml', 'songbie.xml', 'songbie.mxl', 'a.gp5']) d[nm] = await viaDrop(nm);
    const noBadToast = x => !x.toasts.some(t => /文件格式无法识别/.test(t));
    T('X2', /导入 MIDI/.test(r['a.mid'].h3 || '') && r['a.mid'].h3 === d['a.mid'].h3 && noBadToast(r['a.mid']), 'X2b ' + shell + ' 打开 a.mid → 弹「导入 MIDI」（与拖放同一对话框）', J({ open: r['a.mid'], drop: d['a.mid'].h3 }));
    const mx = ['songbie.musicxml', 'songbie.xml', 'songbie.mxl'];
    T('X2', mx.every(n => r[n].live && r[n].tab === 'import' && r[n].a && /从已有音乐/.test(r[n].tabSel) && r[n].basis === d[n].basis && r[n].kinds === d[n].kinds && noBadToast(r[n])),
      'X2c ' + shell + ' 打开 .musicxml / .xml / .mxl → 新建面板「从已有音乐」导入页（imp.a 已读、依据与做法谱名和拖放同一文件逐项相同）', J(mx.map(n => [n, r[n].tab, r[n].a, r[n].tabSel, r[n].basis === d[n].basis, r[n].toasts])));
    T('X2', /选择音轨/.test(r['a.gp5'].h3 || '') && r['a.gp5'].h3 === d['a.gp5'].h3, 'X2d ' + shell + ' 打开 a.gp5 → 「导入 Guitar Pro：选择音轨」（同拖放）', J({ open: r['a.gp5'].h3, drop: d['a.gp5'].h3, t: r['a.gp5'].toasts }));
    T('X2', /导入 MIDI/.test(r['mid-noext'].h3 || ''), 'X2e ' + shell + ' 没有扩展名的 MIDI 文件按文件头（MThd）认出 → 「导入 MIDI」', J(r['mid-noext']));
    const before = r['a.gp5'].docs;
    T('X2', r['a.mtab.json'].title === '打开的曲谱文件' && r['a.mtab.json'].docs === before && !r['a.mtab.json'].live, 'X2f ' + shell + ' .mtab.json 照旧替换当前窗口（窗口数不变、不进新建面板）', J(r['a.mtab.json']));
    T('X2', r['notes.txt'].live && r['notes.txt'].tab === 'import' && /从已有音乐/.test(r['notes.txt'].tabSel) && /不是能读的曲谱文件/.test(r['notes.txt'].err) && /MIDI/.test(r['notes.txt'].err),
      'X2g ' + shell + ' 认不出的格式（.txt）落在「从已有音乐」页并说明能读哪些格式', J(r['notes.txt']));
    /* v68.7 S1 迁移（规格 §6.C3 #6，P2 结果 + 一个动作 / P3 不指路）：新外壳原 /从已有音乐/（写去哪里导入）→ 短文「不是谱友圈曲谱文件」+ data-k=limit + 动作「导入」，点它真的打开「从已有音乐」页；旧外壳一字不动。修前红：5cddfb8 新外壳提示为整句、没有动作钮（badGo 为 null） */
    const x2h = shell === 'flow' ? (r['bad.json'].toasts.includes('不是谱友圈曲谱文件') && r['bad.json'].tk === 'limit' && r['bad.json'].ta === '导入' && !!badGo && badGo.live && badGo.tab === 'import')
      : r['bad.json'].toasts.some(t => /从已有音乐/.test(t));
    T('X2', x2h && !r['bad.json'].toasts.some(t => /^文件格式无法识别$/.test(t)), 'X2h ' + shell + ' 坏 JSON（不是曲谱）提示说明' + (shell === 'flow' ? '：「不是谱友圈曲谱文件」+「导入」（点它进「从已有音乐」）' : '并指向「新建 → 从已有音乐」'), J({ t: r['bad.json'].toasts, ta: r['bad.json'].ta, tk: r['bad.json'].tk, badGo }));
    await reset();
    T('X2', !pg.__pe.length, 'X2i ' + shell + ' 全程无页面报错', pg.__pe.slice(0, 3).join(' | '));
    await close(pg);
  });
  if (want('X2')) SHELLS.forEach(([sh, u]) => jobs.push(() => x2(sh, u)));

  /* ================= X3 D3 填词框 ================= */
  const SETUP3 = () => { const s = createSong('vocal', { title: '词', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 });
    const D = [[1, 2, 0, 3], [3, 5, 6, 5]];
    s.measures.forEach((m, mi) => m.voxes[0].forEach((c, i) => { c.deg = D[mi][i]; }));
    s.measures[0].voxes[0][3].tie = true;
    loadSong(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; undoStack.length = 0; clampSel(); render(); };
  const x3 = (shell, url) => SAFE('X3', 'X3 ' + shell, async () => {
    const pg = await open(url); await prep(pg);
    const cdp = await pg.context().newCDPSession(pg);
    const enter = async () => { await blurAll(pg); await EV(pg, SETUP3); await wait(pg, 150); await blurAll(pg); await pg.keyboard.press('Enter'); await wait(pg, 250);
      const f = await EV(pg, () => (document.activeElement || {}).id); if (f !== 'i-lyric') throw new Error('Enter 没进填词框：' + f); };
    const st = () => EV(pg, () => ({ ly: __lyr(0), sel: sel.mi + ':' + sel.ci, box: document.getElementById('i-lyric').value, focus: (document.activeElement || {}).id }));
    const res = {};
    /* a 整句插入 */
    await enter(); await pg.keyboard.insertText('春眠不觉晓'); await wait(pg, 250); res.whole = await st();
    await shot(pg, 'x3_' + shell + '_whole');
    /* 对照：智能填词（同一份谱，从头＝当前音） */
    await EV(pg, SETUP3); await wait(pg, 100);
    await EV(pg, () => document.getElementById('b-fill').click()); await wait(pg, 250);
    await pg.fill('#fill-text', '春眠不觉晓'); await pg.click('#fill-ok'); await wait(pg, 250);
    res.smart = await st();
    /* 一次 Ctrl+Z 恢复整句 */
    await enter(); await pg.keyboard.insertText('春眠不觉晓'); await wait(pg, 200);
    await blurAll(pg); await pg.keyboard.press('Control+z'); await wait(pg, 250); res.undo = await st();
    /* b 输入法：合成中途 / 上屏 */
    await enter();
    await cdp.send('Input.imeSetComposition', { text: 'chun', selectionStart: 4, selectionEnd: 4 }); await wait(pg, 120);
    res.imeMid = await EV(pg, () => JSON.stringify(song).includes('chun'));
    await cdp.send('Input.insertText', { text: '春眠不觉' }); await wait(pg, 250); res.ime = await st();
    /* c 空格隔开逐字（输入法逐字上屏 + 空格） */
    await enter();
    for (const [py, h] of [['chun', '春'], ['mian', '眠'], ['bu', '不'], ['jue', '觉']]) {
      await cdp.send('Input.imeSetComposition', { text: py, selectionStart: py.length, selectionEnd: py.length }); await cdp.send('Input.insertText', { text: h }); await wait(pg, 60);
      if (h !== '觉') { await pg.keyboard.type(' '); await wait(pg, 60); } }
    await wait(pg, 200); res.imeSp = await st();
    /* c2 键盘打「春 眠 不 觉」 */
    await enter(); await pg.keyboard.type('春 眠 不 觉', { delay: 20 }); await wait(pg, 200); res.sp = await st();
    /* d 英文 */
    await enter(); await pg.keyboard.type('hap-py birth-day', { delay: 15 }); await wait(pg, 200); res.en = await st();
    /* e 单字：只落当前音、光标不动；Enter 前进 */
    await enter(); await pg.keyboard.type('春'); await wait(pg, 200); res.one = await st();
    await pg.keyboard.press('Enter'); await wait(pg, 200); res.oneEnter = await st();
    const W5 = '1:春 2:眠 r: 3~:不 | 3: 5:觉 6:晓 5:';
    T('X3', res.whole.ly === W5 && res.whole.ly === res.smart.ly && res.whole.sel === '1:3' && res.whole.box === '' && res.whole.focus === 'i-lyric',
      'X3a ' + shell + ' 填词框一次插入「春眠不觉晓」→ 与「智能填词」逐音相同（跳过休止、连音线后续音清空），光标到下一个可填音（1:3）、框里空、焦点仍在框里', J({ whole: res.whole, smart: res.smart.ly }));
    T('X3', res.undo.ly === '1: 2: r: 3~: | 3: 5: 6: 5:', 'X3b ' + shell + ' 一次 Ctrl+Z 恢复整句（分配算一步）', J(res.undo));
    T('X3', res.imeMid === false && res.ime.ly === '1:春 2:眠 r: 3~:不 | 3: 5:觉 6: 5:' && res.ime.sel === '1:2', 'X3c ' + shell + ' 输入法：合成中途谱里没有拼音 chun；整句上屏按字分配、光标到 1:2', J({ mid: res.imeMid, ime: res.ime }));
    T('X3', res.imeSp.ly === '1:春 2:眠 r: 3~:不 | 3: 5:觉 6: 5:' && res.sp.ly === res.imeSp.ly, 'X3d ' + shell + ' 空格隔开逐字（输入法逐字上屏 + 空格 / 键盘「春 眠 不 觉」）：一字一音、空格前进', J({ imeSp: res.imeSp, sp: res.sp }));
    T('X3', res.en.ly === '1:hap 2:py r: 3~:birth | 3: 5:day 6: 5:', 'X3e ' + shell + ' 英文「hap-py birth-day」按连字符 / 空格分音节', J(res.en));
    T('X3', res.one.ly === '1:春 2: r: 3~: | 3: 5: 6: 5:' && res.one.sel === '0:0' && res.one.box === '春' && res.oneEnter.sel === '0:1' && res.oneEnter.box === '',
      'X3f ' + shell + ' 单字「春」只落当前音、光标不动（原行为）；Enter 前进到下一个音、框清空', J({ one: res.one, enter: res.oneEnter }));
    T('X3', !pg.__pe.length, 'X3g ' + shell + ' 全程无页面报错', pg.__pe.slice(0, 3).join(' | '));
    await close(pg);
  });
  if (want('X3')) SHELLS.forEach(([sh, u]) => jobs.push(() => x3(sh, u)));

  /* ================= X4 D4 MusicXML 往返轨名 ================= */
  if (want('X4')) jobs.push(() => SAFE('X4', 'X4', async () => {
    const pg = await open(URL0); await prep(pg);
    const r = await EV(pg, XML => {
      const sig = s => ({ vv: (s.voxVoices || []).join('/'), tv: (s.tabVoices || []).join('/'), vn: J2((s.voxNotations || []).map(v => v == null ? 'num' : v)),   /* 简谱缺省 null ≡ 'num' */ vg: J2((voxGroupsOf(s) || []).map(g => [g.type, g.from, g.to])), pas: !!isPianoAccStack(s),   /* 收尾 ENG-3：比实际生效的分组（显式写的与按谱面推断的同一结果算相同；原样是否多出 voxGroups 字段见 X6k） */
        rows: (s.voxVoices || []).map((_, vi) => s.measures.slice(0, 4).map(m => (m.voxes[vi] || []).map(c => (c.deg || 0) + ':' + (c.oct || 0) + ':' + (c.acc || '')).join(' ')).join('|')).join('#') });
      function J2(x) { return JSON.stringify(x); }
      const rt = s => { const x = exportMusicXML(s); const r2 = importMusicXML(x); return { pn: [...x.matchAll(/<part-name>([^<]*)<\/part-name>/g)].map(m => m[1]), a: sig(s), b: sig(r2.song) }; };
      const out = {};
      /* A 送别（导入）→ 一键配伴奏（重组为 旋律 / 右手伴奏 / 左手伴奏） */
      loadSong(importMusicXML(XML).song); render();
      fillAccompaniment(texAvail(song.beats, song.unit)[0].id, true);
      out.A = rt(JSON.parse(JSON.stringify(song)));
      const mk = (vv, vn, vg) => { const s = createSong('staff', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: vv.length }); s.voxVoices = vv; s.voxNotations = vn; if (vg) s.voxGroups = vg;
        s.measures.forEach(m => { m.voxes = vv.map(() => blankVoxCols(4, 4)); m.voxes.forEach((cs, vi) => cs.forEach((c, i) => { c.deg = i + 1; if (vn[vi] === 'bass') c.oct = -1; })); }); return s; };
      out.B = rt(mk(['旋律', '右手', '左手'], ['staff', 'staff', 'bass'], [{ type: 'brace', from: 1, to: 2 }]));
      out.C = rt(mk(['女高', '女低', '右手', '左手'], ['staff', 'staff', 'staff', 'bass'], [{ type: 'bracket', from: 0, to: 1 }, { type: 'brace', from: 2, to: 3 }]));
      out.D = rt(mk(['旋律', '右手伴奏', '左手伴奏'], ['num', 'staff', 'bass'], [{ type: 'brace', from: 1, to: 2 }]));
      out.E = rt(mk(['钢琴·右手', '钢琴·左手'], ['staff', 'bass'], [{ type: 'brace', from: 0, to: 1 }]));
      /* 第三方：Trumpet + Piano 大谱表（没有 software）；自家 software 但 part-name 只有一段 */
      const third = sw => '<?xml version="1.0"?><score-partwise version="4.0"><identification><encoding>' + (sw ? '<software>' + sw + '</software>' : '') + '</encoding></identification>'
        + '<part-list><score-part id="P1"><part-name>Trumpet in Bb</part-name></score-part><score-part id="P2"><part-name>Piano</part-name></score-part></part-list>'
        + '<part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure></part>'
        + '<part id="P2"><measure number="1"><attributes><divisions>1</divisions><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>'
        + '<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff></note><backup><duration>4</duration></backup><note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff></note></measure></part></score-partwise>';
      out.F = importMusicXML(third('')).song.voxVoices.join('/');
      out.G = importMusicXML(third('谱友圈 puyouquan.com')).song.voxVoices.join('/');
      /* 抽查四份示例谱 */
      out.P = ['欢乐颂（四部合唱）', '欢乐颂（扫弦弹唱）', '欢乐颂（钢琴独奏）', '卡农进行（钢琴弹唱伴奏）'].map(n => { const p = PRESETS.find(x => x.name === n); const x = rt(migrate(p.make())); return [n, x.a.vv + ' ' + x.a.tv, x.b.vv + ' ' + x.b.tv]; });
      return out;
    }, XML);
    const same = x => x.a.vv === x.b.vv && x.a.vn === x.b.vn && x.a.vg === x.b.vg && x.a.rows === x.b.rows && x.a.pas === x.b.pas;
    T('X4', r.A.a.vv === 'Voice/右手伴奏/左手伴奏' && same(r.A), 'X4a 送别 + 一键配伴奏（钢琴伴奏歌谱）导出再导入：轨名「Voice / 右手伴奏 / 左手伴奏」、记谱法、花括号、每行音高、钢琴伴奏判定与原谱相同', J({ pn: r.A.pn, a: r.A.a.vv, b: r.A.b.vv, vg: [r.A.a.vg, r.A.b.vg], rows: r.A.a.rows === r.A.b.rows }));
    T('X4', same(r.B) && r.B.b.vv === '旋律/右手/左手', 'X4b 旋律 + 钢琴（右手 / 左手）往返：旋律 / 右手 / 左手', J({ pn: r.B.pn, b: r.B.b.vv }));
    T('X4', same(r.C) && r.C.b.vv === '女高/女低/右手/左手', 'X4c 合唱 + 钢琴往返：女高 / 女低 / 右手 / 左手（合唱方括号、钢琴花括号不变）', J({ pn: r.C.pn, b: r.C.b.vv, vg: r.C.b.vg }));
    T('X4', same(r.D) && r.D.b.vv === '旋律/右手伴奏/左手伴奏', 'X4d 简谱旋律 + 五线谱伴奏往返：旋律 / 右手伴奏 / 左手伴奏', J({ pn: r.D.pn, b: r.D.b.vv }));
    T('X4', same(r.E) && r.E.b.vv === '钢琴·右手/钢琴·左手', 'X4e 行名本身带「·」（钢琴·右手 / 钢琴·左手）往返不变（part-name 四段对半拆）', J({ pn: r.E.pn, b: r.E.b.vv }));
    T('X4', r.F === 'Trumpet in Bb/Piano·右手/Piano·左手' && r.G === 'Trumpet in Bb/Piano·右手/Piano·左手', 'X4f 第三方 Piano 大谱表仍按原口径「Piano·右手 / Piano·左手」（不带 software、自家 software 但 part-name 一段）', J({ F: r.F, G: r.G }));
    T('X4', r.P.every(([, a, b2]) => a === b2), 'X4g 抽查四部合唱 / 扫弦弹唱 / 钢琴独奏 / 钢琴弹唱伴奏：往返轨名不变', J(r.P));
    T('X4', !pg.__pe.length, 'X4h 无页面报错', pg.__pe.slice(0, 3).join(' | '));
    await close(pg);
  }));

  /* ================= X6 收尾（v68.3 验收 DF-1..12 · ENG-2 · ENG-3） ================= */
  /* DF-1 内存版存储下切布局：有内容就先确认（导出 / 仍然切换 / 取消），说明如实 */
  const x6a = (shell, url) => SAFE('X6', 'X6a ' + shell, async () => {
    const pg = await open(url, { block: true, wait: 2200 }); await prep(pg);
    await EV(pg, () => { const s = createSong('vocal', { title: '一小时的心血', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); s.measures[0].voxes[0].forEach((c, i) => { c.deg = i + 1; }); addDoc(s); render(); return 1; });
    const href0 = await EV(pg, () => location.href);
    await EV(pg, () => { showPrefs(); return 1; }); await wait(pg, 200);
    const d = await EV(pg, () => ({ d: (document.getElementById('prf-d-oldshell') || {}).textContent || '', note: (document.querySelector('.prf-note') || {}).textContent || '' }));
    await pg.click('[data-prf="oldshell"]'); await wait(pg, 1200);
    const a = await EV(pg, () => ({ href: location.href, ask: !!document.getElementById('psa-go'), docs: docs.map(x => (x.song || {}).title), h3: (document.querySelector('#modal-mask h3') || {}).textContent || '' }));
    await shot(pg, 'x6a_' + shell + '_ask');
    let c = null, dl = null, nav = null, after = null;
    if (a.ask) {
      await pg.click('#psa-cancel'); await wait(pg, 300);
      c = await EV(pg, () => ({ href: location.href, modal: !!document.getElementById('modal-mask'), next: PREF_SHELL_NEXT, docs: docs.length, key: localStorage.getItem('musetab-flow') }));
      await EV(pg, () => { showPrefs(); return 1; }); await wait(pg, 150); await pg.click('[data-prf="oldshell"]'); await wait(pg, 300);
      const dp = pg.waitForEvent('download', { timeout: 4000 }).catch(() => null);
      await pg.click('#psa-exp'); dl = await dp;
      if (dl) { try { dl.txt = fs.readFileSync(await dl.path(), 'utf8'); } catch (_) { dl.txt = ''; } }
      const np = pg.waitForNavigation({ timeout: 6000 }).catch(() => null);
      await pg.click('#psa-go'); nav = await np; await wait(pg, 600);
      after = await EV(pg, () => location.search).catch(() => null);
    }
    T('X6', /清空/.test(d.d) && /只对这次打开有效/.test(d.note) && a.ask && a.href === href0 && a.docs.includes('一小时的心血') && c && !c.modal && c.next === null && c.href === href0 && c.docs === a.docs.length
      && !!dl && /"title":\s*"一小时的心血"/.test(dl.txt || '') && /shell=/.test(after || ''),
      'X6a（DF-1）' + shell + ' 本机存储被禁用、有内容时切「使用旧版布局」：说明写「会清空」、先弹确认（不刷新、窗口都在）；取消＝开关回原位；导出＝下载曲谱文件；仍然切换才刷新（此前直接刷新、编辑全丢、说明写「曲谱不受影响」）',
      J({ d, a, c, dl: dl && (dl.txt || '').slice(0, 80), after }));
    await close(pg);
  });
  if (want('X6')) SHELLS.forEach(([sh, u]) => jobs.push(() => x6a(sh, u)));
  /* DF-2 / DF-3 / DF-4 / DF-10 / DF-11 填词框 */
  const x6b = (shell, url) => SAFE('X6', 'X6b ' + shell, async () => {
    const pg = await open(url); await prep(pg);
    const cdp = await pg.context().newCDPSession(pg);
    const setup = pre => EV(pg, pre => { const s = createSong('vocal', { title: '词', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 });
      const D = [[1, 2, 0, 3], [3, 5, 6, 5]]; s.measures.forEach((m, mi) => m.voxes[0].forEach((c, i) => { c.deg = D[mi][i]; })); s.measures[0].voxes[0][3].tie = true;
      (pre || []).forEach(([mi, ci, t]) => { const c = s.measures[mi].voxes[0][ci]; c.lyrics = [t]; });
      loadSong(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; undoStack.length = 0; redoStack.length = 0; clampSel(); render(); return 1; }, pre);
    const enter = async pre => { await blurAll(pg); await setup(pre); await wait(pg, 120); await blurAll(pg); await pg.keyboard.press('Enter'); await wait(pg, 250);
      const f = await EV(pg, () => (document.activeElement || {}).id); if (f !== 'i-lyric') throw new Error('Enter 没进填词框：' + f); };
    const st = () => EV(pg, () => ({ ly: __lyr(0), sel: sel.mi + ':' + sel.ci, box: document.getElementById('i-lyric').value, focus: (document.activeElement || {}).id, chun: JSON.stringify(song).includes('chun') }));
    const r = {};
    /* DF-2 合成到一半点谱面另一个音 */
    await enter();
    await cdp.send('Input.imeSetComposition', { text: 'chun', selectionStart: 4, selectionEnd: 4 }); await wait(pg, 150);
    const pt = await EV(pg, () => { const t = document.querySelector('#score [data-mi="1"][data-ci="1"]'); const q = t.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; });
    await pg.mouse.click(pt.x, pt.y); await wait(pg, 400);
    r.ime1 = await st();
    await pg.keyboard.press('Enter'); await wait(pg, 250); await pg.keyboard.type('春'); await wait(pg, 250);
    r.ime2 = await st();
    T('X6', !r.ime1.chun && r.ime1.box !== 'chun' && !r.ime2.chun, 'X6b（DF-2）' + shell + ' 输入法合成到一半（chun）点谱面另一个音：拼音不写进任何音、框里不留拼音；之后回车再打字也没有 chun', J(r));
    /* DF-3 框里直接 Ctrl+Z / Ctrl+Shift+Z */
    await enter(); await pg.keyboard.insertText('春眠不觉晓'); await wait(pg, 250);
    r.z0 = await st();
    await pg.keyboard.press('Control+z'); await wait(pg, 250); r.z1 = await st();
    await pg.keyboard.press('Control+Shift+z'); await wait(pg, 250); r.z2 = await st();
    T('X6', r.z0.ly === '1:春 2:眠 r: 3~:不 | 3: 5:觉 6:晓 5:' && r.z1.ly === '1: 2: r: 3~: | 3: 5: 6: 5:' && r.z1.focus === 'i-lyric' && r.z1.sel === '0:0' && r.z2.ly === r.z0.ly,
      'X6c（DF-3）' + shell + ' 整句分配后焦点仍在框里：Ctrl+Z 一次撤回整句、光标回到起点 0:0；Ctrl+Shift+Z 重做（此前框里按 Ctrl+Z 没反应）', J({ z0: r.z0, z1: r.z1, z2: r.z2 }));
    /* DF-4 改已有歌词：末尾追加一个字 / 插标点＝写回这一个音 */
    await enter([[0, 0, '旧'], [0, 1, '词']]); await pg.keyboard.press('End'); await pg.keyboard.type('春'); await wait(pg, 250); r.app = await st();
    await enter([[0, 0, '花儿'], [0, 1, '为']]); await pg.keyboard.press('End'); await pg.keyboard.type('，'); await wait(pg, 250); r.pun = await st();
    T('X6', r.app.ly.startsWith('1:旧春 2:词 ') && r.app.sel === '0:0' && r.pun.ly.startsWith('1:花儿， 2:为 ') && r.pun.sel === '0:0',
      'X6d（DF-4）' + shell + ' 改已有歌词：「旧」后打「春」＝「旧春」、「花儿」后加「，」＝「花儿，」，都只改当前音、不覆盖后面的「词」「为」（原行为）', J({ app: r.app, pun: r.pun }));
    /* DF-10 输入法按词上屏后习惯性回车 */
    await enter();
    const ime = async (py, t) => { await cdp.send('Input.imeSetComposition', { text: py, selectionStart: py.length, selectionEnd: py.length }); await cdp.send('Input.insertText', { text: t }); await wait(pg, 150); };
    await ime('chunmian', '春眠'); await pg.keyboard.press('Enter'); await wait(pg, 120);
    await ime('bu', '不'); await pg.keyboard.press('Enter'); await wait(pg, 120);
    await ime('juexiao', '觉晓'); await wait(pg, 200); r.ent = await st();
    T('X6', r.ent.ly === '1:春 2:眠 r: 3~:不 | 3: 5:觉 6:晓 5:', 'X6e（DF-10）' + shell + ' 「春眠」上屏（自动前进）→ 回车 →「不」→ 回车 →「觉晓」：不空掉音（自动前进后紧跟的回车只当确认）', J(r.ent));
    /* DF-11 连写 */
    await enter(); await pg.keyboard.type('花_儿'); await wait(pg, 250); r.jn = await st();
    const tk = await EV(pg, () => smartTokenize('花_儿 春').map(t => t.v).join('/'));
    T('X6', r.jn.ly.startsWith('1:花儿 2: ') && r.jn.sel === '0:0' && tk === '花儿/春', 'X6f（DF-11）' + shell + ' 「花_儿」＝同一个音上「花儿」（衬字 / 儿化），光标不动；智能填词同一规则', J({ jn: r.jn, tk }));
    T('X6', !pg.__pe.length, 'X6b–f ' + shell + ' 无页面报错', pg.__pe.slice(0, 3).join(' | '));
    await close(pg);
  });
  if (want('X6')) SHELLS.forEach(([sh, u]) => jobs.push(() => x6b(sh, u)));
  /* DF-5 「我的曲谱」写不进（配额已满，读取正常） */
  if (want('X6')) jobs.push(() => SAFE('X6', 'X6g', async () => {
    const pg = await open(URL0); await EV(pg, () => { window.__gr0 = guardReplace; return 1; }); await prep(pg);
    const full = on => EV(pg, on => { if (!window.__si0) window.__si0 = Storage.prototype.setItem;
      Storage.prototype.setItem = on ? function (k, v) { if (k === 'musetab-library-v1') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); return __si0.apply(this, arguments); } : __si0; return 1; }, on);
    const mk = t => EV(pg, t => { try { closeModal(); } catch (_) {} const s = createSong('vocal', { title: t, key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); s.measures[0].voxes[0].forEach((c, i) => { c.deg = i + 1; }); addDoc(s); pushUndo(); render(); __toasts.length = 0; return 1; }, t);
    await full(true);
    await mk('刚写的新歌');
    const a = await EV(pg, () => { const r = saveToLibrary(); return { r, id: song.id || null, toasts: __toasts.slice(), modal: !!document.getElementById('lf-exp'), inLib: libLoad().some(e => e.title === '刚写的新歌') }; });
    await mk('关窗要转存的谱');
    const b2 = await EV(pg, () => { const n0 = docs.length, i = curDocI; closeDocAt(i); return { n0, n1: docs.length, toasts: __toasts.slice(), modal: !!document.getElementById('lf-exp'), cur: song.title }; });
    await mk('要被替换的谱');
    await EV(pg, () => { window.__proc = 0; __gr0(() => { window.__proc++; }); return 1; }); await wait(pg, 100);
    await pg.click('#gr-save').catch(() => {}); await wait(pg, 200);
    const c = await EV(pg, () => ({ proc: __proc, modal: !!document.getElementById('lf-exp'), id: song.id || null }));
    /* 已入库谱的实时同步写不进：提示「可能已满」（此前 libSave 吞掉，一声不响） */
    await full(false); await EV(pg, () => { try { closeModal(); } catch (_) {} saveToLibrary(); return 1; }); await full(true);
    await EV(pg, () => { __toasts.length = 0; persist._warned = false; mutate(() => { song.measures[1].voxes[0][0].deg = 5; }); persistNow(); return 1; });
    const d = await EV(pg, () => __toasts.slice());
    await full(false);
    T('X6', a.r === false && !a.id && a.modal && !a.inLib && !a.toasts.some(t => /已保存/.test(t)),
      'X6g（DF-5）「我的曲谱」写不进时「存入我的曲谱」：返回 false、不留新 id、不提示「已保存」、弹「存不下了」并给导出', J(a));
    T('X6', b2.n1 === b2.n0 && b2.modal && b2.cur === '关窗要转存的谱' && !b2.toasts.some(t => /已关闭/.test(t)), 'X6h（DF-5）写不进时关有内容的窗口：窗口不关、不提示「已关闭并存入」、弹「存不下了」', J(b2));
    T('X6', c.proc === 0 && c.modal, 'X6i（DF-5）替换前确认框「存入我的曲谱并继续」写不进：不替换（proceed 没跑）、弹「存不下了」', J(c));
    T('X6', d.some(t => /可能已满/.test(t)), 'X6j（DF-5）已入库谱的编辑实时同步写不进：提示「本地存储写入失败（可能已满）」', J(d));
    await close(pg);
  }));
  /* DF-6 内存版存储下常驻提示如实；DF-7 互动谱不提示 */
  const x6k = (shell, url) => SAFE('X6', 'X6k ' + shell, async () => {
    const pg = await open(url, { block: true, wait: 2200 }); await prep(pg);
    await EV(pg, () => { const mk = t => { const s = createSong('vocal', { title: t, key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); s.measures[0].voxes[0].forEach((c, i) => { c.deg = i + 1; }); addDoc(s); };
      mk('甲'); mk('乙'); render(); saveToLibrary(); render(); __toasts.length = 0; return 1; }); await wait(pg, 200);
    const a = await EV(pg, () => { const p = document.getElementById('flw-save'), tab = document.querySelector('#doc-tabs .dtab.on');
      return { pill: p ? p.textContent.trim() : null, pillTitle: p ? p.title : null, tab: tab ? tab.title : null, sst: saveStatusText(song).text }; });
    const cl = await EV(pg, () => { __toasts.length = 0; closeDocAt(docs.findIndex(d => (d.song || {}).title === '甲')); return __toasts.slice(); });   /* 没存入的那份 */
    const bu = await EV(pg, () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
    T('X6', (shell !== 'flow' || /仅本次/.test(a.pill)) && /仅本次/.test(a.tab || '') && /关闭页面/.test(a.sst) && cl.some(t => /本次/.test(t) && !/并存入/.test(t)) && bu,
      'X6k（DF-6）' + shell + ' 本机存储被禁用：存入后胶囊仍写「仅本次」（flow）、页签提示「仅本次…」、保存状态说关页就没、关窗提示「放进了本次的我的曲谱」、有内容时关页 / 刷新拦一次（beforeunload）',
      J({ a, cl, bu }));
    await close(pg);
  });
  if (want('X6')) SHELLS.forEach(([sh, u]) => jobs.push(() => x6k(sh, u)));
  if (want('X6')) jobs.push(() => SAFE('X6', 'X6l', async () => {
    /* 在正常页里取一份谱，按 exportInteractiveCard 的注入方式拼一份互动谱 HTML（window.PYQ_SHARE 在 head 闭合前） */
    const pg0 = await open(URL0);
    const sj = await EV(pg0, () => { const s = createSong('vocal', { title: '收到的互动谱', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); s.measures[0].voxes[0].forEach((c, i) => { c.deg = i + 1; }); return JSON.stringify({ v: 1, mode: 'viewer', song: migrate(s) }); });
    await close(pg0);
    const html = fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8');
    const inj = '<script id="pyq-share-data">window.PYQ_SHARE=' + sj.replace(/<\//g, '<\\/') + ';<\/script>\n';
    const f = path.join(require('os').tmpdir(), 'tv_fix683_icard_' + process.pid + '.html'); fs.writeFileSync(f, html.replace(/<\/head>/i, inj + '</head>'));
    const pg = await open('file://' + f, { block: true, wait: 2600 });
    const r = await EV(pg, () => ({ vm: (() => { try { return !!viewerMode; } catch (_) { return null; } })(), mem: !!window.PYQ_LS_MEM, tl: __tl.slice() }));
    await close(pg); try { fs.unlinkSync(f); } catch (_) {}
    T('X6', r.vm && r.mem && !r.tl.some(t => /本机存储被浏览器禁用/.test(t)) && !pg.__pe.length, 'X6l（DF-7）收件人在禁用存储的浏览器里打开互动谱 HTML：进观看页、不提示「本机存储被浏览器禁用…要留存请导出」', J(r));
  }));
  /* DF-8 / DF-9 「打开文件…」按文件头分流；ENG-2 旧外壳「打开」提示不写 Ctrl+O */
  const x6m = (shell, url) => SAFE('X6', 'X6m ' + shell, async () => {
    const pg = await open(url); await prep(pg);
    const mid = Buffer.from(await EV(pg, () => { const s = createSong('vocal', { title: 'mid', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 }); s.measures.forEach(m => m.voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 1][i]; })); const o = exportMIDI(s); return Array.from(o.bytes || o); }));
    const xml = Buffer.from(XML, 'utf8');
    const mtab = Buffer.from(await EV(pg, () => { const s = createSong('vocal', { title: '无扩展名的曲谱', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }); s.measures[0].voxes[0][0].deg = 3; return JSON.stringify(s); }), 'utf8');
    const reset = () => EV(pg, () => { try { closeModal(); } catch (_) {} try { NWP.close(); } catch (_) {} try { if (flowOn()) FLOW.menu.close(); } catch (_) {} __toasts.length = 0; while (docs.length > 1) closeDocAt(0); return 1; });
    const st = () => EV(pg, () => ({ h3: (document.querySelector('#modal-mask .modal h3') || {}).textContent || null, live: !!(NWP.modal && NWP.modal.isConnected), docs: docs.length, title: song.title, toasts: __toasts.slice() }));
    const viaOpen = async (name, mt, buf) => {
      await reset();
      let fc;
      if (shell === 'flow') {
        await pg.click('#flw-file'); await wait(pg, 200);
        const it = await pg.evaluateHandle(() => [...document.querySelectorAll('#popmenu [data-fa]')].find(el => /^打开文件/.test((el.querySelector('.flw-ml') || el).textContent.trim())) || null);
        const el = it.asElement(); if (!el) throw new Error('文件 ▾ 里没有「打开文件…」');
        [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), el.click()]);
      } else [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), pg.click('#b-open')]);
      await fc.setFiles({ name, mimeType: mt, buffer: buf }); await wait(pg, 900); return st();
    };
    const r = {};
    r.midXml = await viaOpen('midi-as.xml', 'application/xml', mid);
    r.xmlJson = await viaOpen('xml-as.json', 'application/json', xml);
    r.noext = await viaOpen('song', 'application/octet-stream', mtab);
    const title = await EV(pg, () => (document.getElementById('b-open') || {}).title || '');
    await reset();
    T('X6', /导入 MIDI/.test(r.midXml.h3 || '') && r.xmlJson.live && !r.xmlJson.toasts.some(t => /不是谱友圈曲谱文件/.test(t)),
      'X6m（DF-8）' + shell + ' 扩展名写错按文件头认：MIDI 改名 .xml → 「导入 MIDI」；MusicXML 改名 .json → 「从已有音乐」导入页（此前报「不是合法的 XML」「不是谱友圈曲谱文件」）', J({ midXml: r.midXml, xmlJson: r.xmlJson }));
    T('X6', r.noext.docs === 1 && r.noext.title === '无扩展名的曲谱' && r.noext.toasts.some(t => /^已打开/.test(t)), 'X6n（DF-9）' + shell + ' 没有扩展名的曲谱文件与 .mtab.json 同一种窗口行为：替换当前窗口（窗口数不变、提示「已打开」）', J(r.noext));
    if (shell === 'classic') T('X6', !/Ctrl\+O/.test(title), 'X6o（ENG-2）旧外壳顶栏「打开」的提示不写 Ctrl+O（旧外壳编辑态不拦 Ctrl+O）', J(title));
    await close(pg);
  });
  if (want('X6')) SHELLS.forEach(([sh, u]) => jobs.push(() => x6m(sh, u)));
  /* DF-12 / ENG-3 MusicXML 往返 */
  if (want('X6')) jobs.push(() => SAFE('X6', 'X6p', async () => {
    const pg = await open(URL0); await prep(pg);
    const r = await EV(pg, () => {
      const mk = (vv, vn, vg) => { const s = createSong('staff', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: vv.length }); s.voxVoices = vv; s.voxNotations = vn; if (vg) s.voxGroups = vg;
        s.measures.forEach(m => { m.voxes = vv.map(() => blankVoxCols(4, 4)); m.voxes.forEach((cs, vi) => cs.forEach((c, i) => { c.deg = i + 1; if (vn[vi] === 'bass') c.oct = -1; })); }); return s; };
      const vv = s => (s.voxVoices || []).join('/');
      const jg = mk(['旋律', '右手伴奏', '左手伴奏'], ['num', 'staff', 'bass'], [{ type: 'brace', from: 1, to: 2 }]);
      const x = exportMusicXML(jg);
      const ms = x.replace(/<software>[^<]*<\/software>/, '<software>MuseScore 4.4.2</software>');
      const msNoMisc = ms.replace(/<miscellaneous>[\s\S]*?<\/miscellaneous>/, '');
      const out = { own: vv(importMusicXML(x).song), musescore: vv(importMusicXML(ms).song), msNoMisc: vv(importMusicXML(msNoMisc).song) };
      const rt2 = s => { const a = importMusicXML(exportMusicXML(s)).song; return [vv(a), vv(importMusicXML(exportMusicXML(a)).song)]; };
      out.emptyTop = rt2(mk(['', '左手'], ['staff', 'bass'], [{ type: 'brace', from: 0, to: 1 }]));
      out.ab = rt2(mk(['A·B', 'C'], ['staff', 'bass'], [{ type: 'brace', from: 0, to: 1 }]));
      out.presets = ['欢乐颂（钢琴独奏）', '卡农进行（钢琴弹唱伴奏）'].map(n => { const p = PRESETS.find(y => y.name === n); const s = migrate(p.make()); const b = importMusicXML(exportMusicXML(s)).song;
        return [n, JSON.stringify(s.voxGroups || null), JSON.stringify(b.voxGroups || null), vv(s), vv(b)]; });
      out.defaultBytes = !/miscellaneous/.test(exportMusicXML(migrate(PRESETS.find(y => y.name === '欢乐颂（钢琴独奏）').make())));
      return out; });
    const W = '旋律/右手伴奏/左手伴奏';
    T('X6', r.own === W && r.musescore === W && r.msNoMisc === W, 'X6p（DF-12）钢琴伴奏歌谱导出后在 MuseScore 另存（<software> 换名）、连 <miscellaneous> 一起丢掉，导回来仍是「旋律 / 右手伴奏 / 左手伴奏」（此前成「右手伴奏·左手伴奏·右手」）', J(r));
    T('X6', r.emptyTop[0] === '/左手' && r.emptyTop[1] === '/左手' && r.ab[0] === 'A·B/C' && r.ab[1] === 'A·B/C', 'X6q（DF-12）上行轨名为空 / 行名「A·B」+「C」：往返两次不变（此前每往返一次名字长一截）', J({ emptyTop: r.emptyTop, ab: r.ab }));
    T('X6', r.presets.every(p => p[1] === p[2] && p[3] === p[4]) && r.defaultBytes, 'X6r（ENG-3）示例钢琴独奏 / 钢琴弹唱伴奏往返不多出显式 voxGroups（与 v68.2 同形）；「右手 / 左手」默认名不写 miscellaneous（导出逐字节不变）', J(r.presets));
    await close(pg);
  }));

  /* ================= X5 D5 ?pub + ?shell 不写键 ================= */
  if (want('X5')) jobs.push(() => SAFE('X5', 'X5', async () => {
    const cases = [['pub', '?pub=abcDEF123&shell=classic', null], ['review', '?review=abc123&shell=classic', null], ['shellFirstHash', '?shell=classic&pub=abcDEF123#x', null],
      ['plain', '?shell=classic', '0'], ['emptyPub', '?pub=&shell=classic', '0']];
    const r = {};
    for (const [k, q, want0] of cases) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const pe = []; pg.on('pageerror', e => pe.push(e.message));
      const base = URL0.replace(/[?#].*$/, '');
      await pg.goto(base + q); await wait(pg, 1300);
      const a = await EV(pg, () => ({ key: localStorage.getItem('musetab-flow'), pre: document.documentElement.classList.contains('flow-pre') }));
      await pg.goto(base); await wait(pg, 1300);
      const c = await EV(pg, () => ({ key: localStorage.getItem('musetab-flow'), flow: document.body.classList.contains('flow') }));
      r[k] = { want: want0, a, later: c, pe: pe.length }; await ctx.close();
    }
    const vk = ['pub', 'review', 'shellFirstHash'];
    T('X5', vk.every(k => r[k].a.key === null && r[k].a.pre === false && r[k].later.key === null && r[k].later.flow === true),
      'X5a 观看 / 分享意图（?pub= / ?review= 合法 ID）带 ?shell=classic：本次旧外壳（无 html.flow-pre）、不写 musetab-flow；之后不带参数打开仍是新外壳', J(vk.map(k => [k, r[k]])));
    T('X5', r.plain.a.key === '0' && r.plain.later.flow === false && r.emptyPub.a.key === '0', 'X5b 普通编辑页 ?shell=classic 仍写 \'0\'（刷新后保持旧外壳）；空 pub 不算观看意图（同 FLOW.vint）', J({ plain: r.plain, emptyPub: r.emptyPub }));
  }));

  /* ================= X7 v68.5（§9.0 P1）「伴奏织体」弹窗与失败提示里标和弦的入口按外壳指 ================= */
  /* 新外壳没有右栏「创作」页（和弦在「文字」页「输入和弦…」/ Ctrl+K）；旧外壳原文不变。两种谱：钢琴伴奏歌谱（旋律行标和弦）与钢琴谱（右手标和弦） */
  /* v69.0 迁移（规格 §8.4）：新外壳默认下 #b-acctex 改开织体条（不再开弹窗，新路径等价在 tv_next N3）→ flow 分支改跑 ?next=0，弹窗文字断言原样覆盖回退路径 */
  const SHELLS7 = [['flow', withQ(URL0, 'next=0')], SHELLS[1]];
  if (want('X7')) SHELLS7.forEach(([sh, u]) => jobs.push(() => SAFE('X7', 'X7 ' + sh, async () => {
    const pg = await open(u); await prep(pg);
    const r = {};
    for (const [k, kind] of [['acc', 'JG'], ['pn', 'piano']]) {
      r[k] = await EV(pg, kd => {
        const s = kd === 'JG' ? NWB.build('JG', { title: 'X7', key: 'C', beats: 4, unit: 4, nMea: 2 }) : createSong('piano', { title: 'X7', key: 'C', beats: 4, unit: 4, nMea: 2 });
        loadSong(s); render(); document.getElementById('b-acctex').onclick();
        const m = document.querySelector('#modal-mask .modal'); const txt = m ? m.textContent : '';
        const a = document.getElementById('tex-auto'); if (a) a.checked = false;
        window.__toasts = []; const go = document.getElementById('tex-go'); if (go) go.onclick();
        try { closeModal(); } catch (_) {}
        return { modal: !!m, acc: !!(accTexRows(song) || {}).acc, txt: txt.slice(0, 400), toast: (window.__toasts || []).join(' | ') };
      }, kind);
    }
    const flow = sh === 'flow';
    /* v68.7 S1 迁移（规格 §6.C3 #18 / chHint，P3 不指路）：新外壳弹窗说明原 /右栏「文字」页的「输入和弦…」（Ctrl+K）/ → 只写控件名与快捷键「「输入和弦…」（Ctrl+K）」、不写哪一栏哪一页；「未生成」提示原 /「文字」页/ → 短文（钢琴伴奏歌谱「还没有旋律或和弦」/ 钢琴谱「还没有标注和弦」）。旧外壳分支一字不动。修前红：5cddfb8 新外壳说明带「右栏「文字」页」、提示为整句 */
    const SHORT = { acc: '还没有旋律或和弦', pn: '还没有标注和弦' };
    const good = (x, k) => x.modal && (flow ? /「输入和弦…」（Ctrl\+K）/.test(x.txt) && !/「创作」页|右栏|「文字」页/.test(x.txt) && x.toast === SHORT[k]
      : /右栏「创作」页的「和弦」/.test(x.txt) && /右栏「创作」页的「和弦」/.test(x.toast));
    T('X7', r.acc.acc === true && r.pn.acc === false && good(r.acc, 'acc') && good(r.pn, 'pn') && !pg.__pe.length,
      'X7 ' + sh + ' 「伴奏织体」弹窗说明与「未生成」提示：' + (flow ? '写「输入和弦…」（Ctrl+K）、不写在哪一栏，不再提已不存在的「创作」页；未生成提示为短文' : '仍指向右栏「创作」页的「和弦」（旧外壳原文）') + '（钢琴伴奏歌谱 / 钢琴谱两种）', J({ r, pe: pg.__pe.slice(0, 2) }));
    await close(pg);
  })));

  /* 并发 ≤2（本机 4 核，另有工作流在跑） */
  const q = jobs.slice(); await Promise.all([0, 1].map(async () => { while (q.length) await q.shift()(); }));
  for (const id of ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7']) if (OUT[id]) { console.log('— ' + id); OUT[id].forEach(l => console.log('  ' + l)); }
  console.log(`\nPASS ${pass}/${total}`);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
