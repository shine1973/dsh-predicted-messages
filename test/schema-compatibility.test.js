import test from 'node:test';
import assert from 'node:assert/strict';
import { Service } from '@deepseek-ai/cordis';
import Plugin from '../index.js';
import { initialState, foldContext } from '../core.js';
async function registrations() {
  let projection, command, tool;
  const instance = {
    config: Plugin.Config({ enabled: true }),
    ctx: {
      sessionProjections: { async register(value) { projection = value; return { stateOf: initialState }; } },
      effect() {}, commands: { register(value) { command = value; } }, tools: { register(value) { tool = value; } },
    },
    async operate(_agent, input, _signal, callId) { return { ...input, ...(callId ? { callId } : {}) }; },
  };
  await Plugin.prototype[Service.init].call(instance);
  return { projection, command, tool };
}
const registered = await registrations();
test('new projection version refolds old checkpoints with bounded draft state', () => {
  assert.equal(registered.projection.stateVersion, 3);
  const state = initialState({ id: 'session' }, 100);
  assert.deepEqual(registered.projection.stateSchema.parse(state), state);
  assert.equal(registered.projection.stateSchema.safeParse({ messages: [], view: { revision: 1, ready: true } }).success, false);
  assert.equal(registered.projection.stateSchema.safeParse({ ...state, pending: ['1','2','3'] }).success, false);
});
test('projection folding and wire view satisfy actual registered schemas', () => {
  let state = initialState({ id: 'session' });
  for (let turn = 0; turn < 50; turn++) {
    state = foldContext(state, { type: 'turn/start', seq: turn * 2, data: { turn } });
    state = foldContext(state, { type: 'turn/end', seq: turn * 2 + 1, data: { turn, reason: { kind: 'completed' } } });
    assert.equal(registered.projection.stateSchema.safeParse(state).success, true);
    assert.equal(registered.projection.wire.viewSchema.safeParse(registered.projection.wire.view(state)).success, true);
  }
});
test('tool strict defaults, draft limits, call identity and old read actions', async () => {
  const exec = { agent: {}, signal: new AbortController().signal, callId: 'call' };
  assert.deepEqual(await registered.tool.execute({}, exec), { action: 'status', callId: 'call' });
  assert.deepEqual(await registered.tool.execute({ action: 'submit', suggestions: ['Test'] }, exec), { action: 'submit', suggestions: ['Test'], callId: 'call' });
  assert.deepEqual(await registered.tool.execute({ action: 'generate', refresh: true }, exec), { action: 'generate', refresh: true, callId: 'call' });
  for (const args of [{ action: 'unknown' }, { enabled: 'false' }, { extra: true }, [], { action: 'submit', suggestions: ['a','b','c'] }]) await assert.rejects(registered.tool.execute(args, exec));
});
test('command preserves status/configure, rejects unbound submit and malformed input', async () => {
  const invoke = rawInput => registered.command.handler({ rawInput, agent: {}, signal: new AbortController().signal });
  assert.deepEqual(JSON.parse((await invoke('')).text), { action: 'status' });
  for (const raw of ['{', '{"action":"unknown"}', '{"enabled":"yes"}', '{"action":"submit","suggestions":[]}']) assert.equal((await invoke(raw)).kind, 'error');
});
test('legacy provider and budget configuration remains accepted but no LLM injection', () => {
  const config = Plugin.Config({ provider: 'old', model: '', summaryOrigin: 'obsolete://value', contextChars: 12000, totalChars: 1 });
  assert.equal(config.provider, 'old');
  assert.equal(Plugin.inject.includes('llm'), false);
});
