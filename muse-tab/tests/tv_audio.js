/* tv_audio — 播放引擎数值回归（音质升级·阶段1 起）
   原则：位置/对齐用几何断言，音质/电平用数值断言——离线渲染 OfflineAudioContext，
   对 Float32Array 断言，不靠人耳抽查。合成声部含随机噪声激励，只断言包络/峰值/RMS，
   不断言逐样本值。
   覆盖：无削波 / 收音尾部静音 / 采样截断点无爆点（一阶差分探针）/ 采样路径有效 /
        多轨最坏情况总线安全 / 力度时间线作用于 TAB / 微扰动确定性（同位同值、异位异值）/
        响度归一系数与生效电平 / 混响 IR 性质 / v48.9 扫弦力度型与拍点重音表 /
        v49.0 力度→明暗联动 / 影子解码原子切换前置 / v49.1 乐句呼吸与踏板模拟决策函数。 */
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
  await pg.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */

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
    // 一段可辨识的持续乐音（用于数拍口径断言，不依赖采样包）
    const mkTone = (ctx, bus, when) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 440; g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.4, when + 0.01);
      g.gain.setTargetAtTime(0, when + 0.8, 0.05);
      o.connect(g); g.connect(bus.dry); o.start(when); o.stop(when + 1.4);
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

    // ── I 力度→明暗联动（v49.0）：同音同增益，vel 低者高次谐波显著衰减、低次谐波保留 ──
    {
      /* 度量踩过两个坑（记录防重蹈）：一阶差分/一阶高通级联对低音都不灵敏——165Hz 基频
         统治总能量，中频谐波经浅斜率泄漏淹没真实差异；且 buildBus 的压缩器是非线性器件
         会再生谐波。故：裸总线（绕开混响/压缩）+ Goertzel 频域点测谐波幅度。 */
      const mk = async (vel) => {
        const ctx = new OfflineAudioContext(2, SR * 2, SR);
        const dry = ctx.createGain(); dry.connect(ctx.destination);
        const wet = ctx.createGain(); wet.gain.value = 0; wet.connect(ctx.destination);
        await decodeInto(ctx, 52);
        sfTryPlay(ctx, { dry, wet }, 'acoustic_guitar_steel', midiFreq(52), 0.1, 1.2, 0.5, { vel });
        const buf = await ctx.startRendering();
        const ch = buf.getChannelData(0);
        const goe = (f) => { const a2 = Math.floor(0.15 * SR), b2 = Math.floor(0.65 * SR), N = b2 - a2;
          const w = 2 * Math.PI * f / SR, cw = 2 * Math.cos(w); let p0 = 0, p1 = 0, p2 = 0;
          for (let i = 0; i < N; i++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
            p0 = ch[a2 + i] * win + cw * p1 - p2; p2 = p1; p1 = p0; }
          return Math.sqrt(Math.max(0, p1 * p1 + p2 * p2 - cw * p1 * p2)); };
        const f0 = midiFreq(52);
        let high = 0; for (let h = 12; h <= 20; h++) high += goe(h * f0);
        return { low: goe(4 * f0), high };
      };
      const L = await mk(1.0), S = await mk(0.45);
      out.I = { loudHigh: +L.high.toFixed(2), softHigh: +S.high.toFixed(2),
        loudLow: +L.low.toFixed(2), softLow: +S.low.toFixed(2) };
    }

    // ── J 影子解码可等待（v49.0 原子切换前置）：resolve 时全部就绪、无 pending 标记 ──
    {
      const ctx = new OfflineAudioContext(2, SR, SR);
      const shadow = { notes: Object.assign({}, sfBanks['acoustic_guitar_steel'].notes), buf: {} };
      await sfDecodeAll(ctx, shadow);
      const keys = Object.keys(shadow.buf);
      out.J = { n: Object.keys(shadow.notes).length,
        dec: keys.filter(k => k[0] !== 'p').length, pend: keys.filter(k => k[0] === 'p').length };
    }

    // ── K 乐句呼吸 + 踏板模拟（v49.1）：调度决策纯函数断言 ──
    {
      out.K = {
        gBr: phraseGate(2, true), gNo: phraseGate(2, false), gMin: phraseGate(0.1, true),
        pdNext: pedalDur(10, 12, 0.9), pdEnd: pedalDur(10, null, 0.9),
        pdSame: pedalDur(10, 10.005, 0.9), pdFloor: pedalDur(5, 5.05, 2)
      };
    }

    // ── L 技法发声（v49.2）：推弦音高曲线 / 连奏起音 / 揉弦 LFO / 幅度表 ──
    {
      const bare = (ctx) => { const dry = ctx.createGain(); dry.connect(ctx.destination);
        const wet = ctx.createGain(); wet.gain.value = 0; wet.connect(ctx.destination); return { dry, wet }; };
      const rend = async (fx, legato) => {
        const ctx = new OfflineAudioContext(2, SR * 2, SR);
        let osc = 0; const orig = ctx.createOscillator.bind(ctx);
        ctx.createOscillator = () => { osc++; return orig(); };
        await decodeInto(ctx, 52);
        sfTryPlay(ctx, bare(ctx), 'acoustic_guitar_steel', midiFreq(52), 0.1, 1.5, 0.5,
          { vel: 1, fx, legato });
        const buf = await ctx.startRendering();
        return { ch: buf.getChannelData(0), osc };
      };
      const goe = (ch, f, a0, b0) => { const a2 = Math.floor(a0 * SR), b2 = Math.floor(b0 * SR), N = b2 - a2;
        const w = 2 * Math.PI * f / SR, cw = 2 * Math.cos(w); let p0 = 0, p1 = 0, p2 = 0;
        for (let i = 0; i < N; i++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
          p0 = ch[a2 + i] * win + cw * p1 - p2; p2 = p1; p1 = p0; }
        return Math.sqrt(Math.max(0, p1 * p1 + p2 * p2 - cw * p1 * p2)); };
      const f0 = midiFreq(52), fB = f0 * Math.pow(2, 2 / 12);
      const plain = await rend(null, false);
      const bent = await rend({ bend: { semi: 2, type: 'up' }, end: 1.4 }, false);
      const leg = await rend(null, true);
      const pk = (ch, a0, b0) => { let m = 0; for (let i = Math.floor(a0 * SR); i < Math.floor(b0 * SR); i++) m = Math.max(m, Math.abs(ch[i])); return m; };
      const vib = await rend({ vib: true, end: 1.4 }, false);
      out.L = {
        plainF0: +goe(plain.ch, f0, 0.5, 1.0).toFixed(2), plainB: +goe(plain.ch, fB, 0.5, 1.0).toFixed(2),
        bentF0: +goe(bent.ch, f0, 0.5, 1.0).toFixed(2), bentB: +goe(bent.ch, fB, 0.5, 1.0).toFixed(2),
        atkN: +pk(plain.ch, 0.1, 0.11).toFixed(4), atkL: +pk(leg.ch, 0.1, 0.11).toFixed(4),
        vibOsc: vib.osc,
        semis: [bendSemi('1/4'), bendSemi('1/2'), bendSemi('full'), bendSemi('1.5'), bendSemi(undefined)]
      };
    }

    // ── M 过载/失真音色（v49.3）：接线完整 + KS 回落最坏情况（强力和弦齐鸣）不削波 ──
    {
      const wired = ['elecod', 'elecdist'].every(k =>
        INSTRUMENTS[k] && INSTRUMENTS[k].type === 'ks' && INSTRUMENTS[k].drive > 2.4 && SF_MAP[k]);
      const names = [SF_MAP.elecod, SF_MAP.elecdist];
      const ch = await render(2.0, async (ctx, bus) => {
        const norm = 0.85, tb = makeTrackBus(ctx, bus, 0);
        const g5 = norm / Math.sqrt(5);
        [40, 47, 52, 40, 47].forEach((m, k) =>
          playInst('elecdist', ctx, tb, midiFreq(m), 0.1 + k * 0.012, 1.5, g5, false, { vel: 1.33 }));
      });
      let clip = 0, peak = 0;
      for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; if (a >= 0.995) clip++; }
      out.M = { wired, names, peak: +peak.toFixed(3), clip };
    }

    // ── N 技法第二批（v49.4）：泛音频率表/轮奏步长/摇把 dive 音高下潜/shake LFO/打板三型 ──
    {
      const f0 = midiFreq(52);
      const rat = (fret) => hmFreq(0, fret) / midiFreq(0);
      const bare = (ctx) => { const dry = ctx.createGain(); dry.connect(ctx.destination);
        const wet = ctx.createGain(); wet.gain.value = 0; wet.connect(ctx.destination); return { dry, wet }; };
      const goe = (ch, f, a0, b0) => { const a2 = Math.floor(a0 * SR), b2 = Math.floor(b0 * SR), N2 = b2 - a2;
        const w = 2 * Math.PI * f / SR, cw = 2 * Math.cos(w); let p0 = 0, p1 = 0, p2 = 0;
        for (let i = 0; i < N2; i++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N2);
          p0 = ch[a2 + i] * win + cw * p1 - p2; p2 = p1; p1 = p0; }
        return Math.sqrt(Math.max(0, p1 * p1 + p2 * p2 - cw * p1 * p2)); };
      const rendB = async (fx) => {
        const ctx = new OfflineAudioContext(2, SR * 2, SR);
        let osc = 0; const orig = ctx.createOscillator.bind(ctx);
        ctx.createOscillator = () => { osc++; return orig(); };
        await decodeInto(ctx, 52);
        sfTryPlay(ctx, bare(ctx), 'acoustic_guitar_steel', midiFreq(52), 0.1, 1.8, 0.5, { vel: 1, fx });
        const buf = await ctx.startRendering();
        return { ch: buf.getChannelData(0), osc };
      };
      const dive = await rendB({ bar: 'dive', end: 1.9 });
      const shake = await rendB({ bar: 'shake', end: 1.9 });
      // 打板三型：各自可闻 + 高低板频谱可区分（一阶差分比：高音板显著高于低音板）
      const ctx2 = new OfflineAudioContext(2, SR, SR);
      const b2 = bare(ctx2);
      percHit(ctx2, b2, 0.05, 'bass', 0.5); percHit(ctx2, b2, 0.35, 'snare', 0.5); percHit(ctx2, b2, 0.65, 'golpe', 0.5);
      const pch = (await ctx2.startRendering()).getChannelData(0);
      const seg = (a0, b0) => { let pk = 0, d = 0, tot = 0;
        for (let i = Math.floor(a0 * SR) + 1; i < Math.floor(b0 * SR); i++) { const a = Math.abs(pch[i]);
          if (a > pk) pk = a; const dd = pch[i] - pch[i - 1]; d += dd * dd; tot += pch[i] * pch[i]; }
        return { pk: +pk.toFixed(3), hf: +Math.sqrt(d / Math.max(1e-12, tot)).toFixed(3) }; };
      out.N = {
        hm: [rat(12), rat(7), rat(19), rat(5), rat(24), rat(9), rat(3)],
        trem: [tremStep(0.6, 1), tremStep(0.6, 2), tremStep(0.6, 3)],
        diveEarly: +goe(dive.ch, f0, 0.12, 0.33).toFixed(2), diveLate: +goe(dive.ch, f0, 1.3, 1.7).toFixed(2),
        shakeOsc: shake.osc,
        bass: seg(0.05, 0.3), snare: seg(0.35, 0.6), golpe: seg(0.65, 0.9)
      };
    }

    // ── O 柱式整列闷音（v49.5）：扫弦和弦列单音标 P.M. → 全列六弦 gate（真实 play 调度） ──
    {
      const s = createSong('guitar', { title: 'o', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
      const mk2 = (o) => ({ dur: 4, dotted: false, chord: '', strum: o.strum || '', tech: '', notes: o.notes || [] });
      s.measures[0].tabs[0] = [
        mk2({ strum: 'd', notes: [{ s: 6, f: 0 }, { s: 5, f: 2 }, { s: 4, f: 2 }, { s: 3, f: 1 }, { s: 2, f: 0 }, { s: 1, f: 0, tech: 'pm' }] }),
        mk2({ notes: [{ s: 1, f: 3 }] }), mk2({ notes: [{ s: 2, f: 1 }] }), mk2({ notes: [{ s: 3, f: 0 }] })
      ];
      if (typeof undoStack !== 'undefined') undoStack.length = 0;   // 绕过 guardReplace 确认对话（同 tv_gtech 惯例）
      loadSong(s);
      const rec = [];
      const orig = playInst;
      playInst = (ik, c2, b3, f, w, d, g2, m2, o2) => { rec.push({ w, d, o: o2 || {} }); };
      try { play(); } finally { stopPlay(); playInst = orig; }
      rec.sort((q, z) => q.w - z.w);
      const chord = rec.slice(0, 6), tail = rec.slice(6);
      out.O = { n: rec.length,
        chordGated: chord.every(q => q.o.damp === true && q.d < 0.45 && q.d > 0.15),
        durs: chord.map(q => +q.d.toFixed(2)),
        tailFree: tail.length === 3 && tail.every(q => q.d > 0.45) };
    }

    // ── P 两音式推弦（v49.9 幅度=目标音真实音高差 + v53.0 圆圈目标音不拨奏）：
    //    b 7→9 品=up +2；bd 9→7 品=fall −2；两个圆圈目标音（ci1/ci3）静默，
    //    源音延音接管目标时值（b 源的 ring 从 1 拍顺延到 ≥2 拍） ──
    {
      const s = createSong('guitar', { title: 'p', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
      const mk3 = (o) => ({ dur: 4, dotted: false, chord: '', strum: '', tech: '', notes: o.notes || [] });
      s.measures[0].tabs[0] = [
        mk3({ notes: [{ s: 3, f: 7, tech: 'b', tk: { mi: 0, ci: 1, si: 3 } }] }),
        mk3({ notes: [{ s: 3, f: 9 }] }),
        mk3({ notes: [{ s: 3, f: 9, tech: 'bd', tk: { mi: 0, ci: 3, si: 3 } }] }),
        mk3({ notes: [{ s: 3, f: 7 }] })];
      if (typeof undoStack !== 'undefined') undoStack.length = 0;
      loadSong(s);
      const rec = []; const orig = playInst;
      playInst = (ik, c2, b3, f, w, d, g2, m2, o2) => { rec.push({ w, d, fx: (o2 && o2.fx) || null }); };
      try { play(); } finally { stopPlay(); playInst = orig; }
      rec.sort((q, z) => q.w - z.w);
      const spb = 60 / song.tempo;
      out.P = { n: rec.length, b: rec[0] && rec[0].fx && rec[0].fx.bend, bd: rec[1] && rec[1].fx && rec[1].fx.bend,
        bRingBeats: rec[0] ? +(rec[0].d / spb).toFixed(2) : 0 };
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

    // ── Q v60.8 循环延音：造一段 1 秒的合成采样，让它播 3 秒 ──
    //    有循环点 → 尾部应仍在响；抽掉循环点 → 源 1 秒耗尽，尾部必是静音。
    //    这样断言不依赖真实音色包（内嵌采样里没有弦乐），且直接证明机制本身。
    {
      const NAME = 'string_ensemble_1', MIDI = 69;   // A4 → rate=1，不变速便于对齐
      const mk = (ctx) => {
        const b = ctx.createBuffer(1, Math.floor(SR * 1.0), SR);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * 440 * i / SR) * 0.5;
        sfBanks[NAME] = { status: 'ready', notes: { 69: 1 }, buf: {} };
        sfBanks[NAME].buf[ctx.sampleRate + ':' + MIDI] = { b, g: 1, o: 0 };
      };
      const keepLoop = SF_LOOPS[NAME];
      // 有循环点：整周期区间（440Hz 周期 = SR/440 样），避免测试自身引入接缝
      const per = SR / 440, ls = Math.round(per * 20) / SR, le = Math.round(per * 400) / SR;
      const play = async (withLoop) => {
        SF_LOOPS[NAME] = withLoop ? { 69: [ls, le] } : {};
        return await render(6.6, async (ctx, bus) => {
          mk(ctx);
          sfTryPlay(ctx, bus, NAME, 440, 0.05, 3.0, 0.9, null);
        });
      };
      const chL = await play(true), chN = await play(false);
      SF_LOOPS[NAME] = keepLoop;
      out.Q = {
        // 2.4–2.8s：远超 1 秒采样长度，只有循环生效才有声
        loopTail: +stats(chL, SR * 2.4, SR * 2.8).rms.toFixed(5),
        noLoopTail: +stats(chN, SR * 2.4, SR * 2.8).rms.toFixed(5),
        // 接缝探针：整个循环期内的最大一阶差分，与主体峰值比
        seamRel: +(maxDiff(chL, SR * 0.3, SR * 2.9) / Math.max(1e-9, stats(chL, SR * 0.3, SR * 2.9).peak)).toFixed(4),
        /* 收音后必须真正归零——natLen=Infinity 最大的风险就是「源永不停」。
           源停在 4.65s：收音自 3.05s 起、tau 跑满 8tau。
           **v60.9 起 tau 由 SF_REL 决定**（弦乐 0.2，此前硬编码 0.05），收音从 0.4s 变成 1.6s，
           故这两个取样窗整体后移、渲染时长同步加到 6.6s——量的是「收音跑完之后」，
           窗口没跟着标定走就会量在收音中段，读数偏高（本版实测踩到，非回归）。
           此后母线卷积混响仍有尾巴，所以判据不是「绝对静音」而是「持续衰减」——
           源若卡住不停，电平会**恒定**而非下降。 */
        tailA: +stats(chL, SR * 4.8, SR * 5.1).rms.toFixed(6),    // 停后 0.15~0.45s
        tailB: +stats(chL, SR * 6.0, SR * 6.3).rms.toFixed(6),    // 停后 1.35~1.65s
        body: +stats(chL, SR * 1.0, SR * 2.8).rms.toFixed(5),     // 循环主体电平（参照）
        relMid: +stats(chL, SR * 3.1, SR * 3.2).rms.toFixed(5),   // 衰减中段应仍有声（证明是平滑收音不是硬切）
      };
    }


    // ── R v60.8 数拍 count-in：起播前打满一小节空拍，乐音整体后移 ──
    //    走真实 play() 太重（要真 ctx），这里直接验证排程口径：
    //    数拍段只有拍点、无乐音；乐音起点 = 原起点 + beats*spb。
    {
      const spb = 0.5, beats = 4;                    // 120bpm、4/4
      const ci = await render(3.2, async (ctx, bus) => {
        const t0 = 0.05, t = t0 + beats * spb;       // 与 play() 内同一算式
        for (let b = 0; b < beats; b++) metroClick(ctx, bus, t0 + b * spb, b === 0);
        mkTone(ctx, bus, t);                          // 乐音落在数拍之后
      });
      const noci = await render(3.2, async (ctx, bus) => { mkTone(ctx, bus, 0.05); });
      out.R = {
        ciClicks: +stats(ci, 0, SR * 2.0).rms.toFixed(5),      // 数拍段（0~2s）应只有拍点
        ciMusic: +stats(ci, SR * 2.1, SR * 3.0).rms.toFixed(4), // 乐音段应有声
        ciQuietBeforeMusic: +stats(ci, SR * 1.6, SR * 1.95).rms.toFixed(5), // 末拍与乐音之间应基本安静
        baseMusicEarly: +stats(noci, SR * 0.1, SR * 0.9).rms.toFixed(4),    // 对照：不数拍时乐音一开头就有
        ciMusicEarly: +stats(ci, SR * 0.6, SR * 0.9).rms.toFixed(5),        // 数拍时同一时刻不该有乐音
      };
    }

    // ── S v60.9 逐音色收音时长 + 力度持平音色 ──
    //    两条都用**同一段合成采样**跑，两个音色名唯一的差别就是标定表里的值，
    //    这样差异只可能来自新表本身，不会被真实音色包的音质差异污染。
    {
      const MIDI = 52, F0 = midiFreq(MIDI);
      const keepBank = { mb: sfBanks['music_box'], ep: sfBanks['electric_piano_1'],
        st: sfBanks['acoustic_guitar_steel'] };
      /* 采样造成**等幅**（不自带衰减）：否则采样自身的包络会盖过收音包络，量不出 tau 的差别。 */
      const mkBank = (ctx, name, saw) => {
        const b = ctx.createBuffer(1, Math.floor(SR * 2.0), SR), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          if (saw) { let v = 0; for (let h = 1; h <= 24; h++) v += Math.sin(2 * Math.PI * h * F0 * i / SR) / h;
            d[i] = v * 0.25; }                                  // 富含高次谐波，供滤波器有东西可滤
          else d[i] = Math.sin(2 * Math.PI * F0 * i / SR) * 0.5;
        }
        sfBanks[name] = { status: 'ready', notes: { [MIDI]: 1 }, buf: {} };
        sfBanks[name].buf[ctx.sampleRate + ':' + MIDI] = { b, g: 1, o: 0 };
      };

      /* S1 收音时长：八音盒（tau 0.438，梳齿无制音机构）vs 电钢琴（tau 0.025，毡片立刻压住）。
         同音同时值，写定时值 0.5s 结束后，八音盒应仍在响、电钢琴应已静音。 */
      const tail = async (name) => {
        const ctx = new OfflineAudioContext(2, SR * 2.5, SR);
        const dry = ctx.createGain(); dry.connect(ctx.destination);
        const wet = ctx.createGain(); wet.gain.value = 0; wet.connect(ctx.destination);
        mkBank(ctx, name, false);
        sfTryPlay(ctx, { dry, wet }, name, F0, 0.05, 0.5, 0.9, null);
        const ch = (await ctx.startRendering()).getChannelData(0);
        /* after = 写定时值刚结束那一段（0.5s 时值 → 收音自 0.49s 起）：这里才是
           「余韵长短」的用户可感处。far 再往后取一段，用来证明最终确实收净。 */
        return { body: stats(ch, SR * 0.1, SR * 0.4).rms,
          after: stats(ch, SR * 0.6, SR * 1.0).rms,
          far: stats(ch, SR * 1.9, SR * 2.1).rms };
      };
      const mb = await tail('music_box'), ep = await tail('electric_piano_1');

      /* S2 持平音色：八音盒在 SF_VEL_FLAT 里→不建低通；钢弦吉他不在→照旧滤。
         同一段锯齿采样、同一个 vel，量 12–20 次谐波的能量差。
         窗口取 0.15–0.65s，两者都还在满增益段，避开 S1 那条收音差异。 */
      const hi = async (name, vel) => {
        const ctx = new OfflineAudioContext(2, SR * 2, SR);
        const dry = ctx.createGain(); dry.connect(ctx.destination);
        const wet = ctx.createGain(); wet.gain.value = 0; wet.connect(ctx.destination);
        mkBank(ctx, name, true);
        sfTryPlay(ctx, { dry, wet }, name, F0, 0.1, 1.2, 0.5, { vel });
        const ch = (await ctx.startRendering()).getChannelData(0);
        const goe = (f) => { const a2 = Math.floor(0.15 * SR), b2 = Math.floor(0.65 * SR), N = b2 - a2;
          const w = 2 * Math.PI * f / SR, cw = 2 * Math.cos(w); let p0 = 0, p1 = 0, p2 = 0;
          for (let i = 0; i < N; i++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
            p0 = ch[a2 + i] * win + cw * p1 - p2; p2 = p1; p1 = p0; }
          return Math.sqrt(Math.max(0, p1 * p1 + p2 * p2 - cw * p1 * p2)); };
        let h = 0; for (let k = 12; k <= 20; k++) h += goe(k * F0);
        return h;
      };
      const flatSoft = await hi('music_box', 0.45), curvSoft = await hi('acoustic_guitar_steel', 0.45);
      sfBanks['music_box'] = keepBank.mb; sfBanks['electric_piano_1'] = keepBank.ep;
      sfBanks['acoustic_guitar_steel'] = keepBank.st;

      out.S = {
        mbBody: +mb.body.toFixed(4), mbAfter: +mb.after.toFixed(4), mbFar: +mb.far.toFixed(5),
        epBody: +ep.body.toFixed(4), epAfter: +ep.after.toFixed(5),
        flatSoft: +flatSoft.toFixed(2), curvSoft: +curvSoft.toFixed(2),
        // 表结构自洽：两张表的键都必须是真实音色名（打错字会静默失效，不报错）
        relN: Object.keys(SF_REL).length,
        relAllMapped: Object.keys(SF_REL).every(k => Object.values(SF_MAP).indexOf(k) >= 0),
        flatAllMapped: Array.from(SF_VEL_FLAT).every(k => Object.values(SF_MAP).indexOf(k) >= 0),
        flatNotSustain: Array.from(SF_VEL_FLAT).every(k => !SF_SUSTAIN.has(k)),
      };
    }

    // ── T v60.10 修 v60.9 的两处回归（都是对抗式复核查出来的，不是猜的）──
    {
      const MIDI = 52, F0 = midiFreq(MIDI);
      /* 两条都跑**真实 sfTryPlay**、再从波形反解出实际生效的 tau。
         （最初 T1 写成「把公式在测试里再算一遍」——那是在测测试自己，抽掉修复照样绿，
           等于没有防线；改成走生产代码。） */
      const measureTau = async (name, midi, dur, useLoop) => {
        const f0 = midiFreq(midi);
        const keep = sfBanks[name], keepLp = SF_LOOPS[name];
        const c = new OfflineAudioContext(2, SR * 4, SR);
        const d1 = c.createGain(); d1.connect(c.destination);
        const w1 = c.createGain(); w1.gain.value = 0; w1.connect(c.destination);
        const b = c.createBuffer(1, Math.floor(SR * 2.0), SR), dd = b.getChannelData(0);
        for (let i = 0; i < dd.length; i++) dd[i] = Math.sin(2 * Math.PI * f0 * i / SR) * 0.5;
        sfBanks[name] = { status: 'ready', notes: { [midi]: 1 }, buf: {} };
        sfBanks[name].buf[c.sampleRate + ':' + midi] = { b, g: 1, o: 0 };
        if (!useLoop) SF_LOOPS[name] = {};             // 造出「持续音色但该音高没有循环点」
        sfTryPlay(c, { dry: d1, wet: w1 }, name, f0, 0.05, dur, 0.9, null);
        const ch = (await c.startRendering()).getChannelData(0);
        sfBanks[name] = keep; SF_LOOPS[name] = keepLp;
        const bd = stats(ch, SR * 0.3, SR * 1.5).rms;
        const HI = bd * 1.2, LO = bd * 0.02;
        let la = ch.length - 1; while (la > 0 && Math.abs(ch[la]) < LO) la--;
        let s0 = la; while (s0 > 0 && Math.abs(ch[s0]) < HI) s0--;
        return { tau: ((la - s0) / SR) / Math.log(HI / LO), body: bd };
      };
      /* T1 持续音色**缺循环点**时（choir_aahs 的 MIDI 22/25/27/30/31/32 确实没有，
         是 v60.8 循环检测未通过的那 6 个）：dur ≥ 采样长度 → room 触底 0.02，
         v60.9 会把 tau 压到 0.0025（20ms 从满幅收完，断音感）。下限应把它兜回 0.05。 */
      const noLoop = await measureTau('choir_aahs', 22, 3.0, false);

      /* T2 真实排程口径下的 let-ring 收音时长。
         生产里非持续音色的非 damp 分支 dur 恒 ≥3s（TAB 末音 6.0 / 简谱末音 max(rhythm,6.0)），
         于是 min(natLen,dur)=natLen、room 只剩 0.055——正是 T1 那条被压扁的路径。
         这里就按生产口径传 dur=6.0，量收音从起点到静音跨了多久。 */
      const keepMb = sfBanks['music_box'];
      const ctx = new OfflineAudioContext(2, SR * 4, SR);
      const dry = ctx.createGain(); dry.connect(ctx.destination);
      const wet = ctx.createGain(); wet.gain.value = 0; wet.connect(ctx.destination);
      {   // 等幅 2 秒采样：采样自身不衰减，量到的就是收音包络本身
        const b = ctx.createBuffer(1, Math.floor(SR * 2.0), SR), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * F0 * i / SR) * 0.5;
        sfBanks['music_box'] = { status: 'ready', notes: { [MIDI]: 1 }, buf: {} };
        sfBanks['music_box'].buf[ctx.sampleRate + ':' + MIDI] = { b, g: 1, o: 0 };
      }
      sfTryPlay(ctx, { dry, wet }, 'music_box', F0, 0.05, 6.0, 0.9, null);
      const ch2 = (await ctx.startRendering()).getChannelData(0);
      sfBanks['music_box'] = keepMb;
      /* 从末尾回溯量收音跨度，再反解出实际生效的 tau —— 直接以 tau 为单位断言，
         比拍一个「跨度 ≥ 多少秒」的魔数清楚：指数衰减下，从 HI 倍幅跌到 LO 倍幅
         耗时 = tau·ln(HI/LO)，所以 tau = 跨度 / ln(HI/LO)。 */
      const body = stats(ch2, SR * 0.3, SR * 1.5).rms;
      const HI = body * 1.2, LO = body * 0.02;
      let last = ch2.length - 1; while (last > 0 && Math.abs(ch2[last]) < LO) last--;
      let st = last; while (st > 0 && Math.abs(ch2[st]) < HI) st--;
      const relSpan = (last - st) / SR;
      const impliedTau = relSpan / Math.log(HI / LO);

      out.T = { noLoopTau: +noLoop.tau.toFixed(4), noLoopBody: +noLoop.body.toFixed(4),
        relSpan: +relSpan.toFixed(3), impliedTau: +impliedTau.toFixed(4), body: +body.toFixed(4) };
    }

    return out;
  });

  T(r.Q.loopTail > 0.02, 'Q1 循环延音：超出采样长度后仍在发声', JSON.stringify(r.Q));
  T(r.Q.noLoopTail < 0.001, 'Q2 对照组：无循环点时同一时刻已静音（证明差异来自循环）', 'rms=' + r.Q.noLoopTail);
  T(r.Q.seamRel < 0.3, 'Q3 循环接缝无爆点（一阶差分相对主体峰值）', 'rel=' + r.Q.seamRel);
  T(r.Q.tailB < r.Q.tailA * 0.5 && r.Q.tailA < r.Q.body * 0.05,
    'Q4 源确实停了：残响持续衰减且远低于主体（Infinity 不会让源失控长鸣）',
    `tail ${r.Q.tailA}→${r.Q.tailB} vs 主体 ${r.Q.body}`);
  T(r.Q.relMid > 0.01, 'Q5 收音是平滑指数衰减而非硬切', 'rms=' + r.Q.relMid);
  T(r.R.ciClicks > 0.0005 && r.R.ciMusicEarly < r.R.baseMusicEarly * 0.1,
    'R1 数拍段只有拍点、没有乐音（乐音确实整体后移）', JSON.stringify(r.R));
  T(r.R.ciMusic > 0.05, 'R2 数拍结束后乐音正常进入', 'rms=' + r.R.ciMusic);
  T(r.R.ciQuietBeforeMusic < r.R.ciMusic * 0.2, 'R3 末拍与乐音之间是安静的预备空档', 'rms=' + r.R.ciQuietBeforeMusic);
  /* S v60.9：同一段合成采样、两个音色名，差别只来自标定表 */
  T(r.S.mbBody > 0.05 && r.S.epBody > 0.05, 'S1a 两音色主体段都正常发声（对照基准成立）', JSON.stringify(r.S));
  T(r.S.mbAfter > r.S.mbBody * 0.1, 'S1b 长余韵音色（八音盒）写定时值后明显仍在响', 'after=' + r.S.mbAfter + ' body=' + r.S.mbBody);
  T(r.S.epAfter < r.S.mbAfter * 0.05, 'S1c 短余韵音色（电钢琴）同一时刻已收净', 'ep=' + r.S.epAfter + ' mb=' + r.S.mbAfter);
  T(r.S.mbFar < r.S.mbBody * 0.01, 'S1d 长余韵最终仍收净（tau 受剩余素材封顶，不会拖到源耗尽）', 'far=' + r.S.mbFar);
  T(r.S.flatSoft > r.S.curvSoft * 2, 'S2 持平音色弱奏不被压暗（八音盒高次谐波远高于走曲线的钢弦吉他）',
    'flat=' + r.S.flatSoft + ' curve=' + r.S.curvSoft);
  T(r.S.relN === 12 && r.S.relAllMapped, 'S3a SF_REL 覆盖全部 12 音色且键名都是真实音色名', 'n=' + r.S.relN);
  T(r.S.flatAllMapped && r.S.flatNotSustain, 'S3b SF_VEL_FLAT 键名有效且不含持续音色（持续音色本就不过滤波器）', '');
  /* T v60.10：修 v60.9 的回归 */
  T(r.T.noLoopTau >= 0.045,
    'T1 持续音色缺循环点且时值超采样长度时 tau 兜回 0.05（v60.9 曾塌到 0.0025＝20ms 硬收）',
    '反解 tau=' + r.T.noLoopTau);
  T(r.T.impliedTau >= 0.018,
    'T2 生产口径（dur=6.0）下实际生效的 tau 不低于 0.02（v60.9 曾被压到 0.0069）',
    '反解 tau=' + r.T.impliedTau + ' 跨度=' + r.T.relSpan + 's');
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
  T(r.I.softHigh < r.I.loudHigh * 0.65 && r.I.softLow > r.I.loudLow * 0.6,
    'I 力度→明暗：轻音高次谐波衰减≥35%、低次谐波主体保留', JSON.stringify(r.I));
  T(r.J.n > 0 && r.J.dec === r.J.n && r.J.pend === 0,
    'J 影子解码：resolve 时全部就绪、零 pending（原子切换前置）', JSON.stringify(r.J));
  T(Math.abs(r.K.gBr - 1.7) < 1e-9 && r.K.gNo === 2 && Math.abs(r.K.gMin - 0.12) < 1e-9
    && r.K.pdNext === 2 && r.K.pdEnd === 3 && r.K.pdSame === 3 && Math.abs(r.K.pdFloor - 0.08) < 1e-9,
    'K 乐句呼吸收音 15% + 踏板延音到下一发声列/末尾≥3s', JSON.stringify(r.K));
  T(r.L.plainF0 > r.L.plainB * 2 && r.L.bentB > r.L.bentF0 * 2,
    'L1 推弦音高曲线：稳态段能量从品位音移到推起音（全音）', JSON.stringify({ pF: r.L.plainF0, pB: r.L.plainB, bF: r.L.bentF0, bB: r.L.bentB }));
  T(r.L.atkL < r.L.atkN * 0.7, 'L2 连奏起音：击/勾/点目标音 10ms 内包络显著低于常规拨弦',
    'atkN=' + r.L.atkN + ' atkL=' + r.L.atkL);
  T(r.L.vibOsc === 1 && r.L.semis.join() === '0.5,1,2,3,2',
    'L3 揉弦 LFO 已建 + 推弦幅度表（¼/½/full/1½/默认full）', JSON.stringify({ osc: r.L.vibOsc, semis: r.L.semis }));
  T(r.M.wired && r.M.names.join() === 'overdriven_guitar,distortion_guitar' && r.M.peak < 0.99 && r.M.clip === 0,
    'M 过载/失真接线完整 + 失真强力和弦最坏情况不削波', JSON.stringify(r.M));
  T(r.N.hm.join() === '2,3,3,4,4,5,2' && r.N.trem.join() === '0.3,0.15,0.075',
    'N1 自然泛音谐波表（12→2/7·19→3/5·24→4/9→5/其余→2）+ 轮奏步长', JSON.stringify({ hm: r.N.hm, trem: r.N.trem }));
  T(r.N.diveLate < r.N.diveEarly * 0.3 && r.N.shakeOsc === 1,
    'N2 摇把：dive 尾段基频能量大幅离位 + shake LFO 已建', JSON.stringify({ e: r.N.diveEarly, l: r.N.diveLate, osc: r.N.shakeOsc }));
  T(r.N.bass.pk > 0.02 && r.N.snare.pk > 0.02 && r.N.golpe.pk > 0.02 && r.N.snare.hf > r.N.bass.hf * 3,
    'N3 打板三型可闻且高/低板频谱可区分', JSON.stringify({ b: r.N.bass, s: r.N.snare, g: r.N.golpe }));
  T(r.O.n === 9 && r.O.chordGated && r.O.tailFree,
    'O 柱式和弦标 P.M.=整列六弦 gate（扫弦错开不再逃出范围）', JSON.stringify(r.O));
  T(r.P.n === 2 && r.P.b && r.P.b.semi === 2 && r.P.b.type === 'up' && r.P.bd && r.P.bd.semi === -2 && r.P.bd.type === 'fall'
    && r.P.bRingBeats >= 1.9,
    'P 两音式推弦：幅度=真实音高差 + 圆圈目标音静默 + 源音延音贯穿目标', JSON.stringify(r.P));

  console.log(errs.length ? '❌ 页面异常: ' + errs.slice(0, 3).join(' | ') : 'NO ERRORS');
  console.log(`PASS ${pass}/${pass + fail}`);
  await browser.close();
  process.exit(fail || errs.length ? 1 : 0);
})();
