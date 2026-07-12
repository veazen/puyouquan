# Veazen 云端上线手册 v2（零基础版）

> 目标：把云端 API 部署到 `api.veazen.app`，验证页/控制台部署到
> `verify.veazen.app`。全程只需要浏览器。做完后官网等待列表自动变成真表单。
> 上线后 30 分钟内的补充配置（邮件/GeoIP/隐私开关）见
> **DEPLOY_GUIDE_PART2_zh.md**。
>
> 遇到界面对不上的地方，截图发给 Claude。

## ⚠️ 开始前的两个前置条件（必须先完成）

1. **仓库迁移**：把 GitHub 仓库从个人账号转移到组织 `veazen` 并改名为
   `veazen`（GitHub 仓库页 → Settings → 最底部 Danger Zone → Transfer
   ownership → 输入组织名 `veazen`；转移后在仓库 Settings 顶部改名为
   `veazen`）。**先迁移再部署**，否则 Railway 配置要返工。
2. **生产分支是 `main`**：本手册所有部署一律选 `main` 分支（代码已合并就绪）。
   开发用的临时分支永远不用于生产。

🔐 **安全习惯（贯穿全程）**：下面步骤里所有连接串/密钥，建议存在**密码管理
器的安全笔记**里而不是记事本；如果用了记事本，粘贴进 Railway 后**立即删除**。

---

## 第 0 步：生成主密钥 MASTER_KEY（2 分钟，只做一次）

这是整个系统的"保险箱钥匙"，丢了没法找回，泄露了等于全部密钥泄露。

1. 打开任意浏览器页面，按 **F12** → 点 **Console（控制台）** 标签。
2. 粘贴下面这一行，回车：
   ```js
   Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('')
   ```
3. 输出一串 **64 位小写字母数字**。**保存到两个地方**：密码管理器 + 离线一份。
   这就是 `MASTER_KEY`。⚠️ 不要发给任何人，包括 Claude。

## 第 1 步：Neon — 拿数据库连接串（3 分钟）

1. 登录 **console.neon.tech**，进入 `veazen` 项目。
2. 首页 **Connection string** 面板：如果有 **Pooled connection** 开关/下拉，
   **选择不带 pooler 的直连（Direct）版本**——主机名里**不应**出现
   `-pooler` 字样。格式类似：
   `postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. 复制保存（密码管理器安全笔记）。这是 `MIGRATE_DATABASE_URL`。
   （末尾没有 `?sslmode=require` 就手动补上。）

> **为什么这里没让你配置 DATABASE_URL？** 服务器每次启动会先用这条"管理员
> 连接"完成数据库升级，然后自动派生出一个权限受限的运行账号（防篡改保护
> 依赖它），运行时的 DATABASE_URL 由程序自己生成，不需要你配置。
> （技术细节：docs/ARCHITECTURE.md ADR-010。）

## 第 2 步：Upstash — 拿 Redis 连接串（2 分钟）

1. 登录 **console.upstash.com**，进入 `veazen` 数据库。
2. 复制 **`rediss://`** 开头的 TLS 连接串（注意两个 s）。这是 `REDIS_URL`。

## 第 3 步：Cloudflare R2 — 建存储桶（5 分钟）

导出的码文件（含刮刮码明文，只此一份）必须存这里，服务器重启才不会丢。

1. **dash.cloudflare.com** → 左侧 **R2 对象存储** → 首次使用点开通
   （免费额度大，可能要求绑卡但 10GB 内不收费）。
2. **创建存储桶**：名字 `veazen-prod`，位置自动。
3. R2 首页 → **管理 R2 API 令牌** → **创建 API 令牌**：
   - 权限 **对象读和写（Object Read & Write）**；只勾 `veazen-prod`；
   - 创建后一次性显示三样，全部保存：
     - **访问密钥 ID** → `S3_ACCESS_KEY`
     - **机密访问密钥** → `S3_SECRET_KEY`
     - **终结点**（`https://xxxx.r2.cloudflarestorage.com`）→ `S3_ENDPOINT`

## 第 4 步：Railway — 部署 API（15 分钟，核心步骤）

1. 登录 **railway.app** → **New Project** → **Deploy from GitHub repo** →
   选择 **`veazen/veazen`**（首次会让你授权 GitHub 访问 veazen 组织，允许）。
