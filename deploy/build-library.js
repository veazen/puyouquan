#!/usr/bin/env node
'use strict';
/* v69.3 曲库官方公版谱构建：deploy/library/manifest.json 里每首 MusicXML → 用编辑器自己的 importMusicXML（无头 Chromium）转成谱友圈谱面数据，
   过质量门后写 api/seed-library.json（服务端启动时 seedLibrary() 按 id 补种，见 api/db.js）。
   质量门（任一不过整个构建失败，不写文件）：
     ① 音高：源文件与「导入 → 再导出」逐小节比音高多重集（不含倚音），一个小节都不能差
     ② 时值：beatErrors() 为 0（不完整小节由导入标记 irr 豁免）
     ③ 不丢：skip.parts / voices / notes 都为 0（同谱表第二声部、超过 4 音的和弦、超出的声部都会计数）
     ④ v69.4 拼写：源文件与「导入 → 再导出」逐小节比 音高＋step＋alter 多重集（不含倚音）——此前只比音高，450 个音被改拼（B♭→A♯）也能过门
     ⑤ v69.4 文字：导入后的标注 anno 不得只由数字 / 点 / 空白组成（OpenScore 节拍器拆写的「.6」残片）
     ⑥ v69.8 歌词音节（col.syl）：源文件与「导入 → 再导出」逐（有词 part × 段）比 syllabic 序列（缺省＝single，只算有 <text> 的 lyric；
        源序列先按「begin / middle＝与下一音节同词」规整——源谱 begin 后跟 single 这类录入笔误规整后再比，处数单列），
        且 <extend>（无 type 或 type="start"）个数一致——导入丢了连字符 / 延长线、或导出写错 begin / middle / end 都过不了门
     ⑦ v69.8 曲中速度（mea.tempos）：源文件速度事件（带 <metronome> 或 <sound tempo> 的 direction 与裸 <sound tempo>；各 part 按 (小节, 拍位) 去重；
        去掉最早的起始事件与第 0 小节拍首的事件）里印出的（带 metronome 且没 print-object="no"）个数＝!hide 点数、总数＝点总数，
        且每个点的 (小节, q) 与源文件逐个相同；再导出的同一统计（去掉起始 tempoXML）与点数一致
     ⑧ v69.8 移调 / 八度谱号（voxTransp / voxClefOct）：源文件与再导出逐 part 比首个 <transpose> 的 chromatic + 12×octave-change、
        逐谱表比首个 <clef> 的 <clef-octave-change>
   用法：node deploy/build-library.js          生成 api/seed-library.json
         node deploy/build-library.js --check  只校验：重新构建的结果与已提交的 api/seed-library.json 逐字节相同（tv_library 用）
   env：CHROMIUM_PATH（同测试） */
const fs = require('fs'), path = require('path');
/* playwright 装在 muse-tab/tests/node_modules（CI 只在那里 npm install）：从本目录解析不到时去那里找；本地设了 NODE_PATH 的照样走全局 */
const { chromium } = require(require.resolve('playwright', { paths: [__dirname, path.join(__dirname, '..', 'muse-tab', 'tests')] }));
const ROOT = path.resolve(__dirname, '..');
const MAN = path.join(__dirname, 'library', 'manifest.json');
const OUT = path.join(ROOT, 'api', 'seed-library.json');
const MAKER = '谱友圈官方 · 据 OpenScore 公版录入（CC0）';

