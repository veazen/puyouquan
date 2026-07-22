#!/usr/bin/env bash
# 部署冒烟验收（HTTPS）：按三个虚拟主机断言页面可达且含标记内容，并校验 http→https 跳转。
# 用法：bash deploy/smoke.sh <host或IP>
# 用 curl --connect-to 把各子域名的连接指向 <host或IP>：不依赖 DNS，SNI 与证书按域名正确校验。
set -euo pipefail
H="${1:?用法: bash deploy/smoke.sh <host或IP>}"
fail=0
chk(){ # chk 虚拟主机 路径 期望包含的字符串 说明
  local vhost=$1 path=$2 want=$3 desc=$4 body
  body=$(curl -fsSL --max-time 20 --connect-to "$vhost:443:$H:443" "https://$vhost$path" 2>/dev/null) \
    || { echo "❌ $desc ($vhost$path) HTTPS 无法访问"; fail=1; return; }
  # 用 herestring 而非管道：大文件下 grep -q 提前退出会让上游吃 SIGPIPE，
  # 在 pipefail 下整条管道误判失败（1.7MB 编辑器页曾因此误报缺标记）
  if grep -q -- "$want" <<< "$body"; then echo "✅ $desc"; else echo "❌ $desc ($vhost$path) 缺少标记「$want」"; fail=1; fi
}
redir(){ # redir 虚拟主机：断言 80 端口跳转到 https
  local vhost=$1 code
  code=$(curl -s -o /dev/null --max-time 20 -w '%{http_code}' --connect-to "$vhost:80:$H:80" "http://$vhost/" 2>/dev/null || echo 000)
  case "$code" in
    301|302|308) echo "✅ $vhost http→https 跳转（$code）";;
    *) echo "❌ $vhost http 未跳转 https（返回 $code）"; fail=1;;
  esac
}
chk puyouquan.com       /           "谱友圈"                "官网首页（主域名）"
chk puyouquan.com       /           "粤ICP备2026100396号"   "官网备案号"
chk puyouquan.com       /help.html  "使用手册\|快速上手"    "使用手册"
chk www.puyouquan.com   /           "谱友圈"                "官网首页（www）"
chk zhipu.puyouquan.com /           "谱友圈"                "在线制谱（zhipu）"
chk zhipu.puyouquan.com /           "粤ICP备2026100396号"   "制谱备案号"
chk puku.puyouquan.com  /           "谱库"                  "谱库首页（puku）"
chk zhipu.puyouquan.com /api/health '"ok":true'             "API 健康检查"
chk zhipu.puyouquan.com /api/pub/scores '谱友圈官方'         "谱库公开接口（含种子谱）"
redir puyouquan.com
redir zhipu.puyouquan.com
redir puku.puyouquan.com
exit $fail
