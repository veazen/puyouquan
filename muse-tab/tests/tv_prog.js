// tv_prog —— v60.15 A3 乐句切分 + A8 进行模板层（固定级数走向）
// 断言分三类：① 切分本身；② 套路该命中时命中、和弦逐字正确；③ 套路不该命中时**不硬套**（这条最重要）。
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0;
  const PRE = `
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const mk=(rows,key)=>{ const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:key||'C',nMea:rows.length});
      rows.forEach((r,i)=> s.measures[i].voxes[0]=r); return s; };
    const run=(s)=>({ ch:suggestChords(s,0).join(' '),
      segs:JSON.stringify(PROG_LAST.segs),
      marks:PROG_LAST.marks.map(m=>m.a+'-'+m.b+':'+m.name+(m.cad?'+收主':'')).join(' | ') });`;

  // T1 乐句切分：每小节都以长音收尾时，不得「越切越碎」（相对均值证据的回归）
  const t1 = await pg.evaluate(`(()=>{ ${PRE}
    const s=mk([[V(1,2),V(3,2)],[V(5,2),V(3,2)],[V(2,2),V(4,2)],[V(1,2),V(1,2)],
                [V(1,2),V(3,2)],[V(5,2),V(3,2)],[V(2,2),V(4,2)],[V(1,2),V(1,2)]]);
    return { segs:JSON.stringify(phraseSegments(s,0)),
             short:JSON.stringify(phraseSegments(mk([[V(1,4),V(1,4),V(1,4),V(1,4)],[V(5,4),V(5,4),V(5,4),V(5,4)],[V(1,2),V(1,2)]]),0)) };
  })()`);
  const ok1 = t1.segs === '[[0,3],[4,7]]' && t1.short === '[[0,2]]';
  console.log((ok1 ? '✅' : '❌') + ' T1 乐句切分: 8小节→' + t1.segs + '(期望 [[0,3],[4,7]]，非 4×2小节) 3小节→' + t1.short);
  if (ok1) pass++;

  // T2 明确 1-5-6-4 旋律 → 命中套路
  const t2 = await pg.evaluate(`(()=>{ ${PRE}
    return run(mk([[V(1,4),V(3,4),V(5,4),V(3,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
                   [V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(1,4,{oct:1})],[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)]]));
  })()`);
  const ok2 = t2.ch === 'C G Am F' && /1-5-6-4/.test(t2.marks);
  console.log((ok2 ? '✅' : '❌') + ' T2 命中 1-5-6-4: 和弦=' + t2.ch + ' 套路=' + (t2.marks || '(无)'));
  if (ok2) pass++;

  // T3 含糊旋律被套路扳正：第 3 小节只有 1/3，自由解因根音加权偏 C，套路层应改判 Am
  const t3 = await pg.evaluate(`(()=>{ ${PRE}
    return run(mk([[V(1,4),V(3,4),V(5,4),V(3,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
                   [V(1,4,{oct:1}),V(3,4,{oct:1}),V(1,4,{oct:1}),V(3,4,{oct:1})],[V(4,4),V(6,4),V(4,4),V(6,4)]]));
  })()`);
  const ok3 = t3.ch === 'C G Am F' && /1-5-6-4/.test(t3.marks);
  console.log((ok3 ? '✅' : '❌') + ' T3 含糊处被套路扳正: 和弦=' + t3.ch + '(期望 C G Am F，自由解为 C G C F) 套路=' + (t3.marks || '(无)'));
  if (ok3) pass++;

  // T4 卡农 8 格全式（须靠「相邻两句合并」才够长）+ 末小节旋律收主音 → 收尾换主和弦
  const t4 = await pg.evaluate(`(()=>{ ${PRE}
    return run(mk([[V(1,4),V(3,4),V(5,4),V(3,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(5,4)],
                   [V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(6,4)],[V(3,4),V(5,4),V(7,4),V(3,4)],
                   [V(4,4),V(6,4),V(1,4,{oct:1}),V(4,4)],[V(1,4),V(3,4),V(5,4),V(1,4)],
                   [V(4,4),V(6,4),V(1,4,{oct:1}),V(4,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(1,4)]]));
  })()`);
  const ok4 = t4.ch === 'C G Am Em F C F C' && /卡农进行\+收主/.test(t4.marks) && /^0-7:/.test(t4.marks);
  console.log((ok4 ? '✅' : '❌') + ' T4 卡农全式: 和弦=' + t4.ch + '(期望 C G Am Em F C F C) 套路=' + (t4.marks || '(无)'));
  if (ok4) pass++;

  // T5 小调套路 i-♭VII-♭VI-♭VII（8 小节铺两轮，末小节收主）
  const t5 = await pg.evaluate(`(()=>{ ${PRE}
    return run(mk([[V(6,2),V(1,2,{oct:1})],[V(5,2),V(7,2)],[V(4,2),V(6,2)],[V(5,2),V(7,2)],
                   [V(6,2),V(1,2,{oct:1})],[V(5,2),V(7,2)],[V(4,2),V(6,2)],[V(6,2),V(6,2)]]));
  })()`);
  const ok5 = t5.ch === 'Am G F G Am G F Am' && /♭VII/.test(t5.marks);
  console.log((ok5 ? '✅' : '❌') + ' T5 小调套路: 和弦=' + t5.ch + ' 套路=' + (t5.marks || '(无)'));
  if (ok5) pass++;

  // T6 **不硬套**：旋律固执停在 7/4（属七色彩），任何套路都不该被强加
  const t6 = await pg.evaluate(`(()=>{ ${PRE}
    return run(mk([[V(7,2),V(4,2)],[V(7,2),V(4,2)],[V(7,2),V(4,2)],[V(7,2),V(4,2)],
                   [V(7,2),V(4,2)],[V(7,2),V(4,2)],[V(7,2),V(4,2)],[V(1,2),V(1,2)]]));
  })()`);
  const ok6 = t6.marks === '' && t6.ch === 'G7 G7 G7 G7 G7 G7 G7 C';
  console.log((ok6 ? '✅' : '❌') + ' T6 套路不硬套: 套路=' + (t6.marks || '(无，正确)') + ' 和弦=' + t6.ch);
  if (ok6) pass++;

  // T7 大调既有行为不回归：v44.9 的功能进行与 v45.x 的属七终止原样
  const t7 = await pg.evaluate(`(()=>{ ${PRE}
    const a=run(mk([[V(1,4),V(3,4),V(5,4),V(3,4)],[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)],
                    [V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],[V(1,4),V(1,4),V(1,2)]]));
    const b=run(mk([[V(1,4),V(3,4),V(5,4),V(3,4)],[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)],
                    [V(5,4),V(7,4),V(4,4,{oct:1}),V(2,4,{oct:1})],[V(1,4),V(1,4),V(1,2)]]));
    return { a:a.ch, b:b.ch };
  })()`);
  const ok7 = t7.a === 'C F G C' && t7.b === 'C F G7 C';
  console.log((ok7 ? '✅' : '❌') + ' T7 大调不回归: ' + t7.a + '(期望 C F G C) / ' + t7.b + '(期望 C F G7 C，属七未被套路抹平)');
  if (ok7) pass++;

  // T8 重复乐句：两句旋律逐字相同 → 两句和弦必须逐字相同
  const t8 = await pg.evaluate(`(()=>{ ${PRE}
    const ph=[[V(1,4),V(3,4),V(5,4),V(3,4)],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
              [V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(1,4,{oct:1})],[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)]];
    const r=run(mk(ph.concat(ph.map(m=>m.map(c=>Object.assign({},c))))));
    const p=r.ch.split(' ');
    return { ch:r.ch, same:p.slice(0,4).join(' ')===p.slice(4).join(' '), marks:r.marks };
  })()`);
  // 同时要求套路标记覆盖两句——否则「两句一致」在停用套路层时也能碰巧成立（变异实测过），断言等于没设防
  const ok8 = t8.same && t8.ch === 'C G Am F C G Am F' && /1-5-6-4/.test(t8.marks);
  console.log((ok8 ? '✅' : '❌') + ' T8 重复乐句同配: 和弦=' + t8.ch + ' 前后两句一致=' + t8.same + ' 套路=' + (t8.marks || '(无)'));
  if (ok8) pass++;

  console.log('PASS ' + pass + '/8');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === 8 && !errs.length ? 0 : 1);
})();
