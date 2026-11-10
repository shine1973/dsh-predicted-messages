# Changelog

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
