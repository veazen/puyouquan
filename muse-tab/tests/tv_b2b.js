/* v64.9 B2b 真调号（2026-10 评审团 §6.3 B2b：P1-10 余项；D-10）
   T1 keyTo 小节前的间隙里画新调号（升号在该小节起点之前），该小节的调内音（1=G 的 7＝F♯）不再写临时记号；纯五线谱不再重复标「转1=G」
   T2 播放 / 五线谱 / MusicXML 三处音高一致：1=G 的 1＝G3（55），MusicXML 该音 G3 无 alter、7 写成 F+alter 1，往返后 keyTo 与级数不变
   T3 换行处：上一行行末补提示调号（升号在末小节线之后、谱线延到它之后），下一行行首按新调号画
   T4 标注式退回（mea.keyToSig='text'）：调号不换、7 在音符上写 ♯、保留「转1=G」、MusicXML 不写第二个 <key> 但 F 带 alter
   T5 回到 C：先写还原号（keyTo 小节前 1 个 ♮、0 个 ♯），行首仍是 G 的调号
   T6 转调菜单：有五线谱行时提供「真调号 / 标注式」切换，简谱歌谱不显示
   突变实证：对 v64.9 之前的文件复跑，T1–T6 全部报红（0/6）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); blurSel=true;
    window.V=(d,u,o)=>Object.assign({dur:u,dotted:false,deg:d,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.mk=(key,nMea)=>{ const s=createSong('instr',{title:'真调号',key:key||'C',beats:4,unit:4,nMea:nMea||4,nVox:1,lyr:0});
      s.measures.forEach(m=>{ m.voxes[0]=[V(1,4),V(2,4),V(3,4),V(5,4)]; }); return s; };
    window.gl=(name)=>[...document.getElementById('score').querySelectorAll('path')].filter(p=>p.getAttribute('d')===SMUFL[name].d).map(p=>{ const m=/translate\\(([\\d.-]+),([\\d.-]+)\\)/.exec(p.getAttribute('transform')||''); return {x:+m[1], y:+m[2], r:p.getBoundingClientRect()}; });
    window.sysX=()=>{ const S=layoutSystems(); const ox=MARGIN+STAFF_HEAD_W; return S.map(sys=>({w:sys.w, ksEnd:sys.ksEnd||0, m:sys.measures.map(lm=>({mi:lm.mi, mx:ox+lm.x, bx:ox+lm.x+lm.L.w, nx0:ox+lm.x+lm.L.voxes[0].xs[0], kb:lm.ksBefore||0}))})); };
    window.label=()=>[...document.getElementById('score').querySelectorAll('text')].some(t=>/^转1=/.test(t.textContent));
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ const s=mk('C'); s.measures[1].keyTo='G'; s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(7,4)]; loadSong(s); render();
    const X=sysX()[0].m[1]; const sh=gl('accidentalSharp'); const inGap=sh.filter(g=>g.x<X.mx && g.x>sysX()[0].m[0].bx).length, atNote=sh.filter(g=>g.x>=X.mx).length;
    return {n:sh.length, inGap, atNote, kb:X.kb, lbl:label()}; })()`);
  T(!r.err && r.n === 1 && r.inGap === 1 && r.atNote === 0 && r.kb > 0 && !r.lbl, 'T1 keyTo 小节前画新调号、调内音不写临时记号、纯五线谱不重复标注', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ const s=mk('C'); s.measures[1].keyTo='G'; s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(7,4)]; loadSong(s); render();
    const midi=voxMidi(song.measures[1].voxes[0][0],1); const K=staffKeyInfoAt(1); const xml=exportMusicXML(song);
    const m2=(xml.split('<measure number="2"')[1]||'').split('</measure>')[0];
    const g3=/<step>G<\\/step><octave>3<\\/octave>/.test(m2), fs=/<step>F<\\/step><alter>1<\\/alter><octave>4<\\/octave>/.test(m2), keyN=(xml.match(/<fifths>1<\\/fifths>/g)||[]).length;
    const res=importMusicXML(xml); const rt=res.song && res.song.measures[1].keyTo==='G' && res.song.measures[1].voxes[0].map(c=>c.deg+(c.acc||'')).join(' ')==='1 2 3 7';
    return {midi, step0:K.step0, tonic:K.tonic, g3, fs, keyN, rt}; })()`);
  T(!r.err && r.midi === 55 && r.step0 === 32 && r.g3 && r.fs && r.keyN === 1 && r.rt, 'T2 播放 / 五线谱 / MusicXML 音高一致，往返不变', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ const s=mk('C',6); s.measures[2].brk=1; s.measures[3].keyTo='G'; loadSong(s); render();
    const S=sysX(); if(S.length<2) return {rows:S.length};
    const r0=S[0], last=r0.m[r0.m.length-1]; const sh=gl('accidentalSharp');
    const cour=sh.filter(g=>g.x>last.bx && g.x<MARGIN+STAFF_HEAD_W+r0.w+2).length;
    const head2=sh.filter(g=>g.x<MARGIN+STAFF_HEAD_W && g.r.top>sh.length? true : g.x<MARGIN+STAFF_HEAD_W).length;
    const lines=[...document.getElementById('score').querySelectorAll('line[stroke-width="0.8"]')].map(l=>+l.getAttribute('x2'));
    return {rows:S.length, ksEnd:r0.ksEnd, cour, head2, n:sh.length, lineEnd:Math.max(...lines), courX:sh.filter(g=>g.x>last.bx).map(g=>Math.round(g.x))}; })()`);
  T(!r.err && r.rows >= 2 && r.ksEnd > 0 && r.cour === 1 && r.head2 === 1 && r.n === 2 && r.lineEnd >= r.courX[0] + 6, 'T3 换行处上一行行末补提示调号，下一行行首按新调号', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const s=mk('C'); s.measures[1].keyTo='G'; s.measures[1].keyToSig='text'; s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(7,4)]; loadSong(s); render();
    const X=sysX()[0].m[1]; const sh=gl('accidentalSharp'); const xml=exportMusicXML(song);
    return {n:sh.length, atNote:sh.filter(g=>g.x>=X.mx).length, kb:X.kb, lbl:label(), keys:(xml.match(/<key>/g)||[]).length, fs:/<step>F<\\/step><alter>1<\\/alter>/.test(xml), midi:voxMidi(song.measures[1].voxes[0][0],1)}; })()`);
  T(!r.err && r.n === 1 && r.atNote === 1 && r.kb === 0 && r.lbl && r.keys === 1 && r.fs && r.midi === 55, 'T4 标注式退回：调号不换、音符写 ♯、保留转1=G、MusicXML 单 key 带 alter', JSON.stringify(r));

  /* T5 */
  r = await EV(`(()=>{ const s=mk('G'); s.measures[1].keyTo='C'; loadSong(s); render();
    const X=sysX()[0].m[1]; const nat=gl('accidentalNatural'), sh=gl('accidentalSharp');
    return {natGap:nat.filter(g=>g.x<X.mx && g.x>sysX()[0].m[0].bx).length, shGap:sh.filter(g=>g.x<X.mx && g.x>sysX()[0].m[0].bx).length, shHead:sh.filter(g=>g.x<MARGIN+STAFF_HEAD_W).length, kb:X.kb}; })()`);
  T(!r.err && r.natGap === 1 && r.shGap === 0 && r.shHead === 1 && r.kb > 0, 'T5 回到 C 先写还原号，行首仍是 G 调号', JSON.stringify(r));


  /* T6 转调菜单：有五线谱行时提供「真调号 / 标注式」切换，点「标注式」写入 keyToSig='text' 并立即重排（间隙消失） */
  r = await EV(`(()=>{ const s=mk('C'); s.measures[1].keyTo='G'; loadSong(s); sel={mi:1,row:'vox',vi:0,ci:0,si:1}; render();
    showKeyToMenu(); const bt=document.querySelector('#popmenu [data-kts="text"]'); const has=!!bt; if(bt) bt.click(); const kb=sysX()[0].m[1].kb; closePop();
    const v=createSong('vocal',{title:'简谱',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0}); loadSong(v); sel={mi:1,row:'vox',vi:0,ci:0,si:1}; showKeyToMenu(); const jp=!!document.querySelector('#popmenu [data-kts]'); closePop();
    return {has, kts:song.measures[1]&&song.measures[1].keyToSig, kb, jp}; })()`);
  T(!r.err && r.has && r.kb === 0 && !r.jp, 'T6 转调菜单真调号/标注式切换（简谱歌谱不显示）', JSON.stringify(r));
  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
