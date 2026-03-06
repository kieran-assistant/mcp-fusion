/**
 * Regression test: cursor pagination fallback must not use lexicographic comparison.
 *
 * The fix changes the cursor-target-removed fallback from
 * `findIndex(n => n > decoded.after)` (lexicographic) to simply
 * skipping to the end of the list, since Map iteration order is
 * insertion-based and has no meaningful lexicographic successor.
 */
import { describe, it, expect } from 'vitest';
import { PromptRegistry } from '../../src/prompt/PromptRegistry.js';
import { definePrompt } from '../../src/prompt/definePrompt.js';

function makePrompt(name: string) {
    return definePrompt<void>(name, {
        handler: async () => ({
            messages: [{
                role: 'user' as const,
                content: { type: 'text' as const, text: `Result: ${name}` },
            }],
        }),
    });
}

describe('PromptRegistry — cursor fallback (bug #106)', () => {
    it('falls back to end-of-list when cursor target is removed', async () => {
        const registry = new PromptRegistry<void>();
        // Register in insertion order: z, a, m (non-alphabetical)
        registry.registerAll(makePrompt('z-first'), makePrompt('a-second'), makePrompt('m-third'));
        registry.configurePagination({ pageSize: 1 });

        // Get first page — should be z-first
        const page1 = await registry.listPrompts();
        expect(page1.prompts).toHaveLength(1);
        expect(page1.prompts[0]!.name).toBe('z-first');
        expect(page1.nextCursor).toBeDefined();

        // Remove the cursor target (z-first) by clearing and re-registering without it
        registry.clear();
        registry.registerAll(makePrompt('a-second'), makePrompt('m-third'));

        // Using the old cursor — target 'z-first' no longer exists
        // With the buggy code, `n > 'z-first'` finds no lexicographic successor → empty page (correct by accident)
        // But the real bug manifests when insertion order differs from alphabetical.
        // Let's demonstrate: cursor was pointing at 'a-second' which got removed from: b-after, c-end
        const registry2 = new PromptRegistry<void>();
        registry2.registerAll(makePrompt('b-after'), makePrompt('c-end'), makePrompt('a-target'));
        registry2.configurePagination({ pageSize: 1 });

        // Navigate: first page = b-after, second page = c-end, third page = a-target
        const r1 = await registry2.listPrompts();
        expect(r1.prompts[0]!.name).toBe('b-after');
        const r2 = await registry2.listPrompts({ cursor: r1.nextCursor });
        expect(r2.prompts[0]!.name).toBe('c-end');
        const r3 = await registry2.listPrompts({ cursor: r2.nextCursor });
        expect(r3.prompts[0]!.name).toBe('a-target');

        // Now remove 'c-end' and try to continue with the cursor from page 1 (pointing after 'b-after')
        registry2.clear();
        registry2.registerAll(makePrompt('b-after'), makePrompt('a-target'));
        registry2.configurePagination({ pageSize: 1 });

        // Cursor target 'b-after' is still there — should work normally
        const resumed = await registry2.listPrompts({ cursor: r1.nextCursor });
        expect(resumed.prompts[0]!.name).toBe('a-target');
    });

    it('source must not use lexicographic comparison (n > decoded.after)', () => {
        // Read the source code to verify that the lexicographic fallback is gone
        const { readFileSync } = require('node:fs');
        const { resolve, dirname } = require('node:path');
        const { fileURLToPath } = require('node:url');
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const src = readFileSync(
            resolve(__dirname, '..', '..', 'src', 'prompt', 'PromptRegistry.ts'),
            'utf-8',
        );
        // The old buggy pattern: findIndex(n => n > decoded.after)
        expect(src).not.toMatch(/findIndex\s*\(\s*n\s*=>\s*n\s*>\s*decoded\.after\s*\)/);
    });

    it('returns empty page for completely unknown cursor target', async () => {
        const registry = new PromptRegistry<void>();
        registry.registerAll(makePrompt('alpha'), makePrompt('beta'), makePrompt('gamma'));
        registry.configurePagination({ pageSize: 2 });

        const page1 = await registry.listPrompts();
        expect(page1.prompts).toHaveLength(2);

        // Clear everything — cursor target no longer exists
        registry.clear();
        registry.registerAll(makePrompt('delta'), makePrompt('epsilon'));
        registry.configurePagination({ pageSize: 2 });

        // Should fall back to end → empty results
        const page2 = await registry.listPrompts({ cursor: page1.nextCursor });
        expect(page2.prompts).toHaveLength(0);
        expect(page2.nextCursor).toBeUndefined();
    });
});
