/* v63.5 B2a 调性纯缺陷（2026-10 评审团 §6.3 B2a：P2-01 / P2-12 写法与间距 / P3-06）
   T1 八度折叠规则只有一处（keyRefOf）：源码里「> 66」折叠写法只出现 1 次；语法闸对散写报错（用临时副本注入验证）
   T2 12 个调：keyRef/keyRefAt/MIDI 导出/MusicXML 往返全部与 keyRefOf 同源（do 的音高一致，往返级数不变）
   T3 整小节覆盖粘贴保留目标结构字段：转调 keyTo、排练标记不被抹掉，其后各小节 keyAt 不变、beatErrors 不变
   T4 拍号不一致时先问：「应用源拍号」→ 目标小节改用源拍号且 beatErrors=0；「保留目标拍号」→ 拍号不变；插入粘贴沿用源小节拍号
   T5 页头写 1=♭B / 1=♯C / 1=♯F / 1=♭E；「1=X」与拍号分数线间距 ≥4px；12/8 分数线不短于分子
   T6 新建向导拍号分子含 5、7、9、12，新建 9/8 谱 beatErrors=0
   突变实证：对 v63.5 之前的文件复跑，T1–T6 全部报红（0/6）。 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), cp = require('child_process'), os = require('os');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const F = 'file://' + FILE;
const ROOT = path.resolve(__dirname, '../..');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); undoStack.length=0; })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* ---------- T1 ---------- */
  {
    const src = fs.readFileSync(FILE, 'utf8');
    const n = (src.match(/[A-Za-z_$][\w$]*\s*>\s*66\b/g) || []).length;
    const tmp = path.join(os.tmpdir(), 'b2a-gate-' + process.pid + '.html');
    fs.writeFileSync(tmp, src.replace(/function keyRefOf\(/, 'function bad66(k){ let r2=1; if(r2>66) r2-=12; return r2; }\nfunction keyRefOf('));   // v65.0 B2c 后签名为 keyRefOf(k, ro)
    let gate = 0; try { cp.execFileSync('node', [path.join(ROOT, 'deploy/check-syntax.js'), tmp], { stdio: 'pipe' }); } catch (e) { gate = e.status || 1; }
    fs.unlinkSync(tmp);
    T(n === 1 && gate !== 0, 'T1 八度折叠规则只写一处，散写被语法闸拦截', JSON.stringify({ n, gate }));
  }

  /* ---------- T2 ---------- */
  {
    const r = await EV(`(()=>{ const bad=[];
      KEY_LIST.forEach(k=>{
        const s=createSong('vox',{title:'k',key:k,beats:4,unit:4,nMea:2,nVox:1,lyr:0});
        s.measures[0].voxes[0].forEach((c,i)=>{ c.deg=[1,3,5,1][i]; c.oct=i===3?1:0; });
        s.measures[1].keyTo = KEY_LIST[(KEY_LIST.indexOf(k)+7)%12];
        s.measures[1].voxes[0].forEach(c=>{ c.deg=1; });
        loadSong(s);
        if(keyRef()!==keyRefOf(k)) bad.push(k+':keyRef');
        if(keyRefAt(1)!==keyRefOf(s.measures[1].keyTo)) bad.push(k+':keyRefAt');
        if(voxMidi(song.measures[0].voxes[0][0],0)!==keyRefOf(k)) bad.push(k+':voxMidi');
        const im=importMusicXML(exportMusicXML(song)); if(im.error){ bad.push(k+':mxl '+im.error); return; }
        const d0=im.song.measures[0].voxes[0].map(c=>c.deg+':'+c.oct).join(' ');
        if(d0!=='1:0 3:0 5:0 1:1') bad.push(k+':mxl '+d0);
      });
      return {bad}; })()`);
    T(r.bad && r.bad.length === 0, 'T2 12 个调 keyRef/keyRefAt/voxMidi/MusicXML 往返与 keyRefOf 同源', JSON.stringify(r));
  }

  /* ---------- T3 / T4 粘贴 ---------- */
  {
    const r = await EV(`(async()=>{ const out={}; const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const mk=()=>{ const s=createSong('vox',{title:'粘贴',key:'C',beats:4,unit:4,nMea:6,nVox:1,lyr:0});
        s.measures.forEach(m=>m.voxes[0].forEach(c=>{ c.deg=1; }));
        s.measures[2].keyTo='G'; s.measures[2].label='B';
        s.measures[4].beats=3; s.measures[4].voxes[0]=s.measures[4].voxes[0].slice(0,3);
        return s; };
      loadSong(mk());
      const before={k:[0,1,2,3,4,5].map(i=>keyAt(i)).join(','), be:beatErrors().length};
      clipMeasures=null; clipRow=null; clipCols=null; barSel=null; measureRange=null; selRange=null;
      clipMeasure=JSON.parse(JSON.stringify(song.measures[0])); measureSel=2; pasteMeasure(); await wait(30);
      out.t3={keyTo:song.measures[2].keyTo||'', label:song.measures[2].label||'', k:[0,1,2,3,4,5].map(i=>keyAt(i)).join(','), be:beatErrors().length, before};
      /* T4 拍号不同：4/4 粘到 3/4 小节 */
      loadSong(mk()); clipMeasure=JSON.parse(JSON.stringify(song.measures[0])); measureSel=4; pasteMeasure(); await wait(30);
      out.ask=!!document.getElementById('pm-apply'); const txt=(document.getElementById('modal-mask')||{}).textContent||'';
      out.askTxt=/4\\/4/.test(txt) && /3\\/4/.test(txt);
      if(out.ask) document.getElementById('pm-apply').click(); await wait(30);
      out.apply={beats:song.measures[4].beats||0, be:beatErrors().length};
      loadSong(mk()); clipMeasure=JSON.parse(JSON.stringify(song.measures[0])); measureSel=4; pasteMeasure(); await wait(30);
      if(document.getElementById('pm-keep')) document.getElementById('pm-keep').click(); await wait(30);
      out.keep={beats:song.measures[4].beats||0};
      /* 插入粘贴（点小节线）沿用源小节拍号 */
      loadSong(mk()); measureSel=null; clipMeasure=null; clipMeasures=[JSON.parse(JSON.stringify(song.measures[4]))];
      barSel={L:0,R:1}; pasteMeasure(); await wait(30);
      out.ins={beats:song.measures[1].beats||0, be:beatErrors().length, n:song.measures.length};
      return out; })()`);
    const t3 = r.t3 || {};
    T(!r.err && t3.keyTo === 'G' && t3.label === 'B' && t3.k === t3.before.k && t3.be === t3.before.be,
      'T3 覆盖粘贴保留目标小节的转调与标记（keyAt、beatErrors 不变）', JSON.stringify(t3));
    T(!r.err && r.ask && r.askTxt && r.apply.beats === 0 && r.apply.be === 0 && r.keep.beats === 3 && r.ins.beats === 3 && r.ins.be === 0 && r.ins.n === 7,
      'T4 拍号不一致先问；应用源拍号/保留目标拍号/插入沿用源拍号', JSON.stringify({ ask: r.ask, askTxt: r.askTxt, apply: r.apply, keep: r.keep, ins: r.ins, err: r.err }));
  }

  /* ---------- T5 页头 ---------- */
  {
    const r = await EV(`(()=>{ const out={};
      ['Bb','C#','F#','Eb','C'].forEach(k=>{ const bt=k==='C'?12:4, u=k==='C'?8:4;
        loadSong(createSong('vox',{title:'页头',key:k,beats:bt,unit:u,nMea:2,nVox:1,lyr:0})); render();
        const svg=document.getElementById('score');
        const t=[...svg.querySelectorAll('text')].find(x=>/^1=/.test(x.textContent));
        const ln=[...svg.querySelectorAll('line')].find(l=>Math.abs(+l.getAttribute('y1')-+l.getAttribute('y2'))<0.01 && t && +l.getAttribute('x1')>t.getBBox().x && +l.getAttribute('x1')<t.getBBox().x+140 && Math.abs(+l.getAttribute('y1')-(t.getBBox().y+t.getBBox().height*0.6))<14);
        const num=[...svg.querySelectorAll('text')].find(x=>x.textContent===String(bt) && ln && Math.abs(x.getBBox().y+x.getBBox().height-+ln.getAttribute('y1'))<10);
        out[k]={txt:t?t.textContent:'', gap: (t&&ln)? +(+ln.getAttribute('x1') - (t.getBBox().x+t.getBBox().width)).toFixed(1) : null,
          lw: ln? +ln.getAttribute('x2') - +ln.getAttribute('x1') : null, nw: num? +num.getBBox().width.toFixed(1) : null};
      });
      return out; })()`);
    const ok = r.Bb && r.Bb.txt === '1=♭B' && r['C#'].txt === '1=♯C' && r['F#'].txt === '1=♯F' && r.Eb.txt === '1=♭E'
      && ['Bb', 'C#', 'F#', 'Eb', 'C'].every(k => r[k].gap != null && r[k].gap >= 4) && r.C.lw >= r.C.nw;
    T(ok, 'T5 页头 1=♭B/♯C/♯F/♭E、与拍号间距 ≥4px、12/8 分数线不短于分子', JSON.stringify(r));
  }

  /* ---------- T6 向导拍号 ---------- */
  {
    const r = await EV(`(async()=>{ showNewWizard(); await new Promise(r=>setTimeout(r,80));
      const opts=[...document.querySelectorAll('#nw-beats option')].map(o=>+o.value); closeModal();
      const s=createSong('vox',{title:'九八',key:'C',beats:9,unit:8,nMea:4,nVox:1,lyr:1}); loadSong(s);
      return {opts, be:beatErrors().length, m:song.beats+'/'+song.unit}; })()`);
    T(r.opts && [5, 7, 9, 12].every(n => r.opts.includes(n)) && r.be === 0 && r.m === '9/8', 'T6 向导拍号分子含 5/7/9/12，新建 9/8 谱 beatErrors=0', JSON.stringify(r));
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
