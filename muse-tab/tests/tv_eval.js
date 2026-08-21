// tv_eval —— A7 配和弦评测集（首批）
// ⚠️ v60.23 起本套件的定位是**调参集**：由开发者编写/挑选，允许看、允许据此调权重与阈值。
//    它报出来的准确率**不能用来判断引擎行不行**（既出题又答题）。判断引擎看 tv_holdout（留出集）：
//    那里的语料是别的目的造出来的，只准看结果、不准据此调参。两套集合必须分开报数。
// 用一组标注了「可接受和弦集合」的曲目跑 suggestChords，产出三项指标并做回归闸：
//   · 级数准确率：产出和弦 ∈ 该小节的可接受集合
//   · 功能准确率：产出和弦的 T/S/D 与集合中任一答案一致（配成 vi 而答案是 I → 级数错、功能对，听感可接受）
//   · 套路命中率：被 A8 模板层覆盖的小节占比（**单独统计**，不计入闸门——否则会为命中率牺牲准确率）
// 大调 / 小调分开统计：大调涨分不得掩盖小调仍然错（第八节 A7 的原始要求）。
//
// 闸门说明：BASE_* 是**当前行为的地板**，不是「专业水准认证」。语料由本项目自行标注、
// 且小调项全部是自制片段（见 fixtures/eval-songs.json 的 gap 字段），
// 所以它挡的是「改坏了」，不能拿来宣称「配得准」。改进后请上调 BASE_*。
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/eval-songs.json'), 'utf8'));

