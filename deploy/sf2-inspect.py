#!/usr/bin/env python3
"""SF2/SF3 音色库解剖工具（零依赖，只读 pdta，不解采样数据）。

用途：为「音源选型」提供实证——某个 GM 音色库到底有没有力度层、循环点，
      抽出本项目在用的 12 个音色要多大，以及换过去后的变速幅度（音高保真）。

    python3 deploy/sf2-inspect.py <某个.sf2>

产出四张表：力度层与循环点 / 逐音色采样账 / 变速幅度 / 全库概况。

⚠️ 一个已踩过的坑：SF2 的力度分割**可以放在预设层（pgen）也可以放在乐器层（igen）**。
   只看乐器层会得出「全部单层」的相反结论——GeneralUser GS 就是把力度层放在预设层的。
   本脚本两层都读，乐器层优先、预设层兜底（见 zones()）。

背景与结论见 docs/feasibility-2026-08-sf2-sf3-audio.md。
"""
import struct
import sys
import statistics

# --- SF2 generator 操作码（只用到的那几个）---
GEN_KEYRANGE, GEN_VELRANGE = 43, 44
GEN_INSTRUMENT, GEN_SAMPLEID, GEN_SAMPLEMODES = 41, 53, 54
GEN_ATTENUATION, GEN_FILTERFC, GEN_ROOTKEY = 48, 8, 58

# 本项目 INSTRUMENTS 用到的 GM 音色 → 中文名 + 实战音域（MIDI）。
# 实战音域用于算变速：兜底键区常声明成 0-127，按它算会得出 ×90 这种吓人但弹不到的数。
WANTED = {
    0:  ('三角钢琴', 21, 108), 4:  ('电钢琴', 28, 103), 10: ('八音盒', 60, 96),
    24: ('尼龙吉他', 40, 88),  25: ('钢弦吉他', 40, 88), 27: ('电吉他清音', 40, 88),
    32: ('原声贝斯', 28, 67),  48: ('弦乐合奏', 36, 96), 52: ('人声啊', 48, 84),
    73: ('长笛', 60, 96),
}


def _chunks(buf, off, end):
    out = []
    while off < end - 8:
        cid = buf[off:off + 4].decode('latin1')
        sz = struct.unpack_from('<I', buf, off + 4)[0]
        out.append((cid, off + 8, sz))
        off += 8 + sz + (sz & 1)          # RIFF 块按偶数字节对齐
    return out


