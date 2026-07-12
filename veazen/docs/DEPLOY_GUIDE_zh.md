# Veazen 云端上线手册（零基础版）

> 目标：把云端 API 部署到 `api.veazen.app`，验证页/控制台部署到
> `verify.veazen.app`。全程只需要浏览器。做完后官网等待列表自动变成真表单，
> demo 店只差装插件。
>
> 用到的账号：Railway（跑程序）、Neon（数据库）、Upstash（Redis）、
> Cloudflare（域名 + R2 存储）。遇到界面对不上的地方，截图发给 Claude。

---

## 第 0 步：生成主密钥 MASTER_KEY（2 分钟，只做一次）

这是整个系统的"保险箱钥匙"，丢了没法找回，泄露了等于全部密钥泄露。

1. 打开任意浏览器页面，按 **F12** → 点 **Console（控制台）** 标签。
2. 粘贴下面这一行，回车：
   ```js
   Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('')
   ```
3. 会输出一串 **64 位的小写字母数字**（形如 `9f2c...`，共 64 个字符）。
4. **复制并保存到两个地方**：你的密码管理器 + 一个离线位置（如打印出来放抽屉）。
   这就是 `MASTER_KEY`。⚠️ 不要发给任何人，包括 Claude。

## 第 1 步：Neon — 拿数据库连接串（3 分钟）

1. 登录 **console.neon.tech**，进入你建的 `veazen` 项目。
2. 首页找到 **Connection string（连接字符串）** 面板，格式类似：
   `postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. 点复制按钮，先存到记事本，待会儿粘到 Railway。这是 `MIGRATE_DATABASE_URL`。
   （如果末尾没有 `?sslmode=require`，手动补上。）

## 第 2 步：Upstash — 拿 Redis 连接串（2 分钟）

1. 登录 **console.upstash.com**，点进你建的 `veazen` 数据库。
2. 找到 **Connect / TLS** 区域里以 **`rediss://`** 开头的连接串（注意是两个 s）。
3. 复制存到记事本。这是 `REDIS_URL`。

## 第 3 步：Cloudflare R2 — 建存储桶（5 分钟）

导出的码文件（含刮刮码明文，只此一份）必须存在这里，服务器重启才不会丢。

1. 登录 **dash.cloudflare.com** → 左侧 **R2 对象存储** → 首次使用点开通（免费额度很大，可能要求绑卡但 10GB 内不收费）。
2. **创建存储桶**：名字 `veazen-prod`，位置自动，点创建。
3. 回到 R2 首页 → 右侧 **管理 R2 API 令牌（Manage R2 API Tokens）** → **创建 API 令牌**：
   - 权限选 **对象读和写（Object Read & Write）**；
   - 指定存储桶：只勾 `veazen-prod`；
   - 创建后页面会一次性显示三样东西，全部复制存到记事本：
     - **访问密钥 ID** → 这是 `S3_ACCESS_KEY`
     - **机密访问密钥** → 这是 `S3_SECRET_KEY`
     - **终结点（形如 `https://<一串字母>.r2.cloudflarestorage.com`）** → 这是 `S3_ENDPOINT`

## 第 4 步：Railway — 部署 API（15 分钟，核心步骤）

1. 登录 **railway.app** → **New Project** → **Deploy from GitHub repo** →
   选择 **`duyuanping9798/My-claude-code-project`**（首次会让你授权 GitHub，全部允许）。
2. 创建后先别管构建，点进这个服务 → **Settings** 标签，逐项设置：
   - **Source → Branch**：选 **`claude/new-session-h4w2ri`**
   - **Source → Root Directory**：填 **`veazen`**
   - **Build → Dockerfile Path**：填 **`apps/api/Dockerfile`**
