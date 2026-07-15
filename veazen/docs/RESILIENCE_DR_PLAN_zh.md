# 数据安全与业务连续性预案（韧性/容灾）

> 起草：2026-07-13 ｜ 状态：现状盘点属实，P0 行动项待老板批示
> 三条底线：**数据不丢（备份）、服务不断（可用性）、数据不假（完整性）**

## 一、已建成的防线（现状盘点）

### 服务不断
1. **Redis 全面降级能力**（2026-07-13 事故后落地）：Redis 不可达时
   API 照常启动、验证/登录限流 fail-open、队列写入 2s 限时尽力、
   连接恢复自动重连+离线命令自动补发；
2. 验证记录**先落 Postgres 再进队列**——数据库是唯一权威，队列丢失
   不影响验真结果与扫码历史；
3. Railway 容器崩溃自动重启；boot 迁移幂等（重启安全）；
4. UptimeRobot 每 5 分钟探测 health，宕机邮件告警；
5. API/Web 无状态（不在容器里存任何数据），随时可重建。

### 数据不假（完整性/证据链）
6. 扫码事件与审计日志**只增不改**（数据库层强制，app 角色无 UPDATE/
   DELETE 权限）；
7. **Merkle 每日摘要链**：昨日全部扫码事件哈希成树、根哈希与前日
   摘要链接——任何人事后篡改历史都会破坏链条（可出证据报告）；
8. 租户间 RLS 行级隔离（数据库层强制，非应用层约定）；
9. 敏感数据信封加密（刮码仅存加盐哈希、租户签名私钥用 MASTER_KEY
   加密）；MASTER_KEY 已离线备份两份（2026-07-12）；
10. 二维码带 Ed25519 签名——即使数据库被攻破，攻击者也无法伪造
    能通过验签的新码。

### 数据不丢（部分）
11. Neon 自带时间点恢复（PITR）——但免费档窗口很短（小时级），
    只够撤销"刚才的误操作"，**不构成完整备份**；
12. 代码与配置全部在 GitHub 私有仓库（等于代码有异地备份）。

## 二、诚实的短板（按风险排序）

| # | 短板 | 后果 | 风险等级 |
|---|---|---|---|
| G1 | **没有独立于 Neon 的数据库备份**——Neon 账号出事/区域故障/超出 PITR 窗口的误删 = 无法恢复 | 全部租户码库+扫码历史丢失，业务终结级 | 🔴 高 |
| G2 | 备份从未做过**恢复演练**（没有验证过的备份≈没有备份） | 事故时手忙脚乱、恢复失败 | 🔴 高 |
| G3 | api/verify 走灰云直连 Railway，**没有 WAF/DDoS 防护**在前面 | 恶意流量直打源站 | 🟡 中 |
| G4 | 全栈单区域（Neon+Railway 同区）——区域级故障=整体停机数小时 | 停机但不丢数据 | 🟡 中（当前规模可接受） |
| G5 | API 宕机时消费者扫码看到的是浏览器报错，而非友好的维护页 | 体验差、被误认为假货 | 🟡 中 |
| G6 | Railway 日志随容器消失，无集中日志/错误率告警（只有 health 探测） | 排障慢、慢性故障发现晚 | 🟢 低 |

## 三、行动预案（分优先级，P0 待批示后立即执行）

### P0：数据不丢（本周内，约 1 天工作量）
1. **每日自动备份**：GitHub Actions 定时任务（每日 UTC 04:00）
   `pg_dump` Neon 全库 → 加密压缩 → 上传 R2 独立备份桶，保留 30 天
   滚动 + 每月 1 份长期保留；备份失败自动开 GitHub Issue 告警；
2. **恢复演练脚本 + 首次演练**：一条命令把最新备份恢复到本地/临时库
   并跑冒烟测试（验证一枚码），演练结果记录在案；此后**每季度演练**；
3. R2 备份桶开版本控制 + 独立 API 令牌（最小权限，只写不删）。

> 达成后的承诺口径：最坏情况丢失 ≤24 小时数据（RPO≤24h），
> 数小时内可恢复服务（RTO≤4h）。配合 Neon PITR，日常误操作可
> 恢复到分钟级。

### P1：服务不断（1~2 周内）
4. **api/verify 切橙云评估**：域名验证已完成，试切 Cloudflare 代理
   （Full-strict TLS）获得免费 WAF/DDoS/源站隐藏；有问题随时切回
   灰云（已知教训：验证期必须灰云，验证后可试橙云）；
5. **友好降级页**：Cloudflare Worker 在源站不可达时返回品牌化
   「系统维护中，请稍后再验」页面（含重试按钮），而非浏览器报错；
