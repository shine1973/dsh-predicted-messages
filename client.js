window.__ModuleLoader__.load({
  id: 'dsh-predicted-messages',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'local-predicted-messages';
    const PROJECTION = 'localPredictedMessagesContext';
    // Embedded for the lazy browser artifact; keep identical to locale/*.json.
    const en = {
      title: 'Predicted messages',
      description: 'Suggest up to two possible next messages using the current session model. Selecting a suggestion only fills the draft.',
      toggle: 'Enable predicted messages',
      'settings.label': 'Show predicted messages',
      'settings.description': 'Predict what you may send next from the conversation. Selecting a suggestion fills an editable draft.',
      'settings.cost': 'Uses the conversation model and a small additional amount of model quota.',
      'settings.save': 'Save', 'settings.saving': 'Saving…', 'settings.saved': 'Saved',
      'settings.missing': 'The prediction configuration is unavailable',
      'settings.readonly': 'This connection cannot change plugin settings',
      enabled: 'On', disabled: 'Off', refresh: 'Refresh', retry: 'Retry',
      hide: 'Hide this round', insert: 'Fill draft: {text}',
      'status.loading': 'Loading…', 'status.generating': 'Predicting…',
      'status.waiting': 'Available after a reply',
      'status.empty': 'No suggestions this round',
      'status.busy': 'Prediction already in progress; refresh later',
      'status.stale': 'Conversation changed; refresh to try again',
      'status.hidden': 'Hidden for this round',
      'status.ready': 'Select a suggestion to edit before sending',
      'status.cancelled': 'Prediction stopped; refresh to try again',
      'error.unavailable': 'This session is unavailable',
      'error.command': 'The prediction command is unavailable',
      'error.response': 'The prediction service returned an invalid response',
      'error.failed': 'Unable to load predictions',
      'error.draftChanged': 'Your draft changed; it was preserved',
      'error.configure': 'Could not save the prediction setting',
    };
    const zh = {
      title: '预测消息',
      description: '使用当前会话模型，预测最多两条下一步消息。点击建议只填入草稿。',
      toggle: '启用预测消息',
      'settings.label': '显示预测消息',
      'settings.description': '根据对话预测你接下来要发送的消息，点击建议后可编辑再发送。',
      'settings.cost': '使用当前会话模型，会额外消耗少量模型配额。',
      'settings.save': '保存', 'settings.saving': '保存中…', 'settings.saved': '已保存',
      'settings.missing': '暂时无法读取预测消息配置',
      'settings.readonly': '当前连接无权修改插件设置',
      enabled: '开', disabled: '关', refresh: '刷新', retry: '重试',
      hide: '隐藏本轮', insert: '填入草稿：{text}',
      'status.loading': '读取中…', 'status.generating': '预测中…',
      'status.waiting': '回复完成后可用',
      'status.empty': '本轮暂无建议',
      'status.busy': '预测已在进行中，可稍后刷新',
      'status.stale': '会话已更新，可刷新重试',
      'status.hidden': '已隐藏本轮',
      'status.ready': '点击建议，编辑后再发送',
      'status.cancelled': '预测已停止，可刷新重试',
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

    return {
      inject: ['slots', 'sessions', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'predicted-messages: dictionaries');
        // Own browser-local suppression and shared switch state in the plugin lifetime.
        // The Host remains the authority for the durable switch and suggestion cache.
        const rounds = new Map();
        const listeners = new Set();
        let settings = { enabled: null, pending: false };
        let settingEpoch = 0;
        const requests = new Set();
        const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
        const getSettings = () => settings;
        const publishSettings = next => {
          if (settings.enabled === next.enabled && settings.pending === next.pending) return;
          settings = next;
          for (const listener of listeners) listener();
        };
        ctx.effect(() => () => {
          for (const controller of requests) controller.abort();
          requests.clear();
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
            attemptedRevision: null, hiddenRevision: null, response: null,
          });
          return rounds.get(sessionId);
        }

        function PredictionDock(props) {
          const { sessionId, inputActions, t } = props;
          const revision = props.useProjection(PROJECTION, value => value?.revision);
          const ready = props.useProjection(PROJECTION, value => value?.ready === true);
          const running = props.useSession(session => session.running);
          const removed = props.useSession(session => session.removed);
          const draft = props.useInput(input => input.draft);
          const draftRev = props.useInput(input => input.draftRev);
          const attachmentCount = props.useInput(input => input.attachmentIds.length);
          const phase = props.useInput(input => input.phase);
          const switches = React.useSyncExternalStore(subscribe, getSettings, getSettings);
          const record = recordFor(sessionId);
          const [view, setView] = React.useState(() => record.response);
          const [error, setError] = React.useState('');
          const [generating, setGenerating] = React.useState(false);
          const [reading, setReading] = React.useState(false);
          const [checkedRevision, setCheckedRevision] = React.useState(null);
          const [readNonce, setReadNonce] = React.useState(0);
          const [hiddenRevision, setHiddenRevision] = React.useState(() => record.hiddenRevision);
          const alive = React.useRef(false);
          const generation = React.useRef(null);
          const statusRequest = React.useRef(null);
          // Whitespace is still a user's draft: only a truly empty editor is eligible.
          const empty = draft === '' && attachmentCount === 0 && phase === 'plain';
          const idle = running === false && removed === false;
          const validRevision = Number.isSafeInteger(revision) && revision >= 0;
          const eligible = idle && empty && ready && validRevision && switches.enabled === true && !switches.pending;
          const latest = React.useRef(null);
          latest.current = { revision, eligible, empty, draftRev, idle };

          const cancelGeneration = React.useCallback(() => {
            const request = generation.current;
            if (!request) return;
            generation.current = null;
            request.controller.abort();
            // Keep attemptedRevision. Cancellation must never schedule another
            // model request at this revision, including after a session remount.
            if (alive.current) setGenerating(false);
          }, []);

          React.useLayoutEffect(() => {
            alive.current = true;
            return () => {
              alive.current = false;
              cancelGeneration();
              statusRequest.current?.abort();
            };
          }, [cancelGeneration]);
          React.useLayoutEffect(() => {
            if (!eligible || generation.current?.revision !== revision) cancelGeneration();
          }, [eligible, revision, cancelGeneration]);

          function acceptSetting(payload, epoch) {
            if (settingEpoch === epoch && !settings.pending) {
              publishSettings({ enabled: payload.enabled, pending: false });
            }
          }
          function acceptView(payload, expectedRevision) {
            if (payload.revision !== expectedRevision) return false;
            record.response = payload;
            setView(payload);
            return true;
          }

          // status performs no model request, so the switch can be read even
          // while the user is typing or the main reply is running.
          React.useEffect(() => {
            setCheckedRevision(null);
            setReading(false);
            if (!validRevision || switches.pending) return;
            const controller = makeController();
            statusRequest.current = controller;
            const epoch = settingEpoch;
            setReading(true);
            setError('');
            command(sessionId, { action: 'status' }, controller.signal, t).then(payload => {
              if (!alive.current || controller.signal.aborted || statusRequest.current !== controller
                || latest.current.revision !== revision || settingEpoch !== epoch) return;
              acceptSetting(payload, epoch);
              if (acceptView(payload, revision)) {
                if (payload.status === 'ready' || payload.status === 'busy') record.attemptedRevision = revision;
                setCheckedRevision(revision);
              }
            }).catch(reason => {
              if (alive.current && !controller.signal.aborted && statusRequest.current === controller) {
                setError(reason.message || t('error.failed'));
              }
            }).finally(() => {
              requests.delete(controller);
              if (statusRequest.current === controller) {
                statusRequest.current = null;
                if (alive.current) setReading(false);
              }
            });
            return () => {
              controller.abort();
              if (statusRequest.current === controller) statusRequest.current = null;
            };
          }, [sessionId, revision, validRevision, switches.pending, readNonce]);

          const generate = React.useCallback(refresh => {
            const current = latest.current;
            if (!alive.current || !current.eligible || settings.pending || settings.enabled !== true
              || generation.current) return;
            if (!refresh && (record.attemptedRevision === current.revision || record.hiddenRevision === current.revision)) return;
            const controller = makeController();
            const request = { controller, revision: current.revision, epoch: settingEpoch };
            generation.current = request;
            record.attemptedRevision = current.revision;
            record.hiddenRevision = null;
            setHiddenRevision(null);
            setError('');
            setGenerating(true);
            command(sessionId, { action: 'generate', ...(refresh ? { refresh: true } : {}) }, controller.signal, t)
              .then(payload => {
                if (!alive.current || controller.signal.aborted || generation.current !== request
                  || latest.current.revision !== request.revision || !latest.current.eligible
                  || settingEpoch !== request.epoch || settings.enabled !== true || settings.pending) return;
                acceptSetting(payload, request.epoch);
                if (!acceptView(payload, request.revision)) {
                  setView({ revision: request.revision, status: 'stale', suggestions: [] });
                }
              }).catch(reason => {
                if (alive.current && !controller.signal.aborted && generation.current === request) {
                  setError(reason.message || t('error.failed'));
                }
              }).finally(() => {
                requests.delete(controller);
                if (generation.current === request) {
                  generation.current = null;
                  if (alive.current) setGenerating(false);
                }
              });
          }, [sessionId, record, t]);

          React.useEffect(() => {
            if (eligible && checkedRevision === revision) generate(false);
          }, [eligible, checkedRevision, revision, generate]);

          function hide() {
            record.hiddenRevision = revision;
            record.attemptedRevision = revision;
            setHiddenRevision(revision);
            setError('');
            cancelGeneration();
          }
          function refresh() {
            if (settings.enabled === null || error && checkedRevision !== revision) {
              setReadNonce(value => value + 1);
              return;
            }
            generate(true);
          }
          function insert(text) {
            const current = latest.current;
            if (!current.eligible || settings.enabled !== true || settings.pending || generating
              || current.revision !== view?.revision || !inputActions) return;
            const span = inputActions.captureInsertion();
            // Compare the live editor with the exact empty draft shown by this
            // render; insertText checks that revision again atomically.
            if (span.draftRev !== current.draftRev || span.start !== 0 || span.end !== 0
              || !inputActions.insertText(text, span)) {
              setError(t('error.draftChanged'));
              return;
            }
            hide();
          }

          const hidden = hiddenRevision === revision;
          const currentView = view?.revision === revision ? view : null;
          const suggestions = eligible && !hidden && !generating && currentView?.status === 'ready'
            ? currentView.suggestions : [];
          const canRefresh = idle && empty && validRevision && !switches.pending && !reading && !generating
            && (switches.enabled === null || switches.enabled === true && ready);
          let status = '';
          if (error) status = error;
          else if (switches.pending || reading) status = t('status.loading');
          else if (switches.enabled === true && idle && empty) {
            if (generating) status = t('status.generating');
            else if (hidden) status = t('status.hidden');
            else if (!ready) status = t('status.waiting');
            else if (currentView?.status === 'ready') status = '';
            else if (currentView && ['busy', 'stale'].includes(currentView.status)) status = t(`status.${currentView.status}`);
            else if (record.attemptedRevision === revision && currentView?.status !== 'empty') status = t('status.cancelled');
            else if (checkedRevision === revision && record.attemptedRevision === revision) status = t('status.empty');
          }
          // The conversation only shows useful suggestions or an active result/error.
          // The persistent preference lives on the plugin page.
          if (!idle || !empty || switches.enabled === false || hidden
            || (!generating && !error && suggestions.length === 0)) return null;
          return h('section', { className: 'dsh-predicted-messages', 'aria-label': t('title') },
            h('style', null, CSS),
            h('div', { className: 'dsh-predicted-messages__bar' },
              h('span', { className: 'dsh-predicted-messages__title', title: t('description') }, t('title')),
              h('div', { className: 'dsh-predicted-messages__actions' },
                (switches.enabled !== false || error) && h('button', {
                  type: 'button', className: 'dsh-predicted-messages__action', disabled: !canRefresh,
                  onClick: refresh,
                }, t(switches.enabled === null ? 'retry' : 'refresh')),
                switches.enabled === true && !hidden && (generating || suggestions.length > 0) && h('button', {
                  type: 'button', className: 'dsh-predicted-messages__action', onClick: hide,
                }, t('hide')))),
            suggestions.length > 0 && h('div', {
              className: 'dsh-predicted-messages__suggestions', 'aria-label': t('status.ready'),
            }, suggestions.map(text => h('button', {
              key: text, type: 'button', className: 'dsh-predicted-messages__suggestion',
              'aria-label': t('insert', { text }), onClick: () => insert(text),
            }, text))),
            status && h('p', {
              className: `dsh-predicted-messages__status${error ? ' dsh-predicted-messages__error' : ''}`,
              role: 'status', 'aria-live': 'polite',
            }, status));
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
          name: 'conversation.input.dock', id: 'local-predicted-messages-above', order: 40, locale: NS,
        }, Entry));
        // Automatic prediction commands belong in the dock, not generic Chat cards.
        ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
          name: 'conversation.chat.commandview', key: 'predicted-messages',
        }, () => null));
      },
    };
  },
});
