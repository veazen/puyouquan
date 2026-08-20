// tv_keytab —— v60.14 A1：调内级数表的「外部交叉校验」
// 用第三方 MIT 音乐理论库 tonal（仅测试期依赖，不进产品单文件）当预言机(oracle)，
// 逐调核对 CHORD_CANDS / CHORD_CANDS_MIN 生成的和弦名是否与自然/和声小调、大调的调内三和弦一致。
// 判定分两档：
//   ① 音高类 + 和弦性质：12 个调全部必须一致（这是「配得对不对」的实质断言）；
//   ② 字面拼写：|调号升降数| ≤ 5 的 10 个调必须逐字一致；C#(7♯)/F#(6♯) 例外——
//      本项目 PC_SHARP 表不写 B#/E#（全局拼写策略，非本次改动引入），故这两调只走 ① 档。
// 另含 MIN_TW 转移偏好表的 id 完整性检查（防手误写出永不命中的键）。
const { chromium } = require('playwright');
const { Key, Note } = require('tonal');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

const split = n => { const m = /^([A-G][#b]?)(.*)$/.exec(n || ''); return m ? { root: m[1], q: m[2] } : { root: '', q: n }; };
const same = (a, b) => { const x = split(a), y = split(b); return Note.chroma(x.root) === Note.chroma(y.root) && x.q === y.q; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(700);
  let pass = 0;

  const dump = await pg.evaluate(`(()=>{
    const pick=(arr,id)=>{ const c=arr.find(x=>x.id===id); return c? null : null; };
    const nameOf=(arr,id,key)=>{ const c=arr.find(x=>x.id===id); return c? chordCandName(c,key) : '(缺'+id+')'; };
    const out={ keys:KEY_LIST.slice(), keysig:{}, minor:{}, major:{} };
    KEY_LIST.forEach(k=>{
      out.keysig[k]=KEYSIG[k]==null?null:KEYSIG[k];
      out.minor[k]=['i','ii0','III','iv','v','VI','VII','V','V7'].map(id=>nameOf(CHORD_CANDS_MIN,id,k));
      out.major[k]=['I','ii','iii','IV','V','vi','V7'].map(id=>nameOf(CHORD_CANDS,id,k));
    });
    const ids=new Set(CHORD_CANDS_MIN.map(c=>c.id));
    out.badTW=Object.keys(MIN_TW).filter(p=>{ const [a,c]=p.split('>'); return !ids.has(a)||!ids.has(c); });
    out.nMin=CHORD_CANDS_MIN.length;
    return out;
  })()`);

  // 参照：tonal 的关系小调（写作调号的第 6 级）
  const relMinor = k => Key.majorKey(k).minorRelative;

  // T1 小调自然音级：i ii° III iv v VI VII 对齐 tonal natural.triads
  let bad1 = [], badSpell1 = [];
  dump.keys.forEach(k => {
    const rm = relMinor(k), t = Key.minorKey(rm).natural.triads;   // [i, ii°, III, iv, v, VI, VII]
    const ours = dump.minor[k];
    for (let i = 0; i < 7; i++) {
      if (!same(ours[i], t[i])) bad1.push(k + ':' + ours[i] + '≠' + t[i]);
      else if (ours[i] !== t[i]) badSpell1.push(k + ':' + ours[i] + '/' + t[i]);
    }
  });
  const strictKeys = k => Math.abs(dump.keysig[k] || 0) <= 5;
  const spellFail1 = badSpell1.filter(s => strictKeys(s.split(':')[0]));
  const ok1 = bad1.length === 0 && spellFail1.length === 0;
  console.log((ok1 ? '✅' : '❌') + ' T1 小调自然音级 vs tonal: 12调×7级 实质不符=' + bad1.length + (bad1.length ? '(' + bad1.slice(0, 6).join(' ') + ')' : '')
    + ' 严格调拼写不符=' + spellFail1.length + (spellFail1.length ? '(' + spellFail1.join(' ') + ')' : '')
    + ' 宽松调拼写差异=' + badSpell1.filter(s => !strictKeys(s.split(':')[0])).length + '(C#/F# 已知简化)');
  if (ok1) pass++;

  // T2 和声小调属和弦：V / V7 对齐 tonal harmonic.triads[4] / harmonic.chords[4]
  let bad2 = [];
  dump.keys.forEach(k => {
    const h = Key.minorKey(relMinor(k)).harmonic;
    const V = h.triads[4], V7 = h.chords[4];
    if (!same(dump.minor[k][7], V)) bad2.push(k + ':V ' + dump.minor[k][7] + '≠' + V);
    if (!same(dump.minor[k][8], V7)) bad2.push(k + ':V7 ' + dump.minor[k][8] + '≠' + V7);
  });
  const ok2 = bad2.length === 0;
  console.log((ok2 ? '✅' : '❌') + ' T2 和声小调属和弦 vs tonal: 12调×2 不符=' + bad2.length + (bad2.length ? '(' + bad2.slice(0, 6).join(' ') + ')' : '')
    + '  例：1=C → ' + dump.minor.C[7] + ' / ' + dump.minor.C[8]);
  if (ok2) pass++;

  // T3 大调候选（既有 v44.9 表）同样过一遍 oracle，确保本次改动没动到大调
  let bad3 = [], badSpell3 = [];
  dump.keys.forEach(k => {
    const mk = Key.majorKey(k), t = mk.triads;                     // [I, ii, iii, IV, V, vi, vii°]
    const ref = [t[0], t[1], t[2], t[3], t[4], t[5], mk.chords[4]]; // 末位 V7
    dump.major[k].forEach((n, i) => {
      if (!same(n, ref[i])) bad3.push(k + ':' + n + '≠' + ref[i]);
      else if (n !== ref[i]) badSpell3.push(k + ':' + n + '/' + ref[i]);
    });
  });
  const spellFail3 = badSpell3.filter(s => strictKeys(s.split(':')[0]));
  const ok3 = bad3.length === 0 && spellFail3.length === 0;
  console.log((ok3 ? '✅' : '❌') + ' T3 大调候选 vs tonal: 12调×7 实质不符=' + bad3.length + (bad3.length ? '(' + bad3.slice(0, 6).join(' ') + ')' : '')
    + ' 严格调拼写不符=' + spellFail3.length + (spellFail3.length ? '(' + spellFail3.join(' ') + ')' : ''));
  if (ok3) pass++;

  // T4 MIN_TW 键名完整性 + 候选表规模
  const ok4 = dump.badTW.length === 0 && dump.nMin === 9;
  console.log((ok4 ? '✅' : '❌') + ' T4 转移表完整性: MIN_TW 悬空键=' + dump.badTW.length + (dump.badTW.length ? '(' + dump.badTW.join(' ') + ')' : '') + ' 小调候选数=' + dump.nMin + '/9');
  if (ok4) pass++;

  console.log('PASS ' + pass + '/4');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === 4 && !errs.length ? 0 : 1);
})();
