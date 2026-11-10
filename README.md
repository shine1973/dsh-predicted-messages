# DSH 预测消息

[English](README.en.md) · [下载首发版](https://github.com/shine1973/dsh-predicted-messages/releases/tag/v0.1.2) · [反馈问题](https://github.com/shine1973/dsh-predicted-messages/issues)

一个 DeepSeek Harness（DSH）插件：根据当前对话预测你接下来可能发送的消息，点击建议即可填入可编辑草稿。

- 每轮回复完成后，输入框上方显示最多两条建议。
- 点击只填入草稿，由你编辑和发送，不自动发送消息。
- 支持刷新、隐藏本轮；输入文字或切换会话时取消过期预测。
- 开关放在 **插件 → 预测消息 → 显示预测消息**，调整后点击 **保存**。
- 关闭功能、正在输入或没有建议时，聊天区不保留空条。
- 默认复用当前会话模型，无需单独填写 API Key；支持中英文界面及宿主明暗主题。

这是独立社区插件，与 OpenAI Codex 无隶属关系。

## 安装

需要已配置可用模型的 DSH。首发版在 **DSH 0.2.2-rc.1 / macOS Desktop** 上开发和使用，其他平台尚未进行完整界面验收。包声明支持 `>=0.2.2-rc.1 <0.3.0`；DSH 接口变化可能需要更新插件。

### 从 Release 安装（推荐）

打开 DSH 侧栏 **插件 → 添加插件**，粘贴以下地址并安装：

```text
https://github.com/shine1973/dsh-predicted-messages/releases/download/v0.1.2/dsh-predicted-messages-0.1.2.tgz
```

也可以下载 Release 中的 `.tgz` 文件，让 DSH 从该文件的绝对路径安装。安装时需要联网下载运行依赖，安装包不含 `node_modules`，也不包含安装脚本。

### 从 GitHub 安装

已安装 Git 时，可在“添加插件”中填写固定版本：

```text
git+https://github.com/shine1973/dsh-predicted-messages.git#v0.1.2
```

或者直接对 DSH 说：

> 请安装这个插件：git+https://github.com/shine1973/dsh-predicted-messages.git#v0.1.2

首发通过 GitHub 分发，不要求 npm 账号。Agent 可以通过 `plugin_manager` 的 `install_bundle` 操作安装上述地址。若 DSH 报告需要重启，按其提示重启。

之前装过开发版 `@local/dsh-predicted-messages` 的用户，应先停用或卸载开发版，再安装公开版，避免重复注册同名工具。

## 使用

1. 安装后打开任意有对话内容的会话，完成一轮问答。
2. 保持输入框为空，等待输入框上方出现建议。
3. 点击建议，按需要编辑，再正常发送。
4. **刷新**重新预测；**隐藏本轮**收起当前建议。
5. 要关闭自动预测，进入 **插件 → 预测消息**，关闭 **显示预测消息**，点击 **保存**。

生成主回复时、输入框包含文字或附件时，不会自动发起预测。失败会显示错误；模型认为没有合适的后续消息时，可以不提供建议。

## 模型与数据

每次预测会额外请求一次已有模型，消耗相应的模型配额。插件选择该模型支持的最低推理档位，默认 30 秒超时；同一轮缓存结果，避免重复请求。手动刷新有两秒冷却。

预测上下文只包含实际用户文字和每轮最后保留的助手文字，最多 10 条，每条最多 6,000 字符，总预算默认 12,000 字符。不传思考内容、工具结果、图片或完整系统提示。文字会通过 DSH 现有模型路由发送给你配置的提供方；本插件不新增第三方分析服务，不读取或保存 API Key。

建议是模型生成的草稿，可能不符合你的意图；采用后仍可以编辑，不会自动授权或执行建议内容。

## 配置

“显示预测消息”开关通过 DSH 的配置接口保存，作用于当前 profile 的所有会话。高级字段由 DSH 的插件配置系统管理：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `enabled` | `true` | 自动预测开关 |
| `provider` | 空 | 预测模型提供方；空则跟随会话 |
| `model` | 空 | 预测模型；必须与 `provider` 同时填写 |
| `contextChars` | `12000` | 总字符预算，范围 1,000–20,000 |
| `timeoutMs` | `30000` | 请求超时毫秒数，范围 5,000–60,000 |

插件包名为 `dsh-predicted-messages`。配置行 ID 保留为 `local-predicted-messages`，便于沿用开发版配置；插件不直接改写 profile 文件。

Agent 工具 `predicted_messages` 与命令 `/predicted-messages` 支持以下参数：

```json
{"action":"status"}
```

```json
{"action":"configure","enabled":false}
```

```json
{"action":"generate","refresh":true}
```

会话仍在运行或没有完成的回复时，`generate` 返回 `busy`，不调用模型。

## 本地开发

要求 Node.js 22 或更新版本。

```sh
git clone https://github.com/shine1973/dsh-predicted-messages.git
cd dsh-predicted-messages
npm ci --ignore-scripts
npm run check
npm test
npm pack --ignore-scripts
```

将项目目录交给 DSH 的 `plugin_manager` 安装即可开发。目录安装使用链接，安装后不要移动或删除该目录。修改客户端后需让 DSH 重新加载对应插件；修改 Host 代码后遵循管理器的重启提示，不以页面刷新代替 Host 重启。

- [index.js](index.js)：Host 服务、配置、命令与工具。
- [core.js](core.js)：会话投影、上下文预算、请求、缓存与取消。
- [client.js](client.js)：建议条和插件设置页。
- [test/core.test.js](test/core.test.js)：关键行为测试。

自动测试覆盖上下文边界、缓存、取消、过期结果和错误处理；GitHub Actions 检查 Node.js 22/24。自动测试不等同于所有 DSH 版本和平台上的界面验收。

## 反馈与许可

遇到问题请在 [Issues](https://github.com/shine1973/dsh-predicted-messages/issues) 中附上 DSH 版本、插件版本、模型提供方和复现步骤。分享截图或日志前请去掉 API Key 和私人对话。

[MIT License](LICENSE) · [更新记录](CHANGELOG.md)
