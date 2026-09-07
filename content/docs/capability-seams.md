---
title: 能力接缝：40+ 包如何拼成一台 harness
doc: docs/capability-seams.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md
category: 架构
order: 6
summary: 一张生成图看懂服务声明方、实现方、消费方的关系——「换实现」在 dsh 里意味着什么。
---

`docs/` 下有 52 篇子系统文档（`docs/subsystems/`），这篇 capability-seams 是它们的总图：用一张 mermaid 图展示每个 `ctx.<key>` 服务由哪个包声明、哪些包提供实现、哪些包直接消费。

## 三类服务

文档把服务分成三种角色，这是理解包依赖的钥匙：

- **核心脊柱服务（core spine）**：如 `ctx.sessions`（内存会话存储）、`ctx.llm`（LLM 适配器注册表）、`ctx.agents`——整个产品挂在它们身上。
- **可替换能力接缝（capability seam）**：如 `ctx.attachments`（二进制附件存储，默认实现 `attachment-local`）、`ctx.tokenMeter`、`ctx.toolResultPruner`（无模型的工具结果修剪）——每个接缝都有默认实现，也都可以被补丁换掉。
- **bundle/组合点**：profile 和 bundle 的挂载处。

## 「换实现」长什么样

以 `ctx.llm` 为例：声明在 `llm` 包，实现包包括 `llm-deepseek`（官方 DeepSeek 适配器）、`llm-pi-ai`、`llm-replay`（回放）。想让 dsh 用另一个模型供应商？写一个实现同一接缝的适配器插件，用 patch 换掉默认行即可——这正是「一切皆插件」落到包结构上的样子。

## 怎么用这篇文档

它是**找代码的地图**：想知道「会话怎么持久化」，从图上找到 `ctx.sessions` 的实现 `session-persistence` / `session-query-sqlite`，再进 `docs/subsystems/session.md` 看细节。每个子系统文档同样由 `gen-doc-graphs` 生成，与代码同步（CI 里有生成物一致性校验）。

相关阅读：[架构总览](/docs/architecture)的核心包表是本图的精简版；想看「接缝」是怎么从设计讨论里长出来的，去[设计笔记](/notes/)搜 `seam`。
