window.__ModuleLoader__.load({
  id: 'dsh-predicted-messages',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'local-predicted-messages';
    const PROJECTION = 'localPredictedMessagesContext';
    // Embedded for the lazy browser artifact; keep identical to locale/*.json.
    const en = {
      "request.generate": "Generate suggestions",
      "request.pending": "Requesting…",
      "request.hint": "Sends a visible request to this conversation model and uses tokens. Your draft stays unchanged.",
      "request.disabled": "Enable predicted messages in plugin settings to request suggestions.",
      "request.unavailable": "Suggestion requests are unavailable in this session or with your access.",
      "request.waiting": "Waiting for this conversation. You can request again after it finishes.",
      "request.empty": "No suggestions were submitted. You can request again.",
      "error.request": "Could not request suggestions. Check the conversation before trying again.",
      "request.text": "I clicked Generate suggestions. Based on our current conversation, only propose up to two useful next-message drafts in my language using predicted_messages with action submit. Do not carry out the proposed tasks, change settings, or invent consent or authorization. If no useful draft exists, submit an empty array. Finish with a brief reply.",
      title: 'Predicted messages',
      description: 'Show up to two next-message drafts submitted by the conversation model. Selecting one only fills the editor.',
      toggle: 'Enable predicted messages',
      'settings.label': 'Show predicted messages',
      'settings.description': 'Show optional next-message drafts submitted with a reply. Selecting one fills an editable draft.',
      'settings.cost': 'No separate prediction request. Tool instructions, calls and results still use conversation tokens.',
      'settings.save': 'Save', 'settings.saving': 'Saving…', 'settings.saved': 'Saved',
      'settings.missing': 'The prediction configuration is unavailable',
      'settings.readonly': 'This connection cannot change plugin settings',
      enabled: 'On', disabled: 'Off', retry: 'Retry',
      hide: 'Hide this round', insert: 'Fill draft: {text}',
      'status.loading': 'Loading…',
      'status.ready': 'Select a suggestion to edit before sending',
      'error.unavailable': 'This session is unavailable',
      'error.command': 'The prediction command is unavailable',
      'error.response': 'The prediction service returned an invalid response',
      'error.failed': 'Unable to load predictions',
      'error.draftChanged': 'Your draft changed; it was preserved',
      'error.configure': 'Could not save the prediction setting',
    };
    const zh = {
      "request.generate": "生成建议",
      "request.pending": "请求中…",
      "request.hint": "发送一条可见请求给当前会话模型，会消耗 Tokens；保留现有草稿。",
      "request.disabled": "请先在插件设置中开启预测消息，再申请建议。",
      "request.unavailable": "当前会话或访问权限不支持申请建议。",
      "request.waiting": "等待当前会话处理完成，结束后可再次申请。",
      "request.empty": "本轮未提交建议，可再次申请。",
      "error.request": "请求建议失败，请查看会话状态后再试。",
      "request.text": "我点击了“生成建议”。请根据当前对话，仅用 predicted_messages 的 submit 操作提交最多两条有用的下一步消息草稿，使用我的语言。不要执行草稿中提议的任务，不要修改设置，不要虚构我的同意或授权。没有合适建议时提交空数组，最后简短回复即可。",
      title: '预测消息',
      description: '显示主模型随回复提交的最多两条下一步草稿。点击建议只填入编辑器。',
      toggle: '启用预测消息',
      'settings.label': '显示预测消息',
      'settings.description': '显示主模型随回复提交的可选下一步草稿，点击后可编辑再发送。',
      'settings.cost': '不发起独立预测请求；工具说明、调用和结果仍消耗主对话 Tokens。',
      'settings.save': '保存', 'settings.saving': '保存中…', 'settings.saved': '已保存',
      'settings.missing': '暂时无法读取预测消息配置',
      'settings.readonly': '当前连接无权修改插件设置',
      enabled: '开', disabled: '关', retry: '重试',
      hide: '隐藏本轮', insert: '填入草稿：{text}',
      'status.loading': '读取中…',
      'status.ready': '点击建议，编辑后再发送',
      'error.unavailable': '当前会话暂不可用',
      'error.command': '预测消息命令暂不可用',
      'error.response': '预测服务返回了无效结果',
      'error.failed': '暂时无法读取预测消息',
      'error.draftChanged': '草稿已变化，已保留原内容',
      'error.configure': '未能保存预测消息开关',
    };
    const CSS = `
.dsh-predicted-messages{box-sizing:border-box;width:100%;min-width:0;max-width:100%;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.5;padding:0 2px;margin:0 0 8px}
.dsh-predicted-messages *{box-sizing:border-box}
.dsh-predicted-messages__frame{box-sizing:border-box;width:100%;padding:0 var(--dsh-composer-side-clearance)}
.dsh-predicted-messages--dock{max-width:var(--dsh-composer-card-max-width);padding:0;margin:0 auto 8px}
.dsh-predicted-messages__bar{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;min-height:26px}
.dsh-predicted-messages__title{color:var(--dsw-alias-label-secondary);font-weight:500;white-space:nowrap}
.dsh-predicted-messages button{font:inherit;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent}
.dsh-predicted-messages button:disabled{cursor:default;opacity:.5}
.dsh-predicted-messages button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsh-predicted-messages__toggle{display:inline-flex;align-items:center;gap:5px;padding:2px;border:0;background:transparent;min-height:26px}
.dsh-predicted-messages__track{display:inline-flex;align-items:center;width:26px;height:16px;padding:2px;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l1)}
.dsh-predicted-messages__thumb{width:12px;height:12px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-bg-layer-1);transition:transform .12s ease}
.dsh-predicted-messages__toggle[aria-checked="true"] .dsh-predicted-messages__track{background:var(--dsw-alias-brand-primary)}
.dsh-predicted-messages__toggle[aria-checked="true"] .dsh-predicted-messages__thumb{transform:translateX(10px)}
.dsh-predicted-messages__actions{display:flex;align-items:center;gap:4px;margin-inline-start:auto;flex-wrap:wrap}
.dsh-predicted-messages__action{border:0;background:transparent;border-radius:6px;padding:3px 6px;min-height:26px;white-space:nowrap}
.dsh-predicted-messages__suggestions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.dsh-predicted-messages__suggestion{flex:1 1 240px;min-width:0;max-width:100%;padding:8px 12px;text-align:start;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)!important;font-size:13px!important;white-space:normal;overflow-wrap:anywhere;line-height:1.5}
.dsh-predicted-messages__status{margin:4px 0 0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-predicted-messages__error{color:var(--dsw-alias-state-error-primary)}
@media(hover:hover){.dsh-predicted-messages__action:not(:disabled):hover,.dsh-predicted-messages__suggestion:not(:disabled):hover{background:var(--dsw-alias-bg-layer-2)}}
@media(max-width:480px){.dsh-predicted-messages__suggestion{flex-basis:100%}.dsh-predicted-messages__bar{column-gap:6px}}
.dsh-predicted-messages--settings{font-size:14px;padding:16px 0;margin:0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsh-predicted-messages__setting-row{display:flex;align-items:center;gap:20px;justify-content:space-between}
.dsh-predicted-messages__setting-copy{min-width:0;flex:1}
.dsh-predicted-messages__setting-copy strong{color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-predicted-messages__setting-copy p{margin:4px 0;font-size:13px;line-height:1.6}
.dsh-predicted-messages__setting-footer{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:14px}
.dsh-predicted-messages__save{padding:6px 16px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)!important}
@media(prefers-reduced-motion:reduce){.dsh-predicted-messages__thumb{transition:none}}
`;
    function parsePayload(remote, t) {
      if (!remote || remote.ok !== true) {
        const error = new Error(remote?.error?.message || t('error.failed'));
        error.code = remote?.error?.code;
        throw error;
      }
      const outcome = remote.value?.result;
      if (!outcome) throw new Error(t('error.command'));
      if (outcome.kind === 'error') throw new Error(outcome.text || t('error.failed'));
      let payload;
      try { payload = JSON.parse(outcome.text); } catch { throw new Error(t('error.response')); }
      if (outcome.kind !== 'success' || !payload || typeof payload.enabled !== 'boolean'
        || !Number.isSafeInteger(payload.revision) || payload.revision < 0
        || !Array.isArray(payload.suggestions) || !payload.suggestions.every(item => typeof item === 'string')
        || !['ready', 'empty', 'busy', 'disabled', 'stale'].includes(payload.status)) {
        throw new Error(t('error.response'));
      }
      return {
        enabled: payload.enabled,
        revision: payload.revision,
        status: payload.status,
        suggestions: [...new Set(payload.suggestions.map(text => text.trim()).filter(Boolean))].slice(0, 2),
        model: typeof payload.model === 'string' ? payload.model : undefined,
      };
    }
    function insertDraft(inputActions, draftRev, text) {
      if (!inputActions) return false;
      const span = inputActions.captureInsertion();
      return span.draftRev === draftRev && span.start === 0 && span.end === 0
        && inputActions.insertText(text, span);
    }
    // One user-click request per Session until admission and its visible echo settle.
    // This calls the standard human prompt path, never an independent model API.
    function createSuggestionRequester(bindingOf, changed = () => {}) {
      const pending = new Map();
      let disposed = false;
      function release(id, entry) {
        if (entry.settled && entry.retired && pending.get(id) === entry) {
          pending.delete(id);
          changed();
        }
      }
      return {
        isPending: id => pending.has(id),
        async request(id, text, allowed) {
          if (disposed || pending.has(id) || !allowed()) return false;
          const session = bindingOf(id)?.session;
          const snapshot = session?.getSnapshot();
          if (!snapshot || snapshot.running !== false || snapshot.openState !== 'open'
            || snapshot.removed !== false || snapshot.subagent != null
            || snapshot.awaitingFirstTurn || snapshot.pendingSubmissions.length > 0) return false;
          const entry = { controller: new AbortController(), settled: false, retired: false };
          pending.set(id, entry);
          changed();
          let handle;
          try {
            handle = session.beginSubmission({ mode: 'queue', text, attachments: [], onRetire() {
              entry.retired = true;
              release(id, entry);
            } });
            const result = await session.prompt([{ type: 'text', text }], 'queue', entry.controller.signal, handle.requestId);
            if (!result.ok) throw result.error;
            if (result.value?.accepted !== true) throw new Error('Invalid prompt acceptance.');
            return true;
          } catch (error) {
            handle?.abandon();
            entry.retired = true;
            throw error;
          } finally {
            entry.settled = true;
            release(id, entry);
          }
        },
        dispose() {
          disposed = true;
          for (const entry of pending.values()) entry.controller.abort();
          pending.clear();
        },
      };
    }
    return {
      insertDraft,
      createSuggestionRequester,
      inject: ['slots', 'sessions', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'predicted-messages: dictionaries');
        // Own browser-local suppression and shared switch state in the plugin lifetime.
        // The Host remains the authority for the durable switch and durable suggestions.
        const rounds = new Map();
        const listeners = new Set();
        let settings = { enabled: null, pending: false };
        let settingEpoch = 0;
        const requests = new Set();
        const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
        const getSettings = () => settings;
        const requester = createSuggestionRequester(id => ctx.sessions.binding(id), () => {
          for (const listener of listeners) listener();
        });
        const publishSettings = next => {
          if (settings.enabled === next.enabled && settings.pending === next.pending) return;
          settings = next;
          for (const listener of listeners) listener();
        };
        ctx.effect(() => () => {
          for (const controller of requests) controller.abort();
          requests.clear();
          requester.dispose();
          rounds.clear();
          listeners.clear();
        }, 'predicted-messages: requests and local state');
        async function command(sessionId, args, signal, t) {
          const scope = ctx.sessions.scope(sessionId);
          if (!scope) throw new Error(t('error.unavailable'));
          // Generated Client contract: scoped agent argument is bound by scope();
          // remaining positional args are full slash line, attachments, AbortSignal.
          const response = await scope.remote.commands.execute(
            `/predicted-messages ${JSON.stringify(args)}`, [], signal,
          );
          return parsePayload(response, t);
        }
        function makeController() {
          const controller = new AbortController();
          requests.add(controller);
          return controller;
        }
        function recordFor(sessionId) {
          if (!rounds.has(sessionId)) rounds.set(sessionId, {
            hiddenRevision: null,
          });
          return rounds.get(sessionId);
        }
        function PredictionDock(props) {
          const { sessionId, inputActions, t } = props;
          const revision = props.useProjection(PROJECTION, value => value?.revision);
          const ready = props.useProjection(PROJECTION, value => value?.ready === true);
          const running = props.useSession(session => session.running);
          const openState = props.useSession(session => session.openState);
          const removed = props.useSession(session => session.removed);
          const subagent = props.useSession(session => session.subagent);
          const pendingSubmissions = props.useSession(session => session.pendingSubmissions.length);
          const awaitingFirstTurn = props.useSession(session => session.awaitingFirstTurn);
          const canPrompt = props.useSessionAccess(sessionId, 'session/prompt');
          const requesting = React.useSyncExternalStore(subscribe, () => requester.isPending(sessionId), () => false);
          const draft = props.useInput(input => input.draft);
          const draftRev = props.useInput(input => input.draftRev);
          const attachmentCount = props.useInput(input => input.attachmentIds.length);
          const phase = props.useInput(input => input.phase);
          const switches = React.useSyncExternalStore(subscribe, getSettings, getSettings);
          const record = recordFor(sessionId);
          const [view, setView] = React.useState(null);
          const [error, setError] = React.useState('');
          const [hiddenRevision, setHiddenRevision] = React.useState(record.hiddenRevision);
          const empty = draft === '' && attachmentCount === 0 && phase === 'plain';
          const idle = running === false && removed === false && openState === 'open';
          const eligible = idle && empty && ready && switches.enabled === true && !switches.pending;
          const canGenerate = idle && !subagent && !awaitingFirstTurn && pendingSubmissions === 0
            && switches.enabled === true && !switches.pending && canPrompt && !requesting;
          const latest = React.useRef(null);
          latest.current = { revision, eligible, draftRev, canGenerate, canPrompt };
          const alive = React.useRef(false);
          React.useEffect(() => {
            alive.current = true;
            return () => { alive.current = false; };
          }, []);
          async function generate() {
            if (!latest.current.canGenerate) return;
            setError('');
            try {
              await requester.request(sessionId, t('request.text'), () => alive.current && latest.current.canPrompt
                && settings.enabled === true && !settings.pending);
            } catch (reason) {
              if (alive.current) setError(reason.message || t('error.request'));
            }
          }
          React.useEffect(() => {
            setView(null);
            setError('');
            if (!Number.isSafeInteger(revision) || switches.pending || openState !== 'open') return;
            const controller = makeController();
            const epoch = settingEpoch;
            command(sessionId, { action: 'status' }, controller.signal, t).then(payload => {
              if (controller.signal.aborted || latest.current.revision !== revision || settingEpoch !== epoch) return;
              if (!settings.pending) publishSettings({ enabled: payload.enabled, pending: false });
              if (payload.revision === revision) setView(payload);
            }).catch(reason => {
              if (!controller.signal.aborted) setError(reason.message || t('error.failed'));
            }).finally(() => requests.delete(controller));
            return () => controller.abort();
          }, [sessionId, revision, openState, switches.pending, switches.enabled]);
          function hide() {
            record.hiddenRevision = revision;
            setHiddenRevision(revision);
          }
          function insert(text) {
            const current = latest.current;
            if (!current.eligible || settings.enabled !== true || settings.pending
              || current.revision !== view?.revision || !inputActions) return;
            // Compare the live editor, then insertText performs the atomic CAS.
            if (!insertDraft(inputActions, current.draftRev, text)) {
              setError(t('error.draftChanged'));
              return;
            }
            hide();
          }
          const suggestions = eligible && hiddenRevision !== revision && view?.revision === revision
            && view.status === 'ready' ? view.suggestions : [];
          const notice = switches.enabled === false ? 'request.disabled'
            : subagent || !canPrompt ? 'request.unavailable'
            : requesting || running || awaitingFirstTurn || pendingSubmissions ? 'request.waiting'
            : view?.status === 'empty' ? 'request.empty' : 'request.hint';
          return h('div', { className: 'dsh-predicted-messages__frame' },
            h('section', { className: 'dsh-predicted-messages dsh-predicted-messages--dock', 'aria-label': t('title') },
              h('style', null, CSS),
              h('div', { className: 'dsh-predicted-messages__bar' },
                h('span', { className: 'dsh-predicted-messages__title', title: t('description') }, t('title')),
                h('div', { className: 'dsh-predicted-messages__actions' },
                  h('button', { type: 'button', className: 'dsh-predicted-messages__action',
                    disabled: !canGenerate, onClick: generate, title: t('request.hint') }, t(requesting ? 'request.pending' : 'request.generate')),
                  suggestions.length > 0 && h('button', { type: 'button', className: 'dsh-predicted-messages__action', onClick: hide }, t('hide')))),
              h('p', { role: 'status' }, t(notice)),
              suggestions.length > 0 && h('div', { className: 'dsh-predicted-messages__suggestions', 'aria-label': t('status.ready') },
                suggestions.map(text => h('button', {
                  key: text, type: 'button', className: 'dsh-predicted-messages__suggestion',
                  'aria-label': t('insert', { text }), onClick: () => insert(text),
                }, text))),
              error && h('p', { role: 'status', className: 'dsh-predicted-messages__error' }, error)));
        }
        function PredictionSettings({ t, useRemoteAccess }) {
          const canRead = useRemoteAccess('settings/describe');
          const canWrite = useRemoteAccess('settings/update');
          const [descriptor, setDescriptor] = React.useState(null);
          const [draft, setDraft] = React.useState(false);
          const [writable, setWritable] = React.useState(false);
          const [loading, setLoading] = React.useState(true);
          const [saving, setSaving] = React.useState(false);
          const [saved, setSaved] = React.useState(false);
          const [error, setError] = React.useState('');
          const [retry, setRetry] = React.useState(0);
          const alive = React.useRef(false);
          const ownRequests = React.useRef(new Set());
          const pendingEpoch = React.useRef(null);
          React.useEffect(() => {
            alive.current = true;
            return () => {
              alive.current = false;
              for (const controller of ownRequests.current) controller.abort();
              ownRequests.current.clear();
              if (pendingEpoch.current === settingEpoch && settings.pending) {
                settingEpoch += 1;
                publishSettings({ enabled: null, pending: false });
              }
            };
          }, []);
          React.useEffect(() => {
            if (!canRead) { setLoading(false); setError(t('settings.readonly')); return; }
            const controller = makeController();
            ownRequests.current.add(controller);
            setLoading(true);
            setError('');
            ctx.remote.settings.describe(controller.signal).then(result => {
              if (!alive.current || controller.signal.aborted) return;
              if (!result.ok) throw new Error(result.error.message);
              const matches = result.value.namespaces.filter(row => row.ns.split(':').at(-1) === 'local-predicted-messages');
              const entry = matches.length === 1 ? matches[0] : null;
              if (!entry || typeof entry.value?.enabled !== 'boolean') throw new Error(t('settings.missing'));
              setDescriptor(entry);
              setDraft(entry.value.enabled);
              setWritable(result.value.writable);
              if (!settings.pending) publishSettings({ enabled: entry.value.enabled, pending: false });
            }).catch(reason => {
              if (alive.current && !controller.signal.aborted) setError(reason.message || t('settings.missing'));
            }).finally(() => {
              requests.delete(controller);
              ownRequests.current.delete(controller);
              if (alive.current && !controller.signal.aborted) setLoading(false);
            });
            return () => controller.abort();
          }, [canRead, retry, t]);
          async function save() {
            if (!descriptor || saving || !writable || !canWrite) return;
            const controller = makeController();
            ownRequests.current.add(controller);
            const epoch = ++settingEpoch;
            pendingEpoch.current = epoch;
            publishSettings({ enabled: settings.enabled, pending: true });
            setSaving(true);
            setSaved(false);
            setError('');
            try {
              const result = await ctx.remote.settings.update(descriptor.ns, { enabled: draft }, descriptor.revision, controller.signal);
              if (!alive.current || controller.signal.aborted) return;
              if (!result.ok) throw new Error(result.error.message);
              if (typeof result.value.value?.enabled !== 'boolean') throw new Error(t('error.response'));
              setDescriptor(result.value);
              setDraft(result.value.value.enabled);
              if (settingEpoch === epoch) publishSettings({ enabled: result.value.value.enabled, pending: false });
              setSaved(true);
            } catch (reason) {
              if (alive.current && !controller.signal.aborted) {
                setDescriptor(null);
                setError(reason.message || t('error.configure'));
                if (settingEpoch === epoch) publishSettings({ enabled: null, pending: false });
              }
            } finally {
              requests.delete(controller);
              ownRequests.current.delete(controller);
              if (alive.current && !controller.signal.aborted) setSaving(false);
              if (pendingEpoch.current === epoch) pendingEpoch.current = null;
            }
          }
          return h('section', { className: 'dsh-predicted-messages dsh-predicted-messages--settings', 'aria-label': t('settings.label') },
            h('style', null, CSS),
            h('div', { className: 'dsh-predicted-messages__setting-row' },
              h('div', { className: 'dsh-predicted-messages__setting-copy' },
                h('strong', null, t('settings.label')),
                h('p', null, t('settings.description')),
                h('p', null, t('settings.cost'))),
              h('button', {
                type: 'button', role: 'switch', 'aria-checked': draft, 'aria-label': t('settings.label'),
                disabled: loading || saving || !descriptor || !writable || !canWrite,
                className: 'dsh-predicted-messages__toggle',
                onClick: () => { setDraft(value => !value); setSaved(false); },
              }, h('span', { className: 'dsh-predicted-messages__track', 'aria-hidden': true },
                h('span', { className: 'dsh-predicted-messages__thumb' })),
                h('span', { 'aria-hidden': true }, t(draft ? 'enabled' : 'disabled')))),
            h('div', { className: 'dsh-predicted-messages__setting-footer' },
              h('button', {
                type: 'button', className: 'dsh-predicted-messages__save', onClick: save,
                disabled: loading || saving || !descriptor || !writable || !canWrite || draft === descriptor?.value?.enabled,
              }, t(saving ? 'settings.saving' : 'settings.save')),
              error && h('button', { type: 'button', className: 'dsh-predicted-messages__action', disabled: loading || saving,
                onClick: () => { setSaved(false); setRetry(value => value + 1); } }, t('retry')),
              h('span', { role: 'status', className: error ? 'dsh-predicted-messages__error' : '' },
                error || (loading ? t('status.loading') : saved ? t('settings.saved') : !writable || !canWrite ? t('settings.readonly') : ''))));
        }
        ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
          name: 'plugins.bundle.config', key: 'dsh-predicted-messages', locale: NS,
        }, props => props.view === 'summary' ? props.t('settings.description') : h(PredictionSettings, props)));
        // React must dispose the old request owner before another Session renders.
        function Entry(props) {
          return props.sessionId ? h(PredictionDock, { ...props, key: props.sessionId }) : null;
        }
        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock', id: 'local-predicted-messages-aligned', order: 40, locale: NS,
        }, Entry));
        // Read-only status commands belong in the dock, not generic Chat cards.
        ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
          name: 'conversation.chat.commandview', key: 'predicted-messages',
        }, () => null));
      },
    };
  },
});
