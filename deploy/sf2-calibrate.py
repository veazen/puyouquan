#!/usr/bin/env python3
"""从 SF2 读出逐音色包络/力度标定，供本项目采样引擎使用（v60.9，零依赖）。

我们不迁到 SF2 当音源（结论见 docs/feasibility-2026-08-sf2-sf3-audio.md），
但一个成熟 GM 库里最值钱的东西不是采样，是**逐音色的调音参数**——
那是作者按真实乐器听感一条条标出来的。本脚本把它读出来搬进现有 MP3 采样通路：
拿它的调音，不拿它的音源。

产出两张表，可信度**天差地别**，务必分开看：

  【表一 · 收音时长】releaseVolEnv（生成器 38）→ 每音色一个数，直接可用。
        单一生成器、力度层之间几乎无差、且与声学常识逐项吻合
        （八音盒 3.5s——梳齿本来就没有制音机构；长笛 0.25s——气一停音就没）。
        **这张表落地了。**

  【表二 · 力度→明暗】modEnvToFilterFc（生成器 11）随力度层的爬升。
        原本是本次的主目标，结果没通过体检，**只落地了其中一个结论**。见下方「为什么」。

为什么表二大部分没落地
----------------------
① 只有一个信源。GeneralUser GS 有力度层；手上另一个库 Sonivox EAS 全库无力度层，
   没法交叉验证。单库的数就是「某一位作者的口味」，不是「乐器的物理」。
② 数据本身有自相矛盾处。实测排序里电钢琴（Rhodes）反而最不敏感、尼龙吉他比钢弦
   更敏感——两条都与公认声学相反（Rhodes 的强奏 bark 是它的招牌音色）。
③ 力度层里混着我们的引擎表达不了的配音手法（如钢琴最弱层带 Q=2 谐振峰），
   硬拟合等于把别人的音色设计误当成物理规律。
④ 个别音色的层序非单调（电吉他清音实测 60→14→28→60），无法拟合。

唯一通过体检的结论：**八音盒 / 过载吉他 / 失真吉他在库里只有 1 个力度层**——
作者认为它们的音色不随力度变。这与声学独立吻合（八音盒梳齿由定形拨针拨动；
重失真本身就是硬压缩器，输入变化被削平），两条独立证据同向，才敢用。
故这三个音色的明暗曲线改为近乎持平，其余音色维持现状不动。

用法
----
    python3 deploy/sf2-calibrate.py <某个.sf2>            # 两张表
    python3 deploy/sf2-calibrate.py <某个.sf2> --json     # 附可内嵌的 SF_REL / 力度层计数
"""
import importlib.util
import json
import os
import sys

_spec = importlib.util.spec_from_file_location(
    'sf2_inspect', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sf2-inspect.py'))
_m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_m)
SoundFont = _m.SoundFont

# SF2 生成器操作码
G_FILTERFC, G_MODENV2FC, G_ATTACK, G_RELEASE = 8, 11, 34, 38
G_KEYRANGE, G_VELRANGE, G_INSTRUMENT, G_SAMPLEID = 43, 44, 41, 53
DEFAULT_FC_CENTS = 13500          # 默认 initialFilterFc ≈ 19912 Hz（实质不滤）
TIMECENT_NONE = -12000            # 包络时间生成器默认值（≈1ms，等于「无」）
REL_TAU_DIV = 8.0                 # 运行时 rel() 用 8·tau 作为完整收音时长

# GM program → (本项目 SF_MAP 音色名, 中文名, 标定测试键)
TARGETS = {
    0:  ('acoustic_grand_piano',  '三角钢琴',   60),
    4:  ('electric_piano_1',      '电钢琴',     60),
    10: ('music_box',             '八音盒',     72),
    24: ('acoustic_guitar_nylon', '尼龙吉他',   52),
    25: ('acoustic_guitar_steel', '钢弦吉他',   52),
    27: ('electric_guitar_clean', '电吉他清音', 52),
    29: ('overdriven_guitar',     '电吉他过载', 52),
    30: ('distortion_guitar',     '电吉他失真', 52),
    32: ('acoustic_bass',         '原声贝斯',   40),
    48: ('string_ensemble_1',     '弦乐合奏',   60),
    52: ('choir_aahs',            '人声啊',     60),
    73: ('flute',                 '长笛',       72),
}


