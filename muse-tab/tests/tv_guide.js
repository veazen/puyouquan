/* v60.65 新建时记谱引导「会什么谱写什么谱」。
   产品原话：「假如我是一个擅长简谱的创作者，不懂吉他谱又想通过简谱制作吉他谱，
   或者我只懂五线谱，通过五线谱制作吉他谱或者简谱，这个功能应该新建项目时提示，给出方案。」
   方案：向导加一个「我写谱用」——**用哪种谱写** 与 **最终出什么谱** 解耦。
   T1 入口口径：吉他/尤克里里与声乐谱出现该选项；功能谱/和弦格/钢琴不出现（那里没有这个错配）
   T2 简谱 → 吉他：建好后光标落在旋律轨、按简谱显示（voxNotations[0] 非五线）
   T3 五线谱 → 独奏：solo 在 createSong 里被硬编码 0 条旋律轨，引导模式要补一条并按五线谱显示，
      且 tabStaff（TAB+五线联排）不能被弄丢
   T4 闭环实证（本套件的核）：在简谱旋律轨写 1 2 3 4 → 一键生成吉他轨 →
      生成轨每个音的**实际发声**（定弦+品+夹）与简谱音高逐个相等。不看截图，比音高。
   T5 声乐谱 + 五线谱：旋律轨直接按五线谱显示（「只懂五线谱也能做简谱」的另一半）
   T6 零回归：know=auto（默认）走的还是老路径——光标落 TAB、不产生 voxNotations
   对 v60.62 旧文件跑：T1–T5 当场红（没有 know 选项）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  /* 向导里点一个二级选项（下拉项都带 data-k/data-v，与程序化路径同口径） */
  const HELP = `
    window.__pick=(k,v)=>{ const el=document.querySelector('.nw-dditem[data-k="'+k+'"][data-v="'+v+'"]');
      if(!el) return false; el.click(); return true; };
    window.__hasKnow=()=>!!document.querySelector('.nw-dd[data-dd="know"]');
    window.__create=()=>document.getElementById('nw-create').click();
  `;

  // T1 入口口径：哪些目标该出现「我写谱用」
  let r = await pg.evaluate(HELP + `(()=>{
    const seen={};
    showNewWizard();                       seen.guitar=__hasKnow();      // 器乐·吉他（默认）
    __pick('instKey','uku');               seen.uku=__hasKnow();
    __pick('instKey','piano');             seen.piano=__hasKnow();       // 钢琴：目标就是大谱表，无错配
    document.querySelector('.nw-int[data-int="vocal"]').click(); seen.vocal=__hasKnow();
    document.querySelector('.nw-int[data-int="func"]').click();  seen.func=__hasKnow();
    /* 切回器乐时乐器还停在上面选过的钢琴上——要先选回吉他才谈得上「有没有 know」 */
    const opts=(()=>{ document.querySelector('.nw-int[data-int="inst"]').click();
      __pick('instKey','guitar');
      return [...document.querySelectorAll('.nw-dditem[data-k="know"]')].map(x=>x.dataset.v); })();
    closeModal();
    return {seen, opts};
  })()`);
  T(r.seen.guitar && r.seen.uku && !r.seen.piano && r.seen.vocal && !r.seen.func
    && r.opts.join() === 'auto,jianpu,staff',
    'T1 「我写谱用」只在存在错配的目标上出现（吉他/尤克/声乐有，钢琴/功能谱没有）', JSON.stringify(r));

  // T2 简谱 → 吉他：光标落旋律轨、按简谱显示
  r = await pg.evaluate(HELP + `(()=>{
    showNewWizard(); __pick('know','jianpu'); __create();
    const nota=(song.voxNotations||[])[0];
    return {row:sel.row, vi:sel.vi, tabs:song.tabVoices.length, vox:song.voxVoices.length,
      staffNota: isStaffNota(nota), nota: nota===undefined? 'undefined' : String(nota)};
  })()`);
  T(r.row === 'vox' && r.vi === 0 && r.vox >= 1 && r.tabs >= 1 && !r.staffNota,
    'T2 简谱→吉他：光标落在旋律轨、按简谱显示（吉他轨随后一键生成）', JSON.stringify(r));

  // T3 五线谱 → 独奏：补一条旋律轨，且 tabStaff 不丢
  r = await pg.evaluate(HELP + `(()=>{
    showNewWizard(); __pick('form','lead'); __pick('know','staff'); __create();
    return {row:sel.row, vox:song.voxVoices.length, tabs:song.tabVoices.length,
      nota:(song.voxNotations||[])[0], tabStaff:!!song.tabStaff};
  })()`);
  T(r.row === 'vox' && r.vox === 1 && r.tabs === 1 && r.nota === 'staff' && r.tabStaff,
    'T3 五线谱→独奏：solo 本无旋律轨，引导补一条并按五线谱显示，TAB+五线联排不丢', JSON.stringify(r));

  // T4 闭环实证：简谱写旋律 → 生成吉他轨 → 逐音比发声音高
  r = await pg.evaluate(HELP + `(()=>{
    showNewWizard(); __pick('know','jianpu'); __create();
    const degs=[1,2,3,4];
    song.measures[0].voxes[0].forEach((c,i)=>{ c.deg=degs[i]||0; c.oct=0; });
    render();
    const tabs0=song.tabVoices.length;
    mapVoxToTab(0,'low');                      // 左栏「显示 · 六线谱」走的同一个引擎
    const gi=song.tabVoices.length-1;
    /* 生成轨的实际发声 = 定弦 + 品 + 夹（与 capoOf 同口径） */
    const tabMidi=song.measures[0].tabs[gi]
      .map(c=>(c.notes||[]).map(n=>tuningOf()[n.s-1]+n.f+(song.capo||0)))
      .filter(a=>a.length).map(a=>a[0]);
    const voxMidi2=song.measures[0].voxes[0].filter(c=>c.deg).map(c=>voxMidi(c,0));
    return {tabs0, tabsAfter:song.tabVoices.length, tabMidi, voxMidi:voxMidi2,
      match: tabMidi.length===voxMidi2.length && tabMidi.every((m,i)=>m===voxMidi2[i])};
  })()`);
  T(r.tabsAfter === r.tabs0 + 1 && r.tabMidi.length === 4 && r.match,
    'T4 闭环实证：简谱旋律 → 生成的吉他轨逐音发声完全一致（比音高，不看截图）', JSON.stringify(r));

  // T5 声乐谱 + 五线谱：另一半（只懂五线谱也能做简谱）
  r = await pg.evaluate(HELP + `(()=>{
    showNewWizard();
    document.querySelector('.nw-int[data-int="vocal"]').click();
    __pick('know','staff'); __create();
    const nota=(song.voxNotations||[])[0];
    return {row:sel.row, nota:String(nota), staff:isStaffNota(nota), vox:song.voxVoices.length,
      lyr:song.lyricLines};
  })()`);
  T(r.row === 'vox' && r.staff && r.vox >= 1,
    'T5 声乐谱＋五线谱：旋律轨直接按五线谱录入（简谱同源随时切回）', JSON.stringify(r));

  // T6 零回归：默认 auto 还是老路径
  r = await pg.evaluate(HELP + `(()=>{
    showNewWizard(); __create();
    return {row:sel.row, nota: song.voxNotations===undefined? 'absent' : JSON.stringify(song.voxNotations),
      tabs:song.tabVoices.length, vox:song.voxVoices.length, lyr:song.lyricLines};
  })()`);
  T(r.row === 'tab' && r.nota === 'absent' && r.tabs === 1 && r.vox === 1,
    'T6 零回归：know=auto 走老路径——光标落 TAB、不产生 voxNotations', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
