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
nchk(){ # nchk 说明 不应出现的片段 实际输出
  if grep -q -- "$2" <<< "$3"; then fail=$((fail+1)); echo "❌ $1 —— 不应含[$2] 实际: $(head -c 300 <<< "$3")";
  else pass=$((pass+1)); echo "✅ $1"; fi
}
J(){ curl -s -b "$DIR/jar" -c "$DIR/jar" -H 'Content-Type: application/json' "$@"; }
J2(){ curl -s -b "$DIR/jar2" -c "$DIR/jar2" -H 'Content-Type: application/json' "$@"; }   # v60.0 管理员会话（独立 cookie jar）

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

# v60.0 审核流：创作者提交 → status=pending（谱库暂不展示）→ 平台管理员通过 → published
# 该会话用户在「升级创作者」步已是 creator，故直接测发布正向路径（角色门禁的负向由代码保证）
chk 创作者发布进审核队列 '"status":"pending"' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish)"
nchk 待审谱不进公开谱库 '"singer":"测试"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 非管理员访问管理接口403 '需要平台管理员权限' "$(J http://127.0.0.1:3199/api/admin/overview)"
chk 非管理员不能审核 '需要平台管理员权限' "$(J -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"approve"}')"

# 第二账号 + 服务器 CLI 任命首个管理员（HTTP 无自助提权路径）
R2=$(J2 -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13900002345"}')
CODE2=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R2" | grep -oE '[0-9]{6}')
J2 -X POST http://127.0.0.1:3199/api/auth/sms/verify -d "{\"phone\":\"13900002345\",\"code\":\"$CODE2\"}" > /dev/null
chk CLI任命管理员 '改为 admin' "$(DB_PATH="$DIR/t.db" node admin.js set-role 13900002345 admin 2>&1)"
chk CLI拒绝非法角色 '用法：set-role' "$(DB_PATH="$DIR/t.db" node admin.js set-role 13900002345 root 2>&1)"
chk CLI列出管理员 '13900002345' "$(DB_PATH="$DIR/t.db" node admin.js admins 2>&1)"
chk 管理员身份生效 '"role":"admin"' "$(J2 http://127.0.0.1:3199/api/me)"
chk 管理概览含待审数 '"pending":1' "$(J2 http://127.0.0.1:3199/api/admin/overview)"
chk 审核队列含待审谱 '小星星' "$(J2 'http://127.0.0.1:3199/api/admin/reviews?status=pending')"
chk 审核队列手机号打码 '138\*\*\*\*1234' "$(J2 'http://127.0.0.1:3199/api/admin/reviews?status=pending')"
chk 审核预览可读未上架谱 '"v":3' "$(J2 http://127.0.0.1:3199/api/admin/scores/song_abc12345)"
chk 驳回必须填原因 '驳回需填写原因' "$(J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"reject"}')"
chk 驳回落原因 '"status":"rejected"' "$(J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"reject","note":"歌词第2段缺字"}')"
chk 创作者看到驳回原因 '歌词第2段缺字' "$(J http://127.0.0.1:3199/api/scores)"
chk 重新提交回到待审 '"status":"pending"' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish)"
chk 重提清空旧驳回原因 '"review_note":""' "$(J2 http://127.0.0.1:3199/api/admin/scores/song_abc12345)"
chk 审核通过即上架 '"status":"published"' "$(J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"approve"}')"
chk 管理员看用户列表 '"nickname":"小谱"' "$(J2 http://127.0.0.1:3199/api/admin/users)"
chk 用户搜索按手机号 '"role":"creator"' "$(J2 'http://127.0.0.1:3199/api/admin/users?q=13800001234')"
chk 用户列表手机号打码 '138\*\*\*\*1234' "$(J2 http://127.0.0.1:3199/api/admin/users)"
UID1=$(J2 'http://127.0.0.1:3199/api/admin/users?q=13800001234' | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
chk 拿到目标用户id '.' "$UID1"
chk 管理员发放权益 '"kind":"pack_kaobian"' "$(J2 -X POST "http://127.0.0.1:3199/api/admin/users/$UID1/grant" -d '{"kind":"pack_kaobian","days":30}')"
chk 权益对用户生效 'pack_kaobian' "$(J http://127.0.0.1:3199/api/me/entitlements)"
chk 管理员撤销权益 '"ok":true' "$(J2 -X POST "http://127.0.0.1:3199/api/admin/users/$UID1/revoke" -d '{"kind":"pack_kaobian"}')"
nchk 撤销后权益消失 'pack_kaobian' "$(J http://127.0.0.1:3199/api/me/entitlements)"
chk 拒绝非法角色值 '角色只能是' "$(J2 -X POST "http://127.0.0.1:3199/api/admin/users/$UID1/role" -d '{"role":"root"}')"
chk 管理员改角色 '"role":"user"' "$(J2 -X POST "http://127.0.0.1:3199/api/admin/users/$UID1/role" -d '{"role":"user"}')"
chk 改回创作者 '"role":"creator"' "$(J2 -X POST "http://127.0.0.1:3199/api/admin/users/$UID1/role" -d '{"role":"creator"}')"
UID2=$(J2 http://127.0.0.1:3199/api/me | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
chk 不能自撤管理员 '不能取消自己的管理员身份' "$(J2 -X POST "http://127.0.0.1:3199/api/admin/users/$UID2/role" -d '{"role":"user"}')"
chk 审计日志记录审核 '"action":"approve"' "$(J2 http://127.0.0.1:3199/api/admin/logs)"
chk 审计日志记录改角色 '"action":"role"' "$(J2 http://127.0.0.1:3199/api/admin/logs)"
chk 审计日志记录CLI任命 'cli:set-role' "$(J2 http://127.0.0.1:3199/api/admin/logs)"
chk CLI查审计日志 'approve' "$(DB_PATH="$DIR/t.db" node admin.js logs 5 2>&1)"

# v60.3 小程序微信一键登录（手机号）：未配凭据时 503；参数校验先于外呼
chk 小程序一键登录未配置503 '未配置' "$(curl -s -X POST http://127.0.0.1:3199/api/wx/mini/phone -H 'Content-Type: application/json' -d '{"code":"abcdefgh1234"}')"
chk 小程序静默登录未配置503 '未配置' "$(curl -s -X POST http://127.0.0.1:3199/api/wx/mini/login -H 'Content-Type: application/json' -d '{"code":"abcdefgh1234"}')"
# -D - 取响应头但走 GET：路由只注册 GET，curl -I 的 HEAD 会 404（不是功能问题，是探测方式问题）
chk 小程序enter票据无效不报错只回跳 'Location: https://www.puyouquan.com/' "$(curl -s -D - -o /dev/null --max-time 10 'http://127.0.0.1:3199/api/wx/mini/enter?t=bad&to=https%3A%2F%2Fwww.puyouquan.com%2F')"
nchk 小程序enter拒绝站外跳转 'evil.example' "$(curl -s -D - -o /dev/null --max-time 10 'http://127.0.0.1:3199/api/wx/mini/enter?t=bad&to=https%3A%2F%2Fevil.example%2F')"

chk 公开谱库含已发布 '"singer":"测试"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
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

# v45.3 会员权益 / 兑换码 / 埋点（登录态延续上文会话）
chk 权益初始为免费 '"vip":false' "$(J http://127.0.0.1:3199/api/me/entitlements)"
chk 免费配额500 '"quota":500' "$(J http://127.0.0.1:3199/api/me/entitlements)"
CODE_VIP=$(DB_PATH="$DIR/t.db" node admin.js gen-codes 1 vip 30 2>/dev/null | tail -1)
chk 管理工具生成兑换码 'PYQ-' "$CODE_VIP"
chk 无效码被拒 '无效' "$(J -X POST http://127.0.0.1:3199/api/redeem -d '{"code":"PYQ-XXXX-XXXX-XXXX"}')"
chk 兑换成功 '"kind":"vip"' "$(J -X POST http://127.0.0.1:3199/api/redeem -d "{\"code\":\"$CODE_VIP\"}")"
chk 二次兑换被拒 '已被使用' "$(J -X POST http://127.0.0.1:3199/api/redeem -d "{\"code\":\"$CODE_VIP\"}")"
chk 兑换后为会员 '"vip":true' "$(J http://127.0.0.1:3199/api/me/entitlements)"
chk 会员配额2000 '"quota":2000' "$(J http://127.0.0.1:3199/api/me/entitlements)"
chk 埋点白名单事件 '"ok":true' "$(curl -s -X POST http://127.0.0.1:3199/api/events -H 'Content-Type: application/json' -d '{"name":"visit"}')"
# v45.4 微信支付（未配置环境）：价目表可读、下单 503、回调 FAIL 不发货
chk 价目表含三商品 '"vip_year"' "$(curl -s http://127.0.0.1:3199/api/pay/prices)"
chk 价目表金额为分 '"fen":9800' "$(curl -s http://127.0.0.1:3199/api/pay/prices)"
chk 未配置支付下单503 '未配置' "$(J -X POST http://127.0.0.1:3199/api/pay/create -d '{"kind":"vip_month"}')"
chk 未配置回调FAIL 'FAIL' "$(curl -s -X POST http://127.0.0.1:3199/api/pay/notify -H 'Content-Type: application/json' -d '{}')"
chk 管理工具查用户含权益 'vip' "$(DB_PATH="$DIR/t.db" node admin.js user 13800001234 2>/dev/null)"

# v60.1 小程序静默登录（本地未配 WX_MINI_* → login 应 503；enter 的票据/白名单逻辑与凭据无关，可独立验）
chk 健康暴露小程序开关 '"wx_mini":false' "$(curl -s http://127.0.0.1:3199/api/health)"
chk 未配置小程序登录503 '小程序登录未配置' "$(curl -s -X POST http://127.0.0.1:3199/api/wx/mini/login -H 'Content-Type: application/json' -d '{"code":"abcd1234"}')"
# 无票/坏票不报错，按未登录进站；to 只认站内，站外一律回落主站（防开放重定向）
EN1=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' 'http://127.0.0.1:3199/api/wx/mini/enter?t=bogus&to=https%3A%2F%2Fpuku.puyouquan.com%2Fkanpu.html%3Fpub%3Dx')
chk 坏票据仍302不报错 '302 https://puku.puyouquan.com/kanpu.html?pub=x' "$EN1"
EN2=$(curl -s -o /dev/null -w '%{redirect_url}' 'http://127.0.0.1:3199/api/wx/mini/enter?t=bogus&to=https%3A%2F%2Fevil.example.com%2F')
chk 站外to被拒回落主站 '^https://www.puyouquan.com/$' "$EN2"
EN3=$(curl -s -o /dev/null -w '%{redirect_url}' 'http://127.0.0.1:3199/api/wx/mini/enter?t=bogus&to=https%3A%2F%2Fwww.puyouquan.com.evil.com%2F')
chk 相似域名不误判 '^https://www.puyouquan.com/$' "$EN3"
nchk 坏票据不下发Cookie 'pyq_token=ey' "$(curl -sI 'http://127.0.0.1:3199/api/wx/mini/enter?t=bogus&to=https%3A%2F%2Fwww.puyouquan.com%2F')"

chk 删除谱面级联 '"deleted":true' "$(J -X DELETE http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 删除后谱架为空 '"shelf":\[\]' "$(J http://127.0.0.1:3199/api/shelf)"
chk 未登录被拒 '请先登录' "$(curl -s http://127.0.0.1:3199/api/scores)"
chk 登出 '"ok":true' "$(J -X POST http://127.0.0.1:3199/api/auth/logout)"
chk 登出后被拒 '请先登录' "$(J http://127.0.0.1:3199/api/me)"

echo; echo "通过 $pass / $((pass+fail))"
[ $fail -eq 0 ]
