# Changelog

## 0.1.8 — 2026-11-11 · 灰字、键盘与 PTC 修复

- 使用官方系统提示段提醒主模型在回复结束前提交一次建议；无建议提交空数组，尊重用户禁用建议和严格输出要求，不添加独立模型请求。
- 当前主会话空编辑器内显示第一条建议的只读灰字，最多三行；Tab 通过 CAS 填入第一条，Esc 隐藏本轮。保留按钮、IME、焦点、附件、修饰键及实时草稿保护，缺少接口时退回按钮。
- 支持 `run_code` 一级 PTC 子调用，严格关联成功子回执、成功根调用和 completed 轮次；拒绝未知嵌套父链。
- 修复正常每步 system-prompt 替换误清空当前轮次的问题；投影 v5 追踪单个系统节点，保留合法刷新前后的提交，其它历史替换仍保守清空。
- 49 项测试覆盖真实事件形状、真实 Cordis 挂载及组件交互；Node 24/26 通过。交互验收由用户确认通过，灰字截图由用户提供；未声称代理进行了浏览器视觉测试。

### English

- Add an enabled-aware turn-end reminder without a separate model request.
- Show read-only ghost text, adopt the first suggestion with Tab and dismiss with Esc, preserving CAS, IME, focus, attachment and modifier guards.
- Support first-level PTC submissions with durable child/root/turn correlation.
- Fix normal system-prompt refreshes clearing active-turn identity; projection v5 tracks the exact system node while other replacements remain conservative.
- Pass 49 tests on Node 24/26. Local interaction acceptance and the ghost-text screenshot were supplied by the user, not an agent-run browser visual test.

## 0.1.7 — 2026-11-10 · 主模型建议与手动生成按钮

- 改由当前会话主模型通过 `predicted_messages submit` 提交最多两条下一步草稿；移除独立预测模型请求和摘要读取。主模型可以不提交建议，工具说明、调用与续写仍消耗 Tokens。
- 输入框上方新增常驻“生成建议”按钮，无建议时也可使用。点击发送一条可见的会话请求，保留现有草稿和附件；运行中禁用，防止重复提交，失败显示错误且不自动重试。
- 建议与实际工具调用、会话及轮次绑定，仅在回复成功完成后显示；新轮、失败、取消、历史替换和 fork 不复用过期建议。
- 保留点击仅填草稿、CAS 草稿保护、隐藏本轮和插件设置开关。旧 `generate` / `refresh` 仅返回状态，旧模型及摘要配置接受但忽略。
- 31 项回归测试覆盖持久化绑定、生命周期、格式校验和真实组件交互；本机插件加载、真实主模型提交及完成轮持久化已验证。用户点击按钮已产生可见请求并成功调用提交工具；页面最终显示和实际草稿插入尚未完成视觉验收。
- 手动请求暂不支持子代理会话；PTC 子调用日志契约尚未核实，无匹配直接工具记录时拒绝提交。

### English

- Obtain optional drafts from the conversation model instead of a separate prediction or summary-reading pipeline.
- Add a persistent **Generate suggestions** button that sends an explicit conversation request while preserving composer text and attachments, with pending-state, access and duplicate-request guards.
- Bind suggestions to successful durable tool results and completed turns; preserve fill-only CAS insertion and clear stale state across lifecycle changes.
- Keep legacy configuration parseable and legacy generation actions read-only. Cover the implementation with 31 regression tests; browser visual acceptance remains outstanding.

These changes are included in v0.1.7. The older v0.1.6 archive retains the previous implementation.

## 0.1.6 — 2026-11-10

- Reuse exact-session active billion-context summaries through bounded read-only loopback GET; no additional summarization model calls.
- Preserve recent-text priority, configurable independent summary and serialized input budgets; discard stale context before model dispatch.
- Fail back to recent conversation on unavailable/incompatible API; guard identity, hierarchy, cancellation, size and timeout.


## 0.1.5 — 2026-11-10

- Upgrade Zod from 4.4.3 to 4.6.7, outside the affected range of GHSA-mrhx-c7xc-m3w5.
- Limit the actual session-state message array to ten items and bump its projection cache version so older checkpoints are rebuilt from the log.
- Add five compatibility tests for valid checkpoints, oversized arrays, history replay, tool input validation, and command outcomes.
- Verify live DSH loading and preference persistence with the upgraded dependency; production dependency audit reports zero known vulnerabilities at release time.

## 0.1.4 — 2026-11-10

- Declare Cordis as an optional host-provided peer instead of a production dependency, avoiding a private framework copy and the shared-package dependency warning.
- Keep Cordis only as a development dependency for standalone development checks.
- Verify DSH activation after removing the plugin-local Cordis package; add a regression guard for the dependency declaration.

## 0.1.3 — 2026-11-10

- Avoid model requests when opening, restoring, or revisiting completed historical conversations. Automatic predictions require a running reply observed in the currently open conversation followed by a newer completed revision; existing cached suggestions remain reusable.
- Align the suggestions with the composer by sharing its side-clearance and maximum-width CSS variables.
- Add eight trigger regressions covering cold history, loading, completion ordering, remounts, disabled state, failures, and replay.

## 0.1.2 — First public release

- Predict up to two next-user messages from the current conversation.
- Show suggestions in an independent area above the composer.
- Insert suggestions as editable drafts, with revision checks to preserve existing input.
- Refresh, hide, cache, and cancel superseded predictions.
- Place the persistent “Show predicted messages” switch on the plugin settings page.
- Hide the conversation bar when disabled, while typing, or without useful suggestions.
- Reuse configured DSH model routes; no additional API key setup.
- Include English/Chinese UI and documentation, MIT licensing, and core tests.
- Provide a GitHub Release archive with runtime files and exported plugin metadata.

Versions 0.1.0 and 0.1.1 were local development iterations and were not publicly released.
