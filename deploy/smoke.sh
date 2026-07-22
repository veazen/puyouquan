#!/usr/bin/env bash
# 部署冒烟验收：按三个虚拟主机分别断言关键页面可达且含标记内容。
# 用法：bash deploy/smoke.sh <host或IP>
# 传 IP 时通过 Host 头模拟各子域名命中对应 server 块，无需依赖 DNS。
set -euo pipefail
H="${1:?用法: bash deploy/smoke.sh <host或IP>}"
fail=0
chk(){ # chk 虚拟主机 路径 期望包含的字符串 说明
  local vhost=$1 path=$2 want=$3 desc=$4 body
  body=$(curl -fsSL --max-time 20 -H "Host: $vhost" "http://$H$path" 2>/dev/null) \
    || { echo "❌ $desc ($vhost$path) 无法访问"; fail=1; return; }
  # 用 herestring 而非管道：大文件下 grep -q 提前退出会让上游吃 SIGPIPE，
  # 在 pipefail 下整条管道误判失败（1.7MB 编辑器页曾因此误报缺标记）
  if grep -q -- "$want" <<< "$body"; then echo "✅ $desc"; else echo "❌ $desc ($vhost$path) 缺少标记「$want」"; fail=1; fi
}
chk puyouquan.com       /           "谱友圈"                "官网首页（主域名）"
chk puyouquan.com       /           "粤ICP备2026100396号"   "官网备案号"
chk puyouquan.com       /help.html  "使用手册\|快速上手"    "使用手册"
chk www.puyouquan.com   /           "谱友圈"                "官网首页（www）"
chk zhipu.puyouquan.com /           "谱友圈"                "在线制谱（zhipu）"
chk zhipu.puyouquan.com /           "粤ICP备2026100396号"   "制谱备案号"
chk puku.puyouquan.com  /           "谱库"                  "谱库首页（puku）"
exit $fail
