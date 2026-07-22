#!/usr/bin/env bash
# 部署冒烟验收：curl 断言关键页面可达且含标记内容。用法：bash deploy/smoke.sh <host或域名>
set -euo pipefail
H="${1:?用法: bash deploy/smoke.sh <host>}"
BASE="http://$H"
fail=0
chk(){ # chk 路径 期望包含的字符串 说明
  local body; body=$(curl -fsSL --max-time 20 "$BASE$1" 2>/dev/null) || { echo "❌ $3 ($1) 无法访问"; fail=1; return; }
  if echo "$body" | grep -q "$2"; then echo "✅ $3"; else echo "❌ $3 ($1) 缺少标记「$2」"; fail=1; fi
}
chk "/"                 "谱友圈"              "编辑器首页"
chk "/"                 "粤ICP备2026100396号" "备案号展示"
chk "/site/index.html"  "谱友圈"              "官网首页"
chk "/site/help.html"   "使用手册\|快速上手"   "使用手册"
chk "/site/features.html" "谱"                "功能页"
exit $fail
