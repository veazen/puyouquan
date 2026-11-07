'use strict';
/* v70.5 集成 · 跨组接缝（规格 docs/spec-2026-11-v705.md §11.4「接缝核对：导入产物经 A 的分类 / 分谱 / 改声部路径走一遍」）。file:// 直载，真实浏览器。
   B 组导入（fixtures/v705 F01–F27，含 F01b–F01d，共 30 份）的产物载入后，逐份走 A 组的分类、分谱、改声部、配伴奏、换谱类路径：
   J1 载入后 voxLayerOk 成立、见证齐（每个生效层 mixer['vox:i'].lay===1，别的行没有见证）
   J2 分类 / 谱名：编辑器 PQ_KIND 的 stackOf / docTypeOf / nameOf / isChoir / isPianoAccStack / groupsOf / pzOf / facetsOf / ctxOf ＝ 服务端 api/kindname.js；pubKindOf 不抛
   J3 导出再导入：声部名、voxLayer、见证、逐列（音级 / 时值 / 附点 / 连音 / 和音 / 倚音 / 连音线 / 歌词 / hid）相等
   J4 分谱：partsPlan / partSong 每份 voxLayerOk 成立、见证只在生效层、源谱成对而副本里不再成对的行不带 hid（§8.2 3b）
   J5 改声部 / 配伴奏 / 换谱类（末尾加轨 · 智能填词加声部 · 删宿主 · 删层 · 删首行再加轨 · 配伴奏新窗口 · 填进当前谱 · 换谱类 9 个目标 直接换 / 重建 / 另建一份）：
      之后 voxLayer 长度＝行数、见证只在 voxLayer=1 的行、生效层都挂在原宿主上，仍有层的谱导出再导入相等
   J6 路径之后层与原宿主仍相邻、两行都是五线谱时层仍生效（见证不丢）；切简谱（直接换）层失效、voxLayer 与 hid 留着，属设计（tv_v705data S12）
   E  页面脚本错误 0
   两种外壳各跑一遍（缺省新外壳 ＋ ?shell=classic）。单跑约 25 秒。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· MUSETAB_API 服务端 kindname.js · FX=F01,F07 只跑部分夹具 · SHELLS=flow,classic */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const K = require(process.env.MUSETAB_API ? path.resolve(process.env.MUSETAB_API) : path.join(ROOT, 'api/kindname.js'));
const FXD = path.join(__dirname, 'fixtures', 'v705');
const NAMES = process.env.FX ? process.env.FX.split(',').map(s => s.trim()) : fs.readdirSync(FXD).filter(f => /\.musicxml$/.test(f)).map(f => f.replace(/\.musicxml$/, '')).sort();
const SHELLS = (process.env.SHELLS || 'flow,classic').split(',').map(s => s.trim()).filter(Boolean);
const CLS = ['stackOf', 'docTypeOf', 'nameOf', 'isChoir', 'isPianoAccStack', 'groupsOf', 'pzOf', 'facetsOf', 'ctxOf'];
const LB_TO = ['J', 'S', 'SJ', 'JG', 'SG', 'SJG', 'G', 'CS', 'ST'];
let pass = 0, total = 0;
const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1800) : '')); };
const J = x => JSON.stringify(x);

