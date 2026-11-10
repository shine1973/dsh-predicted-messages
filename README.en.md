# DSH predicted messages

[简体中文](README.md) · [Download](https://github.com/shine1973/dsh-predicted-messages/releases/tag/v0.1.6) · [Issues](https://github.com/shine1973/dsh-predicted-messages/issues)

A community plugin for DeepSeek Harness (DSH) that predicts your next message from the conversation. Suggestions appear above the composer; selecting one fills an editable draft and never sends it automatically.

## Features

- Up to two suggestions after a new reply completes in the currently viewed conversation, using its model.
- Opening or revisiting completed history only reads cached results; it never automatically spends model quota.
- Suggestions share the composer's width and side clearance.
- Refresh or hide suggestions for the current round.
- Cancel stale requests when you type, switch sessions, or disable predictions.
- A persistent **Show predicted messages** switch under **Plugins → Predicted messages**, with an explicit **Save** action.
- No empty conversation bar when disabled, while typing, or when there are no suggestions.
- English and Chinese labels, native DSH theme colors, and no separate API key.

This independent plugin is not affiliated with OpenAI Codex.

## Install

Requires DSH with a working model provider. Developed and used with **DSH 0.2.2-rc.1 on macOS Desktop**. Other platforms have not received full UI validation. The declared DSH range is `>=0.2.2-rc.1 <0.3.0`; API changes may require a plugin update.

In **Plugins → Add plugin**, paste the release archive URL:

```text
https://github.com/shine1973/dsh-predicted-messages/releases/download/v0.1.6/dsh-predicted-messages-0.1.6.tgz
```

Alternatively, with Git installed:

```text
git+https://github.com/shine1973/dsh-predicted-messages.git#v0.1.6
```

You can also ask the DSH agent to install either address through `plugin_manager` with `action: install_bundle`. Follow any restart instruction returned by DSH. Runtime dependencies are downloaded during installation; the archive contains no `node_modules` or install scripts. This release is distributed through GitHub and does not require an npm account.

If you installed the earlier `@local/dsh-predicted-messages` development package, disable or remove it before installing the public package to avoid duplicate tool registration.

## Use

After a reply finishes, leave the composer empty. Select a suggestion, edit it, and send when ready. **Refresh** generates another result; **Hide this round** dismisses the current suggestions. Change the automatic prediction preference under **Plugins → Predicted messages → Show predicted messages**, then click **Save**.

No automatic prediction starts while the assistant is replying or the composer contains text or attachments. An empty result is valid when the model has no useful continuation. Provider and parsing errors are shown instead of fabricated fallback suggestions.

## Model usage and data

A prediction makes an additional request through your configured DSH provider and consumes model quota. It uses the model's lowest advertised reasoning effort, a 30-second default timeout, per-round caching, and a two-second manual refresh cooldown.

Recent context contains actual user text and the last retained assistant text per turn: at most ten messages, each capped at 6,000 characters, within a default 12,000 UTF-16-unit recent-text budget. Reasoning text, tool results, images, and the full system prompt are excluded. Selected text goes to your configured model provider through DSH. The plugin adds no analytics service and does not read or store API keys.

Predictions are editable suggestions and may be wrong. They do not authorize or execute actions.

Existing billion-context summaries are read using exact-session loopback HTTP GET detail (tested 0.1.213 internal Web API), without extra summarization calls or latest-session fallback. Active nested blocks are deduplicated, newest first; this is not relevance search. Summary claims are historical and yield to recent conversation. Shape errors, unavailable service, 2 MiB response limit or 1.5-second timeout fall back to recent-only input. Origin discovery reads billion-context/proxy-origin under XDG_STATE_HOME (default ~/.local/state); an explicit loopback HTTP origin is supported.

Budgets count UTF-16 units, not tokens: recent text 12,000, summaries 4,000, actual serialized user JSON 16,000 including escaping/keys. Fixed system prompt and transport envelope are excluded. Recent text has priority but may itself be trimmed for escaping overhead. Zero summaryChars disables reads. History opening, status and cache hits do not fetch summaries.

## Configuration

The preference applies to all conversations in the current DSH profile and is saved through DSH's configuration service. Advanced fields are managed by the plugin configuration system:

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Automatic predictions |
| `provider` | empty | Override provider; otherwise follow the session |
| `model` | empty | Override model; must accompany `provider` |
| `contextChars` | `12000` | Recent text limit, 1,000–20,000 |
| `summaryChars` | `4000` | Summary limit, 0–20,000; zero disables reads |
| `totalChars` | `16000` | Serialized user input limit, 1,000–40,000; at least each individual budget |
| `summaryOrigin` | empty | Auto-discover; loopback HTTP origin only |
| `timeoutMs` | `30000` | Timeout in milliseconds, 5,000–60,000 |

The public package is `dsh-predicted-messages`. Its configuration row retains the ID `local-predicted-messages` for development-version continuity. The plugin does not rewrite profile files directly.

The `predicted_messages` agent tool and `/predicted-messages` command accept `status`, `generate` (optional `refresh: true`), and `configure` (required `enabled` boolean). Generation returns `busy` without contacting a model when the conversation has not completed a reply.

## Develop

Requires Node.js 22 or later.

Cordis is an optional peer supplied by the DSH host, not a private production dependency. `npm ci` installs it as a development dependency for local checks; production loading uses DSH's runtime resolver. Do not move Cordis back into `dependencies` or bundle the development copy.

```sh
git clone https://github.com/shine1973/dsh-predicted-messages.git
cd dsh-predicted-messages
npm ci --ignore-scripts
npm run check
npm test
npm pack --ignore-scripts
```

Install the local directory through DSH's plugin manager after installing dependencies. Local installs link the directory, so keep it in place. Follow the manager's reload or restart guidance when updating code.

Tests cover context bounds, caching, cancellation, stale results, and provider failures. CI checks Node.js 22 and 24; it does not establish UI compatibility with every DSH release or platform.

Report issues with your DSH version, plugin version, model provider, and reproduction steps. Remove credentials and private conversations before sharing logs or screenshots.

[MIT License](LICENSE) · [Changelog](CHANGELOG.md)
