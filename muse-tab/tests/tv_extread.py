#!/usr/bin/env python3
# v70.4 E 独立读取器（基石方案 docs/plan-2026-11-foundation.md §3.2 E）：用 music21 读谱友圈导出的 MusicXML，
# 逐谱表、逐小节报告 music21 自己读出来的东西，交给 tests/tv_extread.js 与谱面数据比对。本脚本只读、不判对错。
#   用法：python3 tv_extread.py 文件1.musicxml [文件2 …] > 结果.json
#   依赖：music21（pip install music21；本机开发可用 PYTHONPATH 指到装好的目录）。
#   输出：{文件名: {"parts": [{"id", "name", "measures": [{"n" 小节号, "bar" 拍号小节长（四分音符为 1）, "voices" [每个声部的时值和],
#           "fm" [这一声部是否只有一个整小节休止], "hi" 最后一个元素的结束点, "notes" 有音高的非倚音音头数（和弦逐音计，和弦名 ChordSymbol 不计）,
#           "nv" 声部数, "ev" [每个声部（按 voice 号）：{"id", "ev" [[小节内起点, 时值, 是休止, 是整小节休止]…], "end" 最后一个元素的终点}]}]}]} 或 {"err": "…"}
# v70.5 B 组（规格 §7.7、§10.4）：先滤掉没有可读内容（非倚音、非和弦名的 GeneralNote）的 Voice 再报声部——单谱表 part 里只有 <forward> 的声部
#   music21 也会建一个空 Voice（同谱表第二声部全是隐形休止时）；逐个报每个声部的 (offset, 时值)，交给 tv_extread.js 比对（层末尾是 forward 时声部终点小于拍号）
import json
import sys

try:
    import music21
    from music21 import converter, stream, note, chord, harmony
except Exception as e:  # pragma: no cover
    print(json.dumps({"__no_music21__": str(e)}))
    sys.exit(3)


def q(x):
    return round(float(x), 4)


def measure_info(m):
    bar = None
    try:
        bar = q(m.barDuration.quarterLength)
    except Exception:
        bar = None
    def readable(v):
        return [el for el in v.getElementsByClass(note.GeneralNote)
                if not el.duration.isGrace and not isinstance(el, harmony.ChordSymbol)]
    if m.hasVoices():
        voices = [v for v in m.voices if readable(v)]
        def vkey(v):
            try:
                return (0, float(v.id))
            except Exception:
                return (1, str(v.id))
        voices.sort(key=vkey)
    else:
        voices = [m]
    durs, fms, evs = [], [], []
    for v in voices:
        tot = 0.0
        els = readable(v)
        ev = [[q(el.offset), q(el.duration.quarterLength), isinstance(el, note.Rest), bool(getattr(el, 'fullMeasure', False) is True)] for el in els]
        evs.append({"id": str(getattr(v, 'id', '')) if v is not m else None, "ev": ev, "end": max([e[0] + e[1] for e in ev], default=0)})
        for el in els:
            tot += float(el.duration.quarterLength)
        durs.append(q(tot))
        # 这一声部只有一个整小节休止（<rest measure="yes"/>，music21 按拍号把它撑满整小节）
        fms.append(len(els) == 1 and isinstance(els[0], note.Rest) and bool(getattr(els[0], 'fullMeasure', False) is True))
    n = 0
    for el in m.recurse().getElementsByClass(note.GeneralNote):
        # 和弦名（<harmony> → ChordSymbol，也是 Chord 的子类）不是音头
        if el.duration.isGrace or isinstance(el, note.Rest) or isinstance(el, harmony.ChordSymbol):
            continue
        if isinstance(el, chord.Chord):
            n += len(el.pitches)
        elif isinstance(el, note.Note):
            n += 1
    try:
        hi = q(m.highestTime)
    except Exception:
        hi = None
    return {"n": m.number, "bar": bar, "voices": durs, "fm": fms, "hi": hi, "notes": n, "nv": len(voices), "ev": evs}


def read(path):
    sc = converter.parse(path, format="musicxml", forceSource=True)
    parts = []
    for p in sc.parts:
        ms = [measure_info(m) for m in p.getElementsByClass(stream.Measure)]
        parts.append({"id": p.id, "name": p.partName or "", "measures": ms})
    return {"parts": parts, "v": music21.__version__}


def main():
    out = {}
    for f in sys.argv[1:]:
        try:
            out[f] = read(f)
        except Exception as e:
            out[f] = {"err": type(e).__name__ + ": " + str(e)[:300]}
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
