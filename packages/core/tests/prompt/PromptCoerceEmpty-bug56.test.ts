/**
 * Bug #56 — `coercePromptArgs` coerces empty string to 0 for ZodNumber.
 *
 * `Number("")` → 0, which silently passes `z.number()`. The user
 * intended "no value" but the handler receives 0.
 *
 * Why existing tests missed it:
 * All coerce tests pass non-empty numeric strings like "42" or "50".
 * No test ever sent empty string for a number field.
 *
 * Fix: Guard `if (value === '') break;` skips coercion, leaving the
 * field out of the coerced map so Zod rejects it as missing.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { coercePromptArgs } from '../../src/prompt/PromptExecutionPipeline.js';

describe('coercePromptArgs — empty string for number field (Bug #56)', () => {
    const schema = z.object({
        count: z.number(),
        name: z.string(),
    });

    it('should NOT coerce empty string to 0 for ZodNumber', () => {
        const result = coercePromptArgs({ count: '' }, schema);
        // Empty string should be left as-is (not coerced to 0)
        // so that Zod validation rejects it later as missing/invalid
        expect(result.count).not.toBe(0);
    });

    it('should leave empty string field out of coerced map', () => {
        const result = coercePromptArgs({ count: '' }, schema);
        // The key should not exist (break skips the assignment)
        expect('count' in result).toBe(false);
    });

    it('should still coerce non-empty numeric strings', () => {
        const result = coercePromptArgs({ count: '42' }, schema);
        expect(result.count).toBe(42);
    });

    it('should still coerce "0" to 0 (real zero)', () => {
        const result = coercePromptArgs({ count: '0' }, schema);
        expect(result.count).toBe(0);
    });

    it('should pass empty string through for ZodString fields', () => {
        const result = coercePromptArgs({ name: '' }, schema);
        expect(result.name).toBe('');
    });

    it('should cause Zod validation to reject the missing number field', () => {
        const coerced = coercePromptArgs({ count: '' }, schema);
        const parsed = schema.safeParse(coerced);
        expect(parsed.success).toBe(false);
    });

    it('should handle optional number field with empty string', () => {
        const optSchema = z.object({ limit: z.number().optional() });
        const result = coercePromptArgs({ limit: '' }, optSchema);
        // Empty string should not become 0 even for optional numbers
        expect(result.limit).not.toBe(0);
    });
});
