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
J3(){ curl -s -b "$DIR/jar3" -c "$DIR/jar3" -H 'Content-Type: application/json' "$@"; }   # v60.5 第三方会话（绑手机号用例）

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

# v60.87 站内信：审核结果自动通知谱主（上文已发生 1 次驳回 + 1 次通过）+ 官方广播 + 已读
chk 未读数随me带出 '"unread_msgs":2' "$(J http://127.0.0.1:3199/api/me)"
chk 消息含驳回通知与原因 '歌词第2段缺字' "$(J http://127.0.0.1:3199/api/messages)"
chk 消息含上架通知 '已通过审核并上架' "$(J http://127.0.0.1:3199/api/messages)"
chk 未登录不能看消息 '请先登录' "$(curl -s http://127.0.0.1:3199/api/messages)"
chk 非管理员不能发公告 '需要平台管理员权限' "$(J -X POST http://127.0.0.1:3199/api/admin/broadcast -d '{"title":"x"}')"
chk 公告标题必填 '标题' "$(J2 -X POST http://127.0.0.1:3199/api/admin/broadcast -d '{"title":""}')"
chk 公告拒绝站外链接 '站内地址' "$(J2 -X POST http://127.0.0.1:3199/api/admin/broadcast -d '{"title":"通知","link":"https://evil.example.com/"}')"
chk 管理员发布公告 '"ok":true' "$(J2 -X POST http://127.0.0.1:3199/api/admin/broadcast -d '{"title":"课程模块筹备公告","body":"敬请期待","link":"https://www.puyouquan.com/kecheng.html"}')"
chk 广播对用户可见 '课程模块筹备公告' "$(J http://127.0.0.1:3199/api/messages)"
chk 未读数含广播 '"unread_msgs":3' "$(J http://127.0.0.1:3199/api/me)"
chk 一键全部已读 '"ok":true' "$(J -X POST http://127.0.0.1:3199/api/messages/read -d '{"all":true}')"
chk 已读后未读清零 '"unread_msgs":0' "$(J http://127.0.0.1:3199/api/me)"
chk 审计日志记录公告 '"action":"broadcast"' "$(J2 http://127.0.0.1:3199/api/admin/logs)"

# v60.88 管理控制台强化：公告历史/撤回（连同已读记录级联删）、兑换码 HTTP 化、订单、用户详情
chk 公告历史含已发布 '课程模块筹备公告' "$(J2 http://127.0.0.1:3199/api/admin/broadcasts)"
chk 公告历史含已读人数 '"reads":1' "$(J2 http://127.0.0.1:3199/api/admin/broadcasts)"
BCID=$(J2 http://127.0.0.1:3199/api/admin/broadcasts | grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+')
chk 非管理员不能撤回公告 '需要平台管理员权限' "$(J -X DELETE http://127.0.0.1:3199/api/admin/broadcasts/$BCID)"
chk 公告可撤回 '"ok":true' "$(J2 -X DELETE "http://127.0.0.1:3199/api/admin/broadcasts/$BCID")"
nchk 撤回后用户不再可见 '课程模块筹备公告' "$(J http://127.0.0.1:3199/api/messages)"
chk 非管理员不能生成兑换码 '需要平台管理员权限' "$(J -X POST http://127.0.0.1:3199/api/admin/codes -d '{"kind":"vip","count":1}')"
chk 非法kind被拒 '权益类型' "$(J2 -X POST http://127.0.0.1:3199/api/admin/codes -d '{"kind":"VIP!","count":1}')"
chk 生成兑换码 'PYQ-' "$(J2 -X POST http://127.0.0.1:3199/api/admin/codes -d '{"kind":"vip","days":30,"count":2}')"
chk 兑换码列表 '"code":"PYQ-' "$(J2 http://127.0.0.1:3199/api/admin/codes)"
chk 订单列表接口可用 '"orders"' "$(J2 http://127.0.0.1:3199/api/admin/orders)"
chk 用户详情含曲谱计数 '"total"' "$(J2 "http://127.0.0.1:3199/api/admin/users/$UID1/detail")"
chk 用户详情含权益与订单 '"entitlements"' "$(J2 "http://127.0.0.1:3199/api/admin/users/$UID1/detail")"
chk 审计记录生成码 '"action":"codes"' "$(J2 http://127.0.0.1:3199/api/admin/logs)"
chk 审计记录撤回公告 '"action":"bcast-del"' "$(J2 http://127.0.0.1:3199/api/admin/logs)"

# v60.90 课程：种子两门公开可读；工作台 建/改/发布/下架/删除；章节模型与权限
chk 课程种子含吉他课 '民谣吉他启蒙课' "$(curl -s http://127.0.0.1:3199/api/courses)"
chk 课程种子含幼儿课 '幼儿音乐启蒙课' "$(curl -s http://127.0.0.1:3199/api/courses)"
chk 课程详情含章节内容 '第一批和弦' "$(curl -s http://127.0.0.1:3199/api/courses/course-guitar-qimeng)"
chk 幼儿课含亲子任务 '亲子任务' "$(curl -s http://127.0.0.1:3199/api/courses/course-kids-qimeng)"
chk 未发布课程404 '不存在' "$(curl -s http://127.0.0.1:3199/api/courses/nope-course)"
chk 非管理员不能建课程 '需要平台管理员权限' "$(J -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-1 -d '{"title":"x"}')"
chk 工作台建课程草稿 '"saved":true' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-1 -d '{"title":"测试课","weeks":2,"data":{"chapters":[{"title":"第一章","task":"练 10 分钟"}]}}')"
nchk 草稿不进公开列表 '测试课' "$(curl -s http://127.0.0.1:3199/api/courses)"
chk 非法课程id被拒 '小写字母' "$(J2 -X PUT 'http://127.0.0.1:3199/api/admin/courses/BAD_ID' -d '{"title":"x"}')"
chk 无章节课程不能发布 '不能发布' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-2 -d '{"title":"空课"}' >/dev/null; J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-2/publish)"
chk 发布课程 '"status":"published"' "$(J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-1/publish)"
chk 发布后公开可见 '测试课' "$(curl -s http://127.0.0.1:3199/api/courses)"
chk 已发布课程不能直删 '先下架' "$(J2 -X DELETE http://127.0.0.1:3199/api/admin/courses/course-test-1)"
chk 下架课程 '"status":"draft"' "$(J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-1/unpublish)"
chk 删除草稿课程 '"ok":true' "$(J2 -X DELETE http://127.0.0.1:3199/api/admin/courses/course-test-1)"
chk 审计记录课程发布 '"action":"course-pub"' "$(J2 http://127.0.0.1:3199/api/admin/logs)"

