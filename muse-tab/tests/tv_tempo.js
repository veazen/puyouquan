/* v42.7 意大利速度/表情术语库 + 弱起小节 回归：
   T1 song.tempoTerm 谱首斜体渲染（与 ♩=X 并排）；五线谱同样显示
   T2 表情术语（dolce/cantabile/legato/a tempo）作为音符下方斜体文字渲染，且不改播放音量（不在 DYN_GAIN）
   T3 弱起小节 song.pickup：首小节不足拍豁免 beatErrors（但超拍仍报错）+ 谱面重编号（弱起小节空号、其后首整小节记 1）
   file:// 直载；每次载入前清 undoStack 绕过 guardReplace。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 速度术语库存在 + 谱首斜体渲染（简谱页头 & 纯五线谱页头都显示）
  let r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(type,extra)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong(type,Object.assign({title:'速度',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0},extra||{}));
      s.tempoTerm='Andante'; s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(5,4)]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const vocal=mk('vocal'), instr=mk('instr',{clef:'staff'});
    const italTerm=h=>/font-style="italic"[^>]*>Andante<\\/tspan>|<tspan[^>]*font-style="italic"[^>]*font-family="Georgia,serif"[^>]*>Andante<\\/tspan>/.test(h)||(h.indexOf('Andante')>=0 && h.indexOf('italic')>=0);
    return {libLen:TEMPO_TERMS.length, hasLargo:TEMPO_TERMS.some(t=>t[0]==='Largo'),
      vocalTerm:vocal.indexOf('Andante')>=0 && vocal.indexOf('♩=')>=0,
      instrTerm:instr.indexOf('Andante')>=0, italic:italTerm(vocal)}; })()`);
  T(r.libLen >= 12 && r.hasLargo && r.vocalTerm && r.instrTerm && r.italic, 'T1 速度术语库+谱首斜体渲染', JSON.stringify(r));

  // T2 表情术语：渲染为音符下方斜体文字，且不改播放音量（DYN_GAIN 无键）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'表情',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(3,4,{dyn:'dolce'}),V(3,4,{dyn:'legato'}),V(5,4,{dyn:'cantabile'}),V(1,4,{dyn:'a tempo'})];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    const inList=w=>DYN_LIST.some(x=>x[0]===w);
    return {dolce:h.indexOf('>dolce</text>')>=0, cantabile:h.indexOf('>cantabile</text>')>=0,
      legato:h.indexOf('>legato</text>')>=0, atempo:h.indexOf('>a tempo</text>')>=0,
      listed:inList('dolce')&&inList('cantabile')&&inList('legato')&&inList('a tempo')&&inList('espressivo'),
      noGain:DYN_GAIN.dolce===undefined && DYN_GAIN.cantabile===undefined && DYN_GAIN.legato===undefined && DYN_GAIN['a tempo']===undefined}; })()`);
  T(r.dolce && r.cantabile && r.legato && r.atempo && r.listed && r.noGain, 'T2 表情术语渲染且不改音量', JSON.stringify(r));

  // T3 弱起小节：首小节不足拍豁免、超拍仍报错、谱面重编号
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'弱起',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(5,4)];                       // 弱起：仅 1 拍（< 4）
    s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];  // 整小节 4 拍
    loadSong(s);
    song.pickup=false; const errNo=beatErrors().filter(e=>e.mi===0).length;          // 未开弱起：mi0 报错
    const numNo=meaNo(0)+'|'+meaNo(1);                                               // '1|2'
    song.pickup=true;  const errPk=beatErrors().filter(e=>e.mi===0).length;          // 开弱起：mi0 豁免
    const numPk=meaNo(0)+'|'+meaNo(1);                                               // '|1'
    // 超拍仍报错：把首小节塞 5 拍
    s.measures[0].voxes[0]=[V(5,4),V(5,4),V(5,4),V(5,4),V(5,4)]; loadSong(s); song.pickup=true;
    const errOver=beatErrors().filter(e=>e.mi===0).length;                           // 超拍仍报错
    return {errNo, numNo, errPk, numPk, errOver}; })()`);
  T(r.errNo >= 1 && r.numNo === '1|2' && r.errPk === 0 && r.numPk === '|1' && r.errOver >= 1,
    'T3 弱起小节豁免+重编号+超拍报错', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
