'use strict';
/* v70.0 P2a B 组（规格 docs/spec-2026-11-v700.md §6 / §8.3）：新建面板 4 个新组合（合唱＋钢琴 · 尤克里里指弹 · 器乐＋钢琴 · 简谱视唱）＋ 西洋管弦「旋律用 简谱」＋ 刻版几何。
   新行为只在新外壳新形态（nwP2A()）；旧外壳 / ?next=0 与基线 6d8d6f8 逐字节（fixtures/v700_base.json 的 panel 键）。
   N1  §6.10 金表：真实点击代表组合（参数行 / ⋯ 弹层先断言可见再点）＋ linkApply→planOf→realCreate 全量（新组合 ＋ 43 个基线组合）——面板谱行 / 建成 stackOf /
       面板谱名＝建成谱名＝docTypeLabel＝页签提示 / pzOf 主谱种 › 二级与「也在」/ intent＝用途；JSON 与本机存储往返不变；新增字段只有 intent；
       互切（setVoxNotation 切不在钢琴组里的旋律 / 人声行）落到镜像二级
   N2  零差异：?next=0 与 ?shell=classic 下 11 个用途的 .nf-shell（去预览框内容）、乐器下拉选项、5 条新深链的「没认出」提示与 .nf-shell，与基线逐字节（存 sha1＋长度）
   N3  「旋律用」默认值（§6.3 全部用例，真实点击）；?next=0 下视唱 / 小提琴仍固定五线谱（无「旋律用」）
   N4  深链 5 条：预选结果、无「没认出」、linkOf ∘ linkApply 往返一致
   N5  刻版几何 G1–G8（§6.11）：J×4＋G、S×4＋G、J×2＋G、J×3＋G 3/4、压力谱（右手上加线 / 符干朝上、合唱 3 段词、左手下加线、力度 / 踏板）、小提琴＋钢琴；
       1280 / 1440 两宽 × 默认字体 / --font-ui 改 DejaVu Sans 两遍；另：尤克里里指弹、大提琴＋钢琴、简谱视唱各一条
   N6  预览样谱：新组合都能刻（无「预览暂不可用」）、行标与引擎行位对齐、离屏不变量（同 tv_offscreen T2a 口径）
   N7  胶片步骤 / 建成提示：合唱＋钢琴不出现「一键配伴奏」「填进下面两行」（悬浮条同）；钢琴伴奏歌谱照旧有
   N8  全部建谱路径写 intent：面板点击 / 双击用途 / 回车、▾ 用途、Alt+Shift+N、命令面板 r1:new / r1:last、启动台 sc:*、深链＋回车；旧外壳同样写
   N9  快捷键（Alt+N、↑↓ / Home / End、1–5、←→ 组内、Enter、Esc、Alt+Shift+N）行为序列与基线新形态相同（fixtures panel.keys）
   N10 点击数（P2a 形态，只记录）：尤克里里指弹 3、简谱视唱 3、萨克斯简谱 4；验收⑤ 合唱＋钢琴＝4（歌谱 → 四部 → 参数行「加伴奏」→ 创建）
   E   页面脚本错误 0
   用法：node tv_v700new.js [--write-base]（--write-base＝用 git show 6d8d6f8:muse-tab/index.html 生成 fixtures/v700_base.json 的 panel 键，其余键原样保留）
   env：MUSETAB_URL 被测页 · ONLY=N1,N5 · FONTS=0（N5 只跑默认字体） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const GC = require('./geom_census');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const BASE_COMMIT = '6d8d6f84ae84c0a64818b7d0327cb7e73a45770e';
const FIX = path.join(__dirname, 'fixtures', 'v700_base.json');
const WRITE = process.argv.includes('--write-base');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x), W = ms => new Promise(r => setTimeout(r, ms));
const sha = t => t == null ? null : crypto.createHash('sha1').update(String(t)).digest('hex') + ':' + String(t).length;
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); console.log(lines[lines.length - 1]); };
const NOTE = s => { lines.push('ℹ️ ' + s); console.log('ℹ️ ' + s); };

const SCENES = ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom'];
const LINKS = ['?new=vocal&parts=4&tacc=with&mel=J', '?new=solo&inst=uku', '?new=inst&instKey=violin&tacc=with', '?new=sight&mel=J', '?new=inst&instKey=sax&mel=J'];
/* tv_newpanel 的 43 组合（基线口径）：[用途, 变体, 旋律用, 谱行, 谱名, docType] */
const COMBOS = [
  ['gtr', { inst: 'guitar', pen: 'T' }, 'J', 'JT', '吉他弹唱谱', 'guitar'], ['gtr', { inst: 'guitar', pen: 'J' }, 'J', 'JT', '吉他弹唱谱', 'guitar'],
  ['gtr', { inst: 'uku', pen: 'T' }, 'J', 'JT', '尤克里里弹唱谱', 'uku'], ['gtr', { inst: 'uku', pen: 'J' }, 'J', 'JT', '尤克里里弹唱谱', 'uku'],
  ['pacc', { acc: 'mel' }, 'J', 'JG', '钢琴伴奏歌谱', 'vocal'], ['pacc', { acc: 'mel' }, 'S', 'SG', '钢琴伴奏歌谱（五线谱）', 'instr'], ['pacc', { acc: 'pure' }, 'J', 'CG', '钢琴伴奏谱（纯伴奏）', 'pianoacc'],
  ['kids', { acc: 'mel' }, 'J', 'JG', '钢琴伴奏歌谱', 'vocal'], ['kids', { acc: 'mel' }, 'S', 'SG', '钢琴伴奏歌谱（五线谱）', 'instr'], ['kids', { acc: 'pure' }, 'J', 'CG', '钢琴伴奏谱（纯伴奏）', 'pianoacc'],
  ['vocal', { parts: 1 }, 'J', 'J', '简谱歌谱', 'vocal'], ['vocal', { parts: 1 }, 'S', 'S', '五线谱歌谱', 'instr'], ['vocal', { parts: 2 }, 'J', 'J', '简谱合唱谱', 'vocal'],
  ['vocal', { parts: 2 }, 'S', 'S', '五线谱合唱谱', 'vocal'], ['vocal', { parts: 3 }, 'J', 'J', '简谱合唱谱', 'vocal'], ['vocal', { parts: 3 }, 'S', 'S', '五线谱合唱谱', 'vocal'],
  ['vocal', { parts: 4 }, 'J', 'J', '简谱合唱谱', 'vocal'], ['vocal', { parts: 4 }, 'S', 'S', '五线谱合唱谱', 'vocal'],
  ['teach', { tacc: 'no' }, 'J', 'SJ', '教学对照谱', 'teach'], ['teach', { tacc: 'with' }, 'J', 'SJG', '教学对照谱（含伴奏）', 'teach'],
  ['sight', { clef: 'staff' }, 'J', 'S', '五线谱旋律', 'instr'], ['sight', { clef: 'bass' }, 'J', 'S', '五线谱旋律', 'instr'], ['solo', {}, 'J', 'ST', '吉他独奏谱', 'solo'],
  ['inst', { instKey: 'piano' }, 'J', 'G', '钢琴独奏谱', 'piano'], ['inst', { instKey: 'violin' }, 'J', 'S', '小提琴谱（五线谱）', 'instr'],
  ['inst', { instKey: 'erhu' }, 'J', 'J', '二胡谱（简谱）', 'vocal'], ['inst', { instKey: 'erhu' }, 'S', 'S', '二胡谱（五线谱）', 'instr'],
  ['inst', { instKey: 'guzheng' }, 'J', 'J', '古筝谱（简谱）', 'vocal'], ['inst', { instKey: 'guzheng' }, 'S', 'S', '古筝谱（五线谱）', 'instr'],
  ['inst', { instKey: 'epiano' }, 'J', 'G', '电钢琴独奏谱', 'piano'], ['inst', { instKey: 'flute' }, 'J', 'S', '长笛谱（五线谱）', 'instr'],
  ['inst', { instKey: 'trombone' }, 'J', 'S', '长号谱（五线谱）', 'instr'], ['inst', { instKey: 'bass' }, 'J', 'S', '贝斯谱（五线谱）', 'instr'],
  ['inst', { instKey: 'dizi' }, 'J', 'J', '笛子谱（简谱）', 'vocal'], ['inst', { instKey: 'dizi' }, 'S', 'S', '笛子谱（五线谱）', 'instr'],
  ['inst', { instKey: 'pipa' }, 'J', 'J', '琵琶谱（简谱）', 'vocal'], ['inst', { instKey: 'pipa' }, 'S', 'S', '琵琶谱（五线谱）', 'instr'],
  ['inst', { instKey: 'other' }, 'J', 'S', '器乐谱（五线谱）', 'instr'],
  ['chord', { ftype: 'C' }, 'J', 'C', '和弦谱', 'chord'], ['chord', { ftype: 'CJ' }, 'J', 'CJ', '功能谱', 'func'], ['chord', { ftype: 'CJ' }, 'S', 'CS', '五线谱和弦谱', 'func'],
  ['blank', {}, 'J', 'J', '简谱歌谱', 'vocal'], ['blank', {}, 'S', 'S', '五线谱歌谱', 'instr'],
];
const OLD_FIELDS = ['v', 'title', 'singer', 'lyricist', 'composer', 'maker', 'key', 'beats', 'unit', 'tempo', 'capo', 'customChords', 'inst', 'func', 'tabVoices', 'voxVoices',
  'voxNotations', 'lyricLines', 'measures', 'tempoUnit', 'tabStaff', 'gtype', 'tuning', 'voxDual', 'pianoAcc', 'funcNames', 'chordOnly', 'layout', 'voxGroups', 'instKey', 'mixer', 'mode', 'id',
  'rowNames', 'voxClefOct', 'intent'];
