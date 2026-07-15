# Veazen 项目总交接书（宏观计划 · 进度 · 技术逻辑）

> **本文档的使命**：任何新团队或新的 Claude Code 账号，读完本文即可
> 完整接手并继续开发本项目。
> **维护纪律**：每完成一个交付批次，必须同步更新本文档的
> 「三、进度总账」与「六、当前状态与下一步」（写入 CLAUDE.md 工作约定）。
> 最后更新：2026-07-13（P1 收款闭环交付后）

---

## 一、项目一页纸

**Veazen = 面向中小品牌的商品防伪验证 SaaS。**
消费者扫码/刮码验证真伪；品牌方通过控制台管理产品、批次、防伪码、
退货核验与团队；另有 WordPress/WooCommerce 插件让商家在自己店铺
后台一键接入。

- **商业定位**（PD-005 行业调研确认）：填补"企业级能力 × 自助订阅
  价格 × 电商平台原生分发"的市场真空带。巨头（Scantrust 等年费数万
  美元）下不来，廉价 QR 工具上不去。
- **滩头市场**：美国膳食补剂/功能食品 DTC 品牌 × WooCommerce；
  第二波欧盟纺织/美妆 DPP 合规潮。
- **技术路线**：QR + 云端 Ed25519 签名 + 一次性刮码 + 行为风控
  ——大众商品防伪的成本/强度/摩擦最优组合（行业报告验证）。
- **主体**：VEAZEN LLC（美国）；仓库 `veazen/Veazen-Code`（私有，
  旧地址 veazen/veazen 自动跳转）。

## 二、宏观计划（路线图与触发条件）

### 已完成的大阶段
| 阶段 | 内容 |
|---|---|
| Phase 0 | Monorepo 脚手架 + CI + 文档体系 |
| Phase 1 | 核心引擎：数据库 RLS、双认证、码生成（BullMQ）、公开验证+刮码状态机、风控、Webhook、审计、Merkle 摘要（e2e + 500rps 压测过） |
| Phase 2 | 消费者验证页（三态/GS1/Lite）、官网+waitlist、控制台五页面 |
| Phase 3 | WP 插件全套（凭据加密、产品同步、批次申请、订单绑定、前台组件、i18n） |
| Phase 4a | 生产化：S3/R2 驱动、Dockerfile、boot 迁移、部署手册、生产加固 |
| 生产上线 | 2026-07-12 全量上线（官网/API/验证页三域名）+ 演示商店实弹演习五项全过 |
| SME 第一批 | M2+M3 退货全流程（已用户验收关闭） |
| 企业版 E1 | 权限体系+团队邀请+仓库账号+摄像头扫码 |
| P1 | 收款闭环：档位闸门 + Lemon Squeezy 订阅（默认关闸） |

### 待办路线（优先级 + 触发条件）
| 批次 | 内容 | 工期 | 触发条件 |
|---|---|---|---|
| **P0 容灾** | 每日备份→R2 + 恢复演练 + 备份桶加固 | 1 天 | 老板批示（方案已备：RESILIENCE_DR_PLAN） |
| **S1 行业化包** | 批次有效期/生产日期字段 + 溯源页 COA 模块 + /supplements 落地页 | 1 周 | 老板批示（建议插队 E2/E3 前） |
| E2 码段工坊 | 管理员自定义生成 + BYO CSV 上传（M1a/M1b/M1c） | 2.5 周 | 首个意向客户 |
| E3 分销管理 | 分销商层级、渠道分配、窜货逐件定位 | 2 周 | 可与 E2 换序，等批示 |
| E4 产品批量导入 | CSV 导入产品库 | 3 天 | 搭车任一批次 |
| E5 自定义域名 | 品牌自有验证域名+落地页（白标） | 1.5 周 | 首个白标客户 |
| E6 PWA | 控制台/退货台可安装到手机主屏 | 1 周 | 随时 |
| P1b 开闸 | LS 账号就绪后配置六变量+演示租户升档+BILLING_ENFORCEMENT=on | 半天 | LS KYC 通过（当前受阻，见 HUMAN_TODO） |
| 插件上架 | WordPress.org 目录提交 | 2 天 | WP.org 账号批复（申请中） |

