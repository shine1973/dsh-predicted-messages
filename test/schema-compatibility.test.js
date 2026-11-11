import test from 'node:test';
import assert from 'node:assert/strict';
import { Service } from '@deepseek-ai/cordis';
import Plugin from '../index.js';
import { initialState, foldContext } from '../core.js';
async function registrations() {
  let projection, command, tool, section, sectionDisposed = false;
  const disposers = [];
  const instance = {
    config: Plugin.Config({ enabled: true }),
    ctx: {
      systemPrompt: { section(value) { assert.equal(section, undefined); section = value; return () => { sectionDisposed = true; }; } },
      sessionProjections: { async register(value) { projection = value; return { stateOf: initialState }; } },
      effect(fn) { disposers.push(fn()); }, commands: { register(value) { command = value; } }, tools: { register(value) { tool = value; } },
    },
    async operate(_agent, input, _signal, callId) { return { ...input, ...(callId ? { callId } : {}) }; },
  };
  await Plugin.prototype[Service.init].call(instance);
  return { projection, command, tool, section, instance, dispose() { disposers.reverse().forEach(fn => fn()); }, sectionDisposed: () => sectionDisposed };
}
const registered = await registrations();
test('new projection version refolds old checkpoints with bounded draft state', () => {
  assert.equal(registered.projection.stateVersion, 5);
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

test('turn-end section is scoped, removable, enabled-aware and never replaces the system prompt', async () => {
  const r = await registrations();
  assert.equal(r.section.name, 'predicted-messages-turn-end');
  assert.notEqual(r.section.complete, true);
  assert.equal(r.section.interpolate, false);
  assert.match(r.section.text({}), /exactly once/);
  assert.match(r.section.text({}), /suggestions: \[\]/);
  assert.match(r.section.text({}), /do not submit again/);
  assert.match(r.section.text({}), /must not cause retries or block/);
  assert.match(r.section.text({}), /explicit user requests/);
  assert.doesNotMatch(r.tool.description, /optionally|Omit when/);
  r.instance.runtime.config.enabled = false;
  assert.equal(r.section.text({}), '');
  r.instance.runtime.config.enabled = true;
  assert.match(r.section.text({}), /Before|before/);
  r.dispose();
  assert.equal(r.sectionDisposed(), true);
  assert.equal(r.instance.runtime.closed, true);
});

test('registered execute passes direct and PTC root identity into durable projection', async () => {
  for (const ptc of [false, true]) {
    const r = await registrations(); let state = initialState({ id: 'a' }), seq = 0;
    const put = (type, data) => {
      state = foldContext(state, { type, data, seq: seq++ });
      assert.deepEqual(r.projection.stateSchema.parse(state), state);
    };
    r.instance.ctx.sessions = { get: id => ({ id }) };
    r.instance.runtime.readState = () => state;
    r.instance.operate = Plugin.prototype.operate.bind(r.instance);
    const args = { action: 'submit', suggestions: ['Test'] };
    put('turn/start', { turn: 1 });
    put('tool/call', { name: ptc ? 'run_code' : 'predicted_messages', callId: 'root', turn: 1, step: 2, arguments: JSON.stringify(args) });
    if (ptc) put('tool/ptc-dispatch-start', { rootCallId: 'root', parentCallId: 'root', subCallId: 'sub', name: 'predicted_messages', arguments: args });
    const exec = { agent: { id: 'a' }, callId: ptc ? 'sub' : 'root', rootCallId: 'root', signal: new AbortController().signal };
    await assert.rejects(r.tool.execute(args, { ...exec, rootCallId: 'wrong' }));
    const receipt = await r.tool.execute(args, exec);
    assert.equal(receipt.status, 'submitted');
    const content = r.tool.output.render(args, receipt);
    if (ptc) put('tool/ptc-dispatch', { rootCallId: 'root', parentCallId: 'root', subCallId: 'sub', name: 'predicted_messages', arguments: args, isError: false, content });
    put('tool/result', { turn: 1, step: 2, message: { role: 'tool', source: { kind: 'tool', callId: 'root' }, toolCallId: 'root', isError: false, content: ptc ? [] : content } });
    put('turn/end', { turn: 1, reason: { kind: 'completed' } });
    assert.deepEqual(state.view.suggestions, ['Test']); r.dispose();
  }
});
