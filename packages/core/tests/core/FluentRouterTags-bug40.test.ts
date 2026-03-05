/**
 * Bug #40 Regression — FluentRouter.tags() must accumulate, not replace
 *
 * Previous tests didn't exist for FluentRouter.tags() chaining at all.
 * The bug was the same pattern as Bug #11 (FluentToolBuilder/GroupedToolBuilder):
 * assignment `this._tags = tags` instead of `this._tags.push(...tags)`.
 *
 * Chaining `.tags('auth').tags('admin')` would discard 'auth'.
 */
import { describe, it, expect } from 'vitest';
import { FluentRouter } from '../../src/core/builder/FluentRouter.js';

describe('Bug #40 — FluentRouter.tags() accumulates', () => {
    it('should accumulate tags across multiple .tags() calls', () => {
        const router = new FluentRouter<void>('users');
        router.tags('auth').tags('admin');

        expect(router._tags).toEqual(['auth', 'admin']);
    });

    it('should accumulate multiple tags in a single call', () => {
        const router = new FluentRouter<void>('billing');
        router.tags('finance', 'billing');

        expect(router._tags).toEqual(['finance', 'billing']);
    });

    it('should accumulate across mixed single and multi-tag calls', () => {
        const router = new FluentRouter<void>('orders');
        router.tags('read').tags('write', 'admin').tags('beta');

        expect(router._tags).toEqual(['read', 'write', 'admin', 'beta']);
    });

    it('should propagate accumulated tags to child builders', () => {
        const router = new FluentRouter<void>('users');
        router.tags('auth').tags('v2');

        const builder = router.query('list');
        expect(builder._tags).toContain('auth');
        expect(builder._tags).toContain('v2');
    });

    it('single .tags() call should work correctly', () => {
        const router = new FluentRouter<void>('items');
        router.tags('public');

        expect(router._tags).toEqual(['public']);
    });

    it('empty tags call should not affect existing tags', () => {
        const router = new FluentRouter<void>('data');
        router.tags('core');
        router.tags();

        expect(router._tags).toEqual(['core']);
    });
});