**12 个月商业目标**（PD-005）：WP.org 装机 3,000+ 评分≥4.7、付费
150+（补剂/食品占 60%+）、行业案例 2 个、《假货观察》2 期、MRR $8-15k。

## 三、进度总账（时间线）

- **2026-07-11**：Phase 0~4a 开发完成
- **2026-07-12**：仓库转入 veazen 组织并改名私有化；官网 LOGO +
  Cloudflare Workers 自动部署；**生产全量上线**（Neon/Railway/R2/
  Resend/MaxMind/UptimeRobot）；生产事故排除：Neon 弱密码拒绝、
  P3009、nodemailer 缺失、PORT 不匹配、DNS 橙云挡验证
- **2026-07-13（密集日）**：
  - 演示商店实弹演习五项全过；告警邮件改 Resend HTTP API + 中文化
  - SME 第一批（M2+M3 退货全流程）交付并验收关闭
  - 官网中英双语；插件简体中文 107 条
  - Upstash 配额事故 → Redis 迁 Railway 内网
  - E1（权限+邀请+仓库账号+摄像头扫码）交付
  - 生产事故：Railway 内网 Redis IPv6 解析失败 → 韧性加固全面落地
    （family:0、限流 fail-open、启动不阻塞、tryQueueAdd 限时入队）
  - Settings 加载缺陷修复（allSettled + 错误可见 + Retry）
  - PD-005 行业调研归档；商业化闭环规划（MONETIZATION_PLAN）
  - **P1 收款闭环交付**（LS 集成，默认关闸）；LS KYC 受阻（PMB 地址）
  - 容灾预案成文（RESILIENCE_DR_PLAN，P0 待批示）
