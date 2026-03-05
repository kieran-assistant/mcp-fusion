/**
 * Bug #58 — `isToolResponse` guard excessively permissive.
 *
 * Only verified non-null object with `content` array.
 * Did not check that elements have `{ type: string }`.
 * Domain objects with a `content` array bypass the MVA pipeline.
 *
 * Why existing tests missed it:
 * All tests either used valid ToolResponse objects or non-objects.
 * The adversarial test explicitly documented the permissive behavior
 * as expected (now updated).
 *
 * Fix: After checking for array, verify `content[0]?.type` is a string.
 * Empty arrays remain valid (fire-and-forget pattern).
 */
import { describe, it, expect } from 'vitest';
import { isToolResponse } from '../../src/presenter/PostProcessor.js';

describe('isToolResponse stricter guard (Bug #58)', () => {
    it('should accept valid ToolResponse with text content', () => {
        expect(isToolResponse({
            content: [{ type: 'text', text: 'hello' }],
        })).toBe(true);
    });

    it('should accept valid ToolResponse with image content', () => {
        expect(isToolResponse({
            content: [{ type: 'image', data: 'base64...', mimeType: 'image/png' }],
        })).toBe(true);
    });

    it('should accept empty content array (fire-and-forget)', () => {
        expect(isToolResponse({ content: [] })).toBe(true);
    });

    it('should reject content array with items lacking type property', () => {
        // Domain object with content array — should NOT pass through
        expect(isToolResponse({ content: [{ foo: 'bar' }] })).toBe(false);
    });

    it('should reject content array where type is not a string', () => {
        expect(isToolResponse({ content: [{ type: 42 }] })).toBe(false);
    });

    it('should reject content array with null first element', () => {
        expect(isToolResponse({ content: [null] })).toBe(false);
    });

    it('should still reject non-array content', () => {
        expect(isToolResponse({ content: 'string' })).toBe(false);
        expect(isToolResponse({ content: {} })).toBe(false);
    });

    it('should accept ToolResponse with isError flag', () => {
        expect(isToolResponse({
            content: [{ type: 'text', text: 'error' }],
            isError: true,
        })).toBe(true);
    });

    it('should reject domain model that happens to have content array', () => {
        // CMS-like domain object — should NOT be treated as ToolResponse
        const cmsPage = {
            title: 'My Page',
            content: [
                { paragraph: 'Hello world', bold: true },
                { paragraph: 'Second line' },
            ],
        };
        expect(isToolResponse(cmsPage)).toBe(false);
    });
});
