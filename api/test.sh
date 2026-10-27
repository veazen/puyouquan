#!/usr/bin/env bash
# 谱友圈 API 本地端到端测试：DEV_OTP 模式跑完 登录→资料→谱面同步→收藏/谱架/谱集 全链路
set -uo pipefail
DIR=$(mktemp -d); SRV=; SRV2=; MOCK=; trap 'kill $SRV $SRV2 $MOCK 2>/dev/null; rm -rf "$DIR"' EXIT
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
# v69.3 公开谱库列表里只取一首的卡片（曲库公版谱补种后列表里有别的谱也带 verses 等字段，整表 grep 会误判）
PUBONE(){ curl -s http://127.0.0.1:3199/api/pub/scores | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify((j.scores||[]).find(x=>x.id===process.argv[1])||{}))})" "$1"; }

chk 健康检查 '"ok":true' "$(curl -s http://127.0.0.1:3199/api/health)"

R=$(J -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13800001234"}')
chk 发送验证码 '"sent":true' "$R"
CODE=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R" | grep -oE '[0-9]{6}')
chk 频控-60秒内重发被拒 '频繁' "$(J -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13800001234"}')"
chk 错误验证码被拒 '不正确' "$(J -X POST http://127.0.0.1:3199/api/auth/sms/verify -d "{\"phone\":\"13800001234\",\"code\":\"000000\"}")"
LG=$(J -X POST http://127.0.0.1:3199/api/auth/sms/verify -d "{\"phone\":\"13800001234\",\"code\":\"$CODE\"}")
chk 登录成功 '"nickname":"谱友[0-9A-F][0-9A-F][0-9A-F][0-9A-F]"' "$LG"
nchk v62.9 默认昵称不含手机号后四位 '"nickname":"谱友1234"' "$LG"
chk 手机号打码 '138\*\*\*\*1234' "$(J http://127.0.0.1:3199/api/me)"
chk 改昵称 '"nickname":"小谱"' "$(J -X PATCH http://127.0.0.1:3199/api/me -d '{"nickname":"小谱"}')"
chk 升级创作者 '"role":"creator"' "$(J -X POST http://127.0.0.1:3199/api/me/creator)"

chk 上传谱面 '"saved":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"小星星","singer":"测试","updated_at":2000,"data":{"v":3,"title":"小星星"}}')"
chk 旧版本冲突409 '"conflict":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"旧","updated_at":1000,"data":{"v":3}}')"
chk 谱面列表 '"title":"小星星"' "$(J http://127.0.0.1:3199/api/scores)"
chk 谱面详情含数据 '"v":3' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"
# v62.5 A1a 服务端按字段校验：拒绝危险、不拒绝陌生
chk 危险音级被拒 '谱面数据不合法' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_xss00001 -d '{"title":"x","updated_at":10,"data":{"v":3,"measures":[{"voxes":[[{"deg":"<img src=x onerror=alert(1)>"}]]}]}}')"
chk 危险技法被拒 'tech（含非法字符）' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_xss00001 -d '{"title":"x","updated_at":10,"data":{"v":3,"measures":[{"tabs":[[{"notes":[{"s":1,"f":3,"tech":"<svg onload=alert(1)>"}]}]]}]}}')"
chk 危险键名被拒 '键名含尖括号' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_xss00001 -d '{"title":"x","updated_at":10,"data":{"v":3,"customChords":{"<b>":[0,1]}}}')"
chk 楔形与歌词尖括号放行 '"saved":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_xss00002 -d '{"title":"<3","updated_at":10,"data":{"v":3,"title":"a<b","measures":[{"voxes":[[{"deg":1,"dyn":"<","lyrics":["<3"]},{"deg":2,"dyn":">"}]]}]}}')"
chk 旧版数字串放行 '"saved":true' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_xss00003 -d '{"title":"t","updated_at":10,"data":{"v":3,"tempo":"90","measures":[]}}')"
chk 未知字段透传 '"futureField":"<x>"' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_xss00004 -d '{"title":"t","updated_at":10,"data":{"v":3,"futureField":"<x>","measures":[]}}' >/dev/null; J http://127.0.0.1:3199/api/scores/song_xss00004)"
for X in song_xss00002 song_xss00003 song_xss00004; do J -X DELETE http://127.0.0.1:3199/api/scores/$X >/dev/null; done

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
# v62.4 A0-5：「我的曲谱」接口只给谱主本人——已发布的他人谱也不放行（他人谱走 /api/pub/scores/:id，观看端经清洗）
chk 非谱主读已发布谱的我的曲谱接口被拒 '这不是你的曲谱' "$(J2 http://127.0.0.1:3199/api/scores/song_abc12345)"
nchk 非谱主拿不到谱面数据 '"v":3' "$(J2 http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 谱主本人仍可读 '"v":3' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"
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
# v61.8 认识简谱课程（按 id 补种）+ 闯关题发布校验
chk 课程种子含认识简谱 'course-jianpu-renshi' "$(curl -s http://127.0.0.1:3199/api/courses)"
# v62.0 课程独立页 SSR：/course/ 目录、/course/<id> 落地页、/course/sitemap.xml
CIDX=$(curl -s http://127.0.0.1:3199/course/)
chk 课程目录页列出课程 '/course/course-jianpu-renshi' "$CIDX"
chk 课程目录页标题 '学习课程' "$CIDX"
chk 课程目录页canonical 'rel="canonical"' "$CIDX"
CSSR=$(curl -s http://127.0.0.1:3199/course/course-jianpu-renshi)
chk 课程页标题 '<title>认识简谱' "$CSSR"
chk 课程页含canonical 'rel="canonical"' "$CSSR"
chk 课程页含CourseLD '"@type":"Course"' "$CSSR"
chk 课程页列出小节 '1.1' "$CSSR"
chk 课程页含学习CTA 'kecheng.html?c=course-jianpu-renshi' "$CSSR"
nchk 课程页无自动跳转防桥页 'location.replace' "$CSSR"
chk 未发布课程页404 '不存在' "$(curl -s http://127.0.0.1:3199/course/nope-course-x)"
CSM=$(curl -s http://127.0.0.1:3199/course/sitemap.xml)
chk 课程站点地图含课程 '/course/course-jianpu-renshi' "$CSM"
chk 课程站点地图含目录 "<loc>https://www.puyouquan.com/course/</loc>" "$CSM"
chk robots含课程地图 'course/sitemap.xml' "$(cat ../muse-tab/site/robots.txt)"

# v61.9 课程 2.0：小节树（学习块/练习打卡/测试题）随接口整块下发
JPC=$(curl -s http://127.0.0.1:3199/api/courses/course-jianpu-renshi)
chk 简谱课含小节树 '"sections"' "$JPC"
chk 简谱课小节含三模块 '"practice"' "$JPC"
chk 简谱课小节含学习块 '"blocks"' "$JPC"
chk 简谱课小节含测试题 '"kind":"choice"' "$JPC"
chk 简谱课六章齐全 '连线、反复与第一首完整谱' "$JPC"
chk 简谱课小节数16 '"sections"' "$(node -e '
const http=require("http");http.get("http://127.0.0.1:3199/api/courses/course-jianpu-renshi",r=>{let b="";r.on("data",d=>b+=d);r.on("end",()=>{
const c=JSON.parse(b).course;const n=c.data.chapters.reduce((a,ch)=>a+(ch.sections||[]).length,0);
console.log(n===16?"\"sections\" 16 ok":"BAD "+n);});});')"
chk 坏闯关题拒发并定位 '第 1 章第 1 题' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-3 -d '{"title":"闯关校验","data":{"chapters":[{"title":"一","quiz":[{"q":"","opts":["a"],"a":5}]}]}}' >/dev/null; J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-3/publish)"
chk 修好闯关题可发布 '"status":"published"' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-3 -d '{"title":"闯关校验","data":{"chapters":[{"title":"一","quiz":[{"q":"1+1=?","opts":["1","2"],"a":1,"why":"basic"}]}]}}' >/dev/null; J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-3/publish)"
# v62.0 2.0 小节结构的发布校验（此前只校章级 quiz，小节 test.items 一条不校验就能发布，坏题让学员闯关卡死）
chk 小节坏题拒发并定位 '第 1.1 节第 1 题' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-4 -d '{"title":"小节校验","data":{"chapters":[{"title":"一","sections":[{"title":"1.1","learn":{"blocks":[]},"practice":{"blocks":[]},"test":{"items":[{"q":"","opts":["a"],"a":9}]}}]}]}}' >/dev/null; J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-4/publish)"
chk 小节缺标题拒发 '缺标题' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-5 -d '{"title":"小节校验2","data":{"chapters":[{"title":"一","sections":[{"title":"","learn":{"blocks":[]},"practice":{"blocks":[]},"test":{"items":[]}}]}]}}' >/dev/null; J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-5/publish)"
chk 小节题目合法可发布 '"status":"published"' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-4 -d '{"title":"小节校验","data":{"chapters":[{"title":"一","sections":[{"title":"1.1","learn":{"blocks":[]},"practice":{"blocks":[]},"test":{"items":[{"q":"1+1=?","opts":["1","2"],"a":1,"why":"w"}]}}]}]}}' >/dev/null; J2 -X POST http://127.0.0.1:3199/api/admin/courses/course-test-4/publish)"
# v63.3 A5 ④（P1-33）已发布课程的保存与发布同一道闸：坏题不能经 PUT 直接上线；保存回执如实告知是否对学员生效
chk 已发布课程保存坏题被拒 '这门课已发布' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-4 -d '{"title":"小节校验","data":{"chapters":[{"title":"一","sections":[{"title":"1.1","learn":{"blocks":[]},"practice":{"blocks":[]},"test":{"items":[{"q":"","opts":["a"],"a":9}]}}]}]}}')"
chk 被拒后线上内容不变 '"q":"1+1=?"' "$(J2 http://127.0.0.1:3199/api/admin/courses/course-test-4)"
chk 已发布课程保存合法内容即生效 '"live":true' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-4 -d '{"title":"小节校验","data":{"chapters":[{"title":"一","sections":[{"title":"1.1","learn":{"blocks":[]},"practice":{"blocks":[]},"test":{"items":[{"q":"2+2=?","opts":["4","5"],"a":0,"why":"w"}]}}]}]}}')"
chk 草稿保存回执不算生效 '"live":false' "$(J2 -X PUT http://127.0.0.1:3199/api/admin/courses/course-test-5 -d '{"title":"小节校验2","data":{"chapters":[{"title":"一","sections":[{"title":"","learn":{"blocks":[]},"practice":{"blocks":[]},"test":{"items":[]}}]}]}}')"
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

