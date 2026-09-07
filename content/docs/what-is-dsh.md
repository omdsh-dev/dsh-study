---
title: dsh 是什么：从 README 看懂 DeepSeek Harness
doc: README.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md
category: 入门
order: 1
summary: 一分钟建立对 dsh 的第一印象：它是什么、怎么跑、处于什么阶段。
---

DeepSeek Harness（`dsh`）是 DeepSeek AI 开源的 **Agent Harness（智能体运行框架）**。官方一句话：基于 **everything-is-a-plugin（一切皆插件）** 架构，底层由 [Cordis](https://github.com/cordiverse/cordis) 插件框架驱动，设计理念来自论文《A Programming Paradigm for Spatiotemporal Composability》（[arXiv:2608.25512](https://arxiv.org/abs/2608.25512)）。

## 三件读完 README 就该知道的事

**1. 它处于 developer preview 阶段。** 官方用大写字母警告：会有破坏性变更（compatibility-breaking changes）。本站提交流里大量 `refactor`/`feat` 级别的变更也印证了这一点——这是一个「当着你的面长大」的项目，看它的演进过程本身就是学习素材。

**2. 跑起来只要一行命令。**

```sh
npx @deepseek-ai/dsh web
```

默认启动 Web UI 到 `127.0.0.1:3080` 并自动打开浏览器。从源码跑则是 clone + `pnpm install` + `pnpm run build` + `pnpm dsh web`。

**3. 社区不走 Issues/PR。** 反馈和 bug 走 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)，插件生态用 `dsh-plugin` topic 聚合，另有 Discord 社区。外部 PR 目前不被接受（详见[参与贡献导读](/docs/contributing)）。

## 怎么继续

- 想理解它为什么这样设计 → [架构总览导读](/docs/architecture)
- 想跑起来 → 官方 [Web UI 指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md)
- 想看它的工程实践 → [Agent Notes 导读](/docs/agent-notes)
