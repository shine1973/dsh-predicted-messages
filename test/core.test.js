import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, foldContext, boundedTranscript, parseSuggestions, PredictionRuntime } from '../core.js';

const user = (seq, text) => ({ type: 'user/message', seq, data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] } });
const assistant = (seq, text, turn = 1) => ({ type: 'assistant/message', seq, data: { turn, message: { role: 'assistant', content: [{ type: 'reasoning', text: 'private reasoning' }, { type: 'text', text }] } } });
const end = (seq, kind = 'completed') => ({ type: 'turn/end', seq, data: { turn: 1, reason: { kind } } });
const readyState = () => [user(1, '帮我优化代码'), assistant(2, '已优化，接下来可以运行测试。'), end(3)].reduce(foldContext, initialState());
function fixture(stream) {
  let state = readyState();
  let calls = 0;
  const session = { id: 'test-session' };
  const llm = { async prepareCall(config, signal, configure) {
    calls++;
    return { config: { ...config, ...configure({}, { reasoning: { efforts: [{ id: 'low' }] } }) }, stream: options => stream ? stream(options) : (async function* () { yield { type: 'text-delta', text: '{"suggestions":["运行一下测试。"]}' }; yield { type: 'finish', reason: { kind: 'stop' } }; })() };
  } };
  const runtime = new PredictionRuntime({ llm, readState: () => state, selection: () => ({ provider: 'p', model: 'm' }), saveEnabled: async value => { runtime.config.enabled = value; } });
  return { runtime, session, calls: () => calls, setState: next => { state = next; } };
}

test('projection accepts actual human text, ignores tool data and reasoning, waits for completed turn', () => {
  let s = foldContext(initialState(), user(1, '测试一下'));
  const tool = { type: 'tool/result', seq: 2, data: { text: 'secret output' } };
  assert.equal(foldContext(s, tool), s);
  s = foldContext(s, assistant(3, '进行中'));
  s = foldContext(s, assistant(4, '已完成'));
  assert.equal(s.messages.length, 2);
  assert.equal(s.messages[1].text, '已完成');
  assert.equal(s.view.ready, false);
  assert.equal(foldContext(s, end(5, 'aborted')).view.ready, false);
  assert.equal(foldContext(s, end(5)).view.ready, true);
  assert.equal(foldContext(s, { type: 'model/selection', seq: 6 }).view.ready, false);
});

test('surface replacement invalidates and removes superseded source text', () => {
  const s = foldContext(readyState(), { type: 'developer/message', seq: 4, surfaceOp: { op: 'replace', startSeq: 1, endSeq: 3 } });
  assert.deepEqual(s.messages, []);
  assert.equal(s.view.ready, false);
});

test('context budget prioritizes recent conversation and bounds retained history', () => {
  const rows = [{ role: 'user', text: '12345' }, { role: 'assistant', text: '67890' }];
  assert.deepEqual(boundedTranscript(rows, 7), [{ role: 'user', text: '45' }, { role: 'assistant', text: '67890' }]);
  let s = initialState();
  for (let i = 0; i < 20; i++) s = foldContext(s, user(i, 'a'.repeat(8000)));
  assert.equal(s.messages.length, 10);
  assert.ok(s.messages.every(m => m.text.length <= 6000));
});

test('model output is strict JSON with deduplicated bounded plain drafts', () => {
  assert.deepEqual(parseSuggestions('```json\n{"suggestions":["  帮我测试。  ","帮我测试。",42,"/danger","解释一下。"]}\n```'), ['帮我测试。', '解释一下。']);
  assert.deepEqual(parseSuggestions('{"suggestions":[]}'), []);
  assert.throws(() => parseSuggestions('Sure, here is a suggestion'));
  assert.throws(() => parseSuggestions('{"foo":[]}'));
});

test('cached generation and disabled switch avoid repeated provider requests', async () => {
  const f = fixture();
  const first = await f.runtime.operate(f.session, { action: 'generate' });
  assert.equal(first.status, 'ready');
  assert.deepEqual(first.suggestions, ['运行一下测试。']);
  assert.deepEqual(await f.runtime.operate(f.session, { action: 'generate' }), first);
  assert.equal(f.calls(), 1);
  await f.runtime.operate(f.session, { action: 'configure', enabled: false });
  assert.equal((await f.runtime.operate(f.session, { action: 'generate' })).status, 'disabled');
  assert.equal(f.calls(), 1);
  await f.runtime.dispose();
});

test('new conversation revision makes a late provider result stale', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = fixture(async function* () { await gate; yield { type: 'text-delta', text: '{"suggestions":["旧预测"]}' }; yield { type: 'finish', reason: { kind: 'stop' } }; });
  const request = f.runtime.operate(f.session, { action: 'generate' });
  assert.equal((await f.runtime.operate(f.session, { action: 'generate' })).status, 'busy');
  f.setState(foldContext(readyState(), user(10, '我换个问题')));
  release();
  const result = await request;
  assert.equal(result.status, 'stale');
  assert.deepEqual(result.suggestions, []);
  assert.equal(f.calls(), 1);
  await f.runtime.dispose();
});

test('invalidation aborts pending prediction and prevents cache publication', async () => {
  const f = fixture(async function* ({ signal }) {
    await new Promise((_, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  const request = f.runtime.operate(f.session, { action: 'generate' });
  const rejected = assert.rejects(request, /对话已更新/);
  f.runtime.invalidate(f.session);
  await rejected;
  assert.deepEqual(f.runtime.status(f.session).suggestions, []);
  await f.runtime.dispose();
});

test('partial and failed provider output is never treated as a usable suggestion', async () => {
  const f = fixture(async function* () { yield { type: 'text-delta', text: '{"suggestions":["old"]}' }; yield { type: 'finish', reason: { kind: 'error', failure: { message: 'quota failure' } } }; });
  await assert.rejects(f.runtime.operate(f.session, { action: 'generate' }), /quota failure/);
  assert.deepEqual(f.runtime.status(f.session).suggestions, []);
  await f.runtime.dispose();
});
