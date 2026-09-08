---
title: Web UI 上手十分钟
doc: docs/user/guide/index.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md
category: 参与
order: 18
summary: 从 npx 启动到跑通第一个任务：配模型、选工作区、发任务的三步上手指南。
---

官方的 Web UI 上手指南非常短——因为它真的只需要三步。

## 三步走

**1. 启动并配置模型。** `npx @deepseek-ai/dsh web` 启动后（默认 `127.0.0.1:3080`），打开 **Settings → Models** 填入 [DeepSeek API key](https://platform.deepseek.com/) 保存即可，模型路由**无需重启**立即生效。想接其他供应商或 OpenAI 兼容端点，看 `providers.md`。

**2. 选工作区。** `dsh` 进程以启动目录作为默认文件系统位置，但**新开的 Web UI 没有选中任何 workspace**——点 Choose workspace 把项目目录加进来并选中，会话输入框才会可用。这个设计是刻意的：agent 的一切文件操作都被约束在你声明的范围内（配合[安全模型](/docs/safety)）。

**3. 跑第一个任务。** 官方建议的第一句话：

> Summarize this repository and identify its main packages.

agent 会读文件、跑命令、委派子任务、维护计划；需要审批的操作（按当前权限策略）Web UI 会先询问。

## 然后呢

- [配置其他模型](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)
- [Python SDK](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/python-sdk.md)——想自动化/跑基准的走这条路
- 其他 CLI 形态：`headless`（无服务器一次性运行）、`sdk` / `acp`（程序接入）——对应[架构总览](/docs/architecture)里的五种 profile
- 想自己写插件 → [插件开发实战](/docs/plugin-dev)
