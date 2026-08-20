#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 free-midi-chords（MIT · Copyright (c) 2019 Ludovic Drolez）的 chords.py 导入和弦进行套路。

用法：python3 deploy/prog-import.py <path-to-free-midi-chords/chords.py>

为什么可以直接用：该项目以 MIT 发布，进行表在源码里是**级数文本 + 情绪标签**（不是 MIDI），
所以不必解析 MIDI，也不必分发它的任何文件——我们只取「级数序列」这一层，并按 MIT 要求保留署名。

归一化规则（把它的记法映射到本项目的候选表）：
  大调候选 = I IV V V7 vi ii iii            小调候选 = i ii0 III iv v V V7 VI VII
  · 加音/挂留/六度/九度一律回落到底和弦：Isus2→I、Vadd9→V、vi7→vi、IV6→IV …
  · Idom7 / I7（本表里是主音上的七和弦）→ I；Vdom7 / V7 → V7
  · 小调 ii（本表按半减/减记）→ ii0；v7 → v（自然小调的小七，不是和声小调属七）
  · 含**本项目表达不了**的级数则整条丢弃（不做「删掉一格再凑」——那会改掉进行本身）：
    大调的 vii°、小调的 v°、以及全部 modal 表（♭II/♭III/♭VI/♭VII 在大调语境下我们没有候选）
