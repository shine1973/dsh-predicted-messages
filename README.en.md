# DSH predicted messages

[简体中文](README.md) · [Issues](https://github.com/shine1973/dsh-predicted-messages/issues)

Display optional next-message drafts submitted by the conversation model above the DeepSeek Harness composer. Selecting one fills an editable draft and never sends it.

> v0.1.8 includes turn-end reminders, Tab/Esc, editor ghost text and first-level PTC support. The older v0.1.6 uses separate prediction requests. See the [changelog](CHANGELOG.md).

## Install v0.1.8 (recommended)

In DSH **Plugins → Add plugin**, paste:

```text
https://github.com/shine1973/dsh-predicted-messages/releases/download/v0.1.8/dsh-predicted-messages-0.1.8.tgz
```

Alternatively use the fixed Git tag `git+https://github.com/shine1973/dsh-predicted-messages.git#v0.1.8`. Installation downloads runtime dependencies; the archive contains no `node_modules` or install scripts.

## Install the main branch

In DSH **Plugins → Add plugin**, use:

```text
git+https://github.com/shine1973/dsh-predicted-messages.git#main
```

Follow the plugin manager's reload or restart instructions. Do not enable the public package alongside the local `@local/dsh-predicted-messages` development package, which would register the same functionality twice.

## Use and cost

Near the end of a task reply, the model may call `predicted_messages` with zero to two short drafts. Suggestions appear only after a successfully completed turn, while the composer is empty and has no attachments. A persistent **Generate suggestions** button remains beside the composer, even without suggestions. **Hide this round** dismisses the suggestions.

Turn-end reminder: while enabled, an official `systemPrompt.section` asks the model to check once before each final reply and call `submit` once, using an empty array when nothing is useful. An existing submission must not be repeated; failures must not trigger retries or block the reply. Explicit user requests for no suggestions or an exact output format take precedence. The section becomes empty when disabled and is disposed with the plugin. User-language, no invented authorization and fill-only constraints remain in the tool description. This prompt-level rule cannot guarantee compliance; it sends no automatic user message and calls no independent model.

Clicking **Generate suggestions** sends a visible user request to the current conversation model, asking it only to submit drafts rather than execute the proposed tasks or change settings. This starts a conversation turn and uses tokens. Existing composer text and attachments remain untouched. Nothing is sent automatically. The button is disabled while the conversation or an admission request is pending, when the display switch is off, without prompt access, or inside a subagent session (manual requests currently support ordinary sessions only). A completed turn without suggestions can be retried explicitly; there is no automatic retry. The saved display switch remains under **Plugins → Predicted messages → Show predicted messages**.

Keyboard controls: in the focused current main-session editor, with an empty draft, no attachments and visible adoptable suggestions, **Tab** fills the first draft and **Esc** hides the round. Keyboard handling rereads live input, attachments, session and projection before using the same CAS; a failed insert leaves Tab unconsumed. Composition, modifiers including Shift+Tab, repeat, consumed events, modals and other focused controls retain their original behavior. The official `shortcuts.observeFixedInput` subscription is removed on session switch/unmount. A narrow DOM adapter checks the same composer/editor ownership; missing APIs or markers and other embedded views fall back to buttons. There is no ArrowRight binding.

The first existing, adoptable suggestion also appears as read-only ghost text in the current main-session editor. The official `conversation.input.overlay` slot aligns it with the editor's position and font, responds to resize/scroll, and clips it to at most three lines within the existing editor height. It never changes the draft or editor height, generates suggestions, or sends a message. Typing, composition start, attachments, hiding the round, running or switching sessions clear it immediately. Only while visible, scoped CSS hides the same card's placeholder; removal restores its normal display rules without editing inline styles. Missing APIs/DOM markers and other views retain the buttons.

Insertion uses `captureInsertion` and `insertText` CAS to preserve a changed draft. There is no automatic send and no refresh-generation button. Opening history or switching sessions makes no prediction request. Same-session restoration may show persisted suggestions from its last completed turn; a fork never inherits the parent's suggestions as its own.

The plugin makes no separate LLM request, reads no billion-context summaries, and does not use SessionManager. Tool instructions, calls, results and the main model's continuation can still add conversation tokens and latency. This is not zero-cost. Tool instructions prohibit invented consent or authorization; format validation cannot establish the truth or intent of natural-language drafts, so users should review them.

## Tool contract

```json
{"action":"submit","suggestions":["Run the tests and explain the results.","Explain the next step's tradeoffs."]}
```

- `submit`: bound current-turn direct model calls or first-level PTC child calls; zero to two distinct plain-text drafts, at most 160 Unicode code points each. Nonempty entries are required; control characters, slash commands and unknown fields are rejected. An empty array clears pending suggestions.
- `status` (default): read existing suggestions.
- `configure`: requires boolean `enabled`; change the profile display preference only when the user requests it.
- Legacy `generate` and `refresh` remain accepted but only read state, with no request or regeneration.
- `/predicted-messages` supports read/configure operations and rejects unbound `submit` calls.

Only `enabled` has an effect, defaulting to true. Legacy `provider`, `model`, `contextChars`, `summaryChars`, `totalChars`, `summaryOrigin` and `timeoutMs` remain accepted and ignored for migration compatibility.

## Durable binding and limits

Tool execution has no turn field. The projection correlates the actual `tool/call` turn/step/callId with a successful `tool/result`, including tool provenance and matching sessionId/turn/callId/drafts in the receipt. Assistant JSON or tool arguments alone cannot publish suggestions. Publication requires `turn/end.reason.kind === 'completed'`.

New user messages, inbox mutations, new turns, model changes and surface replacements clear old suggestions. Aborted, failed, blocked, max-token, interrupted and forked endings remain hidden. Surface replacements conservatively clear state without treating endpoints as numeric ranges. The only preserving exception is a current-turn official system-prompt message replacing exactly the previously tracked single system node, so normal per-step prompt refreshes retain call identity and submitted drafts. Unknown or multi-node replacements and replacements of tool evidence still clear state; a system message cannot restore a cleared turn. Projection stateVersion 5 refolds old checkpoints. The fork-inherited prefix tracks only system-node identity, never suggestions or calls. No custom session events are written.

Both standard direct calls and first-level PTC children of `run_code` are supported. Official `tool/ptc-dispatch-start` events bind identity/arguments; successful `tool/ptc-dispatch` receipts must match a current root's opaque rootCallId/parentCallId. Child drafts remain staged until that root succeeds, then wait for the completed turn. A failed root cannot publish its children. Across roots, child receipt sequence determines the latest submission, including empty arrays. Neither program source nor stdout is parsed; historical failures are not rewritten or retried. Nested or unknown parent chains fail closed. State retains at most 16 roots and 16 unsettled submissions, with 64 submission IDs per root; overflow is conservatively skipped. There is no fallback model request when the main model omits a submission.

## Develop and installation handoff

Requires Node.js 22+. Declared DSH range: `>=0.2.2-rc.1 <0.3.0`. All 49 regression tests cover durable binding, system-prompt refresh, PTC, keyboard, ghost text and component mounting, passing on Node 24/26. The user confirmed local interaction acceptance and supplied a ghost-text screenshot. This is user validation, not an agent-run browser visual test or cross-platform certification.

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
