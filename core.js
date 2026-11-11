// Durable, turn-bound suggestions. No model or summary-reader dependency.
export const PROJECTION_KEY = 'localPredictedMessagesContext';
export const TOOL_NAME = 'predicted_messages';
export const MAX_SUGGESTION_CHARS = 160;
export const DEFAULTS = Object.freeze({ enabled: true });
export const TOOL_DESCRIPTION = 'When enabled, record next-user-message drafts from the end-of-turn check with submit, including an empty array when none are useful. Use the user’s language; do not invent consent or authorization. Drafts only fill the editor, never send. status reads drafts; configure changes the display switch only when requested.';
export const TURN_END_PROMPT = 'Respect explicit user requests for no suggestions or an exact output format; in those cases skip this check. Otherwise, before your final reply in each turn, check for useful follow-up drafts and call predicted_messages with action submit exactly once: up to two drafts, or suggestions: [] if none are useful. If you already submitted in this turn, do not submit again. A failed or unavailable submission must not cause retries or block your final reply.';
export const TOOL_PARAMETERS = {
  type: 'object', properties: {
    action: { type: 'string', enum: ['submit', 'status', 'configure', 'generate'], description: 'Default status. submit supplies drafts; legacy generate only reads, without generation.' },
    suggestions: { type: 'array', maxItems: 2, items: { type: 'string', maxLength: 160 }, description: 'For submit: zero to two distinct plain-text drafts, each at most 160 Unicode characters.' },
    enabled: { type: 'boolean', description: 'Required for configure.' },
    refresh: { type: 'boolean', description: 'Legacy compatibility; ignored.' },
  }, additionalProperties: false,
};
export function validateInput(input = {}) {
  if (!input || Array.isArray(input) || typeof input !== 'object'
    || Object.keys(input).some(k => !['action', 'suggestions', 'enabled', 'refresh'].includes(k))) throw new Error('Invalid suggestion input.');
  const action = input.action ?? 'status';
  if (!['submit', 'status', 'configure', 'generate'].includes(action)
    || input.enabled !== undefined && typeof input.enabled !== 'boolean'
    || input.refresh !== undefined && typeof input.refresh !== 'boolean') throw new Error('Invalid suggestion action.');
  if (action === 'configure' && typeof input.enabled !== 'boolean') throw new Error('enabled is required.');
  if (action === 'submit') {
    if (!Array.isArray(input.suggestions) || input.suggestions.length > 2) throw new Error('Supply at most two drafts.');
    const suggestions = input.suggestions.map(text => {
      if (typeof text !== 'string' || !text.trim() || [...text].length > MAX_SUGGESTION_CHARS
        || /[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(text)
        || text.trimStart().startsWith('/')) throw new Error('Invalid plain-text draft.');
      return text.trim();
    });
    if (new Set(suggestions).size !== suggestions.length) throw new Error('Drafts must be distinct.');
    return { ...input, action, suggestions };
  }
  if (input.suggestions !== undefined) throw new Error('suggestions requires submit.');
  return { ...input, action };
}
export function initialState(header = {}, inheritedEventCount = 0) {
  return { sessionId: header.id ?? '', inheritedEventCount, systemPromptSeq: null, turn: null, calls: [], roots: [], pending: [], pendingSeq: -1, view: { revision: 0, ready: false, suggestions: [] } };
}
export function foldContext(state, event) {
  const op = event.surfaceOp;
  const replacement = op && typeof op === 'object';
  const systemPrompt = event.type === 'system/message' && event.data?.message?.role === 'system'
    && event.data.message.source?.kind === 'system-prompt';
  // Endpoints identify nodes in surface order, not a numeric interval. Equality
  // proves this replacement covers exactly our previously observed system node.
  const promptSeq = systemPrompt && (op === 'append' || replacement) ? event.seq
    : replacement ? null : state.systemPromptSeq;
  // Inherited system-node identity is safe to track; inherited drafts are not.
  if (event.seq < state.inheritedEventCount) return { ...state, systemPromptSeq: promptSeq };
  const clear = (turn = null) => ({ ...state, systemPromptSeq: promptSeq, turn, calls: [], roots: [], pending: [], pendingSeq: -1, view: { revision: event.seq + 1, ready: false, suggestions: [] } });
  if (replacement) {
    const refresh = systemPrompt && op.op === 'replace' && state.systemPromptSeq !== null
      && op.startSeq === state.systemPromptSeq && op.endSeq === state.systemPromptSeq
      && state.turn !== null && event.data.turn === state.turn;
    return refresh ? { ...state, systemPromptSeq: event.seq } : clear();
  }
  if (systemPrompt && op === 'append') return { ...state, systemPromptSeq: event.seq };
  if (event.type === 'turn/start') return clear(event.data.turn);
  if (event.type === 'user/message' || event.type === 'agent/inbox/spliced' || event.type === 'model/selection') return clear(state.turn);
  const data = event.data;
  const submitArgs = raw => {
    try { const value = validateInput(typeof raw === 'string' ? JSON.parse(raw) : raw); return value.action === 'submit' ? value.suggestions : undefined; } catch { return undefined; }
  };
  const receipt = (content, call) => {
    try {
      if (content?.length !== 1 || content[0].type !== 'text') return false;
      const value = JSON.parse(content[0].text);
      return value && value.status === 'submitted' && value.sessionId === state.sessionId
        && value.turn === state.turn && value.callId === call.callId && value.enabled === true
        && JSON.stringify(value.suggestions) === JSON.stringify(call.suggestions);
    } catch { return false; }
  };
  const accept = (next, suggestions, seq) => seq > state.pendingSeq ? { ...next, pending: [...suggestions], pendingSeq: seq } : next;
  if (event.type === 'tool/call' && data.turn === state.turn && state.turn !== null) {
    if (data.name === 'run_code') {
      if (state.roots.some(r => r.callId === data.callId)) return state;
      const roots = [...state.roots, { callId: data.callId, step: data.step, seen: [], pending: null }].slice(-16);
      return { ...state, roots, calls: state.calls.filter(c => !c.rootCallId || roots.some(r => r.callId === c.rootCallId)) };
    }
    if (data.name !== TOOL_NAME) return state;
    const suggestions = submitArgs(data.arguments);
    if (!suggestions) return state;
    const call = { callId: data.callId, step: data.step, suggestions };
    return { ...state, calls: [...state.calls.filter(c => c.callId !== call.callId), call].slice(-16) };
  }
  // These are executor-owned durable events, never run_code source or stdout.
  // Support the verified direct child transport only; unknown parent chains fail closed.
  if (event.type === 'tool/ptc-dispatch-start') {
    const root = state.roots.find(r => r.callId === data.rootCallId);
    if (!root || data.parentCallId !== root.callId || data.name !== TOOL_NAME
      || typeof data.subCallId !== 'string' || data.subCallId === root.callId
      || root.seen.includes(data.subCallId) || root.seen.length >= 64) return state;
    const suggestions = submitArgs(data.arguments);
    if (!suggestions) return state;
    const call = { callId: data.subCallId, rootCallId: root.callId, step: root.step, suggestions };
    return { ...state, roots: state.roots.map(r => r === root ? { ...r, seen: [...r.seen, call.callId] } : r),
      calls: [...state.calls.filter(c => c.callId !== call.callId), call].slice(-16) };
  }
  if (event.type === 'tool/ptc-dispatch') {
    const root = state.roots.find(r => r.callId === data.rootCallId);
    const call = state.calls.find(c => c.rootCallId === root?.callId && c.rootCallId !== undefined && c.callId === data.subCallId);
    if (!root || !call || data.parentCallId !== root.callId || data.name !== TOOL_NAME) return state;
    const next = { ...state, calls: state.calls.filter(c => c !== call) };
    if (data.isError !== false || data.error || JSON.stringify(submitArgs(data.arguments)) !== JSON.stringify(call.suggestions)
      || !receipt(data.content, call)) return next;
    return { ...next, roots: state.roots.map(r => r === root ? { ...r, pending: { suggestions: [...call.suggestions], seq: event.seq } } : r) };
  }
  if (event.type === 'tool/result' && data.turn === state.turn) {
    const message = data.message;
    const root = state.roots.find(r => r.callId === message?.toolCallId && r.step === data.step);
    const call = state.calls.find(c => !c.rootCallId && c.callId === message?.toolCallId && c.step === data.step);
    if (!root && !call) return state;
    const id = root?.callId ?? call.callId;
    const next = { ...state, roots: state.roots.filter(r => r !== root), calls: state.calls.filter(c => c !== call && c.rootCallId !== id) };
    if (data.error || message.isError || message.role !== 'tool'
      || message.source?.kind !== 'tool' || message.source.callId !== id) return next;
    if (root) return root.pending ? accept(next, root.pending.suggestions, root.pending.seq) : next;
    return receipt(message.content, call) ? accept(next, call.suggestions, event.seq) : next;
  }
  if (event.type === 'turn/end' && event.data.turn === state.turn) {
    const completed = event.data.reason?.kind === 'completed';
    return { ...clear(), view: { revision: event.seq + 1, ready: completed, suggestions: completed ? [...state.pending] : [] } };
  }
  return state;
}
export class PredictionRuntime {
  constructor({ readState, config = {}, saveEnabled }) {
    this.readState = readState;
    this.config = { ...DEFAULTS, ...config };
    this.saveEnabled = saveEnabled;
    this.closed = false;
  }
  status(session) {
    const state = this.readState(session);
    const suggestions = this.config.enabled && state.sessionId === session.id && state.view.ready ? [...state.view.suggestions] : [];
    return { enabled: this.config.enabled, revision: state.view.revision, suggestions,
      status: !this.config.enabled ? 'disabled' : !state.view.ready ? 'busy' : suggestions.length ? 'ready' : 'empty', model: '' };
  }
  async operate(session, raw = {}, signal, callId, rootCallId = callId) {
    if (this.closed) throw new Error('Suggestion plugin is closed.');
    if (signal?.aborted) throw signal.reason ?? new Error('Cancelled.');
    const input = validateInput(raw);
    if (input.action === 'configure') {
      await this.saveEnabled(input.enabled);
      this.config.enabled = input.enabled;
      return this.status(session);
    }
    if (input.action !== 'submit') return this.status(session);
    const state = this.readState(session);
    const call = state.calls.find(c => c.callId === callId);
    if (!callId || state.sessionId !== session.id || state.turn === null || !call
      || (call.rootCallId ?? call.callId) !== rootCallId
      || JSON.stringify(call.suggestions) !== JSON.stringify(input.suggestions)) throw new Error('submit requires a current turn tool call.');
    return { ...this.status(session), status: this.config.enabled ? 'submitted' : 'disabled', suggestions: this.config.enabled ? input.suggestions : [], sessionId: session.id, turn: state.turn, callId };
  }
  dispose() { this.closed = true; }
}
