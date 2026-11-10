import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
let bundle;
vm.runInNewContext(source, { AbortController, window: { __ModuleLoader__: { load(value) { bundle = value; } } } });
const { insertDraft, createSuggestionRequester } = bundle.factory(() => ({}));
test('insertion captures current editor and uses its CAS token without sending', () => {
  const span = { draftRev: 7, start: 0, end: 0 };
  let inserted = 0;
  const actions = {
    captureInsertion: () => span,
    insertText(text, actual) { assert.equal(actual, span); assert.equal(text, 'Test it'); inserted++; return true; },
    send() { assert.fail('must never send'); },
  };
  assert.equal(insertDraft(actions, 7, 'Test it'), true);
  assert.equal(inserted, 1);
});
test('changed draft, selection, or failed CAS preserve editor', () => {
  for (const span of [{ draftRev: 8, start: 0, end: 0 }, { draftRev: 7, start: 1, end: 1 }, { draftRev: 7, start: 0, end: 1 }]) {
    assert.equal(insertDraft({ captureInsertion: () => span, insertText() { assert.fail('stale input'); } }, 7, 'draft'), false);
  }
  assert.equal(insertDraft({ captureInsertion: () => ({ draftRev: 7, start: 0, end: 0 }), insertText: () => false }, 7, 'draft'), false);
});
test('client keeps command reads read-only and manual prompt is bound to a click', () => {
  assert.doesNotMatch(source, /action:\s*['"](?:generate|submit)['"]/);
  assert.doesNotMatch(source, /createAutomaticPredictionGate|onClick:\s*refresh/);
  assert.match(source, /key: props.sessionId/);
  assert.match(source, /controller\.abort\(\)/);
});

function promptSession() {
  const snapshot = { running: false, removed: false, openState: 'open', subagent: null, pendingSubmissions: [], awaitingFirstTurn: false };
  let resolve, reject, retire, abandons = 0;
  const sent = [];
  const session = {
    getSnapshot: () => snapshot,
    beginSubmission(input) {
      assert.equal(input.mode, 'queue'); assert.equal(input.attachments.length, 0);
      retire = input.onRetire;
      return { requestId: 'request-1', abandon() { abandons++; retire({ reason: 'failed' }); } };
    },
    prompt(content, mode, signal, requestId) {
      sent.push({ content, mode, signal, requestId });
      return new Promise((yes, no) => { resolve = yes; reject = no; });
    },
  };
  return { session, snapshot, sent, finish: value => resolve(value), fail: error => reject(error), retire: () => retire({ reason: 'observed' }), abandons: () => abandons };
}
test('manual request sends only explicit visible text and never reads or changes the draft', async () => {
  const fixture = promptSession();
  const requester = createSuggestionRequester(() => ({ session: fixture.session }));
  const promise = requester.request('a', 'Please propose drafts only.', () => true);
  assert.equal(fixture.sent.length, 1);
  const sent = fixture.sent[0];
  assert.equal(sent.content.length, 1); assert.equal(sent.content[0].text, 'Please propose drafts only.');
  assert.equal(sent.content[0].type, 'text'); assert.equal(sent.mode, 'queue'); assert.equal(sent.requestId, 'request-1');
  fixture.finish({ ok: true, value: { accepted: true } });
  assert.equal(await promise, true);
  assert.equal(requester.isPending('a'), true);
  fixture.retire();
  assert.equal(requester.isPending('a'), false);
});
test('both echo/receipt orderings release lock, including a completed turn with no drafts', async () => {
  for (const early of [true, false]) {
    const f = promptSession(); const r = createSuggestionRequester(() => ({ session: f.session }));
    const promise = r.request('a', 'Only drafts', () => true);
    if (early) f.retire();
    assert.equal(r.isPending('a'), true);
    f.finish({ ok: true, value: { accepted: true } }); await promise;
    if (!early) { assert.equal(r.isPending('a'), true); f.retire(); }
    assert.equal(r.isPending('a'), false);
  }
});
test('same-session duplicate and returning views share lock; other sessions stay independent', async () => {
  const a = promptSession(), b = promptSession();
  const r = createSuggestionRequester(id => ({ session: (id === 'a' ? a : b).session }));
  const first = r.request('a', 'A', () => true);
  const second = r.request('b', 'B', () => true);
  assert.equal(await r.request('a', 'A again after switching back', () => true), false);
  assert.equal(a.sent.length, 1); assert.equal(b.sent.length, 1);
  a.finish({ ok: true, value: { accepted: true } }); a.retire(); await first;
  assert.equal(r.isPending('b'), true);
  b.finish({ ok: true, value: { accepted: true } }); b.retire(); await second;
});
test('click-time snapshot and access/switch gates prevent stale rendered button from sending', async () => {
  for (const change of [{ running: true }, { removed: true }, { openState: 'error' }, { subagent: {} }, { pendingSubmissions: [{}] }, { awaitingFirstTurn: true }]) {
    const f = promptSession(); const r = createSuggestionRequester(() => ({ session: f.session }));
    Object.assign(f.snapshot, change);
    assert.equal(await r.request('a', 'Drafts', () => true), false); assert.equal(f.sent.length, 0);
  }
  const f = promptSession(); const r = createSuggestionRequester(() => ({ session: f.session }));
  assert.equal(await r.request('a', 'Drafts', () => false), false); assert.equal(f.sent.length, 0);
});
test('remote failures and thrown exceptions release echo and lock without automatic retries', async () => {
  for (const throws of [false, true]) {
    const f = promptSession(); const r = createSuggestionRequester(() => ({ session: f.session }));
    const promise = r.request('a', 'Drafts', () => true);
    if (throws) f.fail(new Error('offline')); else f.finish({ ok: false, error: new Error('denied') });
    await assert.rejects(promise, throws ? /offline/ : /denied/);
    assert.equal(r.isPending('a'), false); assert.equal(f.abandons(), 1); assert.equal(f.sent.length, 1);
  }
});
test('plugin disposal aborts admission and cannot send another request', async () => {
  const f = promptSession(); const r = createSuggestionRequester(() => ({ session: f.session }));
  const promise = r.request('a', 'Drafts', () => true);
  r.dispose(); assert.equal(f.sent[0].signal.aborted, true);
  f.fail(new Error('aborted')); await assert.rejects(promise, /aborted/);
  assert.equal(await r.request('a', 'Again', () => true), false);
});
