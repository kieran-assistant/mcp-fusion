import { describe, it, expect } from 'vitest';
import { definePrompt, PromptMessage } from '../../src/prompt/index.js';
import { PromptRegistry } from '../../src/prompt/PromptRegistry.js';

// ── Context ──────────────────────────────────────────────

interface Ctx { user: string }
const ctx = (): Ctx => ({ user: 'tester' });

const testPrompt = definePrompt<Ctx>('role-test', {
    description: 'Role test prompt',
    handler: async () => ({
        messages: [PromptMessage.user('hello')],
    }),
});

// ── Tests ────────────────────────────────────────────────

describe('Bug #92 — PromptRegistry interceptor builder roles', () => {
    it('prependSystem uses role "assistant"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);

        registry.useInterceptor(async (_ctx, builder) => {
            builder.prependSystem('system instruction');
        });

        const result = await registry.routeGet(ctx(), 'role-test', {});
        const firstMessage = result.messages[0];
        expect(firstMessage.role).toBe('assistant');
        expect(firstMessage.content).toEqual({ type: 'text', text: 'system instruction' });
    });

    it('appendSystem uses role "assistant"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);

        registry.useInterceptor(async (_ctx, builder) => {
            builder.appendSystem('system end');
        });

        const result = await registry.routeGet(ctx(), 'role-test', {});
        const lastMessage = result.messages[result.messages.length - 1];
        expect(lastMessage.role).toBe('assistant');
    });

    it('prependUser and appendUser still use role "user"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);

        registry.useInterceptor(async (_ctx, builder) => {
            builder.prependUser('first');
            builder.appendUser('last');
        });

        const result = await registry.routeGet(ctx(), 'role-test', {});
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[result.messages.length - 1].role).toBe('user');
    });

    it('appendAssistant still uses role "assistant"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);

        registry.useInterceptor(async (_ctx, builder) => {
            builder.appendAssistant('done');
        });

        const result = await registry.routeGet(ctx(), 'role-test', {});
        const lastMessage = result.messages[result.messages.length - 1];
        expect(lastMessage.role).toBe('assistant');
    });
});
