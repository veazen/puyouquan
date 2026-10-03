/* v64.4 B4e 声部分组与谱类判定（2026-10 评审团 §6.3 B4e：P1-17）
   T1 SATB 五线谱只出现合唱方括号，不再给 T、B 加钢琴花括号
   T2 二声部合唱（高音+低音谱表、有歌词）判为歌谱 vocal；无歌词仍是钢琴独奏谱；显式方括号分组/钢琴弹唱照旧
   T3 服务端 docTypeOf 与编辑器 docType 对同一批谱给出相同谱类（二声部合唱两端都是 vocal）
   T4 小节线：钢琴花括号组贯穿上下谱表，合唱方括号组各谱表各画一段
   突变实证：对 v64.4 之前的文件复跑，T1–T4 全部报红（0/4）。 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const API = process.env.MUSETAB_API || path.resolve(__dirname, '../../api/server.js');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad();
    window.mk=(nts, lyr, extra)=>{ const s=createSong('vocal',{title:'合唱',key:'C',beats:4,unit:4,nMea:2,nVox:nts.length,lyr:1});
      s.voxNotations=nts.slice(); s.measures.forEach(m=>m.voxes.forEach(cols=>cols.forEach((c,i)=>{ c.deg=[1,3,5,1][i%4]; c.lyrics=[lyr? '啊' : '']; })));
      delete s.voxGroups; return Object.assign(s, extra||{}); };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ loadSong(mk(['staff','staff','staff','bass'], true)); render(); const svg=document.getElementById('score');
    const br=[...svg.querySelectorAll('path')].filter(p=>p.getAttribute('d')===SMUFL.brace.d).length;
    const bk=svg.querySelectorAll('[data-grp="bracket"]').length; return {br, bk, rows:layoutSystems().length}; })()`);
  T(!r.err && r.br === 0 && r.bk >= 1 && r.bk === r.rows, 'T1 SATB 五线谱只有合唱方括号', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>({ choir2:docType(mk(['staff','bass'], true)), piano:docType(mk(['staff','bass'], false)),
    explicit:docType(mk(['staff','bass'], false, {voxGroups:[{type:'bracket',from:0,to:1}]})), pacc:docType(mk(['staff','bass'], true, {pianoAcc:true})),
    satb:docType(mk(['staff','staff','staff','bass'], true)), quartet:docType(mk(['staff','staff','alto','bass'], false)), jp:docType(mk(['jp','jp'], true)) }))()`);
  T(!r.err && r.choir2 === 'vocal' && r.piano === 'piano' && r.explicit === 'vocal' && r.pacc === 'pianoacc' && r.satb === 'vocal' && r.quartet === 'instr' && r.jp === 'vocal',
    'T2 二声部合唱判 vocal；无歌词仍钢琴；显式分组/钢琴弹唱/器乐四重奏照旧', JSON.stringify(r));

  /* T3 */
  {
    const src = fs.readFileSync(API, 'utf8');
    let srvOf = null;
    try {
      const i0 = src.indexOf('function isChoirOf(d)') >= 0 ? src.indexOf('function isChoirOf(d)') : src.indexOf('function docTypeOf(d)');
      const i1 = src.indexOf('function coverOf(d)');
      srvOf = new Function(src.slice(i0, i1) + '; return docTypeOf;')();
    } catch (e) { srvOf = null; }
    const songs = await EV(`[mk(['staff','bass'], true), mk(['staff','bass'], false), mk(['staff','staff','staff','bass'], true), mk(['staff','bass'], false, {voxGroups:[{type:'bracket',from:0,to:1}]}),
      mk(['staff','staff','alto','bass'], false), mk(['jp'], true), mk(['staff','bass'], true, {pianoAcc:true})].map(s=>({s:JSON.parse(JSON.stringify(s)), c:docType(s)}))`);
    const bad = Array.isArray(songs) && srvOf ? songs.filter(x => srvOf(x.s) !== x.c).map(x => x.c + '≠' + srvOf(x.s)) : ['no-server-fn'];
    const srvChoir = srvOf && Array.isArray(songs) ? srvOf(songs[0].s) : null;
    T(bad.length === 0 && srvChoir === 'vocal', 'T3 服务端与编辑器谱类判定一致（服务端同样把二声部合唱判 vocal）', JSON.stringify({ bad, srvChoir }));
  }

  /* T4 */
  r = await EV(`(()=>{ const span=(s)=>{ loadSong(s); render(); const svg=document.getElementById('score');
      return [...svg.querySelectorAll('line')].filter(l=>+l.getAttribute('stroke-width')===1 && Math.abs(+l.getAttribute('x1')-+l.getAttribute('x2'))<0.01
        && Math.abs(+l.getAttribute('y2')-+l.getAttribute('y1'))>45 && +l.getAttribute('x1')>MARGIN+STAFF_HEAD_W+5).length; };
    return {piano:span(mk(['staff','bass'], false)), choir:span(mk(['staff','staff','staff','bass'], true))}; })()`);
  T(!r.err && r.piano > 0 && r.choir === 0, 'T4 钢琴组小节线贯穿、合唱组各谱表分段', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
