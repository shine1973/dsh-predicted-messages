import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
let bundle;
vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), { window: { __ModuleLoader__: { load(value) { bundle = value; } } } });
const { mountGhostPreview } = bundle.factory(() => ({}));
function target(extra = {}) {
  const events = new Map();
  return { events, addEventListener(name, fn) { events.set(name, fn); }, removeEventListener(name) { events.delete(name); }, fire(name) { events.get(name)?.(); }, ...extra };
}
export function ghostDOM() {
  const observers = [];
  class Observer { constructor(fn) { this.update = fn; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  const win = target({ ResizeObserver: Observer, MutationObserver: Observer, getComputedStyle: () => ({ font: '14px sans-serif', fontSize: '14px', lineHeight: '24px', paddingLeft: '4px', paddingRight: '4px', paddingTop: '2px', paddingBottom: '2px', letterSpacing: 'normal', textAlign: 'start', direction: 'ltr' }) });
  const box = { left: 20, top: 30, width: 300, bottom: 130 };
  const viewport = { top: 30, bottom: 130 };
  const editor = target({ textContent: '', isConnected: true, getAttribute: () => 'true', hasAttribute: () => false, getBoundingClientRect: () => box });
  const scroll = target({ getBoundingClientRect: () => viewport });
  const card = { querySelector: s => s.startsWith('[data-composer-input]') ? editor : scroll };
  const anchor = { getBoundingClientRect: () => ({ left: 10, top: 10 }) };
  const node = { dataset: {}, style: {}, textContent: '', isConnected: true, ownerDocument: { defaultView: win }, closest: s => s === '[data-composer-card]' ? card : anchor };
  return { node, editor, scroll, win, box, viewport, observers };
}
test('ghost is read-only, measured inside editor and capped at three lines; resize/scroll recompute', () => {
  const d = ghostDOM(); let text = 'first suggestion '.repeat(20), update;
  const off = mountGhostPreview(d.node, { read: () => text, subscribe(fn) { update = fn; return () => { update = null; }; } });
  assert.equal(d.node.dataset.visible, 'true'); assert.equal(d.node.textContent, text);
  assert.equal(d.editor.textContent, ''); assert.equal(d.node.style.maxHeight, '72px'); assert.equal(d.node.style.left, '14px');
  d.box.width = 120; d.observers[0].update(); assert.equal(d.node.style.width, '112px');
  d.viewport.top = 40; d.scroll.fire('scroll'); assert.equal(d.node.style.clipPath, 'inset(8px 0 0px 0)');
  text = ''; update(); assert.equal(d.node.dataset.visible, 'false'); assert.equal(d.node.textContent, '');
  off(); assert.equal(update, null); assert.equal(d.editor.events.size, 0); assert.equal(d.scroll.events.size, 0); assert.equal(d.win.events.size, 0);
  assert.ok(d.observers.every(o => o.disconnected));
});
test('ghost immediately clears for IME and input before store render, restores on cancellation, fails closed', () => {
  const d = ghostDOM(); const off = mountGhostPreview(d.node, { read: () => 'draft', subscribe: () => () => {} });
  d.editor.fire('compositionstart'); assert.equal(d.node.dataset.visible, 'false');
  d.win.fire('resize'); assert.equal(d.node.dataset.visible, 'false');
  d.editor.fire('compositionend'); assert.equal(d.node.dataset.visible, 'true');
  d.editor.fire('beforeinput'); assert.equal(d.node.dataset.visible, 'false');
  d.editor.textContent = 'typed'; d.editor.fire('input'); assert.equal(d.node.dataset.visible, 'false');
  d.editor.textContent = ''; d.editor.fire('input'); assert.equal(d.node.dataset.visible, 'true');
  d.editor.hasAttribute = () => true; d.observers[1].update(); assert.equal(d.node.dataset.visible, 'false');
  d.editor.hasAttribute = () => false; d.editor.isConnected = false; d.win.fire('resize'); assert.equal(d.node.dataset.visible, 'false');
  off(); assert.equal(d.node.dataset.visible, 'false');
  assert.doesNotThrow(() => mountGhostPreview({ closest: () => null }, { read() { assert.fail(); }, subscribe() { assert.fail(); } })());
});
