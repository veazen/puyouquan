// tv_holdout —— 配和弦引擎的**留出集**（v60.23 阶段 0：验证装置）
//
// 为什么要有这个套件：
//   tv_eval 的 9 首曲子是我（开发者）为调引擎而编写/挑选的，既出题又答题，报出来的 98.8%
//   不能用来判断引擎行不行。本套件改用**别的目的造出来的语料**：产品内置预设曲谱
//   （当初为各谱类设计，与配和弦引擎无关），把其中的人工和弦清掉让引擎盲配，再逐小节比对。
//   首测实测：逐字一致 15/20 = 75%，与 tv_eval 的 98.8% 差 24 个百分点。
//
// 铁律（写在这里，别忘）：
//   **留出集只准看结果，不准据此调参。**
//   一旦拿它去调权重/阈值，它就退化成第二个自选集，我们又回到自己给自己打分。
//   → 留出集的失败只能通过「补能力」修（补转位、补副属、补前提检测），
//     不能通过「调权重/调阈值」修；调权重只在 tv_eval 上做，然后到这里来**验**。
//   → 因此本套件设「不得下降」门禁（对比 fixtures/holdout-baseline.json），
//     **不设绝对值门禁**——设了绝对值，我就会去迎合那个数字。
//
// 样本如何入选：**自动发现，不是我手挑**——凡是内置预设里「有旋律 且 有人工和弦」的都进。
//   这一条很重要：手挑就等于又一次由我出题。新增预设若带和弦会自动进入留出集，
//   基线随之变化（那次的基线更新必须在 diff 里看得见）。
//
// 指标分五层，**禁止只看总分**（v60.x 教训：欢乐颂修好的同时两只老虎坏了，总分不动）：
//   ① 逐字一致  gold === got                      —— 含转位与性质，最严
//   ② 和弦一致  去掉 /低音 后相同                  —— 转位差异不算错
//   ③ 级数一致  根音音级相同                       —— 性质差异（C vs Cmaj7 vs C7）不算错
//   ④ 功能一致  根音级数映射到 T/S/D 后相同         —— 调外根音归 D（离调属功能）
//   ⑤ 可接受集  留出集没有可接受集合（人工和弦是单一答案），本层**不适用**，如实标注为 n/a，
//              不伪造一个数字充数；该层只在 tv_eval 上有效。
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const BASE_F = path.resolve(__dirname, 'fixtures/holdout-baseline.json');

/* 根音音级：和弦名 → 0..11。功能：以调主音为基准的半音差 → T/S/D。
   大调 0(I)/9(vi)/4(iii)=T，5(IV)/2(ii)=S，7(V)/11(vii)=D；其余（调外根音）归 D——
   调外根音在流行和声里几乎总是副属/借用属功能，归 D 比归「未知」更有信息量。
   小调（主音在平行大调的 6 上）：0(i)/3(III)=T，5(iv)/2(ii°)=S，7(v/V)/10(VII)=D，8(VI)=S。 */
