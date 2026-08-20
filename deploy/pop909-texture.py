#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 POP909 提取**钢琴伴奏织体的节奏骨架统计**（不提取任何具体乐句）。

用法：python3 deploy/pop909-texture.py <path-to-POP909-Dataset> [--limit N]

━━ 为什么这样做是安全的，以及边界在哪 ━━
POP909（MIT · Copyright (c) 2020 Music X Lab）是 909 首**商业中文流行歌**的扒谱。
仓库许可解决的是「这份标注数据可以用」，**清洗不了底层音乐作品的著作权**。
所以本脚本严格限定在「不构成表达」的那一层：

  · 只提取**节奏骨架**：左手/右手在 16 分格上的**起音位置掩码** + 右手是柱式还是分解
  · **完全丢弃音高内容**——不记录音符、不记录音程、不记录和弦、不记录曲目标识
  · 以**跨曲频次**为闸：只看某个骨架出现在**多少首不同的歌**里。
    一个被几十上百首歌共用的骨架是**体裁惯例**（如「低音在 1、和弦在 2 和 4」），
    不是任何一首歌的表达；只出现在个位数曲目里的骨架一律不取。
  · 输出是**统计表**，不是素材库。落地时由人按我们自己的 PIANO_TEX 惯例**重写**成模板，
    音高一律由和弦内音级（1/3/5/8）决定——这一层本来就是我们自己的。

一句话：**采的是「中文流行钢琴伴奏一般怎么打节奏」这个事实，不是任何一首歌怎么弹。**

━━ 实现要点 ━━
· 零依赖的最小 SMF 解析（本项目不引入 Python 包依赖）
· 用 set_tempo 建立 tick↔秒 映射，再拿 beat_midi.txt 的**重拍时刻**定小节线
  （不假设「从 0 起每 4 拍一小节」——POP909 与音频对齐，首拍不在 0）