6. UptimeRobot 增加 verify 页面探测（现只测 API health）。

### P2：规模化后再做（有付费客户/收入触发）
7. Neon 升级付费档（PITR 窗口 7~30 天 + 分支恢复）；
8. 集中日志与错误率告警（如 Better Stack/Axiom 免费档）；
9. 验证页边缘缓存/离线验签（Cloudflare Worker 先本地验 Ed25519
   签名，源站故障时给出"签名有效，完整核验稍后"的降级结论）；
10. 多区域读副本/跨区容灾（企业客户 SLA 谈判时）。

## 四、事故手册（Runbook 摘要）

| 场景 | 信号 | 处置 |
|---|---|---|
| API 宕机 | UptimeRobot 告警 | Railway 看部署日志→回滚上一版（Deploys→Redeploy）；DB/Redis 变量核对 |
| Redis 宕机 | 日志 ENOTFOUND/ECONNREFUSED | **无需紧急处置**（已全面降级），修复 Redis 后队列自动恢复 |
| 数据库不可达 | 全接口 5xx | Neon 控制台看状态；恢复后 API 自愈；若数据损坏→P0 备份恢复流程 |
| 误删数据 | 人工发现 | 小时内：Neon PITR 回滚；更早：R2 备份恢复到临时库→精确回填 |
| MASTER_KEY 泄露 | 人工发现 | 立即轮换（生成新 key→重加密私钥→换 Railway 变量），审计日志排查 |
| API key 泄露 | 告警/人工 | Settings 吊销重建（现有功能） |
| 域名/DNS 故障 | 官网/验证页打不开 | Cloudflare DNS 状态页；灰云记录核对 CNAME 目标 |

---

## 五、P0 实施记录（2026-07-13，批次 R 指令 A1 批准执行）

**已交付的自动化**（GitHub Actions，仓库根 `.github/workflows/`）：
- `veazen-backup.yml`：每日 04:17 UTC 全量 `pg_dump`（PG17 客户端，
  custom 压缩格式）→ AES-256-PBKDF2 加密 → 上传 R2 `daily/` 前缀；
  每月 1 号加存 `monthly/`（永久保留）；密钥未配置时安静跳过；
  配置后失败自动开 GitHub Issue 告警
- `veazen-restore-drill.yml`：**手动一键恢复演练**（Actions 页面
  Run workflow）——取最新备份→解密→恢复到临时 PG17→表计数+抽样
  完整性检查→输出演练报告（含耗时）；失败自动开 Issue。
  纪律：**每季度至少演练一次**

**用户配置步骤（一次性，约 10 分钟）**：
1. Cloudflare 控制台 → R2 → Create bucket → 名 `veazen-backups`
   （区域默认）；若设置页有 versioning 开关则打开（R2 部分区域
   暂不提供版本控制，没有就跳过——monthly/ 永久留存已兜底）
2. 同页 → Settings → Object lifecycle rules → Add rule：
   前缀 `daily/`，动作 Delete objects，30 天（自动滚动清理）
3. R2 → Manage API Tokens → Create API Token：权限选
   **Object Read & Write**，Bucket 只勾 `veazen-backups`
   → 记下 Access Key ID / Secret Access Key / 端点 URL
   （形如 `https://<account_id>.r2.cloudflarestorage.com`）
4. GitHub 仓库 → Settings → Secrets and variables → Actions →
   New repository secret，逐个添加 6 条：
   - `NEON_DATABASE_URL`（Neon 直连串，与 Railway 同值）
   - `R2_BACKUP_ENDPOINT` / `R2_BACKUP_BUCKET`（=veazen-backups）
   - `R2_BACKUP_ACCESS_KEY_ID` / `R2_BACKUP_SECRET_ACCESS_KEY`
   - `BACKUP_ENCRYPTION_KEY`（终端跑 `openssl rand -hex 32` 生成，
     **密码管理器 + 离线各存一份**——丢了它备份将无法解密）
5. Actions → veazen-backup → Run workflow（手动跑第一次）→ 绿色后
   Actions → veazen-restore-drill → Run workflow（第一次演练）
6. 完成后把本文档「首次演练记录」补上日期与耗时

**首次演练记录**：待执行（配置完成后运行 veazen-restore-drill 填写）

**RPO/RTO 承诺口径（配置完成后生效）**：最坏丢失 ≤24h 数据；
恢复路径演练在案，RTO 目标 ≤4h。Neon 升付费档后日常误操作可
PITR 到分钟级（老板任务，见 HUMAN_TODO 置顶）。
