import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, foldContext, validateInput, PredictionRuntime } from '../core.js';
const drafts = ['运行测试并解释结果。', '介绍下一步的取舍。'];
const event = (type, seq, data, extra = {}) => ({ type, seq, data, ...extra });
const start = (seq = 0, turn = 1) => event('turn/start', seq, { turn });
const call = (seq = 1, turn = 1, callId = 'call1', suggestions = drafts) => event('tool/call', seq, { turn, step: 1, name: 'predicted_messages', callId, arguments: JSON.stringify({ action: 'submit', suggestions }) });
const value = (changes = {}) => ({ enabled: true, revision: 1, suggestions: drafts, status: 'submitted', model: '', sessionId: 'a', turn: 1, callId: 'call1', ...changes });
const result = (seq = 2, changes = {}, data = {}) => event('tool/result', seq, { turn: 1, step: 1, message: { role: 'tool', source: { kind: 'tool', callId: 'call1' }, toolCallId: 'call1', isError: false, content: [{ type: 'text', text: JSON.stringify(value(changes)) }] }, ...data });
const end = (seq = 3, kind = 'completed', turn = 1) => event('turn/end', seq, { turn, reason: { kind } });
const fold = (events, id = 'a', inherited = 0) => events.reduce(foldContext, initialState({ id }, inherited));
const complete = () => fold([start(), call(), result(), end()]);

