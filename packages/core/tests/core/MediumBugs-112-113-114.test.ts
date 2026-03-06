/**
 * Regression tests for BUGS-v4 medium-severity bugs #112, #113, #114.
 *
 * Bug #112 — Duplicate action names silently accepted (GroupedToolBuilder)
 * Bug #113 — FluentPromptBuilder.tags() replaces instead of appending
 * Bug #114 — StateSyncBuilder.layer getter not cached
 */
import { describe, it, expect } from 'vitest';
import { success } from '../../src/core/response.js';
import { GroupedToolBuilder } from '../../src/core/builder/GroupedToolBuilder.js';
import { FluentPromptBuilder } from '../../src/prompt/FluentPromptBuilder.js';
import { StateSyncBuilder } from '../../src/state-sync/StateSyncBuilder.js';

// ── Bug #112 — Duplicate action names ────────────────────

describe('Bug #112 — Duplicate action names rejected', () => {
    it('should throw when registering two actions with the same name', () => {
        const builder = new GroupedToolBuilder('orders');
        builder.action({
            name: 'list',
            handler: async () => success('first'),
        });
        expect(() =>
            builder.action({
                name: 'list',
                handler: async () => success('second'),
            }),
        ).toThrow(/duplicate action name.*"list"/i);
    });

    it('should allow different action names on the same builder', () => {
        const builder = new GroupedToolBuilder('orders');
        builder.action({
            name: 'list',
            handler: async () => success('list'),
        });
        expect(() =>
            builder.action({
                name: 'create',
                handler: async () => success('create'),
            }),
        ).not.toThrow();
    });

    it('should include builder name in error message', () => {
        const builder = new GroupedToolBuilder('users');
        builder.action({
            name: 'get',
            handler: async () => success('ok'),
        });
        expect(() =>
            builder.action({
                name: 'get',
                handler: async () => success('dup'),
            }),
        ).toThrow(/users/);
    });
});

// ── Bug #113 — FluentPromptBuilder.tags() accumulates ────

describe('Bug #113 — FluentPromptBuilder.tags() appends', () => {
    it('should accumulate tags across multiple .tags() calls', () => {
        const builder = new FluentPromptBuilder<void>('test');
        builder.tags('a').tags('b', 'c');
        expect(builder.getTags()).toEqual(['a', 'b', 'c']);
    });

    it('should preserve all tags, not replace', () => {
        const builder = new FluentPromptBuilder<void>('test');
        builder.tags('x');
        builder.tags('y');
        builder.tags('z');
        expect(builder.getTags()).toEqual(['x', 'y', 'z']);
    });

    it('single .tags() call should work normally', () => {
        const builder = new FluentPromptBuilder<void>('test');
        builder.tags('only');
        expect(builder.getTags()).toEqual(['only']);
    });
});

// ── Bug #114 — StateSyncBuilder.layer caching ────────────

describe('Bug #114 — StateSyncBuilder.layer getter is cached', () => {
    it('should return the same instance on repeated access', () => {
        const sync = new StateSyncBuilder();
        sync.policy('orders.*', p => p.cached());
        const a = sync.layer;
        const b = sync.layer;
        expect(a).toBe(b);
    });

    it('should invalidate cache when .policy() is called after .layer', () => {
        const sync = new StateSyncBuilder();
        sync.policy('orders.*', p => p.cached());
        const before = sync.layer;
        sync.policy('users.*', p => p.stale());
        const after = sync.layer;
        expect(before).not.toBe(after);
    });

    it('should invalidate cache when .defaults() is called after .layer', () => {
        const sync = new StateSyncBuilder();
        const before = sync.layer;
        sync.defaults(p => p.cached());
        const after = sync.layer;
        expect(before).not.toBe(after);
    });

    it('should invalidate cache when .onInvalidation() is called after .layer', () => {
        const sync = new StateSyncBuilder();
        const before = sync.layer;
        sync.onInvalidation(() => {});
        const after = sync.layer;
        expect(before).not.toBe(after);
    });

    it('should invalidate cache when .notificationSink() is called after .layer', () => {
        const sync = new StateSyncBuilder();
        const before = sync.layer;
        sync.notificationSink(() => {});
        const after = sync.layer;
        expect(before).not.toBe(after);
    });
});