const PC = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
const FN_MAJ = { 0:'T', 9:'T', 4:'T', 5:'S', 2:'S', 7:'D', 11:'D' };
const FN_MIN = { 0:'T', 3:'T', 5:'S', 2:'S', 8:'S', 7:'D', 10:'D' };
const rootPc = s => { const m = /^([A-G](?:#|b)?)/.exec(String(s || '')); return m ? PC[m[1]] : null; };
const noSlash = s => String(s || '').split('/')[0];
const fnOf = (name, keyPc, minor) => {
  const r = rootPc(name); if (r == null || keyPc == null) return '?';
  const rel = ((r - keyPc) % 12 + 12) % 12;
  return (minor ? FN_MIN : FN_MAJ)[rel] || 'D';
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);

  const data = await pg.evaluate(() => {
    const res = [];
    PRESETS.forEach(p => {
      let s; try { s = p.make(); } catch (e) { return; }
      if (!s || !s.voxVoices || !s.voxVoices.length) return;
      const vi = 0;
      const gold = [], hasMel = [];
      s.measures.forEach(m => {
        hasMel.push((m.voxes[vi] || []).some(c => c.deg));
        let g = null;
        (m.voxes || []).forEach(cs => (cs || []).forEach(c => { if (c.chord && g == null) g = c.chord; }));
        gold.push(g);
      });
      if (!gold.some(x => x) || !hasMel.some(x => x)) return;   // 无人工和弦 或 无旋律 → 不是本套件能评的样本
      const s2 = JSON.parse(JSON.stringify(s));                 // 清掉人工和弦再配，否则不是盲测
      s2.measures.forEach(m => (m.voxes || []).forEach(cs => (cs || []).forEach(c => { delete c.chord; })));
      const o = song; song = s2;
      let got, minor;
      try { got = suggestChords(s2, vi); minor = chordSolve(s2, vi).minor; } finally { song = o; }
      const rows = [];
      for (let mi = 0; mi < s.measures.length; mi++) {
        if (!gold[mi] || !hasMel[mi]) continue;
        rows.push({ mi: mi + 1, gold: gold[mi], got: got[mi] || '-' });
      }
      res.push({ name: p.name, key: s.key, minor: !!minor, rows });
    });
    return res;
  });

  if (!data.length) { console.log('❌ 留出集为空——预设里找不到「有旋律且有人工和弦」的样本'); await b.close(); process.exit(1); }

  const L = { exact: 0, chord: 0, deg: 0, fn: 0, n: 0 };
  const miss = [];
  data.forEach(s => {
    const kp = PC[s.key] != null ? PC[s.key] : rootPc(s.key);
    s.rows.forEach(r => {
      L.n++;
      const eq = r.gold === r.got;
      const eqC = noSlash(r.gold) === noSlash(r.got);
      const eqD = rootPc(r.gold) === rootPc(r.got);
      const eqF = fnOf(r.gold, kp, s.minor) === fnOf(r.got, kp, s.minor);
      if (eq) L.exact++;
      if (eqC) L.chord++;
      if (eqD) L.deg++;
      if (eqF) L.fn++;
      if (!eq) miss.push({ song: s.name, mi: r.mi, gold: r.gold, got: r.got,
        kind: eqC ? '仅转位不同' : eqD ? '仅性质不同' : eqF ? '功能相同但和弦不同' : '功能也不同' });
    });
  });

  const pct = k => (100 * L[k] / L.n).toFixed(1);
  console.log('留出集：' + data.length + ' 首 / ' + L.n + ' 个可比小节（样本自动发现，非手挑）');
  data.forEach(s => {
    const ok = s.rows.filter(r => r.gold === r.got).length;
    console.log('  【' + s.name + '】1=' + s.key + (s.minor ? '（判为小调）' : '') + '  逐字 ' + ok + '/' + s.rows.length);
    console.log('     人工 ' + s.rows.map(r => r.gold.padEnd(6)).join(''));
    console.log('     引擎 ' + s.rows.map(r => (r.gold === r.got ? r.got : '*' + r.got).padEnd(6)).join(''));
  });
  console.log('\n分层指标（禁止只看总分）：');
  console.log('  ① 逐字一致（含转位与性质） ' + L.exact + '/' + L.n + ' = ' + pct('exact') + '%');
  console.log('  ② 和弦一致（忽略转位）     ' + L.chord + '/' + L.n + ' = ' + pct('chord') + '%');
  console.log('  ③ 级数一致（忽略性质）     ' + L.deg   + '/' + L.n + ' = ' + pct('deg')   + '%');
  console.log('  ④ 功能一致（T/S/D）        ' + L.fn    + '/' + L.n + ' = ' + pct('fn')    + '%');
  console.log('  ⑤ 可接受集命中             n/a —— 留出集的人工和弦是单一答案，无可接受集合；该层只在 tv_eval 有效');
  if (miss.length) {
    console.log('\n失配逐条（这些只能靠「补能力」修，不许靠调权重修）：');
    miss.forEach(m => console.log('  ' + m.song + ' 第' + m.mi + '小节  人工 ' + m.gold + ' → 引擎 ' + m.got + '  [' + m.kind + ']'));
  }

  /* 门禁：只判「不得下降」，不判绝对值。基线随能力提升由人显式更新，
     更新必须出现在 commit diff 里——否则回退会被悄悄吞掉。 */
  let base = null;
  try { base = JSON.parse(fs.readFileSync(BASE_F, 'utf8')); } catch (e) { /* 首次运行无基线 */ }
  let bad = 0;
  if (!base) {
    console.log('\n⚠️  未找到基线，本次结果将作为初始基线写入 ' + path.relative(process.cwd(), BASE_F));
    fs.writeFileSync(BASE_F, JSON.stringify({ note: '留出集基线：只判不得下降，不判绝对值。更新必须显式提交，便于审计。',
      n: L.n, exact: L.exact, chord: L.chord, deg: L.deg, fn: L.fn }, null, 2) + '\n');
  } else {
    if (L.n < base.n) { console.log('❌ 可比小节数从 ' + base.n + ' 掉到 ' + L.n + '——样本丢失，先查为什么'); bad++; }
    [['exact', '逐字'], ['chord', '和弦'], ['deg', '级数'], ['fn', '功能']].forEach(([k, zh]) => {
      if (L[k] < base[k]) { console.log('❌ ' + zh + '一致从 ' + base[k] + ' 退到 ' + L[k] + '（留出集不得下降）'); bad++; }
    });
    if (!bad) {
      const up = [['exact', '逐字'], ['chord', '和弦'], ['deg', '级数'], ['fn', '功能']]
        .filter(([k]) => L[k] > base[k]).map(([k, zh]) => zh + ' ' + base[k] + '→' + L[k]);
      console.log('\n✅ 不得下降门禁通过' + (up.length ? '；已提升：' + up.join('，') + '（请同步更新基线文件）' : '（与基线持平）'));
    }
  }

  console.log('PASS ' + (bad ? 0 : 1) + '/1');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
