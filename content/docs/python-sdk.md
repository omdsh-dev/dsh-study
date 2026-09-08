---
title: Python SDK 与基准测试：程序化接入 dsh
doc: docs/user/guide/python-sdk.md · BENCHMARK.md · python/
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/python-sdk.md
category: 参与
order: 19
summary: 不写 TypeScript 也能用 dsh：Python SDK 怎么包装 dsh、以及官方基准的跑法。
---

dsh 虽然是 TypeScript 项目，但官方提供了完整的 Python SDK——对研究者和评测向用户这是最顺手的入口。

## SDK 的架构选择

有意思的是 Python SDK **没有重写 agent 逻辑**：它的 runtime wheel 直接打包了正常的 `dsh` CLI（`deepseek-harness-sdk-runtime-<platform>-<arch>`），客户端启动的就是 `dsh --profile sdk`，通过 JSON-RPC 通信。Python 侧暴露的是 profile 选择和有序 patch 文件，而不是让你拼一棵 Cordis 树——和 TypeScript SDK 同一套应用架构（见[架构总览](/docs/architecture)）。最小示例走 `sdk-minimal` profile，一棵刻意精简、不挂 `dsh-base` 的独立 SDK 树。

## 跑官方基准

`BENCHMARK.md` 目前很克制：装好 Python SDK → 跑 `jsonrpc-agent` 最小变体；**独立的基准任务必须用独立的 workspace 和 session ID**（保证任务间隔离，别让上下文互相污染）。更重的性能门禁在仓库 `benchmarks/` 目录（CI 里的性能闸门），以及更完整的 `docs/user/guide/` 系列。

## 适合谁

- **评测/论文向**：想拿 dsh 当被测 harness 跑 agent 基准——Python SDK + 独立 session 是官方路径
- **自动化向**：想把 dsh 嵌进自己的流水线——看 `--profile acp`（自动化专用的 Agent Client Protocol 服务器）和 `sdk-minimal`
- **贡献者**：跑真实 API 的 e2e 测试也需要一个 DeepSeek API key

原文：[python-sdk.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/python-sdk.md) · [BENCHMARK.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/BENCHMARK.md) · [python/](https://github.com/deepseek-ai/deepseek-harness/tree/master/python)
