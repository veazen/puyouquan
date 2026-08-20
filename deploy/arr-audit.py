#!/usr/bin/env python3
"""编配资产审计：节奏型库 + 配和弦候选（零依赖）。

产品负责人反馈「自动编配和弦和节奏型库非常低级、错误百出」。
这个脚本的作用是把「错误」从主观印象变成**可复算的清单**——
能被脚本判定的，一条条列出来；判定不了的（好不好听），明确标为需要人工评审。

    python3 deploy/arr-audit.py [muse-tab/index.html]

检查项
------
节奏型库（RHY 库）
  R1 拍数自洽：ev 时值之和是否等于该分类声明的拍数
  R2 分类声明与内容一致：标「无休止」的类里不得出现休止（r）
  R3 重复：同一分类内 ev 序列完全相同的条目
  R4 元数据缺口：style / level / meter / technique 是否存在（P0-2 的验收口径）
  R5 低音交替：分解型里 b（根音）与 B（交替低音）的使用是否成对出现

配和弦候选（CHORD_CANDS）
  C1 调式覆盖：候选集是否只有大调级数
  C2 和弦类型覆盖：是否缺 减三 / 半减 / 挂留 / 加九
  C3 终止式：是否有 ii-V-I、半终止等模板（而不是只在末小节偏 I）

**判定不了的**（脚本给不出结论，需要专业评审）：某条节奏型在某风格下是否地道、
和声进行是否符合该曲风惯例、力度与加花是否合乐——这些进人工评审清单。
"""
import json
import re
import sys

# ev 里的时值分母 → 占多少个四分音符
DUR_BEATS = {1: 4.0, 2: 2.0, 4: 1.0, 8: 0.5, 16: 0.25, 32: 0.125}

# 分类名 → 该类每条应有的拍数（按四分音符计）
def cat_beats(cat):
    if '一拍' in cat:
        return 1.0
    if '半小节' in cat or '2拍' in cat:
        return 2.0
    if '3/4' in cat or '6/8' in cat:
        return 3.0
    if '2/4' in cat or '4/4' in cat:
        return 4.0
    return None            # 无法从分类名判定，跳过 R1


def _match(seg, k, op, cl):
    """从 seg[k]（应为 op）开始做括号配对，返回内容与结束下标。"""
    assert seg[k] == op
    d, i = 0, k
    while i < len(seg):
        if seg[i] == op:
            d += 1
        elif seg[i] == cl:
            d -= 1
            if d == 0:
                return seg[k + 1:i], i + 1
        i += 1
    raise ValueError('括号未闭合')


def load_lib(path):
    """解析节奏型库。

    **这个解析器被自己坑过一次，三处都记下来**——审计工具本身不可信，
    它的结论就是噪音：
      ① `cat:'…'` 与 `items:[` 之间可能插别的键（`partial:true`），
         写死 `cat:'…',\s*items:` 会**整类漏掉**（当时漏了 2 类）；
      ② 条目里 `span:` 可能出现在 `ev:` **之前**，靠字段顺序的正则会失配；
      ③ 库里有**两种**条目形态——吉他型 `ev:[[token,dur],…]` 与
         纯时值型 `durs:[[dur],…]`，只认 `ev` 会让 3 类报 0 条。
    所以这里改用括号配对逐层取，不靠字段顺序。
    """
    src = open(path, encoding='utf-8').read()
    i = src.index('节奏型库（吉他）')
    seg = src[i:i + 12000]
    cats = []
    for m in re.finditer(r"cat:'([^']+)'", seg):
        name = m.group(1)
        it_at = seg.index('items:[', m.end())          # ① 不假设中间没有别的键
        body, _ = _match(seg, it_at + len('items:'), '[', ']')
        items = []
        k = 0
        while True:
            b = body.find('{', k)
            if b < 0:
                break
            obj, k = _match(body, b, '{', '}')
            nm = re.search(r"name:'([^']+)'", obj)
            if not nm:
                continue
            # ② span 位置不定，全对象里找
            span = re.search(r'span:\s*(\d+)', obj)
            # ③ 两种形态都要认
            ev_m = re.search(r'\bev:\s*\[', obj)
            du_m = re.search(r'\bdurs:\s*\[', obj)
            ev, kind = [], None
            if ev_m:
                arr, _ = _match(obj, ev_m.end() - 1, '[', ']')
                ev = [(t, int(d), False) for t, d in re.findall(r"\['([^']+)',\s*(\d+)\]", arr)]
                kind = 'ev'
            elif du_m:
                arr, _ = _match(obj, du_m.end() - 1, '[', ']')
                # 附点写作 [dur,1]（时值+附点位）。只认单元素 [dur] 会把附点条目整个跳过，
                # 于是「附点四分+八分×2」被算成 1 拍、「附点二分」被算成 0 拍——
                # **本脚本初版就是这么报出 3 条假错误的**，务必两种都认。
                ev = [('-', int(d), bool(dot)) for d, dot in
                      re.findall(r'\[(\d+)(?:,\s*(\d+))?\]', arr)]
                kind = 'durs'
            items.append({'name': nm.group(1), 'ev': ev, 'kind': kind,
                          'span': int(span.group(1)) if span else None, 'raw_extra': obj})
        cats.append({'cat': name, 'items': items})
    return src, cats