const STAFF_I = ['violin', 'flute', 'sax', 'trumpet', 'horn', 'trombone', 'cello', 'clarinet', 'bass'];
const JP_I = ['erhu', 'dizi', 'hulusi', 'suona', 'guzheng', 'pipa', 'yangqin', 'harmonica', 'recorder', 'melodica', 'ocarina', 'xiao'];
const INAME = { violin: '小提琴', flute: '长笛', sax: '萨克斯', trumpet: '小号', horn: '圆号', trombone: '长号', cello: '大提琴', clarinet: '单簧管', bass: '贝斯',
  erhu: '二胡', dizi: '笛子', hulusi: '葫芦丝', suona: '唢呐', guzheng: '古筝', pipa: '琵琶', yangqin: '扬琴', harmonica: '口琴', recorder: '竖笛', melodica: '口风琴', ocarina: '陶笛', xiao: '箫' };
/* §6.10 金表（新组合）：[深链参数, 面板谱行, 建成 stackOf, 谱名（null＝只核面板＝建成＝docTypeLabel）, 主 pz.sub, 也在（有序无关）, intent, 乐器] */
function GOLD() {
  const g = [];
  for (const n of [2, 3, 4]) {
    g.push(['new=vocal&parts=' + n + '&tacc=with&mel=J', 'JG', 'J', '简谱合唱谱（含钢琴伴奏）', 'hechang.jianpu', ['jianpu.hechang', 'gangqin.banzou'], 'vocal', '']);
    g.push(['new=vocal&parts=' + n + '&tacc=with&mel=S', 'SG', 'S', '五线谱合唱谱（含钢琴伴奏）', 'hechang.wuxian', ['wuxian.hechang', 'gangqin.banzou'], 'vocal', '']);
  }
  g.push(['new=vocal&parts=1&tacc=with&mel=J', 'JG', 'JG', '钢琴伴奏歌谱', 'gangqin.tanchang', ['jianpu.gequ'], 'vocal', '']);
  g.push(['new=vocal&parts=1&tacc=with&mel=S', 'SG', 'SG', '钢琴伴奏歌谱（五线谱）', 'gangqin.tanchang', ['wuxian.gequ'], 'vocal', '']);
  g.push(['new=vocal&parts=1&tacc=with&mel=J&lyr=0', 'JG', 'JG', null, 'gangqin.tanchang', ['jianpu.gequ'], 'vocal', '']);   /* 无词时第 11 行同 */
  g.push(['new=vocal&parts=1&tacc=with&mel=S&lyr=0', 'SG', 'SG', null, 'gangqin.tanchang', ['wuxian.gequ'], 'vocal', '']);
  g.push(['new=solo&inst=uku', 'ST', 'ST', '尤克里里独奏谱', 'uku.zhitan', [], 'solo', '']);
  for (const k of STAFF_I.concat(JP_I)) g.push(['new=inst&instKey=' + k + '&tacc=with', 'SG', 'SG', INAME[k] + '＋钢琴伴奏谱（五线谱）', 'wuxian.qiyue', ['gangqin.banzou'], 'inst', k]);
  g.push(['new=inst&instKey=other&tacc=with', 'SG', 'SG', '器乐＋钢琴伴奏谱（五线谱）', 'wuxian.qiyue', ['gangqin.banzou'], 'inst', 'other']);
  for (const k of STAFF_I) g.push(['new=inst&instKey=' + k + '&mel=J', 'J', 'J', INAME[k] + '谱（简谱）', 'jianpu.qiyue', [], 'inst', k]);
  for (const k of ['recorder', 'melodica', 'ocarina', 'xiao', 'cello', 'clarinet']) for (const m of ['J', 'S'])
    g.push(['new=inst&instKey=' + k + '&mel=' + m, m, m, INAME[k] + '谱（' + (m === 'J' ? '简谱' : '五线谱') + '）', (m === 'J' ? 'jianpu' : 'wuxian') + '.qiyue', [], 'inst', k]);
  g.push(['new=sight&mel=J', 'J', 'J', '简谱歌谱', 'jianpu.shichang', [], 'sight', '']);
  g.push(['new=sight', 'S', 'S', '五线谱旋律', 'wuxian.shichang', [], 'sight', '']);
  g.push(['new=sight&clef=bass', 'S', 'S', '五线谱旋律', 'wuxian.shichang', [], 'sight', '']);
  return g;
}

function INIT() {
  window.J = x => JSON.stringify(x);
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__panel = o => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} showNewWizard(o || {}); };
  window.__shell = () => { const s = document.querySelector('.nf-modal .nf-shell'); if (!s) return null; const c = s.cloneNode(true); const b = c.querySelector('#nf-pvbox'); if (b) b.innerHTML = ''; return c.innerHTML; };
  window.__st = () => { const st = NWP.state; if (!st) return null; const P = NWP.planOf(st); return { scene: st.scene, mel: st.mel, stack: P.stack, kind: P.kind.name, nf: (document.getElementById('nf-kind') || {}).textContent || '' }; };
  window.__songInfo = (s) => { s = s || song; const pz = PQ_KIND.pzOf(s);
    return { k: NWB.stackOf(s), name: docTypeLabel(s), kind: NWB.kindOfSong(s).name, dt: docType(s), pz: pz.pz + '.' + pz.sub, also: (pz.also || []).slice().sort(), inst: pz.inst || '', intent: s.intent == null ? null : s.intent }; };
}
function FONT_INIT() {
  const add = () => { const st = document.createElement('style'); st.id = 'v700-font'; st.textContent = ':root{--font-ui:"DejaVu Sans",sans-serif !important}'; (document.head || document.documentElement).appendChild(st); };
  if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
}
async function open(b, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INIT);
  if (o.font) await ctx.addInitScript(FONT_INIT);
  if (o.ls) await ctx.addInitScript(ls => { try { if (!sessionStorage.getItem('__seeded')) { Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('__seeded', '1'); } } catch (_) {} }, o.ls);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
  pg.on('pageerror', e => pageErrs.push((o.tag || '') + ' ' + e.message));
  await pg.goto(url); await W(o.wait || 1500);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
  return { ctx, pg };
}
const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
const guard = async (id, fn) => { try { await fn(); } catch (e) { T(id, false, '异常', String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

/* ---- N2 快照（被测页与基线页同一段代码） ---- */
async function snapPanel(b, url) {
  const { ctx, pg } = await open(b, url, { tag: 'N2' });
  const r = await pg.evaluate(async ([SCENES, LINKS]) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = { sc: {}, inst: null, ln: {} };
    for (const sc of SCENES) { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); await w(120); const el = document.querySelector('.nf-modal [data-scene="' + sc + '"]'); if (el) el.click(); await w(200); o.sc[sc] = __shell(); }
    __panel(); { const el = document.querySelector('.nf-modal [data-scene="inst"]'); if (el) el.click(); } await w(200);
    const sel = document.querySelector('.nf-modal #nf-inst'); o.inst = sel ? [...sel.querySelectorAll('option')].map(x => (x.parentElement.label || '') + '|' + x.value + '|' + x.textContent) : null;
    for (const q of LINKS) { try { closeModal(); } catch (_) {} nwLinkBoot(q); await w(220); const lb = document.getElementById('nf-linkbad'); o.ln[q] = { bad: lb ? lb.textContent : null, shell: __shell() }; }
    try { closeModal(); } catch (_) {}
    return o;
  }, [SCENES, LINKS]);
  await ctx.close();
  return r;
}
const snapHash = r => ({ sc: Object.fromEntries(Object.entries(r.sc).map(([k, v]) => [k, sha(v)])), inst: r.inst, ln: Object.fromEntries(Object.entries(r.ln).map(([k, v]) => [k, { bad: v.bad, shell: sha(v.shell) }])) });

/* ---- N9 快捷键序列（新形态；被测页与基线页同一段） ---- */
async function keySeq(b, url) {
  const { ctx, pg } = await open(b, url, { tag: 'N9' });
  const out = [];
  const rec = async tag => out.push(tag + ' ' + J(await pg.evaluate(() => { const st = NWP.state, m = document.querySelector('.nf-modal');
    const a = document.activeElement; const foc = a ? (a.dataset && (a.dataset.scene ? 'sc:' + a.dataset.scene : a.dataset.act ? a.dataset.act + ':' + (a.dataset.k || '') + ':' + (a.dataset.v || '') : a.id || a.tagName)) : '';
    return st && m ? { o: 1, sc: st.scene, k: NWP.stackOfState(st), foc } : { o: 0, docs: docs.length, k: NWB.stackOf(song), name: docTypeLabel(song) }; })));
  await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} document.body.focus(); });
  await pg.mouse.click(5, 450);
  await pg.keyboard.press('Alt+KeyN'); await W(400); await rec('Alt+N');
  for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Home', 'End', 'ArrowUp']) { await pg.keyboard.press(k); await W(60); await rec(k); }
  await pg.keyboard.press('Home'); await W(60);
  for (const k of ['4', '1', '2', '5', '3', '3', '1']) { await pg.keyboard.press(k); await W(60); await rec('key' + k); }
  /* 歌谱 · 合唱：声部单选组内 ←→ */
  await pg.click('.nf-modal [data-scene="vocal"]'); await W(80);
  const pb = await pg.$('.nf-modal [data-act="var"][data-k="parts"][aria-checked="true"]');
  if (pb) { await pb.focus(); for (const k of ['ArrowRight', 'ArrowRight', 'ArrowLeft']) { await pg.keyboard.press(k); await W(60); await rec('parts ' + k); } }
  await pg.click('.nf-modal [data-scene="teach"]'); await W(80); await pg.focus('.nf-modal [data-scene="teach"]');
  await pg.keyboard.press('Enter'); await W(400); await rec('Enter');
  await pg.keyboard.press('Alt+KeyN'); await W(400); await rec('Alt+N 2');
  await pg.keyboard.press('Escape'); await W(200); await rec('Esc');
  await pg.mouse.click(5, 450);
  await pg.keyboard.press('Alt+Shift+KeyN'); await W(500); await rec('Alt+Shift+N');
  await ctx.close();
  return out;
}