class SoundFont:
    def __init__(self, path):
        self.d = d = open(path, 'rb').read()
        if d[0:4] != b'RIFF' or d[8:12] != b'sfbk':
            raise SystemExit('不是 SF2/SF3 文件')
        pdta = info = None
        for cid, off, sz in _chunks(d, 12, struct.unpack_from('<I', d, 4)[0] + 8):
            if cid != 'LIST':
                continue
            kind = d[off:off + 4].decode('latin1')
            if kind == 'pdta':
                pdta = (off + 4, off + sz)
            elif kind == 'INFO':
                self.info = (off + 4, off + sz)
        if not pdta:
            raise SystemExit('缺 pdta 块')
        c = {cid: (o, s) for cid, o, s in _chunks(d, *pdta)}

        def arr(name, fmt, size):
            o, sz = c[name]
            return [struct.unpack_from(fmt, d, o + i * size) for i in range(sz // size)]

        self.phdr = arr('phdr', '<20sHHHIII', 38)
        self.pbag = arr('pbag', '<HH', 4)
        self.pgen = arr('pgen', '<Hh', 4)
        self.inst = arr('inst', '<20sH', 22)
        self.ibag = arr('ibag', '<HH', 4)
        self.igen = arr('igen', '<Hh', 4)
        self.shdr = arr('shdr', '<20sIIIIIBbHH', 46)

    def name(self):
        for cid, off, sz in _chunks(self.d, *self.info):
            if cid == 'INAM':
                return self.d[off:off + sz].split(b'\0')[0].decode('latin1', 'ignore')
        return '(未命名)'

    @staticmethod
    def _rng(amt):
        return (amt & 0xFF, (amt >> 8) & 0xFF)

    def _bag_gens(self, bags, gens, b):
        g0 = bags[b][0]
        g1 = bags[b + 1][0] if b + 1 < len(bags) else len(gens)
        z = {}
        for g in range(g0, g1):
            op, amt = gens[g]
            z[op] = self._rng(amt) if op in (GEN_KEYRANGE, GEN_VELRANGE) else amt
        return z

    def zones(self, pi):
        """展平一个预设 → [(力度区间, 键区, sampleID, 是否循环, 滤波截止, 衰减)]。
        乐器层的 velRange 优先，缺失时用预设层的——两层都要读。"""
        out = []
        b0, b1 = self.phdr[pi][3], self.phdr[pi + 1][3]
        for pb in range(b0, b1):
            pz = self._bag_gens(self.pbag, self.pgen, pb)
            if GEN_INSTRUMENT not in pz:
                continue                                  # 全局预设分区，无乐器指向
            ii = pz[GEN_INSTRUMENT]
            i0, i1 = self.inst[ii][1], self.inst[ii + 1][1]
            for ib in range(i0, i1):
                iz = self._bag_gens(self.ibag, self.igen, ib)
                if GEN_SAMPLEID not in iz:
                    continue                              # 全局乐器分区
                sid = iz[GEN_SAMPLEID]
                root = iz.get(GEN_ROOTKEY)
                if root in (None, -1):
                    root = self.shdr[sid][6] if sid < len(self.shdr) - 1 else None
                out.append({
                    'vel':  iz.get(GEN_VELRANGE) or pz.get(GEN_VELRANGE) or (0, 127),
                    'key':  iz.get(GEN_KEYRANGE) or pz.get(GEN_KEYRANGE) or (0, 127),
                    'sid':  sid,
                    'root': root,
                    'loop': iz.get(GEN_SAMPLEMODES, 0) in (1, 3),
                    'fc':   iz.get(GEN_FILTERFC, pz.get(GEN_FILTERFC)),
                    'att':  iz.get(GEN_ATTENUATION, pz.get(GEN_ATTENUATION)),
                })
        return out

    def melodic_presets(self):
        for pi in range(len(self.phdr) - 1):
            _, preset, bank = self.phdr[pi][0], self.phdr[pi][1], self.phdr[pi][2]
            if bank == 0 and preset in WANTED:
                yield pi, preset

    def pcm_bytes(self, sids):
        tot = 0
        for s in sids:
            if s < len(self.shdr) - 1:
                tot += (self.shdr[s][2] - self.shdr[s][1]) * 2     # 16-bit
        return tot


def main(path):
    sf = SoundFont(path)
    print(f'音色库：{sf.name()}   预设={len(sf.phdr)-1} 乐器={len(sf.inst)-1} 采样={len(sf.shdr)-1}\n')

    print('【1】力度层与循环点')
    print(f'{"音色":14s}{"力度层":>6s}{"独立采样":>9s}{"键区":>6s}{"循环覆盖":>10s}{"力度层机制":>12s}')
    print('-' * 62)
    total_sids = set()
    for pi, preset in sf.melodic_presets():
        cn = WANTED[preset][0]
        zs = sf.zones(pi)
        if not zs:
            continue
        sids = {z['sid'] for z in zs}
        total_sids |= sids
        vels = sorted({z['vel'] for z in zs})
        looped = sum(1 for z in zs if z['loop'])
        # 力度层的实现机制——三分，别一概而论：
        #   生成器差异：同采样被多个力度层引用，且 fc/att 随力度变（≈本项目现有的 vel→低通）
        #   仅调制器  ：同采样被复用但生成器完全一致 → 力度差异来自 SF2 默认调制器 vel→attenuation
        #   独立采样  ：力度层各自指向不同采样（真·多次录音）
        by_sid = {}
        for z in zs:
            by_sid.setdefault(z['sid'], []).append((z['vel'], z['fc'], z['att']))
        reused = [v for v in by_sid.values() if len({x[0] for x in v}) > 1]   # 跨力度层复用的采样
        if len(vels) <= 1:
            mech = '单层'
        elif not reused:
            mech = '独立采样'
        elif any(len({(x[1], x[2]) for x in v}) > 1 for v in reused):
            mech = '生成器差异'
        else:
            mech = '仅调制器'
        print(f'{cn:14s}{len(vels):>6d}{len(sids):>9d}{len({z["key"] for z in zs}):>6d}'
              f'{f"{looped}/{len(zs)}":>10s}{mech:>12s}')

    print('\n【2】抽取本项目 12 音色的账（决定迁移后素材体积）')
    b = sf.pcm_bytes(total_sids)
    print(f'  独立采样 {len(total_sids)} 个 · PCM 原始 {b/1024/1024:.1f} MB · Ogg 估算 ~{b/9/1024/1024:.1f} MB')
    print('  对照现状：midi-js 每音色 88 个 MP3（每半音一个），12 音色约 22 MB')

    print('\n【3】变速幅度（音高保真，按实战音域逐半音取最贴合分区）')
    print(f'{"音色":14s}{"音域":>10s}{"最大变速":>10s}{"中位变速":>10s}')
    print('-' * 46)
    for pi, preset in sf.melodic_presets():
        cn, lo, hi = WANTED[preset]
        zs = [z for z in sf.zones(pi) if z['root'] is not None]
        if not zs:
            continue
        devs = []
        for note in range(lo, hi + 1):
            cand = [abs(note - z['root']) for z in zs if z['key'][0] <= note <= z['key'][1]]
            if cand:
                devs.append(min(cand))
        if devs:
            print(f'{cn:14s}{f"{lo}-{hi}":>10s}{max(devs):>7d} 半音{statistics.median(devs):>8.1f} 半音')
    print('  对照现状：每半音一采样 → 全音域变速恒为 0 半音')

    print('\n【4】全库概况')
    tot = loop = velsplit = 0
    for pi in range(len(sf.phdr) - 1):
        for z in sf.zones(pi):
            tot += 1
            loop += z['loop']
            velsplit += z['vel'] != (0, 127)
    print(f'  采样分区 {tot} · 标记循环 {loop} ({loop/max(1,tot)*100:.1f}%) '
          f'· 带力度分割 {velsplit} ({velsplit/max(1,tot)*100:.1f}%)')
    ok = sum(1 for s in sf.shdr[:-1] if s[4] > s[3] and s[3] >= s[1] and s[4] <= s[2])
    print(f'  shdr 循环点自洽 {ok}/{len(sf.shdr)-1} ({ok/max(1,len(sf.shdr)-1)*100:.1f}%)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