# v60.97 浏览数 + 点赞：详情每拉一次 +1（上面已拉 1 次，此处再拉 → ≥2）；点赞结构同收藏
chk 详情带统计字段 '"stats"' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 浏览数随拉取递增 '"views":4' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345 > /dev/null; curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 点赞已发布谱 '"ok":true' "$(J -X PUT http://127.0.0.1:3199/api/likes/song_abc12345)"
chk 点赞幂等 '"ok":true' "$(J -X PUT http://127.0.0.1:3199/api/likes/song_abc12345)"
chk 点赞记录列表 '"title":"小星星"' "$(J http://127.0.0.1:3199/api/likes)"
chk 详情点赞计数为1 '"likes":1' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
nchk 点赞未登录被拒 '"ok":true' "$(curl -s -X PUT http://127.0.0.1:3199/api/likes/song_abc12345)"
chk 取消点赞 '"ok":true' "$(J -X DELETE http://127.0.0.1:3199/api/likes/song_abc12345)"
chk 取消后计数为0 '"likes":0' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"

# 已发布谱最小 SSR：落地页可爬 + og 封面（title/description/canonical/og/JSON-LD）
SSR=$(curl -s http://127.0.0.1:3199/pub/song_abc12345)
chk SSR落地页标题 '<title>小星星' "$SSR"
chk SSR含描述meta 'name="description"' "$SSR"
chk SSR含canonical 'rel="canonical"' "$SSR"
chk SSR含og:image '/pub/song_abc12345/cover.svg' "$SSR"
chk SSR含JSON-LD 'MusicComposition' "$SSR"
# v61.7 收录工程：自动跳转是「桥页」信号（搜索引擎拒收薄跳转页）——改真人点击 CTA，落地页自身可收录
nchk SSR无自动跳转防桥页 'location.replace' "$SSR"
chk SSR含目录内链 '谱库目录' "$SSR"
chk SSR含相关曲谱内链 '相关曲谱' "$SSR"
chk SSR封面SVG 'svg xmlns' "$(curl -s http://127.0.0.1:3199/pub/song_abc12345/cover.svg)"
chk SSR封面ContentType 'image/svg' "$(curl -sD - -o /dev/null http://127.0.0.1:3199/pub/song_abc12345/cover.svg)"
chk SSR未发布谱不出SSR '不存在' "$(curl -s http://127.0.0.1:3199/pub/nonexistent1234)"
SM=$(curl -s http://127.0.0.1:3199/pub/sitemap.xml)
chk SSR站点地图列出发布谱 '/pub/song_abc12345' "$SM"
chk SSR站点地图XML '<urlset' "$SM"
# v61.7 谱库目录页：全部已发布谱纯 HTML 链接清单（首页→目录→每首谱的可爬路径）
PDIR=$(curl -s http://127.0.0.1:3199/pub/)
chk 目录页列出发布谱 '/pub/song_abc12345' "$PDIR"
chk 目录页标题 '曲谱目录' "$PDIR"
chk 目录页canonical 'rel="canonical"' "$PDIR"
chk 站点地图含目录页 '<loc>https://puku.puyouquan.com/pub/</loc>' "$SM"

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
# v62.5 A1b 发布快照：已发布谱换缩图只进草稿，须「提交更新审核」→ 管理员通过才外发
chk 已发布谱换缩图不立即外发 '404' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/api/pub/song_abc12345/thumb)"
chk 换缩图算未发布修改 '"pub_dirty":1' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 提交更新审核 '"revision":"pending"' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish)"
chk 待审队列含更新审核 '"revision":1' "$(J2 'http://127.0.0.1:3199/api/admin/reviews?status=pending')"
chk 管理员通过更新审核 '"revision":"applied"' "$(J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"approve"}')"
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
# v62.5 A1b 审核 TOCTOU：过审后改谱/改标题/改昵称，公开端不变；更新审核驳回仍展示上一版；通过后才换新
chk 过审后改谱公开端仍是旧快照 '"id":"song_abc12345".*"verses":0' "$(PUBONE song_abc12345)"
chk 草稿已有未发布修改 '"pub_dirty":1' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 改标题不立即上墙 '"title":"小星星"' "$(J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"违规标题","singer":"测试","updated_at":2101,"data":{"v":3,"title":"违规标题","key":"G","beats":3,"unit":4,"tempo":72,"lyricLines":3,"measures":[{},{}]}}' >/dev/null; curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
nchk SSR也不露草稿标题 '违规标题' "$(curl -s http://127.0.0.1:3199/pub/song_abc12345)"
chk 改昵称前署名 '"author":"小谱"' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
J -X PATCH http://127.0.0.1:3199/api/me -d '{"nickname":"改过的昵称"}' >/dev/null
chk 改昵称不影响已发布署名 '"author":"小谱"' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 改标题后提交更新审核 '"revision":"pending"' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish)"
chk 驳回更新须填原因 '驳回需填写原因' "$(J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"reject"}')"
chk 驳回更新 '"revision":"rejected"' "$(J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"reject","note":"标题不当"}')"
chk 驳回更新后谱不下架 '"title":"小星星"' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 驳回原因谱主可见 '"rev_note":"标题不当"' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"
J -X PUT http://127.0.0.1:3199/api/scores/song_abc12345 -d '{"title":"小星星","singer":"测试","updated_at":2102,"data":{"v":3,"title":"小星星","key":"G","beats":3,"unit":4,"tempo":72,"lyricLines":3,"measures":[{},{}]}}' >/dev/null
J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish >/dev/null
J2 -X POST http://127.0.0.1:3199/api/admin/scores/song_abc12345/review -d '{"action":"approve"}' >/dev/null
chk 列表段词取自lyricLines '"id":"song_abc12345".*"verses":3' "$(PUBONE song_abc12345)"
# v69.3 曲库公版谱：lib- 前缀留给官方（新建同 id 被拒）；作曲家不再写成「演唱」，按作曲家仍搜得到
chk 曲库id前缀不许别人新建 '不合法' "$(J -X PUT http://127.0.0.1:3199/api/scores/lib-os-lc9999999 -d '{"title":"占位","updated_at":3000,"data":{"v":3,"measures":[{}]}}')"
chk 曲库谱列表给作曲不给演唱 '"singer":"","composer":"舒伯特"' "$(PUBONE lib-os-lc6389103)"
LIBSSR=$(curl -s http://127.0.0.1:3199/pub/lib-os-lc6389103)
chk 曲库谱落地页写作曲 '舒伯特 作曲 · 谱友圈官方 制谱' "$LIBSSR"
nchk 曲库谱落地页不把作曲家写成演唱 '舒伯特 演唱' "$LIBSSR"
chk 曲库谱JSON-LD作曲者是作曲家 '"composer":{"@type":"Person","name":"舒伯特"}' "$LIBSSR"
chk 西文歌词节选按音节隔开 'A ve Ma ri a' "$LIBSSR"
chk 按作曲家搜得到曲库谱 '"id":"lib-os-lc6389103"' "$(curl -s 'http://127.0.0.1:3199/api/pub/scores?q=%E8%88%92%E4%BC%AF%E7%89%B9')"
chk 更新通过后署名取审核时昵称 '"author":"改过的昵称"' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_abc12345)"
chk 更新通过后无未发布修改 '"pub_dirty":0' "$(J http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 无改动再提交返回unchanged '"unchanged":true' "$(J -X POST http://127.0.0.1:3199/api/scores/song_abc12345/publish)"
J -X PATCH http://127.0.0.1:3199/api/me -d '{"nickname":"小谱"}' >/dev/null
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
nchk 坏票据不下发Cookie 'pyq_token=ey' "$(curl -s -D - -o /dev/null -A 'miniProgram' 'http://127.0.0.1:3199/api/wx/mini/enter?t=bogus&to=https%3A%2F%2Fwww.puyouquan.com%2F')"

chk 删除谱面级联 '"deleted":true' "$(J -X DELETE http://127.0.0.1:3199/api/scores/song_abc12345)"
chk 删除后谱架为空 '"shelf":\[\]' "$(J http://127.0.0.1:3199/api/shelf)"
chk 未登录被拒 '请先登录' "$(curl -s http://127.0.0.1:3199/api/scores)"
chk 登出 '"ok":true' "$(J -X POST http://127.0.0.1:3199/api/auth/logout)"
chk 登出后被拒 '请先登录' "$(J http://127.0.0.1:3199/api/me)"

# v62.5 A1a 存量扫描：绕过 API 直接塞一条带载荷的已发布谱（模拟校验上线前的历史数据），scan-xss 只读扫出、--quarantine 打回驳回
UIDX=$(node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);console.log(d.prepare('SELECT id FROM users LIMIT 1').get().id)" "$DIR/t.db")
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);d.prepare(\"INSERT INTO scores(id,user_id,title,status,data,updated_at,created_at) VALUES('song_evil0001',?,'恶意','published',?,1,1)\").run(process.argv[2], JSON.stringify({v:3,measures:[{voxes:[[{deg:'<img src=x onerror=alert(1)>'}]]}]}))" "$DIR/t.db" "$UIDX"
chk 存量扫描只读命中 'song_evil0001.*deg（应为数字）' "$(DB_PATH=$DIR/t.db node admin.js scan-xss)"
chk 存量扫描隔离 '已隔离' "$(DB_PATH=$DIR/t.db node admin.js scan-xss --quarantine)"
chk 隔离后谱库不可见 '不存在\|无权\|未上架\|找不到' "$(curl -s http://127.0.0.1:3199/api/pub/scores/song_evil0001)"

# v63.3 A5（P2-69 / D-05）官方示例谱：新库种子即拍发布快照（谱库立即可见）；存量旧版内容用 seed-fix 修订（只动没被人改过的）
chk 新库种子谱库立即可见 '"title":"小星星"' "$(curl -s 'http://127.0.0.1:3199/api/pub/scores?q=%E5%B0%8F%E6%98%9F%E6%98%9F')"
chk 种子已是最新 '已是最新' "$(DB_PATH=$DIR/t.db node admin.js seed-fix)"
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);const old=JSON.stringify({v:3,title:'小星星',measures:[{voxes:[[{dur:4,deg:5},{dur:4,deg:0}]]}]});
d.prepare(\"UPDATE scores SET data=?, pub_data=? WHERE title='小星星' AND user_id=(SELECT id FROM users WHERE phone='00000000000')\").run(old,old);
d.prepare(\"UPDATE scores SET data=?, updated_at=updated_at+5 WHERE title='欢乐颂' AND user_id=(SELECT id FROM users WHERE phone='00000000000')\").run(old)" "$DIR/t.db"
chk 旧版种子列入计划 '小星星.*待修订' "$(DB_PATH=$DIR/t.db node admin.js seed-fix)"
chk 被人改过的不动 '欢乐颂.*被人改过' "$(DB_PATH=$DIR/t.db node admin.js seed-fix)"
chk 修订并刷新快照 '已修订并刷新发布快照' "$(DB_PATH=$DIR/t.db node admin.js seed-fix --apply)"
chk 线上快照已是新版 '"dur":2' "$(node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);console.log(d.prepare(\"SELECT pub_data FROM scores WHERE title='小星星' AND user_id=(SELECT id FROM users WHERE phone='00000000000')\").get().pub_data)" "$DIR/t.db")"

（P1-34）：sitemap/目录全量收录、第 201 首起搜得到、老收藏卡片不消失、相关推荐走小查询
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);const uid=process.argv[2];
const ins=d.prepare(\"INSERT INTO scores(id,user_id,title,singer,status,data,updated_at,created_at,pub_data,pub_title,pub_singer,pub_author,pub_at) VALUES(?,?,?,?,'published',?,?,?,?,?,?,'批量',?)\");
for(let i=0;i<241;i++){ const id='bulk'+String(i).padStart(5,'0')+'xx'; const t='批量谱'+i; const sg=i%7?'歌手'+(i%5):'独特歌手'; const dt=JSON.stringify({v:3,title:t,measures:[{}]});
  ins.run(id,uid,t,sg,dt,1000+i,1000+i,dt,t,sg,1000+i); }" "$DIR/t.db" "$UIDX"
SM=$(curl -s http://127.0.0.1:3199/pub/sitemap.xml)
chk sitemap全量收录超过200首 '/pub/bulk00000xx<' "$SM"
chk sitemap含最新一首 '/pub/bulk00240xx<' "$SM"
chk 目录页全量 'bulk00000xx' "$(curl -s http://127.0.0.1:3199/pub/)"
chk 首页列表附total '"total":2' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
nchk 首页列表仍只取最新一批 'bulk00000xx' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"
chk 第201首起搜得到 '"id":"bulk00000xx"' "$(curl -s 'http://127.0.0.1:3199/api/pub/scores?q=%E6%89%B9%E9%87%8F%E8%B0%B10')"
chk 搜索按演唱者 '"total":35' "$(curl -s 'http://127.0.0.1:3199/api/pub/scores?q=%E7%8B%AC%E7%89%B9%E6%AD%8C%E6%89%8B')"
chk 搜索通配符按字面匹配 '"total":0' "$(curl -s 'http://127.0.0.1:3199/api/pub/scores?q=%25')"
J2 -X PUT http://127.0.0.1:3199/api/favorites/bulk00000xx >/dev/null   # 主会话已在上文登出，用管理员会话
chk 老收藏带完整卡片 '"cards":\[{"id":"bulk00000xx"' "$(J2 http://127.0.0.1:3199/api/favorites)"
REL=$(curl -s http://127.0.0.1:3199/pub/bulk00000xx)
chk 相关推荐同歌手优先 'bulk00238xx' "$REL"
nchk 相关推荐不被非同歌手的最新谱挤掉 'bulk00240xx' "$REL"

# v62.9 A4 合规：考编包停售改预约（D-01）、举报、管理员核查
chk 考编包不再接新单 '筹备中' "$(J2 -X POST http://127.0.0.1:3199/api/pay/create -d '{"kind":"pack_kaobian"}')"
chk 预约须登录 '请先登录' "$(curl -s -X POST -H 'Content-Type: application/json' http://127.0.0.1:3199/api/reserve -d '{"kind":"pack_kaobian"}')"
chk 预约登记 '"reserved":true' "$(J2 -X POST http://127.0.0.1:3199/api/reserve -d '{"kind":"pack_kaobian"}')"
chk 预约幂等 '"reserved":true' "$(J2 -X POST http://127.0.0.1:3199/api/reserve -d '{"kind":"pack_kaobian"}')"
chk 我的预约 '"kind":"pack_kaobian"' "$(J2 http://127.0.0.1:3199/api/me/reserves)"
chk 非预约品类被拒 '不支持预约' "$(J2 -X POST http://127.0.0.1:3199/api/reserve -d '{"kind":"vip"}')"
chk 匿名可举报 '"reported":true' "$(curl -s -X POST -H 'Content-Type: application/json' http://127.0.0.1:3199/api/report -d '{"score_id":"bulk00001xx","reason":"copyright","note":"<b>未授权</b>"}')"
chk 举报去重 '"reported":true' "$(curl -s -X POST -H 'Content-Type: application/json' http://127.0.0.1:3199/api/report -d '{"score_id":"bulk00001xx","reason":"copyright"}')"
chk 举报理由必选 '请选择举报理由' "$(curl -s -X POST -H 'Content-Type: application/json' http://127.0.0.1:3199/api/report -d '{"score_id":"bulk00001xx","reason":"x"}')"
chk 举报不存在的谱 '曲谱不存在' "$(curl -s -X POST -H 'Content-Type: application/json' http://127.0.0.1:3199/api/report -d '{"score_id":"nosuch0000","reason":"spam"}')"
chk 管理员看举报 '"score_id":"bulk00001xx"' "$(J2 http://127.0.0.1:3199/api/admin/reports)"
chk 举报按谱去重计数 '"n":1' "$(J2 http://127.0.0.1:3199/api/admin/reports)"
chk 概览含未处理举报与预约 '"reports":1' "$(J2 http://127.0.0.1:3199/api/admin/overview)"
chk 处理举报 '"closed":1' "$(J2 -X POST http://127.0.0.1:3199/api/admin/reports/bulk00001xx/close)"
chk 管理员核查已售出 '已付款订单 0 笔' "$(DB_PATH=$DIR/t.db node admin.js sold pack_kaobian)"
chk 管理员看预约人数 'pack_kaobian  1 人' "$(DB_PATH=$DIR/t.db node admin.js reserves)"

# v63.4 A7 度量地基：一方匿名标识 pyq_anon、事件白名单补齐、首触来源、注册缝合、按访客+IP 限流、去重漏斗与留存、分享渠道
J4(){ curl -s -b "$DIR/jar4" -c "$DIR/jar4" -H 'Content-Type: application/json' "$@"; }
SQL(){ node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);const r=d.prepare(process.argv[2]).all();console.log(JSON.stringify(r))" "$DIR/t.db" "$1"; }
H1=$(curl -s -D - -o /dev/null -b "$DIR/jar4" -c "$DIR/jar4" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"visit","meta":"kaobian","src":"utm:bd/cpc/kb","landing":"www/kaobian.html"}')
chk 首个事件下发匿名标识 'pyq_anon=' "$H1"
chk 匿名标识HttpOnly '[Hh]ttp[Oo]nly' "$(grep -i 'pyq_anon' <<< "$H1")"
H2=$(curl -s -D - -o /dev/null -b "$DIR/jar4" -c "$DIR/jar4" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"cta_click","meta":"kaobian:开始制谱"}')
nchk 已有标识不重发 'pyq_anon=' "$H2"
ANON=$(grep -oE 'pyq_anon\s+[A-Za-z0-9_-]+' "$DIR/jar4" | awk '{print $2}')
chk 首触来源与落地页入库 'utm:bd/cpc/kb.*www/kaobian.html' "$(SQL "SELECT src,landing FROM events WHERE anon_id='$ANON' AND name='visit'")"
chk 新增事件名被接收 '"name":"cta_click"' "$(SQL "SELECT name FROM events WHERE anon_id='$ANON'")"
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"signup","meta":"forged"}' >/dev/null
chk 客户端不能伪造注册事件 '\[\]' "$(SQL "SELECT id FROM events WHERE meta='forged'")"
R4=$(J4 -X POST http://127.0.0.1:3199/api/auth/sms/send -d '{"phone":"13800007777"}'); C4=$(grep -oE '"dev_code":"[0-9]{6}"' <<< "$R4" | grep -oE '[0-9]{6}')
J4 -X POST http://127.0.0.1:3199/api/auth/sms/verify -d "{\"phone\":\"13800007777\",\"code\":\"$C4\"}" >/dev/null
chk 注册事件缝合匿名标识 "\"anon_id\":\"$ANON\"" "$(SQL "SELECT anon_id FROM events WHERE name='signup' AND meta='sms' ORDER BY id DESC LIMIT 1")"
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"arrange_done","meta":"slow:teach"}' >/dev/null
chk 登录后事件同时带账号与匿名标识 '"user_id":"[^"]\+","anon_id":"'"$ANON" "$(SQL "SELECT user_id,anon_id FROM events WHERE name='arrange_done' ORDER BY id DESC LIMIT 1")"
OV=$(J2 http://127.0.0.1:3199/api/admin/overview)
chk 漏斗带去重人数 '"name":"visit","n":[0-9]*,"u":[0-9]' "$OV"
chk 北极星与留存 '"metrics":{"north7":[1-9]' "$OV"
chk 匿名与账号缝合为同一人 '"name":"cta_click","n":1,"u":1' "$OV"
chk CLI统计带人数与北极星 '北极星' "$(DB_PATH=$DIR/t.db node admin.js stats)"
for i in $(seq 1 305); do curl -s -o /dev/null -b "$DIR/jar5" -c "$DIR/jar5" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"transpose","meta":"flood"}'; done
curl -s -o /dev/null -b "$DIR/jar6" -c "$DIR/jar6" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"transpose","meta":"flood2"}'
chk 单访客每小时300条封顶 '"n":300' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE meta='flood'")"
chk 同IP的其他访客不受牵连 '"n":1' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE meta='flood2'")"

# v68.2 匿名界面命令 ui_cmd（计划 §5.3）：meta 只收命令 id（格式不符整条丢）· 后台「界面」行 uiModes · 漏斗不含 ui_cmd · 独立限流不占 300 条
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"mode:engrave"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"mode:output"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"cmd:go:lay:a4"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"visit","landing":"zhipu/"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"《小星星》歌词"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"Mode:Engrave"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"pal:'"$(printf 'x%.0s' $(seq 1 70))"'"}' >/dev/null
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd"}' >/dev/null
chk ui_cmd入库只有命令id '^\[{"meta":"mode:engrave"},{"meta":"mode:output"},{"meta":"cmd:go:lay:a4"}\]$' "$(SQL "SELECT meta FROM events WHERE name='ui_cmd' ORDER BY id")"
OV=$(J2 http://127.0.0.1:3199/api/admin/overview)
chk 后台界面行uiModes '"uiModes":{"engrave":1,"output":1,"flow":1,"editors":1,"days":7}' "$OV"
nchk 漏斗不含ui_cmd '"name":"ui_cmd"' "$OV"
chk 漏斗照常含visit '"name":"visit","n":[0-9]*,"u":[0-9]' "$OV"
chk CLI统计带界面行 '界面（近 7 天）：用过「排版」1 人 · 「输出」1 人 / 新外壳有操作 1 人（编辑访客 1 人，含手机、旧版布局、只开启动台）' "$(DB_PATH=$DIR/t.db node admin.js stats)"
curl -s -o /dev/null -b "$DIR/jar5" -c "$DIR/jar5" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"st:loop"}'
chk 300条封顶的访客ui_cmd照收 '"n":1' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE name='ui_cmd' AND meta='st:loop'")"
for i in $(seq 1 125); do curl -s -o /dev/null -b "$DIR/jar7" -c "$DIR/jar7" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"ui_cmd","meta":"rd:pin"}'; done
chk ui_cmd单访客每小时120条封顶 '"n":120' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE name='ui_cmd' AND meta='rd:pin'")"
curl -s -o /dev/null -b "$DIR/jar7" -c "$DIR/jar7" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3199/api/events -d '{"name":"transpose","meta":"after-ui"}'
chk ui_cmd封顶不连累其他事件 '"n":1' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE meta='after-ui'")"
# v68.2 收尾 ENG-5：同一出口 IP（学校机房）下 26 个访客各发满 120 条 ui_cmd（3120 条 > 3000）：ui_cmd 的每 IP 上限单独计，之后同 IP 的访问与成品事件照收
node -e '
(async()=>{ const post=async(jar,body)=>{ const r=await fetch("http://127.0.0.1:3199/api/events",{method:"POST",headers:{"Content-Type":"application/json","X-Real-IP":"10.68.2.5",...(jar.c?{Cookie:jar.c}:{})},body:JSON.stringify(body)});
    const sc=r.headers.get("set-cookie"); if(sc&&!jar.c) jar.c=sc.split(";")[0]; await r.text(); };
  for(let s=0;s<26;s++){ const jar={}; await post(jar,{name:"visit",landing:"zhipu/ipcap"}); for(let i=0;i<120;i++) await post(jar,{name:"ui_cmd",meta:"pal:ipcap"+(i%30)}); }
  const late={}; await post(late,{name:"visit",landing:"zhipu/ipcap-late"}); await post(late,{name:"print_dialog",meta:"ipcap-after"});
})();'
chk 同IP的ui_cmd打满后成品事件照收 '"n":1' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE name='print_dialog' AND meta='ipcap-after'")"
chk 同IP的ui_cmd打满后访问事件照收 '"n":27' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE name='visit' AND landing LIKE 'zhipu/ipcap%'")"
chk 同IP的ui_cmd有自己的每IP上限 '"n":3000' "$(SQL "SELECT COUNT(*) AS n FROM events WHERE name='ui_cmd' AND meta LIKE 'pal:ipcap%'")"
chk 落地页分享渠道带进观看页 'kanpu.html?pub=bulk00238xx&amp;f=card' "$(curl -s 'http://127.0.0.1:3199/pub/bulk00238xx?f=card')"
nchk 非法渠道不带 'f=%3Cx' "$(curl -s 'http://127.0.0.1:3199/pub/bulk00238xx?f=%3Cx%3E')"

