---
title: 参与贡献：为什么这个仓库不接受外部 PR
doc: CONTRIBUTING.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md
category: 参与
order: 9
summary: 215k star 的仓库不开 PR？官方口径：代码不是唯一的贡献方式，生态才是。
---

CONTRIBUTING.md 开头就坦白：**我们目前无法接受外部 pull request**。对一个 20 万 star 的项目来说这相当罕见——但读完你会发现它的逻辑自洽：dsh 处于高速变化的 developer preview 阶段（本站提交流里每周都有破坏性重构），外部代码的质量与方向协调成本极高。

## 官方给出的参与方式

- **Issues → Discussions**：报告 bug、反馈问题都在 GitHub Discussions；可以给想被团队看到的讨论点赞（upvote）——官方明说团队很小、无法每帖必回，但会监控并据此分配资源。
- **做插件**：这是被鼓励的主航道。做出让你兴奋的插件并分享，给仓库打上 `dsh-plugin` topic 让别人发现。
- **写内容**：博客、教程、上手指南。
- **答疑**：在社区里帮助其他用户。

## 最有意思的一段立场

> 我们不相信官方仓库里的包天然比社区创建的包更重要。你可以把这个仓库当作一个**想法**、一个**官方示范**、一个**灵感来源**——而不是来自我们的指令。

这句话基本定义了 dsh 的生态哲学：官方仓库是「参考实现 + 插件标准示范」，真正的繁荣预期发生在仓库之外（`dsh-plugin` 生态）。文末的「Into the unknown.」是这个项目一贯的语气。

## 对观察者的启示

这也解释了本站「讨论动态」板块的存在：因为没有 Issues/PR，[Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)（5700+ 条）就是这个项目唯一的社区脉搏。想第一时间理解项目走向，Discussions 的 upvote 榜比 commit log 更接近「团队在想什么」。
