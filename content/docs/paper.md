---
title: 设计论文导读：时空可组合性——Cordis 的理论基础
doc: A Programming Paradigm for Spatiotemporal Composability (arXiv:2608.25512)
upstream: https://arxiv.org/abs/2608.25512
category: 架构
order: 13
summary: dsh README 引用的论文：把「效果」（effect）与「余效果」（coeffect）两个经典概念搬进运行时，给插件系统一个形式化地基。
---

dsh 的 README 一开头就引用了这篇论文——它不是装饰，而是 Cordis 框架（因此也是整个 dsh）的数学地基。

## 两个正交维度

论文指出，现代软件（插件系统、自进化 agent harness）需要动态组合，但形式化基础薄弱，于是把问题拆成两个正交维度：

- **时间可组合性（temporal composability）**：一个组件被移除时，它的副作用能被**完全回滚**。做法是把经典「效果系统」的 effect 概念提升到运行时——**可回滚效果（revertible effects）**：上下文的每一次变换都携带一个由运行时持有的逆变换。
- **空间可组合性（spatial composability）**：组件间的依赖可以被声明并**响应式管理**。做法是提升 coeffect 概念——**响应式余效果（reactive coeffects）**：上下文的每次变化都会对照组件的 coeffect 规格做分类，从而驱动它的激活与停用。

## 对应到 dsh 里是什么

如果你读过[架构总览](/docs/architecture)和 [Cordis 入门](/docs/cordis-primer)，会发现一一对应：

| 论文概念 | Cordis/dsh 机制 |
|---|---|
| revertible effects | 「注册即可逆 effect」：插件卸载时按逆序回退所有注册 |
| reactive coeffects | `inject` 声明依赖：所需服务出现/消失驱动插件挂载/卸载 |
| 上下文变换 | context 的服务挂载/移除 |
| 组件 | 插件 |

所以「每个注册都有 disposer」不是工程洁癖，而是**时间可组合性的定义要求**；「依赖靠声明而非 import」是空间可组合性的落地。这也解释了 dsh 为什么能做到热重载、按 profile 任意组合而不留残渣。

## 怎么读

论文偏形式化，建议的顺序：先读[摘要](https://arxiv.org/abs/2608.25512)和引言 → 回来看 [Cordis 五个核心思想](/docs/cordis-primer)对照机制 → 再回论文看形式化定义。工程读者读完前两步就能获得 80% 的价值。
