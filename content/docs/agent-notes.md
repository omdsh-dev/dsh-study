---
title: Agent Notes：把「为什么」写成一级资产
doc: .agents/notes/README.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/README.md
category: 工程实践
order: 7
summary: dsh 最独特的机制：每个非平凡变更强制附决策笔记，生命周期与分类全部路径编码，含中英双语。
---

如果说 dsh 的代码架构值得学，它的**决策记录机制**更值得抄。官方规则一句话：**每个非平凡变更必须在同一个 PR/变更中新增或更新至少一篇 Agent Note**。「非平凡」的判定：改变了行为、架构、跨文件契约、流程工具、测试策略、磁盘/线上/配置格式……纯机械改动才豁免。

## 笔记记录什么

代码和文档装不下的部分：决策的 **why**、**放弃了什么**（alternatives）、后果、以及「什么情况下应该重新引入被否决的方案」。一篇笔记永远不会被改写成另一个决策——要推翻就新写一篇并互相链接。

## 路径即元数据

每篇笔记的路径自带三段信息：

```
{lifecycle}/{class}/yyyy-mm-dd-topic-title.md
```

**生命周期**（顶层目录，状态变化 = 移动目录）：

- `proposed/` 提案，未实现（本站收录 22 篇）
- `implemented/` 已落地，且**随代码保持更新**（代码里改了文件名/包名/默认值，同一变更里同步改笔记）——244 篇
- `rejected/` 被否决，仅在「防止再犯」的价值存在期间保留——14 篇
- `archived/` 已冻结的历史档案，永久只读，有校验脚本保证不被篡改——627 篇

**分类**（二级目录，封闭集合）：`feature` / `bug-fix` / `simplification` / `architecture` / `process` / `testing`。注意没有 `refactor`——被刻意并入 `simplification`（判别式：可观察行为是否变化）。

**日期**是主题**首次提出**的时间（按 git 历史定）。

## 一致性是机械可校验的

- 笔记要求中英双语成对（`.md` + `.zh.md` + `.i18n.yaml` 哈希对账文件），`verify-translation-pairing` 校验一致性，Git merge driver 自动处理配对合并。
- `scripts/verify-agent-note-format.ts` 强制统一的文件头格式（`# Agent Note: 标题` + `Status:` 行）。
- 归档有三重校验：类封闭树、完整三件套、append-only 冻结清单。
- 笔记之间的交叉引用必须用相对 markdown 链接（不用裸文字），链接可机械检查、目录移动时自动修复。

## 为什么值得抄

传统项目的 ADR（Architecture Decision Record）往往「写完即腐」：决策变了没人更新，链接烂掉，最后没人信。dsh 的解法是把笔记**编入强制的变更流程**并用 CI 校验器包围——文档不是代码的附庸，而是和代码同权重的交付物。本站「[设计笔记](/notes/)」板块就是这 907 篇笔记的中文导览。

官方还有一篇 [no-index 笔记](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/process/2026-07-19-remove-generated-agent-note-index.md)解释为什么不建总索引：活跃生命周期目录树本身就是工作清单。
