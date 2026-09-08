---
title: 事件地图导读：一张表看清谁发事件、谁在听
doc: docs/event-producer-consumer.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md
category: 架构
order: 16
summary: dsh 全部事件的「派发方 × 监听方」矩阵——挂 hook 前必查，也是理解插件如何解耦的说明书。
---

这篇由 `gen-doc-graphs` 生成的文档是一个大矩阵：每一行是一个事件，列出它的派发模式、声明位置、**哪些包派发它**、**哪些包监听它**。事件是多对多关系，所以用表格而不是一张巨图。

## 先看一行范例

以 `agent/pre-step`（`waterfall` 模式）为例：由 `agent-loop` 派发，监听方有 **17 个包**——`plan-mode`、`compaction-basic`、`hooks-claude-code`、`time-context`、`repeat-tool-reminder`、`tool-skill`……这一行就是「agent 每一步开始前，整个系统里谁有话语权」的完整名单。换句话说，**任何监听器都能拒绝或改写这一步**（见[agent 生命周期](/docs/agent-lifecycle)）。

## 这张表的用法

- **挂 hook 前查冲突**：想拦截某行为，先看这个事件已有多少监听者、它们是 observe（emit）还是 wrap（waterfall）——派发模式决定了你的监听器是「知情」还是「有决定权」
- **判断功能归属**：「想加审批日志」→ 查 `approval/request` 一行，发现监听方是 `acp` 和 `remotes`，说明审批决议走这两个出口
- **理解耦合面**：监听者数量 ≈ 该事件的耦合半径。`agent/created` 有 7 个监听包，`agent/pre-step` 有 17 个——越靠近循环核心，广场越大

## 背后的工程机制

矩阵是**生成的**：从每个包的类型声明里提取事件名、派发点和调用方式，文档与代码由 CI 保证一致。事件名本身通过 TypeScript declaration merging 进入类型系统（见 [Cordis 入门](/docs/cordis-primer)），所以「表里没有的事件」在类型层面就写不出来。

原文：[event-producer-consumer.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md)。配套阅读：[架构总览](/docs/architecture)的事件三分类、[能力接缝](/docs/capability-seams)的服务视角。
