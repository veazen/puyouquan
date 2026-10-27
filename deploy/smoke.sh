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
# ── zhipu 编辑器大页：单次抓取、多项断言 ──
# 页面已 2.3MB，境外 runner 到服务器带宽 ~100KB/s，整页一次要 ~20s——此前三处各自
# 全量重拉（可达/备案号/版本），第二次起贴着 20s 超时线反复边缘失败（run #112 两跑同点红）。
# 改为一次下载（60s 上限 + --compressed，服务器有无 gzip 都兼容），三项断言共用同一份 body；
# curl 失败置空不抛错，避免 set -e 把后续检查静默截断（run #112 attempt2 版本/音色检查没跑就退出）。
ZBODY=$(curl -fsSL --compressed --max-time 60 --connect-to "zhipu.puyouquan.com:443:$H:443" "https://zhipu.puyouquan.com/" 2>/dev/null || true)
zchk(){ # zchk 期望包含的字符串 说明
  local want=$1 desc=$2
  if [ -z "$ZBODY" ]; then echo "❌ $desc (zhipu.puyouquan.com/) HTTPS 无法访问"; fail=1
  elif grep -q -- "$want" <<< "$ZBODY"; then echo "✅ $desc"
  else echo "❌ $desc (zhipu.puyouquan.com/) 缺少标记「$want」"; fail=1; fi
}
zchk "谱友圈"                "在线制谱（zhipu）"
zchk "粤ICP备2026100396号"   "制谱备案号"
chk puku.puyouquan.com  /           "谱库"                  "谱库首页（puku）"
# v58.5 观看页驻 puku 域：kanpu.html=编辑器单文件副本（publish.sh 3b 落位）。
# 2.4MB 大文件不整页抓（境外 runner 20s 拉不完，zhipu 主页早有此教训）——HEAD 断言 200 且 ≥1MB。
KLEN=$(curl -sI --max-time 15 --connect-to "puku.puyouquan.com:443:$H:443" "https://puku.puyouquan.com/kanpu.html" 2>/dev/null \
      | tr -d '\r' | awk 'tolower($1)=="content-length:"{print $2}')
if [ "${KLEN:-0}" -ge 1000000 ] 2>/dev/null; then echo "✅ puku 观看页 kanpu.html（$((KLEN/1024))KB）"
else echo "❌ puku 观看页 kanpu.html 缺失或残缺（content-length=${KLEN:-无}）"; fail=1; fi
# 微信小程序业务域名校验文件（三域根均须可访问）：web-view 白名单靠它维持，
#   rsync --delete 或 publish.sh 第 4 步一旦漏拷，后台校验就会失效——这里守住。
WXV=XSJTQ471zE.txt
for vh in www.puyouquan.com puku.puyouquan.com zhipu.puyouquan.com; do
  chk "$vh" "/$WXV" '^[0-9a-f]\{32\}$' "小程序业务域名校验文件（$vh）"
done
chk zhipu.puyouquan.com /api/health '"ok":true'             "API 健康检查（zhipu）"
chk www.puyouquan.com   /api/health '"ok":true'             "官网 API 健康（微信网站应用回调域 www）"
chk zhipu.puyouquan.com /api/pub/scores '谱友圈官方'         "谱库公开接口（含种子谱）"
# v69.3 曲库公版谱已补种：上面一条有示例种子谱也会过，这里另查 sitemap 里有 lib-os-*，再抓第一首的 SSR 落地页
# （落地页只读；/api/pub/scores/:id 会计浏览数，不用它）。只要求 ≥1 首——后台下架 / 删掉个别曲目是正常操作，不该让冒烟永久变红。
LIBID=$(curl -fsSL --max-time 20 --connect-to "puku.puyouquan.com:443:$H:443" "https://puku.puyouquan.com/pub/sitemap.xml" 2>/dev/null \
        | grep -o '/pub/lib-os-[a-z0-9-]*<' | head -1 | sed 's#^/pub/##; s#<$##' || true)
