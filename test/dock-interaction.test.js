import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Context } from '@deepseek-ai/cordis';
import { readFileSync } from 'node:fs';

// Executes the registered Entry and Dock with persistent hook slots and effect
// cleanup. This is a component interaction harness, not a browser/DOM test.
function harness() {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
  let bundle, entry, overlay, owner, cursor;
  const instances = new Map(), cleanups = [], dictionaries = {};
  const sessions = new Map(), observers = new Set(), mainListeners = new Set();
  let main;
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
    get(name) { return this[name]; },
    shortcuts: { observeFixedInput(fn) { observers.add(fn); return () => observers.delete(fn); } },
    uiSession: { adapter: { current: { getSnapshot: () => main, subscribe(fn) { mainListeners.add(fn); return () => mainListeners.delete(fn); } } } },
    effect(fn) { const cleanup = fn(); if (typeof cleanup === 'function') cleanups.push(cleanup); },
    locale: { register(_ns, value) { Object.assign(dictionaries, value); } },
    slots: { inject(_slot, fn) { fn(); }, register(options, component) {
      if (['conversation.input.dock', 'conversation.input.overlay'].includes(options.name)) {
        assert.equal(typeof options.id, 'string', 'list slot registration requires id');
        assert.ok(options.id.length > 0);
      }
      if (options.name === 'conversation.input.dock') entry = component;
      if (options.name === 'conversation.input.overlay') overlay = component;
    } },
    sessions: {
      binding(id) { return { session: sessions.get(id).face }; },
      scope(id) { return { remote: { commands: { async execute() {
        const value = sessions.get(id);
        return { ok: true, value: { result: { kind: 'success', text: JSON.stringify({ enabled: true, revision: value.projection.revision, suggestions: value.suggestions ?? [], status: value.suggestions?.length ? 'ready' : 'empty' }) } } };
      } } } }; },
    },
  };
  bundle.factory(() => React).apply(ctx);
  function session(id) {
    const value = { snapshot: { running: false, removed: false, openState: 'open', subagent: null, pendingSubmissions: [], awaitingFirstTurn: false }, projection: { revision: 1, ready: true }, input: { draft: 'unsent draft', draftRev: 4, attachmentIds: ['file'], phase: 'plain' }, calls: [], allowed: true };
    value.listeners = new Set();
    value.subscribe = fn => { value.listeners.add(fn); return () => value.listeners.delete(fn); };
    value.face = {
      subscribe: value.subscribe,
      getSnapshot: () => value.snapshot,
      projections: { faceOf: () => ({ getSnapshot: () => value.projection, subscribe: value.subscribe }) },
      beginSubmission(input) { value.echo = input; return { requestId: id + '-request', abandon() { input.onRetire({ reason: 'failed' }); } }; },
      prompt(...args) { value.calls.push(args); return new Promise((resolve, reject) => { value.resolve = resolve; value.reject = reject; }); },
    };
    value.actions = new Proxy({}, { get() { assert.fail('manual request must not touch editor actions'); } });
    const occurrence = { getAttribute: () => id };
    value.seat = { isConnected: true, closest: () => occurrence };
    value.editor = { isConnected: true, closest: selector => selector === '[data-composer-seat]' ? value.seat : value.editor, hasAttribute: () => false, ownerDocument: {} };
    value.editor.ownerDocument.activeElement = value.editor;
    value.dock = { closest: () => value.seat };
    sessions.set(id, value); return value;
  }
  let current;
  function render(id) {
    const value = sessions.get(id);
    const props = { sessionId: id, t: key => dictionaries.en[key] ?? key,
      useProjection: (_key, select) => select(value.projection), useSession: select => select(value.snapshot),
      useInput: select => select(value.input), useSessionAccess: (target, action) => { assert.equal(target, id); assert.equal(action, 'session/prompt'); return value.allowed; },
      inputActions: value.actions,
    };
    const node = entry(props);
    assert.equal(node.props.key, id);
    if (current && current !== node.props.key) {
      for (const effect of instances.get(current).effects) effect?.cleanup?.();
      instances.delete(current);
    }
    current = node.props.key;
    owner = instances.get(current) ?? { values: [], effects: [], pending: [] }; instances.set(current, owner); cursor = 0;
    main = { key: id, props: { inputActions: value.actions }, hooks: { input: { getSnapshot: () => value.input, subscribe: value.subscribe } } };
    const tree = node.type(node.props);
    tree.props.ref.current = value.dock;
    for (const index of owner.pending.splice(0)) owner.effects[index].cleanup = owner.effects[index].callback();
    return tree;
  }
  return { session, render, observers, setMain(value) { main = value; for (const fn of mainListeners) fn(); },
    notify(id) { for (const fn of sessions.get(id).listeners) fn(); },
    renderOverlay(id, dom) {
      const value = sessions.get(id), element = overlay({ sessionId: id, inputActions: value.actions });
      owner = { values: [], effects: [], pending: [] }; instances.set('ghost:' + id, owner); cursor = 0;
      const tree = element.type(element.props);
      nodes(tree).find(n => n.props.className === 'dsh-predicted-messages__ghost').props.ref.current = dom;
      for (const index of owner.pending.splice(0)) owner.effects[index].cleanup = owner.effects[index].callback();
      return tree;
    },
    key(id, code = 'Tab', gesture = {}, context = {}) {
      let consumed = 0;
      for (const fn of observers) fn({ type: 'keydown', gesture: { code, composing: false, defaultPrevented: false, ...gesture }, context: { region: 'editable', modal: null, target: sessions.get(id).editor, ...context }, consume() { consumed++; } });
      return consumed;
    }, async settle() { for (let n = 0; n < 6; n++) await Promise.resolve(); }, dispose() { for (const instance of instances.values()) for (const effect of instance.effects) effect?.cleanup?.(); for (const fn of cleanups.reverse()) fn(); } };
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

