---
title: AGENTS.md：一个仓库如何把 AI 当正式员工管理
doc: AGENTS.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md
category: 工程实践
order: 12
summary: dsh 的开发规范入口：不是给人看的 README，而是写给 AI 协作者的岗位说明书。
---

AGENTS.md 是这个仓库的「宪法」，但它的读者首先是 AI（CLAUDE.md 是指向它的符号链接）。想在 2026 年做好 AI 原生开发，这篇值得逐段抄。

## 几条最有信息量的规则

**1. Pre-stable API 的变更纪律。** 公开 API 都处于 pre-stable 状态，改了就要同步更新**每一个消费方**；已发布的 Session JSONL 遵循「相邻迁移」规则——只能新增带版本名的后继格式，**绝不移动、覆盖或删除已提交的代际**；SQLite 域用单调递增的 `SCHEMA_VERSION`。这解释了为什么 dsh 敢在 developer preview 期疯狂重构还不弄坏用户数据。

**2. 应用启动的唯一入口。** 只有 `dsh` profile 能启动受支持的 Node 应用；包的 bin、demo、SDK argv 逃生通道一律禁止——有一个专门的校验脚本（`verify-application-entrypoints`）把每个可执行物分类把关。

**3. 仓库布局即架构。** `packages/` 按**能力（capability）**分组：core 是产品 API 脊柱（session/system-prompt/tools/agent/agent-loop），其余每个目录是一种能力（shell、fs、lsp、web、skill、workflow、subagent、compaction……）+ Service Definition + Provider + Consumer 三件套。还有一个意味深长的包：`self-modification/`——**agent 会检视并挂载自己的插件**。

**4. 每个约定背后都有主。** 文档里大量「[rule](链接)」式标注——规则不是写在墙上的口号，而是链接到拥有它的 Agent Note 或校验脚本。

## 怎么读

先读[原文](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)的 Repository layout 一节建立目录地图，再顺着链接跳到 [docs/AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/AGENTS.md)（文档写作规范）和[架构总览](/docs/architecture)。配合本站的[设计笔记](/notes/)食用，能看到这些规则是怎么一条条从讨论里长出来的。