# v60.5 微信账号补绑真实手机号（方案A 横幅的落点）：合成占位号可绑、真号不可改、被占用不静默合并
R3=$(J3 -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13700003456"}')
CODE3=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R3" | grep -oE '[0-9]{6}')
chk 已有真手机号的账号不能改绑 '已绑定手机号' "$(J -X POST http://127.0.0.1:3199/api/me/bind-phone -d "{\"phone\":\"13700003456\",\"code\":\"$CODE3\"}")"
chk 绑定需登录 '请先登录' "$(curl -s -X POST http://127.0.0.1:3199/api/me/bind-phone -H 'Content-Type: application/json' -d '{"phone":"13700003456","code":"000000"}')"
# 造一个「微信建号」态（phone 为 wx 合成占位）并自签 JWT——测试自己掌握 JWT_SECRET，
# 否则这条分支要真微信凭据才能走到，而它恰恰是最该守的：绑定成功 + 目标号被占用时不许静默合并。
WXTOK=$(DB_PATH="$DIR/t.db" JWT_SECRET=testsecret node -e '
  const c=require("node:crypto"), {q,now}=require("./db");
  const id=c.randomUUID(); q.userCreateWx.run(id,"wxTESTPLACEHOLD01","openid_test",null,"微信用户test","",now());
  const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
  const h=b({alg:"HS256",typ:"JWT"}), p=b({uid:id,tv:0,exp:now()+3600});
  const sig=c.createHmac("sha256",process.env.JWT_SECRET).update(h+"."+p).digest("base64url");
  console.log(h+"."+p+"."+sig);' 2>/dev/null | tail -1)
JW(){ curl -s -H "Cookie: pyq_token=$WXTOK" -H 'Content-Type: application/json' "$@"; }
chk 微信占位号会话可用 '"phone":""' "$(JW http://127.0.0.1:3199/api/me)"
# 冲突分支：OTP 校验先于占用判定，故被撞的号必须持有「未被消耗」的验证码——
# 直接在库里造该账号（不走登录、不吃验证码），再申请一条新码去撞。
DB_PATH="$DIR/t.db" node -e '
  const c=require("node:crypto"), {q,now}=require("./db");
  q.userCreate.run(c.randomUUID(),"13500001111","谱友1111",now());' 2>/dev/null
R5=$(J3 -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13500001111"}')
CODE5=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R5" | grep -oE '[0-9]{6}')
chk 绑已被占用的号要拒绝 '已注册过账号' "$(JW -X POST http://127.0.0.1:3199/api/me/bind-phone -d "{\"phone\":\"13500001111\",\"code\":\"$CODE5\"}")"
nchk 冲突时不改写任一方 '135\*\*\*\*1111' "$(JW http://127.0.0.1:3199/api/me)"
R4=$(J3 -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13600006789"}')
CODE4=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R4" | grep -oE '[0-9]{6}')
chk 微信占位号绑定成功 '136\*\*\*\*6789' "$(JW -X POST http://127.0.0.1:3199/api/me/bind-phone -d "{\"phone\":\"13600006789\",\"code\":\"$CODE4\"}")"
chk 绑定后不可再改绑 '已绑定手机号' "$(JW -X POST http://127.0.0.1:3199/api/me/bind-phone -d "{\"phone\":\"13700003456\",\"code\":\"$CODE3\"}")"

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

# v60.6 曲谱实例缩图：制谱器渲染真谱面 → 光栅化上传 → 卡片/og:image 当截图用
PNG1='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
nchk 未生成缩图时列表标记为0 '"thumb":1' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 缩图未生成时404 '404' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/api/pub/song_abc12345/thumb)"
chk 拒绝非图片数据 '缩图格式不合法' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345/thumb -d '{"data":"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PlBIT2pZWFpoYzJOeWFYQjA="}')"
chk 拒绝声明与内容不符 '不符' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345/thumb -d "{\"data\":\"data:image/webp;base64,$PNG1\"}")"
# 超大缩图走文件传参：400KB 的 base64 直接写进命令行会撞 execve 的 ARG_MAX
{ printf '{"data":"data:image/png;base64,'; head -c 300000 /dev/zero | base64 | tr -d '\n'; printf '"}'; } > "$DIR/big.json"
chk 拒绝超大缩图 '缩图过大' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345/thumb -d @"$DIR/big.json")"
chk 非本人不能改他人缩图 '只能为自己的曲谱生成缩图' "$(J2 -X PUT http://127.0.0.1:3199/api/scores/song_abc12345/thumb -d "{\"data\":\"data:image/png;base64,$PNG1\"}")"
chk 本人上传缩图成功 '"saved":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345/thumb -d "{\"data\":\"data:image/png;base64,$PNG1\"}")"
TH=$(curl -s -D - -o /dev/null http://127.0.0.1:3199/api/pub/song_abc12345/thumb)
chk 缩图ContentType 'image/png' "$TH"
chk 缩图带nosniff 'X-Content-Type-Options: nosniff' "$TH"
chk 缩图可缓存 'Cache-Control: public' "$TH"
ETAG=$(grep -oiE 'etag: *"[^"]+"' <<< "$TH" | sed -E 's/^[Ee][Tt][Aa][Gg]: *//')
chk 缩图带ETag '"t' "$ETAG"
chk 缩图命中304 '304' "$(curl -s -o /dev/null -w '%{http_code}' -H "If-None-Match: $ETAG" http://127.0.0.1:3199/api/pub/song_abc12345/thumb)"
chk 列表thumb为时间戳缓存戳 '"thumb":1' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 列表含调号等卡片信息 '"key"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 有缩图后og改指缩图带版本 '/api/pub/song_abc12345/thumb?v=' "$(curl -s http://127.0.0.1:3199/pub/song_abc12345)"
chk 缩图URL带查询串仍可取 '200' "$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:3199/api/pub/song_abc12345/thumb?v=123')"
nchk 谱面详情不外发缩图二进制 '"thumb":{' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"

# v60.7 复核修复回归
# ① verses 读真实字段 lyricLines（此前读不存在的 d.verses 恒为 0——死代码）
chk 更新谱面带歌词段数 '"saved":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"小星星","singer":"测试","updated_at":2100,"data":{"v":3,"title":"小星星","key":"G","beats":3,"unit":4,"tempo":72,"lyricLines":3,"measures":[{},{}]}}')"
chk 列表段词取自lyricLines '"verses":3' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
# ② WebP 魔数按字节精确比对：高位伪造（0xD2C9C6C6…0xD7C5C2D0 经 ascii 解码假冒 RIFF/WEBP）必须被拒
FAKE=$( { printf '\xd2\xc9\xc6\xc6\x00\x00\x00\x00\xd7\xc5\xc2\xd0'; head -c 52 /dev/zero; } | base64 | tr -d '\n')
chk 拒绝高位伪造的WebP魔数 '不符' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345/thumb -d "{\"data\":\"data:image/webp;base64,$FAKE\"}")"
# ③ 私有谱不收缩图（缩图只被公开接口消费，私有缩图是纯死重）
J -X PUT http://127.0.0.1:3199/api/scores/song_priv9990 -d '{"title":"私有","updated_at":2000,"data":{"v":3,"measures":[{}]}}' > /dev/null
chk 私有谱缩图被拒 '仅用于已发布' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_priv9990/thumb -d "{\"data\":\"data:image/png;base64,$PNG1\"}")"

chk 下架后公开404 '未发布' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/unpublish > /dev/null; curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 下架后缩图也404 '404' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/api/pub/song_abc12345/thumb)"
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
chk 管理订单列表含兑换订单与用户 '"channel":"redeem"' "$(J2 http://127.0.0.1:3199/api/admin/orders)"
chk 管理订单列表带昵称 '"nickname":"小谱"' "$(J2 http://127.0.0.1:3199/api/admin/orders)"
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