2. 点进服务 → **Settings**：
   - **Source → Branch**：**`main`**
   - **Source → Root Directory**：**`veazen`**
   - **Build → Dockerfile Path**：**`apps/api/Dockerfile`**
3. **Variables** 标签 → **Raw Editor**，粘贴并替换 `【】`：

   ```
   MIGRATE_DATABASE_URL=【Neon 直连串】
   REDIS_URL=【Upstash rediss:// 串】
   MASTER_KEY=【第 0 步的 64 位密钥】
   JWT_SECRET=【用第 0 步方法再生成一串新的】
   PUBLIC_VERIFY_BASE_URL=https://verify.veazen.app
   S3_ENDPOINT=【R2 终结点】
   S3_BUCKET=veazen-prod
   S3_ACCESS_KEY=【R2 访问密钥 ID】
   S3_SECRET_KEY=【R2 机密访问密钥】
   ```
   （可选增强项 `SMTP_*`、`MAXMIND_LICENSE_KEY`、`ANONYMIZE_IP` 见 PART2。）
4. 保存后自动构建（**Deployments** 看进度，首次约 5 分钟）。成功标志：日志
   出现 `[boot] starting API…` 和 `Veazen API listening`。失败→日志最后
   30 行截图发 Claude。
5. **粘贴完成后**，把密码管理器/记事本里的临时明文清理干净（第 0 步的
   MASTER_KEY 正式副本除外——那个要永久保存）。
6. **绑定域名**：Settings → **Networking** → **Custom Domain** →
   `api.veazen.app` → 复制 Railway 给出的 CNAME 目标值。
7. **Cloudflare** → `veazen.app` 域 → **DNS** → 添加记录：类型 **CNAME**、
   名称 **`api`**、目标粘贴上一步的值、橙色云朵开启。
8. 打开 **`https://api.veazen.app/api/v1/health`**，见
   `{"status":"ok","service":"veazen-api"...}` 即成功 🎉
9. **立刻加监控**：登录 **uptimerobot.com** → Add New Monitor → 类型
   HTTP(s) → URL 填 `https://api.veazen.app/api/v1/health` → 间隔 5 分钟 →
   通知邮箱 hello@veazen.app。以后服务一挂你会第一时间收到邮件。

## 第 5 步：Railway — 部署验证页/控制台（10 分钟）

1. 同一 Railway 项目 → **+ New** → **GitHub Repo** → 还是 `veazen/veazen`。
2. Settings：Branch **`main`**；Root Directory **`veazen`**；
   Dockerfile Path **`apps/web/Dockerfile`**。
3. Variables 一条：
   ```
   API_URL_INTERNAL=https://api.veazen.app/api/v1
   ```
4. 构建完 → Networking → Custom Domain **`verify.veazen.app`** →
   Cloudflare DNS 加 CNAME（名称 `verify`，橙云开启）。
5. 验证：`https://verify.veazen.app` 显示品牌页；
   `https://verify.veazen.app/v/TEST` 显示"无效码"页——正常，链路已通。

## 第 6 步：上线后的三个确认

1. **官网表单变真**：veazen.app 底部表单填邮箱提交 → 绿色 "You're on the list"。
2. **注册第一个品牌账号**：`https://verify.veazen.app/dashboard` →
   Create account（slug 建议 `veazen-demo`）。
3. **生成 API Key**：控制台 → Settings → API keys → Create key，
   `vz_` 开头的完整密钥**只显示一次**，存进密码管理器——装 demo 店插件用。

完成后 → 打开 **DEPLOY_GUIDE_PART2_zh.md** 完成邮件/GeoIP/隐私开关三项收尾。

## 常见问题

| 现象 | 处理 |
|---|---|
| 构建日志报 `MASTER_KEY must be 32 bytes` | 检查是否完整 64 字符、无空格 |
| 日志报 `Can't reach database server` | Neon 串补 `?sslmode=require`；或 Neon 免费层休眠了，打开 Neon 控制台唤醒后 Redeploy |
| 日志报 `could not rotate the veazen_app password` | 把日志截图发 Claude（Neon 默认账号不会出现此错） |
| 域名一直 pending | Cloudflare DNS 名称只填 `api`/`verify`，橙云开启 |
| 其它红色报错 | Deployments 日志最后 30 行截图发 Claude |

## 花费预期

Neon / Upstash / R2 免费额度内；Railway 两个服务约 **$5/月**（Hobby 档）。
