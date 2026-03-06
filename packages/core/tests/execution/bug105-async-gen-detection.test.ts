/**
 * Regression test: isAsyncGeneratorFunction must detect transpiled generators.
 *
 * The fix adds a duck-type fallback that checks `Symbol.asyncIterator`
 * on the function's prototype, so transpiled code is detected correctly.
 */
import { describe, it, expect } from 'vitest';
import { compileMiddlewareChains } from '../../src/core/execution/MiddlewareCompiler.js';
import type { InternalAction } from '../../src/core/types.js';

describe('MiddlewareCompiler — async generator detection (bug #105)', () => {
    it('wraps a native async generator handler in GeneratorResultEnvelope', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async function* nativeGen(_ctx: any, _args: any) {
            yield { type: 'text' as const, text: 'step1' };
            return { content: [{ type: 'text' as const, text: 'done' }] };
        }

        const action: InternalAction<void> = {
            key: 'test-native',
            groupName: undefined,
            groupDescription: undefined,
            actionName: 'test-native',
            description: undefined,
            schema: undefined,
            destructive: undefined,
            idempotent: undefined,
            readOnly: undefined,
            middlewares: undefined,
            omitCommonFields: undefined,
            returns: undefined,
            handler: nativeGen as unknown as InternalAction<void>['handler'],
        };

        const chain = compileMiddlewareChains([action], []);
        const fn = chain.get('test-native')!;
        const result = await fn(undefined as void, {}) as { __brand: string; generator: AsyncGenerator };

        expect(result.__brand).toBe('GeneratorResultEnvelope');
        expect(result.generator).toBeDefined();
    });

    it('detects transpiled async generator via Symbol.asyncIterator duck-type', async () => {
        // Simulate a transpiled async generator: a plain function whose prototype
        // has Symbol.asyncIterator but lacks the native toStringTag.
        function transpiledGen(_ctx: unknown, _args: Record<string, unknown>) {
            return {
                async next() { return { value: 'done', done: true as const }; },
                async return() { return { value: undefined, done: true as const }; },
                async throw(e: unknown) { throw e; },
                [Symbol.asyncIterator]() { return this; },
            };
        }
        // Mimic transpiled prototype: has Symbol.asyncIterator
        transpiledGen.prototype = {
            [Symbol.asyncIterator]() { return this; },
        };

        const action: InternalAction<void> = {
            key: 'test-transpiled',
            groupName: undefined,
            groupDescription: undefined,
            actionName: 'test-transpiled',
            description: undefined,
            schema: undefined,
            destructive: undefined,
            idempotent: undefined,
            readOnly: undefined,
            middlewares: undefined,
            omitCommonFields: undefined,
            returns: undefined,
            handler: transpiledGen as unknown as InternalAction<void>['handler'],
        };

        const chain = compileMiddlewareChains([action], []);
        const fn = chain.get('test-transpiled')!;
        const result = await fn(undefined as void, {}) as { __brand: string };

        // Should be wrapped in GeneratorResultEnvelope thanks to duck-type fallback
        expect(result.__brand).toBe('GeneratorResultEnvelope');
    });

    it('does NOT wrap a regular async function', async () => {
        async function regularHandler(_ctx: void, _args: Record<string, unknown>) {
            return { content: [{ type: 'text' as const, text: 'hello' }] };
        }

        const action: InternalAction<void> = {
            key: 'test-regular',
            groupName: undefined,
            groupDescription: undefined,
            actionName: 'test-regular',
            description: undefined,
            schema: undefined,
            destructive: undefined,
            idempotent: undefined,
            readOnly: undefined,
            middlewares: undefined,
            omitCommonFields: undefined,
            returns: undefined,
            handler: regularHandler,
        };

        const chain = compileMiddlewareChains([action], []);
        const fn = chain.get('test-regular')!;
        const result = await fn(undefined as void, {}) as { content: unknown[] };

        // Regular handler result — NOT wrapped in envelope
        expect(result.content).toBeDefined();
        expect((result as { __brand?: string }).__brand).toBeUndefined();
    });
});
