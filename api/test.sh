#!/usr/bin/env bash
# 谱友圈 API 本地端到端测试：DEV_OTP 模式跑完 登录→资料→谱面同步→收藏/谱架/谱集 全链路
set -uo pipefail
DIR=$(mktemp -d); trap 'kill $SRV 2>/dev/null; rm -rf "$DIR"' EXIT
cd "$(dirname "$0")"

PORT=3199 DB_PATH="$DIR/t.db" JWT_SECRET=testsecret COOKIE_DOMAIN= DEV_OTP=1 \
  node server.js > "$DIR/srv.log" 2>&1 & SRV=$!
for i in $(seq 1 30); do curl -sf http://127.0.0.1:3199/api/health >/dev/null 2>&1 && break; sleep 0.2; done

pass=0; fail=0
chk(){ # chk 说明 期望片段 实际输出
  if grep -q -- "$2" <<< "$3"; then pass=$((pass+1)); echo "✅ $1";
  else fail=$((fail+1)); echo "❌ $1 —— 期望含[$2] 实际: $(head -c 300 <<< "$3")"; fi
}
J(){ curl -s -b "$DIR/jar" -c "$DIR/jar" -H 'Content-Type: application/json' "$@"; }

chk 健康检查 '"ok":true' "$(curl -s http://127.0.0.1:3199/api/health)"

R=$(J -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13800001234"}')
chk 发送验证码 '"sent":true' "$R"
CODE=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R" | grep -oE '[0-9]{6}')
chk 频控-60秒内重发被拒 '频繁' "$(J -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13800001234"}')"
chk 错误验证码被拒 '不正确' "$(J -X POST http://127.0.0.1:3199/api/auth/sms/verify -d "{\"phone\":\"13800001234\",\"code\":\"000000\"}")"
chk 登录成功 '"nickname":"谱友1234"' "$(J -X POST http://127.0.0.1:3199/api/auth/sms/verify -d "{\"phone\":\"13800001234\",\"code\":\"$CODE\"}")"
chk 手机号打码 '138\*\*\*\*1234' "$(J http://127.0.0.1:3199/api/me)"
chk 改昵称 '"nickname":"小谱"' "$(J -X PATCH http://127.0.0.1:3199/api/me -d '{"nickname":"小谱"}')"
chk 升级创作者 '"role":"creator"' "$(J -X POST http://127.0.0.1:3199/api/me/creator)"

chk 上传谱面 '"saved":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"小星星","singer":"测试","updated_at":2000,"data":{"v":3,"title":"小星星"}}')"
chk 旧版本冲突409 '"conflict":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"旧","updated_at":1000,"data":{"v":3}}')"
chk 谱面列表 '"title":"小星星"' "$(J http://127.0.0.1:3199/api/scores)"
chk 谱面详情含数据 '"v":3' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"

chk 加入谱架 '"ok":true' "$(J -X PUT http://127.0.0.1:3199/api/shelf/song_abc12345 -d '{"progress":"练到第8小节"}')"
chk 谱架列表含进度 '练到第8小节' "$(J http://127.0.0.1:3199/api/shelf)"
chk 收藏自己的谱 '"ok":true' "$(J -X PUT http://127.0.0.1:3199/api/favorites/song_abc12345)"
chk 收藏列表 '"title":"小星星"' "$(J http://127.0.0.1:3199/api/favorites)"

CID=$(J -X POST http://127.0.0.1:3199/api/collections -d '{"name":"考级曲目"}' | grep -oE '"id":"[a-f0-9-]+"' | head -1 | cut -d'"' -f4)
chk 建谱集拿到id '........-' "$CID"
chk 谱集加谱 '"ok":true' "$(J -X PUT "http://127.0.0.1:3199/api/collections/$CID/items/song_abc12345")"
chk 谱集详情 '"title":"小星星"' "$(J "http://127.0.0.1:3199/api/collections/$CID")"
chk 谱集列表带计数 '"items":1' "$(J http://127.0.0.1:3199/api/collections)"

# 该会话用户在「升级创作者」步已是 creator，故直接测发布正向路径（角色门禁的负向由代码保证）
chk 创作者可发布 '"published":true' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish)"
chk 公开谱库含已发布 '小星星' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 公开谱库免登录 '"author"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 公开详情含数据 '"v":3' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 种子官方谱存在 '谱友圈官方' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 列表含类型与封面字段 '"type"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 列表含封面数据 '"cover"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"

# 已发布谱最小 SSR：落地页可爬 + og 封面（title/description/canonical/og/JSON-LD/真人跳转）
SSR=$(curl -s http://127.0.0.1:3199/pub/song_abc12345)
chk SSR落地页标题 '<title>小星星' "$SSR"
chk SSR含描述meta 'name="description"' "$SSR"
chk SSR含canonical 'rel="canonical"' "$SSR"
chk SSR含og:image '/pub/song_abc12345/cover.svg' "$SSR"
chk SSR含JSON-LD 'MusicComposition' "$SSR"
chk SSR真人跳转观看页 'location.replace' "$SSR"
chk SSR封面SVG 'svg xmlns' "$(curl -s http://127.0.0.1:3199/pub/song_abc12345/cover.svg)"
chk SSR封面ContentType 'image/svg' "$(curl -sD - -o /dev/null http://127.0.0.1:3199/pub/song_abc12345/cover.svg)"
chk SSR未发布谱不出SSR '不存在' "$(curl -s http://127.0.0.1:3199/pub/nonexistent1234)"
SM=$(curl -s http://127.0.0.1:3199/pub/sitemap.xml)
chk SSR站点地图列出发布谱 '/pub/song_abc12345' "$SM"
chk SSR站点地图XML '<urlset' "$SM"

chk 下架后公开404 '未发布' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/unpublish > /dev/null; curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 下架后SSR也404 '不存在' "$(curl -s http://127.0.0.1:3199/pub/song_abc12345)"

chk 删除谱面级联 '"deleted":true' "$(J -X DELETE http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 删除后谱架为空 '"shelf":\[\]' "$(J http://127.0.0.1:3199/api/shelf)"
chk 未登录被拒 '请先登录' "$(curl -s http://127.0.0.1:3199/api/scores)"
chk 登出 '"ok":true' "$(J -X POST http://127.0.0.1:3199/api/auth/logout)"
chk 登出后被拒 '请先登录' "$(J http://127.0.0.1:3199/api/me)"

echo; echo "通过 $pass / $((pass+fail))"
[ $fail -eq 0 ]
