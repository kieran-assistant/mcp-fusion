/**
 * Bug #57 — `PromptRegistry.listPrompts` cursor breaks on mutation.
 *
 * Cursor stores `{ after: lastItemName }`. If the prompt is
 * unregistered between paginated requests, `indexOf` returns -1
 * and the client silently restarts from page 1 (duplicates).
 *
 * Why existing tests missed it:
 * All pagination tests register once and iterate without mutation.
 * No test ever removed a prompt between page requests.
 *
 * Fix: When cursor target is missing, use `findIndex(n => n > decoded.after)`
 * to locate the nearest lexicographic successor instead of restarting.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { PromptRegistry } from '../../src/prompt/PromptRegistry.js';
import { definePrompt } from '../../src/prompt/definePrompt.js';

function makePrompt(name: string) {
    return definePrompt<void>(name, {
        handler: async () => ({
            messages: [{ role: 'user' as const, content: { type: 'text' as const, text: name } }],
        }),
    });
}

describe('PromptRegistry cursor stability on mutation (Bug #57)', () => {
    it('should not restart from page 1 when cursor target is removed', async () => {
        const registry = new PromptRegistry<void>();
        // Register a-e in sorted order
        for (const n of ['a', 'b', 'c', 'd', 'e']) {
            registry.register(makePrompt(n));
        }
        registry.configurePagination({ pageSize: 2 });

        // Page 1: [a, b], cursor points to 'b'
        const page1 = await registry.listPrompts();
        expect(page1.prompts).toHaveLength(2);
        expect(page1.nextCursor).toBeDefined();

        // Simulate mutation: remove 'b' (the cursor target) between pages
        registry.clear();
        for (const n of ['a', 'c', 'd', 'e']) {
            registry.register(makePrompt(n));
        }

        // Page 2 should continue from 'c' (successor), NOT restart from 'a'
        const page2 = await registry.listPrompts({ cursor: page1.nextCursor });
        const page2Names = page2.prompts.map(p => p.name);
        expect(page2Names).not.toContain('a'); // no duplicate from page 1
        expect(page2Names[0]).toBe('c'); // continues correctly
    });

    it('should return empty when cursor target and all successors are removed', async () => {
        const registry = new PromptRegistry<void>();
        for (const n of ['a', 'b', 'c']) {
            registry.register(makePrompt(n));
        }
        registry.configurePagination({ pageSize: 2 });

        const page1 = await registry.listPrompts();
        expect(page1.nextCursor).toBeDefined();

        // Remove everything after 'b'
        registry.clear();
        registry.register(makePrompt('a'));

        const page2 = await registry.listPrompts({ cursor: page1.nextCursor });
        expect(page2.prompts).toHaveLength(0);
    });

    it('should work normally when cursor target still exists', async () => {
        const registry = new PromptRegistry<void>();
        for (const n of ['x', 'y', 'z']) {
            registry.register(makePrompt(n));
        }
        registry.configurePagination({ pageSize: 1 });

        const page1 = await registry.listPrompts();
        expect(page1.prompts[0]!.name).toBe('x');

        const page2 = await registry.listPrompts({ cursor: page1.nextCursor });
        expect(page2.prompts[0]!.name).toBe('y');
    });

    it('should handle insertion between pages without duplicates', async () => {
        const registry = new PromptRegistry<void>();
        for (const n of ['alpha', 'charlie', 'echo']) {
            registry.register(makePrompt(n));
        }
        registry.configurePagination({ pageSize: 2 });

        const page1 = await registry.listPrompts();
        expect(page1.prompts.map(p => p.name)).toEqual(['alpha', 'charlie']);

        // Insert 'bravo' and 'delta' between pages
        registry.clear();
        for (const n of ['alpha', 'bravo', 'charlie', 'delta', 'echo']) {
            registry.register(makePrompt(n));
        }

        // Cursor was after 'charlie' — next page should NOT include alpha/charlie
        const page2 = await registry.listPrompts({ cursor: page1.nextCursor });
        const names = page2.prompts.map(p => p.name);
        expect(names).not.toContain('alpha');
        expect(names).not.toContain('charlie');
    });
});