- **2026-07-14~15（批次 R 指令执行）**：
  - 老板发布批次 R 指令（归档 docs/DIRECTIVE_BATCH_R_zh.md）：韧性/
    不变量/计费补完/**功能冻结令**（E2~E6 及一切新构想等首个付费客户）
  - A1 容灾自动化上线：每日加密备份→R2 + 一键恢复演练两个 GitHub
    Actions 工作流（待用户配置六个 Secrets 后生效）
  - A2 交付：ADR-012「消费者验证路径永不受计费状态影响」+ §1.11 +
    e2e 红-绿验证锁死（verify-billing-invariant）
  - A3 交付：生成幂等化（中断产物整批丢弃重生成，护住刮码明文唯一性）、
    卡死批次补偿扫描（15 分钟阈值→重新入队→3 次仍卡置 failed）、
    控制台失败批次「重试」按钮、Redis 持久化启动诊断日志；
    batches 新增 failed 状态与 generation_attempts 列
  - A4 交付：ADR-007 修订（刮码 HMAC+pepper 论证；核查确认 pepper 由
    MASTER_KEY 派生永不入库——合规无缺陷）
  - 批次 D：两份行业调研归档（PLAYBOOKS/ECOSYSTEM，非执行规格）；
    PROJECT_PLAN 校准为「原始规格+§12 Backlog」新版
  - **B1 S1 补剂行业化包交付**：批次 lot_code/mfg_date/expiry_date
    字段（API+控制台+插件表单+五语验证页模块，过期明示）、批次级
    COA 质检报告（PDF 魔数校验+10MB 上限+签名下载链，验证页展示）、
    官网 /supplements 行业落地页（EN+zh）；演示商店验收步骤见
    docs/S1_SUPPLEMENTS_PACK_zh.md
  - **B2 码包交付**：code_packs 表（RLS+ls_order_id 幂等）、订阅额度
    用尽后 FIFO 扣码包（扣减在批次 ready 事务内，失败批次天然不扣，
    与 A3 自洽）、402 附购买引导 purchase_options（占位价：1 万码
    $60/10 万码 $400，前 10 客户反馈后定稿）、LS order_created
    webhook、Settings 显示码包余额；两个新可选 env：
    LEMONSQUEEZY_VARIANT_PACK_MAP / LEMONSQUEEZY_PACK_CHECKOUT_URLS
  - API e2e 增至 **72 项**（9 套件）；批次 R 代码部分全部收官，
    余 A5（等用户跑 Neon SQL）与 A1 配置（等用户配 Secrets）

## 四、技术实现逻辑（核心）

### 4.1 仓库结构（Turborepo monorepo，主代码在 `veazen/` 子目录）
```
veazen/
  apps/api        NestJS 10 + Prisma + PostgreSQL(RLS) + BullMQ + Redis
  apps/web        Next.js 14（消费者验证页 i18n×5 + 品牌控制台）
  apps/marketing  Astro 静态官网（EN + /zh/，waitlist 表单）
  apps/wp-plugin  WordPress 插件（PHP，WPCS 0 错误，zh_CN 翻译）
  packages/crypto 信封加密、Ed25519 签名、Merkle、序列号生成
  packages/shared 共享类型
  infra/          Dockerfile×2、deploy-boot（启动自动迁移）
  docs/           全部计划/手册/决策文档（见 4.6 文档地图）
.github/workflows/veazen-ci.yml   CI（node 检查前必须 prisma generate）
```

### 4.2 核心数据流
1. **码生成**：控制台/插件 → `POST /batches` → PlanGate 配额闸门 →
   BullMQ generation worker → 序列号（32 进制，熵值 ≥64 位硬约束）
   + 刮码（仅 bulk 批次；明文仅出现在导出 CSV，库内只存加盐哈希）
   → CSV 上传 R2 → `batch.ready` webhook
2. **公开验证**：`GET /verify/:serial` → 限流（Redis 故障时 fail-open）
   → 状态机判定（active/verified/flagged/retired/refurbished + Lite
   首扫锁定）→ **scan_event 先落库**（权威记录）→ tryQueueAdd 风控
   任务（2s 限时，尽力而为）→ 返回三态结果 + 品牌配置
3. **刮码核销**：`POST /verify/:serial/scratch` → HMAC 比对 → 一次性
   verified；二次提交 = already_verified → critical 告警 + 邮件
   （仅 critical 发信）+ webhook
4. **风控**：risk worker 规则集 = duplicate_scratch(critical) /
   geo_velocity / out_of_market / lite_duplicate_scan(不同设备指纹) /
   release_abuse；RMA 登记后抑制 geo_velocity 误报
5. **退货（M2/M3）**：`/codes/:serial/rma|release|relabel` →
   retired/refurbished 状态、replaced_by 换标链、release_count 计数；
   控制台 /dashboard/returns 核验台（摄像头扫码：BarcodeDetector →
   jsqr 兜底）；租户策略 rma_display_policy（全新/官方翻新）
6. **计费（P1）**：`billing/plans.ts` 四档矩阵（单一来源）→
   PlanGateService 五处闸门（批次/webhook/码段档案/退货/邀请），
   `BILLING_ENFORCEMENT` 默认 off；LS webhook（原始体 HMAC 验签+
   恒时比较+幂等+审计）驱动订阅生命周期升降档

### 4.3 安全设计（红线，不可退让）
- **RLS 租户隔离**：数据库层强制（app 角色 + `app.tenant_id` 会话
  变量），非应用层约定；`withTenant`/`asSystem` 是唯一访问模式
- **只增日志**：scan_events/audit_logs 对 app 角色无 UPDATE/DELETE；
  Merkle 每日摘要链提供防篡改证据（差异化卖点）
- **信封加密**：租户签名私钥用 MASTER_KEY 派生密钥加密；刮码明文
  永不入库、永不二次导出（仅生成时的 CSV 出现一次）
- **权限 fail-closed**：RolesGuard 未标注接口默认按写权限收敛；
  未知档位字符串按 free 处理；API key 通道不受角色矩阵影响
- **释放不重置**：释放只回到"已激活待首扫"且全程留痕，绝不提供
  "重置为从未验证"
- **邀请令牌**：只存 sha256、7 天有效、一次性、错误响应不泄露原因
- **韧性决策**：限流 fail-open（可用性优先，防滥用非认证）；
  权限 fail-closed（安全优先）——两者方向相反是有意为之

### 4.4 生产环境拓扑
```
veazen.app          Cloudflare Workers Builds（推 main 自动部署官网）
api.veazen.app      Railway（PORT=4000 显式）
                    ├─ Neon Postgres 直连串（无 -pooler）
                    ├─ Railway 内网 Redis（redis://…railway.internal
                    │   单 s；ioredis 必须 family:0——内网仅 IPv6）
                    ├─ Cloudflare R2（S3 兼容驱动）
                    ├─ Resend HTTP API（Railway 封出站 SMTP 端口）
                    └─ MaxMind GeoLite2 + ANONYMIZE_IP=true
verify.veazen.app   Railway Next.js standalone（PORT=3000 显式）
DNS                 api/verify 两条 CNAME 灰云（DNS only）——橙云会挡
                    Railway 域名验证；UptimeRobot 探测 health 5min
演示商店             EasyWP + WooCommerce + 本插件（实弹演习基地）
```
部署踩坑全录见 `HUMAN_TODO.md` 备忘与 `docs/DEPLOY_GUIDE_zh.md`。

### 4.5 本地开发与验收纪律
- 本地依赖：Postgres 16 + Redis；**一律 127.0.0.1**（localhost 走
  IPv6 会失败）；服务可能被沙箱杀掉，重启：`pg_ctlcluster 16 main
  start; redis-server --daemonize yes`（本地 Redis 关持久化）
- 迁移用 owner 串 `postgres://veazen:veazen@127.0.0.1:5432/veazen`；
  跑应用/测试用 app 串（veazen_app）；**每次迁移后必须**
  `node apps/api/scripts/pin-dev-app-role.mjs`
- 迁移内禁止弱密码角色 DDL（Neon 在 COMMIT 时拒绝，事务内 catch
  不住——已踩过两次）
- **验收三件套（每批必过才算完成）**：
  1. `npx turbo run lint typecheck test --filter='!@veazen/wp-plugin' --force` → 17/17
  2. api e2e：`cd apps/api && DATABASE_URL=<app串> REDIS_URL=redis://127.0.0.1:6379 npm run test:e2e` → 当前 46/46
  3. Playwright：先 `turbo run build --filter=@veazen/api --filter=@veazen/web`，再 `cd apps/web && DATABASE_URL=<app串> npx playwright test` → 当前 5/5
- 提交：conventional commits（feat:/fix:/docs:/test:），正文可中文；
  CI 绿了才算交付；大特性用隔离 worktree 子代理开发→主会话审查
  安全代码→cherry-pick→全量复测→推送
- **沟通约定：用户是编程新手，一切沟通用中文、通俗语言、按钮级步骤**

### 4.6 文档地图（谁管什么）
| 文档 | 职责 |
|---|---|
| `/CLAUDE.md`（仓库根） | 工作记忆：项目状态、待办、约定（每批更新） |
| `docs/PROJECT_HANDOVER_zh.md` | **本文档**：总交接书（每批更新） |
| `PROJECT_PLAN.md` | 原始规格 + §12 前瞻 Backlog（状态真相源是本交接书；偏离以 ADR 为准） |
| `docs/ARCHITECTURE.md` | 架构与 ADR |
| `docs/PRODUCT_DECISIONS_zh.md` | PD-001~005 产品决策档案 |
| `docs/DIRECTIVE_BATCH_R_zh.md` | 老板批次 R 指令（韧性/不变量/计费补完/功能冻结） |
| `docs/INDUSTRY_PLAYBOOKS_zh.md` | **行业知识/战略参考（非执行规格）**：码角色模型 R1-R5、六大行业 Playbook、行业预设规格、销售话术 |
| `docs/PLATFORM_ECOSYSTEM_ANALYSIS_zh.md` | **行业知识/战略参考（非执行规格）**：WooCommerce/Shopify/中国大陆生态分析、Shopify 技术清单、中国跨境卖家客群 |
| `docs/SME_SUITE_PLAN_zh.md` | 中小企业套件方案与交付记录 |
| `docs/MONETIZATION_PLAN_zh.md` | 商业化闭环 + P1 交付记录 |
| `docs/BILLING_SETUP_zh.md` | LS 配置保姆手册（KYC 过后用） |
| `docs/RESILIENCE_DR_PLAN_zh.md` | 容灾预案 + 事故手册 |
| `docs/DEPLOY_GUIDE_zh.md` + PART2 | 云端部署手册 |
| `docs/DEMO_STORE_GUIDE_zh.md` | 演示商店搭建手册 |
| `docs/INDUSTRY_DEEP_DIVE_zh.md` | 行业深度调研（老板提供） |
| `docs/GLOBAL_I18N_PLAN_zh.md` / `DIAGRAMS_zh.md` | 多语言计划 / 三张逻辑图 |
| `HUMAN_TODO.md` | 用户人工步骤唯一权威清单 |

## 五、账号与密钥清单（只列名称与位置，绝不写值）

| 服务 | 用途 | 备注 |
|---|---|---|
| GitHub org `veazen` | 仓库 Veazen-Code + CI | Claude GitHub App 已授权 |
| Cloudflare | 域名 veazen.app、Workers（官网）、R2 | DNS 灰云纪律见 4.4 |
| Neon | 生产 Postgres | 直连串；免费档 PITR 窗口短（见容灾预案） |
| Railway | api + web + Redis | 变量：DATABASE_URL/REDIS_URL/MASTER_KEY/JWT_SECRET/SMTP_*/R2_*/MAXMIND_*/PORT/ANONYMIZE_IP + P1 六个 LEMONSQUEEZY_*/BILLING_ENFORCEMENT |
| Resend | 告警/邀请邮件 | HTTP API（SMTP 被 Railway 封） |
| MaxMind | GeoLite2 | 风控地理定位 |
| UptimeRobot | health 监控 | 5 分钟 |
| EasyWP | 演示商店 | WooCommerce + 插件 |
| WordPress.org | 插件上架 | 账号申请中 |
| Lemon Squeezy | 收款（记录商户） | **KYC 受阻**：Stripe 轨道拒 PMB 地址，处理顺序见 HUMAN_TODO；备选 Paddle |
| Wise Business | 收提现+换汇 | 已开户 |
| MASTER_KEY | 信封加密根密钥 | 用户离线备份两份（2026-07-12） |

