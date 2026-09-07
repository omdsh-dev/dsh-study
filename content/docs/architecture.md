---
title: 架构总览：一切皆插件，包括 agent loop 本身
doc: docs/architecture.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
category: 架构
order: 2
summary: dsh 的灵魂文档：Cordis 插件树、profile/bundle 组合机制、核心包与事件分类。
---

官方在文档开头就写明：**改 `packages/` 下的任何东西之前必读**。这是理解 dsh 的主文档。

## 没有特权内核

dsh 建立在 [Cordis](https://github.com/cordiverse/cordis) 之上：插件向共享 context 贡献服务、类型化事件和可逆 effect。**产品的每个部分都是插件**——模型适配器、工具注册表、会话日志、甚至 agent loop 本身。没有需要打补丁的特权内核，扩展 dsh 的方式就是把插件挂载到其他插件旁边；注册都是 effect，插件卸载时自动回退。

## Profile 与 Bundle：运行时是一个「组合出来的插件树」

这是 dsh 组合机制的核心：

- **Profile（配置档）**：一份具名组合清单，列出堆叠的 bundle 顺序、树外插件、以及用户自己的 `cordis.patch.yml`。内置模板有 `web`、`headless`、`sdk`、`sdk-minimal`、`acp` 五种。
- **Bundle（捆绑包）**：Cordis 配置行 + 所挂代码的分发格式。[`dsh-base`](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/bundle/base) 是共享底层（模型适配器、工具、持久化、沙箱与审批策略、凭据、遥测），`dsh-web-app` 在其上加浏览器应用，`dsh-headless` 加无服务器的一次性运行器，以此类推。`sdk-minimal` 是刻意的例外：完全不应用 `dsh-base`，独占一棵显式 SDK 树。
- **Patch（补丁）**：层级叠加时，每一层都可以按 id 替换任意配置行。想看自己机器上启动的插件树：`dsh --profile web --dump-config`，打印出的任何一行都可以被你的补丁替换。

## 核心包速查

文档给出了一张核心服务表，几个关键项：

| 包 | 职责 | ctx 键 |
|---|---|---|
| core/session | 只追加的 `SessionEvent` 日志 | `ctx.sessions` |
| core/system-prompt | 提示词段落与工具 schema 组装 | `ctx.systemPrompt` |
| core/tools | 带守卫的工具注册表与执行管线 | `ctx.tools` |
| core/agent · agent-loop | Agent 接口与默认驱动 | `ctx.agents` · `ctx.agentLoop` |
| llm/llm | 消息与流式词汇表、适配器接缝 | `ctx.llm` |

## 事件是扩展点，选对域是第一步

三类事件，写代码前先想清楚要用哪类：

- **Session events**：持久事实，追加进日志并经 `session/event` 广播——需要「重载后仍在」的事实用它。
- **Agent events**（`agent/*`）：携带活体 Agent 的收件箱、步骤、状态、请求——观察或拦截进行中的工作用它。
- **Capability events**：把策略和适配器挂到接缝上（`fs/*`、`tools/*`、`telemetry/*`），不需要 import loop。

## 阅读建议

先读[架构总览原文](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)，再按需进入：[agent 生命周期](/docs/agent-lifecycle)、[工具执行管线](/docs/tool-pipeline)、[能力接缝](/docs/capability-seams)。官方还建议直接让 AI agent 探索代码库来理解架构。