# v67.6 谱名同步（拍板 4 / 5）：谱库卡片 typeLabel、SSR 落地页、og 封面改读统一谱名表 api/kindname.js（与编辑器同一份）；谱类 type 不变。
# 直接在库里放几份已发布谱（不走审核链路，只验谱名口径），再从公开接口读回
DB_PATH="$DIR/t.db" node -e '
  const {q,now}=require("./db"); const uid="kindname0001"; q.userCreate.run(uid,"13100002222","谱名测试",now());
  const m=(n,ly)=>[{tabs:[],voxes:Array.from({length:n},()=>[{dur:4,deg:1,oct:0,acc:"",lyrics:ly?["啊"]:[]}])}];
  const S=[["kn_ukujt001","尤克里里弹唱",{v:3,inst:"uku",tabVoices:["尤克里里1"],voxVoices:["旋律1"],lyricLines:1,measures:[{tabs:[[]],voxes:[[]]}]}],
    ["kn_jg000001","钢琴伴奏歌",{v:3,tabVoices:[],voxVoices:["旋律","右手伴奏","左手伴奏"],voxNotations:[null,"staff","bass"],voxGroups:[{type:"brace",from:1,to:2}],lyricLines:1,measures:m(3,1)}],
    ["kn_sjg00001","对照含伴奏",{v:3,tabVoices:[],voxVoices:["旋律","右手伴奏","左手伴奏"],voxNotations:["staff","staff","bass"],voxDual:[true,false,false],voxGroups:[{type:"brace",from:1,to:2}],lyricLines:1,measures:m(3,1)}],
    ["kn_smel0001","五线旋律",{v:3,tabVoices:[],voxVoices:["旋律"],voxNotations:["staff"],lyricLines:0,measures:m(1,0)}],
    ["kn_cg000001","纯伴奏",{v:3,tabVoices:[],voxVoices:["右手","左手"],voxNotations:["staff","bass"],pianoAcc:true,lyricLines:1,measures:m(2,0)}],
    ["kn_bad00001","脏数据",{v:3,voxVoices:"abc",measures:[null]}]];
  const t=now(); for(const [id,title,d] of S){ q.scoreUpsert.run(id,uid,title,"",JSON.stringify(d),t,t); q.scoreSetStatus.run("published",id,uid); q.scoreSnap.run(t+1,id); }' 2>/dev/null