async function readyKeyboard() {
  const h = harness(), s = h.session('a');
  s.input = { draft: '', draftRev: 4, attachmentIds: [], phase: 'plain' };
  s.suggestions = ['First draft', 'Second draft']; s.projection.suggestions = s.suggestions; s.insertions = [];
  s.actions = { captureInsertion: () => ({ draftRev: s.input.draftRev, start: 0, end: 0 }), insertText(text, span) {
    if (s.rejectCAS || span.draftRev !== s.input.draftRev) return false;
    s.insertions.push(text); s.input = { ...s.input, draft: text, draftRev: s.input.draftRev + 1 }; return true;
  } };
  h.render('a'); await h.settle(); h.render('a'); await h.settle(); h.render('a');
  return { h, s };
}
test('actual dock Tab accepts only first draft through CAS, Escape hides without sending', async () => {
  const { h, s } = await readyKeyboard();
  assert.equal(h.key('a'), 1); assert.deepEqual(s.insertions, ['First draft']);
  assert.equal(h.key('a'), 0); assert.equal(s.calls.length, 0); h.dispose();
  const next = await readyKeyboard();
  assert.equal(next.h.key('a', 'Escape'), 1);
  assert.equal(next.h.key('a'), 0); assert.equal(next.h.key('a', 'Escape'), 0);
  assert.deepEqual(next.s.insertions, []); assert.doesNotMatch(text(next.h.render('a')), /First draft/); next.h.dispose();
});
test('actual dock passes consumed, repeated, modified and composing input to its owner', async () => {
  const { h, s } = await readyKeyboard();
  for (const flag of ['defaultPrevented', 'repeat', 'control', 'alt', 'shift', 'meta', 'composing'])
    for (const key of ['Tab', 'Escape']) assert.equal(h.key('a', key, { [flag]: true }), 0);
  assert.equal(h.key('a', 'ArrowRight'), 0);
  assert.equal(h.key('a', 'Tab', {}, { modal: 'dialog' }), 0);
  assert.equal(h.key('a', 'Tab', {}, { region: 'page' }), 0);
  s.editor.hasAttribute = () => true; assert.equal(h.key('a'), 0);
  s.editor.hasAttribute = () => false;
  s.editor.ownerDocument.activeElement = {}; assert.equal(h.key('a'), 0);
  s.editor.ownerDocument.activeElement = s.editor;
  assert.equal(h.key('a', 'Tab', {}, { target: { closest: () => null } }), 0);
  s.dock.closest = () => ({}); assert.equal(h.key('a'), 0);
  assert.deepEqual(s.insertions, []); h.dispose();
});
test('actual dock rereads input, attachments, session and projection before consuming', async () => {
  const { h, s } = await readyKeyboard();
  for (const patch of [{ draft: 'typed' }, { attachmentIds: ['file'] }, { draftRev: 5 }, { phase: 'sending' }]) {
    const previous = s.input; s.input = { ...previous, ...patch }; assert.equal(h.key('a'), 0); assert.equal(h.key('a', 'Escape'), 0); s.input = previous;
  }
  s.snapshot.running = true; assert.equal(h.key('a'), 0); s.snapshot.running = false;
  s.projection.revision++; assert.equal(h.key('a'), 0); s.projection.revision--;
  s.rejectCAS = true; assert.equal(h.key('a'), 0); s.rejectCAS = false;
  h.setMain({ key: 'b' }); assert.equal(h.key('a'), 0);
  h.setMain({ key: 'a', props: { inputActions: {} } }); assert.equal(h.key('a'), 0);
  assert.deepEqual(s.insertions, []); h.dispose();
});
test('actual dock unbinds on session switch and disposal; absent suggestions never capture', async () => {
  const { h, s } = await readyKeyboard();
  assert.equal(h.observers.size, 1);
  h.session('b'); h.render('b'); assert.equal(h.observers.size, 1);
  assert.equal(h.key('a'), 0); assert.equal(h.key('b'), 0);
  h.dispose(); assert.equal(h.observers.size, 0); assert.equal(h.key('a'), 0);
  assert.deepEqual(s.insertions, []);
});