def audit_rhythm(cats):
    rows = []
    for c in cats:
        cb = cat_beats(c['cat'])
        seen = {}
        for it in c['items']:
            beats = sum(DUR_BEATS.get(d, 0) * (1.5 if dot else 1) for _, d, dot in it['ev'])
            issues = []
            # R1 拍数自洽：条目自带 span 优先（半小节/一拍类靠它），否则用分类名推断
            want = float(it['span']) if it['span'] else cb
            if want is not None and abs(beats - want) > 1e-6:
                issues.append('R1 拍数 %.2f ≠ 应有 %.0f' % (beats, want))
            # R2 «无休止» 类里不得有 r
            if '无休止' in c['cat'] and any(t == 'r' for t, _, _ in it['ev']):
                issues.append('R2 声明无休止却含休止')
            # R3 同类内重复
            key = json.dumps(it['ev'])
            if key in seen:
                issues.append('R3 与「%s」ev 完全相同' % seen[key])
            else:
                seen[key] = it['name']
            # R4 元数据（P0-2 验收口径）
            miss = [k for k in ('style', 'level', 'meter', 'technique')
                    if (k + ':') not in it['raw_extra']]
            if miss:
                issues.append('R4 缺元数据 ' + '/'.join(miss))
            # R5 低音交替成对
            toks = [t for t, _, _ in it['ev']]
            if 'B' in toks and 'b' not in toks:
                issues.append('R5 只有交替低音 B、没有根音 b')
            rows.append({'cat': c['cat'], 'name': it['name'], 'beats': beats, 'issues': issues})
    return rows


def coverage(cats):
    """覆盖度：按「拍号族 × 演奏法」数一遍，看「海量不同风格」离现状有多远。
    风格维度现在**根本不存在**（无标签），所以只能按演奏法近似分组——
    这本身就是结论：想按风格选型，先得有风格标签。"""
    grid = {}
    for c in cats:
        meter = '3/4·6/8' if ('3/4' in c['cat'] or '6/8' in c['cat']) else \
                ('片段' if ('半小节' in c['cat'] or '一拍' in c['cat']) else '2/4·4/4')
        tech = ('分解' if '分解' in c['cat'] else '扫弦' if '扫弦' in c['cat'] else
                '纯时值' if ('基础时值' in c['cat'] or '组合节奏' in c['cat'] or c['cat'].strip().startswith('3/4')) else '片段')
        grid[(meter, tech)] = grid.get((meter, tech), 0) + len(c['items'])
    return grid


