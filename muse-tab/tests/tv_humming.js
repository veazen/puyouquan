const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass=0;
  const SYN=`
    const mk=(seq,sr)=>{ // seq: [{midi,dur(s)}|{rest,dur}] 正弦+2%音高抖动+静音隔断
      const total=seq.reduce((a,x)=>a+x.dur,0)+0.1;
      const out=new Float32Array(Math.ceil(total*sr));
      let t0=0;
      seq.forEach(x=>{
        if(x.midi){
          const f=440*Math.pow(2,(x.midi-69)/12);
          const n0=Math.floor(t0*sr), n1=Math.floor((t0+x.dur-0.03)*sr);
          let ph=0;
          for(let i=n0;i<n1;i++){
            const t=(i-n0)/sr;
            const fi=f*(1+0.004*Math.sin(2*Math.PI*5*t));   // 5Hz 轻颤（相位累积，瞬时频率正确）
            ph+=2*Math.PI*fi/sr;
            out[i]=0.5*Math.sin(ph)*(0.85+0.15*Math.sin(2*Math.PI*3*t));
          }
        }
        t0+=x.dur;
      });
      return out; };`;
  // T1 四音旋律 C4 D4 E4 G4（各0.5s @120bpm=1拍）→ 1 2 3 5 四分；结尾 C4 长音定调 C
  const t1 = await pg.evaluate(SYN+`(()=>{
    const sr=44100;
    const seq=[{midi:60,dur:.5},{midi:62,dur:.5},{midi:64,dur:.5},{midi:67,dur:.5},{midi:60,dur:1}];
    const r=hummingToSong(mk(seq,sr), sr, 120);
    if(r.error) return {error:r.error};
    loadSong(r.song);
    const h=document.getElementById('score').innerHTML;
    return { key:r.song.key, n:r.nNotes,
      cols:r.song.measures.map(m=>m.voxes[0].filter(c=>c.deg).map(c=>c.deg+':'+c.dur).join(' ')).join('|'),
      renderOK:h.length>1000 && !h.includes('NaN') };
  })()`);
  const ok1 = !t1.error && t1.key==='C' && t1.cols==='1:4 2:4 3:4 5:4|1:2' && t1.renderOK;
  console.log((ok1?'✅':'❌')+' T1 四音旋律: '+(t1.error||('key='+t1.key+' 音符='+t1.cols+'(期望 1:4 2:4 3:4 5:4|1:2)')));
  if(ok1) pass++;
  // T2 音高检测精度：G大调乐句 D4 G4 A4 B4 G4（含♯F参照…用 B 结尾定调应仍合理）
  const t2 = await pg.evaluate(SYN+`(()=>{
    const sr=44100;
    const seq=[{midi:67,dur:.5},{midi:69,dur:.5},{midi:71,dur:.5},{midi:66,dur:.5},{midi:67,dur:1}];
    const r=hummingToSong(mk(seq,sr), sr, 120);
    if(r.error) return {error:r.error};
    return { key:r.song.key,
      degs:r.song.measures.map(m=>m.voxes[0].filter(c=>c.deg).map(c=>c.deg+(c.acc||'')).join(' ')).join('|') };
  })()`);
  const ok2 = !t2.error && t2.key==='G' && t2.degs==='1 2 3 7|1';
  console.log((ok2?'✅':'❌')+' T2 自动定调G: '+(t2.error||('key='+t2.key+'(期望G) 唱名='+t2.degs+'(期望 1 2 3 7|1)')));
  if(ok2) pass++;
  // T3 静音分隔与时值：0.25s(16分@120? 0.5拍=8分) 短音串
  const t3 = await pg.evaluate(SYN+`(()=>{
    const sr=44100;
    const seq=[{midi:60,dur:.25},{midi:64,dur:.25},{midi:67,dur:.5},{midi:60,dur:1}];
    const r=hummingToSong(mk(seq,sr), sr, 120);
    if(r.error) return {error:r.error};
    return { cols:r.song.measures[0].voxes[0].filter(c=>c.deg).map(c=>c.deg+':'+c.dur).join(' ') };
  })()`);
  const ok3 = !t3.error && t3.cols==='1:8 3:8 5:4 1:2';
  console.log((ok3?'✅':'❌')+' T3 混合时值: '+(t3.error||(t3.cols+'(期望 1:8 3:8 5:4 1:2)')));
  if(ok3) pass++;
  // T4 无声输入 → 优雅报错
  const t4 = await pg.evaluate(`(()=>{
    const r=hummingToSong(new Float32Array(44100), 44100, 90);
    return { err:!!r.error };
  })()`);
  console.log((t4.err?'✅':'❌')+' T4 无声输入优雅降级: error='+t4.err);
  if(t4.err) pass++;
  // T5 向导入口与弹窗
  const t5 = await pg.evaluate(()=>{
    document.getElementById('b-new').click();
    const has=!!document.getElementById('nw-hum');
    document.getElementById('nw-hum').click();
    const modal=!!document.getElementById('hm-rec') && !!document.getElementById('hm-file2') && !!document.getElementById('hm-bpm');
    document.getElementById('hm-cancel').click();
    return {has, modal};
  });
  const ok5 = t5.has && t5.modal;
  console.log((ok5?'✅':'❌')+' T5 入口弹窗: 按钮='+t5.has+' 弹窗(录音/文件/BPM)='+t5.modal);
  if(ok5) pass++;
  console.log('PASS '+pass+'/5');
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