async function build() {
  const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const out = [], bad = [], tot = {};
  try {
    for (const it of man.items) {
      const xml = fs.readFileSync(path.join(__dirname, 'library', it.file), 'utf8');
      const pg = await b.newPage();   /* 每首一个新页面：同一页面里连续 loadSong 会串味（PROJECT.md 测试坑） */
      await pg.goto('file://' + path.join(ROOT, 'muse-tab', 'index.html') + '?shell=classic');
      await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function');
      const r = await pg.evaluate(x => {
        const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const per = (xs, sp) => { const d = new DOMParser().parseFromString(xs, 'application/xml'), M = [];
          d.querySelectorAll('part').forEach(p => [...p.querySelectorAll(':scope > measure')].forEach((m, i) => { M[i] = M[i] || [];
            m.querySelectorAll('note').forEach(n => { if (n.querySelector('grace') || !n.querySelector('pitch')) return;
              const st = n.querySelector('pitch step').textContent, al = +((n.querySelector('pitch alter') || {}).textContent || 0);
              const mid = (+n.querySelector('pitch octave').textContent + 1) * 12 + PC[st] + al;
              M[i].push(sp ? mid + st + al : mid); }); }));
          return M.map(a => a.sort().join(',')); };
        const im = importMusicXML(x); if (!im || im.error) return { err: (im && im.error) || '导入失败' };
        loadSong(im.song);
        const ex = exportMusicXML(song), cnt = (A, B) => { let n = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i] || '') !== (B[i] || '')) n++; return n; };
        const pd = cnt(per(x), per(ex)), sd = cnt(per(x, 1), per(ex, 1));
        const junk = []; im.song.measures.forEach((m, mi) => (m.voxes || []).forEach(r => (r || []).forEach(c => { if (c && typeof c.anno === 'string' && /^[\s.\d]+$/.test(c.anno)) junk.push(mi + 1 + ':' + c.anno); })));
        const D = xs => new DOMParser().parseFromString(xs, 'application/xml');
        const dS = D(x), dE = D(ex);
        /* ⑥ 歌词：key＝有词 part 的序号 × 段序号（该 part 里出现过的 number 排序后的下标——自家导出写 number=段+1，源谱可能从 2 起） */
        const lyrSig = d => { const o = {}; let pi = 0;
          d.querySelectorAll('part').forEach(p => { const ls = [...p.querySelectorAll('note > lyric')]; if (!ls.some(l => l.querySelector('text'))) return;
            const nums = [...new Set(ls.map(l => l.getAttribute('number') || '1'))].sort((a, b) => (+a || 0) - (+b || 0) || (a < b ? -1 : 1));
            ls.forEach(l => { const k = pi + '.' + nums.indexOf(l.getAttribute('number') || '1'), e = o[k] || (o[k] = { syl: [], ext: 0 });
              if (l.querySelector('text')) { const sy = l.querySelectorAll('syllabic'); e.syl.push(sy.length ? sy[sy.length - 1].textContent.trim() : 'single'); }
              l.querySelectorAll('extend').forEach(x => { const t = x.getAttribute('type'); if (!t || t === 'start') e.ext++; }); });
            pi++; });
          return o; };
        /* 源谱偶有前后矛盾的 syllabic（begin 后跟 single、end 前是 single——OpenScore 录入笔误，如「e-lend」的 lend 标成 single）：
           col.syl 只存「与下一音节同词」一位，导入按 begin / middle 记位、导出由位推 begin / middle / end / single——所以先把源序列按同一规则规整再比，
           规整掉的处数单列记数（sylFix），再导出本身必须已是规整形 */
        const canon = L => { let pv = false; return L.map(v => { const c = v === 'begin' || v === 'middle', o = pv ? (c ? 'middle' : 'end') : (c ? 'begin' : 'single'); pv = c; return o; }); };
        const lS = lyrSig(dS), lE = lyrSig(dE), lyrBad = []; let sylFix = 0;
        [...new Set([...Object.keys(lS), ...Object.keys(lE)])].forEach(k => { const a = lS[k] || { syl: [], ext: 0 }, b = lE[k] || { syl: [], ext: 0 }, ca = canon(a.syl);
          ca.forEach((v, i) => { if (v !== a.syl[i]) sylFix++; });
          if (canon(b.syl).join() !== b.syl.join()) lyrBad.push(k + ' 再导出不是规整形');
          if (ca.join() !== b.syl.join()) { let i = 0; while (ca[i] === b.syl[i]) i++; lyrBad.push(k + ' 第' + (i + 1) + '个音节 ' + ca[i] + '→' + b.syl[i]); }
          if (a.ext !== b.ext) lyrBad.push(k + ' 延长线 ' + a.ext + '→' + b.ext); });
        const hy = Object.values(lS).reduce((n, e) => n + e.syl.filter(v => v === 'begin' || v === 'middle').length, 0), ext = Object.values(lS).reduce((n, e) => n + e.ext, 0);
        /* ⑦ 速度事件：按小节下标（:scope > measure，同导入）与拍位（divisions、backup / forward、和弦 / 倚音不进游标、direction 的 offset）定位 */
        const tpEv = d => { const ev = [];
          d.querySelectorAll('part').forEach(p => { let div = 1;
            [...p.querySelectorAll(':scope > measure')].forEach((m, mi) => { let t = 0;
              [...m.children].forEach(el => { const tg = el.tagName, du = () => +((el.querySelector(':scope > duration') || {}).textContent || 0);
                if (tg === 'attributes') { const dv = el.querySelector('divisions'); if (dv) div = +dv.textContent || div; }
                else if (tg === 'note') { if (!el.querySelector(':scope > chord') && !el.querySelector(':scope > grace')) t += du(); }
                else if (tg === 'backup') t -= du(); else if (tg === 'forward') t += du();
                else if (tg === 'direction' || tg === 'sound') {
                  const sd = tg === 'sound' ? (el.hasAttribute('tempo') ? el : null) : el.querySelector(':scope > sound[tempo]');
                  const mt = tg === 'direction' ? el.querySelector(':scope > direction-type > metronome') : null;
                  if (!sd && !mt) return;
                  const q = Math.max(0, t + (+((el.querySelector(':scope > offset') || {}).textContent || 0) || 0)) / div;
                  ev.push({ mi, q, shown: !!mt && mt.getAttribute('print-object') !== 'no' }); } }); }); });
          const first = ev.reduce((b, e) => (!b || e.mi < b.mi) ? e : b, null), out = [];
          ev.forEach(e => { if (e === first || (e.mi === 0 && e.q < 1e-3)) return; if (out.some(o => o.mi === e.mi && Math.abs(o.q - e.q) < 1e-3)) return; out.push(e); });
          return out.sort((a, b) => a.mi - b.mi || a.q - b.q); };
        const tS = tpEv(dS), tE = tpEv(dE), pts = [];
        im.song.measures.forEach((m, mi) => (m.tempos || []).forEach(t => pts.push({ mi, q: t.q, shown: !t.hide })));
        const tpBad = [], sig = L => L.map(e => e.mi + ':' + (+e.q).toFixed(3) + (e.shown ? '' : 'h')).join(' ');
        if (tS.filter(e => e.shown).length !== pts.filter(e => e.shown).length || tS.length !== pts.length) tpBad.push('源 ' + tS.filter(e => e.shown).length + '/' + tS.length + ' ≠ 点 ' + pts.filter(e => e.shown).length + '/' + pts.length);
        else if (sig(tS) !== sig(pts)) tpBad.push('位置 源[' + sig(tS) + '] 点[' + sig(pts) + ']');
        if (sig(tE) !== sig(pts)) tpBad.push('再导出 [' + sig(tE) + '] ≠ 点[' + sig(pts) + ']');
        /* ⑧ 移调 / 八度谱号：逐 part 首个 <transpose>（chromatic＋12×octave-change），逐谱表首个 <clef> 的 clef-octave-change */
        const trSig = d => [...d.querySelectorAll('part')].map(p => { const tr = p.querySelector('attributes > transpose');
          const t = tr ? (+((tr.querySelector('chromatic') || {}).textContent || 0)) + 12 * (+((tr.querySelector('octave-change') || {}).textContent || 0)) : 0;
          const co = {}; p.querySelectorAll('attributes > clef').forEach(c => { const n = c.getAttribute('number') || '1'; if (!(n in co)) co[n] = +((c.querySelector('clef-octave-change') || {}).textContent || 0); });
          return t + '|' + Object.keys(co).sort().map(n => co[n]).join(','); });
        const rS = trSig(dS), rE = trSig(dE), trBad = [];
        for (let i = 0; i < Math.max(rS.length, rE.length); i++) if (rS[i] !== rE[i]) trBad.push('P' + (i + 1) + ' ' + rS[i] + '→' + rE[i]);
        /* v69.9（负责人 2026-11-02 拍板「按建议」）曲库声部全称：OpenScore Lieder 的两行 part-name 是「原文名⏎英文对照」（「Singstimme⏎Voice」「Gesang⏎Voice」），
           导入按 A8 空白归一成「Singstimme Voice」→ 首行全称太长（圣母颂前两系统各 1 小节）。曲库只留第一行原文名；导入器本身不改（用户自己导入照旧） */
        const nameFix = {};
        dS.querySelectorAll('part-list > score-part').forEach(sp => { const pn = sp.querySelector(':scope > part-name'); if (!pn) return;
          const lines = pn.textContent.split(/\s*[\r\n]+\s*/).map(t => t.trim()).filter(Boolean);
          if (lines.length > 1) nameFix[lines.join(' ')] = lines[0]; });
        return { song: im.song, nameFix, pitchDiff: pd, spellDiff: sd, junk, beatErr: beatErrors().length, skip: im.skip, lyrBad, tpBad, trBad,
          cnt: { hy, ext, sylFix, tp: pts.length, tpShown: pts.filter(e => e.shown).length, trans: rS.filter(v => !/^0\|[0,]*$/.test(v)).length } };
      }, xml);
      await pg.close();
      if (r.err) { bad.push(it.id + ' 导入失败：' + r.err); continue; }
      const sk = r.skip || {}, lost = (sk.parts | 0) + (sk.voices | 0) + (sk.notes | 0);
      if (r.pitchDiff || r.beatErr || lost || r.spellDiff || r.junk.length || r.lyrBad.length || r.tpBad.length || r.trBad.length) { bad.push(`${it.id}（${it.title}）未过质量门：音高不同小节 ${r.pitchDiff} · 时值不符 ${r.beatErr} · 丢弃 ${lost} · 拼写不同小节 ${r.spellDiff} · 数字残片标注 ${r.junk.length}${r.junk.length ? '（' + r.junk.slice(0, 5).join(' ') + '）' : ''}`
        + ` · 歌词音节 ${r.lyrBad.length}${r.lyrBad.length ? '（' + r.lyrBad.slice(0, 3).join('；') + '）' : ''} · 速度点 ${r.tpBad.length}${r.tpBad.length ? '（' + r.tpBad.join('；').slice(0, 300) + '）' : ''} · 移调 / 八度谱号 ${r.trBad.length}${r.trBad.length ? '（' + r.trBad.join('；') + '）' : ''}`); continue; }
      for (const k in r.cnt) tot[k] = (tot[k] || 0) + r.cnt[k];
      if (Array.isArray(r.song.voxVoices)) r.song.voxVoices = r.song.voxVoices.map(n => (typeof n === 'string' && r.nameFix[n]) || n);
      const data = Object.assign(r.song, { title: it.title, composer: it.composer, lyricist: it.lyricist, maker: MAKER });
      out.push({ id: it.id, title: it.title, singer: it.composer, data, source: it.source });
    }
  } finally { await b.close(); }
  return { out, bad, tot };
}

(async () => {
  const check = process.argv.includes('--check');
  const { out, bad, tot } = await build();
  if (bad.length) { console.error('❌ 质量门未过：\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`   ⑥–⑧ 记数：连字符 ${tot.hy | 0}（源谱矛盾 syllabic 规整 ${tot.sylFix | 0} 处）· 延长线 ${tot.ext | 0} · 速度点 ${tot.tp | 0}（印出 ${tot.tpShown | 0}）· 移调 / 八度谱号 part ${tot.trans | 0}`);
  const txt = JSON.stringify(out) + '\n';
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== txt) { console.error('❌ api/seed-library.json 与重新构建的结果不同——导入器改了？跑 node deploy/build-library.js 重新生成并提交'); process.exit(1); }
    console.log('✅ 曲库 ' + out.length + ' 首：质量门全过，api/seed-library.json 与重新构建逐字节相同'); return;
  }
  fs.writeFileSync(OUT, txt);
  console.log('✅ 写入 api/seed-library.json：' + out.length + ' 首（' + Math.round(txt.length / 1024) + ' KB）');
})();
