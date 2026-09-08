---
title: 核心子系统三篇：session、tools、llm 的数据模型
doc: docs/subsystems/session.md · tools.md · llm-streaming.md
upstream: https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/subsystems
category: 架构
order: 15
summary: 一次 agent 对话在 dsh 内部长什么样：只增事件日志、工具定义的完整契约、消息与流式词汇表。
---

`docs/subsystems/` 下有 52 篇子系统文档，全部由 `gen-doc-graphs` 从源码生成并随代码同步。这三篇是脊柱中的脊柱，合起来回答一个问题：**一次 agent 对话在 dsh 内部的数据形态是什么**。

## session：只增日志是唯一真相

`Session` 是类型化 `SessionEvent` 的**只增日志**——agent 全部交互历史的唯一真相源。LLM 消息历史是**从日志派生的**，从不单独存储；回放 = 从同一批事件重新派生。事件词汇表 `SessionEventMap` 是 merge-extensible 的：compaction 插件可以声明自己的 `compaction/start` 等事件类型并入目录。关键事件围绕 turn 生命周期展开：`turn/start` 在循环领取输入前打开回合，被拒/取消/失败可以不留 step 就关闭。

## tools：一个工具的全部契约

`ToolDefinition` = 模型可见的 `ToolSchema` + **强制的规范输出声明** + `execute` 函数 + 宿主侧调度元数据 + 可选的 UI 呈现器。两个设计点值得注意：

- 注册表的 `schemas()` 构建 `ToolSchema[]` 时走**显式白名单**——`execute`、`timeoutMs`、`presentCall` 等实现细节永远不泄漏进模型请求
- `execute` 返回的值必须符合 `output.schema` 声明的**无损 JSON 规范值**，再由纯函数 `render` 投影成内容块——工具结果的「给模型看的」和「给 UI 看的」被干净分开

## llm-streaming：一份消息表示走天下

对话 = `Message` 数组；消息 = 类型化**内容块**数组（`text` / `reasoning` / `image` / `file` / `tool-call` / `tool-result`），块联合类型从 `ContentBlockMap` 派生（declaration merging 可扩展）。`reasoning`（思考）与可见文本是不同的块—— thinking 的持久化与展示从此有据可依。请求组装、持久化历史、回放全部共享这一份词汇表；适配器只负责把它翻译成各供应商的线上格式（翻译成本留在适配器层）。

## 怎么继续

三篇都偏类型手册，建议带着问题查：想知道「会话怎么落盘」看 `persistence.md`；想知道「压缩历史」看 `compaction.md`；想知道「工具怎么被守卫执行」回看[工具执行管线](/docs/tool-pipeline)。原文入口：[subsystems 目录](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/subsystems)。