if [ -n "$LIBID" ]; then chk puku.puyouquan.com "/pub/$LIBID" '谱友圈官方 制谱' "曲库公版谱已上架（$LIBID 落地页）"
else echo "❌ 曲库公版谱未上架（谱库 sitemap 里没有 lib-os-*）"; fail=1; fi
# ── 版本落位校验（v48.4 新增）──
# 此前冒烟只验「页面可达 + 含固定字样（谱友圈/备案号）」，落位旧文件也照样全绿——
# 「部署成功但线上还是旧版」因此长期无法被发现。这里断言线上编辑器的 APP_VER
# 与本次提交一致：不一致即判失败，并打印线上实际版本便于定位。
VER=$(grep -o "const APP_VER='[^']*'" muse-tab/index.html 2>/dev/null | head -1 | sed "s/.*'\(.*\)'/\1/")
if [ -n "$VER" ]; then
  # 复用上方单次抓取的 ZBODY（不再整页重拉一次）；grep 无匹配不抛错
  LIVE=$(grep -o "const APP_VER='[^']*'" <<< "$ZBODY" | head -1 | sed "s/.*'\(.*\)'/\1/" || true)
  if [ "$LIVE" = "$VER" ]; then echo "✅ 编辑器版本已落位（线上 $LIVE = 本次 $VER）"
  else echo "❌ 版本未落位：本次应为 $VER，线上实际为 ${LIVE:-解析不到}"; fail=1; fi
else
  echo "⚠️ 未能从 muse-tab/index.html 解析 APP_VER，跳过版本落位校验"
fi

# ── 音色包完整性抽查（音质升级·阶段0，评审硬门槛 C2）──
# 双库各抽 3 个代表文件，断言 HTTP 200 且体积 ≥300KB（半截文件不算有）。
# 历史欠账：当年「超时不阻塞」安装从未校验过；此后由部署工作流「音色包供给」步幂等补齐。
sf_chk(){ # sf_chk 库名 文件名
  local lib=$1 f=$2 len
  len=$(curl -sI --max-time 15 --connect-to "zhipu.puyouquan.com:443:$H:443" \
        "https://zhipu.puyouquan.com/sounds/$lib/${f}-mp3.js" 2>/dev/null \
        | tr -d '\r' | awk 'tolower($1)=="content-length:"{print $2}')
  if [ "${len:-0}" -ge 300000 ] 2>/dev/null; then echo "✅ 音色 $lib/$f（$((len/1024))KB）"
  else echo "❌ 音色 $lib/$f 缺失或残缺（content-length=${len:-无}）"; fail=1; fi
}
for L in MusyngKite FluidR3_GM; do
  for F in acoustic_grand_piano acoustic_guitar_steel flute overdriven_guitar distortion_guitar; do sf_chk "$L" "$F"; done
done

redir puyouquan.com
redir zhipu.puyouquan.com
redir puku.puyouquan.com
# 安全响应头（v62.6 A1d 起硬校验）：zhipu 的 / 会内部跳到 location = /index.html，那里自带 Cache-Control 的 add_header，
# 曾因 nginx「location 有 add_header 就不继承上层」而丢掉全部安全头；部署步骤已给它补 include，这里逐站钉住
hdr(){ # hdr 虚拟主机 路径
  local vhost=$1 path=$2 h
  h=$(curl -sI --max-time 15 --connect-to "$vhost:443:$H:443" "https://$vhost$path" 2>/dev/null || true)
  if grep -qi '^x-frame-options: *sameorigin' <<< "$h" && grep -qi '^x-content-type-options: *nosniff' <<< "$h"; then
    echo "✅ $vhost$path 带安全响应头（X-Frame-Options / nosniff）"
  else echo "❌ $vhost$path 缺安全响应头（X-Frame-Options 或 nosniff）"; fail=1; fi
}
hdr zhipu.puyouquan.com /
hdr www.puyouquan.com /
hdr puku.puyouquan.com /kanpu.html
exit $fail