test('real Cordis mounts client with only baseline services and disposes its slot', async () => {
  let module;
  vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), { AbortController, window: { __ModuleLoader__: { load(value) { module = value; } } } });
  const plugin = module.factory(() => ({ createElement() {} }));
  const ctx = new Context(); let mounted = 0;
  ctx.provide('locale', { register() { return () => {}; } });
  ctx.provide('sessions', {});
  ctx.provide('slots', {
    inject(_slot, callback) { return ctx.effect(callback); },
    register(options) {
      if (['conversation.input.dock', 'conversation.input.overlay'].includes(options.name)) {
        assert.equal(typeof options.id, 'string', 'list slot registration requires id');
        assert.ok(options.id.length > 0);
        if (options.name === 'conversation.input.overlay') assert.equal(options.id, 'predicted-messages-ghost');
        mounted++; return () => mounted--;
      }
      return () => {};
    },
  });
  const fiber = ctx.plugin(plugin);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mounted, 2);
  assert.equal(ctx.get('shortcuts'), undefined); assert.equal(ctx.get('uiSession'), undefined);
  await fiber.dispose();
  await ctx.fiber.dispose();
  assert.equal(mounted, 0);
});

test('registered ghost shares live input/session eligibility and immediate dock hide without requests', async () => {
  const { h, s } = await readyKeyboard();
  const eventTarget = value => ({ addEventListener() {}, removeEventListener() {}, ...value });
  const editor = eventTarget({ textContent: '', isConnected: true, hasAttribute: () => false, getAttribute: () => 'true', getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, bottom: 60 }) });
  const scroll = eventTarget({ getBoundingClientRect: () => ({ top: 0, bottom: 60 }) });
  const card = { querySelector: key => key.startsWith('[data-composer-input]') ? editor : scroll };
  const anchor = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const node = { style: {}, dataset: {}, textContent: '', isConnected: true,
    closest: key => key === '[data-composer-card]' ? card : key === '[data-conversation-session]' ? { getAttribute: () => 'a' } : anchor,
    ownerDocument: { defaultView: eventTarget({ getComputedStyle: () => ({ font: '14px sans-serif', lineHeight: '24px' }) }) } };
  h.renderOverlay('a', node);
  assert.equal(node.textContent, 'First draft'); assert.equal(node.dataset.visible, 'true');
  for (const patch of [{ draft: 'typed' }, { attachmentIds: ['file'] }, { phase: 'sending' }]) {
    const old = s.input; s.input = { ...old, ...patch }; h.notify('a'); assert.equal(node.dataset.visible, 'false');
    s.input = old; h.notify('a'); assert.equal(node.dataset.visible, 'true');
  }
  s.snapshot.running = true; h.notify('a'); assert.equal(node.dataset.visible, 'false');
  s.snapshot.running = false; h.notify('a'); assert.equal(node.dataset.visible, 'true');
  assert.equal(h.key('a', 'Escape'), 1); assert.equal(node.dataset.visible, 'false');
  s.projection = { ...s.projection, revision: 2 }; h.notify('a'); assert.equal(node.dataset.visible, 'false');
  h.render('a'); await h.settle(); h.render('a'); assert.equal(node.dataset.visible, 'true');
  h.setMain({ key: 'other' }); assert.equal(node.dataset.visible, 'false');
  assert.equal(s.calls.length, 0); assert.deepEqual(s.insertions, []);
  h.dispose(); assert.equal(node.dataset.visible, 'false'); assert.equal(s.listeners.size, 0);
});
