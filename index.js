// Cordis is provided by the DSH host through peer-aware runtime resolution.
import { Service } from '@deepseek-ai/cordis';
import schema from '@deepseek-ai/schemastery';
import { z } from 'zod';
import { PredictionRuntime, PROJECTION_KEY, initialState, foldContext, validateInput, TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMETERS } from './core.js';

const drafts = z.array(z.string().max(320)).max(2);
const viewSchema = z.object({ revision: z.number(), ready: z.boolean(), suggestions: drafts });
const stateSchema = z.object({
  sessionId: z.string(), inheritedEventCount: z.number(), turn: z.number().nullable(),
  calls: z.array(z.object({ callId: z.string(), step: z.number(), suggestions: drafts })).max(16),
  pending: drafts, view: viewSchema,
});
export default class PredictedMessages extends Service {
  static inject = ['sessions', 'sessionProjections', 'commands', 'tools', 'configEditor'];
  static Config = schema.object({
    enabled: schema.boolean().default(true).description('Display next-message drafts submitted by the conversation model.'),
    // Accepted for existing profile migrations; no longer used.
    provider: schema.string().default(''), model: schema.string().default(''),
    contextChars: schema.number().default(12000), summaryChars: schema.number().default(4000),
    totalChars: schema.number().default(16000), summaryOrigin: schema.string().default(''),
    timeoutMs: schema.number().default(30000),
  });
  constructor(ctx, config) {
    super(ctx, 'predictedMessages');
    this.config = config;
  }
  async [Service.init]() {
    const ctx = this.ctx;
    const projection = await ctx.sessionProjections.register({
      key: PROJECTION_KEY, stateVersion: 3, stateSchema,
      init: initialState, apply: foldContext,
      wire: { viewSchema, view: state => state.view, summary: false },
    });
    this.runtime = new PredictionRuntime({
      readState: session => projection.stateOf(session), config: this.config,
      saveEnabled: async enabled => {
        if (ctx.fiber.entry === undefined) throw new Error('当前配置不能保存。');
        await ctx.configEditor.edit(ctx.fiber.entry, current => ({ ...current, enabled }));
      },
    });
    ctx.effect(() => () => this.runtime.dispose());
    ctx.commands.register({
      name: 'predicted-messages', description: '查看下一步草稿或开启/关闭显示。',
      input: { hint: '{"action":"status|configure","enabled":true}' }, recordInput: false,
      handler: async invocation => {
        try {
          const input = validateInput(invocation.rawInput.trim() ? JSON.parse(invocation.rawInput) : {});
          if (input.action === 'submit') throw new Error('submit is available only to a turn-bound model tool call.');
          const value = await this.operate(invocation.agent, input, invocation.signal);
          return { kind: 'success', text: JSON.stringify(value) };
        } catch (error) { return { kind: 'error', text: error instanceof Error ? error.message : String(error) }; }
      },
    });
    ctx.tools.register({
      name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: TOOL_PARAMETERS,
      output: {
        schema: { type: 'object', properties: {
          enabled: { type: 'boolean' }, revision: { type: 'number' }, suggestions: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' }, model: { type: 'string' }, sessionId: { type: 'string' }, turn: { type: 'number' }, callId: { type: 'string' },
        }, required: ['enabled', 'revision', 'suggestions', 'status', 'model'], additionalProperties: false },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      execute: async (args, exec) => this.operate(exec.agent, validateInput(args), exec.signal, exec.callId),
    });
  }
  async operate(agent, input, signal, callId) {
    if (!agent) throw new Error('此操作需要当前会话。');
    const session = this.ctx.sessions.get(agent.id);
    if (!session) throw new Error('会话尚未打开。');
    return this.runtime.operate(session, input, signal, callId);
  }
}