// 地板紧贴当前成绩：80 小节里 1 小节 = 1.25%，留 0.5% 余量 ⇒ **错一小节就红**。
// 起初留了 1.5% 余量，变异实测发现「抽掉终止式修复」只掉到 96.3%，照样绿——余量放大就等于没有闸门。
// 改进后请连同 BASE_* 一起上调（这是有意的：每次调地板都是一次显式决定）。
const BASE_DEG = 0.98;   // 当前 98.8%（79/80，再错一小节即红）
const BASE_FN  = 0.98;   // 当前 98.8%
const BASE_MIN = 1.00;   // 当前 100%

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);

  // 注意：这里必须传**真函数**而非字符串——Playwright 对字符串 pageFunction 按表达式求值，第二参数会被忽略
  const res = await pg.evaluate((songs) => {
    const out=[];
    songs.forEach(sg=>{
      const s=createSong('vocal',{nVox:1,lyr:0,beats:sg.beats,unit:sg.unit,key:sg.key,nMea:sg.mel.length});
      sg.mel.forEach((mea,i)=>{
        s.measures[i].voxes[0]=mea.map(n=>{
          const o=n[2]||{};
          return {dur:n[1], dotted:!!o.dotted, deg:n[0], acc:o.acc||'', oct:o.oct||0, lyrics:[]};
        });
      });
      const got=suggestChords(s,0);
      const minor=detectMinorMode(s,0);
      // 名称→功能：用当前调式的候选表反查（表外的名称——如副属和弦——记 '?'）
      const CAND = minor? CHORD_CANDS_MIN : CHORD_CANDS;
      const fnMap={}; CAND.forEach(c=>{ fnMap[chordCandName(c, sg.key)]=c.fn; });
      const marks=PROG_LAST.marks.slice();
      let covered=0; marks.forEach(m=>{ covered+=(m.b-m.a+1); });
      // 终止式结构量：末音是否收主音、末小节是否配主和弦（不看百分比，直接看不变量）
      const ec=s.measures[s.measures.length-1].voxes[0]||[];
      let endDeg=0; for(let i=ec.length-1;i>=0;i--){ if(ec[i].deg && !ec[i].acc){ endDeg=ec[i].deg; break; } }
      const tonicName=chordCandName(CAND.find(c=>c.id===(minor?'i':'I')), sg.key);
      out.push({ id:sg.id, minorDetected:minor, got, fnGot:got.map(n=>fnMap[n]||'?'),
                 fnRef:sg.ref.map(set=>set.map(n=>fnMap[n]||'?')),
                 covered, marks:marks.map(m=>m.name),
                 endsOnTonic: endDeg===(minor?6:1), lastChord:got[got.length-1], tonicName });
    });
    return out;
  }, DATA.songs);

  const buckets = {};
  const rows = [];
  let pass = 0, fail = 0;
  res.forEach((r, i) => {
    const sg = DATA.songs[i];
    const n = sg.ref.length;
    let deg = 0, fn = 0; const wrong = [];
    for (let m = 0; m < n; m++) {
      const got = r.got[m], set = sg.ref[m];
      const okDeg = set.indexOf(got) >= 0;
      const okFn = okDeg || (r.fnGot[m] !== '?' && r.fnRef[m].indexOf(r.fnGot[m]) >= 0);
      if (okDeg) deg++; else wrong.push((m + 1) + '小节 ' + got + '≠' + set.join('/') + (okFn ? '(功能对)' : ''));
      if (okFn) fn++;
    }
    const bk = buckets[sg.bucket] || (buckets[sg.bucket] = { songs: 0, mea: 0, deg: 0, fn: 0, cov: 0 });
    bk.songs++; bk.mea += n; bk.deg += deg; bk.fn += fn; bk.cov += r.covered;
    rows.push({ title: sg.title, mode: sg.mode, modeOK: (sg.mode === 'minor') === r.minorDetected,
                n, deg, fn, cov: r.covered, marks: [...new Set(r.marks)].join('/'), wrong,
                cadOK: !r.endsOnTonic || r.lastChord === r.tonicName,
                cadWhy: r.endsOnTonic ? (r.lastChord + (r.lastChord === r.tonicName ? '' : '≠' + r.tonicName)) : '末音非主音·不适用' });
  });

  console.log('曲目                        调式判别  小节   级数     功能    套路命中');
  rows.forEach(r => {
    const pad = (s, w) => { let t = String(s); let vis = 0; for (const ch of t) vis += /[一-龥·（）]/.test(ch) ? 2 : 1; return t + ' '.repeat(Math.max(1, w - vis)); };
    console.log(pad(r.title, 28) + pad(r.modeOK ? '✓' : '✗ 判错', 10) + pad(r.n, 6)
      + pad(r.deg + '/' + r.n, 9) + pad(r.fn + '/' + r.n, 8) + (r.cov ? (r.cov + '/' + r.n + ' ' + r.marks) : '—'));
    r.wrong.forEach(w => console.log('      · ' + w));
  });

  const sum = { mea: 0, deg: 0, fn: 0, cov: 0 };
  console.log('\n分桶：');
  Object.keys(buckets).forEach(k => {
    const b2 = buckets[k];
    sum.mea += b2.mea; sum.deg += b2.deg; sum.fn += b2.fn; sum.cov += b2.cov;
    console.log('  ' + k + '  ' + b2.songs + ' 首 / ' + b2.mea + ' 小节  级数 ' + (100 * b2.deg / b2.mea).toFixed(1)
      + '%  功能 ' + (100 * b2.fn / b2.mea).toFixed(1) + '%  套路 ' + (100 * b2.cov / b2.mea).toFixed(1) + '%');
  });
  const degR = sum.deg / sum.mea, fnR = sum.fn / sum.mea;
  const mb = buckets['minor-made'] || { deg: 0, mea: 1 };
  const minR = mb.deg / mb.mea;
  console.log('  合计  ' + DATA.songs.length + ' 首 / ' + sum.mea + ' 小节  级数 ' + (100 * degR).toFixed(1)
    + '%  功能 ' + (100 * fnR).toFixed(1) + '%  套路 ' + (100 * sum.cov / sum.mea).toFixed(1) + '%\n');

  const chk = (name, val, base) => {
    const ok = val >= base - 1e-9;
    console.log((ok ? '✅' : '❌') + ' ' + name + '=' + (100 * val).toFixed(1) + '% (地板 ' + (100 * base).toFixed(1) + '%)');
    if (ok) pass++; else fail++;
  };
  chk('级数准确率', degR, BASE_DEG);
  chk('功能准确率', fnR, BASE_FN);
  chk('小调级数准确率', minR, BASE_MIN);
  const modeAllOK = rows.every(r => r.modeOK);
  console.log((modeAllOK ? '✅' : '❌') + ' 大小调判别全对=' + modeAllOK);
  modeAllOK ? pass++ : fail++;
  // 结构性不变量：凡旋律收在主音上的曲目，末小节必须配主和弦。
  // 这条比百分比稳——它直接钉住两处终止式修复（复用越过终止式 / 自由路径不认终止式），
  // 而百分比在 80 小节的语料上对单小节回退不敏感。
  const cadBad = rows.filter(r => !r.cadOK);
  console.log((cadBad.length ? '❌' : '✅') + ' 终止式（末音收主音⇒末小节配主和弦）: '
    + (rows.length - cadBad.length) + '/' + rows.length + ' 适用曲目全对'
    + (cadBad.length ? ' 违例=' + cadBad.map(r => r.title + ' ' + r.cadWhy).join('；') : ''));
  cadBad.length ? fail++ : pass++;

  console.log('\nPASS ' + pass + '/5');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(!fail && !errs.length ? 0 : 1);
})();