输出：可直接粘进 index.html 的 JS 数组片段 + 一份统计与丢弃原因报告。
"""
import re
import sys
import json

MAJ_OK = {'I', 'IV', 'V', 'V7', 'vi', 'ii', 'iii'}
MIN_OK = {'i', 'ii0', 'III', 'iv', 'v', 'V', 'V7', 'VI', 'VII'}

# 后缀剥离：加音/挂留/六度/九度/七度 → 底和弦
SUFFIX = re.compile(r'(sus\d|add\d+|dom7|maj7|m7|M7|7|6|9|69|5|M-5|M)$')


def norm_major(tok):
    t = tok
    if t in ('Vdom7', 'V7'):
        return 'V7'
    while True:
        t2 = SUFFIX.sub('', t)
        if t2 == t or not t2:
            break
        t = t2
    if t in ('vii', 'viidim'):
        return None            # 大调候选里没有 vii°
    return t if t in MAJ_OK else None


def norm_minor(tok):
    t = tok
    if t in ('Vdom7',):
        return 'V7'
    if t == 'v7':
        return 'v'             # 自然小调 v 的七和弦，不是和声小调属七
    if t in ('vdim', 'vodim', 'v0'):
        return None            # v° 我们没有
    if t in ('ii', 'ii5', 'iidim', 'iim7'):
        return 'ii0'
    while True:
        t2 = SUFFIX.sub('', t)
        if t2 == t or not t2:
            break
        t = t2
    if t == 'ii':
        return 'ii0'
    if t in ('vdim',):
        return None
    return t if t in MIN_OK else None


def parse_list(src, name):
    m = re.search(name + r'\s*=\s*\[(.*?)\n\]', src, re.S)
    if not m:
        return []
    out = []
    for line in m.group(1).split('\n'):
        s = line.strip()
        if not s.startswith('"'):
            continue
        body = s.strip().strip(',').strip('"')
        if '=' in body:
            prog, mood = body.split('=', 1)
        else:
            prog, mood = body, ''
        out.append((prog.split(), mood.strip()))
    return out


def convert(entries, mode):
    norm = norm_major if mode == 'M' else norm_minor
    kept, dropped = [], []
    for toks, mood in entries:
        ids = [norm(t) for t in toks]
        if any(x is None for x in ids):
            bad = [t for t, x in zip(toks, ids) if x is None]
            dropped.append((' '.join(toks), '表达不了：' + '/'.join(sorted(set(bad)))))
            continue
        if len(ids) < 3:
            dropped.append((' '.join(toks), '长度 <3'))
            continue
        if len(ids) > 8:
            dropped.append((' '.join(toks), '长度 >8（跨度上限）'))
            continue
        # 退化项必须剔除：源表里 "I I7 Idom7 I7" 这类是**同一个和弦的色彩变化**，
        # 归一化后成了 I-I-I-I。它不是进行；入库只会让「静态主和弦」段也算命中，
        # 白白虚增命中率，还可能靠先验压过更好的解。
        if len(set(ids)) < 2:
            dropped.append((' '.join(toks), '退化：归一化后只剩一个和弦'))
            continue
        # 准退化同样要剔除：某一个和弦占到 3/4 以上（如 "I I7 Idom7 IV" → I-I-I-IV）。
        # 这类条目的音乐内容原本在**七/加音的色彩变化**上，而那一层我们表达不了；
        # 归一化后它几乎没有辨识力，却照样带着先验去压别的解——
        # 实测把 tv_arrange T13 的末小节从 Am 掰成 F（旋律 3-2-6 明显更贴 Am）。
        top = max(ids.count(x) for x in set(ids))
        if top / len(ids) >= 0.75:
            dropped.append((' '.join(toks), '准退化：单一和弦占比 %d/%d' % (top, len(ids))))
            continue
        kept.append((ids, mood))
    return kept, dropped


def canon(ids):
    """判重用的规范形：本身 + 所有旋转里字典序最小的一个（引擎自己会试旋转）。"""
    rots = [tuple(ids[i:] + ids[:i]) for i in range(len(ids))]
    return min(rots)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    src = open(sys.argv[1], encoding='utf-8').read()

    report = {}
    out_js = []
    seen = set()

    # 已在 index.html 里手写的核心套路——用规范形判重，避免重复入库
    CORE = {
        'M': [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['IV', 'V', 'iii', 'vi'],
              ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], ['I', 'IV', 'V', 'I'],
              ['I', 'IV', 'I', 'V'], ['ii', 'V', 'I']],
        'm': [['i', 'VII', 'VI', 'VII'], ['i', 'VI', 'III', 'VII'], ['i', 'VII', 'VI', 'V'],
              ['i', 'iv', 'v', 'i'], ['i', 'iv', 'VII', 'III']],
    }
    for mode, lst in CORE.items():
        for ids in lst:
            seen.add((mode,) + canon(ids))

    for mode, name in (('M', 'prog_maj'), ('m', 'prog_min')):
        entries = parse_list(src, name)
        kept, dropped = convert(entries, mode)
        uniq, dup = [], 0
        for ids, mood in kept:
            k = (mode,) + canon(ids)
            if k in seen:
                dup += 1
                continue
            seen.add(k)
            uniq.append((ids, mood))
        report[name] = dict(total=len(entries), kept=len(kept), unique=len(uniq),
                            dup=dup, dropped=len(dropped),
                            drop_reasons=dropped)
        for i, (ids, mood) in enumerate(uniq):
            slots = ','.join('[%s]' % ','.join("'%s'" % x for x in ids)
                             for x in [ids])  # placeholder, replaced below
            slot_js = ','.join("['%s']" % x for x in ids)
            tid = ('%s%d' % ('x' if mode == 'M' else 'xm', i + 1))
            label = '-'.join(ids)
            out_js.append("  {id:'%s', name:'%s', mode:'%s', rot:false, w:0.18, mood:'%s', slots:[%s]},"
                          % (tid, label, mode, mood, slot_js))

    print('=' * 72)
    for k, v in report.items():
        print('%s：原表 %d 条 → 可表达 %d → 去重后新增 %d（与既有核心/彼此重复 %d，丢弃 %d）'
              % (k, v['total'], v['kept'], v['unique'], v['dup'], v['dropped']))
    print('=' * 72)
    print('\n丢弃明细（前 12 条）：')
    for k, v in report.items():
        for prog, why in v['drop_reasons'][:12]:
            print('  [%s] %-40s %s' % (k, prog, why))
    print('\n注：modal 表整表未导入——♭II/♭III/♭VI/♭VII 在大调语境下本项目没有候选级数。\n')
    print('=' * 72)
    print('/* 以下由 deploy/prog-import.py 从 free-midi-chords 导入 */')
    print('\n'.join(out_js))


if __name__ == '__main__':
    main()