const HELP = () => {
  window.SF_PLAYWAIT = false;
  window.guardReplace = p => p();
  const J = x => JSON.stringify(x);
  window.__c = c => (c.deg ? c.deg + (c.acc || '') + (c.oct ? '^' + c.oct : '') : (c.hid === 1 ? 'h' : '0')) + '/' + c.dur + (c.dotted === 2 ? '..' : c.dotted ? '.' : '') + (c.tup ? 't' + c.tup : '')
    + (c.adds && c.adds.length ? '+' + c.adds.length : '') + (c.grace ? 'g' + (c.grace.notes || []).length : '') + (c.tie ? '~' : '') + ((c.lyrics || []).some(Boolean) ? '"' + c.lyrics.map(x => x || '').join('|') + '"' : '');
  window.__sum = s => ({ vv: s.voxVoices, vl: s.voxLayer === undefined ? '无' : s.voxLayer,
    lay: Object.keys(s.mixer || {}).filter(k => s.mixer[k] && typeof s.mixer[k] === 'object' && 'lay' in s.mixer[k]).sort(),
    rows: (s.voxVoices || []).map((_, vi) => s.measures.map(m => ((m.voxes || [])[vi] || []).map(__c).join(' ')).join(' | ')) });
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; render(); return true; };
  /* ref＝源谱的生效层 [{name, host}]；paired＝源谱里成对（宿主或层）的行名 */
  window.__ref = s => { let ok = null; try { ok = PQ_KIND.voxLayerOk(s); } catch (_) {} return (ok || []).map((x, i) => x === 1 ? { name: s.voxVoices[i], host: s.voxVoices[i - 1] } : null).filter(Boolean); };
  window.__inv = (s, ref, hidStrict) => { const bad = [], vl = s.voxLayer, vv = s.voxVoices || [], vn = s.voxNotations || [];
    let ok = null; try { ok = PQ_KIND.voxLayerOk(s); } catch (e) { bad.push('voxLayerOk 抛 ' + e.message); }
    if (vl !== undefined && !(Array.isArray(vl) && vl.length === vv.length)) bad.push('voxLayer 长度 ' + J(vl) + ' / ' + vv.length);
    Object.keys(s.mixer || {}).forEach(k => { const e = s.mixer[k]; if (e && typeof e === 'object' && 'lay' in e) { const i = +k.slice(4); if (!Array.isArray(vl) || vl[i] !== 1) bad.push('多余见证 ' + k); } });
    (ok || []).forEach((x, i) => { if (x !== 1) return; const r = (ref || []).find(l => l.name === vv[i]);
      if (!r) bad.push('生效层 ' + vv[i] + ' 不是源谱的层'); else if (vv[i - 1] !== r.host) bad.push('层 ' + vv[i] + ' 挂到 ' + vv[i - 1] + '（原宿主 ' + r.host + '）'); });
    const lost = (ref || []).filter(r => { const i = vv.indexOf(r.name); return i > 0 && vv[i - 1] === r.host && PQ_KIND.isStaffNota(vn[i]) && PQ_KIND.isStaffNota(vn[i - 1]) && !(ok && ok[i] === 1); }).map(r => r.name);
    const live = new Set(); (ok || []).forEach((x, i) => { if (x === 1) { live.add(i); live.add(i - 1); } });
    const paired = new Set(); (ref || []).forEach(r => { paired.add(r.name); paired.add(r.host); });
    let hidOrphan = 0; (s.measures || []).forEach(m => ((m && m.voxes) || []).forEach((cols, vi) => { if (live.has(vi) || !paired.has(vv[vi])) return; (cols || []).forEach(c => { if (c && c.hid === 1) hidOrphan++; }); }));
    if (hidStrict && hidOrphan) bad.push('源谱成对、这里不再成对的行带 hid ' + hidOrphan);
    return { bad, lost, ok, hidOrphan };
  };
  window.__rt = s => { const x = exportMusicXML(JSON.parse(JSON.stringify(s))); const r = importMusicXML(x); if (!r || !r.song) return { eq: false, err: 'reimport ' + (r && r.error) };
    const a = __sum(migrate(JSON.parse(JSON.stringify(s)))), z = __sum(migrate(JSON.parse(JSON.stringify(r.song))));
    return { eq: J(a) === J(z), a, z }; };
  window.__cls = (s, fs) => { const o = {}; for (const f of fs) { try { o[f] = typeof PQ_KIND[f] === 'function' ? PQ_KIND[f](s) : '无'; } catch (e) { o[f] = 'ERR ' + e.message; } } return o; };
  window.__seam = (x, CLS, LB_TO) => {
    const o = { paths: {} };
    const im = importMusicXML(x); if (!im || !im.song) return { err: 'import ' + (im && im.error) };
    __ld(im.song); const s0 = JSON.parse(J(song)); o.s0 = s0; const ref = __ref(s0); o.ref = ref; o.inv0 = __inv(s0, ref, false);
    o.cls = __cls(s0, CLS); o.rt0 = __rt(s0);
    try { const pl = partsPlan(song); o.parts = pl.solo ? 'solo' : pl.parts.map(p => { const ps = partSong(p).song; const iv = __inv(ps, ref, true); return { id: p.id, kind: p.kind, vox: p.vox, bad: iv.bad, lost: iv.lost }; }); }
    catch (e) { o.parts = 'ERR ' + e.message; }
    const run = (nm, fn) => { try { __ld(s0); const res = fn(); const s = res && res.voxVoices ? res : song; const iv = __inv(s, ref, false);
        const p = { vl: s.voxLayer, bad: iv.bad, lost: iv.lost, hidOrphan: iv.hidOrphan, nota: (s.voxNotations || []).slice() };
        if (Array.isArray(s.voxLayer) && iv.ok && iv.ok.some(v => v === 1)) { const rt = __rt(s); p.rt = rt.eq ? 'eq' : { a: rt.a, z: rt.z, err: rt.err }; }
        o.paths[nm] = p; } catch (e) { o.paths[nm] = { err: String(e && e.stack || e).slice(0, 400), bad: [], lost: [] }; } };
    run('末尾加轨', () => { addVoice('vox'); });
    run('智能填词加声部', () => { addLyrVoice(0); });
    if (ref.length) {
      const L = s0.voxVoices.indexOf(ref[0].name);
      run('删宿主', () => { delVoiceAt('vox', L - 1); });
      run('删层', () => { delVoiceAt('vox', L); });
      run('删首行再加轨', () => { if (s0.voxVoices.length > 2) delVoiceAt('vox', 0); addVoice('vox'); });
    }
    run('配伴奏新窗口', () => arrangeAccompaniment(song, { suggest: true }).song);
    run('填进当前谱', () => { if (accFillable(song)) { const tex = (texAvail(song.beats, song.unit)[0] || {}).id; fillAccompaniment(tex, true); } });
    o.lb = {};
    for (const to of LB_TO) {
      __ld(s0); let mode; try { mode = lbPlan(song, to).mode; } catch (e) { mode = 'ERR ' + e.message; }
      o.lb[to] = mode;
      if (mode === 'copy') run('→' + to + '（另建一份）', () => lbCopy(song, to));
      else if (mode === 'direct' || mode === 'rebuild') run('→' + to + '（' + mode + '）', () => { lbSwitch(to); return song; });
    }
    return o;
  };
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  for (const sh of SHELLS) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.addInitScript(HELP);
    await pg.goto(URL0 + (sh === 'classic' ? '?shell=classic' : ''));
    await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function' && typeof __seam === 'function', null, { timeout: 30000 });
    await pg.waitForTimeout(800);
    await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
    const tag = sh === 'classic' ? '［旧外壳］' : '［新外壳］';
    const agg = { J1: [], J2: [], J3: [], J4: [], J5: [], J6: [] }; let nLay = 0, nPath = 0, nRt = 0;
    for (const n of NAMES) {
      const x = fs.readFileSync(path.join(FXD, n + '.musicxml'), 'utf8');
      const r = await pg.evaluate(([x, CLS, LB_TO]) => __seam(x, CLS, LB_TO), [x, CLS, LB_TO]).catch(e => ({ err: String(e.message || e).slice(0, 500) }));
      if (r.err) { agg.J1.push(n + ' 运行 ' + r.err); continue; }
      if (r.ref.length) nLay++;
      if (r.inv0.bad.length || r.inv0.lost.length || (r.ref.length > 0) !== Array.isArray(r.s0.voxLayer)) agg.J1.push(n + ' ' + J(r.inv0));
      const srv = {}; for (const f of CLS) { try { srv[f] = typeof K[f] === 'function' ? K[f](r.s0) : '无'; } catch (e) { srv[f] = 'ERR ' + e.message; } }
      let pubErr = null; try { if (K.pubKindOf) K.pubKindOf(r.s0); } catch (e) { pubErr = e.message; }
      const cb = CLS.filter(f => J(srv[f]) !== J(r.cls[f]) || /^ERR/.test(String(r.cls[f])));
      if (cb.length || pubErr) agg.J2.push(n + ' ' + J(cb.map(f => [f, r.cls[f], srv[f]])) + (pubErr ? ' pubKindOf 抛 ' + pubErr : ''));
      if (!r.rt0.eq) agg.J3.push(n + ' ' + J(r.rt0));
      if (typeof r.parts === 'string' ? r.parts !== 'solo' : r.parts.some(p => p.bad.length || p.lost.length)) agg.J4.push(n + ' ' + J(r.parts));
      for (const [k, p] of Object.entries(r.paths)) { nPath++; if (p.rt === 'eq') nRt++;
        if (p.err || p.bad.length || (p.rt && p.rt !== 'eq')) agg.J5.push(n + ' ' + k + ' ' + J(p));
        if (p.lost && p.lost.length) agg.J6.push(n + ' ' + k + ' 失效 ' + p.lost.join('/')); }
    }
    T(!agg.J1.length && nLay >= 20, 'J1 ' + tag + NAMES.length + ' 份导入产物（' + nLay + ' 份带层）载入后 voxLayerOk 成立、见证齐、别的行没有见证', agg.J1.join(' | '));
    T(!agg.J2.length, 'J2 ' + tag + '分类 / 谱名 9 个函数 编辑器＝服务端 api/kindname.js，pubKindOf 不抛', agg.J2.join(' | '));
    T(!agg.J3.length, 'J3 ' + tag + '导出再导入：声部名 / voxLayer / 见证 / 逐列相等', agg.J3.join(' | '));
    T(!agg.J4.length, 'J4 ' + tag + '分谱每份 voxLayerOk 成立、见证只在生效层、拆开的成对行不带 hid', agg.J4.join(' | '));
    T(!agg.J5.length && nRt >= 60, 'J5 ' + tag + nPath + ' 条改声部 / 配伴奏 / 换谱类路径：voxLayer 长度＝行数、见证只在层行、生效层挂原宿主；仍有层的 ' + nRt + ' 条导出再导入相等', agg.J5.join(' | '));
    T(!agg.J6.length, 'J6 ' + tag + '路径之后层与原宿主仍相邻（两行五线谱）时层不失效、见证不丢', agg.J6.join(' | '));
    T(!errs.length, 'E ' + tag + '页面脚本错误 0', errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
