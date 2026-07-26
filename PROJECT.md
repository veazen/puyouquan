# 谱友圈（puyouquan.com）· 项目交接文档

> **本文档是项目的唯一权威交接文档。** 任何团队/任何 Claude Code 账号接手时先读完本文；每次发版必须同步更新「进度」与相关章节（见文末维护规则）。
> 最后更新：2026-07-26 · 当前版本 **v48.2** · 分支 `claude/guitar-tab-software-analysis-zqm0ua`

---

## 0. 六维专家审计与工作安排重排（2026-07-24，权威执行序）

> 六位专家（架构/功能测试/代码质量/安全/UX增长/商业）对全站做了一轮只读审计，全部结论带 file:line 或命令/复现证据。**结论：产品力已达可收费水准、工程底子在同体量项目里罕见地扎实，但存在 4 个红线级问题（线上真实存在）与「商业化三个零」。此审计重排取代原路线图后段执行序——先止血与补地基，暂停新增记谱功能。**
>
> **执行进度（截至 v45.5）：🔴 Sprint 0 止血 6/6 ✅ 已上线 · 🟠 Sprint 1 数据完整性与信任 6/6 ✅ 已上线 · 🟡 Sprint 2 增长回路 6/6 ✅ 全部落地（真二维码 · 移动 fit-to-width · 发布触发登录 · 发布谱 SSR 落地页 · 看谱收藏接云+留账号钩子 · SEO 基建+四垂类落地页）。** 期间新 CI 门禁已真实拦下一次坏部署（缺 xmllint），并把「套件全绿≠能用」的 tv_matrix 假绿修复。**P0 互操作深化：v44.7 打通 TAB↔MusicXML（六线谱声部导出/导入）；v44.8 补齐倚音/滑音/独立力度/速度术语的 MusicXML 往返。P0 互操作深化告一段落（TAB 技法 tech/tk/bAmt 仍未进 MusicXML、后倚音 graceA 仅单向，属长尾）。P1 智能配谱深化启动：v44.9 `suggestChords` 从逐小节贪心升级为**功能和声 Viterbi**（发射=旋律契合 + 转移=T→S→D→T 功能进行 + 属七 V7 + 正格终止），全局最优、进行连贯。v45.0 和声节奏：`suggestChordPlan` 在每小节主和弦基础上对 4/4 下半段另属和弦补第二和弦（每小节 1–2 个，`placeChordPlan` 回填多列），`suggestChords` 保持首和弦兼容。v45.1 织体扩拍号：PIANO_TEX 加 2/4(进行曲/波尔卡)与 6/8(船歌/摇篮曲) 4 套，picker 按 song.beats 过滤。v45.2 副属和弦（保守·旋律驱动）：某小节显含二级导音(#4/#5/#1/b7)且下一小节为其解决目标→升级为副属属七(如 #4→D7 解 G)，纯自然音不触发。**P1 智能配谱+织体深化收官**（功能和声 Viterbi→属七终止→和声节奏→四拍号织体→副属和弦）。余下长尾：更多风格织体型。**
>
> **商业闭环（产品负责人已拍板，2026-07-24）**：公司主体/微信开放平台认证/微信商户号已就绪；一套会员系统；定价 会员 ¥15/月·¥98/年、考编内容包 ¥39 买断；免登录即用与演示谱落地保持不变（价值前置、登录后置）。执行序：**S3-A1 会员地基+兑换码 ✅ v45.3** → **S3-A2 微信支付 Native + 看谱分享卡 + 小程序脚手架 ✅ v45.4**（商户参数配 env 即启用；miniprogram/ 待管理员配业务域名提审）→ 细节修复批次（待负责人问题清单）→ 轻量 Web 管理后台 → 考编内容包 → 创作者分账（微信分账 API，生态有量后）。分成基准：付费谱 创作者70/平台30，打赏 90/10。

### 交叉验证的收敛结论（多位专家独立命中＝最高置信）
- **SQLite 零备份**（架构+安全双列 P0）：单机单盘承载全部账号+云端曲谱，无任何备份/dump/cron。
- **CI 不跑任何回归**（测试+架构）：deploy.yml 仅语法闸，41 套件+api 测试全靠人工自觉——v43.6 白屏事故的组织性根因。
- **分享卡二维码假占位 + 移动端观看需横向平移**（UX+测试）：增长回路最后一米断链，而看谱主要发生在手机微信。
- **付费全是演示态、SKU 在卖已免费功能**（商业+测试+UX）：memberPlan 不门禁任何功能；真收费即构成虚假宣传+用户背刺。
- **docType/cover 分类逻辑跨 3 文件复制**（代码质量+架构）：改一处漏一处→同谱在编辑器与谱库归类不一致。

### 🔴 Sprint 0 · 止血（最高优先，先于一切新功能；全红线，S/M 级）
| # | 项 | 来源 | 工时 |
|---|---|---|---|
| 0.1 | **存储型 XSS**：`render()` 把 UGC 数值字段 `deg/f/oct`（简谱音级/TAB品位/倚音/和音）未转义裸拼进 `#score` innerHTML（index.html:3956/4406/4411/4491/10804），发布免审、`?pub=` 免登录回吐，三子域共享 Cookie→打开恶意谱即在 zhipu 源被以受害者身份接管。修：输出点 esc() + 发布落库 Number() 强校验（叠加）；publish 加审核位 | 安全 P0（已端到端复现） | M |
| 0.2 | **越权级联删除**：`DELETE /api/scores/:id` 的 collItems/fav/shelf 级联按 score_id **全局**执行且**先于**所有权校验（server.js:221-225），任意登录用户可清空所有人对任意公开谱的收藏/谱架条目并谎报成功。修：先 ownership 校验再级联，包事务 | 架构 P0 | S |
| 0.3 | **DB 每日备份**：cron `sqlite3 .backup` 在线快照 + 异地/对象存储一份 + systemd timer | 架构 P0 + 安全 P0 | S |
| 0.4 | **修 tv_matrix 假绿**：自 v41.5 起 9/12 用例被 guardReplace 弹窗静默拦截、一直对同一份陈旧渲染断言（12 用例输出等长为铁证）。补 stub 直通 + 每用例断言 song 已真实切换 | 测试 P0 | S |
| 0.5 | **CI 加回归门禁**：deploy job 前置 test job（tv_matrix/presets/safety/mxl + api 三件），失败不发布；16 个失败不置退出码的套件补 `process.exit` + run_all.js | 测试 P0 + 架构 P1 | S |
| 0.6 | **隐私政策/关于改写**：现文案仍写「不设账号、不上传曲谱、仅本地存储」，与已上线的手机号账号+云同步+微信登录严重不符（PIPL 合规风险，index.html:11980）。如实披露 | 安全 P1 | S |

### 🟠 Sprint 1 · 数据完整性与信任
- 409 冲突静默丢数据：双设备并发编辑较旧一侧整谱静默丢失（index.html:11591 只处理 413）→存冲突副本再拉云（架构 P1，M）
- 删除无墓碑→已删谱复活、离线删除永久丢失→新增 `musetab-deleted` 墓碑键（架构 P1，M）
- JWT 无实际吊销：tok_ver 设计了从不自增，登出仅清 Cookie→加自增+「退出所有设备」（安全 P2，S）
- 安全响应头 X-Frame-Options/nosniff/Referrer-Policy + 确认生产 env 无 DEV_OTP（安全 P3，S）
- 官网静态资源无版本化/无缓存头→新 HTML 配旧 JS 打新 API 错乱；加 `?v=` 或 no-cache（架构 P1，S）
- 发布落位非原子（跨 fs mv 退化为 copy+unlink，2MB 窗口可拿到截断页）+ 无回滚→`.staging`+`mv -T`+保留 `.prev`（架构 P2，S）

### 🟡 Sprint 2 · 增长回路打通（把「增长闭环 40 分」拉到 70）
- 分享卡真二维码：内嵌零依赖 QR 编码器（纯 JS，符合单文件红线），已发布谱指向 `?pub=ID`（UX P0+测试 P1，M）
- 移动端观看 fit-to-width：viewer SVG 520px>纸面 374px 需横向平移；按容器宽反流或等比缩放（UX P0+测试 P1，M）
- ~~`?pub=` 最小 SSR（title/description/og:image）→已发布谱可被搜索索引（UX P1，M）~~ **✅ v44.4**：服务端出 `/pub/:id` 落地页（title/description/og/JSON-LD/canonical + 动态品牌封面 `/pub/:id/cover.svg`），真人 1.2s 后 JS 转观看页；三站 vhost 均反代、canonical 统一 puku 去重；分享卡二维码/发布链接改指 SSR 落地页。SSR 端到端回归 9 项。
- ~~SEO 基建 sitemap/robots/canonical/og + 四垂类落地页~~ **✅ v44.6**：新增 `robots.txt`、静态 `sitemap.xml`、动态 `GET /pub/sitemap.xml`（列全部发布谱）；官网各页补 canonical + og（`og.png` 品牌大图 1200×630，Chromium 渲染）+ WebSite/FAQPage JSON-LD；四垂类落地页 `kaobian/yikao/shifan/jixing.html`（痛点→四步→能力→FAQ→CTA，内链互通），首页「适用场景」区 + 页脚场景列内链。tv_site 回归扩至 14 项。
- ~~未登录「发布」改「登录后发布」直接拉起登录~~ **✅ v44.3**
- ~~收藏接云（看谱→留账号钩子）~~ **✅ v44.5**：观看栏 `♡ 收藏`——已登录 `PUT/DELETE /api/favorites/:id` 接云；未登录就地 `openLogin({onDone,pendingFav})` 拉起登录、完成后自动补收藏（微信整页跳转经 sessionStorage `pyq-pendfav` 回跳补），本机/预览仅本地。`openLogin` 加可选 `onDone(ok)/hint/pendingFav`（不提供时行为不变）。新增 `tv_fav` 回归 3 项。
- 收藏接云（看谱→留账号的唯一钩子，现纯本地）（UX P3，M）

### 🟢 Sprint 3 · 商业地基（不碰支付，即可开始变现验证）
- entitlements/orders/redeem_codes/corp_licenses/events 五表 day1 落库（字段清单见商业审计；金额用整数分、发票/机构席位/license 字段 day1 预留）（商业 P0，M）
- 3 个权益执行开关（云配额扩容/批量导出/内容包解锁）——先有可卖的东西再谈支付（商业 P0，M）
- 重写 MEMBER_PLANS 真实增量卖点：**停止把已免费的云同步/MusicXML/协作当付费点卖**（虚假宣传+背刺红线）（商业 P0，S）
- 埋点 events 表 + 12 必记事件（visit/signup/create_song/export/publish/open_pub/paywall_view/redeem/order… 否则算不了转化/LTV）（商业 P0，M）
- 兑换码后台（CLI）+ sponsors 页 mailto 改兑换码售卖 + 补发历史赞助者（商业 P0，S）
- 第一个公版考编内容包 20-30 首（版权最干净的内容变现）（商业 P1，M）

### 🔵 Sprint 4 · Phase1 变现（需产品负责人拍板 + 资质）
- 个体户注册 → 微信支付普通商户 → 官网 H5 收单（JSAPI/Native）
- maker 制谱专业版 SKU：年费 ¥98-168 主力 / 月 ¥19 锚点 / 终身 ¥399-599；考编内容包 ¥39-99 买断；机构席位 ¥300-600/席/年
- **viewer 看谱会员 + 创作者分账 = Phase2，设启动闸门**（可售原创/公版谱≥200 首、puku 月 UV≥5000、公司主体+ICP 经营许可）；**流行歌编配谱分账因改编权/信息网络传播权风险被裁决为不做原形态**，只做「原创/公版编配」白名单
- **小程序轻量版红线：只做获客+履约，绝不碰支付**（iOS 禁虚拟商品支付）

### 长期（穿插，非阻塞）
- 代码「减脂版」：删 5 死函数(index.html:2159/6123/6948/7838/9097)+11 孤儿 CSS+更新日志归档(约省 18KB gzip)+viewerbar 三合一（净删约 190 行，低风险，现有测试可覆盖）
- `cr-gocircle` 入口统一域名分流（1 行，消除生产唯一行为不一致）
- docType/cover 三处同步：以 server `pubShape` 为唯一权威，删 pyq.js 兜底推导
- 主脚本按域拆成 5-8 个 `<script>` 分段（爆炸半径全站→单段，破 1MB/2万行前完成）+ `check_dup_fn.js` 并入语法闸
- render() 1384 行拆 4-5 顶层函数 → 五线谱两条约 350 行平行分支参数化收敛（核心引擎，靠几何断言护航，独立版本做）
- db 层包 async 门面 + `PRAGMA busy_timeout`（为未来迁 PG/加备份进程铺路）
- 补 E2E 主链路 + 编辑器×真实 API 集成 + 移动视口回归 + 生产 boot 冒烟（Playwright 开 zhipu 断言 #score）

### 继续延后（审计一致意见）
鼓谱、8va 括线、同谱表双声部等原路线图后段**记谱功能**——止血/增长/变现地基优先于新记谱能力。

### 对用户核心疑问的裁决
- **代码是否简洁轻量/是否冗余**：逻辑层很干净（377 函数仅 5 死、0 重名、0 孤儿键），**轻至中度冗余、无需大扫除**；1.99MB 体积大头是刻意内嵌的音色数据（raw 56%，支撑离线+互动谱单文件导出，非腐化）；结构债在 render() 1384 行与五线谱双分支——长期项。
- **会员系统设计**：正交架构（role 身份 × entitlements 权益）**采纳**；**先做 maker 一条线、viewer 缓行（谱库仅 2 首种子谱时是空中楼阁）**；流行歌分账**推翻**。

---

## 0. 仓库迁移公告（2026-07-22）

**状态：✅ 已完成（2026-07-22）** —— 4 个分支连同完整历史已迁入，默认分支已设为 `claude/guitar-tab-software-analysis-zqm0ua`，`deploy.yml` 首次初始化 + 发布 + 冒烟验收（5/5）已在新仓库跑通。迁移期间部署链路顺带加固：密钥装载自动修复粘贴损伤并预校验、SSH 账号探测与保活、nginx 设为 default_server（IP 直访可用）、音色包下载加超时且不阻塞发布、冒烟脚本修复 pipefail 误报。

**正式仓库 = `veazen/puyouquan`**（由 Veazen-Code 全量镜像迁入，历史/分支完整）。旧仓库 duyuanping9798/My-claude-code-project → veazen/Veazen-Code 仅作归档。接手会话请直接绑定 puyouquan；部署 Secrets（DEPLOY_HOST/DEPLOY_USER/DEPLOY_SSH_KEY）配在 puyouquan 的 Actions Secrets，`.github/workflows/deploy.yml` 触发分支不变。

## 1. 项目定位（宏观）

**谱友圈** = 面向中国用户的**全民曲谱平台**：制谱（创作者工具）+ 找谱（曲谱库）+ 分享（曲谱卡/小程序，规划中）。

- 从"吉他谱编辑器"起步，已升级为覆盖简谱/五线谱/六线谱三大记谱法的完整制谱平台
- **核心差异化**：三种记谱法**同源数据互切**（Guitar Pro/MuseScore 不做简谱，国内简谱工具不做出版级五线谱）+ **八场景入口**（用户按"我要干什么"选类型，不需要懂记谱法）
- 商业方向：曲谱库付费/赞助/会员（官网已有赞助页框架），面向即兴伴奏考试人群的钢琴弹唱织体是重点卖点

### 八场景曲谱类型（v37.3 定型）

| 类型 | docType | 谱面组成 | 目标人群 |
|---|---|---|---|
| 🎸 弹唱谱 | `guitar`/`uku` | TAB+简谱+歌词+和弦图 | 弹唱自学者（最大盘） |
| 🎸 独奏谱 | `solo` | TAB+五线谱联排，无歌词 | 指弹/电吉他 |
| 🎹 钢琴弹唱谱 | `pianoacc` | 和弦+伴奏织体生成（纯伴奏，无主旋律）+歌词提示 | 即兴伴奏/幼师考编 |
| 🎹 钢琴独奏谱 | `piano` | 大谱表双手 | 琴童/古典 |
| 🎤 歌谱 | `vocal` | 简谱1–4声部+多段歌词 | 声乐/合唱/民乐（合并入口） |
| 📖 教学对照谱 | `teach` | 五线谱+简谱行+歌词 | 教师/课堂 |
| 🎻 器乐五线谱 | `instr` | 单谱表（高/中/低音谱号） | 器乐独奏/艺考 |
| 🎼 功能谱 | `func`/`chord` | 简谱+级数和弦 / 纯和弦谱（小节格+节奏斜线） | 乐队排练 |

旧类型自动归类：`vox→vocal`、`staff→instr`（见 `TYPE_NORM`）。

---

## 2. 仓库结构与环境

```
muse-tab/index.html        ← 全部产品（单文件 HTML+CSS+JS，~1.7MB，无构建）
muse-tab/site/             ← 官网多页站（index/make/view=谱库/features/help/log/sponsors + pyq.css/pyq.js）
muse-tab/tests/            ← Playwright 回归测试套件（15 个，见 §7）
muse-tab/tools/gen_glyphs.py ← SMuFL 字形提取脚本（fontTools，可复现）
deploy/deploy.sh           ← 服务器部署脚本（rsync 编辑器 + site/）
PROJECT.md                 ← 本文档
CLAUDE.md                  ← Claude Code 会话自动加载的约束入口
.claude/agents/            ← 协作角色库（10个，选自 MIT 开源 agency-agents；新会话自动注册为 subagent，见该目录 README）
```

- **单文件架构是刻意选择**：零构建、零依赖、离线可用、artifact 可直接预览。不要引入打包器。
- 预览 artifact（Claude Code 内）：编辑器 `0209fdbe-14d8-448f-b088-d31be4405d17`（favicon 🎸）、官网 `dd24f67d-d137-43a4-89b6-dbe17f3fdf4d`（favicon 🎼）。
- 生产部署：`deploy/deploy.sh` rsync 到服务器 `/var/www/puyouquan/`（ICP 备案已通过：**粤ICP备2026100396号-1**，网站名称「谱友圈」；备案号展示在编辑器 #site-footer 与官网 pyq.js 注入页脚 + 官网首页 #site-foot 静态兜底，链接 beian.miit.gov.cn）。
- **域名架构（2026-07-22 起，nginx 三虚拟主机，见 `deploy/nginx-puyouquan.conf`）**：
  - `puyouquan.com` / `www` → **官网**（root = `/var/www/puyouquan/site`，default_server，IP 直访亦命中）
  - `zhipu.puyouquan.com` → **在线制谱 / 专业制谱平台**（单文件编辑器，root = `/var/www/puyouquan`，index.html no-cache；页头主标题「谱友圈」·副标题「专业制谱平台」）
  - `puku.puyouquan.com` → **谱库**（创作者正式谱展示，原「看谱」板块更名；`site/view.html` 作首页；页头主标题「谱友圈」·副标题「谱库」；微信小程序轻量版日后复用此展示页，以独立网站形态呈现）
  - **两站分工（v43.7 明确）**：制谱平台=做谱、谱库=展谱。编辑器顶栏「预设」旁入口 `b-circle` 由「曲谱库」改名「谱库」，线上直接跳转 `//puku.puyouquan.com/`（本机预览无该域名时回落到内置演示库 `openCircle`）。已发布谱的**交互观看**仍在 `zhipu.puyouquan.com/?pub=ID`（单文件应用承载渲染引擎），谱库页/小程序卡片链去该地址，观看页「← 谱库」回跳 puku。
  - 站内互链用协议相对子域链接（`//zhipu.puyouquan.com/` 等）；冒烟 `deploy/smoke.sh` 用 `curl --connect-to` 按域名 SNI 逐一验收三个 vhost 的 **HTTPS** 内容 + http→https 跳转，传 IP 即可、不依赖 DNS。
  - **语法闸（v43.7 加固）**：`deploy.yml` checkout 后先跑 `node deploy/check-syntax.js muse-tab/index.html`——抽取所有内联 `<script>` 逐段 `vm.Script` 解析，任一段语法错误即 job 失败、不上服务器。缘由：`smoke.sh` 只查页面字符串标记，抓不到 JS 解析失败（v43.6 更新日志里裸反引号包 `Cookie` 落在模板字符串内→整段脚本失效→编辑器白屏，却冒烟全绿照常上线）。发版前本地也应先跑该闸再跑 `tv_matrix`。
  - **HTTPS 已启用（2026-07-22）**：certbot 四域名一证（puyouquan.com/www/zhipu/puku），自动续期；certbot 直接改写服务器上的 pu8.conf，故 `server-setup.sh` 检测到 `managed by Certbot` 时跳过模板覆盖——仓库 nginx 模板此后仅作参考基线，改动需登录服务器手动合并。
- **账号后端（M1a，2026-07-22 上线）**：`api/` 零依赖 Node 服务（Node 24 内建 `node:http`+`node:sqlite`+`node:crypto`，无 npm 依赖，规避境内拉包/原生编译问题）。
  - 架构：systemd 服务 `pyq-api`（用户 pyq，127.0.0.1:3127）← nginx 各 vhost `include snippets/pyq-api.conf` 反代 `/api/`（api-setup.sh 幂等注入，兼容 certbot 配置）；Cookie 域 `.puyouquan.com` 三站互通；JWT HS256 httpOnly Cookie 30 天。
  - 数据：SQLite `/var/lib/puyouquan/pyq.db`（WAL；**所有 SQL 集中在 `api/db.js`，主键应用层 UUID、时间 Unix 秒——为将来迁 PG 预留**；迁移信号：SQLITE_BUSY 频发/需多机/需 PG 专属能力）。表：users/otp/ip_quota/scores/favorites/shelf/collections/collection_items。
  - 登录：手机验证码（阿里云短信 RPC-V1 签名自实现；频控 1 次/分/号、5 次/日/号、20 次/日/IP、验证 5 次上限；未配 AK 时 DEV_OTP=1 走日志验证码）。微信扫码（企业开放平台）留 `wx_openid` 字段待接。创作者开放注册（POST /api/me/creator）。
  - 配置：`/etc/puyouquan/api.env`（api-setup.sh 首次生成 JWT_SECRET；**阿里云短信 AK/模板过审后填入并 `systemctl restart pyq-api`**）。
  - 接口（`/api/` 前缀）：health / auth(sms send·verify·logout) / me(资料·昵称·创作者·**entitlements v45.3**) / scores(列表·详情·PUT 同步含 409 冲突·删除级联·publish/unpublish) / **pub(pub/scores 列表·详情，公开免登录)** / favorites / shelf(带进度) / collections(含 items) / **redeem(兑换码核销，IP 日频控 30 次) / events(埋点，白名单 12 事件 + 每 IP 每时 300 条上限，签到/登录/兑换服务端直写)**。谱面上限 免费 500 / **会员 2000**（entActive('vip') 真实开关）、单谱 2MB、谱集 50 个。
  - **商业五表（v45.3）**：entitlements(权益，expires_at=0 永久) / orders(整数分，out_trade_no 幂等) / redeem_codes(PYQ-XXXX-XXXX-XXXX，事务核销防并发) / creator_earnings(分账流水，未启用) / events(埋点)。`redeemApply` 单事务：核销+发权益(同类顺延)+记 0 元订单。
  - **CLI 管理工具 `api/admin.js`**（服务器 SSH 执行，与 API 同 DB）：user/grant/revoke/gen-codes/codes/orders/stats。Web 管理后台随支付上线同批。
  - **微信支付（v45.4，`api/wxpay.js` 零依赖 APIv3 Native）**：`GET /pay/prices`（价目公开）、`POST /pay/create`（登录，服务端权威计费，PRICES=vip_month 1500分/31天·vip_year 9800分/366天·pack_kaobian 3900分/买断）、`GET /pay/status/:orderId`（轮询；查单 SUCCESS→`fulfillOrder` 单事务幂等发货 pending→paid）、`POST /pay/notify`（回调仅当加速器：AES-256-GCM 解密取单号→仍主动查单确认→发货；伪造回调解不开也查不实，无平台证书管理负担）。凭据五项 env（WXPAY_MCHID/APPID/SERIAL/APIV3_KEY/KEY_PATH 私钥文件）配齐才启用，health.wxpay 上报，前端据此显示支付按钮（二维码复用 qrModules，2.5s 轮询 5 分钟）。api-setup.sh env 模板已含占位。
  - **小程序（v45.4 脚手架 `miniprogram/`）**：web-view 承载 puku（看谱入口定位），pages/index+score(分享卡片带谱 id 直达 /pub/:id)；不做小程序内虚拟支付（iOS 合规），会员购买只在网页。上线需管理员：业务域名配置(校验文件放 site/)→填 AppID→提审（步骤见 miniprogram/README.md）。
  - **看谱页分享卡（v45.5 功能并入 v45.4 发布）**：观看栏「分享卡」→ `shareCardCanvas`(自 exportShareCard 抽出) 出 PNG 弹窗，手机长按保存/转发；`shareCardURL` 观看模式优先 `viewerCtx.pubId`（看谱人生成的卡直达当前谱）。
  - **非 `/api/` 前缀的 SSR 路由**（v44.4，公开免登录，供搜索/社交爬虫收录，nginx `location /pub/` 反代）：`GET /pub/:id`→已发布谱服务端落地页（`<title>`/`meta description`/`og:*`/`twitter:card`/JSON-LD `MusicComposition`/`canonical`；真人 setTimeout 1.2s `location.replace` 转 `zhipu/?pub=ID`）；`GET /pub/:id/cover.svg`→动态品牌封面（1200×630，首行旋律简谱数字+歌词）；`GET /pub/sitemap.xml`→全部发布谱的动态站点地图（v44.6，robots.txt 引用）。dispatcher 新增 `___raw`/`___ctype`/`___cache` 出非 JSON 原样响应分支。canonical/观看主机可用 env `PUB_CANON`/`VIEW_HOST` 覆盖（默认 puku/zhipu）。
  - 测试：`bash api/test.sh` 本地端到端 25 项（DEV_OTP 模式全链路）；线上冒烟含 `/api/health`。
  - **M1b-part1 已完成（v41.7）**：编辑器个人中心接入真实登录——个人资料页顶部账号卡（`pcAcctHTML`），手机验证码登录/注册弹窗（`openLogin`）、退出（`acctLogout`）、成为创作者（`acctBecomeCreator`）；账号态经 `apiCall`/`acctRefresh` 与后端同步，新增缓存键 `musetab-acct`（不动既有键）。仅 `*.puyouquan.com` 启用（`API_ON` 按 hostname 判断），本机/预览自动降级纯本地。测试 `tests/tv_acct.js` 7 项。
  - **M1b-part2 已完成（v41.8）**：我的曲谱云同步——本地 `LS_LIB` ↔ 后端 `/api/scores`，按新增 `mtime`（epoch 秒，与既有 updatedAt 并存、不改红线）last-write-wins。触发：`saveToLibrary` 显式保存立即 `scoreCloudPush`、`persist()` 编辑后经 `scheduleCloudPush` 6s 去抖续传、登录/`acctRefresh` 走 `syncScores` 双向拉取合并、两处删除入口传播 DELETE。极短/非法本地 id 推送前升级为云兼容格式（含当前 song.id 同步）；超大谱 413 跳过并提示、网络失败静默补偿。云门禁统一走 `window.PYQ_CLOUD`（=API_ON，规避 persist 早于账号模块声明的 TDZ）。测试 `tests/tv_sync.js` 7 项。
  - **M2-part1 已完成（后端，2026-07-22）**：公开谱库 API + 发布/下架。新接口：`POST /api/scores/:id/publish`·`/unpublish`（需 creator 角色，只能操作自己的谱）；公开免登录 `GET /api/pub/scores`（列表带 author 昵称）·`GET /api/pub/scores/:id`（详情带 data）。`db.js` 启动种子：无任何已发布谱时插入官方账号（phone 占位 `00000000000` 不走登录）+ 2 首示例谱（小星星/欢乐颂），谱库开箱有内容、先于短信登录。`api/test.sh` 扩到 31 项，冒烟加 `/api/pub/scores` 断言。
  - **M2-part2 已完成（v41.9）**：谱库前端上线。① puku `site/view.html` 加「已发布曲谱」区块，`fetch('/api/pub/scores')` 渲染卡片（图标用 `window.PYQ_ICON` 内联，因异步注入晚于 pyq.js 一次性水合），卡片链到 `//zhipu.puyouquan.com/?pub=ID`。② 编辑器新增 `openRemotePub(id)`——拉 `/api/pub/scores/:id` 复用 `viewerBuildSong`/观看模式渲染（移调/谱架/退出，返回谱库）；`DOMContentLoaded` 检测 `?pub=ID` 深链启动（先于 PYQ_SHARE 分支后）。种子官方谱已验证可正常渲染。测试 `tests/tv_pub.js` 5 项。
  - **M2-part2c 已完成（v42.0）**：官网谱库同款卡片 + 全站登录。① 公开接口 `/api/pub/scores` 补 `type/cover/measures/price`（server.js `docTypeOf`/`coverOf`/`pubShape` 与编辑器 docType/ccCover 同源）；官网 `pyq.js` 加 `PYQ_LIB.{card,cover,mount}` 复刻编辑器曲谱库卡片，`view.html`（谱库页）与 `index.html`（首页「最新发布曲谱」）均改用之，卡片链到 `?pub=ID`。② `pyq.js` 加 `PYQ_ACCT`：官网导航 `#nav-acct` 手机验证码登录弹窗（复用后端，Cookie 域共享），登录后显示账号 chip + 下拉（个人中心/谱库/退出）；仅 `*.puyouquan.com` 启用。③ 导航「谱库」链到 puku 子域（MENU 第 3 元素为 active-key `view`）。样式在 `pyq.css` 末尾（cc-card/acct/pyq-modal）。测试 `tests/tv_site.js` 6 项（page.route 伪装 puku 域 + stub API）。
  - **M2-part2b 已完成（v42.1）**：编辑器创作者「发布」接真 API，闭环打通「创作 → 上架谱库」。`showPublishMenu` 的 `pub-go` 处理器按 `window.PYQ_CLOUD && ACCT` 分支：登录态走真实发布——非 creator 先 `POST /api/me/creator`（开放注册）→ `scoreCloudPush(libId)` 确保云端存谱（返回最终 id，兼容极端短 id 升级）→ `POST /api/scores/:id/publish` → `showPublishDone` 弹可复制公开链接 `https://zhipu.puyouquan.com/?pub=ID` + 谱库入口，本地 circlePubs 记录 `online/cloudId/url`、status=approved；未登录 / 预览环境保持原本机演示。`scoreCloudPush` 改为**成功返回 id、失败静默返回 undefined**（后台去抖/同步调用行为不变，发布链路据此判断是否继续）。发布菜单文案按登录态区分。新增 `info` 语义图标。线上谱库当前统一免费展示（售卖/试读待支付体系，需产品负责人拍板）。测试 `tests/tv_publish.js` 6 项。
  - 待办：分享卡二维码指向 `puku/?pub=`（需真实二维码编码器，作为较重项延后）；M1b-part3=收藏/谱架/谱集云同步 + 学习资料（需后端加 materials 表）；M3=微信扫码登录（需微信开放平台认证，用户稍后提供）。
- 官网设计（v41.6 起）：`site/pyq.css` 与编辑器 v40.6 素材配色同源——朱砂 `--accent:#c33a29`、墨绿深色区 `--chrome:#1f3a34`（CTA 横幅）、暖米三级表面（bg #f3f0e8 / toolbar #f7f4ec / panel #fefdf9）、暖色边框 #e4ddcd、中文字体前置栈 `--font-ui`；`help.html` 为 11 章完整使用手册（快速上手/八谱类指南/录入/记号大全/和弦/歌词/排版/导入导出/播放跟练/快捷键/FAQ，PYQ_DOCS 路由）。

---

## 3. 数据模型（localStorage 持久化，**字段/键名是兼容性红线**）

### 3.1 song 对象（v3）

```js
{
  v:3, title, singer, lyricist, composer, maker,
  key:'C',          // 1=X（可动 do）；换调走 transposeEditor 自动移调
  beats:4, unit:4, tempo:90, capo:0,
  inst:'guitar'|'uku',
  func:true?,       // 功能谱（级数和弦）
  chordOnly:true?,  // 纯和弦谱（小节格渲染模式，v37.4）
  funcNames:true?,  // 和弦显示 音名（否则级数）
  pianoAcc:true?,   // 钢琴弹唱谱标志（v37.5，启用织体按钮+和弦标注）
  tabStaff:true?,   // TAB+五线谱联排（独奏谱）
  texId:'slow'?,    // 上次使用的伴奏织体
  tabVoices:[名字], voxVoices:[名字], lyricLines:N,
  voxNotations:[per-voice: undefined(简谱)|'staff'|'bass'|'alto'],
  voxDual:[per-voice bool],   // 谱表下附加简谱行（教学对照）
  customChords:{名->指法}, layout:{page,preset,density,scale,noteGap,rowGap},
  measures:[{ tabs:[[tabCol]], voxes:[[voxCol]],
    repeatStart, repeatEnd, sectionBar, finalBar, segno, coda, dc, ds, fine, volta,
    label:'前奏'?,     // label=v41.2 排练/段落文字标记（小节头上方方框粗体，MusicXML rehearsal 出/入同步）
    keyTo:'G'?,        // v41.3 中途转调标记：小节头上方「转1=G」（一期标注式——五线谱调号/拼写保持谱首调；transposeEditor/transposeSong 同步平移；MusicXML key 变更出/入同步）
    simile:1|2? }]     // v41.3 小节反复 𝄎：数据保留、渲染省写（simileSrc 解析源小节，连续同号组内轮转），播放展开、节拍校验豁免；MusicXML measure-style measure-repeat 出/入同步
}
```

- **voxCol**：`{dur:1|2|4|8|16|32, dotted, deg:0-7(0=休止), acc:'#'|'b'|'', oct, lyrics:[段], tie, chord, dyn, grace, graceA, tup, orn:'up'|'down'|'tr'|'turn', adds:[{deg,acc,oct}]≤3, ferm:true?, artic:'stacc'|'staccatissimo'|'tenuto'|'accent'?, breath:true?}`
  - `adds` = 同列多音/和音（v37.6），主音字段不变保证向后兼容
  - `ferm`（延长号 𝄐，休止上也可标）/ `artic`（演奏法四件套：跳音·/顿音▼/保持音−/重音>，互斥单值）/ `breath`（换气 v，语义=本音之后换气）= v41.1 新增可选字段，MusicXML 出/入已同步（fermata/articulations/breath-mark）
  - `dynTo:{mi,ci}`（v41.2 渐强渐弱范围括线终点列；与 `dyn:'<'|'>'|'cresc.'|'dim.'` 组合生效——起列至终列开口楔形/文字+虚线延长，跨行断线续画；入口=力度菜单+Ctrl 选首末两音，与揉弦/闷音 `tk` 扩选同构；MusicXML wedge crescendo/diminuendo 出/入已同步）
  - `ped:'on'|'off'`（v41.3 钢琴踏板，点式成对渲染为 Ped.____*：'on' 起文字+延续线、至下一 ped 列收（'off' 画 * / 'on' 换踏断线），跨行断线续画；入口=「记号」面板两枚按钮，仅五线谱记谱声部显示；MusicXML pedal start/stop 出/入已同步）
  - `fing:'1'-'5'` 及 `adds[i].fing`（v41.3 指法数字：五线谱符头上方小数字（低音谱表下方、和音按音高纵向堆叠），简谱行不渲染；入口=「记号」面板「指法」按钮进入直录（`fingMode`），数字键 1–5 写入、0/退格清除、Esc 退出（adds 指法仅经 MusicXML 出/入）；MusicXML technical fingering 出/入已同步）
- **tabCol**：`{dur, dotted, chord, notes:[{s:弦, f:品, x:闷音, tech, tk, bAmt:'1/4'|'1/2'|'full'|'1.5'?}], strum, ferm:true?}`（`ferm`=v41.1 列级延长号；`bAmt`=v41.2 推弦幅度，挂在 tech:'b'|'bd' 音符上、弧上文字替换 b↑/b↓，清除技法时一并删除；**v44.7：TAB 声部已导出/导入 MusicXML**——string/fret/x/ferm/时值/自定义调弦/capo 往返一致；技法记号 tech/tk/bAmt 暂未进 MusicXML，后续深化）
- **dotted（v41.5 双附点）**：`false|true|2`——`true`=单附点（旧数据原义，migrate 不转换）、`2`=双附点（×1.75，新增取值）。可用性出版规则见 `maxDotLevel()`：全/2/4/8 分可双附点、16 分限单附点、32 分不可附点（依据=附点需要更低一级细分存在，本引擎最小时值 32 分）。附点按钮循环 无→附点→双附点→无；简谱渲染形态同步 GB 惯例：附点只画在四分及更短的音上，二分/全音符（含附点）改由增时线条数表达（附点二分=2条、附点全=5条；双附点二分的余下半拍以一枚附点补记）。MusicXML `<dot/>` 一/两枚出入同步（tv_dot 覆盖）。
- **localStorage 键全部 `musetab-*` 前缀，永远不改名**（改名=用户丢谱）。读取入口 `migrate()` 做版本兼容。

### 3.2 乐理核心

- 简谱是主数据（可动 do）；五线谱/TAB 都是**视图**。
- 绝对音级 step = 八度序×7+字母序（C4=35）。高音谱底线 E4=37 中线 B4=41；低音谱 G2=25/D3=29；中音谱 F3=31/C4=35。
- `staffKeyInfo()` → {step0, Li, sig, alt}；`midiToStaff(midi,K)` 按调性拼写（升调系用♯/降调系用♭）；`accCarry(accSt,step,target,keyAlt)` 小节内临时记号进位（重复省略/回调内补还原号），**按线/间（含八度）独立**。
- 移调：编辑器 `transposeEditor(delta)`（和弦名换根音+斜杠低音、TAB 品位**整体统一平移**优先）；曲谱库观看模式另有 `transposeSong(s,delta)`（逐音回折）——**两函数不能合并/改名冲突**（历史教训 v37.2）。

---

## 4. 渲染引擎（render() 管线）

`render()` 每次全量重建 `#score` SVG 字符串（p.push 拼接 → innerHTML）。

1. **measureLayout(mea)**：逐拍内容驱动宽度。`MIN_W` 对数时值间距（时值减半×0.72，Gourlay 惯例）+ **弹簧-刚杆**拍内映射（LilyPond spring-rod：evts→nodes→water-fill→warpX），跨声部严格对齐；首小节 `tsLead` 预留拍号空间；`chordOnly` 拍宽拉平。
2. **layoutSystems()**：自由换行（无每行小节数限制）+ 按内容量两端对齐；可用宽度扣除 `STAFF_HEAD_W`（系统头部）。
3. **sysMetrics()**：行高。五线谱行 48px 基础 + **按整曲音域自动扩加线区**（含 adds）+ dual 简谱行 +26。
4. **系统头部（严格出版标准，v36.9）**：`staffHeadGeom()` → 谱线自 `oxH=MARGIN` 起 → 谱号画在线上（G→G4线/F→F3线/C→中线）→ 调号逐个按字形宽度全尺寸排列（三谱号各自标准音位数组 SH_STEP/FL_STEP）→ 拍号（首行，timeSig 字形组字）。钢琴大谱表上下谱表严格纵向对齐 + SMuFL brace 花括线（非均匀缩放跨接）。
5. **五线谱音符**：SMuFL/Bravura 真字形（§5）；同列多音 `chNotes()` 升序、二度翻转+6.6、共用符干贯穿；符杠**随旋律倾斜**（坡度=首末符头连线之半、限幅±0.8线距，截距保证符干≥2.9线距）；加线音符干延伸至中线；空小节=居中整全休止；连音线贴符头弯向符干反侧；三连音括线随最高音抬升；小节号非首行行首。
6. **联排（tabStaff）**：TAB 上方标准谱表，品位→MIDI→`midiToStaff` 拼写，逐列左→右绘制（保证 accCarry 次序）。
7. 多页 A4 分页、打印预览（PV 对象 viewBox 开窗）、排版面板（基准纸张/智能疏密/手动微调）、反色模式、PNG 导出。

## 5. SMuFL 字形子系统（v36.7）

- `SMUFL` 常量内嵌 **47 枚 Bravura 轮廓**（Steinberg，SIL OFL 1.1，代码内已附署名注释）。单位=1谱线距、y 向下、y=0 为 SMuFL 注册线。
- `smg(name,x,y,SG,opts)` 绘制（opts.scale/sx/sy；**注意 v37.1 教训**：sx/sy 判断必须 `sx===s&&sy===s` 才走均匀分支）；`smw(name)` 宽度；`accG()` 变音记号右缘对齐；`tsigStr()` 拍号组字。
- 增补字形：改 `muse-tab/tools/gen_glyphs.py` 的 WANT 列表 → 下载 Bravura.otf + glyphnames.json（脚本内有 URL）→ 运行生成 glyphs.js → 用 python 正则整体替换 index.html 中 `const SMUFL = {...};` 一行。

## 6. 特色功能实现索引（grep 关键词 → 位置）

| 功能 | 入口/关键词 |
|---|---|
| 新建向导八卡 | `showNewWizard` / `showNewForm` / `createSong`（场景→基础形态映射） |
| 类型归类 | `docType` / `TYPE_CN` / `CC_CATS` / `TYPE_NORM` |
| 换调自动移调 | `transposeEditor` / `transChordName`（mm-ok 内触发） |
| 伴奏织体 | `PIANO_TEX`（v45.1 起 15 套·level分级·2/4·3/4·4/4·6/8）/ `genAccompaniment`（可选 chordVi/rhVi/lhVi 声部参数）/ `suggestChords`（**v44.9 功能和声 Viterbi**：发射=旋律契合+转移=T→S→D→T+属七 V7+正格终止，全局最优）/ **v45.0** `suggestChordPlan`+`placeChordPlan`（和声节奏：一小节 1–2 个和弦）/ `b-acctex` |
| 智能配谱 | `arrangeAccompaniment(melody,{texId,pure,suggest})`（纯函数开新窗口）/ `b-arrange`（vocal/teach/instr 可见） |
| 哼唱成谱 | `hmPitchTrack`（NSDF+首峰+中值）/ `hmDetectKey` / `hummingToSong`（quantizeToCols legato 参数）/ 向导 nw-hum |
| 分享卡（静态） | `buildShareCardSVG`（干净快照嵌套裁窗+二维码占位）/ `exportShareCard`（CSS变量解析→canvas 2x PNG）/ 弹窗 ex-card |
| 互动谱（动态分享） | `exportInteractiveCard`（fetch 自身源码→DOM 快照兜底；注入 `pyq-share-data` 脚本；**源码内严禁裸写 body 闭合标签字面量**）/ `enterShareViewer`（`window.PYQ_SHARE` 经 DOMContentLoaded 启动，body 类 viewer+share）/ 弹窗 ex-icard |
| 节拍器/倍速 | `metroClick`（正弦+噪声拍点，首拍重音）/ `metroOn`·`playRate`（play() 内 spb 缩放与逐拍布点）/ 播放条 `b-metro`·`mx-rate` |
| 左栏谱类感知 | `DOCK_PANELS`（类型→页面板集合与顺序，flex order 排序）/ `renderDock`（页签显隐/命名/标题/失效页回退，render() 首行调用）/ `setRibbon`（面板显隐+排序在此应用）/ 专属面板 panel-vox-acc·fn·arr·lyradd（按钮全部委托既有流程） |
| 纯和弦谱 | `song.chordOnly`（斜线绘制在 cols.forEach、拍宽拉平在 measureLayout） |
| 和弦引擎（v39.0） | `CHORD_TEMPLATES`（22类型×E/A把位模板）/ `movableShape`（未知类型返回null，绝不静默大三）/ `algoShape`（4品窗音程搜索，uku主用）/ `parseChordName` / `QUAL_INTERVALS`（与模板同口径音程表，chordTones/织体共用，1/3/5/8槽位恒在）/ `chordShape`（精修库→模板→algo 三级兜底，签名不变19处调用零改动）/ `auditionShape`（琶音试听）/ `diatonicChords` / `rebuildChordList`（动态候选） |
| 和音输入 | `b-addnote`（唱名串自动向上排列）/ 五线谱 Ctrl+点击（click handler `dataset.sbot` 分支） |
| 记谱法切换 | `setVoxNotation` / `toggleVoxDual` / 面板 `vn-jp/st/bs/al/dual` |
| 智能填词 | `smartTokenize`（跳休止/连音、标点旁挂） |
| 播放 | `sf-embed` 内嵌采样、`playInst`、let-ring、和音在延音链外独立发声 |
| 曲谱库/观看 | `PRESETS` / `viewerBuildSong` / `vwTranspose` / 谱架模式 `enterStand` |
| 打印预览 | `pvOpen` / `PV_GEO` |
| MusicXML 导出 | `exportMusicXML`（divisions=48，音高经 staffKeyInfo 拼写；**v44.7 起含 TAB 声部**：staff-details 六线定弦+TAB 谱号+每音 technical string/fret+变调夹；**v44.8** 前倚音 grace/滑音 slide/独立力度 dynamics/速度术语 words）/ `downloadMusicXML` / 打印弹窗 ex-mxl |
| MusicXML 导入 | `importMusicXML`（DOMParser；音高 midi−keyRef→SEMI_DEG；跳过计数；**v44.7 起识别 TAB part**：clef TAB 或 staff-tuning → tabVoices，string/fret 反解 notes，tuning/capo/uku 反解，vox/tab 混合 part 分流）/ 向导 nw-import |
| MIDI 导入 | `parseSMF`（SMF 0/1+运行状态）/ `quantizeToCols`（16分网格量化，**通用模块**）/ `buildSongFromMIDI` / 向导 nw-midi |
| MIDI 导出 | `exportMIDI`（SMF format1；tie链合并长音/和音/TAB轨含capo）/ `downloadMIDI` / 弹窗 ex-mid |

## 7. 测试体系（**每次改动必须跑**）

`muse-tab/tests/`，Node + Playwright（Chromium 路径 env `CHROMIUM_PATH`，默认 `/opt/pw-browsers/chromium`；被测页面 env `MUSETAB_URL`，默认仓库内 `../index.html`）：

```bash
cd muse-tab/tests && node tv_matrix.js   # 逐个跑，输出 ✅/❌ + NO ERRORS
```

| 套件 | 覆盖 |
|---|---|
| tv_matrix | **跨谱类冲突矩阵 12 组合**（各类型+Eb/B调+反色+A5/A3+预览），SVG 无 NaN/undefined |
| tv_head | 系统头部几何断言（谱线起点/谱号锚线/逐个调号精确坐标/双谱表对齐/联排） |
| tv_audit | 临时记号进位/拍号/连音线贴符头/左栏标签/字形库健全 |
| tv_types | 八类型创建+特性+旧类型兼容 13 项 |
| tv_acc | 织体生成音级断言/弹窗/换调联动/**配和弦建议(不覆盖)**/11套分级/新织体生成 |
| tv_arrange | 智能配谱：teach三声部产出/纯伴奏/换调联动/已填保留/入口显隐 + **v44.9** 属七终止(C F G7 C)/功能进行无逆行 + **v45.0** 和声节奏(C@0+G@2 拆分) + **v45.1** 织体扩拍号(2/4·6/8) + **v45.2** 副属和弦(#4→D7 解 G·纯自然音不触发)——10项 |
| tv_humming | 哼唱：页面内合成带颤/包络正弦旋律→音级与时值断言/定调G/无声降级——5项 |
| tv_card | 分享卡：三谱类出卡结构断言/光栅化冒烟(非空像素)/入口+编辑态还原——5项 |
| tv_chord2 | 和音：符头数/共用符干/二度错位/简谱叠置/柱式生成 |
| tv_trans | 换调移调 6 项（含还原逐字节一致） |
| tv_brace | 花括线跨度（两端落线） |
| tv_staff / tv_piano / tv_combo | 五线谱/钢琴/联排基础回归 |
| tv_viewer | 互动谱+节拍器：Node 侧打包注入→观看模式启动/移调不改原数据/倍速时长比/节拍器源增量/导出自打包完整性/双模式入口——6项 |
| tv_dock | 左栏谱类感知：8类型页签/面板集合与排序断言、＋歌词行流程、专属按钮真实生效、旧控件齐全——10项 |
| tv_tech | 揉弦/闷音：波峰数随时值、扩选范围几何断言（波浪/虚线末端落在末音列格）、单音兼容、滑弦成链兼容——5项 |
| tv_safety | 数据安全：迁移逐条容错（v41.5 单窗口化：历史多文档取 cur、其余转存「我的曲谱」）/渲染异常不落盘自动撤销/配额失败提示/loadSong 防覆盖（v41.5 起=确认对话：取消保留·确认替换·已入库直接替换）/谱架·0.25×·向导提权——6项 |
| tv_dot | v41.5 双附点：循环+邻音联动/16·32分档位限制+setDur收敛/拍值1.75×·旧值兼容·播放时长/五线谱两点几何/简谱增时线新形态/MusicXML 双dot往返——6项 |
| tv_acct | v41.7 账号系统：本机 API_ON=false 降级提示、登录弹窗结构、手机号校验拦截、stub fetch 走通登录落地、账号态/函数完备、退出清账号、既有 localStorage 键零污染——7项 |
| tv_sync | v41.8 我的曲谱云同步：未登录不触网、保存推送云端、短id升级、登录拉取云端、mtime双向合并（本地新推云/云新覆盖本地）、删除传播、413不抛错——7项 |
| tv_pub | v41.9 谱库观看：openRemotePub 拉公开谱进观看模式+渲染非空+观看栏返回谱库、退出观看、异常数据不进观看、404容错、观看移调生效——5项 |
| tv_site | v42.0 官网谱库+登录：page.route 伪装 puku 域+stub API，编辑器同款卡片（封面/类型/免费/链接）、导航登录按钮、登录弹窗结构、登录后账号chip、已登录chip+菜单、两页无报错——6项 |
| tv_publish | v42.1 创作者发布：PYQ_CLOUD+ACCT+stub fetch，非创作者自动开通→PUT存谱→POST发布→真实公开链接、创作者直接发布、短id升级后发布、本机演示降级不触网、发布失败回滚(按钮可再点/不弹成功框)、全程无报错——6项 |
| tv_presets | v42.2 预设曲谱：遍历 PRESETS 逐首 loadSong 渲染校验（len>1000/无NaN/无undefined/无报错，每次清 undoStack 规避 guardReplace）+ 记录每首 docType + 谱类覆盖断言（全 10 类 guitar/uku/solo/piano/pianoacc/vocal/teach/instr/func/chord）——16 预设+1 覆盖=17项 |
| tv_gtech | v42.3 吉他三分类+技法：gtype='lead'/'finger' 专属技法面板显隐+切换刷新、电吉他记号渲染(A.H/P.H/摇把w-bar/let ring/Drop D谱首)+N.C.、applyGtech 落 note.bar/hmT/rhFing 与 col.perc、清除技法全清、弹唱无 gtype 技法、全程无报错——9项 |
| tv_engrave | v42.4–42.6 刻版结构修复：P3 复合拍号符杠成组·P1 大谱表小节线贯穿·顿强 Marcato·sf/sfz·P4 跨小节连音线续接·推弦箭头+和弦图横按·P2 独奏 treble-8vb 移调谱号(has8+单音加线≤3几何)——8项 |
| tv_tempo | v42.7 速度/表情术语+弱起：TEMPO_TERMS 库+song.tempoTerm 谱首斜体渲染(简谱/五线谱)、表情术语(dolce/cantabile/legato/a tempo)音符下方斜体且不入 DYN_GAIN(不改音量)、弱起小节 song.pickup 首小节不足拍豁免+超拍仍报错+meaNo 重编号(弱起空号/其后记1)——4项 |
| tv_ottava | v42.8 八度记号：staffStep 内联 ottStep(8va−7/8vb+7/15ma∓14) 记谱移位、voxMidi 实音不变、col.ott+ottTo 起列画 8va 斜体标签+虚线括线(dasharray)+上下方位(8va上/8vb下)、整句 ott 落每列 ottTo 仅首列、下加线收拢(22→0)——4项 |
| tv_dblacc | v42.9 双变音手输：accSemi(x+2/bb−2) & voxMidi 半音、toggleAcc 循环(空→#→x→空 / 空→b→bb→空)、简谱 ×/♭♭ 文字(含 adds)、五线谱 SMuFL accidentalDoubleSharp/Flat 字形+临时记号进位、MusicXML 导出 alter=±2——5项 |
| tv_glyphsz | v43.0 记号放大：简谱变化音 font-size 14(单)/12(双 ♭♭)、左置于数字左侧(x<数字)、旧 10 号已无；吉他分解/闷音 × font-size 12.5(旧 10)——2项 |
| tv_trem | v43.1 震音：col.trem=1/2/3 五线谱符干上 1/2/3 斜杠(全音符符头上方)、简谱数字上方对应条数、toggleTrem 循环(无→1→2→3→无)+休止豁免、voxMidi 实音不变——5项 |
| tv_gliss | v43.2 滑音：col.gliss 五线谱/简谱本音直线滑到下一音(diff +1 线)、跨小节续接、宽间距标 gliss.、toggleGliss 切换+休止豁免+末音无下一音不画——5项 |
| tv_bend | v43.3 推弦回放/预推：note.bendType='rel'(∧)/'pre'(竖直上箭头) 三型渲染各异且干净、纯预推无 tk、bendFromBar 单音→pre/双音→常规、取消清 bendType——5项 |
| tv_mxlfid | v43.4 MusicXML 保真：八度 octave-shift 导出(8va=down/8vb=up+stop)+往返(ott 落每列/ottTo 首列)、震音 <tremolo type=single>N 导出+往返、双变音 alter=±2 导入还原 ×/♭♭+音高一致——3项 |
| api/wx.test + db.test | v43.6 微信登录：wx.js 纯逻辑(state 签名/防伪/过期、扫码 URL、code 换 openid/unionid+资料、userinfo 失败不阻断)8 项 + db 层迁移/upsert(unionid 优先匹配、openid 兜底、占位 phone、绑定 COALESCE、旧库 ALTER 迁移)6 项。`node api/wx.test.js` / `node --experimental-sqlite api/db.test.js` |
| tv_meter | v43.5 变拍子：meaMeter(mi)/beatsOf(c,unit) 单位、beatErrors 按本小节拍号(3/4 满不报/超拍报)、beamGroups 按本小节 unit(6/8=3+3 vs 4/4=2+2+2)、简谱中途标 N/M、measureSeconds 按拍号(3/4=3拍)、MusicXML <time> 变更往返、设本小节拍号+autoFix——8项 |
| tv_frame | 新版外壳：深色顶栏/通栏播放条、经典切换持久化、音符组前置、快速换调、谱架兼容、六图层轨、和弦层谱类感知、小节/段落层、右栏四页签（排版停靠/库智能感知）、工具行单行化（技法/记号入图层且生效）、窄屏浮层、通栏贴边框架（贴边/内滚/轨新建/还原）、经典版完整还原——16项 |
| tv_chordlib | 和弦引擎：468个模板指法逐音高纯净/吉他12×22全覆盖/未知类型明确失败/尤克里里12×8/斜杠低音/音程表/弹窗升级/功能谱预览/动态候选/和弦图式创建器/升降号左上角——12项 |
| tv_sign | v41.1–v41.3 记号十件：延长号/演奏法四件套/换气 + 渐强渐弱范围括线/推弦幅度/排练标记 + 中途转调/钢琴踏板/指法数字/小节反复——入口写入·互斥·取消、几何断言（𝄐 位置、artic 贴符头反侧、楔形开口 0→7 与跨行断线衔接、bAmt 弧上文字、label 方框包含文字、转1=G 在数字行上方、Ped.____* 起止 x 对应两列、指法在符头上方、𝄎 省写无数字+源小节轮转+节拍豁免）、MusicXML 往返（fermata/articulations/breath-mark/wedge/rehearsal/key 变更/pedal/fingering/measure-repeat）——13项 |
| tv_mxl | MusicXML 出+入：xmllint 校验/计数/时值和/音高拼写/**往返一致**/第三方 fixture/**v44.8 表情往返**(速度术语 words·独立力度 dynamics·前倚音 grace·滑音 slide) |
| tv_midi | MIDI 出+入：SMF fixture/量化(附点·跨小节连音·adds)/running status/分手/**导出往返**(meta·tie合并·音高集合) |
| tv_tabmxl | v44.7 TAB↔MusicXML：吉他弹唱(vox+tab)导出 xmllint+staff-tuning/string-fret、TAB **往返一致**(dropD/capo/和音/x/附点)、uku 4 弦往返、第三方 MuseScore 式 fixture 导入、纯 TAB(solo)导出/导入——5项 |
| tv_member | v45.3-45.4 会员+支付：权益文案诚实(免费含云同步/MusicXML·无旧虚假卖点·无演示开关)、memberPlan 接 PYQ_ENT、兑换→entRefresh 数据链(quota 500→2000)、微信支付流(下单→真QR→轮询→到账→回权益页)、看谱页分享卡(shareCardURL 优先当前谱)——5项 |
| tv_detail1 | v45.6-45.7 细节批次1+2（几何断言）：闷音×15/打板×16、TAB 休止 SMuFL 化+附点、拍弦框内×、联排间距、小节内换谱号(位差恰 45px+布局加宽+延续)、换谱号 MusicXML 往返、信息卡补齐 + 横按判定(Em无杠/Bm有杠)、联排像素级间距(低音36+/推弦装饰30+)、低音谱号联排(tabClef)、面板重组(记谱风格分组/哑音/谱号按钮)…至 v47.9 累积 44 项（T40/T41 随「延迟前进」改为自建选区并清前进锚点，语义不变）（行首编号/系统连线/泛音菱形/Ctrl多选/智能预提示/四页签/启动台/音符三图层/面板不溢出/倚音图标统一等，见各版本注记） |

注意：SVG innerHTML 会把 `/>` 序列化为 `></tag>`，断言不要匹配 `/>`（历史坑）。

**发版流水线**：改 index.html → 跑相关套件+矩阵 → 更新日志 `<li>`（b-changelog 弹窗内，版本号递增）**＋ 同步 `APP_VER` 常量**→ **更新本文档** → commit+push → 重发 artifact → 截图验证发给产品负责人。

## 8. 进度（版本履历摘要）

| 阶段 | 版本 | 内容 |
|---|---|---|
| 弹唱谱编辑器成熟期 | ~v34.92 | TAB+简谱+歌词、和弦图、技法、播放（let-ring）、曲谱库、智能填词 |
| 排版引擎 | v34.93–v35.8 | 打印预览、排版面板、Gourlay 内容驱动宽度、弹簧-刚杆、出版级字号 |
| 官网+视觉 | v35.9–v36.0 | 多页官网、编辑器视觉对齐、顶栏改名（预设/曲谱库） |
| 五线谱一期二期 | v36.1–v36.4 | staff MVP、联排、点击定音高、大谱表钢琴谱 |
| 五线谱深度打磨 | v36.5–v37.1 | 审计修正、**SMuFL/Bravura 字形引擎**、刻版规则（斜杠/整小节休止/小节号）、**系统头部出版标准**+中音谱表、行距音域扩展、五线谱+简谱行联排、标准花括线 |
| 换调移调 | v37.2 | 和弦+品位自动移调 |
| 八场景重构 | v37.3–v37.6 | 八类型体系、纯和弦谱、**钢琴弹唱织体生成（8套）**、**同列多音** |
| P0 互操作 | v37.7–v38.0 | **MusicXML 出/入 + MIDI 入/出 四件套**（往返一致；通用量化模块；P0 收官） |
| P1 垂类楔子 | v38.1–v38.2 | **织体库11套+分级**、**配和弦建议**、**智能配谱**（旋律→伴奏教学谱/纯伴奏，P1 收官） |
| P2 增长 | v38.3–v38.4 | **哼唱成谱**、**曲谱分享卡**（P2 收官） |
| P3 垂类文案 | — | 官网首页/制谱/功能/帮助按八场景+即兴伴奏/考编叙事重写（**优化指令全部完成**） |
| 分享升级+练习工具 | v38.5 | **动态互动谱**（自打包单文件 HTML，收谱即可播放/倍速/移调/谱架）+ 播放条**节拍器**与**倍速**（0.5×–1.5×） |
| 编辑器体验 | v38.6 | **左栏谱类感知布局**：页签/面板按八类型显隐排序，钢琴弹唱伴奏工作流置顶、功能谱级数置顶、纯和弦谱精简、＋歌词行入口 |
| TAB 技法刻版 | v38.7 | **揉弦波浪线随时值延长**（可扩选覆盖范围）+ **闷音 P.M. 范围标记**（虚线+末端竖钩，applyTech 范围语义） |
| 和弦引擎 | v39.0 | **可移调模板引擎**（22类型全根音+斜杠，修复把位错画大三 bug）+ **弹窗升级**（调内直达/搜索/试听/口径统一）+ 织体全类型音程表。遗留：同名多把位共存（col.voicing 可选字段方案已评审，见会话记录） |
| 和弦创建与显示 | v39.1 | **和弦图式创建器**（竖式点格/顶部×○/把位窗，替代横向指板矩阵；`data-cdc/cdt/cdb` + `ceState.cdBase`）+ **升降号主音左上角**（`chordSvgLabel`/`chordHtmlLabel`，数据格式不变仅显示层转换） |
| 和弦弹窗单页化 | v39.2 | 双栏无滚动布局：左列主音/性质/转位/保存/我的和弦，右列可编辑和弦图（兼预览）+把位/试听/把位方案；按产品要求移除搜索直达、调内常用条、自定义指法文本行，「根音」更名「主音」 |
| 专家评审第一批 | v38.8 | **数据安全加固**（迁移逐条容错/渲染异常不落盘/配额提示/loadSong 防覆盖）+ **快赢**（谱架直入/0.25×/向导提权/发布免责/WCAG AA 浅色对比度）。评审来源：.claude/agents 三角色（Code Reviewer/UX Researcher/UI Designer）；**未落地的第二、三批建议清单见会话记录与下方路线图** |
| 编辑组中文化+双附点+单窗口 | v41.5 | 工具行「编辑」组中文+并入八度；**双附点**（dotted:2，×1.75）+附点可用性出版规则重设+简谱增时线 GB 形态修正；**单窗口化**（防覆盖改确认对话、历史多文档转存我的曲谱） |
| 上线体检 | v41.6 | **备案号落地**（粤ICP备2026100396号-1，编辑器+官网页脚）；**官网朱砂设计同步**（pyq.css 令牌换向素材配色，墨绿 CTA、中文字体栈）；**官网使用手册**（help.html 扩为 11 章，覆盖 v41.1–41.5 全部新功能，单窗口/双附点文案同步） |
| 云端生态（账号+谱库） | v41.7–v42.1 | 自建零依赖 Node 后端（node:http+node:sqlite+JWT，systemd `pyq-api`+nginx `/api/` 反代，三域 Cookie 互通）；**手机验证码登录/注册**（M1b，阿里云短信）+ **我的曲谱云同步**（mtime last-write-wins）；**谱库上线**（puku `?pub=` 深链观看模式）+ **官网谱库同款卡片+全站登录**；**创作者一键发布**（编辑器「发布」接真 API，创作→上架闭环，v42.1）。详见 §2 账号后端小节 |
| 谱类预设补齐+深测 | v42.2 | 5 位谱类制谱师 agent（`.claude/agents/notation-*`）并行深测各谱类制谱功能并补齐预设：曲谱库谱类覆盖 4→**全 10 类**，新增 **9 首出版级预设**（独奏/钢琴独奏/钢琴弹唱/歌谱/合唱/器乐五线/教学对照/纯和弦/功能谱进阶）；修复独奏谱×误记、简谱休止增时线、纯和弦谱构造三处，其余刻版问题归档 `docs/notation-audit-v42.md` 排期。新增 `tv_presets` 回归 |

## 9. 路线图（v37.6 起按垂类战略重排，详见 CLAUDE.md 战略锚点）

> **记谱完整度基准**：对照《乐谱记谱大全》19 页出版级标准的完整审计见 `docs/completeness-audit-v42.md`（出版级排版师+音乐符号管理师并行审计）。现状：简谱 84% 覆盖 / 五线 78% 排版达标 / TAB 84% 排版达标；结构性缺口=贝斯·鼓整类缺失、五线扩展记号层（术语库/弱起/变拍/8va）。补齐分 Tier 0 快赢→Tier 1 刻版结构四修（P1 大谱表小节线/P2 8vb/P3 复合拍成组/P4 跨小节连线，其中 P3·P4 五线简谱同根「一改双修」）→Tier 2 垂类符号→Tier 3/4 战略大工程。**进度：Tier 0/1 已全部落地（v42.4–42.6）；Tier 2 进行中——v42.7 意大利速度术语库（`song.tempoTerm`）+ 表情术语（dolce/cantabile/legato/a tempo… 入 `DYN_LIST`、不入 `DYN_GAIN`）+ 弱起小节（`song.pickup` 放宽首小节满拍校验、`meaNo` 重编号）；v42.8 八度记号 8va/8vb/15ma/15mb（`col.ott`+`col.ottTo`，记谱移位由 `staffStep` 内联 `ottStep`、实音/播放不变，谱表上/下方虚线括线，`showOttavaMenu` 整句/单音标注）；v42.9 双变音手输 重升 ×/重降 ♭♭（`col.acc` 扩值 'x'/'bb'，`accSemi` 统一半音、`toggleAcc` 循环输入、五线谱 SMuFL 字形+简谱 ×/♭♭ 文字、MusicXML 导出 `<alter>±2</alter>`）。v43.1 震音 tremolo（`col.trem`）；v43.2 滑音 gliss（`col.gliss` 本音直线滑下一音+"gliss."）；v43.3 电吉他推弦回放 bend&release/预推 pre-bend（`note.bendType='rel'/'pre'`）；v43.4 MusicXML 互操作保真（八度 `octave-shift`、震音 `<tremolo>`、双变音 `alter=±2` 导入还原 ×/♭♭）；v43.5 变拍子 per-measure 拍号（`mea.beats`/`mea.unit`，`meaMeter`/`beatsOf(c,unit)` 贯穿 40+ 点，校验/符杠/拍号标注/版面/播放/MusicXML `<time>` 往返全通）。**至此完整度审计 Tier 0/1/2 全部落地。** Tier 3/4 剩战略大工程（贝斯谱/鼓谱整类，用户已暂停待拍板）。** 下方原路线图后段项与此审计合并管理。

**P0 互操作（接入 AI 转谱生态）**
1. ✅ ~~MusicXML 导出~~（v37.7，`exportMusicXML`）
2. ✅ ~~MusicXML 导入~~（v37.8，`importMusicXML`，往返一致性已验证）
3. ✅ ~~MIDI 导入~~（v37.9，`parseSMF`/`quantizeToCols`〔哼唱转谱复用此模块〕/`buildSongFromMIDI`）
4. ✅ ~~MIDI 导出~~（v38.0，`exportMIDI`：tie合并/和音/TAB轨+变调夹）

**P1 垂类楔子（即兴伴奏/考编）**
5. ✅ ~~织体深化~~（v38.1：11套+level分级；`suggestChords`/`applySuggestChords` 功能和声建议，不覆盖已填）
6. ✅ ~~智能配谱~~（v38.2，`arrangeAccompaniment`：teach 三声部/pure 纯伴奏两种产出；P1 收官）

**P2 增长（无需后端）**
7. ✅ ~~哼唱→简谱草稿~~（v38.3：NSDF 检测+自动定调+legato 量化；**麦克风链路待正式站点真机验证**）
8. ✅ ~~编辑器内「生成分享卡」~~（v38.4，`buildShareCardSVG`/`exportShareCard`；card.html 薄查看页待服务器）
9. ✅ ~~动态互动谱 + 播放条节拍器/倍速~~（v38.5，`exportInteractiveCard`/`enterShareViewer`/`metroClick`；**服务器上线后二期：互动谱转为链接+二维码分发**。注意：托管环境若禁 fetch 自身源码会走 DOM 快照兜底，需在正式站点验证一次导出文件可开）

**P3 垂类文案**：✅ ~~官网 make/features/help/首页按八场景+即兴伴奏/考编叙事重写~~（随 v38.4 完成）

**应用壳布局尝试（已回退，接手者注意）**：v38.9 曾按外部设计稿实现「顶栏收敛单行＋⋯更多下拉＋谱面上方同源互切切换条」（commit `3b21162`），产品负责人评审后认为效果不理想，已 revert 回 v38.8 布局（仅保留其中的文档标签页 TYPE_CN 修复）。如未来重启此方向：实现可从该 commit 找回；设计稿评估结论（三选一切换与联排渲染架构冲突、8 类功能在新壳无位置、品牌色保持蓝紫不换向）仍然有效。

**新版界面（v5 设计稿）实施路线（v40.0 起，产品已拍板）**
- 已定决策：配色=现有蓝紫基础上扁平化+护眼（不采纳朱砂）；图标沿用现有设计；工具行音符组前置；新版为默认、顶栏「经典版」可切回（localStorage musetab-shell）
- 阶段1 ✅ v40.0：深色扁平顶栏（含快速换调 k-dn/k-up→transposeEditor）+ 通栏播放条 + 护眼扁平令牌
- 阶段2 ✅ v40.1：左轨六图层（吉他谱/简谱/歌词/和弦/小节/段落，图标经 data-ic+CSS ::before 呈现、textContent 语义不变以兼容 renderDock/tv_dock）；和弦/小节/段落为虚拟图层页（setRibbon 内 `virt` 显式面板清单，不走 panel-前缀匹配）：和弦层谱类感知复用 panel-tab-chord / panel-vox-fn（tab/vox 页原面板保留不动，tv_dock 零改动）；小节/段落层内容 = 右栏「小节与段落」原 DOM 节点搬移（applyShellDock，id 与事件保持，经典版按 musetab-sp-open 状态还原）
- 阶段3 ✅ v40.2：右栏四页签（#rtabs + rcard[data-rt] 分组，setRTab 控显隐；经典版页签条与 .rt-new 卡片 CSS 隐藏、卡片全显）：信息=原卡片；排版=#layout-pop 整体停靠 #layout-host（applyShellDock 搬移，经典版回 body 恢复浮层，b-layout 按外壳分流）；库/智能=直达入口全部委托既有按钮（eb-lib/b-chord-edit/b-acctex/va-sug/b-arrange/b-fill；哼唱与 MusicXML/MIDI 导入 = b-new.click()+nw-*.click() 链），入口显隐在 renderDock 与 b-acctex/b-arrange 同口径
- 阶段4 ✅ v40.3：工具行单行化——setRibbon 在 uiShell 下向 tab/vox spec 注入 'tech'/'orn' 面板（panel-tab-tech/#tech-host、panel-vox-orn/#orn-host），eb-ctx 构建分流（新版写入左栏 host、经典写回编辑栏二行，applyShell 置 ebCtxFor=null 强制重建），ebHandler 额外绑定两个面板；body.shell #editbar2 隐藏；窄屏(≤1180px) fly 转 fixed 浮层；doc-tabs 扁平微调。**注意：tv_dock 断言经典布局语义，已在套件内 addInitScript 固定 musetab-shell=classic**
- v5 缺口清单核查（均已有，无需新做）：导出六出口=打印弹窗（PNG/MusicXML/MIDI/分享卡/互动谱/打印PDF）；循环选区=mx-prog 点击/拖动；无头无尾滑音4键=EB_TECHS su/sd/ou/od；倍速六档含 0.25×
- 记号补充第一批 ✅ v41.1（notation-audit-v41 前 3 项落地）：**延长号** `voxCol.ferm`/`tabCol.ferm`（SMuFL fermataAbove，简谱避让八度点/波音/演奏法、TAB 让位和弦名、休止可标）+ **演奏法四件套** `voxCol.artic`（stacc/staccatissimo/tenuto/accent 互斥；五线谱贴符头反符干侧，staccatissimo 楔形为几何绘制——字形库无此枚；简谱 GB 形态 ·▼−>）+ **换气记号** `voxCol.breath`（列右上角小 v，挂列右缘不占对齐宽度）；入口=简谱/吉他层「记号」面板按钮（再点取消）；systemExtras 按需预留行高；**exportMusicXML/importMusicXML 同步 fermata/articulations/breath-mark（往返一致）**；新增 tv_sign 套件（5项）。审计报告第 4 项起（渐强渐弱范围括线/推弦幅度/排练标记/中途转调/踏板/指法/小节反复）仍按 docs/notation-audit-v41.md 排期
- 记号补充第二批 ✅ v41.2（notation-audit-v41 第 4–6 项落地）：**渐强渐弱范围括线** `voxCol.dynTo:{mi,ci}`（力度菜单 + Ctrl 选首末两音；同行开口楔形、跨行到行末断开续行起继续、开口度沿总长线性过渡，cresc./dim. 为文字+虚线延长；渲染定位靠新增 `voxPos` 预计算——与 tabPos 同源）+ **推弦幅度** `note.bAmt`（已推弦音符再点推弦按钮 → `showBendAmtMenu` 四选一小菜单；弧上文字 full/½/¼/1½ 替换 b↑/b↓，无 bAmt 维持现状；清除技法/连音线时一并删）+ **排练/段落标记** `mea.label`（小节层「段落标记…」askText 按钮，留空清除；navMarkSVG 方框粗体、与 𝄋/⊕ 右移避让、systemExtras 预留行高）；**exportMusicXML/importMusicXML 同步 wedge crescendo/diminuendo（含 stop 定位 dynTo）与 rehearsal（往返一致）**；bend-alter 待 TAB part 导出（TODO 已登记）；tv_sign 扩至 9 项（T6/T6b/T7/T8）
- 记号补充第三批·收官 ✅ v41.3（notation-audit-v41 第 7–10 项落地，审计前 10 项全部完成）：**中途转调标记** `mea.keyTo`（小节层「转调标记…」KEY_LIST 弹单选/清除；navMarkSVG 画「转1=X」粗体、与 label/𝄋 右移避让；一期标注式——五线谱调号/拼写保持谱首调；transposeEditor/transposeSong 同步平移）+ **钢琴踏板** `voxCol.ped:'on'|'off'`（「记号」面板两键成对，五线谱下方 Ped. 文字+延续线+*收尾、换踏断线不画 *、跨行断线续画（仿 wedge），仅五线谱记谱声部显示入口）+ **指法数字** `voxCol.fing`/`adds[i].fing`（「指法」按钮进入 `fingMode` 直录：数字 1–5 写入、0/退格清除、Esc 退出；符头上/下方 8.5px 小数字，chNotes 携带 fing 排堆叠）+ **小节反复** `mea.simile:1|2`（`simileSrc` 源小节解析（连续同号组内轮转）、`simileSignSVG` 手绘 𝄎（斜杠+两点、双小节加数字2）、三处渲染循环（TAB/联排/简谱·五线谱）省写并保留整小节点击热区与 colBoxes（播放头按源列数均分）、播放 play()/measureSeconds 展开为源小节、beatErrors 豁免）；**exportMusicXML/importMusicXML 同步 key 变更 / pedal start·stop / technical fingering（含 chord 和音）/ measure-style measure-repeat（往返一致）**；tv_sign 扩至 13 项（T9–T12）。审计榜下备选（A.H. 泛音细分/简谱滑腔/TAB 装饰音/let-ring 虚线/N.C./sfz/表情术语等）仍按 docs/notation-audit-v41.md §榜下备选 排期
- 左右栏布局与图标升级 ✅ v41.4（UI 架构评审落地，全部 body.shell 作用域、经典版不动）：**左浮窗**——组标题一律置顶左对齐（`order:-1`，含 DOM 后置的记谱法标题与搬入右栏库的面板）、按钮左对齐；「记号」面板按宿主分小组（`#strum-body/#mark-body/#tech-host/#vmark-body/#orn-host` 的 `::before` 小标题，DOM 不动、经典版无感）；记谱风格按钮 order 靠后；小节/段落层 sp-sec 去嵌套边框（`#mea-host` 内重复 sp-t 隐藏）；**图标**——SVGI 增 arrup/arrdn/eraser，新增 `data-sic` 注入器（包 `.sicon` 仅新版显示——属性名避开谱面热区 data-si；`.svgi` margin 全写抵消全局 `svg{margin:0 auto}` 在 flex 容器被居中的坑）；左轨简谱图标重绘（1 2+高音点+减时线）；**右栏**——页签改朱砂下划线+智能页 AI 角标；信息页新增摘要卡 `#rc-songinfo`（ri-* 字段在 renderDock 同步，`ri-edit` 委托 b-meta；原 b-meta 按钮卡 shell 下隐藏）；智能页 assist 卡片化（创作辅助/导入·互操作两组，`.aitem` 图标+标题+说明，ids rt-* 不变）；库页外层 rcard 转透明容器、面板即卡片；光标位置仅 .z 强调（shell 作用域修复 v40.5 被 #cursor-info b 后规则覆盖的旧坑）；**谱类感知补漏**——库页 panel-vox-pat 与 DOCK_PANELS 同口径（pianoacc/纯和弦谱无节奏型）、rt-chorded 仅含 TAB 声部谱类显示
- 编辑组中文化+双附点+单窗口化 ✅ v41.5（产品负责人三项指示）：① **工具行「编辑」组**——原「音符」组改名并在新版外壳恢复中文（`#eb-edit` 作用域 CSS 覆写 .dg/.dn 显隐，仅此组；时值/节奏/记号组保持字形），八度＋/−（eb-octup/eb-octdn 委托 bumpOct）并入本组、简谱面板 b-octup/b-octdn 在 shell 下 CSS 去重隐藏；按钮 2 字化+组内收紧+combo 图示 30px+zoom 收窄，1440 宽度实测 scrollWidth=clientWidth 恰好不溢出（余量为零——再往本行加按钮必须先减宽）；② **双附点**——数据 `dotted:2`（true=单附点旧义不迁移）、`dotLevel/dotFactor/maxDotLevel` 三助手（beatsOf 唯一时值源→播放/MIDI/MusicXML 自动同源）；可用性规则=附点需要更低一级细分（全/2/4/8 分双附点、16 分单附点、32 分禁附点），setDur 换时值自动收敛档位；toggleDot 循环并升级联动（单附点=邻音减半，双附点=该邻音再减半，取消不联动）；渲染：五线谱/TAB/休止两点并排（间距 4.6）、**简谱形态修正为 GB 惯例**（附点二分=数字+2 条增时线，不再"1 条增时线+附点"；附点全=5 条；双附点二分余下半拍以附点补记——简谱对 3.5 拍无标准写法，为体系内最小妥协）；MusicXML 双 `<dot/>` 出/入+duration 1.75 兜底；新增 tv_dot 套件 6 项；③ **单窗口化**——doc-tabs 隐藏（两外壳同治）、`addDoc/loadSong` 一律替换当前窗口，v38.8 防覆盖改为 `guardReplace` 确认对话（存入并继续/直接替换/取消；after 回调保证取消时不发成功提示）；**musetab-docs-v1 结构与 migrate 兼容不动**：启动读到历史多文档时取 cur 为当前、其余未入库文档一次性转存「我的曲谱」（不丢数据且仍可访问）；渲染异常兜底同理改为"备份入库+换演示谱"；智能配谱在生成前自动将未入库的原旋律谱存入「我的曲谱」（原"另开窗口保留"语义的单窗口等价物）；文件「打开」也改走 loadSong 获得同等防覆盖保护；测试侧各套件以 `guardReplace=(p)=>p()` 直通对话（tv_safety 专测对话本身，T1/T4/T5 已按新行为改写）
- 风格撤销+左栏优化 ✅ v41.0：右栏 style 页签删除（notation 面板回 ribbon/spec 不再过滤 notation；st-* 按钮与委托删除；b-notation 取消隐藏）；左栏卡片节奏统一 CSS（body.shell #left-flyout 272px/8px gap/28px 控件）；**制谱专家 agent 已建（.claude/agents/notation-expert.md）并已启动记号审计 → docs/notation-audit-v41.md（接手者：若报告已生成，按前10项排期落地）**
- 图层重梳理 ✅ v40.9：左轨 .ltab 结构改 `<span.lic data-lic>`(SVG 图形，renderDock 按 instOf/anyStaff 切 tab4/tab6/staff5/jianpu) + `<span.lb>`(小字；新版命名六线谱/四线谱/五线谱/简谱，经典版保留场景名——tv_dock probe 已改读 .lb)；「记号」合并=strum-body/mark-body/tech-host（vox: vmark-body/orn-host）在 applyShellDock 搬入 #sign-host-tab/vox（panel-tab-sign/panel-vox-sign，ebHandler 需绑 sign 面板），shell spec 过滤 strum/mark/chord/notation/col/pat/acc 并在 voice 后插 'sign'；notation 面板搬入 #style-host（风格页签），b-notation shell 下隐藏（st-notation 接管）
- 图标轨与归纳 ✅ v40.8：左轨纯图标（font-size:0 + ::before data-ic 17px，title 由 renderDock 同步），选中 `body.shell .ltab.on` 朱砂底；轨上新建按钮删除；**panel-tab-pat/panel-vox-pat/panel-vox-acc 三面板在 shell 下由 applyShellDock 搬入 #lib-host（右栏库页签），setRibbon 的 .panel-p 循环对 `el.closest('#right-dock')` 直接 return（显隐交 renderDock/setRTab），经典版 appendChild 回 #ribbon（顺序由 flex order 决定）**；rt-patlib/rt-tex 委托入口删除（面板即入口）；右栏 layout 页签改 style（st-notation/st-diag/st-fn 委托 b-notation/b-diag/vf-names，b-layout 恢复 layToggle 浮层，laySync 特例移除）
- 字体与图标 ✅ v40.7：--font-ui 中文前置（PingFang/雅黑优先，中西文同源渲染=素材清晰感的来源）+ text-rendering/grayscale 平滑；**SVGI 图标注册表**（36 枚线性图标 + `svgi(name,size)` + 静态 HTML 用 `data-svgi` 占位注入器）替换全部 emoji——textContent 赋值点已改 innerHTML（beat-status/hifi/mx-expand/播放键/sb-go），docIcon 返回 svgi，帮助/特色弹窗 sec()/fx() 头、曲谱库状态/眼睛/锁、cc-search CSS 图标（data URI）；toast 纯文本场景直接删 emoji；历史更新日志文案已清理。音乐字形 ♭♯♮♩✓♥✦ 属文字符号保留
- 素材配色 ✅ v40.6（产品拍板「配色使用素材配色」，推翻 v40.0 的保蓝决策）：--accent 朱砂 #c33a29（dark #df5a45）、chrome 墨绿 #1f3a34、暖米表面按素材 :root 映射（bg #f3f0e8/toolbar #f7f4ec/panel #fefdf9/paper #fbfaf5）；**--danger 改琥珀 #b45309（dark #ffa424）**避免与朱砂强调混淆（专家预警的语义冲突已消化）；--grad 转朱砂族（应用内；官网 site/pyq.css 已于 **v41.6** 同步换向朱砂）；score-invert 与 print 分支强调色同步。个人中心 shell 下与右端图标同排（tprimary 紧凑样式）；b-restart→⏮；**修露白**：`body.shell #mixer-dock button` 此前只覆写 color 未覆写 background，浅色面板底在深色栏发白——现透明底+暖米字；注意 `body.shell #mixer-dock button` (1,1,2) 会盖过 `body.shell #b-play` (1,1,1)，播放/节拍器选中态选择器需用 `body.shell #mixer-dock #b-play` 双 id 提权
- 视觉舒适度 ✅ v40.5（产品反馈素材 85e56eb2「视觉更舒适」→ UI/UX 两 Agent 归因：约七成来自与色相无关的系统性因素）：浅色令牌升温（--bg #f2efe7 / --toolbar #f4f1e9 / --panel #fdfcf6 / --paper #fdfcf7、--border 染色实线 #ddd6c8、新增 --faint #a59d8e、阴影转暖；@media print 已强制 --paper #fff，score-invert 自含不受影响）；chrome #1c1d20→#262b40 靛墨；强调纪律（#cursor-info b 回墨色仅 .z 活值蓝、shell eb.on 降为 accent-soft）；左栏 rg-title order:0 置顶左对齐 faint；工具行字形化（.dg/.dn 双渲染按外壳切换——经典版仍中文；DUR_GLYPH 音符字形、OPS/连音线/更多字形、.eb.ico span 隐藏、eb-lib shell 隐藏因库页签重复）；beat-box 移入 #editbar 右端（applyShellDock 搬移，err-drop shell 下 position:fixed 避 overflow 裁剪）；帮助/特色/更新日志降为轻文字链（:has 选择器）。**未做（后续可选）**：底栏 15 小节号→时间线（UX #7，需专项测试）；朱砂+墨绿整体换向已给利弊分析未采纳（与 --danger 语义冲突 + 小型 rebrand）
- 贴边通栏框架 ✅ v40.4（产品指示按 3628b133 素材「左右贴边」）：`body.shell:not(.stand):not(.viewer)` 全屏网格——body overflow hidden + flex column（**padding-bottom 必须清零**，v40.0 为悬浮播放条预留的 78px 会挤掉列高）；#stage flex:1、margin-bottom 52px 让位固定播放条；左右 dock position:static + align-self:stretch + 内部 overflow-y；#score-wrap 内部滚动。**滚动模型**：`scoreScroller()` 返回 shell 框架下的 #score-wrap 或 null（窗口滚动）——播放跟随、节拍错误跳转两处已适配；stand（window.scrollBy 自动卷谱）/viewer/print 均排除在框架外。左轨新增 data-act=new/help 动作按钮（.ltab 点击处理内委托 b-new/b-help）
- v5 设计稿评估全文见会话记录（2026-07-21）

**专家评审待办（v38.8 落地第一批后剩余）**
- 第二批·一致性：tv_migrate.js 迁移测试 + 函数重名自动查重脚本（tools/check_dup_fn.js 进测试流程）；选中态视觉语言收敛（5套→2档）；圆角/hover阴影令牌化（--radius-* / --shadow-hover）；导出弹窗按意图分组（打印存档/分享/专业格式）；persist 防抖 + pushUndo/persist 共用一次序列化
- 第三批·规划：移动端信息架构（触控≥40px、低频操作收「⋯更多」、editbar 折叠）；「我的曲谱」搜索分类（复用 cc-q/CC_CATS 组件）；钢琴弹唱空状态引导（无和弦时画布提示①标和弦→②织体）；互动谱导出裁剪未用乐器采样瘦身；深色按钮 SVG 化与官网图标体系统一

**暂缓（需产品负责人拍板）**：多声部音频转谱（不自研，MusicXML/MIDI 导入已吃下大部分价值）、真·微信小程序（等 ICP+服务器）、支付/会员（只留 isPro 判断位）、曲谱库版权策略、Web MIDI 电钢琴实时录入
**原路线图后段保留**：服务器上线+SF2 音色、民乐指法、小程序分享卡、鼓谱、同谱表双声部、8va、奏法记号、和弦谱播放、仓库迁移 veazen/puyouquan

## 10. 红线与约定（接手必读）

1. **localStorage `musetab-*` 键名与 song 字段永不改名删除**；新字段一律可选+默认兼容。
2. **简谱/TAB 分支行为不得回归**——五线谱相关改动必须跑 tv_matrix 全组合。
3. 开发分支 `claude/guitar-tab-software-analysis-zqm0ua`，**不开 PR 除非明确要求**；commit 信息中文、按版本号。
4. 不把模型标识写进推送产物；服务器凭据/SSH 私钥绝不进对话与仓库。
5. Bravura 字形保留 OFL 署名注释；新增字形走 gen_glyphs.py 保证可复现。
6. 函数命名冲突检查：单文件后声明覆盖前声明（grep 再命名，v37.2 教训）。
7. 视觉验证不能只看截图小图——用几何断言（数值坐标）下结论（v37.0 教训）。

## 11. 本文档维护规则

- **每次发版**（版本号递增）：更新顶部版本号/日期、§8 进度表；涉及架构/数据模型/红线的改动同步到对应章节。
- 新增测试套件登记到 §7；新决策（定位/取舍）写进 §1 或 §9。
- 文档随代码同 commit 提交，保持 git 历史可追溯。

> **v45.5 面板符号化**：左栏记号/技巧/装饰按钮「符号优先」——`smIcoSVG(name,h)` 直接用谱面同一份 `SMUFL` path 出按钮小图（bb 开窗等比缩放）；`decorateSignButtons()`（MAP: 按钮 id→[字形,小字]）启动时重写 `#vmark-body`/`#mark-body`/`#strum-body` 静态按钮为 `.eb.ico.sym`（glyph 上 + 9.5px 中文下，title 悬停全说明，id/事件不动）；`ornSVG` 的波音/颤音/回音改用 SMuFL（ornamentShortTrill/Mordent/Trill/Turn）；技法字母统一衬线斜体（#ribbon .eb.ico .g）。测试无 textContent 依赖，26 套件全绿。

> **v45.6 细节批次1 + 小节内换谱号**（产品负责人细节修复清单第一批）：① TAB 闷音/和弦内音 ×→15px、打板 ×→16px（index.html TAB 渲染两处 font-size）。② TAB 休止符弃 Unicode 文本字形改 `staffRestStr`(SMuFL, SG=6, 以 TAB 中部为等效中线)，附点休止的附点随之显示。③ 联排(tabStaff)谱表↔TAB 间距自适应：`sysMetrics` 扫全曲 tab 音符 `midiToStaff(+12)` 谱级，step<32/step>48 按 3.75px/级加 `tLedDn/tLedUp`，基础间隙 9→14（treble-8vb 的"8"缀需 ≥13 净空）。④ **小节内换谱号**：新增列级字段 `col.clef`('staff'/'bass'/'alto'，永不改名删除)——渲染层 `CLEF_BOT` 表 + 每小节 `bots[]`/`setClefCtx(ci)` 让 `S_BOT/S_MID`（改 let）按列生效（stepY/加线/符干方向/符杠/连线/连音号全部接入），行首谱号/调号音位=行首生效谱号（自曲首推进）；换谱号列画 3/4 小号谱号（`smg {scale:0.75}`），`measureLayout` 该列 `wB+20/cmin+20/xs+18` 让位；MusicXML 中途 `<attributes><clef>` 导出/导入（首个 clef=声部级，其后挂 `pendClef`→下一列）；入口=记号面板「谱号切换」`b-clef`→`showClefMenu`(popmenu 高/中/低/恢复)。⑤ 拍弦=框内×：`col.slap` 列音符渲染并入 ×分支（品位数字→×），`b-slap` 图标同步框内×。⑥ 右栏信息卡补齐：`ri-lyricist/composer/maker/tuning/type`(谱类·小节数) 同步，空值行隐藏；`TYPE_CN` 自谱库段前移至 `tuningLabel` 附近（renderDock 早于原声明位置执行，避免 TDZ）。新增 `tv_detail1` 7 项几何断言，27 套件全绿。

> **v45.7 细节批次2 + 联排谱号可选**（用户截图反馈跟进）：① 联排行首小节号 `cStaffT-8→-14`（高音谱号上弧顶伸到顶线上方 ~10px 会压住数字）。② 联排谱表↔TAB 间距改**像素级**：`sysMetrics` 下方净空 = 下加线深度（每谱级 3.75px，v45.6 的谱级阈值口径低估导致仍重叠）+ TAB 顶线上方装饰高度（推弦弧 24/细分泛音 17/技法字母 13，按弦位 `-(s-1)*STR_GAP` 折算）之和 + 边距；上方净空同理。③ 和弦图假横按修正：`chordDiagramSVG` 横按判定加条件 同品跨度≥3 弦距（Em/A 分指不再连杠；F/Bm/Bb 真横按保留），圆点 r 2.8→2.5。④ `b-notation` 移入 `panel-tab-notation`（组名「记谱法 · 谱号」），CSS order 规则移除。⑤ **联排谱号可选**：新字段 `song.tabClef`（undefined=treble-8vb / 'bass'=bass-8vb，永不改名删除）——联排渲染块 SBt/SMt 参数化（谱号字形/调号音位表/加线阈值 SBt±/符干方向与中线），`tn-clef-g/f` 按钮（仅联排时显示）。⑥ EB_TECHS `bd 下推弦`→`mute 哑音`（techFromBar 路由 toggleMute；下推弦=推弦回放已并入推弦弹窗类型，旧 bd 数据照常渲染）。tv_detail1 增至 11 项，27 套件全绿。

> **v45.8 细节批次3（读谱体验）**：① 行首小节号改右对齐收进左页边距、贴谱表顶线（`text-anchor="end"` x=oxH-4 y=staffT/cStaffT+2，联排 3800s 与纯五线谱 4430s 两处同口径；v45.7 只上移避让结果悬空漂移）。② **系统左端连线**：`systems.forEach` 头部按 M 度量收集本行谱行段（联排=五线谱段+TAB 段各一、TAB 段 `[tabTop, +staffH()]`、五线谱段 `[staffB-30, staffB]`（dual 延至简谱行）、简谱段 `[voxY-13, voxY+4]`），segs≥2 时在 oxH 画一条贯通竖线（单谱行不画，Gould 惯例）。③ TAB 整小节休止：`emptyTm`（无 notes/strum/perc）→ 小节中央一枚全休止（`staffRestStr(mx+w/2, ...)`），逐列休止跳过；列热区保留。tv_detail1 增至 15 项（T12 小节号入边距/T13 连线联排+弹唱/T14 居中休止 dev<10px），27 套件全绿。

> **v45.9 细节批次4**：① 连线色差根因=同位双绘——`sysConnected` 标志（systems.forEach 头部声明）：系统连线线宽统一 1，连线存在时 TAB 行首线（~4031）/联排五线谱行首线（~3877）/大谱表行首线（~4484）均不再重复绘制。② TAB 字母 `oxH-11`（页边距悬置）→ `oxH+9`（谱表内表头区，GP 惯例）。③ 用户问「五线谱与 TAB 之间的 8」——treble-8vb 移调谱号标准记号（吉他实音低记谱八度），已在更新日志向用户科普，无代码改动。tv_detail1 增至 17 项（T15 竖线恰 1 条/T16 字母 x=65），27 套件全绿。

> **v46.0 细节批次5 + 小节线多选**：① 联排谱号下「8」缀隐藏（产品拍板；记谱 +12/播放不变，`tv_engrave` P2 断言同步去 has8）。② 泛音菱形 `hw = f>=10? 13 : 7`（两位数数字宽 ~12px，原 ±7 撑不下）。③ 行首小节线热区：可见行首竖线在 oxH、热区在 mx-5（错位 STAFF_HEAD_W≈26px）→ `lmIdx===0` 时热区 `x=oxH-4, w=(mx-oxH)+9`（TAB/vox 两处）。④ **Ctrl+点击小节线多选小节**：data-bar 处理器前置 ctrlKey 分支——首点=选中该小节整声部（selRange whole），同 row/vi 再点=扩展 m1..m2 连续范围；与既有 长按=单小节 / 点击=小节线设置 并存。tv_detail1 增至 21 项，27 套件全绿。

> **v46.1 细节批次6（泛音）**：① 泛音菱形恢复固定 ±7（撤销 v46.0 的 hw=13 加宽），两位数品位改数字缩号自适应（品位数字绘制处 `hmSm = tech==='hm' && f>=10` → font 10.5→8、y 3.6→2.8、halo 2.6→2.2）。② 面板泛音类归组：EB_TECHS 的 hm 移至尾部（清除前）、glyph ◇→'N.H.'；EB_GTECH 人工泛音 hmA/hmP/hmT 三键置首；techHtml 拆 tBtn、清除按钮恒最后渲染（顺序=常规技法→N.H.→A.H/P.H/T.H→let ring/摇把→清除）。③ 泛音菱形不变量（tech==='hm' 一律画菱形，hmT 细分加字母标注）固化进 T22。tv_detail1 增至 23 项，27 套件全绿。

> **v46.2 智能页签置首 + 智能预提示方案评估**：① #rtabs 顺序 信息·库·智能 → **智能·信息·库**（AI 前置曝光；默认激活仍 info 不打断编辑流）。② 用户问「智能预提示（猜下一步操作并给建议）能否实现」——评估结论：**可行且推荐规则引擎路线（T1），无需大模型**。三档方案：T1 规则引擎 `suggestNext()` 纯函数扫 song 状态（空谱→预设/向导；有旋律无和弦→自动配和弦；有和弦无伴奏(pianoacc)→织体生成；节拍错误→一键修复；≥8小节成型→试听/导出/发布/分享卡；换调→变调夹建议…），渲染为智能页顶部「下一步」卡片，点击直达——确定/可解释/零成本/离线，一个版本可上线；T2 行为加权（复用 pyqEvent 埋点本地统计操作序列调整排序）；T3 大模型建议（需服务端代理+API费用+延迟，暂不建议——规则已覆盖高价值场景）。建议先 T1 + 埋点 sug_click 观察点击率再决定 T2。**待产品拍板后实施 T1**。tv_detail1 增至 24 项。

> **v46.3 智能预提示上线**（产品拍板：编辑内上下文提示为主、宏观建议次级）：`#rc-hints` 卡置于智能页顶部（rt-new data-rt=ai），`editHints()` 规则引擎按选中对象输出提示——优先级 barSel（小节线）> noteSel≥2（音符多选）> selRange.whole（整/多小节）> selRange（拍/片段）> sel.row tab/vox×(staff|jianpu)（音符光标）；`data-hact="rib:xxx"` 可点直达左栏图层（setRibbon）；次级段「整体建议」= 时值错误(#beat-status.bad)/空谱/有旋律无和弦/成型（宏观 T1 精简版）。`renderHints()` 挂 renderDock 尾部随每次渲染刷新；`.hb-li` 覆盖全局 button nowrap 允许换行。纯本地规则零成本。tv_detail1 T24（五上下文+直达+次级断言），25 项、27 套件全绿。

> **v46.4 右栏四页签**：① #rtabs 智能·**创作(make)**·信息·库——创作辅助+导入互操作两组 assist 卡 data-rt ai→make（setRTab 全泛型自动生效）；光标位置卡 info→ai（置预提示卡下方）；无边框形态 CSS 选择器 ai→make + #rc-hints 单列。② 宽度 236→272 / 254→292。③ 谱面两侧滚动条隐藏：#score-wrap/#left-rail/#left-flyout/#right-dock `scrollbar-width:none`+webkit 0 宽（可滚不可见），#paper overflow-x:hidden。④ syncInputs 光标卡增行：音符（弦/品/×/技法名 或 简谱音高/记号）、和弦、可改项速查（时值 Q–T·附点·三连音·品位/音高）。tv_detail1 T25/T26，27 项、27 套件全绿。

> **v46.5 启动台**：`#start-pad`（#score-wrap 内 absolute 覆盖层，`~#paper visibility:hidden` 防滚动泄底）——品牌 + 四入口卡（新建→b-new / 打开→b-open / 导入→popmenu 选 MusicXML|MIDI→向导 nw-import|nw-midi / 我的→b-library）+「继续上次编辑」链接（含当前草稿标题）。`initStartPad()` 挂 DOMContentLoaded 尾（PYQ_SHARE/?pub= 深链 return 后；?wxlogin= 回跳、viewer/stand 不出）；出现时 `closeFlyout()` 左栏收起，任一入口/`loadSong()`（首行 hideStartPad）关闭并恢复左栏。**注意**：数据零风险——底下仍照常恢复上次文档，启动台只是覆盖层；新建/打开走 v41.5 guardReplace 防覆盖确认。tv_detail1 T27/T28（新开页取启动态），29 项、27 套件全绿（loadSong 自动关台故存量套件零改动）。

> **v46.6 音符图层 + 启动台默认页**：① 顶栏「编辑」→「音符」，音符/时值/节奏三组新版外壳收纳入左栏 note 图层——editbar 加 `.eb-unit`（组标签+组+分隔线一体）`#ebu-eb-edit/-dur/-combo`；`applyShellDock` 搬 `.eb-grp` 进 `note-ops/dur/rhy-host`（**eb-dur/eb-combo 的监听挂组元素随节点迁移**，eb-edit 走 ebHandler 委托加绑 panel-note-ops）；`setRibbon` virt 加 note→三面板、renderDock visible 加 'note'、eb-clear 显示条件加 note；左轨 ltab data-t=note（SVGI 加 note 四分音符图标）。② 连音线：eb-marks 不再生成 eb-tie；TAB 记号层新增 `b-tie-t`（onclick=toggleTie，toggleTie 原生支持 tab 单选/Ctrl 跨选）；vox 沿用 b-tie。③ 启动台默认页：`startPadOn()` 全局判定——initStartPad 里 `setRTab('ai')`+清 ltab 高亮+renderHints/syncInputs；editHints 启动台态返回欢迎指引、syncInputs 光标卡置「—」；hideStartPad 恢复刷新。T23 断言更新（defOn 不再是 info）。tv_detail1 T29-T31，32 项、27 套件全绿。

> **v46.7 顶栏撤销（新版外壳界面重构收官）**：① 音符/时值/节奏拆三独立 ltab（data-t note/dur/rhy，SVGI 加 dur/rhy 图标；setRibbon virt 各开各面板、renderDock visible 同步）。② rtabs 序 智能·库·创作·信息。③ 连音 3/5/6/7 注入 `mark-body`+`vmark-body`（tupSVG 升级：符杠组+连音括线 ⌐¬+斜体数字；ebHandler 面板已委托），`#eb-marks` 自 HTML 移除、tuplet 选中态同步改全局 `[data-tup]`；b-tie-t 选中态同步补齐。④ beat-box（时值提示）shell → `.mx-bar`（b-metro 前，err-drop fixed 改右下）；classic → 回右栏。⑤ eb-zoom → 左栏 `#rail-zoom`（帮助上方，纵排 column-reverse）；classic → 回 editbar。⑥ `body.shell #editbar{display:none}` 整行移除（三组 v46.6 已迁+记号+缩放+节拍全部落位）；经典版布局零变化。tv_detail1 T32（九断言），33 项、27 套件全绿。

> **v46.8 左栏细节修正**：① 音符/时值/节奏面板排版——`#note-*-host .eb-grp` 加 `width:100%;min-width:0`（`.eb-grp` 全局 `flex:none` 按内容撑宽，曾溢出面板 355/162/169px 截断右侧按钮），组占满面板宽 flex-wrap 换行铺排。② 倚音图标出版级统一——`ornSVG` 的 grace/gracea 弃用简谱数字画法（font-size 7 的「2」图标尺寸下不可辨、细笔画与相邻 SMuFL 波音/颤音字形分量不一），重绘为 gNote（斜杠小八分符：实心椭圆符头 rx2.3+符干+符尾+斜杠）+ mNote（主音符 rx3.1+符干）+ slur（下方连线）三元件组合，前/后倚音同款元件镜像布局；`b-grace`（记号层「倚音」）经 decorateSignButtons 同源自动统一；顺带清除 ornSVG 内不可达的 up/down/tr/turn 旧手绘分支（v45.5 起已走 smIcoSVG 早退）。tv_detail1 T33（溢出≤1px+换行）/T34（结构对称+无 text 数字+b-grace 同款），35 项、27 套件全绿。

> **v46.9 新建不残留 + 倚音去重**：① 启动台四入口（new/open/imp/mine）不再在点击时 `hideStartPad()`——改由实际载入新谱时关台：`loadSong` 首行既有 + `addDoc` proceed 内补 `hideStartPad()`（向导创建/导入/哼唱路径不走 loadSong）；`cont`（继续上次编辑）仍立即关台；`showNewWizard` 状态行加 `!startPadOn()` 条件（启动台态不显示「当前曲谱《旧稿》…」，编辑态照常提示替换风险）。取消向导/关闭弹窗均回启动台，paper 全程 hidden。guardReplace 语义不变（跨会话草稿 undoStack 为空不弹询问——v41.5 既有语义，「继续上次编辑」为找回入口）。② `b-grace` 单独倚音钮移除（与装饰组 ornFromBar('grace') 完全重复）：HTML 钮/decorateSignButtons MAP/onclick 三处删除，syncInputs 选中态改同步 `[data-orn="grace"]`/`[data-orn="gracea"]`（col.grace/graceA），简谱 hint 文案改「倚音在装饰组」。tv_detail1 T28 改写（留台+无旧稿行+paper 隐藏）/T35 新增（取消回台+创建全新+关台）/T34 扩展（钮移除+装饰组选中态），36 项、27 套件全绿。

> **v47.0 纯 TAB 行首拍号重叠修复**：根因两处同源假设「有拍号必有五线谱表头」——① `staffHeadGeom` 纯 TAB＋简谱（弹唱/uku）返回 w:0 → ox===oxH，TAB 字母(oxH+9,v45.9 入表头)与拍号(ox+8)同位重叠；现纯 TAB 保留 w:26 最小表头区。② `measureLayout` 的 `needTS`（首小节/变拍 tsLead 17px 预留）只认 staff/tabStaff；现加 `(song.tabVoices||[]).length>0`，拍号与首列间距 ≥8px（实测 19px）。③ 顺带补齐变拍子：TAB 小节循环加 meterChanged 画新拍号（mx+8，与五线谱 4069 同口径，vi===0），首行拍号改 `meaMeter(sys.measures[0].mi)`（此前纯 TAB 变拍完全不可见/首小节覆盖拍号不生效）。sweep 排查 vocal/instr(高低音)/teach/piano/pianoacc/func/双TAB/五线谱唱名弹唱 行首区无同类重叠。tv_detail1 T36（guitar+uku 不重叠+gap≥8+变拍 TAB 可见），37 项、27 套件全绿。

> **v47.1 音符快捷浮条 + 习惯学习**：① `#quickbar` 浮条（popmenu 样式独立 id）——`showQuickbar(cx,cy)` 挂 #score pointerdown 普通音符路径（歌词/和弦/扫弦区走各自流程；viewer/启动台不弹），全局 window pointerdown capture 点外即关（与 popmenu 同法，score 点击先关后重开）；按钮组：dur:4/8/16+dot 通用，tab 语境+技法×3+tie，vox 语境+acc:#/b+oct:±+tie；`syncQuickbar()` 同步 on 态；「…」openFlyout 对应层，「✕」写 `musetab-quickbar=off`（智能卡 qbon 项重开）。② 习惯学习（新 localStorage 键 `musetab-habits`，纯本地）——`habit(act)` 记频次 n 与转移 t（上一动作>下一动作），条目>240 全表减半淘汰；接入 10 个动作函数入口（setDur/toggleDot/toggleAcc/bumpOct/toggleTie/techFromBar/ornFromBar/applyTuplet/applyDurCombo/applyGtech，try 包裹零风险）；`habitTop(prefix)` 重排浮条技法槽（冷启动默认 b/h/p），`habitNext()` 转移预判（≥2 次）→ 浮条 `.qb-guess` 猜测钮（预判已在条上则点亮该钮）+ 智能卡置顶「猜你想做」（data-hact qb:act → `habitDo` 分发执行）。动作键命名空间 dur:/dot/tie/acc:/oct:/tech:/gtech:/orn:/tup:/combo，`habitLabel/habitApplicable` 出中文标签与语境过滤。tv_detail1 T37（弹出/生效/重排/预判/关重开/简谱语境十断言），38 项、27 套件全绿。

> **v47.2 简谱行首线合一 + 节奏铺开**：① 简谱行行首独立起始线移除——vox 非 staff 分支原无条件在 ox 画 [voxY-13,voxY+4] 竖线（多行谱与 oxH 连体线成双线；v45.9 只处理了 staff 行的 oxH 同位双绘，jianpu 的 ox 线是另一条）：现整段删除——多行谱由系统连体线（oxH）充当开头小节线，单行歌谱 GB 惯例行首直接起谱；行间/行尾小节线不变。② eb-combo 全量生成 7 组合，`i>=4` 标 `.combo-extra`；CSS：`#eb-combo .combo-extra{display:none}`（经典版顶栏 4+更多+库 不变）、`#note-rhy-host` 内 extra 显示且 eb-more/eb-lib 隐藏。③ `panel-note-rhylib` 独立卡（b-rhylib→showPatternLib(按 sel.row)），setRibbon rhy virt 加入。tv_detail1 T38（弹唱/单行/合唱行首线口径+面板铺开+经典紧凑），39 项、27 套件全绿。

> **v47.3 顶部编辑行回归（撤 v46.6/46.7 收纳）**：产品拍板音符/时值/节奏/时值提示/缩放回顶栏——① CSS 删 `body.shell #editbar{display:none}`；applyShellDock：NOTE_MV 三组恒回 ebu 单元、eb-zoom 恒在 editbar、beat-box shell→editbar（缩放左侧）/classic→右栏；rail-zoom 弃用（display:none）；err-drop shell 定位改 top:108px。② 左栏 note/dur/rhy 三 ltab 撤下（HTML 删+renderDock visible 去三项）；panel-note-* 面板保留但不再展示。③ 节奏铺开延续：`body.shell #editbar .combo-extra{display:inline-flex}`+eb-more 隐藏+组合钮 span 隐藏（名称进 title）+comboSVG 24×16 收窄——1280 视口单行 maxRight 1270 不溢出（editbar 本设计 nowrap+overflow-x:auto，窄屏滚动兜底）；eb-lib 维持 v40.8 去重（shell 库入口=右栏库页签）；经典版 4+更多+库 不变。④ 连音/连音线仍留谱类记号层（v46.6/46.7 该部分不撤）。tv_detail1 T29/T32/T33/T38 改写（39 项），27 套件全绿。

> **v47.4 顶栏节奏「更多」拍号组合**：① `DUR_COMBOS_X`（与 DUR_COMBOS 同构 {name,durs:[[d,dotted]]}）两组：二拍组合（2/4 整小节·4/4 半小节，7 项含大切分 [[8],[4],[8]]）、三拍/复合拍（3/4 整小节·6/8 一大拍，9 项含附点二分/附点四分/八分×3）；同走 `applyDurCombo`（comboBeatsOf 按 meaMeter(mi).unit 折算——6/8 里附点四分=3 个八分拍，变拍子小节适用）。② `showComboMenu` 分组渲染（单拍细分/二拍/三拍·复合拍三段 .t 标题）+ 扁平索引 flat[]（data-ec2 统一分发）。③ `comboSVG` 升级：主梁只跨 dur≥8 连续段（孤立八分画短杠），d===4 实心椭圆符头、d≤2 空心符头、符头系附点点在符头旁（原实现对四分/二分也画通杠，出版口径错误）。④ 顶栏恢复「更多▾」（撤 v47.3 的 shell 隐藏；.dg 文字 11.5px、min-width:0）；宽度重校平：combo 图示 20×15、beat-status max-width:126px 截断（完整信息在下拉），1280 视口 maxRight 1270 单行不溢出。tv_detail1 T33/T38 断言翻转（moreVis）+T39（分组存在+23 钮+6/8 附点四分→八分×3 应用），40 项、27 套件全绿。

> **v47.5 编辑更名 + 音符输入组 + 撤销重做下移**：① `ebu-eb-edit` 标签「音符」→「编辑」，eb-octup/eb-octdn 移出；② 新 `ebu-eb-note`「音符」输入组：`.nd` 数字钮 0-9 + 高/低八度——`inputDigit(k)` 统一入口（自键盘 keydown 数字分支提取：tab=setFret+pending 700ms 两位合成 ≤24、vox=setDeg 0-7），ebHandler 加 `[data-nd]` 分发；syncInputs 按 sel.row 切换显隐（tab：0-9 显示、八度隐藏；vox：8/9 隐藏、八度显示）与 title 文案；③ `#seg-undo`（页头撤销/重做 span 加 id）applyShellDock 搬移：shell → editbar `ebu-eb-combo` 之后、classic → 页头 file-in 前原位；④ 上栏布局：`body.shell #editbar{flex-wrap:wrap;overflow-x:visible}`（内容超宽自动换行，替代横向滚动）+ beat-box `margin-left:auto`（换行后右靠齐）；.nd 窄身 21px。tv_detail1 T29 label 改「编辑」+T40（十断言：上下文切换/12 品连点/音级/休止/undo 双外壳位置），41 项、27 套件全绿。

> **v47.6 音符输入组三态 + 节奏型库上栏**：#eb-note 由 v47.5 的两态扩为三态，syncInputs 内统一切换（isTab / isSt=isStaffNota(voxNotations[sel.vi]) / 简谱）。① **TAB**：新增 `#eb-mute-n`（→ toggleMute，n.x 选中态同步）与 `#eb-fret-more`（→ 新函数 `showFretMenu(cx,cy)`：0–24 品位网格 popmenu，当前弦品位高亮，另含 ×闷音/清除本弦音；**显式点选时清空 pending 不参与 700ms 两位合成**）——0-9 内联 + 网格全量，兼顾宽度预算（实测各组 编辑316/音符351/时值256/节奏408/undo70，1920 单行、1440 起换行）。② **五线谱**：不新增按钮，复用 .nd 1-7 **改标签为音名** `'CDEFGAB'[(K.Li+k-1)%7]`（K=staffKeyInfo()）——点击仍走 setDeg(k)，**数据模型 deg 首调音级零改动**，换调只换标签不改数据（该映射与 staffStep=step0+(deg-1)+oct*7 天然自洽，无需反算）；补 `#eb-acc-s/f/n` → toggleAcc('#'/'b'/'n')，acc 选中态同步。③ .nd 选中态：TAB 按当前弦 f 命中、简谱/五线谱按 col.deg 命中；组内 flex order 按语境重排（TAB 0-9 自然序，0＝空弦居首；简谱/五线谱 1-7 在前、0 殿后；尾部功能钮显式 order 20+ 防 order:0 插队）。④ `body.shell #editbar #eb-lib` 由 display:none 改 inline-flex（撤 v40.8 去重，产品要求回上栏，位于 #eb-combo 末尾＝节奏组后；右栏「库」页签保留）。新函数名 showFretMenu 已按 v37.2 教训先 grep 确认无冲突。tv_detail1 T41（三态显隐/25 品位网格/17 品写入/×选中态/D大调 DEFGABC 与 C大调 CDEFGAB/♯生效/库入栏 十一断言），42 项、27 套件全绿。

> **v47.7 音符录入缺陷修复（设计工作流复核 → 逐条实测复现后修）**：v47.6 上线后跑了一个 4-agent 设计工作流（五线谱刻版师 / 六线谱制谱师 / UI 约束 / 综合裁决）复核方案，它反查出 6 处缺陷，**每条都先写脚本实测复现、确认为真才动手**（另有若干建议未采纳，见文末）。① `toggleMute` 往返丢品位：原实现打 × 时 `n.f=0`，取消后 f 停在 0——「7品→×→×」静默变空弦；改为暂存 `n.xf` 并在取消时回填（**xf 纯增量字段，渲染/播放/MusicXML 均不读**）。v47.6 把 × 提到顶栏使该路径一键可达，故列为最高优先。② **五线谱变音语义错**：五线谱渲染走 `accCarry(accSt, Lt, keyAlt+accSemi(acc), keyAlt)`，而 `accSemi('n')===0` → `acc='n'` 与 `acc=''` 目标 alt 相同 → **♮ 在五线谱是空转按钮**（实测 innerHTML 完全一致）；且 `toggleAcc('#')` 的 `#→x` 循环在升号调造出目标 alt=3，`accCarry` 无 3 分支被兜底成 `'♭♭'`（**画重降却发声升号**）。新增 `stAltCtx/stAccWrite/accBump(dir)/accNat()`：五线谱按「目标 alt」记谱并反解 acc 符号、钳在 `[-2,2] ∩ keyAlt±2`；**简谱仍委托 toggleAcc，行为逐位不变**（测得 ''→#→x、n 循环原样）。顶栏 ♯♭♮、左栏 b-sharp/b-flat/b-natural、键盘 #/b **三处入口统一改走新路由**，避免同一记号两种行为。③ `ArrowUp/ArrowDown` 未清 `pending.digits`（moveCol/switchRow/pointerdown 三处都清了）→ 键盘「1→↓→2」在新弦写出 **12 品**；两个 case 补清并把硬编码 6 改 `strN()`。④ `clampSel` 弦号硬编码 6 → 尤克里里可把光标推到 5/6 弦写出四线谱外幽灵音符；改 `strN()`。⑤ 新增 `fretMaxOf()`（uku 15 / 其余 24，`song.fretMax` 可覆盖，纯增量）并给 `setFret` 加范围守卫（此前 `setFret(99)` 直接写脏）、两位合成上限与品位网格长度同源。⑥ 主 keydown 补 `Escape → closePop()`（此前弹窗开着时数字键仍直写音符，双通道并发）。⑦ 品位网格改 6 列栅格（12 品落行首＝八度位）。**未采纳**：就近八度落音（会改变「光标就地改写」既有模型，且简谱同款行为已沿用多版，属产品决策非缺陷）；0 钮改休止字形、8ᵛᵃ→8↑ relabel（纯观感，留待产品拍板）。tv_detail1 T42（八断言，含简谱零回归对照），43 项、27 套件全绿。

> **v48.2 六线谱自动前进 + 信息栏版本号**：把 v48.0 的落音前进推广到 TAB 行。难点是两位品位靠 `pending.digits` 700ms 合成、即刻前进会把 1、2 拆到相邻两列——解法是复用 `lastEnt{col,pos,at}`：第二位数字命中 `atLanding()` 时把光标临时移回 `lastEnt.pos` 改写该列再复位（跨小节也准），并在 `markEntered()` 后恢复 `pending`（`moveCol` 会清 `pending.digits`，不恢复则合成窗口被前进打断）。`modCol()` 的「空列」判定按谱类分流（TAB 看 notes/strum/perc，简谱看 deg）；`toggleMute` 改用 `modCol()` 的列（原先 `mutate` 里重取 `curCol()`，自动前进后会在空列凭空造出 `×0`）；`toggleDot` 拆出 `toggleDotCore()` 并加同款「临时移回光标」包装——其「附点＋半时值邻音」联动全靠 `sel.ci` 索引，改索引易错。
>
> **已知取舍**：TAB 同列多弦（和弦叠音）由「换弦直接输」变为「← 退回再换弦输」。两种意图（叠和弦 vs 旋律换弦继续）在换弦这一步无法区分，选了错得更显眼的一侧（音落到下一列一眼可见，而自动叠音会静默生成双音错谱）。tv_detail1 T42 ⑤ 已按新语义重写，并新增叠音路径回归；「换弦断开两位合成（不得出现 12 品）」这条核心性质保持不变。
>
> 信息栏：新增 `APP_VER` 常量 + `#rc-ver`，显示在右栏「信息」页「更新日志」下方。**发版时须与更新日志首条 `<li>` 一起递增。**

> **v48.1 品位钮固定 0–9**：产品负责人定调「品位编辑固定只显示 0123456789，后面的收起」。`fretInlineCap()` 由「按上栏余量动态算」简化为 `Math.min(9, fretMaxOf())` —— v47.8 的动态铺开在实测中几乎从不生效（1600 视口下其余各组占约 1300px，本组仅剩约 170px≈6 个钮位），却让按钮个数随窗口宽度浮动、位置不固定，破坏肌肉记忆。保留函数形态而非写死常量，是因为 uku（`fretMax=15`）等仍需按乐器上限收敛，且 `syncInputs` 调用点不变。连带移除 v47.8 为此加的 `resize→syncInputs` 去抖监听（折叠量已与宽度无关，属死代码）。实测 1100/1280/1600/1920 四档宽度与弹唱/独奏/尤克里里均稳定输出 `0–9 + 10–24▾ + ×分解`，无溢出。

> **v48.0 落音即刻前进（改掉 v47.9 的延迟式）+ 吉他「品位」组展示修正**：产品负责人反馈「音符录入不自动前进，问题没解决」——v47.9 的延迟前进虽然把按键数从 2.0× 降到 1.0×，但**光标视觉上停在原地**，用户看到的就是没前进。改为 `setDeg` 后立即 `moveCol(1)`，并用 `lastEnt{col,at}` 记下「刚落的音 + 前进后的光标快照」；新增 `modCol()`：当前列为空且光标恰在 `lastEnt.at` 时返回 `lastEnt.col`，供 `toggleAcc` / `stAltCtx` / `bumpOct` 使用，使「先落音、再点升降号/附点/八度」仍作用于刚录的音（否则会把 `acc` 写到前进后的空列，谱面画出 ♯ 配 0 的错谱——v47.9 已实测过该坑）。`syncInputs` 里变音钮高亮同步改读 `modCol()`，否则会出现「写进去了但按钮不亮」。谱面 pointerdown 清 `lastEnt`。吉他谱展示三修：组标签 isTab 时「音符」→「品位」；`eb-fret-more` 标签由固定「0–24▾」改为动态 `(cap+1)–max▾`（与已铺开的 0–9 不再重复）；`eb-mute-n` 补 `.dn`「分解」并加 `body.shell #editbar #eb-mute-n .dn{display:inline}`（该组 `.dn` 默认被隐藏，只有 `#eb-edit` 例外）。

> **v47.9 录入流程两处硬伤修复（九谱类全流程 UI 实测查出）**：本轮改为**全程点真实界面**走完九谱类的「向导建谱→逐音录入→歌词→和弦→专属记号→版式→校对→导出」，并叠加几何断言（bbox 相交/出血/拍长）。抓出两处此前所有数据层测试都测不到的缺陷。① **歌词串字**：`i-lyric` 的 Enter 分支只做 `moveCol(1)`+`focus()` 不清框，而 `render()` 的回填带 `document.activeElement!==lyr` 守卫、因焦点仍在框内被跳过，`input` 事件又把**整框内容**写进 `col.lyrics[activeLyr]` —— 连打「好/一/朵/美」写成「好/好一/好一朵/好一朵美」，多字词还把谱面挤出 2 处文本重叠。修法：Enter 前进后按目标列显式回填。**简谱歌谱/教学对照谱/吉他弹唱谱三类同修**。② **落音不前进**：`setDeg()` 只写值，`moveCol(1)` 仅绑 →，实测录 16 音需 32 次按键（5 个简谱/五线谱类一致 2.0×）。修法采用**延迟前进**（`advFrom` 锚点）：光标停在刚落的音上，下次落音时才前移。——之所以不用「落音即刻前进」，是因为实测发现那会让简谱习惯的「先落音、再点升号」把 `acc` 写到下一个空列，谱面画出 **♯ 配 0 的错谱**（五线谱路径本就有 `!x.c.deg` 守卫，简谱路径没有）。延迟式两种工作流都对。谱面点选会清锚点（改已有音就地生效）；开关 `musetab-autoadv`（默认开，右栏「智能」页切换）；**六线谱分支不动**——两位品位靠 `pending.digits` 700ms 合成，前进会打断。③ 智能提示按实际行为改写：旧文案「选中音符后直接打字即可填入歌词」实测无效（键盘路由无可打印字符→歌词处理，必须先 Enter）。

> **v47.8 音符组三谱类彻底分化 + 节奏型库按谱类路由**：① 简谱：1-7 提示改「简谱音名」口径，0=休止，八度不变。② 吉他：HTML 补 `.nd.ndf` 品位钮 10–24；新增 `fretInlineCap()` 按上栏本行余量算内联上限（`余量 = editbar.clientWidth − 其余单元实测宽 − 128 固定开销`，**跳过 `.grow` 弹性占位**——否则「展开→grow 收缩→余量变小」形成抖动回环，实测 1920 下会在 14/18 间摆动），放不下的收进「0–24▾」（该钮仅 `cap<fretMaxOf()` 时显示）；`window.resize` 去抖 120ms 重算。实测 1280/1600→0-9、1920→0-18、2400→0-24 全铺开且 `maxRight ≤ innerWidth`，连算 3 次 cap 恒定。**功能钮 order 由 20+ 提到 40+**：品位 order=k 最大到 24，旧值会让 × 插进 21 与 22 之间（截图复核发现）。× 文案改「分解标记」（产品口径：分解和弦中的 × 记号，非闷音；`n.x` 数据与四入口共用函数均不变）。③ 五线谱：休止钮改出 SMuFL 字形并随 `col.dur` 切换（新增 `STAFF_REST_G`：restWhole/Half/Quarter/8th/16th/32nd），`data-nd="0"` 与键盘 0→`setDeg(0)` 路径不变。④ 新增 `openRhyLib()`（已 grep 无同名）：五线谱声部 → 伴奏织体（钢琴节奏型），其余 → 原 showPatternLib；库钮文案/tooltip 随语境切换；`b-acctex` 守卫由 `!song.pianoAcc` 放宽为 `!song.pianoAcc && voxVoices<2`（钢琴独奏谱等大谱表同样适用 genAccompaniment，此前静默 return）；单谱表五线谱提示「需要大谱表双手声部」并退回节奏型库。tv_detail1 T43（五组断言）+ T41 随休止字形更新，44 项、27 套件全绿。
