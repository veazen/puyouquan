'use strict';
/* v69.2 互操作 P0（PROJECT.md §9.0）：导出的 MusicXML 全部过 MusicXML 4.0 官方 XSD（fixtures/xsd/，离线校验，xmllint --schema）。
   修前：TAB part 首小节 <attributes> 里 <staff-details> 写在 <clef> 前（XSD 顺序是 clef → staff-details），本套件语料 72 份里 31 份不过。
   X0  XSD 可用：最小合法文档通过、故意把 staff-details 放 clef 前的文档不通过（防「校验器没真跑」的假绿）
   X1  16 份预设谱
   X2  8 种谱类空谱（createSong：弹唱吉他 / 弹唱尤克里里 / 独奏 / 钢琴弹唱 / 钢琴 / 四声部歌谱 / 教学对照 / 器乐中音谱号）
   X3  16 份预设「导出 → 导入 → 再导出」：导入不报错、再导出仍过 XSD
   X4  每份预设按演奏者出的分谱（partsPlan → partSong → exportMusicXML）
   X5  TAB 谱：每个含 <staff-details> 的 <attributes> 里 <clef> 在 <staff-details> 之前；往返后 <staff-details>（弦数 / 定弦 / 变调夹）逐字节不变
   E   页面脚本错误 0
   突变实证（报告里列）：把 exportMusicXML 的 TAB 段改回 staffDetailsXML(ti)+<clef> → X1 / X3 / X4 / X5 红（X1 6 份、全语料 31 份）。
   env：MUSETAB_URL · XSD（缺省 fixtures/xsd/musicxml.xsd） */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const XSD = process.env.XSD || path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1600) : '')); };

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tv_xsd_'));
let nf = 0;
/* 返回 null＝通过；否则返回前两条错误 */
const xsdErr = xml => {
  const f = path.join(TMP, (nf++) + '.musicxml'); fs.writeFileSync(f, xml);
  try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); return null; }
  catch (e) { return String(e.stderr || e.message || '').split('\n').filter(l => /error/i.test(l)).map(l => l.replace(/^.*?(Element|Schemas)/, '$1')).slice(0, 2).join(' | ') || 'xmllint 失败'; }
};
const checkAll = docs => { const bad = []; docs.forEach(d => { if (d.err) { bad.push([d.n, d.err]); return; } const e = xsdErr(d.x); if (e) bad.push([d.n, e]); }); return bad; };

const MIN_OK = '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>G</part-name></score-part></part-list>'
  + '<part id="P1"><measure number="1"><attributes><divisions>1</divisions><clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details></attributes>'
  + '<note><rest/><duration>4</duration></note></measure></part></score-partwise>';
const MIN_BAD = MIN_OK.replace('<clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details>', '<staff-details><staff-lines>6</staff-lines></staff-details><clef><sign>TAB</sign><line>5</line></clef>');

