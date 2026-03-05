/**
 * Bug #38 Regression — createGroup.execute() must use Zod result.data
 *
 * Previous tests only verified pass/fail validation (valid input passes,
 * invalid input returns error). They never tested that Zod transforms,
 * defaults, and strip behavior are actually forwarded to the handler.
 *
 * The bug: handler received raw `args` instead of `result.data`,
 * silently discarding transforms, defaults, and stripped keys.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createGroup } from '../../src/core/createGroup.js';
import { success } from '../../src/core/response.js';

describe('Bug #38 — createGroup passes Zod result.data to handler', () => {
    it('should forward Zod .transform() result to handler', async () => {
        const group = createGroup<void>({
            name: 'transform-test',
            actions: {
                parse_number: {
                    schema: z.object({
                        value: z.string().transform(Number),
                    }),
                    handler: async (_ctx, args) => {
                        // After transform, 'value' should be a number
                        return success({ type: typeof args.value, value: args.value });
                    },
                },
            },
        });

        const result = await group.execute(
            undefined as never,
            'parse_number',
            { value: '42' },
        );
        const data = JSON.parse(result.content[0].text);
        expect(data.type).toBe('number');
        expect(data.value).toBe(42);
    });

    it('should forward Zod .default() values to handler', async () => {
        const group = createGroup<void>({
            name: 'default-test',
            actions: {
                with_defaults: {
                    schema: z.object({
                        name: z.string(),
                        role: z.string().default('user'),
                    }),
                    handler: async (_ctx, args) => {
                        return success({ name: args.name, role: args.role });
                    },
                },
            },
        });

        // Omit 'role' — Zod default should fill it
        const result = await group.execute(
            undefined as never,
            'with_defaults',
            { name: 'Alice' },
        );
        const data = JSON.parse(result.content[0].text);
        expect(data.name).toBe('Alice');
        expect(data.role).toBe('user');
    });

    it('should strip unknown keys when schema uses .strip()', async () => {
        const group = createGroup<void>({
            name: 'strip-test',
            actions: {
                strict: {
                    schema: z.object({
                        allowed: z.string(),
                    }).strip(),
                    handler: async (_ctx, args) => {
                        return success({
                            keys: Object.keys(args),
                            allowed: args.allowed,
                        });
                    },
                },
            },
        });

        const result = await group.execute(
            undefined as never,
            'strict',
            { allowed: 'yes', extraField: 'should-be-stripped' },
        );
        const data = JSON.parse(result.content[0].text);
        expect(data.keys).toEqual(['allowed']);
        expect(data.allowed).toBe('yes');
    });

    it('should handle chained transforms (.trim().toLowerCase())', async () => {
        const group = createGroup<void>({
            name: 'chain-test',
            actions: {
                normalize: {
                    schema: z.object({
                        email: z.string().trim().toLowerCase(),
                    }),
                    handler: async (_ctx, args) => {
                        return success({ email: args.email });
                    },
                },
            },
        });

        const result = await group.execute(
            undefined as never,
            'normalize',
            { email: '  Alice@Example.COM  ' },
        );
        const data = JSON.parse(result.content[0].text);
        expect(data.email).toBe('alice@example.com');
    });

    it('should work without schema (pass args as-is)', async () => {
        const group = createGroup<void>({
            name: 'no-schema-test',
            actions: {
                raw: {
                    handler: async (_ctx, args) => {
                        return success(args);
                    },
                },
            },
        });

        const result = await group.execute(
            undefined as never,
            'raw',
            { anything: 'goes' },
        );
        const data = JSON.parse(result.content[0].text);
        expect(data.anything).toBe('goes');
    });
});
