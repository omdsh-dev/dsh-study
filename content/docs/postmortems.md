---
title: 事故复盘导读：五份公开的 postmortem 讲了什么
doc: docs/postmortem/
upstream: https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/postmortem
category: 工程实践
order: 14
summary: 一个开源 agent 框架把故障复盘写成公开文档：三份代表性复盘的故事与共性教训。
---

开源项目公开 postmortem 并不常见，dsh 一口气放了五篇（每篇中英双语），且格式极其正规：Executive summary → Impact → Timeline（带 session 事件序号）→ Root cause → 修复与测试改进。这是「开发过程」最原始的史料。

## 0001：100% 覆盖率为什么没拦住崩溃

ACP 服务（接入 Zed 编辑器的协议桥）一连接就崩，但测试套件 178 个用例全绿、行覆盖 100%。真相是**两个独立 bug 藏在同一个报错字符串后面**：一个多余的 `export default apply` 让 Loader 丢掉了插件的 `inject`；一个可选服务查找在 shadow 边界上失败。根本教训：**所有测试都走「手工挂载」路径，没有一个用真实 Loader 加载**——修复方案是增加「无 key 的真实 Loader 覆盖」和包级导出规则。

## 0003：Agent 改了 GUI，却验证了另一个服务器

一次内部 dogfood：Web agent 改了主题源码，但不知道自己会话所在的 URL 和进程。它让用户自己验收 → 启动裸 Vite 看到 HTTP 200 就宣布成功（实际白屏）→ 又起了个**替代服务器**在别的端口验证——而用户原来那个页面早已加载了新构建。复盘从持久化的 session 事件日志逐序号还原时间线。修复：把「当前 URL 和运行时模式」做成模型可见、shell 可查；裸 Vite 在 listen 前就被拒绝；生产刷新与开发 HMR 必须对照外部状态验证。

**这篇对每个做 AI 编程工具的人都是必读**：LLM agent 的失败不是能力问题，而是「验收目标」没有在环境里显式存在。

## 0004：一个子字符串匹配引发的误诊

老内核上 Landlock 沙箱会打印一条**无害的**部分启用通知，而启动器的失败判定只是一个 `landlock-run: ` 前缀匹配 + 非零退出码——于是 ripgrep「无匹配」的正常 exit 1 被报成 `SANDBOX_UNAVAILABLE`。修复：分类必须「先精确排除信息性输出，再看状态门控的致命证据」；文件系统搜索改走 subprocess 接缝的打包 ripgrep，不再穿越沙箱 bash。

## 共性教训

- 三个故障都是「**契约在实现里被简化**」：真实 Loader → 手工挂载；验收目标 → HTTP 200；启动器契约 → 子字符串匹配
- 修复都以「新增 assembled keyless 场景测试」收尾——测试必须走真实装配路径
- 时间线精确到 session 事件序号，因为 dsh 的会话日志本来就是只增事件流（见[架构总览](/docs/architecture)）

建议读[原文合集](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/postmortem)（每篇 10 分钟），配合本站提交流里对应 PR 号前后的 diff 食用。