⚠️ 已知未决安全事项：聊天截图泄露的两把 API key（vz_CZSZYYF5…、
vz_0VF1RZY4…）待用户吊销重建。

## 六、当前状态与下一步（2026-07-13）

**批次 R 代码部分已全部收官**（A1~A4、B1、B2、D 交付并 CI 绿；
详见进度总账 2026-07-14~15 节）。下一批等老板指令。

**卡点（等用户/外部）**：
1. A1 备份配置：R2 桶 + GitHub 六个 Secrets（步骤见
   RESILIENCE_DR_PLAN §五），配置后手动跑首次备份与恢复演练
2. A5 泄露 key 核查：等用户在 Neon SQL Editor 跑核查 SQL 回传
3. LS KYC（用户三步走：改国家→问客服→评估 Paddle；根治=非 PMB
   商业地址，老板任务）
4. WordPress.org 账号批复（批复后立即上架）
5. E1 实操验收（用户邀请 warehouse 账号+摄像头扫真码）
6. Neon 升付费档（老板任务，A1 前置）

**冻结中（批次 C，等首个付费客户/老板触发）**：E2~E6 及
PROJECT_PLAN §12 全部构想。

**新接手者的第一步**：读本文档 → 读 `/CLAUDE.md` → 读
`docs/DIRECTIVE_BATCH_R_zh.md`（现行指令）→ 跑通 4.5 的本地验收
三件套（注意：先杀掉残留的 `node dist/main.js` 进程，它会抢走
BullMQ 任务导致 e2e 假失败）→ 从「执行中/卡点」清单接活。
