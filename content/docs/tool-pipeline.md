---
title: 工具执行管线：三段瀑布把安全缝进循环
doc: docs/tool-execution-pipeline.md
upstream: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-execution-pipeline.md
category: 架构
order: 5
summary: 从模型吐出 tool-call 到结果落账，dsh 如何用 pre/execute/post 三段瀑布插入策略、沙箱与审批。
---

同样是 `gen-doc-graphs` 生成，一张 flowchart 画完工具执行的完整路径。核心结论先说：**管线的每个环节都是事件瀑布，不改循环代码就能换掉任意一环。**

## 一条 tool-call 的旅程

1. **执行前先落账**：模型消息里出现 tool-call 块 → session 事件 `tool/call` 先写入日志（审计优先），UI 同步展示 pending 卡片。
2. **`tools/pre-execute` 瀑布**：hooks、权限、沙箱在这里运行。
3. **单调守卫（monotonic guards）**：注册式守卫只能 deny 或 abstain，身份保护不可绕过。
4. **审批**：`ctx.approval` 一次性提示——审批者缺席或未应答，一律拒绝（fail-closed）。
5. **`tools/execute` 瀑布**（around 派发）：超时、重试、指标包裹真正的 `execute()` 函数体。
6. **文件系统意图门**：tool-fs 类变更必须经过 `fs/write-intent` / `fs/edit-intent`。
7. **`tools/post-execute` 瀑布**：接受、阻止、替换、附加上下文——结果给模型前还有最后一道闸。
8. **收尾**：注册表外层归一化（快照抛错转 isError）→ `ToolDefinition.finalizeContent` 做最后的内容不变量 → `tools/result` 同步通知「冻结的权威结果」→ session 事件 `tool/result` 落账。

## 设计上最值得学的三点

- **三段瀑布都可能变换调用**（transform a call），但守卫是单调的：只能收紧不能放松，权限模型因此可推理。
- **审批缺席 = 拒绝**：自动化场景下审批者可能根本不存在，dsh 选择 fail-closed 而不是 fail-open。
- **结果也有不变量**：`finalizeContent` 和冻结的 `tools/result` 保证「模型看到的最终结果」只有一个权威版本，UI 展示与落账内容不会漂移。

配合 [SAFETY.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)（官方明说沙箱不保证隔离、别当唯一安全控制）和[能力接缝](/docs/capability-seams)一起读，能看懂 dsh 的安全叙事：不是靠一个大沙箱，而是把决策点拆散缝进管线的每个接缝。
