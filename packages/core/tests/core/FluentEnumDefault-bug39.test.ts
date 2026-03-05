/**
 * Bug #39 Regression — FluentEnum.default() must mark field as optional
 *
 * Previous tests never verified that FluentEnum.default() sets _optional = true,
 * which is the consistent behavior in FluentString, FluentNumber, FluentBoolean.
 *
 * The bug: FluentEnum.default('active') didn't mark the field as optional,
 * causing the Zod schema to require the field despite having a default.
 * The LLM sees "(default: 'active')" in the description but omitting the
 * field causes a validation error — contradictory contract.
 */
import { describe, it, expect } from 'vitest';
import { FluentEnum, FluentString, FluentNumber, FluentBoolean } from '../../src/core/builder/FluentSchemaHelpers.js';

describe('Bug #39 — FluentEnum.default() marks optional', () => {
    it('FluentEnum.default() should set _optional = true', () => {
        const e = new FluentEnum('active', 'archived').default('active');
        expect(e._optional).toBe(true);
    });

    it('FluentEnum.default() descriptor should include optional: true', () => {
        const e = new FluentEnum('active', 'archived').default('active');
        const desc = e.toDescriptor();
        expect(desc.optional).toBe(true);
        expect(desc.description).toContain("(default: 'active')");
    });

    it('FluentEnum without default should remain required', () => {
        const e = new FluentEnum('active', 'archived');
        expect(e._optional).toBe(false);
        const desc = e.toDescriptor();
        expect(desc.optional).toBeUndefined();
    });

    it('FluentEnum.optional() should still work independently', () => {
        const e = new FluentEnum('a', 'b').optional();
        expect(e._optional).toBe(true);
        const desc = e.toDescriptor();
        expect(desc.optional).toBe(true);
    });

    it('consistency: all Fluent types set _optional on .default()', () => {
        // Verify all four fluent types behave consistently
        const str = new FluentString().default('hello');
        const num = new FluentNumber().default(42);
        const bool = new FluentBoolean().default(true);
        const en = new FluentEnum('a', 'b').default('a');

        expect(str._optional).toBe(true);
        expect(num._optional).toBe(true);
        expect(bool._optional).toBe(true);
        expect(en._optional).toBe(true);
    });

    it('FluentEnum.default() should include default value in description', () => {
        const e = new FluentEnum('low', 'medium', 'high')
            .describe('Priority level')
            .default('medium');

        const desc = e.toDescriptor();
        expect(desc.description).toBe("Priority level (default: 'medium')");
        expect(desc.optional).toBe(true);
        expect(desc.enum).toEqual(['low', 'medium', 'high']);
    });
});
