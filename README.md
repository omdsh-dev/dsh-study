# dsh-study · DeepSeek Harness 演进史

一个跟踪 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（dsh，DeepSeek 开源的 "Everything is a Plugin" AI Agent 框架）开发过程的中文导览站。

**在线访问**：https://omdsh-dev.github.io/dsh-study/

> 非官方社区项目，与 DeepSeek 无隶属关系。提交摘要由 AI 生成，可能存在错误。

## 它提供什么

- **提交流**：master 全部 1.5 万+ 提交，每条附 AI 生成的中文「省流」摘要（重要性 1-5 评级 + 类别分类），点开即可读 diff（锁文件/快照等噪音已过滤）
- **Worktree 浏览器**：拖动时间轴翻到任意提交时刻，浏览当时的目录树和文件原文
- **设计笔记**：dsh 独有的 Agent Notes 机制产生的 900+ 篇设计决策记录（含被拒绝的提案），支持中英双语阅读
- **文档导读**：为 README、架构总览、工具管线、Agent Notes 等重要文档撰写的中文导读
- **统计 / 里程碑 / 讨论动态**：提交热力图、贡献者与模块分布、版本发布时间线、社区脉搏

## 数据怎么来

```
git 裸仓库（weekly fetch）
  → scripts/extract.mjs        全量提取提交元数据/过滤后 diff/文件树 checkpoint+delta（本地 git，零 API 限额）
  → scripts/extract-notes.mjs  Agent Notes 索引（git cat-file --batch）
  → scripts/build-search-index.mjs
  → scripts/github-meta.mjs    stars/releases/discussions 快照
  → scripts/summarize.mjs      DeepSeek API 逐提交生成省流（幂等可续跑，只补缺失）
  → scripts/compress.mjs       全部数据分片 gzip（825MB → 205MB）
  → Astro 静态构建 → GitHub Pages
```

站点数据全部为静态分片（`public/data/**.json.gz`），前端按需懒加载；历史文件内容直接从 GitHub raw CDN 拉取，无需任何服务端。

## 本地开发

```sh
pnpm install
cp .env.example .env          # 填入 DEEPSEEK_API_KEY
node scripts/sync.mjs         # 全量同步 + 构建
pnpm preview
```

每周一由 GitHub Actions 自动同步一次上游；也可在 Actions 页手动触发（workflow_dispatch）。

## License

代码 MIT；站点内容（导读、摘要文本）CC BY 4.0。上游仓库版权归 DeepSeek 及其贡献者所有。