/* ---- N5 几何（页面侧）：把一份谱装进编辑器（A4 固定版宽）排版，返回 G1–G8 实测 ---- */
function GEO_PAGE() {
  /* v70.0 验收①：五线谱（stroke 0.8、线距 7.5 的 5 线组，高音谱号）上的符头 → 音名（行内按 x 排、行间自上而下）；联排五线谱默认高音谱号（底线＝谱级 37＝E4） */
  window.__staffHeads = function (sv) {
    const hl = [...sv.querySelectorAll('line')].filter(l => l.getAttribute('stroke-width') === '0.8' && l.getAttribute('y1') === l.getAttribute('y2') && +l.getAttribute('x2') - +l.getAttribute('x1') > 100).map(l => +l.getAttribute('y1'));
    const ys = [...new Set(hl)].sort((a, b) => a - b), bots = [];
    for (let i = 0; i + 4 < ys.length; i++) if (Math.abs(ys[i + 4] - ys[i] - 30) < 0.5) { bots.push(ys[i + 4]); i += 4; }
    const HD = ['noteheadBlack', 'noteheadHalf', 'noteheadWhole'].map(n => SMUFL[n].d);
    const heads = [...sv.querySelectorAll('path')].filter(p => HD.includes(p.getAttribute('d'))).map(p => { const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(p.getAttribute('transform') || ''); return m ? { x: +m[1], y: +m[2] } : null; }).filter(Boolean);
    const NM = 'CDEFGAB', out = [];
    bots.forEach((b0, i) => { const top = i ? Math.max(b0 - 75, bots[i - 1] + 20) : b0 - 75; heads.filter(h => h.y > top && h.y < b0 + 40).sort((a, c) => a.x - c.x).forEach(h => { const st = Math.round(37 + (b0 - h.y) / 3.75); out.push(NM[st % 7] + (Math.floor(st / 7) - 1)); }); });
    return out;
  };
  window.__xmlPitches = function (s) {
    const d = new DOMParser().parseFromString(exportMusicXML(s), 'application/xml');
    return [...d.querySelectorAll('note')].filter(n => n.querySelector('pitch') && !n.querySelector('grace')).map(n => n.querySelector('step').textContent + (n.querySelector('alter') ? (+n.querySelector('alter').textContent > 0 ? '#' : 'b') : '') + n.querySelector('octave').textContent);
  };
  window.__g700 = function (s0) {
    window.__pyqGeom = 1;
    const s = JSON.parse(JSON.stringify(s0)); s.layout = Object.assign({}, s.layout || {}, { fixed: true });
    loadSong(s); blurSel = true; render();
    const sv = document.getElementById('score'), ctm = sv.getScreenCTM(), vb = sv.viewBox.baseVal;
    const X = x => new DOMPoint(x, 0).matrixTransform(ctm).x, Y = y => new DOMPoint(0, y).matrixTransform(ctm).y;
    const BR = e => e.getBoundingClientRect();
    const nv = song.voxVoices.length, vn = song.voxNotations || [];
    const brG = PQ_KIND.groupsOf(song).find(g => g.type === 'brace'), nC = brG ? brG.from : nv;   /* 合唱行 0..nC-1，钢琴 nC / nC+1 */
    const paperL = X(0), paperR = X(vb.width), paperB = Y(vb.height);
    const sysG = (SYS_GEO || []).map(g => ({ y0: Y(g.y0), y1: Y(g.y1) }));
    const inSys = (r, g) => { const c = (r.top + r.bottom) / 2; return c >= g.y0 - 2 && c <= g.y1 + 2; };
    /* 谱线（stroke 0.8 的水平线，不带 data-g）→ 5 线一组 */
    /* 谱线：五线谱 stroke 0.8 线距 7.5；六线 / 四线谱 stroke 0.6 线距 9（STR_GAP）——按线距连成组 */
    const lineGroups = (sw, gap) => { const hl = [...sv.querySelectorAll('line')].filter(l => !l.hasAttribute('data-g') && l.getAttribute('stroke-width') === sw && l.getAttribute('y1') === l.getAttribute('y2') && +l.getAttribute('x2') - +l.getAttribute('x1') > 100).map(l => +l.getAttribute('y1'));
      const ys = [...new Set(hl.map(y => +y.toFixed(2)))].sort((a, b) => a - b), G = [];
      for (let i = 0; i < ys.length;) { let j = i; while (j + 1 < ys.length && Math.abs(ys[j + 1] - ys[j] - gap) < 0.3) j++; G.push({ n: j - i + 1, t: Y(ys[i]), b: Y(ys[j]), y: ys[i] }); i = j + 1; } return G; };
    const staves = lineGroups('0.8', 7.5), tabs = lineGroups('0.6', 9);
    const vls = [...sv.querySelectorAll('line')].filter(l => !l.hasAttribute('data-g') && l.getAttribute('x1') === l.getAttribute('x2')).map(l => ({ x: X(+l.getAttribute('x1')), y1: Y(Math.min(+l.getAttribute('y1'), +l.getAttribute('y2'))), y2: Y(Math.max(+l.getAttribute('y1'), +l.getAttribute('y2'))), w: l.getAttribute('stroke-width'), len: Math.abs(+l.getAttribute('y2') - +l.getAttribute('y1')) }));
    const leaves = [...sv.querySelectorAll('text,path,line,rect,circle,ellipse,polygon,polyline,use')].filter(e => {
      if (e.closest('defs,title,clipPath')) return false; const f = e.getAttribute('fill'), st = e.getAttribute('stroke');
      if (e.tagName === 'rect' && (f === 'transparent' || f === 'none') && (!st || st === 'none')) return false;
      if (e.tagName === 'rect' && (e.querySelector('title') || /cursor/.test(e.getAttribute('style') || ''))) return false;   /* 点击热区（小节线设置 / 选列…）不是墨迹 */
      if (e.getAttribute('opacity') === '0' || e.getAttribute('visibility') === 'hidden') return false;
      const r = BR(e); return r.width > 0 || r.height > 0; });
    const out = { nC, nv, sys: [], ink: { l: Infinity, r: -Infinity, b: -Infinity }, paperL, paperR, paperB };
    leaves.forEach(e => { const r = BR(e); out.ink.l = Math.min(out.ink.l, r.left); out.ink.r = Math.max(out.ink.r, r.right); out.ink.b = Math.max(out.ink.b, r.bottom); });
    const onsetOf = (vi, mi, ci) => { let t = 0; ((song.measures[mi].voxes[vi]) || []).slice(0, ci).forEach(c => { t += beatsOf(c); }); return +t.toFixed(4); };
    sysG.forEach((g, si) => {
      const S = { si, y0: g.y0, y1: g.y1 };
      const stv = staves.filter(x => x.n === 5 && (x.t + x.b) / 2 >= g.y0 - 2 && (x.t + x.b) / 2 <= g.y1 + 2);
      const RH = stv[stv.length - 2], LH = stv[stv.length - 1]; S.RH = RH; S.LH = LH; S.nStaves = stv.length;
      /* G1 花括号 */
      const brs = [...sv.querySelectorAll('[data-g="brace"]')].map(BR).filter(r => inSys(r, g));
      S.brace = brs.map(r => ({ t: r.top, b: r.bottom, r: r.right }));
      /* 系统起始线：系统内最长的竖线（不带 data-g） */
      const sl = vls.filter(v => v.y1 >= g.y0 - 3 && v.y2 <= g.y1 + 3).sort((a, b) => b.len - a.len)[0]; S.sysLine = sl || null;
      /* G2 方括号 */
      S.bracket = [...sv.querySelectorAll('[data-grp="bracket"]')].map(BR).filter(r => inSys(r, g)).map(r => ({ t: r.top, b: r.bottom, l: r.left, r: r.right }));
      /* G4 小节线：stroke 1、长度 < 60 的竖线，按纵向段（y1,y2）分行 */
      const bl = vls.filter(v => v.w === '1' && v.len < 60 && v.y1 >= g.y0 - 3 && v.y2 <= g.y1 + 3 && v !== sl);
      const segs = {}; bl.forEach(v => { const k = v.y1.toFixed(1) + '|' + v.y2.toFixed(1); (segs[k] = segs[k] || []).push(v.x); });
      S.barRows = Object.entries(segs).map(([k, xs]) => ({ k, xs: xs.sort((a, b) => a - b) })).sort((a, b) => +a.k.split('|')[0] - +b.k.split('|')[0]);
      /* G5 同拍对齐：每行 拍位 → 中心 x（简谱数字 / 符头） */
      const rows = {};
      const sysMis = new Set(); Object.keys(colBoxes).forEach(k => { const m = /^v(\d+):(\d+):(\d+)$/.exec(k); if (!m) return; const b = colBoxes[k]; const yc = Y(b.y + b.h / 2); if (yc >= g.y0 - 30 && yc <= g.y1 + 60) sysMis.add(+m[2]); });
      const digits = [...sv.querySelectorAll('text[font-size="17"]')].filter(t => /^[1-7]$/.test(t.textContent));
      for (let vi = 0; vi < nv; vi++) {
        const R = rows[vi] = {};
        if (isStaffNota(vn[vi])) {
          sv.querySelectorAll('[data-g="head"][data-gq^="' + vi + ':"]').forEach(e => { const q = e.getAttribute('data-gq').split(':').map(Number); if (!sysMis.has(q[1])) return; const r = BR(e); if (!inSys(r, g) && !(r.top >= g.y0 - 40 && r.bottom <= g.y1 + 40)) return;
            const key = q[1] + '@' + onsetOf(vi, q[1], q[2]); (R[key] = R[key] || []).push((r.left + r.right) / 2); });
        } else {
          sysMis.forEach(mi => { ((song.measures[mi].voxes[vi]) || []).forEach((c, ci) => { if (!(c && c.deg > 0)) return; const b = colBoxes['v' + vi + ':' + mi + ':' + ci]; if (!b) return;
            const d = digits.find(t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y'); return x >= b.x - 0.5 && x <= b.x + b.w + 0.5 && y >= b.y && y <= b.y + 40; });
            if (!d) return; const r = BR(d); const key = mi + '@' + onsetOf(vi, mi, ci); (R[key] = R[key] || []).push((r.left + r.right) / 2); }); });
        }
      }
      let worst = 0, nPair = 0, wEx = '';
      const vis = Object.keys(rows).map(Number);
      vis.forEach(a => vis.forEach(b2 => { if (b2 <= a) return; Object.keys(rows[a]).forEach(k => { if (!rows[b2][k]) return; let best = Infinity; rows[a][k].forEach(x1 => rows[b2][k].forEach(x2 => { best = Math.min(best, Math.abs(x1 - x2)); })); nPair++; if (best > worst) { worst = best; wEx = a + '×' + b2 + '@' + k; } }); }));
      S.beat = { worst, nPair, ex: wEx };
      /* G6 纵向净空：最下一条合唱行墨迹底 vs 右手行墨迹顶 */
      if (RH && nC > 0) {
        const vC = nC - 1, bC = colBoxes['v' + vC + ':' + [...sysMis].sort((a, b) => a - b)[0] + ':0'];
        const cTop = bC ? Y(bC.y) : g.y0;
        let rhTop = RH.t, rhEx = 'staff';
        /* 右手行墨迹（data-gq 声部＝nC）：上加线、符干、符杠、谱号、上方记号；小节号（mnum，行首左缘）不算——它与合唱歌词的相交由碰撞普查管 */
        sv.querySelectorAll('[data-gq^="' + nC + ':"]').forEach(e => { if (e.getAttribute('data-g') === 'mnum') return; const r = BR(e); if (!inSys(r, g) && !(r.bottom > g.y0 && r.top < g.y1)) return; if (r.height <= 0 && r.width <= 0) return; if (r.bottom < cTop) return; if (r.top < rhTop) { rhTop = r.top; rhEx = e.getAttribute('data-g'); } });
        let chBot = -Infinity, chEx = '';
        leaves.forEach(e => { const gq = e.getAttribute('data-gq'); if (gq && +gq.split(':')[0] >= nC) return; if (e.getAttribute('data-g') === 'brace' || e.getAttribute('data-grp') === 'bracket') return;
          if (e.hasAttribute('data-rown') || e.hasAttribute('data-rowlbl')) return;
          if (e.tagName === 'line' && e.getAttribute('x1') === e.getAttribute('x2') && Math.abs(+e.getAttribute('y2') - +e.getAttribute('y1')) >= 60) return;   /* 系统起始线 */
          const r = BR(e); if (r.top < cTop - 1 || (r.top + r.bottom) / 2 >= RH.t - 1) return;   /* 右手谱表本身（顶线、小节线）不算 */
          if (r.bottom > chBot) { chBot = r.bottom; chEx = e.tagName + ':' + (e.getAttribute('data-g') || '') + ':' + (e.textContent || '').slice(0, 6); } });
        S.gap = { chBot, rhTop, d: rhTop - chBot, chEx, rhEx };
      }
      /* G7 行首名（首系统） */
      if (si === 0) {
        S.names = [...sv.querySelectorAll('[data-rown],[data-rowlbl]')].map(e => ({ e, r: BR(e) })).filter(x => inSys(x.r, g)).map(x => ({ t: x.e.textContent, l: x.r.left, r: x.r.right, t0: x.r.top, b0: x.r.bottom, kind: x.e.hasAttribute('data-rown') ? 'rown' : 'rowlbl' }));
        const grs = [...sv.querySelectorAll('[data-g="brace"],[data-grp="bracket"]')].map(BR).filter(r => inSys(r, g));
        S.nameHit = S.names.filter(n => grs.some(r => !(n.r <= r.left || n.l >= r.right || n.b0 <= r.top || n.t0 >= r.bottom))).map(n => n.t);
      }
      out.sys.push(S);
    });
    /* 额外度量：TAB 线组、谱号、加线、歌词 */
    out.tabGroups = staves.concat(tabs).sort((a, b) => a.y - b.y).map(x => x.n);
    out.clefs = sv.querySelectorAll('[data-g="clef"]').length;
    out.ledger0 = sv.querySelectorAll('[data-g="ledger"][data-gq^="0:"]').length;
    out.lyrTexts = (song.measures || []).reduce((a, m) => a + (m.voxes || []).reduce((b, cs) => b + (cs || []).filter(c => (c.lyrics || []).some(x => x)).length, 0), 0);
    return out;
  };
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let FX = {}; try { FX = JSON.parse(fs.readFileSync(FIX, 'utf8')); } catch (_) { FX = {}; }
  try {
    /* ===== --write-base：基线快照写进 fixtures（只写 panel 键） ===== */
    if (WRITE) {
      const txt = execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20 });
      const f = path.join(os.tmpdir(), 'tv_v700new_base_' + BASE_COMMIT.slice(0, 7) + '.html'); fs.writeFileSync(f, txt);
      const bu = 'file://' + f, panel = { commit: BASE_COMMIT };
      for (const q of ['next=0', 'shell=classic']) panel[q] = snapHash(await snapPanel(b, withQ(bu, q)));
      panel.keys = await keySeq(b, bu);
      let cur = {}; try { cur = JSON.parse(fs.readFileSync(FIX, 'utf8')); } catch (_) {}
      cur.panel = panel; fs.mkdirSync(path.dirname(FIX), { recursive: true }); fs.writeFileSync(FIX, JSON.stringify(cur, null, 1) + '\n');
      console.log('已写 ' + FIX + '（panel 键，基线 ' + BASE_COMMIT.slice(0, 7) + '）');
      await b.close(); return;
    }
    const BP = FX.panel || null;

    /* ===== N2 零差异 ===== */
    if (want('N2')) await guard('N2', async () => {
      if (!BP) { T('N2', false, 'fixtures/v700_base.json 缺 panel 键（先跑 --write-base）'); return; }
      for (const q of ['next=0', 'shell=classic']) {
        const c = snapHash(await snapPanel(b, withQ(URL0, q))), z = BP[q];
        const dsc = SCENES.filter(s => c.sc[s] !== z.sc[s]), dln = LINKS.filter(l => J(c.ln[l]) !== J(z.ln[l]));
        T('N2', !dsc.length && J(c.inst) === J(z.inst) && !dln.length && c.inst && c.inst.length === 21,
          '?' + q + '：11 个用途 .nf-shell（去预览框内容）、乐器下拉 ' + (c.inst || []).length + ' 项、5 条新深链的「没认出」与 .nf-shell 与基线 ' + BASE_COMMIT.slice(0, 7) + ' 逐字节相同',
          J({ dsc, inst: J(c.inst) === J(z.inst), dln: dln.map(l => [l, c.ln[l], z.ln[l]]) }));
        T('N2', LINKS.every(l => c.ln[l].bad && /没认出/.test(c.ln[l].bad)), '?' + q + '：5 条新深链在旧形态都报「链接里没认出」（不报错、用途照常预选）', J(Object.fromEntries(LINKS.map(l => [l, c.ln[l].bad]))));
      }
    });

    /* ===== N1 金表 ===== */
    if (want('N1')) await guard('N1', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N1' });
      const p2a = await pg.evaluate(() => nwP2A());
      /* 全量：linkApply → planOf → realCreate */
      const r = await pg.evaluate(async ([G, COMBOS, OLD]) => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        try { hideStartPad(); } catch (_) {}
        const bad = [], rows = [];
        const mirror = p => { const [a, s2] = p.split('.'); if (a === 'hechang') return 'hechang.' + (s2 === 'jianpu' ? 'wuxian' : 'jianpu'); if (a === 'jianpu') return 'wuxian.' + s2; if (a === 'wuxian') return 'jianpu.' + s2; return p; };
        const one = async (q, exp) => {
          const L = NWP.linkParse('?' + q), st = NWP.fresh({ clean: true, scene: L.scene, link: L });
          const P = NWP.planOf(st), lk = st.link || { bad: [] };
          const d0 = docs.length; realCreate(P, '', null); await w(30);
          const I = __songInfo(song), tip = (document.querySelector('.dtab.on') || {}).title || '';
          const rt = __songInfo(migrate(JSON.parse(JSON.stringify(song))));
          persistNow(); const ls = __songInfo(migrate(JSON.parse(localStorage.getItem('musetab-song-v1'))));
          const extra = Object.keys(song).filter(x => !OLD.includes(x));
          /* 互切：不在钢琴组里的旋律 / 人声行逐行切到另一种记谱法 */
          let mir = null;
          const grp = PQ_KIND.groupsOf(song).find(g => g.type === 'brace'), nMel = grp ? grp.from : (song.voxVoices || []).length;
          if (nMel > 0 && !(song.tabVoices || []).length && !song.func && !song.chordOnly && !song.pianoAcc && NWB.stackOf(song) !== 'G') {
            const before = __songInfo(song), toS = !isStaffNota((song.voxNotations || [])[0]);
            for (let vi = 0; vi < nMel; vi++) { sel.row = 'vox'; sel.vi = vi; sel.mi = 0; sel.ci = 0; setVoxNotation(toS ? 'staff' : 'jianpu'); }
            const after = __songInfo(song);
            mir = { ok: after.pz === mirror(before.pz) && J(after.also) === J(before.also.map(mirror).sort()), before: before.pz + '+' + before.also, after: after.pz + '+' + after.also, name: after.name };
          }
          const x = { q, P: P.stack, kind: P.kind.name, I, rtSame: J(rt) === J(I), lsSame: J(ls) === J(I), extra, docs: docs.length - d0, tip, lbad: lk.bad, mir };
          if (docs.length > 3) closeDocAt(curDocI);
          return x;
        };
        for (const [q, pk, bk, name, pz, also, intent, ik] of G) {
          const x = await one(q, null);
          const ok = x.P === pk && x.I.k === bk && x.kind === x.I.name && x.I.name === x.I.kind && (name == null || x.I.name === name) && x.I.pz === pz && J(x.I.also) === J(also.slice().sort())
            && x.I.intent === intent && (ik ? x.I.inst === ik : true) && x.rtSame && x.lsSame && !x.extra.length && x.docs === 1 && x.tip.indexOf(x.I.name) >= 0 && !(x.lbad || []).length && (!x.mir || x.mir.ok);
          rows.push(x); if (!ok) bad.push(J(x));
        }
        /* 43 个基线组合：新形态下同基线谱行 / 谱名 / docType，intent＝用途（旋律用只在基线能互换的用途上点） */
        const bad43 = [];
        for (const [sc, vars, mel, wantK, wantName, wantDT] of COMBOS) {
          /* 变体经深链灌进面板（同点选：乐器换到 staff 族时走「旋律用」默认值）；旋律用只在基线能互换的用途上给（melLive 不传 p2a＝基线口径） */
          const v0 = Object.assign({}, NWP.fresh({ clean: true, scene: sc }).v, vars);
          const q = '?new=' + sc + Object.keys(vars).map(k => '&' + k + '=' + vars[k]).join('') + (NWP.melLive(sc, v0) ? '&mel=' + mel : '');
          const L = NWP.linkParse(q), st = NWP.fresh({ clean: true, scene: sc, link: L });
          const P = NWP.planOf(st); realCreate(P, '', null); await w(20);
          const I = __songInfo(song);
          if (!(P.stack === wantK && I.k === wantK && I.name === wantName && P.kind.name === wantName && I.dt === wantDT && I.intent === sc)) bad43.push(sc + J(vars) + mel + '→' + J({ P: P.stack, kind: P.kind.name, I }));
          if (docs.length > 3) closeDocAt(curDocI);
        }
        return { n: G.length, bad, bad43, mir: rows.filter(x => x.mir).length, sample: rows.slice(0, 2) };
      }, [GOLD(), COMBOS, OLD_FIELDS]);
      T('N1', p2a && !r.bad.length, '金表 ' + r.n + ' 行（linkApply→planOf→realCreate）：面板谱行 / 建成 stackOf / 面板＝建成＝docTypeLabel＝页签谱名 / pzOf 主二级与也在 / intent / 乐器 / JSON 与本机存储往返 / 新增字段只有 intent / 互切镜像（' + r.mir + ' 份）',
        (p2a ? '' : 'nwP2A() 为假！ ') + r.bad.slice(0, 6).join(' | '));
      T('N1', !r.bad43.length, '43 个基线组合在新形态：谱行 / 谱名 / docType 同基线、intent＝用途', r.bad43.slice(0, 6).join(' | '));
      /* 真实点击代表组合 */
      const clickBad = [];
      const CL = [
        /* v70.0 验收⑤：合唱（二部及以上）的「钢琴伴奏」在参数行（此前在 ⋯ 弹层）——先断言参数行可见再点 */
        { n: '四部简谱合唱＋钢琴', sc: 'vocal', main: [['parts', 4], ['tacc', 'with']], mel: 'J', k: 'J', name: '简谱合唱谱（含钢琴伴奏）', intent: 'vocal' },
        { n: '三部五线合唱＋钢琴', sc: 'vocal', main: [['parts', 3], ['tacc', 'with']], mel: 'S', k: 'S', name: '五线谱合唱谱（含钢琴伴奏）', intent: 'vocal' },
        { n: '尤克里里指弹', sc: 'solo', main: [['inst', 'uku']], k: 'ST', name: '尤克里里独奏谱', intent: 'solo' },
        { n: '小提琴＋钢琴', sc: 'inst', inst: 'violin', more: [['tacc', 'with']], k: 'SG', name: '小提琴＋钢琴伴奏谱（五线谱）', intent: 'inst' },
        { n: '大提琴（五线谱）', sc: 'inst', inst: 'cello', k: 'S', name: '大提琴谱（五线谱）', intent: 'inst' },
        { n: '萨克斯简谱', sc: 'inst', inst: 'sax', mel: 'J', k: 'J', name: '萨克斯谱（简谱）', intent: 'inst' },
        { n: '竖笛（简谱默认）', sc: 'inst', inst: 'recorder', k: 'J', name: '竖笛谱（简谱）', intent: 'inst' },
        { n: '简谱视唱', sc: 'sight', mel: 'J', k: 'J', name: '简谱歌谱', intent: 'sight' },
      ];
      for (const c of CL) {
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); }); await W(250);
        await pg.click('.nf-modal [data-scene="' + c.sc + '"]'); await W(80);
        const vis = [];
        if (c.inst) { vis.push(await pg.isVisible('#nf-inst')); await pg.selectOption('#nf-inst', c.inst); await W(60); }
        for (const [k, v] of c.main || []) { const s = '#nf-params [data-act="var"][data-k="' + k + '"][data-v="' + v + '"]'; vis.push(await pg.isVisible(s)); await pg.click(s); await W(60); }
        if (c.more) { vis.push(await pg.isVisible('#nf-more')); await pg.click('#nf-more'); await W(80);
          for (const [k, v] of c.more) { const s = '#nf-moreb [data-act="var"][data-k="' + k + '"][data-v="' + v + '"]'; vis.push(await pg.isVisible(s)); await pg.click(s); await W(60); }
          if (await pg.isVisible('#nf-moreb')) { await pg.click('#nf-more'); await W(60); } }
        if (c.mel) { const s = '#nf-pvmel [data-act="mel"][data-v="' + c.mel + '"]'; vis.push(await pg.isVisible(s)); await pg.click(s); await W(60); }
        const pk = await pg.evaluate(() => [document.getElementById('nf-kind').textContent, document.getElementById('nf-gokind').textContent]);
        vis.push(await pg.isVisible('#nw-create'));
        const d0 = await pg.evaluate(() => docs.length);
        await pg.click('#nw-create'); await W(150);
        const I = await pg.evaluate(() => Object.assign(__songInfo(song), { docs: docs.length, tip: (document.querySelector('.dtab.on') || {}).title || '' }));
        const ok = vis.every(Boolean) && pk[0] === c.name && pk[1] === c.name && I.k === c.k && I.name === c.name && I.intent === c.intent && I.docs === d0 + 1 && I.tip.indexOf(c.name) >= 0;
        if (!ok) clickBad.push(c.n + ' ' + J({ vis, pk, I }));
        await pg.evaluate(() => { if (docs.length > 3) closeDocAt(curDocI); });
      }
      T('N1', !clickBad.length, '真实点击 ' + CL.length + ' 个代表组合（参数行 chip / ⋯ 弹层 / 乐器下拉 / 预览左上「旋律」先断言可见再点）：面板「将建成」＝创建钮读屏名＝建成谱名＝页签提示、谱行与 intent 对', clickBad.join(' | '));
      await ctx.close();
    });

    /* ===== N3 「旋律用」默认值 ===== */
    if (want('N3')) await guard('N3', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N3' });
      const S = async () => pg.evaluate(() => __st());
      const sc = async id => { await pg.click('.nf-modal [data-scene="' + id + '"]'); await W(60); return S(); };
      const mel = async m => { await pg.click('#nf-pvmel [data-act="mel"][data-v="' + m + '"]'); await W(60); return S(); };
      const fresh = async (o) => { await pg.evaluate(o => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(o); }, o || {}); await W(200); return S(); };
      const res = {}, ok = {};
      await fresh(); res.c1 = await sc('sight'); ok.c1 = res.c1.stack === 'S' && res.c1.nf === '五线谱旋律';
      res.c2 = await sc('vocal'); ok.c2 = res.c2.stack === 'J';
      for (const m of ['J', 'S']) { await fresh(); await sc('vocal'); await mel(m); const a = await sc('sight'), z = await sc('vocal'); res['c3' + m] = [a, z]; ok['c3' + m] = a.stack === 'S' && z.stack === m; }
      await fresh(); await sc('sight'); const c4a = await mel('J');
      await pg.click('#nw-create'); await W(150);
      const c4s = await pg.evaluate(() => __songInfo(song));
      await fresh(); await sc('sight'); await mel('J'); await sc('vocal'); const c4b = await sc('sight');
      res.c4 = [c4a, c4s, c4b]; ok.c4 = c4a.stack === 'J' && c4s.k === 'J' && c4s.intent === 'sight' && c4s.pz === 'jianpu.shichang' && c4b.stack === 'J';
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} nwLinkBoot('?new=sight&mel=J'); }); await W(200); res.c5 = await S(); ok.c5 = res.c5.scene === 'sight' && res.c5.stack === 'J';
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} localStorage.setItem('musetab-nw-last', JSON.stringify({ scene: 'teach', stack: 'SJ', rows: ['S', 'J'], mel: 'J', v: { key: 'C', mode: 'major', beats: 4, unit: 4, tempo: 88, nMea: 16, lyr: 1, tacc: 'no' }, t: Date.now() })); nwLinkBoot('?new=sight'); }); await W(200);
      res.c6 = await S(); ok.c6 = res.c6.scene === 'sight' && res.c6.stack === 'S';
      await fresh(); await sc('inst'); const i0 = await S();
      await pg.selectOption('#nf-inst', 'violin'); await W(60); const i1 = await S();
      await pg.selectOption('#nf-inst', 'erhu'); await W(60); const i2 = await S();
      res.c7 = [i0, i1, i2]; ok.c7 = i0.stack === 'G' && i1.stack === 'S' && i2.stack === 'J';
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} nwLinkBoot('?new=inst&instKey=sax&mel=J'); }); await W(200); res.c8 = await S(); ok.c8 = res.c8.stack === 'J' && res.c8.nf === '萨克斯谱（简谱）';
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} }); await ctx.close();
      const names = { c1: '首访点视唱＝五线谱', c2: '视唱 → 歌谱＝简谱（回到原值）', c3J: '歌谱点简谱 → 视唱＝五线谱 → 回歌谱＝简谱', c3S: '歌谱点五线谱 → 视唱＝五线谱 → 回歌谱＝五线谱',
        c4: '视唱里点简谱 → 建出简谱视唱（intent sight、简谱 › 视唱）；去歌谱再回视唱仍是简谱', c5: '?new=sight&mel=J＝简谱视唱', c6: '?new=sight 且上次是教学对照（mel 存 J）＝五线谱', c7: '器乐默认钢琴 → 小提琴＝五线谱 → 二胡＝简谱', c8: '?new=inst&instKey=sax&mel=J＝萨克斯简谱' };
      Object.keys(names).forEach(k => T('N3', !!ok[k], names[k], J(res[k])));
      /* ?next=0：视唱 / 小提琴仍固定五线谱、无「旋律用」单选 */
      const o2 = await open(b, withQ(URL0, 'next=0'), { tag: 'N3n0' });
      const n0 = await o2.pg.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); localStorage.removeItem('musetab-nw-last'); __panel(); await w(150);
        document.querySelector('.nf-modal [data-scene="sight"]').click(); await w(80); const a = Object.assign(__st(), { mel: !!document.querySelector('.nf-modal [data-act="mel"]'), p2a: nwP2A() });
        document.querySelector('.nf-modal [data-scene="inst"]').click(); await w(80); const sel = document.querySelector('#nf-inst'); sel.value = 'violin'; sel.dispatchEvent(new Event('change', { bubbles: true })); await w(80);
        const c = Object.assign(__st(), { mel: !!document.querySelector('.nf-modal [data-act="mel"]') }); closeModal(); return { a, c }; });
      await o2.ctx.close();
      T('N3', !n0.a.p2a && n0.a.stack === 'S' && !n0.a.mel && n0.c.stack === 'S' && !n0.c.mel, '?next=0：规则不生效——视唱 / 小提琴固定五线谱、不出「旋律用」（同基线）', J(n0));
    });

    /* ===== N4 深链 5 条 ===== */
    if (want('N4')) await guard('N4', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N4' });
      const r = await pg.evaluate(async (LINKS) => {
        const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
        const EXP = { '?new=vocal&parts=4&tacc=with&mel=J': ['JG', '简谱合唱谱（含钢琴伴奏）'], '?new=solo&inst=uku': ['ST', '尤克里里独奏谱'], '?new=inst&instKey=violin&tacc=with': ['SG', '小提琴＋钢琴伴奏谱（五线谱）'],
          '?new=sight&mel=J': ['J', '简谱歌谱'], '?new=inst&instKey=sax&mel=J': ['J', '萨克斯谱（简谱）'] };
        for (const q of LINKS) {
          try { closeModal(); } catch (_) {}
          nwLinkBoot(q); await w(200);
          const st = NWP.state, P = NWP.planOf(st), lk = NWP.linkOf(st);
          const st2 = NWP.fresh({ clean: true, scene: NWP.linkParse(lk).scene, link: NWP.linkParse(lk) }), P2 = NWP.planOf(st2), lk2 = NWP.linkOf(st2);
          out.push({ q, stack: P.stack, kind: P.kind.name, nf: document.getElementById('nf-kind').textContent, bad: !!document.getElementById('nf-linkbad'), lk, rt: J(P) === J(P2) && lk === lk2, exp: EXP[q] });
        }
        try { closeModal(); } catch (_) {}
        return out;
      }, LINKS);
      await ctx.close();
      r.forEach(x => T('N4', x.stack === x.exp[0] && x.kind === x.exp[1] && x.nf === x.exp[1] && !x.bad && x.rt, x.q + ' → ' + x.exp[1] + '；无「没认出」；linkOf ∘ linkApply 往返一致', J(x)));
    });

    /* ===== N5 刻版几何 ===== */
    if (want('N5')) await guard('N5', async () => {
      const fonts = process.env.FONTS === '0' ? [false] : [false, true];
      const sum = [];
      for (const font of fonts) for (const w of [1280, 1440]) {
        const tag = w + (font ? '·DejaVu' : '·默认字体');
        const { ctx, pg } = await open(b, URL0, { w, h: 900, font, tag: 'N5' + tag });
        await pg.evaluate(GEO_PAGE);
        const fu = await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim().slice(0, 24));
        const SM = await pg.evaluate(() => {
          try { hideStartPad(); } catch (_) {}
          const o = (k, x) => Object.assign({ title: '未命名曲谱', key: 'C', beats: 4, unit: 4, tempo: 90, nMea: 8, lyr: 1, mode: 'major', scene: 'vocal', maker: '' }, x);
          const L = [['J×4＋G', NWPV.sampleOf('JG', o('JG', { nVox: 4 }))], ['S×4＋G', NWPV.sampleOf('SG', o('SG', { nVox: 4 }))], ['J×2＋G', NWPV.sampleOf('JG', o('JG', { nVox: 2 }))],
            ['J×3＋G 3/4', NWPV.sampleOf('JG', o('JG', { nVox: 3, beats: 3, unit: 4 }))]];
          /* 压力谱：合唱 4 行 3 段词（男低带低音点）、右手高音区（上加线）与中音区（符干朝上）、左手低音区（下加线）、力度 / 踏板 */
          const P = NWB.build('JG', { nVox: 4, lyr: 3, nMea: 4, key: 'C', title: '压力谱' });
          const LY = ['春', '风', '吹', '绿', '江', '南', '岸', '边'];
          P.measures.forEach((m, mi) => {
            for (let v = 0; v < 4; v++) m.voxes[v] = [0, 1, 2, 3].map(i => ({ dur: 4, dotted: false, deg: [[5, 6, 5, 3], [3, 4, 3, 1], [1, 2, 1, 6], [5, 4, 5, 1]][v][i], acc: '', oct: v === 3 ? -1 : (v === 2 && i === 3 ? -1 : 0), tie: false, lyrics: [LY[(i + mi) % 8], LY[(i + mi + 3) % 8], LY[(i + mi + 5) % 8]] }));
            m.voxes[4] = mi % 2 === 0 ? [0, 1, 2, 3].map(i => ({ dur: 4, dotted: false, deg: [1, 2, 3, 5][i], acc: '', oct: 2, tie: false, lyrics: [], dyn: i === 0 ? (mi ? 'p' : 'f') : undefined }))
              : [0, 1, 2, 3].map(i => ({ dur: 4, dotted: false, deg: [1, 2, 3, 2][i], acc: '', oct: 0, tie: false, lyrics: [] }));
            m.voxes[5] = [0, 1, 2, 3].map(i => ({ dur: 4, dotted: false, deg: [1, 5, 4, 5][i], acc: '', oct: -2, tie: false, lyrics: [], ped: i === 0 ? 'on' : i === 3 ? 'off' : undefined }));
          });
          P.measures[P.measures.length - 1].finalBar = true;
          L.push(['压力谱', P]);
          L.push(['小提琴＋钢琴', NWPV.sampleOf('SG', Object.assign(o('SG', { scene: 'inst', lyr: 0 }), { instKey: 'violin', clef: 'staff' }))]);
          /* 西文声部名（字宽随 --font-ui 变：v69.9 JL1 教训）：五线谱四部合唱＋钢琴改用 Soprano / Alto / Tenor / Bass / Piano RH / LH */
          const LS = JSON.parse(JSON.stringify(NWPV.sampleOf('SG', o('SG', { nVox: 4 })))); LS.voxVoices = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Piano RH', 'Piano LH'];
          L.push(['S×4＋G 西文名', LS]);
          return L.map(([n, s]) => [n, JSON.parse(JSON.stringify(s))]);
        });
        for (const [name, s] of SM) {
          const g = await pg.evaluate(s => __g700(s), s);
          const P = [], why = [];
          const sys = g.sys;
          const isS = name.startsWith('S×'), isJ = /^J×|压力/.test(name), choir = !/小提琴/.test(name);
          /* G1 */ const g1 = sys.every(S => S.brace.length === 1 && S.RH && S.LH && Math.abs(S.brace[0].t - S.RH.t) <= 1.5 && Math.abs(S.brace[0].b - S.LH.b) <= 1.5 && S.sysLine && S.brace[0].r < S.sysLine.x);
          if (!g1) why.push('G1 ' + J(sys.map(S => ({ br: S.brace, RH: S.RH, LH: S.LH, sl: S.sysLine && S.sysLine.x }))));
          /* G2 */ const g2 = sys.every(S => isS ? (S.bracket.length === 1 && S.bracket[0].b <= S.RH.t - 2) : S.bracket.length === 0);
          if (!g2) why.push('G2 ' + J(sys.map(S => ({ bk: S.bracket, RHt: S.RH && S.RH.t }))));
          /* G3 */ const g3 = sys.every(S => { if (!S.sysLine) return false; const top = Math.min(...S.barRows.map(r => +r.k.split('|')[0]), S.RH.t); return Math.abs(S.sysLine.y1 - top) <= 1 && Math.abs(S.sysLine.y2 - S.LH.b) <= 1; });
          if (!g3) why.push('G3 ' + J(sys.map(S => ({ sl: S.sysLine, rows: S.barRows.map(r => r.k), LHb: S.LH && S.LH.b }))));
          /* G4 */ let bw = 0; const g4 = sys.every(S => { const ref = S.barRows[0]; if (!ref || S.barRows.length < 2) return false;
            return S.barRows.every(r => r.xs.length === ref.xs.length && r.xs.every((x, i) => { bw = Math.max(bw, Math.abs(x - ref.xs[i])); return Math.abs(x - ref.xs[i]) <= 0.6; })); });
          if (!g4) why.push('G4 ' + J(sys.map(S => S.barRows.map(r => r.k + ':' + r.xs.map(x => x.toFixed(2)).join(',')))));
          /* G5 */ const bt = Math.max(...sys.map(S => S.beat.worst)), g5 = bt <= 1.5 && sys.every(S => S.beat.nPair > 0);
          if (!g5) why.push('G5 ' + J(sys.map(S => S.beat)));
          /* G6 */ const gd = Math.min(...sys.map(S => S.gap ? S.gap.d : Infinity)), g6 = !choir || (sys.every(S => S.gap) && gd >= 4);
          if (!g6) why.push('G6 ' + J(sys.map(S => S.gap)));
          /* G7 */ const N0 = sys[0].names || [], pn = N0.filter(n => n.t === '钢琴'), RH0 = sys[0].RH, LH0 = sys[0].LH;
          const nWant = choir ? g.nC + 1 : 2, pnN = /西文/.test(name) ? 'Piano' : '钢琴';
          pn.push(...N0.filter(n => n.t === pnN && pnN !== '钢琴'));
          const g7 = N0.length === nWant && pn.length === 1 && N0.every(n => n.l >= g.paperL + 4 && n.r <= g.paperR) && !sys[0].nameHit.length
            && Math.abs((pn[0].t0 + pn[0].b0) / 2 - (RH0.t + LH0.b) / 2) <= 4 && (!/小提琴/.test(name) || N0.some(n => n.t === '小提琴'));
          if (!g7) why.push('G7 ' + J({ N0: N0.map(n => [n.t, +n.l.toFixed(1), +n.r.toFixed(1)]), hit: sys[0].nameHit, paperL: g.paperL, mid: RH0 && (RH0.t + LH0.b) / 2 }));
          /* G8 */ const g8 = g.ink.l >= g.paperL - 0.5 && g.ink.r <= g.paperR + 0.5 && g.ink.b <= g.paperB + 0.5 && sys.every(S => S.y1 <= g.paperB);
          if (!g8) why.push('G8 ' + J({ ink: g.ink, paperL: g.paperL, paperR: g.paperR, paperB: g.paperB }));
          const nl = Math.min(...N0.map(n => n.l)) - g.paperL, nw = Math.max(...N0.map(n => n.r - n.l));
          sum.push(tag + ' ' + name + '：系统 ' + sys.length + ' · 小节线差 ' + bw.toFixed(2) + ' · 同拍差 ' + bt.toFixed(2) + (choir ? ' · 净空 ' + gd.toFixed(1) + '（' + (sys[0].gap || {}).chEx + '）' : '') + ' · 行首名 ' + N0.map(n => n.t).join('/') + '（最左距纸边 ' + nl.toFixed(1) + '、最宽 ' + nw.toFixed(1) + '）');
          T('N5', g1 && g2 && g3 && g4 && g5 && g6 && g7 && g8, tag + ' ' + name + '：G1 花括号 / G2 方括号 / G3 起始线 / G4 小节线 ≤0.6 / G5 同拍 ≤1.5 / G6 净空 ≥4 / G7 行首名 / G8 纸内', why.join(' || '));
        }
        /* G8 碰撞普查（geom_census 判据，6 份样谱） */
        const R = await GC.census(pg, SM.map(([n, s]) => ({ name: n, song: s })), { paperW: 870, presets: false });
        const nCol = Object.values(R.cats).reduce((a, o) => a + o.n, 0);
        T('N5', nCol === 0, tag + ' G8 碰撞普查（' + SM.length + ' 份样谱，geom_census 类别对）＝0', J(Object.fromEntries(Object.entries(R.cats).map(([k, o]) => [k, o.ex.slice(0, 3)]))));
        /* 另：尤克里里指弹 / 大提琴＋钢琴 / 简谱视唱 */
        const X3 = await pg.evaluate(() => {
          const mk = q => { const L = NWP.linkParse(q), st = NWP.fresh({ clean: true, scene: L.scene, link: L }); return Object.assign({}, NWP.optsOf(st), { scene: st.scene, maker: '' }); };
          const uo = mk('?new=solo&inst=uku'), u = __g700(NWPV.sampleOf('ST', uo));
          const co = mk('?new=inst&instKey=cello&tacc=with'), c = __g700(NWPV.sampleOf('SG', co));
          const so = mk('?new=sight&mel=J'), sj = __g700(NWPV.sampleOf('J', so));
          return { u: { tabs: u.tabGroups, sys: u.sys.length }, c: { names: (c.sys[0].names || []).map(n => n.t), ledger0: c.ledger0, clefs: c.clefs }, s: { clefs: sj.clefs, lyr: sj.lyrTexts, ll: song.lyricLines } };
        });
        const ug = X3.u.tabs, uOk = ug.length >= 2 && ug.every((n, i) => i % 2 === 0 ? n === 5 : n === 4);
        T('N5', uOk, tag + ' 尤克里里指弹：每系统五线谱（5 线）在上、四线谱（4 线）在下', J(X3.u));
        T('N5', X3.c.names.includes('大提琴') && X3.c.names.includes('钢琴') && X3.c.ledger0 <= 2, tag + ' 大提琴＋钢琴：行首名「大提琴」＋「钢琴」、旋律低音谱号不出现满屏加线（旋律行加线 ' + X3.c.ledger0 + '）', J(X3.c));
        T('N5', X3.s.clefs === 0 && X3.s.lyr === 0 && X3.s.ll === 0, tag + ' 简谱视唱：无谱号、无歌词行', J(X3.s));
        /* v70.0 验收①：尤克里里指弹联排五线谱的符头音高＝MusicXML 导出音高（此前按吉他定弦 +12：3 弦空弦画成 G4、4 弦空弦画成 D4）；
           新建面板预览《小星星》五线谱前 11 音＝C C G G | A A G | F F E E（C4 起） */
        const UP = await pg.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          const L = NWP.linkParse('?new=solo&inst=uku'), st = NWP.fresh({ clean: true, scene: L.scene, link: L });
          __g700(NWPV.sampleOf('ST', Object.assign({}, NWP.optsOf(st), { scene: st.scene, maker: '' })));
          const r = { inst: song.inst, heads: __staffHeads(document.getElementById('score')), xml: __xmlPitches(song) };
          try { closeModal(); } catch (_) {}
          nwLinkBoot('?new=solo&inst=uku'); await w(600);
          const sv = document.querySelector('#nf-pvbox svg'); r.pv = sv ? __staffHeads(sv) : null;
          try { closeModal(); } catch (_) {}
          return r;
        });
        T('N5', UP.inst === 'uku' && UP.heads.length >= 11 && J(UP.heads) === J(UP.xml), tag + ' 尤克里里指弹：联排五线谱符头音高＝MusicXML 导出音高（' + UP.heads.slice(0, 7).join(' ') + ' …，共 ' + UP.heads.length + ' 音）', J(UP));
        const TW = ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4'];
        T('N5', !!UP.pv && J(UP.pv.slice(0, 11)) === J(TW), tag + ' 尤克里里指弹：新建面板预览《小星星》五线谱＝C C G G | A A G | F F E E', J(UP.pv));
        NOTE('N5 ' + tag + ' --font-ui=' + fu);
        await ctx.close();
      }
      sum.forEach(s => NOTE('N5 实测 ' + s));
    });

    /* ===== N6 预览样谱 ===== */
    if (want('N6')) await guard('N6', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N6' });
      const r = await pg.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        try { hideStartPad(); } catch (_) {}
        const snap = () => J2({ song: JSON.stringify(song), sel: JSON.stringify(sel), undo: undoStack.length, redo: (typeof redoStack !== 'undefined' ? redoStack.length : 0), docs: docs.length,
          ls: Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().map(k => k + '=' + localStorage.getItem(k).length).join(','), paper: (() => { const p = document.getElementById('paper'); return p ? p.offsetWidth + 'x' + p.offsetHeight : ''; })() });
        function J2(x) { return JSON.stringify(x); }
        const before = snap(), out = [];
        const QS = ['?new=vocal&parts=4&tacc=with&mel=J', '?new=vocal&parts=4&tacc=with&mel=S', '?new=vocal&parts=2&tacc=with&mel=J', '?new=vocal&parts=3&tacc=with&mel=J&meter=3/4',
          '?new=solo&inst=uku', '?new=inst&instKey=violin&tacc=with', '?new=inst&instKey=cello&tacc=with', '?new=sight&mel=J', '?new=inst&instKey=sax&mel=J', '?new=inst&instKey=recorder'];
        for (const q of QS) {
          try { closeModal(); } catch (_) {}
          nwLinkBoot(q); await w(450);
          const pv = NWP.pvInfo(), err = !!document.querySelector('#nf-pvbox .nf-pverr'), svg = document.querySelector('#nf-pvbox svg');
          const st = NWP.state, k = NWP.stackOfState(st), o = NWP.optsOf(st), bands = NWP.bandDefs(k, o);
          /* 行标与引擎行位对齐：每条行标的 y0 / y1 ＝首列框纵向范围 */
          const al = (pv && pv.bands || []).every(bd => { const def = bands.find(x => x.t === bd.t); if (!def) return false; const A = pv.boxes[def.a + ':0:0'], B = pv.boxes[(def.b || def.a) + ':0:0'] || A;
            return A && Math.abs(bd.y0 - Math.min(A.y, B.y)) < 0.01 && Math.abs(bd.y1 - Math.max(A.y + A.h, B.y + B.h)) < 0.01; });
          out.push({ q, k, err, svg: !!svg, nb: pv ? pv.bands.length : -1, want: bands.length, bandT: bands.map(x => x.t), al, ms: pv ? +pv.ms.toFixed(1) : null });
        }
        try { closeModal(); } catch (_) {}
        await w(100);
        return { out, same: snap() === before };
      });
      await ctx.close();
      const bad = r.out.filter(x => x.err || !x.svg || x.nb !== x.want || !x.al);
      T('N6', !bad.length, '预览样谱 ' + r.out.length + ' 种新组合都能刻（无「预览暂不可用」）、行标条数＝bandDefs、与引擎行位（首列框）对齐；合唱＋钢琴＝「n 声部」＋「钢琴伴奏」、尤克里里「五线＋四线」',
        J(bad.length ? bad : r.out.map(x => x.k + ':' + x.bandT.join('/'))));
      T('N6', r.same, '离屏不变量：开 / 切 10 种新组合预览后关闭——曲谱、选区、撤销 / 重做栈、窗口数、本机存储、#paper 尺寸不变');
      NOTE('N6 引擎刻版耗时（ms）：' + r.out.map(x => x.k + '=' + x.ms).join(' '));
    });

    /* ===== N7 胶片步骤 / 建成提示 ===== */
    if (want('N7')) await guard('N7', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N7' });
      const r = await pg.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
        try { hideStartPad(); } catch (_) {}
        const msgs = []; const ts0 = window.toastSay; window.toastSay = function (msg) { msgs.push(String(msg)); return ts0.apply(this, arguments); };
        for (const [k, q] of [['jg4', '?new=vocal&parts=4&tacc=with&mel=J'], ['sg3', '?new=vocal&parts=3&tacc=with&mel=S'], ['pacc', '?new=pacc']]) {
          try { closeModal(); } catch (_) {}
          nwLinkBoot(q); await w(250);
          const film = (document.getElementById('nf-film') || {}).innerText || '';
          msgs.length = 0; NWP.create(); await w(400);
          const sb = (document.getElementById('flw-sbar') || {}).innerText || '';
          out[k] = { film, msg: msgs.join(' / '), sb, k: NWB.stackOf(song) };
        }
        window.toastSay = ts0;
        return out;
      });
      await ctx.close();
      const no = x => !/一键配伴奏|填进下面两行|配和弦与伴奏/.test(x.film + x.msg + x.sb);
      T('N7', no(r.jg4) && no(r.sg3) && r.jg4.k === 'J' && r.sg3.k === 'S', '合唱＋钢琴（简谱四部 / 五线三部）：胶片步骤、建成提示原文、悬浮条都不出现「一键配伴奏…填进下面两行」', J({ jg4: r.jg4, sg3: r.sg3 }));
      T('N7', /一键配伴奏/.test(r.pacc.msg) || /配伴奏|配和弦/.test(r.pacc.film + r.pacc.sb), '对照：钢琴伴奏歌谱照旧给「一键配伴奏」指引', J(r.pacc));
    });

    /* ===== N8 全部建谱路径写 intent ===== */
    if (want('N8')) await guard('N8', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N8' });
      const res = [];
      const info = async (tag, want) => { const I = await pg.evaluate(() => ({ intent: song.intent == null ? null : song.intent, k: NWB.stackOf(song), docs: docs.length })); res.push([tag, want, I]); };
      const reset = async () => pg.evaluate(() => { try { closeModal(); } catch (_) {} try { NWP.quickMenuClose(); } catch (_) {} try { hideStartPad(); } catch (_) {} if (docs.length > 3) closeDocAt(curDocI); });
      /* 启动台（开机即在）：sc:pacc → 面板预选 → 创建 */
      const sp = '#spd-nx [data-sp="sc:pacc"]', spVis = await pg.isVisible(sp).catch(() => false);
      if (spVis) { await pg.click(sp); await W(300); await pg.click('#nw-create'); await W(250); await info('启动台 sc:pacc', 'pacc'); } else res.push(['启动台 sc:pacc', 'pacc', { intent: '（启动台卡不可见）' }]);
      await reset(); await pg.evaluate(() => localStorage.removeItem('musetab-nw-last'));
      await pg.evaluate(() => __panel()); await W(200); await pg.click('.nf-modal [data-scene="kids"]'); await pg.click('#nw-create'); await W(200); await info('面板点击「创建」', 'kids');
      await reset(); await pg.evaluate(() => __panel()); await W(200); await pg.dblclick('.nf-modal [data-scene="sight"]'); await W(250); await info('双击用途', 'sight');
      await reset(); await pg.evaluate(() => __panel()); await W(200); await pg.click('.nf-modal [data-scene="teach"]'); await pg.keyboard.press('Enter'); await W(250); await info('回车', 'teach');
      await reset();
      await pg.waitForSelector('#flw-file', { state: 'visible' }); await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]'); await pg.click('#popmenu [data-fa="r1:newdd"]');
      await pg.waitForSelector('.nf-qm [data-q="chord"]'); await pg.click('.nf-qm [data-q="chord"]'); await W(250); await info('快速新建 ▾ 用途', 'chord');
      await reset(); await pg.mouse.click(5, 450); await pg.keyboard.press('Alt+Shift+KeyN'); await W(300); await info('Alt+Shift+N 按上次', 'chord');
      await reset(); await pg.evaluate(() => FLOW.cmd.run('r1:last')); await W(300); await info('命令面板 r1:last', 'chord');
      await reset(); await pg.evaluate(() => FLOW.cmd.run('r1:new')); await W(250); await pg.click('.nf-modal [data-scene="solo"]'); await pg.click('#nw-create'); await W(250); await info('命令面板 r1:new → 面板', 'solo');
      await reset(); await pg.evaluate(() => nwLinkBoot('?new=inst&instKey=violin&tacc=with')); await W(250); await pg.keyboard.press('Enter'); await W(250); await info('深链 ?new=inst… ＋回车', 'inst');
      await reset(); await pg.evaluate(() => NWP.quickCreate('vocal')); await W(250); await info('NWP.quickCreate(用途)', 'vocal');
      await ctx.close();
      /* 旧外壳同样写 */
      const o2 = await open(b, withQ(URL0, 'shell=classic'), { tag: 'N8c' });
      await o2.pg.evaluate(() => { localStorage.removeItem('musetab-nw-last'); try { hideStartPad(); } catch (_) {} });
      await o2.pg.click('#b-new'); await o2.pg.waitForSelector('.nf-modal [data-scene]'); await o2.pg.click('.nf-modal [data-scene="vocal"]'); await o2.pg.click('#nw-create'); await W(250);
      res.push(['旧外壳 面板「创建」', 'vocal', await o2.pg.evaluate(() => ({ intent: song.intent == null ? null : song.intent, k: NWB.stackOf(song) }))]);
      await o2.pg.click('#b-newdd'); await o2.pg.waitForSelector('.nf-qm [data-q="gtr"]'); await o2.pg.click('.nf-qm [data-q="gtr"]'); await W(250);
      res.push(['旧外壳 新建 ▾ 用途', 'gtr', await o2.pg.evaluate(() => ({ intent: song.intent == null ? null : song.intent, k: NWB.stackOf(song) }))]);
      await o2.ctx.close();
      res.forEach(([tag, wnt, I]) => T('N8', I.intent === wnt, tag + ' → intent＝' + wnt, J(I)));
    });

    /* ===== N9 快捷键 ===== */
    if (want('N9')) await guard('N9', async () => {
      if (!BP || !BP.keys) { T('N9', false, 'fixtures/v700_base.json 缺 panel.keys（先跑 --write-base）'); return; }
      const cur = await keySeq(b, URL0), base = BP.keys;
      const diff = cur.map((x, i) => x === base[i] ? null : [i, x, base[i]]).filter(Boolean);
      T('N9', !diff.length && cur.length === base.length && cur.length >= 20, '快捷键序列 ' + cur.length + ' 步（Alt+N · ↑↓ Home End · 1–5 · ←→ 组内 · Enter · Esc · Alt+Shift+N）与基线新形态逐步相同', J(diff.slice(0, 4)));
    });

    /* ===== N10 点击数 ===== */
    if (want('N10')) await guard('N10', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'N10' });
      const run = async (steps, want) => {
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} localStorage.removeItem('musetab-nw-last'); __panel(); }); await W(250);
        let n = 0; for (const s of steps) { if (s[0] === 'sel') await pg.selectOption('#nf-inst', s[1]); else await pg.click(s[1]); n++; await W(60); }
        await pg.click('#nw-create'); n++; await W(250);
        const I = await pg.evaluate(() => ({ k: NWB.stackOf(song), name: docTypeLabel(song) }));
        return { n, ok: I.name === want, I };
      };
      const u = await run([['c', '.nf-modal [data-scene="solo"]'], ['c', '#nf-params [data-act="var"][data-k="inst"][data-v="uku"]']], '尤克里里独奏谱');
      const s = await run([['c', '.nf-modal [data-scene="sight"]'], ['c', '#nf-pvmel [data-act="mel"][data-v="J"]']], '简谱歌谱');
      const x = await run([['c', '.nf-modal [data-scene="inst"]'], ['sel', 'sax'], ['c', '#nf-pvmel [data-act="mel"][data-v="J"]']], '萨克斯谱（简谱）');
      /* v70.0 验收⑤：合唱＋钢琴＝歌谱 → 四部 → 参数行「加伴奏」→ 创建（3 次点选＋创建；此前 ⋯ → 加伴奏 → 收起 ⋯ 多 2 步）；参数行「钢琴」chip 只在二部及以上出现，⋯ 里不再重复；独唱不出 */
      const chip = async () => pg.evaluate(() => ({ main: !!document.querySelector('#nf-params [data-act="var"][data-k="tacc"]'), more: (() => { const m = document.querySelector('#nf-more'); m.click(); const r = !!document.querySelector('#nf-moreb [data-act="var"][data-k="tacc"]'); m.click(); return r; })() }));
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} localStorage.removeItem('musetab-nw-last'); __panel(); }); await W(250);
      await pg.click('.nf-modal [data-scene="vocal"]'); await W(80); const c1 = await chip();
      await pg.click('#nf-params [data-act="var"][data-k="parts"][data-v="2"]'); await W(80); const c2 = await chip();
      const vis4 = await pg.isVisible('#nf-params [data-act="var"][data-k="tacc"][data-v="with"]');
      const ch = await run([['c', '.nf-modal [data-scene="vocal"]'], ['c', '#nf-params [data-act="var"][data-k="parts"][data-v="4"]'], ['c', '#nf-params [data-act="var"][data-k="tacc"][data-v="with"]']], '简谱合唱谱（含钢琴伴奏）');
      await ctx.close();
      T('N10', u.ok && s.ok && x.ok, '点击数（面板打开起，含「创建」）：尤克里里指弹 ' + u.n + '、简谱视唱 ' + s.n + '、萨克斯简谱 ' + x.n + '（P2a 形态，只记录不设上限）', J({ u, s, x }));
      T('N10', ch.ok && ch.n === 4 && vis4 && !c1.main && c1.more && c2.main && !c2.more, '合唱＋钢琴：歌谱 → 四部 → 参数行「加伴奏」→ 创建＝' + ch.n + ' 次（3 次点选＋创建，建成简谱合唱谱（含钢琴伴奏））；「钢琴」chip 独唱不出（⋯ 里照旧）、二部起在参数行（⋯ 里不重复）', J({ ch, c1, c2, vis4 }));
    });

    T('E', !pageErrs.length, '页面脚本错误 0', pageErrs.slice(0, 5).join(' | '));
  } finally { await b.close(); }
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + '）');
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
