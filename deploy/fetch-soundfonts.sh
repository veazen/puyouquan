#!/usr/bin/env bash
# 谱友圈 PYQ · 下载开源采样音色包（midi-js-soundfonts / MusyngKite，MIT 仓库）
# 在服务器上执行：sudo bash fetch-soundfonts.sh
# 下载后站点自托管于 /var/www/puyouquan/sounds/MusyngKite/ —— 国内用户无需访问境外 CDN
set -euo pipefail

DEST="${DEST:-/var/www/puyouquan/sounds/MusyngKite}"
LIB="MusyngKite"
# 主源用 raw.githubusercontent.com（多数网络可达），失败换 jsDelivr
SRC1="https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/${LIB}"
SRC2="https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/${LIB}"

# 与编辑器 SF_MAP 一一对应的 10 个音色
FONTS=(
  acoustic_guitar_steel    # 民谣吉他（钢弦）
  acoustic_guitar_nylon    # 古典吉他 / 尤克里里
  electric_guitar_clean    # 电吉他（清音）
  acoustic_bass            # 原声贝斯
  acoustic_grand_piano     # 三角钢琴
  electric_piano_1         # 电钢琴
  music_box                # 八音盒
  string_ensemble_1        # 弦乐合奏
  flute                    # 长笛
  choir_aahs               # 人声"啊"
)

mkdir -p "$DEST"
ok=0; fail=0
for f in "${FONTS[@]}"; do
  out="$DEST/${f}-mp3.js"
  if [ -s "$out" ]; then echo "✓ 已存在，跳过 $f"; ok=$((ok+1)); continue; fi
  echo "→ 下载 $f ..."
  if curl -fsSL --retry 3 --retry-delay 2 -o "$out.tmp" "$SRC1/${f}-mp3.js" \
     || curl -fsSL --retry 3 --retry-delay 2 -o "$out.tmp" "$SRC2/${f}-mp3.js"; then
    mv "$out.tmp" "$out"; ok=$((ok+1)); echo "  ✓ $(du -h "$out" | cut -f1)"
  else
    rm -f "$out.tmp"; fail=$((fail+1)); echo "  ✗ 下载失败：$f（稍后重跑本脚本即可续传）"
  fi
done

echo
echo "完成：成功 $ok / ${#FONTS[@]}，失败 $fail。目录：$DEST"
echo "编辑器加载顺序为 站点 sounds/ → jsDelivr → GitHub Pages，自托管后国内访问最快。"
