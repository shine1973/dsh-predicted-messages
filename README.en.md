# DSH predicted messages

[简体中文](README.md) · [Issues](https://github.com/shine1973/dsh-predicted-messages/issues)

Display optional next-message drafts submitted by the conversation model above the DeepSeek Harness composer. Selecting one fills an editable draft and never sends it.

> These changes are available on `main`, but no new Release archive has been published. The package version remains 0.1.6; the published v0.1.6 still makes separate prediction requests and does not contain model-submitted suggestions or the manual button. See the [changelog](CHANGELOG.md).

## Install the main branch

In DSH **Plugins → Add plugin**, use:

```text
git+https://github.com/shine1973/dsh-predicted-messages.git#main
```

Follow the plugin manager's reload or restart instructions. Do not enable the public package alongside the local `@local/dsh-predicted-messages` development package, which would register the same functionality twice.

## Use and cost

Near the end of a task reply, the model may call `predicted_messages` with zero to two short drafts. Suggestions appear only after a successfully completed turn, while the composer is empty and has no attachments. A persistent **Generate suggestions** button remains beside the composer, even without suggestions. **Hide this round** dismisses the suggestions.

Clicking **Generate suggestions** sends a visible user request to the current conversation model, asking it only to submit drafts rather than execute the proposed tasks or change settings. This starts a conversation turn and uses tokens. Existing composer text and attachments remain untouched. Nothing is sent automatically. The button is disabled while the conversation or an admission request is pending, when the display switch is off, without prompt access, or inside a subagent session (manual requests currently support ordinary sessions only). A completed turn without suggestions can be retried explicitly; there is no automatic retry. The saved display switch remains under **Plugins → Predicted messages → Show predicted messages**.

Insertion uses `captureInsertion` and `insertText` CAS to preserve a changed draft. There is no automatic send and no refresh-generation button. Opening history or switching sessions makes no prediction request. Same-session restoration may show persisted suggestions from its last completed turn; a fork never inherits the parent's suggestions as its own.

The plugin makes no separate LLM request, reads no billion-context summaries, and does not use SessionManager. Tool instructions, calls, results and the main model's continuation can still add conversation tokens and latency. This is not zero-cost. Tool instructions prohibit invented consent or authorization; format validation cannot establish the truth or intent of natural-language drafts, so users should review them.

## Tool contract

```json
{"action":"submit","suggestions":["Run the tests and explain the results.","Explain the next step's tradeoffs."]}
```

- `submit`: current-turn direct model tool calls only; zero to two distinct plain-text drafts, at most 160 Unicode code points each. Nonempty entries are required; control characters, slash commands and unknown fields are rejected. An empty array clears pending suggestions.
- `status` (default): read existing suggestions.
- `configure`: requires boolean `enabled`; change the profile display preference only when the user requests it.
- Legacy `generate` and `refresh` remain accepted but only read state, with no request or regeneration.
- `/predicted-messages` supports read/configure operations and rejects unbound `submit` calls.

Only `enabled` has an effect, defaulting to true. Legacy `provider`, `model`, `contextChars`, `summaryChars`, `totalChars`, `summaryOrigin` and `timeoutMs` remain accepted and ignored for migration compatibility.

## Durable binding and limits

Tool execution has no turn field. The projection correlates the actual `tool/call` turn/step/callId with a successful `tool/result`, including tool provenance and matching sessionId/turn/callId/drafts in the receipt. Assistant JSON or tool arguments alone cannot publish suggestions. Publication requires `turn/end.reason.kind === 'completed'`.

New user messages, inbox mutations, new turns, model changes and surface replacements clear old suggestions. Aborted, failed, blocked, max-token, interrupted and forked endings remain hidden. Surface replacements conservatively clear state rather than interpreting endpoints as numeric ranges; useful suggestions may consequently be omitted for that turn. Projection stateVersion 3 refolds old checkpoints and ignores the fork-inherited prefix. No custom session events are written.

Only the standard durable direct `tool/call` / `tool/result` path is supported. PTC sub-dispatch events have not been verified; submissions without a matching direct call fail explicitly. There is no fallback model request when the main model omits a submission.

## Develop and installation handoff

Requires Node.js 22+. Declared DSH range: `>=0.2.2-rc.1 <0.3.0`. All 31 regression tests pass, covering durable binding, lifecycle and component interactions. Local Host loading, real model submission and completed-turn persistence were verified. A user clicked the manual button and its visible request successfully triggered the submission tool. Final browser display and draft insertion have not received visual acceptance; automated tests do not establish compatibility across platforms.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm pack --ignore-scripts
```

Cordis remains a host-provided optional peer. There is no source build step; the client is a lazy module. Before installing, list the exact installed bundle with DSH `plugin_manager`, then install the reviewed local package/directory and follow its reload/restart guidance. Installation changes the local profile and is a separate handoff step. Refresh and verify the existing GUI; do not start a replacement server.

Acceptance: inspect the new schema; submit through a real tool call and complete the turn; verify two-draft limits and fill-only behavior, new-turn/cancellation/switch/fork isolation, settings, and legacy generate making no model request.

- [index.js](index.js): Host registration, settings, command, tool and projection schemas.
- [core.js](core.js): pure `validateInput(input = {})`, `initialState(header = {}, inheritedEventCount = 0)`, `foldContext(state, event)` and the read/configure runtime.
- [client.js](client.js): composer dock, CAS insertion and settings.
- [test/core.test.js](test/core.test.js): durable-result and lifecycle regressions.

The previous selector experiment, its six files, complete git diff, SHA256 manifest and old tests are preserved outside the repository in `../dsh-predicted-messages-selector-backup-20261110/`. The summary reader and its tests are removed from the new architecture.

[MIT License](LICENSE) · [Changelog](CHANGELOG.md)
