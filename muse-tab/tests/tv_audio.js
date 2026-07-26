/* tv_audio — 播放引擎数值回归（音质升级·阶段1 起）
   原则：位置/对齐用几何断言，音质/电平用数值断言——离线渲染 OfflineAudioContext，
   对 Float32Array 断言，不靠人耳抽查。合成声部含随机噪声激励，只断言包络/峰值/RMS，
   不断言逐样本值。
   覆盖：无削波 / 收音尾部静音 / 采样截断点无爆点（一阶差分探针）/ 采样路径有效 /
        多轨最坏情况总线安全 / 力度时间线作用于 TAB / 微扰动确定性（同位同值、异位异值）/
        响度归一系数与生效电平 / 混响 IR 性质 / v48.9 扫弦力度型与拍点重音表。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0, errs = [];
const T = (ok, name, detail) => {
  if (ok) { pass++; console.log('✅ ' + name + (detail ? ': ' + detail : '')); }
  else { fail++; console.log('❌ ' + name + (detail ? ': ' + detail : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto(FILE); await pg.waitForTimeout(900);

  const r = await pg.evaluate(async () => {
    const SR = 44100;
    const out = {};
    const stats = (ch, from, to) => {
      let peak = 0, sum = 0; const a = Math.max(0, from | 0), b = Math.min(ch.length, to | 0);
      for (let i = a; i < b; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; sum += ch[i] * ch[i]; }
      return { peak, rms: Math.sqrt(sum / Math.max(1, b - a)) };
    };
    const maxDiff = (ch, from, to) => {
      let m = 0; const a = Math.max(1, from | 0), b = Math.min(ch.length, to | 0);
      for (let i = a; i < b; i++) { const d = Math.abs(ch[i] - ch[i - 1]); if (d > m) m = d; }
      return m;
    };
    const render = async (secs, build) => {
      const ctx = new OfflineAudioContext(2, Math.ceil(SR * secs), SR);
      const bus = buildBus(ctx);
      await build(ctx, bus);
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };
    // 采样解码到指定离线 ctx（sfDecode 异步，轮询就绪）
    sfEmbedInit();
    const bank = sfBanks['acoustic_guitar_steel'];
    const decodeInto = async (ctx, midi) => {
      sfDecode(ctx, bank, midi);
      for (let i = 0; i < 100 && !bank.buf[ctx.sampleRate + ':' + midi]; i++) await new Promise(r2 => setTimeout(r2, 30));
      return !!bank.buf[ctx.sampleRate + ':' + midi];
    };

    // ── A 单音采样：let-ring 全程 + 截断点探针 ──
    {
      let dec = false, natEnd = 0;
      const ch = await render(4.2, async (ctx, bus) => {
        dec = await decodeInto(ctx, 40);
        const buf = bank.buf[ctx.sampleRate + ':40'];
        natEnd = 0.1 + (buf ? buf.duration : 0);
        sfTryPlay(ctx, bus, 'acoustic_guitar_steel', midiFreq(40), 0.1, 8, 0.5, null); // dur 8s > natLen → 播满自然衰减
      });
      const body = stats(ch, 0.15 * SR, 1.0 * SR);
      const tail = stats(ch, (natEnd + 0.15) * SR, (natEnd + 0.35) * SR);
      // 截断点窗口：源耗尽前后 ±40ms 的一阶差分（爆点=陡峭台阶）；护栏应保证增益已收零
      const clickWin = maxDiff(ch, (natEnd - 0.04) * SR, (natEnd + 0.04) * SR);
      out.A = { dec, bodyPeak: +body.peak.toFixed(4), tailRms: +tail.rms.toFixed(6),
        click: +clickWin.toFixed(5), clickRel: body.peak > 0 ? +(clickWin / body.peak).toFixed(4) : 9 };
    }

    // ── B damp 分支（同弦再弹掐断）尾部无爆点 ──
    {
      const ch = await render(2.0, async (ctx, bus) => {
        await decodeInto(ctx, 43);
        sfTryPlay(ctx, bus, 'acoustic_guitar_steel', midiFreq(43), 0.1, 0.5, 0.5, { damp: true });
      });
      out.B = { cutDiff: +maxDiff(ch, 0.55 * SR, 0.75 * SR).toFixed(5), tailRms: +stats(ch, 1.2 * SR, 1.5 * SR).rms.toFixed(6) };
    }

    // ── C 最坏情况：六弦扫弦 ×2 + KS 和弦 + 合成钢琴齐鸣，总线不削波 ──
    {
      /* 增益摆位镜像真实调度：norm=0.85/√轨数、和弦按 √n 分摊；v48.8 起采样电平由按样归一接管。
         删 ×0.5 后的削波哨兵：此场景峰值必须仍 <0.99。 */
      const ch = await render(3.0, async (ctx, bus) => {
        for (const m of [40, 45, 50, 55, 59, 64]) { await decodeInto(ctx, m); }
        const norm = 0.85 / Math.sqrt(2);
        const tb = makeTrackBus(ctx, bus, -0.2);
        const g6 = norm / Math.sqrt(6);
        [0, 1.0].forEach(t0 => {
          [40, 45, 50, 55, 59, 64].forEach((m, k) => {
            sfTryPlay(ctx, tb, 'acoustic_guitar_steel', midiFreq(m), 0.1 + t0 + k * 0.012, 2, g6, null);  /* v48.8 归一接管电平，×0.5 已删 */
          });
        });
        const tb2 = makeTrackBus(ctx, bus, 0.2);
        const g4 = norm / Math.sqrt(4);
        [48, 52, 55, 60].forEach(m => playInst('piano', ctx, tb2, midiFreq(m), 0.12, 1.5, g4, false));
        [40, 47, 52].forEach(m => playInst('steel', ctx, tb2, midiFreq(m), 0.12, 1.5, norm / Math.sqrt(3), false));
      });
      const g = stats(ch, 0, ch.length);
      let clip = 0; for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) >= 0.995) clip++;
      out.C = { busPeak: +g.peak.toFixed(3), clipSamples: clip };
    }

    // ── D 力度时间线：p 段 vs f 段 TAB 轨增益比 ──
    {
      const mk = () => {
        const s = createSong('guitar', { title: 'a', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
        for (let mi = 0; mi < 2; mi++) {
          s.measures[mi].tabs[0] = [0, 1, 2, 3].map(() => ({ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: [{ s: 3, f: 5 }] }));
          s.measures[mi].voxes[0] = [0, 1, 2, 3].map(() => ({ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false }));
        }
        s.measures[0].voxes[0][0].dyn = 'p';
        s.measures[1].voxes[0][0].dyn = 'f';
        return s;
      };
      loadSong(mk());
      // 不真正 play()（依赖在线 AudioContext）；直接复算调度层的时间线逻辑
      const spb = 60 / song.tempo;
      const order = [0, 1]; const starts = [0, 4 * spb];
      const dynTL = []; let g = 1;
      order.forEach((mi, oi) => {
        let off = starts[oi];
        (song.measures[mi].voxes[0] || []).forEach(col => {
          if (col.dyn && DYN_GAIN[col.dyn]) { g = DYN_GAIN[col.dyn]; dynTL.push({ tm: off, g }); }
          off += beatsOf(col, 4) * spb;
        });
      });
      const dynAt = (off) => { let gg = 1; for (let i = 0; i < dynTL.length; i++) { if (dynTL[i].tm <= off + 1e-6) gg = dynTL[i].g; else break; } return gg; };
      out.D = { pSeg: dynAt(0.1), fSeg: dynAt(4 * spb + 0.1), expect: [DYN_GAIN.p, DYN_GAIN.f] };
    }

    // ── G 响度归一：系数范围 + 生效电平 + onset 修剪 ──
    {
      const ctx = new OfflineAudioContext(2, SR * 2, SR);
      const bus2 = buildBus(ctx);
      await decodeInto(ctx, 52);
      const ent = bank.buf[ctx.sampleRate + ':52'];
      const ch = await (async () => {
        sfTryPlay(ctx, bus2, 'acoustic_guitar_steel', midiFreq(52), 0.1, 8, 1.0, null);
        const b2 = await ctx.startRendering(); return b2.getChannelData(0);
      })();
      const st2 = stats(ch, 0.1 * SR, 1.0 * SR);
      out.G = { g: +ent.g.toFixed(2), onset: +ent.o.toFixed(4),
        effPeak: +st2.peak.toFixed(3) };
    }

    // ── F 混响 IR 性质：18ms predelay 零区 / 双声道去相关 / 时变渐暗 / 无低频泥 ──
    {
      const ctx = new OfflineAudioContext(2, SR, SR);
      const ir = makeImpulse(ctx, 1.8, 2.4);
      const L = ir.getChannelData(0), R = ir.getChannelData(1);
      const preN = Math.floor(SR * 0.018);
      let preMax = 0; for (let i = 0; i < preN; i++) preMax = Math.max(preMax, Math.abs(L[i]), Math.abs(R[i]));
      // 声道相关（归一化零延迟互相关，取前 0.5s）
      let num = 0, dl = 0, dr = 0; const N = Math.floor(SR * 0.5);
      for (let i = preN; i < preN + N; i++) { num += L[i] * R[i]; dl += L[i] * L[i]; dr += R[i] * R[i]; }
      const corr = Math.abs(num) / Math.max(1e-12, Math.sqrt(dl * dr));
      // 渐暗：首 0.3s vs 尾 0.3s 的高频占比（一阶差分 RMS / 总 RMS）
      const hfRatio = (from, to) => { let hf = 0, tot = 0;
        for (let i = from + 1; i < to; i++) { const d = L[i] - L[i - 1]; hf += d * d; tot += L[i] * L[i]; }
        return Math.sqrt(hf / Math.max(1e-12, tot)); };
      const head = hfRatio(preN, preN + Math.floor(SR * 0.3));
      const tail = hfRatio(ir.length - Math.floor(SR * 0.4), ir.length - Math.floor(SR * 0.1));
      // 低频泥：40Hz 滑动均值近似的低频能量占比应很小（180Hz 高通后）
      let lowE = 0, totE = 0, acc = 0; const W = Math.floor(SR / 40);
      for (let i = preN; i < preN + N; i++) { acc += L[i]; if (i - preN >= W) acc -= L[i - W];
        const m = acc / W; lowE += m * m; totE += L[i] * L[i]; }
      out.F = { preMax: +preMax.toFixed(6), corr: +corr.toFixed(3),
        headHF: +head.toFixed(3), tailHF: +tail.toFixed(3), lowRatio: +(lowE / Math.max(1e-12, totE)).toFixed(4) };
    }

    // ── E 扰动确定性：同位同值、异位异值、幅度界内 ──
    {
      const a1 = humJit(3, 2, 4), a2 = humJit(3, 2, 4), b1 = humJit(3, 3, 4);
      const cents = Math.abs(Math.log2(a1.fc) * 1200), db = Math.abs(Math.log10(a1.gc) * 20);
      out.E = { same: a1.fc === a2.fc && a1.gc === a2.gc, diff: a1.fc !== b1.fc || a1.gc !== b1.gc,
        cents: +cents.toFixed(2), db: +db.toFixed(2) };
    }

    // ── H 音符层塑形（v48.9）：扫弦力度型 strumPlan + 拍点重音 beatAcc 纯函数断言 ──
    {
      const d6 = strumPlan(6, 'd'), u4 = strumPlan(4, 'u');
      const span = p => p.length > 1 ? p[p.length - 1].dt : 0;
      // 下扫：总展开 40–90ms、相邻间隔递减（加速）、弦内力度低→高递减
      let dAccel = true, dGrad = true;
      for (let k = 2; k < d6.length; k++) if (d6[k].dt - d6[k - 1].dt > d6[k - 1].dt - d6[k - 2].dt + 1e-9) dAccel = false;
      for (let k = 1; k < d6.length; k++) if (d6[k].g >= d6[k - 1].g) dGrad = false;
      // 上扫：更快（≤35ms）且整体更轻（首音 ≤0.9）
      out.H = { dSpan: +span(d6).toFixed(4), dAccel, dGrad,
        uSpan: +span(u4).toFixed(4), uLight: u4[0].g <= 0.9,
        acc: [beatAcc(0, 4), beatAcc(2, 4), beatAcc(1, 4), beatAcc(0.5, 4), beatAcc(0.25, 4), beatAcc(3, 6)] };
    }
    return out;
  });

  T(r.A.dec && r.A.bodyPeak > 0.02, 'A1 采样路径有效（let-ring 主体有声）', 'peak=' + r.A.bodyPeak);
  T(r.A.tailRms < 0.001, 'A2 let-ring 收尾静音（buffer 耗尽后无残响）', 'tailRms=' + r.A.tailRms);
  T(r.A.clickRel < 0.3, 'A3 截断点无爆点（一阶差分相对主体峰值）', 'rel=' + r.A.clickRel);
  T(r.B.cutDiff < 0.2 && r.B.tailRms < 0.001, 'B damp 掐断无爆点且收净', JSON.stringify(r.B));
  T(r.C.busPeak < 0.99 && r.C.clipSamples === 0, 'C 最坏情况总线不削波', 'peak=' + r.C.busPeak + ' clip=' + r.C.clipSamples);
  T(Math.abs(r.D.pSeg - r.D.expect[0]) < 1e-6 && Math.abs(r.D.fSeg - r.D.expect[1]) < 1e-6,
    'D 力度时间线 p/f 段取值正确', JSON.stringify(r.D));
  T(r.E.same && r.E.diff && r.E.cents <= 4.01 && r.E.db <= 1.21,
    'E 扰动确定性与幅度（±4音分/±1.2dB 内）', JSON.stringify(r.E));
  T(r.F.preMax === 0 && r.F.corr < 0.2 && r.F.tailHF < r.F.headHF && r.F.lowRatio < 0.02,
    'F 混响IR：predelay零区/去相关/渐暗/无低频泥', JSON.stringify(r.F));
  T(r.G.g > 1 && r.G.g <= 4.001 && r.G.onset >= 0 && r.G.onset < 0.05 && r.G.effPeak > 0.08 && r.G.effPeak < 0.45,
    'G 归一：系数(1,4]/onset<50ms/生效峰值合理区间', JSON.stringify(r.G));
  T(r.H.dSpan > 0.04 && r.H.dSpan < 0.09 && r.H.dAccel && r.H.dGrad && r.H.uSpan <= 0.035 && r.H.uLight
    && r.H.acc.join() === '1.33,1.19,1,0.85,0.8,1.19',
    'H 扫弦力度型（下扫加速+梯度/上扫快而轻）+ 拍点重音表', JSON.stringify(r.H));

  console.log(errs.length ? '❌ 页面异常: ' + errs.slice(0, 3).join(' | ') : 'NO ERRORS');
  console.log(`PASS ${pass}/${pass + fail}`);
  await browser.close();
  process.exit(fail || errs.length ? 1 : 0);
})();
