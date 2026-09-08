---
title: 插件开发实战：从一个工具到一条完整的插入路径
doc: docs/cookbook/adding-a-tool.md · docs/user/develop/ · docs/cordis-tutorial/
upstream: https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/cookbook
category: 参与
order: 17
summary: 给 dsh 写插件的推荐路径：先跑通教程，再按 cookbook 的契约清单写生产级工具。
---

想在 dsh 上做插件（官方明确鼓励、用 `dsh-plugin` topic 聚合生态），文档给了三层材料：教程（手把手）、cookbook（契约参考）、生产范例（仓库里的包）。

## 第一步：跑通教程

`docs/cordis-tutorial/`（01-first-plugin → 02-lifecycle-and-effects → 03-services…）带你用最小插件走一遍 [Cordis 五个核心思想](/docs/cordis-primer)：声明 `name` / `inject` / `apply`，注册一个可逆 effect，理解为什么「每个注册都要有 disposer」。`docs/user/develop/basic/` 里还有一份有序的「Build a tool」教程——**第一次写工具请走这条路**。

## 第二步：照着最小形状写工具

cookbook 的 `adding-a-tool.md` 给出工具的完整契约，骨架只有二十行：

- `name` / `inject: ['tools']` / `apply(ctx)`——插件三件套，靠 `inject` 等工具注册表就绪
- `defineTool({...})`：`description` 是给模型看的；`parameters` 是模型可见的参数 schema
- **`output` 是强制的**：`schema` 约束规范返回值 + 纯函数 `render` 把值投影成内容块（给模型/给 UI 的呈现分离，见[核心子系统](/docs/subsystems-core)）
- `execute(args, exec)`：`args` 依 schema 生成 **TypeScript 类型**；`exec.signal` 是取消信号，异步工作必须观察它

生产级三包范例是 `packages/shell/tool-bash`——工具定义、能力 Service、本地 Provider 分包，展示真实规模的组织方式。

## 第三步：理解你的工具会被怎么对待

写完不是终点：你的工具会进入[工具执行管线](/docs/tool-pipeline)——`tools/pre-execute` 瀑布、单调守卫、审批、超时重试、`post-execute` 瀑布。契约清单里那些「必须声明 `output`」「必须处理 signal」的规矩，都是在为这条管线服务。

## 周边材料

- [cookbook 目录](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/cookbook)：加包、加 LLM 适配器、加设置卡、vendored 包处理
- [cordis-api/](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/cordis-api)：fiber/service/registry 等运行时参考
- 生态发布：给仓库打 `dsh-plugin` topic（见[参与贡献](/docs/contributing)）