test('successful correlated results remain hidden until completed turn', () => {
  const state = fold([start(), call(), result()]);
  assert.deepEqual(state.view.suggestions, []);
  assert.deepEqual(state.pending, drafts);
  assert.deepEqual(foldContext(state, end()).view.suggestions, drafts);
  assert.deepEqual(state.view.suggestions, [], 'fold is immutable');
});
test('parameters alone, arbitrary JSON, unrelated tools and wrong sources never publish', () => {
  assert.deepEqual(fold([start(), call(), end()]).view.suggestions, []);
  assert.deepEqual(fold([start(), result(), end()]).view.suggestions, []);
  const other = call(); other.data.name = 'other_tool';
  assert.deepEqual(fold([start(), other, result(), end()]).view.suggestions, []);
  for (const changes of [{ sessionId: 'b' }, { turn: 2 }, { callId: 'wrong' }, { enabled: false }, { status: 'ready' }, { suggestions: ['invented'] }]) {
    assert.deepEqual(fold([start(), call(), result(2, changes), end()]).view.suggestions, []);
  }
  for (const mutate of [r => r.data.message.isError = true, r => r.data.error = { code: 'FAILED' }, r => r.data.message.source.callId = 'other', r => r.data.step = 2, r => r.data.turn = 2, r => r.data.message.role = 'assistant']) {
    const r = result(); mutate(r);
    assert.deepEqual(fold([start(), call(), r, end()]).view.suggestions, []);
  }
});
test('nonobject and malformed JSON tool results never throw or publish', () => {
  for (const text of ['null', '42', '"text"', '[]', '[{}]', '{}', '{']) {
    const r = result(); r.data.message.content[0].text = text;
    assert.deepEqual(fold([start(), call(), r, end()]).view.suggestions, []);
  }
});
test('surface replacement rejects further submissions until a new turn starts', async () => {
  let state = fold([start(), call(), result(), event('developer/message', 3, {}, { surfaceOp: { op: 'replace', startSeq: 99, endSeq: 1 } }), call(4)]);
  const runtime = new PredictionRuntime({ readState: () => state });
  await assert.rejects(runtime.operate({ id: 'a' }, { action: 'submit', suggestions: drafts }, undefined, 'call1'));
  state = foldContext(state, start(5, 2));
  state = foldContext(state, call(6, 2));
  assert.equal((await runtime.operate({ id: 'a' }, { action: 'submit', suggestions: drafts }, undefined, 'call1')).status, 'submitted');
});
test('all noncompleted turn outcomes discard suggestions', () => {
  for (const kind of ['aborted', 'error', 'blocked', 'max-tokens', 'interrupted', 'forked']) {
    const state = fold([start(), call(), result(), end(3, kind)]);
    assert.equal(state.view.ready, false);
    assert.deepEqual(state.pending, []);
    assert.deepEqual(state.view.suggestions, []);
  }
});
test('new user input, new turn, inbox mutation and surface rewrite clear immediately', () => {
  for (const e of [start(4, 2), event('user/message', 4, { role: 'user' }), event('agent/inbox/spliced', 4, {}), event('model/selection', 4, {}), event('developer/message', 4, {}, { surfaceOp: { op: 'replace', startSeq: 99, endSeq: 1 } })]) {
    assert.deepEqual(foldContext(complete(), e).view.suggestions, []);
  }
  const events = [start(), call(), event('user/message', 2, { role: 'user' }), result(3), end(4)];
  assert.deepEqual(fold(events).view.suggestions, []);
});
test('late results and old turn ends cannot republish in another turn', () => {
  const state = fold([start(), call(), start(2, 2), result(3), end(4), end(5, 'completed', 2)]);
  assert.deepEqual(state.view.suggestions, []);
});
test('fork inheritance is ignored, own new turn works, same-session replay is deterministic', () => {
  const log = [start(), call(), result(), end()];
  assert.deepEqual(fold(log), complete());
  assert.deepEqual(fold(log, 'child', 4).view.suggestions, []);
  const own = [start(4, 2), call(5, 2), result(6, { sessionId: 'child', turn: 2 }, { turn: 2 }), end(7, 'completed', 2)];
  assert.deepEqual(fold([...log, ...own], 'child', 4).view.suggestions, drafts);
  assert.deepEqual(fold(log, 'child').view.suggestions, [], 'session identity alone also rejects copied results');
});
test('latest successful submission can clear or replace suggestions', () => {
  const emptyCall = call(3, 1, 'clear', []);
  const emptyResult = result(4, { callId: 'clear', suggestions: [] });
  emptyResult.data.message.toolCallId = 'clear'; emptyResult.data.message.source.callId = 'clear';
  assert.deepEqual(fold([start(), call(), result(), emptyCall, emptyResult, end(5)]).view.suggestions, []);
});
test('input rejects excess, unknown fields, duplicate, slash and control text', () => {
  assert.deepEqual(validateInput({ action: 'submit', suggestions: [] }).suggestions, []);
  assert.equal(validateInput({ action: 'submit', suggestions: ['😀'.repeat(160)] }).suggestions.length, 1);
  for (const input of [null, [], { unknown: 1 }, { action: 'unknown' }, { action: 'configure' }, { action: 'status', suggestions: [] }, ...[undefined, ['a','b','c'], [''], ['a','a'], ['/send'], ['a\nb'], ['😀'.repeat(161)], [2]].map(suggestions => ({ action: 'submit', suggestions }))]) {
    assert.throws(() => validateInput(input));
  }
});
test('status and legacy generate are read-only with no LLM, network or timers', async () => {
  const runtime = new PredictionRuntime({ readState: () => complete() });
  const session = { id: 'a' };
  for (const input of [{}, { action: 'status' }, { action: 'generate' }, { action: 'generate', refresh: true }]) {
    assert.deepEqual((await runtime.operate(session, input)).suggestions, drafts);
  }
  assert.deepEqual(runtime.status({ id: 'b' }).suggestions, []);
  runtime.dispose();
  await assert.rejects(runtime.operate(session));
});
test('submission requires exact live call; result is not published by execute', async () => {
  let state = fold([start(), call()]);
  const runtime = new PredictionRuntime({ readState: () => state });
  const args = { action: 'submit', suggestions: drafts };
  await assert.rejects(runtime.operate({ id: 'a' }, args));
  await assert.rejects(runtime.operate({ id: 'a' }, args, undefined, 'wrong'));
  const submitted = await runtime.operate({ id: 'a' }, args, undefined, 'call1');
  assert.equal(submitted.status, 'submitted');
  assert.deepEqual(runtime.status({ id: 'a' }).suggestions, []);
  state = foldContext(state, end());
  await assert.rejects(runtime.operate({ id: 'a' }, args, undefined, 'call1'));
});
test('switch saves, suppresses disabled submissions, and abort/errors do not change it', async () => {
  const saved = [];
  const runtime = new PredictionRuntime({ readState: () => complete(), saveEnabled: async value => saved.push(value) });
  assert.equal((await runtime.operate({ id: 'a' }, { action: 'configure', enabled: false })).status, 'disabled');
  assert.deepEqual(saved, [false]);
  assert.deepEqual(runtime.status({ id: 'a' }).suggestions, []);
  const controller = new AbortController(); controller.abort(new Error('stopped'));
  await assert.rejects(runtime.operate({ id: 'a' }, { action: 'configure', enabled: true }, controller.signal), /stopped/);
  assert.deepEqual(saved, [false]);
  const disabled = new PredictionRuntime({ config: { enabled: false }, readState: () => fold([start(), call()]) });
  assert.equal((await disabled.operate({ id: 'a' }, { action: 'submit', suggestions: drafts }, undefined, 'call1')).status, 'disabled');
});
