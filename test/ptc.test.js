import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, foldContext, PredictionRuntime } from '../core.js';

// Exact durable shape observed in target Session seq206–209; ids remain opaque.
function fixture() {
  let state = initialState({ id: 'session' }), seq = 0;
  const log = [];
  const put = (type, data, extra = {}) => { const e = { type, data, seq: seq++, ...extra }; log.push(e); state = foldContext(state, e); };
  const args = suggestions => ({ action: 'submit', suggestions });
  const root = (id = 'root', turn = 1, step = 2) => put('tool/call', { name: 'run_code', arguments: '{"code":"not parsed"}', callId: id, turn, step });
  const begin = (id = 'sub', rootId = 'root', suggestions = ['Next'], extra = {}) => put('tool/ptc-dispatch-start', { name: 'predicted_messages', rootCallId: rootId, parentCallId: rootId, subCallId: id, arguments: args(suggestions), ...extra });
  const settle = (id = 'sub', rootId = 'root', suggestions = ['Next'], extra = {}) => put('tool/ptc-dispatch', { name: 'predicted_messages', rootCallId: rootId, parentCallId: rootId, subCallId: id, arguments: args(suggestions), isError: false, content: [{ type: 'text', text: JSON.stringify({ enabled: true, status: 'submitted', sessionId: 'session', turn: 1, callId: id, suggestions }) }], ...extra });
  const finish = (id = 'root', error = false, step = 2) => put('tool/result', { turn: 1, step, message: { role: 'tool', toolCallId: id, source: { kind: 'tool', callId: id }, isError: error, content: [{ type: 'text', text: 'outer stdout is never parsed' }] } });
  const end = (kind = 'completed', turn = 1) => put('turn/end', { turn, reason: { kind } });
  put('turn/start', { turn: 1 });
  return { put, root, begin, settle, finish, end, log, state: () => state, runtime: new PredictionRuntime({ readState: () => state }) };
}
test('PTC start binds execute to exact root and child; success waits for root and turn', async () => {
  const f = fixture(); f.root(); f.begin();
  await assert.rejects(f.runtime.operate({ id: 'session' }, { action: 'submit', suggestions: ['Next'] }, undefined, 'sub', 'wrong'));
  const receipt = await f.runtime.operate({ id: 'session' }, { action: 'submit', suggestions: ['Next'] }, undefined, 'sub', 'root');
  assert.equal(receipt.status, 'submitted');
  f.settle(undefined, undefined, undefined, { content: [{ type: 'text', text: JSON.stringify(receipt) }] });
  assert.deepEqual(f.state().pending, []); f.finish(); assert.deepEqual(f.state().pending, ['Next']);
  assert.deepEqual(f.state().view.suggestions, []); f.end(); assert.deepEqual(f.state().view.suggestions, ['Next']);
  assert.deepEqual(f.log.reduce(foldContext, initialState({ id: 'session' })), f.state());
  assert.deepEqual(f.log.reduce(foldContext, initialState({ id: 'child' }, f.log.length)).view.suggestions, []);
});
test('PTC rejects absent, stale, wrong, nested and duplicate identities', () => {
  for (const change of [{ rootCallId: 'wrong' }, { parentCallId: 'nested' }, { name: 'other' }]) {
    const f = fixture(); f.root(); f.begin('sub', 'root', ['Next'], change); f.settle(); f.finish(); f.end();
    assert.deepEqual(f.state().view.suggestions, []);
  }
  for (const change of [{ rootCallId: 'wrong' }, { parentCallId: 'nested' }, { subCallId: 'wrong' }, { name: 'other' }, { isError: true }, { content: [{ type: 'text', text: '{}' }] }]) {
    const f = fixture(); f.root(); f.begin(); f.settle('sub', 'root', ['Next'], change); f.finish(); f.end(); assert.deepEqual(f.state().view.suggestions, []);
  }
  const f = fixture(); f.root(); f.begin(); f.settle(); f.begin('clear', 'root', []); f.settle('clear', 'root', []);
  f.begin(); f.settle(); f.finish(); f.end(); assert.deepEqual(f.state().view.suggestions, [], 'duplicates cannot undo later empty submission');
});
test('PTC failed root and interrupted turn never publish successful child', () => {
  for (const failure of ['root', 'turn', 'step', 'late', 'surface', 'input']) {
    const f = fixture(); f.root(); f.begin(); f.settle();
    if (failure === 'late') f.put('turn/start', { turn: 2 });
    if (failure === 'surface') f.put('developer/message', {}, { surfaceOp: { op: 'replace', startSeq: 1, endSeq: 2 } });
    if (failure === 'input') f.put('user/message', {});
    f.finish('root', failure === 'root', failure === 'step' ? 99 : 2); f.end(failure === 'turn' ? 'aborted' : 'completed', failure === 'late' ? 2 : 1);
    assert.deepEqual(f.state().view.suggestions, [], failure);
  }
  const f = fixture(); f.root('root', 0); f.begin(); f.settle(); f.finish(); f.end(); assert.deepEqual(f.state().view.suggestions, []);
});
test('PTC multiple roots follow child receipt order including empty submission', () => {
  for (const later of [['Later'], []]) {
    const f = fixture(); f.root('a'); f.root('b'); f.begin('one', 'a'); f.begin('two', 'b', later);
    f.settle('one', 'a'); f.settle('two', 'b', later); f.finish('b'); f.finish('a'); f.end();
    assert.deepEqual(f.state().view.suggestions, later);
  }
});
