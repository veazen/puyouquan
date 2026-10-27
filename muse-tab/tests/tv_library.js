'use strict';
/* v69.3 曲库官方公版谱（deploy/library/ → api/seed-library.json，服务端 seedLibrary 补种）：
   L1  node deploy/build-library.js --check：每首过质量门（音高逐小节一致、时值无误、不丢声部），且与已提交的 seed-library.json 逐字节相同
       （导入器改动让曲库结果变了 → 红，提示重新生成并复核）
   L2  每首在编辑器里打开：#score 画出、谱名与谱类合理（钢琴伴奏 / 合唱）、曲名 / 作曲 / 作词 / 制谱署名都在
   L3  每首导出的 MusicXML 过 MusicXML 4.0 官方 XSD（fixtures/xsd/）
   L4  和音逐音连音线有落地：至少一首带 adds[].tie，且五线谱画出了附加音的连音弧（附加音的弧数 > 0）
   E   页面脚本错误 0
   env：MUSETAB_URL */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const ROOT = path.resolve(__dirname, '..', '..');
const XSD = path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1600) : '')); };

(async () => {
  const t0 = Date.now();
  { let ok = false, msg = '';
    try { msg = execFileSync('node', [path.join(ROOT, 'deploy', 'build-library.js'), '--check'], { encoding: 'utf8', env: process.env, timeout: 600000 }); ok = /✅/.test(msg); }
    catch (e) { msg = (e.stdout || '') + (e.stderr || ''); }
    T('L1', ok, '曲库构建：质量门全过、与已提交的 api/seed-library.json 逐字节相同', msg.trim()); }
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv_library_'));
  const bad2 = [], bad3 = []; let tieSongs = 0, addArcs = 0;
  try {
    for (const it of list) {
      const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
      pg.on('pageerror', e => pageErrs.push(it.id + ': ' + String(e && e.message || e)));
      await pg.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'shell=classic'); await pg.waitForTimeout(1000);
      const r = await pg.evaluate(d => { loadSong(d); render();
        const sc = document.getElementById('score'), kind = (typeof docTypeLabel === 'function') ? docTypeLabel(song) : '';
        const hasAddTie = song.measures.some(m => (m.voxes || []).some(row => (row || []).some(c => (c.adds || []).some(a => a && a.tie))));
        return { svg: !!(sc && sc.innerHTML.length > 1000), kind, title: song.title, comp: song.composer, lyr: song.lyricist, maker: song.maker,
          paths: sc ? sc.querySelectorAll('path').length : 0, hasAddTie, xml: exportMusicXML(song) }; }, it.data);
      if (!r.svg || !/钢琴|合唱|歌谱/.test(r.kind) || !r.title || !r.comp || !r.lyr || !/OpenScore/.test(r.maker || '')) bad2.push([it.id, r.kind, r.title, r.comp, r.lyr, r.maker]);
      const f = path.join(tmp, it.id + '.musicxml'); fs.writeFileSync(f, r.xml);
      try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); }
      catch (e) { bad3.push([it.id, String(e.stderr || '').split('\n').filter(l => /error/i.test(l)).slice(0, 2).join(' | ')]); }
      if (r.hasAddTie) {
        tieSongs++;
        /* 附加音连音弧：去掉 adds[].tie 重画，弧（path）数应减少——差值就是附加音的弧数 */
        const p2 = await pg.evaluate(() => { song.measures.forEach(m => (m.voxes || []).forEach(row => (row || []).forEach(c => (c.adds || []).forEach(a => { if (a) delete a.tie; })))); render();
          return document.getElementById('score').querySelectorAll('path').length; });
        addArcs += Math.max(0, r.paths - p2);
      }
      await pg.close();
    }
  } catch (e) { T('X', false, '执行异常', e && e.stack || e); }
  await b.close();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  T('L2', list.length >= 10 && !bad2.length, list.length + ' 首都能打开并画出谱面；谱类为钢琴伴奏 / 合唱 / 歌谱；曲名、作曲、作词、制谱（OpenScore）署名齐全', J(bad2));
  T('L3', !bad3.length, list.length + ' 首导出的 MusicXML 都过 MusicXML 4.0 官方 XSD', J(bad3));
  T('L4', tieSongs >= 1 && addArcs > 0, '和音逐音连音线落地：' + tieSongs + ' 首带附加音连音线，五线谱画出附加音连音弧 ' + addArcs + ' 条', J({ tieSongs, addArcs }));
  T('E', !pageErrs.length, '页面脚本错误 0', J(pageErrs.slice(0, 5)));
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})();
