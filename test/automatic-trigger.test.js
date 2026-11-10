import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Load only the lazy module factory to test its pure trigger policy.
// No React components, hooks, DOM, or rendering are simulated.
let bundle;
vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
  window: { __ModuleLoader__: { load(value) { bundle = value; } } },
});
const { createAutomaticPredictionGate } = bundle.factory(name => {
  assert.equal(name, 'react');
  return {};
});
const snapshot = (revision, changes = {}) => ({
  revision, ready: true, running: false, openState: 'open', enabled: true, ...changes,
});

test('opening, hydrating and rereading completed history never authorizes a prediction', () => {
  const gate = createAutomaticPredictionGate();
  for (const state of [
    snapshot(undefined, { openState: 'cold' }),
    snapshot(100, { openState: 'loading' }),
    snapshot(100, { enabled: null }),
    snapshot(100), snapshot(101), snapshot(101),
  ]) {
    gate.observe(state);
    assert.equal(gate.allows(state.revision), false);
  }
});

test('running metadata during history loading is not a live reply observation', () => {
  const gate = createAutomaticPredictionGate();
  gate.observe(snapshot(10, { openState: 'loading', running: true, ready: false }));
  gate.observe(snapshot(20));
  assert.equal(gate.allows(20), false);
});

test('a live reply arms only its later completed revision, even when readiness arrives first', () => {
  const gate = createAutomaticPredictionGate();
  gate.observe(snapshot(10));
  gate.observe(snapshot(10, { running: true }));
  gate.observe(snapshot(11, { running: true, ready: false }));
  gate.observe(snapshot(20, { running: true }));
  assert.equal(gate.allows(20), false);
  gate.observe(snapshot(20));
  assert.equal(gate.allows(20), true);
  assert.equal(gate.allows(10), false);
  gate.observe(snapshot(21, { ready: false }));
  assert.equal(gate.allows(21), false);
});

test('completion also works when running becomes false before the projection arrives', () => {
  const gate = createAutomaticPredictionGate();
  gate.observe(snapshot(10, { running: true, ready: false }));
  gate.observe(snapshot(10, { ready: false }));
  assert.equal(gate.allows(10), false);
  gate.observe(snapshot(20));
  assert.equal(gate.allows(20), true);
});

test('unchanged historical readiness cannot satisfy an observed running flag', () => {
  const gate = createAutomaticPredictionGate();
  gate.observe(snapshot(20, { running: true }));
  gate.observe(snapshot(20));
  assert.equal(gate.allows(20), false);
});

test('a session remount or reopen never inherits a previous live reply observation', () => {
  const oldMount = createAutomaticPredictionGate();
  oldMount.observe(snapshot(10, { running: true, ready: false }));
  const newMount = createAutomaticPredictionGate();
  newMount.observe(snapshot(20));
  assert.equal(newMount.allows(20), false);
  oldMount.observe(snapshot(10, { openState: 'loading', ready: false }));
  oldMount.observe(snapshot(20));
  assert.equal(oldMount.allows(20), false);
});

test('disabling clears the gate and enabling on an idle conversation does not predict', () => {
  const gate = createAutomaticPredictionGate();
  gate.observe(snapshot(10, { running: true, ready: false }));
  gate.observe(snapshot(11, { running: true, ready: false, enabled: false }));
  gate.observe(snapshot(20, { enabled: false }));
  gate.observe(snapshot(20));
  assert.equal(gate.allows(20), false);
  gate.observe(snapshot(21, { running: true, ready: false }));
  gate.observe(snapshot(30));
  assert.equal(gate.allows(30), true);
});

test('failed replies and backward replay revisions never authorize predictions', () => {
  const gate = createAutomaticPredictionGate();
  gate.observe(snapshot(10, { running: true, ready: false }));
  gate.observe(snapshot(20, { ready: false }));
  assert.equal(gate.allows(20), false);
  gate.observe(snapshot(5));
  gate.observe(snapshot(20));
  assert.equal(gate.allows(20), false);
});