PL=$(curl -s http://127.0.0.1:3199/api/pub/scores)
chk 谱库卡片谱名·尤克里里弹唱谱 '"id":"kn_ukujt001"[^}]*"type":"uku","typeLabel":"尤克里里弹唱谱"' "$PL"
chk 谱库卡片谱名·钢琴伴奏歌谱（谱类仍是vocal） '"id":"kn_jg000001"[^}]*"type":"vocal","typeLabel":"钢琴伴奏歌谱"' "$PL"
chk 谱库卡片谱名·教学对照谱（含伴奏）（谱类仍是teach） '"id":"kn_sjg00001"[^}]*"type":"teach","typeLabel":"教学对照谱（含伴奏）"' "$PL"
chk 谱库卡片谱名·五线谱旋律（谱类仍是instr） '"id":"kn_smel0001"[^}]*"type":"instr","typeLabel":"五线谱旋律"' "$PL"
chk 谱库卡片谱名·钢琴弹唱谱（纯伴奏） '"id":"kn_cg000001"[^}]*"type":"pianoacc","typeLabel":"钢琴弹唱谱（纯伴奏）"' "$PL"
chk 脏数据谱不拖垮列表·回落曲谱 '"id":"kn_bad00001"[^}]*"typeLabel":"曲谱"' "$PL"
nchk 谱库不再出现旧叫法器乐五线谱 '"typeLabel":"器乐五线谱"' "$PL"
chk SSR落地页标题用统一谱名 '<title>钢琴伴奏歌 钢琴伴奏歌谱 - 谱友圈谱库</title>' "$(curl -s http://127.0.0.1:3199/pub/kn_jg000001)"
chk SSR描述用统一谱名 '制谱 · 教学对照谱（含伴奏） · 共1小节' "$(curl -s http://127.0.0.1:3199/pub/kn_sjg00001)"
chk SSR面包屑用统一谱名 '谱库目录</a> › 尤克里里弹唱谱' "$(curl -s http://127.0.0.1:3199/pub/kn_ukujt001)"
chk og封面用统一谱名 '五线谱旋律 · 1 小节' "$(curl -s http://127.0.0.1:3199/pub/kn_smel0001/cover.svg)"
# v67.6 收尾验收：① 没词也没留词位的器乐谱（导入的长笛＋钢琴、弦乐四重奏）不叫「歌谱」「合唱」；② 恶意数据按观看页口径（清洗后）起名；
# ③ 一份坏谱（歌词写成字符串的两行谱表 / 声部不是数组 / data 为 null）不再让谱库列表整页 500，落地页与封面照常出
DB_PATH="$DIR/t.db" node -e '
  const {q,now}=require("./db"); const uid="kindname0001";
  const c=(ly)=>({dur:4,deg:1,oct:0,acc:"",lyrics:ly?["啊"]:[]});
  const S=[["kn_flpno001","长笛与钢琴",{v:3,tabVoices:[],voxVoices:["Flute","Piano·右手","Piano·左手"],voxNotations:["staff","staff","bass"],voxGroups:[{type:"brace",from:1,to:2}],lyricLines:0,measures:[{tabs:[],voxes:[[c()],[c()],[c()]]}]}],
    ["kn_strq0001","弦乐四重奏",{v:3,tabVoices:[],voxVoices:["Vn1","Vn2","Va","Vc"],voxNotations:["staff","staff","alto","bass"],lyricLines:0,measures:[{tabs:[],voxes:[[c()],[c()],[c()],[c()]]}]}],
    ["kn_satb0001","四部合唱",{v:3,tabVoices:[],voxVoices:["S","A","T","B"],voxNotations:["staff","staff","staff","bass"],lyricLines:1,measures:[{tabs:[],voxes:[[c(1)],[c(1)],[c(1)],[c(1)]]}]}],
    ["kn_ukuev001","恶意乐器名",{v:3,inst:"uku`",tabVoices:["尤克里里1"],voxVoices:["旋律1"],lyricLines:1,measures:[{tabs:[[]],voxes:[[c()]]}]}],
    ["kn_strly001","歌词是字符串",{v:3,tabVoices:[],voxVoices:["女","男"],voxNotations:["staff","bass"],lyricLines:1,measures:[{tabs:[],voxes:[[{deg:1,dur:4,lyrics:"啊"}],[{deg:1,dur:4}]]}]}],
    ["kn_vobj0001","声部不是数组",{v:3,tabVoices:[],voxVoices:["a"],voxNotations:["staff"],lyricLines:1,measures:[{tabs:[],voxes:{a:1}}]}],
    ["kn_null0001","data为null",null]];
  const t=now(); for(const [id,title,d] of S){ q.scoreUpsert.run(id,uid,title,"",JSON.stringify(d),t,t); q.scoreSetStatus.run("published",id,uid); q.scoreSnap.run(t+1,id); }' 2>/dev/null
PL2=$(curl -s -w '\nHTTP%{http_code}' http://127.0.0.1:3199/api/pub/scores)
chk 坏谱不拖垮谱库列表（歌词是字符串的两行谱表） 'HTTP200' "$PL2"
chk 无词长笛＋钢琴＝旋律＋钢琴伴奏谱（五线谱） '"id":"kn_flpno001"[^}]*"type":"instr","typeLabel":"旋律＋钢琴伴奏谱（五线谱）"' "$PL2"
chk 无词弦乐四重奏＝五线谱重奏谱（谱类仍是instr） '"id":"kn_strq0001"[^}]*"type":"instr","typeLabel":"五线谱重奏谱"' "$PL2"
chk 有词四部合唱仍是五线谱合唱谱 '"id":"kn_satb0001"[^}]*"type":"vocal","typeLabel":"五线谱合唱谱"' "$PL2"
nchk 无词器乐谱不叫歌谱或合唱 '"id":"kn_\(flpno\|strq0\)[^}]*"typeLabel":"[^"]*\(歌谱\|合唱\)' "$PL2"
chk 恶意乐器名按观看页清洗后起名 '"id":"kn_ukuev001"[^}]*"typeLabel":"尤克里里弹唱谱"' "$PL2"
chk 歌词是字符串的坏谱自己回落 '"id":"kn_strly001"[^}]*"typeLabel":"[^"]*"' "$PL2"
chk data为null的坏谱回落曲谱 '"id":"kn_null0001"[^}]*"typeLabel":"曲谱"' "$PL2"
chk 声部不是数组的坏谱落地页照常出 '200' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/pub/kn_vobj0001)"
chk 声部不是数组的坏谱封面照常出 '200' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/pub/kn_vobj0001/cover.svg)"
chk data为null的坏谱落地页照常出 '200' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/pub/kn_null0001)"
chk 无词长笛＋钢琴落地页标题 '<title>长笛与钢琴 旋律＋钢琴伴奏谱（五线谱） - 谱友圈谱库</title>' "$(curl -s http://127.0.0.1:3199/pub/kn_flpno001)"
# v67.6 埋点 create_stack（新建面板 / 新建 ▾ 建谱时与 create_song 同发）：白名单接受并入库
J4 -X POST http://127.0.0.1:3199/api/events -d '{"name":"create_stack","meta":"pacc:JG:menu:pacc:0"}' >/dev/null
chk 埋点create_stack入库 '"meta":"pacc:JG:menu:pacc:0"' "$(SQL "SELECT name,meta FROM events WHERE name='create_stack'")"
# v67.6 第二轮验收（修前红修后绿）：
# S-1 顶层标量字段是对象（key / tempo / lyricLines 写成 {"toString":1}）：写侧拒收；库里已有的（旧数据 / 直接改库）读侧逐行兜底——
#     谱库列表 / 搜索 / 收藏 / 落地页 / 封面都 200，坏谱自己那张卡回落默认（此前 String(d.key) 抛错整页 500）
chk 顶层key为对象被拒收 '谱面数据不合法.*data.key' "$(J4 -X PUT http://127.0.0.1:3199/api/scores/song_kill0001 -d '{"title":"k","updated_at":10,"data":{"v":3,"key":{"toString":1},"tabVoices":[],"voxVoices":["a"],"measures":[]}}')"
chk 顶层tempo为对象被拒收 '谱面数据不合法.*data.tempo' "$(J4 -X PUT http://127.0.0.1:3199/api/scores/song_kill0001 -d '{"title":"k","updated_at":10,"data":{"v":3,"tempo":{"valueOf":1},"tabVoices":[],"voxVoices":["a"],"measures":[]}}')"
chk 嵌套同名数组键照常保存 '"saved":true' "$(J4 -X PUT http://127.0.0.1:3199/api/scores/song_kill0002 -d '{"title":"k","updated_at":10,"data":{"v":3,"key":"G","tempo":"90","customPat":[{"R":[{"d":4,"s":["1","3","5"]}]}],"tabVoices":[],"voxVoices":["a"],"measures":[]}}')"
J4 -X DELETE http://127.0.0.1:3199/api/scores/song_kill0002 >/dev/null
DB_PATH="$DIR/t.db" node -e '
  const {q,now}=require("./db"); const uid="kindname0001";
  const c=(o)=>Object.assign({dur:4,deg:1,oct:0,acc:"",lyrics:[]},o||{});
  const B=(o)=>Object.assign({v:3,key:"C",beats:4,unit:4,tempo:90,tabVoices:[],voxVoices:["a"],lyricLines:0,measures:[{tabs:[],voxes:[[c()]]}]},o);
  const S=[["r2_kkey0001","坏谱key对象",B({key:{toString:1}})],
    ["r2_ktmp0001","坏谱tempo对象",B({tempo:{toString:1,valueOf:1}})],
    ["r2_klyl0001","坏谱lyricLines对象",B({lyricLines:{toString:1,valueOf:1}})],
    ["r2_kdeg0001","坏谱音级与歌词对象",B({measures:[{tabs:[],voxes:[[c({deg:{valueOf:1},lyrics:[{toString:1}]}),c({deg:3,lyrics:["啊"]})]]}]})],
    ["r2_koct0001","高音点一百万",B({measures:[{tabs:[],voxes:[[c({deg:5,oct:1e6}),c({deg:1,oct:-1e6})]]}]})],
    ["r2_v2000001","旧格式v2",{v:2,key:"G",beats:4,unit:4,tempo:90,measures:[{tab:[{dur:4,notes:[{s:6,f:3}]}],vox:[{dur:4,deg:1,lyric:"啊"}]}]}],
    ["r2_notab001","缺tabVoices",{v:3,key:"C",beats:4,unit:4,tempo:90,voxVoices:["旋律"],lyricLines:1,measures:[{voxes:[[c({lyrics:["啊"]})]]}]}],
    ["r2_cache001","缓存换内容",B({lyricLines:1,measures:[{tabs:[],voxes:[[c({lyrics:["啊"]})]]}]})]];
  const t=now(); for(const [id,title,d] of S){ q.scoreUpsert.run(id,uid,title,"",JSON.stringify(d),t,t); q.scoreSetStatus.run("published",id,uid); q.scoreSnap.run(t+1,id); }' 2>/dev/null
