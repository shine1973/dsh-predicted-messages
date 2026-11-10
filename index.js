// Cordis is provided by the DSH host through peer-aware runtime resolution.
import { Service } from '@deepseek-ai/cordis';
import schema from '@deepseek-ai/schemastery';
import { z } from 'zod';
import { readSummaries, localOrigin } from './summaries.js';
import { PredictionRuntime, PROJECTION_KEY, initialState, foldContext } from './core.js';

const viewSchema = z.object({ revision: z.number(), ready: z.boolean() });
const stateSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string(), seq: z.number(), turn: z.number() })).max(10),
  view: viewSchema,
});
const inputSchema = z.object({ action: z.enum(['status', 'generate', 'configure']).default('status'), enabled: z.boolean().optional(), refresh: z.boolean().optional() }).strict();

export default class PredictedMessages extends Service {
  static inject = ['llm', 'sessions', 'sessionProjections', 'commands', 'tools', 'configEditor', 'agents'];
  static Config = schema.object({
    enabled: schema.boolean().default(true).description('Automatically predict the next user message.'),
    provider: schema.string().default('').description('Optional provider override; requires model. Empty follows the conversation.'),
    model: schema.string().default('').description('Optional model override; requires provider.'),
    contextChars: schema.number().step(1).min(1000).max(20000).default(12000),
    summaryChars: schema.number().step(1).min(0).max(20000).default(4000).description('Historical summary UTF-16 budget; zero disables summary reads.'),
    totalChars: schema.number().step(1).min(1000).max(40000).default(16000).description('Serialized prediction input UTF-16 limit, including JSON overhead.'),
    summaryOrigin: schema.string().default('').description('Loopback HTTP origin; empty discovers billion-context proxy-origin.'),
    timeoutMs: schema.number().step(1).min(5000).max(60000).default(30000),
  });
  constructor(ctx, config) {
    super(ctx, 'predictedMessages');
    this.config = config;
    if (config.totalChars < config.contextChars || config.totalChars < config.summaryChars) throw new Error('totalChars must cover each individual budget.');
    if (config.summaryOrigin) localOrigin(config.summaryOrigin);
    if (Boolean(config.provider) !== Boolean(config.model)) throw new Error('预测模型的 provider 与 model 必须同时填写。');
  }
  async [Service.init]() {
    const ctx = this.ctx;
    const projection = await ctx.sessionProjections.register({
      key: PROJECTION_KEY, stateVersion: 2, stateSchema,
      init: initialState, apply: foldContext,
      wire: { viewSchema, view: state => state.view, summary: false },
    });
    this.runtime = new PredictionRuntime({
      llm: ctx.llm,
      readSummaries,
      readState: session => projection.stateOf(session),
      selection: session => this.config.provider ? { provider: this.config.provider, model: this.config.model } : ctx.agents.get(session.id)?.model.current() ?? session.requestHeader()?.config,
      config: this.config,
      saveEnabled: async enabled => {
        if (ctx.fiber.entry === undefined) throw new Error('当前配置不能保存。');
        await ctx.configEditor.edit(ctx.fiber.entry, current => ({ ...current, enabled }));
      },
    });
    ctx.effect(() => () => this.runtime.dispose());
    // The projection owns folding. This listener only cancels superseded I/O.
    ctx.sessionProjections.onChanged((session, key) => {
      if (key === PROJECTION_KEY) this.runtime.invalidate(session);
    });
    ctx.commands.register({
      name: 'predicted-messages', description: '预测下一条用户消息；查看状态或开启/关闭预测。',
      input: { hint: '{"action":"status|generate|configure","enabled":true}' },
      recordInput: false,
      handler: async invocation => {
        try {
          const input = inputSchema.parse(invocation.rawInput.trim() ? JSON.parse(invocation.rawInput) : {});
          const value = await this.operate(invocation.agent, input, invocation.signal);
          return { kind: 'success', text: JSON.stringify(value) };
        } catch (error) { return { kind: 'error', text: error instanceof Error ? error.message : String(error) }; }
      },
    });
    ctx.tools.register({
      name: 'predicted_messages',
      description: 'Read or generate next-user-message suggestions for this conversation, or persist the prediction switch. Suggestions are drafts; this tool never sends a message.',
      parameters: {
        type: 'object', properties: {
          action: { type: 'string', enum: ['status', 'generate', 'configure'], description: 'Defaults to status. generate uses the current model after a completed reply.' },
          enabled: { type: 'boolean', description: 'Required for configure; applies to this DSH profile.' },
          refresh: { type: 'boolean', description: 'For generate: bypass the cached suggestion, subject to a two-second cooldown.' },
        }, additionalProperties: false,
      },
      output: {
        schema: { type: 'object', properties: { enabled: { type: 'boolean' }, revision: { type: 'number' }, suggestions: { type: 'array', items: { type: 'string' } }, status: { type: 'string' }, model: { type: 'string' } }, required: ['enabled', 'revision', 'suggestions', 'status', 'model'], additionalProperties: false },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      timeoutMs: 65000,
      execute: async (args, exec) => this.operate(exec.agent, inputSchema.parse(args), exec.signal),
    });
  }
  async operate(agent, input, signal) {
    if (!agent) throw new Error('此操作需要当前会话。');
    const session = this.ctx.sessions.get(agent.id);
    if (!session) throw new Error('会话尚未打开。');
    return this.runtime.operate(session, input, signal);
  }
}
