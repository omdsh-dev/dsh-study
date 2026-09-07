---
title: 官方文档地图：90 天长出的 400+ 篇文档
doc: docs/
upstream: https://github.com/deepseek-ai/deepseek-harness/tree/master/docs
category: 入门
order: 11
summary: docs/ 目录全景：52 篇子系统文档、用户指南、cookbook、Cordis 教程，以及少见的 postmortem 复盘。
---

dsh 的 `docs/` 目录本身就是「开发过程」的证据：三个月长出 400+ 篇文档（多数中英双语），且大量内容由 `scripts/gen-doc-graphs.ts` **从代码生成**——文档和代码的同步是被 CI 强制的。这张地图帮你找到入口。

## `docs/` 顶层必读

| 文档 | 内容 | 适合 |
|---|---|---|
| `architecture.md` | 架构总览（本站有[导读](/docs/architecture)） | 所有人 |
| `cordis-primer.md` | Cordis 框架入门（[导读](/docs/cordis-primer)） | 写插件前 |
| `agent-lifecycle.md` | 回合/步骤时序（[导读](/docs/agent-lifecycle)） | 理解运行时 |
| `tool-execution-pipeline.md` | 工具管线（[导读](/docs/tool-pipeline)） | 理解安全模型 |
| `capability-seams.md` | 服务接缝总图（[导读](/docs/capability-seams)） | 找代码 |
| `event-producer-consumer.md` | 全部事件的生产者/消费者地图 | 挂 hook 时 |
| `config-catalog.md` | 生成的配置项目录 | 调配置时 |
| `development.md` | 开发环境（[导读](/docs/development)） | 贡献者 |

## 四个专题目录

- **`subsystems/`（52 篇）**：每个 `ctx.<key>` 服务一篇——session、system-prompt、tools、llm-streaming、webhook……按接缝查。
- **`user/`（22 篇）**：面向使用者的指南（Web UI、Python SDK 等）。
- **`cookbook/`（9 篇）**：how-to 食谱——加一个包、加一个工具、加一个 LLM 适配器、加设置卡片、vendored 包处理。
- **`cordis-tutorial/` + `cordis-api/`（17 篇）**：从第一个插件到生命周期/effect/service 的动手教程与 API 参考。

## 最少见的：`postmortem/`（5 篇）

公开的事故复盘——对一个开源 agent 框架来说相当罕见的透明度。想研究「这个项目如何从故障中学习」，这是最原始的一手材料，配合本站提交流里对应时段的 diff 食用效果最佳。

## 另两篇一级文档

- [`BENCHMARK.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/BENCHMARK.md)：目前很简短——通过 Python SDK 跑 `jsonrpc-agent` 最小变体，独立任务用独立 workspace 和 session ID。
- [`THIRD_PARTY_NOTICES.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/THIRD_PARTY_NOTICES.md)：第三方依赖与许可证披露（MIT 主许可 + vendored Cordis）。
