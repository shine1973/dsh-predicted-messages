// Durable, turn-bound suggestions. No model or summary-reader dependency.
export const PROJECTION_KEY = 'localPredictedMessagesContext';
export const TOOL_NAME = 'predicted_messages';
export const MAX_SUGGESTION_CHARS = 160;
export const DEFAULTS = Object.freeze({ enabled: true });
export const TOOL_DESCRIPTION = 'Near the end of a task reply, optionally submit up to two useful next-user-message drafts. Use the user’s language; do not invent consent or authorization. Drafts only fill the editor, never send. Omit when no useful next step exists. status reads drafts; configure changes the display switch only when requested.';
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
  return { sessionId: header.id ?? '', inheritedEventCount, turn: null, calls: [], pending: [], view: { revision: 0, ready: false, suggestions: [] } };
}
export function foldContext(state, event) {
  if (event.seq < state.inheritedEventCount) return state;
  const clear = (turn = null) => ({ ...state, turn, calls: [], pending: [], view: { revision: event.seq + 1, ready: false, suggestions: [] } });
  // Replace endpoints are surface positions, not a numeric seq interval. Fail closed.
  if (event.surfaceOp && typeof event.surfaceOp === 'object') return clear();
  if (event.type === 'turn/start') return clear(event.data.turn);
  if (event.type === 'user/message' || event.type === 'agent/inbox/spliced' || event.type === 'model/selection') return clear(state.turn);
  if (event.type === 'tool/call' && event.data.name === TOOL_NAME && event.data.turn === state.turn) {
    let input;
    try { input = validateInput(JSON.parse(event.data.arguments)); } catch { return state; }
    if (input.action !== 'submit') return state;
    const call = { callId: event.data.callId, step: event.data.step, suggestions: input.suggestions };
    return { ...state, calls: [...state.calls.filter(c => c.callId !== call.callId), call].slice(-16) };
  }
  if (event.type === 'tool/result' && event.data.turn === state.turn) {
    const message = event.data.message;
    const call = state.calls.find(c => c.callId === message?.toolCallId && c.step === event.data.step);
    if (!call) return state;
    const next = { ...state, calls: state.calls.filter(c => c !== call) };
    if (event.data.error || message.isError || message.role !== 'tool'
      || message.source?.kind !== 'tool' || message.source.callId !== call.callId) return next;
    let value;
    try {
      if (message.content?.length !== 1 || message.content[0].type !== 'text') return next;
      value = JSON.parse(message.content[0].text);
    } catch { return next; }
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.status !== 'submitted' || value.sessionId !== state.sessionId || value.turn !== state.turn
      || value.callId !== call.callId || value.enabled !== true
      || JSON.stringify(value.suggestions) !== JSON.stringify(call.suggestions)) return next;
    return { ...next, pending: [...call.suggestions] };
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
  async operate(session, raw = {}, signal, callId) {
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
      || JSON.stringify(call.suggestions) !== JSON.stringify(input.suggestions)) throw new Error('submit requires a current turn tool call.');
    return { ...this.status(session), status: this.config.enabled ? 'submitted' : 'disabled', suggestions: this.config.enabled ? input.suggestions : [], sessionId: session.id, turn: state.turn, callId };
  }
  dispose() { this.closed = true; }
}
