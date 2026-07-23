# 谱友圈 · 项目协作角色（Claude Code Subagents）

本目录的角色定义精选自开源仓库 **[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)**（MIT License，Copyright (c) 2025 AgentLand Contributors，全文见本目录 `LICENSE-agency-agents`），按谱友圈的战略优先级（垂类内容/微信生态/小红书/短视频/小程序/编辑器体验）挑选了 10 个，逐字保留原文。

## 谱类制谱师（本项目自建 · 出版级刻版专家，非上游）

按记谱家族拆分，专职深测各谱类制谱功能、设计预设曲谱、审核出版规范符合度。红线：song 字段只增不改，建议兼容现有 `tech/strum/tk/orn/grace` 体系。

| 文件 | 角色 | 负责谱类（docType） |
|---|---|---|
| notation-tab-luthier | 六线谱制谱师 | 弹唱 guitar / 独奏 solo / 尤克里里 uku |
| notation-piano-grand | 钢琴大谱表制谱师 | 钢琴独奏 piano / 钢琴弹唱 pianoacc |
| notation-jianpu-choral | 简谱合唱制谱师 | 歌谱 vocal（独唱/合唱/多段词） |
| notation-staff-engraver | 五线谱刻版制谱师 | 器乐五线谱 instr / 教学对照 teach |
| notation-func-chord | 功能谱和弦制谱师 | 功能谱 func / 纯和弦谱 chord |
| notation-expert | 制谱专家（总审） | 跨谱类记号体系审计（既有） |
| engraving-master | 出版级排版师 | 刻版质量审核（符干/符杠/间距/对齐/加线/谱表连接，对照 Gould+附录） |
| smufl-symbol-manager | 音乐符号管理师 | 符号覆盖完整度盘点（SMuFL/Bravura 字形集、多乐器记号，对照记谱大全） |

## 上游精选角色（营销/工程/设计）

| 文件 | 角色 | 用于谱友圈的场景 |
|---|---|---|
| marketing-xiaohongshu-specialist | 小红书专家 | 互动谱/分享卡的小红书笔记、吉他弹唱垂类种草 |
| marketing-wechat-official-account | 公众号运营 | 公众号栏目规划、图文推送、菜单/自动回复设计 |
| marketing-bilibili-content-strategist | B站内容策略 | 制谱教学/即兴伴奏教程视频、知识区运营 |
| marketing-douyin-strategist | 抖音策略 | 弹唱短视频脚本（前3秒钩子）、直播教学 |
| marketing-baidu-seo-specialist | 百度SEO | puyouquan.com 上线后的百度收录/关键词布局（ICP 备案中） |
| marketing-content-creator | 内容创作 | 垂类文案（教师考编/艺考/师范）、官网/帮助文档叙事 |
| engineering-wechat-mini-program-developer | 小程序开发 | 路线图中「真·微信小程序」的架构与合规准备 |
| engineering-code-reviewer | 代码审查 | 每个版本发版前对 index.html 改动的审查 |
| design-ui-designer | UI 设计 | 编辑器/官网视觉系统、组件一致性、深浅色 |
| design-ux-researcher | UX 研究 | 八场景用户（老师/琴行/艺考生）的可用性验证设计 |

## 用法

- **新会话自动生效**：Claude Code 启动时读取本目录，以上角色名即出现在 Agent 工具的 subagent 类型里，可直接派活（如「用小红书专家写三篇互动谱推广笔记」）。
- **注意**：角色只提供专业方法论；项目硬约束（单文件、musetab-* 键名红线、发版流水线）以根目录 `CLAUDE.md`/`PROJECT.md` 为准，派活时应一并交代。
- 需要更多角色（230+ 总库：销售/增长/游戏/GIS/财务…）：将上游仓库 fork 到本账号（duyuanping9798）后，在会话里说「add duyuanping9798/agency-agents」，即可整库挑选复制。

## 来源与许可

- 上游：https://github.com/msitarzewski/agency-agents （230+ agents, MIT）
- 本目录文件为原文逐字复制（2026-07-20 抓取），仅个别文件剔除了抓取工具混入的尾部提示行；如上游更新可重新同步。