class CalSF(SoundFont):
    """在 sf2-inspect 的 pdta 解析上补一条「按力度层读生成器」的通道。

    SF2 两层语义必须分开，混起来算必然错：
      · 乐器层（igen）生成器是**绝对值**；预设层（pgen）是**偏移量**，加到乐器层上。
      · 每层各有一个「全局分区」（没有 sampleID / instrument 的 bag），作用于该层
        所有分区，被具体分区的同名生成器覆盖。
    （sf2-inspect 里已记过一次相关的坑：GeneralUser 的力度分割在**预设层**。）
    """

    def _bags(self, bags, gens, b0, b1):
        for b in range(b0, b1):
            yield self._bag_gens(bags, gens, b)

    def _inst_base(self, ii, key):
        i0, i1 = self.inst[ii][1], self.inst[ii + 1][1]
        glob, zone = {}, None
        for iz in self._bags(self.ibag, self.igen, i0, i1):
            if G_SAMPLEID not in iz:
                glob = iz
                continue
            kr = iz.get(G_KEYRANGE, (0, 127))
            if kr[0] <= key <= kr[1] and zone is None:
                zone = iz
        base = dict(glob)
        if zone:
            base.update(zone)
        return base

    def layers(self, pi, key):
        """→ [{vel, fc_cents, release_s, attack_s}]，按力度升序，只含覆盖 key 的层。"""
        b0, b1 = self.phdr[pi][3], self.phdr[pi + 1][3]
        out = []
        for pz in self._bags(self.pbag, self.pgen, b0, b1):
            if G_INSTRUMENT not in pz:
                continue                                  # 预设全局分区
            kr = pz.get(G_KEYRANGE, (0, 127))
            if not (kr[0] <= key <= kr[1]):
                continue
            base = self._inst_base(pz[G_INSTRUMENT], key)
            if not base:
                continue

            def val(op, dflt):
                return base.get(op, dflt) + pz.get(op, 0)

            out.append({
                'vel': pz.get(G_VELRANGE, (0, 127)),
                # 起音处的实际截止 = 基准截止 + 调制包络扫开的量
                'fc_cents': val(G_FILTERFC, DEFAULT_FC_CENTS) + val(G_MODENV2FC, 0),
                'release_s': 2.0 ** (val(G_RELEASE, TIMECENT_NONE) / 1200.0),
                'attack_s': 2.0 ** (val(G_ATTACK, TIMECENT_NONE) / 1200.0),
            })
        out.sort(key=lambda z: z['vel'][0])
        return out


def median(xs):
    s = sorted(xs)
    return s[len(s) // 2]


def main(path, want_json=False):
    sf = CalSF(path)
    print('音色库：%s\n' % sf.name())

    by = {}
    for pi in range(len(sf.phdr) - 1):
        preset, bank = sf.phdr[pi][1], sf.phdr[pi][2]
        if bank == 0 and preset in TARGETS and preset not in by:
            by[preset] = pi

    data = {}
    for prog in sorted(TARGETS):
        name, cn, key = TARGETS[prog]
        pi = by.get(prog)
        if pi is None:
            continue
        L = sf.layers(pi, key)
        if L:
            data[prog] = (name, cn, key, L)

    # ---------------- 表一：收音时长（落地） ----------------
    print('【表一 · 收音时长】releaseVolEnv → 运行时 tau（rel() 用 8·tau 作完整收音）')
    print('%-10s %-8s %-14s %-9s %-8s' % ('音色', '力度层', '释放 s（范围）', 'tau', '起音 s'))
    print('-' * 56)
    rel_out = {}
    for prog in sorted(data):
        name, cn, key, L = data[prog]
        rs = [z['release_s'] for z in L]
        r = median(rs)
        tau = round(r / REL_TAU_DIV, 3)
        rel_out[name] = tau
        span = '%.2f' % r if max(rs) - min(rs) < 0.02 else '%.2f (%.2f-%.2f)' % (r, min(rs), max(rs))
        print('%-10s %-8d %-14s %-9.3f %-8.3f' %
              (cn, len(L), span, tau, median([z['attack_s'] for z in L])))
    print('\n现状：非持续音色统一 tau=0.02（收音 0.16s）、持续音色统一 tau=0.05（0.40s）。')

    # ---------------- 表二：力度→明暗（基本不落地） ----------------
    print('\n【表二 · 力度→明暗】modEnvToFilterFc 随力度层的爬升（@测试键，谐波数）')
    print('%-10s %-6s %-30s %-10s' % ('音色', '力度层', '各层谐波数（弱→强）', '体检'))
    print('-' * 60)
    # 「持平」判据写成一条可复算的数：全部力度层的谐波数极差 < 1.3 倍。
    # 不用「层数==1」——失真吉他有 2 层但极差只有 1.1 倍，实质同样是不随力度变，
    # 按层数卡会把它漏掉；按极差卡则是对「音色是否真的变了」直接下判断。
    FLAT_SPAN = 1.3
    flat = []
    for prog in sorted(data):
        name, cn, key, L = data[prog]
        ref = median([z['fc_cents'] for z in L])
        hs = [max(1.2, min(60.0, 28.5 * 2.0 ** ((z['fc_cents'] - ref) / 1200.0))) for z in L]
        span = max(hs) / min(hs)
        bad = sum(1 for i in range(1, len(hs)) if hs[i] < hs[i - 1] - 0.5)
        if span < FLAT_SPAN and name not in ('string_ensemble_1', 'choir_aahs', 'flute'):
            flat.append(name)                    # 持续音色本就不过滤波器，不必进表
            verdict = '持平（极差 %.2f×）' % span
        elif bad == 0:
            verdict = '单调（极差 %.1f×）' % span
        else:
            verdict = '非单调 %d 处' % bad
        print('%-10s %-6d %-30s %-10s' %
              (cn, len(L), ' '.join('%.0f' % h for h in hs[:10]), verdict))
    print('\n判定：只有「持平」这一条结论落地（与声学独立吻合），其余一律不采用——理由见文件头。')
    print('判为持平并改平明暗曲线的音色：' + '、'.join(flat))

    if want_json:
        print('\nSF_REL = ' + json.dumps(rel_out, ensure_ascii=False, separators=(',', ':')))
        print('SF_VEL_FLAT = ' + json.dumps(sorted(flat), ensure_ascii=False,
                                            separators=(',', ':')))
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    sys.exit(main(sys.argv[1], '--json' in sys.argv))