3. 切到 **Variables** 标签，点 **Raw Editor**（原始编辑器），把下面整段粘进去，
   然后把 `【】` 里的内容换成你记事本里的值：

   ```
   MIGRATE_DATABASE_URL=【Neon 连接串】
   REDIS_URL=【Upstash rediss:// 连接串】
   MASTER_KEY=【第 0 步生成的 64 位密钥】
   JWT_SECRET=【再用第 0 步的方法生成一串新的，别复用 MASTER_KEY】
   PUBLIC_VERIFY_BASE_URL=https://verify.veazen.app
   S3_ENDPOINT=【R2 终结点】
   S3_BUCKET=veazen-prod
   S3_ACCESS_KEY=【R2 访问密钥 ID】
   S3_SECRET_KEY=【R2 机密访问密钥】
   ```
4. 保存后 Railway 会自动开始构建（**Deployments** 标签能看进度，首次约 5 分钟）。
   构建成功的标志：日志最后出现 `[boot] starting API…` 和
   `Veazen API listening`。失败就把日志最后 30 行截图发 Claude。
5. **绑定域名**：Settings → **Networking / Public Networking** →
   **Custom Domain** → 输入 **`api.veazen.app`** → Railway 会显示一条
   **CNAME 目标值**（形如 `xxx.up.railway.app`），复制它。
6. 开新标签页进 **Cloudflare** → 你的 `veazen.app` 域 → **DNS** → **添加记录**：
   - 类型 **CNAME**，名称 **`api`**，目标粘贴刚才那串，代理状态保持**橙色云朵开启**，保存。
7. 回 Railway 等状态变绿。然后浏览器打开：
   **`https://api.veazen.app/api/v1/health`**
   看到 `{"status":"ok","service":"veazen-api"...}` 就成功了 🎉

## 第 5 步：Railway — 部署验证页/控制台（10 分钟）

1. 在同一个 Railway 项目里点 **+ New** → **GitHub Repo** → 还是选同一个仓库。
2. 新服务的 Settings：
   - Branch `claude/new-session-h4w2ri`；Root Directory `veazen`；
   - Dockerfile Path **`apps/web/Dockerfile`**。
3. Variables 只需一条：
   ```
   API_URL_INTERNAL=https://api.veazen.app/api/v1
   ```
4. 等构建完成 → Networking → Custom Domain 输入 **`verify.veazen.app`** →
   把给出的 CNAME 目标去 Cloudflare DNS 加一条（名称填 `verify`，橙云开启）。
5. 验证：打开 **`https://verify.veazen.app`** 应看到黑底品牌页；
   打开 `https://verify.veazen.app/v/TEST` 会显示"无效码"页面——这是正常的，
   说明整条链路通了。

## 第 6 步：上线后的三个确认

1. **官网表单变真**：打开 veazen.app 底部的等待列表，填一个你自己的邮箱提交，
   应显示绿色 "You're on the list"（不再是发邮件链接）。
2. **注册你自己的品牌账号**：打开 `https://verify.veazen.app/dashboard` →
   Create account（这是第一个真实租户，slug 建议填 `veazen-demo`）。
3. **生成 API Key**：控制台 → Settings → API keys → Create key，
   把以 `vz_` 开头的完整密钥**保存好**（只显示一次）——装 demo 店插件时要用。

## 常见问题

| 现象 | 处理 |
|---|---|
| 构建日志报 `MASTER_KEY must be 32 bytes` | 检查第 0 步的值是否完整 64 个字符、没混入空格 |
| 日志报 `Can't reach database server` | Neon 连接串末尾补 `?sslmode=require`，或 Neon 项目处于休眠，刷新 Neon 控制台再重新部署 |
| 域名一直 pending | Cloudflare 的 DNS 记录名称只填 `api` 或 `verify`（不要填完整域名），确认橙云开启 |
| 其它任何红色报错 | 截图 Deployments 日志最后 30 行发 Claude |

## 花费预期

Neon / Upstash / R2 都在免费额度内；Railway 两个服务约 **$5/月**（Hobby 档）。