PL3=$(curl -s -w '\nHTTP%{http_code}' http://127.0.0.1:3199/api/pub/scores)
chk 顶层对象字段的坏谱不拖垮谱库列表 'HTTP200' "$PL3"
PJ(){ node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>{let j={};try{j=JSON.parse(t.replace(/\nHTTP\d+\s*$/,""));}catch(_){} const x=(j.scores||[]).find(s=>s.id===process.argv[1]); console.log(JSON.stringify(x?{key:x.key,tempo:x.tempo,verses:x.verses,typeLabel:x.typeLabel}:null));})' "$1" <<< "$2"; }   # 取列表里某一张卡片的标量字段
chk key对象的坏谱自己回落空调号 '"key":"","tempo":90' "$(PJ r2_kkey0001 "$PL3")"
chk tempo对象的坏谱自己回落0 '"key":"C","tempo":0' "$(PJ r2_ktmp0001 "$PL3")"
chk lyricLines对象的坏谱歌词段数与谱名回落 '"verses":0,"typeLabel":"曲谱"' "$(PJ r2_klyl0001 "$PL3")"
chk 音级与歌词为对象的坏谱封面跳过坏音 '"id":"r2_kdeg0001"[^}]*"cover":\[{"deg":3,"oct":0,"ly":"啊"}\]' "$PL3"
chk 封面高低音点夹到正负3 '"id":"r2_koct0001"[^}]*"cover":\[{"deg":5,"oct":3,"ly":""},{"deg":1,"oct":-3,"ly":""}\]' "$PL3"
chk 顶层对象字段的坏谱不拖垮搜索 'HTTP200' "$(curl -s -o /dev/null -w 'HTTP%{http_code}' 'http://127.0.0.1:3199/api/pub/scores?q=%E5%9D%8F%E8%B0%B1')"
chk key对象的坏谱落地页照常出 '200' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/pub/r2_kkey0001)"
chk tempo对象的坏谱封面照常出 '200' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/pub/r2_ktmp0001/cover.svg)"
chk 音级与歌词为对象的坏谱落地页照常出 '200' "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3199/pub/r2_kdeg0001)"
J4 -X PUT http://127.0.0.1:3199/api/favorites/r2_kkey0001 >/dev/null
chk 收藏了坏谱收藏列表照常出 'HTTP200' "$(J4 -w '\nHTTP%{http_code}' http://127.0.0.1:3199/api/favorites)"
J4 -X DELETE http://127.0.0.1:3199/api/favorites/r2_kkey0001 >/dev/null
# S-4 og 封面高低音点：oct=±1e6 的谱 cover.svg 不再生成 53MB（每个音最多 3 个点）
CV=$(curl -s http://127.0.0.1:3199/pub/r2_koct0001/cover.svg)
chk 封面oct一百万体积正常 'OK' "$([ ${#CV} -lt 20000 ] && echo OK || echo "size=${#CV}")"
chk 封面oct一百万每音最多3个点 '^6$' "$(grep -o '<circle' <<< "$CV" | wc -l | tr -d ' ')"
# S-2 观看页打得开才给具体谱名：v:2 旧格式（观看页按 migrate 后的口径能开）＝吉他弹唱谱；v3 缺 tabVoices（观看页打不开、提示数据异常）＝曲谱
chk 旧格式v2谱库叫吉他弹唱谱 '"id":"r2_v2000001"[^}]*"typeLabel":"吉他弹唱谱"' "$PL3"
chk 缺tabVoices的坏谱谱库回落曲谱 '"id":"r2_notab001"[^}]*"typeLabel":"曲谱"' "$PL3"
# S-3 列表缓存按快照内容摘要：另一进程（admin.js scan-xss）刷新快照保留原发布时间时，谱库立刻跟上新内容
chk 缓存前简谱歌谱 '"id":"r2_cache001"[^}]*"typeLabel":"简谱歌谱"' "$PL3"
DB_PATH="$DIR/t.db" node -e '
  const {DatabaseSync}=require("node:sqlite"); const d=new DatabaseSync(process.env.DB_PATH);
  const g={v:3,key:"C",beats:4,unit:4,tempo:90,tabVoices:[],voxVoices:["右","左"],voxNotations:["staff","bass"],lyricLines:0,measures:[{tabs:[],voxes:[[{dur:4,deg:1}],[{dur:4,deg:1}]]}]};
  d.prepare("UPDATE scores SET pub_data = ? WHERE id = ?").run(JSON.stringify(g),"r2_cache001");' 2>/dev/null
chk 同一发布时间换了快照内容谱库跟上 '"id":"r2_cache001"[^}]*"typeLabel":"钢琴独奏谱"' "$(curl -s http://127.0.0.1:3199/api/pub/scores)"

# v62.6 A1c 小程序登录处理器：本地模拟微信接口（wxmock.js）+ 第二个配了小程序凭据的服务实例
node wxmock.js 3196 > /dev/null 2>&1 & MOCK=$!
PORT=3197 DB_PATH="$DIR/t2.db" JWT_SECRET=testsecret COOKIE_DOMAIN= DEV_OTP=1 WX_API_BASE=http://127.0.0.1:3196 \
  WX_MINI_APPID=wxtest WX_MINI_SECRET=s node server.js > "$DIR/srv2.log" 2>&1 & SRV2=$!
for i in $(seq 1 30); do curl -sf http://127.0.0.1:3197/api/health >/dev/null 2>&1 && break; sleep 0.2; done
B=http://127.0.0.1:3197
MPUA='Mozilla/5.0 (iPhone) MicroMessenger/8.0.50 miniProgram/wx0'
M(){ curl -s -b "$DIR/m_$1" -c "$DIR/m_$1" -H 'Content-Type: application/json' -A "$MPUA" "${@:2}"; }   # M 罐名 curl参数…（小程序 UA）
tk(){ grep -oE '"ticket":"[^"]+"' <<< "$1" | cut -d'"' -f4; }
enter(){ M "$1" -o /dev/null "$B/api/wx/mini/enter?t=$2&to=https%3A%2F%2Fwww.puyouquan.com%2F"; }
R=$(M a -X POST $B/api/wx/mini/login -d '{"code":"useraaaa_1"}')
chk 票据有效期30秒 '"expires_in":30' "$R"
T1=$(tk "$R")
# 注意用 GET（-D - -o /dev/null）而不是 -I：HEAD 不匹配任何路由→404→「没有 Cookie」会空过（v62.6 发现老用例同病）
nchk 普通浏览器打开带票链接不下发Cookie 'pyq_token=ey' "$(curl -s -D - -o /dev/null "$B/api/wx/mini/enter?t=$T1&to=https%3A%2F%2Fwww.puyouquan.com%2F")"
chk 普通浏览器仍正常回跳 'Location: https://www.puyouquan.com/' "$(curl -s -D - -o /dev/null "$B/api/wx/mini/enter?t=bogus&to=https%3A%2F%2Fwww.puyouquan.com%2F")"
R=$(M a -X POST $B/api/wx/mini/login -d '{"code":"useraaaa_2"}'); enter a "$(tk "$R")"
chk 小程序内静默登录得到占位号 '"phone":""' "$(M a $B/api/me)"
# ④ 空占位号：手机号快捷登录时自动并入
R=$(M a -X POST $B/api/wx/mini/phone -d '{"code":"ph13900001111_1","loginCode":"useraaaa_3"}')
chk 空占位号自动并入手机号账号 '"merged":true' "$R"
enter a "$(tk "$R")"
chk 进入后是手机号账号 '139\*\*\*\*1111' "$(M a $B/api/me)"
R=$(M a -X POST $B/api/wx/mini/login -d '{"code":"useraaaa_4"}')
chk 之后冷启动静默登录直接命中手机号账号 '139\*\*\*\*1111' "$R"
enter a "$(tk "$R")"
chk 冷启动后会话仍是手机号账号 '139\*\*\*\*1111' "$(M a $B/api/me)"
# ① 已登录手机号会话：另一个占位号票据不覆盖会话
R=$(M c -X POST $B/api/wx/mini/login -d '{"code":"usercccc_1"}')
enter a "$(tk "$R")"
chk 占位号票据不覆盖已登录的手机号会话 '139\*\*\*\*1111' "$(M a $B/api/me)"
chk 被顶替的空占位号已并入 '139\*\*\*\*1111' "$(M c -X POST $B/api/wx/mini/login -d '{"code":"usercccc_2"}')"
# ④ 有数据的占位号：不静默合并，给确认票；确认后谱随人走
R=$(M b -X POST $B/api/wx/mini/login -d '{"code":"userbbbb_1"}'); enter b "$(tk "$R")"
M b -X PUT $B/api/scores/song_mpb00001 -d '{"title":"小程序里做的谱","updated_at":10,"data":{"v":3,"measures":[]}}' >/dev/null
R=$(M b -X POST $B/api/wx/mini/phone -d '{"code":"ph13900002222_1","loginCode":"userbbbb_2"}')
chk 有数据的占位号给合并确认 '"merge":{"token":' "$R"
chk 合并提议带谱数 '"scores":1' "$R"
MT=$(grep -oE '"merge":\{"token":"[^"]+"' <<< "$R" | grep -oE '[A-Za-z0-9_-]{20,}')
chk 未确认前占位号原样保留 '"phone":""' "$(M b -X POST $B/api/wx/mini/login -d '{"code":"userbbbb_3"}')"
chk 确认合并 '"merged":true' "$(M b -X POST $B/api/wx/mini/merge -d "{\"token\":\"$MT\"}")"
chk 合并票一次性 '已过期' "$(M b -X POST $B/api/wx/mini/merge -d "{\"token\":\"$MT\"}")"
R=$(M b -X POST $B/api/wx/mini/login -d '{"code":"userbbbb_4"}'); enter b "$(tk "$R")"
chk 合并后静默登录命中手机号账号 '139\*\*\*\*2222' "$(M b $B/api/me)"
chk 占位号的谱随人并入手机号账号 'song_mpb00001' "$(M b $B/api/scores)"

echo; echo "通过 $pass / $((pass+fail))"
[ $fail -eq 0 ]
