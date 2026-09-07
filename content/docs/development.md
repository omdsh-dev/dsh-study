---
title: 开发环境与仓库导览
doc: docs/development.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/development.md
category: 工程实践
order: 8
summary: 从零到 typecheck 通过：工具链版本、hooks、仓库目录结构的官方口径。
---

## 环境要求

- Node.js 22.19+ 或 24+（CI 覆盖 22.19 / 24 / 26）
- Corepack 启用的 pnpm（仓库在 `package.json` 里钉死 `pnpm@11.7.0`）
- Git 2.26+
- 可选：DeepSeek API key（跑 Web/headless/ACP 演示和真实 API e2e 测试用）

## 首次安装

```sh
pnpm install            # 根目录执行
pnpm run typecheck      # 通过即环境就绪
```

`pnpm install` 会顺带配置两件容易忽略的事：**worktree 本地的 Lefthook hooks**（注意：是 worktree 级而非全局 git 级，官方为此写了专门的[安全契约笔记](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/process/2026-07-27-worktree-local-lefthook.md)）和 **dsh-translation-pairing Git merge driver**（中英文档配对合并）。从缓存恢复依赖后如果缺了这两样，手动跑 `node scripts/install-lefthook.mjs`。

## 仓库目录速览

| 目录 | 内容 |
|---|---|
| `packages/` | 40+ 插件包（core/llm/tools/session/boot/bundle…），产品主体 |
| `apps/` | 独立应用（如 Electron 桌面端） |
| `docs/` | 架构与子系统文档（52 篇 subsystems + 教程 + 复盘） |
| `.agents/` | Agent Notes（907 篇设计决策）与 agent skills |
| `scripts/` | 校验与生成脚本（大量 CI 门禁的载体） |
| `vendor/` | vendored Cordis 框架及同步流程 |
| `python/` | Python SDK |
| `native/` | 原生组件 |
| `benchmarks/` | 基准测试 |
| `website/` | 官方文档站 |

## 这个仓库的工程气质

从开发指南就能读出整个项目的治理风格：**凡是重要约定，背后都有一篇 Agent Note 拥有其 rationale，且由一个 `scripts/` 下的校验脚本机械执行**。hooks 路径安全、翻译配对、应用入口防绕过（`verify-application-entrypoints`）、笔记格式……规则不是写在 wiki 里的君子协定，而是 CI 里的硬门禁。

下一步：跑起来之后从 [`docs/architecture.md`](/docs/architecture) 进入源码；遇到看不懂的约定，先去[设计笔记](/notes/)搜。