· 左右手按 C4(60) 分手；右手同一起音上 ≥2 音记为柱式，否则记为分解
"""
import os
import sys
import struct
import collections

GRID = int(os.environ.get('TEX_GRID', '8'))   # 每小节格数（8=八分音符粒度；16 分粒度会被演奏细节打散）
MIN_SONGS = int(os.environ.get('TEX_MIN', '20'))  # 跨曲频次闸


# ---------- 最小 SMF 解析 ----------
def read_varlen(b, i):
    v = 0
    while True:
        c = b[i]; i += 1
        v = (v << 7) | (c & 0x7F)
        if not (c & 0x80):
            return v, i


def parse_midi(path):
    """返回 (ticks_per_beat, tempos[(tick,usec_per_beat)], tracks[{name, notes[(tick,pitch)]}])"""
    b = open(path, 'rb').read()
    if b[:4] != b'MThd':
        return None
    _, fmt, ntrk, div = struct.unpack('>IHHH', b[4:14])
    i = 14
    tempos, tracks = [], []
    for _ in range(ntrk):
        if b[i:i + 4] != b'MTrk':
            break
        ln = struct.unpack('>I', b[i + 4:i + 8])[0]
        end = i + 8 + ln
        j = i + 8
        tick = 0
        name = ''
        notes = []
        running = None
        while j < end:
            dt, j = read_varlen(b, j)
            tick += dt
            st = b[j]
            if st == 0xFF:                       # meta
                j += 1
                mt = b[j]; j += 1
                ln2, j = read_varlen(b, j)
                data = b[j:j + ln2]; j += ln2
                if mt == 0x03:
                    name = data.decode('utf-8', 'ignore').strip()
                elif mt == 0x51 and ln2 == 3:
                    tempos.append((tick, (data[0] << 16) | (data[1] << 8) | data[2]))
            elif st in (0xF0, 0xF7):
                j += 1
                ln2, j = read_varlen(b, j)
                j += ln2
            else:
                if st & 0x80:
                    running = st
                    j += 1
                s = running
                if s is None:
                    break
                hi = s & 0xF0
                if hi in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
                    d1, d2 = b[j], b[j + 1]; j += 2
                    if hi == 0x90 and d2 > 0:
                        notes.append((tick, d1))
                elif hi in (0xC0, 0xD0):
                    j += 1
                else:
                    j += 1
        tracks.append({'name': name, 'notes': notes})
        i = end
    return div, tempos, tracks


def tick_to_sec_map(div, tempos):
    """返回函数 sec(tick)。tempos 为空时按 120BPM。"""
    tp = sorted(tempos) or [(0, 500000)]
    pts = []          # (tick, sec, usec_per_beat)
    cur_s = 0.0
    for k, (tk, us) in enumerate(tp):
        if k == 0:
            pts.append((tk, 0.0, us))
        else:
            ptk, ps, pus = pts[-1]
            cur_s = ps + (tk - ptk) / div * pus / 1e6
            pts.append((tk, cur_s, us))

    def sec(tick):
        lo = pts[0]
        for p in pts:
            if p[0] <= tick:
                lo = p
            else:
                break
        return lo[1] + (tick - lo[0]) / div * lo[2] / 1e6
    return sec


def downbeats(path):
    out = []
    try:
        for line in open(path, encoding='utf-8'):
            p = line.split()
            if len(p) >= 3 and float(p[2]) > 0.5:
                out.append(float(p[0]))
    except OSError:
        pass
    return out


def analyse(song_dir):
    mid = [f for f in os.listdir(song_dir) if f.endswith('.mid')]
    if not mid:
        return []
    r = parse_midi(os.path.join(song_dir, mid[0]))
    if not r:
        return []
    div, tempos, tracks = r
    piano = next((t for t in tracks if 'PIANO' in (t['name'] or '').upper()), None)
    if not piano or not piano['notes']:
        return []
    db = downbeats(os.path.join(song_dir, 'beat_midi.txt'))
    if len(db) < 3:
        return []
    sec = tick_to_sec_map(div, tempos)
    # 音符换算到秒，再按重拍分小节
    ev = sorted((sec(tk), p) for tk, p in piano['notes'])
    sigs = []
    for k in range(len(db) - 1):
        t0, t1 = db[k], db[k + 1]
        span = t1 - t0
        if span <= 0.5 or span > 5.0:
            continue
        inbar = [(t, p) for t, p in ev if t0 - 1e-6 <= t < t1]
        if len(inbar) < 2:
            continue
        slots = collections.defaultdict(list)
        for t, p in inbar:
            s = int(round((t - t0) / span * GRID)) % GRID
            slots[s].append(p)
        bass = chord = 0
        blk = tot = 0
        for s, ps in slots.items():
            lo = [p for p in ps if p < 60]
            hi = [p for p in ps if p >= 60]
            if lo:
                bass |= 1 << s
            if hi:
                chord |= 1 << s
                tot += 1
                if len(hi) >= 2:
                    blk += 1
        if not bass and not chord:
            continue
        style = 'block' if (tot and blk / tot >= 0.5) else 'arp'
        sigs.append('%s|%s|%s' % (hand_class(bass), hand_class(chord), style))
    return sigs


def hand_class(mask):
    """把一只手的起音掩码归并成「拍位类别」。

    直接用 8 格掩码判重会被演奏细节打散——实测前 12 名里有 5 条只是「左手八分但缺一格」的同一织体。
    改为只保留两件事：**哪几拍上有音**（4 bit）+ **有没有后半拍**（切分与否）。
    这一层描述的是「这个织体怎么打拍子」，比逐格掩码更稳，也离具体表达更远。
    """
    per = GRID // 4 if GRID >= 4 else 1
    beats = 0
    off = False
    for s in range(GRID):
        if (mask >> s) & 1:
            if s % per == 0:
                beats |= 1 << (s // per)
            else:
                off = True
    return '%x%s' % (beats, '+' if off else '-')


def cls_str(c):
    beats, off = int(c[0], 16), c[1] == '+'
    return ''.join('x' if (beats >> i) & 1 else '.' for i in range(4)) + ('/后半拍' if off else '')


def mask_str(m):
    return ''.join('x' if (m >> i) & 1 else '.' for i in range(GRID))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    root = os.path.join(sys.argv[1], 'POP909')
    limit = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])
    dirs = sorted(d for d in os.listdir(root) if d.isdigit())
    if limit:
        dirs = dirs[:limit]
    songs_per_sig = collections.Counter()   # 出现在多少首**不同的**歌里
    bars_per_sig = collections.Counter()
    nsong = nbar = 0
    for d in dirs:
        try:
            sigs = analyse(os.path.join(root, d))
        except Exception:
            continue
        if not sigs:
            continue
        nsong += 1
        nbar += len(sigs)
        for s in set(sigs):
            songs_per_sig[s] += 1
        for s in sigs:
            bars_per_sig[s] += 1
    print('解析成功 %d 首 / 共 %d 小节；不同骨架 %d 种' % (nsong, nbar, len(songs_per_sig)))
    print('跨曲频次闸：至少出现在 %d 首歌里\n' % MIN_SONGS)
    top = songs_per_sig.most_common(12)
    print('（未过闸时的前 12 名，用于校准粒度）')
    for s, c in top:
        bm, cm, st = s.split('|')
        print('   左 %-12s 右 %-12s %-4s 曲目 %3d  小节 %5d' % (cls_str(bm), cls_str(cm),
              '柱式' if st=='block' else '分解', c, bars_per_sig[s]))
    print()
    keep = [(s, c) for s, c in songs_per_sig.most_common() if c >= MIN_SONGS]
    print('过闸骨架 %d 种，覆盖 %.1f%% 的小节\n'
          % (len(keep), 100.0 * sum(bars_per_sig[s] for s, _ in keep) / max(1, nbar)))
    print('%-4s %-14s %-14s %-6s %7s %8s %7s' % ('#', '左手拍位', '右手拍位', '右手', '曲目数', '小节数', '占比'))
    for n, (s, c) in enumerate(keep[:24], 1):
        bm, cm, st = s.split('|')
        print('%-4d %-14s %-14s %-6s %7d %8d %6.1f%%'
              % (n, cls_str(bm), cls_str(cm), '柱式' if st == 'block' else '分解',
                 c, bars_per_sig[s], 100.0 * bars_per_sig[s] / max(1, nbar)))


if __name__ == '__main__':
    main()