def audit_chords(src):
    m = re.search(r'const CHORD_CANDS\s*=\s*\[(.*?)\n\];', src, re.S)
    if not m:
        return None
    body = m.group(1)
    ids = re.findall(r"\{id:'([^']+)'", body)
    minors = re.findall(r"id:'([^']+)'[^}]*m:true", body)
    findings = []
    # C1 调式覆盖
    has_minor_key = bool(re.search(r'MINOR_CANDS|小调候选|minorCands', src))
    if not has_minor_key:
        findings.append(('C1', '候选集只有大调级数（%s）——小调歌曲会被配上大调和弦。'
                              '代码注释自己写着 TODO: 小调' % '/'.join(ids)))
    # C2 类型覆盖
    want = {'减三 vii°': r"'vii", '挂留 sus': r'sus', '加九 add9': r'add9', '半减 m7b5': r'm7b5|ø'}
    lack = [k for k, pat in want.items() if not re.search(pat, body)]
    if lack:
        findings.append(('C2', '候选缺少：' + '、'.join(lack)))
    # C3 终止式模板
    if not re.search(r'CADENCE|终止式模板|cadence', src):
        findings.append(('C3', '无终止式模板——只在末小节把 I 的分数乘 1.6，'
                               '句中半终止（…→V）与 ii-V-I 都不会主动生成'))
    # C4 和声节奏
    if not re.search(r'harmonicRhythm|和声节奏表', src):
        findings.append(('C4', '和声节奏写死：默认每小节一个和弦，'
                               '仅 4/4 下半段另属时补第二个（见 suggestChordPlan）'))
    # C5 乐句结构
    if not re.search(r'phrase|乐句|段落边界', body):
        findings.append(('C5', 'Viterbi 在全曲上均匀跑，不认 4/8 小节乐句边界，'
                               '配不出「前句半终止、后句全终止」的常规句法'))
    return {'ids': ids, 'minors': minors, 'findings': findings}


def main(path):
    src, cats = load_lib(path)
    rows = audit_rhythm(cats)
    ch = audit_chords(src)

    print('=' * 72)
    print('节奏型库审计：%d 类 / %d 条' % (len(cats), len(rows)))
    print('=' * 72)
    bad = [r for r in rows if r['issues']]
    hard = [r for r in rows if any(not i.startswith('R4') for i in r['issues'])]
    print('有问题条目：%d / %d（其中**硬错误**（非元数据缺口）：%d）\n' % (len(bad), len(rows), len(hard)))

    if hard:
        print('── 硬错误（可复算，必须修）──')
        for r in hard:
            for i in r['issues']:
                if not i.startswith('R4'):
                    print('  [%s] %s → %s' % (r['cat'][:14], r['name'], i))
        print()
    else:
        print('── 硬错误：无。拍数、休止声明、重复、低音交替全部自洽 ──\n')

    n_meta = sum(1 for r in rows if any(i.startswith('R4') for i in r['issues']))
    print('── 元数据缺口（P0-2 要补齐）──')
    print('  %d / %d 条缺 style/level/meter/technique（即：无风格标签、无难度标签）\n' % (n_meta, len(rows)))

    print('  各分类条目数：')
    for c in cats:
        print('    %-34s %2d 条' % (c['cat'][:34], len(c['items'])))

    print()
    print('=' * 72)
    print('覆盖度：拍号族 × 演奏法（风格维度不存在，无法按风格统计——这本身是结论）')
    print('=' * 72)
    g = coverage(cats)
    meters = ['2/4·4/4', '3/4·6/8', '片段']
    techs = ['分解', '扫弦', '纯时值', '片段']
    print('    %-10s' % '' + ''.join('%-9s' % t for t in techs))
    for m in meters:
        print('    %-10s' % m + ''.join('%-9s' % (g.get((m, t), 0) or '—') for t in techs))
    print()
    print('  完整小节的可选型（分解+扫弦）：2/4·4/4 共 %d 条、3/4·6/8 共 %d 条'
          % (g.get(('2/4·4/4','分解'),0)+g.get(('2/4·4/4','扫弦'),0),
             g.get(('3/4·6/8','分解'),0)+g.get(('3/4·6/8','扫弦'),0)))

    print()
    print('=' * 72)
    print('配和弦审计')
    print('=' * 72)
    if not ch:
        print('未找到 CHORD_CANDS')
        return 1
    print('候选和弦：%s（共 %d 个，其中小三和弦 %d 个）\n' % ('/'.join(ch['ids']), len(ch['ids']), len(ch['minors'])))
    for code, txt in ch['findings']:
        print('  [%s] %s' % (code, txt))

    print()
    print('=' * 72)
    print('脚本判定不了、需要专业评审的（不在上面清单里）')
    print('=' * 72)
    for t in ['某条节奏型在某风格下是否地道（如 Bossa 的切分是否到位）',
              '和声进行是否符合该曲风惯例（民谣 vs 爵士的同一旋律应配不同和弦）',
              '加花密度、力度型是否合乐',
              '低音行走与内声部连接是否平滑']:
        print('  · ' + t)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'muse-tab/index.html'))
