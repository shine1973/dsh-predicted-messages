import test from 'node:test';
import assert from 'node:assert/strict';
import { Service } from '@deepseek-ai/cordis';
import Plugin from '../index.js';
import { initialState, foldContext } from '../core.js';

// Exercise the actual Host registrations without making model or profile calls.
async function registrations() {
  let projection, command, tool;
  const instance = {
    config: Plugin.Config({ enabled: true }),
    ctx: {
      llm: {},
      sessionProjections: {
        async register(value) { projection = value; return { stateOf: initialState }; },
        onChanged() {},
      },
      effect() {},
      commands: { register(value) { command = value; } },
      tools: { register(value) { tool = value; } },
    },
    async operate(_agent, input) { return input; },
  };
  await Plugin.prototype[Service.init].call(instance);
  return { projection, command, tool };
}
const registered = await registrations();
const message = { role: 'user', text: 'Hello', seq: 1, turn: -1 };
const stateWith = count => ({ messages: Array.from({ length: count }, () => ({ ...message })), view: { revision: 10, ready: false } });

test('actual projection schema accepts old valid empty and ten-message checkpoints', () => {
  for (const count of [0, 1, 10]) {
    const state = stateWith(count);
    assert.deepEqual(registered.projection.stateSchema.parse(state), state);
  }
  assert.equal(registered.projection.stateVersion, 2, 'old checkpoints must be refolded under the bounded schema');
});

test('actual projection schema rejects eleven and oversized message arrays', () => {
  for (const count of [11, 1000]) {
    const result = registered.projection.stateSchema.safeParse(stateWith(count));
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some(issue => issue.code === 'too_big' && issue.maximum === 10));
  }
});

test('replayed conversation states remain compatible with the bounded schema', () => {
  let state = initialState();
  for (let i = 0; i < 50; i++) {
    state = foldContext(state, { type: 'user/message', seq: i * 2, data: {
      role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: `Question ${i}` }],
    } });
    state = foldContext(state, { type: 'assistant/message', seq: i * 2 + 1, data: {
      turn: i, message: { role: 'assistant', content: [{ type: 'text', text: `Reply ${i}` }] },
    } });
    assert.equal(registered.projection.stateSchema.safeParse(state).success, true);
  }
  assert.equal(state.messages.length, 10);
});

test('Zod upgrade preserves tool defaults and strict input rejection', async () => {
  const exec = { agent: {}, signal: new AbortController().signal };
  assert.deepEqual(await registered.tool.execute({}, exec), { action: 'status' });
  assert.deepEqual(await registered.tool.execute({ action: 'generate', refresh: true }, exec), { action: 'generate', refresh: true });
  assert.deepEqual(await registered.tool.execute({ action: 'configure', enabled: false }, exec), { action: 'configure', enabled: false });
  for (const args of [{ action: 'unknown' }, { enabled: 'false' }, { extra: true }, []]) {
    await assert.rejects(registered.tool.execute(args, exec));
  }
});

test('command success and malformed JSON/error contracts remain compatible', async () => {
  const invocation = rawInput => ({ rawInput, agent: {}, signal: new AbortController().signal });
  const empty = await registered.command.handler(invocation(''));
  assert.equal(empty.kind, 'success');
  assert.deepEqual(JSON.parse(empty.text), { action: 'status' });
  for (const raw of ['{', '{"action":"unknown"}', '{"enabled":"yes"}']) {
    const result = await registered.command.handler(invocation(raw));
    assert.equal(result.kind, 'error');
    assert.equal(typeof result.text, 'string');
  }
});
