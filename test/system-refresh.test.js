import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, foldContext, PredictionRuntime } from '../core.js';

const prompt = (seq, turn, previous) => ({ type: 'system/message', seq,
  data: { turn, step: 2, message: { role: 'system', source: { kind: 'system-prompt' }, content: [{ type: 'text', text: 'content intentionally irrelevant' }] } },
  ...(previous === undefined ? { surfaceOp: 'append' } : { sourceEventSeqs: [previous], surfaceOp: { op: 'replace', startSeq: previous, endSeq: previous } }) });
function fixture() {
  let state = initialState({ id: 'session' });
  const put = event => state = foldContext(state, event);
  put({ type: 'turn/start', seq: 1012, data: { turn: 7 } });
  put(prompt(1019, 7));
  const input = { action: 'submit', suggestions: ['Next'] };
  const root = { type: 'tool/call', seq: 1036, data: { turn: 7, step: 2, name: 'run_code', callId: 'opaque-root', arguments: '{}' } };
  const start = { type: 'tool/ptc-dispatch-start', seq: 1041, data: { name: 'predicted_messages', rootCallId: 'opaque-root', parentCallId: 'opaque-root', subCallId: 'opaque-sub', arguments: input } };
  const runtime = new PredictionRuntime({ readState: () => state });
  return { state: () => state, put, root, start, input, runtime,
    async submit() { put(root); put(start); return runtime.operate({ id: 'session' }, input, undefined, 'opaque-sub', 'opaque-root'); },
    settle(receipt) {
      put({ type: 'tool/ptc-dispatch', seq: 1042, data: { ...start.data, isError: false, content: [{ type: 'text', text: JSON.stringify(receipt) }] } });
      put({ type: 'tool/result', seq: 1043, data: { turn: 7, step: 2, message: { role: 'tool', toolCallId: 'opaque-root', source: { kind: 'tool', callId: 'opaque-root' }, isError: false, content: [] } } });
    },
    end() { put({ type: 'turn/end', seq: 1050, data: { turn: 7, reason: { kind: 'completed' } } }); },
  };
}
test('real seq1033 system refresh permits seq1036 root and seq1041 submission, including next-step refresh', async () => {
  const f = fixture(); f.put(prompt(1033, 7, 1019));
  assert.equal(f.state().turn, 7);
  const receipt = await f.submit(); assert.equal(receipt.status, 'submitted');
  f.settle(receipt); assert.deepEqual(f.state().pending, ['Next']);
  f.put(prompt(1046, 7, 1033));
  assert.deepEqual(f.state().pending, ['Next']);
  f.end(); assert.deepEqual(f.state().view.suggestions, ['Next']);
});
test('system refresh preserves active direct and PTC call associations', async () => {
  for (const ptc of [true, false]) {
    const f = fixture();
    if (ptc) { f.put(f.root); f.put(f.start); }
    else f.put({ type: 'tool/call', seq: 1036, data: { turn: 7, step: 2, name: 'predicted_messages', callId: 'direct', arguments: f.input } });
    f.put(prompt(1042, 7, 1019));
    const id = ptc ? 'opaque-sub' : 'direct';
    const receipt = await f.runtime.operate({ id: 'session' }, f.input, undefined, id, ptc ? 'opaque-root' : id);
    assert.equal(receipt.status, 'submitted');
  }
});
test('unknown, foreign-turn, non-system and multi-node replacements remain fail closed', async () => {
  const mutations = [
    e => { e.data.turn = 8; }, e => { e.data.message.source.kind = 'other'; },
    e => { e.data.message.role = 'user'; }, e => { e.type = 'developer/message'; },
    e => { e.surfaceOp.startSeq = 1020; e.surfaceOp.endSeq = 1020; },
    e => { e.surfaceOp.endSeq = 1027; }, e => { e.surfaceOp.op = 'unknown'; },
  ];
  for (const mutate of mutations) {
    const f = fixture(), e = prompt(1033, 7, 1019); mutate(e); f.put(e);
    assert.equal(f.state().turn, null);
    await assert.rejects(f.submit(), /current turn tool call/);
  }
  const f = fixture(); const receipt = await f.submit(); f.settle(receipt);
  f.put(prompt(1046, 7, 1036)); // A system event replacing tool evidence is not a prompt refresh.
  assert.equal(f.state().turn, null); assert.deepEqual(f.state().pending, []);
  f.put(prompt(1047, 7, 1046)); assert.equal(f.state().turn, null, 'never restore turn from prompt');
  f.end(); assert.deepEqual(f.state().view.suggestions, []);
});
test('fork tracks only inherited system identity and requires its own turn and submission', async () => {
  let state = initialState({ id: 'child' }, 1020);
  state = foldContext(state, prompt(1019, 7));
  assert.equal(state.turn, null); assert.deepEqual(state.pending, []);
  state = foldContext(state, { type: 'turn/start', seq: 1020, data: { turn: 1 } });
  state = foldContext(state, prompt(1021, 1, 1019));
  assert.equal(state.turn, 1); assert.equal(state.systemPromptSeq, 1021);
  assert.deepEqual(state.calls, []); assert.deepEqual(state.view.suggestions, []);
});