(async () => {
  const t0 = Date.now();
  let hasLint = true; try { execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); } catch (_) { hasLint = false; }
  T('X0', hasLint && fs.existsSync(XSD) && xsdErr(MIN_OK) === null && xsdErr(MIN_BAD) !== null,
    'XSD 可用：最小合法文档过、staff-details 在 clef 前的文档不过（校验器真的在跑）', J({ hasLint, xsd: fs.existsSync(XSD), ok: hasLint && xsdErr(MIN_OK), bad: hasLint && xsdErr(MIN_BAD) }));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const pg = await b.newPage();
    pg.on('pageerror', e => pageErrs.push(String(e && e.message || e)));
    await pg.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'shell=classic'); await pg.waitForTimeout(1500);
    const R = await pg.evaluate(() => {
      const run = (n, f) => { try { const x = f(); return typeof x === 'string' ? { n, x } : { n, err: '导出不是字符串' }; } catch (e) { return { n, err: String(e && e.message || e).slice(0, 200) }; } };
      const kinds = [['弹唱吉他', () => createSong('tanchang', { inst: 'guitar', nTab: 1, nVox: 1, lyr: 1, beats: 4, unit: 4, key: 'C', nMea: 3 })],
        ['弹唱尤克里里', () => createSong('tanchang', { inst: 'uku', nTab: 1, nVox: 1, lyr: 1, beats: 4, unit: 4, key: 'G', nMea: 3 })],
        ['独奏', () => createSong('solo', { nTab: 1, nVox: 0, lyr: 0, beats: 3, unit: 4, key: 'Am', nMea: 3 })],
        ['钢琴弹唱', () => createSong('pianoacc', { lyr: 1, beats: 4, unit: 4, key: 'F', nMea: 3 })],
        ['钢琴', () => createSong('piano', { lyr: 0, beats: 4, unit: 4, key: 'D', nMea: 3 })],
        ['四声部歌谱', () => createSong('vocal', { nVox: 4, lyr: 2, beats: 4, unit: 4, key: 'C', nMea: 3 })],
        ['教学对照', () => createSong('teach', { nVox: 1, lyr: 1, beats: 4, unit: 4, key: 'E', nMea: 3 })],
        ['器乐中音谱号', () => createSong('instr', { clef: 'alto', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'D', nMea: 3 })]];
      const out = { presets: [], kinds: [], round: [], parts: [], tab: [] };
      const sdOf = x => (x.match(/<staff-details>[\s\S]*?<\/staff-details>/g) || []);
      PRESETS.forEach((p, i) => {
        const a = run(p.name, () => exportMusicXML(p.make())); out.presets.push(a);
        const r = run(p.name, () => { const im = importMusicXML(a.x); if (!im || im.error) throw new Error('导入失败：' + (im && im.error)); return exportMusicXML(im.song); });
        out.round.push(r);
        if (a.x && /<sign>TAB<\/sign>/.test(a.x)) {
          const attrs = a.x.match(/<attributes>[\s\S]*?<\/attributes>/g) || [];
          const order = attrs.filter(t => /<staff-details>/.test(t)).every(t => t.indexOf('<clef') >= 0 && t.indexOf('<clef') < t.indexOf('<staff-details>'));
          out.tab.push({ n: p.name, order, same: !!r.x && JSON.stringify(sdOf(a.x)) === JSON.stringify(sdOf(r.x)), nSd: sdOf(a.x).length });
        }
        try { loadSong(p.make()); (partsPlan(song).parts || []).forEach(pt => out.parts.push(run(p.name + ' · ' + (pt.name || pt.id), () => { const ps = partSong(pt); return exportMusicXML(ps.song || ps); }))); }
        catch (e) { out.parts.push({ n: p.name + ' · 分谱', err: String(e && e.message || e).slice(0, 200) }); }
      });
      kinds.forEach(([n, mk]) => out.kinds.push(run(n, () => exportMusicXML(mk()))));
      return out;
    });
    const b1 = checkAll(R.presets), b2 = checkAll(R.kinds), b3 = checkAll(R.round), b4 = checkAll(R.parts);
    T('X1', R.presets.length >= 16 && !b1.length, R.presets.length + ' 份预设谱导出全部过 MusicXML 4.0 XSD', J(b1));
    T('X2', R.kinds.length === 8 && !b2.length, '8 种谱类空谱导出全部过 XSD', J(b2));
    T('X3', R.round.length === R.presets.length && !b3.length, R.round.length + ' 份预设「导出 → 导入 → 再导出」导入不报错、再导出仍过 XSD', J(b3));
    T('X4', R.parts.length > 0 && !b4.length, R.parts.length + ' 份分谱导出全部过 XSD', J(b4));
    const tabBad = R.tab.filter(t => !t.order || !t.same || !t.nSd);
    T('X5', R.tab.length >= 5 && !tabBad.length, R.tab.length + ' 份含六线谱的预设：<clef> 在 <staff-details> 之前；往返后弦数 / 定弦 / 变调夹逐字节不变', J(tabBad.length ? tabBad : R.tab));
  } catch (e) { T('X', false, '执行异常', e && e.stack || e); }
  await b.close();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  T('E', !pageErrs.length, '页面脚本错误 0', J(pageErrs.slice(0, 5)));
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})();
