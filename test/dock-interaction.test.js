import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Executes the registered Entry and Dock with persistent hook slots and effect
// cleanup. This is a component interaction harness, not a browser/DOM test.
function harness() {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
  let bundle, entry, owner, cursor;
  const instances = new Map(), cleanups = [], dictionaries = {};
  const sessions = new Map();
  const React = {
    createElement(type, props, ...children) { return { type, props: props ?? {}, children: children.flat(Infinity).filter(x => x !== false && x != null) }; },
    useState(initial) { const index = cursor++; const target = owner; if (!(index in target.values)) target.values[index] = initial; return [target.values[index], value => { target.values[index] = typeof value === 'function' ? value(target.values[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return owner.values[index] ??= { current: initial }; },
    useSyncExternalStore(_subscribe, get) { cursor++; return get(); },
    useEffect(callback, deps) {
      const index = cursor++; const old = owner.effects[index];
      if (!old || deps.some((value, n) => value !== old.deps[n])) {
        old?.cleanup?.(); owner.effects[index] = { deps, callback };
        owner.pending.push(index);
      }
    },
  };
  vm.runInNewContext(source, { AbortController, window: { __ModuleLoader__: { load(value) { bundle = value; } } } });
  const ctx = {
    effect(fn) { const cleanup = fn(); if (typeof cleanup === 'function') cleanups.push(cleanup); },
    locale: { register(_ns, value) { Object.assign(dictionaries, value); } },
    slots: { inject(_slot, fn) { fn(); }, register(options, component) { if (options.name === 'conversation.input.dock') entry = component; } },
    sessions: {
      binding(id) { return { session: sessions.get(id).face }; },
      scope(id) { return { remote: { commands: { async execute() {
        const value = sessions.get(id);
        return { ok: true, value: { result: { kind: 'success', text: JSON.stringify({ enabled: true, revision: value.projection.revision, suggestions: [], status: 'empty' }) } } };
      } } } }; },
    },
  };
  bundle.factory(() => React).apply(ctx);
  function session(id) {
    const value = { snapshot: { running: false, removed: false, openState: 'open', subagent: null, pendingSubmissions: [], awaitingFirstTurn: false }, projection: { revision: 1, ready: true }, input: { draft: 'unsent draft', draftRev: 4, attachmentIds: ['file'], phase: 'plain' }, calls: [], allowed: true };
    value.face = {
      getSnapshot: () => value.snapshot,
      beginSubmission(input) { value.echo = input; return { requestId: id + '-request', abandon() { input.onRetire({ reason: 'failed' }); } }; },
      prompt(...args) { value.calls.push(args); return new Promise((resolve, reject) => { value.resolve = resolve; value.reject = reject; }); },
    };
    sessions.set(id, value); return value;
  }
  let current;
  function render(id) {
    const value = sessions.get(id);
    const props = { sessionId: id, t: key => dictionaries.en[key] ?? key,
      useProjection: (_key, select) => select(value.projection), useSession: select => select(value.snapshot),
      useInput: select => select(value.input), useSessionAccess: (target, action) => { assert.equal(target, id); assert.equal(action, 'session/prompt'); return value.allowed; },
      inputActions: new Proxy({}, { get() { assert.fail('manual request must not touch editor actions'); } }),
    };
    const node = entry(props);
    assert.equal(node.props.key, id);
    if (current && current !== node.props.key) {
      for (const effect of instances.get(current).effects) effect?.cleanup?.();
      instances.delete(current);
    }
    current = node.props.key;
    owner = instances.get(current) ?? { values: [], effects: [], pending: [] }; instances.set(current, owner); cursor = 0;
    const tree = node.type(node.props);
    for (const index of owner.pending.splice(0)) owner.effects[index].cleanup = owner.effects[index].callback();
    return tree;
  }
  return { session, render, async settle() { for (let n = 0; n < 6; n++) await Promise.resolve(); }, dispose() { for (const instance of instances.values()) for (const effect of instance.effects) effect?.cleanup?.(); for (const fn of cleanups.reverse()) fn(); } };
}
function nodes(tree) { return typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)]; }
function button(tree) { return nodes(tree).find(n => n.type === 'button' && ['Generate suggestions', 'Requesting…'].includes(n.children[0])); }
function text(tree) { return typeof tree !== 'object' ? String(tree) : tree.children.map(text).join(' '); }

test('registered Entry renders manual button without suggestions and preserves draft/attachments', async () => {
  const h = harness(); const s = h.session('a');
  h.render('a'); await h.settle(); const tree = h.render('a');
  assert.equal(button(tree).props.disabled, false);
  assert.match(text(tree), /No suggestions were submitted/);
  const before = structuredClone(s.input);
  const request = button(tree).props.onClick();
  assert.equal(s.calls.length, 1); assert.deepEqual(s.input, before);
  assert.equal(button(h.render('a')).props.disabled, true);
  s.resolve({ ok: true, value: { accepted: true } }); s.echo.onRetire({ reason: 'observed' }); await request;
  assert.equal(button(h.render('a')).props.disabled, false);
  h.dispose();
});
test('running disables actual button and request failure is displayed', async () => {
  const h = harness(); const s = h.session('a'); h.render('a'); await h.settle();
  s.snapshot.running = true; assert.equal(button(h.render('a')).props.disabled, true);
  s.snapshot.running = false; const request = button(h.render('a')).props.onClick();
  s.resolve({ ok: false, error: { message: 'prompt denied' } }); await request;
  assert.match(text(h.render('a')), /prompt denied/);
  assert.equal(button(h.render('a')).props.disabled, false); h.dispose();
});
test('Entry session key cleans up UI while shared request lock survives switching back', async () => {
  const h = harness(); const a = h.session('a'); h.session('b'); h.render('a'); await h.settle();
  const request = button(h.render('a')).props.onClick();
  h.render('b'); await h.settle(); assert.equal(button(h.render('b')).props.disabled, false);
  h.render('a'); await h.settle(); assert.equal(button(h.render('a')).props.disabled, true);
  h.render('b'); await h.settle(); a.reject(new Error('late A failure')); await request;
  assert.doesNotMatch(text(h.render('b')), /late A failure/); h.dispose();
});
