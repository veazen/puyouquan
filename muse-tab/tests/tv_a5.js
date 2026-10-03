/* v63.2 A5 内容纠错（一）：官方预设与门面演示（2026-10 评审团 §6.2 A5 ①②③；P1-27 / P1-28 / P1-31；D-05「改用自有歌词」）
   T1 《送别》按公版原曲（J.P.奥德威 1868）+ 李叔同词重录：16 小节 A A' B A'，首句音高/时值断言，全曲 beatErrors=0，歌词 46 字逐音对位
   T2 全部预设没有把两个字连起来的连线：连线（延音线/圆滑线）后的音不挂新字（拂→柳、女→神两处已去掉；送别的一字多音用圆滑线）
   T3 两份《欢乐颂》（扫弦弹唱 / 教学对照）改用谱友圈自有示范词，不再使用未署译配者的通行译词；署名不再写「席勒」
   T4 独奏预设 key:'C' + mode:'minor'，页头不再出现「1=Am」
   T5 make.html 五线谱演示音高正确：一闪一闪亮晶晶＝C4 C4 G4 G4 A4 A4 G4（按五线坐标反读）
   T6 课程「听一听」按 token 序列排程：独立书写的「-」给前一音加一拍，「~」两端同音只起音一次；「1 -」「1 - -」「1 - - -」时长 2/3/4 拍
   突变实证：对 v63.2 之前的文件复跑，T1–T6 全部报红（0/6）。 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); if(typeof hideStartPad==='function') hideStartPad(); })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* ---------- T1 《送别》 ---------- */
  {
    const r = await EV(`(()=>{ const P=PRESETS.find(p=>/送别/.test(p.name)); if(!P) return {err:'no preset'};
      const s=P.make(); loadSong(s);
      const cols=song.measures.map(m=>m.voxes[0]);
      const mid=(c,mi)=>c.deg? voxMidi(c,mi) : 0;
      const bt=c=>beatsOf(c);
      const phrase=cols.slice(0,4).map((cs,mi)=>cs.map(c=>mid(c,mi)+':'+bt(c)).join(' ')).join(' | ');
      const b11=cols[10].map(c=>mid(c,10)+':'+bt(c)).join(' ');
      const b7=cols[6].map(c=>mid(c,6)+':'+bt(c)).join(' ');
      const ly=cols.flat().map(c=>(c.lyrics||[])[0]||'').join('');
      return {n:song.measures.length, phrase, b7, b11, ly, be:beatErrors().length, composer:song.composer, lyricist:song.lyricist}; })()`);
    /* 第 1–4 小节：5 3̲5̲ i - | 6 i 5 - | 5 1̲2̲ 3 2̲1̲ | 2 - - 0 */
    const want = '67:1 64:0.5 67:0.5 72:2 | 69:1 72:1 67:2 | 67:1 60:0.5 62:0.5 64:1 62:0.5 60:0.5 | 62:3 0:1';
    const lyWant = '长亭外古道边芳草碧连天晚风拂柳笛声残夕阳山外山天之涯地之角知交半零落一壶浊酒尽余欢今宵别梦寒';
    T(!r.err && r.n === 16 && r.phrase === want && r.b7 === '67:1 62:0.5 64:0.5 65:1.5 59:0.5' && r.be === 0
      && r.ly === lyWant && /奥德威/.test(r.composer) && r.lyricist === '李叔同',
      'T1 《送别》按公版原曲重录（16 小节、首句音高时值、夕阳山外山 4·7̣、歌词逐音对位、beatErrors=0）', JSON.stringify(r));
  }

  /* ---------- T2 全部预设无异音连线 ---------- */
  {
    const r = await EV(`(()=>{ const bad=[];
      PRESETS.forEach((P,pi)=>{ const s=P.make(); loadSong(s);
        (song.voxVoices||[]).forEach((_,vi)=>{
          const flat=[]; song.measures.forEach((m,mi)=>(m.voxes[vi]||[]).forEach((c,ci)=>flat.push({c,mi,ci})));
          /* 连线（同音＝延音线，异音＝圆滑线）之后的音是延续音，不得再挂新字——否则就是把两个字连在一起（拂→柳、女→神） */
          flat.forEach((x,k)=>{ if(!x.c.tie || !x.c.deg) return; const y=flat[k+1]; if(!y) return;
            if((y.c.lyrics||[]).some(l=>l && String(l).trim())) bad.push(P.name+'@'+(x.mi+1)+':'+(x.ci+1)); });
        });
      });
      return {bad}; })()`);
    T(r.bad && r.bad.length === 0, 'T2 全部预设没有把两个字连起来的连线（连线后的音不挂新字）', JSON.stringify(r));
  }

  /* ---------- T3 欢乐颂改用自有示范词 ---------- */
  {
    const r = await EV(`(()=>{ const out={};
      PRESETS.filter(p=>/欢乐颂/.test(p.name)).forEach(P=>{ const s=P.make(); loadSong(s);
        const ly=song.measures.map(m=>(m.voxes[0]||[]).map(c=>(c.lyrics||[])[0]||'').join('')).join('');
        out[P.name]={ly, lyricist:song.lyricist||''}; });
      return out; })()`);
    const names = Object.keys(r || {});
    const OLD = /欢乐女神|圣洁美丽|灿烂光芒|来到你圣殿/;
    const ok = names.length >= 4 && names.every(k => !OLD.test(r[k].ly) && !/席勒/.test(r[k].lyricist));
    const strum = names.find(k => /扫弦/.test(k)), teach = names.find(k => /教学/.test(k));
    T(ok && strum && teach && /让我们来齐声歌唱/.test(r[strum].ly) && /让我们来齐声歌唱/.test(r[teach].ly),
      'T3 两份《欢乐颂》改用自有示范词、不再署「席勒」', JSON.stringify(r));
  }

  /* ---------- T4 独奏预设 key:'C' ---------- */
  {
    const r = await EV(`(()=>{ const s=presetSolo(); loadSong(s); render();
      const h=document.getElementById('score').textContent;
      return {key:song.key, mode:song.mode||'', am:/1=Am/.test(h)}; })()`);
    T(r.key === 'C' && r.mode === 'minor' && !r.am, 'T4 独奏预设 key:C + mode:minor，页头无「1=Am」', JSON.stringify(r));
  }

  /* ---------- T5 make.html 五线谱演示 ---------- */
  {
    const html = fs.readFileSync(path.join(SITE, 'make.html'), 'utf8');
    const pane = (html.split('id="pane-staff"')[1] || '').split('</svg>')[0];
    const heads = [...pane.matchAll(/<ellipse cx="(\d+)" cy="(\d+)"/g)].map(m => +m[2]);
    /* 五线 y=44(F5) 56(D5) 68(B4) 80(G4) 92(E4)，半个线距 6：C4=104（下加一线）G4=80 A4=74 */
    const NAME = { 104: 'C4', 98: 'D4', 92: 'E4', 86: 'F4', 80: 'G4', 74: 'A4', 68: 'B4', 62: 'C5' };
    const got = heads.map(y => NAME[y] || y).join(' ');
    T(got === 'C4 C4 G4 G4 A4 A4 G4', 'T5 make.html 五线谱演示＝C4 C4 G4 G4 A4 A4 G4', got);
  }

  /* ---------- T6 课程听一听排程 ---------- */
  {
    const sp = await b.newPage();
    sp.on('pageerror', e => errs.push('SITEERR:' + e.message));
    await sp.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="host"></div></body></html>');
    await sp.addScriptTag({ path: path.join(SITE, 'pyq.js') }).catch(e => errs.push('LOAD:' + e.message));
    const r = await sp.evaluate(`(()=>{ const out={};
      if(!window.PYQ_KC || !window.PYQ_SND || !PYQ_SND.supported()) return {err:'no engine'};
      PYQ_SND.setTempo(60);   // 1 拍 = 1000ms
      const run=line=>{ const host=document.getElementById('host');
        host.innerHTML=PYQ_KC.blockHtml({t:'jp', line});
        const fig=host.querySelector('[data-jpfig]');
        const els=[].slice.call(fig.querySelectorAll('.jpn[data-jt], [data-jx]'));
        const ms=PYQ_SND.playLine(els); PYQ_SND.stop();
        const plan=(PYQ_SND.plan? PYQ_SND.plan() : null);
        return {beats:Math.round((ms-60)/100)/10, attacks: plan? plan.filter(p=>p.attack&&p.deg).length : -1}; };
      out.a=run('1 -'); out.b=run('1 - -'); out.c=run('1 - - -'); out.d=run('5 - ~ 5'); out.e=run('1- 2 | 3 - ||'); out.f=run('3 ~ 4');
      return out; })()`).catch(e => ({ err: e.message }));
    const ok = !r.err && r.a.beats === 2 && r.b.beats === 3 && r.c.beats === 4 && r.d.beats === 3 && r.d.attacks === 1
      && r.e.beats === 5 && r.e.attacks === 3 && r.f.beats === 2 && r.f.attacks === 2;
    T(ok, 'T6 听一听：独立「-」加拍、「~」同音只起音一次（1 -/1 - -/1 - - - ＝2/3/4 拍；5 - ~ 5＝3 拍一次起音）', JSON.stringify(r));
    await sp.close();
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
