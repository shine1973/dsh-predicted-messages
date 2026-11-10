# DSH 预测消息

[English](README.en.md) · [反馈问题](https://github.com/shine1973/dsh-predicted-messages/issues)

在 DeepSeek Harness 输入框上方显示主模型提交的下一步消息草稿。点击只填入编辑器，由你编辑和发送。

> 下述功能已更新到 `main`，尚未发布新版 Release 安装包；包版本暂保留 0.1.6。已发布的 v0.1.6 仍采用独立预测请求，不包含主模型建议和手动按钮。更新详情见 [更新记录](CHANGELOG.md)。

## 安装 main 分支版本

在 DSH「插件 → 添加插件」中使用：

```text
git+https://github.com/shine1973/dsh-predicted-messages.git#main
```

按插件管理器提示重新加载或重启。已使用本地开发包 `@local/dsh-predicted-messages` 时，不要同时启用公开包，避免重复注册。

## 使用方式

主模型在合适的任务答复结尾调用 `predicted_messages`，提交零到两条简短草稿。成功完成本轮后，输入框为空且无附件时显示建议。主模型可以不提交；输入框附近的“生成建议”按钮始终保留，可手动申请。

点击“生成建议”会向当前会话发送一条可见用户请求，请主模型仅通过 `predicted_messages submit` 提出草稿，不执行草稿里的任务或修改设置。这会产生一轮主模型请求并消耗 Tokens；现有编辑器文字和附件保持不变。没有点击不会主动发送。会话运行、请求等待、显示开关关闭、权限不足或非普通会话时按钮禁用；当前不支持在子代理会话内手动申请。没有生成建议时提示可再次申请，不会自动重试。

点击建议使用 `captureInsertion` / `insertText` 比较并交换（CAS），保留用户已修改的草稿；点击建议本身不会发送消息。可隐藏本轮。显示开关位于 **插件 → 预测消息 → 显示预测消息**，修改后点击 **保存**，作用于当前 profile。

刷新生成入口已移除。打开历史、切换会话和读取状态不会发起预测请求。恢复同一会话可以显示其最后成功轮已持久化的建议；fork 继承的父会话建议不会显示为新会话建议。

## 数据与成本

插件不再调用独立 LLM，不读取 billion-context 摘要，也不使用 SessionManager。主模型直接利用它已有的对话上下文提出草稿。工具说明、工具调用、工具结果，以及工具调用后的主模型续写仍可能增加主对话 Tokens 和延迟；这不是零成本。

工具说明要求使用用户语言、不要虚构同意或授权。运行时验证格式，不能自动判断每条自然语言建议的事实或授权含义；草稿可能不准确，用户仍需审阅。

## 工具与兼容

```json
{"action":"submit","suggestions":["运行测试并解释结果。","介绍下一步的取舍。"]}
```

- `submit` 仅接受当前轮的主模型直接工具调用：最多两条不同的非空纯文本，每条最多 160 个 Unicode 码点；拒绝控制字符、以 `/` 开头的命令和未知字段。空数组清除本轮待显示建议。
- `status`（默认）只读已有建议。
- `configure` 要求布尔值 `enabled`，仅在用户要求时修改显示开关。
- 旧 `generate` 和 `refresh` 参数继续接受，但只返回当前状态，不生成、不刷新、不发请求。
- `/predicted-messages` 命令支持状态和配置，拒绝缺乏工具调用绑定的 `submit`。

旧 `provider`、`model`、`contextChars`、`summaryChars`、`totalChars`、`summaryOrigin`、`timeoutMs` 配置继续解析但忽略，不要求清理 profile。有效配置只有 `enabled`，默认 `true`。

工具执行上下文没有 turn 字段。插件使用实际 `tool/call` 的 turn、step、callId，并匹配 `tool/result` 的工具来源、非错误状态及提交回执中的 sessionId/turn/callId/草稿内容。只有 `turn/end.reason.kind === 'completed'` 才发布。它不信任助手消息内的同形 JSON 或单独工具参数。

新用户消息、inbox 变更、新轮、模型切换和 surface replacement 清除旧建议；失败、取消、中断、max-tokens、blocked、forked 结尾均不显示。surface replacement 采用保守清空，不把端点当作数值区间；本轮余下的建议可能因此缺失。投影 `stateVersion: 3` 强制重折叠旧缓存，跳过 fork 的 inheritedEventCount 前缀；不写自定义 session 事件。

当前支持具有标准 `tool/call` / `tool/result` 持久日志的直接工具路径。未核实 PTC 子调用日志契约，因此没有对应直接调用记录的提交会明确失败，不猜测归属。主模型未调用工具时，不提供后备模型预测。

## 本地开发与安装交接

需要 Node.js 22+；声明 DSH `>=0.2.2-rc.1 <0.3.0`。31 项回归测试已通过，覆盖持久化结果绑定、生命周期与组件交互。本机已验证插件加载、真实主模型提交和完成轮建议持久化；用户点击手动按钮已成功发送请求并触发提交工具。最终页面显示与草稿插入尚未完成视觉验收，自动测试不代表全平台验收。

```sh
npm ci --ignore-scripts
npm run check
npm test
npm pack --ignore-scripts
```

Cordis 是宿主提供的 optional peer；不要打包私有生产副本。本地源码没有构建步骤，客户端是惰性模块。使用 DSH `plugin_manager` 先列出准确包名与现有安装，再安装审阅后的本地包或目录；遵守管理器返回的 reload/restart 指示。该步骤会修改本机 profile，应由执行安装的代理完成。客户端更新后刷新现有 GUI 并验证，不能启动替代服务器冒充更新。

安装验收：检查新工具 schema；完成一次真实 `submit` 工具调用并结束本轮；确认最多两条建议只填草稿不发送；测试新轮、取消、切换、fork、显示开关，以及旧 generate 不发生模型请求。

- [index.js](index.js)：Host 注册、持久配置、命令、工具及投影 schema。
- [core.js](core.js)：纯函数 `validateInput(input = {})`、`initialState(header = {}, inheritedEventCount = 0)`、`foldContext(state, event)`；`PredictionRuntime` 只读投影和保存开关。
- [client.js](client.js)：建议条、CAS 插入与设置页。
- [test/core.test.js](test/core.test.js)：持久结果绑定及生命周期回归。

旧摘要实验的六个文件、完整 git diff、SHA256 清单和旧测试保存在仓库外的独立备份目录 `../dsh-predicted-messages-selector-backup-20261110/`。本分支删除摘要读取模块及其测试，保留备份以便独立复核。

[MIT License](LICENSE) · [更新记录](CHANGELOG.md)
