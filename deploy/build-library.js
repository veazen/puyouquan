#!/usr/bin/env node
'use strict';
/* v69.3 曲库官方公版谱构建：deploy/library/manifest.json 里每首 MusicXML → 用编辑器自己的 importMusicXML（无头 Chromium）转成谱友圈谱面数据，
   过质量门后写 api/seed-library.json（服务端启动时 seedLibrary() 按 id 补种，见 api/db.js）。
   质量门（任一不过整个构建失败，不写文件）：
     ① 音高：源文件与「导入 → 再导出」逐小节比音高多重集（不含倚音），一个小节都不能差
     ② 时值：beatErrors() 为 0（不完整小节由导入标记 irr 豁免）
     ③ 不丢：skip.parts / voices / notes 都为 0（同谱表第二声部、超过 4 音的和弦、超出的声部都会计数）
   用法：node deploy/build-library.js          生成 api/seed-library.json
         node deploy/build-library.js --check  只校验：重新构建的结果与已提交的 api/seed-library.json 逐字节相同（tv_library 用）
   env：CHROMIUM_PATH（同测试） */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MAN = path.join(__dirname, 'library', 'manifest.json');
const OUT = path.join(ROOT, 'api', 'seed-library.json');
const MAKER = '谱友圈官方 · 据 OpenScore 公版录入（CC0）';

async function build() {
  const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const out = [], bad = [];
  try {
    for (const it of man.items) {
      const xml = fs.readFileSync(path.join(__dirname, 'library', it.file), 'utf8');
      const pg = await b.newPage();   /* 每首一个新页面：同一页面里连续 loadSong 会串味（PROJECT.md 测试坑） */
      await pg.goto('file://' + path.join(ROOT, 'muse-tab', 'index.html') + '?shell=classic');
      await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function');
      const r = await pg.evaluate(x => {
        const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const per = xs => { const d = new DOMParser().parseFromString(xs, 'application/xml'), M = [];
          d.querySelectorAll('part').forEach(p => [...p.querySelectorAll(':scope > measure')].forEach((m, i) => { M[i] = M[i] || [];
            m.querySelectorAll('note').forEach(n => { if (n.querySelector('grace') || !n.querySelector('pitch')) return;
              M[i].push((+n.querySelector('pitch octave').textContent + 1) * 12 + PC[n.querySelector('pitch step').textContent] + +((n.querySelector('pitch alter') || {}).textContent || 0)); }); }));
          return M.map(a => a.sort((p, q) => p - q).join(',')); };
        const im = importMusicXML(x); if (!im || im.error) return { err: (im && im.error) || '导入失败' };
        loadSong(im.song);
        const A = per(x), B = per(exportMusicXML(song)); let pd = 0;
        for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i] || '') !== (B[i] || '')) pd++;
        return { song: im.song, pitchDiff: pd, beatErr: beatErrors().length, skip: im.skip };
      }, xml);
      await pg.close();
      if (r.err) { bad.push(it.id + ' 导入失败：' + r.err); continue; }
      const sk = r.skip || {}, lost = (sk.parts | 0) + (sk.voices | 0) + (sk.notes | 0);
      if (r.pitchDiff || r.beatErr || lost) { bad.push(`${it.id}（${it.title}）未过质量门：音高不同小节 ${r.pitchDiff} · 时值不符 ${r.beatErr} · 丢弃 ${lost}`); continue; }
      const data = Object.assign(r.song, { title: it.title, composer: it.composer, lyricist: it.lyricist, maker: MAKER });
      out.push({ id: it.id, title: it.title, singer: it.composer, data, source: it.source });
    }
  } finally { await b.close(); }
  return { out, bad };
}

(async () => {
  const check = process.argv.includes('--check');
  const { out, bad } = await build();
  if (bad.length) { console.error('❌ 质量门未过：\n  ' + bad.join('\n  ')); process.exit(1); }
  const txt = JSON.stringify(out) + '\n';
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== txt) { console.error('❌ api/seed-library.json 与重新构建的结果不同——导入器改了？跑 node deploy/build-library.js 重新生成并提交'); process.exit(1); }
    console.log('✅ 曲库 ' + out.length + ' 首：质量门全过，api/seed-library.json 与重新构建逐字节相同'); return;
  }
  fs.writeFileSync(OUT, txt);
  console.log('✅ 写入 api/seed-library.json：' + out.length + ' 首（' + Math.round(txt.length / 1024) + ' KB）');
})();
