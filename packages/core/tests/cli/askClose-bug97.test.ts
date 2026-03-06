import { describe, it, expect } from 'vitest';
import { ask } from '../../src/cli/utils.js';

describe('Bug #97 — ask() resolves with fallback on stream close', () => {
    it('resolves with fallback when readline closes without answer', async () => {
        let closeHandler: (() => void) | undefined;

        const rl = {
            question: (_prompt: string, _cb: (a: string) => void) => {
                // Never call the callback — simulates stdin EOF
            },
            once: (event: string, cb: () => void) => {
                if (event === 'close') closeHandler = cb;
            },
        };

        const promise = ask(rl, 'Your name?', 'default-name');

        // Simulate stream close (Ctrl+D / EOF)
        expect(closeHandler).toBeDefined();
        closeHandler!();

        const result = await promise;
        expect(result).toBe('default-name');
    });

    it('resolves with answer when readline responds normally', async () => {
        const rl = {
            question: (_prompt: string, cb: (a: string) => void) => {
                cb('Alice');
            },
            once: (_event: string, _cb: () => void) => { /* no-op */ },
        };

        const result = await ask(rl, 'Your name?', 'default-name');
        expect(result).toBe('Alice');
    });

    it('resolves with fallback when answer is empty', async () => {
        const rl = {
            question: (_prompt: string, cb: (a: string) => void) => {
                cb('   ');
            },
            once: (_event: string, _cb: () => void) => { /* no-op */ },
        };

        const result = await ask(rl, 'Your name?', 'default-name');
        expect(result).toBe('default-name');
    });

    it('does not resolve twice if answer arrives then close fires', async () => {
        let closeHandler: (() => void) | undefined;

        const rl = {
            question: (_prompt: string, cb: (a: string) => void) => {
                cb('Bob');
            },
            once: (event: string, cb: () => void) => {
                if (event === 'close') closeHandler = cb;
            },
        };

        const result = await ask(rl, 'Your name?', 'fallback');
        expect(result).toBe('Bob');

        // Close fires after — should be no-op (no double resolve)
        closeHandler?.();
        // If we got here without error, double-resolve was prevented
    });

    it('works when rl has no once method', async () => {
        const rl = {
            question: (_prompt: string, cb: (a: string) => void) => {
                cb('Charlie');
            },
            // No once method — should still work
        };

        const result = await ask(rl, 'Your name?', 'fallback');
        expect(result).toBe('Charlie');
    });
});
