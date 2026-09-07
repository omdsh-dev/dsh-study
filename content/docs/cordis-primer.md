---
title: Cordis 五个核心思想：dsh 的地基
doc: docs/cordis-primer.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md
category: 架构
order: 3
summary: 读 dsh 任何源码前的前置知识：插件、context、依赖注入、类型化事件、可逆 effect。
---

Cordis 是 vendor 进 dsh 的插件框架（`vendor/` 目录，含同步流程说明）。这篇 primer 教的是「写一个 harness 插件之前必须懂的最小集合」。

## Cordis In Five Ideas

1. **插件是实现 Service 的对象**：可以是带 `inject` 和 `apply(ctx)` 字段的函数，也可以是 `Service` 子类，生命周期由 Cordis 挂载到当前 context。
2. **Context 是服务的仓库**：每个服务认领一个稳定的 `ctx.<key>`（如 `ctx.tools`、`ctx.llm`、`ctx.sessions`），其他插件**按键找服务**，而不是 import 具体实现。
3. **用 `inject` 声明依赖**：插件等到所需服务存在才启动——加载顺序靠服务需求表达，不需要手工编排启动顺序。
4. **类型化事件通信**：服务通过 TypeScript declaration merging 声明事件名，然后用五种模式之一派发：`emit`（观察）、`waterfall`（包裹）、`parallel`（扇出）、`serial`（顺序）、`bail`（首个终止）。
5. **注册即可逆 effect**：提示词段落、工具 schema、适配器、监听器都通过 `ctx.effect()` / `ctx.on()` 安装，重载和卸载时按序回退。

## 五种派发模式

| 模式 | 等待？ | 顺序 | 返回值 |
|---|---|---|---|
| `emit` | 否 | 注册序 | 无 |
| `waterfall` | 否 | 注册序 | 有 |
| `parallel` | 是 | 并行 | 无 |
| `serial` | 是 | 注册序 | 有 |
| `bail` | 否 | 注册序，遇 bail 停 | 有 |

派发模式是事件公开契约的一部分，dsh 里每个新事件都用 `@mode` 标签标注，生成的目录会校验声明与调用点一致。

## 两条最容易踩的实用规则

- **`waterfall` 就是 around 中间件**：监听器收到 `(...args, next)`，调 `next()` 委托下游，不调即短路。策略型监听器拥有决策权时短路；只做注记/观察的必须委托。
- **每个注册都要有 disposer**：要么从 `ctx.effect()` 返回一个，要么用自带清理的 helper。卸载顺序重要的工作放在同一个 effect 里。

## 怎么继续

官方配套了动手教程 `docs/cordis-tutorial/`（01-first-plugin → 02-lifecycle-and-effects → 03-services…）和 API 参考 `docs/cordis-api/`，全部有中文版。读完再去看[工具执行管线](/docs/tool-pipeline)会把所有概念串起来。
