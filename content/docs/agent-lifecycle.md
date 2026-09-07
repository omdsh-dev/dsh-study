---
title: Agent 回合与步骤生命周期
doc: docs/agent-lifecycle.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/agent-lifecycle.md
category: 架构
order: 4
summary: 一次对话回合内部发生了什么：收件箱、pre-step 瀑布、持久事实与活体状态的双轨设计。
---

这篇文档由 `scripts/gen-doc-graphs.ts` 从代码生成（**不要手改，跑 `pnpm run gen-doc-graphs` 再生成**），用一张 mermaid 时序图展示 agent 一次 turn 的完整旅程：User → Agent → Driver → Hooks → systemPrompt → LLM → Tools → Session。

## 最关键的设计：双轨事件

dsh 把「事实」和「状态」严格分开在两条事件轨道上：

- **持久事实走 `session/event`**：追加到只增日志，重载后可回放。回合开始（`turn/start`）、工具调用（`tool/call`）等都在执行**前**先落账。
- **活体状态走 `agent/*`**：收件箱（inbox）、步骤、状态、请求的实时变化，UI/SDK 监听这些事件来渲染进行中的工作。这类事件不追求持久，追求低延迟可观察。

## 一次 turn 的骨架

1. `User → Agent: followup(content)`，消息先落到收件箱，广播 `agent/inbox/inserted`。
2. 排队的工作唤醒 Driver，状态切到 `agent/status: running`，Driver 开启 turn。
3. Driver 领取（claim）待处理的下一步输入，收件箱做「纯删除」拼接并广播 `agent/inbox/claimed`。
4. **`agent/pre-step` 瀑布**：hook 监听器可以权威地拒绝该步骤，或改写进入的消息——被拒时已 claim 的消息保持移除，这个 turn 不消耗步骤。
5. 通过后进入正常循环：组装 system prompt → 调 LLM → 处理 tool-call（进入[工具执行管线](/docs/tool-pipeline)）→ 结果落 session 日志。

## 为什么值得精读

这是理解「dsh 如何把不确定性（模型输出）装进确定性骨架」的最佳切片：每一步都有权威的拒绝点（pre-step waterfall），每个不可逆动作都先写日志（session event），所有状态变化都可观察（agent/*）。想做 agent 框架的人可以直接把这张时序图当作参考架构。

读法：对照 [architecture.md 的 Turn Flow 一节](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) 和 [event-producer-consumer.md 事件地图](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md)一起看，后者列出每个事件的生产者和消费者。
